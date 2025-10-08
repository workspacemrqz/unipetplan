import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateCache, clearAllCache, forceRefresh } from '@/lib/queryClient';

interface CacheManagerOptions {
  // Intervalo para revalidação automática (em ms)
  autoRefreshInterval?: number;
  // Se deve revalidar quando a janela ganha foco
  refreshOnFocus?: boolean;
  // Se deve revalidar quando reconecta
  refreshOnReconnect?: boolean;
  // Se deve limpar cache ao desmontar
  clearOnUnmount?: boolean;
  // Chaves específicas para invalidar
  queryKeys?: string[][];
}

/**
 * Hook para gerenciar cache e implementar estratégias anti-cache
 */
export function useCacheManager(options: CacheManagerOptions = {}) {
  const {
    autoRefreshInterval = 5 * 60 * 1000, // 5 minutos
    refreshOnFocus = true,
    refreshOnReconnect = true,
    clearOnUnmount = false,
    queryKeys = [],
  } = options;

  const queryClient = useQueryClient();
  const intervalRef = useRef<NodeJS.Timeout>();
  const lastRefreshRef = useRef<number>(Date.now());

  // Função para forçar refresh de dados específicos
  const refreshData = useCallback((keys?: string[][]) => {
    const keysToRefresh = keys || queryKeys;
    console.log('[CACHE] Forcing refresh of data:', keysToRefresh);
    
    keysToRefresh.forEach(key => {
      forceRefresh(key);
    });
    
    lastRefreshRef.current = Date.now();
  }, [queryKeys]);

  // Função para invalidar cache específico
  const invalidateSpecificCache = useCallback((keys?: string[][]) => {
    const keysToInvalidate = keys || queryKeys;
    console.log('[CACHE] Invalidating cache for:', keysToInvalidate);
    
    keysToInvalidate.forEach(key => {
      invalidateCache(key);
    });
  }, [queryKeys]);

  // Função para limpar todo o cache
  const clearCache = useCallback(() => {
    console.log('[CACHE] Clearing all cache');
    clearAllCache();
    lastRefreshRef.current = Date.now();
  }, []);

  // Função para obter informações do cache
  const getCacheInfo = useCallback(() => {
    const queries = queryClient.getQueryCache().getAll();
    const mutations = queryClient.getMutationCache().getAll();
    
    return {
      totalQueries: queries.length,
      totalMutations: mutations.length,
      lastRefresh: lastRefreshRef.current,
      timeSinceLastRefresh: Date.now() - lastRefreshRef.current,
      cacheSize: JSON.stringify(queries).length,
    };
  }, [queryClient]);

  // Função para verificar se dados estão obsoletos
  const isDataStale = useCallback((staleTime: number = 5 * 60 * 1000) => {
    return Date.now() - lastRefreshRef.current > staleTime;
  }, []);

  // Revalidação automática por intervalo
  useEffect(() => {
    if (autoRefreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        console.log('[CACHE] Auto-refresh triggered by interval');
        refreshData();
      }, autoRefreshInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefreshInterval, refreshData]);

  // Revalidação quando a janela ganha foco
  useEffect(() => {
    if (!refreshOnFocus) return;

    const handleFocus = () => {
      console.log('[CACHE] Window focused, refreshing data');
      refreshData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refreshOnFocus, refreshData]);

  // Revalidação quando reconecta
  useEffect(() => {
    if (!refreshOnReconnect) return;

    const handleOnline = () => {
      console.log('[CACHE] Network reconnected, refreshing data');
      refreshData();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [refreshOnReconnect, refreshData]);

  // Limpeza de cache ao desmontar
  useEffect(() => {
    return () => {
      if (clearOnUnmount) {
        console.log('[CACHE] Component unmounting, clearing cache');
        clearCache();
      }
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [clearOnUnmount, clearCache]);

  // Interceptor para logs de cache
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'added' || event.type === 'updated') {
        console.log(`[CACHE] Query ${event.query.queryHash} ${event.type}`, {
          timestamp: new Date().toISOString(),
          dataUpdatedAt: event.query.state.dataUpdatedAt,
          isStale: event.query.isStale(),
        });
      }
    });

    return unsubscribe;
  }, [queryClient]);

  return {
    refreshData,
    invalidateSpecificCache,
    clearCache,
    getCacheInfo,
    isDataStale,
    lastRefresh: lastRefreshRef.current,
    timeSinceLastRefresh: Date.now() - lastRefreshRef.current,
  };
}

/**
 * Hook específico para dados que mudam frequentemente
 */
export function useVolatileData(queryKeys: string[][], options?: CacheManagerOptions) {
  const cacheManager = useCacheManager({
    ...options,
    queryKeys,
    autoRefreshInterval: 2 * 60 * 1000, // 2 minutos para dados voláteis
    refreshOnFocus: true,
    refreshOnReconnect: true,
  });

  return cacheManager;
}

/**
 * Hook para dados estáticos que raramente mudam
 */
export function useStaticData(queryKeys: string[][], options?: CacheManagerOptions) {
  const cacheManager = useCacheManager({
    ...options,
    queryKeys,
    autoRefreshInterval: 30 * 60 * 1000, // 30 minutos para dados estáticos
    refreshOnFocus: false,
    refreshOnReconnect: false,
  });

  return cacheManager;
}

/**
 * Hook para debug de cache
 */
export function useCacheDebug() {
  const queryClient = useQueryClient();
  
  const debugCache = useCallback(() => {
    const queries = queryClient.getQueryCache().getAll();
    const mutations = queryClient.getMutationCache().getAll();
    
    console.group('🔍 Cache Debug Information');
    console.log('Total Queries:', queries.length);
    console.log('Total Mutations:', mutations.length);
    
    queries.forEach((query, index) => {
      console.group(`Query ${index + 1}: ${query.queryHash}`);
      console.log('Query Key:', query.queryKey);
      console.log('Data Updated At:', new Date(query.state.dataUpdatedAt).toISOString());
      console.log('Is Stale:', query.isStale());
      console.log('Is Fetching:', query.state.isFetching);
      console.log('Error:', query.state.error);
      console.log('Data Size:', JSON.stringify(query.state.data).length);
      console.groupEnd();
    });
    
    console.groupEnd();
    
    return { queries, mutations };
  }, [queryClient]);
  
  const clearAllCacheDebug = useCallback(() => {
    console.log('🧹 Clearing all cache for debugging');
    clearAllCache();
  }, []);
  
  return {
    debugCache,
    clearAllCacheDebug,
  };
}
