"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Users,
  Church,
  Star,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  MapPin,
  Sparkles,
  AlertTriangle,
  ExternalLink,
  X,
  RefreshCw,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useAuthStore,
  getUserRole,
  isAdmin,
  isAssociacao,
  isPastor,
  isPregador,
  isCantor,
  isMembro,
  canAccessDashboard,
  getUserDistritoId,
} from "@/stores/auth-store";
import { getScoreColor } from "@/lib/utils";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// Tipos para os dados do dashboard (Admin/Pastor)
interface DashboardStats {
  total_pregadores: number;
  total_cantores: number;
  total_membros: number;
  total_igrejas: number;
  total_distritos: number;
  total_escalas_publicadas: number;
  total_usuarios: number;
  media_score_pregadores: number | null;
  media_score_cantores: number | null;
}

interface DistritoStats {
  distrito_id: number;
  distrito_nome: string;
  total_pregadores: number;
  total_cantores: number;
  total_membros: number;
  total_igrejas: number;
  total_escalas_publicadas: number;
}

interface DashboardResponse {
  stats: DashboardStats;
  distritos: DistritoStats[];
}

// Tipos para dashboard de Pregador/Cantor
interface UserPersonalStats {
  score_atual: number | null;
  participacoes_mes: number;
  participacoes_total: number;
  faltas: number;
  desmarcacoes: number;
  proximas_escalas: number;
}

interface DashboardPregadorCantorResponse {
  personal_stats: UserPersonalStats;
  distrito_stats: DistritoStats;
}

type DashboardData = DashboardResponse | DashboardPregadorCantorResponse;

function isDashboardPregadorCantor(data: DashboardData): data is DashboardPregadorCantorResponse {
  return 'personal_stats' in data;
}

interface ConflictItem {
  item_id: number;
  escala_id: number;
  igreja_id: number;
  igreja_nome: string;
  horario: string;
}

interface Conflict {
  tipo: string;
  data: string;
  usuario_id: number;
  usuario_nome: string;
  total_escalas: number;
  itens: ConflictItem[];
}

interface ConflictosResponse {
  total_conflitos: number;
  conflitos: Conflict[];
}

interface ProximaEscala {
  item_id: number;
  escala_id: number;
  escala_nome: string;
  data_culto: string;
  horario: string;
  igreja_id: number;
  igreja_nome: string;
  tipo: string;
  confirmado: 'PENDENTE' | 'CONFIRMADO' | 'NAO_CONFIRMADO';
  tema: string | null;
  tem_troca_pendente: boolean;
  solicitacao_troca_id: number | null;
}

interface ProximasEscalasResponse {
  total: number;
  escalas: ProximaEscala[];
}

