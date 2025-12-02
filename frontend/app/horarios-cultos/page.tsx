'use client'

import { useState, useEffect } from 'react'
import { Clock, Plus, Edit, Trash2, Search, Wand2, Check } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog'
import { useAuth } from '@/lib/auth'
import { horariosCultosApi, distritosApi, igrejasApi } from '@/lib/api'

interface HorarioCulto {
  id: string
  distrito_id?: string
  igreja_id?: string
  dia_semana: string
  horario: string
  nome_culto: string
  duracao_minutos: number
  requer_pregador: boolean
  ativo: boolean
  criado_em: string
}

interface Distrito {
  id: string
  nome: string
}

interface Igreja {
  id: string
  nome: string
  distrito_id: string
}

interface HorarioFormData {
  distrito_id?: string
  igreja_id?: string
  dia_semana: string
  horario: string
  nome_culto: string
  duracao_minutos: number
  requer_pregador: boolean
  ativo: boolean
}

const DIAS_SEMANA = [
  { value: 'segunda', label: 'Segunda-feira' },
  { value: 'terca', label: 'Terça-feira' },
  { value: 'quarta', label: 'Quarta-feira' },
  { value: 'quinta', label: 'Quinta-feira' },
  { value: 'sexta', label: 'Sexta-feira' },
  { value: 'sabado', label: 'Sábado' },
  { value: 'domingo', label: 'Domingo' },
]

