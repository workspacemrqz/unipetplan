# 🔒 Auditoria de Segurança - UNIPET PLAN

**Data da Auditoria:** 08 de Outubro de 2025  
**Sistema:** UNIPET PLAN - Sistema de Gestão de Planos de Saúde para Pets  
**Versão:** 1.0  
**Auditor:** Agente de Segurança Replit

---

## 📋 Sumário Executivo

Esta auditoria identificou **26 vulnerabilidades** categorizadas em 4 níveis de severidade:
- 🔴 **Críticas:** 5 vulnerabilidades
- 🟠 **Altas:** 8 vulnerabilidades  
- 🟡 **Médias:** 10 vulnerabilidades
- 🟢 **Baixas:** 3 vulnerabilidades

O sistema apresenta uma base de segurança sólida com múltiplas camadas de proteção implementadas, mas existem pontos críticos que necessitam de atenção imediata, especialmente relacionados a erros de tipagem, configurações de ambiente e validação de dados.

---

## 🔴 VULNERABILIDADES CRÍTICAS (Severidade: Crítica)

### 1. Erros TypeScript no Arquivo Principal de Rotas

**Arquivo:** `server/routes.ts`  
**Linhas:** Múltiplas (99 erros LSP detectados)  
**Severidade:** 🔴 Crítica

**Descrição:**
O arquivo `server/routes.ts` apresenta 99 erros de tipo TypeScript que podem causar falhas em runtime. Principais problemas:
- Propriedades não existentes sendo acessadas (`lastCheckup`, `birthdate`, `coverageOverride`)
- Tipos possivelmente undefined (`validatedPaymentData.customer`, `validatedPaymentData.payment`)
- Incompatibilidade de tipos em atribuições (Type 'string' is not assignable to type 'null')
- Arrays tipados incorretamente como `never[]`

**Impacto:**
- Falhas em runtime durante operações críticas de pagamento
- Crashes inesperados da aplicação
- Dados corrompidos ou perdidos
- Experiência de usuário degradada

**Recomendação:**
```typescript
// Corrigir verificações de null/undefined
if (validatedPaymentData?.customer?.name) {
  // usar validatedPaymentData.customer.name
}

// Adicionar propriedades faltantes aos schemas Zod
const petSchema = z.object({
  // ...campos existentes
  lastCheckup: z.string().optional(),
  birthdate: z.string().optional(),
});

// Corrigir tipagens de arrays
const petsData: Pet[] = []; // ao invés de never[]
```

**Prioridade:** URGENTE - Corrigir antes de deploy em produção

---

### 2. Bypass de Autenticação Admin em Desenvolvimento Pode Vazar para Produção

**Arquivo:** `server/auth.ts` (linhas 58-76)  
**Severidade:** 🔴 Crítica

**Descrição:**
O middleware `requireAdmin` implementa um bypass de autenticação que verifica apenas variáveis de ambiente para determinar se está em desenvolvimento local:

```typescript
const isLocalDev = process.env.NODE_ENV === 'development' && 
                   process.env.REPLIT_DEPLOYMENT !== 'true' &&
                   !process.env.RAILWAY_ENVIRONMENT &&
                   !process.env.VERCEL_ENV;

if (isLocalDev) {
  // Bypass completo de autenticação
  req.session.admin = {
    login: 'dev-admin',
    authenticated: true,
    role: 'superadmin',
    permissions: ['all']
  };
  return next();
}
```

**Impacto:**
- Se `NODE_ENV` for definido como 'development' acidentalmente em produção, TODA a autenticação admin é bypassada
- Acesso total ao sistema sem credenciais
- Possibilidade de criar usuários maliciosos
- Acesso a dados sensíveis de clientes e pagamentos

**Recomendação:**
```typescript
// Adicionar verificação mais rigorosa
const isLocalDev = process.env.NODE_ENV === 'development' && 
                   process.env.REPLIT_DEPLOYMENT !== 'true' &&
                   !process.env.RAILWAY_ENVIRONMENT &&
                   !process.env.VERCEL_ENV &&
                   process.env.ALLOW_DEV_BYPASS === 'true'; // Requer opt-in explícito

// Adicionar logging de segurança
if (isLocalDev) {
  console.warn('🚨 [SECURITY] Admin bypass ativado - APENAS DESENVOLVIMENTO');
  // ... bypass
}
```

**Prioridade:** URGENTE - Implementar salvaguardas adicionais

---

### 3. CIELO_WEBHOOK_SECRET Opcional em Produção Inicial

**Arquivo:** `server/config.ts` (linhas 197-204)  
**Severidade:** 🔴 Crítica

**Descrição:**
O código permite deploy em produção sem o `CIELO_WEBHOOK_SECRET`, apenas emitindo um warning:

```typescript
if ((isProduction || isStaging) && !process.env.CIELO_WEBHOOK_SECRET) {
  console.error('❌ CONFIGURAÇÃO DE SEGURANÇA OBRIGATÓRIA FALTANDO:');
  // ... mensagens de erro
  console.warn('🚨 AVISO: Webhook security desabilitado temporariamente para deploy');
  // NÃO LANÇA ERRO - PERMITE CONTINUAR
}
```

