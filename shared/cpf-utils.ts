/**
 * Normaliza um CPF removendo caracteres não numéricos
 * @param cpf - CPF com ou sem máscara
 * @returns CPF apenas com números
 */
export function normalizeCPF(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

/**
 * Formata um CPF adicionando máscara
 * @param cpf - CPF apenas com números
 * @returns CPF formatado (000.000.000-00)
 */
export function formatCPF(cpf: string): string {
  const normalized = normalizeCPF(cpf);
  if (normalized.length !== 11) return cpf;
  
  return normalized.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Mascara um CPF parcialmente para exibição segura
 * @param cpf - CPF com ou sem máscara
 * @returns CPF mascarado (***.***.***-45)
 */
export function maskCPF(cpf: string): string {
  const normalized = normalizeCPF(cpf);
  if (normalized.length !== 11) return cpf;
  
  const lastDigits = normalized.slice(-2);
  return `***.***.**${lastDigits}`;
}
