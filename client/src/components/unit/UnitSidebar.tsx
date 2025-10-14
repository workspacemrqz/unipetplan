import { Link, useLocation } from "wouter";
import { useParams } from "wouter";
import { cn } from "@/lib/admin/utils";
import { useState, useEffect } from "react";
import { LogOut, ChevronDown, ChevronRight } from "lucide-react";
import { SvgIcon } from "@/components/ui/SvgIcon";

interface NavigationItem {
  name: string;
  href: string;
  iconName: string;
  subItems?: Array<{
    name: string;
    href: string;
    iconName: string;
  }>;
}

interface NavigationSection {
  name: string;
  items: NavigationItem[];
}

export default function UnitSidebar() {
  const [location] = useLocation();
  const { slug } = useParams();
  
  // Estado para controlar quais seções estão expandidas
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  
  // Detectar tipo de usuário baseado no token armazenado
  const isVeterinarian = !!localStorage.getItem('veterinarian-token');
  
  // Definir navegação baseada no tipo de usuário
  const navigation: NavigationSection[] = isVeterinarian 
    ? [
        // Menu reduzido para veterinários
        {
          name: "Atendimentos",
          items: [
            { 
              name: "Atendimentos", 
              href: `/unidade/${slug}/atendimentos`, 
              iconName: "Atendimento"
            },
            { 
              name: "Novo Atendimento", 
              href: `/unidade/${slug}/atendimentos/novo`, 
              iconName: "Atendimento" 
            }
          ]
        }
      ]
    : [
        // Menu completo para unidades
        {
          name: "Principal",
          items: [
            { name: "Dashboard", href: `/unidade/${slug}/painel`, iconName: "Dashboard" }
          ]
        },
        {
          name: "Atendimentos",
          items: [
            { 
              name: "Atendimentos", 
              href: `/unidade/${slug}/atendimentos`, 
              iconName: "Atendimento"
            },
            { 
              name: "Novo Atendimento", 
              href: `/unidade/${slug}/atendimentos/novo`, 
              iconName: "Atendimento" 
            }
          ]
        },
        {
          name: "Gestão",
          items: [
            { name: "Procedimentos", href: `/unidade/${slug}/procedimentos`, iconName: "Procedimento" },
            { name: "Corpo Clínico", href: `/unidade/${slug}/corpo-clinico`, iconName: "Admin" }
          ]
        },
        {
          name: "Financeiro",
          items: [
            { name: "Relatório Financeiro", href: `/unidade/${slug}/relatorio-financeiro`, iconName: "Pagamento" }
          ]
        },
        {
          name: "Sistema",
          items: [
            { name: "Logs de Ações", href: `/unidade/${slug}/logs`, iconName: "LogsList" }
          ]
        }
      ];

  // Expand section containing current route on mount and route change
  useEffect(() => {
    const newExpanded = new Set<string>();
    
    for (const section of navigation) {
      const hasActiveItem = section.items.some(item => {
        // Check main item
        if (location === item.href) return true;
        // Check subitems
        if (item.subItems?.some(sub => location === sub.href)) return true;
        // Check if current location starts with item href (for nested routes)
        if (item.href !== `/unidade/${slug}/painel` && location.startsWith(item.href)) return true;
        return false;
      });
      
      if (hasActiveItem) {
        newExpanded.add(section.name);
      }
    }
    
    setExpandedSections(newExpanded);
  }, [location, slug]);

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

  const handleLogout = () => {
    // Remover tokens baseado no tipo de usuário
    if (isVeterinarian) {
      localStorage.removeItem('veterinarian-token');
      localStorage.removeItem('veterinarian-name');
    } else {
      localStorage.removeItem('unit-token');
    }
    
    // Remover dados comuns
    localStorage.removeItem('unit-slug');
    localStorage.removeItem('unit-name');
    
    // Redirecionar para a página de login da unidade
    window.location.href = `/unidade/${slug}`;
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-[#eaeaea]">
      {/* Logo - Preservado como solicitado */}
      <div className="p-6">
        <img src="/unipet-logo.png" alt="Unipet Plan" className="h-8 w-auto" />
      </div>

      {/* Navigation - Seguindo exatamente o estilo do admin */}
      <nav className="flex-1 px-4 pb-6 space-y-4 overflow-y-auto">
        {navigation.map((section) => {
          const isExpanded = expandedSections.has(section.name);
          
          return (
            <div key={section.name}>
              {/* Section Header - Mesmo estilo do admin */}
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
              
              {/* Section Items */}
              {isExpanded && (
                <div className="space-y-1">
                  {section.items.map((item) => {
                    // Check if current location matches the item's href or any subitem
                    const isActive = location === item.href || 
                      item.subItems?.some(sub => location === sub.href) ||
                      (item.href !== `/unidade/${slug}/painel` && location.startsWith(item.href));
                    
                    return (
                      <div key={item.name}>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center px-3 py-2.5 text-sm rounded-lg transition-all duration-200 group",
                            isActive
                              ? "bg-primary text-primary-foreground shadow-md"
                              : "text-gray-600 hover:bg-primary/10 hover:text-primary"
                          )}
                        >
                          <SvgIcon 
                            name={item.iconName} 
                            className={cn(
                              "h-5 w-5 mr-3 transition-transform duration-200",
                              isActive ? "invert" : "opacity-60",
                              !isActive && "group-hover:scale-110"
                            )} 
                          />
                          <span className="font-medium">{item.name}</span>
                        </Link>
                        
                        {/* Render subitems if they exist */}
                        {item.subItems && isExpanded && (
                          <div className="ml-8 mt-1 space-y-1">
                            {item.subItems.map((subItem) => {
                              const isSubActive = location === subItem.href;
                              return (
                                <Link
                                  key={subItem.name}
                                  href={subItem.href}
                                  className={cn(
                                    "flex items-center px-3 py-2 text-sm rounded-lg transition-all duration-200",
                                    isSubActive
                                      ? "bg-primary/10 text-primary font-medium"
                                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                  )}
                                >
                                  <SvgIcon 
                                    name={subItem.iconName} 
                                    className={cn(
                                      "h-4 w-4 mr-2",
                                      isSubActive ? "opacity-80" : "opacity-50"
                                    )} 
                                  />
                                  {subItem.name}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
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