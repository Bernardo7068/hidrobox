import React from 'react';
import MapaBoias from './MapaBoias';
import HelpPin from './HelpPin';

export default function MapaEstacoes({ boias, gateways, isHelpMode }) {
    return (
        <div className="h-full flex flex-col space-y-6 animate-fade-in">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 relative">
                {isHelpMode && <HelpPin text="📍 Aqui podes ver a localização exata de cada boia e ponto de rede. Clica nos marcadores para ver o estado atual de cada estação." className="absolute -top-4 -left-4" position="right" />}
                
                <div className="flex items-center gap-6">
                    <div className="h-16 w-16 bg-blue-100 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-blue-200">
                        🗺️
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none mb-1">Mapa das Estações</h2>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Exploração de rede em tempo real • Rio Lis</p>
                    </div>
                </div>

                <div className="flex gap-4 relative">
                    {isHelpMode && <HelpPin text="Mostra quantas boias estão a enviar dados neste momento." className="absolute -top-4 -right-4" position="left" />}
                    <div className="bg-blue-50 px-6 py-3 rounded-2xl border border-blue-100 text-center shadow-sm">
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Rede Ativa</span>
                        <div className="text-xl font-black text-blue-600 leading-none">
                            {boias.length} <span className="text-sm">Boias</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="flex-1 rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white relative min-h-[500px]">
                <MapaBoias boias={boias} gateways={gateways} />
            </div>
        </div>
    );
}
