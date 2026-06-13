<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Manutencao extends Model
{
    protected $table = 'manutencoes';

    protected $fillable = [
        'boia_id',
        'user_id',
        'tipo',
        'tipo_sensor_id',
        'observacoes',
        'estado_geral',
        'checklist',
        'data_intervencao'
    ];

    protected $casts = [
        'checklist' => 'array',
        'data_intervencao' => 'datetime'
    ];

    public function boia()
    {
        return $this->belongsTo(Boia::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function tipoSensor()
    {
        return $this->belongsTo(TipoSensor::class, 'tipo_sensor_id');
    }
}
