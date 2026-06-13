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
        Schema::table('empresas', function (Blueprint $table) {
            $table->string('email_contacto')->nullable()->after('nif');
            $table->string('telefone')->nullable()->after('email_contacto');
            $table->text('morada')->nullable()->after('telefone');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('empresas', function (Blueprint $table) {
            $table->dropColumn(['email_contacto', 'telefone', 'morada']);
        });
    }
};
