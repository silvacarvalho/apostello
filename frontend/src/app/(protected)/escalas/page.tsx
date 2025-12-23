"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Trash2,
  Send,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Users,
  Church,
  CheckCircle,
  Clock,
  XCircle,
  Sparkles,
  Edit,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuthStore, isAdmin, isPastor, getUserDistritoId } from "@/stores/auth-store";
import { formatDate, getStatusColor, getDayOfWeek, parseDate } from "@/lib/utils";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { DistritoCombobox } from "@/components/ui/distrito-combobox";
import { UsuarioCombobox } from "@/components/ui/usuario-combobox";

// Types
interface Distrito {
  id: number;
  nome: string;
}

interface Escala {
  id: number;
  distrito_id: number;
  mes: number;
  ano: number;
  status: string;
  data_publicacao: string | null;
  pastor_id: number;
  created_at: string;
  updated_at: string;
}

interface EscalaListResponse {
  items: Escala[];
  total: number;
}

interface ItemEscala {
  id: number;
  escala_id: number;
  igreja_id: number;
  data_culto: string;
  horario: string;
  pregador_id: number | null;
  cantor_id: number | null;
  tema_id: number | null;
  tema_customizado: string | null;
  status_confirmacao_pregador: string | null;
  status_confirmacao_cantor: string | null;
  status_realizacao: string | null;
  observacoes: string | null;
  igreja_nome: string | null;
  pregador_nome: string | null;
  cantor_nome: string | null;
  tema_titulo: string | null;
  pregador_score: number | null;
  cantor_score: number | null;
}

interface EscalaEstatisticas {
  total_itens: number;
  itens_com_pregador: number;
  itens_com_cantor: number;
  pregadores_confirmados: number;
  cantores_confirmados: number;
  pregadores_recusados: number;
  cantores_recusados: number;
}

interface MinhaEscala {
  id: number;
  data_culto: string;
  horario: string;
  igreja_nome: string;
  tipo: string;
  status: string;
  tema: string | null;
}

interface Usuario {
  id: number;
  nome_completo: string;
  tipo: string;
  score_atual?: number;
}

// Meses para seleção
const MESES = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

// Ordem de prioridade dos dias da semana: Sábado (6), Quarta (3), Domingo (0)
const DAY_ORDER: { [key: number]: number } = {
  6: 0, // Sábado - primeiro
  3: 1, // Quarta - segundo
  0: 2, // Domingo - terceiro
  1: 3, // Segunda
  2: 4, // Terça
  4: 5, // Quinta
  5: 6, // Sexta
};

// Função para ordenar itens da escala: Sábados primeiro, depois Quartas, depois Domingos
const sortEscalaItens = (itens: ItemEscala[]): ItemEscala[] => {
  return [...itens].sort((a, b) => {
    const dateA = parseDate(a.data_culto);
    const dateB = parseDate(b.data_culto);
    const dayOfWeekA = dateA.getDay();
    const dayOfWeekB = dateB.getDay();
    
    // Primeiro ordena por tipo de dia da semana
    const orderA = DAY_ORDER[dayOfWeekA] ?? 7;
    const orderB = DAY_ORDER[dayOfWeekB] ?? 7;
    
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    
    // Dentro do mesmo dia da semana, ordena por data
    return dateA.getTime() - dateB.getTime();
  });
};

