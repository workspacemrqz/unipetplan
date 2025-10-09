import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Badge } from "@/components/admin/ui/badge";
import { Switch } from "@/components/admin/ui/switch";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/admin/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/admin/ui/alert-dialog";
import { Label } from "@/components/admin/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/admin/ui/select";
import { Plus, Edit, Trash2, DollarSign, Search, MoreHorizontal, ChevronLeft, ChevronRight, CreditCard, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useColumnPreferences } from "@/hooks/admin/use-column-preferences";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/admin/queryClient";

interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed_value';
  value: string;
  usageLimit: number | null;
  usageCount: number;
  isActive: boolean;
  validFrom: string | null;
  validUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

const allColumns = [
  "Código",
  "Tipo",
  "Valor",
  "Uso",
  "Status",
  "Ações",
] as const;

export default function Coupons() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { visibleColumns, toggleColumn } = useColumnPreferences('coupons.columns', allColumns);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [formData, setFormData] = useState({
    code: '',
    type: 'percentage' as 'percentage' | 'fixed_value',
    value: '',
    usageLimit: '',
    validFrom: '',
    validUntil: '',
    isActive: true,
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string>("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deletePasswordError, setDeletePasswordError] = useState("");

  const { data: coupons = [], isLoading } = useQuery<Coupon[]>({
    queryKey: ['/admin/api/coupons'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/admin/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Erro ao criar cupom');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/admin/api/coupons'] });
      toast({ title: 'Cupom criado com sucesso!' });
      handleCloseDialog();
    },
    onError: () => {
      toast({ title: 'Erro ao criar cupom', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/admin/api/coupons/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Erro ao atualizar cupom');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/admin/api/coupons'] });
      toast({ title: 'Cupom atualizado com sucesso!' });
      handleCloseDialog();
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar cupom', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/admin/api/coupons/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Erro ao excluir cupom');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/admin/api/coupons'] });
      toast({ title: 'Cupom excluído com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao excluir cupom', variant: 'destructive' });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCoupon(null);
    setFormData({
      code: '',
      type: 'percentage',
      value: '',
      usageLimit: '',
      validFrom: '',
      validUntil: '',
      isActive: true,
    });
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      usageLimit: coupon.usageLimit?.toString() || '',
      validFrom: coupon.validFrom ? (new Date(coupon.validFrom).toISOString().split('T')[0] || '') : '',
      validUntil: coupon.validUntil ? (new Date(coupon.validUntil).toISOString().split('T')[0] || '') : '',
      isActive: coupon.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      code: formData.code.toUpperCase(),
      type: formData.type,
      value: formData.value,
      usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
      validFrom: formData.validFrom || null,
      validUntil: formData.validUntil || null,
      isActive: formData.isActive,
    };

    if (editingCoupon) {
      updateMutation.mutate({ id: editingCoupon.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleToggleStatus = (id: string, currentStatus: boolean) => {
    updateMutation.mutate({ 
      id, 
      data: { isActive: !currentStatus } 
    });
  };

  const handleDelete = (id: string) => {
    setItemToDelete(id);
    setDeletePassword("");
    setDeletePasswordError("");
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      // Verificar senha
      const response = await apiRequest("POST", "/admin/api/admin/verify-password", {
        password: deletePassword,
      });
      
      if (!response.valid) {
        setDeletePasswordError("Senha incorreta");
        return;
      }

      // Deletar cupom
      deleteMutation.mutate(itemToDelete);
      setDeleteDialogOpen(false);
      setDeletePassword("");
      setDeletePasswordError("");
      setItemToDelete("");
    } catch (error) {
      setDeletePasswordError("Senha incorreta");
    }
  };

  const allFilteredCoupons = Array.isArray(coupons) ? coupons.filter((coupon: Coupon) =>
    coupon.code?.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  const totalCoupons = allFilteredCoupons.length;
  const totalPages = Math.ceil(totalCoupons / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const filteredCoupons = allFilteredCoupons.slice(startIndex, endIndex);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground break-words">Cupons</h1>
          <p className="text-sm text-muted-foreground">Gerencie os cupons de desconto</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="admin-action">
              <Plus className="h-4 w-4 mr-2" />
              Novo Cupom
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCoupon ? 'Editar Cupom' : 'Novo Cupom'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="code">Código do Cupom</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="EX: DESCONTO10"
                  required
                />
              </div>

              <div>
                <Label htmlFor="type">Tipo de Desconto</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'percentage' | 'fixed_value') =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">
                      Porcentagem
                    </SelectItem>
                    <SelectItem value="fixed_value">
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Valor Fixo (R$)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="value">
                  {formData.type === 'percentage' ? 'Porcentagem (%)' : 'Valor (R$)'}
                </Label>
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder={formData.type === 'percentage' ? '10' : '50.00'}
                  required
                />
              </div>

              <div>
                <Label htmlFor="usageLimit">Limite de Uso (opcional)</Label>
                <Input
                  id="usageLimit"
                  type="number"
                  value={formData.usageLimit}
                  onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                  placeholder="Deixe vazio para ilimitado"
                />
              </div>

              <div>
                <Label htmlFor="validFrom">Válido A Partir De (opcional)</Label>
                <Input
                  id="validFrom"
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="validUntil">Válido Até (opcional)</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
                <Label htmlFor="isActive">Cupom Ativo</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button type="submit" variant="admin-action">
                  {editingCoupon ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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
                {visibleColumns.includes("Código") && <TableHead className="w-[150px] bg-white">Código</TableHead>}
                {visibleColumns.includes("Tipo") && <TableHead className="w-[150px] bg-white">Tipo</TableHead>}
                {visibleColumns.includes("Valor") && <TableHead className="w-[120px] bg-white">Valor</TableHead>}
                {visibleColumns.includes("Uso") && <TableHead className="w-[120px] bg-white">Uso</TableHead>}
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
              ) : filteredCoupons?.length ? (
                filteredCoupons.map((coupon: Coupon) => (
                  <TableRow key={coupon.id} className="bg-white border-b border-[#eaeaea]">
                    {visibleColumns.includes("Código") && (
                      <TableCell className="font-medium whitespace-nowrap bg-white">
                        {coupon.code}
                      </TableCell>
                    )}
                    {visibleColumns.includes("Tipo") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        {coupon.type === 'percentage' ? (
                          <span>Porcentagem</span>
                        ) : (
                          <span className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1" />
                            Valor Fixo
                          </span>
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.includes("Valor") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        <span className="font-bold text-foreground">
                          {coupon.type === 'percentage'
                            ? `${coupon.value}%`
                            : `R$ ${parseFloat(coupon.value).toFixed(2)}`}
                        </span>
                      </TableCell>
                    )}
                    {visibleColumns.includes("Uso") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        <Badge className={cn("whitespace-nowrap", "border border-border rounded-lg bg-background text-foreground")}>
                          {coupon.usageCount} / {coupon.usageLimit || '∞'}
                        </Badge>
                      </TableCell>
                    )}
                    {visibleColumns.includes("Status") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        <Switch
                          checked={coupon.isActive}
                          onCheckedChange={() => handleToggleStatus(coupon.id, coupon.isActive)}
                          disabled={updateMutation.isPending}
                        />
                      </TableCell>
                    )}
                    {visibleColumns.includes("Ações") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(coupon)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(coupon.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow className="bg-white border-b border-[#eaeaea]">
                  <TableCell colSpan={visibleColumns.length} className="text-center py-12 bg-white">
                    <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">
                      {searchQuery 
                        ? "Nenhum cupom encontrado para a busca." 
                        : "Nenhum cupom cadastrado ainda."
                      }
                    </p>
                    {!searchQuery && (
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => setIsDialogOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Primeiro Cupom
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalCoupons > 10 && (
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">
                  {totalCoupons > 0 ? (
                    <>Mostrando {(currentPage - 1) * pageSize + 1} a {Math.min(currentPage * pageSize, totalCoupons)} de {totalCoupons} cupo{totalCoupons !== 1 ? 'ns' : 'm'}</>
                  ) : (
                    "Nenhum cupom encontrado"
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || isLoading}
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
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || isLoading}
              >
                Próximo
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o 
              cupom selecionado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="delete-password" className="text-sm font-medium">
                Digite sua senha para confirmar
              </label>
              <Input
                id="delete-password"
                type="password"
                value={deletePassword}
                onChange={(e) => {
                  setDeletePassword(e.target.value);
                  setDeletePasswordError("");
                }}
                placeholder="Senha de administrador"
                className={deletePasswordError ? "border-red-500" : ""}
              />
              {deletePasswordError && (
                <p className="text-sm text-red-600">{deletePasswordError}</p>
              )}
            </div>
          </div>

          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeletePassword("");
                setDeletePasswordError("");
                setItemToDelete("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmDelete}
              disabled={!deletePassword || deleteMutation.isPending}
              className="min-w-[140px]"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir Cupom"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
