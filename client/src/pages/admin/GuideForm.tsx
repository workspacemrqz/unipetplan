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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/admin/queryClient";
import { insertGuideSchema } from "@shared/schema";
import { ArrowLeft } from "lucide-react";
import { GUIDE_TYPES } from "@/lib/constants";

export default function GuideForm() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isEdit = Boolean(params.id);
  
  // Extract query parameters from URL
  const urlParams = new URLSearchParams(window.location.search);
  const urlClientId = urlParams.get('clientId');
  const urlPetId = urlParams.get('petId');

  const { data: guide, isLoading: guideLoading } = useQuery<any>({
    queryKey: ["/admin/api/guides", params.id],
    enabled: isEdit,
  });


  const { data: plans } = useQuery({
    queryKey: ["/admin/api/plans/active"],
  });

  // Fetch client and pet information if IDs are provided
  const { data: client } = useQuery<any>({
    queryKey: ["/admin/api/clients", urlClientId || guide?.clientId],
    enabled: Boolean(urlClientId || guide?.clientId),
  });

  const { data: pet } = useQuery<any>({
    queryKey: ["/admin/api/pets", urlPetId || guide?.petId],
    enabled: Boolean(urlPetId || guide?.petId),
  });

  const form = useForm({
    resolver: zodResolver(insertGuideSchema),
    mode: 'onChange',
    defaultValues: {
      clientId: urlClientId || "",
      petId: urlPetId || "",
      type: "",
      procedure: "",
      procedureNotes: "",
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
        type: guide.type || "",
        procedure: guide.procedure || "",
        procedureNotes: guide.procedureNotes || "",
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

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEdit) {
        await apiRequest("PUT", `/admin/api/guides/${params.id}`, data);
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

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "consulta": return "Guia de Consulta";
      case "exames": return "Guia de Exames";
      case "internacao": return "Guia de Internação";
      case "reembolso": return "Guia de Reembolso";
      default: return type;
    }
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
        {(client || pet) && (
          <div className="mt-2 text-sm text-primary">
            {client && <span>Cliente: {client.fullName}</span>}
            {client && pet && <span> | </span>}
            {pet && <span>Pet: {pet.name} ({pet.species})</span>}
          </div>
        )}
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
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Guia *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger 
                            data-testid="select-guide-type"
                            style={{
                              borderColor: 'var(--border-gray)',
                              background: 'white'
                            }}
                          >
                            <SelectValue placeholder="Selecione o tipo de guia" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {GUIDE_TYPES.flatMap((type, index) => [
                            <SelectItem key={type} value={type} className="py-3 pl-10 pr-4 data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground">
                              {getTypeLabel(type)}
                            </SelectItem>,
                            ...(index < GUIDE_TYPES.length - 1 ? [<Separator key={`separator-${type}`} />] : [])
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
                      <Select onValueChange={field.onChange} value={field.value} disabled={!petIdToFetch || proceduresLoading}>
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
                                className="py-3 pl-10 pr-4 data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground"
                              >
                                <div className="flex flex-col">
                                  <span>{proc.name}</span>
                                  <span className="text-xs text-muted-foreground">
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
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor (R$)</FormLabel>
                      <FormControl>
                        <InputMasked 
                          {...field} 
                          mask="price"
                          placeholder="0,00"
                          data-testid="input-value" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                            <SelectItem key={status.value} value={status.value} className="py-3 pl-10 pr-4 data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground">
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
              </div>

              <div className="mt-6 space-y-4">
                <FormField
                  control={form.control}
                  name="procedureNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Anotações sobre o Procedimento</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Observações específicas sobre o procedimento..."
                          data-testid="textarea-procedure-notes" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
              disabled={mutation.isPending || !form.formState.isValid || !form.getValues('type') || !form.getValues('procedure')}
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
