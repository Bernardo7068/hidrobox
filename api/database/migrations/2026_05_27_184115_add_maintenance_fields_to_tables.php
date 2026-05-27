<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('boias', function (Blueprint $blueprint) {
            // Data da última manutenção preventiva da boia (troca de bateria, limpeza geral)
            $blueprint->timestamp('ultima_manutencao')->nullable()->after('estado');
        });

        Schema::table('limites_sensores', function (Blueprint $blueprint) {
            // Data da última calibração ou troca física do sensor específico
            $blueprint->timestamp('ultima_manutencao')->nullable();
            // Intervalo recomendado em dias para a próxima manutenção (ex: pH precisa de calibração mensal)
            $blueprint->integer('dias_proxima_manutencao')->default(180); 
        });
    }

    public function down(): void
    {
        Schema::table('boias', function (Blueprint $blueprint) {
            $blueprint->dropColumn('ultima_manutencao');
        });

        Schema::table('limites_sensores', function (Blueprint $blueprint) {
            $blueprint->dropColumn(['ultima_manutencao', 'dias_proxima_manutencao']);
        });
    }
};
