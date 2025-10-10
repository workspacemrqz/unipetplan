import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
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
import { useLocation } from "wouter";
import { Plus, Search, Edit, Eye, Copy, Check, Loader2, FileText, MoreHorizontal, ChevronLeft, ChevronRight, Globe } from "lucide-react";
import { Switch } from "@/components/admin/ui/switch";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getQueryOptions } from "@/lib/admin/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMasks } from "@/hooks/admin/use-masks";
import { useColumnPreferences } from "@/hooks/admin/use-column-preferences";

interface Seller {
  id: string;
  fullName: string;
  cpf: string;
  email: string;
  phone: string;
  cep: string;
  address: string;
  number: string;
  complement?: string;
  district: string;
  state: string;
  city: string;
  pixKey: string;
  pixKeyType: string;
  bank: string;
  accountNumber: string;
  fullNameForPayment: string;
  agency: string;
  cpaPercentage: string;
  recurringCommissionPercentage: string;
  whitelabelUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

const allColumns = [
  "Nome",
  "Email",
  "CPF",
  "Cidade",
  "CPA",
  "Recorrente",
  "Status",
  "Ações",
] as const;

export default function Sellers() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied'>('idle');
  const { visibleColumns, toggleColumn } = useColumnPreferences('sellers.columns', allColumns);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { applyCPFMask: cpfMask, applyPhoneMask: phoneMask, applyCEPMask: cepMask } = useMasks();

  const { data: sellers = [], isLoading } = useQuery<Seller[]>({
    queryKey: ["/admin/api/sellers"],
    ...getQueryOptions('sellers'),
  });

  const filteredSellers = sellers.filter(seller =>
    seller.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    seller.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    seller.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    seller.cpf?.includes(searchQuery)
  );

