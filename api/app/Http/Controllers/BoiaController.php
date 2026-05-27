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

        // Se for Super Admin, mostra tudo
        if ($user && $user->role === 'super_admin') {
            return response()->json(Boia::with(['zona', 'limites.tipo_sensor'])->get());
        }

        // Se não houver utilizador ou não tiver empresa_id, não devolve nada (segurança)
        if (!$user || !$user->empresa_id) {
            return response()->json([]);
        }

        // Filtra estritamente pela empresa do utilizador logado
        $boiasFiltradas = Boia::whereHas('zona', function($query) use ($user) {
            $query->where('empresa_id', $user->empresa_id);
        })->with(['zona', 'limites.tipo_sensor'])->get();

        return response()->json($boiasFiltradas);
    }

    public function getZonas(Request $request)
    {
        $user = $request->user();

        // Se for Super Admin, devolve todas as zonas
        if ($user && $user->role === 'super_admin') {
            return response()->json(Zona::all());
        }

        // Se não houver utilizador ou não tiver empresa_id, não devolve nada
        if (!$user || !$user->empresa_id) {
            return response()->json([]);
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
        $user = $request->user();
        
        // 1. Valida os dados recebidos
        $dadosValidados = $request->validate([
            'mac_boia'          => 'required|string|unique:boias,mac_boia', 
            'mac_gateway'       => 'required|string',
            'nome'              => 'required|string|max:255',
            'latitude'          => 'required|numeric',
            'longitude'         => 'required|numeric',
            'zona_id'           => 'required|integer|exists:zonas,id',
            'localizacao_texto' => 'nullable|string|max:255'
        ]);

        // Proteção extra: Garantir que a zona pertence à empresa do admin (se não for super_admin)
        if ($user && $user->role !== 'super_admin') {
            $zona = Zona::find($dadosValidados['zona_id']);
            if ($zona->empresa_id !== $user->empresa_id) {
                return response()->json(['sucesso' => false, 'mensagem' => 'Não tem permissão para esta zona.'], 403);
            }
        }

        // 2. Grava na Base de Dados
        $boia = Boia::create([
            'mac_boia'          => $dadosValidados['mac_boia'], 
            'mac_gateway'       => $dadosValidados['mac_gateway'],
            'nome'              => $dadosValidados['nome'],
            'latitude'          => $dadosValidados['latitude'],
            'longitude'         => $dadosValidados['longitude'],
            'zona_id'           => $dadosValidados['zona_id'],
            'localizacao_texto' => $dadosValidados['localizacao_texto'] ?? null,
            'estado'            => 'ativa',
            'bateria'           => 100
        ]);

        return response()->json(['sucesso' => true, 'boia' => $boia], 201);
    }

    public function associarSensor(Request $request)
    {
        $user = $request->user();
        
        $validated = $request->validate([
            'boia_id' => 'required|integer|exists:boias,id',
            'tipo_sensor_id' => 'required|integer|exists:tipos_sensor,id',
            'valor_minimo' => 'required|numeric',
            'valor_maximo' => 'required|numeric',
            'status' => 'nullable|string|in:ativo,erro,calibracao,desconectado',
            'dias_proxima_manutencao' => 'nullable|integer'
        ]);

        $boia = Boia::with('zona')->find($validated['boia_id']);

        // Proteção Multi-Tenant
        if ($user && $user->role !== 'super_admin' && $boia->zona->empresa_id !== $user->empresa_id) {
            return response()->json(['sucesso' => false, 'mensagem' => 'Acesso negado.'], 403);
        }

        $limite = LimiteSensor::updateOrCreate(
            [
                'boia_id' => $validated['boia_id'],
                'tipo_sensor_id' => $validated['tipo_sensor_id']
            ],
            [
                'valor_minimo' => $validated['valor_minimo'],
                'valor_maximo' => $validated['valor_maximo'],
                'status' => $validated['status'] ?? 'ativo',
                'ultima_manutencao' => now(), // Assume-se que se está a configurar/calibrar, houve manutenção
                'dias_proxima_manutencao' => $validated['dias_proxima_manutencao'] ?? 180,
                'is_configurado' => true // Validado pelo humano
            ]
        );

        return response()->json([
            'message' => 'Limites operacionais atualizados com sucesso!',
            'limite' => $limite
        ], 200);
    }

    public function show($id, Request $request)
    {
        $user = $request->user();
        
        $boia = Boia::with(['zona', 'limites.tipo_sensor', 'leituras'])->find($id);

        if (!$boia) {
            return response()->json(['sucesso' => false, 'mensagem' => 'Esta boia não existe.'], 404);
        }

        // Bloquear acesso se a boia não pertencer à empresa e não for super_admin
        if ($user && $user->role !== 'super_admin' && $boia->zona->empresa_id !== $user->empresa_id) {
            return response()->json(['sucesso' => false, 'mensagem' => 'Acesso Negado.'], 403);
        }

        return response()->json($boia, 200);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        $boia = Boia::with('zona')->find($id);

        if (!$boia) {
            return response()->json(['sucesso' => false, 'mensagem' => 'Boia não encontrada.'], 404);
        }

        // Proteção Multi-Tenant
        if ($user && $user->role !== 'super_admin' && $boia->zona->empresa_id !== $user->empresa_id) {
            return response()->json(['sucesso' => false, 'mensagem' => 'Acesso negado.'], 403);
        }

        $validated = $request->validate([
            'nome'              => 'sometimes|string|max:255',
            'mac_boia'          => 'sometimes|string|unique:boias,mac_boia,' . $id,
            'mac_gateway'       => 'sometimes|string',
            'latitude'          => 'sometimes|numeric',
            'longitude'         => 'sometimes|numeric',
            'zona_id'           => 'sometimes|integer|exists:zonas,id',
            'localizacao_texto' => 'nullable|string|max:255',
            'estado'            => 'sometimes|string|in:ativa,manutencao,erro,offline',
            'bateria'           => 'sometimes|integer|min:0|max:100'
        ]);

        // Se mudar de zona, verificar se a nova zona pertence à mesma empresa
        if (isset($validated['zona_id']) && $user->role !== 'super_admin') {
            $novaZona = Zona::find($validated['zona_id']);
            if ($novaZona->empresa_id !== $user->empresa_id) {
                return response()->json(['sucesso' => false, 'mensagem' => 'Acesso negado à nova zona.'], 403);
            }
        }

        $boia->update($validated);

        return response()->json(['sucesso' => true, 'mensagem' => 'Estação atualizada com sucesso!', 'boia' => $boia]);
    }

    public function destroy($id, Request $request)
    {
        $user = $request->user();
        $boia = Boia::with('zona')->find($id);

        if (!$boia) {
            return response()->json(['sucesso' => false, 'mensagem' => 'Boia não encontrada.'], 404);
        }

        // Proteção Multi-Tenant
        if ($user && $user->role !== 'super_admin' && $boia->zona->empresa_id !== $user->empresa_id) {
            return response()->json(['sucesso' => false, 'mensagem' => 'Acesso negado.'], 403);
        }

        // Remove limites e alertas associados
        $boia->limites()->delete();
        $boia->alertas()->delete();
        $boia->leituras()->delete();
        
        $boia->delete();

        return response()->json(['sucesso' => true, 'mensagem' => 'Estação removida com sucesso.']);
    }

    public function desassociarSensor(Request $request)
    {
        $user = $request->user();
        
        $validated = $request->validate([
            'boia_id' => 'required|integer|exists:boias,id',
            'tipo_sensor_id' => 'required|integer|exists:tipos_sensor,id',
        ]);

        $boia = Boia::with('zona')->find($validated['boia_id']);

        // Proteção Multi-Tenant
        if ($user && $user->role !== 'super_admin' && $boia->zona->empresa_id !== $user->empresa_id) {
            return response()->json(['sucesso' => false, 'mensagem' => 'Acesso negado.'], 403);
        }

        LimiteSensor::where('boia_id', $validated['boia_id'])
                    ->where('tipo_sensor_id', $validated['tipo_sensor_id'])
                    ->delete();

        return response()->json(['sucesso' => true, 'mensagem' => 'Sensor removido da estação.']);
    }
}