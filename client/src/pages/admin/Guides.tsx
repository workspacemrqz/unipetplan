import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Search, FileText, Eye, Copy, MoreHorizontal, ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";

// Types for guides data
interface GuideWithNetworkUnit {
  id: string;
  procedure: string;
  procedureName?: string;
  type: string;
  guideType?: string;
  status: string;
  value?: string;
  createdAt?: string;
  updatedAt?: string;
  networkUnit?: {
    id: string;
    name: string;
  };
  clientName?: string;
  petName?: string;
  procedureNotes?: string;
  generalNotes?: string;
}

interface GuidesResponse {
  data: GuideWithNetworkUnit[];
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
import { GUIDE_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { getQueryOptions } from "@/lib/admin/queryClient";

const allColumns = [
  "Procedimento",
  "Unidade",
  "Tipo",
  "Valor",
  "Status",
  "Data",
  "Ações",
] as const;

export default function Guides() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedGuide, setSelectedGuide] = useState<GuideWithNetworkUnit | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied'>('idle');
  const { visibleColumns, toggleColumn } = useColumnPreferences('guides.columns', allColumns);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const { toast } = useToast();
  const confirmDialog = useConfirmDialog();
  const passwordDialog = usePasswordDialog();

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
    ...(typeFilter !== "all" && { type: typeFilter }),
    ...dateParams
  };

  const { data: guides, isLoading } = useQuery<GuidesResponse>({
    queryKey: ["/admin/api/guides/with-network-units", queryParams],
    ...getQueryOptions('guides'),
    // Using standard queryClient fetcher that supports [path, params] format and handles 401s globally
  });


  const guidesData = guides?.data || [];
  const totalGuides = guides?.total || 0;
  const totalPages = guides?.totalPages || 1;



  const handleViewDetails = (guide: GuideWithNetworkUnit) => {
    setSelectedGuide(guide);
    setDetailsOpen(true);
  };

  const generateGuideText = () => {
    if (!selectedGuide) return "";

    let text = "";
    
    // Cabeçalho
    text += "=".repeat(50) + "\n";
    text += "INFORMAÇÕES DA GUIA DE ATENDIMENTO\n";
    text += "=".repeat(50) + "\n\n";

    // Informações Básicas
    text += "INFORMAÇÕES BÁSICAS:\n";
    text += "-".repeat(25) + "\n";
    text += `Nome do Procedimento: ${selectedGuide.procedure || selectedGuide.procedureName || 'Não informado'}\n`;
    text += `Tipo de Guia: ${selectedGuide.type || selectedGuide.guideType || 'Não informado'}\n`;
    text += `Status: ${getStatusLabel(selectedGuide.status)}\n`;
    text += `Valor: R$ ${selectedGuide.value || 'Não informado'}\n\n`;

    // Informações do Cliente e Pet
    if (selectedGuide.clientName || selectedGuide.petName) {
      text += "INFORMAÇÕES DO CLIENTE E PET:\n";
      text += "-".repeat(30) + "\n";
      if (selectedGuide.clientName) {
        text += `Cliente: ${selectedGuide.clientName}\n`;
      }
      if (selectedGuide.petName) {
        text += `Pet: ${selectedGuide.petName}\n`;
      }
      text += "\n";
    }

    // Notas do Procedimento
    if (selectedGuide.procedureNotes) {
      text += "NOTAS DO PROCEDIMENTO:\n";
      text += "-".repeat(25) + "\n";
      text += `${selectedGuide.procedureNotes}\n\n`;
    }

    // Notas Gerais
    if (selectedGuide.generalNotes) {
      text += "NOTAS GERAIS:\n";
      text += "-".repeat(15) + "\n";
      text += `${selectedGuide.generalNotes}\n\n`;
    }

    // Informações do Cadastro
    text += "INFORMAÇÕES DO CADASTRO:\n";
    text += "-".repeat(25) + "\n";
    text += `Data de Criação: ${selectedGuide.createdAt ? format(new Date(selectedGuide.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : "Não informado"}\n`;
    if (selectedGuide.updatedAt) {
      text += `Última Atualização: ${format(new Date(selectedGuide.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}\n`;
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
      const text = generateGuideText();
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

  const getStatusColor = () => {
    return "border border-border rounded-lg bg-background text-foreground";
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "open": return "Aberta";
      case "closed": return "Fechada";
      case "cancelled": return "Cancelada";
      default: return status;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "consulta": return "Consulta";
      case "exames": return "Exames";
      case "internacao": return "Internação";
      case "reembolso": return "Reembolso";
      default: return type;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground break-words">Guias de Atendimento</h1>
          <p className="text-sm text-muted-foreground">Visualize todas as guias geradas pelas unidades da rede</p>
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
              data-testid="input-search-guides"
            />
          </div>
          <Select value={typeFilter} onValueChange={(value) => {
            setTypeFilter(value);
            setCurrentPage(1); // Reset para página 1 ao filtrar
          }}>
            <SelectTrigger 
              className="w-48" 
              data-testid="select-type-filter"
              style={{
                borderColor: 'var(--border-gray)',
                background: 'white'
              }}
            >
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              {[{ value: "all", label: "Todos os tipos" }, ...GUIDE_TYPES.map(type => ({ value: type, label: getTypeLabel(type) }))].flatMap((item, index, array) => [
                <SelectItem key={item.value} value={item.value} className="py-3 pl-10 pr-4 data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground">
                  {item.label}
                </SelectItem>,
                ...(index < array.length - 1 ? [<Separator key={`separator-${item.value}`} />] : [])
              ])}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(value) => {
            setStatusFilter(value);
            setCurrentPage(1); // Reset para página 1 ao filtrar
          }}>
            <SelectTrigger 
              className="w-48" 
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
                { value: "closed", label: "Fechadas" },
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

      {/* Modern Table Container */}
      <div className="container my-10 space-y-4 border border-[#eaeaea] rounded-lg bg-white shadow-sm">

        {/* Table */}
        <div className="rounded-lg overflow-hidden">
          <Table className="w-full">
          <TableHeader>
            <TableRow className="bg-white border-b border-[#eaeaea]">
              {visibleColumns.includes("Procedimento") && <TableHead className="w-[200px] bg-white">Procedimento</TableHead>}
              {visibleColumns.includes("Unidade") && <TableHead className="w-[180px] bg-white">Unidade</TableHead>}
              {visibleColumns.includes("Tipo") && <TableHead className="w-[120px] bg-white">Tipo</TableHead>}
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
            ) : guidesData && guidesData.length > 0 ? (
              guidesData.map((guide: GuideWithNetworkUnit) => (
                <TableRow key={guide.id} className="bg-white border-b border-[#eaeaea]">
                  {visibleColumns.includes("Procedimento") && (
                    <TableCell className="font-medium whitespace-nowrap bg-white">
                      {guide.procedure || 'Não informado'}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Unidade") && (
                    <TableCell className="whitespace-nowrap bg-white">
                      {guide.networkUnit?.name || "Não informada"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Tipo") && (
                    <TableCell className="whitespace-nowrap bg-white">
                      {getTypeLabel(guide.type)}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Valor") && (
                    <TableCell className="whitespace-nowrap bg-white">
                      R$ {parseFloat(guide.value || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Status") && (
                    <TableCell className="whitespace-nowrap bg-white">
                      <Badge className={cn("whitespace-nowrap", getStatusColor())}>
                        {getStatusLabel(guide.status)}
                      </Badge>
                    </TableCell>
                  )}
                  {visibleColumns.includes("Data") && (
                    <TableCell className="whitespace-nowrap bg-white">
                      {guide.createdAt && format(new Date(guide.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Ações") && (
                    <TableCell className="whitespace-nowrap bg-white">
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(guide)}
                          data-testid={`button-view-${guide.id}`}
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
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery || typeFilter !== "all" || statusFilter !== "all" 
                      ? "Nenhuma guia encontrada com os filtros aplicados." 
                      : "Nenhuma guia foi gerada pelas unidades da rede ainda."
                    }
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
        
        {/* Pagination */}
        {totalGuides > 10 && (
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">
                  {totalGuides > 0 ? (
                    <>Mostrando {(currentPage - 1) * pageSize + 1} a {Math.min(currentPage * pageSize, totalGuides)} de {totalGuides} guias</>
                  ) : (
                    "Nenhuma guia encontrada"
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
              <span>Detalhes da Guia</span>
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
          
          {selectedGuide && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Informações Básicas</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Procedimento:</strong> <span className="text-foreground">{selectedGuide.procedure || 'Não informado'}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Tipo:</strong> <span className="text-foreground">{getTypeLabel(selectedGuide.type)}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Valor:</strong> <span className="text-foreground">R$ {parseFloat(selectedGuide.value || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Status:</strong></span>
                      <Badge className={getStatusColor()}>
                        {getStatusLabel(selectedGuide.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Criada em:</strong> <span className="text-foreground">{selectedGuide.createdAt && format(new Date(selectedGuide.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span></span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">Observações</h4>
                  <div className="space-y-2 text-sm">
                    {selectedGuide.procedureNotes && (
                      <div>
                        <span className="font-medium text-primary">Observações do Procedimento:</span>
                        <p className="text-muted-foreground mt-1 p-2 bg-muted/10 rounded">
                          {selectedGuide.procedureNotes}
                        </p>
                      </div>
                    )}
                    {selectedGuide.generalNotes && (
                      <div>
                        <span className="font-medium text-primary">Anotações Gerais:</span>
                        <p className="text-muted-foreground mt-1 p-2 bg-muted/10 rounded">
                          {selectedGuide.generalNotes}
                        </p>
                      </div>
                    )}
                    {!selectedGuide.procedureNotes && !selectedGuide.generalNotes && (
                      <p className="text-muted-foreground italic">Nenhuma observação registrada.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
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
    </div>
  );
}