  // Calculate pagination
  const totalSellers = filteredSellers.length;
  const totalPages = Math.ceil(totalSellers / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const displaySellers = filteredSellers.slice(startIndex, endIndex);

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await fetch(`/admin/api/sellers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao atualizar status do vendedor");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/admin/api/sellers"] });
      toast({
        title: "Status atualizado",
        description: "Status do vendedor foi atualizado.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar status do vendedor.",
        variant: "destructive",
      });
    },
  });

  const handleViewDetails = (seller: Seller) => {
    setSelectedSeller(seller);
    setDetailsOpen(true);
  };

  const handleToggleStatus = (id: string, newStatus: boolean) => {
    toggleStatusMutation.mutate({ id, isActive: newStatus });
  };

  const generateSellerText = () => {
    if (!selectedSeller) return "";

    let text = "";
    
    // Cabeçalho
    text += "=".repeat(50) + "\n";
    text += "INFORMAÇÕES DO VENDEDOR\n";
    text += "=".repeat(50) + "\n\n";

    // Dados Fiscais
    text += "DADOS FISCAIS:\n";
    text += "-".repeat(25) + "\n";
    text += `Nome Completo: ${selectedSeller.fullName}\n`;
    text += `CPF: ${cpfMask(selectedSeller.cpf)}\n\n`;

    // Contato
    text += "CONTATO:\n";
    text += "-".repeat(15) + "\n";
    text += `Email: ${selectedSeller.email}\n`;
    text += `Celular: ${phoneMask(selectedSeller.phone)}\n\n`;

    // Endereço
    text += "ENDEREÇO:\n";
    text += "-".repeat(15) + "\n";
    text += `CEP: ${cepMask(selectedSeller.cep)}\n`;
    text += `Endereço: ${selectedSeller.address}, ${selectedSeller.number}\n`;
    if (selectedSeller.complement) {
      text += `Complemento: ${selectedSeller.complement}\n`;
    }
    text += `Bairro: ${selectedSeller.district}\n`;
    text += `Cidade/Estado: ${selectedSeller.city}/${selectedSeller.state}\n\n`;

    // Dados de Pagamento
    text += "DADOS DE PAGAMENTO:\n";
    text += "-".repeat(25) + "\n";
    text += `Chave PIX: ${selectedSeller.pixKey}\n`;
    text += `Tipo de Chave PIX: ${selectedSeller.pixKeyType}\n`;
    text += `Banco: ${selectedSeller.bank}\n`;
    text += `Conta Corrente: ${selectedSeller.accountNumber}\n`;
    text += `Agência: ${selectedSeller.agency}\n`;
    text += `Nome Completo (Conta): ${selectedSeller.fullNameForPayment}\n\n`;

    // Comissões
    text += "COMISSÕES:\n";
    text += "-".repeat(15) + "\n";
    text += `CPA: ${selectedSeller.cpaPercentage}%\n`;
    text += `Comissão Recorrente: ${selectedSeller.recurringCommissionPercentage}%\n\n`;

    // Whitelabel
    if (selectedSeller.whitelabelUrl) {
      text += "WHITELABEL:\n";
      text += "-".repeat(15) + "\n";
      text += `URL: ${selectedSeller.whitelabelUrl}\n\n`;
    }

    // Rodapé
    text += "=".repeat(50) + "\n";
    text += `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}\n`;
    text += "=".repeat(50);

    return text;
  };

  const handleCopyToClipboard = async () => {
    if (copyState !== 'idle') return;
    
    try {
      setCopyState('copying');
      const text = generateSellerText();
      await navigator.clipboard.writeText(text);
      
      setCopyState('copied');
      
      setTimeout(() => {
        setCopyState('idle');
      }, 2000);
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar as informações para a área de transferência",
        variant: "destructive"
      });
      setCopyState('idle');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground break-words">Vendedores</h1>
          <p className="text-sm text-muted-foreground">Gerencie vendedores e comissões</p>
        </div>
      </div>

      {/* Filters and Actions */}
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
          <Button 
            variant="admin-action"
            size="sm"
            onClick={() => setLocation("/vendedores/novo")}
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
              {allColumns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column}
                  checked={visibleColumns.includes(column)}
                  onCheckedChange={() => toggleColumn(column)}
                  className="mb-1"
                >
                  {column}
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
                {visibleColumns.includes("Nome") && <TableHead className="w-[200px] bg-white">Nome</TableHead>}
                {visibleColumns.includes("Email") && <TableHead className="w-[180px] bg-white">Email</TableHead>}
                {visibleColumns.includes("CPF") && <TableHead className="w-[120px] bg-white">CPF</TableHead>}
                {visibleColumns.includes("Cidade") && <TableHead className="w-[120px] bg-white">Cidade</TableHead>}
                {visibleColumns.includes("CPA") && <TableHead className="w-[120px] bg-white">Comissão CPA</TableHead>}
                {visibleColumns.includes("Recorrente") && <TableHead className="w-[150px] bg-white">Comissão Recorrente</TableHead>}
                {visibleColumns.includes("Status") && <TableHead className="w-[100px] bg-white">Status</TableHead>}
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
              ) : displaySellers.length === 0 ? (
                <TableRow className="bg-white border-b border-[#eaeaea]">
                  <TableCell colSpan={visibleColumns.length} className="text-center py-12 bg-white">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {searchQuery.length >= 2
                        ? "Nenhum vendedor encontrado para a busca."
                        : "Nenhum vendedor cadastrado ainda."
                      }
                    </p>
                    {searchQuery.length < 2 && (
                      <Button 
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => setLocation("/vendedores/novo")}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Cadastrar Primeiro Vendedor
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                displaySellers.map((seller) => (
                  <TableRow key={seller.id} className="bg-white border-b border-[#eaeaea]">
                    {visibleColumns.includes("Nome") && <TableCell className="font-medium whitespace-nowrap bg-white">{seller.fullName}</TableCell>}
                    {visibleColumns.includes("Email") && <TableCell className="whitespace-nowrap bg-white">{seller.email}</TableCell>}
                    {visibleColumns.includes("CPF") && <TableCell className="whitespace-nowrap bg-white">{cpfMask(seller.cpf)}</TableCell>}
                    {visibleColumns.includes("Cidade") && <TableCell className="whitespace-nowrap bg-white">{seller.city}</TableCell>}
                    {visibleColumns.includes("CPA") && <TableCell className="whitespace-nowrap bg-white">{seller.cpaPercentage}%</TableCell>}
                    {visibleColumns.includes("Recorrente") && <TableCell className="whitespace-nowrap bg-white">{seller.recurringCommissionPercentage}%</TableCell>}
                    {visibleColumns.includes("Status") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        <Switch
                          checked={seller.isActive}
                          onCheckedChange={(checked) => handleToggleStatus(seller.id, checked)}
                          disabled={toggleStatusMutation.isPending}
                        />
                      </TableCell>
                    )}
                    {visibleColumns.includes("Ações") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(seller)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(`/vendedores/${seller.id}/editar`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalSellers > 10 && (
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">
                  {totalSellers > 0 ? (
                    <>Mostrando {startIndex + 1} a {Math.min(endIndex, totalSellers)} de {totalSellers} vendedores</>
                  ) : (
                    "Nenhum vendedor encontrado"
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" hideCloseButton>
          <DialogHeader className="flex flex-row items-center justify-between pr-2">
            <DialogTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-primary" />
              <span>Detalhes do Vendedor</span>
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleCopyToClipboard}
                disabled={copyState === 'copying'}
                className={`gap-2 h-8 transition-all duration-300 ${
                  copyState === 'copied' ? 'bg-[#e6f4f4] border-[#277677] text-[#277677]' : ''
                }`}
                data-testid="button-copy-seller-details"
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
          {selectedSeller && (
            <div className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Dados Fiscais</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Nome Completo:</strong> <span className="text-foreground">{selectedSeller.fullName}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">CPF:</strong> <span className="text-foreground">{cpfMask(selectedSeller.cpf)}</span></span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">Contato</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Email:</strong> <span className="text-foreground">{selectedSeller.email}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Celular:</strong> <span className="text-foreground">{phoneMask(selectedSeller.phone)}</span></span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">Endereço</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">CEP:</strong> <span className="text-foreground">{cepMask(selectedSeller.cep)}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Endereço:</strong> <span className="text-foreground">{selectedSeller.address}, {selectedSeller.number}</span></span>
                    </div>
                    {selectedSeller.complement && (
                      <div className="flex items-center space-x-2">
                        <span><strong className="text-primary">Complemento:</strong> <span className="text-foreground">{selectedSeller.complement}</span></span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Bairro:</strong> <span className="text-foreground">{selectedSeller.district}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Cidade/Estado:</strong> <span className="text-foreground">{selectedSeller.city}/{selectedSeller.state}</span></span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">Dados de Pagamento</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Chave PIX:</strong> <span className="text-foreground">{selectedSeller.pixKey}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Tipo de Chave PIX:</strong> <span className="text-foreground">{selectedSeller.pixKeyType}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Banco:</strong> <span className="text-foreground">{selectedSeller.bank}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Conta Corrente:</strong> <span className="text-foreground">{selectedSeller.accountNumber}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Agência:</strong> <span className="text-foreground">{selectedSeller.agency}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Nome Completo (Conta):</strong> <span className="text-foreground">{selectedSeller.fullNameForPayment}</span></span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">Comissões</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">CPA:</strong> <span className="text-foreground">{selectedSeller.cpaPercentage}%</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Comissão Recorrente:</strong> <span className="text-foreground">{selectedSeller.recurringCommissionPercentage}%</span></span>
                    </div>
                  </div>
                </div>

                {selectedSeller.whitelabelUrl && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Whitelabel</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <span><strong className="text-primary">URL:</strong> <span className="text-foreground">{selectedSeller.whitelabelUrl}</span></span>
                      </div>
                    </div>
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
