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
        Schema::create('empresas', function (Blueprint $慶) {
            $慶->id();
            $慶->string('nome')->unique();
            $慶->string('nif')->unique();
            $慶->timestamps();
        });

        // Adicionar empresa_id às tabelas dependentes
        Schema::table('users', function (Blueprint $慶) {
            $慶->foreignId('empresa_id')->nullable()->constrained('empresas')->onDelete('cascade');
        });

        Schema::table('zonas', function (Blueprint $慶) {
            $慶->foreignId('empresa_id')->nullable()->constrained('empresas')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('zonas', function (Blueprint $慶) {
            $慶->dropForeign(['empresa_id']);
            $慶->dropColumn('empresa_id');
        });

        Schema::table('users', function (Blueprint $慶) {
            $慶->dropForeign(['empresa_id']);
            $慶->dropColumn('empresa_id');
        });

        Schema::dropIfExists('empresas');
    }
};
