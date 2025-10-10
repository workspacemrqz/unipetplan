import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Home,
  Users,
  Building,
  HelpCircle,
  User,
  Settings,
  Stethoscope,
  Clipboard,
  DollarSign,
  MessageSquare,
  Star,
  FileText,
  Heart,
  CreditCard,
  File
} from "lucide-react";

const navigation = [
  {
    name: "Principal",
    items: [
      { name: "Dashboard", href: "/", icon: Home }
    ]
  },
  {
    name: "Clientes",
    items: [
      { name: "Clientes & Pets", href: "/clientes", icon: Users },
      { name: "Contratos", href: "/contratos", icon: FileText },
      { name: "Guias de Atendimento", href: "/guias", icon: File }
    ]
  },
  {
    name: "Financeiro",
    items: [
      { name: "Pagamentos", href: "/financeiro", icon: DollarSign },
      { name: "Cupons", href: "/cupons", icon: CreditCard }
    ]
  },
  {
    name: "Comunicação",
    items: [
      { name: "Rede Credenciada", href: "/rede", icon: Building },
      { name: "Formulários", href: "/formularios", icon: MessageSquare },
      { name: "Avaliações", href: "/avaliacoes", icon: Star }
    ]
  },
  {
    name: "Configurações",
    items: [
      { name: "Planos de Saúde", href: "/planos", icon: Heart },
      { name: "Procedimentos", href: "/procedimentos", icon: Clipboard },
      { name: "FAQ", href: "/perguntas-frequentes", icon: HelpCircle },
      { name: "Administração", href: "/administracao", icon: User },
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

      <nav className="flex-1 px-4 pb-6 space-y-8 overflow-y-auto">
        {navigation.map((section) => (
          <div key={section.name}>
            <h3 className="text-xs font-bold text-muted-foreground/70 uppercase tracking-widest mb-4 px-3">
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
                      "flex items-center px-3 py-2.5 text-sm rounded-lg transition-all duration-200 group",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    )}
                    data-testid={`link-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <item.icon className={cn(
                      "h-5 w-5 mr-3 transition-transform duration-200",
                      !isActive && "group-hover:scale-110"
                    )} />
                    <span className="font-medium">{item.name}</span>
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
