/**
 * Utilitários para chamadas de API que funcionam em desenvolvimento e produção
 */

/**
 * Busca dados de endereço pelo CEP
 * Funciona tanto em desenvolvimento quanto em produção
 */
export async function fetchAddressByCEP(cep: string): Promise<{
  success: boolean;
  data?: {
    street: string;
    neighborhood: string;
    city: string;
    state: string;
    logradouro?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
  };
  error?: string;
}> {
  const cleanCEP = cep.replace(/\D/g, '');
  
  if (cleanCEP.length !== 8) {
    return {
      success: false,
      error: 'CEP deve conter 8 dígitos'
    };
  }
  
  try {
    // Usar URL relativa para funcionar tanto em dev quanto em produção
    const response = await fetch(`/api/cep/${cleanCEP}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      // Se a API interna falhar, registrar o erro
      console.warn('API interna falhou para CEP:', cleanCEP);
      
      throw new Error(`Erro ao buscar CEP: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success && result.data) {
      // Normalizar os dados para um formato consistente
      const data = {
        street: result.data.street || result.data.logradouro || '',
        neighborhood: result.data.neighborhood || result.data.bairro || '',
        city: result.data.city || result.data.localidade || '',
        state: result.data.state || result.data.uf || '',
        // Manter campos originais para compatibilidade
        logradouro: result.data.street || result.data.logradouro || '',
        bairro: result.data.neighborhood || result.data.bairro || '',
        localidade: result.data.city || result.data.localidade || '',
        uf: result.data.state || result.data.uf || ''
      };
      
      return {
        success: true,
        data
      };
    }
    
    return {
      success: false,
      error: result.error || 'CEP não encontrado'
    };
    
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    
    // Em caso de erro, retornar mensagem amigável
    return {
      success: false,
      error: 'Não foi possível buscar o endereço. Por favor, preencha manualmente.'
    };
  }
}

/**
 * Formata CEP para exibição (00000-000)
 */
export function formatCEP(cep: string): string {
  const cleanCEP = cep.replace(/\D/g, '');
  if (cleanCEP.length === 8) {
    return `${cleanCEP.slice(0, 5)}-${cleanCEP.slice(5)}`;
  }
  return cep;
}

/**
 * Valida se o CEP tem o formato correto
 */
export function isValidCEP(cep: string): boolean {
  const cleanCEP = cep.replace(/\D/g, '');
  return /^\d{8}$/.test(cleanCEP);
}