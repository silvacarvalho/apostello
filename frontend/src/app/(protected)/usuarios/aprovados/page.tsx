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
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { CheckCircle2, Calendar, Church, User, Eye, ArrowLeft } from "lucide-react";

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
  distrito_id: number;
  igreja_id: number;
  igreja?: {
    id: number;
    nome: string;
  };
  pode_pregar: boolean;
  pode_cantar: boolean;
}

export default function UsuariosAprovadosPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUsuarios();
  }, []);

  const loadUsuarios = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<Usuario[]>("/api/v1/usuarios/aprovados");
      setUsuarios(response);
    } catch (error) {
      console.error("Erro ao carregar usuários aprovados:", error);
    } finally {
      setIsLoading(false);
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
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.back()} className="-ml-3">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>

      <PageHeader
        title="Cadastros Aprovados"
        description="Lista de todos os cadastros que foram aprovados"
        icon={<CheckCircle2 className="h-5 w-5" />}
      />

      {usuarios.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="h-6 w-6" />}
          title="Nenhum cadastro aprovado encontrado."
        />
      ) : (
        <>
          {/* Lista (celular) */}
          <div className="space-y-3 md:hidden">
            {usuarios.map((usuario) => (
              <Card key={usuario.id}>
                <CardContent className="flex items-center gap-3 p-4">
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarImage src={usuario.foto_url || undefined} />
                    <AvatarFallback>
                      {usuario.nome_completo.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{usuario.nome_completo}</p>
                    <p className="truncate text-sm text-muted-foreground">{usuario.email}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <Badge variant="success">Aprovado</Badge>
                      {usuario.igreja && (
                        <span className="flex items-center gap-1">
                          <Church className="h-3 w-3" />
                          {usuario.igreja.nome}
                        </span>
                      )}
                      <span>{formatDate(usuario.data_aprovacao)}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Ver perfil"
                    onClick={() => router.push(`/usuarios/${usuario.id}`)}
                  >
                    <Eye className="h-5 w-5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tabela (desktop) */}
          <Card className="hidden overflow-hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Igreja</TableHead>
                    <TableHead>Data Aprovação</TableHead>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/usuarios/${usuario.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
