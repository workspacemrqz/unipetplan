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
import { Search, FileText, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDate } from "@internationalized/date";
import { DateFilterComponent } from "@/components/admin/DateFilterComponent";
import { getDateRangeParams } from "@/lib/date-utils";
import { useColumnPreferences } from "@/hooks/admin/use-column-preferences";

interface FinancialEntry {
  id: string;
  date: string;
  clientName: string;
  petName: string;
  procedure: string;
  coparticipacao: string;
  value: string;
}

const allColumns = [
  "Nº",
  "Data",
  "Cliente",
  "Procedimento",
  "Coparticipação",
  "Pago",
] as const;

export default function UnitRelatorioFinanceiro({ unitSlug }: { unitSlug: string }) {
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { visibleColumns, toggleColumn } = useColumnPreferences(`unit-${unitSlug}-relatorio-financeiro.columns`, allColumns);
  
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
    }, 500);

    return () => clearTimeout(timer);
  }, [dateFilter]);

  const handleDateRangeChange = (startDate: CalendarDate | null, endDate: CalendarDate | null) => {
    setDateFilter({ startDate, endDate });
  };

  useEffect(() => {
    if (unitSlug) {
      fetchFinancialReport();
    }
  }, [unitSlug, debouncedDateFilter]);

  const fetchFinancialReport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('unit-token');
      const dateParams = getDateRangeParams(debouncedDateFilter.startDate, debouncedDateFilter.endDate);
      const queryParams = new URLSearchParams(dateParams as any);
      
      const response = await fetch(`/api/units/${unitSlug}/relatorio-financeiro?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEntries(data);
      }
    } catch (error) {
      console.error('Erro ao buscar relatório financeiro:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: string) => {
    const numValue = parseFloat(value || '0');
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  };

  // Filter entries by search query
  const filteredEntries = searchQuery
    ? entries.filter(entry =>
        entry.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.petName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.procedure.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : entries;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground break-words">Relatório Financeiro</h1>
          <p className="text-sm text-muted-foreground">Visualize todos os procedimentos realizados pela unidade</p>
        </div>
      </div>

      {/* Date Filter */}
      <DateFilterComponent
        onDateRangeChange={handleDateRangeChange}
        isLoading={loading ||
          (dateFilter.startDate !== debouncedDateFilter.startDate ||
            dateFilter.endDate !== debouncedDateFilter.endDate)}
        initialRange={dateFilter}
      />

      {/* Filters and Column Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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

      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm">
        <div className="rounded-lg overflow-hidden">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-white border-b border-[#eaeaea]">
                {visibleColumns.includes("Nº") && <TableHead className="w-[100px] bg-white">Nº</TableHead>}
                {visibleColumns.includes("Data") && <TableHead className="w-[120px] bg-white">Data</TableHead>}
                {visibleColumns.includes("Cliente") && <TableHead className="w-[200px] bg-white">Cliente</TableHead>}
                {visibleColumns.includes("Procedimento") && <TableHead className="w-[180px] bg-white">Procedimento</TableHead>}
                {visibleColumns.includes("Coparticipação") && <TableHead className="w-[120px] bg-white">Coparticipação</TableHead>}
                {visibleColumns.includes("Pago") && <TableHead className="w-[120px] bg-white">Pago</TableHead>}
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
              ) : filteredEntries && filteredEntries.length > 0 ? (
                filteredEntries.map((entry, index) => (
                  <TableRow key={entry.id} className="bg-white border-b border-[#eaeaea]">
                    {visibleColumns.includes("Nº") && (
                      <TableCell className="font-medium bg-white">
                        {index + 1}
                      </TableCell>
                    )}
                    {visibleColumns.includes("Data") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        {entry.date && format(new Date(entry.date), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                    )}
                    {visibleColumns.includes("Cliente") && (
                      <TableCell className="bg-white">
                        <div className="flex flex-col">
                          <span className="font-medium">{entry.clientName}</span>
                          {entry.petName && (
                            <span className="text-sm text-muted-foreground">{entry.petName}</span>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.includes("Procedimento") && (
                      <TableCell className="bg-white">
                        {entry.procedure}
                      </TableCell>
                    )}
                    {visibleColumns.includes("Coparticipação") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        {formatCurrency(entry.coparticipacao)}
                      </TableCell>
                    )}
                    {visibleColumns.includes("Pago") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        {formatCurrency(entry.value)}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow className="bg-white border-b border-[#eaeaea]">
                  <TableCell colSpan={visibleColumns.length} className="text-center py-12 bg-white">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Nenhum procedimento realizado ainda.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}