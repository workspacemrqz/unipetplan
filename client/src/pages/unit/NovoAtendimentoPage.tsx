import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import UnitLayout from '@/components/unit/UnitLayout';
import SteppedAtendimentoForm from "@/components/shared/SteppedAtendimentoForm";
import LoadingDots from '@/components/ui/LoadingDots';

export default function NovoAtendimentoPage() {
  const [, setLocation] = useLocation();
  const { slug } = useParams();
  const [authenticated, setAuthenticated] = useState(false);

  // Verificar autenticação (aceita tokens de unidade ou veterinário)
  useEffect(() => {
    // Check for unit authentication
    const unitToken = localStorage.getItem('unit-token');
    const unitSlug = localStorage.getItem('unit-slug');
    
    // Check for veterinarian authentication
    const vetToken = localStorage.getItem('veterinarian-token');
    const vetUnitSlug = localStorage.getItem('unit-slug'); // Vet also uses unit-slug
    
    const hasUnitAuth = unitToken && unitSlug === slug;
    const hasVetAuth = vetToken && vetUnitSlug === slug;
    
    if (!hasUnitAuth && !hasVetAuth) {
      setLocation(`/unidade/${slug}`);
      return;
    }
    
    setAuthenticated(true);
  }, [slug, setLocation]);

  // Buscar informações da unidade
  const { data: unitInfo, isLoading: unitInfoLoading } = useQuery<any>({
    queryKey: [`/api/network-units/${slug}/info`],
    queryFn: async () => {
      const response = await fetch(`/api/network-units/${slug}/info`);
      if (!response.ok) {
        throw new Error('Erro ao buscar informações da unidade');
      }
      return response.json();
    },
    enabled: !!slug && authenticated,
  });

  if (!authenticated || unitInfoLoading) {
    return (
      <UnitLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <LoadingDots size="lg" color="#0e7074" className="mb-4" />
            <p className="text-gray-600">Carregando...</p>
          </div>
        </div>
      </UnitLayout>
    );
  }

  return (
    <UnitLayout>
      <div className="p-3 sm:p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground break-words">
            Novo Atendimento
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Siga as etapas para registrar um novo atendimento
          </p>
        </div>

        {/* Stepped Form */}
        {slug && (
          <SteppedAtendimentoForm
            mode="unit"
            slug={slug}
            networkUnitId={unitInfo?.id}
            networkUnitName={unitInfo?.name}
            onSuccess={() => setLocation(`/unidade/${slug}/atendimentos`)}
          />
        )}
      </div>
    </UnitLayout>
  );
}