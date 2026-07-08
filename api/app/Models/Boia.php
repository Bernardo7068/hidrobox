<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Boia extends Model
{
    protected $table = 'boias';

    protected $fillable = [
        'mac_boia',
        'mac_gateway',
        'gateway_id',
        'nome', 
        'latitude', 
        'longitude', 
        'zona_id', 
        'estado', 
        'bateria',
        'intervalo_segundos',
        'rssi_ultimo',
        'localizacao_texto',
        'ultima_manutencao'
    ];

    public function gateway()
    {
        return $this->belongsTo(Gateway::class);
    }

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

    public function manutencoes()
    {
        return $this->hasMany(Manutencao::class)->orderBy('data_intervencao', 'desc');
    }
}