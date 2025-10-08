import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FileText,
  CreditCard,
  Building2,
  HelpCircle,
  Mail,
  UserCog,
  Settings,
  Stethoscope,
  ClipboardList
} from "lucide-react";

const navigation = [
  {
    name: "Principal",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard }
    ]
  },
  {
    name: "Gestão",
    items: [
      { name: "Clientes & Pets", href: "/clientes", icon: Users },
      { name: "Guias de Atendimento", href: "/guias", icon: FileText },
      { name: "Rede Credenciada", href: "/rede", icon: Building2 },
      { name: "Formulários", href: "/formularios", icon: Mail }
    ]
  },
  {
    name: "Sistema",
    items: [
      { name: "Planos de Saúde", href: "/planos", icon: CreditCard },
      { name: "Procedimentos", href: "/procedimentos", icon: ClipboardList },
      { name: "FAQ", href: "/perguntas-frequentes", icon: HelpCircle },
      { name: "Administração", href: "/administracao", icon: UserCog },
      { name: "Configurações", href: "/configuracoes", icon: Settings }
    ]
  }
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="flex flex-col h-full bg-white border-r border-[#eaeaea]">
      <div className="p-6">
        <div className="flex items-center space-x-3">
          <Stethoscope className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-foreground">CRM UNIPET</h1>
            <p className="text-sm text-muted-foreground">Plano de Saúde Pet</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-6 pb-6 space-y-6 overflow-y-auto">
        {navigation.map((section) => (
          <div key={section.name}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {section.name}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link 
                    key={item.name} 
                    href={item.href}
                    className={cn(
                      "flex items-center px-3 py-2 text-sm rounded-lg transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground"
                    )}
                    data-testid={`link-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
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
