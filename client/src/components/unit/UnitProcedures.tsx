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
import { Search, Eye, MoreHorizontal, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { useColumnPreferences } from "@/hooks/admin/use-column-preferences";

interface Procedure {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  isActive: boolean;
}

const allColumns = [
  "Procedimento",
  "Categoria",
  "Descrição",
  "Valor",
  "Status",
  "Ações"
] as const;

export default function UnitProcedures({ unitSlug }: { unitSlug: string }) {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { visibleColumns, toggleColumn } = useColumnPreferences('unit.procedures.columns', allColumns);
  const pageSize = 10;

  useEffect(() => {
    fetchProcedures();
  }, [unitSlug]);

  const fetchProcedures = async () => {
    try {
      const token = localStorage.getItem('unit-token');
      const response = await fetch(`/api/unit/${unitSlug}/procedures`, {
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
    }).format(price);
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
                {visibleColumns.includes("Descrição") && <TableHead className="w-[250px] bg-white">Descrição</TableHead>}
                {visibleColumns.includes("Valor") && <TableHead className="w-[100px] bg-white">Valor</TableHead>}
                {visibleColumns.includes("Status") && <TableHead className="w-[100px] bg-white">Status</TableHead>}
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
                    {visibleColumns.includes("Descrição") && (
                      <TableCell className="bg-white">
                        <span className="line-clamp-2">
                          {procedure.description || "Não informada"}
                        </span>
                      </TableCell>
                    )}
                    {visibleColumns.includes("Valor") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        {formatPrice(procedure.price)}
                      </TableCell>
                    )}
                    {visibleColumns.includes("Status") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          procedure.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {procedure.isActive ? 'Ativo' : 'Inativo'}
                        </span>
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

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent hideCloseButton className="overflow-y-auto max-h-[75vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-primary" />
              <span>Detalhes do Procedimento</span>
            </DialogTitle>
          </DialogHeader>
          
          {selectedProcedure && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Informações</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Nome:</strong> <span className="text-foreground">{selectedProcedure.name}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Categoria:</strong> <span className="text-foreground">{selectedProcedure.category}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Valor:</strong> <span className="text-foreground">{formatPrice(selectedProcedure.price)}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Status:</strong> <span className="text-foreground">{selectedProcedure.isActive ? 'Ativo' : 'Inativo'}</span></span>
                    </div>
                    {selectedProcedure.description && (
                      <div className="space-y-1">
                        <span className="block"><strong className="text-primary">Descrição:</strong></span>
                        <span className="text-foreground block">{selectedProcedure.description}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Button
                  variant="outline" 
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