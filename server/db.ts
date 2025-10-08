import { Pool, PoolClient } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema.js";
import { autoConfig } from "./config.js";

// Validate database environment variables
if (!autoConfig.get('DATABASE_URL')) {
  console.warn("⚠️ DATABASE_URL environment variable is not set");
  console.warn("Database functionality will be disabled");
  console.warn("To enable database, create a .env file with your database configuration");
  console.warn("Example: DATABASE_URL=postgresql://username:password@localhost:5432/database_name");
}


// Configuração otimizada do pool de conexões
const poolConfig = {
  connectionString: autoConfig.get('DATABASE_URL') || 'postgresql://dummy:dummy@localhost:5432/dummy',
  // Configurações de estabilidade e performance
  max: 20, // Máximo de conexões simultâneas
  min: 5,  // Mínimo de conexões mantidas
  idleTimeoutMillis: 30000, // 30 segundos
  connectionTimeoutMillis: 10000, // 10 segundos para conectar
  acquireTimeoutMillis: 10000, // 10 segundos para adquirir conexão
  reapIntervalMillis: 1000, // Verificar conexões ociosas a cada 1 segundo
  createTimeoutMillis: 10000, // 10 segundos para criar conexão
  destroyTimeoutMillis: 5000, // 5 segundos para destruir conexão
  // Configurações de retry
  maxRetries: 3,
  retryDelay: 1000, // 1 segundo
};

// Pool principal com configurações otimizadas
export const pool = new Pool(poolConfig);

// Flag para evitar múltiplas chamadas ao pool.end()
let isPoolEnded = false;

// Sistema de health check e retry automático
class DatabaseHealthManager {
  private static instance: DatabaseHealthManager;
  private isHealthy: boolean = true;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private retryAttempts: number = 0;
  private readonly maxRetries: number = 5;
  private readonly retryDelay: number = 2000;

  private constructor() {
    this.initializeHealthCheck();
    this.setupPoolEventHandlers();
  }

  public static getInstance(): DatabaseHealthManager {
    if (!DatabaseHealthManager.instance) {
      DatabaseHealthManager.instance = new DatabaseHealthManager();
    }
    return DatabaseHealthManager.instance;
  }

  private setupPoolEventHandlers(): void {
    // Monitorar eventos do pool para detectar problemas
    pool.on('connect', (client: PoolClient) => {
      this.isHealthy = true;
      this.retryAttempts = 0;
    });

    pool.on('error', (err: Error, client: PoolClient) => {
      console.error('❌ Erro na conexão do pool:', err.message);
      this.isHealthy = false;
      this.handleConnectionError();
    });

    pool.on('remove', (client: PoolClient) => {
    });

    // Monitorar conexões ociosas
    pool.on('acquire', (client: PoolClient) => {
    });

    pool.on('release', () => {
    });
  }

  private initializeHealthCheck(): void {
    // Verificar saúde do banco a cada 30 segundos
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 30000);
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
        if (!this.isHealthy) {
          console.log('✅ Banco de dados recuperou a saúde');
          this.isHealthy = true;
          this.retryAttempts = 0;
        }
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('❌ Health check falhou:', error);
      this.isHealthy = false;
      this.handleConnectionError();
    }
  }

  private async handleConnectionError(): Promise<void> {
    if (this.retryAttempts < this.maxRetries) {
      this.retryAttempts++;
      console.log(`🔄 Tentativa de reconexão ${this.retryAttempts}/${this.maxRetries} em ${this.retryDelay}ms`);
      
      setTimeout(async () => {
        try {
          await this.performHealthCheck();
        } catch (error) {
          console.error('❌ Reconexão falhou:', error);
        }
      }, this.retryDelay);
    } else {
      console.error('❌ Máximo de tentativas de reconexão atingido');
      // Em produção, você pode querer notificar um serviço de monitoramento
    }
  }

  public async getConnection(): Promise<PoolClient> {
    if (!this.isHealthy) {
      console.log('⚠️ Banco de dados não está saudável, tentando conectar mesmo assim...');
    }

    try {
      const client = await pool.connect();
      return client;
    } catch (error) {
      console.error('❌ Falha ao obter conexão:', error);
      throw new Error(`Falha na conexão com banco de dados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  public isDatabaseHealthy(): boolean {
    return this.isHealthy;
  }

  public async testConnection(): Promise<boolean> {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error) {
      console.error('❌ Teste de conexão falhou:', error);
      return false;
    }
  }

  public cleanup(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}

// Instância global do gerenciador de saúde
export const dbHealthManager = DatabaseHealthManager.getInstance();

// Função para executar queries com retry automático
export async function executeQueryWithRetry<T>(
  queryFn: () => Promise<T>,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await queryFn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        console.error(`❌ Query falhou após ${maxRetries} tentativas:`, lastError.message);
        throw lastError;
      }

      console.log(`⚠️ Tentativa ${attempt} falhou, tentando novamente em ${retryDelay}ms:`, lastError.message);
      
      // Aguardar antes da próxima tentativa
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      
      // Aumentar delay exponencialmente
      retryDelay *= 2;
    }
  }

  throw lastError || new Error('Erro desconhecido na execução da query');
}

// Função para transações com retry
export async function executeTransactionWithRetry<T>(
  transactionFn: (client: PoolClient) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  return executeQueryWithRetry(async () => {
    const client = await dbHealthManager.getConnection();
    
    try {
      await client.query('BEGIN');
      const result = await transactionFn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }, maxRetries);
}

// Drizzle ORM com configurações otimizadas
export const db = drizzle(pool, { 
  schema,
  // Configurações de performance
  logger: process.env.NODE_ENV === 'development'
});

// Função de inicialização do banco
export async function initializeDatabase(): Promise<void> {
  try {
    console.log('🔌 Inicializando conexão com banco de dados...');
    
    // Se não houver DATABASE_URL, pular inicialização
    if (!autoConfig.get('DATABASE_URL')) {
      console.log('⚠️ DATABASE_URL não configurado, pulando inicialização do banco');
      return;
    }
    
    // Testar conexão inicial
    const isConnected = await dbHealthManager.testConnection();
    if (!isConnected) {
      throw new Error('Falha na conexão inicial com banco de dados');
    }

    console.log('✅ Conexão com banco de dados estabelecida com sucesso');
    console.log(`📊 Pool configurado com ${poolConfig.max} conexões máximas`);
    
  } catch (error) {
    console.error('❌ Falha na inicialização do banco de dados:', error);
    if (autoConfig.get('NODE_ENV') === 'production') {
      throw error;
    } else {
      console.log('⚠️ Continuando sem banco de dados em modo desenvolvimento');
    }
  }
}

// Função de limpeza para graceful shutdown
export async function closeDatabase(): Promise<void> {
  if (isPoolEnded) {
    console.log('🔌 Pool já foi encerrado, pulando...');
    return;
  }

  try {
    console.log('🔌 Fechando conexões com banco de dados...');
    dbHealthManager.cleanup();
    await pool.end();
    isPoolEnded = true;
    console.log('✅ Conexões com banco de dados fechadas');
  } catch (error) {
    console.error('❌ Erro ao fechar conexões:', error);
  }
}

// Graceful shutdown handlers são gerenciados pelo server/index.ts

// Verificar se o módulo está sendo executado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase()
    .then(() => {
      console.log('✅ Teste de conexão bem-sucedido');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Teste de conexão falhou:', error);
      process.exit(1);
    });
}