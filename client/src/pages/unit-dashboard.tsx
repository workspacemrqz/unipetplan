import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import UnitLayout from '@/components/unit/UnitLayout';
import { FileText, Users, Clipboard } from "lucide-react";
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
    const newStats = { ...stats };
    
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
    
    // Buscar estatísticas agregadas do backend
    try {
      const statsResponse = await fetch(`/api/units/${slug}/dashboard-stats${periodParam}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsResponse.ok) {
        const dashboardStats = await statsResponse.json();
        newStats.totalGuides = dashboardStats.totalAtendimentos || 0;
        newStats.totalClients = dashboardStats.uniqueClients || 0;
        newStats.totalPets = dashboardStats.uniquePets || 0;
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas do dashboard:', error);
    }
    
    // Buscar procedimentos (não filtra por data, pois mostra todos os procedimentos disponíveis)
    try {
      const proceduresResponse = await fetch(`/api/unit/${slug}/procedures`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (proceduresResponse.ok) {
        const proceduresData = await proceduresResponse.json();
        newStats.totalProcedures = proceduresData.length || 0;
      }
    } catch (error) {
      console.error('Erro ao buscar procedimentos:', error);
    }
    
    setStats(newStats);
    
    // Buscar dados dos gráficos
    fetchChartData();
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
    
    // Buscar procedimentos vendidos
    try {
      const response = await fetch(`/api/units/${slug}/charts/procedures-sold${periodParam}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Procedimentos vendidos recebidos:', data);
        setProceduresSold(data);
      } else {
        console.error('Erro na resposta de procedimentos:', response.status);
      }
    } catch (error) {
      console.error('Erro ao buscar procedimentos vendidos:', error);
    }
    
    // Buscar valor por usuário
    try {
      const response = await fetch(`/api/units/${slug}/charts/value-by-user${periodParam}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('💰 Valor por usuário recebido:', data);
        setValueByUser(data);
      } else {
        console.error('Erro na resposta de valor por usuário:', response.status);
      }
    } catch (error) {
      console.error('Erro ao buscar valor por usuário:', error);
    }
    
    // Buscar total de vendas
    try {
      const response = await fetch(`/api/units/${slug}/charts/total-sales${periodParam}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('💵 Total de vendas recebido:', data);
        setTotalSales(data);
      } else {
        console.error('Erro na resposta de total de vendas:', response.status);
      }
    } catch (error) {
      console.error('Erro ao buscar total de vendas:', error);
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
        <Card style={{ backgroundColor: '#FFFFFF' }}>
          <CardHeader>
            <CardTitle className="text-foreground min-w-0">Total de Vendas</CardTitle>
            <p className="text-sm text-muted-foreground">Resumo de recebimentos</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-600">Valor Total</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  R$ {totalSales.totalValue.toFixed(2)}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-600">Valor Médio</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  R$ {totalSales.averageValue.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card style={{ backgroundColor: '#FFFFFF' }}>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Atendimentos</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground truncate mt-1">{stats.totalGuides}</p>
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">Total de atendimentos gerados</p>
                  </div>
                </div>
                <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card style={{ backgroundColor: '#FFFFFF' }}>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Clientes</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground truncate mt-1">{stats.totalClients}</p>
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">Clientes únicos atendidos</p>
                  </div>
                </div>
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card style={{ backgroundColor: '#FFFFFF' }}>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Pets</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground truncate mt-1">{stats.totalPets}</p>
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">Pets únicos atendidos</p>
                  </div>
                </div>
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card style={{ backgroundColor: '#FFFFFF' }}>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Procedimentos</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground truncate mt-1">{stats.totalProcedures}</p>
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">Total de procedimentos disponíveis</p>
                  </div>
                </div>
                <Clipboard className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Gráfico de Procedimentos Vendidos */}
          <Card style={{ backgroundColor: '#FFFFFF' }}>
            <CardHeader>
              <CardTitle className="text-foreground min-w-0">Procedimentos Vendidos</CardTitle>
              <p className="text-sm text-muted-foreground">Quantidade por procedimento (Top 10)</p>
            </CardHeader>
            <CardContent>
              <div className="mb-2 text-xs text-gray-600">
                Debug: {proceduresSold ? `${proceduresSold.length} itens` : 'Null/Undefined'}
              </div>
              {proceduresSold && proceduresSold.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={proceduresSold} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                      tick={{ fontSize: 10, fill: '#1f2937' }}
                      stroke="#6b7280"
                    />
                    <YAxis tick={{ fill: '#1f2937' }} stroke="#6b7280" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#ffffff', 
                        border: '1px solid #d1d5db',
                        borderRadius: '6px'
                      }}
                    />
                    <Bar dataKey="count" fill="#0e7074" name="Quantidade" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-gray-700 font-medium">Sem dados disponíveis</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {proceduresSold === null ? 'Carregando...' : 'Nenhum procedimento encontrado'}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gráfico de Valor por Usuário */}
          <Card style={{ backgroundColor: '#FFFFFF' }}>
            <CardHeader>
              <CardTitle className="text-foreground min-w-0">Valor por Usuário</CardTitle>
              <p className="text-sm text-muted-foreground">Total (R$) por criador dos atendimentos</p>
            </CardHeader>
            <CardContent>
              <div className="mb-2 text-xs text-gray-600">
                Debug: {valueByUser ? `${valueByUser.length} itens` : 'Null/Undefined'}
              </div>
              {valueByUser && valueByUser.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={valueByUser as any}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={40}
                      label={(entry: any) => `${entry.name}: R$ ${entry.value.toFixed(2)}`}
                      labelLine={{ stroke: '#1f2937', strokeWidth: 1 }}
                    >
                      {valueByUser.map((_, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={index % 2 === 0 ? '#0e7074' : '#16a34a'} 
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                      contentStyle={{ 
                        backgroundColor: '#ffffff', 
                        border: '1px solid #d1d5db',
                        borderRadius: '6px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-gray-700 font-medium">Sem dados disponíveis</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {valueByUser === null ? 'Carregando...' : 'Nenhum usuário encontrado'}
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