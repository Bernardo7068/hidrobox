<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Zona extends Model
{
    protected $table = 'zonas';
    public $timestamps = false; // Desativamos porque não pusemos created_at no SQL

    protected $fillable = [
        'nome', 
        'concelho', 
        'descricao', 
        'user_id',
        'empresa_id'
    ];

    public function empresa()
    {
        return $this->belongsTo(Empresa::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function boias()
    {
        return $this->hasMany(Boia::class);
    }
}