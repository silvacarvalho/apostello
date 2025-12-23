"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Church, User, Music, Clock, CheckCircle, XCircle, AlertCircle, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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
  const [mesAtual] = useState(new Date().getMonth() + 1);
  const [anoAtual] = useState(new Date().getFullYear());

  useEffect(() => {
    if (user?.igreja_id) {
      fetchEscalaMinhaIgreja();
    }
  }, [user]);

  async function fetchEscalaMinhaIgreja() {
    try {
      setLoading(true);
      
      const token = useAuthStore.getState().accessToken;
      
      // Buscar escala do mês atual da igreja do membro
      const response = await fetch(
        `/api/escalas?igreja_id=${user?.igreja_id}&mes=${mesAtual}&ano=${anoAtual}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

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
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Church className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Escalas da Minha Igreja</h1>
            <p className="text-muted-foreground">
              {mesesNomes[mesAtual - 1]} de {anoAtual}
            </p>
          </div>
        </div>
      </div>

      {/* Escala */}
      {!escala ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <Calendar className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Nenhuma escala disponível</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Não há escala publicada para sua igreja neste mês. Entre em contato com o pastor
              distrital para mais informações.
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
          <div className="grid gap-4">
            {escala.itens
              .sort((a, b) => new Date(a.data_culto).getTime() - new Date(b.data_culto).getTime())
              .map((item) => (
                <Card key={item.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center">
                          <span className="text-xs text-muted-foreground">
                            {new Date(item.data_culto).toLocaleDateString("pt-BR", { month: "short" })}
                          </span>
                          <span className="text-lg font-bold">
                            {new Date(item.data_culto).getDate()}
                          </span>
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {getDayOfWeek(item.data_culto)}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {item.horario_culto.horario}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {formatDate(item.data_culto)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Pregador */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Pregador
                        </Label>
                        {getConfirmacaoStatus(item.pregador_confirmou)}
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <Avatar className="h-12 w-12">
                          <AvatarImage 
                            src={item.pregador.foto_url || undefined} 
                            alt={item.pregador.nome_completo} 
                          />
                          <AvatarFallback>
                            {item.pregador.nome_completo.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{item.pregador.nome_completo}</p>
                          <p className="text-xs text-muted-foreground">Pregador Escalado</p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Cantor */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold flex items-center gap-2">
                          <Music className="w-4 h-4" />
                          Cantor
                        </Label>
                        {getConfirmacaoStatus(item.cantor_confirmou)}
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <Avatar className="h-12 w-12">
                          <AvatarImage 
                            src={item.cantor.foto_url || undefined} 
                            alt={item.cantor.nome_completo} 
                          />
                          <AvatarFallback>
                            {item.cantor.nome_completo.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{item.cantor.nome_completo}</p>
                          <p className="text-xs text-muted-foreground">Cantor Escalado</p>
                        </div>
                      </div>
                    </div>

                    {/* Botão de Avaliação */}
                    {isCultoPassed(item.data_culto, item.horario_culto.horario) && (
                      <>
                        <Separator />
                        <div className="flex items-center justify-center pt-2">
                          <Button 
                            onClick={() => handleAvaliar(item.id)}
                            className="w-full"
                            variant="outline"
                          >
                            <Star className="w-4 h-4 mr-2" />
                            Avaliar Culto
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}

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

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>;
}
