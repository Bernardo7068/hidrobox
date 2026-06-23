import React, { useState, useEffect } from 'react';
import CartoesEstado from './CartoesEstado';
import TabelaAlertas from './TabelaAlertas';
import Tooltip from './Tooltip';
import HelpPin from './HelpPin';
import api from '../api';

export default function VisaoGeral({ boias = [], alertas = [], setAbaAtiva, isHelpMode }) {
  const [zonas, setZonas] = useState([]);
  const boiasPendentes = boias.filter(b => b.estado === 'pendente');
  
  // Deteta boias já adicionadas mas com configuração VLE ou sensores por terminar na Agenda Técnica
  const boiasIncompletas = boias.filter(b => {
    if (b.estado === 'pendente') return false;
    return (b.limites || []).some(lim => !lim.is_configurado || lim.valor_minimo == null || lim.valor_maximo == null);
  });

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
    <div className="max-w-7xl mx-auto space-y-12 pb-12 animate-fade-in relative">
      {isHelpMode && <HelpPin text="🎯 Estado da Rede: Este é o teu ecrã principal. Dá-te um resumo de como estão todos os aparelhos e avisa logo se algo estiver errado." className="absolute top-4 right-4" position="left" />}
      
      {/* Alerta de Descoberta de Hardware (Boias Pendentes) */}
      {boiasPendentes.length > 0 && (
        <section className="mx-4 bg-amber-50 border-2 border-amber-200 p-6 rounded-[2rem] shadow-lg shadow-amber-200/20 flex flex-col md:flex-row items-center justify-between gap-6 animate-bounce-slow relative">
          {isHelpMode && <HelpPin text="⚠️ Novo Aparelho: O sistema detetou uma nova boia a enviar dados, mas ainda não foi configurada. Clica no botão para a adicionares à tua lista." className="absolute -top-3 -left-3" position="right" />}
          <div className="flex items-center gap-5">
            <Tooltip text="Aparelho detetado pelo Ponto de Rede">
                <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-amber-500/40 cursor-help">
                🛰️
                </div>
            </Tooltip>
            <div>
              <h3 className="text-xl font-black text-amber-900 uppercase tracking-tight">Nova Boia Detetada!</h3>
              <p className="text-amber-700 font-bold text-xs uppercase tracking-widest mt-1">
                Existe um aparelho ativo com o endereço: <span className="font-black text-amber-950 underline">{boiasPendentes[0].mac_boia}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={() => setAbaAtiva('equipamentos')}
            className="bg-amber-950 text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-black transition-colors shadow-xl"
          >
            Configurar Aparelho
          </button>
        </section>
      )}

      {/* Alerta Discreto de Configurações Pendentes (VLE / Sensores) */}
      {boiasIncompletas.length > 0 && (
        <section className="mx-4 bg-white border border-slate-200 px-6 py-3 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3 text-slate-500">
            <span className="text-lg">⚙️</span>
            <p className="text-xs font-bold uppercase tracking-widest">
              Existem {boiasIncompletas.length} equipamentos com calibrações de sensores ou <span className="font-black text-slate-800">valores VLE pendentes</span>.
            </p>
          </div>
          <button 
            onClick={() => setAbaAtiva('equipamentos')} 
            className="text-[10px] font-black text-slate-400 bg-slate-50 px-4 py-2 rounded-lg uppercase tracking-widest hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            Ver na Agenda Técnica ➔
          </button>
        </section>
      )}

      {/* Resumo de Rede Direto e Prático */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-4">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight mb-2">Resumo do Dia</h2>
          <p className="text-slate-400 font-bold uppercase text-xs tracking-[0.3em] ml-1">Estado das Estações HidroBox</p>
        </div>
        <div className="flex gap-4 relative">
            {isHelpMode && <HelpPin text="Indica que a aplicação está ligada à base de dados central." className="absolute -top-2 -right-2" position="left" />}
            <Tooltip text="Ligação ativa com a API Central">
                <div className="bg-emerald-50 px-6 py-3 rounded-2xl border border-emerald-100 flex items-center gap-3 shadow-sm cursor-help">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                    <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">Ligação Sincronizada</span>
                </div>
            </Tooltip>
        </div>
      </section>

      {/* Estatísticas Macro (Refactorizadas para serem úteis) */}
      <div className="relative">
        {isHelpMode && <HelpPin text="👉 Dados Rápidos: Vê quantas boias estão ligadas, quantos avisos tens e a saúde geral do rio." className="absolute -top-2 -left-2" position="right" />}
        <CartoesEstado boias={boias} alertas={alertas} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        
        {/* Coluna de Alertas e Notificações (Foco na Ação) */}
        <div className="xl:col-span-1 space-y-6 relative">
          {isHelpMode && <HelpPin text="🚨 Avisos Urgentes: Aqui aparecem os problemas que precisam da tua atenção imediata." className="absolute top-2 -left-2" position="right" />}
          <div className="flex items-center gap-3 ml-4">
            <Tooltip text="Eventos que requerem atenção imediata" position="right">
                <span className="text-xl cursor-help">🚨</span>
            </Tooltip>
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
                    <Tooltip text={`Identificador da Zona: ${zona.nome}`} position="right">
                        <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black shadow-lg group-hover:bg-blue-600 transition-colors cursor-help">
                        {zona.nome.charAt(0)}
                        </div>
                    </Tooltip>
                    {alertasNaZona.length > 0 && (
                      <Tooltip text="Existem problemas nesta zona!">
                        <span className="bg-rose-500 text-white text-xs font-black px-3 py-1 rounded-full animate-pulse cursor-help">
                            {alertasNaZona.length} ALERTAS
                        </span>
                      </Tooltip>
                    )}
                  </div>
                  
                  <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">{zona.nome}</h4>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{zona.concelho}</p>
                  
                  <div className="mt-8 pt-6 border-t border-slate-50 flex justify-between items-center">
                    <Tooltip text="Número total de boias instaladas aqui">
                        <div className="flex flex-col cursor-help">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-tighter">Hardware Ativo</span>
                            <span className="text-lg font-black text-slate-700">{boiasNaZona.length} Unidades</span>
                        </div>
                    </Tooltip>
                    <Tooltip text="Saúde geral da água nesta zona" position="left">
                        <div className="flex flex-col text-right cursor-help">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-tighter">Estado Médio</span>
                            <span className={`text-lg font-black ${alertasNaZona.length > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                {alertasNaZona.length > 0 ? 'Atenção' : 'Nominal'}
                            </span>
                        </div>
                    </Tooltip>
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
