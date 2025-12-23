"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Avaliações Pendentes</h1>
          <p className="text-muted-foreground">Avalie os cultos que você participou</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            Avaliações Pendentes
          </h1>
          <p className="text-muted-foreground mt-1">
            Avalie os cultos que você participou
          </p>
        </div>
        {pendentes.length > 0 && (
          <Badge variant="secondary" className="text-lg py-2 px-4">
            {pendentes.length} {pendentes.length === 1 ? "culto" : "cultos"}
          </Badge>
        )}
      </div>

      {/* Lista de Cultos Pendentes */}
      {pendentes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <Star className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Nenhuma avaliação pendente</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Você não tem cultos para avaliar no momento. Assim que participar de um culto,
              ele aparecerá aqui para avaliação.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pendentes.map((item) => (
            <Card key={item.item_id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="outline" className="mb-2">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date(item.data_culto).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </Badge>
                </div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  {item.igreja_nome}
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
                  <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
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
                  <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
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
