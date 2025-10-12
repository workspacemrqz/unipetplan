import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Global flag to track auth failures and prevent redirect loops
let isRedirectingToLogin = false;

// Variável que será definida após a criação do queryClient
let adminQueryClient: QueryClient;

// Global function to handle 401 errors and redirect to login
function handleUnauthorized() {
  if (isRedirectingToLogin) {
    return; // Evitar múltiplos redirecionamentos
  }
  
  console.log("🔒 [ADMIN-CLIENT] 401 detected - clearing cache and redirecting to login");
  isRedirectingToLogin = true;
  
  // Limpar todo o cache se disponível
  if (adminQueryClient) {
    adminQueryClient.clear();
  }
  
  // Redirecionar para login após um pequeno delay para evitar race conditions
  setTimeout(() => {
    window.location.href = '/admin/login';
    isRedirectingToLogin = false;
  }, 100);
}

// Utility function to ensure API URLs are correctly prefixed for admin
function resolveApiUrl(url: string): string {
  if (url.startsWith('/admin/api/')) {
    return url; // URL já tem o prefixo correto
  }
  if (url.startsWith('/api/')) {
    return `/admin${url}`; // Adiciona prefixo admin se necessário
  }
  return url;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Interceptar 401s globalmente
    if (res.status === 401) {
      handleUnauthorized();
      throw new Error('UNAUTHORIZED');
    }
    
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  const resolvedUrl = resolveApiUrl(url);
  const res = await fetch(resolvedUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : null,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // Para respostas com status 204 (No Content), não tentar fazer JSON.parse
  if (res.status === 204) {
    return null;
  }
  
  return await res.json();
}

// Enhanced query function that supports queryKeys with parameters and handles 401s globally
export const getQueryFn: <T>() => QueryFunction<T> =
  () =>
  async ({ queryKey }) => {
    // Handle different queryKey formats:
    // [path] -> /path
    // [path, id] -> /path/id (for detail views)
    // [path, id, subpath] -> /path/id/subpath (for nested resources)
    // [path, params] where params is object -> /path?key=value (for filters)
    
    const basePath = queryKey[0] as string;
    let url = basePath;
    
    // Build URL based on queryKey structure
    if (queryKey.length > 1) {
      const secondParam = queryKey[1];
      
      // If it's an object, treat as query parameters
      if (typeof secondParam === 'object' && secondParam !== null && !Array.isArray(secondParam)) {
        const params = secondParam as Record<string, any>;
        if (Object.keys(params).length > 0) {
          const searchParams = new URLSearchParams();
          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              searchParams.append(key, String(value));
            }
          });
          url = `${basePath}?${searchParams.toString()}`;
        }
      }
      // If it's a string or number, treat as path segment (ID)
      else if (typeof secondParam === 'string' || typeof secondParam === 'number') {
        url = `${basePath}/${secondParam}`;
        
        // Check for additional path segments (e.g., /clients/{id}/pets)
        if (queryKey.length > 2 && typeof queryKey[2] === 'string') {
          url = `${url}/${queryKey[2]}`;
        }
      }
    }
    
    const resolvedUrl = resolveApiUrl(url);
    
    console.log(`🔍 [ADMIN-CLIENT] Fetching: ${resolvedUrl}`);
    
    // Only disable cache for real-time data or when explicitly needed
    // Allow browser and React Query caching for better performance
    const headers: HeadersInit = {};
    
    // Only add no-cache headers for real-time endpoints
    const isRealtimeEndpoint = url.includes('/dashboard/') || 
                               url.includes('/stats') ||
                               url.includes('/realtime');
    
    if (isRealtimeEndpoint) {
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      headers['Pragma'] = 'no-cache';
    }
    
    const res = await fetch(resolvedUrl, {
      credentials: "include",
      headers
    });

    console.log(`🔍 [ADMIN-CLIENT] Response status for ${resolvedUrl}: ${res.status}`);

    // Interceptar 401s globalmente - sempre redirecionar para login
    if (res.status === 401) {
      handleUnauthorized();
      throw new Error('UNAUTHORIZED');
    }

    await throwIfResNotOk(res);
    
    // Para respostas com status 204 (No Content), não tentar fazer JSON.parse
    if (res.status === 204) {
      return null;
    }
    
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn(),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 10 * 60 * 1000, // 10 minutos para dados gerais (increased from 5)
      gcTime: 30 * 60 * 1000, // 30 minutos (increased from 10) 
      retry: (failureCount, error) => {
        // Don't retry on 401/403 errors (auth issues)
        if (error?.message?.includes('401') || error?.message?.includes('403')) {
          return false;
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: false,
    },
  },
});

