"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  BookOpen,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Download,
  Upload,
  RefreshCw,
  Loader2,
  FileJson,
  Package,
  Check,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Switch } from "@/components/ui/switch";
import { useAuthStore, isAdmin, isAssociacao } from "@/stores/auth-store";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// Types
interface Tema {
  id: number;
  organizacao_id: number;
  titulo: string;
  descricao: string | null;
  tipo_recorrencia: string;
  config_recorrencia: Record<string, any>;
  ano_aplicacao: number | null;
  status: string;
  vezes_usado: number;
  created_at: string;
  updated_at: string;
}

interface TemaListResponse {
  items: Tema[];
  total: number;
}

interface TemplatePredefinido {
  id: string;
  nome: string;
  descricao: string;
  total_temas: number;
}

interface ImportResult {
  total_importados: number;
  total_ignorados: number;
  erros: string[];
}

const TIPOS_RECORRENCIA = [
  { value: "SEMANAL_MES", label: "Semanal no Mês", desc: "Ex: Todo segundo sábado do mês" },
  { value: "PERIODO_ESPECIFICO", label: "Período Específico", desc: "Ex: Semana Santa (13/04 a 20/04)" },
  { value: "ANUAL", label: "Anual", desc: "Ex: Dia das Mães (segundo domingo de maio)" },
];

const DIAS_SEMANA = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
];

const SEMANAS_MES = [
  { value: 1, label: "Primeira" },
  { value: 2, label: "Segunda" },
  { value: 3, label: "Terceira" },
  { value: 4, label: "Quarta" },
  { value: -1, label: "Última" },
];

const MESES = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

