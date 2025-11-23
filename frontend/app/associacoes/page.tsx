'use client'

import { useState, useEffect } from 'react'
import { Building2, Plus, Edit, Trash2, Search, Globe, Mail, Phone } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import api from '@/lib/api'

interface Associacao {
  id: string
  codigo: number
  nome: string
  sigla?: string
  endereco?: string
  cidade?: string
  estado?: string
  pais: string
  telefone?: string
  email?: string
  site?: string
  url_logo?: string
  ativo: boolean
  total_distritos?: number
  created_at: string
}

interface AssociacaoFormData {
  nome: string
  sigla?: string
  endereco?: string
  cidade?: string
  estado?: string
  pais: string
  telefone?: string
  email?: string
  site?: string
  url_logo?: string
  ativo: boolean
}

export default function AssociacoesPage() {
  const { showToast } = useToast()
  const [associacoes, setAssociacoes] = useState<Associacao[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingAssociacao, setEditingAssociacao] = useState<Associacao | null>(null)
  const [deletingAssociacao, setDeletingAssociacao] = useState<Associacao | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState<AssociacaoFormData>({
    nome: '',
    sigla: '',
    endereco: '',
    cidade: '',
    estado: '',
    pais: 'Brasil',
    telefone: '',
    email: '',
    site: '',
    url_logo: '',
    ativo: true
  })

  const estadosBrasileiros = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ]

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const data = await api.get('/associacoes/').then(r => r.data)
      setAssociacoes(data)
    } catch (err: any) {
      console.error('Erro ao carregar associações:', err)
      const errorMessage = err.response?.data?.detail || 'Erro ao carregar associações'
      const message = Array.isArray(errorMessage) 
        ? errorMessage.map((e: any) => e.msg).join(', ')
        : errorMessage
      showToast('error', message)
    } finally {
      setLoading(false)
    }
  }

  function handleOpenDialog(associacao?: Associacao) {
    if (associacao) {
      setEditingAssociacao(associacao)
      setFormData({
        nome: associacao.nome,
        sigla: associacao.sigla || '',
        endereco: associacao.endereco || '',
        cidade: associacao.cidade || '',
        estado: associacao.estado || '',
        pais: associacao.pais,
        telefone: associacao.telefone || '',
        email: associacao.email || '',
        site: associacao.site || '',
        url_logo: associacao.url_logo || '',
        ativo: associacao.ativo
      })
    } else {
      setEditingAssociacao(null)
      setFormData({
        nome: '',
        sigla: '',
        endereco: '',
        cidade: '',
        estado: '',
        pais: 'Brasil',
        telefone: '',
        email: '',
        site: '',
        url_logo: '',
        ativo: true
      })
    }
    setDialogOpen(true)
  }

  function handleCloseDialog() {
    setDialogOpen(false)
    setEditingAssociacao(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      setSubmitting(true)
      if (editingAssociacao) {
        await api.put(`/associacoes/${editingAssociacao.id}`, formData)
        showToast('success', 'Associação atualizada com sucesso!')
      } else {
        await api.post('/associacoes/', formData)
        showToast('success', 'Associação cadastrada com sucesso!')
      }
      await loadData()
      handleCloseDialog()
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Erro ao salvar associação')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deletingAssociacao) return
    try {
      setSubmitting(true)
      await api.delete(`/associacoes/${deletingAssociacao.id}`)
      showToast('success', 'Associação excluída com sucesso!')
      await loadData()
      setDeleteDialogOpen(false)
      setDeletingAssociacao(null)
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Erro ao excluir associação')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredAssociacoes = associacoes.filter(associacao =>
    associacao.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    associacao.sigla?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    associacao.cidade?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Associações</h1>
            <p className="text-muted-foreground">
              Gerencie as associações da Igreja Adventista
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Associação
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Associações</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{associacoes.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Associações Ativas</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {associacoes.filter(a => a.ativo).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Distritos</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {associacoes.reduce((sum, a) => sum + (a.total_distritos || 0), 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* List */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Associações</CardTitle>
            <CardDescription>
              Todas as associações cadastradas no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, sigla ou cidade..."
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
                      <th className="text-left p-4 font-medium">Código</th>
                      <th className="text-left p-4 font-medium">Nome</th>
                      <th className="text-left p-4 font-medium">Sigla</th>
                      <th className="text-left p-4 font-medium">Localização</th>
                      <th className="text-left p-4 font-medium">Contato</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-right p-4 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssociacoes.map((associacao) => (
                      <tr key={associacao.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <Badge variant="outline">#{associacao.codigo}</Badge>
                        </td>
                        <td className="p-4">
                          <div className="font-medium">{associacao.nome}</div>
                          {associacao.total_distritos !== undefined && (
                            <div className="text-sm text-muted-foreground">
                              {associacao.total_distritos} distritos
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          {associacao.sigla && (
                            <Badge>{associacao.sigla}</Badge>
                          )}
                        </td>
                        <td className="p-4">
                          {associacao.cidade && associacao.estado ? (
                            <div className="text-sm">
                              <div>{associacao.cidade} - {associacao.estado}</div>
                              <div className="text-muted-foreground">{associacao.pais}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="space-y-1 text-sm">
                            {associacao.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {associacao.email}
                              </div>
                            )}
                            {associacao.telefone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {associacao.telefone}
                              </div>
                            )}
                            {associacao.site && (
                              <div className="flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                <a
                                  href={associacao.site}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  Website
                                </a>
                              </div>
                            )}
                            {!associacao.email && !associacao.telefone && !associacao.site && (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          {associacao.ativo ? (
                            <Badge className="bg-green-500">Ativa</Badge>
                          ) : (
                            <Badge variant="secondary">Inativa</Badge>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(associacao)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDeletingAssociacao(associacao)
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

                {filteredAssociacoes.length === 0 && (
                  <div className="text-center p-12">
                    <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhuma associação encontrada</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogClose onClose={handleCloseDialog} />
          <DialogHeader>
            <DialogTitle>
              {editingAssociacao ? 'Editar Associação' : 'Nova Associação'}
            </DialogTitle>
            <DialogDescription>
              {editingAssociacao
                ? 'Atualize as informações da associação'
                : 'Preencha os dados para cadastrar uma nova associação'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                  placeholder="Ex: Associação Paulista"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sigla">Sigla</Label>
                <Input
                  id="sigla"
                  value={formData.sigla}
                  onChange={(e) => setFormData({ ...formData, sigla: e.target.value })}
                  placeholder="Ex: APaC"
                  maxLength={20}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pais">País</Label>
                <Input
                  id="pais"
                  value={formData.pais}
                  onChange={(e) => setFormData({ ...formData, pais: e.target.value })}
                  placeholder="Brasil"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Textarea
                id="endereco"
                value={formData.endereco}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                placeholder="Endereço completo..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                  placeholder="Ex: São Paulo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Select
                  id="estado"
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                >
                  <option value="">Selecione um estado</option>
                  {estadosBrasileiros.map(estado => (
                    <option key={estado} value={estado}>{estado}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="(11) 98765-4321"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contato@associacao.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="site">Website</Label>
              <Input
                id="site"
                type="url"
                value={formData.site}
                onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                placeholder="https://www.associacao.com.br"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url_logo">URL do Logo</Label>
              <Input
                id="url_logo"
                type="url"
                value={formData.url_logo}
                onChange={(e) => setFormData({ ...formData, url_logo: e.target.value })}
                placeholder="https://exemplo.com/logo.png"
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
              <Label htmlFor="ativo">Associação ativa</Label>
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
                {submitting ? 'Salvando...' : editingAssociacao ? 'Atualizar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a associação "{deletingAssociacao?.nome}"?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
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
