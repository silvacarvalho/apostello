"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, CheckCircle, ArrowLeft, Send, User, Music } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/auth-store";

interface AvaliadoInfo {
  id: number;
  nome_completo: string;
  foto_perfil: string | null;
  tipo: "PREGADOR" | "CANTOR";
}

interface ItemPendente {
  item_id: number;
  escala_id: number;
  data_culto: string;
  igreja_id: number;
  igreja_nome: string;
  pregador: AvaliadoInfo | null;
  cantor: AvaliadoInfo | null;
}

interface AvaliacaoData {
  item_escala_id: number;
  avaliado_id: number;
  tipo: "PREGADOR" | "CANTOR";
  criterio_1: number;
  criterio_2: number;
  criterio_3: number;
  criterio_4: number;
  criterio_5: number;
  confirmou_identidade: boolean;
  comentario: string;
}

const criteriosPregador = [
  { key: "criterio_1", label: "Conteúdo Bíblico", desc: "Mensagem fundamentada na Palavra" },
  { key: "criterio_2", label: "Comunicação", desc: "Clareza na transmissão da mensagem" },
  { key: "criterio_3", label: "Tempo/Organização", desc: "Respeitou o tempo e foi organizado" },
  { key: "criterio_4", label: "Impacto Espiritual", desc: "Mensagem tocou corações" },
  { key: "criterio_5", label: "Avaliação Geral", desc: "Avaliação geral do desempenho" },
];

const criteriosCantor = [
  { key: "criterio_1", label: "Técnica Vocal", desc: "Qualidade técnica da voz" },
  { key: "criterio_2", label: "Interpretação", desc: "Expressão e sentimento" },
  { key: "criterio_3", label: "Ministração", desc: "Capacidade de ministrar através do louvor" },
  { key: "criterio_4", label: "Apresentação", desc: "Postura e presença no palco" },
  { key: "criterio_5", label: "Avaliação Geral", desc: "Avaliação geral do desempenho" },
];

