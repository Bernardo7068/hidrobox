<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Empresa;

class EmpresaSeeder extends Seeder
{
    public function run(): void
    {
        Empresa::updateOrCreate(['nif' => '500123456'], ['nome' => 'SMAS Leiria']);
        Empresa::updateOrCreate(['nif' => '500777888'], ['nome' => 'Câmara Municipal de Coimbra']);
        Empresa::updateOrCreate(['nif' => '500999000'], ['nome' => 'Fábrica de Celulose Lis']);
        Empresa::updateOrCreate(['nif' => '500333444'], ['nome' => 'Porto de Sines']);
        Empresa::updateOrCreate(['nif' => '500000000'], ['nome' => 'Empresa Teste']);
    }
}
