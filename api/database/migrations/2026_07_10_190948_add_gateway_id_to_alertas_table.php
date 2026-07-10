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
        Schema::table('alertas', function (Blueprint $table) {
            $table->foreignId('boia_id')->nullable()->change();
            $table->foreignId('gateway_id')->nullable()->constrained('gateways')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('alertas', function (Blueprint $table) {
            $table->dropForeign(['gateway_id']);
            $table->dropColumn('gateway_id');
            // Nota: SQLite não suporta bem reverter "change()", não revertemos o boia_id
        });
    }
};
