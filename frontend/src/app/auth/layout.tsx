import { LogoMark } from "@/components/layout/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center overflow-x-hidden bg-gradient-to-b from-accent via-background to-background px-4 pt-safe pb-safe">
      <div className="flex w-full max-w-md flex-1 flex-col justify-center py-8">
        {/* Logo */}
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoMark className="mb-3 h-16 w-16 rounded-2xl [&_svg]:h-8 [&_svg]:w-8" />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Apostello</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sistema de Gerenciamento de Escalas
          </p>
        </div>

        {children}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          © 2024 Apostello. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
