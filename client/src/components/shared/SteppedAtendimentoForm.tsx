import { useEffect, useState, memo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/admin/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Componente de indicador isolado - FORA do componente principal
const StepIndicatorComponent = memo(({ currentStep }: { currentStep: number }) => (
  <div className="flex items-center justify-center mb-8">
    {[1, 2, 3, 4].map((step) => (
      <div key={`static-step-${step}`} className="flex items-center">
        <div
          className={cn(
            "w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm md:text-base",
            step <= currentStep ? "bg-[#277677]" : "bg-gray-300"
          )}
        >
          {step < currentStep ? (
            <Check className="h-4 w-4 md:h-5 md:w-5" />
          ) : (
            step
          )}
        </div>
        {step < 4 && (
          <div
            className={cn(
              "w-12 md:w-16 h-1 mx-1 md:mx-2",
              step < currentStep ? "bg-[#277677]" : "bg-gray-300"
            )}
          />
        )}
      </div>
    ))}
  </div>
), (prevProps, nextProps) => prevProps.currentStep === nextProps.currentStep);

StepIndicatorComponent.displayName = 'StepIndicatorComponent';

interface SteppedAtendimentoFormProps {
  mode: 'admin' | 'unit';
  slug?: string;
  networkUnitId?: string;
  networkUnitName?: string;
  onSuccess?: () => void;
}

export default function SteppedAtendimentoForm({
  mode,
  slug,
  networkUnitId,
  networkUnitName,
  onSuccess
}: SteppedAtendimentoFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Etapas do formulário
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  
  // Estados do formulário
  const [cpfSearch, setCpfSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clientPets, setClientPets] = useState<any[]>([]);
  const [procedureSearch, setProcedureSearch] = useState("");
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  const [selectedPet, setSelectedPet] = useState<any>(null);
  const [petHistory, setPetHistory] = useState<any[]>([]);

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

  // Schema de validação
  const atendimentoFormSchema = z.object({
    clientId: z.string().min(1, "Cliente é obrigatório"),
    petId: z.string().min(1, "Pet é obrigatório"),
    procedure: z.string().min(1, "Procedimento é obrigatório"),
    networkUnitId: z.string().min(1, "Rede credenciada é obrigatória"),
    generalNotes: z.string().optional(),
    value: z.string().optional(),
    status: z.string().optional(),
  });

  const form = useForm({
    resolver: zodResolver(atendimentoFormSchema),
    mode: 'onChange',
    defaultValues: {
      clientId: "",
      petId: "",
      procedure: "",
      networkUnitId: networkUnitId || "",
      generalNotes: "",
      value: "",
      status: "open",
    },
  });

  // Buscar redes credenciadas (apenas para admin)
  const { data: networkUnits = [], isLoading: networkUnitsLoading } = useQuery<any[]>({
    queryKey: ["/admin/api/network-units"],
    queryFn: async () => {
      const response = await fetch("/admin/api/network-units");
      if (!response.ok) throw new Error("Erro ao buscar redes credenciadas");
      return response.json();
    },
    enabled: mode === 'admin',
  });

  // Buscar procedimentos disponíveis
  const petIdToFetch = form.watch("petId");
  const { data: availableProcedures, isLoading: proceduresLoading } = useQuery<any>({
    queryKey: mode === 'admin' 
      ? ["/admin/api/pets", petIdToFetch, "available-procedures"]
      : [`/api/units/${slug}/pets/${petIdToFetch}/available-procedures`],
    queryFn: async () => {
      if (mode === 'admin') {
        const response = await fetch(`/admin/api/pets/${petIdToFetch}/available-procedures`);
        if (!response.ok) throw new Error("Erro ao buscar procedimentos");
        return response.json();
      } else {
        const token = localStorage.getItem('unit-token');
        if (!token) throw new Error('Token de autenticação não encontrado');
        
        const response = await fetch(`/api/units/${slug}/pets/${petIdToFetch}/available-procedures`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Erro ao buscar procedimentos");
        return response.json();
      }
    },
    enabled: Boolean(petIdToFetch),
  });

  // Auto-busca quando CPF tem 11 dígitos
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

  // Buscar cliente por CPF
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
      let client;
      let pets;
      
      if (mode === 'admin') {
        const response = await fetch(`/admin/api/clients/cpf/${sanitizedCpf}`);
        if (!response.ok) throw new Error("Cliente não encontrado com este CPF.");
        client = await response.json();
        
        const petsResponse = await fetch(`/admin/api/clients/${client.id}/pets`);
        if (!petsResponse.ok) throw new Error("Erro ao buscar pets do cliente");
        pets = await petsResponse.json();
      } else {
        const token = localStorage.getItem('unit-token');
        if (!token) throw new Error('Token de autenticação não encontrado');
        
        const response = await fetch(`/api/units/${slug}/clients/cpf/${sanitizedCpf}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Cliente não encontrado com este CPF.");
        client = await response.json();
        
        const petsResponse = await fetch(`/api/units/${slug}/clients/${client.id}/pets`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!petsResponse.ok) throw new Error("Erro ao buscar pets do cliente");
        pets = await petsResponse.json();
      }
      
      setSelectedClient(client);
      form.setValue("clientId", client.id);
      setClientPets(pets);
      
      // Reset campos dependentes
      form.setValue("petId", "");
      form.setValue("procedure", "");
      form.setValue("generalNotes", "");
      form.setValue("value", "");
      
      // Auto-selecionar se houver apenas um pet
      if (pets.length === 1) {
        form.setValue("petId", pets[0].id);
      }
      
      toast({
        title: "Cliente encontrado",
        description: `${client.fullName} - CPF: ${formatCpf(client.cpf)}`,
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
    } finally {
      setIsSearchingClient(false);
    }
  };

  // Mutation para criar atendimento
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (mode === 'admin') {
        const response = await fetch("/admin/api/atendimentos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error("Erro ao criar atendimento");
        return response.json();
      } else {
        const token = localStorage.getItem('unit-token');
        if (!token) throw new Error('Token de autenticação não encontrado');
        
        const response = await fetch(`/api/units/${slug}/atendimentos`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            ...data,
            value: data.value ? parseFloat(data.value.replace(',', '.')) : 0
          }),
        });
        if (!response.ok) throw new Error("Erro ao criar atendimento");
        return response.json();
      }
    },
    onSuccess: async () => {
      if (mode === 'admin') {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["/admin/api/atendimentos"] }),
          queryClient.invalidateQueries({ queryKey: ["/admin/api/atendimentos/with-network-units"] }),
          queryClient.invalidateQueries({ queryKey: ["/admin/api/dashboard/all"] })
        ]);
      } else {
        await queryClient.invalidateQueries({ queryKey: [`/api/units/${slug}/atendimentos`] });
      }
      
      toast({
        title: "Atendimento criado",
        description: "Atendimento foi criado com sucesso.",
      });
      
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao criar atendimento.",
        variant: "destructive",
      });
    },
  });

  // Validação para avançar etapas
  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return selectedClient && form.getValues("clientId");
      case 2:
        return form.getValues("petId");
      case 3:
        return form.getValues("networkUnitId") && form.getValues("procedure");
      case 4:
        return true;
      default:
        return false;
    }
  };

  // Navegar entre etapas
  const goToNextStep = () => {
    if (canProceedToNextStep() && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Finalizar formulário
  const handleFinish = () => {
    const data = form.getValues();
    if (!data.clientId || !data.petId || !data.procedure) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }
    mutation.mutate(data);
  };

  // Animação das etapas
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <StepIndicatorComponent currentStep={currentStep} />
      
      <Form {...form}>
        <Card className="border border-[#eaeaea] rounded-lg bg-white shadow-sm !bg-white">
          <CardHeader className="bg-white rounded-t-lg">
            <CardTitle className="text-xl">
              {currentStep === 1 && "Informações do Cliente"}
              {currentStep === 2 && "Seleção do Pet"}
              {currentStep === 3 && "Procedimento e Unidade"}
              {currentStep === 4 && "Observações e Confirmação"}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="min-h-[400px] bg-white">
            <AnimatePresence mode="wait" custom={currentStep}>
              <motion.div
                key={currentStep}
                custom={currentStep}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 }
                }}
                className="space-y-6"
              >
                {/* Etapa 1: Cliente */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div className="text-left md:text-center mb-6">
                      <p className="text-gray-600">
                        Digite o CPF do cliente para buscar suas informações
                      </p>
                    </div>
                    
                    <div className="max-w-md mx-auto">
                      <FormLabel>CPF do Cliente *</FormLabel>
                      <div className="relative">
                        <Input
                          placeholder="000.000.000-00"
                          value={cpfSearch}
                          onChange={(e) => setCpfSearch(formatCpf(e.target.value))}
                          maxLength={14}
                          className="h-12 text-center text-lg"
                          style={{
                            borderColor: 'var(--border-gray)',
                            background: 'white'
                          }}
                        />
                        {isSearchingClient && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          </div>
                        )}
                      </div>
                      
                      {selectedClient && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-6 p-4 rounded-lg"
                          style={{ backgroundColor: 'rgba(39, 118, 119, 0.1)', borderWidth: '1px', borderStyle: 'solid', borderColor: '#277677' }}
                        >
                          <p className="font-semibold" style={{ color: '#277677' }}>
                            ✓ Cliente encontrado
                          </p>
                          <p className="text-gray-700 mt-2">
                            <strong>Nome:</strong> {selectedClient.fullName}
                          </p>
                          <p className="text-gray-700">
                            <strong>CPF:</strong> {formatCpf(selectedClient.cpf)}
                          </p>
                        </motion.div>
                      )}
                    </div>
                  </div>
                )}

                {/* Etapa 2: Pet */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <div className="text-left md:text-center mb-6">
                      <p className="text-gray-600">
                        Selecione o pet do cliente {selectedClient?.fullName}
                      </p>
                    </div>
                    
                    <div className="max-w-3xl mx-auto">
                      <FormField
                        control={form.control}
                        name="petId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pet *</FormLabel>
                            <Select 
                              onValueChange={async (value) => {
                                field.onChange(value);
                                form.setValue("procedure", "");
                                form.setValue("generalNotes", "");
                                form.setValue("value", "");
                                
                                // Buscar informações detalhadas do pet
                                const pet = clientPets.find(p => p.id === value);
                                setSelectedPet(pet);
                                
                                // Buscar histórico de atendimentos
                                try {
                                  const historyResponse = await fetch(
                                    mode === 'admin' 
                                      ? `/admin/api/pets/${value}/atendimentos`
                                      : `/api/units/${slug}/pets/${value}/atendimentos`,
                                    mode === 'unit' ? {
                                      headers: { 'Authorization': `Bearer ${localStorage.getItem('unit-token')}` }
                                    } : undefined
                                  );
                                  
                                  if (historyResponse.ok) {
                                    const history = await historyResponse.json();
                                    setPetHistory(history);
                                  } else {
                                    setPetHistory([]);
                                  }
                                } catch (error) {
                                  console.error('Erro ao buscar histórico:', error);
                                  setPetHistory([]);
                                }
                              }} 
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger 
                                  className="h-12 text-left"
                                  style={{
                                    borderColor: 'var(--border-gray)',
                                    background: 'white'
                                  }}
                                >
                                  <SelectValue placeholder={
                                    clientPets.length === 0 
                                      ? "Cliente sem pets cadastrados" 
                                      : "Selecione o pet"
                                  } />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-w-[90vw] md:max-w-full">
                                {clientPets.map((pet) => (
                                  <SelectItem 
                                    key={pet.id} 
                                    value={pet.id}
                                    className="py-3"
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-semibold">{pet.name}</span>
                                      <span className="text-sm text-gray-500">
                                        {pet.species} {pet.breed && `- ${pet.breed}`}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                            
                            {field.value && selectedPet && (
                              <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-6 space-y-4"
                              >
                                {/* Informações Pessoais do Pet */}
                                <div className="bg-white rounded-lg border border-gray-200 p-4">
                                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-3">
                                    <h3 className="font-semibold text-lg text-[#277677]">
                                      Informações Pessoais do Pet
                                    </h3>
                                    <span 
                                      className="px-3 py-1 rounded-full text-xs font-medium w-fit" 
                                      style={{ 
                                        backgroundColor: selectedPet.planId ? 'rgba(39, 118, 119, 0.1)' : 'rgba(128, 128, 128, 0.1)', 
                                        color: selectedPet.planId ? '#277677' : '#666666'
                                      }}
                                    >
                                      {selectedPet.planId ? 'Plano Ativo' : 'Sem Plano'}
                                    </span>
                                  </div>
                                  <div className="flex gap-4">
                                    {/* Foto do Pet */}
                                    {selectedPet.imageUrl && (
                                      <div className="flex-shrink-0">
                                        <img 
                                          src={selectedPet.imageUrl} 
                                          alt={selectedPet.name}
                                          className="w-20 h-20 rounded-lg object-cover border border-gray-200"
                                        />
                                      </div>
                                    )}
                                    {/* Informações do Pet */}
                                    <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                      <div>
                                        <span className="font-medium text-gray-600">Nome:</span>
                                        <span className="ml-2 text-gray-900">{selectedPet.name}</span>
                                      </div>
                                      {selectedPet.species && (
                                        <div>
                                          <span className="font-medium text-gray-600">Espécie:</span>
                                          <span className="ml-2 text-gray-900">{selectedPet.species}</span>
                                        </div>
                                      )}
                                      {selectedPet.breed && (
                                        <div>
                                          <span className="font-medium text-gray-600">Raça:</span>
                                          <span className="ml-2 text-gray-900">{selectedPet.breed}</span>
                                        </div>
                                      )}
                                      {selectedPet.age && (
                                        <div>
                                          <span className="font-medium text-gray-600">Idade:</span>
                                          <span className="ml-2 text-gray-900">{selectedPet.age}</span>
                                        </div>
                                      )}
                                      {selectedPet.sex && (
                                        <div>
                                          <span className="font-medium text-gray-600">Sexo:</span>
                                          <span className="ml-2 text-gray-900">{selectedPet.sex}</span>
                                        </div>
                                      )}
                                      {selectedPet.castrated !== undefined && selectedPet.castrated !== null && (
                                        <div>
                                          <span className="font-medium text-gray-600">Castrado:</span>
                                          <span className="ml-2 text-gray-900">
                                            {selectedPet.castrated === true ? 'Sim' : 'Não'}
                                          </span>
                                        </div>
                                      )}
                                      {selectedPet.color && (
                                        <div>
                                          <span className="font-medium text-gray-600">Cor:</span>
                                          <span className="ml-2 text-gray-900">{selectedPet.color}</span>
                                        </div>
                                      )}
                                      {selectedPet.weight && selectedPet.weight !== '0' && selectedPet.weight !== 0 && parseFloat(selectedPet.weight) > 0 && (
                                        <div>
                                          <span className="font-medium text-gray-600">Peso:</span>
                                          <span className="ml-2 text-gray-900">{selectedPet.weight} kg</span>
                                        </div>
                                      )}
                                      {selectedPet.microchip && (
                                        <div>
                                          <span className="font-medium text-gray-600">Microchip:</span>
                                          <span className="ml-2 text-gray-900">{selectedPet.microchip}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Informações Médicas */}
                                  {(selectedPet.previousDiseases || selectedPet.surgeries || selectedPet.allergies || selectedPet.currentMedications) && (
                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                      <h4 className="font-medium text-gray-700 mb-2">Informações Médicas</h4>
                                      <div className="space-y-2 text-sm">
                                        {selectedPet.previousDiseases && (
                                          <div>
                                            <span className="font-medium text-gray-600">Doenças Anteriores:</span>
                                            <p className="mt-1 text-gray-900">{selectedPet.previousDiseases}</p>
                                          </div>
                                        )}
                                        {selectedPet.surgeries && (
                                          <div>
                                            <span className="font-medium text-gray-600">Cirurgias:</span>
                                            <p className="mt-1 text-gray-900">{selectedPet.surgeries}</p>
                                          </div>
                                        )}
                                        {selectedPet.allergies && (
                                          <div>
                                            <span className="font-medium text-gray-600">Alergias:</span>
                                            <p className="mt-1 text-gray-900">{selectedPet.allergies}</p>
                                          </div>
                                        )}
                                        {selectedPet.currentMedications && (
                                          <div>
                                            <span className="font-medium text-gray-600">Medicações Atuais:</span>
                                            <p className="mt-1 text-gray-900">{selectedPet.currentMedications}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Histórico de Atendimentos */}
                                <div className="bg-white rounded-lg border border-gray-200 p-4">
                                  <h3 className="font-semibold text-lg mb-3 text-[#277677]">
                                    Histórico de Atendimentos
                                  </h3>
                                  {petHistory && petHistory.length > 0 ? (
                                    <div 
                                      className="space-y-3 max-h-[300px] overflow-y-auto pr-2"
                                      style={{ 
                                        scrollbarWidth: 'thin',
                                        scrollbarColor: '#277677 #f0f0f0'
                                      }}
                                    >
                                      {petHistory
                                        .sort((a: any, b: any) => {
                                          const dateA = new Date(a.createdAt || a.created_at).getTime();
                                          const dateB = new Date(b.createdAt || b.created_at).getTime();
                                          return dateB - dateA; // Mais recentes primeiro
                                        })
                                        .map((atendimento: any, index: number, array: any[]) => (
                                        <div key={atendimento.id || index}>
                                          <div className="border-l-2 border-[#277677] pl-3 text-sm pb-3">
                                            <div className="flex justify-between items-start gap-2">
                                              <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900 break-words">
                                                  {atendimento.procedure || 'Procedimento não especificado'}
                                                </p>
                                                <p className="text-gray-600 text-xs break-words">
                                                  {new Date(atendimento.createdAt || atendimento.created_at).toLocaleDateString('pt-BR')}
                                                  {atendimento.networkUnit && ` - ${atendimento.networkUnit.name}`}
                                                </p>
                                                {atendimento.generalNotes && (
                                                  <p className="text-gray-700 mt-1 break-all" style={{ wordWrap: 'break-word', overflowWrap: 'anywhere' }}>
                                                    Observação: {atendimento.generalNotes}
                                                  </p>
                                                )}
                                              </div>
                                              <span className="flex-shrink-0 px-2 py-1 rounded text-xs" style={{ backgroundColor: 'rgba(39, 118, 119, 0.1)', color: '#277677' }}>
                                                {atendimento.status === 'completed' || atendimento.status === 'closed' ? 'Concluída' :
                                                 atendimento.status === 'pending' ? 'Pendente' :
                                                 atendimento.status === 'open' ? 'Aberta' :
                                                 atendimento.status === 'cancelled' ? 'Cancelada' :
                                                 'Em andamento'}
                                              </span>
                                            </div>
                                          </div>
                                          {index < array.length - 1 && (
                                            <hr className="border-gray-200 mb-3" />
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-gray-500 text-sm">
                                      Nenhum atendimento anterior registrado
                                    </p>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {/* Etapa 3: Rede e Procedimento */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="text-left md:text-center mb-6">
                      <p className="text-gray-600">
                        Selecione a unidade e o procedimento
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {mode === 'admin' ? (
                        <FormField
                          control={form.control}
                          name="networkUnitId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Rede Credenciada *</FormLabel>
                              <Select 
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  form.setValue("procedure", "");
                                  form.setValue("value", "");
                                }} 
                                value={field.value}
                                disabled={networkUnitsLoading}
                              >
                                <FormControl>
                                  <SelectTrigger 
                                    className="h-12"
                                    style={{
                                      borderColor: 'var(--border-gray)',
                                      background: 'white'
                                    }}
                                  >
                                    <SelectValue placeholder={
                                      networkUnitsLoading 
                                        ? "Carregando redes..." 
                                        : "Selecione a rede credenciada"
                                    } />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="max-w-[90vw] md:max-w-full">
                                  {networkUnits.map((unit: any) => (
                                    <SelectItem key={unit.id} value={unit.id}>
                                      {unit.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ) : (
                        <div className="space-y-2">
                          <FormLabel>Rede Credenciada *</FormLabel>
                          <Input
                            value={networkUnitName || 'Unidade Atual'}
                            disabled
                            className="h-12"
                            style={{
                              borderColor: 'var(--border-gray)',
                              background: '#f5f5f5',
                              cursor: 'not-allowed'
                            }}
                          />
                          <p className="text-xs text-gray-500">
                            Unidade pré-selecionada automaticamente
                          </p>
                        </div>
                      )}

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
                                disabled={!petIdToFetch || proceduresLoading || !form.getValues("networkUnitId")}
                              >
                                <FormControl>
                                  <SelectTrigger 
                                    className="h-12"
                                    style={{
                                      borderColor: 'var(--border-gray)',
                                      background: 'white'
                                    }}
                                  >
                                    <SelectValue placeholder={
                                      !form.getValues("networkUnitId")
                                        ? "Selecione primeiro a rede credenciada"
                                        : proceduresLoading 
                                        ? "Carregando procedimentos..." 
                                        : "Selecione o procedimento"
                                    } />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="max-w-[90vw] md:max-w-full">
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
                                    filteredProcedures.map((proc: any) => (
                                      <SelectItem key={proc.id} value={proc.name}>
                                        <div className="flex flex-col max-w-full">
                                          <span className="truncate">{proc.name}</span>
                                          {proc.annualLimit && (
                                            <span className="text-xs text-gray-500 truncate">
                                              Limite: {proc.remaining}/{proc.annualLimit} restantes
                                            </span>
                                          )}
                                        </div>
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <div className="p-4 text-sm text-muted-foreground">
                                      Nenhum procedimento encontrado
                                    </div>
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                              
                              {field.value && (
                                <p className="text-sm text-primary mt-2">
                                  Coparticipação: {form.getValues("value") === "0,00" ? "Sem coparticipação" : `R$ ${form.getValues("value")}`}
                                </p>
                              )}
                            </FormItem>
                          );
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Etapa 4: Observações e Confirmação */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="generalNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observações Gerais (Opcional)</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Adicione observações ou informações adicionais sobre o atendimento..."
                              className="min-h-[120px]"
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
                    
                    <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <h3 className="font-semibold mb-3">Resumo do Atendimento</h3>
                      <div className="space-y-2 text-sm">
                        <p>
                          <strong>Cliente:</strong> {selectedClient?.fullName}
                        </p>
                        <p>
                          <strong>Pet:</strong> {clientPets.find(p => p.id === form.getValues("petId"))?.name}
                        </p>
                        <p>
                          <strong>Procedimento:</strong> {form.getValues("procedure")}
                        </p>
                        {mode === 'admin' && (
                          <p>
                            <strong>Unidade:</strong> {networkUnits.find((u: any) => u.id === form.getValues("networkUnitId"))?.name}
                          </p>
                        )}
                        {form.getValues("value") && form.getValues("value") !== "0,00" && (
                          <p>
                            <strong>Coparticipação:</strong> R$ {form.getValues("value")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </CardContent>
          
          <div className="px-6 pb-6">
            <Separator className="mb-6" />
            
            <div className="flex justify-between">
              <div>
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goToPreviousStep}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar
                  </Button>
                )}
              </div>
              
              <div className="flex gap-3">
                {currentStep < totalSteps ? (
                  <Button
                    type="button"
                    onClick={goToNextStep}
                    disabled={!canProceedToNextStep()}
                    className="flex items-center gap-2"
                  >
                    Próximo
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleFinish}
                    disabled={mutation.isPending}
                    variant="default"
                    className="flex items-center gap-2 hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#277677' }}
                  >
                    {mutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Concluir
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      </Form>
    </div>
  );
}