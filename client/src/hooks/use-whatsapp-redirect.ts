import { useSiteSettings } from './use-site-settings';

/**
 * Hook para gerar links de redirecionamento para WhatsApp
 * usando o número configurado nas configurações do site
 */
export function useWhatsAppRedirect() {
  const { data: settings } = useSiteSettings();
  
  const getWhatsAppLink = (message?: string) => {
    if (!settings?.whatsapp) {
      console.warn('WhatsApp number not configured in site settings');
      return '#';
    }
    
    // Remove caracteres não numéricos do número
    const cleanNumber = settings.whatsapp.replace(/\D/g, '');
    
    // Adiciona código do país se não estiver presente
    const fullNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;
    
    // Cria o link do WhatsApp
    let link = `https://wa.me/${fullNumber}`;
    
    // Adiciona mensagem se fornecida
    if (message) {
      link += `?text=${encodeURIComponent(message)}`;
    }
    
    return link;
  };
  
  const redirectToWhatsApp = (message?: string) => {
    const link = getWhatsAppLink(message);
    if (link !== '#') {
      window.open(link, '_blank');
    }
  };
  
  return {
    getWhatsAppLink,
    redirectToWhatsApp,
    isConfigured: !!settings?.whatsapp
  };
}