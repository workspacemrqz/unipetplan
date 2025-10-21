import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import UnitLayout from '@/components/unit/UnitLayout';
import UnitProcedures from "@/components/unit/UnitProcedures";
import LoadingDots from '@/components/ui/LoadingDots';

export default function ProcedimentosPage() {
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
      console.log('❌ [PROCEDIMENTOS] Auth failed - redirecting to login');
      setLocation(`/unidade/${slug}`);
      return;
    }
    
    console.log('✅ [PROCEDIMENTOS] Auth successful');
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
      <UnitProcedures unitSlug={slug || ''} />
    </UnitLayout>
  );
}