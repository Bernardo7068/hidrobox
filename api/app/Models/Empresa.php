<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Empresa extends Model
{
    protected $fillable = [
        'nome',
        'nif',
    ];

    /**
     * Uma empresa tem vários utilizadores (Admins, Técnicos, Leitores).
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Uma empresa tem várias zonas de monitorização.
     */
    public function zonas(): HasMany
    {
        return $this->hasMany(Zona::class);
    }
}
