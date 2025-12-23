"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save } from "lucide-react";

const configSchema = z.object({
  recorrencia_maxima_mes: z.number().min(1).max(10),
  intervalo_minimo_dias: z.number().min(1).max(30),
  sistema_preferencias_habilitado: z.boolean(),
  prazo_avaliacao_dias: z.number().min(1).max(30),
  confirmacao_obrigatoria: z.boolean(),
  prazo_confirmacao_horas: z.number().min(12).max(168),
  permitir_trocas: z.boolean(),
  aprovar_trocas_obrigatorio: z.boolean(),
});

type ConfigFormData = z.infer<typeof configSchema>;

export function ConfiguracoesDistritoTab() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      recorrencia_maxima_mes: 3,
      intervalo_minimo_dias: 7,
      sistema_preferencias_habilitado: true,
      prazo_avaliacao_dias: 7,
      confirmacao_obrigatoria: true,
      prazo_confirmacao_horas: 48,
      permitir_trocas: true,
      aprovar_trocas_obrigatorio: true,
    },
  });

  const watchPreferencias = watch("sistema_preferencias_habilitado");
  const watchConfirmacao = watch("confirmacao_obrigatoria");
  const watchTrocas = watch("permitir_trocas");

  useEffect(() => {
    if (user?.distrito_id) {
      loadConfiguracoes();
    }
  }, [user]);

  const loadConfiguracoes = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/api/v1/distritos/${user!.distrito_id}/configuracoes`) as any;
      
      Object.keys(response).forEach((key) => {
        if (key in configSchema.shape) {
          setValue(key as keyof ConfigFormData, response[key]);
        }
      });
    } catch (error: any) {
      console.error("Erro ao carregar configurações:", error);
      toast({
        title: "Erro ao carregar configurações",
        description: error.message || "Não foi possível carregar as configurações",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: ConfigFormData) => {
    try {
      setIsSaving(true);
      await api.put(`/api/v1/distritos/${user!.distrito_id}/configuracoes`, data);
      
      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso!",
      });
    } catch (error: any) {
      console.error("Erro ao salvar configurações:", error);
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar as configurações",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
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
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-6 md:grid-cols-2">
        {/* Configurações de Escala */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações de Escala</CardTitle>
            <CardDescription>
              Defina as regras para geração de escalas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recorrencia_maxima_mes">
                Recorrência Máxima por Mês
              </Label>
              <Input
                id="recorrencia_maxima_mes"
                type="number"
                min={1}
                max={10}
                {...register("recorrencia_maxima_mes", { valueAsNumber: true })}
              />
              {errors.recorrencia_maxima_mes && (
                <p className="text-sm text-destructive">
                  {errors.recorrencia_maxima_mes.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Quantidade máxima de pregações/louvor por pregador/cantor no mês
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="intervalo_minimo_dias">
                Intervalo Mínimo (dias)
              </Label>
              <Input
                id="intervalo_minimo_dias"
                type="number"
                min={1}
                max={30}
                {...register("intervalo_minimo_dias", { valueAsNumber: true })}
              />
              {errors.intervalo_minimo_dias && (
                <p className="text-sm text-destructive">
                  {errors.intervalo_minimo_dias.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Dias mínimos entre pregações do mesmo pregador
              </p>
            </div>

            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="sistema_preferencias">
                  Sistema de Preferências
                </Label>
                <p className="text-xs text-muted-foreground">
                  Permitir pregadores marcarem igrejas preferidas
                </p>
              </div>
              <Switch
                id="sistema_preferencias"
                checked={watchPreferencias}
                onCheckedChange={(checked) =>
                  setValue("sistema_preferencias_habilitado", checked)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Configurações de Avaliação */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações de Avaliação</CardTitle>
            <CardDescription>
              Defina o prazo para avaliações
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prazo_avaliacao_dias">
                Prazo para Avaliação (dias)
              </Label>
              <Input
                id="prazo_avaliacao_dias"
                type="number"
                min={1}
                max={30}
                {...register("prazo_avaliacao_dias", { valueAsNumber: true })}
              />
              {errors.prazo_avaliacao_dias && (
                <p className="text-sm text-destructive">
                  {errors.prazo_avaliacao_dias.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Prazo para avaliação após o culto
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Configurações de Confirmação */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações de Confirmação</CardTitle>
            <CardDescription>
              Configure a confirmação de presença
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="confirmacao_obrigatoria">
                  Confirmação Obrigatória
                </Label>
                <p className="text-xs text-muted-foreground">
                  Exigir confirmação de presença dos Pregadores/Cantores escalados
                </p>
              </div>
              <Switch
                id="confirmacao_obrigatoria"
                checked={watchConfirmacao}
                onCheckedChange={(checked) =>
                  setValue("confirmacao_obrigatoria", checked)
                }
              />
            </div>

            {watchConfirmacao && (
              <div className="space-y-2">
                <Label htmlFor="prazo_confirmacao_horas">
                  Prazo para Confirmação (horas)
                </Label>
                <Input
                  id="prazo_confirmacao_horas"
                  type="number"
                  min={12}
                  max={168}
                  {...register("prazo_confirmacao_horas", { valueAsNumber: true })}
                />
                {errors.prazo_confirmacao_horas && (
                  <p className="text-sm text-destructive">
                    {errors.prazo_confirmacao_horas.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Prazo para o escalado confirmar presença - (12h a 168h = 7 dias)
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configurações de Trocas */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações de Trocas</CardTitle>
            <CardDescription>
              Configure trocas entre pregadores/cantores
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="permitir_trocas">
                  Permitir Trocas
                </Label>
                <p className="text-xs text-muted-foreground">
                  Permitir trocas entre pregadores/cantores
                </p>
              </div>
              <Switch
                id="permitir_trocas"
                checked={watchTrocas}
                onCheckedChange={(checked) =>
                  setValue("permitir_trocas", checked)
                }
              />
            </div>

            {watchTrocas && (
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <Label htmlFor="aprovar_trocas">
                    Exigir Aprovação do Pastor
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Trocas precisam ser aprovadas pelo pastor
                  </p>
                </div>
                <Switch
                  id="aprovar_trocas"
                  checked={watch("aprovar_trocas_obrigatorio")}
                  onCheckedChange={(checked) =>
                    setValue("aprovar_trocas_obrigatorio", checked)
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex justify-end">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar Configurações
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
