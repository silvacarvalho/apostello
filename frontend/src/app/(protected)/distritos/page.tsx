"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  Building2,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
  Church,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuthStore, isAdmin, isAssociacao } from "@/stores/auth-store";
import { getInitials } from "@/lib/utils";

// Mock data
const mockDistritos = [
  {
    id: 1,
    nome: "Distrito Central",
    pastor: { id: 1, nome: "Pr. João Silva", foto_url: null },
    lider: { id: 2, nome: "José Santos", foto_url: null },
    igrejas: 5,
    pregadores: 12,
    cantores: 8,
    ativo: true,
  },
  {
    id: 2,
    nome: "Distrito Norte",
    pastor: { id: 3, nome: "Pr. Carlos Lima", foto_url: null },
    lider: { id: 4, nome: "Maria Costa", foto_url: null },
    igrejas: 4,
    pregadores: 8,
    cantores: 6,
    ativo: true,
  },
  {
    id: 3,
    nome: "Distrito Sul",
    pastor: { id: 5, nome: "Pr. Pedro Alves", foto_url: null },
    lider: null,
    igrejas: 3,
    pregadores: 6,
    cantores: 4,
    ativo: true,
  },
  {
    id: 4,
    nome: "Distrito Oeste",
    pastor: null,
    lider: null,
    igrejas: 0,
    pregadores: 0,
    cantores: 0,
    ativo: false,
  },
];

const mockPastores = [
  { id: 1, nome: "Pr. João Silva" },
  { id: 3, nome: "Pr. Carlos Lima" },
  { id: 5, nome: "Pr. Pedro Alves" },
];

const mockLideres = [
  { id: 2, nome: "José Santos" },
  { id: 4, nome: "Maria Costa" },
  { id: 6, nome: "Ana Oliveira" },
];

export default function DistritosPage() {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedDistrito, setSelectedDistrito] = useState<any>(null);

  const canManage = isAdmin(user) || isAssociacao(user);

  const filteredDistritos = mockDistritos.filter((distrito) =>
    distrito.nome.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <PageHeader
        title="Distritos"
        description="Gerencie os distritos da organização"
        icon={<Building2 className="h-5 w-5" />}
        actions={
          <Button onClick={() => setIsCreateDialogOpen(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Novo Distrito
          </Button>
        }
      />

      {/* Search */}
      <div className="relative w-full md:max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar distritos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 shadow-soft"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {[
          { label: "Distritos Ativos", value: mockDistritos.filter((d) => d.ativo).length, icon: Building2 },
          { label: "Total de Igrejas", value: mockDistritos.reduce((acc, d) => acc + d.igrejas, 0), icon: Church },
          { label: "Pregadores", value: mockDistritos.reduce((acc, d) => acc + d.pregadores, 0), icon: Users },
          { label: "Cantores", value: mockDistritos.reduce((acc, d) => acc + d.cantores, 0), icon: Users },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-center gap-3 p-4 sm:p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <item.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold leading-none">{item.value}</p>
                <p className="mt-1 text-xs leading-tight text-muted-foreground">{item.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Grid */}
      {filteredDistritos.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-6 w-6" />}
          title="Nenhum distrito encontrado"
          description="Ajuste a busca para ver outros resultados."
        />
      ) : (
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredDistritos.map((distrito) => (
          <Card key={distrito.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="truncate text-lg">{distrito.nome}</CardTitle>
                    <Badge
                      variant={distrito.ativo ? "success" : "secondary"}
                      className="mt-1.5"
                    >
                      {distrito.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Ações" className="shrink-0">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setSelectedDistrito(distrito)}
                    >
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
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pastor */}
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={distrito.pastor?.foto_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {distrito.pastor ? getInitials(distrito.pastor.nome) : "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Pastor</p>
                  <p className="truncate text-sm font-medium">
                    {distrito.pastor?.nome || "Não definido"}
                  </p>
                </div>
              </div>

              {/* Líder */}
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={distrito.lider?.foto_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {distrito.lider ? getInitials(distrito.lider.nome) : "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Líder</p>
                  <p className="truncate text-sm font-medium">
                    {distrito.lider?.nome || "Não definido"}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Church className="h-4 w-4" />
                  {distrito.igrejas} igrejas
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {distrito.pregadores + distrito.cantores} pessoas
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateDialogOpen || !!selectedDistrito}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setSelectedDistrito(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {selectedDistrito ? "Editar Distrito" : "Novo Distrito"}
            </DialogTitle>
            <DialogDescription>
              {selectedDistrito
                ? "Atualize as informações do distrito"
                : "Preencha as informações para criar um novo distrito"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Distrito</Label>
              <Input
                id="nome"
                defaultValue={selectedDistrito?.nome}
                placeholder="Ex: Distrito Central"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pastor">Pastor Distrital</Label>
              <Select defaultValue={selectedDistrito?.pastor?.id?.toString()}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o pastor" />
                </SelectTrigger>
                <SelectContent>
                  {mockPastores.map((pastor) => (
                    <SelectItem key={pastor.id} value={pastor.id.toString()}>
                      {pastor.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lider">Líder Distrital</Label>
              <Select defaultValue={selectedDistrito?.lider?.id?.toString()}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o líder" />
                </SelectTrigger>
                <SelectContent>
                  {mockLideres.map((lider) => (
                    <SelectItem key={lider.id} value={lider.id.toString()}>
                      {lider.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setSelectedDistrito(null);
              }}
            >
              Cancelar
            </Button>
            <Button>
              {selectedDistrito ? "Salvar alterações" : "Criar distrito"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
