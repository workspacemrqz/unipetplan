import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import UnitLayout from '@/components/unit/UnitLayout';
import LoadingDots from '@/components/ui/LoadingDots';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDate } from "@internationalized/date";
import { DateFilterComponent } from "@/components/admin/DateFilterComponent";
import { format } from "date-fns";

interface DashboardStats {
  totalGuides: number;
  totalClients: number;
  totalPets: number;
  totalProcedures: number;
}

interface ProceduresSoldData {
  name: string;
  count: number;
}

interface ValueByUserData {
  name: string;
  value: number;
}

interface TotalSalesData {
  totalValue: number;
  totalCount: number;
  averageValue: number;
}

export default function UnitDashboard() {
  const { slug } = useParams();
  const [, setLocation] = useLocation();
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
    totalGuides: 0,
    totalClients: 0,
    totalPets: 0,
    totalProcedures: 0
  });
  const [proceduresSold, setProceduresSold] = useState<ProceduresSoldData[]>([]);
  const [valueByUser, setValueByUser] = useState<ValueByUserData[]>([]);
  const [totalSales, setTotalSales] = useState<TotalSalesData>({
    totalValue: 0,
    totalCount: 0,
    averageValue: 0
  });

  useEffect(() => {
    checkAuthentication();
  }, [slug]);

  // Auto-refresh dos gráficos a cada 30 segundos
  useEffect(() => {
    if (!loading) {
      const interval = setInterval(() => {
        fetchChartData();
      }, 30000); // 30 segundos

      return () => clearInterval(interval);
    }
    return undefined;
  }, [loading, slug, debouncedDateFilter]);

  // Debounce date filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDateFilter(dateFilter);
    }, 500);

    return () => clearTimeout(timer);
  }, [dateFilter]);

  // Recarregar todos os dados quando o filtro de período mudar
  useEffect(() => {
    if (!loading) {
      fetchDashboardData();
    }
  }, [debouncedDateFilter]);

  const handleDateRangeChange = (startDate: CalendarDate | null, endDate: CalendarDate | null) => {
    setDateFilter({ startDate, endDate });
  };

  const checkAuthentication = async () => {
    const token = localStorage.getItem('unit-token');
    const unitSlug = localStorage.getItem('unit-slug');
    
    if (!token || unitSlug !== slug) {
      setLocation(`/unidade/${slug}`);
      return;
    }
    
    setLoading(false);
    fetchDashboardData();
  };

  const fetchDashboardData = async () => {
    const token = localStorage.getItem('unit-token');
    
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
    
    // Buscar TODOS os dados em paralelo
    try {
      const [statsResponse, proceduresResponse, proceduresSoldResponse, valueByUserResponse, totalSalesResponse] = await Promise.all([
        fetch(`/api/units/${slug}/dashboard-stats${periodParam}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/unit/${slug}/procedures`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/units/${slug}/charts/procedures-sold${periodParam}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/units/${slug}/charts/value-by-user${periodParam}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/units/${slug}/charts/total-sales${periodParam}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      // Processar todas as respostas
      const newStats = { ...stats };

      if (statsResponse.ok) {
        const dashboardStats = await statsResponse.json();
        newStats.totalGuides = dashboardStats.totalAtendimentos || 0;
        newStats.totalClients = dashboardStats.uniqueClients || 0;
        newStats.totalPets = dashboardStats.uniquePets || 0;
      }

      if (proceduresResponse.ok) {
        const proceduresData = await proceduresResponse.json();
        newStats.totalProcedures = proceduresData.length || 0;
      }

      if (proceduresSoldResponse.ok) {
        const data = await proceduresSoldResponse.json();
        console.log('📊 Procedimentos vendidos recebidos:', data);
        setProceduresSold(data);
      }

      if (valueByUserResponse.ok) {
        const data = await valueByUserResponse.json();
        console.log('💰 Valor por usuário recebido:', data);
        setValueByUser(data);
      }

      if (totalSalesResponse.ok) {
        const data = await totalSalesResponse.json();
        console.log('💵 Total de vendas recebido:', data);
        setTotalSales(data);
      }

      // Atualizar todos os estados de uma vez
      setStats(newStats);
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
    }
  };

  const fetchChartData = async () => {
    const token = localStorage.getItem('unit-token');
    
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
    
    // Buscar todos os gráficos em paralelo
    try {
      const [proceduresSoldResponse, valueByUserResponse, totalSalesResponse] = await Promise.all([
        fetch(`/api/units/${slug}/charts/procedures-sold${periodParam}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/units/${slug}/charts/value-by-user${periodParam}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/units/${slug}/charts/total-sales${periodParam}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (proceduresSoldResponse.ok) {
        const data = await proceduresSoldResponse.json();
        console.log('📊 Procedimentos vendidos recebidos:', data);
        setProceduresSold(data);
      }

      if (valueByUserResponse.ok) {
        const data = await valueByUserResponse.json();
        console.log('💰 Valor por usuário recebido:', data);
        setValueByUser(data);
      }

      if (totalSalesResponse.ok) {
        const data = await totalSalesResponse.json();
        console.log('💵 Total de vendas recebido:', data);
        setTotalSales(data);
      }
    } catch (error) {
      console.error('Erro ao buscar dados dos gráficos:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-cream-light)]">
        <div className="text-center">
          <LoadingDots size="lg" color="#0e7074" className="mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <UnitLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground break-words">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Visão geral da unidade</p>
          </div>
        </div>

        {/* Period Filter */}
        <DateFilterComponent 
          onDateRangeChange={handleDateRangeChange}
          isLoading={
            dateFilter.startDate !== debouncedDateFilter.startDate ||
            dateFilter.endDate !== debouncedDateFilter.endDate
          }
          initialRange={dateFilter}
          className="mb-4"
        />

        {/* Card de Total de Vendas */}
        <Card style={{ 
          background: 'linear-gradient(135deg, #0e7074 0%, #277677 100%)',
          border: 'none',
          boxShadow: '0 10px 40px rgba(14, 112, 116, 0.2)'
        }}>
          <CardHeader>
            <CardTitle className="text-white text-xl font-bold">Total de Vendas</CardTitle>
            <p className="text-white/80 text-sm">Resumo de recebimentos</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative overflow-hidden rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 p-6 transition-all hover:bg-white/15 cursor-default">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
                <div className="relative z-10">
                  <p className="text-sm font-semibold text-white/90 mb-2">Valor Total</p>
                  <p className="text-3xl font-bold text-white">
                    R$ {totalSales.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full w-3/4 bg-white/60 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 p-6 transition-all hover:bg-white/15 cursor-default">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
                <div className="relative z-10">
                  <p className="text-sm font-semibold text-white/90 mb-2">Valor Médio</p>
                  <p className="text-3xl font-bold text-white">
                    R$ {totalSales.averageValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full w-1/2 bg-white/60 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card style={{ 
            background: 'linear-gradient(135deg, #0e7074 0%, #277677 100%)',
            border: 'none',
            boxShadow: '0 10px 40px rgba(14, 112, 116, 0.2)'
          }}>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="relative overflow-hidden rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 p-4 transition-all hover:bg-white/15 cursor-default">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12"></div>
                <div className="relative z-10">
                  <p className="text-xs sm:text-sm text-white/90 font-semibold mb-2">Atendimentos</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white truncate">{stats.totalGuides}</p>
                  <div className="mt-3 pt-2 border-t border-white/20">
                    <p className="text-xs text-white/80">Total de atendimentos gerados</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card style={{ 
            background: 'linear-gradient(135deg, #0e7074 0%, #277677 100%)',
            border: 'none',
            boxShadow: '0 10px 40px rgba(14, 112, 116, 0.2)'
          }}>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="relative overflow-hidden rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 p-4 transition-all hover:bg-white/15 cursor-default">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12"></div>
                <div className="relative z-10">
                  <p className="text-xs sm:text-sm text-white/90 font-semibold mb-2">Clientes</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white truncate">{stats.totalClients}</p>
                  <div className="mt-3 pt-2 border-t border-white/20">
                    <p className="text-xs text-white/80">Clientes únicos atendidos</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card style={{ 
            background: 'linear-gradient(135deg, #0e7074 0%, #277677 100%)',
            border: 'none',
            boxShadow: '0 10px 40px rgba(14, 112, 116, 0.2)'
          }}>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="relative overflow-hidden rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 p-4 transition-all hover:bg-white/15 cursor-default">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12"></div>
                <div className="relative z-10">
                  <p className="text-xs sm:text-sm text-white/90 font-semibold mb-2">Pets</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white truncate">{stats.totalPets}</p>
                  <div className="mt-3 pt-2 border-t border-white/20">
                    <p className="text-xs text-white/80">Pets únicos atendidos</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card style={{ 
            background: 'linear-gradient(135deg, #0e7074 0%, #277677 100%)',
            border: 'none',
            boxShadow: '0 10px 40px rgba(14, 112, 116, 0.2)'
          }}>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="relative overflow-hidden rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 p-4 transition-all hover:bg-white/15 cursor-default">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12"></div>
                <div className="relative z-10">
                  <p className="text-xs sm:text-sm text-white/90 font-semibold mb-2">Procedimentos</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white truncate">{stats.totalProcedures}</p>
                  <div className="mt-3 pt-2 border-t border-white/20">
                    <p className="text-xs text-white/80">Total de procedimentos disponíveis</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Gráfico de Procedimentos Vendidos */}
          <Card style={{ backgroundColor: '#FFFFFF' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-foreground min-w-0">Procedimentos Vendidos</CardTitle>
              <p className="text-sm text-muted-foreground">Quantidade por procedimento (Top 10)</p>
            </CardHeader>
            <CardContent className="p-4 flex items-center justify-center">
              {proceduresSold && proceduresSold.length > 0 ? (
                <BarChart 
                  width={500}
                  height={300}
                  data={proceduresSold} 
                  margin={{ top: 10, right: 30, left: 20, bottom: 100 }}
                >
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="#d1d5db" 
                    vertical={false} 
                  />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    interval={0}
                    tick={{ 
                      fontSize: 10, 
                      fill: '#000000',
                      fontWeight: 500 
                    }}
                    stroke="#6b7280"
                  />
                  <YAxis 
                    tick={{ 
                      fontSize: 11, 
                      fill: '#000000',
                      fontWeight: 500 
                    }} 
                    stroke="#6b7280"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      border: '2px solid #0e7074',
                      borderRadius: '8px',
                      padding: '12px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
                    }}
                    labelStyle={{ 
                      color: '#000000', 
                      fontWeight: 600,
                      marginBottom: '4px'
                    }}
                    cursor={{ fill: 'rgba(14, 112, 116, 0.1)' }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#0e7074" 
                    name="Quantidade" 
                    radius={[8, 8, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              ) : (
                <div style={{ height: '300px', width: '100%' }} className="flex items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-center px-4">
                    <p className="text-gray-700 font-semibold text-lg">Nenhum dado disponível</p>
                    <p className="text-sm text-gray-500 mt-2">
                      {proceduresSold === null ? 'Carregando informações...' : 'Não há procedimentos no período selecionado'}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gráfico de Valor por Usuário */}
          <Card style={{ backgroundColor: '#FFFFFF' }}>
            <CardHeader className="pb-2">
              <CardTitle className="min-w-0" style={{ color: '#303030' }}>Valor por Usuário</CardTitle>
              <p className="text-sm" style={{ color: '#303030' }}>Total (R$) por criador dos atendimentos</p>
            </CardHeader>
            <CardContent className="p-4 flex items-center justify-center">
              {valueByUser && valueByUser.length > 0 ? (
                <PieChart width={400} height={300}>
                  <Pie
                    data={valueByUser as any}
                    dataKey="value"
                    nameKey="name"
                    cx={200}
                    cy={150}
                    outerRadius={90}
                    innerRadius={50}
                    paddingAngle={4}
                    label={(props: any) => {
                      const { x, y, name, value } = props;
                      return (
                        <text 
                          x={x} 
                          y={y} 
                          fill="#303030" 
                          fontSize={12}
                          fontWeight={500}
                          textAnchor={x > 200 ? 'start' : 'end'}
                          dominantBaseline="central"
                        >
                          {`${name}: R$ ${value.toFixed(2)}`}
                        </text>
                      );
                    }}
                    labelLine={{ 
                      stroke: '#303030', 
                      strokeWidth: 2 
                    }}
                  >
                    {valueByUser.map((_, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={index % 2 === 0 ? '#0e7074' : '#16a34a'} 
                        stroke="#ffffff"
                        strokeWidth={3}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Valor Total']}
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      border: '2px solid #0e7074',
                      borderRadius: '8px',
                      padding: '12px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
                    }}
                    labelStyle={{ 
                      color: '#000000', 
                      fontWeight: 600,
                      marginBottom: '4px'
                    }}
                  />
                </PieChart>
              ) : (
                <div style={{ height: '300px', width: '100%' }} className="flex items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-center px-4">
                    <p className="text-gray-700 font-semibold text-lg">Nenhum dado disponível</p>
                    <p className="text-sm text-gray-500 mt-2">
                      {valueByUser === null ? 'Carregando informações...' : 'Não há usuários no período selecionado'}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </UnitLayout>
  );
}