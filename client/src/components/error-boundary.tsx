import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Verificar se é um erro válido e não um objeto vazio
    if (!error || typeof error !== 'object' || Object.keys(error).length === 0) {
      console.warn('ErrorBoundary: Erro inválido ou vazio capturado, ignorando:', error);
      return { hasError: false };
    }

    // Verificar se é um erro de recurso (beacon.js) que pode ser ignorado
    if (error.message && error.message.includes('beacon.js')) {
      console.warn('ErrorBoundary: Ignorando erro de beacon.js:', error.message);
      return { hasError: false };
    }

    // Verificar se é um erro menor que não deve quebrar a aplicação
    if (error.message && (
      error.message.includes('Resource error') ||
      error.message.includes('Script error') ||
      error.message.includes('Loading chunk')
    )) {
      console.warn('ErrorBoundary: Ignorando erro menor:', error.message);
      return { hasError: false };
    }

    console.error('ErrorBoundary: Erro válido capturado:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Verificar se o erro é válido antes de processar
    if (!error || typeof error !== 'object' || (!error.message && !error.stack)) {
      console.warn('⚠️ Erro vazio ou inválido ignorado:', error);
      return;
    }

    // Prevent infinite loops by avoiding setState if we already have an error
    if (this.state.hasError) {
      console.warn('ErrorBoundary: Erro adicional ignorado para evitar loop:', error?.message);
      return;
    }

    // Ignorar erros específicos que não são críticos
    const errorMessage = error?.message || '';
    if (errorMessage.includes('Cannot access') && errorMessage.includes('before initialization')) {
      console.log('ErrorBoundary: Ignorando erro de inicialização de variável:', errorMessage);
      // Para erros de inicialização, apenas recarregar a página
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      return;
    }

    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Log do erro para monitoramento
    const errorDetails = {
      message: error?.message || 'Erro desconhecido',
      stack: error?.stack || 'Stack trace não disponível', 
      componentStack: errorInfo?.componentStack || 'Component stack não disponível',
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };

    console.error('🚨 Detalhes do erro:', errorDetails);

    // Only update state if we don't already have an error to prevent loops
    if (!this.state.hasError) {
      this.setState({ error, errorInfo });
    }
  }


  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, var(--bg-error-600), var(--bg-error-800))' }}>
          <Card className="w-full max-w-md backdrop-blur shadow-2xl" style={{ backgroundColor: 'var(--bg-cream-lighter)' }}>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--bg-error-light)' }}>
                <AlertCircle className="w-8 h-8" style={{ color: 'var(--text-error-600)' }} />
              </div>
              <CardTitle className="text-2xl font-bold" style={{ color: 'var(--text-error-800)' }}>
                Erro na aplicação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center" style={{ color: 'var(--text-dark-secondary)' }}>
                Ocorreu um erro inesperado. Tente recarregar a página.
              </p>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => window.location.href = '/'}
                  variant="outline"
                  className="w-full"
                  style={{ borderColor: 'var(--border-error)', color: 'var(--text-error-700)' }}
                >
                  <Home className="w-4 h-4 mr-2" />
                  Ir para Início
                </Button>
              </div>

              {import.meta.env.MODE === 'development' && this.state.error && (
                <details className="mt-4 p-3 rounded text-xs" style={{ backgroundColor: 'var(--bg-loading)' }}>
                  <summary className="font-semibold cursor-pointer">
                    Detalhes do erro (desenvolvimento)
                  </summary>
                  <pre className="mt-2 overflow-x-auto">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}