'use client'

import { useState, useEffect } from 'react'
import { Calendar, Users, Star, Church, BookOpen, Award, Trophy } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { DashboardPregador } from '@/components/dashboard/DashboardPregador'
import { DashboardPastor } from '@/components/dashboard/DashboardPastor'

export default function DashboardPage() {
  const { user } = useAuth()
  
  // Identificar perfil principal do usuário (prioridade: membro_associacao > pastor_distrital > pregador)
  const isMembroAssociacao = user?.perfis?.includes('membro_associacao') ?? false
  const isPastorDistrital = user?.perfis?.includes('pastor_distrital') ?? false
  const isPregador = user?.perfis?.includes('pregador') ?? false
  
  const [stats, setStats] = useState<any>({
    totalPregacoes: 0,
    totalPregadores: 0,
    totalAvaliacoes: 0,
    mediaAvaliacoes: 0,
    totalIgrejas: 0,
    totalTematicas: 0,
    pregacoesEsteMes: 0,
    taxaParticipacao: 0,
    // Campos específicos do pregador
    minhaMediaAvaliacoes: 0,
    totalMinhasPregacoes: 0,
    totalMinhasAvaliacoes: 0,
    // Campos específicos do pastor
    mediaAvaliacoesDistrito: 0,
    avaliacoesEsteMes: 0
  })
  const [proximasPregacoes, setProximasPregacoes] = useState<any[]>([])
  const [minhasPregacoes, setMinhasPregacoes] = useState<any[]>([])
  const [historicoPregacoes, setHistoricoPregacoes] = useState<any[]>([])
  const [minhasAvaliacoes, setMinhasAvaliacoes] = useState<any[]>([])
  const [avaliacoesRecentes, setAvaliacoesRecentes] = useState<any[]>([])
  const [topPregadores, setTopPregadores] = useState<any[]>([])
  const [topIgrejasAvaliadoras, setTopIgrejasAvaliadoras] = useState<any[]>([])
  const [topDistritos, setTopDistritos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      setLoading(true)

      // Buscar todos os dados em paralelo
      const promises: any[] = [
        api.get('/pregacoes/').then(r => r.data).catch(() => []),
        api.get('/usuarios/').then(r => r.data).catch(() => []),
        api.get('/avaliacoes/').then(r => r.data).catch(() => []),
        api.get('/igrejas/').then(r => r.data).catch(() => []),
        api.get('/tematicas/').then(r => r.data).catch(() => [])
      ]

      // Se for membro da associação, buscar distritos também
      if (isMembroAssociacao) {
        promises.push(api.get('/distritos/').then(r => r.data).catch(() => []))
      }

      const results = await Promise.all(promises)
      const [pregacoes, usuarios, avaliacoes, igrejas, tematicas, distritos] = results
      
      const now = new Date()

      // ============= DASHBOARD PARA PREGADOR =============
      if (isPregador && !isPastorDistrital && !isMembroAssociacao) {
        // Minhas pregações (onde sou o pregador)
        const minhasPregacoesFuturas = pregacoes
          .filter((p: any) => p.pregador_id === user?.id && new Date(p.data_pregacao) >= now)
          .sort((a: any, b: any) => new Date(a.data_pregacao).getTime() - new Date(b.data_pregacao).getTime())

        const minhasPregacoesPassadas = pregacoes
          .filter((p: any) => p.pregador_id === user?.id && new Date(p.data_pregacao) < now)
          .sort((a: any, b: any) => new Date(b.data_pregacao).getTime() - new Date(a.data_pregacao).getTime())
          .slice(0, 10)

        // Calcular média de avaliação para cada pregação passada
        const historicoPregacoesComMedia = minhasPregacoesPassadas.map((p: any) => {
          const avaliacoesP = avaliacoes.filter((a: any) => a.pregacao_id === p.id)
          const media = avaliacoesP.length > 0
            ? avaliacoesP.reduce((sum: number, a: any) => sum + a.nota, 0) / avaliacoesP.length
            : null
          return { ...p, avaliacao_media: media }
        })

        // Minhas avaliações recebidas
        const minhasPregacoesIds = pregacoes
          .filter((p: any) => p.pregador_id === user?.id)
          .map((p: any) => p.id)
        
        const minhasAvaliacoesRecebidas = avaliacoes
          .filter((a: any) => minhasPregacoesIds.includes(a.pregacao_id))
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 10)

        // Calcular estatísticas pessoais
        const minhaMediaAvaliacoes = minhasAvaliacoesRecebidas.length > 0
          ? minhasAvaliacoesRecebidas.reduce((sum: number, a: any) => sum + a.nota, 0) / minhasAvaliacoesRecebidas.length
          : 0

        const totalMinhasPregacoes = pregacoes.filter((p: any) => p.pregador_id === user?.id).length
        
        const pregacoesEsteMes = pregacoes.filter((p: any) => {
          if (p.pregador_id !== user?.id) return false
          const data = new Date(p.data_pregacao)
          return data.getMonth() === now.getMonth() && data.getFullYear() === now.getFullYear()
        }).length

        setMinhasPregacoes(minhasPregacoesFuturas)
        setHistoricoPregacoes(historicoPregacoesComMedia)
        setMinhasAvaliacoes(minhasAvaliacoesRecebidas)
        setStats({
          minhaMediaAvaliacoes,
          totalMinhasPregacoes,
          totalMinhasAvaliacoes: minhasAvaliacoesRecebidas.length,
          pregacoesEsteMes,
          totalPregacoes: 0,
          totalPregadores: 0,
          totalAvaliacoes: 0,
          mediaAvaliacoes: 0,
          totalIgrejas: 0,
          totalTematicas: 0,
          taxaParticipacao: 0
        })
      }
      // ============= DASHBOARD PARA PASTOR DISTRITAL =============
      else if (isPastorDistrital && !isMembroAssociacao) {
        // Pegar igrejas do distrito do pastor
        const igrejasDoDistrito = igrejas.filter((i: any) => i.distrito_id === (user as any)?.distrito_id)
        const igrejasIds = igrejasDoDistrito.map((i: any) => i.id)

        // Pregações do distrito
        const pregacoesDoDistrito = pregacoes.filter((p: any) => igrejasIds.includes(p.igreja_id))
        const pregacoesIds = pregacoesDoDistrito.map((p: any) => p.id)
        
        // Avaliações do distrito
        const avaliacoesDoDistrito = avaliacoes.filter((a: any) => pregacoesIds.includes(a.pregacao_id))

        // Calcular top pregadores do distrito
        const pregadoresDoDistrito = usuarios.filter((u: any) => {
          const perfis = u.perfis || []
          return perfis.includes('pregador') && !perfis.includes('membro_associacao')
        })

        const pregadoresComMedia = pregadoresDoDistrito.map((pregador: any) => {
          const pregacoesDoPregador = pregacoesDoDistrito.filter((p: any) => p.pregador_id === pregador.id)
          const pregacoesIds = pregacoesDoPregador.map((p: any) => p.id)
          const avaliacoesDoPregador = avaliacoesDoDistrito.filter((a: any) => pregacoesIds.includes(a.pregacao_id))
          
          const media = avaliacoesDoPregador.length > 0
            ? avaliacoesDoPregador.reduce((sum: number, a: any) => sum + a.nota, 0) / avaliacoesDoPregador.length
            : 0

          return {
            ...pregador,
            media_avaliacoes: media,
            total_pregacoes: pregacoesDoPregador.length,
            total_avaliacoes: avaliacoesDoPregador.length
          }
        })

        const top5Pregadores = pregadoresComMedia
          .filter((p: any) => p.total_avaliacoes > 0)
          .sort((a: any, b: any) => b.media_avaliacoes - a.media_avaliacoes)
          .slice(0, 5)

        // Calcular igrejas mais avaliadoras (membros mais engajados)
        const igrejasComAvaliacoes = igrejasDoDistrito.map((igreja: any) => {
          // Contar avaliações feitas por membros dessa igreja
          const avaliacoesDaIgreja = avaliacoesDoDistrito.filter((a: any) => {
            // Aqui precisamos verificar se o avaliador pertence à igreja
            // Como não temos essa info direta, vamos contar avaliações de pregações NA igreja
            const pregacao = pregacoes.find((p: any) => p.id === a.pregacao_id)
            return pregacao && pregacao.igreja_id === igreja.id
          })

          return {
            ...igreja,
            total_avaliacoes: avaliacoesDaIgreja.length
          }
        })

        const top5Igrejas = igrejasComAvaliacoes
          .filter((i: any) => i.total_avaliacoes > 0)
          .sort((a: any, b: any) => b.total_avaliacoes - a.total_avaliacoes)
          .slice(0, 5)

        // Minhas próprias pregações (pastor também prega)
        const minhasPregacoesFuturas = pregacoes
          .filter((p: any) => p.pregador_id === user?.id && new Date(p.data_pregacao) >= now)
          .sort((a: any, b: any) => new Date(a.data_pregacao).getTime() - new Date(b.data_pregacao).getTime())

        const minhasPregacoesPassadas = pregacoes
          .filter((p: any) => p.pregador_id === user?.id && new Date(p.data_pregacao) < now)
          .sort((a: any, b: any) => new Date(b.data_pregacao).getTime() - new Date(a.data_pregacao).getTime())
          .slice(0, 5)
          .map((p: any) => {
            const avaliacoesP = avaliacoes.filter((a: any) => a.pregacao_id === p.id)
            const media = avaliacoesP.length > 0
              ? avaliacoesP.reduce((sum: number, a: any) => sum + a.nota, 0) / avaliacoesP.length
              : null
            return { ...p, avaliacao_media: media }
          })

        // Estatísticas do distrito
        const mediaAvaliacoesDistrito = avaliacoesDoDistrito.length > 0
          ? avaliacoesDoDistrito.reduce((sum: number, a: any) => sum + a.nota, 0) / avaliacoesDoDistrito.length
          : 0

        const avaliacoesEsteMes = avaliacoesDoDistrito.filter((a: any) => {
          const data = new Date(a.created_at)
          return data.getMonth() === now.getMonth() && data.getFullYear() === now.getFullYear()
        }).length

        setTopPregadores(top5Pregadores)
        setTopIgrejasAvaliadoras(top5Igrejas)
        setMinhasPregacoes(minhasPregacoesFuturas)
        setHistoricoPregacoes(minhasPregacoesPassadas)
        setStats({
          mediaAvaliacoesDistrito,
          totalPregadores: pregadoresDoDistrito.length,
          totalIgrejas: igrejasDoDistrito.length,
          avaliacoesEsteMes,
          totalPregacoes: 0,
          totalAvaliacoes: 0,
          mediaAvaliacoes: 0,
          totalTematicas: 0,
          pregacoesEsteMes: 0,
          taxaParticipacao: 0
        })
      }
      // ============= DASHBOARD PARA MEMBRO DA ASSOCIAÇÃO =============
      else if (isMembroAssociacao) {
        // Calcular estatísticas gerais
        const pregacoesEsteMes = pregacoes.filter((p: any) => {
          const data = new Date(p.data_pregacao)
          return data.getMonth() === now.getMonth() && data.getFullYear() === now.getFullYear()
        })

        // Contar pregadores: têm perfil 'pregador' mas NÃO são pastor_distrital nem membro_associacao
        const pregadores = usuarios.filter((u: any) => {
          const perfis = u.perfis || []
          const temPregador = perfis.includes('pregador')
          const ehPastorDistrital = perfis.includes('pastor_distrital')
          const ehMembroAssociacao = perfis.includes('membro_associacao')
          
          return temPregador && !ehPastorDistrital && !ehMembroAssociacao
        })

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

        // Calcular Top 5 Distritos por média de avaliação
        if (distritos && distritos.length > 0) {
          const distritosComMedia = distritos.map((distrito: any) => {
            // Pegar todas as igrejas do distrito
            const igrejasDoDistrito = igrejas.filter((i: any) => i.distrito_id === distrito.id)
            const igrejasIds = igrejasDoDistrito.map((i: any) => i.id)
            
            // Pegar todas as pregações dessas igrejas
            const pregacoesDoDistrito = pregacoes.filter((p: any) => igrejasIds.includes(p.igreja_id))
            const pregacoesIds = pregacoesDoDistrito.map((p: any) => p.id)
            
            // Pegar avaliações dessas pregações
            const avaliacoesDoDistrito = avaliacoes.filter((a: any) => pregacoesIds.includes(a.pregacao_id))
            
            const mediaDistrito = avaliacoesDoDistrito.length > 0
              ? avaliacoesDoDistrito.reduce((sum: number, a: any) => sum + a.nota, 0) / avaliacoesDoDistrito.length
              : 0
            
            return {
              ...distrito,
              mediaAvaliacoes: mediaDistrito,
              totalAvaliacoes: avaliacoesDoDistrito.length,
              totalPregacoes: pregacoesDoDistrito.length,
              totalIgrejas: igrejasDoDistrito.length
            }
          })
          
          // Ordenar por média de avaliação e pegar top 5
          const top5 = distritosComMedia
            .filter((d: any) => d.totalAvaliacoes > 0)
            .sort((a: any, b: any) => b.mediaAvaliacoes - a.mediaAvaliacoes)
            .slice(0, 5)
          
          setTopDistritos(top5)
        }
      }

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
      {/* Dashboard para Pregador */}
      {isPregador && !isPastorDistrital && !isMembroAssociacao && (
        <DashboardPregador
          minhasPregacoes={minhasPregacoes}
          historicoPregacoes={historicoPregacoes}
          minhasAvaliacoes={minhasAvaliacoes}
          stats={stats as any}
        />
      )}

      {/* Dashboard para Pastor Distrital */}
      {isPastorDistrital && !isMembroAssociacao && (
        <DashboardPastor
          topPregadores={topPregadores}
          topIgrejasAvaliadoras={topIgrejasAvaliadoras}
          minhasPregacoes={minhasPregacoes}
          historicoPregacoes={historicoPregacoes}
          stats={stats as any}
        />
      )}

      {/* Dashboard para Membro da Associação */}
      {isMembroAssociacao && (
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
                  {stats.totalIgrejas} igrejas na associação
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
                  Temáticas Disponíveis
                </CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTematicas}</div>
              </CardContent>
            </Card>
          </div>

          {/* Top 5 Distritos */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <CardTitle>Top 5 Distritos - Melhores Avaliações</CardTitle>
              </div>
              <CardDescription>
                Distritos com pregadores melhor avaliados na associação
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topDistritos.length > 0 ? (
                <div className="space-y-4">
                  {topDistritos.map((distrito, index) => {
                    const medals = ['🥇', '🥈', '🥉', '🏅', '🏅']
                    const colors = [
                      'border-l-4 border-yellow-400 bg-yellow-50',
                      'border-l-4 border-gray-400 bg-gray-50',
                      'border-l-4 border-orange-400 bg-orange-50',
                      'border-l-4 border-blue-400 bg-blue-50',
                      'border-l-4 border-green-400 bg-green-50'
                    ]
                    
                    return (
                      <div
                        key={distrito.id}
                        className={`flex items-center justify-between p-4 rounded-lg ${colors[index]}`}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="text-3xl">{medals[index]}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{distrito.nome}</p>
                              <Badge variant={index === 0 ? 'default' : 'outline'}>
                                {index + 1}º Lugar
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <span>{distrito.totalIgrejas} {distrito.totalIgrejas === 1 ? 'igreja' : 'igrejas'}</span>
                              <span>•</span>
                              <span>{distrito.totalPregacoes} {distrito.totalPregacoes === 1 ? 'pregação' : 'pregações'}</span>
                              <span>•</span>
                              <span>{distrito.totalAvaliacoes} {distrito.totalAvaliacoes === 1 ? 'avaliação' : 'avaliações'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                            <span className="text-xl font-bold">{distrito.mediaAvaliacoes.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  <Trophy className="mx-auto h-12 w-12 mb-3 opacity-50" />
                  <p>Ainda não há avaliações suficientes para gerar o ranking</p>
                  <p className="text-sm mt-1">Os distritos aparecerão aqui conforme as pregações forem avaliadas</p>
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
      )}
    </AppLayout>
  )
}
