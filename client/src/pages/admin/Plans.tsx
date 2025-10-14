import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Badge } from "@/components/admin/ui/badge";
import { Switch } from "@/components/admin/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/admin/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/admin/ui/dropdown-menu";
import { useLocation } from "wouter";
import { Plus, Search, Edit, CreditCard, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { apiRequest, getQueryOptions } from "@/lib/admin/queryClient";
import { createSmartInvalidation } from "@/lib/admin/cacheUtils";
import { useToast } from "@/hooks/use-toast";
import { useColumnPreferences } from "@/hooks/admin/use-column-preferences";
import { useAdminLogger } from "@/hooks/admin/use-admin-logger";
import type { Plan } from "@shared/schema";
import { cn } from "@/lib/utils";

const allColumns = [
  "Nome",
  "Preço",
  "Tipo",
  "Status",
  "Ações",
] as const;

export default function Plans() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { visibleColumns, toggleColumn } = useColumnPreferences('plans.columns', allColumns);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const queryClient = useQueryClient();
  const smartCache = createSmartInvalidation(queryClient);
  const { toast } = useToast();
  const { logAction } = useAdminLogger();

  const { data: plans, isLoading } = useQuery<Plan[]>({
    queryKey: ["/admin/api/plans"],
    ...getQueryOptions('plans'),
  });

  const togglePlanMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await apiRequest("PUT", `/admin/api/plans/${id}`, { isActive });
    },
    onMutate: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      // Optimistically update plan status
      await queryClient.cancelQueries({ queryKey: ["/admin/api/plans"] });
      const previousPlans = queryClient.getQueryData(["/admin/api/plans"]);
      
      smartCache.updatePlanOptimistically(id, { isActive });
      
      return { previousPlans };
    },
    onSuccess: async (_, { id, isActive }) => {
      smartCache.invalidatePlanData(id);
      toast({
        title: "Status atualizado",
        description: "Status do plano foi atualizado.",
      });

      // Log the update action
      const plan = Array.isArray(plans) ? plans.find((p: Plan) => p.id === id) : null;
      if (plan) {
        await logAction({
          actionType: "updated",
          entityType: "plan",
          entityId: id,
          metadata: { 
            name: plan.name,
            isActive,
            basePrice: plan.basePrice
          }
        });
      }
    },
    onError: (_, __, context) => {
      // Restore previous data on error
      if (context?.previousPlans) {
        queryClient.setQueryData(["/admin/api/plans"], context.previousPlans);
      }
      toast({
        title: "Erro",
        description: "Falha ao atualizar status do plano.",
        variant: "destructive",
      });
    },
  });

  const allFilteredPlans = Array.isArray(plans) ? plans.filter((plan: Plan) =>
    plan.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  const totalPlans = allFilteredPlans.length;
  const totalPages = Math.ceil(totalPlans / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const filteredPlans = allFilteredPlans.slice(startIndex, endIndex);


  const handleToggleStatus = (id: string, currentStatus: boolean) => {
    togglePlanMutation.mutate({ id, isActive: !currentStatus });
  };

  const getPlanTypeLabel = (type: string) => {
    switch (type) {
      case "with_waiting_period": return "Sem Coparticipação";
      case "without_waiting_period": return "Com Coparticipação";
      default: return type;
    }
  };

  const getPlanTypeColor = (type: string) => {
    switch (type) {
      case "with_waiting_period": return "border border-border rounded-lg bg-background text-foreground";
      case "without_waiting_period": return "border border-border rounded-lg bg-background text-foreground";
      default: return "border border-border rounded-lg bg-background text-foreground";
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground break-words">Planos de Saúde</h1>
          <p className="text-sm text-muted-foreground">Gerencie os planos de saúde disponíveis</p>
        </div>
      </div>

      {/* Filters and Column Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset para página 1 ao buscar
              }}
              className="pl-10 w-80"
              data-testid="input-search-plans"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                style={{
                  borderColor: 'var(--border-gray)',
                  background: 'white'
                }}
              >
                <MoreHorizontal className="h-4 w-4 mr-2" />
                Colunas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {allColumns.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col}
                  checked={visibleColumns.includes(col)}
                  onCheckedChange={() => toggleColumn(col)}
                  className="mb-1"
                >
                  {col}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Modern Table Container */}
      <div className="container my-10 space-y-4 border border-[#eaeaea] rounded-lg bg-white shadow-sm">

        {/* Table */}
        <div className="rounded-lg overflow-hidden">
          <Table className="w-full">
          <TableHeader>
            <TableRow className="bg-white border-b border-[#eaeaea]">
              {visibleColumns.includes("Nome") && <TableHead className="w-[200px] bg-white">Nome</TableHead>}
              {visibleColumns.includes("Preço") && <TableHead className="w-[150px] bg-white">Preço</TableHead>}
              {visibleColumns.includes("Tipo") && <TableHead className="w-[180px] bg-white">Tipo</TableHead>}
              {visibleColumns.includes("Status") && <TableHead className="w-[100px] bg-white">Status</TableHead>}
              {visibleColumns.includes("Ações") && <TableHead className="w-[150px] bg-white">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={visibleColumns.length} className="text-center py-6">
                    <div className="h-4 bg-muted rounded w-full animate-pulse"></div>
                  </TableCell>
                </TableRow>
              ))
            ) : filteredPlans?.length ? (
              filteredPlans.map((plan: any) => (
                <TableRow key={plan.id} className="bg-white border-b border-[#eaeaea]">
                  {visibleColumns.includes("Nome") && (
                    <TableCell className="font-medium whitespace-nowrap bg-white" data-testid={`plan-name-${plan.id}`}>
                      {plan.name}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Preço") && (
                    <TableCell className="whitespace-nowrap bg-white">
                      <span className="font-bold text-foreground">
                        R$ {parseFloat(plan.basePrice || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-muted-foreground">/mês</span>
                      </span>
                    </TableCell>
                  )}
                  {visibleColumns.includes("Tipo") && (
                    <TableCell className="whitespace-nowrap bg-white">
                      <Badge className={cn("whitespace-nowrap", getPlanTypeColor(plan.planType))}>
                        {getPlanTypeLabel(plan.planType)}
                      </Badge>
                    </TableCell>
                  )}
                  {visibleColumns.includes("Status") && (
                    <TableCell className="whitespace-nowrap bg-white">
                      <Switch
                        checked={plan.isActive}
                        onCheckedChange={() => handleToggleStatus(plan.id, plan.isActive)}
                        disabled={togglePlanMutation.isPending}
                        data-testid={`switch-plan-status-${plan.id}`}
                      />
                    </TableCell>
                  )}
                  {visibleColumns.includes("Ações") && (
                    <TableCell className="whitespace-nowrap bg-white">
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation(`/planos/${plan.id}/editar`)}
                          data-testid={`button-edit-${plan.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow className="bg-white border-b border-[#eaeaea]">
                <TableCell colSpan={visibleColumns.length} className="text-center py-12 bg-white">
                  <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    {searchQuery 
                      ? "Nenhum plano encontrado para a busca." 
                      : "Nenhum plano cadastrado ainda."
                    }
                  </p>
                  {!searchQuery && (
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation("/planos/novo")}
                      data-testid="button-add-first-plan"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Primeiro Plano
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>

        
        {/* Pagination */}
        {totalPlans > 10 && (
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">
                  {totalPlans > 0 ? (
                    <>Mostrando {(currentPage - 1) * pageSize + 1} a {Math.min(currentPage * pageSize, totalPlans)} de {totalPlans} plano{totalPlans !== 1 ? 's' : ''}</>
                  ) : (
                    "Nenhum plano encontrado"
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <div className="flex items-center space-x-1">
                <span className="text-sm font-medium">
                  Página {currentPage} de {totalPages}
                </span>
              </div>
              <Button
                variant="admin-action"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || isLoading}
              >
                Próximo
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
