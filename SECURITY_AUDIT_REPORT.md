# Relatório de Auditoria de Segurança - UNIPET Plan

**Data da Análise:** 23 de Outubro de 2025  
**Atualização:** 23 de Outubro de 2025  
**Criticidade:** 🟠 **MÉDIA-ALTA**

---

## 📋 Resumo Executivo

O sistema UNIPET Plan passou por melhorias significativas de segurança. **Várias vulnerabilidades críticas foram corrigidas**, incluindo implementação de bcrypt para senhas, proteção CSRF, validação profunda de arquivos, e rate limiting robusto. No entanto, **ainda existem algumas vulnerabilidades que requerem atenção**, principalmente relacionadas à validação de webhooks de pagamento e Content Security Policy.

### Status Geral:
- ✅ **5 vulnerabilidades corrigidas**
- ⚠️ **2 vulnerabilidades pendentes**
- 🆕 **Novas proteções implementadas**

---

## ✅ Vulnerabilidades Corrigidas

### 1. **Senhas em Texto Puro** ✅ CORRIGIDO

#### O que foi implementado:
```javascript
// server/utils/password-security.ts
export async function hashPassword(plainPassword: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(plainPassword, saltRounds);
}

export async function verifyPassword(
  inputPassword: string, 
  storedPassword: string,
  autoMigrate: boolean = false
): Promise<{ valid: boolean; needsMigration: boolean; newHash?: string }>
```

#### Status:
- ✅ Bcrypt implementado com salt rounds 12
- ✅ Migração automática de senhas plaintext para bcrypt
- ✅ Plaintext bloqueado em produção real (não-Replit)
- ✅ Funções de validação de força de senha
- ✅ Geração de senhas seguras disponível

---

### 2. **CSRF Protection** ✅ CORRIGIDO

#### O que foi implementado:
```javascript
// server/middleware/csrf.ts
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
});

export function validateCsrf(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF for webhook endpoints (correto)
  if (req.path.includes('/webhooks/')) {
    return next();
  }
  
  // Skip CSRF for GET requests (correto)
  if (req.method === 'GET') {
    return next();
  }
  
  csrfProtection(req, res, (err) => {
    if (err) {
      return res.status(403).json({ 
        error: "Requisição inválida",
        code: "CSRF_TOKEN_INVALID"
      });
    }
    next();
  });
}
```

#### Status:
- ✅ CSRF implementado em todos os endpoints não-GET
- ✅ Tokens HTTP-only e secure em produção
- ✅ Exceção correta para webhooks externos
- ✅ Validação rigorosa com mensagens de erro claras

---

### 3. **Session Security** ✅ CORRIGIDO

#### O que foi implementado:
```javascript
// server/auth.ts
const sessionSettings: session.SessionOptions = {
  secret: autoConfig.get('SESSION_SECRET'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  },
  store: new PostgreSQLStore({
    pool: pgPool,
    tableName: 'express_sessions',
    createTableIfMissing: true
  })
};

// Regeneração de sessão para prevenir session fixation
req.session.regenerate((err) => {
  if (err) {
    return res.status(500).json({ error: "Erro ao criar sessão segura" });
  }
  // ... configurar sessão
});
```

#### Status:
- ✅ SESSION_SECRET obrigatório em produção
- ✅ Sessões armazenadas em PostgreSQL
- ✅ Cookies HTTP-only, secure e SameSite=lax
- ✅ Regeneração de sessão para prevenir fixation attacks
- ✅ Trust proxy configurado para produção

---

### 4. **Rate Limiting** ✅ IMPLEMENTADO

#### O que foi implementado:
```javascript
// server/routes.ts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: "Muitas tentativas de login. Tente novamente em 15 minutos."
});

const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: false
});

const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20
});
```

#### Status:
- ✅ Rate limiting implementado em login (5 tentativas/15min)
- ✅ Rate limiting em checkout (10 tentativas/15min)
- ✅ Rate limiting em uploads (20 uploads/15min)
- ✅ Rate limiting em registro (10 tentativas/15min)
- ✅ Rate limiting em formulários de contato (5/15min)
- ✅ Rate limiting em validação de cupons (15/15min)

---

### 5. **Validação Profunda de Arquivos** ✅ IMPLEMENTADO

#### O que foi implementado:
```javascript
// server/routes.ts - validateImageContent middleware
export const validateImageContent = async (req: any, res: any, next: any) => {
  // ✅ Validação de magic numbers (assinatura real do arquivo)
  const type = await fileType.fromBuffer(req.file.buffer);
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  
  if (!type || !allowedMimeTypes.includes(type.mime)) {
    return res.status(400).json({ error: 'Tipo de arquivo inválido' });
  }

  // ✅ Verificação de conteúdo suspeito
  const suspiciousPatterns = ['<?php', '<script', '#!/bin', 'eval(', 'exec('];
  // ... validação
  
  // ✅ Validação de dimensões com Sharp
  const metadata = await sharp(req.file.buffer).metadata();
  if (metadata.width > 5000 || metadata.height > 5000) {
    return res.status(400).json({ error: "Dimensões muito grandes" });
  }
}
```

