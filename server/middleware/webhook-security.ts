import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { isIPv4, isIPv6 } from 'net';

/**
 * Valida configuração de segurança do webhook na inicialização
 * CIELO_WEBHOOK_SECRET é opcional - se configurado, valida header customizado
 */
export function validateWebhookSecurityConfig(): void {
  const webhookSecret = process.env.CIELO_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.warn('⚠️ [WEBHOOK-SECURITY] CIELO_WEBHOOK_SECRET não configurado');
    console.warn('⚠️ [WEBHOOK-SECURITY] Webhooks validados apenas por IP (menos seguro)');
    console.warn('💡 [WEBHOOK-SECURITY] Recomendado: Configure header customizado na Cielo e defina CIELO_WEBHOOK_SECRET');
  } else {
    console.log('✅ [WEBHOOK-SECURITY] CIELO_WEBHOOK_SECRET configurado - validação por header ativa');
  }
}

// Lista de IPs autorizados da Cielo (produção e sandbox)
const CIELO_ALLOWED_IPS = [
  // IPs de produção da Cielo
  '200.201.168.0/24', // Range da Cielo
  '200.201.174.0/24', // Range secundário da Cielo
  // IPs do sandbox (desenvolvimento)
  '200.201.163.0/24',
  // Localhost para testes locais (remover em produção)
  '127.0.0.1',
  '::1'
];

// Lista de User-Agents esperados da Cielo
const CIELO_USER_AGENTS = [
  'Cielo-Webhook',
  'CieloEcommerce',
  'Cielo/1.0'
];

/**
 * Verifica se um IP está dentro de um range CIDR
 */
function isIPInRange(ip: string, cidr: string): boolean {
  if (cidr.includes('/')) {
    const [rangeIp, mask] = cidr.split('/');
    const maskBits = parseInt(mask, 10);
    
    // Converter IPs para números para comparação
    const ipParts = ip.split('.');
    const rangeParts = rangeIp.split('.');
    
    if (ipParts.length !== 4 || rangeParts.length !== 4) return false;
    
    const ipNum = ipParts.reduce((acc, part) => (acc << 8) + parseInt(part), 0);
    const rangeNum = rangeParts.reduce((acc, part) => (acc << 8) + parseInt(part), 0);
    
    const maskNum = (0xFFFFFFFF << (32 - maskBits)) >>> 0;
    
    return (ipNum & maskNum) === (rangeNum & maskNum);
  } else {
    return ip === cidr;
  }
}

/**
 * Valida se o IP de origem é autorizado
 */
export function validateWebhookIP(req: Request): boolean {
  // Obter IP real considerando proxies
  const clientIp = req.ip || 
                   req.headers['x-forwarded-for'] as string || 
                   req.headers['x-real-ip'] as string ||
                   req.connection.remoteAddress || '';
  
  // Limpar IP (remover prefixo IPv6 se presente)
  const cleanIp = clientIp.replace('::ffff:', '').split(',')[0].trim();
  
  // Em desenvolvimento, permitir localhost
  if (process.env.NODE_ENV === 'development') {
    if (cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp === 'localhost') {
      console.log('✅ [WEBHOOK-SECURITY] IP localhost permitido em desenvolvimento:', cleanIp);
      return true;
    }
  }
  
  // Verificar se o IP está na lista de permitidos
  const isAllowed = CIELO_ALLOWED_IPS.some(allowedIp => isIPInRange(cleanIp, allowedIp));
  
  if (!isAllowed) {
    console.warn('⚠️ [WEBHOOK-SECURITY] IP não autorizado tentou acessar webhook:', {
      ip: cleanIp,
      originalIp: clientIp,
      headers: {
        'x-forwarded-for': req.headers['x-forwarded-for'],
        'x-real-ip': req.headers['x-real-ip']
      }
    });
  }
  
  return isAllowed;
}

/**
 * Valida o header customizado do webhook
 * A Cielo envia headers customizados (key/value) configurados no painel
 * Não é assinatura HMAC - apenas comparação de valor estático
 */
export function validateWebhookHeader(req: Request, secret: string): boolean {
  // Tentar vários nomes possíveis de header
  const headerValue = req.headers['x-webhook-secret'] || 
                      req.headers['x-cielo-webhook'] ||
                      req.headers['webhook-secret'] ||
                      req.headers['authorization'];
  
  if (!headerValue || typeof headerValue !== 'string') {
    console.warn('⚠️ [WEBHOOK-SECURITY] Webhook sem header de autenticação');
    return false;
  }
  
  // Comparação segura contra timing attacks
  const receivedBuffer = Buffer.from(headerValue);
  const expectedBuffer = Buffer.from(secret);
  
  if (receivedBuffer.length !== expectedBuffer.length) {
    console.warn('⚠️ [WEBHOOK-SECURITY] Tamanho do header inválido');
    return false;
  }
  
  const isValid = crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
  
  if (!isValid) {
    console.warn('⚠️ [WEBHOOK-SECURITY] Header de autenticação inválido');
  }
  
  return isValid;
}

