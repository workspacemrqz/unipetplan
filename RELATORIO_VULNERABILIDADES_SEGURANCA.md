# Relatório de Vulnerabilidades de Segurança - UNIPET PLAN

## 📋 Sumário Executivo

Este relatório apresenta uma análise detalhada das vulnerabilidades de segurança identificadas no sistema UNIPET PLAN. As vulnerabilidades foram classificadas por criticidade (Crítica, Alta, Média e Baixa) e incluem recomendações específicas para correção.

**Data da Análise:** 08/10/2025

**Resumo das Vulnerabilidades:**
- 🔴 **Críticas:** 5 vulnerabilidades
- 🟠 **Altas:** 6 vulnerabilidades  
- 🟡 **Médias:** 4 vulnerabilidades
- 🔵 **Baixas:** 3 vulnerabilidades

---

## 🔴 VULNERABILIDADES CRÍTICAS

### 1. Bypass de Autenticação Administrativa

**Localização:** `server/auth.ts` (linhas 58-81)

**Descrição:**
O sistema permite bypass completo da autenticação administrativa quando as variáveis de ambiente `NODE_ENV=development` e `ALLOW_DEV_BYPASS=true` estão configuradas. Isso cria uma sessão de admin com permissões de superadmin automaticamente.

**Código Vulnerável:**
```typescript
const isLocalDev = process.env.NODE_ENV === 'development' && 
                   process.env.ALLOW_DEV_BYPASS === 'true' &&
                   process.env.REPLIT_DEPLOYMENT !== 'true' &&
                   !process.env.RAILWAY_ENVIRONMENT &&
                   !process.env.VERCEL_ENV;
                   
if (isLocalDev) {
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
- Acesso total ao sistema administrativo
- Possibilidade de roubo de dados de clientes (nome, CPF, endereço, pets)
- Modificação/exclusão de contratos e pagamentos
- Exposição a dados financeiros sensíveis
- Violação da LGPD

**Exploração:**
Um atacante pode explorar esta vulnerabilidade se:
1. Conseguir modificar as variáveis de ambiente em produção
2. O ambiente de staging ou produção estiver configurado incorretamente
3. Existir um vazamento de variáveis de ambiente

**Recomendação:**
```typescript
// NUNCA permitir bypass em produção
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // Remover completamente o bypass ou garantir validação rigorosa
  if (process.env.NODE_ENV !== 'development') {
    // Em produção, SEMPRE exigir autenticação
    if (!req.session || !req.session.admin || !req.session.admin.authenticated) {
      return res.status(401).json({ error: "Acesso não autorizado" });
    }
    return next();
  }
  
  // Em desenvolvimento, apenas com múltiplas confirmações
  if (process.env.NODE_ENV === 'development' && 
      process.env.ALLOW_DEV_BYPASS === 'true' &&
      process.env.DEV_BYPASS_CONFIRMATION === 'YES_I_UNDERSTAND_THE_RISKS') {
    // Log de auditoria
    console.warn('🚨 [SECURITY AUDIT] Admin bypass usado em desenvolvimento');
    req.session.admin = { login: 'dev-admin', authenticated: true };
    return next();
  }
  
  if (!req.session || !req.session.admin) {
    return res.status(401).json({ error: "Acesso não autorizado" });
  }
  next();
}
```

---

### 2. Exposição de Dados Sensíveis em Logs

**Localização:** `server/services/cielo-service.ts`, `server/config.ts`, múltiplos arquivos

**Descrição:**
O sistema registra informações sensíveis em logs, incluindo:
- Respostas completas da API Cielo (linhas 428-433)
- IDs de merchant parciais (linha 318)
- Detalhes de pagamento PIX (linhas 536-551)
- Presença de variáveis como LOGIN e SENHA (config.ts linhas 18-19)

**Código Vulnerável:**
```typescript
// server/services/cielo-service.ts
console.log('📋 [Cielo] Resposta RAW completa do Credit Card:', {
  correlationId,
  responseStatus: response.status,
  fullResponse: JSON.stringify(result, null, 2)  // EXPÕE DADOS SENSÍVEIS
});

