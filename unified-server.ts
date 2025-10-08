import express, { type Request, type NextFunction } from "express";
import path from "path";
import cookieParser from "cookie-parser";

// Import UNIPET modules
import { registerRoutes as registerUnipetRoutes } from "./server/routes.js";
import { autoConfig } from "./server/config.js";
import { initializeDatabase, closeDatabase } from "./server/db.js";

// Import ADMIN modules - using existing server routes with admin prefix
// Note: Admin now integrated into main client app, APIs mounted at /admin/api/*

const app = express();

// Trust proxy para produção
app.set("trust proxy", 1);

// Configure JSON parsing to preserve line breaks and special characters
app.use(express.json({
  limit: '50mb', // Increased for admin system that handles images
  verify: (req, res, buf) => {
    // Store raw buffer for potential custom parsing
    (req as any).rawBody = buf;
  }
}));

app.use(express.urlencoded({
  extended: false,
  limit: '50mb'
}));

// Cookie parser for admin system
app.use(cookieParser());

// Logging middleware otimizado
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api") || path.startsWith("/admin/api")) {
      console.log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

// Health check route
app.get("/api/health", (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    services: {
      unipet: 'active',
      admin: 'active'
    }
  });
});

// Admin health check
app.get("/admin/health", (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'admin'
  });
});

/**
 * Função principal de inicialização do servidor unificado
 */
async function initializeUnifiedServer(): Promise<void> {
  try {
    console.log('🚀 Inicializando servidor unificado UNIPET + Admin...');

    // 1. Inicializar banco de dados (compartilhado)
    console.log('🔌 Inicializando banco de dados...');
    await initializeDatabase();
    console.log('✅ Banco de dados inicializado com sucesso');

    // 2. Middleware removido - rotas admin já estão definidas em server/routes.ts
    // As rotas /admin/api/* são registradas diretamente, não precisam ser reescritas

    // 3. Registrar rotas uma única vez em /api/* (compartilhadas com /admin/api/*)
    console.log('🛣️ Registrando rotas compartilhadas (/api/* e /admin/api/*)...');
    const unipetServer = await registerUnipetRoutes(app);
    console.log('✅ Rotas registradas e compartilhadas com admin');

    // 4. Admin agora integrado no frontend principal - não precisa de arquivos separados
    console.log('📁 Admin integrado no cliente principal - usando dist/client para todas as rotas');

    // 4. Configurar serving de arquivos estáticos
    console.log('📁 Configurando arquivos estáticos...');
    
    // Serve UNIPET frontend (always serve static files if they exist)
    const unipetBuildPath = path.join(process.cwd(), 'dist', 'client');
    const cacheMaxAge = process.env.NODE_ENV === 'production' ? '1y' : '0';
    
    app.use(express.static(unipetBuildPath, {
      maxAge: cacheMaxAge,
      etag: true,
      lastModified: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.svg')) {
          res.setHeader('Content-Type', 'image/svg+xml');
        }
        // Disable cache in development for easier debugging
        if (process.env.NODE_ENV !== 'production') {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      }
    }));

    // Admin now integrated into main client - no separate static files needed

    // SPA routing (catch-all for non-API routes, including /admin/*)
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api') && !req.path.startsWith('/admin/api')) {
        res.sendFile(path.join(unipetBuildPath, 'index.html'));
      }
    });

    console.log('✅ Arquivos estáticos configurados (UNIPET sempre servido)');

    // 5. Configurar tratamento de erros
    console.log('🛡️ Configurando tratamento de erros...');
    app.use((err: any, _req: Request, res: express.Response, _next: NextFunction) => {
      console.error('Erro no servidor:', err);
      res.status(500).json({ error: 'Erro interno do servidor' });
    });

    // 6. Iniciar servidor
    // Em produção, usa porta 5000 (deployment padrão), senão usa PORT do ambiente ou 3000
    const port = process.env.NODE_ENV === 'production' 
      ? parseInt(process.env.PORT || '5000', 10)
      : parseInt(autoConfig.get('PORT') || '3000', 10);
    const host = autoConfig.get('HOST') || '0.0.0.0';

    unipetServer.listen(port, host, () => {
      console.log('\n🎉 SERVIDOR UNIFICADO INICIADO COM SUCESSO!');
      console.log('==========================================');
      console.log(`🌐 URL: http://${host}:${port}`);
      console.log(`🏠 Host: ${host} (Aceita conexões externas)`);
      console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📁 Diretório: ${process.cwd()}`);
      console.log(`🔌 Banco: Conectado e saudável`);
      console.log('\n📋 SERVIÇOS DISPONÍVEIS:');
      console.log('  🦄 UNIPET:');
      console.log('    • Frontend: / (raiz)');
      console.log('    • APIs: /api/*');
      console.log('    • Health: /api/health');
      console.log('  🔧 ADMIN:');
      console.log('    • Frontend: /admin');
      console.log('    • APIs: /admin/api/*');
      console.log('    • Health: /admin/health');
      console.log('\n🔒 FUNCIONALIDADES:');
      console.log('  • Roteamento unificado');
      console.log('  • Banco de dados compartilhado');
      console.log('  • Sessions e cookies configurados');
      console.log('  • Tratamento de erros global');
      
      if (process.env.NODE_ENV === 'production') {
        console.log('  • Arquivos estáticos servidos');
        console.log('  • Cache otimizado');
      } else {
        console.log('  • Admin com Hot Reload (Vite)');
        console.log('  • UNIPET frontend externo (recomendado)');
      }
      
      console.log('==========================================\n');
    });

    // 7. Configurar graceful shutdown
    let isShuttingDown = false;

    const gracefulShutdown = async (signal: string) => {
      if (isShuttingDown) {
        console.log(`🛑 Encerramento já em andamento, ignorando ${signal}`);
        return;
      }

      isShuttingDown = true;
      console.log(`\n🛑 Recebido ${signal}, encerrando graciosamente...`);

      try {
        // Fechar servidor HTTP
        unipetServer.close(() => {
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
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('🚨 PROMISE REJECTION NÃO TRATADA:', reason);
      console.error('Promise:', promise);
      console.error('⚠️ Promise rejection capturada, mas servidor continuará rodando');
    });

  } catch (error) {
    console.error('❌ FALHA NA INICIALIZAÇÃO DO SERVIDOR:', error);
    console.error('⚠️ Erro na inicialização, mas tentando continuar...');
  }
}


// Inicializar servidor unificado
initializeUnifiedServer().catch((error) => {
  console.error('❌ ERRO CRÍTICO NA INICIALIZAÇÃO:', error);
  console.error('⚠️ Erro crítico, mas tentando continuar...');
});