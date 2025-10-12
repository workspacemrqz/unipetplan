import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import UnitLayout from '@/components/unit/UnitLayout';
import { FileText, Users, Clipboard } from "lucide-react";
import LoadingDots from '@/components/ui/LoadingDots';

interface DashboardStats {
  totalGuides: number;
  totalClients: number;
  totalPets: number;
  totalProcedures: number;
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

  useEffect(() => {
    checkAuthentication();
  }, [slug]);

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
      </div>
    </UnitLayout>
  );
}