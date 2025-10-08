import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import rateLimit from "express-rate-limit";
import { autoConfig } from "./config.js";

// Session data interface for client authentication
declare module 'express-session' {
  interface SessionData {
    client?: any; // For client authentication
    admin?: any; // For admin authentication
  }
}


export function setupAuth(app: Express) {
  // Configure PostgreSQL store for sessions
  const PostgreSQLStore = connectPgSimple(session);
  const pgPool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const sessionSettings: session.SessionOptions = {
    secret: autoConfig.get('SESSION_SECRET'),
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something stored
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Secure only in production (HTTPS required)
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax' // Permite navegação normal mas bloqueia CSRF cross-site
    },
    name: 'connect.sid', // Explicitly set session name
    store: new PostgreSQLStore({
      pool: pgPool,
      tableName: 'express_sessions',
      createTableIfMissing: true
    })
  };

  // Remove trust proxy for local development
  // app.set("trust proxy", 1);
  app.use(session(sessionSettings));

  // Session setup complete - admin routes removed as part of admin system cleanup
}

// Middleware function for protecting client routes (non-admin)
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session || !req.session.client) {
    return res.status(401).json({ error: "Acesso não autorizado" });
  }
  next();
}

// Middleware function for protecting admin routes
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // SECURITY FIX: Remove development bypass completely in production environments
  // Never allow bypass in production, staging, or any deployed environment
  if (process.env.NODE_ENV === 'production' || 
      process.env.NODE_ENV === 'staging' ||
      process.env.REPLIT_DEPLOYMENT === 'true' ||
      process.env.RAILWAY_ENVIRONMENT ||
      process.env.VERCEL_ENV) {
    // ALWAYS require authentication in deployed environments
    if (!req.session || !req.session.admin || !req.session.admin.authenticated) {
      return res.status(401).json({ error: "Acesso administrativo não autorizado" });
    }
    return next();
  }
  
  // SECURITY FIX: In true local development, require MULTIPLE confirmations
  const isLocalDev = process.env.NODE_ENV === 'development' && 
                     process.env.ALLOW_DEV_BYPASS === 'true' &&
                     process.env.DEV_BYPASS_CONFIRMATION === 'YES_I_UNDERSTAND_THE_RISKS';
                     
  if (isLocalDev) {
    // Log de auditoria de segurança
    console.warn('🚨 [SECURITY AUDIT] Admin authentication bypass ativado em desenvolvimento local');
    console.warn('🚨 [SECURITY AUDIT] Isto NUNCA deve ocorrer em produção');
    console.warn('🚨 [SECURITY AUDIT] IP:', req.ip);
    console.warn('🚨 [SECURITY AUDIT] Timestamp:', new Date().toISOString());
    
    // Automatically set admin session if not present
    if (!req.session.admin) {
      req.session.admin = {
        login: 'dev-admin',
        authenticated: true,
        role: 'admin', // SECURITY FIX: Changed from superadmin to admin
        permissions: []
      };
    }
    return next();
  }
  
  // Default: require actual authentication
  if (!req.session || !req.session.admin || !req.session.admin.authenticated) {
    return res.status(401).json({ error: "Acesso administrativo não autorizado" });
  }
  next();
}
