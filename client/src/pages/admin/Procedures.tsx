import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { InputMasked } from "@/components/admin/ui/input-masked";
import { Switch } from "@/components/admin/ui/switch";
import { Badge } from "@/components/admin/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/admin/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/admin/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/admin/ui/form";
import { CustomCheckbox } from "@/components/admin/ui/custom-checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Search, Edit, Trash2, Clipboard, Eye, X, MoreHorizontal, ChevronLeft, ChevronRight, Copy, FileText, Check, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/admin/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useColumnPreferences } from "@/hooks/admin/use-column-preferences";
import { useAdminLogger } from "@/hooks/admin/use-admin-logger";
import { usePermissions } from "@/hooks/use-permissions";
import { z } from "zod";
import { ExportButton } from "@/components/admin/ExportButton";

// Definir tipos locais
type Procedure = {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  plans?: ProcedurePlan[];
};

type Plan = {
  id: string;
  name: string;
  description: string;
  features: string[];
  image: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  buttonText: string;
  planType: string;
  billingFrequency: string;
  basePrice: string;
  installmentPrice?: string;
  installmentCount?: number;
  perPetBilling: boolean;
  petDiscounts?: any;
  paymentDescription?: string;
  availablePaymentMethods: string[];
  availableBillingOptions: string[];
  annualPrice?: string;
  annualInstallmentPrice?: string;
  annualInstallmentCount?: number;
};

type ProcedurePlan = {
  id: string;
  planId: string;
  procedureId: string;
  price: number;
  payValue?: number | null;
  coparticipacao?: number | null;
  carencia?: string | null;
  limitesAnuais?: string | null;
  isIncluded?: boolean;
  displayOrder?: number;
  createdAt?: string;
};

// Criar schema local para validação
const insertProcedureSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  category: z.string().optional(),
  isActive: z.boolean().default(true),
});

const allColumns = [
  "Nome",
  "Status",
  "Coparticipação",
  "Carência",
  "Limites Anuais",
  "Ações",
] as const;

// Funções auxiliares para resumir informações dos planos
const formatCoparticipacaoSummary = (plans?: ProcedurePlan[]) => {
  if (!plans || plans.length === 0) return "N/A";
  
  const coparticipacoes = plans
    .filter(p => p.coparticipacao && p.coparticipacao > 0)
    .map(p => p.coparticipacao || 0);
  
  if (coparticipacoes.length === 0) return "Sem coparticipação";
  
  const min = Math.min(...coparticipacoes) / 100;
  const max = Math.max(...coparticipacoes) / 100;
  
  if (min === max) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(min);
  }
  
  return `${new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(min)} - ${new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(max)}`;
};

const formatCarenciaSummary = (plans?: ProcedurePlan[]) => {
  if (!plans || plans.length === 0) return "N/A";
  
  const carencias = plans
    .filter(p => p.carencia && p.carencia.trim() !== '')
    .map(p => p.carencia || '');
  
  if (carencias.length === 0) return "Sem carência";
  
  // Pegar valores únicos
  const uniqueCarencias = [...new Set(carencias)];
  
  if (uniqueCarencias.length === 1) {
    return uniqueCarencias[0];
  }
  
  return "Varia por plano";
};

const formatLimitesSummary = (plans?: ProcedurePlan[]) => {
  if (!plans || plans.length === 0) return "N/A";
  
  const limites = plans
    .filter(p => p.limitesAnuais && p.limitesAnuais !== '0')
    .map(p => p.limitesAnuais || '');
  
  if (limites.length === 0) return "Sem limites";
  
  // Pegar valores únicos
  const uniqueLimites = [...new Set(limites)];
  
  if (uniqueLimites.length === 1) {
    return uniqueLimites[0];
  }
  
  return "Varia por plano";
};

