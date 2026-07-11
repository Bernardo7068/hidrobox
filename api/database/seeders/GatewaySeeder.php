<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Gateway;

class GatewaySeeder extends Seeder
{
    public function run(): void
    {
        // Hub Central Lis
        Gateway::updateOrCreate(['mac_gateway' => '32:AE:A4:05:C1:FE'], [
            'nome' => 'Antena Principal (Leiria)',
            'latitude' => 39.7430, 
            'longitude' => -8.8075,
            'raio_cobertura' => 5000,
            'estado' => 'ativo',
            'bateria' => 100,
            'is_public' => true,
            'empresa_id' => null // Rede Pública
        ]);

        // Hub Mondego
        Gateway::updateOrCreate(['mac_gateway' => '22:33:44:55:66:77'], [
            'nome' => 'Hub Mondego (Coimbra)',
            'latitude' => 40.2030, 
            'longitude' => -8.4100,
            'raio_cobertura' => 3000,
            'estado' => 'ativo',
            'bateria' => 85,
            'is_public' => false,
            'empresa_id' => 1 // Privado Empresa 1
        ]);

        // Hub Sines
        Gateway::updateOrCreate(['mac_gateway' => '99:88:77:66:55:44'], [
            'nome' => 'Terminal Sines Lora',
            'latitude' => 37.9510, 
            'longitude' => -8.8710,
            'raio_cobertura' => 10000,
            'estado' => 'ativo',
            'bateria' => 40, // Para simular bateria baixa
            'is_public' => false,
            'empresa_id' => null // Órfão à espera de dono
        ]);
    }
}
