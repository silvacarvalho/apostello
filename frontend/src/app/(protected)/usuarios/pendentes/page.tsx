"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, UserX, Building2, Loader2, Users, ArrowLeft } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

interface UsuarioPendente {
  id: number;
  nome_completo: string;
  email: string;
  foto_url: string | null;
  tipo: string;
  igreja_id: number | null;
  igreja?: {
    id: number;
    nome: string;
  };
  data_solicitacao_cadastro: string;
}

interface Igreja {
  id: number;
  nome: string;
}

export default function UsuariosPendentesPage() {
  const [pendentes, setPendentes] = useState<UsuarioPendente[]>([]);
  const [igrejas, setIgrejas] = useState<Igreja[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UsuarioPendente | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [newIgrejaId, setNewIgrejaId] = useState<number | null>(null);
  const { user } = useAuthStore();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
      return;
    }

    fetchPendentes();
    fetchIgrejas();
  }, [user, router]);

  const fetchPendentes = async () => {
    try {
      const response = await api.get<UsuarioPendente[]>("/api/v1/usuarios/pendentes");
      setPendentes(response);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao carregar usuários pendentes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchIgrejas = async () => {
    try {
      const response = await api.get<{ items: Igreja[] }>("/api/v1/igrejas");
      setIgrejas(response.items || []);
    } catch (error) {
      console.error("Erro ao carregar igrejas:", error);
    }
  };

  const handleApprove = async (usuarioId: number, novaIgrejaId?: number) => {
    setProcessing(usuarioId);
    try {
      const params = novaIgrejaId ? `?nova_igreja_id=${novaIgrejaId}` : "";
      await api.post(`/api/v1/usuarios/${usuarioId}/aprovar${params}`, {});

      toast({
        title: "Usuário aprovado!",
        description: "O usuário foi aprovado e receberá uma notificação.",
      });

      // Remover da lista
      setPendentes((prev) => prev.filter((u) => u.id !== usuarioId));
      setShowApproveDialog(false);
      setSelectedUser(null);
      setNewIgrejaId(null);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao aprovar usuário",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!selectedUser || !rejectReason || rejectReason.length < 10) {
      toast({
        title: "Erro",
        description: "Informe um motivo com no mínimo 10 caracteres",
        variant: "destructive",
      });
      return;
    }

    setProcessing(selectedUser.id);
    try {
      await api.post(`/api/v1/usuarios/${selectedUser.id}/recusar?motivo=${encodeURIComponent(rejectReason)}`, {});

      toast({
        title: "Usuário recusado",
        description: "O usuário foi recusado e receberá uma notificação.",
      });

      // Remover da lista
      setPendentes((prev) => prev.filter((u) => u.id !== selectedUser.id));
      setShowRejectDialog(false);
      setSelectedUser(null);
      setRejectReason("");
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao recusar usuário",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const openApproveDialog = (usuario: UsuarioPendente) => {
    setSelectedUser(usuario);
    setNewIgrejaId(usuario.igreja_id || null);
    setShowApproveDialog(true);
  };

  const openRejectDialog = (usuario: UsuarioPendente) => {
    setSelectedUser(usuario);
    setShowRejectDialog(true);
  };

  const getInitials = (nome: string) => {
    return nome
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-8 w-8" />
          Cadastros Pendentes de Aprovação
        </h1>
        <p className="text-muted-foreground mt-2">
          Gerencie as solicitações de cadastro de novos membros
        </p>
      </div>

      {pendentes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">
              Nenhum cadastro pendente de aprovação
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pendentes.map((usuario) => (
            <Card key={usuario.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-6">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                  {/* Avatar e Info */}
                  <div className="flex items-center gap-4 flex-1">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={usuario.foto_url || undefined} alt={usuario.nome_completo} />
                      <AvatarFallback>{getInitials(usuario.nome_completo)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{usuario.nome_completo}</h3>
                      <p className="text-sm text-muted-foreground">{usuario.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">{usuario.tipo}</Badge>
                        {usuario.igreja && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            <span>{usuario.igreja.nome}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Solicitado em:{" "}
                        {new Date(usuario.data_solicitacao_cadastro).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-2 md:flex-col w-full md:w-auto">
                    <Button
                      onClick={() => handleApprove(usuario.id)}
                      disabled={processing === usuario.id}
                      className="flex-1 md:flex-none"
                      variant="default"
                    >
                      {processing === usuario.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <UserCheck className="h-4 w-4 mr-2" />
                      )}
                      Aprovar
                    </Button>
                    {usuario.tipo === "MEMBRO" && usuario.igreja && (
                      <Button
                        onClick={() => openApproveDialog(usuario)}
                        disabled={processing === usuario.id}
                        className="flex-1 md:flex-none"
                        variant="outline"
                      >
                        <Building2 className="h-4 w-4 mr-2" />
                        Alterar Igreja
                      </Button>
                    )}
                    <Button
                      onClick={() => openRejectDialog(usuario)}
                      disabled={processing === usuario.id}
                      className="flex-1 md:flex-none"
                      variant="destructive"
                    >
                      <UserX className="h-4 w-4 mr-2" />
                      Recusar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de Aprovação com Alteração de Igreja */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Cadastro</DialogTitle>
            <DialogDescription>
              Você pode aprovar o cadastro na igreja solicitada ou alterar para outra igreja do distrito.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedUser && (
              <>
                <div className="space-y-2">
                  <Label>Membro</Label>
                  <p className="text-sm font-medium">{selectedUser.nome_completo}</p>
                </div>
                <div className="space-y-2">
                  <Label>Igreja Solicitada</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedUser.igreja?.nome || "Não especificada"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nova_igreja">Aprovar em outra igreja (opcional)</Label>
                  <Select
                    value={newIgrejaId?.toString() || selectedUser.igreja_id?.toString()}
                    onValueChange={(value) => setNewIgrejaId(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a igreja" />
                    </SelectTrigger>
                    <SelectContent>
                      {igrejas.map((igreja) => (
                        <SelectItem key={igreja.id} value={igreja.id.toString()}>
                          {igreja.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowApproveDialog(false);
                setSelectedUser(null);
                setNewIgrejaId(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (selectedUser) {
                  handleApprove(selectedUser.id, newIgrejaId || undefined);
                }
              }}
              disabled={processing === selectedUser?.id}
            >
              {processing === selectedUser?.id ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <UserCheck className="h-4 w-4 mr-2" />
              )}
              Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Recusa */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recusar Cadastro</DialogTitle>
            <DialogDescription>
              Informe o motivo da recusa. O usuário receberá uma notificação com esta justificativa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo da Recusa</Label>
              <Textarea
                id="motivo"
                placeholder="Explique o motivo da recusa (mínimo 10 caracteres)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                minLength={10}
              />
              {rejectReason && rejectReason.length < 10 && (
                <p className="text-sm text-destructive">
                  Mínimo de 10 caracteres ({rejectReason.length}/10)
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setSelectedUser(null);
                setRejectReason("");
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing === selectedUser?.id || rejectReason.length < 10}
            >
              {processing === selectedUser?.id ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <UserX className="h-4 w-4 mr-2" />
              )}
              Recusar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
