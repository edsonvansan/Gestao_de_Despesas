import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function GestaoUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [nomeEdit, setNomeEdit] = useState('');

  const carregarUsuarios = async () => {
    setCarregando(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('nome', { ascending: true });

    if (error) {
      alert('Erro ao carregar usuários: ' + error.message);
    } else {
      setUsuarios(data || []);
    }
    setCarregando(false);
  };

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const salvarEdicao = async (id) => {
    const { error } = await supabase
      .from('profiles')
      .update({ nome: nomeEdit })
      .eq('id', id);

    if (error) {
      alert('Erro ao atualizar: ' + error.message);
    } else {
      alert('Usuário atualizado com sucesso!');
      setUsuarioEditando(null);
      carregarUsuarios();
    }
  };

  const excluirUsuario = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este colaborador?')) return;

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Erro ao excluir: ' + error.message);
    } else {
      alert('Colaborador removido com sucesso!');
      carregarUsuarios();
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Gerenciamento de Colaboradores</h2>
      
      {carregando ? (
        <p>Carregando usuários...</p>
      ) : (
        <table style={{ width: '100%', marginTop: '20px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f4f4f4', textAlign: 'left' }}>
              <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Nome</th>
              <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>E-mail</th>
              <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Função</th>
              <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((user) => (
              <tr key={user.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px' }}>
                  {usuarioEditando === user.id ? (
                    <input
                      type="text"
                      value={nomeEdit}
                      onChange={(e) => setNomeEdit(e.target.value)}
                    />
                  ) : (
                    user.nome
                  )}
                </td>
                <td style={{ padding: '10px' }}>{user.email}</td>
                <td style={{ padding: '10px' }}>{user.funcao}</td>
                <td style={{ padding: '10px' }}>
                  {usuarioEditando === user.id ? (
                    <button onClick={() => salvarEdicao(user.id)} style={{ marginRight: '5px' }}>Salvar</button>
                  ) : (
                    <button onClick={() => { setUsuarioEditando(user.id); setNomeEdit(user.nome); }} style={{ marginRight: '5px' }}>Alterar</button>
                  )}
                  <button onClick={() => excluirUsuario(user.id)} style={{ background: '#ff4d4d', color: '#fff', border: 'none', padding: '5px 10px', cursor: 'pointer' }}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}