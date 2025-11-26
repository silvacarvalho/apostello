'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Star, TrendingUp, Users, Church } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface DashboardPastorProps {
  topPregadores: any[]
  topIgrejasAvaliadoras: any[]
  minhasPregacoes: any[]
  historicoPregacoes: any[]
  stats: {
    mediaAvaliacoesDistrito: number
    totalPregadores: number
    totalIgrejas: number
    avaliacoesEsteMes: number
  }
}

export function DashboardPastor({ topPregadores, topIgrejasAvaliadoras, minhasPregacoes, historicoPregacoes, stats }: DashboardPastorProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Painel do Pastor Distrital</h1>
        <p className="text-muted-foreground">
          Gerencie e acompanhe o distrito
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Média do Distrito
            </CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.mediaAvaliacoesDistrito.toFixed(1)}</div>
            <div className="flex items-center gap-1 mt-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 ${
                    i < Math.floor(stats.mediaAvaliacoesDistrito)
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
            <CardTitle className="text-sm font-medium">
              Pregadores Ativos
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPregadores}</div>
            <p className="text-xs text-muted-foreground">
              No distrito
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Igrejas
            </CardTitle>
            <Church className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalIgrejas}</div>
            <p className="text-xs text-muted-foreground">
              No distrito
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avaliações
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avaliacoesEsteMes}</div>
            <p className="text-xs text-muted-foreground">
              Este mês
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top 5 Pregadores */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Pregadores</CardTitle>
          <CardDescription>
            Pregadores melhores avaliados do distrito
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topPregadores.length > 0 ? (
            <div className="space-y-4">
              {topPregadores.map((pregador, index) => (
                <div
                  key={pregador.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8">
                      {index === 0 ? (
                        <span className="text-2xl">🥇</span>
                      ) : index === 1 ? (
                        <span className="text-2xl">🥈</span>
                      ) : index === 2 ? (
                        <span className="text-2xl">🥉</span>
                      ) : (
                        <span className="font-semibold text-muted-foreground">#{index + 1}</span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">{pregador.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {pregador.total_pregacoes} pregações
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">{pregador.media_avaliacoes.toFixed(1)}</span>
                    </div>
                    {index < 3 && (
                      <Badge 
                        variant="outline"
                        className="hover:bg-accent hover:text-accent-foreground cursor-pointer"
                      >
                        Top {index + 1}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              <Users className="mx-auto h-12 w-12 mb-3 opacity-50" />
              <p>Nenhum pregador avaliado ainda</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top 5 Igrejas Avaliadoras */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Igrejas Mais Engajadas</CardTitle>
          <CardDescription>
            Igrejas com membros avaliadores mais ativos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topIgrejasAvaliadoras.length > 0 ? (
            <div className="space-y-4">
              {topIgrejasAvaliadoras.map((igreja, index) => (
                <div
                  key={igreja.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8">
                      {index === 0 ? (
                        <span className="text-2xl">🥇</span>
                      ) : index === 1 ? (
                        <span className="text-2xl">🥈</span>
                      ) : index === 2 ? (
                        <span className="text-2xl">🥉</span>
                      ) : (
                        <span className="font-semibold text-muted-foreground">#{index + 1}</span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">{igreja.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {igreja.total_avaliacoes} avaliações enviadas
                      </p>
                    </div>
                  </div>
                  {index < 3 && (
                    <Badge 
                      variant="outline"
                      className="hover:bg-accent hover:text-accent-foreground cursor-pointer"
                    >
                      Top {index + 1}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              <Church className="mx-auto h-12 w-12 mb-3 opacity-50" />
              <p>Nenhuma avaliação registrada ainda</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Minhas Próximas Pregações */}
      {minhasPregacoes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Minhas Próximas Pregações</CardTitle>
            <CardDescription>
              Suas escalas futuras
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {minhasPregacoes.map((pregacao) => (
                <div
                  key={pregacao.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{pregacao.culto_tipo?.replace('_', ' ')}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{formatDate(pregacao.data_pregacao)}</span>
                      <span>•</span>
                      <span>{pregacao.horario_pregacao}</span>
                      <span>•</span>
                      <span>{pregacao.igreja?.nome}</span>
                    </div>
                  </div>
                  <Badge variant={pregacao.confirmada ? 'default' : 'outline'}>
                    {pregacao.confirmada ? 'Confirmado' : 'Pendente'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico de Pregações */}
      {historicoPregacoes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Meu Histórico de Pregações</CardTitle>
            <CardDescription>
              Pregações realizadas recentemente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {historicoPregacoes.map((pregacao) => (
                <div
                  key={pregacao.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{pregacao.culto_tipo?.replace('_', ' ')}</p>
                      {pregacao.avaliacao_media && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-semibold">{pregacao.avaliacao_media.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{formatDate(pregacao.data_pregacao)}</span>
                      <span>•</span>
                      <span>{pregacao.igreja?.nome}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
