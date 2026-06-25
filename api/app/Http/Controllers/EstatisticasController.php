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
            ->join('zonas', 'boias.zona_id', '=', 'zonas.id')
            ->select(
                'leituras.tipo_sensor_id',
                DB::raw('AVG(CAST(leituras.valor AS DECIMAL)) as media'),
                DB::raw('MAX(CAST(leituras.valor AS DECIMAL)) as maximo'),
                DB::raw('MIN(CAST(leituras.valor AS DECIMAL)) as minimo')
            )
            ->groupBy('leituras.tipo_sensor_id');

        // Filtro por Empresa (Se não for Super Admin)
        if ($user->role !== 'super_admin') {
            $query->where('zonas.empresa_id', $user->empresa_id);
        }

        // Filtros Adicionais da Query
        if ($request->filled('boia_id')) $query->where('leituras.boia_id', $request->boia_id);
        if ($request->filled('data_inicio')) $query->where('leituras.data_hora', '>=', $request->data_inicio);
        if ($request->filled('data_fim')) $query->where('leituras.data_hora', '<=', $request->data_fim);

        $estatisticas = $query->with('tipoSensor')->get();

        // 2. Query de Telemetria (Sinal RSSI agrupado por Boia)
        $telemetriaQuery = Leitura::query()
            ->join('boias', 'leituras.boia_id', '=', 'boias.id')
            ->join('zonas', 'boias.zona_id', '=', 'zonas.id')
            ->select(
                'boias.nome as boia',
                DB::raw('AVG(leituras.rssi) as rssi_medio')
            )
            ->whereNotNull('leituras.rssi')
            ->groupBy('boias.nome');

        if ($user->role !== 'super_admin') {
            $telemetriaQuery->where('zonas.empresa_id', $user->empresa_id);
        }
        if ($request->filled('boia_id')) $telemetriaQuery->where('leituras.boia_id', $request->boia_id);
        if ($request->filled('data_inicio')) $telemetriaQuery->where('leituras.data_hora', '>=', $request->data_inicio);
        if ($request->filled('data_fim')) $telemetriaQuery->where('leituras.data_hora', '<=', $request->data_fim);

        $telemetria = $telemetriaQuery->get();

        // Dados para Gráfico Temporal (últimos 7 dias por padrão)
        $temporalQuery = Leitura::query()
            ->join('boias', 'leituras.boia_id', '=', 'boias.id')
            ->join('zonas', 'boias.zona_id', '=', 'zonas.id')
            ->join('tipos_sensor', 'leituras.tipo_sensor_id', '=', 'tipos_sensor.id')
            ->select(
                DB::raw('DATE(data_hora) as data'),
                'tipos_sensor.nome as sensor',
                DB::raw('AVG(CAST(valor AS DECIMAL)) as media')
            )
            ->where('data_hora', '>=', now()->subDays(7));

        if ($user->role !== 'super_admin') {
            $temporalQuery->where('zonas.empresa_id', $user->empresa_id);
        }
        
        $temporalRaw = $temporalQuery->groupBy('data', 'sensor')
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

        // Buscar Histórico de Manutenções
        $manutencoesQuery = \App\Models\Manutencao::query()
            ->with(['user', 'boia'])
            ->join('boias', 'manutencoes.boia_id', '=', 'boias.id')
            ->join('zonas', 'boias.zona_id', '=', 'zonas.id')
            ->select('manutencoes.*');

        if ($user->role !== 'super_admin') {
            $manutencoesQuery->where('zonas.empresa_id', $user->empresa_id);
        }
        if ($request->filled('boia_id')) $manutencoesQuery->where('manutencoes.boia_id', $request->boia_id);
        if ($request->filled('data_inicio')) $manutencoesQuery->where('manutencoes.data_intervencao', '>=', $request->data_inicio);
        if ($request->filled('data_fim')) {
            $data_fim = strlen($request->data_fim) == 10 ? $request->data_fim . ' 23:59:59' : $request->data_fim;
            $manutencoesQuery->where('manutencoes.data_intervencao', '<=', $data_fim);
        }

        $manutencoes = $manutencoesQuery->orderBy('data_intervencao', 'desc')->get();

        return response()->json([
            'geral' => $estatisticas,
            'temporal' => $temporal,
            'telemetria' => $telemetria,
            'manutencoes' => $manutencoes
        ]);
    }

    public function exportarPDF(Request $request)
    {
        $user = $request->user();
        if (!in_array($user->role, ['super_admin', 'admin_empresa', 'tecnico_empresa'])) {
            return response()->json(['error' => 'Sem permissão para exportar relatórios.'], 403);
        }

        // Lógica de filtros similar ao getEstatisticas...
        $boias = Boia::query();
        if ($user->role !== 'super_admin') {
            $boias->whereHas('zona', function ($q) use ($user) {
                $q->where('empresa_id', $user->empresa_id);
            });
        }
        if ($request->has('boia_id') && $request->boia_id != '') {
            $boias->where('id', $request->boia_id);
        }
        
        $boias = $boias->with(['zona.empresa', 'leituras' => function($q) use ($request) {
            if ($request->has('data_inicio') && $request->data_inicio != '') {
                $q->where('data_hora', '>=', $request->data_inicio);
            }
            if ($request->has('data_fim') && $request->data_fim != '') {
                // To ensure it includes the whole day, append 23:59:59 if it's just a date
                $data_fim = strlen($request->data_fim) == 10 ? $request->data_fim . ' 23:59:59' : $request->data_fim;
                $q->where('data_hora', '<=', $data_fim);
            }
            $q->orderBy('data_hora', 'desc')->limit(100);
        }, 'limites.tipo_sensor', 'manutencoes' => function($q) use ($request) {
            if ($request->has('data_inicio') && $request->data_inicio != '') {
                $q->where('data_intervencao', '>=', $request->data_inicio);
            }
            if ($request->has('data_fim') && $request->data_fim != '') {
                $data_fim = strlen($request->data_fim) == 10 ? $request->data_fim . ' 23:59:59' : $request->data_fim;
                $q->where('data_intervencao', '<=', $data_fim);
            }
            $q->with('user');
        }])->get();

        foreach ($boias as $boia) {
            $q = \App\Models\Leitura::where('boia_id', $boia->id)
                ->join('tipos_sensor', 'leituras.tipo_sensor_id', '=', 'tipos_sensor.id')
                ->select(
                    'tipos_sensor.nome as sensor',
                    'tipos_sensor.unidade as unidade',
                    \Illuminate\Support\Facades\DB::raw('MIN(CAST(valor AS DECIMAL)) as minimo'),
                    \Illuminate\Support\Facades\DB::raw('MAX(CAST(valor AS DECIMAL)) as maximo'),
                    \Illuminate\Support\Facades\DB::raw('AVG(CAST(valor AS DECIMAL)) as media'),
                    \Illuminate\Support\Facades\DB::raw('COUNT(valor) as total_leituras')
                )
                ->groupBy('tipos_sensor.nome', 'tipos_sensor.unidade');
                
            if ($request->has('data_inicio') && $request->data_inicio != '') {
                $q->where('data_hora', '>=', $request->data_inicio);
            }
            if ($request->has('data_fim') && $request->data_fim != '') {
                $data_fim = strlen($request->data_fim) == 10 ? $request->data_fim . ' 23:59:59' : $request->data_fim;
                $q->where('data_hora', '<=', $data_fim);
            }
            
            $boia->resumo_estatistico = $q->get();
        }

        $data = [
            'titulo' => 'Relatório Técnico de Monitorização - HidroBox',
            'data_emissao' => now()->format('d/m/Y H:i'),
            'emissor' => $user->name,
            'boias' => $boias,
            'data_inicio' => $request->data_inicio,
            'data_fim' => $request->data_fim
        ];

        $pdf = Pdf::loadView('pdf.relatorio_sensores', $data);
        return $pdf->download('relatorio_hidrobox.pdf');
    }
}