// Definir a referência para o handler global
adminQueryClient = queryClient;

// Cache version management - força limpeza após refatoração de "guides" para "atendimentos"
const CURRENT_CACHE_VERSION = '2.0';
const CACHE_VERSION_KEY = 'admin-cache-version';

function checkAndClearOldCache() {
  try {
    const storedVersion = localStorage.getItem(CACHE_VERSION_KEY);
    
    console.log('🔍 [ADMIN-CACHE] Verificando versão do cache...', {
      storedVersion,
      currentVersion: CURRENT_CACHE_VERSION
    });
    
    // Se não existe versão ou é diferente da atual, limpar cache
    if (!storedVersion || storedVersion !== CURRENT_CACHE_VERSION) {
      console.log('🧹 [ADMIN-CACHE] Limpando cache antigo...', {
        oldVersion: storedVersion || 'nenhuma',
        newVersion: CURRENT_CACHE_VERSION,
        reason: !storedVersion ? 'primeira execução' : 'versão desatualizada'
      });
      
      // Limpar todo o cache do React Query
      adminQueryClient.clear();
      
      // Atualizar versão no localStorage
      localStorage.setItem(CACHE_VERSION_KEY, CURRENT_CACHE_VERSION);
      
      console.log('✅ [ADMIN-CACHE] Cache limpo com sucesso! Nova versão:', CURRENT_CACHE_VERSION);
    } else {
      console.log('✅ [ADMIN-CACHE] Cache está atualizado, versão:', CURRENT_CACHE_VERSION);
    }
  } catch (error) {
    console.error('❌ [ADMIN-CACHE] Erro ao verificar/limpar cache:', error);
    // Em caso de erro, tentar limpar mesmo assim
    try {
      adminQueryClient.clear();
      localStorage.setItem(CACHE_VERSION_KEY, CURRENT_CACHE_VERSION);
    } catch (fallbackError) {
      console.error('❌ [ADMIN-CACHE] Erro no fallback de limpeza:', fallbackError);
    }
  }
}

// Executar verificação de cache imediatamente
checkAndClearOldCache();

// Configurações específicas para diferentes tipos de dados
export const queryOptions = {
  // Static/rarely changing data - cache longest
  settings: {
    staleTime: 30 * 60 * 1000, // 30 minutos
    gcTime: 60 * 60 * 1000, // 1 hora
  },
  
  // Master data that changes infrequently - cache longer
  masterData: {
    staleTime: 20 * 60 * 1000, // 20 minutos
    gcTime: 45 * 60 * 1000, // 45 minutos
  },
  
  // List data (clients, plans, procedures) - moderate caching
  listData: {
    staleTime: 15 * 60 * 1000, // 15 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
  },
  
  // Detail/form data - shorter cache for consistency
  detailData: {
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 20 * 60 * 1000, // 20 minutos
  },
  
  // Search results - short cache
  searchData: {
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  },
  
  // Dashboard data changes more frequently but still cacheable
  dashboard: {
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
  },
  
  // Real-time data - minimal caching
  realtime: {
    staleTime: 0,
    gcTime: 1 * 60 * 1000, // 1 minuto
  },
  
  // Specific configurations for commonly used admin queries
  queries: {
    // Plans are relatively static master data
    plans: {
      staleTime: 20 * 60 * 1000, // 20 minutos
      gcTime: 45 * 60 * 1000, // 45 minutos
    },
    
    // Active plans change even less frequently
    activePlans: {
      staleTime: 30 * 60 * 1000, // 30 minutos 
      gcTime: 60 * 60 * 1000, // 1 hora
    },
    
    // Clients list changes moderately
    clients: {
      staleTime: 15 * 60 * 1000, // 15 minutos
      gcTime: 30 * 60 * 1000, // 30 minutos
    },
    
    // Client details may change more frequently
    clientDetails: {
      staleTime: 10 * 60 * 1000, // 10 minutos
      gcTime: 20 * 60 * 1000, // 20 minutos
    },
    
    // Pets data is fairly static once entered
    pets: {
      staleTime: 15 * 60 * 1000, // 15 minutos
      gcTime: 30 * 60 * 1000, // 30 minutos
    },
    
    // Atendimentos can change frequently
    atendimentos: {
      staleTime: 10 * 60 * 1000, // 10 minutos
      gcTime: 20 * 60 * 1000, // 20 minutos
    },
    
    // Procedures are relatively static master data
    procedures: {
      staleTime: 20 * 60 * 1000, // 20 minutos
      gcTime: 45 * 60 * 1000, // 45 minutos
    },
    
    // Network units are fairly static
    networkUnits: {
      staleTime: 20 * 60 * 1000, // 20 minutos
      gcTime: 45 * 60 * 1000, // 45 minutos
    },
    
    // FAQ items are relatively static
    faq: {
      staleTime: 20 * 60 * 1000, // 20 minutos
      gcTime: 45 * 60 * 1000, // 45 minutos
    },
    
    // Contact submissions might be checked frequently
    contactSubmissions: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 15 * 60 * 1000, // 15 minutos
    },
    
    // User administration data
    users: {
      staleTime: 15 * 60 * 1000, // 15 minutos
      gcTime: 30 * 60 * 1000, // 30 minutos
    },
    
    // Sellers data
    sellers: {
      staleTime: 10 * 60 * 1000, // 10 minutos
      gcTime: 30 * 60 * 1000, // 30 minutos
    }
  }
};

