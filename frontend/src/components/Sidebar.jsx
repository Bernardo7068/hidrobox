export default function Sidebar({ setAbaAtiva, abaAtiva, role }) {
  // Uma pequena ajuda para não repetir muito código nas cores dos botões
  const baseClass = "block p-3 rounded-lg transition font-medium cursor-pointer flex items-center gap-3";
  const activeClass = "bg-blue-800 text-white";
  const inactiveClass = "text-blue-200 hover:bg-blue-800 hover:text-white";

  return (
    <aside className="w-64 bg-blue-900 text-white flex flex-col h-full shadow-xl z-20">
      {/* Logotipo */}
      <div className="p-6 border-b border-blue-800 flex items-center justify-center">
        <h1 className="text-2xl font-extrabold tracking-wider">
          Hidro<span className="text-blue-400">Box</span>
        </h1>
      </div>

      {/* Navegação */}
      <nav className="flex-1 p-4 space-y-2">
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

        {/* Se o utilizador for admin, mostramos este botão extra */}
        {role === 'admin' && (
          <div 
            onClick={() => setAbaAtiva('admin')}
            className={`${baseClass} ${abaAtiva === 'admin' ? activeClass : inactiveClass}`}
          >
            <span>🏢</span> Painel Admin
          </div>
        )}
      </nav>

      {/* Rodapé */}
      <div className="p-4 border-t border-blue-800 text-sm text-blue-400 text-center">
        v1.0 - Modo SaaS
      </div>
    </aside>
  );
}