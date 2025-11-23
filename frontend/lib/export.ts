// Funções para exportação de dados

export function exportToExcel(data: any[], filename: string, sheetName: string = 'Dados') {
  // Criar cabeçalhos
  const headers = Object.keys(data[0] || {})

  // Criar CSV
  let csv = headers.join(',') + '\n'

  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header]
      // Escapar vírgulas e aspas
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value ?? ''
    })
    csv += values.join(',') + '\n'
  })

  // Criar blob e download
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

export function exportToPDF(
  title: string,
  data: any[],
  columns: { key: string; label: string }[],
  filename: string
) {
  // Criar HTML para impressão
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 1cm;
        }
        body {
          font-family: Arial, sans-serif;
          font-size: 12px;
        }
        h1 {
          text-align: center;
          color: #333;
          margin-bottom: 20px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #4CAF50;
          color: white;
          font-weight: bold;
        }
        tr:nth-child(even) {
          background-color: #f2f2f2;
        }
        .footer {
          margin-top: 20px;
          text-align: center;
          font-size: 10px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <table>
        <thead>
          <tr>
            ${columns.map(col => `<th>${col.label}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>
              ${columns.map(col => `<td>${row[col.key] ?? ''}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="footer">
        <p>Gerado em ${new Date().toLocaleString('pt-BR')}</p>
        <p>Sistema de Gestão de Pregações - Apostello</p>
      </div>
    </body>
    </html>
  `

  // Abrir em nova janela e imprimir
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    printWindow.onload = () => {
      printWindow.print()
      // Opcional: fechar após impressão
      // printWindow.onafterprint = () => printWindow.close()
    }
  }
}

export function downloadJSON(data: any, filename: string) {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}.json`
  link.click()
  URL.revokeObjectURL(link.href)
}

// Helpers para formatar dados antes de exportar
export function formatDataForExport(data: any[], mappings: Record<string, string>) {
  return data.map(item => {
    const formatted: any = {}
    Object.entries(mappings).forEach(([key, label]) => {
      const value = key.split('.').reduce((obj, k) => obj?.[k], item)
      formatted[label] = value
    })
    return formatted
  })
}

// Exemplo de uso:
// const mappings = {
//   'nome_completo': 'Nome',
//   'email': 'E-mail',
//   'igreja.nome': 'Igreja',
//   'created_at': 'Data de Cadastro'
// }
// const formattedData = formatDataForExport(membros, mappings)
// exportToExcel(formattedData, 'membros', 'Lista de Membros')
