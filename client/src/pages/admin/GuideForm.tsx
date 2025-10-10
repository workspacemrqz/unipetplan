import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/admin/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/admin/queryClient";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";

export default function GuideForm() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cpfSearch, setCpfSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clientPets, setClientPets] = useState<any[]>([]);

  // Função para formatar CPF
  const formatCpf = (value: string) => {
    // Remove todos os caracteres não numéricos
    const numbers = value.replace(/\D/g, '');
    
    // Limita a 11 dígitos
    const limited = numbers.slice(0, 11);
    
    // Aplica a formatação XXX.XXX.XXX-XX
    if (limited.length <= 3) {
      return limited;
    } else if (limited.length <= 6) {
      return `${limited.slice(0, 3)}.${limited.slice(3)}`;
    } else if (limited.length <= 9) {
      return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6)}`;
    } else {
      return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6, 9)}-${limited.slice(9)}`;
    }
  };

  const isEdit = Boolean(params['id']);
  
  // Extract query parameters from URL
  const urlParams = new URLSearchParams(window.location.search);
  const urlClientId = urlParams.get('clientId');
  const urlPetId = urlParams.get('petId');

  const { data: guide, isLoading: guideLoading } = useQuery<any>({
    queryKey: ["/admin/api/guides", params['id']],
    enabled: isEdit,
  });


  const guideFormSchema = z.object({
    clientId: z.string().min(1, "Cliente é obrigatório"),
    petId: z.string().min(1, "Pet é obrigatório"),
    procedure: z.string().min(1, "Procedimento é obrigatório"),
    generalNotes: z.string().optional(),
    value: z.string().optional(),
    status: z.string().optional(),
  });

  const form = useForm({
    resolver: zodResolver(guideFormSchema),
    mode: 'onChange',
    defaultValues: {
      clientId: urlClientId || "",
      petId: urlPetId || "",
      procedure: "",
      generalNotes: "",
      value: "",
      status: "open",
    },
  });

  // Fetch available procedures for the selected pet
  const petIdToFetch = form.watch("petId") || urlPetId || guide?.petId;
  const { data: availableProcedures, isLoading: proceduresLoading } = useQuery<any>({
    queryKey: ["/admin/api/pets", petIdToFetch, "available-procedures"],
    queryFn: () => apiRequest("GET", `/admin/api/pets/${petIdToFetch}/available-procedures`),
    enabled: Boolean(petIdToFetch),
  });

  useEffect(() => {
    if (guide) {
      form.reset({
        clientId: guide.clientId || "",
        petId: guide.petId || "",
        procedure: guide.procedure || "",
        generalNotes: guide.generalNotes || "",
        value: guide.value || "",
        status: guide.status || "open",
      });
    } else if (urlClientId || urlPetId) {
      // Set URL parameters if editing and no guide data yet
      form.setValue("clientId", urlClientId || "");
      form.setValue("petId", urlPetId || "");
    }
  }, [guide, form, urlClientId, urlPetId]);

  // Load client and pets when editing or URL params are present
  useEffect(() => {
    const loadClientAndPets = async () => {
      const clientId = guide?.clientId || urlClientId;
      
      if (clientId && !selectedClient) {
        try {
          const loadedClient = await apiRequest("GET", `/admin/api/clients/${clientId}`);
          setSelectedClient(loadedClient);
          setCpfSearch(loadedClient.cpf || "");
          form.setValue("clientId", loadedClient.id);
          
          const pets = await apiRequest("GET", `/admin/api/clients/${clientId}/pets`);
          setClientPets(pets);
          
          // Set the petId if it's provided in URL or guide
          const petId = guide?.petId || urlPetId;
          if (petId) {
            form.setValue("petId", petId);
          } else if (pets.length === 1) {
            // Auto-select if only one pet
            form.setValue("petId", pets[0].id);
          }
        } catch (error) {
          console.error("Error loading client and pets:", error);
        }
      }
    };
    
    loadClientAndPets();
  }, [guide?.clientId, urlClientId, selectedClient]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEdit) {
        await apiRequest("PUT", `/admin/api/guides/${params['id']}`, data);
      } else {
        await apiRequest("POST", "/admin/api/guides", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/admin/api/guides"] });
      toast({
        title: isEdit ? "Guia atualizada" : "Guia criada",
        description: isEdit ? "Guia foi atualizada com sucesso." : "Guia foi criada com sucesso.",
      });
      setLocation("/guias");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: isEdit ? "Falha ao atualizar guia." : "Falha ao criar guia.",
        variant: "destructive",
      });
    },
  });

  // Search client by CPF
  const searchClientByCpf = async () => {
    const sanitizedCpf = cpfSearch.replace(/\D/g, ''); // Remove non-numeric characters
    
    if (!sanitizedCpf || sanitizedCpf.length !== 11) {
      toast({
        title: "CPF inválido",
        description: "Digite um CPF válido com 11 dígitos.",
        variant: "destructive",
      });
      return;
    }

    try {
      const client = await apiRequest("GET", `/admin/api/clients/cpf/${sanitizedCpf}`);
      setSelectedClient(client);
      form.setValue("clientId", client.id);
      
      // Load client pets
      const pets = await apiRequest("GET", `/admin/api/clients/${client.id}/pets`);
      setClientPets(pets);
      
      // Reset petId to prevent stale associations
      form.setValue("petId", "");
      
      // Auto-select if only one pet
      if (pets.length === 1) {
        form.setValue("petId", pets[0].id);
      }
      
      toast({
        title: "Cliente encontrado",
        description: `${client.fullName} - CPF: ${client.cpf}`,
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Cliente não encontrado com este CPF.",
        variant: "destructive",
      });
      setSelectedClient(null);
      setClientPets([]);
      form.setValue("clientId", "");
      form.setValue("petId", "");
    }
  };

  const onSubmit = (data: any) => {
    if (!data.clientId || !data.petId) {
      toast({
        title: "Erro",
        description: "Cliente e pet são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    mutation.mutate(data);
  };


  if (isEdit && guideLoading) {
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
          {isEdit ? "Editar Guia" : "Nova Guia"}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          {isEdit ? "Atualize as informações da guia" : "Crie uma nova guia de atendimento"}
        </p>
      </div>

      {/* Back Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setLocation("/guias")}
        data-testid="button-back-to-guides"
        className="w-full sm:w-auto"
        style={{ backgroundColor: '#FFFFFF' }}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar
      </Button>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          {/* Guide Information */}
          <Card style={{ backgroundColor: '#FFFFFF' }}>
            <CardHeader>
              <CardTitle className="text-foreground">Informações da Guia</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* CPF Search Field */}
                <div className="space-y-2">
                  <FormLabel>Cliente (CPF) *</FormLabel>
                  <div className="flex gap-2">
                    <Input
                      placeholder="000.000.000-00"
                      value={cpfSearch}
                      onChange={(e) => setCpfSearch(formatCpf(e.target.value))}
                      maxLength={14}
                      style={{
                        borderColor: 'var(--border-gray)',
                        background: 'white'
                      }}
                    />
                    <Button
                      type="button"
                      onClick={searchClientByCpf}
                      variant="admin-action"
                      className="h-10"
                    >
                      Buscar
                    </Button>
                  </div>
                  {selectedClient && (
                    <p className="text-sm text-primary">
                      Cliente: {selectedClient.fullName}
                    </p>
                  )}
                </div>

                {/* Pet Selection Field */}
                <FormField
                  control={form.control}
                  name="petId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pet *</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={!selectedClient || clientPets.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger 
                            style={{
                              borderColor: 'var(--border-gray)',
                              background: 'white'
                            }}
                          >
                            <SelectValue placeholder={
                              !selectedClient ? "Busque um cliente primeiro" :
                              clientPets.length === 0 ? "Cliente sem pets cadastrados" :
                              "Selecione o pet"
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clientPets.flatMap((pet, index) => [
                            <SelectItem 
                              key={pet.id} 
                              value={pet.id}
                              className="py-3 pl-8 pr-4 data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground"
                            >
                              {pet.name} ({pet.species})
                            </SelectItem>,
                            ...(index < clientPets.length - 1 ? [<Separator key={`separator-${pet.id}`} />] : [])
                          ])}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="procedure"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Procedimento *</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Atualizar coparticipação quando procedimento for selecionado
                          const selectedProc = availableProcedures?.procedures?.find((p: any) => p.name === value);
                          if (selectedProc) {
                            const coparticipationValue = selectedProc.coparticipation || 0;
                            // Sempre armazenar um valor numérico formatado, mesmo quando for zero
                            form.setValue("value", coparticipationValue.toFixed(2).replace('.', ','));
                          }
                        }} 
                        value={field.value} 
                        disabled={!petIdToFetch || proceduresLoading}
                      >
                        <FormControl>
                          <SelectTrigger 
                            data-testid="select-procedure"
                            style={{
                              borderColor: 'var(--border-gray)',
                              background: 'white'
                            }}
                          >
                            <SelectValue placeholder={
                              !petIdToFetch ? "Selecione um pet primeiro" : 
                              proceduresLoading ? "Carregando procedimentos..." :
                              availableProcedures?.procedures?.length === 0 ? "Nenhum procedimento disponível" :
                              "Selecione o procedimento"
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableProcedures?.procedures?.length > 0 ? (
                            availableProcedures.procedures.flatMap((proc: any, index: number, array: any[]) => [
                              <SelectItem 
                                key={proc.id} 
                                value={proc.name} 
                                className="py-3 pl-8 pr-4 data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground"
                              >
                                <div className="flex flex-col">
                                  <span>{proc.name}</span>
                                  <span className="text-xs">
                                    Limite: {proc.remaining}/{proc.annualLimit} restantes
                                  </span>
                                </div>
                              </SelectItem>,
                              ...(index < array.length - 1 ? [<Separator key={`separator-${proc.id}`} />] : [])
                            ])
                          ) : (
                            <div className="p-4 text-sm text-muted-foreground">
                              {!petIdToFetch ? "Selecione um pet primeiro" :
                               availableProcedures?.message || "Nenhum procedimento disponível"}
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                      {field.value && (
                        <p className="text-sm text-primary mt-1">
                          Coparticipação: {form.getValues("value") === "0,00" ? "Sem coparticipação" : `R$ ${form.getValues("value")}`}
                        </p>
                      )}
                    </FormItem>
                  )}
                />

                {/* Campo oculto para manter o valor de coparticipação */}
                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <input type="hidden" {...field} />
                  )}
                />

                {/* Campo Status - apenas visível na edição */}
                {isEdit && (
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger 
                              data-testid="select-status"
                              style={{
                                borderColor: 'var(--border-gray)',
                                background: 'white'
                              }}
                            >
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[{value: "open", label: "Aberta"}, {value: "closed", label: "Fechada"}, {value: "cancelled", label: "Cancelada"}].flatMap((status, index, array) => [
                              <SelectItem key={status.value} value={status.value} className="py-3 pl-8 pr-4 data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground">
                                {status.label}
                              </SelectItem>,
                              ...(index < array.length - 1 ? [<Separator key={`separator-${status.value}`} />] : [])
                            ])}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Campo oculto Status para criação */}
                {!isEdit && (
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <input type="hidden" {...field} value="open" />
                    )}
                  />
                )}
              </div>

              <div className="mt-6 space-y-4">
                <FormField
                  control={form.control}
                  name="generalNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Anotações Gerais</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Observações gerais sobre a guia..."
                          data-testid="textarea-general-notes" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center flex-col md:flex-row gap-3 md:gap-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLocation("/guias")}
              data-testid="button-cancel"
              className="md:w-auto w-full md:h-10 h-12 md:text-sm text-base"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="admin-action"
              size="sm"
              className="md:w-auto w-full md:h-10 h-12 md:text-sm text-base"
              disabled={mutation.isPending || !form.formState.isValid || !form.getValues('procedure')}
              data-testid="button-save"
            >
              {mutation.isPending ? "Salvando..." : isEdit ? "Atualizar" : "Criar Guia"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
