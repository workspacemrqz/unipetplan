# Checklist de Testes Manuais - 5 Correções Críticas

## 🎯 Objetivo
Validar manualmente as 5 correções implementadas no Admin Panel do UNIPET PLAN.

---

## ✅ 1. Vínculo de Contratos de Planos na Área do Cliente

### Passos:
1. **Login como Cliente**
   - Acesse: `http://localhost:5000/cliente/login`
   - Faça login com um cliente que tenha pets cadastrados
   - CPF de teste: `12345678900`

2. **Acessar Página de Contratos**
   - Navegue para: `Área do Cliente` → `Contratos`
   - URL: `http://localhost:5000/cliente/contrato`

3. **Verificações:**
   - [ ] A página carrega sem erros
   - [ ] Lista de pets aparece corretamente
   - [ ] Ao selecionar um pet, o contrato é exibido
   - [ ] O texto do contrato inclui informações do plano (se configurado)
   - [ ] Não há erro 401 no console do navegador
   - [ ] Endpoint correto está sendo chamado: `/api/clients/contracts`

### ✅ Resultado Esperado:
- Contratos carregam corretamente
- Campo `planContractText` vem do backend
- Sem erros de autenticação

---

## ✅ 2. Funcionalidade de Desativar/Deletar Usuários Admin

### Passos:
1. **Login como Admin**
   - Acesse: `http://localhost:5000/admin/login`
   - Faça login com credenciais de admin

2. **Acessar Gestão de Usuários Admin**
   - Navegue para: `Admin Panel` → `Usuários Admin`
   - URL: `http://localhost:5000/admin/usuarios-admin`

3. **Testar Desativação:**
   - [ ] Encontre um usuário admin
   - [ ] Clique no botão de desativar
   - [ ] Confirme a ação
   - [ ] Verifique que o status mudou para "Inativo"

4. **Testar Exclusão:**
   - [ ] Encontre um usuário admin inativo
   - [ ] Clique no botão de deletar
   - [ ] Confirme a ação
   - [ ] Verifique que o usuário foi removido da lista

### ✅ Resultado Esperado:
- Botões de desativar e deletar funcionam
- Endpoints `/admin/api/admin-users/:id/deactivate` e `DELETE /admin/api/admin-users/:id` respondem corretamente
- Usuários são desativados/deletados com sucesso

---

## ✅ 3. Redirecionamento de Login Admin (sem erro 404)

### Passos:
1. **Login como Admin**
   - Acesse: `http://localhost:5000/admin/login`
   - Insira credenciais válidas
   - Clique em "Entrar"

2. **Verificações:**
   - [ ] Após login, redireciona para `/admin`
   - [ ] NÃO há erro 404
   - [ ] Dashboard admin carrega corretamente
   - [ ] Menu de navegação está visível

3. **Testar Acesso Direto:**
   - [ ] Acesse diretamente: `http://localhost:5000/admin`
   - [ ] Se não logado, redireciona para login
   - [ ] Se logado, mostra o dashboard

### ✅ Resultado Esperado:
- Login admin redireciona para `/admin` sem erro 404
- Página admin carrega corretamente
- Navegação funciona

---

## ✅ 4. Restrições de Role "view" (sem adicionar/editar)

### Passos:
1. **Login como Admin com Role "view"**
   - Crie ou use um usuário admin com `role = 'view'`
   - Faça login: `http://localhost:5000/admin/login`

2. **Testar Restrições em Diferentes Páginas:**

   **a) Clientes:**
   - [ ] Acesse: `/admin/clientes`
   - [ ] Botão "Adicionar Cliente" NÃO deve aparecer
   - [ ] Ações de editar/deletar NÃO devem aparecer

   **b) Planos:**
   - [ ] Acesse: `/admin/planos`
   - [ ] Botão "Adicionar Plano" NÃO deve aparecer
   - [ ] Ações de editar/deletar NÃO devem aparecer

   **c) Unidades de Rede:**
   - [ ] Acesse: `/admin/unidades-rede`
   - [ ] Botão "Adicionar Unidade" NÃO deve aparecer
   - [ ] Ações de editar/deletar NÃO devem aparecer

   **d) FAQs:**
   - [ ] Acesse: `/admin/faq`
   - [ ] Botão "Adicionar FAQ" NÃO deve aparecer
   - [ ] Ações de editar/deletar NÃO devem aparecer

   **e) Procedimentos:**
   - [ ] Acesse: `/admin/procedimentos`
   - [ ] Botão "Adicionar Procedimento" NÃO deve aparecer
   - [ ] Ações de editar/deletar NÃO devem aparecer

