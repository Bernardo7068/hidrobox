<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('limites_sensores', function (Blueprint $table) {
            $table->string('status')->default('ativo'); // ativo, erro, calibracao, desconectado
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('limites_sensores', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }
};
