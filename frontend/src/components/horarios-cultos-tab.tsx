"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock, Loader2, Plus, Trash2, Edit, Copy } from "lucide-react";

const diaSemanaMap: Record<string, string> = {
  SABADO: "Sábado",
  DOMINGO: "Domingo",
  QUARTA: "Quarta-feira",
};

const horarioSchema = z.object({
  dia_semana: z.enum(["SABADO", "DOMINGO", "QUARTA"]),
  horario: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato inválido (HH:MM)"),
});

const loteSchema = z.object({
  horarios: z.array(horarioSchema).min(1, "Adicione pelo menos um horário"),
});

type HorarioFormData = z.infer<typeof horarioSchema>;
type LoteFormData = z.infer<typeof loteSchema>;

interface Horario {
  id: number;
  dia_semana: string;
  horario: string;
  ativo: boolean;
  aplicado_em_lote: boolean;
}

interface HorariosPorIgreja {
  igreja_id: number;
  igreja_nome: string;
  horarios: Horario[];
}

export function HorariosCultosTab() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [horariosPorIgreja, setHorariosPorIgreja] = useState<HorariosPorIgreja[]>([]);
  const [showDialogLote, setShowDialogLote] = useState(false);
  const [showDialogIndividual, setShowDialogIndividual] = useState(false);
  const [igrejaIdSelecionada, setIgrejaIdSelecionada] = useState<number | null>(null);
  const [horariosLote, setHorariosLote] = useState<HorarioFormData[]>([]);
  const [horarioParaDeletar, setHorarioParaDeletar] = useState<number | null>(null);
  const [igrejaParaDeletar, setIgrejaParaDeletar] = useState<{ id: number; nome: string } | null>(null);

  const {
    register: registerIndividual,
    handleSubmit: handleSubmitIndividual,
    formState: { errors: errorsIndividual },
    reset: resetIndividual,
    control: controlIndividual,
  } = useForm<HorarioFormData>({
    resolver: zodResolver(horarioSchema),
  });

  useEffect(() => {
    if (user?.distrito_id) {
      loadHorarios();
    }
  }, [user]);

  const loadHorarios = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/api/v1/distritos/${user!.distrito_id}/horarios`) as HorariosPorIgreja[];
      setHorariosPorIgreja(response);
    } catch (error: any) {
      console.error("Erro ao carregar horários:", error);
      toast({
        title: "Erro ao carregar horários",
        description: error.message || "Não foi possível carregar os horários",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitIndividual = async (data: HorarioFormData) => {
    if (!igrejaIdSelecionada) return;

    try {
      setIsSaving(true);
      await api.post("/api/v1/horarios", {
        igreja_id: igrejaIdSelecionada,
        ...data,
      });

      toast({
        title: "Sucesso",
        description: "Horário adicionado com sucesso!",
      });

      setShowDialogIndividual(false);
      resetIndividual();
      setIgrejaIdSelecionada(null);
      loadHorarios();
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar horário",
        description: error.message || "Não foi possível adicionar o horário",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdicionarHorarioLote = () => {
    if (horariosLote.length >= 10) {
      toast({
        title: "Limite atingido",
        description: "Máximo de 10 horários por vez",
        variant: "destructive",
      });
      return;
    }
    setHorariosLote([...horariosLote, { dia_semana: "SABADO", horario: "09:00" }]);
  };

  const handleRemoverHorarioLote = (index: number) => {
    setHorariosLote(horariosLote.filter((_, i) => i !== index));
  };

  const handleAtualizarHorarioLote = (index: number, field: keyof HorarioFormData, value: string) => {
    const novosHorarios = [...horariosLote];
    novosHorarios[index] = { ...novosHorarios[index], [field]: value };
    setHorariosLote(novosHorarios);
  };

  const handleAplicarLote = async () => {
    if (horariosLote.length === 0) {
      toast({
        title: "Nenhum horário",
        description: "Adicione pelo menos um horário",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      await api.post("/api/v1/horarios/lote", {
        distrito_id: user!.distrito_id,
        horarios: horariosLote,
      });

      toast({
        title: "Sucesso",
        description: `Horários aplicados em todas as igrejas ativas do distrito!`,
      });

      setShowDialogLote(false);
      setHorariosLote([]);
      loadHorarios();
    } catch (error: any) {
      toast({
        title: "Erro ao aplicar horários",
        description: error.message || "Não foi possível aplicar os horários",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletarHorario = async (horarioId: number) => {
    try {
      await api.delete(`/api/v1/horarios/${horarioId}`);
      toast({
        title: "Sucesso",
        description: "Horário deletado com sucesso!",
      });
      setHorarioParaDeletar(null);
      loadHorarios();
    } catch (error: any) {
      toast({
        title: "Erro ao deletar",
        description: error.message || "Não foi possível deletar o horário",
        variant: "destructive",
      });
    }
  };

  const handleDeletarTodosHorarios = async () => {
    if (!igrejaParaDeletar) return;

    try {
      await api.delete(`/api/v1/igrejas/${igrejaParaDeletar.id}/horarios`);
      toast({
        title: "Sucesso",
        description: "Todos os horários foram deletados!",
      });
      setIgrejaParaDeletar(null);
      loadHorarios();
    } catch (error: any) {
      toast({
        title: "Erro ao deletar",
        description: error.message || "Não foi possível deletar os horários",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Horários de Cultos
              </CardTitle>
              <CardDescription>
                Configure os horários de cultos por igreja ou aplique para todas
              </CardDescription>
            </div>
            <Dialog open={showDialogLote} onOpenChange={setShowDialogLote}>
              <DialogTrigger asChild>
                <Button onClick={() => setHorariosLote([{ dia_semana: "SABADO", horario: "09:00" }])}>
                  <Copy className="mr-2 h-4 w-4" />
                  Aplicar em Lote
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Aplicar Horários em Lote</DialogTitle>
                  <DialogDescription>
                    Os horários serão aplicados em todas as igrejas ativas do distrito
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {horariosLote.map((horario, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1 space-y-2">
                        <Label>Dia da Semana</Label>
                        <Select
                          value={horario.dia_semana}
                          onValueChange={(value) => handleAtualizarHorarioLote(index, "dia_semana", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SABADO">Sábado</SelectItem>
                            <SelectItem value="DOMINGO">Domingo</SelectItem>
                            <SelectItem value="QUARTA">Quarta-feira</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label>Horário</Label>
                        <Input
                          type="time"
                          value={horario.horario}
                          onChange={(e) => handleAtualizarHorarioLote(index, "horario", e.target.value)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => handleRemoverHorarioLote(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAdicionarHorarioLote}
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Horário
                  </Button>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowDialogLote(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAplicarLote} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Aplicando...
                      </>
                    ) : (
                      "Aplicar em Todas as Igrejas"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {horariosPorIgreja.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhuma igreja cadastrada neste distrito</p>
            </div>
          ) : (
            horariosPorIgreja.map((igrejaHorarios) => (
              <div key={igrejaHorarios.igreja_id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">{igrejaHorarios.igreja_nome}</h3>
                  <div className="flex gap-2">
                    <Dialog
                      open={showDialogIndividual && igrejaIdSelecionada === igrejaHorarios.igreja_id}
                      onOpenChange={(open) => {
                        setShowDialogIndividual(open);
                        if (!open) {
                          setIgrejaIdSelecionada(null);
                          resetIndividual();
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIgrejaIdSelecionada(igrejaHorarios.igreja_id)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Adicionar
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Adicionar Horário</DialogTitle>
                          <DialogDescription>
                            Adicionar horário para {igrejaHorarios.igreja_nome}
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmitIndividual(onSubmitIndividual)} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="dia_semana">Dia da Semana</Label>
                            <Controller
                              name="dia_semana"
                              control={controlIndividual}
                              render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o dia" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="SABADO">Sábado</SelectItem>
                                    <SelectItem value="DOMINGO">Domingo</SelectItem>
                                    <SelectItem value="QUARTA">Quarta-feira</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            />
                            {errorsIndividual.dia_semana && (
                              <p className="text-sm text-destructive">{errorsIndividual.dia_semana.message}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="horario">Horário</Label>
                            <Input
                              id="horario"
                              type="time"
                              {...registerIndividual("horario")}
                            />
                            {errorsIndividual.horario && (
                              <p className="text-sm text-destructive">{errorsIndividual.horario.message}</p>
                            )}
                          </div>
                          <DialogFooter>
                            <Button type="submit" disabled={isSaving}>
                              {isSaving ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Salvando...
                                </>
                              ) : (
                                "Salvar"
                              )}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                    {igrejaHorarios.horarios.length > 0 && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          setIgrejaParaDeletar({ id: igrejaHorarios.igreja_id, nome: igrejaHorarios.igreja_nome })
                        }
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Limpar Todos
                      </Button>
                    )}
                  </div>
                </div>

                {igrejaHorarios.horarios.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum horário configurado</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dia da Semana</TableHead>
                        <TableHead>Horário</TableHead>
                        <TableHead>Origem</TableHead>
                        <TableHead className="w-[100px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {igrejaHorarios.horarios.map((horario) => (
                        <TableRow key={horario.id}>
                          <TableCell>{diaSemanaMap[horario.dia_semana]}</TableCell>
                          <TableCell>{horario.horario}</TableCell>
                          <TableCell>
                            {horario.aplicado_em_lote ? (
                              <Badge variant="secondary">Lote</Badge>
                            ) : (
                              <Badge variant="outline">Individual</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setHorarioParaDeletar(horario.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* AlertDialog para deletar horário individual */}
      <AlertDialog open={horarioParaDeletar !== null} onOpenChange={() => setHorarioParaDeletar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Horário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar este horário? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => horarioParaDeletar && handleDeletarHorario(horarioParaDeletar)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog para deletar todos os horários de uma igreja */}
      <AlertDialog open={igrejaParaDeletar !== null} onOpenChange={() => setIgrejaParaDeletar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar Todos os Horários</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar <strong>TODOS</strong> os horários da{" "}
              <strong>{igrejaParaDeletar?.nome}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletarTodosHorarios}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deletar Todos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
