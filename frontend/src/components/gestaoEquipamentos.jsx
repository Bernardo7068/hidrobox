import React, { useState, useEffect } from 'react';
import api from '../api';
import { io } from 'socket.io-client';
import Tooltip from './Tooltip';
import HelpPin from './HelpPin';
import { MapContainer, TileLayer, Marker, Circle, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix para os ícones do Leaflet
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // metres
    const phi1 = lat1 * Math.PI/180;
    const phi2 = lat2 * Math.PI/180;
    const deltaPhi = (lat2-lat1) * Math.PI/180;
    const deltaLambda = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // in metres
};

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Ícone de Torre de Gateway Premium
const towerIcon = L.divIcon({
    html: `
        <div class="relative flex flex-col items-center cursor-pointer group">
            <div class="absolute w-16 h-16 bg-blue-500 rounded-full animate-ping opacity-20 -top-2"></div>
            <div class="w-12 h-12 bg-slate-900 border-4 border-blue-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/40 z-10 group-hover:bg-blue-900 transition-colors">
                <span class="text-2xl text-white">📡</span>
            </div>
            <div class="w-1.5 h-8 bg-slate-900 z-0"></div>
            <div class="w-5 h-2 bg-slate-900 rounded-full z-0"></div>
        </div>
    `,
    className: 'bg-transparent border-none',
    iconSize: [48, 68],
    iconAnchor: [24, 68]
});

// Componente para controlar o centro do mapa programaticamente
function MapController({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center) map.setView(center, map.getZoom());
    }, [center, map]);
    return null;
}

// Componente interno para capturar o clique no mapa
function LocationMarker({ position, setPosition }) {
    useMapEvents({
        click(e) {
            setPosition(e.latlng);
        },
    });

    return position === null ? null : (
        <Marker position={position}></Marker>
    );
}

// Funções Utilitárias de Data (Fora do Componente para evitar erros de hoisting)
const calculateNextMaintenance = (lastDate, days) => {
    if (!lastDate || !days) return 'Não agendada';
    const date = new Date(lastDate);
    date.setDate(date.getDate() + parseInt(days));
    return date.toLocaleDateString('pt-PT');
};

const getMaintenanceProgress = (lastDate, days) => {
    if (!lastDate || !days) return 0;
    const start = new Date(lastDate).getTime();
    const now = new Date().getTime();
    const end = start + (parseInt(days) * 24 * 60 * 60 * 1000);
    const progress = ((now - start) / (end - start)) * 100;
    return Math.min(Math.max(progress, 0), 100);
};

const isOverdue = (lastDate, days) => {
    if (!lastDate || !days) return false;
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + parseInt(days));
    return nextDate < new Date();
};

