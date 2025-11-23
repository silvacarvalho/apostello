'use client'

import { useState, useEffect } from 'react'
import { User, Lock, Camera, Save, Mail, Phone, MapPin, Calendar, Shield } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ImageUpload } from '@/components/ui/image-upload'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/lib/auth'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'

interface ProfileFormData {
  nome_completo: string
  email: string
  telefone?: string
  whatsapp?: string
  cpf?: string
  data_nascimento?: string
  genero?: string
  igreja_id?: string
  url_foto?: string
}

interface PasswordFormData {
  senha_atual: string
  senha_nova: string
  senha_confirmacao: string
}

export default function PerfilPage() {
  const { user, token } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [igrejas, setIgrejas] = useState<any[]>([])

  const [profileData, setProfileData] = useState<ProfileFormData>({
    nome_completo: '',
    email: '',
    telefone: '',
    whatsapp: '',
    cpf: '',
    data_nascimento: '',
    genero: '',
    igreja_id: '',
    url_foto: ''
  })

  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    senha_atual: '',
    senha_nova: '',
    senha_confirmacao: ''
  })

  const [showPasswordForm, setShowPasswordForm] = useState(false)

  const generos = [
    { value: 'masculino', label: 'Masculino' },
    { value: 'feminino', label: 'Feminino' },
    { value: 'outro', label: 'Outro' },
    { value: 'prefiro_nao_dizer', label: 'Prefiro não dizer' }
  ]

  useEffect(() => {
    loadData()
  }, [user])

  async function loadData() {
    if (!user) return

    try {
      setLoading(true)
      const [userData, igrejasData] = await Promise.all([
        api.get(`/usuarios/${user.id}`).then(r => r.data),
        api.get('/igrejas/').then(r => r.data)
      ])

      setProfileData({
        nome_completo: userData.nome_completo || '',
        email: userData.email || '',
        telefone: userData.telefone || '',
        whatsapp: userData.whatsapp || '',
        cpf: userData.cpf || '',
        data_nascimento: userData.data_nascimento || '',
        genero: userData.genero || '',
        igreja_id: userData.igreja_id || '',
        url_foto: userData.url_foto || ''
      })

      setIgrejas(igrejasData)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      showToast('error', 'Erro ao carregar dados do perfil')
    } finally {
      setLoading(false)
    }
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    try {
      setSubmitting(true)
      await api.put(`/usuarios/${user.id}`, profileData)
      showToast('success', 'Perfil atualizado com sucesso!')

      // Recarregar dados do usuário
      window.location.reload()
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Erro ao atualizar perfil')
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    // Validações
    if (passwordData.senha_nova !== passwordData.senha_confirmacao) {
      showToast('error', 'As senhas não coincidem')
      return
    }

    if (passwordData.senha_nova.length < 8) {
      showToast('error', 'A senha deve ter no mínimo 8 caracteres')
      return
    }

    try {
      setSubmitting(true)
      await api.put(`/usuarios/${user.id}/senha`, {
        senha_atual: passwordData.senha_atual,
        senha_nova: passwordData.senha_nova
      })
      showToast('success', 'Senha alterada com sucesso!')
      setPasswordData({
        senha_atual: '',
        senha_nova: '',
        senha_confirmacao: ''
      })
      setShowPasswordForm(false)
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Erro ao alterar senha')
    } finally {
      setSubmitting(false)
    }
  }

  function handleImageChange(imageUrl: string) {
    setProfileData({ ...profileData, url_foto: imageUrl })
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
          <p className="text-muted-foreground">
            Gerencie suas informações pessoais e configurações de conta
          </p>
        </div>

        {/* User Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{user?.nome_completo}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-2">
                  <Mail className="h-4 w-4" />
                  {user?.email}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {user?.perfis?.map((perfil: string) => (
                  <Badge key={perfil} className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    {perfil.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações Pessoais
            </CardTitle>
            <CardDescription>
              Atualize seus dados pessoais e informações de contato
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              {/* Photo Upload */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  {profileData.url_foto ? (
                    <img
                      src={profileData.url_foto}
                      alt="Foto de perfil"
                      className="h-24 w-24 rounded-full object-cover border-4 border-gray-200"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-12 w-12 text-primary" />
                    </div>
                  )}
                  <div className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-md">
                    <Camera className="h-4 w-4 text-gray-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <Label>Foto de Perfil</Label>
                  <ImageUpload
                    value={profileData.url_foto}
                    onChange={handleImageChange}
                    aspectRatio="square"
                  />
                </div>
              </div>

              {/* Personal Data */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="nome_completo">Nome Completo *</Label>
                  <Input
                    id="nome_completo"
                    value={profileData.nome_completo}
                    onChange={(e) => setProfileData({ ...profileData, nome_completo: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    value={profileData.cpf}
                    onChange={(e) => setProfileData({ ...profileData, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={profileData.telefone}
                    onChange={(e) => setProfileData({ ...profileData, telefone: e.target.value })}
                    placeholder="(11) 98765-4321"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={profileData.whatsapp}
                    onChange={(e) => setProfileData({ ...profileData, whatsapp: e.target.value })}
                    placeholder="(11) 98765-4321"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_nascimento">Data de Nascimento</Label>
                  <Input
                    id="data_nascimento"
                    type="date"
                    value={profileData.data_nascimento}
                    onChange={(e) => setProfileData({ ...profileData, data_nascimento: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="genero">Gênero</Label>
                  <Select
                    id="genero"
                    value={profileData.genero}
                    onChange={(e) => setProfileData({ ...profileData, genero: e.target.value })}
                  >
                    <option value="">Selecione...</option>
                    {generos.map(g => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </Select>
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="igreja_id">Igreja</Label>
                  <Select
                    id="igreja_id"
                    value={profileData.igreja_id}
                    onChange={(e) => setProfileData({ ...profileData, igreja_id: e.target.value })}
                  >
                    <option value="">Selecione uma igreja</option>
                    {igrejas.map(igreja => (
                      <option key={igreja.id} value={igreja.id}>
                        {igreja.nome}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={submitting}>
                  <Save className="h-4 w-4 mr-2" />
                  {submitting ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Segurança
            </CardTitle>
            <CardDescription>
              Altere sua senha de acesso
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showPasswordForm ? (
              <Button
                variant="outline"
                onClick={() => setShowPasswordForm(true)}
              >
                <Lock className="h-4 w-4 mr-2" />
                Alterar Senha
              </Button>
            ) : (
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="senha_atual">Senha Atual *</Label>
                  <Input
                    id="senha_atual"
                    type="password"
                    value={passwordData.senha_atual}
                    onChange={(e) => setPasswordData({ ...passwordData, senha_atual: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="senha_nova">Nova Senha *</Label>
                  <Input
                    id="senha_nova"
                    type="password"
                    value={passwordData.senha_nova}
                    onChange={(e) => setPasswordData({ ...passwordData, senha_nova: e.target.value })}
                    required
                    minLength={8}
                  />
                  <p className="text-sm text-muted-foreground">
                    Mínimo de 8 caracteres
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="senha_confirmacao">Confirmar Nova Senha *</Label>
                  <Input
                    id="senha_confirmacao"
                    type="password"
                    value={passwordData.senha_confirmacao}
                    onChange={(e) => setPasswordData({ ...passwordData, senha_confirmacao: e.target.value })}
                    required
                    minLength={8}
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowPasswordForm(false)
                      setPasswordData({
                        senha_atual: '',
                        senha_nova: '',
                        senha_confirmacao: ''
                      })
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Alterando...' : 'Alterar Senha'}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