/**
 * Valida o User-Agent do webhook
 */
export function validateWebhookUserAgent(req: Request): boolean {
  const userAgent = req.headers['user-agent'] || '';
  
  // Em produção, validar User-Agent
  if (process.env.NODE_ENV === 'production') {
    const isValidAgent = CIELO_USER_AGENTS.some(agent => 
      userAgent.includes(agent)
    );
    
    if (!isValidAgent) {
      console.warn('⚠️ [WEBHOOK-SECURITY] User-Agent suspeito:', userAgent);
      return false;
    }
  }
  
  return true;
}

/**
 * Middleware para validar webhooks da Cielo
 */
export function validateCieloWebhook(req: Request, res: Response, next: NextFunction) {
  const correlationId = req.headers['x-correlation-id'] || 
                       Math.random().toString(36).substring(7);
  
  // Log de tentativa de acesso ao webhook
  console.log('🔍 [WEBHOOK-SECURITY] Validando webhook', {
    correlationId,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    hasSignature: !!req.headers['x-cielo-signature'],
    timestamp: new Date().toISOString()
  });
  
  // 1. Validar IP de origem
  if (!validateWebhookIP(req)) {
    console.error('❌ [WEBHOOK-SECURITY] IP não autorizado', {
      correlationId,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    return res.status(403).json({ 
      error: 'Acesso negado',
      correlationId 
    });
  }
  
  // 2. Validar User-Agent (apenas warning, não bloquear)
  if (!validateWebhookUserAgent(req)) {
    console.warn('⚠️ [WEBHOOK-SECURITY] User-Agent suspeito mas permitindo acesso', {
      correlationId,
      userAgent: req.headers['user-agent']
    });
  }
  
  // 3. Validar header customizado (OPCIONAL - se CIELO_WEBHOOK_SECRET estiver configurado)
  const webhookSecret = process.env.CIELO_WEBHOOK_SECRET;
  
  if (webhookSecret) {
    // Se o secret está configurado, validar o header customizado
    if (!validateWebhookHeader(req, webhookSecret)) {
      console.error('❌ [WEBHOOK-SECURITY] Header de autenticação inválido', {
        correlationId,
        timestamp: new Date().toISOString()
      });
      return res.status(401).json({ 
        error: 'Autenticação inválida',
        correlationId 
      });
    }
    console.log('✅ [WEBHOOK-SECURITY] Header de autenticação válido', { correlationId });
  } else {
    // Se não há secret configurado, apenas avisar (validação apenas por IP)
    console.warn('⚠️ [WEBHOOK-SECURITY] Webhook aceito apenas com validação de IP (sem header de autenticação)');
  }
  
  // Parse JSON após validação (body ainda é um Buffer)
  if (Buffer.isBuffer(req.body)) {
    try {
      const jsonBody = JSON.parse(req.body.toString('utf8'));
      // Substituir Buffer body pelo JSON parseado para o handler
      req.body = jsonBody;
    } catch (error) {
      console.error('❌ [WEBHOOK-SECURITY] Erro ao parsear JSON do webhook', error);
      return res.status(400).json({ 
        error: 'Payload inválido',
        correlationId 
      });
    }
  }
  
  // Webhook validado com sucesso
  console.log('✅ [WEBHOOK-SECURITY] Webhook autorizado', {
    correlationId,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
  
  // Adicionar correlationId ao request para uso posterior
  (req as any).correlationId = correlationId;
  
  next();
}

/**
 * Rate limiting específico para webhooks
 */
export function webhookRateLimiter() {
  const requests = new Map<string, number[]>();
  const windowMs = 60000; // 1 minuto
  const maxRequests = 100; // 100 requests por minuto por IP
  
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    
    // Obter requests anteriores deste IP
    const ipRequests = requests.get(ip) || [];
    
    // Filtrar requests dentro da janela de tempo
    const validRequests = ipRequests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= maxRequests) {
      console.warn('⚠️ [WEBHOOK-SECURITY] Rate limit excedido para IP:', ip);
      return res.status(429).json({ 
        error: 'Muitas requisições. Tente novamente mais tarde.' 
      });
    }
    
    // Adicionar request atual
    validRequests.push(now);
    requests.set(ip, validRequests);
    
    // Limpar IPs antigos periodicamente
    if (Math.random() < 0.01) { // 1% de chance de limpeza
      for (const [key, times] of requests.entries()) {
        const valid = times.filter(time => now - time < windowMs);
        if (valid.length === 0) {
          requests.delete(key);
        } else {
          requests.set(key, valid);
        }
      }
    }
    
    next();
  };
}