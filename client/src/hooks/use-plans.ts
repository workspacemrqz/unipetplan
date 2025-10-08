import { useQuery } from "@tanstack/react-query";
import { Plan } from "@shared/schema";

/**
 * Hook para buscar planos ativos do banco de dados
 * Retorna os planos ordenados por displayOrder
 */
export function usePlans() {
  return useQuery<Plan[]>({
    queryKey: ["plans"],
    queryFn: async (): Promise<Plan[]> => {
      const response = await fetch("/api/plans");
      if (!response.ok) {
        throw new Error("Falha ao carregar planos");
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 2,
  });
}

/**
 * Função para formatar o preço de centavos para reais
 */
export function formatPrice(priceInCents: number): string {
  return (priceInCents / 100).toFixed(2).replace('.', ',');
}

/**
 * Função para criar o texto de exibição do plano (nome + preço)
 */
export function getPlanDisplayText(plan: Plan): string {
  // Usar basePrice que já está em reais como string
  const priceStr = parseFloat(plan.basePrice || '0').toFixed(2).replace('.', ',');
  return `${plan.name} - R$${priceStr}/mês`;
}
