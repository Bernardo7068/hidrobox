<?php

namespace App\Http\Controllers;

use App\Models\Alerta;
use Illuminate\Http\Request;

class AlertaController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Alerta::with(['boia.zona', 'leitura.tipoSensor']);

        if ($user && $user->role !== 'super_admin') {
            $query->whereHas('boia.zona', function($q) use ($user) {
                $q->where('empresa_id', $user->empresa_id);
            });
        }

        return response()->json($query->orderBy('id', 'desc')->get(), 200);
    }

    public function ativos(Request $request)
    {
        $user = $request->user();
        $query = Alerta::with(['boia.zona', 'leitura.tipoSensor'])
                         ->where('resolvido', false);

        if ($user && $user->role !== 'super_admin') {
            $query->whereHas('boia.zona', function($q) use ($user) {
                $q->where('empresa_id', $user->empresa_id);
            });
        }

        return response()->json($query->orderBy('created_at', 'desc')->get());
    }

    public function resolver($id, Request $request)
    {
        $user = $request->user();
        $alerta = Alerta::with('boia.zona')->find($id);
        
        if (!$alerta) {
            return response()->json(['erro' => 'Alerta não encontrado'], 404);
        }

        // Proteção Multi-Tenant
        if ($user && $user->role !== 'super_admin' && $alerta->boia->zona->empresa_id !== $user->empresa_id) {
            return response()->json(['erro' => 'Acesso negado'], 403);
        }

        $alerta->resolvido = true;
        $alerta->save();
        
        return response()->json(['sucesso' => true, 'mensagem' => 'Alerta resolvido!']);
    }
}