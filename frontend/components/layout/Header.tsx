'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, Bell, User, LogOut, Settings, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useStore } from '@/lib/store'
import { useAuth } from '@/lib/auth'

export function Header() {
  const { toggleSidebar } = useStore()
  const { user, logout } = useAuth()
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  function getPerfilLabel(perfil: string) {
    const perfis: Record<string, string> = {
      'MEMBRO_ASSOCIACAO': 'Membro',
      'PASTOR_DISTRITAL': 'Pastor',
      'PREGADOR': 'Pregador',
      'AVALIADOR': 'Avaliador'
    }
    return perfis[perfil] || perfil
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600" />
            <span className="hidden font-bold sm:inline-block">Apostello</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>

          {user && (
            <div className="relative">
              <Button
                variant="ghost"
                className="gap-2"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium">{user.nome_completo}</p>
                    <p className="text-xs text-muted-foreground">{user.igreja?.nome}</p>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </div>
              </Button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-72 rounded-lg border bg-background shadow-lg z-50">
                    <div className="p-4 border-b">
                      <p className="font-medium">{user.nome_completo}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <p className="text-sm text-muted-foreground mt-1">{user.igreja?.nome}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {user.perfis.map(perfil => (
                          <Badge key={perfil} variant="outline" className="text-xs">
                            {getPerfilLabel(perfil)}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="p-2">
                      <Link
                        href="/perfil"
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <User className="h-4 w-4" />
                        Meu Perfil
                      </Link>

                      <button
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent text-destructive transition-colors"
                        onClick={() => {
                          setUserMenuOpen(false)
                          logout()
                        }}
                      >
                        <LogOut className="h-4 w-4" />
                        Sair
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