**Impacto:**
- Webhooks da Cielo podem ser aceitos sem validação de assinatura
- Possibilidade de ataques de replay
- Processamento de pagamentos falsos
- Perda financeira e fraude

**Recomendação:**
```typescript
if ((isProduction || isStaging) && !process.env.CIELO_WEBHOOK_SECRET) {
  console.error('❌ CRITICAL: CIELO_WEBHOOK_SECRET is mandatory in production!');
  throw new Error('SECURITY ERROR: Cannot start server without CIELO_WEBHOOK_SECRET in production');
}
```

**Prioridade:** URGENTE - Tornar obrigatório antes de processar pagamentos reais

---

### 4. Senhas de Admin em Variáveis de Ambiente Sem Rotação Automática

**Arquivo:** `server/routes.ts` (linhas 350-371), `server/config.ts`  
**Severidade:** 🔴 Crítica

**Descrição:**
O sistema aceita credenciais de admin diretamente de variáveis de ambiente (`LOGIN` e `SENHA`) sem mecanismo de rotação ou expiração:

```typescript
const adminLogin = process.env.LOGIN;
const adminPassword = process.env.SENHA;

if (!adminLogin || !adminPassword) {
  // Falha
}

// Apenas verifica se é bcrypt, mas não expira
if (adminPassword.startsWith('$2a$') || adminPassword.startsWith('$2b$')) {
  isValidPassword = await bcrypt.compare(loginData.password, adminPassword);
}
```

**Impacto:**
- Credenciais comprometidas permanecem válidas indefinidamente
- Sem controle de acesso baseado em tempo
- Dificuldade em revogar acesso de ex-funcionários
- Violação de compliance (LGPD exige controles de acesso)

**Recomendação:**
1. Implementar sistema de rotação de credenciais:
```typescript
// Adicionar timestamp de expiração
const CREDENTIAL_EXPIRY_DAYS = 90;

// No banco de dados
const adminUser = {
  email: process.env.LOGIN,
  passwordHash: process.env.SENHA,
  passwordUpdatedAt: new Date(),
  passwordExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
};

// Verificar expiração
if (new Date() > adminUser.passwordExpiresAt) {
  throw new Error('Credenciais expiradas. Atualize a senha.');
}
```

2. Usar tabela `users` do banco ao invés de env vars
3. Implementar 2FA para admins

**Prioridade:** ALTA - Implementar nas próximas 2 semanas

---

### 5. Falta de Validação de Tipos em Dados de Pagamento Críticos

**Arquivo:** `server/routes.ts` (linhas 2895-2916, 4470)  
**Severidade:** 🔴 Crítica

**Descrição:**
Dados de pagamento possivelmente undefined são usados sem verificação:

```typescript
const creditCardRequest = {
  customer: {
    name: validatedPaymentData.customer.name || // ⚠️ Pode ser undefined
           validatedPaymentData.payment.holder || 'Cliente',
    // ...
  },
  payment: {
    creditCard: {
      cardNumber: validatedPaymentData.payment.cardNumber, // ⚠️ Pode ser undefined
      holder: validatedPaymentData.payment.holder,
      expirationDate: validatedPaymentData.payment.expirationDate,
      securityCode: validatedPaymentData.payment.securityCode
    }
  }
};
```

**Impacto:**
- Envio de `undefined` para gateway de pagamento
- Falha na transação
- Perda de vendas
- Dados de cliente corrompidos

**Recomendação:**
```typescript
// Validar antes de usar
if (!validatedPaymentData.payment || 
    !validatedPaymentData.payment.cardNumber ||
    !validatedPaymentData.payment.holder ||
    !validatedPaymentData.payment.expirationDate ||
    !validatedPaymentData.payment.securityCode) {
  return res.status(400).json({ 
    error: 'Dados de pagamento incompletos' 
  });
}

// Ou usar optional chaining com fallback
const cardData = {
  cardNumber: validatedPaymentData.payment?.cardNumber ?? '',
  holder: validatedPaymentData.payment?.holder ?? '',
  // ...
};

// Validar que nenhum campo está vazio
if (Object.values(cardData).some(v => !v)) {
  throw new Error('Dados de cartão obrigatórios estão faltando');
}
```

**Prioridade:** URGENTE - Corrigir antes de processar pagamentos

---

## 🟠 VULNERABILIDADES ALTAS (Severidade: Alta)

### 6. Exposição de Informações Sensíveis em Logs de Desenvolvimento

**Arquivo:** `server/index.ts` (linhas 50-52)  
**Severidade:** 🟠 Alta

**Descrição:**
Logs em desenvolvimento podem expor dados sensíveis mesmo após sanitização:

```typescript
if (process.env.NODE_ENV !== 'production' && capturedJsonResponse) {
  const sanitizedResponse = sanitizeObject(capturedJsonResponse);
  logLine += ` :: ${JSON.stringify(sanitizedResponse)}`;
}
```

