"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Church,
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
import { Badge } from "@/components/ui/badge";
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

// Mesma paleta de cores por igreja usada na tela do Calendário
const CORES_IGREJAS = [
  { bg: "bg-blue-100 dark:bg-blue-900/30", border: "border-blue-500", text: "text-blue-700 dark:text-blue-300" },
  { bg: "bg-green-100 dark:bg-green-900/30", border: "border-green-500", text: "text-green-700 dark:text-green-300" },
  { bg: "bg-purple-100 dark:bg-purple-900/30", border: "border-purple-500", text: "text-purple-700 dark:text-purple-300" },
  { bg: "bg-orange-100 dark:bg-orange-900/30", border: "border-orange-500", text: "text-orange-700 dark:text-orange-300" },
  { bg: "bg-pink-100 dark:bg-pink-900/30", border: "border-pink-500", text: "text-pink-700 dark:text-pink-300" },
  { bg: "bg-teal-100 dark:bg-teal-900/30", border: "border-teal-500", text: "text-teal-700 dark:text-teal-300" },
  { bg: "bg-yellow-100 dark:bg-yellow-900/30", border: "border-yellow-500", text: "text-yellow-700 dark:text-yellow-300" },
  { bg: "bg-red-100 dark:bg-red-900/30", border: "border-red-500", text: "text-red-700 dark:text-red-300" },
  { bg: "bg-indigo-100 dark:bg-indigo-900/30", border: "border-indigo-500", text: "text-indigo-700 dark:text-indigo-300" },
  { bg: "bg-cyan-100 dark:bg-cyan-900/30", border: "border-cyan-500", text: "text-cyan-700 dark:text-cyan-300" },
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <CalendarIcon className="h-8 w-8" />
          Itinerário do Pastor
        </h1>
        <p className="text-muted-foreground">
          Arraste uma igreja até o dia em que você estará presente
        </p>
      </div>

      {/* Aviso */}
      <div className="flex items-start gap-3 p-4 rounded-lg border bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Como funciona:</strong> nas datas registradas aqui, a escala gerada{" "}
          <strong>não sorteia pregador</strong> para aquela igreja, pois o pastor já estará
          presente. Cadastre o itinerário <strong>antes</strong> de gerar a escala do mês.
        </div>
      </div>

      {/* Calendário */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                aria-label="Mês anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-xl min-w-[200px] text-center">
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
            <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
              Hoje
            </Button>
          </div>
          <CardDescription>{itens.length} dia(s) no itinerário deste mês</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Igrejas para arrastar */}
          <div className="mb-4 pb-4 border-b">
            <p className="text-xs text-muted-foreground mb-2">
              Arraste uma igreja para um dia do calendário (ou clique no dia):
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
                      "cursor-grab active:cursor-grabbing select-none py-1 px-2 transition-all hover:scale-105 hover:shadow-sm",
                      cores?.bg,
                      cores?.border,
                      cores?.text,
                      igrejaArrastada === igreja.id && "opacity-50"
                    )}
                  >
                    <GripVertical className="h-3 w-3 mr-1" />
                    <Church className="h-3 w-3 mr-1" />
                    {igreja.nome}
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
            <div className="grid grid-cols-7 gap-1">
              {DIAS_SEMANA.map((dia) => (
                <div
                  key={dia}
                  className="text-center font-semibold py-2 text-sm text-muted-foreground"
                >
                  {dia}
                </div>
              ))}

              {Array.from({ length: offsetInicio }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[100px] bg-muted/20 rounded" />
              ))}

              {diasMes.map((dia) => {
                const iso = format(dia, "yyyy-MM-dd");
                const registro = getRegistroDia(dia);
                const cores = registro ? coresIgrejas[registro.igreja_id] : undefined;
                const isHoje = isSameDay(dia, new Date());
                const isAlvo = diaAlvo === iso;

                return (
                  <div
                    key={iso}
                    onClick={() => abrirModalDia(dia)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (diaAlvo !== iso) setDiaAlvo(iso);
                    }}
                    onDragLeave={() => setDiaAlvo((atual) => (atual === iso ? null : atual))}
                    onDrop={(e) => handleDrop(e, dia)}
                    className={cn(
                      "min-h-[100px] p-1 border rounded cursor-pointer transition-colors hover:bg-accent",
                      isHoje && "ring-2 ring-primary",
                      !registro && "bg-muted/20",
                      isAlvo && "bg-primary/10 border-primary border-dashed border-2"
                    )}
                  >
                    <div
                      className={cn(
                        "text-sm font-medium mb-1",
                        isHoje && "text-primary font-bold"
                      )}
                    >
                      {format(dia, "d")}
                    </div>

                    {registro && (
                      <div
                        className={cn(
                          "text-xs px-1 py-0.5 rounded border-l-2",
                          cores?.bg,
                          cores?.border,
                          cores?.text
                        )}
                      >
                        <div className="flex items-center gap-1 font-medium truncate">
                          <Church className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">
                            {registro.igreja_nome || `Igreja #${registro.igreja_id}`}
                          </span>
                        </div>
                        {registro.observacoes && (
                          <div className="mt-0.5 opacity-80 line-clamp-2 break-words">
                            {registro.observacoes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
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
