<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            EmpresaSeeder::class,
            UserRoleSeeder::class,
            ZonaSeeder::class,
            GatewaySeeder::class,
            SensorSeeder::class,
            BoiaSeeder::class,
        ]);
    }
}
