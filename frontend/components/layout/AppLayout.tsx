'use client'

import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Sidebar />
      <main className="lg:pl-64">
        <div className="container py-6 px-4">
          {children}
        </div>
      </main>
    </div>
  )
}