export default function EscalasPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const canManage = isAdmin(user) || isPastor(user);

  // Estados
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Distritos
  const [distritos, setDistritos] = useState<Distrito[]>([]);
  const [selectedDistritoId, setSelectedDistritoId] = useState<number | null>(null);

  // Escalas
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [totalEscalas, setTotalEscalas] = useState(0);
  const [page, setPage] = useState(0);
  const itemsPerPage = 10;

  // Minhas escalas
  const [minhasEscalas, setMinhasEscalas] = useState<MinhaEscala[]>([]);
  const [loadingMinhas, setLoadingMinhas] = useState(false);

  // Modal de geração
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    distrito_id: 0,
    mes: new Date().getMonth() + 2 > 12 ? 1 : new Date().getMonth() + 2,
    ano: new Date().getMonth() + 2 > 12 ? new Date().getFullYear() + 1 : new Date().getFullYear(),
    usar_score: true,
    priorizar_sabado: true,
    respeitar_intervalo: true,
    respeitar_recorrencia: true,
  });

  // Modal de detalhes
  const [selectedEscala, setSelectedEscala] = useState<Escala | null>(null);
  const [escalaItens, setEscalaItens] = useState<ItemEscala[]>([]);
  const [escalaEstatisticas, setEscalaEstatisticas] = useState<EscalaEstatisticas | null>(null);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [filtroIgrejaId, setFiltroIgrejaId] = useState<number | null>(null);

  // Modal de exclusão
  const [escalaToDelete, setEscalaToDelete] = useState<Escala | null>(null);

  // Modal de publicação
  const [escalaToPublish, setEscalaToPublish] = useState<Escala | null>(null);

  // Modal de validação de geração
  const [showValidationAlert, setShowValidationAlert] = useState(false);
  const [validationData, setValidationData] = useState<{
    igrejas_sem_horario: { id: number; nome: string }[];
    total_igrejas: number;
    mensagem: string;
  } | null>(null);

  // Modal de edição de item
  const [isEditItemDialogOpen, setIsEditItemDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemEscala | null>(null);
  const [pregadores, setPregadores] = useState<Usuario[]>([]);
  const [cantores, setCantores] = useState<Usuario[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [editForm, setEditForm] = useState({
    pregador_id: null as number | null,
    cantor_id: null as number | null,
    escalarMePregador: false,
    escalarMeCantor: false,
  });

  // Carregar primeiro distrito para seleção inicial
  useEffect(() => {
    async function fetchDistritoInicial() {
      // Se não for admin, usar distrito do usuário
      const userDistritoId = getUserDistritoId(user);
      
      if (userDistritoId && !isAdmin(user)) {
        setSelectedDistritoId(userDistritoId);
        setGenerateForm(prev => ({ ...prev, distrito_id: userDistritoId }));
        return;
      }
      
      // Admin: carregar lista de distritos
      try {
        const data = await api.get<{ items: Distrito[]; total: number }>("/api/v1/distritos/pesquisar?search=&limit=50");
        setDistritos(data.items);
        if (data.items.length > 0 && !selectedDistritoId) {
          setSelectedDistritoId(data.items[0].id);
          setGenerateForm(prev => ({ ...prev, distrito_id: data.items[0].id }));
        }
      } catch (err) {
        console.error("Erro ao carregar distritos:", err);
      }
    }
    
    if (user) {
      fetchDistritoInicial();
    }
  }, [user]);

  // Carregar escalas
  const fetchEscalas = useCallback(async () => {
    if (!selectedDistritoId) return;

    setLoading(true);
    setError(null);
    try {
      // Backend agora usa distrito do usuário automaticamente se não for admin
      const params = isAdmin(user) 
        ? `distrito_id=${selectedDistritoId}&skip=${page * itemsPerPage}&limit=${itemsPerPage}`
        : `skip=${page * itemsPerPage}&limit=${itemsPerPage}`;
      
      const data = await api.get<EscalaListResponse>(`/api/v1/escalas?${params}`);
      setEscalas(data.items);
      setTotalEscalas(data.total);
    } catch (err) {
      console.error("Erro ao carregar escalas:", err);
      setError("Erro ao carregar escalas");
    } finally {
      setLoading(false);
    }
  }, [selectedDistritoId, page, user]);

  useEffect(() => {
    if (selectedDistritoId) {
      fetchEscalas();
    }
  }, [fetchEscalas, selectedDistritoId]);

  // Carregar minhas escalas
  const fetchMinhasEscalas = useCallback(async () => {
    setLoadingMinhas(true);
    try {
      const data = await api.get<MinhaEscala[]>("/api/v1/escalas/minhas");
      setMinhasEscalas(data);
    } catch (err) {
      console.error("Erro ao carregar minhas escalas:", err);
    } finally {
      setLoadingMinhas(false);
    }
  }, []);

  // Validar distrito antes de gerar
  const validateDistrito = async () => {
    if (!generateForm.distrito_id) {
      toast({
        title: "Erro",
        description: "Selecione um distrito",
        variant: "destructive",
      });
      return false;
    }

    try {
      const validation = await api.get<{
        valido: boolean;
        mensagem: string;
        igrejas_sem_horario: { id: number; nome: string }[];
        total_igrejas: number;
      }>(`/api/v1/escalas/validar-distrito/${generateForm.distrito_id}`);

      if (!validation.valido && validation.igrejas_sem_horario.length > 0) {
        setValidationData({
          igrejas_sem_horario: validation.igrejas_sem_horario,
          total_igrejas: validation.total_igrejas,
          mensagem: validation.mensagem,
        });
        setShowValidationAlert(true);
        return false;
      }

      if (validation.total_igrejas === 0) {
        toast({
          title: "Erro",
          description: "Nenhuma igreja ativa encontrada no distrito",
          variant: "destructive",
        });
        return false;
      }

      return true;
    } catch (err: any) {
      toast({
        title: "Erro na validação",
        description: err.message || "Erro ao validar distrito",
        variant: "destructive",
      });
      return false;
    }
  };

  // Gerar escala
  const handleGenerate = async (skipValidation = false) => {
    // Se não está pulando validação, validar primeiro
    if (!skipValidation) {
      const isValid = await validateDistrito();
      if (!isValid) return;
    }

    setGenerating(true);
    try {
      await api.post("/api/v1/escalas/gerar", generateForm);
      toast({
        title: "Sucesso",
        description: "Escala gerada com sucesso!",
      });
      setIsGenerateDialogOpen(false);
      setShowValidationAlert(false);
      fetchEscalas();
    } catch (err: any) {
      toast({
        title: "Erro ao gerar escala",
        description: err.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  // Confirmar geração mesmo com igrejas sem horários
  const handleConfirmGenerate = () => {
    setShowValidationAlert(false);
    handleGenerate(true); // Pula validação
  };

  // Ver detalhes da escala
  const handleViewDetails = async (escala: Escala) => {
    setSelectedEscala(escala);
    setIsDetailsDialogOpen(true);
    setLoadingDetalhes(true);
    setFiltroIgrejaId(null); // Resetar filtro
    try {
      const [itens, stats] = await Promise.all([
        api.get<ItemEscala[]>(`/api/v1/escalas/${escala.id}/itens`),
        api.get<EscalaEstatisticas>(`/api/v1/escalas/${escala.id}/estatisticas`),
      ]);
      setEscalaItens(sortEscalaItens(itens));
      setEscalaEstatisticas(stats);
    } catch (err) {
      console.error("Erro ao carregar detalhes:", err);
      toast({
        title: "Erro",
        description: "Erro ao carregar detalhes da escala",
        variant: "destructive",
      });
    } finally {
      setLoadingDetalhes(false);
    }
  };

  // Publicar escala
  const handlePublish = async () => {
    if (!escalaToPublish) return;

    try {
      await api.post(`/api/v1/escalas/${escalaToPublish.id}/publicar`, {});
      toast({
        title: "Sucesso",
        description: "Escala publicada com sucesso!",
      });
      setEscalaToPublish(null);
      fetchEscalas();
    } catch (err: any) {
      toast({
        title: "Erro ao publicar",
        description: err.message || "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  // Excluir escala
  const handleDelete = async () => {
    if (!escalaToDelete) return;

    try {
      await api.delete(`/api/v1/escalas/${escalaToDelete.id}`);
      toast({
        title: "Sucesso",
        description: "Escala excluída com sucesso!",
      });
      setEscalaToDelete(null);
      fetchEscalas();
    } catch (err: any) {
      toast({
        title: "Erro ao excluir",
        description: err.message || "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  // Carregar pregadores e cantores do distrito
  const fetchUsuariosDistrito = useCallback(async () => {
    if (!selectedDistritoId) return;
    
    setLoadingUsuarios(true);
    try {
      const [pregadoresData, cantoresData] = await Promise.all([
        api.get<Usuario[]>(`/api/v1/usuarios/pregadores?distrito_id=${selectedDistritoId}`),
        api.get<Usuario[]>(`/api/v1/usuarios/cantores?distrito_id=${selectedDistritoId}`),
      ]);
      setPregadores(pregadoresData);
      setCantores(cantoresData);
    } catch (err) {
      console.error("Erro ao carregar usuários:", err);
    } finally {
      setLoadingUsuarios(false);
    }
  }, [selectedDistritoId]);

  // Abrir modal de edição de item
  const handleEditItem = async (item: ItemEscala) => {
    setSelectedItem(item);
    setEditForm({
      pregador_id: item.pregador_id,
      cantor_id: item.cantor_id,
      escalarMePregador: false,
      escalarMeCantor: false,
    });
    setIsEditItemDialogOpen(true);
    await fetchUsuariosDistrito();
  };

  // Salvar edição do item
  const handleSaveItem = async () => {
    if (!selectedItem) return;

    setSavingItem(true);
    try {
      // Se "Escalar-me" estiver marcado, usar o ID do usuário logado
      const pregadorId = editForm.escalarMePregador ? user?.id : editForm.pregador_id;
      const cantorId = editForm.escalarMeCantor ? user?.id : editForm.cantor_id;

      await api.put(`/api/v1/escalas/itens/${selectedItem.id}`, {
        pregador_id: pregadorId,
        cantor_id: cantorId,
      });
      toast({
        title: "Sucesso",
        description: "Item da escala atualizado com sucesso!",
      });
      setIsEditItemDialogOpen(false);
      // Recarregar itens da escala
      if (selectedEscala) {
        const [itens, stats] = await Promise.all([
          api.get<ItemEscala[]>(`/api/v1/escalas/${selectedEscala.id}/itens`),
          api.get<EscalaEstatisticas>(`/api/v1/escalas/${selectedEscala.id}/estatisticas`),
        ]);
        setEscalaItens(sortEscalaItens(itens));
        setEscalaEstatisticas(stats);
      }
    } catch (err: any) {
      toast({
        title: "Erro ao atualizar",
        description: err.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSavingItem(false);
    }
  };

  // Confirmar presença (para minhas escalas)
  const handleConfirmar = async (itemId: number, confirmado: boolean) => {
    try {
      await api.post(`/api/v1/escalas/itens/${itemId}/confirmar`, { confirmado });
      toast({
        title: "Sucesso",
        description: confirmado ? "Presença confirmada!" : "Presença recusada",
      });
      fetchMinhasEscalas();
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message || "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  // Formatar título da escala
  const getEscalaTitulo = (escala: Escala) => {
    const mesNome = MESES.find(m => m.value === escala.mes)?.label || "";
    return `Escala ${mesNome} ${escala.ano}`;
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "RASCUNHO":
        return <Badge variant="outline">Rascunho</Badge>;
      case "PUBLICADA":
        return <Badge className="bg-green-500 hover:bg-green-600">Publicada</Badge>;
      case "ARQUIVADA":
        return <Badge variant="secondary">Arquivada</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Total pages
  const totalPages = Math.ceil(totalEscalas / itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Escalas
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie e visualize as escalas de pregação e louvor
          </p>
        </div>

        {canManage && (
          <Button onClick={() => setIsGenerateDialogOpen(true)}>
            <Sparkles className="h-4 w-4 mr-2" />
            Gerar Escala Automática
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs 
        defaultValue={canManage ? "gerenciar" : "minhas"} 
        className="space-y-4"
        onValueChange={(val) => {
          if (val === "minhas") {
            fetchMinhasEscalas();
          }
        }}
      >
        <TabsList>
          <TabsTrigger value="minhas">Minhas Escalas</TabsTrigger>
          {canManage && <TabsTrigger value="gerenciar">Gerenciar</TabsTrigger>}
        </TabsList>

        {/* Minhas Escalas */}
        <TabsContent value="minhas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Próximos Compromissos</CardTitle>
              <CardDescription>
                Seus agendamentos de pregação e louvor
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingMinhas ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : minhasEscalas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Você não possui escalas agendadas</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {minhasEscalas.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-primary/10 shrink-0">
                          <span className="text-lg font-bold text-primary">
                            {parseDate(item.data_culto).getDate()}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {parseDate(item.data_culto).toLocaleDateString("pt-BR", {
                              month: "short",
                            })}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{item.igreja_nome}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.tipo} • {item.horario}
                          </p>
                          {item.tema && (
                            <p className="text-sm text-primary mt-1">
                              Tema: {item.tema}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-auto">
                        <Badge className={getStatusColor(item.status)}>
                          {item.status}
                        </Badge>
                        {item.status === "PENDENTE" && (
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => handleConfirmar(item.id, true)}
                            >
                              Confirmar
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleConfirmar(item.id, false)}
                            >
                              Recusar
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gerenciar Escalas */}
        {canManage && (
          <TabsContent value="gerenciar" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              {/* Mostrar seletor de distrito apenas para admins */}
              {isAdmin(user) && (
                <DistritoCombobox
                  value={selectedDistritoId}
                  onValueChange={(val) => {
                    setSelectedDistritoId(val);
                    setPage(0);
                  }}
                  placeholder="Selecione o distrito"
                  className="w-full md:w-[300px]"
                />
              )}
              
              {/* Para não-admins, mostrar distrito atual */}
              {!isAdmin(user) && selectedDistritoId && (
                <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/50">
                  <Church className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    Distrito {distritos.find(d => d.id === selectedDistritoId)?.nome || selectedDistritoId}
                  </span>
                </div>
              )}

              <Button variant="outline" onClick={fetchEscalas}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>

            {/* Error state */}
            {error && (
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-4">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                  <p className="text-destructive">{error}</p>
                  <Button onClick={fetchEscalas}>Tentar novamente</Button>
                </div>
              </div>
            )}

            {/* Loading state */}
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            )}

            {/* Table */}
            {!loading && !error && (
              <>
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Período</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data Publicação</TableHead>
                        <TableHead>Criado em</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {escalas.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Nenhuma escala encontrada para este distrito
                          </TableCell>
                        </TableRow>
                      ) : (
                        escalas.map((escala) => (
                          <TableRow key={escala.id}>
                            <TableCell className="font-medium">
                              {getEscalaTitulo(escala)}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(escala.status)}
                            </TableCell>
                            <TableCell>
                              {escala.data_publicacao 
                                ? formatDate(escala.data_publicacao)
                                : "-"
                              }
                            </TableCell>
                            <TableCell>
                              {formatDate(escala.created_at)}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleViewDetails(escala)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Visualizar
                                  </DropdownMenuItem>
                                  {escala.status === "RASCUNHO" && (
                                    <>
                                      <DropdownMenuItem onClick={() => setEscalaToPublish(escala)}>
                                        <Send className="h-4 w-4 mr-2" />
                                        Publicar
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        className="text-destructive"
                                        onClick={() => setEscalaToDelete(escala)}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Excluir
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Card>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Mostrando {page * itemsPerPage + 1} a {Math.min((page + 1) * itemsPerPage, totalEscalas)} de {totalEscalas} escalas
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">
                        Página {page + 1} de {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Dialog: Gerar Escala */}
      <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Gerar Escala Automática
            </DialogTitle>
            <DialogDescription>
              Configure os parâmetros para gerar uma nova escala automaticamente usando o algoritmo inteligente.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="distrito">Distrito</Label>
              {isAdmin(user) ? (
                <DistritoCombobox
                  value={generateForm.distrito_id || null}
                  onValueChange={(val) => setGenerateForm(prev => ({ ...prev, distrito_id: val || 0 }))}
                  placeholder="Selecione o distrito"
                />
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/50">
                  <Church className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {distritos.find(d => d.id === selectedDistritoId)?.nome || `Distrito ${selectedDistritoId}`}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="mes">Mês</Label>
                <Select
                  value={generateForm.mes.toString()}
                  onValueChange={(val) => setGenerateForm(prev => ({ ...prev, mes: Number(val) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MESES.map((mes) => (
                      <SelectItem key={mes.value} value={mes.value.toString()}>
                        {mes.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ano">Ano</Label>
                <Select
                  value={generateForm.ano.toString()}
                  onValueChange={(val) => setGenerateForm(prev => ({ ...prev, ano: Number(val) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026].map((ano) => (
                      <SelectItem key={ano} value={ano.toString()}>
                        {ano}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <Label>Opções de Geração</Label>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="usar_score" className="font-normal">Usar score para priorização</Label>
                  <p className="text-xs text-muted-foreground">
                    Prioriza pregadores/cantores com maior score
                  </p>
                </div>
                <Switch
                  id="usar_score"
                  checked={generateForm.usar_score}
                  onCheckedChange={(checked) => setGenerateForm(prev => ({ ...prev, usar_score: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="priorizar_sabado" className="font-normal">Priorizar sábados</Label>
                  <p className="text-xs text-muted-foreground">
                    Atribui melhores pregadores aos sábados
                  </p>
                </div>
                <Switch
                  id="priorizar_sabado"
                  checked={generateForm.priorizar_sabado}
                  onCheckedChange={(checked) => setGenerateForm(prev => ({ ...prev, priorizar_sabado: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="respeitar_intervalo" className="font-normal">Respeitar intervalo mínimo</Label>
                  <p className="text-xs text-muted-foreground">
                    Mantém 7 dias entre participações
                  </p>
                </div>
                <Switch
                  id="respeitar_intervalo"
                  checked={generateForm.respeitar_intervalo}
                  onCheckedChange={(checked) => setGenerateForm(prev => ({ ...prev, respeitar_intervalo: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="respeitar_recorrencia" className="font-normal">Respeitar limite de recorrência</Label>
                  <p className="text-xs text-muted-foreground">
                    Limita participações por mês
                  </p>
                </div>
                <Switch
                  id="respeitar_recorrencia"
                  checked={generateForm.respeitar_recorrencia}
                  onCheckedChange={(checked) => setGenerateForm(prev => ({ ...prev, respeitar_recorrencia: checked }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar Escala
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Detalhes da Escala */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {selectedEscala && getEscalaTitulo(selectedEscala)}
            </DialogTitle>
            <DialogDescription>
              Visualize os detalhes e estatísticas desta escala
            </DialogDescription>
          </DialogHeader>

          {loadingDetalhes ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Estatísticas */}
              {escalaEstatisticas && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <Church className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Total de Cultos</span>
                    </div>
                    <p className="text-6xl font-bold mt-2 text-center">{escalaEstatisticas.total_itens}</p>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Mensageiros</span>
                    </div>
                    <div className="mt-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Pregadores:</span>
                        <span className="text-lg font-bold">{escalaEstatisticas.itens_com_pregador}</span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Louvores:</span>
                        <span className="text-lg font-bold">{escalaEstatisticas.itens_com_cantor}</span>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-muted-foreground">Confirmados</span>
                    </div>
                    <div className="mt-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Pregadores:</span>
                        <span className="text-lg font-bold">{escalaEstatisticas.pregadores_confirmados}</span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Louvores:</span>
                        <span className="text-lg font-bold">{escalaEstatisticas.cantores_confirmados}</span>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <Clock className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm text-muted-foreground">Pendentes</span>
                    </div>
                    <div className="mt-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Pregadores:</span>
                        <span className="text-lg font-bold">
                          {escalaEstatisticas.itens_com_pregador - escalaEstatisticas.pregadores_confirmados - escalaEstatisticas.pregadores_recusados}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Louvores:</span>
                        <span className="text-lg font-bold">
                          {escalaEstatisticas.itens_com_cantor - escalaEstatisticas.cantores_confirmados - escalaEstatisticas.cantores_recusados}
                        </span>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* Filtro por Igreja */}
              <div className="flex items-center gap-4">
                <Label htmlFor="filtro-igreja" className="text-sm font-medium whitespace-nowrap">
                  Filtrar por Igreja:
                </Label>
                <Select
                  value={filtroIgrejaId?.toString() || "todos"}
                  onValueChange={(value) => setFiltroIgrejaId(value === "todos" ? null : parseInt(value))}
                >
                  <SelectTrigger id="filtro-igreja" className="w-[300px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas as Igrejas</SelectItem>
                    {Array.from(new Set(escalaItens.map(item => ({ id: item.igreja_id, nome: item.igreja_nome }))))
                      .filter((igreja, index, self) => 
                        igreja.id && self.findIndex(i => i.id === igreja.id) === index
                      )
                      .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""))
                      .map((igreja) => (
                        <SelectItem key={igreja.id} value={igreja.id!.toString()}>
                          {igreja.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tabela de itens */}
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Horário</TableHead>
                      <TableHead>Igreja</TableHead>
                      <TableHead>Mensageiros</TableHead>
                      <TableHead>Tema</TableHead>
                      {selectedEscala?.status === "RASCUNHO" && (
                        <TableHead className="text-right">Ações</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {escalaItens.filter(item => !filtroIgrejaId || item.igreja_id === filtroIgrejaId).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={selectedEscala?.status === "RASCUNHO" ? 6 : 5} className="text-center py-8 text-muted-foreground">
                          Nenhum item na escala
                        </TableCell>
                      </TableRow>
                    ) : (
                      escalaItens.filter(item => !filtroIgrejaId || item.igreja_id === filtroIgrejaId).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            {formatDate(item.data_culto)}
                            <span className="text-xs text-muted-foreground ml-1">
                              ({getDayOfWeek(parseDate(item.data_culto).getDay())})
                            </span>
                          </TableCell>
                          <TableCell>{item.horario}</TableCell>
                          <TableCell>{item.igreja_nome || "-"}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground w-24">Pregação:</span>
                                <span>{item.pregador_nome || "-"}</span>
                                {item.pregador_score !== null && (
                                  <Badge variant="outline" className="text-xs">
                                    {item.pregador_score.toFixed(1)}
                                  </Badge>
                                )}
                                {item.status_confirmacao_pregador === "CONFIRMADO" && (
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                )}
                                {item.status_confirmacao_pregador === "RECUSADO" && (
                                  <XCircle className="h-3 w-3 text-red-500" />
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground w-24">Louvor Especial:</span>
                                <span>{item.cantor_nome || "-"}</span>
                                {item.cantor_score !== null && (
                                  <Badge variant="outline" className="text-xs">
                                    {item.cantor_score.toFixed(1)}
                                  </Badge>
                                )}
                                {item.status_confirmacao_cantor === "CONFIRMADO" && (
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                )}
                                {item.status_confirmacao_cantor === "RECUSADO" && (
                                  <XCircle className="h-3 w-3 text-red-500" />
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.tema_titulo || item.tema_customizado || "-"}
                          </TableCell>
                          {selectedEscala?.status === "RASCUNHO" && (
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditItem(item)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              Fechar
            </Button>
            {selectedEscala?.status === "RASCUNHO" && (
              <Button onClick={() => {
                setIsDetailsDialogOpen(false);
                setEscalaToPublish(selectedEscala);
              }}>
                <Send className="h-4 w-4 mr-2" />
                Publicar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert: Confirmar exclusão */}
      <AlertDialog open={!!escalaToDelete} onOpenChange={(open) => !open && setEscalaToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a escala "{escalaToDelete && getEscalaTitulo(escalaToDelete)}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert: Confirmar publicação */}
      <AlertDialog open={!!escalaToPublish} onOpenChange={(open) => !open && setEscalaToPublish(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publicar escala</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja publicar a escala "{escalaToPublish && getEscalaTitulo(escalaToPublish)}"?
              Após publicada, as notificações serão enviadas aos pregadores e cantores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublish}>
              Publicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert: Validação de igrejas sem horários */}
      <AlertDialog open={showValidationAlert} onOpenChange={setShowValidationAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              Atenção: Igrejas sem horários de culto
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>{validationData?.mensagem}</p>
                {validationData && validationData.igrejas_sem_horario.length > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-md">
                    <p className="font-semibold text-sm mb-2">Igrejas afetadas:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {validationData.igrejas_sem_horario.map((igreja) => (
                        <li key={igreja.id}>{igreja.nome}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-sm font-medium">
                  Deseja continuar mesmo assim? O sistema usará horários padrão para essas igrejas (Sábado 09:00, Domingo 18:00, Quarta 19:30).
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmGenerate}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Sim, gerar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Editar Item da Escala */}
      <Dialog open={isEditItemDialogOpen} onOpenChange={setIsEditItemDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Editar Item da Escala
            </DialogTitle>
            <DialogDescription>
              {selectedItem && (
                <>
                  {formatDate(selectedItem.data_culto)} às {selectedItem.horario} - {selectedItem.igreja_nome}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {loadingUsuarios ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="pregador">Pregador</Label>
                <UsuarioCombobox
                  value={editForm.escalarMePregador ? user?.id || null : editForm.pregador_id}
                  onValueChange={(val) => setEditForm(prev => ({ 
                    ...prev, 
                    pregador_id: val,
                    escalarMePregador: false
                  }))}
                  usuarios={pregadores}
                  loading={loadingUsuarios}
                  placeholder="Selecione o pregador"
                  emptyText="Nenhum pregador encontrado"
                  disabled={editForm.escalarMePregador}
                />
                <div className="flex items-center space-x-2 mt-1">
                  <Checkbox 
                    id="escalarMePregador" 
                    checked={editForm.escalarMePregador}
                    onCheckedChange={(checked) => setEditForm(prev => ({
                      ...prev,
                      escalarMePregador: checked === true,
                      pregador_id: checked === true ? user?.id || null : prev.pregador_id
                    }))}
                  />
                  <label
                    htmlFor="escalarMePregador"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Escalar-me como pregador nesta data
                  </label>
                </div>
              </div>

              <Separator />

              <div className="grid gap-2">
                <Label htmlFor="cantor">Louvor Especial</Label>
                <UsuarioCombobox
                  value={editForm.escalarMeCantor ? user?.id || null : editForm.cantor_id}
                  onValueChange={(val) => setEditForm(prev => ({ 
                    ...prev, 
                    cantor_id: val,
                    escalarMeCantor: false
                  }))}
                  usuarios={cantores}
                  loading={loadingUsuarios}
                  placeholder="Selecione o cantor"
                  emptyText="Nenhum cantor encontrado"
                  disabled={editForm.escalarMeCantor}
                />
                <div className="flex items-center space-x-2 mt-1">
                  <Checkbox 
                    id="escalarMeCantor" 
                    checked={editForm.escalarMeCantor}
                    onCheckedChange={(checked) => setEditForm(prev => ({
                      ...prev,
                      escalarMeCantor: checked === true,
                      cantor_id: checked === true ? user?.id || null : prev.cantor_id
                    }))}
                  />
                  <label
                    htmlFor="escalarMeCantor"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Escalar-me como louvor nesta data
                  </label>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditItemDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveItem} disabled={savingItem}>
              {savingItem && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
