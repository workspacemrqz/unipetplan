import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { motion } from "framer-motion";
import { Lock, User, Loader2 } from "lucide-react";
import LoadingDots from '@/components/ui/LoadingDots';

export default function UnitLoginPage() {
  const { slug } = useParams();
  const [, setLocation] = useLocation();
  const [unitName, setUnitName] = useState('');
  const [loading, setLoading] = useState(true);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchUnitName();
  }, [slug]);

  const fetchUnitName = async () => {
    try {
      const response = await fetch(`/api/network-units/${slug}/info`);
      if (response.ok) {
        const data = await response.json();
        setUnitName(data.name);
      } else {
        setError('Unidade não encontrada');
      }
    } catch (err) {
      setError('Erro ao carregar informações da unidade');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    console.log('🔐 [UNIT-LOGIN] Iniciando login...', { slug, login });

    try {
      // Use unified authentication endpoint
      const response = await fetch('/api/unified-auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slug, login, password }),
      });

      const data = await response.json();
      console.log('📥 [UNIT-LOGIN] Resposta recebida:', { 
        ok: response.ok, 
        status: response.status,
        userType: data.userType,
        redirectPath: data.redirectPath,
        hasToken: !!data.token
      });

      if (response.ok) {
        // Store authentication based on user type
        if (data.userType === 'unit') {
          // Unit authentication
          console.log('✅ [UNIT-LOGIN] Autenticando como unidade');
          localStorage.setItem('unit-token', data.token);
          localStorage.setItem('unit-slug', slug || '');
          localStorage.setItem('unit-name', data.unitName);
          console.log('💾 [UNIT-LOGIN] Tokens salvos:', {
            'unit-token': '***',
            'unit-slug': slug,
            'unit-name': data.unitName
          });
        } else if (data.userType === 'veterinarian' || data.userType === 'admin') {
          // Veterinarian/Admin authentication
          console.log('✅ [UNIT-LOGIN] Autenticando como ' + data.userType);
          localStorage.setItem('veterinarian-token', data.token);
          localStorage.setItem('veterinarian-name', data.veterinarianName);
          localStorage.setItem('unit-slug', data.unitSlug);
          localStorage.setItem('unit-name', data.unitName);
          console.log('💾 [UNIT-LOGIN] Tokens salvos:', {
            'veterinarian-token': '***',
            'veterinarian-name': data.veterinarianName,
            'unit-slug': data.unitSlug,
            'unit-name': data.unitName
          });
        }
        
        // Redirect to the appropriate path returned by backend
        console.log('🔄 [UNIT-LOGIN] Redirecionando para:', data.redirectPath);
        setLocation(data.redirectPath);
      } else {
        console.error('❌ [UNIT-LOGIN] Erro de autenticação:', data.error);
        setError(data.error || 'Credenciais inválidas');
      }
    } catch (err) {
      console.error('❌ [UNIT-LOGIN] Erro ao fazer login:', err);
      setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center">
        <div className="text-center">
          <LoadingDots size="lg" color="#0e7074" className="mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <div className="flex items-center justify-center min-h-screen px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 text-foreground">Portal da Unidade</h1>
            {unitName && (
              <p className="text-muted-foreground">{unitName}</p>
            )}
          </div>

          {/* Login Form */}
          <div className="rounded-xl shadow-lg p-8 bg-background">
            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Login Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Login
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    className="w-full pl-10 p-3 rounded-lg border text-sm"
                    style={{
                      borderColor: 'var(--border-gray)',
                      backgroundColor: '#FFFFFF',
                      paddingLeft: '2.5rem'
                    }}
                    placeholder="Digite seu login"
                    required
                    disabled={isSubmitting}
                  />
                </div>
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 p-3 rounded-lg border text-sm"
                    style={{
                      borderColor: 'var(--border-gray)',
                      backgroundColor: '#FFFFFF',
                      paddingLeft: '2.5rem'
                    }}
                    placeholder="Digite sua senha"
                    required
                    disabled={isSubmitting}
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
              Acesso restrito para usuários autorizados
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}