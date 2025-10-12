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
import { ArrowLeft, Loader2 } from "lucide-react";

export default function AtendimentoForm() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cpfSearch, setCpfSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clientPets, setClientPets] = useState<any[]>([]);
  const [procedureSearch, setProcedureSearch] = useState("");
  const [isSearchingClient, setIsSearchingClient] = useState(false);

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
    queryKey: ["/admin/api/atendimentos", params['id']],
    enabled: isEdit,
  });


  const guideFormSchema = z.object({
    clientId: z.string().min(1, "Cliente é obrigatório"),
    petId: z.string().min(1, "Pet é obrigatório"),
    procedure: z.string().min(1, "Procedimento é obrigatório"),
    networkUnitId: z.string().min(1, "Rede credenciada é obrigatória"),
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
      networkUnitId: "",
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

  // Fetch network units (redes credenciadas)
  const { data: networkUnits = [], isLoading: networkUnitsLoading } = useQuery<any[]>({
    queryKey: ["/admin/api/network-units"],
  });

  useEffect(() => {
    if (guide) {
      form.reset({
        clientId: guide.clientId || "",
        petId: guide.petId || "",
        procedure: guide.procedure || "",
        networkUnitId: guide.networkUnitId || "",
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
            // When loading existing data, preserve other fields if editing
            // But clear them if creating new (no guide data)
            if (!guide) {
              form.setValue("networkUnitId", "");
              form.setValue("procedure", "");
              form.setValue("generalNotes", "");
              form.setValue("value", "");
            }
          } else if (pets.length === 1) {
            // Auto-select if only one pet
            form.setValue("petId", pets[0].id);
            // Clear dependent fields for new guides
            if (!guide) {
              form.setValue("networkUnitId", "");
              form.setValue("procedure", "");
              form.setValue("generalNotes", "");
              form.setValue("value", "");
            }
          }
        } catch (error) {
          console.error("Error loading client and pets:", error);
        }
      }
    };
    
    loadClientAndPets();
  }, [guide?.clientId, urlClientId, selectedClient]);

  // Auto-search when CPF has 11 digits
  useEffect(() => {
    const sanitizedCpf = cpfSearch.replace(/\D/g, '');
    
    // If CPF has exactly 11 digits, search automatically
    if (sanitizedCpf.length === 11) {
      searchClientByCpf();
    } 
    // If CPF is cleared or modified (less than 11 digits), clear all dependent data
    else if (sanitizedCpf.length < 11 && selectedClient) {
      setSelectedClient(null);
      setClientPets([]);
      form.setValue("clientId", "");
      form.setValue("petId", "");
      form.setValue("networkUnitId", "");
      form.setValue("procedure", "");
      form.setValue("generalNotes", "");
      form.setValue("value", "");
    }
  }, [cpfSearch]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEdit) {
        await apiRequest("PUT", `/admin/api/atendimentos/${params['id']}`, data);
      } else {
        await apiRequest("POST", "/admin/api/atendimentos", data);
      }
    },
    onSuccess: async () => {
      // Invalidar todas as queries relacionadas a atendimentos para atualizar a lista (em paralelo)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/admin/api/atendimentos"] }),
        queryClient.invalidateQueries({ queryKey: ["/admin/api/atendimentos/with-network-units"] }),
        queryClient.invalidateQueries({ queryKey: ["/admin/api/dashboard/all"] })
      ]);
      
      toast({
        title: isEdit ? "Atendimento atualizado" : "Atendimento criado",
        description: isEdit ? "Atendimento foi atualizado com sucesso." : "Atendimento foi criado com sucesso.",
      });
      
      // Redirecionar imediatamente após invalidar as queries
      setLocation("/atendimentos");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: isEdit ? "Falha ao atualizar atendimento." : "Falha ao criar atendimento.",
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

    setIsSearchingClient(true); // Start loading
    
    try {
      const client = await apiRequest("GET", `/admin/api/clients/cpf/${sanitizedCpf}`);
      setSelectedClient(client);
      form.setValue("clientId", client.id);
      
      // Load client pets
      const pets = await apiRequest("GET", `/admin/api/clients/${client.id}/pets`);
      setClientPets(pets);
      
      // Reset ALL dependent fields when client changes
      form.setValue("petId", "");
      form.setValue("networkUnitId", "");
      form.setValue("procedure", "");
      form.setValue("generalNotes", "");
      form.setValue("value", "");
      
      // Auto-select if only one pet
      if (pets.length === 1) {
        form.setValue("petId", pets[0].id);
        // Keep dependent fields cleared - user must select them again
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
      form.setValue("networkUnitId", "");
      form.setValue("procedure", "");
      form.setValue("generalNotes", "");
      form.setValue("value", "");
    } finally {
      setIsSearchingClient(false); // Stop loading
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
          {isEdit ? "Editar Atendimento" : "Novo Atendimento"}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          {isEdit ? "Atualize as Informações do Atendimento" : "Inicie um novo atendimento"}
        </p>
      </div>

      {/* Back Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setLocation("/atendimentos")}
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
              <CardTitle className="text-foreground">Informações do Atendimento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* CPF Search Field */}
                <div className="space-y-2">
                  <FormLabel>Cliente (CPF) *</FormLabel>
                  <div className="relative">
                    <Input
                      placeholder="000.000.000-00"
                      value={cpfSearch}
                      onChange={(e) => setCpfSearch(formatCpf(e.target.value))}
                      maxLength={14}
                      className="h-12"
                      style={{
                        borderColor: 'var(--border-gray)',
                        background: 'white'
                      }}
                    />
                    {isSearchingClient && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                  {selectedClient && (
                    <p className="text-sm text-primary">
                      Cliente: {selectedClient.fullName}
                    </p>
                  )}
                </div>

                {/* Pet Selection Field - Only show if client is selected */}
                {selectedClient && (
                  <FormField
                    control={form.control}
                    name="petId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pet *</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Reset dependent fields when pet changes
                            form.setValue("networkUnitId", "");
                            form.setValue("procedure", "");
                            form.setValue("generalNotes", "");
                            form.setValue("value", "");
                          }} 
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
                )}

                {/* Rede Credenciada - Only show if pet is selected */}
                {form.watch("petId") && (
                  <FormField
                    control={form.control}
                    name="networkUnitId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rede Credenciada *</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Reset procedure when network unit changes
                            form.setValue("procedure", "");
                            form.setValue("value", "");
                          }} 
                          value={field.value}
                          disabled={networkUnitsLoading}
                        >
                          <FormControl>
                            <SelectTrigger 
                              data-testid="select-network-unit"
                              className="[&>span]:text-left [&>span]:flex [&>span]:flex-col [&>span]:items-start"
                              style={{
                                borderColor: 'var(--border-gray)',
                                background: 'white'
                              }}
                            >
                              <SelectValue placeholder={
                                networkUnitsLoading ? "Carregando redes..." :
                                networkUnits.length === 0 ? "Nenhuma rede disponível" :
                                "Selecione a rede credenciada"
                              } />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {networkUnits.length > 0 ? (
                              networkUnits.flatMap((unit: any, index: number, array: any[]) => [
                                <SelectItem 
                                  key={unit.id} 
                                  value={unit.id}
                                  className="py-3 pl-8 pr-4 data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground"
                                >
                                  {unit.name}
                                </SelectItem>,
                                ...(index < array.length - 1 ? [<Separator key={`separator-${unit.id}`} />] : [])
                              ])
                            ) : (
                              <div className="p-4 text-sm text-muted-foreground">
                                Nenhuma rede credenciada cadastrada
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Procedimento - Only show if network unit is selected */}
                {form.watch("networkUnitId") && (
                  <FormField
                    control={form.control}
                    name="procedure"
                    render={({ field }) => {
                      // TODO: Filter procedures based on selected network unit
                      // For now, we'll show all available procedures for the pet
                      const filteredProcedures = availableProcedures?.procedures?.filter((proc: any) => 
                        proc.name.toLowerCase().includes(procedureSearch.toLowerCase())
                      ) || [];

                      return (
                        <FormItem>
                          <FormLabel>Procedimento *</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              setProcedureSearch(""); // Clear search after selection
                              // Update coparticipation when procedure is selected
                              const selectedProc = availableProcedures?.procedures?.find((p: any) => p.name === value);
                              if (selectedProc) {
                                const coparticipationValue = selectedProc.coparticipation || 0;
                                form.setValue("value", coparticipationValue.toFixed(2).replace('.', ','));
                              }
                            }} 
                            value={field.value} 
                            disabled={!petIdToFetch || proceduresLoading}
                          >
                            <FormControl>
                              <SelectTrigger 
                                data-testid="select-procedure"
                                className="[&>span]:text-left [&>span]:flex [&>span]:flex-col [&>span]:items-start"
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
                              {/* Search field */}
                              <div className="p-2 border-b">
                                <Input
                                  placeholder="Digite para buscar..."
                                  value={procedureSearch}
                                  onChange={(e) => setProcedureSearch(e.target.value)}
                                  className="h-8"
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => e.stopPropagation()}
                                />
                              </div>
                              
                              {filteredProcedures.length > 0 ? (
                                filteredProcedures.flatMap((proc: any, index: number, array: any[]) => [
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
                                   procedureSearch ? "Nenhum procedimento encontrado" :
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
                      );
                    }}
                  />
                )}

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
                            {[{value: "open", label: "Aberta"}, {value: "closed", label: "Concluída"}, {value: "cancelled", label: "Cancelada"}].flatMap((status, index, array) => [
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

                {/* Anotações Gerais - Only show if procedure is selected */}
                {form.watch("procedure") && (
                  <div className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name="generalNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Anotações Gerais</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Observações gerais sobre o atendimento..."
                              data-testid="textarea-general-notes" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center flex-col md:flex-row gap-3 md:gap-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLocation("/atendimentos")}
              data-testid="button-cancel"
              className="md:w-auto w-full md:h-10 h-12 md:text-sm text-base"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="admin-action"
              size="sm"
              className="md:w-auto w-full md:h-10 h-12 md:text-sm text-base min-w-[120px]"
              disabled={mutation.isPending || !form.formState.isValid || !form.getValues('procedure')}
              data-testid="button-save"
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                isEdit ? "Atualizar" : "Criar Atendimento"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
