import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useLocation } from 'wouter';

interface SellerData {
  id: string;
  fullName: string;
  email: string;
  whitelabelUrl?: string;
  cpaPercentage?: string;
  recurringCommissionPercentage?: string;
}

interface SellerAuthContextData {
  seller: SellerData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  logout: () => Promise<void>;
}

const SellerAuthContext = createContext<SellerAuthContextData>({} as SellerAuthContextData);

// Cache key and duration
const SELLER_CACHE_KEY = 'seller_auth_data';
const SELLER_CACHE_TIMESTAMP_KEY = 'seller_auth_timestamp';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper functions for cache
const getCachedSeller = (): SellerData | null => {
  try {
    const cached = sessionStorage.getItem(SELLER_CACHE_KEY);
    const timestamp = sessionStorage.getItem(SELLER_CACHE_TIMESTAMP_KEY);
    
    if (!cached || !timestamp) return null;
    
    const age = Date.now() - parseInt(timestamp);
    if (age > CACHE_DURATION) {
      // Cache expired
      sessionStorage.removeItem(SELLER_CACHE_KEY);
      sessionStorage.removeItem(SELLER_CACHE_TIMESTAMP_KEY);
      return null;
    }
    
    return JSON.parse(cached);
  } catch {
    return null;
  }
};

const setCachedSeller = (seller: SellerData) => {
  try {
    sessionStorage.setItem(SELLER_CACHE_KEY, JSON.stringify(seller));
    sessionStorage.setItem(SELLER_CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch (err) {
    console.error('Error caching seller data:', err);
  }
};

const clearSellerCache = () => {
  try {
    sessionStorage.removeItem(SELLER_CACHE_KEY);
    sessionStorage.removeItem(SELLER_CACHE_TIMESTAMP_KEY);
  } catch (err) {
    console.error('Error clearing seller cache:', err);
  }
};

export function SellerAuthProvider({ children }: { children: ReactNode }) {
  const [seller, setSeller] = useState<SellerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location] = useLocation();
  const hasFetched = useRef(false);
  const isFetching = useRef(false);

  const fetchSeller = async () => {
    // Prevent duplicate fetches
    if (isFetching.current) {
      return;
    }

    try {
      isFetching.current = true;
      setIsLoading(true);
      
      const response = await fetch('/api/sellers/me', { 
        credentials: 'include' 
      });
      
      if (response.ok) {
        const data = await response.json();
        setSeller(data.seller);
        setCachedSeller(data.seller);
        setError(null);
      } else if (response.status === 401) {
        setSeller(null);
        clearSellerCache();
      } else {
        setError('Erro ao carregar dados do vendedor');
        setSeller(null);
        clearSellerCache();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      setSeller(null);
      clearSellerCache();
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/sellers/logout', { 
        method: 'POST', 
        credentials: 'include' 
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setSeller(null);
      clearSellerCache();
      window.location.href = '/vendedor/login';
    }
  };

  useEffect(() => {
    const isSellerArea = location.startsWith('/vendedor/') && location !== '/vendedor/login';
    
    if (isSellerArea) {
      // Try to use cached data first
      const cachedSeller = getCachedSeller();
      
      if (cachedSeller && !hasFetched.current) {
        // Use cached data immediately
        setSeller(cachedSeller);
        setIsLoading(false);
        hasFetched.current = true;
      } else if (!hasFetched.current) {
        // No cache, fetch from server
        hasFetched.current = true;
        fetchSeller();
      } else if (!seller && !isLoading) {
        // Seller is null but we're in seller area and not loading - fetch again
        fetchSeller();
      }
    } else if (!isSellerArea && seller) {
      // User left seller area, clear state
      setSeller(null);
      clearSellerCache();
      hasFetched.current = false;
      setIsLoading(true);
    }
  }, [location]);

  return (
    <SellerAuthContext.Provider value={{ seller, isLoading, error, refetch: fetchSeller, logout }}>
      {children}
    </SellerAuthContext.Provider>
  );
}

export const useSellerAuth = () => {
  const context = useContext(SellerAuthContext);
  if (!context) {
    throw new Error('useSellerAuth must be used within SellerAuthProvider');
  }
  return context;
};
