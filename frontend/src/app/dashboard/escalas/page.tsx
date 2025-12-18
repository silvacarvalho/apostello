"use client";

import { useState } from "react";
import {
  Calendar,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Send,
  Download,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore, isAdmin, isPastor } from "@/stores/auth-store";
import { formatDate, getStatusColor } from "@/lib/utils";

// Mock data
const escalas = [
  {
    id: 1,
    titulo: "Escala Janeiro 2024",
    distrito: "Distrito Sul",
    data_inicio: "2024-01-01",
    data_fim: "2024-01-31",
    status: "PUBLICADA",
    itens: 24,
  },
  {
    id: 2,
    titulo: "Escala Fevereiro 2024",
    distrito: "Distrito Sul",
    data_inicio: "2024-02-01",
    data_fim: "2024-02-29",
    status: "RASCUNHO",
    itens: 20,
  },
  {
    id: 3,
    titulo: "Escala Dezembro 2023",
    distrito: "Distrito Sul",
    data_inicio: "2023-12-01",
    data_fim: "2023-12-31",
    status: "PUBLICADA",
    itens: 28,
  },
];

const minhasEscalas = [
  {
    id: 1,
    data: "2024-01-15",
    horario: "19:00",
    igreja: "Igreja Central",
    tipo: "Pregação",
    status: "CONFIRMADO",
    tema: "A fé que move montanhas",
  },
  {
    id: 2,
    data: "2024-01-22",
    horario: "10:00",
    igreja: "Igreja do Bairro Alto",
    tipo: "Louvor Especial",
    status: "PENDENTE",
    tema: null,
  },
  {
    id: 3,
    data: "2024-01-29",
    horario: "19:30",
    igreja: "Igreja Nova Esperança",
    tipo: "Pregação",
    status: "CONFIRMADO",
    tema: "O poder da oração",
  },
];

export default function EscalasPage() {
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const canManage = isAdmin(user) || isPastor(user);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Escalas
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie e visualize as escalas de pregação e louvor
          </p>
        </div>

        {canManage && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Escala
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Gerar Nova Escala</DialogTitle>
                <DialogDescription>
                  Configure os parâmetros para gerar uma nova escala automaticamente
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="titulo">Título</Label>
                  <Input id="titulo" placeholder="Ex: Escala Fevereiro 2024" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="data_inicio">Data Início</Label>
                    <Input id="data_inicio" type="date" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="data_fim">Data Fim</Label>
                    <Input id="data_fim" type="date" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="distrito">Distrito</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o distrito" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Distrito Sul</SelectItem>
                      <SelectItem value="2">Distrito Norte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Configurações</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="incluir_pregadores" defaultChecked />
                      <Label htmlFor="incluir_pregadores" className="font-normal">
                        Incluir pregadores
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="incluir_cantores" defaultChecked />
                      <Label htmlFor="incluir_cantores" className="font-normal">
                        Incluir cantores
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => setIsCreateDialogOpen(false)}>
                  Gerar Escala
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue={canManage ? "gerenciar" : "minhas"} className="space-y-4">
        <TabsList>
          <TabsTrigger value="minhas">Minhas Escalas</TabsTrigger>
          {canManage && <TabsTrigger value="gerenciar">Gerenciar</TabsTrigger>}
          <TabsTrigger value="calendario">Calendário</TabsTrigger>
        </TabsList>

        {/* Minhas Escalas */}
        <TabsContent value="minhas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Próximos Compromissos</CardTitle>
              <CardDescription>
                Seus agendamentos de pregação e louvor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {minhasEscalas.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors gap-4"
                  >
                    <div className="flex items-center gap-4">
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
                        <p className="font-medium">{item.igreja}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.tipo} • {item.horario}
                        </p>
                        {item.tema && (
                          <p className="text-sm text-primary mt-1">
                            Tema: {item.tema}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                      <Badge className={getStatusColor(item.status)}>
                        {item.status}
                      </Badge>
                      {item.status === "PENDENTE" && (
                        <Button size="sm">Confirmar</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gerenciar Escalas */}
        {canManage && (
          <TabsContent value="gerenciar" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar escala..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="PUBLICADA">Publicada</SelectItem>
                  <SelectItem value="RASCUNHO">Rascunho</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Distrito</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {escalas.map((escala) => (
                    <TableRow key={escala.id}>
                      <TableCell className="font-medium">
                        {escala.titulo}
                      </TableCell>
                      <TableCell>
                        {formatDate(escala.data_inicio)} - {formatDate(escala.data_fim)}
                      </TableCell>
                      <TableCell>{escala.distrito}</TableCell>
                      <TableCell>{escala.itens}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(escala.status)}>
                          {escala.status}
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
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            {escala.status === "RASCUNHO" && (
                              <DropdownMenuItem>
                                <Send className="h-4 w-4 mr-2" />
                                Publicar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              Exportar PDF
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        )}

        {/* Calendário */}
        <TabsContent value="calendario" className="space-y-4">
          <Card className="p-6">
            <div className="text-center text-muted-foreground py-12">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Visualização em calendário em desenvolvimento</p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
