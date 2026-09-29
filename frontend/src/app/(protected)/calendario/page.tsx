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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CalendarIcon className="h-8 w-8" />
            Calendário de Escalas
          </h1>
          <p className="text-muted-foreground">
            Visualização mensal dos cultos e escalas
          </p>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2">
          {podeAlterarDistrito ? (
            <Select value={selectedDistrito} onValueChange={setSelectedDistrito}>
              <SelectTrigger className="w-[180px]">
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
            <div className="px-3 py-2 border rounded-md bg-muted/50 text-sm font-medium">
              {distritos.find(d => String(d.id) === selectedDistrito)?.nome || "Carregando..."}
            </div>
          )}

          <Select value={selectedIgreja} onValueChange={setSelectedIgreja}>
            <SelectTrigger className="w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
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
      </div>

      {/* Calendário */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={irMesAnterior}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-xl min-w-[200px] text-center">
                {format(currentDate, "MMMM yyyy", { locale: ptBR })}
              </CardTitle>
              <Button variant="outline" size="icon" onClick={irProximoMes}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" onClick={irHoje}>
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
          <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b">
            {igrejas.map((igreja) => {
              const cores = coresIgrejas[igreja.id];
              const isSelected = selectedIgreja === String(igreja.id);
              return (
                <Badge
                  key={igreja.id}
                  variant="outline"
                  className={cn(
                    "cursor-pointer transition-all duration-200",
                    cores?.bg, 
                    cores?.border, 
                    cores?.text,
                    isSelected && "ring-2 ring-offset-2 ring-primary scale-105 shadow-md font-bold",
                    !isSelected && "hover:scale-105 hover:shadow-sm opacity-70 hover:opacity-100"
                  )}
                  onClick={() => setSelectedIgreja(isSelected ? "todas" : String(igreja.id))}
                >
                  <Church className="h-3 w-3 mr-1" />
                  {igreja.nome}
                  {isSelected && <span className="ml-1">✓</span>}
                </Badge>
              );
            })}
          </div>

          {/* Grid do Calendário */}
          <div className="grid grid-cols-7 gap-1">
            {/* Cabeçalho dias da semana */}
            {DIAS_SEMANA.map((dia) => (
              <div
                key={dia}
                className="text-center font-semibold py-2 text-sm text-muted-foreground"
              >
                {dia}
              </div>
            ))}

            {/* Células vazias para offset */}
            {Array.from({ length: offsetInicio }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[100px] bg-muted/20 rounded" />
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
                        className={cn(
                          "min-h-[100px] p-1 border rounded cursor-pointer transition-colors",
                          isHoje && "ring-2 ring-primary",
                          temCultos && "hover:bg-accent",
                          !temCultos && "bg-muted/20"
                        )}
                        onClick={() => handleDayClick(dia)}
                      >
                        {/* Número do dia */}
                        <div className={cn(
                          "text-sm font-medium mb-1",
                          isHoje && "text-primary font-bold"
                        )}>
                          {format(dia, "d")}
                        </div>

                        {/* Indicadores de cultos */}
                        <div className="space-y-1">
                          {itensDia.slice(0, 3).map((item) => {
                            const cores = coresIgrejas[item.igreja_id];
                            const mostrarDetalhes = selectedIgreja !== "todas";
                            return (
                              <div
                                key={item.id}
                                className={cn(
                                  "text-xs px-1 py-0.5 rounded truncate border-l-2",
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
                            <div className="text-xs text-muted-foreground text-center">
                              +{itensDia.length - 3} mais
                            </div>
                          )}
                        </div>
                      </div>
                    </TooltipTrigger>
                    {temCultos && (
                      <TooltipContent side="right" className="max-w-[300px]">
                        <div className="space-y-2">
                          <p className="font-semibold">
                            {format(dia, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                          </p>
                          {itensDia.map((item) => (
                            <div key={item.id} className="text-sm">
                              <p className="font-medium">{item.igreja_nome}</p>
                              <p className="text-muted-foreground">
                                {item.horario?.substring(0, 5)} - {item.pregador_nome || "Sem pregador"}
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
            <div className="text-center py-8 text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma escala encontrada para este mês</p>
              <p className="text-sm">Selecione outro mês ou distrito</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes do Dia */}
      <Dialog open={showDayModal} onOpenChange={setShowDayModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {selectedDay && format(selectedDay, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </DialogTitle>
            <DialogDescription>
              {itensDiaSelecionado.length} culto(s) programado(s)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {itensDiaSelecionado.map((item) => {
              const cores = coresIgrejas[item.igreja_id];
              return (
                <Card key={item.id} className={cn("border-l-4", cores?.border)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Church className="h-4 w-4" />
                        <span className="font-semibold">{item.igreja_nome}</span>
                      </div>
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        {item.horario?.substring(0, 5)}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Pregador:</span>
                        <span className={cn(!item.pregador_nome && "text-red-500")}>
                          {item.pregador_nome || "Não definido"}
                        </span>
                        {item.status_confirmacao_pregador && (
                          <Badge variant={item.status_confirmacao_pregador === "CONFIRMADO" ? "default" : "secondary"} className="text-xs">
                            {item.status_confirmacao_pregador === "CONFIRMADO" ? "✓" : "?"}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Music className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Cantor:</span>
                        <span className={cn(!item.cantor_nome && "text-muted-foreground")}>
                          {item.cantor_nome || "Não definido"}
                        </span>
                        {item.status_confirmacao_cantor && (
                          <Badge variant={item.status_confirmacao_cantor === "CONFIRMADO" ? "default" : "secondary"} className="text-xs">
                            {item.status_confirmacao_cantor === "CONFIRMADO" ? "✓" : "?"}
                          </Badge>
                        )}
                      </div>

                      {(item.tema_nome || item.tema_customizado) && (
                        <div className="flex items-center gap-2 pt-2 border-t">
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

          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setShowDayModal(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
