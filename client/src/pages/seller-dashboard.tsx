import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSellerAuth } from "@/contexts/SellerAuthContext";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Users, TrendingUp, LogOut, Link2, BarChart3, Copy, Check } from "lucide-react";

export default function SellerDashboard() {
  const [, setLocation] = useLocation();
  const { seller, isLoading: authLoading, logout } = useSellerAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !seller) {
      setLocation("/vendedor/login");
    }
  }, [authLoading, seller, setLocation]);

  const handleLogout = async () => {
    await logout();
  };

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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-8 w-64" />
      </div>
    );
  }

  if (!seller) {
    return null;
  }

  const referralLink = seller.whitelabelUrl ? `${window.location.origin}/vendedor/${seller.whitelabelUrl}` : "";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Portal do Vendedor</h1>
            <p className="text-sm text-gray-600">Bem-vindo, {seller.fullName}</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="link" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Link
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              {/* CPA Commission Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Comissão CPA</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{seller.cpaPercentage || '0'}%</div>
                  <p className="text-xs text-muted-foreground">
                    Por nova venda realizada
                  </p>
                </CardContent>
              </Card>

              {/* Recurring Commission Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Comissão Recorrente</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{seller.recurringCommissionPercentage || '0'}%</div>
                  <p className="text-xs text-muted-foreground">
                    Das mensalidades dos clientes
                  </p>
                </CardContent>
              </Card>

              {/* Total Clients Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">
                    Total de clientes ativos
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Sales Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Visão Geral de Vendas</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertDescription>
                    Seus dados de vendas e comissões serão exibidos aqui em breve.
                    Continue vendendo e acompanhe seu desempenho!
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Link Tab */}
          <TabsContent value="link" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  Seu Link de Referência
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {seller.whitelabelUrl ? (
                  <>
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

                      <Alert className="bg-blue-50 border-blue-200">
                        <AlertDescription className="text-blue-900">
                          <strong>Como funciona:</strong>
                          <ul className="mt-2 space-y-1 text-sm">
                            <li>• Compartilhe este link com seus clientes</li>
                            <li>• Quando acessarem o site por este link, a referência será automaticamente registrada</li>
                            <li>• Mesmo navegando entre páginas, a referência permanece ativa</li>
                            <li>• Ao finalizarem uma compra, você receberá a comissão automaticamente</li>
                          </ul>
                        </AlertDescription>
                      </Alert>
                    </div>

                    {/* Share Instructions */}
                    <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                      <h3 className="font-semibold text-gray-900">Dicas para Compartilhar</h3>
                      <div className="space-y-3 text-sm text-gray-600">
                        <p>
                          <strong className="text-gray-900">WhatsApp:</strong> Cole o link em suas conversas ou status
                        </p>
                        <p>
                          <strong className="text-gray-900">Redes Sociais:</strong> Compartilhe em posts, stories ou biografias
                        </p>
                        <p>
                          <strong className="text-gray-900">Email:</strong> Inclua o link em suas mensagens e assinaturas
                        </p>
                        <p>
                          <strong className="text-gray-900">Site/Blog:</strong> Adicione como botão ou banner em suas páginas
                        </p>
                      </div>
                    </div>

                    {/* Performance Stats */}
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold">0</div>
                          <p className="text-sm text-muted-foreground">Cliques no link</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold">0</div>
                          <p className="text-sm text-muted-foreground">Conversões</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold">0%</div>
                          <p className="text-sm text-muted-foreground">Taxa de conversão</p>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                ) : (
                  <Alert>
                    <AlertDescription>
                      Seu link de referência está sendo gerado. Entre em contato com o suporte se o problema persistir.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
