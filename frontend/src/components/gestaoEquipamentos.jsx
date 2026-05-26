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

// [NOVO] Componente interno para capturar o clique no mapa
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
    // [NOVO] Simulação de obtenção do utilizador do localStorage (ou contexto)
    const user = JSON.parse(localStorage.getItem('user') || '{"role": "leitor_empresa"}');
    const isSuperAdmin = user.role === 'super_admin';
    const isAdmin = user.role === 'admin_empresa' || isSuperAdmin;
    const isTecnico = user.role === 'tecnico_empresa';
    const isLeitor = user.role === 'leitor_empresa';

    const [subAba, setSubAba] = useState('inventario');

    const [zonas, setZonas] = useState([]);
    const [boias, setBoias] = useState([]);
    const [tiposSensor, setTiposSensor] = useState([]);

    // [NOVO] Estado para controlar o Painel Lateral de Detalhes de Hardware
    const [boiaDetalhe, setBoiaDetalhe] = useState(null);
    const [editandoBoia, setEditandoBoia] = useState(false);
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

    // [NOVO] Estado para a Aba de Manutenção (Adicionar sensores a boia existente)
    const [manutencao, setManutencao] = useState({
        boia_id: '',
        tipo_sensor_id: '',
        valor_minimo: '',
        valor_maximo: '',
        status: 'ativo'
    });

    const [mensagem, setMensagem] = useState({ texto: '', tipo: '' });

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

    // Funções Auxiliares para o Form Dinâmico
    const adicionarLinhaSensor = () => {
        setSensoresForm([...sensoresForm, { tipo_sensor_id: '', valor_minimo: '', valor_maximo: '' }]);
    };
    const removerLinhaSensor = (index) => {
        const novosSensores = [...sensoresForm];
        novosSensores.splice(index, 1);
        setSensoresForm(novosSensores);
    };
    const atualizarSensor = (index, campo, valor) => {
        const novosSensores = [...sensoresForm];
        novosSensores[index][campo] = valor;
        setSensoresForm(novosSensores);
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

    // [NOVO] Submissão 2: Adicionar Sensor a uma Instalação Existente
    const handleAdicionarSensorExistente = async (e) => {
        e.preventDefault();
        try {
            await api.post('/boias/associar-sensor', manutencao);
            mostrarMensagem('Sensor acoplado e limites atualizados no inventário!', 'sucesso');
            setManutencao({
                ...manutencao,
                tipo_sensor_id: '',
                valor_minimo: '',
                valor_maximo: '',
                status: 'ativo'
            });
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

    return (
        <div className="relative min-h-screen bg-gray-50/50 p-4 md:p-8">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden w-full max-w-[1600px] mx-auto mb-10">

                {/* Abas de Navegação - Estilo Moderno */}
                <div className="flex border-b border-gray-100 bg-gray-50/50 p-2 gap-2 overflow-x-auto">
                    <button
                        onClick={() => setSubAba('inventario')}
                        className={`flex-1 min-w-[200px] px-6 py-4 font-black text-xs uppercase tracking-widest transition-all rounded-xl ${subAba === 'inventario' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-400 hover:bg-white hover:text-slate-600'}`}
                    >
                        🖥️ Monitorização de Rede
                    </button>
                    {isAdmin && (
                        <button
                            onClick={() => setSubAba('nova')}
                            className={`flex-1 min-w-[200px] px-6 py-4 font-black text-xs uppercase tracking-widest transition-all rounded-xl ${subAba === 'nova' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-400 hover:bg-white hover:text-slate-600'}`}
                        >
                            ➕ Registar Nova Estação
                        </button>
                    )}
                    {(isAdmin || isTecnico) && (
                        <button
                            onClick={() => setSubAba('manutencao')}
                            className={`flex-1 min-w-[200px] px-6 py-4 font-black text-xs uppercase tracking-widest transition-all rounded-xl ${subAba === 'manutencao' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-400 hover:bg-white hover:text-slate-600'}`}
                        >
                            🔌 Gestão de Sensores
                        </button>
                    )}
                </div>

                {mensagem.texto && (
                    <div className={`mx-8 mt-6 p-4 rounded-xl text-center text-xs font-black uppercase tracking-[0.2em] animate-bounce ${mensagem.tipo === 'sucesso' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                        {mensagem.texto}
                    </div>
                )}

                <div className="p-6 md:p-10">

                    {/* =========================================
                        TAB 1: INVENTÁRIO VISUAL (FULL EXPANSION)
                    ============================================= */}
                    {subAba === 'inventario' && (
                        <div className="space-y-12">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-6">
                                <div>
                                    <h3 className="text-3xl font-black text-slate-800 tracking-tighter">Rede Hidrográfica Ativa</h3>
                                    <p className="text-slate-400 font-medium">Controlo centralizado de ativos e telemetria por zona</p>
                                </div>
                                <div className="flex gap-3">
                                    <div className="bg-slate-100 px-4 py-2 rounded-lg text-[10px] font-black text-slate-500 uppercase">Estações: {boias.length}</div>
                                    <div className="bg-blue-50 px-4 py-2 rounded-lg text-[10px] font-black text-blue-600 uppercase">Zonas: {zonas.length}</div>
                                </div>
                            </div>

                            {boiasPorZona.map(zona => (
                                <div key={zona.id} className="group">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg shadow-blue-100 text-2xl">🗺️</div>
                                        <div>
                                            <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">{zona.nome}</h4>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{zona.concelho} • {zona.instalacoes.length} Unidades</p>
                                        </div>
                                        <div className="flex-1 h-[2px] bg-slate-100 ml-4"></div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-1 gap-10">
                                        {zona.instalacoes.map(boia => {
                                            // [MELHORADO] Detetar todos os IDs de sensores: os que têm leituras + os que têm limites configurados
                                            const IDsLeituras = boia.leituras ? boia.leituras.map(l => l.tipo_sensor_id) : [];
                                            const IDsLimites = boia.limites ? boia.limites.map(l => l.tipo_sensor_id) : [];
                                            const IDsSensoresDetetados = [...new Set([...IDsLeituras, ...IDsLimites])];

                                            return (
                                                <div key={boia.id} className="bg-white border-2 border-slate-100 rounded-3xl p-8 hover:border-blue-400 transition-all hover:shadow-2xl hover:shadow-blue-50 flex flex-col w-full">
                                                    <div className="flex justify-between items-start mb-10">
                                                        <div className="space-y-3">
                                                            <div className="font-black text-slate-900 text-2xl uppercase tracking-tighter leading-none">{boia.nome}</div>
                                                            <div className="flex flex-wrap gap-2">
                                                                <div className="text-[10px] text-blue-700 font-black bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">#{boia.id}</div>
                                                                <div className="text-[10px] text-emerald-700 font-black bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 flex items-center gap-2">
                                                                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> TRANSMISSÃO ATIVA
                                                                </div>
                                                                <div className="text-[10px] text-slate-500 font-black bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 uppercase tracking-tighter">BATERIA: {boia.bateria}%</div>
                                                            </div>
                                                        </div>
                                                        <button 
                                                            onClick={() => setBoiaDetalhe(boia)}
                                                            className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-blue-600 transition-all shadow-xl flex items-center justify-center gap-3 px-6"
                                                            title="Ver Detalhes de Hardware"
                                                        >
                                                            <span className="text-sm font-bold uppercase tracking-widest">Ficha Técnica</span>
                                                            <span className="text-xl">🔍</span>
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full">
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

                                                            const windowMin = minNum * 0.8;
                                                            const windowMax = maxNum * 1.2;
                                                            const percentValue = ((valorNum - windowMin) / (windowMax - windowMin)) * 100;
                                                            const safeStart = ((minNum - windowMin) / (windowMax - windowMin)) * 100;
                                                            const safeWidth = ((maxNum - minNum) / (windowMax - windowMin)) * 100;

                                                            const statusInfo = {
                                                                ativo: { label: 'Ativo', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
                                                                erro: { label: 'Erro', color: 'text-rose-600 bg-rose-50 border-rose-100' },
                                                                calibracao: { label: 'Calibração', color: 'text-amber-600 bg-amber-50 border-amber-100' },
                                                                desconectado: { label: 'OFF', color: 'text-slate-400 bg-slate-50 border-slate-100' }
                                                            };
                                                            const currentStatus = statusInfo[lim?.status] || statusInfo.ativo;

                                                            return (
                                                                <div key={sensorId} className={`relative p-5 rounded-2xl border-2 transition-all ${foraDeIntervalo || lim?.status === 'erro' ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50/30 border-slate-100 hover:bg-white hover:border-blue-100 hover:shadow-md'}`}>
                                                                    <div className="flex justify-between items-start mb-4">
                                                                        <div className="flex items-center gap-3">
                                                                            <span className="text-2xl bg-white p-2 rounded-xl shadow-sm border border-slate-100">{getIcon(sensorId)}</span>
                                                                            <div className="flex flex-col">
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="font-black text-[9px] text-slate-400 uppercase tracking-widest">{info?.nome}</span>
                                                                                    <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full border uppercase ${currentStatus.color}`}>
                                                                                        {currentStatus.label}
                                                                                    </span>
                                                                                </div>
                                                                                <span className={`text-xl font-black ${foraDeIntervalo ? 'text-rose-600' : 'text-slate-800'}`}>
                                                                                    {temLeitura ? (
                                                                                        <>{ultima?.valor} <small className="text-[10px] opacity-40 uppercase tracking-tighter">{info?.unidade}</small></>
                                                                                    ) : (
                                                                                        <span className="text-xs text-slate-400 italic font-medium">Sem dados</span>
                                                                                    )}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        {foraDeIntervalo && (
                                                                            <div className="bg-rose-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter animate-pulse">ALERTA</div>
                                                                        )}
                                                                        <button 
                                                                            onClick={() => removerSensor(boia.id, sensorId)}
                                                                            className="opacity-0 group-hover:opacity-100 bg-slate-100 text-slate-400 hover:bg-rose-500 hover:text-white w-6 h-6 rounded-full flex items-center justify-center transition-all text-[10px] font-black shadow-sm"
                                                                            title="Remover Sensor"
                                                                        >
                                                                            ✕
                                                                        </button>
                                                                    </div>
                                                                    
                                                                    {lim && (
                                                                        <div className="mt-4 mb-6">
                                                                            <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                                                                <span>Mín: {lim.valor_minimo}</span>
                                                                                <span>Máx: {lim.valor_maximo}</span>
                                                                            </div>
                                                                            <div className="h-2 w-full bg-slate-200/50 rounded-full overflow-hidden relative">
                                                                                <div className="absolute h-full bg-emerald-400/20" style={{ left: `${Math.max(0, safeStart)}%`, width: `${Math.min(100, safeWidth)}%` }}></div>
                                                                                {temLeitura && (
                                                                                    <div className={`absolute h-full transition-all duration-700 rounded-full ${foraDeIntervalo ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' : 'bg-blue-500'}`} style={{ left: '0%', width: `${Math.min(Math.max(percentValue, 0), 100)}%` }}></div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
                                                                        <div className="flex-1 flex gap-2">
                                                                            <input 
                                                                                type="number" placeholder="Mín"
                                                                                className="w-full text-center text-[10px] font-black bg-white border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50 disabled:bg-slate-50"
                                                                                defaultValue={lim?.valor_minimo}
                                                                                disabled={isLeitor}
                                                                                onChange={(e) => setLimitesEditando({...limitesEditando, [`${boia.id}-${sensorId}`]: {...limitesEditando[`${boia.id}-${sensorId}`], min: e.target.value}})}
                                                                            />
                                                                            <input 
                                                                                type="number" placeholder="Máx"
                                                                                className="w-full text-center text-[10px] font-black bg-white border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50 disabled:bg-slate-50"
                                                                                defaultValue={lim?.valor_maximo}
                                                                                disabled={isLeitor}
                                                                                onChange={(e) => setLimitesEditando({...limitesEditando, [`${boia.id}-${sensorId}`]: {...limitesEditando[`${boia.id}-${sensorId}`], max: e.target.value}})}
                                                                            />
                                                                        </div>
                                                                        {!isLeitor && (
                                                                            <button 
                                                                                onClick={(e) => handleAtualizarLimiteDireto(e, boia.id, sensorId)} 
                                                                                className="bg-slate-900 text-white text-[9px] font-black rounded-xl px-4 py-2 hover:bg-blue-600 transition-all uppercase tracking-widest shadow-md active:scale-90 flex items-center justify-center min-w-[60px]"
                                                                            >
                                                                                DEFINIR
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* =========================================
                        TAB 2: REGISTO (EXPANDED FORM)
                    ============================================= */}
                    {subAba === 'nova' && (
                        <div className="max-w-4xl mx-auto">
                            <form onSubmit={handleCriarInstalacaoCompleta} className="space-y-12 animate-fade-in">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">
                                        <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
                                        Configuração de Hardware
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Designação da Estação</label>
                                            <input type="text" required value={formBoia.nome} onChange={e => setFormBoia({ ...formBoia, nome: e.target.value })} className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 focus:bg-white focus:border-blue-400 outline-none transition-all font-bold" placeholder="Ex: Boia Foz do Lis" />
                                        </div>
                                        <div className="bg-slate-900 p-8 rounded-[2rem] md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-2xl">
                                            <div>
                                                <label className="block text-xs font-black text-blue-400 uppercase tracking-[0.2em] mb-3">MAC Address: Sensor (Água)</label>
                                                <input type="text" required value={formBoia.mac_boia} onChange={e => setFormBoia({ ...formBoia, mac_boia: e.target.value })} className="w-full p-4 border-2 border-white/10 rounded-xl bg-white/5 text-white font-mono focus:border-blue-500 outline-none transition-all" placeholder="00:00:00:00:00:00" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-cyan-400 uppercase tracking-[0.2em] mb-3">MAC Address: Gateway (Margem)</label>
                                                <input type="text" required value={formBoia.mac_gateway} onChange={e => setFormBoia({ ...formBoia, mac_gateway: e.target.value })} className="w-full p-4 border-2 border-white/10 rounded-xl bg-white/5 text-white font-mono focus:border-cyan-500 outline-none transition-all" placeholder="00:00:00:00:00:00" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">
                                        <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
                                        Georeferenciação
                                    </h3>
                                    
                                    {/* [NOVO] Mapa Seletor de Localização */}
                                    <div className="mb-8 bg-slate-100 rounded-[2rem] overflow-hidden border-4 border-white shadow-inner h-[400px] relative">
                                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-blue-100 pointer-events-none">
                                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                                📍 Clique no mapa para marcar a posição
                                            </span>
                                        </div>
                                        <MapContainer 
                                            center={[39.7436, -8.8071]} 
                                            zoom={13} 
                                            style={{ height: '100%', width: '100%' }}
                                        >
                                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                            <LocationMarker 
                                                position={formBoia.latitude && formBoia.longitude ? [formBoia.latitude, formBoia.longitude] : null}
                                                setPosition={(pos) => setFormBoia({...formBoia, latitude: pos.lat.toFixed(6), longitude: pos.lng.toFixed(6)})} 
                                            />
                                        </MapContainer>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Zona de Implementação</label>
                                            <select required value={formBoia.zona_id} onChange={e => setFormBoia({ ...formBoia, zona_id: e.target.value })} className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 focus:bg-white focus:border-blue-400 outline-none transition-all font-bold appearance-none cursor-pointer">
                                                <option value="">Selecione uma zona registada...</option>
                                                {zonas.map(z => <option key={z.id} value={z.id}>{z.nome} ({z.concelho})</option>)}
                                            </select>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Morada ou Ponto de Referência</label>
                                            <input type="text" value={formBoia.localizacao_texto} onChange={e => setFormBoia({ ...formBoia, localizacao_texto: e.target.value })} className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 focus:bg-white focus:border-blue-400 outline-none transition-all font-bold" placeholder="Ex: Próximo da Ponte Pedonal..." />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Latitude (Capturada no Mapa)</label>
                                            <input type="number" step="any" required value={formBoia.latitude} onChange={e => setFormBoia({ ...formBoia, latitude: e.target.value })} className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-blue-50/50 text-blue-900 border-blue-100 focus:bg-white focus:border-blue-400 outline-none transition-all font-bold" readOnly />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Longitude (Capturada no Mapa)</label>
                                            <input type="number" step="any" required value={formBoia.longitude} onChange={e => setFormBoia({ ...formBoia, longitude: e.target.value })} className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-blue-50/50 text-blue-900 border-blue-100 focus:bg-white focus:border-blue-400 outline-none transition-all font-bold" readOnly />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-8">
                                    <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black text-lg uppercase tracking-widest hover:bg-slate-900 transition-all shadow-2xl shadow-blue-200 active:scale-95 flex items-center justify-center gap-4">
                                        🚀 Finalizar Registo de Estação
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* =========================================
                        TAB 3: MANUTENÇÃO (MAX WIDTH)
                    ============================================= */}
                    {subAba === 'manutencao' && (
                        <div className="max-w-3xl mx-auto bg-white p-10 rounded-[3rem] border-2 border-slate-100 shadow-2xl animate-fade-in">
                            <form onSubmit={handleAdicionarSensorExistente} className="space-y-10">
                                <div>
                                    <h3 className="text-3xl font-black text-slate-800 tracking-tighter mb-4 italic">Intervenção Técnica</h3>
                                    <p className="text-slate-400 font-medium leading-relaxed">Associe novos sensores ou reajuste os limites críticos (VLE) de estações que já se encontram em operação no terreno.</p>
                                </div>

                                <div className="space-y-4">
                                    <label className="block text-[10px] font-black text-blue-600 uppercase tracking-[0.25em] ml-2">1. Estação de Destino</label>
                                    <select
                                        required
                                        value={manutencao.boia_id}
                                        onChange={e => setManutencao({ ...manutencao, boia_id: e.target.value })}
                                        className="w-full p-5 border-2 border-slate-100 rounded-2xl bg-slate-50 font-black text-slate-700 outline-none focus:border-blue-500 transition-all cursor-pointer"
                                    >
                                        <option value="">-- Selecione a Estação Alvo --</option>
                                        {boias.map(b => (
                                            <option key={b.id} value={b.id}>📍 {b.nome} ({b.localizacao_texto || 'Sem Morada'})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-8 rounded-3xl border-2 border-dashed border-slate-200">
                                    <div className="md:col-span-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">2. Parâmetro Físico</label>
                                        <select
                                            required
                                            value={manutencao.tipo_sensor_id}
                                            onChange={e => setManutencao({ ...manutencao, tipo_sensor_id: e.target.value })}
                                            className="w-full p-4 border-2 border-white rounded-xl bg-white font-bold outline-none shadow-sm focus:border-blue-400"
                                        >
                                            <option value="">Selecione o sensor a instalar...</option>
                                            {tiposSensor.map(t => <option key={t.id} value={t.id}>{t.nome} ({t.unidade})</option>)}
                                        </select>
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">3. Estado de Saúde</label>
                                        <select
                                            required
                                            value={manutencao.status}
                                            onChange={e => setManutencao({ ...manutencao, status: e.target.value })}
                                            className="w-full p-4 border-2 border-white rounded-xl bg-white font-bold outline-none shadow-sm focus:border-blue-400"
                                        >
                                            <option value="ativo">✅ Ativo / Operacional</option>
                                            <option value="erro">❌ Erro de Leitura</option>
                                            <option value="calibracao">🔧 Necessita Calibração</option>
                                            <option value="desconectado">🔌 Desconectado / OFF</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Mínimo (VLE)</label>
                                        <input type="number" step="any" required value={manutencao.valor_minimo} onChange={e => setManutencao({ ...manutencao, valor_minimo: e.target.value })} className="w-full p-4 border-2 border-white rounded-xl bg-white font-bold outline-none shadow-sm focus:border-blue-400" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Máximo (VLE)</label>
                                        <input type="number" step="any" required value={manutencao.valor_maximo} onChange={e => setManutencao({ ...manutencao, valor_maximo: e.target.value })} className="w-full p-4 border-2 border-white rounded-xl bg-white font-bold outline-none shadow-sm focus:border-blue-400" />
                                    </div>
                                </div>

                                <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl hover:scale-[1.02] active:scale-95">
                                    Vincular Sensor à Unidade ⚡
                                </button>
                            </form>
                        </div>
                    )}

                </div>
            </div>

            {/* ==========================================================
                PAINEL LATERAL (DRAWER): FICHA TÉCNICA DE HARDWARE
            ========================================================== */}
            {boiaDetalhe && (
                <>
                    <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm transition-opacity" onClick={() => { setBoiaDetalhe(null); setEditandoBoia(false); }}></div>
                    
                    <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col animate-slide-in">
                        <div className="p-6 border-b flex justify-between items-center bg-slate-900 text-white">
                            <div>
                                <h3 className="font-black text-xl uppercase tracking-tighter">{editandoBoia ? 'Editar Estação' : 'Ficha Técnica'}</h3>
                                <p className="text-xs text-slate-400">Dados de Ativos & Localização</p>
                            </div>
                            <div className="flex gap-2">
                                {!isLeitor && (
                                    <button 
                                        onClick={() => {
                                            setEditandoBoia(!editandoBoia);
                                            setFormEditBoia(boiaDetalhe);
                                        }} 
                                        className={`p-2 rounded-lg transition-all ${editandoBoia ? 'bg-amber-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                                    >
                                        {editandoBoia ? 'Cancelar' : '✏️'}
                                    </button>
                                )}
                                <button onClick={() => { setBoiaDetalhe(null); setEditandoBoia(false); }} className="text-white hover:bg-white/10 p-2 rounded-full">✕</button>
                            </div>
                        </div>

                        <div className="p-8 overflow-y-auto space-y-8 flex-1">
                            {editandoBoia ? (
                                <form onSubmit={handleAtualizarBoia} className="space-y-6">
                                    <div>
                                        <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block mb-2">Designação</label>
                                        <input 
                                            type="text" required value={formEditBoia.nome}
                                            onChange={e => setFormEditBoia({...formEditBoia, nome: e.target.value})}
                                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block mb-2">Estado</label>
                                            <select 
                                                value={formEditBoia.estado}
                                                onChange={e => setFormEditBoia({...formEditBoia, estado: e.target.value})}
                                                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-none focus:border-blue-500"
                                            >
                                                <option value="ativa">Ativa</option>
                                                <option value="manutencao">Manutenção</option>
                                                <option value="erro">Erro</option>
                                                <option value="offline">Offline</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block mb-2">Bateria (%)</label>
                                            <input 
                                                type="number" value={formEditBoia.bateria}
                                                onChange={e => setFormEditBoia({...formEditBoia, bateria: e.target.value})}
                                                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-none focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block">Hardware</label>
                                        <input 
                                            type="text" placeholder="MAC Boia" value={formEditBoia.mac_boia}
                                            onChange={e => setFormEditBoia({...formEditBoia, mac_boia: e.target.value})}
                                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-mono text-sm outline-none focus:border-blue-500"
                                        />
                                        <input 
                                            type="text" placeholder="MAC Gateway" value={formEditBoia.mac_gateway}
                                            onChange={e => setFormEditBoia({...formEditBoia, mac_gateway: e.target.value})}
                                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-mono text-sm outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block">Geolocalização</label>
                                        
                                        {/* Mini Mapa de Edição */}
                                        <div className="h-48 w-full rounded-2xl overflow-hidden border-4 border-white shadow-lg relative group">
                                            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur px-3 py-1 rounded-full shadow-sm border border-blue-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest">📍 Clique para Mover</span>
                                            </div>
                                            <MapContainer 
                                                center={[formEditBoia.latitude || 39.7436, formEditBoia.longitude || -8.8071]} 
                                                zoom={13} 
                                                style={{ height: '100%', width: '100%' }}
                                            >
                                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                                <LocationMarker 
                                                    position={formEditBoia.latitude && formEditBoia.longitude ? [formEditBoia.latitude, formEditBoia.longitude] : null}
                                                    setPosition={(pos) => setFormEditBoia({...formEditBoia, latitude: pos.lat.toFixed(6), longitude: pos.lng.toFixed(6)})} 
                                                />
                                            </MapContainer>
                                        </div>

                                        <input 
                                            type="text" placeholder="Morada / Referência" value={formEditBoia.localizacao_texto}
                                            onChange={e => setFormEditBoia({...formEditBoia, localizacao_texto: e.target.value})}
                                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-sm outline-none focus:border-blue-500"
                                        />
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <span className="text-[8px] font-bold text-slate-400 uppercase ml-1">Latitude</span>
                                                <input type="number" step="any" value={formEditBoia.latitude} onChange={e => setFormEditBoia({...formEditBoia, latitude: e.target.value})} className="w-full p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-xs font-mono font-bold text-blue-900" readOnly />
                                            </div>
                                            <div>
                                                <span className="text-[8px] font-bold text-slate-400 uppercase ml-1">Longitude</span>
                                                <input type="number" step="any" value={formEditBoia.longitude} onChange={e => setFormEditBoia({...formEditBoia, longitude: e.target.value})} className="w-full p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-xs font-mono font-bold text-blue-900" readOnly />
                                            </div>
                                        </div>
                                    </div>
                                    <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg">
                                        Guardar Alterações 💾
                                    </button>
                                </form>
                            ) : (
                                <>
                                    <section>
                                        <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block mb-2">Designação</label>
                                        <div className="text-2xl font-black text-slate-800 border-b-4 border-blue-600 pb-2 inline-block mb-4">{boiaDetalhe.nome}</div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                <span className="text-[10px] font-bold text-slate-400 block uppercase">Estado</span>
                                                <span className={`text-sm font-bold flex items-center gap-1 ${boiaDetalhe.estado === 'ativa' ? 'text-green-600' : 'text-amber-500'}`}>
                                                    ● {boiaDetalhe.estado}
                                                </span>
                                            </div>
                                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                <span className="text-[10px] font-bold text-slate-400 block uppercase">Bateria</span>
                                                <span className="text-sm font-bold text-slate-800">{boiaDetalhe.bateria}%</span>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block mb-2">Identificadores de Hardware</label>
                                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                            <span className="text-[10px] font-bold text-blue-400 block uppercase">MAC Address Boia (Rio)</span>
                                            <code className="text-sm font-black text-blue-900">{boiaDetalhe.mac_boia}</code>
                                        </div>
                                        <div className="bg-cyan-50 p-4 rounded-xl border border-cyan-100">
                                            <span className="text-[10px] font-bold text-cyan-400 block uppercase">MAC Address Gateway (Margem)</span>
                                            <code className="text-sm font-black text-cyan-900">{boiaDetalhe.mac_gateway}</code>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block mb-2">Posicionamento Geográfico</label>
                                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                                            <div className="mb-4">
                                                <span className="text-[10px] font-bold text-slate-400 block uppercase">Morada/Ponto de Referência</span>
                                                <p className="text-sm font-bold text-slate-700">{boiaDetalhe.localizacao_texto || 'Coordenadas sem morada registada'}</p>
                                            </div>
                                            <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-100 shadow-inner">
                                                <div>
                                                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Latitude</span>
                                                    <code className="text-xs font-bold text-slate-800">{boiaDetalhe.latitude}</code>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Longitude</span>
                                                    <code className="text-xs font-bold text-slate-800">{boiaDetalhe.longitude}</code>
                                                </div>
                                                <a 
                                                    href={`https://www.google.com/maps?q=${boiaDetalhe.latitude},${boiaDetalhe.longitude}`} 
                                                    target="_blank" 
                                                    className="bg-blue-600 p-2 rounded-md text-white hover:bg-blue-700"
                                                >
                                                    📍
                                                </a>
                                            </div>
                                        </div>
                                    </section>
                                </>
                            )}
                        </div>
                        
                        <div className="p-6 bg-slate-50 border-t space-y-3">
                                        {!isLeitor && (
                                            <button 
                                                onClick={() => removerBoia(boiaDetalhe.id)}
                                                className="w-full bg-rose-500 text-white font-black py-3 rounded-xl hover:bg-rose-600 transition-colors uppercase text-[10px] tracking-[0.2em] shadow-lg shadow-rose-100 flex items-center justify-center gap-2"
                                            >
                                                🗑️ Remover Estação Permanentemente
                                            </button>
                                        )}
                            <button 
                                onClick={() => { setBoiaDetalhe(null); setEditandoBoia(false); }} 
                                className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-700 transition-colors uppercase text-xs tracking-widest"
                            >
                                Fechar Ficha Técnica
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
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-slide-in {
                    animation: slideIn 0.3s ease-out forwards;
                }
                .animate-fade-in {
                    animation: fadeIn 0.4s ease-out forwards;
                }
            `}</style>
        </div>
    );
}
