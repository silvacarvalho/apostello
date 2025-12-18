"use client";

import {
  Calendar,
  Users,
  Church,
  Star,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuthStore, getUserRole, isAdmin, isPastor, isPregador, isCantor, isMembro } from "@/stores/auth-store";
import { getScoreColor } from "@/lib/utils";

export default function DashboardPage() {
  const { user } = useAuthStore();

  // Stats cards baseados no tipo de usuário
  const getStatsCards = () => {
    if (isAdmin(user) || isPastor(user)) {
      return [
        {
          title: "Total de Pregadores",
          value: "45",
          change: "+5 este mês",
          icon: <Users className="h-5 w-5 text-blue-500" />,
        },
        {
          title: "Igrejas Ativas",
          value: "12",
          change: "2 distritos",
          icon: <Church className="h-5 w-5 text-green-500" />,
        },
        {
          title: "Escalas Publicadas",
          value: "24",
          change: "Janeiro 2024",
          icon: <Calendar className="h-5 w-5 text-purple-500" />,
        },
        {
          title: "Avaliação Média",
          value: "4.8",
          change: "+0.2 vs mês anterior",
          icon: <Star className="h-5 w-5 text-yellow-500" />,
        },
      ];
    }

    if (isPregador(user) || isCantor(user)) {
      return [
        {
          title: "Próximas Pregações",
          value: "3",
          change: "Este mês",
          icon: <Calendar className="h-5 w-5 text-blue-500" />,
        },
        {
          title: "Score Atual",
          value: user?.score_atual?.toFixed(1) || "5.0",
          change: "Baseado em avaliações",
          icon: <TrendingUp className="h-5 w-5 text-green-500" />,
        },
        {
          title: "Pregações Realizadas",
          value: "28",
          change: "Últimos 12 meses",
          icon: <CheckCircle className="h-5 w-5 text-purple-500" />,
        },
        {
          title: "Avaliação Média",
          value: "4.6",
          change: "★★★★★",
          icon: <Star className="h-5 w-5 text-yellow-500" />,
        },
      ];
    }

    // Membro
    return [
      {
        title: "Cultos Avaliados",
        value: "12",
        change: "Este mês",
        icon: <Star className="h-5 w-5 text-yellow-500" />,
      },
      {
        title: "Próximos Cultos",
        value: "4",
        change: "Esta semana",
        icon: <Calendar className="h-5 w-5 text-blue-500" />,
      },
      {
        title: "Avaliações Pendentes",
        value: "2",
        change: "Aguardando feedback",
        icon: <Clock className="h-5 w-5 text-orange-500" />,
      },
      {
        title: "Igreja",
        value: "Central",
        change: "Distrito Sul",
        icon: <Church className="h-5 w-5 text-green-500" />,
      },
    ];
  };

  const statsCards = getStatsCards();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Olá, {user?.nome_completo.split(" ")[0]}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Bem-vindo ao painel de gerenciamento de escalas.{" "}
          <Badge variant="secondary">{user ? getUserRole(user.tipo) : ""}</Badge>
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Próximas Escalas */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Próximas Escalas
            </CardTitle>
            <CardDescription>
              Seus compromissos agendados para os próximos dias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  date: "15/01/2024",
                  time: "19:00",
                  church: "Igreja Central",
                  type: "Pregação",
                  status: "confirmed",
                },
                {
                  date: "22/01/2024",
                  time: "10:00",
                  church: "Igreja do Bairro Alto",
                  type: "Louvor Especial",
                  status: "pending",
                },
                {
                  date: "29/01/2024",
                  time: "19:30",
                  church: "Igreja Nova Esperança",
                  type: "Pregação",
                  status: "confirmed",
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-primary/10">
                      <span className="text-lg font-bold text-primary">
                        {item.date.split("/")[0]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][parseInt(item.date.split("/")[1]) - 1]}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{item.church}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.type} • {item.time}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={item.status === "confirmed" ? "success" : "warning"}
                  >
                    {item.status === "confirmed" ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Confirmado
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3 mr-1" />
                        Pendente
                      </>
                    )}
                  </Badge>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <Button variant="outline" className="w-full">
              Ver todas as escalas
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions / Score */}
        <div className="space-y-6">
          {/* Score Card (para pregadores/cantores) */}
          {(isPregador(user) || isCantor(user)) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Seu Score
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div
                  className={`text-5xl font-bold ${getScoreColor(user?.score_atual || 5)}`}
                >
                  {user?.score_atual?.toFixed(1) || "5.0"}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  de 10.0 pontos possíveis
                </p>
                <div className="w-full bg-muted rounded-full h-2 mt-4">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${((user?.score_atual || 5) / 10) * 100}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ações Rápidas */}
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(isAdmin(user) || isPastor(user)) && (
                <>
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    Gerar Nova Escala
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    Aprovar Cadastros
                  </Button>
                </>
              )}
              {(isPregador(user) || isCantor(user)) && (
                <>
                  <Button variant="outline" className="w-full justify-start">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Informar Indisponibilidade
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirmar Presenças
                  </Button>
                </>
              )}
              {isMembro(user) && (
                <>
                  <Button variant="outline" className="w-full justify-start">
                    <Star className="h-4 w-4 mr-2" />
                    Avaliar Pregação
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    Ver Próximos Cultos
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Avisos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-500">
                <AlertCircle className="h-5 w-5" />
                Avisos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                <p className="mb-2">
                  • Escala de Fevereiro será publicada em 25/01
                </p>
                <p>• Reunião de pregadores: 28/01 às 15h</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
