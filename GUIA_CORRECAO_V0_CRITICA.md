# 🚨 GUIA DE CORREÇÃO - VULNERABILIDADE CRÍTICA V0

## ⚠️ AÇÃO URGENTE NECESSÁRIA

**Vulnerabilidade:** 51 endpoints admin sem autenticação  
**Arquivo:** `server/routes.ts`  
**Prazo:** 2 horas  
**Gravidade:** 🔴🔴🔴 CRÍTICA

---

## 📋 CHECKLIST RÁPIDO

### Passo 1: Backup (5 min)
```bash
# Fazer backup do arquivo atual
cp server/routes.ts server/routes.ts.backup
```

### Passo 2: Adicionar requireAdmin (90 min)

Adicionar `requireAdmin` nos seguintes endpoints do arquivo `server/routes.ts`:

#### Endpoints GET (30 endpoints)
```typescript
// Dashboard
app.get("/admin/api/dashboard/all", requireAdmin, async (req, res) => {

// Clientes
app.get("/admin/api/clients", requireAdmin, async (req, res) => {
app.get("/admin/api/clients/:id", requireAdmin, async (req, res) => {
app.get("/admin/api/clients/:id/pets", requireAdmin, async (req, res) => {
app.get("/admin/api/clients/search/:query", requireAdmin, async (req, res) => {

// Pagamentos e Contratos
app.get("/admin/api/payment-receipts", requireAdmin, async (req, res) => {
app.get("/admin/api/payment-receipts/:id", requireAdmin, async (req, res) => {
app.get("/admin/api/contracts", requireAdmin, async (req, res) => {
app.get("/admin/api/contracts/:id", requireAdmin, async (req, res) => {

// Pets
app.get("/admin/api/pets/:id", requireAdmin, async (req, res) => {

// FAQ
app.get("/admin/api/faq", requireAdmin, async (req, res) => {

// Guias
app.get("/admin/api/guides", requireAdmin, async (req, res) => {
app.get("/admin/api/guides/with-network-units", requireAdmin, async (req, res) => {
app.get("/admin/api/guides/:id", requireAdmin, async (req, res) => {

// Planos
app.get("/admin/api/plans", requireAdmin, async (req, res) => {
app.get("/admin/api/plans/active", requireAdmin, async (req, res) => {
app.get("/admin/api/plans/:id", requireAdmin, async (req, res) => {
app.get("/admin/api/plans/:id/procedures", requireAdmin, async (req, res) => {

// Network Units
app.get("/admin/api/network-units", requireAdmin, adminCRUDLimiter, async (req, res) => {
app.get("/admin/api/network-units/credentials", requireAdmin, adminCRUDLimiter, async (req, res) => {
app.get("/admin/api/network-units/:id", requireAdmin, async (req, res) => {

// Configurações
app.get("/admin/api/settings/site", requireAdmin, async (req, res) => {
app.get("/admin/api/settings/rules", requireAdmin, async (req, res) => {
app.get("/admin/api/settings/chat", requireAdmin, async (req, res) => {

// Procedimentos
app.get("/admin/api/procedures", requireAdmin, async (req, res) => {
app.get("/admin/api/procedures/:id/plans", requireAdmin, async (req, res) => {

// Usuários
app.get("/admin/api/users", requireAdmin, adminCRUDLimiter, async (req, res) => {

// Submissões de Contato
app.get("/admin/api/contact-submissions", requireAdmin, async (req, res) => {
```

#### Endpoints POST (6 endpoints)
```typescript
app.post("/admin/api/faq", requireAdmin, validateCsrf, async (req, res) => {
app.post("/admin/api/plans", requireAdmin, validateCsrf, async (req, res) => {
app.post("/admin/api/network-units", requireAdmin, adminCRUDLimiter, validateCsrf, async (req, res) => {
app.post("/admin/api/settings/upload-image", requireAdmin, uploadRateLimiter, upload.single('image'), validateImageContent, async (req, res) => {
app.post("/admin/api/settings/chat/upload-image", requireAdmin, uploadRateLimiter, upload.single('image'), validateImageContent, async (req, res) => {
app.post("/admin/api/procedures", requireAdmin, validateCsrf, async (req, res) => {
app.post("/admin/api/users", requireAdmin, adminCRUDLimiter, validateCsrf, async (req, res) => {
```

