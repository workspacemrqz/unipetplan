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
import { z } from "zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import UnitLayout from '@/components/unit/UnitLayout';

export default function NovaGuiaPage() {
  const [, setLocation] = useLocation();
  const { slug } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cpfSearch, setCpfSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clientPets, setClientPets] = useState<any[]>([]);
  const [procedureSearch, setProcedureSearch] = useState("");
  const [isSearchingClient, setIsSearchingClient] = useState(false);

  // Função para formatar CPF
  const formatCpf = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const limited = numbers.slice(0, 11);
    
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

  // Fetch unit info by slug to get networkUnitId
  const { data: unitInfo, isLoading: unitInfoLoading } = useQuery<any>({
    queryKey: [`/api/network-units/${slug}/info`],
    queryFn: async () => {
      const response = await fetch(`/api/network-units/${slug}/info`);
      if (!response.ok) {
        throw new Error('Erro ao buscar informações da unidade');
      }
      return response.json();
    },
    enabled: !!slug,
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
      clientId: "",
      petId: "",
      procedure: "",
      networkUnitId: "",
      generalNotes: "",
      value: "",
      status: "open",
    },
  });

  // Set networkUnitId when unit info is loaded
  useEffect(() => {
    if (unitInfo?.id) {
      form.setValue("networkUnitId", unitInfo.id);
    }
  }, [unitInfo, form]);

  // Fetch available procedures for the selected pet
  const petIdToFetch = form.watch("petId");
  const { data: availableProcedures, isLoading: proceduresLoading } = useQuery<any>({
    queryKey: [`/api/units/${slug}/pets/${petIdToFetch}/available-procedures`],
    queryFn: async () => {
      const token = localStorage.getItem('unitAuthToken');
      if (!token) {
        throw new Error('Token de autenticação não encontrado');
      }

      const response = await fetch(`/api/units/${slug}/pets/${petIdToFetch}/available-procedures`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar procedimentos');
      }

      return response.json();
    },
    enabled: Boolean(petIdToFetch),
  });

  // Auto-search when CPF has 11 digits
  useEffect(() => {
    const sanitizedCpf = cpfSearch.replace(/\D/g, '');
    
    if (sanitizedCpf.length === 11) {
      searchClientByCpf();
    } else if (sanitizedCpf.length < 11 && selectedClient) {
      setSelectedClient(null);
      setClientPets([]);
      form.setValue("clientId", "");
      form.setValue("petId", "");
      form.setValue("procedure", "");
      form.setValue("generalNotes", "");
      form.setValue("value", "");
    }
  }, [cpfSearch]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem('unitAuthToken');
      if (!token) {
        throw new Error('Token de autenticação não encontrado');
      }

      const response = await fetch(`/api/units/${slug}/guides`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar guia');
      }

      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [`/api/units/${slug}/guides`] });
      
      toast({
        title: "Guia criada",
        description: "Guia foi criada com sucesso.",
      });
      
      setLocation(`/unidade/${slug}/guias`);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao criar guia.",
        variant: "destructive",
      });
    },
  });

  // Search client by CPF
  const searchClientByCpf = async () => {
    const sanitizedCpf = cpfSearch.replace(/\D/g, '');
    
    if (!sanitizedCpf || sanitizedCpf.length !== 11) {
      toast({
        title: "CPF inválido",
        description: "Digite um CPF válido com 11 dígitos.",
        variant: "destructive",
      });
      return;
    }

    setIsSearchingClient(true);
    
    try {
      const token = localStorage.getItem('unitAuthToken');
      if (!token) {
        throw new Error('Token de autenticação não encontrado');
      }

      const clientResponse = await fetch(`/api/units/${slug}/clients/cpf/${sanitizedCpf}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!clientResponse.ok) {
        throw new Error('Cliente não encontrado com este CPF.');
      }

      const client = await clientResponse.json();
      setSelectedClient(client);
      form.setValue("clientId", client.id);
      
      // Load client pets
      const petsResponse = await fetch(`/api/units/${slug}/clients/${client.id}/pets`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!petsResponse.ok) {
        throw new Error('Erro ao buscar pets do cliente');
      }

      const pets = await petsResponse.json();
      setClientPets(pets);
      
      // Reset dependent fields
      form.setValue("petId", "");
      form.setValue("procedure", "");
      form.setValue("generalNotes", "");
      form.setValue("value", "");
      
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
      form.setValue("procedure", "");
      form.setValue("generalNotes", "");
      form.setValue("value", "");
    } finally {
      setIsSearchingClient(false);
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

  if (unitInfoLoading) {
    return (
      <UnitLayout>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </div>
      </UnitLayout>
    );
  }

  return (
    <UnitLayout>
      <div className="p-3 sm:p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground break-words">
            Nova Guia
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Crie uma nova guia de atendimento para sua unidade
          </p>
        </div>

        {/* Back Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLocation(`/unidade/${slug}/guias`)}
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

                  {/* Pet Selection Field */}
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

                  {/* Rede Credenciada - Pre-filled and disabled */}
                  {form.watch("petId") && (
                    <FormField
                      control={form.control}
                      name="networkUnitId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rede Credenciada *</FormLabel>
                          <div>
                            <Input
                              value={unitInfo?.name || 'Carregando...'}
                              disabled
                              className="h-12"
                              style={{
                                borderColor: 'var(--border-gray)',
                                background: '#f5f5f5',
                                cursor: 'not-allowed'
                              }}
                            />
                            <input type="hidden" {...field} />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            A unidade é pré-selecionada automaticamente
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Procedimento */}
                  {form.watch("petId") && form.watch("networkUnitId") && (
                    <FormField
                      control={form.control}
                      name="procedure"
                      render={({ field }) => {
                        const filteredProcedures = availableProcedures?.procedures?.filter((proc: any) => 
                          proc.name.toLowerCase().includes(procedureSearch.toLowerCase())
                        ) || [];

                        return (
                          <FormItem>
                            <FormLabel>Procedimento *</FormLabel>
                            <Select 
                              onValueChange={(value) => {
                                field.onChange(value);
                                setProcedureSearch("");
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
                          </FormItem>
                        );
                      }}
                    />
                  )}

                  {/* Valor - Calculated from procedure */}
                  {form.watch("procedure") && (
                    <FormField
                      control={form.control}
                      name="value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor da Coparticipação</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="0,00"
                              className="h-12"
                              style={{
                                borderColor: 'var(--border-gray)',
                                background: 'white'
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Notas Gerais */}
                  {form.watch("procedure") && (
                    <div className="md:col-span-2">
                      <FormField
                        control={form.control}
                        name="generalNotes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notas Gerais (Opcional)</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Adicione observações ou informações adicionais..."
                                className="min-h-[100px]"
                                style={{
                                  borderColor: 'var(--border-gray)',
                                  background: 'white'
                                }}
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

            {/* Submit Button */}
            {form.watch("procedure") && (
              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation(`/unidade/${slug}/guias`)}
                  style={{ backgroundColor: '#FFFFFF' }}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  variant="admin-action"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    "Criar Guia"
                  )}
                </Button>
              </div>
            )}
          </form>
        </Form>
      </div>
    </UnitLayout>
  );
}
