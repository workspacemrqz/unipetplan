import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { autoConfig } from "./config.js";
import { initializeDatabase, closeDatabase } from "./db.js";
import { renewalCronJobs } from "./cron/renewal-jobs.js";
import { configureSecurityMiddleware } from "./config/security.js";
import { sanitizeObject } from "./utils/log-sanitizer.js";
import { validateWebhookSecurityConfig } from "./middleware/webhook-security.js";
import path from "path";
import { existsSync } from "fs";

const app = express();

// Trust proxy para produção
app.set("trust proxy", 1);
// Configure security headers and CORS
configureSecurityMiddleware(app);


// Configure JSON parsing to preserve line breaks and special characters
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    // Store raw buffer for potential custom parsing
    (req as any).rawBody = buf;
  }
}));

app.use(express.urlencoded({
  extended: false,
  limit: '10mb'
}));

// Logging middleware otimizado
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      // Only log response bodies in development
      if (process.env.NODE_ENV !== 'production' && capturedJsonResponse) {
        const sanitizedResponse = sanitizeObject(capturedJsonResponse);
        logLine += ` :: ${JSON.stringify(sanitizedResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
});

// Health check route
app.get("/api/health", (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Função principal de inicialização
async function initializeServer(): Promise<void> {
  try {
    console.log('🚀 Inicializando servidor...');

    // 1. Inicializar banco de dados
    console.log('🔌 Inicializando banco de dados...');
    await initializeDatabase();
    console.log('✅ Banco de dados inicializado com sucesso');
    
    // Validar configuração de segurança do webhook
    validateWebhookSecurityConfig();

    // 2. Registrar rotas
    console.log('🛣️ Registrando rotas...');
    const server = await registerRoutes(app);
    console.log('✅ Rotas registradas com sucesso');

    // 3. Configurar tratamento de erros simples
    console.log('🛡️ Configurando tratamento de erros...');

    // Error handling middleware simples
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Erro no servidor:', err);
      res.status(500).json({ error: 'Erro interno do servidor' });
    });

    // 4. Configurar arquivos estáticos
    if (process.env.NODE_ENV === 'production') {
      console.log('📁 Configurando arquivos estáticos para produção...');
      const clientBuildPath = path.join(process.cwd(), 'dist', 'client');

      // Serve all static assets from the Vite build output
      app.use(express.static(clientBuildPath, {
        maxAge: '1y',
        etag: true,
        lastModified: true,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.svg')) {
            res.setHeader('Content-Type', 'image/svg+xml');
          }
        }
      }));

      // Serve the React app for all non-API routes
      app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
          res.sendFile(path.join(clientBuildPath, 'index.html'));
        }
      });

      console.log('✅ Arquivos estáticos configurados para produção');
    } else {
      // Em desenvolvimento, NÃO servir arquivos estáticos
      console.log('📁 Modo de desenvolvimento detectado');
      console.log('🚀 Frontend deve rodar separadamente na porta 5000 com Vite');
      console.log('📝 Use "npm run dev:frontend" ou "cd client && npm run dev" para iniciar o frontend');

      // Em desenvolvimento, apenas informar sobre a porta correta do frontend
      app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
          res.status(200).json({
            message: 'UNIPET PLAN API Server',
            status: 'running',
            environment: 'development',
            frontend_url: 'http://localhost:5000',
            note: 'Frontend is running separately on port 5000. This is the API server.',
            api_health: '/api/health',
            info: 'Access http://localhost:5000 for the frontend application'
          });
        }
      });
    }

    // 5. Iniciar servidor
    const port = parseInt(autoConfig.get('PORT'), 10);
    const host = autoConfig.get('HOST') || '0.0.0.0';

    server.listen(port, host, () => {
      console.log('\n🎉 SERVIDOR INICIADO COM SUCESSO!');
      console.log('=====================================');
      console.log(`🌐 URL: http://${host}:${port}`);
      console.log(`🏠 Host: ${host} (${host === '0.0.0.0' ? 'Aceita conexões externas' : 'Apenas localhost'})`);
      console.log(`🌍 Ambiente: ${autoConfig.get('NODE_ENV')}`);
      console.log(`📁 Diretório: ${process.cwd()}`);
      console.log(`🔌 Banco: Conectado e saudável`);
      console.log(`🛡️ Segurança: Ativa e configurada`);
      console.log(`📊 Health Check: /api/health`);

      if (process.env.NODE_ENV === 'production') {
        console.log(`📦 Modo: Produção - arquivos estáticos servidos de dist/client`);
        console.log(`🔒 HTTPS: Recomendado para produção`);
      } else {
        console.log(`🔧 Modo: Desenvolvimento`);
        console.log(`📝 Logs: Detalhados para debugging`);
      }

      console.log('=====================================\n');
      
      // Inicializar cron jobs de renovação automática
      console.log('⏰ Inicializando cron jobs de renovação automática...');
      renewalCronJobs.start();
      const cronStatus = renewalCronJobs.getStatus();
      if (cronStatus.enabled) {
        console.log(`✅ ${cronStatus.jobCount} cron jobs iniciados com sucesso`);
      } else {
        console.log('⚠️  Cron jobs desabilitados (ENABLE_CRON_JOBS=false)');
      }
    });

    // 6. Configurar graceful shutdown
    let isShuttingDown = false;

        // Parar cron jobs
        renewalCronJobs.stop();
        console.log('✅ Cron jobs parados');
    const gracefulShutdown = async (signal: string) => {
      if (isShuttingDown) {
        console.log(`🛑 Encerramento já em andamento, ignorando ${signal}`);
        return;
      }

      isShuttingDown = true;
      console.log(`\n🛑 Recebido ${signal}, encerrando graciosamente...`);

      try {
        // Fechar servidor HTTP
        server.close(() => {
          console.log('✅ Servidor HTTP fechado');
        });

        // Fechar conexões do banco
        await closeDatabase();

        console.log('✅ Encerramento gracioso concluído');
        process.exit(0);
      } catch (error) {
        console.error('❌ Erro durante encerramento:', error);
        process.exit(1);
      }
    };

    // Capturar sinais de encerramento
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGQUIT', () => gracefulShutdown('SIGQUIT'));

    // Capturar erros não tratados - APENAS LOGAR, NÃO ENCERRAR
    process.on('uncaughtException', (error) => {
      console.error('🚨 EXCEÇÃO NÃO CAPTURADA:', error);
      console.error('⚠️ Erro capturado, mas servidor continuará rodando');
      // NÃO chamar gracefulShutdown - apenas logar o erro
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('🚨 PROMISE REJECTION NÃO TRATADA:', reason);
      console.error('Promise:', promise);
      console.error('⚠️ Promise rejection capturada, mas servidor continuará rodando');
      // NÃO chamar gracefulShutdown - apenas logar o erro
    });

  } catch (error) {
    console.error('❌ FALHA NA INICIALIZAÇÃO DO SERVIDOR:', error);
    console.error('⚠️ Erro na inicialização, mas tentando continuar...');
    // NÃO encerrar o processo - tentar continuar mesmo com erro
  }
}

// Inicializar servidor
initializeServer().catch((error) => {
  console.error('❌ ERRO CRÍTICO NA INICIALIZAÇÃO:', error);
  console.error('⚠️ Erro crítico, mas tentando continuar...');
  // NÃO encerrar o processo - tentar continuar mesmo com erro crítico
});