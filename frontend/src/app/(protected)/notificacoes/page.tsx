"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
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
  Music,
  BookOpen,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
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

const TIPO_LABELS: Record<string, string> = {
  ESCALA_PUBLICADA: "Escala",
  CONFIRMACAO: "Confirmação",
  AVALIACAO: "Avaliação",
  AUTO_CADASTRO_APROVADO: "Cadastro",
  AUTO_CADASTRO_RECUSADO: "Cadastro",
  TROCA: "Troca",
  PENALIDADE: "Penalidade",
  LEMBRETE_7D: "Lembrete",
  LEMBRETE_3D: "Lembrete",
  LEMBRETE_24H: "Lembrete",
};

const getTipoLabel = (tipo: string) => TIPO_LABELS[tipo] || "Aviso";

const getTipoChipClass = (tipo: string) => {
  switch (tipo) {
    case "AVALIACAO":
    case "TROCA":
      return "bg-warning/15 text-warning";
    case "AUTO_CADASTRO_APROVADO":
    case "AUTO_CADASTRO_RECUSADO":
      return "bg-success/15 text-success";
    case "PENALIDADE":
      return "bg-destructive/10 text-destructive";
    case "ESCALA_PUBLICADA":
    case "CONFIRMACAO":
    case "LEMBRETE_7D":
    case "LEMBRETE_3D":
    case "LEMBRETE_24H":
      return "bg-accent text-accent-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const getIconByType = (tipo: string, mensagem?: string) => {
  // Para notificações de troca, identificar se é pregador ou cantor
  if (tipo === "TROCA" && mensagem) {
    const mensagemLower = mensagem.toLowerCase();
    if (mensagemLower.includes("pregador") || mensagemLower.includes("pregação")) {
      return (
        <div className="relative">
          <RefreshCw className="h-5 w-5" />
          <BookOpen className="h-3 w-3 absolute -bottom-1 -right-1 rounded-full bg-card" />
        </div>
      );
    }
    if (mensagemLower.includes("cantor") || mensagemLower.includes("louvor")) {
      return (
        <div className="relative">
          <RefreshCw className="h-5 w-5" />
          <Music className="h-3 w-3 absolute -bottom-1 -right-1 rounded-full bg-card" />
        </div>
      );
    }
    // Fallback para troca genérica
    return <RefreshCw className="h-5 w-5" />;
  }

  switch (tipo) {
    case "ESCALA_PUBLICADA":
    case "CONFIRMACAO":
      return <Calendar className="h-5 w-5" />;
    case "AVALIACAO":
      return <Star className="h-5 w-5" />;
    case "AUTO_CADASTRO_APROVADO":
    case "AUTO_CADASTRO_RECUSADO":
      return <Users className="h-5 w-5" />;
    case "TROCA":
      return <RefreshCw className="h-5 w-5" />;
    case "PENALIDADE":
      return <AlertCircle className="h-5 w-5" />;
    case "LEMBRETE_7D":
    case "LEMBRETE_3D":
    case "LEMBRETE_24H":
      return <Bell className="h-5 w-5" />;
    default:
      return <Info className="h-5 w-5" />;
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
  const searchParams = useSearchParams();
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
  const [detalheId, setDetalheId] = useState<number | null>(null);
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

  // Expandir notificação automaticamente se vier via query param
  useEffect(() => {
    const idParam = searchParams?.get("notificacao_id");
    if (!idParam || notificacoes.length === 0) return;
    const id = parseInt(idParam);
    if (isNaN(id)) return;
    // Só expande se a notificação existir na lista
    const existe = notificacoes.some(n => n.id === id);
    if (!existe) return;
    setNotificacoesExpandidas((prev) => {
      if (prev.has(id)) return prev;
      const novoSet = new Set(prev);
      novoSet.add(id);
      return novoSet;
    });
    setDetalheId(id);
    // Scroll até a notificação, se possível
    setTimeout(() => {
      const el = document.getElementById(`notificacao-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 300);
  }, [searchParams, notificacoes]);

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

      const response = await api.post<{ message: string; status: string }>(
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

      // Usar a mensagem retornada pelo backend
      const isAprovadaAutomaticamente = response.status === "APROVADA";
      
      toast({
        title: aceitar 
          ? (isAprovadaAutomaticamente ? "Troca Efetivada!" : "Solicitação Aceita") 
          : "Solicitação Recusada",
        description: aceitar
          ? response.message
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
        const substitutos = await api.get<any[]>(
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

  const getSolicitacaoIdDoLink = (notificacao: Notificacao, param: string): string | null => {
    if (!notificacao.link) return null;
    const urlParams = new URLSearchParams(notificacao.link.split('?')[1]);
    return urlParams.get(param);
  };

  const getStatusSolicitacao = (notificacao: Notificacao) => {
    if (notificacao.tipo !== "TROCA" || notificacao.titulo !== "Solicitação de Troca Recebida") {
      return null;
    }
    const solicitacaoId = getSolicitacaoIdDoLink(notificacao, "solicitacao_id");
    if (!solicitacaoId) return null;
    return statusSolicitacoes.get(parseInt(solicitacaoId));
  };

  const renderStatusBadge = (statusSolicitacao: string | null | undefined) => {
    if (!statusSolicitacao || statusSolicitacao === "PENDENTE_SUBSTITUTO") return null;
    return (
      <Badge
        variant={
          statusSolicitacao === "RECUSADA" ? "destructive" :
          statusSolicitacao === "PENDENTE_PASTOR" ? "warning" :
          statusSolicitacao === "APROVADA" ? "success" :
          "secondary"
        }
      >
        {statusSolicitacao === "RECUSADA" ? "Recusada" :
         statusSolicitacao === "PENDENTE_PASTOR" ? "Aceita - Aguardando Pastor" :
         statusSolicitacao === "APROVADA" ? "Aprovada" :
         statusSolicitacao}
      </Badge>
    );
  };

  const renderAcoes = (notificacao: Notificacao) => {
    const solId = getSolicitacaoIdDoLink(notificacao, "solicitacao_id");
    const mostrarTroca =
      notificacao.tipo === "TROCA" &&
      notificacao.titulo === "Solicitação de Troca Recebida" &&
      !!solId &&
      solicitacoesPendentes.has(parseInt(solId));
    const mostrarPastor =
      notificacao.tipo === "TROCA" &&
      notificacao.titulo === "Troca Aceita - Aguardando Aprovação" &&
      !!solId &&
      solicitacoesPendentesPastor.has(parseInt(solId));
    const mostrarEmergencial =
      notificacao.tipo === "TROCA" &&
      notificacao.titulo === "🚨 Solicitação de Substituição Emergencial" &&
      !!getSolicitacaoIdDoLink(notificacao, "solicitacao_emergencial_id");

    const spinner = <Loader2 className="h-4 w-4 animate-spin mr-2" />;

    return (
      <>
        {mostrarTroca && (
          <div className="grid grid-cols-2 gap-3">
            <Button
              className="bg-success text-success-foreground hover:bg-success/90"
              onClick={() => responderSolicitacaoTroca(notificacao.id, true)}
              disabled={processandoTroca?.notificacaoId === notificacao.id}
            >
              {processandoTroca?.notificacaoId === notificacao.id &&
              processandoTroca?.acao === "aceitar" ? spinner : <ThumbsUp className="h-4 w-4 mr-2" />}
              Aceitar
            </Button>
            <Button
              variant="destructive"
              onClick={() => responderSolicitacaoTroca(notificacao.id, false)}
              disabled={processandoTroca?.notificacaoId === notificacao.id}
            >
              {processandoTroca?.notificacaoId === notificacao.id &&
              processandoTroca?.acao === "recusar" ? spinner : <X className="h-4 w-4 mr-2" />}
              Recusar
            </Button>
          </div>
        )}

        {mostrarPastor && (
          <div className="grid grid-cols-2 gap-3">
            <Button
              className="bg-success text-success-foreground hover:bg-success/90"
              onClick={() => {
                const solicitacaoId = parseInt(solId!);
                responderSolicitacaoPastor(solicitacaoId, true, notificacao.id);
              }}
              disabled={processandoPastor?.notificacaoId === notificacao.id}
            >
              {processandoPastor?.notificacaoId === notificacao.id &&
              processandoPastor?.acao === "aprovar" ? spinner : <ThumbsUp className="h-4 w-4 mr-2" />}
              Aprovar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const solicitacaoId = parseInt(solId!);
                responderSolicitacaoPastor(solicitacaoId, false, notificacao.id);
              }}
              disabled={processandoPastor?.notificacaoId === notificacao.id}
            >
              {processandoPastor?.notificacaoId === notificacao.id &&
              processandoPastor?.acao === "recusar" ? spinner : <X className="h-4 w-4 mr-2" />}
              Recusar
            </Button>
          </div>
        )}

        {mostrarEmergencial && (
          <div className="grid grid-cols-2 gap-3">
            <Button
              className="bg-success text-success-foreground hover:bg-success/90"
              onClick={() => responderSolicitacaoEmergencial(notificacao.id, true)}
              disabled={processandoEmergencial?.notificacaoId === notificacao.id}
            >
              {processandoEmergencial?.notificacaoId === notificacao.id &&
              processandoEmergencial?.acao === "aceitar" ? spinner : <ThumbsUp className="h-4 w-4 mr-2" />}
              Aceitar (+5 pontos)
            </Button>
            <Button
              variant="destructive"
              onClick={() => responderSolicitacaoEmergencial(notificacao.id, false)}
              disabled={processandoEmergencial?.notificacaoId === notificacao.id}
            >
              {processandoEmergencial?.notificacaoId === notificacao.id &&
              processandoEmergencial?.acao === "recusar" ? spinner : <X className="h-4 w-4 mr-2" />}
              Recusar
            </Button>
          </div>
        )}
      </>
    );
  };

  const notificacaoDetalhe = notificacoes.find((n) => n.id === detalheId) || null;

  const abrirDetalhe = (notificacao: Notificacao) => {
    toggleExpandir(notificacao.id);
    setDetalheId(notificacao.id);
    if (!notificacao.lida) {
      marcarComoLida(notificacao.id);
    }
  };

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
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        title="Notificações"
        description="Acompanhe todas as atualizações e avisos do sistema"
        icon={<Bell className="h-5 w-5" />}
        actions={
          <>
            {naoLidas.length > 0 && (
              <Button variant="outline" onClick={marcarTodasComoLidas} className="flex-1 sm:flex-none">
                <CheckCheck className="h-4 w-4 mr-2" />
                Marcar todas como lidas
              </Button>
            )}
            <Button
              variant="outline"
              onClick={fetchNotificacoes}
              className={naoLidas.length > 0 ? "shrink-0 px-3 sm:px-4" : "flex-1 sm:flex-none"}
              aria-label="Atualizar"
            >
              <RefreshCw className={`h-4 w-4 ${naoLidas.length > 0 ? "sm:mr-2" : "mr-2"}`} />
              <span className={naoLidas.length > 0 ? "hidden sm:inline" : ""}>Atualizar</span>
            </Button>
          </>
        }
      />

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="todas">Todas</TabsTrigger>
          <TabsTrigger value="nao-lidas" className="relative">
            Não lidas
            {naoLidas.length > 0 && (
              <Badge className="ml-2 h-5 min-w-5 px-1.5 flex items-center justify-center">
                {naoLidas.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-4 md:mt-6">
          {filteredNotificacoes.length === 0 ? (
            <EmptyState
              icon={<Bell className="h-6 w-6" />}
              title={
                selectedTab === "nao-lidas"
                  ? "Você não tem notificações não lidas"
                  : "Você não tem notificações"
              }
              description="Quando houver novidades, elas aparecem aqui."
            />
          ) : (
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <ul className="divide-y divide-border">
                  {filteredNotificacoes.map((notificacao) => {
                    const statusSolicitacao = getStatusSolicitacao(notificacao);
                    return (
                      <li
                        key={notificacao.id}
                        id={`notificacao-${notificacao.id}`}
                        className={`flex items-stretch transition-colors hover:bg-accent/50 ${
                          !notificacao.lida ? "bg-primary/5" : ""
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => abrirDetalhe(notificacao)}
                          className="flex min-w-0 flex-1 items-start gap-3 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                        >
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${getTipoChipClass(
                              notificacao.tipo
                            )}`}
                          >
                            {getIconByType(notificacao.tipo, notificacao.mensagem)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p
                                className={`line-clamp-2 leading-snug ${
                                  !notificacao.lida
                                    ? "font-semibold text-foreground"
                                    : "font-medium text-muted-foreground"
                                }`}
                              >
                                {notificacao.titulo}
                              </p>
                              <span className="flex shrink-0 items-center gap-1.5 pt-0.5 text-xs text-muted-foreground whitespace-nowrap">
                                {!notificacao.lida && (
                                  <span className="h-2 w-2 rounded-full bg-primary" aria-label="Não lida" />
                                )}
                                {formatTimeAgo(notificacao.created_at)}
                              </span>
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                              {notificacao.mensagem}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <Badge variant="outline" className="font-normal">
                                {getTipoLabel(notificacao.tipo)}
                              </Badge>
                              {renderStatusBadge(statusSolicitacao)}
                            </div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => alternarLida(notificacao.id, notificacao.lida)}
                          disabled={marcandoLida === notificacao.id}
                          title={notificacao.lida ? "Marcar como não lida" : "Marcar como lida"}
                          aria-label={notificacao.lida ? "Marcar como não lida" : "Marcar como lida"}
                          className="flex w-12 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                        >
                          {marcandoLida === notificacao.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : notificacao.lida ? (
                            <CheckCheck className="h-4 w-4" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Detalhes da notificação (bottom sheet no celular) */}
      <Dialog
        open={!!notificacaoDetalhe}
        onOpenChange={(open) => {
          if (!open) setDetalheId(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          {notificacaoDetalhe && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3 pr-6">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${getTipoChipClass(
                      notificacaoDetalhe.tipo
                    )}`}
                  >
                    {getIconByType(notificacaoDetalhe.tipo, notificacaoDetalhe.mensagem)}
                  </div>
                  <div className="min-w-0 text-left">
                    <DialogTitle className="text-left leading-snug">
                      {notificacaoDetalhe.titulo}
                    </DialogTitle>
                    <DialogDescription className="mt-1 text-left">
                      {getTipoLabel(notificacaoDetalhe.tipo)} •{" "}
                      {formatTimeAgo(notificacaoDetalhe.created_at)}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4">
                {renderStatusBadge(getStatusSolicitacao(notificacaoDetalhe))}
                <p className="whitespace-pre-line break-words text-sm leading-relaxed">
                  {notificacaoDetalhe.mensagem}
                </p>
                {renderAcoes(notificacaoDetalhe)}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Substituição Emergencial */}
      <Dialog open={showSubstituicaoEmergencialDialog} onOpenChange={setShowSubstituicaoEmergencialDialog}>
        <DialogContent className="sm:max-w-2xl">
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
                          className="flex items-center space-x-3 p-3 rounded-xl border hover:bg-accent cursor-pointer"
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
