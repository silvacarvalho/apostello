"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Church,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  MapPin,
  Clock,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Label } from "@/components/ui/label";
import { useAuthStore, isAdmin, isPastor } from "@/stores/auth-store";
import { getStatusColor, getDayOfWeek } from "@/lib/utils";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// Types
interface HorarioCulto {
  id: number;
  dia_semana: string; // ENUM: SABADO, DOMINGO, QUARTA
  horario: string;
}

interface Distrito {
  id: number;
  nome: string;
}

interface Igreja {
  id: number;
  nome: string;
  endereco_completo: string | null;
  telefone: string | null;
  email: string | null;
  status: string;
  distrito_id: number;
  distrito: Distrito | null;
  horarios_culto: HorarioCulto[];
  created_at: string;
  updated_at: string;
}

interface IgrejaListResponse {
  items: Igreja[];
  total: number;
}

interface DistritoListResponse {
  items: Distrito[];
  total: number;
}

export default function IgrejasPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [igrejas, setIgrejas] = useState<Igreja[]>([]);
  const [distritos, setDistritos] = useState<Distrito[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDistrito, setSelectedDistrito] = useState<string>("all");
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isHorariosDialogOpen, setIsHorariosDialogOpen] = useState(false);
  const [selectedIgreja, setSelectedIgreja] = useState<Igreja | null>(null);
  
  // Form states
  const [formNome, setFormNome] = useState("");
  const [formEndereco, setFormEndereco] = useState("");
  const [formTelefone, setFormTelefone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formDistritoId, setFormDistritoId] = useState("");
  const [saving, setSaving] = useState(false);
  
  // Horário form states
  const [selectedDia, setSelectedDia] = useState<string>("");
  const [selectedHorario, setSelectedHorario] = useState<string>("");
  const [savingHorario, setSavingHorario] = useState(false);
  
  const canManage = isAdmin(user) || isPastor(user);

  const fetchDistritos = useCallback(async () => {
    try {
      const data = await api.get<DistritoListResponse>("/api/v1/distritos/publico");
      setDistritos(data.items);
    } catch (err) {
      console.error("Erro ao carregar distritos:", err);
    }
  }, []);

  const fetchIgrejas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (selectedDistrito && selectedDistrito !== "all") {
        params.append("distrito_id", selectedDistrito);
      }
      const url = `/api/v1/igrejas/${params.toString() ? `?${params.toString()}` : ""}`;
      const data = await api.get<IgrejaListResponse>(url);
      setIgrejas(data.items);
    } catch (err) {
      console.error("Erro ao carregar igrejas:", err);
      setError("Erro ao carregar igrejas. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [selectedDistrito]);

  useEffect(() => {
    fetchDistritos();
  }, [fetchDistritos]);

  useEffect(() => {
    fetchIgrejas();
  }, [fetchIgrejas]);

  // Filter by search term
  const filteredIgrejas = igrejas.filter((igreja) =>
    igreja.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    igreja.endereco_completo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Reset form
  const resetForm = () => {
    setFormNome("");
    setFormEndereco("");
    setFormTelefone("");
    setFormEmail("");
    setFormDistritoId("");
    setSelectedIgreja(null);
  };

  // Open edit dialog
  const handleEdit = (igreja: Igreja) => {
    setSelectedIgreja(igreja);
    setFormNome(igreja.nome);
    setFormEndereco(igreja.endereco_completo || "");
    setFormTelefone(igreja.telefone || "");
    setFormEmail(igreja.email || "");
    setFormDistritoId(igreja.distrito_id.toString());
    setIsEditDialogOpen(true);
  };

  // Open details dialog
  const handleViewDetails = (igreja: Igreja) => {
    setSelectedIgreja(igreja);
    setIsDetailsDialogOpen(true);
  };

  // Open horarios dialog
  const handleManageHorarios = (igreja: Igreja) => {
    setSelectedIgreja(igreja);
    setIsHorariosDialogOpen(true);
  };

  // Open delete dialog
  const handleDeleteClick = (igreja: Igreja) => {
    setSelectedIgreja(igreja);
    setIsDeleteDialogOpen(true);
  };

  // Create igreja
  const handleCreate = async () => {
    if (!formNome || !formDistritoId) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      await api.post("/api/v1/igrejas/", {
        nome: formNome,
        distrito_id: parseInt(formDistritoId),
        endereco_completo: formEndereco || null,
        telefone: formTelefone || null,
        email: formEmail || null,
      });
      toast({
        title: "Sucesso",
        description: "Igreja cadastrada com sucesso!",
      });
      setIsCreateDialogOpen(false);
      resetForm();
      fetchIgrejas();
    } catch (err) {
      console.error("Erro ao criar igreja:", err);
      toast({
        title: "Erro",
        description: "Erro ao cadastrar igreja. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Update igreja
  const handleUpdate = async () => {
    if (!selectedIgreja || !formNome) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      await api.put(`/api/v1/igrejas/${selectedIgreja.id}`, {
        nome: formNome,
        endereco_completo: formEndereco || null,
        telefone: formTelefone || null,
        email: formEmail || null,
      });
      toast({
        title: "Sucesso",
        description: "Igreja atualizada com sucesso!",
      });
      setIsEditDialogOpen(false);
      resetForm();
      fetchIgrejas();
    } catch (err) {
      console.error("Erro ao atualizar igreja:", err);
      toast({
        title: "Erro",
        description: "Erro ao atualizar igreja. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete igreja
  const handleDelete = async () => {
    if (!selectedIgreja) return;

    try {
      setSaving(true);
      await api.delete(`/api/v1/igrejas/${selectedIgreja.id}`);
      toast({
        title: "Sucesso",
        description: "Igreja excluída com sucesso!",
      });
      setIsDeleteDialogOpen(false);
      setSelectedIgreja(null);
      fetchIgrejas();
    } catch (err) {
      console.error("Erro ao excluir igreja:", err);
      toast({
        title: "Erro",
        description: "Erro ao excluir igreja. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Format time for display
  const formatHorario = (horario: string) => {
    // Handle time format from backend (HH:MM:SS or HH:MM)
    if (!horario) return "";
    const parts = horario.split(":");
    return `${parts[0]}:${parts[1]}`;
  };

  if (!canManage) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">
          Você não tem permissão para acessar esta página.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Church className="h-8 w-8" />
            Igrejas
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie as igrejas e seus horários de culto
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Igreja
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Cadastrar Igreja</DialogTitle>
              <DialogDescription>
                Adicione uma nova igreja ao sistema
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="nome">Nome da Igreja *</Label>
                <Input 
                  id="nome" 
                  placeholder="Ex: Igreja Central" 
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="distrito">Distrito *</Label>
                <Select value={formDistritoId} onValueChange={setFormDistritoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o distrito" />
                  </SelectTrigger>
                  <SelectContent>
                    {distritos.map((distrito) => (
                      <SelectItem key={distrito.id} value={distrito.id.toString()}>
                        {distrito.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input 
                  id="endereco" 
                  placeholder="Rua, número - Bairro" 
                  value={formEndereco}
                  onChange={(e) => setFormEndereco(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input 
                  id="telefone" 
                  placeholder="(00) 00000-0000" 
                  value={formTelefone}
                  onChange={(e) => setFormTelefone(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">E-mail</Label>
                <Input 
                  id="email" 
                  type="email"
                  placeholder="igreja@exemplo.com" 
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Cadastrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar igreja..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedDistrito} onValueChange={setSelectedDistrito}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Distrito" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Distritos</SelectItem>
            {distritos.map((distrito) => (
              <SelectItem key={distrito.id} value={distrito.id.toString()}>
                {distrito.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={fetchIgrejas} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-lg font-medium text-destructive">{error}</p>
          <Button variant="outline" className="mt-4" onClick={fetchIgrejas}>
            Tentar Novamente
          </Button>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Endereço</TableHead>
                  <TableHead>Distrito</TableHead>
                  <TableHead>Horários de Culto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIgrejas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? "Nenhuma igreja encontrada com esse termo" : "Nenhuma igreja cadastrada"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredIgrejas.map((igreja) => (
                    <TableRow key={igreja.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Church className="h-4 w-4 text-muted-foreground" />
                          {igreja.nome}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {igreja.endereco_completo || "Não informado"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{igreja.distrito?.nome || "N/A"}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {igreja.horarios_culto.length > 0 ? (
                            igreja.horarios_culto.map((horario) => (
                              <Badge key={horario.id} variant="secondary" className="text-xs">
                                {getDayOfWeek(horario.dia_semana)} {formatHorario(horario.horario)}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">Sem horários</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(igreja.status)}>
                          {igreja.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleViewDetails(igreja)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(igreja)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleManageHorarios(igreja)}>
                              <Clock className="h-4 w-4 mr-2" />
                              Gerenciar Horários
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDeleteClick(igreja)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Igreja</DialogTitle>
            <DialogDescription>
              Atualize as informações da igreja
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-nome">Nome da Igreja *</Label>
              <Input 
                id="edit-nome" 
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-endereco">Endereço</Label>
              <Input 
                id="edit-endereco" 
                value={formEndereco}
                onChange={(e) => setFormEndereco(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-telefone">Telefone</Label>
              <Input 
                id="edit-telefone" 
                value={formTelefone}
                onChange={(e) => setFormTelefone(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">E-mail</Label>
              <Input 
                id="edit-email" 
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Church className="h-5 w-5" />
              {selectedIgreja?.nome}
            </DialogTitle>
          </DialogHeader>
          {selectedIgreja && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Distrito</Label>
                <p>{selectedIgreja.distrito?.nome || "N/A"}</p>
              </div>
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Endereço</Label>
                <p>{selectedIgreja.endereco_completo || "Não informado"}</p>
              </div>
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Telefone</Label>
                <p>{selectedIgreja.telefone || "Não informado"}</p>
              </div>
              <div className="grid gap-2">
                <Label className="text-muted-foreground">E-mail</Label>
                <p>{selectedIgreja.email || "Não informado"}</p>
              </div>
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Status</Label>
                <Badge className={getStatusColor(selectedIgreja.status)}>
                  {selectedIgreja.status}
                </Badge>
              </div>
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Horários de Culto</Label>
                {selectedIgreja.horarios_culto.length > 0 ? (
                  <div className="space-y-1">
                    {selectedIgreja.horarios_culto.map((horario) => (
                      <div key={horario.id} className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {getDayOfWeek(horario.dia_semana)} - {formatHorario(horario.horario)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Nenhum horário cadastrado</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Horarios Dialog */}
      <Dialog open={isHorariosDialogOpen} onOpenChange={(open) => {
        setIsHorariosDialogOpen(open);
        if (!open) {
          setSelectedDia("");
          setSelectedHorario("");
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Gerenciar Horários - {selectedIgreja?.nome}
            </DialogTitle>
            <DialogDescription>
              Adicione ou remova horários de culto
            </DialogDescription>
          </DialogHeader>
          {selectedIgreja && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Horários Cadastrados</Label>
                {selectedIgreja.horarios_culto.length > 0 ? (
                  <div className="space-y-2">
                    {selectedIgreja.horarios_culto.map((horario) => (
                      <div key={horario.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span>
                          {getDayOfWeek(horario.dia_semana)} - {formatHorario(horario.horario)}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={async () => {
                            try {
                              await api.delete(`/api/v1/igrejas/${selectedIgreja.id}/horarios/${horario.id}`);
                              toast({ title: "Sucesso", description: "Horário removido!" });
                              fetchIgrejas();
                              setSelectedIgreja({
                                ...selectedIgreja,
                                horarios_culto: selectedIgreja.horarios_culto.filter(h => h.id !== horario.id)
                              });
                            } catch (err) {
                              toast({ title: "Erro", description: "Erro ao remover horário", variant: "destructive" });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Nenhum horário cadastrado</p>
                )}
              </div>
              <div className="border-t pt-4 space-y-4">
                <Label className="text-base font-semibold">Adicionar Novo Horário</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dia-semana">Dia da Semana</Label>
                    <Select value={selectedDia} onValueChange={setSelectedDia}>
                      <SelectTrigger id="dia-semana">
                        <SelectValue placeholder="Selecione o dia" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DOMINGO">Domingo</SelectItem>
                        <SelectItem value="QUARTA">Quarta-feira</SelectItem>
                        <SelectItem value="SABADO">Sábado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="horario">Horário</Label>
                    <Select value={selectedHorario} onValueChange={setSelectedHorario}>
                      <SelectTrigger id="horario">
                        <SelectValue placeholder="Selecione o horário" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="09:00:00">09:00</SelectItem>
                        <SelectItem value="10:00:00">10:00</SelectItem>
                        <SelectItem value="18:00:00">18:00</SelectItem>
                        <SelectItem value="19:00:00">19:00</SelectItem>
                        <SelectItem value="19:30:00">19:30</SelectItem>
                        <SelectItem value="20:00:00">20:00</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button 
                  className="w-full"
                  disabled={!selectedDia || !selectedHorario || savingHorario}
                  onClick={async () => {
                    if (!selectedDia || !selectedHorario) return;
                    try {
                      setSavingHorario(true);
                      await api.post(`/api/v1/igrejas/${selectedIgreja.id}/horarios`, {
                        igreja_id: selectedIgreja.id,
                        dia_semana: selectedDia,
                        horario: selectedHorario
                      });
                      toast({ title: "Sucesso", description: "Horário adicionado!" });
                      setSelectedDia("");
                      setSelectedHorario("");
                      fetchIgrejas();
                      // Refetch para atualizar os horários no dialog
                      const data = await api.get<IgrejaListResponse>(`/api/v1/igrejas/`);
                      const updated = data.items.find(i => i.id === selectedIgreja.id);
                      if (updated) setSelectedIgreja(updated);
                    } catch (err) {
                      console.error("Erro ao adicionar horário:", err);
                      toast({ title: "Erro", description: "Erro ao adicionar horário", variant: "destructive" });
                    } finally {
                      setSavingHorario(false);
                    }
                  }}
                >
                  {savingHorario && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Horário
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHorariosDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a igreja "{selectedIgreja?.nome}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
