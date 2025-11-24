'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
  requiredPermission?: string | string[]
  redirectTo?: string
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  requiredPermission,
  redirectTo = '/login'
}: ProtectedRouteProps) {
  const { user, loading, hasPermission } = useAuth()
  const router = useRouter()
  const [showUnauthorized, setShowUnauthorized] = useState(false)

  useEffect(() => {
    if (!loading) {
      // Se requer autenticação e não está autenticado
      if (requireAuth && !user) {
        router.push(redirectTo)
        return
      }

      // Se requer permissão específica e não tem
      if (requiredPermission) {
        const permissions = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission]
        const hasAnyPermission = permissions.some(perm => hasPermission(perm))
        
        if (!hasAnyPermission) {
          setShowUnauthorized(true)
          // Aguarda um pouco para mostrar a mensagem antes de redirecionar
          setTimeout(() => {
            router.push('/dashboard')
          }, 2000)
        }
      }
    }
  }, [user, loading, requireAuth, requiredPermission, router, redirectTo, hasPermission])

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  // Se não está autenticado e requer, não renderiza (vai redirecionar)
  if (requireAuth && !user) {
    return null
  }

  // Se requer permissão e não tem, mostra mensagem
  if (requiredPermission) {
    const permissions = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission]
    const hasAnyPermission = permissions.some(perm => hasPermission(perm))
    
    if (!hasAnyPermission) {
      if (showUnauthorized) {
        return (
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-center space-y-4 p-8 bg-destructive/10 rounded-lg border border-destructive">
              <div className="text-destructive">
                <svg
                  className="mx-auto h-12 w-12"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-destructive">Acesso Negado</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Você não tem permissão para acessar esta página.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Redirecionando para o dashboard...
                </p>
              </div>
            </div>
          </div>
        )
      }
      return null
    }
  }

  return <>{children}</>
}
