<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Alerta extends Model
{
    protected $table = 'alertas';
    const UPDATED_AT = null; // No nosso SQL só temos o created_at nesta tabela

    protected $fillable = [
        'leitura_id', 
        'boia_id', 
        'gravidade', 
        'descricao', 
        'resolvido'
    ];

    protected $casts = [
        'resolvido' => 'boolean',
    ];

    public function leitura()
    {
        return $this->belongsTo(Leitura::class);
    }

    public function boia()
    {
        return $this->belongsTo(Boia::class);
    }
}