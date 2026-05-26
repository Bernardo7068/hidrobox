<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\TipoSensor;

class SensorSeeder extends Seeder
{
    public function run(): void
    {
        TipoSensor::updateOrCreate(['nome' => 'Oxigénio Dissolvido'], ['unidade' => 'mg/L']);
        TipoSensor::updateOrCreate(['nome' => 'Temperatura'], ['unidade' => 'ºC']);
        TipoSensor::updateOrCreate(['nome' => 'Turbidez'], ['unidade' => 'NTU']);
        TipoSensor::updateOrCreate(['nome' => 'TDS'], ['unidade' => 'ppm']);
        TipoSensor::updateOrCreate(['nome' => 'pH'], ['unidade' => 'pH']);
        TipoSensor::updateOrCreate(['nome' => 'Condutividade'], ['unidade' => 'µS/cm']);
    }
}
