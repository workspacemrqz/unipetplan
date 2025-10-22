import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Search, Eye, MoreHorizontal, ChevronLeft, ChevronRight, File, Copy, Check, Loader2, Edit } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDate } from "@internationalized/date";
import { useColumnPreferences } from "@/hooks/admin/use-column-preferences";
import { DateFilterComponent } from "@/components/admin/DateFilterComponent";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/admin/queryClient";
import { useAdminLogger } from "@/hooks/admin/use-admin-logger";
import { usePermissions } from "@/hooks/use-permissions";
import { ExportButton } from "@/components/admin/ExportButton";
import { normalizeCPF } from "@/../../shared/cpf-utils";
import { capitalizeFirst } from "@/lib/utils";

interface ContractWithDetails {
  id: string;
  contractNumber: string;
  status: string;
  startDate: string;
  endDate?: string;
  billingPeriod: string;
  monthlyAmount: string;
  annualAmount?: string;
  paymentMethod: string;
  hasCoparticipation: boolean;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientCPF?: string;
  petName?: string;
  petSpecies?: string;
  planName?: string;
  createdAt: string;
}

const allColumns = [
  "Contrato",
  "Cliente",
  "Pet",
  "Plano",
  "Status",
  "Valor Mensal",
  "Data Início",
  "Ações",
] as const;

const statusLabels: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
  suspended: "Suspenso",
  cancelled: "Cancelado",
  pending: "Pendente",
};

const statusStyle = "border border-border rounded-lg bg-background text-foreground";

const billingPeriodLabels: Record<string, string> = {
  monthly: "Mensal",
  annual: "Anual",
};

const paymentMethodLabels: Record<string, string> = {
  credit_card: "Cartão de Crédito",
  pix: "PIX",
  cartao: "Cartão",
};

