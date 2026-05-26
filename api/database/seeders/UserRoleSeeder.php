<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Empresa;
use Illuminate\Support\Facades\Hash;

class UserRoleSeeder extends Seeder
{
    public function run(): void
    {
        // Super Admin Global
        User::updateOrCreate(['email' => 'super@hidrobox.pt'], [
            'name' => 'Super Administrador',
            'password' => Hash::make('super123'),
            'role' => 'super_admin',
            'empresa_id' => null,
        ]);

        $empresas = [
            'smas-leiria.pt' => 'SMAS Leiria',
            'cm-coimbra.pt'  => 'Câmara Municipal de Coimbra',
            'celulis.pt'     => 'Fábrica de Celulose Lis',
            'porto-sines.pt' => 'Porto de Sines',
            'empresa.pt'     => 'Empresa Teste'
        ];

        foreach ($empresas as $domain => $nome) {
            $empresa = Empresa::where('nome', $nome)->first();
            if (!$empresa) continue;

            // Admin
            User::updateOrCreate(['email' => "admin@{$domain}"], [
                'name' => "Admin {$nome}",
                'password' => Hash::make('admin123'),
                'role' => 'admin_empresa',
                'empresa_id' => $empresa->id,
            ]);

            // Técnico
            User::updateOrCreate(['email' => "tecnico@{$domain}"], [
                'name' => "Técnico {$nome}",
                'password' => Hash::make('tecnico123'),
                'role' => 'tecnico_empresa',
                'empresa_id' => $empresa->id,
            ]);

            // Leitor
            User::updateOrCreate(['email' => "leitor@{$domain}"], [
                'name' => "Leitor {$nome}",
                'password' => Hash::make('leitor123'),
                'role' => 'leitor_empresa',
                'empresa_id' => $empresa->id,
            ]);
        }
    }
}
