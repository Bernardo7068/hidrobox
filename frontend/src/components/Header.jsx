export default function Header({ titulo, userName }) {
  const getDisplayTitle = (id) => {
    const titles = {
      'guia': 'Guia do Sistema',
      'visao-geral': 'Estado da Rede',
      'mapa': 'Mapa das Estações',
      'estatisticas': 'Histórico e Dados',
      'equipamentos': 'Gestão de Aparelhos',
      'super-admin': 'Administração Geral',
      'admin-empresa': 'Gestão de Equipa'
    };
    return titles[id] || id.replace('-', ' ');
  };

  return (
    <header className="bg-white/80 backdrop-blur-md px-10 py-6 flex justify-between items-center z-20 sticky top-0 border-b border-slate-100">
      <div className="flex items-center gap-4">
        <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse"></div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">
          {getDisplayTitle(titulo)}
        </h2>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-black text-slate-800 uppercase tracking-tighter leading-none">{userName}</p>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 opacity-60">Utilizador Ligado</p>
        </div>
        <div className="relative group">
            <div className="h-12 w-12 bg-gradient-to-tr from-blue-700 to-indigo-800 border-4 border-white rounded-2xl flex items-center justify-center text-white font-black shadow-xl group-hover:rotate-6 transition-transform">
            {userName?.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
        </div>
      </div>
    </header>
  );
}