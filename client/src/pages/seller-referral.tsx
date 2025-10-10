import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Loader2 } from "lucide-react";
import { setSellerReferral } from "@/lib/sellerReferral";

export default function SellerReferral() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/vendedor/:slug");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const captureReferral = async () => {
      if (!params?.slug) {
        console.error("[Referral] No seller slug provided");
        navigate("/");
        return;
      }

      try {
        // Fetch seller by slug from backend
        const response = await fetch(`/api/seller/referral/${params.slug}`);
        
        if (!response.ok) {
          throw new Error("Vendedor não encontrado");
        }

        const seller = await response.json();
        
        // Save referral to localStorage
        setSellerReferral(seller.id, seller.whitelabelUrl);
        
        // Redirect to home page
        console.log(`[Referral] Referral captured for seller: ${seller.fullName}`);
        navigate("/");
      } catch (err) {
        console.error("[Referral] Error capturing referral:", err);
        setError(err instanceof Error ? err.message : "Erro ao processar referência");
        // Redirect to home even on error
        setTimeout(() => navigate("/"), 2000);
      }
    };

    captureReferral();
  }, [params, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        {error ? (
          <>
            <div className="text-red-600 text-lg font-medium">{error}</div>
            <p className="text-gray-600">Redirecionando...</p>
          </>
        ) : (
          <>
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-teal-600" />
            <p className="text-gray-600">Processando sua referência...</p>
          </>
        )}
      </div>
    </div>
  );
}
