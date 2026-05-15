import CartoesEstado from '../components/CartoesEstado';
import MapaBoias from '../components/MapaBoias';
import TabelaAlertas from '../components/TabelaAlertas';

export default function VisaoGeral() {
  return (
    <div className="space-y-6">
      {/* Estatísticas Rápidas (Ecrã de cima) */}
      <CartoesEstado />

      {/* Grelha de baixo (Mapa à esquerda, Alertas à direita) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* O Mapa ocupa 2 colunas no ecrã grande */}
        <div className="xl:col-span-2">
          <MapaBoias />
        </div>

        {/* Os Alertas ocupam 1 coluna */}
        <div className="xl:col-span-1">
          <TabelaAlertas />
        </div>

      </div>
    </div>
  );
}