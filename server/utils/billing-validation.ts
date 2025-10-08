/**
 * Billing Period Validation Utilities
 * 
 * Garante que o período de cobrança (billing period) seja compatível
 * com o tipo de plano escolhido, prevenindo bugs de cobrança incorreta.
 * 
 * ⚠️ IMPORTANTE: Esta validação depende dos NOMES dos planos conterem
 * as palavras-chave corretas (COMFORT, PLATINUM, BASIC, INFINITY).
 * Ao criar ou renomear planos, certifique-se de manter essas keywords
 * para garantir a detecção correta do tipo de cobrança.
 */

import type { plans } from "../../shared/schema.js";
import type { InferSelectModel } from "drizzle-orm";

type Plan = InferSelectModel<typeof plans>;

/**
 * Determina o billing period correto baseado no nome do plano
 * 
 * Regras de negócio:
 * - COMFORT e PLATINUM: Sempre ANUAL (365 dias)
 * - BASIC e INFINITY: Sempre MENSAL (30 dias)
 * 
 * @param planName - Nome do plano
 * @returns 'annual' para planos anuais, 'monthly' para planos mensais
 */
export function getCorrectBillingPeriod(planName: string): 'annual' | 'monthly' {
  const normalizedName = planName.toUpperCase().trim();
  
  // Planos anuais
  if (normalizedName.includes('COMFORT') || normalizedName.includes('PLATINUM')) {
    return 'annual';
  }
  
  // Planos mensais (BASIC, INFINITY, ou qualquer outro)
  return 'monthly';
}

/**
 * Valida se o billing period fornecido é compatível com o plano
 * 
 * @param plan - Objeto do plano
 * @param billingPeriod - Período de cobrança solicitado
 * @returns true se válido, false se incompatível
 */
export function validateBillingPeriod(
  plan: Plan | { name: string },
  billingPeriod: 'monthly' | 'annual'
): boolean {
  const correctPeriod = getCorrectBillingPeriod(plan.name);
  return billingPeriod === correctPeriod;
}

/**
 * Valida e retorna o billing period correto, lançando erro se houver incompatibilidade
 * 
 * @param plan - Objeto do plano
 * @param requestedBillingPeriod - Período de cobrança solicitado (opcional)
 * @returns O billing period correto para o plano
 * @throws Error se o período solicitado for incompatível
 */
export function enforceCorrectBillingPeriod(
  plan: Plan | { name: string },
  requestedBillingPeriod?: 'monthly' | 'annual'
): 'annual' | 'monthly' {
  const correctPeriod = getCorrectBillingPeriod(plan.name);
  
  // Se um período foi solicitado explicitamente, validar
  if (requestedBillingPeriod && requestedBillingPeriod !== correctPeriod) {
    const planType = correctPeriod === 'annual' ? 'anual' : 'mensal';
    const requestedType = requestedBillingPeriod === 'annual' ? 'anual' : 'mensal';
    
    throw new Error(
      `❌ Incompatibilidade de período de cobrança: ` +
      `O plano "${plan.name}" é ${planType}, ` +
      `mas foi solicitado período ${requestedType}. ` +
      `Esta operação foi bloqueada para prevenir cobranças incorretas.`
    );
  }
  
  return correctPeriod;
}

/**
 * Determina se um plano é anual baseado no nome
 * 
 * @param planName - Nome do plano
 * @returns true se o plano for anual (COMFORT ou PLATINUM)
 */
export function isAnnualPlan(planName: string): boolean {
  return getCorrectBillingPeriod(planName) === 'annual';
}

/**
 * Informações sobre regras de billing por tipo de plano
 */
export const BILLING_RULES = {
  ANNUAL_PLANS: ['COMFORT', 'PLATINUM'],
  MONTHLY_PLANS: ['BASIC', 'INFINITY'],
  ANNUAL_CYCLE_DAYS: 365,
  MONTHLY_CYCLE_DAYS: 30,
} as const;
