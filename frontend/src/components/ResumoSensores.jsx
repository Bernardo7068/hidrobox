import React from 'react';

export default function ResumoSensores({ boias }) {
  // Função para pegar a leitura mais recente de cada tipo de sensor para uma boia
  const getUltimasLeituras = (boia) => {
    if (!boia.leituras || boia.leituras.length === 0) return [];
    
    // Agrupar por tipo_sensor_id e pegar a mais recente
    const ultimas = {};
    boia.leituras.forEach(l => {
      if (!ultimas[l.tipo_sensor_id] || new Date(l.created_at) > new Date(ultimas[l.tipo_sensor_id].created_at)) {
        ultimas[l.tipo_sensor_id] = l;
      }
    });
    return Object.values(ultimas);
  };

  const getSensorInfo = (tipoId) => {
    const info = {
      1: { nome: 'Oxigénio', icon: '🫧', unidade: 'mg/L', cor: 'text-blue-500' },
      2: { nome: 'pH', icon: '⚗️', unidade: 'pH', cor: 'text-purple-500' },
      3: { nome: 'Temperatura', icon: '🌡️', unidade: 'ºC', cor: 'text-orange-500' },
      4: { nome: 'Condutividade', icon: '⚡', unidade: 'µS/cm', cor: 'text-yellow-500' },
      5: { nome: 'Turbidez', icon: '🌫️', unidade: 'NTU', cor: 'text-slate-500' },
      6: { nome: 'Salinidade', icon: '🧂', unidade: 'ppm', cor: 'text-cyan-500' },
    };
    return info[tipoId] || { nome: 'Sensor', icon: '📊', unidade: '', cor: 'text-slate-400' };
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <span className="p-2 bg-blue-100 rounded-xl text-blue-600">📡</span>
          Telemetria em Tempo Real
        </h2>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
          Atualizado agora
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {boias.map(boia => {
          const leituras = getUltimasLeituras(boia);
          
          return (
            <div key={boia.id} className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-slate-800">{boia.nome}</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    {boia.localizacao_texto || 'Margem do Rio Lis'}
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-100">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-tighter">Ativa</span>
                </div>
              </div>

              <div className="p-8">
                {/* Diagnóstico de Sinal (NOVO) */}
                <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📡</span>
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Qualidade do Sinal LoRa</span>
                      <span className={`text-sm font-black ${
                        !boia.rssi_ultimo ? 'text-slate-400' :
                        boia.rssi_ultimo > -90 ? 'text-emerald-500' :
                        boia.rssi_ultimo > -115 ? 'text-amber-500' : 'text-rose-500'
                      }`}>
                        {boia.rssi_ultimo ? `${boia.rssi_ultimo} dBm` : 'Sem sinal'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 items-end h-4">
                    {[1, 2, 3, 4, 5].map((bar) => {
                      const strength = boia.rssi_ultimo ? (boia.rssi_ultimo + 140) / 110 : 0; // Normaliza -140 a -30 para 0 a 1
                      const isActive = strength > (bar / 5);
                      return (
                        <div 
                          key={bar} 
                          className={`w-1.5 rounded-full transition-all ${
                            isActive 
                              ? (strength > 0.7 ? 'bg-emerald-500' : strength > 0.4 ? 'bg-amber-500' : 'bg-rose-500') 
                              : 'bg-slate-200'
                          }`}
                          style={{ height: `${bar * 20}%` }}
                        ></div>
                      );
                    })}
                  </div>
                </div>

                {leituras.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-400 text-sm font-medium italic">Sem leituras recentes para esta estação.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-6">
                    {leituras.map(leitura => {
                      const info = getSensorInfo(leitura.tipo_sensor_id);
                      return (
                        <div key={leitura.id} className="group relative flex flex-col p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-blue-200 hover:bg-white hover:shadow-lg transition-all duration-300">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">{info.icon}</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{info.nome}</span>
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className={`text-3xl font-black ${info.cor}`}>
                              {leitura.valor}
                            </span>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
                              {info.unidade}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <span className="text-sm">🔋</span>
                        <span className="text-xs font-bold text-slate-600">{boia.bateria}%</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-sm">🌡️</span>
                        <span className="text-xs font-bold text-slate-600">24ºC <span className="text-[10px] text-slate-400 font-medium">(Ext)</span></span>
                    </div>
                </div>
                <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-800 transition-colors">
                  Ver Histórico Completo →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
