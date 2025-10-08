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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/admin/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/admin/queryClient";
import { ArrowLeft } from "lucide-react";
import { PLAN_TYPES, PROCEDURE_TYPE_LABELS } from "@/lib/constants";
import { z } from "zod";

// Schema de validação do formulário
const planFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  price: z.string().min(1, "Preço é obrigatório"),
  planType: z.enum(["with_waiting_period", "without_waiting_period"]),
  description: z.string().optional(),
  image: z.string().optional(),
  buttonText: z.string().optional(),
  displayOrder: z.number().optional(),
  isActive: z.boolean(),
});

export default function PlanForm() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const planId = params['id'] as string | undefined;
  const isEdit = Boolean(planId);

  const { data: plan, isLoading } = useQuery({
    queryKey: ["/admin/api/plans", planId],
    enabled: isEdit && !!planId,
  });

  // Buscar procedimentos vinculados ao plano quando estiver editando
  const { data: planProcedures } = useQuery({
    queryKey: ["/admin/api/plans", planId, "procedures"],
    enabled: isEdit && !!planId,
  });

  // Log para debug
  useEffect(() => {
    if (plan) {
      console.log("🔍 Plan loaded:", plan);
    }
  }, [plan]);

  const form = useForm({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      name: "",
      price: "",
      planType: "with_waiting_period" as const,
      description: "",
      image: "",
      buttonText: "Contratar Plano",
      displayOrder: 0,
      isActive: true,
    },
  });




  const getPlanTypeLabel = (type: string) => {
    switch (type) {
      case "with_waiting_period": return "Com Coparticipação";
      case "without_waiting_period": return "Sem Coparticipação";
      default: return type;
    }
  };




  useEffect(() => {
    if (plan && typeof plan === 'object') {
      console.log("🔍 Resetting form with plan data:", plan);
      
      // Converter basePrice (string decimal) para valor do formulário
      const planData = plan as any;
      const formattedPrice = planData.basePrice ? 
        parseFloat(planData.basePrice).toFixed(2).replace('.', ',') : 
        "0,00";
      
      form.reset({
        name: planData.name || "",
        price: formattedPrice,
        planType: planData.planType || "with_waiting_period",
        description: planData.description || "",
        image: planData.image || "",
        buttonText: planData.buttonText || "Contratar Plano",
        displayOrder: planData.displayOrder || 0,
        isActive: planData.isActive ?? true,
      });
    }
  }, [plan, form]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEdit) {
        await apiRequest("PUT", `/admin/api/plans/${planId}`, data);
      } else {
        await apiRequest("POST", "/admin/api/plans", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/admin/api/plans"] });
      toast({
        title: isEdit ? "Plano atualizado" : "Plano criado",
        description: isEdit ? "Plano foi atualizado com sucesso." : "Plano foi criado com sucesso.",
      });
      setLocation("/planos");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: isEdit ? "Falha ao atualizar plano." : "Falha ao criar plano.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: any) => {
    try {
      // Primeiro, salva o plano - converter preço com vírgula para número
      const planData = {
        ...data,
        price: Math.round(parseFloat(data.price.replace(',', '.')) * 100), // Convert to cents
      };

      if (isEdit) {
        await apiRequest("PUT", `/admin/api/plans/${planId}`, planData);
      } else {
        await apiRequest("POST", "/admin/api/plans", planData);
      }


      queryClient.invalidateQueries({ queryKey: ["/admin/api/plans"] });
      toast({
        title: isEdit ? "Plano atualizado" : "Plano criado",
        description: isEdit ? "Plano foi atualizado com sucesso." : "Plano foi criado com sucesso.",
      });
      setLocation("/planos");
    } catch (error) {
      toast({
        title: "Erro",
        description: isEdit ? "Falha ao atualizar plano." : "Falha ao criar plano.",
        variant: "destructive",
      });
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
          {isEdit ? "Editar Plano" : "Novo Plano"}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          {isEdit ? "Atualize as informações do plano" : "Crie um novo plano de saúde"}
        </p>
      </div>

      {/* Back Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setLocation("/planos")}
        data-testid="button-back-to-plans"
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
                      <FormLabel>Nome do Plano *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-plan-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço Mensal (R$) *</FormLabel>
                      <FormControl>
                        <InputMasked 
                          {...field} 
                          mask="price"
                          placeholder="0,00"
                          data-testid="input-price" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="planType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo do Plano *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isEdit}>
                        <FormControl>
                          <SelectTrigger 
                            data-testid="select-plan-type"
                            style={{
                              borderColor: 'var(--border-gray)',
                              background: 'white'
                            }}
                          >
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PLAN_TYPES.flatMap((type, index) => [
                            <SelectItem key={type} value={type} className="py-3 pl-10 pr-4 data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground">
                              {getPlanTypeLabel(type)}
                            </SelectItem>,
                            ...(index < PLAN_TYPES.length - 1 ? [<Separator key={`separator-${type}`} />] : [])
                          ])}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Plano Ativo</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Planos ativos podem ser contratados por clientes
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-plan-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Seção de Procedimentos */}
          {isEdit && (
            <Card style={{ backgroundColor: '#FFFFFF' }}>
              <CardHeader>
                <CardTitle className="text-foreground">Procedimentos</CardTitle>
              </CardHeader>
              <CardContent>
                {Array.isArray(planProcedures) && planProcedures.length > 0 ? (
                  <div className="space-y-6">
                    {(() => {
                      // Group procedures by type
                      const groupedProcedures = planProcedures.reduce((groups: any, item: any) => {
                        const type = item.procedureType || 'consultas';
                        if (!groups[type]) {
                          groups[type] = [];
                        }
                        groups[type].push(item);
                        return groups;
                      }, {});

                      // Render each group
                      return Object.entries(groupedProcedures).map(([type, procedures]: [string, any]) => (
                        <div key={type} className="space-y-3">
                          <h3 className="text-lg font-semibold text-foreground">
                            {PROCEDURE_TYPE_LABELS[type as keyof typeof PROCEDURE_TYPE_LABELS]}
                          </h3>
                          
                          {/* Tabela simples estilo página de Clientes */}
                          <div className="rounded-lg overflow-hidden border border-[#eaeaea]">
                            <Table className="w-full">
                              <TableHeader>
                                <TableRow className="bg-white border-b border-[#eaeaea]">
                                  <TableHead className="bg-white">Procedimento</TableHead>
                                  <TableHead className="bg-white">Incluído</TableHead>
                                  <TableHead className="bg-white">Receber (R$)</TableHead>
                                  <TableHead className="bg-white">Pagar (R$)</TableHead>
                                  <TableHead className="bg-white">Coparticipação (R$)</TableHead>
                                  <TableHead className="bg-white">Carência</TableHead>
                                  <TableHead className="bg-white">Limites Anuais</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {procedures.map((item: any) => (
                                  <TableRow key={item.id} className="bg-white border-b border-[#eaeaea]">
                                    <TableCell className="bg-white">
                                      <div>
                                        <p className="font-medium">{item.procedureName}</p>
                                        {item.procedureDescription && (
                                          <p className="text-sm text-muted-foreground">{item.procedureDescription}</p>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="bg-white">
                                      {item.isIncluded ? 'Sim' : 'Não'}
                                    </TableCell>
                                    <TableCell className="bg-white">
                                      R$ {(item.price / 100).toFixed(2).replace('.', ',')}
                                    </TableCell>
                                    <TableCell className="bg-white">
                                      R$ {(item.payValue / 100).toFixed(2).replace('.', ',')}
                                    </TableCell>
                                    <TableCell className="bg-white">
                                      {item.coparticipacao > 0 
                                        ? `R$ ${(item.coparticipacao / 100).toFixed(2).replace('.', ',')}`
                                        : '-'}
                                    </TableCell>
                                    <TableCell className="bg-white">
                                      {item.carencia && item.carencia !== '0 dias' 
                                        ? item.carencia 
                                        : '-'}
                                    </TableCell>
                                    <TableCell className="bg-white">
                                      {item.limitesAnuais && item.limitesAnuais !== '0' && item.limitesAnuais !== '0 vezes no ano' 
                                        ? item.limitesAnuais 
                                        : '-'}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Nenhum procedimento vinculado a este plano.</p>
                    <p className="text-sm mt-1">
                      Para vincular procedimentos, acesse a página de Procedimentos e configure os preços para este plano.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-center flex-col md:flex-row gap-3 md:gap-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLocation("/planos")}
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
              className="md:w-auto w-full md:h-10 h-12 md:text-sm text-base"
            >
              {mutation.isPending ? "Salvando..." : isEdit ? "Atualizar" : "Criar Plano"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
