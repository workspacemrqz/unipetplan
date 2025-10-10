import { useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/admin/queryClient";
import { insertPetSchema } from "@shared/schema";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useSpecies } from "@/hooks/use-species";

export default function PetForm() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isEdit = Boolean(params.id);
  const clientId = params.clientId;

  const { data: pet, isLoading: petLoading } = useQuery<any>({
    queryKey: ["/admin/api/pets", params.id],
    queryFn: () => apiRequest("GET", `/admin/api/pets/${params.id}`),
    enabled: isEdit,
  });

  const { data: client, isLoading: clientLoading } = useQuery<any>({
    queryKey: ["/admin/api/clients", clientId],
    queryFn: () => apiRequest("GET", `/admin/api/clients/${clientId}`),
    enabled: Boolean(clientId),
  });

  const { data: plans } = useQuery<any[]>({
    queryKey: ["/admin/api/plans/active"],
    queryFn: () => apiRequest("GET", "/admin/api/plans/active"),
  });

  const { data: species, isLoading: speciesLoading } = useSpecies();

  const form = useForm({
    resolver: zodResolver(insertPetSchema),
    defaultValues: {
      clientId: clientId || "",
      name: "",
      species: "",
      breed: "",
      birthDate: undefined as Date | undefined,
      age: "",
      sex: "",
      castrated: false,
      color: "",
      weight: "",
      microchip: "",
      previousDiseases: "",
      surgeries: "",
      allergies: "",
      currentMedications: "",
      hereditaryConditions: "",
      vaccineData: [],
      lastCheckup: undefined as Date | undefined,
      parasiteTreatments: "",
      planId: "",
    },
  });

  useEffect(() => {
    if (pet) {
      form.reset({
        clientId: pet.client_id || pet.clientId,
        name: pet.name || "",
        species: pet.species || "",
        breed: pet.breed || "",
        birthDate: pet.birth_date ? new Date(pet.birth_date) : undefined,
        age: pet.age || "",
        sex: pet.sex || "",
        castrated: pet.castrated || false,
        color: pet.color || "",
        weight: pet.weight || "",
        microchip: pet.microchip || "",
        previousDiseases: pet.previous_diseases || pet.previousDiseases || "",
        surgeries: pet.surgeries || "",
        allergies: pet.allergies || "",
        currentMedications: pet.current_medications || pet.currentMedications || "",
        hereditaryConditions: pet.hereditary_conditions || pet.hereditaryConditions || "",
        vaccineData: pet.vaccine_data || pet.vaccineData || [],
        lastCheckup: pet.last_checkup ? new Date(pet.last_checkup) : undefined,
        parasiteTreatments: pet.parasite_treatments || pet.parasiteTreatments || "",
        planId: pet.plan_id || pet.planId || "",
      });
    } else if (clientId) {
      form.setValue("clientId", clientId);
    }
  }, [pet, clientId, form]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEdit) {
        await apiRequest("PUT", `/admin/api/pets/${params.id}`, data);
      } else {
        await apiRequest("POST", "/admin/api/pets", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/admin/api/pets"] });
      queryClient.invalidateQueries({ queryKey: ["/admin/api/clients", clientId, "pets"] });
      toast({
        title: isEdit ? "Pet atualizado" : "Pet cadastrado",
        description: isEdit ? "Pet foi atualizado com sucesso." : "Pet foi cadastrado com sucesso.",
      });
      setLocation("/clientes");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: isEdit ? "Falha ao atualizar pet." : "Falha ao cadastrar pet.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    mutation.mutate(data);
  };

  if ((isEdit && petLoading) || (clientId && clientLoading)) {
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
          {isEdit ? "Editar Pet" : "Novo Pet"}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          {client && `Cliente: ${client.fullName}`}
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

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                      <FormLabel>Nome do Pet *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-pet-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="species"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Espécie *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger 
                            data-testid="select-species"
                            className="[&>span]:text-left [&>span]:flex [&>span]:flex-col [&>span]:items-start"
                            style={{
                              borderColor: 'var(--border-gray)',
                              background: 'white'
                            }}
                          >
                            <SelectValue placeholder="Selecione a espécie" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {speciesLoading ? (
                            <SelectItem value="loading" disabled className="py-3 pl-10 pr-4">
                              Carregando espécies...
                            </SelectItem>
                          ) : (
                            (species || []).flatMap((speciesItem: any, index: number, array: any[]) => [
                              <SelectItem key={speciesItem.id} value={speciesItem.name} className="py-3 pl-10 pr-4 data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground">
                                {speciesItem.name}
                              </SelectItem>,
                              ...(index < array.length - 1 ? [<Separator key={`separator-${speciesItem.id}`} />] : [])
                            ])
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="breed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Raça</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-breed" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Idade</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: 2 anos" data-testid="input-age" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sex"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sexo *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger 
                            data-testid="select-sex"
                            className="[&>span]:text-left [&>span]:flex [&>span]:flex-col [&>span]:items-start"
                            style={{
                              borderColor: 'var(--border-gray)',
                              background: 'white'
                            }}
                          >
                            <SelectValue placeholder="Selecione o sexo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {["Macho", "Fêmea"].flatMap((sex, index, array) => [
                            <SelectItem key={sex} value={sex} className="py-3 pl-10 pr-4 data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground">
                              {sex}
                            </SelectItem>,
                            ...(index < array.length - 1 ? [<Separator key={`separator-${sex}`} />] : [])
                          ])}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="castrated"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-castrated"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Castrado/Esterilizado</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor/Pelagem</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-color" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Peso Atual (kg)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.1" data-testid="input-weight" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="microchip"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número do Microchip</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-microchip" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="planId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plano de Saúde</FormLabel>
                      <Select onValueChange={(value) => field.onChange(value === "none" ? "" : value)} value={field.value || "none"}>
                        <FormControl>
                          <SelectTrigger 
                            data-testid="select-plan"
                            className="[&>span]:text-left [&>span]:flex [&>span]:flex-col [&>span]:items-start"
                            style={{
                              borderColor: 'var(--border-gray)',
                              background: 'white'
                            }}
                          >
                            <SelectValue placeholder="Selecione um plano" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none" className="py-3 pl-10 pr-4 data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground">
                            Nenhum plano selecionado
                          </SelectItem>
                          <Separator />
                          {plans?.flatMap((plan: any, index: number) => [
                            <SelectItem key={plan.id} value={plan.id} className="py-3 pl-10 pr-4 data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground">
                              {plan.name} - {new Intl.NumberFormat('pt-BR', { 
                                style: 'currency', 
                                currency: 'BRL' 
                              }).format(parseFloat(plan.basePrice || 0))}
                            </SelectItem>,
                            ...(index < (plans?.length ?? 0) - 1 ? [<Separator key={`separator-${plan.id}`} />] : [])
                          ])}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Medical History */}
          <Card style={{ backgroundColor: '#FFFFFF' }}>
            <CardHeader>
              <CardTitle className="text-foreground">Histórico Médico</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="previousDiseases"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Doenças Prévias</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="textarea-previous-diseases" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="surgeries"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cirurgias ou Tratamentos Passados</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="textarea-surgeries" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="allergies"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alergias Conhecidas</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="textarea-allergies" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currentMedications"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Medicamentos Atuais</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="textarea-current-medications" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hereditaryConditions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Condições Hereditárias</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="textarea-hereditary-conditions" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Preventive Care */}
          <Card style={{ backgroundColor: '#FFFFFF' }}>
            <CardHeader>
              <CardTitle className="text-foreground">Cuidados Preventivos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="parasiteTreatments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tratamentos Antipulgas/Parasitas</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="textarea-parasite-treatments" />
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
              className="md:w-auto w-full md:h-10 h-12 md:text-sm text-base min-w-[120px]"
              disabled={mutation.isPending || !form.formState.isValid || (!form.watch('name') || !form.watch('species') || !form.watch('sex'))}
              data-testid="button-save"
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
