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

        // Boia 1 (SMAS)
        $boia1 = Boia::updateOrCreate(['mac_boia' => '24:6F:28:A1:B2:C3'], [
            'mac_gateway' => '32:AE:A4:05:C1:FE',
            'nome' => 'Boia Central Lis',
            'latitude' => 39.7436, 'longitude' => -8.8070,
            'zona_id' => $lisA->id,
            'estado' => 'ativa'
        ]);
        LimiteSensor::updateOrCreate(['boia_id' => $boia1->id, 'tipo_sensor_id' => $o2->id], ['valor_minimo' => 5.0, 'valor_maximo' => 10.0, 'status' => 'ativo']);
        LimiteSensor::updateOrCreate(['boia_id' => $boia1->id, 'tipo_sensor_id' => $temp->id], ['valor_minimo' => 10.0, 'valor_maximo' => 28.0, 'status' => 'ativo']);

        // Boia 2 (Celulose)
        $boia2 = Boia::updateOrCreate(['mac_boia' => 'AA:BB:CC:DD:EE:FF'], [
            'mac_gateway' => '11:22:33:44:55:66',
            'nome' => 'Monitor Captação',
            'latitude' => 39.7500, 'longitude' => -8.8100,
            'zona_id' => $lisB->id,
            'estado' => 'manutencao'
        ]);
        LimiteSensor::updateOrCreate(['boia_id' => $boia2->id, 'tipo_sensor_id' => $ph->id], ['valor_minimo' => 6.0, 'valor_maximo' => 9.0, 'status' => 'erro']);

        // Boia 3 (Coimbra)
        $boia3 = Boia::updateOrCreate(['mac_boia' => 'BB:CC:DD:EE:FF:11'], [
            'mac_gateway' => '22:33:44:55:66:77',
            'nome' => 'Boia Mondego Sul',
            'latitude' => 40.2033, 'longitude' => -8.4103,
            'zona_id' => $mondego->id,
            'estado' => 'ativa'
        ]);
        LimiteSensor::updateOrCreate(['boia_id' => $boia3->id, 'tipo_sensor_id' => $temp->id], ['valor_minimo' => 5.0, 'valor_maximo' => 30.0, 'status' => 'ativo']);

        // Boia 4 (Sines)
        $boia4 = Boia::updateOrCreate(['mac_boia' => 'CC:DD:EE:FF:00:11'], [
            'mac_gateway' => '99:88:77:66:55:44',
            'nome' => 'Bóia Marítima Sines',
            'latitude' => 37.9500, 'longitude' => -8.8700,
            'zona_id' => $sines->id,
            'estado' => 'ativa'
        ]);
        LimiteSensor::updateOrCreate(['boia_id' => $boia4->id, 'tipo_sensor_id' => $turb->id], ['valor_minimo' => 0.0, 'valor_maximo' => 40.0, 'status' => 'ativo']);
    }
}
