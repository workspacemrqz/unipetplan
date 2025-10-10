import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, User, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { adminLoginSchema } from "../../../shared/schema";
import type { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";

type AdminLoginFormData = z.infer<typeof adminLoginSchema>;

export default function AdminLoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<AdminLoginFormData>({
    resolver: zodResolver(adminLoginSchema),
    mode: 'onBlur'
  });

  const onSubmit = async (data: AdminLoginFormData) => {
    setSubmitError(null);
    setIsLoading(true);

    try {
      console.log("🔐 [LOGIN] Iniciando login...");
      
      const response = await fetch('/admin/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Important for session cookies
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        console.log("✅ [LOGIN] Login successful, redirecting instantly...");
        
        // SECURITY: Do NOT store auth status in sessionStorage - it can be tampered with
        // Let the server session handle authentication verification
        
        // Limpar qualquer cache de autenticação antigo
        queryClient.invalidateQueries({ queryKey: ['/admin/api/auth/status'] });
        queryClient.removeQueries({ queryKey: ['/admin/api/auth/status'] });
        
        // Redirect immediately - no delay
        console.log("🚀 [LOGIN] Redirecionando para /admin");
        window.location.href = '/admin';
      } else {
        console.error("❌ [LOGIN] Login failed:", result);
        setSubmitError(result.error || 'Erro no login');
      }
    } catch (error) {
      console.error('❌ [LOGIN] Network/parsing error:', error);
      setSubmitError('Erro de conexão. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted">
      <div className="flex items-center justify-center min-h-screen px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 text-foreground">Área Administrativa</h1>
            <p className="text-muted-foreground">Acesse o painel administrativo</p>
          </div>

          {/* Login Form */}
          <div className="rounded-xl shadow-lg p-8 bg-background">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Login Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Login
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    {...register("login")}
                    className="w-full pl-10 p-3 rounded-lg border text-sm"
                    style={{
                      borderColor: 'var(--border-gray)',
                      backgroundColor: '#FFFFFF',
                      paddingLeft: '2.5rem'
                    }}
                    placeholder="Digite seu login"
                    data-testid="input-admin-login"
                  />
                </div>
                {errors.login && (
                  <p className="text-red-500 text-sm mt-1">{errors.login.message}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="password"
                    {...register("password")}
                    className="w-full pl-10 p-3 rounded-lg border text-sm"
                    style={{
                      borderColor: 'var(--border-gray)',
                      backgroundColor: '#FFFFFF',
                      paddingLeft: '2.5rem'
                    }}
                    placeholder="Digite sua senha"
                    data-testid="input-admin-password"
                  />
                </div>
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
                )}
              </div>

              {/* Submit Error Message */}
              {submitError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg text-sm"
                  style={{background: 'var(--bg-cream-lighter)', border: '1px solid rgb(var(--destructive))', color: 'rgb(var(--destructive))'}}
                  data-testid="error-message"
                >
                  {submitError}
                </motion.div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-transform duration-300 hover:scale-95"
                style={{
                  background: 'var(--btn-ver-planos-bg)',
                  color: 'var(--btn-ver-planos-text)'
                }}
                data-testid="button-admin-login"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <span className="flex items-center space-x-2">
                    <Lock className="w-5 h-5" />
                    <span>Acessar Painel</span>
                  </span>
                )}
              </button>

            </form>
          </div>

          {/* Additional Info */}
          <div className="text-center mt-6">
            <p className="text-sm text-muted-foreground">
              Sistema de administração - Acesso restrito
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}