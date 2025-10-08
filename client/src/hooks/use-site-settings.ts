import React from "react";
import { useQuery } from "@tanstack/react-query";
import { SiteSettings } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { clientConfig } from "../config";

// Função para formatar telefone brasileiro com formatação dinâmica para 8 ou 9 dígitos
export const formatBrazilianPhoneForDisplay = (value: string | null | undefined): string => {
  if (!value) return '';

  // Remove todos os caracteres não numéricos
  const numbers = value.replace(/\D/g, '');

  // Se não tem números, retorna vazio
  if (!numbers) return '';

  // Garante que sempre comece com 55 (código do Brasil)
  let cleanNumbers = numbers;
  if (!cleanNumbers.startsWith('55')) {
    cleanNumbers = '55' + cleanNumbers;
  }

  // Aplica a formatação baseada no tamanho
  if (cleanNumbers.length <= 2) {
    return `+${cleanNumbers}`;
  } else if (cleanNumbers.length <= 4) {
    return `+${cleanNumbers.substring(0, 2)} (${cleanNumbers.substring(2)})`;
  } else if (cleanNumbers.length <= 9) {
    return `+${cleanNumbers.substring(0, 2)} (${cleanNumbers.substring(2, 4)}) ${cleanNumbers.substring(4)}`;
  } else {
    const areaCode = cleanNumbers.substring(2, 4);
    const phoneDigits = cleanNumbers.substring(4);

    // Formatação dinâmica baseada na quantidade de dígitos após DDD
    if (phoneDigits.length <= 8) {
      // Formato para 8 dígitos: +55 (XX) XXXX-XXXX
      const firstPart = phoneDigits.substring(0, 4);
      const secondPart = phoneDigits.substring(4);
      return `+55 (${areaCode}) ${firstPart}${secondPart ? '-' + secondPart : ''}`;
    } else {
      // Formato para 9 dígitos: +55 (XX) XXXXX-XXXX
      const firstPart = phoneDigits.substring(0, 5);
      const secondPart = phoneDigits.substring(5);
      return `+55 (${areaCode}) ${firstPart}${secondPart ? '-' + secondPart : ''}`;
    }
  }
};

/**
 * Hook para buscar as configurações do site (versão pública)
 * Usado nos componentes do frontend para exibir informações de contato e conteúdo
 */
export function useSiteSettings() {
  return useQuery<SiteSettings>({
    queryKey: ["site-settings"],
    queryFn: async () => {
      try {
        console.log('🔍 [useSiteSettings] Fetching site settings...');
        // apiRequest já retorna os dados processados (já fez .json() internamente)
        const data = await apiRequest("GET", "/api/site-settings");
        console.log('✅ [useSiteSettings] Successfully fetched site settings:', data);
        return data;
      } catch (error) {
        // Capturar mais detalhes do erro
        const errorInfo = {
          message: error instanceof Error ? error.message : 'Unknown error',
          name: error instanceof Error ? error.name : 'Unknown',
          stack: error instanceof Error ? error.stack : undefined,
          originalError: error
        };
        console.warn('❌ [useSiteSettings] Failed to fetch site settings:', errorInfo);
        throw error; // Permitir que o React Query gerencie o erro adequadamente
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 15 * 60 * 1000, // 15 minutos
    retry: 1, // Reduzir tentativas para carregamento mais rápido
    retryDelay: 300, // Delay ainda menor
    refetchOnMount: true, // Buscar no mount para garantir dados atualizados
    refetchOnWindowFocus: true, // Buscar no foco da janela para refletir mudanças do admin
    networkMode: 'always', // Sempre tentar buscar mesmo offline
  });
}


/**
 * Utilitário para verificar se um campo de configuração deve ser exibido
 * Retorna true se o valor existe e não está vazio
 */
export function shouldShowField(value: string | null | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

/**
 * Utilitário para obter valores padrão quando as configurações não estão disponíveis
 * Usado como fallback durante o carregamento ou em caso de erro
 */
export const defaultSettings: Partial<SiteSettings> = {
  whatsapp: clientConfig.contact.whatsapp,
  email: clientConfig.contact.email,
  phone: clientConfig.contact.phone,
  address: clientConfig.contact.address,
  cnpj: clientConfig.contact.cnpj,
  businessHours: "Segunda a Sexta: 8h às 18h\nSábado: 8h às 14h\nEmergências: 24h todos os dias",
  ourStory: "A UNIPET PLAN nasceu da paixão de veterinários experientes que acreditam que todo animal merece cuidados de qualidade, independentemente da condição financeira de seus tutores. Nossa missão é tornar os cuidados veterinários acessíveis a todos, oferecendo planos de saúde que garantem o bem-estar dos pets.",
  mainImage: "/Cachorros.jpg",
  networkImage: null,
  aboutImage: "/inicio-sobre.jpg",
};

/**
 * Hook que combina as configurações do site com valores padrão
 * Garante que sempre haverá valores disponíveis, mesmo durante o carregamento
 * Aplica formatação automática aos números de telefone
 */
export function useSiteSettingsWithDefaults() {
  const { data: settings, isLoading, error } = useSiteSettings();

  // Type assertion para garantir que as propriedades sejam reconhecidas
  const typedSettings = settings as SiteSettings | undefined;

  // Debug logging apenas quando necessário
  if (!typedSettings && !isLoading && error) {
    console.log('❌ Site settings error:', error);
  }

  // Otimizar loading - usar defaults mais rapidamente quando dados não estão disponíveis
  const settingsWithDefaults = !typedSettings ? {
    ...defaultSettings,
    mainImage: isLoading ? undefined : defaultSettings.mainImage,
    networkImage: isLoading ? undefined : defaultSettings.networkImage,
    aboutImage: isLoading ? undefined : defaultSettings.aboutImage,
  } : {
    ...defaultSettings,
    ...typedSettings,
    // Aplicar formatação aos telefones se existirem
    whatsapp: typedSettings.whatsapp ? formatBrazilianPhoneForDisplay(typedSettings.whatsapp) : defaultSettings.whatsapp,
    phone: typedSettings.phone ? formatBrazilianPhoneForDisplay(typedSettings.phone) : defaultSettings.phone,
  };

  return {
    settings: settingsWithDefaults,
    isLoading,
    error,
    // Funções utilitárias para verificar visibilidade
    shouldShow: {
      whatsapp: shouldShowField(typedSettings?.whatsapp),
      email: shouldShowField(typedSettings?.email),
      phone: shouldShowField(typedSettings?.phone),
      address: shouldShowField(typedSettings?.address),
      instagramUrl: shouldShowField(typedSettings?.instagramUrl),
      facebookUrl: shouldShowField(typedSettings?.facebookUrl),
      linkedinUrl: shouldShowField(typedSettings?.linkedinUrl),
      youtubeUrl: shouldShowField(typedSettings?.youtubeUrl),
      cnpj: shouldShowField(typedSettings?.cnpj),
      businessHours: shouldShowField(typedSettings?.businessHours),
      ourStory: shouldShowField(typedSettings?.ourStory),
    },
  };
}