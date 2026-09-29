"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Calendar, MapPin, User, Music, ArrowRight, ClipboardList } from "lucide-react";
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

export default function AvaliacoesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [pendentes, setPendentes] = useState<ItemPendente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendentes();
  }, []);

  async function fetchPendentes() {
    try {
      setLoading(true);
      const token = useAuthStore.getState().accessToken;
      
      const response = await fetch("/api/avaliacoes/pendentes", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Erro ao carregar avaliações pendentes");
      }
      
      const data = await response.json();
      setPendentes(data);
    } catch (error) {
      console.error("Erro ao carregar avaliações:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar avaliações pendentes",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleAvaliar(itemId: number) {
    router.push(`/avaliacoes/${itemId}`);
  }

  const headerBadge =
    pendentes.length > 0 ? (
      <Badge variant="secondary" className="px-3 py-1.5 text-sm">
        {pendentes.length} {pendentes.length === 1 ? "culto" : "cultos"}
      </Badge>
    ) : undefined;

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Avaliações Pendentes"
          description="Avalie os cultos que você participou"
          icon={<ClipboardList className="h-5 w-5" />}
        />
        <div className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Avaliações Pendentes"
        description="Avalie os cultos que você participou"
        icon={<ClipboardList className="h-5 w-5" />}
        actions={headerBadge}
      />

      {/* Lista de Cultos Pendentes */}
      {pendentes.length === 0 ? (
        <EmptyState
          icon={<Star className="h-7 w-7" />}
          title="Nenhuma avaliação pendente"
          description="Você não tem cultos para avaliar no momento. Assim que participar de um culto, ele aparecerá aqui para avaliação."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {pendentes.map((item) => (
            <Card key={item.item_id} className="transition-shadow hover:shadow-float">
              <CardHeader>
                <div className="mb-1 flex items-start justify-between">
                  <Badge variant="secondary">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date(item.data_culto).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </Badge>
                </div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">{item.igreja_nome}</span>
                </CardTitle>
                <CardDescription>
                  {new Date(item.data_culto).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Pregador */}
                {item.pregador && (
                  <div className="flex items-center gap-3 p-2.5 bg-muted/50 rounded-xl">
                    <Avatar className="h-10 w-10">
                      <AvatarImage 
                        src={item.pregador.foto_perfil || undefined} 
                        alt={item.pregador.nome_completo} 
                      />
                      <AvatarFallback className="text-xs">
                        {item.pregador.nome_completo.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Pregador
                      </p>
                      <p className="font-medium text-sm truncate">
                        {item.pregador.nome_completo}
                      </p>
                    </div>
                  </div>
                )}

                {/* Cantor */}
                {item.cantor && (
                  <div className="flex items-center gap-3 p-2.5 bg-muted/50 rounded-xl">
                    <Avatar className="h-10 w-10">
                      <AvatarImage 
                        src={item.cantor.foto_perfil || undefined} 
                        alt={item.cantor.nome_completo} 
                      />
                      <AvatarFallback className="text-xs">
                        {item.cantor.nome_completo.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Music className="w-3 h-3" />
                        Cantor
                      </p>
                      <p className="font-medium text-sm truncate">
                        {item.cantor.nome_completo}
                      </p>
                    </div>
                  </div>
                )}

                {/* Botão Avaliar */}
                <Button 
                  className="w-full" 
                  onClick={() => handleAvaliar(item.item_id)}
                >
                  <Star className="w-4 h-4 mr-2" />
                  Avaliar Culto
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
