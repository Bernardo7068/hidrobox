<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('manutencoes', function (Blueprint $table) {
            $table->foreignId('tipo_sensor_id')->nullable()->after('tipo')->constrained('tipos_sensor');
        });
    }

    public function down(): void
    {
        Schema::table('manutencoes', function (Blueprint $table) {
            $table->dropConstrainedForeignId('tipo_sensor_id');
        });
    }
};
