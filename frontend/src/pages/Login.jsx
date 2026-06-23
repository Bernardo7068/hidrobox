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
                sessionStorage.setItem('token', res.data.token);
                sessionStorage.setItem('user', JSON.stringify(res.data.user));
                onLogin(res.data.user);
            }
        } catch (error) {
            setErro(error.response?.data?.message || 'Erro ao efetuar login. Verifique as suas credenciais.');
        } finally {
            setCarregando(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* Elementos Decorativos de Fundo */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-indigo-100/50 rounded-full blur-3xl"></div>

            <div className="bg-white rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.1)] w-full max-w-lg overflow-hidden relative z-10 border border-slate-100">
                <div className="bg-gradient-to-br from-blue-700 to-indigo-900 p-12 text-center text-white relative">
                    <div className="absolute top-4 right-6 opacity-20 text-4xl">🌊</div>
                    <div className="bg-white w-20 h-20 rounded-3xl shadow-2xl flex items-center justify-center text-4xl mx-auto mb-6 transform rotate-3 hover:rotate-0 transition-transform duration-500">
                        📦
                    </div>
                    <h1 className="text-4xl font-black tracking-tight mb-2">Hidro<span className="text-blue-300">Box</span></h1>
                    <p className="text-blue-100/70 text-sm font-bold uppercase tracking-[0.2em]">Painel de Gestão Operacional</p>
                </div>

                <form onSubmit={handleSubmit} className="p-12 space-y-8">
                    {erro && (
                        <div className="bg-rose-50 border border-rose-100 text-rose-600 p-5 rounded-2xl text-xs font-black text-center animate-bounce">
                            ⚠️ {erro}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Credencial de Acesso</label>
                        <input 
                            type="email" 
                            required 
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-slate-800 placeholder:text-slate-300 shadow-sm"
                            placeholder="ex: admin@hidrobox.pt"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center ml-1">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Código de Segurança</label>
                            <a href="#" className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline">Esqueceu-se?</a>
                        </div>
                        <input 
                            type="password" 
                            required 
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-slate-800 placeholder:text-slate-300 shadow-sm"
                            placeholder="••••••••"
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={carregando}
                        className="w-full bg-blue-600 text-white py-6 rounded-2xl font-black uppercase tracking-[0.2em] hover:bg-slate-900 transition-all shadow-2xl shadow-blue-200 active:scale-95 disabled:opacity-50 text-xs"
                    >
                        {carregando ? 'A Sincronizar...' : 'Iniciar Sessão HidroBox 🚀'}
                    </button>

                    <div className="pt-8 border-t border-slate-100 mt-8">
                        <p className="text-[10px] text-slate-400 font-bold text-center uppercase leading-loose tracking-tighter">
                            Acesso restrito a técnicos autorizados.<br/>
                            <span className="text-blue-500 font-black">Rio Lis v1.2.0</span>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}
