"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  Calendar,
  Star,
  Users,
  AlertCircle,
  Info,
  RefreshCw,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

interface Notificacao {
  id: number;
  tipo: string;
  titulo: string;
  mensagem: string;
  link: string | null;
  lida: boolean;
  created_at: string;
}

const getIconByType = (tipo: string) => {
  switch (tipo) {
    case "ESCALA_PUBLICADA":
    case "CONFIRMACAO":
      return <Calendar className="h-5 w-5 text-blue-500" />;
    case "AVALIACAO":
      return <Star className="h-5 w-5 text-yellow-500" />;
    case "AUTO_CADASTRO_APROVADO":
    case "AUTO_CADASTRO_RECUSADO":
      return <Users className="h-5 w-5 text-green-500" />;
    case "TROCA":
      return <RefreshCw className="h-5 w-5 text-orange-500" />;
    case "PENALIDADE":
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    case "LEMBRETE_7D":
    case "LEMBRETE_3D":
    case "LEMBRETE_24H":
      return <Bell className="h-5 w-5 text-purple-500" />;
    default:
      return <Info className="h-5 w-5 text-gray-500" />;
  }
};

const formatTimeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Agora";
  if (diffMins < 60) return `${diffMins} min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays}d atrás`;
  return date.toLocaleDateString("pt-BR");
};

