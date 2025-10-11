import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { 
  insertContactSubmissionSchema, 
  insertPlanSchema, 
  insertNetworkUnitSchema,
  updateNetworkUnitSchema,
  insertFaqItemSchema,
  insertSiteSettingsSchema,
  insertClientSchema,
  insertClientSchemaStep2,
  clientLoginSchema,
  adminLoginSchema,
  insertUserSchema,
  updateUserSchema,
  insertPetSchema,
  updatePetSchema,
  insertCouponSchema,
  updateCouponSchema,
  insertGuideSchema,
  insertSellerPaymentSchema,
  type InsertNetworkUnit,
  type InsertSiteSettings,
  type InsertClient,
  type ClientLogin,
  type AdminLogin,
  type InsertPet,
  type Pet,
  type InsertSeller,
  type InsertGuide
} from "../shared/schema.js";
import { sanitizeText } from "./utils/text-sanitizer.js";
import { sanitizeEmail } from "./utils/log-sanitizer.js";
import { enforceCorrectBillingPeriod } from "./utils/billing-validation.js";
import { setupAuth, requireAuth, requireAdmin, requireSellerAuth } from "./auth.js";
import bcrypt from "bcryptjs";
import { supabaseStorage } from "./supabase-storage.js";
import { CieloService, type CreditCardPaymentRequest } from "./services/cielo-service.js";
import { PaymentStatusService } from "./services/payment-status-service.js";
import { 
  calculateNextRenewalDate, 
  calculateOverduePeriods, 
  calculateRegularizationReceivedDate,
  calculateRegularizationAmount,
  addMonths,
  addYears
} from "./utils/renewal-helpers.js";
import { 
  checkoutProcessSchema, 
  paymentCaptureSchema, 
  paymentCancelSchema, 
  cieloWebhookSchema 
} from "../shared/schema.js";
import express from "express";
import chatRoutes from "./routes/chat.js";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { setupUnitRoutes } from "./unit-routes.js";
import { setupProcedureUsageRoutes } from "./procedure-usage-routes.js";
import multer from "multer";
import { getCsrfToken, validateCsrf } from "./middleware/csrf.js";
import fileType from 'file-type';

// Extend express-session types
declare module 'express-session' {
  interface SessionData {
    user?: any;
    userId?: string;
    client?: any;
  }
}

// Extend express Request type for rate-limit
declare module 'express' {
  interface Request {
    rateLimit?: {
      limit: number;
      current: number;
      remaining: number;
      resetTime: Date;
    };
  }
}

// Rate limiter for file uploads - balanced for user experience
const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // maximum 20 uploads per 15 minutes
  message: "Muitos uploads realizados. Tente novamente em 15 minutos.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for checkout - strict to prevent fraud
const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // maximum 10 checkout attempts per 15 minutes
  message: "Muitas tentativas de checkout. Tente novamente em 15 minutos.",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // count all requests
});

// Rate limiter for user registration
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: "Muitas tentativas de registro. Tente novamente em 15 minutos.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for login - strict to prevent brute force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  skipSuccessfulRequests: true,
  message: "Muitas tentativas de login. Tente novamente em 15 minutos.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for contact form
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: "Muitas mensagens enviadas. Tente novamente em 15 minutos.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for coupon validation
const couponLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: "Muitas tentativas de validação. Tente novamente em 15 minutos.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for payment queries (permissivo para polling de checkout)
const paymentQueryLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // Permite 100 requisições por minuto (mais que suficiente para polling a cada 3s)
  skip: (req) => {
    // Permitir polling ilimitado do checkout (com header especial)
    return req.headers['x-checkout-polling'] === 'true';
  },
  message: "Muitas consultas de pagamento. Tente novamente em alguns minutos.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for CEP lookup
const cepLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: "Muitas consultas de CEP. Tente novamente em 15 minutos.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Configure multer for in-memory file upload with enhanced security
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit for security
    files: 1, // Only 1 file per request
    fields: 10, // Maximum 10 non-file fields
    headerPairs: 100 // Maximum header pairs
  },
  fileFilter: (req, file, cb) => {
    // Basic MIME type and extension validation (first layer of defense)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    
    // Check MIME type
    if (!allowedTypes.includes(file.mimetype)) {
      cb(new Error(`Tipo de arquivo não permitido. Use: ${allowedTypes.join(', ')}`));
      return;
    }
    
    // Check file extension
    const fileExtension = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExtension)) {
      cb(new Error(`Extensão de arquivo não permitida. Use: ${allowedExtensions.join(', ')}`));
      return;
    }
    
    // Sanitize filename
    file.originalname = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    cb(null, true);
  }
});

// ✅ SECURITY: Deep content validation middleware (validates magic numbers and suspicious content)
// This runs AFTER multer processes the file, when the buffer is available
export const validateImageContent = async (req: any, res: any, next: any) => {
  // Skip if no file uploaded
  if (!req.file || !req.file.buffer) {
    return next();
  }

  try {
    // ✅ SECURITY: Validate magic numbers (real file content signature)
    const type = await fileType.fromBuffer(req.file.buffer);
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    
    if (!type || !allowedMimeTypes.includes(type.mime)) {
      console.warn('🚨 [SECURITY] Invalid file type detected via magic numbers:', {
        detectedType: type?.mime || 'unknown',
        claimedType: req.file.mimetype,
        filename: req.file.originalname
      });
      return res.status(400).json({ 
        error: 'Tipo de arquivo inválido detectado. Apenas imagens JPEG, PNG e WebP são permitidas.' 
      });
    }

    // ✅ SECURITY: Check for suspicious content (embedded scripts, executables)
    const bufferString = req.file.buffer.toString('utf-8', 0, Math.min(req.file.buffer.length, 1024));
    const suspiciousPatterns = ['<?php', '<script', '#!/bin', 'eval(', 'exec(', 'system(', 'passthru(', 'shell_exec(', '<?='];
    
    for (const pattern of suspiciousPatterns) {
      if (bufferString.includes(pattern)) {
        console.warn('🚨 [SECURITY] Suspicious content detected in file:', {
          pattern,
          filename: req.file.originalname
        });
        return res.status(400).json({ 
          error: 'Conteúdo suspeito detectado no arquivo' 
        });
      }
    }

    // ✅ SECURITY: Validate image dimensions with Sharp
    const sharp = (await import("sharp")).default;
    try {
      const metadata = await sharp(req.file.buffer).metadata();
      if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format)) {
        return res.status(400).json({ error: "Formato de imagem inválido" });
      }
      if (metadata.width && metadata.width > 5000 || metadata.height && metadata.height > 5000) {
        return res.status(400).json({ error: "Dimensões da imagem muito grandes. Máximo: 5000x5000 pixels" });
      }
    } catch (sharpError) {
      console.error("❌ [SECURITY] Sharp validation failed:", sharpError);
      return res.status(400).json({ error: "Arquivo não é uma imagem válida" });
    }

    // File passed all security checks
    console.log('✅ [SECURITY] File validated successfully:', {
      filename: req.file.originalname,
      type: type.mime,
      size: req.file.buffer.length
    });

    next();
  } catch (error) {
    console.error('❌ [SECURITY] Error validating file:', error);
    return res.status(400).json({ 
      error: 'Erro ao validar arquivo: ' + (error as Error).message 
    });
  }
};



// Middleware to check client authentication
const requireClient = (req: any, res: any, next: any) => {
  if (!req.session) {
    return res.status(401).json({ error: "Client authentication required - no session" });
  }

  if (!req.session.client) {
    return res.status(401).json({ error: "Client authentication required - not logged in" });
  }
  next();
};

/**
 * Helper function to create the next annual installment after a payment
 * Includes idempotency check to prevent duplicate creation
 * @param contractId - The contract ID
 * @param paidInstallment - The installment that was just paid
 * @param logPrefix - Log prefix for debugging
 */
export async function createNextAnnualInstallmentIfNeeded(
  contractId: string,
  paidInstallment: any,
  logPrefix: string = '[AUTO-NEXT-INSTALLMENT]'
): Promise<void> {
  try {
    // Get contract to check billing period
    const contract = await storage.getContract(contractId);
    if (!contract) {
      return;
    }

    const isAnnual = contract.billingPeriod === 'annual';
    const billingLabel = isAnnual ? 'anualidade' : 'mensalidade';
    
    console.log(`📅 ${logPrefix} Verificando se precisa criar próxima ${billingLabel}...`);
    
    // Get all existing installments to check for duplicates
    const allInstallments = await storage.getContractInstallmentsByContractId(contractId);
    
    // IDEMPOTENCY CHECK: Only create next installment if there's no unpaid future installment
    // This prevents creating multiple future installments on repeated calls
    const hasUnpaidFutureInstallment = allInstallments.some(
      inst => (inst.status === 'current' || inst.status === 'pending') && inst.id !== paidInstallment.id
    );
    
    if (hasUnpaidFutureInstallment) {
      console.log(`✅ ${logPrefix} Já existe ${billingLabel} futura não paga, pulando criação.`);
      return;
    }
    
    // Calculate next installment number based on MAXIMUM existing number
    const maxInstallmentNumber = allInstallments.reduce((max, inst) => 
      Math.max(max, inst.installmentNumber || 0), 0
    );
    const nextInstallmentNumber = maxInstallmentNumber + 1;
    
    // Validate required fields - need paidAt date
    if (!paidInstallment.paidAt || !paidInstallment.periodEnd || !paidInstallment.periodStart) {
      console.error(`❌ ${logPrefix} Parcela paga sem paidAt/periodEnd/periodStart, não é possível calcular próxima`);
      return;
    }
    
    // 📊 LOG DETALHADO: Dados da parcela paga
    console.log(`📊 ${logPrefix} [CALC-DATES] Dados da parcela paga:`, {
      installmentNumber: paidInstallment.installmentNumber,
      paidAt: new Date(paidInstallment.paidAt).toISOString().split('T')[0],
      dueDate: new Date(paidInstallment.dueDate).toISOString().split('T')[0],
      periodStart: new Date(paidInstallment.periodStart).toISOString().split('T')[0],
      periodEnd: new Date(paidInstallment.periodEnd).toISOString().split('T')[0],
      billingPeriod: contract.billingPeriod
    });
    
    // Calculate next due date based on the PREVIOUS due date (not payment date)
    // This ensures consistent billing cycles regardless of when payment was made
    const previousDueDate = new Date(paidInstallment.dueDate);
    const nextDueDate = isAnnual 
      ? addYears(previousDueDate, 1)  // Annual: add 1 year maintaining same day
      : addMonths(previousDueDate, 1); // Monthly: add 1 month maintaining same day
    
    // Calculate period boundaries to ensure contiguous coverage
    // Period starts the day after the current period ends
    const nextPeriodStart = new Date(paidInstallment.periodEnd);
    nextPeriodStart.setDate(nextPeriodStart.getDate() + 1);
    
    // Period ends based on the coverage period (1 year for annual, 1 month for monthly)
    const nextPeriodEnd = isAnnual
      ? addYears(nextPeriodStart, 1)  // Annual: add 1 year
      : addMonths(nextPeriodStart, 1); // Monthly: add 1 month
    nextPeriodEnd.setDate(nextPeriodEnd.getDate() - 1); // Last day of the period
    
    // 📊 LOG DETALHADO: Cálculo das próximas datas
    console.log(`📊 ${logPrefix} [CALC-DATES] Cálculo da próxima parcela:`, {
      previousDueDate: previousDueDate.toISOString().split('T')[0],
      nextDueDate: nextDueDate.toISOString().split('T')[0],
      dateDifference: isAnnual 
        ? `${Math.floor((nextDueDate.getTime() - previousDueDate.getTime()) / (1000 * 60 * 60 * 24))} dias (deve ser ~365)` 
        : `${Math.floor((nextDueDate.getTime() - previousDueDate.getTime()) / (1000 * 60 * 60 * 24))} dias (deve ser ~30)`,
      nextPeriodStart: nextPeriodStart.toISOString().split('T')[0],
      nextPeriodEnd: nextPeriodEnd.toISOString().split('T')[0],
      periodCoverageDays: Math.floor((nextPeriodEnd.getTime() - nextPeriodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
    });
    
    // Create the next installment
    const nextInstallment = await storage.createContractInstallment({
      contractId: contractId,
      installmentNumber: nextInstallmentNumber,
      dueDate: nextDueDate,
      periodStart: nextPeriodStart,
      periodEnd: nextPeriodEnd,
      amount: isAnnual ? contract.annualAmount : contract.monthlyAmount,
      status: 'pending' // New installment is pending, not yet due
    });
    
    console.log(`✅ ${logPrefix} ${isAnnual ? 'Anualidade' : 'Mensalidade'} ${nextInstallmentNumber} criada:`, {
      installmentId: nextInstallment.id,
      installmentNumber: nextInstallmentNumber,
      previousDueDate: previousDueDate.toISOString().split('T')[0],
      nextDueDate: nextDueDate.toISOString().split('T')[0],
      periodStart: nextPeriodStart.toISOString().split('T')[0],
      periodEnd: nextPeriodEnd.toISOString().split('T')[0],
      coverageDays: Math.floor((nextPeriodEnd.getTime() - nextPeriodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1,
      billingType: isAnnual ? 'annual' : 'monthly'
    });
  } catch (error) {
    console.error(`❌ ${logPrefix} Erro ao criar próxima parcela:`, error);
    // Don't throw - we don't want to fail the payment if we can't create the next installment
  }
}

export async function registerRoutes(app: Express): Promise<Server> {

  // Static file serving disabled - using Supabase Storage for all images
  console.log('📁 [STATIC-FILES] Static file serving disabled - using Supabase Storage');

  // Health check route is defined later with database connectivity check


  // Registrar rotas de chat
  app.use("/api/chat", chatRoutes);

  // CEP LOOKUP ROUTE
  app.get("/api/cep/:cep", cepLimiter, async (req, res) => {
    try {
      
      // Import the CEP service
      const { CepService } = await import("./services/cep-service.js");
      
      // Buscar dados do CEP
      const addressData = await CepService.lookup(req.params.cep);
      
      if (!addressData) {
        return res.status(404).json({
          success: false,
          error: 'CEP não encontrado ou inválido'
        });
      }

      res.json({
        success: true,
        data: addressData
      });

    } catch (error: any) {
      console.error('❌ [CEP API] Erro ao buscar CEP:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        ...(process.env.NODE_ENV === "development" && { details: error.message })
      });
    }
  });

  // IMAGE SERVING
  // Note: All images now served from Supabase Storage or client/public folder





  // REMOVIDO: Rotas deprecated de /api/objects/* completamente removidas

  // Setup authentication
  setupAuth(app);
  
  // Setup unit routes (authentication & management)
  setupUnitRoutes(app, storage);
  
  // Setup procedure usage routes
  setupProcedureUsageRoutes(app, storage);

  // Rate limiting for admin login endpoint
  const adminLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // ✅ REDUZIDO: apenas 3 tentativas
    skipSuccessfulRequests: true, // ✅ NOVO: não conta logins bem-sucedidos
    message: { error: "Muitas tentativas de login. Tente novamente em 15 minutos." },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      console.warn('🚨 [SECURITY] Rate limit exceeded for admin login', {
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      res.status(429).json({ 
        error: "Muitas tentativas de login. Tente novamente em 15 minutos.",
        retryAfter: req.rateLimit?.resetTime ? Math.ceil(req.rateLimit.resetTime.getTime() / 1000) : 900
      });
    }
  });

  // Admin login endpoint
  // NOTE: CSRF removed from login because frontend is not configured for it
  // Login is still secure with: rate limiting, session regeneration, password hashing, sameSite cookies
  app.post("/admin/api/login", adminLoginLimiter, async (req, res) => {
    try {
      const loginData = adminLoginSchema.parse(req.body);

      // First, check if user exists in database
      let user = await storage.getUserByEmail(loginData.login);
      if (!user) {
        // Try to find by username if email not found
        user = await storage.getUserByUsername(loginData.login);
      }

      if (user) {
        // User found in database, verify password
        const isValidPassword = await bcrypt.compare(loginData.password, user.password);
        
        if (isValidPassword && user.isActive) {
          // ✅ SECURITY FIX: Regenerate session to prevent session fixation attacks
          req.session.regenerate((err) => {
            if (err) {
              console.error("❌ [ADMIN-LOGIN] Erro ao regenerar sessão:", err);
              return res.status(500).json({ error: "Erro ao criar sessão segura" });
            }
            
            // Set admin session with user info
            req.session.admin = { 
              login: user.email || user.username, 
              authenticated: true,
              userId: user.id,
              role: user.role,
              permissions: user.permissions
            };
            
            // Save session explicitly
            req.session.save((saveErr) => {
              if (saveErr) {
                console.error("❌ [ADMIN-LOGIN] Erro ao salvar sessão:", saveErr);
                return res.status(500).json({ error: "Erro ao salvar sessão" });
              }
              
              console.log("✅ [ADMIN-LOGIN] Database user authenticated successfully:", user.email || user.username);
              res.json({ success: true, message: "Login realizado com sucesso" });
            });
          });
          return;
        } else if (!user.isActive) {
          console.log("❌ [ADMIN-LOGIN] Inactive account:", loginData.login);
          return res.status(401).json({ error: "Credenciais inválidas" });
        } else {
          console.log("❌ [ADMIN-LOGIN] Invalid password for user:", loginData.login);
          return res.status(401).json({ error: "Credenciais inválidas" });
        }
      }

      // If not found in database or password incorrect, check environment variables as fallback
      const adminLogin = process.env.LOGIN;
      const adminPassword = process.env.SENHA;

      if (!adminLogin || !adminPassword) {
        console.log("❌ [ADMIN-LOGIN] Invalid credentials and no env variables configured");
        res.status(401).json({ error: "Credenciais inválidas" });
        return;
      }

      // Secure password comparison for environment variables
      const isValidLogin = loginData.login === adminLogin;
      let isValidPassword = false;

      // Check if password is bcrypt hash or plain text
      if (adminPassword.startsWith('$2a$') || adminPassword.startsWith('$2b$')) {
        // It's a bcrypt hash - secure comparison
        isValidPassword = await bcrypt.compare(loginData.password, adminPassword);
      } else if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev') {
        // Development only: Allow plain text password with warning
        console.warn("⚠️ [ADMIN-LOGIN-DEV] Plain text password in use. For production, use bcrypt hash.");
        isValidPassword = loginData.password === adminPassword;
      } else {
        // Production: Plain text passwords not allowed
        console.error("❌ [ADMIN-LOGIN] Plain text password detected. SENHA must be a bcrypt hash for security.");
        return res.status(500).json({ error: "Configuração de segurança incorreta. Contate o administrador." });
      }

      if (isValidLogin && isValidPassword) {
        // ✅ SECURITY FIX: Regenerate session to prevent session fixation attacks
        req.session.regenerate((err) => {
          if (err) {
            console.error("❌ [ADMIN-LOGIN] Erro ao regenerar sessão:", err);
            return res.status(500).json({ error: "Erro ao criar sessão segura" });
          }
          
          // Set admin session for environment variable admin
          req.session.admin = { 
            login: adminLogin, 
            authenticated: true,
            role: 'superadmin' // Environment variable admin has full access
          };
          
          // Save session explicitly
          req.session.save((saveErr) => {
            if (saveErr) {
              console.error("❌ [ADMIN-LOGIN] Erro ao salvar sessão:", saveErr);
              return res.status(500).json({ error: "Erro ao salvar sessão" });
            }
            
            console.log("✅ [ADMIN-LOGIN] Environment admin authenticated successfully");
            res.json({ success: true, message: "Login realizado com sucesso" });
          });
        });
      } else {
        console.log("❌ [ADMIN-LOGIN] Invalid credentials provided");
        res.status(401).json({ error: "Credenciais inválidas" });
      }
    } catch (error) {
      console.error("❌ [ADMIN-LOGIN] Error during admin login:", error);
      res.status(400).json({ error: "Dados de login inválidos" });
    }
  });

  // Admin password verification endpoint (for delete confirmations)
  const passwordVerifyLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5, // ✅ REDUZIDO: apenas 5 tentativas
    skipSuccessfulRequests: true, // ✅ NOVO: não conta verificações bem-sucedidas
    message: { error: "Muitas tentativas de verificação. Tente novamente em 5 minutos." },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      console.warn('🚨 [SECURITY] Rate limit exceeded for password verification', {
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      res.status(429).json({ 
        error: "Muitas tentativas de verificação. Tente novamente em 5 minutos.",
        retryAfter: req.rateLimit?.resetTime ? Math.ceil(req.rateLimit.resetTime.getTime() / 1000) : 300
      });
    }
  });

  // Rate limiting for admin CRUD operations
  const adminCRUDLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // limit each IP to 100 requests per minute
    message: { error: "Muitas requisições. Tente novamente em breve." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.post("/admin/api/admin/verify-password", passwordVerifyLimiter, requireAdmin, async (req, res) => {
    try {
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ valid: false, error: "Senha não fornecida" });
      }

      const adminPassword = process.env.SENHA;

      if (!adminPassword) {
        console.error("❌ [VERIFY-PASSWORD] Missing environment variable SENHA");
        return res.status(500).json({ valid: false, error: "Configuração do servidor incorreta" });
      }

      let isValidPassword = false;

      // Check if password is bcrypt hash or plain text
      if (adminPassword.startsWith('$2a$') || adminPassword.startsWith('$2b$')) {
        // It's a bcrypt hash - secure comparison
        isValidPassword = await bcrypt.compare(password, adminPassword);
      } else if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev') {
        // Development only: Allow plain text password with warning
        console.warn("⚠️ [VERIFY-PASSWORD-DEV] Plain text password in use. For production, use bcrypt hash.");
        isValidPassword = password === adminPassword;
      } else {
        // Production: Plain text passwords not allowed
        console.error("❌ [VERIFY-PASSWORD] Plain text password detected. SENHA must be a bcrypt hash for security.");
        return res.status(500).json({ valid: false, error: "Configuração de segurança incorreta" });
      }

      res.json({ valid: isValidPassword });
    } catch (error) {
      console.error("❌ [VERIFY-PASSWORD] Error during password verification:", error);
      res.status(500).json({ valid: false, error: "Erro interno do servidor" });
    }
  });

  // Admin authentication status endpoint
  app.get("/admin/api/auth/status", (req, res) => {
    try {
      if (req.session && req.session.admin && req.session.admin.authenticated) {
        res.json({ 
          authenticated: true, 
          admin: { 
            login: req.session.admin.login 
          } 
        });
      } else {
        res.json({ authenticated: false });
      }
    } catch (error) {
      console.error("❌ [ADMIN-AUTH-STATUS] Error checking auth status:", error);
      res.status(500).json({ 
        authenticated: false, 
        error: "Erro interno do servidor" 
      });
    }
  });



  // Protect all admin API routes except login and auth status
  app.use("/admin/api/*", (req, res, next) => {
    console.log("🔍 [MIDDLEWARE] Path:", req.path, "Method:", req.method, "Original URL:", req.originalUrl);
    
    // Skip authentication only for login and auth status endpoints
    // Use originalUrl since req.path only contains the part after the wildcard
    if (req.originalUrl === "/admin/api/login" || req.originalUrl === "/admin/api/auth/status") {
      return next();
    }
    
    // Apply admin authentication for all admin routes
    return requireAdmin(req, res, next);
  });

  // Contact form submission (public)
  // SECURITY: Formulário de contato público usa rate limiting ao invés de CSRF
  app.post("/api/contact", contactLimiter, async (req, res) => {
    try {

      const validatedData = insertContactSubmissionSchema.parse(req.body);

      const submission = await storage.createContactSubmission(validatedData as any);

      res.json({ 
        success: true, 
        message: "Cotação enviada com sucesso! Entraremos em contato em breve." 
      });
    } catch (error) {
      console.error("❌ [CONTACT] Error processing contact form:", error);
      res.status(400).json({ 
        error: "Erro ao processar formulário. Verifique os dados e tente novamente." 
      });
    }
  });


  // Chat settings routes are handled by chatRoutes - removed duplicated versions

  // Chat send route is handled by chatRoutes - removed hardcoded version

  // Chat conversations routes are handled by chatRoutes - removed duplicated version

  // PUBLICROUTES (for frontend to consume)

  // Health check endpoint
  app.get("/api/health", async (req, res) => {
    try {
      // Check database connection by counting plans
      const plans = await storage.getPlans();
      res.json({ 
        status: "healthy",
        database: "connected",
        plansCount: plans?.length || 0,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ 
        status: "unhealthy",
        database: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      });
    }
  });

  // CSRF Token endpoint - clients need to get this token before making POST/PUT/DELETE requests
  app.get("/api/csrf-token", getCsrfToken);

  // Public endpoint to get seller by whitelabel URL (for referral tracking)
  app.get("/api/seller/referral/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const seller = await storage.getSellerByWhitelabelUrl(slug);
      
      if (!seller) {
        return res.status(404).json({ error: "Vendedor não encontrado" });
      }

      // Return only public seller information (no sensitive data)
      res.json({
        id: seller.id,
        fullName: seller.fullName,
        whitelabelUrl: seller.whitelabelUrl,
      });
    } catch (error) {
      console.error("❌ [SELLER-REFERRAL] Error fetching seller by slug:", error);
      res.status(500).json({ error: "Erro ao buscar vendedor" });
    }
  });

  // CRITICAL: Dashboard aggregated data endpoint (required by admin dashboard)
  app.get("/admin/api/dashboard/all", requireAdmin, async (req, res) => {
    
    try {
      console.log("📊 [DASHBOARD] Processing dashboard data request");
      
      // Extract date filter parameters from query
      const { startDate, endDate } = req.query;
      const hasDateFilter = startDate || endDate;
      
      console.log("📊 [DASHBOARD] Date filters:", { startDate, endDate, hasDateFilter });
      
      // Fetch all required data in parallel for optimal performance
      const [
        allGuides,
        networkUnits, 
        clients,
        contactSubmissions,
        plans,
        allPets,
        allPaymentReceipts
      ] = await Promise.all([
        storage.getAllGuides(),
        storage.getNetworkUnits(), 
        storage.getAllClients(),
        storage.getAllContactSubmissions(),
        storage.getAllPlans(),
        storage.getAllPets(),
        storage.getAllPaymentReceipts()
      ]);

      // Apply date filters if present
      let filteredGuides = allGuides;
      let filteredClients = clients;
      let filteredContactSubmissions = contactSubmissions;
      let filteredPets = allPets;
      let filteredPaymentReceipts = allPaymentReceipts;

      if (hasDateFilter) {
        const startDateTime = startDate ? new Date(startDate as string) : null;
        const endDateTime = endDate ? (() => {
          const end = new Date(endDate as string);
          end.setHours(23, 59, 59, 999);
          return end;
        })() : null;

        // Filter guides by createdAt
        if (startDateTime || endDateTime) {
          filteredGuides = allGuides.filter(guide => {
            if (!guide.createdAt) return false;
            const createdAt = new Date(guide.createdAt);
            if (startDateTime && createdAt < startDateTime) return false;
            if (endDateTime && createdAt > endDateTime) return false;
            return true;
          });
        }

        // Filter clients by createdAt
        if (startDateTime || endDateTime) {
          filteredClients = clients.filter(client => {
            if (!client.createdAt) return false;
            const createdAt = new Date(client.createdAt);
            if (startDateTime && createdAt < startDateTime) return false;
            if (endDateTime && createdAt > endDateTime) return false;
            return true;
          });
        }

        // Filter contactSubmissions by createdAt
        if (startDateTime || endDateTime) {
          filteredContactSubmissions = contactSubmissions.filter(submission => {
            if (!submission.createdAt) return false;
            const createdAt = new Date(submission.createdAt);
            if (startDateTime && createdAt < startDateTime) return false;
            if (endDateTime && createdAt > endDateTime) return false;
            return true;
          });
        }

        // Filter pets by createdAt
        if (startDateTime || endDateTime) {
          filteredPets = allPets.filter(pet => {
            if (!pet.createdAt) return false;
            const createdAt = new Date(pet.createdAt);
            if (startDateTime && createdAt < startDateTime) return false;
            if (endDateTime && createdAt > endDateTime) return false;
            return true;
          });
        }

        // Filter payment receipts by paymentDate
        if (startDateTime || endDateTime) {
          filteredPaymentReceipts = allPaymentReceipts.filter(receipt => {
            if (!receipt.paymentDate) return false;
            const paymentDate = new Date(receipt.paymentDate);
            if (startDateTime && paymentDate < startDateTime) return false;
            if (endDateTime && paymentDate > endDateTime) return false;
            return true;
          });
        }

        console.log("📊 [DASHBOARD] After date filtering:", {
          guides: `${filteredGuides.length}/${allGuides.length}`,
          clients: `${filteredClients.length}/${clients.length}`,
          contactSubmissions: `${filteredContactSubmissions.length}/${contactSubmissions.length}`,
          pets: `${filteredPets.length}/${allPets.length}`,
          paymentReceipts: `${filteredPaymentReceipts.length}/${allPaymentReceipts.length}`
        });
      }

      console.log("📊 [DASHBOARD] Data fetched successfully:", {
        guides: hasDateFilter ? `${filteredGuides.length}/${allGuides.length}` : allGuides.length,
        networkUnits: networkUnits.length,
        clients: hasDateFilter ? `${filteredClients.length}/${clients.length}` : clients.length,
        contactSubmissions: hasDateFilter ? `${filteredContactSubmissions.length}/${contactSubmissions.length}` : contactSubmissions.length,
        plans: plans.length,
        pets: hasDateFilter ? `${filteredPets.length}/${allPets.length}` : allPets.length
      });

      // Calculate basic statistics using filtered data
      const stats = {
        activeClients: filteredClients.length,
        registeredPets: filteredPets.length,
        openGuides: filteredGuides.filter(g => g.status === 'open').length,
        totalGuides: filteredGuides.length,
        totalPlans: plans.length,
        activePlans: plans.filter(p => p.isActive).length,
        inactivePlans: plans.filter(p => !p.isActive).length,
        activeNetwork: networkUnits.filter(u => u.isActive).length,
        totalProcedures: 0, // TODO: Add if getAllProcedures method exists
        monthlyRevenue: filteredPets.length * 0, // Will be calculated after planRevenue
        totalRevenue: filteredPets.length * 0 // Will be calculated after planRevenue
      };

      // Calculate plan distribution using filtered pets
      const totalFilteredPets = filteredPets.length;
      const planDistribution = plans.map(plan => {
        const petCount = filteredPets.filter(pet => pet.planId === plan.id).length;
        const percentage = totalFilteredPets > 0 ? Math.round((petCount / totalFilteredPets) * 100) : 0;
        return {
          planId: plan.id,
          planName: plan.name,
          petCount,
          percentage
        };
      });

      // Filter only approved payments (returnCode '00' or '0')
      const approvedPaymentReceipts = filteredPaymentReceipts.filter(receipt => 
        receipt.returnCode && ['00', '0'].includes(receipt.returnCode)
      );

      // Calculate plan revenue from actual approved payments (using filtered and approved receipts)
      const planRevenue = plans.map(plan => {
        // Sum all approved payments for this plan from filtered receipts
        const totalRevenue = approvedPaymentReceipts
          .filter(receipt => receipt.planName === plan.name)
          .reduce((sum, receipt) => {
            const amount = parseFloat(receipt.paymentAmount || '0');
            return sum + amount;
          }, 0);
        
        const petCount = filteredPets.filter(pet => pet.planId === plan.id).length;
        const monthlyPrice = parseFloat(plan.basePrice || '0');
        
        return {
          planId: plan.id,
          planName: plan.name,
          petCount,
          monthlyPrice,
          totalRevenue
        };
      });

      // Calculate total revenue from all plans
      const totalMonthlyRevenue = planRevenue.reduce((sum, plan) => sum + plan.totalRevenue, 0);
      
      // Calculate total from approved payments (using filtered and approved receipts)
      const totalApprovedPayments = approvedPaymentReceipts.reduce((sum, receipt) => {
        const amount = parseFloat(receipt.paymentAmount || '0');
        return sum + amount;
      }, 0);
      
      console.log("📊 [DASHBOARD] Payment receipts breakdown:", {
        total: allPaymentReceipts.length,
        afterDateFilter: filteredPaymentReceipts.length,
        approved: approvedPaymentReceipts.length,
        totalRevenue: totalApprovedPayments,
        period: hasDateFilter ? `${startDate} to ${endDate}` : 'all time'
      });
      
      // Update stats with calculated revenue
      stats.monthlyRevenue = totalMonthlyRevenue;
      stats.totalRevenue = totalApprovedPayments; // Total from filtered approved payments only

      const dashboardData = {
        stats,
        guides: filteredGuides.slice(0, 5), // Return first 5 for performance using filtered data
        networkUnits: networkUnits.slice(0, 10), // Return first 10 for performance (not date-filtered)
        clients: filteredClients.slice(0, 10), // Return first 10 for performance using filtered data
        contactSubmissions: filteredContactSubmissions.slice(0, 10), // Return first 10 for performance using filtered data
        plans,
        planDistribution,
        planRevenue,
        // Include filter info for debugging
        dateFilter: hasDateFilter ? { startDate, endDate } : null
      };

      // Cache headers for performance
      res.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=30');
      res.json(dashboardData);
      
      console.log("✅ [DASHBOARD] Dashboard data sent successfully");
      
    } catch (error) {
      console.error("❌ [DASHBOARD] Error fetching aggregated dashboard data:", error);
      res.status(500).json({ 
        error: "Erro ao buscar dados do dashboard",
        ...(process.env.NODE_ENV === "development" && { details: error instanceof Error ? error.message : "Unknown error" })
      });
    }
  });

  // ==== ADMIN ROUTES ====
  // Admin clients routes
  app.get("/admin/api/clients", requireAdmin, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const clients = await storage.getAllClients();
      res.json(clients);
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching clients:", error);
      res.status(500).json({ error: "Erro ao buscar clientes" });
    }
  });

  app.get("/admin/api/clients/:id", requireAdmin, async (req, res) => {
    try {
      const client = await storage.getClientById(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Cliente não encontrado" });
      }
      res.json(client);
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching client:", error);
      res.status(500).json({ error: "Erro ao buscar cliente" });
    }
  });

  app.get("/admin/api/clients/:id/pets", requireAdmin, async (req, res) => {
    try {
      const pets = await storage.getPetsByClientId(req.params.id);
      res.json(pets);
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching client pets:", error);
      res.status(500).json({ error: "Erro ao buscar pets do cliente" });
    }
  });

  app.get("/admin/api/clients/search/:query", requireAdmin, async (req, res) => {
    try {
      // Temporary fix: use getAllClients and filter manually
      const allClients = await storage.getAllClients();
      const query = req.params.query.toLowerCase();
      const clients = allClients.filter(client => 
        (client.fullName || '').toLowerCase().includes(query) || 
        (client.email || '').toLowerCase().includes(query) || 
        (client.phone || '').includes(query) ||
        (client.cpf || '').includes(query)
      );
      res.json(clients);
    } catch (error) {
      console.error("❌ [ADMIN] Error searching clients:", error);
      res.status(500).json({ error: "Erro ao buscar clientes" });
    }
  });

  // Search client by exact CPF
  app.get("/admin/api/clients/cpf/:cpf", requireAdmin, async (req, res) => {
    try {
      const cpf = req.params.cpf.replace(/\D/g, ''); // Remove non-numeric characters
      const client = await storage.getClientByCpf(cpf);
      
      if (!client) {
        return res.status(404).json({ error: "Cliente não encontrado com este CPF" });
      }
      
      res.json(client);
    } catch (error) {
      console.error("❌ [ADMIN] Error searching client by CPF:", error);
      res.status(500).json({ error: "Erro ao buscar cliente por CPF" });
    }
  });

  // Create new client
  app.post("/admin/api/clients", requireAdmin, async (req, res) => {
    try {
      const clientData = insertClientSchema.parse(req.body);
      
      // Map snake_case to camelCase for database
      const dbClientData = {
        fullName: clientData.full_name,
        email: clientData.email,
        phone: clientData.phone,
        cpf: clientData.cpf,
        cep: clientData.cep,
        address: clientData.address,
        number: clientData.number,
        complement: clientData.complement,
        district: clientData.district,
        state: clientData.state,
        city: clientData.city
      };
      
      const newClient = await storage.createClient(dbClientData);
      res.status(201).json(newClient);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Dados inválidos",
          ...(process.env.NODE_ENV === "development" && { details: error.errors }) 
        });
      }
      res.status(500).json({ error: "Erro ao criar cliente" });
    }
  });

  // Update client
  app.put("/admin/api/clients/:id", requireAdmin, async (req, res) => {
    try {
      const clientData = insertClientSchema.partial().parse(req.body);
      
      // Map snake_case to camelCase for database
      const dbClientData: any = {};
      if (clientData.full_name !== undefined) dbClientData.fullName = clientData.full_name;
      if (clientData.email !== undefined) dbClientData.email = clientData.email;
      if (clientData.phone !== undefined) dbClientData.phone = clientData.phone;
      if (clientData.cpf !== undefined) dbClientData.cpf = clientData.cpf;
      if (clientData.cep !== undefined) dbClientData.cep = clientData.cep;
      if (clientData.address !== undefined) dbClientData.address = clientData.address;
      if (clientData.number !== undefined) dbClientData.number = clientData.number;
      if (clientData.complement !== undefined) dbClientData.complement = clientData.complement;
      if (clientData.district !== undefined) dbClientData.district = clientData.district;
      if (clientData.state !== undefined) dbClientData.state = clientData.state;
      if (clientData.city !== undefined) dbClientData.city = clientData.city;
      
      const updatedClient = await storage.updateClient(req.params.id, dbClientData);
      
      if (!updatedClient) {
        return res.status(404).json({ error: "Cliente não encontrado" });
      }
      
      console.log("✅ [ADMIN] Client updated:", req.params.id);
      res.json(updatedClient);
    } catch (error) {
      console.error("❌ [ADMIN] Error updating client:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Dados inválidos",
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Erro ao atualizar cliente" });
    }
  });

  // Delete client
  app.delete("/admin/api/clients/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteClient(req.params.id);
      
      if (!success) {
        return res.status(404).json({ error: "Cliente não encontrado" });
      }
      
      console.log("✅ [ADMIN] Client deleted:", req.params.id);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("❌ [ADMIN] Error deleting client:", error);
      res.status(500).json({ error: "Erro ao excluir cliente" });
    }
  });

  // ==== ADMIN SELLERS ROUTES ====
  // Get all sellers
  app.get("/admin/api/sellers", requireAdmin, async (req, res) => {
    try {
      const sellers = await storage.getAllSellers();
      res.json(sellers);
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching sellers:", error);
      res.status(500).json({ error: "Erro ao buscar vendedores" });
    }
  });

  // Get single seller
  app.get("/admin/api/sellers/:id", requireAdmin, async (req, res) => {
    try {
      const seller = await storage.getSellerById(req.params.id);
      if (!seller) {
        return res.status(404).json({ error: "Vendedor não encontrado" });
      }
      res.json(seller);
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching seller:", error);
      res.status(500).json({ error: "Erro ao buscar vendedor" });
    }
  });

  // Create new seller
  app.post("/admin/api/sellers", requireAdmin, async (req, res) => {
    try {
      const { insertSellerSchema } = await import("../shared/schema.js");
      const sellerData = insertSellerSchema.parse(req.body);
      
      // Hash CPF for authentication
      const cpfHash = await bcrypt.hash(sellerData.cpf.replace(/\D/g, ''), 10);
      
      // Generate unique whitelabel URL (using seller's name)
      const baseSlug = sellerData.fullName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
        .replace(/\s+/g, "-") // Replace spaces with hyphens
        .replace(/-+/g, "-") // Remove duplicate hyphens
        .trim();
      
      // Add random suffix to ensure uniqueness
      const whitelabelUrl = `${baseSlug}-${Date.now().toString(36)}`;
      
      const dbSellerData: InsertSeller = {
        ...sellerData,
        cpfHash,
        whitelabelUrl,
        cpaPercentage: sellerData.cpaPercentage.toString(),
        recurringCommissionPercentage: sellerData.recurringCommissionPercentage.toString()
      };
      
      const newSeller = await storage.createSeller(dbSellerData);
      console.log("✅ [ADMIN] Seller created:", newSeller.id);
      res.status(201).json(newSeller);
    } catch (error) {
      console.error("❌ [ADMIN] Error creating seller:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Dados inválidos",
          ...(process.env.NODE_ENV === "development" && { details: error.errors }) 
        });
      }
      res.status(500).json({ error: "Erro ao criar vendedor" });
    }
  });

  // Update seller
  app.put("/admin/api/sellers/:id", requireAdmin, async (req, res) => {
    try {
      const { updateSellerSchema } = await import("../shared/schema.js");
      const sellerData = updateSellerSchema.parse(req.body);
      
      const dbSellerData: any = { ...sellerData };
      
      // Hash CPF if it's being updated
      if (sellerData.cpf) {
        dbSellerData.cpfHash = await bcrypt.hash(sellerData.cpf.replace(/\D/g, ''), 10);
      }
      
      // Convert percentages to strings if present
      if (sellerData.cpaPercentage !== undefined) {
        dbSellerData.cpaPercentage = sellerData.cpaPercentage.toString();
      }
      if (sellerData.recurringCommissionPercentage !== undefined) {
        dbSellerData.recurringCommissionPercentage = sellerData.recurringCommissionPercentage.toString();
      }
      
      const updatedSeller = await storage.updateSeller(req.params.id, dbSellerData);
      
      if (!updatedSeller) {
        return res.status(404).json({ error: "Vendedor não encontrado" });
      }
      
      console.log("✅ [ADMIN] Seller updated:", req.params.id);
      res.json(updatedSeller);
    } catch (error) {
      console.error("❌ [ADMIN] Error updating seller:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Dados inválidos",
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Erro ao atualizar vendedor" });
    }
  });

  // Delete seller
  app.delete("/admin/api/sellers/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteSeller(req.params.id);
      
      if (!success) {
        return res.status(404).json({ error: "Vendedor não encontrado" });
      }
      
      console.log("✅ [ADMIN] Seller deleted:", req.params.id);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("❌ [ADMIN] Error deleting seller:", error);
      res.status(500).json({ error: "Erro ao excluir vendedor" });
    }
  });

  // ==== SELLER PAYMENT ROUTES ====
  // Get seller payments
  app.get("/admin/api/sellers/:id/payments", requireAdmin, async (req, res) => {
    try {
      const payments = await storage.getSellerPayments(req.params.id);
      res.json(payments);
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching seller payments:", error);
      res.status(500).json({ error: "Erro ao buscar pagamentos do vendedor" });
    }
  });

  // Create seller payment
  app.post("/admin/api/sellers/:id/payments", requireAdmin, async (req, res) => {
    console.log("💰 [PAYMENT-ENDPOINT] Iniciando criação de pagamento");
    console.log("💰 [PAYMENT-ENDPOINT] Seller ID:", req.params.id);
    console.log("💰 [PAYMENT-ENDPOINT] Body recebido:", req.body);
    console.log("💰 [PAYMENT-ENDPOINT] Admin Session:", { 
      admin: req.session?.admin,
      login: req.session?.admin?.login,
      hasSession: !!req.session 
    });
    
    try {
      // Para admins, usar o login do admin como createdBy
      const adminLogin = req.session?.admin?.login;
      if (!adminLogin) {
        console.log("❌ [PAYMENT-ENDPOINT] Admin não autenticado");
        return res.status(401).json({ error: "Não autenticado" });
      }

      console.log("💰 [PAYMENT-ENDPOINT] Admin login:", adminLogin);
      console.log("💰 [PAYMENT-ENDPOINT] Parsing dados do pagamento...");
      
      const paymentData = insertSellerPaymentSchema.parse({
        ...req.body,
        sellerId: req.params.id,
        createdBy: adminLogin // Usar login do admin
      });
      
      console.log("💰 [PAYMENT-ENDPOINT] Dados validados:", paymentData);

      const payment = await storage.createSellerPayment({
        sellerId: paymentData.sellerId,
        amount: paymentData.amount, // Already normalized to number by schema
        paymentDate: paymentData.paymentDate || new Date(),
        description: paymentData.description || null,
        createdBy: paymentData.createdBy
      });

      console.log("✅ [ADMIN] Seller payment created:", payment.id);
      res.json(payment);
    } catch (error) {
      console.error("❌ [ADMIN] Error creating seller payment:", error);
      if (error instanceof z.ZodError) {
        console.error("❌ [ADMIN] Validation errors:", error.errors);
        return res.status(400).json({ 
          error: "Dados inválidos",
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Erro ao criar pagamento" });
    }
  });

  // Get seller sales report
  app.get("/admin/api/sellers/:id/sales-report", requireAdmin, async (req, res) => {
    try {
      const sellerId = req.params.id;
      console.log("📊 [ADMIN] Sales report endpoint called for seller:", sellerId);
      console.log("📊 [ADMIN] Request URL:", req.originalUrl);
      console.log("📊 [ADMIN] Request params:", req.params);
      
      const report = await storage.getSellerSalesReport(sellerId);
      
      console.log("📊 [ADMIN] Sales report result:", {
        sellerId,
        totalSales: report.totalSales,
        totalRevenue: report.totalRevenue,
        totalCpaCommission: report.totalCpaCommission,
        totalRecurringCommission: report.totalRecurringCommission,
        totalCommission: report.totalCommission,
        totalPaid: report.totalPaid,
        balance: report.balance
      });
      
      res.json(report);
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching seller sales report:", error);
      res.status(500).json({ error: "Erro ao buscar relatório de vendas" });
    }
  });

  // ==== SELLER ANALYTICS ROUTES ====
  // Track seller link click
  app.post("/api/seller/track-click", async (req, res) => {
    try {
      const { sellerId } = req.body;
      
      if (!sellerId) {
        return res.status(400).json({ error: "sellerId é obrigatório" });
      }
      
      // Verify seller exists
      const seller = await storage.getSellerById(sellerId);
      if (!seller) {
        return res.status(404).json({ error: "Vendedor não encontrado" });
      }
      
      // Track the click
      await storage.trackSellerClick(sellerId);
      console.log("✅ [ANALYTICS] Click tracked for seller:", sellerId);
      
      res.json({ success: true });
    } catch (error) {
      console.error("❌ [ANALYTICS] Error tracking seller click:", error);
      res.status(500).json({ error: "Erro ao rastrear clique" });
    }
  });
  
  // Track seller conversion (called during checkout)
  app.post("/api/seller/track-conversion", async (req, res) => {
    try {
      const { sellerId, revenue } = req.body;
      
      if (!sellerId) {
        return res.status(400).json({ error: "sellerId é obrigatório" });
      }
      
      // Verify seller exists
      const seller = await storage.getSellerById(sellerId);
      if (!seller) {
        return res.status(404).json({ error: "Vendedor não encontrado" });
      }
      
      // Track the conversion
      await storage.trackSellerConversion(sellerId, revenue);
      console.log("✅ [ANALYTICS] Conversion tracked for seller:", sellerId, "Revenue:", revenue);
      
      res.json({ success: true });
    } catch (error) {
      console.error("❌ [ANALYTICS] Error tracking seller conversion:", error);
      res.status(500).json({ error: "Erro ao rastrear conversão" });
    }
  });
  
  // Get seller analytics
  app.get("/api/seller/analytics/:sellerId", async (req, res) => {
    try {
      const { sellerId } = req.params;
      
      // Verify seller exists
      const seller = await storage.getSellerById(sellerId);
      if (!seller) {
        return res.status(404).json({ error: "Vendedor não encontrado" });
      }
      
      // Get analytics
      const analytics = await storage.getSellerAnalytics(sellerId);
      
      res.json(analytics);
    } catch (error) {
      console.error("❌ [ANALYTICS] Error fetching seller analytics:", error);
      res.status(500).json({ error: "Erro ao buscar estatísticas" });
    }
  });
  
  // Get seller commissions
  app.get("/api/seller/commissions/:sellerId", async (req, res) => {
    try {
      const { sellerId } = req.params;
      
      // Verify seller exists
      const seller = await storage.getSellerById(sellerId);
      if (!seller) {
        return res.status(404).json({ error: "Vendedor não encontrado" });
      }
      
      // Get all contracts for this seller
      const contracts = await storage.getAllContracts();
      const sellerContracts = contracts.filter(c => c.sellerId === sellerId);
      
      // Calculate commissions based on contract values at time of sale
      let totalCPA = 0; // One-time commission for initial sale
      let totalRecurring = 0; // Recurring commission on monthly payments
      let contractsCount = sellerContracts.length;
      
      for (const contract of sellerContracts) {
        // CPA is calculated on the first payment value
        // For annual plans, it's the annual amount
        // For monthly plans, it's the monthly amount
        const saleValue = contract.billingPeriod === 'annual' 
          ? parseFloat(contract.annualAmount || '0')
          : parseFloat(contract.monthlyAmount || '0');
        
        // Calculate CPA commission (one-time)
        const cpaCommission = (saleValue * parseFloat(seller.cpaPercentage || '0')) / 100;
        totalCPA += cpaCommission;
        
        // Calculate recurring commission (only for active contracts)
        if (contract.status === 'active') {
          const monthlyValue = parseFloat(contract.monthlyAmount || '0');
          const recurringCommission = (monthlyValue * parseFloat(seller.recurringCommissionPercentage || '0')) / 100;
          totalRecurring += recurringCommission;
        }
      }
      
      const totalToReceive = totalCPA + totalRecurring;
      
      res.json({
        totalToReceive: totalToReceive.toFixed(2),
        totalCPA: totalCPA.toFixed(2),
        totalRecurring: totalRecurring.toFixed(2),
        contractsCount,
        cpaPercentage: seller.cpaPercentage,
        recurringPercentage: seller.recurringCommissionPercentage
      });
    } catch (error) {
      console.error("❌ [COMMISSIONS] Error fetching seller commissions:", error);
      res.status(500).json({ error: "Erro ao buscar comissões" });
    }
  });

  // Get seller total payments received (protected endpoint for seller dashboard)
  app.get("/api/seller/payments-total/:sellerId", requireSellerAuth, async (req, res) => {
    try {
      const { sellerId } = req.params;
      const session = req.session as any;
      
      // Verify seller can only access their own data
      if (session.seller.id !== sellerId) {
        return res.status(403).json({ error: "Acesso negado" });
      }
      
      // Verify seller exists
      const seller = await storage.getSellerById(sellerId);
      if (!seller) {
        return res.status(404).json({ error: "Vendedor não encontrado" });
      }
      
      // Get total paid to seller
      const report = await storage.getSellerSalesReport(sellerId);
      
      res.json({
        totalPaid: report.totalPaid,
        balance: report.balance,
        totalCommission: report.totalCommission
      });
    } catch (error) {
      console.error("❌ [SELLER] Error fetching seller payments:", error);
      res.status(500).json({ error: "Erro ao buscar pagamentos" });
    }
  });

  // ==== ADMIN PAYMENT RECEIPTS ROUTES ====
  // Get all payment receipts
  app.get("/admin/api/payment-receipts", requireAdmin, async (req, res) => {
    try {
      const receipts = await storage.getAllPaymentReceipts();
      res.json(receipts);
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching payment receipts:", error);
      res.status(500).json({ error: "Erro ao buscar comprovantes de pagamento" });
    }
  });

  // Get single payment receipt by ID
  app.get("/admin/api/payment-receipts/:id", requireAdmin, async (req, res) => {
    try {
      const receipt = await storage.getPaymentReceiptById(req.params.id);
      if (!receipt) {
        return res.status(404).json({ error: "Comprovante não encontrado" });
      }
      res.json(receipt);
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching payment receipt:", error);
      res.status(500).json({ error: "Erro ao buscar comprovante" });
    }
  });

  // ==== ADMIN SATISFACTION SURVEYS ROUTES ====
  // Get all satisfaction surveys with client details
  app.get("/admin/api/satisfaction-surveys", requireAdmin, async (req, res) => {
    try {
      console.log("✅ [ADMIN] Fetching satisfaction surveys...");
      const surveys = await storage.getAllSatisfactionSurveys();
      console.log(`✅ [ADMIN] Found ${surveys.length} surveys`);
      
      // Enrich surveys with client details
      const enrichedSurveys = await Promise.all(
        surveys.map(async (survey) => {
          try {
            const client = await storage.getClientById(survey.clientId);
            
            let additionalInfo: any = {};
            
            // Get contract info if survey is related to a contract
            if (survey.contractId) {
              const contract = await storage.getContract(survey.contractId);
              if (contract) {
                additionalInfo = { contractNumber: contract.contractNumber };
              }
            }
            
            // Get service info if survey is related to service history
            if (survey.serviceHistoryId) {
              additionalInfo = { ...additionalInfo, serviceName: "Atendimento Veterinário" };
            }
            
            // Get protocol info if survey is related to a protocol
            if (survey.protocolId) {
              const protocol = await storage.getProtocol(survey.protocolId);
              if (protocol) {
                additionalInfo = { ...additionalInfo, protocolSubject: protocol.subject };
              }
            }
            
            return {
              ...survey,
              clientName: client?.fullName || 'N/A',
              clientEmail: client?.email || 'N/A',
              ...additionalInfo
            };
          } catch (error) {
            console.error(`❌ Error enriching survey ${survey.id}:`, error);
            return survey;
          }
        })
      );
      
      // Sort by date (newest first)
      enrichedSurveys.sort((a, b) => {
        const dateA = new Date(a.respondedAt);
        const dateB = new Date(b.respondedAt);
        return dateB.getTime() - dateA.getTime();
      });
      
      console.log(`✅ [ADMIN] Returning ${enrichedSurveys.length} enriched surveys`);
      res.json(enrichedSurveys);
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching satisfaction surveys:", error);
      res.status(500).json({ error: "Erro ao buscar avaliações" });
    }
  });

  // ==== ADMIN CONTRACTS ROUTES ====
  // Get all contracts with client and pet details
  app.get("/admin/api/contracts", requireAdmin, async (req, res) => {
    try {
      const contracts = await storage.getAllContracts();
      
      // Enrich contracts with client, pet, and plan details
      const enrichedContracts = await Promise.all(
        contracts.map(async (contract) => {
          try {
            const client = await storage.getClientById(contract.clientId);
            const pet = await storage.getPet(contract.petId);
            const plan = await storage.getPlan(contract.planId);
            
            return {
              ...contract,
              clientName: client?.fullName || 'N/A',
              clientEmail: client?.email || 'N/A',
              clientPhone: client?.phone || 'N/A',
              petName: pet?.name || 'N/A',
              petSpecies: pet?.species || 'N/A',
              planName: plan?.name || 'N/A',
            };
          } catch (error) {
            console.error(`❌ Error enriching contract ${contract.id}:`, error);
            return contract;
          }
        })
      );
      
      res.json(enrichedContracts);
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching contracts:", error);
      res.status(500).json({ error: "Erro ao buscar contratos" });
    }
  });

  // Get single contract by ID
  app.get("/admin/api/contracts/:id", requireAdmin, async (req, res) => {
    try {
      const contract = await storage.getContract(req.params.id);
      if (!contract) {
        return res.status(404).json({ error: "Contrato não encontrado" });
      }
      
      // Enrich with client, pet, and plan details
      try {
        const client = await storage.getClientById(contract.clientId);
        const pet = await storage.getPet(contract.petId);
        const plan = await storage.getPlan(contract.planId);
        
        res.json({
          ...contract,
          clientName: client?.fullName || 'N/A',
          clientEmail: client?.email || 'N/A',
          clientPhone: client?.phone || 'N/A',
          petName: pet?.name || 'N/A',
          petSpecies: pet?.species || 'N/A',
          planName: plan?.name || 'N/A',
        });
      } catch (error) {
        console.error(`❌ Error enriching contract ${contract.id}:`, error);
        res.json(contract);
      }
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching contract:", error);
      res.status(500).json({ error: "Erro ao buscar contrato" });
    }
  });

  // Update contract (PATCH)
  app.patch("/admin/api/contracts/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { monthlyAmount, status } = req.body;

      // Validate input
      if (!monthlyAmount || !status) {
        return res.status(400).json({ error: "Valor mensal e status são obrigatórios" });
      }

      // Validate monthlyAmount is a valid number
      const amount = parseFloat(monthlyAmount);
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: "Valor mensal inválido" });
      }

      // Validate status
      const validStatuses = ['active', 'inactive', 'suspended', 'cancelled', 'pending'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Status inválido" });
      }

      // Update contract
      await storage.updateContract(id, {
        monthlyAmount: amount.toString(),
        status,
      });

      res.json({ 
        success: true,
        message: "Contrato atualizado com sucesso" 
      });
    } catch (error) {
      console.error("❌ [ADMIN] Error updating contract:", error);
      res.status(500).json({ error: "Erro ao atualizar contrato" });
    }
  });

  // ==== ADMIN PETS ROUTES ====
  // Get single pet by ID
  app.get("/admin/api/pets/:id", requireAdmin, async (req, res) => {
    try {
      const pet = await storage.getPet(req.params.id);
      if (!pet) {
        return res.status(404).json({ error: "Pet não encontrado" });
      }
      res.json(pet);
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching pet:", error);
      res.status(500).json({ error: "Erro ao buscar pet" });
    }
  });

  // Get available procedures for a pet based on their plan and usage
  app.get("/admin/api/pets/:id/available-procedures", requireAdmin, async (req, res) => {
    try {
      const petId = req.params.id;
      const year = new Date().getFullYear();
      
      // Get pet with plan
      const pet = await storage.getPet(petId);
      if (!pet) {
        return res.status(404).json({ error: "Pet não encontrado" });
      }
      
      if (!pet.planId) {
        return res.json({ procedures: [], message: "Pet sem plano" });
      }
      
      // Get procedures for this pet's plan
      const planProcedures = await storage.getPlanProceduresWithDetails(pet.planId);
      
      // Get usage for this pet
      const usage = await storage.getProcedureUsageByPet(petId, year);
      
      // Map procedures with availability
      const availableProcedures = planProcedures.map((pp: any) => {
        // Find usage for this procedure
        const usageRecord = usage.find((u: any) => u.procedureId === pp.procedureId);
        
        // Extract numeric limit from limitesAnuais string
        let annualLimit = 0;
        if (pp.limitesAnuais) {
          const match = pp.limitesAnuais.match(/(\d+)/);
          if (match) {
            annualLimit = parseInt(match[1], 10);
          }
        }
        
        const usedCount = usageRecord ? usageRecord.usageCount : 0;
        const remaining = Math.max(0, annualLimit - usedCount);
        
        // Calculate waiting period days remaining
        let waitingDaysRemaining = 0;
        if (pp.carencia) {
          const carenciaMatch = pp.carencia.match(/(\d+)/);
          if (carenciaMatch) {
            const waitingDaysTotal = parseInt(carenciaMatch[1], 10);
            const petCreatedDate = new Date(pet.createdAt);
            const currentDate = new Date();
            const daysSinceRegistered = Math.floor((currentDate.getTime() - petCreatedDate.getTime()) / (1000 * 60 * 60 * 24));
            waitingDaysRemaining = Math.max(0, waitingDaysTotal - daysSinceRegistered);
          }
        }
        
        const canUse = remaining > 0 && waitingDaysRemaining === 0;
        
        return {
          id: pp.procedureId,
          name: pp.procedureName,
          annualLimit: annualLimit,
          used: usedCount,
          remaining: remaining,
          canUse: canUse,
          waitingDaysRemaining: waitingDaysRemaining,
          coparticipation: pp.coparticipacao ? pp.coparticipacao / 100 : 0
        };
      }).filter((p: any) => p.canUse && p.annualLimit > 0); // Only return usable procedures
      
      res.json({
        procedures: availableProcedures,
        petName: pet.name,
        planId: pet.planId
      });
      
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching available procedures:", error);
      res.status(500).json({ error: "Erro ao buscar procedimentos disponíveis" });
    }
  });

  // Create new pet
  app.post("/admin/api/pets", requireAdmin, async (req, res) => {
    try {
      // SECURITY: Use Zod schema validation to prevent mass assignment attacks
      const validatedPetData = insertPetSchema.parse(req.body);
      
      // Tratar campos vazios antes de salvar no banco
      const processedPetData = {
        ...validatedPetData,
        weight: validatedPetData.weight && validatedPetData.weight !== "" ? validatedPetData.weight : null,
        birthDate: validatedPetData.birthDate || null,
        vaccineData: validatedPetData.vaccineData || [],
        planId: validatedPetData.planId && validatedPetData.planId !== "" ? validatedPetData.planId : null,
      } as any; // Type assertion para permitir campos opcionais
      
      const newPet = await storage.createPet(processedPetData);
      res.status(201).json(newPet);
    } catch (error) {
      console.error("❌ [ADMIN] Error creating pet:", error);
      res.status(500).json({ error: "Erro ao criar pet" });
    }
  });

  // Update pet
  app.put("/admin/api/pets/:id", requireAdmin, async (req, res) => {
    try {
      // SECURITY: Use Zod schema validation to prevent mass assignment attacks
      const validatedPetData = updatePetSchema.parse(req.body);
      
      // Tratar campos vazios antes de salvar no banco
      const processedPetData = {
        ...validatedPetData,
        weight: validatedPetData.weight && validatedPetData.weight !== "" ? validatedPetData.weight : null,
        birthDate: validatedPetData.birthDate || null,
        vaccineData: validatedPetData.vaccineData || [],
        planId: validatedPetData.planId && validatedPetData.planId !== "" ? validatedPetData.planId : null,
      };
      
      const updatedPet = await storage.updatePet(req.params.id, processedPetData);
      
      if (!updatedPet) {
        return res.status(404).json({ error: "Pet não encontrado" });
      }
      
      console.log("✅ [ADMIN] Pet updated:", req.params.id);
      res.json(updatedPet);
    } catch (error) {
      console.error("❌ [ADMIN] Error updating pet:", error);
      res.status(500).json({ error: "Erro ao atualizar pet" });
    }
  });

  // Delete pet
  app.delete("/admin/api/pets/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deletePet(req.params.id);
      
      if (!success) {
        return res.status(404).json({ error: "Pet não encontrado" });
      }
      
      console.log("✅ [ADMIN] Pet deleted:", req.params.id);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("❌ [ADMIN] Error deleting pet:", error);
      res.status(500).json({ error: "Erro ao excluir pet" });
    }
  });

  // Admin contact submissions routes  
  app.get("/admin/api/contact-submissions", requireAdmin, async (req, res) => {
    try {
      const submissions = await storage.getAllContactSubmissions();
      res.json(submissions);
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching contact submissions:", error);
      res.status(500).json({ error: "Erro ao buscar contatos" });
    }
  });

  // Admin FAQ routes
  app.get("/admin/api/faq", requireAdmin, async (req, res) => {
    try {
      const faqItems = await storage.getAllFaqItems();
      res.json(faqItems);
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching FAQ items:", error);
      res.status(500).json({ error: "Erro ao buscar FAQ" });
    }
  });

  app.post("/admin/api/faq", requireAdmin, async (req, res) => {
    try {
      const validatedData = insertFaqItemSchema.parse(req.body);
      // Ensure required properties are present
      const faqData = {
        displayOrder: validatedData.displayOrder!,
        question: validatedData.question!,
        answer: validatedData.answer!,
        isActive: validatedData.isActive
      };
      const newItem = await storage.createFaqItem(faqData);
      console.log("✅ [ADMIN] FAQ item created:", newItem.id);
      res.json(newItem);
    } catch (error) {
      console.error("❌ [ADMIN] Error creating FAQ item:", error);
      res.status(400).json({ error: "Erro ao criar item do FAQ" });
    }
  });

  app.put("/admin/api/faq/:id", requireAdmin, async (req, res) => {
    try {
      const validatedData = insertFaqItemSchema.parse(req.body);
      // Ensure required properties are present for update
      const updateData = {
        displayOrder: validatedData.displayOrder!,
        question: validatedData.question!,
        answer: validatedData.answer!,
        isActive: validatedData.isActive
      };
      const updatedItem = await storage.updateFaqItem(req.params.id, updateData);
      if (!updatedItem) {
        return res.status(404).json({ error: "Item do FAQ não encontrado" });
      }
      console.log("✅ [ADMIN] FAQ item updated:", req.params.id);
      res.json(updatedItem);
    } catch (error) {
      console.error("❌ [ADMIN] Error updating FAQ item:", error);
      res.status(400).json({ error: "Erro ao atualizar item do FAQ" });
    }
  });

  app.delete("/admin/api/faq/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteFaqItem(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Item do FAQ não encontrado" });
      }
      console.log("✅ [ADMIN] FAQ item deleted:", req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("❌ [ADMIN] Error deleting FAQ item:", error);
      res.status(500).json({ error: "Erro ao deletar item do FAQ" });
    }
  });

  // Admin guides routes
  app.get("/admin/api/guides", requireAdmin, async (req, res) => {
    
    try {
      const guides = await storage.getAllGuides();
      res.json(guides);
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching guides:", error);
      res.status(500).json({ error: "Erro ao buscar guias" });
    }
  });

  app.get("/admin/api/guides/with-network-units", requireAdmin, async (req, res) => {
    
    try {
      // Parse query parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || '';
      const status = (req.query.status as string) || 'all';
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      // Get all guides first (we'll implement filtering here directly)
      const allGuides = await storage.getAllGuides();
      
      // Apply filters
      let filteredGuides = allGuides;
      
      // Search filter - search in procedure, procedureNotes, or generalNotes
      if (search && search.trim()) {
        const searchTerm = search.trim().toLowerCase();
        filteredGuides = filteredGuides.filter(guide => 
          (guide.procedure && guide.procedure.toLowerCase().includes(searchTerm)) ||
          (guide.procedureNotes && guide.procedureNotes.toLowerCase().includes(searchTerm)) ||
          (guide.generalNotes && guide.generalNotes.toLowerCase().includes(searchTerm))
        );
      }
      
      // Status filter
      if (status && status !== 'all') {
        filteredGuides = filteredGuides.filter(guide => guide.status === status);
      }
      
      // Date filters
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filteredGuides = filteredGuides.filter(guide => 
          guide.createdAt && new Date(guide.createdAt) >= start
        );
      }
      
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filteredGuides = filteredGuides.filter(guide => 
          guide.createdAt && new Date(guide.createdAt) <= end
        );
      }
      
      // Sort by createdAt descending (newest first)
      filteredGuides.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      
      // Calculate pagination
      const total = filteredGuides.length;
      const totalPages = Math.ceil(total / limit);
      const offset = (page - 1) * limit;
      const paginatedGuides = filteredGuides.slice(offset, offset + limit);
      
      // Return paginated response in the format expected by frontend
      const response = {
        data: paginatedGuides,
        total,
        totalPages,
        page
      };
      
      res.json(response);
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching guides with network units:", error);
      res.status(500).json({ error: "Erro ao buscar guias" });
    }
  });

  app.get("/admin/api/guides/:id", requireAdmin, async (req, res) => {
    try {
      const guide = await storage.getGuide(req.params.id);
      if (!guide) {
        return res.status(404).json({ error: "Guia não encontrado" });
      }
      res.json(guide);
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching guide:", error);
      res.status(500).json({ error: "Erro ao buscar guia" });
    }
  });

  // Create new guide
  app.post("/admin/api/guides", requireAdmin, adminCRUDLimiter, async (req, res) => {
    try {
      const guideData = insertGuideSchema.parse(req.body);
      
      // Convert Brazilian decimal format (10,00) to numeric format (10.00)
      let processedValue: string | undefined;
      if (guideData.value && typeof guideData.value === 'string') {
        processedValue = guideData.value.replace('.', '').replace(',', '.');
      }
      
      const processedGuideData: InsertGuide = {
        ...guideData,
        clientId: guideData.clientId!,
        petId: guideData.petId!,
        procedure: guideData.procedure!,
        value: processedValue
      };
      
      console.log(`📝 [ADMIN] Creating new guide:`, processedGuideData);
      
      const newGuide = await storage.createGuide(processedGuideData);
      
      // Automatically register procedure usage when guide is created
      if (guideData.petId && guideData.procedure) {
        try {
          const year = new Date().getFullYear();
          
          // Get pet's plan to check procedure limits
          const pet = await storage.getPet(guideData.petId);
          if (pet && pet.planId) {
            // Find procedure in plan to get procedureId and limit
            const planProcedures = await storage.getPlanProceduresWithDetails(pet.planId);
            const procedureInPlan = planProcedures.find((p: any) => p.name === guideData.procedure);
            
            if (procedureInPlan && procedureInPlan.procedureId && procedureInPlan.annualLimit) {
              // Get current usage
              const usageRecords = await storage.getProcedureUsageByPet(guideData.petId, year);
              const currentUsage = usageRecords.find((u: any) => u.procedureId === procedureInPlan.procedureId && u.planId === pet.planId);
              const used = currentUsage?.usageCount || 0;
              const remaining = procedureInPlan.annualLimit - used;
              
              // Only register if there's remaining limit
              if (remaining > 0) {
                await storage.incrementProcedureUsage(guideData.petId, procedureInPlan.procedureId, pet.planId);
                console.log(`✅ [ADMIN] Procedure usage automatically registered for pet ${guideData.petId}, procedure ${procedureInPlan.procedureId}`);
              } else {
                console.log(`⚠️ [ADMIN] Procedure limit reached for pet ${guideData.petId}, procedure ${procedureInPlan.procedureId}`);
              }
            }
          }
        } catch (error) {
          // Log error but don't fail the guide creation
          console.error("❌ [ADMIN] Error registering procedure usage:", error);
        }
      }
      
      console.log(`✅ [ADMIN] Guide created:`, newGuide.id);
      res.status(201).json(newGuide);
    } catch (error: any) {
      console.error("❌ [ADMIN] Error creating guide:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: "Erro ao criar guia" });
    }
  });

  // Update guide
  app.put("/admin/api/guides/:id", requireAdmin, adminCRUDLimiter, async (req, res) => {
    try {
      const guideData = insertGuideSchema.partial().parse(req.body);
      
      // Convert Brazilian decimal format (10,00) to numeric format (10.00)
      const processedGuideData: Partial<InsertGuide> = { ...guideData };
      if (guideData.value && typeof guideData.value === 'string') {
        processedGuideData.value = guideData.value.replace('.', '').replace(',', '.');
      }
      
      const updatedGuide = await storage.updateGuide(req.params.id, processedGuideData);
      
      if (!updatedGuide) {
        return res.status(404).json({ error: "Guia não encontrado" });
      }
      
      console.log(`✅ [ADMIN] Guide updated:`, updatedGuide.id);
      res.json(updatedGuide);
    } catch (error: any) {
      console.error("❌ [ADMIN] Error updating guide:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: "Erro ao atualizar guia" });
    }
  });

  // Delete guide
  app.delete("/admin/api/guides/:id", requireAdmin, adminCRUDLimiter, async (req, res) => {
    try {
      const success = await storage.deleteGuide(req.params.id);
      
      if (!success) {
        return res.status(404).json({ error: "Guia não encontrado" });
      }
      
      console.log(`✅ [ADMIN] Guide deleted:`, req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("❌ [ADMIN] Error deleting guide:", error);
      res.status(500).json({ error: "Erro ao deletar guia" });
    }
  });

  // Admin plans routes
  app.get("/admin/api/plans", requireAdmin, async (req, res) => {
    try {
      const plans = await storage.getAllPlans();
      res.json(plans);
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching plans:", error);
      res.status(500).json({ error: "Erro ao buscar planos" });
    }
  });

  app.get("/admin/api/plans/active", requireAdmin, async (req, res) => {
    try {
      const plans = await storage.getPlans(); // Get active plans
      res.json(plans);
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching active plans:", error);
      res.status(500).json({ error: "Erro ao buscar planos ativos" });
    }
  });

  // Get single plan by ID
  app.get("/admin/api/plans/:id", requireAdmin, async (req, res) => {
    try {
      const plan = await storage.getPlan(req.params.id);
      if (!plan) {
        return res.status(404).json({ error: "Plano não encontrado" });
      }
      res.json(plan);
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching plan:", error);
      res.status(500).json({ error: "Erro ao buscar plano" });
    }
  });

  // Get procedures for a specific plan
  app.get("/admin/api/plans/:id/procedures", requireAdmin, async (req, res) => {
    try {
      const planId = req.params.id;
      console.log(`📋 [ADMIN] Getting procedures for plan ${planId}`);
      
      const procedures = await storage.getPlanProceduresWithDetails(planId);
      console.log(`✅ [ADMIN] Found ${procedures.length} procedures for plan ${planId}`);
      
      res.json(procedures);
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching plan procedures:", error);
      res.status(500).json({ error: "Erro ao buscar procedimentos do plano" });
    }
  });

  // Create new plan
  app.post("/admin/api/plans", requireAdmin, async (req, res) => {
    try {
      const planData = req.body;
      
      console.log(`📝 [ADMIN] Creating new plan with data:`, planData);
      
      // Converter price para decimal se estiver em centavos
      if (planData.price !== undefined) {
        planData.basePrice = (planData.price / 100).toFixed(2);
        delete planData.price;
      }
      
      // Preparar dados para criação
      const newPlanData = {
        name: planData.name,
        description: planData.description || '',
        planType: planData.planType || 'standard',
        image: planData.image || '/images/plan-default.jpg',
        buttonText: planData.buttonText || 'Saiba mais',
        displayOrder: planData.displayOrder || 0,
        isActive: planData.isActive !== undefined ? planData.isActive : true,
        basePrice: planData.basePrice || '0.00',
        features: planData.features || [],
        installmentPrice: planData.installmentPrice || '0.00',
        installmentCount: planData.installmentCount || 1,
        perPetBilling: planData.perPetBilling || false,
        petDiscounts: planData.petDiscounts || {},
        paymentDescription: planData.paymentDescription || '',
        availablePaymentMethods: planData.availablePaymentMethods || ['credit_card', 'pix', 'bank_slip'],
        availableBillingOptions: planData.availableBillingOptions || ['monthly', 'annual'],
        annualPrice: planData.annualPrice || '0.00',
        annualInstallmentPrice: planData.annualInstallmentPrice || '0.00',
        annualInstallmentCount: planData.annualInstallmentCount || 1,
      };
      
      const newPlan = await storage.createPlan(newPlanData);
      
      console.log(`✅ [ADMIN] New plan created successfully:`, newPlan.id);
      res.status(201).json(newPlan);
    } catch (error) {
      console.error("❌ [ADMIN] Error creating plan:", error);
      res.status(500).json({ error: "Erro ao criar plano" });
    }
  });

  // Update plan - accepts all plan fields
  app.put("/admin/api/plans/:id", requireAdmin, async (req, res) => {
    try {
      const planId = req.params.id;
      const updateData = req.body;
      
      console.log(`📝 [ADMIN] Updating plan ${planId} with data:`, updateData);
      
      // Converter price para decimal se estiver em centavos
      if (updateData.price !== undefined) {
        updateData.basePrice = (updateData.price / 100).toFixed(2);
        delete updateData.price;
      }
      
      // Garantir que campos opcionais sejam tratados corretamente
      const planUpdateData = {
        name: updateData.name,
        description: updateData.description,
        planType: updateData.planType,
        image: updateData.image,
        buttonText: updateData.buttonText,
        displayOrder: updateData.displayOrder,
        isActive: updateData.isActive,
        basePrice: updateData.basePrice,
        // Adicionar outros campos conforme necessário
      };
      
      // Remover campos undefined
      Object.keys(planUpdateData).forEach(key => {
        if (planUpdateData[key] === undefined) {
          delete planUpdateData[key];
        }
      });
      
      const updatedPlan = await storage.updatePlan(planId, planUpdateData);
      
      if (!updatedPlan) {
        return res.status(404).json({ error: "Plano não encontrado" });
      }
      
      console.log(`✅ [ADMIN] Plan ${planId} updated successfully`);
      res.json(updatedPlan);
    } catch (error) {
      console.error("❌ [ADMIN] Error updating plan:", error);
      res.status(500).json({ error: "Erro ao atualizar plano" });
    }
  });

  // Admin network units routes
  app.get("/admin/api/network-units", requireAdmin, adminCRUDLimiter, async (req, res) => {
    try {
      const units = await storage.getAllNetworkUnits();
      res.json(units);
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching network units:", error);
      res.status(500).json({ error: "Erro ao buscar unidades da rede" });
    }
  });

  // Create new network unit
  app.post("/admin/api/network-units", requireAdmin, adminCRUDLimiter, async (req, res) => {
    try {
      console.log("📝 [ADMIN] Creating new network unit...");
      console.log("📦 [ADMIN] Received data:", req.body);
      
      // Validate the request body
      const validatedData = insertNetworkUnitSchema.parse(req.body);
      console.log("✅ [ADMIN] Data validated successfully");
      
      // Ensure required properties are present
      const unitData = {
        name: validatedData.name!,
        phone: validatedData.phone!,
        address: validatedData.address!,
        cidade: validatedData.cidade!,
        services: validatedData.services!,
        imageUrl: validatedData.imageUrl!,
        isActive: validatedData.isActive,
        whatsapp: validatedData.whatsapp,
        googleMapsUrl: validatedData.googleMapsUrl,
        imageData: validatedData.imageData,
        urlSlug: validatedData.urlSlug
      };
      
      // Create the network unit
      const newUnit = await storage.createNetworkUnit(unitData);
      console.log("✨ [ADMIN] Network unit created successfully:", newUnit.id);
      
      res.status(201).json(newUnit);
    } catch (error) {
      console.error("❌ [ADMIN] Error creating network unit:", error);
      if (error instanceof z.ZodError) {
        console.error("📋 [ADMIN] Validation errors:", error.errors);
        return res.status(400).json({ 
          error: "Dados inválidos", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Erro ao criar unidade" });
    }
  });

  // Network units with credentials route (must come before :id route)
  app.get("/admin/api/network-units/credentials", requireAdmin, adminCRUDLimiter, async (req, res) => {
    try {
      const units = await storage.getAllNetworkUnits();
      
      // Map units to include only credential status (don't expose hasLogin/hasPassword)
      const unitsWithCredentials = units.map(unit => ({
        ...unit,
        hasCredentials: (unit.login && unit.senhaHash) ? true : false,
        credentialStatus: (unit.login && unit.senhaHash) ? 'configured' : 'pending'
      }));
      
      res.json(unitsWithCredentials);
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching network units with credentials:", error);
      res.status(500).json({ error: "Erro ao buscar unidades com credenciais" });
    }
  });

  app.put("/admin/api/network-units/:id/credentials", requireAdmin, adminCRUDLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      const { login, password } = req.body;
      
      if (!login || !password) {
        return res.status(400).json({ error: "Login e senha são obrigatórios" });
      }
      
      // Hash password before storing
      const hashedPassword = await bcrypt.hash(password, 10);
      
      console.log(`🔐 [CREDENTIALS] Atualizando credenciais da unidade ${id}:`, {
        login,
        hashedPasswordLength: hashedPassword.length,
        passwordInputLength: password.length
      });
      
      const updatedUnit = await storage.updateNetworkUnit(id, {
        login,
        senhaHash: hashedPassword
      });
      
      if (!updatedUnit) {
        return res.status(404).json({ error: "Unidade não encontrada" });
      }
      
      console.log(`✅ [CREDENTIALS] Credenciais atualizadas com sucesso para unidade: ${updatedUnit.name} (${updatedUnit.urlSlug})`);
      console.log(`🔑 [CREDENTIALS] Login: ${login} | Use esta senha para acessar: ${password}`);
      
      // Remove sensitive data from response
      const { senhaHash, ...unitResponse } = updatedUnit;
      res.json({
        ...unitResponse,
        hasCredentials: true,
        credentialStatus: 'configured'
      });
    } catch (error) {
      console.error("❌ [ADMIN] Error updating network unit credentials:", error);
      res.status(400).json({ error: "Erro ao atualizar credenciais" });
    }
  });

  app.post("/admin/api/network-units/upload-image", requireAdmin, uploadRateLimiter, upload.single('image'), validateImageContent, async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhuma imagem foi enviada" });
      }

      const unitId = req.body.unitId || 'new';
      const imageBuffer = req.file.buffer;
      const mimeType = req.file.mimetype;

      // Fazer upload usando o serviço de storage
      const result = await supabaseStorage.uploadNetworkUnitImage(
        unitId,
        imageBuffer,
        mimeType
      );

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      res.json({ 
        success: true,
        imageUrl: result.publicUrl
      });
    } catch (error) {
      console.error("❌ [ADMIN] Error uploading network unit image:", error);
      res.status(500).json({ error: "Erro ao fazer upload da imagem" });
    }
  });

  app.post("/admin/api/settings/upload-image", requireAdmin, uploadRateLimiter, upload.single('image'), validateImageContent, async (req, res) => {

    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhuma imagem foi enviada" });
      }

      const imageType = req.body.imageType || 'main';
      const imageBuffer = req.file.buffer;
      const mimeType = req.file.mimetype;

      const result = await supabaseStorage.uploadSiteSettingsImage(
        imageType,
        imageBuffer,
        mimeType
      );

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      res.json({ 
        success: true,
        imageUrl: result.publicUrl
      });
    } catch (error) {
      console.error("❌ [ADMIN] Error uploading site settings image:", error);
      res.status(500).json({ error: "Erro ao fazer upload da imagem" });
    }
  });

  app.post("/admin/api/settings/chat/upload-image", requireAdmin, uploadRateLimiter, upload.single('image'), validateImageContent, async (req, res) => {

    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhuma imagem foi enviada" });
      }

      const imageType = req.body.imageType as 'bot' | 'user';
      if (!imageType || (imageType !== 'bot' && imageType !== 'user')) {
        return res.status(400).json({ error: "Tipo de imagem inválido. Use 'bot' ou 'user'" });
      }

      const imageBuffer = req.file.buffer;
      const mimeType = req.file.mimetype;

      const result = await supabaseStorage.uploadChatImage(
        imageType,
        imageBuffer,
        mimeType
      );

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      res.json({ 
        success: true,
        imageUrl: result.publicUrl
      });
    } catch (error) {
      console.error("❌ [ADMIN] Error uploading chat image:", error);
      res.status(500).json({ error: "Erro ao fazer upload da imagem do chat" });
    }
  });


  // GET site settings
  app.get("/admin/api/settings/site", requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getSiteSettings();
      if (!settings) {
        return res.status(404).json({ error: "Configurações não encontradas" });
      }
      res.json(settings);
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching site settings:", error);
      res.status(500).json({ error: "Erro ao buscar configurações do site" });
    }
  });

  // PUT site settings
  app.put("/admin/api/settings/site", requireAdmin, async (req, res) => {
    try {
      console.log("📝 [ADMIN] Received site settings update:", req.body);
      console.log("📝 [ADMIN] aboutImageUrl field:", req.body.aboutImageUrl);
      const updatedSettings = await storage.updateSiteSettings(req.body);
      console.log("✅ [ADMIN] Site settings updated successfully, aboutImageUrl:", updatedSettings?.aboutImageUrl);
      res.json(updatedSettings);
    } catch (error) {
      console.error("❌ [ADMIN] Error updating site settings:", error);
      res.status(500).json({ error: "Erro ao atualizar configurações do site" });
    }
  });

  // GET rules settings
  app.get("/admin/api/settings/rules", requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getRulesSettings();
      if (!settings) {
        return res.status(404).json({ error: "Configurações de regras não encontradas" });
      }
      res.json(settings);
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching rules settings:", error);
      res.status(500).json({ error: "Erro ao buscar configurações de regras" });
    }
  });

  // PUT rules settings
  app.put("/admin/api/settings/rules", requireAdmin, async (req, res) => {
    try {
      const updatedSettings = await storage.updateRulesSettings(req.body);
      res.json(updatedSettings);
    } catch (error) {
      console.error("❌ [ADMIN] Error updating rules settings:", error);
      res.status(500).json({ error: "Erro ao atualizar configurações de regras" });
    }
  });

  // GET chat settings
  app.get("/admin/api/settings/chat", requireAdmin, async (req, res) => {
    try {
      let settings = await storage.getChatSettings();
      if (!settings) {
        // Criar configurações padrão se não existirem
        settings = await storage.createDefaultChatSettings();
      }
      res.json(settings);
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching chat settings:", error);
      res.status(500).json({ error: "Erro ao buscar configurações do chat" });
    }
  });

  // PUT chat settings
  app.put("/admin/api/settings/chat", requireAdmin, async (req, res) => {
    try {
      console.log("📝 [ADMIN] Received chat settings update:", req.body);
      const updatedSettings = await storage.updateChatSettings(req.body);
      console.log("✅ [ADMIN] Chat settings updated successfully");
      res.json(updatedSettings);
    } catch (error) {
      console.error("❌ [ADMIN] Error updating chat settings:", error);
      res.status(500).json({ error: "Erro ao atualizar configurações do chat" });
    }
  });

  app.get("/admin/api/network-units/:id", requireAdmin, async (req, res) => {
    try {
      const unit = await storage.getNetworkUnit(req.params.id);
      if (!unit) {
        return res.status(404).json({ error: "Unidade não encontrada" });
      }
      res.json(unit);
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching network unit:", error);
      res.status(500).json({ error: "Erro ao buscar unidade" });
    }
  });

  app.put("/admin/api/network-units/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = updateNetworkUnitSchema.partial().parse(req.body);
      
      const updatedUnit = await storage.updateNetworkUnit(id, updateData);
      
      if (!updatedUnit) {
        return res.status(404).json({ error: "Unidade não encontrada" });
      }
      
      res.json(updatedUnit);
    } catch (error) {
      console.error("❌ [ADMIN] Error updating network unit:", error);
      res.status(400).json({ error: "Erro ao atualizar unidade" });
    }
  });

  app.delete("/admin/api/network-units/:id", requireAdmin, async (req, res) => {
    
    try {
      const { id } = req.params;
      
      const deleted = await storage.deleteNetworkUnit(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Unidade não encontrada" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("❌ [ADMIN] Error deleting network unit:", error);
      res.status(500).json({ error: "Erro ao excluir unidade" });
    }
  });

  // Admin procedures routes
  app.get("/admin/api/procedures", requireAdmin, async (req, res) => {
    
    try {
      const procedures = await storage.getAllProcedures();
      res.json(procedures);
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching procedures:", error);
      res.status(500).json({ error: "Erro ao buscar procedimentos" });
    }
  });

  // Get procedure categories
  app.get("/admin/api/procedure-categories", requireAdmin, async (req, res) => {
    try {
      const categories = await storage.getProcedureCategories();
      res.json(categories);
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching procedure categories:", error);
      res.status(500).json({ error: "Erro ao buscar categorias" });
    }
  });
  
  // Create new procedure
  app.post("/admin/api/procedures", requireAdmin, async (req, res) => {
    
    try {
      console.log("📝 [ADMIN] Creating new procedure:", req.body);
      const newProcedure = await storage.createProcedure(req.body);
      console.log("✅ [ADMIN] Procedure created successfully:", newProcedure);
      res.status(201).json(newProcedure);
    } catch (error) {
      console.error("❌ [ADMIN] Error creating procedure:", error);
      res.status(500).json({ error: "Erro ao criar procedimento" });
    }
  });

  // Update procedure
  app.put("/admin/api/procedures/:id", requireAdmin, async (req, res) => {
    
    try {
      const { id } = req.params;
      console.log(`📝 [ADMIN] Updating procedure ${id}:`, req.body);
      const updatedProcedure = await storage.updateProcedure(id, req.body);
      
      if (!updatedProcedure) {
        return res.status(404).json({ error: "Procedimento não encontrado" });
      }
      
      console.log("✅ [ADMIN] Procedure updated successfully:", updatedProcedure);
      res.json(updatedProcedure);
    } catch (error) {
      console.error("❌ [ADMIN] Error updating procedure:", error);
      res.status(500).json({ error: "Erro ao atualizar procedimento" });
    }
  });

  // Delete procedure
  app.delete("/admin/api/procedures/:id", requireAdmin, async (req, res) => {
    
    try {
      const { id } = req.params;
      console.log(`🗑️ [ADMIN] Deleting procedure ${id}`);
      const deleted = await storage.deleteProcedure(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Procedimento não encontrado" });
      }
      
      console.log("✅ [ADMIN] Procedure deleted successfully");
      res.status(204).send();
    } catch (error) {
      console.error("❌ [ADMIN] Error deleting procedure:", error);
      res.status(500).json({ error: "Erro ao excluir procedimento" });
    }
  });

  // Get procedure plans
  app.get("/admin/api/procedures/:id/plans", requireAdmin, async (req, res) => {
    
    try {
      const { id } = req.params;
      console.log(`📋 [ADMIN] Getting plans for procedure ${id}`);
      const procedurePlans = await storage.getProcedurePlans(id);
      console.log(`✅ [ADMIN] Found ${procedurePlans.length} plans for procedure`);
      res.json(procedurePlans);
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching procedure plans:", error);
      res.status(500).json({ error: "Erro ao buscar planos do procedimento" });
    }
  });

  // Update procedure plans (atomic operation)
  app.put("/admin/api/procedures/:id/plans", requireAdmin, async (req, res) => {
    
    try {
      const { id } = req.params;
      const { procedurePlans } = req.body;
      
      console.log(`📝 [ADMIN] Updating plans for procedure ${id}:`, procedurePlans);
      
      // Delete existing relations and insert new ones atomically
      await storage.updateProcedurePlans(id, procedurePlans);
      
      console.log("✅ [ADMIN] Procedure plans updated successfully");
      res.json({ success: true });
    } catch (error) {
      console.error("❌ [ADMIN] Error updating procedure plans:", error);
      res.status(500).json({ error: "Erro ao atualizar planos do procedimento" });
    }
  });

  // Admin users routes
  app.get("/admin/api/users", requireAdmin, adminCRUDLimiter, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching users:", error);
      res.status(500).json({ error: "Erro ao buscar usuários" });
    }
  });

  app.post("/admin/api/users", requireAdmin, adminCRUDLimiter, async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Hash password before storing
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      
      const newUser = await storage.createUser({
        ...validatedData,
        username: validatedData.username || validatedData.email || 'user',
        email: validatedData.email || '',
        isActive: Boolean(validatedData.isActive),
        password: hashedPassword
      });
      
      // Remove password from response
      const { password, ...userResponse } = newUser;
      res.status(201).json(userResponse);
    } catch (error) {
      console.error("❌ [ADMIN] Error creating user:", error);
      res.status(400).json({ error: "Erro ao criar usuário" });
    }
  });

  app.put("/admin/api/users/:id", requireAdmin, adminCRUDLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Validate update data with Zod schema
      const validatedData = updateUserSchema.parse(req.body);
      
      // Hash password if provided
      if (validatedData.password) {
        validatedData.password = await bcrypt.hash(validatedData.password, 10);
      }
      
      const updatedUser = await storage.updateUser(id, validatedData);
      if (!updatedUser) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }
      
      // Remove password from response
      const { password, ...userResponse } = updatedUser;
      res.json(userResponse);
    } catch (error) {
      console.error("❌ [ADMIN] Error updating user:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Dados inválidos", 
          details: error.errors 
        });
      }
      res.status(400).json({ error: "Erro ao atualizar usuário" });
    }
  });

  app.delete("/admin/api/users/:id", requireAdmin, adminCRUDLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteUser(id);
      if (!deleted) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }
      res.json({ success: true, message: "Usuário removido com sucesso" });
    } catch (error) {
      console.error("❌ [ADMIN] Error deleting user:", error);
      res.status(500).json({ error: "Erro ao remover usuário" });
    }
  });

  // === COUPON ROUTES ===
  
  // Get all coupons
  app.get("/admin/api/coupons", requireAdmin, async (req, res) => {
    try {
      const coupons = await storage.getAllCoupons();
      res.json(coupons);
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching coupons:", error);
      res.status(500).json({ error: "Erro ao buscar cupons" });
    }
  });

  // Get coupon by ID
  app.get("/admin/api/coupons/:id", requireAdmin, async (req, res) => {
    try {
      const coupon = await storage.getCouponById(req.params.id);
      if (!coupon) {
        return res.status(404).json({ error: "Cupom não encontrado" });
      }
      res.json(coupon);
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching coupon:", error);
      res.status(500).json({ error: "Erro ao buscar cupom" });
    }
  });

  // Create coupon
  app.post("/admin/api/coupons", requireAdmin, adminCRUDLimiter, async (req, res) => {
    try {
      // SECURITY: Use Zod schema validation to prevent mass assignment attacks
      const validatedCouponData = insertCouponSchema.parse(req.body);
      const coupon = await storage.createCoupon(validatedCouponData);
      res.status(201).json(coupon);
    } catch (error) {
      console.error("❌ [ADMIN] Error creating coupon:", error);
      res.status(500).json({ error: "Erro ao criar cupom" });
    }
  });

  // Update coupon
  app.put("/admin/api/coupons/:id", requireAdmin, adminCRUDLimiter, async (req, res) => {
    try {
      // SECURITY: Use Zod schema validation to prevent mass assignment attacks
      const validatedCouponData = updateCouponSchema.parse(req.body);
      const updatedCoupon = await storage.updateCoupon(req.params.id, validatedCouponData);
      if (!updatedCoupon) {
        return res.status(404).json({ error: "Cupom não encontrado" });
      }
      res.json(updatedCoupon);
    } catch (error) {
      console.error("❌ [ADMIN] Error updating coupon:", error);
      res.status(500).json({ error: "Erro ao atualizar cupom" });
    }
  });

  // Delete coupon
  app.delete("/admin/api/coupons/:id", requireAdmin, adminCRUDLimiter, async (req, res) => {
    try {
      const deleted = await storage.deleteCoupon(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Cupom não encontrado" });
      }
      res.json({ success: true, message: "Cupom removido com sucesso" });
    } catch (error) {
      console.error("❌ [ADMIN] Error deleting coupon:", error);
      res.status(500).json({ error: "Erro ao remover cupom" });
    }
  });

  // Validate coupon (public endpoint for checkout)
  app.post("/api/coupons/validate", couponLimiter, async (req, res) => {
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ error: "Código do cupom é obrigatório" });
      }
      
      const result = await storage.validateCoupon(code);
      res.json(result);
    } catch (error) {
      console.error("❌ Error validating coupon:", error);
      res.status(500).json({ error: "Erro ao validar cupom" });
    }
  });

  app.get("/api/plans", async (req, res) => {
    try {
      const plans = await storage.getPlans();

      // If no plans found, return empty array instead of error
      if (!plans || plans.length === 0) {
        console.log("No plans found in database, returning empty array");
        return res.json([]);
      }

      res.json(plans);
    } catch (error) {
      console.error("Error in /api/plans:", error);
      console.error("Error details:", error instanceof Error ? error.message : error);

      // Return more specific error information
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("does not exist")) {
        console.log("Database schema issue detected, attempting to initialize...");
        // Return empty array for now, the database initialization will run on next restart
        return res.json([]);
      }

      res.status(500).json({ 
        error: "Erro ao buscar planos",
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  });

  // Site Settings (public read access)
  app.get("/api/site-settings", async (req, res) => {
    try {
      const siteSettings = await storage.getSiteSettings();

      if (siteSettings) {
        // Remove BYTEA fields before serializing - images served from Supabase Storage
        const { mainImage, networkImage, aboutImage, ...cleanSettings } = siteSettings;
        
        return res.json(cleanSettings);
      }

      res.json({});
    } catch (error) {
      console.error('❌ Erro ao buscar configurações do site:', error instanceof Error ? error.message : 'Unknown error');
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  

  app.get("/api/network-units", async (req, res) => {
    try {
      const units = await storage.getNetworkUnits();
      
      // ✅ SECURITY FIX: Filter sensitive credentials before sending to client
      const publicUnits = units.map(unit => ({
        id: unit.id,
        name: unit.name,
        address: unit.address,
        cidade: unit.cidade,
        phone: unit.phone,
        services: unit.services,
        imageUrl: unit.imageUrl,
        whatsapp: unit.whatsapp,
        googleMapsUrl: unit.googleMapsUrl,
        urlSlug: unit.urlSlug,
        isActive: unit.isActive
        // SECURITY: login, senhaHash are EXCLUDED from public API
      }));
      
      res.json(publicUnits);
    } catch (error) {
      console.error("Erro ao buscar unidades da rede:", error);
      res.status(500).json({ error: "Erro ao buscar unidades da rede" });
    }
  });

  // Get specific network unit by slug (public route)
  app.get("/api/network-units/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const unit = await storage.getNetworkUnitBySlug(slug);
      
      if (!unit) {
        return res.status(404).json({ error: "Unidade não encontrada" });
      }
      
      // Remove sensitive data before sending
      const publicUnit = {
        id: unit.id,
        name: unit.name,
        address: unit.address,
        cidade: unit.cidade,
        phone: unit.phone,
        services: unit.services,
        imageUrl: unit.imageUrl,
        whatsapp: unit.whatsapp,
        googleMapsUrl: unit.googleMapsUrl,
        urlSlug: unit.urlSlug
      };
      
      res.json(publicUnit);
    } catch (error) {
      console.error("Erro ao buscar unidade:", error);
      res.status(500).json({ error: "Erro ao buscar unidade" });
    }
  });

  app.get("/api/faq", async (req, res) => {
    try {
      const items = await storage.getFaqItems();

      // Garantir que as quebras de linha sejam preservadas na resposta
      const formattedItems = items.map(item => ({
        ...item,
        question: item.question || '',
        answer: item.answer || ''
      }));

      res.json(formattedItems);
    } catch (error) {
      console.error("Erro detalhado ao buscar FAQ:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      res.status(500).json({ error: "Erro ao buscar itens do FAQ", details: errorMessage, stack: errorStack });
    }
  });

  // Species routes (public)
  app.get("/api/species", async (req, res) => {
    try {
      const species = await storage.getSpecies();
      res.json(species);
    } catch (error) {
      console.error("Erro ao buscar espécies:", error);
      res.status(500).json({ error: "Erro ao buscar espécies" });
    }
  });

  // CIELO WEBHOOK ENDPOINT
  app.post("/api/webhooks/cielo", express.raw({ type: 'application/json' }), async (req, res) => {
    const correlationId = req.headers['x-correlation-id'] as string || 
                         req.headers['requestid'] as string || 
                         Math.random().toString(36).substring(7);
    
    try {
      console.log('📥 [CIELO-WEBHOOK] Webhook recebido', {
        correlationId,
        headers: {
          'content-type': req.headers['content-type'],
          'cielo-signature': req.headers['cielo-signature'],
          'user-agent': req.headers['user-agent']
        },
        ip: req.ip || req.connection.remoteAddress,
        bodyType: typeof req.body,
        bodyIsBuffer: Buffer.isBuffer(req.body),
        bodyLength: req.body?.length || 0,
        bodyPreview: req.body ? (Buffer.isBuffer(req.body) ? req.body.toString('utf8').substring(0, 100) : JSON.stringify(req.body).substring(0, 100)) : 'no body'
      });

      // Import webhook service
      const { CieloWebhookService } = await import("./services/cielo-webhook-service.js");
      const webhookService = new CieloWebhookService();

      // Validate request format
      if (!req.body) {
        console.error('❌ [CIELO-WEBHOOK] Body vazio recebido', { correlationId });
        return res.status(400).json({ error: 'Body é obrigatório' });
      }

      // Get notification data - body can be Buffer or already-parsed Object
      let notification;
      let rawBody: string;
      
      if (Buffer.isBuffer(req.body)) {
        // Body is raw buffer (express.raw worked)
        rawBody = req.body.toString('utf8');
        try {
          notification = JSON.parse(rawBody);
        } catch (parseError) {
          console.error('❌ [CIELO-WEBHOOK] Erro ao fazer parse do JSON', {
            correlationId,
            error: parseError instanceof Error ? parseError.message : 'Erro desconhecido',
            bodyPreview: rawBody.substring(0, 100)
          });
          return res.status(400).json({ error: 'JSON inválido' });
        }
      } else {
        // Body already parsed as object (another middleware processed it)
        notification = req.body;
        rawBody = JSON.stringify(notification);
      }
      
      // Cielo doesn't send signature by default - accept all requests without validation
      console.log('📨 [CIELO-WEBHOOK] Webhook da Cielo recebido (sem validação de assinatura)', {
        correlationId,
        paymentId: notification.PaymentId,
        changeType: notification.ChangeType
      });

      // Validate notification structure
      if (!notification.PaymentId || typeof notification.ChangeType !== 'number') {
        console.error('❌ [CIELO-WEBHOOK] Estrutura de notificação inválida', {
          correlationId,
          notification: {
            hasPaymentId: !!notification.PaymentId,
            changeType: notification.ChangeType,
            hasClientOrderId: !!notification.ClientOrderId
          }
        });
        return res.status(400).json({ error: 'Estrutura de notificação inválida' });
      }

      // Log security audit event
      console.log('🔒 [SECURITY-AUDIT] Webhook Cielo recebido', {
        timestamp: new Date().toISOString(),
        correlationId,
        paymentId: notification.PaymentId,
        changeType: notification.ChangeType,
        clientOrderId: notification.ClientOrderId,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      });

      // Process webhook notification
      await webhookService.processWebhookNotification(notification, correlationId);

      // Return success response immediately (webhook should respond quickly)
      res.status(200).json({ 
        status: 'success', 
        correlationId,
        timestamp: new Date().toISOString()
      });

      console.log('✅ [CIELO-WEBHOOK] Webhook processado com sucesso', {
        correlationId,
        paymentId: notification.PaymentId
      });

    } catch (error) {
      console.error('❌ [CIELO-WEBHOOK] Erro ao processar webhook', {
        correlationId,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      });

      // Log critical security event
      console.log('🚨 [SECURITY-AUDIT] Webhook processing failed', {
        timestamp: new Date().toISOString(),
        correlationId,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        ip: req.ip || req.connection.remoteAddress
      });

      res.status(500).json({ 
        error: 'Erro interno do servidor',
        correlationId,
        timestamp: new Date().toISOString()
      });
    }
  });



  // === CHECKOUT ROUTES ===
  
  // Step 2: Save customer and pets data (after consent accepted)
  app.post("/api/checkout/save-customer-data", checkoutLimiter, async (req, res) => {
    try {
      console.log("🛒 [CHECKOUT-STEP2] Iniciando salvamento dos dados do cliente e pets");
      
      const { clientData, petsData } = req.body;
      
      if (!clientData || !petsData || !Array.isArray(petsData)) {
        return res.status(400).json({ 
          error: "Dados inválidos - clientData e petsData são obrigatórios" 
        });
      }
      
      // SECURITY: Explicit whitelist to prevent mass assignment attacks
      // Only allow safe customer data fields (name, email, phone, birthdate)
      const whitelistedClientData = {
        full_name: clientData.full_name,
        email: clientData.email,
        phone: clientData.phone,
        birthdate: clientData.birthdate
      };
      
      console.log("🔍 [CHECKOUT-STEP2] Dados recebidos (sem CPF):", {
        email: whitelistedClientData.email,
        petsCount: petsData.length
      });
      
      // Validate client data (using schema without mandatory CPF for Step 2)
      const parsedClientData = insertClientSchemaStep2.parse(whitelistedClientData);
      
      // Check if client already exists
      const existingClient = await storage.getClientByEmail(parsedClientData.email);
      if (existingClient) {
        console.log("⚠️ [CHECKOUT-STEP2] Cliente já existe, atualizando dados e adicionando pets...");
        
        // Update existing client with partial data (without overwriting existing fields)
        const updateData: any = {
          fullName: parsedClientData.full_name,
          phone: parsedClientData.phone || existingClient.phone,
        };
        
        
        // Skip client update to avoid Drizzle errors for now
        const updatedClient = existingClient;
        
        // Save pets for existing client
        const savedPets: any[] = [];
        for (const petData of petsData) {
          const petToSave = {
            ...petData,
            clientId: existingClient.id,
            weight: petData.weight?.toString() || "0",
            sex: petData.sex || "",
            age: petData.age?.toString() || "1"
          };
          
          const parsedPetData = insertPetSchema.parse(petToSave);
          console.log("✅ [CHECKOUT-STEP2] Pet validado para cliente existente (será criado após pagamento):", parsedPetData.name);
          // Pet será criado apenas após pagamento aprovado no endpoint simple-process
          // savedPets.push(savedPet as any); - removido pois pet não será criado aqui
        }
        
        const { cpfHash: _, ...clientResponse } = updatedClient || existingClient;
        
        return res.status(200).json({
          success: true,
          message: "Cliente existente - dados validados (pets serão criados após pagamento)",
          client: clientResponse,
          pets: [], // Pets não são mais criados neste endpoint
          clientId: existingClient.id,
          isExistingClient: true
        });
      }
      
      // New client - create without CPF (will be added in Step 3)
      console.log("🆕 [CHECKOUT-STEP2] Criando novo cliente sem CPF (será adicionado no Step 3)");
      
      // Hash password
      const hashedPassword = null; // Sistema não usa senhas
      
      // SECURITY: Explicit field mapping to prevent mass assignment attacks
      // Only map whitelisted and validated fields
      const clientToSave = {
        fullName: parsedClientData.full_name,
        email: parsedClientData.email,
        phone: parsedClientData.phone,
        password: null, // Sistema não usa senhas para compras
        cpf: null, // CPF null temporariamente (será adicionado no Step 3)
        id: `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      
      console.log("🏗️ [CHECKOUT-STEP2] Criando cliente:", clientToSave.email);
      const savedClient = await storage.createClient(clientToSave as any);
      
      // Save pets data
      const savedPets = [];
      for (const petData of petsData) {
        const petToSave = {
          ...petData,
          clientId: savedClient.id,
          weight: petData.weight?.toString() || "0", // Ensure weight is string for validation
          sex: petData.sex || "Macho", // Valor padrão para sex se não fornecido
          age: petData.age?.toString() || "1" // Ensure age is string
        };
        
        // Validate pet data
        const parsedPetData = insertPetSchema.parse(petToSave);
        
        console.log("✅ [CHECKOUT-STEP2] Pet validado (será criado após pagamento):", parsedPetData.name);
        // Pet será criado apenas após pagamento aprovado no endpoint simple-process
        // savedPets.push(savedPet); - removido pois pet não será criado aqui
      }
      
      console.log("✅ [CHECKOUT-STEP2] Dados salvos com sucesso", {
        clientId: savedClient.id,
        petsValidated: 0 // Pets não são mais salvos neste endpoint
      });
      
      // Return success without cpfHash
      const { cpfHash: _, ...clientResponse } = savedClient;
      
      res.status(201).json({
        success: true,
        message: "Cliente criado com sucesso (pets serão criados após pagamento)",
        client: clientResponse,
        pets: [], // Pets não são mais criados neste endpoint
        clientId: savedClient.id
      });
      
    } catch (error: any) {
      console.error("❌ [CHECKOUT-STEP2] Erro ao salvar dados:", error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: "Dados inválidos",
          details: error.errors
        });
      }
      
      res.status(500).json({
        error: "Erro interno do servidor",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // NEW ROUTE: Complete client registration with CPF and address (Step 3)
  app.post("/api/checkout/complete-registration", checkoutLimiter, async (req, res) => {
    try {
      console.log("📝 [CHECKOUT-STEP3] Completando registro do cliente com CPF e endereço");
      
      // SECURITY: Explicit whitelist to prevent mass assignment attacks
      const { clientId, cpf, addressData } = req.body;
      
      // SECURITY: Whitelist allowed address fields
      const whitelistedAddressData = addressData ? {
        cep: addressData.cep,
        address: addressData.address,
        number: addressData.number,
        complement: addressData.complement,
        district: addressData.district,
        state: addressData.state,
        city: addressData.city
      } : {};
      
      if (!clientId || !cpf || !whitelistedAddressData) {
        return res.status(400).json({
          error: "Dados incompletos - clientId, cpF e addressData são obrigatórios"
        });
      }
      
      // Clean CPF (remove formatting)
      const cleanCpf = cpf.replace(/\D/g, '');
      
      // Validate CPF format
      if (cleanCpf.length !== 11) {
        return res.status(400).json({
          error: "CPF inválido - deve conter 11 dígitos"
        });
      }
      
      // Check if CPF is already in use
      const existingClients = await storage.getAllClients();
      const clientWithCpf = existingClients.find(c => c.cpf === cleanCpf);
      
      // Se o CPF já existe para outro cliente, retornamos o cliente existente
      // Isso permite que um cliente existente adicione novos pets/planos
      let targetClientId = clientId;
      let isExistingClient = false;
      
      if (clientWithCpf) {
        if (clientWithCpf.id !== clientId) {
          // CPF pertence a outro cliente - usamos esse cliente existente
          targetClientId = clientWithCpf.id;
          isExistingClient = true;
          console.log(`✅ [CHECKOUT-STEP3] CPF já cadastrado para cliente: ${targetClientId}, usando cliente existente`);
          
          // Limpar cliente temporário criado no Step 2 já que vamos usar o existente
          try {
            console.log(`🗑️ [CHECKOUT-STEP3] Removendo cliente temporário: ${clientId}`);
            await storage.deleteClient(clientId);
            console.log(`✅ [CHECKOUT-STEP3] Cliente temporário removido com sucesso`);
          } catch (deleteError) {
            console.error(`⚠️ [CHECKOUT-STEP3] Erro ao remover cliente temporário (não crítico):`, deleteError);
          }
        } else {
          // CPF já pertence ao mesmo cliente
          console.log(`✅ [CHECKOUT-STEP3] CPF já pertence ao mesmo cliente: ${clientId}`);
        }
      }
      
      // Update client with CPF and address
      const updateData = {
        cpf: cleanCpf,
        cep: whitelistedAddressData.cep?.replace(/\D/g, '') || null,
        address: whitelistedAddressData.address || null,
        number: whitelistedAddressData.number || null,
        complement: whitelistedAddressData.complement || null,
        district: whitelistedAddressData.district || null,
        state: whitelistedAddressData.state || null,
        city: whitelistedAddressData.city || null
      };
      
      console.log("🔄 [CHECKOUT-STEP3] Atualizando cliente com dados completos:", {
        clientId: targetClientId,
        cpf: cleanCpf,
        hasAddress: !!whitelistedAddressData.address,
        isExistingClient
      });
      
      const updatedClient = await storage.updateClient(targetClientId, updateData);
      
      if (!updatedClient) {
        return res.status(404).json({
          error: "Cliente não encontrado"
        });
      }
      
      // Remove password from response
      const { cpfHash: _, ...clientResponse } = updatedClient;
      
      console.log("✅ [CHECKOUT-STEP3] Registro completado com sucesso");
      
      res.status(200).json({
        success: true,
        message: isExistingClient ? 
          "Cliente existente atualizado com sucesso" : 
          "Registro completado com sucesso",
        client: clientResponse,
        clientId: targetClientId // Retornamos o ID do cliente usado (existente ou novo)
      });
      
    } catch (error: any) {
      console.error("❌ [CHECKOUT-STEP3] Erro ao completar registro:", error);
      
      res.status(500).json({
        error: "Erro interno do servidor",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Helper function to calculate installment period end date safely
  function calculatePeriodEnd(periodStart: Date, billingPeriod: 'monthly' | 'annual'): Date {
    const periodEnd = new Date(periodStart);
    
    if (billingPeriod === 'annual') {
      // Annual: add 365 days
      periodEnd.setDate(periodEnd.getDate() + 365);
      periodEnd.setDate(periodEnd.getDate() - 1); // Back one day to get end of period
    } else {
      // Monthly: go to next month, then back to last day of current month
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      periodEnd.setDate(0); // Sets to last day of previous month (current period)
    }
    
    return periodEnd;
  }

  // NEW SIMPLE CHECKOUT ENDPOINT - Find or Create Client + Process Payment
  // SECURITY: Checkout público não usa CSRF mas tem rate limiting e validação de dados
  app.post("/api/checkout/simple-process", checkoutLimiter, async (req, res) => {
    try {
      console.log("🛒 [SIMPLE-CHECKOUT] Iniciando checkout simplificado");
      
      // SECURITY: Explicit whitelist to prevent mass assignment attacks
      const { paymentData, planData, paymentMethod, addressData, coupon } = req.body;
      
      // SECURITY: Whitelist allowed fields from nested paymentData object
      const whitelistedPaymentData = paymentData ? {
        customer: paymentData.customer ? {
          name: paymentData.customer.name,
          email: paymentData.customer.email,
          cpf: paymentData.customer.cpf
        } : undefined,
        payment: paymentData.payment ? {
          cardNumber: paymentData.payment.cardNumber,
          holder: paymentData.payment.holder,
          expirationDate: paymentData.payment.expirationDate,
          securityCode: paymentData.payment.securityCode,
          installments: paymentData.payment.installments
        } : undefined,
        pets: Array.isArray(paymentData.pets) ? paymentData.pets.map(pet => ({
          name: pet.name,
          species: pet.species,
          breed: pet.breed,
          age: pet.age,
          sex: pet.sex,
          castrated: pet.castrated,
          weight: pet.weight
        })) : undefined
      } : {};
      
      // SECURITY: Whitelist allowed fields from planData
      const whitelistedPlanData = planData ? {
        planId: planData.planId,
        billingPeriod: planData.billingPeriod,
        amount: planData.amount
      } : {};
      
      // SECURITY: Whitelist allowed fields from addressData
      const whitelistedAddressData = addressData ? {
        phone: addressData.phone,
        address: addressData.address,
        number: addressData.number,
        complement: addressData.complement,
        district: addressData.district,
        city: addressData.city,
        state: addressData.state,
        cep: addressData.cep
      } : {};
      
      // Replace original variables with whitelisted versions
      const validatedPaymentData = whitelistedPaymentData;
      const validatedPlanData = whitelistedPlanData;
      const validatedAddressData = whitelistedAddressData;
      
      // Extract seller referral ID if present (for commission tracking)
      const sellerId = req.body.sellerId || null;
      if (sellerId) {
        console.log(`🏷️ [CHECKOUT] Venda referenciada pelo vendedor: ${sellerId}`);
      }
      
      if (!validatedPaymentData || !validatedPlanData || !paymentMethod) {
        return res.status(400).json({ 
          error: "Dados incompletos - paymentData, planData e paymentMethod são obrigatórios" 
        });
      }

      // ============================================
      // STEP 1: FIND OR CREATE CLIENT (SIMPLE LOGIC)
      // ============================================
      
      const customerCpf = validatedPaymentData.customer?.cpf?.replace(/\D/g, '');
      const customerEmail = validatedPaymentData.customer?.email?.toLowerCase().trim();
      const customerName = validatedPaymentData.customer?.name || 'Cliente';
      
      console.log("🔍 [SIMPLE] Buscando cliente:", { cpf: customerCpf, email: customerEmail, name: customerName });
      
      let client;
      
      // Try to find existing client by CPF first (priority)
      if (customerCpf) {
        const allClients = await storage.getAllClients();
        client = allClients.find(c => c.cpf === customerCpf);
        if (client) {
          console.log(`✅ [SIMPLE] Cliente encontrado por CPF: ${client.id}`);
        }
      }
      
      // If not found by CPF, try by email
      if (!client && customerEmail) {
        client = await storage.getClientByEmail(customerEmail);
        if (client) {
          console.log(`✅ [SIMPLE] Cliente encontrado por Email: ${client.id}`);
        }
      }
      
      // If client doesn't exist, create new one
      if (!client) {
        console.log(`🆕 [SIMPLE] Criando novo cliente`);
        
        // Hash CPF for authentication (clientes usam email + CPF para login)
        let cpfHash: string | null = null;
        if (customerCpf) {
          cpfHash = await bcrypt.hash(customerCpf, 12);
          console.log(`🔐 [SIMPLE] CPF hasheado para autenticação do cliente`);
        }
        
        const newClientData = {
          id: `client-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
          fullName: customerName,
          email: customerEmail,
          phone: validatedAddressData?.phone || null,
          cpf: customerCpf || null,
          cpfHash: cpfHash,
          address: validatedAddressData?.address || null,
          number: validatedAddressData?.number || null,
          complement: validatedAddressData?.complement || null,
          district: validatedAddressData?.district || null,
          city: validatedAddressData?.city || null,
          state: validatedAddressData?.state || null,
          cep: validatedAddressData?.cep?.replace(/\D/g, '') || null
        };
        
        try {
          client = await storage.createClient(newClientData);
          console.log(`✅ [SIMPLE] Cliente criado: ${client.id}`);
        } catch (createError: any) {
          // If duplicate, try to find existing again
          if (createError.message?.includes('duplicate') || createError.message?.includes('unique')) {
            const allClients = await storage.getAllClients();
            client = allClients.find(c => c.cpf === customerCpf || c.email === customerEmail);
            if (client) {
              console.log(`🔄 [SIMPLE] Usando cliente existente após erro de duplicação: ${client.id}`);
            } else {
              throw createError;
            }
          } else {
            throw createError;
          }
        }
      }

      // ============================================
      // STEP 2: VALIDATE PET DATA (NOT CREATE YET)
      // ============================================
      
      // Pets serão criados apenas após pagamento aprovado
      const petsToCreate = validatedPaymentData.pets || [];
      console.log(`📋 [SIMPLE] ${petsToCreate.length} pets serão criados após pagamento aprovado`);

      // ============================================
      // STEP 3: PROCESS PAYMENT
      // ============================================
      
      // Get plan details for pricing
      const selectedPlan = await storage.getPlan(validatedPlanData.planId);
      if (!selectedPlan) {
        return res.status(400).json({
          error: "Plano não encontrado",
          planId: validatedPlanData.planId
        });
      }

      // ============================================
      // CALCULATE CORRECT PRICE WITH MULTI-PET DISCOUNTS
      // ============================================
      
      // Contar pets do payload
      const petCount = validatedPaymentData.pets?.length || 1;
      
      // Calcular preço correto usando basePrice do banco de dados e aplicando descontos
      const basePriceDecimal = parseFloat(selectedPlan.basePrice || '0');
      let basePriceCents = Math.round(basePriceDecimal * 100);
      
      // Para planos COMFORT e PLATINUM, multiplicar por 12 (cobrança anual)
      if (['COMFORT', 'PLATINUM'].some(type => selectedPlan.name.toUpperCase().includes(type))) {
        basePriceCents = basePriceCents * 12;
      }
      
      // Aplicar desconto apenas para planos Basic/Infinity e pets a partir do 2º
      let totalCents = 0;
      for (let i = 0; i < petCount; i++) {
        let petPriceCents = basePriceCents;
        
        if (['BASIC', 'INFINITY'].some(type => selectedPlan.name.toUpperCase().includes(type)) && i > 0) {
          const discountPercentage = i === 1 ? 5 :  // 2º pet: 5%
                                   i === 2 ? 10 : // 3º pet: 10%
                                   15;             // 4º+ pets: 15%
          petPriceCents = Math.round(basePriceCents * (1 - discountPercentage / 100));
        }
        
        totalCents += petPriceCents;
      }
      
      // Aplicar desconto do cupom se houver
      let correctAmountInCents = totalCents;
      let appliedCouponData = null;
      
      if (coupon) {
        try {
          console.log(`🎫 [COUPON] Validando cupom: ${coupon}`);
          const couponResult = await storage.validateCoupon(coupon);
          
          if (couponResult.valid && couponResult.coupon) {
            appliedCouponData = couponResult.coupon;
            const couponValue = Number(couponResult.coupon.value);
            
            if (couponResult.coupon.type === 'percentage') {
              // Desconto percentual
              const discountAmount = Math.round(correctAmountInCents * (couponValue / 100));
              correctAmountInCents = correctAmountInCents - discountAmount;
              console.log(`✅ [COUPON] Cupom percentual aplicado: ${couponValue}% de desconto = R$ ${(discountAmount / 100).toFixed(2)}`);
            } else {
              // Desconto fixo em reais (converter para centavos)
              const discountCents = Math.round(couponValue * 100);
              correctAmountInCents = Math.max(0, correctAmountInCents - discountCents); // Não permitir valor negativo
              console.log(`✅ [COUPON] Cupom fixo aplicado: R$ ${couponValue.toFixed(2)} de desconto`);
            }
          } else {
            console.warn(`⚠️ [COUPON] Cupom inválido ou expirado: ${coupon}`);
          }
        } catch (couponError) {
          console.error(`❌ [COUPON] Erro ao validar cupom:`, couponError);
          // Continuar sem desconto se houver erro
        }
      }
      
      console.log("💰 [PRICE-CALCULATION] Preço calculado no servidor:", {
        planName: selectedPlan.name,
        basePrice: basePriceDecimal,
        isAnnualPlan: ['COMFORT', 'PLATINUM'].some(type => selectedPlan.name.toUpperCase().includes(type)),
        basePriceCents: basePriceCents,
        petCount: petCount,
        totalBeforeCoupon: (totalCents / 100).toFixed(2),
        couponApplied: !!appliedCouponData,
        couponCode: coupon || 'N/A',
        finalAmount: (correctAmountInCents / 100).toFixed(2),
        correctAmountInCents: correctAmountInCents,
        isDiscountEligible: ['BASIC', 'INFINITY'].some(type => selectedPlan.name.toUpperCase().includes(type))
      });

      // Process payment via Cielo
      let paymentResult;
      
      if (paymentMethod === 'credit_card') {
        const cieloService = new CieloService();
        const creditCardRequest = {
          merchantOrderId: `ORDER_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          customer: {
            name: validatedPaymentData.customer?.name || validatedPaymentData.payment?.holder || 'Cliente',
            email: client.email,
            cpf: client.cpf,
            address: {
              street: client.address || '',
              number: client.number || '',
              complement: client.complement || '',
              zipCode: client.cep || '',
              city: client.city || '',
              state: client.state || '',
              country: 'BRA'
            }
          },
          payment: {
            type: 'CreditCard' as const,
            amount: correctAmountInCents,
            installments: validatedPaymentData.payment?.installments || 1,
            creditCard: {
              cardNumber: validatedPaymentData.payment?.cardNumber || '',
              holder: validatedPaymentData.payment?.holder || '',
              expirationDate: validatedPaymentData.payment?.expirationDate || '',
              securityCode: validatedPaymentData.payment?.securityCode || ''
            }
          }
        };
        
        paymentResult = await cieloService.createCreditCardPayment(creditCardRequest);
        
        console.log(`💳 [SIMPLE] Resultado do pagamento:`, {
          paymentId: paymentResult.payment?.paymentId,
          status: paymentResult.payment?.status,
          approved: paymentResult.payment?.status === 2
        });
        
        if (paymentResult.payment?.status === 2) {
          // Payment approved - primeiro verificar pets existentes
          const createdPets: Pet[] = [];
          if (petsToCreate && Array.isArray(petsToCreate) && petsToCreate.length > 0) {
            // Fetch existing pets for the client to check for duplicates
            const existingPets = await storage.getPetsByClientId(client.id);
            console.log(`🔍 [SIMPLE] Cliente possui ${existingPets.length} pet(s) existente(s)`);
            
            for (const petData of petsToCreate) {
              // Check if a pet with the same name already exists (case-insensitive)
              const normalizedPetName = petData.name?.trim().toLowerCase() || 'pet';
              const existingPet = existingPets.find(p => {
                const existingName = p.name?.trim().toLowerCase() || 'pet';
                return existingName === normalizedPetName;
              });
              
              if (existingPet) {
                // Pet already exists - use existing pet instead of creating duplicate
                createdPets.push(existingPet);
                console.log(`⏭️ [SIMPLE] Pet "${existingPet.name}" já existe, usando pet existente (${existingPet.id})`);
              } else {
                // Pet doesn't exist - create new pet
                const newPetData = {
                  id: `pet-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
                  clientId: client.id,
                  name: petData.name || 'Pet',
                  species: petData.species || 'Cão',
                  breed: petData.breed || '',
                  age: petData.age?.toString() || '1',
                  sex: petData.sex || '',
                  castrated: petData.castrated || false,
                  weight: petData.weight?.toString() || '1',
                  vaccineData: JSON.stringify([]),
                  planId: planData.planId,
                  isActive: true
                };
                
                try {
                  const pet = await storage.createPet(newPetData);
                  createdPets.push(pet);
                  console.log(`✅ [SIMPLE] Pet criado após pagamento aprovado: ${pet.name} (${pet.id})`);
                } catch (petError) {
                  console.error(`⚠️ [SIMPLE] Erro ao criar pet (continuando):`, petError);
                }
              }
            }
          }
          
          // Create contract for each pet
          const contracts: any[] = [];
          for (let i = 0; i < createdPets.length; i++) {
            const pet = createdPets[i];
            
            // Determine billing period based on plan type
            // COMFORT and PLATINUM plans are always annual (365 days)
            // BASIC and INFINITY plans are monthly (30 days)
            const isAnnualPlan = ['COMFORT', 'PLATINUM'].some(type => 
              selectedPlan.name.toUpperCase().includes(type)
            );
            
            // ✅ VALIDAÇÃO A2: Garantir billing period correto para o plano
            const validatedBillingPeriod = enforceCorrectBillingPeriod(
              selectedPlan, 
              isAnnualPlan ? 'annual' : 'monthly'
            );
            
            // Store the original base price before any discounts
            const originalMonthlyAmount = parseFloat(selectedPlan.basePrice || '0');
            const originalAnnualAmount = originalMonthlyAmount * 12;
            
            // Calculate the correct price for this pet including discount for BASIC/INFINITY plans
            let petMonthlyAmount = originalMonthlyAmount;
            
            // Apply discount for 2nd, 3rd, 4th+ pets for BASIC and INFINITY plans
            if (['BASIC', 'INFINITY'].some(type => selectedPlan.name.toUpperCase().includes(type)) && i > 0) {
              const discountPercentage = i === 1 ? 5 :  // 2nd pet: 5%
                                       i === 2 ? 10 : // 3rd pet: 10%
                                       15;             // 4th+ pets: 15%
              petMonthlyAmount = petMonthlyAmount * (1 - discountPercentage / 100);
            }
            
            // For contracts: COMFORT/PLATINUM são anuais, BASIC/INFINITY são mensais
            // Planos anuais: monthlyAmount = 0, annualAmount = valor total do ano
            // Planos mensais: monthlyAmount = valor mensal (com desconto), annualAmount = 0
            const contractMonthlyAmount = isAnnualPlan ? 0 : petMonthlyAmount;
            const contractAnnualAmount = isAnnualPlan ? originalAnnualAmount : 0;
            
            const contractData = {
              clientId: client.id,
              planId: planData.planId,
              petId: pet.id,
              sellerId: sellerId, // Add seller referral for commission tracking
              contractNumber: `UNIPET-${Date.now()}-${pet.id.substring(0, 4).toUpperCase()}`,
              billingPeriod: validatedBillingPeriod,
              status: 'active' as const,
              startDate: new Date(),
              monthlyAmount: contractMonthlyAmount.toFixed(2),
              annualAmount: contractAnnualAmount.toFixed(2),
              paymentMethod: 'credit_card',
              cieloPaymentId: paymentResult.payment.paymentId,
              proofOfSale: paymentResult.payment.proofOfSale,
              authorizationCode: paymentResult.payment.authorizationCode,
              tid: paymentResult.payment.tid,
              receivedDate: new Date(), // Add the payment received date
              returnCode: paymentResult.payment.returnCode,
              returnMessage: paymentResult.payment.returnMessage
            };
            
            try {
              const contract = await storage.createContract(contractData);
              contracts.push(contract);
              console.log(`✅ [SIMPLE] Contrato criado para pet ${pet.name}: ${contract.id}`);
              
              // Track conversion for seller if present
              if (sellerId) {
                const revenue = isAnnualPlan ? parseFloat(contractAnnualAmount.toFixed(2)) : parseFloat(contractMonthlyAmount.toFixed(2));
                await storage.trackSellerConversion(sellerId, revenue);
                console.log(`📈 [ANALYTICS] Conversão rastreada para vendedor ${sellerId}, valor: ${revenue}`);
              }
            } catch (contractError) {
              console.error(`⚠️ [SIMPLE] Erro ao criar contrato para pet ${pet.name}:`, contractError);
            }
          }
          
          // ✅ NOVA ABORDAGEM: Criar parcelas para cada contrato e UM comprovante único com TODOS os pets
          if (contracts.length > 0) {
            try {
              const { PaymentReceiptService } = await import("./services/payment-receipt-service.js");
              const receiptService = new PaymentReceiptService();
              
              const allPetsData: any[] = [];
              const installmentIds: string[] = [];
              let firstInstallmentPeriod: { periodStart: Date; periodEnd: Date; dueDate: Date; billingPeriod: string } | undefined = undefined;
              
              // Process each contract to create first installment
              for (let i = 0; i < contracts.length; i++) {
                const contract = contracts[i];
                const pet = createdPets.find(p => p.id === contract.petId);
                
                if (!pet) {
                  console.error(`❌ [SIMPLE] Pet não encontrado para contrato ${contract.id}`);
                  continue;
                }
                
                // Calculate first installment dates maintaining the same day of month
                const now = new Date();
                // ✅ CORRIGIDO: Para primeira parcela PAGA no checkout, dueDate = data do pagamento
                // Não adicionar período porque já está paga. A próxima parcela será calculada corretamente.
                const dueDate = new Date(now);
                
                const periodStart = new Date(now);
                
                // Period ends based on billing period (1 month for monthly, 1 year for annual)
                const periodEnd = contract.billingPeriod === 'annual'
                  ? addYears(periodStart, 1)
                  : addMonths(periodStart, 1);
                periodEnd.setDate(periodEnd.getDate() - 1); // Last day of period
                
                // Store period from first contract for unified receipt
                if (i === 0) {
                  firstInstallmentPeriod = {
                    periodStart,
                    periodEnd,
                    dueDate,
                    billingPeriod: contract.billingPeriod
                  };
                }
                
                // ✅ CORRIGIDO: Usar valores REAIS do contrato
                const installmentAmount = contract.billingPeriod === 'annual' 
                  ? contract.annualAmount
                  : contract.monthlyAmount;
                
                const installmentData = {
                  contractId: contract.id,
                  installmentNumber: 1,
                  dueDate: dueDate,
                  periodStart: periodStart,
                  periodEnd: periodEnd,
                  amount: installmentAmount,
                  status: 'paid',
                  cieloPaymentId: paymentResult.payment.paymentId,
                  paidAt: now,
                  createdAt: now,
                  updatedAt: now
                };
                
                console.log("💳 [SIMPLE-INSTALLMENT] Criando primeira parcela:", {
                  contractId: contract.id,
                  petName: pet.name,
                  installmentNumber: 1,
                  amount: installmentData.amount,
                  status: 'paid'
                });
                
                const firstInstallment = await storage.createContractInstallment(installmentData);
                installmentIds.push(firstInstallment.id);
                
                // Create next installment for this contract
                await createNextAnnualInstallmentIfNeeded(contract.id, firstInstallment, '[SIMPLE-CC-PAYMENT]');
                
                // ✅ CORRIGIDO: Usar APENAS valores do contrato (sem cálculo de desconto problemático)
                const contractValue = parseFloat(contract.billingPeriod === 'annual' ? contract.annualAmount : contract.monthlyAmount) || 0;
                
                // Build pet data object usando valor do contrato diretamente
                const petData = {
                  name: pet.name || 'Pet',
                  species: pet.species || 'Não informado',
                  breed: pet.breed || 'Não informado',
                  age: pet.age ? parseInt(pet.age) : 0,
                  sex: pet.sex || 'Não informado',
                  planName: selectedPlan.name,
                  planType: selectedPlan.name.toUpperCase(),
                  value: Math.round(contractValue * 100), // valor em centavos - NECESSÁRIO para PDF
                  discountedValue: Math.round(contractValue * 100) // mesmo valor (sem desconto) - NECESSÁRIO para PDF
                };
                
                allPetsData.push(petData);
              }
              
              // ✅ CRIAR UM ÚNICO COMPROVANTE COM TODOS OS PETS
              if (allPetsData.length > 0 && firstInstallmentPeriod) {
                const petNames = allPetsData.map(p => p.name).join(', ');
                
                const unifiedReceiptData = {
                  contractId: contracts[0].id, // Use first contract as reference
                  sellerId: sellerId, // Add seller referral for commission tracking
                  cieloPaymentId: paymentResult.payment.paymentId,
                  clientName: client.fullName,
                  clientEmail: client.email,
                  clientCPF: client.cpf || undefined,
                  clientPhone: client.phone,
                  clientAddress: client.address && client.cep ? {
                    street: client.address,
                    number: client.number || 'S/N',
                    complement: client.complement || '',
                    neighborhood: client.district || '',
                    city: client.city || '',
                    state: client.state || '',
                    zipCode: client.cep
                  } : undefined,
                  // ✅ Array com TODOS os pets
                  pets: allPetsData,
                  // ✅ Compatibilidade: passar todos os nomes
                  petName: petNames,
                  planName: selectedPlan.name,
                  paymentMethod: 'credit_card',
                  billingPeriod: firstInstallmentPeriod.billingPeriod as "monthly" | "annual",
                  status: 'paid',
                  proofOfSale: paymentResult.payment.proofOfSale,
                  authorizationCode: paymentResult.payment.authorizationCode,
                  tid: paymentResult.payment.tid,
                  returnCode: paymentResult.payment.returnCode?.toString(),
                  returnMessage: paymentResult.payment.returnMessage,
                  installmentPeriodStart: firstInstallmentPeriod.periodStart.toISOString().split('T')[0],
                  installmentPeriodEnd: firstInstallmentPeriod.periodEnd.toISOString().split('T')[0],
                  installmentNumber: 1,
                  installmentDueDate: firstInstallmentPeriod.dueDate.toISOString().split('T')[0]
                };
                
                console.log(`📄 [SIMPLE-RECEIPT] Gerando comprovante UNIFICADO com ${allPetsData.length} pet(s):`, {
                  petNames,
                  totalPets: allPetsData.length
                });
                
                const receiptResult = await receiptService.generatePaymentReceipt(
                  unifiedReceiptData, 
                  `simple_unified_${paymentResult.payment.paymentId}`
                );
                
                if (receiptResult.success && receiptResult.receiptId) {
                  // Update ALL installments with the unified receipt ID
                  for (const installmentId of installmentIds) {
                    await storage.updateContractInstallment(installmentId, {
                      paymentReceiptId: receiptResult.receiptId
                    });
                  }
                  
                  console.log("✅ [SIMPLE-RECEIPT] Comprovante unificado gerado:", {
                    receiptId: receiptResult.receiptId,
                    receiptNumber: receiptResult.receiptNumber,
                    totalPets: allPetsData.length,
                    petNames
                  });
                } else {
                  console.error("❌ [SIMPLE-RECEIPT] Erro ao gerar comprovante:", receiptResult.error);
                }
              }
            } catch (receiptError: any) {
              console.error("❌ [SIMPLE-RECEIPT] Erro ao criar parcelas e comprovantes:", receiptError.message);
            }
          }
          
          // Increment coupon usage if a coupon was applied and payment was successful
          if (coupon && contracts.length > 0) {
            try {
              console.log(`🎫 [COUPON] Incrementando uso do cupom: ${coupon}`);
              await storage.incrementCouponUsage(coupon);
              console.log(`✅ [COUPON] Uso do cupom incrementado com sucesso`);
            } catch (couponError) {
              console.error(`⚠️ [COUPON] Erro ao incrementar uso do cupom (não crítico):`, couponError);
            }
          }
          
          return res.status(200).json({
            success: true,
            message: "Pagamento aprovado com sucesso!",
            payment: {
              paymentId: paymentResult.payment.paymentId,
              status: paymentResult.payment.status,
              method: paymentMethod
            },
            client: {
              id: client.id,
              name: client.fullName,
              email: client.email
            }
          });
        } else {
          // Payment not approved
          return res.status(400).json({
            error: "Pagamento não autorizado",
            details: paymentResult.payment?.returnMessage || "Transação recusada",
            paymentMethod,
            status: paymentResult.payment?.status,
            returnCode: paymentResult.payment?.returnCode
          });
        }
      } else if (paymentMethod === 'pix') {
        // Process PIX payment
        console.log('🔄 [SIMPLE-PIX] Processando pagamento PIX');
        
        // Initialize Cielo service
        const cieloService = new CieloService();
        
        const pixRequest = {
          MerchantOrderId: `UNIPET-${Date.now()}`,
          Customer: {
            Name: customerName,
            Identity: customerCpf.replace(/\D/g, ''),
            IdentityType: 'CPF' as 'CPF' | 'CNPJ',
            Email: customerEmail
          },
          Payment: {
            Type: 'Pix' as const,
            Amount: correctAmountInCents,
            Provider: 'Cielo' as const
          }
        };
        
        let pixPaymentResult: any;
        try {
          pixPaymentResult = await cieloService.createPixPayment(pixRequest);
          console.log('✅ [SIMPLE-PIX] PIX gerado com sucesso:', {
            paymentId: pixPaymentResult.payment?.paymentId,
            hasQrCode: !!pixPaymentResult.payment?.qrCodeBase64Image,
            hasQrCodeString: !!pixPaymentResult.payment?.qrCodeString
          });
        } catch (pixError: any) {
          console.error('❌ [SIMPLE-PIX] Erro ao gerar PIX:', pixError);
          return res.status(400).json({
            error: 'Erro ao gerar código PIX',
            details: pixError.message
          });
        }
        
        // Check if PIX was generated successfully (status 12 = Pending)
        if (pixPaymentResult.payment?.status === 12) {
          // Create pets for PIX payment (immediately, not waiting for confirmation)
          let firstPetId: string | null = null;
          
          // Create pets immediately for PIX - check for duplicates first
          const createdPetsPix: Pet[] = [];
          if (petsToCreate && petsToCreate.length > 0) {
            // Fetch existing pets for the client to check for duplicates
            const existingPets = await storage.getPetsByClientId(client.id);
            console.log(`🔍 [SIMPLE-PIX] Cliente possui ${existingPets.length} pet(s) existente(s)`);
            
            for (const petData of petsToCreate) {
              // Check if a pet with the same name already exists (case-insensitive)
              const normalizedPetName = petData.name?.trim().toLowerCase() || 'pet';
              const existingPet = existingPets.find(p => {
                const existingName = p.name?.trim().toLowerCase() || 'pet';
                return existingName === normalizedPetName;
              });
              
              if (existingPet) {
                // Pet already exists - use existing pet instead of creating duplicate
                createdPetsPix.push(existingPet);
                if (!firstPetId) firstPetId = existingPet.id;
                console.log(`⏭️ [SIMPLE-PIX] Pet "${existingPet.name}" já existe, usando pet existente (${existingPet.id})`);
              } else {
                // Pet doesn't exist - create new pet
                const newPetData = {
                  id: `pet-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
                  clientId: client.id,
                  name: petData.name || 'Pet',
                  species: petData.species || 'Cão',
                  breed: petData.breed || '',
                  age: petData.age?.toString() || '1',
                  sex: petData.sex || '',
                  castrated: petData.castrated || false,
                  weight: petData.weight?.toString() || '1',
                  vaccineData: JSON.stringify([]),
                  planId: selectedPlan.id,
                  isActive: true
                };
                
                try {
                  const pet = await storage.createPet(newPetData);
                  createdPetsPix.push(pet);
                  if (!firstPetId) firstPetId = pet.id;
                  console.log(`✅ [SIMPLE-PIX] Pet criado: ${pet.name} (${pet.id})`);
                } catch (petError) {
                  console.error(`⚠️ [SIMPLE-PIX] Erro ao criar pet (continuando):`, petError);
                }
              }
            }
          }
          
          if (!firstPetId) {
            firstPetId = `temp-${Date.now()}`;
          }
          
          console.log(`📋 [SIMPLE-PIX] PIX gerado - ${createdPetsPix.length} pets criados com sucesso`);
          
          // Validate PIX response has required fields
          if (!pixPaymentResult.payment.qrCodeBase64Image || !pixPaymentResult.payment.qrCodeString) {
            console.error('❌ [SIMPLE-PIX] Resposta PIX incompleta - faltam QR Code ou código copia-cola');
            return res.status(400).json({
              error: 'Resposta PIX incompleta',
              details: 'QR Code ou código copia-cola não foram gerados corretamente'
            });
          }
          
          // Create contract for each pet (PIX pending payment)
          const contractsPix: any[] = [];
          for (let i = 0; i < createdPetsPix.length; i++) {
            const pet = createdPetsPix[i];
            
            // Calculate the correct price for this pet including discount
            let petMonthlyAmount = parseFloat(selectedPlan.basePrice || '0');
            
            // Apply discount for 2nd, 3rd, 4th+ pets for BASIC and INFINITY plans
            if (['BASIC', 'INFINITY'].some(type => selectedPlan.name.toUpperCase().includes(type)) && i > 0) {
              const discountPercentage = i === 1 ? 5 :  // 2nd pet: 5%
                                       i === 2 ? 10 : // 3rd pet: 10%
                                       15;             // 4th+ pets: 15%
              petMonthlyAmount = petMonthlyAmount * (1 - discountPercentage / 100);
            }
            
            // Determine billing period based on plan type
            // COMFORT and PLATINUM plans are always annual (365 days)
            // BASIC and INFINITY plans are monthly (30 days)
            const isAnnualPlan = ['COMFORT', 'PLATINUM'].some(type => 
              selectedPlan.name.toUpperCase().includes(type)
            );
            
            // ✅ VALIDAÇÃO A2: Garantir billing period correto para o plano
            const validatedBillingPeriod = enforceCorrectBillingPeriod(
              selectedPlan, 
              isAnnualPlan ? 'annual' : 'monthly'
            );
            
            // Para planos anuais: monthlyAmount = 0, annualAmount = valor total do ano
            // Para planos mensais: monthlyAmount = valor mensal (com desconto), annualAmount = 0
            const originalAnnualAmount = parseFloat(selectedPlan.basePrice || '0') * 12;
            const contractMonthlyAmount = isAnnualPlan ? 0 : petMonthlyAmount;
            const contractAnnualAmount = isAnnualPlan ? originalAnnualAmount : 0;
            
            const contractData = {
              clientId: client.id,
              petId: pet.id,
              planId: selectedPlan.id,
              sellerId: sellerId, // Add seller referral for commission tracking
              contractNumber: `UNIPET-${Date.now()}-${pet.id.substring(0, 4).toUpperCase()}`,
              billingPeriod: validatedBillingPeriod,
              status: 'active' as const,
              startDate: new Date(),
              monthlyAmount: contractMonthlyAmount.toFixed(2),
              annualAmount: contractAnnualAmount.toFixed(2),
              paymentMethod: 'pix',
              cieloPaymentId: pixPaymentResult.payment.paymentId,
              proofOfSale: pixPaymentResult.payment.proofOfSale || '',
              authorizationCode: pixPaymentResult.payment.authorizationCode || '',
              tid: pixPaymentResult.payment.tid || '',
              receivedDate: new Date(),
              returnCode: pixPaymentResult.payment.returnCode,
              returnMessage: pixPaymentResult.payment.returnMessage,
              pixQrCode: pixPaymentResult.payment.qrCodeBase64Image || null,
              pixCode: pixPaymentResult.payment.qrCodeString || null
            };
            
            try {
              const contract = await storage.createContract(contractData);
              contractsPix.push(contract);
              console.log(`✅ [SIMPLE-PIX] Contrato criado para pet ${pet.name}: ${contract.id}`);
              
              // Track conversion for seller if present
              if (sellerId) {
                const revenue = isAnnualPlan ? parseFloat(contractAnnualAmount.toFixed(2)) : parseFloat(contractMonthlyAmount.toFixed(2));
                await storage.trackSellerConversion(sellerId, revenue);
                console.log(`📈 [ANALYTICS] Conversão rastreada para vendedor ${sellerId}, valor: ${revenue}`);
              }
            } catch (contractError: any) {
              console.error(`❌ [SIMPLE-PIX] Erro ao criar contrato para pet ${pet.name}:`, contractError);
            }
          }
          
          if (contractsPix.length === 0) {
            console.error(`❌ [SIMPLE-PIX] Nenhum contrato foi criado`);
            return res.status(503).json({
              error: 'Erro ao registrar pagamento',
              details: 'Não foi possível registrar o pagamento PIX. Por favor, tente novamente.',
              technicalDetails: process.env.NODE_ENV === 'development' ? 'Nenhum contrato foi criado' : undefined
            });
          }
          
          // ✅ NOVA ABORDAGEM PIX: Criar parcelas para cada contrato e UM comprovante único com TODOS os pets
          const { PaymentReceiptService } = await import("./services/payment-receipt-service.js");
          const receiptService = new PaymentReceiptService();
          
          const allPixPetsData: any[] = [];
          const pixInstallmentIds: string[] = [];
          let pixFirstInstallmentPeriod: { periodStart: Date; periodEnd: Date; dueDate: Date; billingPeriod: string } | undefined = undefined;
          
          for (let i = 0; i < contractsPix.length; i++) {
            const contract = contractsPix[i];
            const pet = createdPetsPix.find(p => p.id === contract.petId);
            
            if (!pet) {
              console.error(`❌ [SIMPLE-PIX] Pet não encontrado para contrato ${contract.id}`);
              continue;
            }
            
            // Calculate first installment dates
            const now = new Date();
            // ✅ CORRIGIDO: Para primeira parcela PIX pending, dueDate = data de criação
            // Não adicionar período porque a próxima parcela será calculada corretamente quando esta for paga.
            // Isso mantém consistência com o fluxo de cartão de crédito.
            const dueDate = new Date(now);
            
            const periodStart = new Date(now);
            
            const periodEnd = contract.billingPeriod === 'annual'
              ? addYears(periodStart, 1)
              : addMonths(periodStart, 1);
            periodEnd.setDate(periodEnd.getDate() - 1);
            
            // Store period from first contract for unified receipt
            if (i === 0) {
              pixFirstInstallmentPeriod = {
                periodStart,
                periodEnd,
                dueDate,
                billingPeriod: contract.billingPeriod
              };
            }
            
            // ✅ CORRIGIDO: Usar valores REAIS do contrato
            const installmentAmount = contract.billingPeriod === 'annual' 
              ? contract.annualAmount
              : contract.monthlyAmount;
            
            const installmentData = {
              contractId: contract.id,
              installmentNumber: 1,
              dueDate: dueDate,
              periodStart: periodStart,
              periodEnd: periodEnd,
              amount: installmentAmount,
              status: 'pending', // PIX pending confirmation
              cieloPaymentId: pixPaymentResult.payment.paymentId,
              createdAt: now,
              updatedAt: now
            };
            
            console.log("💳 [SIMPLE-PIX-INSTALLMENT] Criando primeira parcela:", {
              contractId: contract.id,
              petName: pet.name,
              installmentNumber: 1,
              amount: installmentData.amount,
              status: 'pending'
            });
            
            try {
              const firstInstallment = await storage.createContractInstallment(installmentData);
              pixInstallmentIds.push(firstInstallment.id);
              console.log(`✅ [SIMPLE-PIX-INSTALLMENT] Parcela criada: ${firstInstallment.id}`);
              
              // ✅ CORRIGIDO: Usar APENAS valores do contrato (sem cálculo de desconto problemático)
              const contractValue = parseFloat(contract.billingPeriod === 'annual' ? contract.annualAmount : contract.monthlyAmount) || 0;
              
              // Build pet data object usando valor do contrato diretamente
              const petData = {
                name: pet.name || 'Pet',
                species: pet.species || 'Não informado',
                breed: pet.breed || 'Não informado',
                age: typeof pet.age === 'string' ? parseInt(pet.age) : pet.age || 0,
                sex: pet.sex || 'Não informado',
                planName: selectedPlan.name,
                planType: selectedPlan.name.toUpperCase(),
                value: Math.round(contractValue * 100), // valor em centavos - NECESSÁRIO para PDF
                discountedValue: Math.round(contractValue * 100) // mesmo valor (sem desconto) - NECESSÁRIO para PDF
              };
              
              allPixPetsData.push(petData);
            } catch (error: any) {
              console.error(`❌ [SIMPLE-PIX] Erro ao criar parcela:`, error.message);
            }
          }
          
          // ✅ CRIAR UM ÚNICO COMPROVANTE PIX COM TODOS OS PETS
          if (allPixPetsData.length > 0 && pixFirstInstallmentPeriod) {
            const pixPetNames = allPixPetsData.map(p => p.name).join(', ');
            
            const unifiedPixReceiptData = {
              contractId: contractsPix[0].id,
              sellerId: sellerId, // Add seller referral for commission tracking
              cieloPaymentId: pixPaymentResult.payment.paymentId,
              clientName: client.fullName,
              clientEmail: client.email,
              clientCPF: client.cpf || undefined,
              clientPhone: client.phone,
              clientAddress: client.address && client.cep ? {
                street: client.address,
                number: client.number || 'S/N',
                complement: client.complement || '',
                neighborhood: client.district || '',
                city: client.city || '',
                state: client.state || '',
                zipCode: client.cep
              } : undefined,
              // ✅ Array com TODOS os pets
              pets: allPixPetsData,
              // ✅ Compatibilidade
              petName: pixPetNames,
              planName: selectedPlan.name,
              paymentMethod: 'pix',
              billingPeriod: pixFirstInstallmentPeriod.billingPeriod as "monthly" | "annual",
              installmentPeriodStart: pixFirstInstallmentPeriod.periodStart.toISOString().split('T')[0],
              installmentPeriodEnd: pixFirstInstallmentPeriod.periodEnd.toISOString().split('T')[0],
              installmentNumber: 1,
              installmentDueDate: pixFirstInstallmentPeriod.dueDate.toISOString().split('T')[0]
            };
            
            console.log(`📄 [SIMPLE-PIX-RECEIPT] Gerando comprovante UNIFICADO PIX com ${allPixPetsData.length} pet(s):`, {
              pixPetNames,
              totalPets: allPixPetsData.length
            });
            
            try {
              const receiptResult = await receiptService.generatePaymentReceipt(
                unifiedPixReceiptData, 
                `simple_pix_unified_${pixPaymentResult.payment.paymentId}`
              );
              
              if (receiptResult.success && receiptResult.receiptId) {
                // Update ALL PIX installments with the unified receipt ID
                for (const installmentId of pixInstallmentIds) {
                  await storage.updateContractInstallment(installmentId, {
                    paymentReceiptId: receiptResult.receiptId
                  });
                }
                
                console.log("✅ [SIMPLE-PIX-RECEIPT] Comprovante PIX unificado gerado:", {
                  receiptId: receiptResult.receiptId,
                  receiptNumber: receiptResult.receiptNumber,
                  totalPets: allPixPetsData.length,
                  pixPetNames
                });
              } else {
                console.error("❌ [SIMPLE-PIX-RECEIPT] Erro ao gerar comprovante:", receiptResult.error);
              }
            } catch (error: any) {
              console.error(`❌ [SIMPLE-PIX] Erro ao gerar comprovante:`, error.message);
            }
          }
          
          return res.status(200).json({
            success: true,
            message: "QR Code PIX gerado com sucesso!",
            payment: {
              paymentId: pixPaymentResult.payment.paymentId,
              status: pixPaymentResult.payment.status,
              method: paymentMethod,
              pixQrCode: pixPaymentResult.payment.qrCodeBase64Image,
              pixCode: pixPaymentResult.payment.qrCodeString
            },
            client: {
              id: client.id,
              name: client.fullName,
              email: client.email
            }
          });
        } else {
          // PIX generation failed
          return res.status(400).json({
            error: "Erro ao gerar código PIX",
            details: pixPaymentResult.payment?.returnMessage || "Não foi possível gerar o QR Code",
            paymentMethod,
            status: pixPaymentResult.payment?.status,
            returnCode: pixPaymentResult.payment?.returnCode
          });
        }
      } else {
        return res.status(400).json({
          error: "Método de pagamento não suportado",
          paymentMethod
        });
      }
      
    } catch (error: any) {
      console.error("❌ [SIMPLE-CHECKOUT] Erro:", error);
      
      return res.status(500).json({
        error: "Erro interno do servidor",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Step 3: Complete checkout with payment processing (after address/payment form)
  app.post("/api/checkout/process", checkoutLimiter, async (req, res) => {
    try {
      console.log("🛒 [CHECKOUT-STEP3] Iniciando processamento do checkout");
      
      // SECURITY: Explicit whitelist to prevent mass assignment attacks
      const { 
        clientId, 
        addressData, 
        paymentData, 
        planData,
        paymentMethod, // 'credit_card', 'pix'
        isRenewal,
        renewalContractId
      } = req.body;
      
      // SECURITY: Whitelist allowed fields from nested addressData object
      const whitelistedAddressData = addressData ? {
        cep: addressData.cep,
        address: addressData.address,
        number: addressData.number,
        complement: addressData.complement,
        district: addressData.district,
        city: addressData.city,
        state: addressData.state
      } : {};
      
      // SECURITY: Whitelist allowed fields from nested paymentData object
      const whitelistedPaymentData = paymentData ? {
        customer: paymentData.customer ? {
          name: paymentData.customer.name,
          email: paymentData.customer.email,
          cpf: paymentData.customer.cpf,
          phone: paymentData.customer.phone
        } : undefined,
        payment: paymentData.payment ? {
          cardNumber: paymentData.payment.cardNumber,
          holder: paymentData.payment.holder,
          expirationDate: paymentData.payment.expirationDate,
          securityCode: paymentData.payment.securityCode,
          installments: paymentData.payment.installments
        } : undefined,
        pets: Array.isArray(paymentData.pets) ? paymentData.pets.map(pet => ({
          name: pet.name,
          species: pet.species,
          breed: pet.breed,
          age: pet.age,
          sex: pet.sex,
          castrated: pet.castrated,
          weight: pet.weight,
          color: pet.color
        })) : undefined
      } : {};
      
      // SECURITY: Whitelist allowed fields from planData
      const whitelistedPlanData = planData ? {
        planId: planData.planId,
        billingPeriod: planData.billingPeriod,
        amount: planData.amount
      } : {};
      
      // Replace with whitelisted versions
      const validatedAddressData = whitelistedAddressData;
      const validatedPaymentData = whitelistedPaymentData;
      const validatedPlanData = whitelistedPlanData;
      
      if (!clientId || !validatedAddressData || !validatedPaymentData || !validatedPlanData || !paymentMethod) {
        return res.status(400).json({ 
          error: "Dados incompletos - clientId, addressData, paymentData, planData e paymentMethod são obrigatórios" 
        });
      }
      
      // CORREÇÃO: Validar consistência de cliente de forma mais robusta
      console.log("🔍 [CHECKOUT-VALIDATION] Validando dados do checkout:", {
        clientId,
        customerEmail: validatedPaymentData.customer?.email,
        customerName: validatedPaymentData.customer?.name
      });
      
      // Primeiro, verificar se o clientId enviado existe
      const clientById = await storage.getClientById(clientId);
      if (!clientById) {
        console.error("❌ [CHECKOUT-VALIDATION] Cliente não encontrado:", { clientId });
        return res.status(400).json({ 
          field: "clientId",
          error: "Cliente não encontrado no sistema",
          details: "Por favor, refaça o processo de checkout do início"
        });
      }
      
      // Verificar se há outro cliente que tem o mesmo email
      const clientByEmail = await storage.getClientByEmail(validatedPaymentData.customer?.email);
      let validatedClient = clientById;
      
      if (clientByEmail && clientByEmail.id !== clientId) {
        // Email já existe em outra conta - usar automaticamente a conta existente
        console.log("🔄 [CHECKOUT-VALIDATION] Email já vinculado a outra conta, usando conta existente:", {
          clientIdSent: clientId,
          clientIdExistente: clientByEmail.id,
          email: paymentData.customer?.email,
          nomeExistente: clientByEmail.fullName
        });
        
        validatedClient = clientByEmail;
        
        // Limpar cliente temporário se for diferente do existente
        if (clientId !== clientByEmail.id) {
          try {
            console.log(`🗑️ [CHECKOUT-VALIDATION] Removendo cliente temporário: ${clientId}`);
            await storage.deleteClient(clientId);
            console.log(`✅ [CHECKOUT-VALIDATION] Cliente temporário removido`);
          } catch (deleteError) {
            console.error(`⚠️ [CHECKOUT-VALIDATION] Erro ao remover cliente temporário:`, deleteError);
          }
        }
      }
      
      console.log("✅ [CHECKOUT-VALIDATION] Cliente validado com sucesso:", {
        clientId: validatedClient.id,
        email: validatedClient.email,
        name: validatedClient.fullName
      });
      
      // Track if we need to create a client after payment approval (não mais necessário pois já validamos)
      const needsClientCreation = false;

      // ============================================
      // VALIDATE PLAN-SPECIFIC PAYMENT RULES
      // ============================================
      
      // Plan ID mappings for business rules
      const PLAN_BUSINESS_RULES = {
        BASIC: 'ec994283-76de-4605-afa3-0670a8a0a475',
        COMFORT: '7a8c94f9-1336-495f-a771-12755bfd4921', 
        PLATINUM: '20f78143-ae37-4438-ab4b-57380fb17818',
        INFINITY: '887dd8ae-1885-4d66-bc65-0ec460912c59'
      };

      // Function to determine plan type based on business rules
      const getPlanType = (planId: string): 'BASIC_INFINITY' | 'COMFORT_PLATINUM' | 'UNKNOWN' => {
        if (planId === PLAN_BUSINESS_RULES.BASIC || planId === PLAN_BUSINESS_RULES.INFINITY) {
          return 'BASIC_INFINITY';
        }
        
        if (planId === PLAN_BUSINESS_RULES.COMFORT || planId === PLAN_BUSINESS_RULES.PLATINUM) {
          return 'COMFORT_PLATINUM';
        }
        
        return 'UNKNOWN';
      };

      // Validate payment rules based on plan type
      const planType = getPlanType(planData.planId);
      const billingPeriod = planData.billingPeriod;
      const installments = paymentData.payment?.installments || 1;

      console.log("🔍 [PAYMENT-RULES] Validating payment rules:", {
        planId: planData.planId,
        planType,
        billingPeriod,
        installments,
        paymentMethod
      });

      // Rule 1: COMFORT and PLATINUM plans can only use annual billing
      if (planType === 'COMFORT_PLATINUM' && billingPeriod === 'monthly') {
        console.error("❌ [PAYMENT-RULES] Planos COMFORT/PLATINUM só permitem cobrança anual");
        return res.status(400).json({
          error: "Regra de pagamento violada",
          details: "Planos COMFORT e PLATINUM só aceitam pagamento anual"
        });
      }

      // Rule 2: BASIC and INFINITY plans can only use 1x installments with credit card
      if (planType === 'BASIC_INFINITY' && paymentMethod === 'credit_card' && installments > 1) {
        console.error("❌ [PAYMENT-RULES] Planos BASIC/INFINITY só permitem cartão 1x à vista");
        return res.status(400).json({
          error: "Regra de pagamento violada", 
          details: "Planos BASIC e INFINITY só aceitam cartão de crédito à vista (1x)"
        });
      }

      // Rule 3: COMFORT and PLATINUM plans can use up to 12x installments with credit card
      if (planType === 'COMFORT_PLATINUM' && paymentMethod === 'credit_card' && installments > 12) {
        console.error("❌ [PAYMENT-RULES] Planos COMFORT/PLATINUM permitem no máximo 12x no cartão");
        return res.status(400).json({
          error: "Regra de pagamento violada",
          details: "Planos COMFORT e PLATINUM permitem no máximo 12x no cartão de crédito"
        });
      }

      // Rule 4: PIX is always à vista (installments should be 1)
      if (paymentMethod === 'pix' && installments > 1) {
        console.error("❌ [PAYMENT-RULES] PIX só permite pagamento à vista");
        return res.status(400).json({
          error: "Regra de pagamento violada",
          details: "PIX só permite pagamento à vista"
        });
      }

      console.log("✅ [PAYMENT-RULES] Regras de pagamento validadas com sucesso");

      // ============================================
      // CALCULATE CORRECT PRICE FROM DATABASE
      // ============================================
      
      // Buscar plano no banco para obter preço correto
      const selectedPlan = await storage.getPlan(planData.planId);
      if (!selectedPlan) {
        console.error("❌ [PRICE-CALCULATION] Plano não encontrado:", planData.planId);
        return res.status(400).json({
          error: "Plano não encontrado",
          details: `Plano ${planData.planId} não existe no sistema`
        });
      }

      // Contar pets (assumindo 1 pet se não especificado)
      const petCount = paymentData.pets?.length || 1;
      
      // Calcular preço correto usando basePrice do banco de dados e aplicando descontos
      const basePriceDecimal = parseFloat(selectedPlan.basePrice || '0');
      const basePriceCents = Math.round(basePriceDecimal * 100);
      
      // Aplicar desconto apenas para planos Basic/Infinity e pets a partir do 2º
      let totalCents = 0;
      for (let i = 0; i < petCount; i++) {
        let petPriceCents = basePriceCents;
        
        if (['BASIC', 'INFINITY'].some(type => selectedPlan.name.toUpperCase().includes(type)) && i > 0) {
          const discountPercentage = i === 1 ? 5 :  // 2º pet: 5%
                                   i === 2 ? 10 : // 3º pet: 10%
                                   15;             // 4º+ pets: 15%
          petPriceCents = Math.round(basePriceCents * (1 - discountPercentage / 100));
        }
        
        totalCents += petPriceCents;
      }
      
      let correctAmountInCents = totalCents;
      
      // If this is a renewal/regularization, check for overdue periods
      if (isRenewal && renewalContractId) {
        // Get the contract to check for overdue periods
        const contractToRenew = await storage.getContract(renewalContractId);
        if (contractToRenew) {
          const currentDate = new Date();
          const originalStartDate = new Date(contractToRenew.startDate);
          const lastPaymentDate = contractToRenew.receivedDate ? new Date(contractToRenew.receivedDate) : null;
          const billingPeriod = contractToRenew.billingPeriod || 'monthly';
          
          // Calculate overdue periods
          const overduePeriods = calculateOverduePeriods(
            lastPaymentDate,
            currentDate,
            billingPeriod,
            originalStartDate
          );
          
          if (overduePeriods > 0) {
            // Calculate total amount including overdue periods
            const baseAmountDecimal = correctAmountInCents / 100;
            const totalAmountWithOverdue = calculateRegularizationAmount(baseAmountDecimal, overduePeriods, true);
            const adjustedAmountInCents = Math.round(totalAmountWithOverdue * 100);
            
            console.log("🔴 [REGULARIZATION-PRICING] Ajustando valor para incluir períodos em atraso:", {
              contractNumber: contractToRenew.contractNumber,
              overduePeriods,
              baseAmount: `R$ ${baseAmountDecimal.toFixed(2)}`,
              totalPeriods: overduePeriods + 1,
              totalAmount: `R$ ${totalAmountWithOverdue.toFixed(2)}`,
              originalAmountCents: correctAmountInCents,
              adjustedAmountCents: adjustedAmountInCents,
              message: `Cobrando ${overduePeriods} período(s) em atraso + período atual`
            });
            
            correctAmountInCents = adjustedAmountInCents;
          }
        }
      }
      
      console.log("💰 [PRICE-CALCULATION] Preço calculado no servidor:", {
        planName: selectedPlan.name,
        basePrice: basePriceDecimal,
        petCount: petCount,
        totalWithDiscounts: (correctAmountInCents / 100).toFixed(2),
        correctAmountInCents: correctAmountInCents,
        receivedAmountFromClient: planData.amount,
        priceMatch: correctAmountInCents === planData.amount,
        isDiscountEligible: ['BASIC', 'INFINITY'].some(type => selectedPlan.name.toUpperCase().includes(type)),
        isRenewal: isRenewal || false,
        hasOverduePayments: correctAmountInCents > totalCents
      });

      // ============================================
      // SAVE CLIENT AND PET DATA BEFORE PAYMENT
      // ============================================
      
      console.log("💾 [PRE-PAYMENT] Salvando cliente e pet antes do pagamento...");

      // Atualizar dados completos do cliente (com endereço)
      // Note: usar fullName (camelCase) conforme schema
      // Filtrar campos undefined para evitar erro no Drizzle
      const updatedClientData = {
        fullName: paymentData.customer.name || validatedClient.fullName,
        email: paymentData.customer.email || validatedClient.email,
        cpf: paymentData.customer.cpf?.replace(/\D/g, '') || validatedClient.cpf,
        phone: paymentData.customer.phone || validatedClient.phone,
        cep: addressData.cep || null,
        address: addressData.address || null,
        number: addressData.number || null,
        complement: addressData.complement || null,
        district: addressData.district || null,
        city: addressData.city || null,
        state: addressData.state || null
      };
      
      // Remove undefined values to prevent Drizzle errors
      Object.keys(updatedClientData).forEach(key => {
        if (updatedClientData[key] === undefined) {
          delete updatedClientData[key];
        }
      });

      try {
        // Atualizar cliente com dados validados
        
        // Atualizar cliente com dados completos
        await storage.updateClient(validatedClient.id, updatedClientData);
        console.log("✅ [PRE-PAYMENT] Cliente atualizado com endereço completo");

        // Pets serão criados apenas após pagamento aprovado
        // Validar dados dos pets sem salvá-los
        if (paymentData.pets && paymentData.pets.length > 0) {
          for (const petData of paymentData.pets) {
            console.log("✅ [PRE-PAYMENT] Pet validado (será criado após pagamento):", { 
              name: petData.name, 
              species: petData.species || 'Cão' 
            });
          }
        }
      } catch (saveError) {
        console.error("❌ [PRE-PAYMENT] Erro ao salvar dados:", saveError);
        return res.status(500).json({
          error: "Erro ao salvar dados do cliente/pet",
          details: "Tente novamente em alguns instantes"
        });
      }
      
      // Import Cielo service
      const { CieloService } = await import("./services/cielo-service.js");
      const cieloService = new CieloService();
      
      let paymentResult;
      const merchantOrderId = `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log("💳 [CHECKOUT-STEP3] Processando pagamento via Cielo:", {
        paymentMethod,
        clientId: validatedClient.id,
        clientEmail: validatedClient.email,
        paymentAmount: correctAmountInCents,
        originalAmount: planData.amount
      });
      
      try {
        switch (paymentMethod) {
          case 'credit_card':
            // Debug: verificar estrutura completa dos dados recebidos
            // ⚠️ SECURITY: Log de dados sensíveis removido para compliance PCI-DSS/LGPD
            // console.log("🔍 [CHECKOUT-DEBUG] Estrutura completa paymentData:", JSON.stringify(paymentData, null, 2));
            console.log("🔍 [CHECKOUT-DEBUG] payment existe?", !!paymentData.payment);
            console.log("🔍 [CHECKOUT-DEBUG] payment keys:", paymentData.payment ? Object.keys(paymentData.payment) : 'undefined');
            
            // Verificar se os dados do cartão existem
            if (!paymentData.payment || !paymentData.payment.cardNumber) {
              console.error("❌ [CHECKOUT-DEBUG] paymentData.payment não existe ou cardNumber missing");
              throw new Error('Dados do cartão de crédito não fornecidos ou incompletos');
            }
            
            const creditCardRequest = {
              merchantOrderId,
              customer: {
                name: paymentData.customer.name,
                email: paymentData.customer.email,
                identity: paymentData.customer.cpf?.replace(/\D/g, '') || paymentData.customer.identity,
                identityType: 'CPF' as 'CPF' | 'CNPJ',
                address: {
                  street: addressData.address || '',
                  number: addressData.number || 'S/N',
                  complement: addressData.complement || '',
                  zipCode: (addressData.cep || '').replace(/\D/g, ''),
                  city: addressData.city || '',
                  state: addressData.state || '',
                  country: 'BRA'
                }
              },
              payment: {
                type: 'CreditCard' as const,
                amount: correctAmountInCents,
                installments: paymentData.payment.installments || 1,
                capture: true,
                creditCard: {
                  cardNumber: paymentData.payment.cardNumber.replace(/\s/g, ''),
                  holder: paymentData.payment.holder || paymentData.payment.cardHolder, // Aceitar ambos os nomes
                  expirationDate: paymentData.payment.expirationDate,
                  securityCode: paymentData.payment.securityCode,
                  brand: 'Visa' // Detectar automaticamente ou usar padrão
                }
              }
            };
            paymentResult = await cieloService.createCreditCardPayment(creditCardRequest);
            break;
            
          case 'pix':
            const pixRequest = {
              MerchantOrderId: merchantOrderId,
              Customer: {
                Name: paymentData.customer.name,
                Identity: paymentData.customer.cpf?.replace(/\D/g, '') || paymentData.customer.identity,
                IdentityType: 'CPF' as 'CPF' | 'CNPJ',
                Email: paymentData.customer.email
              },
              Payment: {
                Type: 'Pix' as const,
                Amount: correctAmountInCents,
                Provider: 'Cielo' as const
              }
            };
            paymentResult = await cieloService.createPixPayment(pixRequest);
            break;
            
          default:
            return res.status(400).json({ 
              error: "Método de pagamento inválido" 
            });
        }
        
        console.log("✅ [CHECKOUT-STEP3] Pagamento processado:", {
          paymentId: paymentResult.payment?.paymentId,
          status: paymentResult.payment?.status,
          method: paymentMethod
        });
        
      } catch (paymentError: any) {
        console.error("❌ [CHECKOUT-STEP3] Erro no pagamento Cielo:", paymentError);
        return res.status(400).json({
          error: "Erro ao processar pagamento",
          details: paymentError.message,
          paymentMethod
        });
      }
      
      // If payment was successful, save address data and create contract
      const isPaymentSuccessful = paymentResult.payment?.status === 1 || // Authorized
                                  paymentResult.payment?.status === 2 || // Confirmed
                                  paymentResult.payment?.status === 12; // Pending (for pix)
      
      if (isPaymentSuccessful) {
        console.log("💾 [CHECKOUT-STEP3] Pagamento autorizado, salvando dados adicionais");
        
        try {
          let targetClient = validatedClient;
          
          // Create client automatically if credit card payment approved (status 2) and client doesn't exist
          if (needsClientCreation && paymentMethod === 'credit_card' && paymentResult.payment?.status === 2) {
            console.log("🔄 [CHECKOUT-AUTO-CLIENT] Criando cliente automaticamente após pagamento aprovado");
            
            // Validate required customer data
            if (!paymentData.customer?.name || !paymentData.customer?.email || !paymentData.customer?.cpf) {
              throw new Error('Dados do cliente insuficientes para criação automática');
            }
            
            // Hash CPF for authentication (email + CPF login)
            const cpfClean = paymentData.customer.cpf.replace(/\D/g, ''); // Clean CPF (only numbers)
            const cpfHash = await bcrypt.hash(cpfClean, 12);
            
            // Prepare client data for creation
            const newClientData = {
              id: clientId, // Use the provided clientId
              fullName: paymentData.customer.name,
              email: paymentData.customer.email,
              phone: paymentData.customer.phone || '',
              cpf: paymentData.customer.cpf, // Store CPF with formatting for display
              cpfHash: cpfHash, // Store hashed CPF for authentication
              // Include address data if available
              address: addressData.address || '',
              number: addressData.number || '',
              complement: addressData.complement || '',
              district: addressData.district || '',
              city: addressData.city || '',
              state: addressData.state || '',
              cep: addressData.cep || ''
            };
            
            // Create the new client
            targetClient = await storage.createClient(newClientData);
            
            console.log("✅ [CHECKOUT-AUTO-CLIENT] Cliente criado automaticamente com sucesso", {
              clientId: targetClient.id,
              email: targetClient.email,
              name: targetClient.fullName
            });
          } else if (!needsClientCreation) {
            // CRITICAL FIX: Get current client data to preserve CPF
            const currentClient = await storage.getClientById(clientId);
            console.log("🔄 [CHECKOUT-PROCESS] Preservando CPF do cliente:", { 
              clientId, 
              currentCpf: currentClient?.cpf ? 'PRESENTE' : 'AUSENTE',
              hasAddress: !!addressData.address 
            });
            
            // Update existing client with address data while preserving CPF
            const updatedClient = await storage.updateClient(clientId, {
              cpf: currentClient?.cpf, // CRITICAL FIX: Preserve CPF during address update
              address: addressData.address,
              number: addressData.number,
              complement: addressData.complement,
              district: addressData.district,
              city: addressData.city,
              state: addressData.state,
              cep: addressData.cep
            });
            if (!updatedClient) {
              throw new Error('Falha ao atualizar cliente');
            }
            targetClient = updatedClient;
          } else {
            throw new Error('Cliente não existe e não foi possível criar automaticamente');
          }
          
          // Handle renewal mode vs new contract creation
          let contracts: any[] = [];
          
          if (isRenewal && renewalContractId) {
            console.log("🔄 [RENEWAL] Modo renovação detectado, atualizando contrato existente:", renewalContractId);
            
            // CRITICAL FIX: Determine if payment is confirmed before marking as active
            const isPaymentConfirmed = paymentMethod === 'credit_card' && paymentResult.payment?.status === 2;
            const contractStatus: 'active' | 'pending' = isPaymentConfirmed ? 'active' : 'pending';
            
            // Get the existing contract to renew
            const existingContract = await storage.getContract(renewalContractId);
            if (!existingContract) {
              throw new Error(`Contrato para renovação não encontrado: ${renewalContractId}`);
            }
            
            // Verify the contract belongs to the client
            if (existingContract.clientId !== clientId) {
              throw new Error('Contrato não pertence ao cliente autenticado');
            }
            
            // Calculate new start date based on current contract expiration or today
            const currentDate = new Date();
            let newStartDate = currentDate;
            
            // If contract still has time, extend from the current end date
            if (existingContract.receivedDate) {
              const paymentDate = new Date(existingContract.receivedDate);
              const billingPeriod = existingContract.billingPeriod || 'monthly';
              const expirationDays = billingPeriod === 'annual' ? 365 : 30;
              const currentExpirationDate = new Date(paymentDate);
              currentExpirationDate.setDate(currentExpirationDate.getDate() + expirationDays);
              
              // If current contract hasn't expired yet, start from expiration date
              if (currentExpirationDate > currentDate) {
                newStartDate = currentExpirationDate;
              }
            }
            
            // Update the existing contract with renewal data
            const isAnnualPlan = existingContract.billingPeriod === 'annual';
            const renewalData: any = {
              status: contractStatus,
              startDate: newStartDate,
              monthlyAmount: isAnnualPlan ? '0.00' : (correctAmountInCents / 100).toString(),
              annualAmount: isAnnualPlan ? (correctAmountInCents / 100).toString() : existingContract.annualAmount,
              paymentMethod: paymentMethod,
              cieloPaymentId: paymentResult.payment?.paymentId,
              // Payment proof data
              proofOfSale: paymentResult.payment?.proofOfSale,
              authorizationCode: paymentResult.payment?.authorizationCode,
              tid: paymentResult.payment?.tid,
              receivedDate: isPaymentConfirmed ? calculateRegularizationReceivedDate(
                new Date(existingContract.startDate),
                new Date(),
                existingContract.billingPeriod || 'monthly'
              ) : null,
              returnCode: paymentResult.payment?.returnCode,
              returnMessage: paymentResult.payment?.returnMessage,
              // PIX specific data
              pixQrCode: paymentMethod === 'pix' ? paymentResult.payment?.qrCodeBase64Image : null,
              pixCode: paymentMethod === 'pix' ? paymentResult.payment?.qrCodeString : null
            };
            
            // Save card token if SaveCard was enabled and we got a token back
            if (paymentMethod === 'credit_card' && paymentData.payment?.creditCard?.saveCard && paymentResult.payment?.creditCard?.cardToken) {
              console.log("💳 [TOKENIZATION] Salvando token do cartão para cobranças futuras");
              renewalData.cieloCardToken = paymentResult.payment.creditCard.cardToken;
              renewalData.cardBrand = paymentResult.payment.creditCard.brand || paymentData.payment.creditCard.brand;
              renewalData.cardLastDigits = paymentResult.payment.creditCard.lastDigits || paymentData.payment.creditCard.cardNumber.slice(-4);
              console.log("✅ [TOKENIZATION] Token salvo com sucesso:", {
                brand: renewalData.cardBrand,
                lastDigits: renewalData.cardLastDigits
              });
            }
            
            console.log("📝 [RENEWAL] Atualizando contrato com dados de renovação:", {
              contractId: renewalContractId,
              contractNumber: existingContract.contractNumber,
              newStartDate: newStartDate.toISOString(),
              amount: renewalData.monthlyAmount
            });
            
            const updatedContract = await storage.updateContract(renewalContractId, renewalData);
            if (updatedContract) {
              contracts.push(updatedContract as any);
              if (contractStatus === 'active') {
                console.log("✅ [RENEWAL] Contrato renovado com sucesso:", {
                contractId: updatedContract.id,
                contractNumber: updatedContract.contractNumber
              });
              } else {
                console.log("⏳ [RENEWAL] PIX gerado, aguardando confirmação de pagamento:", {
                  contractId: updatedContract.id,
                  contractNumber: updatedContract.contractNumber,
                  status: contractStatus
                });
              }
            }
          } else {
            // Standard flow: Get client's pets to create contracts
            console.log("📋 [NEW-CONTRACT] Criando pets após pagamento aprovado");
            // Create pets first (only after payment is approved)
            const createdPets: any[] = [];
            if (paymentData.pets && paymentData.pets.length > 0) {
              for (const petData of paymentData.pets) {
                const petId = `pet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                const newPet = {
                  id: petId,
                  clientId: targetClient.id,
                  name: petData.name,
                  species: petData.species || 'Cão',
                  breed: petData.breed || 'SRD',
                  age: petData.age ? petData.age.toString() : '1',
                  sex: petData.sex || 'Macho',
                  castrated: petData.castrated || false,
                  weight: petData.weight?.toString() || '1',
                  vaccineData: JSON.stringify([]),
                  isActive: true,
                  planId: planData.planId
                };
                
                try {
                  const pet = await storage.createPet(newPet);
                  createdPets.push(pet);
                  console.log("✅ [PAYMENT-APPROVED] Pet criado após pagamento aprovado:", { 
                    name: pet.name, 
                    species: pet.species,
                    petId: pet.id
                  });
                } catch (petError) {
                  console.error("⚠️ [PAYMENT-APPROVED] Erro ao criar pet (continuando):", petError);
                }
              }
            }
            
            const clientPets = createdPets.length > 0 ? createdPets : await storage.getPetsByClientId(clientId);
            
            // Create contract for each pet
            for (const pet of clientPets) {
            // Gerar número do contrato único
            const contractNumber = `UNIPET-${Date.now()}-${pet.id.substring(0, 4).toUpperCase()}`;
            
            // Fetch plan details to check plan type
            const planDetails = await storage.getPlan(planData.planId);
            
            // Determine if plan is annual (COMFORT or PLATINUM)
            // COMFORT and PLATINUM plans are always annual (365 days)
            // BASIC and INFINITY plans are monthly (30 days)
            const isAnnualPlan = planDetails && ['COMFORT', 'PLATINUM'].some(type => 
              planDetails.name.toUpperCase().includes(type)
            );
            
            // ✅ VALIDAÇÃO A2: Garantir billing period correto para o plano
            const validatedBillingPeriod = enforceCorrectBillingPeriod(
              planDetails!, 
              isAnnualPlan ? 'annual' : 'monthly'
            );
            
            const monthlyAmountValue = correctAmountInCents / 100;
            
            const contractData = {
              clientId: clientId,
              petId: pet.id,
              planId: planData.planId,
              contractNumber: contractNumber, // Forçar no início
              billingPeriod: validatedBillingPeriod,
              status: 'active' as const,
              startDate: new Date(),
              monthlyAmount: isAnnualPlan ? '0.00' : monthlyAmountValue.toString(), // Annual plans have monthlyAmount = 0.00
              annualAmount: isAnnualPlan ? (monthlyAmountValue * 12).toFixed(2) : '0.00',
              paymentMethod: paymentMethod,
              cieloPaymentId: paymentResult.payment?.paymentId,
              // Payment proof data (for credit card and PIX)
              proofOfSale: paymentResult.payment?.proofOfSale,
              authorizationCode: paymentResult.payment?.authorizationCode,
              tid: paymentResult.payment?.tid,
              receivedDate: paymentResult.payment?.receivedDate ? new Date(paymentResult.payment.receivedDate) : null,
              returnCode: paymentResult.payment?.returnCode,
              returnMessage: paymentResult.payment?.returnMessage,
              // PIX specific data
              pixQrCode: paymentMethod === 'pix' ? paymentResult.payment?.qrCodeBase64Image : null,
              pixCode: paymentMethod === 'pix' ? paymentResult.payment?.qrCodeString : null
            };
            
            console.log("🔍 [ROUTES-DEBUG] contractData a ser passado:", JSON.stringify(contractData, null, 2));
            
            const contract = await storage.createContract(contractData);
            contracts.push(contract);
            }
          }
          
          // ✅ CRIAR PRIMEIRA PARCELA E GERAR COMPROVANTES OFICIAIS para pagamentos aprovados
          if (paymentMethod === 'credit_card' && paymentResult.payment?.status === 2) {
            console.log("📄 [CHECKOUT-RECEIPT] Criando primeira parcela e gerando comprovantes oficiais...");
            
            try {
              // Import PaymentReceiptService
              const { PaymentReceiptService } = await import("./services/payment-receipt-service.js");
              const receiptService = new PaymentReceiptService();
              
              // Process each created contract
              for (const contract of contracts) {
                try {
                  const pet = await storage.getPet(contract.petId);
                  const plan = await storage.getPlan(contract.planId);
                  
                  // Calculate first installment dates
                  const now = new Date();
                  // ✅ CORRIGIDO: Para primeira parcela PAGA no checkout, dueDate = data do pagamento
                  // Não adicionar período porque já está paga. A próxima parcela será calculada corretamente.
                  const dueDate = new Date(now);
                  
                  const periodStart = new Date(now);
                  
                  // Period ends based on billing period (1 month for monthly, 1 year for annual)
                  const periodEnd = contract.billingPeriod === 'annual'
                    ? addYears(periodStart, 1)
                    : addMonths(periodStart, 1);
                  periodEnd.setDate(periodEnd.getDate() - 1); // Last day of period
                  
                  // Create first installment (Parcela 1)
                  // For annual plans, use annual amount directly from contract
                  const installmentAmount = contract.billingPeriod === 'annual' 
                    ? contract.annualAmount
                    : contract.monthlyAmount;
                  
                  const installmentData = {
                    contractId: contract.id,
                    installmentNumber: 1,
                    dueDate: dueDate,
                    periodStart: periodStart,
                    periodEnd: periodEnd,
                    amount: installmentAmount,
                    status: 'paid',
                    cieloPaymentId: paymentResult.payment?.paymentId,
                    paidAt: now,
                    createdAt: now,
                    updatedAt: now
                  };
                  
                  console.log("💳 [CHECKOUT-INSTALLMENT] Criando primeira parcela:", {
                    contractId: contract.id,
                    installmentNumber: 1,
                    amount: installmentData.amount,
                    status: 'paid'
                  });
                  
                  const firstInstallment = await storage.createContractInstallment(installmentData);
                  
                  // For monthly and annual plans, automatically create the next installment after successful payment
                  await createNextAnnualInstallmentIfNeeded(contract.id, firstInstallment, '[CHECKOUT-CC-PAYMENT]');
                  
                  // Build pet data object com informações detalhadas
                  const petData = {
                    name: pet?.name || 'Pet',
                    species: pet?.species || 'Não informado',
                    breed: pet?.breed || 'Não informado',
                    age: pet?.age ? (typeof pet.age === 'string' ? parseInt(pet.age) : pet.age) : undefined,
                    sex: pet?.sex || 'Não informado',
                    planName: plan?.name || 'Plano',
                    planType: plan?.name?.toUpperCase() || 'BASIC',
                    value: Math.round(parseFloat(installmentAmount) * 100), // valor em centavos
                    discountedValue: Math.round(parseFloat(installmentAmount) * 100) // mesmo valor (sem desconto adicional)
                  };
                  
                  // Generate receipt with installment data
                  const receiptData = {
                    contractId: contract.id,
                    cieloPaymentId: paymentResult.payment?.paymentId,
                    clientName: paymentData.customer.name || targetClient.fullName,
                    clientEmail: targetClient.email,
                    clientCPF: targetClient.cpf || undefined,
                    clientPhone: targetClient.phone,
                    clientAddress: targetClient.address && targetClient.cep ? {
                      street: targetClient.address,
                      number: targetClient.number || 'S/N',
                      complement: targetClient.complement || '',
                      neighborhood: targetClient.district || '',
                      city: targetClient.city || '',
                      state: targetClient.state || '',
                      zipCode: targetClient.cep
                    } : undefined,
                    pets: [petData], // ✅ Array com informações detalhadas do pet
                    petName: pet?.name || "Pet",
                    planName: plan?.name || "Plano",
                    paymentAmount: parseFloat(installmentAmount) * 100, // Convert to cents (uses annual amount for annual plans)
                    paymentDate: now.toISOString().split('T')[0],
                    paymentMethod: 'credit_card',
                    status: 'paid',
                    billingPeriod: contract.billingPeriod, // Adiciona tipo de cobrança
                    proofOfSale: paymentResult.payment?.proofOfSale,
                    authorizationCode: paymentResult.payment?.authorizationCode,
                    tid: paymentResult.payment?.tid,
                    returnCode: paymentResult.payment?.returnCode?.toString(),
                    returnMessage: paymentResult.payment?.returnMessage,
                    // Add installment period information
                    installmentPeriodStart: periodStart.toISOString().split('T')[0],
                    installmentPeriodEnd: periodEnd.toISOString().split('T')[0],
                    installmentNumber: 1,
                    installmentDueDate: dueDate.toISOString().split('T')[0]
                  };
                  
                  console.log("📄 [CHECKOUT-RECEIPT] Gerando comprovante para primeira parcela:", {
                    contractId: contract.id,
                    contractNumber: contract.contractNumber,
                    petName: pet?.name,
                    planName: plan?.name,
                    installmentNumber: 1
                  });
                  
                  const result = await receiptService.generatePaymentReceipt(
                    receiptData, 
                    `checkout_${contract.id}_${Date.now()}`
                  );
                  
                  if (result.success && result.receiptId) {
                    // Update installment with receipt ID
                    await storage.updateContractInstallment(firstInstallment.id, {
                      paymentReceiptId: result.receiptId
                    });
                    
                    console.log("✅ [CHECKOUT-RECEIPT] Primeira parcela criada e comprovante gerado:", {
                      installmentId: firstInstallment.id,
                      receiptId: result.receiptId,
                      receiptNumber: result.receiptNumber,
                      contractNumber: contract.contractNumber
                    });
                  } else {
                    console.error("❌ [CHECKOUT-RECEIPT] Erro ao gerar comprovante da primeira parcela:", {
                      contractId: contract.id,
                      error: result.error
                    });
                  }
                } catch (receiptError: any) {
                  console.error("❌ [CHECKOUT-RECEIPT] Erro crítico na criação da primeira parcela:", {
                    contractId: contract.id,
                    error: receiptError.message
                  });
                }
              }
            } catch (serviceError: any) {
              console.error("❌ [CHECKOUT-RECEIPT] Erro ao importar PaymentReceiptService:", serviceError.message);
            }
          }

          console.log("🎉 [CHECKOUT-STEP3] Checkout concluído com sucesso", {
            clientId,
            contractsCreated: contracts.length,
            paymentId: paymentResult.payment?.paymentId,
            clientCreatedAutomatically: needsClientCreation && paymentMethod === 'credit_card' && paymentResult.payment?.status === 2
          });
          
          // Return success response with client info (without password)
          const { cpfHash: _, ...clientResponse } = targetClient || {};
          
          res.status(200).json({
            success: true,
            message: "Checkout concluído com sucesso",
            payment: {
              status: paymentResult.payment?.status,
              paymentId: paymentResult.payment?.paymentId,
              orderId: merchantOrderId,
              method: paymentMethod,
              proofOfSale: paymentResult.payment?.proofOfSale,
              authorizationCode: paymentResult.payment?.authorizationCode,
              tid: paymentResult.payment?.tid,
              receivedDate: paymentResult.payment?.receivedDate,
              returnCode: paymentResult.payment?.returnCode,
              returnMessage: paymentResult.payment?.returnMessage,
              ...(paymentMethod === 'pix' && paymentResult.payment?.qrCodeBase64Image && {
                pixQrCode: paymentResult.payment.qrCodeBase64Image,
                pixCode: paymentResult.payment.qrCodeString
              })
            },
            contracts: contracts,
            client: clientResponse
          });
          
        } catch (saveError: any) {
          console.error("❌ [CHECKOUT-STEP3] Erro ao salvar dados pós-pagamento:", saveError);
          
          // Payment was successful but we couldn't save the data
          // This is a critical error that needs manual intervention
          res.status(500).json({
            error: "Pagamento processado mas erro ao salvar dados",
            paymentId: paymentResult.payment?.paymentId,
            orderId: merchantOrderId,
            details: "Entre em contato com o suporte informando o ID do pagamento"
          });
        }
        
      } else {
        console.log("❌ [CHECKOUT-STEP3] Pagamento não autorizado:", {
          status: paymentResult.payment?.status,
          returnCode: paymentResult.payment?.returnCode,
          returnMessage: paymentResult.payment?.returnMessage
        });
        
        // Payment failed - return error but don't save anything
        res.status(400).json({
          error: "Pagamento não autorizado",
          payment: {
            status: paymentResult.payment?.status,
            returnCode: paymentResult.payment?.returnCode,
            returnMessage: paymentResult.payment?.returnMessage,
            paymentId: paymentResult.payment?.paymentId,
            orderId: merchantOrderId
          }
        });
      }
      
    } catch (error: any) {
      console.error("❌ [CHECKOUT-STEP3] Erro geral no checkout:", error);
      
      res.status(500).json({
        error: "Erro interno do servidor",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // CLIENT AUTHENTICATION ROUTES
  
  // Client Registration
  app.post("/api/clients/register", registerLimiter, async (req, res) => {
    try {
      const parsed = insertClientSchema.parse(req.body);
      
      // Check if client already exists
      const existingClient = await storage.getClientByEmail(parsed.email);
      if (existingClient) {
        return res.status(409).json({ error: "Cliente já cadastrado com este email" });
      }
      
      // Hash CPF for authentication (password field contains CPF)
      // Validate CPF is provided
      if (!parsed.password) {
        return res.status(400).json({ error: "CPF é obrigatório" });
      }
      
      // Clean CPF and hash it
      const cpfClean = parsed.password.replace(/\D/g, '');
      const cpfHash = await bcrypt.hash(cpfClean, 12);
      
      // Create client with UUID
      const clientData = {
        ...parsed,
        fullName: parsed.full_name,
        cpfHash: cpfHash,
        id: `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      
      const newClient = await storage.createClient(clientData as any);
      
      // Don't return cpfHash in response (security)
      const { cpfHash: _, ...clientResponse } = newClient;
      
      res.status(201).json({ 
        message: "Cliente cadastrado com sucesso", 
        client: clientResponse 
      });
      
    } catch (error: any) {
      console.error("❌ Error registering client:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: "Dados inválidos", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Client Login
  app.post("/api/clients/login", loginLimiter, async (req, res) => {
    const requestStartTime = performance.now();
    let dbQueryTime = 0;
    let bcryptTime = 0;
    let sessionTime = 0;
    
    try {
      const parsed = clientLoginSchema.parse(req.body);
      
      // Find client by email - MEASURE DB QUERY TIME
      const dbQueryStart = performance.now();
      const client = await storage.getClientByEmail(parsed.email);
      dbQueryTime = performance.now() - dbQueryStart;
      
      if (!client) {
        const totalTime = performance.now() - requestStartTime;
        console.log(`⏱️ [PERFORMANCE-LOGIN] Tempo total: ${totalTime.toFixed(2)}ms (FALHA - Email não encontrado)`, {
          email: sanitizeEmail(parsed.email),
          dbQueryTime: `${dbQueryTime.toFixed(2)}ms`,
          status: 'email_not_found'
        });
        return res.status(401).json({ error: "Email ou senha inválidos" });
      }
      
      // Verify CPF with bcrypt - MEASURE BCRYPT TIME
      let isValidAuth = false;
      const cpfClean = parsed.password.replace(/\D/g, '');
      
      try {
        if (client.cpfHash) {
          // Client has hash - verify with bcrypt
          const bcryptStart = performance.now();
          isValidAuth = await bcrypt.compare(cpfClean, client.cpfHash);
          bcryptTime = performance.now() - bcryptStart;
        } else if (client.cpf) {
          // 🔄 GRADUAL MIGRATION: Client without hash - generate it automatically
          const storedCpfClean = client.cpf.replace(/\D/g, '');
          
          if (cpfClean === storedCpfClean) {
            console.log(`🔄 [MIGRATION] Gerando hash de CPF para cliente legado: ${sanitizeEmail(client.email)}`);
            
            // Generate hash and update client
            const bcryptStart = performance.now();
            const newCpfHash = await bcrypt.hash(cpfClean, 12);
            bcryptTime = performance.now() - bcryptStart;
            
            // Update client with new hash
            await storage.updateClient(client.id, { cpfHash: newCpfHash });
            console.log(`✅ [MIGRATION] Hash de CPF atualizado para cliente: ${client.id}`);
            
            isValidAuth = true;
          }
        }
      } catch (error) {
        console.error("❌ Erro na verificação/migração de CPF:", error);
      }
      
      if (!isValidAuth) {
        const totalTime = performance.now() - requestStartTime;
        console.log(`⏱️ [PERFORMANCE-LOGIN] Tempo total: ${totalTime.toFixed(2)}ms (FALHA - CPF inválido)`, {
          email: sanitizeEmail(parsed.email),
          dbQueryTime: `${dbQueryTime.toFixed(2)}ms`,
          bcryptTime: `${bcryptTime.toFixed(2)}ms`,
          status: 'invalid_cpf'
        });
        return res.status(401).json({ error: "Email ou CPF inválidos" });
      }
      
      // ✅ SECURITY FIX: Regenerate session to prevent session fixation attacks
      const sessionStart = performance.now();
      req.session.regenerate((err) => {
        if (err) {
          console.error("❌ [CLIENT-LOGIN] Erro ao regenerar sessão:", err);
          return res.status(500).json({ error: "Erro ao criar sessão segura" });
        }
        
        // Store client in session
        req.session.client = {
          id: client.id,
          fullName: client.fullName,
          email: client.email
        };
        
        // Save session explicitly
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("❌ [CLIENT-LOGIN] Erro ao salvar sessão:", saveErr);
            return res.status(500).json({ error: "Erro ao salvar sessão" });
          }
          
          sessionTime = performance.now() - sessionStart;
          
          // Don't return cpfHash in response (security)
          const { cpfHash: _, ...clientResponse } = client;
          
          // Calculate total time and log performance metrics
          const totalTime = performance.now() - requestStartTime;
          console.log(`⏱️ [PERFORMANCE-LOGIN] Tempo total: ${totalTime.toFixed(2)}ms`, {
            email: sanitizeEmail(parsed.email),
            dbQueryTime: `${dbQueryTime.toFixed(2)}ms`,
            bcryptTime: `${bcryptTime.toFixed(2)}ms`,
            sessionTime: `${sessionTime.toFixed(2)}ms`,
            status: 'success'
          });
          
          res.json({ 
            message: "Login realizado com sucesso", 
            client: clientResponse 
          });
        });
      });
      
    } catch (error: any) {
      const totalTime = performance.now() - requestStartTime;
      console.error(`❌ [PERFORMANCE-LOGIN] Error during client login (${totalTime.toFixed(2)}ms):`, error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: "Dados inválidos", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Client Logout
  app.post("/api/clients/logout", requireClient, (req, res) => {
    req.session.client = undefined;
    res.json({ message: "Logout realizado com sucesso" });
  });

  // Get Current Client
  app.get("/api/clients/me", requireClient, async (req, res) => {
    const requestStartTime = performance.now();
    let dbQueryTime = 0;
    let sessionCheckTime = 0;
    
    try {
      const sessionCheckStart = performance.now();
      const clientId = req.session.client?.id;
      sessionCheckTime = performance.now() - sessionCheckStart;
      
      if (!clientId) {
        const totalTime = performance.now() - requestStartTime;
        console.log(`⏱️ [PERFORMANCE-ME] Tempo total: ${totalTime.toFixed(2)}ms (FALHA - Sem ID na sessão)`, {
          sessionCheckTime: `${sessionCheckTime.toFixed(2)}ms`,
          status: 'no_session_id'
        });
        return res.status(401).json({ error: "Cliente não autenticado" });
      }

      // Fetch complete client data from database - MEASURE DB QUERY TIME
      const dbQueryStart = performance.now();
      const client = await storage.getClientById(clientId);
      dbQueryTime = performance.now() - dbQueryStart;
      
      if (!client) {
        const totalTime = performance.now() - requestStartTime;
        console.log(`⏱️ [PERFORMANCE-ME] Tempo total: ${totalTime.toFixed(2)}ms (FALHA - Cliente não encontrado)`, {
          clientId,
          sessionCheckTime: `${sessionCheckTime.toFixed(2)}ms`,
          dbQueryTime: `${dbQueryTime.toFixed(2)}ms`,
          status: 'client_not_found'
        });
        return res.status(404).json({ error: "Cliente não encontrado" });
      }

      // Remove password field from response
      const { cpfHash: _, ...clientWithoutPassword } = client;

      // Calculate total time and log performance metrics
      const totalTime = performance.now() - requestStartTime;
      console.log(`⏱️ [PERFORMANCE-ME] Tempo total: ${totalTime.toFixed(2)}ms`, {
        clientId,
        sessionCheckTime: `${sessionCheckTime.toFixed(2)}ms`,
        dbQueryTime: `${dbQueryTime.toFixed(2)}ms`,
        status: 'success'
      });

      res.json({ 
        client: clientWithoutPassword,
        message: "Cliente autenticado"
      });
    } catch (error) {
      const totalTime = performance.now() - requestStartTime;
      console.error(`❌ [PERFORMANCE-ME] Error fetching client data (${totalTime.toFixed(2)}ms):`, error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Client profile image upload to Supabase Storage
  app.post("/api/clients/profile/image", requireClient, async (req, res) => {
    try {
      const clientId = req.session.client?.id;
      const { image } = req.body;
      
      if (!clientId) {
        return res.status(401).json({ error: "Cliente não autenticado" });
      }

      if (!image) {
        return res.status(400).json({ error: "Imagem não fornecida" });
      }

      // Converter base64 para buffer
      const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      // Detectar tipo MIME (assumir JPEG se não detectado)
      let mimeType = 'image/jpeg';
      if (image.startsWith('data:image/png')) {
        mimeType = 'image/png';
      }

      // Upload para Supabase Storage usando o SupabaseStorageService
      const uploadResult = await supabaseStorage.uploadClientImage(
        clientId, 
        imageBuffer, 
        mimeType,
        { maxWidth: 800, maxHeight: 600, quality: 85 }
      );

      if (!uploadResult.success) {
        return res.status(500).json({ 
          error: uploadResult.error || "Erro ao fazer upload da imagem" 
        });
      }

      // Atualizar o cliente com a nova URL da imagem
      const updatedClient = await storage.updateClient(clientId, { 
        imageUrl: uploadResult.publicUrl 
      });

      if (!updatedClient) {
        return res.status(404).json({ error: "Cliente não encontrado" });
      }
      
      // Remove password field from response
      const { cpfHash: _, ...clientWithoutPassword } = updatedClient;
      
      res.json({ 
        client: clientWithoutPassword,
        message: "Imagem do perfil atualizada com sucesso",
        imageUrl: uploadResult.publicUrl
      });
      
    } catch (error) {
      console.error("❌ Error uploading client profile image:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Get Client's Pets
  app.get("/api/clients/pets", requireClient, async (req, res) => {
    try {
      const clientId = req.session.client?.id;
      
      if (!clientId) {
        return res.status(401).json({ error: "Cliente não autenticado" });
      }

      // Get pets with their active plan information
      const petsWithPlans: any[] = [];
      const pets = await storage.getPetsByClientId(clientId);
      const now = new Date();
      
      // For each pet, check for active contracts and plans
      for (const pet of pets) {
        let petWithPlan = { ...pet };
        let hasOverdueInstallments = false;
        
        try {
          // Get all contracts for this pet
          const petContracts = await storage.getContractsByPetId(pet.id);
          const activeContract = petContracts.find(contract => contract.status === 'active');
          
          if (activeContract) {
            // Get plan information for the active contract
            const plan = await storage.getPlan(activeContract.planId);
            if (plan) {
              (petWithPlan as any).plan = {
                id: plan.id,
                name: plan.name,
                basePrice: plan.basePrice,
                description: plan.description,
                features: plan.features
              };
            }
            
            // Check if this pet has overdue installments
            const contractInstallments = await storage.getContractInstallmentsByContractId(activeContract.id);
            
            for (const inst of contractInstallments) {
              const dueDate = new Date(inst.dueDate);
              
              // Check if installment is overdue (status is 'overdue' or 'pending' but past due date)
              if (inst.status === 'overdue' || (inst.status === 'pending' && dueDate < now)) {
                hasOverdueInstallments = true;
                break;
              }
            }
          }
          
          // Add overdue status to pet data
          (petWithPlan as any).hasOverdueInstallments = hasOverdueInstallments;
          
        } catch (error) {
          console.error(`❌ Error fetching plan for pet ${pet.id}:`, error);
          // Continue processing other pets even if one fails
          (petWithPlan as any).hasOverdueInstallments = false;
        }
        
        petsWithPlans.push(petWithPlan);
      }
      
      res.json({ 
        pets: petsWithPlans || [],
        message: petsWithPlans?.length ? `${petsWithPlans.length} pets encontrados` : "Nenhum pet cadastrado"
      });
      
    } catch (error) {
      console.error("❌ Error fetching client pets:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Update Pet Data
  app.put("/api/clients/pets/:petId", requireClient, async (req, res) => {
    try {
      const clientId = req.session.client?.id;
      const petId = req.params.petId;
      
      if (!clientId) {
        return res.status(401).json({ error: "Cliente não autenticado" });
      }

      // Verificar se o pet pertence ao cliente
      const existingPet = await storage.getPet(petId);
      if (!existingPet) {
        return res.status(404).json({ error: "Pet não encontrado" });
      }
      
      if (existingPet.clientId !== clientId) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      // Validar dados de entrada
      const validationResult = updatePetSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Dados inválidos",
          details: validationResult.error.errors
        });
      }

      const updateData = validationResult.data;
      
      // Remover campos que não devem ser alterados
      delete updateData.name;
      delete updateData.species;
      
      // Atualizar pet
      const updatedPet = await storage.updatePet(petId, updateData);
      
      res.json({ 
        pet: updatedPet,
        message: "Pet atualizado com sucesso"
      });
      
    } catch (error) {
      console.error("❌ Error updating pet:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Pet image upload to Supabase Storage
  app.post("/api/clients/pets/:petId/image", requireClient, async (req, res) => {
    try {
      const clientId = req.session.client?.id;
      const petId = req.params.petId;
      const { image } = req.body;
      
      if (!clientId) {
        return res.status(401).json({ error: "Cliente não autenticado" });
      }

      if (!image) {
        return res.status(400).json({ error: "Imagem não fornecida" });
      }

      // Verificar se o pet pertence ao cliente
      const existingPet = await storage.getPet(petId);
      if (!existingPet) {
        return res.status(404).json({ error: "Pet não encontrado" });
      }
      
      if (existingPet.clientId !== clientId) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      // Converter base64 para buffer
      const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      // Detectar tipo MIME (assumir JPEG se não detectado)
      let mimeType = 'image/jpeg';
      if (image.startsWith('data:image/png')) {
        mimeType = 'image/png';
      }

      // Upload para Supabase Storage usando o SupabaseStorageService
      const uploadResult = await supabaseStorage.uploadPetImage(
        petId, 
        imageBuffer, 
        mimeType,
        { maxWidth: 800, maxHeight: 600, quality: 85 }
      );

      if (!uploadResult.success) {
        return res.status(500).json({ 
          error: uploadResult.error || "Erro ao fazer upload da imagem" 
        });
      }

      // Atualizar o pet com a nova URL da imagem
      const updatedPet = await storage.updatePet(petId, { 
        imageUrl: uploadResult.publicUrl 
      });
      
      res.json({ 
        pet: updatedPet,
        message: "Imagem do pet atualizada com sucesso",
        imageUrl: uploadResult.publicUrl
      });
      
    } catch (error) {
      console.error("❌ Error uploading pet image:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Get Pet's Guides
  // Delete Pet
  app.delete("/api/clients/pets/:petId", requireClient, async (req, res) => {
    try {
      const clientId = req.session.client?.id;
      const petId = req.params.petId;
      if (!clientId) return res.status(401).json({ error: "Cliente não autenticado" });
      const pet = await storage.getPet(petId);
      if (!pet) return res.status(404).json({ error: "Pet não encontrado" });
      if (pet.clientId !== clientId) return res.status(403).json({ error: "Acesso negado" });
      await storage.deletePet(petId);
      return res.json({ success: true, message: "Pet excluído com sucesso" });
    } catch (error) {
      console.error("❌ Error deleting pet:", error);
      return res.status(500).json({ error: "Erro ao excluir pet" });
    }
  });

  // Get Pet's Guides
  app.get("/api/clients/pets/:petId/guides", requireClient, async (req, res) => {
    try {
      const clientId = req.session.client?.id;
      const petId = req.params.petId;
      
      if (!clientId) {
        return res.status(401).json({ error: "Cliente não autenticado" });
      }

      // Verificar se o pet pertence ao cliente
      const existingPet = await storage.getPet(petId);
      if (!existingPet) {
        return res.status(404).json({ error: "Pet não encontrado" });
      }
      
      if (existingPet.clientId !== clientId) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      // Por enquanto, retornar array vazio pois não há guias específicas por pet
      // Em futuras implementações, isso pode ser expandido para guias personalizadas
      const guides = [];
      
      res.json({ 
        guides: guides,
        message: guides.length === 0 ? "Nenhuma guia encontrada para este pet" : "Guias carregadas com sucesso"
      });
      
    } catch (error) {
      console.error("❌ Error fetching pet guides:", error);
      res.status(500).json({ error: "Erro ao carregar guias" });
    }
  });

  // Protected Client Route (example)
  app.get("/api/clients/dashboard", requireClient, async (req, res) => {
    try {
      const clientData = req.session.client;
      res.json({ 
        message: `Bem-vindo à área do cliente, ${clientData.fullName}!`,
        client: clientData
      });
    } catch (error) {
      console.error("❌ Error accessing client dashboard:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Get contracts for authenticated client
  app.get("/api/clients/contracts", requireClient, async (req, res) => {
    try {
      const clientId = req.session.client?.id;
      
      if (!clientId) {
        return res.status(401).json({ error: "Cliente não autenticado" });
      }

      // Get all contracts for the client
      const contracts = await storage.getContractsByClientId(clientId);
      
      if (!contracts || contracts.length === 0) {
        return res.json({ 
          contracts: [],
          message: "Nenhum contrato encontrado"
        });
      }

      // ✅ OTIMIZAÇÃO: Buscar pets e plans em batch para evitar N+1 queries
      const uniquePetIds = [...new Set(contracts.map(c => c.petId))];
      const uniquePlanIds = [...new Set(contracts.map(c => c.planId))];
      
      // Buscar todos os pets e plans de uma vez
      const petsPromises = uniquePetIds.map(id => storage.getPet(id));
      const plansPromises = uniquePlanIds.map(id => storage.getPlan(id));
      
      const [pets, plans] = await Promise.all([
        Promise.all(petsPromises),
        Promise.all(plansPromises)
      ]);
      
      // Criar maps para lookup rápido
      const petsMap = new Map(pets.filter((p): p is NonNullable<typeof p> => p !== null && p !== undefined).map(p => [p.id, p]));
      const plansMap = new Map(plans.filter((p): p is NonNullable<typeof p> => p !== null && p !== undefined).map(p => [p.id, p]));
      
      // Build contracts list with pet and plan information using payment status evaluation
      const contractsWithDetails = contracts.map(contract => {
        const pet = petsMap.get(contract.petId);
        const plan = plansMap.get(contract.planId);
        
        // Calculate actual payment status
        const paymentStatus = PaymentStatusService.evaluateContractPaymentStatus(contract);
        
        return {
          id: contract.id,
          contractNumber: contract.contractNumber,
          status: paymentStatus.calculatedStatus,
          originalStatus: contract.status,
          startDate: contract.startDate,
          endDate: contract.endDate,
          monthlyAmount: contract.monthlyAmount,
          annualAmount: contract.annualAmount,
          billingPeriod: contract.billingPeriod,
          planId: contract.planId,
          petId: contract.petId,
          planName: plan?.name || 'Plano não encontrado',
          petName: pet?.name || 'Pet não encontrado',
          isOverdue: paymentStatus.isOverdue,
          daysPastDue: paymentStatus.daysPastDue,
          nextDueDate: paymentStatus.nextDueDate ? paymentStatus.nextDueDate.toISOString() : null,
          gracePeriodEnds: paymentStatus.gracePeriodEnds ? paymentStatus.gracePeriodEnds.toISOString() : null,
          statusReason: paymentStatus.statusReason,
          statusDescription: PaymentStatusService.getStatusDescription(paymentStatus),
          actionRequired: PaymentStatusService.getActionRequired(paymentStatus),
          expirationDate: paymentStatus.expirationDate ? paymentStatus.expirationDate.toISOString() : null,
          daysRemaining: paymentStatus.daysRemaining,
          isExpired: paymentStatus.isExpired
        };
      });

      // Sort by date (newest first)
      contractsWithDetails.sort((a, b) => {
        const dateA = new Date(a.startDate);
        const dateB = new Date(b.startDate);
        return dateB.getTime() - dateA.getTime();
      });

      res.json({
        contracts: contractsWithDetails,
        message: `${contractsWithDetails.length} contrato(s) encontrado(s)`
      });
      
    } catch (error) {
      console.error("❌ Error fetching contracts:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Get contract renewal data for authenticated client
  app.get("/api/contracts/:contractId/renewal", requireClient, async (req, res) => {
    try {
      const clientId = req.session.client?.id;
      const contractId = req.params.contractId;
      
      if (!clientId) {
        return res.status(401).json({ error: "Cliente não autenticado" });
      }

      if (!contractId) {
        return res.status(400).json({ error: "ID do contrato é obrigatório" });
      }

      // Get the specific contract
      const contract = await storage.getContract(contractId);
      
      if (!contract) {
        return res.status(404).json({ error: "Contrato não encontrado" });
      }

      // Verify contract belongs to the authenticated client
      if (contract.clientId !== clientId) {
        return res.status(403).json({ error: "Acesso negado ao contrato" });
      }

      // Get pet and plan information
      const pet = await storage.getPet(contract.petId);
      const plan = await storage.getPlan(contract.planId);
      const client = await storage.getClientById(clientId);
      
      if (!client) {
        return res.status(404).json({ error: "Cliente não encontrado" });
      }

      // Calculate payment status
      const paymentStatus = PaymentStatusService.evaluateContractPaymentStatus(contract);
      
      res.json({
        success: true,
        renewalData: {
          contractId: contract.id,
          contractNumber: contract.contractNumber,
          amount: parseFloat(contract.monthlyAmount) || 0,
          billingPeriod: contract.billingPeriod || 'monthly',
          client: {
            id: client.id,
            name: client.fullName,
            email: client.email,
            cpf: client.cpf,
            phone: client.phone,
            address: client.address,
            number: client.number,
            complement: client.complement,
            district: client.district,
            city: client.city,
            state: client.state,
            zipCode: (client as any).zipCode || client.cep
          },
          pet: {
            id: pet?.id,
            name: pet?.name || 'Pet não encontrado',
            species: pet?.species,
            breed: pet?.breed,
            age: pet?.age,
            weight: pet?.weight
          },
          plan: {
            id: plan?.id,
            name: plan?.name || 'Plano não encontrado',
            price: parseFloat(contract.monthlyAmount) || 0
          },
          paymentStatus: {
            status: paymentStatus.calculatedStatus,
            isExpired: paymentStatus.isExpired,
            daysRemaining: paymentStatus.daysRemaining,
            expirationDate: paymentStatus.expirationDate ? paymentStatus.expirationDate.toISOString() : null
          }
        }
      });
      
    } catch (error) {
      console.error("❌ Error fetching contract renewal data:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Get payment history for authenticated client
  app.get("/api/clients/payment-history", requireClient, async (req, res) => {
    try {
      const clientId = req.session.client?.id;
      
      if (!clientId) {
        return res.status(401).json({ error: "Cliente não autenticado" });
      }

      // Get all contracts for the client with payment data
      const contracts = await storage.getContractsByClientId(clientId);
      
      if (!contracts || contracts.length === 0) {
        return res.json({ 
          paymentHistory: [],
          message: "Nenhum histórico de pagamento encontrado"
        });
      }

      // Build payment history with detailed information
      const paymentHistoryWithDetails: any[] = [];
      for (const contract of contracts) {
        // Get pet and plan information
        const pet = await storage.getPet(contract.petId);
        const plan = await storage.getPlan(contract.planId);
        
        // Calculate actual payment status using PaymentStatusService
        const paymentStatusResult = PaymentStatusService.evaluateContractPaymentStatus(contract);
        const paymentStatus = paymentStatusResult.calculatedStatus;
        
        // Only include payments that were actually paid (successful payments)
        // Skip contracts that were generated but never paid
        const hasValidPayment = contract.receivedDate && contract.returnCode && ['00', '0'].includes(contract.returnCode);
        
        if (!hasValidPayment) {
          continue; // Skip unpaid/unsuccessful payments
        }
        
        const paymentHistoryItem: any = {
          id: contract.id,
          contractNumber: contract.contractNumber,
          petName: pet?.name || 'Pet não encontrado',
          planName: plan?.name || 'Plano não encontrado',
          amount: parseFloat(contract.monthlyAmount) || 0,
          paymentMethod: contract.paymentMethod || 'Não informado',
          status: paymentStatus,
          paymentId: contract.cieloPaymentId || '',
          // Cielo payment data
          proofOfSale: contract.proofOfSale || '', // NSU
          authorizationCode: contract.authorizationCode || '',
          tid: contract.tid || '',
          receivedDate: contract.receivedDate ? contract.receivedDate.toISOString() : '',
          returnCode: contract.returnCode || '',
          returnMessage: contract.returnMessage || '',
          // PIX specific data
          pixQrCode: contract.pixQrCode || '',
          pixCode: contract.pixCode || ''
        };

        paymentHistoryWithDetails.push(paymentHistoryItem);
      }

      // Sort by received date (newest first), fallback to start date
      paymentHistoryWithDetails.sort((a, b) => {
        const dateA = new Date(a.receivedDate || contracts.find(c => c.id === a.id)?.startDate || 0);
        const dateB = new Date(b.receivedDate || contracts.find(c => c.id === b.id)?.startDate || 0);
        return dateB.getTime() - dateA.getTime();
      });

      res.json({
        paymentHistory: paymentHistoryWithDetails,
        message: `${paymentHistoryWithDetails.length} histórico(s) de pagamento encontrado(s)`
      });
      
    } catch (error) {
      console.error("❌ Error fetching payment history:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Get surveys for authenticated client
  app.get("/api/clients/surveys", requireClient, async (req, res) => {
    try {
      const clientId = req.session.client?.id;
      
      if (!clientId) {
        return res.status(401).json({ error: "Cliente não autenticado" });
      }

      // Get all surveys for the client
      const surveys = await storage.getSatisfactionSurveysByClientId(clientId);
      
      if (!surveys || surveys.length === 0) {
        return res.json({ 
          surveys: [],
          message: "Nenhuma pesquisa encontrada"
        });
      }

      // Build surveys list with additional information
      const surveysWithDetails: any[] = [];
      for (const survey of surveys) {
        let additionalInfo: any = {};
        
        // Get contract info if survey is related to a contract
        if (survey.contractId) {
          const contract = await storage.getContract(survey.contractId);
          if (contract) {
            additionalInfo = { contractNumber: contract.contractNumber };
          }
        }
        
        // Get service info if survey is related to service history
        if (survey.serviceHistoryId) {
          // Get service history details
          additionalInfo = { ...additionalInfo, serviceName: "Atendimento Veterinário" };
        }
        
        // Get protocol info if survey is related to a protocol
        if (survey.protocolId) {
          const protocol = await storage.getProtocol(survey.protocolId);
          if (protocol) {
            additionalInfo = { ...additionalInfo, protocolSubject: protocol.subject };
          }
        }
        
        surveysWithDetails.push({
          id: survey.id,
          contractId: survey.contractId,
          serviceHistoryId: survey.serviceHistoryId,
          protocolId: survey.protocolId,
          rating: survey.rating,
          feedback: survey.feedback,
          suggestions: survey.suggestions,
          wouldRecommend: survey.wouldRecommend,
          respondedAt: survey.respondedAt,
          createdAt: survey.createdAt,
          ...additionalInfo
        });
      }

      // Sort by date (newest first)
      surveysWithDetails.sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });

      res.json({
        surveys: surveysWithDetails,
        message: `${surveysWithDetails.length} pesquisa(s) encontrada(s)`
      });
      
    } catch (error) {
      console.error("❌ Error fetching surveys:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Submit survey response for authenticated client
  app.post("/api/clients/surveys/:surveyId/response", requireClient, async (req, res) => {
    try {
      const clientId = req.session.client?.id;
      const surveyId = req.params.surveyId;
      
      if (!clientId) {
        return res.status(401).json({ error: "Cliente não autenticado" });
      }

      // Verify survey belongs to client
      const existingSurvey = await storage.getSatisfactionSurvey(surveyId);
      if (!existingSurvey) {
        return res.status(404).json({ error: "Pesquisa não encontrada" });
      }
      
      if (existingSurvey.clientId !== clientId) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      // Validate input
      const { rating, feedback, suggestions, wouldRecommend } = req.body;
      
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Avaliação deve ser entre 1 e 5 estrelas" });
      }

      // Update survey with response
      const updateData = {
        rating: parseInt(rating),
        feedback: feedback || null,
        suggestions: suggestions || null,
        wouldRecommend: wouldRecommend !== undefined ? Boolean(wouldRecommend) : null,
        respondedAt: new Date()
      };
      
      // Note: updateSatisfactionSurvey method doesn't exist in storage interface
      // We'll create and return the updated survey data
      const updatedSurvey = { ...existingSurvey, ...updateData };
      
      res.json({ 
        survey: updatedSurvey,
        message: "Resposta enviada com sucesso"
      });
      
    } catch (error) {
      console.error("❌ Error submitting survey response:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Create a new satisfaction survey for authenticated client
  app.post("/api/clients/surveys", requireClient, async (req, res) => {
    try {
      const clientId = req.session.client?.id;
      
      if (!clientId) {
        return res.status(401).json({ error: "Cliente não autenticado" });
      }

      const { rating, feedback, suggestions, wouldRecommend } = req.body;
      
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Avaliação de 1 a 5 estrelas é obrigatória" });
      }

      // Create new satisfaction survey
      const newSurvey = await storage.createSatisfactionSurvey({
        clientId,
        rating: parseInt(rating),
        feedback: feedback || null,
        suggestions: suggestions || null,
        wouldRecommend: wouldRecommend !== undefined ? Boolean(wouldRecommend) : null
      });

      res.json({ 
        survey: newSurvey,
        message: "Pesquisa de satisfação enviada com sucesso! Obrigado pelo seu feedback."
      });
      
    } catch (error) {
      console.error("❌ Error creating satisfaction survey:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Get procedures with coparticipation values for authenticated client
  app.get("/api/clients/procedures", requireClient, async (req, res) => {
    try {
      const clientId = req.session.client?.id;
      
      if (!clientId) {
        return res.status(401).json({ error: "Cliente não autenticado" });
      }

      // Get planId from query params for filtering
      const planId = req.query.planId as string;

      // Get procedures with real coparticipation data from database
      const procedures = await storage.getProceduresWithCoparticipation(planId);
      
      if (!procedures || procedures.length === 0) {
        return res.json({ 
          procedures: [],
          message: planId ? "Nenhum procedimento encontrado para este plano" : "Nenhum procedimento encontrado"
        });
      }

      // Format procedures with real database information
      const proceduresWithDetails = procedures.map(procedure => {
        // Use real coparticipation value from database, format to currency string
        const formatCoparticipationValue = (value: any): string => {
          if (!value || value === 0 || value === "0" || value === "0.00") {
            return "0.00";
          }
          // Convert from centavos to reais (value comes as integers: 2000 = R$ 20.00)
          const valueInReais = Number(value) / 100;
          return valueInReais.toFixed(2);
        };

        // Use real coverage percentage from database
        const formatCoveragePercentage = (value: any): number => {
          if (!value || value === 0) {
            return 0;
          }
          return Number(value);
        };

        return {
          id: procedure.id,
          name: procedure.name,
          description: procedure.description || 'Procedimento veterinário especializado',
          coparticipationValue: formatCoparticipationValue(procedure.coparticipacao),
          coveragePercentage: formatCoveragePercentage(100), // Default coverage percentage
          isActive: procedure.is_active,
          createdAt: procedure.created_at,
          isIncluded: procedure.is_included,
          waitingPeriodDays: 0, // Default waiting period
          planId: procedure.plan_id
        };
      });

      // Sort by name
      proceduresWithDetails.sort((a, b) => {
        return a.name.localeCompare(b.name);
      });

      res.json({
        procedures: proceduresWithDetails,
        message: `${proceduresWithDetails.length} procedimento(s) encontrado(s)`,
        filteredByPlan: !!planId
      });
      
    } catch (error) {
      console.error("❌ Error fetching procedures:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Get active plans for filter dropdown
  app.get("/api/clients/plans", requireClient, async (req, res) => {
    try {
      const clientId = req.session.client?.id;
      
      if (!clientId) {
        return res.status(401).json({ error: "Cliente não autenticado" });
      }

      // Get all active plans
      const plans = await storage.getAllActivePlans();
      
      if (!plans || plans.length === 0) {
        return res.json({ 
          plans: [],
          message: "Nenhum plano encontrado"
        });
      }

      // Format plans for dropdown
      const plansForFilter = plans.map(plan => ({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        isActive: plan.isActive
      }));

      res.json({
        plans: plansForFilter,
        message: `${plansForFilter.length} plano(s) encontrado(s)`
      });
      
    } catch (error) {
      console.error("❌ Error fetching plans:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });


  // Update Client Profile
  app.put("/api/clients/profile", requireClient, async (req, res) => {
    try {
      const clientId = req.session.client?.id;
      
      if (!clientId) {
        return res.status(401).json({ error: "Cliente não autenticado" });
      }

      // Get current client data
      const currentClient = await storage.getClientById(clientId);
      if (!currentClient) {
        return res.status(404).json({ error: "Cliente não encontrado" });
      }

      // Extract fields that can be updated
      const { full_name, email, phone, address, number, complement, district, state, city, cep } = req.body;
      
      // Prepare update data (only allow certain fields to be updated)
      const updateData: any = {};
      if (full_name !== undefined) updateData.fullName = full_name;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (address !== undefined) updateData.address = address;
      if (number !== undefined) updateData.number = number;
      if (complement !== undefined) updateData.complement = complement;
      if (district !== undefined) updateData.district = district;
      if (state !== undefined) updateData.state = state;
      if (city !== undefined) updateData.city = city;
      if (cep !== undefined) updateData.cep = cep;

      // Update client
      const updatedClient = await storage.updateClient(clientId, updateData);
      
      if (!updatedClient) {
        return res.status(500).json({ error: "Erro ao atualizar dados do cliente" });
      }

      // Update session data
      req.session.client = {
        id: updatedClient.id,
        fullName: updatedClient.fullName,
        email: updatedClient.email
      };

      // Don't return password in response
      const { cpfHash: _, ...clientResponse } = updatedClient;
      
      res.json({ 
        client: clientResponse,
        message: "Dados do cliente atualizados com sucesso"
      });
      
    } catch (error) {
      console.error("❌ Error updating client profile:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Client profile image upload removed - images now served from Supabase Storage only

  // ==== SELLER AUTHENTICATION ROUTES ====
  
  // Seller Login (email + CPF)
  app.post("/api/sellers/login", loginLimiter, async (req, res) => {
    try {
      const { sellerLoginSchema } = await import("../shared/schema.js");
      const parsed = sellerLoginSchema.parse(req.body);
      
      // Find seller by email
      const seller = await storage.getSellerByEmail(parsed.email);
      
      if (!seller) {
        return res.status(401).json({ error: "Email ou CPF inválidos" });
      }
      
      // Verify CPF with bcrypt (password field contains CPF)
      const cpfClean = parsed.password.replace(/\D/g, '');
      const isValidAuth = await bcrypt.compare(cpfClean, seller.cpfHash);
      
      if (!isValidAuth) {
        return res.status(401).json({ error: "Email ou CPF inválidos" });
      }
      
      // Check if seller is active
      if (!seller.isActive) {
        return res.status(403).json({ error: "Sua conta está inativa. Entre em contato com o administrador." });
      }
      
      // Regenerate session to prevent session fixation attacks
      req.session.regenerate((err) => {
        if (err) {
          console.error("❌ [SELLER-LOGIN] Erro ao regenerar sessão:", err);
          return res.status(500).json({ error: "Erro ao criar sessão segura" });
        }
        
        // Store seller in session
        (req.session as any).seller = {
          id: seller.id,
          fullName: seller.fullName,
          email: seller.email,
          whitelabelUrl: seller.whitelabelUrl
        };
        
        // Save session explicitly
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("❌ [SELLER-LOGIN] Erro ao salvar sessão:", saveErr);
            return res.status(500).json({ error: "Erro ao salvar sessão" });
          }
          
          // Don't return cpfHash in response (security)
          const { cpfHash: _, ...sellerResponse } = seller;
          
          console.log("✅ [SELLER-LOGIN] Seller logged in:", seller.email);
          res.json({ 
            message: "Login realizado com sucesso", 
            seller: sellerResponse 
          });
        });
      });
      
    } catch (error: any) {
      console.error("❌ [SELLER-LOGIN] Error during seller login:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: "Dados inválidos", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Seller Logout
  app.post("/api/sellers/logout", (req, res) => {
    (req.session as any).seller = undefined;
    res.json({ message: "Logout realizado com sucesso" });
  });

  // Get Current Seller
  app.get("/api/sellers/me", async (req, res) => {
    try {
      const sellerId = (req.session as any).seller?.id;
      
      if (!sellerId) {
        return res.status(401).json({ error: "Vendedor não autenticado" });
      }
      
      const seller = await storage.getSellerById(sellerId);
      
      if (!seller) {
        return res.status(404).json({ error: "Vendedor não encontrado" });
      }
      
      // Check if seller is still active
      if (!seller.isActive) {
        // Clear session if seller was deactivated
        (req.session as any).seller = undefined;
        return res.status(403).json({ error: "Sua conta está inativa. Entre em contato com o administrador." });
      }

      // Remove cpfHash from response
      const { cpfHash: _, ...sellerWithoutPassword } = seller;

      res.json({ 
        seller: sellerWithoutPassword,
        message: "Vendedor autenticado"
      });
    } catch (error) {
      console.error("❌ [SELLER-ME] Error fetching seller data:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // CUSTOMER AREA - 9 COMPREHENSIVE FUNCTIONALITIES

  // 1. View Contract
  app.get("/api/customer/contract", requireClient, async (req, res) => {
    try {
      const clientId = req.session.client?.id;
      const contracts = await storage.getContractsByClientId(clientId);
      
      if (!contracts || contracts.length === 0) {
        return res.status(404).json({ error: "Nenhum contrato encontrado" });
      }

      // Get the most recent active contract
      const activeContract = contracts.find(c => c.status === 'active') || contracts[0];
      
      res.json({
        contract: activeContract,
        message: "Contrato recuperado com sucesso"
      });
      
    } catch (error) {
      console.error("❌ Error fetching contract:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // 2. View Subscribed Plan (with/without co-participation)
  app.get("/api/customer/plan", requireClient, async (req, res) => {
    try {
      const clientId = req.session.client?.id;
      const contracts = await storage.getContractsByClientId(clientId);
      
      if (!contracts || contracts.length === 0) {
        return res.status(404).json({ error: "Nenhum plano contratado encontrado" });
      }

      const activeContract = contracts.find(c => c.status === 'active') || contracts[0];
      const plan = await storage.getPlan(activeContract.planId);
      
      res.json({
        plan: {
          ...plan,
          has_coparticipation: activeContract.hasCoparticipation,
          coparticipation_percentage: activeContract.hasCoparticipation ? 100 : 0,
          monthly_value: activeContract.monthlyAmount,
          contract_date: activeContract.createdAt
        },
        message: "Plano recuperado com sucesso"
      });
      
    } catch (error) {
      console.error("❌ Error fetching plan:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // 3. Check Included Services in Plan
  app.get("/api/customer/services", requireClient, async (req, res) => {
    try {
      const clientId = req.session.client?.id;
      const contracts = await storage.getContractsByClientId(clientId);
      
      if (!contracts || contracts.length === 0) {
        return res.status(404).json({ error: "Nenhum contrato encontrado" });
      }

      const activeContract = contracts.find(c => c.status === 'active') || contracts[0];
      const planProcedures = await storage.getPlanProcedures(activeContract.planId);
      
      // Get procedure details for each included service
      const services = await Promise.all(
        planProcedures.map(async (pp) => {
          const procedure = await storage.getProcedure(pp.procedureId);
          return {
            ...procedure,
            coverage_percentage: 100, // Default coverage
            limit_per_year: null,
            requires_authorization: false
          };
        })
      );
      
      res.json({
        services,
        total_services: services.length,
        message: "Serviços inclusos recuperados com sucesso"
      });
      
    } catch (error) {
      console.error("❌ Error fetching services:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // 4. Service History and Consumption
  app.get("/api/customer/history", requireClient, async (req, res) => {
    try {
      const clientId = req.session.client?.id;
      const { year, procedure_id } = req.query;
      
      const pets = await storage.getPetsByClientId(clientId);
      const petIds = pets.map(p => p.id);
      
      // Get service history for each pet and flatten the results
      const historyPromises = petIds.map(petId => storage.getServiceHistoryByPetId(petId));
      const historyArrays = await Promise.all(historyPromises);
      let history = historyArrays.flat();
      
      // Filter by year if provided
      if (year) {
        const targetYear = parseInt(year as string);
        history = history.filter(h => new Date(h.serviceDate).getFullYear() === targetYear);
      }
      
      // Filter by procedure if provided
      if (procedure_id) {
        history = history.filter(h => h.procedureId === procedure_id);
      }
      
      // Calculate consumption statistics
      const consumption = history.reduce((acc, service) => {
        const procedureId = service.procedureId;
        if (!acc[procedureId]) {
          acc[procedureId] = {
            procedure_id: procedureId,
            procedure_name: 'N/A',
            total_uses: 0,
            total_cost: 0,
            total_coverage: 0,
            total_coparticipation: 0
          };
        }
        acc[procedureId].total_uses++;
        acc[procedureId].total_cost += parseFloat(service.totalAmount);
        acc[procedureId].total_coverage += parseFloat(service.coverageAmount);
        acc[procedureId].total_coparticipation += parseFloat(service.coparticipationAmount);
        return acc;
      }, {} as any);
      
      res.json({
        history,
        consumption: Object.values(consumption),
        summary: {
          total_services: history.length,
          total_cost: history.reduce((sum, h) => sum + parseFloat(h.totalAmount), 0),
          total_coverage: history.reduce((sum, h) => sum + parseFloat(h.coverageAmount), 0),
          total_coparticipation: history.reduce((sum, h) => sum + parseFloat(h.coparticipationAmount), 0)
        },
        message: "Histórico recuperado com sucesso"
      });
      
    } catch (error) {
      console.error("❌ Error fetching service history:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });




  // 6. Check Out-of-Coverage Costs
  app.get("/api/customer/out-of-coverage", requireClient, async (req, res) => {
    try {
      // Get all procedures not covered by any plan (or procedures with 0% coverage)
      const allProcedures = await storage.getAllProcedures();
      
      const outOfCoverageProcedures = allProcedures;
      
      const categorizedProcedures = outOfCoverageProcedures.reduce((acc, procedure) => {
        const cat = procedure.category || 'Outros';
        if (!acc[cat]) {
          acc[cat] = [];
        }
        acc[cat].push({
          id: procedure.id,
          name: procedure.name,
          description: procedure.description,
          base_cost: 0, // Default value since coparticipationValue doesn't exist
          estimated_cost: 0, // Default value
          requires_authorization: true // Usually out-of-coverage requires authorization
        });
        return acc;
      }, {} as any);
      
      res.json({
        out_of_coverage_procedures: categorizedProcedures,
        categories: Object.keys(categorizedProcedures),
        total_procedures: outOfCoverageProcedures.length,
        message: "Procedimentos fora da cobertura recuperados com sucesso"
      });
      
    } catch (error) {
      console.error("❌ Error fetching out-of-coverage procedures:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // 7. Request Plan Change
  app.post("/api/customer/plan-change", requireClient, async (req, res) => {
    try {
      const clientId = req.session.client?.id;
      const { new_plan_id, reason, requested_change_date } = req.body;
      
      if (!new_plan_id || !reason) {
        return res.status(400).json({ error: "Plano desejado e motivo são obrigatórios" });
      }
      
      // Verify the new plan exists
      const newPlan = await storage.getPlan(new_plan_id);
      if (!newPlan) {
        return res.status(404).json({ error: "Plano solicitado não encontrado" });
      }
      
      // Create a protocol for plan change request
      const protocolData = {
        clientId: clientId,
        type: 'plan_change' as const,
        subject: `Solicitação de mudança de plano - ${newPlan.name}`,
        description: `Cliente solicitou mudança para o plano: ${newPlan.name}\nMotivo: ${reason}\nData solicitada: ${requested_change_date || 'O mais breve possível'}`,
        status: 'open' as const,
        priority: 'medium' as const
      };
      
      const protocol = await storage.createProtocol(protocolData as any);
      
      res.status(201).json({
        protocol,
        new_plan: newPlan,
        message: "Solicitação de mudança de plano enviada com sucesso. Você receberá um retorno em até 2 dias úteis."
      });
      
    } catch (error) {
      console.error("❌ Error creating plan change request:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // 8. Open Support Protocols
  app.post("/api/customer/protocols", requireClient, async (req, res) => {
    try {
      const clientId = req.session.client?.id;
      const { type, subject, description, priority } = req.body;
      
      if (!type || !subject || !description) {
        return res.status(400).json({ error: "Tipo, assunto e descrição são obrigatórios" });
      }
      
      const validTypes = ['complaint', 'suggestion', 'question', 'technical_issue', 'billing', 'plan_change'];
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: "Tipo de protocolo inválido" });
      }
      
      const protocolData = {
        clientId: clientId,
        type: type as 'complaint' | 'information' | 'plan_change' | 'cancellation' | 'emergency' | 'other',
        subject,
        description,
        status: 'open' as const,
        priority: validPriorities.includes(priority) ? (priority as 'low' | 'medium' | 'high' | 'urgent') : 'medium' as const
      };
      
      const protocol = await storage.createProtocol(protocolData as any);
      
      res.status(201).json({
        protocol,
        message: "Protocolo aberto com sucesso. Você receberá um retorno em até 2 dias úteis."
      });
      
    } catch (error) {
      console.error("❌ Error creating protocol:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Get Customer Protocols
  app.get("/api/customer/protocols", requireClient, async (req, res) => {
    try {
      const clientId = req.session.client?.id;
      const { status, type } = req.query;
      
      let protocols = await storage.getProtocolsByClientId(clientId);
      
      // Filter by status if provided
      if (status) {
        protocols = protocols.filter(p => p.status === status);
      }
      
      // Filter by type if provided
      if (type) {
        protocols = protocols.filter(p => p.type === type);
      }
      
      // Sort by creation date (newest first)
      protocols.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      res.json({
        protocols,
        total: protocols.length,
        message: "Protocolos recuperados com sucesso"
      });
      
    } catch (error) {
      console.error("❌ Error fetching protocols:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // 9. Satisfaction Surveys
  app.get("/api/customer/surveys", requireClient, async (req, res) => {
    try {
      const clientId = req.session.client?.id;
      const surveys = await storage.getSatisfactionSurveysByClientId(clientId);
      
      // Since SatisfactionSurvey doesn't have status, return all surveys
      // They are considered completed when they have a rating
      const completedSurveys = surveys.filter(s => s.rating > 0);
      const pendingSurveys = surveys.filter(s => s.rating === 0);
      
      res.json({
        pending_surveys: pendingSurveys,
        completed_surveys: completedSurveys,
        total_pending: pendingSurveys.length,
        total_completed: completedSurveys.length,
        message: "Pesquisas recuperadas com sucesso"
      });
      
    } catch (error) {
      console.error("❌ Error fetching surveys:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Submit Survey Response
  app.post("/api/customer/surveys/:surveyId/response", requireClient, async (req, res) => {
    try {
      const clientId = req.session.client?.id;
      const { surveyId } = req.params;
      const { responses, overall_rating, comments } = req.body;
      
      if (!responses || !overall_rating) {
        return res.status(400).json({ error: "Respostas e avaliação geral são obrigatórias" });
      }
      
      // Get the survey to verify it belongs to the client and is pending
      const survey = await storage.getSatisfactionSurvey(surveyId);
      if (!survey || survey.clientId !== clientId) {
        return res.status(404).json({ error: "Pesquisa não encontrada" });
      }
      
      // For now, just return a success response since there's no update method
      // This functionality would need to be implemented in storage layer
      res.json({
        message: "Pesquisa respondida com sucesso. Obrigado pelo seu feedback!"
      });
      
    } catch (error) {
      console.error("❌ Error submitting survey response:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // ========================================
  // PAYMENT MANAGEMENT ENDPOINTS
  // ========================================

  // Capture authorized payment
  app.post("/api/payments/capture/:paymentId", requireAuth, async (req, res) => {
    const correlationId = req.headers['x-correlation-id'] as string || 
                         Math.random().toString(36).substring(7);
    
    try {
      const { paymentId } = req.params;
      
      if (!paymentId) {
        return res.status(400).json({ 
          error: "paymentId é obrigatório",
          correlationId 
        });
      }

      // Validate request body if amount is provided
      let validatedData: { amount?: number } = {};
      if (req.body && Object.keys(req.body).length > 0) {
        try {
          validatedData = paymentCaptureSchema.parse(req.body);
        } catch (validationError) {
          return res.status(400).json({
            error: "Dados de captura inválidos",
            details: validationError instanceof Error ? validationError.message : 'Erro de validação',
            correlationId
          });
        }
      }
      
      console.log('🔒 [PAYMENT-CAPTURE] Iniciando captura de pagamento', {
        correlationId,
        paymentId,
        amount: validatedData.amount,
        userId: req.session.userId
      });

      // Import Cielo service
      const { CieloService } = await import("./services/cielo-service.js");
      const cieloService = new CieloService();

      // Capture the payment
      const captureResult = await cieloService.capturePayment(paymentId, validatedData.amount);
      
      // Update contract status if capture is successful
      if (captureResult && captureResult.payment) {
        const { storage } = await import('./storage.js');
        
        // Find contract by payment ID and update status
        const contract = await storage.getContractByCieloPaymentId(paymentId);
        
        if (contract) {
          const updateData = {
            status: 'active' as const,
            returnCode: captureResult.payment.returnCode || '',
            returnMessage: captureResult.payment.returnMessage || '',
            capturedAmount: captureResult.payment.capturedAmount || 0,
            capturedDate: new Date()
          };
          
          await storage.updateContract(contract.id, updateData);
          console.log('✅ [PAYMENT-CAPTURE] Contrato atualizado', {
            correlationId,
            contractId: contract.id,
            newStatus: 'active'
          });
        }
      }

      res.json({
        success: true,
        message: "Pagamento capturado com sucesso",
        data: {
          paymentId,
          status: captureResult.payment?.status || 'captured',
          capturedAmount: captureResult.payment?.capturedAmount || validatedData.amount || 0,
          capturedDate: new Date().toISOString(),
          correlationId
        }
      });

    } catch (error) {
      console.error('❌ [PAYMENT-CAPTURE] Erro ao capturar pagamento', {
        correlationId,
        paymentId: req.params.paymentId,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });

      const statusCode = error instanceof Error && error.message.includes('404') ? 404 : 500;
      res.status(statusCode).json({
        error: "Erro ao capturar pagamento",
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        correlationId
      });
    }
  });

  // Cancel payment
  app.post("/api/payments/cancel/:paymentId", requireAuth, async (req, res) => {
    const correlationId = req.headers['x-correlation-id'] as string || 
                         Math.random().toString(36).substring(7);
    
    try {
      const { paymentId } = req.params;
      
      if (!paymentId) {
        return res.status(400).json({ 
          error: "paymentId é obrigatório",
          correlationId 
        });
      }

      // Validate request body if amount is provided
      let validatedData: { amount?: number } = {};
      if (req.body && Object.keys(req.body).length > 0) {
        try {
          validatedData = paymentCancelSchema.parse(req.body);
        } catch (validationError) {
          return res.status(400).json({
            error: "Dados de cancelamento inválidos",
            details: validationError instanceof Error ? validationError.message : 'Erro de validação',
            correlationId
          });
        }
      }
      
      console.log('🚫 [PAYMENT-CANCEL] Iniciando cancelamento de pagamento', {
        correlationId,
        paymentId,
        amount: validatedData.amount,
        userId: req.session.userId
      });

      // Import Cielo service
      const { CieloService } = await import("./services/cielo-service.js");
      const cieloService = new CieloService();

      // Cancel the payment
      const cancelResult = await cieloService.cancelPayment(paymentId, validatedData.amount);
      
      // Update contract status if cancellation is successful
      if (cancelResult && cancelResult.payment) {
        const { storage } = await import('./storage.js');
        
        // Find contract by payment ID and update status
        const contract = await storage.getContractByCieloPaymentId(paymentId);
        
        if (contract) {
          const updateData = {
            status: 'cancelled' as const,
            returnCode: cancelResult.payment.returnCode || '',
            returnMessage: cancelResult.payment.returnMessage || '',
            cancelledDate: new Date()
          };
          
          await storage.updateContract(contract.id, updateData);
          console.log('✅ [PAYMENT-CANCEL] Contrato cancelado', {
            correlationId,
            contractId: contract.id,
            newStatus: 'cancelled'
          });
        }
      }

      res.json({
        success: true,
        message: "Pagamento cancelado com sucesso",
        data: {
          paymentId,
          status: 'cancelled',
          cancelledAmount: cancelResult.payment?.amount || validatedData.amount || 0,
          cancelledDate: new Date().toISOString(),
          correlationId
        }
      });

    } catch (error) {
      console.error('❌ [PAYMENT-CANCEL] Erro ao cancelar pagamento', {
        correlationId,
        paymentId: req.params.paymentId,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });

      const statusCode = error instanceof Error && error.message.includes('404') ? 404 : 500;
      res.status(statusCode).json({
        error: "Erro ao cancelar pagamento",
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        correlationId
      });
    }
  });

  // Query payment status
  // Permitir polling do PIX sem autenticação quando vem do checkout
  app.get("/api/payments/query/:paymentId", paymentQueryLimiter, async (req, res) => {
    // Verificar autenticação - permitir polling do checkout sem auth
    const isCheckoutPolling = req.headers['x-checkout-polling'] === 'true';
    if (!isCheckoutPolling && !req.session?.userId) {
      return res.status(401).json({ error: "Autenticação necessária" });
    }
    const correlationId = req.headers['x-correlation-id'] as string || 
                         Math.random().toString(36).substring(7);
    
    try {
      const { paymentId } = req.params;
      
      if (!paymentId) {
        return res.status(400).json({ 
          error: "paymentId é obrigatório",
          correlationId 
        });
      }
      
      console.log('🔍 [PAYMENT-QUERY] Consultando status de pagamento', {
        correlationId,
        paymentId,
        userId: req.session.userId
      });

      // Import Cielo service
      const { CieloService } = await import("./services/cielo-service.js");
      const cieloService = new CieloService();

      // Query the payment status
      const queryResult = await cieloService.queryPayment(paymentId);
      
      // Also get local contract information
      const { storage } = await import('./storage.js');
      let contract = await storage.getContractByCieloPaymentId(paymentId);
      
      // ✅ NOVA LÓGICA: Atualizar mensalidades se PIX foi aprovado
      const isPixPayment = (queryResult as any).Payment?.Type === 'Pix' || queryResult.payment?.qrCodeBase64Image;
      const isPaymentApproved = (queryResult as any).Payment?.Status === 2 || queryResult.payment?.status === 2;
      
      if (isPixPayment && isPaymentApproved) {
        // Buscar parcelas que tem o cieloPaymentId correspondente
        const directInstallments: any[] = [];
        
        // Primeiro, buscar contratos que possam ter essa parcela
        const contracts = await storage.getAllContracts();
        
        // Filtrar contratos relevantes e buscar suas parcelas
        for (const contract of contracts) {
          // Buscar apenas parcelas de contratos ativos ou recentes
          if (contract.status === 'active' || contract.status === 'inactive' || contract.status === 'pending') {
            const installments = await storage.getContractInstallmentsByContractId(contract.id);
            const matchingInstallments = installments.filter(i => 
              i.cieloPaymentId === paymentId && 
              (i.status === 'current' || i.status === 'pending')
            );
            if (matchingInstallments.length > 0) {
              directInstallments.push(...matchingInstallments);
            }
          }
        }
        
        console.log('🔍 [PAYMENT-QUERY] Buscando parcelas diretamente pelo cieloPaymentId', {
          correlationId,
          paymentId,
          installmentsFound: directInstallments.length
        });
        
        // Se encontrou parcelas diretamente, atualizá-las
        if (directInstallments.length > 0) {
          for (const unpaidInstallment of directInstallments) {
            const relatedContract = await storage.getContract(unpaidInstallment.contractId);
            
            console.log('✅ [PAYMENT-QUERY] PIX aprovado - atualizando mensalidade (busca direta)', {
              correlationId,
              paymentId,
              contractId: unpaidInstallment.contractId,
              installmentId: unpaidInstallment.id,
              currentStatus: unpaidInstallment.status
            });
            
            try {
              // Atualizar status da mensalidade para pago
              await storage.updateContractInstallment(unpaidInstallment.id, {
                status: 'paid',
                paidAt: new Date(),
                updatedAt: new Date()
              });
              
              console.log('✅ [PAYMENT-QUERY] Próxima Mensalidadeizada com sucesso', {
                correlationId,
                contractId: unpaidInstallment.contractId,
                installmentId: unpaidInstallment.id,
                newStatus: 'paid'
              });
              
              // Gerar comprovante de pagamento para PIX
              if (relatedContract) {
                try {
                  const { PaymentReceiptService } = await import("./services/payment-receipt-service.js");
                  const receiptService = new PaymentReceiptService();
                  
                  // Buscar informações do cliente e pet para o comprovante
                  const client = await storage.getClientById(relatedContract.clientId);
                  const pet = await storage.getPet(relatedContract.petId);
                  const plan = await storage.getPlan(relatedContract.planId);
                  
                  const receiptData = {
                    contractId: relatedContract.id,
                    cieloPaymentId: paymentId,
                    clientName: client?.fullName || "Cliente",
                    clientEmail: client?.email || "",
                    petName: pet?.name || "Pet",
                    planName: plan?.name || "Plano",
                    paymentAmount: unpaidInstallment.amount,
                    paymentDate: new Date().toISOString().split('T')[0],
                    paymentMethod: 'pix',
                    status: 'paid',
                    billingPeriod: relatedContract.billingPeriod, // Adiciona tipo de cobrança
                    installmentPeriodStart: unpaidInstallment.periodStart,
                    installmentPeriodEnd: unpaidInstallment.periodEnd,
                    proofOfSale: '',
                    authorizationCode: '',
                    installmentNumber: unpaidInstallment.installmentNumber
                  };
                  
                  const receiptResult = await receiptService.generatePaymentReceipt(receiptData);
                  
                  if (receiptResult.success && receiptResult.receiptId) {
                    // Atualizar parcela com ID do comprovante
                    await storage.updateContractInstallment(unpaidInstallment.id, {
                      paymentReceiptId: receiptResult.receiptId
                    });
                    
                    console.log('📋 [PAYMENT-QUERY] Comprovante gerado:', {
                      receiptId: receiptResult.receiptId,
                      installmentId: unpaidInstallment.id
                    });
                  }
                } catch (receiptError) {
                  console.error('⚠️ [PAYMENT-QUERY] Erro ao gerar comprovante (não-crítico):', receiptError);
                }
                
                // For annual plans, automatically create the next installment after successful PIX payment
                await createNextAnnualInstallmentIfNeeded(relatedContract.id, unpaidInstallment, '[PIX-PAYMENT-1]');
              }
            } catch (error) {
              console.error('❌ [PAYMENT-QUERY] Erro ao atualizar mensalidade:', {
                correlationId,
                contractId: unpaidInstallment.contractId,
                installmentId: unpaidInstallment.id,
                error: error instanceof Error ? error.message : 'Erro desconhecido'
              });
            }
          }
        } else {
          // Se não encontrou parcelas diretamente, buscar por contratos (lógica antiga para compatibilidade)
          const contracts = await storage.getAllContracts();
          const relatedContracts = contracts.filter(c => c.cieloPaymentId === paymentId);
          
          console.log('🔍 [PAYMENT-QUERY] Nenhuma parcela direta encontrada, buscando por contratos', {
            correlationId,
            paymentId,
            contractsFound: relatedContracts.length
          });
          
          for (const contract of relatedContracts) {
            // Buscar mensalidades deste contrato
            const installments = await storage.getContractInstallmentsByContractId(contract.id);
            
            // Atualizar primeira parcela com status 'current' OU 'pending' que tem o cieloPaymentId correspondente
            const unpaidInstallment = installments.find(i => 
              (i.status === 'current' || i.status === 'pending') && 
              i.cieloPaymentId === paymentId
            );
            
            if (unpaidInstallment) {
              console.log('✅ [PAYMENT-QUERY] PIX aprovado - atualizando mensalidade (busca por contrato)', {
                correlationId,
                paymentId,
                contractId: contract.id,
                installmentId: unpaidInstallment.id,
                currentStatus: unpaidInstallment.status
              });
              
              try {
                // Atualizar status da mensalidade para pago
                await storage.updateContractInstallment(unpaidInstallment.id, {
                  status: 'paid',
                  paidAt: new Date(),
                  updatedAt: new Date()
                });
                
                console.log('✅ [PAYMENT-QUERY] Próxima Mensalidadeizada com sucesso', {
                  correlationId,
                  contractId: contract.id,
                  installmentId: unpaidInstallment.id,
                  newStatus: 'paid'
                });
                
                // For annual plans, automatically create the next installment after successful PIX payment
                await createNextAnnualInstallmentIfNeeded(contract.id, unpaidInstallment, '[PIX-PAYMENT-2]');
              } catch (error) {
                console.error('❌ [PAYMENT-QUERY] Erro ao atualizar mensalidade:', {
                  correlationId,
                  contractId: contract.id,
                  installmentId: unpaidInstallment.id,
                  error: error instanceof Error ? error.message : 'Erro desconhecido'
                });
              }
            }
          }
        }
      }
      
      // ✅ NOVA LÓGICA: Criar contrato automaticamente se PIX foi aprovado mas não há contrato
      if (!contract && queryResult.payment?.status === 2) {
        console.log('🔧 [PIX-AUTO-CONTRACT] PIX aprovado sem contrato - tentando criar automaticamente', {
          correlationId,
          paymentId,
          pixStatus: queryResult.payment.status
        });
        
        try {
          // Buscar dados de checkout da sessão atual se disponível
          const sessionUserId = req.session.userId || req.session.client?.id;
          if (sessionUserId) {
            // Tentar recuperar dados de checkout baseado na sessão atual
            const clients = await storage.getClientById(sessionUserId);
            
            if (clients) {
              // Criar contrato com dados mínimos necessários
              // Usar plano padrão se não encontrar específico
              const allPlans = await storage.getAllPlans();
              const defaultPlan = allPlans.find(p => p.name.includes('BASIC')) || allPlans[0];
              
              if (defaultPlan) {
                // Determine if plan is annual (COMFORT or PLATINUM)
                // COMFORT and PLATINUM plans are always annual (365 days)
                // BASIC and INFINITY plans are monthly (30 days)
                const isAnnualPlan = ['COMFORT', 'PLATINUM'].some(type => 
                  defaultPlan.name.toUpperCase().includes(type)
                );
                
                // ✅ VALIDAÇÃO A2: Garantir billing period correto para o plano
                const validatedBillingPeriod = enforceCorrectBillingPeriod(
                  defaultPlan, 
                  isAnnualPlan ? 'annual' : 'monthly'
                );
                
                const monthlyAmount = parseFloat(defaultPlan.basePrice || '0');
                
                const contractData = {
                  clientId: clients.id,
                  planId: defaultPlan.id,
                  petId: 'pix-auto-pet', // Placeholder - cliente pode corrigir depois
                  contractNumber: `PIX-AUTO-${Date.now()}-${clients.id.substring(0, 4).toUpperCase()}`,
                  billingPeriod: validatedBillingPeriod,
                  status: 'active' as const,
                  startDate: new Date(),
                  monthlyAmount: defaultPlan.basePrice || '0',
                  annualAmount: isAnnualPlan ? (monthlyAmount * 12).toFixed(2) : '0.00',
                  paymentMethod: 'pix',
                  cieloPaymentId: paymentId,
                  proofOfSale: queryResult.payment.proofOfSale || '',
                  authorizationCode: queryResult.payment.authorizationCode || '',
                  tid: queryResult.payment.tid || '',
                  receivedDate: queryResult.payment.receivedDate ? new Date(queryResult.payment.receivedDate) : new Date(),
                  returnCode: queryResult.payment.returnCode || '0',
                  returnMessage: queryResult.payment.returnMessage || 'PIX Aprovado',
                  pixQrCode: queryResult.payment.qrCodeBase64Image || null,
                  pixCode: queryResult.payment.qrCodeString || null
                };
                
                console.log('🔧 [PIX-AUTO-CONTRACT] Criando contrato automaticamente:', {
                  correlationId,
                  contractNumber: contractData.contractNumber,
                  clientId: contractData.clientId,
                  planId: contractData.planId
                });
                
                contract = await storage.createContract(contractData);
                
                console.log('✅ [PIX-AUTO-CONTRACT] Contrato criado automaticamente:', {
                  correlationId,
                  contractId: contract.id,
                  contractNumber: contract.contractNumber
                });
              }
            }
          }
        } catch (error) {
          console.error('❌ [PIX-AUTO-CONTRACT] Erro ao criar contrato automaticamente:', {
            correlationId,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
          // Continuar mesmo se não conseguir criar o contrato
        }
      }
      
      // ✅ ATUALIZAR CONTRATO SE PIX DE RENOVAÇÃO FOI APROVADO
      const isPix = (queryResult as any).Payment?.Type === 'Pix' || queryResult.payment?.qrCodeBase64Image;
      const isApproved = (queryResult as any).Payment?.Status === 2;
      
      if (contract && isPix && isApproved) {
        // Verificar se o contrato não está ativo (renovação pendente)
        // E se ainda não foi processado (evita processamento duplicado)
        const needsUpdate = contract.status !== 'active' && 
                           contract.cieloPaymentId === paymentId &&
                           (!contract.receivedDate || 
                            new Date(contract.receivedDate).getTime() < Date.now() - 60000); // Não processar se já foi atualizado há menos de 1 minuto
        
        if (needsUpdate) {
          console.log('🔄 [PIX-RENEWAL-UPDATE] PIX de renovação aprovado - atualizando contrato', {
            correlationId,
            contractId: contract.id,
            currentStatus: contract.status,
            paymentId,
            lastReceivedDate: contract.receivedDate
          });
          
          try {
            // Calcular novas datas de renovação
            const now = new Date();
            const billingPeriod = contract.billingPeriod || 'monthly';
            const daysToAdd = billingPeriod === 'annual' ? 365 : 30;
            
            // Se o contrato tem endDate futura, estender a partir dela
            // Senão, iniciar do momento atual
            let newStartDate = now;
            let newEndDate = new Date(now);
            
            if (contract.endDate && new Date(contract.endDate) > now) {
              // Estender a partir do fim do período atual
              newStartDate = new Date(contract.endDate);
              newEndDate = new Date(contract.endDate);
              newEndDate.setDate(newEndDate.getDate() + daysToAdd);
            } else {
              // Iniciar novo período a partir de agora
              newEndDate.setDate(newEndDate.getDate() + daysToAdd);
            }
            
            // Atualizar o contrato para ativo e renovar as datas
            const updateData = {
              status: 'active' as const,
              receivedDate: now,
              startDate: newStartDate,
              endDate: newEndDate,
              returnCode: '0',
              returnMessage: 'PIX Aprovado - Renovação confirmada',
              updatedAt: now,
              // Limpar dados do PIX após aprovação
              pixQrCode: null,
              pixCode: null
            };
            
            const updatedContract = await storage.updateContract(contract.id, updateData);
            
            console.log('✅ [PIX-RENEWAL-UPDATE] Contrato renovado com sucesso', {
              correlationId,
              contractId: contract.id,
              newStatus: updatedContract?.status,
              receivedDate: updatedContract?.receivedDate
            });
            
            // Atualizar o contrato local com os novos dados
            if (updatedContract) {
              contract = updatedContract;
              
              // Generate payment receipt for PIX renewal
              try {
                const { PaymentReceiptService } = await import("./services/payment-receipt-service.js");
                const receiptService = new PaymentReceiptService();
                
                // Get client, pet and plan data for receipt
                const client = await storage.getClientById(contract.clientId);
                const pet = await storage.getPet(contract.petId);
                const plan = await storage.getPlan(contract.planId);
                
                if (client && pet && plan) {
                  // Calcular período da parcela
                  const periodStart = new Date();
                  const periodEnd = calculatePeriodEnd(periodStart, contract.billingPeriod);
                  
                  const receiptData = {
                    contractId: contract.id,
                    cieloPaymentId: paymentId,
                    clientName: client.fullName,
                    clientEmail: client.email,
                    clientCPF: client.cpf || undefined,
                    clientPhone: client.phone,
                    pets: [{
                      name: pet.name || 'Pet',
                      species: pet.species || 'Cão',
                      breed: pet.breed || undefined,
                      age: typeof pet.age === 'string' ? parseInt(pet.age, 10) || undefined : typeof pet.age === 'number' ? pet.age : undefined,
                      weight: typeof pet.weight === 'string' ? parseFloat(pet.weight) || undefined : pet.weight || undefined,
                      sex: pet.sex || undefined,
                      planName: plan.name || 'BASIC',
                      planType: plan.planType || 'BASIC',
                      value: parseFloat(contract.monthlyAmount || '0'),
                      discount: 0,
                      discountedValue: parseFloat(contract.monthlyAmount || '0')
                    }],
                    paymentMethod: 'pix',
                    billingPeriod: contract.billingPeriod, // Adiciona tipo de cobrança
                    installmentPeriodStart: periodStart.toISOString().split('T')[0],
                    installmentPeriodEnd: periodEnd.toISOString().split('T')[0],
                    installments: 1,
                    installmentValue: parseFloat(contract.monthlyAmount || '0'),
                    totalDiscount: 0,
                    finalAmount: parseFloat(contract.monthlyAmount || '0')
                  };
                  
                  console.log(`📄 [PIX-RENEWAL-RECEIPT] Gerando comprovante de renovação para contrato ${contract.contractNumber}`);
                  const receiptResult = await receiptService.generatePaymentReceipt(receiptData, `renewal_pix_${paymentId}`);
                  
                  if (receiptResult.success) {
                    console.log("✅ [PIX-RENEWAL-RECEIPT] Comprovante de renovação gerado com sucesso:", {
                      receiptId: receiptResult.receiptId,
                      receiptNumber: receiptResult.receiptNumber,
                      contractNumber: contract.contractNumber
                    });
                  } else {
                    console.error("⚠️ [PIX-RENEWAL-RECEIPT] Falha ao gerar comprovante de renovação:", receiptResult.error);
                  }
                }
              } catch (receiptError) {
                console.error("❌ [PIX-RENEWAL-RECEIPT] Erro ao gerar comprovante de renovação PIX:", {
                  error: receiptError instanceof Error ? receiptError.message : 'Erro desconhecido',
                  contractId: contract.id
                });
                // Continue even if receipt generation fails - don't block the renewal
              }
            }
            
            // Gerar comprovante de pagamento
            try {
              const { PaymentReceiptService } = await import('./services/payment-receipt-service.js');
              const receiptService = new PaymentReceiptService();
              
              // Buscar dados do cliente e plano
              const client = await storage.getClientById(contract.clientId);
              const plan = await storage.getPlan(contract.planId);
              const pet = await storage.getPet(contract.petId);
              
              if (client) {
                const receiptResult = await receiptService.generatePaymentReceipt({
                  contractId: contract.id,
                  cieloPaymentId: paymentId,
                  clientName: client.fullName || 'Cliente',
                  clientEmail: client.email,
                  clientCPF: client.cpf || undefined,
                  petName: pet?.name || '',
                  planName: plan?.name || '',
                  paymentMethod: 'pix'
                });
                
                if (receiptResult.success) {
                  console.log('✅ [PIX-RENEWAL-RECEIPT] Comprovante gerado:', {
                    correlationId,
                    receiptId: receiptResult.receiptId,
                    receiptNumber: receiptResult.receiptNumber
                  });
                }
              }
            } catch (receiptError) {
              console.error('⚠️ [PIX-RENEWAL-RECEIPT] Erro ao gerar comprovante (não crítico):', receiptError);
            }
            
          } catch (updateError) {
            console.error('❌ [PIX-RENEWAL-UPDATE] Erro ao atualizar contrato:', {
              correlationId,
              contractId: contract.id,
              error: updateError instanceof Error ? updateError.message : 'Erro desconhecido'
            });
          }
        }
      }
      
      // Calculate payment status using PaymentStatusService if contract exists
      let contractStatus: {
        calculatedStatus: 'active' | 'inactive' | 'suspended' | 'cancelled';
        isOverdue: boolean;
        daysPastDue: number;
        nextDueDate: Date | null;
        statusReason: string;
        actionRequired: string | null;
      } | null = null;
      if (contract) {
        const paymentStatus = PaymentStatusService.evaluateContractPaymentStatus(contract);
        contractStatus = {
          calculatedStatus: paymentStatus.calculatedStatus,
          isOverdue: paymentStatus.isOverdue,
          daysPastDue: paymentStatus.daysPastDue,
          nextDueDate: paymentStatus.nextDueDate,
          statusReason: paymentStatus.statusReason,
          actionRequired: PaymentStatusService.getActionRequired(paymentStatus)
        };
      }

      res.json({
        success: true,
        data: {
          paymentId,
          merchantOrderId: queryResult.merchantOrderId || '',
          // Cielo payment data
          cieloStatus: (queryResult as any).Payment?.Status || 0, // Status numérico original da Cielo
          mappedStatus: queryResult.payment?.status, // Status já mapeado pelo CieloService ('approved', 'pending', etc)
          amount: queryResult.payment?.amount || 0,
          capturedAmount: queryResult.payment?.capturedAmount || 0,
          tid: queryResult.payment?.tid || '',
          proofOfSale: queryResult.payment?.proofOfSale || '',
          authorizationCode: queryResult.payment?.authorizationCode || '',
          returnCode: queryResult.payment?.returnCode || '',
          returnMessage: queryResult.payment?.returnMessage || '',
          receivedDate: queryResult.payment?.receivedDate || '',
          // PIX specific data
          qrCodeBase64Image: queryResult.payment?.qrCodeBase64Image || '',
          qrCodeString: queryResult.payment?.qrCodeString || '',
          // Local contract information
          contractStatus,
          correlationId
        }
      });

    } catch (error) {
      console.error('❌ [PAYMENT-QUERY] Erro ao consultar pagamento', {
        correlationId,
        paymentId: req.params.paymentId,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });

      const statusCode = error instanceof Error && error.message.includes('404') ? 404 : 500;
      res.status(statusCode).json({
        error: "Erro ao consultar pagamento",
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        correlationId
      });
    }
  });

  // Payment Receipts - Official Cielo receipts for customers
  app.get("/api/customer/payment-receipts", requireClient, async (req, res) => {
    try {
      const clientId = req.session.client?.id;
      const clientEmail = req.session.client?.email;

      console.log(`📄 [CUSTOMER-RECEIPTS] Cliente solicitando comprovantes: ${clientEmail}`);

      // Get receipts by client email (primary method) or contract ID
      let receipts: any[] = [];
      
      if (clientEmail) {
        receipts = await storage.getPaymentReceiptsByClientEmail(clientEmail);
      }

      // If no receipts found by email, try by contract ID
      if (receipts.length === 0 && clientId) {
        const contracts = await storage.getContractsByClientId(clientId);
        for (const contract of contracts) {
          const contractReceipts = await storage.getPaymentReceiptsByContractId(contract.id);
          receipts.push(...contractReceipts);
        }
      }

      // Format receipt data for frontend
      const formattedReceipts = receipts.map(receipt => ({
        id: receipt.id,
        receiptNumber: receipt.receiptNumber,
        paymentAmount: parseFloat(receipt.paymentAmount),
        paymentDate: receipt.paymentDate,
        paymentMethod: receipt.paymentMethod,
        status: receipt.status,
        petName: receipt.petName,
        planName: receipt.planName,
        petsData: receipt.petsData,
        proofOfSale: receipt.proofOfSale,
        authorizationCode: receipt.authorizationCode,
        tid: receipt.tid,
        createdAt: receipt.createdAt
      }));

      console.log(`✅ [CUSTOMER-RECEIPTS] ${receipts.length} comprovantes encontrados para ${clientEmail}`);

      res.json({
        receipts: formattedReceipts,
        total: receipts.length,
        message: "Comprovantes recuperados com sucesso"
      });

    } catch (error) {
      console.error("❌ [CUSTOMER-RECEIPTS] Erro ao buscar comprovantes:", error);
      res.status(500).json({ 
        error: "Erro interno do servidor ao buscar comprovantes",
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  // Download specific payment receipt
  app.get("/api/customer/payment-receipts/:receiptId/download", requireClient, async (req, res) => {
    try {
      const { receiptId } = req.params;
      const clientId = req.session.client?.id;
      const clientEmail = req.session.client?.email;

      console.log(`📥 [RECEIPT-DOWNLOAD] Cliente ${clientEmail} solicitando download do comprovante: ${receiptId}`);

      // Get the receipt
      const receipt = await storage.getPaymentReceiptById(receiptId);

      if (!receipt) {
        console.warn(`⚠️ [RECEIPT-DOWNLOAD] Comprovante não encontrado: ${receiptId}`);
        return res.status(404).json({ error: "Comprovante não encontrado" });
      }

      // Verify if the receipt belongs to the current client
      const hasAccess = receipt.clientEmail === clientEmail || 
                       (clientId && receipt.contractId && 
                        (await storage.getContractsByClientId(clientId)).some(c => c.id === receipt.contractId));

      if (!hasAccess) {
        console.warn(`🚫 [RECEIPT-DOWNLOAD] Acesso negado para comprovante ${receiptId} pelo cliente ${clientEmail}`);
        return res.status(403).json({ error: "Acesso negado ao comprovante" });
      }

      // Update receipt status to 'downloaded'
      await storage.updatePaymentReceiptStatus(receiptId, 'downloaded');

      // ✅ SEGURANÇA: Gerar signed URL temporária para o PDF privado
      if (receipt.pdfObjectKey) {
        console.log(`🔐 [RECEIPT-DOWNLOAD] Gerando signed URL para PDF privado: ${receipt.pdfFileName}`);
        
        // Gerar signed URL temporária (5 minutos)
        const signedUrlResult = await supabaseStorage.generateSignedUrl(receipt.pdfObjectKey, 300);
        
        if (!signedUrlResult.success) {
          console.warn(`⚠️ [RECEIPT-DOWNLOAD] PDF não encontrado no storage, tentando regenerar: ${signedUrlResult.error}`);
          
          // ✅ FALLBACK: Tentar regenerar o PDF se não existir no storage
          try {
            const PaymentReceiptService = (await import('./services/payment-receipt-service.js')).PaymentReceiptService;
            const paymentReceiptService = new PaymentReceiptService();
            
            console.log(`🔄 [RECEIPT-DOWNLOAD] Regenerando PDF para comprovante: ${receiptId}`);
            
            const regenerateResult = await paymentReceiptService.regeneratePDFFromReceipt(receipt);
            
            if (regenerateResult.success && regenerateResult.pdfBuffer) {
              console.log(`✅ [RECEIPT-DOWNLOAD] PDF regenerado com sucesso, enviando diretamente...`);
              
              // Set headers for PDF download
              res.setHeader('Content-Type', 'application/pdf');
              res.setHeader('Content-Disposition', `attachment; filename="${receipt.pdfFileName}"`);
              res.setHeader('Content-Length', regenerateResult.pdfBuffer.length.toString());
              
              // Send PDF buffer directly
              return res.end(regenerateResult.pdfBuffer);
            } else {
              console.error(`❌ [RECEIPT-DOWNLOAD] Falha ao regenerar PDF: ${regenerateResult.error}`);
              return res.status(500).json({ error: "PDF não encontrado e não foi possível regenrá-lo. Entre em contato com o suporte." });
            }
            
          } catch (regenerateError) {
            console.error(`❌ [RECEIPT-DOWNLOAD] Erro durante regeneração do PDF:`, regenerateError);
            return res.status(500).json({ error: "Erro ao tentar regenerar PDF. Entre em contato com o suporte." });
          }
        }

        console.log(`✅ [RECEIPT-DOWNLOAD] Signed URL gerada com sucesso (válida por 5 min)`);
        
        // Set headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${receipt.pdfFileName}"`);
        
        // Redirect to the secure signed URL
        // res.redirect(signedUrlResult.signedUrl!); // CORREÇÃO: Comentado para evitar problemas de CORS
        
        // ✅ CORREÇÃO: Regenerar PDF para download direto e evitar problemas de CORS
        try {
          const PaymentReceiptService = (await import('./services/payment-receipt-service.js')).PaymentReceiptService;
          const paymentReceiptService = new PaymentReceiptService();
          
          console.log(`🔄 [RECEIPT-DOWNLOAD] Regenerando PDF para download direto (evitar CORS): ${receiptId}`);
          
          const regenerateResult = await paymentReceiptService.regeneratePDFFromReceipt(receipt);
          
          if (regenerateResult.success && regenerateResult.pdfBuffer) {
            console.log(`✅ [RECEIPT-DOWNLOAD] PDF regenerado, enviando diretamente...`);
            
            // Update headers for direct PDF download
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${receipt.pdfFileName}"`);
            res.setHeader('Content-Length', regenerateResult.pdfBuffer.length.toString());
            
            // Send PDF buffer directly
            return res.end(regenerateResult.pdfBuffer);
          } else {
            console.error(`❌ [RECEIPT-DOWNLOAD] Falha ao regenerar PDF: ${regenerateResult.error}`);
            return res.status(500).json({ error: "Falha ao regenerar PDF para download." });
          }
          
        } catch (regenerateError) {
          console.error(`❌ [RECEIPT-DOWNLOAD] Erro na regeneração:`, regenerateError);
          return res.status(500).json({ error: "Erro ao regenerar PDF. Tente novamente." });
        }
      } else {
        console.error(`❌ [RECEIPT-DOWNLOAD] Object key do PDF não disponível para comprovante: ${receiptId}`);
        // Try to regenerate PDF when object key is not available
        try {
          const PaymentReceiptService = (await import('./services/payment-receipt-service.js')).PaymentReceiptService;
          const paymentReceiptService = new PaymentReceiptService();
          console.log(`🔄 [RECEIPT-DOWNLOAD] Regenerando PDF para comprovante sem object key: ${receiptId}`);
          const regenerateResult = await paymentReceiptService.regeneratePDFFromReceipt(receipt);
          if (regenerateResult.success && regenerateResult.pdfBuffer) {
            console.log(`✅ [RECEIPT-DOWNLOAD] PDF regenerado com sucesso`);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${receipt.pdfFileName}"`);
            res.setHeader('Content-Length', regenerateResult.pdfBuffer.length.toString());
            return res.end(regenerateResult.pdfBuffer);
          } else {
            console.error(`❌ [RECEIPT-DOWNLOAD] Falha ao regenerar PDF: ${regenerateResult.error}`);
            return res.status(500).json({ error: "Falha ao regenerar PDF. Entre em contato com o suporte." });
          }
        } catch (regenerateError) {
          console.error(`❌ [RECEIPT-DOWNLOAD] Erro na regeneração:`, regenerateError);
          return res.status(500).json({ error: "Erro ao regenerar PDF" });
        }
      }

    } catch (error) {
      console.error("❌ [RECEIPT-DOWNLOAD] Erro no download do comprovante:", error);
      res.status(500).json({ 
        error: "Erro interno do servidor no download",
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  // Generate payment receipt for installment on demand
  app.post("/api/customer/installments/:installmentId/generate-receipt", requireClient, async (req, res) => {
    try {
      const { installmentId } = req.params;
      const clientId = req.session.client?.id;
      const clientEmail = req.session.client?.email;
      
      console.log(`📄 [GENERATE-RECEIPT] Gerando comprovante sob demanda para mensalidade: ${installmentId}`);
      
      if (!clientId) {
        return res.status(401).json({ error: "Cliente não autenticado" });
      }
      
      // Get the installment
      const installment = await storage.getContractInstallmentById(installmentId);
      if (!installment) {
        return res.status(404).json({ error: "Mensalidade não encontrada" });
      }
      
      // Check if installment is paid
      if (installment.status !== 'paid') {
        return res.status(400).json({ error: "Comprovante disponível apenas para mensalidades pagas" });
      }
      
      // Check if receipt already exists
      if (installment.paymentReceiptId) {
        console.log(`✅ [GENERATE-RECEIPT] Comprovante já existe: ${installment.paymentReceiptId}`);
        return res.json({
          success: true,
          receiptId: installment.paymentReceiptId,
          message: "Comprovante já existente"
        });
      }
      
      // Get contract details
      const contract = await storage.getContract(installment.contractId);
      if (!contract) {
        return res.status(404).json({ error: "Contrato não encontrado" });
      }
      
      // Verify contract belongs to client
      if (contract.clientId !== clientId) {
        return res.status(403).json({ error: "Acesso negado" });
      }
      
      // Get client, pet and plan details
      const client = await storage.getClientById(clientId);
      const pet = await storage.getPet(contract.petId);
      const plan = await storage.getPlan(contract.planId);
      
      // Generate a payment ID for the receipt (since we may not have Cielo payment ID)
      const paymentId = `INST-${installmentId}-${Date.now()}`;
      
      // Import and use PaymentReceiptService
      const { PaymentReceiptService } = await import("./services/payment-receipt-service.js");
      const receiptService = new PaymentReceiptService();
      
      // Prepare receipt data
      const receiptData = {
        contractId: contract.id,
        cieloPaymentId: installment.cieloPaymentId || paymentId,
        clientName: client?.fullName || "Cliente",
        clientEmail: client?.email || "",
        clientCPF: client?.cpf || undefined,
        clientPhone: client?.phone,
        clientAddress: client?.address && client?.cep ? {
          street: client.address,
          number: client.number || 'S/N',
          complement: client.complement || '',
          neighborhood: client.district || '',
          city: client.city || '',
          state: client.state || '',
          zipCode: client.cep
        } : undefined,
        // Array completo com todas as informações do pet
        pets: pet ? [{
          name: pet.name,
          species: pet.species,
          breed: pet.breed || undefined,
          age: pet.age ? parseInt(pet.age.toString()) : undefined,
          sex: pet.sex,
          planName: plan?.name || 'Plano',
          planType: plan?.planType || 'with_waiting_period',
          value: parseFloat(installment.amount) * 100, // em centavos
          discountedValue: parseFloat(installment.amount) * 100,
          discount: 0
        }] : undefined,
        planName: plan?.name || "Plano",
        paymentAmount: parseFloat(installment.amount) * 100, // Convert to cents
        paymentDate: installment.paidAt || installment.dueDate,
        paymentMethod: 'credit_card', // Default to credit card
        status: 'paid',
        billingPeriod: contract.billingPeriod, // Adiciona tipo de cobrança
        installmentPeriodStart: installment.periodStart,
        installmentPeriodEnd: installment.periodEnd,
        installmentNumber: installment.installmentNumber,
        installmentDueDate: installment.dueDate
      };
      
      console.log(`📋 [GENERATE-RECEIPT] Dados preparados para geração do comprovante:`, {
        clientName: receiptData.clientName,
        pets: receiptData.pets,
        amount: receiptData.paymentAmount,
        installmentNumber: installment.installmentNumber,
        dueDate: installment.dueDate,
        period: `${installment.periodStart} - ${installment.periodEnd}`,
        billingPeriod: contract.billingPeriod
      });
      
      const receiptResult = await receiptService.generatePaymentReceipt(
        receiptData, 
        `installment_${installmentId}_${Date.now()}`
      );
      
      if (receiptResult.success && receiptResult.receiptId) {
        // Update installment with receipt ID
        await storage.updateContractInstallment(installmentId, {
          paymentReceiptId: receiptResult.receiptId
        });
        
        console.log(`✅ [GENERATE-RECEIPT] Comprovante gerado com sucesso: ${receiptResult.receiptId}`);
        
        return res.json({
          success: true,
          receiptId: receiptResult.receiptId,
          message: "Comprovante gerado com sucesso"
        });
      } else {
        console.error(`❌ [GENERATE-RECEIPT] Erro ao gerar comprovante:`, receiptResult.error);
        return res.status(500).json({ 
          error: "Erro ao gerar comprovante",
          details: receiptResult.error 
        });
      }
      
    } catch (error) {
      console.error("❌ [GENERATE-RECEIPT] Erro ao gerar comprovante sob demanda:", error);
      return res.status(500).json({ 
        error: "Erro interno ao gerar comprovante",
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  // Get customer installments (mensalidades)
  app.get("/api/customer/installments", requireClient, async (req, res) => {
    try {
      const clientId = req.session.client?.id;
      
      if (!clientId) {
        return res.status(401).json({ error: "Cliente não autenticado" });
      }

      // Get all contracts for the client
      const contracts = await storage.getContractsByClientId(clientId);
      
      if (!contracts || contracts.length === 0) {
        return res.json({ 
          paid: [],
          current: [],
          overdue: [],
          message: "Nenhum contrato encontrado"
        });
      }

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      // Arrays to hold categorized installments
      const paidInstallments: any[] = [];
      const currentInstallments: any[] = [];
      const overdueInstallments: any[] = [];

      // ✅ OTIMIZAÇÃO: Buscar dados em batch para evitar N+1 queries
      // Include 'active' and 'paid' status contracts as they might still need to show next renewal
      const activeContracts = contracts.filter(c => c.status !== 'cancelled' && c.status !== 'pending' && c.status !== 'suspended');
      
      if (activeContracts.length === 0) {
        return res.json({ 
          paid: [],
          current: [],
          overdue: [],
          message: "Nenhum contrato ativo encontrado"
        });
      }
      
      // Buscar pets, plans, installments e receipts em batch
      const uniquePetIds = [...new Set(activeContracts.map(c => c.petId))];
      const uniquePlanIds = [...new Set(activeContracts.map(c => c.planId))];
      const contractIds = activeContracts.map(c => c.id);
      
      const [pets, plans, allInstallments, allReceipts] = await Promise.all([
        Promise.all(uniquePetIds.map(id => storage.getPet(id))),
        Promise.all(uniquePlanIds.map(id => storage.getPlan(id))),
        Promise.all(contractIds.map(id => storage.getContractInstallmentsByContractId(id))),
        Promise.all(contractIds.map(id => storage.getPaymentReceiptsByContractId(id)))
      ]);
      
      // Criar maps para lookup rápido
      const petsMap = new Map(pets.filter((p): p is NonNullable<typeof p> => p !== null && p !== undefined).map(p => [p.id, p]));
      const plansMap = new Map(plans.filter((p): p is NonNullable<typeof p> => p !== null && p !== undefined).map(p => [p.id, p]));
      const installmentsMap = new Map(contractIds.map((id, i) => [id, allInstallments[i]]));
      const receiptsMap = new Map(contractIds.map((id, i) => [id, allReceipts[i]]));
      
      // Process each contract to get installments from database
      for (const contract of activeContracts) {
        // Get pet and plan information from maps
        const pet = petsMap.get(contract.petId);
        const plan = plansMap.get(contract.planId);
        
        // Get installments and receipts from maps
        const contractInstallments = installmentsMap.get(contract.id) || [];
        const receipts = receiptsMap.get(contract.id) || [];
        
        // Process each installment from database
        for (const inst of contractInstallments) {
          const dueDate = new Date(inst.dueDate);
          // For annual plans, use the annual amount from contract or calculate it
          let amount = parseFloat(inst.amount);
          
          // Correct the amount for annual plans - use annualAmount if available
          if (contract.billingPeriod === 'annual') {
            if (contract.annualAmount && parseFloat(contract.annualAmount) > 0) {
              amount = parseFloat(contract.annualAmount);
            } else {
              // Fallback: calculate from monthly amount
              amount = parseFloat(contract.monthlyAmount) * 12;
            }
          } else {
            // For monthly plans, use the installment amount or monthly amount
            amount = parseFloat(inst.amount) || parseFloat(contract.monthlyAmount);
          }
          
          const installment = {
            id: inst.id,
            contractId: contract.id,
            contractNumber: contract.contractNumber,
            installmentNumber: inst.installmentNumber,
            dueDate: inst.dueDate,
            periodStart: inst.periodStart,
            periodEnd: inst.periodEnd,
            amount,
            petName: pet?.name || 'Pet não encontrado',
            planName: plan?.name || 'Plano não encontrado',
            petId: contract.petId,
            planId: contract.planId,
            billingPeriod: contract.billingPeriod
          };
          
          // Categorize based on status from database
          if (inst.status === 'paid') {
            const payment = receipts.find(r => r.id === inst.paymentReceiptId);
            // Get actual paid amount from receipt (with discounts applied) or default to installment amount
            const paidAmount = payment?.paymentAmount ? parseFloat(payment.paymentAmount) : amount;
            
            paidInstallments.push({
              ...installment,
              status: 'paid',
              paidAt: inst.paidAt || inst.dueDate,
              paymentMethod: payment?.paymentMethod || contract.paymentMethod,
              receiptId: inst.paymentReceiptId || payment?.id,
              paidAmount // Add the actual paid amount
            });
          } else if (inst.status === 'overdue') {
            const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            overdueInstallments.push({
              ...installment,
              status: 'overdue',
              daysOverdue
            });
          } else if (inst.status === 'pending') {
            if (dueDate < now) {
              // Should be overdue but marked as pending
              const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
              overdueInstallments.push({
                ...installment,
                status: 'overdue',
                daysOverdue
              });
            } else {
              // Pending installments with future due dates
              const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              currentInstallments.push({
                ...installment,
                status: 'current',
                daysUntilDue
              });
            }
          }
        }
      }
      
      // Sort installments
      paidInstallments.sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
      currentInstallments.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      overdueInstallments.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
      
      // Filter to show only the next installment for each contract
      const nextInstallments: any[] = [];
      const seenContracts = new Set();
      for (const installment of currentInstallments) {
        if (!seenContracts.has(installment.contractId)) {
          nextInstallments.push(installment);
          seenContracts.add(installment.contractId);
        }
      }
      
      // Check each active contract and create next installment if needed
      for (const contract of activeContracts) {
        // Skip only if the contract is in a final cancelled/suspended state
        // Allow 'active' and 'paid' contracts to show next installments
        if (contract.status === 'cancelled' || contract.status === 'suspended') {
          continue;
        }
        
        // Check if this contract already has a pending installment
        const hasNextInstallment = seenContracts.has(contract.id);
        
        if (!hasNextInstallment) {
          // Get all installments for this contract to determine next number
          const allInstallments = await storage.getContractInstallmentsByContractId(contract.id);
          
          // For annual plans with a paid installment, show next renewal info even if not creating the installment yet
          if (contract.billingPeriod === 'annual') {
            // Get the LAST paid installment (highest installment number), not the first
            const paidInstallments = allInstallments.filter(i => i.status === 'paid');
            const paidInstallment = paidInstallments.length > 0 
              ? paidInstallments.reduce((latest, current) => 
                  current.installmentNumber > latest.installmentNumber ? current : latest
                )
              : null;
            
            // Check if there's already a pending installment that represents a future renewal
            // We should only skip if there's a pending installment with a future due date
            const pendingInstallments = allInstallments.filter(i => i.status === 'pending');
            const futurePendingInstallment = pendingInstallments.find(inst => {
              const dueDate = new Date(inst.dueDate);
              return dueDate > now;
            });
            
            // If there's already a future pending installment, it will be shown in 'current'
            // so we don't need to create a virtual one
            if (futurePendingInstallment) {
              continue;
            }
            
            if (paidInstallment && paidInstallment.dueDate) {
              const paidDueDate = new Date(paidInstallment.dueDate);
              // ✅ BUG FIX: Calculate NEXT renewal date (1 year after the paid installment)
              const nextRenewalDate = addYears(paidDueDate, 1);
              const daysTilRenewal = Math.ceil((nextRenewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              
              // ALWAYS show virtual next installment for annual plans (display only, not saved to DB)
              // Get pet and plan info for the virtual installment
              const pet = petsMap.get(contract.petId);
              const plan = plansMap.get(contract.planId);
              
              // Use the annual amount from contract
              let annualAmount = contract.annualAmount;
              if (!annualAmount || parseFloat(annualAmount) === 0) {
                annualAmount = (parseFloat(contract.monthlyAmount) * 12).toFixed(2);
              }
              
              // Add virtual installment to display (not saved in DB)
              nextInstallments.push({
                id: `virtual-${contract.id}`, // Virtual ID
                contractId: contract.id,
                contractNumber: contract.contractNumber,
                installmentNumber: paidInstallment.installmentNumber + 1,
                dueDate: nextRenewalDate.toISOString(),
                periodStart: nextRenewalDate.toISOString(), 
                periodEnd: addYears(nextRenewalDate, 1).toISOString(),
                amount: parseFloat(annualAmount),
                petName: pet?.name || 'Pet não encontrado',
                planName: plan?.name || 'Plano não encontrado',
                petId: contract.petId,
                planId: contract.planId,
                billingPeriod: contract.billingPeriod,
                status: 'current' as const,
                daysUntilDue: daysTilRenewal
              });
              
              continue;
            } else if (!paidInstallment) {
              // For annual contracts without any paid installment yet, create virtual first installment
              // This might happen for new contracts that haven't been paid yet
              const pet = petsMap.get(contract.petId);
              const plan = plansMap.get(contract.planId);
              
              // Use the contract start date or current date for the first installment
              const firstDueDate = contract.startDate ? new Date(contract.startDate) : new Date();
              const daysTilDue = Math.ceil((firstDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              
              // Only show if the due date is in the future
              if (daysTilDue > 0) {
                let annualAmount = contract.annualAmount;
                if (!annualAmount || parseFloat(annualAmount) === 0) {
                  annualAmount = (parseFloat(contract.monthlyAmount) * 12).toFixed(2);
                }
                
                // Add virtual first installment to display (not saved in DB)
                nextInstallments.push({
                  id: `virtual-first-${contract.id}`, // Virtual ID for first installment
                  contractId: contract.id,
                  contractNumber: contract.contractNumber,
                  installmentNumber: 1,
                  dueDate: firstDueDate.toISOString(),
                  periodStart: firstDueDate.toISOString(), 
                  periodEnd: addYears(firstDueDate, 1).toISOString(),
                  amount: parseFloat(annualAmount),
                  petName: pet?.name || 'Pet não encontrado',
                  planName: plan?.name || 'Plano não encontrado',
                  petId: contract.petId,
                  planId: contract.planId,
                  billingPeriod: contract.billingPeriod,
                  status: 'current' as const,
                  daysUntilDue: daysTilDue
                });
                
                continue;
              }
            }
          }
          
          const maxInstallmentNumber = Math.max(0, ...allInstallments.map(i => i.installmentNumber));
          const nextNumber = maxInstallmentNumber + 1;
          
          // Calculate next due date based on billing period
          const lastInstallment = allInstallments.find(i => i.installmentNumber === maxInstallmentNumber);
          let nextDueDate = new Date();
          
          if (lastInstallment) {
            if (contract.billingPeriod === 'annual') {
              // For annual plans, add 1 year maintaining same day
              if (lastInstallment.dueDate) {
                nextDueDate = addYears(new Date(lastInstallment.dueDate), 1);
              } else {
                nextDueDate = addYears(new Date(), 1);
              }
            } else {
              // For monthly plans, add 1 month maintaining same day
              if (lastInstallment.dueDate) {
                nextDueDate = addMonths(new Date(lastInstallment.dueDate), 1);
              } else {
                nextDueDate = addMonths(new Date(), 1);
              }
            }
          } else {
            // If no installments exist, use contract start date or today
            const baseDate = contract.startDate ? new Date(contract.startDate) : new Date();
            
            // Add the appropriate period maintaining same day
            nextDueDate = contract.billingPeriod === 'annual'
              ? addYears(baseDate, 1)
              : addMonths(baseDate, 1);
          }
          
          // Calculate period start and end
          let periodStart: Date;
          let periodEnd: Date;
          
          // Period starts where the previous period ended, or from contract start
          if (lastInstallment && lastInstallment.periodEnd) {
            periodStart = new Date(lastInstallment.periodEnd);
            periodStart.setDate(periodStart.getDate() + 1); // Day after last period ended
          } else {
            // First installment: period starts from contract start
            periodStart = contract.startDate ? new Date(contract.startDate) : new Date();
          }
          
          // Period ends one day before the next due date
          periodEnd = new Date(nextDueDate);
          periodEnd.setDate(periodEnd.getDate() - 1);
          
          // Create next installment
          // For annual plans, use annual amount from contract or calculate it
          let nextInstallmentAmount;
          if (contract.billingPeriod === 'annual') {
            if (contract.annualAmount && parseFloat(contract.annualAmount) > 0) {
              nextInstallmentAmount = contract.annualAmount;
            } else {
              // Fallback: calculate from monthly amount
              nextInstallmentAmount = (parseFloat(contract.monthlyAmount) * 12).toFixed(2);
            }
          } else {
            nextInstallmentAmount = contract.monthlyAmount;
          }
          
          const newInstallmentData = {
            contractId: contract.id,
            installmentNumber: nextNumber,
            dueDate: nextDueDate,
            periodStart: periodStart,
            periodEnd: periodEnd,
            amount: nextInstallmentAmount,
            status: 'pending' as const
          };
          
          try {
            const newInstallment = await storage.createContractInstallment(newInstallmentData);
            console.log(`✅ [INSTALLMENTS] Created next installment for contract ${contract.id}: Installment #${nextNumber}`);
            
            // Get pet and plan info for the response - use maps for consistency
            const pet = petsMap.get(contract.petId) || await storage.getPet(contract.petId);
            const plan = plansMap.get(contract.planId) || await storage.getPlan(contract.planId);
            
            // Add to nextInstallments for display
            const daysUntilDue = Math.ceil((nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            nextInstallments.push({
              id: newInstallment.id,
              contractId: contract.id,
              contractNumber: contract.contractNumber,
              installmentNumber: nextNumber,
              dueDate: nextDueDate.toISOString(),
              periodStart: periodStart.toISOString(),
              periodEnd: periodEnd.toISOString(),
              amount: parseFloat(nextInstallmentAmount),
              petName: pet?.name || 'Pet não encontrado',
              planName: plan?.name || 'Plano não encontrado',
              petId: contract.petId,
              planId: contract.planId,
              billingPeriod: contract.billingPeriod,
              status: 'current' as const,
              daysUntilDue
            });
          } catch (error) {
            console.error(`❌ [INSTALLMENTS] Error creating next installment for contract ${contract.id}:`, error);
          }
        }
      }
      
      res.json({
        paid: paidInstallments,
        current: nextInstallments,
        overdue: overdueInstallments,
        summary: {
          totalPaid: paidInstallments.reduce((sum, i) => sum + i.amount, 0),
          totalCurrent: nextInstallments.reduce((sum, i) => sum + i.amount, 0),
          totalOverdue: overdueInstallments.reduce((sum, i) => sum + i.amount, 0)
        }
      });
    } catch (error) {
      console.error("❌ Erro ao buscar mensalidades:", error);
      res.status(500).json({ 
        error: "Erro ao buscar mensalidades", 
        details: error instanceof Error ? error.message : 'Erro desconhecido' 
      });
    }
  });

  // ✅ SECURITY: Test endpoint protected with admin authentication - NEVER expose publicly
  app.post("/api/admin/test/generate-receipt", requireAdmin, async (req, res) => {
    try {
      const { contractId } = req.body;
      
      if (!contractId) {
        return res.status(400).json({ error: "contractId is required" });
      }
      
      // Get contract details
      const contract = await storage.getContract(contractId);
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }
      
      // Get client and pet details
      const client = await storage.getClientById(contract.clientId);
      const pet = contract.petId ? await storage.getPet(contract.petId) : null;
      const plan = await storage.getPlan(contract.planId);
      
      console.log("📄 [TEST-RECEIPT] Starting manual receipt generation", {
        contractId,
        cieloPaymentId: contract.cieloPaymentId,
        clientName: client?.fullName,
        petName: pet?.name
      });
      
      // Import and test PaymentReceiptService
      const { PaymentReceiptService } = await import("./services/payment-receipt-service.js");
      const receiptService = new PaymentReceiptService();
      
      const receiptData = {
        contractId: contract.id,
        cieloPaymentId: contract.cieloPaymentId || "test-payment-id",
        clientName: client?.fullName || "Test Client",
        clientEmail: client?.email || "test@example.com",
        petName: pet?.name || "Test Pet",
        planName: plan?.name || "Test Plan"
      };
      
      const result = await receiptService.generatePaymentReceipt(receiptData, `test_${Date.now()}`);
      
      console.log("📄 [TEST-RECEIPT] Result:", result);
      
      return res.json({
        success: result.success,
        result,
        contractDetails: {
          contractId: contract.id,
          cieloPaymentId: contract.cieloPaymentId,
          status: contract.status
        }
      });
      
    } catch (error: any) {
      console.error("❌ [TEST-RECEIPT] Error:", error);
      return res.status(500).json({ 
        error: "Failed to generate receipt", 
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined
      });
    }
  });

  // BACKFILL ENDPOINT - Link existing receipts to paid installments
  app.post("/api/admin/backfill-receipt-links", async (req, res) => {
    try {
      console.log("🔄 [BACKFILL] Iniciando vinculação de comprovantes existentes às mensalidades");
      
      // Get all paid installments
      const allContracts = await storage.getAllContracts();
      let updated = 0;
      let skipped = 0;
      let errors = 0;
      
      for (const contract of allContracts) {
        const installments = await storage.getContractInstallmentsByContractId(contract.id);
        
        for (const installment of installments) {
          // Skip if already has receiptId or not paid or no cieloPaymentId
          if (installment.paymentReceiptId || installment.status !== 'paid' || !installment.cieloPaymentId) {
            skipped++;
            continue;
          }
          
          try {
            // Find receipt by cieloPaymentId
            const receipt = await storage.getPaymentReceiptByCieloPaymentId(installment.cieloPaymentId);
            
            if (receipt) {
              // Update installment with receipt ID
              await storage.updateContractInstallment(installment.id, {
                paymentReceiptId: receipt.id
              });
              
              console.log(`✅ [BACKFILL] Vinculado receiptId ${receipt.id} à mensalidade ${installment.id}`);
              updated++;
            } else {
              console.warn(`⚠️ [BACKFILL] Comprovante não encontrado para mensalidade ${installment.id}`);
              skipped++;
            }
          } catch (error) {
            console.error(`❌ [BACKFILL] Erro ao processar mensalidade ${installment.id}:`, error);
            errors++;
          }
        }
      }
      
      return res.json({
        success: true,
        stats: {
          updated,
          skipped,
          errors
        },
        message: `Vinculação concluída: ${updated} atualizadas, ${skipped} ignoradas, ${errors} erros`
      });
      
    } catch (error: any) {
      console.error("❌ [BACKFILL] Erro:", error);
      return res.status(500).json({ 
        error: "Falha na vinculação", 
        details: error.message
      });
    }
  });

  // Contract Renewal Payment Endpoint
  app.post("/api/checkout/renewal", requireClient, async (req, res) => {
    try {
      console.log("🔄 [RENEWAL] Iniciando renovação de contrato");
      
      // SECURITY: Explicit whitelist to prevent mass assignment attacks
      const { contractId, paymentMethod, payment } = req.body;
      const clientId = req.session.client?.id;
      
      // SECURITY: Whitelist payment fields if credit card payment
      const whitelistedPayment = payment ? {
        cardNumber: payment.cardNumber,
        holder: payment.holder,
        expirationDate: payment.expirationDate,
        securityCode: payment.securityCode,
        installments: payment.installments
      } : undefined;
      
      // Validate required fields
      if (!contractId || !paymentMethod) {
        return res.status(400).json({ 
          error: "Dados incompletos - contractId e paymentMethod são obrigatórios" 
        });
      }

      // Get and validate contract
      const contract = await storage.getContract(contractId);
      if (!contract) {
        return res.status(404).json({ error: "Contrato não encontrado" });
      }
      
      // Verify ownership
      if (contract.clientId !== clientId) {
        return res.status(403).json({ error: "Não autorizado para renovar este contrato" });
      }

      // Get client and plan data
      const client = await storage.getClientById(clientId);
      if (!client) {
        return res.status(404).json({ error: "Cliente não encontrado" });
      }
      
      const plan = await storage.getPlan(contract.planId);
      if (!plan) {
        return res.status(404).json({ error: "Plano não encontrado" });
      }

      // Calculate amount server-side based on billing period
      let amount: number;
      if (contract.billingPeriod === 'annual') {
        amount = parseFloat(contract.annualAmount || '0') * 100; // Convert to cents
      } else {
        amount = parseFloat(contract.monthlyAmount || '0') * 100; // Convert to cents  
      }
      
      console.log(`💳 [RENEWAL] Processando: Contract ${contractId}, Amount: ${amount}, Method: ${paymentMethod}`);

      let paymentResult;
      let orderId = `RENEWAL_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      if (paymentMethod === 'credit_card' && whitelistedPayment) {
        // Process credit card payment
        const cieloService = new CieloService();
        const creditCardRequest = {
          merchantOrderId: orderId,
          customer: {
            name: client.fullName || 'Cliente',
            email: client.email,
            identity: client.cpf || undefined,
            identityType: 'CPF' as const,
            address: {
              street: client.address || '',
              number: client.number || 'S/N',
              complement: client.complement || '',
              zipCode: client.cep || '',
              city: client.city || '',
              state: client.state || '',
              country: 'BRA'
            }
          },
          payment: {
            type: 'CreditCard' as const,
            amount: amount,
            installments: whitelistedPayment.installments || 1,
            creditCard: {
              cardNumber: whitelistedPayment.cardNumber,
              holder: whitelistedPayment.holder,
              expirationDate: whitelistedPayment.expirationDate,
              securityCode: whitelistedPayment.securityCode
            }
          }
        };
        
        paymentResult = await cieloService.createCreditCardPayment(creditCardRequest);
        
        console.log(`💳 [RENEWAL] Resultado do pagamento:`, {
          paymentId: paymentResult.payment?.paymentId,
          status: paymentResult.payment?.status,
          approved: paymentResult.payment?.status === 2
        });
        
        if (paymentResult.payment?.status === 2) {
          // Payment approved - update contract
          await storage.updateContract(contractId, {
            status: 'active',
            receivedDate: new Date(),
            cieloPaymentId: paymentResult.payment.paymentId,
            proofOfSale: paymentResult.payment.proofOfSale,
            authorizationCode: paymentResult.payment.authorizationCode,
            tid: paymentResult.payment.tid,
            returnCode: paymentResult.payment.returnCode,
            returnMessage: paymentResult.payment.returnMessage,
            updatedAt: new Date()
          });

          console.log(`✅ [RENEWAL] Contrato renovado: ${contractId}`);
          
          // Generate payment receipt for credit card renewal
          try {
            const { PaymentReceiptService } = await import("./services/payment-receipt-service.js");
            const receiptService = new PaymentReceiptService();
            
            // Get pet data for receipt
            const pet = await storage.getPet(contract.petId);
            
            // Calcular período da parcela
            const periodStart = new Date();
            const periodEnd = calculatePeriodEnd(periodStart, contract.billingPeriod);
            
            const receiptData = {
              contractId: contract.id,
              cieloPaymentId: paymentResult.payment.paymentId,
              clientName: client.fullName || 'Cliente',
              clientEmail: client.email,
              clientCPF: client.cpf || undefined,
              clientPhone: client.phone,
              pets: [{
                name: pet?.name || 'Pet',
                species: pet?.species || 'Cão',
                breed: pet?.breed || undefined,
                age: typeof pet?.age === 'string' ? parseInt(pet.age, 10) || undefined : typeof pet?.age === 'number' ? pet.age : undefined,
                weight: typeof pet?.weight === 'string' ? parseFloat(pet.weight) || undefined : pet?.weight || undefined,
                sex: pet?.sex || undefined,
                planName: plan.name || 'BASIC',
                planType: plan.planType || 'BASIC',
                value: amount,
                discount: 0,
                discountedValue: amount
              }],
              paymentMethod: 'credit_card',
              billingPeriod: contract.billingPeriod, // Adiciona tipo de cobrança
              installmentPeriodStart: periodStart.toISOString().split('T')[0],
              installmentPeriodEnd: periodEnd.toISOString().split('T')[0],
              installments: payment.installments || 1,
              installmentValue: amount,
              totalDiscount: 0,
              finalAmount: amount
            };
            
            console.log(`📄 [CC-RENEWAL-RECEIPT] Gerando comprovante de renovação para contrato ${contract.contractNumber}`);
            const receiptResult = await receiptService.generatePaymentReceipt(receiptData, `renewal_cc_${paymentResult.payment.paymentId}`);
            
            if (receiptResult.success) {
              console.log("✅ [CC-RENEWAL-RECEIPT] Comprovante de renovação gerado com sucesso:", {
                receiptId: receiptResult.receiptId,
                receiptNumber: receiptResult.receiptNumber,
                contractNumber: contract.contractNumber
              });
            } else {
              console.error("⚠️ [CC-RENEWAL-RECEIPT] Falha ao gerar comprovante de renovação:", receiptResult.error);
            }
          } catch (receiptError) {
            console.error("❌ [CC-RENEWAL-RECEIPT] Erro ao gerar comprovante de renovação:", {
              error: receiptError instanceof Error ? receiptError.message : 'Erro desconhecido',
              contractId: contract.id
            });
            // Continue even if receipt generation fails - don't block the renewal
          }

          return res.json({
            success: true,
            orderId: orderId,
            paymentId: paymentResult.payment.paymentId,
            message: "Renovação realizada com sucesso"
          });
        } else {
          // Payment declined
          const errorMessage = paymentResult.payment?.returnMessage || 'Pagamento recusado';
          return res.status(400).json({ 
            error: errorMessage,
            code: paymentResult.payment?.returnCode 
          });
        }
        
      } else if (paymentMethod === 'pix') {
        // Generate PIX payment
        const cieloService = new CieloService();
        const pixRequest = {
          MerchantOrderId: orderId,
          Customer: {
            Name: client.fullName || 'Cliente',
            Identity: client.cpf || ''
          },
          Payment: {
            Type: 'Pix' as const,
            Amount: amount
          }
        };
        
        paymentResult = await cieloService.createPixPayment(pixRequest);
        
        if (paymentResult.payment?.qrCodeBase64) {
          console.log(`📱 [RENEWAL] PIX QR Code gerado: ${contractId}`);
          
          // Store PIX data for future verification (don't mark as active yet)
          await storage.updateContract(contractId, {
            pixQrCode: paymentResult.payment.qrCodeBase64,
            pixCode: paymentResult.payment.qrCodeString,
            cieloPaymentId: paymentResult.payment.paymentId,
            updatedAt: new Date()
            // Don't update status to active until payment confirmed
          });
          
          return res.json({
            success: true,
            orderId: orderId,
            paymentId: paymentResult.payment.paymentId,
            pixQrCode: paymentResult.payment.qrCodeBase64,
            pixCopyPaste: paymentResult.payment.qrCodeString,
            message: "QR Code PIX gerado com sucesso"
          });
        } else {
          return res.status(500).json({ error: "Erro ao gerar QR Code PIX" });
        }
      } else {
        return res.status(400).json({ error: "Método de pagamento inválido" });
      }
      
    } catch (error) {
      console.error("❌ [RENEWAL] Erro:", error);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : "Erro ao processar renovação" 
      });
    }
  });

  // Installment Payment Endpoint
  app.post("/api/checkout/installment-payment", requireClient, async (req, res) => {
    try {
      console.log("💳 [INSTALLMENT-PAYMENT] Iniciando pagamento de mensalidade");
      
      // SECURITY: Explicit whitelist to prevent mass assignment attacks
      const { installmentId, contractId, amount, paymentMethod, payment, coupon } = req.body;
      const clientId = req.session.client?.id;
      
      // SECURITY: Whitelist payment fields if credit card payment
      const whitelistedPayment = payment ? {
        creditCard: payment.creditCard ? {
          cardNumber: payment.creditCard.cardNumber,
          holder: payment.creditCard.holder,
          expirationDate: payment.creditCard.expirationDate,
          securityCode: payment.creditCard.securityCode
        } : undefined
      } : undefined;
      
      if (!clientId) {
        return res.status(401).json({ error: "Cliente não autenticado" });
      }
      
      if (!installmentId || !contractId || !amount || !paymentMethod) {
        return res.status(400).json({ error: "Dados incompletos para pagamento" });
      }
      
      // Validate coupon if provided (amount already comes discounted from frontend)
      let finalAmount = amount; // Use the amount directly from frontend (already has discount applied)
      let appliedCoupon = null;
      
      if (coupon) {
        try {
          console.log(`🎫 [INSTALLMENT-PAYMENT] Validando cupom: ${coupon}`);
          const couponResult = await storage.validateCoupon(coupon);
          
          if (couponResult.valid && couponResult.coupon) {
            const couponData = couponResult.coupon;
            appliedCoupon = couponData;
            
            // Note: Do NOT recalculate discount here - the amount already comes with discount applied from frontend
            console.log(`🎫 [INSTALLMENT-PAYMENT] Cupom validado: ${coupon} (${couponData.type === 'percentage' ? couponData.value + '%' : 'R$ ' + couponData.value}) - Valor final: R$ ${finalAmount}`);
          } else {
            console.log(`⚠️ [INSTALLMENT-PAYMENT] Cupom inválido ou expirado: ${coupon}`);
          }
        } catch (couponError) {
          console.error(`❌ [INSTALLMENT-PAYMENT] Erro ao validar cupom:`, couponError);
          // Continue without discount if there's an error
        }
      }
      
      // Get contract details
      const contract = await storage.getContract(contractId);
      if (!contract) {
        return res.status(404).json({ error: "Contrato não encontrado" });
      }
      
      // Verify contract belongs to client
      if (contract.clientId !== clientId) {
        return res.status(403).json({ error: "Acesso negado" });
      }
      
      // Check if this is a virtual installment (annual plans)
      let installment;
      let isVirtualInstallment = installmentId.startsWith('virtual-');
      
      if (isVirtualInstallment) {
        console.log(`📅 [INSTALLMENT-PAYMENT] Mensalidade virtual detectada - criando nova anualidade`);
        
        // For virtual installments, we need to create the actual installment
        // Get existing installments to determine the next installment number
        const existingInstallments = await storage.getContractInstallmentsByContractId(contractId);
        const nextInstallmentNumber = existingInstallments.length + 1;
        
        // Get the LAST PAID installment to use its due date as reference
        const paidInstallments = existingInstallments.filter(i => i.status === 'paid');
        const lastPaidInstallment = paidInstallments.length > 0 
          ? paidInstallments.reduce((latest, current) => 
              current.installmentNumber > latest.installmentNumber ? current : latest
            )
          : null;
        
        let dueDate: Date;
        let periodStart: Date;
        let periodEnd: Date;
        
        if (lastPaidInstallment && lastPaidInstallment.dueDate && lastPaidInstallment.periodEnd) {
          // Use the last paid installment's due date as reference
          const previousDueDate = new Date(lastPaidInstallment.dueDate);
          const isAnnual = contract.billingPeriod === 'annual';
          
          // Add 1 year or 1 month maintaining same day
          dueDate = isAnnual 
            ? addYears(previousDueDate, 1)
            : addMonths(previousDueDate, 1);
          
          // Period starts the day after the previous period ends
          periodStart = new Date(lastPaidInstallment.periodEnd);
          periodStart.setDate(periodStart.getDate() + 1);
          
          // Period ends based on coverage period
          periodEnd = isAnnual
            ? addYears(periodStart, 1)
            : addMonths(periodStart, 1);
          periodEnd.setDate(periodEnd.getDate() - 1); // Last day of period
          
          console.log(`📅 [INSTALLMENT-PAYMENT] Usando vencimento anterior como referência:`, {
            previousDueDate: previousDueDate.toISOString().split('T')[0],
            nextDueDate: dueDate.toISOString().split('T')[0],
            periodStart: periodStart.toISOString().split('T')[0],
            periodEnd: periodEnd.toISOString().split('T')[0]
          });
        } else {
          // Fallback: use contract start date if no previous installment exists
          const contractStart = new Date(contract.startDate);
          const isAnnual = contract.billingPeriod === 'annual';
          
          // For contracts without previous payments, first due date should be contract start date
          dueDate = new Date(contractStart);
          periodStart = new Date(contractStart);
          periodEnd = isAnnual ? addYears(periodStart, 1) : addMonths(periodStart, 1);
          periodEnd.setDate(periodEnd.getDate() - 1);
          
          console.log(`⚠️ [INSTALLMENT-PAYMENT] Nenhuma parcela paga anterior, usando data de início do contrato como referência`, {
            contractStartDate: contractStart.toISOString().split('T')[0],
            dueDate: dueDate.toISOString().split('T')[0]
          });
        }
        
        // Create the new installment
        const newInstallment = await storage.createContractInstallment({
          contractId: contractId,
          installmentNumber: nextInstallmentNumber,
          dueDate: dueDate,
          periodStart: periodStart,
          periodEnd: periodEnd,
          amount: contract.annualAmount || contract.monthlyAmount,
          status: 'pending'
        });
        
        installment = newInstallment;
        console.log(`✅ [INSTALLMENT-PAYMENT] Nova anualidade criada: ${installment.id}`);
      } else {
        // Get installment details for non-virtual installments
        installment = await storage.getContractInstallmentById(installmentId);
        if (!installment) {
          return res.status(404).json({ error: "Mensalidade não encontrada" });
        }
        
        // Verify installment belongs to contract
        if (installment.contractId !== contractId) {
          return res.status(400).json({ error: "Mensalidade não pertence ao contrato" });
        }
        
        // Check if installment is already paid
        if (installment.status === 'paid') {
          return res.status(400).json({ error: "Esta mensalidade já foi paga" });
        }
        
        // If there's an existing pending payment, log it (we'll allow overriding)
        if (installment.cieloPaymentId && installment.status !== 'paid') {
          console.log(`⚠️ [INSTALLMENT-PAYMENT] Mensalidade tem pagamento pendente anterior: ${installment.cieloPaymentId}`);
          console.log(`🔄 [INSTALLMENT-PAYMENT] Permitindo nova tentativa de pagamento...`);
        }
      }
      
      // Get client, pet and plan details
      const client = await storage.getClientById(clientId);
      if (!client) {
        return res.status(404).json({ error: "Cliente não encontrado" });
      }
      
      const pet = await storage.getPet(contract.petId);
      const plan = await storage.getPlan(contract.planId);
      
      const orderId = `INSTALLMENT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      let paymentResult;
      
      if (paymentMethod === 'credit' && whitelistedPayment?.creditCard) {
        console.log(`💳 [INSTALLMENT-PAYMENT] Processando pagamento com cartão de crédito`);
        
        const cieloService = new CieloService();
        const creditCardRequest = {
          merchantOrderId: orderId,
          customer: {
            name: client.fullName || 'Cliente',
            email: client.email,
            identity: client.cpf || undefined,
            identityType: 'CPF' as const,
            address: {
              street: client.address || '',
              number: client.number || 'S/N',
              complement: client.complement || '',
              zipCode: client.cep || '',
              city: client.city || '',
              state: client.state || '',
              country: 'BRA'
            }
          },
          payment: {
            type: 'CreditCard' as const,
            amount: Math.round(finalAmount * 100), // Convert to cents (with discount applied)
            installments: 1,
            creditCard: {
              cardNumber: whitelistedPayment.creditCard.cardNumber,
              holder: whitelistedPayment.creditCard.holder,
              expirationDate: whitelistedPayment.creditCard.expirationDate,
              securityCode: whitelistedPayment.creditCard.securityCode
            }
          }
        };
        
        paymentResult = await cieloService.createCreditCardPayment(creditCardRequest);
        
        console.log(`💳 [INSTALLMENT-PAYMENT] Resultado do pagamento:`, {
          paymentId: paymentResult.payment?.paymentId,
          status: paymentResult.payment?.status,
          approved: paymentResult.payment?.status === 2
        });
        
        if (paymentResult.payment?.status === 2) {
          // Payment approved - update installment (use actual ID, not virtual)
          await storage.updateContractInstallment(installment.id, {
            status: 'paid',
            paidAt: new Date(),
            updatedAt: new Date()
          });
          
          // Generate payment receipt
          try {
            const { PaymentReceiptService } = await import("./services/payment-receipt-service.js");
            const receiptService = new PaymentReceiptService();
            
            console.log(`🔍 [INSTALLMENT-PAYMENT-RECEIPT] DADOS DO CONTRATO:`, {
              contractId: contract.id,
              contractBillingPeriod: contract.billingPeriod,
              planName: plan?.name,
              installmentNumber: installment.installmentNumber
            });
            
            const receiptData = {
              contractId: contract.id,
              cieloPaymentId: paymentResult.payment.paymentId,
              clientName: client?.fullName || "Cliente",
              clientEmail: client?.email || "",
              petName: pet?.name || "Pet",
              planName: plan?.name || "Plano",
              paymentAmount: finalAmount,
              paymentDate: new Date().toISOString().split('T')[0],
              paymentMethod: 'credit_card',
              status: 'paid',
              billingPeriod: contract.billingPeriod || 'monthly', // Adiciona tipo de cobrança
              proofOfSale: paymentResult.payment.proofOfSale,
              authorizationCode: paymentResult.payment.authorizationCode,
              tid: paymentResult.payment.tid,
              returnCode: paymentResult.payment.returnCode?.toString(),
              returnMessage: paymentResult.payment.returnMessage,
              // Add installment period information
              installmentPeriodStart: installment.periodStart,
              installmentPeriodEnd: installment.periodEnd,
              installmentNumber: installment.installmentNumber,
              installmentDueDate: installment.dueDate
            };
            
            console.log(`🔍 [INSTALLMENT-PAYMENT-RECEIPT] RECEIPT DATA billingPeriod:`, receiptData.billingPeriod);
            
            const receiptResult = await receiptService.generatePaymentReceipt(
              receiptData, 
              `installment_${installmentId}_${Date.now()}`
            );
            
            if (receiptResult.success && receiptResult.receiptId) {
              // Update installment with receipt ID (use actual ID, not virtual)
              await storage.updateContractInstallment(installment.id, {
                paymentReceiptId: receiptResult.receiptId
              });
              console.log(`✅ [INSTALLMENT-PAYMENT-RECEIPT] Comprovante gerado:`, receiptResult.receiptId);
            }
          } catch (receiptError) {
            console.error("❌ [INSTALLMENT-PAYMENT-RECEIPT] Erro ao gerar comprovante:", receiptError);
            // Continue even if receipt generation fails
          }
          
          // For annual plans, automatically create the next installment after successful payment
          await createNextAnnualInstallmentIfNeeded(contractId, installment, '[CC-PAYMENT]');
          
          // Increment coupon usage if applied
          if (appliedCoupon && typeof appliedCoupon === 'object' && 'id' in appliedCoupon) {
            try {
              await storage.incrementCouponUsage((appliedCoupon as any).id);
              console.log(`🎫 [INSTALLMENT-PAYMENT] Uso do cupom incrementado: ${(appliedCoupon as any).code}`);
            } catch (couponError) {
              console.error("❌ [INSTALLMENT-PAYMENT] Erro ao incrementar cupom:", couponError);
            }
          }
          
          return res.json({
            success: true,
            orderId: orderId,
            paymentId: paymentResult.payment.paymentId,
            message: "Pagamento realizado com sucesso"
          });
        } else {
          // Payment declined
          const errorMessage = paymentResult.payment?.returnMessage || 'Pagamento recusado';
          return res.status(400).json({ 
            error: errorMessage,
            code: paymentResult.payment?.returnCode 
          });
        }
        
      } else if (paymentMethod === 'pix') {
        console.log(`📱 [INSTALLMENT-PAYMENT] Gerando PIX para pagamento`);
        
        const cieloService = new CieloService();
        const pixRequest = {
          MerchantOrderId: orderId,
          Customer: {
            Name: client.fullName || 'Cliente',
            Identity: client.cpf || '',
            IdentityType: 'CPF' as const
          },
          Payment: {
            Type: 'Pix' as const,
            Amount: Math.round(finalAmount * 100) // Convert to cents (with discount applied)
          }
        };
        
        paymentResult = await cieloService.createPixPayment(pixRequest);
        
        if (paymentResult.payment?.qrCodeBase64Image) {
          console.log(`📱 [INSTALLMENT-PAYMENT] PIX QR Code gerado para mensalidade: ${installment.id}`);
          
          // Store PIX payment ID for future verification
          // Note: Don't mark as paid yet, wait for webhook confirmation
          // If there's an old pending payment ID, it will be replaced
          const oldPaymentId = installment.cieloPaymentId;
          await storage.updateContractInstallment(installment.id, {
            cieloPaymentId: paymentResult.payment.paymentId,
            updatedAt: new Date()
          });
          
          if (oldPaymentId && oldPaymentId !== paymentResult.payment.paymentId) {
            console.log(`🔄 [INSTALLMENT-PAYMENT] Substituído PaymentId antigo: ${oldPaymentId} → ${paymentResult.payment.paymentId}`);
          } else {
            console.log(`✅ [INSTALLMENT-PAYMENT] PaymentId salvo na mensalidade: ${paymentResult.payment.paymentId}`);
          }
          
          return res.json({
            success: true,
            orderId: orderId,
            paymentId: paymentResult.payment.paymentId,
            pixQrCode: paymentResult.payment.qrCodeBase64Image,
            pixCode: paymentResult.payment.qrCodeString,
            message: "QR Code PIX gerado com sucesso"
          });
        } else {
          return res.status(500).json({ error: "Erro ao gerar QR Code PIX" });
        }
      } else {
        return res.status(400).json({ error: "Método de pagamento inválido" });
      }
      
    } catch (error) {
      console.error("❌ [INSTALLMENT-PAYMENT] Erro:", error);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : "Erro ao processar pagamento" 
      });
    }
  });

  // ==== ADMIN CRON JOBS ROUTES ====
  // Get cron jobs status
  app.get("/admin/api/cron/status", requireAdmin, async (req, res) => {
    try {
      const { renewalCronJobs } = await import('./cron/renewal-jobs.js');
      const status = renewalCronJobs.getStatus();
      res.json(status);
    } catch (error) {
      console.error("❌ [ADMIN] Error getting cron status:", error);
      res.status(500).json({ error: "Erro ao obter status dos cron jobs" });
    }
  });

  // Run specific cron job manually
  app.post("/admin/api/cron/run/:jobName", requireAdmin, async (req, res) => {
    try {
      const { renewalCronJobs } = await import('./cron/renewal-jobs.js');
      const jobName = req.params.jobName as 'upcoming' | 'renewal' | 'status' | 'overdue';
      
      if (!['upcoming', 'renewal', 'status', 'overdue'].includes(jobName)) {
        return res.status(400).json({ error: "Job inválido" });
      }

      console.log(`🔧 [ADMIN] Executando cron job manualmente: ${jobName}`);
      const result = await renewalCronJobs.runJob(jobName);
      
      res.json({ 
        success: true, 
        jobName,
        result,
        message: `Job ${jobName} executado com sucesso` 
      });
    } catch (error) {
      console.error(`❌ [ADMIN] Error running cron job ${req.params.jobName}:`, error);
      res.status(500).json({ 
        error: "Erro ao executar cron job",
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
