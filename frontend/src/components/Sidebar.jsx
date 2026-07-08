import Tooltip from './Tooltip';

export default function Sidebar({ setAbaAtiva, abaAtiva, role, onLogout, isSidebarOpen, setIsSidebarOpen }) {
  const baseClass = "group relative block p-4 rounded-2xl transition-all duration-300 font-bold cursor-pointer flex items-center justify-center md:justify-start md:px-6 gap-4 border-2 border-transparent";
  const activeClass = "bg-white text-blue-900 shadow-xl shadow-blue-900/20 border-blue-200 scale-[1.02]";
  const inactiveClass = "text-blue-100 hover:bg-blue-800/50 hover:border-blue-700/50";

  const menuItems = [
    { id: 'guia', label: 'Guia do Sistema', icon: '📖', desc: 'Aprender a usar o HidroBox' },
    { id: 'visao-geral', label: 'Estado da Rede', icon: '📊', desc: 'Resumo e Alertas Atuais' },
    { id: 'mapa', label: 'Mapa das Estações', icon: '🌍', desc: 'Localização no Rio' },
    { id: 'estatisticas', label: 'Histórico e Dados', icon: '📈', desc: 'Análise da Qualidade' },
    { id: 'equipamentos', label: 'Gestão de Equipamentos', icon: '⚙️', desc: 'Boias e Configurações' },
  ];

  if (role === 'super_admin') {
    menuItems.push({ id: 'super-admin', label: 'Administração', icon: '👑', desc: 'Empresas e Utilizadores' });
  } else if (role === 'admin_empresa') {
    menuItems.push({ id: 'admin-empresa', label: 'Gestão de Equipa', icon: '👥', desc: 'Membros da Unidade' });
  }

  return (
    <>
      {/* Overlay escuro no mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 md:hidden transition-opacity" 
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      <aside className={`fixed md:relative top-0 left-0 w-72 bg-blue-900 text-white flex flex-col h-screen shadow-2xl z-40 overflow-hidden transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        {/* Efeito de Gradiente no fundo da Sidebar */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-blue-800/50 to-transparent pointer-events-none"></div>

        {/* Botão de fechar mobile */}
        <button 
          onClick={() => setIsSidebarOpen(false)}
          className="md:hidden absolute top-6 right-6 text-white/50 hover:text-white z-50 text-2xl"
        >
          ✕
        </button>

        {/* Logotipo */}
      <div className="p-10 border-b border-blue-800 relative z-10 flex flex-col items-center">
        <div className="mb-4 flex items-center justify-center overflow-visible">
            <img src="/logo_hidrobox1.png" alt="HidroBox Logo" className="h-16 w-auto object-contain drop-shadow-lg" />
        </div>
        <h1 className="text-2xl font-black tracking-tighter">
          Hidro<span className="text-blue-400">Box</span>
        </h1>
        <div className="mt-3 bg-blue-400/20 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-blue-300 border border-blue-400/30">
           {role === 'super_admin' ? 'Administrador Geral' : role === 'admin_empresa' ? 'Gestor de Equipa' : role === 'tecnico_empresa' ? 'Técnico de Campo' : 'Observador / Leitor'}
        </div>
      </div>

      {/* Navegação Principal */}
      <nav className="flex-1 p-6 space-y-4 mt-4 relative z-10 overflow-y-auto overflow-x-hidden">
        <p className="text-[10px] font-black text-blue-400/50 uppercase tracking-[0.3em] mb-6 px-2 text-center">Menu Principal</p>
        
        {menuItems.map(item => (
          <Tooltip key={item.id} text={item.desc} position="right" className="block w-full">
            <div 
              id={`sidebar-${item.id}`}
              onClick={() => {
                setAbaAtiva(item.id);
                setIsSidebarOpen(false); // Fecha no mobile ao clicar
              }}
              className={`${baseClass} ${abaAtiva === item.id ? activeClass : inactiveClass} w-full`}
            >
              <div className="flex items-center justify-center w-8">
                <span className="text-2xl">{item.icon}</span>
              </div>
              <div className="flex flex-col text-left w-36">
                  <span className="leading-none text-sm">{item.label}</span>
                  <span className={`text-[10px] mt-1 font-bold tracking-tight uppercase opacity-60 ${abaAtiva === item.id ? 'text-blue-600' : 'text-blue-300/80'}`}>
                      {item.id.replace('-', ' ')}
                  </span>
              </div>
              {abaAtiva === item.id && (
                  <div className="absolute right-4 w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
              )}
            </div>
          </Tooltip>
        ))}
      </nav>

      {/* Rodapé e Logout */}
      <div className="p-6 border-t border-blue-800 relative z-10 bg-slate-900/40">
        <Tooltip text="Encerrar a sessão e sair" position="top" className="block w-full">
            <button 
                onClick={onLogout}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white p-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg shadow-rose-900/20 active:scale-95"
            >
                🚪 Sair do Sistema
            </button>
        </Tooltip>
        <div className="mt-6 flex flex-col items-center opacity-40">
            <div className="text-[9px] font-black uppercase tracking-widest">Protocolo Lis v1.2.0</div>
            <div className="w-12 h-1 bg-blue-400/30 rounded-full mt-2"></div>
        </div>
      </div>
    </aside>
    </>
  );
}