"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Church,
  MapPin,
  Star,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  BookOpen,
} from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuthStore, getUserRole, isAdmin, isPastor } from "@/stores/auth-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    title: "Escalas",
    href: "/escalas",
    icon: <Calendar className="h-5 w-5" />,
  },
  {
    title: "Usuários",
    href: "/usuarios",
    icon: <Users className="h-5 w-5" />,
    roles: ["ADMIN", "PASTOR_DISTRITAL", "LIDER_DISTRITAL"],
  },
  {
    title: "Igrejas",
    href: "/igrejas",
    icon: <Church className="h-5 w-5" />,
    roles: ["ADMIN", "PASTOR_DISTRITAL", "LIDER_DISTRITAL"],
  },
  {
    title: "Distritos",
    href: "/distritos",
    icon: <MapPin className="h-5 w-5" />,
    roles: ["ADMIN"],
  },
  {
    title: "Temas",
    href: "/temas",
    icon: <BookOpen className="h-5 w-5" />,
    roles: ["PREGADOR"],
  },
  {
    title: "Avaliações",
    href: "/avaliacoes",
    icon: <Star className="h-5 w-5" />,
    roles: ["MEMBRO"],
  },
  {
    title: "Notificações",
    href: "/notificacoes",
    icon: <Bell className="h-5 w-5" />,
  },
];

export function Sidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.tipo);
  });

  const handleLogout = () => {
    logout();
    window.location.href = "/auth/login";
  };

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <svg
            className="h-6 w-6 text-primary-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </div>
        <div>
          <h1 className="font-bold text-lg">Apostello</h1>
          <p className="text-xs text-muted-foreground">Escalas de Pregação</p>
        </div>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {filteredNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {item.icon}
              {item.title}
            </Link>
          );
        })}
      </nav>

      <Separator />

      {/* User Info */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <Avatar>
            <AvatarImage src={user?.foto_url || undefined} />
            <AvatarFallback>
              {user ? getInitials(user.nome_completo) : "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.nome_completo}</p>
            <p className="text-xs text-muted-foreground">
              {user ? getUserRole(user.tipo) : ""}
            </p>
          </div>
        </div>

        <div className="space-y-1">
          <Link
            href="/configuracoes"
            onClick={() => setIsMobileOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Settings className="h-5 w-5" />
            Configurações
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Sair
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 lg:hidden"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-card transition-transform duration-200 lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <NavContent />
      </aside>
    </>
  );
}
