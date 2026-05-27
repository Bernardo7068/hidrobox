import { useState, useEffect } from 'react';
import api from '../api';

export default function PainelAdminEmpresa() {
    const userLogado = JSON.parse(localStorage.getItem('user') || '{}');
    const [usuarios, setUsuarios] = useState([]);
    const [novoUser, setNovoUser] = useState({ name: '', email: '', password: '', role: 'tecnico_empresa' });
    const [editandoUser, setEditandoUser] = useState(null);
    const [mensagem, setMensagem] = useState('');

    useEffect(() => { carregarUsuarios(); }, []);

    const carregarUsuarios = async () => {
        try {
            const res = await api.get('/users');
            setUsuarios(res.data);
        } catch (err) { console.error('Erro ao carregar utilizadores'); }
    };

    const handleCriar = async (e) => {
        e.preventDefault();
        try {
            // Se for super_admin, ele pode estar a criar para si mesmo (sem empresa) ou devia poder escolher.
            // Mas este painel é focado na "Empresa" do admin logado.
            await api.post('/users', {
                ...novoUser,
                empresa_id: userLogado.empresa_id // Garantir que vai para a empresa do admin
            });
            setMensagem('Utilizador registado com sucesso!');
            setNovoUser({ name: '', email: '', password: '', role: 'tecnico_empresa' });
            carregarUsuarios();
            setTimeout(() => setMensagem(''), 3000);
        } catch (err) { 
            setMensagem('Erro ao criar utilizador. Verifique os dados.'); 
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/users/${editandoUser.id}`, editandoUser);
            setMensagem('Perfil atualizado!');
            setEditandoUser(null);
            carregarUsuarios();
        } catch (err) { setMensagem('Erro ao atualizar perfil.'); }
    };

    const handleRemover = async (id) => {
        if (id === userLogado.id) return alert('Não pode remover a sua própria conta.');
        if (!window.confirm('Remover este membro da equipa?')) return;
        try {
            await api.delete(`/users/${id}`);
            carregarUsuarios();
            setMensagem('Membro removido.');
        } catch (err) { setMensagem('Erro ao remover utilizador.'); }
    };

    const getRoleLabel = (role) => {
        const roles = {
            'super_admin': 'Super Administrador',
            'admin_empresa': 'Administrador',
            'tecnico_empresa': 'Técnico de Campo',
            'leitor_empresa': 'Visualizador'
        };
        return roles[role] || role;
    };

    return (
        <div className="space-y-12 animate-fade-in p-2 max-w-7xl mx-auto">
            
            {/* Header com Branding Dinâmico */}
            <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex items-center gap-6">
                    <div className="h-20 w-20 bg-gradient-to-br from-indigo-600 to-blue-500 rounded-[2rem] flex items-center justify-center text-white text-3xl shadow-xl shadow-indigo-100">
                        {userLogado.role === 'super_admin' ? '🌍' : '🏢'}
                    </div>
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tight leading-none mb-2">
                            Gestão de <span className="text-indigo-600">Talento</span>
                        </h2>
                        <p className="text-slate-400 font-bold uppercase text-xs tracking-[0.3em]">
                            {userLogado.role === 'super_admin' ? 'Controlo Global de Acessos' : 'Administração de Equipa Local'}
                        </p>
                    </div>
                </div>
                
                <div className="flex gap-4">
                    <div className="px-8 py-4 bg-slate-50 rounded-[1.5rem] text-center border border-slate-100">
                        <p className="text-3xl font-black text-slate-900 leading-none">{usuarios.length}</p>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Colaboradores</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                
                {/* Lista de Membros */}
                <div className="xl:col-span-8 space-y-6">
                    <div className="flex items-center justify-between px-4">
                        <h3 className="text-base font-black text-slate-900 uppercase tracking-widest">Equipa Ativa</h3>
                    </div>

                    <div className="grid gap-4">
                        {usuarios.map(u => (
                            <div key={u.id} className="group bg-white p-6 rounded-[2.5rem] border border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-500 flex flex-col sm:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-5">
                                    <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white font-black text-xl transition-all">
                                        {u.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-900 text-xl leading-none mb-1 uppercase tracking-tight">{u.name}</h4>
                                        <p className="text-sm font-bold text-slate-400 mb-2">{u.email}</p>
                                        <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest ${
                                            u.role === 'admin_empresa' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-500'
                                        }`}>
                                            {getRoleLabel(u.role)}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={() => setEditandoUser(u)}
                                        className="p-3 bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all border border-slate-100"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                    <button 
                                        onClick={() => handleRemover(u.id)}
                                        className="p-3 bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all border border-slate-100"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Formulário Lateral */}
                <div className="xl:col-span-4">
                    {editandoUser ? (
                        <div className="bg-white p-10 rounded-[2.5rem] border-2 border-indigo-500 shadow-xl shadow-indigo-100 sticky top-8 animate-in slide-in-from-right duration-500">
                             <div className="flex justify-between items-center mb-8">
                                <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">Editar Perfil</h3>
                                <button onClick={() => setEditandoUser(null)} className="text-slate-300 hover:text-slate-900">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <form onSubmit={handleUpdate} className="space-y-6">
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Nome</label>
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
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Função</label>
                                    <select 
                                        value={editandoUser.role}
                                        onChange={e => setEditandoUser({...editandoUser, role: e.target.value})}
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 font-black text-sm uppercase transition-all cursor-pointer"
                                    >
                                        <option value="admin_empresa">ADMINISTRADOR</option>
                                        <option value="tecnico_empresa">TÉCNICO</option>
                                        <option value="leitor_empresa">VISUALIZADOR</option>
                                    </select>
                                </div>
                                <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">
                                    Guardar Alterações
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl shadow-slate-200 sticky top-8 overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/20 rounded-full blur-[50px] -mr-16 -mt-16"></div>
                            
                            <div className="relative z-10">
                                <h3 className="text-3xl font-black uppercase tracking-tight leading-none mb-2">Novo <span className="text-indigo-400">Membro</span></h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-8">Expandir a equipa</p>

                                <form onSubmit={handleCriar} className="space-y-6">
                                    <input 
                                        type="text" required placeholder="Nome Completo"
                                        value={novoUser.name} onChange={e => setNovoUser({...novoUser, name: e.target.value})}
                                        className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:bg-white/10 focus:border-indigo-500 transition-all font-bold text-base placeholder:text-slate-600"
                                    />
                                    <input 
                                        type="email" required placeholder="E-mail"
                                        value={novoUser.email} onChange={e => setNovoUser({...novoUser, email: e.target.value})}
                                        className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:bg-white/10 focus:border-indigo-500 transition-all font-bold text-base placeholder:text-slate-600"
                                    />
                                    <input 
                                        type="password" required placeholder="Password Inicial"
                                        value={novoUser.password} onChange={e => setNovoUser({...novoUser, password: e.target.value})}
                                        className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:bg-white/10 focus:border-indigo-500 transition-all font-bold text-base placeholder:text-slate-600"
                                    />
                                    <select 
                                        value={novoUser.role} onChange={e => setNovoUser({...novoUser, role: e.target.value})}
                                        className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:bg-white/10 focus:border-indigo-500 transition-all font-black text-sm uppercase"
                                    >
                                        <option value="tecnico_empresa" className="bg-slate-900">🛠️ Técnico</option>
                                        <option value="leitor_empresa" className="bg-slate-900">👁️ Leitor</option>
                                        <option value="admin_empresa" className="bg-slate-900">🔑 Admin</option>
                                    </select>
                                    
                                    <button type="submit" className="w-full bg-indigo-600 py-6 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white hover:text-slate-900 transition-all shadow-xl shadow-indigo-900/40">
                                        Registar na Equipa
                                    </button>
                                </form>
                                
                                {mensagem && (
                                    <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                                        <p className="text-xs font-black text-emerald-400 uppercase tracking-widest">{mensagem}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
