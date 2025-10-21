import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Badge } from "@/components/admin/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select";
import { Separator } from "@/components/admin/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
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
import { Search, FileText, Eye, Copy, MoreHorizontal, ChevronLeft, ChevronRight, Check, Loader2, Plus, Edit, Clock, User, Calendar } from "lucide-react";
import { useLocation } from "wouter";

// Types for atendimentos data
interface AtendimentoWithNetworkUnit {
  id: string;
  procedure: string;
  procedureName?: string;
  procedures?: Array<{
    procedureName?: string;
    name?: string;
    value?: string;
    procedureId?: string;
    coparticipacao?: string;
  }>;
  status: string;
  value?: string;
  createdAt?: string;
  updatedAt?: string;
  networkUnit?: {
    id: string;
    name: string;
  };
  clientName?: string;
  clientCPF?: string;
  petName?: string;
  procedureNotes?: string;
  generalNotes?: string;
  veterinarianName?: string;
}

interface AtendimentosResponse {
  data: AtendimentoWithNetworkUnit[];
  total: number;
  totalPages: number;
  page: number;
}
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDate } from "@internationalized/date";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { useConfirmDialog } from "@/hooks/admin/use-confirm-dialog";
import { PasswordDialog } from "@/components/admin/ui/password-dialog";
import { usePasswordDialog } from "@/hooks/admin/use-password-dialog";
import { useColumnPreferences } from "@/hooks/admin/use-column-preferences";
import { DateFilterComponent } from "@/components/admin/DateFilterComponent";
import { getDateRangeParams } from "@/lib/date-utils";
import { cn, capitalizeFirst } from "@/lib/utils";
import { getQueryOptions } from "@/lib/admin/queryClient";
import { ExportButton } from "@/components/admin/ExportButton";

const allColumns = [
  "Procedimento",
  "Unidade",
  "Valor",
  "Status",
  "Data",
  "Ações",
] as const;

