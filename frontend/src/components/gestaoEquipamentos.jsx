import { useState, useEffect } from 'react';
import api from '../api';

export default function GestaoEquipamentos() {
    const [subAba, setSubAba] = useState('inventario');

    const [zonas, setZonas] = useState([]);
    const [boias, setBoias] = useState([]);
    const [tiposSensor, setTiposSensor] = useState([]);

    // Estado do Formulário da Boia (Criação do zero)
    const [formBoia, setFormBoia] = useState({
        mac_boia: '', mac_gateway: '', nome: '', zona_id: '', latitude: '', longitude: '', localizacao_texto: ''
    });

    // Estado dos Sensores para Nova Instalação
    const [sensoresForm, setSensoresForm] = useState([
        { tipo_sensor_id: '', valor_minimo: '', valor_maximo: '' }
    ]);

    // [NOVO] Estado para a Aba de Manutenção (Adicionar sensores a boia existente)
    const [manutencao, setManutencao] = useState({
        boia_id: '',
        tipo_sensor_id: '',
        valor_minimo: '',
        valor_maximo: ''
    });

    const [mensagem, setMensagem] = useState({ texto: '', tipo: '' });

    useEffect(() => { carregarDadosIniciais(); }, []);

    const carregarDadosIniciais = async () => {
        try {
            const [resZonas, resBoias, resTipos] = await Promise.all([
                api.get('/zonas'), api.get('/boias'), api.get('/tipos-sensor')
            ]);
            setZonas(resZonas.data);
            setBoias(resBoias.data);
            setTiposSensor(resTipos.data);
        } catch (error) {
            mostrarMensagem('Erro ao carregar dados.', 'erro');
        }
    };

    const mostrarMensagem = (texto, tipo) => {
        setMensagem({ texto, tipo });
        setTimeout(() => setMensagem({ texto: '', tipo: '' }), 5000);
    };

    // Funções Auxiliares para o Form Dinâmico
    const adicionarLinhaSensor = () => {
        setSensoresForm([...sensoresForm, { tipo_sensor_id: '', valor_minimo: '', valor_maximo: '' }]);
    };
    const removerLinhaSensor = (index) => {
        const novosSensores = [...sensoresForm];
        novosSensores.splice(index, 1);
        setSensoresForm(novosSensores);
    };
    const atualizarSensor = (index, campo, valor) => {
        const novosSensores = [...sensoresForm];
        novosSensores[index][campo] = valor;
        setSensoresForm(novosSensores);
    };

    // Submissão 1: Criação Completa do Zero
    const handleCriarInstalacaoCompleta = async (e) => {
        e.preventDefault();
        try {
            const resBoia = await api.post('/boias', formBoia);
            const novaBoiaId = resBoia.data.boia.id;

            const promessasSensores = sensoresForm
                .filter(s => s.tipo_sensor_id && s.valor_minimo && s.valor_maximo)
                .map(sensor => api.post('/boias/associar-sensor', {
                    boia_id: novaBoiaId,
                    tipo_sensor_id: sensor.tipo_sensor_id,
                    valor_minimo: sensor.valor_minimo,
                    valor_maximo: sensor.valor_maximo
                }));

            await Promise.all(promessasSensores);
            mostrarMensagem('Instalação completa registada com sucesso!', 'sucesso');
            setFormBoia({ mac_boia: '', mac_gateway: '', nome: '', zona_id: '', latitude: '', longitude: '', localizacao_texto: '' });
            setSensoresForm([{ tipo_sensor_id: '', valor_minimo: '', valor_maximo: '' }]);
            carregarDadosIniciais();
            setSubAba('inventario');
        } catch (error) {
            mostrarMensagem('Erro ao registar equipamento.', 'erro');
        }
    };

    // [NOVO] Submissão 2: Adicionar Sensor a uma Instalação Existente
    const handleAdicionarSensorExistente = async (e) => {
        e.preventDefault();
        try {
            await api.post('/boias/associar-sensor', manutencao);
            mostrarMensagem('Sensor acoplado e limites atualizados no inventário!', 'sucesso');
            // Limpar apenas os campos do sensor, mantendo a boia selecionada para o caso de querer pôr mais do que um
            setManutencao({
                ...manutencao,
                tipo_sensor_id: '',
                valor_minimo: '',
                valor_maximo: ''
            });
            carregarDadosIniciais(); // Recarrega para atualizar o Diagrama Visual
        } catch (error) {
            mostrarMensagem('Erro ao associar o sensor à instalação selecionada.', 'erro');
        }
    };

    const boiasPorZona = zonas.map(zona => {
        return { ...zona, instalacoes: boias.filter(b => b.zona_id === zona.id) };
    });

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-w-6xl mx-auto mb-10">

            {/* Abas de Navegação (Agora são 3) */}
            <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto">
                <button
                    onClick={() => setSubAba('inventario')}
                    className={`px-6 py-4 font-semibold text-sm whitespace-nowrap ${subAba === 'inventario' ? 'border-b-2 border-blue-600 text-blue-600 bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    🌳 Inventário Visual
                </button>
                <button
                    onClick={() => setSubAba('nova')}
                    className={`px-6 py-4 font-semibold text-sm whitespace-nowrap ${subAba === 'nova' ? 'border-b-2 border-blue-600 text-blue-600 bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    ➕ Nova Instalação Completa
                </button>
                <button
                    onClick={() => setSubAba('manutencao')}
                    className={`px-6 py-4 font-semibold text-sm whitespace-nowrap ${subAba === 'manutencao' ? 'border-b-2 border-blue-600 text-blue-600 bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    🔌 Adicionar Sensores a Boia Existente
                </button>
            </div>

            {mensagem.texto && (
                <div className={`p-4 text-center text-sm font-medium ${mensagem.tipo === 'sucesso' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {mensagem.texto}
                </div>
            )}

            <div className="p-8">

                {/* =========================================
            TAB 1: INVENTÁRIO VISUAL
        ============================================= */}
                {subAba === 'inventario' && (
                    <div className="space-y-8">
                        <h3 className="text-xl font-bold text-gray-800">Mapa de Arquitetura de Hardware</h3>
                        {boiasPorZona.map(zona => (
                            <div key={zona.id} className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-4">
                                <h4 className="text-lg font-bold text-blue-900 border-b pb-2 mb-4">🗺️ {zona.nome} ({zona.concelho})</h4>
                                {zona.instalacoes.length === 0 ? (
                                    <p className="text-slate-400 text-sm italic">Nenhum equipamento instalado nesta zona.</p>
                                ) : (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {zona.instalacoes.map(boia => (
                                            <div key={boia.id} className="bg-white border border-blue-100 rounded-lg shadow-sm p-4">
                                                <div className="font-bold text-slate-800 mb-1">{boia.nome}</div>
                                                <div className="text-xs text-slate-500 mb-4">📍 {boia.localizacao_texto || 'Sem morada definida'}</div>
                                                <div className="text-[11px] text-slate-400 font-mono mb-4">
                                                    🌐 GPS: {boia.latitude}, {boia.longitude}
                                                </div>
                                                <div className="pl-2 border-l-2 border-blue-300 ml-2 space-y-4">
                                                    <div className="bg-blue-50 p-2 rounded text-sm border border-blue-100">
                                                        <span className="font-bold text-blue-800">📡 ESP32 Gateway (Margem)</span><br /><span className="text-slate-500 text-xs font-mono">MAC: {boia.mac_gateway}</span>
                                                    </div>
                                                    <div className="bg-cyan-50 p-2 rounded text-sm border border-cyan-100">
                                                        <span className="font-bold text-cyan-800">🛟 ESP32 Boia (Rio)</span><br /><span className="text-slate-500 text-xs font-mono">MAC: {boia.mac_boia}</span>
                                                    </div>
                                                    <div className="text-sm">
                                                        <span className="font-bold text-emerald-700">🔌 Sensores Ligados:</span>
                                                        {boia.limites && boia.limites.length > 0 ? (
                                                            <ul className="mt-2 space-y-2">
                                                                {boia.limites.map(limite => (
                                                                    <li key={limite.id} className="bg-slate-100 px-3 py-1.5 rounded text-xs border border-slate-200 flex justify-between">
                                                                        <span className="font-semibold text-slate-700">{limite.tipo_sensor?.nome}</span>
                                                                        <span className="text-slate-500">[{limite.valor_minimo} - {limite.valor_maximo}] {limite.tipo_sensor?.unidade}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        ) : (<p className="text-xs text-red-400 mt-1">Nenhum sensor associado.</p>)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* =========================================
            TAB 2: FORMULÁRIO COMPLETO (DO ZERO)
        ============================================= */}
                {subAba === 'nova' && (
                    <form onSubmit={handleCriarInstalacaoCompleta} className="space-y-8">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">1. Identificação e Hardware</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700">Nome da Boia</label>
                                    <input type="text" required value={formBoia.nome} onChange={e => setFormBoia({ ...formBoia, nome: e.target.value })} className="mt-1 w-full p-2.5 border rounded-lg bg-gray-50 outline-none" placeholder="Ex: Boia Foz do Lis" />
                                </div>
                                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-blue-900 uppercase">ESP32 Nº1: Boia (Na Água)</label>
                                        <input type="text" required value={formBoia.mac_boia} onChange={e => setFormBoia({ ...formBoia, mac_boia: e.target.value })} className="mt-1 w-full p-2 border rounded-md font-mono text-sm" placeholder="Ex: 24:6F:28:A1:B2:C3" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-cyan-900 uppercase">ESP32 Nº2: Gateway (Na Margem)</label>
                                        <input type="text" required value={formBoia.mac_gateway} onChange={e => setFormBoia({ ...formBoia, mac_gateway: e.target.value })} className="mt-1 w-full p-2 border rounded-md font-mono text-sm" placeholder="Ex: 32:AE:A4:05:C1:FE" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">2. Localização</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700">Zona Hidrográfica</label>
                                    <select required value={formBoia.zona_id} onChange={e => setFormBoia({ ...formBoia, zona_id: e.target.value })} className="mt-1 w-full p-2.5 border rounded-lg bg-gray-50"><option value="">Selecione...</option>{zonas.map(z => <option key={z.id} value={z.id}>{z.nome}</option>)}</select>
                                </div>
                                <div className="md:col-span-2"><label className="block text-sm font-semibold text-gray-700">Morada / Referência</label><input type="text" value={formBoia.localizacao_texto} onChange={e => setFormBoia({ ...formBoia, localizacao_texto: e.target.value })} className="mt-1 w-full p-2.5 border rounded-lg bg-gray-50" placeholder="Ex: Rua do Cais..." /></div>
                                <div><label className="block text-sm font-semibold text-gray-700">Latitude</label><input type="number" step="any" required value={formBoia.latitude} onChange={e => setFormBoia({ ...formBoia, latitude: e.target.value })} className="mt-1 w-full p-2.5 border rounded-lg bg-gray-50" /></div>
                                <div><label className="block text-sm font-semibold text-gray-700">Longitude</label><input type="number" step="any" required value={formBoia.longitude} onChange={e => setFormBoia({ ...formBoia, longitude: e.target.value })} className="mt-1 w-full p-2.5 border rounded-lg bg-gray-50" /></div>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-end border-b pb-2 mb-4"><h3 className="text-lg font-bold text-gray-800">3. Sensores e Limites (VLE)</h3><button type="button" onClick={adicionarLinhaSensor} className="text-sm bg-slate-200 px-3 py-1.5 rounded hover:bg-slate-300 font-medium">+ Adicionar Sensor</button></div>
                            <div className="space-y-3">
                                {sensoresForm.map((sensor, index) => (
                                    <div key={index} className="flex flex-col md:flex-row gap-4 items-end bg-slate-50 p-4 rounded-lg border border-slate-200">
                                        <div className="flex-1 w-full"><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Sensor</label><select required value={sensor.tipo_sensor_id} onChange={e => atualizarSensor(index, 'tipo_sensor_id', e.target.value)} className="w-full p-2 border rounded bg-white"><option value="">Selecione...</option>{tiposSensor.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}</select></div>
                                        <div className="w-full md:w-32"><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Mínimo</label><input type="number" step="any" required value={sensor.valor_minimo} onChange={e => atualizarSensor(index, 'valor_minimo', e.target.value)} className="w-full p-2 border rounded" /></div>
                                        <div className="w-full md:w-32"><label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Máximo</label><input type="number" step="any" required value={sensor.valor_maximo} onChange={e => atualizarSensor(index, 'valor_maximo', e.target.value)} className="w-full p-2 border rounded" /></div>
                                        {sensoresForm.length > 1 && (<button type="button" onClick={() => removerLinhaSensor(index)} className="px-3 py-2 bg-red-100 text-red-600 rounded font-bold">X</button>)}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-end pt-6 border-t"><button type="submit" className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-bold shadow-md">Gravar Instalação Completa</button></div>
                    </form>
                )}

                {/* =========================================
            [NOVO] TAB 3: MANUTENÇÃO / ADICIONAR A EXISTENTE
        ============================================= */}
                {subAba === 'manutencao' && (
                    <form onSubmit={handleAdicionarSensorExistente} className="space-y-6 max-w-2xl mx-auto border p-6 rounded-xl bg-slate-50">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">Manutenção de Estação Ativa</h3>
                            <p className="text-sm text-gray-500">Selecione uma boia já instalada no terreno para lhe acoplar um novo sensor ou redefinir os seus limites.</p>
                        </div>

                        {/* Dropdown 1: Selecionar qual a Boia Alvo */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700">Selecione a Boia/Instalação Alvo</label>
                            <select
                                required
                                value={manutencao.boia_id}
                                onChange={e => setManutencao({ ...manutencao, boia_id: e.target.value })}
                                className="mt-1 w-full p-2.5 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">-- Escolha uma das boias ativas --</option>
                                {boias.map(b => (
                                    <option key={b.id} value={b.id}>📍 {b.nome} [{b.localizacao_texto || 'Sem Morada'}]</option>
                                ))}
                            </select>
                        </div>

                        {/* Grelha de configuração do Sensor Único */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-lg border">

                            <div className="md:col-span-3">
                                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Qual o Sensor a adicionar/atualizar?</label>
                                <select
                                    required
                                    value={manutencao.tipo_sensor_id}
                                    onChange={e => setManutencao({ ...manutencao, tipo_sensor_id: e.target.value })}
                                    className="w-full p-2 border rounded bg-white"
                                >
                                    <option value="">Selecione o parâmetro físico...</option>
                                    {tiposSensor.map(t => <option key={t.id} value={t.id}>{t.nome} ({t.unidade})</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Valor Mínimo (VLE)</label>
                                <input type="number" step="any" required value={manutencao.valor_minimo} onChange={e => setManutencao({ ...manutencao, valor_minimo: e.target.value })} className="w-full p-2 border rounded bg-slate-50 focus:bg-white" placeholder="Mínimo" />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Valor Máximo (VLE)</label>
                                <input type="number" step="any" required value={manutencao.valor_maximo} onChange={e => setManutencao({ ...manutencao, valor_maximo: e.target.value })} className="w-full p-2 border rounded bg-slate-50 focus:bg-white" placeholder="Máximo" />
                            </div>

                            <div className="flex items-end">
                                <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-semibold transition shadow-sm text-sm">
                                    ⚡ Vincular à Boia
                                </button>
                            </div>

                        </div>

                        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-700">
                            💡 <strong>Nota técnica:</strong> Se escolher um sensor que a boia já tem, a API irá simplesmente atualizar os valores dos limites mínimo e máximo para os novos valores digitados.
                        </div>
                    </form>
                )}

            </div>
        </div>
    );
}