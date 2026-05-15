<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Boia;
use App\Models\Zona;
use App\Models\TipoSensor;
use App\Models\LimiteSensor;

class BoiaController extends Controller
{
public function index(Request $request)
{
    $user = $request->user(); 

    // [CORREÇÃO] Se não houver utilizador logado ou se for Super Admin, mostra tudo (Modo Desenvolvimento)
    if (!$user || $user->role === 'super_admin') {
        return response()->json(Boia::with(['zona', 'limites.tipo_sensor'])->get());
    }

    // Se houver um utilizador de uma empresa específico logado
    $empresaId = $user->empresa_id;

    $boiasFiltradas = Boia::whereHas('zona', function($query) use ($empresaId) {
        $query->where('empresa_id', $empresaId);
    })->with(['zona', 'limites.tipo_sensor'])->get();

    return response()->json($boiasFiltradas);
}

public function getZonas(Request $request)
{
    $user = $request->user();

    // [CORREÇÃO] Se não houver utilizador logado ou se for Super Admin, devolve todas as zonas
    if (!$user || $user->role === 'super_admin') {
        return response()->json(Zona::all());
    }

    // Caso contrário, filtra estritamente pela empresa do utilizador
    return response()->json(Zona::where('empresa_id', $user->empresa_id)->get());
}

    public function getTiposSensor()
    {
        return response()->json(TipoSensor::all());
    }

    public function store(Request $request)
    {
        // 1. Valida os dados recebidos
        $dadosValidados = $request->validate([
            'mac_boia'          => 'required|string|unique:boias,mac_boia', 
            'mac_gateway'       => 'required|string',
            'nome'              => 'required|string|max:255',
            'latitude'          => 'required|numeric',
            'longitude'         => 'required|numeric',
            'zona_id'           => 'required|integer|exists:zonas,id',
            'localizacao_texto' => 'nullable|string|max:255' // <-- A nova rua opcional
        ]);

        // 2. Grava na Base de Dados
        $boia = Boia::create([
            'mac_boia'          => $dadosValidados['mac_boia'], 
            'mac_gateway'       => $dadosValidados['mac_gateway'],
            'nome'              => $dadosValidados['nome'],
            'latitude'          => $dadosValidados['latitude'],
            'longitude'         => $dadosValidados['longitude'],
            'zona_id'           => $dadosValidados['zona_id'],
            'localizacao_texto' => $dadosValidados['localizacao_texto'] ?? null, // <-- Guarda a rua!
            'estado'            => 'ativa',
            'bateria'           => 100
        ]);

        return response()->json(['sucesso' => true, 'boia' => $boia], 201);
    }

    public function associarSensor(Request $request)
    {
        $dadosValidados = $request->validate([
            'boia_id'        => 'required|integer|exists:boias,id',
            'tipo_sensor_id' => 'required|integer|exists:tipos_sensor,id',
            'valor_minimo'   => 'required|numeric',
            'valor_maximo'   => 'required|numeric'
        ]);

        $limite = LimiteSensor::updateOrCreate(
            ['boia_id' => $dadosValidados['boia_id'], 'tipo_sensor_id' => $dadosValidados['tipo_sensor_id']],
            ['valor_minimo' => $dadosValidados['valor_minimo'], 'valor_maximo' => $dadosValidados['valor_maximo']]
        );

        return response()->json(['sucesso' => true, 'limite' => $limite], 200);
    }
}