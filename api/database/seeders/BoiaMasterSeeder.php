<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class BoiaMasterSeeder extends Seeder
{
    public function run()
    {
        // 1. Obter uma zona e um gateway aleatórios ou o primeiro
        $zona = DB::table('zonas')->first();
        $gateway = DB::table('gateways')->first();

        if (!$zona || !$gateway) {
            $this->command->error('Não existe nenhuma zona ou gateway na DB. Crie-os primeiro.');
            return;
        }

        // 2. Criar a Super Boia
        $mac = substr(str_shuffle('0123456789ABCDEF'), 1, 12);
        $macFormatado = implode(':', str_split($mac, 2));

        $boiaId = DB::table('boias')->insertGetId([
            'mac_boia' => $macFormatado,
            'nome' => 'Boia Master (Todos os Sensores)',
            'estado' => 'ativa',
            'bateria' => 98.5,
            'ultima_manutencao' => Carbon::now()->subDays(5)->format('Y-m-d'),
            'intervalo_segundos' => 300,
            'zona_id' => $zona->id,
            'mac_gateway' => $gateway->mac_gateway,
            'latitude' => $gateway->latitude + 0.001,
            'longitude' => $gateway->longitude + 0.001,
            'localizacao_texto' => 'Estação Central',
            'created_at' => Carbon::now(),
            'updated_at' => Carbon::now(),
        ]);

        // 3. Associar todos os 6 sensores com limites realistas
        $sensores = [
            // id => [min_alert, max_alert, min_historic, max_historic, var]
            1 => ['min' => 4.0, 'max' => 12.0,  'hmin' => 6.0, 'hmax' => 9.5, 'var' => 0.2], // O2 (mg/L)
            2 => ['min' => 5.0, 'max' => 30.0,  'hmin' => 14.0, 'hmax' => 24.0, 'var' => 0.5], // Temp (ºC)
            3 => ['min' => 0.0, 'max' => 50.0,  'hmin' => 5.0,  'hmax' => 20.0, 'var' => 2.0], // Turbidez (NTU)
            4 => ['min' => 0.0, 'max' => 1000.0,'hmin' => 150.0,'hmax' => 400.0, 'var' => 10.0],// TDS (ppm)
            5 => ['min' => 6.0, 'max' => 9.0,   'hmin' => 6.8,  'hmax' => 7.8, 'var' => 0.1],  // pH
            6 => ['min' => 0.0, 'max' => 2000.0,'hmin' => 200.0,'hmax' => 600.0, 'var' => 15.0],// Condutividade
        ];

        foreach ($sensores as $id => $limites) {
            DB::table('limites_sensores')->insert([
                'boia_id' => $boiaId,
                'tipo_sensor_id' => $id,
                'is_configurado' => true,
                'valor_minimo' => $limites['min'],
                'valor_maximo' => $limites['max'],
                'dias_proxima_manutencao' => 30,
            ]);
        }

        // 4. Gerar 30 dias de dados históricos para esta boia
        $leituras = [];
        $agora = Carbon::now();
        $chunkSize = 1000;
        
        foreach ($sensores as $id => $props) {
            $valorAtual = $props['hmin'] + mt_rand(0, mt_getrandmax() - 1) / mt_getrandmax() * ($props['hmax'] - $props['hmin']);

            for ($dia = 30; $dia >= 0; $dia--) {
                for ($hora = 0; $hora < 24; $hora += 4) { // De 4 em 4 horas
                    $dataHora = $agora->copy()->subDays($dia)->startOfDay()->addHours($hora);
                    if ($dataHora > $agora) break;

                    $variacao = (mt_rand(-100, 100) / 100) * $props['var'];
                    $valorAtual += $variacao;

                    if ($valorAtual < $props['hmin']) $valorAtual = $props['hmin'];
                    if ($valorAtual > $props['hmax']) $valorAtual = $props['hmax'];

                    $leituras[] = [
                        'boia_id' => $boiaId,
                        'tipo_sensor_id' => $id,
                        'valor' => round($valorAtual, 2),
                        'data_hora' => $dataHora->format('Y-m-d H:i:s'),
                        'rssi' => mt_rand(-90, -40),
                    ];

                    if (count($leituras) >= $chunkSize) {
                        DB::table('leituras')->insert($leituras);
                        $leituras = [];
                    }
                }
            }
        }

        if (count($leituras) > 0) {
            DB::table('leituras')->insert($leituras);
        }

        $this->command->info("Boia Master (ID: $boiaId) criada com sucesso e populada com os 6 sensores!");
    }
}
