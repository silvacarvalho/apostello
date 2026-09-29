"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Church, User, Music, Clock, CheckCircle, XCircle, AlertCircle, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthStore } from "@/stores/auth-store";
import { formatDate, getDayOfWeek } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ItemEscala {
  id: number;
  data_culto: string;
  horario_culto_id: number;
  pregador_id: number;
  cantor_id: number;
  pregador_confirmou: boolean;
  cantor_confirmou: boolean;
  pregador: {
    id: number;
    nome_completo: string;
    foto_url: string | null;
  };
  cantor: {
    id: number;
    nome_completo: string;
    foto_url: string | null;
  };
  horario_culto: {
    id: number;
    dia_semana: string;
    horario: string;
  };
}

interface Escala {
  id: number;
  mes: number;
  ano: number;
  status: string;
  itens: ItemEscala[];
}

const mesesNomes = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const statusBadge: Record<string, { label: string; variant: any }> = {
  RASCUNHO: { label: "Rascunho", variant: "outline" },
  PUBLICADA: { label: "Publicada", variant: "default" },
  EM_ANDAMENTO: { label: "Em Andamento", variant: "secondary" },
  CONCLUIDA: { label: "Concluída", variant: "success" },
};

export default function MinhaIgrejaEscalasPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [escala, setEscala] = useState<Escala | null>(null);
  const [escalasDisponiveis, setEscalasDisponiveis] = useState<{ mes: number; ano: number }[]>([]);
  const [mesSelecionado, setMesSelecionado] = useState<number>(new Date().getMonth() + 1);
  const [anoSelecionado, setAnoSelecionado] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    if (user) {
      fetchEscalasDisponiveis();
    }
  }, [user]);

  useEffect(() => {
    if (user && escalasDisponiveis.length > 0) {
      fetchEscalaMinhaIgreja();
    }
  }, [mesSelecionado, anoSelecionado, escalasDisponiveis]);

  async function fetchEscalasDisponiveis() {
    try {
      const token = useAuthStore.getState().accessToken;
      
      // Buscar todas as escalas do distrito (sem filtro de mês/ano)
      const response = await fetch(
        `/api/escalas`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao carregar escalas disponíveis");
      }

      const data = await response.json();
      
      // A API pode retornar array ou {items: [...], total: ...}
      const escalasData = Array.isArray(data) ? data : (data.items || []);
      
      // Filtrar escalas publicadas e extrair mês/ano únicos
      const escalasPublicadas = escalasData
        .filter((e: Escala) => e.status === "PUBLICADA" || e.status === "EM_ANDAMENTO" || e.status === "CONCLUIDA")
        .map((e: Escala) => ({ mes: e.mes, ano: e.ano }))
        .sort((a: { mes: number; ano: number }, b: { mes: number; ano: number }) => {
          if (a.ano !== b.ano) return b.ano - a.ano;
          return b.mes - a.mes;
        });
      
      setEscalasDisponiveis(escalasPublicadas);
      
      // Se há escalas disponíveis, selecionar a mais recente ou a do mês atual
      if (escalasPublicadas.length > 0) {
        const mesAtual = new Date().getMonth() + 1;
        const anoAtual = new Date().getFullYear();
        
        // Verificar se existe escala do mês atual
        const escalaMesAtual = escalasPublicadas.find(
          (e: { mes: number; ano: number }) => e.mes === mesAtual && e.ano === anoAtual
        );
        
        if (escalaMesAtual) {
          setMesSelecionado(mesAtual);
          setAnoSelecionado(anoAtual);
        } else {
          // Selecionar a primeira (mais recente)
          setMesSelecionado(escalasPublicadas[0].mes);
          setAnoSelecionado(escalasPublicadas[0].ano);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar escalas disponíveis:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchEscalaMinhaIgreja() {
    try {
      setLoading(true);
      
      const token = useAuthStore.getState().accessToken;
      
      // Se usuário tem igreja_id, buscar apenas os itens dessa igreja
      // Se não tem (pregador/cantor), buscar todas as escalas do distrito
      let url = `/api/escalas?mes=${mesSelecionado}&ano=${anoSelecionado}`;
      if (user?.igreja_id) {
        url += `&igreja_id=${user.igreja_id}`;
      }
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Erro ao carregar escala");
      }

      const data = await response.json();
      
      if (data.length > 0) {
        setEscala(data[0]);
      } else {
        setEscala(null);
      }
    } catch (error) {
      console.error("Erro ao carregar escala:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar escala da sua igreja",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleMesChange(value: string) {
    const [mes, ano] = value.split("-").map(Number);
    setMesSelecionado(mes);
    setAnoSelecionado(ano);
  }

  function getConfirmacaoStatus(confirmou: boolean) {
    return confirmou ? (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        <CheckCircle className="w-3 h-3 mr-1" />
        Confirmado
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
        <AlertCircle className="w-3 h-3 mr-1" />
        Pendente
      </Badge>
    );
  }

  function isCultoPassed(dataCulto: string, horarioCulto: string): boolean {
    // Combinar data e horário para comparação completa
    const [hours, minutes] = horarioCulto.split(':').map(Number);
    const cultDateTime = new Date(dataCulto);
    cultDateTime.setHours(hours, minutes, 0, 0);
    
    const now = new Date();
    
    return cultDateTime < now;
  }

  function handleAvaliar(itemId: number) {
    router.push(`/avaliacoes/${itemId}`);
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Church className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Escalas da Minha Igreja</h1>
              <p className="text-muted-foreground">
                Programação dos cultos
              </p>
            </div>
          </div>
          
          {/* Seletor de Mês */}
          {escalasDisponiveis.length > 0 && (
            <Select 
              value={`${mesSelecionado}-${anoSelecionado}`} 
              onValueChange={handleMesChange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent>
                {escalasDisponiveis.map((e) => (
                  <SelectItem key={`${e.mes}-${e.ano}`} value={`${e.mes}-${e.ano}`}>
                    {mesesNomes[e.mes - 1]} de {e.ano}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Escala */}
      {escalasDisponiveis.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <Calendar className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Nenhuma escala disponível</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Não há escalas publicadas para sua igreja. Entre em contato com o pastor
              distrital para mais informações.
            </p>
          </CardContent>
        </Card>
      ) : !escala ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <Calendar className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Nenhuma escala para este mês</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Não há itens de escala para {mesesNomes[mesSelecionado - 1]} de {anoSelecionado}.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Info da Escala */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Escala de {mesesNomes[escala.mes - 1]}</CardTitle>
                  <CardDescription>Programação dos cultos da sua igreja</CardDescription>
                </div>
                <Badge variant={statusBadge[escala.status]?.variant || "outline"}>
                  {statusBadge[escala.status]?.label || escala.status}
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Lista de Cultos */}
          <div className="grid gap-2">
            {escala.itens
              .sort((a, b) => new Date(a.data_culto).getTime() - new Date(b.data_culto).getTime())
              .map((item) => {
                // Corrigir timezone: adicionar T12:00:00 para evitar problemas de fuso horário
                const dataCulto = new Date(item.data_culto.split('T')[0] + 'T12:00:00');
                return (
                <Card key={item.id} className="py-0">
                  <CardContent className="p-2">
                    <div className="flex items-center gap-2">
                      {/* Data compacta */}
                      <div className="h-10 w-10 rounded-md bg-primary/10 flex flex-col items-center justify-center flex-shrink-0">
                        <span className="text-[10px] text-muted-foreground leading-none uppercase">
                          {dataCulto.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}
                        </span>
                        <span className="text-sm font-bold leading-none">
                          {dataCulto.getDate()}
                        </span>
                      </div>

                      {/* Pregador e Cantor lado a lado */}
                      <div className="grid grid-cols-2 gap-2 flex-1 min-w-0">
                      {/* Pregador */}
                      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                        {item.pregador ? (
                          <>
                            <Avatar className="h-8 w-8">
                              <AvatarImage 
                                src={item.pregador.foto_url || undefined} 
                                alt={item.pregador.nome_completo} 
                              />
                              <AvatarFallback className="text-xs">
                                {item.pregador.nome_completo.split(" ").map(n => n[0]).join("").slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                <p className="text-xs font-medium truncate">{item.pregador.nome_completo}</p>
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                {item.pregador_confirmou ? (
                                  <span className="text-[10px] text-green-600 flex items-center gap-0.5">
                                    <CheckCircle className="w-2.5 h-2.5" /> Confirmado
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-yellow-600 flex items-center gap-0.5">
                                    <AlertCircle className="w-2.5 h-2.5" /> Pendente
                                  </span>
                                )}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="w-4 h-4" />
                            <span className="text-xs">Sem pregador</span>
                          </div>
                        )}
                      </div>

                      {/* Cantor */}
                      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                        {item.cantor ? (
                          <>
                            <Avatar className="h-8 w-8">
                              <AvatarImage 
                                src={item.cantor.foto_url || undefined} 
                                alt={item.cantor.nome_completo} 
                              />
                              <AvatarFallback className="text-xs">
                                {item.cantor.nome_completo.split(" ").map(n => n[0]).join("").slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1">
                                <Music className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                <p className="text-xs font-medium truncate">{item.cantor.nome_completo}</p>
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                {item.cantor_confirmou ? (
                                  <span className="text-[10px] text-green-600 flex items-center gap-0.5">
                                    <CheckCircle className="w-2.5 h-2.5" /> Confirmado
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-yellow-600 flex items-center gap-0.5">
                                    <AlertCircle className="w-2.5 h-2.5" /> Pendente
                                  </span>
                                )}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Music className="w-4 h-4" />
                            <span className="text-xs">Sem cantor</span>
                          </div>
                        )}
                      </div>
                      </div>

                      {/* Botão de Avaliação */}
                      {isCultoPassed(item.data_culto, item.horario_culto.horario) && (
                        <Button 
                          onClick={() => handleAvaliar(item.id)}
                          className="h-8 text-xs flex-shrink-0"
                          variant="outline"
                          size="sm"
                        >
                          <Star className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
              })}

            {escala.itens.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Nenhum culto programado ainda</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
