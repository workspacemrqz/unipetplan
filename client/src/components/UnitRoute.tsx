import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import UnitDashboard from "@/pages/UnitDashboard";
import NotFound from "@/pages/not-found";
import LoadingDots from "@/components/ui/LoadingDots";

// Component to handle dynamic unit routes
export default function UnitRoute() {
  const [location] = useLocation();
  const [isValidUnit, setIsValidUnit] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUnitRoute();
  }, [location]);

  const checkUnitRoute = async () => {
    // Extract slug from current path and remove query parameters
    const pathWithoutQuery = location.split('?')[0] || ''; // Remove query parameters
    const slug = pathWithoutQuery.substring(1); // Remove leading slash
    
    // Skip known admin routes
    const adminRoutes = [
      '', 'clientes', 'pets', 'atendimentos', 'planos', 'rede', 
      'perguntas-frequentes', 'formularios', 'configuracoes', 'administracao',
      'procedimentos'
    ];
    
    if (adminRoutes.includes(slug) || slug.includes('/')) {
      setIsValidUnit(false);
      setLoading(false);
      return;
    }

    try {
      // Check if this slug corresponds to a valid unit
      const response = await fetch(`/api/unit/${slug}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        const isValid = data.exists && data.isActive;
        setIsValidUnit(isValid);
      } else {
        setIsValidUnit(false);
      }
    } catch (error) {
      console.error("Error checking unit route:", error);
      setIsValidUnit(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <LoadingDots size="md" color="#0e7074" className="mb-2" />
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (isValidUnit) {
    return <UnitDashboard />;
  }

  return <NotFound />;
}