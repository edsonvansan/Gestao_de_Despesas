import * as XLSX from 'xlsx';

export function exportarParaExcel(despesasFiltradas, dataHoje) {
  const dadosFormatados = despesasFiltradas.map((item) => ({
    'Data': item.data || '',
    'Viagem': item.viagemNome || 'Sem Viagem',
    'Categoria': item.categoria || '',
    'Descrição': item.descricao || '',
    'Forma de Pagamento': item.formaPagamento || '',
    'Valor (R$)': parseFloat(item.valor) || 0,
    'Comprovante': item.comprovante ? item.comprovante : ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(dadosFormatados);

  worksheet['!cols'] = [
    { wch: 12 }, { wch: 25 }, { wch: 18 }, 
    { wch: 35 }, { wch: 20 }, { wch: 15 }, { wch: 45 }
  ];

// Aplica o link usando a propriedade nativa do SheetJS
despesasFiltradas.forEach((item, index) => {
  const rowIndex = index + 2;
  const cellAddress = `G${rowIndex}`;

  if (item.comprovante && worksheet[cellAddress]) {
    // 1. Mantém o texto que você quer exibir
    worksheet[cellAddress].v = 'Visualizar Comprovante';
    
    // 2. Adiciona o hiperlink corretamente como um objeto de link
    worksheet[cellAddress].l = { Target: item.comprovante };
  }
});

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Despesas');

  const nomeArquivo = `Relatorio_Despesas_${dataHoje}.xlsx`;

  try {
    // Utiliza o método nativo seguro do SheetJS para download direto no navegador mobile
    XLSX.writeFile(workbook, nomeArquivo);
  } catch (err) {
    console.error('Erro ao exportar:', err);
    alert('Erro ao gerar a planilha.');
  }
}