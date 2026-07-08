import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from 'react-leaflet';
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

// Ícone de Torre de Gateway Premium
const towerIcon = L.divIcon({
    html: `
        <div class="relative flex flex-col items-center cursor-pointer group">
            <div class="absolute w-16 h-16 bg-blue-500 rounded-full animate-ping opacity-20 -top-2"></div>
            <div class="w-12 h-12 bg-slate-900 border-4 border-blue-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/40 z-10 group-hover:bg-blue-900 transition-colors">
                <span class="text-2xl text-white">📡</span>
            </div>
            <div class="w-1.5 h-8 bg-slate-900 z-0"></div>
            <div class="w-5 h-2 bg-slate-900 rounded-full z-0"></div>
        </div>
    `,
    className: 'bg-transparent border-none',
    iconSize: [48, 68],
    iconAnchor: [24, 68]
});

// Função para calcular distância entre duas coordenadas
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};

export default function MapaBoias({ boias = [], gateways = [] }) {
    // Centro inicial do mapa (Rio Lis, Leiria como padrão)
    const centroPadrao = [39.7436, -8.8071];
    
    // Tenta centrar na primeira boia que tenha coordenadas válidas
    const boiaComGPS = boias.find(b => b.latitude && b.longitude);
    const center = boiaComGPS ? [parseFloat(boiaComGPS.latitude), parseFloat(boiaComGPS.longitude)] : centroPadrao;

    return (
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden h-[600px] lg:h-[75vh] relative group">
            <div className="absolute top-6 left-6 z-[1000] bg-white/95 backdrop-blur shadow-2xl border border-slate-100 rounded-2xl p-4 pointer-events-none">
                <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <span className="animate-pulse text-blue-500">🔵</span> Monitorização Georreferenciada
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
                {gateways.map(gw => {
                    const connectedBoias = boias.filter(b => b.mac_gateway === gw.mac_gateway).length;
                    return gw.latitude && gw.longitude && (
                        <div key={`gw-${gw.id}`}>
                            <Marker position={[parseFloat(gw.latitude), parseFloat(gw.longitude)]} icon={towerIcon}>
                                <Popup minWidth={220} className="custom-popup">
                                    <div className="p-3 font-black">
                                        <div className="text-blue-600 uppercase text-[10px] tracking-widest mb-1">Gateway LoRaWAN</div>
                                        <div className="text-lg uppercase leading-tight">{gw.nome}</div>
                                        <div className="text-[10px] text-slate-400 font-mono mt-1">{gw.mac_gateway}</div>
                                        
                                        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 mb-2">
                                            <div className="bg-emerald-50 rounded-lg p-2 text-center">
                                                <div className="text-[9px] text-emerald-600 uppercase tracking-widest">Alcance</div>
                                                <div className="text-sm font-black text-emerald-900">{gw.raio_cobertura}m</div>
                                            </div>
                                            <div className="bg-blue-50 rounded-lg p-2 text-center">
                                                <div className="text-[9px] text-blue-600 uppercase tracking-widest">Conexões</div>
                                                <div className="text-sm font-black text-blue-900">{connectedBoias} Boias</div>
                                            </div>
                                        </div>
                                        <div className="text-xs text-slate-500 font-mono text-center bg-slate-50 py-1.5 rounded-md mt-2">
                                            GPS: {Number(gw.latitude).toFixed(5)}, {Number(gw.longitude).toFixed(5)}
                                        </div>
                                        <a 
                                            href={`https://www.google.com/maps?q=${gw.latitude},${gw.longitude}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="block mt-4 text-center bg-indigo-600 text-white py-2.5 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-md"
                                        >
                                            Navegar GPS 🗺️
                                        </a>
                                    </div>
                                </Popup>
                            </Marker>
                            <Circle 
                                center={[parseFloat(gw.latitude), parseFloat(gw.longitude)]} 
                                radius={gw.raio_cobertura} 
                                pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.05, weight: 1 }}
                            />
                        </div>
                    );
                })}

                {/* --- DESENHAR BOIAS E LINHAS --- */}
                {boias.map(boia => {
                    if (!boia.latitude || !boia.longitude) return null;

                    const meuGateway = gateways.find(gw => gw.mac_gateway === boia.mac_gateway);
                    let dist = null;
                    let foraDeAlcance = false;
                    
                    if (meuGateway && meuGateway.latitude && meuGateway.longitude) {
                        dist = calculateDistance(boia.latitude, boia.longitude, meuGateway.latitude, meuGateway.longitude);
                        foraDeAlcance = dist > meuGateway.raio_cobertura;
                    }

                    return (
                        <div key={`boia-container-${boia.id}`}>
                            <Marker position={[parseFloat(boia.latitude), parseFloat(boia.longitude)]}>
                                <Popup minWidth={240} className="custom-popup">
                                    <div className="p-3">
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="text-sm font-black text-slate-800 uppercase tracking-tighter leading-none">{boia.nome}</div>
                                            <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${boia.estado === 'ativa' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                                            📍 {boia.localizacao_texto || 'Localização não definida'}
                                        </div>
                                        
                                        <div className="flex gap-2 mb-2">
                                            <div className="flex-1 bg-slate-50 border border-slate-100 rounded-lg p-2 text-center">
                                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Bateria</div>
                                                <div className={`text-sm font-black ${boia.bateria < 20 ? 'text-rose-600' : 'text-slate-800'}`}>{boia.bateria}%</div>
                                            </div>
                                            <div className="flex-1 bg-slate-50 border border-slate-100 rounded-lg p-2 text-center">
                                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sinal</div>
                                                <div className={`text-sm font-black ${foraDeAlcance ? 'text-rose-600' : 'text-slate-800'}`}>{boia.rssi_ultimo ? `${boia.rssi_ultimo} dBm` : '---'}</div>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 mb-3">
                                            <div className="flex justify-between items-center text-xs mb-1.5">
                                                <span className="font-bold text-slate-500 uppercase tracking-widest">MAC:</span>
                                                <span className="font-mono text-slate-700 font-black">{boia.mac_boia}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="font-bold text-slate-500 uppercase tracking-widest">GPS:</span>
                                                <span className="font-mono text-slate-700 font-black">{Number(boia.latitude).toFixed(5)}, {Number(boia.longitude).toFixed(5)}</span>
                                            </div>
                                        </div>

                                        {meuGateway && (
                                            <div className={`mb-3 p-2 rounded-lg text-center border text-[10px] uppercase font-black tracking-widest ${foraDeAlcance ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                                                {foraDeAlcance ? '⚠️ Fora de Alcance' : '✓ Conexão Estável'} ({Math.round(dist)}m)
                                            </div>
                                        )}

                                        <a 
                                            href={`https://www.google.com/maps?q=${boia.latitude},${boia.longitude}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="block text-center bg-indigo-600 text-white py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-md"
                                        >
                                            Navegar GPS 🗺️
                                        </a>
                                    </div>
                                </Popup>
                            </Marker>
                            
                            {/* LINHA DE CONEXÃO COM O GATEWAY */}
                            {meuGateway && meuGateway.latitude && (
                                <Polyline 
                                    positions={[
                                        [boia.latitude, boia.longitude],
                                        [meuGateway.latitude, meuGateway.longitude]
                                    ]}
                                    pathOptions={{ 
                                        color: foraDeAlcance ? '#f43f5e' : '#3b82f6', 
                                        weight: 2, 
                                        dashArray: '10, 10',
                                        opacity: 0.6 
                                    }}
                                />
                            )}
                        </div>
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