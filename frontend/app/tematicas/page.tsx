'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Plus, Edit, Trash2, Search, Download, Upload, Info } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog'
import { useAuth } from '@/lib/auth'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'

interface Tematica {
  id: string
  titulo: string
  associacao_id: string
  tipo_recorrencia: string
  descricao?: string
  referencia_biblica?: string
  ativo: boolean
  criado_em: string
  atualizado_em: string
  total_pregacoes?: number
  data_especifica?: string
  semana_toda?: boolean
  dia_semana_semanal?: string
  numero_semana_mes?: number
  dia_semana_mensal?: string
  valido_de?: string
  valido_ate?: string
}

interface TematicaFormData {
  titulo: string
  tipo_recorrencia: string
  descricao?: string
  referencia_biblica?: string
  ativo: boolean
  data_especifica?: string
  semana_toda?: boolean
  dia_semana_semanal?: string
  numero_semana_mes?: number
  dia_semana_mensal?: string
  valido_de?: string
  valido_ate?: string
}

export default function TematicasPage() {
  const { user } = useAuth()
  
  // Apenas membro da associação pode gerenciar temáticas
  const canManage = user?.perfis?.includes('membro_associacao') ?? false
  
  const [tematicas, setTematicas] = useState<Tematica[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [infoDialogOpen, setInfoDialogOpen] = useState(false)
  const [editingTematica, setEditingTematica] = useState<Tematica | null>(null)
  const [deletingTematica, setDeletingTematica] = useState<Tematica | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const [formData, setFormData] = useState<TematicaFormData>({
    titulo: '',
    tipo_recorrencia: 'data_especifica',
    descricao: '',
    referencia_biblica: '',
    ativo: true
  })

  // Opções de tipo de recorrência
  const tiposRecorrencia = [
    { value: 'data_especifica', label: 'Data Específica' },
    { value: 'semanal', label: 'Semanal' },
    { value: 'mensal', label: 'Mensal' }
  ]

  const diasSemana = [
    { value: 'domingo', label: 'Domingo' },
    { value: 'segunda', label: 'Segunda-feira' },
    { value: 'terca', label: 'Terça-feira' },
    { value: 'quarta', label: 'Quarta-feira' },
    { value: 'quinta', label: 'Quinta-feira' },
    { value: 'sexta', label: 'Sexta-feira' },
    { value: 'sabado', label: 'Sábado' }
  ]

  const semanasMes = [
    { value: 1, label: 'Primeiro' },
    { value: 2, label: 'Segundo' },
    { value: 3, label: 'Terceiro' },
    { value: 4, label: 'Quarto' },
    { value: 5, label: 'Último' }
  ]

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const tematicasData = await api.get('/tematicas/').then(r => r.data)
      setTematicas(tematicasData)
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
        tipo_recorrencia: tematica.tipo_recorrencia,
        descricao: tematica.descricao || '',
        referencia_biblica: tematica.referencia_biblica || '',
        ativo: tematica.ativo,
        data_especifica: tematica.data_especifica || '',
        semana_toda: tematica.semana_toda || false,
        dia_semana_semanal: tematica.dia_semana_semanal || '',
        numero_semana_mes: tematica.numero_semana_mes,
        dia_semana_mensal: tematica.dia_semana_mensal || '',
        valido_de: tematica.valido_de || '',
        valido_ate: tematica.valido_ate || ''
      })
    } else {
      setEditingTematica(null)
      setFormData({
        titulo: '',
        tipo_recorrencia: 'data_especifica',
        descricao: '',
        referencia_biblica: '',
        ativo: true
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
      
      // Preparar dados para envio, convertendo strings vazias para null
      const dataToSend = {
        ...formData,
        dia_semana_semanal: formData.dia_semana_semanal || null,
        dia_semana_mensal: formData.dia_semana_mensal || null,
        data_especifica: formData.data_especifica || null,
        valido_de: formData.valido_de || null,
        valido_ate: formData.valido_ate || null,
        numero_semana_mes: formData.numero_semana_mes || null
      }
      
      if (editingTematica) {
        await api.put(`/tematicas/${editingTematica.id}`, dataToSend)
      } else {
        await api.post('/tematicas/', dataToSend)
      }
      await loadData()
      handleCloseDialog()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao salvar tematica')
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
      alert(err.response?.data?.detail || 'Erro ao excluir tematica')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDownloadTemplate() {
    try {
      const response = await api.get('/tematicas/template/download', {
        responseType: 'blob'
      })
      
      // Criar link de download
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'template_tematicas.csv')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao baixar template')
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  async function handleUploadTemplate() {
    if (!selectedFile) {
      alert('Selecione um arquivo CSV')
      return
    }

    try {
      setSubmitting(true)
      const uploadFormData = new FormData()
      uploadFormData.append('file', selectedFile)

      const response = await api.post('/tematicas/template/upload', uploadFormData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      alert(response.data.message)
      setImportDialogOpen(false)
      setSelectedFile(null)
      await loadData()
    } catch (err: any) {
      const errorDetail = err.response?.data?.detail
      if (typeof errorDetail === 'object' && errorDetail.erros) {
        alert('Erros na importacao: ' + errorDetail.erros.join(', '))
      } else {
        alert(errorDetail || 'Erro ao importar tematicas')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const filteredTematicas = tematicas.filter(tematica =>
    tematica.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tematica.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tematica.referencia_biblica?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Função para formatar informações de recorrência
  function getRecorrenciaInfo(tematica: Tematica): string {
    const diasSemanaMap: Record<string, string> = {
      'domingo': 'Domingo',
      'segunda': 'Segunda-feira',
      'terca': 'Terça-feira',
      'quarta': 'Quarta-feira',
      'quinta': 'Quinta-feira',
      'sexta': 'Sexta-feira',
      'sabado': 'Sábado'
    }

    const semanasMap: Record<number, string> = {
      1: 'Primeiro',
      2: 'Segundo',
      3: 'Terceiro',
      4: 'Quarto',
      5: 'Último'
    }

    if (tematica.tipo_recorrencia === 'data_especifica' && tematica.data_especifica) {
      return `Data específica: ${formatDate(tematica.data_especifica)}`
    }

    if (tematica.tipo_recorrencia === 'semanal') {
      const periodo = tematica.valido_de && tematica.valido_ate 
        ? ` (${formatDate(tematica.valido_de)} à ${formatDate(tematica.valido_ate)})`
        : ''
      
      if (tematica.semana_toda) {
        return `Semana toda${periodo}`
      }
      
      if (tematica.dia_semana_semanal) {
        const dia = diasSemanaMap[tematica.dia_semana_semanal] || tematica.dia_semana_semanal
        const artigo = (tematica.dia_semana_semanal === 'domingo' || tematica.dia_semana_semanal === 'sabado') ? 'Todo' : 'Toda'
        return `${artigo} ${dia}${periodo}`
      }
    }

    if (tematica.tipo_recorrencia === 'mensal' && tematica.numero_semana_mes && tematica.dia_semana_mensal) {
      const semana = semanasMap[tematica.numero_semana_mes] || tematica.numero_semana_mes
      const dia = diasSemanaMap[tematica.dia_semana_mensal] || tematica.dia_semana_mensal
      const periodo = tematica.valido_de && tematica.valido_ate 
        ? ` (${formatDate(tematica.valido_de)} à ${formatDate(tematica.valido_ate)})`
        : ''
      return `Todo ${semana} ${dia} do mês - ${periodo}`
    }

    return 'Recorrência não definida'
  }

  // Função para verificar se a temática está expirada
  function isExpired(tematica: Tematica): boolean {
    if (!tematica.valido_ate) return false
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const dataFim = new Date(tematica.valido_ate)
    dataFim.setHours(0, 0, 0, 0)
    return dataFim < hoje
  }

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
          <div className="flex gap-2">
            {canManage && (
              <>
                <Button variant="outline" onClick={handleDownloadTemplate}>
                  <Download className="mr-2 h-4 w-4" />
                  Baixar Template
                </Button>
                <Button variant="outline" size="icon" onClick={() => setInfoDialogOpen(true)} title="Informações sobre o template CSV">
                  <Info className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Importar CSV
                </Button>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Temática
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2">
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
                {tematicas.filter(t => t.ativo).length}
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
                          <Badge variant={tematica.ativo ? 'default' : 'outline'}>
                            {tematica.ativo ? 'Ativa' : 'Inativa'}
                          </Badge>
                          {isExpired(tematica) && (
                            <Badge variant="destructive">
                              Período Expirado
                            </Badge>
                          )}
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

                        {/* Informações de Recorrência */}
                        <div className="flex items-center gap-2 text-sm mb-2">
                          <span className="font-medium text-blue-600">
                            📅 {getRecorrenciaInfo(tematica)}
                          </span>
                        </div>

                        {tematica.referencia_biblica && (
                          <div className="flex items-center gap-2 text-sm">
                            <BookOpen className="h-4 w-4 text-primary" />
                            <span className="font-medium text-primary">
                              {tematica.referencia_biblica}
                            </span>
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground mt-2">
                          Criada em {formatDate(tematica.criado_em)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {canManage && (
                          <>
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
                          </>
                        )}
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

            {/* Campos condicionais baseados no tipo de recorrência */}
            {formData.tipo_recorrencia === 'data_especifica' && (
              <div className="space-y-2">
                <Label htmlFor="data_especifica">Data Específica *</Label>
                <Input
                  id="data_especifica"
                  type="date"
                  value={formData.data_especifica || ''}
                  onChange={(e) => setFormData({ ...formData, data_especifica: e.target.value })}
                  required
                />
              </div>
            )}

            {formData.tipo_recorrencia === 'semanal' && (
              <>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.semana_toda || false}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        semana_toda: e.target.checked,
                        dia_semana_semanal: e.target.checked ? undefined : formData.dia_semana_semanal
                      })}
                      className="h-4 w-4"
                    />
                    Semana toda
                  </Label>
                </div>

                {!formData.semana_toda && (
                  <div className="space-y-2">
                    <Label htmlFor="dia_semana_semanal">Dia da Semana *</Label>
                    <Select
                      id="dia_semana_semanal"
                      value={formData.dia_semana_semanal || ''}
                      onChange={(e) => setFormData({ ...formData, dia_semana_semanal: e.target.value })}
                      required
                    >
                      <option value="">Selecione...</option>
                      {diasSemana.map((dia) => (
                        <option key={dia.value} value={dia.value}>
                          {dia.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="valido_de_semanal">Válido de *</Label>
                    <Input
                      id="valido_de_semanal"
                      type="date"
                      value={formData.valido_de || ''}
                      onChange={(e) => setFormData({ ...formData, valido_de: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valido_ate_semanal">Válido até *</Label>
                    <Input
                      id="valido_ate_semanal"
                      type="date"
                      value={formData.valido_ate || ''}
                      onChange={(e) => setFormData({ ...formData, valido_ate: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {formData.tipo_recorrencia === 'mensal' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="numero_semana_mes">Semana do Mês *</Label>
                    <Select
                      id="numero_semana_mes"
                      value={formData.numero_semana_mes?.toString() || ''}
                      onChange={(e) => setFormData({ ...formData, numero_semana_mes: parseInt(e.target.value) })}
                      required
                    >
                      <option value="">Selecione...</option>
                      {semanasMes.map((semana) => (
                        <option key={semana.value} value={semana.value}>
                          {semana.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dia_semana_mensal">Dia da Semana *</Label>
                    <Select
                      id="dia_semana_mensal"
                      value={formData.dia_semana_mensal || ''}
                      onChange={(e) => setFormData({ ...formData, dia_semana_mensal: e.target.value })}
                      required
                    >
                      <option value="">Selecione...</option>
                      {diasSemana.map((dia) => (
                        <option key={dia.value} value={dia.value}>
                          {dia.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                {/* Período de validade (opcional para mensal) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="valido_de_mensal">Válido de</Label>
                    <Input
                      id="valido_de_mensal"
                      type="date"
                      value={formData.valido_de || ''}
                      onChange={(e) => setFormData({ ...formData, valido_de: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valido_ate_mensal">Válido até</Label>
                    <Input
                      id="valido_ate_mensal"
                      type="date"
                      value={formData.valido_ate || ''}
                      onChange={(e) => setFormData({ ...formData, valido_ate: e.target.value })}
                    />
                  </div>
                </div>
              </>
            )}

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
              <Label htmlFor="referencia_biblica">Referências Bíblicas</Label>
              <Input
                id="referencia_biblica"
                value={formData.referencia_biblica}
                onChange={(e) => setFormData({ ...formData, referencia_biblica: e.target.value })}
                placeholder="Ex: João 3:16, Romanos 8:28"
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
              <Label htmlFor="ativo">Temática ativa</Label>
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

      {/* Import CSV Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogClose onClose={() => {
            setImportDialogOpen(false)
            setSelectedFile(null)
          }} />
          <DialogHeader>
            <DialogTitle>Importar Temáticas via CSV</DialogTitle>
            <DialogDescription>
              Selecione um arquivo CSV no formato do template para importar múltiplas temáticas de uma vez.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="csv-file">Arquivo CSV</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="mt-1"
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground mt-2">
                  Arquivo selecionado: {selectedFile.name}
                </p>
              )}
            </div>

            <div className="bg-muted p-3 rounded-md space-y-2">
              <p className="text-sm font-semibold">Formato do arquivo CSV:</p>
              <p className="text-xs text-muted-foreground">
                O arquivo deve conter as colunas: <strong>titulo, descricao, referencia_biblica, tipo_recorrencia</strong>
              </p>
              <p className="text-xs text-muted-foreground">
                <strong>tipo_recorrencia:</strong> data_especifica, semanal ou mensal
              </p>
              <ul className="text-xs text-muted-foreground list-disc list-inside ml-2">
                <li><strong>data_especifica:</strong> preencher data_especifica (formato: YYYY-MM-DD)</li>
                <li><strong>semanal:</strong> preencher dia_semana_semanal, valido_de e valido_ate</li>
                <li><strong>mensal:</strong> preencher numero_semana_mes (1-5) e dia_semana_mensal</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2">
                <strong>Dias da semana:</strong> domingo, segunda, terca, quarta, quinta, sexta, sabado
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setImportDialogOpen(false)
                  setSelectedFile(null)
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleUploadTemplate}
                disabled={submitting || !selectedFile}
                className="flex-1"
              >
                {submitting ? 'Importando...' : 'Importar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Info Dialog */}
      <Dialog open={infoDialogOpen} onOpenChange={setInfoDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>📋 Guia de Preenchimento do Template CSV</DialogTitle>
            <DialogDescription>
              Instruções detalhadas sobre como preencher o arquivo de importação de temáticas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">🔹 Estrutura do Arquivo</h3>
              <p className="text-sm text-muted-foreground">
                O arquivo deve ser salvo em formato CSV com <strong>ponto-e-vírgula (;)</strong> como separador e codificação <strong>UTF-8 com BOM</strong>.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">📝 Campos Obrigatórios</h3>
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                <li><strong>titulo</strong>: Nome da temática (máx. 300 caracteres)</li>
                <li><strong>tipo_recorrencia</strong>: Tipo de recorrência (ver opções abaixo)</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">🔄 Tipos de Recorrência</h3>
              <div className="space-y-3 text-sm">
                <div className="border-l-4 border-blue-500 pl-3">
                  <p className="font-semibold">data_especifica</p>
                  <p className="text-muted-foreground">Campos obrigatórios:</p>
                  <ul className="list-disc list-inside ml-4 text-muted-foreground">
                    <li><strong>data_especifica</strong>: Data no formato YYYY-MM-DD (ex: 2026-12-25)</li>
                  </ul>
                </div>

                <div className="border-l-4 border-green-500 pl-3">
                  <p className="font-semibold">semanal</p>
                  <p className="text-muted-foreground">Campos obrigatórios:</p>
                  <ul className="list-disc list-inside ml-4 text-muted-foreground">
                    <li><strong>valido_de</strong>: Data inicial (YYYY-MM-DD)</li>
                    <li><strong>valido_ate</strong>: Data final (YYYY-MM-DD)</li>
                    <li><strong>semana_toda</strong> OU <strong>dia_semana_semanal</strong>:
                      <ul className="list-circle list-inside ml-4">
                        <li>Se <strong>semana_toda=true</strong>: deixar dia_semana_semanal vazio</li>
                        <li>Se <strong>semana_toda</strong> vazio/false: preencher dia_semana_semanal</li>
                      </ul>
                    </li>
                  </ul>
                </div>

                <div className="border-l-4 border-purple-500 pl-3">
                  <p className="font-semibold">mensal</p>
                  <p className="text-muted-foreground">Campos obrigatórios:</p>
                  <ul className="list-disc list-inside ml-4 text-muted-foreground">
                    <li><strong>numero_semana_mes</strong>: Número de 1 a 5</li>
                    <li><strong>dia_semana_mensal</strong>: Dia da semana (ver valores aceitos)</li>
                  </ul>
                  <p className="text-muted-foreground mt-1">Campos opcionais: valido_de, valido_ate</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">📊 Valores Aceitos para Campos ENUM</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="font-semibold">tipo_recorrencia:</p>
                  <code className="bg-muted px-2 py-1 rounded text-xs">data_especifica</code>{' '}
                  <code className="bg-muted px-2 py-1 rounded text-xs">semanal</code>{' '}
                  <code className="bg-muted px-2 py-1 rounded text-xs">mensal</code>
                </div>
                <div>
                  <p className="font-semibold">dia_semana_semanal / dia_semana_mensal:</p>
                  <code className="bg-muted px-2 py-1 rounded text-xs">domingo</code>{' '}
                  <code className="bg-muted px-2 py-1 rounded text-xs">segunda</code>{' '}
                  <code className="bg-muted px-2 py-1 rounded text-xs">terca</code>{' '}
                  <code className="bg-muted px-2 py-1 rounded text-xs">quarta</code>{' '}
                  <code className="bg-muted px-2 py-1 rounded text-xs">quinta</code>{' '}
                  <code className="bg-muted px-2 py-1 rounded text-xs">sexta</code>{' '}
                  <code className="bg-muted px-2 py-1 rounded text-xs">sabado</code>
                </div>
                <div>
                  <p className="font-semibold">semana_toda / ativo:</p>
                  <code className="bg-muted px-2 py-1 rounded text-xs">true</code>{' '}
                  <code className="bg-muted px-2 py-1 rounded text-xs">false</code>{' '}
                  <code className="bg-muted px-2 py-1 rounded text-xs">1</code>{' '}
                  <code className="bg-muted px-2 py-1 rounded text-xs">0</code>{' '}
                  <code className="bg-muted px-2 py-1 rounded text-xs">sim</code>{' '}
                  <code className="bg-muted px-2 py-1 rounded text-xs">yes</code>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">🔢 Campos Numéricos</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="font-semibold">numero_semana_mes:</p>
                  <p className="text-muted-foreground">Valores aceitos: <strong>1</strong> (Primeiro), <strong>2</strong> (Segundo), <strong>3</strong> (Terceiro), <strong>4</strong> (Quarto), <strong>5</strong> (Último)</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">📅 Formato de Datas</h3>
              <p className="text-sm text-muted-foreground">
                Todas as datas devem estar no formato: <strong>YYYY-MM-DD</strong>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Exemplos: <code className="bg-muted px-2 py-1 rounded text-xs">2026-01-15</code>, <code className="bg-muted px-2 py-1 rounded text-xs">2026-12-25</code>
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">⚠️ Observações Importantes</h3>
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                <li>Não use acentos nos valores ENUM (terca, não terça)</li>
                <li>Campos vazios devem ser deixados em branco (sem espaços)</li>
                <li>O Excel pode adicionar automaticamente o BOM UTF-8 ao salvar como CSV</li>
                <li>A associação será preenchida automaticamente com a do usuário logado</li>
                <li>Campos opcionais: descricao, referencia_biblica</li>
              </ul>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={() => setInfoDialogOpen(false)}>
                Entendi
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
