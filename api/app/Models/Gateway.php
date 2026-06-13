<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Gateway extends Model
{
    protected $table = 'gateways';

    protected $fillable = [
        'mac_gateway',
        'nome',
        'latitude',
        'longitude',
        'raio_cobertura',
        'estado'
    ];

    public function boias()
    {
        return $this->hasMany(Boia::class);
    }
}
