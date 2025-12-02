'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import api from './api'

interface User {
  id: string
  nome_completo: string
  email: string
  telefone?: string
  associacao_id?: string
  distrito_id?: string
  igreja_id?: string
  igreja?: {
    id: string
    nome: string
  }
  perfis: string[]
  ativo: boolean
  url_foto?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  hasPermission: (perfil: string) => boolean
}

interface RegisterData {
  nome_completo: string
  email: string
  senha: string
  telefone?: string
  igreja_id: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Carregar token e usuário do localStorage ao iniciar
  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem('token')

      if (storedToken) {
        setToken(storedToken)
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`

        try {
          // Sempre buscar dados atualizados do usuário do backend
          const userResponse = await api.get('/auth/me')
          const userData = userResponse.data
          setUser(userData)
          localStorage.setItem('user', JSON.stringify(userData))
        } catch (error) {
          // Token inválido ou expirado
          console.error('Erro ao carregar usuário:', error)
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          setToken(null)
          setUser(null)
        }
      }

      setLoading(false)
    }

    loadUser()
  }, [])

  async function login(email: string, password: string) {
    try {
      // Criar FormData no formato application/x-www-form-urlencoded
      const formData = new URLSearchParams()
      formData.append('username', email)
      formData.append('password', password)

      const response = await api.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })

      const { access_token, token_type } = response.data

      // IMPORTANTE: Salvar token no localStorage ANTES de fazer a requisição /auth/me
      // O interceptor do axios lê o token do localStorage
      localStorage.setItem('token', access_token)
      
      const userResponse = await api.get('/auth/me')
      const userData = userResponse.data

      // Salvar no estado
      setToken(access_token)
      setUser(userData)
      localStorage.setItem('user', JSON.stringify(userData))

      // Redirecionar para dashboard
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Erro ao fazer login:', error)
      throw new Error(error.response?.data?.detail || 'Erro ao fazer login')
    }
  }

  async function register(data: RegisterData) {
    try {
      await api.post('/membros/', {
        ...data,
        perfis: ['MEMBRO_ASSOCIACAO'], // Perfil padrão
        ativo: true
      })

      // Fazer login automático após registro
      await login(data.email, data.senha)
    } catch (error: any) {
      console.error('Erro ao registrar:', error)
      throw new Error(error.response?.data?.detail || 'Erro ao registrar')
    }
  }

  function logout() {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    delete api.defaults.headers.common['Authorization']
    router.push('/login')
  }

  function hasPermission(perfil: string): boolean {
    if (!user) return false
    return user.perfis.includes(perfil)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        hasPermission
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
