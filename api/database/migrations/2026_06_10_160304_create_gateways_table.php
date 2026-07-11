<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gateways', function (Blueprint $blueprint) {
            $blueprint->id();
            $blueprint->foreignId('empresa_id')->nullable()->constrained('empresas')->onDelete('cascade');
            $blueprint->string('mac_gateway')->unique();
            $blueprint->string('nome');
            $blueprint->decimal('latitude', 10, 7)->nullable();
            $blueprint->decimal('longitude', 10, 7)->nullable();
            $blueprint->integer('raio_cobertura')->default(1000); // Metros
            $blueprint->string('estado')->default('ativo'); // ativo, manutencao, erro, offline
            $blueprint->timestamps();
        });

        // Adicionar chave estrangeira na tabela de boias (opcional, mas recomendado)
        Schema::table('boias', function (Blueprint $table) {
            $table->unsignedBigInteger('gateway_id')->nullable()->after('mac_gateway');
            // Nota: Mantemos mac_gateway original por compatibilidade com hardware
        });
    }

    public function down(): void
    {
        Schema::table('boias', function (Blueprint $table) {
            $table->dropColumn('gateway_id');
        });
        Schema::dropIfExists('gateways');
    }
};
