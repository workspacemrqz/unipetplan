import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Middleware para validar API key para endpoints sensíveis
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  const expectedKey = process.env.PUBLIC_API_KEY;
  
  // Se não há chave configurada, bloquear acesso em produção
  if (!expectedKey) {
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ [API-SECURITY] PUBLIC_API_KEY não configurada em produção');
      return res.status(503).json({ 
        error: 'Serviço temporariamente indisponível' 
      });
    } else {
      // Em desenvolvimento, permitir com warning
      console.warn('⚠️ [API-SECURITY] PUBLIC_API_KEY não configurada - permitindo acesso em desenvolvimento');
      return next();
    }
  }
  
  // Validar API key
  if (!apiKey) {
    return res.status(401).json({ 
      error: 'API key necessária',
      message: 'Inclua x-api-key no header da requisição'
    });
  }
  
  // Comparação segura contra timing attacks
  const keyBuffer = Buffer.from(String(apiKey));
  const expectedBuffer = Buffer.from(expectedKey);
  
  if (keyBuffer.length !== expectedBuffer.length) {
    logSecurityEvent('invalid_api_key', req);
    return res.status(401).json({ error: 'API key inválida' });
  }
  
  const isValid = crypto.timingSafeEqual(keyBuffer, expectedBuffer);
  
  if (!isValid) {
    logSecurityEvent('invalid_api_key', req);
    return res.status(401).json({ error: 'API key inválida' });
  }
  
  next();
}

/**
 * Middleware para validar token de seller
 */
export function validateSellerToken(req: Request, res: Response, next: NextFunction) {
  const { sellerId } = req.params;
  const token = req.headers['x-seller-token'] || req.query.token;
  
  if (!sellerId) {
    return res.status(400).json({ error: 'ID do vendedor necessário' });
  }
  
  // Token deve ser um hash do sellerId + secret
  const secret = process.env.SELLER_TOKEN_SECRET || 'default-seller-secret';
  const expectedToken = crypto
    .createHmac('sha256', secret)
    .update(sellerId)
    .digest('hex');
  
  if (!token) {
    return res.status(401).json({ 
      error: 'Token de vendedor necessário',
      message: 'Inclua x-seller-token no header ou token na query'
    });
  }
  
  // Comparação segura
  const tokenBuffer = Buffer.from(String(token));
  const expectedBuffer = Buffer.from(expectedToken);
  
  if (tokenBuffer.length !== expectedBuffer.length) {
    logSecurityEvent('invalid_seller_token', req);
    return res.status(401).json({ error: 'Token inválido' });
  }
  
  const isValid = crypto.timingSafeEqual(tokenBuffer, expectedBuffer);
  
  if (!isValid) {
    logSecurityEvent('invalid_seller_token', req);
    return res.status(401).json({ error: 'Token inválido' });
  }
  
  next();
}

/**
 * Middleware para rate limiting por IP
 */
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();

export function ipRateLimit(maxRequests: number = 60, windowMs: number = 60000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    
    // Obter ou criar contador para este IP
    let ipData = ipRequestCounts.get(ip);
    
    if (!ipData || now > ipData.resetTime) {
      // Resetar contador
      ipData = {
        count: 0,
        resetTime: now + windowMs
      };
      ipRequestCounts.set(ip, ipData);
    }
    
    // Incrementar contador
    ipData.count++;
    
    // Verificar limite
    if (ipData.count > maxRequests) {
      const retryAfter = Math.ceil((ipData.resetTime - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      
      logSecurityEvent('rate_limit_exceeded', req);
      
      return res.status(429).json({
        error: 'Muitas requisições',
        message: `Limite de ${maxRequests} requisições por minuto excedido`,
        retryAfter
      });
    }
    
    // Adicionar headers informativos
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(maxRequests - ipData.count));
    res.setHeader('X-RateLimit-Reset', new Date(ipData.resetTime).toISOString());
    
    next();
  };
}

/**
 * Middleware para validar origem das requisições
 */
export function validateOrigin(allowedOrigins: string[] = []) {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin || req.headers.referer;
    
    // Se não há origem, pode ser uma requisição direta (ex: Postman)
    if (!origin) {
      // Em produção, bloquear requisições sem origem para endpoints sensíveis
      if (process.env.NODE_ENV === 'production') {
        console.warn('⚠️ [API-SECURITY] Requisição sem origem bloqueada');
        return res.status(403).json({ 
          error: 'Origem não permitida' 
        });
      }
      return next();
    }
    
    // Verificar se a origem está na lista permitida
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed === '*') return true;
      return origin.includes(allowed);
    });
    
    if (!isAllowed) {
      logSecurityEvent('invalid_origin', req, { origin });
      return res.status(403).json({ 
        error: 'Origem não permitida' 
      });
    }
    
    next();
  };
}

/**
 * Registrar eventos de segurança
 */
function logSecurityEvent(eventType: string, req: Request, extra: any = {}) {
  const event = {
    type: eventType,
    timestamp: new Date().toISOString(),
    ip: req.ip,
    method: req.method,
    path: req.path,
    userAgent: req.headers['user-agent'],
    ...extra
  };
  
  console.log('🔒 [SECURITY-EVENT]', JSON.stringify(event));
  
  // Aqui você pode adicionar integração com sistema de monitoramento
  // como Sentry, DataDog, ou salvar em banco de dados
}

/**
 * Middleware combinado para proteção de endpoints públicos
 */
export function protectPublicEndpoint(options: {
  requireKey?: boolean;
  rateLimit?: { max: number; window: number };
  allowedOrigins?: string[];
} = {}) {
  const middlewares: any[] = [];
  
  // Rate limiting
  if (options.rateLimit) {
    middlewares.push(ipRateLimit(options.rateLimit.max, options.rateLimit.window));
  }
  
  // Validação de origem
  if (options.allowedOrigins) {
    middlewares.push(validateOrigin(options.allowedOrigins));
  }
  
  // API key
  if (options.requireKey) {
    middlewares.push(requireApiKey);
  }
  
  return middlewares;
}