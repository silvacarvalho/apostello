"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, LogOut } from "lucide-react";

import { cn, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore, getUserRole } from "@/stores/auth-store";
import { getNavItemsForUser, isNavActive } from "./nav-items";
import { LogoMark } from "./logo";

/** Menu lateral — visível apenas em telas grandes (no celular usa a barra inferior). */
export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const items = getNavItemsForUser(user?.tipo);

  const handleLogout = () => {
    logout();
    window.location.href = "/auth/login";
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border/60 bg-card lg:flex">
      <div className="flex items-center gap-3 px-5 py-6">
        <LogoMark />
        <div>
          <h1 className="text-lg font-bold leading-tight tracking-tight">Apostello</h1>
          <p className="text-xs text-muted-foreground">Escalas de Pregação</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {items.map((item) => {
          const active = isNavActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href + item.title}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
              )}
              <Icon className="h-5 w-5" />
              {item.title}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/60 p-3">
        <div className="mb-2 flex items-center gap-3 rounded-xl bg-muted/60 p-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user?.foto_url || undefined} />
            <AvatarFallback>{user ? getInitials(user.nome_completo) : "?"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.nome_completo}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user ? getUserRole(user.tipo) : ""}
            </p>
          </div>
        </div>
        <Link
          href="/configuracoes"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Settings className="h-5 w-5" />
          Configurações
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="h-5 w-5" />
          Sair
        </button>
      </div>
    </aside>
  );
}
