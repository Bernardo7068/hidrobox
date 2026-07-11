<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Boia;
use App\Models\Zona;
use App\Models\TipoSensor;
use App\Models\LimiteSensor;
use App\Models\Gateway;
use Illuminate\Support\Facades\DB;
use App\Models\Alerta;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;

class BoiaController extends Controller
{
    public function getGateways(Request $request)
    {
        $user = auth()->user();
        
        // 1. Verificação Pseudo-Cron de Estado (Heartbeat)
        $gateways = Gateway::whereIn('estado', ['ativo', 'pendente'])
            ->where(function($query) use ($user) {
                if ($user->role !== 'super_admin') {
                    $query->where('empresa_id', $user->empresa_id)->orWhereNull('empresa_id');
                }
            })->get();
        $agora = Carbon::now();

        foreach ($gateways as $gateway) {
            $ultimaVez = $gateway->updated_at ? new Carbon($gateway->updated_at) : new Carbon($gateway->created_at);
            
            // O tempo base é o menor intervalo de deep sleep das boias deste gateway.
            $minIntervalo = DB::table('boias')->where('mac_gateway', $gateway->mac_gateway)->min('intervalo_segundos');
            $intervaloBase = $minIntervalo ? (int)$minIntervalo : 300;
            
            // Tolerância: 3 minutos a mais para compensar a rede
            $limiteSegundos = $intervaloBase + 180;
            $segundosDesdeUltimaVez = $agora->diffInSeconds($ultimaVez);

            if ($segundosDesdeUltimaVez > $limiteSegundos) {
                // Gateway OFFLINE!
                $gateway->estado = 'offline';
                $gateway->save();

                // Evitar duplicação do alerta
                $alertaExistente = Alerta::where('gateway_id', $gateway->id)->where('resolvido', false)->first();

                if (!$alertaExistente) {
                    $alerta = Alerta::create([
                        'gateway_id' => $gateway->id,
                        'gravidade' => 'perigo',
                        'descricao' => 'Falha Crítica: Torre de comunicação offline (' . $gateway->nome . ').',
                        'resolvido' => false,
                    ]);

                    try {
                        Http::post('http://127.0.0.1:3001/emit', [
                            'event' => 'novo-alerta',
                            'payload' => [
                                'tipo' => 'gateway_offline',
                                'alerta_id' => $alerta->id,
                                'gateway_id' => $gateway->id,
                                'empresa_id' => 'all'
                            ]
                        ]);
                    } catch (\Exception $e) {}
                }
            }
        }

        // 2. Retornar os gateways atualizados
        $queryGateways = Gateway::with('boias');
        if ($user->role !== 'super_admin') {
            $queryGateways->where(function($query) use ($user) {
                $query->where('empresa_id', $user->empresa_id)->orWhereNull('empresa_id');
            });
        }
        return response()->json($queryGateways->get());
    }

    public function storeGateway(Request $request)
    {
        $user = auth()->user();
        $validated = $request->validate([
            'mac_gateway' => 'required|string',
            'nome' => 'required|string|max:255',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'raio_cobertura' => 'nullable|integer',
        ]);

        $gateway = Gateway::updateOrCreate(
            ['mac_gateway' => $validated['mac_gateway']],
            [
                'nome' => $validated['nome'],
                'latitude' => $validated['latitude'],
                'longitude' => $validated['longitude'],
                'raio_cobertura' => $validated['raio_cobertura'],
                'estado' => 'ativo', // Ao configurar manualmente, passa a ativo
                'empresa_id' => $user->empresa_id
            ]
        );
        
        // Tentar vincular boias órfãs que já usam este MAC
        DB::table('boias')->where('mac_gateway', $gateway->mac_gateway)->update(['gateway_id' => $gateway->id]);

        return response()->json(['sucesso' => true, 'gateway' => $gateway], 201);
    }

    public function updateGateway(Request $request, $id)
    {
        $user = auth()->user();
        $gateway = Gateway::findOrFail($id);
        $validated = $request->validate([
            'nome' => 'sometimes|string|max:255',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'raio_cobertura' => 'nullable|integer',
            'estado' => 'sometimes|string|in:ativo,manutencao,erro,offline'
        ]);

        if ($user->role !== 'super_admin' && !$gateway->empresa_id) {
            $validated['empresa_id'] = $user->empresa_id;
        }

        $gateway->update($validated);
        return response()->json(['sucesso' => true, 'gateway' => $gateway]);
    }

