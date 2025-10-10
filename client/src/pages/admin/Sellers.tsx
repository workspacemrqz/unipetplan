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
  const [formOpen, setFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { ConfirmDialog, confirm } = useConfirmDialog();
  const { applyCPFMask: cpfMask, applyPhoneMask: phoneMask, applyCEPMask: cepMask } = useMasks();

  // Form state
  const [formData, setFormData] = useState<Partial<Seller>>({
    fullName: "",
    cpf: "",
    email: "",
    phone: "",
    cep: "",
    address: "",
    number: "",
    complement: "",
    district: "",
    state: "",
    city: "",
    pixKey: "",
    pixKeyType: "cpf",
    bank: "",
    accountNumber: "",
    fullNameForPayment: "",
    agency: "",
    cpaPercentage: "0",
    recurringCommissionPercentage: "0",
  });

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

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Partial<Seller>) => {
      const response = await fetch("/admin/api/sellers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao criar vendedor");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/admin/api/sellers"] });
      toast({ title: "Vendedor criado com sucesso!" });
      setFormOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar vendedor", description: error.message, variant: "destructive" });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Seller> }) => {
      const response = await fetch(`/admin/api/sellers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao atualizar vendedor");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/admin/api/sellers"] });
      toast({ title: "Vendedor atualizado com sucesso!" });
      setFormOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar vendedor", description: error.message, variant: "destructive" });
    },
  });

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

  const handleOpenForm = (seller?: Seller) => {
    if (seller) {
      setFormData(seller);
      setIsEditing(true);
    } else {
      resetForm();
      setIsEditing(false);
    }
    setFormOpen(true);
  };

  const resetForm = () => {
    setFormData({
      fullName: "",
      cpf: "",
      email: "",
      phone: "",
      cep: "",
      address: "",
      number: "",
      complement: "",
      district: "",
      state: "",
      city: "",
      pixKey: "",
      pixKeyType: "cpf",
      bank: "",
      accountNumber: "",
      fullNameForPayment: "",
      agency: "",
      cpaPercentage: "0",
      recurringCommissionPercentage: "0",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEditing && selectedSeller) {
      updateMutation.mutate({ id: selectedSeller.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = async (seller: Seller) => {
    const confirmed = await confirm({
      title: "Confirmar exclusão",
      description: `Deseja realmente excluir o vendedor ${seller.fullName}?`,
    });

    if (confirmed) {
      deleteMutation.mutate(seller.id);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Vendedores</h1>
        <Button onClick={() => handleOpenForm()} className="flex items-center gap-2">
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
                        onClick={() => {
                          setSelectedSeller(seller);
                          handleOpenForm(seller);
                        }}
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

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Vendedor" : "Novo Vendedor"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-3">Dados Fiscais</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName">Nome Completo *</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input
                    id="cpf"
                    value={cpfMask(formData.cpf || "")}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value.replace(/\D/g, "") })}
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-3">Contato</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Celular *</Label>
                  <Input
                    id="phone"
                    value={phoneMask(formData.phone || "")}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "") })}
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-3">Endereço</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cep">CEP *</Label>
                  <Input
                    id="cep"
                    value={cepMask(formData.cep || "")}
                    onChange={(e) => setFormData({ ...formData, cep: e.target.value.replace(/\D/g, "") })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="address">Endereço *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="number">Número *</Label>
                  <Input
                    id="number"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="complement">Complemento</Label>
                  <Input
                    id="complement"
                    value={formData.complement}
                    onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="district">Bairro *</Label>
                  <Input
                    id="district"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="state">Estado *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="city">Cidade *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-3">Dados de Pagamento</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pixKey">Chave PIX *</Label>
                  <Input
                    id="pixKey"
                    value={formData.pixKey}
                    onChange={(e) => setFormData({ ...formData, pixKey: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="pixKeyType">Tipo de Chave PIX *</Label>
                  <Select
                    value={formData.pixKeyType}
                    onValueChange={(value) => setFormData({ ...formData, pixKeyType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cpf">CPF</SelectItem>
                      <SelectItem value="cnpj">CNPJ</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Telefone</SelectItem>
                      <SelectItem value="random">Chave Aleatória</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="bank">Banco *</Label>
                  <Input
                    id="bank"
                    value={formData.bank}
                    onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="accountNumber">Conta Corrente *</Label>
                  <Input
                    id="accountNumber"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="agency">Agência *</Label>
                  <Input
                    id="agency"
                    value={formData.agency}
                    onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="fullNameForPayment">Nome Completo (Conta) *</Label>
                  <Input
                    id="fullNameForPayment"
                    value={formData.fullNameForPayment}
                    onChange={(e) => setFormData({ ...formData, fullNameForPayment: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-3">Comissões</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cpaPercentage">CPA (%) *</Label>
                  <Input
                    id="cpaPercentage"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.cpaPercentage}
                    onChange={(e) => setFormData({ ...formData, cpaPercentage: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="recurringCommissionPercentage">Comissão Recorrente (%) *</Label>
                  <Input
                    id="recurringCommissionPercentage"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.recurringCommissionPercentage}
                    onChange={(e) => setFormData({ ...formData, recurringCommissionPercentage: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {isEditing ? "Atualizar" : "Criar"} Vendedor
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog />
    </div>
  );
}
