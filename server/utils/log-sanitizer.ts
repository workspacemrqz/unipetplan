/**
 * Utility for sanitizing sensitive data in logs
 * Prevents exposure of CPF, credit cards, passwords, etc in console logs
 */

interface SanitizeOptions {
  replacementChar?: string;
  showLast4Digits?: boolean;
}

/**
 * Sanitizes CPF in text - shows only last 4 digits
 * Example: 123.456.789-00 → ***.***.***-00
 */
export function sanitizeCPF(cpf: string | null | undefined, options: SanitizeOptions = {}): string {
  if (!cpf) return '';
  
  const { replacementChar = '*', showLast4Digits = true } = options;
  const cleanCPF = cpf.replace(/\D/g, '');
  
  if (showLast4Digits && cleanCPF.length >= 11) {
    const last2 = cleanCPF.slice(-2);
    const masked = replacementChar.repeat(9);
    return `${masked.slice(0, 3)}.${masked.slice(3, 6)}.${masked.slice(6, 9)}-${last2}`;
  }
  
  return replacementChar.repeat(11);
}

/**
 * Sanitizes credit card number - shows only last 4 digits
 * Example: 1234567890123456 → ************3456
 */
export function sanitizeCreditCard(cardNumber: string | null | undefined, options: SanitizeOptions = {}): string {
  if (!cardNumber) return '';
  
  const { replacementChar = '*', showLast4Digits = true } = options;
  const cleanCard = cardNumber.replace(/\D/g, '');
  
  if (showLast4Digits && cleanCard.length >= 4) {
    const last4 = cleanCard.slice(-4);
    return replacementChar.repeat(cleanCard.length - 4) + last4;
  }
  
  return replacementChar.repeat(cleanCard.length);
}

/**
 * Sanitizes password - completely hidden
 */
export function sanitizePassword(password: string | null | undefined): string {
  if (!password) return '';
  return '********';
}

/**
 * Sanitizes email - shows first char and domain
 * Example: user@example.com → u***@example.com
 */
export function sanitizeEmail(email: string | null | undefined, options: SanitizeOptions = {}): string {
  if (!email) return '';
  
  const { replacementChar = '*' } = options;
  const parts = email.split('@');
  
  if (parts.length !== 2) return email;
  
  const [username, domain] = parts;
  const maskedUsername = username[0] + replacementChar.repeat(Math.max(username.length - 1, 3));
  
  return `${maskedUsername}@${domain}`;
}

/**
 * Sanitizes phone number - shows only last 4 digits
 * Example: (11) 98765-4321 → (11) ****-4321
 */
export function sanitizePhone(phone: string | null | undefined, options: SanitizeOptions = {}): string {
  if (!phone) return '';
  
  const { replacementChar = '*', showLast4Digits = true } = options;
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (showLast4Digits && cleanPhone.length >= 4) {
    const last4 = cleanPhone.slice(-4);
    const areaCode = cleanPhone.slice(0, 2);
    return `(${areaCode}) ${replacementChar.repeat(cleanPhone.length - 6)}-${last4}`;
  }
  
  return replacementChar.repeat(cleanPhone.length);
}

/**
 * Sanitizes an entire object recursively, replacing sensitive fields
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T, 
  sensitiveFields: string[] = [
    'password', 'senha', 
    'cpf', 
    'email', 
    'phone', 'telefone', 'whatsapp',
    'creditCard', 'cardNumber', 'cvv', 'securityCode'
  ]
): T {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, sensitiveFields)) as unknown as T;
  }
  
  const sanitized = { ...obj };
  
  for (const key in sanitized) {
    const lowerKey = key.toLowerCase();
    
    // Check if this is a sensitive field
    if (sensitiveFields.some(field => lowerKey.includes(field.toLowerCase()))) {
      if (lowerKey.includes('cpf')) {
        sanitized[key] = sanitizeCPF(sanitized[key]) as any;
      } else if (lowerKey.includes('card') || lowerKey.includes('creditcard')) {
        sanitized[key] = sanitizeCreditCard(sanitized[key]) as any;
      } else if (lowerKey.includes('password') || lowerKey.includes('senha')) {
        sanitized[key] = sanitizePassword(sanitized[key]) as any;
      } else if (lowerKey.includes('email')) {
        sanitized[key] = sanitizeEmail(sanitized[key]) as any;
      } else if (lowerKey.includes('phone') || lowerKey.includes('telefone') || lowerKey.includes('whatsapp')) {
        sanitized[key] = sanitizePhone(sanitized[key]) as any;
      } else {
        sanitized[key] = '***REDACTED***' as any;
      }
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeObject(sanitized[key], sensitiveFields) as any;
    }
  }
  
  return sanitized;
}

/**
 * Safe console.log that automatically sanitizes sensitive data
 */
export function safeLog(message: string, data?: any) {
  if (data && typeof data === 'object') {
    console.log(message, sanitizeObject(data));
  } else {
    console.log(message, data);
  }
}

/**
 * Safe console.error that automatically sanitizes sensitive data
 */
export function safeError(message: string, error?: any) {
  if (error && typeof error === 'object' && error.message) {
    // For Error objects, log the message but sanitize any data
    const sanitizedError = {
      message: error.message,
      ...(error.stack && { stack: error.stack }),
      ...sanitizeObject(error)
    };
    console.error(message, sanitizedError);
  } else {
    console.error(message, error);
  }
}

/**
 * Creates a sanitized log message for performance tracking
 */
export function createPerformanceLog(
  operation: string,
  duration: number,
  data: Record<string, any>
): string {
  const sanitizedData = sanitizeObject(data);
  return `⏱️ [PERFORMANCE-${operation.toUpperCase()}] ${duration.toFixed(2)}ms ${JSON.stringify(sanitizedData)}`;
}
