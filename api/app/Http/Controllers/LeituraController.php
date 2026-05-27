<?php

namespace App\Http\Controllers;

use App\Http\Requests\LeituraRequest;
use App\Models\Leitura;
use App\Models\LimiteSensor;
use App\Models\Alerta;
use App\Models\Boia;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Request;

class LeituraController extends Controller
{
    public function store(LeituraRequest $request): JsonResponse
    {
        // Como usamos o LeituraRequest, os dados chegam aqui 100% validados e seguros
        $validated = $request->validated();
        $alertasGerados = 0;

        // Usamos uma Base de Dados Transaction. Se a gravação de algum sensor falhar, 
        // o Laravel faz "rollback" e não deixa a base de dados corrompida ou incompleta.
        DB::beginTransaction();

        try {
            $agora = now();

            foreach ($validated['leituras'] as $item) {
                // 1. Verificação de Integridade de Hardware
                // O sensorId enviado pelo ESP32 tem de existir na tabela mestre 'tipos_sensor'
                // para podermos associar limites e ícones na UI.
                $sensorMestre = DB::table('tipos_sensor')->where('id', $item['tipo_sensor_id'])->first();
                
                if (!$sensorMestre) {
                    Log::warning("Hardware tentou ligar sensor com ID desconhecido no sistema: {$item['tipo_sensor_id']}. Adicione o tipo de sensor na tabela 'tipos_sensor' primeiro.");
                    continue; // Ignora para evitar erro de Foreign Key
                }

                // 2. Grava a leitura (O tipo_sensor_id já foi validado acima)
                $leitura = Leitura::create([
                    'boia_id'        => $validated['boia_id'],
                    'tipo_sensor_id' => $item['tipo_sensor_id'],
                    'valor'          => $item['valor'],
                    'data_hora'      => $agora
                ]);

                $limite = LimiteSensor::where('boia_id', $validated['boia_id'])
                                      ->where('tipo_sensor_id', $item['tipo_sensor_id'])
                                      ->first();

                // 3. Auto-Discovery Contextual: Se o sensor existe no sistema mas não está nesta boia
                if (!$limite) {
                    LimiteSensor::create([
                        'boia_id' => $validated['boia_id'],
                        'tipo_sensor_id' => $item['tipo_sensor_id'],
                        'valor_minimo' => 0,
                        'valor_maximo' => 0,
                        'is_configurado' => false, 
                        'ultima_manutencao' => now()
                    ]);
                    continue; 
                }

                // 4. Verificação de Alertas (Apenas se o técnico já validou a configuração)
                if ($limite->is_configurado) {
                    if ($item['valor'] < $limite->valor_minimo || $item['valor'] > $limite->valor_maximo) {
                        // ... (lógica de alerta existente)
                        
                        // ========================================================================
                        // [NOVA LÓGICA ANTI-SPAM DE ALERTAS]
                        // Verifica se JÁ EXISTE um alerta por resolver para esta boia e sensor
                        // ========================================================================
                        $alertaPendente = Alerta::where('boia_id', $validated['boia_id'])
                            ->where('resolvido', 0) // 0 ou false (ainda não resolvido pelo técnico)
                            ->whereHas('leitura', function($query) use ($item) {
                                // Garante que o alerta antigo é sobre o MESMO TIPO de sensor
                                $query->where('tipo_sensor_id', $item['tipo_sensor_id']);
                            })
                            ->exists();

                        // Só cria um alerta novo se a equipa não tiver nenhum pendente no ecrã!
                        if (!$alertaPendente) {
                            Alerta::create([
                                'leitura_id' => $leitura->id,
                                'boia_id'    => $validated['boia_id'],
                                'gravidade'  => 'alta',
                                'descricao'  => "O sensor registou {$item['valor']}. Está fora dos limites operacionais seguros [{$limite->valor_minimo} a {$limite->valor_maximo}].",
                                'resolvido'  => false
                            ]);

                            $alertasGerados++;
                        }
                    }
                }
            }

            DB::commit(); // Sucesso absoluto, guarda tudo na BD

            return response()->json([
                'sucesso' => true,
                'mensagem' => 'Pacote de leituras processado com sucesso.',
                'alertas_disparados' => $alertasGerados
            ], Response::HTTP_CREATED);

        } catch (\Exception $e) {
            DB::rollBack(); // Deu erro? Cancela tudo o que foi feito neste loop para segurança
            
            // Grava o erro num ficheiro de log secreto do Laravel para tu saberes o que falhou
            Log::error("Erro ao processar telemetria IoT: " . $e->getMessage());

            return response()->json([
                'sucesso' => false,
                'erro' => 'Erro Interno',
                'mensagem' => 'Não foi possível processar os dados dos sensores.'
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    public function historico($boiaId, Request $request)
    {
        $user = $request->user();
        $boia = Boia::with('zona')->find($boiaId);

        if (!$boia) {
            return response()->json(['sucesso' => false, 'mensagem' => 'Boia não encontrada.'], 404);
        }

        // Proteção Multi-Tenant
        if ($user && $user->role !== 'super_admin' && $boia->zona->empresa_id !== $user->empresa_id) {
            return response()->json(['sucesso' => false, 'mensagem' => 'Acesso negado.'], 403);
        }

        $historico = Leitura::where('boia_id', $boiaId)
            ->with('tipoSensor')
            ->orderBy('data_hora', 'desc')
            ->limit(100)
            ->get();

        return response()->json($historico);
    }
}
