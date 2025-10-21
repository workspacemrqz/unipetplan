import { ReactNode, useEffect } from "react";
import { Redirect } from "wouter";
import { usePermissions } from "@/hooks/use-permissions";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: string;
  path?: string;
  fallbackPath?: string;
}

export function ProtectedRoute({ 
  children, 
  requiredPermission, 
  path,
  fallbackPath = "/admin"
}: ProtectedRouteProps) {
  const { currentUser, isLoading, hasPermission, hasPathAccess } = usePermissions();

  useEffect(() => {
    // Log permission check for debugging
    if (currentUser && requiredPermission) {
      console.log(`🔐 Verificando permissão "${requiredPermission}" para usuário:`, {
        user: currentUser.username,
        role: currentUser.role,
        permissions: currentUser.permissions,
        hasAccess: hasPermission(requiredPermission)
      });
    }
  }, [currentUser, requiredPermission, hasPermission]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!currentUser || !currentUser.isActive) {
    return <Redirect to="/admin/login" />;
  }

  // Check permission
  const hasAccess = requiredPermission 
    ? hasPermission(requiredPermission)
    : path 
      ? hasPathAccess(path)
      : true;

  // No access to this resource
  if (!hasAccess) {
    // Show toast notification
    useEffect(() => {
      toast({
        title: "Acesso Negado",
        description: `Você não tem permissão para acessar ${requiredPermission || path || "este recurso"}.`,
        variant: "destructive",
      });
    }, []);

    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <div className="text-center max-w-md">
          <Lock className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Acesso Restrito
          </h1>
          <p className="text-muted-foreground mb-6">
            Você não tem permissão para acessar esta área. 
            {currentUser.role !== "superadmin" && (
              <span className="block mt-2 text-sm">
                Entre em contato com um administrador se você acredita que deveria ter acesso.
              </span>
            )}
          </p>
          
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Suas permissões atuais:</p>
              <div className="flex flex-wrap gap-2">
                {currentUser.permissions && currentUser.permissions.length > 0 ? (
                  currentUser.permissions.map((perm) => (
                    <span
                      key={perm}
                      className="px-2 py-1 bg-background text-xs rounded border"
                    >
                      {perm}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Nenhuma permissão específica atribuída
                  </span>
                )}
              </div>
            </div>

            <Button
              onClick={() => window.location.href = fallbackPath}
              variant="outline"
            >
              Voltar ao Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Has access, render children
  return <>{children}</>;
}