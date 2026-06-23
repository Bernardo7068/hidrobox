import { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell 
} from 'recharts';
import api from '../api';
import HelpPin from '../components/HelpPin';

export default function Estatisticas({ isHelpMode }) {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const isAdmin = ['super_admin', 'admin_empresa'].includes(user.role);

  const [boias, setBoias] = useState([]);
  const [filtro, setFiltro] = useState({ boia_id: '', data_inicio: '', data_fim: '' });
  const [dados, setDados] = useState({ geral: [], temporal: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarBoias = async () => {
      try {
        const res = await api.get('/boias');
        setBoias(res.data);
      } catch (e) { console.error(e); }
    };
    carregarBoias();
    buscarDados();
  }, []);

  const buscarDados = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(filtro);
      const res = await api.get(`/estatisticas?${params.toString()}`);
      setDados(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const exportarPDF = async () => {
    if (!isAdmin) return;
    try {
      const params = new URLSearchParams(filtro);
      const res = await api.get(`/exportar-pdf?${params.toString()}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'relatorio_hidrobox.pdf');
      document.body.appendChild(link);
      link.click();
    } catch (e) { console.error(e); }
  };

  const formatarData = (dataStr) => {
    const d = new Date(dataStr);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  // Cores dinâmicas e premium para os gráficos
  const chartColors = [
    { stroke: '#3b82f6', fill: '#93c5fd' }, // Azul
    { stroke: '#10b981', fill: '#6ee7b7' }, // Verde
    { stroke: '#f59e0b', fill: '#fcd34d' }, // Laranja
    { stroke: '#8b5cf6', fill: '#c4b5fd' }, // Roxo
    { stroke: '#ec4899', fill: '#f9a8d4' }, // Rosa
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20 animate-fade-in relative px-4 md:px-0">
      {isHelpMode && <HelpPin text="📈 Estatísticas: Aqui analisas as tendências históricas. Podes exportar estes dados oficiais para um relatório em formato PDF!" className="absolute top-4 right-4" position="left" />}
      
      {/* HEADER DE TOPO - Estilo Premium Escuro */}
      <header className="flex flex-col md:flex-row justify-between items-end gap-6 bg-gradient-to-r from-slate-900 to-slate-800 p-10 rounded-[3rem] shadow-2xl text-white relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-500/20 blur-3xl rounded-full pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-2">
            <span className="p-3 bg-blue-500/20 text-blue-400 rounded-2xl text-2xl backdrop-blur-sm border border-blue-500/20">📊</span>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight uppercase">Dados & Estatísticas</h2>
          </div>
          <p className="text-slate-400 font-bold uppercase text-xs tracking-[0.3em] ml-16">Monitorização de Inteligência HidroBox</p>
        </div>
        <div className="flex gap-4 relative z-10">
          <button 
            disabled={!isAdmin || loading}
            onClick={exportarPDF}
            className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl flex items-center gap-3 ${
              isAdmin && !loading ? 'bg-blue-600 hover:bg-blue-500 hover:scale-105 hover:shadow-blue-500/50' : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            {loading ? 'A carregar...' : isAdmin ? '📄 Gerar Relatório PDF' : '🔒 PDF (Acesso Restrito)'}
          </button>
        </div>
      </header>

      {/* FILTROS AVANÇADOS - Estilo Glassmorphism */}
      <div className="bg-white/80 backdrop-blur-md p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2">Alvo de Estudo</label>
          <select 
            className="w-full p-4 bg-slate-50 hover:bg-white focus:bg-white border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-500 transition-colors shadow-inner"
            value={filtro.boia_id}
            onChange={e => setFiltro({...filtro, boia_id: e.target.value})}
          >
            <option value="">Análise Global (Toda a Rede)</option>
            {boias.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
          </select>
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2">Data Inicial</label>
          <input 
            type="date" 
            className="w-full p-4 bg-slate-50 hover:bg-white focus:bg-white border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-500 transition-colors shadow-inner text-slate-600"
            value={filtro.data_inicio}
            onChange={e => setFiltro({...filtro, data_inicio: e.target.value})}
          />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2">Data Final</label>
          <input 
            type="date" 
            className="w-full p-4 bg-slate-50 hover:bg-white focus:bg-white border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-500 transition-colors shadow-inner text-slate-600"
            value={filtro.data_fim}
            onChange={e => setFiltro({...filtro, data_fim: e.target.value})}
          />
        </div>
        <div className="flex items-end">
          <button 
            onClick={buscarDados}
            disabled={loading}
            className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg hover:shadow-blue-500/30 active:scale-95 disabled:opacity-50"
          >
            {loading ? 'A processar...' : 'Processar Dados ⚡'}
          </button>
        </div>
      </div>

      {/* ESTADO DE CARREGAMENTO */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-6">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-sm animate-pulse">A calcular estatísticas globais...</p>
        </div>
      ) : dados.geral.length === 0 ? (
        /* ESTADO VAZIO BEM DESENHADO */
        <div className="bg-white border border-slate-100 p-20 rounded-[3rem] shadow-xl text-center space-y-6 flex flex-col items-center">
            <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center text-6xl shadow-inner mb-4">
                🏜️
            </div>
            <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Sem Dados Registados</h3>
            <p className="text-slate-400 font-medium max-w-md">Não foram encontradas leituras de sensores para o período ou boia selecionada. Tenta alargar o intervalo de datas ou verifica se a estação esteve ativa.</p>
        </div>
      ) : (
        /* CONTEÚDO PRINCIPAL (GRÁFICOS E TABELAS) */
        <div className="space-y-12">
            
            {/* LINHA DE KPIs (Novidade Visual) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center justify-between group hover:border-blue-300 transition-colors cursor-default">
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sensores Ativos</span>
                        <div className="text-4xl font-black text-slate-800 mt-2">{dados.geral.length}</div>
                    </div>
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">🧬</div>
                </div>
                <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center justify-between group hover:border-emerald-300 transition-colors cursor-default">
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sinal Médio da Rede</span>
                        <div className="text-4xl font-black text-emerald-500 mt-2">
                            {dados.telemetria?.length > 0 ? Math.round(dados.telemetria.reduce((acc, curr) => acc + parseFloat(curr.rssi_medio), 0) / dados.telemetria.length) : 0} <span className="text-lg text-emerald-300">dBm</span>
                        </div>
                    </div>
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">📡</div>
                </div>
                <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center justify-between group hover:border-amber-300 transition-colors cursor-default">
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Histórico de Eventos</span>
                        <div className="text-4xl font-black text-amber-500 mt-2">{dados.temporal.length} <span className="text-lg text-amber-300">dias úteis</span></div>
                    </div>
                    <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">📅</div>
                </div>
            </div>

            {/* GRÁFICOS DINÂMICOS (Agora com AreaChart e Gradients) */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                {dados.geral.map((sensorInfo, idx) => {
                const sensorName = sensorInfo.tipo_sensor.nome;
                const unit = sensorInfo.tipo_sensor.unidade;
                const color = chartColors[idx % chartColors.length];
                
                return (
                    <div key={sensorName} className="bg-white p-10 rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100 space-y-8 min-h-[500px] hover:shadow-2xl transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 rounded-bl-full opacity-10 transition-opacity group-hover:opacity-20" style={{backgroundColor: color.stroke}}></div>
                    
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">
                            {sensorName}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            Análise de Tendência Histórica
                        </p>
                        </div>
                        <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 flex flex-col items-end">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Média do Período</span>
                            <span className="text-lg font-black" style={{color: color.stroke}}>{Number(sensorInfo.media).toFixed(2)} {unit}</span>
                        </div>
                    </div>
                    
                    <div className="w-full relative z-10 mt-4">
                        <ResponsiveContainer width="100%" height={320}>
                        <AreaChart data={dados.temporal} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
                            <defs>
                            <linearGradient id={`color${idx}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color.stroke} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={color.stroke} stopOpacity={0}/>
                            </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                            <XAxis dataKey="data" tickFormatter={formatarData} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 'bold'}} axisLine={false} tickLine={false} dy={10} />
                            <YAxis tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 'bold'}} axisLine={false} tickLine={false} unit={unit} />
                            <Tooltip 
                            contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', padding: '16px', fontWeight: 'bold'}}
                            formatter={(value) => [`${value} ${unit}`, 'Leitura Média']}
                            labelStyle={{color: '#64748b', fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px'}}
                            />
                            <Area 
                            type="monotone" 
                            dataKey={sensorName} 
                            name={sensorName} 
                            stroke={color.stroke} 
                            strokeWidth={4}
                            fillOpacity={1} 
                            fill={`url(#color${idx})`}
                            activeDot={{r: 8, strokeWidth: 0, fill: color.stroke}} 
                            connectNulls
                            />
                        </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    </div>
                );
                })}

                {/* QUALIDADE DE SINAL (Redesenhado) */}
                <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl space-y-8 min-h-[500px] xl:col-span-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                    <div className="relative z-10">
                        <h3 className="text-2xl font-black uppercase tracking-tighter text-blue-400">Auditoria de Telemetria (RSSI Médio)</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Força do sinal de rádio captado pelos gateways</p>
                    </div>
                    
                    <div className="w-full relative z-10 pt-6">
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={dados.telemetria} margin={{ top: 20, right: 30, left: -20, bottom: 0 }} barSize={60}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                <XAxis dataKey="boia" tick={{fontSize: 11, fill: '#94a3b8', fontWeight: 'bold'}} axisLine={false} tickLine={false} dy={15} />
                                <YAxis tick={{fontSize: 11, fill: '#94a3b8', fontWeight: 'bold'}} domain={[-140, 0]} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    cursor={{fill: '#1e293b'}}
                                    contentStyle={{backgroundColor: '#0f172a', borderRadius: '15px', border: '1px solid #334155', color: '#fff'}}
                                    itemStyle={{color: '#38bdf8', fontWeight: 'bold'}}
                                />
                                <Bar dataKey="rssi_medio" name="Sinal (dBm)" radius={[12, 12, 12, 12]}>
                                    {dados.telemetria?.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.rssi_medio > -90 ? '#10b981' : entry.rssi_medio > -115 ? '#f59e0b' : '#ef4444'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* TABELA DE SUMÁRIO AVANÇADA */}
                <div className="xl:col-span-2 bg-white rounded-[3rem] p-10 shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tight text-slate-800">Tabela de Agregação Global</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Resumo matemático absoluto para a seleção atual</p>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto rounded-2xl border border-slate-100">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="py-5 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 rounded-tl-2xl">Parâmetro de Estudo</th>
                                    <th className="py-5 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-center">Amplitude (Min / Máx)</th>
                                    <th className="py-5 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-center rounded-tr-2xl">Valor Médio</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {dados.geral.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-blue-50/50 transition-colors group">
                                        <td className="py-6 px-6 flex items-center gap-5">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm`} style={{backgroundColor: chartColors[idx % chartColors.length].fill + '40', color: chartColors[idx % chartColors.length].stroke}}>
                                                {item.tipo_sensor.nome.includes('Oxig') ? '🫧' : item.tipo_sensor.nome.includes('pH') ? '⚗️' : '🌡️'}
                                            </div>
                                            <div>
                                                <div className="font-black text-slate-800 text-lg group-hover:text-blue-600 transition-colors">{item.tipo_sensor.nome}</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.tipo_sensor.unidade}</div>
                                            </div>
                                        </td>
                                        <td className="py-6 px-6">
                                            <div className="flex items-center justify-center gap-3">
                                                <span className="text-sm font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-lg">{Number(item.minimo).toFixed(2)}</span>
                                                <div className="w-16 h-1.5 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded-full relative overflow-hidden">
                                                    <div className="absolute top-0 left-0 h-full bg-slate-300 w-full opacity-50"></div>
                                                </div>
                                                <span className="text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">{Number(item.maximo).toFixed(2)}</span>
                                            </div>
                                        </td>
                                        <td className="py-6 px-6 text-center">
                                            <span className="text-2xl font-black" style={{color: chartColors[idx % chartColors.length].stroke}}>{Number(item.media).toFixed(2)}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
      )}

      <style>{`
          @keyframes fadeIn {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in {
              animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
      `}</style>
    </div>
  );
}
