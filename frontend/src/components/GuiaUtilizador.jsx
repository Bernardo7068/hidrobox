import React from 'react';
import Tooltip from './Tooltip';

const GuiaUtilizador = ({ onStartTour }) => {
  return (
    <div className="max-w-6xl mx-auto space-y-24 pb-32 animate-fade-in text-slate-800 font-sans">

      {/* 1. O QUE É O HIDROBOX? - Cabeçalho Impactante */}
      <section className="text-center space-y-10 pt-12">
        <div className="inline-block bg-blue-600 text-white px-12 py-4 rounded-full text-base font-black uppercase tracking-[0.4em] shadow-2xl shadow-blue-200">
          O Projeto HydroBox
        </div>

        <div className="space-y-6">
          <h1 className="text-7xl font-black tracking-tighter leading-[1.1]">
            Vigiar e Proteger a nossa <br/>
            <span className="text-blue-600">Água em Tempo Real.</span>
          </h1>
          <p className="text-2xl text-slate-500 max-w-4xl mx-auto leading-relaxed font-medium">
            O <strong>HydroBox</strong> é um ecossistema inteligente de deteção, análise e auxílio ao tratamento de água, 
            desenhado para garantir a saúde dos nossos rios e ecossistemas.
          </p>
          <div className="pt-6">
            <button 
                onClick={onStartTour}
                className="bg-slate-900 text-white px-12 py-5 rounded-3xl font-black text-sm uppercase tracking-[0.2em] hover:bg-blue-600 hover:scale-105 transition-all shadow-2xl shadow-blue-200 flex items-center gap-4 mx-auto"
            >
                <span>🚀</span> Iniciar Visita Guiada (Passo-a-Passo)
            </button>
          </div>
        </div>
        <div className="bg-white p-12 rounded-[4rem] shadow-2xl border border-slate-100 max-w-5xl mx-auto text-left space-y-10">
          <div className="space-y-6">
            <h3 className="text-3xl font-black text-blue-900 uppercase tracking-tighter border-b-4 border-blue-600 inline-block pb-2">Como funciona?</h3>
            <p className="text-xl text-slate-600 leading-relaxed">
              Imagine uma rede de pequenos computadores (os <strong>ESP32</strong>) que trabalham em conjunto para levar a informação do rio até si. 
              Este processo divide-se em três partes essenciais:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-4">
            {/* A Boia */}
            <Tooltip text="Hardware com modo de sono profundo (Deep Sleep)" position="bottom">
                <div className="space-y-4 bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 transition-transform hover:scale-105 cursor-help">
                <span className="text-5xl block mb-4">🛰️</span>
                <h4 className="font-black text-blue-900 uppercase text-sm tracking-widest">A Boia de Medição</h4>
                <p className="text-base text-slate-500 leading-relaxed">
                    Funciona a bateria e entra em <strong>sono profundo</strong> entre leituras para poupar energia, acordando apenas para reportar dados.
                </p>
                </div>
            </Tooltip>

            {/* O Ponto de Rede */}
            <Tooltip text="Hardware sempre ativo (Always-On)" position="bottom">
                <div className="space-y-4 bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-200 transition-transform hover:scale-105 cursor-help h-full">
                <span className="text-5xl block mb-4">🗼</span>
                <h4 className="font-black text-blue-100 uppercase text-sm tracking-widest">Ponto de Rede (Hub)</h4>
                <p className="text-base text-blue-50 leading-relaxed font-medium">
                    Está <strong>sempre ligado</strong> para receber as mensagens das boias a qualquer momento e enviá-las para a nossa API.
                </p>
                </div>
            </Tooltip>

            {/* A API */}
            <Tooltip text="Núcleo de processamento e base de dados" position="bottom">
                <div className="space-y-4 bg-slate-900 p-8 rounded-[2.5rem] text-white transition-transform hover:scale-105 cursor-help">
                <span className="text-5xl block mb-4">🧠</span>
                <h4 className="font-black text-blue-400 uppercase text-sm tracking-widest">A nossa API</h4>
                <p className="text-base text-slate-400 leading-relaxed">
                    É o cérebro do sistema. Ela recebe, guarda e processa os dados, permitindo que os veja organizados nesta aplicação.
                </p>
                </div>
            </Tooltip>
          </div>
        </div>
      </section>

      {/* 2. OS SENSORES - O "Laboratório" na Água */}
      <section className="space-y-12 px-4">
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-black uppercase tracking-tight">O que medimos na água?</h2>
          <p className="text-xl text-slate-500 font-medium">Cada boia está equipada com um conjunto de sensores de alta precisão:</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {[
            { n: 'Oxigénio Dissolvido', i: '🫧', d: 'Essencial para a vida aquática.', t: 'Mede o O2 disponível na água' },
            { n: 'pH (Acidez)', i: '⚗️', d: 'Equilíbrio químico da água.', t: 'Mede o nível de acidez ou alcalinidade' },
            { n: 'Condutividade', i: '⚡', d: 'Presença de sais e minerais.', t: 'Capacidade da água conduzir corrente' },
            { n: 'TDS (Sólidos)', i: '🧪', d: 'Quantidade de partículas.', t: 'Sólidos Totais Dissolvidos' },
            { n: 'Turbidez', i: '🌫️', d: 'Transparência da água.', t: 'Mede quão turva está a água' },
            { n: 'Temperatura', i: '🌡️', d: 'Fator crítico para o ecossistema.', t: 'Grau de calor da massa de água' }
          ].map((s, idx) => (
            <Tooltip key={idx} text={s.t}>
                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-lg text-center space-y-4 group hover:border-blue-500 transition-colors flex flex-col items-center justify-center cursor-help h-full">
                <div className="text-5xl group-hover:scale-110 transition-transform mb-2">{s.i}</div>
                <h5 className="font-black text-sm uppercase tracking-tighter text-slate-900 leading-tight">{s.n}</h5>
                <p className="text-xs text-slate-500 font-bold leading-relaxed">{s.d}</p>
                </div>
            </Tooltip>
          ))}
        </div>
      </section>

      {/* 3. O QUE VÊS EM CADA PÁGINA? */}
      <section className="space-y-16">
        <h2 className="text-3xl font-black text-center uppercase tracking-tighter">Explorar a Aplicação</h2>
        
        <div className="grid grid-cols-1 gap-12">
          
          {/* Dashboard */}
          <div className="bg-white rounded-[4rem] p-12 shadow-xl border border-slate-100 flex flex-col md:flex-row gap-16 items-center">
            <div className="text-7xl bg-blue-50 w-40 h-40 flex items-center justify-center rounded-[3rem] shrink-0 shadow-inner">📊</div>
            <div className="space-y-6">
              <h3 className="text-3xl font-black text-blue-900 uppercase tracking-tight">Estado da Rede (Página Inicial)</h3>
              <p className="text-xl text-slate-500 leading-relaxed font-medium">
                É o teu centro de controlo. Aqui vês o <strong>Resumo do Dia</strong>: quantas estações estão a funcionar e a lista de <strong>Avisos Urgentes</strong>. Se uma boia detetar poluição ou ficar sem bateria, aparece aqui um aviso imediato.
              </p>
            </div>
          </div>

          {/* Mapa */}
          <div className="bg-white rounded-[4rem] p-12 shadow-xl border border-slate-100 flex flex-col md:flex-row-reverse gap-16 items-center">
            <div className="text-7xl bg-emerald-50 w-40 h-40 flex items-center justify-center rounded-[3rem] shrink-0 shadow-inner">📍</div>
            <div className="space-y-6 text-right md:text-left">
              <h3 className="text-3xl font-black text-emerald-900 uppercase tracking-tight">Mapa das Estações</h3>
              <p className="text-xl text-slate-500 leading-relaxed font-medium">
                Aqui vês onde os aparelhos estão fisicamente no rio. Podes clicar em qualquer marcador para ver os dados exatos (pH, Oxigénio, etc.) daquele local sem ter de sair do mapa.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* 4. GESTÃO E MANUTENÇÃO */}
      <section className="bg-slate-900 rounded-[5rem] p-20 text-white overflow-hidden relative shadow-2xl">
        <div className="absolute bottom-0 right-0 w-[40rem] h-[40rem] bg-blue-600/10 rounded-full -mb-80 -mr-80 blur-[120px]"></div>
        
        <div className="relative z-10 space-y-16">
          <div className="text-center space-y-6">
            <h2 className="text-5xl font-black uppercase tracking-tight">Gestão de Aparelhos e Manutenção</h2>
            <p className="text-2xl text-slate-400 max-w-3xl mx-auto font-medium leading-relaxed">Onde a equipa técnica configura e vigia a saúde do hardware.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            <div className="space-y-10">
              <div className="bg-white/5 p-10 rounded-[3rem] border border-white/10">
                <h4 className="text-2xl font-black mb-6 flex items-center gap-4 text-blue-400">
                  <span>⚙️</span> Configuração Total
                </h4>
                <p className="text-lg text-slate-400 leading-relaxed">
                  Podes adicionar novas <strong>Boias</strong> e <strong>Pontos de Rede (Hubs)</strong>. Para cada boia, defines <strong>Limites de Segurança</strong>. Se a água sair desses valores, o sistema avisa-te.
                </p>
              </div>
              <div className="bg-white/5 p-10 rounded-[3rem] border border-white/10">
                <h4 className="text-2xl font-black mb-6 flex items-center gap-4 text-blue-400">
                  <span>🛠️</span> Agenda Técnica
                </h4>
                <p className="text-lg text-slate-400 leading-relaxed">
                  Gere as <strong>Revisões</strong>. O HydroBox avisa quando está na hora de ir ao rio fazer a manutenção de rotina ou limpar os sensores para garantir que os dados são corretos.
                </p>
              </div>
            </div>

            <div className="space-y-10">
              <div className="bg-white/5 p-10 rounded-[3rem] border border-white/10">
                <h4 className="text-2xl font-black mb-6 flex items-center gap-4 text-rose-400">
                  <span>⚠️</span> Falhas e Avisos
                </h4>
                <p className="text-lg text-slate-400 leading-relaxed">
                  Deteta automaticamente falhas: bateria fraca, perda de sinal ou sensores avariados. Tudo fica registado para saberes exatamente o que precisa de reparação.
                </p>
              </div>
              <div className="bg-amber-500/10 p-10 rounded-[3rem] border border-amber-500/20 border-dashed">
                <h4 className="text-2xl font-black text-amber-400 mb-6 flex items-center gap-4">
                  <span>👥</span> Gestão de Equipa
                </h4>
                <p className="text-lg text-slate-300 leading-relaxed">
                  Para os administradores: adiciona colegas, escolhe quem pode mudar configurações e quem pode apenas ler os dados. Tudo centralizado no menu de Administração.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RODAPÉ FINAL */}
      <div className="text-center pt-16 border-t border-slate-200">
        <div className="flex justify-center gap-12 mb-8 text-xl">
           <div className="flex flex-col items-center">
             <span className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Tecnologia</span>
             <span className="font-bold text-slate-800">ESP32 + LoRa</span>
           </div>
           <div className="w-px h-12 bg-slate-200"></div>
           <div className="flex flex-col items-center">
             <span className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Processamento</span>
             <span className="font-bold text-slate-800">HydroBox API</span>
           </div>
        </div>
        <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.5em]">
          Preservar o futuro através da tecnologia sustentável
        </p>
      </div>

    </div>
  );
};

export default GuiaUtilizador;
