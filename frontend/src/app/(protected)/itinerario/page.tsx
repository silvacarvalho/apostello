"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Trash2, Edit, Info, MapPinned } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useAuthStore, isPastor, isAdmin, getUserDistritoId } from "@/stores/auth-store";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface ItinerarioItem {
  id: number;
  distrito_id: number;
  igreja_id: number;
  igreja_nome?: string;
  pastor_id: number;
  pastor_nome?: string;
  data_culto: string;
  observacoes?: string;
}

interface Igreja {
  id: number;
  nome: string;
}

export default function ItinerarioPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const distritoId = getUserDistritoId(user);
  const canAccess = isPastor(user) || isAdmin(user);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [itens, setItens] = useState<ItinerarioItem[]>([]);
  const [igrejas, setIgrejas] = useState<Igreja[]>([]);

  // Filtro de mês (formato yyyy-MM)
  const [mesFiltro, setMesFiltro] = useState<string>(format(new Date(), "yyyy-MM"));

  // Modais
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selecionado, setSelecionado] = useState<ItinerarioItem | null>(null);

  // Formulário
  const [igrejaId, setIgrejaId] = useState<string>("");
  const [dataCulto, setDataCulto] = useState<string>("");
  const [observacoes, setObservacoes] = useState<string>("");

  const fetchItens = useCallback(async () => {
    if (!canAccess) return;
    try {
      setLoading(true);
      const [ano, mes] = mesFiltro.split("-");
      const response = await api.get<{ itinerarios: ItinerarioItem[]; total: number }>(
        `/api/v1/itinerarios/?mes=${parseInt(mes)}&ano=${ano}`
      );
      setItens(response.itinerarios || []);
    } catch (error) {
      console.error("Erro ao carregar itinerário:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar o itinerário",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [canAccess, mesFiltro, toast]);

  const fetchIgrejas = useCallback(async () => {
    if (!canAccess) return;
    try {
      const endpoint = distritoId
        ? `/api/v1/igrejas/?distrito_id=${distritoId}&limit=500`
        : "/api/v1/igrejas/?limit=500";
      const response = await api.get<{ items: Igreja[] }>(endpoint);
      setIgrejas(response.items || []);
    } catch (error) {
      console.error("Erro ao carregar igrejas:", error);
    }
  }, [canAccess, distritoId]);

  useEffect(() => {
    if (!canAccess) {
      toast({
        title: "Acesso negado",
        description: "Apenas pastores e administradores podem acessar esta página",
        variant: "destructive",
      });
      router.push("/dashboard");
      return;
    }
    fetchIgrejas();
  }, [canAccess, fetchIgrejas, router, toast]);

  useEffect(() => {
    fetchItens();
  }, [fetchItens]);

  const resetForm = () => {
    setIgrejaId("");
    setDataCulto("");
    setObservacoes("");
    setSelecionado(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowFormModal(true);
  };

  const handleOpenEdit = (item: ItinerarioItem) => {
    setSelecionado(item);
    setIgrejaId(item.igreja_id.toString());
    setDataCulto(item.data_culto);
    setObservacoes(item.observacoes || "");
    setShowFormModal(true);
  };

  const handleOpenDelete = (item: ItinerarioItem) => {
    setSelecionado(item);
    setShowDeleteDialog(true);
  };

  const handleSave = async () => {
    if (!igrejaId || !dataCulto) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione a igreja e a data",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      igreja_id: parseInt(igrejaId),
      data_culto: dataCulto,
      observacoes: observacoes || null,
    };

    try {
      setSubmitting(true);
      if (selecionado) {
        await api.put(`/api/v1/itinerarios/${selecionado.id}`, payload);
      } else {
        await api.post("/api/v1/itinerarios/", payload);
      }
      toast({
        title: "Sucesso",
        description: selecionado ? "Itinerário atualizado" : "Itinerário registrado",
      });
      setShowFormModal(false);
      resetForm();
      fetchItens();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao salvar itinerário";
      toast({ title: "Erro", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selecionado) return;
    try {
      setSubmitting(true);
      await api.delete(`/api/v1/itinerarios/${selecionado.id}`);
      toast({ title: "Sucesso", description: "Itinerário removido" });
      setShowDeleteDialog(false);
      setSelecionado(null);
      fetchItens();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao remover itinerário";
      toast({ title: "Erro", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const formatarData = (iso: string) =>
    format(parseISO(iso), "EEEE, dd/MM/yyyy", { locale: ptBR });

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Itinerário do Pastor</h1>
          <p className="text-muted-foreground">
            Registre em quais igrejas e datas você estará presente
          </p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Registro
        </Button>
      </div>

      {/* Aviso */}
      <div className="flex items-start gap-3 p-4 rounded-lg border bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Como funciona:</strong> nas datas registradas aqui, a escala gerada{" "}
          <strong>não sorteia pregador</strong> para aquela igreja, pois o pastor já estará
          presente. O itinerário deve ser cadastrado <strong>antes</strong> de gerar a escala do mês.
        </div>
      </div>

      {/* Lista */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>Registros do mês</CardTitle>
              <CardDescription>{itens.length} registro(s)</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="mes-filtro">Mês</Label>
              <Input
                id="mes-filtro"
                type="month"
                value={mesFiltro}
                onChange={(e) => e.target.value && setMesFiltro(e.target.value)}
                className="w-44"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : itens.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-muted-foreground">
              <MapPinned className="h-10 w-10 mb-2" />
              Nenhum registro neste mês
            </div>
          ) : (
            <div className="space-y-2">
              {itens.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <div className="font-medium capitalize">{formatarData(item.data_culto)}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.igreja_nome || `Igreja #${item.igreja_id}`}
                      {item.observacoes ? ` — ${item.observacoes}` : ""}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(item)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDelete(item)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal adicionar/editar */}
      <Dialog open={showFormModal} onOpenChange={setShowFormModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selecionado ? "Editar registro" : "Novo registro"}</DialogTitle>
            <DialogDescription>
              Informe a igreja e a data em que o pastor estará presente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Igreja</Label>
              <Select value={igrejaId} onValueChange={setIgrejaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a igreja" />
                </SelectTrigger>
                <SelectContent>
                  {igrejas.map((i) => (
                    <SelectItem key={i.id} value={i.id.toString()}>
                      {i.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="data-culto">Data</Label>
              <Input
                id="data-culto"
                type="date"
                value={dataCulto}
                onChange={(e) => setDataCulto(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="obs">Observações (opcional)</Label>
              <Textarea
                id="obs"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex.: Visita pastoral, culto de aniversário..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFormModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Este registro será removido do itinerário. Escalas já geradas não são alteradas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={submitting}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
