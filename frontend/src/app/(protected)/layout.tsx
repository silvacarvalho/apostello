"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Loading } from "@/components/ui/loading";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PullToRefresh } from "@/components/pwa/pull-to-refresh";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, setLoading } = useAuthStore();

  useEffect(() => {
    // Verificar autenticação após hidratação do store
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 100);

    return () => clearTimeout(timeout);
  }, [setLoading]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loading text="Carregando..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Menu lateral (desktop) */}
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col lg:ml-64">
        <Header />

        {/* Espaço extra embaixo no celular por causa da barra de navegação */}
        <main className="flex-1 p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:p-6 lg:p-8 lg:pb-8">
          <div className="mx-auto max-w-7xl animate-in">{children}</div>
        </main>
      </div>

      {/* Barra inferior (celular/tablet) */}
      <BottomNav />

      {/* Puxar para atualizar (celular/tablet) */}
      <PullToRefresh />
    </div>
  );
}
