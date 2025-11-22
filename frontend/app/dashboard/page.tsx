'use client'

import { Calendar, Users, Star, TrendingUp } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const stats = [
  {
    title: 'Escalas Este Mês',
    value: '12',
    description: '+2 desde o mês passado',
    icon: Calendar,
    trend: 'up'
  },
  {
    title: 'Pregadores Ativos',
    value: '45',
    description: '8 novos este mês',
    icon: Users,
    trend: 'up'
  },
  {
    title: 'Avaliações Pendentes',
    value: '7',
    description: 'Vence em 3 dias',
    icon: Star,
    trend: 'neutral'
  },
  {
    title: 'Taxa de Participação',
    value: '94%',
    description: '+5% este mês',
    icon: TrendingUp,
    trend: 'up'
  },
]

export default function DashboardPage() {
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
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Próximas Pregações */}
        <Card>
          <CardHeader>
            <CardTitle>Próximas Pregações</CardTitle>
            <CardDescription>
              Suas pregações programadas para as próximas semanas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <p className="font-medium">Culto Divino</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Sábado, 25/11/2025</span>
                      <span>•</span>
                      <span>10:00h</span>
                      <span>•</span>
                      <span>Igreja Central</span>
                    </div>
                  </div>
                  <Badge>Confirmado</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Avaliações Recentes */}
        <Card>
          <CardHeader>
            <CardTitle>Avaliações Recentes</CardTitle>
            <CardDescription>
              Últimas avaliações recebidas dos membros
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { nota: 5, comentario: 'Mensagem muito edificante!', data: 'Há 2 dias' },
                { nota: 4, comentario: 'Boa fundamentação bíblica', data: 'Há 5 dias' },
                { nota: 5, comentario: 'Pregação inspiradora', data: 'Há 1 semana' },
              ].map((avaliacao, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="space-y-1">
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
                        {avaliacao.data}
                      </span>
                    </div>
                    <p className="text-sm">{avaliacao.comentario}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
