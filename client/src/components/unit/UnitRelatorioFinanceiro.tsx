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
import { Search, FileText, MoreHorizontal, Eye, Copy, Check, Loader2, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDate } from "@internationalized/date";
import { DateFilterComponent } from "@/components/admin/DateFilterComponent";
import { getDateRangeParams } from "@/lib/date-utils";
import { useColumnPreferences } from "@/hooks/admin/use-column-preferences";
import { useToast } from "@/hooks/use-toast";
import { ExportButton } from "@/components/admin/ExportButton";
import jsPDF from 'jspdf';

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
  "Ações",
] as const;

export default function UnitRelatorioFinanceiro({ unitSlug }: { unitSlug: string }) {
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { visibleColumns, toggleColumn } = useColumnPreferences(`unit-${unitSlug}-relatorio-financeiro.columns`, allColumns);
  const [selectedEntry, setSelectedEntry] = useState<FinancialEntry | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied'>('idle');
  const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'downloaded'>('idle');
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

  // Debounce search query
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  useEffect(() => {
    if (unitSlug) {
      fetchFinancialReport();
    }
  }, [unitSlug, debouncedDateFilter, debouncedSearchQuery]);

  const fetchFinancialReport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('unit-token');
      const dateParams = getDateRangeParams(debouncedDateFilter.startDate, debouncedDateFilter.endDate);
      const queryParams = new URLSearchParams({
        ...dateParams,
        ...(debouncedSearchQuery ? { search: debouncedSearchQuery } : {})
      } as any);
      
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

  // Entries are already filtered and sorted by the backend
  const filteredEntries = entries;

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

  const handleDownloadPDF = async () => {
    if (!selectedEntry || downloadState !== 'idle') return;
    
    try {
      setDownloadState('downloading');
      
      // Criar novo documento PDF
      const pdf = new jsPDF();
      
      // Configurar fontes e cores
      pdf.setFontSize(16);
      pdf.setTextColor(40, 40, 40);
      pdf.text('DETALHES DO PROCEDIMENTO', 105, 20, { align: 'center' });
      
      // Adicionar linha separadora
      pdf.setDrawColor(39, 118, 119); // Cor primária
      pdf.setLineWidth(0.5);
      pdf.line(20, 25, 190, 25);
      
      // Configurar fonte para o conteúdo
      pdf.setFontSize(12);
      pdf.setTextColor(60, 60, 60);
      
      // Posição inicial para o texto
      let yPosition = 40;
      
      // Adicionar informações do procedimento
      pdf.setFont('helvetica', 'bold');
      pdf.text('Informações do Procedimento', 20, yPosition);
      pdf.setFont('helvetica', 'normal');
      yPosition += 10;
      
      // Data
      pdf.setFont('helvetica', 'bold');
      pdf.text('Data:', 20, yPosition);
      pdf.setFont('helvetica', 'normal');
      const dataText = selectedEntry.date ? format(new Date(selectedEntry.date), "dd/MM/yyyy", { locale: ptBR }) : "Não informado";
      pdf.text(dataText, 35, yPosition);
      yPosition += 8;
      
      // Cliente
      pdf.setFont('helvetica', 'bold');
      pdf.text('Cliente:', 20, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(selectedEntry.clientName, 40, yPosition);
      yPosition += 8;
      
      // Pet
      pdf.setFont('helvetica', 'bold');
      pdf.text('Pet:', 20, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(selectedEntry.petName || "Não informado", 32, yPosition);
      yPosition += 8;
      
      // Procedimento
      pdf.setFont('helvetica', 'bold');
      pdf.text('Procedimento:', 20, yPosition);
      pdf.setFont('helvetica', 'normal');
      const procedureText = selectedEntry.procedure;
      const procedureLines = pdf.splitTextToSize(procedureText, 130);
      pdf.text(procedureLines, 52, yPosition);
      yPosition += (procedureLines.length * 5) + 3;
      
      // Coparticipação
      pdf.setFont('helvetica', 'bold');
      pdf.text('Coparticipação:', 20, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(formatCurrency(selectedEntry.coparticipacao), 55, yPosition);
      yPosition += 8;
      
      // Valor Pago
      pdf.setFont('helvetica', 'bold');
      pdf.text('Valor Pago:', 20, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(formatCurrency(selectedEntry.value), 47, yPosition);
      yPosition += 15;
      
      // Unidade (se disponível)
      if (unitSlug) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Unidade:', 20, yPosition);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Hospital Veterinário Animal\'s 24 Horas', 40, yPosition);
        yPosition += 8;
      }
      
      // Adicionar linha separadora no final
      pdf.setDrawColor(39, 118, 119);
      pdf.setLineWidth(0.5);
      pdf.line(20, yPosition + 5, 190, yPosition + 5);
      
      // Adicionar rodapé
      pdf.setFontSize(10);
      pdf.setTextColor(150, 150, 150);
      const dataGeracao = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      pdf.text(`Documento gerado em ${dataGeracao}`, 105, 280, { align: 'center' });
      
      // Gerar nome do arquivo
      const fileName = `procedimento_${selectedEntry.clientName.replace(/\s+/g, '_')}_${format(new Date(), 'dd-MM-yyyy')}.pdf`;
      
      // Baixar o PDF
      pdf.save(fileName);
      
      setDownloadState('downloaded');
      
      toast({
        title: "PDF gerado com sucesso!",
        description: "O arquivo foi baixado para o seu dispositivo.",
      });
      
      setTimeout(() => {
        setDownloadState('idle');
      }, 2000);
    } catch (error) {
      setDownloadState('idle');
      toast({
        title: "Erro ao gerar PDF",
        description: "Não foi possível gerar o PDF. Tente novamente.",
        variant: "destructive",
      });
      console.error('Erro ao gerar PDF:', error);
    }
  };

  // Função auxiliar para buscar todos os dados do relatório financeiro
  const fetchAllFinancialData = async (): Promise<FinancialEntry[]> => {
    try {
      const token = localStorage.getItem('unit-token');
      const dateParams = getDateRangeParams(debouncedDateFilter.startDate, debouncedDateFilter.endDate);
      // Adicionar limit para garantir que busca todos os registros
      const allDataParams = {
        ...dateParams,
        limit: "999999" // Fetch all records
      };
      const queryParams = new URLSearchParams(allDataParams as any);
      
      const response = await fetch(`/api/units/${unitSlug}/relatorio-financeiro?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Apply search filter if needed
        if (searchQuery) {
          return data.filter((entry: FinancialEntry) =>
            entry.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            entry.petName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            entry.procedure.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        return data;
      }
      return [];
    } catch (error) {
      console.error('Erro ao buscar todos os dados financeiros:', error);
      return [];
    }
  };

  // Preparar dados para PDF - apenas campos visíveis
  const preparePdfData = async () => {
    // Fetch all data for export
    const allData = await fetchAllFinancialData();
    
    return allData.map((entry, index) => {
      const pdfData: any = {};
      
      if (visibleColumns.includes("Nº")) {
        pdfData['Nº'] = (index + 1).toString();
      }
      if (visibleColumns.includes("Data")) {
        pdfData['Data'] = entry.date ? format(new Date(entry.date), "dd/MM/yyyy", { locale: ptBR }) : '';
      }
      if (visibleColumns.includes("Cliente")) {
        pdfData['Cliente'] = entry.clientName || '';
      }
      if (visibleColumns.includes("Procedimento")) {
        pdfData['Procedimento'] = entry.procedure || '';
      }
      if (visibleColumns.includes("Coparticipação")) {
        pdfData['Coparticipação'] = formatCurrency(entry.coparticipacao);
      }
      if (visibleColumns.includes("Pago")) {
        pdfData['Pago'] = formatCurrency(entry.value);
      }
      
      return pdfData;
    });
  };

  // Preparar dados para Excel - todos os campos incluindo detalhes completos
  const prepareExcelData = async () => {
    // Fetch all data for export
    const allData = await fetchAllFinancialData();
    
    let totalCoparticipacao = 0;
    let totalPago = 0;
    
    const data = allData.map((entry, index) => {
      const copValue = parseFloat(entry.coparticipacao || '0');
      const paidValue = parseFloat(entry.value || '0');
      
      totalCoparticipacao += copValue;
      totalPago += paidValue;
      
      return {
        // === IDENTIFICAÇÃO ===
        '📋 Número': (index + 1).toString(),
        '🆔 ID': entry.id || '',
        
        // === DATA ===
        '📅 Data': entry.date ? format(new Date(entry.date), "dd/MM/yyyy", { locale: ptBR }) : '',
        '📆 Data Completa': entry.date ? format(new Date(entry.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '',
        
        // === CLIENTE E PET ===
        '👤 Cliente': entry.clientName || '',
        '🐾 Pet': entry.petName || 'Não informado',
        
        // === PROCEDIMENTO ===
        '💉 Procedimento': entry.procedure || '',
        
        // === VALORES FINANCEIROS ===
        '💳 Coparticipação': formatCurrency(entry.coparticipacao),
        '💰 Valor Pago': formatCurrency(entry.value),
        '📊 Diferença': formatCurrency(String(paidValue - copValue)),
        
        // === STATUS ===
        '✅ Status Pagamento': paidValue > 0 ? 'Pago' : 'Pendente',
      };
    });
    
    // Adicionar linha de totais ao final
    if (data.length > 0) {
      data.push({
        '📋 Número': '',
        '🆔 ID': '',
        '📅 Data': '',
        '📆 Data Completa': '',
        '👤 Cliente': 'TOTAIS',
        '🐾 Pet': '',
        '💉 Procedimento': '',
        '💳 Coparticipação': formatCurrency(String(totalCoparticipacao)),
        '💰 Valor Pago': formatCurrency(String(totalPago)),
        '📊 Diferença': formatCurrency(String(totalPago - totalCoparticipacao)),
        '✅ Status Pagamento': '',
      });
    }
    
    return data;
  };

  // Definir colunas para PDF (apenas visíveis)
  const getPdfColumns = () => {
    const columns = [];
    
    if (visibleColumns.includes("Nº")) {
      columns.push({ key: 'Nº', label: 'Nº' });
    }
    if (visibleColumns.includes("Data")) {
      columns.push({ key: 'Data', label: 'Data' });
    }
    if (visibleColumns.includes("Cliente")) {
      columns.push({ key: 'Cliente', label: 'Cliente' });
    }
    if (visibleColumns.includes("Procedimento")) {
      columns.push({ key: 'Procedimento', label: 'Procedimento' });
    }
    if (visibleColumns.includes("Coparticipação")) {
      columns.push({ key: 'Coparticipação', label: 'Coparticipação' });
    }
    if (visibleColumns.includes("Pago")) {
      columns.push({ key: 'Pago', label: 'Pago' });
    }
    
    return columns;
  };

  // Definir colunas para Excel (todos os campos)
  const getExcelColumns = () => {
    return [
      { key: '📋 Número', label: '📋 Número' },
      { key: '🆔 ID', label: '🆔 ID' },
      { key: '📅 Data', label: '📅 Data' },
      { key: '👤 Cliente', label: '👤 Cliente' },
      { key: '🐾 Pet', label: '🐾 Pet' },
      { key: '💉 Procedimento', label: '💉 Procedimento' },
      { key: '💳 Coparticipação', label: '💳 Coparticipação' },
      { key: '💰 Valor Pago', label: '💰 Valor Pago' },
      { key: '📊 Diferença', label: '📊 Diferença' },
      { key: '✅ Status Pagamento', label: '✅ Status Pagamento' }
    ];
  };

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
          <ExportButton 
            data={filteredEntries}
            preparePdfData={() => preparePdfData()}
            prepareExcelData={() => prepareExcelData()}
            pdfColumns={getPdfColumns()}
            excelColumns={getExcelColumns()}
            filename="relatorio_financeiro_unidade"
            title="Exportação de Relatório Financeiro"
            pageName="Relatório Financeiro da Unidade"
            visibleColumns={visibleColumns}
            disabled={loading || filteredEntries.length === 0}
          />
          
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
                onClick={handleDownloadPDF}
                disabled={downloadState === 'downloading'}
                className={`gap-2 h-8 transition-all duration-300 ${
                  downloadState === 'downloaded' ? 'bg-[#e6f4f4] border-[#277677] text-[#277677]' : ''
                }`}
              >
                {downloadState === 'downloading' && <Loader2 className="h-4 w-4 animate-spin" />}
                {downloadState === 'downloaded' && <Check className="h-4 w-4" />}
                {downloadState === 'idle' && <Download className="h-4 w-4" />}
                {downloadState === 'downloading' ? 'Baixando...' : downloadState === 'downloaded' ? 'Baixado!' : 'Baixar PDF'}
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