"use client";

import { useState } from "react";
import { Star, Calendar, Church, User, ThumbsUp, ThumbsDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore, isMembro } from "@/stores/auth-store";
import { getInitials, formatDate } from "@/lib/utils";

// Mock data
const pendentesAvaliacao = [
  {
    id: 1,
    data: "2024-01-07",
    horario: "19:00",
    igreja: "Igreja Central",
    pregador: "João Silva Santos",
    cantor: "Maria Oliveira",
  },
  {
    id: 2,
    data: "2024-01-14",
    horario: "10:00",
    igreja: "Igreja Central",
    pregador: "Pedro Costa",
    cantor: null,
  },
];

const minhasAvaliacoes = [
  {
    id: 1,
    data: "2024-01-01",
    igreja: "Igreja Central",
    pregador: "Carlos Lima",
    nota_pregador: 5,
    nota_cantor: 4,
  },
  {
    id: 2,
    data: "2023-12-24",
    igreja: "Igreja Central",
    pregador: "João Silva Santos",
    nota_pregador: 5,
    nota_cantor: 5,
  },
];

const StarRating = ({
  value,
  onChange,
  readonly = false,
}: {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
}) => {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={`${readonly ? "cursor-default" : "cursor-pointer"} transition-colors`}
        >
          <Star
            className={`h-6 w-6 ${
              star <= (hover || value)
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            }`}
          />
        </button>
      ))}
    </div>
  );
};

export default function AvaliacoesPage() {
  const { user } = useAuthStore();
  const [isAvaliarDialogOpen, setIsAvaliarDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [notaPregador, setNotaPregador] = useState(0);
  const [notaCantor, setNotaCantor] = useState(0);
  const [comentario, setComentario] = useState("");

  if (!isMembro(user)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">
          Apenas membros podem avaliar pregadores e cantores.
        </p>
      </div>
    );
  }

  const handleAvaliar = (item: any) => {
    setSelectedItem(item);
    setNotaPregador(0);
    setNotaCantor(0);
    setComentario("");
    setIsAvaliarDialogOpen(true);
  };

  const handleSubmitAvaliacao = () => {
    // TODO: Enviar avaliação para API
    console.log({
      item_id: selectedItem.id,
      nota_pregador: notaPregador,
      nota_cantor: notaCantor,
      comentario,
    });
    setIsAvaliarDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Star className="h-8 w-8" />
          Avaliações
        </h1>
        <p className="text-muted-foreground mt-1">
          Avalie as pregações e louvores e ajude a melhorar o ministério
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pendentes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pendentes" className="relative">
            Pendentes
            {pendentesAvaliacao.length > 0 && (
              <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                {pendentesAvaliacao.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="realizadas">Minhas Avaliações</TabsTrigger>
        </TabsList>

        {/* Pendentes */}
        <TabsContent value="pendentes" className="space-y-4">
          {pendentesAvaliacao.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Star className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  Você não tem avaliações pendentes
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendentesAvaliacao.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-primary/10 shrink-0">
                          <span className="text-lg font-bold text-primary">
                            {new Date(item.data).getDate()}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(item.data).toLocaleDateString("pt-BR", {
                              month: "short",
                            })}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Church className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{item.igreja}</span>
                            <span className="text-sm text-muted-foreground">
                              • {item.horario}
                            </span>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span>Pregador: {item.pregador}</span>
                            </div>
                            {item.cantor && (
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span>Cantor: {item.cantor}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button onClick={() => handleAvaliar(item)}>
                        <Star className="h-4 w-4 mr-2" />
                        Avaliar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Minhas Avaliações */}
        <TabsContent value="realizadas" className="space-y-4">
          {minhasAvaliacoes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Star className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  Você ainda não realizou nenhuma avaliação
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {minhasAvaliacoes.map((avaliacao) => (
                    <div key={avaliacao.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{avaliacao.igreja}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(avaliacao.data)}
                        </span>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Pregador:</span>
                          <StarRating value={avaliacao.nota_pregador} readonly />
                        </div>
                        {avaliacao.nota_cantor && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Cantor:</span>
                            <StarRating value={avaliacao.nota_cantor} readonly />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog de Avaliação */}
      <Dialog open={isAvaliarDialogOpen} onOpenChange={setIsAvaliarDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Avaliar Culto</DialogTitle>
            <DialogDescription>
              {selectedItem && (
                <>
                  {selectedItem.igreja} - {formatDate(selectedItem.data)} às{" "}
                  {selectedItem.horario}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Avaliação do Pregador */}
            <div className="space-y-3">
              <Label>Pregador: {selectedItem?.pregador}</Label>
              <StarRating value={notaPregador} onChange={setNotaPregador} />
            </div>

            {/* Avaliação do Cantor (se houver) */}
            {selectedItem?.cantor && (
              <div className="space-y-3">
                <Label>Cantor: {selectedItem?.cantor}</Label>
                <StarRating value={notaCantor} onChange={setNotaCantor} />
              </div>
            )}

            <Separator />

            {/* Comentário */}
            <div className="space-y-2">
              <Label htmlFor="comentario">Comentário (opcional)</Label>
              <Input
                id="comentario"
                placeholder="Deixe um comentário sobre o culto..."
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAvaliarDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitAvaliacao}
              disabled={notaPregador === 0}
            >
              Enviar Avaliação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
