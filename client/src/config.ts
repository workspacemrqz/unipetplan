/**
 * Configuração automática do cliente
 * Todas as variáveis são carregadas automaticamente do servidor
 * ou usam valores padrão se não estiverem disponíveis
 */

export const clientConfig = {
  // Informações de contato padrão
  contact: {
    whatsapp: import.meta.env.VITE_DEFAULT_WHATSAPP || "(11) 99999-9999",
    email: import.meta.env.VITE_DEFAULT_EMAIL || "contato@unipetplan.com.br",
    phone: import.meta.env.VITE_DEFAULT_PHONE || "0800 123 4567",
    address: import.meta.env.VITE_DEFAULT_ADDRESS || "AVENIDA DOM SEVERINO, 1372, FATIMA - Teresina/PI",
    cnpj: import.meta.env.VITE_DEFAULT_CNPJ || "00.000.000/0001-00",
  },
  
  // Configurações do ambiente
  env: {
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
    mode: import.meta.env.MODE,
  },
  
  // Configurações da API
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || "",
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || "10000"),
  },
  
  // Configurações de upload
  upload: {
    maxFileSize: parseInt(import.meta.env.VITE_MAX_FILE_SIZE || "5242880"), // 5MB
    allowedTypes: import.meta.env.VITE_ALLOWED_FILE_TYPES?.split(',') || ['image/jpeg', 'image/png', 'image/gif'],
  },
  
  // Configurações de paginação
  pagination: {
    defaultPageSize: parseInt(import.meta.env.VITE_DEFAULT_PAGE_SIZE || "10"),
    maxPageSize: parseInt(import.meta.env.VITE_MAX_PAGE_SIZE || "100"),
  },
  
  // Configurações de cache
  cache: {
    defaultTtl: parseInt(import.meta.env.VITE_DEFAULT_CACHE_TTL || "300000"), // 5 minutos
    maxTtl: parseInt(import.meta.env.VITE_MAX_CACHE_TTL || "3600000"), // 1 hora
  },
  
  // Configurações de UI
  ui: {
    theme: import.meta.env.VITE_THEME || "light",
    language: import.meta.env.VITE_LANGUAGE || "pt-BR",
    timezone: import.meta.env.VITE_TIMEZONE || "America/Sao_Paulo",
  },
  
  // Configurações de analytics
  analytics: {
    enabled: import.meta.env.VITE_ANALYTICS_ENABLED === "true",
    trackingId: import.meta.env.VITE_ANALYTICS_TRACKING_ID || "",
  },
  
  // Configurações de monitoramento
  monitoring: {
    enabled: import.meta.env.VITE_MONITORING_ENABLED === "true",
    endpoint: import.meta.env.VITE_MONITORING_ENDPOINT || "",
  },
  
  // Configurações de feature flags
  features: {
    darkMode: import.meta.env.VITE_FEATURE_DARK_MODE === "true",
    advancedSearch: import.meta.env.VITE_FEATURE_ADVANCED_SEARCH === "true",
    realTimeUpdates: import.meta.env.VITE_FEATURE_REALTIME_UPDATES === "true",
  },
};

/**
 * Função para obter uma configuração específica
 */
export function getConfig<T>(key: string, defaultValue?: T): T {
  const keys = key.split('.');
  let value: any = clientConfig;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return defaultValue as T;
    }
  }
  
  return value;
}

/**
 * Função para verificar se uma configuração existe
 */
export function hasConfig(key: string): boolean {
  try {
    return getConfig(key) !== undefined;
  } catch {
    return false;
  }
}

/**
 * Função para obter todas as configurações
 */
export function getAllConfig() {
  return clientConfig;
}

/**
 * Função para validar se as configurações obrigatórias estão presentes
 */
export function validateRequiredConfig(): string[] {
  const required = [
    'contact.whatsapp',
    'contact.email',
    'contact.phone',
    'contact.address',
    'contact.cnpj'
  ];
  
  const missing: string[] = [];
  
  required.forEach(key => {
    if (!getConfig(key)) {
      missing.push(key);
    }
  });
  
  return missing;
}

/**
 * Função para aplicar configurações personalizadas
 */
export function applyCustomConfig(customConfig: Partial<typeof clientConfig>) {
  Object.assign(clientConfig, customConfig);
}

// Log das configurações carregadas (apenas em desenvolvimento)
if (import.meta.env.DEV) {
  console.log('🌐 Configurações do cliente carregadas:', clientConfig);
  
  const missing = validateRequiredConfig();
  if (missing.length > 0) {
    console.warn('⚠️ Configurações obrigatórias faltando:', missing);
  }
}

export default clientConfig;
