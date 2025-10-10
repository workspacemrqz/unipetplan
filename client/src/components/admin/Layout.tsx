import { useState, memo } from "react";
import Sidebar from "./Sidebar.tsx";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import "@/admin.css";

interface LayoutProps {
  children: React.ReactNode;
}

function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[var(--bg-cream-light)] overflow-hidden" data-admin-area="true">
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
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden bg-[var(--bg-cream-light)] border-b border-[var(--border-teal-light)]">
          <div className="flex items-center justify-between p-3 sm:p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              data-testid="button-menu-toggle"
              className="p-2"
            >
              {sidebarOpen ? <X className="h-5 w-5 sm:h-6 sm:w-6" /> : <Menu className="h-5 w-5 sm:h-6 sm:w-6" />}
            </Button>
            <div className="text-sm font-medium text-[var(--text-teal)] hidden xs:block">
              UNIPET
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6 bg-[var(--bg-cream-light)]" style={{ overscrollBehaviorY: 'contain' }}>
          <div className="container-mobile max-w-none">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default memo(Layout);