#### Endpoints PUT/PATCH (11 endpoints)
```typescript
app.put("/admin/api/faq/:id", requireAdmin, validateCsrf, async (req, res) => {
app.put("/admin/api/plans/:id", requireAdmin, validateCsrf, async (req, res) => {
app.put("/admin/api/network-units/:id/credentials", requireAdmin, adminCRUDLimiter, validateCsrf, async (req, res) => {
app.put("/admin/api/network-units/:id", requireAdmin, validateCsrf, async (req, res) => {
app.put("/admin/api/settings/site", requireAdmin, validateCsrf, async (req, res) => {
app.put("/admin/api/settings/rules", requireAdmin, validateCsrf, async (req, res) => {
app.put("/admin/api/settings/chat", requireAdmin, validateCsrf, async (req, res) => {
app.put("/admin/api/procedures/:id", requireAdmin, validateCsrf, async (req, res) => {
app.put("/admin/api/procedures/:id/plans", requireAdmin, validateCsrf, async (req, res) => {
app.put("/admin/api/users/:id", requireAdmin, adminCRUDLimiter, validateCsrf, async (req, res) => {
app.patch("/admin/api/contracts/:id", requireAdmin, validateCsrf, async (req, res) => {
```

#### Endpoints DELETE (4 endpoints)
```typescript
app.delete("/admin/api/faq/:id", requireAdmin, validateCsrf, async (req, res) => {
app.delete("/admin/api/network-units/:id", requireAdmin, validateCsrf, async (req, res) => {
app.delete("/admin/api/procedures/:id", requireAdmin, validateCsrf, async (req, res) => {
app.delete("/admin/api/users/:id", requireAdmin, adminCRUDLimiter, validateCsrf, async (req, res) => {
```

### Passo 3: Teste (30 min)

#### Teste 1: Verificar Rejeição Sem Auth
```bash
# TODOS estes comandos devem retornar 401
curl http://localhost:5000/admin/api/clients
curl http://localhost:5000/admin/api/contracts
curl http://localhost:5000/admin/api/payment-receipts
curl -X POST http://localhost:5000/admin/api/faq -d '{}'
curl -X DELETE http://localhost:5000/admin/api/faq/123
```

**Resultado Esperado:** `{"error":"Acesso administrativo não autorizado"}` (401)

#### Teste 2: Verificar Acesso Com Auth
```bash
# 1. Fazer login admin
curl -X POST http://localhost:5000/admin/api/login \
  -H "Content-Type: application/json" \
  -d '{"login":"admin@email.com","password":"senha"}' \
  -c cookies.txt

# 2. Testar endpoints com cookie
curl http://localhost:5000/admin/api/clients -b cookies.txt
curl http://localhost:5000/admin/api/contracts -b cookies.txt
```

**Resultado Esperado:** Dados retornados com sucesso (200)

### Passo 4: Verificação Final

#### Checklist de Validação:
- [ ] Todos os 51 endpoints têm `requireAdmin`
- [ ] Endpoints GET testados sem auth retornam 401
- [ ] Endpoints POST testados sem auth retornam 401
- [ ] Endpoints PUT/PATCH testados sem auth retornam 401
- [ ] Endpoints DELETE testados sem auth retornam 401
- [ ] Endpoints com auth funcionam normalmente
- [ ] Backend reiniciado com sucesso
- [ ] Frontend consegue acessar admin após login

---

## 🚀 SCRIPT AUTOMATIZADO (OPCIONAL)

Para facilitar, você pode usar este script para testar todos os endpoints:

