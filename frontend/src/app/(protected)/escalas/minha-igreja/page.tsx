"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Church, User, Music, CheckCircle, AlertCircle, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
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
  pastor_presente?: boolean;
  pastor_nome?: string | null;
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
  PUBLICADA: { label: "Publicada", variant: "success" },
  EM_ANDAMENTO: { label: "Em Andamento", variant: "secondary" },
  CONCLUIDA: { label: "Concluída", variant: "secondary" },
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

  function renderPessoa(
    pessoa: { nome_completo: string; foto_url: string | null } | null | undefined,
    confirmou: boolean,
    tipo: "pregador" | "cantor",
    pastor?: { presente?: boolean; nome?: string | null }
  ) {
    const Icone = tipo === "pregador" ? User : Music;
    return (
      <div className="flex min-w-0 items-center gap-3 rounded-xl bg-muted/50 p-2.5">
        {pessoa ? (
          <>
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={pessoa.foto_url || undefined} alt={pessoa.nome_completo} />
              <AvatarFallback className="text-xs">
                {pessoa.nome_completo.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <Icone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <p className="truncate text-sm font-medium">{pessoa.nome_completo}</p>
              </div>
              {confirmou ? (
                <span className="mt-0.5 flex items-center gap-1 text-xs text-success">
                  <CheckCircle className="h-3 w-3" /> Confirmado
                </span>
              ) : (
                <span className="mt-0.5 flex items-center gap-1 text-xs text-warning">
                  <AlertCircle className="h-3 w-3" /> Pendente
                </span>
              )}
            </div>
          </>
        ) : pastor?.presente ? (
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <User className="h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <span className="block text-sm font-medium">Pastor presente</span>
              {pastor.nome && <span className="block truncate text-xs">{pastor.nome}</span>}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Icone className="h-4 w-4 shrink-0" />
            <span className="text-sm">{tipo === "pregador" ? "Sem pregador" : "Sem cantor"}</span>
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Escalas da Minha Igreja"
        description="Programação dos cultos"
        icon={<Church className="h-5 w-5" />}
        actions={
          escalasDisponiveis.length > 0 ? (
            <Select
              value={`${mesSelecionado}-${anoSelecionado}`}
              onValueChange={handleMesChange}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
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
          ) : undefined
        }
      />

      {/* Escala */}
      {escalasDisponiveis.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-7 w-7" />}
          title="Nenhuma escala disponível"
          description="Não há escalas publicadas para sua igreja. Entre em contato com o pastor distrital para mais informações."
        />
      ) : !escala ? (
        <EmptyState
          icon={<Calendar className="h-7 w-7" />}
          title="Nenhuma escala para este mês"
          description={`Não há itens de escala para ${mesesNomes[mesSelecionado - 1]} de ${anoSelecionado}.`}
        />
      ) : (
        <div className="space-y-4">
          {/* Info da Escala */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle>Escala de {mesesNomes[escala.mes - 1]}</CardTitle>
                  <CardDescription>Programação dos cultos da sua igreja</CardDescription>
                </div>
                <Badge className="shrink-0" variant={statusBadge[escala.status]?.variant || "outline"}>
                  {statusBadge[escala.status]?.label || escala.status}
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Lista de Cultos */}
          <div className="grid gap-3">
            {escala.itens
              .sort((a, b) => new Date(a.data_culto).getTime() - new Date(b.data_culto).getTime())
              .map((item) => {
                // Corrigir timezone: adicionar T12:00:00 para evitar problemas de fuso horário
                const dataCulto = new Date(item.data_culto.split('T')[0] + 'T12:00:00');
                return (
                  <Card key={item.id} className="p-3 sm:p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center">
                      {/* Data */}
                      <div className="flex items-center gap-3 md:w-40 md:shrink-0">
                        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-accent text-accent-foreground">
                          <span className="text-[10px] uppercase leading-none">
                            {dataCulto.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}
                          </span>
                          <span className="mt-0.5 text-lg font-bold leading-none">
                            {dataCulto.getDate()}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold capitalize">
                            {dataCulto.toLocaleDateString("pt-BR", { month: "long" })}
                          </p>
                          <p className="text-xs text-muted-foreground">{item.horario_culto?.horario}</p>
                        </div>
                        {isCultoPassed(item.data_culto, item.horario_culto.horario) && (
                          <Button
                            onClick={() => handleAvaliar(item.id)}
                            className="shrink-0 md:hidden"
                            variant="secondary"
                            size="sm"
                          >
                            <Star className="mr-1.5 h-4 w-4" />
                            Avaliar
                          </Button>
                        )}
                      </div>

                      {/* Pregador e Cantor */}
                      <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                        {renderPessoa(item.pregador, item.pregador_confirmou, "pregador", {
                          presente: item.pastor_presente,
                          nome: item.pastor_nome,
                        })}
                        {renderPessoa(item.cantor, item.cantor_confirmou, "cantor")}
                      </div>

                      {/* Botão de Avaliação (desktop) */}
                      {isCultoPassed(item.data_culto, item.horario_culto.horario) && (
                        <Button
                          onClick={() => handleAvaliar(item.id)}
                          className="hidden shrink-0 md:inline-flex"
                          variant="outline"
                          size="sm"
                        >
                          <Star className="mr-1.5 h-4 w-4" />
                          Avaliar
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}

            {escala.itens.length === 0 && (
              <EmptyState
                icon={<Calendar className="h-6 w-6" />}
                title="Nenhum culto programado ainda"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
