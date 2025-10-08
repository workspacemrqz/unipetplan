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
      secure: process.env.NODE_ENV === 'production', // Secure cookies only in production
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax'
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
  // Allow bypass ONLY in local development (not in Replit deployment or production)
  const isLocalDev = process.env.NODE_ENV === 'development' && 
                     process.env.REPLIT_DEPLOYMENT !== 'true' &&
                     !process.env.RAILWAY_ENVIRONMENT &&
                     !process.env.VERCEL_ENV;
                     
  if (isLocalDev) {
    // Automatically set admin session if not present
    if (!req.session.admin) {
      req.session.admin = {
        login: 'dev-admin',
        authenticated: true,
        role: 'superadmin',
        permissions: ['all']
      };
    }
    return next();
  }
  
  // Production/staging mode: require actual authentication
  if (!req.session || !req.session.admin) {
    return res.status(401).json({ error: "Acesso administrativo não autorizado" });
  }
  next();
}
