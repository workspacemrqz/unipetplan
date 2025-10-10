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
import { Plus, Search, Edit, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getQueryOptions } from "@/lib/admin/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/admin/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select";
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

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Vendedores</h1>
        <Button onClick={() => setLocation("/vendedores/novo")} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Vendedor
        </Button>
      </div>

      <div className="mb-4 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar por nome, email, cidade ou CPF..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Comissão CPA</TableHead>
              <TableHead>Comissão Recorrente</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filteredSellers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  Nenhum vendedor encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredSellers.map((seller) => (
                <TableRow key={seller.id}>
                  <TableCell className="font-medium">{seller.fullName}</TableCell>
                  <TableCell>{seller.email}</TableCell>
                  <TableCell>{cpfMask(seller.cpf)}</TableCell>
                  <TableCell>{seller.city}</TableCell>
                  <TableCell>{seller.cpaPercentage}%</TableCell>
                  <TableCell>{seller.recurringCommissionPercentage}%</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(seller)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLocation(`/vendedores/${seller.id}/editar`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
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
