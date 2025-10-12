import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Search, MoreHorizontal, ChevronLeft, ChevronRight, DollarSign } from "lucide-react";
import { useColumnPreferences } from "@/hooks/admin/use-column-preferences";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDate } from "@internationalized/date";
import { DateFilterComponent } from "@/components/admin/DateFilterComponent";

interface GuideWithRelations {
  id: string;
  procedure: string;
  value?: string;
  createdAt?: string;
  clientName?: string;
  petName?: string;
}

interface AtendimentosResponse {
  data: GuideWithRelations[];
  total: number;
  totalPages: number;
  page: number;
}

const allColumns = [
  "Nº",
  "Data",
  "Cliente",
  "Procedimento",
  "Copart",
  "Pago"
] as const;

export default function UnitRelatorioFinanceiro({ unitSlug }: { unitSlug: string }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { visibleColumns, toggleColumn } = useColumnPreferences('unit.relatorio-financeiro.columns', allColumns);
  const pageSize = 10;

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

  const handleDateRangeChange = (startDate: CalendarDate | null, endDate: CalendarDate | null) => {
    setDateFilter({ startDate, endDate });
    setCurrentPage(1); // Reset para página 1 ao filtrar por data
  };

  const { data: guides, isLoading, isError, error } = useQuery<AtendimentosResponse>({
    queryKey: [`/api/units/${unitSlug}/guides`],
    queryFn: async () => {
      const token = localStorage.getItem('unit-token');
      if (!token) {
        throw new Error('Token de autenticação não encontrado');
      }

      const response = await fetch(`/api/units/${unitSlug}/guides?page=1&limit=1000`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Token inválido ou expirado');
        }
        throw new Error(`Erro ao buscar atendimentos: ${response.statusText}`);
      }

      return response.json();
    },
    enabled: !!unitSlug
  });

  const guidesData = guides?.data || [];

  // Filter guides by search query and date
  const filteredGuides = useMemo(() => {
    return guidesData.filter(guide => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || (
        (guide.clientName && guide.clientName.toLowerCase().includes(searchLower)) ||
        (guide.procedure && guide.procedure.toLowerCase().includes(searchLower))
      );

      // Date filter
      let matchesDate = true;
      if (debouncedDateFilter.startDate || debouncedDateFilter.endDate) {
        if (!guide.createdAt) {
          matchesDate = false;
        } else {
          const guideDate = new Date(guide.createdAt);
          
          if (debouncedDateFilter.startDate) {
            const startDate = new Date(
              debouncedDateFilter.startDate.year,
              debouncedDateFilter.startDate.month - 1,
              debouncedDateFilter.startDate.day
            );
            if (guideDate < startDate) {
              matchesDate = false;
            }
          }
          
          if (debouncedDateFilter.endDate && matchesDate) {
            const endDate = new Date(
              debouncedDateFilter.endDate.year,
              debouncedDateFilter.endDate.month - 1,
              debouncedDateFilter.endDate.day,
              23, 59, 59
            );
            if (guideDate > endDate) {
              matchesDate = false;
            }
          }
        }
      }

      return matchesSearch && matchesDate;
    });
  }, [guidesData, searchQuery, debouncedDateFilter]);

  // Sort by date (newest first)
  const sortedGuides = useMemo(() => {
    return [...filteredGuides].sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [filteredGuides]);

  // Pagination
  const totalPages = Math.ceil(sortedGuides.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const displayGuides = sortedGuides.slice(startIndex, endIndex);

  // Format currency
  const formatCurrency = (value?: string) => {
    if (!value) return 'R$ 0,00';
    const numValue = parseFloat(value);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return '-';
    }
  };

  // Reset to page 1 when search changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground break-words">Relatório Financeiro</h1>
          <p className="text-sm text-muted-foreground">Visualize todos os procedimentos e valores cobrados</p>
        </div>
      </div>

      {/* Date Filter */}
      <DateFilterComponent
        onDateRangeChange={handleDateRangeChange}
        isLoading={isLoading}
        initialRange={dateFilter}
      />

      {/* Search and Column Preferences */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente ou procedimento..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
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
            <DropdownMenuContent align="end" className="w-40">
              {allColumns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column}
                  checked={visibleColumns.includes(column)}
                  onCheckedChange={() => toggleColumn(column)}
                  className="mb-1"
                >
                  {column}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white border border-[#eaeaea] rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando relatório...</p>
            </div>
          </div>
        ) : isError ? (
          <div className="text-center py-12 px-4">
            <DollarSign className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-semibold mb-2">Erro ao carregar relatório</p>
            <p className="text-muted-foreground text-sm mb-4">
              {error?.message || 'Não foi possível carregar o relatório financeiro'}
            </p>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
            >
              Tentar novamente
            </Button>
          </div>
        ) : sortedGuides.length === 0 ? (
          <div className="text-center py-12 px-4">
            <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? 'Nenhum resultado encontrado para a busca' : 'Nenhum procedimento encontrado'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {visibleColumns.includes("Nº") && (
                      <TableHead className="w-[80px]">Nº</TableHead>
                    )}
                    {visibleColumns.includes("Data") && (
                      <TableHead className="w-[120px]">Data</TableHead>
                    )}
                    {visibleColumns.includes("Cliente") && (
                      <TableHead>Cliente</TableHead>
                    )}
                    {visibleColumns.includes("Procedimento") && (
                      <TableHead>Procedimento</TableHead>
                    )}
                    {visibleColumns.includes("Copart") && (
                      <TableHead className="text-right w-[120px]">Copart</TableHead>
                    )}
                    {visibleColumns.includes("Pago") && (
                      <TableHead className="text-right w-[120px]">Pago</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayGuides.map((guide, index) => {
                    const sequentialNumber = startIndex + index + 1;
                    return (
                      <TableRow key={guide.id}>
                        {visibleColumns.includes("Nº") && (
                          <TableCell className="font-medium">{sequentialNumber}</TableCell>
                        )}
                        {visibleColumns.includes("Data") && (
                          <TableCell>{formatDate(guide.createdAt)}</TableCell>
                        )}
                        {visibleColumns.includes("Cliente") && (
                          <TableCell>{guide.clientName || '-'}</TableCell>
                        )}
                        {visibleColumns.includes("Procedimento") && (
                          <TableCell>{guide.procedure || '-'}</TableCell>
                        )}
                        {visibleColumns.includes("Copart") && (
                          <TableCell className="text-right font-medium">
                            {formatCurrency(guide.value)}
                          </TableCell>
                        )}
                        {visibleColumns.includes("Pago") && (
                          <TableCell className="text-right font-medium text-green-600">
                            {formatCurrency(guide.value)}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Mostrando {startIndex + 1} a {Math.min(endIndex, sortedGuides.length)} de {sortedGuides.length} resultados
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
