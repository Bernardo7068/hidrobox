import { useState, useEffect } from 'react';

export default function CartoesEstado({ boias = [], alertas = [] }) {
  const [stats, setStats] = useState({ ativas: 0, alertas: 0, saude: 0 });

  useEffect(() => {
    const totalBoias = boias.length;
    const boiasAtivas = boias.filter(b => b.estado === 'ativa').length;
    const alertasPendentes = alertas.filter(a => !a.resolvido).length;
    
    // Cálculo de Saúde: % de boias sem alertas críticos e que NÃO estejam marcadas com erro
    const boiasComProblemas = new Set([
      ...alertas.filter(a => !a.resolvido).map(a => a.boia_id),
      ...boias.filter(b => b.estado === 'erro').map(b => b.id)
    ]);
    
    const saudeRede = totalBoias > 0 
      ? Math.round(((totalBoias - boiasComProblemas.size) / totalBoias) * 100) 
      : 100;

    setStats({
      ativas: boiasAtivas,
      alertas: alertasPendentes,
      saude: saudeRede
    });
  }, [boias, alertas]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
      <StatCard 
        title="Disponibilidade" 
        value={`${stats.ativas} / ${boias.length}`} 
        description="Estações em funcionamento nominal"
        color="blue" 
        icon="📡" 
      />
      <StatCard 
        title="Incidentes" 
        value={stats.alertas} 
        description="Eventos a aguardar resolução"
        color="rose" 
        icon="🚨" 
      />
      <StatCard 
        title="Integridade" 
        value={`${stats.saude}%`} 
        description="Saúde global da rede de sensores"
        color="emerald" 
        icon="🛡️" 
      />
    </div>
  );
}

function StatCard({ title, value, description, color, icon }) {
  const colors = {
    blue: "from-blue-600 to-indigo-700 shadow-blue-200",
    rose: "from-rose-500 to-rose-700 shadow-rose-200",
    emerald: "from-emerald-500 to-teal-700 shadow-emerald-200"
  };

  return (
    <div className={`relative bg-gradient-to-br ${colors[color]} p-8 rounded-[2.5rem] shadow-2xl text-white overflow-hidden group hover:scale-[1.03] transition-all duration-500`}>
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <span className="text-4xl bg-white/20 p-4 rounded-3xl backdrop-blur-md border border-white/10">{icon}</span>
        </div>
        <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em] mb-2">{title}</p>
        <p className="text-5xl font-black mb-3 tracking-tighter">{value}</p>
        <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest italic">{description}</p>
      </div>
      
      {/* Decorativo de fundo */}
      <div className="absolute right-[-5%] bottom-[-5%] text-[12rem] opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700 pointer-events-none">
        {icon}
      </div>
    </div>
  );
}