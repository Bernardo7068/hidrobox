<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('limites_sensores', function (Blueprint $table) {
            // Define se o sensor já foi validado e configurado por um técnico
            // Se false, significa que foi autodetectado pelo ESP32 mas ainda não tem limites definidos
            $table->boolean('is_configurado')->default(true);
        });
    }

    public function down(): void
    {
        Schema::table('limites_sensores', function (Blueprint $table) {
            $table->dropColumn('is_configurado');
        });
    }
};
