import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useLocation } from 'wouter';

interface ClientData {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  cpf?: string;
  cep?: string;
  address?: string;
  number?: string;
  complement?: string;
  district?: string;
  state?: string;
  city?: string;
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthContextData {
  client: ClientData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

// Cache key and duration
const CLIENT_CACHE_KEY = 'client_auth_data';
const CLIENT_CACHE_TIMESTAMP_KEY = 'client_auth_timestamp';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper functions for cache
const getCachedClient = (): ClientData | null => {
  try {
    const cached = sessionStorage.getItem(CLIENT_CACHE_KEY);
    const timestamp = sessionStorage.getItem(CLIENT_CACHE_TIMESTAMP_KEY);
    
    if (!cached || !timestamp) return null;
    
    const age = Date.now() - parseInt(timestamp);
    if (age > CACHE_DURATION) {
      // Cache expired
      sessionStorage.removeItem(CLIENT_CACHE_KEY);
      sessionStorage.removeItem(CLIENT_CACHE_TIMESTAMP_KEY);
      return null;
    }
    
    return JSON.parse(cached);
  } catch {
    return null;
  }
};

const setCachedClient = (client: ClientData) => {
  try {
    sessionStorage.setItem(CLIENT_CACHE_KEY, JSON.stringify(client));
    sessionStorage.setItem(CLIENT_CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch (err) {
    console.error('Error caching client data:', err);
  }
};

const clearClientCache = () => {
  try {
    sessionStorage.removeItem(CLIENT_CACHE_KEY);
    sessionStorage.removeItem(CLIENT_CACHE_TIMESTAMP_KEY);
  } catch (err) {
    console.error('Error clearing client cache:', err);
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<ClientData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location] = useLocation();
  const hasFetched = useRef(false);
  const isFetching = useRef(false);

  const fetchClient = async () => {
    // Prevent duplicate fetches
    if (isFetching.current) {
      return;
    }

    try {
      isFetching.current = true;
      setIsLoading(true);
      
      const response = await fetch('/api/clients/me', { 
        credentials: 'include' 
      });
      
      if (response.ok) {
        const data = await response.json();
        setClient(data.client);
        setCachedClient(data.client);
        setError(null);
      } else if (response.status === 401) {
        setClient(null);
        clearClientCache();
      } else {
        setError('Erro ao carregar dados do cliente');
        setClient(null);
        clearClientCache();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      setClient(null);
      clearClientCache();
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/clients/logout', { 
        method: 'POST', 
        credentials: 'include' 
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setClient(null);
      clearClientCache();
      window.location.href = '/cliente/login';
    }
  };

  useEffect(() => {
    const isCustomerArea = location.startsWith('/cliente/') && location !== '/cliente/login';
    
    if (isCustomerArea) {
      // Try to use cached data first
      const cachedClient = getCachedClient();
      
      if (cachedClient && !hasFetched.current) {
        // Use cached data immediately
        setClient(cachedClient);
        setIsLoading(false);
        hasFetched.current = true;
      } else if (!hasFetched.current) {
        // No cache, fetch from server
        hasFetched.current = true;
        fetchClient();
      } else if (!client && !isLoading) {
        // Client is null but we're in customer area and not loading - fetch again
        fetchClient();
      }
    } else if (!isCustomerArea && client) {
      // User left customer area, clear state
      setClient(null);
      clearClientCache();
      hasFetched.current = false;
      setIsLoading(true);
    }
  }, [location]);

  return (
    <AuthContext.Provider value={{ client, isLoading, error, refetch: fetchClient, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
