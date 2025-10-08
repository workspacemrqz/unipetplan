import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Lock, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clientLoginSchema } from "../../../shared/schema";
import type { z } from "zod";
// Fixed import path and schema validation
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { logger } from "@/utils/logger";

type LoginFormData = z.infer<typeof clientLoginSchema>;

export default function CustomerLoginPage() {
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPaymentSuccessPopup, setShowPaymentSuccessPopup] = useState(false);

  // Detectar parâmetro payment_success na URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment_success') === 'true') {
      setShowPaymentSuccessPopup(true);
      logger.log('🎉 [LOGIN] Popup de sucesso do pagamento ativado!');
      
      // Dispara confetti quando o popup aparece
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['rgb(var(--gold))', 'rgb(var(--destructive))', 'rgb(var(--accent))', 'rgb(var(--primary))', 'rgb(var(--success))']
        });
      }, 300);
    }
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>({
    resolver: zodResolver(clientLoginSchema),
    mode: 'onBlur'
  });

  const onSubmit = async (data: LoginFormData) => {
    setSubmitError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/clients/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        // Store client data in sessionStorage for immediate use by AuthContext
        if (result.client) {
          sessionStorage.setItem('client_auth_data', JSON.stringify(result.client));
          sessionStorage.setItem('client_auth_timestamp', Date.now().toString());
        }
        
        // Navigate immediately to dashboard
        navigate('/cliente/painel');
      } else {
        setSubmitError(result.error || 'Erro no login');
      }
    } catch (error) {
      logger.error('Login error:', error);
      setSubmitError('Erro de conexão. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen pt-16" style={{background: 'var(--bg-cream-light)'}}>
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full"
          >
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2" style={{color: 'var(--text-dark-primary)'}}>Área do Cliente</h1>
              <p style={{color: 'var(--text-dark-secondary)'}}>Acesse sua conta com seu email e senha</p>
            </div>

            {/* Login Form */}
            <div className="rounded-xl shadow-lg p-8" style={{background: 'var(--bg-cream-lighter)'}}>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Email Field */}
                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{color: 'var(--text-dark-primary)'}}>
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{color: 'var(--text-dark-secondary)'}} />
                    <input
                      type="email"
                      {...register("email")}
                      className="w-full pl-10 p-3 rounded-lg border text-sm"
                      style={{
                        borderColor: 'var(--border-gray)',
                        backgroundColor: '#FFFFFF',
                        paddingLeft: '2.5rem'
                      }}
                      placeholder="Digite seu email"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                  )}
                </div>

                {/* CPF Field */}
                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{color: 'var(--text-dark-primary)'}}>
                    CPF
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{color: 'var(--text-dark-secondary)'}} />
                    <input
                      type="password"
                      {...register("password")}
                      className="w-full pl-10 p-3 rounded-lg border text-sm"
                      style={{
                        borderColor: 'var(--border-gray)',
                        backgroundColor: '#FFFFFF',
                        paddingLeft: '2.5rem'
                      }}
                      placeholder="Digite seu CPF"
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
                    style={{background: 'rgb(var(--background))', border: '1px solid rgb(var(--destructive))', color: 'rgb(var(--destructive))'}}
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
                    <>
                      <div className="w-5 h-5 border-2 rounded-full animate-spin" 
                        style={{borderColor: 'var(--text-light)', borderTopColor: 'transparent'}}></div>
                      <span>Entrando...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      <span>Fazer Login</span>
                    </>
                  )}
                </button>

              </form>
            </div>

            {/* Additional Info */}
            <div className="text-center mt-6">
              <p className="text-sm" style={{color: 'var(--text-dark-secondary)'}}>
                Não tem conta? 
                <button 
                  onClick={() => navigate('/checkout')}
                  className="ml-1 font-medium transition-colors duration-200"
                  style={{color: 'var(--text-teal)'}}


                >
                  Contrate um plano
                </button>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
      <Footer />
      
      {/* 🎉 Popup de Sucesso do Pagamento */}
      <AnimatePresence>
        {showPaymentSuccessPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowPaymentSuccessPopup(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="relative rounded-lg shadow-xl max-w-md w-full mx-4 border"
              onClick={(e) => e.stopPropagation()}
              style={{background: 'var(--bg-teal)'}}
            >
              {/* Header */}
              <div className="flex items-center justify-center p-6 pb-4">
                <div className="text-3xl mb-2">🎉</div>
              </div>
              
              {/* Content */}
              <div className="px-6 pb-6 text-center">
                <h2 className="text-xl font-semibold mb-3 text-[var(--text-light)]">
                  Pagamento Aprovado!
                </h2>
                <p className="text-sm mb-6 text-[var(--text-light)] opacity-90">
                  Seu plano foi contratado com sucesso! Faça login para acessar sua área do cliente.
                </p>
                
                {/* Action */}
                <button
                  onClick={() => setShowPaymentSuccessPopup(false)}
                  className="w-full py-2.5 px-4 rounded-lg font-medium transition-all duration-200 opacity-90"
                  style={{
                    background: 'var(--text-light)',
                    color: 'var(--bg-teal)'
                  }}
                >
                  Continuar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}