    public function destroyGateway($id)
    {
        $gateway = Gateway::findOrFail($id);
        // Desvincular boias
        DB::table('boias')->where('gateway_id', $gateway->id)->update(['gateway_id' => null]);
        $gateway->delete();
        return response()->json(['sucesso' => true, 'mensagem' => 'Gateway removido.']);
    }

    public function index(Request $request)
    {
        // 1. Verificação Pseudo-Cron de Estado (Heartbeat das Boias)
        $todasBoias = Boia::whereIn('estado', ['ativa', 'pendente'])->get();
        $agora = Carbon::now();

        foreach ($todasBoias as $b) {
            $ultimaVez = $b->updated_at ? new Carbon($b->updated_at) : new Carbon($b->created_at);
            $intervalo = $b->intervalo_segundos ? (int)$b->intervalo_segundos : 300;
            
            // Tolerância: 3 minutos a mais para compensar atrasos
            $limiteSegundos = $intervalo + 180;

            if ($agora->diffInSeconds($ultimaVez) > $limiteSegundos) {
                // Boia OFFLINE!
                $b->estado = 'offline';
                $b->save();

                // Evitar duplicação do alerta
                $alertaExistente = Alerta::where('boia_id', $b->id)
                    ->where('resolvido', false)
                    ->where('descricao', 'like', '%offline%')
                    ->first();

                if (!$alertaExistente) {
                    $alerta = Alerta::create([
                        'boia_id' => $b->id,
                        'gravidade' => 'perigo',
                        'descricao' => 'Falha Crítica: Boia offline (' . $b->nome . '). Nenhum dado recebido recentemente.',
                        'resolvido' => false,
                    ]);

                    try {
                        Http::post('http://127.0.0.1:3001/emit', [
                            'event' => 'novo-alerta',
                            'payload' => [
                                'tipo' => 'boia_offline',
                                'alerta_id' => $alerta->id,
                                'boia_id' => $b->id,
                                'empresa_id' => 'all'
                            ]
                        ]);
                    } catch (\Exception $e) {}
                }
            }
        }

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

    public function storeTipoSensor(Request $request)
    {
        $validated = $request->validate([
            'nome' => 'required|string|max:255|unique:tipos_sensor,nome',
            'unidade' => 'required|string|max:50',
        ]);

        $tipo = TipoSensor::create($validated);
        return response()->json(['sucesso' => true, 'tipo' => $tipo], 201);
    }

    public function updateTipoSensor(Request $request, $id)
    {
        $tipo = TipoSensor::findOrFail($id);
        $validated = $request->validate([
            'nome' => 'sometimes|string|max:255|unique:tipos_sensor,nome,' . $id,
            'unidade' => 'sometimes|string|max:50',
        ]);

        $tipo->update($validated);
        return response()->json(['sucesso' => true, 'tipo' => $tipo]);
    }

    public function destroyTipoSensor($id)
    {
        $tipo = TipoSensor::findOrFail($id);
        
        // Verificar se existem limites ou leituras associadas
        $emUso = DB::table('limites_sensores')->where('tipo_sensor_id', $id)->exists() ||
                 DB::table('leituras')->where('tipo_sensor_id', $id)->exists();

        if ($emUso) {
            return response()->json(['sucesso' => false, 'mensagem' => 'Não pode eliminar um sensor em uso pela rede.'], 422);
        }

        $tipo->delete();
        return response()->json(['sucesso' => true]);
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
            'localizacao_texto' => 'nullable|string|max:255',
            'intervalo_segundos' => 'nullable|integer|min:10'
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
            'dias_proxima_manutencao' => 'nullable|integer',
            'intervalo_limpeza_dias' => 'nullable|integer',
            'intervalo_calibracao_dias' => 'nullable|integer'
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
                'intervalo_limpeza_dias' => $validated['intervalo_limpeza_dias'] ?? 30,
                'intervalo_calibracao_dias' => $validated['intervalo_calibracao_dias'] ?? 180,
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
        
        $boia = Boia::with(['zona', 'limites.tipo_sensor', 'leituras', 'manutencoes.user', 'manutencoes.tipoSensor'])->find($id);

        if (!$boia) {
            return response()->json(['sucesso' => false, 'mensagem' => 'Esta boia não existe.'], 404);
        }

        // Bloquear acesso se a boia não pertencer à empresa e não for super_admin
        if ($user && $user->role !== 'super_admin' && $boia->zona->empresa_id !== $user->empresa_id) {
            return response()->json(['sucesso' => false, 'mensagem' => 'Acesso Negado.'], 403);
        }

        return response()->json($boia, 200);
    }

    public function registarManutencao(Request $request, $id)
    {
        $user = $request->user();
        $boia = Boia::with('zona')->findOrFail($id);

        // Proteção Multi-Tenant
        if ($user && $user->role !== 'super_admin' && $boia->zona->empresa_id !== $user->empresa_id) {
            return response()->json(['sucesso' => false, 'mensagem' => 'Acesso negado.'], 403);
        }

        $validated = $request->validate([
            'tipo'            => 'required|string|in:limpeza,calibracao,reparacao',
            'tipo_sensor_id'  => 'nullable|integer|exists:tipos_sensor,id',
            'observacoes'     => 'nullable|string',
            'estado_geral'    => 'required|string|in:bom,regular,critico',
            'checklist'       => 'nullable|array',
            'data_intervencao'=> 'required|date'
        ]);

        $manutencao = \App\Models\Manutencao::create([
            'boia_id'         => $boia->id,
            'user_id'         => $user->id,
            'tipo'            => $validated['tipo'],
            'tipo_sensor_id'  => $validated['tipo_sensor_id'] ?? null,
            'observacoes'     => $validated['observacoes'],
            'estado_geral'    => $validated['estado_geral'],
            'checklist'       => $validated['checklist'],
            'data_intervencao'=> $validated['data_intervencao']
        ]);

        // 1. Se for uma limpeza geral, atualizar a boia
        if ($validated['tipo'] === 'limpeza') {
            $boia->update(['ultima_manutencao' => $validated['data_intervencao']]);
        }

        // 2. Se for uma calibração de sensor, atualizar o limite específico
        if ($validated['tipo'] === 'calibracao' && isset($validated['tipo_sensor_id'])) {
            \DB::table('limites_sensores')
                ->where('boia_id', $boia->id)
                ->where('tipo_sensor_id', $validated['tipo_sensor_id'])
                ->update(['ultima_manutencao' => $validated['data_intervencao']]);
        }

        return response()->json(['sucesso' => true, 'manutencao' => $manutencao], 201);
    }

    public function atualizarCiclos(Request $request, $id)
    {
        $user = $request->user();
        $boia = Boia::with('zona')->findOrFail($id);

        if ($user && $user->role !== 'super_admin' && $boia->zona->empresa_id !== $user->empresa_id) {
            return response()->json(['sucesso' => false, 'mensagem' => 'Acesso negado.'], 403);
        }

        $validated = $request->validate([
            'tipo_sensor_id' => 'required|integer|exists:tipos_sensor,id',
            'intervalo_limpeza_dias' => 'required|integer|min:1',
            'intervalo_calibracao_dias' => 'required|integer|min:1',
            'dias_proxima_manutencao' => 'required|integer|min:1'
        ]);

        \DB::table('limites_sensores')
            ->where('boia_id', $boia->id)
            ->where('tipo_sensor_id', $validated['tipo_sensor_id'])
            ->update([
                'intervalo_limpeza_dias' => $validated['intervalo_limpeza_dias'],
                'intervalo_calibracao_dias' => $validated['intervalo_calibracao_dias'],
                'dias_proxima_manutencao' => $validated['dias_proxima_manutencao']
            ]);

        return response()->json(['sucesso' => true, 'mensagem' => 'Ciclos de manutenção atualizados com sucesso.']);
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
            'mac_gateway'       => 'sometimes|nullable|string',
            'latitude'          => 'sometimes|nullable|numeric',
            'longitude'         => 'sometimes|nullable|numeric',
            'zona_id'           => 'sometimes|integer|exists:zonas,id',
            'localizacao_texto' => 'nullable|string|max:255',
            'estado'            => 'sometimes|string|in:ativa,pendente,manutencao,erro,offline',
            'bateria'           => 'sometimes|numeric|min:0|max:100',
            'intervalo_segundos' => 'sometimes|integer|min:10'
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