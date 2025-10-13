import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Badge } from "@/components/admin/ui/badge";
import { Switch } from "@/components/admin/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/admin/ui/alert-dialog";
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
import { Plus, Search, Edit, Trash2, Building, ExternalLink, Eye, Copy, Globe, MoreHorizontal, ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { apiRequest } from "@/lib/admin/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useColumnPreferences } from "@/hooks/admin/use-column-preferences";
import { useAdminLogger } from "@/hooks/admin/use-admin-logger";
import { formatBrazilianPhoneForDisplay } from "@/hooks/use-site-settings";
import { ExportButton } from "@/components/admin/ExportButton";

interface NetworkUnit {
  id: string;
  name: string;
  address: string;
  phone: string;
  whatsapp?: string;
  isActive: boolean;
  services?: string[];
  googleMapsUrl?: string;
  cidade?: string;
  imageUrl?: string;
  urlSlug?: string;
  createdAt?: string;
  login?: string;
}

const allColumns = [
  "Nome",
  "Telefone",
  "Status",
  "Ações",
] as const;

export default function Network() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUnit, setSelectedUnit] = useState<NetworkUnit | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied'>('idle');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string>("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deletePasswordError, setDeletePasswordError] = useState("");
  const [, setLocation] = useLocation();
  const { visibleColumns, toggleColumn } = useColumnPreferences('network.columns', allColumns);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logAction } = useAdminLogger();

  const { data: units, isLoading } = useQuery<NetworkUnit[]>({
    queryKey: ["/admin/api/network-units"],
  });

  const deleteUnitMutation = useMutation({
    mutationFn: async ({ id, unit }: { id: string; unit: NetworkUnit }) => {
      await apiRequest("DELETE", `/admin/api/network-units/${id}`);
      return unit;
    },
    onSuccess: async (deletedUnit) => {
      await logAction({
        actionType: "deleted",
        entityType: "network_unit",
        entityId: deletedUnit.id,
        metadata: { name: deletedUnit.name, city: deletedUnit.cidade }
      });
      queryClient.invalidateQueries({ queryKey: ["/admin/api/network-units"] });
      toast({
        title: "Unidade removida",
        description: "Unidade foi removida com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao remover unidade.",
        variant: "destructive",
      });
    },
  });

  const toggleUnitMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await apiRequest("PUT", `/admin/api/network-units/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/admin/api/network-units"] });
      toast({
        title: "Status atualizado",
        description: "Status da unidade foi atualizado.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar status da unidade.",
        variant: "destructive",
      });
    },
  });

  const filteredUnits = Array.isArray(units) ? units.filter((unit: NetworkUnit) =>
    unit.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    unit.address?.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];
  
  const totalUnits = filteredUnits.length;
  const totalPages = Math.ceil(totalUnits / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const displayUnits = filteredUnits.slice(startIndex, endIndex);


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

      // Encontrar unidade para deletar
      const unitToDelete = units?.find((u: NetworkUnit) => u.id === itemToDelete);
      
      if (!unitToDelete) {
        setDeletePasswordError("Unidade não encontrada");
        return;
      }

      // Deletar unidade
      deleteUnitMutation.mutate({ id: itemToDelete, unit: unitToDelete });
      setDeleteDialogOpen(false);
      setDeletePassword("");
      setDeletePasswordError("");
      setItemToDelete("");
    } catch (error) {
      setDeletePasswordError("Senha incorreta");
    }
  };

  const handleToggleStatus = (id: string, newStatus: boolean) => {
    toggleUnitMutation.mutate({ id, isActive: newStatus });
  };

  const handleViewDetails = async (unit: NetworkUnit) => {
    setSelectedUnit(unit);
    setDetailsOpen(true);
    
    await logAction({
      actionType: "viewed",
      entityType: "network_unit",
      entityId: unit.id,
      metadata: { name: unit.name, city: unit.cidade }
    });
  };

  const generateUnitText = () => {
    if (!selectedUnit) return "";

    let text = "";
    
    // Cabeçalho
    text += "=".repeat(50) + "\n";
    text += "INFORMAÇÕES DA UNIDADE\n";
    text += "=".repeat(50) + "\n\n";

    // Informações Básicas
    text += "INFORMAÇÕES BÁSICAS:\n";
    text += "-".repeat(25) + "\n";
    text += `Nome: ${selectedUnit.name}\n`;
    text += `Endereço: ${selectedUnit.address}\n`;
    text += `Telefone: ${formatBrazilianPhoneForDisplay(selectedUnit.phone)}\n`;
    if (selectedUnit.whatsapp) {
      text += `WhatsApp: ${formatBrazilianPhoneForDisplay(selectedUnit.whatsapp)}\n`;
    }
    text += `Status: ${selectedUnit.isActive ? 'Ativo' : 'Inativo'}\n\n`;

    // Serviços
    if (selectedUnit.services && Array.isArray(selectedUnit.services) && selectedUnit.services.length > 0) {
      text += "SERVIÇOS OFERECIDOS:\n";
      text += "-".repeat(20) + "\n";
      selectedUnit.services.forEach((service: string, index: number) => {
        text += `${index + 1}. ${service}\n`;
      });
      text += "\n";
    }

    // Localização
    if (selectedUnit.googleMapsUrl) {
      text += "LOCALIZAÇÃO:\n";
      text += "-".repeat(15) + "\n";
      text += `Google Maps: ${selectedUnit.googleMapsUrl}\n\n`;
    }

    text += "=".repeat(50) + "\n";
    text += `Gerado em: ${new Date().toLocaleString('pt-BR')}\n`;
    text += "=".repeat(50);

    return text;
  };

  const handleCopyToClipboard = async () => {
    if (copyState !== 'idle') return;
    
    try {
      setCopyState('copying');
      const text = generateUnitText();
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

  const prepareExportData = async () => {
    return filteredUnits.map(unit => ({
      'Nome': unit.name || '',
      'Endereço': unit.address || '',
      'Cidade': unit.cidade || '',
      'Telefone': formatBrazilianPhoneForDisplay(unit.phone),
      'WhatsApp': unit.whatsapp ? formatBrazilianPhoneForDisplay(unit.whatsapp) : 'N/A',
      'Serviços Oferecidos': unit.services && Array.isArray(unit.services) ? unit.services.join(', ') : 'N/A',
      'Google Maps URL': unit.googleMapsUrl || 'N/A',
      'URL Slug': unit.urlSlug || '',
      'Login': unit.login || '',
      'Status': unit.isActive ? 'Ativo' : 'Inativo',
      'Data de Criação': unit.createdAt ? format(new Date(unit.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : ''
    }));
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground break-words">Rede Credenciada</h1>
          <p className="text-sm text-muted-foreground">Gerencie as unidades credenciadas</p>
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
                setCurrentPage(1); // Reset para página 1 ao buscar
              }}
              className="pl-10 w-80"
              data-testid="input-search-units"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="admin-action"
            size="sm"
            onClick={() => setLocation("/rede/novo")}
            data-testid="button-new-unit"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
          
          <ExportButton 
            data={filteredUnits}
            filename="rede_credenciada"
            title="Exportação de Rede Credenciada"
            pageName="Rede Credenciada"
            prepareData={prepareExportData}
            disabled={isLoading || filteredUnits.length === 0}
          />
          
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
              {visibleColumns.includes("Nome") && <TableHead className="w-[200px] bg-white">Nome</TableHead>}
              {visibleColumns.includes("Endereço") && <TableHead className="w-[250px] bg-white">Endereço</TableHead>}
              {visibleColumns.includes("Telefone") && <TableHead className="w-[140px] bg-white">Telefone</TableHead>}
              {visibleColumns.includes("Serviços") && <TableHead className="w-[200px] bg-white">Serviços</TableHead>}
              {visibleColumns.includes("Status") && <TableHead className="w-[100px] bg-white">Status</TableHead>}
              {visibleColumns.includes("Ações") && <TableHead className="w-[200px] bg-white">Ações</TableHead>}
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
            ) : displayUnits && displayUnits.length > 0 ? (
              displayUnits.map((unit: NetworkUnit) => (
                <TableRow key={unit.id} className="bg-white border-b border-[#eaeaea]">
                  {visibleColumns.includes("Nome") && (
                    <TableCell className="font-medium whitespace-nowrap bg-white" data-testid={`unit-name-${unit.id}`}>
                      {unit.name}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Endereço") && (
                    <TableCell className="whitespace-nowrap bg-white">
                      {unit.address || "Não informado"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Telefone") && (
                    <TableCell className="whitespace-nowrap bg-white">
                      {formatBrazilianPhoneForDisplay(unit.phone) || "Não informado"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Serviços") && (
                    <TableCell className="bg-white">
                      {unit.services && Array.isArray(unit.services) && unit.services.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {unit.services.slice(0, 2).map((service: string, index: number) => (
                            <Badge key={index} variant="neutral" className="text-xs">
                              {service}
                            </Badge>
                          ))}
                          {unit.services.length > 2 && (
                            <Badge variant="neutral" className="text-xs">
                              +{unit.services.length - 2}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        "Não informado"
                      )}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Status") && (
                    <TableCell className="whitespace-nowrap bg-white">
                      <Switch
                        checked={unit.isActive}
                        onCheckedChange={(checked) => handleToggleStatus(unit.id, checked)}
                        disabled={toggleUnitMutation.isPending}
                        data-testid={`switch-unit-status-${unit.id}`}
                      />
                    </TableCell>
                  )}
                  {visibleColumns.includes("Ações") && (
                    <TableCell className="whitespace-nowrap bg-white">
                      <div className="flex items-center space-x-1">
                        {unit.urlSlug && unit.isActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            data-testid={`button-access-unit-${unit.id}`}
                            title={`Acessar página da unidade: ${unit.name}`}
                          >
                            <a href={`/unidade/${unit.urlSlug}`} target="_blank" rel="noopener noreferrer">
                              <Globe className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(unit)}
                          data-testid={`button-view-${unit.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {unit.googleMapsUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            data-testid={`button-maps-${unit.id}`}
                          >
                            <a href={unit.googleMapsUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation(`/rede/${unit.id}/editar`)}
                          data-testid={`button-edit-${unit.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(unit.id)}
                          disabled={deleteUnitMutation.isPending}
                          data-testid={`button-delete-${unit.id}`}
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
                  <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    {searchQuery 
                      ? "Nenhuma unidade encontrada." 
                      : "Nenhuma unidade cadastrada ainda."
                    }
                  </p>
                  {!searchQuery && (
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation("/rede/novo")}
                      data-testid="button-add-first-unit"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Cadastrar Primeira Unidade
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        {totalUnits > 10 && (
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">
                  {totalUnits > 0 ? (
                    <>Mostrando {(currentPage - 1) * pageSize + 1} a {Math.min(currentPage * pageSize, totalUnits)} de {totalUnits} unidade{totalUnits !== 1 ? 's' : ''}</>
                  ) : (
                    "Nenhuma unidade encontrada"
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
              <Building className="h-5 w-5 text-primary" />
              <span>Detalhes da Unidade</span>
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
          
          {selectedUnit && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Informações Básicas</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Nome:</strong> <span className="text-foreground break-words whitespace-pre-wrap">{selectedUnit.name}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Endereço:</strong> <span className="text-foreground break-words whitespace-pre-wrap">{selectedUnit.address}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Telefone:</strong> <span className="text-foreground break-words whitespace-pre-wrap">{formatBrazilianPhoneForDisplay(selectedUnit.phone)}</span></span>
                    </div>
                    {selectedUnit.whatsapp && (
                      <div className="flex items-center space-x-2">
                        <span><strong className="text-primary">WhatsApp:</strong> <span className="text-foreground break-words whitespace-pre-wrap">{formatBrazilianPhoneForDisplay(selectedUnit.whatsapp)}</span></span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Status:</strong> <span className="text-foreground break-words whitespace-pre-wrap">{selectedUnit.isActive ? "Ativo" : "Inativo"}</span></span>
                    </div>
                  </div>
                </div>


                {selectedUnit.services && Array.isArray(selectedUnit.services) && selectedUnit.services.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Serviços Oferecidos</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedUnit.services.map((service: string, index: number) => (
                        <Badge key={index} variant="neutral" className="break-words whitespace-pre-wrap">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {selectedUnit.googleMapsUrl && (
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Localização</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="w-full"
                  >
                    <a href={selectedUnit.googleMapsUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ver no Google Maps
                    </a>
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a 
              unidade da rede selecionada e todas as suas informações.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
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
              disabled={!deletePassword || deleteUnitMutation.isPending}
              className="min-w-[100px]"
            >
              {deleteUnitMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Excluir"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
