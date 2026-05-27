import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import VisaoGeral from '../components/VisaoGeral';
import GestaoEquipamentos from '../components/gestaoEquipamentos';
import MapaBoias from '../components/MapaBoias';
import PainelSuperAdmin from '../components/PainelSuperAdmin';
import PainelAdminEmpresa from '../components/PainelAdminEmpresa';
import api from '../api';

export default function Dashboard({ onLogout }) {
  const [abaAtiva, setAbaAtiva] = useState('visao-geral');
  const [boias, setBoias] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Obter utilizador real do localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{"role": "leitor_empresa", "name": "Utilizador"}'); 

  // Centralização de dados para evitar redundância e prop-drilling excessivo
  const carregarDadosGlobais = async () => {
    try {
      const [resBoias, resAlertas] = await Promise.all([
        api.get('/boias'),
        api.get('/alertas')
      ]);

      // Para o mapa e detalhes, precisamos das boias com as suas leituras
      const boiasRicas = await Promise.all(
        resBoias.data.map(async (b) => {
          try {
            const det = await api.get(`/boias/${b.id}`);
            return det.data;
          } catch { return b; }
        })
      );

      setBoias(boiasRicas);
      setAlertas(resAlertas.data || []);
      setCarregando(false);
    } catch (e) {
      console.error("Erro ao sincronizar dashboard:", e);
    }
  };

  useEffect(() => {
    carregarDadosGlobais();
    const intervalo = setInterval(carregarDadosGlobais, 8000);
    return () => clearInterval(intervalo);
  }, []);

  if (carregando) {
    return (
      <div className="h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-black uppercase tracking-[0.3em] text-xs animate-pulse">Iniciando Centro de Comando...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden text-slate-900">
      <Sidebar setAbaAtiva={setAbaAtiva} abaAtiva={abaAtiva} role={user.role} onLogout={onLogout} />

      <div className="flex-1 flex flex-col h-screen min-w-0">
        <Header titulo={abaAtiva} userName={user.name} />

        <main className="flex-1 overflow-y-auto p-6 md:p-12">
          {abaAtiva === 'visao-geral' && <VisaoGeral boias={boias} alertas={alertas} />}
          
          {abaAtiva === 'mapa' && (
            <div className="h-full flex flex-col space-y-6 animate-fade-in">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight">Geolocalização de Ativos</h2>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Exploração de rede em tempo real • Rio Lis</p>
                </div>
                <div className="flex gap-4">
                  <div className="bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 text-blue-600 text-[10px] font-black uppercase">
                    {boias.length} Estações Online
                  </div>
                </div>
              </div>
              <div className="flex-1 rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white relative">
                <MapaBoias boias={boias} />
              </div>
            </div>
          )}

          {abaAtiva === 'equipamentos' && <GestaoEquipamentos />}
          {abaAtiva === 'super-admin' && user.role === 'super_admin' && (
            <PainelSuperAdmin onAbaChange={setAbaAtiva} />
          )}
          {abaAtiva === 'admin-empresa' && (user.role === 'admin_empresa' || user.role === 'super_admin') && <PainelAdminEmpresa />}
        </main>
      </div>
    </div>
  );
}
