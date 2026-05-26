import { useState, useEffect } from 'react';
import api from '../api';

export default function PainelSuperAdmin() {
    const userLogado = JSON.parse(localStorage.getItem('user') || '{}');
    const [empresas, setEmpresas] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [novaEmpresa, setNovaEmpresa] = useState({ 
        nome: '', nif: '', 
        admin_id: '', admin_nome: '', admin_email: '', admin_password: '' 
    });
    const [usarExistente, setUsarExistente] = useState(true);
    const [mensagem, setMensagem] = useState('');

    useEffect(() => { carregarDados(); }, []);

    const carregarDados = async () => {
        try {
            const [resEmp, resUsers] = await Promise.all([
                api.get('/empresas'),
                api.get('/users')
            ]);
            setEmpresas(resEmp.data);
            setUsuarios(resUsers.data);
        } catch (err) { console.error(err); }
    };

    const handleCriarTudo = async (e) => {
        e.preventDefault();
        try {
            // Limpar campos irrelevantes antes de enviar
            const dadosParaEnviar = { ...novaEmpresa };
            if (usarExistente) {
                delete dadosParaEnviar.admin_nome;
                delete dadosParaEnviar.admin_email;
                delete dadosParaEnviar.admin_password;
            } else {
                delete dadosParaEnviar.admin_id;
            }

            await api.post('/empresas', dadosParaEnviar);
            setMensagem('Empresa configurada com sucesso!');
            setNovaEmpresa({ nome: '', nif: '', admin_id: '', admin_nome: '', admin_email: '', admin_password: '' });
            carregarDados();
        } catch (err) { setMensagem('Erro ao criar registo. Verifique os dados.'); }
    };

    const handleAlterarRole = async (userId, novaRole) => {
        // [SEGURANÇA] Impedir que o próprio user mude o seu cargo (evitar auto-despromoção)
        if (userId === userLogado.id) {
            alert('Não pode alterar o seu próprio cargo para evitar perda de acesso.');
            return;
        }
        try {
            await api.put(`/users/${userId}`, { role: novaRole });
            setMensagem('Privilégios atualizados!');
            carregarDados();
        } catch (err) { setMensagem('Erro ao atualizar cargo.'); }
    };

    const handleVincularRepresentante = async (userId, empresaId) => {
        try {
            await api.put(`/users/${userId}`, { empresa_id: empresaId, role: 'admin_empresa' });
            setMensagem('Representante atualizado!');
            carregarDados();
        } catch (err) { setMensagem('Erro ao vincular representante.'); }
    };

    return (
        <div className="space-y-10 animate-fade-in pb-20">
            <div className="bg-white rounded-3xl p-10 shadow-xl border border-slate-100">
                <h2 className="text-3xl font-black text-slate-800 mb-2 uppercase tracking-tighter">👑 Gestão Global HidroBox</h2>
                <p className="text-slate-400 font-medium mb-8 uppercase text-[10px] tracking-widest">Painel de Super Administrador</p>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    
                    {/* Coluna 1: Lista de Empresas e Edição de Roles */}
                    <div className="lg:col-span-8 space-y-10">
                        <section>
                            <div className="flex justify-between items-end border-b pb-4 mb-8">
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest italic">Carteira de Clientes & Estruturas</h3>
                                <div className="flex gap-4 text-[10px] font-black text-slate-400">
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded-full"></span> Admin</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-500 rounded-full"></span> Técnico</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-slate-400 rounded-full"></span> Leitor</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-8">
                                {empresas.map(emp => {
                                    const membros = usuarios.filter(u => u.empresa_id === emp.id);
                                    const adminEmpresa = membros.find(u => u.role === 'admin_empresa');
                                    const candidatosAdmin = usuarios.filter(u => u.role !== 'super_admin');

                                    return (
                                        <div key={emp.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col md:flex-row border-l-8 border-l-blue-600">
                                            {/* Lateral Esquerda: Info Empresa */}
                                            <div className="p-8 md:w-1/3 bg-slate-50 border-r border-slate-100">
                                                <div className="mb-6">
                                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">ID #{emp.id}</p>
                                                    <h4 className="text-2xl font-black text-slate-800 leading-tight">{emp.nome}</h4>
                                                    <p className="text-xs font-mono text-slate-400 mt-2">{emp.nif}</p>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3 mb-8">
                                                    <div className="bg-white p-3 rounded-2xl border border-slate-100 text-center">
                                                        <p className="text-[10px] font-black text-slate-800">{emp.users_count || 0}</p>
                                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Membros</p>
                                                    </div>
                                                    <div className="bg-white p-3 rounded-2xl border border-slate-100 text-center">
                                                        <p className="text-[10px] font-black text-slate-800">{emp.zonas_count || 0}</p>
                                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Zonas</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-3 pt-6 border-t border-slate-200">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Alterar Responsável</p>
                                                    <div className="relative">
                                                        <select 
                                                            className="w-full text-[10px] font-black bg-white border border-slate-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer pr-10"
                                                            value={adminEmpresa?.id || ''}
                                                            onChange={(e) => handleVincularRepresentante(e.target.value, emp.id)}
                                                        >
                                                            <option value="">-- ATRIBUIR --</option>
                                                            {candidatosAdmin.map(u => (
                                                                <option key={u.id} value={u.id}>
                                                                    {u.name.toUpperCase()}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-blue-500 text-[10px]">▼</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Lateral Direita: Hierarquia da Equipa */}
                                            <div className="p-8 flex-1 bg-white">
                                                <div className="flex justify-between items-center mb-6">
                                                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Estrutura Hierárquica</h5>
                                                    <button className="text-[10px] font-black text-blue-600 hover:underline uppercase tracking-tighter">Ver Todos</button>
                                                </div>

                                                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                                    {membros.length > 0 ? (
                                                        membros.sort((a,b) => {
                                                            const weights = { admin_empresa: 1, tecnico_empresa: 2, leitor_empresa: 3 };
                                                            return weights[a.role] - weights[b.role];
                                                        }).map(membro => (
                                                            <div key={membro.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-all group">
                                                                <div className="flex items-center gap-4">
                                                                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-white text-[10px] font-black shadow-sm ${
                                                                        membro.role === 'admin_empresa' ? 'bg-blue-600 shadow-blue-200' : 
                                                                        membro.role === 'tecnico_empresa' ? 'bg-amber-500 shadow-amber-100' : 'bg-slate-400'
                                                                    }`}>
                                                                        {membro.name.charAt(0)}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs font-black text-slate-800 leading-none uppercase tracking-tighter">{membro.name}</p>
                                                                        <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase italic">{membro.role.replace('_', ' ')}</p>
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="flex items-center gap-3">
                                                                    <select 
                                                                        value={membro.role}
                                                                        disabled={membro.id === userLogado.id}
                                                                        onChange={(e) => handleAlterarRole(membro.id, e.target.value)}
                                                                        className="opacity-0 group-hover:opacity-100 text-[8px] font-black bg-white text-slate-700 px-2 py-1 rounded-lg border border-slate-200 outline-none uppercase transition-all"
                                                                    >
                                                                        <option value="admin_empresa">ADMIN</option>
                                                                        <option value="tecnico_empresa">TÉCNICO</option>
                                                                        <option value="leitor_empresa">LEITOR</option>
                                                                    </select>
                                                                    <div className={`w-2 h-2 rounded-full ${membro.role === 'admin_empresa' ? 'bg-blue-500 animate-pulse' : 'bg-slate-200'}`}></div>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center py-10 opacity-40">
                                                            <span className="text-3xl mb-2">🏜️</span>
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sem membros vinculados</p>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                                                    <div className="flex -space-x-3">
                                                        {membros.slice(0, 5).map(m => (
                                                            <div key={m.id} className="h-8 w-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[8px] font-black text-slate-600 overflow-hidden shadow-sm">
                                                                {m.name.charAt(0)}
                                                            </div>
                                                        ))}
                                                        {membros.length > 5 && (
                                                            <div className="h-8 w-8 rounded-full border-2 border-white bg-blue-50 flex items-center justify-center text-[8px] font-black text-blue-600 shadow-sm">
                                                                +{membros.length - 5}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                                        Equipa {emp.nome}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </div>

                    {/* Coluna 2: Formulário Unificado */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl sticky top-4">
                            <div className="mb-8">
                                <h3 className="text-xl font-black uppercase tracking-widest text-blue-400 leading-tight">Nova Entidade & Representante</h3>
                                <p className="text-[9px] text-slate-500 font-bold uppercase mt-2 tracking-[0.2em]">Registo Atómico de Cliente</p>
                            </div>
                            
                            <form onSubmit={handleCriarTudo} className="space-y-6">
                                {/* Bloco Empresa */}
                                <div className="space-y-4">
                                    <div className="h-px bg-white/10 w-full mb-6"></div>
                                    <input 
                                        type="text" required value={novaEmpresa.nome}
                                        onChange={e => setNovaEmpresa({...novaEmpresa, nome: e.target.value})}
                                        className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-blue-500 transition-all font-bold text-xs"
                                        placeholder="Designação da Empresa"
                                    />
                                    <input 
                                        type="text" required value={novaEmpresa.nif}
                                        onChange={e => setNovaEmpresa({...novaEmpresa, nif: e.target.value})}
                                        className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-blue-500 transition-all font-bold text-xs"
                                        placeholder="NIF Corporativo"
                                    />
                                </div>

                                {/* Alternador de Tipo de Admin */}
                                <div className="flex gap-2 p-1 bg-white/5 rounded-xl mb-4">
                                    <button 
                                        type="button"
                                        onClick={() => setUsarExistente(true)}
                                        className={`flex-1 py-2 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all ${usarExistente ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        Utilizador Existente
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setUsarExistente(false)}
                                        className={`flex-1 py-2 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all ${!usarExistente ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        Novo Registo
                                    </button>
                                </div>

                                {/* Bloco Admin */}
                                <div className="space-y-4 pt-4">
                                    <div className="h-px bg-white/10 w-full mb-6 text-center relative">
                                        <span className="absolute left-1/2 -top-2 -translate-x-1/2 bg-slate-900 px-2 text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                            {usarExistente ? 'Selecionar Responsável' : 'Dados do Novo Admin'}
                                        </span>
                                    </div>

                                    {usarExistente ? (
                                        <div className="relative">
                                            <select 
                                                required
                                                value={novaEmpresa.admin_id}
                                                onChange={e => setNovaEmpresa({...novaEmpresa, admin_id: e.target.value})}
                                                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-blue-500 transition-all font-bold text-xs appearance-none cursor-pointer"
                                            >
                                                <option value="" className="bg-slate-900">-- SELECIONAR UTILIZADOR --</option>
                                                {usuarios.filter(u => u.role !== 'super_admin').map(u => (
                                                    <option key={u.id} value={u.id} className="bg-slate-900">
                                                        {u.name.toUpperCase()} ({u.email})
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-blue-500">▼</div>
                                        </div>
                                    ) : (
                                        <>
                                            <input 
                                                type="text" required value={novaEmpresa.admin_nome}
                                                onChange={e => setNovaEmpresa({...novaEmpresa, admin_nome: e.target.value})}
                                                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-blue-500 transition-all font-bold text-xs"
                                                placeholder="Nome do Representante"
                                            />
                                            <input 
                                                type="email" required value={novaEmpresa.admin_email}
                                                onChange={e => setNovaEmpresa({...novaEmpresa, admin_email: e.target.value})}
                                                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-blue-500 transition-all font-bold text-xs"
                                                placeholder="E-mail Principal"
                                            />
                                            <input 
                                                type="password" required value={novaEmpresa.admin_password}
                                                onChange={e => setNovaEmpresa({...novaEmpresa, admin_password: e.target.value})}
                                                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-blue-500 transition-all font-bold text-xs"
                                                placeholder="Senha de Acesso"
                                            />
                                        </>
                                    )}
                                </div>

                                <button type="submit" className="w-full bg-blue-600 py-6 rounded-3xl font-black uppercase tracking-[0.25em] hover:bg-white hover:text-slate-900 transition-all shadow-xl shadow-blue-900/50 text-[10px]">
                                    Validar & Abrir Cliente 🚀
                                </button>
                                {mensagem && <p className="text-[10px] text-center font-black text-emerald-400 uppercase mt-4 animate-pulse">{mensagem}</p>}
                            </form>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
