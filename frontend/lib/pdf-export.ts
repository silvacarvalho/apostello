import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface LogAtividade {
  id: string
  acao: string
  tipo_entidade: string
  entidade_id?: string
  detalhes?: any
  ip_address?: string
  user_agent?: string
  created_at: string
}

export function exportarAtividadesPDF(
  atividades: LogAtividade[],
  nomeUsuario: string,
  filtroAcao: string = 'todos'
) {
  // Criar novo documento PDF
  const doc = new jsPDF()

  // Configurar fonte
  doc.setFont('helvetica')

  // Cabeçalho
  doc.setFontSize(20)
  doc.setTextColor(37, 99, 235) // Blue
  doc.text('Apostello - Sistema de Escalas IASD', 14, 20)

  doc.setFontSize(16)
  doc.setTextColor(0, 0, 0)
  doc.text('Histórico de Atividades', 14, 30)

  // Informações do relatório
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`Usuário: ${nomeUsuario}`, 14, 40)
  doc.text(`Data de exportação: ${new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`, 14, 45)

  if (filtroAcao !== 'todos') {
    doc.text(`Filtro: ${getAcaoLabel(filtroAcao)}`, 14, 50)
  }

  doc.text(`Total de registros: ${atividades.length}`, 14, filtroAcao !== 'todos' ? 55 : 50)

  // Preparar dados da tabela
  const tableData = atividades.map(atividade => {
    const descricao = getActionDescription(atividade.acao, atividade.tipo_entidade, atividade.detalhes)
    return [
      formatarData(atividade.created_at),
      getAcaoLabel(atividade.acao),
      descricao,
      atividade.ip_address || '-'
    ]
  })

  // Criar tabela
  autoTable(doc, {
    head: [['Data/Hora', 'Ação', 'Descrição', 'IP']],
    body: tableData,
    startY: filtroAcao !== 'todas' ? 60 : 55,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [37, 99, 235], // Blue
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    columnStyles: {
      0: { cellWidth: 35 },  // Data/Hora
      1: { cellWidth: 25 },  // Ação
      2: { cellWidth: 90 },  // Descrição
      3: { cellWidth: 30 },  // IP
    },
  })

  // Rodapé
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    )
  }

  // Salvar PDF
  const nomeArquivo = `atividades_${nomeUsuario.replace(/\s+/g, '_')}_${
    new Date().toISOString().split('T')[0]
  }.pdf`

  doc.save(nomeArquivo)
}

function formatarData(dataString: string): string {
  const data = new Date(dataString)
  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getAcaoLabel(acao: string): string {
  const acoes: Record<string, string> = {
    'criar': 'Criação',
    'cadastrar': 'Cadastro',
    'editar': 'Edição',
    'atualizar': 'Atualização',
    'excluir': 'Exclusão',
    'deletar': 'Exclusão',
    'login': 'Login',
    'logout': 'Logout',
    'visualizar': 'Visualização',
    'exportar': 'Exportação',
    'todos': 'Todas as ações'
  }
  return acoes[acao.toLowerCase()] || acao
}

function getActionDescription(acao: string, entidade: string, detalhes?: any): string {
  const acaoMap: Record<string, string> = {
    'criar': 'criou',
    'cadastrar': 'cadastrou',
    'editar': 'editou',
    'atualizar': 'atualizou',
    'excluir': 'excluiu',
    'deletar': 'deletou',
    'login': 'fez login',
    'logout': 'fez logout',
    'visualizar': 'visualizou',
    'exportar': 'exportou'
  }

  const acaoFormatada = acaoMap[acao.toLowerCase()] || acao
  const entidadeMap: Record<string, string> = {
    'usuario': 'usuário',
    'igreja': 'igreja',
    'distrito': 'distrito',
    'associacao': 'associação',
    'pregacao': 'pregação',
    'avaliacao': 'avaliação',
    'tematica': 'temática',
    'escala': 'escala',
    'membro': 'membro'
  }

  const entidadeFormatada = entidadeMap[entidade.toLowerCase()] || entidade
  let descricao = `${acaoFormatada} ${entidadeFormatada}`

  if (detalhes && typeof detalhes === 'string') {
    descricao += ` - ${detalhes}`
  }

  return descricao
}
