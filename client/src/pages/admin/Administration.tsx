import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { InputMasked } from "@/components/admin/ui/input-masked";
import { Badge } from "@/components/admin/ui/badge";
import { Switch } from "@/components/admin/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/admin/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/admin/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/admin/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select";
import { Separator } from "@/components/admin/ui/separator";
import { Checkbox } from "@/components/admin/ui/checkbox";
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
import { useToast } from "@/hooks/use-toast";
import { useColumnPreferences } from "@/hooks/admin/use-column-preferences";
import { apiRequest } from "@/lib/admin/queryClient";
import { 
  type User as UserType, 
  type NetworkUnitWithCredentialStatus, 
  insertUserSchema 
} from "@shared/schema.js";
import { UserCheck, Plus, Search, Edit, Trash2, Eye, EyeOff, ChevronLeft, ChevronRight, Globe, User, MoreHorizontal, Loader2 } from "lucide-react";

const AVAILABLE_PERMISSIONS = [
  { id: "clients", label: "Clientes", description: "Acesso à seção de clientes" },
  { id: "pets", label: "Pets", description: "Acesso à seção de pets" },
  { id: "contracts", label: "Contratos", description: "Acesso à seção de contratos de planos" },
  { id: "payments", label: "Financeiro", description: "Acesso à seção de pagamentos e transações" },
  { id: "procedures", label: "Procedimentos", description: "Acesso à seção de procedimentos médicos" },
  { id: "guides", label: "Guias", description: "Acesso à seção de guias de atendimento" },
  { id: "plans", label: "Planos", description: "Acesso à seção de planos de saúde" },
  { id: "network", label: "Rede", description: "Acesso à seção de rede credenciada" },
  { id: "faq", label: "FAQ", description: "Acesso à seção de perguntas frequentes" },
  { id: "submissions", label: "Formulários", description: "Acesso à seção de formulários de contato" },
  { id: "settings", label: "Configurações", description: "Acesso à seção de configurações do sistema" },
  { id: "administration", label: "Administração", description: "Acesso à seção de administração de usuários" },
];

const allColumns = [
  "Nome",
  "Email",
  "Função",
  "Status",
  "Ações",
] as const;

const networkColumns = [
  "Nome",
  "Login",
  "URL",
  "Status",
  "Ações",
] as const;