function StarRating({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex" role="radiogroup" aria-label="Nota de 1 a 5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={star === value}
          aria-label={`${star} ${star === 1 ? "estrela" : "estrelas"}`}
          onClick={() => onChange(star)}
          className="flex h-11 w-11 items-center justify-center rounded-lg transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-90 sm:h-9 sm:w-9"
        >
          <Star
            className={`h-7 w-7 sm:h-6 sm:w-6 ${
              star <= value
                ? "fill-warning text-warning"
                : "fill-transparent text-muted-foreground/40"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

type Avaliado = { id: number; nome_completo: string; foto_perfil: string | null };

function AvaliacaoCard({
  pessoa,
  tipo,
  idPrefixo,
  criterios,
  avaliacao,
  setAvaliacao,
}: {
  pessoa: Avaliado;
  tipo: "Pregador" | "Cantor";
  idPrefixo: string;
  criterios: { key: string; label: string; desc: string }[];
  avaliacao: Partial<AvaliacaoData>;
  setAvaliacao: (a: Partial<AvaliacaoData>) => void;
}) {
  const Icone = tipo === "Pregador" ? User : Music;
  return (
    <Card>
      <CardContent className="space-y-4 p-4 pt-4 sm:p-5">
        {/* Foto e Nome */}
        <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={pessoa.foto_perfil || undefined} alt={pessoa.nome_completo} />
            <AvatarFallback className="text-sm">
              {pessoa.nome_completo.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-semibold">{pessoa.nome_completo}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Icone className="h-3 w-3" />
              {tipo}
            </p>
          </div>
        </div>

        {/* Confirmação de Presença */}
        <div className="rounded-xl border border-primary/20 bg-accent p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Label className="flex items-center gap-2 text-sm font-medium text-accent-foreground">
              <CheckCircle className="h-4 w-4 shrink-0 text-primary" />
              O {tipo.toLowerCase()} foi {pessoa.nome_completo.split(" ")[0]}?
            </Label>
            <RadioGroup
              value={avaliacao.confirmou_identidade ? "sim" : "nao"}
              onValueChange={(value) =>
                setAvaliacao({ ...avaliacao, confirmou_identidade: value === "sim" })
              }
              className="flex gap-3"
            >
              <div className="flex min-h-11 items-center space-x-2 rounded-lg bg-card px-3">
                <RadioGroupItem value="sim" id={`${idPrefixo}-sim`} />
                <Label htmlFor={`${idPrefixo}-sim`} className="cursor-pointer text-sm">Sim</Label>
              </div>
              <div className="flex min-h-11 items-center space-x-2 rounded-lg bg-card px-3">
                <RadioGroupItem value="nao" id={`${idPrefixo}-nao`} />
                <Label htmlFor={`${idPrefixo}-nao`} className="cursor-pointer text-sm">Não</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        {/* Critérios de Avaliação */}
        <div>
          {criterios.map((criterio, index) => (
            <div
              key={criterio.key}
              className="flex flex-col gap-1 border-b py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
            >
              <div className="min-w-0 flex-1">
                <Label className="text-sm font-medium">{criterio.label}</Label>
                <p className="text-xs text-muted-foreground">{criterio.desc}</p>
              </div>
              <div className="-ml-2 sm:ml-0">
                <StarRating
                  value={avaliacao[`criterio_${index + 1}` as keyof typeof avaliacao] as number}
                  onChange={(value) =>
                    setAvaliacao({
                      ...avaliacao,
                      [`criterio_${index + 1}`]: value,
                    })
                  }
                />
              </div>
            </div>
          ))}
        </div>

        {/* Comentário */}
        <div className="space-y-1.5">
          <Label className="text-sm">Comentário (opcional)</Label>
          <Textarea
            placeholder="Deixe um comentário..."
            value={avaliacao.comentario}
            onChange={(e) => setAvaliacao({ ...avaliacao, comentario: e.target.value })}
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default function AvaliarCultoPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const itemId = parseInt(params.id);

  const [item, setItem] = useState<ItemPendente | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Avaliação Pregador
  const [avaliacaoPregador, setAvaliacaoPregador] = useState<Partial<AvaliacaoData>>({
    criterio_1: 5,
    criterio_2: 5,
    criterio_3: 5,
    criterio_4: 5,
    criterio_5: 5,
    confirmou_identidade: true,
    comentario: "",
  });

  // Avaliação Cantor
  const [avaliacaoCantor, setAvaliacaoCantor] = useState<Partial<AvaliacaoData>>({
    criterio_1: 5,
    criterio_2: 5,
    criterio_3: 5,
    criterio_4: 5,
    criterio_5: 5,
    confirmou_identidade: true,
    comentario: "",
  });

  useEffect(() => {
    fetchItem();
  }, [itemId]);

  async function fetchItem() {
    try {
      setLoading(true);
      const token = useAuthStore.getState().accessToken;
      
      const response = await fetch("/api/avaliacoes/pendentes", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const pendentes: ItemPendente[] = await response.json();
      
      const itemEncontrado = pendentes.find(p => p.item_id === itemId);
      
      if (!itemEncontrado) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Culto não encontrado ou já foi avaliado",
        });
        router.push("/avaliacoes");
        return;
      }
      
      setItem(itemEncontrado);
    } catch (error) {
      console.error("Erro ao carregar culto:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar dados do culto",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!item) return;

    try {
      setSubmitting(true);

      const avaliacoes: AvaliacaoData[] = [];

      // Adicionar avaliação do pregador se existir
      if (item.pregador) {
        avaliacoes.push({
          item_escala_id: item.item_id,
          avaliado_id: item.pregador.id,
          tipo: "PREGADOR",
          ...avaliacaoPregador,
        } as AvaliacaoData);
      }

      // Adicionar avaliação do cantor se existir
      if (item.cantor) {
        avaliacoes.push({
          item_escala_id: item.item_id,
          avaliado_id: item.cantor.id,
          tipo: "CANTOR",
          ...avaliacaoCantor,
        } as AvaliacaoData);
      }

      // Enviar todas as avaliações
      const token = useAuthStore.getState().accessToken;
      
      for (const avaliacao of avaliacoes) {
        const response = await fetch("/api/avaliacoes", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify(avaliacao),
        });

        if (!response.ok) {
          throw new Error("Erro ao enviar avaliação");
        }
      }

      toast({
        title: "Sucesso!",
        description: "Avaliação(ões) enviada(s) com sucesso! Obrigado por sua contribuição!",
      });

      router.push("/avaliacoes");
    } catch (error) {
      console.error("Erro ao enviar avaliação:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao enviar avaliação",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!item) {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 sm:space-y-5">
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="-ml-2 mb-2 h-10 px-3"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Voltar
        </Button>

        <PageHeader
          title="Avaliar Culto"
          description={`${new Date(item.data_culto).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })} - ${item.igreja_nome}`}
          icon={<Star className="h-5 w-5" />}
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 pb-2">
        {item.pregador && (
          <AvaliacaoCard
            pessoa={item.pregador}
            tipo="Pregador"
            idPrefixo="pregador"
            criterios={criteriosPregador}
            avaliacao={avaliacaoPregador}
            setAvaliacao={setAvaliacaoPregador}
          />
        )}

        {item.cantor && (
          <AvaliacaoCard
            pessoa={item.cantor}
            tipo="Cantor"
            idPrefixo="cantor"
            criterios={criteriosCantor}
            avaliacao={avaliacaoCantor}
            setAvaliacao={setAvaliacaoCantor}
          />
        )}

        {/* Botões */}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              "Enviando..."
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Enviar
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