// server/config.ts
console.log('   LOGIN:', process.env.LOGIN ? '✅ Presente' : '❌ Ausente');
console.log('   SENHA:', process.env.SENHA ? '✅ Presente' : '❌ Ausente');
```

**Impacto:**
- Vazamento de tokens de pagamento
- Exposição de credenciais administrativas
- Dados de cartão de crédito em logs
- Violação de PCI-DSS e LGPD

**Recomendação:**
```typescript
// Usar sanitização adequada
import { sanitizeObject, safeLog } from './utils/log-sanitizer';

// Ao invés de console.log direto
safeLog('📋 [Cielo] Resposta processada:', {
  correlationId,
  status: response.status,
  paymentId: result.Payment?.PaymentId,
  // NÃO logar dados sensíveis completos
});

// Para config
console.log('   LOGIN:', process.env.LOGIN ? '✅ Configurado' : '❌ Ausente');
console.log('   SENHA:', process.env.SENHA ? '✅ Configurada (hash)' : '❌ Ausente');
```

---

### 3. Validação de Webhook Insuficiente

**Localização:** `server/services/cielo-webhook-service.ts` (linhas 46-67)

**Descrição:**
O sistema permite processar webhooks sem validação de assinatura em ambientes de desenvolvimento, mesmo sem opt-in explícito em algumas configurações. Embora existam verificações, a lógica pode ser burlada.

**Código Vulnerável:**
```typescript
if (!this.webhookSecret) {
  if (isProduction || isStaging) {
    return false;
  } else {
    if (process.env.ALLOW_WEBHOOK_BYPASS !== 'true') {
      return false;
    }
    // Permite bypass em dev
    return true;
  }
}
```

**Impacto:**
- Webhooks forjados podem aprovar pagamentos falsos
- Ativação de contratos sem pagamento real
- Perda financeira direta
- Fraude em larga escala

**Recomendação:**
```typescript
validateWebhookSignature(payload: string, receivedSignature: string, correlationId: string): boolean {
  // SEMPRE exigir webhook secret em QUALQUER ambiente
  if (!this.webhookSecret) {
    console.error('🚨 [CIELO-WEBHOOK] Webhook secret obrigatório', { correlationId });
    return false;
  }
  
  // NUNCA permitir bypass, mesmo em dev
  const calculatedSignature = crypto
    .createHmac('sha256', this.webhookSecret)
    .update(payload)
    .digest('hex');
    
  const isValid = crypto.timingSafeEqual(
    Buffer.from(calculatedSignature),
    Buffer.from(receivedSignature)
  );
  
  if (!isValid) {
    console.error('🚨 [SECURITY] Invalid webhook signature', { correlationId });
  }
  
  return isValid;
}
```

---

### 4. Session Fixation (Parcialmente Resolvida)

**Localização:** `server/routes.ts`, `server/auth.ts`

**Descrição:**
Embora o código regenere sessões em alguns lugares (login admin e cliente), há endpoints que não regeneram a sessão adequadamente após autenticação, permitindo ataques de fixação de sessão.

**Impacto:**
- Sequestro de sessão administrativa
- Acesso não autorizado a dados de clientes
- Modificação de dados sem consentimento

**Recomendação:**
```typescript
// Garantir regeneração em TODOS os pontos de autenticação
app.post("/api/clients/login", async (req, res) => {
  // ... validação de credenciais ...
  
  // SEMPRE regenerar sessão após login bem-sucedido
  req.session.regenerate((err) => {
    if (err) {
      return res.status(500).json({ error: "Erro ao criar sessão" });
    }
    
    req.session.client = { id, fullName, email };
    
    req.session.save((saveErr) => {
      if (saveErr) {
        return res.status(500).json({ error: "Erro ao salvar sessão" });
      }
      res.json({ success: true });
    });
  });
});
```

---

### 5. Configuração de Cookies Insegura em Desenvolvimento

**Localização:** `server/auth.ts` (linhas 28-33)

**Descrição:**
Cookies de sessão não são marcados como `secure` em desenvolvimento, permitindo interceptação em redes não seguras.

**Código Vulnerável:**
```typescript
cookie: {
  secure: process.env.NODE_ENV === 'production', // Apenas em produção
  httpOnly: true,
  maxAge: 24 * 60 * 60 * 1000,
  sameSite: 'lax'
}
```

**Impacto:**
- Interceptação de sessões em ambiente de desenvolvimento
- Ataques man-in-the-middle em redes não confiáveis
- Roubo de tokens de sessão

**Recomendação:**
```typescript
cookie: {
  secure: true, // SEMPRE usar secure
  httpOnly: true,
  maxAge: 24 * 60 * 60 * 1000,
  sameSite: 'strict', // Mais restritivo
  domain: process.env.COOKIE_DOMAIN // Definir domínio específico
}
```

---

## 🟠 VULNERABILIDADES ALTAS

### 6. CORS Permissivo em Desenvolvimento

**Localização:** `server/config/security.ts` (linhas 32-68)

**Descrição:**
A configuração CORS permite requisições sem origin em desenvolvimento, e em produção permite origin `null` se `ALLOW_NO_ORIGIN=true`.

**Código Vulnerável:**
```typescript
if (!origin) {
  if (process.env.NODE_ENV === 'production') {
    if (process.env.ALLOW_NO_ORIGIN === 'true') {
      return callback(null, true); // PERMITE SEM ORIGIN
    }
  } else {
    return callback(null, true); // SEMPRE PERMITE EM DEV
  }
}
```

**Impacto:**
- Requisições cross-origin não autorizadas
- Exfiltração de dados via CORS
- Ataques CSRF mesmo com proteção

**Recomendação:**
```typescript
app.use(cors({
  origin: (origin, callback) => {
    // NUNCA permitir sem origin em produção
    if (!origin) {
      if (process.env.NODE_ENV === 'production') {
        return callback(new Error('Origin obrigatória'));
      }
      // Em dev, listar origins permitidas explicitamente
      return callback(null, false);
    }
    
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? ['https://unipetplan.com.br', 'https://www.unipetplan.com.br']
      : ['http://localhost:5000', 'http://127.0.0.1:5000'];
      
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origem não permitida'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));
```

---

### 7. JWT com Secret Inseguro

**Localização:** `server/unit-routes.ts` (linha 81)

**Descrição:**
O sistema usa um fallback 'unit-secret-key' para assinar tokens JWT se SESSION_SECRET não estiver definido.

**Código Vulnerável:**
```typescript
const decoded = jwt.verify(token, process.env.SESSION_SECRET || 'unit-secret-key') as any;
```

**Impacto:**
- Tokens JWT forjados
- Acesso não autorizado a rotas de unidade
- Falsificação de identidade

**Recomendação:**
```typescript
// NUNCA usar fallback
const JWT_SECRET = process.env.SESSION_SECRET;
if (!JWT_SECRET) {
  throw new Error('SESSION_SECRET obrigatório para JWT');
}

const decoded = jwt.verify(token, JWT_SECRET) as any;
```

---

### 8. Validação de Upload de Arquivo Insuficiente

**Localização:** `server/routes.ts` (linhas 92-123, 126-179)

**Descrição:**
Embora exista validação de conteúdo (`validateImageContent`), a validação inicial do `multer` aceita apenas MIME type e extensão, que podem ser falsificados.

**Impacto:**
- Upload de arquivos maliciosos
- Potencial execução de código
- Armazenamento de malware

**Recomendação:**
```typescript
// Melhorar validação de conteúdo
export const validateImageContent = async (req: any, res: any, next: any) => {
  if (!req.file || !req.file.buffer) {
    return next();
  }

  try {
    // 1. Validar magic numbers
    const type = await fileType.fromBuffer(req.file.buffer);
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    
    if (!type || !allowedMimeTypes.includes(type.mime)) {
      return res.status(400).json({ 
        error: 'Tipo de arquivo inválido' 
      });
    }

    // 2. Validar com biblioteca de imagem (sharp)
    try {
      const metadata = await sharp(req.file.buffer).metadata();
      if (!metadata.format || !['jpeg', 'png', 'webp'].includes(metadata.format)) {
        return res.status(400).json({ 
          error: 'Formato de imagem inválido' 
        });
      }
    } catch (err) {
      return res.status(400).json({ 
        error: 'Arquivo não é uma imagem válida' 
      });
    }

    // 3. Verificar conteúdo suspeito
    const bufferString = req.file.buffer.toString('utf-8', 0, 1024);
    const suspiciousPatterns = [
      '<?php', '<script', '#!/bin', 'eval(', 'exec(',
      'system(', 'passthru(', 'shell_exec(', '<?='
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (bufferString.includes(pattern)) {
        return res.status(400).json({ 
          error: 'Conteúdo suspeito detectado' 
        });
      }
    }

    // 4. Limitar dimensões
    const metadata2 = await sharp(req.file.buffer).metadata();
    if (metadata2.width && metadata2.width > 5000 || 
        metadata2.height && metadata2.height > 5000) {
      return res.status(400).json({ 
        error: 'Dimensões da imagem muito grandes' 
      });
    }

    next();
  } catch (error) {
    return res.status(400).json({ 
      error: 'Erro ao validar arquivo' 
    });
  }
};
```

---

### 9. Rate Limiting Insuficiente

**Localização:** `server/routes.ts` (linhas 83-89, 374-391, 508-525)

**Descrição:**
Alguns rate limiters permitem muitas requisições (100 por minuto para admin CRUD), o que pode facilitar ataques de força bruta ou DoS.

**Recomendação:**
```typescript
// Limites mais restritivos
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3, // Mantém 3 tentativas
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    // Implementar bloqueio temporário por IP
    const blockKey = `login_block_${req.ip}`;
    // Armazenar em Redis/cache por 1 hora
    res.status(429).json({ 
      error: "Muitas tentativas. Conta bloqueada por 1 hora.",
      retryAfter: 3600
    });
  }
});

const adminCRUDLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30, // Reduzir de 100 para 30
  message: { error: "Limite de requisições excedido" }
});
```

---

### 10. Logs Excessivos no Frontend

**Localização:** Múltiplos arquivos em `client/src/`

**Descrição:**
Muitos `console.log` no frontend que podem expor lógica de negócio, estrutura de dados e comportamento da aplicação.

**Recomendação:**
```typescript
// Usar logger condicional
const isDev = import.meta.env.MODE === 'development';