export default function Administration() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [credentialDialogOpen, setCredentialDialogOpen] = useState(false);
  const [editingNetworkUnit, setEditingNetworkUnit] = useState<NetworkUnitWithCredentialStatus | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; username: string } | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletePasswordError, setDeletePasswordError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const { visibleColumns, toggleColumn } = useColumnPreferences('administration.users.columns', allColumns);
  const { visibleColumns: visibleNetworkColumns, toggleColumn: toggleNetworkColumn } = useColumnPreferences('administration.network.columns', networkColumns);
  const [userCurrentPage, setUserCurrentPage] = useState(1);
  const [networkCurrentPage, setNetworkCurrentPage] = useState(1);
  const userPageSize = 10;
  const networkPageSize = 10;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: users = [], isLoading } = useQuery<UserType[]>({
    queryKey: ["/admin/api/users"],
  });

  const { data: networkUnits = [], isLoading: isLoadingNetworkUnits } = useQuery<NetworkUnitWithCredentialStatus[]>({
    queryKey: ["/admin/api/network-units/credentials"],
  });

  const form = useForm({
    resolver: zodResolver(insertUserSchema.extend({
      permissions: insertUserSchema.shape.permissions.optional(),
    })),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      role: "view",
      permissions: [] as string[],
      isActive: true,
    },
  });

  // Watch permissions to ensure checkboxes update properly
  const watchedPermissions = form.watch("permissions", []);

  const credentialForm = useForm({
    resolver: zodResolver(
      z.object({
        login: z.string().min(3, "Login deve ter pelo menos 3 caracteres"),
        password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
        confirmPassword: z.string(),
      }).refine((data) => data.password === data.confirmPassword, {
        message: "Senhas não coincidem",
        path: ["confirmPassword"],
      })
    ),
    defaultValues: {
      login: "",
      password: "",
      confirmPassword: "",
    },
  });


  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingUser) {
        await apiRequest("PUT", `/admin/api/users/${editingUser.id}`, data);
      } else {
        await apiRequest("POST", "/admin/api/users", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/admin/api/users"] });
      toast({
        title: editingUser ? "Usuário atualizado" : "Usuário criado",
        description: editingUser ? "Usuário foi atualizado com sucesso." : "Usuário foi criado com sucesso.",
      });
      setDialogOpen(false);
      setEditingUser(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: editingUser ? "Falha ao atualizar usuário." : "Falha ao criar usuário.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/admin/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/admin/api/users"] });
      toast({
        title: "Usuário removido",
        description: "Usuário foi removido com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao remover usuário.",
        variant: "destructive",
      });
    },
  });

  const updateCredentialsMutation = useMutation({
    mutationFn: async (data: { id: string; login: string; password: string }) => {
      await apiRequest("PUT", `/admin/api/network-units/${data.id}/credentials`, {
        login: data.login,
        password: data.password,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/admin/api/network-units/credentials"] });
      toast({
        title: "Credenciais atualizadas",
        description: "Credenciais da unidade foram atualizadas com sucesso.",
      });
      setCredentialDialogOpen(false);
      setEditingNetworkUnit(null);
      credentialForm.reset();
      setShowPassword(false);
      setShowPasswordConfirm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao atualizar credenciais.",
        variant: "destructive",
      });
    },
  });

  const toggleUserMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await apiRequest("PUT", `/admin/api/users/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/admin/api/users"] });
      toast({
        title: "Status atualizado",
        description: "Status do usuário foi atualizado.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar status do usuário.",
        variant: "destructive",
      });
    },
  });



  const filteredUsers = users.filter((user: any) =>
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // User pagination logic
  const totalUsers = filteredUsers.length;
  const totalUserPages = Math.ceil(totalUsers / userPageSize);
  const paginatedUsers = filteredUsers.slice(
    (userCurrentPage - 1) * userPageSize,
    userCurrentPage * userPageSize
  );

  // Network Units pagination logic  
  const totalNetworkUnits = networkUnits.length;
  const totalNetworkPages = Math.ceil(totalNetworkUnits / networkPageSize);
  const paginatedNetworkUnits = networkUnits.slice(
    (networkCurrentPage - 1) * networkPageSize,
    networkCurrentPage * networkPageSize
  );

  const handleEdit = (user: any) => {
    setEditingUser(user);
    form.reset({
      username: user.username || "",
      email: user.email || "",
      password: "", // Don't prefill password for editing
      role: user.role || "view",
      permissions: (user.permissions || []) as string[],
      isActive: user.isActive ?? true,
    });
    setDialogOpen(true);
  };

  const handleDelete = (user: { id: string; username: string }) => {
    setUserToDelete(user);
    setDeletePassword("");
    setDeletePasswordError("");
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete || !deletePassword) {
      setDeletePasswordError("Por favor, insira sua senha");
      return;
    }

    setIsDeleting(true);
    try {
      // Verify password
      const response = await apiRequest("POST", "/admin/api/admin/verify-password", {
        password: deletePassword
      });

      if (!response.valid) {
        setDeletePasswordError("Senha incorreta");
        setIsDeleting(false);
        return;
      }

      // Password is correct, proceed with deletion
      deleteMutation.mutate(userToDelete.id);
      setDeleteDialogOpen(false);
      setDeletePassword("");
      setUserToDelete(null);
      setIsDeleting(false);
    } catch (error) {
      setDeletePasswordError("Erro ao verificar senha");
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = (id: string, currentStatus: boolean) => {
    toggleUserMutation.mutate({ id, isActive: !currentStatus });
  };

  const onSubmit = (data: any) => {
    // Remove password field if empty (for editing)
    if (editingUser && !data.password) {
      const { password, ...dataWithoutPassword } = data;
      createMutation.mutate(dataWithoutPassword);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEditCredentials = (networkUnit: any) => {
    setEditingNetworkUnit(networkUnit);
    credentialForm.reset({
      login: networkUnit.login || "",
      password: "",
      confirmPassword: "",
    });
    setCredentialDialogOpen(true);
  };

  const onCredentialSubmit = (data: any) => {
    if (editingNetworkUnit) {
      updateCredentialsMutation.mutate({
        id: editingNetworkUnit.id,
        login: data.login,
        password: data.password,
      });
    }
  };

  const getCredentialStatus = (unit: any) => {
    if (unit.credentialStatus === 'configured') {
      return { text: "Configurado", color: "border border-border rounded-lg bg-background text-foreground" };
    }
    return { text: "Não configurado", color: "border border-border rounded-lg bg-background text-foreground" };
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "view": return "Visualizador";
      case "add": return "Criador";
      case "edit": return "Editor";
      case "delete": return "Administrador";
      case "admin": return "Administrador";
      case "manager": return "Gerente";
      case "user": return "Usuário";
      default: return role;
    }
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    const currentPermissions = (form.getValues("permissions") || []) as string[];
    if (checked) {
      form.setValue("permissions", [...currentPermissions, permission], { shouldValidate: true });
    } else {
      form.setValue("permissions", currentPermissions.filter(p => p !== permission), { shouldValidate: true });
    }
  };



  return (
    <>
      <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground break-words">Administração</h1>
          <p className="text-sm text-muted-foreground">Gerencie usuários e permissões do sistema</p>
        </div>
      </div>

      {/* Dialog Content */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) {
          setEditingUser(null);
          form.reset();
        }
      }}>
        <DialogContent className="overflow-y-auto max-h-[75vh]">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {editingUser ? "Editar Usuário" : "Novo Usuário"}
              </DialogTitle>
              {editingUser && (
                <p className="text-sm text-muted-foreground">
                  {editingUser.username}
                </p>
              )}
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome de Usuário *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-username" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <InputMasked 
                              {...field} 
                              type="email" 
                              mask="email"
                              data-testid="input-user-email" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Senha {editingUser ? "(deixe vazio para manter atual)" : "*"}
                        </FormLabel>
                        <FormControl>
                          <Input {...field} type="password" data-testid="input-password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Função *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger 
                              data-testid="select-user-role"
                              className="[&>span]:text-left [&>span]:flex [&>span]:flex-col [&>span]:items-start"
                              style={{
                                borderColor: 'var(--border-gray)',
                                background: 'white'
                              }}
                            >
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[
                              { value: "view", label: "Visualizar" },
                              { value: "add", label: "Adicionar" },
                              { value: "edit", label: "Editar" },
                              { value: "delete", label: "Excluir" }
                            ].flatMap((role, index, array) => [
                              <SelectItem key={role.value} value={role.value} className="py-3 pl-10 pr-4 data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground">
                                {role.label}
                              </SelectItem>,
                              ...(index < array.length - 1 ? [<Separator key={`separator-${role.value}`} />] : [])
                            ])}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Usuário Ativo</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Usuários ativos podem acessar o sistema
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-user-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Permissions */}
                <div className="space-y-3">
                  <FormLabel>Locais de Acesso</FormLabel>
                  <div className="grid grid-cols-1 gap-3 max-h-48 overflow-y-auto border rounded-lg p-3">
                    {AVAILABLE_PERMISSIONS.map((permission) => (
                      <div key={permission.id} className="flex items-start space-x-3">
                        <Checkbox
                          id={`permission-${permission.id}`}
                          checked={(watchedPermissions || []).includes(permission.id)}
                          onCheckedChange={(checked: boolean) => handlePermissionChange(permission.id, checked)}
                          data-testid={`checkbox-permission-${permission.id}`}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label 
                            htmlFor={`permission-${permission.id}`}
                            className="text-sm font-medium text-foreground cursor-pointer"
                          >
                            {permission.label}
                          </label>
                          <p className="text-xs text-muted-foreground">
                            {permission.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDialogOpen(false);
                      setEditingUser(null);
                      form.reset({
                        username: "",
                        email: "",
                        password: "",
                        role: "view",
                        permissions: [],
                        isActive: true,
                      });
                    }}
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
                    className="min-w-[100px]"
                  >
                    {createMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      editingUser ? "Atualizar" : "Criar"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

      {/* Search and Column Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setUserCurrentPage(1); // Reset to page 1 when searching
              }}
              className="pl-10 w-80"
              data-testid="input-search-users"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingUser(null);
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button 
                variant="admin-action" 
                size="sm" 
                data-testid="button-new-user"
                onClick={() => {
                  setEditingUser(null);
                  form.reset({
                    username: "",
                    email: "",
                    password: "",
                    role: "view",
                    permissions: [],
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
            <DropdownMenuContent className="w-48">
              {allColumns.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col}
                  checked={visibleColumns.includes(col)}
                  onCheckedChange={() => toggleColumn(col)}
                  className="data-[state=checked]:bg-transparent"
                >
                  {col}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Section Title */}
      <h2 className="text-xl font-semibold text-foreground mb-4">
        Usuários
      </h2>

      {/* Modern Table Container */}
      <div className="container my-10 space-y-4 border border-[#eaeaea] rounded-lg bg-white shadow-sm">

        {/* Table */}
        <div className="rounded-lg overflow-hidden">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-white border-b border-[#eaeaea]">
                {visibleColumns.includes("Nome") && <TableHead className="w-[200px] bg-white">Nome</TableHead>}
                {visibleColumns.includes("Email") && <TableHead className="w-[250px] bg-white">Email</TableHead>}
                {visibleColumns.includes("Função") && <TableHead className="w-[120px] bg-white">Função</TableHead>}
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
              ) : paginatedUsers?.length ? (
                paginatedUsers.map((user: any) => (
                  <TableRow key={user.id} className="bg-white border-b border-[#eaeaea]">
                    {visibleColumns.includes("Nome") && (
                      <TableCell className="font-medium whitespace-nowrap bg-white" data-testid={`user-name-${user.id}`}>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-primary" />
                          <span>{user.username}</span>
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.includes("Email") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        {user.email}
                      </TableCell>
                    )}
                    {visibleColumns.includes("Função") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        <Badge variant="neutral" className="text-xs">
                          {getRoleLabel(user.role)}
                        </Badge>
                      </TableCell>
                    )}
                    {visibleColumns.includes("Status") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={user.isActive}
                            onCheckedChange={() => handleToggleStatus(user.id, user.isActive)}
                            disabled={toggleUserMutation.isPending}
                            data-testid={`switch-user-status-${user.id}`}
                          />
                          <span className="text-sm text-muted-foreground">
                            {user.isActive ? "Ativo" : "Inativo"}
                          </span>
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.includes("Ações") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(user)}
                            data-testid={`button-edit-${user.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete({ id: user.id, username: user.username })}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-${user.id}`}
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
                    <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">
                      {searchQuery 
                        ? "Nenhum usuário encontrado para a busca." 
                        : "Nenhum usuário cadastrado ainda."
                      }
                    </p>
                    {!searchQuery && (
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => setDialogOpen(true)}
                        data-testid="button-add-first-user"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Primeiro Usuário
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Users Pagination */}
        {totalUsers > 10 && (
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">
                  {totalUsers > 0 ? (
                    <>Mostrando {(userCurrentPage - 1) * userPageSize + 1} a {Math.min(userCurrentPage * userPageSize, totalUsers)} de {totalUsers} usuário{totalUsers !== 1 ? 's' : ''}</>
                  ) : (
                    "Nenhum usuário encontrado"
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUserCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={userCurrentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <div className="flex items-center space-x-1">
                <span className="text-sm font-medium">
                  Página {userCurrentPage} de {totalUserPages}
                </span>
              </div>
              <Button
                variant="admin-action"
                size="sm"
                onClick={() => setUserCurrentPage(prev => Math.min(prev + 1, totalUserPages))}
                disabled={userCurrentPage === totalUserPages}
              >
                Próximo
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Separator between sections */}
      <Separator className="my-8" />

      {/* Network Credentials Section Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
        <h2 className="text-xl font-semibold text-foreground">
          Rede Credenciada
        </h2>
        
        {/* Controle de Colunas da Rede */}
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
            {networkColumns.map((col) => (
              <DropdownMenuCheckboxItem
                key={col}
                checked={visibleNetworkColumns.includes(col)}
                onCheckedChange={() => toggleNetworkColumn(col)}
                className="mb-1"
              >
                {col}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Network Credentials Table Container */}
      <div className="container my-10 space-y-4 border border-[#eaeaea] rounded-lg bg-white shadow-sm">
        
        {/* Table */}
        <div className="rounded-lg overflow-hidden">
          {isLoadingNetworkUnits ? (
            <div className="p-4">
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="h-4 bg-muted rounded w-1/4 animate-pulse"></div>
                    <div className="h-4 bg-muted rounded w-1/6 animate-pulse"></div>
                    <div className="h-4 bg-muted rounded w-1/8 animate-pulse"></div>
                    <div className="h-4 bg-muted rounded w-1/6 animate-pulse"></div>
                    <div className="h-4 bg-muted rounded w-1/4 animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : paginatedNetworkUnits?.length ? (
            <Table className="w-full">
              <TableHeader>
                <TableRow className="bg-white border-b border-[#eaeaea]">
                  {visibleNetworkColumns.includes("Nome") && (
                    <TableHead className="bg-white">Nome</TableHead>
                  )}
                  {visibleNetworkColumns.includes("Login") && (
                    <TableHead className="bg-white">Login</TableHead>
                  )}
                  {visibleNetworkColumns.includes("URL") && (
                    <TableHead className="bg-white">URL</TableHead>
                  )}
                  {visibleNetworkColumns.includes("Status") && (
                    <TableHead className="bg-white">Status</TableHead>
                  )}
                  {visibleNetworkColumns.includes("Ações") && (
                    <TableHead className="bg-white">Ações</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
              {paginatedNetworkUnits.map((unit: any) => {
                const status = getCredentialStatus(unit);
                return (
                  <TableRow key={unit.id} className="bg-white border-b border-[#eaeaea]">
                    {visibleNetworkColumns.includes("Nome") && (
                      <TableCell className="font-medium whitespace-nowrap bg-white">
                        <div className="flex items-center space-x-2">
                          <Globe className="h-4 w-4 text-primary" />
                          <span>{unit.name}</span>
                        </div>
                      </TableCell>
                    )}
                    {visibleNetworkColumns.includes("Login") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        {unit.login || "Não configurado"}
                      </TableCell>
                    )}
                    {visibleNetworkColumns.includes("URL") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        /{unit.urlSlug || "não-definido"}
                      </TableCell>
                    )}
                    {visibleNetworkColumns.includes("Status") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        <Badge className={status.color}>
                          {status.text}
                        </Badge>
                      </TableCell>
                    )}
                    {visibleNetworkColumns.includes("Ações") && (
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
                            onClick={() => handleEditCredentials(unit)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <Table className="w-full">
            <TableBody>
              <TableRow className="bg-white border-b border-[#eaeaea]">
                <TableCell colSpan={visibleNetworkColumns.length} className="text-center py-12 bg-white">
                  <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Nenhuma unidade da rede cadastrada ainda.
                  </p>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
        </div>
        
        {/* Network Units Pagination */}
        {networkUnits?.length > 10 && (
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">
                  {totalNetworkUnits > 0 ? (
                    <>Mostrando {(networkCurrentPage - 1) * networkPageSize + 1} a {Math.min(networkCurrentPage * networkPageSize, totalNetworkUnits)} de {totalNetworkUnits} unidade{totalNetworkUnits !== 1 ? 's' : ''}</>
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
                onClick={() => setNetworkCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={networkCurrentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <div className="flex items-center space-x-1">
                <span className="text-sm font-medium">
                  Página {networkCurrentPage} de {totalNetworkPages}
                </span>
              </div>
              <Button
                variant="admin-action"
                size="sm"
                onClick={() => setNetworkCurrentPage(prev => Math.min(prev + 1, totalNetworkPages))}
                disabled={networkCurrentPage === totalNetworkPages}
              >
                Próximo
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Credential Dialog */}
      <Dialog open={credentialDialogOpen} onOpenChange={(open) => {
          setCredentialDialogOpen(open);
          if (!open) {
            setEditingNetworkUnit(null);
            credentialForm.reset();
            setShowPassword(false);
            setShowPasswordConfirm(false);
          }
        }}>
          <DialogContent className="overflow-y-auto max-h-[75vh]">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {editingNetworkUnit?.login ? "Editar" : "Definir"} Credenciais
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {editingNetworkUnit?.name}
              </p>
            </DialogHeader>
            <Form {...credentialForm}>
              <form onSubmit={credentialForm.handleSubmit(onCredentialSubmit)} className="space-y-4">
                <FormField
                  control={credentialForm.control}
                  name="login"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Login *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={credentialForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nova Senha *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            {...field} 
                            type={showPassword ? "text" : "password"}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={credentialForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar Nova Senha *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            {...field} 
                            type={showPasswordConfirm ? "text" : "password"}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2"
                            onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                          >
                            {showPasswordConfirm ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCredentialDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    disabled={updateCredentialsMutation.isPending}
                    className="min-w-[140px]"
                  >
                    {updateCredentialsMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Salvar Credenciais"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog with Password */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o 
              usuário selecionado e todas as suas informações.
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
                data-testid="input-delete-password"
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
                setUserToDelete(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmDelete}
              disabled={!deletePassword || isDeleting || deleteMutation.isPending}
              data-testid="button-confirm-delete"
              className="min-w-[100px]"
            >
              {isDeleting || deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Excluir"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      </div>
    </>
  );
}
