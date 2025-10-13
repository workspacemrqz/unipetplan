import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import UnitLayout from '@/components/unit/UnitLayout';
import { FileText, Users, Clipboard, TrendingUp, DollarSign } from "lucide-react";
import LoadingDots from '@/components/ui/LoadingDots';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
  }, [loading, slug]);

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
    
    // Buscar estatísticas agregadas do backend
    try {
      const statsResponse = await fetch(`/api/units/${slug}/dashboard-stats`, {
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
    
    // Buscar procedimentos
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
    
    // Buscar procedimentos vendidos
    try {
      const response = await fetch(`/api/units/${slug}/charts/procedures-sold`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProceduresSold(data);
      }
    } catch (error) {
      console.error('Erro ao buscar procedimentos vendidos:', error);
    }
    
    // Buscar valor por usuário
    try {
      const response = await fetch(`/api/units/${slug}/charts/value-by-user`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setValueByUser(data);
      }
    } catch (error) {
      console.error('Erro ao buscar valor por usuário:', error);
    }
    
    // Buscar total de vendas
    try {
      const response = await fetch(`/api/units/${slug}/charts/total-sales`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTotalSales(data);
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Atendimentos</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalGuides}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: '#e8f4f4' }}>
                <FileText className="h-6 w-6" style={{ color: '#257273' }} />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">Total de atendimentos gerados</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Clientes</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalClients}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: '#e8f4f4' }}>
                <Users className="h-6 w-6" style={{ color: '#257273' }} />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">Clientes únicos atendidos</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pets</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalPets}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: '#e8f4f4' }}>
                <Users className="h-6 w-6" style={{ color: '#257273' }} />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">Pets únicos atendidos</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Procedimentos</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalProcedures}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: '#e8f4f4' }}>
                <Clipboard className="h-6 w-6" style={{ color: '#257273' }} />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">Total de procedimentos disponíveis</p>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Gráfico de Procedimentos Vendidos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" style={{ color: '#257273' }} />
                Procedimentos Vendidos
              </CardTitle>
              <CardDescription>Quantidade por procedimento (Top 10)</CardDescription>
            </CardHeader>
            <CardContent>
              {proceduresSold.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={proceduresSold}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#257273" name="Quantidade" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  Sem dados disponíveis
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gráfico de Valor por Usuário */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" style={{ color: '#257273' }} />
                Valor por Usuário
              </CardTitle>
              <CardDescription>Total (R$) por criador dos atendimentos</CardDescription>
            </CardHeader>
            <CardContent>
              {valueByUser.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={valueByUser}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {valueByUser.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#257273' : '#3a9b9d'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  Sem dados disponíveis
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Card de Total de Vendas */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" style={{ color: '#257273' }} />
              Total de Vendas
            </CardTitle>
            <CardDescription>Resumo de recebimentos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-600">Valor Total</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  R$ {totalSales.totalValue.toFixed(2)}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-600">Total de Atendimentos</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {totalSales.totalCount}
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
      </div>
    </UnitLayout>
  );
}