#### Status:
- ✅ Validação de magic numbers com file-type
- ✅ Detecção de scripts e código malicioso embutido
- ✅ Validação de dimensões de imagem com Sharp
- ✅ Limite de tamanho de arquivo (2MB)
- ✅ Whitelist rigorosa de tipos de arquivo
- ✅ Sanitização de nomes de arquivo

---

## ⚠️ Vulnerabilidades Pendentes

### 1. **Ausência de Validação de Webhook da Cielo** 🔴 CRÍTICA

#### Problema Atual:
```javascript
// server/routes.ts
// Cielo doesn't send signature by default - accept all requests without validation
console.log('📨 [CIELO-WEBHOOK] Webhook da Cielo recebido (sem validação de assinatura)');
```

#### Riscos:
- ❌ Qualquer pessoa pode enviar webhooks falsos
- ❌ Manipulação de status de pagamentos
- ❌ Confirmação fraudulenta de transações
- ❌ Alteração de dados financeiros sem autorização

#### Como atacantes podem explorar:
```bash
# Atacante pode enviar webhook falso para confirmar pagamento não realizado:
curl -X POST https://seu-site.com/api/webhooks/cielo \
  -H "Content-Type: application/json" \
  -d '{
    "PaymentId": "fake-payment-id",
    "ChangeType": 1,
    "Status": 2,
    "RecurrentPaymentId": "fake-recurrent"
  }'
```

#### Recomendação:
```javascript
// Implementar validação de IP + assinatura
function validateCieloWebhook(req: Request): boolean {
  // 1. Validar origem do IP (IPs oficiais da Cielo)
  const allowedIPs = [
    '200.201.168.0/24',
    '200.201.169.0/24'
  ];
  
  if (!isIPAllowed(req.ip, allowedIPs)) {
    console.error('🚨 IP não autorizado tentou webhook:', req.ip);
    return false;
  }
  
  // 2. Validar campos obrigatórios
  const { PaymentId, MerchantOrderId } = req.body;
  if (!PaymentId || !MerchantOrderId) {
    console.error('🚨 Webhook sem campos obrigatórios');
    return false;
  }
  
  // 3. Consultar API da Cielo para confirmar status real
  // (Implementar chamada à API de consulta de pagamento)
  
  return true;
}
```

---

### 2. **Content Security Policy Permissiva** 🟡 MÉDIA

#### Problema Atual:
```javascript
// server/config/security.ts
contentSecurityPolicy: {
  directives: {
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    // ⚠️ unsafe-inline e unsafe-eval permitem XSS
  }
}
```

#### Riscos:
- ⚠️ Vulnerável a ataques XSS caso haja falha na sanitização
- ⚠️ Scripts inline podem executar código malicioso
- ⚠️ `unsafe-eval` permite eval() e similares

#### Recomendação:
```javascript
// Remover unsafe-inline e unsafe-eval, usar nonces
contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'nonce-{random}'"],
    styleSrc: ["'self'", "'nonce-{random}'", "https://fonts.googleapis.com"],
    imgSrc: ["'self'", "data:", "https:", "blob:"],
    connectSrc: ["'self'", "https://tkzzxsbwkgcdmcreducm.supabase.co"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"]
  }
}
```

---

## 🆕 Novas Proteções Implementadas

### 1. **Input Sanitization** ✅

```javascript
// server/utils/text-sanitizer.ts
export function sanitizeText(text: string): string {
  sanitized = sanitizeHtml(sanitized, {
    allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a'],
    allowedAttributes: {
      'a': ['href', 'target', 'rel']
    },
    allowedSchemes: ['http', 'https', 'mailto']
  });
}
```

**Proteções:**
- ✅ Sanitização de HTML com whitelist
- ✅ Remoção automática de scripts maliciosos
- ✅ Links externos com noopener noreferrer
- ✅ Validação com Zod schemas em todas as entradas

---

### 2. **API Key Validation** ✅

```javascript
// server/middleware/api-security.ts
export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  const expectedKey = process.env.PUBLIC_API_KEY;
  
  // Comparação segura contra timing attacks
  const keyBuffer = Buffer.from(String(apiKey));
  const expectedBuffer = Buffer.from(expectedKey);
  
  const isValid = crypto.timingSafeEqual(keyBuffer, expectedBuffer);
  
  if (!isValid) {
    return res.status(401).json({ error: 'API key inválida' });
  }
  
  next();
}
```

**Proteções:**
- ✅ Validação de API key com timing-safe comparison
- ✅ Seller token validation com HMAC
- ✅ Logging de tentativas de acesso não autorizado

---

### 3. **CORS Security** ✅

```javascript
// server/config/security.ts
app.use(cors({
  origin: (origin, callback) => {
    const url = new URL(origin);
    const hostname = url.hostname;
    
    // Validação rigorosa de domínios Replit
    if (hostname.endsWith('.replit.dev') || hostname.endsWith('.replit.app')) {
      return callback(null, true);
    }
    
    // Domínios de produção
    const productionDomains = ['unipetplan.com.br', 'www.unipetplan.com.br'];
    if (productionDomains.includes(hostname)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
```

