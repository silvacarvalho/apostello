"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, UserPlus, Loader2 } from "lucide-react";

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

  return (
    <Card className="shadow-lg animate-in">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Cadastre-se</CardTitle>
        <CardDescription className="text-center">
          Preencha seus dados para solicitar acesso ao sistema
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-[140px_1fr] gap-3 items-start">
            <Label htmlFor="perfil" className="pt-2">Tipo de Cadastro</Label>
            <div className="space-y-1">
              <Select
                onValueChange={(value) => {
                  setValue("perfil", value as "MINISTERIO" | "MEMBRO", {
                    shouldValidate: true,
                  });
                  setPerfilSelecionado(value);
                }}
                disabled={isLoading}
              >
                <SelectTrigger
                  className={errors.perfil ? "border-destructive" : ""}
                >
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
          </div>

          <div className="grid grid-cols-[140px_1fr] gap-3 items-start">
            <Label htmlFor="nome_completo" className="pt-2">Nome Completo</Label>
            <div className="space-y-1">
              <Input
                id="nome_completo"
                placeholder="Seu nome completo"
                {...register("nome_completo")}
                disabled={isLoading}
                className={errors.nome_completo ? "border-destructive" : ""}
              />
              {errors.nome_completo && (
                <p className="text-sm text-destructive">
                  {errors.nome_completo.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-[140px_1fr] gap-3 items-start">
            <Label htmlFor="email" className="pt-2">Email</Label>
            <div className="space-y-1">
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                {...register("email")}
                disabled={isLoading}
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-[140px_1fr_1fr] gap-3 items-start">
            <Label className="pt-2">CPF / Telefone</Label>
            <div className="space-y-1">
              <Input
                id="cpf"
                placeholder="000.000.000-00"
                {...register("cpf")}
                disabled={isLoading}
                onChange={(e) =>
                  setValue("cpf", formatCPF(e.target.value), {
                    shouldValidate: true,
                  })
                }
                className={errors.cpf ? "border-destructive" : ""}
              />
              {errors.cpf && (
                <p className="text-sm text-destructive">{errors.cpf.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Input
                id="telefone"
                placeholder="(00) 00000-0000"
                {...register("telefone")}
                disabled={isLoading}
                onChange={(e) =>
                  setValue("telefone", formatPhone(e.target.value), {
                    shouldValidate: true,
                  })
                }
                className={errors.telefone ? "border-destructive" : ""}
              />
              {errors.telefone && (
                <p className="text-sm text-destructive">
                  {errors.telefone.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-[140px_1fr] gap-3 items-start">
            <Label htmlFor="data_nascimento" className="pt-2">Data de Nascimento</Label>
            <div className="space-y-1">
              <Input
                id="data_nascimento"
                type="date"
                {...register("data_nascimento")}
                disabled={isLoading}
                className={errors.data_nascimento ? "border-destructive" : ""}
              />
              {errors.data_nascimento && (
                <p className="text-sm text-destructive">
                  {errors.data_nascimento.message}
                </p>
              )}
            </div>
          </div>

          {perfil === "MINISTERIO" && (
            <div className="grid grid-cols-[140px_1fr] gap-3 items-start">
              <Label className="pt-2">Tipo de Ministério</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
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
                  <label
                    htmlFor="pode_pregar"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Pregador
                  </label>
                </div>
                <div className="flex items-center space-x-2">
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
                  <label
                    htmlFor="pode_cantar"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Cantor
                  </label>
                </div>
                {errors.pode_pregar && (
                  <p className="text-sm text-destructive">{errors.pode_pregar.message}</p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-[140px_1fr] gap-3 items-start">
            <Label htmlFor="distrito_id" className="pt-2">Distrito</Label>
            <div className="space-y-1">
              <Select
                onValueChange={(value) =>
                  setValue("distrito_id", parseInt(value), {
                    shouldValidate: true,
                  })
                }
                disabled={isLoading || loadingDistritos}
              >
                <SelectTrigger
                  className={errors.distrito_id ? "border-destructive" : ""}
                >
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
          </div>

          {perfil === "MEMBRO" && distrito_id && (
            <div className="grid grid-cols-[140px_1fr] gap-3 items-start">
              <Label htmlFor="igreja_id" className="pt-2">Igreja</Label>
              <div className="space-y-1">
                <Select
                  onValueChange={(value) =>
                    setValue("igreja_id", parseInt(value), {
                      shouldValidate: true,
                    })
                  }
                  disabled={isLoading || loadingIgrejas}
                >
                  <SelectTrigger
                    className={errors.igreja_id ? "border-destructive" : ""}
                  >
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
            </div>
          )}

          <div className="grid grid-cols-[140px_1fr] gap-3 items-start">
            <Label htmlFor="senha" className="pt-2">Senha</Label>
            <div className="space-y-1">
              <div className="relative">
                <Input
                  id="senha"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...register("senha")}
                  disabled={isLoading}
                  className={errors.senha ? "border-destructive pr-10" : "pr-10"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.senha && (
                <p className="text-sm text-destructive">{errors.senha.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-[140px_1fr] gap-3 items-start">
            <Label htmlFor="confirmar_senha" className="pt-2">Confirmar Senha</Label>
            <div className="space-y-1">
              <div className="relative">
                <Input
                id="confirmar_senha"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                {...register("confirmar_senha")}
                disabled={isLoading}
                className={
                  errors.confirmar_senha ? "border-destructive pr-10" : "pr-10"
                }
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.confirmar_senha && (
              <p className="text-sm text-destructive">
                {errors.confirmar_senha.message}
              </p>
            )}
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
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

          <p className="text-sm text-center text-muted-foreground">
            Já tem uma conta?{" "}
            <Link
              href="/auth/login"
              className="text-primary hover:underline font-medium"
            >
              Entrar
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