3. **Verificar Permissões:**
   - [ ] Usuário com role "view" pode apenas visualizar dados
   - [ ] Tentativas de criar/editar/deletar são bloqueadas

### ✅ Resultado Esperado:
- Usuários com role "view" veem apenas dados
- Botões de ação (adicionar/editar/deletar) estão ocultos
- Hook `usePermissions` retorna corretamente:
  - `canView: true`
  - `canAdd: false`
  - `canEdit: false`
  - `canDelete: false`

---

## ✅ 5. Login na Rede Credenciada (sem loop)

### Passos:
1. **Criar/Identificar Unidade de Teste**
   - Encontre uma unidade com slug conhecido
   - Exemplo: `clinica-teste` (normalize: `clinica-teste`)

2. **Testar Login de Unidade:**
   - [ ] Acesse: `http://localhost:5000/unidade/clinica-teste`
   - [ ] Insira credenciais da unidade
   - [ ] Clique em "Entrar"
   - [ ] Verifique redirecionamento para: `/unidade/clinica-teste/painel`
   - [ ] Dashboard da unidade carrega sem loop

3. **Testar Login de Veterinário:**
   - [ ] Acesse: `http://localhost:5000/unidade/clinica-teste`
   - [ ] Insira credenciais de veterinário
   - [ ] Clique em "Entrar"
   - [ ] Verifique redirecionamento para: `/unidade/clinica-teste/atendimentos/novo`
   - [ ] Página carrega sem loop

4. **Testar Normalização de Slugs:**
   - [ ] Tente acessar com slug com espaços: `http://localhost:5000/unidade/ Clinica-Teste `
   - [ ] Tente acessar com slug maiúsculo: `http://localhost:5000/unidade/CLINICA-TESTE`
   - [ ] Ambos devem funcionar sem loop (normalização ativa)

5. **Verificar Console do Navegador:**
   - [ ] Abra DevTools (F12)
   - [ ] Faça login
   - [ ] Veja logs de normalização de slug
   - [ ] NÃO deve haver redirecionamento infinito

### ✅ Resultado Esperado:
- Login na unidade funciona sem loop infinito
- Slugs são normalizados (trim + toLowerCase)
- Redirecionamento funciona corretamente
- Dashboard/páginas carregam sem problemas

---

## 📊 Resumo Final

| # | Correção | Status | Observações |
|---|----------|--------|-------------|
| 1 | Vínculo Contratos Planos | ⬜ | |
| 2 | Desativar/Deletar Usuários | ⬜ | |
| 3 | Redirect Login Admin | ⬜ | |
| 4 | Restrições Role "view" | ⬜ | |
| 5 | Login Sem Loop | ⬜ | |

### ✅ Critérios de Sucesso:
- [ ] Todas as 5 correções funcionam conforme esperado
- [ ] Nenhum erro 404 em redirecionamentos
- [ ] Nenhum loop infinito em autenticação
- [ ] Permissões de role "view" respeitadas
- [ ] Endpoints corretos sendo chamados

---

## 🐛 Relatório de Problemas Encontrados

Se algum teste falhar, documente aqui:

### Problema 1:
- **Correção afetada:** 
- **Descrição:** 
- **Passos para reproduzir:** 
- **Comportamento esperado:** 
- **Comportamento atual:** 

### Problema 2:
- **Correção afetada:** 
- **Descrição:** 
- **Passos para reproduzir:** 
- **Comportamento esperado:** 
- **Comportamento atual:** 

---

## 📝 Notas Adicionais
- Data do teste: _______________
- Testador: _______________
- Ambiente: Development / Production
- Versão do sistema: _______________
