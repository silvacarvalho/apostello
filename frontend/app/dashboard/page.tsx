'use client'

import { useState, useEffect } from 'react'
import { Calendar, Users, Star, TrendingUp, Church, BookOpen } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalPregacoes: 0,
    totalPregadores: 0,
    totalAvaliacoes: 0,
    mediaAvaliacoes: 0,
    totalIgrejas: 0,
    totalTematicas: 0,
    pregacoesEsteMes: 0,
    taxaParticipacao: 0
  })
  const [proximasPregacoes, setProximasPregacoes] = useState<any[]>([])
  const [avaliacoesRecentes, setAvaliacoesRecentes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      setLoading(true)

      // Buscar todos os dados em paralelo
      const [pregacoes, membros, avaliacoes, igrejas, tematicas] = await Promise.all([
        api.get('/pregacoes/').then(r => r.data).catch(() => []),
        api.get('/membros/').then(r => r.data).catch(() => []),
        api.get('/avaliacoes/').then(r => r.data).catch(() => []),
        api.get('/igrejas/').then(r => r.data).catch(() => []),
        api.get('/tematicas/').then(r => r.data).catch(() => [])
      ])

      // Calcular estatísticas
      const now = new Date()
      const pregacoesEsteMes = pregacoes.filter((p: any) => {
        const data = new Date(p.data_pregacao)
        return data.getMonth() === now.getMonth() && data.getFullYear() === now.getFullYear()
      })

      const pregadores = membros.filter((m: any) => m.perfis.includes('PREGADOR'))

      const mediaAvaliacoes = avaliacoes.length > 0
        ? avaliacoes.reduce((sum: number, a: any) => sum + a.nota, 0) / avaliacoes.length
        : 0

      const pregacoesConfirmadas = pregacoes.filter((p: any) => p.confirmada).length
      const taxaParticipacao = pregacoes.length > 0
        ? (pregacoesConfirmadas / pregacoes.length) * 100
        : 0

      setStats({
        totalPregacoes: pregacoes.length,
        totalPregadores: pregadores.length,
        totalAvaliacoes: avaliacoes.length,
        mediaAvaliacoes,
        totalIgrejas: igrejas.length,
        totalTematicas: tematicas.length,
        pregacoesEsteMes: pregacoesEsteMes.length,
        taxaParticipacao
      })

      // Próximas pregações (futuras ou de hoje)
      const futuras = pregacoes
        .filter((p: any) => new Date(p.data_pregacao) >= now)
        .sort((a: any, b: any) => new Date(a.data_pregacao).getTime() - new Date(b.data_pregacao).getTime())
        .slice(0, 5)

      setProximasPregacoes(futuras)

      // Avaliações mais recentes
      const recentes = avaliacoes
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)

      setAvaliacoesRecentes(recentes)

    } catch (err) {
      console.error('Erro ao carregar dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
            <p className="text-muted-foreground">Carregando dashboard...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral do sistema de escalas de pregação
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pregações Este Mês
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pregacoesEsteMes}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalPregacoes} total no sistema
              </p>
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
                {stats.totalIgrejas} igrejas no distrito
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Média de Avaliações
              </CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.mediaAvaliacoes.toFixed(1)}</div>
              <div className="flex items-center gap-1 mt-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3 w-3 ${
                      i < Math.floor(stats.mediaAvaliacoes)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
                <span className="text-xs text-muted-foreground ml-1">
                  ({stats.totalAvaliacoes})
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Taxa de Confirmação
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.taxaParticipacao.toFixed(0)}%</div>
              <p className="text-xs text-muted-foreground">
                Pregações confirmadas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Igrejas Cadastradas
              </CardTitle>
              <Church className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalIgrejas}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Temáticas Disponíveis
              </CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTematicas}</div>
            </CardContent>
          </Card>
        </div>

        {/* Próximas Pregações */}
        <Card>
          <CardHeader>
            <CardTitle>Próximas Pregações</CardTitle>
            <CardDescription>
              Pregações programadas para os próximos dias
            </CardDescription>
          </CardHeader>
          <CardContent>
            {proximasPregacoes.length > 0 ? (
              <div className="space-y-4">
                {proximasPregacoes.map((pregacao) => (
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
                      <p className="text-sm text-muted-foreground">
                        Pregador: {pregacao.pregador?.nome_completo}
                      </p>
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

        {/* Avaliações Recentes */}
        <Card>
          <CardHeader>
            <CardTitle>Avaliações Recentes</CardTitle>
            <CardDescription>
              Últimas avaliações recebidas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {avaliacoesRecentes.length > 0 ? (
              <div className="space-y-4">
                {avaliacoesRecentes.map((avaliacao) => (
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
                        Pregador: {avaliacao.pregacao?.pregador?.nome_completo}
                        {!avaliacao.anonima && ` • Avaliador: ${avaliacao.avaliador?.nome_completo}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-8 text-muted-foreground">
                <Star className="mx-auto h-12 w-12 mb-3 opacity-50" />
                <p>Nenhuma avaliação registrada</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
