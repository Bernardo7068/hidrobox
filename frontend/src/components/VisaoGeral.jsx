import { useState, useEffect } from 'react';
import api from '../api';
import CartoesEstado from '../components/CartoesEstado';
import MapaBoias from '../components/MapaBoias';
import TabelaAlertas from '../components/TabelaAlertas';

export default function VisaoGeral() {
  const [boias, setBoias] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Polling em tempo real sincronizado com os disparos do ESP32
  useEffect(() => {
    obterDadosPainel();
    const intervalo = setInterval(obterDadosPainel, 4000);

    return () => clearInterval(intervalo);
  }, []);

  const obterDadosPainel = async () => {
    try {
      // 1. Puxa a lista de todas as boias
      const resBoias = await api.get('/boias');
      
      // 2. Vai buscar os detalhes ricos (com o array de .leituras que ativámos no Laravel) de cada boia
      const boiasComLeituras = await Promise.all(
        resBoias.data.map(async (boia) => {
          try {
            const detalhe = await api.get(`/boias/${boia.id}`);
            return detalhe.data;
          } catch (e) {
            return boia; // Fallback se a rota individual falhar
          }
        })
      );

      // 3. Puxa os alertas gerados pelo sistema
      const resAlertas = await api.get('/alertas');

      setBoias(boiasComLeituras);
      setAlertas(resAlertas.data || []);
      setCarregando(false);
    } catch (error) {
      console.error("Erro ao atualizar o painel geral:", error);
    }
  };

  if (carregando) {
    return (
      <div className="flex justify-center items-center h-64 text-slate-500 font-medium text-sm">
        <span className="animate-pulse">🔄 A estabelecer ligação às estações do Rio Lis...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Estatísticas Rápidas (Ecrã de cima) 
        Passamos as boias e alertas reais para calcular cartões dinâmicos 
      */}
      <CartoesEstado boias={boias} alertas={alertas} />

      {/* Grelha de baixo (Mapa à esquerda, Alertas à direita) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* O Mapa ocupa 2 colunas no ecrã grande e recebe as coordenadas e telemetria atual das boias */}
        <div className="xl:col-span-2">
          <MapaBoias boias={boias} />
        </div>

        {/* Os Alertas ocupam 1 coluna e mostram as últimas ocorrências da BD */}
        <div className="xl:col-span-1">
          <TabelaAlertas alertas={alertas} onAtualizar={obterDadosPainel} />
        </div>

      </div>
    </div>
  );
}