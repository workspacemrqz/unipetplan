import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect, useState, useRef } from "react";

interface AuthGuardProps {
  children: React.ReactNode;
}

interface AuthStatusResponse {
  authenticated: boolean;
  admin?: {
    login: string;
  };
}

// Session storage keys for caching
const AUTH_CACHE_KEY = 'admin_auth_status';
const AUTH_CACHE_TIMESTAMP_KEY = 'admin_auth_timestamp';
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache duration

// Memory cache to avoid multiple checks in the same session
let memoryAuthCache: { authenticated: boolean; timestamp: number } | null = null;

// Track if this is the initial auth check for the session
let isInitialAuthCheck = true;

// Componente de loading global - apenas para verificação inicial
function AuthLoading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{background: 'linear-gradient(135deg, var(--bg-teal) 0%, var(--bg-teal-dark) 100%)'}}>
      <div className="text-center">
        {/* Modern animated dots loader */}
        <div className="flex items-center justify-center space-x-3 mb-8">
          <div 
            className="w-4 h-4 bg-white rounded-full"
            style={{
              animation: 'pulse-scale 1.4s ease-in-out infinite',
              animationDelay: '0s'
            }}
          ></div>
          <div 
            className="w-4 h-4 bg-white rounded-full"
            style={{
              animation: 'pulse-scale 1.4s ease-in-out infinite',
              animationDelay: '0.2s'
            }}
          ></div>
          <div 
            className="w-4 h-4 bg-white rounded-full"
            style={{
              animation: 'pulse-scale 1.4s ease-in-out infinite',
              animationDelay: '0.4s'
            }}
          ></div>
        </div>
        
        <div className="text-lg text-white font-light tracking-wide opacity-90">
          Verificando autenticação
          <span className="inline-block animate-pulse">...</span>
        </div>
      </div>
      
      <style>{`
        @keyframes pulse-scale {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.5);
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
}

// Utility functions for session storage cache
const getCachedAuthStatus = (): AuthStatusResponse | null => {
  try {
    const cached = sessionStorage.getItem(AUTH_CACHE_KEY);
    const timestamp = sessionStorage.getItem(AUTH_CACHE_TIMESTAMP_KEY);
    
    if (!cached || !timestamp) return null;
    
    const age = Date.now() - parseInt(timestamp);
    if (age > CACHE_DURATION) {
      // Cache expired
      sessionStorage.removeItem(AUTH_CACHE_KEY);
      sessionStorage.removeItem(AUTH_CACHE_TIMESTAMP_KEY);
      return null;
    }
    
    return JSON.parse(cached);
  } catch {
    return null;
  }
};

const setCachedAuthStatus = (status: AuthStatusResponse) => {
  try {
    sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(status));
    sessionStorage.setItem(AUTH_CACHE_TIMESTAMP_KEY, Date.now().toString());
    
    // Update memory cache as well
    memoryAuthCache = {
      authenticated: status.authenticated,
      timestamp: Date.now()
    };
  } catch {
    // Silently fail if sessionStorage is not available
  }
};

const clearAuthCache = () => {
  try {
    sessionStorage.removeItem(AUTH_CACHE_KEY);
    sessionStorage.removeItem(AUTH_CACHE_TIMESTAMP_KEY);
    memoryAuthCache = null;
  } catch {
    // Silently fail if sessionStorage is not available
  }
};

export default function AuthGuard({ children }: AuthGuardProps) {
  const [, navigate] = useLocation();
  const [showLoading, setShowLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const hasRedirected = useRef(false);
  const authTimeoutRef = useRef<NodeJS.Timeout>();

  // Check memory cache first for instant response on subsequent navigations
  const getMemoryCachedAuth = (): AuthStatusResponse | null => {
    if (!memoryAuthCache) return null;
    
    const age = Date.now() - memoryAuthCache.timestamp;
    if (age > CACHE_DURATION) {
      memoryAuthCache = null;
      return null;
    }
    
    return { 
      authenticated: memoryAuthCache.authenticated,
      admin: memoryAuthCache.authenticated ? { login: 'admin' } : undefined
    };
  };

  // Get initial data from cache
  const initialData = getCachedAuthStatus() || getMemoryCachedAuth();
  
  // Query para verificar autenticação com retry robusto
  const { data: authStatus, isLoading, error, isFetching, refetch } = useQuery<AuthStatusResponse>({
    queryKey: ['/admin/api/auth/status'],
    queryFn: async () => {
      console.log("🔍 [AUTH-GUARD] Verificando autenticação - tentativa", retryCount + 1);
      
      const response = await fetch('/admin/api/auth/status', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Auth check failed: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("📋 [AUTH-GUARD] Resultado da autenticação:", result);
      
      // Cache the successful result
      if (result.authenticated) {
        setCachedAuthStatus(result);
      } else {
        clearAuthCache();
      }
      
      return result;
    },
    retry: (failureCount, error) => {
      console.log("⚠️ [AUTH-GUARD] Falha na verificação, tentativa", failureCount, "erro:", error);
      return failureCount < 3; // Retry up to 3 times
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000), // Exponential backoff, max 3s
    staleTime: 2 * 60 * 1000, // 2 minutes - data is considered fresh for 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: true, // Do refetch on mount for security
    ...(initialData ? { initialData } : {}), // Use cached data as initial data only if available
    ...(initialData ? { placeholderData: initialData } : {}), // Use cached data as placeholder while fetching only if available
  });

  // Handle loading state with intelligent timing
  useEffect(() => {
    // Priority 1: If authenticated, always hide loading
    if (authStatus?.authenticated) {
      if (showLoading) {
        setShowLoading(false);
      }
      return;
    }
    
    // Priority 2: If we have any auth data (even if not authenticated), hide loading
    if (authStatus !== undefined && authStatus !== null) {
      if (showLoading) {
        setShowLoading(false);
      }
      return;
    }
    
    // Priority 3: Show loading only if actively loading and no data
    if ((isLoading || isFetching) && !authStatus) {
      if (!showLoading) {
        setShowLoading(true);
      }
    }
  }, [isLoading, isFetching, authStatus, showLoading]);

  // Handle authentication status with delayed redirect
  useEffect(() => {
    // Clear any existing timeout
    if (authTimeoutRef.current) {
      clearTimeout(authTimeoutRef.current);
    }
    
    // Skip if still loading and we don't have any data
    if ((isLoading || isFetching) && !authStatus) {
      console.log("⏳ [AUTH-GUARD] Aguardando verificação de autenticação...");
      return;
    }
    
    // Prevent multiple redirects
    if (hasRedirected.current) return;

    // If we have authentication data and user is authenticated, we're good
    if (authStatus?.authenticated) {
      console.log("✅ [AUTH-GUARD] Usuário autenticado com sucesso");
      setShowLoading(false);
      return;
    }

    // If we have definitive unauthenticated status or error after retries
    if (error || (authStatus && !authStatus.authenticated)) {
      console.log("❌ [AUTH-GUARD] Usuário não autenticado. Aguardando antes de redirecionar...");
      
      // Wait 2 seconds before redirecting to give session time to establish
      authTimeoutRef.current = setTimeout(() => {
        if (!hasRedirected.current) {
          console.log("🚀 [AUTH-GUARD] Redirecionando para login após timeout");
          clearAuthCache();
          hasRedirected.current = true;
          window.location.href = "/admin/login";
        }
      }, 2000);
      
      return;
    }
    
    // If we still don't have definitive status, retry
    if (!authStatus && retryCount < 2) {
      console.log("🔄 [AUTH-GUARD] Status indefinido, tentando novamente...");
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        refetch();
      }, 1000);
    }
  }, [authStatus, isLoading, error, isFetching, retryCount, refetch]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
      }
    };
  }, []);

  // Background indicator for when auth is being refetched (optional)
  const showBackgroundRefresh = isFetching && authStatus?.authenticated && !isLoading;

  // Show loading only on initial auth check when no cached data is available
  if (showLoading) {
    return <AuthLoading />;
  }

  // If we have auth data (from cache or query) and user is not authenticated, show loading while redirecting
  if (error || (authStatus && !authStatus.authenticated)) {
    return <AuthLoading />;
  }

  // If we have cached data showing user is authenticated, render children immediately
  // even if background refetch is happening
  if (authStatus?.authenticated) {
    return (
      <>
        {/* Optional: Show subtle background refresh indicator */}
        {showBackgroundRefresh && (
          <div className="fixed top-4 right-4 z-50 bg-white/10 backdrop-blur-sm rounded-full p-2">
            <div className="w-4 h-4 border-2 border-t-transparent border-teal-600 rounded-full animate-spin"></div>
          </div>
        )}
        {children}
      </>
    );
  }

  // Fallback loading state (should rarely be reached with caching)
  // Note: There's a timing issue where authStatus can be undefined after loading completes
  // This fallback prevents infinite loading but needs investigation for proper auth flow
  return <AuthLoading />;
}