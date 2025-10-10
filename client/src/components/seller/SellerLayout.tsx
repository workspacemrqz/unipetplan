import { useState, memo } from "react";
import SellerSidebar from "./SellerSidebar";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import "@/admin.css";

interface LayoutProps {
  children: React.ReactNode;
}

function SellerLayout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-foreground/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        max-w-[85vw] xs:max-w-[280px] sm:max-w-none
      `}>
        <SellerSidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden bg-white border-b border-gray-200">
          <div className="flex items-center justify-between p-3 sm:p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2"
            >
              {sidebarOpen ? <X className="h-5 w-5 sm:h-6 sm:w-6" /> : <Menu className="h-5 w-5 sm:h-6 sm:w-6" />}
            </Button>
            <div className="text-sm font-medium text-gray-900">
              SISTEMA UNIPET
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6">
          <div className="container-mobile max-w-none">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default memo(SellerLayout);
