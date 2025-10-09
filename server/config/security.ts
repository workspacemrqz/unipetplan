import helmet from "helmet";
import cors from "cors";
import { Application } from "express";

export function configureSecurityMiddleware(app: Application) {
  // Security Headers com Helmet - Configuração ajustada para deployment
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'", "https://tkzzxsbwkgcdmcreducm.supabase.co", "https://*.replit.app", "https://*.replit.dev"],
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

  // CORS Configuration - Allow Replit deployment domains
  const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? [
        'https://unipetplan.com.br', 
        'https://www.unipetplan.com.br',
        // Support both old and new Replit domain formats
        'https://unipet.replit.app',
        process.env.REPLIT_DEPLOYMENT === 'true' ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : null,
        process.env.REPLIT_DEPLOYMENT === 'true' ? `https://${process.env.REPL_SLUG}.replit.app` : null
      ].filter(Boolean)
    : ['http://localhost:5000', 'http://127.0.0.1:5000', 'http://localhost:3000'];

  app.use(cors({
    origin: (origin, callback) => {
      // ✅ DEPLOYMENT FIX: Allow same-origin requests (no origin header)
      // This is required for deployed apps where frontend and backend are on same domain
      if (!origin) {
        // Allow same-origin requests in both dev and production
        return callback(null, true);
      }
      
      // Permitir URLs do Replit durante desenvolvimento e produção
      if (origin.includes('.replit.dev') || origin.includes('.replit.app')) {
        console.log('✅ [CORS] Permitindo origem Replit:', origin);
        return callback(null, true);
      }
      
      if (allowedOrigins.includes(origin)) {
        console.log('✅ [CORS] Origem permitida:', origin);
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
