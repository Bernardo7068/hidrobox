import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Correção para o ícone do Leaflet que costuma quebrar no React/Vite
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function MapaBoias({ boias = [] }) {
    // Centro inicial do mapa (Rio Lis, Leiria como padrão)
    const centroPadrao = [39.7436, -8.8071];
    
    // Tenta centrar na primeira boia que tenha coordenadas válidas
    const boiaComGPS = boias.find(b => b.latitude && b.longitude);
    const center = boiaComGPS ? [parseFloat(boiaComGPS.latitude), parseFloat(boiaComGPS.longitude)] : centroPadrao;

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

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden h-[500px] relative group">
            <div className="absolute top-4 left-4 z-[1000] bg-white/90 backdrop-blur shadow-lg border border-slate-100 rounded-xl p-3 pointer-events-none">
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                    <span className="text-blue-600">🛰️</span> Georeferenciação de Ativos
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Tempo Real • Rede HidroBox</p>
            </div>

            <MapContainer 
                center={center} 
                zoom={14} 
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {boias.map(boia => {
                    if (!boia.latitude || !boia.longitude) return null;

                    return (
                        <Marker 
                            key={boia.id} 
                            position={[parseFloat(boia.latitude), parseFloat(boia.longitude)]}
                        >
                            <Popup minWidth={250} className="custom-popup">
                                <div className="p-2 space-y-4">
                                    <div className="border-b pb-2">
                                        <div className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">ID Estação: #{boia.id}</div>
                                        <div className="text-lg font-black text-slate-800 uppercase leading-none">{boia.nome}</div>
                                        <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase italic">{boia.localizacao_texto || 'Margem do Rio Lis'}</div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Estado do Sistema</span>
                                            <span className="text-[10px] font-black text-emerald-600 flex items-center gap-1">● ONLINE</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Bateria Local</span>
                                            <span className="text-[10px] font-black text-slate-800">{boia.bateria}%</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 mt-4">
                                        {boia.leituras?.slice(-4).map(leitura => (
                                            <div key={leitura.id} className="bg-white border border-slate-100 p-2 rounded-lg shadow-sm">
                                                <div className="text-[8px] font-bold text-slate-400 uppercase leading-none mb-1">
                                                    {getIcon(leitura.tipo_sensor_id)}
                                                </div>
                                                <div className="text-xs font-black text-slate-800">
                                                    {leitura.valor} <small className="text-[8px] opacity-40">VAL</small>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="pt-2">
                                        <a 
                                            href={`https://www.google.com/maps?q=${boia.latitude},${boia.longitude}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="block text-center bg-slate-900 text-white py-2 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-md"
                                        >
                                            Abrir Navegação GPS 📍
                                        </a>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>

            <style>{`
                .leaflet-container {
                    filter: grayscale(0.2) contrast(1.1);
                }
                .leaflet-popup-content-wrapper {
                    border-radius: 1.5rem !important;
                    padding: 0 !important;
                    overflow: hidden;
                    box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1) !important;
                }
                .leaflet-popup-content {
                    margin: 0 !important;
                    width: auto !important;
                }
                .leaflet-popup-tip-container {
                    display: none;
                }
            `}</style>
        </div>
    );
}