**Impacto:**
- Logs contendo dados parcialmente sanitizados podem vazar
- Desenvolvedores podem ter acesso a dados de produção em ambiente dev
- Compliance LGPD pode ser violado

**Recomendação:**
```typescript
// Sanitizar mais agressivamente em dev
const sanitizedResponse = deepSanitize(capturedJsonResponse, {
  removeFields: ['password', 'cardNumber', 'securityCode', 'cpf', 'token'],
  maskFields: ['email', 'phone'],
  maxDepth: 3 // Evitar logs gigantes
});

// Adicionar flag de controle
if (process.env.ENABLE_DETAILED_LOGS === 'true') {
  logLine += ` :: ${JSON.stringify(sanitizedResponse)}`;
}
```

**Prioridade:** ALTA

---

### 7. Rate Limiting Insuficiente em Endpoints Críticos

**Arquivo:** `server/routes.ts` (linhas 305-311, 394-400)  
**Severidade:** 🟠 Alta

**Descrição:**
Alguns rate limits são muito permissivos:

```typescript
// Login admin - 10 tentativas em 15 minutos
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Muito permissivo
});

// Password verify - 20 em 5 minutos
const passwordVerifyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20, // Muito permissivo para brute force
});
```

**Impacto:**
- Vulnerável a ataques de força bruta
- 10 tentativas podem quebrar senhas fracas
- 20 verificações de senha em 5 minutos é excessivo

**Recomendação:**
```typescript
// Tornar mais restritivo
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3, // Apenas 3 tentativas
  skipSuccessfulRequests: true // Não contar logins bem-sucedidos
});

// Implementar delay progressivo
const passwordVerifyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  handler: (req, res) => {
    const retryAfter = Math.ceil(req.rateLimit.resetTime / 1000);
    res.status(429).json({
      error: 'Muitas tentativas',
      retryAfter,
      message: `Tente novamente em ${retryAfter} segundos`
    });
  }
});
```

**Prioridade:** ALTA

---

### 8. CORS Permissivo em Desenvolvimento

**Arquivo:** `server/config/security.ts` (linhas 40-45)  
**Severidade:** 🟠 Alta

**Descrição:**
CORS permite requisições sem origin em desenvolvimento:

```typescript
app.use(cors({
  origin: (origin, callback) => {
    // Permitir requisições sem origin em dev
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    // ...
  }
}));
```

**Impacto:**
- Em ambiente de desenvolvimento compartilhado, qualquer origem pode fazer requisições
- Testes podem vazar dados
- CSRF ainda possível apesar de proteção

**Recomendação:**
```typescript
// Sempre validar origin, mesmo em dev
origin: (origin, callback) => {
  const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? ['https://unipetplan.com.br', 'https://www.unipetplan.com.br']
    : ['http://localhost:5000', 'http://127.0.0.1:5000'];
  
  if (!origin) {
    // Apenas permitir para requisições do mesmo servidor
    if (process.env.ALLOW_NO_ORIGIN === 'true') {
      return callback(null, true);
    }
    return callback(new Error('Origin is required'));
  }
  
  if (allowedOrigins.includes(origin)) {
    callback(null, true);
  } else {
    console.warn(`⚠️ [CORS] Blocked: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  }
}
```

**Prioridade:** ALTA

---

### 9. Falta de Timeout em Operações de Banco de Dados

**Arquivo:** `server/db.ts` (linhas 16-30)  
**Severidade:** 🟠 Alta

**Descrição:**
Pool de conexões sem timeout global para queries:

```typescript
const poolConfig = {
  connectionString: autoConfig.get('DATABASE_URL'),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  acquireTimeoutMillis: 10000,
  // ⚠️ SEM QUERY TIMEOUT
};
```

**Impacto:**
- Queries lentas podem travar o sistema
- Possibilidade de DoS através de queries complexas
- Recursos não liberados

**Recomendação:**
```typescript
const poolConfig = {
  // ... configurações existentes
  statement_timeout: 30000, // 30 segundos para queries
  query_timeout: 30000,
  idle_in_transaction_session_timeout: 60000, // 60 segundos
};

