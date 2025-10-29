# Sistema de Status de Contratos por Inadimplência

## Visão Geral

Este documento descreve como funciona o sistema automático de mudança de status dos contratos quando o cliente deixa de realizar o pagamento da mensalidade ou anuidade do plano de saúde pet.

---

## Prazos Configurados

O sistema utiliza os seguintes prazos para determinar a mudança de status:

| Período | Dias de Atraso | Status Resultante |
|---------|----------------|-------------------|
| Período de Carência | 1 a 15 dias | INATIVO |
| Suspensão | 16 a 60 dias | SUSPENSO |
| Cancelamento | 61 dias ou mais | CANCELADO |

---

## Fases do Status do Contrato

### 1️⃣ **ATIVO** ✅

**Condição:** Cliente realizou o pagamento e o contrato está dentro do prazo de validade.

**Validade:**
- **Planos Mensais:** 30 dias após a data do último pagamento
- **Planos Anuais:** 365 dias após a data do último pagamento

**Status no Sistema:** `active`

**Mensagem Exibida:** 
- "Ativo - X dias restantes" (quando há mais de 5 dias)
- "Ativo - X dias restantes (renovação necessária em breve)" (quando faltam 5 dias ou menos)

**Restrições:** Nenhuma. Cliente tem acesso completo a todos os serviços.

---

### 2️⃣ **INATIVO** (Período de Carência) ⚠️

**Condição:** Pagamento vencido há **1 a 15 dias**.

**Status no Sistema:** `inactive`

**Mensagem Exibida:** "Em período de carência - X dias de atraso"

**Características:**
- Período de tolerância para o cliente regularizar a situação
- Sistema ainda permite algumas operações
- Cliente deve ser notificado para evitar suspensão

**Restrições:** Moderadas. Sistema começa a alertar sobre a necessidade de pagamento.

---

### 3️⃣ **SUSPENSO** 🔴

**Condição:** Pagamento vencido há **16 a 60 dias**.

**Status no Sistema:** `suspended`

**Mensagem Exibida:** "Suspenso - expirado há X dias"

**Características:**
- Contrato temporariamente suspenso
- **Bloqueio:** NÃO é possível criar novos atendimentos para os pets vinculados
- Cliente precisa regularizar o pagamento para reativar o contrato

**Restrições:** 
- ❌ Criação de novos atendimentos bloqueada
- ❌ Sistema exibe alerta informando status suspenso
- ✅ Histórico de atendimentos anteriores permanece acessível

---

### 4️⃣ **CANCELADO** ⛔

**Condição:** Pagamento vencido há **61 dias ou mais**.

**Status no Sistema:** `cancelled`

**Mensagem Exibida:** "Cancelado - expirado há X dias"

**Características:**
- Cancelamento definitivo do contrato
- Todos os serviços bloqueados
- Necessário criar novo contrato para reativar

**Restrições:**
- ❌ Totalmente bloqueado para novos atendimentos
- ❌ Contrato considerado encerrado
- ✅ Histórico de atendimentos anteriores permanece registrado

---

## Linha do Tempo Visual

```
┌─────────────────────────────────────────────────────────────────┐
│                    CICLO DE INADIMPLÊNCIA                        │
└─────────────────────────────────────────────────────────────────┘

Dia 0: Vencimento do Pagamento
  │
  ├─► Dia 1-15: INATIVO (Período de Carência) ⚠️
  │              └─ Cliente pode regularizar sem bloqueios graves
  │
  ├─► Dia 16-60: SUSPENSO 🔴
  │              └─ Pet BLOQUEADO para novos atendimentos
  │
  └─► Dia 61+: CANCELADO ⛔
                 └─ Contrato definitivamente encerrado
```

---

## Cálculo da Data de Expiração

### Para Planos Mensais:
```
Data de Expiração = Data do Último Pagamento + 30 dias
```

**Exemplo:**
- Pagamento realizado em: 15/01/2025
- Data de expiração: 15/02/2025
- Dia 16/02/2025: Entra em INATIVO
- Dia 01/03/2025: Entra em SUSPENSO (16 dias após vencimento)
- Dia 17/04/2025: Entra em CANCELADO (61 dias após vencimento)

### Para Planos Anuais:
```
Data de Expiração = Data do Último Pagamento + 365 dias (1 ano)
```

**Exemplo:**
- Pagamento realizado em: 15/01/2024
- Data de expiração: 15/01/2025
- Dia 16/01/2025: Entra em INATIVO
- Dia 31/01/2025: Entra em SUSPENSO (16 dias após vencimento)
- Dia 17/03/2025: Entra em CANCELADO (61 dias após vencimento)

---

## Impacto no Sistema

### Durante Status SUSPENSO ou CANCELADO:

**Frontend:**
- Ao selecionar um pet com contrato suspenso/cancelado no formulário de atendimento, o sistema:
  - ❌ Bloqueia o avanço para próxima etapa
  - 📢 Exibe alerta informando o status do contrato
  - 📄 Mostra o nome do plano associado ao contrato

**Backend:**
- Validação automática antes de criar atendimentos
- Retorna erro caso o contrato esteja suspenso ou cancelado
- Mantém histórico completo de mudanças de status

---

## Implementação Técnica

### Localização no Código:
```
📁 server/services/payment-status-service.ts
```

### Constantes Configuradas:
```typescript
GRACE_PERIOD_DAYS = 15      // Período de carência
SUSPENSION_DAYS = 16        // Suspensão inicia no dia 16
CANCELLATION_DAYS = 60      // Cancelamento após 60 dias
```

### Função Principal:
```typescript
PaymentStatusService.evaluateContractPaymentStatus(contract)
```

Esta função é responsável por:
- Calcular a data de expiração do contrato
- Determinar quantos dias se passaram desde o vencimento
- Retornar o status calculado (active, inactive, suspended, cancelled)
- Fornecer informações detalhadas sobre o status atual

---

## Notas Importantes

1. **Automação:** O sistema calcula o status automaticamente em tempo real, sem necessidade de processos manuais.

2. **Preservação de Dados:** Mesmo contratos cancelados mantêm todo o histórico de atendimentos e dados dos pets.

3. **Reativação:** Para reativar um contrato suspenso ou cancelado, é necessário:
   - Regularizar o pagamento em atraso
   - Realizar novo pagamento da mensalidade/anuidade
   - Sistema automaticamente reativa o contrato ao confirmar pagamento

4. **Notificações:** Recomenda-se implementar notificações automáticas para alertar clientes:
   - 5 dias antes do vencimento
   - No dia do vencimento
   - Aos 7 dias de atraso (ainda em carência)
   - Aos 15 dias de atraso (último dia antes da suspensão)
   - Aos 30 dias de atraso (durante suspensão)
   - Aos 55 dias de atraso (5 dias antes do cancelamento definitivo)

---

## Resumo dos Status

| Status | Período | Dias de Atraso | Pode Criar Atendimentos? |
|--------|---------|----------------|--------------------------|
| ✅ ATIVO | Dentro da validade | 0 | ✅ Sim |
| ⚠️ INATIVO | Carência | 1-15 | ⚠️ Com restrições |
| 🔴 SUSPENSO | Suspenso | 16-60 | ❌ Não |
| ⛔ CANCELADO | Cancelado | 61+ | ❌ Não |

---

**Documento gerado em:** Outubro/2025  
**Versão:** 1.0  
**Sistema:** UNIPET PLAN
