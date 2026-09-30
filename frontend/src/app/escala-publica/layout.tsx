import type { Metadata } from "next";

import { LogoMark } from "@/components/layout/logo";

// Página pública aberta pelo QR Code: não deve aparecer em buscadores
export const metadata: Metadata = {
  title: "Escala - Apostello",
  robots: { index: false, follow: false },
};

export default function EscalaPublicaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-accent/60 to-background">
      <header className="pt-safe border-b border-border/60 bg-card/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4">
          <LogoMark className="h-8 w-8 rounded-lg" />
          <span className="text-base font-bold tracking-tight">Apostello</span>
          <span className="ml-auto text-xs text-muted-foreground">Escala de Pregação e Louvor</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-safe pt-5 pb-10">{children}</main>
    </div>
  );
}
