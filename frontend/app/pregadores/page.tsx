'use client'

import { useState, useEffect } from 'react'
import { Users, Star, TrendingUp, Award, Search, Filter, Calendar, CheckCircle } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { pregadoresApi } from '@/lib/api'

export default function PregadoresPage() {
  const [pregadores, setPregadores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPregador, setSelectedPregador] = useState<any>(null)

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

  // Mock data for demonstration
  const mockPregadores = [
    {
      id: '1',
      nome_completo: 'João Silva',
      email: 'joao@example.com',
      telefone: '(11) 98765-4321',
      igreja: { nome: 'Igreja Central' },
      total_pregacoes: 45,
      media_avaliacoes: 4.8,
      taxa_confirmacao: 98,
      posicao_ranking: 1,
      total_avaliacoes: 42,
      ultima_pregacao: '2025-11-20'
    },
    {
      id: '2',
      nome_completo: 'Maria Santos',
      email: 'maria@example.com',
      telefone: '(11) 98765-4322',
      igreja: { nome: 'Igreja Norte' },
      total_pregacoes: 38,
      media_avaliacoes: 4.7,
      taxa_confirmacao: 95,
      posicao_ranking: 2,
      total_avaliacoes: 35,
      ultima_pregacao: '2025-11-18'
    },
    {
      id: '3',
      nome_completo: 'Pedro Oliveira',
      email: 'pedro@example.com',
      telefone: '(11) 98765-4323',
      igreja: { nome: 'Igreja Sul' },
      total_pregacoes: 32,
      media_avaliacoes: 4.6,
      taxa_confirmacao: 93,
      posicao_ranking: 3,
      total_avaliacoes: 30,
      ultima_pregacao: '2025-11-15'
    },
    {
      id: '4',
      nome_completo: 'Ana Costa',
      email: 'ana@example.com',
      telefone: '(11) 98765-4324',
      igreja: { nome: 'Igreja Leste' },
      total_pregacoes: 28,
      media_avaliacoes: 4.5,
      taxa_confirmacao: 90,
      posicao_ranking: 4,
      total_avaliacoes: 26,
      ultima_pregacao: '2025-11-12'
    },
    {
      id: '5',
      nome_completo: 'Carlos Ferreira',
      email: 'carlos@example.com',
      telefone: '(11) 98765-4325',
      igreja: { nome: 'Igreja Oeste' },
      total_pregacoes: 25,
      media_avaliacoes: 4.4,
      taxa_confirmacao: 88,
      posicao_ranking: 5,
      total_avaliacoes: 23,
      ultima_pregacao: '2025-11-10'
    },
  ]

  const displayPregadores = pregadores.length > 0 ? pregadores : mockPregadores

  const filteredPregadores = displayPregadores.filter(p =>
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
          <Button>
            <Users className="mr-2 h-4 w-4" />
            Cadastrar Pregador
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Pregadores
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{displayPregadores.length}</div>
              <p className="text-xs text-muted-foreground">
                Ativos no distrito
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Média Geral
              </CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">4.6</div>
              <p className="text-xs text-muted-foreground">
                De 5 estrelas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Taxa de Confirmação
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">93%</div>
              <p className="text-xs text-muted-foreground">
                Pregações confirmadas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Pregações
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {displayPregadores.reduce((sum, p) => sum + (p.total_pregacoes || 0), 0)}
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
          {displayPregadores.slice(0, 3).map((pregador, index) => {
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
                  <Button variant="outline" className="w-full mt-4">
                    Ver Perfil Completo
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </AppLayout>
  )
}
