import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from "framer-motion";
import { Lock, Mail, CreditCard, Loader2 } from "lucide-react";

// Simple CPF mask function
const cpfMask = (value: string = ""): string => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
};

export default function SellerLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/sellers/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email,
          password: cpf.replace(/\D/g, ""), // CPF is the password
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao fazer login");
      }

      // Redirect to dashboard on success
      setLocation("/vendedor/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fazer login");
    } finally {
      setIsSubmitting(false);
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
            <h1 className="text-3xl font-bold mb-2 text-foreground">Portal do Parceiro</h1>
            <p className="text-muted-foreground">Acesse seu painel de vendas</p>
          </div>

          {/* Login Form */}
          <div className="rounded-xl shadow-lg p-8 bg-background">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 p-3 rounded-lg border text-sm"
                    style={{
                      borderColor: 'var(--border-gray)',
                      backgroundColor: '#FFFFFF',
                      paddingLeft: '2.5rem'
                    }}
                    placeholder="seu@email.com"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* CPF Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  CPF
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={cpfMask(cpf)}
                    onChange={(e) => setCpf(e.target.value.replace(/\D/g, ""))}
                    className="w-full pl-10 p-3 rounded-lg border text-sm"
                    style={{
                      borderColor: 'var(--border-gray)',
                      backgroundColor: '#FFFFFF',
                      paddingLeft: '2.5rem'
                    }}
                    placeholder="000.000.000-00"
                    required
                    disabled={isSubmitting}
                    maxLength={14}
                  />
                </div>
              </div>

              {/* Submit Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg text-sm"
                  style={{background: 'var(--bg-cream-lighter)', border: '1px solid rgb(var(--destructive))', color: 'rgb(var(--destructive))'}}
                >
                  {error}
                </motion.div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-transform duration-300 hover:scale-95"
                style={{
                  background: 'var(--btn-ver-planos-bg)',
                  color: 'var(--btn-ver-planos-text)'
                }}
              >
                {isSubmitting ? (
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
              Acesso restrito para parceiros credenciados
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
