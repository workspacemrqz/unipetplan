import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/admin/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, Edit, Trash2, HelpCircle, MoreHorizontal, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/admin/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useColumnPreferences } from "@/hooks/use-column-preferences";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const faqItemSchema = z.object({
  question: z.string().min(1, "Pergunta é obrigatória"),
  answer: z.string().min(1, "Resposta é obrigatória"),
  isActive: z.boolean().default(true),
});

const allColumns = [
  "Pergunta",
  "Status", 
  "Data",
  "Ações",
] as const;

export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string>("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deletePasswordError, setDeletePasswordError] = useState("");
  const { visibleColumns, toggleColumn } = useColumnPreferences('faq.columns', allColumns);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: faqItems, isLoading } = useQuery({
    queryKey: ["/admin/api/faq"],
  });

  const form = useForm({
    resolver: zodResolver(faqItemSchema),
    defaultValues: {
      question: "",
      answer: "",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingItem) {
        await apiRequest("PUT", `/admin/api/faq/${editingItem.id}`, data);
      } else {
        // Calcular o próximo displayOrder baseado no número de itens existentes
        const nextOrder = Array.isArray(faqItems) ? faqItems.length + 1 : 1;
        await apiRequest("POST", "/admin/api/faq", { ...data, displayOrder: nextOrder });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/admin/api/faq"] });
      toast({
        title: editingItem ? "Item atualizado" : "Item criado",
        description: editingItem ? "Item foi atualizado com sucesso." : "Item foi criado com sucesso.",
      });
      setDialogOpen(false);
      setEditingItem(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: editingItem ? "Falha ao atualizar item." : "Falha ao criar item.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/admin/api/faq/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/admin/api/faq"] });
      toast({
        title: "Item removido",
        description: "Item foi removido com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao remover item.",
        variant: "destructive",
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await apiRequest("PUT", `/admin/api/faq/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/admin/api/faq"] });
      toast({
        title: "Status atualizado",
        description: "Status do item foi atualizado.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar status do item.",
        variant: "destructive",
      });
    },
  });

  const filteredItems = Array.isArray(faqItems) ? faqItems?.filter((item: any) =>
    item.question?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.answer?.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  const totalItems = filteredItems.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + pageSize);

  const handleEdit = (item: any) => {
    setEditingItem(item);
    form.reset({
      question: item.question || "",
      answer: item.answer || "",
      isActive: item.isActive ?? true,
    });
    setDialogOpen(true);
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

      // Deletar item
      deleteMutation.mutate(itemToDelete);
      setDeleteDialogOpen(false);
      setDeletePassword("");
      setDeletePasswordError("");
      setItemToDelete("");
    } catch (error) {
      setDeletePasswordError("Senha incorreta");
    }
  };

  const handleToggleStatus = (id: string, currentStatus: boolean) => {
    toggleMutation.mutate({ id, isActive: !currentStatus });
  };

  const onSubmit = (data: any) => {
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground break-words">FAQ</h1>
          <p className="text-sm text-muted-foreground">Gerencie as perguntas frequentes</p>
        </div>
      </div>

      {/* Dialog Content */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) {
          setEditingItem(null);
          form.reset();
        }
      }}>
        <DialogContent className="overflow-y-auto max-h-[75vh]" hideCloseButton={true}>
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {editingItem ? "Editar Item" : "Novo Item FAQ"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="question"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pergunta *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-question" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="answer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Resposta *</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={4} data-testid="textarea-answer" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Item Ativo</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Itens ativos são exibidos no FAQ público
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-faq-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="admin-action"
                    size="sm"
                    disabled={createMutation.isPending}
                    data-testid="button-save"
                  >
                    {createMutation.isPending ? "Salvando..." : editingItem ? "Atualizar" : "Criar"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

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
              data-testid="input-search-faq"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingItem(null);
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button 
                variant="admin-action" 
                size="sm" 
                data-testid="button-new-faq"
                onClick={() => {
                  setEditingItem(null);
                  form.reset({
                    question: "",
                    answer: "",
                    isActive: true,
                  });
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </DialogTrigger>
          </Dialog>
          
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
              {visibleColumns.includes("Pergunta") && <TableHead className="w-[300px] bg-white">Pergunta</TableHead>}
              {visibleColumns.includes("Status") && <TableHead className="w-[100px] bg-white">Status</TableHead>}
              {visibleColumns.includes("Data") && <TableHead className="w-[120px] bg-white">Data</TableHead>}
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
            ) : paginatedItems?.length ? (
              paginatedItems.map((item: any) => (
                <TableRow key={item.id} className="bg-white border-b border-[#eaeaea]">
                  {visibleColumns.includes("Pergunta") && (
                    <TableCell className="font-medium bg-white">
                      <div className="max-w-[280px]">
                        <p className="truncate" title={item.question} data-testid={`faq-question-${item.id}`}>
                          {item.question}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-1" title={item.answer}>
                          {item.answer}
                        </p>
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.includes("Status") && (
                    <TableCell className="whitespace-nowrap bg-white">
                      <Switch
                        checked={item.isActive}
                        onCheckedChange={() => handleToggleStatus(item.id, item.isActive)}
                        disabled={toggleMutation.isPending}
                        data-testid={`switch-faq-status-${item.id}`}
                      />
                    </TableCell>
                  )}
                  {visibleColumns.includes("Data") && (
                    <TableCell className="whitespace-nowrap bg-white">
                      {item.createdAt && format(new Date(item.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Ações") && (
                    <TableCell className="whitespace-nowrap bg-white">
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(item)}
                          data-testid={`button-edit-${item.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-${item.id}`}
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
                  <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery 
                      ? "Nenhum item encontrado para a busca." 
                      : "Nenhum item cadastrado ainda."
                    }
                  </p>
                  {!searchQuery && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDialogOpen(true)}
                      data-testid="button-add-first-faq"
                      className="mt-4"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Primeiro Item
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>

        {/* Pagination */}
        {totalItems > 10 && (
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">
                  {totalItems > 0 ? (
                    <>Mostrando {(currentPage - 1) * pageSize + 1} a {Math.min(currentPage * pageSize, totalItems)} de {totalItems} ite{totalItems !== 1 ? 'ns' : 'm'}</>
                  ) : (
                    "Nenhum item encontrado"
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
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
                disabled={currentPage === totalPages}
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
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a 
              pergunta frequente selecionada.
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
              disabled={!deletePassword || deleteMutation.isPending}
              className="min-w-[100px]"
            >
              {deleteMutation.isPending ? (
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
