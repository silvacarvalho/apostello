"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, CheckCircle, XCircle, ArrowLeft, Send } from "lucide-react";
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
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="focus:outline-none transition-transform hover:scale-110"
        >
          <Star
            className={`w-8 h-8 ${
              star <= value
                ? "fill-yellow-400 text-yellow-400"
                : "fill-transparent text-gray-300"
            }`}
          />
        </button>
      ))}
    </div>
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
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Star className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Avaliar Culto</h1>
            <p className="text-muted-foreground">
              {new Date(item.data_culto).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })} - {item.igreja_nome}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Avaliação do Pregador */}
        {item.pregador && (
          <Card>
            <CardHeader>
              <CardTitle>Pregador</CardTitle>
              <CardDescription>Avalie o desempenho do pregador neste culto</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Foto e Nome */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <Avatar className="h-20 w-20">
                  <AvatarImage 
                    src={item.pregador.foto_perfil || undefined} 
                    alt={item.pregador.nome_completo} 
                  />
                  <AvatarFallback className="text-lg">
                    {item.pregador.nome_completo.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-lg">{item.pregador.nome_completo}</p>
                  <p className="text-sm text-muted-foreground">Pregador</p>
                </div>
              </div>

              {/* Confirmação de Identidade */}
              <div className="space-y-3 p-4 border-2 border-primary/20 rounded-lg bg-primary/5">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  Confirmação de Identidade
                </Label>
                <p className="text-sm text-muted-foreground">
                  Esta pessoa é realmente quem estava escalado(a) para pregar neste culto?
                </p>
                <RadioGroup
                  value={avaliacaoPregador.confirmou_identidade ? "sim" : "nao"}
                  onValueChange={(value) =>
                    setAvaliacaoPregador({ ...avaliacaoPregador, confirmou_identidade: value === "sim" })
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sim" id="pregador-sim" />
                    <Label htmlFor="pregador-sim" className="cursor-pointer">
                      ✅ Sim, é {item.pregador.nome_completo}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="nao" id="pregador-nao" />
                    <Label htmlFor="pregador-nao" className="cursor-pointer">
                      ❌ Não, era outra pessoa
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Critérios de Avaliação */}
              <div className="space-y-4">
                {criteriosPregador.map((criterio, index) => (
                  <div key={criterio.key} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <Label className="text-base">⭐ {criterio.label}</Label>
                        <p className="text-sm text-muted-foreground">{criterio.desc}</p>
                      </div>
                    </div>
                    <StarRating
                      value={avaliacaoPregador[`criterio_${index + 1}` as keyof typeof avaliacaoPregador] as number}
                      onChange={(value) =>
                        setAvaliacaoPregador({
                          ...avaliacaoPregador,
                          [`criterio_${index + 1}`]: value,
                        })
                      }
                    />
                  </div>
                ))}
              </div>

              {/* Comentário */}
              <div className="space-y-2">
                <Label>💬 Comentário (opcional)</Label>
                <Textarea
                  placeholder="Deixe um comentário sobre a pregação..."
                  value={avaliacaoPregador.comentario}
                  onChange={(e) =>
                    setAvaliacaoPregador({ ...avaliacaoPregador, comentario: e.target.value })
                  }
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Avaliação do Cantor */}
        {item.cantor && (
          <Card>
            <CardHeader>
              <CardTitle>Cantor</CardTitle>
              <CardDescription>Avalie o desempenho do cantor neste culto</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Foto e Nome */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <Avatar className="h-20 w-20">
                  <AvatarImage 
                    src={item.cantor.foto_perfil || undefined} 
                    alt={item.cantor.nome_completo} 
                  />
                  <AvatarFallback className="text-lg">
                    {item.cantor.nome_completo.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-lg">{item.cantor.nome_completo}</p>
                  <p className="text-sm text-muted-foreground">Cantor</p>
                </div>
              </div>

              {/* Confirmação de Identidade */}
              <div className="space-y-3 p-4 border-2 border-primary/20 rounded-lg bg-primary/5">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  Confirmação de Identidade
                </Label>
                <p className="text-sm text-muted-foreground">
                  Esta pessoa é realmente quem estava escalado(a) para cantar neste culto?
                </p>
                <RadioGroup
                  value={avaliacaoCantor.confirmou_identidade ? "sim" : "nao"}
                  onValueChange={(value) =>
                    setAvaliacaoCantor({ ...avaliacaoCantor, confirmou_identidade: value === "sim" })
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sim" id="cantor-sim" />
                    <Label htmlFor="cantor-sim" className="cursor-pointer">
                      ✅ Sim, é {item.cantor.nome_completo}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="nao" id="cantor-nao" />
                    <Label htmlFor="cantor-nao" className="cursor-pointer">
                      ❌ Não, era outra pessoa
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Critérios de Avaliação */}
              <div className="space-y-4">
                {criteriosCantor.map((criterio, index) => (
                  <div key={criterio.key} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <Label className="text-base">⭐ {criterio.label}</Label>
                        <p className="text-sm text-muted-foreground">{criterio.desc}</p>
                      </div>
                    </div>
                    <StarRating
                      value={avaliacaoCantor[`criterio_${index + 1}` as keyof typeof avaliacaoCantor] as number}
                      onChange={(value) =>
                        setAvaliacaoCantor({
                          ...avaliacaoCantor,
                          [`criterio_${index + 1}`]: value,
                        })
                      }
                    />
                  </div>
                ))}
              </div>

              {/* Comentário */}
              <div className="space-y-2">
                <Label>💬 Comentário (opcional)</Label>
                <Textarea
                  placeholder="Deixe um comentário sobre o louvor..."
                  value={avaliacaoCantor.comentario}
                  onChange={(e) =>
                    setAvaliacaoCantor({ ...avaliacaoCantor, comentario: e.target.value })
                  }
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Botões */}
        <div className="flex gap-3 justify-end">
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
                <Send className="w-4 h-4 mr-2" />
                Enviar Avaliação
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
