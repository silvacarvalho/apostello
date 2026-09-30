"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarX,
  ChevronLeft,
  ChevronRight,
  Church,
  Clock,
  Loader2,
  MapPin,
  Mic2,
  Music,
  RefreshCw,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

interface Culto {
  data_culto: string;
  dia_semana: string;
  horario: string;
  igreja_id: number;
  igreja_nome: string;
  pregador_nome: string | null;
  pastor_presente: boolean;
  pastor_nome: string | null;
  cantor_nome: string | null;
  tema: string | null;
}

interface IgrejaInfo {
  id: number;
  nome: string;
  endereco: string | null;
}

interface Grupo {
  igreja: IgrejaInfo;
  cultos: Culto[];
}

interface Resposta {
  titulo: string;
  subtitulo?: string;
  disponivel: boolean;
  grupos: Grupo[];
}

interface Props {
  /** "igreja" mostra uma igreja; "distrito" mostra todas as igrejas do distrito */
  tipo: "igreja" | "distrito";
  id: number;
}

function parseMesAno(searchParams: URLSearchParams) {
  const hoje = new Date();
  const mes = parseInt(searchParams.get("mes") || "", 10);
  const ano = parseInt(searchParams.get("ano") || "", 10);
  return {
    mes: mes >= 1 && mes <= 12 ? mes : hoje.getMonth() + 1,
    ano: ano >= 2024 && ano <= 2100 ? ano : hoje.getFullYear(),
  };
}

function CultoCard({ culto }: { culto: Culto }) {
  const [ano, mes, dia] = culto.data_culto.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const passou = data < hoje;
  const ehHoje = data.getTime() === hoje.getTime();

  return (
    <Card className={cn(passou && "opacity-60", ehHoje && "ring-2 ring-primary/60")}>
      <CardContent className="flex gap-3 p-3 sm:p-4">
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <span className="text-[10px] font-semibold uppercase leading-none tracking-wide">
            {culto.dia_semana.slice(0, 3)}
          </span>
          <span className="text-xl font-bold leading-tight">{dia}</span>
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              {culto.horario}
            </Badge>
            {ehHoje && <Badge>Hoje</Badge>}
          </div>

          <div className="flex items-start gap-2 text-sm">
            <Mic2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <span className="text-xs text-muted-foreground">Pregação</span>
              {culto.pregador_nome ? (
                <p className="font-medium">{culto.pregador_nome}</p>
              ) : culto.pastor_presente ? (
                <p className="font-medium text-warning">
                  Pastor presente{culto.pastor_nome ? `: ${culto.pastor_nome}` : ""}
                </p>
              ) : (
                <p className="text-muted-foreground">A definir</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2 text-sm">
            <Music className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <span className="text-xs text-muted-foreground">Louvor especial</span>
              <p className={cn("font-medium", !culto.cantor_nome && "font-normal text-muted-foreground")}>
                {culto.cantor_nome || "A definir"}
              </p>
            </div>
          </div>

          {culto.tema && (
            <p className="pt-0.5 text-xs text-muted-foreground">
              Tema: <span className="font-medium text-foreground">{culto.tema}</span>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function PublicSchedule({ tipo, id }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mes, ano } = useMemo(() => parseMesAno(searchParams), [searchParams]);

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [dados, setDados] = useState<Resposta | null>(null);
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const url =
        tipo === "igreja"
          ? `${API_URL}/api/v1/publico/igrejas/${id}/escala?mes=${mes}&ano=${ano}`
          : `${API_URL}/api/v1/publico/distritos/${id}/escalas?mes=${mes}&ano=${ano}`;
      const resp = await fetch(url);
      if (resp.status === 404) {
        setErro("Escala não encontrada. Confira o QR Code.");
        setDados(null);
        return;
      }
      if (!resp.ok) throw new Error("Falha ao carregar");
      const json = await resp.json();

      if (tipo === "igreja") {
        setDados({
          titulo: json.igreja.nome,
          subtitulo: json.distrito_nome,
          disponivel: json.disponivel,
          grupos: [{ igreja: json.igreja, cultos: json.cultos }],
        });
      } else {
        setDados({
          titulo: "Todas as igrejas",
          subtitulo: json.distrito_nome,
          disponivel: json.disponivel,
          grupos: json.igrejas,
        });
      }
      setAtualizadoEm(new Date());
    } catch {
      setErro("Não foi possível carregar a escala. Verifique sua conexão e tente novamente.");
      setDados(null);
    } finally {
      setLoading(false);
    }
  }, [tipo, id, mes, ano]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const irParaMes = (delta: number) => {
    const d = new Date(ano, mes - 1 + delta, 1);
    const params = new URLSearchParams(searchParams.toString());
    params.set("mes", String(d.getMonth() + 1));
    params.set("ano", String(d.getFullYear()));
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-5">
      {/* Título */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {tipo === "igreja" ? <Church className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
          {dados?.subtitulo || (tipo === "igreja" ? "Igreja" : "Distrito")}
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {dados?.titulo || (loading ? "Carregando…" : "Escala")}
        </h1>
        {tipo === "igreja" && dados?.grupos[0]?.igreja.endereco && (
          <p className="text-sm text-muted-foreground">{dados.grupos[0].igreja.endereco}</p>
        )}
      </div>

      {/* Navegação de mês */}
      <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-card p-1.5 shadow-soft">
        <Button variant="ghost" size="icon" onClick={() => irParaMes(-1)} aria-label="Mês anterior">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-base font-semibold first-letter:uppercase">
          {MESES[mes - 1]} de {ano}
        </span>
        <Button variant="ghost" size="icon" onClick={() => irParaMes(1)} aria-label="Próximo mês">
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Carregando a escala…</p>
        </div>
      ) : erro ? (
        <EmptyState
          icon={<CalendarX className="h-7 w-7" />}
          title={erro}
          action={
            <Button variant="outline" onClick={carregar}>
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Button>
          }
        />
      ) : !dados?.disponivel ? (
        <EmptyState
          icon={<CalendarX className="h-7 w-7" />}
          title="Escala ainda não publicada"
          description="A escala deste mês ainda não está disponível. Volte mais tarde ou escolha outro mês."
        />
      ) : (
        <div className="space-y-6">
          {dados.grupos.map((grupo) => (
            <section key={grupo.igreja.id} className="space-y-3">
              {tipo === "distrito" && (
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <Church className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold leading-tight">{grupo.igreja.nome}</h2>
                    {grupo.igreja.endereco && (
                      <p className="truncate text-xs text-muted-foreground">{grupo.igreja.endereco}</p>
                    )}
                  </div>
                </div>
              )}
              <div className="space-y-2.5">
                {grupo.cultos.map((culto) => (
                  <CultoCard key={`${culto.igreja_id}-${culto.data_culto}-${culto.horario}`} culto={culto} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Rodapé */}
      {atualizadoEm && !loading && !erro && (
        <p className="pt-2 text-center text-xs text-muted-foreground">
          Atualizado em {atualizadoEm.toLocaleDateString("pt-BR")} às{" "}
          {atualizadoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
    </div>
  );
}
