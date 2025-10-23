# Relatório de Auditoria de Segurança - UNIPET Plan

**Data da Análise:** 23 de Outubro de 2025  
**Criticidade:** 🔴 **ALTA**

---

## 📋 Resumo Executivo

Foram identificadas **múltiplas vulnerabilidades críticas** no sistema UNIPET Plan que podem comprometer a segurança dos dados, permitir acesso não autorizado e expor informações sensíveis. As credenciais compartilhadas estão expostas e podem ser exploradas por atacantes mal-intencionados.

---

## 🚨 Vulnerabilidades Críticas Identificadas

### 1. **Exposição de Credenciais Sensíveis** 🔴 CRÍTICA

#### Problema:
As seguintes credenciais estão expostas e podem ser acessadas:

- **SESSION_SECRET**: Chave usada para assinar tokens JWT
- **CIELO_MERCHANT_KEY**: Chave de API de pagamentos
- **DATABASE_URL**: URL completa do banco com senha
- **SUPABASE_ANON_KEY**: Chave de acesso ao Supabase
- **LOGIN/SENHA**: Credenciais administrativas em texto puro

#### Riscos:
- Acesso não autorizado ao banco de dados
- Processamento fraudulento de pagamentos
- Falsificação de sessões de usuários
- Acesso administrativo completo ao sistema

#### Como hackers podem explorar:
1. **Varredura de repositórios**: Se o código for versionado com essas credenciais
2. **Logs do servidor**: As credenciais podem aparecer em logs de erro
3. **Arquivos de backup**: Backups mal protegidos com arquivos .env
4. **Engenharia social**: Funcionários podem expor inadvertidamente

---

### 2. **Ausência de Validação de Webhook da Cielo** 🔴 CRÍTICA

#### Problema:
```javascript
// server/routes.ts linha 4138-4139
// Cielo doesn't send signature by default - accept all requests without validation
console.log('📨 [CIELO-WEBHOOK] Webhook da Cielo recebido (sem validação de assinatura)');
```

#### Riscos:
- Qualquer pessoa pode enviar webhooks falsos
- Manipulação de status de pagamentos
- Confirmação fraudulenta de transações
- Alteração de dados financeiros

#### Como explorar:
```bash
# Atacante pode enviar webhook falso:
curl -X POST https://seu-site.com/api/webhooks/cielo \
  -H "Content-Type: application/json" \
  -d '{"PaymentId":"fake","ChangeType":1,"Status":"Paid"}'
```

---

### 3. **Senhas em Texto Puro em Produção** 🔴 CRÍTICA

#### Problema:
```javascript
// server/routes.ts linha 636-642
if (isProduction && !isReplit) {
  // Production: Plain text passwords not allowed
  console.error("Plain text password detected in production");
} else {
  // Development/Replit: Allow plain text password
  isValidPassword = loginData.password === adminPassword;
}
```

#### Riscos:
- Senha administrativa pode ser vista por qualquer pessoa com acesso ao servidor
- Vulnerável a ataques de força bruta
- Sem histórico de alteração de senhas

---

### 4. **Exposição de Dados Sensíveis em Logs** 🟠 ALTA

#### Problema:
```javascript
// server/config.ts linha 17-21
console.log('LOGIN:', process.env.LOGIN ? '✅ Configurado' : '❌ Ausente');
console.log('SENHA:', process.env.SENHA ? '✅ Configurado' : '❌ Ausente');
```

#### Riscos:
- Logs podem expor informações sobre a configuração
- Metadata sobre credenciais disponível em logs

---

### 5. **CSRF Parcialmente Desabilitado** 🟡 MÉDIA

#### Problema:
```javascript
// server/routes.ts linha 550-551
// NOTE: CSRF removed from login because frontend is not configured
```

#### Riscos:
- Ataques CSRF no endpoint de login
- Sessões podem ser criadas sem consentimento do usuário

---

### 6. **Content Security Policy Permissiva** 🟡 MÉDIA

#### Problema:
```javascript
// server/config/security.ts linha 12
scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
```

#### Riscos:
- Vulnerável a ataques XSS
- Scripts maliciosos podem ser executados
- `unsafe-eval` permite execução de código dinâmico

---

### 7. **Endpoints Públicos Sem Autenticação** 🟡 MÉDIA

#### Problema:
- `/api/network-units/:slug/info` - Expõe informações das unidades
- `/api/seller/track-conversion` - Permite rastreamento sem validação
- `/api/seller/analytics/:sellerId` - Dados de analytics públicos

#### Riscos:
- Vazamento de informações do negócio
- Manipulação de métricas
- Exposição de dados sensíveis

---

## 🛡️ Recomendações de Segurança

### Prioridade 1 - URGENTE (Fazer Imediatamente):

#### 1. **Rotacionar TODAS as Credenciais**
```bash
# Gerar nova SESSION_SECRET
openssl rand -base64 64

# Gerar nova senha com bcrypt
npm install bcryptjs
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('suaNovaSenhaSegura', 10));"
```

