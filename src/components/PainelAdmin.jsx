import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function PainelAdmin({ empresaId }) {
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Formulário para novo usuário comum
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (empresaId) {
      carregarUsuarios();
    }
  }, [empresaId]);

  async function carregarUsuarios() {
    setCarregando(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('empresa_id', empresaId);

      if (error) throw error;
      setUsuarios(data || []);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    } finally {
      setCarregando(false);
    }
  }

  const handleCriarUsuario = async (e) => {
    e.preventDefault();
    setEnviando(true);

    try {
      // 1. Criar usuário no Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
      });

      if (error) throw error;
      if (!data.user) throw new Error('Erro ao criar usuário no sistema.');

      // 2. Gravar perfil completo (incluindo email)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([{
          id: data.user.id,
          nome: nome,        // Nome digitado
          email: email,      // E-mail incluído para conferência
          empresa_id: empresaId,
          funcao: 'usuario'
        }], { onConflict: ['id'] });

      if (profileError) throw profileError;

      // 3. O "Pulo do Gato": Forçar o usuário admin a logar novamente
      // Como o signUp loga o usuário novo, buscamos a sessão do Admin (se você tiver salvo)
      // ou apenas redirecionamos ou limpamos a sessão para evitar o login indesejado.
      alert('Colaborador cadastrado com sucesso!'); await supabase.auth.signOut();
      
      // Limpa os campos
      setNome(''); setEmail(''); setSenha('');
      carregarUsuarios();
    } catch (err) {
      alert(`Erro ao criar: ${err.message}`);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Formulário para adicionar colaborador */}
      <div className="bg-white p-4 rounded-xl shadow-md space-y-4">
        <h2 className="text-sm font-bold text-gray-700 border-b pb-2">➕ Cadastrar Novo Colaborador</h2>
        <form onSubmit={handleCriarUsuario} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Nome Completo</label>
            <input
              type="text"
              required
              placeholder="Nome do funcionário"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full p-2 border rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">E-mail</label>
            <input
              type="email"
              required
              placeholder="email@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Senha Inicial</label>
            <input
              type="password"
              required
              placeholder="Mínimo 6 caracteres"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full p-2 border rounded-lg text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={enviando}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-xs shadow transition-colors disabled:bg-gray-400"
          >
            {enviando ? 'Cadastrando...' : 'Salvar Colaborador'}
          </button>
        </form>
      </div>

      {/* Listagem de Colaboradores */}
      <div className="bg-white p-4 rounded-xl shadow-md space-y-3">
        <h2 className="text-sm font-bold text-gray-700 border-b pb-2">👥 Colaboradores da Empresa ({usuarios.length})</h2>
        {carregando ? (
          <p className="text-xs text-gray-500 text-center py-4">Carregando...</p>
        ) : usuarios.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-4">Nenhum colaborador cadastrado ainda.</p>
        ) : (
          <div className="space-y-2">
            {usuarios.map((u) => (
              <div key={u.id} className="p-3 bg-gray-50 rounded-lg border flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold text-gray-800">{u.nome}</p>
                  <p className="text-gray-500">Função: <span className="uppercase font-semibold">{u.funcao}</span></p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}