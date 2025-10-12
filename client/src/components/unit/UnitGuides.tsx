import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Badge } from "@/components/admin/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select";
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
import { Search, FileText, Eye, Copy, MoreHorizontal, ChevronLeft, ChevronRight, Check, Loader2, Plus, Edit } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDate } from "@internationalized/date";
import { useToast } from "@/hooks/use-toast";
import { useColumnPreferences } from "@/hooks/admin/use-column-preferences";
import { DateFilterComponent } from "@/components/admin/DateFilterComponent";
import { getDateRangeParams } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

// Types for guides data
interface GuideWithNetworkUnit {
  id: string;
  procedure: string;
  procedureName?: string;
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

const allColumns = [
  "Procedimento",
  "Unidade",
  "Valor",
  "Status",
  "Data",
  "Ações",
] as const;

export default function UnitGuides({ unitSlug }: { unitSlug: string }) {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedGuide, setSelectedGuide] = useState<GuideWithNetworkUnit | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<GuideWithNetworkUnit | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied'>('idle');
  const { visibleColumns, toggleColumn } = useColumnPreferences('unit.guides.columns', allColumns);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const { toast } = useToast();
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

  // Construct parameters object
  const queryParams = {
    page: currentPage.toString(),
    limit: pageSize.toString(),
    ...(searchQuery && { search: searchQuery }),
    ...(statusFilter !== "all" && { status: statusFilter }),
    ...dateParams
  };

  const { data: guides, isLoading } = useQuery<GuidesResponse>({
    queryKey: [`/api/units/${unitSlug}/guides`, queryParams],
    queryFn: async () => {
      const token = localStorage.getItem('unit-token');
      if (!token) {
        throw new Error('Token de autenticação não encontrado');
      }

      const queryString = new URLSearchParams(queryParams).toString();
      const response = await fetch(`/api/units/${unitSlug}/guides?${queryString}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Token inválido ou expirado');
        }
        throw new Error(`Erro ao buscar guias: ${response.statusText}`);
      }

      return response.json();
    },
    enabled: !!unitSlug
  });

  const guidesData = guides?.data || [];
  const totalGuides = guides?.total || 0;
  const totalPages = guides?.totalPages || 1;

  const handleViewDetails = (guide: GuideWithNetworkUnit) => {
    setSelectedGuide(guide);
    setDetailsOpen(true);
  };

  const handleEdit = (guide: GuideWithNetworkUnit) => {
    setEditingGuide(guide);
    setNewStatus(guide.status);
    setEditOpen(true);
  };

  const handleSaveStatus = async () => {
    if (!editingGuide) return;
    
    setIsSaving(true);
    
    try {
      const token = localStorage.getItem('unit-token');
      if (!token) {
        throw new Error('Token de autenticação não encontrado');
      }

      const response = await fetch(`/api/units/${unitSlug}/guides/${editingGuide.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
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
        description: "O status da guia foi atualizado com sucesso.",
      });

      setEditOpen(false);
      setEditingGuide(null);
      
      // Invalidar as queries para recarregar os dados
      await queryClient.invalidateQueries({ queryKey: [`/api/units/${unitSlug}/guides`] });
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
    text += `Status: ${getStatusLabel(selectedGuide.status)}\n`;
    text += `Valor: R$ ${selectedGuide.value || 'Não informado'}\n\n`;

    // Informações do Cliente, Pet e Unidade
    if (selectedGuide.clientName || selectedGuide.petName || selectedGuide.networkUnit?.name) {
      text += "INFORMAÇÕES DO CLIENTE, PET E UNIDADE:\n";
      text += "-".repeat(40) + "\n";
      if (selectedGuide.clientName) {
        text += `Cliente: ${selectedGuide.clientName}\n`;
      }
      if (selectedGuide.petName) {
        text += `Pet: ${selectedGuide.petName}\n`;
      }
      if (selectedGuide.networkUnit?.name) {
        text += `Unidade: ${selectedGuide.networkUnit.name}\n`;
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
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground break-words">Guias de Atendimento</h1>
          <p className="text-sm text-muted-foreground">Visualize as guias geradas pela sua unidade</p>
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
              <SelectItem value="all" className="data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground">Todos os status</SelectItem>
              <SelectItem value="open" className="data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground">Aberta</SelectItem>
              <SelectItem value="closed" className="data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground">Concluída</SelectItem>
              <SelectItem value="cancelled" className="data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="admin-action"
            size="sm"
            onClick={() => setLocation(`/unidade/${unitSlug}/guias/novo`)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
          
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(guide)}
                          data-testid={`button-edit-${guide.id}`}
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
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery || statusFilter !== "all" 
                      ? "Nenhuma guia encontrada com os filtros aplicados." 
                      : "Nenhuma guia foi gerada pela sua unidade ainda."
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
                      <span><strong className="text-primary">Valor:</strong> <span className="text-foreground">R$ {parseFloat(selectedGuide.value || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Status:</strong></span>
                      <Badge className={getStatusColor()}>
                        {getStatusLabel(selectedGuide.status)}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">Cliente e Pet</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span><strong className="text-primary">Cliente:</strong> <span className="text-foreground">{selectedGuide.clientName || 'Não informado'}</span></span>
                    </div>
                    <div>
                      <span><strong className="text-primary">Pet:</strong> <span className="text-foreground">{selectedGuide.petName || 'Não informado'}</span></span>
                    </div>
                    <div>
                      <span><strong className="text-primary">Unidade:</strong> <span className="text-foreground">{selectedGuide.networkUnit?.name || 'Não informada'}</span></span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedGuide.procedureNotes && (
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Notas do Procedimento</h4>
                  <p className="text-sm text-foreground">{selectedGuide.procedureNotes}</p>
                </div>
              )}

              {selectedGuide.generalNotes && (
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Notas Gerais</h4>
                  <p className="text-sm text-foreground">{selectedGuide.generalNotes}</p>
                </div>
              )}

              <div className="pt-4 border-t">
                <h4 className="font-semibold text-foreground mb-2">Informações do Sistema</h4>
                <div className="space-y-1 text-sm">
                  <div>
                    <span><strong className="text-primary">Data de Criação:</strong> <span className="text-foreground">{selectedGuide.createdAt ? format(new Date(selectedGuide.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'Não informado'}</span></span>
                  </div>
                  {selectedGuide.updatedAt && (
                    <div>
                      <span><strong className="text-primary">Última Atualização:</strong> <span className="text-foreground">{format(new Date(selectedGuide.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span></span>
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
            <DialogTitle>Editar Status da Guia</DialogTitle>
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
                  <SelectItem 
                    value="open"
                    className="py-3 pl-8 pr-4 data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground"
                  >
                    Aberta
                  </SelectItem>
                  <SelectItem 
                    value="closed"
                    className="py-3 pl-8 pr-4 data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground"
                  >
                    Concluída
                  </SelectItem>
                  <SelectItem 
                    value="cancelled"
                    className="py-3 pl-8 pr-4 data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground"
                  >
                    Cancelada
                  </SelectItem>
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
    </div>
  );
}