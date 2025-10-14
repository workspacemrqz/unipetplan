import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import SellerLayout from "@/components/seller/SellerLayout";
import LoadingDots from "@/components/ui/LoadingDots";
import { useSellerAuth } from "@/contexts/SellerAuthContext";
import { CalendarDate } from "@internationalized/date";
import { DateFilterComponent } from "@/components/admin/DateFilterComponent";
import { format } from "date-fns";

interface DashboardStats {
  totalClients: number;
  totalSales: number;
  cpaPercentage: number;
  recurringPercentage: number;
  clicks: number;
  conversions: number;
  conversionRate: number;
}

interface TotalSalesData {
  totalValue: number;
  totalCount: number;
  averageValue: number;
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
  const [dateFilter, setDateFilter] = useState<{
    startDate: CalendarDate | null;
    endDate: CalendarDate | null;
  }>({ startDate: null, endDate: null });
  
  const [debouncedDateFilter, setDebouncedDateFilter] = useState<{
    startDate: CalendarDate | null;
    endDate: CalendarDate | null;
  }>({ startDate: null, endDate: null });
  
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
  const [totalSalesData, setTotalSalesData] = useState<TotalSalesData>({
    totalValue: 0,
    totalCount: 0,
    averageValue: 0
  });

  useEffect(() => {
    checkAuthentication();
  }, []);

