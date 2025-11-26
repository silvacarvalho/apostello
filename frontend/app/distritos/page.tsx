'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MapPin, Plus, Edit, Trash2, Search, Church } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog'
import { useAuth } from '@/lib/auth'
import api from '@/lib/api'

interface Distrito {
  id: string
  nome: string
  regiao: string
  associacao_id: string
  responsavel?: string
  email?: string
  telefone?: string
  ativo: boolean
  total_igrejas?: number
  created_at: string
}

interface DistritoFormData {
  nome: string
  regiao: string
  associacao_id: string
  responsavel?: string
  email?: string
  telefone?: string
  ativo: boolean
}

interface Associacao {
  id: string
  nome: string
}

export default function DistritosPage() {
  const { user } = useAuth()
  
  // Apenas membro da associação pode gerenciar distritos
  const canManage = user?.perfis?.includes('membro_associacao') ?? false
  
  const [distritos, setDistritos] = useState<Distrito[]>([])
  const [associacoes, setAssociacoes] = useState<Associacao[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingDistrito, setEditingDistrito] = useState<Distrito | null>(null)
  const [deletingDistrito, setDeletingDistrito] = useState<Distrito | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState<DistritoFormData>({
    nome: '',
    regiao: '',
    associacao_id: '',
    responsavel: '',
    email: '',
    telefone: '',
    ativo: true
  })

  useEffect(() => {
    loadData()
  }, [user])

  async function loadData() {
    try {
      setLoading(true)
      const [distritosData, associacoesData] = await Promise.all([
        api.get('/distritos/').then(r => r.data),
        api.get('/associacoes/').then(r => r.data)
      ])
      setDistritos(distritosData)
      setAssociacoes(associacoesData)
      
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleOpenDialog(distrito?: Distrito) {
    if (distrito) {
      setEditingDistrito(distrito)
      setFormData({
        nome: distrito.nome,
        regiao: distrito.regiao,
        associacao_id: distrito.associacao_id,
        responsavel: distrito.responsavel || '',
        email: distrito.email || '',
        telefone: distrito.telefone || '',
        ativo: distrito.ativo
      })
    } else {
      setEditingDistrito(null)
      setFormData({
        nome: '',
        regiao: '',
        associacao_id: '',
        responsavel: '',
        email: '',
        telefone: '',
        ativo: true
      })
    }
    setDialogOpen(true)
  }

  function handleCloseDialog() {
    setDialogOpen(false)
    setEditingDistrito(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      setSubmitting(true)
      if (editingDistrito) {
        await api.put(`/distritos/${editingDistrito.id}`, formData)
      } else {
        await api.post('/distritos/', formData)
      }
      await loadData()
      handleCloseDialog()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao salvar distrito')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deletingDistrito) return
    try {
      setSubmitting(true)
      await api.delete(`/distritos/${deletingDistrito.id}`)
      await loadData()
      setDeleteDialogOpen(false)
      setDeletingDistrito(null)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao excluir distrito')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredDistritos = distritos.filter(distrito =>
    distrito.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    distrito.regiao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    distrito.responsavel?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Distritos</h1>
            <p className="text-muted-foreground">
              {canManage ? 'Gerencie os distritos e suas igrejas' : 'Visualize os distritos'}
            </p>
          </div>
          {canManage && (
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Distrito
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Distritos</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{distritos.length}</div>
            </CardContent>
          </Card>

          <Link href="/igrejas" className="block">
            <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Igrejas</CardTitle>
                <Church className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {distritos.reduce((sum, d) => sum + (d.total_igrejas || 0), 0)}
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* List */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Distritos</CardTitle>
            <CardDescription>
              Todos os distritos cadastrados no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, região ou responsável..."
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
                      <th className="text-left p-4 font-medium">Região</th>
                      <th className="text-left p-4 font-medium">Responsável</th>
                      <th className="text-left p-4 font-medium">Contato</th>
                      <th className="text-left p-4 font-medium">Igrejas</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-right p-4 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDistritos.map((distrito) => (
                      <tr key={distrito.id} className="border-b hover:bg-accent/50">
                        <td className="p-4 font-medium">{distrito.nome}</td>
                        <td className="p-4 text-sm">{distrito.regiao}</td>
                        <td className="p-4 text-sm">{distrito.responsavel || '-'}</td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {distrito.email && <div>{distrito.email}</div>}
                          {distrito.telefone && <div>{distrito.telefone}</div>}
                          {!distrito.email && !distrito.telefone && '-'}
                        </td>
                        <td className="p-4 text-sm">
                          <Link href="/igrejas">
                            <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                              {distrito.total_igrejas || 0} igrejas
                            </Badge>
                          </Link>
                        </td>
                        <td className="p-4">
                          <Badge variant={distrito.ativo ? 'default' : 'outline'}>
                            {distrito.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            {canManage ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenDialog(distrito)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setDeletingDistrito(distrito)
                                    setDeleteDialogOpen(true)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <span className="text-sm text-muted-foreground">Somente visualização</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredDistritos.length === 0 && (
                  <div className="text-center p-12">
                    <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhum distrito encontrado</p>
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
              {editingDistrito ? 'Editar Distrito' : 'Novo Distrito'}
            </DialogTitle>
            <DialogDescription>
              {editingDistrito
                ? 'Atualize as informações do distrito'
                : 'Preencha os dados para cadastrar um novo distrito'}
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
                placeholder="Ex: Distrito Central"
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
              <Label htmlFor="regiao">Região *</Label>
              <Input
                id="regiao"
                value={formData.regiao}
                onChange={(e) => setFormData({ ...formData, regiao: e.target.value })}
                required
                placeholder="Ex: Zona Norte, Centro, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsavel">Responsável</Label>
              <Input
                id="responsavel"
                value={formData.responsavel}
                onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                placeholder="Ex: Pastor João Silva"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Ex: distrito@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                placeholder="Ex: (11) 98765-4321"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ativo"
                checked={formData.ativo}
                onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="ativo">Distrito ativo</Label>
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
                {submitting ? 'Salvando...' : editingDistrito ? 'Atualizar' : 'Cadastrar'}
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
              Tem certeza que deseja excluir o distrito "{deletingDistrito?.nome}"?
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
