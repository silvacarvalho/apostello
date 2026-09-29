"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Plus,
  Loader2,
  Trash2,
  Edit,
  UserX,
  AlertCircle,
  Info,
  Search,
  Calendar,
} from "lucide-react";
import { format, parseISO, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
import {
  useAuthStore,
  isPastor,
  isAdmin,
  getUserDistritoId,
} from "@/stores/auth-store";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

// Tipos
interface BloqueioTemporario {
  id: number;
  usuario_id: number;
  bloqueado_por_id: number;
  data_inicio: string;
  data_fim: string;
  motivo: string;
  created_at: string;
  usuario_nome?: string;
  bloqueado_por_nome?: string;
}

interface BloqueioListResponse {
  bloqueios: BloqueioTemporario[];
  total: number;
}

interface Usuario {
  id: number;
  nome_completo: string;
  email: string;
  tipo: string;
  distrito_id?: number;
}

export default function BloqueiosPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const distritoId = getUserDistritoId(user);
  const userIsAdmin = isAdmin(user);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bloqueios, setBloqueios] = useState<BloqueioTemporario[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedBloqueio, setSelectedBloqueio] = useState<BloqueioTemporario | null>(null);
  
  // Form states
  const [usuarioId, setUsuarioId] = useState<string>("");
  const [dataInicio, setDataInicio] = useState<Date | undefined>();
  const [dataFim, setDataFim] = useState<Date | undefined>();
  const [motivo, setMotivo] = useState<string>("");

  // Verifica se usuário pode acessar esta página (pastor ou admin)
  const canAccess = isPastor(user) || isAdmin(user);

  // Carrega bloqueios
  const fetchBloqueios = useCallback(async () => {
    if (!canAccess) return;
    
    try {
      setLoading(true);
      const response = await api.get<BloqueioListResponse>("/api/v1/bloqueios/");
      setBloqueios(response.bloqueios);
    } catch (error: unknown) {
      console.error("Erro ao carregar bloqueios:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar bloqueios temporários",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [canAccess, toast]);

  // Carrega usuários do distrito (pregadores e cantores)
  const fetchUsuarios = useCallback(async () => {
    if (!canAccess) return;
    
    try {
      // Sempre passa o distrito_id para não-admins
      const endpoint = distritoId 
        ? `/api/v1/usuarios/?distrito_id=${distritoId}&limit=500` 
        : "/api/v1/usuarios/?limit=500";
      const response = await api.get<{ items: Usuario[]; total: number }>(endpoint);
      
      // Filtra apenas pregadores e cantores
      let filteredUsers = (response.items || []).filter(
        (u: Usuario) => u.tipo === "PREGADOR" || u.tipo === "CANTOR"
      );
      
      // Segurança extra: se não for admin, filtra apenas usuários do mesmo distrito
      if (!userIsAdmin && distritoId) {
        filteredUsers = filteredUsers.filter(
          (u: Usuario) => u.distrito_id === distritoId
        );
      }
      
      setUsuarios(filteredUsers);
    } catch (error: unknown) {
      console.error("Erro ao carregar usuários:", error);
    }
  }, [canAccess, distritoId, userIsAdmin]);

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
    
    fetchBloqueios();
    fetchUsuarios();
  }, [canAccess, fetchBloqueios, fetchUsuarios, router, toast]);

  // Resetar form
  const resetForm = () => {
    setUsuarioId("");
    setDataInicio(undefined);
    setDataFim(undefined);
    setMotivo("");
    setSelectedBloqueio(null);
  };

  // Abrir modal de adição
  const handleOpenAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  // Abrir modal de edição
  const handleOpenEditModal = (item: BloqueioTemporario) => {
    setSelectedBloqueio(item);
    setUsuarioId(item.usuario_id.toString());
    setDataInicio(parseISO(item.data_inicio));
    setDataFim(parseISO(item.data_fim));
    setMotivo(item.motivo);
    setShowEditModal(true);
  };

  // Abrir diálogo de exclusão
  const handleOpenDeleteDialog = (item: BloqueioTemporario) => {
    setSelectedBloqueio(item);
    setShowDeleteDialog(true);
  };

  // Criar bloqueio
  const handleCreate = async () => {
    if (!usuarioId || !dataInicio || !dataFim || !motivo) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    if (isBefore(dataFim, dataInicio)) {
      toast({
        title: "Datas inválidas",
        description: "A data de fim deve ser posterior à data de início",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      await api.post("/api/v1/bloqueios/", {
        usuario_id: parseInt(usuarioId),
        data_inicio: format(dataInicio, "yyyy-MM-dd"),
        data_fim: format(dataFim, "yyyy-MM-dd"),
        motivo,
      });

      toast({
        title: "Sucesso",
        description: "Bloqueio temporário registrado com sucesso",
      });
      
      setShowAddModal(false);
      resetForm();
      fetchBloqueios();
    } catch (error: unknown) {
      console.error("Erro ao criar bloqueio:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro ao registrar bloqueio";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Atualizar bloqueio
  const handleUpdate = async () => {
    if (!selectedBloqueio || !dataInicio || !dataFim || !motivo) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    if (isBefore(dataFim, dataInicio)) {
      toast({
        title: "Datas inválidas",
        description: "A data de fim deve ser posterior à data de início",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      await api.put(`/api/v1/bloqueios/${selectedBloqueio.id}`, {
        data_inicio: format(dataInicio, "yyyy-MM-dd"),
        data_fim: format(dataFim, "yyyy-MM-dd"),
        motivo,
      });

      toast({
        title: "Sucesso",
        description: "Bloqueio atualizado com sucesso",
      });
      
      setShowEditModal(false);
      resetForm();
      fetchBloqueios();
    } catch (error: unknown) {
      console.error("Erro ao atualizar bloqueio:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro ao atualizar bloqueio";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Excluir bloqueio
  const handleDelete = async () => {
    if (!selectedBloqueio) return;

    try {
      setSubmitting(true);
      await api.delete(`/api/v1/bloqueios/${selectedBloqueio.id}`);

      toast({
        title: "Sucesso",
        description: "Bloqueio removido com sucesso",
      });
      
      setShowDeleteDialog(false);
      setSelectedBloqueio(null);
      fetchBloqueios();
    } catch (error: unknown) {
      console.error("Erro ao excluir bloqueio:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro ao excluir bloqueio";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Verifica se bloqueio está ativo (período atual)
  const isAtivo = (item: BloqueioTemporario): boolean => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const inicio = parseISO(item.data_inicio);
    const fim = parseISO(item.data_fim);
    return inicio <= hoje && fim >= hoje;
  };

  // Verifica se bloqueio é futuro (ainda vai começar)
  const isFuturo = (item: BloqueioTemporario): boolean => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const inicio = parseISO(item.data_inicio);
    return inicio > hoje;
  };

  // Verifica se bloqueio expirou
  const isExpirado = (item: BloqueioTemporario): boolean => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const fim = parseISO(item.data_fim);
    return fim < hoje;
  };

  // Conta bloqueios por status
  const bloqueiosAtivos = bloqueios.filter(b => isAtivo(b));
  const bloqueiosFuturos = bloqueios.filter(b => isFuturo(b));

  // Filtra usuários pela busca
  const filteredUsuarios = usuarios.filter((u) =>
    u.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Retorna nome do usuário
  const getUsuarioNome = (usuarioId: number): string => {
    const usuario = usuarios.find(u => u.id === usuarioId);
    return usuario?.nome_completo || "Usuário não encontrado";
  };

  // Retorna tipo do usuário
  const getUsuarioTipo = (usuarioId: number): string => {
    const usuario = usuarios.find(u => u.id === usuarioId);
    return usuario?.tipo || "";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bloqueios Temporários</h1>
          <p className="text-muted-foreground">
            Gerencie bloqueios confidenciais de pregadores e cantores
          </p>
        </div>
        <Button onClick={handleOpenAddModal}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Bloqueio
        </Button>
      </div>

      {/* Info Alert */}
      <div className="flex items-start gap-3 p-4 rounded-lg border bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Importante:</strong> Os bloqueios são confidenciais. O usuário bloqueado{" "}
          <strong>não será notificado</strong> e simplesmente não aparecerá como opção 
          durante a geração de escalas no período definido.
        </div>
      </div>

      {/* Lista de bloqueios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Bloqueios Temporários
          </CardTitle>
          <CardDescription>
            {bloqueios.length === 0
              ? "Nenhum bloqueio temporário registrado"
              : `${bloqueiosAtivos.length} ativo(s), ${bloqueiosFuturos.length} futuro(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bloqueios.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum bloqueio temporário registrado</p>
              <p className="text-sm">
                Clique em &quot;Novo Bloqueio&quot; para adicionar
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {bloqueios.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border",
                    isExpirado(item) && "bg-muted/50 opacity-60",
                    isFuturo(item) && "border-blue-200 bg-blue-50/50 dark:bg-blue-950/20"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "p-2 rounded-lg",
                      isAtivo(item) && "bg-destructive/10",
                      isFuturo(item) && "bg-blue-100 dark:bg-blue-900",
                      isExpirado(item) && "bg-muted"
                    )}>
                      <UserX className={cn(
                        "h-5 w-5",
                        isAtivo(item) && "text-destructive",
                        isFuturo(item) && "text-blue-600",
                        isExpirado(item) && "text-muted-foreground"
                      )} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {item.usuario_nome || getUsuarioNome(item.usuario_id)}
                        </span>
                        <Badge variant="outline">
                          {getUsuarioTipo(item.usuario_id) === "PREGADOR" ? "Pregador" : "Cantor"}
                        </Badge>
                        {isAtivo(item) && (
                          <Badge variant="destructive">Bloqueado</Badge>
                        )}
                        {isFuturo(item) && (
                          <Badge className="bg-blue-500 hover:bg-blue-600">Agendado</Badge>
                        )}
                        {isExpirado(item) && (
                          <Badge variant="secondary">Expirado</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        <span className="font-medium">Período:</span>{" "}
                        {format(parseISO(item.data_inicio), "dd/MM/yyyy", { locale: ptBR })}
                        {" - "}
                        {format(parseISO(item.data_fim), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        <span className="font-medium">Motivo:</span> {item.motivo}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleOpenEditModal(item)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleOpenDeleteDialog(item)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Adicionar */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Novo Bloqueio Temporário</DialogTitle>
            <DialogDescription>
              Selecione o usuário e defina o período de bloqueio
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Usuário *</Label>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={usuarioId} onValueChange={setUsuarioId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredUsuarios.map((u) => (
                      <SelectItem key={u.id} value={u.id.toString()}>
                        <div className="flex items-center gap-2">
                          <span>{u.nome_completo}</span>
                          <Badge variant="outline" className="text-xs">
                            {u.tipo === "PREGADOR" ? "Pregador" : "Cantor"}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Início *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dataInicio && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {dataInicio
                        ? format(dataInicio, "dd/MM/yy", { locale: ptBR })
                        : "Início"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <DayPicker
                      mode="single"
                      selected={dataInicio}
                      onSelect={setDataInicio}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Data de Fim *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dataFim && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {dataFim
                        ? format(dataFim, "dd/MM/yy", { locale: ptBR })
                        : "Fim"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <DayPicker
                      mode="single"
                      selected={dataFim}
                      onSelect={setDataFim}
                      disabled={(date: Date) => 
                        dataInicio ? isBefore(date, dataInicio) : false
                      }
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Motivo (confidencial) *</Label>
              <Textarea
                placeholder="Descreva o motivo do bloqueio..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5" />
              <div className="text-sm text-red-800 dark:text-red-200">
                Este bloqueio é <strong>confidencial</strong>. O usuário não será 
                notificado e não saberá que está bloqueado.
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={submitting} variant="destructive">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Bloquear Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Bloqueio</DialogTitle>
            <DialogDescription>
              Atualize o período ou motivo do bloqueio
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Usuário</Label>
              <div className="p-3 bg-muted rounded-md">
                <span className="font-medium">
                  {selectedBloqueio && (selectedBloqueio.usuario_nome || getUsuarioNome(selectedBloqueio.usuario_id))}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Início *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dataInicio && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {dataInicio
                        ? format(dataInicio, "dd/MM/yy", { locale: ptBR })
                        : "Início"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <DayPicker
                      mode="single"
                      selected={dataInicio}
                      onSelect={setDataInicio}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Data de Fim *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dataFim && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {dataFim
                        ? format(dataFim, "dd/MM/yy", { locale: ptBR })
                        : "Fim"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <DayPicker
                      mode="single"
                      selected={dataFim}
                      onSelect={setDataFim}
                      disabled={(date: Date) => 
                        dataInicio ? isBefore(date, dataInicio) : false
                      }
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Motivo (confidencial) *</Label>
              <Textarea
                placeholder="Descreva o motivo do bloqueio..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Atualizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Bloqueio</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este bloqueio temporário?
              {selectedBloqueio && (
                <span className="block mt-2">
                  <strong>Usuário:</strong>{" "}
                  {selectedBloqueio.usuario_nome || getUsuarioNome(selectedBloqueio.usuario_id)}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Remover Bloqueio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
