'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Users, Plus, Edit, Trash2, Search, Mail, Phone } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/lib/auth'
import api from '@/lib/api'

interface Membro {
  id: string
  nome_completo: string
  email: string
  telefone?: string
  igreja_id: string
  igreja?: { nome: string }
  perfis: string[]
  ativo: boolean
  created_at: string
}

interface MembroFormData {
  nome_completo: string
  email: string
  telefone?: string
  senha?: string
  igreja_id: string
  perfis: string[]
  ativo: boolean
}

export default function MembrosPage() {
  const { showToast } = useToast()
  const { user } = useAuth()
  
  // Verificar se usuário pode gerenciar membros
  const canManage = user?.perfis?.some((p: string) => 
    ['pastor_distrital', 'lider_distrital', 'membro_associacao'].includes(p)
  ) ?? false
  
  const [membros, setMembros] = useState<Membro[]>([])
  const [igrejas, setIgrejas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingMembro, setEditingMembro] = useState<Membro | null>(null)
  const [deletingMembro, setDeletingMembro] = useState<Membro | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState<MembroFormData>({
    nome_completo: '',
    email: '',
    telefone: '',
    senha: '',
    igreja_id: '',
    perfis: ['membro_associacao'],
    ativo: true
  })

  // Perfis disponíveis baseado no perfil do usuário logado
  const perfisDisponiveis = user?.perfis?.includes('membro_associacao') 
    ? [
        { value: 'membro_associacao', label: 'Membro da Associação' },
        { value: 'pastor_distrital', label: 'Pastor Distrital' },
        { value: 'lider_distrital', label: 'Líder Distrital' },
        { value: 'pregador', label: 'Pregador' },
        { value: 'avaliador', label: 'Avaliador' }
      ]
    : [
        { value: 'lider_distrital', label: 'Líder Distrital' },
        { value: 'pregador', label: 'Pregador' },
        { value: 'avaliador', label: 'Avaliador' }
      ]

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [membrosData, igrejasData] = await Promise.all([
        api.get('/usuarios/').then(r => r.data),
        api.get('/igrejas/').then(r => r.data)
      ])
      setMembros(membrosData)
      setIgrejas(igrejasData)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleOpenDialog(membro?: Membro) {
    if (membro) {
      setEditingMembro(membro)
      setFormData({
        nome_completo: membro.nome_completo,
        email: membro.email,
        telefone: membro.telefone || '',
        senha: '',
        igreja_id: membro.igreja_id,
        perfis: membro.perfis,
        ativo: membro.ativo
      })
    } else {
      setEditingMembro(null)
      setFormData({
        nome_completo: '',
        email: '',
        telefone: '',
        senha: '',
        igreja_id: igrejas[0]?.id || '',
        perfis: ['membro_associacao'],
        ativo: true
      })
    }
    setDialogOpen(true)
  }

  function handleCloseDialog() {
    setDialogOpen(false)
    setEditingMembro(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validação: verificar se pelo menos um perfil foi selecionado
    if (formData.perfis.length === 0) {
      showToast('error', 'Selecione pelo menos um perfil para o membro')
      return
    }

    try {
      setSubmitting(true)
      const payload = { ...formData }

      // Remove senha vazia ao editar
      if (editingMembro && !payload.senha) {
        delete payload.senha
      }

      if (editingMembro) {
        await api.put(`/usuarios/${editingMembro.id}`, payload)
        showToast('success', 'Membro atualizado com sucesso!')
      } else {
        await api.post('/usuarios/', payload)
        showToast('success', 'Membro cadastrado com sucesso!')
      }
      await loadData()
      handleCloseDialog()
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Erro ao salvar membro')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deletingMembro) return
    try {
      setSubmitting(true)
      await api.delete(`/usuarios/${deletingMembro.id}`)
      showToast('success', 'Membro excluído com sucesso!')
      await loadData()
      setDeleteDialogOpen(false)
      setDeletingMembro(null)
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Erro ao excluir membro')
    } finally {
      setSubmitting(false)
    }
  }

  function togglePerfil(perfil: string) {
    const newPerfis = formData.perfis.includes(perfil)
      ? formData.perfis.filter(p => p !== perfil)
      : [...formData.perfis, perfil]

    setFormData({ ...formData, perfis: newPerfis })
  }

  const filteredMembros = membros.filter(membro =>
    membro.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    membro.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    membro.igreja?.nome.toLowerCase().includes(searchTerm.toLowerCase())
  )

  function getPerfilLabel(perfil: string) {
    return perfisDisponiveis.find(p => p.value === perfil)?.label || perfil
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Membros</h1>
            <p className="text-muted-foreground">
              {canManage ? 'Gerencie os membros do sistema' : 'Visualize os membros do sistema'}
            </p>
          </div>
          {canManage && (
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Membro
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Membros</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{membros.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Membros Ativos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {membros.filter(m => m.ativo).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pregadores</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Link href="/pregadores" className="hover:underline">
                <div className="text-2xl font-bold text-primary cursor-pointer">
                  {membros.filter(m => m.perfis.includes('PREGADOR')).length}
                </div>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avaliadores</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {membros.filter(m => m.perfis.includes('AVALIADOR')).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* List */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Membros</CardTitle>
            <CardDescription>
              Todos os membros cadastrados no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, email ou igreja..."
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
                      <th className="text-left p-4 font-medium">Contato</th>
                      <th className="text-left p-4 font-medium">Igreja</th>
                      <th className="text-left p-4 font-medium">Perfis</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-right p-4 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembros.map((membro) => (
                      <tr key={membro.id} className="border-b hover:bg-accent/50">
                        <td className="p-4 font-medium">{membro.nome_completo}</td>
                        <td className="p-4 text-sm text-muted-foreground">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {membro.email}
                            </div>
                            {membro.telefone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {membro.telefone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-sm">{membro.igreja?.nome}</td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {membro.perfis.map((perfil) => (
                              <Badge key={perfil} variant="outline" className="text-xs">
                                {getPerfilLabel(perfil)}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant={membro.ativo ? 'default' : 'outline'}>
                            {membro.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            {canManage ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenDialog(membro)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setDeletingMembro(membro)
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

                {filteredMembros.length === 0 && (
                  <div className="text-center p-12">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhum membro encontrado</p>
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
              {editingMembro ? 'Editar Membro' : 'Novo Membro'}
            </DialogTitle>
            <DialogDescription>
              {editingMembro
                ? 'Atualize as informações do membro'
                : 'Preencha os dados para cadastrar um novo membro'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome_completo">Nome Completo *</Label>
              <Input
                id="nome_completo"
                value={formData.nome_completo}
                onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                required
                placeholder="Ex: João Silva Santos"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="Ex: joao@example.com"
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha">
                Senha {editingMembro ? '(deixe em branco para não alterar)' : '*'}
              </Label>
              <Input
                id="senha"
                type="password"
                value={formData.senha}
                onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                required={!editingMembro}
                placeholder={editingMembro ? 'Digite para alterar' : 'Senha de acesso'}
              />
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
              <Label>Perfis *</Label>
              <div className="grid grid-cols-2 gap-2">
                {perfisDisponiveis.map((perfil) => (
                  <div
                    key={perfil.value}
                    className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.perfis.includes(perfil.value)
                        ? 'bg-primary/10 border-primary'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => togglePerfil(perfil.value)}
                  >
                    <input
                      type="checkbox"
                      checked={formData.perfis.includes(perfil.value)}
                      onChange={() => togglePerfil(perfil.value)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label className="cursor-pointer text-sm">{perfil.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ativo"
                checked={formData.ativo}
                onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="ativo">Membro ativo</Label>
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
                {submitting ? 'Salvando...' : editingMembro ? 'Atualizar' : 'Cadastrar'}
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
              Tem certeza que deseja excluir o membro "{deletingMembro?.nome_completo}"?
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
