import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import UnitLayout from "@/components/unit/UnitLayout";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { InputMasked } from "@/components/admin/ui/input-masked";
import { Badge } from "@/components/admin/ui/badge";
import { Switch } from "@/components/admin/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/admin/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/admin/ui/tabs";
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
import { useToast } from "@/hooks/admin/use-toast";
import { useColumnPreferences } from "@/hooks/admin/use-column-preferences";
import { Plus, Search, Edit, Trash2, Eye, EyeOff, ChevronLeft, ChevronRight, MoreHorizontal, Users } from "lucide-react";
import LoadingDots from "@/components/ui/LoadingDots";

const veterinarianSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  crmv: z.string().min(3, "CRMV é obrigatório"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Telefone é obrigatório"),
  specialty: z.string().optional(),
  type: z.enum(["permanente", "volante"]),
  login: z.string().optional(),
  password: z.string().optional(),
  canAccessAtendimentos: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

type VeterinarianFormData = z.infer<typeof veterinarianSchema>;

interface Veterinarian {
  id: string;
  name: string;
  crmv: string;
  email: string;
  phone: string;
  specialty?: string | null;
  type: "permanente" | "volante";
  login?: string | null;
  passwordHash?: string | null;
  canAccessAtendimentos: boolean;
  isActive: boolean;
  networkUnitId: string;
  createdAt: Date;
  updatedAt: Date;
}

const allColumns = [
  "Nome",
  "CRMV",
  "Email",
  "Telefone",
  "Especialidade",
  "Credenciais",
  "Acesso Atendimentos",
  "Status",
  "Ações",
] as const;

export default function CorpoClinicoPage() {
  const { slug } = useParams();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVet, setEditingVet] = useState<Veterinarian | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [currentTab, setCurrentTab] = useState<"permanente" | "volante">("permanente");
  const { visibleColumns, toggleColumn } = useColumnPreferences('unit.corpo-clinico.columns', allColumns);
  const [permanenteCurrentPage, setPermanenteCurrentPage] = useState(1);
  const [volanteCurrentPage, setVolanteCurrentPage] = useState(1);
  const pageSize = 10;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    checkAuthentication();
  }, [slug]);

  const checkAuthentication = async () => {
    const token = localStorage.getItem('unit-token');
    const unitSlug = localStorage.getItem('unit-slug');
    
    if (!token || unitSlug !== slug) {
      setLocation(`/unidade/${slug}`);
      return;
    }
    
    setLoading(false);
  };

  const { data: veterinarians = [], isLoading: isLoadingVets } = useQuery<Veterinarian[]>({
    queryKey: [`/api/units/${slug}/veterinarios`],
    enabled: !loading,
  });

  const form = useForm<VeterinarianFormData>({
    resolver: zodResolver(veterinarianSchema),
    defaultValues: {
      name: "",
      crmv: "",
      email: "",
      phone: "",
      specialty: "",
      type: "permanente",
      login: "",
      password: "",
      canAccessAtendimentos: false,
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: VeterinarianFormData) => {
      const token = localStorage.getItem('unit-token');
      const endpoint = editingVet
        ? `/api/units/${slug}/veterinarios/${editingVet.id}`
        : `/api/units/${slug}/veterinarios`;
      
      const response = await fetch(endpoint, {
        method: editingVet ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao salvar veterinário');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/units/${slug}/veterinarios`] });
      toast({
        title: editingVet ? "Veterinário atualizado" : "Veterinário criado",
        description: editingVet ? "Veterinário foi atualizado com sucesso." : "Veterinário foi criado com sucesso.",
      });
      setDialogOpen(false);
      setEditingVet(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem('unit-token');
      const response = await fetch(`/api/units/${slug}/veterinarios/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao remover veterinário');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/units/${slug}/veterinarios`] });
      toast({
        title: "Veterinário removido",
        description: "Veterinário foi removido com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const token = localStorage.getItem('unit-token');
      const response = await fetch(`/api/units/${slug}/veterinarios/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao atualizar status');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/units/${slug}/veterinarios`] });
      toast({
        title: "Status atualizado",
        description: "Status do veterinário foi atualizado.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredVeterinarians = veterinarians.filter((vet) =>
    vet.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vet.crmv?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vet.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const permanenteVets = filteredVeterinarians.filter((vet) => vet.type === "permanente");
  const volanteVets = filteredVeterinarians.filter((vet) => vet.type === "volante");

  const totalPermanentePages = Math.ceil(permanenteVets.length / pageSize);
  const totalVolantePages = Math.ceil(volanteVets.length / pageSize);

  const paginatedPermanenteVets = permanenteVets.slice(
    (permanenteCurrentPage - 1) * pageSize,
    permanenteCurrentPage * pageSize
  );

  const paginatedVolanteVets = volanteVets.slice(
    (volanteCurrentPage - 1) * pageSize,
    volanteCurrentPage * pageSize
  );

  const handleEdit = (vet: Veterinarian) => {
    setEditingVet(vet);
    form.reset({
      name: vet.name,
      crmv: vet.crmv,
      email: vet.email,
      phone: vet.phone,
      specialty: vet.specialty || "",
      type: vet.type,
      login: vet.login || "",
      password: "",
      canAccessAtendimentos: vet.canAccessAtendimentos,
      isActive: vet.isActive,
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja remover este veterinário?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggleStatus = (id: string, currentStatus: boolean) => {
    toggleStatusMutation.mutate({ id, isActive: !currentStatus });
  };

  const onSubmit = (data: VeterinarianFormData) => {
    if (editingVet && !data.password) {
      const { password, ...dataWithoutPassword } = data;
      createMutation.mutate(dataWithoutPassword as VeterinarianFormData);
    } else {
      createMutation.mutate(data);
    }
  };

  const renderVeterinarianTable = (vets: Veterinarian[], currentPage: number, totalPages: number, setCurrentPage: (page: number) => void) => (
    <>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {visibleColumns.includes("Nome") && <TableHead>Nome</TableHead>}
              {visibleColumns.includes("CRMV") && <TableHead>CRMV</TableHead>}
              {visibleColumns.includes("Email") && <TableHead>Email</TableHead>}
              {visibleColumns.includes("Telefone") && <TableHead>Telefone</TableHead>}
              {visibleColumns.includes("Especialidade") && <TableHead>Especialidade</TableHead>}
              {visibleColumns.includes("Credenciais") && <TableHead>Credenciais</TableHead>}
              {visibleColumns.includes("Acesso Atendimentos") && <TableHead>Acesso Atendimentos</TableHead>}
              {visibleColumns.includes("Status") && <TableHead>Status</TableHead>}
              {visibleColumns.includes("Ações") && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {vets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length} className="text-center py-8 text-muted-foreground">
                  Nenhum veterinário encontrado
                </TableCell>
              </TableRow>
            ) : (
              vets.map((vet) => (
                <TableRow key={vet.id}>
                  {visibleColumns.includes("Nome") && <TableCell className="font-medium">{vet.name}</TableCell>}
                  {visibleColumns.includes("CRMV") && <TableCell>{vet.crmv}</TableCell>}
                  {visibleColumns.includes("Email") && <TableCell>{vet.email}</TableCell>}
                  {visibleColumns.includes("Telefone") && <TableCell>{vet.phone}</TableCell>}
                  {visibleColumns.includes("Especialidade") && <TableCell>{vet.specialty || "-"}</TableCell>}
                  {visibleColumns.includes("Credenciais") && (
                    <TableCell>
                      <Badge variant={vet.login ? "default" : "secondary"}>
                        {vet.login ? "Configurado" : "Não configurado"}
                      </Badge>
                    </TableCell>
                  )}
                  {visibleColumns.includes("Acesso Atendimentos") && (
                    <TableCell>
                      <Badge variant={vet.canAccessAtendimentos ? "default" : "secondary"}>
                        {vet.canAccessAtendimentos ? "Sim" : "Não"}
                      </Badge>
                    </TableCell>
                  )}
                  {visibleColumns.includes("Status") && (
                    <TableCell>
                      <Switch
                        checked={vet.isActive}
                        onCheckedChange={() => handleToggleStatus(vet.id, vet.isActive)}
                      />
                    </TableCell>
                  )}
                  {visibleColumns.includes("Ações") && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(vet)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(vet.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 py-4">
          <div className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-cream-light)]">
        <div className="text-center">
          <LoadingDots size="lg" color="#0e7074" className="mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <UnitLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground break-words">Corpo Clínico</h1>
            <p className="text-sm text-muted-foreground">Gerencie os veterinários da unidade</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por nome, CRMV ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex-1 sm:flex-initial">
                  <MoreHorizontal className="h-4 w-4 mr-2" />
                  Colunas
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {allColumns.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column}
                    checked={visibleColumns.includes(column)}
                    onCheckedChange={() => toggleColumn(column)}
                  >
                    {column}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={() => {
                setEditingVet(null);
                form.reset({
                  name: "",
                  crmv: "",
                  email: "",
                  phone: "",
                  specialty: "",
                  type: currentTab,
                  login: "",
                  password: "",
                  canAccessAtendimentos: false,
                  isActive: true,
                });
                setDialogOpen(true);
              }}
              className="flex-1 sm:flex-initial"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Veterinário
            </Button>
          </div>
        </div>

        <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value as "permanente" | "volante")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="permanente">
              <Users className="h-4 w-4 mr-2" />
              Veterinários Permanentes ({permanenteVets.length})
            </TabsTrigger>
            <TabsTrigger value="volante">
              <Users className="h-4 w-4 mr-2" />
              Veterinários Volantes ({volanteVets.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="permanente" className="mt-6">
            {isLoadingVets ? (
              <div className="flex justify-center py-8">
                <LoadingDots size="lg" color="#0e7074" />
              </div>
            ) : (
              renderVeterinarianTable(paginatedPermanenteVets, permanenteCurrentPage, totalPermanentePages, setPermanenteCurrentPage)
            )}
          </TabsContent>

          <TabsContent value="volante" className="mt-6">
            {isLoadingVets ? (
              <div className="flex justify-center py-8">
                <LoadingDots size="lg" color="#0e7074" />
              </div>
            ) : (
              renderVeterinarianTable(paginatedVolanteVets, volanteCurrentPage, totalVolantePages, setVolanteCurrentPage)
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingVet(null);
            form.reset();
            setShowPassword(false);
          }
        }}>
          <DialogContent className="overflow-y-auto max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {editingVet ? "Editar Veterinário" : "Novo Veterinário"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="crmv"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CRMV *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: CRMV-SP 12345" />
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
                          <InputMasked {...field} type="email" mask="email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone *</FormLabel>
                        <FormControl>
                          <InputMasked {...field} mask="phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="specialty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Especialidade</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: Cirurgia, Dermatologia" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="permanente">Permanente</SelectItem>
                            <SelectItem value="volante">Volante</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="login"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Login de Acesso</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Opcional" />
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
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              placeholder={editingVet ? "Deixe em branco para manter" : "Senha de acesso"}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="canAccessAtendimentos"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Acesso a Atendimentos</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Permitir que este veterinário acesse e gerencie atendimentos
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Status Ativo</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Veterinário ativo pode acessar o sistema
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      setEditingVet(null);
                      form.reset();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Salvando..." : editingVet ? "Atualizar" : "Criar"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </UnitLayout>
  );
}
