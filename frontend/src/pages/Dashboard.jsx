import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import VisaoGeral from '../components/VisaoGeral';
import GestaoEquipamentos from '../components/gestaoEquipamentos';
import PainelSuperAdmin from '../components/PainelSuperAdmin';
import PainelAdminEmpresa from '../components/PainelAdminEmpresa';

export default function Dashboard({ onLogout }) {
  // Estado que controla que página estamos a ver (por defeito: 'visao-geral')
  const [abaAtiva, setAbaAtiva] = useState('visao-geral');

  // Obter utilizador real do localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{"role": "leitor_empresa", "name": "Utilizador"}'); 

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      <Sidebar setAbaAtiva={setAbaAtiva} abaAtiva={abaAtiva} role={user.role} onLogout={onLogout} />

      <div className="flex-1 flex flex-col h-screen">
        <Header titulo={abaAtiva} userName={user.name} />

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {/* O "Router" manual que troca os ecrãs */}
          {abaAtiva === 'visao-geral' && <VisaoGeral />}
          {abaAtiva === 'equipamentos' && <GestaoEquipamentos />}

          {abaAtiva === 'mapa' && (
            <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 h-full flex flex-col items-center justify-center text-center">
               <div className="text-6xl mb-6">🌍</div>
               <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Exploração Geográfica</h2>
               <p className="text-slate-400 max-w-md">O mapa global de ativos está a ser processado. Utilize a Visão Geral para ver o mapa por zona.</p>
            </div>
          )}

          {abaAtiva === 'super-admin' && user.role === 'super_admin' && <PainelSuperAdmin />}
          {abaAtiva === 'admin-empresa' && (user.role === 'admin_empresa' || user.role === 'super_admin') && <PainelAdminEmpresa />}
        </main>
      </div>
    </div>
  );
}