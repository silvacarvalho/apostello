"use client";

import { useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  Calendar,
  Star,
  Users,
  AlertCircle,
  Info,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

// Mock data
const notificacoes = [
  {
    id: 1,
    tipo: "ESCALA",
    titulo: "Nova escala publicada",
    mensagem: "A escala de Janeiro 2024 foi publicada. Confira seus compromissos.",
    data: "2024-01-10T14:30:00",
    lida: false,
  },
  {
    id: 2,
    tipo: "ESCALA",
    titulo: "Você foi escalado",
    mensagem: "Você está escalado para pregar no dia 15/01 às 19h na Igreja Central.",
    data: "2024-01-10T10:00:00",
    lida: false,
  },
  {
    id: 3,
    tipo: "AVALIACAO",
    titulo: "Nova avaliação recebida",
    mensagem: "Você recebeu uma avaliação positiva por sua última pregação.",
    data: "2024-01-08T16:45:00",
    lida: true,
  },
  {
    id: 4,
    tipo: "SISTEMA",
    titulo: "Atualização do sistema",
    mensagem: "O sistema foi atualizado com novas funcionalidades. Confira as novidades!",
    data: "2024-01-05T09:00:00",
    lida: true,
  },
  {
    id: 5,
    tipo: "CADASTRO",
    titulo: "Novo cadastro pendente",
    mensagem: "Ana Paula Mendes solicitou cadastro como pregadora. Aguardando aprovação.",
    data: "2024-01-10T11:20:00",
    lida: false,
  },
];

const getIconByType = (tipo: string) => {
  switch (tipo) {
    case "ESCALA":
      return <Calendar className="h-5 w-5 text-blue-500" />;
    case "AVALIACAO":
      return <Star className="h-5 w-5 text-yellow-500" />;
    case "CADASTRO":
      return <Users className="h-5 w-5 text-green-500" />;
    case "SISTEMA":
      return <Info className="h-5 w-5 text-purple-500" />;
    default:
      return <Bell className="h-5 w-5 text-gray-500" />;
  }
};

const formatTimeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins} min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays}d atrás`;
  return date.toLocaleDateString("pt-BR");
};

export default function NotificacoesPage() {
  const [selectedTab, setSelectedTab] = useState("todas");

  const naoLidas = notificacoes.filter((n) => !n.lida);

  const filteredNotificacoes = notificacoes.filter((n) => {
    if (selectedTab === "nao-lidas") return !n.lida;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-8 w-8" />
            Notificações
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe todas as atualizações e avisos do sistema
          </p>
        </div>

        {naoLidas.length > 0 && (
          <Button variant="outline">
            <CheckCheck className="h-4 w-4 mr-2" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="todas">Todas</TabsTrigger>
          <TabsTrigger value="nao-lidas" className="relative">
            Não lidas
            {naoLidas.length > 0 && (
              <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                {naoLidas.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-6">
          <Card>
            <CardContent className="p-0">
              {filteredNotificacoes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    {selectedTab === "nao-lidas"
                      ? "Você não tem notificações não lidas"
                      : "Você não tem notificações"}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredNotificacoes.map((notificacao) => (
                    <div
                      key={notificacao.id}
                      className={`flex items-start gap-4 p-4 hover:bg-accent/50 transition-colors cursor-pointer ${
                        !notificacao.lida ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className="shrink-0 mt-1">
                        {getIconByType(notificacao.tipo)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p
                              className={`font-medium ${
                                !notificacao.lida ? "text-foreground" : "text-muted-foreground"
                              }`}
                            >
                              {notificacao.titulo}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {notificacao.mensagem}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatTimeAgo(notificacao.data)}
                            </span>
                            {!notificacao.lida && (
                              <div className="h-2 w-2 rounded-full bg-primary" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
