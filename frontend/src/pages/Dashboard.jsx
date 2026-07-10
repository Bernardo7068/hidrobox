import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import VisaoGeral from '../components/VisaoGeral';
import GestaoEquipamentos from '../components/GestaoEquipamentos.jsx';
import MapaEstacoes from '../components/MapaEstacoes';
import Estatisticas from './Estatisticas';
import PainelSuperAdmin from '../components/PainelSuperAdmin';
import PainelAdminEmpresa from '../components/PainelAdminEmpresa';
import GuiaUtilizador from '../components/GuiaUtilizador';
import GuiaInterativo from '../components/GuiaInterativo';
import HelpPin from '../components/HelpPin';
import api from '../api';
import { io } from 'socket.io-client';

export default function Dashboard({ onLogout, user, setUser }) {
  // O utilizador agora é injetado diretamente pelo App.jsx (reativo)
  
  const [abaAtiva, setAbaAtiva] = useState(() => sessionStorage.getItem('abaAtiva') || 'guia');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    sessionStorage.setItem('abaAtiva', abaAtiva);
  }, [abaAtiva]);
  const [boias, setBoias] = useState([]);
  const [gateways, setGateways] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [isHelpMode, setIsHelpMode] = useState(false);
  const [mostrarTour, setMostrarTour] = useState(false);

  const passosTutorial = [
    {
      target: '#sidebar-guia',
      title: 'Bem-vindo à HidroBox!',
      content: 'Este é o teu ponto de partida. Aqui podes sempre rever como funciona todo o sistema.',
      onBefore: () => setAbaAtiva('guia')
    },
    {
      target: '#sidebar-visao-geral',
      title: 'Estado da Rede',
      content: 'Neste menu podes ver um resumo rápido de todas as tuas boias e se existem alertas críticos para resolver.',
      onBefore: () => setAbaAtiva('visao-geral')
    },
    {
      target: '#sidebar-mapa',
      title: 'Mapa das Estações',
      content: 'Localiza as tuas boias no rio em tempo real e vê os dados clicando diretamente nos ícones.',
      onBefore: () => setAbaAtiva('mapa')
    },
    {
      target: '#sidebar-estatisticas',
      title: 'Histórico e Relatórios',
      content: 'Analisa a evolução da qualidade da água através de gráficos detalhados e gera relatórios de auditoria.',
      onBefore: () => setAbaAtiva('estatisticas')
    },
    {
      target: '#sidebar-equipamentos',
      title: 'Gestão de Dispositivos',
      content: 'Aqui podes adicionar novas boias e pontos de rede (gateways), além de configurar os limites de segurança de cada sensor.',
      onBefore: () => setAbaAtiva('equipamentos')
    },
    {
      target: '#aba-monitorizacao',
      title: 'Monitorização em Tempo Real',
      content: 'Vê o estado atual de cada boia, incluindo o nível de bateria e a força do sinal LoRa.',
      onBefore: () => setAbaAtiva('equipamentos')
    },
    (user.role === 'admin_empresa' || user.role === 'super_admin' || user.role === 'tecnico_empresa') ? {
      target: '#aba-novo-registo',
      title: 'Registar Novo Aparelho',
      content: 'Usa este formulário passo-a-passo para adicionar uma nova boia ao sistema e configurar os seus sensores iniciais.',
      onBefore: () => setAbaAtiva('equipamentos')
    } : null,
    {
      target: '#aba-hub-rede',
      title: 'Hub de Rede (Antenas)',
      content: 'Gere os teus Pontos de Rede (Gateways). Lembra-te: as boias precisam de estar dentro do raio de alcance destas antenas!',
      onBefore: () => setAbaAtiva('equipamentos')
    },
    (user.role === 'admin_empresa' || user.role === 'super_admin' || user.role === 'tecnico_empresa') ? {
      target: '#aba-agenda-tecnica',
      title: 'Agenda de Manutenção',
      content: 'Vigia a saúde física do teu hardware e sabe exatamente quando é necessário ir ao rio limpar ou calibrar os sensores.',
      onBefore: () => setAbaAtiva('equipamentos')
    } : null,
    user.role === 'admin_empresa' || user.role === 'super_admin' ? {
      target: user.role === 'super_admin' ? '#sidebar-super-admin' : '#sidebar-admin-empresa',
      title: 'Gestão de Pessoas',
      content: 'Como administrador, podes adicionar colegas à equipa e definir quem pode apenas ler ou quem pode configurar o sistema.',
      onBefore: () => setAbaAtiva(user.role === 'super_admin' ? 'super-admin' : 'admin-empresa')
    } : null,
    user.role === 'super_admin' ? {
      target: '#btn-aba-entidades',
      title: 'Gestão de Entidades',
      content: 'Aqui geres as organizações (clientes) que utilizam o HidroBox. Podes adicionar novos Hubs de negócio.',
      onBefore: () => setAbaAtiva('super-admin')
    } : null,
    user.role === 'super_admin' ? {
      target: '#btn-aba-utilizadores',
      title: 'Controlo de Acessos',
      content: 'Gere todas as contas de utilizador do sistema, independentemente da empresa a que pertencem.',
      onBefore: () => setAbaAtiva('super-admin')
    } : null,
    user.role === 'super_admin' ? {
      target: '#btn-aba-metricas',
      title: 'Configuração de Métricas',
      content: 'Define que tipos de dados o HidroBox pode medir (ex: pH, Oxigénio). Estas métricas ficam disponíveis para todas as boias.',
      onBefore: () => setAbaAtiva('super-admin')
    } : null,
    {
      target: '#ajuda-contextual-btn',
      title: 'Ajuda em Qualquer Lado',
      content: 'Se tiveres dúvidas, este botão ativa balões explicativos sobre o que estás a ver no momento!',
      onBefore: () => {}
    }
  ].filter(Boolean);
  // Centralização de dados para evitar redundância e prop-drilling excessivo
  const carregarDadosGlobais = async () => {
    try {
      const [resBoias, resAlertas, resGateways] = await Promise.all([
        api.get('/boias'),
        api.get('/alertas'),
        api.get('/gateways')
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
      setGateways(resGateways.data || []);
      setAlertas(resAlertas.data || []);
      setCarregando(false);
    } catch (e) {
      console.error("Erro ao sincronizar dashboard:", e);
    }
  };

  useEffect(() => {
    carregarDadosGlobais();
    
    // Polling de segurança (fallback caso WebSockets falhem)
    const timer = setInterval(() => {
      carregarDadosGlobais();
    }, 30000);
    
    // 1. Inicializar a ligação ao servidor WebSocket
    const hostname = window.location.hostname;
    const wsUrl = import.meta.env.VITE_WS_URL || `http://${hostname}:3001`;
    const socket = io(wsUrl);

    socket.on('connect', () => {
      console.log('[Dashboard] Ligado ao WebSocket em tempo real:', socket.id);
      if (user.role === 'super_admin') {
        socket.emit('join-company', 'super_admin');
      } else if (user.empresa_id) {
        socket.emit('join-company', user.empresa_id);
      }
    });

    // 2. Ouvir eventos em tempo real para atualizar o ecrã
    socket.on('nova-leitura', (data) => {
      console.log('🌊 Nova leitura recebida (Tempo Real):', data);
      carregarDadosGlobais();
    });

    socket.on('novo-alerta', (data) => {
      console.log('⚠️ Novo alerta recebido (Tempo Real):', data);
      carregarDadosGlobais();
    });

    socket.on('perfil-atualizado', (data) => {
      const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
      if (String(data.user_id) === String(currentUser.id)) {
        console.log('🔄 O teu perfil foi alterado por um administrador. A atualizar...');
        api.get('/me')
          .then(res => {
            if (res.data && res.data.user) {
                const updatedUser = res.data.user;
                sessionStorage.setItem('user', JSON.stringify(updatedUser));
                setUser(updatedUser);
                // Se o utilizador perdeu acesso à aba atual (ex: super-admin), redimensionamos
                if (updatedUser.role === 'leitor_empresa' || updatedUser.role === 'tecnico_empresa') {
                    setAbaAtiva('visao-geral');
                }
            }
          })
          .catch(() => onLogout()); // Se foi desativado/removido, força o logout
      }
    });
    
    return () => {
      clearInterval(timer);
      socket.disconnect();
    };
  }, []);

  if (carregando) {
    return (
      <div className="h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-black uppercase tracking-[0.3em] text-xs animate-pulse">A ligar ao centro de controlo...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden text-slate-900">
      <Sidebar setAbaAtiva={setAbaAtiva} abaAtiva={abaAtiva} role={user.role} onLogout={onLogout} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

      {mostrarTour && (
        <GuiaInterativo 
          steps={passosTutorial} 
          onComplete={() => setMostrarTour(false)} 
        />
      )}

      <div className="flex-1 flex flex-col h-screen min-w-0 relative">
        <Header titulo={abaAtiva} userName={user.name} setIsSidebarOpen={setIsSidebarOpen} />

        <main className="flex-1 overflow-y-auto p-4 md:p-12">
          {abaAtiva === 'guia' && <GuiaUtilizador setAbaAtiva={setAbaAtiva} onStartTour={() => setMostrarTour(true)} />}
          {abaAtiva === 'visao-geral' && <VisaoGeral boias={boias} alertas={alertas} gateways={gateways} setAbaAtiva={setAbaAtiva} isHelpMode={isHelpMode} onAtualizar={carregarDadosGlobais} />}
          
          {abaAtiva === 'mapa' && (
            <MapaEstacoes boias={boias} gateways={gateways} isHelpMode={isHelpMode} />
          )}

          {abaAtiva === 'equipamentos' && <GestaoEquipamentos isHelpMode={isHelpMode} onAtualizar={carregarDadosGlobais} />}
          {abaAtiva === 'estatisticas' && <Estatisticas isHelpMode={isHelpMode} />}
          {abaAtiva === 'super-admin' && user.role === 'super_admin' && (
            <PainelSuperAdmin onAbaChange={setAbaAtiva} isHelpMode={isHelpMode} />
          )}
          {abaAtiva === 'admin-empresa' && (user.role === 'admin_empresa' || user.role === 'super_admin') && <PainelAdminEmpresa isHelpMode={isHelpMode} />}
        </main>

        {/* Toggle de Modo Ajuda Global (Movido para baixo) */}
        <div className="absolute bottom-8 right-8 z-[9999]">
          <button 
            id="ajuda-contextual-btn"
            onClick={() => setIsHelpMode(!isHelpMode)}
            className={`flex items-center gap-2 px-6 py-4 rounded-full font-black text-sm uppercase tracking-widest transition-all shadow-2xl border-2 ${
              isHelpMode 
                ? 'bg-amber-400 text-amber-950 border-amber-400 shadow-amber-400/50 animate-pulse scale-105' 
                : 'bg-slate-900 text-white border-slate-700 hover:border-amber-400 hover:text-amber-400 hover:bg-slate-800'
            }`}
          >
            <span className="text-xl">{isHelpMode ? '💡' : '❔'}</span>
            <span className="hidden md:inline">{isHelpMode ? 'Modo Ajuda Ativo' : 'Ajuda Contextual'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
