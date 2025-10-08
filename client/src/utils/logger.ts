/**
 * Sistema de logging condicional
 * Logs são executados APENAS em desenvolvimento
 * Em produção, nenhum dado é exposto no console
 */

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private isDevelopment = import.meta.env.MODE === 'development';

  log(...args: any[]): void {
    if (this.isDevelopment) {
      console.log(...args);
    }
  }

  info(...args: any[]): void {
    if (this.isDevelopment) {
      console.info(...args);
    }
  }

  warn(...args: any[]): void {
    if (this.isDevelopment) {
      console.warn(...args);
    }
  }

  error(...args: any[]): void {
    // Errors sempre são logados, mas sem dados sensíveis
    console.error(...args);
  }

  debug(...args: any[]): void {
    if (this.isDevelopment) {
      console.debug(...args);
    }
  }

  // Método especial para logar apenas em desenvolvimento
  devOnly(...args: any[]): void {
    if (this.isDevelopment) {
      console.log('[DEV]', ...args);
    }
  }
}

export const logger = new Logger();

// Export individual methods para facilitar uso
export const { log, info, warn, error, debug, devOnly } = logger;
