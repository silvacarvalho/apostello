import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/lib/auth"
import { ToastProvider } from "@/components/ui/toast"
import { ThemeProvider } from "@/lib/theme"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Apostello - Sistema de Escalas IASD",
  description: "Sistema de Gestão de Escalas de Pregação",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
