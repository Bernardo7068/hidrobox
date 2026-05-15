import { useState, useEffect } from 'react';
import api from '../api';

export default function CartoesEstado() {
  const [stats, setStats] = useState({ boias: 0, alertas: 0, bateria: 0 });

  useEffect(() => {
    // Exemplo: ir buscar o total de boias e alertas ativos
    Promise.all([
      api.get('/boias'),
      api.get('/alertas/ativos')
    ]).then(([resBoias, resAlertas]) => {
      const mediaBateria = resBoias.data.reduce((acc, b) => acc + b.bateria, 0) / resBoias.data.length;
      setStats({
        boias: resBoias.data.length,
        alertas: resAlertas.data.length,
        bateria: Math.round(mediaBateria) || 0
      });
    });
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <StatCard title="Boias Ativas" value={stats.boias} color="blue" icon="📍" />
      <StatCard title="Alertas Críticos" value={stats.alertas} color="red" icon="⚠️" />
      <StatCard title="Nível de Bateria" value={`${stats.bateria}%`} color="green" icon="🔋" />
    </div>
  );
}

function StatCard({ title, value, color, icon }) {
  const colors = {
    blue: "border-blue-500 text-blue-600",
    red: "border-red-500 text-red-600",
    green: "border-green-500 text-green-600"
  };
  return (
    <div className={`bg-white p-6 rounded-xl shadow-sm border-l-8 ${colors[color]}`}>
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm font-medium text-gray-500 uppercase">{title}</p>
          <p className="text-3xl font-bold text-gray-800">{value}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}