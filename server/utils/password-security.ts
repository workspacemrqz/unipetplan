import bcrypt from 'bcryptjs';
import crypto from 'crypto';

/**
 * Verifica se uma string é um hash bcrypt válido
 */
export function isBcryptHash(str: string): boolean {
  // Hashes bcrypt começam com $2a$, $2b$ ou $2y$ seguido de cost factor
  return /^\$2[aby]\$\d{2}\$/.test(str);
}

/**
 * Converte uma senha plaintext para bcrypt hash
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  // Use um salt factor de 12 para boa segurança e performance
  const saltRounds = 12;
  return await bcrypt.hash(plainPassword, saltRounds);
}

/**
 * Verifica uma senha contra um hash ou plaintext (com migração automática)
 */
export async function verifyPassword(
  inputPassword: string, 
  storedPassword: string,
  autoMigrate: boolean = false
): Promise<{ valid: boolean; needsMigration: boolean; newHash?: string }> {
  
  // Se é um hash bcrypt, fazer verificação segura
  if (isBcryptHash(storedPassword)) {
    const valid = await bcrypt.compare(inputPassword, storedPassword);
    return { valid, needsMigration: false };
  }
  
  // Se não é bcrypt, é plaintext (inseguro!)
  console.warn('⚠️ [SECURITY] Senha em texto simples detectada!');
  
  // Verificar em produção
  const isProduction = process.env.NODE_ENV === 'production';
  const isReplit = process.env.REPL_ID || process.env.REPL_OWNER || process.env.REPLIT_DEPLOYMENT;
  
  // Em produção real (não Replit), não permitir plaintext
  if (isProduction && !isReplit) {
    console.error('❌ [SECURITY] Senha plaintext em produção não é permitida!');
    return { valid: false, needsMigration: true };
  }
  
  // Comparação plaintext (temporária)
  const valid = inputPassword === storedPassword;
  
  // Se válida e autoMigrate habilitado, gerar novo hash
  if (valid && autoMigrate) {
    const newHash = await hashPassword(inputPassword);
    console.log('✅ [SECURITY] Senha migrada para bcrypt');
    return { valid, needsMigration: true, newHash };
  }
  
  return { valid, needsMigration: true };
}

/**
 * Gera uma senha segura aleatória
 */
export function generateSecurePassword(length: number = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  const randomBytes = crypto.randomBytes(length);
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }
  
  return password;
}

/**
 * Gera um token seguro para sessões
 */
export function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Valida força da senha
 */
export function validatePasswordStrength(password: string): {
  isStrong: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Senha deve ter pelo menos 8 caracteres');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Senha deve conter letras minúsculas');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Senha deve conter letras maiúsculas');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Senha deve conter números');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Senha deve conter caracteres especiais');
  }
  
  // Verificar senhas comuns
  const commonPasswords = [
    'password', '123456', '12345678', 'qwerty', 'abc123',
    'password123', 'admin', 'letmein', 'welcome', 'monkey'
  ];
  
  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    errors.push('Senha é muito comum ou previsível');
  }
  
  return {
    isStrong: errors.length === 0,
    errors
  };
}

/**
 * Sanitiza o admin password do ambiente
 */
export async function getSecureAdminPassword(): Promise<string | null> {
  const adminPassword = process.env.SENHA;
  
  if (!adminPassword) {
    console.error('❌ [SECURITY] SENHA não configurada no ambiente');
    return null;
  }
  
  // Se já é bcrypt, retornar como está
  if (isBcryptHash(adminPassword)) {
    return adminPassword;
  }
  
  // Se é plaintext, verificar ambiente
  const isProduction = process.env.NODE_ENV === 'production';
  const isReplit = process.env.REPL_ID || process.env.REPL_OWNER;
  
  if (isProduction && !isReplit) {
    console.error('❌ [SECURITY] Senha plaintext em produção! Configure SENHA com hash bcrypt');
    
    // Gerar hash para exemplo
    const hash = await hashPassword(adminPassword);
    console.error('💡 [SECURITY] Use este hash no lugar da senha plaintext:');
    console.error(`SENHA="${hash}"`);
    
    return null; // Não permitir em produção
  }
  
  // Em desenvolvimento/Replit, converter para bcrypt na memória
  console.warn('⚠️ [SECURITY] Convertendo senha plaintext para bcrypt (apenas em memória)');
  return await hashPassword(adminPassword);
}