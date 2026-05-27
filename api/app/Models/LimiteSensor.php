<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LimiteSensor extends Model
{
    protected $table = 'limites_sensores';
    public $timestamps = false;

    protected $fillable = [
        'boia_id',
        'tipo_sensor_id',
        'valor_minimo',
        'valor_maximo',
        'ultima_manutencao',
        'dias_proxima_manutencao',
        'is_configurado'
    ];

    // AQUI ESTÁ A RELAÇÃO QUE ELE NÃO ESTAVA A ENCONTRAR: tem de ter o _
    public function tipo_sensor()
    {
        return $this->belongsTo(TipoSensor::class, 'tipo_sensor_id');
    }
}