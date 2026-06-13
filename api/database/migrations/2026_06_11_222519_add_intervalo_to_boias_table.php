<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('boias', function (Blueprint $table) {
            $table->integer('intervalo_segundos')->default(300)->after('bateria');
        });
    }

    public function down(): void
    {
        Schema::table('boias', function (Blueprint $table) {
            $table->dropColumn('intervalo_segundos');
        });
    }
};
