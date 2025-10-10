import { useQuery } from "@tanstack/react-query";
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

// SECURITY: Only use in-memory cache, never sessionStorage for auth
// sessionStorage can be tampered with by the client
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache duration

// Memory cache to avoid multiple checks in the same session (cannot be tampered with)
let memoryAuthCache: { authenticated: boolean; timestamp: number } | null = null;

// Utility functions for in-memory cache only
const setCachedAuthStatus = (status: AuthStatusResponse) => {
  // Only use in-memory cache for performance, not for access control
  memoryAuthCache = {
    authenticated: status.authenticated,
    timestamp: Date.now()
  };
};

const clearAuthCache = () => {
  memoryAuthCache = null;
};

export default function AuthGuard({ children }: AuthGuardProps) {
  const [retryCount, setRetryCount] = useState(0);
  const hasRedirected = useRef(false);

  // SECURITY NOTE: Memory cache is only used for query optimization hints
  // It is never used to bypass server authentication checks

  // Query para verificar autenticação com retry robusto
  // SECURITY: Never use cached data as initialData/placeholderData to prevent client-side auth bypass
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
      
      // Cache the successful result for UX hints only (not for access control)
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
  });

  // Handle authentication status with immediate redirect
  useEffect(() => {
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
      return;
    }

    // If we have definitive unauthenticated status or error after retries
    if (error || (authStatus && !authStatus.authenticated)) {
      console.log("❌ [AUTH-GUARD] Usuário não autenticado. Redirecionando imediatamente...");
      
      // Redirect immediately without delay
      if (!hasRedirected.current) {
        console.log("🚀 [AUTH-GUARD] Redirecionando para login");
        clearAuthCache();
        hasRedirected.current = true;
        window.location.href = "/admin/login";
      }
      
      return;
    }
    
    // If we still don't have definitive status, retry quickly
    if (!authStatus && retryCount < 2) {
      console.log("🔄 [AUTH-GUARD] Status indefinido, tentando novamente...");
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        refetch();
      }, 100); // Reduced from 1000ms to 100ms for faster retry
    }
  }, [authStatus, isLoading, error, isFetching, retryCount, refetch]);

  // SECURITY: Only render protected content after server confirms authentication
  // Do NOT rely on cached data for access control - only server response
  
  // If we have auth data and user is not authenticated, redirect immediately
  if (error || (authStatus && !authStatus.authenticated)) {
    return null; // Return null while redirecting happens
  }

  // Only render children if server has confirmed authentication
  if (authStatus?.authenticated) {
    return <>{children}</>;
  }

  // While checking auth (no server response yet), return null for instant loading
  // This prevents flash of content but also prevents unauthorized access
  return null;
}