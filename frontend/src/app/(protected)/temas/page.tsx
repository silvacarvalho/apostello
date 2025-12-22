"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  BookOpen,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthStore, isPregador, isAdmin, isPastor } from "@/stores/auth-store";

// Mock data
const mockTemas = [
  {
    id: 1,
    titulo: "O Amor de Deus",
    descricao: "Estudo sobre o amor incondicional de Deus pela humanidade",
    vezes_usado: 5,
    ultima_vez: "2024-01-07",
    ativo: true,
  },
  {
    id: 2,
    titulo: "Fé em Tempos Difíceis",
    descricao: "Como manter a fé durante as tribulações",
    vezes_usado: 3,
    ultima_vez: "2023-12-17",
    ativo: true,
  },
  {
    id: 3,
    titulo: "A Segunda Vinda de Cristo",
    descricao: "Estudos sobre os sinais e a preparação para a volta de Jesus",
    vezes_usado: 2,
    ultima_vez: "2023-11-19",
    ativo: true,
  },
  {
    id: 4,
    titulo: "O Sábado",
    descricao: "A importância e santidade do dia de descanso",
    vezes_usado: 4,
    ultima_vez: "2024-01-14",
    ativo: true,
  },
  {
    id: 5,
    titulo: "Mordomia Cristã",
    descricao: "Administração dos dons e recursos dados por Deus",
    vezes_usado: 1,
    ultima_vez: null,
    ativo: false,
  },
];

export default function TemasPage() {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTema, setSelectedTema] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const canManage = isPregador(user) || isAdmin(user) || isPastor(user);

  if (!canManage) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">
          Você não tem permissão para acessar esta página.
        </p>
      </div>
    );
  }

  const filteredTemas = mockTemas.filter(
    (tema) =>
      tema.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tema.descricao?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleView = (tema: any) => {
    setSelectedTema(tema);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (tema: any) => {
    setSelectedTema(tema);
    setIsCreateDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-8 w-8" />
            Meus Temas
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie seus temas de pregação
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Tema
        </Button>
      </div>

      {/* Search */}
      <div className="relative w-full md:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar temas..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
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
                <p className="text-2xl font-bold">{mockTemas.length}</p>
                <p className="text-sm text-muted-foreground">Total de Temas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <BookOpen className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {mockTemas.filter((t) => t.ativo).length}
                </p>
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
                <p className="text-2xl font-bold">
                  {mockTemas.reduce((acc, t) => acc + t.vezes_usado, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total de Usos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead className="hidden md:table-cell">Descrição</TableHead>
                <TableHead className="text-center">Usado</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <p className="text-muted-foreground">
                      Nenhum tema encontrado
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTemas.map((tema) => (
                  <TableRow key={tema.id}>
                    <TableCell>
                      <span className="font-medium">{tema.titulo}</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-[300px] truncate text-muted-foreground">
                      {tema.descricao}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{tema.vezes_usado}x</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tema.ativo ? "default" : "secondary"}>
                        {tema.ativo ? "Ativo" : "Inativo"}
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
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
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

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{selectedTema?.titulo}</DialogTitle>
            <DialogDescription>
              Usado {selectedTema?.vezes_usado} vezes
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">{selectedTema?.descricao}</p>
            {selectedTema?.ultima_vez && (
              <p className="text-sm text-muted-foreground mt-4">
                Última vez usado em:{" "}
                {new Date(selectedTema.ultima_vez).toLocaleDateString("pt-BR")}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setSelectedTema(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
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
              <Label htmlFor="titulo">Título</Label>
              <Input
                id="titulo"
                defaultValue={selectedTema?.titulo}
                placeholder="Ex: O Amor de Deus"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <textarea
                id="descricao"
                defaultValue={selectedTema?.descricao}
                placeholder="Descreva brevemente o tema..."
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setSelectedTema(null);
              }}
            >
              Cancelar
            </Button>
            <Button>
              {selectedTema ? "Salvar alterações" : "Criar tema"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
