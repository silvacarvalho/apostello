'use client'

import { useState } from 'react'
import {
  FileText,
  Download,
  Calendar,
  Star,
  Users,
  TrendingUp,
  Church,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function RelatoriosPage() {
  const [periodo, setPeriodo] = useState('mensal')

  // Mock data for charts and statistics
  const estatisticasGerais = {
    total_pregacoes: 156,
    total_pregadores: 45,
    media_avaliacoes: 4.6,
    taxa_participacao: 94,
    igrejas_ativas: 8,
    avaliacoes_recebidas: 142
  }

  const pregadoresPorIgreja = [
    { igreja: 'Igreja Central', pregadores: 12, pregacoes: 45 },
    { igreja: 'Igreja Norte', pregadores: 8, pregacoes: 32 },
    { igreja: 'Igreja Sul', pregadores: 7, pregacoes: 28 },
    { igreja: 'Igreja Leste', pregadores: 6, pregacoes: 22 },
    { igreja: 'Igreja Oeste', pregadores: 5, pregacoes: 18 },
    { igreja: 'Igreja Centro', pregadores: 4, pregacoes: 11 }
  ]

  const evolucaoMensal = [
    { mes: 'Jan', pregacoes: 52, avaliacoes: 48, media: 4.5 },
    { mes: 'Fev', pregacoes: 48, avaliacoes: 45, media: 4.6 },
    { mes: 'Mar', pregacoes: 55, avaliacoes: 50, media: 4.7 },
    { mes: 'Abr', pregacoes: 58, avaliacoes: 52, media: 4.6 },
    { mes: 'Mai', pregacoes: 60, avaliacoes: 55, media: 4.8 },
    { mes: 'Jun', pregacoes: 56, avaliacoes: 51, media: 4.5 }
  ]

  const distribuicaoNotas = [
    { nota: 5, quantidade: 85, percentual: 60 },
    { nota: 4, quantidade: 42, percentual: 30 },
    { nota: 3, quantidade: 12, percentual: 8 },
    { nota: 2, quantidade: 2, percentual: 1 },
    { nota: 1, quantidade: 1, percentual: 1 }
  ]

  function handleExportPDF() {
    alert('Exportando relatório em PDF...')
  }

  function handleExportExcel() {
    alert('Exportando relatório em Excel...')
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Relatórios</h1>
            <p className="text-muted-foreground">
              Estatísticas e análises do sistema de pregações
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportExcel}>
              <Download className="mr-2 h-4 w-4" />
              Excel
            </Button>
            <Button onClick={handleExportPDF}>
              <Download className="mr-2 h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>

        {/* Period Selector */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Período:</span>
              <div className="flex gap-2">
                {['semanal', 'mensal', 'trimestral', 'anual'].map((p) => (
                  <Button
                    key={p}
                    variant={periodo === p ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPeriodo(p)}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Pregações</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estatisticasGerais.total_pregacoes}</div>
              <div className="flex items-center gap-2 mt-1">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <p className="text-xs text-green-600 font-medium">+12% vs período anterior</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Média de Avaliações</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estatisticasGerais.media_avaliacoes}</div>
              <div className="flex items-center gap-1 mt-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.floor(estatisticasGerais.media_avaliacoes)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Participação</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estatisticasGerais.taxa_participacao}%</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-primary h-2 rounded-full"
                  style={{ width: `${estatisticasGerais.taxa_participacao}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pregadores Ativos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estatisticasGerais.total_pregadores}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {estatisticasGerais.avaliacoes_recebidas} avaliações recebidas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Igrejas Ativas</CardTitle>
              <Church className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estatisticasGerais.igrejas_ativas}</div>
              <p className="text-xs text-muted-foreground mt-1">No distrito</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avaliações Recebidas</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estatisticasGerais.avaliacoes_recebidas}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {((estatisticasGerais.avaliacoes_recebidas / estatisticasGerais.total_pregacoes) * 100).toFixed(0)}% das pregações avaliadas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Pregadores por Igreja */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Pregações por Igreja</CardTitle>
                <CardDescription>Distribuição de pregadores e pregações por igreja</CardDescription>
              </div>
              <Church className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pregadoresPorIgreja.map((item) => {
                const maxPregacoes = Math.max(...pregadoresPorIgreja.map(i => i.pregacoes))
                const percentage = (item.pregacoes / maxPregacoes) * 100

                return (
                  <div key={item.igreja} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.igreja}</span>
                      <div className="flex items-center gap-4 text-muted-foreground">
                        <span>{item.pregadores} pregadores</span>
                        <span className="font-semibold text-foreground">{item.pregacoes} pregações</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Evolução Mensal */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Evolução Mensal</CardTitle>
                <CardDescription>Pregações, avaliações e média ao longo do tempo</CardDescription>
              </div>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Simple bar chart representation */}
              <div className="grid grid-cols-6 gap-4">
                {evolucaoMensal.map((item) => {
                  const maxValue = Math.max(...evolucaoMensal.map(i => i.pregacoes))
                  const height = (item.pregacoes / maxValue) * 100

                  return (
                    <div key={item.mes} className="text-center">
                      <div className="flex flex-col items-center gap-1 mb-2">
                        <div className="relative w-full h-32 flex items-end justify-center">
                          <div
                            className="w-full bg-primary rounded-t"
                            style={{ height: `${height}%` }}
                          />
                        </div>
                        <p className="text-xs font-medium">{item.mes}</p>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p>{item.pregacoes} pregações</p>
                        <p>{item.avaliacoes} avaliações</p>
                        <div className="flex items-center justify-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{item.media}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Distribuição de Notas */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Distribuição de Notas</CardTitle>
                  <CardDescription>Percentual de cada nota recebida</CardDescription>
                </div>
                <PieChart className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {distribuicaoNotas.map((item) => (
                  <div key={item.nota} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{item.nota} estrela{item.nota > 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{item.quantidade} avaliações</span>
                        <Badge variant="outline">{item.percentual}%</Badge>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-400 h-2 rounded-full transition-all"
                        style={{ width: `${item.percentual}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Análise de Desempenho</CardTitle>
              <CardDescription>Insights e tendências identificadas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-green-100 p-1">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-900">Tendência Positiva</p>
                    <p className="text-xs text-green-700 mt-1">
                      A média de avaliações aumentou 8% nos últimos 3 meses
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-blue-100 p-1">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-900">Alta Participação</p>
                    <p className="text-xs text-blue-700 mt-1">
                      94% dos pregadores estão ativos e participando regularmente
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-purple-100 p-1">
                    <Star className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-purple-900">Qualidade Excelente</p>
                    <p className="text-xs text-purple-700 mt-1">
                      60% das pregações receberam avaliação máxima (5 estrelas)
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-orange-100 p-1">
                    <Activity className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-orange-900">Ponto de Atenção</p>
                    <p className="text-xs text-orange-700 mt-1">
                      Igreja Oeste tem a menor taxa de avaliações (72%). Considere incentivar mais participação.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Relatórios Predefinidos */}
        <Card>
          <CardHeader>
            <CardTitle>Relatórios Predefinidos</CardTitle>
            <CardDescription>Gere relatórios específicos com um clique</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <Button variant="outline" className="justify-start h-auto p-4">
                <div className="flex items-start gap-3 text-left">
                  <FileText className="h-5 w-5 mt-0.5" />
                  <div>
                    <p className="font-medium">Desempenho de Pregadores</p>
                    <p className="text-xs text-muted-foreground">
                      Ranking completo com estatísticas individuais
                    </p>
                  </div>
                </div>
              </Button>

              <Button variant="outline" className="justify-start h-auto p-4">
                <div className="flex items-start gap-3 text-left">
                  <FileText className="h-5 w-5 mt-0.5" />
                  <div>
                    <p className="font-medium">Escalas Mensais</p>
                    <p className="text-xs text-muted-foreground">
                      Todas as escalas geradas e seu status
                    </p>
                  </div>
                </div>
              </Button>

              <Button variant="outline" className="justify-start h-auto p-4">
                <div className="flex items-start gap-3 text-left">
                  <FileText className="h-5 w-5 mt-0.5" />
                  <div>
                    <p className="font-medium">Avaliações Detalhadas</p>
                    <p className="text-xs text-muted-foreground">
                      Lista completa com comentários e notas
                    </p>
                  </div>
                </div>
              </Button>

              <Button variant="outline" className="justify-start h-auto p-4">
                <div className="flex items-start gap-3 text-left">
                  <FileText className="h-5 w-5 mt-0.5" />
                  <div>
                    <p className="font-medium">Análise por Igreja</p>
                    <p className="text-xs text-muted-foreground">
                      Comparativo de desempenho entre igrejas
                    </p>
                  </div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
