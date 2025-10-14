import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import UnitLayout from '@/components/unit/UnitLayout';
import UnitAtendimentos from "@/components/unit/UnitAtendimentos";
import LoadingDots from '@/components/ui/LoadingDots';

export default function AtendimentosPage() {
  const { slug } = useParams();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthentication();
  }, [slug]);

  const checkAuthentication = async () => {
    const unitToken = localStorage.getItem('unit-token');
    const veterinarianToken = localStorage.getItem('veterinarian-token');
    const unitSlug = localStorage.getItem('unit-slug');
    
    // Verificar se existe unit-token OU veterinarian-token
    const hasValidToken = unitToken || veterinarianToken;
    
    if (!hasValidToken || unitSlug !== slug) {
      setLocation(`/unidade/${slug}`);
      return;
    }
    
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf9f7]">
        <div className="text-center">
          <LoadingDots size="lg" color="#0e7074" className="mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <UnitLayout>
      <UnitAtendimentos unitSlug={slug || ''} />
    </UnitLayout>
  );
}