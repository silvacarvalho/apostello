"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Church,
  MapPin,
  User,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

interface Usuario {
  id: number;
  nome_completo: string;
  email: string;
  cpf: string;
  telefone: string;
  whatsapp: string | null;
  foto_url: string | null;
  tipo: string;
  data_nascimento: string;
  data_solicitacao_cadastro: string | null;
  data_aprovacao: string | null;
  status_aprovacao: string;
  motivo_recusa: string | null;
  distrito_id: number;
  igreja_id: number;
  distrito?: {
    id: number;
    nome: string;
  };
  igreja?: {
    id: number;
    nome: string;
  };
  pode_pregar: boolean;
  pode_cantar: boolean;
  score_atual: number | null;
  contador_total_participacoes: number;
  contador_faltas: number;
  contador_desmarcacoes: number;
}

export default function UsuarioDetalhesPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReaproving, setIsReaproving] = useState(false);
  const [showReaprovarDialog, setShowReaprovarDialog] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadUsuario();
    }
  }, [params.id]);

  const loadUsuario = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get(`/api/v1/usuarios/${params.id}`);
      setUsuario(response);
    } catch (error: any) {
      console.error("Erro ao carregar usuário:", error);
      setError(error.message || "Erro ao carregar dados do usuário");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReaprovar = async () => {
    if (!usuario) return;

    try {
      setIsReaproving(true);
      setShowReaprovarDialog(false);
      await api.post(`/api/v1/usuarios/${usuario.id}/reaprovar`);
      toast({
        title: "Sucesso",
        description: "Cadastro reaprovado com sucesso!",
      });
      // Recarregar dados
      loadUsuario();
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const formatCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  const formatPhone = (phone: string) => {
    if (!phone) return "-";
    if (phone.length === 11) {
      return phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    return phone.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  };

  const getTipoLabel = (tipo: string) => {
    const tipos: Record<string, string> = {
      PREGADOR: "Pregador",
      CANTOR: "Cantor",
      MEMBRO: "Membro",
      PASTOR_DISTRITAL: "Pastor Distrital",
      LIDER_DISTRITAL: "Líder Distrital",
      ADMIN: "Administrador",
    };
    return tipos[tipo] || tipo;
  };

  const getStatusLabel = (status: string) => {
    const statuses: Record<string, { label: string; color: string; icon: any }> = {
      PENDENTE_APROVACAO: {
        label: "Pendente de Aprovação",
        color: "bg-yellow-500",
        icon: Clock,
      },
      APROVADO: {
        label: "Aprovado",
        color: "bg-green-500",
        icon: CheckCircle,
      },
      RECUSADO: {
        label: "Recusado",
        color: "bg-red-500",
        icon: XCircle,
      },
    };
    return statuses[status] || { label: status, color: "bg-gray-500", icon: AlertCircle };
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

  if (error || !usuario) {
    return (
      <div className="container mx-auto py-8">
        <Card className="border-destructive">
          <CardContent className="py-8">
            <div className="text-center text-destructive">
              <AlertCircle className="mx-auto h-12 w-12 mb-4" />
              <p className="text-lg font-semibold mb-2">Erro ao carregar usuário</p>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = getStatusLabel(usuario.status_aprovacao);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Coluna Principal - Informações Pessoais */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={usuario.foto_url || undefined} />
                  <AvatarFallback className="text-2xl">
                    {usuario.nome_completo.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-2xl mb-2">
                    {usuario.nome_completo}
                  </CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{getTipoLabel(usuario.tipo)}</Badge>
                    {usuario.pode_pregar && (
                      <Badge variant="secondary">Pregador</Badge>
                    )}
                    {usuario.pode_cantar && (
                      <Badge variant="secondary">Cantor</Badge>
                    )}
                    <Badge className={statusInfo.color}>
                      <StatusIcon className="mr-1 h-3 w-3" />
                      {statusInfo.label}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="font-medium">E-mail</span>
                  </div>
                  <p className="text-sm">{usuario.email}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span className="font-medium">CPF</span>
                  </div>
                  <p className="text-sm">{formatCPF(usuario.cpf)}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span className="font-medium">Telefone</span>
                  </div>
                  <p className="text-sm">{formatPhone(usuario.telefone)}</p>
                </div>

                {usuario.whatsapp && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span className="font-medium">WhatsApp</span>
                    </div>
                    <p className="text-sm">{formatPhone(usuario.whatsapp)}</p>
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">Data de Nascimento</span>
                  </div>
                  <p className="text-sm">{formatDate(usuario.data_nascimento)}</p>
                </div>

                {usuario.distrito && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="font-medium">Distrito</span>
                    </div>
                    <p className="text-sm">{usuario.distrito.nome}</p>
                  </div>
                )}

                {usuario.igreja && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Church className="h-4 w-4" />
                      <span className="font-medium">Igreja</span>
                    </div>
                    <p className="text-sm">{usuario.igreja.nome}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Motivo de Recusa */}
          {usuario.status_aprovacao === "RECUSADO" && usuario.motivo_recusa && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <XCircle className="h-5 w-5" />
                  Motivo da Recusa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-destructive/10 p-4 rounded-md">
                  <p className="text-sm">{usuario.motivo_recusa}</p>
                </div>
                <Button
                  onClick={() => setShowReaprovarDialog(true)}
                  disabled={isReaproving}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isReaproving ? "animate-spin" : ""}`} />
                  {isReaproving ? "Reaprovando..." : "Reaprovar Cadastro"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Coluna Lateral - Estatísticas e Datas */}
        <div className="space-y-6">
          {/* Datas Importantes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Datas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {usuario.data_solicitacao_cadastro && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Solicitação de Cadastro
                  </p>
                  <p className="text-sm">{formatDate(usuario.data_solicitacao_cadastro)}</p>
                </div>
              )}

              {usuario.data_aprovacao && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      {usuario.status_aprovacao === "APROVADO" ? "Data de Aprovação" : "Data de Recusa"}
                    </p>
                    <p className="text-sm">{formatDate(usuario.data_aprovacao)}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Estatísticas (apenas para pregadores/cantores) */}
          {(usuario.pode_pregar || usuario.pode_cantar) && usuario.status_aprovacao === "APROVADO" && (
            <Card>
              <CardHeader>
                <CardTitle>Estatísticas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {usuario.score_atual !== null && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Score Atual</p>
                    <p className="text-2xl font-bold">{usuario.score_atual.toFixed(2)}</p>
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Participações</span>
                    <span className="font-medium">{usuario.contador_total_participacoes}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Faltas</span>
                    <span className="font-medium text-destructive">{usuario.contador_faltas}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Desmarcações</span>
                    <span className="font-medium text-orange-600">{usuario.contador_desmarcacoes}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <AlertDialog open={showReaprovarDialog} onOpenChange={setShowReaprovarDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Reaprovação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja reaprovar este cadastro? O usuário voltará ao status ATIVO e APROVADO.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReaprovar} className="bg-green-600 hover:bg-green-700">
              Reaprovar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
