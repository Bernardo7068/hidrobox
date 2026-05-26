import api from '../api';

// Agora o componente recebe os "alertas" em tempo real vindos do VisaoGeral
export default function TabelaAlertas({ alertas, onAtualizar }) {
    // [NOVO] Simulação de obtenção do utilizador do localStorage (ou contexto)
    const user = JSON.parse(localStorage.getItem('user') || '{"role": "leitor_empresa"}');
    const isLeitor = user.role === 'leitor_empresa';
    
    // Filtramos para mostrar APENAS os alertas que ainda não foram resolvidos (resolvido === 0)
    const alertasPendentes = alertas?.filter(alerta => alerta.resolvido === 0 || alerta.resolvido === false) || [];

    // Função que dispara quando clicas no botão "Resolver"
    const handleResolver = async (id) => {
        if (isLeitor) return;
        try {
            // Avisa o Laravel que o problema foi tratado
            await api.put(`/alertas/${id}/resolver`);
            
            // Pede ao ecrã principal para recarregar os dados imediatamente
            if (onAtualizar) {
                onAtualizar();
            }
        } catch (error) {
            console.error("Erro ao tentar resolver o alerta:", error);
            alert("Não foi possível resolver o alerta.");
        }
    };

    return (
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm h-full flex flex-col">
            {/* Se o título atualizar para este, significa que o código novo entrou com sucesso! */}
            <h3 className="font-bold text-lg text-slate-800 mb-4 border-b pb-2">
                🚨 Alertas Ativos
            </h3>
            
            <div className="flex-1 overflow-y-auto max-h-[600px] pr-2">
                {alertasPendentes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-center">
                        <span className="text-3xl mb-2">✅</span>
                        <p className="text-slate-500 text-sm font-medium">Tudo tranquilo!<br/>Nenhum alerta pendente.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {alertasPendentes.map(alerta => (
                            <div key={alerta.id} className="p-4 bg-red-50 border border-red-200 rounded-lg shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold bg-red-600 text-white px-2 py-1 rounded">
                                        PRIORIDADE {alerta.gravidade.toUpperCase()}
                                    </span>
                                    <span className="text-xs font-mono text-red-400 font-semibold">
                                        ID: {alerta.id}
                                    </span>
                                </div>
                                
                                <p className="text-sm font-medium text-red-900 mb-4 leading-relaxed">
                                    {alerta.descricao}
                                </p>
                                
                                <div className="flex justify-between items-center border-t border-red-200 pt-3">
                                    <span className="text-[11px] text-red-500 font-semibold">
                                        🕒 {new Date(alerta.created_at).toLocaleString('pt-PT')}
                                    </span>
                                    {!isLeitor && (
                                        <button 
                                            onClick={() => handleResolver(alerta.id)}
                                            className="bg-green-600 text-white text-xs px-4 py-2 rounded-md hover:bg-green-700 font-bold shadow-sm transition-colors"
                                        >
                                            ✅ Resolver
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}