#### 2. **Implementar Validação de Webhooks**
```javascript
// Adicionar validação de assinatura
function validateCieloWebhook(req) {
  const signature = req.headers['x-cielo-signature'];
  const payload = req.body;
  
  // Validar origem do IP
  const allowedIPs = ['200.201.168.0/24']; // IPs da Cielo
  if (!isIPAllowed(req.ip, allowedIPs)) {
    throw new Error('IP não autorizado');
  }
  
  // Validar assinatura HMAC
  const expectedSignature = crypto
    .createHmac('sha256', process.env.CIELO_WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');
    
  if (signature !== expectedSignature) {
    throw new Error('Assinatura inválida');
  }
}
```

#### 3. **Usar Bcrypt Para Todas as Senhas**
```javascript
// Nunca armazenar senhas em texto puro
const hashedPassword = await bcrypt.hash(plainPassword, 12);

// Verificar senha
const isValid = await bcrypt.compare(inputPassword, hashedPassword);
```

### Prioridade 2 - ALTA (Fazer em 24-48 horas):

#### 4. **Implementar Secrets Manager**
```javascript
// Usar um gerenciador de secrets
// Opção 1: Doppler
npm install @dopplerhq/node-sdk

// Opção 2: AWS Secrets Manager
npm install @aws-sdk/client-secrets-manager

// Opção 3: HashiCorp Vault
npm install node-vault
```

#### 5. **Adicionar Autenticação em Endpoints Públicos**
```javascript
// Proteger todos os endpoints sensíveis
app.get("/api/seller/analytics/:sellerId", 
  requireAuth, // Adicionar middleware de autenticação
  async (req, res) => {
    // Verificar se usuário tem permissão para ver esses dados
    if (!canViewAnalytics(req.user, req.params.sellerId)) {
      return res.status(403).json({ error: "Acesso negado" });
    }
    // ... resto do código
});
```

#### 6. **Melhorar Content Security Policy**
```javascript
// Remover unsafe-inline e unsafe-eval
contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'nonce-{random}'"], // Usar nonce
    styleSrc: ["'self'", "'nonce-{random}'"],
    // Remover completamente unsafe-eval
  }
}
```

### Prioridade 3 - MÉDIA (Fazer em 1 semana):

#### 7. **Implementar Rate Limiting Mais Restritivo**
```javascript
// Reduzir limites para endpoints críticos
const strictLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3, // Apenas 3 tentativas
  skipSuccessfulRequests: false,
  // Adicionar bloqueio progressivo
  handler: (req, res) => {
    // Bloquear IP por 1 hora após muitas tentativas
    blockIP(req.ip, 3600000);
  }
});
```

#### 8. **Adicionar Monitoramento de Segurança**
```javascript
// Implementar logging de segurança
const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ 
      filename: 'security.log',
      level: 'warning' 
    })
  ]
});

// Registrar tentativas suspeitas
securityLogger.warn('Tentativa de login suspeita', {
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  timestamp: new Date()
});
```

#### 9. **Implementar 2FA (Autenticação de 2 Fatores)**
```javascript
// Adicionar 2FA para admin
npm install speakeasy qrcode

// Gerar secret para 2FA
const secret = speakeasy.generateSecret({
  name: 'UNIPET Admin'
});

// Verificar token
const verified = speakeasy.totp.verify({
  secret: user.twoFactorSecret,
  encoding: 'base32',
  token: inputToken,
  window: 2
});
```

---

## 🔍 Checklist de Segurança

### Imediato:
- [ ] Rotacionar SESSION_SECRET
- [ ] Alterar senhas do banco de dados
- [ ] Regenerar chaves da API Cielo
- [ ] Atualizar credenciais do Supabase
- [ ] Implementar bcrypt para senhas

### Curto Prazo (48 horas):
- [ ] Adicionar validação de webhooks
- [ ] Implementar CSRF em todos os endpoints
- [ ] Remover logs com informações sensíveis
- [ ] Configurar secrets manager

### Médio Prazo (1 semana):
- [ ] Adicionar 2FA para administradores
- [ ] Implementar auditoria de segurança
- [ ] Configurar firewall de aplicação (WAF)
- [ ] Realizar pentest completo

---

## 📊 Métricas de Risco

| Vulnerabilidade | Impacto | Probabilidade | Risco Total |
|----------------|---------|---------------|-------------|
| Credenciais Expostas | 10/10 | 9/10 | **CRÍTICO** |
| Webhooks Sem Validação | 9/10 | 8/10 | **CRÍTICO** |
| Senhas em Texto Puro | 10/10 | 7/10 | **ALTO** |
| XSS via CSP | 7/10 | 6/10 | **MÉDIO** |
| Endpoints Públicos | 6/10 | 7/10 | **MÉDIO** |

---

## 🚀 Próximos Passos

1. **HOJE**: Rotacionar todas as credenciais comprometidas
2. **AMANHÃ**: Implementar validação de webhooks e bcrypt
3. **ESTA SEMANA**: Configurar secrets manager e 2FA
4. **ESTE MÊS**: Realizar auditoria completa e pentest

---

## ⚠️ Aviso Legal

Este relatório identifica vulnerabilidades críticas que devem ser tratadas com máxima urgência. A exposição continuada dessas vulnerabilidades pode resultar em:

- Perda financeira significativa
- Vazamento de dados de clientes
- Responsabilidade legal e multas (LGPD)
- Danos irreparáveis à reputação

**Recomenda-se ação imediata para mitigar esses riscos.**

---

*Relatório gerado em 23/10/2025 - Mantenha este documento confidencial*