// Adicionar wrapper para queries
async function queryWithTimeout<T>(
  query: string, 
  params: any[], 
  timeoutMs = 30000
): Promise<T> {
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
  );
  
  const queryPromise = db.query(query, params);
  
  return Promise.race([queryPromise, timeoutPromise]) as Promise<T>;
}
```

**Prioridade:** ALTA

---

### 10. Webhook Signature Validation Bypass em Desenvolvimento

**Arquivo:** `server/services/cielo-webhook-service.ts` (linhas 46-59)  
**Severidade:** 🟠 Alta

**Descrição:**
Validação de assinatura do webhook é completamente ignorada em desenvolvimento:

```typescript
if (!this.webhookSecret) {
  if (isProduction || isStaging) {
    return false;
  } else {
    // ⚠️ Bypass completo em dev
    console.warn('⚠️ Webhook secret não configurado, pulando validação');
    return true;
  }
}
```

**Impacto:**
- Desenvolvedores podem processar webhooks falsos
- Testes podem criar transações inválidas no banco
- Dados corrompidos em ambiente de desenvolvimento

**Recomendação:**
```typescript
if (!this.webhookSecret) {
  if (isProduction || isStaging) {
    console.error('🚨 SECURITY BREACH ATTEMPT');
    return false;
  } else {
    // Ainda em dev, mas exigir opt-in explícito
    if (process.env.ALLOW_WEBHOOK_BYPASS !== 'true') {
      console.error('⚠️ Webhook sem secret - configure CIELO_WEBHOOK_SECRET');
      return false;
    }
    console.warn('⚠️ [DEV] Webhook bypass ativado - APENAS PARA TESTES');
    return true;
  }
}
```

**Prioridade:** ALTA

---

### 11. Processamento de Upload sem Verificação de Conteúdo Real

**Arquivo:** `server/routes.ts` (linhas 87-109)  
**Severidade:** 🟠 Alta

**Descrição:**
Multer valida apenas MIME type e extensão, mas não o conteúdo real do arquivo:

```typescript
fileFilter: (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  
  // ⚠️ MIME type pode ser falsificado
  if (!allowedTypes.includes(file.mimetype)) {
    cb(new Error('Tipo não permitido'));
    return;
  }
  
  // ⚠️ Extensão pode ser manipulada
  const fileExtension = file.originalname.toLowerCase()
    .slice(file.originalname.lastIndexOf('.'));
  if (!allowedExtensions.includes(fileExtension)) {
    cb(new Error('Extensão não permitida'));
    return;
  }
  
  cb(null, true);
}
```

**Impacto:**
- Upload de malware disfarçado de imagem
- Scripts executáveis com extensão .jpg
- XSS através de SVG maliciosos (se permitido no futuro)

**Recomendação:**
```typescript
import fileType from 'file-type';

fileFilter: async (req, file, cb) => {
  try {
    // Ler os primeiros bytes para validar tipo real
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      file.stream.on('data', chunk => chunks.push(chunk));
      file.stream.on('end', () => resolve(Buffer.concat(chunks)));
      file.stream.on('error', reject);
    });
    
    // Validar magic number
    const type = await fileType.fromBuffer(buffer);
    
    if (!type || !['image/jpeg', 'image/png', 'image/webp'].includes(type.mime)) {
      return cb(new Error('Tipo de arquivo inválido detectado'));
    }
    
    // Validar que não é executável
    if (buffer.includes(Buffer.from('<?php')) || 
        buffer.includes(Buffer.from('<script'))) {
      return cb(new Error('Conteúdo suspeito detectado'));
    }
    
    cb(null, true);
  } catch (error) {
    cb(new Error('Erro ao validar arquivo'));
  }
}
```

**Prioridade:** ALTA

---

### 12. Falta de Proteção Contra Session Fixation

**Arquivo:** `server/auth.ts` (linhas 24-44)  
**Severidade:** 🟠 Alta

**Descrição:**
Sessões não são regeneradas após login:

```typescript
app.use(session(sessionSettings));

// Em routes.ts - login
req.session.admin = { 
  login: user.email,
  authenticated: true,
  // ...
};
// ⚠️ SEM req.session.regenerate()
```

**Impacto:**
- Vulnerável a ataques de fixação de sessão
- Atacante pode obter sessão válida antes do login
- Session hijacking facilitado

**Recomendação:**
```typescript
// No login bem-sucedido
req.session.regenerate((err) => {
  if (err) {
    return res.status(500).json({ error: 'Erro ao criar sessão' });
  }
  
  req.session.admin = { 
    login: user.email,
    authenticated: true,
    userId: user.id,
    role: user.role,
    permissions: user.permissions,
    loginAt: new Date(),
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  };
  
  req.session.save((err) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao salvar sessão' });
    }
    res.json({ success: true });
  });
});
```

**Prioridade:** ALTA

---

### 13. Falta de Validação de Input em Webhook Processing

**Arquivo:** `server/routes.ts` (linhas 2298-2330)  
**Severidade:** 🟠 Alta

**Descrição:**
Webhook processa dados sem validação rigorosa de schema:

```typescript
let notification;
try {
  notification = JSON.parse(rawBody);
} catch (error) {
  // Apenas log de erro, sem validação de campos obrigatórios
}

// ⚠️ Usa diretamente sem validar campos
const result = await webhookService.processNotification(notification);
```

**Impacto:**
- Dados malformados podem causar crashes
- Campos undefined causam erros de runtime
- Possibilidade de injection através de campos não sanitizados

**Recomendação:**
```typescript
// Criar schema Zod para webhook
const cieloWebhookSchema = z.object({
  PaymentId: z.string().uuid(),
  ChangeType: z.number().int().min(1).max(3),
  ClientOrderId: z.string().optional(),
  RequestId: z.string().optional()
});

