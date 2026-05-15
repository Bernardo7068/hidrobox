<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Boia extends Model
{
    protected $table = 'boias';
    public $timestamps = false;

    protected $fillable = [
        'mac_boia',
        'mac_gateway',
        'nome', 
        'latitude', 
        'longitude', 
        'zona_id', 
        'estado', 
        'bateria',
        'localizacao_texto'
    ];

    public function zona()
    {
        return $this->belongsTo(Zona::class);
    }

    public function leituras()
    {
        return $this->hasMany(Leitura::class);
    }

    public function limites()
    {
        return $this->hasMany(LimiteSensor::class);
    }

    public function alertas()
    {
        return $this->hasMany(Alerta::class);
    }
}