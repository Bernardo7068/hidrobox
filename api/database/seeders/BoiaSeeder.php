<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Boia;
use App\Models\Zona;
use App\Models\TipoSensor;
use App\Models\LimiteSensor;

class BoiaSeeder extends Seeder
{
    public function run(): void
    {
        $lisA = Zona::where('nome', 'Rio Lis - Setor A')->first();
        $lisB = Zona::where('nome', 'Rio Lis - Setor B')->first();
        $mondego = Zona::where('nome', 'Rio Mondego - Parque')->first();
        $sines = Zona::where('nome', 'Terminal de Contentores')->first();

        $o2 = TipoSensor::where('nome', 'Oxigénio Dissolvido')->first();
        $temp = TipoSensor::where('nome', 'Temperatura')->first();
        $ph = TipoSensor::where('nome', 'pH')->first();
        $turb = TipoSensor::where('nome', 'Turbidez')->first();

        // Obtém os IDs dos Gateways (se existirem, caso o GatewaySeeder já tenha corrido)
        $gwLis = \DB::table('gateways')->where('mac_gateway', '32:AE:A4:05:C1:FE')->value('id');
        $gwMon = \DB::table('gateways')->where('mac_gateway', '22:33:44:55:66:77')->value('id');
        $gwSin = \DB::table('gateways')->where('mac_gateway', '99:88:77:66:55:44')->value('id');

        // Boia 1 (SMAS) - Ativa e Saudável
        $boia1 = Boia::updateOrCreate(['mac_boia' => '24:6F:28:A1:B2:C3'], [
            'mac_gateway' => '32:AE:A4:05:C1:FE',
            'gateway_id' => $gwLis,
            'nome' => 'Boia Central Lis',
            'latitude' => 39.7436, 'longitude' => -8.8070,
            'zona_id' => $lisA->id,
            'estado' => 'ativa',
            'bateria' => 95,
            'rssi_ultimo' => -50,
            'intervalo_segundos' => 300
        ]);
        LimiteSensor::updateOrCreate(['boia_id' => $boia1->id, 'tipo_sensor_id' => $o2->id], ['valor_minimo' => 5.0, 'valor_maximo' => 10.0, 'is_configurado' => true, 'intervalo_calibracao_dias' => 180]);
        LimiteSensor::updateOrCreate(['boia_id' => $boia1->id, 'tipo_sensor_id' => $temp->id], ['valor_minimo' => 10.0, 'valor_maximo' => 28.0, 'is_configurado' => true, 'intervalo_calibracao_dias' => 180]);

        // Boia 2 (Celulose) - Em Manutenção, Bateria fraca
        $boia2 = Boia::updateOrCreate(['mac_boia' => 'AA:BB:CC:DD:EE:FF'], [
            'mac_gateway' => '11:22:33:44:55:66',
            'gateway_id' => null, // Gateway desconhecido
            'nome' => 'Monitor Captação',
            'latitude' => 39.7500, 'longitude' => -8.8100,
            'zona_id' => $lisB->id,
            'estado' => 'manutencao',
            'bateria' => 15,
            'rssi_ultimo' => -90,
            'intervalo_segundos' => 600
        ]);
        LimiteSensor::updateOrCreate(['boia_id' => $boia2->id, 'tipo_sensor_id' => $ph->id], ['valor_minimo' => 6.0, 'valor_maximo' => 9.0, 'is_configurado' => true, 'intervalo_calibracao_dias' => 90]);
        // Gerar o alerta de bateria fraca manualmente no Seeder para efeitos de demonstração
        \App\Models\Alerta::updateOrCreate([
            'boia_id' => $boia2->id,
            'descricao' => 'A Bateria da Estação Remota está fraca (15%). Considere verificar a alimentação.'
        ], [
            'gravidade' => 'media',
            'resolvido' => false,
            'created_at' => now()
        ]);

        // Boia 3 (Coimbra) - Pendente de Configuração
        $boia3 = Boia::updateOrCreate(['mac_boia' => 'BB:CC:DD:EE:FF:11'], [
            'mac_gateway' => '22:33:44:55:66:77',
            'gateway_id' => $gwMon,
            'nome' => 'Boia Mondego Sul',
            'latitude' => 40.2033, 'longitude' => -8.4103,
            'zona_id' => $mondego->id,
            'estado' => 'pendente', // Para testar os alertas
            'bateria' => 100,
            'rssi_ultimo' => -40,
            'intervalo_segundos' => 120
        ]);
        LimiteSensor::updateOrCreate(['boia_id' => $boia3->id, 'tipo_sensor_id' => $temp->id], ['valor_minimo' => 0.0, 'valor_maximo' => 0.0, 'is_configurado' => false]);
        // Gerar o alerta de parametrização pendente
        \App\Models\Alerta::updateOrCreate([
            'boia_id' => $boia3->id,
            'descricao' => 'Nova Boia detetada e a aguardar parametrização de limites.'
        ], [
            'gravidade' => 'media',
            'resolvido' => false,
            'created_at' => now()
        ]);

        // Boia 4 (Sines)
        $boia4 = Boia::updateOrCreate(['mac_boia' => 'CC:DD:EE:FF:00:11'], [
            'mac_gateway' => '99:88:77:66:55:44',
            'gateway_id' => $gwSin,
            'nome' => 'Bóia Marítima Sines',
            'latitude' => 37.9500, 'longitude' => -8.8700,
            'zona_id' => $sines->id,
            'estado' => 'ativa',
            'bateria' => 60,
            'rssi_ultimo' => -70,
            'intervalo_segundos' => 900
        ]);
        LimiteSensor::updateOrCreate(['boia_id' => $boia4->id, 'tipo_sensor_id' => $turb->id], ['valor_minimo' => 0.0, 'valor_maximo' => 40.0, 'is_configurado' => true]);
    }
}
