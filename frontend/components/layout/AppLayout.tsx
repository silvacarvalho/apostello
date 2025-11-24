'use client'

import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { ProtectedRoute } from '../auth/ProtectedRoute'

interface AppLayoutProps {
  children: React.ReactNode
  requireAuth?: boolean
  requiredPermission?: string | string[]
}

export function AppLayout({
  children,
  requireAuth = true,
  requiredPermission
}: AppLayoutProps) {
  return (
    <ProtectedRoute requireAuth={requireAuth} requiredPermission={requiredPermission}>
      <div className="min-h-screen bg-background">
        <Header />
        <Sidebar />
        <main className="lg:pl-64">
          <div className="container py-6 px-4">
            {children}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
