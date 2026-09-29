"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, UserPlus, Loader2, User, Church, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface Distrito {
  id: number;
  nome: string;
}

interface Igreja {
  id: number;
  nome: string;
}

const registerSchema = z
  .object({
    perfil: z.enum(["MINISTERIO", "MEMBRO"], {
      required_error: "Selecione o perfil",
    }),
    nome_completo: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
    email: z.string().email("Email inválido"),
    cpf: z.string().min(11, "CPF inválido").max(14, "CPF inválido"),
    telefone: z.string().min(10, "Telefone inválido"),
    data_nascimento: z.string().min(1, "Data de nascimento é obrigatória"),
    pode_pregar: z.boolean().optional(),
    pode_cantar: z.boolean().optional(),
    distrito_id: z.number({
      required_error: "Selecione o distrito",
    }),
    igreja_id: z.number().optional(),
    senha: z
      .string()
      .min(8, "Senha deve ter no mínimo 8 caracteres")
      .regex(/[A-Z]/, "Senha deve conter ao menos uma letra maiúscula")
      .regex(/[a-z]/, "Senha deve conter ao menos uma letra minúscula")
      .regex(/[0-9]/, "Senha deve conter ao menos um número"),
    confirmar_senha: z.string(),
  })
  .refine((data) => data.senha === data.confirmar_senha, {
    message: "As senhas não coincidem",
    path: ["confirmar_senha"],
  })
  .refine((data) => {
    // Se for MINISTERIO, deve marcar pelo menos um tipo
    if (data.perfil === "MINISTERIO" && !data.pode_pregar && !data.pode_cantar) {
      return false;
    }
    return true;
  }, {
    message: "Selecione pelo menos um tipo de ministério (Pregador e/ou Cantor)",
    path: ["pode_pregar"],
  })
  .refine((data) => {
    // Se for MEMBRO, igreja_id é obrigatória
    if (data.perfil === "MEMBRO") {
      return !!data.igreja_id;
    }
    return true;
  }, {
    message: "Selecione uma igreja",
    path: ["igreja_id"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [distritos, setDistritos] = useState<Distrito[]>([]);
  const [igrejas, setIgrejas] = useState<Igreja[]>([]);
  const [loadingDistritos, setLoadingDistritos] = useState(true);
  const [loadingIgrejas, setLoadingIgrejas] = useState(false);
  const [perfilSelecionado, setPerfilSelecionado] = useState<string | null>(null);
  const [distritoSelecionado, setDistritoSelecionado] = useState<number | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const perfil = watch("perfil");
  const distrito_id = watch("distrito_id");

  useEffect(() => {
    const fetchDistritos = async () => {
      try {
        const response = await api.get<{ items: Distrito[]; total: number }>("/api/v1/distritos/publico");
        setDistritos(response.items || []);
      } catch (error) {
        console.error("Erro ao carregar distritos:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os distritos",
          variant: "destructive",
        });
      } finally {
        setLoadingDistritos(false);
      }
    };

    fetchDistritos();
  }, [toast]);

  // Carregar igrejas quando distrito for selecionado (apenas para membros)
  useEffect(() => {
    if (perfil === "MEMBRO" && distrito_id) {
      const fetchIgrejas = async () => {
        setLoadingIgrejas(true);
        try {
          const response = await api.get<{ items: Igreja[]; total: number }>(
            `/api/v1/igrejas/publico/${distrito_id}`
          );
          setIgrejas(response.items || []);
        } catch (error) {
          console.error("Erro ao carregar igrejas:", error);
          toast({
            title: "Erro",
            description: "Não foi possível carregar as igrejas",
            variant: "destructive",
          });
        } finally {
          setLoadingIgrejas(false);
        }
      };

      fetchIgrejas();
    }
  }, [distrito_id, perfil, toast]);

  const formatCPF = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 11);
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 11);
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  };

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      if (data.perfil === "MEMBRO") {
        // Auto-cadastro de membro
        await api.post("/api/v1/usuarios/auto-cadastro/membro", {
          nome_completo: data.nome_completo,
          email: data.email,
          cpf: data.cpf.replace(/\D/g, ""),
          telefone: data.telefone.replace(/\D/g, ""),
          data_nascimento: data.data_nascimento,
          igreja_id: data.igreja_id,
          senha: data.senha,
        });
      } else {
        // Auto-cadastro de pregador/cantor
        // Define o tipo principal baseado no que foi marcado
        const tipo = data.pode_pregar ? "PREGADOR" : "CANTOR";
        
        await api.post("/api/v1/usuarios/auto-cadastro", {
          nome_completo: data.nome_completo,
          email: data.email,
          cpf: data.cpf.replace(/\D/g, ""),
          telefone: data.telefone.replace(/\D/g, ""),
          data_nascimento: data.data_nascimento,
          tipo: tipo,
          distrito_id: data.distrito_id,
          senha: data.senha,
          pode_pregar: data.pode_pregar || false,
          pode_cantar: data.pode_cantar || false,
        });
      }

      toast({
        title: "Cadastro realizado!",
        description:
          "Seu cadastro foi enviado para aprovação. Aguarde a confirmação do pastor distrital.",
        variant: "default",
      });

      router.push("/auth/login");
    } catch (error: any) {
      console.error("Erro no cadastro:", error);
      
      let errorMessage = "Não foi possível realizar o cadastro";
      
      // Extrair mensagem de erro
      if (error.message) {
        errorMessage = error.message;
      } else if (error.detail) {
        errorMessage = typeof error.detail === "string" 
          ? error.detail 
          : JSON.stringify(error.detail);
      } else if (error.errors && Array.isArray(error.errors)) {
        errorMessage = error.errors
          .map((e: any) => e.msg || e.message)
          .join(", ");
      }
      
      toast({
        title: "Erro no cadastro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const inputCls = (err: unknown, extra = "") =>
    `h-12 ${err ? "border-destructive" : ""} ${extra}`.trim();
  const eyeBtn =
    "absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground";

  const SectionTitle = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
    <div className="flex items-center gap-3 pt-1">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        {icon}
      </div>
      <h2 className="text-base font-semibold">{title}</h2>
    </div>
  );

  return (
    <Card className="animate-in rounded-3xl border-border/60 shadow-float">
      <CardHeader className="space-y-1">
        <CardTitle className="text-center text-2xl">Cadastre-se</CardTitle>
        <CardDescription className="text-center">
          Preencha seus dados para solicitar acesso ao sistema
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6 px-6">
          {/* Etapa 1: perfil */}
          <section className="space-y-4">
            <SectionTitle icon={<Church className="h-5 w-5" />} title="Como você participa?" />
            <div className="space-y-2">
              <Label htmlFor="perfil">Tipo de Cadastro</Label>
              <Select
                onValueChange={(value) => {
                  setValue("perfil", value as "MINISTERIO" | "MEMBRO", {
                    shouldValidate: true,
                  });
                  setPerfilSelecionado(value);
                }}
                disabled={isLoading}
              >
                <SelectTrigger className={inputCls(errors.perfil)}>
                  <SelectValue placeholder="Selecione o tipo de cadastro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MINISTERIO">Pregador/Cantor (Ministério)</SelectItem>
                  <SelectItem value="MEMBRO">Membro de Igreja</SelectItem>
                </SelectContent>
              </Select>
              {errors.perfil && (
                <p className="text-sm text-destructive">{errors.perfil.message}</p>
              )}
            </div>

            {perfil === "MINISTERIO" && (
              <div className="space-y-2">
                <Label>Tipo de Ministério</Label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    htmlFor="pode_pregar"
                    className="flex h-12 cursor-pointer items-center gap-3 rounded-xl border border-input bg-background px-3 text-sm font-medium"
                  >
                    <Checkbox
                      id="pode_pregar"
                      checked={watch("pode_pregar") || false}
                      onCheckedChange={(checked) =>
                        setValue("pode_pregar", checked as boolean, {
                          shouldValidate: true,
                        })
                      }
                      disabled={isLoading}
                    />
                    Pregador
                  </label>
                  <label
                    htmlFor="pode_cantar"
                    className="flex h-12 cursor-pointer items-center gap-3 rounded-xl border border-input bg-background px-3 text-sm font-medium"
                  >
                    <Checkbox
                      id="pode_cantar"
                      checked={watch("pode_cantar") || false}
                      onCheckedChange={(checked) =>
                        setValue("pode_cantar", checked as boolean, {
                          shouldValidate: true,
                        })
                      }
                      disabled={isLoading}
                    />
                    Cantor
                  </label>
                </div>
                {errors.pode_pregar && (
                  <p className="text-sm text-destructive">{errors.pode_pregar.message}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="distrito_id">Distrito</Label>
              <Select
                onValueChange={(value) =>
                  setValue("distrito_id", parseInt(value), {
                    shouldValidate: true,
                  })
                }
                disabled={isLoading || loadingDistritos}
              >
                <SelectTrigger className={inputCls(errors.distrito_id)}>
                  <SelectValue placeholder={loadingDistritos ? "Carregando..." : "Selecione o distrito"} />
                </SelectTrigger>
                <SelectContent>
                  {distritos.map((distrito) => (
                    <SelectItem key={distrito.id} value={distrito.id.toString()}>
                      {distrito.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.distrito_id && (
                <p className="text-sm text-destructive">{errors.distrito_id.message}</p>
              )}
            </div>

            {perfil === "MEMBRO" && distrito_id && (
              <div className="space-y-2">
                <Label htmlFor="igreja_id">Igreja</Label>
                <Select
                  onValueChange={(value) =>
                    setValue("igreja_id", parseInt(value), {
                      shouldValidate: true,
                    })
                  }
                  disabled={isLoading || loadingIgrejas}
                >
                  <SelectTrigger className={inputCls(errors.igreja_id)}>
                    <SelectValue placeholder={loadingIgrejas ? "Carregando..." : "Selecione a igreja"} />
                  </SelectTrigger>
                  <SelectContent>
                    {igrejas.map((igreja) => (
                      <SelectItem key={igreja.id} value={igreja.id.toString()}>
                        {igreja.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.igreja_id && (
                  <p className="text-sm text-destructive">{errors.igreja_id.message}</p>
                )}
              </div>
            )}
          </section>

          <div className="h-px bg-border" />

          {/* Etapa 2: dados pessoais */}
          <section className="space-y-4">
            <SectionTitle icon={<User className="h-5 w-5" />} title="Seus dados" />
            <div className="space-y-2">
              <Label htmlFor="nome_completo">Nome Completo</Label>
              <Input
                id="nome_completo"
                placeholder="Seu nome completo"
                {...register("nome_completo")}
                disabled={isLoading}
                className={inputCls(errors.nome_completo)}
              />
              {errors.nome_completo && (
                <p className="text-sm text-destructive">{errors.nome_completo.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                {...register("email")}
                disabled={isLoading}
                className={inputCls(errors.email)}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                inputMode="numeric"
                placeholder="000.000.000-00"
                {...register("cpf")}
                disabled={isLoading}
                onChange={(e) =>
                  setValue("cpf", formatCPF(e.target.value), {
                    shouldValidate: true,
                  })
                }
                className={inputCls(errors.cpf)}
              />
              {errors.cpf && (
                <p className="text-sm text-destructive">{errors.cpf.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                type="tel"
                inputMode="tel"
                placeholder="(00) 00000-0000"
                {...register("telefone")}
                disabled={isLoading}
                onChange={(e) =>
                  setValue("telefone", formatPhone(e.target.value), {
                    shouldValidate: true,
                  })
                }
                className={inputCls(errors.telefone)}
              />
              {errors.telefone && (
                <p className="text-sm text-destructive">{errors.telefone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_nascimento">Data de Nascimento</Label>
              <Input
                id="data_nascimento"
                type="date"
                {...register("data_nascimento")}
                disabled={isLoading}
                className={inputCls(errors.data_nascimento, "min-w-0")}
              />
              {errors.data_nascimento && (
                <p className="text-sm text-destructive">{errors.data_nascimento.message}</p>
              )}
            </div>
          </section>

          <div className="h-px bg-border" />

          {/* Etapa 3: segurança */}
          <section className="space-y-4">
            <SectionTitle icon={<Lock className="h-5 w-5" />} title="Crie sua senha" />
            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <div className="relative">
                <Input
                  id="senha"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...register("senha")}
                  disabled={isLoading}
                  className={inputCls(errors.senha, "pr-12")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  className={eyeBtn}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.senha && (
                <p className="text-sm text-destructive">{errors.senha.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmar_senha">Confirmar Senha</Label>
              <div className="relative">
                <Input
                  id="confirmar_senha"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...register("confirmar_senha")}
                  disabled={isLoading}
                  className={inputCls(errors.confirmar_senha, "pr-12")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                  className={eyeBtn}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmar_senha && (
                <p className="text-sm text-destructive">{errors.confirmar_senha.message}</p>
              )}
            </div>
          </section>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 px-6 pb-6">
          <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cadastrando...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Cadastrar
              </>
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Já tem uma conta?{" "}
            <Link href="/auth/login" className="font-medium text-primary hover:underline">
              Entrar
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
