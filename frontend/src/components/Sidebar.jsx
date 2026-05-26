export default function Sidebar({ setAbaAtiva, abaAtiva, role, onLogout }) {
  // Uma pequena ajuda para não repetir muito código nas cores dos botões
  const baseClass = "block p-3 rounded-lg transition font-medium cursor-pointer flex items-center gap-3";
  const activeClass = "bg-blue-800 text-white shadow-lg";
  const inactiveClass = "text-blue-200 hover:bg-blue-800 hover:text-white";

  const isAdmin = role === 'admin_empresa' || role === 'super_admin';

  return (
    <aside className="w-64 bg-blue-900 text-white flex flex-col h-full shadow-xl z-20">
      {/* Logotipo */}
      <div className="p-8 border-b border-blue-800 flex flex-col items-center justify-center">
        <h1 className="text-2xl font-extrabold tracking-wider">
          Hidro<span className="text-blue-400">Box</span>
        </h1>
        <div className="mt-2 bg-blue-800/50 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-blue-300">
           {role.replace('_', ' ')}
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 p-4 space-y-2 mt-4">
        <div 
          onClick={() => setAbaAtiva('visao-geral')}
          className={`${baseClass} ${abaAtiva === 'visao-geral' ? activeClass : inactiveClass}`}
        >
          <span>📊</span> Visão Geral
        </div>
        
        <div 
          onClick={() => setAbaAtiva('mapa')}
          className={`${baseClass} ${abaAtiva === 'mapa' ? activeClass : inactiveClass}`}
        >
          <span>🌍</span> Mapa Interativo
        </div>

        <div 
          onClick={() => setAbaAtiva('equipamentos')}
          className={`${baseClass} ${abaAtiva === 'equipamentos' ? activeClass : inactiveClass}`}
        >
          <span>⚙️</span> Gestão Equipamentos
        </div>

        {/* [RBAC] Links Dinâmicos por Perfil */}
        {role === 'super_admin' && (
          <div 
            onClick={() => setAbaAtiva('super-admin')}
            className={`${baseClass} ${abaAtiva === 'super-admin' ? activeClass : inactiveClass}`}
          >
            <span>👑</span> Gestão de Clientes
          </div>
        )}

        {(role === 'admin_empresa' || role === 'super_admin') && (
          <div 
            onClick={() => setAbaAtiva('admin-empresa')}
            className={`${baseClass} ${abaAtiva === 'admin-empresa' ? activeClass : inactiveClass}`}
          >
            <span>👥</span> Gestão de Equipa
          </div>
        )}
      </nav>

      {/* Rodapé e Logout */}
      <div className="p-4 border-t border-blue-800 space-y-4 bg-slate-900/20">
        <button 
            onClick={onLogout}
            className="w-full bg-rose-600 hover:bg-rose-700 text-white p-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg"
        >
            🚪 Sair do Sistema
        </button>
        <div className="text-[10px] text-blue-400/50 font-bold text-center uppercase tracking-tighter">
            v1.2.0 • Estável
        </div>
      </div>
    </aside>
  );
}