import { useQuery } from "@tanstack/react-query";
import { Species } from "@shared/schema";

/**
 * Hook para buscar espécies ativas do banco de dados
 * Retorna as espécies ordenadas por displayOrder
 */
export function useSpecies() {
  return useQuery<Species[]>({
    queryKey: ["species"],
    queryFn: async (): Promise<Species[]> => {
      const response = await fetch("/api/species");
      if (!response.ok) {
        throw new Error("Falha ao carregar espécies");
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 2,
  });
}