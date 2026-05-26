import { useState } from 'react';
import api from '../api';

export default function Login({ onLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [erro, setErro] = useState('');
    const [carregando, setCarregando] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErro('');
        setCarregando(true);

        try {
            const res = await api.post('/login', { email, password });
            
            if (res.data.sucesso) {
                localStorage.setItem('token', res.data.token);
                localStorage.setItem('user', JSON.stringify(res.data.user));
                onLogin(res.data.user);
            }
        } catch (error) {
            setErro(error.response?.data?.message || 'Erro ao efetuar login. Verifique as suas credenciais.');
        } finally {
            setCarregando(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden">
                <div className="bg-blue-600 p-10 text-center">
                    <div className="text-5xl mb-4">📦</div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter">HidroBox</h1>
                    <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mt-2">Sistema de Telemetria Rio Lis</p>
                </div>

                <form onSubmit={handleSubmit} className="p-10 space-y-6">
                    {erro && (
                        <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-xl text-xs font-bold text-center animate-pulse">
                            ⚠️ {erro}
                        </div>
                    )}

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Endereço de E-mail</label>
                        <input 
                            type="email" 
                            required 
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 transition-all font-bold"
                            placeholder="admin@empresa.pt"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Palavra-passe</label>
                        <input 
                            type="password" 
                            required 
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 transition-all font-bold"
                            placeholder="••••••••"
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={carregando}
                        className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-blue-200 active:scale-95 disabled:opacity-50"
                    >
                        {carregando ? 'A entrar...' : 'Entrar no Painel 🚀'}
                    </button>

                    <div className="pt-6 border-t border-slate-100 mt-6">
                        <p className="text-[9px] text-slate-400 font-bold text-center uppercase leading-relaxed">
                            Contas de Teste:<br/>
                            super@hidrobox.pt | admin@empresa.pt | tecnico@empresa.pt | leitor@empresa.pt<br/>
                            Passe: role+123 (ex: super123)
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}