// Validar antes de processar
let notification;
try {
  const parsed = JSON.parse(rawBody);
  notification = cieloWebhookSchema.parse(parsed);
} catch (error) {
  console.error('❌ [WEBHOOK] Dados inválidos:', error);
  return res.status(400).json({ 
    error: 'Formato de webhook inválido',
    details: error instanceof z.ZodError ? error.errors : 'Parse error'
  });
}

// Processar com dados validados
const result = await webhookService.processNotification(notification);
```

**Prioridade:** ALTA

---

## 🟡 VULNERABILIDADES MÉDIAS (Severidade: Média)

### 14. Falta de Content Security Policy Específica

**Arquivo:** `server/config/security.ts` (linhas 7-19)  
**Severidade:** 🟡 Média

**Descrição:**
CSP permite 'unsafe-inline' para scripts e estilos:

```typescript
contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    scriptSrc: ["'self'", "'unsafe-inline'"], // ⚠️ Perigoso
    // ...
  }
}
```

**Impacto:**
- XSS através de scripts inline
- Possível injeção de estilos maliciosos

**Recomendação:**
```typescript
// Usar nonces ao invés de unsafe-inline
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});

contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`],
    styleSrc: ["'self'", "https://fonts.googleapis.com"],
    // ...
  }
}
```

**Prioridade:** MÉDIA

---

### 15. Logs de Configuração Expondo Presença de Secrets

**Arquivo:** `server/config.ts` (linhas 17-21)  
**Severidade:** 🟡 Média

**Descrição:**
Sistema loga presença de variáveis sensíveis:

```typescript
console.log('   LOGIN:', process.env.LOGIN ? '✅ Presente' : '❌ Ausente');
console.log('   SENHA:', process.env.SENHA ? '✅ Presente' : '❌ Ausente');
```

**Impacto:**
- Logs podem indicar a atacantes quais secrets existem
- Information disclosure em logs de erro

**Recomendação:**
```typescript
// Apenas em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  console.log('   LOGIN:', process.env.LOGIN ? '✅ Presente' : '❌ Ausente');
  console.log('   SENHA:', process.env.SENHA ? '✅ Presente' : '❌ Ausente');
}

// Em produção, apenas validar silenciosamente
if (!process.env.LOGIN || !process.env.SENHA) {
  throw new Error('Missing required credentials');
}
```

**Prioridade:** MÉDIA

---

### 16. Falta de Validação de Tamanho em Requests JSON

**Arquivo:** `server/index.ts` (linhas 20-26)  
**Severidade:** 🟡 Média

**Descrição:**
Limite de 10MB para JSON é muito alto:

```typescript
app.use(express.json({
  limit: '10mb', // ⚠️ Muito permissivo
  // ...
}));
```

**Impacto:**
- DoS através de payloads gigantes
- Consumo excessivo de memória
- Lentidão no processamento

**Recomendação:**
```typescript
// Limites diferenciados por rota
app.use('/api/upload', express.json({ limit: '5mb' }));
app.use('/api/checkout', express.json({ limit: '1mb' }));
app.use('/api', express.json({ limit: '100kb' })); // Default menor

// Middleware para monitorar tamanho
app.use((req, res, next) => {
  const size = parseInt(req.headers['content-length'] || '0');
  if (size > 10 * 1024 * 1024) { // 10MB absoluto
    return res.status(413).json({ error: 'Payload muito grande' });
  }
  next();
});
```

**Prioridade:** MÉDIA

---

### 17. Falta de Proteção Contra Clickjacking

**Arquivo:** `server/config/security.ts`  
**Severidade:** 🟡 Média

**Descrição:**
Helmet configurado mas sem X-Frame-Options explícito:

```typescript
app.use(helmet({
  // ... outras configurações
  // ⚠️ Sem frameSrc ou X-Frame-Options
}));
```

**Impacto:**
- Aplicação pode ser carregada em iframe
- Vulnerável a clickjacking

**Recomendação:**
```typescript
app.use(helmet({
  // ... configurações existentes
  frameguard: {
    action: 'deny' // Ou 'sameorigin' se precisar de iframes internos
  },
  contentSecurityPolicy: {
    directives: {
      // ... outras diretivas
      frameAncestors: ["'none'"]
    }
  }
}));
```

**Prioridade:** MÉDIA

---

### 18. Falta de Monitoramento de Tentativas de Login Falhadas

**Arquivo:** `server/routes.ts` (linha 314)  
**Severidade:** 🟡 Média

**Descrição:**
Não há rastreamento persistente de tentativas de login:

```typescript
app.post("/admin/api/login", adminLoginLimiter, async (req, res) => {
  // ... validação
  if (isValidPassword && user.isActive) {
    // Login bem-sucedido
  } else {
    // ⚠️ Apenas log, sem persistência
    console.log("❌ [ADMIN-LOGIN] Invalid credentials");
    res.status(401).json({ error: "Credenciais inválidas" });
  }
});
```

**Impacto:**
- Dificulta detecção de ataques
- Sem alerta de múltiplas tentativas
- Impossível bloquear IPs maliciosos

