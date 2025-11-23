'use client'

import { useState, useEffect } from 'react'
import { Bell, Check, Trash2, Filter, Calendar, Star, Users, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/lib/auth'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'

interface Notificacao {
  id: string
  tipo: 'whatsapp' | 'sms' | 'push' | 'email'
  titulo: string
  mensagem: string
  lida: boolean
  data_envio?: string
  created_at: string
}

export function NotificationCenter() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'todas' | 'nao_lidas' | 'lidas'>('todas')

  useEffect(() => {
    if (user) {
      loadNotificacoes()

      // Polling a cada 30 segundos para novas notificações
      const interval = setInterval(loadNotificacoes, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  async function loadNotificacoes() {
    try {
      setLoading(true)
      const data = await api.get(`/notificacoes/usuario/${user?.id}`).then(r => r.data)
      setNotificacoes(data)
    } catch (err) {
      console.error('Erro ao carregar notificações:', err)
    } finally {
      setLoading(false)
    }
  }

  async function marcarComoLida(id: string) {
    try {
      await api.put(`/notificacoes/${id}/marcar-lida`)
      setNotificacoes(prev =>
        prev.map(n => n.id === id ? { ...n, lida: true } : n)
      )
      showToast('success', 'Notificação marcada como lida')
    } catch (err: any) {
      showToast('error', 'Erro ao marcar notificação')
    }
  }

  async function marcarTodasComoLidas() {
    try {
      await api.put(`/notificacoes/usuario/${user?.id}/marcar-todas-lidas`)
      setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })))
      showToast('success', 'Todas as notificações foram marcadas como lidas')
    } catch (err: any) {
      showToast('error', 'Erro ao marcar notificações')
    }
  }

  async function excluirNotificacao(id: string) {
    try {
      await api.delete(`/notificacoes/${id}`)
      setNotificacoes(prev => prev.filter(n => n.id !== id))
      showToast('success', 'Notificação excluída')
    } catch (err: any) {
      showToast('error', 'Erro ao excluir notificação')
    }
  }

  const notificacoesFiltradas = notificacoes.filter(n => {
    if (filter === 'lidas') return n.lida
    if (filter === 'nao_lidas') return !n.lida
    return true
  })

  const naoLidas = notificacoes.filter(n => !n.lida).length

  function getIconByType(tipo: string) {
    switch (tipo) {
      case 'whatsapp':
      case 'sms':
        return <Users className="h-4 w-4" />
      case 'push':
        return <Bell className="h-4 w-4" />
      case 'email':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  function getColorByType(tipo: string) {
    switch (tipo) {
      case 'whatsapp':
        return 'bg-green-500'
      case 'sms':
        return 'bg-blue-500'
      case 'push':
        return 'bg-purple-500'
      case 'email':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notificações</h2>
          <p className="text-sm text-muted-foreground">
            {naoLidas > 0 ? `${naoLidas} não lida${naoLidas > 1 ? 's' : ''}` : 'Todas as notificações lidas'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {naoLidas > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={marcarTodasComoLidas}
            >
              <Check className="h-4 w-4 mr-2" />
              Marcar todas como lidas
            </Button>
          )}

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="todas">Todas</option>
            <option value="nao_lidas">Não lidas</option>
            <option value="lidas">Lidas</option>
          </select>
        </div>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-2">
          {notificacoesFiltradas.map((notif) => (
            <Card
              key={notif.id}
              className={`transition-colors ${
                !notif.lida ? 'border-primary/50 bg-primary/5' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`h-10 w-10 rounded-full ${getColorByType(notif.tipo)} flex items-center justify-center text-white flex-shrink-0`}>
                    {getIconByType(notif.tipo)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{notif.titulo}</h3>
                          {!notif.lida && (
                            <Badge className="bg-primary text-white">Nova</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notif.mensagem}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDate(notif.created_at)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        {!notif.lida && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => marcarComoLida(notif.id)}
                            title="Marcar como lida"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => excluirNotificacao(notif.id)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {notificacoesFiltradas.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Bell className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {filter === 'nao_lidas' ? 'Nenhuma notificação não lida' : 'Nenhuma notificação'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
