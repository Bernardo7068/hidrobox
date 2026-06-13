<!DOCTYPE html>
<html>
<head>
    <title>{{ $titulo }}</title>
    <style>
        body { font-family: sans-serif; color: #333; }
        .header { text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; }
        .section { margin-top: 30px; }
        .boia-card { border: 1px solid #ddd; padding: 15px; border-radius: 10px; margin-bottom: 20px; }
        .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .table th, .table td { border: 1px solid #eee; padding: 8px; text-align: left; font-size: 12px; }
        .table th { background: #f8fafc; }
        .footer { position: fixed; bottom: 0; width: 100%; text-align: center; font-size: 10px; color: #999; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; background: #eee; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ $titulo }}</h1>
        <p>Emissor: {{ $emissor }} | Data: {{ $data_emissao }}</p>
    </div>

    @foreach($boias as $boia)
    <div class="section">
        <div class="boia-card">
            <h3 style="margin-top:0; color: #1e293b;">Estação: {{ $boia->nome }}</h3>
            <p style="font-size: 11px;">MAC: {{ $boia->mac_boia }} | Gateway: {{ $boia->mac_gateway }}</p>
            
            <h4>Últimas Leituras de Sensores</h4>
            <table class="table">
                <thead>
                    <tr>
                        <th>Sensor</th>
                        <th>Valor</th>
                        <th>Sinal (RSSI)</th>
                        <th>Data/Hora</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($boia->leituras as $leitura)
                    <tr>
                        <td>{{ $leitura->tipoSensor->nome }}</td>
                        <td>{{ $leitura->valor }} {{ $leitura->tipoSensor->unidade }}</td>
                        <td>{{ $leitura->rssi }} dBm</td>
                        <td>{{ $leitura->data_hora->format('d/m/Y H:i') }}</td>
                        <td>
                            @php
                                $lim = $boia->limites->where('tipo_sensor_id', $leitura->tipo_sensor_id)->first();
                                $fora = $lim && ($leitura->valor < $lim->valor_minimo || $leitura->valor > $lim->valor_maximo);
                            @endphp
                            <span style="color: {{ $fora ? 'red' : 'green' }}">
                                {{ $fora ? 'Alerta' : 'Nominal' }}
                            </span>
                        </td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    </div>
    @endforeach

    <div class="footer">
        Gerado automaticamente pelo Sistema HidroBox - Monitorização Inteligente de Águas
    </div>
</body>
</html>