**Recomendação:**
```typescript
// Criar tabela de login attempts
const loginAttempts = pgTable("login_attempts", {
  id: varchar("id").primaryKey(),
  email: text("email").notNull(),
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent"),
  successful: boolean("successful").notNull(),
  attemptedAt: timestamp("attempted_at").defaultNow()
});

// No login
async function recordLoginAttempt(email: string, ip: string, success: boolean) {
  await db.insert(loginAttempts).values({
    id: randomUUID(),
    email,
    ipAddress: ip,
    userAgent: req.get('user-agent'),
    successful: success,
    attemptedAt: new Date()
  });
  
  // Verificar tentativas recentes
  const recentAttempts = await db
    .select()
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.email, email),
        eq(loginAttempts.successful, false),
        gte(loginAttempts.attemptedAt, new Date(Date.now() - 15 * 60 * 1000))
      )
    );
  
  if (recentAttempts.length >= 5) {
    // Bloquear temporariamente
    throw new Error('Conta bloqueada temporariamente');
  }
}
```

**Prioridade:** MÉDIA

---

### 19. Sem Validação de Strength de Senha

**Arquivo:** Sistema geral  
**Severidade:** 🟡 Média

**Descrição:**
Não há validação de complexidade de senha ao criar usuários:

```typescript
const hashedPassword = await bcrypt.hash(validatedData.password, 10);
// ⚠️ Sem verificar força da senha
```

**Impacto:**
- Usuários podem usar senhas fracas
- Vulnerável a ataques de dicionário
- Comprometimento de contas

**Recomendação:**
```typescript
import passwordValidator from 'password-validator';

const passwordSchema = new passwordValidator();
passwordSchema
  .is().min(12)
  .is().max(100)
  .has().uppercase()
  .has().lowercase()
  .has().digits(2)
  .has().symbols(1)
  .has().not().spaces();

// No endpoint de criação de usuário
if (!passwordSchema.validate(validatedData.password)) {
  const errors = passwordSchema.validate(validatedData.password, { list: true });
  return res.status(400).json({ 
    error: 'Senha não atende aos requisitos',
    requirements: {
      minLength: 12,
      uppercase: true,
      lowercase: true,
      numbers: 2,
      symbols: 1,
      noSpaces: true
    },
    failed: errors
  });
}
```

**Prioridade:** MÉDIA

---

### 20. Falta de Sanitização em Nomes de Arquivo Uploadados

**Arquivo:** `server/routes.ts` (linha 106)  
**Severidade:** 🟡 Média

**Descrição:**
Sanitização básica mas não completa:

```typescript
file.originalname = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
```

**Impacto:**
- Caracteres Unicode maliciosos podem passar
- Path traversal com nomes especiais
- Sobrescrita de arquivos

**Recomendação:**
```typescript
import sanitize from 'sanitize-filename';

// Sanitização mais rigorosa
const sanitizeFilename = (filename: string): string => {
  // Remover qualquer path
  const basename = filename.split('/').pop()?.split('\\').pop() || 'unnamed';
  
  // Sanitizar com biblioteca especializada
  const sanitized = sanitize(basename);
  
  // Garantir extensão válida
  const ext = sanitized.slice(sanitized.lastIndexOf('.')).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
    throw new Error('Extensão inválida');
  }
  
  // Limitar tamanho do nome
  const maxLength = 100;
  const name = sanitized.slice(0, sanitized.lastIndexOf('.'));
  if (name.length > maxLength) {
    return name.slice(0, maxLength) + ext;
  }
  
  return sanitized;
};

// Usar no fileFilter
file.originalname = sanitizeFilename(file.originalname);
```

**Prioridade:** MÉDIA

---

### 21. Falta de Validação de Referrer/Origin em Operações Sensíveis

**Arquivo:** Sistema geral  
**Severidade:** 🟡 Média

**Descrição:**
Além de CSRF token, falta validação de Referer:

```typescript
// Apenas CSRF, sem verificar origin
app.post("/api/checkout/process", validateCsrf, async (req, res) => {
  // ...
});
```

**Impacto:**
- CSRF token pode ser roubado via XSS
- Double-submit cookie bypass possível

**Recomendação:**
```typescript
// Middleware adicional
const validateReferer = (req: Request, res: Response, next: NextFunction) => {
  const referer = req.get('referer') || req.get('origin');
  const allowedDomains = [
    'https://unipetplan.com.br',
    'https://www.unipetplan.com.br'
  ];
  
  if (process.env.NODE_ENV !== 'production') {
    allowedDomains.push('http://localhost:5000');
  }
  
  if (!referer || !allowedDomains.some(d => referer.startsWith(d))) {
    return res.status(403).json({ 
      error: 'Requisição inválida - origem não autorizada' 
    });
  }
  
  next();
};

// Aplicar em rotas sensíveis
app.post("/api/checkout/process", 
  validateCsrf, 
  validateReferer, 
  async (req, res) => {
    // ...
  }
);
```

