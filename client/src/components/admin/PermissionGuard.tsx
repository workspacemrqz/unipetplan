import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { usePermissions } from "@/hooks/use-permissions";
import { Loader2 } from "lucide-react";

interface PermissionGuardProps {
  children: React.ReactNode;
  permission?: string;
  path?: string;
  fallbackPath?: string;
}

export function PermissionGuard({ 
  children, 
  permission, 
  path, 
  fallbackPath = "/admin" 
}: PermissionGuardProps) {
  const [, setLocation] = useLocation();
  const { hasPermission, hasPathAccess, isLoading } = usePermissions();
  
  useEffect(() => {
    if (isLoading) return;
    
    let hasAccess = false;
    
    if (permission) {
      hasAccess = hasPermission(permission);
    } else if (path) {
      hasAccess = hasPathAccess(path);
    } else {
      // If no permission or path specified, get current path
      const currentPath = window.location.pathname;
      hasAccess = hasPathAccess(currentPath);
    }
    
    if (!hasAccess) {
      console.warn(`[PERMISSION-GUARD] Access denied to ${path || permission || 'current route'}. Redirecting to ${fallbackPath}`);
      setLocation(fallbackPath);
    }
  }, [isLoading, permission, path, hasPermission, hasPathAccess, setLocation, fallbackPath]);
  
  // Show loading state while checking permissions
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }
  
  // Check access
  let hasAccess = false;
  
  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (path) {
    hasAccess = hasPathAccess(path);
  } else {
    // If no permission or path specified, get current path
    const currentPath = window.location.pathname;
    hasAccess = hasPathAccess(currentPath);
  }
  
  if (!hasAccess) {
    // Don't render children if no access
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Acesso Negado</h2>
          <p className="text-muted-foreground">
            Você não tem permissão para acessar esta página.
          </p>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
}