export default function HorariosCultosPage() {
  const { user } = useAuth()
  
  const canManage = user?.perfis?.some(p => ['membro_associacao', 'pastor_distrital', 'lider_distrital'].includes(p)) ?? false
  
  const [horarios, setHorarios] = useState<HorarioCulto[]>([])
  const [distritos, setDistritos] = useState<Distrito[]>([])
  const [igrejas, setIgrejas] = useState<Igreja[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroDistrito, setFiltroDistrito] = useState('')
  const [filtroIgreja, setFiltroIgreja] = useState('')
  
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [padraoDialogOpen, setPadraoDialogOpen] = useState(false)
  const [editingHorario, setEditingHorario] = useState<HorarioCulto | null>(null)
  const [deletingHorario, setDeletingHorario] = useState<HorarioCulto | null>(null)
  const [submitting, setSubmitting] = useState(false)
  
  const [formData, setFormData] = useState<HorarioFormData>({
    distrito_id: '',
    igreja_id: '',
    dia_semana: 'sabado',
    horario: '08:30',
    nome_culto: '',
    duracao_minutos: 90,
    requer_pregador: true,
    ativo: true
  })
  
  const [padraoForm, setPadraoForm] = useState({
    distrito_id: '',
    aplicar_todas_igrejas: false
  })

  useEffect(() => {
    loadData()
  }, [user])

  useEffect(() => {
    if (filtroDistrito) {
      loadHorarios()
    }
  }, [filtroDistrito, filtroIgreja])

  async function loadData() {
    try {
      setLoading(true)
      
      const distritosData = await distritosApi.listar()
      setDistritos(distritosData)
      
      // Se usuário tem distrito fixo, usar esse
      if (user?.distrito_id) {
        setFiltroDistrito(user.distrito_id)
        setPadraoForm(prev => ({ ...prev, distrito_id: user.distrito_id! }))
        
        const igrejasData = await igrejasApi.listar(user.distrito_id)
        setIgrejas(igrejasData)
        
        const horariosData = await horariosCultosApi.listar(user.distrito_id)
        setHorarios(horariosData)
      } else if (distritosData.length > 0) {
        setFiltroDistrito(distritosData[0].id)
        setPadraoForm(prev => ({ ...prev, distrito_id: distritosData[0].id }))
        
        const igrejasData = await igrejasApi.listar(distritosData[0].id)
        setIgrejas(igrejasData)
        
        const horariosData = await horariosCultosApi.listar(distritosData[0].id)
        setHorarios(horariosData)
      }
      
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadHorarios() {
    try {
      const horariosData = await horariosCultosApi.listar(
        filtroIgreja ? undefined : filtroDistrito,
        filtroIgreja || undefined
      )
      setHorarios(horariosData)
      
      if (filtroDistrito && !filtroIgreja) {
        const igrejasData = await igrejasApi.listar(filtroDistrito)
        setIgrejas(igrejasData)
      }
    } catch (err) {
      console.error('Erro ao carregar horários:', err)
    }
  }

  function handleOpenDialog(horario?: HorarioCulto) {
    if (horario) {
      setEditingHorario(horario)
      setFormData({
        distrito_id: horario.distrito_id || '',
        igreja_id: horario.igreja_id || '',
        dia_semana: horario.dia_semana,
        horario: horario.horario.substring(0, 5),
        nome_culto: horario.nome_culto,
        duracao_minutos: horario.duracao_minutos,
        requer_pregador: horario.requer_pregador,
        ativo: horario.ativo
      })
    } else {
      setEditingHorario(null)
      setFormData({
        distrito_id: filtroDistrito,
        igreja_id: filtroIgreja,
        dia_semana: 'sabado',
        horario: '08:30',
        nome_culto: '',
        duracao_minutos: 90,
        requer_pregador: true,
        ativo: true
      })
    }
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      setSubmitting(true)
      
      const payload = {
        ...formData,
        distrito_id: formData.igreja_id ? undefined : formData.distrito_id || undefined,
        igreja_id: formData.igreja_id || undefined,
      }
      
      if (editingHorario) {
        await horariosCultosApi.atualizar(editingHorario.id, payload)
      } else {
        await horariosCultosApi.criar(payload)
      }
      
      await loadHorarios()
      setDialogOpen(false)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao salvar horário')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deletingHorario) return
    try {
      setSubmitting(true)
      await horariosCultosApi.deletar(deletingHorario.id)
      await loadHorarios()
      setDeleteDialogOpen(false)
      setDeletingHorario(null)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao excluir horário')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCriarPadrao() {
    if (!padraoForm.distrito_id) {
      alert('Selecione um distrito')
      return
    }
    
    try {
      setSubmitting(true)
      await horariosCultosApi.criarPadraoIASD(padraoForm.distrito_id, padraoForm.aplicar_todas_igrejas)
      await loadHorarios()
      setPadraoDialogOpen(false)
      alert('Horários padrão criados com sucesso!')
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao criar horários padrão')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredHorarios = horarios.filter(h => 
    h.nome_culto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.dia_semana.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Agrupar horários por dia da semana para visualização
  const horariosPorDia = DIAS_SEMANA.map(dia => ({
    ...dia,
    horarios: filteredHorarios.filter(h => h.dia_semana === dia.value)
  })).filter(dia => dia.horarios.length > 0)

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Horários de Cultos</h1>
            <p className="text-muted-foreground">
              Configure os horários de cultos que necessitam de pregadores
            </p>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPadraoDialogOpen(true)}>
                <Wand2 className="mr-2 h-4 w-4" />
                Criar Padrão IASD
              </Button>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Horário
              </Button>
            </div>
          )}
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Distrito</Label>
                <Select
                  value={filtroDistrito}
                  onChange={(e) => {
                    setFiltroDistrito(e.target.value)
                    setFiltroIgreja('')
                    setPadraoForm(prev => ({ ...prev, distrito_id: e.target.value }))
                  }}
                  disabled={!!user?.distrito_id && !user?.perfis?.includes('membro_associacao')}
                >
                  <option value="">Selecione um distrito</option>
                  {distritos.map(d => (
                    <option key={d.id} value={d.id}>{d.nome}</option>
                  ))}
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Igreja (opcional)</Label>
                <Select
                  value={filtroIgreja}
                  onChange={(e) => setFiltroIgreja(e.target.value)}
                >
                  <option value="">Todas do distrito</option>
                  {igrejas.map(i => (
                    <option key={i.id} value={i.id}>{i.nome}</option>
                  ))}
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome do culto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Horários */}
        <Card>
          <CardHeader>
            <CardTitle>Horários Configurados</CardTitle>
            <CardDescription>
              {horarios.length} horário(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : horariosPorDia.length > 0 ? (
              <div className="space-y-6">
                {horariosPorDia.map(dia => (
                  <div key={dia.value} className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium bg-muted px-3 py-2 rounded">
                      <Clock className="h-4 w-4" />
                      {dia.label}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 pl-4">
                      {dia.horarios.map(horario => {
                        const igreja = igrejas.find(i => i.id === horario.igreja_id)
                        return (
                          <div
                            key={horario.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{horario.nome_culto}</span>
                                {horario.requer_pregador && (
                                  <Badge variant="default" className="text-xs">Requer Pregador</Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {horario.horario.substring(0, 5)} • {horario.duracao_minutos} min
                                {igreja && <span> • {igreja.nome}</span>}
                                {horario.distrito_id && !horario.igreja_id && (
                                  <span> • (Todas igrejas)</span>
                                )}
                              </div>
                            </div>
                            {canManage && (
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenDialog(horario)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setDeletingHorario(horario)
                                    setDeleteDialogOpen(true)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-12">
                <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Nenhum horário de culto configurado
                </p>
                {canManage && (
                  <div className="flex gap-2 justify-center">
                    <Button variant="outline" onClick={() => setPadraoDialogOpen(true)}>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Criar Padrão IASD
                    </Button>
                    <Button onClick={() => handleOpenDialog()}>
                      <Plus className="mr-2 h-4 w-4" />
                      Novo Horário
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal: Criar/Editar Horário */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogClose onClose={() => setDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>
              {editingHorario ? 'Editar Horário' : 'Novo Horário de Culto'}
            </DialogTitle>
            <DialogDescription>
              Configure o horário de culto que necessita de pregador
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Aplicar a</Label>
              <Select
                value={formData.igreja_id || (formData.distrito_id ? 'distrito' : '')}
                onChange={(e) => {
                  if (e.target.value === 'distrito') {
                    setFormData({ ...formData, distrito_id: filtroDistrito, igreja_id: '' })
                  } else if (e.target.value) {
                    setFormData({ ...formData, distrito_id: '', igreja_id: e.target.value })
                  }
                }}
              >
                <option value="">Selecione...</option>
                <option value="distrito">Todo o Distrito (todas igrejas)</option>
                <optgroup label="Igrejas específicas">
                  {igrejas.map(igreja => (
                    <option key={igreja.id} value={igreja.id}>{igreja.nome}</option>
                  ))}
                </optgroup>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dia_semana">Dia da Semana *</Label>
                <Select
                  id="dia_semana"
                  value={formData.dia_semana}
                  onChange={(e) => setFormData({ ...formData, dia_semana: e.target.value })}
                  required
                >
                  {DIAS_SEMANA.map(dia => (
                    <option key={dia.value} value={dia.value}>{dia.label}</option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="horario">Horário *</Label>
                <Input
                  id="horario"
                  type="time"
                  value={formData.horario}
                  onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome_culto">Nome do Culto *</Label>
              <Input
                id="nome_culto"
                value={formData.nome_culto}
                onChange={(e) => setFormData({ ...formData, nome_culto: e.target.value })}
                placeholder="Ex: Culto Divino, Culto Jovem..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duracao_minutos">Duração (minutos)</Label>
              <Input
                id="duracao_minutos"
                type="number"
                min="15"
                max="240"
                value={formData.duracao_minutos}
                onChange={(e) => setFormData({ ...formData, duracao_minutos: parseInt(e.target.value) })}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="requer_pregador"
                checked={formData.requer_pregador}
                onChange={(e) => setFormData({ ...formData, requer_pregador: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="requer_pregador">Requer pregador na escala</Label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? 'Salvando...' : editingHorario ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Criar Padrão IASD */}
      <Dialog open={padraoDialogOpen} onOpenChange={setPadraoDialogOpen}>
        <DialogContent>
          <DialogClose onClose={() => setPadraoDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>Criar Horários Padrão IASD</DialogTitle>
            <DialogDescription>
              Cria automaticamente os horários tradicionais da Igreja Adventista
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Distrito</Label>
              <Select
                value={padraoForm.distrito_id}
                onChange={(e) => setPadraoForm({ ...padraoForm, distrito_id: e.target.value })}
                disabled={!!user?.distrito_id && !user?.perfis?.includes('membro_associacao')}
              >
                <option value="">Selecione um distrito</option>
                {distritos.map(d => (
                  <option key={d.id} value={d.id}>{d.nome}</option>
                ))}
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="aplicar_todas"
                checked={padraoForm.aplicar_todas_igrejas}
                onChange={(e) => setPadraoForm({ ...padraoForm, aplicar_todas_igrejas: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="aplicar_todas">Criar para cada igreja individualmente</Label>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg text-sm space-y-2">
              <p className="font-medium">Horários que serão criados:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li><strong>Sábado 08:30</strong> - Culto Divino - Prioridade 1</li>
                <li><strong>Domingo 19:30</strong> - Culto Evangelístico - Prioridade 2</li>
                <li><strong>Quarta 19:30</strong> - Culto de Oração - Prioridade 3</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPadraoDialogOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCriarPadrao}
              disabled={submitting || !padraoForm.distrito_id}
              className="flex-1"
            >
              <Check className="mr-2 h-4 w-4" />
              {submitting ? 'Criando...' : 'Criar Horários'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Confirmar Exclusão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogClose onClose={() => setDeleteDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o horário "{deletingHorario?.nome_culto}"?
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
