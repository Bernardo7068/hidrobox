import { useState, useEffect } from 'react';
import CartoesEstado from '../components/CartoesEstado';
import TabelaAlertas from '../components/TabelaAlertas';
import api from '../api';

export default function VisaoGeral({ boias = [], alertas = [] }) {
  const [zonas, setZonas] = useState([]);

  useEffect(() => {
    const carregarZonas = async () => {
      try {
        const res = await api.get('/zonas');
        setZonas(res.data);
      } catch (e) { console.error(e); }
    };
    carregarZonas();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-12 animate-fade-in">
      
      {/* Resumo de Rede Direto e Prático */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-4">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight mb-2">Resumo Operacional</h2>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] ml-1">Estado Global da Infraestrutura HidroBox</p>
        </div>
        <div className="flex gap-4">
            <div className="bg-emerald-50 px-6 py-3 rounded-2xl border border-emerald-100 flex items-center gap-3 shadow-sm">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Motor IoT Sincronizado</span>
            </div>
        </div>
      </section>

      {/* Estatísticas Macro (Refactorizadas para serem úteis) */}
      <CartoesEstado boias={boias} alertas={alertas} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        
        {/* Coluna de Alertas e Notificações (Foco na Ação) */}
        <div className="xl:col-span-1 space-y-6">
          <div className="flex items-center gap-3 ml-4">
            <span className="text-xl">🚨</span>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Eventos Críticos</h3>
          </div>
          <TabelaAlertas alertas={alertas} />
        </div>

        {/* Coluna de Contexto por Zona (Nova visão estratégica) */}
        <div className="xl:col-span-2 space-y-6">
          <div className="flex items-center gap-3 ml-4">
            <span className="text-xl">🏙️</span>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Distribuição por Zonas Ativas</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {zonas.map(zona => {
              const boiasNaZona = boias.filter(b => b.zona_id === zona.id);
              const alertasNaZona = alertas.filter(a => boiasNaZona.some(b => b.id === a.boia_id) && !a.resolvido);
              
              return (
                <div key={zona.id} className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 group hover:border-blue-200 transition-all">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black shadow-lg group-hover:bg-blue-600 transition-colors">
                      {zona.nome.charAt(0)}
                    </div>
                    {alertasNaZona.length > 0 && (
                      <span className="bg-rose-500 text-white text-[10px] font-black px-3 py-1 rounded-full animate-pulse">
                        {alertasNaZona.length} ALERTAS
                      </span>
                    )}
                  </div>
                  
                  <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">{zona.nome}</h4>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{zona.concelho}</p>
                  
                  <div className="mt-8 pt-6 border-t border-slate-50 flex justify-between items-center">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Hardware Ativo</span>
                        <span className="text-lg font-black text-slate-700">{boiasNaZona.length} Unidades</span>
                    </div>
                    <div className="flex flex-col text-right">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Estado Médio</span>
                        <span className={`text-lg font-black ${alertasNaZona.length > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {alertasNaZona.length > 0 ? 'Atenção' : 'Nominal'}
                        </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
