import helmet from "helmet";
import cors from "cors";
import { Application } from "express";

export function configureSecurityMiddleware(app: Application) {
  // Security Headers com Helmet
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'", "https://tkzzxsbwkgcdmcreducm.supabase.co"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  }));

  // CORS Configuration
  const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? [
        'https://unipetplan.com.br', 
        'https://www.unipetplan.com.br',
        process.env.REPLIT_DEPLOYMENT === 'true' ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : null
      ].filter(Boolean)
    : ['http://localhost:5000', 'http://127.0.0.1:5000', 'http://localhost:3000'];

  app.use(cors({
    origin: (origin, callback) => {
      // ✅ SECURITY FIX: Sempre validar origin, mesmo em desenvolvimento
      if (!origin) {
        // Permitir apenas com opt-in explícito (útil para mobile apps, Postman, etc)
        if (process.env.ALLOW_NO_ORIGIN === 'true') {
          console.warn('⚠️ [CORS] Requisição sem origin permitida - ALLOW_NO_ORIGIN habilitado');
          return callback(null, true);
        }
        
        console.warn('⚠️ [CORS] Requisição sem origin bloqueada. Configure ALLOW_NO_ORIGIN=true para permitir');
        return callback(new Error('Origin é obrigatória'));
      }
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`⚠️ [CORS] Blocked request from origin: ${origin}`);
        callback(new Error('Origem não permitida pelo CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With']
  }));

  console.log('✅ [SECURITY] Helmet and CORS configured');
}
