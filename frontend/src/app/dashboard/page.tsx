"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Calendar,
  Users,
  Church,
  Star,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { useAuthStore, getUserRole } from "@/stores/auth-store";
import { getScoreColor } from "@/lib/utils";
import { api } from "@/lib/api";
import { DashboardResponse, StatCard, ProximoEvento } from "@/types";
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchDashboardData = useCallback(async (showToast = false) => {
    try {
      setLoading(true);
      const data = await api.get<DashboardResponse>("/api/v1/dashboard/");
      console.log("Dashboard data received:", data);
      setDashboardData(data);
      setLastUpdate(new Date());
      if (showToast) {
        toast({
          title: "Dashboard atualizado",
          description: "Dados carregados da base de dados com sucesso",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível carregar os dados do dashboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData(true);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchDashboardData(false);
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loading size="lg" />
      </div>
    );
  }

  if (!dashboardData || !user) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Nenhum dado disponível</p>
      </div>
    );
  }

  const getIconComponent = (iconName: string) => {
    const icons: Record<string, React.ComponentType<{ className?: string }>> = {
      calendar: Calendar,
      users: Users,
      church: Church,
      star: Star,
      trending: TrendingUp,
      clock: Clock,
      check: CheckCircle,
      alert: AlertCircle,
      music: Users,
      building: Church,
    };
    return icons[iconName] || Users;
  };

  const renderStatsCards = (stats: StatCard[]) => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => {
        const IconComponent = getIconComponent(stat.icon);
        return (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <IconComponent className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  const renderProximosEventos = (eventos: ProximoEvento[]) => {
    if (eventos.length === 0) {
      return (
        <p className="text-muted-foreground text-center py-4">
          Nenhum evento agendado
        </p>
      );
    }

    return (
      <div className="space-y-4">
        {eventos.map((item, index) => (
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
              variant={item.confirmado ? "success" : "warning"}
            >
              {item.confirmado ? (
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
    );
  };

  // Admin Dashboard
  if (dashboardData.admin) {
    const { stats_cards, escalas_mes_atual, top_pregadores } = dashboardData.admin;
    
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Olá, {user?.nome_completo.split(" ")[0]}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Bem-vindo ao painel administrativo.{" "}
              <Badge variant="secondary">{getUserRole(user.tipo)}</Badge>
              {lastUpdate && (
                <span className="ml-2 text-xs">
                  • Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
                </span>
              )}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {renderStatsCards(stats_cards)}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Escalas do Mês Atual</CardTitle>
              <CardDescription>Status das escalas por distrito</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {escalas_mes_atual.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhuma escala no mês atual
                  </p>
                ) : (
                  escalas_mes_atual.map((escala, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div>
                        <p className="font-medium">{escala.distrito_nome}</p>
                        <p className="text-sm text-muted-foreground">
                          {escala.total_cultos} cultos | {escala.total_pregadores} pregadores
                        </p>
                      </div>
                      <Badge variant={escala.status === "PUBLICADA" ? "success" : "warning"}>
                        {escala.status === "PUBLICADA" ? "Publicada" : "Rascunho"}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Pregadores</CardTitle>
              <CardDescription>Ranking por score</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {top_pregadores.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhum pregador cadastrado
                  </p>
                ) : (
                  top_pregadores.slice(0, 5).map((pregador, index) => (
                    <div
                      key={pregador.id}
                      className="flex items-center justify-between p-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-muted-foreground">
                          {index + 1}.
                        </span>
                        <span>{pregador.nome}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={getScoreColor(pregador.score / 10)}>
                          {pregador.score.toFixed(1)}
                        </span>
                        <Star className="h-4 w-4 text-yellow-500" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Pastor Dashboard
  if (dashboardData.pastor) {
    const { stats_cards, proximos_cultos, pendencias } = dashboardData.pastor;
    
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Olá, {user?.nome_completo.split(" ")[0]}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Bem-vindo ao painel de gerenciamento.{" "}
              <Badge variant="secondary">{getUserRole(user.tipo)}</Badge>
              {lastUpdate && (
                <span className="ml-2 text-xs">
                  • Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
                </span>
              )}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {renderStatsCards(stats_cards)}

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Próximos Cultos
              </CardTitle>
              <CardDescription>
                Cultos agendados para os próximos dias
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderProximosEventos(proximos_cultos)}
            </CardContent>
          </Card>

          <div className="space-y-6">
            {pendencias.confirmacoes_pendentes > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-500">
                    <AlertCircle className="h-5 w-5" />
                    Pendências
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    • {pendencias.confirmacoes_pendentes} confirmações pendentes
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  Gerar Nova Escala
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Aprovar Cadastros
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Pregador/Cantor Dashboard
  if (dashboardData.pregador_cantor) {
    const { stats_cards, proximos_eventos, score_atual } = dashboardData.pregador_cantor;
    
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Olá, {user?.nome_completo.split(" ")[0]}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Bem-vindo ao seu painel.{" "}
              <Badge variant="secondary">{getUserRole(user.tipo)}</Badge>
              {lastUpdate && (
                <span className="ml-2 text-xs">
                  • Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
                </span>
              )}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {renderStatsCards(stats_cards)}

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Próximas {user.tipo === "PREGADOR" ? "Pregações" : "Apresentações"}
              </CardTitle>
              <CardDescription>
                Seus compromissos agendados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderProximosEventos(proximos_eventos)}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Seu Score
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div
                  className={`text-5xl font-bold ${getScoreColor(score_atual / 10)}`}
                >
                  {score_atual.toFixed(1)}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  de 100 pontos possíveis
                </p>
                <div className="w-full bg-muted rounded-full h-2 mt-4">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${score_atual}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Informar Indisponibilidade
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar Presenças
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Membro Dashboard
  if (dashboardData.membro) {
    const { stats_cards, proximos_cultos, avaliacoes_pendentes } = dashboardData.membro;
    
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Olá, {user?.nome_completo.split(" ")[0]}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Bem-vindo ao seu painel.{" "}
              <Badge variant="secondary">{getUserRole(user.tipo)}</Badge>
              {lastUpdate && (
                <span className="ml-2 text-xs">
                  • Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
                </span>
              )}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {renderStatsCards(stats_cards)}

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Próximos Cultos
              </CardTitle>
              <CardDescription>
                Cultos da sua igreja
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderProximosEventos(proximos_cultos)}
            </CardContent>
          </Card>

          <div className="space-y-6">
            {avaliacoes_pendentes > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-500">
                    <AlertCircle className="h-5 w-5" />
                    Avaliações Pendentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-4">
                    Você tem {avaliacoes_pendentes} {avaliacoes_pendentes === 1 ? 'avaliação pendente' : 'avaliações pendentes'}
                  </p>
                  <Button variant="outline" className="w-full">
                    Avaliar Agora
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Star className="h-4 w-4 mr-2" />
                  Avaliar Pregação
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  Ver Próximos Cultos
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