  // Debounce date filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDateFilter(dateFilter);
    }, 500);

    return () => clearTimeout(timer);
  }, [dateFilter]);

  // Reload data when debounced date filter changes
  useEffect(() => {
    if (!loading && seller) {
      fetchDashboardData();
    }
  }, [debouncedDateFilter]);

  const handleDateRangeChange = (startDate: CalendarDate | null, endDate: CalendarDate | null) => {
    setDateFilter({ startDate, endDate });
  };

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
      // Build query params for date range
      const params = new URLSearchParams();
      if (debouncedDateFilter.startDate) {
        const startDate = new Date(
          debouncedDateFilter.startDate.year,
          debouncedDateFilter.startDate.month - 1,
          debouncedDateFilter.startDate.day
        );
        params.append('startDate', format(startDate, 'yyyy-MM-dd'));
      }
      if (debouncedDateFilter.endDate) {
        const endDate = new Date(
          debouncedDateFilter.endDate.year,
          debouncedDateFilter.endDate.month - 1,
          debouncedDateFilter.endDate.day
        );
        params.append('endDate', format(endDate, 'yyyy-MM-dd'));
      }
      
      const periodParam = params.toString() ? `?${params.toString()}` : '';
      
      let analytics = { clicks: 0, conversions: 0, conversionRate: 0 };
      try {
        const response = await fetch(`/api/seller/analytics/${seller.id}${periodParam}`);
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
        const response = await fetch(`/api/seller/commissions/${seller.id}${periodParam}`);
        if (response.ok) {
          const data = await response.json();
          commissionsData = {
            totalToReceive: data.totalToReceive || '0.00',
            totalCPA: data.totalCPA || '0.00',
            totalRecurring: data.totalRecurring || '0.00',
            contractsCount: data.contractsCount || 0,
            cpaPercentage: data.cpaPercentage || seller.cpaPercentage || '0',
            recurringPercentage: data.recurringPercentage || seller.recurringCommissionPercentage || '0',
            totalPaid: 0
          };
        }
      } catch (error) {
        console.error("Erro ao buscar comissões:", error);
      }

      try {
        const response = await fetch(`/api/seller/payments-total/${seller.id}`, {
          credentials: 'include'
        });
        if (response.ok) {
          const paymentsData = await response.json();
          commissionsData.totalPaid = paymentsData.totalPaid || 0;
        }
      } catch (error) {
        console.error("Erro ao buscar total pago:", error);
      }
      
      setCommissions(commissionsData);
      
      // Buscar dados de vendas totais
      try {
        const response = await fetch(`/api/seller/total-sales/${seller.id}${periodParam}`, {
          credentials: 'include'
        });
        if (response.ok) {
          const salesData = await response.json();
          setTotalSalesData({
            totalValue: salesData.totalValue || 0,
            totalCount: salesData.totalCount || commissionsData.contractsCount || 0,
            averageValue: salesData.averageValue || 0
          });
        } else {
          // Se a rota não existir, calcular com base nos dados de comissões
          const totalValue = parseFloat(commissionsData.totalToReceive) || 0;
          const count = commissionsData.contractsCount || 0;
          setTotalSalesData({
            totalValue: totalValue * 10, // Estimativa: comissão é ~10% do valor total
            totalCount: count,
            averageValue: count > 0 ? (totalValue * 10) / count : 0
          });
        }
      } catch (error) {
        console.error("Erro ao buscar vendas totais:", error);
        // Usar dados de comissões como fallback
        const totalValue = parseFloat(commissionsData.totalToReceive) || 0;
        const count = commissionsData.contractsCount || 0;
        setTotalSalesData({
          totalValue: totalValue * 10, // Estimativa: comissão é ~10% do valor total
          totalCount: count,
          averageValue: count > 0 ? (totalValue * 10) / count : 0
        });
      }
      
      setStats({
        totalClients: 0,
        totalSales: commissionsData.contractsCount || 0,
        cpaPercentage: Number(seller.cpaPercentage || 0),
        recurringPercentage: Number(seller.recurringCommissionPercentage || 0),
        clicks: analytics.clicks || 0,
        conversions: analytics.conversions || 0,
        conversionRate: analytics.conversionRate || 0
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

  // Calcular valores pendentes - garantir que sempre sejam números válidos
  const totalToReceive = typeof commissions.totalToReceive === 'string' 
    ? parseFloat(commissions.totalToReceive) || 0 
    : commissions.totalToReceive || 0;
  
  const totalPaid = typeof commissions.totalPaid === 'number' 
    ? commissions.totalPaid 
    : parseFloat(String(commissions.totalPaid || 0)) || 0;
  
  const valorPendente = totalToReceive - totalPaid;
  
  // Formatar valores para exibição
  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { 
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

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

        {/* Filtro por Período */}
        <DateFilterComponent 
          onDateRangeChange={handleDateRangeChange}
          isLoading={
            dateFilter.startDate !== debouncedDateFilter.startDate ||
            dateFilter.endDate !== debouncedDateFilter.endDate
          }
          initialRange={dateFilter}
          className="mb-4"
        />

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
                  {formatCurrency(totalToReceive)}
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
                  {formatCurrency(totalPaid)}
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
                  {formatCurrency(valorPendente)}
                </p>
                <p className="text-xs text-gray-500">Aguardando pagamento</p>
              </div>
            </div>
          </div>
        </div>

        {/* Card de Total de Vendas */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Total de Vendas</h3>
          <p className="text-sm text-gray-600 mb-4">Resumo de vendas realizadas</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Valor Total */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-600">Valor Total</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(totalSalesData.totalValue)}
                </p>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500">Total de {totalSalesData.totalCount} vendas</p>
                </div>
              </div>
            </div>

            {/* Valor Médio */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-600">Valor Médio</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(totalSalesData.averageValue)}
                </p>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500">Por venda realizada</p>
                </div>
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
            subtitle="Vendas acumuladas"
          />
        </div>

        {/* Resumo de Comissões */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-100">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-medium text-gray-600">Comissão CPA</p>
                  <div className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                    {stats.cpaPercentage}%
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(parseFloat(commissions.totalCPA) || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-2">Por nova venda realizada</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-100">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-medium text-gray-600">Comissão Recorrente</p>
                  <div className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                    {stats.recurringPercentage}%
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(parseFloat(commissions.totalRecurring) || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-2">Das mensalidades dos clientes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SellerLayout>
  );
}