export default function Atendimentos() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedAtendimento, setSelectedAtendimento] = useState<AtendimentoWithNetworkUnit | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingAtendimento, setEditingAtendimento] = useState<AtendimentoWithNetworkUnit | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyAtendimento, setHistoryAtendimento] = useState<AtendimentoWithNetworkUnit | null>(null);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied'>('idle');
  const { visibleColumns, toggleColumn } = useColumnPreferences('atendimentos.columns', allColumns);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const { toast } = useToast();
  const confirmDialog = useConfirmDialog();
  const passwordDialog = usePasswordDialog();
  const queryClient = useQueryClient();

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

  // Get date range parameters for API calls using debounced values
  const dateParams = getDateRangeParams(debouncedDateFilter.startDate, debouncedDateFilter.endDate);

  // Construct parameters object for the enhanced getQueryFn
  const queryParams = {
    page: currentPage.toString(),
    limit: pageSize.toString(),
    ...(searchQuery && { search: searchQuery }),
    ...(statusFilter !== "all" && { status: statusFilter }),
    ...dateParams
  };

  const { data: atendimentos, isLoading } = useQuery<AtendimentosResponse>({
    queryKey: ["/admin/api/atendimentos/with-network-units", queryParams],
    ...getQueryOptions('atendimentos'),
    // Using standard queryClient fetcher that supports [path, params] format and handles 401s globally
  });


  const atendimentosData = atendimentos?.data || [];
  const totalAtendimentos = atendimentos?.total || 0;
  const totalPages = atendimentos?.totalPages || 1;



  const handleViewDetails = (atendimento: AtendimentoWithNetworkUnit) => {
    setSelectedAtendimento(atendimento);
    setDetailsOpen(true);
  };

  const handleEdit = (atendimento: AtendimentoWithNetworkUnit) => {
    setEditingAtendimento(atendimento);
    setNewStatus(atendimento.status);
    setEditOpen(true);
  };

  const handleViewHistory = async (atendimento: AtendimentoWithNetworkUnit) => {
    setHistoryAtendimento(atendimento);
    setHistoryOpen(true);
    
    try {
      const response = await fetch(`/admin/api/atendimentos/${atendimento.id}/history`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const history = await response.json();
        setHistoryLogs(history);
      } else {
        console.error('Failed to fetch atendimento history');
        setHistoryLogs([]);
      }
    } catch (error) {
      console.error('Error fetching atendimento history:', error);
      setHistoryLogs([]);
    }
  };

  const handleSaveStatus = async () => {
    if (!editingAtendimento) return;
    
    setIsSaving(true);
    
    try {
      const response = await fetch(`/admin/api/atendimentos/${editingAtendimento.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao atualizar status");
      }

      toast({
        title: "Status atualizado",
        description: "O status do atendimento foi atualizado com sucesso.",
      });

      setEditOpen(false);
      setEditingAtendimento(null);
      
      // Invalidar as queries para recarregar os dados
      await queryClient.invalidateQueries({ queryKey: ["/admin/api/atendimentos/with-network-units"] });
      await queryClient.invalidateQueries({ queryKey: ["/admin/api/atendimentos"] });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const generateAtendimentoText = () => {
    if (!selectedAtendimento) return "";

    let text = "";
    
    // Cabeçalho
    text += "=".repeat(50) + "\n";
    text += "Informações do Atendimento\n";
    text += "=".repeat(50) + "\n\n";

    // Informações Básicas
    text += "INFORMAÇÕES BÁSICAS:\n";
    text += "-".repeat(25) + "\n";
    text += `Nome do Procedimento: ${selectedAtendimento.procedure || selectedAtendimento.procedureName || 'Não informado'}\n`;
    text += `Status: ${getStatusLabel(selectedAtendimento.status)}\n`;
    text += `Valor: R$ ${selectedAtendimento.value || 'Não informado'}\n\n`;

    // Informações do Cliente, Pet e Unidade
    if (selectedAtendimento.clientName || selectedAtendimento.petName || selectedAtendimento.networkUnit?.name) {
      text += "INFORMAÇÕES DO CLIENTE, PET E UNIDADE:\n";
      text += "-".repeat(40) + "\n";
      if (selectedAtendimento.clientName) {
        text += `Cliente: ${selectedAtendimento.clientName}\n`;
      }
      if (selectedAtendimento.petName) {
        text += `Pet: ${selectedAtendimento.petName}\n`;
      }
      if (selectedAtendimento.networkUnit?.name) {
        text += `Unidade: ${selectedAtendimento.networkUnit.name}\n`;
      }
      text += "\n";
    }

    // Notas do Procedimento
    if (selectedAtendimento.procedureNotes) {
      text += "NOTAS DO PROCEDIMENTO:\n";
      text += "-".repeat(25) + "\n";
      text += `${selectedAtendimento.procedureNotes}\n\n`;
    }

    // Notas Gerais
    if (selectedAtendimento.generalNotes) {
      text += "NOTAS GERAIS:\n";
      text += "-".repeat(15) + "\n";
      text += `${selectedAtendimento.generalNotes}\n\n`;
    }

    // Informações do Cadastro
    text += "INFORMAÇÕES DO CADASTRO:\n";
    text += "-".repeat(25) + "\n";
    text += `Criado por: ${selectedAtendimento.veterinarianName || 'Unidade'}\n`;
    text += `Data de Criação: ${selectedAtendimento.createdAt ? format(new Date(selectedAtendimento.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : "Não informado"}\n`;
    if (selectedAtendimento.updatedAt) {
      text += `Última Atualização: ${format(new Date(selectedAtendimento.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}\n`;
    }

    text += "\n" + "=".repeat(50) + "\n";
    text += `Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}\n`;
    text += "=".repeat(50);

    return text;
  };

  const handleCopyToClipboard = async () => {
    if (copyState !== 'idle') return;
    
    try {
      setCopyState('copying');
      const text = generateAtendimentoText();
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

  const prepareExportData = async () => {
    // Buscar TODOS os dados com os filtros aplicados (sem paginação)
    const queryParamsForExport = {
      limit: "999999", // Número muito grande para buscar todos os registros
      ...(searchQuery && { search: searchQuery }),
      ...(statusFilter !== "all" && { status: statusFilter }),
      ...dateParams
    };
    
    const params = new URLSearchParams(queryParamsForExport);
    const response = await fetch(`/admin/api/atendimentos/with-network-units?${params}`);
    
    if (!response.ok) {
      throw new Error('Erro ao buscar dados para exportação');
    }
    
    const allData: AtendimentosResponse = await response.json();
    const allAtendimentos = allData.data || [];
    
    // Format data ensuring all values are strings
    return allAtendimentos.map(atendimento => {
      // Process procedures safely
      let proceduresText = 'Não informado';
      if (atendimento.procedures && Array.isArray(atendimento.procedures) && atendimento.procedures.length > 0) {
        proceduresText = atendimento.procedures
          .map((p: any) => String(p.procedureName || p.name || 'Procedimento'))
          .filter(name => name && name !== 'undefined' && name !== 'null')
          .join(', ');
      }
      
      // Format value safely
      let valueText = 'R$ 0,00';
      if (atendimento.value != null) {
        const numValue = parseFloat(String(atendimento.value)) || 0;
        valueText = `R$ ${numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      
      // Format dates safely
      const formatDate = (dateStr: any) => {
        if (!dateStr) return '';
        try {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return '';
          return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
        } catch {
          return '';
        }
      };
      
      return {
        'Procedimentos': proceduresText,
        'Unidade': String(atendimento.networkUnit?.name || 'Não informada'),
        'Cliente': String(atendimento.clientName || 'Não informado'),
        'Pet': String(atendimento.petName || 'Não informado'),
        'Valor': valueText,
        'Status': String(getStatusLabel(atendimento.status) || 'Pendente'),
        'Veterinário': String(atendimento.veterinarianName || 'Unidade'),
        'Notas Procedimento': String(atendimento.procedureNotes || ''),
        'Notas Gerais': String(atendimento.generalNotes || ''),
        'Data Criação': formatDate(atendimento.createdAt),
        'Atualização': formatDate(atendimento.updatedAt)
      };
    });
  };

  const getStatusColor = () => {
    return "border border-border rounded-lg bg-background text-foreground";
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "open": return "Aberta";
      case "closed": return "Concluída";
      case "cancelled": return "Cancelada";
      default: return status;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground break-words">Atendimentos</h1>
          <p className="text-sm text-muted-foreground">Visualize todos os atendimentos gerados pelas unidades da rede</p>
        </div>
      </div>

      {/* Date Filter */}
      <DateFilterComponent
        onDateRangeChange={handleDateRangeChange}
        isLoading={isLoading ||
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
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset para página 1 ao buscar
              }}
              className="pl-10 w-80"
              data-testid="input-search-atendimentos"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => {
            setStatusFilter(value);
            setCurrentPage(1); // Reset para página 1 ao filtrar
          }}>
            <SelectTrigger 
              className="w-48 [&>span]:text-left [&>span]:flex [&>span]:flex-col [&>span]:items-start" 
              data-testid="select-status-filter"
              style={{
                borderColor: 'var(--border-gray)',
                background: 'white'
              }}
            >
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              {[
                { value: "all", label: "Todos os status" },
                { value: "open", label: "Abertas" },
                { value: "closed", label: "Concluídas" },
                { value: "cancelled", label: "Canceladas" }
              ].flatMap((status, index, array) => [
                <SelectItem key={status.value} value={status.value} className="py-3 pl-10 pr-4 data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground">
                  {status.label}
                </SelectItem>,
                ...(index < array.length - 1 ? [<Separator key={`separator-${status.value}`} />] : [])
              ])}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="admin-action"
            size="sm"
            onClick={() => setLocation("/atendimentos/novo")}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>

          <ExportButton 
            data={atendimentosData}
            filename="atendimentos"
            title="Exportação de Atendimentos"
            pageName="Atendimentos"
            prepareData={prepareExportData}
            visibleColumns={visibleColumns}
            disabled={isLoading || atendimentosData.length === 0}
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

      {/* Modern Table Container */}
      <div className="container my-10 space-y-4 border border-[#eaeaea] rounded-lg bg-white shadow-sm">

        {/* Table */}
        <div className="rounded-lg overflow-hidden">
          <Table className="w-full">
          <TableHeader>
            <TableRow className="bg-white border-b border-[#eaeaea]">
              {visibleColumns.includes("Procedimento") && <TableHead className="w-[200px] bg-white">Procedimento</TableHead>}
              {visibleColumns.includes("Unidade") && <TableHead className="w-[180px] bg-white">Unidade</TableHead>}
              {visibleColumns.includes("Valor") && <TableHead className="w-[120px] bg-white">Valor</TableHead>}
              {visibleColumns.includes("Status") && <TableHead className="w-[100px] bg-white">Status</TableHead>}
              {visibleColumns.includes("Data") && <TableHead className="w-[120px] bg-white">Data</TableHead>}
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
            ) : atendimentosData && atendimentosData.length > 0 ? (
              atendimentosData.map((atendimento: AtendimentoWithNetworkUnit) => (
                <TableRow key={atendimento.id} className="bg-white border-b border-[#eaeaea]">
                  {visibleColumns.includes("Procedimento") && (
                    <TableCell className="font-medium bg-white">
                      <div className="flex flex-wrap gap-1">
                        {atendimento.procedures && atendimento.procedures.length > 0 ? (
                          atendimento.procedures.map((proc: any, index: number) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {capitalizeFirst(proc.procedureName || proc.name)}
                            </Badge>
                          ))
                        ) : atendimento.procedure ? (
                          atendimento.procedure.split(/[,/]/).map((proc: string, index: number) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {capitalizeFirst(proc.trim())}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="secondary" className="text-xs text-muted-foreground">
                            Não informado
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.includes("Unidade") && (
                    <TableCell className="whitespace-nowrap bg-white">
                      {atendimento.networkUnit?.name || "Não informada"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Valor") && (
                    <TableCell className="whitespace-nowrap bg-white">
                      R$ {parseFloat(atendimento.value || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Status") && (
                    <TableCell className="whitespace-nowrap bg-white">
                      <Badge className={cn("whitespace-nowrap", getStatusColor())}>
                        {getStatusLabel(atendimento.status)}
                      </Badge>
                    </TableCell>
                  )}
                  {visibleColumns.includes("Data") && (
                    <TableCell className="whitespace-nowrap bg-white">
                      {atendimento.createdAt && format(new Date(atendimento.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Ações") && (
                    <TableCell className="whitespace-nowrap bg-white">
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(atendimento)}
                          data-testid={`button-view-${atendimento.id}`}
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(atendimento)}
                          data-testid={`button-edit-${atendimento.id}`}
                          title="Editar status"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewHistory(atendimento)}
                          data-testid={`button-history-${atendimento.id}`}
                          title="Ver histórico de ações"
                        >
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow className="bg-white border-b border-[#eaeaea]">
                <TableCell colSpan={visibleColumns.length} className="text-center py-12 bg-white">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery || statusFilter !== "all" 
                      ? "Nenhum atendimento encontrado com os filtros aplicados." 
                      : "Nenhum atendimento foi gerado pelas unidades da rede ainda."
                    }
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
        
        {/* Pagination */}
        {totalAtendimentos > 10 && (
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">
                  {totalAtendimentos > 0 ? (
                    <>Mostrando {(currentPage - 1) * pageSize + 1} a {Math.min(currentPage * pageSize, totalAtendimentos)} de {totalAtendimentos} atendimentos</>
                  ) : (
                    "Nenhum atendimento encontrado"
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
                variant="admin-action"
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

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent hideCloseButton className="overflow-y-auto max-h-[75vh]">
          <DialogHeader className="flex flex-row items-center justify-between pr-2">
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-primary" />
              <span>Detalhes do Atendimento</span>
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleCopyToClipboard}
                disabled={copyState === 'copying'}
                className={`gap-2 h-8 transition-all duration-300 ${
                  copyState === 'copied' ? 'bg-[#e6f4f4] border-[#277677] text-[#277677]' : ''
                }`}
                data-testid="button-copy-details"
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
          
          {selectedAtendimento && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Informações Básicas</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span><strong className="text-primary">Procedimentos:</strong></span>
                    </div>
                    <div className="space-y-2 mt-2 pl-2 border-l-2 border-gray-200">
                      {selectedAtendimento.procedures && selectedAtendimento.procedures.length > 0 ? (
                        selectedAtendimento.procedures.map((proc: any, index: number) => (
                          <div 
                            key={index} 
                            className="pb-2 border-b border-gray-100 last:border-b-0 last:pb-0"
                          >
                            <p className="text-foreground break-words whitespace-pre-wrap font-medium">
                              {capitalizeFirst(proc.procedureName || proc.name)}
                            </p>
                            {proc.value && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Valor: R$ {parseFloat(proc.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                            )}
                          </div>
                        ))
                      ) : (
                        <span className="text-foreground break-words whitespace-pre-wrap">{capitalizeFirst(selectedAtendimento.procedure || 'Não informado')}</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Valor:</strong> <span className="text-foreground">R$ {parseFloat(selectedAtendimento.value || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Status:</strong></span>
                      <Badge className={getStatusColor()}>
                        {getStatusLabel(selectedAtendimento.status)}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">Cliente e Pet</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span><strong className="text-primary">Cliente:</strong> <span className="text-foreground">{selectedAtendimento.clientName || 'Não informado'}</span></span>
                    </div>
                    <div>
                      <span><strong className="text-primary">Pet:</strong> <span className="text-foreground">{selectedAtendimento.petName || 'Não informado'}</span></span>
                    </div>
                    <div>
                      <span><strong className="text-primary">Unidade:</strong> <span className="text-foreground">{selectedAtendimento.networkUnit?.name || 'Não informada'}</span></span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedAtendimento.procedureNotes && (
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Notas do Procedimento</h4>
                  <p className="text-sm text-foreground break-words whitespace-pre-wrap">{selectedAtendimento.procedureNotes}</p>
                </div>
              )}

              {selectedAtendimento.generalNotes && (
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Notas Gerais</h4>
                  <p className="text-sm text-foreground break-words whitespace-pre-wrap">{selectedAtendimento.generalNotes}</p>
                </div>
              )}

              <div className="pt-4 border-t">
                <h4 className="font-semibold text-foreground mb-2">Informações do Sistema</h4>
                <div className="space-y-1 text-sm">
                  <div>
                    <span><strong className="text-primary">Criado por:</strong> <span className="text-foreground">{selectedAtendimento.veterinarianName || 'Unidade'}</span></span>
                  </div>
                  <div>
                    <span><strong className="text-primary">Data de Criação:</strong> <span className="text-foreground">{selectedAtendimento.createdAt ? format(new Date(selectedAtendimento.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'Não informado'}</span></span>
                  </div>
                  {selectedAtendimento.updatedAt && (
                    <div>
                      <span><strong className="text-primary">Última Atualização:</strong> <span className="text-foreground">{format(new Date(selectedAtendimento.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span></span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Status Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Status do Atendimento</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger 
                  className="[&>span]:text-left [&>span]:flex [&>span]:flex-col [&>span]:items-start"
                  style={{
                    borderColor: 'var(--border-gray)',
                    background: 'white'
                  }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    { value: "open", label: "Aberta" },
                    { value: "closed", label: "Concluída" },
                    { value: "cancelled", label: "Cancelada" }
                  ].flatMap((status, index, array) => [
                    <SelectItem 
                      key={status.value} 
                      value={status.value}
                      className="py-3 pl-8 pr-4 data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground"
                    >
                      {status.label}
                    </SelectItem>,
                    ...(index < array.length - 1 ? [<Separator key={`separator-${status.value}`} />] : [])
                  ])}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              variant="admin-action"
              onClick={handleSaveStatus}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Dialog */}
      <PasswordDialog
        open={passwordDialog.isOpen}
        onOpenChange={passwordDialog.closeDialog}
        onConfirm={passwordDialog.confirm}
        title={passwordDialog.title ?? "Verificação de Senha"}
        description={passwordDialog.description ?? "Digite a senha do administrador para continuar:"}
        isLoading={passwordDialog.isLoading ?? false}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.isOpen}
        onOpenChange={confirmDialog.closeDialog}
        onConfirm={confirmDialog.confirm}
        title={confirmDialog.title ?? "Confirmar exclusão"}
        description={confirmDialog.description ?? "Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita."}
        confirmText={confirmDialog.confirmText ?? "Excluir"}
        cancelText={confirmDialog.cancelText ?? "Cancelar"}
        isLoading={confirmDialog.isLoading ?? false}
      />

      {/* History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent hideCloseButton className="overflow-y-auto max-h-[75vh]">
          <DialogHeader className="flex flex-row items-center justify-between pr-2">
            <DialogTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-primary" />
              <span>Histórico de Ações</span>
            </DialogTitle>
            <Button
              variant="outline"
              onClick={() => setHistoryOpen(false)}
              className="h-8"
            >
              Fechar
            </Button>
          </DialogHeader>
          
          {historyAtendimento && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-foreground mb-2">Informações do Atendimento</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Cliente:</span>
                    <span className="ml-2 text-foreground">{historyAtendimento.clientName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pet:</span>
                    <span className="ml-2 text-foreground">{historyAtendimento.petName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status Atual:</span>
                    <span className="ml-2 text-foreground">{getStatusLabel(historyAtendimento.status)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Valor:</span>
                    <span className="ml-2 text-foreground">
                      R$ {historyAtendimento.value ? parseFloat(historyAtendimento.value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-foreground mb-3">Histórico de Alterações</h4>
                {historyLogs.length > 0 ? (
                  <div className="space-y-3">
                    {historyLogs.map((log, index) => (
                      <div key={log.id || index} className="border-l-4 border-primary pl-4 pb-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-sm text-foreground">
                                {log.user_name || log.userName || 'Sistema'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({log.user_type || log.userType === 'admin' ? 'Administrador' : 
                                  log.user_type || log.userType === 'veterinarian' ? 'Veterinário' : 
                                  log.user_type || log.userType === 'unit' ? 'Unidade' : 'Sistema'})
                              </span>
                            </div>
                            <p className="text-sm text-foreground mb-1">
                              {log.description || 
                               (log.action_type || log.actionType === 'created' ? 'Atendimento criado' : 
                                log.action_type || log.actionType === 'status_changed' ? 'Status alterado' : 
                                log.action_type || log.actionType === 'field_updated' ? `Campo ${log.field_name || log.fieldName} atualizado` : 
                                'Ação realizada')}
                            </p>
                            {(log.old_value || log.oldValue || log.new_value || log.newValue) && (
                              <div className="text-xs text-muted-foreground bg-gray-50 rounded p-2 mt-1">
                                {log.old_value || log.oldValue && (
                                  <div>
                                    <span className="font-medium">De:</span> {log.old_value || log.oldValue}
                                  </div>
                                )}
                                {log.new_value || log.newValue && (
                                  <div>
                                    <span className="font-medium">Para:</span> {log.new_value || log.newValue}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {log.created_at || log.createdAt ? 
                              format(new Date(log.created_at || log.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 
                              'Data não disponível'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
                    <p>Nenhum histórico de alterações encontrado.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
