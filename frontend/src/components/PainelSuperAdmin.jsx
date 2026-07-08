import { useState, useEffect } from 'react';
import api from '../api';
import Tooltip from './Tooltip';
import HelpPin from './HelpPin';

export default function PainelSuperAdmin({ onAbaChange, isHelpMode }) {
    const userLogado = JSON.parse(sessionStorage.getItem('user') || '{}');
    const [empresas, setEmpresas] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [tiposSensor, setTiposSensor] = useState([]);
    const [novaEmpresa, setNovaEmpresa] = useState({ nome: '', nif: '', email_contacto: '', telefone: '', morada: '' });
    const [novoTipoSensor, setNovoTipoSensor] = useState({ nome: '', unidade: '' });
    const [editandoEmpresa, setEditandoEmpresa] = useState(null);
    const [editandoUser, setEditandoUser] = useState(null);
    const [editandoTipoSensor, setEditandoTipoSensor] = useState(null);
    const [mensagem, setMensagem] = useState('');
    const [abaAtiva, setAbaAtiva] = useState('entidades'); // 'entidades', 'utilizadores' ou 'sensores'
    const [entidadeSelecionada, setEntidadeSelecionada] = useState(null);
    const [novoUtilizador, setNovoUtilizador] = useState({ name: '', email: '', password: '', role: 'leitor_empresa', empresa_id: '' });

    useEffect(() => { carregarDados(); }, []);

    const carregarDados = async () => {
        try {
            const [resEnt, resUsers, resTipos] = await Promise.all([
                api.get('/empresas'),
                api.get('/users'),
                api.get('/tipos-sensor')
            ]);
            setEmpresas(resEnt.data);
            setUsuarios(resUsers.data);
            setTiposSensor(resTipos.data);
        } catch (err) { console.error(err); }
    };

    const handleCriarTipoSensor = async (e) => {
        e.preventDefault();
        try {
            await api.post('/tipos-sensor', novoTipoSensor);
            setMensagem('Tipo de sensor criado!');
            setNovoTipoSensor({ nome: '', unidade: '' });
            carregarDados();
        } catch (err) { setMensagem('Erro ao criar sensor.'); }
    };

    const handleUpdateTipoSensor = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/tipos-sensor/${editandoTipoSensor.id}`, editandoTipoSensor);
            setEditandoTipoSensor(null);
            setMensagem('Sensor atualizado!');
            carregarDados();
        } catch (err) { setMensagem('Erro ao atualizar.'); }
    };

    const handleDeleteTipoSensor = async (id) => {
        if (!window.confirm('Eliminar este tipo de sensor?')) return;
        try {
            const res = await api.delete(`/tipos-sensor/${id}`);
            if (res.data.sucesso) {
                setMensagem('Sensor removido.');
                carregarDados();
            } else {
                setMensagem(res.data.mensagem);
            }
        } catch (err) { 
            setMensagem(err.response?.data?.mensagem || 'Erro ao eliminar.'); 
        }
    };

    const handleCriarEmpresa = async (e) => {
        e.preventDefault();
        try {
            await api.post('/empresas', { 
                ...novaEmpresa, 
                admin_id: userLogado.id
            });
            setMensagem('Empresa criada com sucesso!');
            setNovaEmpresa({ nome: '', nif: '' });
            carregarDados();
        } catch (err) { setMensagem('Erro ao criar empresa.'); }
    };

    const handleUpdateEmpresa = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/empresas/${editandoEmpresa.id}`, editandoEmpresa);
            setEditandoEmpresa(null);
            setMensagem('Empresa atualizada!');
            carregarDados();
        } catch (err) { setMensagem('Erro ao atualizar empresa.'); }
    };

    const handleDeleteEmpresa = async (id) => {
        if (!window.confirm('Tem a certeza que deseja eliminar esta empresa? Todos os dados associados serão perdidos.')) return;
        try {
            await api.delete(`/empresas/${id}`);
            setMensagem('Empresa eliminada.');
            carregarDados();
        } catch (err) { setMensagem('Erro ao eliminar empresa.'); }
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...editandoUser };
            if (payload.empresa_id === "") payload.empresa_id = null;
            if (!payload.password) delete payload.password;
            
            await api.put(`/users/${editandoUser.id}`, payload);
            setEditandoUser(null);
            setMensagem('Utilizador atualizado!');
            carregarDados();
        } catch (err) { setMensagem('Erro ao atualizar utilizador.'); }
    };

    const handleAlterarRole = async (user, newRole) => {
        try {
            await api.put(`/users/${user.id}`, { ...user, role: newRole });
            setMensagem('Cargo atualizado com sucesso!');
            carregarDados();
        } catch (err) { setMensagem('Erro ao atualizar cargo.'); }
    };

    const handleDeleteUser = async (id) => {
        if (id === userLogado.id) return alert('Não pode eliminar a sua própria conta.');
        if (!window.confirm('Eliminar este utilizador permanentemente?')) return;
        try {
            await api.delete(`/users/${id}`);
            setMensagem('Utilizador removido.');
            carregarDados();
        } catch (err) { setMensagem('Erro ao eliminar utilizador.'); }
    };

    const handleMoveUser = async (userId, empresaId) => {
        try {
            await api.put(`/users/${userId}`, { empresa_id: empresaId });
            setMensagem('Utilizador movido com sucesso!');
            carregarDados();
        } catch (err) { setMensagem('Erro ao mover utilizador.'); }
    };

    // Sub-componente do Explorador Técnico
    const ExploradorTecnico = ({ empresa, usuarios, onVoltar, onRemover, onAlterarRole }) => {
        const usuariosEmpresa = usuarios.filter(u => u.empresa_id === empresa.id);

        const getPermissoes = (role) => {
            if (role === 'admin_empresa') return ['Escrita API', 'Gestão de Hardware', 'Leitura de Dados'];
            if (role === 'tecnico_empresa') return ['Gestão de Hardware', 'Leitura de Dados'];
            if (role === 'leitor_empresa') return ['Leitura de Dados'];
            return [];
        };

        return (
            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl animate-fade-in">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div className="space-y-1">
                        <h2 className="text-3xl font-black flex items-center gap-3 tracking-tight">
                            <span className="text-indigo-400">🔍</span> Auditoria de Recursos: {empresa.nome}
                        </h2>
                        <p className="text-sm font-mono text-slate-500 uppercase tracking-widest">
                            ID_ENTIDADE: {String(empresa.id).padStart(4, '0')} // NIF: {empresa.nif}
                        </p>
                    </div>
                    <button 
                        onClick={onVoltar}
                        className="group flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-black uppercase tracking-widest transition-all border border-white/10"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Voltar à Listagem
                    </button>
                </div>

                <div className="grid gap-4">
                    {usuariosEmpresa.length === 0 ? (
                        <div className="py-20 border-2 border-dashed border-white/5 rounded-[2rem] text-center">
                            <p className="text-slate-600 font-mono text-sm uppercase tracking-[0.2em]">Sem utilizadores registados nesta infraestrutura.</p>
                        </div>
                    ) : (
                        usuariosEmpresa.map(u => (
                            <div key={u.id} className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 hover:bg-white/[0.05] transition-all group">
                                <div className="flex flex-col xl:flex-row justify-between gap-8">
                                    <div className="space-y-6 flex-1">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 font-black text-base">
                                                {u.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-black text-lg text-slate-100">{u.name}</p>
                                                <p className="text-sm font-mono text-slate-500">{u.email}</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {['Escrita API', 'Gestão de Hardware', 'Leitura de Dados'].map(perm => {
                                                const active = getPermissoes(u.role).includes(perm);
                                                return (
                                                    <div key={perm} className={`flex items-center gap-2 px-4 py-2 rounded-md border ${
                                                        active 
                                                        ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' 
                                                        : 'bg-transparent border-white/5 text-slate-700'
                                                    }`}>
                                                        <div className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-indigo-400 animate-pulse' : 'bg-slate-800'}`}></div>
                                                        <span className="text-xs font-black uppercase tracking-tight">
                                                            {perm}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 self-end xl:self-center">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-1">Privilégios</label>
                                            <select 
                                                value={u.role}
                                                onChange={(e) => onAlterarRole(u, e.target.value)}
                                                className="bg-slate-800 border-white/10 text-xs font-black text-white rounded-xl px-4 py-2.5 uppercase tracking-widest focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all cursor-pointer"
                                            >
                                                <option value="admin_empresa">ADMIN</option>
                                                <option value="tecnico_empresa">TÉCNICO</option>
                                                <option value="leitor_empresa">LEITOR</option>
                                            </select>
                                        </div>
                                        <button 
                                            onClick={() => onRemover(u.id)}
                                            className="mt-4 p-3.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all border border-rose-500/20 group/btn"
                                            title="Remover da Entidade"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    ))}
                </div>

                <div className="mt-10 pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <span className="text-3xl font-black font-mono text-indigo-400">{usuariosEmpresa.length}</span>
                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Ativos_Unidade</span>
                        </div>
                    </div>
                    <div className="text-xs font-mono text-slate-700 uppercase tracking-[0.3em]">
                        Terminal_HidroBox_Explorer // System_Ready
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="animate-fade-in pb-20 max-w-7xl mx-auto">
            {/* Header Moderno */}
            <div className="mb-12 flex flex-col lg:flex-row lg:items-center justify-between gap-8 px-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <span className="text-xs font-black uppercase tracking-[0.3em] text-indigo-600">Enterprise Control</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">
                        Gestão de <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-500">Clientes</span>
                    </h1>
                </div>

                <div className="flex items-center gap-4 bg-white p-2 rounded-[2rem] shadow-sm border border-slate-100">
                    <button 
                        id="btn-aba-entidades"
                        onClick={() => { setAbaAtiva('entidades'); setEntidadeSelecionada(null); }}
                        className={`px-8 py-3 rounded-[1.5rem] text-sm font-black uppercase tracking-widest transition-all ${abaAtiva === 'entidades' ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Entidades
                    </button>
                    <button 
                        id="btn-aba-utilizadores"
                        onClick={() => { setAbaAtiva('utilizadores'); setEntidadeSelecionada(null); }}
                        className={`px-8 py-3 rounded-[1.5rem] text-sm font-black uppercase tracking-widest transition-all ${abaAtiva === 'utilizadores' ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Utilizadores
                    </button>
                    <button 
                        id="btn-aba-metricas"
                        onClick={() => { setAbaAtiva('sensores'); setEntidadeSelecionada(null); }}
                        className={`px-8 py-3 rounded-[1.5rem] text-sm font-black uppercase tracking-widest transition-all ${abaAtiva === 'sensores' ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Métricas
                    </button>
                </div>
            </div>

            {mensagem && (
                <div className="mx-4 mb-8 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-between animate-bounce-in">
                    <p className="text-sm font-black text-indigo-600 uppercase tracking-widest">{mensagem}</p>
                    <button onClick={() => setMensagem('')} className="text-indigo-300 hover:text-indigo-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 px-4">
                
                {/* Lado Esquerdo: Listagens */}
                <div className="lg:col-span-8 space-y-10 relative">
                    {isHelpMode && <HelpPin text="🏢 Gestão de Clientes: Aqui controlas toda a base de clientes do HidroBox. Podes adicionar novas organizações, gerir os seus recursos ou removê-las completamente do sistema." className="absolute -top-4 left-4" position="right" />}
                    {abaAtiva === 'entidades' ? (
                        entidadeSelecionada ? (
                            <ExploradorTecnico 
                                empresa={entidadeSelecionada}
                                usuarios={usuarios}
                                onVoltar={() => setEntidadeSelecionada(null)}
                                onRemover={(userId) => handleMoveUser(userId, null)}
                                onAlterarRole={handleAlterarRole}
                            />
                        ) : (
                            <section className="space-y-6">
                                <div className="flex items-center justify-between px-2">
                                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Lista de Entidades</h2>
                                    <span className="px-4 py-1.5 bg-slate-100 rounded-full text-xs font-black text-slate-500 uppercase">{empresas.length} Organizações</span>
                                </div>

                                <div className="grid gap-6">
                                    {empresas.map(emp => (
                                        <div key={emp.id} className="group bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-500">
                                            <div className="flex flex-col md:flex-row justify-between gap-8">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-4 mb-4">
                                                        <div className="h-14 w-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">{emp.nome}</h3>
                                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">NIF: {emp.nif}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-4">
                                                        <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                                                            <p className="text-base font-black text-slate-900">{emp.users_count || 0}</p>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase">Utilizadores</p>
                                                        </div>
                                                        <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                                                            <p className="text-base font-black text-slate-900">{emp.zonas_count || 0}</p>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase">Zonas</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col justify-between items-end gap-4">
                                                    <div className="flex gap-2">
                                                        <Tooltip text="Editar informações da entidade" position="left">
                                                            <button 
                                                                onClick={() => setEditandoEmpresa(emp)}
                                                                className="p-3 bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-2xl transition-all border border-slate-100"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                            </button>
                                                        </Tooltip>
                                                        <Tooltip text="Eliminar organização permanentemente" position="left">
                                                            <button 
                                                                onClick={() => handleDeleteEmpresa(emp.id)}
                                                                className="p-3 bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-2xl transition-all border border-slate-100"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        </Tooltip>
                                                    </div>
                                                    <Tooltip text="Gerir equipa e equipamentos desta entidade" position="left">
                                                        <button 
                                                        onClick={() => setEntidadeSelecionada(emp)}
                                                        className="text-xs font-black text-indigo-600 bg-indigo-50 px-6 py-2.5 rounded-xl hover:bg-indigo-600 hover:text-white transition-all uppercase tracking-widest"
                                                        >
                                                            Gerir Recursos
                                                        </button>
                                                    </Tooltip>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )
                    ) : abaAtiva === 'sensores' ? (
                        <section className="space-y-6 relative">
                            {isHelpMode && <HelpPin text="🧪 Catálogo de Sensores: Adiciona aqui novas métricas (ex: Salinidade, Turbidez). Elas ficarão imediatamente disponíveis em todo o sistema." className="absolute -top-4 right-4" position="left" />}
                            <div className="flex items-center justify-between px-2">
                                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Catálogo de Sensores</h2>
                                <span className="px-4 py-1.5 bg-slate-100 rounded-full text-xs font-black text-slate-500 uppercase">{tiposSensor.length} Tipos</span>
                            </div>

                            <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Nome do Sensor</th>
                                            <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Unidade</th>
                                            <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {tiposSensor.map(s => (
                                            <tr key={s.id} className="hover:bg-slate-50/30 transition-colors group">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <Tooltip text={`Tipo de medição: ${s.nome}`}>
                                                            <div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-black text-lg cursor-help">
                                                                {s.nome.includes('Oxig') ? '🫧' : s.nome.includes('pH') ? '⚗️' : '🌡️'}
                                                            </div>
                                                        </Tooltip>
                                                        <p className="text-base font-black text-slate-900 leading-none">{s.nome}</p>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <Tooltip text="Unidade de medida padrão">
                                                        <span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-black text-slate-600 uppercase cursor-help">
                                                            {s.unidade}
                                                        </span>
                                                    </Tooltip>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Tooltip text="Editar definição da métrica" position="left">
                                                            <button 
                                                                onClick={() => setEditandoTipoSensor(s)}
                                                                className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                                </svg>
                                                            </button>
                                                        </Tooltip>
                                                        <Tooltip text="Remover métrica do sistema" position="left">
                                                            <button 
                                                                onClick={() => handleDeleteTipoSensor(s.id)}
                                                                className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        </Tooltip>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    ) : abaAtiva === 'utilizadores' ? (
                        <section className="space-y-6 relative">
                            {isHelpMode && <HelpPin text="👥 Utilizadores: Gere quem tem acesso ao sistema. Podes criar novos acessos ou alterar as permissões e empresas de cada um." className="absolute -top-4 right-4" position="left" />}
                            <div className="flex items-center justify-between px-2">
                                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Utilizadores Ativos</h2>
                                <span className="px-4 py-1.5 bg-slate-100 rounded-full text-xs font-black text-slate-500 uppercase">{usuarios.length} Contas</span>
                            </div>

                            <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Utilizador</th>
                                            <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Nível de Acesso</th>
                                            <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {usuarios.map(u => (
                                            <tr key={u.id} className="hover:bg-slate-50/30 transition-colors group">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <Tooltip text={`Iniciais de ${u.name}`}>
                                                            <div className="h-10 w-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-black text-lg cursor-help">
                                                                {u.name.charAt(0).toUpperCase()}
                                                            </div>
                                                        </Tooltip>
                                                        <div>
                                                            <p className="text-base font-black text-slate-900 leading-none mb-1">{u.name}</p>
                                                            <p className="text-xs font-bold text-slate-400">{u.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <Tooltip text="Função atribuída no sistema" position="right">
                                                        <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase cursor-help ${
                                                            u.role === 'super_admin' ? 'bg-rose-100 text-rose-600' :
                                                            u.role === 'admin_empresa' ? 'bg-indigo-100 text-indigo-600' :
                                                            u.role === 'tecnico_empresa' ? 'bg-blue-100 text-blue-600' :
                                                            'bg-slate-100 text-slate-600'
                                                        }`}>
                                                            {u.role.replace('_empresa', '').replace('_', ' ')}
                                                        </span>
                                                    </Tooltip>
                                                    {u.empresa_id && (
                                                        <Tooltip text="Organização à qual este utilizador pertence" position="right">
                                                            <p className="text-[10px] font-bold text-slate-400 mt-2 cursor-help">
                                                                {empresas.find(e => e.id === u.empresa_id)?.nome || 'Sem Empresa'}
                                                            </p>
                                                        </Tooltip>
                                                    )}
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Tooltip text="Editar perfil e acessos" position="left">
                                                            <button 
                                                                onClick={() => setEditandoUser(u)}
                                                                className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                                </svg>
                                                            </button>
                                                        </Tooltip>
                                                        <Tooltip text="Eliminar conta permanentemente" position="left">
                                                            <button 
                                                                onClick={() => handleDeleteUser(u.id)}
                                                                className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        </Tooltip>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    ) : null}
                </div>

                {/* Lado Direito: Formulários contextuais */}
                <div className="lg:col-span-4 space-y-8">
                    
                    {/* Painel de Edição Empresa */}
                    {editandoEmpresa ? (
                        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border-2 border-indigo-500 shadow-indigo-100 animate-in slide-in-from-right duration-500">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">Editar Empresa</h3>
                                <button onClick={() => setEditandoEmpresa(null)} className="text-slate-300 hover:text-slate-900">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <form onSubmit={handleUpdateEmpresa} className="space-y-6">
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Nome Corporativo</label>
                                    <input 
                                        type="text" required value={editandoEmpresa.nome}
                                        onChange={e => setEditandoEmpresa({...editandoEmpresa, nome: e.target.value})}
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 font-bold text-sm transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">NIF / Identificação</label>
                                    <input 
                                        type="text" required value={editandoEmpresa.nif}
                                        onChange={e => setEditandoEmpresa({...editandoEmpresa, nif: e.target.value})}
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 font-bold text-sm transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Email de Contacto</label>
                                    <input 
                                        type="email" value={editandoEmpresa.email_contacto || ''}
                                        onChange={e => setEditandoEmpresa({...editandoEmpresa, email_contacto: e.target.value})}
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 font-bold text-sm transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Telefone / Emergência</label>
                                    <input 
                                        type="text" value={editandoEmpresa.telefone || ''}
                                        onChange={e => setEditandoEmpresa({...editandoEmpresa, telefone: e.target.value})}
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 font-bold text-sm transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Morada Sede</label>
                                    <input 
                                        type="text" value={editandoEmpresa.morada || ''}
                                        onChange={e => setEditandoEmpresa({...editandoEmpresa, morada: e.target.value})}
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 font-bold text-sm transition-all"
                                    />
                                </div>
                                <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">
                                    Guardar Alterações
                                </button>
                            </form>
                        </div>
                    ) : editandoUser ? (
                        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border-2 border-indigo-500 shadow-indigo-100 animate-in slide-in-from-right duration-500">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">Editar Perfil</h3>
                                <button onClick={() => setEditandoUser(null)} className="text-slate-300 hover:text-slate-900">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <form onSubmit={handleUpdateUser} className="space-y-6">
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Nome Completo</label>
                                    <input 
                                        type="text" required value={editandoUser.name}
                                        onChange={e => setEditandoUser({...editandoUser, name: e.target.value})}
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 font-bold text-sm transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">E-mail</label>
                                    <input 
                                        type="email" required value={editandoUser.email}
                                        onChange={e => setEditandoUser({...editandoUser, email: e.target.value})}
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 font-bold text-sm transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Nova Palavra-passe</label>
                                    <input 
                                        type="password" placeholder="Deixar em branco para não alterar" 
                                        value={editandoUser.password || ''}
                                        onChange={e => setEditandoUser({...editandoUser, password: e.target.value})}
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 font-bold text-sm transition-all placeholder:text-slate-300"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Nível de Acesso</label>
                                    <select 
                                        value={editandoUser.role}
                                        onChange={e => setEditandoUser({...editandoUser, role: e.target.value})}
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 font-black text-sm uppercase transition-all cursor-pointer"
                                    >
                                        <option value="super_admin">SUPER ADMIN</option>
                                        <option value="admin_empresa">ADMIN EMPRESA</option>
                                        <option value="tecnico_empresa">TÉCNICO</option>
                                        <option value="leitor_empresa">LEITOR</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Empresa Vinculada</label>
                                    <select 
                                        value={editandoUser.empresa_id || ''}
                                        onChange={e => setEditandoUser({...editandoUser, empresa_id: e.target.value})}
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 font-black text-sm uppercase transition-all cursor-pointer"
                                    >
                                        <option value="">Sem Empresa Vinculada</option>
                                        {empresas.map(emp => (
                                            <option key={emp.id} value={emp.id}>{emp.nome}</option>
                                        ))}
                                    </select>
                                </div>
                                <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">
                                    Atualizar Dados
                                </button>
                            </form>
                        </div>
                    ) : editandoTipoSensor ? (
                        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border-2 border-blue-500 shadow-blue-100 animate-in slide-in-from-right duration-500">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">Editar Sensor</h3>
                                <button onClick={() => setEditandoTipoSensor(null)} className="text-slate-300 hover:text-slate-900">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <form onSubmit={handleUpdateTipoSensor} className="space-y-6">
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Nome do Sensor</label>
                                    <input 
                                        type="text" required value={editandoTipoSensor.nome}
                                        onChange={e => setEditandoTipoSensor({...editandoTipoSensor, nome: e.target.value})}
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 font-bold text-sm transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Unidade (ex: °C, pH, mg/L)</label>
                                    <input 
                                        type="text" required value={editandoTipoSensor.unidade}
                                        onChange={e => setEditandoTipoSensor({...editandoTipoSensor, unidade: e.target.value})}
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 font-bold text-sm transition-all"
                                    />
                                </div>
                                <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">
                                    Atualizar Definições
                                </button>
                            </form>
                        </div>
                    ) : abaAtiva === 'sensores' ? (
                        <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white shadow-2xl shadow-blue-200 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 rounded-full blur-[50px] -mr-16 -mt-16"></div>
                            
                            <div className="relative z-10">
                                <h3 className="text-3xl font-black uppercase tracking-tight leading-none mb-2">Novo <span className="text-blue-400">Sensor</span></h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-8">Definição de Métrica Global</p>
                                
                                <form onSubmit={handleCriarTipoSensor} className="space-y-6">
                                    <div className="space-y-4">
                                        <input 
                                            type="text" required value={novoTipoSensor.nome}
                                            onChange={e => setNovoTipoSensor({...novoTipoSensor, nome: e.target.value})}
                                            className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:bg-white/10 focus:border-blue-500 transition-all font-bold text-base placeholder:text-slate-600"
                                            placeholder="Nome (ex: Turbidez)"
                                        />
                                        <input 
                                            type="text" required value={novoTipoSensor.unidade}
                                            onChange={e => setNovoTipoSensor({...novoTipoSensor, unidade: e.target.value})}
                                            className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:bg-white/10 focus:border-blue-500 transition-all font-bold text-base placeholder:text-slate-600"
                                            placeholder="Unidade (ex: NTU)"
                                        />
                                    </div>
                                    <button type="submit" className="w-full bg-blue-600 py-6 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-white hover:text-slate-900 transition-all shadow-xl shadow-blue-900/40">
                                        Registar Métrica
                                    </button>
                                </form>
                            </div>
                        </div>
                    ) : abaAtiva === 'utilizadores' && !editandoUser ? (
                        <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white shadow-2xl shadow-slate-200 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/20 rounded-full blur-[50px] -mr-16 -mt-16"></div>
                            
                            <div className="relative z-10">
                                <h3 className="text-3xl font-black uppercase tracking-tight leading-none mb-2">Novo <span className="text-indigo-400">Utilizador</span></h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-8">Criar Conta de Acesso</p>
                                
                                <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    try {
                                        await api.post('/users', novoUtilizador);
                                        setMensagem('Utilizador criado com sucesso!');
                                        setNovoUtilizador({ name: '', email: '', password: '', role: 'leitor_empresa', empresa_id: '' });
                                        carregarDados();
                                    } catch (err) { setMensagem('Erro ao criar utilizador.'); }
                                }} className="space-y-4">
                                    <input 
                                        type="text" required value={novoUtilizador.name}
                                        onChange={e => setNovoUtilizador({...novoUtilizador, name: e.target.value})}
                                        className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:bg-white/10 focus:border-indigo-500 transition-all font-bold text-sm placeholder:text-slate-500"
                                        placeholder="Nome Completo"
                                    />
                                    <input 
                                        type="email" required value={novoUtilizador.email}
                                        onChange={e => setNovoUtilizador({...novoUtilizador, email: e.target.value})}
                                        className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:bg-white/10 focus:border-indigo-500 transition-all font-bold text-sm placeholder:text-slate-500"
                                        placeholder="E-mail de Acesso"
                                    />
                                    <input 
                                        type="password" required value={novoUtilizador.password}
                                        onChange={e => setNovoUtilizador({...novoUtilizador, password: e.target.value})}
                                        className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:bg-white/10 focus:border-indigo-500 transition-all font-bold text-sm placeholder:text-slate-500"
                                        placeholder="Palavra-passe"
                                    />
                                    <select 
                                        value={novoUtilizador.role}
                                        onChange={e => setNovoUtilizador({...novoUtilizador, role: e.target.value})}
                                        className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:bg-white/10 focus:border-indigo-500 transition-all font-black text-xs uppercase tracking-widest text-white cursor-pointer [&>option]:bg-slate-900"
                                    >
                                        <option value="super_admin">SUPER ADMIN</option>
                                        <option value="admin_empresa">ADMIN EMPRESA</option>
                                        <option value="tecnico_empresa">TÉCNICO</option>
                                        <option value="leitor_empresa">LEITOR</option>
                                    </select>
                                    <select 
                                        value={novoUtilizador.empresa_id}
                                        onChange={e => setNovoUtilizador({...novoUtilizador, empresa_id: e.target.value})}
                                        className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:bg-white/10 focus:border-indigo-500 transition-all font-black text-xs uppercase tracking-widest text-slate-300 cursor-pointer [&>option]:bg-slate-900"
                                    >
                                        <option value="">Sem Empresa Vinculada</option>
                                        {empresas.map(emp => (
                                            <option key={emp.id} value={emp.id}>{emp.nome}</option>
                                        ))}
                                    </select>
                                    <button type="submit" className="w-full bg-indigo-600 mt-4 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-white hover:text-slate-900 transition-all shadow-xl shadow-indigo-900/40">
                                        Criar Conta
                                    </button>
                                </form>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white shadow-2xl shadow-slate-200 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/20 rounded-full blur-[50px] -mr-16 -mt-16"></div>
                            
                            <div className="relative z-10">
                                <h3 className="text-3xl font-black uppercase tracking-tight leading-none mb-2">Novo <span className="text-indigo-400">Hub</span></h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-8">Registo de Entidade</p>
                                
                                <form onSubmit={handleCriarEmpresa} className="space-y-6">
                                    <div className="space-y-4">
                                        <input 
                                            type="text" required value={novaEmpresa.nome}
                                            onChange={e => setNovaEmpresa({...novaEmpresa, nome: e.target.value})}
                                            className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:bg-white/10 focus:border-indigo-500 transition-all font-bold text-base placeholder:text-slate-600"
                                            placeholder="Nome da Empresa"
                                        />
                                        <input 
                                            type="text" required value={novaEmpresa.nif}
                                            onChange={e => setNovaEmpresa({...novaEmpresa, nif: e.target.value})}
                                            className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:bg-white/10 focus:border-indigo-500 transition-all font-bold text-base placeholder:text-slate-600"
                                            placeholder="NIF / Identificação"
                                        />
                                        <input 
                                            type="email" value={novaEmpresa.email_contacto}
                                            onChange={e => setNovaEmpresa({...novaEmpresa, email_contacto: e.target.value})}
                                            className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:bg-white/10 focus:border-indigo-500 transition-all font-bold text-base placeholder:text-slate-600"
                                            placeholder="Email de Contacto"
                                        />
                                        <input 
                                            type="text" value={novaEmpresa.telefone}
                                            onChange={e => setNovaEmpresa({...novaEmpresa, telefone: e.target.value})}
                                            className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:bg-white/10 focus:border-indigo-500 transition-all font-bold text-base placeholder:text-slate-600"
                                            placeholder="Telefone / Emergência"
                                        />
                                        <input 
                                            type="text" value={novaEmpresa.morada}
                                            onChange={e => setNovaEmpresa({...novaEmpresa, morada: e.target.value})}
                                            className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:bg-white/10 focus:border-indigo-500 transition-all font-bold text-base placeholder:text-slate-600"
                                            placeholder="Morada (Sede)"
                                        />
                                    </div>
                                    <button type="submit" className="w-full bg-indigo-600 py-6 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-white hover:text-slate-900 transition-all shadow-xl shadow-indigo-900/40">
                                        Inicializar Entidade
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Quick Stats Widget */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 px-2">Resumo Global</p>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                                <p className="text-3xl font-black text-slate-900">{empresas.length}</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Entidades</p>
                            </div>
                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                                <p className="text-3xl font-black text-slate-900">{usuarios.length}</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Utilizadores</p>
                            </div>
                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                                <p className="text-3xl font-black text-slate-900">{tiposSensor.length}</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Métricas</p>
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}
