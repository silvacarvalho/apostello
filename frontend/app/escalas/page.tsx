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
import { escalasApi, pregacoesApi, distritosApi, pregadoresApi } from '@/lib/api'
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
  score_medio?: number
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
  const [gerarForm, setGerarForm] = useState({
    distrito_id: '',
    mes_referencia: new Date().getMonth() + 2,
    ano_referencia: new Date().getFullYear()
  })
  const [gerarLoading, setGerarLoading] = useState(false)
  const [gerarError, setGerarError] = useState('')
  
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedEscala, setSelectedEscala] = useState<Escala | null>(null)
  const [escalaPregacoes, setEscalaPregacoes] = useState<Pregacao[]>([])
  const [viewLoading, setViewLoading] = useState(false)

  const [responderDialogOpen, setResponderDialogOpen] = useState(false)
  const [pregacaoParaResponder, setPregacaoParaResponder] = useState<Pregacao | null>(null)
  const [motivoRecusa, setMotivoRecusa] = useState('')
  const [responderLoading, setResponderLoading] = useState(false)

  // Estados para atribuição de pregador
  const [atribuirDialogOpen, setAtribuirDialogOpen] = useState(false)
  const [pregacaoParaAtribuir, setPregacaoParaAtribuir] = useState<Pregacao | null>(null)
  const [pregadores, setPregadores] = useState<Pregador[]>([])
  const [pregadorSelecionado, setPregadorSelecionado] = useState('')
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
    if (!gerarForm.distrito_id) {
      setGerarError('Selecione um distrito')
      return
    }
    
    try {
      setGerarLoading(true)
      setGerarError('')
      
      await escalasApi.gerar({
        distrito_id: gerarForm.distrito_id,
        mes_referencia: gerarForm.mes_referencia,
        ano_referencia: gerarForm.ano_referencia
      })
      
      await loadData()
      setGerarDialogOpen(false)
      
      setGerarForm({
        distrito_id: user?.distrito_id || '',
        mes_referencia: new Date().getMonth() + 2,
        ano_referencia: new Date().getFullYear()
      })
      
    } catch (err: any) {
      setGerarError(err.response?.data?.detail || 'Erro ao gerar escala')
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
    } catch (err) {
      console.error('Erro ao carregar pregações:', err)
    } finally {
      setViewLoading(false)
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

  async function handleOpenAtribuirDialog(pregacao: Pregacao) {
    setPregacaoParaAtribuir(pregacao)
    setPregadorSelecionado(pregacao.pregador_id || '')
    setAtribuirDialogOpen(true)
    
    try {
      const pregadoresData = await pregadoresApi.listar()
      setPregadores(pregadoresData)
    } catch (err) {
      console.error('Erro ao carregar pregadores:', err)
    }
  }

  async function handleAtribuirPregador() {
    if (!pregacaoParaAtribuir || !pregadorSelecionado) return
    
    try {
      setAtribuirLoading(true)
      await pregacoesApi.atribuirPregador(pregacaoParaAtribuir.id, pregadorSelecionado)
      
      // Atualizar lista de pregações da escala se estiver visualizando
      if (selectedEscala) {
        const pregacoesData = await pregacoesApi.listar(selectedEscala.id)
        setEscalaPregacoes(pregacoesData)
      }
      
      setAtribuirDialogOpen(false)
      setPregacaoParaAtribuir(null)
      setPregadorSelecionado('')
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao atribuir pregador')
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

      // Título
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text(`Escala de Pregação - ${MESES[escala.mes_referencia - 1]} ${escala.ano_referencia}`, 14, 15)
      
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text(`Distrito: ${distrito?.nome || 'Não identificado'}`, 14, 22)
      doc.text(`Status: ${escala.status.charAt(0).toUpperCase() + escala.status.slice(1)}`, 14, 28)

      // Agrupar pregações por igreja
      const pregacoesPorIgreja: Record<string, typeof pregacoesData> = {}
      pregacoesData.forEach((p: Pregacao) => {
        const igrejaId = p.igreja_id
        const igrejaNome = p.igreja?.nome || 'Igreja não identificada'
        if (!pregacoesPorIgreja[igrejaNome]) {
          pregacoesPorIgreja[igrejaNome] = []
        }
        pregacoesPorIgreja[igrejaNome].push(p)
      })

      let startY = 35

      // Para cada igreja, criar uma tabela
      Object.entries(pregacoesPorIgreja).forEach(([igrejaNome, pregacoesIgreja]) => {
        // Ordenar por data
        pregacoesIgreja.sort((a, b) => new Date(a.data_pregacao).getTime() - new Date(b.data_pregacao).getTime())

        // Verificar se precisa de nova página
        if (startY > 170) {
          doc.addPage()
          startY = 15
        }

        // Nome da igreja
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text(igrejaNome, 14, startY)
        startY += 2

        // Tabela
        const tableData = pregacoesIgreja.map((p: Pregacao) => {
          const data = new Date(p.data_pregacao)
          const diaSemana = getDayOfWeek(p.data_pregacao)
          return [
            `${data.getDate().toString().padStart(2, '0')}/${(data.getMonth() + 1).toString().padStart(2, '0')}`,
            diaSemana.substring(0, 3),
            p.horario_pregacao?.substring(0, 5) || '-',
            p.nome_culto || '-',
            p.pregador?.nome_completo || '-',
            p.tematica?.titulo || '-',
            p.status.charAt(0).toUpperCase() + p.status.slice(1)
          ]
        })

        autoTable(doc, {
          head: [['Data', 'Dia', 'Hora', 'Culto', 'Pregador', 'Temática', 'Status']],
          body: tableData,
          startY: startY,
          theme: 'grid',
          styles: {
            fontSize: 8,
            cellPadding: 2
          },
          headStyles: {
            fillColor: [59, 130, 246],
            textColor: 255,
            fontStyle: 'bold'
          },
          columnStyles: {
            0: { cellWidth: 15 },
            1: { cellWidth: 15 },
            2: { cellWidth: 15 },
            3: { cellWidth: 35 },
            4: { cellWidth: 50 },
            5: { cellWidth: 60 },
            6: { cellWidth: 20 }
          },
          margin: { left: 14, right: 14 }
        })

        // @ts-ignore - autoTable adiciona lastAutoTable ao doc
        startY = doc.lastAutoTable.finalY + 10
      })

      // Rodapé
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text(
          `Gerado em ${formatDate(new Date().toISOString())} - Página ${i} de ${pageCount}`,
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
              <Button onClick={() => setGerarDialogOpen(true)}>
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
                  <Button onClick={() => setGerarDialogOpen(true)}>
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
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4" />
                {gerarError}
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
                  {[2024, 2025, 2026, 2027, 2028].map((ano) => (
                    <option key={ano} value={ano}>
                      {ano}
                    </option>
                  ))}
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
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogClose onClose={() => setViewDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>
              Escala: {selectedEscala && `${MESES[selectedEscala.mes_referencia - 1]} ${selectedEscala.ano_referencia}`}
            </DialogTitle>
            <DialogDescription>
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
                {Object.entries(
                  escalaPregacoes.reduce((acc, pregacao) => {
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
              <Select
                id="pregador"
                value={pregadorSelecionado}
                onChange={(e) => setPregadorSelecionado(e.target.value)}
              >
                <option value="">Selecione um pregador</option>
                {pregadores.map((pregador) => (
                  <option key={pregador.id} value={pregador.id}>
                    {pregador.nome_completo} {pregador.score_medio ? `(Score: ${pregador.score_medio.toFixed(1)})` : ''}
                  </option>
                ))}
              </Select>
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
