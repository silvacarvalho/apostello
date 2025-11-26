'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Star, TrendingUp, BookOpen } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface DashboardPregadorProps {
  minhasPregacoes: any[]
  historicoPregacoes: any[]
  minhasAvaliacoes: any[]
  stats: {
    minhaMediaAvaliacoes: number
    totalMinhasPregacoes: number
    totalMinhasAvaliacoes: number
    pregacoesEsteMes: number
  }
}

export function DashboardPregador({ minhasPregacoes, historicoPregacoes, minhasAvaliacoes, stats }: DashboardPregadorProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Meu Painel de Pregador</h1>
        <p className="text-muted-foreground">
          Acompanhe suas pregações e avaliações
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Minhas Pregações
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMinhasPregacoes}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pregacoesEsteMes} este mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Minha Média
            </CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.minhaMediaAvaliacoes.toFixed(1)}</div>
            <div className="flex items-center gap-1 mt-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 ${
                    i < Math.floor(stats.minhaMediaAvaliacoes)
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
              Total de Avaliações
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMinhasAvaliacoes}</div>
            <p className="text-xs text-muted-foreground">
              Recebidas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Próximas Escalas
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{minhasPregacoes.length}</div>
            <p className="text-xs text-muted-foreground">
              Programadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Minhas Próximas Pregações */}
      <Card>
        <CardHeader>
          <CardTitle>Minhas Próximas Pregações</CardTitle>
          <CardDescription>
            Suas escalas futuras
          </CardDescription>
        </CardHeader>
        <CardContent>
          {minhasPregacoes.length > 0 ? (
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
                    {pregacao.tematica && (
                      <p className="text-sm text-muted-foreground">
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
              <Calendar className="mx-auto h-12 w-12 mb-3 opacity-50" />
              <p>Nenhuma pregação agendada</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Pregações */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Pregações</CardTitle>
          <CardDescription>
            Pregações realizadas recentemente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {historicoPregacoes.length > 0 ? (
            <div className="space-y-4">
              {historicoPregacoes.map((pregacao) => (
                <div
                  key={pregacao.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="space-y-1 flex-1">
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
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              <BookOpen className="mx-auto h-12 w-12 mb-3 opacity-50" />
              <p>Nenhuma pregação realizada ainda</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Minhas Avaliações Recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Minhas Avaliações Recentes</CardTitle>
          <CardDescription>
            Últimas avaliações recebidas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {minhasAvaliacoes.length > 0 ? (
            <div className="space-y-4">
              {minhasAvaliacoes.map((avaliacao) => (
                <div
                  key={avaliacao.id}
                  className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[...Array(5)].map((_, index) => (
                          <Star
                            key={index}
                            className={`h-4 w-4 ${
                              index < avaliacao.nota
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(avaliacao.created_at)}
                      </span>
                    </div>
                    {avaliacao.comentario && (
                      <p className="text-sm">{avaliacao.comentario}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Pregação: {avaliacao.pregacao?.culto_tipo} - {formatDate(avaliacao.pregacao?.data_pregacao)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              <Star className="mx-auto h-12 w-12 mb-3 opacity-50" />
              <p>Nenhuma avaliação recebida ainda</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
