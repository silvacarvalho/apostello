"use client";

import { useAuthStore, User } from "@/stores/auth-store";
import { ReactNode } from "react";

interface RestrictedAccessProps {
  children: ReactNode;
  roles?: string[];
  condition?: (user: User | null) => boolean;
  fallback?: ReactNode;
  hideIfRestricted?: boolean;
}

/**
 * Componente para controlar acesso baseado em roles ou condições customizadas
 * 
 * @param roles - Lista de tipos de usuário permitidos (ex: ["ADMIN", "PASTOR_DISTRITAL"])
 * @param condition - Função customizada para validar acesso
 * @param fallback - Componente a exibir se não tiver acesso
 * @param hideIfRestricted - Se true, não renderiza nada quando restrito (default: false)
 */
export function RestrictedAccess({
  children,
  roles,
  condition,
  fallback = null,
  hideIfRestricted = false,
}: RestrictedAccessProps) {
  const { user } = useAuthStore();

  // Se não estiver autenticado, não mostra nada
  if (!user) {
    return hideIfRestricted ? null : <>{fallback}</>;
  }

  // Verificar por roles
  if (roles && roles.length > 0) {
    const hasRole = roles.includes(user.tipo);
    if (!hasRole) {
      return hideIfRestricted ? null : <>{fallback}</>;
    }
  }

  // Verificar por condição customizada
  if (condition && !condition(user)) {
    return hideIfRestricted ? null : <>{fallback}</>;
  }

  return <>{children}</>;
}
