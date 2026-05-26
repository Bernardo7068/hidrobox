<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Zona;
use App\Models\Empresa;

class ZonaSeeder extends Seeder
{
    public function run(): void
    {
        $smas = Empresa::where('nome', 'SMAS Leiria')->first();
        $cmc = Empresa::where('nome', 'Câmara Municipal de Coimbra')->first();
        $celulose = Empresa::where('nome', 'Fábrica de Celulose Lis')->first();
        $sines = Empresa::where('nome', 'Porto de Sines')->first();

        // Leiria
        Zona::updateOrCreate(['nome' => 'Rio Lis - Setor A', 'empresa_id' => $smas->id], ['concelho' => 'Leiria', 'descricao' => 'Ponte Tenente Valadim']);
        Zona::updateOrCreate(['nome' => 'Rio Lis - Setor B', 'empresa_id' => $smas->id], ['concelho' => 'Leiria', 'descricao' => 'Zona Industrial']);

        // Coimbra
        Zona::updateOrCreate(['nome' => 'Rio Mondego - Parque', 'empresa_id' => $cmc->id], ['concelho' => 'Coimbra', 'descricao' => 'Zona Lazer']);

        // Industrial
        Zona::updateOrCreate(['nome' => 'Captação Industrial', 'empresa_id' => $celulose->id], ['concelho' => 'Leiria', 'descricao' => 'Entrada de Água']);

        // Sines
        Zona::updateOrCreate(['nome' => 'Terminal de Contentores', 'empresa_id' => $sines->id], ['concelho' => 'Sines', 'descricao' => 'Monitorização Marítima']);
    }
}
