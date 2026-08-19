import { exportarParaExcel } from './exportadorExcel';
import React, { useState, useEffect } from 'react';
import { supabase } from './components/supabaseClient';
import Login from './components/Login';
import PainelAdmin from './components/PainelAdmin';

export default function App() {
  const [session, setSession] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [loadingApp, setLoadingApp] = useState(true);

  function getHojeLocal() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  const [lancamentos, setLancamentos] = useState([]);
  const [listaViagens, setListaViagens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const [abaAtiva, setAbaAtiva] = useState('resumo');

  // Estados do Formulário
  const [idEdicao, setIdEdicao] = useState(null);
  const [valorInput, setValorInput] = useState('');
  const [categoria, setCategoria] = useState('Alimentação');
  const [data, setData] = useState(getHojeLocal());
  const [formaPagamento, setFormaPagamento] = useState('Cartão Corp.');
  const [descricao, setDescricao] = useState('');
  const [viagemIdSelecionada, setViagemIdSelecionada] = useState('');

  // Estado para o Comprovante
  const [arquivoComprovante, setArquivoComprovante] = useState(null);
  const [urlComprovante, setUrlComprovante] = useState('');

  // Criar Viagem
  const [novaViagemInput, setNovaViagemInput] = useState('');
  const [mostraCriarViagem, setMostraCriarViagem] = useState(false);

  // Filtros
  const [filtroViagemId, setFiltroViagemId] = useState('TODAS');
  const [filtroCategoria, setFiltroCategoria] = useState('TODAS');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');

  // 🔐 CONTROLE DE SESSÃO E PERFIL
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchPerfil(session.user.id);
      else setLoadingApp(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchPerfil(session.user.id);
      } else {
        setPerfil(null);
        setLoadingApp(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchPerfil(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      if (data) setPerfil(data);
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
    } finally {
      setLoadingApp(false);
    }
  }

  // 🔄 CARREGAR DADOS DO SUPABASE (Com isolamento por usuário)
  useEffect(() => {
    if (session && perfil) {
      carregarDados();
    }
  }, [session, perfil]);

  async function carregarDados() {
    setCarregando(true);
    try {
      // 1. Buscar Lista de Viagens da Empresa
      let queryViagens = supabase.from('viagens').select('*');
      if (perfil?.empresa_id) {
        queryViagens = queryViagens.eq('empresa_id', perfil.empresa_id);
      }

      const { data: dadosViagens, error: errViagens } = await queryViagens;
      if (errViagens) console.warn('Aviso ao carregar viagens:', errViagens);

      const viagensMapeadas = (dadosViagens || []).map((v) => ({
        id: v.id,
        nome: v.nome || v.viagem || v.descricao || `Viagem #${v.id}`
      }));

      setListaViagens(viagensMapeadas);

      if (viagensMapeadas.length > 0 && !viagemIdSelecionada) {
        setViagemIdSelecionada(String(viagensMapeadas[0].id));
      }

      // 2. Buscar Despesas filtrando estritamente pelo usuário logado
      const { data: dadosDespesas, error: errDespesas } = await supabase
        .from('despesas')
        .select('*, viagens(id, nome)')
        .eq('user_id', session.user.id) // 🔒 ISOLAMENTO POR USUÁRIO
        .order('id', { ascending: false });

      if (errDespesas) throw errDespesas;

      const despesasFormatadas = (dadosDespesas || []).map((item) => {
        const nomeViagem = item.viagens?.nome || 'Sem Viagem';

        return {
          id: item.id,
          valor: item.valor ? Number(item.valor).toFixed(2) : '0.00',
          categoria: item.categoria || 'Outros',
          data: item.data || getHojeLocal(),
          formaPagamento: item.forma_pagamento || 'Cartão Corp.',
          descricao: item.descricao || '',
          viagem_id: item.viagem_id,
          viagemNome: nomeViagem,
          comprovante: item.comprovante_url || null
        };
      });

      setLancamentos(despesasFormatadas);
    } catch (error) {
      console.error('Erro ao carregar dados do Supabase:', error);
    } finally {
      setCarregando(false);
    }
  }

  // LÓGICA DO VALOR
  const handleValorBlur = () => {
    if (!valorInput) return;
    let numStr = valorInput.toString().replace(',', '.');
    let num = parseFloat(numStr);

    if (!isNaN(num) && num > 0) {
      setValorInput(num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    }
  };

  const handleValorChange = (e) => {
    setValorInput(e.target.value);
  };

  const parseValorFloat = (val) => {
    if (!val) return 0;
    const limpo = val.toString().replace(/\./g, '').replace(',', '.');
    return parseFloat(limpo) || 0;
  };

  const resetFormulario = () => {
    setIdEdicao(null);
    setValorInput('');
    setCategoria('Alimentação');
    setData(getHojeLocal());
    setFormaPagamento('Cartão Corp.');
    setDescricao('');
    setViagemIdSelecionada(listaViagens.length > 0 ? String(listaViagens[0].id) : '');
    setArquivoComprovante(null);
    setUrlComprovante('');
    setEnviando(false); // 🔒 Garante que o botão nunca fique travado
  };

  // UPLOAD DE COMPROVANTE
  const uploadComprovante = async (file) => {
    if (!file) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from('comprovantes')
        .upload(fileName, file);

      if (uploadError) {
        alert('Erro no upload do comprovante: ' + uploadError.message);
        console.error('Erro detalhado:', uploadError);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('comprovantes')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (err) {
      alert('Erro no processo de upload: ' + err.message);
      return null;
    }
  };

  // CRIAR VIAGEM
  const handleCriarViagem = async (e) => {
    e.preventDefault();
    if (!novaViagemInput.trim()) return;

    const nomeFormatado = novaViagemInput.trim();

    try {
      const { data: novaViagem, error } = await supabase
        .from('viagens')
        .insert([{
          nome: nomeFormatado,
          descricao: 'Criado no App',
          status: 'Ativa',
          empresa_id: perfil?.empresa_id
        }])
        .select()
        .single();

      if (error) throw error;

      const vCriada = { id: novaViagem.id, nome: novaViagem.nome || nomeFormatado };
      setListaViagens((prev) => [...prev, vCriada]);
      setViagemIdSelecionada(String(vCriada.id));
      setNovaViagemInput('');
      setMostraCriarViagem(false);
    } catch (err) {
      alert(`Erro ao criar viagem: ${err.message || 'Verifique a tabela viagens'}`);
      console.error(err);
    }
  };

  // SALVAR DESPESA
  // SALVAR DESPESA
  const handleSalvar = async (e) => {
    e.preventDefault();
    const valorNum = parseValorFloat(valorInput);

    if (valorNum <= 0) {
      alert('Informe um valor válido maior que zero!');
      return;
    }

    setEnviando(true);

    try {
      let urlArquivo = urlComprovante;

      // Tenta fazer o upload do arquivo apenas se houver um novo arquivo selecionado
      if (arquivoComprovante) {
        const urlUpload = await uploadComprovante(arquivoComprovante);
        if (urlUpload) {
          urlArquivo = urlUpload;
        } else {
          // Caso queira impedir o salvamento se o comprovante falhar, descomente a linha abaixo:
          // throw new Error('Falha ao enviar o comprovante.');
        }
      }

      const payloadSupabase = {
        valor: valorNum,
        categoria: categoria || 'Outros',
        data: data || getHojeLocal(),
        forma_pagamento: formaPagamento || 'Cartão Corp.',
        descricao: descricao || '',
        viagem_id: viagemIdSelecionada ? parseInt(viagemIdSelecionada, 10) : null,
        comprovante_url: urlArquivo || null,
        user_id: session.user.id,
        empresa_id: perfil?.empresa_id
      };

      if (idEdicao) {
        const { error } = await supabase
          .from('despesas')
          .update(payloadSupabase)
          .eq('id', idEdicao)
          .eq('user_id', session.user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('despesas')
          .insert([payloadSupabase]);

        if (error) throw error;
      }

      await carregarDados();
      resetFormulario();
      setAbaAtiva('despesas');
    } catch (err) {
      console.error('Detalhes do Erro Supabase:', err);
      alert(`Erro ao gravar despesa: ${err.message || err.details || 'Erro no banco'}`);
    } finally {
      setEnviando(false);
    }
  };

  // EXCLUIR
  const handleExcluir = async (id) => {
    if (confirm('Deseja realmente excluir esta despesa?')) {
      try {
        const { error } = await supabase
          .from('despesas')
          .delete()
          .eq('id', id)
          .eq('user_id', session.user.id);

        if (error) throw error;
        carregarDados();
      } catch (err) {
        alert('Erro ao excluir no Supabase');
        console.error(err);
      }
    }
  };

  const handleEditar = (item) => {
    resetFormulario();
    setIdEdicao(item.id);

    const valNum = parseFloat(item.valor);
    setValorInput(isNaN(valNum) ? '' : valNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));

    setCategoria(item.categoria);
    setData(item.data);
    setFormaPagamento(item.formaPagamento);
    setDescricao(item.descricao || '');
    setViagemIdSelecionada(item.viagem_id ? String(item.viagem_id) : '');
    setUrlComprovante(item.comprovante || '');
    setAbaAtiva('novo');
  };

  const limparFiltros = () => {
    setFiltroViagemId('TODAS');
    setFiltroCategoria('TODAS');
    setFiltroDataInicio('');
    setFiltroDataFim('');
  };

  // FILTRAGEM
  const despesasFiltradas = lancamentos.filter((item) => {
    const atendeViagem =
      filtroViagemId === 'TODAS' ||
      (filtroViagemId === 'SEM' && !item.viagem_id) ||
      String(item.viagem_id) === String(filtroViagemId);

    const atendeCategoria = filtroCategoria === 'TODAS' || item.categoria === filtroCategoria;

    let atendeData = true;
    if (filtroDataInicio) atendeData = atendeData && item.data >= filtroDataInicio;
    if (filtroDataFim) atendeData = atendeData && item.data <= filtroDataFim;

    return atendeViagem && atendeCategoria && atendeData;
  });

  // CÁLCULOS
  const totalFiltrado = despesasFiltradas.reduce((acc, item) => acc + (parseFloat(item.valor) || 0), 0);

  const totalPorCategoria = despesasFiltradas.reduce((acc, item) => {
    const cat = item.categoria || 'Outros';
    acc[cat] = (acc[cat] || 0) + (parseFloat(item.valor) || 0);
    return acc;
  }, {});

  const totalPorViagem = despesasFiltradas.reduce((acc, item) => {
    const v = item.viagemNome || 'Sem Viagem';
    acc[v] = (acc[v] || 0) + (parseFloat(item.valor) || 0);
    return acc;
  }, {});

  const formatarMoeda = (val) => {
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const exportarExcelNativo = () => {
    exportarParaExcel(despesasFiltradas, getHojeLocal());
  };

  const PALETA_CORES = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#64748B', '#84CC16', '#D97706'
  ];

  const GraficoPizzaSVG = ({ dadosMap, totalSum }) => {
    const itens = Object.entries(dadosMap).filter(([_, val]) => val > 0);

    if (itens.length === 0 || totalSum <= 0) {
      return <p className="text-xs text-gray-400 py-6 text-center">Sem dados suficientes para o gráfico.</p>;
    }

    let acumuladoPercentual = 0;

    const fatias = itens.map(([nome, valor], index) => {
      const percentual = valor / totalSum;
      const startAngle = acumuladoPercentual * 360;
      acumuladoPercentual += percentual;
      const endAngle = acumuladoPercentual * 360;

      const cor = PALETA_CORES[index % PALETA_CORES.length];

      const startRad = (startAngle - 90) * (Math.PI / 180);
      const endRad = (endAngle - 90) * (Math.PI / 180);

      const x1 = 100 + 80 * Math.cos(startRad);
      const y1 = 100 + 80 * Math.sin(startRad);
      const x2 = 100 + 80 * Math.cos(endRad);
      const y2 = 100 + 80 * Math.sin(endRad);

      const isLargeArc = percentual > 0.5 ? 1 : 0;

      if (percentual >= 0.999) {
        return {
          nome,
          valor,
          percentual: (percentual * 100).toFixed(1),
          cor,
          path: `M 100 20 A 80 80 0 1 1 99.99 20 Z`
        };
      }

      const path = `M 100 100 L ${x1} ${y1} A 80 80 0 ${isLargeArc} 1 ${x2} ${y2} Z`;

      return {
        nome,
        valor,
        percentual: (percentual * 100).toFixed(1),
        cor,
        path
      };
    });

    return (
      <div className="flex flex-col items-center gap-4 py-2">
        <div className="relative w-44 h-44 drop-shadow-md">
          <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
            {fatias.map((fatia, i) => (
              <path
                key={i}
                d={fatia.path}
                fill={fatia.cor}
                className="transition-all duration-300 hover:opacity-85 cursor-pointer"
              >
                <title>{`${fatia.nome}: ${formatarMoeda(fatia.valor)} (${fatia.percentual}%)`}</title>
              </path>
            ))}
          </svg>
        </div>

        <div className="w-full space-y-1.5 pt-2 border-t">
          {fatias.map((fatia, i) => (
            <div key={i} className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2 truncate max-w-[170px]">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: fatia.cor }}></span>
                <span className="text-gray-700 font-medium truncate">{fatia.nome}</span>
              </div>
              <span className="font-bold text-gray-900">
                {formatarMoeda(fatia.valor)} <span className="text-[10px] text-gray-500 font-normal">({fatia.percentual}%)</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 🔄 TELAS DE CARREGAMENTO E AUTENTICAÇÃO
  if (loadingApp) {
    return <div className="text-center py-20 text-sm font-semibold text-gray-500">Carregando sistema...</div>;
  }

  if (!session) {
    return <Login />;
  }

  // Se o usuário for ADMIN, exibe o painel administrativo na tela inteira (PC)
  if (perfil?.funcao === 'admin') {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-gray-100 flex flex-col justify-between font-sans text-gray-800">
        <header className="bg-blue-600 text-white p-4 shadow-md flex justify-between items-center">
          <span className="font-bold text-lg">Painel do Administrador</span>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg font-bold shadow transition-colors"
          >
            Sair
          </button>
        </header>
        <main className="p-4 flex-1">
          <PainelAdmin empresaId={perfil.empresa_id} />
        </main>
      </div>
    );
  }

  // Se for Usuário Comum, exibe o app de despesas isolado
  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-100 flex flex-col justify-between font-sans text-gray-800">
     <header className="bg-blue-600 text-white p-4 rounded-xl shadow-md flex justify-between items-center">
        <div>
          <div className="font-bold text-base">Gestão de Despesas</div>
          <span className="text-xs opacity-95 block">Olá, {perfil?.nome || 'Usuário'}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportarExcelNativo}
            className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 shadow transition-colors"
          >
            📊 Excel
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1.5 rounded-lg font-bold shadow transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

<main className="p-4 flex-1 pb-24">
        {carregando ? (
          <div className="text-center py-16 space-y-2">
            <div className="animate-spin text-3xl">⚙️</div>
            <p className="text-sm font-semibold text-gray-500">Carregando seus dados...</p>
          </div>
        ) : (
          <>
            {/* ABA 1: FORMULÁRIO */}
            {abaAtiva === 'novo' && (
              <div className="bg-white p-4 rounded-xl shadow-md space-y-4">
                <div className="border-b pb-2">
                  <h2 className="text-base font-bold text-gray-700">
                    {idEdicao ? '✏️ Editar Lançamento' : '➕ Novo Lançamento'}
                  </h2>
                </div>

                <form onSubmit={handleSalvar} className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-semibold text-gray-600">Viagem / Evento</label>
                      <button
                        type="button"
                        onClick={() => setMostraCriarViagem(!mostraCriarViagem)}
                        className="text-[11px] text-blue-600 font-bold hover:underline"
                      >
                        {mostraCriarViagem ? 'Cancelar' : '+ Nova Viagem'}
                      </button>
                    </div>

                    {mostraCriarViagem ? (
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          placeholder="Ex: Viagem Águas Claras"
                          value={novaViagemInput}
                          onChange={(e) => setNovaViagemInput(e.target.value)}
                          className="flex-1 p-2 border rounded-lg text-xs"
                        />
                        <button
                          type="button"
                          onClick={handleCriarViagem}
                          className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold"
                        >
                          Salvar
                        </button>
                      </div>
                    ) : (
                      <select
                        value={viagemIdSelecionada}
                        onChange={(e) => setViagemIdSelecionada(e.target.value)}
                        className="w-full p-2 border rounded-lg text-sm font-semibold text-blue-900 bg-blue-50/50"
                      >
                        <option value="">Nenhuma / Sem Viagem</option>
                        {listaViagens.map((v) => (
                          <option key={v.id} value={v.id}>
                            ✈️ {v.nome}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Valor (R$)*</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 55 (ao sair vira 55,00)"
                      value={valorInput}
                      onChange={handleValorChange}
                      onBlur={handleValorBlur}
                      className="w-full p-2 border rounded-lg text-lg font-bold text-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Data*</label>
                    <input
                      type="date"
                      required
                      value={data}
                      onChange={(e) => setData(e.target.value)}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Categoria</label>
                    <select
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value)}
                      className="w-full p-2 border rounded-lg"
                    >
                      <option value="Alimentação">Alimentação</option>
                      <option value="Farmácia">Farmácia</option>
                      <option value="Saúde">Saúde</option>
                      <option value="Transporte">Transporte</option>
                      <option value="Combustível">Combustível</option>
                      <option value="Hospedagem">Hospedagem</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Forma de Pagamento</label>
                    <select
                      value={formaPagamento}
                      onChange={(e) => setFormaPagamento(e.target.value)}
                      className="w-full p-2 border rounded-lg"
                    >
                      <option value="Cartão Corp.">Cartão Corp.</option>
                      <option value="Pix">Pix</option>
                      <option value="Cartão de Crédito">Cartão de Crédito</option>
                      <option value="Cartão de Débito">Cartão de Débito</option>
                      <option value="Dinheiro">Dinheiro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Descrição</label>
                    <input
                      type="text"
                      placeholder="Ex: Almoço, Posto, Hotel..."
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Anexar Comprovante (Foto/PDF)</label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      key={urlComprovante || 'file-input'} // <-- Isso força o input a limpar após o reset
                      onChange={(e) => setArquivoComprovante(e.target.files[0])}
                      className="w-full text-xs text-gray-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />

                    {arquivoComprovante && !urlComprovante && (
                      <p className="text-[11px] text-blue-600 mt-1">
                        📁 Arquivo selecionado: {arquivoComprovante.name}
                      </p>
                    )}

                    {urlComprovante && (
                      <p className="text-[11px] text-green-600 mt-1">
                        ✓ Comprovante anexo salvo (<a href={urlComprovante} target="_blank" rel="noreferrer" className="underline text-blue-600">Visualizar</a>)
                      </p>
                    )}
                  </div>
                  
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={enviando}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-4 rounded-lg shadow transition-colors disabled:bg-gray-400"
                    >
                      {enviando ? 'Enviando...' : idEdicao ? 'Atualizar Despesa' : 'Salvar Despesa'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ABA 2: LISTAGEM */}
            {abaAtiva === 'despesas' && (
              <div className="space-y-3">
                <h2 className="text-base font-bold text-gray-700">📋 Minhas Despesas ({despesasFiltradas.length})</h2>

                <div className="bg-white p-3 rounded-xl shadow border border-gray-100 space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">🔍 Filtros</p>
                    <button onClick={limparFiltros} className="text-[10px] text-blue-600 font-semibold hover:underline">
                      Limpar Filtros
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-400 font-semibold mb-0.5">Viagem</label>
                      <select
                        value={filtroViagemId}
                        onChange={(e) => setFiltroViagemId(e.target.value)}
                        className="w-full p-1.5 border rounded-lg text-xs font-medium"
                      >
                        <option value="TODAS">Todas ({listaViagens.length})</option>
                        <option value="SEM">Sem Viagem</option>
                        {listaViagens.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-gray-400 font-semibold mb-0.5">Categoria</label>
                      <select
                        value={filtroCategoria}
                        onChange={(e) => setFiltroCategoria(e.target.value)}
                        className="w-full p-1.5 border rounded-lg text-xs font-medium"
                      >
                        <option value="TODAS">Todas</option>
                        <option value="Alimentação">Alimentação</option>
                        <option value="Farmácia">Farmácia</option>
                        <option value="Saúde">Saúde</option>
                        <option value="Transporte">Transporte</option>
                        <option value="Combustível">Combustível</option>
                        <option value="Hospedagem">Hospedagem</option>
                        <option value="Outros">Outros</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-gray-400 font-semibold mb-0.5">De (Data)</label>
                      <input
                        type="date"
                        value={filtroDataInicio}
                        onChange={(e) => setFiltroDataInicio(e.target.value)}
                        className="w-full p-1 border rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-gray-400 font-semibold mb-0.5">Até (Data)</label>
                      <input
                        type="date"
                        value={filtroDataFim}
                        onChange={(e) => setFiltroDataFim(e.target.value)}
                        className="w-full p-1 border rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>

                {despesasFiltradas.length === 0 ? (
                  <div className="bg-white p-6 rounded-xl shadow text-center space-y-2 border border-gray-100">
                    <p className="text-sm text-gray-500 font-medium">Nenhuma despesa encontrada.</p>
                  </div>
                ) : (
                  despesasFiltradas.map((item) => (
                    <div key={item.id} className="bg-white p-3 rounded-xl shadow border border-gray-100 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold uppercase">
                          ✈️ {item.viagemNome}
                        </span>
                        <p className="font-bold text-gray-800 text-sm mt-1">{item.descricao || item.categoria}</p>
                        <p className="text-xs text-gray-500">{item.data} • {item.categoria} • {item.formaPagamento}</p>
                        <p className="text-xs font-bold text-blue-600 mt-0.5">
                          {formatarMoeda(item.valor)}
                        </p>
                        {item.comprovante && (
                          <a
                            href={item.comprovante}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-block text-[10px] text-blue-600 font-bold underline mt-1"
                          >
                            📎 Ver Comprovante
                          </a>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleEditar(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                          ✏️
                        </button>
                        <button onClick={() => handleExcluir(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

{/* ABA 3: RESUMO E GRÁFICOS */}
{abaAtiva === 'resumo' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-base font-bold text-gray-900">📊 Painel Resumo</h2>
                </div>

                <div className="bg-gradient-to-r from-blue-600 to-indigo-800 text-white p-4 rounded-xl shadow-lg">
                  <p className="text-xs font-medium opacity-100 uppercase tracking-wide">Total Geral Filtrado</p>
                  <p className="text-3xl font-extrabold mt-1">{formatarMoeda(totalFiltrado)}</p>
                  <p className="text-[11px] opacity-75 mt-1">{despesasFiltradas.length} lançamento(s) ativo(s)</p>
                </div>

                <div className="bg-white p-4 rounded-xl shadow border border-gray-100">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b pb-2 mb-2">
                    🍕 Gastos por Categoria
                  </h3>
                  <GraficoPizzaSVG dadosMap={totalPorCategoria} totalSum={totalFiltrado} />
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* RODAPÉ DE NAVEGAÇÃO ENTRE ABAS */}
      <nav className="bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 max-w-md mx-auto flex justify-around p-3 rounded-xl shadow-lg">
        <button
          onClick={() => setAbaAtiva('novo')}
          className={`flex flex-col items-center text-xs font-bold ${abaAtiva === 'novo' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <span>➕</span>
          <span>Novo</span>
        </button>
        <button
          onClick={() => setAbaAtiva('despesas')}
          className={`flex flex-col items-center text-xs font-bold ${abaAtiva === 'despesas' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <span>📋</span>
          <span>Despesas</span>
        </button>
        <button
          onClick={() => setAbaAtiva('resumo')}
          className={`flex flex-col items-center text-xs font-bold ${abaAtiva === 'resumo' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <span>📊</span>
          <span>Resumo</span>
        </button>
      </nav>
    </div>
  );
}