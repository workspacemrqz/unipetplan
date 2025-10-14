import { useState, useEffect } from 'react';
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select";
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
import { Search, Eye, MoreHorizontal, FileText, ChevronLeft, ChevronRight, Copy, Check } from "lucide-react";
import { useColumnPreferences } from "@/hooks/admin/use-column-preferences";
import { useToast } from "@/hooks/admin/use-toast";

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
  "Ações"
] as const;

export default function UnitProcedures({ unitSlug }: { unitSlug: string }) {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied'>('idle');
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const { visibleColumns, toggleColumn } = useColumnPreferences('unit.procedures.columns', allColumns);
  const { toast } = useToast();
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

  const filteredProcedures = procedures.filter(procedure => {
    const searchLower = searchQuery.toLowerCase();
    return procedure.name.toLowerCase().includes(searchLower) ||
           procedure.category.toLowerCase().includes(searchLower) ||
           (procedure.description && procedure.description.toLowerCase().includes(searchLower));
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

  // Period Filter Component
  const PeriodFilterComponent = () => (
    <div className="flex items-center space-x-2">
      <Label htmlFor="period-filter">Filtrar por período:</Label>
      <Select value={periodFilter} onValueChange={setPeriodFilter}>
        <SelectTrigger id="period-filter" className="w-48">
          <SelectValue placeholder="Selecione o período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os períodos</SelectItem>
          <SelectItem value="today">Hoje</SelectItem>
          <SelectItem value="week">Últimos 7 dias</SelectItem>
          <SelectItem value="month">Últimos 30 dias</SelectItem>
          <SelectItem value="3months">Últimos 3 meses</SelectItem>
          <SelectItem value="6months">Últimos 6 meses</SelectItem>
          <SelectItem value="year">Último ano</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  const handleCopyToClipboard = async () => {
    if (!selectedProcedure || copyState !== 'idle') return;
    
    try {
      setCopyState('copying');
      
      let text = `VISUALIZAR PROCEDIMENTO\n`;
      text += `${'='.repeat(50)}\n\n`;
      
      // Informações básicas
      text += `NOME DO PROCEDIMENTO: ${selectedProcedure.name}\n`;
      text += `CATEGORIA: ${selectedProcedure.category}\n\n`;
      
      // Planos vinculados
      if (selectedProcedure.plans && selectedProcedure.plans.length > 0) {
        text += `PLANOS VINCULADOS:\n`;
        text += `${'-'.repeat(50)}\n\n`;
        
        selectedProcedure.plans.forEach((plan, index) => {
          text += `${index + 1}. ${plan.planName}\n`;
          text += `   Valor Integral: ${formatPrice(plan.price)}\n`;
          text += `   Receber: ${formatPrice(plan.payValue)}\n`;
          text += `   Coparticipação: ${plan.coparticipacao > 0 ? formatPrice(plan.coparticipacao) : 'N/A'}\n`;
          text += `   Carência: ${plan.carencia || 'N/A'}\n`;
          text += `   Limites Anuais: ${plan.limitesAnuais || 'N/A'}\n\n`;
        });
      } else {
        text += `PLANOS VINCULADOS: Nenhum plano vinculado\n\n`;
      }
      
      text += `${'='.repeat(50)}\n`;
      text += `Preço no plano\n`;
      
      await navigator.clipboard.writeText(text);
      
      setCopyState('copied');
      toast({
        title: "Copiado!",
        description: "Informações copiadas para a área de transferência.",
      });
      
      setTimeout(() => {
        setCopyState('idle');
      }, 2000);
    } catch (error) {
      setCopyState('idle');
      toast({
        title: "Erro",
        description: "Não foi possível copiar as informações.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground break-words">Procedimentos</h1>
          <p className="text-sm text-muted-foreground">Visualize todos os procedimentos disponíveis</p>
        </div>
      </div>

      <PeriodFilterComponent />

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
                {visibleColumns.includes("Categoria") && <TableHead className="w-[140px] bg-white">Categoria</TableHead>}
                {visibleColumns.includes("Ações") && <TableHead className="w-[80px] bg-white">Ações</TableHead>}
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
                displayProcedures.map((procedure: Procedure) => (
                  <TableRow key={procedure.id} className="bg-white border-b border-[#eaeaea]">
                    {visibleColumns.includes("Procedimento") && (
                      <TableCell className="font-medium whitespace-nowrap bg-white">
                        {procedure.name}
                      </TableCell>
                    )}
                    {visibleColumns.includes("Categoria") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        {procedure.category}
                      </TableCell>
                    )}
                    {visibleColumns.includes("Ações") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedProcedure(procedure);
                            setDetailsOpen(true);
                          }}
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
                    <>Mostrando {startIndex + 1} a {Math.min(endIndex, totalProcedures)} de {totalProcedures} procedimentos</>
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

      {/* Enhanced Details Dialog with All Fields */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Visualizar Procedimento
            </DialogTitle>
          </DialogHeader>
          
          {selectedProcedure && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="border-b pb-4">
                <h3 className="font-semibold text-lg mb-3">Informações Básicas</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Nome do Procedimento</label>
                    <p className="font-medium break-words whitespace-pre-wrap">{selectedProcedure.name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Categoria</label>
                    <p className="font-medium break-words whitespace-pre-wrap">{selectedProcedure.category}</p>
                  </div>
                  {selectedProcedure.description && (
                    <div className="col-span-2">
                      <label className="text-sm text-muted-foreground">Descrição</label>
                      <p className="text-sm mt-1 break-words whitespace-pre-wrap">{selectedProcedure.description}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Plans Details */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Planos Vinculados</h3>
                {selectedProcedure.plans && selectedProcedure.plans.length > 0 ? (
                  <div className="space-y-4">
                    {selectedProcedure.plans.map((plan, index) => (
                      <div key={index} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-lg text-primary break-words whitespace-pre-wrap">{plan.planName}</h4>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            Cobertura total com todos os benefícios inclusos
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div>
                            <label className="text-sm text-muted-foreground">Valor Integral</label>
                            <p className="font-semibold text-base break-words whitespace-pre-wrap">{formatPrice(plan.price)}</p>
                          </div>
                          
                          <div>
                            <label className="text-sm text-muted-foreground">Receber</label>
                            <p className="font-semibold text-base text-green-600 break-words whitespace-pre-wrap">
                              {formatPrice(plan.payValue)}
                            </p>
                          </div>
                          
                          <div>
                            <label className="text-sm text-muted-foreground">Coparticipação</label>
                            <p className="font-semibold text-base text-orange-600 break-words whitespace-pre-wrap">
                              {plan.coparticipacao > 0 ? formatPrice(plan.coparticipacao) : 'Sem coparticipação'}
                            </p>
                          </div>
                          
                          <div>
                            <label className="text-sm text-muted-foreground">Carência</label>
                            <p className="font-medium text-sm break-words whitespace-pre-wrap">
                              {plan.carencia || 'Sem carência'}
                            </p>
                          </div>
                          
                          <div className="md:col-span-2">
                            <label className="text-sm text-muted-foreground">Limites Anuais</label>
                            <p className="font-medium text-sm break-words whitespace-pre-wrap">
                              {plan.limitesAnuais || 'Sem limites anuais'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Summary */}
                    <div className="bg-primary/5 rounded-lg p-4 mt-4">
                      <p className="text-sm text-muted-foreground text-center">
                        Preço no plano
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum plano vinculado a este procedimento</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleCopyToClipboard}
                  disabled={copyState !== 'idle'}
                  className="flex items-center gap-2"
                >
                  {copyState === 'idle' && <Copy className="h-4 w-4" />}
                  {copyState === 'copying' && <Copy className="h-4 w-4 animate-pulse" />}
                  {copyState === 'copied' && <Check className="h-4 w-4 text-green-600" />}
                  {copyState === 'idle' && 'Copiar'}
                  {copyState === 'copying' && 'Copiando...'}
                  {copyState === 'copied' && 'Copiado!'}
                </Button>
                
                <Button
                  variant="default"
                  onClick={() => setDetailsOpen(false)}
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}