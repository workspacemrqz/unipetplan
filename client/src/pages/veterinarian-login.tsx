import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from "framer-motion";
import { Lock, User, Loader2, Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { veterinarianLoginSchema } from "../../../shared/schema";
import type { z } from "zod";

type VeterinarianLoginFormData = z.infer<typeof veterinarianLoginSchema>;

export default function VeterinarianLoginPage() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<VeterinarianLoginFormData>({
    resolver: zodResolver(veterinarianLoginSchema),
    mode: 'onBlur'
  });

  const onSubmit = async (data: VeterinarianLoginFormData) => {
    setSubmitError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/veterinarian-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        localStorage.setItem('veterinarian-token', result.token);
        localStorage.setItem('veterinarian-name', result.veterinarianName);
        localStorage.setItem('unit-slug', result.unitSlug);
        localStorage.setItem('unit-name', result.unitName);
        setLocation(`/unidade/${result.unitSlug}/atendimentos/novo`);
      } else {
        setSubmitError(result.error || 'Credenciais inválidas');
      }
    } catch (error) {
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
            <h1 className="text-3xl font-bold mb-2 text-foreground">Portal do Veterinário</h1>
            <p className="text-muted-foreground">Acesse o sistema de atendimentos</p>
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
                  />
                </div>
                {errors.login && (
                  <p className="text-red-500 text-sm mt-1">{errors.login.message}</p>
                )}
              </div>

              {/* Password Field with Toggle */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                    className="w-full pl-10 pr-10 p-3 rounded-lg border text-sm"
                    style={{
                      borderColor: 'var(--border-gray)',
                      backgroundColor: '#FFFFFF',
                      paddingLeft: '2.5rem',
                      paddingRight: '2.5rem'
                    }}
                    placeholder="Digite sua senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
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
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <span className="flex items-center space-x-2">
                    <Lock className="w-5 h-5" />
                    <span>Entrar</span>
                  </span>
                )}
              </button>

            </form>
          </div>

          {/* Additional Info */}
          <div className="text-center mt-6">
            <p className="text-sm text-muted-foreground">
              Acesso exclusivo para veterinários credenciados
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
