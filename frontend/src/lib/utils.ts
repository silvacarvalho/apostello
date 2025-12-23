import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converte uma string de data (YYYY-MM-DD) para Date sem problemas de timezone.
 * Quando não há timezone, o JavaScript interpreta como UTC, causando diferença de 1 dia.
 */
export function parseDate(dateStr: string): Date {
  // Se a string contém apenas data (YYYY-MM-DD), adiciona T12:00:00 para evitar problemas de timezone
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr + "T12:00:00");
  }
  return new Date(dateStr);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? parseDate(date) : date;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(time: string): string {
  return time.substring(0, 5);
}

export function getDayOfWeek(day: number | string): string {
  // Handle ENUM values from backend
  if (typeof day === "string") {
    const enumDays: Record<string, string> = {
      "DOMINGO": "Domingo",
      "SEGUNDA": "Segunda-feira",
      "TERCA": "Terça-feira",
      "QUARTA": "Quarta-feira",
      "QUINTA": "Quinta-feira",
      "SEXTA": "Sexta-feira",
      "SABADO": "Sábado",
    };
    return enumDays[day] || day;
  }
  
  // Handle numeric values
  const days = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
  ];
  return days[day] || "";
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function getScoreColor(score: number): string {
  if (score >= 8) return "text-green-600";
  if (score >= 6) return "text-yellow-600";
  if (score >= 4) return "text-orange-600";
  return "text-red-600";
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "ATIVO":
    case "PUBLICADA":
    case "CONFIRMADO":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "PENDENTE":
    case "RASCUNHO":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "INATIVO":
    case "CANCELADO":
    case "RECUSADO":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  }
}

export function formatCPF(cpf: string): string {
  if (!cpf) return "";
  const cleaned = cpf.replace(/\D/g, "");
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export function formatPhone(phone: string): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }
  return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
}
