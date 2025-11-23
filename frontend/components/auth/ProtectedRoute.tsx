'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
  requiredPermission?: string
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

  useEffect(() => {
    if (!loading) {
      // Se requer autenticação e não está autenticado
      if (requireAuth && !user) {
        router.push(redirectTo)
        return
      }

      // Se requer permissão específica e não tem
      if (requiredPermission && !hasPermission(requiredPermission)) {
        router.push('/dashboard')
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

  // Se requer permissão e não tem, não renderiza
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return null
  }

  return <>{children}</>
}
