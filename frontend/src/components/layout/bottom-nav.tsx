"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Menu, Settings, LogOut, Moon, Sun, Download, Share } from "lucide-react";

import { cn, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuthStore, getUserRole } from "@/stores/auth-store";
import { usePwaInstall } from "@/components/pwa/use-pwa-install";
import { getNavItemsForUser, isNavActive } from "./nav-items";

/** Barra de navegação inferior — apenas no celular/tablet. */
export function BottomNav() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const { canInstall, isIos, install } = usePwaInstall();
  const [moreOpen, setMoreOpen] = useState(false);

  const items = getNavItemsForUser(user?.tipo);
  const primary = items.filter((i) => i.primary).slice(0, 4);
  const secondary = items.filter((i) => !primary.includes(i));
  const moreActive = secondary.some((i) => isNavActive(pathname, i.href));

  const handleLogout = () => {
    logout();
    window.location.href = "/auth/login";
  };

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-card/90 backdrop-blur-lg lg:hidden"
        aria-label="Navegação principal"
      >
        <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2 pb-safe">
          {primary.map((item) => {
            const active = isNavActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href + item.title} className="flex-1">
                <Link
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-1 px-1 py-2.5 text-[11px] font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-14 items-center justify-center rounded-full transition-colors",
                      active && "bg-accent"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  {item.title}
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              onClick={() => setMoreOpen(true)}
              className={cn(
                "flex w-full flex-col items-center gap-1 px-1 py-2.5 text-[11px] font-medium transition-colors",
                moreActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-14 items-center justify-center rounded-full transition-colors",
                  moreActive && "bg-accent"
                )}
              >
                <Menu className="h-5 w-5" />
              </span>
              Mais
            </button>
          </li>
        </ul>
      </nav>

      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="sr-only">Menu</DialogTitle>
            <DialogDescription className="sr-only">Mais opções do aplicativo</DialogDescription>
            <div className="flex items-center gap-3 pr-8">
              <Avatar className="h-11 w-11">
                <AvatarImage src={user?.foto_url || undefined} />
                <AvatarFallback>{user ? getInitials(user.nome_completo) : "?"}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 text-left">
                <p className="truncate font-semibold">{user?.nome_completo}</p>
                <p className="text-xs text-muted-foreground">
                  {user ? getUserRole(user.tipo) : ""}
                </p>
              </div>
            </div>
          </DialogHeader>

          {secondary.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {secondary.map((item) => {
                const Icon = item.icon;
                const active = isNavActive(pathname, item.href);
                return (
                  <Link
                    key={item.href + item.title}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-2xl border border-border/60 p-3 text-center text-xs font-medium transition-colors",
                      active ? "bg-accent text-accent-foreground" : "bg-card hover:bg-muted"
                    )}
                  >
                    <Icon className="h-6 w-6 text-primary" />
                    {item.title}
                  </Link>
                );
              })}
            </div>
          )}

          <div className="space-y-2">
            <Link href="/configuracoes" onClick={() => setMoreOpen(false)}>
              <Button variant="outline" className="w-full justify-start">
                <Settings className="h-4 w-4" />
                Configurações e perfil
              </Button>
            </Link>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {theme === "dark" ? "Tema claro" : "Tema escuro"}
            </Button>
            {canInstall && (
              <Button variant="outline" className="w-full justify-start" onClick={install}>
                <Download className="h-4 w-4" />
                Instalar aplicativo
              </Button>
            )}
            {isIos && (
              <p className="flex items-start gap-2 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
                <Share className="mt-0.5 h-4 w-4 shrink-0" />
                Para instalar no iPhone: toque em Compartilhar e depois em
                &quot;Adicionar à Tela de Início&quot;.
              </p>
            )}
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
