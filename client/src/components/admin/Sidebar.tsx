import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/admin/utils";
import { useState, useEffect, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { createCacheManager } from "@/lib/admin/cacheUtils";
import CustomIcon from "@/components/admin/ui/CustomIcon";
import { usePermissions } from "@/hooks/use-permissions";

// Mapeamento de rotas para permissões
const routePermissionMap: Record<string, string | null> = {
  '/': 'dashboard',
  '/clientes': 'clients',
  '/contratos': 'contracts',
  '/atendimentos': 'atendimentos',
  '/financeiro': 'financeiro',
  '/cupom': 'cupom',
  '/relatorio-financeiro': 'relatorio-financeiro',
  '/formularios': 'formularios',
  '/avaliacoes': 'avaliacoes',
  '/rede': 'rede',
  '/vendedores': 'vendedores',
  '/procedimentos': 'procedimentos',
  '/perguntas-frequentes': 'perguntas-frequentes',
  // Rotas que não precisam de verificação de permissão (sempre visíveis)
  '/administracao': null, // Administração sempre visível
  '/planos': null, // Planos sempre visível
  '/logs': null, // Logs sempre visível
  '/configuracoes': null // Configurações sempre visível
};

const navigation = [
  {
    name: "Principal",
    items: [
      { name: "Dashboard", href: "/", iconName: "Dashboard" }
    ]
  },
  {
    name: "Clientes",
    items: [
      { name: "Clientes & Pets", href: "/clientes", iconName: "Cliente e Pet" },
      { name: "Contratos", href: "/contratos", iconName: "Contrato" },
      { name: "Atendimentos", href: "/atendimentos", iconName: "Atendimento" }
    ]
  },
  {
    name: "Financeiro",
    items: [
      { name: "Pagamentos", href: "/financeiro", iconName: "Pagamento" },
      { name: "Cupons", href: "/cupom", iconName: "Cupom" },
      { name: "Relatório Financeiro", href: "/relatorio-financeiro", iconName: "Pagamento" }
    ]
  },
  {
    name: "Comunicação",
    items: [
      { name: "Formulários", href: "/formularios", iconName: "Formularios" },
      { name: "Avaliações", href: "/avaliacoes", iconName: "Avaliação" }
    ]
  },
  {
    name: "Parceiros",
    items: [
      { name: "Rede Credenciada", href: "/rede", iconName: "Rede Credenciada" },
      { name: "Vendedores", href: "/vendedores", iconName: "Vendedor" }
    ]
  },
  {
    name: "Configurações",
    items: [
      { name: "Planos de Saúde", href: "/planos", iconName: "Plano de saúde" },
      { name: "Procedimentos", href: "/procedimentos", iconName: "Procedimento" },
      { name: "FAQ", href: "/perguntas-frequentes", iconName: "FAQ" },
      { name: "Administração", href: "/administracao", iconName: "Admin" },
      { name: "Logs de Ações", href: "/logs", iconName: "LogsList" },
      { name: "Configurações", href: "/configuracoes", iconName: "Configurações" }
    ]
  }
];

export default function Sidebar() {
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const cacheManager = createCacheManager(queryClient);
  const { hasPermission, currentUser } = usePermissions();
  
  // Estado para controlar quais seções estão expandidas
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  
  // Filtrar navegação baseado em permissões
  const filteredNavigation = useMemo(() => {
    return navigation.map(section => {
      const filteredItems = section.items.filter(item => {
        const permission = routePermissionMap[item.href];
        // Se não tem permissão mapeada (null), sempre mostra
        // Se tem permissão mapeada, verifica se o usuário tem acesso
        return permission === null || permission === undefined || hasPermission(permission);
      });
      
      return {
        ...section,
        items: filteredItems
      };
    }).filter(section => section.items.length > 0); // Remove seções sem itens
  }, [currentUser, hasPermission]);

  // Expand section containing current route
  useEffect(() => {
    for (const section of filteredNavigation) {
      const hasActiveItem = section.items.some(item => 
        item.href === '/' ? location === item.href : location.startsWith(item.href)
      );
      if (hasActiveItem) {
        setExpandedSections(prev => {
          const newSet = new Set(prev);
          newSet.add(section.name);
          return newSet;
        });
        break;
      }
    }
  }, [location, filteredNavigation]);

  // Função para alternar a expansão de uma seção
  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionName)) {
        newSet.delete(sectionName);
      } else {
        newSet.add(sectionName);
      }
      return newSet;
    });
  };

  // Map navigation paths to prefetch page types
  const getPageTypeFromPath = (href: string): 'clients' | 'atendimentos' | 'plans' | 'dashboard' | null => {
    if (href === '/') return 'dashboard';
    if (href.startsWith('/clientes')) return 'clients';
    if (href.startsWith('/atendimentos')) return 'atendimentos';
    if (href.startsWith('/planos')) return 'plans';
    return null;
  };

  // Hover handler for navigation items to trigger prefetching
  const handleNavigationHover = (href: string) => {
    const pageType = getPageTypeFromPath(href);
    if (pageType && pageType !== getPageTypeFromPath(location)) {
      // Only prefetch if not already on that page
      cacheManager.prefetchPageData(pageType).catch(error => {
        console.warn(`⚠️ [PREFETCH] Hover prefetch failed for ${pageType}:`, error);
      });
    }
  };

  const handleLogout = () => {
    // Limpar sessão
    localStorage.clear();
    sessionStorage.clear();
    
    // Redirecionar para a página de login
    window.location.href = '/admin/login';
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-[#eaeaea]">
      <div className="p-6">
        <img src="/unipet-logo.png" alt="Unipet Plan" className="h-8 w-auto" />
      </div>

      <nav className="flex-1 px-4 pb-6 space-y-4 overflow-y-auto">
        {filteredNavigation.map((section) => {
          const isExpanded = expandedSections.has(section.name);
          
          return (
            <div key={section.name}>
              <button
                onClick={() => toggleSection(section.name)}
                className="w-full flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-3 py-1 hover:text-gray-600 transition-colors rounded-lg"
              >
                <span>{section.name}</span>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              
              {isExpanded && (
                <div className="space-y-1">
              {section.items.map((item) => {
                // Use startsWith for nested routes to highlight parent sections
                const isActive = item.href === '/' 
                  ? location === item.href  // Dashboard exact match
                  : location.startsWith(item.href); // Other routes use startsWith for nested routes
                return (
                  <Link 
                    key={item.name} 
                    href={item.href}
                    className={cn(
                      "flex items-center px-3 py-2.5 text-sm rounded-lg transition-all duration-200 group",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-gray-600 hover:bg-primary/10 hover:text-primary"
                    )}
                    data-testid={`link-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                    onMouseEnter={() => handleNavigationHover(item.href)}
                  >
                    <CustomIcon 
                      name={item.iconName} 
                      color={isActive ? "white" : "gray"}
                      className={cn(
                        "h-5 w-5 mr-3 transition-transform duration-200",
                        !isActive && "group-hover:scale-110 group-hover:brightness-110"
                      )} 
                    />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-[#eaeaea]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </button>
      </div>
    </div>
  );
}
