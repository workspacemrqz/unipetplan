import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/admin/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/admin/queryClient";
import { insertSellerSchema, type RulesSettings } from "@shared/schema";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAdminLogger } from "@/hooks/admin/use-admin-logger";

export default function SellerForm() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { logAction } = useAdminLogger();

  const isEdit = Boolean(params.id);

  const { data: seller, isLoading } = useQuery({
    queryKey: ["/admin/api/sellers", params.id],
    enabled: isEdit,
  });

  const { data: rulesSettings } = useQuery<RulesSettings>({
    queryKey: ["/admin/api/settings/rules"],
  });

  const form = useForm({
    resolver: zodResolver(insertSellerSchema),
    defaultValues: {
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
      pixKeyType: "cpf" as const,
      bank: "",
      accountNumber: "",
      fullNameForPayment: "",
      agency: "",
      cpaPercentage: "0",
      recurringCommissionPercentage: "0",
    },
  });

  useEffect(() => {
    if (seller && typeof seller === 'object') {
      form.reset({
        fullName: (seller as any).fullName || "",
        cpf: (seller as any).cpf || "",
        email: (seller as any).email || "",
        phone: (seller as any).phone || "",
        cep: (seller as any).cep || "",
        address: (seller as any).address || "",
        number: (seller as any).number || "",
        complement: (seller as any).complement || "",
        district: (seller as any).district || "",
        state: (seller as any).state || "",
        city: (seller as any).city || "",
        pixKey: (seller as any).pixKey || "",
        pixKeyType: (seller as any).pixKeyType || "cpf",
        bank: (seller as any).bank || "",
        accountNumber: (seller as any).accountNumber || "",
        fullNameForPayment: (seller as any).fullNameForPayment || "",
        agency: (seller as any).agency || "",
        cpaPercentage: String((seller as any).cpaPercentage || "0"),
        recurringCommissionPercentage: String((seller as any).recurringCommissionPercentage || "0"),
      });
    } else if (!isEdit && rulesSettings) {
      // Load default commission values for new sellers
      const defaultCpa = rulesSettings.defaultCpaPercentage ? String(rulesSettings.defaultCpaPercentage) : "0";
      const defaultRecurring = rulesSettings.defaultRecurringCommissionPercentage ? String(rulesSettings.defaultRecurringCommissionPercentage) : "0";
      
      form.setValue("cpaPercentage", defaultCpa);
      form.setValue("recurringCommissionPercentage", defaultRecurring);
    }
  }, [seller, rulesSettings, form, isEdit]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEdit) {
        const result = await apiRequest("PUT", `/admin/api/sellers/${params.id}`, data);
        return { ...result, formData: data };
      } else {
        const result = await apiRequest("POST", "/admin/api/sellers", data);
        return { ...result, formData: data };
      }
    },
    onSuccess: async (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/admin/api/sellers"] });
      toast({
        title: isEdit ? "Vendedor atualizado" : "Vendedor cadastrado",
        description: isEdit ? "Vendedor foi atualizado com sucesso." : "Vendedor foi cadastrado com sucesso.",
      });
      
      const sellerId = isEdit ? params.id : response.id;
      await logAction({
        actionType: isEdit ? "updated" : "created",
        entityType: "seller",
        entityId: sellerId,
        metadata: { 
          name: response.formData?.fullName || variables.fullName,
          email: response.formData?.email || variables.email
        }
      });
      
      setLocation("/vendedores");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: isEdit ? "Falha ao atualizar vendedor." : "Falha ao cadastrar vendedor.",
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
        const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
        const data = await response.json();
        if (!data.erro) {
          form.setValue("address", data.logradouro || "");
          form.setValue("district", data.bairro || "");
          form.setValue("city", data.localidade || "");
          form.setValue("state", data.uf || "");
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
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
          {isEdit ? "Editar Vendedor" : "Novo Vendedor"}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          {isEdit ? "Atualize as informações do vendedor" : "Cadastre um novo vendedor"}
        </p>
      </div>

      {/* Back Button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setLocation("/vendedores")}
        className="w-full sm:w-auto"
        style={{ backgroundColor: '#FFFFFF' }}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar
      </Button>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Dados Fiscais */}
          <Card style={{ backgroundColor: '#FFFFFF' }}>
            <CardHeader>
              <CardTitle className="text-foreground">Dados Fiscais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nome completo do vendedor" />
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
                        <Input {...field} placeholder="000.000.000-00" maxLength={14} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Contato */}
          <Card style={{ backgroundColor: '#FFFFFF' }}>
            <CardHeader>
              <CardTitle className="text-foreground">Contato</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="email@exemplo.com" />
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
                        <Input {...field} placeholder="(00) 00000-0000" maxLength={15} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Endereço */}
          <Card style={{ backgroundColor: '#FFFFFF' }}>
            <CardHeader>
              <CardTitle className="text-foreground">Endereço</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="cep"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="00000-000" 
                          maxLength={9}
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
                      <FormLabel>Endereço *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Rua, Avenida, etc" />
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
                      <FormLabel>Número *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="123" />
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
                        <Input {...field} placeholder="Apto, Bloco, etc" />
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
                      <FormLabel>Bairro *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Bairro" />
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
                      <FormLabel>Cidade *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Cidade" />
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
                      <FormLabel>Estado *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="SP" maxLength={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Dados de Pagamento */}
          <Card style={{ backgroundColor: '#FFFFFF' }}>
            <CardHeader>
              <CardTitle className="text-foreground">Dados de Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="pixKeyType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Chave PIX *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger style={{ borderColor: 'rgb(209, 213, 219)', backgroundColor: 'white' }}>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cpf" style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem', paddingLeft: '2.5rem', paddingRight: '1rem' }}>CPF</SelectItem>
                          <SelectSeparator />
                          <SelectItem value="cnpj" style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem', paddingLeft: '2.5rem', paddingRight: '1rem' }}>CNPJ</SelectItem>
                          <SelectSeparator />
                          <SelectItem value="email" style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem', paddingLeft: '2.5rem', paddingRight: '1rem' }}>Email</SelectItem>
                          <SelectSeparator />
                          <SelectItem value="phone" style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem', paddingLeft: '2.5rem', paddingRight: '1rem' }}>Telefone</SelectItem>
                          <SelectSeparator />
                          <SelectItem value="random" style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem', paddingLeft: '2.5rem', paddingRight: '1rem' }}>Chave Aleatória</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pixKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chave PIX *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Chave PIX" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bank"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Banco *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nome do banco" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="accountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conta Corrente *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Número da conta" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="agency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agência *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Número da agência" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fullNameForPayment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo (Conta) *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nome do titular da conta" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Comissões */}
          <Card style={{ backgroundColor: '#FFFFFF' }}>
            <CardHeader>
              <CardTitle className="text-foreground">Comissões</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="cpaPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comissão CPA (%) *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          max="100"
                          placeholder="0.00" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="recurringCommissionPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comissão Recorrente (%) *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          max="100"
                          placeholder="0.00" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/vendedores")}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="min-w-[120px]"
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
    </div>
  );
}
