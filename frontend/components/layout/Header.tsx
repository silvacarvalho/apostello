'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Menu, Bell, User, LogOut, Settings, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useStore } from '@/lib/store'
import { useAuth } from '@/lib/auth'

export function Header() {
  const { toggleSidebar } = useStore()
  const { user, logout } = useAuth()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userMenuOpen])

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

          <ThemeToggle />

          {user && (
            <div className="relative" ref={dropdownRef}>
              <Button
                variant="ghost"
                className="gap-2"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="flex items-center gap-2">
                  {user.url_foto ? (
                    <img
                      src={user.url_foto}
                      alt={user.nome_completo}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium">{user.nome_completo}</p>
                    <p className="text-xs text-muted-foreground">{user.igreja?.nome}</p>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </div>
              </Button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 rounded-lg border bg-background shadow-lg z-50">
                    <div className="p-4 border-b">
                      <div className="flex items-start gap-3">
                        {user.url_foto ? (
                          <img
                            src={user.url_foto}
                            alt={user.nome_completo}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-6 w-6 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{user.nome_completo}</p>
                          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                          <p className="text-sm text-muted-foreground truncate">{user.igreja?.nome}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-3">
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
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
