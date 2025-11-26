'use client'

import { useState, useEffect } from 'react'
import { Users, Star, TrendingUp, Award, Search, Filter, Calendar, CheckCircle, X, BarChart3, MessageSquare, Clock } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { pregadoresApi } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import api from '@/lib/api'

export default function PregadoresPage() {
  const [pregadores, setPregadores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPregador, setSelectedPregador] = useState<any>(null)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [profileDetails, setProfileDetails] = useState<any>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)

  useEffect(() => {
    loadPregadores()
  }, [])

  async function loadPregadores() {
    try {
      setLoading(true)
      const data = await pregadoresApi.listar()
      setPregadores(data)
    } catch (err) {
      console.error('Erro ao carregar pregadores:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadPregadorDetails(pregadorId: string) {
    try {
      setLoadingProfile(true)
      
      // Buscar dados detalhados do pregador
      const [pregador, pregacoes, avaliacoes] = await Promise.all([
        api.get(`/usuarios/${pregadorId}`).then(r => r.data),
        api.get(`/pregacoes/`).then(r => r.data).catch(() => []),
        api.get(`/avaliacoes/`).then(r => r.data).catch(() => [])
      ])

      // Filtrar pregações do pregador específico
      const pregacoesDoPregador = pregacoes.filter((p: any) => p.pregador_id === pregadorId)
      const pregacoesIds = pregacoesDoPregador.map((p: any) => p.id)
      
      // Filtrar avaliações das pregações deste pregador
      const avaliacoesDoPregador = avaliacoes.filter((a: any) => pregacoesIds.includes(a.pregacao_id))

      // Ordenar pregações (futuras primeiro, depois passadas)
      const now = new Date()
      const pregacoesFuturas = pregacoesDoPregador
        .filter((p: any) => new Date(p.data_pregacao) >= now)
        .sort((a: any, b: any) => new Date(a.data_pregacao).getTime() - new Date(b.data_pregacao).getTime())
      
      const pregacoesPassadas = pregacoesDoPregador
        .filter((p: any) => new Date(p.data_pregacao) < now)
        .sort((a: any, b: any) => new Date(b.data_pregacao).getTime() - new Date(a.data_pregacao).getTime())

      // Calcular distribuição de notas
      const distribuicaoNotas = {
        5: avaliacoesDoPregador.filter((a: any) => a.nota === 5).length,
        4: avaliacoesDoPregador.filter((a: any) => a.nota === 4).length,
        3: avaliacoesDoPregador.filter((a: any) => a.nota === 3).length,
        2: avaliacoesDoPregador.filter((a: any) => a.nota === 2).length,
        1: avaliacoesDoPregador.filter((a: any) => a.nota === 1).length,
      }

      // Pegar avaliações recentes com comentários
      const avaliacoesRecentes = avaliacoesDoPregador
        .filter((a: any) => a.comentario)
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)

      setProfileDetails({
        ...pregador,
        pregacoesFuturas,
        pregacoesPassadas: pregacoesPassadas.slice(0, 10),
        totalPregacoes: pregacoesDoPregador.length,
        distribuicaoNotas,
        avaliacoesRecentes,
        totalAvaliacoes: avaliacoesDoPregador.length
      })
    } catch (err) {
      console.error('Erro ao carregar detalhes do pregador:', err)
    } finally {
      setLoadingProfile(false)
    }
  }

  function openProfileDialog(pregador: any) {
    setSelectedPregador(pregador)
    setProfileDialogOpen(true)
    loadPregadorDetails(pregador.usuario_id)
  }

  const filteredPregadores = pregadores.filter(p =>
    p.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.igreja?.nome.toLowerCase().includes(searchTerm.toLowerCase())
  )

  function getRankingBadge(posicao: number) {
    if (posicao === 1) return { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: '🥇', label: '1º Lugar' }
    if (posicao === 2) return { color: 'bg-gray-100 text-gray-800 border-gray-300', icon: '🥈', label: '2º Lugar' }
    if (posicao === 3) return { color: 'bg-orange-100 text-orange-800 border-orange-300', icon: '🥉', label: '3º Lugar' }
    return { color: 'bg-blue-50 text-blue-700 border-blue-200', icon: '', label: `${posicao}º` }
  }

  function getPerformanceBadge(media: number) {
    if (media >= 4.5) return { variant: 'default' as const, label: 'Excelente' }
    if (media >= 4.0) return { variant: 'outline' as const, label: 'Muito Bom' }
    if (media >= 3.5) return { variant: 'outline' as const, label: 'Bom' }
    return { variant: 'outline' as const, label: 'Regular' }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Pregadores</h1>
            <p className="text-muted-foreground">
              Ranking e desempenho dos pregadores do distrito
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card key="total-pregadores">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Pregadores
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pregadores.length}</div>
              <p className="text-xs text-muted-foreground">
                Ativos no distrito
              </p>
            </CardContent>
          </Card>

          <Card key="media-geral">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Média Geral
              </CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pregadores.length > 0
                  ? (pregadores.reduce((sum, p) => sum + (p.media_avaliacoes || 0), 0) / pregadores.length).toFixed(1)
                  : '0.0'}
              </div>
              <p className="text-xs text-muted-foreground">
                De 5 estrelas
              </p>
            </CardContent>
          </Card>

          <Card key="taxa-confirmacao">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Taxa de Confirmação
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pregadores.length > 0
                  ? Math.round(pregadores.reduce((sum, p) => sum + (p.taxa_confirmacao || 0), 0) / pregadores.length)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Pregações confirmadas
              </p>
            </CardContent>
          </Card>

          <Card key="total-pregacoes">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Pregações
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pregadores.reduce((sum, p) => sum + (p.total_pregacoes || 0), 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Este ano
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Ranking de Pregadores</CardTitle>
                <CardDescription>
                  Classificação baseada em desempenho e avaliações
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou igreja..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center p-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPregadores.map((pregador) => {
                  const rankingBadge = getRankingBadge(pregador.posicao_ranking)
                  const performanceBadge = getPerformanceBadge(pregador.media_avaliacoes)
                  
                  return (
                    <div
                      key={pregador.id}
                      className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0 hover:bg-accent/50 p-4 rounded-lg transition-colors cursor-pointer"
                      onClick={() => setSelectedPregador(pregador)}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        {/* Ranking Position */}
                        <div className={`flex items-center justify-center w-16 h-16 rounded-full border-2 ${rankingBadge.color} font-bold text-lg`}>
                          {rankingBadge.icon ? (
                            <span className="text-2xl">{rankingBadge.icon}</span>
                          ) : (
                            <span>{pregador.posicao_ranking}º</span>
                          )}
                        </div>

                        {/* Pregador Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <p className="font-semibold text-lg">{pregador.nome_completo}</p>
                            <Badge {...performanceBadge}>{performanceBadge.label}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{pregador.igreja?.nome}</p>

                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-medium">{pregador.media_avaliacoes.toFixed(1)}</span>
                              <span className="text-muted-foreground">({pregador.total_avaliacoes} avaliações)</span>
                            </div>
                            <span className="text-muted-foreground">•</span>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span className="text-muted-foreground">{pregador.total_pregacoes} pregações</span>
                            </div>
                            <span className="text-muted-foreground">•</span>
                            <div className="flex items-center gap-1">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-muted-foreground">{pregador.taxa_confirmacao}% confirmação</span>
                            </div>
                          </div>
                        </div>

                        {/* Performance Indicator */}
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="h-5 w-5 text-green-600" />
                            <span className="text-2xl font-bold text-green-600">
                              {((pregador.media_avaliacoes / 5) * 100).toFixed(0)}%
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">Desempenho</p>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {filteredPregadores.length === 0 && (
                  <div className="text-center p-12">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Nenhum pregador encontrado
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Performers */}
        <div className="grid gap-6 md:grid-cols-3">
          {pregadores.slice(0, 3).map((pregador, index) => {
            const medals = ['🥇', '🥈', '🥉']
            const colors = [
              'border-yellow-300 bg-yellow-50',
              'border-gray-300 bg-gray-50',
              'border-orange-300 bg-orange-50'
            ]

            return (
              <Card key={pregador.id} className={`${colors[index]} border-2`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="text-4xl">{medals[index]}</div>
                    <Badge variant={index === 0 ? 'default' : 'outline'}>
                      Top {index + 1}
                    </Badge>
                  </div>
                  <CardTitle className="mt-2">{pregador.nome_completo}</CardTitle>
                  <CardDescription>{pregador.igreja?.nome}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Média de Avaliações</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-bold">{pregador.media_avaliacoes.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total de Pregações</span>
                    <span className="font-bold">{pregador.total_pregacoes}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Taxa de Confirmação</span>
                    <span className="font-bold text-green-600">{pregador.taxa_confirmacao}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total de Avaliações</span>
                    <span className="font-bold">{pregador.total_avaliacoes}</span>
                  </div>
                  <Button variant="outline" className="w-full mt-4" onClick={() => openProfileDialog(pregador)}>
                    Ver Perfil Completo
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Dialog de Perfil Completo */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{selectedPregador?.nome_completo}</h2>
                <p className="text-sm text-muted-foreground mt-1">{selectedPregador?.igreja?.nome}</p>
              </div>
              <Badge variant={selectedPregador?.posicao_ranking <= 3 ? 'default' : 'outline'}>
                {selectedPregador?.posicao_ranking}º no Ranking
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {loadingProfile ? (
            <div className="flex items-center justify-center p-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : profileDetails ? (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="historico">Histórico</TabsTrigger>
                <TabsTrigger value="avaliacoes">Avaliações</TabsTrigger>
                <TabsTrigger value="escalas">Próximas Escalas</TabsTrigger>
              </TabsList>

              {/* Tab: Visão Geral */}
              <TabsContent value="overview" className="space-y-4 mt-4">
                {/* Estatísticas Principais */}
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Média Geral
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                        <span className="text-2xl font-bold">{selectedPregador?.media_avaliacoes.toFixed(1)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total de Pregações
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <span className="text-2xl font-bold">{profileDetails.totalPregacoes}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Taxa Confirmação
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="text-2xl font-bold text-green-600">{selectedPregador?.taxa_confirmacao}%</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Avaliações
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-muted-foreground" />
                        <span className="text-2xl font-bold">{profileDetails.totalAvaliacoes}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Distribuição de Notas */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Distribuição de Notas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[5, 4, 3, 2, 1].map((nota) => {
                        const count = profileDetails.distribuicaoNotas[nota]
                        const percentage = profileDetails.totalAvaliacoes > 0 
                          ? (count / profileDetails.totalAvaliacoes) * 100 
                          : 0

                        return (
                          <div key={nota} className="flex items-center gap-3">
                            <div className="flex items-center gap-1 w-20">
                              <span className="text-sm font-medium">{nota}</span>
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            </div>
                            <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                              <div 
                                className="bg-yellow-400 h-full transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground w-16 text-right">
                              {count} ({percentage.toFixed(0)}%)
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: Histórico */}
              <TabsContent value="historico" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Pregações Realizadas</CardTitle>
                    <CardDescription>Últimas 10 pregações</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {profileDetails.pregacoesPassadas.length > 0 ? (
                      <div className="space-y-3">
                        {profileDetails.pregacoesPassadas.map((pregacao: any) => (
                          <div
                            key={pregacao.id}
                            className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                          >
                            <div className="space-y-1">
                              <p className="font-medium">{pregacao.culto_tipo?.replace('_', ' ')}</p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDate(pregacao.data_pregacao)}</span>
                                <span>•</span>
                                <span>{pregacao.igreja?.nome}</span>
                              </div>
                              {pregacao.tematica && (
                                <p className="text-xs text-muted-foreground">
                                  Temática: {pregacao.tematica.titulo}
                                </p>
                              )}
                            </div>
                            <Badge variant={pregacao.confirmada ? 'default' : 'outline'}>
                              {pregacao.confirmada ? 'Confirmado' : 'Não confirmado'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-8 text-muted-foreground">
                        <Calendar className="mx-auto h-12 w-12 mb-3 opacity-50" />
                        <p>Nenhuma pregação realizada ainda</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: Avaliações */}
              <TabsContent value="avaliacoes" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Avaliações Recentes</CardTitle>
                    <CardDescription>Comentários das últimas avaliações</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {profileDetails.avaliacoesRecentes.length > 0 ? (
                      <div className="space-y-4">
                        {profileDetails.avaliacoesRecentes.map((avaliacao: any) => (
                          <div
                            key={avaliacao.id}
                            className="border-b pb-4 last:border-0 last:pb-0"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${
                                      i < avaliacao.nota
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(avaliacao.created_at)}
                              </span>
                            </div>
                            <p className="text-sm mb-2">{avaliacao.comentario}</p>
                            <p className="text-xs text-muted-foreground">
                              Pregação em {avaliacao.pregacao?.igreja?.nome}
                              {!avaliacao.anonima && avaliacao.avaliador && 
                                ` • Avaliado por: ${avaliacao.avaliador.nome_completo}`
                              }
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-8 text-muted-foreground">
                        <MessageSquare className="mx-auto h-12 w-12 mb-3 opacity-50" />
                        <p>Nenhuma avaliação com comentário ainda</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: Próximas Escalas */}
              <TabsContent value="escalas" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Pregações Agendadas</CardTitle>
                    <CardDescription>Escalas futuras confirmadas</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {profileDetails.pregacoesFuturas.length > 0 ? (
                      <div className="space-y-3">
                        {profileDetails.pregacoesFuturas.map((pregacao: any) => (
                          <div
                            key={pregacao.id}
                            className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                          >
                            <div className="space-y-1">
                              <p className="font-medium">{pregacao.culto_tipo?.replace('_', ' ')}</p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDate(pregacao.data_pregacao)}</span>
                                <span>•</span>
                                <span>{pregacao.horario_pregacao}</span>
                                <span>•</span>
                                <span>{pregacao.igreja?.nome}</span>
                              </div>
                              {pregacao.tematica && (
                                <p className="text-xs text-muted-foreground">
                                  Temática: {pregacao.tematica.titulo}
                                </p>
                              )}
                            </div>
                            <Badge variant={pregacao.confirmada ? 'default' : 'outline'}>
                              {pregacao.confirmada ? 'Confirmado' : 'Pendente'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-8 text-muted-foreground">
                        <Clock className="mx-auto h-12 w-12 mb-3 opacity-50" />
                        <p>Nenhuma pregação agendada no momento</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : null}
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
