export default function BottomNav({ abaAtiva, setAbaAtiva, setIsSidebarOpen }) {
  const navItems = [
    { id: 'visao-geral', icon: '📊', label: 'Estado' },
    { id: 'mapa', icon: '🌍', label: 'Mapa' },
    { id: 'equipamentos', icon: '⚙️', label: 'Gestão' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md border-t border-slate-200 flex justify-around items-center pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] px-2 z-40 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.05)]">
      {navItems.map(item => (
        <button 
          key={item.id}
          onClick={() => setAbaAtiva(item.id)}
          className={`flex flex-col items-center justify-center p-2 min-w-[70px] rounded-xl transition-all duration-300 ${
            abaAtiva === item.id 
              ? 'text-blue-600 scale-110 -translate-y-1' 
              : 'text-slate-400 hover:text-slate-600 active:scale-95'
          }`}
        >
          <span className="text-2xl drop-shadow-sm mb-1">{item.icon}</span>
          <span className="text-[10px] font-black uppercase tracking-tight">{item.label}</span>
          {abaAtiva === item.id && (
            <div className="absolute -bottom-1 w-1 h-1 bg-blue-600 rounded-full"></div>
          )}
        </button>
      ))}

      {/* Botão Menu (Abre a Sidebar) */}
      <button 
        onClick={() => setIsSidebarOpen(true)}
        className="flex flex-col items-center justify-center p-2 min-w-[70px] rounded-xl text-slate-400 hover:text-slate-600 active:scale-95 transition-all"
      >
        <div className="w-8 h-8 flex items-center justify-center mb-1">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </div>
        <span className="text-[10px] font-black uppercase tracking-tight">Menu</span>
      </button>
    </nav>
  );
}
