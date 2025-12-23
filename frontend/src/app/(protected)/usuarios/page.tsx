"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore, getUserRole, isAdmin, isPastor, shouldShowLimitedData } from "@/stores/auth-store";
import { getInitials, getStatusColor, getScoreColor, formatCPF, formatPhone } from "@/lib/utils";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Usuario {
  id: number;
  nome_completo: string;
  email: string;
  cpf: string;
  telefone: string;
  tipo: string;
  status: string;
  status_aprovacao: string;
  score_atual: number;
  foto_url: string | null;
  distrito_id: number | null;
  created_at: string;
  data_solicitacao_cadastro?: string;
}

interface Distrito {
  id: number;
  nome: string;
}

interface FormData {
  nome_completo: string;
  email: string;
  cpf: string;
  telefone: string;
  tipo: string;
  distrito_id: string;
  senha: string;
  pode_pregar?: boolean;
  pode_cantar?: boolean;
}

const initialFormData: FormData = {
  nome_completo: "",
  email: "",
  cpf: "",
  telefone: "",
  tipo: "",
  distrito_id: "",
  senha: "",
  pode_pregar: false,
  pode_cantar: false,
};

export default function UsuariosPage() {
  const { user, accessToken } = useAuthStore();
  const { toast } = useToast();
  
  // Estados
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [pendentes, setPendentes] = useState<Usuario[]>([]);
  const [distritos, setDistritos] = useState<Distrito[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formLoading, setFormLoading] = useState(false);
  
  // Estatísticas
  const [stats, setStats] = useState({
    total: 0,
    pregadores: 0,
    cantores: 0,
    pendentes: 0,
  });

  const canManage = isAdmin(user) || isPastor(user);
  const showLimitedData = shouldShowLimitedData(user);

  // Carregar dados
  const fetchData = useCallback(async () => {
    if (!accessToken) return;
    
    setLoading(true);
    try {
      // Carregar usuários
      const usuariosResponse = await api.get<{ items: Usuario[]; total: number }>(
        "/api/v1/usuarios/",
        accessToken
      );
      setUsuarios(usuariosResponse.items || []);
      
      // Calcular estatísticas
      const items = usuariosResponse.items || [];
      setStats({
        total: usuariosResponse.total || items.length,
        pregadores: items.filter(u => u.tipo === "PREGADOR").length,
        cantores: items.filter(u => u.tipo === "CANTOR").length,
        pendentes: 0,
      });

      // Carregar pendentes
      try {
        const pendentesResponse = await api.get<Usuario[]>(
          "/api/v1/usuarios/pendentes",
          accessToken
        );
        setPendentes(pendentesResponse || []);
        setStats(prev => ({ ...prev, pendentes: pendentesResponse?.length || 0 }));
      } catch (error) {
        console.error("Erro ao carregar pendentes:", error);
      }

      // Carregar distritos
      const distritosResponse = await api.get<{ items: Distrito[] }>(
        "/api/v1/distritos/publico"
      );
      setDistritos(distritosResponse.items || []);

    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível carregar os dados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [accessToken, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Formatar CPF
  const formatCPFInput = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 11);
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  // Formatar telefone
  const formatPhoneInput = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 11);
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  };

  // Criar usuário
  const handleCreateUser = async () => {
    if (!formData.nome_completo || !formData.email || !formData.cpf || !formData.tipo || !formData.senha) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    // Validar distrito para tipos que precisam
    const tiposComDistrito = ["PREGADOR", "CANTOR", "PASTOR_DISTRITAL", "LIDER_DISTRITAL", "MEMBRO"];
    if (tiposComDistrito.includes(formData.tipo) && !formData.distrito_id) {
      toast({
        title: "Distrito obrigatório",
        description: "Selecione um distrito para este tipo de usuário",
        variant: "destructive",
      });
      return;
    }

    setFormLoading(true);
    try {
      const payload = {
        nome_completo: formData.nome_completo,
        email: formData.email,
        cpf: formData.cpf.replace(/\D/g, ""),
        telefone: formData.telefone.replace(/\D/g, "") || null,
        tipo: formData.tipo,
        distrito_id: formData.distrito_id ? parseInt(formData.distrito_id) : null,
        senha: formData.senha,
      };

      await api.post("/api/v1/usuarios/", payload, accessToken!);

      toast({
        title: "Usuário criado!",
        description: "O usuário foi cadastrado com sucesso",
      });

      setIsCreateDialogOpen(false);
      setFormData(initialFormData);
      fetchData();
    } catch (error: any) {
      console.error("Erro ao criar usuário:", error);
      toast({
        title: "Erro ao criar usuário",
        description: error.message || "Não foi possível criar o usuário",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  // Aprovar usuário
  const handleApprove = async (usuarioId: number) => {
    setLoadingAction(true);
    try {
      await api.post(`/api/v1/usuarios/${usuarioId}/aprovar`, {}, accessToken!);
      toast({
        title: "Usuário aprovado!",
        description: "O cadastro foi aprovado com sucesso",
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível aprovar o usuário",
        variant: "destructive",
      });
    } finally {
      setLoadingAction(false);
    }
  };

  // Recusar usuário
  const handleReject = async (usuarioId: number) => {
    const motivo = prompt("Informe o motivo da recusa (mínimo 10 caracteres):");
    if (!motivo || motivo.length < 10) {
      toast({
        title: "Motivo inválido",
        description: "O motivo deve ter no mínimo 10 caracteres",
        variant: "destructive",
      });
      return;
    }

    setLoadingAction(true);
    try {
      await api.post(`/api/v1/usuarios/${usuarioId}/recusar?motivo=${encodeURIComponent(motivo)}`, {}, accessToken!);
      toast({
        title: "Cadastro recusado",
        description: "O usuário foi notificado sobre a recusa",
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível recusar o usuário",
        variant: "destructive",
      });
    } finally {
      setLoadingAction(false);
    }
  };

  // Ativar/Desativar usuário
  const handleToggleStatus = async (usuarioId: number, ativar: boolean) => {
    setLoadingAction(true);
    try {
      const endpoint = ativar ? "ativar" : "desativar";
      await api.post(`/api/v1/usuarios/${usuarioId}/${endpoint}`, {}, accessToken!);
      toast({
        title: ativar ? "Usuário ativado!" : "Usuário desativado!",
        description: `O usuário foi ${ativar ? "ativado" : "desativado"} com sucesso`,
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível alterar o status",
        variant: "destructive",
      });
    } finally {
      setLoadingAction(false);
    }
  };

  // Filtrar usuários
  const filteredUsers = usuarios.filter((u) => {
    const matchesSearch = 
      u.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || u.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (!canManage) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">
          Você não tem permissão para acessar esta página.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8" />
            Usuários
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie pregadores, cantores e membros do sistema
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Cadastrar Usuário</DialogTitle>
                <DialogDescription>
                  Adicione um novo usuário ao sistema
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="nome">Nome Completo *</Label>
                  <Input
                    id="nome"
                    placeholder="Nome do usuário"
                    value={formData.nome_completo}
                    onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="cpf">CPF *</Label>
                    <Input
                      id="cpf"
                      placeholder="000.000.000-00"
                      value={formData.cpf}
                      onChange={(e) => setFormData({ ...formData, cpf: formatCPFInput(e.target.value) })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      placeholder="(00) 00000-0000"
                      value={formData.telefone}
                      onChange={(e) => setFormData({ ...formData, telefone: formatPhoneInput(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tipo">Tipo de Usuário *</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value) => {
                      // Definir valores padrão para pode_pregar e pode_cantar baseado no tipo
                      const podePregar = value === 'PREGADOR' || value === 'PASTOR_DISTRITAL';
                      const podeCantar = value === 'CANTOR';
                      setFormData({ 
                        ...formData, 
                        tipo: value,
                        pode_pregar: podePregar,
                        pode_cantar: podeCantar
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {isAdmin(user) && (
                        <>
                          <SelectItem value="ADMIN">Administrador</SelectItem>
                          <SelectItem value="ASSOCIACAO">Associação</SelectItem>
                          <SelectItem value="PASTOR_DISTRITAL">Pastor Distrital</SelectItem>
                          <SelectItem value="LIDER_DISTRITAL">Líder Distrital</SelectItem>
                        </>
                      )}
                      <SelectItem value="PREGADOR">Pregador</SelectItem>
                      <SelectItem value="CANTOR">Cantor</SelectItem>
                      <SelectItem value="MEMBRO">Membro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.tipo && formData.tipo !== "ADMIN" && formData.tipo !== "ASSOCIACAO" && (
                  <div className="grid gap-2">
                    <Label htmlFor="distrito">Distrito *</Label>
                    <Select
                      value={formData.distrito_id}
                      onValueChange={(value) => setFormData({ ...formData, distrito_id: value })}
                    >
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
                )}                
                {/* Habilidades de escalação */}
                {formData.tipo && formData.tipo !== "ADMIN" && formData.tipo !== "ASSOCIACAO" && formData.tipo !== "MEMBRO" && (
                  <div className="grid gap-3 p-4 border rounded-lg bg-muted/30">
                    <Label className="text-sm font-semibold">Habilidades de Escalação</Label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="pode_pregar"
                        checked={formData.pode_pregar || false}
                        onChange={(e) => setFormData({ ...formData, pode_pregar: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="pode_pregar" className="text-sm font-normal cursor-pointer">
                        Pode pregar
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="pode_cantar"
                        checked={formData.pode_cantar || false}
                        onChange={(e) => setFormData({ ...formData, pode_cantar: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="pode_cantar" className="text-sm font-normal cursor-pointer">
                        Pode cantar
                      </Label>
                    </div>
                  </div>
                )}
                                <div className="grid gap-2">
                  <Label htmlFor="senha">Senha *</Label>
                  <Input
                    id="senha"
                    type="password"
                    placeholder="••••••••"
                    value={formData.senha}
                    onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateUser} disabled={formLoading}>
                  {formLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Cadastrando...
                    </>
                  ) : (
                    "Cadastrar"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total de usuários</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.pregadores}</div>
            <p className="text-xs text-muted-foreground">Pregadores</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.cantores}</div>
            <p className="text-xs text-muted-foreground">Cantores</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className={`text-2xl font-bold ${stats.pendentes > 0 ? 'text-orange-500' : ''}`}>
              {stats.pendentes}
            </div>
            <p className="text-xs text-muted-foreground">Pendentes de aprovação</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="todos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="pregadores">Pregadores</TabsTrigger>
          <TabsTrigger value="cantores">Cantores</TabsTrigger>
          <TabsTrigger value="pendentes" className="relative">
            Pendentes
            {stats.pendentes > 0 && (
              <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                {stats.pendentes}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Todos / Pregadores / Cantores */}
        {["todos", "pregadores", "cantores"].map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ATIVO">Ativo</SelectItem>
                  <SelectItem value="INATIVO">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    {!showLimitedData && <TableHead>Contato</TableHead>}
                    <TableHead>Tipo</TableHead>
                    <TableHead>Score</TableHead>
                    {!showLimitedData && <TableHead>Status</TableHead>}
                    {!showLimitedData && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers
                    .filter((u) => {
                      if (tab === "pregadores") return u.tipo === "PREGADOR";
                      if (tab === "cantores") return u.tipo === "CANTOR";
                      return true;
                    })
                    .map((usuario) => (
                      <TableRow key={usuario.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={usuario.foto_url || undefined} />
                              <AvatarFallback>
                                {getInitials(usuario.nome_completo)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{usuario.nome_completo}</p>
                              {!showLimitedData && (
                                <p className="text-sm text-muted-foreground">
                                  {distritos.find(d => d.id === usuario.distrito_id)?.nome || "Sem distrito"}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        {!showLimitedData && (
                          <TableCell>
                            <div className="text-sm">
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {usuario.email}
                              </div>
                              {usuario.telefone && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Phone className="h-3 w-3" />
                                  {formatPhone(usuario.telefone)}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          <Badge variant="outline">
                            {getUserRole(usuario.tipo)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={getScoreColor(Number(usuario.score_atual) || 0)}>
                            {Number(usuario.score_atual || 0).toFixed(1)}
                          </span>
                        </TableCell>
                        {!showLimitedData && (
                          <>
                            <TableCell>
                              <Badge className={getStatusColor(usuario.status)}>
                                {usuario.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" disabled={loadingAction}>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Ver Perfil
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {usuario.status === "ATIVO" ? (
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => handleToggleStatus(usuario.id, false)}
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Desativar
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      className="text-green-600"
                                      onClick={() => handleToggleStatus(usuario.id, true)}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Ativar
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  {filteredUsers.filter((u) => {
                    if (tab === "pregadores") return u.tipo === "PREGADOR";
                    if (tab === "cantores") return u.tipo === "CANTOR";
                    return true;
                  }).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={showLimitedData ? 3 : 6} className="text-center py-8 text-muted-foreground">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        ))}

        {/* Pendentes */}
        <TabsContent value="pendentes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cadastros Pendentes de Aprovação</CardTitle>
              <CardDescription>
                Analise e aprove ou recuse novos cadastros de pregadores e cantores
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendentes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum cadastro pendente de aprovação
                </div>
              ) : (
                <div className="space-y-4">
                  {pendentes.map((usuario) => (
                    <div
                      key={usuario.id}
                      className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback>
                            {getInitials(usuario.nome_completo)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{usuario.nome_completo}</p>
                          <p className="text-sm text-muted-foreground">
                            {usuario.email} • {usuario.telefone ? formatPhone(usuario.telefone) : "Sem telefone"}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">
                              {getUserRole(usuario.tipo)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {distritos.find(d => d.id === usuario.distrito_id)?.nome || "Sem distrito"}
                            </span>
                            {usuario.data_solicitacao_cadastro && (
                              <span className="text-xs text-muted-foreground">
                                • Cadastro em {new Date(usuario.data_solicitacao_cadastro).toLocaleDateString("pt-BR")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleReject(usuario.id)}
                          disabled={loadingAction}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Recusar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(usuario.id)}
                          disabled={loadingAction}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Aprovar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
