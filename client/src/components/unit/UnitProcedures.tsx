import { useState, useEffect } from 'react';
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
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
import { Search, MoreHorizontal, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { useColumnPreferences } from "@/hooks/admin/use-column-preferences";

interface PlanDetail {
  planId: string;
  planName: string;
  price: number;
  payValue: number;
  coparticipacao: number;
  carencia: string;
  limitesAnuais: string;
  isIncluded: boolean;
}

interface Procedure {
  id: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
  plans: PlanDetail[];
}

const allColumns = [
  "Procedimento",
  "Categoria",
  "Plano",
  "Valor Integral",
  "Pagar (R$)",
  "Coparticipação",
  "Carência",
  "Limites Anuais"
] as const;

export default function UnitProcedures({ unitSlug }: { unitSlug: string }) {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { visibleColumns, toggleColumn } = useColumnPreferences('unit.procedures.columns', allColumns);
  const pageSize = 10;

  useEffect(() => {
    fetchProcedures();
  }, [unitSlug]);

  const fetchProcedures = async () => {
    try {
      const token = localStorage.getItem('unit-token');
      const response = await fetch(`/api/unit/${unitSlug}/procedures-with-plans`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProcedures(data);
      }
    } catch (error) {
      console.error('Erro ao buscar procedimentos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create expanded rows for procedures with plans
  const expandProceduresWithPlans = (procedures: Procedure[]) => {
    const expanded: any[] = [];
    procedures.forEach(procedure => {
      if (procedure.plans && procedure.plans.length > 0) {
        procedure.plans.forEach(plan => {
          expanded.push({
            ...procedure,
            plan: plan
          });
        });
      } else {
        expanded.push({
          ...procedure,
          plan: null
        });
      }
    });
    return expanded;
  };

  const expandedProcedures = expandProceduresWithPlans(procedures);

  const filteredProcedures = expandedProcedures.filter(item => {
    const searchLower = searchQuery.toLowerCase();
    return item.name.toLowerCase().includes(searchLower) ||
           item.category.toLowerCase().includes(searchLower) ||
           (item.plan && item.plan.planName.toLowerCase().includes(searchLower)) ||
           (item.description && item.description.toLowerCase().includes(searchLower));
  });

  const totalProcedures = filteredProcedures.length;
  const totalPages = Math.ceil(totalProcedures / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const displayProcedures = filteredProcedures.slice(startIndex, endIndex);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price / 100); // Convert from cents to reais
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground break-words">Procedimentos</h1>
          <p className="text-sm text-muted-foreground">Visualize todos os procedimentos disponíveis com detalhes dos planos</p>
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
                setCurrentPage(1);
              }}
              className="pl-10 w-80"
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
            <DropdownMenuContent align="end" className="w-48">
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
        <div className="rounded-lg overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-white border-b border-[#eaeaea]">
                {visibleColumns.includes("Procedimento") && <TableHead className="min-w-[200px] bg-white">Procedimento</TableHead>}
                {visibleColumns.includes("Categoria") && <TableHead className="min-w-[140px] bg-white">Categoria</TableHead>}
                {visibleColumns.includes("Plano") && <TableHead className="min-w-[150px] bg-white">Plano</TableHead>}
                {visibleColumns.includes("Valor Integral") && <TableHead className="min-w-[120px] bg-white">Valor Integral</TableHead>}
                {visibleColumns.includes("Pagar (R$)") && <TableHead className="min-w-[120px] bg-white">Pagar (R$)</TableHead>}
                {visibleColumns.includes("Coparticipação") && <TableHead className="min-w-[130px] bg-white">Coparticipação</TableHead>}
                {visibleColumns.includes("Carência") && <TableHead className="min-w-[100px] bg-white">Carência</TableHead>}
                {visibleColumns.includes("Limites Anuais") && <TableHead className="min-w-[150px] bg-white">Limites Anuais</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={visibleColumns.length} className="text-center py-6">
                      <div className="h-4 bg-muted rounded w-full animate-pulse"></div>
                    </TableCell>
                  </TableRow>
                ))
              ) : displayProcedures && displayProcedures.length > 0 ? (
                displayProcedures.map((item: any, index: number) => (
                  <TableRow key={`${item.id}-${item.plan?.planId || index}`} className="bg-white border-b border-[#eaeaea] hover:bg-gray-50">
                    {visibleColumns.includes("Procedimento") && (
                      <TableCell className="font-medium whitespace-nowrap bg-white">
                        {item.name}
                      </TableCell>
                    )}
                    {visibleColumns.includes("Categoria") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        {item.category}
                      </TableCell>
                    )}
                    {visibleColumns.includes("Plano") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        {item.plan ? (
                          <span className="font-medium text-primary">
                            {item.plan.planName}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.includes("Valor Integral") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        {item.plan ? formatPrice(item.plan.price) : '-'}
                      </TableCell>
                    )}
                    {visibleColumns.includes("Pagar (R$)") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        {item.plan ? (
                          <span className="font-semibold text-green-600">
                            {formatPrice(item.plan.payValue)}
                          </span>
                        ) : '-'}
                      </TableCell>
                    )}
                    {visibleColumns.includes("Coparticipação") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        {item.plan && item.plan.coparticipacao > 0 ? (
                          <span className="text-orange-600">
                            {formatPrice(item.plan.coparticipacao)}
                          </span>
                        ) : '-'}
                      </TableCell>
                    )}
                    {visibleColumns.includes("Carência") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        {item.plan && item.plan.carencia ? (
                          <span className="text-sm">
                            {item.plan.carencia}
                          </span>
                        ) : '-'}
                      </TableCell>
                    )}
                    {visibleColumns.includes("Limites Anuais") && (
                      <TableCell className="bg-white">
                        {item.plan && item.plan.limitesAnuais ? (
                          <span className="text-sm line-clamp-2">
                            {item.plan.limitesAnuais}
                          </span>
                        ) : '-'}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow className="bg-white border-b border-[#eaeaea]">
                  <TableCell colSpan={visibleColumns.length} className="text-center py-12 bg-white">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {searchQuery.length > 0
                        ? "Nenhum procedimento encontrado para a busca."
                        : "Nenhum procedimento cadastrado ainda."
                      }
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalProcedures > 10 && (
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">
                  {totalProcedures > 0 ? (
                    <>Mostrando {startIndex + 1} a {Math.min(endIndex, totalProcedures)} de {totalProcedures} registros</>
                  ) : (
                    "Nenhum procedimento encontrado"
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage <= 1}
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
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
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