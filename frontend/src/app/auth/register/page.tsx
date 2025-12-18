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

const registerSchema = z
  .object({
    nome_completo: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
    email: z.string().email("Email inválido"),
    cpf: z.string().min(11, "CPF inválido").max(14, "CPF inválido"),
    telefone: z.string().min(10, "Telefone inválido"),
    tipo: z.enum(["PREGADOR", "CANTOR"], {
      required_error: "Selecione o tipo",
    }),
    distrito_id: z.number({
      required_error: "Selecione o distrito",
    }),
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
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [distritos, setDistritos] = useState<Distrito[]>([]);
  const [loadingDistritos, setLoadingDistritos] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

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
      await api.post("/api/v1/usuarios/auto-cadastro", {
        nome_completo: data.nome_completo,
        email: data.email,
        cpf: data.cpf.replace(/\D/g, ""),
        telefone: data.telefone.replace(/\D/g, ""),
        tipo: data.tipo,
        distrito_id: data.distrito_id,
        senha: data.senha,
      });

      toast({
        title: "Cadastro realizado!",
        description:
          "Seu cadastro foi enviado para aprovação. Aguarde a confirmação do pastor distrital.",
        variant: "default",
      });

      router.push("/auth/login");
    } catch (error: any) {
      toast({
        title: "Erro no cadastro",
        description: error.message || "Não foi possível realizar o cadastro",
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
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome_completo">Nome Completo</Label>
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

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
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

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
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

          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de Usuário</Label>
            <Select
              onValueChange={(value) =>
                setValue("tipo", value as "PREGADOR" | "CANTOR", {
                  shouldValidate: true,
                })
              }
              disabled={isLoading}
            >
              <SelectTrigger
                className={errors.tipo ? "border-destructive" : ""}
              >
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PREGADOR">Pregador</SelectItem>
                <SelectItem value="CANTOR">Cantor</SelectItem>
              </SelectContent>
            </Select>
            {errors.tipo && (
              <p className="text-sm text-destructive">{errors.tipo.message}</p>
            )}
          </div>

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

          <div className="space-y-2">
            <Label htmlFor="senha">Senha</Label>
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

          <div className="space-y-2">
            <Label htmlFor="confirmar_senha">Confirmar Senha</Label>
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
