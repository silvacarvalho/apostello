'use client'

import { useState, useEffect } from 'react'
import { Building2, Users, Church, MapPin, TrendingUp, Activity } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AnalyticsCharts } from '@/components/charts/AnalyticsCharts'
import { AdvancedFilters } from '@/components/dashboard/AdvancedFilters'
import api from '@/lib/api'

interface AssociacaoStats {
  id: string
  nome: string
  sigla?: string
  total_distritos: number
  total_igrejas: number
  total_membros: number
  total_pregacoes: number
  media_avaliacoes?: number
  crescimento_mensal?: number
}

interface FilterState {
  dataInicio?: string
  dataFim?: string
  distritoId?: string
  igrejaId?: string
}

export function AssociacaoAnalytics() {
  const [stats, setStats] = useState<AssociacaoStats[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('30')  // dias
  const [filters, setFilters] = useState<FilterState>({})

  useEffect(() => {
    loadStats()
  }, [selectedPeriod, filters])

  async function loadStats() {
    try {
      setLoading(true)

      // Construir query params
      const params = new URLSearchParams({ periodo: selectedPeriod })

      if (filters.dataInicio) params.append('dataInicio', filters.dataInicio)
      if (filters.dataFim) params.append('dataFim', filters.dataFim)
      if (filters.distritoId) params.append('distritoId', filters.distritoId)
      if (filters.igrejaId) params.append('igrejaId', filters.igrejaId)

      const data = await api.get(`/associacoes/analytics?${params}`).then(r => r.data)
      setStats(data)
    } catch (err) {
      console.error('Erro ao carregar analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleFiltersChange(newFilters: FilterState) {
    setFilters(newFilters)
  }

  function handleClearFilters() {
    setFilters({})
  }

  const totals = stats.reduce((acc, assoc) => ({
    distritos: acc.distritos + assoc.total_distritos,
    igrejas: acc.igrejas + assoc.total_igrejas,
    membros: acc.membros + assoc.total_membros,
    pregacoes: acc.pregacoes + assoc.total_pregacoes
  }), { distritos: 0, igrejas: 0, membros: 0, pregacoes: 0 })

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Analytics por Associação</h2>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="rounded-md border px-3 py-2"
        >
          <option value="7">Últimos 7 dias</option>
          <option value="30">Últimos 30 dias</option>
          <option value="90">Últimos 90 dias</option>
          <option value="365">Último ano</option>
        </select>
      </div>

      {/* Advanced Filters */}
      <AdvancedFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClearFilters={handleClearFilters}
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Distritos</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.distritos}</div>
            <p className="text-xs text-muted-foreground">
              {stats.length} associações
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Igrejas</CardTitle>
            <Church className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.igrejas}</div>
            <p className="text-xs text-muted-foreground">
              Média de {Math.round(totals.igrejas / stats.length || 0)} por associação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Membros</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.membros}</div>
            <p className="text-xs text-muted-foreground">
              Média de {Math.round(totals.membros / stats.length || 0)} por associação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pregações</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.pregacoes}</div>
            <p className="text-xs text-muted-foreground">
              No período selecionado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <AnalyticsCharts stats={stats} periodo={selectedPeriod} />

      {/* Detailed List */}
      <Card>
        <CardHeader>
          <CardTitle>Desempenho por Associação</CardTitle>
          <CardDescription>
            Métricas detalhadas de cada associação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.map((assoc) => (
              <div
                key={assoc.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{assoc.nome}</p>
                      {assoc.sigla && (
                        <Badge variant="outline">{assoc.sigla}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {assoc.total_distritos} distritos
                      </span>
                      <span className="flex items-center gap-1">
                        <Church className="h-3 w-3" />
                        {assoc.total_igrejas} igrejas
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {assoc.total_membros} membros
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-2xl font-bold">{assoc.total_pregacoes}</p>
                    <p className="text-xs text-muted-foreground">pregações</p>
                  </div>

                  {assoc.media_avaliacoes !== undefined && (
                    <div className="text-right">
                      <p className="text-2xl font-bold text-yellow-600">
                        {assoc.media_avaliacoes.toFixed(1)}⭐
                      </p>
                      <p className="text-xs text-muted-foreground">média</p>
                    </div>
                  )}

                  {assoc.crescimento_mensal !== undefined && (
                    <div className="text-right">
                      <p className={`text-2xl font-bold flex items-center gap-1 ${
                        assoc.crescimento_mensal >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        <TrendingUp className="h-5 w-5" />
                        {assoc.crescimento_mensal >= 0 ? '+' : ''}
                        {assoc.crescimento_mensal}%
                      </p>
                      <p className="text-xs text-muted-foreground">crescimento</p>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {stats.length === 0 && (
              <div className="text-center p-12">
                <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum dado disponível</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
