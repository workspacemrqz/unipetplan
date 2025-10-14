import { Link, useLocation } from "wouter";
import { cn } from "@/lib/admin/utils";
import { LogOut } from "lucide-react";
import { SvgIcon } from "@/components/ui/SvgIcon";

export default function SellerSidebar() {
  const [location] = useLocation();
  
  const navigation = [
    {
      name: "Principal",
      items: [
        { name: "Dashboard", href: `/vendedor/dashboard`, iconName: "Dashboard" }
      ]
    },
    {
      name: "Vendas",
      items: [
        { name: "Link de Referência", href: `/vendedor/link`, iconName: "Vendedor" }
      ]
    }
  ];

  const handleLogout = () => {
    // Usar a mesma lógica do seller dashboard
    fetch("/api/sellers/logout", {
      method: "POST",
      credentials: "include",
    }).finally(() => {
      window.location.href = "/vendedor/login";
    });
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-[#eaeaea]">
      {/* Logo */}
      <div className="p-6">
        <img src="/unipet-logo.png" alt="Unipet Plan" className="h-8 w-auto" />
      </div>

      {/* Navigation - Exact same style as unit */}
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
                      "flex items-center px-3 py-2 text-sm rounded-lg transition-colors group",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    )}
                  >
                    <SvgIcon 
                      name={item.iconName} 
                      className={cn(
                        "h-5 w-5 mr-3 transition-all",
                        isActive 
                          ? "[filter:brightness(0)_saturate(100%)_invert(1)]" // Branco quando ativo
                          : "[filter:brightness(0)_saturate(100%)_invert(40%)_sepia(1%)_saturate(0%)_hue-rotate(0deg)_brightness(98%)_contrast(102%)] group-hover:[filter:brightness(0)_saturate(100%)_invert(15%)_sepia(0%)_saturate(0%)_hue-rotate(0deg)_brightness(95%)_contrast(100%)]" // Gray-600 padrão, gray-900 no hover
                      )} 
                    />
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
