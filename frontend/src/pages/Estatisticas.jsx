import { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  BarChart, Bar, Cell 
} from 'recharts';
import api from '../api';

export default function Estatisticas({ isHelpMode }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = ['super_admin', 'admin_empresa'].includes(user.role);

  const [boias, setBoias] = useState([]);
  const [filtro, setFiltro] = useState({ boia_id: '', data_inicio: '', data_fim: '' });
  const [dados, setDados] = useState({ geral: [], temporal: [] });
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20 animate-fade-in relative">
      {isHelpMode && (
        <div className="absolute top-0 right-0 bg-amber-400 text-amber-950 text-sm font-black p-5 rounded-2xl shadow-xl w-80 z-50 animate-bounce-in border-4 border-white">
          📈 <strong>Analytics:</strong> Aqui analisas as tendências históricas. Podes exportar estes dados oficiais para um relatório em formato PDF!
        </div>
      )}
      <header className="flex flex-col md:flex-row justify-between items-end gap-6 px-4">
        <div>
          <h2 className="text-5xl font-black text-slate-800 tracking-tight uppercase">Analytics & Relatórios</h2>
          <p className="text-slate-400 font-bold uppercase text-xs tracking-[0.3em] ml-1 mt-2">Inteligência de Dados e Auditoria HidroBox</p>
        </div>
        <div className="flex gap-4">
          <button 
            disabled={!isAdmin}
            onClick={exportarPDF}
            className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl flex items-center gap-3 ${
              isAdmin ? 'bg-slate-900 text-white hover:bg-blue-600' : 'bg-slate-100 text-slate-300 cursor-not-allowed'
            }`}
          >
            {isAdmin ? '📄 Exportar Relatório PDF' : '🔒 PDF (Apenas Admin)'}
          </button>
        </div>
      </header>

      {/* Filtros */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-6 mx-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2">Filtrar por Estação</label>
          <select 
            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-500"
            value={filtro.boia_id}
            onChange={e => setFiltro({...filtro, boia_id: e.target.value})}
          >
            <option value="">Todas as Boias</option>
            {boias.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2">Data Inicial</label>
          <input 
            type="date" 
            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-500"
            value={filtro.data_inicio}
            onChange={e => setFiltro({...filtro, data_inicio: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2">Data Final</label>
          <input 
            type="date" 
            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-500"
            value={filtro.data_fim}
            onChange={e => setFiltro({...filtro, data_fim: e.target.value})}
          />
        </div>
        <div className="flex items-end">
          <button 
            onClick={buscarDados}
            className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-blue-100"
          >
            Aplicar Filtros ⚡
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 px-4">
        {/* Gráficos Individuais por Sensor (Dinâmico) */}
        {dados.geral.map((sensorInfo, idx) => {
          const sensorName = sensorInfo.tipo_sensor.nome;
          const unit = sensorInfo.tipo_sensor.unidade;
          
          return (
            <div key={sensorName} className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 space-y-8 min-h-[500px]">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
                    Tendência: {sensorName}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Valores Médios em {unit}
                  </p>
                </div>
                <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                  <span className="text-xs font-black text-blue-600">Média: {Number(sensorInfo.media).toFixed(2)} {unit}</span>
                </div>
              </div>
              
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <LineChart data={dados.temporal} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="data" tickFormatter={formatarData} tick={{fontSize: 10, fontWeight: 'bold'}} />
                    <YAxis tick={{fontSize: 10, fontWeight: 'bold'}} unit={unit} />
                    <Tooltip 
                      contentStyle={{borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                      formatter={(value) => [`${value} ${unit}`, 'Média']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey={sensorName} 
                      name={sensorName} 
                      stroke={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][idx % 5]} 
                      strokeWidth={4} 
                      dot={{r: 4}} 
                      activeDot={{r: 6}} 
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}

        {/* Qualidade de Sinal por Sensor (Mantido como visão geral de rede) */}
        <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 space-y-8 min-h-[500px] xl:col-span-2">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Desempenho de Rede (RSSI Médio)</h3>
            <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart data={dados.geral} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="tipo_sensor.nome" tick={{fontSize: 10, fontWeight: 'bold'}} />
                        <YAxis tick={{fontSize: 10, fontWeight: 'bold'}} domain={[-140, 0]} />
                        <Tooltip />
                        <Bar dataKey="rssi_medio" name="Sinal Médio (dBm)" radius={[10, 10, 0, 0]}>
                            {dados.geral.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.rssi_medio > -90 ? '#10b981' : entry.rssi_medio > -115 ? '#f59e0b' : '#ef4444'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Tabelas de Médias Específicas */}
        <div className="xl:col-span-2 bg-slate-900 rounded-[3rem] p-10 shadow-2xl text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
            <h3 className="text-2xl font-black uppercase tracking-widest mb-8 text-blue-400">Sumário Analítico por Substância</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-white/10">
                            <th className="py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Fator / Substância</th>
                            <th className="py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-center">Média</th>
                            <th className="py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-center">Máximo</th>
                            <th className="py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-center">Mínimo</th>
                            <th className="py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-center">Sinal Médio</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {dados.geral.map((item, idx) => (
                            <tr key={idx} className="hover:bg-white/5 transition-colors">
                                <td className="py-6 flex items-center gap-4">
                                    <span className="text-2xl">{item.tipo_sensor.nome.includes('Oxig') ? '🫧' : item.tipo_sensor.nome.includes('pH') ? '⚗️' : '🌡️'}</span>
                                    <div>
                                        <div className="font-black text-lg">{item.tipo_sensor.nome}</div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase">{item.tipo_sensor.unidade}</div>
                                    </div>
                                </td>
                                <td className="py-6 text-center text-2xl font-black text-blue-400">{Number(item.media).toFixed(2)}</td>
                                <td className="py-6 text-center text-xl font-black text-white">{Number(item.maximo).toFixed(2)}</td>
                                <td className="py-6 text-center text-xl font-black text-slate-400">{Number(item.minimo).toFixed(2)}</td>
                                <td className={`py-6 text-center font-black ${item.rssi_medio > -90 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    {Math.round(item.rssi_medio)} dBm
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>

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