**Prioridade:** MÉDIA

---

### 22. Falta de Proteção Contra Mass Assignment em Alguns Endpoints

**Arquivo:** `server/routes.ts` (múltiplas linhas)  
**Severidade:** 🟡 Média

**Descrição:**
Alguns endpoints não fazem whitelist completo:

```typescript
// Bom exemplo (com whitelist)
const whitelistedClientData = {
  full_name: clientData.full_name,
  email: clientData.email,
  phone: clientData.phone,
  birthdate: clientData.birthdate
};

// Mau exemplo em alguns lugares
const updatedData = { ...req.body }; // ⚠️ Aceita qualquer campo
await storage.update(id, updatedData);
```

**Impacto:**
- Usuários podem modificar campos não autorizados
- Escalação de privilégios
- Modificação de dados administrativos

**Recomendação:**
```typescript
// Sempre usar Zod schema para validação
const updateUserSchema = z.object({
  fullName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional()
}).strict(); // ⚠️ Rejeita campos extras

// No endpoint
const validatedData = updateUserSchema.parse(req.body);
await storage.update(id, validatedData);
```

**Prioridade:** MÉDIA

---

### 23. Falta de Sanitização em Mensagens de Erro para Usuário

**Arquivo:** Vários arquivos  
**Severidade:** 🟡 Média

**Descrição:**
Algumas mensagens de erro expõem detalhes internos:

```typescript
catch (error) {
  console.error("Erro:", error);
  res.status(500).json({ 
    error: error.message // ⚠️ Pode expor stack trace
  });
}
```

**Impacto:**
- Information disclosure
- Revelação de estrutura do banco
- Paths internos expostos

**Recomendação:**
```typescript
// Criar mapeamento de erros
const sanitizeError = (error: any): string => {
  // Em produção, mensagens genéricas
  if (process.env.NODE_ENV === 'production') {
    return 'Ocorreu um erro. Por favor, tente novamente.';
  }
  
  // Em desenvolvimento, mais detalhes mas ainda sanitizados
  if (error.code === '23505') {
    return 'Registro duplicado';
  }
  
  if (error.code === '23503') {
    return 'Referência inválida';
  }
  
  return 'Erro no servidor';
};

// Usar em catch
catch (error) {
  console.error("[ERROR]", error); // Log completo apenas no servidor
  res.status(500).json({ 
    error: sanitizeError(error),
    errorId: randomUUID() // Para rastreamento
  });
}
```

**Prioridade:** MÉDIA

---

## 🟢 VULNERABILIDADES BAIXAS (Severidade: Baixa)

### 24. Falta de SRI (Subresource Integrity) para CDNs Externos

**Arquivo:** Frontend (assumido)  
**Severidade:** 🟢 Baixa

**Descrição:**
Se houver uso de CDNs externas sem SRI:

```html
<!-- ⚠️ Sem SRI -->
<link href="https://fonts.googleapis.com/css2?family=Inter" rel="stylesheet">
```

**Impacto:**
- CDN comprometido pode injetar código malicioso
- MITM pode modificar recursos

**Recomendação:**
```html
<!-- Com SRI -->
<link 
  href="https://fonts.googleapis.com/css2?family=Inter" 
  rel="stylesheet"
  integrity="sha384-xxx..."
  crossorigin="anonymous"
>
```

**Prioridade:** BAIXA

---

### 25. Falta de HTTP Strict Transport Security Preload

**Arquivo:** `server/config/security.ts` (linhas 21-25)  
**Severidade:** 🟢 Baixa

**Descrição:**
HSTS configurado mas sem preload:

```typescript
hsts: {
  maxAge: 31536000,
  includeSubDomains: true,
  preload: true // ⚠️ Está true mas não está na lista de preload
}
```

**Impacto:**
- Primeira requisição pode ser HTTP
- Downgrade attack possível

**Recomendação:**
1. Submeter domínio para HSTS preload list: https://hstspreload.org/
2. Aguardar inclusão na lista
3. Testar com:
```bash
curl -I https://unipetplan.com.br | grep -i strict
```

**Prioridade:** BAIXA

---

### 26. Falta de Security Headers Adicionais

**Arquivo:** `server/config/security.ts`  
**Severidade:** 🟢 Baixa

**Descrição:**
Alguns headers de segurança adicionais poderiam ser incluídos:

```typescript
// Faltando:
// - Permissions-Policy
// - Cross-Origin-Embedder-Policy
// - Cross-Origin-Opener-Policy
```

**Impacto:**
- Menor proteção contra features não utilizadas
- Isolamento de contexto poderia ser melhor

**Recomendação:**
```typescript
app.use(helmet({
  // ... configurações existentes
  permissionsPolicy: {
    features: {
      geolocation: ["'none'"],
      microphone: ["'none'"],
      camera: ["'none'"],
      payment: ["'self'"],
      usb: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-origin" }
}));
```

**Prioridade:** BAIXA

---

## 📊 Estatísticas da Auditoria

