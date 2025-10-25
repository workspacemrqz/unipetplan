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

  // CORS Configuration - Secure validation with URL parsing
  app.use(cors({
    origin: (origin, callback) => {
      // Allow same-origin (no origin header)
      if (!origin) {
        console.log('✅ [CORS] Same-origin request allowed');
        return callback(null, true);
      }
      
      try {
        const url = new URL(origin);
        const hostname = url.hostname;
        
        // Strict Replit domain check using endsWith
        if (hostname.endsWith('.replit.dev') || hostname.endsWith('.replit.app') || 
            hostname === 'replit.dev' || hostname === 'replit.app') {
          console.log('✅ [CORS] Replit domain allowed:', origin);
          return callback(null, true);
        }
        
        // Easypanel deployment domains
        if (hostname.endsWith('.easypanel.host')) {
          console.log('✅ [CORS] Easypanel domain allowed:', origin);
          return callback(null, true);
        }
        
        // Custom production domains
        const productionDomains = ['unipetplan.com.br', 'www.unipetplan.com.br'];
        if (productionDomains.includes(hostname)) {
          console.log('✅ [CORS] Production domain allowed:', origin);
          return callback(null, true);
        }
        
        // Localhost in development only
        if (process.env.NODE_ENV !== 'production' && 
            (hostname === 'localhost' || hostname === '127.0.0.1')) {
          console.log('✅ [CORS] Localhost allowed (dev):', origin);
          return callback(null, true);
        }
        
        console.warn(`⚠️ [CORS] Blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      } catch (error) {
        console.error('❌ [CORS] Invalid origin URL:', origin);
        callback(new Error('Invalid origin'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With']
  }));

  console.log('✅ [SECURITY] Helmet and CORS configured');
}
