'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Plus, Edit, Trash2, Search } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'

interface Tematica {
  id: string
  titulo: string
  associacao_id: string
  tipo_recorrencia: string
  descricao?: string
  referencias_biblicas?: string
  ativa: boolean
  created_at: string
  total_pregacoes?: number
}

interface TematicaFormData {
  titulo: string
  associacao_id: string
  tipo_recorrencia: string
  descricao?: string
  referencias_biblicas?: string
  ativa: boolean
}

interface Associacao {
  id: string
  nome: string
}

export default function TematicasPage() {
  const [tematicas, setTematicas] = useState<Tematica[]>([])
  const [associacoes, setAssociacoes] = useState<Associacao[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingTematica, setEditingTematica] = useState<Tematica | null>(null)
  const [deletingTematica, setDeletingTematica] = useState<Tematica | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState<TematicaFormData>({
    titulo: '',
    associacao_id: '',
    tipo_recorrencia: 'data_especifica',
    descricao: '',
    referencias_biblicas: '',
    ativa: true
  })

  // Opções de tipo de recorrência
  const tiposRecorrencia = [
    { value: 'data_especifica', label: 'Data Específica' },
    { value: 'semanal', label: 'Semanal' },
    { value: 'mensal', label: 'Mensal' }
  ]

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [tematicasData, associacoesData] = await Promise.all([
        api.get('/tematicas/').then(r => r.data),
        api.get('/associacoes/').then(r => r.data)
      ])
      setTematicas(tematicasData)
      setAssociacoes(associacoesData)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleOpenDialog(tematica?: Tematica) {
    if (tematica) {
      setEditingTematica(tematica)
      setFormData({
        titulo: tematica.titulo,
        associacao_id: tematica.associacao_id,
        tipo_recorrencia: tematica.tipo_recorrencia,
        descricao: tematica.descricao || '',
        referencias_biblicas: tematica.referencias_biblicas || '',
        ativa: tematica.ativa
      })
    } else {
      setEditingTematica(null)
      setFormData({
        titulo: '',
        associacao_id: '',
        tipo_recorrencia: 'data_especifica',
        descricao: '',
        referencias_biblicas: '',
        ativa: true
      })
    }
    setDialogOpen(true)
  }

  function handleCloseDialog() {
    setDialogOpen(false)
    setEditingTematica(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      setSubmitting(true)
      if (editingTematica) {
        await api.put(`/tematicas/${editingTematica.id}`, formData)
      } else {
        await api.post('/tematicas/', formData)
      }
      await loadData()
      handleCloseDialog()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao salvar temática')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deletingTematica) return
    try {
      setSubmitting(true)
      await api.delete(`/tematicas/${deletingTematica.id}`)
      await loadData()
      setDeleteDialogOpen(false)
      setDeletingTematica(null)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao excluir temática')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredTematicas = tematicas.filter(tematica =>
    tematica.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tematica.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tematica.referencias_biblicas?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Temáticas</h1>
            <p className="text-muted-foreground">
              Gerencie as temáticas das pregações
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Temática
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Temáticas</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tematicas.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Temáticas Ativas</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tematicas.filter(t => t.ativa).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Pregações</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tematicas.reduce((sum, t) => sum + (t.total_pregacoes || 0), 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* List */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Temáticas</CardTitle>
            <CardDescription>
              Todas as temáticas cadastradas no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título, descrição ou referências..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center p-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTematicas.map((tematica) => (
                  <div
                    key={tematica.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{tematica.titulo}</h3>
                          <Badge variant={tematica.ativa ? 'default' : 'outline'}>
                            {tematica.ativa ? 'Ativa' : 'Inativa'}
                          </Badge>
                          {tematica.total_pregacoes && tematica.total_pregacoes > 0 && (
                            <Badge variant="outline">
                              {tematica.total_pregacoes} pregações
                            </Badge>
                          )}
                        </div>

                        {tematica.descricao && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {tematica.descricao}
                          </p>
                        )}

                        {tematica.referencias_biblicas && (
                          <div className="flex items-center gap-2 text-sm">
                            <BookOpen className="h-4 w-4 text-primary" />
                            <span className="font-medium text-primary">
                              {tematica.referencias_biblicas}
                            </span>
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground mt-2">
                          Criada em {formatDate(tematica.created_at)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(tematica)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDeletingTematica(tematica)
                            setDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredTematicas.length === 0 && (
                  <div className="text-center p-12">
                    <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhuma temática encontrada</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogClose onClose={handleCloseDialog} />
          <DialogHeader>
            <DialogTitle>
              {editingTematica ? 'Editar Temática' : 'Nova Temática'}
            </DialogTitle>
            <DialogDescription>
              {editingTematica
                ? 'Atualize as informações da temática'
                : 'Preencha os dados para cadastrar uma nova temática'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                required
                placeholder="Ex: O Amor de Deus"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="associacao_id">Associação *</Label>
              <Select
                id="associacao_id"
                value={formData.associacao_id}
                onChange={(e) => setFormData({ ...formData, associacao_id: e.target.value })}
                required
              >
                <option value="">Selecione uma associação</option>
                {associacoes.map((associacao) => (
                  <option key={associacao.id} value={associacao.id}>
                    {associacao.nome}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo_recorrencia">Tipo de Recorrência *</Label>
              <Select
                id="tipo_recorrencia"
                value={formData.tipo_recorrencia}
                onChange={(e) => setFormData({ ...formData, tipo_recorrencia: e.target.value })}
                required
              >
                {tiposRecorrencia.map((tipo) => (
                  <option key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição opcional da temática..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="referencias_biblicas">Referências Bíblicas</Label>
              <Input
                id="referencias_biblicas"
                value={formData.referencias_biblicas}
                onChange={(e) => setFormData({ ...formData, referencias_biblicas: e.target.value })}
                placeholder="Ex: João 3:16, Romanos 8:28"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ativa"
                checked={formData.ativa}
                onChange={(e) => setFormData({ ...formData, ativa: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="ativa">Temática ativa</Label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? 'Salvando...' : editingTematica ? 'Atualizar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogClose onClose={() => setDeleteDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a temática "{deletingTematica?.titulo}"?
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
