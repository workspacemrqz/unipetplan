import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Badge } from "@/components/admin/ui/badge";
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
import { Search, Eye, MoreHorizontal, ChevronLeft, ChevronRight, DollarSign, Copy, Check, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useColumnPreferences } from "@/hooks/admin/use-column-preferences";
import { useToast } from "@/hooks/use-toast";

interface PaymentReceipt {
  id: string;
  receiptNumber: string;
  clientName: string;
  clientEmail: string;
  paymentAmount: string;
  paymentMethod: string;
  paymentDate: string;
  status: string;
  planName?: string;
  createdAt: string;
}

const allColumns = [
  "Recibo",
  "Cliente",
  "Plano",
  "Valor",
  "Método",
  "Data",
  "Status",
  "Ações",
] as const;

const paymentMethodLabels: Record<string, string> = {
  credit_card: "Cartão de Crédito",
  pix: "PIX",
  cartao: "Cartão",
};

const statusLabels: Record<string, string> = {
  generated: "Gerado",
  downloaded: "Concluído",
  sent: "Enviado",
};

const statusStyle = "border border-border rounded-lg bg-background text-foreground";

export default function Financial() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentReceipt | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied'>('idle');
  const { visibleColumns, toggleColumn } = useColumnPreferences('financial.columns', allColumns);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const { toast } = useToast();

  const { data: receipts = [], isLoading } = useQuery<PaymentReceipt[]>({
    queryKey: ["/admin/api/payment-receipts"],
  });

  const filteredReceipts = searchQuery
    ? receipts.filter(
        (receipt) =>
          receipt.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          receipt.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          receipt.clientEmail.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : receipts;

  const totalReceipts = filteredReceipts.length;
  const totalPages = Math.ceil(totalReceipts / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const displayReceipts = filteredReceipts.slice(startIndex, endIndex);

  const handleViewDetails = (receipt: PaymentReceipt) => {
    setSelectedReceipt(receipt);
    setDetailsOpen(true);
  };

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  };

  const generatePaymentText = () => {
    if (!selectedReceipt) return "";
    
    let text = "DETALHES DO PAGAMENTO\n";
    text += "=".repeat(50) + "\n\n";
    
    text += `Nº Recibo: ${selectedReceipt.receiptNumber}\n`;
    text += `Cliente: ${selectedReceipt.clientName}\n`;
    text += `Email: ${selectedReceipt.clientEmail}\n`;
    text += `Plano: ${selectedReceipt.planName || "N/A"}\n`;
    text += `Valor: ${formatCurrency(selectedReceipt.paymentAmount)}\n`;
    text += `Método de Pagamento: ${paymentMethodLabels[selectedReceipt.paymentMethod] || selectedReceipt.paymentMethod}\n`;
    text += `Data do Pagamento: ${format(new Date(selectedReceipt.paymentDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}\n`;
    text += `Status: ${statusLabels[selectedReceipt.status] || selectedReceipt.status}\n`;
    
    text += "\n" + "=".repeat(50);
    
    return text;
  };

  const handleCopyToClipboard = async () => {
    if (copyState !== 'idle') return;
    
    try {
      setCopyState('copying');
      const text = generatePaymentText();
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
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground break-words">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Histórico de pagamentos e vendas de planos</p>
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
                {visibleColumns.includes("Recibo") && <TableHead className="w-[140px] bg-white">Nº Recibo</TableHead>}
                {visibleColumns.includes("Cliente") && <TableHead className="w-[200px] bg-white">Cliente</TableHead>}
                {visibleColumns.includes("Plano") && <TableHead className="w-[150px] bg-white">Plano</TableHead>}
                {visibleColumns.includes("Valor") && <TableHead className="w-[120px] bg-white">Valor</TableHead>}
                {visibleColumns.includes("Método") && <TableHead className="w-[140px] bg-white">Método</TableHead>}
                {visibleColumns.includes("Data") && <TableHead className="w-[120px] bg-white">Data</TableHead>}
                {visibleColumns.includes("Status") && <TableHead className="w-[100px] bg-white">Status</TableHead>}
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
              ) : displayReceipts && displayReceipts.length > 0 ? (
                displayReceipts.map((receipt: PaymentReceipt) => (
                  <TableRow key={receipt.id} className="bg-white border-b border-[#eaeaea]">
                    {visibleColumns.includes("Recibo") && (
                      <TableCell className="font-medium whitespace-nowrap bg-white">
                        {receipt.receiptNumber}
                      </TableCell>
                    )}
                    {visibleColumns.includes("Cliente") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        {receipt.clientName}
                      </TableCell>
                    )}
                    {visibleColumns.includes("Plano") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        {receipt.planName || "N/A"}
                      </TableCell>
                    )}
                    {visibleColumns.includes("Valor") && (
                      <TableCell className="whitespace-nowrap bg-white font-bold text-foreground">
                        {formatCurrency(receipt.paymentAmount)}
                      </TableCell>
                    )}
                    {visibleColumns.includes("Método") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        {paymentMethodLabels[receipt.paymentMethod] || receipt.paymentMethod}
                      </TableCell>
                    )}
                    {visibleColumns.includes("Data") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        {format(new Date(receipt.paymentDate), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                    )}
                    {visibleColumns.includes("Status") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        <Badge className={statusStyle}>
                          {statusLabels[receipt.status] || receipt.status}
                        </Badge>
                      </TableCell>
                    )}
                    {visibleColumns.includes("Ações") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(receipt)}
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
                    <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {searchQuery
                        ? "Nenhum pagamento encontrado para a busca."
                        : "Nenhum pagamento registrado ainda."
                      }
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalReceipts > 10 && (
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">
                  {totalReceipts > 0 ? (
                    <>Mostrando {startIndex + 1} a {Math.min(endIndex, totalReceipts)} de {totalReceipts} pagamentos</>
                  ) : (
                    "Nenhum pagamento encontrado"
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
              <span>Detalhes do Pagamento</span>
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
          
          {selectedReceipt && (
            <div className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Informações do Pagamento</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Nº Recibo:</strong> <span className="text-foreground">{selectedReceipt.receiptNumber}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Cliente:</strong> <span className="text-foreground">{selectedReceipt.clientName}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Email:</strong> <span className="text-foreground">{selectedReceipt.clientEmail}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Plano:</strong> <span className="text-foreground">{selectedReceipt.planName || "N/A"}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Valor:</strong> <span className="font-bold text-foreground">{formatCurrency(selectedReceipt.paymentAmount)}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Método de Pagamento:</strong> <span className="text-foreground">{paymentMethodLabels[selectedReceipt.paymentMethod] || selectedReceipt.paymentMethod}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Data do Pagamento:</strong> <span className="text-foreground">{format(new Date(selectedReceipt.paymentDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Status:</strong> <Badge className={statusStyle}>{statusLabels[selectedReceipt.status] || selectedReceipt.status}</Badge></span>
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
