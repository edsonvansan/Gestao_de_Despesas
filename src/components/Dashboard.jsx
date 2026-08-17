import React from 'react'
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend
} from 'recharts'

const CORES = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

export default function Dashboard({ despesas = [], viagens = [] }) {
  // 1. Totalizadores
  const totalGasto = despesas.reduce((acc, d) => acc + Number(d.valor || 0), 0)
  const totalViagens = viagens.length

  // 2. Agrupar gastos por Categoria (para o gráfico de Pizza)
  const dadosCategoria = Object.values(
    despesas.reduce((acc, d) => {
      const cat = d.categoria || 'Outros'
      if (!acc[cat]) acc[cat] = { name: cat, value: 0 }
      acc[cat].value += Number(d.valor || 0)
      return acc
    }, {})
  )

  // 3. Agrupar gastos por Viagem (para o gráfico de Barras)
  const dadosViagem = viagens.map(v => {
    const total = despesas
      .filter(d => Number(d.viagem_id) === Number(v.id))
      .reduce((acc, d) => acc + Number(d.valor || 0), 0)
    return { name: v.nome, Total: total }
  })

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>📊 Resumo Financeiro</h2>

      {/* Cards de Métricas */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
        <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', flex: 1, backgroundColor: '#f9f9f9' }}>
          <small style={{ color: '#666' }}>Total de Gastos</small>
          <h3 style={{ margin: '10px 0 0', color: '#2e7d32' }}>
            R$ {totalGasto.toFixed(2)}
          </h3>
        </div>
        <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', flex: 1, backgroundColor: '#f9f9f9' }}>
          <small style={{ color: '#666' }}>Total de Viagens/Projetos</small>
          <h3 style={{ margin: '10px 0 0', color: '#1565c0' }}>
            {totalViagens}
          </h3>
        </div>
      </div>

      {/* Gráficos */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px' }}>
        {/* Gráfico de Categoria (Pizza) */}
        <div style={{ flex: '1 1 300px', minHeight: '300px', border: '1px solid #eee', padding: '15px', borderRadius: '8px' }}>
          <h4>Gastos por Categoria</h4>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={dadosCategoria}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              >
                {dadosCategoria.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico por Viagem (Barras) */}
        <div style={{ flex: '1 1 400px', minHeight: '300px', border: '1px solid #eee', padding: '15px', borderRadius: '8px' }}>
          <h4>Gastos por Viagem / Projeto</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dadosViagem}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
              <Legend />
              <Bar dataKey="Total" fill="#1565c0" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}