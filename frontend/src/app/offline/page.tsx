import { WifiOff } from "lucide-react";

export const metadata = { title: "Sem conexão - Apostello" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-accent text-accent-foreground">
        <WifiOff className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">Você está sem conexão</h1>
      <p className="max-w-sm text-muted-foreground">
        O Apostello precisa de internet para mostrar as escalas atualizadas. Conecte-se e tente
        novamente.
      </p>
    </main>
  );
}
