"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { XCircle, Calendar, Church, User, AlertCircle, Eye, CheckCircle, ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useToast } from "@/hooks/use-toast";

interface Usuario {
  id: number;
  nome_completo: string;
  email: string;
  cpf: string;
  telefone: string;
  foto_url: string | null;
  tipo: string;
  data_nascimento: string;
  data_aprovacao: string;
  motivo_recusa: string | null;
  distrito_id: number;
  igreja_id: number;
  igreja?: {
    id: number;
    nome: string;
  };
  pode_pregar: boolean;
  pode_cantar: boolean;
}

export default function UsuariosRecusadosPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMotivo, setSelectedMotivo] = useState<string | null>(null);
  const [isReaproving, setIsReaproving] = useState(false);
  const [usuarioToReaprovar, setUsuarioToReaprovar] = useState<number | null>(null);

  useEffect(() => {
    loadUsuarios();
  }, []);

  const loadUsuarios = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/api/v1/usuarios/recusados");
      setUsuarios(response);
    } catch (error) {
      console.error("Erro ao carregar usuários recusados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmReaprovar = async () => {
    if (!usuarioToReaprovar) return;

    try {
      setIsReaproving(true);
      setUsuarioToReaprovar(null);
      await api.post(`/api/v1/usuarios/${usuarioToReaprovar}/reaprovar`);
      toast({
        title: "Sucesso",
        description: "Cadastro reaprovado com sucesso!",
      });
      // Recarregar lista
      loadUsuarios();
    } catch (error: any) {
      console.error("Erro ao reaprovar usuário:", error);
      toast({
        title: "Erro ao reaprovar",
        description: error.message || "Não foi possível reaprovar o cadastro",
        variant: "destructive",
      });
    } finally {
      setIsReaproving(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const getTipoLabel = (tipo: string) => {
    const tipos: Record<string, string> = {
      PREGADOR: "Pregador",
      CANTOR: "Cantor",
      MEMBRO: "Membro",
      PASTOR_DISTRITAL: "Pastor Distrital",
      LIDER_DISTRITAL: "Líder Distrital",
    };
    return tipos[tipo] || tipo;
  };

  const getTipoColor = (tipo: string) => {
    const colors: Record<string, string> = {
      PREGADOR: "bg-blue-500",
      CANTOR: "bg-purple-500",
      MEMBRO: "bg-green-500",
      PASTOR_DISTRITAL: "bg-orange-500",
      LIDER_DISTRITAL: "bg-yellow-500",
    };
    return colors[tipo] || "bg-gray-500";
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Cadastros Recusados</h1>
        <p className="text-muted-foreground">
          Lista de todos os cadastros que foram recusados
        </p>
      </div>

      {usuarios.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <XCircle className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Nenhum cadastro recusado encontrado.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Igreja</TableHead>
                  <TableHead>Data Recusa</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map((usuario) => (
                  <TableRow key={usuario.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={usuario.foto_url || undefined} />
                          <AvatarFallback>
                            {usuario.nome_completo.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="font-medium">{usuario.nome_completo}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {usuario.email}
                    </TableCell>
                    <TableCell className="text-sm">
                      {usuario.igreja ? usuario.igreja.nome : "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(usuario.data_aprovacao)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-600 hover:text-green-700 border-green-200 hover:border-green-300"
                          onClick={() => setUsuarioToReaprovar(usuario.id)}
                          disabled={isReaproving}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Reaprovar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/usuarios/${usuario.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedMotivo} onOpenChange={() => setSelectedMotivo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo da Recusa</DialogTitle>
            <DialogDescription>
              Motivo informado pelo pastor ao recusar o cadastro:
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted p-4 rounded-md">
            <p className="text-sm">{selectedMotivo}</p>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!usuarioToReaprovar} onOpenChange={() => setUsuarioToReaprovar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Reaprovação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja reaprovar este cadastro? O usuário voltará ao status ATIVO e APROVADO.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReaprovar} className="bg-green-600 hover:bg-green-700">
              Reaprovar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
