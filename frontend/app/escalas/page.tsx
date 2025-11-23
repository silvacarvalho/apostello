'use client'

import { useState, useEffect } from 'react'
import { Calendar, Plus, Download, Users, Clock, MapPin } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { escalasApi } from '@/lib/api'
import { formatDate, formatTime, getDayOfWeek } from '@/lib/utils'

export default function EscalasPage() {
  const [escalas, setEscalas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEscala, setSelectedEscala] = useState<any>(null)

  useEffect(() => {
    loadEscalas()
  }, [])

  async function loadEscalas() {
    try {
      setLoading(true)
      const data = await escalasApi.listar()
      setEscalas(data)
    } catch (err) {
      console.error('Erro ao carregar escalas:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleGerarEscala() {
    const mes = new Date().getMonth() + 1
    const ano = new Date().getFullYear()

    try {
      await escalasApi.gerar({
        mes,
        ano,
        distrito_id: 'mock-distrito-id' // Será dinâmico com auth
      })
      loadEscalas()
      alert('Escala gerada com sucesso!')
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao gerar escala')
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Escalas de Pregação</h1>
            <p className="text-muted-foreground">
              Gerencie e visualize as escalas de pregação
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
            <Button onClick={handleGerarEscala}>
              <Plus className="mr-2 h-4 w-4" />
              Gerar Escala
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Escalas Ativas
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">
                Este mês
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pregações Agendadas
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">156</div>
              <p className="text-xs text-muted-foreground">
                Próximos 30 dias
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Igrejas Atendidas
              </CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground">
                No distrito
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Taxa de Confirmação
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">96%</div>
              <p className="text-xs text-muted-foreground">
                Pregadores confirmados
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Escalas List */}
        <Card>
          <CardHeader>
            <CardTitle>Escalas Mensais</CardTitle>
            <CardDescription>
              Visualize e gerencie as escalas de pregação por mês
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : escalas.length > 0 ? (
              <div className="space-y-4">
                {escalas.map((escala) => (
                  <div
                    key={escala.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <p className="font-semibold">
                          {escala.mes}/{escala.ano}
                        </p>
                        <Badge variant={escala.status === 'PUBLICADA' ? 'default' : 'outline'}>
                          {escala.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{escala.total_pregacoes} pregações</span>
                        <span>•</span>
                        <span>{escala.total_pregadores} pregadores</span>
                        <span>•</span>
                        <span>Criada em {formatDate(escala.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Visualizar
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-12">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Nenhuma escala encontrada
                </p>
                <Button onClick={handleGerarEscala}>
                  <Plus className="mr-2 h-4 w-4" />
                  Gerar Primeira Escala
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Próximas Pregações */}
        <Card>
          <CardHeader>
            <CardTitle>Próximas Pregações</CardTitle>
            <CardDescription>
              Pregações programadas para as próximas semanas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  data: '2025-11-23',
                  horario: '10:00',
                  igreja: 'Igreja Central',
                  pregador: 'João Silva',
                  culto: 'Culto Divino',
                  status: 'CONFIRMADO'
                },
                {
                  data: '2025-11-23',
                  horario: '19:30',
                  igreja: 'Igreja Norte',
                  pregador: 'Maria Santos',
                  culto: 'Culto Jovem',
                  status: 'PENDENTE'
                },
                {
                  data: '2025-11-24',
                  horario: '10:00',
                  igreja: 'Igreja Sul',
                  pregador: 'Pedro Oliveira',
                  culto: 'Culto Divino',
                  status: 'CONFIRMADO'
                },
              ].map((pregacao, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-primary/10 p-3 text-center">
                      <p className="text-2xl font-bold text-primary">
                        {new Date(pregacao.data).getDate()}
                      </p>
                      <p className="text-xs text-muted-foreground uppercase">
                        {getDayOfWeek(pregacao.data).substring(0, 3)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">{pregacao.culto}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{pregacao.horario}</span>
                        <span>•</span>
                        <MapPin className="h-3 w-3" />
                        <span>{pregacao.igreja}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-3 w-3" />
                        <span>{pregacao.pregador}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant={pregacao.status === 'CONFIRMADO' ? 'default' : 'outline'}>
                    {pregacao.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
