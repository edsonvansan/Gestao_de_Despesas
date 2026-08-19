import React, { useState } from 'react';
import { supabase } from './supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [modoCadastroEmpresa, setModoCadastroEmpresa] = useState(false);
  
  // Campos para cadastro de nova empresa + admin inicial
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [nomeAdmin, setNomeAdmin] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErro('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      if (error) throw error;
    } catch (err) {
      setErro(err.message || 'Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  const handleCadastrarEmpresaAdmin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErro('');

    try {
      // 1. Criar a Empresa
      const { data: empresaData, error: empresaError } = await supabase
        .from('empresas')
        .insert([{ 
          nome: nomeEmpresa,
          nome_fantasia: nomeEmpresa 
        }])
        .select()
        .single();

      if (empresaError) throw empresaError;

      // 2. Criar o Usuário no Auth do Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: senha,
      });

      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) throw new Error('Erro ao gerar ID do usuário.');

      // 3. Usar UPSERT para criar ou atualizar o perfil sem dar erro de chave duplicada
      const { error: perfilError } = await supabase
        .from('profiles')
        .upsert([{
          id: userId,
          nome: nomeAdmin,
          empresa_id: empresaData.id,
          funcao: 'admin'
        }], { onConflict: ['id'] });

      if (perfilError) throw perfilError;

      alert('Empresa e Administrador cadastrados com sucesso! Faça o login.');
      setModoCadastroEmpresa(false);
    } catch (err) {
      setErro(err.message || 'Erro ao realizar cadastro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4 font-sans text-gray-800">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <span className="text-3xl">💼</span>
          <h1 className="text-xl font-bold text-gray-800">Gestão de Despesas</h1>
          <p className="text-xs text-gray-500">
            {modoCadastroEmpresa ? 'Cadastre sua Empresa e Admin' : 'Acesse sua conta para continuar'}
          </p>
        </div>

        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">
            {erro}
          </div>
        )}

        {!modoCadastroEmpresa ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">E-mail</label>
              <input
                type="email"
                required
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Senha</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg shadow transition-colors disabled:bg-gray-400 text-sm"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

            <div className="text-center pt-2 border-t">
              <button
                type="button"
                onClick={() => setModoCadastroEmpresa(true)}
                className="text-xs text-blue-600 font-semibold hover:underline"
              >
                Não tem uma empresa cadastrada? Clique aqui
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleCadastrarEmpresaAdmin} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nome da Empresa</label>
              <input
                type="text"
                required
                placeholder="Minha Empresa Ltda"
                value={nomeEmpresa}
                onChange={(e) => setNomeEmpresa(e.target.value)}
                className="w-full p-2 border rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Seu Nome (Administrador)</label>
              <input
                type="text"
                required
                placeholder="João da Silva"
                value={nomeAdmin}
                onChange={(e) => setNomeAdmin(e.target.value)}
                className="w-full p-2 border rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">E-mail de Acesso</label>
              <input
                type="email"
                required
                placeholder="admin@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Senha</label>
              <input
                type="password"
                required
                placeholder="Mínimo 6 caracteres"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full p-2 border rounded-lg text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-4 rounded-lg shadow transition-colors disabled:bg-gray-400 text-sm mt-2"
            >
              {loading ? 'Cadastrando...' : 'Cadastrar Empresa e Admin'}
            </button>

            <div className="text-center pt-2 border-t">
              <button
                type="button"
                onClick={() => setModoCadastroEmpresa(false)}
                className="text-xs text-gray-600 font-semibold hover:underline"
              >
                Voltar para o Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}