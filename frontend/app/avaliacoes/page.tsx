'use client'

import { useState, useEffect } from 'react'
import { Star, Search, Calendar, Users, TrendingUp, Trash2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'

interface Avaliacao {
  id: string
  pregacao_id: string
  pregacao?: {
    data_pregacao: string
    horario_pregacao: string
    culto_tipo: string
    igreja?: { nome: string }
    pregador?: { nome_completo: string }
  }
  avaliador_id: string
  avaliador?: { nome_completo: string }
  nota: number
  comentario?: string
  anonima: boolean
  created_at: string
}

export default function AvaliacoesPage() {
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterNota, setFilterNota] = useState<number | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingAvaliacao, setDeletingAvaliacao] = useState<Avaliacao | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const data = await api.get('/avaliacoes/').then(r => r.data)
      setAvaliacoes(data)
    } catch (err) {
      console.error('Erro ao carregar avaliações:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!deletingAvaliacao) return
    try {
      setSubmitting(true)
      await api.delete(`/avaliacoes/${deletingAvaliacao.id}`)
      await loadData()
      setDeleteDialogOpen(false)
      setDeletingAvaliacao(null)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao excluir avaliação')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredAvaliacoes = avaliacoes.filter(avaliacao => {
    const matchesSearch =
      avaliacao.pregacao?.pregador?.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      avaliacao.pregacao?.igreja?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      avaliacao.avaliador?.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      avaliacao.comentario?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesNota = filterNota === null || avaliacao.nota === filterNota

    return matchesSearch && matchesNota
  })

  const mediaGeral = avaliacoes.length > 0
    ? avaliacoes.reduce((sum, a) => sum + a.nota, 0) / avaliacoes.length
    : 0

  const distribuicao = [1, 2, 3, 4, 5].map(nota => ({
    nota,
    quantidade: avaliacoes.filter(a => a.nota === nota).length
  }))

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Avaliações</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie todas as avaliações das pregações
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Avaliações</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avaliacoes.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Média Geral</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mediaGeral.toFixed(1)}</div>
              <div className="flex items-center gap-1 mt-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.floor(mediaGeral)
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
              <CardTitle className="text-sm font-medium">Avaliações 5 Estrelas</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {avaliacoes.filter(a => a.nota === 5).length}
              </div>
              <p className="text-xs text-muted-foreground">
                {avaliacoes.length > 0
                  ? `${Math.round((avaliacoes.filter(a => a.nota === 5).length / avaliacoes.length) * 100)}%`
                  : '0%'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Anônimas</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {avaliacoes.filter(a => a.anonima).length}
              </div>
              <p className="text-xs text-muted-foreground">
                {avaliacoes.length > 0
                  ? `${Math.round((avaliacoes.filter(a => a.anonima).length / avaliacoes.length) * 100)}%`
                  : '0%'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Distribuição de Notas */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Notas</CardTitle>
            <CardDescription>
              Percentual de cada nota recebida
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {distribuicao.reverse().map((item) => {
                const percentual = avaliacoes.length > 0
                  ? (item.quantidade / avaliacoes.length) * 100
                  : 0

                return (
                  <div key={item.nota} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {[...Array(item.nota)].map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{item.quantidade} avaliações</span>
                        <Badge variant="outline">{percentual.toFixed(0)}%</Badge>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-400 h-2 rounded-full transition-all"
                        style={{ width: `${percentual}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* List */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Avaliações</CardTitle>
            <CardDescription>
              Todas as avaliações cadastradas no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search and Filters */}
            <div className="mb-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por pregador, avaliador, igreja ou comentário..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant={filterNota === null ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterNota(null)}
                >
                  Todas
                </Button>
                {[5, 4, 3, 2, 1].map((nota) => (
                  <Button
                    key={nota}
                    variant={filterNota === nota ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterNota(nota)}
                  >
                    {nota} ⭐
                  </Button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center p-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAvaliacoes.map((avaliacao) => (
                  <div
                    key={avaliacao.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        {/* Rating */}
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-5 w-5 ${
                                  i < avaliacao.nota
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          {avaliacao.anonima && (
                            <Badge variant="outline">Anônima</Badge>
                          )}
                        </div>

                        {/* Pregação Info */}
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              Pregador: {avaliacao.pregacao?.pregador?.nome_completo}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {formatDate(avaliacao.pregacao?.data_pregacao || '')} às {avaliacao.pregacao?.horario_pregacao}
                            </span>
                          </div>
                          <div className="text-muted-foreground">
                            Igreja: {avaliacao.pregacao?.igreja?.nome}
                          </div>
                          <div className="text-muted-foreground">
                            {!avaliacao.anonima && `Avaliador: ${avaliacao.avaliador?.nome_completo}`}
                          </div>
                        </div>

                        {/* Comentário */}
                        {avaliacao.comentario && (
                          <div className="bg-muted/50 p-3 rounded">
                            <p className="text-sm italic">"{avaliacao.comentario}"</p>
                          </div>
                        )}

                        {/* Meta */}
                        <p className="text-xs text-muted-foreground">
                          Avaliada em {formatDate(avaliacao.created_at)}
                        </p>
                      </div>

                      {/* Actions */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDeletingAvaliacao(avaliacao)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {filteredAvaliacoes.length === 0 && (
                  <div className="text-center p-12">
                    <Star className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhuma avaliação encontrada</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogClose onClose={() => setDeleteDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta avaliação?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
