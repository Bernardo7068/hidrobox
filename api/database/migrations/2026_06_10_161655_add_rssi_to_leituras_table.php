<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leituras', function (Blueprint $table) {
            $table->integer('rssi')->nullable()->after('valor');
        });

        Schema::table('boias', function (Blueprint $table) {
            $table->integer('rssi_ultimo')->nullable()->after('bateria');
        });
    }

    public function down(): void
    {
        Schema::table('leituras', function (Blueprint $table) {
            $table->dropColumn('rssi');
        });
        Schema::table('boias', function (Blueprint $table) {
            $table->dropColumn('rssi_ultimo');
        });
    }
};
