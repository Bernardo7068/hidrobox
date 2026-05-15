<?php

namespace App\Http\Controllers;

use App\Models\Alerta;

class AlertaController extends Controller
{
    // Devolve os alertas que ainda não foram resolvidos
    public function ativos()
    {
        $alertas = Alerta::with(['boia', 'leitura.tipoSensor'])
                         ->where('resolvido', false)
                         ->orderBy('created_at', 'desc')
                         ->get();

        return response()->json($alertas);
    }

    // Permite ao técnico clicar num botão no React e marcar o problema como resolvido
    public function resolver($id)
    {
        $alerta = Alerta::find($id);
        
        if ($alerta) {
            $alerta->resolvido = true;
            $alerta->save();
            return response()->json(['sucesso' => true, 'mensagem' => 'Alerta resolvido!']);
        }

        return response()->json(['erro' => 'Alerta não encontrado'], 404);
    }
}