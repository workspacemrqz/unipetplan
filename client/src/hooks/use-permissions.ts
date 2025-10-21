import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/admin/queryClient";

export interface UserPermissions {
  id: string;
  username: string;
  email: string;
  role: string;
  permissions: string[];
  isActive: boolean;
}

export function usePermissions() {
  const { data: currentUser, isLoading } = useQuery<UserPermissions>({
    queryKey: ["/admin/api/auth/current-user"],
    queryFn: async () => {
      return await apiRequest("GET", "/admin/api/auth/current-user");
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,
  });

  const hasPermission = (permissionId: string): boolean => {
    if (isLoading || !currentUser) return false;
    
    // Superadmin has all permissions
    if (currentUser.role === "superadmin") return true;
    
    // Check if user has the specific permission
    return currentUser.permissions?.includes(permissionId) || false;
  };

  const hasPathAccess = (path: string): boolean => {
    if (isLoading || !currentUser) return false;
    
    // Superadmin has access to all paths
    if (currentUser.role === "superadmin") return true;
    
    // Map paths to permission IDs - COMPREHENSIVE MAPPING
    const pathPermissionMap: Record<string, string> = {
      "/admin": "dashboard",
      "/admin/dashboard": "dashboard",
      "/admin/clientes": "clients",
      "/admin/contratos": "contracts",
      "/admin/atendimentos": "atendimentos",
      "/admin/financeiro": "financeiro",
      "/admin/cupom": "cupom",
      "/admin/coupons": "cupom",
      "/admin/relatorio-financeiro": "relatorio-financeiro",
      "/admin/formularios": "formularios",
      "/admin/avaliacoes": "avaliacoes",
      "/admin/rede": "rede",
      "/admin/network": "rede",
      "/admin/vendedores": "vendedores",
      "/admin/sellers": "vendedores",
      "/admin/procedimentos": "procedimentos",
      "/admin/procedures": "procedimentos",
      "/admin/perguntas-frequentes": "perguntas-frequentes",
      "/admin/faq": "perguntas-frequentes",
      "/admin/administracao": "dashboard", // Admin page requires at least dashboard access
      "/admin/configuracoes": "dashboard", // Settings page requires at least dashboard access
      "/admin/settings": "dashboard",
    };

    // Check for exact path match first
    const exactPermission = pathPermissionMap[path];
    if (exactPermission !== undefined) {
      return hasPermission(exactPermission);
    }

    // Check for path prefix match (for sub-routes like /admin/clientes/123)
    // Sort paths by length descending to match most specific first
    const sortedPaths = Object.keys(pathPermissionMap).sort((a, b) => b.length - a.length);
    
    for (const mappedPath of sortedPaths) {
      if (path === mappedPath || path.startsWith(mappedPath + "/")) {
        const permission = pathPermissionMap[mappedPath];
        if (permission) {
          return hasPermission(permission);
        }
      }
    }

    // CRITICAL SECURITY FIX: Default to DENY access for unmapped paths
    console.warn(`[PERMISSION-DENIED] Access denied to unmapped path: ${path}`);
    return false; // DENY by default
  };

  const canAdd = (): boolean => {
    if (isLoading || !currentUser) return false;
    
    // Users with 'view' role cannot add
    if (currentUser.role === "view") return false;
    
    // Superadmin and other roles can add
    return true;
  };

  const canEdit = (): boolean => {
    if (isLoading || !currentUser) return false;
    
    // Users with 'view' role cannot edit
    if (currentUser.role === "view") return false;
    
    // Superadmin and other roles can edit
    return true;
  };

  const canDelete = (): boolean => {
    if (isLoading || !currentUser) return false;
    
    // Users with 'view' role cannot delete
    if (currentUser.role === "view") return false;
    
    // Only certain roles can delete
    return ["superadmin", "admin", "delete"].includes(currentUser.role);
  };

  const getAccessiblePaths = (): string[] => {
    if (isLoading || !currentUser) return [];
    
    // Map paths to permission IDs - MUST MATCH hasPathAccess mapping
    const pathPermissionMap: Record<string, string> = {
      "/admin": "dashboard",
      "/admin/dashboard": "dashboard",
      "/admin/clientes": "clients",
      "/admin/contratos": "contracts",
      "/admin/atendimentos": "atendimentos",
      "/admin/financeiro": "financeiro",
      "/admin/cupom": "cupom",
      "/admin/coupons": "cupom",
      "/admin/relatorio-financeiro": "relatorio-financeiro",
      "/admin/formularios": "formularios",
      "/admin/avaliacoes": "avaliacoes",
      "/admin/rede": "rede",
      "/admin/network": "rede",
      "/admin/vendedores": "vendedores",
      "/admin/sellers": "vendedores",
      "/admin/procedimentos": "procedimentos",
      "/admin/procedures": "procedimentos",
      "/admin/perguntas-frequentes": "perguntas-frequentes",
      "/admin/faq": "perguntas-frequentes",
      "/admin/administracao": "dashboard",
      "/admin/configuracoes": "dashboard",
      "/admin/settings": "dashboard",
    };
    
    // Superadmin has access to all paths
    if (currentUser.role === "superadmin") {
      // Return unique paths only (no duplicates for aliases)
      const uniquePaths = new Set<string>();
      Object.keys(pathPermissionMap).forEach(path => {
        // Only return primary paths, not aliases
        if (!path.includes("coupons") && 
            !path.includes("network") && 
            !path.includes("sellers") && 
            !path.includes("procedures") && 
            !path.includes("faq") && 
            !path.includes("settings")) {
          uniquePaths.add(path);
        }
      });
      return Array.from(uniquePaths);
    }
    
    const accessiblePaths = new Set<string>();

    for (const [path, permissionId] of Object.entries(pathPermissionMap)) {
      if (hasPermission(permissionId)) {
        // Only add primary paths, not aliases
        if (!path.includes("coupons") && 
            !path.includes("network") && 
            !path.includes("sellers") && 
            !path.includes("procedures") && 
            !path.includes("faq") && 
            !path.includes("settings")) {
          accessiblePaths.add(path);
        }
      }
    }

    return Array.from(accessiblePaths);
  };

  return {
    currentUser,
    isLoading,
    hasPermission,
    hasPathAccess,
    getAccessiblePaths,
    canAdd,
    canEdit,
    canDelete,
  };
}