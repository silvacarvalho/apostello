'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Church, Mail, Lock, User, Phone, MapPin, AlertCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import api from '@/lib/api'

export default function RegistroPage() {
  const [formData, setFormData] = useState({
    nome_completo: '',
    email: '',
    senha: '',
    confirmarSenha: '',
    telefone: '',
    igreja_id: ''
  })
  const [igrejas, setIgrejas] = useState<any[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const router = useRouter()

  useEffect(() => {
    loadIgrejas()
  }, [])

  async function loadIgrejas() {
    try {
      const response = await api.get('/igrejas/')
      setIgrejas(response.data)
    } catch (err) {
      console.error('Erro ao carregar igrejas:', err)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Validações
    if (formData.senha !== formData.confirmarSenha) {
      setError('As senhas não coincidem')
      return
    }

    if (formData.senha.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres')
      return
    }

    if (!formData.igreja_id) {
      setError('Por favor, selecione uma igreja')
      return
    }

    setLoading(true)

    try {
      await register({
        nome_completo: formData.nome_completo,
        email: formData.email,
        senha: formData.senha,
        telefone: formData.telefone || undefined,
        igreja_id: formData.igreja_id
      })
      // Redirecionamento é feito no contexto de auth
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary p-3">
              <Church className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Criar Conta</CardTitle>
          <CardDescription>
            Cadastre-se no sistema de gestão de pregações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="nome_completo">Nome Completo *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="nome_completo"
                  type="text"
                  placeholder="Seu nome completo"
                  value={formData.nome_completo}
                  onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="telefone"
                  type="tel"
                  placeholder="(11) 98765-4321"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="igreja_id">Igreja *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
                <Select
                  id="igreja_id"
                  value={formData.igreja_id}
                  onChange={(e) => setFormData({ ...formData, igreja_id: e.target.value })}
                  className="pl-10"
                  required
                >
                  <option value="">Selecione sua igreja</option>
                  {igrejas.map(igreja => (
                    <option key={igreja.id} value={igreja.id}>
                      {igreja.nome}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha">Senha *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="senha"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={formData.senha}
                  onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                  className="pl-10"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmarSenha">Confirmar Senha *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirmarSenha"
                  type="password"
                  placeholder="Digite a senha novamente"
                  value={formData.confirmarSenha}
                  onChange={(e) => setFormData({ ...formData, confirmarSenha: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Cadastrando...' : 'Cadastrar'}
            </Button>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Já tem uma conta? </span>
              <Link href="/login" className="text-primary hover:underline font-medium">
                Faça login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
