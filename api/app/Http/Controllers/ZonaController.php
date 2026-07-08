<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ZonaController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'nome' => 'required|string|max:255',
            'concelho' => 'nullable|string|max:255'
        ]);

        $id = DB::table('zonas')->insertGetId([
            'nome' => $request->nome,
            'concelho' => $request->concelho ?? 'Desconhecido',
        ]);

        return response()->json(['message' => 'Zona criada com sucesso', 'id' => $id], 201);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'nome' => 'required|string|max:255',
            'concelho' => 'nullable|string|max:255'
        ]);

        $affected = DB::table('zonas')
            ->where('id', $id)
            ->update([
                'nome' => $request->nome,
                'concelho' => $request->concelho ?? 'Desconhecido',
            ]);

        if ($affected === 0) {
            return response()->json(['message' => 'Zona não encontrada ou sem alterações'], 404);
        }

        return response()->json(['message' => 'Zona atualizada com sucesso']);
    }

    public function destroy($id)
    {
        // Verificar se existem boias associadas a esta zona
        $boiasCount = DB::table('boias')->where('zona_id', $id)->count();

        if ($boiasCount > 0) {
            return response()->json([
                'message' => 'Não é possível eliminar esta zona porque existem ' . $boiasCount . ' boias associadas a ela.'
            ], 400);
        }

        $deleted = DB::table('zonas')->where('id', $id)->delete();

        if (!$deleted) {
            return response()->json(['message' => 'Zona não encontrada'], 404);
        }

        return response()->json(['message' => 'Zona eliminada com sucesso']);
    }
}
