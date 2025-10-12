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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { Search, FileText, MoreHorizontal, Eye, Copy, Check, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDate } from "@internationalized/date";
import { DateFilterComponent } from "@/components/admin/DateFilterComponent";
import { getDateRangeParams } from "@/lib/date-utils";
import { useColumnPreferences } from "@/hooks/admin/use-column-preferences";
import { useToast } from "@/hooks/use-toast";

interface FinancialEntry {
  id: string;
  date: string;
  clientName: string;
  petName: string;
  procedure: string;
  coparticipacao: string;
  value: string;
  networkUnitName?: string;
}

const allColumns = [
  "Nº",
  "Data",
  "Cliente",
  "Procedimento",
  "Coparticipação",
  "Pago",
  "Ações",
] as const;

export default function RelatorioFinanceiro() {
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { visibleColumns, toggleColumn } = useColumnPreferences('relatorio-financeiro.columns', allColumns);
  const [selectedEntry, setSelectedEntry] = useState<FinancialEntry | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied'>('idle');
  const { toast } = useToast();
  
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
    fetchFinancialReport();
  }, [debouncedDateFilter]);

  const fetchFinancialReport = async () => {
    setLoading(true);
    try {
      const dateParams = getDateRangeParams(debouncedDateFilter.startDate, debouncedDateFilter.endDate);
      const queryParams = new URLSearchParams(dateParams as any);
      
      const response = await fetch(`/admin/api/relatorio-financeiro?${queryParams}`, {
        credentials: 'include'
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

  const handleViewDetails = (entry: FinancialEntry) => {
    setSelectedEntry(entry);
    setDetailsOpen(true);
  };

  const generateProcedureText = () => {
    if (!selectedEntry) return "";
    
    let text = "DETALHES DO PROCEDIMENTO\n";
    text += "=".repeat(50) + "\n\n";
    
    text += `Data: ${selectedEntry.date ? format(new Date(selectedEntry.date), "dd/MM/yyyy", { locale: ptBR }) : "Não informado"}\n`;
    text += `Cliente: ${selectedEntry.clientName}\n`;
    text += `Pet: ${selectedEntry.petName || "Não informado"}\n`;
    text += `Procedimento: ${selectedEntry.procedure}\n`;
    text += `Coparticipação: ${formatCurrency(selectedEntry.coparticipacao)}\n`;
    text += `Valor Pago: ${formatCurrency(selectedEntry.value)}\n`;
    if (selectedEntry.networkUnitName) {
      text += `Unidade: ${selectedEntry.networkUnitName}\n`;
    }
    
    text += "\n" + "=".repeat(50);
    
    return text;
  };

  const handleCopyToClipboard = async () => {
    if (copyState !== 'idle') return;
    
    try {
      setCopyState('copying');
      const text = generateProcedureText();
      await navigator.clipboard.writeText(text);
      
      setCopyState('copied');
      
      setTimeout(() => {
        setCopyState('idle');
      }, 2000);
    } catch (error) {
      setCopyState('idle');
      toast({
        title: "Erro",
        description: "Não foi possível copiar as informações. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground break-words">Relatório Financeiro</h1>
          <p className="text-sm text-muted-foreground">Visualize todos os procedimentos realizados em todas as unidades</p>
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
                {visibleColumns.includes("Ações") && <TableHead className="w-[100px] bg-white">Ações</TableHead>}
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
                    {visibleColumns.includes("Ações") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(entry)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
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

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent hideCloseButton>
          <DialogHeader className="flex flex-row items-center justify-between pr-2">
            <DialogTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-primary" />
              <span>Detalhes do Procedimento</span>
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleCopyToClipboard}
                disabled={copyState === 'copying'}
                className={`gap-2 h-8 transition-all duration-300 ${
                  copyState === 'copied' ? 'bg-[#e6f4f4] border-[#277677] text-[#277677]' : ''
                }`}
              >
                {copyState === 'copying' && <Loader2 className="h-4 w-4 animate-spin" />}
                {copyState === 'copied' && <Check className="h-4 w-4" />}
                {copyState === 'idle' && <Copy className="h-4 w-4" />}
                {copyState === 'copying' ? 'Copiando...' : copyState === 'copied' ? 'Copiado!' : 'Copiar'}
              </Button>
              <Button
                variant="outline" 
                onClick={() => setDetailsOpen(false)}
                className="h-8"
              >
                Fechar
              </Button>
            </div>
          </DialogHeader>
          
          {selectedEntry && (
            <div className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Informações do Procedimento</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Data:</strong> <span className="text-foreground break-words whitespace-pre-wrap">{selectedEntry.date ? format(new Date(selectedEntry.date), "dd/MM/yyyy", { locale: ptBR }) : "Não informado"}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Cliente:</strong> <span className="text-foreground break-words whitespace-pre-wrap">{selectedEntry.clientName}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Pet:</strong> <span className="text-foreground break-words whitespace-pre-wrap">{selectedEntry.petName || "Não informado"}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Procedimento:</strong> <span className="text-foreground break-words whitespace-pre-wrap">{selectedEntry.procedure}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Coparticipação:</strong> <span className="font-bold text-foreground break-words whitespace-pre-wrap">{formatCurrency(selectedEntry.coparticipacao)}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Valor Pago:</strong> <span className="font-bold text-foreground break-words whitespace-pre-wrap">{formatCurrency(selectedEntry.value)}</span></span>
                    </div>
                    {selectedEntry.networkUnitName && (
                      <div className="flex items-center space-x-2">
                        <span><strong className="text-primary">Unidade:</strong> <span className="text-foreground break-words whitespace-pre-wrap">{selectedEntry.networkUnitName}</span></span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