export default function Procedures() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Procedure | null>(null);
  const [viewingItem, setViewingItem] = useState<Procedure | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string>("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deletePasswordError, setDeletePasswordError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const { visibleColumns, toggleColumn } = useColumnPreferences('procedures.columns', allColumns);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [selectedPlans, setSelectedPlans] = useState<{
    planId: string, 
    receber: string, 
    pagar: string,
    coparticipacao: string, 
    carencia: string, 
    limitesAnuais: string,
    enableCarencia?: boolean,
    enableLimitesAnuais?: boolean,
    enableCoparticipacao?: boolean
  }[]>([]);
  const [planErrors, setPlanErrors] = useState<{[key: number]: string}>({});
  const [manuallyEditedFields, setManuallyEditedFields] = useState<{[key: number]: {[field: string]: boolean}}>({});
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied'>('idle');
  const [procedureToDelete, setProcedureToDelete] = useState<Procedure | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logAction } = useAdminLogger();
  const { canAdd, canEdit, canDelete } = usePermissions();

  const { data: procedures, isLoading } = useQuery<Procedure[]>({
    queryKey: ["/admin/api/procedures"],
  });

  const { data: plans } = useQuery<Plan[]>({
    queryKey: ["/admin/api/plans/active"],
  });

  // Buscar todos os plan_procedures para fazer o join
  const { data: allPlanProcedures } = useQuery({
    queryKey: ["/admin/api/plan-procedures/all"],
    enabled: !!procedures && procedures.length > 0,
  });

  const { data: categories } = useQuery({
    queryKey: ["/admin/api/procedure-categories"],
  });

  // Fazer o join dos procedimentos com seus planos
  const proceduresWithPlans = useMemo(() => {
    if (!procedures || !allPlanProcedures) return procedures || [];
    
    return procedures.map(procedure => ({
      ...procedure,
      plans: Array.isArray(allPlanProcedures) ? allPlanProcedures.filter((pp: any) => pp.procedureId === procedure.id) : []
    }));
  }, [procedures, allPlanProcedures]);

  // Buscar configurações de regras para cálculo automático de porcentagem
  const { data: rulesSettings } = useQuery({
    queryKey: ["/admin/api/settings/rules"],
  });

  // Buscar planos do procedimento quando estiver editando
  const { data: existingProcedurePlans } = useQuery({
    queryKey: ["/admin/api/procedures", editingItem?.id, "plans"],
    enabled: !!editingItem?.id,
  });

  // Buscar planos do procedimento quando estiver visualizando
  const { data: viewingProcedurePlans } = useQuery({
    queryKey: ["/admin/api/procedures", viewingItem?.id, "plans"],
    enabled: !!viewingItem?.id,
  });


  const form = useForm({
    resolver: zodResolver(insertProcedureSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      isActive: true,
    },
  });

  // Carregar planos existentes quando estiver editando (apenas uma vez quando o modal abre)
  useEffect(() => {
    if (existingProcedurePlans && Array.isArray(existingProcedurePlans) && editingItem?.id) {
      const newManuallyEditedFields: {[key: number]: {[field: string]: boolean}} = {};
      
      const planData = existingProcedurePlans.map((item: ProcedurePlan, index: number) => {
        const receberValue = (item.price / 100).toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }); // Converter de centavos para reais com formato PT-BR
        
        // Usar o valor "pagar" salvo no banco quando disponível,
        // caso contrário calcular automaticamente baseado na porcentagem
        let pagarValue;
        
        if (item.payValue !== null && item.payValue !== undefined) {
          // Usar o valor salvo no banco (editado manualmente pelo usuário)
          pagarValue = (item.payValue / 100).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });
          
          // Marcar como editado manualmente se o valor salvo for diferente do calculado
          const calculatedValue = calculatePayValue(receberValue);
          // Normalizar ambos os valores para comparação (remover formatação e comparar números)
          const normalizedPagarValue = pagarValue.replace(/\./g, '').replace(',', '.');
          const normalizedCalculatedValue = calculatedValue.replace(/\./g, '').replace(',', '.');
          
          const pagarNum = parseFloat(normalizedPagarValue) || 0;
          const calcNum = parseFloat(normalizedCalculatedValue) || 0;
          if (Math.abs(pagarNum - calcNum) > 0.01) {
            if (!newManuallyEditedFields[index]) {
              newManuallyEditedFields[index] = {};
            }
            newManuallyEditedFields[index]['pagar'] = true;
          }
        } else {
          // Calcular automaticamente se não houver valor salvo
          pagarValue = calculatePayValue(receberValue);
        }
        
        return {
          planId: item.planId,
          receber: receberValue,
          pagar: pagarValue,
          coparticipacao: (item.coparticipacao ? (item.coparticipacao / 100).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }) : "0,00"),
          carencia: item.carencia ?? "",
          limitesAnuais: item.limitesAnuais ?? "",
          enableCarencia: Boolean(item.carencia && item.carencia.trim() !== ""),
          enableLimitesAnuais: Boolean(item.limitesAnuais && item.limitesAnuais.trim() !== "" && item.limitesAnuais !== "0"),
          enableCoparticipacao: Boolean(item.coparticipacao && item.coparticipacao > 0)
        };
      });
      setSelectedPlans(planData);
      // Definir campos que já foram editados manualmente em sessões anteriores
      setManuallyEditedFields(newManuallyEditedFields);
    }
    // Limpar planos quando não estiver editando (criando novo)
    else if (!editingItem?.id) {
      setSelectedPlans([]);
      setManuallyEditedFields({});
    }
  }, [existingProcedurePlans, editingItem?.id]); // Adicionar existingProcedurePlans como dependência

  // Funções para gerenciar planos selecionados
  const addPlan = () => {
    if (Array.isArray(plans) && plans.length > 0) {
      const unselectedPlans = plans.filter((plan: any) => 
        !selectedPlans.some(sp => sp.planId === plan.id)
      );
      if (unselectedPlans.length > 0) {
        const firstPlan = unselectedPlans[0];
        if (firstPlan && firstPlan.id) {
          setSelectedPlans([...selectedPlans, { 
            planId: firstPlan.id, 
            receber: "0,00",
            pagar: "0,00",
            coparticipacao: "0,00",
            carencia: "",
            limitesAnuais: "0",
            enableCarencia: false,
            enableLimitesAnuais: false,
            enableCoparticipacao: false
          }]);
        }
      }
    }
  };

  const removePlan = (index: number) => {
    setSelectedPlans(prev => prev.filter((_, i) => i !== index));
    
    // Reorganizar o estado de edições manuais após remoção
    setManuallyEditedFields(prev => {
      const updatedManualFields = {...prev};
      delete updatedManualFields[index];
      
      // Reindexar os campos manuais restantes
      const reindexedManualFields: {[key: number]: {[field: string]: boolean}} = {};
      Object.keys(updatedManualFields).forEach(key => {
        const numKey = parseInt(key);
        const fieldValue = updatedManualFields[numKey];
        if (fieldValue) {
          if (numKey < index) {
            reindexedManualFields[numKey] = fieldValue;
          } else if (numKey > index) {
            reindexedManualFields[numKey - 1] = fieldValue;
          }
        }
      });
      
      return reindexedManualFields;
    });

    // Reorganizar os erros de planos após remoção
    setPlanErrors(prev => {
      const updatedErrors = {...prev};
      delete updatedErrors[index];
      
      // Reindexar os erros restantes
      const reindexedErrors: {[key: number]: string} = {};
      Object.keys(updatedErrors).forEach(key => {
        const numKey = parseInt(key);
        const errorValue = updatedErrors[numKey];
        if (errorValue) {
          if (numKey < index) {
            reindexedErrors[numKey] = errorValue;
          } else if (numKey > index) {
            reindexedErrors[numKey - 1] = errorValue;
          }
        }
      });
      
      return reindexedErrors;
    });
  };

  // Funções para atualizar campos específicos
  const updatePlanField = (index: number, field: string, value: string) => {
    const updated = [...selectedPlans];
    const updatedManualFields = {...manuallyEditedFields};
    
    // Tratamento especial para o campo carência (apenas números)
    if (field === 'carencia') {
      // Se o valor estiver vazio, mantém vazio
      if (value === '') {
        (updated[index] as any)['carencia'] = '';
      } else {
        // Remove qualquer texto existente e mantém apenas números
        const numericValue = value.replace(/[^\d]/g, '');
        // Armazena apenas o valor numérico, o texto será adicionado na exibição
        (updated[index] as any)['carencia'] = numericValue;
      }
    } 
    // Tratamento especial para o campo limites anuais (apenas números)
    else if (field === 'limitesAnuais') {
      // Se o valor estiver vazio, mantém vazio
      if (value === '') {
        (updated[index] as any)['limitesAnuais'] = '';
      } else {
        // Remove qualquer texto existente e mantém apenas números
        const numericValue = value.replace(/[^\d]/g, '');
        // Armazena apenas o valor numérico, o texto será adicionado na exibição
        (updated[index] as any)['limitesAnuais'] = numericValue;
      }
    } else {
      // Handle other fields based on their type
      if (field === 'receber' || field === 'pagar' || field === 'coparticipacao') {
        (updated[index] as any)[field] = value;
        
        // Marcar campo como editado manualmente
        if (!updatedManualFields[index]) {
          updatedManualFields[index] = {};
        }
        if (updatedManualFields[index]) {
          updatedManualFields[index][field] = true;
        }
        
        // Cálculo automático do campo 'pagar' quando 'receber' for alterado
        // SEMPRE recalcula quando 'receber' é alterado, independente de edição manual prévia
        if (field === 'receber' && value && value.trim() !== '') {
          const calculatedPayValue = calculatePayValue(value);
          (updated[index] as any)['pagar'] = calculatedPayValue;
          
          // Remover marcação de edição manual do campo 'pagar' quando 'receber' é alterado
          // Isso permite que o usuário edite novamente o 'pagar' após o recálculo
          if (updatedManualFields[index]?.['pagar']) {
            delete updatedManualFields[index]['pagar'];
          }
          
          // Se coparticipação estiver habilitada, recalcular baseado no novo valor integral
          if ((updated[index] as any).enableCoparticipacao) {
            const calculatedCoparticipation = calculateCoparticipationValue(value);
            (updated[index] as any)['coparticipacao'] = calculatedCoparticipation;
            
            // Remover marcação de edição manual do campo 'coparticipacao' quando 'receber' é alterado
            if (updatedManualFields[index]?.['coparticipacao']) {
              delete updatedManualFields[index]['coparticipacao'];
            }
          }
        }
      }
    }
    
    setSelectedPlans(updated);
    setManuallyEditedFields(updatedManualFields);
    
    // Validar campos obrigatórios e limpar erro se válido
    if (field === 'receber' && value && planErrors[index]) {
      const newErrors = { ...planErrors };
      delete newErrors[index];
      setPlanErrors(newErrors);
    }
    
    // Clear error when limitesAnuais field becomes valid
    if (field === 'limitesAnuais' && value && planErrors[index]) {
      const numericMatch = value.match(/(\d+)/);
      const numericValue = numericMatch && numericMatch[1] ? parseInt(numericMatch[1], 10) : 0;
      if (numericValue >= 1) {
        const newErrors = { ...planErrors };
        delete newErrors[index];
        setPlanErrors(newErrors);
      }
    }
  };

  // Função para atualizar campos booleanos
  const updatePlanBooleanField = (index: number, field: 'enableCarencia' | 'enableLimitesAnuais' | 'enableCoparticipacao', value: boolean) => {
    const updated = [...selectedPlans];
    (updated[index] as any)[field] = value;
    
    // Reset to default values when disabling or calculate when enabling
    if (!value) {
      if (field === 'enableCarencia') {
        (updated[index] as any)['carencia'] = '';
      } else if (field === 'enableLimitesAnuais') {
        (updated[index] as any)['limitesAnuais'] = '0';
      } else if (field === 'enableCoparticipacao') {
        (updated[index] as any)['coparticipacao'] = '0,00';
      }
    } else {
      // Quando habilitar a coparticipação, calcular automaticamente baseado no valor integral
      if (field === 'enableCoparticipacao') {
        const receberValue = updated[index]?.receber;
        if (receberValue && receberValue.trim() !== '' && receberValue !== '0,00') {
          const calculatedCoparticipation = calculateCoparticipationValue(receberValue);
          (updated[index] as any)['coparticipacao'] = calculatedCoparticipation;
        }
      }
    }
    
    setSelectedPlans(updated);
  };

  // Função para converter preço brasileiro para número
  const convertPriceToNumber = (priceStr: string): number => {
    if (!priceStr || priceStr.trim() === '') return 0;
    
    // Remove formatação brasileira e converte para número
    const cleanPrice = priceStr
      .replace(/\./g, '') // Remove separadores de milhares
      .replace(/,/g, '.'); // Converte vírgula decimal para ponto
    
    const numValue = parseFloat(cleanPrice);
    return isNaN(numValue) ? 0 : numValue;
  };

  // Função para converter número para formato brasileiro
  const convertNumberToPrice = (num: number): string => {
    return num.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Função para calcular valor a pagar baseado na porcentagem das regras
  const calculatePayValue = (receberValue: string): string => {
    if (!rulesSettings || typeof rulesSettings !== 'object' || !receberValue || receberValue.trim() === '') {
      return '0,00';
    }
    
    const settings = rulesSettings as any;
    if (!settings?.fixedPercentage || settings.fixedPercentage <= 0) {
      return '0,00';
    }
    
    const receberNumber = convertPriceToNumber(receberValue);
    const percentage = settings.fixedPercentage / 100;
    const payValue = receberNumber * percentage;
    
    return convertNumberToPrice(payValue);
  };

  // Função para calcular coparticipação baseado na porcentagem das regras
  const calculateCoparticipationValue = (receberValue: string): string => {
    if (!rulesSettings || typeof rulesSettings !== 'object' || !receberValue || receberValue.trim() === '') {
      return '0,00';
    }
    
    const settings = rulesSettings as any;
    const coparticipationPercentage = settings?.coparticipationPercentage ?? 10; // Default 10% se não configurado
    
    if (coparticipationPercentage <= 0) {
      return '0,00';
    }
    
    const receberNumber = convertPriceToNumber(receberValue);
    const percentage = coparticipationPercentage / 100;
    const coparticipationValue = receberNumber * percentage;
    
    return convertNumberToPrice(coparticipationValue);
  };

  // Função para filtrar planos já selecionados
  const getAvailablePlans = (currentIndex?: number) => {
    if (!Array.isArray(plans)) return [];
    
    return plans.filter((plan: any) => {
      // Permite o plano atual quando estiver editando uma linha específica
      const currentPlan = currentIndex !== undefined ? selectedPlans[currentIndex] : undefined;
      const isCurrentSelection = currentPlan && currentPlan.planId === plan.id;
      
      // Se é a seleção atual, permite; caso contrário, verifica se não está em uso
      return isCurrentSelection || !selectedPlans.some(sp => sp.planId === plan.id);
    });
  };

  const updatePlanId = (index: number, planId: string) => {
    const updated = [...selectedPlans];
    (updated[index] as any)['planId'] = planId;
    setSelectedPlans(updated);
    
    // Limpar erro de plano se selecionado
    const errors = { ...planErrors };
    if (planId) {
      delete errors[index];
      setPlanErrors(errors);
    }
  };

  const resetForm = () => {
    form.reset();
    setSelectedPlans([]);
    setPlanErrors({});
    setEditingItem(null);
    setManuallyEditedFields({});
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      let procedureResponse;
      
      if (editingItem) {
        procedureResponse = await apiRequest("PUT", `/admin/api/procedures/${editingItem.id}`, data);
      } else {
        procedureResponse = await apiRequest("POST", "/admin/api/procedures", data);
      }

      // Salvar relacionamentos com planos usando endpoint atômico
      const procedureId = editingItem ? editingItem.id : procedureResponse.id;
      
      // Preparar planos para o endpoint atômico
      const procedurePlans = selectedPlans
        .filter(plan => plan.planId && plan.receber) // Filtrar entradas válidas
        .map(plan => {
          const numericReceber = convertPriceToNumber(plan.receber);
          const numericPagar = convertPriceToNumber(plan.pagar);
          const numericCoparticipacao = convertPriceToNumber(plan.coparticipacao);
          
          // Determinar o valor final dos limites anuais
          let finalLimitesAnuais = "0";
          if ((plan as any).enableLimitesAnuais && plan.limitesAnuais && plan.limitesAnuais.trim() !== "") {
            finalLimitesAnuais = plan.limitesAnuais;
          }
          
          // Determinar o valor final da coparticipação
          let finalCoparticipacao = 0;
          if ((plan as any).enableCoparticipacao && numericCoparticipacao > 0) {
            finalCoparticipacao = Math.round(numericCoparticipacao * 100);
          }
          
          // Formatar carência para envio (adicionar " dias" se for apenas número)
          let finalCarencia = plan.carencia;
          if (plan.carencia && plan.carencia.trim() !== '' && /^\d+$/.test(plan.carencia.trim())) {
            finalCarencia = `${plan.carencia.trim()} dias`;
          }

          // Formatar limites anuais para envio (adicionar " vezes no ano" se for apenas número)
          if ((plan as any).enableLimitesAnuais && plan.limitesAnuais && plan.limitesAnuais.trim() !== "" && /^\d+$/.test(plan.limitesAnuais.trim())) {
            finalLimitesAnuais = `${plan.limitesAnuais.trim()} vezes no ano`;
          } else if ((plan as any).enableLimitesAnuais && plan.limitesAnuais && plan.limitesAnuais.trim() !== "") {
            finalLimitesAnuais = plan.limitesAnuais;
          }

          return {
            procedureId,
            planId: plan.planId,
            price: Math.round(numericReceber * 100), // Converter valor a receber para centavos
            payValue: Math.round(numericPagar * 100), // Converter valor a pagar para centavos (editável pelo usuário)
            coparticipacao: finalCoparticipacao,
            carencia: finalCarencia,
            limitesAnuais: finalLimitesAnuais
          };
        })
        .filter(plan => plan.price >= 0); // Filtrar preços válidos
      
      // Usar endpoint atômico para atualizar relacionamentos
      // Isso substitui DELETE + POST em uma única transação
      await apiRequest("PUT", `/admin/api/procedures/${procedureId}/plans`, { procedurePlans });

      return { procedureResponse, formData: data, isEdit: !!editingItem };
    },
    onSuccess: async (result) => {
      const { procedureResponse, formData, isEdit } = result;
      const procedureId = isEdit ? editingItem!.id : procedureResponse.id;
      
      queryClient.invalidateQueries({ queryKey: ["/admin/api/procedures"] });
      queryClient.invalidateQueries({ queryKey: ["/admin/api/procedures-with-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/admin/api/procedures", editingItem?.id, "plans"] });
      // Invalidar cache dos planos também para atualizar a página de edição de planos
      queryClient.invalidateQueries({ queryKey: ["/admin/api/plans"] });
      queryClient.invalidateQueries({ queryKey: ["/admin/api/plans", "active"] });
      
      await logAction({
        actionType: isEdit ? "updated" : "created",
        entityType: "procedure",
        entityId: procedureId,
        metadata: { 
          name: formData.name,
          category: formData.category || null,
          description: formData.description || null
        }
      });
      
      toast({
        title: editingItem ? "Procedimento atualizado" : "Procedimento criado",
        description: editingItem ? "Procedimento foi atualizado com sucesso." : "Procedimento foi criado com sucesso.",
      });
      setDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: editingItem ? "Falha ao atualizar procedimento." : "Falha ao criar procedimento.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/admin/api/procedures/${id}`);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/admin/api/procedures"] });
      queryClient.invalidateQueries({ queryKey: ["/admin/api/procedures-with-plans"] });
      
      if (procedureToDelete) {
        await logAction({
          actionType: "deleted",
          entityType: "procedure",
          entityId: procedureToDelete.id,
          metadata: { 
            name: procedureToDelete.name,
            category: procedureToDelete.category || null
          }
        });
      }
      
      toast({
        title: "Procedimento removido",
        description: "Procedimento foi removido com sucesso.",
      });
      
      setProcedureToDelete(null);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao remover procedimento.",
        variant: "destructive",
      });
      setProcedureToDelete(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await apiRequest("PUT", `/admin/api/procedures/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/admin/api/procedures"] });
      queryClient.invalidateQueries({ queryKey: ["/admin/api/procedures-with-plans"] });
      toast({
        title: "Status atualizado",
        description: "Status do procedimento foi atualizado.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar status do procedimento.",
        variant: "destructive",
      });
    },
  });

  const filteredItems = Array.isArray(proceduresWithPlans) ? proceduresWithPlans
    .filter((item: any) =>
      (item.name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description ?? '').toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];

  // Pagination logic
  const totalItems = filteredItems.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);


  const handleEdit = async (item: any) => {
    setEditingItem(item);
    form.reset({
      name: item.name ?? "",
      description: item.description ?? "",
      category: item.category ?? "",
      isActive: item.isActive ?? true,
    });
    setDialogOpen(true);
  };

  const handleView = async (item: any) => {
    setViewingItem(item);
    setViewDialogOpen(true);
    
    await logAction({
      actionType: "viewed",
      entityType: "procedure",
      entityId: item.id,
      metadata: { 
        name: item.name,
        category: item.category || null
      }
    });
  };

  const generateProcedureText = () => {
    if (!viewingItem) return "";

    let text = "";
    
    // Cabeçalho
    text += "=".repeat(50) + "\n";
    text += "INFORMAÇÕES DO PROCEDIMENTO\n";
    text += "=".repeat(50) + "\n\n";

    // Informações Básicas
    text += "INFORMAÇÕES BÁSICAS:\n";
    text += "-".repeat(25) + "\n";
    text += `Nome: ${viewingItem.name ?? ''}\n`;
    text += `Status: ${viewingItem.isActive ? 'Ativo' : 'Inativo'}\n`;
    if (viewingItem.description) {
      text += `Descrição: ${viewingItem.description}\n`;
    }
    text += "\n";

    // Planos Vinculados
    if (viewingProcedurePlans && Array.isArray(viewingProcedurePlans) && viewingProcedurePlans.length > 0) {
      text += "PLANOS VINCULADOS:\n";
      text += "-".repeat(20) + "\n";
      
      viewingProcedurePlans.forEach((planItem: any, index: number) => {
        const plan = Array.isArray(plans) ? plans.find((p: any) => p.id === planItem.planId) : null;
        text += `${index + 1}. Plano: ${plan?.name ?? 'Nome não informado'}\n`;
        text += `   Valor Integral: R$ ${planItem.price ? (planItem.price / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}\n`;
        text += `   Pagar (R$): R$ ${planItem.payValue ? (planItem.payValue / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}\n`;
        if (planItem.coparticipacao && planItem.coparticipacao > 0) {
          text += `   Coparticipação: R$ ${(planItem.coparticipacao / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
        } else {
          text += `   Coparticipação: Sem coparticipação\n`;
        }
        text += `   Carência: ${planItem.carencia || '60 dias'}\n`;
        text += `   Limites Anuais: ${planItem.limitesAnuais || '10 vezes no ano'}\n`;
        text += "\n";
      });
    } else {
      text += "PLANOS VINCULADOS:\n";
      text += "-".repeat(20) + "\n";
      text += "Nenhum plano vinculado a este procedimento.\n\n";
    }

    // Informações do Cadastro
    text += "INFORMAÇÕES DO CADASTRO:\n";
    text += "-".repeat(25) + "\n";
    text += `Data de Criação: ${viewingItem.createdAt ? format(new Date(viewingItem.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : "Não informado"}\n`;
    if (viewingItem.updatedAt) {
      text += `Última Atualização: ${format(new Date(viewingItem.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}\n`;
    }

    text += "\n" + "=".repeat(50) + "\n";
    text += `Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}\n`;
    text += "=".repeat(50);

    return text;
  };

  const handleCopyToClipboard = async () => {
    if (copyState !== 'idle') return;
    
    try {
      setCopyState('copying');
      const text = generateProcedureText();
      await navigator.clipboard.writeText(text);
      
      // Mostrar estado "copiado" por um tempo
      setCopyState('copied');
      
      // Voltar ao estado normal após 2 segundos
      setTimeout(() => {
        setCopyState('idle');
      }, 2000);
    } catch (error) {
      setCopyState('idle');
      toast({
        title: "Erro",
        description: "Não foi possível copiar as informações. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (id: string) => {
    const procedure = Array.isArray(procedures) ? procedures.find((p: Procedure) => p.id === id) : null;
    setProcedureToDelete(procedure || null);
    setItemToDelete(id);
    setDeletePassword("");
    setDeletePasswordError("");
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      // Verificar senha
      const response = await apiRequest("POST", "/admin/api/admin/verify-password", {
        password: deletePassword,
      });
      
      if (!response.valid) {
        setDeletePasswordError("Senha incorreta");
        setIsDeleting(false);
        return;
      }

      // Deletar procedimento
      deleteMutation.mutate(itemToDelete);
      setDeleteDialogOpen(false);
      setDeletePassword("");
      setDeletePasswordError("");
      setItemToDelete("");
      setIsDeleting(false);
    } catch (error) {
      setDeletePasswordError("Senha incorreta");
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = (id: string, currentStatus: boolean) => {
    toggleMutation.mutate({ id, isActive: !currentStatus });
  };

  // Função para preparar dados de exportação - busca TODOS os registros
  const prepareExportData = async () => {
    // Buscar TODOS os procedimentos sem paginação
    const response = await fetch(`/admin/api/procedures?limit=999999`);
    
    if (!response.ok) {
      throw new Error('Erro ao buscar dados para exportação');
    }
    
    const allProcedures = await response.json();
    
    // Aplicar filtros de busca se houver
    const filtered = searchQuery 
      ? allProcedures.filter((procedure: Procedure) =>
          procedure.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          procedure.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          procedure.category?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : allProcedures;
    
    // Retornar dados formatados para exportação
    return filtered.map((procedure: Procedure) => ({
      'Nome': procedure.name || '',
      'Descrição': procedure.description || 'Sem descrição',
      'Categoria': procedure.category || 'Sem categoria',
      'Status': procedure.isActive ? 'Ativo' : 'Inativo',
      'Ordem de Exibição': procedure.displayOrder?.toString() || '0',
      'Data de Criação': procedure.createdAt ? format(new Date(procedure.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '',
      'Última Atualização': procedure.updatedAt ? format(new Date(procedure.updatedAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : ''
    }));
  };

  const onSubmit = (data: any) => {
    // Validar planos antes de submeter
    const errors: {[key: number]: string} = {};
    let hasErrors = false;
    
    selectedPlans.forEach((plan, index) => {
      if (!plan.planId) {
        errors[index] = 'Selecione um plano';
        hasErrors = true;
      }
      if (!plan.receber || plan.receber.trim() === '') {
        errors[index] = 'Valor a receber é obrigatório';
        hasErrors = true;
      } else {
        const numValue = convertPriceToNumber(plan.receber);
        if (numValue < 0) {
          errors[index] = 'Valor a receber deve ser maior ou igual a zero';
          hasErrors = true;
        }
      }
      
      // Validate Limites Anuais when enabled
      if (plan.enableLimitesAnuais) {
        if (!plan.limitesAnuais || plan.limitesAnuais.trim() === '' || plan.limitesAnuais.trim() === '0') {
          errors[index] = 'Limites anuais é obrigatório quando habilitado';
          hasErrors = true;
        } else {
          // Extract numeric value from string like "2 vezes no ano"
          const numericMatch = plan.limitesAnuais.match(/(\d+)/);
          const numericValue = numericMatch && numericMatch[1] ? parseInt(numericMatch[1], 10) : 0;
          if (numericValue < 1) {
            errors[index] = 'Limites anuais deve ser maior ou igual a 1';
            hasErrors = true;
          }
        }
      }
    });
    
    if (hasErrors) {
      setPlanErrors(errors);
      toast({
        title: "Erro de validação",
        description: "Verifique os campos dos planos e tente novamente.",
        variant: "destructive",
      });
      return;
    }
    
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground break-words">Procedimentos</h1>
          <p className="text-sm text-muted-foreground">Gerencie os procedimentos médicos disponíveis</p>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) {
          resetForm();
        }
      }}>
        <DialogContent hideCloseButton maxHeightMobile="max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {editingItem ? (
                <>
                  <Edit className="h-5 w-5 text-primary" />
                  <span>Editar Procedimento</span>
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-primary" />
                  <span>Novo Procedimento</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingItem 
                ? "Atualize as informações do procedimento e configure os planos associados." 
                : "Crie um novo procedimento médico e configure os planos que o cobrem."
              }
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
              <div className="space-y-6">
                {/* Informações Básicas */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground mb-2">Informações Básicas</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-primary">Nome do Procedimento *</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              data-testid="input-procedure-name"
                              style={{
                                borderColor: 'var(--border-gray)',
                                backgroundColor: '#FFFFFF'
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-primary">Categoria</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger
                                style={{
                                  borderColor: 'var(--border-gray)',
                                  backgroundColor: '#FFFFFF'
                                }}
                              >
                                <SelectValue placeholder="Selecione uma categoria" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories && Array.isArray(categories) ? (categories as any[]).map((category: any) => (
                                <SelectItem key={category.id} value={category.name}>
                                  {category.name}
                                </SelectItem>
                              )) : null}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                  </div>
                </div>

                {/* Seção de Seleção de Planos */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-foreground">Planos Vinculados</h4>
                    <Button
                      type="button"
                      variant="admin-action"
                      size="sm"
                      onClick={addPlan}
                      disabled={!Array.isArray(plans) || plans.length === 0 || selectedPlans.length >= plans.length}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Plano
                    </Button>
                  </div>
                  
                  {selectedPlans.length > 0 && (
                    <div className="space-y-3">
                      {selectedPlans.map((selectedPlan, index) => {
                        
                        return (
                          <div key={selectedPlan.planId} className="p-4 border rounded-lg bg-white" style={{ borderColor: 'var(--border-gray)' }}>
                            {/* Layout organizado em 2 linhas: 3 campos em cima, 3 embaixo */}
                            <div className="space-y-4">
                              {/* Primeira linha: Plano, Receber, Pagar */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Plano */}
                                <div>
                                  <label className="text-sm font-medium text-primary">Plano</label>
                                  <Select
                                    value={selectedPlan.planId}
                                    onValueChange={(value) => updatePlanId(index, value)}
                                  >
                                    <SelectTrigger 
                                      className={`${planErrors[index] && !selectedPlan.planId ? 'border-destructive' : ''} [&>span]:text-left [&>span]:flex [&>span]:flex-col [&>span]:items-start`}
                                      style={{
                                        borderColor: planErrors[index] && !selectedPlan.planId ? undefined : 'var(--border-gray)',
                                        backgroundColor: '#FFFFFF'
                                      }}
                                    >
                                      <SelectValue placeholder="Selecione um plano" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {getAvailablePlans(index).map((plan: any) => (
                                        <SelectItem key={plan.id} value={plan.id}>
                                          {plan.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {planErrors[index] && !selectedPlan.planId && (
                                    <p className="text-xs text-destructive mt-1">{planErrors[index]}</p>
                                  )}
                                </div>

                                {/* Valor integral */}
                                <div>
                                  <label className="text-sm font-medium text-primary">Valor integral</label>
                                  <InputMasked
                                    mask="price"
                                    value={selectedPlan.receber}
                                    onChange={(e) => updatePlanField(index, 'receber', e.target.value)}
                                    placeholder="0,00"
                                    data-testid={`input-plan-receber-${index}`}
                                    className={planErrors[index] ? 'border-destructive' : ''}
                                    style={{
                                      borderColor: planErrors[index] ? undefined : 'var(--border-gray)',
                                      backgroundColor: '#FFFFFF'
                                    }}
                                  />
                                  {planErrors[index] && (
                                    <p className="text-xs text-destructive mt-1">{planErrors[index]}</p>
                                  )}
                                </div>

                                {/* Pagar */}
                                <div>
                                  <label className="text-sm font-medium text-primary">Pagar (R$)</label>
                                  <InputMasked
                                    mask="price"
                                    value={selectedPlan.pagar}
                                    onChange={(e) => updatePlanField(index, 'pagar', e.target.value)}
                                    placeholder="0,00"
                                    data-testid={`input-plan-pagar-${index}`}
                                    style={{
                                      borderColor: 'var(--border-gray)',
                                      backgroundColor: '#FFFFFF'
                                    }}
                                  />
                                </div>
                              </div>

                              {/* Segunda linha: Coparticipação, Carência, Limites Anuais */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Coparticipação */}
                                <div>
                                  <div className="mb-2" style={{ background: 'transparent' }}>
                                    <CustomCheckbox
                                      id={`enable-coparticipacao-${index}`}
                                      checked={selectedPlan.enableCoparticipacao || false}
                                      onChange={(e) => updatePlanBooleanField(index, 'enableCoparticipacao', e.target.checked)}
                                      label="Coparticipação (R$)"
                                    />
                                  </div>
                                  <InputMasked
                                    mask="price"
                                    value={selectedPlan.coparticipacao}
                                    onChange={(e) => {
                                      if (!selectedPlan.enableCoparticipacao) {
                                        updatePlanBooleanField(index, 'enableCoparticipacao', true);
                                      }
                                      updatePlanField(index, 'coparticipacao', e.target.value);
                                    }}
                                    onFocus={() => {
                                      if (!selectedPlan.enableCoparticipacao) {
                                        updatePlanBooleanField(index, 'enableCoparticipacao', true);
                                      }
                                    }}
                                    onClick={() => {
                                      if (!selectedPlan.enableCoparticipacao) {
                                        updatePlanBooleanField(index, 'enableCoparticipacao', true);
                                      }
                                    }}
                                    placeholder="0,00"
                                    className={!selectedPlan.enableCoparticipacao ? 'bg-muted text-muted-foreground cursor-pointer' : ''}
                                    data-testid={`input-plan-coparticipacao-${index}`}
                                    style={{
                                      borderColor: 'var(--border-gray)',
                                      backgroundColor: !selectedPlan.enableCoparticipacao ? undefined : '#FFFFFF'
                                    }}
                                  />
                                </div>

                                {/* Carência */}
                                <div>
                                  <div className="mb-2" style={{ background: 'transparent' }}>
                                    <CustomCheckbox
                                      id={`enable-carencia-${index}`}
                                      checked={selectedPlan.enableCarencia || false}
                                      onChange={(e) => updatePlanBooleanField(index, 'enableCarencia', e.target.checked)}
                                      label="Carência (Dias)"
                                    />
                                  </div>
                                  <Input
                                    value={selectedPlan.carencia}
                                    onChange={(e) => {
                                      if (!selectedPlan.enableCarencia) {
                                        updatePlanBooleanField(index, 'enableCarencia', true);
                                      }
                                      updatePlanField(index, 'carencia', e.target.value);
                                    }}
                                    onFocus={() => {
                                      if (!selectedPlan.enableCarencia) {
                                        updatePlanBooleanField(index, 'enableCarencia', true);
                                      }
                                    }}
                                    onClick={() => {
                                      if (!selectedPlan.enableCarencia) {
                                        updatePlanBooleanField(index, 'enableCarencia', true);
                                      }
                                    }}
                                    placeholder="Digite apenas números"
                                    className={!selectedPlan.enableCarencia ? 'bg-muted text-muted-foreground cursor-pointer' : ''}
                                    data-testid={`input-plan-carencia-${index}`}
                                    style={{
                                      borderColor: 'var(--border-gray)',
                                      backgroundColor: !selectedPlan.enableCarencia ? undefined : '#FFFFFF'
                                    }}
                                  />
                                </div>
                                
                                {/* Limites Anuais */}
                                <div>
                                  <div className="mb-2" style={{ background: 'transparent' }}>
                                    <CustomCheckbox
                                      id={`enable-limites-${index}`}
                                      checked={selectedPlan.enableLimitesAnuais || false}
                                      onChange={(e) => updatePlanBooleanField(index, 'enableLimitesAnuais', e.target.checked)}
                                      label="Limites Anuais"
                                    />
                                  </div>
                                  <Input
                                    value={selectedPlan.limitesAnuais}
                                    onChange={(e) => {
                                      if (!selectedPlan.enableLimitesAnuais) {
                                        updatePlanBooleanField(index, 'enableLimitesAnuais', true);
                                      }
                                      updatePlanField(index, 'limitesAnuais', e.target.value);
                                    }}
                                    onFocus={() => {
                                      if (!selectedPlan.enableLimitesAnuais) {
                                        updatePlanBooleanField(index, 'enableLimitesAnuais', true);
                                      }
                                    }}
                                    onClick={() => {
                                      if (!selectedPlan.enableLimitesAnuais) {
                                        updatePlanBooleanField(index, 'enableLimitesAnuais', true);
                                      }
                                    }}
                                    placeholder="Ex: 2"
                                    className={!selectedPlan.enableLimitesAnuais ? 'bg-muted text-muted-foreground cursor-pointer' : ''}
                                    data-testid={`input-plan-limites-${index}`}
                                    style={{
                                      borderColor: 'var(--border-gray)',
                                      backgroundColor: !selectedPlan.enableLimitesAnuais ? undefined : '#FFFFFF'
                                    }}
                                  />
                                  {planErrors[index] && selectedPlan.enableLimitesAnuais && planErrors[index].includes('Limites anuais') && (
                                    <p className="text-xs text-destructive mt-1">{planErrors[index]}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Botão Remover */}
                            <div className="flex justify-end pt-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removePlan(index)}
                                className="text-destructive"
                              >
                                <X className="h-4 w-4 mr-1" />
                                Remover
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {selectedPlans.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      Nenhum plano vinculado. Clique em "Adicionar Plano" para vincular este procedimento a um plano.
                    </div>
                  )}
                  
                  {Array.isArray(plans) && plans.length > 0 && selectedPlans.length >= plans.length && (
                    <div className="text-center py-2 text-sm text-muted-foreground">
                      Todos os planos disponíveis já foram adicionados.
                    </div>
                  )}
                </div>

              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="h-8"
                  data-testid="button-cancel"
                  style={{
                    borderColor: 'var(--border-gray)',
                    background: 'white'
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="admin-action"
                  disabled={createMutation.isPending}
                  className="h-8 min-w-[100px]"
                  data-testid="button-save"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    editingItem ? "Atualizar" : "Criar"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent hideCloseButton className="overflow-y-auto" maxHeightMobile="max-h-[80vh]">
          <DialogHeader className="flex flex-row items-center justify-between pr-2">
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-primary" />
              <span>Visualizar Procedimento</span>
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyToClipboard}
                disabled={copyState === 'copying'}
                className={`gap-2 h-8 transition-all duration-300 ${copyState === 'copied' ? 'bg-[#e6f4f4] border-[#277677] text-[#277677]' : ''}`}
                data-testid="button-copy-procedure"
              >
                {copyState === 'copying' && <Loader2 className="h-4 w-4 animate-spin" />}
                {copyState === 'copied' && <Check className="h-4 w-4" />}
                {copyState === 'idle' && <Copy className="h-4 w-4" />}
                {copyState === 'copying' ? 'Copiando...' : copyState === 'copied' ? 'Copiado!' : 'Copiar'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewDialogOpen(false)}
                className="h-8"
              >
                Fechar
              </Button>
            </div>
          </DialogHeader>
          
          {viewingItem && (
            <div className="space-y-4">
              {/* Nome do Procedimento */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nome do Procedimento</label>
                <h3 className="text-lg font-medium mt-1 break-words whitespace-pre-wrap">{viewingItem.name ?? ''}</h3>
                <Badge variant="neutral" className="mt-2">
                  {viewingItem.isActive ? "Ativo" : "Inativo"}
                </Badge>
              </div>

              {/* Planos Vinculados */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Planos Vinculados</label>
                <div className="mt-2 space-y-3">
                  {viewingProcedurePlans && Array.isArray(viewingProcedurePlans) && viewingProcedurePlans.length > 0 ? (
                    viewingProcedurePlans.map((planItem: any) => {
                      const plan = Array.isArray(plans) ? plans.find((p: any) => p.id === planItem.planId) : null;
                      return (
                        <div key={planItem.planId} className="border border-[#eaeaea] rounded-lg p-4 bg-white">
                          {/* Nome do Plano e Categoria */}
                          <div className="mb-3">
                            <p className="font-semibold text-base break-words whitespace-pre-wrap">{plan?.name || 'Plano não encontrado'}</p>
                            {plan?.description && (
                              <p className="text-sm text-muted-foreground break-words whitespace-pre-wrap">{plan.description}</p>
                            )}
                          </div>
                          
                          {/* Grid 2x3 com os 6 campos */}
                          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                            <div>
                              <p className="text-xs text-muted-foreground">Valor Integral</p>
                              <p className="font-medium break-words whitespace-pre-wrap">R$ {(planItem.price / 100).toFixed(2).replace('.', ',')}</p>
                            </div>

                            <div>
                              <p className="text-xs text-muted-foreground">Pagar (R$)</p>
                              <p className="font-medium break-words whitespace-pre-wrap">R$ {planItem.payValue ? (planItem.payValue / 100).toFixed(2).replace('.', ',') : '0,00'}</p>
                            </div>

                            <div>
                              <p className="text-xs text-muted-foreground">Coparticipação</p>
                              <p className="font-medium break-words whitespace-pre-wrap">
                                {planItem.coparticipacao > 0 
                                  ? `R$ ${(planItem.coparticipacao / 100).toFixed(2).replace('.', ',')}` 
                                  : 'Sem coparticipação'}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-muted-foreground">Carência</p>
                              <p className="font-medium break-words whitespace-pre-wrap">{planItem.carencia || '60 dias'}</p>
                            </div>

                            <div className="col-span-2">
                              <p className="text-xs text-muted-foreground">Limites Anuais</p>
                              <p className="font-medium break-words whitespace-pre-wrap">{planItem.limitesAnuais || '10 vezes no ano'}</p>
                            </div>
                          </div>

                          <p className="text-xs text-muted-foreground text-center mt-3 pt-3 border-t border-[#eaeaea]">Preço no plano</p>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground py-4">
                      Nenhum plano vinculado a este procedimento.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Search and Column Control */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to page 1 when searching
              }}
              className="pl-10 w-80"
              data-testid="input-search-procedures" 
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button 
                variant="admin-action" 
                size="sm" 
                data-testid="button-new-procedure"
                disabled={!canAdd()}
                title={!canAdd() ? "Você não tem permissão para adicionar" : "Adicionar procedimento"}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </DialogTrigger>
          </Dialog>
          
          <ExportButton 
            data={filteredItems}
            filename="procedimentos"
            title="Exportação de Procedimentos"
            pageName="Procedimentos"
            prepareData={prepareExportData}
            visibleColumns={visibleColumns}
            disabled={isLoading || filteredItems.length === 0}
          />
          
          {/* Controle de Colunas */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                style={{
                  borderColor: 'var(--border-gray)',
                  background: 'white'
                }}
              >
                <MoreHorizontal className="h-4 w-4 mr-2" />
                Colunas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {allColumns.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col}
                  checked={visibleColumns.includes(col)}
                  onCheckedChange={() => toggleColumn(col)}
                  className="mb-1"
                >
                  {col}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table Container */}
      <div className="container my-10 space-y-4 border border-[#eaeaea] rounded-lg bg-white shadow-sm">
        
        {isLoading ? (
          <div className="p-4">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="h-4 bg-muted rounded w-1/4 animate-pulse"></div>
                  <div className="h-4 bg-muted rounded w-1/6 animate-pulse"></div>
                  <div className="h-4 bg-muted rounded w-1/8 animate-pulse"></div>
                  <div className="h-4 bg-muted rounded w-1/6 animate-pulse"></div>
                  <div className="h-4 bg-muted rounded w-1/4 animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        ) : paginatedItems?.length ? (
          <Table>
            <TableHeader>
              <TableRow className="bg-white border-b border-[#eaeaea]">
                {visibleColumns.includes("Nome") && (
                  <TableHead className="bg-white">Nome</TableHead>
                )}
                {visibleColumns.includes("Status") && (
                  <TableHead className="bg-white">Status</TableHead>
                )}
                {visibleColumns.includes("Coparticipação") && (
                  <TableHead className="bg-white">Coparticipação</TableHead>
                )}
                {visibleColumns.includes("Carência") && (
                  <TableHead className="bg-white">Carência</TableHead>
                )}
                {visibleColumns.includes("Limites Anuais") && (
                  <TableHead className="bg-white">Limites Anuais</TableHead>
                )}
                {visibleColumns.includes("Ações") && (
                  <TableHead className="bg-white">Ações</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.map((item: any) => (
                <TableRow key={item.id} className="bg-white border-b border-[#eaeaea]">
                  {visibleColumns.includes("Nome") && (
                    <TableCell className="font-medium whitespace-nowrap bg-white">
                      <div className="font-medium" data-testid={`procedure-name-${item.id}`}>
                        {item.name ?? ''}
                      </div>
                      {item.description && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {item.description}
                        </div>
                      )}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Status") && (
                    <TableCell className="whitespace-nowrap bg-white">
                      <Switch
                        checked={item.isActive}
                        onCheckedChange={() => handleToggleStatus(item.id, item.isActive)}
                      />
                    </TableCell>
                  )}
                  {visibleColumns.includes("Coparticipação") && (
                    <TableCell className="whitespace-nowrap bg-white text-sm">
                      {formatCoparticipacaoSummary(item.plans)}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Carência") && (
                    <TableCell className="whitespace-nowrap bg-white text-sm">
                      {formatCarenciaSummary(item.plans)}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Limites Anuais") && (
                    <TableCell className="whitespace-nowrap bg-white text-sm">
                      {formatLimitesSummary(item.plans)}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Ações") && (
                    <TableCell className="whitespace-nowrap bg-white">
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleView(item)}
                          data-testid={`button-view-${item.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(item)}
                          disabled={!canEdit()}
                          title={!canEdit() ? "Você não tem permissão para editar" : "Editar procedimento"}
                          data-testid={`button-edit-${item.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          disabled={!canDelete() || deleteMutation.isPending}
                          title={!canDelete() ? "Você não tem permissão para excluir" : "Excluir procedimento"}
                          data-testid={`button-delete-${item.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableBody>
              <TableRow className="bg-white border-b border-[#eaeaea]">
                <TableCell colSpan={visibleColumns.length} className="text-center py-12 bg-white">
                  <Clipboard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    {searchQuery 
                      ? "Nenhum procedimento encontrado para a busca." 
                      : "Nenhum procedimento cadastrado ainda."
                    }
                  </p>
                  {!searchQuery && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDialogOpen(true)}
                      disabled={!canAdd()}
                      title={!canAdd() ? "Você não tem permissão para adicionar" : "Criar primeiro procedimento"}
                      data-testid="button-add-first-procedure"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Primeiro Procedimento
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}

        
        {/* Pagination */}
        {totalItems > 10 && (
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">
                  {totalItems > 0 ? (
                    <>Mostrando {(currentPage - 1) * pageSize + 1} a {Math.min(currentPage * pageSize, totalItems)} de {totalItems} procedimento{totalItems !== 1 ? 's' : ''}</>
                  ) : (
                    "Nenhum procedimento encontrado"
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <div className="flex items-center space-x-1">
                <span className="text-sm font-medium">
                  Página {currentPage} de {totalPages}
                </span>
              </div>
              <Button
                variant="admin-action"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Próximo
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o 
              procedimento selecionado e todas as suas configurações de planos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="delete-password" className="text-sm font-medium">
                Digite sua senha para confirmar
              </label>
              <Input
                id="delete-password"
                type="password"
                value={deletePassword}
                onChange={(e) => {
                  setDeletePassword(e.target.value);
                  setDeletePasswordError("");
                }}
                placeholder="Senha de administrador"
                className={deletePasswordError ? "border-red-500" : ""}
              />
              {deletePasswordError && (
                <p className="text-sm text-red-600">{deletePasswordError}</p>
              )}
            </div>
          </div>

          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeletePassword("");
                setDeletePasswordError("");
                setItemToDelete("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmDelete}
              disabled={!deletePassword || isDeleting || deleteMutation.isPending}
              className="min-w-[100px]"
            >
              {isDeleting || deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Excluir"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}