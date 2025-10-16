import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/admin/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { InputMasked } from "@/components/ui/input-masked";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/admin/queryClient";
import { insertClientAdminSchema } from "@shared/schema";
import { fetchAddressByCEP } from "@/utils/api-helpers";
import { ArrowLeft, Plus, Edit, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAdminLogger } from "@/hooks/admin/use-admin-logger";

export default function ClientForm() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { logAction } = useAdminLogger();

  const isEdit = Boolean(params.id);

  const { data: client, isLoading } = useQuery<any>({
    queryKey: ["/admin/api/clients", params.id],
    queryFn: () => apiRequest("GET", `/admin/api/clients/${params.id}`),
    enabled: isEdit,
  });

  const { data: pets = [], isLoading: petsLoading } = useQuery<any[]>({
    queryKey: ["/admin/api/clients", params.id, "pets"],
    queryFn: () => apiRequest("GET", `/admin/api/clients/${params.id}/pets`),
    enabled: !!params.id && !!client,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const { data: plans = [] } = useQuery<any[]>({
    queryKey: ["/admin/api/plans"],
    queryFn: () => apiRequest("GET", "/admin/api/plans"),
    enabled: !!params.id,
  });

  // Function to get plan name by ID
  const getPlanName = (planId: string): string => {
    const plan = plans.find((p: any) => p.id === planId);
    return plan ? plan.name : planId;
  };

  const form = useForm({
    resolver: zodResolver(insertClientAdminSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      cpf: "",
      cep: "",
      address: "",
      number: "",
      complement: "",
      district: "",
      state: "",
      city: "",
    },
  });

  useEffect(() => {
    if (client) {
      form.reset({
        full_name: client.fullName || "",
        email: client.email || "",
        phone: client.phone || "",
        cpf: client.cpf || "",
        cep: client.cep || "",
        address: client.address || "",
        number: client.number || "",
        complement: client.complement || "",
        district: client.district || "",
        state: client.state || "",
        city: client.city || "",
      });
    }
  }, [client, form]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEdit) {
        return await apiRequest("PUT", `/admin/api/clients/${params.id}`, data);
      } else {
        return await apiRequest("POST", "/admin/api/clients", data);
      }
    },
    onSuccess: async (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/admin/api/clients"] });
      
      const clientId = isEdit ? params.id : response?.id;
      if (clientId) {
        try {
          await logAction({
            actionType: isEdit ? "updated" : "created",
            entityType: "client",
            entityId: clientId,
            metadata: { 
              name: variables.full_name, 
              cpf: variables.cpf 
            }
          });
        } catch (error) {
          console.error("Failed to log action:", error);
        }
      }
      
      toast({
        title: isEdit ? "Cliente atualizado" : "Cliente cadastrado",
        description: isEdit ? "Cliente foi atualizado com sucesso." : "Cliente foi cadastrado com sucesso.",
      });
      setLocation("/clientes");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: isEdit ? "Falha ao atualizar cliente." : "Falha ao cadastrar cliente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    mutation.mutate(data);
  };

  const handleCEPLookup = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, "");
    if (cleanCEP.length === 8) {
      try {
        const result = await fetchAddressByCEP(cep);
        
        if (result.success && result.data) {
          form.setValue("address", result.data.street || "");
          form.setValue("district", result.data.neighborhood || "");
          form.setValue("city", result.data.city || "");
          form.setValue("state", result.data.state || "");
        } else {
          console.error("CEP não encontrado ou inválido");
          toast({
            title: "CEP não encontrado",
            description: result.error || "Não foi possível encontrar o endereço para o CEP informado.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
        toast({
          title: "Erro ao buscar CEP",
          description: "Ocorreu um erro ao buscar o endereço. Tente novamente.",
          variant: "destructive",
        });
      }
    }
  };

  if (isEdit && isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground break-words">
          {isEdit ? "Editar Cliente" : "Novo Cliente"}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          {isEdit ? "Atualize as informações do cliente" : "Cadastre um novo cliente"}
        </p>
      </div>

      {/* Back Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setLocation("/clientes")}
        data-testid="button-back-to-clients"
        className="w-full sm:w-auto"
        style={{ backgroundColor: '#FFFFFF' }}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar
      </Button>

      {/* Form */}
      <Card style={{ backgroundColor: '#FFFFFF' }}>
        <CardHeader>
          <CardTitle className="text-foreground">Informações do Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-full-name" />
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
                          type="email" 
                          mask="email"
                          {...field} 
                          data-testid="input-email" 
                        />
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
                      <FormLabel>Celular *</FormLabel>
                      <FormControl>
                        <InputMasked 
                          mask="phone"
                          {...field} 
                          data-testid="input-phone" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF *</FormLabel>
                      <FormControl>
                        <InputMasked 
                          mask="cpf"
                          {...field} 
                          data-testid="input-cpf" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cep"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <FormControl>
                        <InputMasked 
                          mask="cep"
                          {...field} 
                          data-testid="input-cep"
                          onBlur={(e) => handleCEPLookup(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="complement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Complemento</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-complement" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="district"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bairro</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-district" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-state" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-city" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-center flex-col md:flex-row gap-3 md:gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation("/clientes")}
                  data-testid="button-cancel"
                  className="md:w-auto w-full md:h-10 h-12 md:text-sm text-base"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="admin-action"
                  size="sm"
                  disabled={mutation.isPending || !form.formState.isValid || (!form.watch('full_name') || !form.watch('email') || !form.watch('phone') || !form.watch('cpf'))}
                  data-testid="button-save"
                  className="md:w-auto w-full md:h-10 h-12 md:text-sm text-base min-w-[120px]"
                >
                  {mutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    isEdit ? "Atualizar" : "Cadastrar"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Pets Section - Only show when editing */}
      {isEdit && (
        <Card style={{ backgroundColor: '#FFFFFF' }}>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="text-foreground">Pets do Cliente</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation(`/clientes/${params.id}/pets/novo`)}
                data-testid="button-add-pet"
                className="w-full md:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Pet
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {petsLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-20 bg-muted rounded"></div>
                <div className="h-20 bg-muted rounded"></div>
              </div>
            ) : pets.length > 0 ? (
              <div className="space-y-4">
                {pets.map((pet: any) => (
                  <div
                    key={pet.id}
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-border rounded-lg bg-card gap-4 md:gap-0"
                  >
                    <div className="flex-1">
                      {/* Mobile: Nome sozinho, Desktop: Nome + tags na linha */}
                      <div className="flex flex-col md:flex-row md:items-center md:gap-3">
                        <h3 className="font-semibold text-foreground mb-2 md:mb-0">{pet.name}</h3>
                        <div className="flex gap-2 md:gap-3">
                          <Badge variant="neutral">{pet.species}</Badge>
                          {pet.breed && (
                            <Badge variant="neutral">{pet.breed}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground mt-2">
                        {pet.birth_date && (
                          <div className="mb-1">Nascimento: {new Date(pet.birth_date).toLocaleDateString('pt-BR')}</div>
                        )}
                        {pet.plan_id && (
                          <div>Plano: {getPlanName(pet.plan_id)}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2 mt-2 md:mt-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLocation(`/pets/${pet.id}/editar`)}
                        data-testid={`button-edit-pet-${pet.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Este cliente ainda não possui pets cadastrados.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation(`/clientes/${params.id}/pets/novo`)}
                  data-testid="button-add-first-pet"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Primeiro Pet
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