export const logger = {
  log: (...args: any[]) => {
    if (isDev) console.log(...args);
  },
  error: (...args: any[]) => {
    // Sempre logar erros, mas sanitizados
    console.error(...sanitizeArgs(args));
  }
};

// Remover todos console.log diretos e usar logger
```

---

### 11. Erros que Expõem Informações do Sistema

**Localização:** `server/routes.ts` (linha 884)

**Descrição:**
Alguns endpoints retornam mensagens de erro detalhadas que podem expor informações do sistema.

**Código Vulnerável:**
```typescript
res.status(500).json({ 
  error: "Erro ao buscar dados do dashboard",
  details: error instanceof Error ? error.message : "Unknown error"
});
```

**Recomendação:**
```typescript
// Nunca expor detalhes em produção
res.status(500).json({ 
  error: "Erro ao processar requisição",
  ...(process.env.NODE_ENV === 'development' && { 
    details: error instanceof Error ? error.message : "Unknown error" 
  })
});

// Logar detalhes internamente
console.error('[DASHBOARD] Error details:', error);
```

---

## 🟡 VULNERABILIDADES MÉDIAS

### 12. Mass Assignment Parcialmente Protegido

**Localização:** Múltiplos endpoints em `server/routes.ts`

**Descrição:**
Embora haja whitelisting em alguns endpoints, nem todos os endpoints estão protegidos contra mass assignment.

**Recomendação:**
```typescript
// Sempre usar whitelisting explícito
app.put("/admin/api/clients/:id", requireAdmin, async (req, res) => {
  try {
    const allowedFields = [
      'fullName', 'email', 'phone', 'cpf', 
      'cep', 'address', 'number', 'complement', 
      'district', 'state', 'city'
    ];
    
    const clientData = insertClientSchema.partial().parse(req.body);
    
    // Filtrar apenas campos permitidos
    const safeData = {};
    for (const field of allowedFields) {
      if (clientData[field] !== undefined) {
        safeData[field] = clientData[field];
      }
    }
    
    const updatedClient = await storage.updateClient(req.params.id, safeData);
    res.json(updatedClient);
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar cliente" });
  }
});
```

---

### 13. CSRF Token Não Validado em Alguns Endpoints

**Localização:** Verificar todos endpoints POST/PUT/DELETE

**Descrição:**
Alguns endpoints podem não ter validação CSRF adequada.

**Recomendação:**
```typescript
// Garantir validateCsrf em TODOS endpoints de mutação
app.post("/api/qualquer-endpoint", validateCsrf, async (req, res) => {
  // ...
});

