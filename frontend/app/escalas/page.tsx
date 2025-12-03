'use client'

import { useState, useEffect } from 'react'
import { Calendar, Plus, Download, Users, Clock, MapPin, Check, X, Eye, AlertCircle, UserPlus, RefreshCw } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog'
import { useAuth } from '@/lib/auth'
import { escalasApi, pregacoesApi, distritosApi, pregadoresApi, igrejasApi } from '@/lib/api'
import { formatDate, getDayOfWeek } from '@/lib/utils'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface Escala {
  id: string
  codigo: number
  distrito_id: string
  mes_referencia: number
  ano_referencia: number
  status: string
  observacoes?: string
  criado_em: string
  aprovado_em?: string
  finalizado_em?: string
}

interface Pregacao {
  id: string
  codigo: number
  escala_id: string
  igreja_id: string
  pregador_id: string
  tematica_id?: string
  data_pregacao: string
  horario_pregacao: string
  nome_culto: string
  status: string
  aceito_em?: string
  recusado_em?: string
  motivo_recusa?: string
  igreja?: { id: string; nome: string }
  pregador?: { id: string; nome_completo: string }
  tematica?: { id: string; titulo: string }
}

interface Distrito {
  id: string
  nome: string
}

interface Pregador {
  id: string
  nome_completo: string
  score_medio?: number | null
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'rascunho': return 'outline'
    case 'aprovado': return 'secondary'
    case 'finalizado': return 'default'
    default: return 'outline'
  }
}

function getPregacaoStatusBadgeVariant(status: string) {
  switch (status) {
    case 'agendado': return 'outline'
    case 'aceito': return 'default'
    case 'recusado': return 'destructive'
    case 'realizado': return 'secondary'
    case 'cancelado': return 'destructive'
    default: return 'outline'
  }
}