export default function DashboardPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuthStore();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Conflitos de escalas
  const [conflitos, setConflitos] = useState<ConflictosResponse | null>(null);
  const [loadingConflitos, setLoadingConflitos] = useState(false);
  const [showConflitosDialog, setShowConflitosDialog] = useState(false);
  
  // Próximas escalas do usuário
  const [proximasEscalas, setProximasEscalas] = useState<ProximasEscalasResponse | null>(null);
  const [loadingEscalas, setLoadingEscalas] = useState(false);
  
  // Modal de confirmação de presenças
  const [showConfirmarDialog, setShowConfirmarDialog] = useState(false);
  const [processandoConfirmacao, setProcessandoConfirmacao] = useState(false);
  
  // Avaliações da última pregação
  const [avaliacoes, setAvaliacoes] = useState<any>(null);
  const [loadingAvaliacoes, setLoadingAvaliacoes] = useState(false);
  
  // Modal de solicitação de troca
  const [showTrocaDialog, setShowTrocaDialog] = useState(false);
  const [escalaSelecionadaTroca, setEscalaSelecionadaTroca] = useState<ProximaEscala | null>(null);
  const [motivoTroca, setMotivoTroca] = useState("");
  const [substitutos, setSubstitutos] = useState<any[]>([]);
  const [substitutoSelecionado, setSubstitutoSelecionado] = useState<number | null>(null);
  const [loadingSubstitutos, setLoadingSubstitutos] = useState(false);
  const [processandoTroca, setProcessandoTroca] = useState(false);

  // Redirecionar membros para a página de escalas
  useEffect(() => {
    if (user && isMembro(user)) {
      router.push("/escalas");
    }
  }, [user, router]);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        const data = await api.get<DashboardData>("/api/v1/dashboard/stats");
        setDashboardData(data);
        setError(null);
        
        // Buscar conflitos se for pastor
        if (isPastor(user)) {
          const userDistritoId = getUserDistritoId(user);
          if (userDistritoId) {
            fetchConflitos(userDistritoId);
          }
        }
        
        // Buscar próximas escalas se for pregador, cantor, pastor ou líder
        if (isPregador(user) || isCantor(user) || isPastor(user)) {
          fetchProximasEscalas();
        }
        
        // Buscar avaliações se for pregador
        if (isPregador(user)) {
          fetchAvaliacoes();
        }
      } catch (err: any) {
        console.error("Erro ao carregar dashboard:", err);
        
        // Se for erro de permissão (membro tentando acessar), redireciona
        if (err?.response?.status === 403) {
          router.push("/escalas");
          return;
        }
        
        setError("Erro ao carregar dados do dashboard");
      } finally {
        setLoading(false);
      }
    }
    
    async function fetchConflitos(distritoId: number) {
      try {
        setLoadingConflitos(true);
        const data = await api.get<ConflictosResponse>(`/api/v1/escalas/conflitos/${distritoId}`);
        setConflitos(data);
      } catch (err: any) {
        console.error("Erro ao carregar conflitos:", err);
      } finally {
        setLoadingConflitos(false);
      }
    }
    
    async function fetchProximasEscalas() {
      try {
        setLoadingEscalas(true);
        const data = await api.get<ProximasEscalasResponse>("/api/v1/escalas/minhas-proximas?limit=5");
        console.log("Próximas escalas recebidas:", data);
        setProximasEscalas(data);
      } catch (err: any) {
        console.error("Erro ao carregar próximas escalas:", err);
      } finally {
        setLoadingEscalas(false);
      }
    }
    
    async function fetchAvaliacoes() {
      if (!user?.id) return;
      try {
        setLoadingAvaliacoes(true);
        const data = await api.get(`/api/v1/avaliacoes/usuario/${user.id}?limit=10`);
        setAvaliacoes(data);
      } catch (err: any) {
        console.error("Erro ao carregar avaliações:", err);
      } finally {
        setLoadingAvaliacoes(false);
      }
    }

    if (user && canAccessDashboard(user)) {
      fetchDashboardData();
    }
  }, [user, router]);

  // Função para confirmar presença em uma escala
  const handleConfirmarPresenca = async (itemId: number, confirmado: boolean) => {
    try {
      setProcessandoConfirmacao(true);
      await api.post(`/api/v1/escalas/itens/${itemId}/confirmar`, { confirmado });
      
      // Atualizar lista de próximas escalas
      if (proximasEscalas) {
        setProximasEscalas({
          ...proximasEscalas,
          escalas: proximasEscalas.escalas.map(e => 
            e.item_id === itemId 
              ? { ...e, confirmado: confirmado ? 'CONFIRMADO' : 'NAO_CONFIRMADO' }
              : e
          )
        });
      }
    } catch (err: any) {
      console.error("Erro ao confirmar presença:", err);
      alert("Erro ao confirmar presença. Tente novamente.");
    } finally {
      setProcessandoConfirmacao(false);
    }
  };

  // Função para abrir modal de solicitação de troca
  const handleAbrirTroca = async (escala: ProximaEscala) => {
    setEscalaSelecionadaTroca(escala);
    setMotivoTroca("");
    setSubstitutoSelecionado(null);
    setShowTrocaDialog(true);
    
    // Buscar substitutos disponíveis
    try {
      setLoadingSubstitutos(true);
      const tipoUsuario = escala.tipo === 'pregador' ? 'PREGADOR' : 'CANTOR';
      const data = await api.get(`/api/v1/usuarios/disponiveis-para-troca?data_culto=${escala.data_culto}&tipo=${tipoUsuario}`);
      setSubstitutos(data);
    } catch (err: any) {
      console.error("Erro ao buscar substitutos:", err);
      alert("Erro ao buscar substitutos disponíveis");
    } finally {
      setLoadingSubstitutos(false);
    }
  };

  // Função para criar solicitação de troca
  const handleSolicitarTroca = async () => {
    if (!escalaSelecionadaTroca || !substitutoSelecionado || !motivoTroca.trim()) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Preencha todos os campos para solicitar a troca.",
      });
      return;
    }

    try {
      setProcessandoTroca(true);
      const tipo = escalaSelecionadaTroca.tipo === 'pregador' ? 'PREGADOR' : 'CANTOR';
      await api.post(
        `/api/v1/escalas/itens/${escalaSelecionadaTroca.item_id}/solicitar-troca?substituto_id=${substitutoSelecionado}&motivo=${encodeURIComponent(motivoTroca)}&tipo=${tipo}`
      );
      
      toast({
        title: "Solicitação Enviada",
        description: "Solicitação de troca enviada com sucesso! Aguarde a resposta do substituto.",
      });
      setShowTrocaDialog(false);
      setEscalaSelecionadaTroca(null);
      setMotivoTroca("");
      setSubstitutoSelecionado(null);
      
      // Atualizar lista de próximas escalas para refletir a troca pendente
      if (proximasEscalas) {
        setProximasEscalas({
          ...proximasEscalas,
          escalas: proximasEscalas.escalas.map(e => 
            e.item_id === escalaSelecionadaTroca.item_id 
              ? { ...e, tem_troca_pendente: true }
              : e
          )
        });
      }
    } catch (err: any) {
      console.error("Erro ao solicitar troca:", err);
      const errorMessage = err?.response?.data?.detail || "Erro ao solicitar troca. Tente novamente.";
      
      // Mensagem personalizada para erro de duplicação
      if (errorMessage.includes("Já existe uma solicitação de troca pendente")) {
        toast({
          variant: "destructive",
          title: "Solicitação Duplicada",
          description: "Já existe uma solicitação de troca pendente para este item. Verifique suas notificações ou aguarde a aprovação da solicitação anterior.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao solicitar troca",
          description: errorMessage,
        });
      }
    } finally {
      setProcessandoTroca(false);
    }
  };

  // Stats cards baseados no tipo de usuário
  const getStatsCards = () => {
    if (!dashboardData) return [];
    
    // Admin/Pastor: Dashboard completo
    if (!isDashboardPregadorCantor(dashboardData)) {
      const stats = dashboardData.stats;
      
      return [
        {
          title: "Total de Pregadores",
          value: stats.total_pregadores.toString(),
          change: `Score médio: ${stats.media_score_pregadores?.toFixed(1) || "N/A"}`,
          icon: <Users className="h-5 w-5 text-blue-500" />,
        },
        {
          title: "Igrejas Ativas",
          value: stats.total_igrejas.toString(),
          change: `${stats.total_distritos} distritos`,
          icon: <Church className="h-5 w-5 text-green-500" />,
        },
        {
          title: "Escalas Publicadas",
          value: stats.total_escalas_publicadas.toString(),
          change: "Total de escalas",
          icon: <Calendar className="h-5 w-5 text-purple-500" />,
        },
        {
          title: "Total de Cantores",
          value: stats.total_cantores.toString(),
          change: `Score médio: ${stats.media_score_cantores?.toFixed(1) || "N/A"}`,
          icon: <Star className="h-5 w-5 text-yellow-500" />,
        },
      ];
    }
    
    // Pregador/Cantor: Dashboard personalizado
    const { personal_stats, distrito_stats } = dashboardData;
    
    return [
      {
        title: "Próximas Escalas",
        value: personal_stats.proximas_escalas.toString(),
        change: "Agendadas",
        icon: <Calendar className="h-5 w-5 text-blue-500" />,
      },
      {
        title: "Score Atual",
        value: personal_stats.score_atual?.toFixed(1) || "70.0",
        change: "Baseado em avaliações",
        icon: <TrendingUp className="h-5 w-5 text-green-500" />,
      },
      {
        title: "Participações no Mês",
        value: personal_stats.participacoes_mes.toString(),
        change: `${personal_stats.participacoes_total} no total`,
        icon: <CheckCircle className="h-5 w-5 text-purple-500" />,
      },
      {
        title: user && isPregador(user) ? "Pregadores no Distrito" : "Cantores no Distrito",
        value: user && isPregador(user) 
          ? distrito_stats.total_pregadores.toString()
          : distrito_stats.total_cantores.toString(),
        change: `${distrito_stats.distrito_nome}`,
        icon: <Users className="h-5 w-5 text-yellow-500" />,
      },
    ];
  };

  const statsCards = getStatsCards();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-destructive">{error}</p>
          <Button onClick={() => window.location.reload()}>Tentar novamente</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Olá, {user?.nome_completo?.split(" ")[0] || "Usuário"}! 👋
        </h1>
        <div className="text-muted-foreground mt-1 flex items-center gap-2">
          <span>Bem-vindo ao painel de gerenciamento de escalas.</span>
          <Badge variant="secondary">{user ? getUserRole(user.tipo) : ""}</Badge>
        </div>
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

      {/* Alerta de Conflitos de Escalas */}
      {user && isPastor(user) && conflitos && conflitos.total_conflitos > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
              <AlertTriangle className="h-5 w-5" />
              Conflitos de Escala Detectados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Foram detectados <span className="font-semibold">{conflitos.total_conflitos} conflito(s)</span> nas escalas do seu distrito.
                Existem pregadores ou cantores escalados em múltiplas igrejas no mesmo dia.
              </p>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowConflitosDialog(true)}
                  className="bg-white dark:bg-gray-950"
                >
                  Ver Detalhes dos Conflitos
                </Button>
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => window.location.href = '/dashboard/escalas'}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Ir para Escalas
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estatísticas por Distrito */}
      {(isAdmin(user) || isAssociacao(user)) && dashboardData && !isDashboardPregadorCantor(dashboardData) && dashboardData.distritos && dashboardData.distritos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Estatísticas por Distrito
            </CardTitle>
            <CardDescription>
              Visão geral de cada distrito cadastrado no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {dashboardData.distritos.map((distrito) => (
                <Card key={distrito.distrito_id} className="bg-muted/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{distrito.distrito_nome}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Pregadores:</span>
                      <span className="font-medium">{distrito.total_pregadores}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Cantores:</span>
                      <span className="font-medium">{distrito.total_cantores}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Membros:</span>
                      <span className="font-medium">{distrito.total_membros}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Igrejas:</span>
                      <span className="font-medium">{distrito.total_igrejas}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Escalas Publicadas:</span>
                      <Badge variant="secondary">{distrito.total_escalas_publicadas}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Próximas Escalas - para Pregadores, Cantores, Pastores e Líderes */}
        {!isAdmin(user) && !isAssociacao(user) && !isMembro(user) && (
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
              {loadingEscalas ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : proximasEscalas && proximasEscalas.escalas.length > 0 ? (
                <div className="space-y-4">
                  {proximasEscalas.escalas.map((escala) => {
                    const dataObj = new Date(escala.data_culto + 'T00:00:00');
                    const dia = dataObj.getDate().toString().padStart(2, '0');
                    const mes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][dataObj.getMonth()];
                    
                    return (
                      <div
                        key={escala.item_id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-primary/10">
                            <span className="text-lg font-bold text-primary">
                              {dia}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {mes}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{escala.igreja_nome}</p>
                            <p className="text-sm text-muted-foreground">
                              {escala.tipo === 'pregador' ? 'Pregação' : 'Louvor'} • {escala.horario}
                            </p>
                            {escala.tema && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Tema: {escala.tema}
                              </p>
                            )}
                          </div>
                        </div>
                        {escala.confirmado === 'CONFIRMADO' ? (
                          <Badge variant="default">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Confirmado
                          </Badge>
                        ) : escala.confirmado === 'NAO_CONFIRMADO' ? (
                          <Badge variant="destructive">
                            <X className="h-3 w-3 mr-1" />
                            Recusado
                          </Badge>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleConfirmarPresenca(escala.item_id, true)}
                                disabled={processandoConfirmacao}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Confirmar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleConfirmarPresenca(escala.item_id, false)}
                                disabled={processandoConfirmacao}
                              >
                                <X className="h-3 w-3 mr-1" />
                                Recusar
                              </Button>
                            </div>
                            {escala.tem_troca_pendente ? (
                              <Badge variant="outline" className="justify-center">
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Troca Pendente
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleAbrirTroca(escala)}
                                className="w-full"
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Solicitar Troca
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>Nenhuma escala futura encontrada</p>
                </div>
              )}

              <Separator className="my-4" />

              <Button variant="outline" className="w-full" asChild>
                <Link href="/escalas">
                  Ver todas as escalas
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions / Score */}
        <div className="space-y-6">
          {/* Score Card (para pregadores/cantores) */}
          {(isPregador(user) || isCantor(user)) && dashboardData && isDashboardPregadorCantor(dashboardData) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Seu Score
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div
                  className={`text-5xl font-bold ${getScoreColor(dashboardData.personal_stats.score_atual || 70)}`}
                >
                  {dashboardData.personal_stats.score_atual?.toFixed(1) || "70.0"}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  de 100.0 pontos possíveis
                </p>
                <div className="w-full bg-muted rounded-full h-2 mt-4">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${((dashboardData.personal_stats.score_atual || 70) / 100) * 100}%` }}
                  />
                </div>
                <Separator className="my-4" />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Faltas</p>
                    <p className="text-lg font-bold">{dashboardData.personal_stats.faltas}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Desmarcações</p>
                    <p className="text-lg font-bold">{dashboardData.personal_stats.desmarcacoes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Avaliações da Última Pregação (para pregadores) */}
          {isPregador(user) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Última Pregação
                </CardTitle>
                <CardDescription>
                  Avaliações recebidas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAvaliacoes ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : avaliacoes && avaliacoes.total > 0 ? (
                  <>
                    <div className="text-center mb-4">
                      <div className="text-4xl font-bold text-primary">
                        {avaliacoes.media_geral?.toFixed(1) || "N/A"}
                      </div>
                      <p className="text-sm text-muted-foreground">Média Geral</p>
                      <div className="flex justify-center gap-1 mt-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= (avaliacoes.media_geral || 0)
                                ? "fill-primary text-primary"
                                : "text-muted-foreground"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <Separator className="my-4" />
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total de avaliações</span>
                        <span className="font-medium">{avaliacoes.total}</span>
                      </div>
                      {avaliacoes.items && avaliacoes.items.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs text-muted-foreground mb-2">Últimas avaliações:</p>
                          <div className="space-y-2">
                            {avaliacoes.items.slice(0, 3).map((avaliacao: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-2 text-xs p-2 rounded bg-muted/50">
                                <div className="flex gap-0.5">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`h-3 w-3 ${
                                        star <= avaliacao.nota
                                          ? "fill-primary text-primary"
                                          : "text-muted-foreground"
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-muted-foreground flex-1 truncate">
                                  {avaliacao.comentario || "Sem comentário"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Star className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Nenhuma avaliação ainda</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Ações Rápidas (para Admin e Pastor) */}
          {(isAdmin(user) || isPastor(user)) && (
            <Card>
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/escalas">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Gerar Nova Escala
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/usuarios">
                    <Users className="h-4 w-4 mr-2" />
                    Gerenciar Usuários
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Ações Rápidas (para Membro) */}
          {isMembro(user) && (
            <Card>
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/escalas">
                      <Star className="h-4 w-4 mr-2" />
                      Avaliar Pregação
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/escalas">
                      <Calendar className="h-4 w-4 mr-2" />
                      Ver Próximos Cultos
                    </Link>
                  </Button>
              </CardContent>
            </Card>
          )}

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

      {/* Card de Distrito para Pregadores/Cantores - após as próximas escalas */}
      {(isPregador(user) || isCantor(user)) && dashboardData && isDashboardPregadorCantor(dashboardData) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Estatísticas do Distrito {dashboardData.distrito_stats.distrito_nome}
            </CardTitle>
            <CardDescription>
              Visão geral do seu distrito
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Pregadores</p>
                <p className="text-2xl font-bold">{dashboardData.distrito_stats.total_pregadores}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Cantores</p>
                <p className="text-2xl font-bold">{dashboardData.distrito_stats.total_cantores}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Igrejas</p>
                <p className="text-2xl font-bold">{dashboardData.distrito_stats.total_igrejas}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Escalas Publicadas</p>
                <p className="text-2xl font-bold">{dashboardData.distrito_stats.total_escalas_publicadas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog de Conflitos */}
      <Dialog open={showConflitosDialog} onOpenChange={setShowConflitosDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
              <AlertTriangle className="h-5 w-5" />
              Detalhes dos Conflitos de Escala
            </DialogTitle>
            <DialogDescription>
              Os usuários abaixo estão escalados em múltiplas igrejas no mesmo dia. 
              Clique em "Ir para Escalas" para corrigir manualmente.
            </DialogDescription>
          </DialogHeader>
          
          {loadingConflitos ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : conflitos && conflitos.conflitos.length > 0 ? (
            <div className="space-y-4">
              {conflitos.conflitos.map((conflito, idx) => (
                <Card key={idx} className="border-amber-200 dark:border-amber-900">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>
                        <Badge variant={conflito.tipo === 'pregador' ? 'default' : 'secondary'} className="mr-2">
                          {conflito.tipo === 'pregador' ? 'Pregador' : 'Cantor'}
                        </Badge>
                        {conflito.usuario_nome}
                      </span>
                      <span className="text-sm font-normal text-muted-foreground">
                        {new Date(conflito.data).toLocaleDateString('pt-BR')}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                      Este usuário está escalado em <span className="font-semibold">{conflito.total_escalas} igrejas</span> no mesmo dia:
                    </p>
                    <div className="space-y-2">
                      {conflito.itens.map((item, itemIdx) => (
                        <div 
                          key={itemIdx} 
                          className="flex items-center justify-between p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-md border border-amber-100 dark:border-amber-900"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.igreja_nome}</p>
                            <p className="text-xs text-muted-foreground">Horário: {item.horario}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setShowConflitosDialog(false);
                              window.location.href = `/dashboard/escalas?escala_id=${item.escala_id}`;
                            }}
                            className="ml-4"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Editar
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum conflito encontrado.
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConflitosDialog(false)}>
              Fechar
            </Button>
            <Button 
              onClick={() => {
                setShowConflitosDialog(false);
                window.location.href = '/dashboard/escalas';
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Ir para Escalas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Presenças */}
      <Dialog open={showConfirmarDialog} onOpenChange={setShowConfirmarDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Confirmar Presenças
            </DialogTitle>
            <DialogDescription>
              Confirme ou recuse sua presença nas escalas abaixo
            </DialogDescription>
          </DialogHeader>

          {proximasEscalas && proximasEscalas.escalas.length > 0 ? (
            <div className="space-y-4">
              {proximasEscalas.escalas.map((escala) => {
                const dataObj = new Date(escala.data_culto + 'T00:00:00');
                const dataFormatada = dataObj.toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                });

                return (
                  <Card key={escala.item_id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h4 className="font-semibold">{escala.igreja_nome}</h4>
                          <p className="text-sm text-muted-foreground">
                            {dataFormatada} • {escala.horario}
                          </p>
                          <p className="text-sm mt-1">
                            <Badge variant={escala.tipo === 'pregador' ? 'default' : 'secondary'}>
                              {escala.tipo === 'pregador' ? 'Pregação' : 'Louvor'}
                            </Badge>
                          </p>
                          {escala.tema && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Tema: {escala.tema}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 ml-4">
                          {escala.confirmado === 'CONFIRMADO' ? (
                            <Badge variant="default" className="justify-center">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Confirmado
                            </Badge>
                          ) : escala.confirmado === 'NAO_CONFIRMADO' ? (
                            <Badge variant="destructive" className="justify-center">
                              <X className="h-3 w-3 mr-1" />
                              Recusado
                            </Badge>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleConfirmarPresenca(escala.item_id, true)}
                                disabled={processandoConfirmacao}
                                className="w-full"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Confirmar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleConfirmarPresenca(escala.item_id, false)}
                                disabled={processandoConfirmacao}
                                className="w-full"
                              >
                                <X className="h-3 w-3 mr-1" />
                                Recusar
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>Nenhuma escala pendente de confirmação</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmarDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Solicitação de Troca */}
      <Dialog open={showTrocaDialog} onOpenChange={setShowTrocaDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Solicitar Troca de Escala
            </DialogTitle>
            <DialogDescription>
              Selecione um substituto e informe o motivo da troca
            </DialogDescription>
          </DialogHeader>

          {escalaSelecionadaTroca && (
            <div className="space-y-4">
              {/* Informações da escala */}
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <h4 className="font-semibold">{escalaSelecionadaTroca.igreja_nome}</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(escalaSelecionadaTroca.data_culto + 'T00:00:00').toLocaleDateString('pt-BR')} • {escalaSelecionadaTroca.horario}
                    </p>
                    <Badge variant={escalaSelecionadaTroca.tipo === 'pregador' ? 'default' : 'secondary'}>
                      {escalaSelecionadaTroca.tipo === 'pregador' ? 'Pregação' : 'Louvor'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Seleção de substituto */}
              <div className="space-y-3">
                <Label htmlFor="substituto">Selecione o substituto *</Label>
                {loadingSubstitutos ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : substitutos.length > 0 ? (
                  <RadioGroup
                    value={substitutoSelecionado?.toString()}
                    onValueChange={(value) => setSubstitutoSelecionado(parseInt(value))}
                  >
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {substitutos.map((sub: any) => (
                        <div
                          key={sub.id}
                          className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent cursor-pointer"
                          onClick={() => setSubstitutoSelecionado(sub.id)}
                        >
                          <RadioGroupItem value={sub.id.toString()} id={`sub-${sub.id}`} />
                          <Label
                            htmlFor={`sub-${sub.id}`}
                            className="flex-1 cursor-pointer"
                          >
                            <div>
                              <p className="font-medium">{sub.nome_completo}</p>
                              {sub.score_atual && (
                                <p className="text-xs text-muted-foreground">Score: {sub.score_atual}</p>
                              )}
                            </div>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Nenhum substituto disponível para esta data
                  </p>
                )}
              </div>

              {/* Motivo da troca */}
              <div className="space-y-3">
                <Label htmlFor="motivo">Motivo da troca *</Label>
                <Textarea
                  id="motivo"
                  placeholder="Explique o motivo da solicitação de troca..."
                  value={motivoTroca}
                  onChange={(e) => setMotivoTroca(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTrocaDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSolicitarTroca}
              disabled={!substitutoSelecionado || !motivoTroca.trim() || processandoTroca}
            >
              {processandoTroca ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Solicitar Troca
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