app.put("/api/qualquer-endpoint", validateCsrf, async (req, res) => {
  // ...
});

app.delete("/api/qualquer-endpoint", validateCsrf, async (req, res) => {
  // ...
});
```

---

### 14. Falta de Timeout em Requisições Externas

**Localização:** `server/services/cielo-service.ts`

**Descrição:**
Requisições para APIs externas (Cielo) não têm timeout configurado, podendo causar travamento.

**Recomendação:**
```typescript
const response = await fetch(url, {
  method: 'POST',
  headers: this.buildHeaders(correlationId),
  body: JSON.stringify(paymentData),
  signal: AbortSignal.timeout(30000) // 30 segundos timeout
});
```

---

### 15. Falta de Validação de Autorização em Alguns Endpoints

**Localização:** Vários endpoints

**Descrição:**
Alguns endpoints validam autenticação mas não validam se o usuário tem permissão para acessar o recurso específico (IDOR).

**Recomendação:**
```typescript
app.get("/api/clients/:id/contracts", requireClient, async (req, res) => {
  const clientId = req.session.client?.id;
  const requestedClientId = req.params.id;
  
  // Validar que o cliente só pode acessar seus próprios dados
  if (clientId !== requestedClientId) {
    return res.status(403).json({ error: "Acesso negado" });
  }
  
  const contracts = await storage.getContractsByClientId(clientId);
  res.json(contracts);
});
```

---

## 🔵 VULNERABILIDADES BAIXAS

### 16. Headers de Segurança Podem Ser Mais Restritivos

**Localização:** `server/config/security.ts`

**Descrição:**
Content Security Policy permite 'unsafe-inline' para scripts e estilos.

**Recomendação:**
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'"], // Remover 'unsafe-inline'
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://tkzzxsbwkgcdmcreducm.supabase.co"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: [] // Forçar HTTPS
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

---

### 17. Falta de Monitoramento e Alertas de Segurança

**Descrição:**
Não há sistema de detecção de intrusão ou alertas para atividades suspeitas.

**Recomendação:**
Implementar:
- Sistema de auditoria de ações administrativas
- Alertas para múltiplas tentativas de login falhas
- Monitoramento de alterações em dados sensíveis
- Logs centralizados com análise de anomalias

---

### 18. Senhas Armazenadas em Variáveis de Ambiente

**Localização:** `server/config.ts`, `server/routes.ts`

**Descrição:**
Senha de admin pode ser armazenada em variável de ambiente (embora como hash bcrypt).

**Recomendação:**
```typescript
// Migrar para banco de dados
// Usar apenas autenticação via banco de dados
// Remover fallback para process.env.LOGIN e process.env.SENHA

