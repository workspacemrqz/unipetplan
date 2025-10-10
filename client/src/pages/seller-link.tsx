import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import SellerLayout from "@/components/seller/SellerLayout";
import { Link as LinkIcon, Copy, Check } from "lucide-react";
import LoadingDots from "@/components/ui/LoadingDots";
import { useSellerAuth } from "@/contexts/SellerAuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function SellerLink() {
  const [, setLocation] = useLocation();
  const { seller, isLoading: authLoading } = useSellerAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    if (!authLoading && !seller) {
      setLocation("/vendedor/login");
      return;
    }
    
    if (seller) {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthentication();
  }, [authLoading, seller]);

  const handleCopyLink = () => {
    if (seller?.whitelabelUrl) {
      const link = `${window.location.origin}/vendedor/${seller.whitelabelUrl}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      toast({ 
        title: "Link copiado!", 
        description: "O link de referência foi copiado para a área de transferência." 
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-cream-light)]">
        <div className="text-center">
          <LoadingDots size="lg" color="#0e7074" className="mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!seller) {
    return null;
  }

  const referralLink = seller.whitelabelUrl ? `${window.location.origin}/vendedor/${seller.whitelabelUrl}` : "";

  return (
    <SellerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground break-words">Link de Referência</h1>
            <p className="text-sm text-muted-foreground">Compartilhe seu link e ganhe comissões</p>
          </div>
        </div>

        {/* Link Card */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {seller.whitelabelUrl ? (
            <div className="space-y-6">
              {/* Link Display and Copy */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Input
                    value={referralLink}
                    readOnly
                    className="flex-1 font-mono text-sm"
                  />
                  <Button
                    onClick={handleCopyLink}
                    className="shrink-0"
                    variant={copied ? "outline" : "default"}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar Link
                      </>
                    )}
                  </Button>
                </div>

                <div className="p-4 rounded-lg" style={{ backgroundColor: '#e8f4f4' }}>
                  <div style={{ color: '#257273' }}>
                    <p className="font-semibold mb-2">Como funciona:</p>
                    <ul className="space-y-1 text-sm">
                      <li>• Compartilhe este link com seus clientes</li>
                      <li>• Quando acessarem o site por este link, a referência será automaticamente registrada</li>
                      <li>• Mesmo navegando entre páginas, a referência permanece ativa</li>
                      <li>• Ao finalizarem uma compra, você receberá a comissão automaticamente</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Performance Stats */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Cliques no link</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
                    </div>
                    <div className="p-3 rounded-lg" style={{ backgroundColor: '#e8f4f4' }}>
                      <LinkIcon className="h-6 w-6" style={{ color: '#257273' }} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">Total de acessos</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Conversões</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
                    </div>
                    <div className="p-3 rounded-lg" style={{ backgroundColor: '#e8f4f4' }}>
                      <Check className="h-6 w-6" style={{ color: '#257273' }} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">Vendas concluídas</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Taxa de conversão</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">0%</p>
                    </div>
                    <div className="p-3 rounded-lg" style={{ backgroundColor: '#e8f4f4' }}>
                      <LinkIcon className="h-6 w-6" style={{ color: '#257273' }} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">Eficiência de vendas</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#e8f4f4' }}>
              <p style={{ color: '#257273' }}>
                Seu link de referência está sendo gerado. Entre em contato com o suporte se o problema persistir.
              </p>
            </div>
          )}
        </div>
      </div>
    </SellerLayout>
  );
}
