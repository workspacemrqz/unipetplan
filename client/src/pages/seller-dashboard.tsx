import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSellerAuth } from "@/contexts/SellerAuthContext";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Users, TrendingUp, LogOut } from "lucide-react";

export default function SellerDashboard() {
  const [, setLocation] = useLocation();
  const { seller, isLoading: authLoading, logout } = useSellerAuth();
  const { toast } = useToast();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !seller) {
      setLocation("/vendedor/login");
    }
  }, [authLoading, seller, setLocation]);

  const handleLogout = async () => {
    await logout();
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
        <div className="grid gap-6 md:grid-cols-3 mb-8">
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

        {/* Whitelabel URL */}
        {seller.whitelabelUrl && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Seu Link de Vendas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Input
                  value={`${window.location.origin}/vendedor/${seller.whitelabelUrl}`}
                  readOnly
                  className="flex-1"
                />
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/vendedor/${seller.whitelabelUrl}`);
                    toast({ title: "Link copiado!" });
                  }}
                >
                  Copiar Link
                </Button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Compartilhe este link com seus clientes para rastrear suas vendas
              </p>
            </CardContent>
          </Card>
        )}

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
      </main>
    </div>
  );
}
