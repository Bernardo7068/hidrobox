<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('manutencoes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('boia_id')->constrained('boias')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users');
            $table->string('tipo'); // 'limpeza', 'calibracao', 'reparacao'
            $table->text('observacoes')->nullable();
            $table->string('estado_geral'); // 'bom', 'regular', 'critico'
            $table->json('checklist')->nullable(); // Guardar itens verificados
            $table->timestamp('data_intervencao');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('manutencoes');
    }
};
