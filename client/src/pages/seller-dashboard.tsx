import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import SellerLayout from "@/components/seller/SellerLayout";
import { 
  ChevronUp as TrendingUp, 
  ChevronDown as TrendingDown, 
  DollarSign,
  Copy as MousePointerClick,
  Check as Target,
  Star as Activity,
  ArrowDown,
  Star as Award,
  FileText as BarChart3,
  CreditCard as Wallet,
  DollarSign as CircleDollarSign
} from "lucide-react";
import LoadingDots from "@/components/ui/LoadingDots";
import { useSellerAuth } from "@/contexts/SellerAuthContext";
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar,
  Line,
  PieChart, 
  Pie, 
  Cell, 
  RadialBarChart,
  RadialBar,
  ComposedChart,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

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

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {
              typeof entry.value === 'number' && entry.name.includes('R$')
                ? `R$ ${entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                : entry.value
            }
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// KPI Card Component
const KPICard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendValue, 
  color = '#257273',
  bgColor = '#e8f4f4'
}: any) => {
  const isPositiveTrend = trend === 'up';
  const TrendIcon = isPositiveTrend ? TrendingUp : trend === 'down' ? TrendingDown : null;
  
  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-100">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            {TrendIcon && trendValue && (
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                isPositiveTrend ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
              }`}>
                <TrendIcon className="h-3 w-3" />
                <span>{trendValue}</span>
              </div>
            )}
          </div>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-2">{subtitle}</p>
          )}
        </div>
        <div 
          className="p-3 rounded-xl"
          style={{ backgroundColor: bgColor }}
        >
          <Icon className="h-6 w-6" style={{ color }} />
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

  // Dados para gráfico de área com evolução mensal simulada
  const monthlyData = [
    { month: 'Jan', cpa: 1200, recorrente: 800, total: 2000 },
    { month: 'Fev', cpa: 1400, recorrente: 950, total: 2350 },
    { month: 'Mar', cpa: 1100, recorrente: 1100, total: 2200 },
    { month: 'Abr', cpa: 1600, recorrente: 1200, total: 2800 },
    { month: 'Mai', cpa: 1800, recorrente: 1400, total: 3200 },
    { month: 'Jun', cpa: parseFloat(commissions.totalCPA), recorrente: parseFloat(commissions.totalRecurring), total: parseFloat(commissions.totalCPA) + parseFloat(commissions.totalRecurring) }
  ];

  // Dados para funil de conversão moderno
  const funnelData = [
    { 
      name: 'Cliques', 
      value: stats.clicks, 
      percentage: 100,
      color: '#e8f4f4',
      icon: '👆'
    },
    { 
      name: 'Engajamento', 
      value: Math.floor(stats.clicks * 0.4), 
      percentage: 40,
      color: '#a7d5d6',
      icon: '💫'
    },
    { 
      name: 'Interesse', 
      value: Math.floor(stats.clicks * 0.15), 
      percentage: 15,
      color: '#5fafb0',
      icon: '⭐'
    },
    { 
      name: 'Conversões', 
      value: stats.conversions, 
      percentage: stats.conversionRate,
      color: '#257273',
      icon: '✅'
    }
  ];

  // Dados para gráfico radial
  const conversionRadialData = [
    {
      name: 'Taxa',
      value: stats.conversionRate,
      fill: '#257273',
    }
  ];

  // Dados de performance
  const performanceData = [
    { metric: 'Cliques', atual: stats.clicks, meta: Math.floor(stats.clicks * 1.5) },
    { metric: 'Conversões', atual: stats.conversions, meta: Math.floor(stats.conversions * 1.8) },
    { metric: 'Vendas', atual: stats.totalSales, meta: Math.floor(stats.totalSales * 1.3) }
  ];

  // Dados para distribuição de comissões
  const commissionDistribution = [
    { name: 'CPA', value: parseFloat(commissions.totalCPA), percentage: 0 },
    { name: 'Recorrente', value: parseFloat(commissions.totalRecurring), percentage: 0 }
  ];

  const totalCommission = parseFloat(commissions.totalCPA) + parseFloat(commissions.totalRecurring);
  if (totalCommission > 0 && commissionDistribution[0] && commissionDistribution[1]) {
    commissionDistribution[0].percentage = (parseFloat(commissions.totalCPA) / totalCommission) * 100;
    commissionDistribution[1].percentage = (parseFloat(commissions.totalRecurring) / totalCommission) * 100;
  }

  // Calcular valores pendentes
  const valorPendente = parseFloat(commissions.totalToReceive) - (commissions.totalPaid || 0);

  return (
    <SellerLayout>
      <div className="space-y-6 p-2 md:p-0">
        {/* Header com Welcome */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl p-6 text-white shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">
                Olá, {seller.fullName}! 👋
              </h1>
              <p className="text-teal-100">
                Acompanhe seu desempenho e comissões em tempo real
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm text-teal-100">Saldo Total</p>
                <p className="text-2xl md:text-3xl font-bold">
                  R$ {parseFloat(commissions.totalToReceive).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl">
                <Wallet className="h-8 w-8" />
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Valor a Receber"
            value={`R$ ${parseFloat(commissions.totalToReceive).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            subtitle={`${commissions.contractsCount} vendas realizadas`}
            icon={DollarSign}
            trend="up"
            trendValue="+12.5%"
            color="#257273"
            bgColor="#e8f4f4"
          />
          
          <KPICard
            title="Valor Recebido"
            value={`R$ ${(commissions.totalPaid || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            subtitle="Pagamentos processados"
            icon={CircleDollarSign}
            color="#16a34a"
            bgColor="#dcfce7"
          />
          
          <KPICard
            title="Taxa de Conversão"
            value={`${stats.conversionRate.toFixed(1)}%`}
            subtitle={`${stats.conversions} de ${stats.clicks} cliques`}
            icon={Target}
            trend={stats.conversionRate > 5 ? "up" : "down"}
            trendValue={stats.conversionRate > 5 ? "+2.3%" : "-1.2%"}
            color="#0891b2"
            bgColor="#e0f2fe"
          />
          
          <KPICard
            title="Total de Vendas"
            value={stats.totalSales}
            subtitle="Vendas este mês"
            icon={BarChart3}
            trend="up"
            trendValue="+8 vendas"
            color="#7c3aed"
            bgColor="#f3e8ff"
          />
        </div>

        {/* Main Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gráfico de Área - Evolução das Comissões */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Evolução das Comissões</h3>
              <p className="text-sm text-gray-500">Acompanhamento mensal de ganhos</p>
            </div>
            {totalCommission > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorCPA" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#257273" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#257273" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorRecorrente" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b9899" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b9899" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="cpa"
                    stackId="1"
                    stroke="#257273"
                    fill="url(#colorCPA)"
                    name="CPA"
                  />
                  <Area
                    type="monotone"
                    dataKey="recorrente"
                    stackId="1"
                    stroke="#3b9899"
                    fill="url(#colorRecorrente)"
                    name="Recorrente"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-400">
                <div className="text-center">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Nenhuma comissão registrada ainda</p>
                </div>
              </div>
            )}
          </div>

          {/* Distribuição de Comissões - Donut Chart */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Distribuição</h3>
              <p className="text-sm text-gray-500">Por tipo de comissão</p>
            </div>
            {totalCommission > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={commissionDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#257273" />
                      <Cell fill="#3b9899" />
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3 mt-4">
                  {commissionDistribution.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: index === 0 ? '#257273' : '#3b9899' }}
                        />
                        <span className="text-sm text-gray-600">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.percentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-400">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Sem dados disponíveis</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Funil de Conversão Moderno */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Funil de Conversão</h3>
            <p className="text-sm text-gray-500">Jornada do cliente desde o clique até a venda</p>
          </div>
          {stats.clicks > 0 ? (
            <div className="space-y-4">
              {funnelData.map((stage, index) => (
                <div key={stage.name} className="relative">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">{stage.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">{stage.name}</span>
                        <span className="text-sm text-gray-600">{stage.value} ({stage.percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000 ease-out"
                          style={{
                            width: `${stage.percentage}%`,
                            backgroundColor: stage.color,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  {index < funnelData.length - 1 && (
                    <div className="ml-10 my-2">
                      <ArrowDown className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-gray-400">
              <div className="text-center">
                <MousePointerClick className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Compartilhe seu link para começar a rastrear conversões</p>
              </div>
            </div>
          )}
        </div>

        {/* Performance vs Meta */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Performance */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Performance vs Meta</h3>
              <p className="text-sm text-gray-500">Compare seu desempenho com as metas</p>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="metric" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="atual" fill="#257273" name="Atual" radius={[8, 8, 0, 0]} />
                <Line type="monotone" dataKey="meta" stroke="#ef4444" name="Meta" strokeWidth={2} strokeDasharray="5 5" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Taxa de Conversão Radial */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Taxa de Conversão</h3>
              <p className="text-sm text-gray-500">Eficiência das suas vendas</p>
            </div>
            <div className="relative">
              <ResponsiveContainer width="100%" height={250}>
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="90%"
                  data={conversionRadialData}
                  startAngle={90}
                  endAngle={-270}
                >
                  <RadialBar
                    dataKey="value"
                    cornerRadius={10}
                    fill="#257273"
                    background={{ fill: '#f3f4f6' }}
                  />
                  <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-3xl font-bold fill-gray-900"
                  >
                    {stats.conversionRate.toFixed(1)}%
                  </text>
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="text-center mt-2">
                <p className="text-sm text-gray-600">
                  {stats.conversions} vendas de {stats.clicks} cliques
                </p>
                {stats.conversionRate > 5 ? (
                  <div className="flex items-center justify-center gap-1 mt-2 text-green-600">
                    <Award className="h-4 w-4" />
                    <span className="text-sm font-medium">Excelente performance!</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1 mt-2 text-amber-600">
                    <Target className="h-4 w-4" />
                    <span className="text-sm font-medium">Continue melhorando</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Resumo de Comissões */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-6 border border-teal-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-teal-900">Comissão CPA</h4>
              <div className="bg-teal-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                {stats.cpaPercentage}%
              </div>
            </div>
            <p className="text-2xl font-bold text-teal-900">
              R$ {parseFloat(commissions.totalCPA).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-teal-700 mt-2">Por nova venda realizada</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-blue-900">Comissão Recorrente</h4>
              <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                {stats.recurringPercentage}%
              </div>
            </div>
            <p className="text-2xl font-bold text-blue-900">
              R$ {parseFloat(commissions.totalRecurring).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-blue-700 mt-2">Das mensalidades dos clientes</p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-6 border border-amber-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-amber-900">Valor Pendente</h4>
              <Activity className="h-5 w-5 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-amber-900">
              R$ {valorPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-amber-700 mt-2">Aguardando pagamento</p>
          </div>
        </div>
      </div>
    </SellerLayout>
  );
}