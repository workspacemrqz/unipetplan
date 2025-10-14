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
    
    // Map paths to permission IDs
    const pathPermissionMap: Record<string, string> = {
      "/admin": "dashboard",
      "/admin/clientes": "clients",
      "/admin/contratos": "contracts",
      "/admin/atendimentos": "atendimentos",
      "/admin/financeiro": "financeiro",
      "/admin/cupom": "cupom",
      "/admin/relatorio-financeiro": "relatorio-financeiro",
      "/admin/formularios": "formularios",
      "/admin/avaliacoes": "avaliacoes",
      "/admin/rede": "rede",
      "/admin/vendedores": "vendedores",
      "/admin/procedimentos": "procedimentos",
      "/admin/perguntas-frequentes": "perguntas-frequentes",
    };

    // Check for exact path match
    const permissionId = pathPermissionMap[path];
    if (permissionId) {
      return hasPermission(permissionId);
    }

    // Check for path prefix match (for sub-routes)
    for (const [mappedPath, permission] of Object.entries(pathPermissionMap)) {
      if (path.startsWith(mappedPath + "/") || path === mappedPath) {
        return hasPermission(permission);
      }
    }

    // If no specific permission is mapped, allow access
    return true;
  };

  const getAccessiblePaths = (): string[] => {
    if (isLoading || !currentUser) return [];
    
    // Superadmin has access to all paths
    if (currentUser.role === "superadmin") {
      return [
        "/admin",
        "/admin/clientes",
        "/admin/contratos",
        "/admin/atendimentos",
        "/admin/financeiro",
        "/admin/cupom",
        "/admin/relatorio-financeiro",
        "/admin/formularios",
        "/admin/avaliacoes",
        "/admin/rede",
        "/admin/vendedores",
        "/admin/procedimentos",
        "/admin/perguntas-frequentes",
      ];
    }
    
    const paths: string[] = [];
    const pathPermissionMap: Record<string, string> = {
      "/admin": "dashboard",
      "/admin/clientes": "clients",
      "/admin/contratos": "contracts",
      "/admin/atendimentos": "atendimentos",
      "/admin/financeiro": "financeiro",
      "/admin/cupom": "cupom",
      "/admin/relatorio-financeiro": "relatorio-financeiro",
      "/admin/formularios": "formularios",
      "/admin/avaliacoes": "avaliacoes",
      "/admin/rede": "rede",
      "/admin/vendedores": "vendedores",
      "/admin/procedimentos": "procedimentos",
      "/admin/perguntas-frequentes": "perguntas-frequentes",
    };

    for (const [path, permissionId] of Object.entries(pathPermissionMap)) {
      if (hasPermission(permissionId)) {
        paths.push(path);
      }
    }

    return paths;
  };

  return {
    currentUser,
    isLoading,
    hasPermission,
    hasPathAccess,
    getAccessiblePaths,
  };
}