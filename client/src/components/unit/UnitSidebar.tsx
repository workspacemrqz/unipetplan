import { Link, useLocation } from "wouter";
import { useParams } from "wouter";
import { cn } from "@/lib/admin/utils";
import {
  Home,
  Users,
  FileText,
  Clipboard,
  ClipboardList,
  LogOut
} from "lucide-react";

export default function UnitSidebar() {
  const [location] = useLocation();
  const { slug } = useParams();
  
  const navigation = [
    {
      name: "Principal",
      items: [
        { name: "Dashboard", href: `/unidade/${slug}/painel`, icon: Home }
      ]
    },
    {
      name: "Gestão",
      items: [
        { name: "Guias de Atendimento", href: `/unidade/${slug}/guias`, icon: FileText },
        { name: "Histórico de atendimento", href: `/unidade/${slug}/historico`, icon: ClipboardList },
        { name: "Clientes & Pets", href: `/unidade/${slug}/clientes`, icon: Users },
        { name: "Procedimentos", href: `/unidade/${slug}/procedimentos`, icon: Clipboard }
      ]
    }
  ];

  const handleLogout = () => {
    localStorage.removeItem('unit-token');
    localStorage.removeItem('unit-slug');
    localStorage.removeItem('unit-name');
    window.location.href = `/unidade/${slug}`;
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-[#eaeaea]">
      {/* Logo */}
      <div className="p-6">
        <img src="/unipet-logo.png" alt="Unipet Plan" className="h-8 w-auto" />
      </div>

      {/* Navigation - Exact same style as admin */}
      <nav className="flex-1 px-6 pb-6 space-y-6 overflow-y-auto">
        {navigation.map((section) => (
          <div key={section.name}>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {section.name}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => {
                // Check if current location matches the item's href
                const isActive = location === item.href;
                
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