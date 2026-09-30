"use client";

import { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Settings, User, Bell, Lock, Palette, Save, Loader2, Building2, Upload, Trash2, Info } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore, getUserRole, isPastor, type User as AuthUser } from "@/stores/auth-store";
import { useToast } from "@/hooks/use-toast";
import { getInitials, formatCPF, formatPhone } from "@/lib/utils";
import { api } from "@/lib/api";
import { ConfiguracoesDistritoTab } from "@/components/configuracoes-distrito-tab";
import { HorariosCultosTab } from "@/components/horarios-cultos-tab";

export default function ConfiguracoesPage() {
  const { user, setUser } = useAuthStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingFoto, setIsUploadingFoto] = useState(false);
  const [fotoPreview, setFotoPreview] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Verifica se o usuário pode ver a aba Distrito (apenas Pastor/Líder Distrital)
  const canSeeDistritoTab = isPastor(user);

  // Estados do formulário de perfil
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [telefone, setTelefone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");

  // Estados das preferências de notificação
  const [isLoadingNotif, setIsLoadingNotif] = useState(false);
  const [novasEscalas, setNovasEscalas] = useState(true);
  const [escalasAtribuidas, setEscalasAtribuidas] = useState(true);
  const [lembretes, setLembretes] = useState(true);
  const [avaliacoes, setAvaliacoes] = useState(true);
  const [trocasEscalas, setTrocasEscalas] = useState(true);
  const [substituicoes, setSubstituicoes] = useState(true);
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);
  const [whatsappNotif, setWhatsappNotif] = useState(false);

  // Estados para alteração de senha
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [isLoadingSenha, setIsLoadingSenha] = useState(false);

  // Estados para aparência
  const { theme, setTheme } = useTheme();
  const [idioma, setIdioma] = useState("pt-BR");
  const [mounted, setMounted] = useState(false);

  const loadPreferenciasNotificacao = async () => {
    try {
      const response = await api.get<{
        novas_escalas: boolean;
        escalas_atribuidas: boolean;
        lembretes: boolean;
        avaliacoes: boolean;
        trocas_escalas: boolean;
        substituicoes: boolean;
        email: boolean;
        push: boolean;
        sms?: boolean;
        whatsapp: boolean;
      }>("/api/v1/perfil/me/notificacoes");
      setNovasEscalas(response.novas_escalas);
      setEscalasAtribuidas(response.escalas_atribuidas);
      setLembretes(response.lembretes);
      setAvaliacoes(response.avaliacoes);
      setTrocasEscalas(response.trocas_escalas);
      setSubstituicoes(response.substituicoes);
      setEmailNotif(response.email);
      setPushNotif(response.push);
      setSmsNotif(response.sms || false);
      setWhatsappNotif(response.whatsapp);
    } catch (error) {
      console.error("Erro ao carregar preferências:", error);
    }
  };

  useEffect(() => {
    setMounted(true);
    const savedIdioma = localStorage.getItem("idioma") || "pt-BR";
    setIdioma(savedIdioma);
  }, []);

  useEffect(() => {
    if (user) {
      setNomeCompleto(user.nome_completo || "");
      setTelefone(user.telefone || "");
      setWhatsapp(user.whatsapp || "");
      setDataNascimento(user.data_nascimento || "");
      
      if (user.foto_url && user.id) {
        setFotoPreview(`/api/v1/perfil/foto/${user.id}?t=${Date.now()}`);
      }

      // Carregar preferências de notificação
      loadPreferenciasNotificacao();
    }
  }, [user]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await api.put<AuthUser>("/api/v1/perfil/me", {
        nome_completo: nomeCompleto,
        telefone: telefone || undefined,
        whatsapp: whatsapp || undefined,
        data_nascimento: dataNascimento || undefined,
      });

      setUser(response);
      
      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message || "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Formato inválido",
        description: "Use apenas JPG, PNG, GIF ou WEBP",
        variant: "destructive",
      });
      return;
    }

    // Validar tamanho (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "Tamanho máximo: 10MB",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploadingFoto(true);

      const formData = new FormData();
      formData.append("foto", file);

      const updatedUser = await api.upload<AuthUser>("/api/v1/perfil/me/foto", formData);
      setUser(updatedUser);
      setFotoPreview(`/api/v1/perfil/foto/${updatedUser.id}?t=${Date.now()}`);

      toast({
        title: "Foto atualizada!",
        description: "Sua foto de perfil foi atualizada com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao fazer upload",
        description: error.message || "Não foi possível fazer upload da foto",
        variant: "destructive",
      });
    } finally {
      setIsUploadingFoto(false);
    }
  };

  const handleDeleteFoto = async () => {
    try {
      setIsUploadingFoto(true);
      const response = await api.delete<AuthUser>("/api/v1/perfil/me/foto");
      setUser(response);
      setFotoPreview(undefined);

      toast({
        title: "Foto removida",
        description: "Sua foto de perfil foi removida.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao remover foto",
        description: error.message || "Não foi possível remover a foto",
        variant: "destructive",
      });
    } finally {
      setIsUploadingFoto(false);
    }
  };

  const handleSaveNotificacoes = async () => {
    try {
      setIsLoadingNotif(true);
      await api.put("/api/v1/perfil/me/notificacoes", {
        novas_escalas: novasEscalas,
        escalas_atribuidas: escalasAtribuidas,
        lembretes: lembretes,
        avaliacoes: avaliacoes,
        trocas_escalas: trocasEscalas,
        substituicoes: substituicoes,
        email: emailNotif,
        push: pushNotif,
        sms: smsNotif,
        whatsapp: whatsappNotif,
      });

      toast({
        title: "Preferências salvas!",
        description: "Suas preferências de notificação foram atualizadas.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar as preferências",
        variant: "destructive",
      });
    } finally {
      setIsLoadingNotif(false);
    }
  };

  const handleAlterarSenha = async () => {
    // Validações
    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos de senha",
        variant: "destructive",
      });
      return;
    }

    if (novaSenha !== confirmarSenha) {
      toast({
        title: "Senhas não coincidem",
        description: "A nova senha e a confirmação devem ser iguais",
        variant: "destructive",
      });
      return;
    }

    if (novaSenha.length < 8) {
      toast({
        title: "Senha muito curta",
        description: "A nova senha deve ter no mínimo 8 caracteres",
        variant: "destructive",
      });
      return;
    }

    // Validar requisitos de senha forte
    if (!/[A-Z]/.test(novaSenha)) {
      toast({
        title: "Senha fraca",
        description: "A senha deve conter ao menos uma letra maiúscula",
        variant: "destructive",
      });
      return;
    }

    if (!/[a-z]/.test(novaSenha)) {
      toast({
        title: "Senha fraca",
        description: "A senha deve conter ao menos uma letra minúscula",
        variant: "destructive",
      });
      return;
    }

    if (!/\d/.test(novaSenha)) {
      toast({
        title: "Senha fraca",
        description: "A senha deve conter ao menos um número",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoadingSenha(true);
      await api.put("/api/v1/perfil/me/senha", {
        senha_atual: senhaAtual,
        nova_senha: novaSenha,
        confirmar_senha: confirmarSenha,
      });

      toast({
        title: "Senha alterada!",
        description: "Sua senha foi atualizada com sucesso.",
      });

      // Limpar campos
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
    } catch (error: any) {
      toast({
        title: "Erro ao alterar senha",
        description: error.message || "Não foi possível alterar a senha",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSenha(false);
    }
  };

  const handleSalvarAparencia = () => {
    // Salvar idioma no localStorage
    localStorage.setItem("idioma", idioma);
    
    toast({
      title: "Preferências salvas!",
      description: "Suas preferências de aparência foram atualizadas.",
    });
  };

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={<Settings className="h-5 w-5" />}
        title="Configurações"
        description="Gerencie suas preferências e configurações da plataforma"
      />

      {/* Tabs de configuração */}
      <Tabs defaultValue="perfil" className="space-y-4 sm:space-y-6">
        <TabsList className="flex w-full justify-start">
          <TabsTrigger value="perfil" className="flex shrink-0 items-center gap-2">
            <User className="h-4 w-4" />
            Perfil
          </TabsTrigger>
          {canSeeDistritoTab && (
            <TabsTrigger value="distrito" className="flex shrink-0 items-center gap-2">
              <Building2 className="h-4 w-4" />
              Distrito
            </TabsTrigger>
          )}
          <TabsTrigger value="notificacoes" className="flex shrink-0 items-center gap-2">
            <Bell className="h-4 w-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="seguranca" className="flex shrink-0 items-center gap-2">
            <Lock className="h-4 w-4" />
            Segurança
          </TabsTrigger>
          <TabsTrigger value="aparencia" className="flex shrink-0 items-center gap-2">
            <Palette className="h-4 w-4" />
            Aparência
          </TabsTrigger>
        </TabsList>

        {/* Aba Perfil */}
        <TabsContent value="perfil" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>
                Atualize suas informações de perfil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Foto de Perfil */}
              <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left sm:gap-6">
                <div className="relative">
                  <Avatar className="h-24 w-24 ring-4 ring-accent">
                    <AvatarImage src={fotoPreview} alt={user.nome_completo} />
                    <AvatarFallback className="text-2xl">
                      {getInitials(user.nome_completo)}
                    </AvatarFallback>
                  </Avatar>
                  {isUploadingFoto && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    </div>
                  )}
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingFoto}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Alterar Foto
                  </Button>
                  {user.foto_url && (
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={handleDeleteFoto}
                      disabled={isUploadingFoto}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remover Foto
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG, GIF ou WEBP. Máx: 10MB
                  </p>
                </div>
              </div>

              <Separator />

              {/* Formulário */}
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="nome">Nome Completo</Label>
                  <Input
                    id="nome"
                    value={nomeCompleto}
                    onChange={(e) => setNomeCompleto(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    value={user.cpf ? formatCPF(user.cpf) : ""}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user.email}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      placeholder="(00) 00000-0000"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="whatsapp">WhatsApp</Label>
                    <Input
                      id="whatsapp"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="data_nascimento">Data de Nascimento</Label>
                  <Input
                    id="data_nascimento"
                    type="date"
                    value={dataNascimento}
                    onChange={(e) => setDataNascimento(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="tipo">Tipo de Usuário</Label>
                  <Input
                    id="tipo"
                    value={getUserRole(user.tipo)}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              <Separator />

              <div className="flex sm:justify-end">
                <Button className="w-full sm:w-auto" onClick={handleSave} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Distrito - apenas para Pastor/Líder Distrital */}
        {canSeeDistritoTab && (
          <TabsContent value="distrito">
            <ConfiguracoesDistritoTab />
          </TabsContent>
        )}

        {/* Aba Notificações */}
        <TabsContent value="notificacoes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tipos de Notificação</CardTitle>
              <CardDescription>
                Escolha quais eventos você deseja receber notificações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border bg-background px-4">
                <Checkbox
                  id="novas_escalas"
                  checked={novasEscalas}
                  onCheckedChange={(checked) => setNovasEscalas(!!checked)}
                />
                <Label htmlFor="novas_escalas" className="flex-1 cursor-pointer py-3.5">
                  Novas escalas publicadas
                </Label>
              </div>

              <div className="flex items-center gap-3 rounded-xl border bg-background px-4">
                <Checkbox
                  id="escalas_atribuidas"
                  checked={escalasAtribuidas}
                  onCheckedChange={(checked) => setEscalasAtribuidas(!!checked)}
                />
                <Label htmlFor="escalas_atribuidas" className="flex-1 cursor-pointer py-3.5">
                  Quando eu for atribuído a uma escala
                </Label>
              </div>

              <div className="flex items-center gap-3 rounded-xl border bg-background px-4">
                <Checkbox
                  id="lembretes"
                  checked={lembretes}
                  onCheckedChange={(checked) => setLembretes(!!checked)}
                />
                <Label htmlFor="lembretes" className="flex-1 cursor-pointer py-3.5">
                  Lembretes de escalas próximas
                </Label>
              </div>

              <div className="flex items-center gap-3 rounded-xl border bg-background px-4">
                <Checkbox
                  id="avaliacoes"
                  checked={avaliacoes}
                  onCheckedChange={(checked) => setAvaliacoes(!!checked)}
                />
                <Label htmlFor="avaliacoes" className="flex-1 cursor-pointer py-3.5">
                  Solicitações de avaliação
                </Label>
              </div>

              <div className="flex items-center gap-3 rounded-xl border bg-background px-4">
                <Checkbox
                  id="trocas_escalas"
                  checked={trocasEscalas}
                  onCheckedChange={(checked) => setTrocasEscalas(!!checked)}
                />
                <Label htmlFor="trocas_escalas" className="flex-1 cursor-pointer py-3.5">
                  Solicitações de troca de escala
                </Label>
              </div>

              <div className="flex items-center gap-3 rounded-xl border bg-background px-4">
                <Checkbox
                  id="substituicoes"
                  checked={substituicoes}
                  onCheckedChange={(checked) => setSubstituicoes(!!checked)}
                />
                <Label htmlFor="substituicoes" className="flex-1 cursor-pointer py-3.5">
                  Solicitações de substituição emergencial
                </Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Canais de Notificação</CardTitle>
              <CardDescription>
                Escolha como deseja receber as notificações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border bg-background px-4">
                <Checkbox
                  id="email"
                  checked={emailNotif}
                  onCheckedChange={(checked) => setEmailNotif(!!checked)}
                />
                <Label htmlFor="email" className="flex-1 cursor-pointer py-3.5">
                  E-mail
                </Label>
              </div>

              <div className="flex items-center gap-3 rounded-xl border bg-background px-4">
                <Checkbox
                  id="push"
                  checked={pushNotif}
                  onCheckedChange={(checked) => setPushNotif(!!checked)}
                />
                <Label htmlFor="push" className="flex-1 cursor-pointer py-3.5">
                  Notificações Push
                </Label>
              </div>

              <div className="flex items-center gap-3 rounded-xl border bg-background px-4">
                <Checkbox
                  id="whatsapp_notif"
                  checked={whatsappNotif}
                  onCheckedChange={(checked) => setWhatsappNotif(!!checked)}
                />
                <Label htmlFor="whatsapp_notif" className="flex-1 cursor-pointer py-3.5">
                  WhatsApp
                </Label>
              </div>

              <div className="flex items-center gap-3 rounded-xl border bg-background px-4">
                <Checkbox
                  id="sms_notif"
                  checked={smsNotif}
                  onCheckedChange={(checked) => setSmsNotif(!!checked)}
                />
                <Label htmlFor="sms_notif" className="flex-1 cursor-pointer py-3.5">
                  SMS
                </Label>
              </div>
            </CardContent>
          </Card>

          <div className="flex sm:justify-end">
            <Button className="w-full sm:w-auto" onClick={handleSaveNotificacoes} disabled={isLoadingNotif}>
              {isLoadingNotif ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Preferências
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        {/* Aba Segurança */}
        <TabsContent value="seguranca">
          <Card>
            <CardHeader>
              <CardTitle>Segurança da Conta</CardTitle>
              <CardDescription>
                Gerencie suas configurações de segurança
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="mb-4 text-base font-semibold sm:text-lg">Alterar Senha</h3>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="senha_atual">Senha Atual</Label>
                    <Input 
                      id="senha_atual" 
                      type="password"
                      value={senhaAtual}
                      onChange={(e) => setSenhaAtual(e.target.value)}
                      placeholder="Digite sua senha atual"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="nova_senha">Nova Senha</Label>
                    <Input 
                      id="nova_senha" 
                      type="password"
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                    />
                    <p className="text-xs text-muted-foreground">
                      Deve conter: 8+ caracteres, maiúsculas, minúsculas e números
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="confirmar_senha">Confirmar Nova Senha</Label>
                    <Input 
                      id="confirmar_senha" 
                      type="password"
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      placeholder="Digite a senha novamente"
                    />
                  </div>
                </div>
                <Separator className="my-4" />
                <Button 
                  className="w-full sm:w-auto"
                  onClick={handleAlterarSenha} 
                  disabled={isLoadingSenha}
                >
                  {isLoadingSenha ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Alterando...
                    </>
                  ) : (
                    "Alterar Senha"
                  )}
                </Button>
              </div>

              <Separator />

              <div>
                <h3 className="mb-2 text-base font-semibold sm:text-lg">Autenticação em Dois Fatores</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Adicione uma camada extra de segurança à sua conta
                </p>
                <Button variant="outline" className="w-full sm:w-auto">Configurar 2FA</Button>
              </div>

              <Separator />

              <div>
                <h3 className="mb-2 text-base font-semibold sm:text-lg">Sessões Ativas</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Gerencie os dispositivos conectados à sua conta
                </p>
                <Button variant="outline" className="w-full sm:w-auto">Ver Sessões</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Aparência */}
        <TabsContent value="aparencia">
          <Card>
            <CardHeader>
              <CardTitle>Personalização</CardTitle>
              <CardDescription>
                Personalize a aparência da plataforma
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="tema">Tema</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Escolha o tema de cores da interface
                </p>
                {mounted && (
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger id="tema" className="w-full">
                      <SelectValue placeholder="Selecione um tema" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">☀️ Claro</SelectItem>
                      <SelectItem value="dark">🌙 Escuro</SelectItem>
                      <SelectItem value="system">💻 Sistema</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {!mounted && (
                  <div className="h-11 bg-muted animate-pulse rounded-xl" />
                )}
              </div>

              <Separator />

              <div>
                <Label htmlFor="idioma">Idioma</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Escolha o idioma da interface
                </p>
                <Select value={idioma} onValueChange={setIdioma}>
                  <SelectTrigger id="idioma" className="w-full">
                    <SelectValue placeholder="Selecione um idioma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt-BR">🇧🇷 Português (Brasil)</SelectItem>
                    <SelectItem value="en">🇺🇸 English</SelectItem>
                    <SelectItem value="es">🇪🇸 Español</SelectItem>
                  </SelectContent>
                </Select>
                <div className="mt-2 flex items-start gap-2 rounded-xl bg-accent p-3">
                  <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent-foreground" />
                  <p className="text-xs text-accent-foreground">
                    A internacionalização completa será implementada em versões futuras. Por enquanto, apenas Português está disponível.
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="mb-2 text-base font-semibold sm:text-lg">Pré-visualização</h3>
                <div className="grid gap-3">
                  <div className="rounded-xl border bg-card p-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      Visualize como ficará a interface:
                    </p>
                    <div className="space-y-2">
                      <div className="flex shrink-0 items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-primary" />
                        <span className="text-sm">Tema atual: <strong>{theme === "light" ? "Claro" : theme === "dark" ? "Escuro" : "Sistema"}</strong></span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-secondary" />
                        <span className="text-sm">Idioma: <strong>{idioma === "pt-BR" ? "Português" : idioma === "en" ? "Inglês" : "Espanhol"}</strong></span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 rounded-md bg-primary text-primary-foreground text-center text-xs font-medium">
                      Primária
                    </div>
                    <div className="p-3 rounded-md bg-secondary text-secondary-foreground text-center text-xs font-medium">
                      Secundária
                    </div>
                    <div className="p-3 rounded-md bg-muted text-muted-foreground text-center text-xs font-medium">
                      Muted
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex sm:justify-end">
                <Button className="w-full sm:w-auto" onClick={handleSalvarAparencia}>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Preferências
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
