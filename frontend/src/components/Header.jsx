export default function Header({ titulo, userName, setIsSidebarOpen }) {
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
    <header className="bg-white/80 backdrop-blur-md px-6 md:px-10 py-4 md:py-6 flex justify-between items-center z-20 sticky top-0 border-b border-slate-100 shadow-sm md:shadow-none">
      <div className="flex items-center gap-3 md:gap-4">
        {/* Botão Hamburger (Mobile) */}
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="md:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg focus:outline-none"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse hidden md:block"></div>
        <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight line-clamp-1">
          {getDisplayTitle(titulo)}
        </h2>
      </div>
      
      <div className="flex items-center gap-4 md:gap-6">
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