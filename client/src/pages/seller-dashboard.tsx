import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import SellerLayout from "@/components/seller/SellerLayout";
import { DollarSign, Check, Link as LinkIcon, ArrowUpRight } from "lucide-react";
import LoadingDots from "@/components/ui/LoadingDots";
import { useSellerAuth } from "@/contexts/SellerAuthContext";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

  // Dados para gráfico de comissões
  const commissionChartData = [
    { 
      name: 'CPA', 
      valor: parseFloat(commissions.totalCPA),
      fill: '#257273'
    },
    { 
      name: 'Recorrente', 
      valor: parseFloat(commissions.totalRecurring),
      fill: '#3b9899'
    }
  ];

  // Dados para gráfico de funil de conversão
  const funnelData = [
    { name: 'Cliques', valor: stats.clicks, fill: '#e8f4f4' },
    { name: 'Conversões', valor: stats.conversions, fill: '#257273' }
  ];


  // Dados para gráfico de pizza
  const pieData = [
    { name: 'CPA', value: parseFloat(commissions.totalCPA), color: '#257273' },
    { name: 'Recorrente', value: parseFloat(commissions.totalRecurring), color: '#3b9899' }
  ];

  const totalCommission = parseFloat(commissions.totalCPA) + parseFloat(commissions.totalRecurring);

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
        
        {/* Commission Cards - Featured */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Valor Recebido</p>
                <p className="text-4xl font-bold text-green-600 mt-2">
                  R$ {(commissions.totalPaid || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <div className="mt-3 space-y-1">
                  <p className="text-xs text-green-600">
                    Total de pagamentos já recebidos
                  </p>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-green-50">
                <Check className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4 border-t pt-3">
              Pagamentos processados pela administração
            </p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Comissões */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Composição de Comissões</h3>
              <p className="text-sm text-gray-500">Distribuição por tipo de comissão</p>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={commissionChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Bar dataKey="valor" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de Pizza */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Proporção de Comissões</h3>
              <p className="text-sm text-gray-500">Total: R$ {totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de Funil de Conversão */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Funil de Conversão</h3>
              <p className="text-sm text-gray-500">Do clique à venda</p>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={funnelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" stroke="#6b7280" />
                <YAxis dataKey="name" type="category" stroke="#6b7280" width={100} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Bar dataKey="valor" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Indicador de Performance */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Taxa de Conversão</h3>
              <p className="text-sm text-gray-500">Eficiência de vendas</p>
            </div>
            <div className="flex items-center justify-center h-[250px]">
              <div className="text-center">
                <div className="relative inline-flex items-center justify-center">
                  <svg className="w-40 h-40 transform -rotate-90">
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="#e8f4f4"
                      strokeWidth="12"
                      fill="none"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="#257273"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 70}`}
                      strokeDashoffset={`${2 * Math.PI * 70 * (1 - stats.conversionRate / 100)}`}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                    />
                  </svg>
                  <div className="absolute">
                    <p className="text-4xl font-bold" style={{ color: '#257273' }}>
                      {stats.conversionRate.toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Conversão</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  {stats.conversions} vendas de {stats.clicks} cliques
                </p>
              </div>
            </div>
          </div>
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
                <ArrowUpRight className="h-6 w-6" style={{ color: '#257273' }} />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">Das mensalidades dos clientes</p>
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
                <p className="text-sm font-medium text-gray-600">Cliques no Link</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.clicks}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: '#e8f4f4' }}>
                <LinkIcon className="h-6 w-6" style={{ color: '#257273' }} />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">Total de acessos ao link</p>
          </div>
        </div>
      </div>
    </SellerLayout>
  );
}
