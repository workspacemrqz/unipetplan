import { randomBytes } from 'crypto';
import { config } from 'dotenv';
import path from 'path';

// Carrega variáveis de ambiente do arquivo .env
const envPath = path.resolve(process.cwd(), '.env');
console.log('🔍 Carregando .env de:', envPath);
const result = config({ path: envPath });
// Log apenas o status do carregamento, não o conteúdo
if (result.error) {
  console.log('📄 Status do .env: Arquivo não encontrado (usando variáveis de ambiente do sistema)');
} else {
  console.log('📄 Status do .env: Carregado com sucesso');
}

// Log das variáveis carregadas para debug
console.log('🔍 Variáveis de ambiente carregadas:');
console.log('   LOGIN:', process.env.LOGIN ? '✅ Configurado' : '❌ Ausente');
console.log('   SENHA:', process.env.SENHA ? '✅ Configurado' : '❌ Ausente');
console.log('   DATABASE_URL:', process.env.DATABASE_URL ? '✅ Configurado' : '❌ Ausente');
console.log('   NODE_ENV:', process.env.NODE_ENV || 'undefined');

/**
 * Sistema de configuração automática que detecta o ambiente
 * e configura todas as variáveis necessárias automaticamente
 */
class AutoConfig {
  private static instance: AutoConfig;
  private config: Record<string, any> = {};

  private constructor() {
    this.initializeConfig();
  }

  public static getInstance(): AutoConfig {
    if (!AutoConfig.instance) {
      AutoConfig.instance = new AutoConfig();
    }
    return AutoConfig.instance;
  }

  /**
   * Inicializa todas as configurações automaticamente
   */
  private initializeConfig(): void {
    // 1. Detectar ambiente automaticamente
    this.config.NODE_ENV = this.detectEnvironment();

    // 2. Configurar porta e host automaticamente
    this.config.PORT = this.getPort();
    this.config.HOST = this.getHost();

    // 3. Gerar chave secreta automaticamente se não fornecida
    this.config.SESSION_SECRET = this.getSessionSecret();

    // 4. Configurar armazenamento automaticamente
    this.config.STORAGE_TYPE = this.detectStorageType();

    // 5. Configurar valores padrão de contato automaticamente
    this.setupDefaultContactInfo();

    // 6. Configurar variáveis do cliente automaticamente
    this.setupClientVariables();

    // 7. Validar configurações obrigatórias
    this.validateRequiredConfig();

    // 8. Aplicar configurações ao process.env
    this.applyConfig();

    // 9. Log das configurações aplicadas
    this.logConfiguration();
  }

  /**
   * Detecta automaticamente o ambiente de execução
   */
  private detectEnvironment(): string {
    // Se NODE_ENV já estiver definido, usa ele
    if (process.env.NODE_ENV) {
      return process.env.NODE_ENV;
    }

    // Detecta automaticamente se está rodando no EasyPanel/Heroku
    if (process.env.PORT === '80' || process.env.PORT === '443' || process.env.DYNO) {
      return 'production';
    }



    // Padrão para desenvolvimento local
    return 'development';
  }

  /**
   * Configura a porta automaticamente baseada no ambiente
   */
  private getPort(): string {
    if (process.env.PORT) {
      return process.env.PORT;
    }



    return '3000';
  }

  /**
   * Configura o host automaticamente
   */
  private getHost(): string {
    if (process.env.HOST) {
      return process.env.HOST;
    }

    return '0.0.0.0';
  }

  /**
   * Gera uma chave secreta segura automaticamente se não fornecida
   */
  private getSessionSecret(): string {
    if (process.env.SESSION_SECRET) {
      return process.env.SESSION_SECRET;
    }

    // SEGURANÇA: Bloquear inicialização em produção sem SESSION_SECRET
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ [SECURITY ERROR] SESSION_SECRET é obrigatório em produção!');
      console.error('❌ Configure SESSION_SECRET no arquivo .env antes de fazer deploy.');
      console.error('❌ Exemplo: SESSION_SECRET=' + randomBytes(32).toString('hex'));
      throw new Error('SESSION_SECRET não configurado em produção. Impossível iniciar servidor com segurança.');
    }

