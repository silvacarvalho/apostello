"use client";

import { useState } from "react";
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
import { useAuthStore, isAdmin, isPastor } from "@/stores/auth-store";
import { getStatusColor, getDayOfWeek } from "@/lib/utils";

// Mock data
const igrejas = [
  {
    id: 1,
    nome: "Igreja Central",
    distrito: "Distrito Sul",
    endereco: "Rua Principal, 100 - Centro",
    status: "ATIVO",
    horarios: [
      { dia: 0, horario: "10:00" },
      { dia: 0, horario: "19:00" },
      { dia: 3, horario: "19:30" },
    ],
  },
  {
    id: 2,
    nome: "Igreja do Bairro Alto",
    distrito: "Distrito Sul",
    endereco: "Av. das Flores, 250 - Bairro Alto",
    status: "ATIVO",
    horarios: [
      { dia: 0, horario: "09:00" },
      { dia: 0, horario: "18:00" },
      { dia: 4, horario: "19:00" },
    ],
  },
  {
    id: 3,
    nome: "Igreja Nova Esperança",
    distrito: "Distrito Sul",
    endereco: "Rua da Paz, 50 - Jardim Esperança",
    status: "ATIVO",
    horarios: [
      { dia: 0, horario: "10:00" },
      { dia: 0, horario: "19:30" },
    ],
  },
];

export default function IgrejasPage() {
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const canManage = isAdmin(user) || isPastor(user);

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

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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
                <Label htmlFor="nome">Nome da Igreja</Label>
                <Input id="nome" placeholder="Ex: Igreja Central" />
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
                <Label htmlFor="endereco">Endereço</Label>
                <Input id="endereco" placeholder="Rua, número - Bairro" />
              </div>
              <div className="grid gap-2">
                <Label>Horários de Culto</Label>
                <div className="text-sm text-muted-foreground">
                  Os horários de culto podem ser adicionados após o cadastro.
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => setIsCreateDialogOpen(false)}>
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
        <Select>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Distrito" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="1">Distrito Sul</SelectItem>
            <SelectItem value="2">Distrito Norte</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {igrejas.map((igreja) => (
          <Card key={igreja.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{igreja.nome}</CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" />
                    {igreja.endereco}
                  </CardDescription>
                </div>
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
                      Ver Detalhes
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Clock className="h-4 w-4 mr-2" />
                      Gerenciar Horários
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Distrito</span>
                  <Badge variant="outline">{igreja.distrito}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge className={getStatusColor(igreja.status)}>
                    {igreja.status}
                  </Badge>
                </div>
                <div className="pt-3 border-t">
                  <p className="text-sm font-medium mb-2 flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Horários de Culto
                  </p>
                  <div className="space-y-1">
                    {igreja.horarios.map((horario, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-muted-foreground">
                          {getDayOfWeek(horario.dia)}
                        </span>
                        <span className="font-medium">{horario.horario}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