// Helper function to get query options by key
export const getQueryOptions = (key: keyof typeof queryOptions.queries) => {
  return queryOptions.queries[key] || queryOptions.detailData;
};

// Query key normalization utilities for better cache sharing
export const queryKeys = {
  // Core entity keys
  clients: {
    all: () => ["/admin/api/clients"] as const,
    list: (filters?: Record<string, any>) => ["/admin/api/clients", filters] as const,
    detail: (id: string) => ["/admin/api/clients", id] as const,
    pets: (id: string) => ["/admin/api/clients", id, "pets"] as const,
    search: (query: string) => ["/admin/api/clients/search", { search: query }] as const,
  },
  
  plans: {
    all: () => ["/admin/api/plans"] as const,
    list: (filters?: Record<string, any>) => ["/admin/api/plans", filters] as const,
    detail: (id: string) => ["/admin/api/plans", id] as const,
    active: () => ["/admin/api/plans", "active"] as const,
    procedures: (id: string) => ["/admin/api/plans", id, "procedures"] as const,
  },
  
  atendimentos: {
    all: () => ["/admin/api/atendimentos"] as const,
    withUnits: (params?: Record<string, any>) => ["/admin/api/atendimentos/with-network-units", params] as const,
    detail: (id: string) => ["/admin/api/atendimentos", id] as const,
  },
  
  pets: {
    all: () => ["/admin/api/pets"] as const,
    detail: (id: string) => ["/admin/api/pets", id] as const,
  },
  
  procedures: {
    all: () => ["/admin/api/procedures"] as const,
    detail: (id: string) => ["/admin/api/procedures", id] as const,
    plans: (id: string) => ["/admin/api/procedures", id, "plans"] as const,
  },
  
  networkUnits: {
    all: () => ["/admin/api/network-units"] as const,
    detail: (id: string) => ["/admin/api/network-units", id] as const,
    credentials: () => ["/admin/api/network-units/credentials"] as const,
  },
  
  dashboard: {
    all: (dateParams?: Record<string, any>) => ["/admin/api/dashboard/all", dateParams] as const,
  },
  
  settings: {
    site: () => ["/admin/api/settings/site"] as const,
    rules: () => ["/admin/api/settings/rules"] as const,
  },
  
  users: {
    all: () => ["/admin/api/users"] as const,
    detail: (id: string) => ["/admin/api/users", id] as const,
  },
  
  faq: {
    all: () => ["/admin/api/faq"] as const,
    detail: (id: string) => ["/admin/api/faq", id] as const,
  },
  
  contactSubmissions: {
    all: () => ["/admin/api/contact-submissions"] as const,
    detail: (id: string) => ["/admin/api/contact-submissions", id] as const,
  },
  
  sellers: {
    all: () => ["/admin/api/sellers"] as const,
    detail: (id: string) => ["/admin/api/sellers", id] as const,
  },
} as const;

// Utility function to create standardized query keys
export const createQueryKey = (entity: keyof typeof queryKeys, operation: string, ...params: any[]) => {
  const entityKeys = queryKeys[entity] as any;
  if (entityKeys && typeof entityKeys[operation] === 'function') {
    return entityKeys[operation](...params);
  }
  // Fallback for custom keys
  return [entity, operation, ...params];
};
