"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock, Loader2, ArrowLeft, CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const resetPasswordSchema = z
  .object({
    nova_senha: z
      .string()
      .min(6, "A senha deve ter no mínimo 6 caracteres")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "A senha deve conter letras maiúsculas, minúsculas e números"
      ),
    confirmar_senha: z.string(),
  })
  .refine((data) => data.nova_senha === data.confirmar_senha, {
    message: "As senhas não coincidem",
    path: ["confirmar_senha"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  // Verificar token ao carregar a página
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setIsVerifying(false);
        setIsValidToken(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/v1/auth/verify-reset-token?token=${token}`);
        const data = await response.json();
        if (data.valid) {
          setIsValidToken(true);
          setMaskedEmail(data.email);
        } else {
          setIsValidToken(false);
        }
      } catch (error) {
        setIsValidToken(false);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const onSubmit = async (formData: ResetPasswordFormData) => {
    if (!token) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          nova_senha: formData.nova_senha,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsSuccess(true);
        toast({
          title: "Senha alterada!",
          description: data.message,
          variant: "default",
        });
      } else {
        toast({
          title: "Erro",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível alterar a senha",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isVerifying) {
    return (
      <Card className="shadow-lg animate-in">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
          <CardTitle className="text-2xl">Verificando...</CardTitle>
          <CardDescription>
            Aguarde enquanto verificamos seu link de recuperação.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Invalid token state
  if (!isValidToken) {
    return (
      <Card className="shadow-lg animate-in">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-red-100 dark:bg-red-900">
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <CardTitle className="text-2xl">Link inválido</CardTitle>
          <CardDescription>
            Este link de recuperação de senha é inválido ou expirou.
            Por favor, solicite um novo link.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-4">
          <Link href="/auth/forgot-password" className="w-full">
            <Button className="w-full">
              Solicitar novo link
            </Button>
          </Link>
          <Link href="/auth/login" className="w-full">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para o login
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <Card className="shadow-lg animate-in">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <CardTitle className="text-2xl">Senha alterada!</CardTitle>
          <CardDescription>
            Sua senha foi alterada com sucesso. Você já pode fazer login com sua nova senha.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/auth/login" className="w-full">
            <Button className="w-full">
              Fazer login
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  // Reset password form
  return (
    <Card className="shadow-lg animate-in">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Nova senha</CardTitle>
        <CardDescription className="text-center">
          Digite sua nova senha para a conta {maskedEmail}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nova_senha">Nova senha</Label>
            <div className="relative">
              <Input
                id="nova_senha"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                {...register("nova_senha")}
                disabled={isLoading}
                className={errors.nova_senha ? "border-destructive pr-10" : "pr-10"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.nova_senha && (
              <p className="text-sm text-destructive">{errors.nova_senha.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmar_senha">Confirmar senha</Label>
            <div className="relative">
              <Input
                id="confirmar_senha"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                {...register("confirmar_senha")}
                disabled={isLoading}
                className={errors.confirmar_senha ? "border-destructive pr-10" : "pr-10"}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmar_senha && (
              <p className="text-sm text-destructive">{errors.confirmar_senha.message}</p>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            A senha deve ter no mínimo 6 caracteres, incluindo letras maiúsculas, minúsculas e números.
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Alterando...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Alterar senha
              </>
            )}
          </Button>

          <Link href="/auth/login" className="w-full">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para o login
            </Button>
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <Card className="shadow-lg animate-in">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
          <CardTitle className="text-2xl">Carregando...</CardTitle>
        </CardHeader>
      </Card>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
