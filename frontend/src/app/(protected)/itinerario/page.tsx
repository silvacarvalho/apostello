"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, Info, ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { useAuthStore, isPastor, isAdmin, getUserDistritoId } from "@/stores/auth-store";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ItinerarioItem {
  id: number;
  distrito_id: number;
  igreja_id: number;
  igreja_nome?: string;
  pastor_id: number;
  pastor_nome?: string;
  data_culto: string;
  observacoes?: string;
}

interface Igreja {
  id: number;
  nome: string;
}

export default function ItinerarioPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const distritoId = getUserDistritoId(user);
  const canAccess = isPastor(user) || isAdmin(user);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [itens, setItens] = useState<ItinerarioItem[]>([]);
  const [igrejas, setIgrejas] = useState<Igreja[]>([]);

  // Mês exibido no calendário
  const [mesAtual, setMesAtual] = useState<Date>(startOfMonth(new Date()));

  // Modais
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selecionado, setSelecionado] = useState<ItinerarioItem | null>(null);

  // Formulário
  const [igrejaId, setIgrejaId] = useState<string>("");
  const [dataCulto, setDataCulto] = useState<string>("");
  const [observacoes, setObservacoes] = useState<string>("");

  const fetchItens = useCallback(async () => {
    if (!canAccess) return;
    try {
      setLoading(true);
      const response = await api.get<{ itinerarios: ItinerarioItem[]; total: number }>(
        `/api/v1/itinerarios/?mes=${mesAtual.getMonth() + 1}&ano=${mesAtual.getFullYear()}`
      );
      setItens(response.itinerarios || []);
    } catch (error) {
      console.error("Erro ao carregar itinerário:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar o itinerário",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [canAccess, mesAtual, toast]);

  const fetchIgrejas = useCallback(async () => {
    if (!canAccess) return;
    try {
      const endpoint = distritoId
        ? `/api/v1/igrejas/?distrito_id=${distritoId}&limit=500`
        : "/api/v1/igrejas/?limit=500";
      const response = await api.get<{ items: Igreja[] }>(endpoint);
      setIgrejas(response.items || []);
    } catch (error) {
      console.error("Erro ao carregar igrejas:", error);
    }
  }, [canAccess, distritoId]);

  useEffect(() => {
    if (!canAccess) {
      toast({
        title: "Acesso negado",
        description: "Apenas pastores e administradores podem acessar esta página",
        variant: "destructive",
      });
      router.push("/dashboard");
      return;
    }
    fetchIgrejas();
  }, [canAccess, fetchIgrejas, router, toast]);

  useEffect(() => {
    fetchItens();
  }, [fetchItens]);

  const resetForm = () => {
    setIgrejaId("");
    setDataCulto("");
    setObservacoes("");
    setSelecionado(null);
  };

  // Clique em um dia do calendário: abre o modal (novo registro ou edição)
  const handleClickDia = (dia: Date) => {
    const iso = format(dia, "yyyy-MM-dd");
    const existente = itens.find((i) => i.data_culto === iso) || null;
    setSelecionado(existente);
    setDataCulto(iso);
    setIgrejaId(existente ? existente.igreja_id.toString() : "");
    setObservacoes(existente?.observacoes || "");
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!igrejaId || !dataCulto) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione a igreja e a data",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      igreja_id: parseInt(igrejaId),
      data_culto: dataCulto,
      observacoes: observacoes || null,
    };

    try {
      setSubmitting(true);
      if (selecionado) {
        await api.put(`/api/v1/itinerarios/${selecionado.id}`, payload);
      } else {
        await api.post("/api/v1/itinerarios/", payload);
      }
      toast({
        title: "Sucesso",
        description: selecionado ? "Itinerário atualizado" : "Itinerário registrado",
      });
      setShowFormModal(false);
      resetForm();
      fetchItens();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao salvar itinerário";
      toast({ title: "Erro", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selecionado) return;
    try {
      setSubmitting(true);
      await api.delete(`/api/v1/itinerarios/${selecionado.id}`);
      toast({ title: "Sucesso", description: "Itinerário removido" });
      setShowDeleteDialog(false);
      setShowFormModal(false);
      resetForm();
      fetchItens();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao remover itinerário";
      toast({ title: "Erro", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const dias = eachDayOfInterval({
    start: startOfWeek(startOfMonth(mesAtual)),
    end: endOfWeek(endOfMonth(mesAtual)),
  });
  const nomesDias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Itinerário do Pastor</h1>
        <p className="text-muted-foreground">
          Clique em um dia do calendário para registrar onde você estará
        </p>
      </div>

      {/* Aviso */}
      <div className="flex items-start gap-3 p-4 rounded-lg border bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Como funciona:</strong> nas datas registradas aqui, a escala gerada{" "}
          <strong>não sorteia pregador</strong> para aquela igreja, pois o pastor já estará
          presente. O itinerário deve ser cadastrado <strong>antes</strong> de gerar a escala do mês.
        </div>
      </div>

      {/* Calendário */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMesAtual(subMonths(mesAtual, 1))}
              aria-label="Mês anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="capitalize">
              {format(mesAtual, "MMMM 'de' yyyy", { locale: ptBR })}
            </CardTitle>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMesAtual(addMonths(mesAtual, 1))}
              aria-label="Próximo mês"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {nomesDias.map((nome) => (
                <div
                  key={nome}
                  className="text-center text-xs font-medium text-muted-foreground py-1"
                >
                  {nome}
                </div>
              ))}
              {dias.map((dia) => {
                const iso = format(dia, "yyyy-MM-dd");
                const registro = itens.find((i) => i.data_culto === iso);
                const doMes = isSameMonth(dia, mesAtual);
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={!doMes}
                    onClick={() => handleClickDia(dia)}
                    className={cn(
                      "min-h-[72px] rounded-md border p-1 text-left align-top transition-colors",
                      doMes ? "hover:bg-accent" : "opacity-30 cursor-default",
                      registro && "bg-primary/10 border-primary",
                      isToday(dia) && "ring-2 ring-primary/50"
                    )}
                  >
                    <div className="text-sm font-medium">{format(dia, "d")}</div>
                    {registro && (
                      <div className="mt-1 text-[11px] leading-tight text-primary font-medium break-words">
                        {registro.igreja_nome || `Igreja #${registro.igreja_id}`}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal adicionar/editar */}
      <Dialog open={showFormModal} onOpenChange={setShowFormModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selecionado ? "Editar registro" : "Novo registro"}</DialogTitle>
            <DialogDescription className="capitalize">
              {dataCulto &&
                format(parseISO(dataCulto), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Igreja</Label>
              <Select value={igrejaId} onValueChange={setIgrejaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a igreja" />
                </SelectTrigger>
                <SelectContent>
                  {igrejas.map((i) => (
                    <SelectItem key={i.id} value={i.id.toString()}>
                      {i.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="obs">Observações (opcional)</Label>
              <Textarea
                id="obs"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex.: Visita pastoral, culto de aniversário..."
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            {selecionado && (
              <Button
                variant="outline"
                className="sm:mr-auto text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remover
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowFormModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Este registro será removido do itinerário. Escalas já geradas não são alteradas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={submitting}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
