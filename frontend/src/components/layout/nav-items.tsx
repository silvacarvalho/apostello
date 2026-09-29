import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Users,
  Church,
  MapPin,
  Star,
  Bell,
  BookOpen,
  CalendarOff,
  Shield,
  MapPinned,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  roles?: string[];
  /** Aparece na barra inferior do celular (até 4 por perfil) */
  primary?: boolean;
}

export const navItems: NavItem[] = [
  {
    title: "Início",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN", "PASTOR_DISTRITAL", "LIDER_DISTRITAL", "PREGADOR", "CANTOR"],
    primary: true,
  },
  {
    title: "Escalas",
    href: "/escalas",
    icon: Calendar,
    roles: ["ADMIN", "PASTOR_DISTRITAL", "LIDER_DISTRITAL"],
    primary: true,
  },
  {
    title: "Escalas",
    href: "/escalas/minha-igreja",
    icon: Calendar,
    roles: ["MEMBRO"],
    primary: true,
  },
  {
    title: "Calendário",
    href: "/calendario",
    icon: CalendarDays,
    roles: ["ADMIN", "PASTOR_DISTRITAL", "LIDER_DISTRITAL", "PREGADOR", "CANTOR"],
    primary: true,
  },
  {
    title: "Itinerário",
    href: "/itinerario",
    icon: MapPinned,
    roles: ["ADMIN", "PASTOR_DISTRITAL", "LIDER_DISTRITAL"],
    primary: true,
  },
  {
    title: "Avaliações",
    href: "/avaliacoes",
    icon: Star,
    roles: ["MEMBRO"],
    primary: true,
  },
  {
    title: "Indisponibilidades",
    href: "/indisponibilidades",
    icon: CalendarOff,
    roles: ["PREGADOR", "CANTOR"],
    primary: true,
  },
  {
    title: "Usuários",
    href: "/usuarios",
    icon: Users,
    roles: ["ADMIN", "PASTOR_DISTRITAL", "LIDER_DISTRITAL"],
  },
  {
    title: "Igrejas",
    href: "/igrejas",
    icon: Church,
    roles: ["ADMIN", "PASTOR_DISTRITAL", "LIDER_DISTRITAL"],
  },
  {
    title: "Distritos",
    href: "/distritos",
    icon: MapPin,
    roles: ["ADMIN"],
  },
  {
    title: "Temas",
    href: "/temas",
    icon: BookOpen,
    roles: ["ADMIN", "ASSOCIACAO"],
  },
  {
    title: "Bloqueios",
    href: "/bloqueios",
    icon: Shield,
    roles: ["ADMIN", "PASTOR_DISTRITAL"],
  },
  {
    title: "Notificações",
    href: "/notificacoes",
    icon: Bell,
    primary: true,
  },
];

export function getNavItemsForUser(tipo?: string): NavItem[] {
  return navItems.filter((item) => !item.roles || (tipo ? item.roles.includes(tipo) : false));
}

export function isNavActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  // "/escalas" não deve ficar ativo dentro de "/escalas/minha-igreja" quando ambos existem
  return pathname.startsWith(href + "/");
}
