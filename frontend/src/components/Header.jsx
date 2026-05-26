export default function Header({ titulo, userName }) {
  return (
    <header className="bg-white shadow-sm px-8 py-4 flex justify-between items-center z-10 relative">
      <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter italic">
        {titulo.replace('-', ' ')}
      </h2>
      
      <div className="flex items-center space-x-4">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-black text-slate-700 uppercase">{userName}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sessão HidroBox Ativa</p>
        </div>
        <div className="h-10 w-10 bg-slate-900 border-2 border-slate-100 rounded-xl flex items-center justify-center text-white font-black shadow-lg">
          {userName?.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}