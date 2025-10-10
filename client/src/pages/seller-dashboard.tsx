import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import SellerLayout from "@/components/seller/SellerLayout";
import { DollarSign, Users, Link as LinkIcon, Check } from "lucide-react";
import LoadingDots from "@/components/ui/LoadingDots";
import { useSellerAuth } from "@/contexts/SellerAuthContext";

interface DashboardStats {
  totalClients: number;
  totalSales: number;
  cpaPercentage: number;
  recurringPercentage: number;
  clicks: number;
  conversions: number;
  conversionRate: number;
}

interface CommissionData {
  totalToReceive: string;
  totalCPA: string;
  totalRecurring: string;
  contractsCount: number;
  cpaPercentage: string;
  recurringPercentage: string;
}

export default function SellerDashboard() {
  const [, setLocation] = useLocation();
  const { seller, isLoading: authLoading } = useSellerAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    totalSales: 0,
    cpaPercentage: 0,
    recurringPercentage: 0,
    clicks: 0,
    conversions: 0,
    conversionRate: 0
  });
  const [commissions, setCommissions] = useState<CommissionData>({
    totalToReceive: '0.00',
    totalCPA: '0.00',
    totalRecurring: '0.00',
    contractsCount: 0,
    cpaPercentage: '0',
    recurringPercentage: '0'
  });

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
      fetchDashboardData();
    }
  };

  const fetchDashboardData = async () => {
    // Buscar dados do vendedor
    if (seller) {
      // Buscar estatísticas de analytics
      let analytics = { clicks: 0, conversions: 0, conversionRate: 0 };
      try {
        const response = await fetch(`/api/seller/analytics/${seller.id}`);
        if (response.ok) {
          analytics = await response.json();
        }
      } catch (error) {
        console.error("Erro ao buscar estatísticas:", error);
      }
      
      // Buscar dados de comissões
      let commissionsData = {
        totalToReceive: '0.00',
        totalCPA: '0.00',
        totalRecurring: '0.00',
        contractsCount: 0,
        cpaPercentage: seller.cpaPercentage || '0',
        recurringPercentage: seller.recurringCommissionPercentage || '0'
      };
      try {
        const response = await fetch(`/api/seller/commissions/${seller.id}`);
        if (response.ok) {
          commissionsData = await response.json();
        }
      } catch (error) {
        console.error("Erro ao buscar comissões:", error);
      }
      
      setCommissions(commissionsData);
      
      setStats({
        totalClients: 0, // TODO: Implementar busca de clientes do vendedor
        totalSales: commissionsData.contractsCount, // Use contracts count as total sales
        cpaPercentage: Number(seller.cpaPercentage) || 0,
        recurringPercentage: Number(seller.recurringCommissionPercentage) || 0,
        clicks: analytics.clicks,
        conversions: analytics.conversions,
        conversionRate: analytics.conversionRate
      });
    }
  };

  useEffect(() => {
    checkAuthentication();
  }, [authLoading, seller]);

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

  return (
    <SellerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground break-words">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Bem-vindo, {seller.fullName}</p>
          </div>
        </div>
        
        {/* Commission to Receive Card - Featured */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Valor a Receber</p>
              <p className="text-4xl font-bold text-gray-900 mt-2">
                R$ {parseFloat(commissions.totalToReceive).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <div className="mt-3 space-y-1">
                <p className="text-xs text-gray-500">
                  CPA: R$ {parseFloat(commissions.totalCPA).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500">
                  Recorrente: R$ {parseFloat(commissions.totalRecurring).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#e8f4f4' }}>
              <DollarSign className="h-8 w-8" style={{ color: '#257273' }} />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4 border-t pt-3">
            Baseado em {commissions.contractsCount} {commissions.contractsCount === 1 ? 'venda realizada' : 'vendas realizadas'}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Comissão CPA</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.cpaPercentage}%</p>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: '#e8f4f4' }}>
                <DollarSign className="h-6 w-6" style={{ color: '#257273' }} />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">Por nova venda realizada</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Comissão Recorrente</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.recurringPercentage}%</p>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: '#e8f4f4' }}>
                <DollarSign className="h-6 w-6" style={{ color: '#257273' }} />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">Das mensalidades dos clientes</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Clientes Ativos</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalClients}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: '#e8f4f4' }}>
                <Users className="h-6 w-6" style={{ color: '#257273' }} />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">Total de clientes ativos</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Vendas</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalSales}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: '#e8f4f4' }}>
                <DollarSign className="h-6 w-6" style={{ color: '#257273' }} />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">Vendas realizadas</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cliques no link</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.clicks}</p>
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
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.conversions}</p>
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
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.conversionRate.toFixed(1)}%</p>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: '#e8f4f4' }}>
                <DollarSign className="h-6 w-6" style={{ color: '#257273' }} />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">Eficiência de vendas</p>
          </div>
        </div>
      </div>
    </SellerLayout>
  );
}
