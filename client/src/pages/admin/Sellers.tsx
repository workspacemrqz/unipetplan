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
        <Button onClick={() => setLocation("/admin/vendedores/novo")} className="flex items-center gap-2">
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
                        onClick={() => setLocation(`/admin/vendedores/${seller.id}/editar`)}
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Vendedor</DialogTitle>
          </DialogHeader>
          {selectedSeller && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">Dados Fiscais</h3>
                <p><strong>Nome Completo:</strong> {selectedSeller.fullName}</p>
                <p><strong>CPF:</strong> {cpfMask(selectedSeller.cpf)}</p>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Contato</h3>
                <p><strong>Email:</strong> {selectedSeller.email}</p>
                <p><strong>Celular:</strong> {phoneMask(selectedSeller.phone)}</p>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Endereço</h3>
                <p><strong>CEP:</strong> {cepMask(selectedSeller.cep)}</p>
                <p><strong>Endereço:</strong> {selectedSeller.address}, {selectedSeller.number}</p>
                {selectedSeller.complement && <p><strong>Complemento:</strong> {selectedSeller.complement}</p>}
                <p><strong>Bairro:</strong> {selectedSeller.district}</p>
                <p><strong>Cidade/Estado:</strong> {selectedSeller.city}/{selectedSeller.state}</p>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Dados de Pagamento</h3>
                <p><strong>Chave PIX:</strong> {selectedSeller.pixKey}</p>
                <p><strong>Tipo de Chave PIX:</strong> {selectedSeller.pixKeyType}</p>
                <p><strong>Banco:</strong> {selectedSeller.bank}</p>
                <p><strong>Conta Corrente:</strong> {selectedSeller.accountNumber}</p>
                <p><strong>Agência:</strong> {selectedSeller.agency}</p>
                <p><strong>Nome Completo (Conta):</strong> {selectedSeller.fullNameForPayment}</p>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Comissões</h3>
                <p><strong>CPA:</strong> {selectedSeller.cpaPercentage}%</p>
                <p><strong>Comissão Recorrente:</strong> {selectedSeller.recurringCommissionPercentage}%</p>
              </div>
              {selectedSeller.whitelabelUrl && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Whitelabel</h3>
                  <p><strong>URL:</strong> {selectedSeller.whitelabelUrl}</p>
                </div>
              )}
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
