import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { ArrowUp, ArrowDown, DollarSign, Users, Filter } from "lucide-react";
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

interface MonthlyData {
  month: string;
  sales: number;
  cpaCommission: number;
  recurringCommission: number;
  totalCommission: number;
}

// Formatar valores para exibição
const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { 
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// KPI Card Component com novo design
const KPICard = ({ 
  title, 
  value, 
  subtitle,
  icon: Icon,
  trend,
  trendValue
}: any) => {
  const isPositive = trend === 'up';
  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 border border-gray-100">
      <div className="flex items-start justify-between mb-4">
        <div className="p-2 rounded-lg bg-gradient-to-br from-teal-50 to-teal-100">
          {Icon && <Icon className="h-5 w-5 text-teal-600" />}
        </div>
        {trendValue && (
          <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            <span>{trendValue}%</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {subtitle && (
          <p className="text-xs text-gray-500 mt-2">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-100">
        <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs text-gray-600">
            <span style={{ color: entry.color }}>{entry.name}:</span> {
              entry.name.includes('Vendas') ? entry.value : formatCurrency(entry.value)
            }
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Cores para gráficos
const CHART_COLORS = {
  primary: '#257273',
  secondary: '#277677',
  accent: '#3498db',
  success: '#10b981',
  warning: '#f59e0b',
  info: '#3b82f6'
};

export default function SellerDashboard() {
  const [, setLocation] = useLocation();
  const { seller, isLoading: authLoading } = useSellerAuth();
  const [loading, setLoading] = useState(true);
  const [monthlyHistory, setMonthlyHistory] = useState<MonthlyData[]>([]);
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
      // Fetch analytics
      let analytics = { clicks: 0, conversions: 0, conversionRate: 0 };
      try {
        const response = await fetch(`/api/seller/analytics/${seller.id}`);
        if (response.ok) {
          analytics = await response.json();
        }
      } catch (error) {
        console.error("Erro ao buscar estatísticas:", error);
      }
      
      // Fetch commissions
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

      // Fetch total paid
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
      
      // Fetch monthly history
      try {
        const response = await fetch(`/api/seller/history/${seller.id}`);
        if (response.ok) {
          const historyData = await response.json();
          // Format month names for display
          const formattedHistory = historyData.map((item: MonthlyData) => {
            const parts = item.month.split('-');
            const year = parts[0] || '00';
            const month = parts[1] || '01';
            const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            return {
              ...item,
              displayMonth: `${monthNames[parseInt(month) - 1]}/${year.slice(2)}`
            };
          });
          setMonthlyHistory(formattedHistory);
        }
      } catch (error) {
        console.error("Erro ao buscar histórico:", error);
      }
      
      setCommissions(commissionsData);
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

  // Calcular valores pendentes
  const totalToReceive = typeof commissions.totalToReceive === 'string' 
    ? parseFloat(commissions.totalToReceive) || 0 
    : commissions.totalToReceive || 0;
  
  const totalPaid = typeof commissions.totalPaid === 'number' 
    ? commissions.totalPaid 
    : parseFloat(String(commissions.totalPaid || 0)) || 0;
  
  const valorPendente = totalToReceive - totalPaid;

  // Dados para o gráfico de pizza
  const pieData = [
    { name: 'CPA', value: parseFloat(commissions.totalCPA) || 0, color: CHART_COLORS.primary },
    { name: 'Recorrente', value: parseFloat(commissions.totalRecurring) || 0, color: CHART_COLORS.secondary }
  ];

  // Calcular tendências (mock por enquanto - você pode implementar lógica real comparando com período anterior)
  const salesTrend = monthlyHistory.length > 1 
    ? ((monthlyHistory[monthlyHistory.length - 1]?.sales || 0) - (monthlyHistory[monthlyHistory.length - 2]?.sales || 0)) * 100 / (monthlyHistory[monthlyHistory.length - 2]?.sales || 1)
    : 0;

  return (
    <SellerLayout>
      <div className="space-y-6 p-2 md:p-0">
        {/* Header com título da página */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard de Vendas</h1>
          <p className="text-gray-600 mt-1">Acompanhe seu desempenho e comissões</p>
        </div>

        {/* KPIs principais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard
            title="Total de Vendas"
            value={formatCurrency(totalToReceive)}
            subtitle="Total acumulado"
            icon={DollarSign}
            trend={totalToReceive > 0 ? 'up' : 'down'}
            trendValue={Math.abs(salesTrend).toFixed(1)}
          />
          <KPICard
            title="Total de Custos"
            value={formatCurrency(totalPaid)}
            subtitle="Total pago"
            icon={DollarSign}
          />
          <KPICard
            title="Resultado"
            value={formatCurrency(valorPendente)}
            subtitle={`Lucro/Prejuízo`}
            icon={DollarSign}
            trend={valorPendente > 0 ? 'up' : 'down'}
          />
          <KPICard
            title="Número de Pedidos"
            value={stats.totalSales}
            subtitle="Total de vendas"
            icon={Users}
          />
          <KPICard
            title="Taxa de Conversão"
            value={`${stats.conversionRate.toFixed(1)}%`}
            subtitle={`${stats.conversions} de ${stats.clicks}`}
            icon={Filter}
          />
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Vendas x Meta */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Realizado x Meta</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.accent }}></div>
                  <span className="text-sm text-gray-600">Total Vendas</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="displayMonth" 
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="sales" 
                  fill={CHART_COLORS.accent}
                  name="Vendas"
                  radius={[8, 8, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke={CHART_COLORS.warning}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS.warning, r: 4 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de Comissões ao longo do tempo */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Evolução das Comissões</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.primary }}></div>
                  <span className="text-sm text-gray-600">CPA</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.secondary }}></div>
                  <span className="text-sm text-gray-600">Recorrente</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyHistory}>
                <defs>
                  <linearGradient id="colorCPA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorRecurring" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.secondary} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={CHART_COLORS.secondary} stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="displayMonth" 
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                  tickFormatter={(value) => `R$ ${value}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="cpaCommission" 
                  stroke={CHART_COLORS.primary}
                  fillOpacity={1} 
                  fill="url(#colorCPA)"
                  name="Comissão CPA"
                />
                <Area 
                  type="monotone" 
                  dataKey="recurringCommission" 
                  stroke={CHART_COLORS.secondary}
                  fillOpacity={1} 
                  fill="url(#colorRecurring)"
                  name="Comissão Recorrente"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Segunda linha de gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Distribuição de Comissões (Pizza) */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Distribuição de Comissões</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2 mt-4">
              {pieData.map((entry, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                    <span className="text-sm text-gray-600">{entry.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(entry.value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Vendas por Categoria em R$ */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Vendas por Categoria em R$</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">Comissão CPA</span>
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(parseFloat(commissions.totalCPA) || 0)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-500" 
                    style={{
                      width: `${(parseFloat(commissions.totalCPA) / (totalToReceive || 1)) * 100}%`,
                      backgroundColor: CHART_COLORS.primary
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">Comissão Recorrente</span>
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(parseFloat(commissions.totalRecurring) || 0)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-500" 
                    style={{
                      width: `${(parseFloat(commissions.totalRecurring) / (totalToReceive || 1)) * 100}%`,
                      backgroundColor: CHART_COLORS.secondary
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">Valor Pendente</span>
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(valorPendente)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-500" 
                    style={{
                      width: `${(valorPendente / (totalToReceive || 1)) * 100}%`,
                      backgroundColor: CHART_COLORS.warning
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Vendas por Categoria em % */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Vendas por Categoria em %</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">Comissão CPA</span>
                  <span className="text-sm font-semibold text-gray-900">{stats.cpaPercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-500" 
                    style={{
                      width: `${stats.cpaPercentage}%`,
                      backgroundColor: CHART_COLORS.primary
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">Comissão Recorrente</span>
                  <span className="text-sm font-semibold text-gray-900">{stats.recurringPercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-500" 
                    style={{
                      width: `${stats.recurringPercentage}%`,
                      backgroundColor: CHART_COLORS.secondary
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">Taxa de Conversão</span>
                  <span className="text-sm font-semibold text-gray-900">{stats.conversionRate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-500" 
                    style={{
                      width: `${stats.conversionRate}%`,
                      backgroundColor: CHART_COLORS.info
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SellerLayout>
  );
}