```bash
#!/bin/bash

echo "🧪 Testando endpoints sem autenticação (devem retornar 401)..."

endpoints=(
  "GET /admin/api/clients"
  "GET /admin/api/contracts"
  "GET /admin/api/payment-receipts"
  "GET /admin/api/dashboard/all"
  "GET /admin/api/procedures"
  "POST /admin/api/faq"
  "PUT /admin/api/settings/site"
  "DELETE /admin/api/faq/123"
)

failed=0
for endpoint in "${endpoints[@]}"; do
  method=$(echo $endpoint | awk '{print $1}')
  path=$(echo $endpoint | awk '{print $2}')
  
  response=$(curl -s -o /dev/null -w "%{http_code}" -X $method http://localhost:5000$path)
  
  if [ "$response" -eq 401 ]; then
    echo "✅ $endpoint → 401 (OK)"
  else
    echo "❌ $endpoint → $response (FALHOU!)"
    failed=$((failed + 1))
  fi
done

if [ $failed -eq 0 ]; then
  echo ""
  echo "✅ TODOS OS TESTES PASSARAM!"
else
  echo ""
  echo "❌ $failed TESTE(S) FALHARAM!"
  exit 1
fi
```

Salvar como `test-admin-auth.sh` e executar:
```bash
chmod +x test-admin-auth.sh
./test-admin-auth.sh
```

---

## ⚠️ OBSERVAÇÕES IMPORTANTES

### Endpoints que NÃO devem ter requireAdmin:
- ❌ `/admin/api/auth/status` - Usado para verificar status de autenticação (pode ser público)
- ✅ Todos os outros `/admin/api/*` DEVEM ter `requireAdmin`

### Ordem dos Middlewares:
```typescript
// ✅ CORRETO
app.get("/admin/api/endpoint", requireAdmin, adminCRUDLimiter, async (req, res) => {

// ❌ ERRADO (rate limit antes de auth)
app.get("/admin/api/endpoint", adminCRUDLimiter, requireAdmin, async (req, res) => {
```

**Ordem correta:**
1. `requireAdmin` (autenticação primeiro)
2. Rate limiters (`adminCRUDLimiter`, `uploadRateLimiter`)
3. CSRF validation (`validateCsrf`)
4. Upload middleware (`upload.single('image')`)
5. Custom validators (`validateImageContent`)
6. Handler `async (req, res) => {`

---

## 📞 EM CASO DE PROBLEMAS

### Problema 1: "requireAdmin is not defined"
**Solução:** Verificar se está importado no topo do arquivo:
```typescript
import { setupAuth, requireAuth, requireAdmin } from "./auth.js";
```

### Problema 2: Endpoints ainda retornam dados sem auth
**Solução:** 
1. Verificar se `requireAdmin` está ANTES do handler
2. Reiniciar o servidor backend
3. Limpar cache do browser (Ctrl+Shift+Delete)

### Problema 3: Admin logado não consegue acessar
**Solução:**
1. Verificar se cookie está sendo enviado
2. Verificar se sessão está ativa no PostgreSQL
3. Fazer logout e login novamente

---

## ✅ APÓS CORREÇÃO

1. **Commitar mudanças:**
```bash
git add server/routes.ts
git commit -m "fix: adiciona requireAdmin em 51 endpoints admin desprotegidos (V0 CRÍTICA)"
```

2. **Atualizar documentação:**
- Marcar V0 como CORRIGIDA em `AUDITORIA_SEGURANCA_COMPLETA.md`
- Atualizar score de segurança para 70/100

3. **Próximas correções:**
- V1: IDOR (verificação de ownership)
- V2: Rate limiting em endpoints públicos
- V3: Endpoints públicos com dados sensíveis

---

**Tempo Total Estimado:** 2 horas  
**Prioridade:** 🔴🔴🔴 CRÍTICA  
**Bloqueio para Deploy:** SIM - NÃO FAZER DEPLOY ATÉ CORRIGIR