export default function TemasPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  
  // Estados
  const [loading, setLoading] = useState(true);
  const [temas, setTemas] = useState<Tema[]>([]);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("TODOS");
  
  // Dialogs
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [selectedTema, setSelectedTema] = useState<Tema | null>(null);
  const [temaToDelete, setTemaToDelete] = useState<Tema | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    tipo_recorrencia: "SEMANAL_MES",
    config_recorrencia: {} as Record<string, any>,
    ano_aplicacao: null as number | null,
  });
  const [saving, setSaving] = useState(false);
  
  // Import states
  const [templatesPredefinidos, setTemplatesPredefinidos] = useState<TemplatePredefinido[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [sobrescreverExistentes, setSobrescreverExistentes] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);

  const canManage = isAdmin(user) || isAssociacao(user);

  // Carregar temas
  const fetchTemas = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter !== "TODOS") params.append("status_filtro", statusFilter);
      params.append("limit", "100");
      
      const data = await api.get<TemaListResponse>(`/api/v1/temas?${params}`);
      setTemas(data.items);
      setTotal(data.total);
    } catch (error) {
      console.error("Erro ao carregar temas:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os temas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, toast]);

  useEffect(() => {
    fetchTemas();
  }, [fetchTemas]);

  // Carregar templates pré-definidos
  const fetchTemplates = async () => {
    try {
      const data = await api.get<TemplatePredefinido[]>("/api/v1/temas/templates/disponiveis");
      setTemplatesPredefinidos(data);
    } catch (error) {
      console.error("Erro ao carregar templates:", error);
    }
  };

  // Handlers
  const handleView = (tema: Tema) => {
    setSelectedTema(tema);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (tema: Tema) => {
    setSelectedTema(tema);
    setFormData({
      titulo: tema.titulo,
      descricao: tema.descricao || "",
      tipo_recorrencia: tema.tipo_recorrencia,
      config_recorrencia: tema.config_recorrencia,
      ano_aplicacao: tema.ano_aplicacao,
    });
    setIsCreateDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedTema(null);
    setFormData({
      titulo: "",
      descricao: "",
      tipo_recorrencia: "SEMANAL_MES",
      config_recorrencia: { semana: 1, dia_semana: 6 },
      ano_aplicacao: null,
    });
    setIsCreateDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.titulo.trim()) {
      toast({
        title: "Erro",
        description: "O título é obrigatório",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      if (selectedTema) {
        await api.put(`/api/v1/temas/${selectedTema.id}`, formData);
        toast({ title: "Sucesso", description: "Tema atualizado com sucesso!" });
      } else {
        await api.post("/api/v1/temas", formData);
        toast({ title: "Sucesso", description: "Tema criado com sucesso!" });
      }
      setIsCreateDialogOpen(false);
      fetchTemas();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar tema",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!temaToDelete) return;
    
    try {
      await api.delete(`/api/v1/temas/${temaToDelete.id}`);
      toast({ title: "Sucesso", description: "Tema excluído com sucesso!" });
      setTemaToDelete(null);
      fetchTemas();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir tema",
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = async (tema: Tema) => {
    try {
      await api.post(`/api/v1/temas/${tema.id}/toggle-status`, {});
      toast({
        title: "Sucesso",
        description: `Tema ${tema.status === "ATIVO" ? "desativado" : "ativado"} com sucesso!`,
      });
      fetchTemas();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao alterar status",
        variant: "destructive",
      });
    }
  };

  // Exportação
  const handleExport = async () => {
    try {
      const data = await api.get("/api/v1/temas/exportar/template?apenas_ativos=false");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `temas_export_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({ title: "Sucesso", description: "Temas exportados com sucesso!" });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao exportar temas",
        variant: "destructive",
      });
    }
  };

  // Importação de template pré-definido
  const handleImportTemplate = async () => {
    if (!selectedTemplateId) return;
    
    setImporting(true);
    try {
      const result = await api.post<ImportResult>(
        `/api/v1/temas/templates/${selectedTemplateId}/importar?sobrescrever_existentes=${sobrescreverExistentes}`,
        {}
      );
      setImportResult(result);
      fetchTemas();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao importar template",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  // Importação de arquivo
  const handleImportFile = async () => {
    if (!importFile) return;
    
    setImporting(true);
    try {
      // Ler o arquivo como JSON
      const text = await importFile.text();
      const jsonData = JSON.parse(text);
      
      const result = await api.post<ImportResult>(
        `/api/v1/temas/importar/template?sobrescrever_existentes=${sobrescreverExistentes}`,
        jsonData
      );
      setImportResult(result);
      setImportFile(null);
      fetchTemas();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao importar arquivo",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  // Formatação de recorrência
  const formatRecorrencia = (tema: Tema): string => {
    const cfg = tema.config_recorrencia;
    
    switch (tema.tipo_recorrencia) {
      case "SEMANAL_MES":
        const semana = SEMANAS_MES.find(s => s.value === cfg.semana)?.label || cfg.semana;
        const dia = DIAS_SEMANA.find(d => d.value === cfg.dia_semana)?.label || cfg.dia_semana;
        return `${semana} ${dia} do mês`;
      
      case "PERIODO_ESPECIFICO":
        const dataInicio = cfg.data_inicio ? new Date(cfg.data_inicio + "T00:00:00").toLocaleDateString("pt-BR") : "?";
        const dataFim = cfg.data_fim ? new Date(cfg.data_fim + "T00:00:00").toLocaleDateString("pt-BR") : "?";
        return `${dataInicio} a ${dataFim}`;
      
      case "ANUAL":
        const mes = MESES.find(m => m.value === cfg.mes)?.label || cfg.mes;
        const semanaAnual = SEMANAS_MES.find(s => s.value === cfg.semana)?.label || cfg.semana;
        const diaAnual = DIAS_SEMANA.find(d => d.value === cfg.dia_semana)?.label || cfg.dia_semana;
        return `${semanaAnual} ${diaAnual} de ${mes}`;
      
      default:
        return JSON.stringify(cfg);
    }
  };

  // Stats
  const temasAtivos = temas.filter(t => t.status === "ATIVO").length;
  const totalUsos = temas.reduce((acc, t) => acc + t.vezes_usado, 0);

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
            <BookOpen className="h-8 w-8" />
            Temas
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os temas de pregação e suas recorrências
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                fetchTemplates();
                setIsTemplateDialogOpen(true);
              }}>
                <Package className="h-4 w-4 mr-2" />
                Templates Pré-definidos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsImportDialogOpen(true)}>
                <FileJson className="h-4 w-4 mr-2" />
                Importar Arquivo JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Tema
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar temas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos</SelectItem>
            <SelectItem value="ATIVO">Ativos</SelectItem>
            <SelectItem value="INATIVO">Inativos</SelectItem>
          </SelectContent>
        </Select>
        
        <Button variant="outline" onClick={fetchTemas}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-sm text-muted-foreground">Total de Temas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Check className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{temasAtivos}</p>
                <p className="text-sm text-muted-foreground">Temas Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <BookOpen className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalUsos}</p>
                <p className="text-sm text-muted-foreground">Total de Usos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead className="hidden md:table-cell">Recorrência</TableHead>
                  <TableHead className="text-center">Usado</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {temas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <p className="text-muted-foreground">
                        Nenhum tema encontrado
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  temas.map((tema) => (
                    <TableRow key={tema.id}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{tema.titulo}</span>
                          {tema.descricao && (
                            <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                              {tema.descricao}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className="font-normal">
                          {formatRecorrencia(tema)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{tema.vezes_usado}x</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={tema.status === "ATIVO" ? "default" : "secondary"}>
                          {tema.status === "ATIVO" ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(tema)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(tema)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(tema)}>
                              {tema.status === "ATIVO" ? (
                                <>
                                  <X className="h-4 w-4 mr-2" />
                                  Desativar
                                </>
                              ) : (
                                <>
                                  <Check className="h-4 w-4 mr-2" />
                                  Ativar
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => setTemaToDelete(tema)}
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
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{selectedTema?.titulo}</DialogTitle>
            <DialogDescription>
              Usado {selectedTema?.vezes_usado} vezes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedTema?.descricao && (
              <div>
                <Label className="text-muted-foreground">Descrição</Label>
                <p className="mt-1">{selectedTema.descricao}</p>
              </div>
            )}
            <div>
              <Label className="text-muted-foreground">Tipo de Recorrência</Label>
              <p className="mt-1">
                {TIPOS_RECORRENCIA.find(t => t.value === selectedTema?.tipo_recorrencia)?.label}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Configuração</Label>
              <p className="mt-1">{selectedTema && formatRecorrencia(selectedTema)}</p>
            </div>
            {selectedTema?.ano_aplicacao && (
              <div>
                <Label className="text-muted-foreground">Ano de Aplicação</Label>
                <p className="mt-1">{selectedTema.ano_aplicacao}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTema ? "Editar Tema" : "Novo Tema"}
            </DialogTitle>
            <DialogDescription>
              {selectedTema
                ? "Atualize as informações do tema"
                : "Crie um novo tema de pregação"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                placeholder="Ex: Mordomia Cristã"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descreva brevemente o tema..."
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Tipo de Recorrência *</Label>
              <Select 
                value={formData.tipo_recorrencia} 
                onValueChange={(val) => {
                  setFormData(prev => ({ 
                    ...prev, 
                    tipo_recorrencia: val,
                    config_recorrencia: val === "SEMANAL_MES" 
                      ? { semana: 1, dia_semana: 6 }
                      : val === "PERIODO_ESPECIFICO"
                      ? { data_inicio: "", data_fim: "" }
                      : { mes: 1, semana: 1, dia_semana: 0 }
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_RECORRENCIA.map(tipo => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      <div>
                        <span>{tipo.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({tipo.desc})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Configuração baseada no tipo */}
            {formData.tipo_recorrencia === "SEMANAL_MES" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Semana do Mês</Label>
                  <Select 
                    value={String(formData.config_recorrencia.semana || 1)}
                    onValueChange={(val) => setFormData(prev => ({
                      ...prev,
                      config_recorrencia: { ...prev.config_recorrencia, semana: parseInt(val) }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEMANAS_MES.map(s => (
                        <SelectItem key={s.value} value={String(s.value)}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Dia da Semana</Label>
                  <Select 
                    value={String(formData.config_recorrencia.dia_semana ?? 6)}
                    onValueChange={(val) => setFormData(prev => ({
                      ...prev,
                      config_recorrencia: { ...prev.config_recorrencia, dia_semana: parseInt(val) }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIAS_SEMANA.map(d => (
                        <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            {formData.tipo_recorrencia === "PERIODO_ESPECIFICO" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data Início</Label>
                  <Input
                    type="date"
                    value={formData.config_recorrencia.data_inicio || ""}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      config_recorrencia: { ...prev.config_recorrencia, data_inicio: e.target.value }
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Fim</Label>
                  <Input
                    type="date"
                    value={formData.config_recorrencia.data_fim || ""}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      config_recorrencia: { ...prev.config_recorrencia, data_fim: e.target.value }
                    }))}
                  />
                </div>
              </div>
            )}
            
            {formData.tipo_recorrencia === "ANUAL" && (
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Mês</Label>
                  <Select 
                    value={String(formData.config_recorrencia.mes || 1)}
                    onValueChange={(val) => setFormData(prev => ({
                      ...prev,
                      config_recorrencia: { ...prev.config_recorrencia, mes: parseInt(val) }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MESES.map(m => (
                        <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Semana</Label>
                  <Select 
                    value={String(formData.config_recorrencia.semana || 1)}
                    onValueChange={(val) => setFormData(prev => ({
                      ...prev,
                      config_recorrencia: { ...prev.config_recorrencia, semana: parseInt(val) }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEMANAS_MES.map(s => (
                        <SelectItem key={s.value} value={String(s.value)}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Dia</Label>
                  <Select 
                    value={String(formData.config_recorrencia.dia_semana ?? 0)}
                    onValueChange={(val) => setFormData(prev => ({
                      ...prev,
                      config_recorrencia: { ...prev.config_recorrencia, dia_semana: parseInt(val) }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIAS_SEMANA.map(d => (
                        <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="ano_aplicacao">Ano de Aplicação (opcional)</Label>
              <Input
                id="ano_aplicacao"
                type="number"
                value={formData.ano_aplicacao || ""}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  ano_aplicacao: e.target.value ? parseInt(e.target.value) : null 
                }))}
                placeholder="Ex: 2025 (deixe vazio para todos os anos)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {selectedTema ? "Salvar alterações" : "Criar tema"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import File Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
        setIsImportDialogOpen(open);
        if (!open) {
          setImportFile(null);
          setImportResult(null);
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Importar Temas de Arquivo</DialogTitle>
            <DialogDescription>
              Selecione um arquivo JSON exportado anteriormente
            </DialogDescription>
          </DialogHeader>
          
          {importResult ? (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2 text-green-600">
                <Check className="h-5 w-5" />
                <span className="font-medium">Importação concluída!</span>
              </div>
              <div className="space-y-2">
                <p>✅ {importResult.total_importados} tema(s) importado(s)</p>
                <p>⏭️ {importResult.total_ignorados} tema(s) ignorado(s) (já existentes)</p>
                {importResult.erros.length > 0 && (
                  <div className="text-red-600">
                    <p>❌ {importResult.erros.length} erro(s):</p>
                    <ul className="list-disc list-inside text-sm">
                      {importResult.erros.map((erro, i) => (
                        <li key={i}>{erro}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="file">Arquivo JSON</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".json"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="sobrescrever"
                  checked={sobrescreverExistentes}
                  onCheckedChange={setSobrescreverExistentes}
                />
                <Label htmlFor="sobrescrever">
                  Sobrescrever temas existentes com mesmo título
                </Label>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              {importResult ? "Fechar" : "Cancelar"}
            </Button>
            {!importResult && (
              <Button onClick={handleImportFile} disabled={!importFile || importing}>
                {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Importar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={(open) => {
        setIsTemplateDialogOpen(open);
        if (!open) {
          setSelectedTemplateId("");
          setImportResult(null);
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Importar Template Pré-definido</DialogTitle>
            <DialogDescription>
              Escolha um template para importar temas prontos
            </DialogDescription>
          </DialogHeader>
          
          {importResult ? (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2 text-green-600">
                <Check className="h-5 w-5" />
                <span className="font-medium">Importação concluída!</span>
              </div>
              <div className="space-y-2">
                <p>✅ {importResult.total_importados} tema(s) importado(s)</p>
                <p>⏭️ {importResult.total_ignorados} tema(s) ignorado(s) (já existentes)</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-3">
                {templatesPredefinidos.map((template) => (
                  <Card 
                    key={template.id}
                    className={`cursor-pointer transition-colors ${
                      selectedTemplateId === template.id ? "border-primary" : ""
                    }`}
                    onClick={() => setSelectedTemplateId(template.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{template.nome}</h4>
                          <p className="text-sm text-muted-foreground">
                            {template.descricao}
                          </p>
                        </div>
                        <Badge variant="secondary">{template.total_temas} temas</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="sobrescrever-template"
                  checked={sobrescreverExistentes}
                  onCheckedChange={setSobrescreverExistentes}
                />
                <Label htmlFor="sobrescrever-template">
                  Sobrescrever temas existentes
                </Label>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
              {importResult ? "Fechar" : "Cancelar"}
            </Button>
            {!importResult && (
              <Button onClick={handleImportTemplate} disabled={!selectedTemplateId || importing}>
                {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Importar Template
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!temaToDelete} onOpenChange={(open) => !open && setTemaToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tema</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o tema &quot;{temaToDelete?.titulo}&quot;?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
