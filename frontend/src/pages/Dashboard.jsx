import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import VisaoGeral from '../components/VisaoGeral'; // O teu painel antigo com os cartões
import GestaoEquipamentos from '../components/gestaoEquipamentos';
// import MapaInterativo from './MapaInterativo';
// import PainelAdmin from './PainelAdmin';

export default function Dashboard() {
  // Estado que controla que página estamos a ver (por defeito: 'visao-geral')
  const [abaAtiva, setAbaAtiva] = useState('visao-geral');
  
  // Simulação do utilizador logado (Mais tarde virá da API)
  const user = { role: 'admin', nome: 'Administrador' }; 

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      <Sidebar setAbaAtiva={setAbaAtiva} abaAtiva={abaAtiva} role={user.role} />

      <div className="flex-1 flex flex-col h-screen">
        <Header titulo={abaAtiva} userName={user.nome} />
        
        <main className="flex-1 overflow-y-auto p-8">
          {/* O "Router" manual que troca os ecrãs */}
          {abaAtiva === 'visao-geral' && <VisaoGeral />}
          {abaAtiva === 'equipamentos' && <GestaoEquipamentos />}
          
          {abaAtiva === 'mapa' && (
            <div className="bg-white p-6 rounded-xl shadow h-full">
               <h2 className="text-xl font-bold mb-4">Mapa de Instalações</h2>
               <p className="text-gray-500">O mapa dinâmico com Leaflet vai entrar aqui...</p>
            </div>
          )}

          {abaAtiva === 'admin' && user.role === 'admin' && (
             <div className="bg-white p-6 rounded-xl shadow">
               <h2 className="text-xl font-bold mb-4">Visão Global de Clientes</h2>
               <p className="text-gray-500">Tabela com empresas, total de boias e filtros de zona...</p>
             </div>
          )}
        </main>
      </div>
    </div>
  );
}