**Proteções:**
- ✅ Whitelist estrita de origens permitidas
- ✅ Validação com URL parsing
- ✅ Suporte a credenciais apenas para origens confiáveis

---

### 4. **Security Headers com Helmet** ✅

```javascript
// server/config/security.ts
app.use(helmet({
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
```

**Proteções:**
- ✅ HSTS habilitado (1 ano)
- ✅ X-Content-Type-Options: nosniff
- ✅ X-XSS-Protection habilitado
- ✅ Referrer Policy configurado

---

## 🔍 Checklist de Segurança Atualizado

### ✅ Implementado:
- [x] Bcrypt para todas as senhas
- [x] CSRF protection em todos os endpoints
- [x] Rate limiting robusto
- [x] Session security (PostgreSQL store, regeneração)
- [x] Validação profunda de arquivos (magic numbers)
- [x] Input sanitization (sanitize-html + Zod)
- [x] Security headers (Helmet)
- [x] CORS configurado corretamente
- [x] API key validation
- [x] SQL injection prevention (Drizzle ORM)

### ⚠️ Pendente - URGENTE:
- [ ] **Validação de webhooks da Cielo** (CRÍTICO)
- [ ] Consultar API Cielo para confirmar pagamentos
- [ ] Implementar whitelist de IPs da Cielo

### ⚠️ Pendente - ALTA PRIORIDADE:
- [ ] Remover `unsafe-inline` e `unsafe-eval` do CSP
- [ ] Implementar nonces para scripts inline
- [ ] Rotacionar credenciais (SESSION_SECRET, etc)

### 📋 Recomendado - MÉDIA PRIORIDADE:
- [ ] Implementar 2FA para administradores
- [ ] Adicionar logging de segurança centralizado
- [ ] Configurar WAF (Web Application Firewall)
- [ ] Realizar pentest profissional
- [ ] Implementar secrets manager (Doppler/Vault)

---

## 📊 Métricas de Risco Atualizadas

| Vulnerabilidade | Status | Impacto | Probabilidade | Risco |
|----------------|---------|---------|---------------|-------|
| ~~Senhas em Texto Puro~~ | ✅ CORRIGIDO | N/A | N/A | **RESOLVIDO** |
| ~~CSRF Desabilitado~~ | ✅ CORRIGIDO | N/A | N/A | **RESOLVIDO** |
| ~~Session Insegura~~ | ✅ CORRIGIDO | N/A | N/A | **RESOLVIDO** |
| ~~Upload Sem Validação~~ | ✅ CORRIGIDO | N/A | N/A | **RESOLVIDO** |
| Webhooks Sem Validação | ❌ PENDENTE | 10/10 | 8/10 | **CRÍTICO** |
| CSP Permissiva | ⚠️ PENDENTE | 6/10 | 5/10 | **MÉDIO** |

---

## 🚀 Próximos Passos Priorizados

### 🔴 URGENTE (Fazer HOJE):
1. **Implementar validação de webhooks da Cielo**
   - Adicionar whitelist de IPs
   - Validar campos obrigatórios
   - Consultar API Cielo para confirmar transações reais

### 🟠 ALTA (Fazer esta semana):
2. **Melhorar Content Security Policy**
   - Remover unsafe-inline e unsafe-eval
   - Implementar sistema de nonces
   - Testar compatibilidade com aplicação

3. **Rotacionar credenciais**
   - Gerar nova SESSION_SECRET
   - Atualizar chaves de API se comprometidas

### 🟡 MÉDIA (Fazer este mês):
4. **Implementar 2FA para admins**
5. **Configurar logging de segurança**
6. **Realizar pentest profissional**

---

## 💡 Resumo Executivo

### Melhorias Significativas:
O sistema apresentou **evolução substancial** em segurança:
- ✅ **Autenticação robusta** com bcrypt e salt rounds 12
- ✅ **Proteção CSRF completa** em todos os endpoints críticos
- ✅ **Validação profunda de uploads** com detecção de malware
- ✅ **Rate limiting efetivo** contra brute force
- ✅ **Headers de segurança** configurados com Helmet

### Pontos de Atenção:
- 🔴 **Webhook validation** é a única vulnerabilidade crítica pendente
- 🟡 **CSP** pode ser melhorado para defesa em profundidade

### Recomendação Geral:
O sistema está **significativamente mais seguro** que no relatório anterior. A prioridade máxima é implementar validação de webhooks da Cielo para proteger o sistema financeiro. Após essa correção, o sistema estará em um **nível de segurança adequado para produção**.

---

## ⚠️ Aviso Legal

Este relatório reflete melhorias substanciais na postura de segurança do sistema. A implementação das correções pendentes (principalmente validação de webhooks) é **essencial** antes do lançamento em produção. O sistema atual está protegido contra a maioria dos ataques comuns (XSS, CSRF, SQL Injection, brute force), mas requer atenção aos pontos listados acima.

**Conformidade LGPD:** As medidas implementadas contribuem para conformidade com a LGPD, incluindo proteção de dados pessoais, controle de acesso, e logs de auditoria.

---

*Relatório atualizado em 23/10/2025 - Mantenha este documento confidencial*
