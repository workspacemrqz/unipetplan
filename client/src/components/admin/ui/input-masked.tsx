import * as React from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

export interface InputMaskedProps extends React.ComponentProps<typeof Input> {
  mask?: "cpf" | "cnpj" | "phone" | "whatsapp" | "email" | "price" | "cep" | "url-slug";
  onMaskedChange?: (value: string) => void;
}

const InputMasked = React.forwardRef<HTMLInputElement, InputMaskedProps>(
  ({ className, mask, onMaskedChange, onChange, ...props }, ref) => {
    const applyMask = (value: string, maskType?: string) => {
      switch (maskType) {
        case "cpf":
          return value
            .replace(/\D/g, "")
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
        
        case "cnpj":
          return value
            .replace(/\D/g, "")
            .replace(/(\d{2})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d)/, "$1/$2")
            .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
        
        case "phone":
          const phoneNumbers = value.replace(/\D/g, "");
          if (phoneNumbers.length <= 10) {
            return phoneNumbers
              .replace(/(\d{2})(\d)/, "($1) $2")
              .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
          } else {
            return phoneNumbers
              .replace(/(\d{2})(\d)/, "($1) $2")
              .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
          }
        
        case "whatsapp":
          const whatsappNumbers = value.replace(/\D/g, "");
          if (whatsappNumbers.length <= 2) {
            // Apenas DDD: (11
            return whatsappNumbers.replace(/(\d{2})/, "($1");
          } else if (whatsappNumbers.length <= 10) {
            // Formato para telefone fixo: (11) 1234-5678
            return whatsappNumbers
              .replace(/(\d{2})(\d)/, "($1) $2")
              .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
          } else {
            // Formato para celular: (11) 91234-5678
            return whatsappNumbers
              .replace(/(\d{2})(\d)/, "($1) $2")
              .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
          }
        
        case "cep":
          return value
            .replace(/\D/g, "")
            .replace(/(\d{5})(\d{1,3})$/, "$1-$2");
        
        case "price":
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
        
        case "email":
          return value.toLowerCase().trim();
        
        case "url-slug":
          return value
            .toLowerCase() // Converte para minúsculas
            .replace(/\s/g, '-') // Converte espaços em hífens
            .replace(/[àáâäãåąčćęèéêëėįìíîïłńòóôöõøùúûüųūÿýżźñçčšž]/g, '') // Remove acentos
            .replace(/[^a-z0-9-]/g, '') // Remove caracteres inválidos
            .replace(/-+/g, '-') // Remove hífens consecutivos
            .replace(/^-+|-+$/g, ''); // Remove hífens do início e fim
        
        default:
          return value;
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const maskedValue = applyMask(e.target.value, mask);
      
      // Atualiza o valor do input com a máscara
      e.target.value = maskedValue;
      
      // Chama o onChange original
      onChange?.(e);
      
      // Chama o callback personalizado com o valor mascarado
      onMaskedChange?.(maskedValue);
    };

    return (
      <Input
        className={cn(className)}
        ref={ref}
        onChange={handleChange}
        {...props}
      />
    );
  }
);

InputMasked.displayName = "InputMasked";

export { InputMasked };
