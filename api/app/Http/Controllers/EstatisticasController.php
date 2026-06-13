<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Leitura;
use App\Models\Boia;
use App\Models\Gateway;
use App\Models\Empresa;
use App\Models\TipoSensor;
use Illuminate\Support\Facades\DB;
use Barryvdh\DomPDF\Facade\Pdf;

class EstatisticasController extends Controller
{
    public function getEstatisticas(Request $request)
    {
        $user = $request->user();
        $query = Leitura::query()
            ->join('boias', 'leituras.boia_id', '=', 'boias.id')
            ->select(
                'leituras.tipo_sensor_id',
                DB::raw('AVG(CAST(leituras.valor AS DECIMAL)) as media'),
                DB::raw('MAX(CAST(leituras.valor AS DECIMAL)) as maximo'),
                DB::raw('MIN(CAST(leituras.valor AS DECIMAL)) as minimo'),
                DB::raw('AVG(leituras.rssi) as rssi_medio')
            )
            ->groupBy('leituras.tipo_sensor_id');

        // Filtro por Empresa (Se não for Super Admin)
        if ($user->role !== 'super_admin') {
            $query->where('boias.empresa_id', $user->empresa_id);
        }

        // Filtros Adicionais da Query (Corrigido para evitar NULL no where)
        if ($request->filled('boia_id')) $query->where('leituras.boia_id', $request->boia_id);
        if ($request->filled('data_inicio')) $query->where('leituras.data_hora', '>=', $request->data_inicio);
        if ($request->filled('data_fim')) $query->where('leituras.data_hora', '<=', $request->data_fim);

        $estatisticas = $query->with('tipoSensor')->get();

        // Dados para Gráfico Temporal (últimos 7 dias por padrão)
        $temporalRaw = Leitura::query()
            ->join('boias', 'leituras.boia_id', '=', 'boias.id')
            ->join('tipos_sensor', 'leituras.tipo_sensor_id', '=', 'tipos_sensor.id')
            ->select(
                DB::raw('DATE(data_hora) as data'),
                'tipos_sensor.nome as sensor',
                DB::raw('AVG(CAST(valor AS DECIMAL)) as media')
            )
            ->where('data_hora', '>=', now()->subDays(7))
            ->groupBy('data', 'sensor')
            ->orderBy('data', 'asc')
            ->get();

        // Formatar para o Recharts (Agrupar por data: [{data: '2023-01-01', pH: 7, Temp: 20}, ...])
        $temporal = $temporalRaw->groupBy('data')->map(function ($items, $date) {
            $row = ['data' => $date];
            foreach ($items as $item) {
                $row[$item->sensor] = round($item->media, 2);
            }
            return $row;
        })->values();

        return response()->json([
            'geral' => $estatisticas,
            'temporal' => $temporal
        ]);
    }

    public function exportarPDF(Request $request)
    {
        $user = $request->user();
        if (!in_array($user->role, ['super_admin', 'admin_empresa'])) {
            return response()->json(['error' => 'Sem permissão para exportar relatórios.'], 403);
        }

        // Lógica de filtros similar ao getEstatisticas...
        $boias = Boia::query();
        if ($user->role !== 'super_admin') $boias->where('empresa_id', $user->empresa_id);
        if ($request->has('boia_id')) $boias->where('id', $request->boia_id);
        
        $boias = $boias->with(['leituras' => function($q) use ($request) {
            if ($request->has('data_inicio')) $q->where('data_hora', '>=', $request->data_inicio);
            if ($request->has('data_fim')) $q->where('data_hora', '<=', $request->data_fim);
            $q->orderBy('data_hora', 'desc')->limit(100);
        }, 'limites.tipoSensor'])->get();

        $data = [
            'titulo' => 'Relatório Técnico HidroBox',
            'data_emissao' => now()->format('d/m/Y H:i'),
            'emissor' => $user->name,
            'boias' => $boias
        ];

        $pdf = Pdf::loadView('pdf.relatorio_sensores', $data);
        return $pdf->download('relatorio_hidrobox.pdf');
    }
}