export default function NotificacoesPage() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("todas");
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [marcandoLida, setMarcandoLida] = useState<number | null>(null);
  const [processandoTroca, setProcessandoTroca] = useState<{
    notificacaoId: number;
    acao: "aceitar" | "recusar";
  } | null>(null);
  const [solicitacoesPendentes, setSolicitacoesPendentes] = useState<Set<number>>(new Set());
  const [notificacoesExpandidas, setNotificacoesExpandidas] = useState<Set<number>>(new Set());
  const [statusSolicitacoes, setStatusSolicitacoes] = useState<Map<number, string>>(new Map());
  const [solicitacoesPendentesPastor, setSolicitacoesPendentesPastor] = useState<Set<number>>(new Set());
  const [showSubstituicaoEmergencialDialog, setShowSubstituicaoEmergencialDialog] = useState(false);
  const [solicitacaoSelecionadaPastor, setSolicitacaoSelecionadaPastor] = useState<any>(null);
  const [substitutosDisponiveis, setSubstitutosDisponiveis] = useState<any[]>([]);
  const [substitutoEmergencialId, setSubstitutoEmergencialId] = useState<number | null>(null);
  const [motivoEmergencia, setMotivoEmergencia] = useState("");
  const [loadingSubstitutos, setLoadingSubstitutos] = useState(false);
  const [processandoPastor, setProcessandoPastor] = useState<{notificacaoId: number; acao: "aprovar" | "recusar"} | null>(null);
  const [solicitacoesEmergenciaisPendentes, setSolicitacoesEmergenciaisPendentes] = useState<Set<number>>(new Set());
  const [processandoEmergencial, setProcessandoEmergencial] = useState<{notificacaoId: number; acao: "aceitar" | "recusar"} | null>(null);

  useEffect(() => {
    fetchNotificacoes();
    fetchSolicitacoesPendentes();
    fetchStatusSolicitacoes();
    fetchSolicitacoesPendentesPastor();
    fetchSolicitacoesEmergenciaisPendentes();
  }, []);

  const fetchSolicitacoesPendentes = async () => {
    try {
      const solicitacoes = await api.get<any[]>("/api/v1/escalas/solicitacoes-pendentes");
      const ids = solicitacoes.map(s => s.id);
      console.log('Solicitações pendentes carregadas:', ids);
      setSolicitacoesPendentes(new Set(ids));
    } catch (error) {
      console.error("Erro ao carregar solicitações pendentes:", error);
    }
  };

  const fetchStatusSolicitacoes = async () => {
    try {
      const solicitacoes = await api.get<Array<{id: number; status: string}>>("/api/v1/escalas/minhas-solicitacoes-troca");
      const statusMap = new Map(solicitacoes.map(s => [s.id, s.status]));
      console.log('Status das solicitações carregadas:', Array.from(statusMap.entries()));
      setStatusSolicitacoes(statusMap);
    } catch (error) {
      console.error("Erro ao carregar status das solicitações:", error);
    }
  };

  const fetchSolicitacoesPendentesPastor = async () => {
    try {
      const solicitacoes = await api.get<any[]>("/api/v1/escalas/solicitacoes-pendentes-pastor");
      const ids = solicitacoes.map(s => s.id);
      console.log('Solicitações pendentes pastor:', ids);
      setSolicitacoesPendentesPastor(new Set(ids));
    } catch (error) {
      // Não é pastor ou não tem solicitações pendentes
      console.log("Usuário não é pastor ou não tem solicitações pendentes");
    }
  };

  const fetchSolicitacoesEmergenciaisPendentes = async () => {
    try {
      // Endpoint ainda não existe, vamos criar depois
      // Por enquanto, vamos extrair das notificações
      console.log('Solicitações emergenciais serão extraídas das notificações');
    } catch (error) {
      console.log("Erro ao carregar solicitações emergenciais:", error);
    }
  };

  const fetchNotificacoes = async () => {
    try {
      setLoading(true);
      const data = await api.get<Notificacao[]>("/api/v1/notificacoes/");
      setNotificacoes(data);
    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
    } finally {
      setLoading(false);
    }
  };

  const marcarComoLida = async (id: number) => {
    try {
      setMarcandoLida(id);
      await api.post(`/api/v1/notificacoes/${id}/ler`);
      
      // Atualizar localmente
      setNotificacoes(notificacoes.map(n => 
        n.id === id ? { ...n, lida: true } : n
      ));
    } catch (error) {
      console.error("Erro ao marcar como lida:", error);
    } finally {
      setMarcandoLida(null);
    }
  };

  const alternarLida = async (id: number, lidaAtual: boolean) => {
    try {
      setMarcandoLida(id);
      
      if (lidaAtual) {
        // Se está lida, marcar como não lida
        // Assumindo que existe um endpoint para isso, senão precisaremos criar
        // Por enquanto, vamos apenas atualizar localmente
        setNotificacoes(notificacoes.map(n => 
          n.id === id ? { ...n, lida: false } : n
        ));
      } else {
        await api.post(`/api/v1/notificacoes/${id}/ler`);
        setNotificacoes(notificacoes.map(n => 
          n.id === id ? { ...n, lida: true } : n
        ));
      }
    } catch (error) {
      console.error("Erro ao alternar status de lida:", error);
    } finally {
      setMarcandoLida(null);
    }
  };

  const toggleExpandir = (id: number) => {
    setNotificacoesExpandidas(prev => {
      const novoSet = new Set(prev);
      if (novoSet.has(id)) {
        novoSet.delete(id);
      } else {
        novoSet.add(id);
      }
      return novoSet;
    });
  };

  const marcarTodasComoLidas = async () => {
    try {
      await api.post("/api/v1/notificacoes/ler-todas");
      
      // Atualizar todas para lidas
      setNotificacoes(notificacoes.map(n => ({ ...n, lida: true })));
    } catch (error) {
      console.error("Erro ao marcar todas como lidas:", error);
    }
  };

  const responderSolicitacaoTroca = async (
    notificacaoId: number,
    aceitar: boolean
  ) => {
    try {
      setProcessandoTroca({
        notificacaoId,
        acao: aceitar ? "aceitar" : "recusar",
      });

      // Buscar notificação para extrair ID da solicitação do link
      const notificacao = notificacoes.find((n) => n.id === notificacaoId);
      if (!notificacao) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Notificação não encontrada.",
        });
        return;
      }

      // Extrair solicitacao_id do link (formato: /notificacoes?solicitacao_id=123)
      let solicitacaoId: number | null = null;
      
      if (notificacao.link) {
        const urlParams = new URLSearchParams(notificacao.link.split('?')[1]);
        const idParam = urlParams.get('solicitacao_id');
        if (idParam) {
          solicitacaoId = parseInt(idParam);
        }
      }

      // Fallback: buscar solicitações pendentes se não houver ID no link
      if (!solicitacaoId) {
        const solicitacoes = await api.get<any[]>(
          "/api/v1/escalas/solicitacoes-pendentes"
        );
        const solicitacao = solicitacoes[0];
        
        if (!solicitacao) {
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Solicitação não encontrada.",
          });
          return;
        }
        
        solicitacaoId = solicitacao.id;
      }

      await api.post(
        `/api/v1/escalas/itens/solicitacao-troca/${solicitacaoId}/responder-substituto?aceitar=${aceitar ? 'true' : 'false'}`
      );

      // Marcar notificação como lida
      await api.post(`/api/v1/notificacoes/${notificacaoId}/ler`);

      // Atualizar estado local imediatamente
      setNotificacoes(
        notificacoes.map((n) =>
          n.id === notificacaoId ? { ...n, lida: true } : n
        )
      );

      // Remover solicitação das pendentes imediatamente
      setSolicitacoesPendentes(prev => {
        const novoSet = new Set(prev);
        novoSet.delete(solicitacaoId!);
        console.log('Solicitação removida das pendentes:', solicitacaoId);
        console.log('Pendentes após remoção:', Array.from(novoSet));
        return novoSet;
      });

      toast({
        title: aceitar ? "Solicitação Aceita" : "Solicitação Recusada",
        description: aceitar
          ? "Aguardando aprovação do pastor para efetivar a troca."
          : "A solicitação de troca foi recusada.",
      });

      // Recarregar notificações para garantir sincronização
      setTimeout(() => {
        fetchNotificacoes();
        fetchSolicitacoesPendentes();
        fetchStatusSolicitacoes();
      }, 1000);
    } catch (error: any) {
      console.error("Erro ao responder solicitação:", error);
      toast({
        variant: "destructive",
        title: "Erro ao processar resposta",
        description:
          error.response?.data?.detail ||
          "Não foi possível processar a resposta. Tente novamente.",
      });
    } finally {
      setProcessandoTroca(null);
    }
  };

  const responderSolicitacaoPastor = async (
    solicitacaoId: number,
    aprovar: boolean,
    notificacaoId: number
  ) => {
    try {
      setProcessandoPastor({
        notificacaoId,
        acao: aprovar ? "aprovar" : "recusar",
      });

      if (aprovar) {
        // Aprovar diretamente
        await api.post(
          `/api/v1/escalas/itens/solicitacao-troca/${solicitacaoId}/responder-pastor?aprovar=true`
        );

        toast({
          title: "Troca Aprovada",
          description: "A troca foi aprovada e efetivada com sucesso.",
        });

        // Marcar notificação como lida
        await api.post(`/api/v1/notificacoes/${notificacaoId}/ler`);

        // Atualizar estados
        setNotificacoes(
          notificacoes.map((n) =>
            n.id === notificacaoId ? { ...n, lida: true } : n
          )
        );

        setSolicitacoesPendentesPastor(prev => {
          const novoSet = new Set(prev);
          novoSet.delete(solicitacaoId);
          return novoSet;
        });

        // Recarregar
        setTimeout(() => {
          fetchNotificacoes();
          fetchSolicitacoesPendentesPastor();
          fetchStatusSolicitacoes();
        }, 1000);
      } else {
        // Recusar - abrir modal para escolher substituto emergencial
        const notificacao = notificacoes.find(n => n.id === notificacaoId);
        if (!notificacao || !notificacao.link) {
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Não foi possível obter detalhes da solicitação.",
          });
          return;
        }

        const urlParams = new URLSearchParams(notificacao.link.split('?')[1]);
        const itemEscalaId = urlParams.get('item_escala_id');
        const tipo = urlParams.get('tipo');

        if (!itemEscalaId || !tipo) {
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Dados incompletos na notificação.",
          });
          return;
        }

        // Buscar substitutos disponíveis
        setLoadingSubstitutos(true);
        const substitutos = await api.get(
          `/api/v1/escalas/itens/${itemEscalaId}/substitutos-disponiveis?tipo=${tipo}`
        );
        setSubstitutosDisponiveis(substitutos);
        setSolicitacaoSelecionadaPastor({
          id: solicitacaoId,
          notificacaoId,
          itemEscalaId,
          tipo
        });
        setLoadingSubstitutos(false);
        setShowSubstituicaoEmergencialDialog(true);
      }
    } catch (error: any) {
      console.error("Erro ao responder como pastor:", error);
      toast({
        variant: "destructive",
        title: "Erro ao processar resposta",
        description:
          error.response?.data?.detail ||
          "Não foi possível processar a resposta. Tente novamente.",
      });
    } finally {
      setProcessandoPastor(null);
    }
  };

  const confirmarSubstituicaoEmergencial = async () => {
    if (!solicitacaoSelecionadaPastor || !substitutoEmergencialId || !motivoEmergencia.trim()) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Selecione um substituto e informe o motivo da emergência.",
      });
      return;
    }

    try {
      await api.post(
        `/api/v1/escalas/itens/solicitacao-troca/${solicitacaoSelecionadaPastor.id}/responder-pastor?aprovar=false&substituto_emergencial_id=${substitutoEmergencialId}&motivo_emergencia=${encodeURIComponent(motivoEmergencia)}`
      );

      toast({
        title: "Substituição Emergencial Realizada",
        description: "O substituto foi designado e notificado com sucesso.",
      });

      // Marcar notificação como lida
      await api.post(`/api/v1/notificacoes/${solicitacaoSelecionadaPastor.notificacaoId}/ler`);

      // Limpar e fechar
      setShowSubstituicaoEmergencialDialog(false);
      setSolicitacaoSelecionadaPastor(null);
      setSubstitutoEmergencialId(null);
      setMotivoEmergencia("");

      // Recarregar
      setTimeout(() => {
        fetchNotificacoes();
        fetchSolicitacoesPendentesPastor();
        fetchStatusSolicitacoes();
      }, 1000);
    } catch (error: any) {
      console.error("Erro ao confirmar substituição emergencial:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description:
          error.response?.data?.detail ||
          "Não foi possível realizar a substituição emergencial.",
      });
    }
  };

  const responderSolicitacaoEmergencial = async (
    notificacaoId: number,
    aceitar: boolean
  ) => {
    try {
      setProcessandoEmergencial({
        notificacaoId,
        acao: aceitar ? "aceitar" : "recusar",
      });

      // Buscar notificação para extrair ID da solicitação emergencial do link
      const notificacao = notificacoes.find((n) => n.id === notificacaoId);
      if (!notificacao || !notificacao.link) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Notificação não encontrada.",
        });
        return;
      }

      // Extrair solicitacao_emergencial_id do link
      const urlParams = new URLSearchParams(notificacao.link.split('?')[1]);
      const solicitacaoEmergencialIdStr = urlParams.get('solicitacao_emergencial_id');

      if (!solicitacaoEmergencialIdStr) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "ID da solicitação emergencial não encontrado.",
        });
        return;
      }

      const solicitacaoEmergencialId = parseInt(solicitacaoEmergencialIdStr);
      
      if (isNaN(solicitacaoEmergencialId)) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "ID da solicitação emergencial inválido.",
        });
        return;
      }

      await api.post(
        `/api/v1/escalas/itens/solicitacao-emergencial/${solicitacaoEmergencialId}/responder?aceitar=${aceitar ? 'true' : 'false'}`
      );

      // Marcar notificação como lida
      await api.post(`/api/v1/notificacoes/${notificacaoId}/ler`);

      // Atualizar estado local
      setNotificacoes(
        notificacoes.map((n) =>
          n.id === notificacaoId ? { ...n, lida: true } : n
        )
      );

      // Remover da lista de pendentes
      setSolicitacoesEmergenciaisPendentes(prev => {
        const novoSet = new Set(prev);
        novoSet.delete(solicitacaoEmergencialId);
        return novoSet;
      });

      toast({
        title: aceitar ? "Substituição Aceita" : "Substituição Recusada",
        description: aceitar
          ? "Você aceitou a substituição emergencial e ganhou +5 pontos!"
          : "A substituição emergencial foi recusada.",
      });

      // Recarregar notificações
      setTimeout(() => {
        fetchNotificacoes();
        fetchStatusSolicitacoes();
      }, 1000);
    } catch (error: any) {
      console.error("Erro ao responder substituição emergencial:", error);
      toast({
        variant: "destructive",
        title: "Erro ao processar resposta",
        description:
          error.response?.data?.detail ||
          "Não foi possível processar a resposta. Tente novamente.",
      });
    } finally {
      setProcessandoEmergencial(null);
    }
  };

  const naoLidas = notificacoes.filter((n) => !n.lida);

  const filteredNotificacoes = notificacoes.filter((n) => {
    if (selectedTab === "nao-lidas") return !n.lida;
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Carregando notificações...</p>
          </div>
        </div>
      </div>
    );
  }

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

        <div className="flex items-center gap-2">
          {naoLidas.length > 0 && (
            <Button variant="outline" onClick={marcarTodasComoLidas}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Marcar todas como lidas
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={fetchNotificacoes}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
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
                  {filteredNotificacoes.map((notificacao) => {
                    const expandida = notificacoesExpandidas.has(notificacao.id);
                    
                    // Verificar status da solicitação para mostrar badge apropriado
                    const statusSolicitacao = (() => {
                      if (notificacao.tipo !== "TROCA" || 
                          notificacao.titulo !== "Solicitação de Troca Recebida") {
                        return null;
                      }
                      if (!notificacao.link) {
                        console.log('Notificação sem link:', notificacao.id);
                        return null;
                      }
                      const urlParams = new URLSearchParams(notificacao.link.split('?')[1]);
                      const solicitacaoId = urlParams.get('solicitacao_id');
                      if (!solicitacaoId) {
                        console.log('Link sem solicitacao_id:', notificacao.link);
                        return null;
                      }
                      const idNum = parseInt(solicitacaoId);
                      const status = statusSolicitacoes.get(idNum);
                      console.log(`Verificando notificação ${notificacao.id} - Solicitação ${idNum} - Status: ${status}`);
                      return status;
                    })();

                    return (
                      <div
                        key={notificacao.id}
                        className={`flex items-start gap-4 p-4 hover:bg-accent/50 transition-colors ${
                          !notificacao.lida ? "bg-primary/5" : ""
                        }`}
                      >
                        <div className="shrink-0 mt-1">
                          {getIconByType(notificacao.tipo)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div 
                            className="cursor-pointer"
                            onClick={() => toggleExpandir(notificacao.id)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p
                                  className={`font-medium ${
                                    !notificacao.lida ? "text-foreground" : "text-muted-foreground"
                                  }`}
                                >
                                  {notificacao.titulo}
                                  {/* Badge de status da solicitação */}
                                  {statusSolicitacao && statusSolicitacao !== "PENDENTE_SUBSTITUTO" && (
                                    <Badge 
                                      variant={
                                        statusSolicitacao === "RECUSADA" ? "destructive" :
                                        statusSolicitacao === "PENDENTE_PASTOR" ? "default" :
                                        statusSolicitacao === "APROVADA" ? "default" :
                                        "secondary"
                                      }
                                      className={
                                        statusSolicitacao === "PENDENTE_PASTOR" ? "ml-2 bg-yellow-500 hover:bg-yellow-600" :
                                        statusSolicitacao === "APROVADA" ? "ml-2 bg-green-600 hover:bg-green-700" :
                                        "ml-2"
                                      }
                                    >
                                      {statusSolicitacao === "RECUSADA" ? "Recusada" :
                                       statusSolicitacao === "PENDENTE_PASTOR" ? "Aceita - Aguardando Pastor" :
                                       statusSolicitacao === "APROVADA" ? "Aprovada" :
                                       statusSolicitacao}
                                    </Badge>
                                  )}
                                </p>
                                {expandida && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {notificacao.mensagem}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {formatTimeAgo(notificacao.created_at)}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    alternarLida(notificacao.id, notificacao.lida);
                                  }}
                                  disabled={marcandoLida === notificacao.id}
                                  title={notificacao.lida ? "Marcar como não lida" : "Marcar como lida"}
                                >
                                  {marcandoLida === notificacao.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : notificacao.lida ? (
                                    <CheckCheck className="h-4 w-4" />
                                  ) : (
                                    <Check className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                            
                            {/* Botões de aceitar/recusar para notificações de troca (apenas quando expandida) */}
                            {expandida &&
                              notificacao.tipo === "TROCA" &&
                              notificacao.titulo === "Solicitação de Troca Recebida" &&
                              (() => {
                                // Extrair ID da solicitação do link
                                if (!notificacao.link) return false;
                                const urlParams = new URLSearchParams(notificacao.link.split('?')[1]);
                                const solicitacaoId = urlParams.get('solicitacao_id');
                                if (!solicitacaoId) return false;
                                // Verificar se a solicitação ainda está pendente
                                return solicitacoesPendentes.has(parseInt(solicitacaoId));
                              })() && (
                                <div className="flex gap-2 mt-3">
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      responderSolicitacaoTroca(notificacao.id, true);
                                    }}
                                    disabled={
                                      processandoTroca?.notificacaoId === notificacao.id
                                    }
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    {processandoTroca?.notificacaoId === notificacao.id &&
                                    processandoTroca?.acao === "aceitar" ? (
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                      <ThumbsUp className="h-4 w-4 mr-2" />
                                    )}
                                    Aceitar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      responderSolicitacaoTroca(notificacao.id, false);
                                    }}
                                    disabled={
                                      processandoTroca?.notificacaoId === notificacao.id
                                    }
                                  >
                                    {processandoTroca?.notificacaoId === notificacao.id &&
                                    processandoTroca?.acao === "recusar" ? (
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                      <X className="h-4 w-4 mr-2" />
                                    )}
                                    Recusar
                                  </Button>
                                </div>
                              )}

                            {/* Botões de aprovar/recusar para pastor (apenas quando expandida) */}
                            {expandida &&
                              notificacao.tipo === "TROCA" &&
                              notificacao.titulo === "Troca Aceita - Aguardando Aprovação" &&
                              (() => {
                                // Extrair ID da solicitação do link
                                if (!notificacao.link) return false;
                                const urlParams = new URLSearchParams(notificacao.link.split('?')[1]);
                                const solicitacaoId = urlParams.get('solicitacao_id');
                                if (!solicitacaoId) return false;
                                // Verificar se a solicitação ainda está pendente do pastor
                                return solicitacoesPendentesPastor.has(parseInt(solicitacaoId));
                              })() && (
                                <div className="flex gap-2 mt-3">
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const urlParams = new URLSearchParams(notificacao.link!.split('?')[1]);
                                      const solicitacaoId = parseInt(urlParams.get('solicitacao_id')!);
                                      responderSolicitacaoPastor(solicitacaoId, true, notificacao.id);
                                    }}
                                    disabled={
                                      processandoPastor?.notificacaoId === notificacao.id
                                    }
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    {processandoPastor?.notificacaoId === notificacao.id &&
                                    processandoPastor?.acao === "aprovar" ? (
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                      <ThumbsUp className="h-4 w-4 mr-2" />
                                    )}
                                    Aprovar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const urlParams = new URLSearchParams(notificacao.link!.split('?')[1]);
                                      const solicitacaoId = parseInt(urlParams.get('solicitacao_id')!);
                                      responderSolicitacaoPastor(solicitacaoId, false, notificacao.id);
                                    }}
                                    disabled={
                                      processandoPastor?.notificacaoId === notificacao.id
                                    }
                                  >
                                    {processandoPastor?.notificacaoId === notificacao.id &&
                                    processandoPastor?.acao === "recusar" ? (
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                      <X className="h-4 w-4 mr-2" />
                                    )}
                                    Recusar
                                  </Button>
                                </div>
                              )}

                            {/* Botões de aceitar/recusar para substituição emergencial (apenas quando expandida) */}
                            {expandida &&
                              notificacao.tipo === "TROCA" &&
                              notificacao.titulo === "🚨 Solicitação de Substituição Emergencial" &&
                              (() => {
                                // Verificar se tem solicitacao_emergencial_id no link
                                if (!notificacao.link) return false;
                                const urlParams = new URLSearchParams(notificacao.link.split('?')[1]);
                                const solicitacaoEmergencialId = urlParams.get('solicitacao_emergencial_id');
                                return !!solicitacaoEmergencialId; // Retorna true se existir o parâmetro
                              })() && (
                                <div className="flex gap-2 mt-3">
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      responderSolicitacaoEmergencial(notificacao.id, true);
                                    }}
                                    disabled={
                                      processandoEmergencial?.notificacaoId === notificacao.id
                                    }
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    {processandoEmergencial?.notificacaoId === notificacao.id &&
                                    processandoEmergencial?.acao === "aceitar" ? (
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                      <ThumbsUp className="h-4 w-4 mr-2" />
                                    )}
                                    Aceitar (+5 pontos)
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      responderSolicitacaoEmergencial(notificacao.id, false);
                                    }}
                                    disabled={
                                      processandoEmergencial?.notificacaoId === notificacao.id
                                    }
                                  >
                                    {processandoEmergencial?.notificacaoId === notificacao.id &&
                                    processandoEmergencial?.acao === "recusar" ? (
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                      <X className="h-4 w-4 mr-2" />
                                    )}
                                    Recusar
                                  </Button>
                                </div>
                              )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Substituição Emergencial */}
      <Dialog open={showSubstituicaoEmergencialDialog} onOpenChange={setShowSubstituicaoEmergencialDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Substituição Emergencial
            </DialogTitle>
            <DialogDescription>
              Selecione um substituto e informe o motivo da substituição emergencial
            </DialogDescription>
          </DialogHeader>

          {loadingSubstitutos ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Seleção de substituto */}
              <div className="space-y-3">
                <Label htmlFor="substituto">Selecione o substituto *</Label>
                {substitutosDisponiveis.length > 0 ? (
                  <RadioGroup
                    value={substitutoEmergencialId?.toString()}
                    onValueChange={(value) => setSubstitutoEmergencialId(parseInt(value))}
                  >
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {substitutosDisponiveis.map((substituto) => (
                        <div
                          key={substituto.id}
                          className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent cursor-pointer"
                          onClick={() => setSubstitutoEmergencialId(substituto.id)}
                        >
                          <RadioGroupItem value={substituto.id.toString()} id={`sub-${substituto.id}`} />
                          <Label htmlFor={`sub-${substituto.id}`} className="flex-1 cursor-pointer">
                            <div>
                              <p className="font-medium">{substituto.nome_completo}</p>
                              <p className="text-xs text-muted-foreground">
                                {substituto.telefone} • {substituto.email}
                              </p>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Nenhum substituto disponível encontrado
                  </p>
                )}
              </div>

              {/* Motivo da emergência */}
              <div className="space-y-3">
                <Label htmlFor="motivo">Motivo da emergência *</Label>
                <Textarea
                  id="motivo"
                  placeholder="Explique o motivo da substituição emergencial..."
                  value={motivoEmergencia}
                  onChange={(e) => setMotivoEmergencia(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSubstituicaoEmergencialDialog(false);
                setSolicitacaoSelecionadaPastor(null);
                setSubstitutoEmergencialId(null);
                setMotivoEmergencia("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmarSubstituicaoEmergencial}
              disabled={!substitutoEmergencialId || !motivoEmergencia.trim() || loadingSubstitutos}
            >
              {loadingSubstitutos ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Carregando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Confirmar Substituição
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
