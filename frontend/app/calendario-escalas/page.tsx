'use client'

import { useState, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight, MapPin, Clock, User, Filter } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useAuth } from '@/lib/auth'
import { escalasApi, distritosApi, igrejasApi } from '@/lib/api'

interface EventoCalendario {
  id: string
  title: string
  start: string
  end: string
  status: string
  igreja_id: string
  pregador_id: string
  igreja_nome?: string
  meta: {
    tematica_id?: string
  }
}

interface MinhaPregacao {
  id: string
  data: string
  horario: string
  status: string
  igreja_id: string
  igreja_nome: string
  nome_culto: string | null
}

interface Distrito {
  id: string
  nome: string
}

interface Igreja {
  id: string
  nome: string
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function getStatusColor(status: string) {
  switch (status) {
    case 'agendado': return 'bg-blue-100 text-blue-800 border-blue-300'
    case 'aceito': return 'bg-green-100 text-green-800 border-green-300'
    case 'recusado': return 'bg-red-100 text-red-800 border-red-300'
    case 'realizado': return 'bg-gray-100 text-gray-800 border-gray-300'
    default: return 'bg-gray-100 text-gray-800 border-gray-300'
  }
}

export default function CalendarioEscalasPage() {
  const { user } = useAuth()
  
  const isMembroAssociacao = user?.perfis?.includes('membro_associacao') ?? false
  const isPastorOuLider = user?.perfis?.some(p => ['pastor_distrital', 'lider_distrital'].includes(p)) ?? false
  const isPregador = user?.perfis?.includes('pregador') ?? false
  
  const [mesAtual, setMesAtual] = useState(new Date().getMonth())
  const [anoAtual, setAnoAtual] = useState(new Date().getFullYear())
  
  // Estados para Membro Associação e Pastor/Líder
  const [distritos, setDistritos] = useState<Distrito[]>([])
  const [distritoSelecionado, setDistritoSelecionado] = useState('')
  const [igrejas, setIgrejas] = useState<Igreja[]>([])
  const [igrejaSelecionada, setIgrejaSelecionada] = useState('')
  const [eventos, setEventos] = useState<EventoCalendario[]>([])
  const [loading, setLoading] = useState(false)
  
  // Estados para Pregador
  const [minhasPregacoes, setMinhasPregacoes] = useState<MinhaPregacao[]>([])
  const [pregacaoSelecionada, setPregacaoSelecionada] = useState<MinhaPregacao | null>(null)
  const [calendarioCompacto, setCalendarioCompacto] = useState<EventoCalendario[]>([])
  const [mostrarCalendarioCompacto, setMostrarCalendarioCompacto] = useState(false)

  useEffect(() => {
    loadInitialData()
  }, [user])

  useEffect(() => {
    if ((isMembroAssociacao || isPastorOuLider) && distritoSelecionado) {
      loadIgrejas()
    }
  }, [distritoSelecionado])

  useEffect(() => {
    if ((isMembroAssociacao || isPastorOuLider) && (distritoSelecionado || igrejaSelecionada)) {
      loadEventos()
    }
  }, [mesAtual, anoAtual, distritoSelecionado, igrejaSelecionada])

  useEffect(() => {
    if (isPregador) {
      loadMinhasPregacoes()
    }
  }, [mesAtual, anoAtual, isPregador])

  async function loadInitialData() {
    try {
      if (isMembroAssociacao || isPastorOuLider) {
        const distritosData = await distritosApi.listar()
        setDistritos(distritosData)
        
        // Se for pastor/líder, selecionar automaticamente seu distrito
        if (user?.distrito_id && !isMembroAssociacao) {
          setDistritoSelecionado(user.distrito_id)
        }
      }
    } catch (err) {
      console.error('Erro ao carregar dados iniciais:', err)
    }
  }

  async function loadIgrejas() {
    try {
      const igrejasData = await igrejasApi.listar(distritoSelecionado)
      setIgrejas(igrejasData)
    } catch (err) {
      console.error('Erro ao carregar igrejas:', err)
    }
  }

  async function loadEventos() {
    if (!distritoSelecionado && !igrejaSelecionada) return
    
    try {
      setLoading(true)
      let eventosData: EventoCalendario[] = []
      
      if (igrejaSelecionada) {
        // Calendário por igreja
        eventosData = await escalasApi.calendarioIgreja(
          igrejaSelecionada,
          mesAtual + 1,
          anoAtual
        )
      } else if (distritoSelecionado) {
        // Calendário por distrito (agregado)
        eventosData = await escalasApi.calendarioDistrito(
          distritoSelecionado,
          mesAtual + 1,
          anoAtual
        )
      }
      
      setEventos(eventosData)
    } catch (err) {
      console.error('Erro ao carregar eventos:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadMinhasPregacoes() {
    try {
      setLoading(true)
      const pregacoesData = await escalasApi.minhasPregacoes(mesAtual + 1, anoAtual)
      setMinhasPregacoes(pregacoesData)
    } catch (err) {
      console.error('Erro ao carregar pregações:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleClickPregacao(pregacao: MinhaPregacao) {
    setPregacaoSelecionada(pregacao)
    setMostrarCalendarioCompacto(true)
    
    try {
      const data = new Date(pregacao.data)
      const calendarioData = await escalasApi.calendarioIgreja(
        pregacao.igreja_id,
        data.getMonth() + 1,
        data.getFullYear()
      )
      setCalendarioCompacto(calendarioData)
    } catch (err) {
      console.error('Erro ao carregar calendário compacto:', err)
    }
  }

  function proximoMes() {
    if (mesAtual === 11) {
      setMesAtual(0)
      setAnoAtual(anoAtual + 1)
    } else {
      setMesAtual(mesAtual + 1)
    }
  }

  function mesAnterior() {
    if (mesAtual === 0) {
      setMesAtual(11)
      setAnoAtual(anoAtual - 1)
    } else {
      setMesAtual(mesAtual - 1)
    }
  }

  function getDiasDoMes() {
    const primeiroDia = new Date(anoAtual, mesAtual, 1)
    const ultimoDia = new Date(anoAtual, mesAtual + 1, 0)
    const diasAntesInicio = primeiroDia.getDay()
    const totalDias = ultimoDia.getDate()
    
    const dias: (number | null)[] = []
    
    // Dias vazios do mês anterior
    for (let i = 0; i < diasAntesInicio; i++) {
      dias.push(null)
    }
    
    // Dias do mês atual
    for (let i = 1; i <= totalDias; i++) {
      dias.push(i)
    }
    
    return dias
  }

  function getEventosNoDia(dia: number): EventoCalendario[] {
    const dataStr = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    return eventos.filter(e => e.start.startsWith(dataStr))
  }

  const dias = getDiasDoMes()

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Calendário de Escalas</h1>
            <p className="text-muted-foreground">
              {isMembroAssociacao && 'Visualize escalas por distrito e igreja'}
              {isPastorOuLider && !isMembroAssociacao && 'Gerencie as escalas do seu distrito'}
              {isPregador && !isPastorOuLider && 'Suas pregações agendadas'}
            </p>
          </div>
        </div>

        {/* Filtros para Membro Associação e Pastor/Líder */}
        {(isMembroAssociacao || isPastorOuLider) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isMembroAssociacao && (
                  <div className="space-y-2">
                    <Label htmlFor="distrito">Distrito</Label>
                    <Select
                      id="distrito"
                      value={distritoSelecionado}
                      onChange={(e) => {
                        setDistritoSelecionado(e.target.value)
                        setIgrejaSelecionada('')
                      }}
                    >
                      <option value="">Selecione um distrito</option>
                      {distritos.map((d) => (
                        <option key={d.id} value={d.id}>{d.nome}</option>
                      ))}
                    </Select>
                  </div>
                )}
                
                {(distritoSelecionado || user?.distrito_id) && (
                  <div className="space-y-2">
                    <Label htmlFor="igreja">Igreja (Opcional)</Label>
                    <Select
                      id="igreja"
                      value={igrejaSelecionada}
                      onChange={(e) => setIgrejaSelecionada(e.target.value)}
                    >
                      <option value="">Todas as igrejas</option>
                      {igrejas.map((i) => (
                        <option key={i.id} value={i.id}>{i.nome}</option>
                      ))}
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Calendário para Associação/Pastor/Líder */}
        {(isMembroAssociacao || isPastorOuLider) && (distritoSelecionado || user?.distrito_id) && !mostrarCalendarioCompacto && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {MESES[mesAtual]} {anoAtual}
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={mesAnterior}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    setMesAtual(new Date().getMonth())
                    setAnoAtual(new Date().getFullYear())
                  }}>
                    Hoje
                  </Button>
                  <Button variant="outline" size="sm" onClick={proximoMes}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {igrejaSelecionada && (
                <CardDescription>
                  {igrejas.find(i => i.id === igrejaSelecionada)?.nome}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center p-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1">
                  {/* Cabeçalho dias da semana */}
                  {DIAS_SEMANA.map((dia) => (
                    <div key={dia} className="text-center font-semibold text-sm py-2 text-muted-foreground">
                      {dia}
                    </div>
                  ))}
                  
                  {/* Dias do mês */}
                  {dias.map((dia, index) => {
                    if (dia === null) {
                      return <div key={`empty-${index}`} className="min-h-[100px] border border-transparent" />
                    }
                    
                    const eventosNoDia = getEventosNoDia(dia)
                    const hoje = new Date()
                    const isHoje = hoje.getDate() === dia && hoje.getMonth() === mesAtual && hoje.getFullYear() === anoAtual
                    
                    return (
                      <div
                        key={dia}
                        className={`min-h-[100px] border rounded-lg p-2 ${
                          isHoje ? 'bg-primary/5 border-primary' : 'border-border'
                        }`}
                      >
                        <div className={`text-sm font-medium mb-1 ${isHoje ? 'text-primary' : ''}`}>
                          {dia}
                        </div>
                        <div className="space-y-1">
                          {eventosNoDia.slice(0, 2).map((evento) => {
                            const hora = new Date(evento.start).toLocaleTimeString('pt-BR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })
                            return (
                              <div
                                key={evento.id}
                                className={`text-xs p-1 rounded border ${getStatusColor(evento.status)}`}
                                title={evento.title}
                              >
                                <div className="font-medium truncate">{hora}</div>
                                {evento.igreja_nome && (
                                  <div className="truncate text-[10px]">{evento.igreja_nome}</div>
                                )}
                              </div>
                            )
                          })}
                          {eventosNoDia.length > 2 && (
                            <div className="text-[10px] text-muted-foreground text-center">
                              +{eventosNoDia.length - 2} mais
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Lista para Pregador */}
        {isPregador && !mostrarCalendarioCompacto && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Minhas Pregações - {MESES[mesAtual]} {anoAtual}</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={mesAnterior}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    setMesAtual(new Date().getMonth())
                    setAnoAtual(new Date().getFullYear())
                  }}>
                    Hoje
                  </Button>
                  <Button variant="outline" size="sm" onClick={proximoMes}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center p-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : minhasPregacoes.length > 0 ? (
                <div className="space-y-3">
                  {minhasPregacoes.map((pregacao) => {
                    const data = new Date(pregacao.data)
                    return (
                      <div
                        key={pregacao.id}
                        onClick={() => handleClickPregacao(pregacao)}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`rounded-lg p-3 text-center min-w-[60px] ${getStatusColor(pregacao.status)}`}>
                            <p className="text-2xl font-bold">{data.getDate()}</p>
                            <p className="text-xs uppercase">{DIAS_SEMANA[data.getDay()]}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="font-medium">{pregacao.nome_culto || 'Culto'}</p>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {pregacao.horario.substring(0, 5)}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {pregacao.igreja_nome}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Badge variant={pregacao.status === 'aceito' ? 'default' : 'outline'}>
                          {pregacao.status}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center p-12">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhuma pregação neste mês</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Calendário Compacto (aberto ao clicar em pregação) */}
        {mostrarCalendarioCompacto && pregacaoSelecionada && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Escala da Igreja - {pregacaoSelecionada.igreja_nome}
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => setMostrarCalendarioCompacto(false)}>
                  Voltar
                </Button>
              </div>
              <CardDescription>
                {MESES[new Date(pregacaoSelecionada.data).getMonth()]} {new Date(pregacaoSelecionada.data).getFullYear()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {calendarioCompacto.map((evento) => {
                  const data = new Date(evento.start)
                  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                  const isMinhaPregacao = evento.id === pregacaoSelecionada.id
                  
                  return (
                    <div
                      key={evento.id}
                      className={`flex items-center justify-between p-3 border rounded-lg ${
                        isMinhaPregacao ? 'bg-primary/10 border-primary' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium min-w-[80px]">
                          {data.getDate()}/{data.getMonth() + 1} - {DIAS_SEMANA[data.getDay()]}
                        </div>
                        <div className="text-sm text-muted-foreground">{hora}</div>
                        <div className="font-medium">{evento.title}</div>
                      </div>
                      {isMinhaPregacao && (
                        <Badge>Você</Badge>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
