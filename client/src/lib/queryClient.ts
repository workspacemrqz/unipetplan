import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  const res = await fetch(url, {
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

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
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
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutos para dados gerais
      gcTime: 10 * 60 * 1000, // 10 minutos
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Cache version management - força limpeza após refatoração de "guides" para "atendimentos"
const CURRENT_CACHE_VERSION = '2.0';
const CACHE_VERSION_KEY = 'public-cache-version';

function checkAndClearOldCache() {
  try {
    const storedVersion = localStorage.getItem(CACHE_VERSION_KEY);
    
    console.log('🔍 [PUBLIC-CACHE] Verificando versão do cache...', {
      storedVersion,
      currentVersion: CURRENT_CACHE_VERSION
    });
    
    // Se não existe versão ou é diferente da atual, limpar cache
    if (!storedVersion || storedVersion !== CURRENT_CACHE_VERSION) {
      console.log('🧹 [PUBLIC-CACHE] Limpando cache antigo...', {
        oldVersion: storedVersion || 'nenhuma',
        newVersion: CURRENT_CACHE_VERSION,
        reason: !storedVersion ? 'primeira execução' : 'versão desatualizada'
      });
      
      // Limpar todo o cache do React Query
      queryClient.clear();
      
      // Atualizar versão no localStorage
      localStorage.setItem(CACHE_VERSION_KEY, CURRENT_CACHE_VERSION);
      
      console.log('✅ [PUBLIC-CACHE] Cache limpo com sucesso! Nova versão:', CURRENT_CACHE_VERSION);
    } else {
      console.log('✅ [PUBLIC-CACHE] Cache está atualizado, versão:', CURRENT_CACHE_VERSION);
    }
  } catch (error) {
    console.error('❌ [PUBLIC-CACHE] Erro ao verificar/limpar cache:', error);
    // Em caso de erro, tentar limpar mesmo assim
    try {
      queryClient.clear();
      localStorage.setItem(CACHE_VERSION_KEY, CURRENT_CACHE_VERSION);
    } catch (fallbackError) {
      console.error('❌ [PUBLIC-CACHE] Erro no fallback de limpeza:', fallbackError);
    }
  }
}

// Executar verificação de cache imediatamente
checkAndClearOldCache();

// Configurações específicas para diferentes tipos de dados
export const queryOptions = {
  // Settings change rarely - cache longer
  settings: {
    staleTime: 10 * 60 * 1000, // 10 minutos
    cacheTime: 30 * 60 * 1000, // 30 minutos
  },
  // Dashboard data changes more frequently but still cacheable
  dashboard: {
    staleTime: 2 * 60 * 1000, // 2 minutos
    cacheTime: 5 * 60 * 1000, // 5 minutos
  },
  // Real-time data - minimal caching
  realtime: {
    staleTime: 0,
    cacheTime: 1 * 60 * 1000, // 1 minuto
  }
};
