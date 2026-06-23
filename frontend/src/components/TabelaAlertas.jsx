import api from '../api';

export default function TabelaAlertas({ alertas, onAtualizar }) {
    const user = JSON.parse(sessionStorage.getItem('user') || '{"role": "leitor_empresa"}');
    const isLeitor = user.role === 'leitor_empresa';
    
    const alertasPendentes = alertas?.filter(alerta => alerta.resolvido === 0 || alerta.resolvido === false) || [];

    const handleResolver = async (id) => {
        if (isLeitor) return;
        try {
            await api.put(`/alertas/${id}/resolver`);
            if (onAtualizar) onAtualizar();
        } catch (error) {
            console.error("Erro ao tentar resolver o alerta:", error);
        }
    };

    return (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-xl shadow-slate-200/50 h-full flex flex-col">
            <div className="flex justify-between items-center mb-8">
                <h3 className="font-black text-xl text-slate-800 tracking-tight">
                    Notificações Críticas
                </h3>
                <span className="bg-rose-100 text-rose-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {alertasPendentes.length} Pendentes
                </span>
            </div>
            
            <div className="flex-1 overflow-y-auto max-h-[600px] pr-4 space-y-4 custom-scrollbar">
                {alertasPendentes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                        <div className="text-5xl mb-4 opacity-20">🛡️</div>
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest leading-relaxed">
                            Ambiente Protegido<br/>
                            <span className="text-[10px] opacity-60 font-medium">Nenhum incidente registado</span>
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {alertasPendentes.map(alerta => (
                            <div key={alerta.id} className="group p-6 bg-slate-50 rounded-[1.5rem] border border-transparent hover:border-rose-100 hover:bg-white transition-all duration-300">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex flex-col">
                                        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-[0.2em] w-fit mb-2 ${
                                            alerta.gravidade === 'critico' ? 'bg-rose-600 text-white' : 'bg-orange-400 text-white'
                                        }`}>
                                            {alerta.gravidade}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            Evento #{alerta.id}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-300 font-bold">
                                        {new Date(alerta.created_at).toLocaleTimeString('pt-PT')}
                                    </span>
                                </div>
                                
                                <p className="text-sm font-bold text-slate-700 mb-6 leading-relaxed">
                                    {alerta.descricao}
                                </p>
                                
                                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                                    <span className="text-[11px] text-slate-400 font-bold uppercase tracking-tighter">
                                        {new Date(alerta.created_at).toLocaleDateString('pt-PT')}
                                    </span>
                                    {!isLeitor && (
                                        <button 
                                            onClick={() => handleResolver(alerta.id)}
                                            className="bg-white text-emerald-600 border-2 border-emerald-100 text-[10px] px-6 py-2 rounded-xl hover:bg-emerald-600 hover:text-white hover:border-emerald-600 font-black uppercase tracking-widest transition-all shadow-sm"
                                        >
                                            Arquivar
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
            `}</style>
        </div>
    );
}