    // Apenas em desenvolvimento: gerar chave temporária com avisos
    const secret = randomBytes(64).toString('hex');
    console.warn('⚠️  [SECURITY WARNING] SESSION_SECRET não configurado!');
    console.warn('⚠️  Gerando chave temporária para DESENVOLVIMENTO.');
    console.warn('⚠️  ATENÇÃO: Todas as sessões serão perdidas ao reiniciar o servidor.');
    console.warn('⚠️  Configure SESSION_SECRET no .env antes de ir para produção!');
    console.warn('⚠️  Exemplo: SESSION_SECRET=' + secret.substring(0, 32) + '...');
    return secret;
  }

  /**
   * Detecta o tipo de armazenamento disponível
   */
  private detectStorageType(): string {
    if (process.env.GOOGLE_CLOUD_PROJECT_ID && process.env.PRIVATE_OBJECT_DIR) {
      return 'google-cloud';
    }



    return 'local';
  }

  /**
   * Configura informações de contato padrão automaticamente
   */
  private setupDefaultContactInfo(): void {
    // Removido: não aplicar valores padrão automaticamente
    // Os valores devem vir do .env ou do banco de dados
  }

  /**
   * Configura variáveis do cliente automaticamente
   */
  private setupClientVariables(): void {
    // Removido: não aplicar variáveis padrão do cliente automaticamente
    // Os valores devem vir do .env ou do banco de dados
  }

  /**
   * Valida se as configurações obrigatórias estão presentes
   */
  private validateRequiredConfig(): void {
    const required = ['LOGIN', 'SENHA'];
    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
      console.error('❌ CONFIGURAÇÕES OBRIGATÓRIAS FALTANDO:');
      missing.forEach(key => {
        console.error(`   - ${key}`);
      });
      console.error('\n📝 Crie um arquivo .env com as seguintes variáveis:');
      console.error('   LOGIN=seu-email@exemplo.com');
      console.error('   SENHA=sua-senha-segura');
      console.error('\n💡 Copie o arquivo env.example para .env e configure apenas essas variáveis!');
      throw new Error(`Configurações obrigatórias faltando: ${missing.join(', ')}`);
    }

    // DATABASE_URL é opcional em desenvolvimento
    const isProduction = this.config.NODE_ENV === 'production';
    if (!process.env.DATABASE_URL && isProduction) {
      console.warn('⚠️ DATABASE_URL não configurado - funcionalidades de banco desabilitadas');
    }

    console.log('✅ Todas as configurações obrigatórias estão presentes');
    console.log('🔒 Validação de segurança concluída com sucesso');
  }

  /**
   * Aplica todas as configurações ao process.env
   */
  private applyConfig(): void {
    Object.entries(this.config).forEach(([key, value]) => {
      if (!process.env[key]) {
        process.env[key] = value;
      }
    });
  }

  /**
   * Exibe um resumo das configurações aplicadas
   */
  private logConfiguration(): void {
    console.log('\n🚀 CONFIGURAÇÃO AUTOMÁTICA APLICADA:');
    console.log('=====================================');
    console.log(`🌍 Ambiente: ${this.config.NODE_ENV}`);
    console.log(`🔌 Porta: ${this.config.PORT}`);
    console.log(`🏠 Host: ${this.config.HOST}`);
    console.log(`💾 Armazenamento: ${this.config.STORAGE_TYPE}`);
    console.log(`🔑 Sessão: ${this.config.SESSION_SECRET ? 'Configurada' : 'Usando existente'}`);
    console.log(`📞 Contato: Configurado via ambiente/banco`);
    console.log('=====================================\n');
  }

  /**
   * Obtém uma configuração específica
   */
  public get(key: string): any {
    try {
      const value = process.env[key] || this.config[key];
      
      // Special handling for PORT to ensure it's valid
      if (key === 'PORT') {
        const port = value || '3000';
        const parsedPort = parseInt(port, 10);
        if (isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
          console.warn(`⚠️ Invalid PORT value: ${port}, defaulting to 3000`);
          return '3000';
        }
        return port;
      }
      
      return value;
    } catch (error) {
      console.error(`❌ Error getting config for key '${key}':`, error);
      
      // Provide safe defaults for critical configuration keys
      if (key === 'PORT') return '3000';
      if (key === 'HOST') return '0.0.0.0';
      if (key === 'NODE_ENV') return 'development';
      
      return undefined;
    }
  }

  /**
   * Obtém todas as configurações
   */
  public getAll(): Record<string, any> {
    return { ...process.env, ...this.config };
  }

  /**
   * Verifica se uma configuração existe
   */
  public has(key: string): boolean {
    return !!(process.env[key] || this.config[key]);
  }
}

// Exporta a instância única
export const autoConfig = AutoConfig.getInstance();

// Exporta funções utilitárias
export const getConfig = (key: string) => autoConfig.get(key);
export const hasConfig = (key: string) => autoConfig.has(key);
export const getAllConfig = () => autoConfig.getAll();