<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('zonas', function (Blueprint $table) {
            $table->id();
            $table->string('nome');
            $table->string('concelho');
            $table->text('descricao')->nullable();
            $table->foreignId('user_id')->nullable(); // Dono inicial (opcional)
        });

        Schema::create('boias', function (Blueprint $table) {
            $table->id();
            $table->string('mac_boia')->unique();
            $table->string('mac_gateway')->nullable();
            $table->string('nome');
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->foreignId('zona_id')->constrained('zonas')->onDelete('cascade');
            $table->string('localizacao_texto')->nullable();
            $table->string('estado')->default('pendente');
            $table->integer('bateria')->default(100);
            $table->timestamps();
        });

        Schema::create('tipos_sensor', function (Blueprint $table) {
            $table->id();
            $table->string('nome');
            $table->string('unidade');
        });

        Schema::create('limites_sensores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('boia_id')->constrained('boias')->onDelete('cascade');
            $table->foreignId('tipo_sensor_id')->constrained('tipos_sensor')->onDelete('cascade');
            $table->decimal('valor_minimo', 8, 2);
            $table->decimal('valor_maximo', 8, 2);
        });

        Schema::create('leituras', function (Blueprint $table) {
            $table->id();
            $table->foreignId('boia_id')->constrained('boias')->onDelete('cascade');
            $table->foreignId('tipo_sensor_id')->constrained('tipos_sensor')->onDelete('cascade');
            $table->decimal('valor', 10, 2);
            $table->timestamp('data_hora')->useCurrent();
        });

        Schema::create('alertas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('leitura_id')->constrained('leituras')->onDelete('cascade');
            $table->foreignId('boia_id')->constrained('boias')->onDelete('cascade');
            $table->string('gravidade');
            $table->text('descricao');
            $table->boolean('resolvido')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alertas');
        Schema::dropIfExists('leituras');
        Schema::dropIfExists('limites_sensores');
        Schema::dropIfExists('tipos_sensor');
        Schema::dropIfExists('boias');
        Schema::dropIfExists('zonas');
    }
};
