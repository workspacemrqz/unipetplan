import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import SellerLayout from "@/components/seller/SellerLayout";
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
  totalPaid?: number;
}

// KPI Card Component
const KPICard = ({ 
  title, 
  value, 
  subtitle
}: any) => {
  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-100">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-sm font-medium text-gray-600">{title}</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-2">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
};

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
    if (seller) {
      let analytics = { clicks: 0, conversions: 0, conversionRate: 0 };
      try {
        const response = await fetch(`/api/seller/analytics/${seller.id}`);
        if (response.ok) {
          analytics = await response.json();
        }
      } catch (error) {
        console.error("Erro ao buscar estatísticas:", error);
      }
      
      let commissionsData = {
        totalToReceive: '0.00',
        totalCPA: '0.00',
        totalRecurring: '0.00',
        contractsCount: 0,
        cpaPercentage: seller.cpaPercentage || '0',
        recurringPercentage: seller.recurringCommissionPercentage || '0',
        totalPaid: 0
      };
      try {
        const response = await fetch(`/api/seller/commissions/${seller.id}`);
        if (response.ok) {
          commissionsData = await response.json();
        }
      } catch (error) {
        console.error("Erro ao buscar comissões:", error);
      }

      try {
        const response = await fetch(`/api/seller/payments-total/${seller.id}`);
        if (response.ok) {
          const paymentsData = await response.json();
          commissionsData.totalPaid = paymentsData.totalPaid || 0;
        }
      } catch (error) {
        console.error("Erro ao buscar total pago:", error);
      }
      
      setCommissions(commissionsData);
      
      setStats({
        totalClients: 0,
        totalSales: commissionsData.contractsCount,
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <LoadingDots size="lg" color="#257273" className="mb-4" />
          <p className="text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (!seller) {
    return null;
  }

  // Calcular valores pendentes
  const valorPendente = parseFloat(commissions.totalToReceive) - (commissions.totalPaid || 0);

  return (
    <SellerLayout>
      <div className="space-y-6 p-2 md:p-0">
        {/* Header com Welcome */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl p-6 text-white shadow-lg">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: '#060606' }}>
              Olá, {seller.fullName}! 👋
            </h1>
            <p style={{ color: '#060606' }}>
              Acompanhe seu desempenho e comissões em tempo real
            </p>
          </div>
        </div>

        {/* Dashboard de Pagamentos */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumo Financeiro</h3>
          
          {/* Valores principais */}
          <div className="space-y-6">
            {/* Grid de valores */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Valor Total a Receber */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">Total a Receber</p>
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  R$ {parseFloat(commissions.totalToReceive).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500">{commissions.contractsCount} vendas realizadas</p>
              </div>

              {/* Valor Recebido */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">Valor Recebido</p>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  R$ {(commissions.totalPaid || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500">Pagamentos processados</p>
              </div>

              {/* Valor Pendente */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">Valor Pendente</p>
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                </div>
                <p className="text-2xl font-bold text-orange-600">
                  R$ {valorPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500">Aguardando pagamento</p>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards Grid - Métricas de Performance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <KPICard
            title="Taxa de Conversão"
            value={`${stats.conversionRate.toFixed(1)}%`}
            subtitle={`${stats.conversions} de ${stats.clicks} cliques`}
          />
          
          <KPICard
            title="Total de Vendas"
            value={stats.totalSales}
            subtitle="Vendas este mês"
          />
        </div>

        {/* Resumo de Comissões */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-6 border border-teal-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-teal-900">Comissão CPA</h4>
              <div className="px-3 py-1 rounded-full text-sm font-bold text-white" style={{ backgroundColor: '#277677' }}>
                {stats.cpaPercentage}%
              </div>
            </div>
            <p className="text-2xl font-bold text-teal-900">
              R$ {parseFloat(commissions.totalCPA).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-teal-700 mt-2">Por nova venda realizada</p>
          </div>

          <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-6 border border-teal-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-teal-900">Comissão Recorrente</h4>
              <div className="px-3 py-1 rounded-full text-sm font-bold text-white" style={{ backgroundColor: '#277677' }}>
                {stats.recurringPercentage}%
              </div>
            </div>
            <p className="text-2xl font-bold text-teal-900">
              R$ {parseFloat(commissions.totalRecurring).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-teal-700 mt-2">Das mensalidades dos clientes</p>
          </div>
        </div>
      </div>
    </SellerLayout>
  );
}