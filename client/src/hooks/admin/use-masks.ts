import { useCallback } from "react";

export function useMasks() {
  const applyCPFMask = useCallback((value: string) => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, "");
    
    // Aplica a máscara: 000.000.000-00
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    
    return value;
  }, []);

  const applyCNPJMask = useCallback((value: string) => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, "");
    
    // Aplica a máscara: 00.000.000/0000-00
    if (numbers.length <= 14) {
      return numbers
        .replace(/(\d{2})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1/$2")
        .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
    }
    
    return value;
  }, []);

  const applyPhoneMask = useCallback((value: string) => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, "");
    
    // Aplica a máscara: (00) 00000-0000 ou (00) 0000-0000
    if (numbers.length <= 11) {
      if (numbers.length <= 10) {
        // Telefone fixo: (00) 0000-0000
        return numbers
          .replace(/(\d{2})(\d)/, "($1) $2")
          .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
      } else {
        // Celular: (00) 00000-0000
        return numbers
          .replace(/(\d{2})(\d)/, "($1) $2")
          .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
      }
    }
    
    return value;
  }, []);

  const applyWhatsAppMask = useCallback((value: string) => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, "");
    
    if (numbers.length <= 2) {
      // Apenas DDD: (11
      return numbers.replace(/(\d{2})/, "($1");
    } else if (numbers.length <= 10) {
      // Formato para telefone fixo: (11) 1234-5678
      return numbers
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
    } else {
      // Formato para celular: (11) 91234-5678
      return numbers
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
    }
  }, []);

  const applyEmailMask = useCallback((value: string) => {
    // Email não precisa de máscara, apenas validação
    return value.toLowerCase().trim();
  }, []);

  const applyPriceMask = useCallback((value: string) => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, "");
    
    // Se não tem números, retorna vazio
    if (!numbers) return "";
    
    // Converte para número e formata no padrão brasileiro
    const numericValue = parseInt(numbers) / 100;
    
    // Formata com separadores de milhares e decimais
    return numericValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }, []);

  const applyCEPMask = useCallback((value: string) => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, "");
    
    // Aplica a máscara: 00000-000
    if (numbers.length <= 8) {
      return numbers.replace(/(\d{5})(\d{1,3})$/, "$1-$2");
    }
    
    return value;
  }, []);

  return {
    applyCPFMask,
    applyCNPJMask,
    applyPhoneMask,
    applyWhatsAppMask,
    applyEmailMask,
    applyPriceMask,
    applyCEPMask,
  };
}
