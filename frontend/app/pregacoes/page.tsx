'use client'

import { useState, useEffect } from 'react'
import { Calendar, Plus, Edit, Trash2, Search, Clock, MapPin, Users, CheckCircle } from 'lucide-react'
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

interface Pregacao {
  id: string
  escala_id: string
  data_pregacao: string
  horario_pregacao: string
  culto_tipo: string
  igreja_id: string
  igreja?: { nome: string }
  pregador_id: string
  pregador?: { nome_completo: string }
  tematica_id?: string
  tematica?: { titulo: string }
  observacoes?: string
  confirmada: boolean
  status: string
  created_at: string
}

interface PregacaoFormData {
  escala_id: string
  data_pregacao: string
  horario_pregacao: string
  culto_tipo: string
  igreja_id: string
  pregador_id: string
  tematica_id?: string
  observacoes?: string
  confirmada: boolean
}

export default function PregacoesPage() {
  const [pregacoes, setPregacoes] = useState<Pregacao[]>([])
  const [escalas, setEscalas] = useState<any[]>([])
  const [igrejas, setIgrejas] = useState<any[]>([])
  const [pregadores, setPregadores] = useState<any[]>([])
  const [tematicas, setTematicas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingPregacao, setEditingPregacao] = useState<Pregacao | null>(null)
  const [deletingPregacao, setDeletingPregacao] = useState<Pregacao | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState<PregacaoFormData>({
    escala_id: '',
    data_pregacao: '',
    horario_pregacao: '10:00',
    culto_tipo: 'CULTO_DIVINO',
    igreja_id: '',
    pregador_id: '',
    tematica_id: '',
    observacoes: '',
    confirmada: false
  })

  const cultoTipos = [
    { value: 'CULTO_DIVINO', label: 'Culto Divino' },
    { value: 'CULTO_JOVEM', label: 'Culto Jovem' },
    { value: 'CULTO_OBREIROS', label: 'Culto de Obreiros' },
    { value: 'PEQUENO_GRUPO', label: 'Pequeno Grupo' },
    { value: 'EVANGELISMO', label: 'Evangelismo' },
    { value: 'OUTRO', label: 'Outro' }
  ]

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [pregacoesData, escalasData, igrejasData, pregadoresData, tematicasData] = await Promise.all([
        api.get('/pregacoes/').then(r => r.data),
        api.get('/escalas/').then(r => r.data),
        api.get('/igrejas/').then(r => r.data),
        api.get('/membros/').then(r => r.data.filter((m: any) => m.perfis.includes('PREGADOR'))),
        api.get('/tematicas/').then(r => r.data)
      ])
      setPregacoes(pregacoesData)
      setEscalas(escalasData)
      setIgrejas(igrejasData)
      setPregadores(pregadoresData)
      setTematicas(tematicasData)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleOpenDialog(pregacao?: Pregacao) {
    if (pregacao) {
      setEditingPregacao(pregacao)
      setFormData({
        escala_id: pregacao.escala_id,
        data_pregacao: pregacao.data_pregacao,
        horario_pregacao: pregacao.horario_pregacao,
        culto_tipo: pregacao.culto_tipo,
        igreja_id: pregacao.igreja_id,
        pregador_id: pregacao.pregador_id,
        tematica_id: pregacao.tematica_id || '',
        observacoes: pregacao.observacoes || '',
        confirmada: pregacao.confirmada
      })
    } else {
      setEditingPregacao(null)
      setFormData({
        escala_id: escalas[0]?.id || '',
        data_pregacao: new Date().toISOString().split('T')[0],
        horario_pregacao: '10:00',
        culto_tipo: 'CULTO_DIVINO',
        igreja_id: igrejas[0]?.id || '',
        pregador_id: pregadores[0]?.id || '',
        tematica_id: '',
        observacoes: '',
        confirmada: false
      })
    }
    setDialogOpen(true)
  }

  function handleCloseDialog() {
    setDialogOpen(false)
    setEditingPregacao(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      setSubmitting(true)
      if (editingPregacao) {
        await api.put(`/pregacoes/${editingPregacao.id}`, formData)
      } else {
        await api.post('/pregacoes/', formData)
      }
      await loadData()
      handleCloseDialog()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao salvar pregação')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deletingPregacao) return
    try {
      setSubmitting(true)
      await api.delete(`/pregacoes/${deletingPregacao.id}`)
      await loadData()
      setDeleteDialogOpen(false)
      setDeletingPregacao(null)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao excluir pregação')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggleConfirmacao(pregacao: Pregacao) {
    try {
      await api.put(`/pregacoes/${pregacao.id}`, {
        ...pregacao,
        confirmada: !pregacao.confirmada
      })
      await loadData()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao atualizar confirmação')
    }
  }

  const filteredPregacoes = pregacoes.filter(pregacao =>
    pregacao.pregador?.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pregacao.igreja?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pregacao.tematica?.titulo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  function getCultoTipoLabel(tipo: string) {
    return cultoTipos.find(c => c.value === tipo)?.label || tipo
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Pregações</h1>
            <p className="text-muted-foreground">
              Gerencie as pregações agendadas
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Pregação
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Pregações</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pregacoes.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Confirmadas</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pregacoes.filter(p => p.confirmada).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Este Mês</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pregacoes.filter(p => {
                  const now = new Date()
                  const data = new Date(p.data_pregacao)
                  return data.getMonth() === now.getMonth() && data.getFullYear() === now.getFullYear()
                }).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Confirmação</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pregacoes.length > 0
                  ? Math.round((pregacoes.filter(p => p.confirmada).length / pregacoes.length) * 100)
                  : 0}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* List */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Pregações</CardTitle>
            <CardDescription>
              Todas as pregações cadastradas no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por pregador, igreja ou temática..."
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
                {filteredPregacoes.map((pregacao) => (
                  <div
                    key={pregacao.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        {/* Date Box */}
                        <div className="rounded-lg bg-primary/10 p-3 text-center min-w-[70px]">
                          <p className="text-2xl font-bold text-primary">
                            {new Date(pregacao.data_pregacao).getDate()}
                          </p>
                          <p className="text-xs text-muted-foreground uppercase">
                            {new Date(pregacao.data_pregacao).toLocaleDateString('pt-BR', { month: 'short' })}
                          </p>
                        </div>

                        {/* Details */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">
                              {getCultoTipoLabel(pregacao.culto_tipo)}
                            </h3>
                            <Badge variant={pregacao.confirmada ? 'default' : 'outline'}>
                              {pregacao.confirmada ? 'Confirmada' : 'Pendente'}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>{pregacao.horario_pregacao}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              <span>{pregacao.igreja?.nome}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span>{pregacao.pregador?.nome_completo}</span>
                            </div>
                            {pregacao.tematica && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <span>📖 {pregacao.tematica.titulo}</span>
                              </div>
                            )}
                          </div>

                          {pregacao.observacoes && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {pregacao.observacoes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleConfirmacao(pregacao)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(pregacao)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDeletingPregacao(pregacao)
                            setDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredPregacoes.length === 0 && (
                  <div className="text-center p-12">
                    <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhuma pregação encontrada</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogClose onClose={handleCloseDialog} />
          <DialogHeader>
            <DialogTitle>
              {editingPregacao ? 'Editar Pregação' : 'Nova Pregação'}
            </DialogTitle>
            <DialogDescription>
              {editingPregacao
                ? 'Atualize as informações da pregação'
                : 'Preencha os dados para agendar uma nova pregação'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="escala_id">Escala *</Label>
              <Select
                id="escala_id"
                value={formData.escala_id}
                onChange={(e) => setFormData({ ...formData, escala_id: e.target.value })}
                required
              >
                <option value="">Selecione uma escala</option>
                {escalas.map((escala) => (
                  <option key={escala.id} value={escala.id}>
                    {escala.mes_referencia}/{escala.ano_referencia} - {escala.distrito?.nome || 'Sem distrito'}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_pregacao">Data *</Label>
                <Input
                  id="data_pregacao"
                  type="date"
                  value={formData.data_pregacao}
                  onChange={(e) => setFormData({ ...formData, data_pregacao: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="horario_pregacao">Horário *</Label>
                <Input
                  id="horario_pregacao"
                  type="time"
                  value={formData.horario_pregacao}
                  onChange={(e) => setFormData({ ...formData, horario_pregacao: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="culto_tipo">Tipo de Culto *</Label>
              <Select
                id="culto_tipo"
                value={formData.culto_tipo}
                onChange={(e) => setFormData({ ...formData, culto_tipo: e.target.value })}
                required
              >
                {cultoTipos.map(tipo => (
                  <option key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="igreja_id">Igreja *</Label>
              <Select
                id="igreja_id"
                value={formData.igreja_id}
                onChange={(e) => setFormData({ ...formData, igreja_id: e.target.value })}
                required
              >
                <option value="">Selecione uma igreja</option>
                {igrejas.map(igreja => (
                  <option key={igreja.id} value={igreja.id}>
                    {igreja.nome}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pregador_id">Pregador *</Label>
              <Select
                id="pregador_id"
                value={formData.pregador_id}
                onChange={(e) => setFormData({ ...formData, pregador_id: e.target.value })}
                required
              >
                <option value="">Selecione um pregador</option>
                {pregadores.map(pregador => (
                  <option key={pregador.id} value={pregador.id}>
                    {pregador.nome_completo}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tematica_id">Temática (Opcional)</Label>
              <Select
                id="tematica_id"
                value={formData.tematica_id}
                onChange={(e) => setFormData({ ...formData, tematica_id: e.target.value })}
              >
                <option value="">Nenhuma temática</option>
                {tematicas.map(tematica => (
                  <option key={tematica.id} value={tematica.id}>
                    {tematica.titulo}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Observações adicionais..."
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="confirmada"
                checked={formData.confirmada}
                onChange={(e) => setFormData({ ...formData, confirmada: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="confirmada">Pregação confirmada</Label>
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
                {submitting ? 'Salvando...' : editingPregacao ? 'Atualizar' : 'Agendar'}
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
              Tem certeza que deseja excluir esta pregação?
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
