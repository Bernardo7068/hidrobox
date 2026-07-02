<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('limites_sensores', function (Blueprint $table) {
            $table->integer('intervalo_limpeza_dias')->nullable()->default(30);
            $table->integer('intervalo_calibracao_dias')->nullable()->default(180);
            
            $table->timestamp('ultima_limpeza')->nullable();
            $table->timestamp('ultima_calibracao')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('limites_sensores', function (Blueprint $table) {
            $table->dropColumn([
                'intervalo_limpeza_dias',
                'intervalo_calibracao_dias',
                'ultima_limpeza',
                'ultima_calibracao'
            ]);
        });
    }
};
