export default function Sidebar({ setAbaAtiva, abaAtiva, role, onLogout }) {
  const baseClass = "group relative block p-4 rounded-2xl transition-all duration-300 font-bold cursor-pointer flex items-center gap-4 border-2 border-transparent";
  const activeClass = "bg-white text-blue-900 shadow-xl shadow-blue-900/20 border-blue-200 scale-[1.02]";
  const inactiveClass = "text-blue-100 hover:bg-blue-800/50 hover:border-blue-700/50";

  const menuItems = [
    { id: 'visao-geral', label: 'Resumo Operacional', icon: '📊', desc: 'Saúde da Rede e Alertas' },
    { id: 'mapa', label: 'Mapa de Ativos', icon: '🌍', desc: 'Localização Geográfica' },
    { id: 'equipamentos', label: 'Gestão Técnica', icon: '⚙️', desc: 'Hardware e Manutenção' },
  ];

  if (role === 'super_admin') {
    menuItems.push({ id: 'super-admin', label: 'Clientes', icon: '👑', desc: 'Gestão Multi-Empresa' });
  }

  if (role === 'admin_empresa' || role === 'super_admin') {
    menuItems.push({ id: 'admin-empresa', label: 'Equipa', icon: '👥', desc: 'Gestão de Utilizadores' });
  }

  return (
    <aside className="w-72 bg-blue-900 text-white flex flex-col h-screen shadow-2xl z-30 relative overflow-hidden">
      {/* Efeito de Gradiente no fundo da Sidebar */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-blue-800/50 to-transparent pointer-events-none"></div>

      {/* Logotipo */}
      <div className="p-10 border-b border-blue-800 relative z-10 flex flex-col items-center">
        <div className="bg-white p-3 rounded-2xl shadow-lg mb-4">
            <span className="text-3xl">🌊</span>
        </div>
        <h1 className="text-2xl font-black tracking-tighter">
          Hidro<span className="text-blue-400">Box</span>
        </h1>
        <div className="mt-3 bg-blue-400/20 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-blue-300 border border-blue-400/30">
           {role.replace('_', ' ')}
        </div>
      </div>

      {/* Navegação Principal */}
      <nav className="flex-1 p-6 space-y-4 mt-4 relative z-10 overflow-y-auto">
        <p className="text-[10px] font-black text-blue-400/50 uppercase tracking-[0.3em] mb-6 px-2">Menu de Navegação</p>
        
        {menuItems.map(item => (
          <div 
            key={item.id}
            onClick={() => setAbaAtiva(item.id)}
            className={`${baseClass} ${abaAtiva === item.id ? activeClass : inactiveClass}`}
          >
            <span className="text-2xl">{item.icon}</span>
            <div className="flex flex-col">
                <span className="leading-none">{item.label}</span>
                <span className={`text-[10px] mt-1 font-medium ${abaAtiva === item.id ? 'text-blue-600' : 'text-blue-300/60'}`}>
                    {item.desc}
                </span>
            </div>
            {abaAtiva === item.id && (
                <div className="absolute right-4 w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
            )}
          </div>
        ))}
      </nav>

      {/* Rodapé e Logout */}
      <div className="p-6 border-t border-blue-800 relative z-10 bg-slate-900/40">
        <button 
            onClick={onLogout}
            className="w-full bg-rose-600 hover:bg-rose-700 text-white p-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg shadow-rose-900/20 active:scale-95"
        >
            🚪 Sair do Sistema
        </button>
        <div className="mt-6 flex flex-col items-center opacity-40">
            <div className="text-[9px] font-black uppercase tracking-widest">Protocolo Lis v1.2.0</div>
            <div className="w-12 h-1 bg-blue-400/30 rounded-full mt-2"></div>
        </div>
      </div>
    </aside>
  );
}