'use client'

import { useState, useEffect } from 'react'
import { Activity, Clock, User, Edit, Plus, Trash2, Filter, FileDown } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/components/ui/toast'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { exportarAtividadesPDF } from '@/lib/pdf-export'

interface LogAtividade {
  id: string
  acao: string
  tipo_entidade: string
  entidade_id?: string
  detalhes?: any
  ip_address?: string
  user_agent?: string
  created_at: string
}

export function AtividadesHistorico() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [atividades, setAtividades] = useState<LogAtividade[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('todos')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    if (user) {
      loadAtividades()
    }
  }, [user, filter, page])

  async function loadAtividades() {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      })

      if (filter !== 'todos') {
        params.append('acao', filter)
      }

      const data = await api.get(`/logs/usuario/${user?.id}?${params}`).then(r => r.data)

      if (page === 1) {
        setAtividades(data)
      } else {
        setAtividades(prev => [...prev, ...data])
      }

      setHasMore(data.length === 20)
    } catch (err) {
      console.error('Erro ao carregar atividades:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleExportPDF() {
    if (!user || atividades.length === 0) {
      showToast('error', 'Não há atividades para exportar')
      return
    }

    try {
      exportarAtividadesPDF(atividades, user.nome_completo, filter)
      showToast('success', 'PDF exportado com sucesso!')
    } catch (err) {
      console.error('Erro ao exportar PDF:', err)
      showToast('error', 'Erro ao exportar PDF')
    }
  }

  function getIconByAction(acao: string) {
    switch (acao.toLowerCase()) {
      case 'criar':
      case 'cadastrar':
        return <Plus className="h-4 w-4" />
      case 'editar':
      case 'atualizar':
        return <Edit className="h-4 w-4" />
      case 'excluir':
      case 'deletar':
        return <Trash2 className="h-4 w-4" />
      case 'login':
      case 'logout':
        return <User className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  function getColorByAction(acao: string) {
    switch (acao.toLowerCase()) {
      case 'criar':
      case 'cadastrar':
        return 'bg-green-500'
      case 'editar':
      case 'atualizar':
        return 'bg-blue-500'
      case 'excluir':
      case 'deletar':
        return 'bg-red-500'
      case 'login':
        return 'bg-purple-500'
      case 'logout':
        return 'bg-gray-500'
      default:
        return 'bg-orange-500'
    }
  }

  function getActionLabel(acao: string, entidade: string) {
    const acaoMap: Record<string, string> = {
      'criar': 'criou',
      'cadastrar': 'cadastrou',
      'editar': 'editou',
      'atualizar': 'atualizou',
      'excluir': 'excluiu',
      'deletar': 'deletou',
      'login': 'fez login',
      'logout': 'fez logout',
      'visualizar': 'visualizou',
      'exportar': 'exportou'
    }

    const acaoFormatada = acaoMap[acao.toLowerCase()] || acao
    const entidadeMap: Record<string, string> = {
      'usuario': 'usuário',
      'igreja': 'igreja',
      'distrito': 'distrito',
      'associacao': 'associação',
      'pregacao': 'pregação',
      'avaliacao': 'avaliação',
      'tematica': 'temática',
      'escala': 'escala'
    }

    const entidadeFormatada = entidadeMap[entidade.toLowerCase()] || entidade

    return `${acaoFormatada} ${entidadeFormatada}`
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Histórico de Atividades</h3>
          <p className="text-sm text-muted-foreground">
            Suas últimas {atividades.length} atividades no sistema
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={atividades.length === 0}
          >
            <FileDown className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>

          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value)
              setPage(1)
            }}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="todos">Todas as ações</option>
            <option value="criar">Criações</option>
            <option value="editar">Edições</option>
            <option value="excluir">Exclusões</option>
            <option value="login">Login/Logout</option>
          </select>
        </div>
      </div>

      {/* Timeline */}
      {loading && page === 1 ? (
        <div className="flex items-center justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative space-y-4">
            {/* Vertical Line */}
            <div className="absolute left-5 top-0 h-full w-0.5 bg-border" />

            {atividades.map((atividade, index) => (
              <div key={atividade.id} className="relative flex gap-4">
                {/* Icon */}
                <div
                  className={`relative z-10 h-10 w-10 rounded-full ${getColorByAction(atividade.acao)} flex items-center justify-center text-white flex-shrink-0`}
                >
                  {getIconByAction(atividade.acao)}
                </div>

                {/* Content */}
                <div className="flex-1 pb-8">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">
                              {getActionLabel(atividade.acao, atividade.tipo_entidade)}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {atividade.tipo_entidade}
                            </Badge>
                          </div>

                          {atividade.detalhes && (
                            <p className="text-sm text-muted-foreground">
                              {typeof atividade.detalhes === 'string'
                                ? atividade.detalhes
                                : JSON.stringify(atividade.detalhes)}
                            </p>
                          )}

                          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(atividade.created_at)}
                            </span>
                            {atividade.ip_address && (
                              <span>IP: {atividade.ip_address}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="text-center pt-4">
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={loading}
                className="px-4 py-2 rounded-md border hover:bg-accent transition-colors"
              >
                {loading ? 'Carregando...' : 'Carregar mais'}
              </button>
            </div>
          )}

          {atividades.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Activity className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma atividade registrada</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
