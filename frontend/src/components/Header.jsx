export default function Header() {
  return (
    <header className="bg-white shadow-sm px-8 py-4 flex justify-between items-center z-10 relative">
      <h2 className="text-xl font-semibold text-gray-700">Dashboard de Monitorização</h2>
      
      <div className="flex items-center space-x-4">
        <div className="text-right">
          <p className="text-sm font-bold text-gray-700">SMAS Leiria</p>
          <p className="text-xs text-gray-500">Administrador de Zona</p>
        </div>
        <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow">
          S
        </div>
      </div>
    </header>
  );
}