export default function EscalasPage() {
  const { user } = useAuth()
  
  const canManage = user?.perfis?.some(p => ['membro_associacao', 'pastor_distrital', 'lider_distrital'].includes(p)) ?? false
  const isPregador = user?.perfis?.includes('pregador') ?? false
  
  const [escalas, setEscalas] = useState<Escala[]>([])
  const [pregacoes, setPregacoes] = useState<Pregacao[]>([])
  const [distritos, setDistritos] = useState<Distrito[]>([])
  const [loading, setLoading] = useState(true)
  
  const [gerarDialogOpen, setGerarDialogOpen] = useState(false)
  
  // Calcular próximo mês corretamente (considerando virada de ano)
  const calcularProximoMes = () => {
    const hoje = new Date()
    const mesAtual = hoje.getMonth() + 1 // getMonth() retorna 0-11, converter para 1-12
    const anoAtual = hoje.getFullYear()
    
    // Próximo mês
    if (mesAtual === 12) {
      return { mes: 1, ano: anoAtual + 1 }
    } else {
      return { mes: mesAtual + 1, ano: anoAtual }
    }
  }
  
  const proximoMes = calcularProximoMes()
  
  const [gerarForm, setGerarForm] = useState({
    distrito_id: user?.distrito_id || '',
    mes_referencia: proximoMes.mes,
    ano_referencia: proximoMes.ano
  })
  const [gerarLoading, setGerarLoading] = useState(false)
  const [gerarError, setGerarError] = useState('')
  
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedEscala, setSelectedEscala] = useState<Escala | null>(null)
  const [escalaPregacoes, setEscalaPregacoes] = useState<Pregacao[]>([])
  const [viewLoading, setViewLoading] = useState(false)
  const [viewIgrejas, setViewIgrejas] = useState<Igreja[]>([])
  const [viewIgrejaFilter, setViewIgrejaFilter] = useState<string>('')
  const [viewBulkLoading, setViewBulkLoading] = useState(false)

  const [responderDialogOpen, setResponderDialogOpen] = useState(false)
  const [pregacaoParaResponder, setPregacaoParaResponder] = useState<Pregacao | null>(null)
  const [motivoRecusa, setMotivoRecusa] = useState('')
  const [responderLoading, setResponderLoading] = useState(false)

  // Estados para atribuição de pregador
  const [atribuirDialogOpen, setAtribuirDialogOpen] = useState(false)
  const [pregacaoParaAtribuir, setPregacaoParaAtribuir] = useState<Pregacao | null>(null)
  const [pregadores, setPregadores] = useState<Pregador[]>([])
  const [pregadorSelecionado, setPregadorSelecionado] = useState('')
  const [searchPregador, setSearchPregador] = useState('')
  const [showPregadorDropdown, setShowPregadorDropdown] = useState(false)
  const [atribuirLoading, setAtribuirLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [user])

  async function loadData() {
    try {
      setLoading(true)
      
      const distritosData = await distritosApi.listar()
      setDistritos(distritosData)
      
      let escalasData: Escala[] = []
      if (user?.perfis?.includes('membro_associacao')) {
        escalasData = await escalasApi.listar()
      } else if (user?.distrito_id) {
        escalasData = await escalasApi.listar(user.distrito_id)
        setGerarForm(prev => ({ ...prev, distrito_id: user.distrito_id! }))
      }
      setEscalas(escalasData)
      
      if (isPregador && user?.id) {
        const pregacoesData = await pregacoesApi.listar(undefined, user.id)
        setPregacoes(pregacoesData)
      }
      
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleGerarEscala() {
    // Usar distrito do usuário se não houver distrito selecionado
    const distritoId = gerarForm.distrito_id || user?.distrito_id
    
    if (!distritoId) {
      setGerarError('Selecione um distrito')
      return
    }
    
    try {
      setGerarLoading(true)
      setGerarError('')
      
      const response = await escalasApi.gerar({
        distrito_id: distritoId,
        mes_referencia: gerarForm.mes_referencia,
        ano_referencia: gerarForm.ano_referencia
      })
      
      // Mostrar relatório de geração
      if (response.relatorio) {
        const { relatorio } = response
        let mensagem = `✅ Escala gerada com sucesso!\n\n`
        mensagem += `📊 RESUMO:\n`
        mensagem += `• Total de igrejas: ${relatorio.total_igrejas}\n`
        mensagem += `• Pregações criadas: ${relatorio.total_pregacoes}\n`
        
        if (relatorio.total_horarios_sem_pregador > 0) {
          mensagem += `• ⚠️ Horários sem pregador: ${relatorio.total_horarios_sem_pregador}\n`
        }
        
        if (relatorio.igrejas_sem_pregacao?.length > 0) {
          mensagem += `\n⚠️ IGREJAS SEM PREGAÇÃO:\n`
          relatorio.igrejas_sem_pregacao.forEach((igreja: string) => {
            mensagem += `  • ${igreja}\n`
          })
        }
        
        mensagem += `\n📋 DETALHES POR IGREJA:\n`
        relatorio.estatisticas_por_igreja?.forEach((stat: any) => {
          mensagem += `  • ${stat.igreja_nome}: ${stat.pregacoes_criadas} pregação(ões)`
          if (stat.horarios_sem_pregador > 0) {
            mensagem += ` (${stat.horarios_sem_pregador} horários não preenchidos)`
          }
          mensagem += `\n`
        })
        
        alert(mensagem)
      }
      
      await loadData()
      setGerarDialogOpen(false)
      
      // Recalcular próximo mês após gerar
      const novoProximoMes = calcularProximoMes()
      setGerarForm({
        distrito_id: user?.distrito_id || '',
        mes_referencia: novoProximoMes.mes,
        ano_referencia: novoProximoMes.ano
      })
      
    } catch (err: any) {
      console.error('Erro ao gerar escala:', err)
      
      // Extrair mensagem de erro detalhada
      let errorMessage = 'Erro ao gerar escala'
      
      if (err.response?.data) {
        // Se o backend retornou um objeto de erro estruturado
        if (typeof err.response.data === 'string') {
          errorMessage = err.response.data
        } else if (err.response.data.detail) {
          // FastAPI retorna erros em detail
          if (typeof err.response.data.detail === 'string') {
            errorMessage = err.response.data.detail
          } else if (Array.isArray(err.response.data.detail)) {
            // Erros de validação do Pydantic
            errorMessage = err.response.data.detail.map((e: any) => 
              `${e.loc?.join(' > ') || 'Erro'}: ${e.msg}`
            ).join('\n')
          }
        } else if (err.response.data.message) {
          errorMessage = err.response.data.message
        }
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setGerarError(errorMessage)
    } finally {
      setGerarLoading(false)
    }
  }

  async function handleViewEscala(escala: Escala) {
    setSelectedEscala(escala)
    setViewDialogOpen(true)
    setViewLoading(true)
    
    try {
      const pregacoesData = await pregacoesApi.listar(escala.id)
      setEscalaPregacoes(pregacoesData)

      // Carregar igrejas do distrito para filtro
      const igrejasData = await igrejasApi.listar(escala.distrito_id)
      setViewIgrejas(igrejasData)
      setViewIgrejaFilter('')
    } catch (err) {
      console.error('Erro ao carregar pregações:', err)
    } finally {
      setViewLoading(false)
    }
  }

  async function handleAprovarPorIgreja() {
    if (!selectedEscala || !viewIgrejaFilter) return
    try {
      setViewBulkLoading(true)
      const alvo = escalaPregacoes.filter(p => p.igreja_id === viewIgrejaFilter)
      for (const p of alvo) {
        await pregacoesApi.atualizar(p.id, { status: 'agendado' })
      }
      // Recarregar lista
      const pregacoesData = await pregacoesApi.listar(selectedEscala.id)
      setEscalaPregacoes(pregacoesData)
    } catch (err) {
      console.error('Erro ao aprovar por igreja:', err)
      alert('Erro ao aprovar pregações da igreja')
    } finally {
      setViewBulkLoading(false)
    }
  }

  async function handleCancelarPorIgreja() {
    if (!selectedEscala || !viewIgrejaFilter) return
    try {
      setViewBulkLoading(true)
      const alvo = escalaPregacoes.filter(p => p.igreja_id === viewIgrejaFilter)
      for (const p of alvo) {
        await pregacoesApi.atualizar(p.id, { status: 'cancelado' })
      }
      const pregacoesData = await pregacoesApi.listar(selectedEscala.id)
      setEscalaPregacoes(pregacoesData)
    } catch (err) {
      console.error('Erro ao cancelar por igreja:', err)
      alert('Erro ao cancelar pregações da igreja')
    } finally {
      setViewBulkLoading(false)
    }
  }

  async function handleAprovarEscala(escalaId: string) {
    try {
      await escalasApi.aprovar(escalaId)
      await loadData()
      if (selectedEscala?.id === escalaId) {
        setSelectedEscala(prev => prev ? { ...prev, status: 'aprovado' } : null)
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao aprovar escala')
    }
  }

  async function handleFinalizarEscala(escalaId: string) {
    try {
      await escalasApi.finalizar(escalaId)
      await loadData()
      if (selectedEscala?.id === escalaId) {
        setSelectedEscala(prev => prev ? { ...prev, status: 'finalizado' } : null)
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao finalizar escala')
    }
  }

  function handleOpenResponderDialog(pregacao: Pregacao) {
    setPregacaoParaResponder(pregacao)
    setMotivoRecusa('')
    setResponderDialogOpen(true)
  }

  async function handleResponderPregacao(aceitar: boolean) {
    if (!pregacaoParaResponder) return
    
    try {
      setResponderLoading(true)
      await pregacoesApi.responder(pregacaoParaResponder.id, aceitar, aceitar ? undefined : motivoRecusa)
      await loadData()
      setResponderDialogOpen(false)
      setPregacaoParaResponder(null)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao responder pregação')
    } finally {
      setResponderLoading(false)
    }
  }

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement
      if (!target.closest('.relative')) {
        setShowPregadorDropdown(false)
      }
    }
    
    if (showPregadorDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showPregadorDropdown])

  async function handleOpenAtribuirDialog(pregacao: Pregacao) {
    setPregacaoParaAtribuir(pregacao)
    setPregadorSelecionado(pregacao.pregador_id || '')
    setSearchPregador('')
    setShowPregadorDropdown(false)
    setAtribuirDialogOpen(true)
    
    try {
      const pregadoresData = await pregadoresApi.listar()
      
      if (Array.isArray(pregadoresData)) {
        // Usar usuario_id que é o campo correto retornado pela API
        const pregadoresProcessados = pregadoresData
          .filter(pregador => pregador.usuario_id)
          .map(pregador => ({
            id: String(pregador.usuario_id),
            nome_completo: pregador.nome_completo || '',
            score_medio: pregador.score_medio ? Number(pregador.score_medio) : null
          }))
        setPregadores(pregadoresProcessados)
      } else {
        setPregadores([])
      }
    } catch (err: any) {
      console.error('Erro ao carregar pregadores:', err)
      setPregadores([])
      
      if (!err.response) {
        alert('Erro de conexão: Verifique se o backend está rodando na porta 8000')
      } else {
        const status = err.response.status
        switch (status) {
          case 404:
            alert('Funcionalidade não encontrada no servidor')
            break
          case 403:
            alert('Sem permissão para carregar pregadores')
            break
          case 401:
            alert('Sessão expirada. Faça login novamente.')
            break
          case 500:
            alert('Erro interno do servidor')
            break
          default:
            alert(`Erro ${status}: ${err.response?.data?.detail || err.message}`)
        }
      }
    }
  }

  async function handleAtribuirPregador() {
    if (!pregacaoParaAtribuir || !pregadorSelecionado) {
      alert('Selecione um pregador antes de confirmar')
      return
    }
    
    console.log('Tentando atribuir pregador:', {
      pregacao_id: pregacaoParaAtribuir.id,
      pregador_id: pregadorSelecionado
    })
    
    try {
      setAtribuirLoading(true)
      
      // Teste de conectividade primeiro
      console.log('Testando conectividade...')
      const healthCheck = await fetch('http://localhost:8000/health')
      console.log('Health check:', healthCheck.ok)
      
      if (!healthCheck.ok) {
        throw new Error('Backend não está acessível')
      }
      
      console.log('Fazendo requisição para atribuir pregador...')
      console.log('URL será:', `http://localhost:8000/api/v1/pregacoes/${pregacaoParaAtribuir.id}/atribuir-pregador`)
      
      await pregacoesApi.atribuirPregador(pregacaoParaAtribuir.id, pregadorSelecionado)
      console.log('Pregador atribuído com sucesso!')
      
      // Atualizar lista de pregações da escala se estiver visualizando
      if (selectedEscala) {
        const pregacoesData = await pregacoesApi.listar(selectedEscala.id)
        setEscalaPregacoes(pregacoesData)
      }
      
      setAtribuirDialogOpen(false)
      setPregacaoParaAtribuir(null)
      setPregadorSelecionado('')
      setSearchPregador('')
      setShowPregadorDropdown(false)
      alert('Pregador atribuído com sucesso!')
    } catch (err: any) {
      console.error('Erro ao atribuir pregador:', err)
      console.error('Detalhes do erro:', {
        message: err.message,
        code: err.code,
        name: err.name,
        config: err.config?.url,
        status: err.response?.status
      })
      
      if (err.code === 'ERR_NETWORK') {
        alert('Erro de conexão com o servidor. Verifique se o backend está rodando.')
      } else {
        alert(err.response?.data?.detail || err.message || 'Erro ao atribuir pregador')
      }
    } finally {
      setAtribuirLoading(false)
    }
  }

  async function handleExportarPDF(escalaId: string) {
    try {
      // Buscar pregações da escala
      const pregacoesData = await pregacoesApi.listar(escalaId)
      const escala = escalas.find(e => e.id === escalaId)
      const distrito = distritos.find(d => d.id === escala?.distrito_id)
      
      if (!escala || pregacoesData.length === 0) {
        alert('Nenhuma pregação encontrada para exportar')
        return
      }

      // Criar PDF em paisagem para caber mais informações
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })

      
      // CABEÇALHO RESUMO GERAL
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      const pageWidth = doc.internal.pageSize.getWidth()
      doc.text(`Escala de Pregação - ${MESES[escala.mes_referencia - 1]} ${escala.ano_referencia}`, pageWidth / 2, 15, { align: 'center' })
      
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text(`Distrito: ${distrito?.nome || 'Distrito não identificado'} | Status: ${escala.status.charAt(0).toUpperCase() + escala.status.slice(1)}`, pageWidth / 2, 20, { align: 'center' })
      
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Resumo Geral do Distrito', pageWidth / 2, 27, { align: 'center' })
      // FIM CABEÇALHO RESUMO GERAL

      // Agrupar pregações por igreja
      const pregacoesPorIgreja: Record<string, typeof pregacoesData> = {}
      pregacoesData.forEach((p: Pregacao) => {
        const igrejaNome = p.igreja?.nome || 'Igreja não identificada'
        if (!pregacoesPorIgreja[igrejaNome]) {
          pregacoesPorIgreja[igrejaNome] = []
        }
        pregacoesPorIgreja[igrejaNome].push(p)
      })

      // PRIMEIRA PÁGINA: Visão geral consolidada de todas as igrejas

      // Ordenar todas as pregações por data
      const todasPregacoes = pregacoesData
        .slice()
        .sort((a, b) => new Date(a.data_pregacao).getTime() - new Date(b.data_pregacao).getTime())

      // Obter lista única de datas e igrejas
      const datasUnicas = [...new Set(todasPregacoes.map(p => p.data_pregacao))]
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      
      const igrejasUnicas = Object.keys(pregacoesPorIgreja).sort()
      const numIgrejas = igrejasUnicas.length

      // Detectar se há muitas igrejas para o layout matriz
      const larguraDisponivel = 277 - 38 // largura A4 landscape menos margens e colunas fixas
      const larguraMinimaPorIgreja = 25
      const maxIgrejasMatriz = Math.floor(larguraDisponivel / larguraMinimaPorIgreja)

      if (numIgrejas <= maxIgrejasMatriz) {
        // LAYOUT MATRIZ - Para distritos com até ~9 igrejas
        const matrixData = datasUnicas.map(data => {
          const dataObj = new Date(data)
          const diaSemana = getDayOfWeek(data)
          const linha = [
            `${dataObj.getDate().toString().padStart(2, '0')}/${(dataObj.getMonth() + 1).toString().padStart(2, '0')}`,
            diaSemana.substring(0, 3)
          ]
          
          // Para cada igreja, encontrar o pregador dessa data
          igrejasUnicas.forEach(igreja => {
            const pregacaoNaData = todasPregacoes.find(p => 
              p.data_pregacao === data && p.igreja?.nome === igreja
            )
            const pregador = pregacaoNaData?.pregador?.nome_completo || '-'
            linha.push(pregador === 'Não atribuído' ? '-' : pregador)
          })
          
          return linha
        })

        // Cabeçalho da tabela: Data, Dia + todas as igrejas
        const headers = ['Data', 'Dia', ...igrejasUnicas]
        const larguraIgreja = larguraDisponivel / numIgrejas

        // Configurar estilos apenas para as colunas que existem
        const columnStyles: any = {}
        
        // Configurar cada coluna individualmente
        for (let i = 0; i < headers.length; i++) {
          if (i === 0) {
            columnStyles[i] = { cellWidth: 20, halign: 'center', fontSize: 7 } // Data
          } else if (i === 1) {
            columnStyles[i] = { cellWidth: 18, halign: 'center', fontSize: 7 } // Dia
          } else {
            columnStyles[i] = { 
              cellWidth: larguraIgreja, 
              halign: 'center',
              fontSize: 7,
              overflow: 'linebreak'
            }
          }
        }

        autoTable(doc, {
          head: [headers],
          body: matrixData,
          startY: 38,
          theme: 'striped',
          styles: {
            fontSize: 7,
            cellPadding: 1,
            lineWidth: 0.1,
            overflow: 'linebreak',
            cellWidth: 'wrap'
          },
          headStyles: {
            fillColor: [59, 130, 246],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 7,
            halign: 'center'
          },
          columnStyles: columnStyles,
          margin: { left: 14, right: 14 },
          alternateRowStyles: {
            fillColor: [248, 249, 250]
          },
          tableLineWidth: 0.1,
          tableLineColor: [200, 200, 200],
          tableWidth: 'wrap',
          showHead: 'everyPage',
          pageBreak: 'auto'
        })

        // INFORMAÇÕES DO DISTRITO - MATRIZ SIMPLES
        const finalYSimples = (doc as any).lastAutoTable.finalY + 5
        
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.text('Informações do Distrito:', 14, finalYSimples)
        
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        
        const totalPregacoes = todasPregacoes.length
        const totalConfirmadas = todasPregacoes.filter(p => p.status === 'aceito').length
        const totalPregadores = new Set(todasPregacoes.filter(p => p.pregador).map(p => p.pregador!.nome_completo)).size
        
        const infoTextos = [
          `Total: ${numIgrejas} igrejas | ${totalPregacoes} pregações | ${totalConfirmadas} confirmadas | ${totalPregadores} pregadores`
        ]
        
        infoTextos.forEach((texto, idx) => {
          doc.text(texto, 14, finalYSimples + 4 + (idx * 4))
        })

      } else {
        // LAYOUT MATRIZ PAGINADO - Para distritos com muitas igrejas
        
        // Dividir igrejas em grupos que cabem na página
        const igrejasGrupos: string[][] = []
        for (let i = 0; i < igrejasUnicas.length; i += maxIgrejasMatriz) {
          igrejasGrupos.push(igrejasUnicas.slice(i, i + maxIgrejasMatriz))
        }

        // Processar grupos em pares (2 matrizes por página)
        for (let pairIndex = 0; pairIndex < igrejasGrupos.length; pairIndex += 2) {
          const isFirstPair = pairIndex === 0
          
          if (!isFirstPair) {
            doc.addPage()
            
            // CABEÇALHO RESUMO GERAL PARA PÁGINAS DUPLAS
            doc.setFontSize(16)
            doc.setFont('helvetica', 'bold')
            const pageWidth = doc.internal.pageSize.getWidth()
            doc.text(`Escala de Pregação - ${MESES[escala.mes_referencia - 1]} ${escala.ano_referencia}`, pageWidth / 2, 15, { align: 'center' })
            
            doc.setFontSize(12)
            doc.setFont('helvetica', 'normal')
            doc.text(`Distrito: ${distrito?.nome || 'Distrito não identificado'} | Status: ${escala.status.charAt(0).toUpperCase() + escala.status.slice(1)}`, pageWidth / 2, 20, { align: 'center' })
            
            doc.setFontSize(14)
            doc.setFont('helvetica', 'bold')
            doc.text('Resumo Geral do Distrito', pageWidth / 2, 27, { align: 'center' })
            // FIM CABEÇALHO RESUMO GERAL
          }

          // Primeira matriz do par
          const primeiroGrupo = igrejasGrupos[pairIndex]
          const segundoGrupo = igrejasGrupos[pairIndex + 1] || null

          // PRIMEIRA MATRIZ (superior)
          let startY = isFirstPair ? 30 : 32
          
          doc.setFontSize(10)
          doc.setFont('helvetica', 'bold')
          doc.text(`Grupo ${pairIndex + 1}:`, 14, startY)

          const matrixData1 = datasUnicas.map(data => {
            const dataObj = new Date(data)
            const diaSemana = getDayOfWeek(data)
            const linha = [
              `${dataObj.getDate().toString().padStart(2, '0')}/${(dataObj.getMonth() + 1).toString().padStart(2, '0')}`,
              diaSemana.substring(0, 3)
            ]
            
            // Adicionar apenas as igrejas do grupo (sem coluna extra)
            primeiroGrupo.forEach(igreja => {
              const pregacaoNaData = todasPregacoes.find(p => 
                p.data_pregacao === data && p.igreja?.nome === igreja
              )
              const pregador = pregacaoNaData?.pregador?.nome_completo || '-'
              linha.push(pregador === 'Não atribuído' ? '-' : pregador)
            })
            
            return linha
          })

          // Cabeçalho: Data, Dia + apenas as igrejas do grupo
          const headers1 = ['Data', 'Dia', ...primeiroGrupo]
          const larguraIgrejaGrupo1 = larguraDisponivel / primeiroGrupo.length

          autoTable(doc, {
            head: [headers1],
            body: matrixData1,
            startY: startY + 1,
            theme: 'striped',
            styles: {
              fontSize: 6,
              cellPadding: 1,
              lineWidth: 0.05,
              overflow: 'linebreak',
              cellWidth: 'wrap'
            },
            headStyles: {
              fillColor: [34, 197, 94],
              textColor: 255,
              fontStyle: 'bold',
              fontSize: 6,
              halign: 'center'
            },
            columnStyles: {
              0: { cellWidth: 20, halign: 'center', fontSize: 6 },
              1: { cellWidth: 18, halign: 'center', fontSize: 6 },
              ...Object.fromEntries(primeiroGrupo.map((_, index) => [
                index + 2,
                { 
                  cellWidth: larguraIgrejaGrupo1, 
                  halign: 'center',
                  fontSize: 6,
                  overflow: 'linebreak'
                }
              ]))
            },
            margin: { left: 14, right: 14 },
            alternateRowStyles: {
              fillColor: [248, 249, 250]
            },
            tableLineWidth: 0.05,
            tableLineColor: [200, 200, 200],
            tableWidth: 'wrap'
          })

          // SEGUNDA MATRIZ (inferior) - se existir
          if (segundoGrupo) {
            const midY = (doc as any).lastAutoTable.finalY + 10
            
            doc.setFontSize(10)
            doc.setFont('helvetica', 'bold')
            doc.text(`Grupo ${pairIndex + 2}:`, 14, midY)

            const matrixData2 = datasUnicas.map(data => {
              const dataObj = new Date(data)
              const diaSemana = getDayOfWeek(data)
              const linha = [
                `${dataObj.getDate().toString().padStart(2, '0')}/${(dataObj.getMonth() + 1).toString().padStart(2, '0')}`,
                diaSemana.substring(0, 3)
              ]
              
              // Adicionar apenas as igrejas do grupo (sem coluna extra)
              segundoGrupo.forEach(igreja => {
                const pregacaoNaData = todasPregacoes.find(p => 
                  p.data_pregacao === data && p.igreja?.nome === igreja
                )
                const pregador = pregacaoNaData?.pregador?.nome_completo || '-'
                linha.push(pregador === 'Não atribuído' ? '-' : pregador)
              })
              
              return linha
            })

            // Cabeçalho: Data, Dia + apenas as igrejas do grupo
            const headers2 = ['Data', 'Dia', ...segundoGrupo]
            const larguraIgrejaGrupo2 = larguraDisponivel / segundoGrupo.length

            autoTable(doc, {
              head: [headers2],
              body: matrixData2,
              startY: midY + 1,
              theme: 'striped',
              styles: {
                fontSize: 6,
                cellPadding: 1,
                lineWidth: 0.05,
                overflow: 'linebreak',
                cellWidth: 'wrap'
              },
              headStyles: {
                fillColor: [147, 51, 234],
                textColor: 255,
                fontStyle: 'bold',
                fontSize: 6,
                halign: 'center'
              },
              columnStyles: {
                0: { cellWidth: 20, halign: 'center', fontSize: 6 },
                1: { cellWidth: 18, halign: 'center', fontSize: 6 },
                ...Object.fromEntries(segundoGrupo.map((_, index) => [
                  index + 2,
                  { 
                    cellWidth: larguraIgrejaGrupo2, 
                    halign: 'center',
                    fontSize: 6,
                    overflow: 'linebreak'
                  }
                ]))
              },
              margin: { left: 14, right: 14 },
              alternateRowStyles: {
                fillColor: [248, 249, 250]
              },
              tableLineWidth: 0.05,
              tableLineColor: [200, 200, 200],
              tableWidth: 'wrap'
            })
          }

          // INFORMAÇÕES DOS GRUPOS DA PÁGINA
          const finalYPair = (doc as any).lastAutoTable.finalY + 5
          
          doc.setFontSize(8)
          doc.setFont('helvetica', 'normal')
          
          // Calcular estatísticas dos grupos da página
          const gruposNaPagina = segundoGrupo ? [primeiroGrupo, segundoGrupo] : [primeiroGrupo]
          
          gruposNaPagina.forEach((grupo, idx) => {
            const pregacoesGrupo = todasPregacoes.filter(p => grupo.includes(p.igreja?.nome || ''))
            const confirmadas = pregacoesGrupo.filter(p => p.status === 'aceito').length
            const pregadores = new Set(pregacoesGrupo.filter(p => p.pregador).map(p => p.pregador!.nome_completo)).size
            
            const infoTexto = `Grupo ${pairIndex + idx + 1}: ${grupo.length} igrejas | ${pregacoesGrupo.length} pregações | ${confirmadas} confirmadas | ${pregadores} pregadores`
            doc.text(infoTexto, 14, finalYPair + 4 + (idx * 4))
          })
          
          // Se for a última página de resumo, adicionar totais
          const isUltimaPagina = pairIndex + 2 >= igrejasGrupos.length
          if (isUltimaPagina) {
            const totalPregacoes = todasPregacoes.length
            const totalConfirmadas = todasPregacoes.filter(p => p.status === 'aceito').length
            const totalPregadores = new Set(todasPregacoes.filter(p => p.pregador).map(p => p.pregador!.nome_completo)).size
            
            const yPosTotal = finalYPair + 4 + (gruposNaPagina.length * 4) + 6
            doc.setFont('helvetica', 'bold')
            doc.text('TOTAL DO DISTRITO:', 14, yPosTotal)
            doc.setFont('helvetica', 'normal')
            const totalTexto = `${numIgrejas} igrejas | ${totalPregacoes} pregações | ${totalConfirmadas} confirmadas | ${totalPregadores} pregadores`
            doc.text(totalTexto, 14, yPosTotal + 4)
          }
        }
      }

      // PÁGINAS SEGUINTES: Detalhes por igreja (uma igreja por página)
      Object.entries(pregacoesPorIgreja).forEach(([igrejaNome, pregacoesIgreja], index) => {
        // Nova página para cada igreja
        doc.addPage()

        // Ordenar pregações da igreja por data
        pregacoesIgreja.sort((a, b) => new Date(a.data_pregacao).getTime() - new Date(b.data_pregacao).getTime())

        // Cabeçalho da igreja
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.text(`${igrejaNome}`, 14, 20)
        
        doc.setFontSize(12)
        doc.setFont('helvetica', 'normal')
        doc.text(`${pregacoesIgreja.length} pregação(ões) programadas`, 14, 27)

        // Tabela detalhada da igreja
        const tableData = pregacoesIgreja.map((p: Pregacao) => {
          const data = new Date(p.data_pregacao)
          const diaSemana = getDayOfWeek(p.data_pregacao)
          return [
            `${data.getDate().toString().padStart(2, '0')}/${(data.getMonth() + 1).toString().padStart(2, '0')}`,
            diaSemana.substring(0, 3),
            p.horario_pregacao?.substring(0, 5) || '-',
            p.nome_culto || '-',
            p.pregador?.nome_completo || 'Não atribuído',
            p.tematica?.titulo || '-',
            p.status.charAt(0).toUpperCase() + p.status.slice(1)
          ]
        })

        autoTable(doc, {
          head: [['Data', 'Dia', 'Hora', 'Culto', 'Pregador', 'Temática', 'Status']],
          body: tableData,
          startY: 35,
          theme: 'grid',
          styles: {
            fontSize: 9,
            cellPadding: 3
          },
          headStyles: {
            fillColor: [34, 197, 94],
            textColor: 255,
            fontStyle: 'bold'
          },
          columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 'auto' },
            3: { cellWidth: 'auto' },
            4: { cellWidth: 'auto' },
            5: { cellWidth: 'auto' },
            6: { cellWidth: 'auto' }
          },
          margin: { left: 14, right: 14 },
          alternateRowStyles: {
            fillColor: [248, 250, 252]
          },
          tableWidth: 'auto'
        })

        // Adicionar informações estatísticas da igreja
        const finalY = (doc as any).lastAutoTable.finalY + 15
        if (finalY < 180) {
          doc.setFontSize(10)
          doc.setFont('helvetica', 'bold')
          doc.text('Estatísticas:', 14, finalY)
          
          doc.setFont('helvetica', 'normal')
          const stats = [
            `• Total de pregações: ${pregacoesIgreja.length}`,
            `• Pregações confirmadas: ${pregacoesIgreja.filter(p => p.status === 'aceito').length}`,
            `• Pregações pendentes: ${pregacoesIgreja.filter(p => p.status === 'agendado').length}`,
            `• Pregadores únicos: ${new Set(pregacoesIgreja.filter(p => p.pregador).map(p => p.pregador!.nome_completo)).size}`
          ]
          
          stats.forEach((stat, i) => {
            doc.text(stat, 14, finalY + 5 + (i * 5))
          })
        }
      })

      // Rodapé em todas as páginas
      const pageCount = doc.getNumberOfPages()
      const numPaginasResumo = numIgrejas <= maxIgrejasMatriz ? 1 : Math.ceil(igrejasUnicas.length / (maxIgrejasMatriz * 2))
      
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(120, 120, 120)
        
        const footerText = i <= numPaginasResumo
          ? `Resumo Geral - Gerado em ${formatDate(new Date().toISOString())} - Página ${i} de ${pageCount}`
          : `Detalhes por Igreja - Gerado em ${formatDate(new Date().toISOString())} - Página ${i} de ${pageCount}`
        
        doc.text(
          footerText,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        )
      }

      // Baixar
      doc.save(`escala-${MESES[escala.mes_referencia - 1].toLowerCase()}-${escala.ano_referencia}.pdf`)

    } catch (err) {
      console.error('Erro ao exportar PDF:', err)
      alert('Erro ao exportar PDF')
    }
  }

  const stats = {
    totalEscalas: escalas.length,
    escalasFinalizadas: escalas.filter(e => e.status === 'finalizado').length,
    pregacoesPendentes: pregacoes.filter(p => p.status === 'agendado').length,
    pregacoesAceitas: pregacoes.filter(p => p.status === 'aceito').length
  }

  const proximasPregacoes = pregacoes
    .filter(p => new Date(p.data_pregacao) >= new Date())
    .sort((a, b) => new Date(a.data_pregacao).getTime() - new Date(b.data_pregacao).getTime())
    .slice(0, 5)

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Escalas de Pregação</h1>
            <p className="text-muted-foreground">
              {canManage ? 'Gerencie e visualize as escalas de pregação' : 'Visualize suas próximas pregações'}
            </p>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => selectedEscala && handleExportarPDF(selectedEscala.id)}>
                <Download className="mr-2 h-4 w-4" />
                Exportar PDF
              </Button>
              <Button onClick={() => {
                // Garantir que o distrito está setado ao abrir o diálogo
                if (user?.distrito_id && !gerarForm.distrito_id) {
                  setGerarForm(prev => ({ ...prev, distrito_id: user.distrito_id! }))
                }
                setGerarDialogOpen(true)
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Gerar Escala
              </Button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {canManage ? 'Total de Escalas' : 'Minhas Pregações'}
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {canManage ? stats.totalEscalas : pregacoes.length}
              </div>
              <p className="text-xs text-muted-foreground">
                {canManage ? 'Escalas cadastradas' : 'Total agendadas'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {canManage ? 'Escalas Finalizadas' : 'Pendentes'}
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {canManage ? stats.escalasFinalizadas : stats.pregacoesPendentes}
              </div>
              <p className="text-xs text-muted-foreground">
                {canManage ? 'Escalas publicadas' : 'Aguardando confirmação'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {canManage ? 'Distritos' : 'Confirmadas'}
              </CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {canManage ? distritos.length : stats.pregacoesAceitas}
              </div>
              <p className="text-xs text-muted-foreground">
                {canManage ? 'Com escalas' : 'Pregações aceitas'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Próxima Pregação
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {proximasPregacoes.length > 0 ? (
                <>
                  <div className="text-2xl font-bold">
                    {new Date(proximasPregacoes[0].data_pregacao).getDate()}/{new Date(proximasPregacoes[0].data_pregacao).getMonth() + 1}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {proximasPregacoes[0].nome_culto}
                  </p>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold">-</div>
                  <p className="text-xs text-muted-foreground">Nenhuma agendada</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Lista de Escalas (para gestores) */}
        {canManage && (
          <Card>
            <CardHeader>
              <CardTitle>Escalas Mensais</CardTitle>
              <CardDescription>
                Visualize e gerencie as escalas de pregação por mês
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center p-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : escalas.length > 0 ? (
                <div className="space-y-4">
                  {escalas.map((escala) => {
                    const distrito = distritos.find(d => d.id === escala.distrito_id)
                    return (
                      <div
                        key={escala.id}
                        className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <p className="font-semibold">
                              {MESES[escala.mes_referencia - 1]} {escala.ano_referencia}
                            </p>
                            <Badge variant={getStatusBadgeVariant(escala.status)}>
                              {escala.status.charAt(0).toUpperCase() + escala.status.slice(1)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{distrito?.nome || 'Distrito não encontrado'}</span>
                            <span>•</span>
                            <span>Código: {escala.codigo}</span>
                            <span>•</span>
                            <span>Criada em {formatDate(escala.criado_em)}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleViewEscala(escala)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Visualizar
                          </Button>
                          {escala.status === 'rascunho' && (
                            <Button variant="outline" size="sm" onClick={() => handleAprovarEscala(escala.id)}>
                              <Check className="mr-2 h-4 w-4" />
                              Aprovar
                            </Button>
                          )}
                          {escala.status === 'aprovado' && (
                            <Button size="sm" onClick={() => handleFinalizarEscala(escala.id)}>
                              Finalizar
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={() => handleExportarPDF(escala.id)}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center p-12">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Nenhuma escala encontrada
                  </p>
                  <Button onClick={() => {
                    // Garantir que o distrito está setado ao abrir o diálogo
                    if (user?.distrito_id && !gerarForm.distrito_id) {
                      setGerarForm(prev => ({ ...prev, distrito_id: user.distrito_id! }))
                    }
                    setGerarDialogOpen(true)
                  }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Gerar Primeira Escala
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Próximas Pregações (para pregadores) */}
        {isPregador && (
          <Card>
            <CardHeader>
              <CardTitle>Minhas Próximas Pregações</CardTitle>
              <CardDescription>
                Pregações programadas para você
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center p-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : proximasPregacoes.length > 0 ? (
                <div className="space-y-4">
                  {proximasPregacoes.map((pregacao) => (
                    <div
                      key={pregacao.id}
                      className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                    >
                      <div className="flex items-start gap-4">
                        <div className="rounded-lg bg-primary/10 p-3 text-center min-w-[60px]">
                          <p className="text-2xl font-bold text-primary">
                            {new Date(pregacao.data_pregacao).getDate()}
                          </p>
                          <p className="text-xs text-muted-foreground uppercase">
                            {getDayOfWeek(pregacao.data_pregacao).substring(0, 3)}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="font-medium">{pregacao.nome_culto}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{pregacao.horario_pregacao?.substring(0, 5)}</span>
                            <span>•</span>
                            <MapPin className="h-3 w-3" />
                            <span>{pregacao.igreja?.nome || 'Igreja'}</span>
                          </div>
                          {pregacao.tematica && (
                            <div className="text-sm text-muted-foreground">
                              Temática: {pregacao.tematica.titulo}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={getPregacaoStatusBadgeVariant(pregacao.status)}>
                          {pregacao.status.charAt(0).toUpperCase() + pregacao.status.slice(1)}
                        </Badge>
                        {pregacao.status === 'agendado' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 hover:text-green-700"
                              onClick={() => {
                                setPregacaoParaResponder(pregacao)
                                handleResponderPregacao(true)
                              }}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleOpenResponderDialog(pregacao)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-12">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Você não tem pregações agendadas
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal: Gerar Escala */}
      <Dialog open={gerarDialogOpen} onOpenChange={setGerarDialogOpen}>
        <DialogContent>
          <DialogClose onClose={() => setGerarDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>Gerar Nova Escala</DialogTitle>
            <DialogDescription>
              Selecione o distrito e o período para gerar a escala automaticamente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {gerarError && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div className="whitespace-pre-wrap">{gerarError}</div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="distrito">Distrito *</Label>
              <Select
                id="distrito"
                value={gerarForm.distrito_id}
                onChange={(e) => setGerarForm({ ...gerarForm, distrito_id: e.target.value })}
                disabled={!!user?.distrito_id && !user?.perfis?.includes('membro_associacao')}
              >
                <option value="">Selecione um distrito</option>
                {distritos.map((distrito) => (
                  <option key={distrito.id} value={distrito.id}>
                    {distrito.nome}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mes">Mês *</Label>
                <Select
                  id="mes"
                  value={gerarForm.mes_referencia.toString()}
                  onChange={(e) => setGerarForm({ ...gerarForm, mes_referencia: parseInt(e.target.value) })}
                >
                  {MESES.map((mes, index) => (
                    <option key={index} value={index + 1}>
                      {mes}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ano">Ano *</Label>
                <Select
                  id="ano"
                  value={gerarForm.ano_referencia.toString()}
                  onChange={(e) => setGerarForm({ ...gerarForm, ano_referencia: parseInt(e.target.value) })}
                >
                  {(() => {
                    const anoAtual = new Date().getFullYear()
                    return [anoAtual, anoAtual + 1].map((ano) => (
                      <option key={ano} value={ano}>
                        {ano}
                      </option>
                    ))
                  })()}
                </Select>
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg text-sm space-y-2">
              <p className="font-medium">O algoritmo de geração considera:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Score dos pregadores (avaliações, frequência, pontualidade)</li>
                <li>Períodos de indisponibilidade cadastrados</li>
                <li>Limite máximo de pregações por mês de cada pregador</li>
                <li>Prioridade: Sábados → Domingos → Quartas</li>
                <li>Horários de culto configurados para cada igreja</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setGerarDialogOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleGerarEscala}
              disabled={gerarLoading}
              className="flex-1"
            >
              {gerarLoading ? 'Gerando...' : 'Gerar Escala'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Visualizar Escala */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-7xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogClose onClose={() => setViewDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>
              Escala: {selectedEscala && `${MESES[selectedEscala.mes_referencia - 1]} ${selectedEscala.ano_referencia}`}
            </DialogTitle>
            <DialogDescription asChild>
              {selectedEscala && (
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={getStatusBadgeVariant(selectedEscala.status)}>
                    {selectedEscala.status.charAt(0).toUpperCase() + selectedEscala.status.slice(1)}
                  </Badge>
                  <span>•</span>
                  <span>Código: {selectedEscala.codigo}</span>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {viewLoading ? (
              <div className="flex items-center justify-center p-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : escalaPregacoes.length > 0 ? (
              <div className="space-y-6">
                {/* Filtro por Igreja */}
                <div className="flex items-center gap-3">
                  <label className="text-sm text-muted-foreground">Filtrar por igreja:</label>
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={viewIgrejaFilter}
                    onChange={(e) => setViewIgrejaFilter(e.target.value)}
                  >
                    <option value="">Todas</option>
                    {viewIgrejas.map((ig) => (
                      <option key={ig.id} value={ig.id}>{ig.nome}</option>
                    ))}
                  </select>
                  {canManage && viewIgrejaFilter && (
                    <div className="ml-auto flex items-center gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        disabled={viewBulkLoading}
                        onClick={handleAprovarPorIgreja}
                        title="Aprovar escala de pregações da igreja filtrada"
                      >
                        <Check className="mr-2 h-4 w-4" /> {viewBulkLoading ? 'Processando...' : 'Aprovar Escala da Igreja'}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={viewBulkLoading}
                        onClick={handleCancelarPorIgreja}
                        title="Cancelar escala de pregações da igreja filtrada"
                      >
                        <X className="mr-2 h-4 w-4" /> {viewBulkLoading ? 'Processando...' : 'Cancelar Escala da Igreja'}
                      </Button>
                    </div>
                  )}
                </div>
                {Object.entries(
                  (viewIgrejaFilter ? escalaPregacoes.filter(p => p.igreja_id === viewIgrejaFilter) : escalaPregacoes).reduce((acc, pregacao) => {
                    const data = pregacao.data_pregacao
                    if (!acc[data]) acc[data] = []
                    acc[data].push(pregacao)
                    return acc
                  }, {} as Record<string, Pregacao[]>)
                )
                  .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                  .map(([data, pregacoesDia]) => (
                    <div key={data} className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium bg-muted px-3 py-2 rounded">
                        <Calendar className="h-4 w-4" />
                        {formatDate(data)} - {getDayOfWeek(data)}
                      </div>
                      <div className="space-y-2 pl-4">
                        {pregacoesDia.map((pregacao) => (
                          <div
                            key={pregacao.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50"
                          >
                            <div className="flex items-center gap-4">
                              <div className="text-sm">
                                <Clock className="h-3 w-3 inline mr-1" />
                                {pregacao.horario_pregacao?.substring(0, 5)}
                              </div>
                              <div>
                                <p className="font-medium">{pregacao.nome_culto}</p>
                                <p className="text-sm text-muted-foreground">
                                  {pregacao.igreja?.nome || 'Igreja'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-sm font-medium">
                                  {pregacao.pregador?.nome_completo || 'Pregador não atribuído'}
                                </p>
                                {pregacao.tematica && (
                                  <p className="text-xs text-muted-foreground">
                                    {pregacao.tematica.titulo}
                                  </p>
                                )}
                              </div>
                              <Badge variant={getPregacaoStatusBadgeVariant(pregacao.status)}>
                                {pregacao.status}
                              </Badge>
                              {canManage && (selectedEscala?.status === 'rascunho' || pregacao.status === 'recusado') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenAtribuirDialog(pregacao)}
                                  title={pregacao.pregador ? 'Trocar Pregador' : 'Atribuir Pregador'}
                                >
                                  {pregacao.status === 'recusado' ? (
                                    <RefreshCw className="h-4 w-4 text-orange-500" />
                                  ) : (
                                    <UserPlus className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center p-12">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma pregação nesta escala</p>
              </div>
            )}
          </div>

          {selectedEscala && (
            <div className="flex gap-3 pt-4 border-t">
              {selectedEscala.status === 'rascunho' && (
                <Button onClick={() => handleAprovarEscala(selectedEscala.id)} className="flex-1">
                  <Check className="mr-2 h-4 w-4" />
                  Aprovar Escala
                </Button>
              )}
              {selectedEscala.status === 'aprovado' && (
                <Button onClick={() => handleFinalizarEscala(selectedEscala.id)} className="flex-1">
                  Finalizar e Notificar Pregadores
                </Button>
              )}
              <Button variant="outline" onClick={() => handleExportarPDF(selectedEscala.id)}>
                <Download className="mr-2 h-4 w-4" />
                Exportar PDF
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Recusar Pregação */}
      <Dialog open={responderDialogOpen} onOpenChange={setResponderDialogOpen}>
        <DialogContent>
          <DialogClose onClose={() => setResponderDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>Recusar Pregação</DialogTitle>
            <DialogDescription>
              {pregacaoParaResponder && (
                <>
                  Você está recusando a pregação do dia{' '}
                  <strong>{formatDate(pregacaoParaResponder.data_pregacao)}</strong>{' '}
                  às <strong>{pregacaoParaResponder.horario_pregacao?.substring(0, 5)}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 inline mr-2" />
              Atenção: Recusar uma pregação pode impactar seu score de pregador.
            </div>

            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo da Recusa</Label>
              <textarea
                id="motivo"
                className="w-full min-h-[100px] px-3 py-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Descreva o motivo da recusa (opcional)"
                value={motivoRecusa}
                onChange={(e) => setMotivoRecusa(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setResponderDialogOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleResponderPregacao(false)}
              disabled={responderLoading}
              className="flex-1"
            >
              {responderLoading ? 'Processando...' : 'Confirmar Recusa'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Atribuir Pregador */}
      <Dialog open={atribuirDialogOpen} onOpenChange={setAtribuirDialogOpen}>
        <DialogContent>
          <DialogClose onClose={() => setAtribuirDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>
              {pregacaoParaAtribuir?.pregador ? 'Trocar Pregador' : 'Atribuir Pregador'}
            </DialogTitle>
            <DialogDescription>
              {pregacaoParaAtribuir && (
                <>
                  Pregação do dia <strong>{formatDate(pregacaoParaAtribuir.data_pregacao)}</strong>{' '}
                  às <strong>{pregacaoParaAtribuir.horario_pregacao?.substring(0, 5)}</strong>{' '}
                  na <strong>{pregacaoParaAtribuir.igreja?.nome || 'Igreja'}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {pregacaoParaAtribuir?.status === 'recusado' && (
              <div className="bg-orange-50 border border-orange-200 text-orange-800 p-3 rounded-lg text-sm">
                <RefreshCw className="h-4 w-4 inline mr-2" />
                O pregador anterior recusou esta pregação.
                {pregacaoParaAtribuir.motivo_recusa && (
                  <p className="mt-1 text-xs">
                    <strong>Motivo:</strong> {pregacaoParaAtribuir.motivo_recusa}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="pregador">Selecione o Pregador *</Label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Digite para pesquisar pregador..."
                  value={searchPregador}
                  onChange={(e) => {
                    setSearchPregador(e.target.value)
                    setShowPregadorDropdown(true)
                  }}
                  onFocus={() => setShowPregadorDropdown(true)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                
                {showPregadorDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-background border border-input rounded-md shadow-lg max-h-60 overflow-auto">
                    {pregadores.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        Carregando pregadores...
                      </div>
                    ) : (
                      <>
                        {pregadores
                          .filter(pregador => 
                            searchPregador === '' || 
                            pregador.nome_completo.toLowerCase().includes(searchPregador.toLowerCase())
                          )
                          .map((pregador) => {
                            const score = typeof pregador.score_medio === 'number' && !isNaN(pregador.score_medio) 
                              ? pregador.score_medio.toFixed(1) 
                              : null
                            
                            return (
                              <div
                                key={pregador.id}
                                onClick={() => {
                                  console.log('Pregador selecionado:', { id: pregador.id, nome: pregador.nome_completo })
                                  setPregadorSelecionado(pregador.id)
                                  setSearchPregador(`${pregador.nome_completo} ${score ? `(Score: ${score})` : ''}`)
                                  setShowPregadorDropdown(false)
                                }}
                                className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                              >
                                {pregador.nome_completo} {score ? `(Score: ${score})` : ''}
                              </div>
                            )
                          })
                        }
                        {pregadores.filter(pregador => 
                          searchPregador === '' || 
                          pregador.nome_completo.toLowerCase().includes(searchPregador.toLowerCase())
                        ).length === 0 && searchPregador !== '' && (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            Nenhum pregador encontrado
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
              
              {/* Campo hidden para enviar o ID */}
              <input type="hidden" value={pregadorSelecionado} />
            </div>

            {pregacaoParaAtribuir?.pregador && (
              <div className="text-sm text-muted-foreground">
                <p>Pregador atual: <strong>{pregacaoParaAtribuir.pregador.nome_completo}</strong></p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAtribuirDialogOpen(false)
                setPregacaoParaAtribuir(null)
                setPregadorSelecionado('')
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAtribuirPregador}
              disabled={atribuirLoading || !pregadorSelecionado}
              className="flex-1"
            >
              {atribuirLoading ? 'Atribuindo...' : 'Confirmar Atribuição'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