### Distribuição por Severidade
- 🔴 **Críticas:** 5 (19%)
- 🟠 **Altas:** 8 (31%)
- 🟡 **Médias:** 10 (38%)
- 🟢 **Baixas:** 3 (12%)

### Distribuição por Categoria
- **Autenticação/Autorização:** 6 vulnerabilidades
- **Validação de Dados:** 8 vulnerabilidades
- **Configuração:** 5 vulnerabilidades
- **Logging/Monitoramento:** 3 vulnerabilidades
- **Processamento de Pagamentos:** 4 vulnerabilidades

### Áreas Mais Críticas
1. **server/routes.ts** - 99 erros LSP + múltiplas vulnerabilidades
2. **Sistema de Autenticação** - Bypass em dev, falta de rotação de credenciais
3. **Processamento de Pagamentos** - Validação insuficiente, dados undefined
4. **Webhooks** - Validação opcional, bypass em dev
5. **Upload de Arquivos** - Validação superficial de tipo

---

## 🎯 Plano de Ação Recomendado

### Fase 1 - URGENTE (1-2 dias)
1. ✅ Corrigir todos os 99 erros TypeScript em `server/routes.ts`
2. ✅ Implementar validação rigorosa em dados de pagamento
3. ✅ Tornar `CIELO_WEBHOOK_SECRET` obrigatório em produção
4. ✅ Adicionar verificações null/undefined em operações críticas
5. ✅ Implementar regeneração de sessão após login

### Fase 2 - ALTA PRIORIDADE (1 semana)
1. ✅ Fortalecer rate limiting em endpoints de autenticação
2. ✅ Implementar validação real de conteúdo em uploads
3. ✅ Adicionar timeout global em queries de banco
4. ✅ Melhorar validação de webhooks com Zod schema
5. ✅ Corrigir CORS para ambientes de desenvolvimento
6. ✅ Adicionar sistema de rotação de credenciais

### Fase 3 - MÉDIA PRIORIDADE (2-3 semanas)
1. ✅ Implementar CSP com nonces
2. ✅ Adicionar monitoramento de tentativas de login
3. ✅ Implementar validação de força de senha
4. ✅ Melhorar sanitização de erros
5. ✅ Adicionar validação de Referer em operações sensíveis
6. ✅ Limitar tamanho de payloads por endpoint

### Fase 4 - BAIXA PRIORIDADE (1 mês)
1. ✅ Adicionar SRI em recursos externos
2. ✅ Submeter para HSTS preload
3. ✅ Adicionar headers de segurança adicionais
4. ✅ Implementar auditoria completa de logs

---

## 🛡️ Boas Práticas de Segurança Recomendadas

### Para Desenvolvimento
1. **Nunca** commitar arquivos `.env` no git
2. Usar `pre-commit hooks` para detectar secrets
3. Manter dependências atualizadas (`npm audit`)
4. Realizar code review focado em segurança
5. Testar com dados realistas mas anonimizados

### Para Produção
1. Usar variáveis de ambiente do host (não .env)
2. Habilitar HTTPS com certificado válido
3. Configurar backup automatizado do banco
4. Implementar logging centralizado (ex: Sentry)
5. Realizar pentests periódicos
6. Manter plano de resposta a incidentes

### Para Conformidade (LGPD)
1. Implementar consentimento explícito
2. Adicionar funcionalidade de exportação de dados
3. Implementar exclusão completa de dados
4. Criar registro de processamento de dados
5. Nomear DPO (Data Protection Officer)
6. Implementar Privacy by Design

---

## 📝 Conclusão

O sistema UNIPET PLAN demonstra um **nível intermediário-avançado de segurança**, com várias proteções implementadas corretamente:

### ✅ Pontos Fortes
- CSRF protection implementado
- Rate limiting configurado
- Helmet e CORS ativos
- Sanitização de inputs em múltiplas camadas
- Uso de bcrypt para senhas
- Webhook signature validation
- Drizzle ORM prevenindo SQL injection
- Sessões em PostgreSQL

### ⚠️ Pontos Críticos a Corrigir
- Erros TypeScript que podem causar crashes
- Bypass de autenticação permissivo
- Validação opcional de webhooks em produção
- Falta de timeout em operações de banco
- Validação insuficiente em dados de pagamento

### 🎯 Próximos Passos
1. **Imediato:** Corrigir erros críticos (Fase 1)
2. **Curto prazo:** Implementar melhorias de alta prioridade (Fase 2)
3. **Médio prazo:** Adicionar controles adicionais (Fase 3)
4. **Longo prazo:** Compliance e hardening (Fase 4)

**Recomendação Final:** O sistema está **APTO para produção COM RESSALVAS**. As vulnerabilidades críticas devem ser corrigidas antes de processar pagamentos reais ou lidar com dados sensíveis de clientes em escala.

---

**Auditoria realizada em:** 08/10/2025  
**Próxima auditoria recomendada:** 08/01/2026 (ou após implementação das correções)  
**Contato para dúvidas:** [Equipe de Segurança]
