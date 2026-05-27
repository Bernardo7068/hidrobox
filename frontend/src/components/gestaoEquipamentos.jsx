import { useState, useEffect } from 'react';
import api from '../api';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix para os ícones do Leaflet
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

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

export default function GestaoEquipamentos() {
    // Simulação de obtenção do utilizador do localStorage (ou contexto)
    const user = JSON.parse(localStorage.getItem('user') || '{"role": "leitor_empresa"}');
    const isSuperAdmin = user.role === 'super_admin';
    const isAdmin = user.role === 'admin_empresa' || isSuperAdmin;
    const isTecnico = user.role === 'tecnico_empresa';
    const isLeitor = user.role === 'leitor_empresa';

    const [subAba, setSubAba] = useState('inventario');

    const [zonas, setZonas] = useState([]);
    const [boias, setBoias] = useState([]);
    const [tiposSensor, setTiposSensor] = useState([]);

    // Estado para controlar o Painel Lateral de Ficha Técnica
    const [boiaDetalhe, setBoiaDetalhe] = useState(null);
    const [editandoBoia, setEditandoBoia] = useState(false);
    const [adicionandoSensor, setAdicionandoSensor] = useState(false);
    const [formEditBoia, setFormEditBoia] = useState({});
    const [limitesEditando, setLimitesEditando] = useState({});

    // Estado do Formulário da Boia (Criação do zero)
    const [formBoia, setFormBoia] = useState({
        mac_boia: '', mac_gateway: '', nome: '', zona_id: '', latitude: '', longitude: '', localizacao_texto: ''
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

    // Estado para controlar a expansão das boias na Agenda Técnica
    const [agendaExpandida, setAgendaExpandida] = useState({});

    const toggleAgendaBoia = (id) => {
        setAgendaExpandida(prev => ({ ...prev, [id]: !prev[id] }));
    };

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

    useEffect(() => { 
        carregarDadosIniciais(); 
        // Polling apenas se estivermos no inventário para ver leituras em tempo real
        const intervalo = setInterval(() => {
            if (subAba === 'inventario') carregarDadosIniciais();
        }, 4000);
        return () => clearInterval(intervalo);
    }, [subAba]);

    const carregarDadosIniciais = async () => {
        try {
            const [resZonas, resBoias, resTipos] = await Promise.all([
                api.get('/zonas'), api.get('/boias'), api.get('/tipos-sensor')
            ]);

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

            // Sincronizar boiaDetalhe se estiver aberta
            if (boiaDetalhe) {
                const boiaAtualizada = boiasComLeituras.find(b => b.id === boiaDetalhe.id);
                if (boiaAtualizada) setBoiaDetalhe(boiaAtualizada);
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
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

    // Estilos comuns
    const cardClass = "bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden";
    const labelClass = "text-xs font-black uppercase tracking-widest text-slate-400 mb-2 block";
    const inputClass = "w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300";

    const tabBase = "flex items-center gap-3 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 border-2 border-transparent cursor-pointer";
    const tabActive = "bg-white text-blue-600 shadow-xl shadow-blue-900/10 border-blue-100 scale-[1.05]";
    const tabInactive = "text-slate-400 hover:bg-white/50 hover:text-slate-600";

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-12">
            
            {/* Header / Navegação por Abas */}
            <div className="bg-slate-100/50 p-2 rounded-[2.5rem] flex flex-wrap gap-2">
                <button
                    onClick={() => setSubAba('inventario')}
                    className={`${tabBase} ${subAba === 'inventario' ? tabActive : tabInactive}`}
                >
                    <span className="text-xl">🖥️</span> Monitorização
                </button>
                {isAdmin && (
                    <button
                        onClick={() => setSubAba('nova')}
                        className={`${tabBase} ${subAba === 'nova' ? tabActive : tabInactive}`}
                    >
                        <span className="text-xl">➕</span> Novo Registo
                    </button>
                )}
                {(isAdmin || isTecnico) && (
                    <button
                        onClick={() => setSubAba('agenda')}
                        className={`${tabBase} ${subAba === 'agenda' ? tabActive : tabInactive}`}
                    >
                        <span className="text-xl">📅</span> Agenda Técnica
                    </button>
                )}
            </div>

            {mensagem.texto && (
                <div className={`p-4 rounded-2xl text-center text-xs font-black uppercase tracking-[0.2em] animate-bounce shadow-lg ${mensagem.tipo === 'sucesso' ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-rose-500 text-white shadow-rose-200'}`}>
                    {mensagem.texto}
                </div>
            )}

            {/* Área de Conteúdo */}
            <div className="space-y-12">

                {/* ABA 1: MONITORIZAÇÃO */}
                {subAba === 'inventario' && (
                    <div className="space-y-16">
                        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
                            <div>
                                <h2 className="text-5xl font-black text-slate-800 tracking-tight">Rede de Ativos</h2>
                                <p className="text-slate-400 font-medium text-lg mt-2 italic">Controlo de telemetria e integridade de hardware</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    Total Estações: <span className="text-blue-600 text-lg ml-1">{boias.length}</span>
                                </div>
                            </div>
                        </header>

                        {boiasPorZona.map(zona => (
                            <div key={zona.id} className="space-y-8">
                                <div className="flex items-center gap-6 px-4">
                                    <div className="w-12 h-12 bg-indigo-800 text-white rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-indigo-100 font-black">
                                        {zona.nome.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">{zona.nome}</h3>
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">{zona.concelho} • {zona.instalacoes.length} Unidades</p>
                                    </div>
                                    <div className="flex-1 h-[2px] bg-slate-100"></div>
                                </div>

                                <div className="grid grid-cols-1 gap-8">
                                    {zona.instalacoes.map(boia => {
                                        const IDsLeituras = boia.leituras ? boia.leituras.map(l => l.tipo_sensor_id) : [];
                                        const IDsLimites = boia.limites ? boia.limites.map(l => l.tipo_sensor_id) : [];
                                        const IDsSensoresDetetados = [...new Set([...IDsLeituras, ...IDsLimites])];

                                        return (
                                            <div 
                                                key={boia.id} 
                                                onClick={() => setBoiaDetalhe(boia)}
                                                className={`${cardClass} p-10 hover:border-blue-300 transition-all hover:shadow-2xl hover:shadow-blue-900/10 cursor-pointer group relative`}
                                            >
                                                {/* Indicador de Estado */}
                                                <div className="absolute top-0 right-0 p-8 flex flex-col items-end gap-2">
                                                    <div className="flex items-center gap-2 bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-100">
                                                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                                                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Ativa</span>
                                                    </div>
                                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100">
                                                        🔋 {boia.bateria}%
                                                    </div>
                                                </div>

                                                <div className="flex flex-col lg:flex-row gap-12">
                                                    {/* Secção de Info */}
                                                    <div className="lg:w-1/3 space-y-6">
                                                        <div className="space-y-2">
                                                            <div className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Hardware ID #{boia.id}</div>
                                                            <h4 className="text-4xl font-black text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors leading-none">{boia.nome}</h4>
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
                                                                            <span className="text-2xl bg-white w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border border-slate-100 relative">
                                                                                {getIcon(sensorId)}
                                                                                {isOverdue(lim?.ultima_manutencao, lim?.dias_proxima_manutencao) && (
                                                                                    <span className="absolute -top-2 -right-2 text-sm bg-white rounded-full shadow-sm" title="Manutenção em atraso">⚠️</span>
                                                                                )}
                                                                            </span>
                                                                            <div>
                                                                                <span className="block text-xs font-black text-slate-400 uppercase tracking-widest">{info?.nome}</span>
                                                                                <span className={`text-2xl font-black ${foraDeIntervalo ? 'text-rose-600' : 'text-slate-800'}`}>
                                                                                    {temLeitura ? (
                                                                                        <>{ultima?.valor} <small className="text-xs font-bold opacity-40">{info?.unidade}</small></>
                                                                                    ) : <span className="text-xs opacity-40">---</span>}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        {!isLeitor && (
                                                                            <button 
                                                                                onClick={() => removerSensor(boia.id, sensorId)}
                                                                                className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                                                                            >✕</button>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    {lim && (
                                                                        <div className="space-y-4">
                                                                            <div className="grid grid-cols-2 gap-2">
                                                                                <div className="space-y-1">
                                                                                    <span className="text-xs font-black text-slate-400 uppercase block tracking-tighter">Min VLE</span>
                                                                                    <input 
                                                                                        type="number" defaultValue={lim.valor_minimo}
                                                                                        disabled={isLeitor}
                                                                                        onChange={(e) => setLimitesEditando({...limitesEditando, [`${boia.id}-${sensorId}`]: {...limitesEditando[`${boia.id}-${sensorId}`], min: e.target.value}})}
                                                                                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-black text-center focus:border-blue-500 outline-none"
                                                                                    />
                                                                                </div>
                                                                                <div className="space-y-1">
                                                                                    <span className="text-xs font-black text-slate-400 uppercase block tracking-tighter">Max VLE</span>
                                                                                    <input 
                                                                                        type="number" defaultValue={lim.valor_maximo}
                                                                                        disabled={isLeitor}
                                                                                        onChange={(e) => setLimitesEditando({...limitesEditando, [`${boia.id}-${sensorId}`]: {...limitesEditando[`${boia.id}-${sensorId}`], max: e.target.value}})}
                                                                                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-black text-center focus:border-blue-500 outline-none"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                            {!isLeitor && (
                                                                                <button 
                                                                                    onClick={(e) => handleAtualizarLimiteDireto(e, boia.id, sensorId)}
                                                                                    className="w-full bg-blue-600 text-white py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-md shadow-blue-100"
                                                                                >Atualizar VLE</button>
                                                                            )}
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
                {subAba === 'nova' && (
                    <div className="max-w-4xl mx-auto space-y-12 animate-fade-in">
                        <header className="text-center space-y-4">
                            <h2 className="text-5xl font-black text-slate-800 tracking-tight uppercase">Registo de Ativo</h2>
                            <p className="text-slate-400 font-medium italic">Configuração de Hardware e Georeferenciação de Nova Estação</p>
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
                                    <div className="bg-slate-900 p-10 rounded-[2.5rem] md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-10 shadow-2xl">
                                        <div>
                                            <label className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-3 block">MAC: Unidade de Sensores (Água)</label>
                                            <input 
                                                type="text" required value={formBoia.mac_boia}
                                                onChange={e => setFormBoia({ ...formBoia, mac_boia: e.target.value })}
                                                className="w-full p-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white font-mono focus:border-blue-500 outline-none"
                                                placeholder="00:00:00:00:00:00"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-3 block">MAC: Unidade Gateway (Margem)</label>
                                            <input 
                                                type="text" required value={formBoia.mac_gateway}
                                                onChange={e => setFormBoia({ ...formBoia, mac_gateway: e.target.value })}
                                                className="w-full p-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white font-mono focus:border-emerald-500 outline-none"
                                                placeholder="00:00:00:00:00:00"
                                            />
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
                                    <MapContainer center={[39.7436, -8.8071]} zoom={13} style={{ height: '100%', width: '100%' }}>
                                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                        <LocationMarker 
                                            position={formBoia.latitude && formBoia.longitude ? [formBoia.latitude, formBoia.longitude] : null}
                                            setPosition={(pos) => setFormBoia({...formBoia, latitude: pos.lat.toFixed(6), longitude: pos.lng.toFixed(6)})} 
                                        />
                                    </MapContainer>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="md:col-span-2">
                                        <label className={labelClass}>Zona de Monitorização</label>
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
                                        className="w-full py-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-400 font-black uppercase text-xs hover:border-blue-500 hover:text-blue-500 transition-all"
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
                    <div className="space-y-12 animate-fade-in">
                        {(() => {
                            const missions = [];
                            
                            boias.forEach(boia => {
                                // 1. Novos Dispositivos Pendentes
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
                                            action: () => handleLogManutencaoGeral(boia.id)
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
                                            setEditandoBoia(true);
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
                                        <div className={`${cardClass} p-8 flex flex-col items-center justify-center text-center space-y-3 relative overflow-hidden group`}>
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 transition-all group-hover:scale-150"></div>
                                            <span className="text-5xl">🛡️</span>
                                            <div>
                                                <div className="text-4xl font-black text-slate-800">{healthPercentage}%</div>
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Saúde da Rede</div>
                                            </div>
                                        </div>
                                        <div className={`${cardClass} p-8 flex flex-col items-center justify-center text-center space-y-3 relative overflow-hidden group`}>
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full -mr-12 -mt-12 transition-all group-hover:scale-150"></div>
                                            <span className="text-5xl">🛠️</span>
                                            <div>
                                                <div className="text-4xl font-black text-slate-800">{missions.length}</div>
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ações Pendentes</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Lista de Estações (Boias) - Hierarquia Centralizada */}
                                    <div className="space-y-8 px-4">
                                        <div className="flex items-center gap-6">
                                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] whitespace-nowrap">Estado das Estações</h3>
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
                                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg transition-all ${hasUrgent ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-900 text-white'}`}>
                                                                    {hasUrgent ? '⚠️' : '🛰️'}
                                                                </div>
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
                                                                <div className="text-right hidden sm:block">
                                                                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Integridade Física</div>
                                                                    <div className={`text-lg font-black ${isOverdue(boia.ultima_manutencao, 15) ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                                        {Math.round(100 - getMaintenanceProgress(boia.ultima_manutencao, 15))}%
                                                                    </div>
                                                                </div>
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
                                                                            <div className="text-3xl">🧹</div>
                                                                            <div>
                                                                                <span className="block text-xs font-black text-slate-800 uppercase tracking-widest">Limpeza e Verificação Física</span>
                                                                                <span className="text-xs font-bold text-slate-400">Última intervenção: {boia.ultima_manutencao ? new Date(boia.ultima_manutencao).toLocaleDateString('pt-PT') : 'Nunca'}</span>
                                                                            </div>
                                                                        </div>
                                                                        <button 
                                                                            onClick={() => handleLogManutencaoGeral(boia.id)}
                                                                            className="bg-slate-900 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95"
                                                                        >
                                                                            Registar Limpeza 🛠️
                                                                        </button>
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
                                                                                            <span className="text-xl w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100">
                                                                                                {getIcon(lim.tipo_sensor_id)}
                                                                                            </span>
                                                                                            <div>
                                                                                                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{info?.nome}</span>
                                                                                                <span className={`text-xs font-black uppercase ${overdue ? 'text-rose-600' : 'text-slate-800'}`}>
                                                                                                    {overdue ? 'Excedido' : 'Calibrado'}
                                                                                                </span>
                                                                                            </div>
                                                                                        </div>
                                                                                        <button 
                                                                                            onClick={() => {
                                                                                                setBoiaDetalhe(boia);
                                                                                                setAdicionandoSensor(true);
                                                                                                setManutencao({
                                                                                                    boia_id: boia.id,
                                                                                                    tipo_sensor_id: lim.tipo_sensor_id,
                                                                                                    valor_minimo: lim.valor_minimo,
                                                                                                    valor_maximo: lim.valor_maximo,
                                                                                                    dias_proxima_manutencao: lim.dias_proxima_manutencao
                                                                                                });
                                                                                            }}
                                                                                            className="text-blue-500 hover:text-blue-700 transition-colors p-1"
                                                                                            title="Calibrar Sensor"
                                                                                        >
                                                                                            🔧
                                                                                        </button>
                                                                                    </div>
                                                                                    
                                                                                    <div className="space-y-3">
                                                                                        <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                                                                                            <span className="text-slate-400">Próxima Calibração</span>
                                                                                            <span className={overdue ? 'text-rose-600' : 'text-slate-600'}>
                                                                                                {calculateNextMaintenance(lim.ultima_manutencao, lim.dias_proxima_manutencao)}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                                                            <div 
                                                                                                className={`h-full transition-all duration-500 ${overdue ? 'bg-rose-500' : progress > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                                                                style={{ width: `${Math.min(progress, 100)}%` }}
                                                                                            ></div>
                                                                                        </div>
                                                                                    </div>
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
                                                                                            <span className="block text-xs font-black text-slate-800 uppercase tracking-widest">{mission.title}</span>
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
                                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] whitespace-nowrap">Intervenções Prioritárias</h3>
                                            <div className="flex-1 h-[2px] bg-slate-100"></div>
                                        </div>
                                        
                                        {missions.length === 0 ? (
                                            <div className="p-20 text-center bg-slate-900 rounded-[3rem] border-4 border-dashed border-slate-800">
                                                <div className="text-6xl mb-6">🛰️</div>
                                                <h3 className="text-2xl font-black text-white uppercase tracking-widest">Sistemas Nominais</h3>
                                                <p className="text-slate-500 font-bold mt-2 uppercase text-xs tracking-[0.3em]">Sem tarefas pendentes na rede HidroBox</p>
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
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Protocolo HidroBox v2.0</p>
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
                                        <div>
                                            <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-3">Nome da Estação</label>
                                            <input 
                                                type="text" required value={formEditBoia.nome}
                                                onChange={e => setFormEditBoia({...formEditBoia, nome: e.target.value})}
                                                className="w-full p-4 bg-white/5 border-2 border-white/10 rounded-2xl font-black text-white focus:border-blue-500 outline-none"
                                            />
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
                                            <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">Interfaces de Rede (MAC)</label>
                                            <input 
                                                type="text" placeholder="MAC Boia" value={formEditBoia.mac_boia}
                                                onChange={e => setFormEditBoia({...formEditBoia, mac_boia: e.target.value})}
                                                className="w-full p-4 bg-white/5 border-2 border-white/10 rounded-2xl font-mono text-sm text-blue-300 outline-none focus:border-blue-500"
                                            />
                                            <input 
                                                type="text" placeholder="MAC Gateway" value={formEditBoia.mac_gateway}
                                                onChange={e => setFormEditBoia({...formEditBoia, mac_gateway: e.target.value})}
                                                className="w-full p-4 bg-white/5 border-2 border-white/10 rounded-2xl font-mono text-sm text-emerald-300 outline-none focus:border-emerald-500"
                                            />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">Correção de Geo-Referência</label>
                                            <div className="h-48 w-full rounded-3xl overflow-hidden border-2 border-white/10 relative group shadow-2xl">
                                                <MapContainer center={[formEditBoia.latitude || 39.7436, formEditBoia.longitude || -8.8071]} zoom={13} style={{ height: '100%', width: '100%' }}>
                                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
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
                                            <label className="text-xs font-black text-blue-400 uppercase tracking-[0.4em] block mb-4">Identificação Principal</label>
                                            <div className="text-5xl font-black text-white tracking-tighter mb-2">{boiaDetalhe.nome}</div>
                                            <div className="flex items-center gap-4">
                                                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-black uppercase tracking-widest border border-emerald-500/30">
                                                    ● {boiaDetalhe.estado}
                                                </span>
                                                <span className="px-3 py-1 bg-white/5 text-slate-400 rounded-lg text-xs font-black uppercase tracking-widest border border-white/10">
                                                    Bateria: {boiaDetalhe.bateria}%
                                                </span>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="space-y-4 px-2">
                                        <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 space-y-4">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1">Estado de Limpeza</span>
                                                    <span className="text-xs font-bold text-slate-400 italic">Ciclo de 15 dias</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-lg font-black ${isOverdue(boiaDetalhe.ultima_manutencao, 15) ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                        {Math.round(100 - getMaintenanceProgress(boiaDetalhe.ultima_manutencao, 15))}%
                                                    </span>
                                                    <span className="text-[10px] font-black text-slate-600 uppercase block">Integridade</span>
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
                                                    <span className="text-[10px] font-black text-slate-500 uppercase block">Última Intervenção</span>
                                                    <span className="text-sm font-bold text-blue-300">
                                                        {boiaDetalhe.ultima_manutencao ? new Date(boiaDetalhe.ultima_manutencao).toLocaleDateString('pt-PT') : 'Sem registo'}
                                                    </span>
                                                </div>
                                                {!isLeitor && (
                                                    <button 
                                                        onClick={() => handleLogManutencaoGeral(boiaDetalhe.id)}
                                                        className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all shadow-lg shadow-blue-900/20"
                                                    >
                                                        Registar Limpeza 🛠️
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </section>

                                    <section className="space-y-6">
                                        <div className="flex justify-between items-center px-2">
                                            <label className="text-xs font-black text-blue-400 uppercase tracking-[0.4em] block">Limites Operacionais</label>
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
                                                        className="w-full p-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white font-black text-xs outline-none focus:border-emerald-500"
                                                    >
                                                        <option value="" className="bg-slate-900">Selecionar Parâmetro...</option>
                                                        {tiposSensor.filter(t => 
                                                            !boiaDetalhe.limites?.some(l => l.tipo_sensor_id === t.id) || 
                                                            t.id === Number(manutencao.tipo_sensor_id)
                                                        ).map(t => <option key={t.id} value={t.id} className="bg-slate-900">{t.nome} ({t.unidade})</option>)}
                                                    </select>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <input type="number" step="any" placeholder="Min VLE" value={manutencao.valor_minimo} onChange={e => setManutencao({ ...manutencao, valor_minimo: e.target.value })} className="w-full p-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white font-black text-xs outline-none focus:border-emerald-500" />
                                                        <input type="number" step="any" placeholder="Max VLE" value={manutencao.valor_maximo} onChange={e => setManutencao({ ...manutencao, valor_maximo: e.target.value })} className="w-full p-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white font-black text-xs outline-none focus:border-emerald-500" />
                                                    </div>
                                                    <input type="number" placeholder="Ciclo Manut. (Dias)" value={manutencao.dias_proxima_manutencao} onChange={e => setManutencao({ ...manutencao, dias_proxima_manutencao: e.target.value })} className="w-full p-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white font-black text-xs outline-none focus:border-emerald-500" />
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
                                                                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Mínimo (VLE)</span>
                                                                <div className="text-4xl font-black text-white">
                                                                    {lim.valor_minimo} <small className="text-sm font-bold text-slate-500">{info?.unidade}</small>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Máximo (VLE)</span>
                                                                <div className="text-4xl font-black text-white">
                                                                    {lim.valor_maximo} <small className="text-sm font-bold text-slate-500">{info?.unidade}</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-end">
                                                            <div>
                                                                <span className="text-[10px] font-black text-slate-500 uppercase block">Próxima Manutenção</span>
                                                                <span className={`text-xs font-bold ${isOverdue(lim.ultima_manutencao, lim.dias_proxima_manutencao) ? 'text-rose-400' : 'text-slate-300'}`}>
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
                                        <label className="text-xs font-black text-blue-400 uppercase tracking-[0.4em] block px-2">Componentes de Hardware</label>
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
                                        <label className="text-xs font-black text-blue-400 uppercase tracking-[0.4em] block px-2">Coordenadas Geográficas</label>
                                        <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 space-y-6">
                                            <div className="flex justify-between items-center">
                                                <div className="space-y-1">
                                                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Latitude</span>
                                                    <div className="text-xl font-black">{boiaDetalhe.latitude}</div>
                                                </div>
                                                <div className="w-px h-10 bg-white/10"></div>
                                                <div className="space-y-1">
                                                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Longitude</span>
                                                    <div className="text-xl font-black">{boiaDetalhe.longitude}</div>
                                                </div>
                                                <a 
                                                    href={`https://www.google.com/maps?q=${boiaDetalhe.latitude},${boiaDetalhe.longitude}`} 
                                                    target="_blank" 
                                                    className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/40"
                                                >📍</a>
                                            </div>
                                            <div className="pt-6 border-t border-white/5">
                                                <span className="text-xs font-black text-slate-500 uppercase block mb-2 tracking-widest">Descrição do Local</span>
                                                <p className="font-bold text-slate-300 italic text-sm">"{boiaDetalhe.localizacao_texto || 'Coordenadas Brutas'}"</p>
                                            </div>
                                        </div>
                                    </section>
                                </>
                            )}
                        </div>
                        
                        {/* Painel de Rodapé */}
                        <div className="p-10 bg-slate-950 border-t border-white/5 space-y-4">
                            {!isLeitor && (
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
                .animate-slide-in {
                    animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .animate-fade-in {
                    animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </div>
    );
}
