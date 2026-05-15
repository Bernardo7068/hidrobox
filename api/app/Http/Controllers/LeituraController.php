<?php

namespace App\Http\Controllers;

use App\Http\Requests\LeituraRequest;
use App\Models\Leitura;
use App\Models\LimiteSensor;
use App\Models\Alerta;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\DB;
use Log;

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
                // 1. Grava a leitura
                $leitura = Leitura::create([
                    'boia_id'        => $validated['boia_id'],
                    'tipo_sensor_id' => $item['tipo_sensor_id'],
                    'valor'          => $item['valor'],
                    'data_hora'      => $agora
                ]);

                // 2. Verifica se o valor rebenta os limites definidos para este sensor nesta boia
                $limite = LimiteSensor::where('boia_id', $validated['boia_id'])
                                      ->where('tipo_sensor_id', $item['tipo_sensor_id'])
                                      ->first();

                if ($limite) {
                    if ($item['valor'] < $limite->valor_minimo || $item['valor'] > $limite->valor_maximo) {
                        
                        Alerta::create([
                            'leitura_id' => $leitura->id,
                            'boia_id'    => $validated['boia_id'],
                            'gravidade'  => 'alta',
                            'descricao'  => "Sensor ID {$item['tipo_sensor_id']} registou {$item['valor']}. Limites: [{$limite->valor_minimo} - {$limite->valor_maximo}].",
                            'resolvido'  => false
                        ]);

                        $alertasGerados++;
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
}