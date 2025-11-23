'use client'

import { useState, useEffect } from 'react'
import { Church, Plus, Edit, Trash2, Search } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog'
import api from '@/lib/api'

interface Igreja {
  id: string
  nome: string
  endereco: string
  cidade: string
  estado: string
  distrito_id: string
  distrito?: { nome: string }
  ativa: boolean
  created_at: string
}

interface IgrejaFormData {
  nome: string
  endereco: string
  cidade: string
  estado: string
  distrito_id: string
  ativa: boolean
}

export default function IgrejasPage() {
  const [igrejas, setIgrejas] = useState<Igreja[]>([])
  const [distritos, setDistritos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingIgreja, setEditingIgreja] = useState<Igreja | null>(null)
  const [deletingIgreja, setDeletingIgreja] = useState<Igreja | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState<IgrejaFormData>({
    nome: '',
    endereco: '',
    cidade: '',
    estado: 'SP',
    distrito_id: '',
    ativa: true
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [igrejasData, distritosData] = await Promise.all([
        api.get('/igrejas/').then(r => r.data),
        api.get('/distritos/').then(r => r.data)
      ])
      setIgrejas(igrejasData)
      setDistritos(distritosData)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleOpenDialog(igreja?: Igreja) {
    if (igreja) {
      setEditingIgreja(igreja)
      setFormData({
        nome: igreja.nome,
        endereco: igreja.endereco,
        cidade: igreja.cidade,
        estado: igreja.estado,
        distrito_id: igreja.distrito_id,
        ativa: igreja.ativa
      })
    } else {
      setEditingIgreja(null)
      setFormData({
        nome: '',
        endereco: '',
        cidade: '',
        estado: 'SP',
        distrito_id: distritos[0]?.id || '',
        ativa: true
      })
    }
    setDialogOpen(true)
  }

  function handleCloseDialog() {
    setDialogOpen(false)
    setEditingIgreja(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      setSubmitting(true)
      if (editingIgreja) {
        await api.put(`/igrejas/${editingIgreja.id}`, formData)
      } else {
        await api.post('/igrejas/', formData)
      }
      await loadData()
      handleCloseDialog()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao salvar igreja')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deletingIgreja) return
    try {
      setSubmitting(true)
      await api.delete(`/igrejas/${deletingIgreja.id}`)
      await loadData()
      setDeleteDialogOpen(false)
      setDeletingIgreja(null)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao excluir igreja')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredIgrejas = igrejas.filter(igreja =>
    igreja.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    igreja.cidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
    igreja.distrito?.nome.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const estados = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Igrejas</h1>
            <p className="text-muted-foreground">
              Gerencie as igrejas do distrito
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Igreja
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Igrejas</CardTitle>
              <Church className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{igrejas.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Igrejas Ativas</CardTitle>
              <Church className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {igrejas.filter(i => i.ativa).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Distritos</CardTitle>
              <Church className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{distritos.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* List */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Igrejas</CardTitle>
            <CardDescription>
              Todas as igrejas cadastradas no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, cidade ou distrito..."
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
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-medium">Nome</th>
                      <th className="text-left p-4 font-medium">Endereço</th>
                      <th className="text-left p-4 font-medium">Cidade/Estado</th>
                      <th className="text-left p-4 font-medium">Distrito</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-right p-4 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIgrejas.map((igreja) => (
                      <tr key={igreja.id} className="border-b hover:bg-accent/50">
                        <td className="p-4 font-medium">{igreja.nome}</td>
                        <td className="p-4 text-sm text-muted-foreground">{igreja.endereco}</td>
                        <td className="p-4 text-sm">{igreja.cidade}/{igreja.estado}</td>
                        <td className="p-4 text-sm">{igreja.distrito?.nome}</td>
                        <td className="p-4">
                          <Badge variant={igreja.ativa ? 'default' : 'outline'}>
                            {igreja.ativa ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDialog(igreja)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDeletingIgreja(igreja)
                                setDeleteDialogOpen(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredIgrejas.length === 0 && (
                  <div className="text-center p-12">
                    <Church className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhuma igreja encontrada</p>
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
              {editingIgreja ? 'Editar Igreja' : 'Nova Igreja'}
            </DialogTitle>
            <DialogDescription>
              {editingIgreja
                ? 'Atualize as informações da igreja'
                : 'Preencha os dados para cadastrar uma nova igreja'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
                placeholder="Ex: IASD Central"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endereco">Endereço *</Label>
              <Input
                id="endereco"
                value={formData.endereco}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                required
                placeholder="Ex: Rua das Flores, 123"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade *</Label>
                <Input
                  id="cidade"
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                  required
                  placeholder="Ex: São Paulo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estado">Estado *</Label>
                <Select
                  id="estado"
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  required
                >
                  {estados.map(estado => (
                    <option key={estado} value={estado}>{estado}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="distrito_id">Distrito *</Label>
              <Select
                id="distrito_id"
                value={formData.distrito_id}
                onChange={(e) => setFormData({ ...formData, distrito_id: e.target.value })}
                required
              >
                <option value="">Selecione um distrito</option>
                {distritos.map(distrito => (
                  <option key={distrito.id} value={distrito.id}>
                    {distrito.nome}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ativa"
                checked={formData.ativa}
                onChange={(e) => setFormData({ ...formData, ativa: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="ativa">Igreja ativa</Label>
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
                {submitting ? 'Salvando...' : editingIgreja ? 'Atualizar' : 'Cadastrar'}
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
              Tem certeza que deseja excluir a igreja "{deletingIgreja?.nome}"?
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