export default function GestaoEquipamentos({ isHelpMode, onAtualizar }) {
    // Simulação de obtenção do utilizador do sessionStorage (ou contexto)
    const user = JSON.parse(sessionStorage.getItem('user') || '{"role": "leitor_empresa"}');
    const isSuperAdmin = user.role === 'super_admin';
    const isAdmin = user.role === 'admin_empresa' || isSuperAdmin;
    const isTecnico = user.role === 'tecnico_empresa';
    const isLeitor = user.role === 'leitor_empresa';

    const [subAba, setSubAba] = useState(() => sessionStorage.getItem('subAba') || 'inventario');

    useEffect(() => {
        sessionStorage.setItem('subAba', subAba);
    }, [subAba]);

    const [zonas, setZonas] = useState([]);
    const [boias, setBoias] = useState([]);
    const [gateways, setGateways] = useState([]);
    const [tiposSensor, setTiposSensor] = useState([]);

    const boiasPendentes = boias.filter(b => b.estado === 'pendente');
    const gatewaysPendentes = gateways.filter(gw => gw.estado === 'pendente');
    const todasBoiasDisponiveis = boias.filter(b => b.estado === 'pendente' || b.estado === 'ativa');

    // Função para verificar se o gateway perdeu comunicação
    const isGatewayOffline = (gw) => {
        if (gw.estado === 'pendente' || !gw.updated_at) return false;
        
        const minhasBoias = boias.filter(b => b.mac_gateway === gw.mac_gateway);
        // Vai buscar os intervalos de deepsleep (em segundos) definidos nas boias
        const intervalos = minhasBoias.map(b => b.intervalo_segundos).filter(val => val != null && val > 0);
        // Usa o menor intervalo. Se não houver boias, assume fallback de 1 hora.
        const menorIntervalo = intervalos.length > 0 ? Math.min(...intervalos) : 3600;
        
        // Adiciona uma margem de segurança para atrasos de rede ou tempo real de boot (mínimo 5 minutos)
        const margemSeguranca = Math.max(300, menorIntervalo * 0.1); 
        const timeoutSeconds = menorIntervalo + margemSeguranca;

        const ultimaVez = new Date(gw.updated_at);
        const diffSeconds = (new Date() - ultimaVez) / 1000;
        
        return diffSeconds > timeoutSeconds;
    };

    // Novo estado para criação de gateway
    const [formGateway, setFormGateway] = useState({ mac_gateway: '', nome: '', latitude: '', longitude: '', raio_cobertura: 1000, gatewayOwner: 'public' });
    // Estado para edição de gateway
    const [editandoGatewayId, setEditandoGatewayId] = useState(null);
    const [formEditGateway, setFormEditGateway] = useState({ gatewayOwner: 'public' });

    // Estados para Gestão de Zonas
    const [isModalZonasOpen, setIsModalZonasOpen] = useState(false);
    const [formNovaZona, setFormNovaZona] = useState({ nome: '', concelho: '' });
    const [editandoZonaId, setEditandoZonaId] = useState(null);
    const [formEditZona, setFormEditZona] = useState({ nome: '', concelho: '' });
    const [empresas, setEmpresas] = useState([]);

    // Lógica para calcular missões pendentes (necessária para o badge da aba)
    const getMissionsCount = () => {
        let count = 0;
        boias.forEach(boia => {
            (boia.limites || []).forEach(lim => {
                if (lim.is_configurado === false || lim.is_configurado === 0) count++;
                if (lim.is_configurado && isOverdue(lim.ultima_manutencao, lim.dias_proxima_manutencao)) count++;
            });
            if (boia.ultima_manutencao && isOverdue(boia.ultima_manutencao, 15)) count++;
            if (boia.bateria < 20) count++;
        });
        return count;
    };
    const totalMissoes = getMissionsCount();

    // Estado para controlar o Painel Lateral de Ficha Técnica
    const [boiaDetalhe, setBoiaDetalhe] = useState(null);
    const [editandoBoia, setEditandoBoia] = useState(false);
    const [adicionandoSensor, setAdicionandoSensor] = useState(false);
    const [formEditBoia, setFormEditBoia] = useState({});
    const [limitesEditando, setLimitesEditando] = useState({});
    const [tick, setTick] = useState(0);

    // ESTADOS PARA O RELATÓRIO DE MANUTENÇÃO
    const [mostrarModalManutencao, setMostrarTourManutencao] = useState(false);
    const [formManutencao, setFormRelatorioManutencao] = useState({
        tipo: 'limpeza',
        observacoes: '',
        estado_geral: 'bom',
        checklist: { casco: true, sensores: true, vedacao: true, antena: true }
    });

    const handleSubmeterManutencao = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/boias/${boiaDetalhe.id}/manutencao`, {
                ...formManutencao,
                data_intervencao: new Date().toISOString()
            });
            setMostrarTourManutencao(false);
            setMensagem({ texto: 'Relatório de manutenção registado!', tipo: 'sucesso' });
            carregarDadosIniciais();
            if (boiaDetalhe) {
                const res = await api.get(`/boias/${boiaDetalhe.id}`);
                setBoiaDetalhe(res.data);
            }
        } catch (err) {
            setMensagem({ texto: 'Erro ao registar relatório.', tipo: 'erro' });
        }
    };

    // Estado do Formulário da Boia (Criação do zero)
    const [formBoia, setFormBoia] = useState({
        mac_boia: '', mac_gateway: '', nome: '', zona_id: '', latitude: '', longitude: '', localizacao_texto: '', intervalo_segundos: 300
    });

    // Estado dos Sensores para Nova Instalação
    const [sensoresForm, setSensoresForm] = useState([
        { tipo_sensor_id: '', valor_minimo: '', valor_maximo: '' }
    ]);

    // Estado para a Calibração de Sensores (Contextual)
    const [manutencao, setManutencao] = useState({
        boia_id: '',
        tipo_sensor_id: '',
        valor_minimo: '',
        valor_maximo: '',
        dias_proxima_manutencao: 180
    });

    const [mensagem, setMensagem] = useState({ texto: '', tipo: '' });

    // Sincronizar mapa com Gateway selecionado no Novo Registo
    const [centroMapaNova, setCentroMapaNova] = useState([39.7436, -8.8071]);

    useEffect(() => {
        if (formBoia.mac_gateway) {
            const selectedGw = gateways.find(gw => gw.mac_gateway === formBoia.mac_gateway);
            if (selectedGw && selectedGw.latitude && selectedGw.longitude) {
                setCentroMapaNova([selectedGw.latitude, selectedGw.longitude]);
            }
        }
    }, [formBoia.mac_gateway, gateways]);

    // Scroll automático para o formulário de calibração quando aberto
    useEffect(() => {
        if (adicionandoSensor) {
            setTimeout(() => {
                const element = document.getElementById('sensor-config-form');
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        }
    }, [adicionandoSensor]);

    // Estado para controlar a expansão das boias na Agenda Técnica
    const [agendaExpandida, setAgendaExpandida] = useState({});
    const [configurandoCiclos, setConfigurandoCiclos] = useState(null);
    const [ciclosEditando, setCiclosEditando] = useState({});

    const toggleAgendaBoia = (id) => {
        setAgendaExpandida(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleLogManutencaoGeral = async (boiaId) => {
        try {
            const now = new Date().toISOString();
            await api.put(`/boias/${boiaId}`, {
                ultima_manutencao: now
            });
            mostrarMensagem('Manutenção ambiental registada!', 'sucesso');
            
            // Atualizar detalhe local se estiver aberto
            if (boiaDetalhe?.id === boiaId) {
                setBoiaDetalhe(prev => ({ ...prev, ultima_manutencao: now }));
            }
            carregarDadosIniciais();
        } catch (error) {
            mostrarMensagem('Erro ao registar manutenção.', 'erro');
        }
    };

    // Removida lógica antiga de pollingTimeMs

    useEffect(() => { 
        carregarDadosIniciais(); 
        
        const hostname = window.location.hostname;
        const wsUrl = import.meta.env.VITE_WS_URL || `http://${hostname}:3001`;
        const socket = io(wsUrl);

        socket.on('connect', () => {
            if (user.role === 'super_admin') {
                socket.emit('join-company', 'super_admin');
            } else if (user.empresa_id) {
                socket.emit('join-company', user.empresa_id);
            }
        });

        socket.on('nova-leitura', () => {
            carregarDadosIniciais();
        });

        socket.on('novo-alerta', () => {
            carregarDadosIniciais();
        });

        return () => {
            socket.disconnect();
        };
    }, [subAba]);

    useEffect(() => {
        // Tick visual a cada 60s + Refresh de dados de fundo (auto-discovery e heartbeats)
        const timer = setInterval(() => {
            setTick(t => t + 1);
            carregarDadosIniciais();
        }, 30000); // 30 segundos
        return () => clearInterval(timer);
    }, []);

    const carregarDadosIniciais = async () => {
        try {
            const requests = [api.get('/zonas'), api.get('/boias'), api.get('/tipos-sensor'), api.get('/gateways')];
            if (user.role === 'super_admin') {
                requests.push(api.get('/empresas'));
            }
            const [resZonas, resBoias, resTipos, resGateways, resEmpresas] = await Promise.all(requests);

            // No inventário, queremos as leituras recentes para cada boia
            const boiasComLeituras = await Promise.all(
                resBoias.data.map(async (boia) => {
                    try {
                        const detalhe = await api.get(`/boias/${boia.id}`);
                        return detalhe.data; 
                    } catch (e) { return boia; }
                })
            );

            setZonas(resZonas.data);
            setBoias(boiasComLeituras);
            setTiposSensor(resTipos.data);
            setGateways(resGateways.data);
            if (resEmpresas) setEmpresas(resEmpresas.data);

            // Sincronizar boiaDetalhe se estiver aberta
            if (boiaDetalhe) {
                const boiaAtualizada = boiasComLeituras.find(b => b.id === boiaDetalhe.id);
                if (boiaAtualizada) setBoiaDetalhe(boiaAtualizada);
            }
            if (onAtualizar) onAtualizar();
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        }
    };

    const handleCriarGateway = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formGateway };
            if (user?.role === 'super_admin' && payload.gatewayOwner) {
                if (payload.gatewayOwner === 'public') {
                    payload.is_public = true;
                    payload.empresa_id = null;
                } else {
                    payload.is_public = false;
                    payload.empresa_id = parseInt(payload.gatewayOwner);
                }
            }
            await api.post('/gateways', payload);
            mostrarMensagem('Novo Gateway registado na infraestrutura!', 'sucesso');
            setFormGateway({ mac_gateway: '', nome: '', latitude: '', longitude: '', raio_cobertura: 1000, gatewayOwner: 'public' });
            carregarDadosIniciais();
        } catch (error) { mostrarMensagem('Erro ao registar gateway.', 'erro'); }
    };

    const guardarEdicaoGateway = async (id) => {
        try {
            const payload = { ...formEditGateway };
            if (user?.role === 'super_admin' && payload.gatewayOwner) {
                if (payload.gatewayOwner === 'public') {
                    payload.is_public = true;
                    payload.empresa_id = null;
                } else {
                    payload.is_public = false;
                    payload.empresa_id = parseInt(payload.gatewayOwner);
                }
            }
            await api.put(`/gateways/${id}`, payload);
            mostrarMensagem('Torre atualizada com sucesso!', 'sucesso');
            setEditandoGatewayId(null);
            carregarDadosIniciais();
        } catch (e) {
            mostrarMensagem('Erro ao atualizar a torre.', 'erro');
        }
    };

    const recalibrarRaioGateway = async (gw) => {
        try {
            const minhasBoias = boias.filter(b => b.mac_gateway === gw.mac_gateway && b.latitude && b.longitude && b.rssi_ultimo);
            if (minhasBoias.length === 0) return mostrarMensagem('Sem boias ativas para calibrar.', 'erro');
            
            const boiasEstaveis = minhasBoias.filter(b => b.rssi_ultimo > -115);
            if (boiasEstaveis.length === 0) return mostrarMensagem('Sinal crítico em todas as boias.', 'erro');

            // Matemática de Rádio Frequência (Path Loss) para estimar cobertura máxima teórica
            const projecoes = boiasEstaveis.map(b => {
                if (!gw.latitude || !gw.longitude) return 0;
                const dCurrent = calculateDistance(Number(gw.latitude), Number(gw.longitude), Number(b.latitude), Number(b.longitude));
                
                // Se a boia estiver demasiado perto, assumimos 10m para a matemática não devolver zero
                const dEfetivo = Math.max(dCurrent, 10);
                
                // O limite crítico em LoRaWAN para perder pacotes ronda os -120 dBm
                const rssiMin = -120;
                const rssiAtual = b.rssi_ultimo;
                
                // Margem de sinal que ainda temos para gastar (ex: se sinal é -90, temos 30dBm de margem)
                const margemDb = rssiAtual - rssiMin; 
                
                if (margemDb <= 0) return dEfetivo;
                
                // Usamos n=3 (Path Loss Exponent) para cenários rurais/água sem linha de visão perfeita
                // Fórmula: d_max = d_atual * 10^( Margem_dB / (10 * n) )
                const pathLossExponent = 3.0;
                const multiplicadorDistancia = Math.pow(10, margemDb / (10 * pathLossExponent));
                
                let maxProjected = dEfetivo * multiplicadorDistancia;
                
                // Limitamos o alcance máximo teórico da antena a 15km para ser realista com a curvatura da terra/obstáculos
                return Math.min(maxProjected, 15000);
            });

            // Adotamos a abordagem conservadora: escolhemos a menor das projeções para desenhar um raio onde o sinal está garantido
            let raioSeguro = Math.ceil(Math.min(...projecoes));
            if (raioSeguro < 500) raioSeguro = 500; // Mínimo garantido de 500m de raio no mapa 

            await api.put(`/gateways/${gw.id}`, { ...gw, raio_cobertura: raioSeguro });
            mostrarMensagem(`Hub "${gw.nome}" calibrado para ${raioSeguro}m.`, 'sucesso');
            carregarDadosIniciais();
        } catch (error) {
            mostrarMensagem('Erro ao calibrar hub.', 'erro');
        }
    };

    const removerGateway = async (id) => {
        if (!window.confirm('Remover este Gateway? As boias associadas passarão a órfãs.')) return;
        try {
            await api.delete(`/gateways/${id}`);
            carregarDadosIniciais();
        } catch (error) { console.error(error); }
    };

    // --- FUNÇÕES DE ZONAS ---
    const handleCriarZona = async (e) => {
        e.preventDefault();
        try {
            await api.post('/zonas', formNovaZona);
            mostrarMensagem('Zona de monitorização criada!', 'sucesso');
            setFormNovaZona({ nome: '', concelho: '' });
            carregarDadosIniciais();
        } catch (error) {
            mostrarMensagem('Erro ao criar zona.', 'erro');
        }
    };

    const guardarEdicaoZona = async (id) => {
        try {
            await api.put(`/zonas/${id}`, formEditZona);
            mostrarMensagem('Zona atualizada com sucesso!', 'sucesso');
            setEditandoZonaId(null);
            carregarDadosIniciais();
        } catch (error) {
            mostrarMensagem('Erro ao atualizar zona.', 'erro');
        }
    };

    const removerZona = async (id) => {
        if (!window.confirm('Tem a certeza que deseja eliminar esta zona?')) return;
        try {
            await api.delete(`/zonas/${id}`);
            mostrarMensagem('Zona eliminada com sucesso!', 'sucesso');
            carregarDadosIniciais();
        } catch (error) {
            if (error.response?.data?.message) {
                mostrarMensagem(error.response.data.message, 'erro');
            } else {
                mostrarMensagem('Erro ao eliminar zona.', 'erro');
            }
        }
    };

    const mostrarMensagem = (texto, tipo) => {
        setMensagem({ texto, tipo });
        setTimeout(() => setMensagem({ texto: '', tipo: '' }), 5000);
    };

    const handleAtualizarLimiteDireto = async (e, boiaId, tipoSensorId) => {
        e.preventDefault();
        const config = limitesEditando[`${boiaId}-${tipoSensorId}`];
        const boiaAtual = boias.find(b => b.id === boiaId);
        const limiteExistente = boiaAtual?.limites?.find(lim => lim.tipo_sensor_id === tipoSensorId);

        const min = config?.min ?? limiteExistente?.valor_minimo;
        const max = config?.max ?? limiteExistente?.valor_maximo;

        if (!min || !max) return;

        try {
            await api.post('/boias/associar-sensor', {
                boia_id: Number(boiaId),
                tipo_sensor_id: Number(tipoSensorId),
                valor_minimo: Number(min),
                valor_maximo: Number(max)
            });
            mostrarMensagem('Limites operacionais atualizados!', 'sucesso');
            carregarDadosIniciais();
        } catch (error) { console.error(error); }
    };

    const handleSalvarCiclos = async (boiaId, sensorId) => {
        const ciclos = ciclosEditando[`${boiaId}-${sensorId}`];
        if (!ciclos) return setConfigurandoCiclos(null);
        
        try {
            await api.post(`/boias/${boiaId}/ciclos-manutencao`, {
                tipo_sensor_id: Number(sensorId),
                intervalo_limpeza_dias: Number(ciclos.limpeza),
                intervalo_calibracao_dias: Number(ciclos.calibracao),
                dias_proxima_manutencao: Number(ciclos.substituicao)
            });
            mostrarMensagem('Ciclos de manutenção atualizados!', 'sucesso');
            setConfigurandoCiclos(null);
            carregarDadosIniciais();
        } catch (error) { console.error(error); }
    };

    const getIcon = (id) => {
        const icons = {
            1: '🫧', // Oxigénio
            2: '⚗️', // pH
            3: '🌡️', // Temperatura
            4: '⚡', // Condutividade
            5: '🌫️', // Turbidez
            6: '🧂', // Salinidade
            7: '🌊', // Nível
            8: '🔋', // ORP
        };
        return icons[id] || '📊';
    };

    // Submissão 1: Criação Completa do Zero
    const handleCriarInstalacaoCompleta = async (e) => {
        e.preventDefault();
        try {
            const resBoia = await api.post('/boias', formBoia);
            const novaBoiaId = resBoia.data.boia.id;

            const promessasSensores = sensoresForm
                .filter(s => s.tipo_sensor_id && s.valor_minimo && s.valor_maximo)
                .map(sensor => api.post('/boias/associar-sensor', {
                    boia_id: novaBoiaId,
                    tipo_sensor_id: sensor.tipo_sensor_id,
                    valor_minimo: sensor.valor_minimo,
                    valor_maximo: sensor.valor_maximo
                }));

            await Promise.all(promessasSensores);
            mostrarMensagem('Instalação completa registada com sucesso!', 'sucesso');
            setFormBoia({ mac_boia: '', mac_gateway: '', nome: '', zona_id: '', latitude: '', longitude: '', localizacao_texto: '' });
            setSensoresForm([{ tipo_sensor_id: '', valor_minimo: '', valor_maximo: '' }]);
            carregarDadosIniciais();
            setSubAba('inventario');
        } catch (error) {
            mostrarMensagem('Erro ao registar equipamento.', 'erro');
        }
    };

    // Submissão 2: Adicionar Sensor a uma Instalação Existente
    const handleAdicionarSensorExistente = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...manutencao,
                ultima_manutencao: new Date().toISOString(), // Resetamos para agora ao calibrar
                status: 'ativo',
                is_configurado: true
            };
            
            await api.post('/boias/associar-sensor', payload);
            
            mostrarMensagem('Sensor acoplado e limites configurados!', 'sucesso');
            
            // Atualizar detalhe local se estiver aberto para persistência imediata na Ficha Técnica
            if (boiaDetalhe?.id === Number(manutencao.boia_id)) {
                const novosLimites = [...(boiaDetalhe.limites || [])];
                const index = novosLimites.findIndex(l => l.tipo_sensor_id === Number(manutencao.tipo_sensor_id));
                
                const novoLimite = {
                    ...payload,
                    tipo_sensor_id: Number(manutencao.tipo_sensor_id),
                    valor_minimo: Number(manutencao.valor_minimo),
                    valor_maximo: Number(manutencao.valor_maximo),
                    dias_proxima_manutencao: Number(manutencao.dias_proxima_manutencao)
                };

                if (index > -1) {
                    novosLimites[index] = { ...novosLimites[index], ...novoLimite };
                } else {
                    novosLimites.push(novoLimite);
                }
                
                setBoiaDetalhe({ ...boiaDetalhe, limites: novosLimites });
            }

            setManutencao({
                ...manutencao,
                tipo_sensor_id: '',
                valor_minimo: '',
                valor_maximo: '',
                dias_proxima_manutencao: 180
            });
            setAdicionandoSensor(false);
            carregarDadosIniciais(); 
        } catch (error) {
            mostrarMensagem('Erro ao associar o sensor.', 'erro');
        }
    };

    const handleAtualizarBoia = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/boias/${boiaDetalhe.id}`, formEditBoia);
            mostrarMensagem('Informação da estação atualizada!', 'sucesso');
            setEditandoBoia(false);
            carregarDadosIniciais();
            // Atualizar o detalhe local
            setBoiaDetalhe({ ...boiaDetalhe, ...formEditBoia });
        } catch (error) {
            mostrarMensagem('Erro ao atualizar estação.', 'erro');
        }
    };

    const removerBoia = async (id) => {
        if (!window.confirm('Tem a certeza que deseja remover esta estação? Todos os dados associados serão perdidos permanentemente.')) return;
        try {
            await api.delete(`/boias/${id}`);
            mostrarMensagem('Estação removida com sucesso!', 'sucesso');
            setBoiaDetalhe(null);
            carregarDadosIniciais();
        } catch (error) {
            mostrarMensagem('Erro ao remover estação.', 'erro');
        }
    };

    const removerSensor = async (boiaId, sensorId) => {
        if (!window.confirm('Remover este sensor da estação?')) return;
        try {
            await api.post('/boias/desassociar-sensor', { boia_id: boiaId, tipo_sensor_id: sensorId });
            mostrarMensagem('Sensor removido.', 'sucesso');
            carregarDadosIniciais();
        } catch (error) {
            mostrarMensagem('Erro ao remover sensor.', 'erro');
        }
    };

    const boiasPorZona = zonas.map(zona => ({
        ...zona, instalacoes: boias.filter(b => b.zona_id === zona.id)
    }));

    // Deteta boias ativas mas com configuração VLE ou sensores pendente
    const boiasIncompletas = boias.filter(b => {
        if (b.estado === 'pendente') return false;
        return (b.limites || []).some(lim => !lim.is_configurado || lim.valor_minimo == null || lim.valor_maximo == null);
    });

    // Estilos comuns
    const cardClass = "bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden";
    const labelClass = "text-sm font-black uppercase tracking-widest text-slate-400 mb-2 block";
    const inputClass = "w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300";

    const tabBase = "flex items-center gap-3 px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-300 border-2 border-transparent cursor-pointer";
    const tabActive = "bg-white text-blue-600 shadow-xl shadow-blue-900/10 border-blue-100 scale-[1.05]";
    const tabInactive = "text-slate-400 hover:bg-white/50 hover:text-slate-600";

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-12">
            
            {/* Alerta de Descoberta de Hardware (Boias Pendentes) */}
            {(isAdmin || isTecnico) && boiasPendentes.length > 0 && (
                <section className="mx-4 bg-amber-50 border-2 border-amber-200 p-6 rounded-[2rem] shadow-lg shadow-amber-200/20 flex flex-col md:flex-row items-center justify-between gap-6 animate-bounce-slow">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-amber-500/40">
                            🛰️
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-amber-900 uppercase tracking-tight">Nova Boia Detetada!</h3>
                            <p className="text-amber-700 font-bold text-sm uppercase tracking-widest mt-1">
                                Endereço MAC a aguardar registo: <span className="font-black text-amber-950 underline">{boiasPendentes[0].mac_boia}</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <div className="flex items-center gap-2 text-amber-900 font-black text-[10px] uppercase tracking-widest">
                            Configure agora ➡️
                        </div>
                        <button 
                            onClick={() => {
                                const boia = boiasPendentes[0];
                                setBoiaDetalhe(boia);
                                setEditandoBoia(true);
                                setFormEditBoia({
                                    ...boia,
                                    nome: boia.nome || '',
                                    mac_boia: boia.mac_boia || '',
                                    mac_gateway: boia.mac_gateway || '',
                                    latitude: boia.latitude || '',
                                    longitude: boia.longitude || '',
                                    local_texto: boia.localizacao_texto || '',
                                    bateria: boia.bateria ?? 100,
                                    estado: 'ativa'
                                });
                                setSubAba('inventario');
                            }}
                            className="bg-amber-950 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95"
                        >
                            Configurar Estação
                        </button>
                    </div>
                </section>
            )}

            {/* Alerta de Descoberta de Gateway */}
            {(isAdmin || isTecnico) && gatewaysPendentes.length > 0 && (
                <section className="mx-4 bg-emerald-50 border-2 border-emerald-200 p-6 rounded-[2rem] shadow-lg shadow-emerald-200/20 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/40 text-white">
                            📡
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-emerald-900 uppercase tracking-tight">Novo Hub Detetado!</h3>
                            <p className="text-emerald-700 font-bold text-sm uppercase tracking-widest mt-1">
                                Gateway ativo a aguardar parametrização: <span className="font-black text-emerald-950 underline">{gatewaysPendentes[0].mac_gateway}</span>
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => {
                            const gw = gatewaysPendentes[0];
                            setFormGateway({
                                ...formGateway,
                                mac_gateway: gw.mac_gateway,
                                nome: gw.nome
                            });
                            setSubAba('rede');
                            setTimeout(() => {
                                document.getElementById('form-gateway')?.scrollIntoView({ behavior: 'smooth' });
                            }, 100);
                        }}
                        className="bg-emerald-950 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-xl"
                    >
                        Configurar Hub
                    </button>
                </section>
            )}

            {/* Alerta Discreto de Configurações Pendentes (VLE / Sensores) */}
            {boiasIncompletas.length > 0 && (
                <section className="mx-4 bg-white border border-slate-200 px-6 py-3 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-3 text-slate-500">
                        <span className="text-lg">⚙️</span>
                        <p className="text-xs font-bold uppercase tracking-widest">
                            Existem {boiasIncompletas.length} equipamentos com calibrações de sensores ou <span className="font-black text-slate-800">valores VLE pendentes</span>.
                        </p>
                    </div>
                    <button 
                        onClick={() => setSubAba('agenda')} 
                        className="text-[10px] font-black text-slate-400 bg-slate-50 px-4 py-2 rounded-lg uppercase tracking-widest hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                        Abrir Agenda Técnica ➔
                    </button>
                </section>
            )}

            {/* Header / Navegação por Abas */}
            <div className="bg-slate-100/50 p-2 rounded-[2.5rem] flex flex-wrap gap-2">
                <button
                    id="aba-monitorizacao"
                    onClick={() => setSubAba('inventario')}
                    className={`${tabBase} ${subAba === 'inventario' ? tabActive : tabInactive}`}
                >
                    <span className="text-xl">🖥️</span> Monitorização
                </button>
                {(isAdmin || isTecnico) && (
                    <button
                        id="aba-novo-registo"
                        onClick={() => setSubAba('nova')}
                        className={`${tabBase} ${subAba === 'nova' ? tabActive : tabInactive}`}
                    >
                        <span className="text-xl">➕</span> Novo Registo
                    </button>
                )}
                <button
                    id="aba-hub-rede"
                    onClick={() => setSubAba('rede')}
                    className={`${tabBase} ${subAba === 'rede' ? tabActive : tabInactive} relative`}
                >
                    <span className="text-xl">🗼</span> Torres de Comunicação
                    {gatewaysPendentes.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white animate-pulse shadow-lg">
                            {gatewaysPendentes.length}
                        </span>
                    )}
                </button>
                {(isAdmin || isTecnico || isLeitor) && (
                    <button
                        id="aba-agenda-tecnica"
                        onClick={() => setSubAba('agenda')}
                        className={`${tabBase} ${subAba === 'agenda' ? tabActive : tabInactive} relative`}
                    >
                        <span className="text-xl">📅</span> Agenda Técnica
                        {totalMissoes > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white animate-pulse shadow-lg">
                                {totalMissoes}
                            </span>
                        )}
                    </button>
                )}
            </div>

            {/* Área de Conteúdo */}
            <div className="space-y-12">

                {/* ABA 1: MONITORIZAÇÃO */}
                {subAba === 'inventario' && (
                    <div className="space-y-8 animate-fade-in relative">
                        {isHelpMode && <HelpPin text="🖥️ Monitorização: Aqui vês o estado em tempo real de todas as estações de qualidade da água. As cores indicam a gravidade dos VLEs (Valores Limite de Emissão)." className="absolute top-4 right-4" position="left" />}

                        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 px-4">
                            <div>
                                <h2 className="text-3xl md:text-5xl font-black text-slate-800 tracking-tight leading-none">Lista de Dispositivos</h2>
                                <p className="text-slate-400 font-medium text-sm md:text-lg mt-2 italic">Controlo e estado de conservação das boias</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    Total de Boias: <span className="text-blue-600 text-lg ml-1">{boias.length}</span>
                                </div>
                            </div>
                        </header>

                        {boiasPorZona.map(zona => (
                            <div key={zona.id} className="space-y-8">
                                <div className="flex items-center gap-6 px-4">
                                    <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-800 text-white rounded-xl md:rounded-2xl flex items-center justify-center text-xl md:text-2xl shadow-lg shadow-indigo-100 font-black shrink-0">
                                        {zona.nome.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">{zona.nome}</h3>
                                        <p className="text-[10px] md:text-sm font-black text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.3em]">{zona.concelho} • {zona.instalacoes.length} Unidades</p>
                                    </div>
                                    <div className="flex-1 h-[2px] bg-slate-100"></div>
                                    {(isAdmin || isTecnico) && (
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => { setIsModalZonasOpen(true); setEditandoZonaId(zona.id); setFormEditZona({...zona}); }} 
                                                className="p-2 text-amber-500 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                                                title="Editar Zona"
                                            >
                                                ✏️ Editar Zona
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 gap-8">
                                    {zona.instalacoes.map(boia => {
                                        const IDsLeituras = boia.leituras ? boia.leituras.map(l => l.tipo_sensor_id) : [];
                                        const IDsLimites = boia.limites ? boia.limites.map(l => l.tipo_sensor_id) : [];
                                        const IDsSensoresDetetados = [...new Set([...IDsLeituras, ...IDsLimites])];

                                        // Lógica de "Batimento Cardíaco" (Heartbeat) - Ter em conta o DeepSleep e Timezones
                                        let ultimaMensagem = new Date();
                                        if (boia.leituras && boia.leituras.length > 0) {
                                            const tempos = boia.leituras.map(l => {
                                                const dh = l.data_hora;
                                                const parseable = dh && typeof dh === 'string' && !dh.includes('T') ? dh.replace(' ', 'T') + 'Z' : dh;
                                                return new Date(parseable).getTime();
                                            }).filter(t => !isNaN(t));
                                            if (tempos.length > 0) {
                                                ultimaMensagem = new Date(Math.max(...tempos));
                                            }
                                        } else {
                                            const rawDate = boia.updated_at || boia.created_at;
                                            if (rawDate) {
                                                const dataParse = typeof rawDate === 'string' && !rawDate.includes('T') 
                                                    ? rawDate.replace(' ', 'T') + 'Z' 
                                                    : rawDate;
                                                ultimaMensagem = new Date(dataParse);
                                            }
                                        }
                                        const minutosDesdeUltima = (new Date() - ultimaMensagem) / (1000 * 60);
                                        
                                        // O limite offline passa a ser o intervalo de deepsleep + 3 minutos de margem
                                        const intervaloMinutos = boia.intervalo_segundos ? (boia.intervalo_segundos / 60) : 5;
                                        const isOffline = minutosDesdeUltima > (intervaloMinutos + 3) && boia.estado === 'ativa';

                                        return (
                                            <div 
                                                key={boia.id} 
                                                onClick={() => {
                                                    setBoiaDetalhe(boia);
                                                    if (boia.estado === 'pendente' && (isAdmin || isTecnico)) {
                                                        setEditandoBoia(true);
                                                        setFormEditBoia({
                                                            ...boia,
                                                            nome: boia.nome || '',
                                                            mac_boia: boia.mac_boia || '',
                                                            mac_gateway: boia.mac_gateway || '',
                                                            latitude: boia.latitude || '',
                                                            longitude: boia.longitude || '',
                                                            localizacao_texto: boia.localizacao_texto || '',
                                                            bateria: boia.bateria ?? 100,
                                                            estado: 'ativa' // Sugere passar para ativa ao editar
                                                        });
                                                    }
                                                }}
                                                className={`${cardClass} p-5 md:p-10 hover:border-blue-300 transition-all hover:shadow-2xl hover:shadow-blue-900/10 cursor-pointer group relative`}
                                            >
                                                {/* Indicador de Estado e Energia */}
                                                <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-100">
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border ${
                                                            isOffline ? 'bg-slate-100 border-slate-200 text-slate-500' :
                                                            boia.estado === 'ativa' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                                                            boia.estado === 'pendente' ? 'bg-amber-50 border-amber-200 text-amber-700 animate-pulse' :
                                                            'bg-rose-50 border-rose-100 text-rose-700'
                                                        }`}>
                                                            <span className={`w-2 h-2 rounded-full ${
                                                                isOffline ? 'bg-slate-400' :
                                                                boia.estado === 'ativa' ? 'bg-emerald-500 animate-ping' :
                                                                boia.estado === 'pendente' ? 'bg-amber-500 animate-pulse' :
                                                                'bg-rose-500'
                                                            }`}></span>
                                                            <span className="text-[10px] font-black uppercase tracking-widest">
                                                                {isOffline ? 'Desconectada' : boia.estado}
                                                            </span>
                                                        </div>
                                                        <Tooltip text="Nível de energia da estação">
                                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100 cursor-help">
                                                                🔋 {boia.bateria}%
                                                            </div>
                                                        </Tooltip>
                                                        <Tooltip text={`Última atividade: ${ultimaMensagem.toLocaleTimeString('pt-PT')}`}>
                                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100 cursor-help">
                                                                🕒 {Math.floor(minutosDesdeUltima)} min atrás
                                                            </div>
                                                        </Tooltip>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col lg:flex-row gap-6 lg:gap-12">
                                                    {/* Secção de Info */}
                                                    <div className="lg:w-1/3 space-y-6">
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between items-start">
                                                                <div className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Hardware ID #{boia.id}</div>
                                                                {/* Indicador de Sinal de Rede Visual (NOVO) */}
                                                                <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-2xl border border-white/10 shadow-2xl group-hover:scale-105 transition-transform">
                                                                    <div className={`flex gap-1 items-end h-4 ${isOffline ? 'opacity-50' : ''}`}>
                                                                        {[1, 2, 3, 4, 5].map((bar) => {
                                                                            const strength = boia.rssi_ultimo ? (boia.rssi_ultimo + 140) / 110 : 0;
                                                                            const isActive = strength > (bar / 5);
                                                                            return (
                                                                                <div key={bar} 
                                                                                    className={`w-1 rounded-full transition-all ${
                                                                                        isOffline ? (isActive ? 'bg-slate-500' : 'bg-white/5') :
                                                                                        isActive 
                                                                                            ? (strength > 0.7 ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : strength > 0.4 ? 'bg-amber-400' : 'bg-rose-400') 
                                                                                            : 'bg-white/10'
                                                                                    }`}
                                                                                    style={{ height: `${bar * 20}%` }}
                                                                                ></div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className={`text-sm font-black uppercase leading-tight ${
                                                                            isOffline || !boia.rssi_ultimo ? 'text-slate-500' :
                                                                            boia.rssi_ultimo > -90 ? 'text-emerald-400' :
                                                                            boia.rssi_ultimo > -115 ? 'text-amber-400' : 'text-rose-400'
                                                                        }`}>
                                                                            {isOffline ? 'Sinal Perdido' :
                                                                             !boia.rssi_ultimo ? 'Sem Sinal' :
                                                                             boia.rssi_ultimo > -90 ? 'Excelente' :
                                                                             boia.rssi_ultimo > -115 ? 'Estável' : 'Sinal Crítico'}
                                                                        </span>
                                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">
                                                                            {isOffline ? `Último: ${boia.rssi_ultimo ?? '?'} dBm` :
                                                                             boia.rssi_ultimo ? `${boia.rssi_ultimo} dBm` : 'Hardware Offline'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <h4 className="text-4xl font-black text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors leading-none">{boia.nome}</h4>
                                                        </div>

                                                        {/* Box de Identificadores de Hardware (NOVO) */}
                                                        <div className="p-6 bg-slate-900 rounded-[1.5rem] border border-white/10 shadow-2xl">
                                                            <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] block mb-5">Hardware Engine</span>
                                                            <div className="space-y-4">
                                                                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                                                    <span className="text-[11px] font-black text-blue-400 uppercase tracking-widest">MAC Estação</span>
                                                                    <code className="text-sm font-black text-white tracking-widest">{boia.mac_boia}</code>
                                                                </div>
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-[11px] font-black text-emerald-400 uppercase tracking-widest">MAC Gateway</span>
                                                                    <code className="text-sm font-black text-emerald-100 tracking-widest">{boia.mac_gateway}</code>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                            <span className={labelClass}>Localização</span>
                                                            <p className="font-bold text-slate-600 text-sm leading-relaxed">
                                                                {boia.localizacao_texto || 'Coordenadas Geográficas Puras'}
                                                            </p>
                                                        </div>
                                                        <button className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-slate-200 group-hover:bg-blue-600 transition-all">
                                                            Consultar Ficha Técnica ⚡
                                                        </button>
                                                    </div>

                                                    {/* Grelha de Sensores */}
                                                    <div className="lg:w-2/3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                                        {IDsSensoresDetetados.map(sensorId => {
                                                            const info = tiposSensor.find(t => t.id === sensorId);
                                                            const historico = boia.leituras?.filter(l => l.tipo_sensor_id === sensorId) || [];
                                                            const ultima = historico[historico.length - 1];
                                                            const lim = boia.limites?.find(l => l.tipo_sensor_id === sensorId);
                                                            
                                                            const temLeitura = !!ultima;
                                                            const valorNum = parseFloat(ultima?.valor || 0);
                                                            const minNum = parseFloat(lim?.valor_minimo || 0);
                                                            const maxNum = parseFloat(lim?.valor_maximo || 100);
                                                            const foraDeIntervalo = temLeitura && lim && (valorNum < minNum || valorNum > maxNum);

                                                            const statusInfo = {
                                                                ativo: { color: 'text-emerald-500 bg-emerald-50 border-emerald-100' },
                                                                erro: { color: 'text-rose-500 bg-rose-50 border-rose-100' },
                                                                calibracao: { color: 'text-amber-500 bg-amber-50 border-amber-100' },
                                                                desconectado: { color: 'text-slate-400 bg-slate-50 border-slate-100' }
                                                            };
                                                            const currentStatus = statusInfo[lim?.status] || statusInfo.ativo;

                                                            return (
                                                                <div 
                                                                    key={sensorId} 
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className={`p-6 rounded-3xl border-2 transition-all ${foraDeIntervalo ? 'bg-rose-50 border-rose-200' : 'bg-slate-50/50 border-slate-100 hover:bg-white hover:border-blue-100'}`}
                                                                >
                                                                    <div className="flex justify-between items-start mb-4">
                                                                        <div className="flex items-center gap-3">
                                                                            <Tooltip text={`Sensor: ${info?.nome || 'Desconhecido'}`}>
                                                                                <span className="text-2xl bg-white w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border border-slate-100 relative cursor-help">
                                                                                    {getIcon(sensorId)}
                                                                                    {isOverdue(lim?.ultima_manutencao, lim?.dias_proxima_manutencao) && (
                                                                                        <span className="absolute -top-2 -right-2 text-sm bg-white rounded-full shadow-sm">⚠️</span>
                                                                                    )}
                                                                                </span>
                                                                            </Tooltip>
                                                                            <div>
                                                                                <span className="block text-sm font-black text-slate-400 uppercase tracking-widest">{info?.nome}</span>
                                                                                <span className={`text-2xl font-black ${foraDeIntervalo ? 'text-rose-600' : 'text-slate-800'}`}>
                                                                                    {temLeitura ? (
                                                                                        <>{ultima?.valor} <small className="text-sm font-bold opacity-40">{info?.unidade}</small></>
                                                                                    ) : <span className="text-sm opacity-40">---</span>}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        {!isLeitor && (
                                                                            <Tooltip text="Remover este sensor" position="left">
                                                                                <button 
                                                                                    onClick={() => removerSensor(boia.id, sensorId)}
                                                                                    className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                                                                                >✕</button>
                                                                            </Tooltip>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    {!isLeitor && lim && (
                                                                        <div className="space-y-4">
                                                                            <div className="grid grid-cols-2 gap-2">
                                                                                <div className="space-y-1">
                                                                                    <span className="text-sm font-black text-slate-400 uppercase block tracking-tighter">Min VLE</span>
                                                                                    <input 
                                                                                        type="number" defaultValue={lim.valor_minimo}
                                                                                        onChange={(e) => setLimitesEditando({...limitesEditando, [`${boia.id}-${sensorId}`]: {...limitesEditando[`${boia.id}-${sensorId}`], min: e.target.value}})}
                                                                                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-black text-center focus:border-blue-500 outline-none"
                                                                                    />
                                                                                </div>
                                                                                <div className="space-y-1">
                                                                                    <span className="text-sm font-black text-slate-400 uppercase block tracking-tighter">Max VLE</span>
                                                                                    <input 
                                                                                        type="number" defaultValue={lim.valor_maximo}
                                                                                        onChange={(e) => setLimitesEditando({...limitesEditando, [`${boia.id}-${sensorId}`]: {...limitesEditando[`${boia.id}-${sensorId}`], max: e.target.value}})}
                                                                                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-black text-center focus:border-blue-500 outline-none"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                            <button 
                                                                                onClick={(e) => handleAtualizarLimiteDireto(e, boia.id, sensorId)}
                                                                                className="w-full bg-blue-600 text-white py-2 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-md shadow-blue-100"
                                                                            >Atualizar VLE</button>
                                                                        </div>
                                                                    )}
                                                                    {isLeitor && lim && (
                                                                        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-50">
                                                                            <div className="text-center">
                                                                                <span className="text-[10px] font-black text-slate-300 uppercase block tracking-widest">Min</span>
                                                                                <span className="text-sm font-black text-slate-600">{lim.valor_minimo}</span>
                                                                            </div>
                                                                            <div className="text-center border-l border-slate-50">
                                                                                <span className="text-[10px] font-black text-slate-300 uppercase block tracking-widest">Max</span>
                                                                                <span className="text-sm font-black text-slate-600">{lim.valor_maximo}</span>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ABA 2: NOVO REGISTO */}
                {subAba === 'nova' && (isAdmin || isTecnico) && (
                    <div className="max-w-4xl mx-auto space-y-12 animate-fade-in relative">
                        {isHelpMode && <HelpPin text="➕ Novo Registo: Usa este formulário para adicionar uma nova boia à tua rede. Segue os 3 passos: Identidade, Localização e Sensores." className="absolute top-4 left-4" position="right" />}
                        <header className="text-center space-y-4">
                            <h2 className="text-5xl font-black text-slate-800 tracking-tight uppercase">Registo de Estação de Monitorização</h2>
                            <p className="text-slate-400 font-medium italic">Configuração e Localização de Nova Estação</p>
                        </header>

                        <form onSubmit={handleCriarInstalacaoCompleta} className="space-y-10">
                            {/* Passo 1: Identidade */}
                            <section className={`${cardClass} p-12 space-y-10 relative`}>
                                <div className="absolute top-0 right-0 p-8">
                                    <span className="w-12 h-12 bg-blue-600 text-white rounded-[1.5rem] flex items-center justify-center font-black text-xl shadow-xl shadow-blue-200">1</span>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 tracking-tighter border-b-4 border-blue-600 inline-block pb-1 uppercase">Identidade da Estação</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="md:col-span-2">
                                        <label className={labelClass}>Designação Operacional</label>
                                        <input 
                                            type="text" required value={formBoia.nome} 
                                            onChange={e => setFormBoia({ ...formBoia, nome: e.target.value })}
                                            className={inputClass} placeholder="Ex: Estação de Monitorização Lis-01" 
                                        />
                                    </div>
                                    <div className="bg-slate-900 p-10 rounded-[2.5rem] md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-10 shadow-2xl">
                                        <div>
                                            <div className="flex justify-between items-end mb-3">
                                                <label className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] block">Endereço da Boia (Água)</label>
                                                {boiasPendentes.length > 0 && (
                                                    <span className="text-[9px] font-black text-amber-500 uppercase bg-amber-500/10 px-2 py-0.5 rounded-md animate-pulse">
                                                        {boiasPendentes.length} detetadas
                                                    </span>
                                                )}
                                            </div>
                                            <div className="relative group/mac">
                                                <input 
                                                    type="text" required value={formBoia.mac_boia}
                                                    onChange={e => setFormBoia({ ...formBoia, mac_boia: e.target.value.toUpperCase() })}
                                                    className="w-full p-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white font-mono focus:border-blue-500 outline-none pr-12"
                                                    placeholder="00:00:00:00:00:00"
                                                />
                                                {boiasPendentes.length > 0 && (
                                                    <div className="absolute right-2 top-2 bottom-2">
                                                        <select 
                                                            className="h-full max-w-[100px] md:max-w-[120px] truncate bg-slate-800 text-white border-none rounded-xl text-[10px] font-black uppercase px-2 cursor-pointer hover:bg-slate-700 transition-colors"
                                                            onChange={(e) => {
                                                                if (e.target.value) {
                                                                    const selected = boiasPendentes.find(b => b.mac_boia === e.target.value);
                                                                    setFormBoia({ 
                                                                        ...formBoia, 
                                                                        mac_boia: selected.mac_boia,
                                                                        mac_gateway: selected.mac_gateway || formBoia.mac_gateway
                                                                    });
                                                                }
                                                            }}
                                                            value=""
                                                        >
                                                            <option value="" disabled>📡 Auto</option>
                                                            {boiasPendentes.map(b => {
                                                                const gw = gateways.find(g => g.mac_gateway === b.mac_gateway);
                                                                return (
                                                                    <option key={b.id} value={b.mac_boia}>
                                                                        {b.mac_boia} (via {gw?.nome || 'Ponto de Rede Desconhecido'})
                                                                    </option>
                                                                );
                                                            })}
                                                        </select>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-3 block">Ponto de Ligação (Hub)</label>
                                            <select 
                                                required value={formBoia.mac_gateway}
                                                onChange={e => setFormBoia({ ...formBoia, mac_gateway: e.target.value })}
                                                className="w-full p-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white font-black text-sm outline-none focus:border-emerald-500 appearance-none cursor-pointer"
                                            >
                                                <option value="" className="bg-slate-900">Selecione o Ponto de Rede...</option>
                                                {gateways.map(gw => (
                                                    <option key={gw.id} value={gw.mac_gateway} className="bg-slate-900">
                                                        {gw.nome} ({gw.mac_gateway})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-amber-400 uppercase tracking-[0.3em] mb-3 block">Tempo de Hibernação</label>
                                            <select 
                                                required value={formBoia.intervalo_segundos}
                                                onChange={e => setFormBoia({ ...formBoia, intervalo_segundos: parseInt(e.target.value) })}
                                                className="w-full p-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white font-black text-sm outline-none focus:border-amber-500 appearance-none cursor-pointer"
                                            >
                                                <option value="60" className="bg-slate-900">1 Minuto (Teste)</option>
                                                <option value="300" className="bg-slate-900">5 Minutos (Padrão)</option>
                                                <option value="900" className="bg-slate-900">15 Minutos</option>
                                                <option value="3600" className="bg-slate-900">1 Hora (Económico)</option>
                                                <option value="21600" className="bg-slate-900">6 Horas (Máxima Bateria)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Passo 2: Localização */}
                            <section className={`${cardClass} p-12 space-y-10 relative`}>
                                <div className="absolute top-0 right-0 p-8">
                                    <span className="w-12 h-12 bg-blue-600 text-white rounded-[1.5rem] flex items-center justify-center font-black text-xl shadow-xl shadow-blue-200">2</span>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 tracking-tighter border-b-4 border-blue-600 inline-block pb-1 uppercase">Implementação Geográfica</h3>
                                </div>
                                
                                <div className="h-[400px] rounded-[2.5rem] overflow-hidden border-4 border-white shadow-2xl relative">
                                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900 text-white px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl">
                                        📍 Marque a posição exata no mapa
                                    </div>
                                    <MapContainer center={centroMapaNova} zoom={13} style={{ height: '100%', width: '100%' }}>
                                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                        <MapController center={centroMapaNova} />
                                        <LocationMarker 
                                            position={formBoia.latitude && formBoia.longitude ? [formBoia.latitude, formBoia.longitude] : null}
                                            setPosition={(pos) => setFormBoia({...formBoia, latitude: pos.lat.toFixed(6), longitude: pos.lng.toFixed(6)})} 
                                        />
                                    </MapContainer>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="md:col-span-2">
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-0">Zona de Monitorização</label>
                                            <button 
                                                type="button" 
                                                onClick={() => setIsModalZonasOpen(true)}
                                                className="text-[10px] text-blue-500 hover:text-blue-700 font-black uppercase tracking-widest bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-full transition-colors"
                                            >
                                                ⚙️ Gerir Zonas
                                            </button>
                                        </div>
                                        <select 
                                            required value={formBoia.zona_id} 
                                            onChange={e => setFormBoia({ ...formBoia, zona_id: e.target.value })}
                                            className={`${inputClass} appearance-none cursor-pointer`}
                                        >
                                            <option value="">Selecione uma zona ativa...</option>
                                            {zonas.map(z => <option key={z.id} value={z.id}>{z.nome} ({z.concelho})</option>)}
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className={labelClass}>Ponto de Referência / Morada</label>
                                        <input 
                                            type="text" value={formBoia.localizacao_texto} 
                                            onChange={e => setFormBoia({ ...formBoia, localizacao_texto: e.target.value })}
                                            className={inputClass} placeholder="Ex: Próximo ao açude da Foz..." 
                                        />
                                    </div>
                                    <div className="p-6 bg-blue-50/50 rounded-2xl border-2 border-blue-100">
                                        <label className={labelClass}>Latitude Capturada</label>
                                        <code className="text-blue-600 font-black text-lg">{formBoia.latitude || '0.000000'}</code>
                                    </div>
                                    <div className="p-6 bg-blue-50/50 rounded-2xl border-2 border-blue-100">
                                        <label className={labelClass}>Longitude Capturada</label>
                                        <code className="text-blue-600 font-black text-lg">{formBoia.longitude || '0.000000'}</code>
                                    </div>
                                </div>
                            </section>

                            {/* Passo 3: Sensores */}
                            <section className={`${cardClass} p-12 space-y-10 relative`}>
                                <div className="absolute top-0 right-0 p-8">
                                    <span className="w-12 h-12 bg-blue-600 text-white rounded-[1.5rem] flex items-center justify-center font-black text-xl shadow-xl shadow-blue-200">3</span>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 tracking-tighter border-b-4 border-blue-600 inline-block pb-1 uppercase">Configuração de Sensores</h3>
                                </div>
                                
                                <div className="space-y-6">
                                    {sensoresForm.map((s, idx) => (
                                        <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8 bg-slate-50 rounded-[2rem] border-2 border-slate-100 relative group">
                                            <div>
                                                <label className={labelClass}>Tipo de Sensor</label>
                                                <select 
                                                    value={s.tipo_sensor_id}
                                                    onChange={e => {
                                                        const newSensores = [...sensoresForm];
                                                        newSensores[idx].tipo_sensor_id = e.target.value;
                                                        setSensoresForm(newSensores);
                                                    }}
                                                    className={`${inputClass} text-lg`}
                                                >
                                                    <option value="">Selecionar...</option>
                                                    {tiposSensor.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelClass}>Mínimo</label>
                                                <input 
                                                    type="number" value={s.valor_minimo}
                                                    onChange={e => {
                                                        const newSensores = [...sensoresForm];
                                                        newSensores[idx].valor_minimo = e.target.value;
                                                        setSensoresForm(newSensores);
                                                    }}
                                                    className={`${inputClass} text-lg`}
                                                />
                                            </div>
                                            <div>
                                                <label className={labelClass}>Máximo</label>
                                                <input 
                                                    type="number" value={s.valor_maximo}
                                                    onChange={e => {
                                                        const newSensores = [...sensoresForm];
                                                        newSensores[idx].valor_maximo = e.target.value;
                                                        setSensoresForm(newSensores);
                                                    }}
                                                    className={`${inputClass} text-lg`}
                                                />
                                            </div>
                                            {sensoresForm.length > 1 && (
                                                <button 
                                                    type="button"
                                                    onClick={() => setSensoresForm(sensoresForm.filter((_, i) => i !== idx))}
                                                    className="absolute -top-3 -right-3 w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                >✕</button>
                                            )}
                                        </div>
                                    ))}
                                    <button 
                                        type="button"
                                        onClick={() => setSensoresForm([...sensoresForm, { tipo_sensor_id: '', valor_minimo: '', valor_maximo: '' }])}
                                        className="w-full py-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-400 font-black uppercase text-sm hover:border-blue-500 hover:text-blue-500 transition-all"
                                    >
                                        + Adicionar Outro Sensor
                                    </button>
                                </div>
                            </section>

                            <button type="submit" className="w-full bg-blue-600 text-white py-8 rounded-[2.5rem] font-black text-xl uppercase tracking-[0.3em] shadow-2xl shadow-blue-200 hover:bg-slate-900 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-4">
                                🚀 Finalizar Comissionamento
                            </button>
                        </form>
                    </div>
                )}

                {/* ABA 3: GESTÃO TÉCNICA (AGENDA) */}
                {subAba === 'agenda' && (
                    <div className="space-y-12 animate-fade-in relative">
                        {isHelpMode && <HelpPin text="📅 Agenda Técnica: Esta é a lista de tarefas da tua equipa. Aqui encontras as boias que precisam de calibração, troca de bateria ou manutenção preventiva." className="absolute top-4 left-4" position="right" />}
                        {(() => {
                            const missions = [];
                            
                            boias.forEach(boia => {
                                // 0. Diagnóstico de Sinal LoRa (NOVO)
                                const meuGateway = gateways.find(gw => gw.mac_gateway === boia.mac_gateway);
                                if (meuGateway && boia.latitude && boia.longitude) {
                                    // Só damos o aviso se o sinal estiver realmente fraco, ignorando a distância de referência que pode ser enganadora
                                    if (boia.rssi_ultimo && boia.rssi_ultimo < -115) {
                                        missions.push({
                                            id: `signal-${boia.id}`,
                                            type: 'warning',
                                            title: 'Sinal LoRa Fraco',
                                            boiaId: boia.id,
                                            description: `A boia reportou um sinal crítico (${boia.rssi_ultimo} dBm). Isto pode causar perda de dados, independentemente da distância teórica ao gateway.`,
                                            action: () => setSubAba('rede')
                                        });
                                    }
                                }

                                // 1. Novos Dispositivos Pendentes... (resto das missões mantido)
                                (boia.limites || []).forEach(lim => {
                                    const sensorInfo = tiposSensor.find(t => t.id === lim.tipo_sensor_id);
                                    
                                    if (lim.is_configurado === false || lim.is_configurado === 0) {
                                        missions.push({
                                            id: `new-${boia.id}-${lim.tipo_sensor_id}`,
                                            type: 'critical',
                                            title: 'Configuração Inicial',
                                            boiaId: boia.id,
                                            sensor: sensorInfo,
                                            description: `Novo sensor detetado a aguardar parametrização VLE.`,
                                            action: () => {
                                                setBoiaDetalhe(boia);
                                                setAdicionandoSensor(true);
                                                setManutencao({
                                                    boia_id: boia.id,
                                                    tipo_sensor_id: lim.tipo_sensor_id,
                                                    valor_minimo: '',
                                                    valor_maximo: '',
                                                    dias_proxima_manutencao: 180
                                                });
                                            }
                                        });
                                    }
                                });

                                // 2. Calibração Crítica (Em atraso)
                                (boia.limites || []).forEach(lim => {
                                    if (lim.is_configurado && isOverdue(lim.ultima_manutencao, lim.dias_proxima_manutencao)) {
                                        missions.push({
                                            id: `calib-crit-${boia.id}-${lim.tipo_sensor_id}`,
                                            type: 'critical',
                                            title: 'Calibração Crítica',
                                            boiaId: boia.id,
                                            sensor: tiposSensor.find(t => t.id === lim.tipo_sensor_id),
                                            description: `Sensor com ciclo de calibração excedido em ${calculateNextMaintenance(lim.ultima_manutencao, lim.dias_proxima_manutencao)}.`,
                                            action: () => {
                                                setBoiaDetalhe(boia);
                                                setAdicionandoSensor(true);
                                                setManutencao({
                                                    boia_id: boia.id,
                                                    tipo_sensor_id: lim.tipo_sensor_id,
                                                    valor_minimo: lim.valor_minimo,
                                                    valor_maximo: lim.valor_maximo,
                                                    dias_proxima_manutencao: lim.dias_proxima_manutencao
                                                });
                                            }
                                        });
                                    }
                                });

                                // 3. Manutenção Preventiva
                                (boia.limites || []).forEach(lim => {
                                    const progress = getMaintenanceProgress(lim.ultima_manutencao, lim.dias_proxima_manutencao);
                                    if (lim.is_configurado && progress > 90 && !isOverdue(lim.ultima_manutencao, lim.dias_proxima_manutencao)) {
                                        missions.push({
                                            id: `calib-prev-${boia.id}-${lim.tipo_sensor_id}`,
                                            type: 'warning',
                                            title: 'Manutenção Preventiva',
                                            boiaId: boia.id,
                                            sensor: tiposSensor.find(t => t.id === lim.tipo_sensor_id),
                                            description: `Calibração próxima do fim do ciclo (${Math.round(progress)}%). Agendar intervenção.`,
                                            action: () => {
                                                setBoiaDetalhe(boia);
                                                setAdicionandoSensor(true);
                                                setManutencao({
                                                    boia_id: boia.id,
                                                    tipo_sensor_id: lim.tipo_sensor_id,
                                                    valor_minimo: lim.valor_minimo,
                                                    valor_maximo: lim.valor_maximo,
                                                    dias_proxima_manutencao: lim.dias_proxima_manutencao
                                                });
                                            }
                                        });
                                    }
                                });

                                // 4. Inspeção Física (Ciclo de 15 dias)
                                if (boia.ultima_manutencao) {
                                    if (isOverdue(boia.ultima_manutencao, 15)) {
                                        missions.push({
                                            id: `clean-${boia.id}`,
                                            type: 'inspection',
                                            title: 'Inspeção Física',
                                            boiaId: boia.id,
                                            description: `Ciclo de 15 dias de limpeza de caudal e verificação física expirado.`,
                                            action: () => {
                                                setBoiaDetalhe(boia);
                                                setFormRelatorioManutencao({...formManutencao, tipo: 'limpeza', tipo_sensor_id: null});
                                                setMostrarTourManutencao(true);
                                            }
                                        });
                                    }
                                }

                                // 5. Alerta de Bateria
                                if (boia.bateria < 20) {
                                    missions.push({
                                        id: `batt-${boia.id}`,
                                        type: 'battery',
                                        title: 'Alerta de Bateria',
                                        boiaId: boia.id,
                                        description: `Nível crítico de energia detetado: ${boia.bateria}%. Substituir ou carregar.`,
                                        action: () => {
                                            setBoiaDetalhe(boia);
                                            setFormRelatorioManutencao({...formManutencao, tipo: 'reparacao', tipo_sensor_id: null, observacoes: 'Troca/Carga de bateria necessária.'});
                                            setMostrarTourManutencao(true);
                                        }
                                    });
                                }
                            });

                            // Cálculos de Saúde
                            const totalConfiguredSensors = boias.reduce((acc, b) => acc + (b.limites?.filter(l => l.is_configurado).length || 0), 0);
                            const overdueSensors = boias.reduce((acc, b) => acc + (b.limites?.filter(l => l.is_configurado && isOverdue(l.ultima_manutencao, l.dias_proxima_manutencao)).length || 0), 0);
                            const healthPercentage = totalConfiguredSensors > 0 ? Math.round(((totalConfiguredSensors - overdueSensors) / totalConfiguredSensors) * 100) : 100;

                            return (
                                <>
                                    <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
                                        <div>
                                            <h2 className="text-5xl font-black text-slate-800 tracking-tight uppercase leading-none">Gestão Técnica</h2>
                                            <p className="text-slate-400 font-medium italic text-lg mt-2">Centro de Comando de Intervenções e Saúde da Rede</p>
                                        </div>
                                    </header>

                                    {/* Scorecard de Saúde */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4">
                                        <Tooltip text="Percentagem de sensores calibrados e em bom estado">
                                            <div className={`${cardClass} p-8 flex flex-col items-center justify-center text-center space-y-3 relative overflow-hidden group cursor-help`}>
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 transition-all group-hover:scale-150"></div>
                                                <span className="text-5xl">🛡️</span>
                                                <div>
                                                    <div className="text-4xl font-black text-slate-800">{healthPercentage}%</div>
                                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Saúde da Rede</div>
                                                </div>
                                            </div>
                                        </Tooltip>
                                        <Tooltip text="Número total de problemas que requerem intervenção">
                                            <div className={`${cardClass} p-8 flex flex-col items-center justify-center text-center space-y-3 relative overflow-hidden group cursor-help`}>
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full -mr-12 -mt-12 transition-all group-hover:scale-150"></div>
                                                <span className="text-5xl">🛠️</span>
                                                <div>
                                                    <div className="text-4xl font-black text-slate-800">{missions.length}</div>
                                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ações Pendentes</div>
                                                </div>
                                            </div>
                                        </Tooltip>
                                    </div>

                                    {/* Lista de Estações (Boias) - Hierarquia Centralizada */}
                                    <div className="space-y-8 px-4">
                                        <div className="flex items-center gap-6">
                                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.4em] whitespace-nowrap">Estado das Estações</h3>
                                            <div className="flex-1 h-[2px] bg-slate-100"></div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-6">
                                            {boias.map(boia => {
                                                const boiaMissions = missions.filter(m => m.boiaId === boia.id);
                                                const isExpanded = agendaExpandida[boia.id];
                                                const hasUrgent = boiaMissions.some(m => m.type === 'critical');

                                                return (
                                                    <div key={boia.id} className={`${cardClass} transition-all ${isExpanded ? 'ring-2 ring-blue-500 shadow-2xl' : 'hover:border-blue-200'}`}>
                                                        {/* Cabeçalho do Card da Boia */}
                                                        <div 
                                                            onClick={() => toggleAgendaBoia(boia.id)}
                                                            className="p-8 flex flex-wrap items-center justify-between gap-6 cursor-pointer group"
                                                        >
                                                            <div className="flex items-center gap-6">
                                                                <Tooltip text={hasUrgent ? "Atenção: Problemas detetados" : "Estação em funcionamento normal"}>
                                                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg transition-all cursor-help ${hasUrgent ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-900 text-white'}`}>
                                                                        {hasUrgent ? '⚠️' : '🛰️'}
                                                                    </div>
                                                                </Tooltip>
                                                                <div>
                                                                    <h4 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-tight group-hover:text-blue-600">
                                                                        {boia.nome}
                                                                    </h4>
                                                                    <div className="flex items-center gap-3 mt-1">
                                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                                            {zonas.find(z => z.id === boia.zona_id)?.nome}
                                                                        </span>
                                                                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${boiaMissions.length > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                                            {boiaMissions.length} Tarefas Pendentes
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="flex items-center gap-6">
                                                                <Tooltip text="Estimativa de sujidade e desgaste físico" position="left">
                                                                    <div className="text-right hidden sm:block cursor-help">
                                                                        <div className="text-sm font-black text-slate-400 uppercase tracking-widest">Integridade Física</div>
                                                                        <div className={`text-lg font-black ${isOverdue(boia.ultima_manutencao, 15) ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                                            {Math.round(100 - getMaintenanceProgress(boia.ultima_manutencao, 15))}%
                                                                        </div>
                                                                    </div>
                                                                </Tooltip>
                                                                <div className={`w-10 h-10 rounded-full border-2 border-slate-100 flex items-center justify-center transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-blue-50 border-blue-200 text-blue-600' : 'text-slate-300 group-hover:text-blue-500'}`}>
                                                                    ▼
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Detalhes Expandidos (Drill-down) */}
                                                        {isExpanded && (
                                                            <div className="border-t border-slate-100 bg-slate-50/50 p-8 space-y-10 animate-fade-in">
                                                                
                                                                {/* Saúde Física */}
                                                                <section className="space-y-4">
                                                                    <div className="flex items-center justify-between">
                                                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Manutenção de Infraestrutura</h5>
                                                                        {isOverdue(boia.ultima_manutencao, 15) && (
                                                                            <span className="px-3 py-1 bg-rose-500 text-white text-[8px] font-black uppercase rounded-full">Intervenção Necessária</span>
                                                                        )}
                                                                    </div>
                                                                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 flex flex-wrap items-center justify-between gap-6 shadow-sm">
                                                                        <div className="flex items-center gap-4">
                                                                            <Tooltip text="Limpeza manual de algas e resíduos">
                                                                                <div className="text-3xl cursor-help">🧹</div>
                                                                            </Tooltip>
                                                                            <div>
                                                                                <span className="block text-sm font-black text-slate-800 uppercase tracking-widest">Limpeza e Verificação Física</span>
                                                                                <span className="text-sm font-bold text-slate-400">Última intervenção: {boia.ultima_manutencao ? new Date(boia.ultima_manutencao).toLocaleDateString('pt-PT') : 'Nunca'}</span>
                                                                            </div>
                                                                        </div>
                                                                        <Tooltip text="Clique após realizar a limpeza no rio" position="left">
                                                                          {!isLeitor && (
                                                                            <button 
                                                                                onClick={() => {
                                                                                    setBoiaDetalhe(boia);
                                                                                    setFormRelatorioManutencao({...formManutencao, tipo: 'limpeza', tipo_sensor_id: null});
                                                                                    setMostrarTourManutencao(true);
                                                                                }}
                                                                                className="bg-slate-900 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95"
                                                                            >
                                                                                Registar Intervenção 🛠️
                                                                            </button>
                                                                          )}
                                                                        </Tooltip>
                                                                    </div>
                                                                </section>

                                                                {/* Saúde dos Sensores */}
                                                                <section className="space-y-4">
                                                                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Calibração de Sensores</h5>
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                                                        {boia.limites?.map(lim => {
                                                                            const info = tiposSensor.find(t => t.id === lim.tipo_sensor_id);
                                                                            const overdue = isOverdue(lim.ultima_manutencao, lim.dias_proxima_manutencao);
                                                                            const progress = getMaintenanceProgress(lim.ultima_manutencao, lim.dias_proxima_manutencao);
                                                                            
                                                                            return (
                                                                                <div key={lim.tipo_sensor_id} className={`bg-white p-6 rounded-[2rem] border-2 transition-all shadow-sm ${overdue ? 'border-rose-200 bg-rose-50/30' : 'border-slate-100'}`}>
                                                                                    <div className="flex justify-between items-start mb-4">
                                                                                        <div className="flex items-center gap-3">
                                                                                            <Tooltip text={`Ícone: ${info?.nome}`}>
                                                                                                <span className="text-xl w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 cursor-help">
                                                                                                    {getIcon(lim.tipo_sensor_id)}
                                                                                                </span>
                                                                                            </Tooltip>
                                                                                            <div>
                                                                                                <span className="block text-sm font-black text-slate-500 uppercase tracking-widest">{info?.nome}</span>
                                                                                                {overdue && (
                                                                                                    <span className="text-base font-black uppercase text-rose-600">
                                                                                                        Excedido
                                                                                                    </span>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                        {!isLeitor && (
                                                                                            <div className="flex items-center gap-1">
                                                                                                <Tooltip text="Configurar Ciclos" position="top">
                                                                                                    <button 
                                                                                                        onClick={() => {
                                                                                                            setConfigurandoCiclos(`${boia.id}-${lim.tipo_sensor_id}`);
                                                                                                            setCiclosEditando({...ciclosEditando, [`${boia.id}-${lim.tipo_sensor_id}`]: {
                                                                                                                limpeza: lim.intervalo_limpeza_dias || 30,
                                                                                                                calibracao: lim.intervalo_calibracao_dias || 180,
                                                                                                                substituicao: lim.dias_proxima_manutencao || 365
                                                                                                            }});
                                                                                                        }}
                                                                                                        className="text-slate-300 hover:text-slate-600 transition-colors p-1"
                                                                                                    >⚙️</button>
                                                                                                </Tooltip>
                                                                                                <Tooltip text="Registar calibração manual" position="left">
                                                                                                    <button 
                                                                                                        onClick={() => {
                                                                                                            setBoiaDetalhe(boia);
                                                                                                            setFormRelatorioManutencao({...formManutencao, tipo: 'calibracao', tipo_sensor_id: lim.tipo_sensor_id});
                                                                                                            setMostrarTourManutencao(true);
                                                                                                        }}
                                                                                                        className="text-blue-500 hover:text-blue-700 transition-colors p-1"
                                                                                                    >🔧</button>
                                                                                                </Tooltip>
                                                                                            </div>
                                                                                        )}
                                                                                        </div>
                                                                                    
                                                                                    {configurandoCiclos === `${boia.id}-${lim.tipo_sensor_id}` ? (
                                                                                        <div className="space-y-4 mt-4 border-t border-slate-100 pt-4">
                                                                                            <div className="grid grid-cols-3 gap-3">
                                                                                                <div>
                                                                                                    <span className="text-xs font-black uppercase text-slate-400 block mb-1 text-center">Limpeza</span>
                                                                                                    <input type="number" value={ciclosEditando[`${boia.id}-${lim.tipo_sensor_id}`]?.limpeza} onChange={e => setCiclosEditando({...ciclosEditando, [`${boia.id}-${lim.tipo_sensor_id}`]: {...ciclosEditando[`${boia.id}-${lim.tipo_sensor_id}`], limpeza: e.target.value}})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-bold text-center outline-none focus:border-blue-500" />
                                                                                                </div>
                                                                                                <div>
                                                                                                    <span className="text-xs font-black uppercase text-slate-400 block mb-1 text-center">Calibração</span>
                                                                                                    <input type="number" value={ciclosEditando[`${boia.id}-${lim.tipo_sensor_id}`]?.calibracao} onChange={e => setCiclosEditando({...ciclosEditando, [`${boia.id}-${lim.tipo_sensor_id}`]: {...ciclosEditando[`${boia.id}-${lim.tipo_sensor_id}`], calibracao: e.target.value}})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-bold text-center outline-none focus:border-blue-500" />
                                                                                                </div>
                                                                                                <div>
                                                                                                    <span className="text-xs font-black uppercase text-slate-400 block mb-1 text-center">Substituição</span>
                                                                                                    <input type="number" value={ciclosEditando[`${boia.id}-${lim.tipo_sensor_id}`]?.substituicao} onChange={e => setCiclosEditando({...ciclosEditando, [`${boia.id}-${lim.tipo_sensor_id}`]: {...ciclosEditando[`${boia.id}-${lim.tipo_sensor_id}`], substituicao: e.target.value}})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-bold text-center outline-none focus:border-blue-500" />
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="flex gap-3">
                                                                                                <button onClick={() => handleSalvarCiclos(boia.id, lim.tipo_sensor_id)} className="flex-1 bg-emerald-500 text-white text-xs font-black uppercase py-2 rounded-lg hover:bg-emerald-600 transition-all shadow-sm">Guardar Alterações</button>
                                                                                                <button onClick={() => setConfigurandoCiclos(null)} className="bg-slate-200 text-slate-600 text-xs font-black uppercase px-4 py-2 rounded-lg hover:bg-slate-300 transition-all">Cancelar</button>
                                                                                            </div>
                                                                                        </div>
                                                                                    ) : (
                                                                                    <div className="space-y-3">
                                                                                        <div className="flex justify-between items-center uppercase tracking-tighter">
                                                                                            <span className="text-xs font-black text-slate-400">Próxima Intervenção</span>
                                                                                            <span className={`text-sm font-black ${overdue ? 'text-rose-600' : 'text-slate-700'}`}>
                                                                                                {calculateNextMaintenance(lim.ultima_manutencao, lim.dias_proxima_manutencao)}
                                                                                            </span>
                                                                                        </div>
                                                                                        <Tooltip text={`Ciclo de vida do sensor: ${Math.round(progress)}% decorrido`}>
                                                                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden cursor-help">
                                                                                                <div 
                                                                                                    className={`h-full transition-all duration-500 ${overdue ? 'bg-rose-500' : progress > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                                                                    style={{ width: `${Math.min(progress, 100)}%` }}
                                                                                                ></div>
                                                                                            </div>
                                                                                        </Tooltip>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </section>

                                                                {/* Tarefas Pendentes Específicas */}
                                                                {boiaMissions.length > 0 && (
                                                                    <section className="space-y-4">
                                                                        <h5 className="text-[10px] font-black text-rose-400 uppercase tracking-[0.3em]">Tarefas Urgentes</h5>
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                            {boiaMissions.map(mission => (
                                                                                <div key={mission.id} className="bg-white p-6 rounded-2xl border border-rose-100 flex items-center justify-between gap-6 shadow-sm group/mission">
                                                                                    <div className="flex items-center gap-4">
                                                                                        <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-lg">
                                                                                            {mission.type === 'critical' ? '🔴' : '🟠'}
                                                                                        </div>
                                                                                        <div>
                                                                                            <span className="block text-sm font-black text-slate-800 uppercase tracking-widest">{mission.title}</span>
                                                                                            <p className="text-[10px] font-bold text-slate-500 italic">"{mission.description}"</p>
                                                                                        </div>
                                                                                    </div>
                                                                                    <button 
                                                                                        onClick={mission.action}
                                                                                        className="bg-rose-500 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all opacity-0 group-hover/mission:opacity-100"
                                                                                    >
                                                                                        Resolver ⚡
                                                                                    </button>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </section>
                                                                )}

                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Tarefas Pendentes - Visão Global (Resumo) */}
                                    <div className="space-y-8 px-4">
                                        <div className="flex items-center gap-6">
                                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.4em] whitespace-nowrap">Intervenções Prioritárias</h3>
                                            <div className="flex-1 h-[2px] bg-slate-100"></div>
                                        </div>
                                        
                                        {missions.length === 0 ? (
                                            <div className="p-20 text-center bg-slate-900 rounded-[3rem] border-4 border-dashed border-slate-800">
                                                <div className="text-6xl mb-6">🛰️</div>
                                                <h3 className="text-2xl font-black text-white uppercase tracking-widest">Sistemas Nominais</h3>
                                                <p className="text-slate-500 font-bold mt-2 uppercase text-sm tracking-[0.3em]">Sem tarefas pendentes na rede HydroBox</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                                                {missions.map(mission => {
                                                    const typeStyles = {
                                                        critical: "border-rose-500 bg-rose-500/5 text-rose-500 shadow-rose-900/20",
                                                        warning: "border-amber-500 bg-amber-500/5 text-amber-500 shadow-amber-900/20",
                                                        inspection: "border-blue-500 bg-blue-500/5 text-blue-500 shadow-blue-900/20",
                                                        battery: "border-emerald-500 bg-emerald-500/5 text-emerald-500 shadow-emerald-900/20"
                                                    };
                                                    const badgeStyles = {
                                                        critical: "bg-rose-500 text-white",
                                                        warning: "bg-amber-500 text-slate-900",
                                                        inspection: "bg-blue-500 text-white",
                                                        battery: "bg-emerald-500 text-white"
                                                    };

                                                    const boia = boias.find(b => b.id === mission.boiaId);

                                                    return (
                                                        <div key={mission.id} className={`flex flex-col border-2 rounded-[2.5rem] p-8 space-y-6 transition-all hover:scale-[1.02] shadow-2xl ${typeStyles[mission.type]}`}>
                                                            <div className="flex justify-between items-start">
                                                                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${badgeStyles[mission.type]}`}>
                                                                    {mission.title}
                                                                </div>
                                                                <span className="text-2xl">{mission.type === 'critical' ? '🔴' : mission.type === 'warning' ? '🟠' : mission.type === 'inspection' ? '🧹' : '🔋'}</span>
                                                            </div>

                                                            <div className="space-y-2">
                                                                <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-tight">
                                                                    {boia?.nome}
                                                                    {mission.sensor && <span className="block text-sm text-slate-500 font-bold mt-1">Módulo: {mission.sensor.nome}</span>}
                                                                </h4>
                                                                <p className="text-sm font-bold text-slate-600 leading-relaxed italic">
                                                                    "{mission.description}"
                                                                </p>
                                                            </div>

                                                            <div className="pt-4 border-t border-slate-200/50 mt-auto flex flex-col gap-3">
                                                                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                                    <span>Localização</span>
                                                                    <span className="text-slate-900">{zonas.find(z => z.id === boia?.zona_id)?.nome}</span>
                                                                </div>
                                                                <button 
                                                                    onClick={mission.action}
                                                                    className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95 ${badgeStyles[mission.type]} hover:opacity-90`}
                                                                >
                                                                    Resolver Tarefa ⚡
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                )}

                {/* ABA 4: HUB DE REDE (INFRAESTRUTURA) */}
                {subAba === 'rede' && (
                    <div className="space-y-12 animate-fade-in relative">
                        {isHelpMode && <HelpPin text="📡 Torres de Comunicação: Aqui geres as antenas que recebem os dados das boias. Se uma boia estiver fora do círculo verde, pode perder o sinal!" className="absolute top-4 right-4" position="left" />}

                        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
                            <div>
                                <h2 className="text-5xl font-black text-slate-800 tracking-tight uppercase leading-none">Torres de Comunicação</h2>
                                <p className="text-slate-400 font-medium italic text-lg mt-2">Gestão de Antenas e Topologia de Cobertura de Sinal</p>
                            </div>
                        </header>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 px-4">
                                    {/* Formulário de Novo Gateway */}
                                    {(isAdmin || isTecnico) && (
                                        <div className="space-y-8 lg:col-span-1">
                                            <section className={`${cardClass} p-10 space-y-8 h-fit`}>
                                                <div className="flex items-center gap-4 border-b-4 border-emerald-500 pb-2">
                                                    <span className="text-3xl">📡</span>
                                                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Registar Torre</h3>
                                                </div>
                                                <form onSubmit={handleCriarGateway} className="space-y-6">
                                                    <div>
                                                        <label className={labelClass}>Nome da Torre</label>
                                                        <input 
                                                            type="text" required value={formGateway.nome}
                                                            onChange={e => setFormGateway({...formGateway, nome: e.target.value})}
                                                            className={inputClass} placeholder="Ex: Gateway Porto-01"
                                                        />
                                                    </div>
                                                    {user?.role === 'super_admin' && (
                                                        <div>
                                                            <label className={labelClass}>Pertence a / Rede</label>
                                                            <select 
                                                                value={formGateway.gatewayOwner} 
                                                                onChange={e => setFormGateway({...formGateway, gatewayOwner: e.target.value})} 
                                                                className={`${inputClass} appearance-none cursor-pointer`}
                                                            >
                                                                <option value="public">Rede Pública HydroBox (Comunitário)</option>
                                                                {empresas.map(emp => (
                                                                    <option key={emp.id} value={emp.id}>{emp.nome}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <label className={labelClass}>Endereço MAC (Fixo)</label>
                                                        <input 
                                                            type="text" required value={formGateway.mac_gateway}
                                                            onChange={e => setFormGateway({...formGateway, mac_gateway: e.target.value})}
                                                            className={`${inputClass} font-mono`} placeholder="AA:BB:CC:DD:EE:FF"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className={labelClass}>Latitude</label>
                                                            <input type="number" step="any" value={formGateway.latitude} onChange={e => setFormGateway({...formGateway, latitude: e.target.value})} className={inputClass} />
                                                        </div>
                                                        <div>
                                                            <label className={labelClass}>Longitude</label>
                                                            <input type="number" step="any" value={formGateway.longitude} onChange={e => setFormGateway({...formGateway, longitude: e.target.value})} className={inputClass} />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="flex justify-between items-end mb-2">
                                                            <label className={labelClass}>Raio de Cobertura (m)</label>
                                                            <button 
                                                                type="button"
                                                                onClick={() => {
                                                                    if (!formGateway.mac_gateway) return mostrarMensagem('Insira o MAC para calibrar.', 'erro');
                                                                    const minhasBoias = boias.filter(b => b.mac_gateway === formGateway.mac_gateway && b.latitude && b.longitude && b.rssi_ultimo);
                                                                    if (minhasBoias.length === 0) return mostrarMensagem('Sem boias ativas para calibrar.', 'erro');
                                                                    
                                                                    // Encontrar a boia mais distante que ainda tenha sinal estável (> -115)
                                                                    const boiasEstaveis = minhasBoias.filter(b => b.rssi_ultimo > -115);
                                                                    if (boiasEstaveis.length === 0) return mostrarMensagem('Sinal crítico em todas as boias.', 'erro');

                                                                    const distancias = boiasEstaveis.map(b => {
                                                                        if (!formGateway.latitude || !formGateway.longitude) return 0;
                                                                        return calculateDistance(Number(formGateway.latitude), Number(formGateway.longitude), Number(b.latitude), Number(b.longitude));
                                                                    });

                                                                    const maxDist = Math.max(...distancias);
                                                                    const raioSeguro = Math.ceil(maxDist * 1.1); // 10% de margem de segurança
                                                                    setFormGateway({ ...formGateway, raio_cobertura: raioSeguro });
                                                                    mostrarMensagem(`Raio calibrado para ${raioSeguro}m baseado na telemetria.`, 'sucesso');
                                                                }}
                                                                className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                                                            >
                                                                ⚡ Calibrar por Telemetria
                                                            </button>
                                                        </div>
                                                        <input type="number" value={formGateway.raio_cobertura} onChange={e => setFormGateway({...formGateway, raio_cobertura: e.target.value})} className={inputClass} />
                                                    </div>
                                                    <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-emerald-100">
                                                        Ativar Infraestrutura ⚡
                                                    </button>
                                                </form>
                                            </section>

                                            {/* Guia de Referência Técnica */}
                                            <section className="bg-slate-900 rounded-[2rem] p-8 text-white space-y-6 shadow-2xl border border-white/10">
                                                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                                                    <span className="text-2xl">📖</span>
                                                    <h4 className="text-lg font-black uppercase tracking-widest text-blue-400">Guia de Referência LoRa</h4>
                                                </div>
                                                
                                                <div className="space-y-6">
                                                    <div>
                                                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Alcance Típico (Raio)</span>
                                                        <ul className="text-base space-y-2 font-bold text-slate-300">
                                                            <li className="flex justify-between"><span>🏙️ Urbano Denso</span> <span className="text-white">500m - 1km</span></li>
                                                            <li className="flex justify-between"><span>🌳 Campo / Rio</span> <span className="text-white">2km - 5km</span></li>
                                                            <li className="flex justify-between"><span>🗼 Linha de Vista</span> <span className="text-white">Up to 10km</span></li>
                                                        </ul>
                                                    </div>

                                                    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Diagnóstico de Sinal (RSSI)</span>
                                                        <div className="grid grid-cols-2 gap-4 text-xs font-black uppercase tracking-tighter">
                                                            <div className="text-emerald-400 border-l-2 border-emerald-500 pl-2">
                                                                -30 a -90dBm
                                                                <span className="block text-slate-500 font-black lowercase italic mt-1 text-sm">Excelente</span>
                                                            </div>
                                                            <div className="text-amber-400 border-l-2 border-amber-500 pl-2">
                                                                -90 a -115dBm
                                                                <span className="block text-slate-500 font-black lowercase italic mt-1 text-sm">Estável</span>
                                                            </div>
                                                            <div className="text-rose-400 border-l-2 border-rose-500 pl-2 col-span-2 mt-2">
                                                                -115 a -130dBm
                                                                <span className="block text-slate-500 font-black lowercase italic mt-1 text-sm">Limite Crítico / Perda de Dados</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <p className="text-xs leading-relaxed text-slate-400 font-medium italic">
                                                        * A altura da antena do Gateway é o fator mais importante para o alcance real.
                                                    </p>
                                                </div>
                                            </section>
                                        </div>
                                    )}

                            {/* Lista de Gateways e Mapa de Cobertura */}
                            <section className={`space-y-8 ${(isAdmin || isTecnico) ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
                                <div className={`${cardClass} p-2 h-[500px] shadow-2xl relative overflow-hidden`}>
                                    {(isAdmin || isTecnico) && (
                                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900 text-white px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl pointer-events-none">
                                            📍 Clique no mapa para posicionar a torre
                                        </div>
                                    )}
                                    <MapContainer center={[39.7436, -8.8071]} zoom={13} style={{ height: '100%', width: '100%' }}>
                                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                        
                                        {/* Captura de clique para novo Gateway ou Edição */}
                                        <LocationMarker 
                                            position={
                                                editandoGatewayId 
                                                    ? (formEditGateway.latitude && formEditGateway.longitude ? [formEditGateway.latitude, formEditGateway.longitude] : null)
                                                    : (formGateway.latitude && formGateway.longitude ? [formGateway.latitude, formGateway.longitude] : null)
                                            }
                                            setPosition={(pos) => {
                                                if (editandoGatewayId) {
                                                    setFormEditGateway({...formEditGateway, latitude: pos.lat.toFixed(6), longitude: pos.lng.toFixed(6)});
                                                } else {
                                                    setFormGateway({...formGateway, latitude: pos.lat.toFixed(6), longitude: pos.lng.toFixed(6)});
                                                }
                                            }} 
                                        />

                                        {/* Desenhar Gateways e seus raios */}
                                        {gateways.map(gw => (
                                            <React.Fragment key={`gw-infra-${gw.id}`}>
                                                {gw.latitude && gw.longitude && (
                                                    <>
                                                        <Marker position={[gw.latitude, gw.longitude]} icon={towerIcon}>
                                                            <Popup>
                                                                <div className="p-2 font-black">
                                                                    <div className="text-blue-600 uppercase text-[10px] tracking-widest">Gateway Ativo</div>
                                                                    <div className="text-lg text-slate-800">{gw.nome}</div>
                                                                    <div className="mt-3 space-y-1.5">
                                                                        <div className="text-xs text-slate-500 uppercase tracking-widest flex justify-between gap-4 border-b border-slate-100 pb-1.5">
                                                                            <span>MAC Addr:</span> <span className="font-mono text-slate-700">{gw.mac_gateway}</span>
                                                                        </div>
                                                                        <div className="text-xs text-slate-500 uppercase tracking-widest flex justify-between gap-4 pt-1.5">
                                                                            <span>GPS:</span> <span className="font-mono text-slate-700">{Number(gw.latitude).toFixed(5)}, {Number(gw.longitude).toFixed(5)}</span>
                                                                        </div>
                                                                    </div>
                                                                    <a 
                                                                        href={`https://www.google.com/maps?q=${gw.latitude},${gw.longitude}`}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="block mt-4 text-center bg-indigo-600 text-white py-2.5 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-md"
                                                                    >
                                                                        Navegar GPS 🗺️
                                                                    </a>
                                                                </div>
                                                            </Popup>
                                                        </Marker>
                                                        <Circle 
                                                            center={[gw.latitude, gw.longitude]} 
                                                            radius={gw.raio_cobertura} 
                                                            pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.1, weight: 1 }}
                                                        />
                                                    </>
                                                )}
                                            </React.Fragment>
                                        ))}

                                        {/* Desenhar Boias e Linhas de Conexão */}
                                        {boias.map(boia => {
                                            if (!boia.latitude || !boia.longitude) return null;
                                            
                                            const meuGateway = gateways.find(gw => gw.mac_gateway === boia.mac_gateway);
                                            const dist = meuGateway ? calculateDistance(boia.latitude, boia.longitude, meuGateway.latitude, meuGateway.longitude) : null;
                                            const foraDeAlcance = dist && dist > meuGateway.raio_cobertura;

                                            return (
                                                <React.Fragment key={`boia-infra-${boia.id}`}>
                                                    <Marker position={[boia.latitude, boia.longitude]}>
                                                        <Popup>
                                                            <div className="p-2 font-black min-w-[200px]">
                                                                <div className="text-sm uppercase text-slate-400 tracking-widest">Estação Remota</div>
                                                                <div className="text-lg text-slate-800 mb-2">{boia.nome}</div>
                                                                
                                                                <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-100 mb-2 mt-3">
                                                                    <div className="text-xs text-slate-500 uppercase tracking-widest flex justify-between gap-2 border-b border-slate-200 pb-1.5">
                                                                        <span>MAC:</span> <span className="font-mono text-slate-700">{boia.mac_boia}</span>
                                                                    </div>
                                                                    <div className="text-xs text-slate-500 uppercase tracking-widest flex justify-between gap-2 border-b border-slate-200 py-1.5">
                                                                        <span>GPS:</span> <span className="font-mono text-slate-700">{Number(boia.latitude).toFixed(5)}, {Number(boia.longitude).toFixed(5)}</span>
                                                                    </div>
                                                                    <div className="text-xs text-slate-500 uppercase tracking-widest flex justify-between gap-2 pt-1.5">
                                                                        <span>Sinal (RSSI):</span> 
                                                                        <span className={`font-mono ${boia.rssi_ultimo > -100 ? 'text-emerald-500' : (boia.rssi_ultimo > -120 ? 'text-amber-500' : 'text-rose-500')}`}>
                                                                            {boia.rssi_ultimo ? `${boia.rssi_ultimo} dBm` : 'N/D'}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                {meuGateway && (
                                                                    <div className={`p-2 rounded-lg text-[10px] ${foraDeAlcance ? 'bg-rose-500 text-white animate-pulse' : 'bg-blue-50 text-blue-600 border border-blue-100'} mb-3`}>
                                                                        📡 Distância ao Hub: {Math.round(dist)}m
                                                                        {foraDeAlcance && <div className="font-black uppercase mt-1">⚠️ Fora de Alcance!</div>}
                                                                    </div>
                                                                )}
                                                                
                                                                <a 
                                                                    href={`https://www.google.com/maps?q=${boia.latitude},${boia.longitude}`}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="block text-center bg-indigo-600 text-white py-2.5 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-md"
                                                                >
                                                                    Navegar GPS 🗺️
                                                                </a>
                                                            </div>
                                                        </Popup>
                                                    </Marker>

                                                    {/* Linha visual de telemetria */}
                                                    {meuGateway && meuGateway.latitude && (
                                                        <Polyline 
                                                            positions={[
                                                                [boia.latitude, boia.longitude],
                                                                [meuGateway.latitude, meuGateway.longitude]
                                                            ]}
                                                            pathOptions={{ 
                                                                color: foraDeAlcance ? '#f43f5e' : '#3b82f6', 
                                                                weight: 2, 
                                                                dashArray: '10, 10',
                                                                opacity: 0.6 
                                                            }}
                                                        />
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </MapContainer>
                                </div>

                                {/* Grid de Cards de Gateways */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {gateways.map(gw => (
                                        editandoGatewayId === gw.id ? (
                                            <div key={gw.id} className={`${cardClass} p-8 flex flex-col justify-between border-l-8 border-amber-500`}>
                                                <h4 className="text-xl font-black mb-4 text-slate-800">Editar Torre: {gw.nome}</h4>
                                                <div className="space-y-4">
                                                    <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-black text-slate-800" placeholder="Nome" value={formEditGateway.nome || ''} onChange={e => setFormEditGateway({...formEditGateway, nome: e.target.value})} />
                                                    <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-black text-slate-800" placeholder="MAC Address" value={formEditGateway.mac_gateway || ''} onChange={e => setFormEditGateway({...formEditGateway, mac_gateway: e.target.value})} />
                                                    <div className="flex gap-2">
                                                        <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-black text-slate-800" placeholder="Latitude" value={formEditGateway.latitude || ''} onChange={e => setFormEditGateway({...formEditGateway, latitude: e.target.value})} />
                                                        <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-black text-slate-800" placeholder="Longitude" value={formEditGateway.longitude || ''} onChange={e => setFormEditGateway({...formEditGateway, longitude: e.target.value})} />
                                                    </div>
                                                    {user?.role === 'super_admin' && (
                                                        <select 
                                                            value={formEditGateway.gatewayOwner || 'public'} 
                                                            onChange={e => setFormEditGateway({...formEditGateway, gatewayOwner: e.target.value})} 
                                                            className="w-full mt-4 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-black text-slate-800"
                                                        >
                                                            <option value="public">Rede Pública HydroBox</option>
                                                            {empresas.map(emp => (
                                                                <option key={emp.id} value={emp.id}>{emp.nome}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                    <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest bg-amber-50 p-2 rounded-lg mt-4">💡 Dica: Clica no mapa ali em cima para atualizar as coordenadas automaticamente.</p>
                                                    <div className="flex justify-end gap-4 mt-6">
                                                        <button onClick={() => setEditandoGatewayId(null)} className="text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-600 transition-colors">Cancelar</button>
                                                        <button onClick={() => guardarEdicaoGateway(gw.id)} className="bg-amber-500 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-500/30 hover:bg-amber-600 hover:shadow-amber-500/50 transition-all">Guardar Torre</button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                        <div key={gw.id} className={`${cardClass} p-8 flex flex-col justify-between border-l-8 ${gw.estado === 'pendente' ? 'border-amber-500' : (isGatewayOffline(gw) ? 'border-rose-500 bg-rose-50/50' : 'border-emerald-500')}`}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">{gw.nome}</h4>
                                                    <code className="text-sm font-black text-slate-400 tracking-widest block mt-1">{gw.mac_gateway}</code>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${gw.estado === 'pendente' ? 'bg-amber-100 text-amber-600' : (isGatewayOffline(gw) ? 'bg-rose-100 text-rose-600 animate-pulse shadow-sm shadow-rose-200' : 'bg-emerald-100 text-emerald-600')}`}>
                                                        {gw.estado === 'pendente' ? 'Pendente' : (isGatewayOffline(gw) ? 'Offline ⚠️' : 'Ativo')}
                                                    </span>
                                                    <Tooltip text="Nível de Bateria do Gateway" position="left">
                                                        <span className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                                            🔋 {gw.bateria != null ? `${gw.bateria}%` : 'N/D'}
                                                        </span>
                                                    </Tooltip>
                                                </div>
                                            </div>
                                            <div className="mt-8 pt-6 border-t border-slate-100">
                                                <div className="flex justify-between items-end mb-4">
                                                    <div>
                                                        <span className="text-[10px] font-black text-slate-400 uppercase block tracking-widest">Boias Conectadas</span>
                                                        <span className="text-2xl font-black text-blue-600">{boias.filter(b => b.mac_gateway === gw.mac_gateway).length}</span>
                                                    </div>
                                                    <div className="flex gap-4 items-center">
                                                        {(isAdmin || isTecnico) && (
                                                            <Tooltip text="Ajustar raio de cobertura com base na distância real das boias" position="left">
                                                                <button 
                                                                    onClick={() => recalibrarRaioGateway(gw)}
                                                                    className="text-blue-500 hover:text-blue-700 text-[10px] font-black uppercase tracking-widest transition-colors"
                                                                >
                                                                    Recalibrar Raio ⚡
                                                                </button>
                                                            </Tooltip>
                                                        )}
                                                        {isAdmin && (
                                                            <div className="flex items-center gap-3">
                                                                <Tooltip text="Editar informação e localização" position="left">
                                                                    <button onClick={() => { setEditandoGatewayId(gw.id); setFormEditGateway({...gw}); }} className="text-amber-500 hover:text-amber-700 text-[10px] font-black uppercase tracking-widest transition-colors">Editar ✏️</button>
                                                                </Tooltip>
                                                                <span className="text-slate-200">|</span>
                                                                <Tooltip text="Remover este ponto de rede do sistema" position="left">
                                                                    <button onClick={() => removerGateway(gw.id)} className="text-rose-300 hover:text-rose-600 text-[10px] font-black uppercase tracking-widest transition-colors">Remover Torre 🗑️</button>
                                                                </Tooltip>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Lista de Boias Vinculadas (NOVO) */}
                                                <div className="space-y-2 max-h-40 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-100">
                                                    {boias.filter(b => b.mac_gateway === gw.mac_gateway).map(b => {
                                                        let ultimaMensagem = new Date();
                                                        if (b.leituras && b.leituras.length > 0) {
                                                            const tempos = b.leituras.map(l => {
                                                                const dh = l.data_hora;
                                                                const parseable = dh && typeof dh === 'string' && !dh.includes('T') ? dh.replace(' ', 'T') + 'Z' : dh;
                                                                return new Date(parseable).getTime();
                                                            }).filter(t => !isNaN(t));
                                                            if (tempos.length > 0) ultimaMensagem = new Date(Math.max(...tempos));
                                                        } else {
                                                            const rawDate = b.updated_at || b.created_at;
                                                            if (rawDate) {
                                                                const dataParse = typeof rawDate === 'string' && !rawDate.includes('T') ? rawDate.replace(' ', 'T') + 'Z' : rawDate;
                                                                ultimaMensagem = new Date(dataParse);
                                                            }
                                                        }
                                                        const minDesde = (new Date() - ultimaMensagem) / (1000 * 60);
                                                        const isOffline = minDesde > ((b.intervalo_segundos ? b.intervalo_segundos / 60 : 5) + 3) && b.estado === 'ativa';

                                                        return (
                                                            <div key={b.id} className={`flex items-center justify-between p-3 rounded-xl border group/item ${isOffline ? 'bg-slate-100 border-slate-200 opacity-60' : 'bg-slate-50 border-slate-100'}`}>
                                                                <div className="flex items-center gap-3">
                                                                <span className={`text-2xl ${isOffline ? 'grayscale' : ''}`}>🛰️</span>
                                                                <div>
                                                                    <span className="text-base font-black text-slate-700 block leading-none">{b.nome} {isOffline && <span className="text-[10px] text-rose-500 uppercase ml-2 tracking-widest">Offline</span>}</span>
                                                                    <span className="text-sm font-bold text-slate-400 uppercase tracking-tight mt-1">{b.mac_boia}</span>
                                                                </div>
                                                                </div>
                                                                <Tooltip text={`Sinal de rede: ${isOffline ? 'Sinal Perdido' : !b.rssi_ultimo ? 'Sem dados' : b.rssi_ultimo + ' dBm'}`} position="left">
                                                                    <div className="flex items-center gap-3 cursor-help">
                                                                    <span className={`text-sm font-black ${
                                                                        isOffline || !b.rssi_ultimo ? 'text-slate-400' :
                                                                        b.rssi_ultimo > -90 ? 'text-emerald-500' :
                                                                        b.rssi_ultimo > -115 ? 'text-amber-500' : 'text-rose-500'
                                                                    }`}>
                                                                        {isOffline ? 'Perdido' : b.rssi_ultimo ? `${b.rssi_ultimo} dBm` : '---'}
                                                                    </span>
                                                                        <div className={`flex gap-0.5 items-end h-2.5 ${isOffline ? 'grayscale opacity-50' : ''}`}>
                                                                            {[1, 2, 3].map(bar => {
                                                                                const strength = b.rssi_ultimo ? (b.rssi_ultimo + 140) / 110 : 0;
                                                                                return <div key={bar} className={`w-0.5 rounded-full ${strength > (bar/3) ? (strength > 0.6 ? 'bg-emerald-400' : 'bg-amber-400') : 'bg-slate-200'}`} style={{ height: `${bar * 33}%` }}></div>
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                </Tooltip>
                                                            </div>
                                                        );
                                                    })}
                                                    {boias.filter(b => b.mac_gateway === gw.mac_gateway).length === 0 && (
                                                        <div className="text-[10px] font-bold text-slate-300 italic text-center py-2 uppercase">Nenhuma boia vinculada</div>
                                                    )}
                                                </div>
                                            </div>
                                            </div>
                                        )
                                    ))}
                                    {gateways.length === 0 && (
                                        <div className="col-span-2 p-12 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-slate-400 font-bold">
                                            Nenhum gateway registado na infraestrutura.
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    </div>
                )}

            </div>

            {/* PAINEL LATERAL: FICHA TÉCNICA (HIGH-TECH) */}
            {boiaDetalhe && (
                <>
                    <div className="fixed inset-0 bg-slate-900/60 z-40 backdrop-blur-md transition-opacity" onClick={() => { setBoiaDetalhe(null); setEditandoBoia(false); }}></div>
                    
                    <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-slate-900 text-white z-50 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] flex flex-col animate-slide-in border-l border-white/10">
                        {/* Painel de Cabeçalho */}
                        <div className="p-10 border-b border-white/5 bg-gradient-to-br from-slate-800 to-slate-900 flex justify-between items-center">
                            <div className="space-y-1">
                                <h3 className="font-black text-3xl uppercase tracking-tighter text-blue-400">
                                    {editandoBoia ? 'Configuração' : 'Ficha Técnica'}
                                </h3>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Protocolo HydroBox v2.0</p>
                            </div>
                                <div className="flex gap-4">
                                {!isLeitor && (
                                    <button 
                                        onClick={() => {
                                            const novoEstado = !editandoBoia;
                                            setEditandoBoia(novoEstado);
                                            if (novoEstado) {
                                                setFormEditBoia({
                                                    ...boiaDetalhe,
                                                    nome: boiaDetalhe.nome || '',
                                                    mac_boia: boiaDetalhe.mac_boia || '',
                                                    mac_gateway: boiaDetalhe.mac_gateway || '',
                                                    latitude: boiaDetalhe.latitude || '',
                                                    longitude: boiaDetalhe.longitude || '',
                                                    localizacao_texto: boiaDetalhe.localizacao_texto || '',
                                                    bateria: boiaDetalhe.bateria ?? 100,
                                                    estado: boiaDetalhe.estado || 'ativa'
                                                });
                                                setAdicionandoSensor(false);
                                            }
                                        }} 
                                        className={`w-12 h-12 rounded-2xl transition-all flex items-center justify-center font-black ${editandoBoia ? 'bg-amber-500 text-white' : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'}`}
                                    >
                                        {editandoBoia ? '✕' : '✏️'}
                                    </button>
                                )}
                                <button onClick={() => { setBoiaDetalhe(null); setEditandoBoia(false); }} className="w-12 h-12 bg-white/5 hover:bg-rose-500 rounded-2xl flex items-center justify-center transition-all border border-white/10">✕</button>
                            </div>
                        </div>

                        {/* Painel de Corpo */}
                        <div id="aside-body" className="p-10 overflow-y-auto space-y-12 flex-1 scrollbar-thin scrollbar-thumb-white/10">
                            {/* Banner de Auto-Descoberta */}
                            {boiaDetalhe.limites?.some(l => l.is_configurado === false || l.is_configurado === 0) && (
                                <div className="bg-amber-500 p-6 rounded-[2rem] border-2 border-amber-400 shadow-xl shadow-amber-900/20 animate-pulse flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <span className="text-3xl">📡</span>
                                        <div>
                                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-tight">Novo Sensor Detetado!</h4>
                                            <p className="text-[10px] font-bold text-slate-800 uppercase tracking-tighter opacity-70">Hardware aguarda configuração inicial</p>
                                        </div>
                                    </div>
                                    {!isLeitor && (
                                        <button 
                                            onClick={() => setAdicionandoSensor(true)}
                                            className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-amber-600 transition-all shadow-lg"
                                        >
                                            Configurar Agora
                                        </button>
                                    )}
                                </div>
                            )}

                            {editandoBoia ? (
                                <form onSubmit={handleAtualizarBoia} className="space-y-8">
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-3">Nome da Estação</label>
                                                <input 
                                                    type="text" required value={formEditBoia.nome}
                                                    onChange={e => setFormEditBoia({...formEditBoia, nome: e.target.value})}
                                                    className="w-full p-4 bg-white/5 border-2 border-white/10 rounded-2xl font-black text-white focus:border-blue-500 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <div className="flex justify-between items-center mb-3">
                                                    <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">Zona de Operação</label>
                                                    <button 
                                                        type="button"
                                                        onClick={() => setIsModalZonasOpen(true)}
                                                        className="text-[10px] bg-blue-500/20 text-blue-300 hover:text-white hover:bg-blue-500 px-2 py-1 rounded transition-colors uppercase font-black"
                                                        title="Gerir Zonas"
                                                    >
                                                        ✏️ Gerir
                                                    </button>
                                                </div>
                                                <select 
                                                    required
                                                    value={formEditBoia.zona_id || ''}
                                                    onChange={e => setFormEditBoia({...formEditBoia, zona_id: e.target.value})}
                                                    className="w-full p-4 bg-white/5 border-2 border-white/10 rounded-2xl font-black text-white focus:border-blue-500 outline-none appearance-none"
                                                >
                                                    <option value="" disabled className="bg-slate-900">Selecione uma Zona</option>
                                                    {zonas.map(z => (
                                                        <option key={z.id} value={z.id} className="bg-slate-900">{z.nome}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-3">Status Operacional</label>
                                                <select 
                                                    value={formEditBoia.estado}
                                                    onChange={e => setFormEditBoia({...formEditBoia, estado: e.target.value})}
                                                    className="w-full p-4 bg-white/5 border-2 border-white/10 rounded-2xl font-black text-white focus:border-blue-500 outline-none appearance-none"
                                                >
                                                    <option value="ativa" className="bg-slate-900">Ativa</option>
                                                    <option value="manutencao" className="bg-slate-900">Manutenção</option>
                                                    <option value="erro" className="bg-slate-900">Erro</option>
                                                    <option value="offline" className="bg-slate-900">Offline</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-3">Bateria (%)</label>
                                                <input 
                                                    type="number" value={formEditBoia.bateria}
                                                    onChange={e => setFormEditBoia({...formEditBoia, bateria: e.target.value})}
                                                    className="w-full p-4 bg-white/5 border-2 border-white/10 rounded-2xl font-black text-white focus:border-blue-500 outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">Configurações de Energia</label>
                                            <div className="bg-white/5 p-4 rounded-2xl border-2 border-white/10 flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xl">💤</span>
                                                    <div>
                                                        <span className="text-[10px] font-black text-slate-500 uppercase block tracking-widest">Tempo de Hibernação</span>
                                                        <span className="text-xs font-bold text-slate-300 italic">(Deep Sleep)</span>
                                                    </div>
                                                </div>
                                                <select 
                                                    value={formEditBoia.intervalo_segundos || 300}
                                                    onChange={e => setFormEditBoia({...formEditBoia, intervalo_segundos: parseInt(e.target.value)})}
                                                    className="bg-slate-800 text-white border border-white/20 rounded-xl text-xs font-black uppercase px-4 py-2 outline-none focus:border-blue-500"
                                                >
                                                    <option value="60">1 Minuto</option>
                                                    <option value="300">5 Minutos</option>
                                                    <option value="900">15 Minutos</option>
                                                    <option value="3600">1 Hora</option>
                                                    <option value="21600">6 Horas</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">Interfaces de Rede (MAC)</label>
                                            <input 
                                                type="text" placeholder="MAC Boia" value={formEditBoia.mac_boia}
                                                onChange={e => setFormEditBoia({...formEditBoia, mac_boia: e.target.value})}
                                                className="w-full p-4 bg-white/5 border-2 border-white/10 rounded-2xl font-mono text-sm text-blue-300 outline-none focus:border-blue-500"
                                            />
                                            <select 
                                                value={formEditBoia.mac_gateway}
                                                onChange={e => setFormEditBoia({...formEditBoia, mac_gateway: e.target.value})}
                                                className="w-full p-4 bg-white/5 border-2 border-white/10 rounded-2xl font-black text-sm text-emerald-300 outline-none focus:border-emerald-500 appearance-none cursor-pointer"
                                            >
                                                <option value="" className="bg-slate-900">Selecionar Gateway Hub...</option>
                                                {gateways.map(gw => (
                                                    <option key={gw.id} value={gw.mac_gateway} className="bg-slate-900">
                                                        {gw.nome} ({gw.mac_gateway})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">Correção de Geo-Referência</label>
                                            <div className="h-48 w-full rounded-3xl overflow-hidden border-2 border-white/10 relative group shadow-2xl">
                                                <MapContainer center={[formEditBoia.latitude || 39.7436, formEditBoia.longitude || -8.8071]} zoom={13} style={{ height: '100%', width: '100%' }}>
                                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                                    <MapController center={[formEditBoia.latitude || 39.7436, formEditBoia.longitude || -8.8071]} />
                                                    <LocationMarker 
                                                        position={formEditBoia.latitude && formEditBoia.longitude ? [formEditBoia.latitude, formEditBoia.longitude] : null}
                                                        setPosition={(pos) => setFormEditBoia({...formEditBoia, latitude: pos.lat.toFixed(6), longitude: pos.lng.toFixed(6)})} 
                                                    />
                                                </MapContainer>
                                            </div>
                                            <input 
                                                type="text" placeholder="Morada / Ponto Ref" value={formEditBoia.localizacao_texto}
                                                onChange={e => setFormEditBoia({...formEditBoia, localizacao_texto: e.target.value})}
                                                className="w-full p-4 bg-white/5 border-2 border-white/10 rounded-2xl font-black text-sm outline-none focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                    <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black uppercase tracking-[0.3em] hover:bg-blue-500 shadow-2xl shadow-blue-500/20 transition-all">
                                        Atualizar Sistema 💾
                                    </button>
                                </form>
                            ) : (
                                <>
                                    <section className="space-y-6">
                                        <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                                            <label className="text-sm font-black text-blue-400 uppercase tracking-[0.4em] block mb-4">Identificação Principal</label>
                                            <div className="text-5xl font-black text-white tracking-tighter mb-2">{boiaDetalhe.nome}</div>
                                            
                                            {/* Cálculo de Estado Real para a Ficha Técnica */}
                                            {(() => {
                                                const ultimaMsg = boiaDetalhe.updated_at ? new Date(boiaDetalhe.updated_at) : new Date(boiaDetalhe.created_at);
                                                const minsDesdeUltima = (new Date() - ultimaMsg) / (1000 * 60);
                                                const isOff = minsDesdeUltima > 5 && boiaDetalhe.estado === 'ativa';
                                                
                                                return (
                                                    <div className="flex items-center gap-4">
                                                        <span className={`px-3 py-1 rounded-lg text-sm font-black uppercase tracking-widest border ${
                                                            isOff ? 'bg-slate-500/20 text-slate-400 border-slate-500/30' : 
                                                            boiaDetalhe.estado === 'ativa' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 
                                                            'bg-rose-500/20 text-rose-400 border-rose-500/30'
                                                        }`}>
                                                            ● {isOff ? 'Desconectada' : boiaDetalhe.estado}
                                                        </span>
                                                        <span className="px-3 py-1 bg-white/5 text-slate-400 rounded-lg text-sm font-black uppercase tracking-widest border border-white/10">
                                                            Bateria: {boiaDetalhe.bateria}%
                                                        </span>
                                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                            Atividade: {Math.floor(minsDesdeUltima)}m atrás
                                                        </span>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </section>

                                    <section className="space-y-4 px-2">
                                        <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 space-y-4">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1">Integridade Física</span>
                                                    <span className="text-sm font-bold text-slate-400 italic">Ciclo de Inspeção</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-lg font-black ${isOverdue(boiaDetalhe.ultima_manutencao, 15) ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                        {Math.round(100 - getMaintenanceProgress(boiaDetalhe.ultima_manutencao, 15))}%
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            {/* Barra de Progresso */}
                                            <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/10 p-0.5">
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-1000 ${isOverdue(boiaDetalhe.ultima_manutencao, 15) ? 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]' : 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]'}`}
                                                    style={{ width: `${100 - getMaintenanceProgress(boiaDetalhe.ultima_manutencao, 15)}%` }}
                                                ></div>
                                            </div>

                                            <div className="flex justify-between items-center pt-2">
                                                <div>
                                                    <span className="text-[10px] font-black text-slate-500 uppercase block">Última Limpeza</span>
                                                    <span className="text-sm font-bold text-blue-300">
                                                        {boiaDetalhe.ultima_manutencao ? new Date(boiaDetalhe.ultima_manutencao).toLocaleDateString('pt-PT') : 'Sem registo'}
                                                    </span>
                                                </div>
                                                {!isLeitor && (
                                                    <button 
                                                        onClick={() => setMostrarTourManutencao(true)}
                                                        className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2"
                                                    >
                                                        <span>🛠️</span> Registar Intervenção
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </section>

                                    {/* HISTÓRICO DE INTERVENÇÕES (MELHORADO) */}
                                    <section className="space-y-6 px-2">
                                        <label className="text-base font-black text-blue-400 uppercase tracking-[0.4em] block">Histórico de Campo</label>
                                        <div className="space-y-4">
                                            {boiaDetalhe.manutencoes && boiaDetalhe.manutencoes.length > 0 ? (
                                                boiaDetalhe.manutencoes.slice(0, 8).map(m => (
                                                    <div key={m.id} className="bg-white/5 p-6 rounded-[2rem] border border-white/10 flex gap-6 items-start group hover:bg-white/10 transition-all">
                                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg text-2xl ${
                                                            m.estado_geral === 'bom' ? 'bg-emerald-500/20 text-emerald-400' : 
                                                            m.estado_geral === 'regular' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'
                                                        }`}>
                                                            {m.tipo === 'limpeza' ? '🧹' : m.tipo === 'calibracao' ? '🔧' : '🛠️'}
                                                        </div>
                                                        <div className="flex-1 space-y-2">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-xs font-black uppercase tracking-widest text-blue-400">
                                                                    {m.tipo} {m.tipo_sensor ? `(${m.tipo_sensor.nome})` : ''}
                                                                </span>
                                                                <span className="text-xs font-bold text-slate-500">{new Date(m.data_intervencao).toLocaleDateString('pt-PT')}</span>
                                                            </div>
                                                            <p className="text-sm text-slate-200 leading-relaxed font-medium italic">"{m.observacoes || 'Sem notas registadas.'}"</p>
                                                            <div className="pt-2 border-t border-white/5 flex justify-between items-center">
                                                                <span className="text-[10px] font-black text-slate-500 uppercase">Técnico: <span className="text-slate-300">{m.user?.name}</span></span>
                                                                {m.estado_geral && (
                                                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-white/5 text-slate-400">Estado: {m.estado_geral}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center p-12 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10 text-slate-500 text-sm font-bold uppercase tracking-widest">
                                                    Sem intervenções registadas
                                                </div>
                                            )}
                                        </div>
                                    </section>

                                    <section className="space-y-6">
                                        <div className="flex justify-between items-center px-2">
                                            <label className="text-sm font-black text-blue-400 uppercase tracking-[0.4em] block">Limites Operacionais</label>
                                            {!isLeitor && (
                                                <button 
                                                    onClick={() => {
                                                        setAdicionandoSensor(!adicionandoSensor);
                                                        setManutencao({ ...manutencao, boia_id: boiaDetalhe.id });
                                                    }}
                                                    className="text-[10px] font-black text-emerald-400 uppercase tracking-widest border border-emerald-400/30 px-3 py-1 rounded-lg hover:bg-emerald-400/10 transition-all"
                                                >
                                                    {adicionandoSensor ? 'Fechar' : '+ Adicionar Sensor'}
                                                </button>
                                            )}
                                        </div>

                                        {adicionandoSensor && (
                                            <div id="sensor-config-form" className="bg-emerald-600/10 border-2 border-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.2)] p-8 rounded-[2.5rem] space-y-6 animate-fade-in">
                                                <div className="space-y-2">
                                                    <h4 className="text-2xl font-black text-white uppercase tracking-tighter">
                                                        🔧 CALIBRAÇÃO: {tiposSensor.find(t => t.id === Number(manutencao.tipo_sensor_id))?.nome || 'NOVO SENSOR'}
                                                    </h4>
                                                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                                                        Ajuste os parâmetros VLE para sincronização imediata com a rede.
                                                    </p>
                                                </div>
                                                <div className="space-y-4">
                                                    <select
                                                        required value={manutencao.tipo_sensor_id}
                                                        onChange={e => setManutencao({ ...manutencao, tipo_sensor_id: e.target.value })}
                                                        className="w-full p-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white font-black text-sm outline-none focus:border-emerald-500"
                                                    >
                                                        <option value="" className="bg-slate-900">Selecionar Parâmetro...</option>
                                                        {tiposSensor.filter(t => 
                                                            !boiaDetalhe.limites?.some(l => l.tipo_sensor_id === t.id) || 
                                                            t.id === Number(manutencao.tipo_sensor_id)
                                                        ).map(t => <option key={t.id} value={t.id} className="bg-slate-900">{t.nome} ({t.unidade})</option>)}
                                                    </select>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <input type="number" step="any" placeholder="Min VLE" value={manutencao.valor_minimo} onChange={e => setManutencao({ ...manutencao, valor_minimo: e.target.value })} className="w-full p-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white font-black text-sm outline-none focus:border-emerald-500" />
                                                        <input type="number" step="any" placeholder="Max VLE" value={manutencao.valor_maximo} onChange={e => setManutencao({ ...manutencao, valor_maximo: e.target.value })} className="w-full p-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white font-black text-sm outline-none focus:border-emerald-500" />
                                                    </div>
                                                    <input type="number" placeholder="Ciclo Manut. (Dias)" value={manutencao.dias_proxima_manutencao} onChange={e => setManutencao({ ...manutencao, dias_proxima_manutencao: e.target.value })} className="w-full p-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white font-black text-sm outline-none focus:border-emerald-500" />
                                                    <button 
                                                        onClick={handleAdicionarSensorExistente}
                                                        className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20"
                                                    >
                                                        Sincronizar Hardware ⚡
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 gap-6">
                                            {boiaDetalhe.limites?.map(lim => {
                                                const info = tiposSensor.find(t => t.id === lim.tipo_sensor_id);
                                                return (
                                                    <div key={lim.tipo_sensor_id} className="bg-slate-800/40 p-8 rounded-[2.5rem] border border-white/5 space-y-6 relative group/sensor">
                                                        {!isLeitor && (
                                                            <button 
                                                                onClick={() => {
                                                                    setAdicionandoSensor(true);
                                                                    setManutencao({
                                                                        boia_id: boiaDetalhe.id,
                                                                        tipo_sensor_id: lim.tipo_sensor_id,
                                                                        valor_minimo: lim.valor_minimo,
                                                                        valor_maximo: lim.valor_maximo,
                                                                        dias_proxima_manutencao: lim.dias_proxima_manutencao
                                                                    });
                                                                    document.getElementById('aside-body')?.scrollTo({ top: 0, behavior: 'smooth' });
                                                                }}
                                                                className="absolute top-6 right-6 text-[10px] font-black text-blue-400 opacity-0 group-hover/sensor:opacity-100 transition-all uppercase tracking-widest border border-blue-400/30 px-3 py-1 rounded-lg hover:bg-blue-400/10"
                                                            >
                                                                Re-Calibrar 🔧
                                                            </button>
                                                        )}
                                                        <div className="flex items-center gap-4">
                                                            <span className="text-3xl bg-white/5 w-14 h-14 rounded-2xl flex items-center justify-center border border-white/10">
                                                                {getIcon(lim.tipo_sensor_id)}
                                                            </span>
                                                            <div>
                                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block">Módulo do Sensor</span>
                                                                <span className="text-lg font-black text-blue-400 uppercase tracking-widest">{info?.nome}</span>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-10">
                                                            <div className="space-y-2">
                                                                <span className="text-sm font-black text-slate-500 uppercase tracking-widest">Mínimo (VLE)</span>
                                                                <div className="text-4xl font-black text-white">
                                                                    {lim.valor_minimo} <small className="text-sm font-bold text-slate-500">{info?.unidade}</small>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <span className="text-sm font-black text-slate-500 uppercase tracking-widest">Máximo (VLE)</span>
                                                                <div className="text-4xl font-black text-white">
                                                                    {lim.valor_maximo} <small className="text-sm font-bold text-slate-500">{info?.unidade}</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-end">
                                                            <div>
                                                                <span className="text-[10px] font-black text-slate-500 uppercase block">Próxima Manutenção</span>
                                                                <span className={`text-sm font-bold ${isOverdue(lim.ultima_manutencao, lim.dias_proxima_manutencao) ? 'text-rose-400' : 'text-slate-300'}`}>
                                                                    {calculateNextMaintenance(lim.ultima_manutencao, lim.dias_proxima_manutencao)}
                                                                </span>
                                                            </div>
                                                            {isOverdue(lim.ultima_manutencao, lim.dias_proxima_manutencao) && (
                                                                <span className="text-rose-500 animate-pulse text-[10px] font-black uppercase tracking-widest">⚠️ Excedido</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </section>

                                    <section className="space-y-6">
                                        <label className="text-sm font-black text-blue-400 uppercase tracking-[0.4em] block px-2">Componentes de Hardware</label>
                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="bg-slate-800/50 p-6 rounded-3xl border border-white/5 flex justify-between items-center group">
                                                <div>
                                                    <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">MAC: Unidade de Sensores</span>
                                                    <code className="text-blue-400 font-black tracking-widest">{boiaDetalhe.mac_boia}</code>
                                                </div>
                                                <div className="w-2 h-2 bg-blue-500 rounded-full group-hover:animate-ping"></div>
                                            </div>
                                            <div className="bg-slate-800/50 p-6 rounded-3xl border border-white/5 flex justify-between items-center group">
                                                <div>
                                                    <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">MAC: Gateway</span>
                                                    <code className="text-emerald-400 font-black tracking-widest">{boiaDetalhe.mac_gateway}</code>
                                                </div>
                                                <div className="w-2 h-2 bg-emerald-500 rounded-full group-hover:animate-ping"></div>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="space-y-6">
                                        <label className="text-sm font-black text-blue-400 uppercase tracking-[0.4em] block px-2">Coordenadas Geográficas</label>
                                        <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 space-y-6">
                                            <div className="flex justify-between items-center">
                                                <div className="space-y-1">
                                                    <span className="text-sm font-black text-slate-500 uppercase tracking-widest">Latitude</span>
                                                    <div className="text-xl font-black">{boiaDetalhe.latitude}</div>
                                                </div>
                                                <div className="w-px h-10 bg-white/10"></div>
                                                <div className="space-y-1">
                                                    <span className="text-sm font-black text-slate-500 uppercase tracking-widest">Longitude</span>
                                                    <div className="text-xl font-black">{boiaDetalhe.longitude}</div>
                                                </div>
                                                <a 
                                                    href={`https://www.google.com/maps?q=${boiaDetalhe.latitude},${boiaDetalhe.longitude}`} 
                                                    target="_blank" 
                                                    className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/40"
                                                >📍</a>
                                            </div>
                                            <div className="pt-6 border-t border-white/5">
                                                <span className="text-sm font-black text-slate-500 uppercase block mb-2 tracking-widest">Descrição do Local</span>
                                                <p className="font-bold text-slate-300 italic text-sm">"{boiaDetalhe.localizacao_texto || 'Coordenadas Brutas'}"</p>
                                            </div>
                                        </div>
                                    </section>
                                </>
                            )}
                        </div>
                        
                        {/* Painel de Rodapé */}
                        <div className="p-10 bg-slate-950 border-t border-white/5 space-y-4">
                            {isAdmin && (
                                <button 
                                    onClick={() => removerBoia(boiaDetalhe.id)}
                                    className="w-full bg-rose-500/10 text-rose-500 font-black py-4 rounded-2xl hover:bg-rose-500 hover:text-white transition-all uppercase text-[10px] tracking-[0.3em] border border-rose-500/20"
                                >
                                    Eliminar Estação 🗑️
                                </button>
                            )}
                            <button 
                                onClick={() => { setBoiaDetalhe(null); setEditandoBoia(false); }} 
                                className="w-full bg-white/5 text-slate-400 font-black py-4 rounded-2xl hover:bg-white/10 transition-all uppercase text-[10px] tracking-[0.3em]"
                            >
                                Fechar Painel
                            </button>
                        </div>
                    </div>
                </>
            )}

            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes glowPulse {
                    0% { box-shadow: 0 0 5px rgba(244, 63, 94, 0.2); border-color: rgba(244, 63, 94, 0.3); }
                    50% { box-shadow: 0 0 25px rgba(244, 63, 94, 0.6); border-color: rgba(244, 63, 94, 0.8); }
                    100% { box-shadow: 0 0 5px rgba(244, 63, 94, 0.2); border-color: rgba(244, 63, 94, 0.3); }
                }
                .animate-slide-in {
                    animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .animate-fade-in {
                    animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .urgent-glow {
                    animation: glowPulse 2s infinite ease-in-out;
                }
            `}</style>

            {/* MODAL DE RELATÓRIO DE MANUTENÇÃO */}
            {mostrarModalManutencao && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setMostrarTourManutencao(false)}></div>
                    <div className="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-fade-in border border-slate-100">
                        <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tighter text-blue-400">
                                    {formManutencao.tipo_sensor_id 
                                        ? `Calibração: ${tiposSensor.find(t => t.id === Number(formManutencao.tipo_sensor_id))?.nome}` 
                                        : 'Relatório de Campo'}
                                </h3>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Intervenção em {boiaDetalhe?.nome}</p>
                            </div>
                            <button onClick={() => setMostrarTourManutencao(false)} className="text-slate-500 hover:text-white transition-colors text-2xl">✕</button>
                        </div>
                        
                        <form onSubmit={handleSubmeterManutencao} className="p-10 space-y-8">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className={labelClass}>Tipo de Trabalho</label>
                                    <select 
                                        value={formManutencao.tipo}
                                        onChange={e => {
                                            const novoTipo = e.target.value;
                                            let novaChecklist = {};
                                            if (novoTipo === 'limpeza') {
                                                novaChecklist = { casco: true, sensores: true, vedacao: true, antena: true };
                                            } else if (novoTipo === 'calibracao') {
                                                novaChecklist = { calib: true, valida: true, eletrodo: true, bateria: true };
                                            } else {
                                                novaChecklist = { peca: true, agua: true, bateria: true, envio: true };
                                            }
                                            setFormRelatorioManutencao({...formManutencao, tipo: novoTipo, checklist: novaChecklist});
                                        }}
                                        className={inputClass}
                                    >
                                        <option value="limpeza">Limpeza Geral</option>
                                        <option value="calibracao">Calibração</option>
                                        <option value="reparacao">Reparação Física</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Estado após Intervenção</label>
                                    <select 
                                        value={formManutencao.estado_geral}
                                        onChange={e => setFormRelatorioManutencao({...formManutencao, estado_geral: e.target.value})}
                                        className={inputClass}
                                    >
                                        <option value="bom">Totalmente Operacional (Bom)</option>
                                        <option value="regular">Requer Vigilância (Regular)</option>
                                        <option value="critico">Necessita Peças (Crítico)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Checklist de Verificação</label>
                                <div className="grid grid-cols-2 gap-4">
                                    {(() => {
                                        let items = [];
                                        if (formManutencao.tipo === 'limpeza') {
                                            items = [
                                                { id: 'casco', label: 'Casco Limpo (Algas)' },
                                                { id: 'sensores', label: 'Sensores Lavados' },
                                                { id: 'vedacao', label: 'Vedações Estanques' },
                                                { id: 'antena', label: 'Antena LoRa OK' }
                                            ];
                                        } else if (formManutencao.tipo === 'calibracao') {
                                            items = [
                                                { id: 'calib', label: formManutencao.tipo_sensor_id ? 'Calibração Efetuada' : 'Calibração Geral' },
                                                { id: 'valida', label: 'Valores Validados' },
                                                { id: 'eletrodo', label: 'Elétrodo Limpo' },
                                                { id: 'bateria', label: 'Energia Verificada' }
                                            ];
                                        } else {
                                            items = [
                                                { id: 'peca', label: 'Componente Trocado' },
                                                { id: 'agua', label: 'Teste de Água OK' },
                                                { id: 'bateria', label: 'Nova Bateria/Carga' },
                                                { id: 'envio', label: 'Teste de Envio OK' }
                                            ];
                                        }

                                        return items.map(item => (
                                            <label key={item.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-blue-50 transition-all border border-slate-100 group/check">
                                                <input 
                                                    type="checkbox" 
                                                    checked={formManutencao.checklist[item.id] || false}
                                                    onChange={e => setFormRelatorioManutencao({
                                                        ...formManutencao, 
                                                        checklist: { ...formManutencao.checklist, [item.id]: e.target.checked }
                                                    })}
                                                    className="w-6 h-6 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500 transition-all group-hover/check:scale-110"
                                                />
                                                <span className="text-sm font-black text-slate-700 uppercase tracking-tight">{item.label}</span>
                                            </label>
                                        ));
                                    })()}
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Observações Técnicas</label>
                                <textarea 
                                    value={formManutencao.observacoes}
                                    onChange={e => setFormRelatorioManutencao({...formManutencao, observacoes: e.target.value})}
                                    placeholder="Descreva o que encontrou no terreno..."
                                    className={`${inputClass} h-32 resize-none pt-4`}
                                />
                            </div>

                            <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-2xl font-black uppercase tracking-[0.3em] shadow-xl shadow-blue-200 hover:bg-slate-900 transition-all active:scale-95">
                                Submeter Relatório 🚀
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL DE GESTÃO DE ZONAS */}
            {isModalZonasOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col relative animate-fade-in-up">
                        <div className="p-8 pb-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Gerir Zonas</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Organização de Localizações</p>
                            </div>
                            <button onClick={() => setIsModalZonasOpen(false)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors shadow-sm">
                                ✕
                            </button>
                        </div>
                        
                        <div className="p-8 overflow-y-auto flex-1 bg-slate-50/50">
                            {/* Formulário de Nova Zona */}
                            <form onSubmit={handleCriarZona} className="mb-8 p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Criar Nova Zona</h4>
                                <div className="flex flex-col md:flex-row gap-4">
                                    <input type="text" required placeholder="Nome da Zona (ex: Rio Lis)" value={formNovaZona.nome} onChange={e => setFormNovaZona({...formNovaZona, nome: e.target.value})} className={`${inputClass} flex-1`} />
                                    <input type="text" placeholder="Concelho (ex: Leiria)" value={formNovaZona.concelho} onChange={e => setFormNovaZona({...formNovaZona, concelho: e.target.value})} className={`${inputClass} flex-1`} />
                                    <button type="submit" className="bg-blue-600 text-white px-6 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-colors">Adicionar</button>
                                </div>
                            </form>

                            {/* Lista de Zonas Existentes */}
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Zonas Existentes</h4>
                            <div className="space-y-4">
                                {zonas.map(z => (
                                    editandoZonaId === z.id ? (
                                        <div key={z.id} className="p-6 bg-amber-50 rounded-2xl border border-amber-200">
                                            <div className="flex flex-col md:flex-row gap-4">
                                                <input type="text" value={formEditZona.nome} onChange={e => setFormEditZona({...formEditZona, nome: e.target.value})} className={`${inputClass} flex-1`} />
                                                <input type="text" value={formEditZona.concelho} onChange={e => setFormEditZona({...formEditZona, concelho: e.target.value})} className={`${inputClass} flex-1`} />
                                            </div>
                                            <div className="flex justify-end gap-3 mt-4">
                                                <button onClick={() => setEditandoZonaId(null)} className="text-[10px] text-slate-400 font-black uppercase tracking-widest hover:text-slate-600">Cancelar</button>
                                                <button onClick={() => guardarEdicaoZona(z.id)} className="bg-amber-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600">Guardar</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div key={z.id} className="p-4 bg-white rounded-2xl border border-slate-100 flex items-center justify-between group shadow-sm hover:border-blue-200 transition-colors">
                                            <div>
                                                <h5 className="font-black text-slate-800">{z.nome}</h5>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{z.concelho}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => {setEditandoZonaId(z.id); setFormEditZona({...z});}} className="p-2 text-amber-500 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">✏️</button>
                                                <button onClick={() => removerZona(z.id)} className="p-2 text-rose-500 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors">🗑️</button>
                                            </div>
                                        </div>
                                    )
                                ))}
                                {zonas.length === 0 && <p className="text-center text-slate-400 text-sm font-bold italic py-4">Sem zonas registadas.</p>}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
