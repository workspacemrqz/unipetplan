import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { Skeleton } from "@/components/admin/ui/skeleton";
import { Alert, AlertDescription } from "@/components/admin/ui/alert";
import { DateFilterComponent } from "@/components/admin/DateFilterComponent";
import type { Client, Atendimento, ContactSubmission } from "../../../../shared/schema";
import {
  User,
  DollarSign,
  Users
} from "lucide-react";
import { CalendarDate } from "@internationalized/date";
import { getDateRangeParams } from "@/lib/admin/date-utils";
import { createCacheManager } from "@/lib/admin/cacheUtils";

// Type definitions for dashboard data
type PlanRevenue = {
  planId: string;
  planName: string;
  totalRevenue: number;
};

type PlanDistribution = {
  planId: string;
  planName: string;
  petCount: number;
  percentage: number;
};

export default function Dashboard() {
  // LOG CRÍTICO: Verificar se Dashboard está sendo executado SEM passar pelo AuthGuard
  console.log("🚨 [DASHBOARD] Component loaded - THIS SHOULD NOT HAPPEN WITHOUT AUTH!");
  
  const queryClient = useQueryClient();
  const cacheManager = createCacheManager(queryClient);
  
  const [dateFilter, setDateFilter] = useState<{
    startDate: CalendarDate | null;
    endDate: CalendarDate | null;
  }>({ startDate: null, endDate: null });

  const [debouncedDateFilter, setDebouncedDateFilter] = useState<{
    startDate: CalendarDate | null;
    endDate: CalendarDate | null;
  }>({ startDate: null, endDate: null });

  // Debounce date filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDateFilter(dateFilter);
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [dateFilter]);

  // Background prefetching when Dashboard loads
  useEffect(() => {
    // Small delay to ensure dashboard data loads first
    const prefetchTimer = setTimeout(() => {
      console.log("📋 [PREFETCH] Starting background prefetch from Dashboard");
      
      // Prefetch main pages data in background
      cacheManager.prefetchDashboardData().catch(error => {
        console.warn("⚠️ [PREFETCH] Dashboard prefetch failed:", error);
      });

      // Smart prefetch based on being on dashboard
      cacheManager.smartPrefetch('dashboard').catch(error => {
        console.warn("⚠️ [PREFETCH] Smart prefetch failed:", error);
      });
    }, 1500); // 1.5 second delay to let dashboard load first

    return () => clearTimeout(prefetchTimer);
  }, []); // Only run once when component mounts

  const handleDateRangeChange = (startDate: CalendarDate | null, endDate: CalendarDate | null) => {
    setDateFilter({ startDate, endDate });
  };

  // Get date range parameters for API calls using debounced values
  const dateParams = getDateRangeParams(debouncedDateFilter.startDate, debouncedDateFilter.endDate);
  const hasDateFilter = Object.keys(dateParams).length > 0;

  // Single aggregated query to fetch all dashboard data using standard queryClient fetcher
  const { 
    data: dashboardData, 
    isLoading: isLoadingDashboard, 
    isError: isDashboardError 
  } = useQuery({
    queryKey: ["/admin/api/dashboard/all", dateParams],
    // No custom queryFn needed - using the enhanced getQueryFn that supports [path, params] format
  });
  
  // Query to fetch procedures count
  const { 
    data: procedures,
    isLoading: isLoadingProcedures
  } = useQuery({
    queryKey: ["/admin/api/procedures"],
  });

  // Extract data from the aggregated response
  const stats = (dashboardData as any)?.stats || {} as {
    monthlyRevenue?: number;
    totalRevenue?: number;
    activeClients?: number;
    registeredPets?: number;
  };
  const allAtendimentos = (dashboardData as any)?.atendimentos || [] as Atendimento[];
  const clients = (dashboardData as any)?.clients || [] as Client[];
  const contactSubmissions = (dashboardData as any)?.contactSubmissions || [] as ContactSubmission[];
  const planDistribution = ((dashboardData as any)?.planDistribution || []) as PlanDistribution[];
  const planRevenue = ((dashboardData as any)?.planRevenue || []) as PlanRevenue[];

  // Map loading and error states for backward compatibility
  const statsLoading = isLoadingDashboard;
  const atendimentosLoading = isLoadingDashboard;
  const networkLoading = isLoadingDashboard;
  const clientsLoading = isLoadingDashboard;
  const submissionsLoading = isLoadingDashboard;
  const plansLoading = isLoadingDashboard;
  const distributionLoading = isLoadingDashboard;
  const revenueLoading = isLoadingDashboard;

  const statsError = isDashboardError;
  const atendimentosError = isDashboardError;
  const networkError = isDashboardError;
  const clientsError = isDashboardError;
  const submissionsError = isDashboardError;
  const plansError = isDashboardError;
  const distributionError = isDashboardError;
  const revenueError = isDashboardError;


  // Memoize loading states
  const isAnyLoading = useMemo(() =>
    statsLoading || atendimentosLoading || distributionLoading || clientsLoading ||
    submissionsLoading || plansLoading || networkLoading || revenueLoading || isLoadingProcedures,
    [statsLoading, atendimentosLoading, distributionLoading, clientsLoading,
      submissionsLoading, plansLoading, networkLoading, revenueLoading, isLoadingProcedures]
  );

  // Memoize error states
  const hasErrors = useMemo(() =>
    statsError || atendimentosError || distributionError || clientsError ||
    submissionsError || plansError || networkError || revenueError,
    [statsError, atendimentosError, distributionError, clientsError,
      submissionsError, plansError, networkError, revenueError]
  );

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground break-words">Dashboard Geral</h1>
          <p className="text-sm text-muted-foreground">Visão geral do sistema de gestão</p>
        </div>
        <div className="flex items-center gap-2 p-2 xs:p-0">
          <User className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-medium text-foreground truncate">Administrador</p>
            <p className="text-xs text-muted-foreground">Sistema</p>
          </div>
        </div>
      </div>

      {/* Date Filter */}
      <DateFilterComponent
        onDateRangeChange={handleDateRangeChange}
        isLoading={isAnyLoading ||
          (dateFilter.startDate !== debouncedDateFilter.startDate ||
            dateFilter.endDate !== debouncedDateFilter.endDate)}
        initialRange={dateFilter}
      />

      {/* Error States */}
      {hasErrors && hasDateFilter && (
        <Alert variant="destructive">
          <AlertDescription>
            Erro ao aplicar filtro de data. Tente novamente ou remova o filtro.
          </AlertDescription>
        </Alert>
      )}

      {/* Empty Results Warning */}
      {hasDateFilter && !isAnyLoading &&
        stats?.activeClients === 0 && allAtendimentos?.length === 0 && (
          <Alert>
            <AlertDescription>
              Nenhum dado encontrado para o período selecionado. Tente expandir o intervalo de datas.
            </AlertDescription>
          </Alert>
        )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <Card style={{ backgroundColor: '#FFFFFF' }}>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Receita do Período Selecionado</p>
                {statsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-6 sm:h-8 w-16 sm:w-20 mt-1" />
                    <Skeleton className="h-4 sm:h-5 w-20 sm:w-24" />
                  </div>
                ) : (
                  <>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground truncate" data-testid="metric-total-revenue">
                      R$ {(stats?.totalRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground">Total de pagamentos aprovados</p>
                      <p className="text-sm sm:text-base font-semibold text-foreground">
                        Histórico completo
                      </p>
                    </div>
                  </>
                )}
              </div>
              <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: '#FFFFFF' }}>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Receita por Plano</p>
                {revenueLoading ? (
                  <Skeleton className="h-6 sm:h-8 w-full mt-1" />
                ) : revenueError ? (
                  <Alert className="mt-2">
                    <AlertDescription className="text-xs">
                      Erro ao carregar receita por plano
                    </AlertDescription>
                  </Alert>
                ) : planRevenue?.length && planRevenue.some(plan => plan.totalRevenue > 0) ? (
                  <div className="space-y-2 mt-2">
                    {planRevenue.map(plan => (
                      <div key={plan.planId} className="flex justify-between items-center">
                        <span className="text-sm font-medium text-foreground truncate">{plan.planName}</span>
                        <span className="text-sm font-bold text-primary ml-2">
                          R$ {plan.totalRevenue.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-2 mt-2">
                    <p className="text-xs text-muted-foreground">
                      Nenhuma receita encontrada
                    </p>
                  </div>
                )}
              </div>
              <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Charts Grid - Two columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Visão Geral em Gráficos */}
        <Card style={{ backgroundColor: '#FFFFFF' }}>
          <CardHeader>
            <CardTitle className="text-foreground min-w-0">Visão Geral em Gráficos</CardTitle>
            <p className="text-sm text-muted-foreground">Distribuição visual dos dados do sistema</p>
          </CardHeader>
          <CardContent>
            {isAnyLoading ? (
              <div className="flex items-center justify-center h-64 w-full">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (() => {
              const chartData = [
                { name: 'Formulários', quantidade: contactSubmissions?.length || 0 },
                { name: 'Atendimentos', quantidade: allAtendimentos?.length || 0 },
                { name: 'Clientes', quantidade: clients?.length || 0 },
                { name: 'Pets', quantidade: stats?.registeredPets || 0 },
                { name: 'Planos', quantidade: (dashboardData as any)?.plans?.length || 0 },
                { name: 'Procedimentos', quantidade: Array.isArray(procedures) ? procedures.length : 0 },
              ];
              const maxValue = Math.max(...chartData.map(d => d.quantidade), 1);
              
              return (
                <div className="w-full py-4">
                  {/* Container do gráfico com escala e grid */}
                  <div className="flex">
                    {/* Eixo Y com valores */}
                    <div className="flex flex-col justify-between h-[240px] pr-2 text-[10px] text-gray-500 font-medium">
                      {[163, 122, 81, 40, 0].map((value) => (
                        <div key={value} className="text-right">
                          {value}
                        </div>
                      ))}
                    </div>
                    
                    {/* Área do gráfico */}
                    <div className="flex-1 relative h-[240px]">
                      {/* Grid lines horizontais */}
                      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <div 
                            key={i} 
                            className="border-t border-gray-100"
                            style={{ opacity: i === 4 ? 0.5 : 0.2 }}
                          />
                        ))}
                      </div>
                      
                      {/* Container das barras */}
                      <div className="relative h-full flex items-end justify-around gap-2 px-2">
                        {chartData.map((item, index) => {
                          // Calcular altura proporcional
                          const heightPercent = (item.quantidade / maxValue) * 100;
                          
                          return (
                            <div 
                              key={item.name} 
                              className="group relative flex flex-col items-center flex-1 max-w-[70px]"
                            >
                              {/* Container da barra */}
                              <div className="w-full flex flex-col items-center">
                                {/* Valor no topo */}
                                <div className="text-xs font-bold text-gray-700 mb-1">
                                  {item.quantidade}
                                </div>
                                
                                {/* Área de altura da barra */}
                                <div className="relative w-full h-[200px] flex items-end">
                                  {/* Barra com altura proporcional */}
                                  <div 
                                    className="w-full bg-gradient-to-t from-[#1e5758] to-[#277677] rounded-t-sm transition-all duration-700 hover:opacity-90 cursor-pointer"
                                    style={{ 
                                      height: `${Math.max(heightPercent, item.quantidade > 0 ? 2 : 0)}%`,
                                      minHeight: item.quantidade > 0 ? '4px' : '0px',
                                      animation: `slideUp ${0.5 + index * 0.1}s ease-out`
                                    }}
                                    title={`${item.name}: ${item.quantidade} unidades`}
                                  />
                                </div>
                                
                                {/* Label embaixo */}
                                <div className="mt-2 text-[10px] font-medium text-gray-600 text-center">
                                  {item.name}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Distribuição de Planos */}
        <Card style={{ backgroundColor: '#FFFFFF' }}>
          <CardHeader>
            <CardTitle className="text-foreground min-w-0">Distribuição de Planos</CardTitle>
          </CardHeader>
          <CardContent>
            {distributionLoading ? (
              <div className="space-y-4">
                {/* Loading dos planos */}
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Skeleton className="w-3 h-3 rounded-full" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-3 w-12" />
                        <Skeleton className="h-4 w-8" />
                      </div>
                    </div>
                    <Skeleton className="h-3 w-full rounded-full" />
                  </div>
                ))}
              </div>
            ) : distributionError ? (
              <Alert>
                <AlertDescription>
                  Erro ao carregar distribuição de planos. Tente novamente.
                </AlertDescription>
              </Alert>
            ) : planDistribution?.length && planDistribution.some(plan => plan.petCount > 0) ? (
              <div className="space-y-4">
                {/* Distribuição por plano */}
                {planDistribution.map((plan) => {
                  // Cores uniformes usando cor principal para todos os planos
                  const planColors = {
                    'BASIC': { bg: 'bg-primary', text: 'text-primary', light: 'bg-primary/20' },
                    'COMFORT': { bg: 'bg-primary', text: 'text-primary', light: 'bg-primary/20' },
                    'PLATINUM': { bg: 'bg-primary', text: 'text-primary', light: 'bg-primary/20' },
                    'INFINITY': { bg: 'bg-primary', text: 'text-primary', light: 'bg-primary/20' },
                    'PREMIUM': { bg: 'bg-primary', text: 'text-primary', light: 'bg-primary/20' }
                  };

                  const colors = planColors[plan.planName as keyof typeof planColors] ||
                    { bg: 'bg-muted-foreground', text: 'text-muted-foreground', light: 'bg-muted' };

                  return (
                    <div key={plan.planId} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${colors.bg}`}></div>
                          <span className="text-sm font-medium text-foreground">{plan.planName}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">
                            {plan.petCount} pet{plan.petCount !== 1 ? 's' : ''}
                          </span>
                          <span className={`text-sm font-bold ${colors.text} min-w-[3rem] text-right`}>
                            {plan.percentage}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                        <div
                          className={`${colors.bg} h-3 rounded-full transition-all duration-500 ease-in-out`}
                          style={{ width: `${plan.percentage}%` }}
                          role="progressbar"
                          aria-valuenow={plan.percentage}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${plan.planName}: ${plan.percentage}% (${plan.petCount} pets)`}
                          title={`${plan.planName}: ${plan.petCount} pet${plan.petCount !== 1 ? 's' : ''} (${plan.percentage}%)`}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : planDistribution?.length ? (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">
                    Planos disponíveis, mas nenhum pet associado
                  </p>
                </div>

                {/* Mostrar planos mesmo sem pets */}
                {planDistribution.map((plan) => {
                  const planColors = {
                    'BASIC': { bg: 'bg-primary', text: 'text-primary', light: 'bg-primary/20' },
                    'COMFORT': { bg: 'bg-primary', text: 'text-primary', light: 'bg-primary/20' },
                    'PLATINUM': { bg: 'bg-primary', text: 'text-primary', light: 'bg-primary/20' },
                    'INFINITY': { bg: 'bg-primary', text: 'text-primary', light: 'bg-primary/20' },
                    'PREMIUM': { bg: 'bg-primary', text: 'text-primary', light: 'bg-primary/20' }
                  };

                  const colors = planColors[plan.planName as keyof typeof planColors] ||
                    { bg: 'bg-muted-foreground', text: 'text-muted-foreground', light: 'bg-muted' };

                  return (
                    <div key={plan.planId} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${colors.bg} opacity-50`}></div>
                        <span className="text-sm text-muted-foreground">{plan.planName}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">0 pets (0%)</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  Nenhum plano ativo encontrado
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Configure planos ativos para ver a distribuição
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
