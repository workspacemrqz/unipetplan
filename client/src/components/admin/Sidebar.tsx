import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/admin/utils";
import {
  Home,
  Users,
  FileText,
  CreditCard,
  Building,
  HelpCircle,
  Mail,
  User,
  Settings,
  Clipboard,
  DollarSign,
  File,
  Ticket,
  Star
} from "lucide-react";
import { createCacheManager } from "@/lib/admin/cacheUtils";

const navigation = [
  {
    name: "Principal",
    items: [
      { name: "Dashboard", href: "/", icon: Home }
    ]
  },
  {
    name: "Gestão",
    items: [
      { name: "Clientes & Pets", href: "/clientes", icon: Users },
      { name: "Guias de Atendimento", href: "/guias", icon: FileText },
      { name: "Rede Credenciada", href: "/rede", icon: Building },
      { name: "Financeiro", href: "/financeiro", icon: DollarSign },
      { name: "Cupom", href: "/cupom", icon: Ticket },
      { name: "Contratos", href: "/contratos", icon: File },
      { name: "Formulários", href: "/formularios", icon: Mail },
      { name: "Avaliações", href: "/avaliacoes", icon: Star }
    ]
  },
  {
    name: "Sistema",
    items: [
      { name: "Planos de Saúde", href: "/planos", icon: CreditCard },
      { name: "Procedimentos", href: "/procedimentos", icon: Clipboard },
      { name: "FAQ", href: "/perguntas-frequentes", icon: HelpCircle },
      { name: "Administração", href: "/administracao", icon: User },
      { name: "Configurações", href: "/configuracoes", icon: Settings }
    ]
  }
];

export default function Sidebar() {
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const cacheManager = createCacheManager(queryClient);

  // Map navigation paths to prefetch page types
  const getPageTypeFromPath = (href: string): 'clients' | 'guides' | 'plans' | 'dashboard' | null => {
    if (href === '/') return 'dashboard';
    if (href.startsWith('/clientes')) return 'clients';
    if (href.startsWith('/guias')) return 'guides';
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

  return (
    <div className="flex flex-col h-full bg-white border-r border-[#eaeaea]">
      <div className="p-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">SISTEMA UNIPET</h1>
          <p className="text-sm text-gray-600">Plano de Saúde Pet</p>
        </div>
      </div>

      <nav className="flex-1 px-6 pb-6 space-y-6 overflow-y-auto">
        {navigation.map((section) => (
          <div key={section.name}>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {section.name}
            </h3>
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
                      "flex items-center px-3 py-2 text-sm rounded-lg transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-gray-600 hover:text-gray-900"
                    )}
                    data-testid={`link-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                    onMouseEnter={() => handleNavigationHover(item.href)}
                  >
                    <item.icon className="h-5 w-5 mr-3" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}
