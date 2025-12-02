'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Calendar,
  Star,
  QrCode,
  Users,
  Settings,
  FileText,
  Upload,
  Church,
  MapPin,
  BookOpen,
  UserCheck,
  Building2,
  Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { useAuth } from '@/lib/auth'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },

  // Gestão
  { name: 'Associações', href: '/associacoes', icon: Building2, section: 'Gestão', requiredPerfis: ['membro_associacao'] },
  { name: 'Distritos', href: '/distritos', icon: MapPin },
  { name: 'Igrejas', href: '/igrejas', icon: Church },
  { name: 'Membros', href: '/membros', icon: UserCheck },
  { name: 'Pregadores', href: '/pregadores', icon: Users },
  { name: 'Temáticas', href: '/tematicas', icon: BookOpen },

  // Pregações
  { name: 'Escalas', href: '/escalas', icon: Calendar, section: 'Pregações' },
  { name: 'Horários de Cultos', href: '/horarios-cultos', icon: Clock, requiredPerfis: ['membro_associacao', 'pastor_distrital', 'lider_distrital'] },
  { name: 'Pregações', href: '/pregacoes', icon: Calendar },
  { name: 'Avaliações', href: '/avaliacoes', icon: Star },

  // Ferramentas
  { name: 'QR Code Universal', href: '/qrcode', icon: QrCode, section: 'Ferramentas' },
  { name: 'Importação', href: '/importacao', icon: Upload },
  { name: 'Relatórios', href: '/relatorios', icon: FileText },
  { name: 'Configurações', href: '/configuracoes', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarOpen, setSidebarOpen } = useStore()
  const { user } = useAuth()

  // Filtrar navegação baseado nos perfis do usuário
  const filteredNavigation = navigation.filter(item => {
    if (!item.requiredPerfis) return true
    // Verifica se o usuário tem pelo menos um dos perfis necessários
    return item.requiredPerfis.some(perfil => user?.perfis?.includes(perfil))
  })

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-64 border-r bg-background transition-transform lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col gap-2 overflow-y-auto p-4">
          <nav className="flex flex-col gap-1">
            {filteredNavigation.map((item, index) => {
              const isActive = pathname === item.href
              const showSection = item.section && (!filteredNavigation[index - 1] || filteredNavigation[index - 1].section !== item.section)

              return (
                <div key={item.name}>
                  {showSection && (
                    <div className="mt-4 mb-2 px-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">
                        {item.section}
                      </p>
                    </div>
                  )}
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                </div>
              )
            })}
          </nav>
        </div>
      </aside>
    </>
  )
}
