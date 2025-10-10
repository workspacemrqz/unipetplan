import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/admin/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { InputMasked } from "@/components/ui/input-masked";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/admin/queryClient";
import { insertNetworkUnitSchema } from "@shared/schema";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { NetworkUnitImageUpload } from "@/components/ui/network-unit-image-upload";
import { generateSlug } from "@/lib/utils";

export default function NetworkForm() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [generatedSlug, setGeneratedSlug] = useState<string>("");
  const [originalName, setOriginalName] = useState<string>("");

  const isEdit = Boolean(params.id);

  const { data: unit, isLoading } = useQuery({
    queryKey: ["/admin/api/network-units", params.id],
    enabled: isEdit,
  });

  // Buscar procedimentos ativos para substituir os serviços
  const { data: procedures } = useQuery({
    queryKey: ["/admin/api/procedures"],
  });

  const form = useForm({
    resolver: zodResolver(insertNetworkUnitSchema),
    defaultValues: {
      name: "",
      address: "",
      cidade: "",
      phone: "",
      services: [],
      imageUrl: "",
      isActive: true,
      whatsapp: "",
      googleMapsUrl: "",
      urlSlug: "",
    },
  });

  useEffect(() => {
    if (unit && typeof unit === 'object') {
      const services = (unit as any).services || [];
      const unitName = (unit as any).name || "";
      const slug = (unit as any).urlSlug || generateSlug(unitName);
      
      setSelectedServices(services);
      setGeneratedSlug(slug);
      setOriginalName(unitName); // Track original name for comparison
      
      form.reset({
        name: unitName,
        address: (unit as any).address || "",
        cidade: (unit as any).cidade || "",
        phone: (unit as any).phone || "",
        services: services,
        imageUrl: (unit as any).imageUrl || "",
        isActive: (unit as any).isActive ?? true,
        whatsapp: (unit as any).whatsapp || "",
        googleMapsUrl: (unit as any).googleMapsUrl || "",
        urlSlug: slug,
      });
      // Make sure form state is synced
      form.setValue("services", services);
    }
  }, [unit, form]);

  // Auto-generate slug when name changes
  const watchedName = form.watch("name");
  useEffect(() => {
    if (watchedName) {
      if (isEdit) {
        // In edit mode, show what the slug would be if the name changed
        if (watchedName !== originalName) {
          const newSlug = generateSlug(watchedName);
          setGeneratedSlug(newSlug);
        }
      } else {
        // In create mode, always generate slug from name
        const newSlug = generateSlug(watchedName);
        setGeneratedSlug(newSlug);
        form.setValue("urlSlug", newSlug);
      }
    }
  }, [watchedName, form, isEdit, originalName]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEdit) {
        await apiRequest("PUT", `/admin/api/network-units/${params.id}`, data);
      } else {
        await apiRequest("POST", "/admin/api/network-units", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/admin/api/network-units"] });
      toast({
        title: isEdit ? "Unidade atualizada" : "Unidade cadastrada",
        description: isEdit ? "Unidade foi atualizada com sucesso." : "Unidade foi cadastrada com sucesso.",
      });
      setLocation("/rede");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: isEdit ? "Falha ao atualizar unidade." : "Falha ao cadastrar unidade.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    console.log("🔍 [NetworkForm] onSubmit called with data:", data);
    console.log("🔍 [NetworkForm] Selected services:", selectedServices);
    console.log("🔍 [NetworkForm] Generated slug:", generatedSlug);
    
    // Validate that services are selected
    if (!selectedServices || selectedServices.length === 0) {
      console.error("❌ [NetworkForm] No services selected!");
      toast({
        title: "Erro",
        description: "Selecione pelo menos um serviço",
        variant: "destructive",
      });
      return;
    }
    
    const submissionData = {
      ...data,
      services: selectedServices,
    };
    
    // Remove formatting from whatsapp field (keep only digits)
    if (submissionData.whatsapp) {
      submissionData.whatsapp = submissionData.whatsapp.replace(/\D/g, "");
    }
    
    // Handle URL slug logic:
    // - For new units: always include the generated slug
    // - For editing: only include urlSlug if the name hasn't changed
    //   This allows the server to regenerate the slug when the name changes
    if (isEdit) {
      if (data.name === originalName) {
        // Name didn't change, keep the original slug
        submissionData.urlSlug = form.getValues("urlSlug");
      }
      // If name changed, omit urlSlug to let server regenerate it
    } else {
      // New unit, include the generated slug
      submissionData.urlSlug = generatedSlug;
    }
    
    console.log("📤 [NetworkForm] Submitting data:", submissionData);
    mutation.mutate(submissionData);
  };

  const handleServiceChange = (service: string, checked: boolean) => {
    let newServices: string[];
    if (checked) {
      newServices = [...selectedServices, service];
    } else {
      newServices = selectedServices.filter(s => s !== service);
    }
    setSelectedServices(newServices);
    // Sync with form state
    form.setValue("services", newServices);
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
          {isEdit ? "Editar Unidade" : "Nova Unidade"}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          {isEdit ? "Atualize as informações da unidade" : "Cadastre uma nova unidade da rede"}
        </p>
      </div>

      {/* Back Button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setLocation("/rede")}
        data-testid="button-back-to-network"
        className="w-full sm:w-auto"
        style={{ backgroundColor: '#FFFFFF' }}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar
      </Button>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
          console.error("❌ [NetworkForm] Validation errors:", errors);
          // Show first validation error as toast
          const firstError = Object.values(errors)[0] as any;
          if (firstError?.message) {
            toast({
              title: "Erro de validação",
              description: firstError.message,
              variant: "destructive",
            });
          }
        })} className="space-y-6">
          {/* Basic Information */}
          <Card style={{ backgroundColor: '#FFFFFF' }}>
            <CardHeader>
              <CardTitle className="text-foreground">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Unidade *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-unit-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* URL Slug Preview */}
                <div className="col-span-full">
                  <FormLabel className="text-sm font-medium">URL da Unidade</FormLabel>
                  <div className="mt-1 p-3 bg-muted/50 border border-border rounded-md">
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={`${window.location.origin}/${generatedSlug || "nome-da-unidade"}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600"
                      >
                        {window.location.origin}/{generatedSlug || "nome-da-unidade"}
                      </a>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {!isEdit 
                        ? "A URL é gerada automaticamente baseada no nome da unidade" 
                        : watchedName !== originalName 
                          ? "Nova URL será gerada automaticamente quando o nome for alterado"
                          : "URL atual da unidade - clique para acessar"
                      }
                    </p>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-cidade" />
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
                  name="whatsapp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp</FormLabel>
                      <FormControl>
                        <InputMasked 
                          mask="whatsapp"
                          {...field} 
                          data-testid="input-whatsapp" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Imagem da unidade *</FormLabel>
                      <FormControl>
                        <NetworkUnitImageUpload 
                          value={field.value} 
                          onChange={field.onChange}
                          unitId={params.id}
                          data-testid="input-image-url"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="googleMapsUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Link do Google Maps</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://maps.google.com/..." data-testid="input-maps-url" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 col-span-full">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Unidade Ativa</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Unidades ativas são exibidas na rede credenciada
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-unit-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Services */}
          <Card style={{ backgroundColor: '#FFFFFF' }}>
            <CardHeader>
              <CardTitle className="text-foreground">Serviços Oferecidos *</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.isArray(procedures) && procedures
                  .filter((procedure: any) => procedure.isActive)
                  .map((procedure: any) => (
                    <div key={procedure.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`service-${procedure.id}`}
                        checked={selectedServices.includes(procedure.name)}
                        onCheckedChange={(checked) => handleServiceChange(procedure.name, checked as boolean)}
                        data-testid={`checkbox-service-${procedure.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')}`}
                      />
                      <label 
                        htmlFor={`service-${procedure.id}`}
                        className="text-sm text-foreground cursor-pointer"
                      >
                        {procedure.name}
                      </label>
                    </div>
                  ))}
              </div>
              {selectedServices.length === 0 && (
                <p className="text-sm text-destructive mt-2">
                  Selecione pelo menos um serviço
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-center flex-col md:flex-row gap-3 md:gap-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLocation("/rede")}
              data-testid="button-cancel"
              className="md:w-auto w-full md:h-10 h-12 md:text-sm text-base"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="admin-action"
              size="sm"
              disabled={mutation.isPending}
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
    </div>
  );
}
