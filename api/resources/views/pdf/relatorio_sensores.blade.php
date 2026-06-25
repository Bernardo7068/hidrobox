<!DOCTYPE html>
<html>
<head>
    <title>{{ $titulo }}</title>
    <style>
        @page {
            margin: 40px 50px;
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #334155;
            margin: 0;
            padding: 0;
            font-size: 12px;
        }
        .header {
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 20px;
            margin-bottom: 30px;
            text-align: center;
        }
        .header h1 {
            color: #1e293b;
            margin: 0;
            font-size: 24px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .header p {
            margin: 5px 0 0 0;
            color: #64748b;
            font-size: 11px;
        }
        .info-grid {
            width: 100%;
            margin-bottom: 30px;
            border-collapse: collapse;
        }
        .info-grid td {
            width: 50%;
            vertical-align: top;
        }
        .info-box {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 15px;
            margin: 5px;
        }
        .info-box h4 {
            margin: 0 0 10px 0;
            color: #3b82f6;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 1px;
        }
        .info-item {
            margin-bottom: 5px;
        }
        .info-label {
            font-weight: bold;
            color: #475569;
        }
        .section {
            margin-top: 30px;
            page-break-inside: avoid;
        }
        .boia-header {
            background-color: #1e293b;
            color: #ffffff;
            padding: 12px 15px;
            border-radius: 6px 6px 0 0;
        }
        .boia-header h3 {
            margin: 0;
            font-size: 14px;
        }
        .boia-header p {
            margin: 4px 0 0 0;
            font-size: 10px;
            color: #94a3b8;
        }
        .table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #e2e8f0;
            border-top: none;
        }
        .table th, .table td {
            border: 1px solid #e2e8f0;
            padding: 10px 15px;
            text-align: left;
            font-size: 11px;
        }
        .table th {
            background-color: #f1f5f9;
            color: #475569;
            text-transform: uppercase;
            font-size: 9px;
            letter-spacing: 0.5px;
        }
        .table tr:nth-child(even) {
            background-color: #f8fafc;
        }
        .status-nominal {
            color: #10b981;
            font-weight: bold;
        }
        .status-alerta {
            color: #ef4444;
            font-weight: bold;
        }
        .footer {
            position: fixed;
            bottom: -20px;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 9px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            padding-top: 10px;
        }
        .no-data {
            text-align: center;
            padding: 20px;
            color: #64748b;
            font-style: italic;
            border: 1px solid #e2e8f0;
            border-top: none;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ $titulo }}</h1>
        <p>Documento Oficial Gerado por Sistema de Monitorização</p>
    </div>

    <table class="info-grid">
        <tr>
            <td>
                <div class="info-box">
                    <h4>Informações Gerais</h4>
                    <div class="info-item"><span class="info-label">Emissor:</span> {{ $emissor }}</div>
                    <div class="info-item"><span class="info-label">Data de Emissão:</span> {{ $data_emissao }}</div>
                    <div class="info-item"><span class="info-label">Período Analisado:</span> 
                        @if($data_inicio || $data_fim)
                            {{ $data_inicio ? date('d/m/Y', strtotime($data_inicio)) : 'Início' }} a {{ $data_fim ? date('d/m/Y', strtotime($data_fim)) : 'Hoje' }}
                        @else
                            Todo o histórico (Últimos registos)
                        @endif
                    </div>
                </div>
            </td>
            <td>
                <div class="info-box">
                    <h4>Entidade e Rede</h4>
                    @php
                        $primeiraBoia = $boias->first();
                    @endphp
                    @if($primeiraBoia && $primeiraBoia->zona && $primeiraBoia->zona->empresa)
                        <div class="info-item"><span class="info-label">Entidade Gestora:</span> {{ $primeiraBoia->zona->empresa->nome }}</div>
                        <div class="info-item"><span class="info-label">Nº de Estações no Relatório:</span> {{ $boias->count() }}</div>
                        <div class="info-item"><span class="info-label">Zona(s):</span> {{ $boias->pluck('zona.nome')->unique()->implode(', ') }}</div>
                    @else
                        <div class="info-item"><span class="info-label">Rede:</span> Análise Global</div>
                        <div class="info-item"><span class="info-label">Nº de Estações:</span> {{ $boias->count() }}</div>
                    @endif
                </div>
            </td>
        </tr>
    </table>

    @if($boias->isEmpty())
        <div class="section" style="text-align: center; color: #64748b; padding: 40px; border: 1px dashed #cbd5e1; border-radius: 8px;">
            <h3>Nenhuma estação ou leitura encontrada para os filtros selecionados.</h3>
        </div>
    @endif

    @foreach($boias as $boia)
    <div class="section">
        <div class="boia-header">
            <h3>Estação de Monitorização: {{ $boia->nome }}</h3>
            <p>
                @if($boia->zona) Zona: {{ $boia->zona->nome }} | @endif
                MAC: {{ $boia->mac_boia }} | Localização: {{ $boia->localizacao_texto ?? ($boia->latitude . ', ' . $boia->longitude) }}
            </p>
        </div>
        
        @if($boia->resumo_estatistico && $boia->resumo_estatistico->isNotEmpty())
            <div style="margin: 15px 0 5px 0;">
                <h4 style="color: #3b82f6; margin: 0 0 8px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Resumo Estatístico Global (Período Selecionado)</h4>
                <table class="table" style="margin-bottom: 20px;">
                    <thead>
                        <tr>
                            <th>Sensor</th>
                            <th>Valor Mínimo</th>
                            <th>Valor Máximo</th>
                            <th>Valor Médio</th>
                            <th>Nº Leituras</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($boia->resumo_estatistico as $resumo)
                        <tr>
                            <td><strong>{{ $resumo->sensor }}</strong></td>
                            <td>{{ number_format($resumo->minimo, 2) }} <span style="color: #64748b;">{{ $resumo->unidade }}</span></td>
                            <td>{{ number_format($resumo->maximo, 2) }} <span style="color: #64748b;">{{ $resumo->unidade }}</span></td>
                            <td><strong>{{ number_format($resumo->media, 2) }}</strong> <span style="color: #64748b;">{{ $resumo->unidade }}</span></td>
                            <td>{{ $resumo->total_leituras }}</td>
                        </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        @endif

        @if($boia->manutencoes && $boia->manutencoes->isNotEmpty())
            <div style="margin: 15px 0 5px 0;">
                <h4 style="color: #3b82f6; margin: 0 0 8px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Histórico de Manutenções</h4>
                <table class="table" style="margin-bottom: 20px;">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Técnico Responsável</th>
                            <th>Tipo de Intervenção</th>
                            <th>Descrição / Observações</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($boia->manutencoes as $manut)
                        <tr>
                            <td>{{ date('d/m/Y', strtotime($manut->data_intervencao)) }}</td>
                            <td>{{ $manut->user ? $manut->user->name : 'N/A' }}</td>
                            <td><strong>{{ $manut->tipo ?? 'Manutenção' }}</strong></td>
                            <td>
                                <div>{{ $manut->observacoes }}</div>
                                @if($manut->checklist && is_array($manut->checklist) && count(array_filter($manut->checklist)) > 0)
                                    @php
                                        $checklistLabels = [
                                            'casco' => 'Casco Limpo (Algas)',
                                            'sensores' => 'Sensores Lavados',
                                            'vedacao' => 'Vedações Estanques',
                                            'antena' => 'Antena LoRa OK',
                                            'calib' => 'Calibração Efetuada',
                                            'valida' => 'Valores Validados',
                                            'eletrodo' => 'Elétrodo Limpo',
                                            'bateria' => 'Verificação/Troca de Bateria',
                                            'peca' => 'Componente Trocado',
                                            'agua' => 'Teste de Água OK',
                                            'envio' => 'Teste de Envio OK'
                                        ];
                                    @endphp
                                    <div style="margin-top: 5px; padding-top: 5px; border-top: 1px dotted #cbd5e1;">
                                        <span style="font-size: 9px; color: #64748b; text-transform: uppercase;">Checklist:</span>
                                        <ul style="margin: 3px 0 0 0; padding-left: 15px; font-size: 10px; color: #475569;">
                                            @foreach($manut->checklist as $key => $value)
                                                @if($value)
                                                    <li>- {{ $checklistLabels[$key] ?? ucfirst($key) }}</li>
                                                @endif
                                            @endforeach
                                        </ul>
                                    </div>
                                @endif
                            </td>
                        </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        @endif

        <div style="margin: 15px 0 5px 0;">
            @php
                $total_disponivel = $boia->resumo_estatistico ? $boia->resumo_estatistico->max('total_leituras') : 0;
                $mostrados = $boia->leituras->count();
            @endphp
            <h4 style="color: #3b82f6; margin: 0 0 8px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">
                Últimos Registos Individuais 
                @if($total_disponivel > 0)
                    <span style="color: #64748b; text-transform: none; font-weight: normal;">(Mostrando {{ $mostrados }} de {{ $total_disponivel }} leituras)</span>
                @endif
            </h4>
            
            @if($boia->leituras->isEmpty())
                <div class="no-data">Nenhum registo de leitura encontrado para o período selecionado.</div>
            @else
                <table class="table">
                    <thead>
                        <tr>
                            <th>Data / Hora</th>
                            <th>Sensor</th>
                            <th>Valor Registado</th>
                            <th>Força do Sinal (RSSI)</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($boia->leituras as $leitura)
                        <tr>
                            <td>{{ $leitura->data_hora->format('d/m/Y H:i:s') }}</td>
                            <td>{{ $leitura->tipoSensor->nome }}</td>
                            <td><strong>{{ $leitura->valor }}</strong> <span style="color: #64748b;">{{ $leitura->tipoSensor->unidade }}</span></td>
                            <td>{{ $leitura->rssi }} dBm</td>
                            <td>
                                @php
                                    $lim = $boia->limites->where('tipo_sensor_id', $leitura->tipo_sensor_id)->first();
                                    $fora = $lim && ($leitura->valor < $lim->valor_minimo || $leitura->valor > $lim->valor_maximo);
                                @endphp
                                @if($fora)
                                    <span class="status-alerta">[!] Fora dos Limites ({{ $lim->valor_minimo }} - {{ $lim->valor_maximo }})</span>
                                @else
                                    <span class="status-nominal">[OK] Estável</span>
                                @endif
                            </td>
                        </tr>
                        @endforeach
                    </tbody>
                </table>
            @endif
        </div>
    </div>
    @endforeach

    <div class="footer">
        Relatório Técnico Gerado por Sistema HidroBox &copy; {{ date('Y') }} | Monitorização Contínua de Qualidade de Águas
    </div>
</body>
</html>
