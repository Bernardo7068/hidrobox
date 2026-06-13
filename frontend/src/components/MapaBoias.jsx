import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix para os ícones do Leaflet
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Ícone de Torre de Gateway
const towerIcon = L.divIcon({
    html: '<div style="font-size: 24px;">📡</div>',
    className: 'custom-div-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

export default function MapaBoias({ boias = [], gateways = [] }) {
    // Centro inicial do mapa (Rio Lis, Leiria como padrão)
    const centroPadrao = [39.7436, -8.8071];
    
    // Tenta centrar na primeira boia que tenha coordenadas válidas
    const boiaComGPS = boias.find(b => b.latitude && b.longitude);
    const center = boiaComGPS ? [parseFloat(boiaComGPS.latitude), parseFloat(boiaComGPS.longitude)] : centroPadrao;

    const getSensorInfo = (tipoId) => {
        const info = {
            1: { nome: 'Oxigénio', icon: '🫧', unidade: 'mg/L' },
            2: { nome: 'Temperatura', icon: '🌡️', unidade: 'ºC' },
            3: { nome: 'Turbidez', icon: '🌫️', unidade: 'NTU' },
            4: { nome: 'TDS', icon: '🧂', unidade: 'ppm' },
            5: { nome: 'pH', icon: '⚗️', unidade: 'pH' },
            6: { nome: 'Condutividade', icon: '⚡', unidade: 'µS/cm' },
        };
        return info[tipoId] || { nome: 'Sensor', icon: '📊', unidade: '' };
    };

    return (
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden h-[600px] relative group">
            <div className="absolute top-6 left-6 z-[1000] bg-white/95 backdrop-blur shadow-2xl border border-slate-100 rounded-2xl p-4 pointer-events-none">
                <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <span className="animate-pulse text-blue-500">🔵</span> Monitorização de Georefereciação
                </h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Infraestrutura Ativa • Rio Lis</p>
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

                {/* --- DESENHAR GATEWAYS --- */}
                {gateways.map(gw => (
                    gw.latitude && gw.longitude && (
                        <div key={`gw-${gw.id}`}>
                            <Marker position={[parseFloat(gw.latitude), parseFloat(gw.longitude)]} icon={towerIcon}>
                                <Popup minWidth={200}>
                                    <div className="p-3 font-black">
                                        <div className="text-blue-600 uppercase text-[10px] tracking-widest mb-1">Gateway LoRaWAN</div>
                                        <div className="text-lg uppercase leading-tight">{gw.nome}</div>
                                        <div className="text-[10px] text-slate-400 font-mono mt-1">{gw.mac_gateway}</div>
                                        <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                                            <span className="text-[10px] text-slate-500 uppercase">Alcance Nominal</span>
                                            <span className="text-xs text-emerald-600">{gw.raio_cobertura}m</span>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                            <Circle 
                                center={[parseFloat(gw.latitude), parseFloat(gw.longitude)]} 
                                radius={gw.raio_cobertura} 
                                pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.05, weight: 1 }}
                            />
                        </div>
                    )
                ))}

                {/* --- DESENHAR BOIAS --- */}
                {boias.map(boia => {
                    if (!boia.latitude || !boia.longitude) return null;

                    return (
                        <Marker 
                            key={`boia-${boia.id}`} 
                            position={[parseFloat(boia.latitude), parseFloat(boia.longitude)]}
                        >
                            <Popup minWidth={300} className="custom-popup">
                                <div className="p-4 space-y-6">
                                    <div className="border-b border-slate-100 pb-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full uppercase tracking-widest">Estação #{boia.id}</span>
                                            <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600">
                                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> ONLINE
                                            </span>
                                        </div>
                                        <div className="text-2xl font-black text-slate-800 tracking-tighter leading-none">{boia.nome}</div>
                                        <div className="text-xs text-slate-400 font-bold mt-2 flex items-center gap-1">
                                            📍 {boia.localizacao_texto || 'Margem do Rio Lis'}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {boia.leituras?.slice(-4).map(leitura => {
                                            const info = getSensorInfo(leitura.tipo_sensor_id);
                                            return (
                                                <div key={leitura.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1 flex items-center gap-1">
                                                        {info.icon} {info.nome}
                                                    </div>
                                                    <div className="text-lg font-black text-slate-800 flex items-baseline gap-1">
                                                        {leitura.valor} <span className="text-[10px] text-slate-400">{info.unidade}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        <div className="flex justify-between items-center text-xs font-bold px-1">
                                            <span className="text-slate-400 uppercase tracking-widest">Nível de Bateria</span>
                                            <span className="text-slate-800">{boia.bateria}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                            <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${boia.bateria}%` }}></div>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <a 
                                            href={`https://www.google.com/maps?q=${boia.latitude},${boia.longitude}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="block text-center bg-blue-600 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                                        >
                                            Navegar para Local 🚀
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
                    filter: saturate(1.2) contrast(1.05);
                }
                .leaflet-popup-content-wrapper {
                    border-radius: 2rem !important;
                    padding: 0 !important;
                    overflow: hidden;
                    box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.15) !important;
                }
                .leaflet-popup-content {
                    margin: 0 !important;
                    width: auto !important;
                }
                .leaflet-popup-tip-container {
                    display: none;
                }
                .custom-popup .leaflet-popup-close-button {
                    padding: 12px !important;
                    color: #94a3b8 !important;
                }
            `}</style>
        </div>
    );
}