export default function Contracts() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedContract, setSelectedContract] = useState<ContractWithDetails | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied'>('idle');
  const [editOpen, setEditOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<ContractWithDetails | null>(null);
  const [editMonthlyAmount, setEditMonthlyAmount] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const { visibleColumns, toggleColumn } = useColumnPreferences('contracts.columns', allColumns);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { logAction } = useAdminLogger();
  const { canEdit } = usePermissions();

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

  const { data: contracts = [], isLoading } = useQuery<ContractWithDetails[]>({
    queryKey: ["/admin/api/contracts"],
  });

  const filteredContracts = contracts
    .filter((contract) => {
      // Text search filter (includes CPF)
      const normalizedSearchQuery = normalizeCPF(searchQuery);
      const normalizedContractCPF = contract.clientCPF ? normalizeCPF(contract.clientCPF) : '';
      
      const matchesSearch = !searchQuery || 
        contract.contractNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contract.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contract.petName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        normalizedContractCPF.includes(normalizedSearchQuery);

      // Status filter
      const matchesStatus = statusFilter === "all" || contract.status === statusFilter;

      // Date filter
      let matchesDate = true;
      if (debouncedDateFilter.startDate || debouncedDateFilter.endDate) {
        const contractDate = new Date(contract.startDate);
        
        if (debouncedDateFilter.startDate) {
          const startDate = new Date(
            debouncedDateFilter.startDate.year,
            debouncedDateFilter.startDate.month - 1,
            debouncedDateFilter.startDate.day
          );
          if (contractDate < startDate) matchesDate = false;
        }
        
        if (debouncedDateFilter.endDate) {
          const endDate = new Date(
            debouncedDateFilter.endDate.year,
            debouncedDateFilter.endDate.month - 1,
            debouncedDateFilter.endDate.day
          );
          endDate.setHours(23, 59, 59, 999);
          if (contractDate > endDate) matchesDate = false;
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalContracts = filteredContracts.length;
  const totalPages = Math.ceil(totalContracts / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const displayContracts = filteredContracts.slice(startIndex, endIndex);

  const handleViewDetails = async (contract: ContractWithDetails) => {
    setSelectedContract(contract);
    setDetailsOpen(true);
    
    await logAction({
      actionType: "viewed",
      entityType: "contract",
      entityId: contract.id,
      metadata: {
        contractNumber: contract.contractNumber,
        clientName: contract.clientName,
        petName: contract.petName,
        status: contract.status,
      }
    });
  };

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  };

  const generateContractText = () => {
    if (!selectedContract) return "";
    
    let text = "DETALHES DO CONTRATO\n";
    text += "=".repeat(50) + "\n\n";
    
    text += `Nº Contrato: ${selectedContract.contractNumber}\n`;
    text += `Cliente: ${selectedContract.clientName ? capitalizeFirst(selectedContract.clientName) : "N/A"}\n`;
    text += `Email: ${selectedContract.clientEmail || "N/A"}\n`;
    text += `Telefone: ${selectedContract.clientPhone || "N/A"}\n`;
    text += `Pet: ${selectedContract.petName ? capitalizeFirst(selectedContract.petName) : "N/A"} (${selectedContract.petSpecies || "N/A"})\n`;
    text += `Plano: ${selectedContract.planName || "N/A"}\n`;
    text += `Status: ${statusLabels[selectedContract.status] || selectedContract.status}\n`;
    text += `Período de Cobrança: ${billingPeriodLabels[selectedContract.billingPeriod] || selectedContract.billingPeriod}\n`;
    text += `Valor Mensal: ${formatCurrency(selectedContract.monthlyAmount)}\n`;
    if (selectedContract.annualAmount) {
      text += `Valor Anual: ${formatCurrency(selectedContract.annualAmount)}\n`;
    }
    text += `Método de Pagamento: ${paymentMethodLabels[selectedContract.paymentMethod] || selectedContract.paymentMethod}\n`;
    text += `Coparticipação: ${selectedContract.hasCoparticipation ? "Sim" : "Não"}\n`;
    text += `Data de Início: ${format(new Date(selectedContract.startDate), "dd/MM/yyyy", { locale: ptBR })}\n`;
    if (selectedContract.endDate) {
      text += `Data de Término: ${format(new Date(selectedContract.endDate), "dd/MM/yyyy", { locale: ptBR })}\n`;
    }
    
    text += "\n" + "=".repeat(50);
    
    return text;
  };

  const handleCopyToClipboard = async () => {
    if (copyState !== 'idle') return;
    
    try {
      setCopyState('copying');
      const text = generateContractText();
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
    // Buscar TODOS os dados sem paginação
    const queryParams = new URLSearchParams({
      limit: '999999',
      ...(searchQuery && { search: searchQuery }),
      ...(statusFilter !== 'all' && { status: statusFilter }),
      ...(dateFilter?.startDate && { startDate: dateFilter.startDate.toString() }),
      ...(dateFilter?.endDate && { endDate: dateFilter.endDate.toString() })
    });
    
    const response = await fetch(`/admin/api/contracts?${queryParams}`);
    
    if (!response.ok) {
      throw new Error('Erro ao buscar dados para exportação');
    }
    
    const allContracts = await response.json();
    
    // Retornar dados formatados para exportação
    return allContracts.map((contract: ContractWithDetails) => ({
      'Nº Contrato': contract.contractNumber || '',
      'Cliente': contract.clientName ? capitalizeFirst(contract.clientName) : 'N/A',
      'Email do Cliente': contract.clientEmail || 'N/A',
      'Telefone do Cliente': contract.clientPhone || 'N/A',
      'Pet': contract.petName ? capitalizeFirst(contract.petName) : 'N/A',
      'Espécie do Pet': contract.petSpecies || 'N/A',
      'Plano': contract.planName || 'N/A',
      'Status': statusLabels[contract.status] || contract.status,
      'Período de Cobrança': billingPeriodLabels[contract.billingPeriod] || contract.billingPeriod,
      'Valor Mensal': formatCurrency(contract.monthlyAmount),
      'Valor Anual': contract.annualAmount ? formatCurrency(contract.annualAmount) : 'N/A',
      'Método de Pagamento': paymentMethodLabels[contract.paymentMethod] || contract.paymentMethod,
      'Coparticipação': contract.hasCoparticipation ? 'Sim' : 'Não',
      'Data de Início': format(new Date(contract.startDate), "dd/MM/yyyy", { locale: ptBR }),
      'Data de Término': contract.endDate ? format(new Date(contract.endDate), "dd/MM/yyyy", { locale: ptBR }) : 'N/A',
      'Data de Criação': contract.createdAt ? format(new Date(contract.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : ''
    }));
  };

  const handleEditContract = (contract: ContractWithDetails) => {
    setEditingContract(contract);
    setEditMonthlyAmount(contract.monthlyAmount);
    setEditStatus(contract.status);
    setEditOpen(true);
  };

  const updateContractMutation = useMutation({
    mutationFn: async (data: { id: string; monthlyAmount: string; status: string }) => {
      return await apiRequest(
        'PATCH',
        `/admin/api/contracts/${data.id}`,
        {
          monthlyAmount: data.monthlyAmount,
          status: data.status,
        }
      );
    },
    onSuccess: async (_data, variables) => {
      if (editingContract) {
        await logAction({
          actionType: "updated",
          entityType: "contract",
          entityId: variables.id,
          metadata: {
            contractNumber: editingContract.contractNumber,
            clientName: editingContract.clientName,
            petName: editingContract.petName,
            oldStatus: editingContract.status,
            newStatus: variables.status,
            oldMonthlyAmount: editingContract.monthlyAmount,
            newMonthlyAmount: variables.monthlyAmount,
          }
        });
      }
      
      // ✅ Invalidar queries de contratos
      queryClient.invalidateQueries({ queryKey: ['/admin/api/contracts'] });
      
      // ✅ Invalidar queries de contratos do pet para garantir que o status seja atualizado em todas as telas
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && 
                 (key.includes('/contracts') || key.includes('/pets'));
        }
      });
      
      toast({
        title: "Sucesso",
        description: "Contrato atualizado com sucesso!",
      });
      setEditOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar o contrato.",
        variant: "destructive",
      });
    },
  });

  const handleSaveEdit = () => {
    if (!editingContract) return;
    
    if (!editMonthlyAmount || parseFloat(editMonthlyAmount) <= 0) {
      toast({
        title: "Erro",
        description: "Por favor, insira um valor mensal válido.",
        variant: "destructive",
      });
      return;
    }

    updateContractMutation.mutate({
      id: editingContract.id,
      monthlyAmount: editMonthlyAmount,
      status: editStatus,
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground break-words">Contratos</h1>
          <p className="text-sm text-muted-foreground">Gestão de contratos de planos de saúde</p>
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
                setCurrentPage(1);
              }}
              className="pl-10 w-80"
            />
          </div>
          
          <Select 
            value={statusFilter} 
            onValueChange={(value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger 
              className="w-48 [&>span]:text-left [&>span]:flex [&>span]:flex-col [&>span]:items-start"
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
                { value: "active", label: "Ativo" },
                { value: "inactive", label: "Inativo" },
                { value: "suspended", label: "Suspenso" },
                { value: "cancelled", label: "Cancelado" },
                { value: "pending", label: "Pendente" }
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
          <ExportButton 
            data={filteredContracts}
            filename="contratos"
            title="Exportação de Contratos"
            pageName="Contratos"
            prepareData={prepareExportData}
            visibleColumns={visibleColumns}
            disabled={isLoading || filteredContracts.length === 0}
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
                {visibleColumns.includes("Contrato") && <TableHead className="w-[140px] bg-white">Nº Contrato</TableHead>}
                {visibleColumns.includes("Cliente") && <TableHead className="w-[200px] bg-white">Cliente</TableHead>}
                {visibleColumns.includes("Pet") && <TableHead className="w-[150px] bg-white">Pet</TableHead>}
                {visibleColumns.includes("Plano") && <TableHead className="w-[150px] bg-white">Plano</TableHead>}
                {visibleColumns.includes("Status") && <TableHead className="w-[120px] bg-white">Status</TableHead>}
                {visibleColumns.includes("Valor Mensal") && <TableHead className="w-[120px] bg-white">Valor Mensal</TableHead>}
                {visibleColumns.includes("Data Início") && <TableHead className="w-[120px] bg-white">Data Início</TableHead>}
                {visibleColumns.includes("Ações") && <TableHead className="w-[100px] bg-white">Ações</TableHead>}
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
              ) : displayContracts && displayContracts.length > 0 ? (
                displayContracts.map((contract: ContractWithDetails) => (
                  <TableRow key={contract.id} className="bg-white border-b border-[#eaeaea]">
                    {visibleColumns.includes("Contrato") && (
                      <TableCell className="font-medium whitespace-nowrap bg-white">
                        {contract.contractNumber}
                      </TableCell>
                    )}
                    {visibleColumns.includes("Cliente") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        {contract.clientName ? capitalizeFirst(contract.clientName) : "N/A"}
                      </TableCell>
                    )}
                    {visibleColumns.includes("Pet") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        {contract.petName ? capitalizeFirst(contract.petName) : "N/A"}
                      </TableCell>
                    )}
                    {visibleColumns.includes("Plano") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        {contract.planName || "N/A"}
                      </TableCell>
                    )}
                    {visibleColumns.includes("Status") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        <Badge className={statusStyle}>
                          {statusLabels[contract.status] || contract.status}
                        </Badge>
                      </TableCell>
                    )}
                    {visibleColumns.includes("Valor Mensal") && (
                      <TableCell className="whitespace-nowrap bg-white font-bold text-foreground">
                        {formatCurrency(contract.monthlyAmount)}
                      </TableCell>
                    )}
                    {visibleColumns.includes("Data Início") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        {format(new Date(contract.startDate), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                    )}
                    {visibleColumns.includes("Ações") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditContract(contract)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(contract)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow className="bg-white border-b border-[#eaeaea]">
                  <TableCell colSpan={visibleColumns.length} className="text-center py-12 bg-white">
                    <File className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {searchQuery
                        ? "Nenhum contrato encontrado para a busca."
                        : "Nenhum contrato cadastrado ainda."
                      }
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalContracts > 10 && (
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">
                  {totalContracts > 0 ? (
                    <>Mostrando {startIndex + 1} a {Math.min(endIndex, totalContracts)} de {totalContracts} contratos</>
                  ) : (
                    "Nenhum contrato encontrado"
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
        <DialogContent hideCloseButton>
          <DialogHeader className="flex flex-row items-center justify-between pr-2">
            <DialogTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-primary" />
              <span>Detalhes do Contrato</span>
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
          
          {selectedContract && (
            <div className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Informações do Contrato</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Nº Contrato:</strong> <span className="text-foreground break-words whitespace-pre-wrap">{selectedContract.contractNumber}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Status:</strong> <Badge className={statusStyle}>{statusLabels[selectedContract.status] || selectedContract.status}</Badge></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Data de Início:</strong> <span className="text-foreground break-words whitespace-pre-wrap">{format(new Date(selectedContract.startDate), "dd/MM/yyyy", { locale: ptBR })}</span></span>
                    </div>
                    {selectedContract.endDate && (
                      <div className="flex items-center space-x-2">
                        <span><strong className="text-primary">Data de Término:</strong> <span className="text-foreground break-words whitespace-pre-wrap">{format(new Date(selectedContract.endDate), "dd/MM/yyyy", { locale: ptBR })}</span></span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">Informações do Cliente</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Nome:</strong> <span className="text-foreground break-words whitespace-pre-wrap">{selectedContract.clientName || "N/A"}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Email:</strong> <span className="text-foreground break-words whitespace-pre-wrap">{selectedContract.clientEmail || "N/A"}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Telefone:</strong> <span className="text-foreground break-words whitespace-pre-wrap">{selectedContract.clientPhone || "N/A"}</span></span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">Informações do Pet</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Nome:</strong> <span className="text-foreground break-words whitespace-pre-wrap">{selectedContract.petName || "N/A"}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Espécie:</strong> <span className="text-foreground break-words whitespace-pre-wrap">{selectedContract.petSpecies || "N/A"}</span></span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">Informações do Plano</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Plano:</strong> <span className="text-foreground break-words whitespace-pre-wrap">{selectedContract.planName || "N/A"}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Período de Cobrança:</strong> <span className="text-foreground break-words whitespace-pre-wrap">{billingPeriodLabels[selectedContract.billingPeriod] || selectedContract.billingPeriod}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Valor Mensal:</strong> <span className="font-bold text-foreground break-words whitespace-pre-wrap">{formatCurrency(selectedContract.monthlyAmount)}</span></span>
                    </div>
                    {selectedContract.annualAmount && (
                      <div className="flex items-center space-x-2">
                        <span><strong className="text-primary">Valor Anual:</strong> <span className="font-bold text-foreground break-words whitespace-pre-wrap">{formatCurrency(selectedContract.annualAmount)}</span></span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Método de Pagamento:</strong> <span className="text-foreground break-words whitespace-pre-wrap">{paymentMethodLabels[selectedContract.paymentMethod] || selectedContract.paymentMethod}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Coparticipação:</strong> <span className="text-foreground break-words whitespace-pre-wrap">{selectedContract.hasCoparticipation ? "Sim" : "Não"}</span></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent hideCloseButton>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Edit className="h-5 w-5 text-primary" />
              <span>Editar Contrato</span>
            </DialogTitle>
          </DialogHeader>
          
          {editingContract && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Valor Mensal</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editMonthlyAmount}
                  onChange={(e) => setEditMonthlyAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Status</label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger 
                    className="w-full [&>span]:text-left [&>span]:flex [&>span]:flex-col [&>span]:items-start"
                    style={{
                      borderColor: 'var(--border-gray)',
                      background: 'white'
                    }}
                  >
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      { value: "active", label: "Ativo" },
                      { value: "inactive", label: "Inativo" },
                      { value: "suspended", label: "Suspenso" },
                      { value: "cancelled", label: "Cancelado" },
                      { value: "pending", label: "Pendente" }
                    ].flatMap((status, index, array) => [
                      <SelectItem key={status.value} value={status.value} className="py-3 pl-10 pr-4 data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground">
                        {status.label}
                      </SelectItem>,
                      ...(index < array.length - 1 ? [<Separator key={`separator-${status.value}`} />] : [])
                    ])}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setEditOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={!canEdit() || updateContractMutation.isPending}
                  title={!canEdit() ? "Você não tem permissão para editar" : "Salvar alterações"}
                  className="min-w-[100px]"
                >
                  {updateContractMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Salvar"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
