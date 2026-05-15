<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Leitura extends Model
{
    protected $table = 'leituras';
    public $timestamps = false;

    protected $fillable = [
        'boia_id', 
        'tipo_sensor_id', 
        'valor', 
        'data_hora'
    ];

    // Diz ao Laravel para tratar este campo como uma data/hora real
    protected $casts = [
        'data_hora' => 'datetime',
    ];

    public function boia()
    {
        return $this->belongsTo(Boia::class);
    }

    public function tipoSensor()
    {
        return $this->belongsTo(TipoSensor::class);
    }
}