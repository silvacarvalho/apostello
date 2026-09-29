"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Church,
  Check,
  GripVertical,
  Info,
  Loader2,
  Trash2,
} from "lucide-react";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

// Mesma paleta de cores por igreja usada na tela do Calendário
const CORES_IGREJAS = [
  { bg: "bg-blue-500/10 dark:bg-blue-400/15", border: "border-blue-500", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500" },
  { bg: "bg-green-500/10 dark:bg-green-400/15", border: "border-green-500", text: "text-green-700 dark:text-green-300", dot: "bg-green-500" },
  { bg: "bg-purple-500/10 dark:bg-purple-400/15", border: "border-purple-500", text: "text-purple-700 dark:text-purple-300", dot: "bg-purple-500" },
  { bg: "bg-orange-500/10 dark:bg-orange-400/15", border: "border-orange-500", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-500" },
  { bg: "bg-pink-500/10 dark:bg-pink-400/15", border: "border-pink-500", text: "text-pink-700 dark:text-pink-300", dot: "bg-pink-500" },
  { bg: "bg-teal-500/10 dark:bg-teal-400/15", border: "border-teal-500", text: "text-teal-700 dark:text-teal-300", dot: "bg-teal-500" },
  { bg: "bg-yellow-500/10 dark:bg-yellow-400/15", border: "border-yellow-500", text: "text-yellow-700 dark:text-yellow-300", dot: "bg-yellow-500" },
  { bg: "bg-red-500/10 dark:bg-red-400/15", border: "border-red-500", text: "text-red-700 dark:text-red-300", dot: "bg-red-500" },
  { bg: "bg-indigo-500/10 dark:bg-indigo-400/15", border: "border-indigo-500", text: "text-indigo-700 dark:text-indigo-300", dot: "bg-indigo-500" },
  { bg: "bg-cyan-500/10 dark:bg-cyan-400/15", border: "border-cyan-500", text: "text-cyan-700 dark:text-cyan-300", dot: "bg-cyan-500" },
];

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

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
  const [currentDate, setCurrentDate] = useState(new Date());

  // Arrastar e soltar
  const [igrejaArrastada, setIgrejaArrastada] = useState<number | null>(null);
  const [diaAlvo, setDiaAlvo] = useState<string | null>(null);

  // Modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selecionado, setSelecionado] = useState<ItinerarioItem | null>(null);
  const [igrejaId, setIgrejaId] = useState<string>("");
  const [dataCulto, setDataCulto] = useState<string>("");
  const [observacoes, setObservacoes] = useState<string>("");

  // Cor de cada igreja (mesma lógica do Calendário)
  const coresIgrejas = useMemo(() => {
    const mapa: Record<number, (typeof CORES_IGREJAS)[0]> = {};
    igrejas.forEach((igreja, index) => {
      mapa[igreja.id] = CORES_IGREJAS[index % CORES_IGREJAS.length];
    });
    return mapa;
  }, [igrejas]);

  const diasMes = useMemo(
    () => eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) }),
    [currentDate]
  );
  const offsetInicio = useMemo(() => getDay(startOfMonth(currentDate)), [currentDate]);

  const fetchItens = useCallback(async () => {
    if (!canAccess) return;
    try {
      setLoading(true);
      const response = await api.get<{ itinerarios: ItinerarioItem[]; total: number }>(
        `/api/v1/itinerarios/?mes=${currentDate.getMonth() + 1}&ano=${currentDate.getFullYear()}`
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
  }, [canAccess, currentDate, toast]);

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

  const getRegistroDia = (dia: Date) =>
    itens.find((i) => isSameDay(parseISO(i.data_culto), dia)) || null;

  const resetForm = () => {
    setIgrejaId("");
    setDataCulto("");
    setObservacoes("");
    setSelecionado(null);
  };

  // Abre o modal para um dia. Se veio de um arraste, já traz a igreja escolhida.
  const abrirModalDia = (dia: Date, igrejaSugerida?: number) => {
    const existente = getRegistroDia(dia);
    setSelecionado(existente);
    setDataCulto(format(dia, "yyyy-MM-dd"));
    setIgrejaId(
      igrejaSugerida
        ? igrejaSugerida.toString()
        : existente
          ? existente.igreja_id.toString()
          : ""
    );
    setObservacoes(existente?.observacoes || "");
    setShowFormModal(true);
  };

  const handleDrop = (e: React.DragEvent, dia: Date) => {
    e.preventDefault();
    const id = igrejaArrastada ?? parseInt(e.dataTransfer.getData("text/plain"));
    setDiaAlvo(null);
    setIgrejaArrastada(null);
    if (!id) return;
    abrirModalDia(dia, id);
  };

  const handleSave = async () => {
    if (!igrejaId || !dataCulto) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione a igreja",
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

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Itinerário do Pastor"
        description="Toque em um dia para escolher a igreja onde você estará presente"
        icon={<CalendarIcon className="h-5 w-5" />}
      />

      {/* Aviso */}
      <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-accent p-3 sm:p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-accent-foreground" />
        <div className="text-xs text-accent-foreground sm:text-sm">
          <strong>Como funciona:</strong> nas datas registradas aqui, a escala gerada{" "}
          <strong>não sorteia pregador</strong> para aquela igreja, pois o pastor já estará
          presente. Cadastre o itinerário <strong>antes</strong> de gerar a escala do mês.
        </div>
      </div>

      {/* Calendário */}
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center justify-between gap-2 sm:flex-none sm:justify-start sm:gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                aria-label="Mês anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="min-w-0 flex-1 truncate text-center text-lg capitalize sm:min-w-[200px] sm:flex-none sm:text-xl">
                {format(currentDate, "MMMM yyyy", { locale: ptBR })}
              </CardTitle>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                aria-label="Próximo mês"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="secondary" className="shrink-0" onClick={() => setCurrentDate(new Date())}>
              Hoje
            </Button>
          </div>
          <CardDescription>{itens.length} dia(s) no itinerário deste mês</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Legenda das igrejas (arrastáveis no desktop) */}
          <div className="mb-4 border-b pb-4">
            <p className="mb-2 text-xs text-muted-foreground">
              <span className="hidden sm:inline">Arraste uma igreja para um dia do calendário ou </span>
              <span className="sm:hidden">Legenda de cores. </span>
              <span className="hidden sm:inline">clique no dia.</span>
              <span className="sm:hidden">Toque no dia para escolher a igreja.</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {igrejas.map((igreja) => {
                const cores = coresIgrejas[igreja.id];
                return (
                  <Badge
                    key={igreja.id}
                    variant="outline"
                    draggable
                    onDragStart={(e) => {
                      setIgrejaArrastada(igreja.id);
                      e.dataTransfer.setData("text/plain", String(igreja.id));
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => {
                      setIgrejaArrastada(null);
                      setDiaAlvo(null);
                    }}
                    className={cn(
                      "max-w-full select-none px-2.5 py-1 transition-all sm:cursor-grab sm:active:cursor-grabbing sm:hover:shadow-sm",
                      cores?.bg,
                      cores?.border,
                      cores?.text,
                      igrejaArrastada === igreja.id && "opacity-50"
                    )}
                  >
                    <GripVertical className="mr-1 hidden h-3 w-3 sm:block" />
                    <span className={cn("mr-1.5 h-2 w-2 shrink-0 rounded-full sm:hidden", cores?.dot)} />
                    <Church className="mr-1 hidden h-3 w-3 shrink-0 sm:block" />
                    <span className="truncate">{igreja.nome}</span>
                  </Badge>
                );
              })}
              {igrejas.length === 0 && (
                <span className="text-sm text-muted-foreground">Nenhuma igreja encontrada</span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {DIAS_SEMANA.map((dia) => (
                <div
                  key={dia}
                  className="py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs"
                >
                  {dia}
                </div>
              ))}

              {Array.from({ length: offsetInicio }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[56px] rounded-lg bg-muted/20 sm:min-h-[100px]" />
              ))}

              {diasMes.map((dia) => {
                const iso = format(dia, "yyyy-MM-dd");
                const registro = getRegistroDia(dia);
                const cores = registro ? coresIgrejas[registro.igreja_id] : undefined;
                const isHoje = isSameDay(dia, new Date());
                const isAlvo = diaAlvo === iso;
                const nomeIgreja = registro
                  ? registro.igreja_nome || `Igreja #${registro.igreja_id}`
                  : "";

                return (
                  <button
                    type="button"
                    key={iso}
                    onClick={() => abrirModalDia(dia)}
                    aria-label={`${format(dia, "d 'de' MMMM", { locale: ptBR })}${nomeIgreja ? ` - ${nomeIgreja}` : ""}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (diaAlvo !== iso) setDiaAlvo(iso);
                    }}
                    onDragLeave={() => setDiaAlvo((atual) => (atual === iso ? null : atual))}
                    onDrop={(e) => handleDrop(e, dia)}
                    className={cn(
                      "flex min-h-[56px] min-w-0 flex-col items-stretch overflow-hidden rounded-lg border bg-card p-1 text-left transition-colors hover:bg-accent active:bg-accent sm:min-h-[100px] sm:p-1.5",
                      isHoje && "ring-2 ring-primary",
                      !registro && "bg-muted/20",
                      isAlvo && "border-2 border-dashed border-primary bg-primary/10"
                    )}
                  >
                    <div
                      className={cn(
                        "mb-0.5 text-xs font-medium sm:mb-1 sm:text-sm",
                        isHoje && "font-bold text-primary"
                      )}
                    >
                      {format(dia, "d")}
                    </div>

                    {registro && (
                      <>
                        {/* Celular: ponto colorido + nome abreviado */}
                        <div className="flex min-w-0 flex-col items-start gap-0.5 sm:hidden">
                          <span className={cn("h-2 w-2 rounded-full", cores?.dot)} />
                          <span className={cn("w-full truncate text-[10px] font-medium leading-tight", cores?.text)}>
                            {nomeIgreja.replace(/^Igreja\s+/i, "")}
                          </span>
                        </div>
                        {/* Desktop: etiqueta completa */}
                        <div
                          className={cn(
                            "hidden rounded border-l-2 px-1 py-0.5 text-xs sm:block",
                            cores?.bg,
                            cores?.border,
                            cores?.text
                          )}
                        >
                          <div className="flex items-center gap-1 truncate font-medium">
                            <Church className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{nomeIgreja}</span>
                          </div>
                          {registro.observacoes && (
                            <div className="mt-0.5 line-clamp-2 break-words opacity-80">
                              {registro.observacoes}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: igreja + observação do dia */}
      <Dialog open={showFormModal} onOpenChange={setShowFormModal}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{selecionado ? "Editar itinerário" : "Novo itinerário"}</DialogTitle>
            <DialogDescription className="first-letter:uppercase">
              {dataCulto &&
                format(parseISO(dataCulto), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Em qual igreja você estará?</Label>
              {igrejas.length === 0 ? (
                <EmptyState
                  icon={<Church className="h-6 w-6" />}
                  title="Nenhuma igreja encontrada"
                  className="py-6"
                />
              ) : (
                <div
                  role="radiogroup"
                  aria-label="Igreja"
                  className="grid max-h-[40vh] gap-2 overflow-y-auto pr-1 sm:max-h-64"
                >
                  {igrejas.map((i) => {
                    const cores = coresIgrejas[i.id];
                    const ativo = igrejaId === i.id.toString();
                    return (
                      <button
                        type="button"
                        role="radio"
                        aria-checked={ativo}
                        key={i.id}
                        onClick={() => setIgrejaId(i.id.toString())}
                        className={cn(
                          "flex min-h-[48px] items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm font-medium transition-colors",
                          ativo
                            ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                            : "bg-card hover:bg-accent"
                        )}
                      >
                        <span className={cn("h-3 w-3 shrink-0 rounded-full", cores?.dot)} />
                        <span className="min-w-0 flex-1 truncate">{i.nome}</span>
                        {ativo && <Check className="h-4 w-4 shrink-0 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="obs">Observação (opcional)</Label>
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
                className="text-destructive sm:mr-auto"
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
              Este dia será removido do itinerário. Escalas já geradas não são alteradas.
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
