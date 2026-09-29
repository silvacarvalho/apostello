"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Plus,
  Loader2,
  Trash2,
  Edit,
  CalendarOff,
  AlertCircle,
  Info,
} from "lucide-react";
import { format, parseISO, differenceInDays, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  useAuthStore,
  isPregador,
  isCantor,
} from "@/stores/auth-store";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { DayPicker, DateRange } from "react-day-picker";
import "react-day-picker/dist/style.css";

// Tipos
interface Indisponibilidade {
  id: number;
  usuario_id: number;
  data_inicio: string;
  data_fim: string;
  motivo_tipo: string;
  motivo_descricao: string | null;
  created_at: string;
  usuario_nome?: string;
}

interface IndisponibilidadeListResponse {
  indisponibilidades: Indisponibilidade[];
  total: number;
}

const MOTIVOS = [
  { value: "FERIAS", label: "Férias" },
  { value: "VIAGEM", label: "Viagem" },
  { value: "COMPROMISSO", label: "Compromisso Pessoal" },
  { value: "SAUDE", label: "Saúde" },
  { value: "OUTRO", label: "Outro" },
];

export default function IndisponibilidadesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [indisponibilidades, setIndisponibilidades] = useState<Indisponibilidade[]>([]);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedIndisponibilidade, setSelectedIndisponibilidade] = useState<Indisponibilidade | null>(null);
  
  // Form states
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [motivo, setMotivo] = useState<string>("");
  const [descricao, setDescricao] = useState<string>("");
  
  // Helpers para acessar as datas do range
  const dataInicio = dateRange?.from;
  const dataFim = dateRange?.to;

  // Verifica se usuário pode acessar esta página (pregador ou cantor)
  const canAccess = isPregador(user) || isCantor(user);

  // Carrega indisponibilidades
  const fetchIndisponibilidades = useCallback(async () => {
    if (!canAccess) return;
    
    try {
      setLoading(true);
      const response = await api.get<IndisponibilidadeListResponse>("/api/v1/indisponibilidades/minhas");
      setIndisponibilidades(response.indisponibilidades);
    } catch (error: unknown) {
      console.error("Erro ao carregar indisponibilidades:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar indisponibilidades",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [canAccess, toast]);

  useEffect(() => {
    if (!canAccess) {
      toast({
        title: "Acesso negado",
        description: "Apenas pregadores e cantores podem acessar esta página",
        variant: "destructive",
      });
      router.push("/dashboard");
      return;
    }
    
    fetchIndisponibilidades();
  }, [canAccess, fetchIndisponibilidades, router, toast]);

  // Resetar form
  const resetForm = () => {
    setDateRange(undefined);
    setMotivo("");
    setDescricao("");
    setSelectedIndisponibilidade(null);
  };

  // Abrir modal de adição
  const handleOpenAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  // Abrir modal de edição
  const handleOpenEditModal = (item: Indisponibilidade) => {
    setSelectedIndisponibilidade(item);
    setDateRange({
      from: parseISO(item.data_inicio),
      to: parseISO(item.data_fim)
    });
    setMotivo(item.motivo_tipo);
    setDescricao(item.motivo_descricao || "");
    setShowEditModal(true);
  };

  // Abrir diálogo de exclusão
  const handleOpenDeleteDialog = (item: Indisponibilidade) => {
    setSelectedIndisponibilidade(item);
    setShowDeleteDialog(true);
  };

  // Criar indisponibilidade
  const handleCreate = async () => {
    if (!dataInicio || !dataFim || !motivo) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha as datas de início, fim e motivo",
        variant: "destructive",
      });
      return;
    }

    if (isBefore(dataFim, dataInicio)) {
      toast({
        title: "Datas inválidas",
        description: "A data de fim deve ser posterior à data de início",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      await api.post("/api/v1/indisponibilidades/", {
        data_inicio: format(dataInicio, "yyyy-MM-dd"),
        data_fim: format(dataFim, "yyyy-MM-dd"),
        motivo: motivo,
        descricao: descricao || undefined,
      });

      toast({
        title: "Sucesso",
        description: "Indisponibilidade registrada com sucesso",
      });
      
      setShowAddModal(false);
      resetForm();
      fetchIndisponibilidades();
    } catch (error: unknown) {
      console.error("Erro ao criar indisponibilidade:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro ao registrar indisponibilidade";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Atualizar indisponibilidade
  const handleUpdate = async () => {
    if (!selectedIndisponibilidade || !dataInicio || !dataFim || !motivo) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha as datas de início, fim e motivo",
        variant: "destructive",
      });
      return;
    }

    if (isBefore(dataFim, dataInicio)) {
      toast({
        title: "Datas inválidas",
        description: "A data de fim deve ser posterior à data de início",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      await api.put(`/api/v1/indisponibilidades/${selectedIndisponibilidade.id}`, {
        data_inicio: format(dataInicio, "yyyy-MM-dd"),
        data_fim: format(dataFim, "yyyy-MM-dd"),
        motivo: motivo,
        descricao: descricao || undefined,
      });

      toast({
        title: "Sucesso",
        description: "Indisponibilidade atualizada com sucesso",
      });
      
      setShowEditModal(false);
      resetForm();
      fetchIndisponibilidades();
    } catch (error: unknown) {
      console.error("Erro ao atualizar indisponibilidade:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro ao atualizar indisponibilidade";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Excluir indisponibilidade
  const handleDelete = async () => {
    if (!selectedIndisponibilidade) return;

    try {
      setSubmitting(true);
      await api.delete(`/api/v1/indisponibilidades/${selectedIndisponibilidade.id}`);

      toast({
        title: "Sucesso",
        description: "Indisponibilidade removida com sucesso",
      });
      
      setShowDeleteDialog(false);
      setSelectedIndisponibilidade(null);
      fetchIndisponibilidades();
    } catch (error: unknown) {
      console.error("Erro ao excluir indisponibilidade:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro ao excluir indisponibilidade";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Verifica se data está próxima (menos de 7 dias)
  const isDataProxima = (dataInicio: string): boolean => {
    const dias = differenceInDays(parseISO(dataInicio), new Date());
    return dias >= 0 && dias < 7;
  };

  // Retorna label do motivo
  const getMotivoLabel = (value: string): string => {
    const motivoItem = MOTIVOS.find(m => m.value === value);
    return motivoItem?.label || value;
  };

  // Verifica se indisponibilidade está ativa
  const isAtiva = (item: Indisponibilidade): boolean => {
    const hoje = new Date();
    return !isBefore(parseISO(item.data_fim), hoje);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Minhas Indisponibilidades</h1>
          <p className="text-muted-foreground">
            Gerencie os períodos em que você não estará disponível para escalas
          </p>
        </div>
        <Button onClick={handleOpenAddModal}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Indisponibilidade
        </Button>
      </div>

      {/* Info Alert */}
      <div className="flex items-start gap-3 p-4 rounded-lg border bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Importante:</strong> Se você registrar uma indisponibilidade com menos de 7 dias 
          de antecedência, seu pastor será automaticamente notificado.
        </div>
      </div>

      {/* Lista de indisponibilidades */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarOff className="h-5 w-5" />
            Períodos Registrados
          </CardTitle>
          <CardDescription>
            {indisponibilidades.length === 0
              ? "Você não possui indisponibilidades registradas"
              : `${indisponibilidades.length} período(s) registrado(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {indisponibilidades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma indisponibilidade registrada</p>
              <p className="text-sm">
                Clique em &quot;Nova Indisponibilidade&quot; para adicionar um período
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {indisponibilidades.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border",
                    !isAtiva(item) && "bg-muted/50 opacity-60"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {format(parseISO(item.data_inicio), "dd/MM/yyyy", { locale: ptBR })}
                          {" - "}
                          {format(parseISO(item.data_fim), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        <Badge variant="outline">{getMotivoLabel(item.motivo_tipo)}</Badge>
                        {!isAtiva(item) && (
                          <Badge variant="secondary">Expirado</Badge>
                        )}
                        {isAtiva(item) && isDataProxima(item.data_inicio) && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Próximo
                          </Badge>
                        )}
                      </div>
                      {item.motivo_descricao && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.motivo_descricao}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {isAtiva(item) && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleOpenEditModal(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleOpenDeleteDialog(item)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Adicionar */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nova Indisponibilidade</DialogTitle>
            <DialogDescription>
              Registre um período em que você não estará disponível
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Período de Indisponibilidade *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange?.from && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                          {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                        </>
                      ) : (
                        format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                      )
                    ) : (
                      "Selecione o período"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <DayPicker
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    disabled={(date: Date) => isBefore(date, new Date())}
                    locale={ptBR}
                    numberOfMonths={2}
                    showOutsideDays={false}
                  />
                </PopoverContent>
              </Popover>
              {dateRange?.from && dateRange?.to && (
                <p className="text-sm text-muted-foreground">
                  {differenceInDays(dateRange.to, dateRange.from) + 1} dia(s) selecionado(s)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Motivo *</Label>
              <Select value={motivo} onValueChange={setMotivo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  {MOTIVOS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                placeholder="Detalhes adicionais..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={3}
              />
            </div>

            {dataInicio && isDataProxima(format(dataInicio, "yyyy-MM-dd")) && (
              <div className="flex items-start gap-3 p-3 rounded-lg border bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5" />
                <div className="text-sm text-red-800 dark:text-red-200">
                  Esta data está a menos de 7 dias. Seu pastor será notificado automaticamente.
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Indisponibilidade</DialogTitle>
            <DialogDescription>
              Atualize as informações do período de indisponibilidade
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Período de Indisponibilidade *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange?.from && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                          {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                        </>
                      ) : (
                        format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                      )
                    ) : (
                      "Selecione o período"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <DayPicker
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    locale={ptBR}
                    numberOfMonths={2}
                    showOutsideDays={false}
                  />
                </PopoverContent>
              </Popover>
              {dateRange?.from && dateRange?.to && (
                <p className="text-sm text-muted-foreground">
                  {differenceInDays(dateRange.to, dateRange.from) + 1} dia(s) selecionado(s)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Motivo *</Label>
              <Select value={motivo} onValueChange={setMotivo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  {MOTIVOS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                placeholder="Detalhes adicionais..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Atualizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta indisponibilidade?
              {selectedIndisponibilidade && (
                <span className="block mt-2 font-medium">
                  Período: {format(parseISO(selectedIndisponibilidade.data_inicio), "dd/MM/yyyy")} -{" "}
                  {format(parseISO(selectedIndisponibilidade.data_fim), "dd/MM/yyyy")}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
