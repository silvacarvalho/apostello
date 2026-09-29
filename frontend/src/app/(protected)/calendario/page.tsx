"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  User,
  Music,
  Church,
  Clock,
  Loader2,
  Filter,
  Eye,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuthStore } from "@/stores/auth-store";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Tipos
interface ItemEscala {
  id: number;
  data_culto: string;
  horario: string;
  igreja_id: number;
  igreja_nome: string;
  pregador_id: number | null;
  pregador_nome: string | null;
  cantor_id: number | null;
  cantor_nome: string | null;
  tema_nome: string | null;
  tema_customizado: string | null;
  status_confirmacao_pregador: string;
  status_confirmacao_cantor: string;
  pastor_presente?: boolean;
  pastor_nome?: string | null;
}

interface Escala {
  id: number;
  mes: number;
  ano: number;
  status: string;
  itens: ItemEscala[];
}

interface Igreja {
  id: number;
  nome: string;
}

interface Distrito {
  id: number;
  nome: string;
}

// Cores para igrejas (paleta de cores distintas)
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

export default function CalendarioPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuthStore();

  // Verificar se pode alterar distrito (apenas Admin)
  const podeAlterarDistrito = user?.tipo === "ADMIN";

  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [escala, setEscala] = useState<Escala | null>(null);
  const [igrejas, setIgrejas] = useState<Igreja[]>([]);
  const [distritos, setDistritos] = useState<Distrito[]>([]);
  const [selectedDistrito, setSelectedDistrito] = useState<string>(
    user?.distrito_id ? String(user.distrito_id) : ""
  );
  const [selectedIgreja, setSelectedIgreja] = useState<string>("todas");
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showDayModal, setShowDayModal] = useState(false);

  // Mapa de cores por igreja
  const coresIgrejas = useMemo(() => {
    const mapa: Record<number, typeof CORES_IGREJAS[0]> = {};
    igrejas.forEach((igreja, index) => {
      mapa[igreja.id] = CORES_IGREJAS[index % CORES_IGREJAS.length];
    });
    return mapa;
  }, [igrejas]);

  // Dias do mês atual
  const diasMes = useMemo(() => {
    const inicio = startOfMonth(currentDate);
    const fim = endOfMonth(currentDate);
    return eachDayOfInterval({ start: inicio, end: fim });
  }, [currentDate]);

  // Offset para alinhar o primeiro dia
  const offsetInicio = useMemo(() => {
    return getDay(startOfMonth(currentDate));
  }, [currentDate]);

  // Carregar dados iniciais (distritos)
  const fetchData = useCallback(async () => {
    try {
      // Buscar distritos para o select
      const distritosRes = await api.get<{ items: Distrito[] }>("/api/v1/distritos/pesquisar?search=&limit=100");
      setDistritos(distritosRes.items || []);

      // Se usuário não tem distrito definido, usar o primeiro da lista
      if (!user?.distrito_id && distritosRes.items?.length > 0 && !selectedDistrito) {
        setSelectedDistrito(String(distritosRes.items[0].id));
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados",
        variant: "destructive",
      });
    }
  }, [user?.distrito_id, selectedDistrito, toast]);

  // Carregar escala do mês
  const fetchEscala = useCallback(async () => {
    if (!selectedDistrito) return;

    try {
      setLoading(true);
      const mes = currentDate.getMonth() + 1;
      const ano = currentDate.getFullYear();

      // Buscar igrejas do distrito
      const igrejasRes = await api.get<{ items: Igreja[] }>(`/api/v1/igrejas/publico/${selectedDistrito}`);
      setIgrejas(igrejasRes.items || []);

      // Buscar escala do mês/ano do distrito
      const escalasRes = await api.get<{ items: Escala[] }>(
        `/api/v1/escalas/?distrito_id=${selectedDistrito}&mes=${mes}&ano=${ano}`
      );
      
      // Pegar a primeira escala retornada (deve ser única para o mês/ano/distrito)
      if (escalasRes.items && escalasRes.items.length > 0) {
        const escalaBase = escalasRes.items[0];
        // Buscar itens detalhados da escala
        const itensRes = await api.get<ItemEscala[]>(`/api/v1/escalas/${escalaBase.id}/itens`);
        setEscala({
          ...escalaBase,
          itens: itensRes || []
        });
      } else {
        setEscala(null);
      }
    } catch (error: unknown) {
      // 404 = escala não existe ainda
      const err = error as { status?: number };
      if (err.status !== 404) {
        console.error("Erro ao carregar escala:", error);
      }
      setEscala(null);
    } finally {
      setLoading(false);
    }
  }, [selectedDistrito, currentDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (selectedDistrito) {
      fetchEscala();
    }
  }, [selectedDistrito, currentDate, fetchEscala]);

  // Navegação de meses
  const irMesAnterior = () => setCurrentDate(subMonths(currentDate, 1));
  const irProximoMes = () => setCurrentDate(addMonths(currentDate, 1));
  const irHoje = () => setCurrentDate(new Date());

  // Filtrar itens por dia
  const getItensDia = (dia: Date) => {
    if (!escala?.itens) return [];

    return escala.itens.filter((item) => {
      const dataItem = parseISO(item.data_culto);
      const mesmodia = isSameDay(dataItem, dia);

      if (!mesmodia) return false;

      // Filtro por igreja
      if (selectedIgreja !== "todas" && item.igreja_id !== parseInt(selectedIgreja)) {
        return false;
      }

      return true;
    });
  };

  // Obter itens do dia selecionado
  const itensDiaSelecionado = selectedDay ? getItensDia(selectedDay) : [];

  // Abrir modal do dia
  const handleDayClick = (dia: Date) => {
    const itens = getItensDia(dia);
    if (itens.length > 0) {
      setSelectedDay(dia);
      setShowDayModal(true);
    }
  };

  if (loading && !escala) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Calendário de Escalas"
        description="Visualização mensal dos cultos e escalas"
        icon={<CalendarIcon className="h-5 w-5" />}
      />

      {/* Filtros */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {podeAlterarDistrito ? (
          <Select value={selectedDistrito} onValueChange={setSelectedDistrito}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Selecione o distrito" />
            </SelectTrigger>
            <SelectContent>
              {distritos.map((distrito) => (
                <SelectItem key={distrito.id} value={String(distrito.id)}>
                  {distrito.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex min-h-11 items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm font-medium shadow-soft">
            <Church className="h-4 w-4 text-muted-foreground" />
            {distritos.find(d => String(d.id) === selectedDistrito)?.nome || "Carregando..."}
          </div>
        )}

        <Select value={selectedIgreja} onValueChange={setSelectedIgreja}>
          <SelectTrigger className="w-full sm:w-[240px]">
            <Filter className="mr-2 h-4 w-4 shrink-0" />
            <SelectValue placeholder="Selecione uma igreja" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as igrejas</SelectItem>
            {igrejas.map((igreja) => (
              <SelectItem key={igreja.id} value={String(igreja.id)}>
                {igreja.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Calendário */}
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center justify-between gap-2 sm:flex-none sm:justify-start sm:gap-3">
              <Button variant="outline" size="icon" onClick={irMesAnterior} aria-label="Mês anterior">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="min-w-0 flex-1 truncate text-center text-lg capitalize sm:min-w-[200px] sm:flex-none sm:text-xl">
                {format(currentDate, "MMMM yyyy", { locale: ptBR })}
              </CardTitle>
              <Button variant="outline" size="icon" onClick={irProximoMes} aria-label="Próximo mês">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="secondary" className="shrink-0" onClick={irHoje}>
              Hoje
            </Button>
          </div>
          {escala && (
            <CardDescription>
              Escala {escala.status === "PUBLICADA" ? "publicada" : "em rascunho"} • {escala.itens?.length || 0} cultos programados
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {/* Legenda de Igrejas */}
          <div className="mb-4 flex flex-wrap gap-2 border-b pb-4">
            {igrejas.map((igreja) => {
              const cores = coresIgrejas[igreja.id];
              const isSelected = selectedIgreja === String(igreja.id);
              return (
                <Badge
                  key={igreja.id}
                  variant="outline"
                  className={cn(
                    "max-w-full cursor-pointer px-2.5 py-1 transition-all duration-200",
                    cores?.bg,
                    cores?.border,
                    cores?.text,
                    isSelected && "font-bold shadow-md ring-2 ring-primary ring-offset-2 ring-offset-card",
                    !isSelected && "opacity-70 hover:opacity-100 hover:shadow-sm"
                  )}
                  onClick={() => setSelectedIgreja(isSelected ? "todas" : String(igreja.id))}
                >
                  <span className={cn("mr-1.5 h-2 w-2 shrink-0 rounded-full sm:hidden", cores?.dot)} />
                  <Church className="mr-1 hidden h-3 w-3 shrink-0 sm:block" />
                  <span className="truncate">{igreja.nome}</span>
                  {isSelected && <span className="ml-1">✓</span>}
                </Badge>
              );
            })}
          </div>

          {/* Grid do Calendário */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {/* Cabeçalho dias da semana */}
            {DIAS_SEMANA.map((dia) => (
              <div
                key={dia}
                className="py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs"
              >
                {dia}
              </div>
            ))}

            {/* Células vazias para offset */}
            {Array.from({ length: offsetInicio }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[56px] rounded-lg bg-muted/20 sm:min-h-[100px]" />
            ))}

            {/* Dias do mês */}
            {diasMes.map((dia) => {
              const itensDia = getItensDia(dia);
              const isHoje = isSameDay(dia, new Date());
              const temCultos = itensDia.length > 0;

              return (
                <TooltipProvider key={dia.toISOString()}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        role={temCultos ? "button" : undefined}
                        className={cn(
                          "min-h-[56px] min-w-0 overflow-hidden rounded-lg border bg-card p-1 transition-colors sm:min-h-[100px] sm:p-1.5",
                          isHoje && "ring-2 ring-primary",
                          temCultos && "cursor-pointer hover:bg-accent active:bg-accent",
                          !temCultos && "bg-muted/20"
                        )}
                        onClick={() => handleDayClick(dia)}
                      >
                        {/* Número do dia */}
                        <div className={cn(
                          "mb-0.5 text-xs font-medium sm:mb-1 sm:text-sm",
                          isHoje && "font-bold text-primary"
                        )}>
                          {format(dia, "d")}
                        </div>

                        {/* Celular: pontos coloridos por igreja */}
                        {temCultos && (
                          <div className="flex flex-wrap items-center gap-0.5 sm:hidden">
                            {itensDia.slice(0, 4).map((item) => (
                              <span
                                key={item.id}
                                className={cn("h-2 w-2 rounded-full", coresIgrejas[item.igreja_id]?.dot || "bg-primary")}
                              />
                            ))}
                            {itensDia.length > 4 && (
                              <span className="text-[9px] leading-none text-muted-foreground">+{itensDia.length - 4}</span>
                            )}
                          </div>
                        )}

                        {/* Desktop: indicadores de cultos */}
                        <div className="hidden space-y-1 sm:block">
                          {itensDia.slice(0, 3).map((item) => {
                            const cores = coresIgrejas[item.igreja_id];
                            const mostrarDetalhes = selectedIgreja !== "todas";
                            return (
                              <div
                                key={item.id}
                                className={cn(
                                  "truncate rounded border-l-2 px-1 py-0.5 text-xs",
                                  cores?.bg,
                                  cores?.border,
                                  cores?.text
                                )}
                              >
                                <span className="font-medium">
                                  {item.horario?.substring(0, 5)}
                                </span>
                                {mostrarDetalhes && (
                                  <div className="mt-0.5 space-y-0.5">
                                    {item.pregador_nome && (
                                      <div className="flex items-center gap-1 truncate">
                                        <User className="h-3 w-3 flex-shrink-0" />
                                        <span className="truncate">{item.pregador_nome.split(' ')[0]}</span>
                                      </div>
                                    )}
                                    {item.cantor_nome && (
                                      <div className="flex items-center gap-1 truncate">
                                        <Music className="h-3 w-3 flex-shrink-0" />
                                        <span className="truncate">{item.cantor_nome.split(' ')[0]}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {itensDia.length > 3 && (
                            <div className="text-center text-xs text-muted-foreground">
                              +{itensDia.length - 3} mais
                            </div>
                          )}
                        </div>
                      </div>
                    </TooltipTrigger>
                    {temCultos && (
                      <TooltipContent side="right" className="hidden max-w-[300px] sm:block">
                        <div className="space-y-2">
                          <p className="font-semibold">
                            {format(dia, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                          </p>
                          {itensDia.map((item) => (
                            <div key={item.id} className="text-sm">
                              <p className="font-medium">{item.igreja_nome}</p>
                              <p className="text-muted-foreground">
                                {item.horario?.substring(0, 5)} - {item.pregador_nome || (item.pastor_presente ? `Pastor presente${item.pastor_nome ? `: ${item.pastor_nome}` : ""}` : "Sem pregador")}
                              </p>
                            </div>
                          ))}
                        </div>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>

          {!escala && (
            <EmptyState
              className="mt-4"
              icon={<CalendarIcon className="h-6 w-6" />}
              title="Nenhuma escala encontrada para este mês"
              description="Selecione outro mês ou distrito"
            />
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes do Dia */}
      <Dialog open={showDayModal} onOpenChange={setShowDayModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2 pr-6 sm:justify-start first-letter:uppercase">
              <CalendarIcon className="h-5 w-5 shrink-0" />
              {selectedDay && format(selectedDay, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </DialogTitle>
            <DialogDescription>
              {itensDiaSelecionado.length} culto(s) programado(s)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 sm:max-h-[400px] sm:overflow-y-auto">
            {itensDiaSelecionado.map((item) => {
              const cores = coresIgrejas[item.igreja_id];
              return (
                <Card key={item.id} className={cn("border-l-4", cores?.border)}>
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <Church className="h-4 w-4 shrink-0" />
                        <span className="truncate font-semibold">{item.igreja_nome}</span>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        <Clock className="mr-1 h-3 w-3" />
                        {item.horario?.substring(0, 5)}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Pregador:</span>
                        {item.pastor_presente && !item.pregador_nome ? (
                          <span className="font-medium text-amber-600 dark:text-amber-400">
                            Pastor presente{item.pastor_nome ? `: ${item.pastor_nome}` : ""}
                          </span>
                        ) : (
                          <span className={cn(!item.pregador_nome && "text-destructive")}>
                            {item.pregador_nome || "Não definido"}
                          </span>
                        )}
                        {item.status_confirmacao_pregador && (
                          <Badge variant={item.status_confirmacao_pregador === "CONFIRMADO" ? "success" : "secondary"} className="text-xs">
                            {item.status_confirmacao_pregador === "CONFIRMADO" ? "✓" : "?"}
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <Music className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Cantor:</span>
                        <span className={cn(!item.cantor_nome && "text-muted-foreground")}>
                          {item.cantor_nome || "Não definido"}
                        </span>
                        {item.status_confirmacao_cantor && (
                          <Badge variant={item.status_confirmacao_cantor === "CONFIRMADO" ? "success" : "secondary"} className="text-xs">
                            {item.status_confirmacao_cantor === "CONFIRMADO" ? "✓" : "?"}
                          </Badge>
                        )}
                      </div>

                      {(item.tema_nome || item.tema_customizado) && (
                        <div className="flex flex-wrap items-center gap-2 border-t pt-2">
                          <span className="text-muted-foreground">Tema:</span>
                          <span>{item.tema_nome || item.tema_customizado}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex justify-end">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setShowDayModal(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
