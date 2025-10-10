import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/admin/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/admin/ui/table";
import { useLocation } from "wouter";
import { Plus, Search, Edit, Trash2, Eye, Copy, Check, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getQueryOptions } from "@/lib/admin/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useConfirmDialog } from "@/hooks/admin/use-confirm-dialog";
import { useMasks } from "@/hooks/admin/use-masks";

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

export default function Sellers() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied'>('idle');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const confirmDialog = useConfirmDialog();
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

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/admin/api/sellers/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao excluir vendedor");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/admin/api/sellers"] });
      toast({ title: "Vendedor excluído com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir vendedor", description: error.message, variant: "destructive" });
    },
  });

  const handleViewDetails = (seller: Seller) => {
    setSelectedSeller(seller);
    setDetailsOpen(true);
  };

  const handleDelete = (seller: Seller) => {
    confirmDialog.openDialog({
      title: "Confirmar exclusão",
      description: `Deseja realmente excluir o vendedor ${seller.fullName}?`,
      confirmText: "Excluir",
      cancelText: "Cancelar",
      onConfirm: () => {
        deleteMutation.mutate(seller.id);
      },
    });
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
        </div>
      </div>

      {/* Modern Table Container */}
      <div className="container my-10 space-y-4 border border-[#eaeaea] rounded-lg bg-white shadow-sm">
        {/* Table */}
        <div className="rounded-lg overflow-hidden">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-white border-b border-[#eaeaea]">
                <TableHead className="w-[200px] bg-white">Nome</TableHead>
                <TableHead className="w-[180px] bg-white">Email</TableHead>
                <TableHead className="w-[120px] bg-white">CPF</TableHead>
                <TableHead className="w-[120px] bg-white">Cidade</TableHead>
                <TableHead className="w-[120px] bg-white">Comissão CPA</TableHead>
                <TableHead className="w-[150px] bg-white">Comissão Recorrente</TableHead>
                <TableHead className="w-[200px] bg-white">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7} className="text-center py-6">
                      <div className="h-4 bg-muted rounded w-full animate-pulse"></div>
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredSellers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum vendedor encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredSellers.map((seller) => (
                  <TableRow key={seller.id} className="bg-white border-b border-[#eaeaea]">
                    <TableCell className="font-medium whitespace-nowrap bg-white">{seller.fullName}</TableCell>
                    <TableCell className="whitespace-nowrap bg-white">{seller.email}</TableCell>
                    <TableCell className="whitespace-nowrap bg-white">{cpfMask(seller.cpf)}</TableCell>
                    <TableCell className="whitespace-nowrap bg-white">{seller.city}</TableCell>
                    <TableCell className="whitespace-nowrap bg-white">{seller.cpaPercentage}%</TableCell>
                    <TableCell className="whitespace-nowrap bg-white">{seller.recurringCommissionPercentage}%</TableCell>
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(seller)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
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

      {/* Confirm Dialog */}
      <Dialog open={confirmDialog.isOpen} onOpenChange={confirmDialog.closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmDialog.title}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 mb-4">{confirmDialog.description}</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={confirmDialog.closeDialog}>
              {confirmDialog.cancelText || "Cancelar"}
            </Button>
            <Button type="button" onClick={confirmDialog.confirm} disabled={confirmDialog.isLoading}>
              {confirmDialog.confirmText || "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
