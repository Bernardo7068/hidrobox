import { useState, useEffect } from 'react';
import api from '../api';

export default function PainelAdminEmpresa() {
    const [usuarios, setUsuarios] = useState([]);
    const [novoUser, setNovaUser] = useState({ name: '', email: '', password: '', role: 'tecnico_empresa' });
    const [mensagem, setMensagem] = useState('');

    useEffect(() => { carregarUsuarios(); }, []);

    const carregarUsuarios = async () => {
        const res = await api.get('/users');
        setUsuarios(res.data);
    };

    const handleCriar = async (e) => {
        e.preventDefault();
        try {
            await api.post('/users', novoUser);
            setMensagem('Utilizador registado!');
            setNovaUser({ name: '', email: '', password: '', role: 'tecnico_empresa' });
            carregarUsuarios();
        } catch (err) { setMensagem('Erro ao criar utilizador.'); }
    };

    const handleAlterarRole = async (userId, novaRole) => {
        try {
            await api.put(`/users/${userId}`, { role: novaRole });
            setMensagem('Cargo atualizado com sucesso!');
            carregarUsuarios();
        } catch (err) { setMensagem('Erro ao atualizar cargo.'); }
    };

    const handleRemover = async (id) => {
        if (!window.confirm('Remover este utilizador?')) return;
        await api.delete(`/users/${id}`);
        carregarUsuarios();
    };

    return (
        <div className="space-y-10 animate-fade-in">
            <div className="bg-white rounded-3xl p-10 shadow-xl border border-slate-100">
                <h2 className="text-3xl font-black text-slate-800 mb-2 uppercase tracking-tighter">👥 Gestão de Equipa</h2>
                <p className="text-slate-400 font-medium mb-8 uppercase text-[10px] tracking-widest">Controlo de acessos da sua empresa</p>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Lista de Utilizadores */}
                    <div className="lg:col-span-8 space-y-4">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b pb-4 mb-6">Membros da Organização</h3>
                        <div className="space-y-3">
                            {usuarios.map(u => (
                                <div key={u.id} className="bg-slate-50 p-5 rounded-3xl border border-slate-100 flex justify-between items-center group hover:bg-white hover:border-blue-200 transition-all shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black shadow-lg">
                                            {u.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-slate-800 leading-none uppercase text-sm tracking-tighter">{u.name}</h4>
                                            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase italic">{u.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="flex flex-col items-end">
                                            <p className="text-[8px] font-black text-slate-300 uppercase mb-1 tracking-widest">Privilégios</p>
                                            <select 
                                                value={u.role}
                                                onChange={(e) => handleAlterarRole(u.id, e.target.value)}
                                                className="text-[10px] font-black bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl outline-none focus:border-blue-500 transition-all uppercase"
                                            >
                                                <option value="admin_empresa">ADMIN</option>
                                                <option value="tecnico_empresa">TÉCNICO</option>
                                                <option value="leitor_empresa">LEITOR</option>
                                            </select>
                                        </div>
                                        <button 
                                            onClick={() => handleRemover(u.id)}
                                            className="opacity-0 group-hover:opacity-100 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white p-3 rounded-2xl transition-all shadow-sm active:scale-90"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Formulário */}
                    <div className="lg:col-span-4 bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200 shadow-inner h-fit sticky top-10">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-lg shadow-lg">
                                ➕
                            </div>
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tighter text-slate-800">Novo Membro</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic leading-none">Adicionar à equipa</p>
                            </div>
                        </div>

                        <form onSubmit={handleCriar} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome Completo</label>
                                <input 
                                    type="text" 
                                    required 
                                    value={novoUser.name} 
                                    onChange={e => setNovaUser({...novoUser, name: e.target.value})} 
                                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-sm shadow-sm" 
                                    placeholder="ex: João Silva" 
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">E-mail Corporativo</label>
                                <input 
                                    type="email" 
                                    required 
                                    value={novoUser.email} 
                                    onChange={e => setNovaUser({...novoUser, email: e.target.value})} 
                                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-sm shadow-sm" 
                                    placeholder="joao@empresa.com" 
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Palavra-passe</label>
                                <input 
                                    type="password" 
                                    required 
                                    value={novoUser.password} 
                                    onChange={e => setNovaUser({...novoUser, password: e.target.value})} 
                                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-sm shadow-sm" 
                                    placeholder="••••••••" 
                                />
                            </div>

                            <div className="space-y-1.5 pb-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nível de Acesso</label>
                                <select 
                                    value={novoUser.role} 
                                    onChange={e => setNovaUser({...novoUser, role: e.target.value})} 
                                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-sm shadow-sm appearance-none cursor-pointer"
                                >
                                    <option value="tecnico_empresa">🛠️ Técnico Operacional</option>
                                    <option value="leitor_empresa">👁️ Apenas Leitura</option>
                                    <option value="admin_empresa">🔑 Co-Administrador</option>
                                </select>
                            </div>

                            <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-blue-500/10 active:scale-[0.98] flex items-center justify-center gap-2">
                                <span>Criar Acesso</span>
                                <span className="text-xl leading-none">⚡</span>
                            </button>
                            
                            {mensagem && (
                                <div className={`p-3 rounded-xl text-center text-[10px] font-black uppercase animate-bounce mt-4 ${mensagem.includes('Erro') ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                    {mensagem}
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