// EM VEZ DE:
const adminPassword = process.env.SENHA;

// USAR:
const user = await storage.getUserByEmail(loginData.login);
if (user) {
  const isValid = await bcrypt.compare(loginData.password, user.password);
  // ...
}
```

---

## 📊 Resumo de Prioridades

### 🔥 Ação Imediata (Crítico)
1. **Remover/restringir ALLOW_DEV_BYPASS** - Risco de acesso administrativo total
2. **Sanitizar todos os logs** - Vazamento de dados sensíveis
3. **Validar webhooks obrigatoriamente** - Risco de fraude financeira
4. **Regenerar sessões em todos logins** - Session fixation
5. **Cookies sempre secure** - Interceptação de sessão

### ⚡ Curto Prazo (Alto)
1. Restringir CORS adequadamente
2. Remover fallback de JWT secret
3. Melhorar validação de upload
4. Reduzir limites de rate limiting
5. Remover logs excessivos do frontend
6. Sanitizar mensagens de erro

### 📅 Médio Prazo (Médio)
1. Implementar whitelisting em todos endpoints
2. Adicionar CSRF em todos endpoints de mutação
3. Configurar timeouts em requisições externas
4. Validar autorização IDOR em todos endpoints

### 🔄 Longo Prazo (Baixo)
1. Fortalecer CSP headers
2. Implementar sistema de auditoria
3. Migrar credenciais admin para banco de dados
4. Implementar detecção de intrusão

---

## 🛡️ Recomendações Gerais de Segurança

### Desenvolvimento Seguro
1. **Code Review obrigatório** para mudanças de segurança
2. **Testes de penetração** regulares
3. **Análise estática de código** automatizada
4. **Dependency scanning** para vulnerabilidades conhecidas

### Monitoramento
1. **Logs centralizados** com retenção adequada
2. **Alertas automáticos** para atividades suspeitas
3. **Dashboards de segurança** em tempo real
4. **Auditoria regular** de acessos

### Compliance
1. **LGPD**: Garantir proteção de dados pessoais
2. **PCI-DSS**: Proteger dados de cartão (se aplicável)
3. **Backup e Recuperação**: Procedimentos documentados
4. **Resposta a Incidentes**: Plano de ação definido

---

## 📝 Checklist de Implementação

### Fase 1 - Emergencial (1-3 dias)
- [ ] Desabilitar ALLOW_DEV_BYPASS em produção
- [ ] Implementar sanitização de logs
- [ ] Validar webhooks obrigatoriamente
- [ ] Regenerar sessões em todos logins
- [ ] Cookies sempre secure e sameSite=strict

### Fase 2 - Urgente (1 semana)
- [ ] Restringir CORS
- [ ] Remover fallback JWT secret
- [ ] Melhorar validação de upload
- [ ] Reduzir rate limiting
- [ ] Remover console.log em produção

### Fase 3 - Importante (2 semanas)
- [ ] Whitelisting em todos endpoints
- [ ] CSRF em todos endpoints
- [ ] Timeouts em requisições
- [ ] Validação IDOR completa

### Fase 4 - Melhorias (1 mês)
- [ ] Fortalecer headers CSP
- [ ] Sistema de auditoria
- [ ] Migrar credenciais para DB
- [ ] Detecção de intrusão

---

## 🔗 Referências e Recursos

1. **OWASP Top 10**: https://owasp.org/www-project-top-ten/
2. **LGPD**: https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd
3. **PCI-DSS**: https://www.pcisecuritystandards.org/
4. **Node.js Security Best Practices**: https://nodejs.org/en/docs/guides/security/
5. **Express Security Best Practices**: https://expressjs.com/en/advanced/best-practice-security.html

---

## 📞 Contato

Para dúvidas sobre este relatório ou suporte na implementação das correções, entre em contato com a equipe de segurança.

**Data do Relatório:** 08/10/2025  
**Próxima Revisão Recomendada:** Após implementação das correções críticas e altas

---

## ⚠️ AVISO LEGAL

Este relatório contém informações sensíveis sobre vulnerabilidades de segurança. Deve ser tratado como **CONFIDENCIAL** e compartilhado apenas com pessoal autorizado. O uso inadequado destas informações pode resultar em comprometimento da segurança do sistema.
