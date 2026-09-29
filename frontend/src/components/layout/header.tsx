"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { Bell, Moon, Sun, Search, User, Loader2, Check } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuthStore, getUserRole } from "@/stores/auth-store";
import { getInitials } from "@/lib/utils";
import { api } from "@/lib/api";

interface Notificacao {
  id: number;
  titulo: string;
  mensagem: string;
  tipo: string;
  lida: boolean;
  created_at: string;
  link?: string;
}

export function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { user, logout } = useAuthStore();
  const [fotoUrl, setFotoUrl] = useState<string | undefined>(undefined);
  
  // Estados das notificações
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [countNaoLidas, setCountNaoLidas] = useState(0);
  const [loadingNotif, setLoadingNotif] = useState(false);

  // Buscar contagem de notificações não lidas
  const fetchCountNaoLidas = useCallback(async () => {
    try {
      const data = await api.get<{ count: number }>("/api/v1/notificacoes/count");
      setCountNaoLidas(data.count);
    } catch (error) {
      console.error("Erro ao buscar contagem de notificações:", error);
    }
  }, []);

  // Buscar notificações não lidas
  const fetchNotificacoesNaoLidas = useCallback(async () => {
    setLoadingNotif(true);
    try {
      const data = await api.get<Notificacao[]>("/api/v1/notificacoes/nao-lidas");
      setNotificacoes(data.slice(0, 5)); // Limitar a 5 notificações no dropdown
    } catch (error) {
      console.error("Erro ao buscar notificações:", error);
    } finally {
      setLoadingNotif(false);
    }
  }, []);

  // Marcar notificação como lida
  const marcarComoLida = async (notificacaoId: number) => {
    try {
      await api.post(`/api/v1/notificacoes/${notificacaoId}/ler`, {});
      setNotificacoes(prev => prev.filter(n => n.id !== notificacaoId));
      setCountNaoLidas(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Erro ao marcar notificação como lida:", error);
    }
  };

  // Marcar todas como lidas
  const marcarTodasComoLidas = async () => {
    try {
      await api.post("/api/v1/notificacoes/ler-todas", {});
      setNotificacoes([]);
      setCountNaoLidas(0);
    } catch (error) {
      console.error("Erro ao marcar todas como lidas:", error);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Atualizar foto de perfil quando usuário mudar
    if (user?.foto_url && user?.id) {
      setFotoUrl(`/api/v1/perfil/foto/${user.id}?t=${Date.now()}`);
    } else {
      setFotoUrl(undefined);
    }
    
    // Buscar contagem inicial de notificações
    if (user) {
      fetchCountNaoLidas();
      
      // Atualizar contagem a cada 30 segundos
      const interval = setInterval(fetchCountNaoLidas, 30000);
      return () => clearInterval(interval);
    }
  }, [user, fetchCountNaoLidas]);

  const handleLogout = () => {
    logout();
    window.location.href = "/auth/login";
  };

  // Formatar data relativa
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Agora";
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString("pt-BR");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6 lg:px-8">
      {/* Spacer para sidebar toggle mobile */}
      <div className="w-10 lg:hidden" />

      {/* Search */}
      <div className="flex-1 max-w-md hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="pl-9 bg-muted/50 border-0 focus-visible:ring-1"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Theme Toggle */}
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        )}

        {/* Notifications */}
        <DropdownMenu onOpenChange={(open) => open && fetchNotificacoesNaoLidas()}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {countNaoLidas > 0 && (
                <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                  {countNaoLidas > 99 ? "99+" : countNaoLidas}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-2">
              <DropdownMenuLabel>Notificações</DropdownMenuLabel>
              {countNaoLidas > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={(e) => {
                    e.preventDefault();
                    marcarTodasComoLidas();
                  }}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Marcar todas
                </Button>
              )}
            </div>
            <DropdownMenuSeparator />
            
            {loadingNotif ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : notificacoes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhuma notificação pendente
              </div>
            ) : (
              notificacoes.map((notif) => (
                <DropdownMenuItem 
                  key={notif.id}
                  className="flex flex-col items-start gap-1 py-3 cursor-pointer"
                  onClick={() => {
                    // Redireciona para a página de notificações com a notificação aberta
                    window.location.href = `/notificacoes?notificacao_id=${notif.id}`;
                  }}
                >
                  <div className="flex items-start justify-between w-full">
                    <p className="font-medium text-sm">{notif.titulo}</p>
                    <span className="text-[10px] text-muted-foreground">
                      {formatRelativeTime(notif.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {notif.mensagem}
                  </p>
                </DropdownMenuItem>
              ))
            )}
            
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="justify-center text-primary">
              <Link href="/notificacoes">
                Ver todas as notificações
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={fotoUrl} />
                <AvatarFallback className="text-xs">
                  {user ? getInitials(user.nome_completo) : "?"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{user?.nome_completo}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {user ? getUserRole(user.tipo) : ""}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/configuracoes" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Meu Perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={handleLogout}
            >
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
