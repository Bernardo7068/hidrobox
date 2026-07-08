<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class LeiturasHistoricoSeeder extends Seeder
{
    public function run()
    {
        $boias = DB::table('boias')->get();
        if ($boias->isEmpty()) {
            $this->command->info('Não há boias na base de dados para associar leituras.');
            return;
        }

        $leituras = [];
        $agora = Carbon::now();
        $diasParaGerar = 30; // 1 mês de dados
        $intervaloHoras = 4; // 1 leitura a cada 4 horas

        // Para evitar estoirar a memória
        $chunkSize = 1000;

        foreach ($boias as $boia) {
            // Gerar para os 3 sensores principais (assumindo IDs genéricos 1, 2, 3)
            // Se as tuas tabelas de tipo de sensor tiverem IDs diferentes, ajusta aqui.
            $sensores = [
                ['id' => 1, 'min' => 12.0, 'max' => 22.0, 'var' => 0.5], // Temp
                ['id' => 2, 'min' => 6.5,  'max' => 8.2,  'var' => 0.1], // pH
                ['id' => 3, 'min' => 6.0,  'max' => 9.5,  'var' => 0.2]  // O2
            ];

            foreach ($sensores as $sensor) {
                // Começar de um valor aleatório base
                $valorAtual = $sensor['min'] + mt_rand(0, mt_getrandmax() - 1) / mt_getrandmax() * ($sensor['max'] - $sensor['min']);

                for ($dia = $diasParaGerar; $dia >= 0; $dia--) {
                    for ($hora = 0; $hora < 24; $hora += $intervaloHoras) {
                        $dataHora = $agora->copy()->subDays($dia)->startOfDay()->addHours($hora);
                        if ($dataHora > $agora) break;

                        // Adicionar uma pequena variação aleatória simulando a natureza
                        $variacao = (mt_rand(-100, 100) / 100) * $sensor['var'];
                        $valorAtual += $variacao;

                        // Manter dentro dos limites reais
                        if ($valorAtual < $sensor['min']) $valorAtual = $sensor['min'];
                        if ($valorAtual > $sensor['max']) $valorAtual = $sensor['max'];

                        $leituras[] = [
                            'boia_id' => $boia->id,
                            'tipo_sensor_id' => $sensor['id'],
                            'valor' => round($valorAtual, 2),
                            'data_hora' => $dataHora->format('Y-m-d H:i:s'),
                            'rssi' => mt_rand(-110, -50),
                        ];

                        if (count($leituras) >= $chunkSize) {
                            DB::table('leituras')->insert($leituras);
                            $leituras = [];
                        }
                    }
                }
            }
        }

        if (count($leituras) > 0) {
            DB::table('leituras')->insert($leituras);
        }

        $this->command->info('Histórico de Leituras gerado com sucesso! (últimos 30 dias)');
    }
}
