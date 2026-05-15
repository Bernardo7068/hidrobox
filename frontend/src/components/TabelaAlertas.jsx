export default function TabelaAlertas() {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-lg font-bold mb-4 text-red-600">Últimos Alertas</h2>
      <ul className="divide-y divide-gray-200">
        <li className="py-3 flex justify-between items-center">
          <div>
            <p className="font-medium text-gray-800">Descida anormal de pH (4.2)</p>
            <p className="text-sm text-gray-500">Boia Ponte do Lis - Há 10 min</p>
          </div>
          <button className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm hover:bg-red-200">
            Resolver
          </button>
        </li>
      </ul>
    </div>
  );
}