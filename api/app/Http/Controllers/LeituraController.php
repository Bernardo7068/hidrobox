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
        // Como usamos o LeituraRequest, os dados chegam aqui 100% validados
        $validated = $request->validated();
        
        // Resolve o ID interno da boia pelo MAC Address
        $boia = Boia::where('mac_boia', $validated['mac'])->first();

        // --- LÓGICA DE AUTO-DISCOVERY GATEWAY ---
        if ($request->has('gateway')) {
            $gatewayExistente = DB::table('gateways')->where('mac_gateway', $request->gateway)->exists();
            if (!$gatewayExistente) {
                // Se o gateway não existe, criamos um registo "pendente" na infraestrutura
                DB::table('gateways')->insertOrIgnore([
                    'mac_gateway' => $request->gateway,
                    'nome' => 'Gateway Descoberto (' . substr($request->gateway, -5) . ')',
                    'estado' => 'pendente', // Estado especial para o Frontend
                    'raio_cobertura' => 1000,
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
                Log::info("Novo Gateway detetado via telemetria: {$request->gateway}");
            }
        }

        // --- LÓGICA DE AUTO-DISCOVERY BOIA ---
        if (!$boia) {
            // Se a boia não existe, criamos um registo temporário "pendente"
            // Nota: zona_id é obrigatório na BD, vamos precisar de uma zona "Default" ou tornar opcional
            // Por agora, vamos criar com uma zona_id 1 (ou a primeira que encontrar)
            $zonaDefault = DB::table('zonas')->first();
            
            $boia = Boia::create([
                'mac_boia' => $validated['mac'],
                'mac_gateway' => $validated['gateway'] ?? null,
                'nome' => 'Nova Boia Detetada (' . substr($validated['mac'], -5) . ')',
                'estado' => 'pendente', // Estado especial para o Frontend mostrar o aviso
                'zona_id' => $zonaDefault ? $zonaDefault->id : 1, 
                'bateria' => $validated['bateria_pct'] ?? 100
            ]);

            return response()->json([
                'sucesso' => true,
                'mensagem' => 'Nova boia detetada e registada como pendente.',
                'estado' => 'pendente'
            ], Response::HTTP_CREATED);
        }

        // Se a boia já existe mas está "pendente", apenas atualizamos os dados sem processar leituras (opcional)
        // Ou se quisermos ver os valores mesmo em pendente, continuamos:
        
        $boia_id = $boia->id;
        $alertasGerados = 0;

        DB::beginTransaction();

        try {
            $agora = now();

            // Atualiza o gateway e a bateria da boia se enviados
            $updateData = [];
            if ($request->has('gateway')) {
                $updateData['mac_gateway'] = $request->gateway;
                
                // Tentar encontrar o gateway na nova tabela de infraestrutura
                $gatewayId = DB::table('gateways')->where('mac_gateway', $request->gateway)->value('id');
                if ($gatewayId) {
                    $updateData['gateway_id'] = $gatewayId;
                }
            }
            if ($request->has('bateria_pct')) {
                $updateData['bateria'] = $request->bateria_pct;
            }
            if ($request->has('rssi')) {
                $updateData['rssi_ultimo'] = $request->rssi;
            }

            if (!empty($updateData)) {
                $boia->update($updateData);
            }

            foreach ($validated['leituras'] as $item) {
                // 1. Verificação de Integridade de Hardware
                $sensorMestre = DB::table('tipos_sensor')->where('id', $item['tipo_sensor_id'])->first();
                
                if (!$sensorMestre) {
                    Log::warning("Hardware tentou ligar sensor com ID desconhecido: {$item['tipo_sensor_id']}.");
                    continue;
                }

                // 2. Grava a leitura
                $leitura = Leitura::create([
                    'boia_id'        => $boia_id,
                    'tipo_sensor_id' => $item['tipo_sensor_id'],
                    'valor'          => $item['valor'],
                    'rssi'           => $validated['rssi'] ?? null,
                    'data_hora'      => $agora
                ]);

                $limite = LimiteSensor::where('boia_id', $boia_id)
                                      ->where('tipo_sensor_id', $item['tipo_sensor_id'])
                                      ->first();

                // 3. Auto-Discovery Contextual
                if (!$limite) {
                    LimiteSensor::create([
                        'boia_id' => $boia_id,
                        'tipo_sensor_id' => $item['tipo_sensor_id'],
                        'valor_minimo' => 0,
                        'valor_maximo' => 0,
                        'is_configurado' => false, 
                        'ultima_manutencao' => now()
                    ]);
                    continue; 
                }

                // 4. Verificação de Alertas
                if ($limite->is_configurado) {
                    if ($item['valor'] < $limite->valor_minimo || $item['valor'] > $limite->valor_maximo) {
                        
                        $alertaPendente = Alerta::where('boia_id', $boia_id)
                            ->where('resolvido', 0)
                            ->whereHas('leitura', function($query) use ($item) {
                                $query->where('tipo_sensor_id', $item['tipo_sensor_id']);
                            })
                            ->exists();

                        if (!$alertaPendente) {
                            Alerta::create([
                                'leitura_id' => $leitura->id,
                                'boia_id'    => $boia_id,
                                'gravidade'  => 'alta',
                                'descricao'  => "O sensor registou {$item['valor']}. Está fora dos limites operacionais seguros [{$limite->valor_minimo} a {$limite->valor_maximo}].",
                                'resolvido'  => false
                            ]);

                            $alertasGerados++;
                        }
                    }
                }
            }

            DB::commit();

            // --- NOTIFICAÇÃO WEBSOCKETS ---
            try {
                $boiaComZona = \App\Models\Boia::with('zona')->find($boia_id);
                $empresa_id = $boiaComZona && $boiaComZona->zona ? $boiaComZona->zona->empresa_id : null;
                
                if ($empresa_id) {
                    $payloadLeitura = [
                        'empresa_id' => $empresa_id,
                        'event' => 'nova-leitura',
                        'data' => [
                            'boia_id' => $boia_id,
                            'nome' => $boia->nome,
                            'alertas' => $alertasGerados
                        ]
                    ];
                    
                    // Notificar empresa
                    \Illuminate\Support\Facades\Http::withHeaders([
                        'x-internal-token' => env('INTERNAL_API_SECRET', 'chave-secreta-interna-hidrobox')
                    ])->timeout(2)->post('http://localhost:3001/api/broadcast', $payloadLeitura);
                    
                    // Notificar super_admin
                    $payloadLeitura['empresa_id'] = 'super_admin';
                    \Illuminate\Support\Facades\Http::withHeaders([
                        'x-internal-token' => env('INTERNAL_API_SECRET', 'chave-secreta-interna-hidrobox')
                    ])->timeout(2)->post('http://localhost:3001/api/broadcast', $payloadLeitura);

                    // Se houve alertas gerados, enviamos um evento específico
                    if ($alertasGerados > 0) {
                        $payloadAlerta = [
                            'empresa_id' => $empresa_id,
                            'event' => 'novo-alerta',
                            'data' => ['boia_id' => $boia_id]
                        ];
                        \Illuminate\Support\Facades\Http::withHeaders([
                            'x-internal-token' => env('INTERNAL_API_SECRET', 'chave-secreta-interna-hidrobox')
                        ])->timeout(2)->post('http://localhost:3001/api/broadcast', $payloadAlerta);
                        
                        $payloadAlerta['empresa_id'] = 'super_admin';
                        \Illuminate\Support\Facades\Http::withHeaders([
                            'x-internal-token' => env('INTERNAL_API_SECRET', 'chave-secreta-interna-hidrobox')
                        ])->timeout(2)->post('http://localhost:3001/api/broadcast', $payloadAlerta);
                    }
                }
            } catch (\Exception $wsException) {
                // Ignorar erro do websocket silenciosamente para não falhar a resposta à ESP32
                Log::warning("Aviso: Falha ao notificar servidor de WebSockets: " . $wsException->getMessage());
            }

            return response()->json([
                'sucesso' => true,
                'mensagem' => 'Telemetria processada com sucesso.',
                'boia_identificada' => $boia->nome,
                'alertas_disparados' => $alertasGerados,
                'configuracao' => [
                    'intervalo_segundos' => $boia->intervalo_segundos ?? 300
                ]
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
