import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowLeft, ArrowRight, Plus, Trash2, Edit, Check, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMediaQuery } from "@/hooks/use-media-query";
import { CopyButton } from '@/components/ui/copy-button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator
} from '@/components/ui/select';
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { useSpecies } from "@/hooks/use-species";
import { logger } from "@/utils/logger";

interface Plan {
  id: string;
  name: string;
  price: number;
  basePrice: string;
  description: string;
  features: string[];
  planType?: string;
  billingFrequency?: string;
}

interface PetData {
  name: string;
  species: string;
  breed: string;
  age: string | number;
  weight: number;
  sex?: string;
}

interface CustomerData {
  name: string;
  email: string;
  cpf: string;
  phone: string;
  address: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  zipCode: string;
}

interface PaymentData {
  method: 'credit_card' | 'pix';
  creditCard?: {
    cardNumber: string;
    holder: string;
    expirationDate: string;
    securityCode: string;
    installments: number;
  };
}

interface Species {
  id: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function Checkout() {
  const [, navigate] = useLocation();
  const [, params] = useRoute('/checkout/:planId?');
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // Funções de máscara
  const formatCPF = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Limita a 11 dígitos
    const limitedNumbers = numbers.slice(0, 11);
    
    // Aplica a máscara
    if (limitedNumbers.length <= 3) return limitedNumbers;
    if (limitedNumbers.length <= 6) return `${limitedNumbers.slice(0, 3)}.${limitedNumbers.slice(3)}`;
    if (limitedNumbers.length <= 9) return `${limitedNumbers.slice(0, 3)}.${limitedNumbers.slice(3, 6)}.${limitedNumbers.slice(6)}`;
    return `${limitedNumbers.slice(0, 3)}.${limitedNumbers.slice(3, 6)}.${limitedNumbers.slice(6, 9)}-${limitedNumbers.slice(9)}`;
  };

  const formatPhone = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Limita a 11 dígitos
    const limitedNumbers = numbers.slice(0, 11);
    
    // Aplica a máscara
    if (limitedNumbers.length <= 2) return limitedNumbers;
    if (limitedNumbers.length <= 6) {
      // Formato para até 6 dígitos: (xx) xxxx
      return `(${limitedNumbers.slice(0, 2)}) ${limitedNumbers.slice(2)}`;
    } else if (limitedNumbers.length <= 10) {
      // Formato para 7-10 dígitos: (xx) xxxx-xxxx
      return `(${limitedNumbers.slice(0, 2)}) ${limitedNumbers.slice(2, 6)}-${limitedNumbers.slice(6)}`;
    } else {
      // Formato para 11 dígitos: (xx) xxxxx-xxxx
      return `(${limitedNumbers.slice(0, 2)}) ${limitedNumbers.slice(2, 7)}-${limitedNumbers.slice(7)}`;
    }
  };

  const formatCEP = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Limita a 8 dígitos
    const limitedNumbers = numbers.slice(0, 8);
    
    // Aplica a máscara
    if (limitedNumbers.length <= 5) return limitedNumbers;
    return `${limitedNumbers.slice(0, 5)}-${limitedNumbers.slice(5)}`;
  };

  // Função para buscar endereço pelo CEP
  const fetchAddressByCEP = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, '');
    
    if (cleanCEP.length !== 8) return;
    
    setIsLoadingCEP(true);
    setCepError('');
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setCustomerData(prev => ({
          ...prev,
          address: data.logradouro || '',
          district: data.bairro || '',
          city: data.localidade || '',
          state: data.uf || '',
          // Mantém os campos que o usuário já preencheu
          number: prev.number,
          complement: prev.complement
        }));
        setCepError('');
      } else {
        setCepError('CEP não encontrado. Por favor, verifique e tente novamente.');
      }
    } catch (error) {
      logger.error('Erro ao buscar CEP:', error);
      setCepError('Erro ao buscar CEP. Por favor, preencha o endereço manualmente.');
    } finally {
      setIsLoadingCEP(false);
    }
  };

  const validateEmail = (value: string) => {
    return value.includes('@');
  };
  
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [petsData, setPetsData] = useState<PetData[]>([{
    name: '',
    species: '',
    breed: '',
    age: '',
    weight: 0,
    sex: ''
  }]);
  const [customerData, setCustomerData] = useState<CustomerData>({
    name: '',
    email: '',
    cpf: '',
    phone: '',
    address: '',
    number: '',
    complement: '',
    district: '',
    city: '',
    state: '',
    zipCode: ''
  });
  
  const [paymentData, setPaymentData] = useState<PaymentData>({
    method: 'credit_card',
    creditCard: {
      cardNumber: '',
      holder: '',
      expirationDate: '',
      securityCode: '',
      installments: 1
    }
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const { data: species, isLoading: speciesLoading } = useSpecies();
  const [collapsedPets, setCollapsedPets] = useState<boolean[]>([false]); // Controla quais pets estão colapsados
  const [editingPets, setEditingPets] = useState<boolean[]>([false]); // Controla quais pets estão em modo de edição
  const [pixData, setPixData] = useState<{ qrCode: string; copyPasteCode: string; orderId: string; paymentId: string } | null>(null);
  const [isPaymentConfirmed, setIsPaymentConfirmed] = useState(false);
  const [isLoadingCEP, setIsLoadingCEP] = useState(false);
  const [cepError, setCepError] = useState('');
  const [paymentError, setPaymentError] = useState<{ show: boolean; title: string; message: string; }>({ show: false, title: '', message: '' });
  const [acceptedPrivacyTerms, setAcceptedPrivacyTerms] = useState(false);
  const [acceptedTermsConditions, setAcceptedTermsConditions] = useState(false);
  
  // Estados do cupom
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // Função para validar se o último pet permite adicionar um novo
  const canAddNewPet = () => {
    if (petsData.length >= 5) return false;
    const lastPet = petsData[petsData.length - 1];
    if (!lastPet) return false;
    return lastPet.name.trim() !== '' && lastPet.species.trim() !== '' && lastPet.age && parseInt(lastPet.age.toString()) > 0;
  };

  // Funções para gerenciar múltiplos pets
  const addPet = () => {
    // Simplesmente adiciona uma nova div de pet (não precisa validar o último pet)
    const newCollapsedState = [...collapsedPets, false]; // Novo pet fica aberto
    setCollapsedPets(newCollapsedState);
    
    const newEditingState = [...editingPets, false]; // Novo pet não está editando
    setEditingPets(newEditingState);
    
    // Adicionar novo pet
    setPetsData([...petsData, {
      name: '',
      species: '',
      breed: '',
      age: '',
      weight: 0,
      sex: ''
    }]);
  };

  const removePet = (index: number) => {
    if (petsData.length > 1) {
      setPetsData(petsData.filter((_, i) => i !== index));
      setCollapsedPets(collapsedPets.filter((_, i) => i !== index));
      setEditingPets(editingPets.filter((_, i) => i !== index));
    } else {
      // Se é o último pet, substitui por um pet vazio
      setPetsData([{
        name: '',
        species: '',
        breed: '',
        age: '',
        weight: 0,
        sex: ''
      }]);
      setCollapsedPets([false]); // Mantém expandido para preenchimento
      setEditingPets([false]); // Não está editando
    }
  };

  // Função para expandir/colapsar um pet específico
  const togglePetCollapse = (index: number) => {
    const newCollapsedState = [...collapsedPets];
    newCollapsedState[index] = !newCollapsedState[index];
    setCollapsedPets(newCollapsedState);
  };

  // Função para validar se um pet pode ser salvo
  const isPetDataValid = (pet: PetData) => {
    return pet.name.trim() !== '' && 
           pet.species.trim() !== '' && 
           pet.age && parseInt(pet.age.toString()) > 0;
  };

  // Função para salvar um pet (colapsar a div)
  const savePet = (index: number) => {
    const pet = petsData[index];
    if (!isPetDataValid(pet)) {
      return; // Não salva se os dados não são válidos
    }
    
    const newCollapsedState = [...collapsedPets];
    newCollapsedState[index] = true;
    setCollapsedPets(newCollapsedState);
    
    // Reset do estado de edição para que o botão de apagar apareça
    const newEditingState = [...editingPets];
    newEditingState[index] = false;
    setEditingPets(newEditingState);
  };

  // Função para verificar se todos os pets estão colapsados
  const areAllPetsCollapsed = () => {
    return collapsedPets.every(collapsed => collapsed);
  };


  const updatePet = (index: number, field: keyof PetData, value: string | number) => {
    const updatedPets = [...petsData];
    updatedPets[index] = { ...updatedPets[index], [field]: value } as PetData;
    setPetsData(updatedPets);
  };

  // Função para iniciar modo de edição
  const startEditingPet = (index: number) => {
    const newEditingState = [...editingPets];
    newEditingState[index] = true;
    setEditingPets(newEditingState);
    
    // Expandir o pet quando entrar em modo de edição
    const newCollapsedState = [...collapsedPets];
    newCollapsedState[index] = false;
    setCollapsedPets(newCollapsedState);
  };

  // Função para finalizar modo de edição e colapsar
  const finishEditingPet = (index: number) => {
    const newEditingState = [...editingPets];
    newEditingState[index] = false;
    setEditingPets(newEditingState);
    
    // Colapsar o pet após finalizar edição
    const newCollapsedState = [...collapsedPets];
    newCollapsedState[index] = true;
    setCollapsedPets(newCollapsedState);
  };

  // Validação para pets - todos os campos obrigatórios devem estar preenchidos
  const isPetsDataValid = () => {
    return petsData.every(pet => pet.name && pet.species && pet.age);
  };
  
  // Validação para dados do cliente
  const isCustomerDataValid = () => {
    return customerData.name && customerData.email && customerData.cpf && customerData.phone && acceptedPrivacyTerms;
  };
  
  // Validação para pagamento
  const isPaymentDataValid = () => {
    // Verificar se aceitou os termos e condições
    if (!acceptedTermsConditions) return false;
    
    if (paymentData.method === 'credit_card' && paymentData.creditCard) {
      const isCardDataValid = paymentData.creditCard.cardNumber && 
                              paymentData.creditCard.holder && 
                              paymentData.creditCard.expirationDate && 
                              paymentData.creditCard.securityCode;
      
      // Validar regras de parcelas baseadas no plano
      const installments = paymentData.creditCard.installments || 1;
      const isBasicOrInfinity = selectedPlan && ['BASIC', 'INFINITY'].some(type => selectedPlan.name.toUpperCase().includes(type));
      
      let isInstallmentsValid = false;
      if (isBasicOrInfinity) {
        // Planos Basic/Infinity: apenas 1x
        isInstallmentsValid = installments === 1;
      } else {
        // Outros planos: 1x a 12x
        isInstallmentsValid = installments >= 1 && installments <= 12;
      }
      
      return isCardDataValid && isInstallmentsValid;
    }
    return paymentData.method === 'pix';
  };

  // Fetch plans on component mount
  useEffect(() => {
    fetchPlans();
  }, []);

  // Set selected plan based on route parameter
  useEffect(() => {
    if (params?.planId && plans.length > 0) {
      const plan = plans.find(p => p.id === params.planId);
      if (plan) {
        setSelectedPlan(plan);
        setCurrentStep(2); // Skip plan selection if coming from direct link
      }
    }
  }, [params?.planId, plans]);

  // Função para verificar status do pagamento PIX
  const checkPixPaymentStatus = async (paymentId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/payments/query/${paymentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Checkout-Polling': 'true' // Header especial para permitir polling sem autenticação
        },
        credentials: 'same-origin'
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Usar apenas o campo mappedStatus para verificar aprovação
        const mappedStatus = result.data?.mappedStatus;
        
        logger.log('🔍 [FRONTEND] Status do pagamento:', { mappedStatus });
        
        // Lógica simplificada: apenas mappedStatus
        // pending = aguardando pagamento
        // approved = aprovado, pode redirecionar
        const isApproved = mappedStatus === 'approved';
        
        logger.log('🔍 [FRONTEND] Verificação de aprovação:', {
          mappedStatus,
          isApproved
        });
        
        // Log quando aprovado
        if (isApproved) {
          logger.log('✅ PIX aprovado! Status:', { mappedStatus });
        }
        
        return isApproved;
      } else {
        logger.log('❌ [FRONTEND] Resposta da API não foi OK:', response.status, response.statusText);
        return false;
      }
    } catch (error) {
      logger.error('❌ [FRONTEND] Erro ao verificar status PIX:', error);
      return false;
    }
  };

  // Hook para polling do pagamento PIX
  useEffect(() => {
    if (!pixData?.paymentId || isPaymentConfirmed) {
      return;
    }

    logger.log('🚀 Iniciando polling PIX para pagamento:', pixData.paymentId);
    
    // Captura o paymentId em uma variável local para evitar problemas de closure
    const currentPaymentId = pixData.paymentId;
    let checkCount = 0;
    
    const pollInterval = setInterval(async () => {
      checkCount++;
      logger.log(`🔄 [${checkCount}] Verificando status do PIX para payment: ${currentPaymentId}`);
      
      try {
        const isConfirmed = await checkPixPaymentStatus(currentPaymentId);
        logger.log(`📊 [${checkCount}] Resultado da verificação PIX:`, isConfirmed);
        
        if (isConfirmed) {
          logger.log('🎉 PIX APROVADO! Redirecionando para login com popup de sucesso...');
          clearInterval(pollInterval);
          setIsPaymentConfirmed(true);
          
          // Forçar redirecionamento usando window.location para garantir navegação
          setTimeout(() => {
            logger.log('🚪 Executando redirecionamento...');
            window.location.href = '/cliente/login?payment_success=true';
          }, 100);
        }
      } catch (error) {
        logger.error(`❌ [${checkCount}] Erro durante verificação do PIX:`, error);
      }
    }, 3000); // Verificar a cada 3 segundos

    // Fazer primeira verificação imediatamente
    setTimeout(async () => {
      logger.log('🔍 Primeira verificação imediata...');
      try {
        const isConfirmed = await checkPixPaymentStatus(currentPaymentId);
        logger.log('📊 Status inicial:', isConfirmed);
        
        if (isConfirmed) {
          logger.log('🎉 PIX JÁ ESTAVA APROVADO! Redirecionando imediatamente...');
          clearInterval(pollInterval);
          setIsPaymentConfirmed(true);
          
          // Forçar redirecionamento
          setTimeout(() => {
            logger.log('🚪 Executando redirecionamento imediato...');
            window.location.href = '/cliente/login?payment_success=true';
          }, 100);
        }
      } catch (error) {
        logger.error('❌ Erro na primeira verificação:', error);
      }
    }, 500);

    // Limpar polling após 10 minutos (600 segundos) para evitar polling infinito
    const timeout = setTimeout(() => {
      logger.log('⏰ Timeout do polling PIX após 10 minutos');
      clearInterval(pollInterval);
    }, 600000);

    return () => {
      logger.log('🧹 Limpando polling PIX...');
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [pixData?.paymentId, isPaymentConfirmed]);

  // Funções utilitárias para máscaras de cartão
  const formatCardNumber = (value: string): string => {
    // Remove tudo que não é número
    const digits = value.replace(/\D/g, '');
    // Limita a 16 dígitos
    const limitedDigits = digits.substring(0, 16);
    // Formata com espaços a cada 4 dígitos
    return limitedDigits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatCVV = (value: string): string => {
    // Remove tudo que não é número e limita a 3 dígitos
    return value.replace(/\D/g, '').substring(0, 3);
  };

  const formatExpiry = (value: string): string => {
    // Remove tudo que não é número
    const digits = value.replace(/\D/g, '');
    // Limita a 4 dígitos
    const limitedDigits = digits.substring(0, 4);
    // Formata como MM/AA
    if (limitedDigits.length >= 3) {
      return limitedDigits.substring(0, 2) + '/' + limitedDigits.substring(2);
    }
    return limitedDigits;
  };

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/plans');
      if (response.ok) {
        const data = await response.json();
        setPlans(data);
      }
    } catch (error) {
      logger.error('Error fetching plans:', error);
    }
  };


  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlan(plan);
    setCurrentStep(2);
  };

  const handleNextStep = () => {
    // Se está no step 3 (Dados do Cliente), validar email
    if (currentStep === 3) {
      setShowValidationErrors(true);
      
      // Se email não é válido, não prosseguir
      if (!validateEmail(customerData.email)) {
        return;
      }
    }
    
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
      // Reset validation errors quando muda de step
      setShowValidationErrors(false);
    } else {
      handleSubmit();
    }
  };

  const handlePrevStep = () => {
    // Reset validation errors ao voltar
    setShowValidationErrors(false);
    
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate('/plans');
    }
  };

  const handleApplyCoupon = async (e?: React.MouseEvent) => {
    // Previne qualquer comportamento padrão
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!couponCode.trim()) {
      setCouponError('Digite um código de cupom');
      return;
    }

    setIsValidatingCoupon(true);
    setCouponError('');

    try {
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: couponCode.toUpperCase() }),
      });

      const data = await response.json();

      if (response.ok) {
        setAppliedCoupon(data.coupon);
        setCouponError('');
      } else {
        setCouponError(data.error || 'Cupom inválido');
        setAppliedCoupon(null);
      }
    } catch (error) {
      logger.error('Error validating coupon:', error);
      setCouponError('Erro ao validar cupom. Tente novamente.');
      setAppliedCoupon(null);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setAppliedCoupon(null);
    setCouponError('');
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // Validar regras de parcelas antes de enviar
      if (paymentData.method === 'credit_card' && paymentData.creditCard) {
        const installments = paymentData.creditCard.installments || 1;
        const isBasicOrInfinity = selectedPlan && ['BASIC', 'INFINITY'].some(type => selectedPlan.name.toUpperCase().includes(type));
        
        if (isBasicOrInfinity && installments !== 1) {
          alert('Planos Basic e Infinity permitem apenas pagamento à vista (1x).');
          setIsLoading(false);
          return;
        }
        
        if (!isBasicOrInfinity && (installments < 1 || installments > 12)) {
          alert('Este plano permite parcelamento de 1x a 12x.');
          setIsLoading(false);
          return;
        }
      }
      // Primeiro salvar apenas dados do cliente (sem pets)
      const clientResponse = await fetch('/api/checkout/save-customer-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientData: {
            full_name: customerData.name,
            email: customerData.email,
            phone: customerData.phone,
            // SECURITY: Password should be collected from user input in a secure manner
            // Remove hardcoded password for security compliance
            address: customerData.address,
            city: customerData.city,
            state: customerData.state,
            zipCode: customerData.zipCode
          },
          petsData: [] // Não enviar pets nesta etapa
        }),
      });

      if (!clientResponse.ok) {
        throw new Error('Erro ao salvar dados do cliente');
      }

      const clientData = await clientResponse.json();

      // Segundo passo: completar registro com CPF e endereço
      const completeRegistrationResponse = await fetch('/api/checkout/complete-registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: clientData.clientId,
          cpf: customerData.cpf.replace(/\D/g, ''), // Remove formatação do CPF
          addressData: {
            address: customerData.address || '',
            number: customerData.number || 'S/N',
            complement: customerData.complement || '',
            district: customerData.district || '',
            city: customerData.city || '',
            state: customerData.state || '',
            cep: customerData.zipCode || ''
          }
        }),
      });

      if (!completeRegistrationResponse.ok) {
        throw new Error('Erro ao completar registro do cliente');
      }

      const completeRegistrationData = await completeRegistrationResponse.json();

      // Processar pagamento usando endpoint atualizado com suporte a múltiplos pets
      const paymentRequestData = {
        addressData: {
          address: customerData.address,
          number: customerData.number || 'S/N',
          complement: customerData.complement || '',
          district: customerData.district || '',
          city: customerData.city,
          state: customerData.state,
          zipCode: customerData.zipCode
        },
        paymentData: {
          customer: {
            name: customerData.name,
            email: customerData.email,
            cpf: customerData.cpf
          },
          pets: petsData.filter(pet => pet.name.trim() !== ''), // ✅ Enviar dados dos pets
          payment: paymentData.method === 'credit_card' ? {
            cardNumber: paymentData.creditCard?.cardNumber,
            holder: paymentData.creditCard?.holder,
            expirationDate: paymentData.creditCard?.expirationDate,
            securityCode: paymentData.creditCard?.securityCode,
            installments: paymentData.creditCard?.installments || 1
          } : undefined
        },
        planData: {
          planId: selectedPlan?.id,
          amount: calculateTotal(),
          billingPeriod: 'monthly' // Pode ser alterado conforme necessário
        },
        paymentMethod: paymentData.method,
        coupon: appliedCoupon?.code // Adicionar código do cupom se aplicado
      };

      const response = await fetch('/api/checkout/simple-process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentRequestData),
      });

      if (response.ok) {
        const result = await response.json();
        if (paymentData.method === 'pix' && result.payment?.pixQrCode) {
          // Para PIX, armazenar dados no estado ao invés de navegar
          setPixData({
            qrCode: result.payment.pixQrCode,
            copyPasteCode: result.payment.pixCode,
            orderId: result.payment.orderId,
            paymentId: result.payment.paymentId
          });
        } else if (paymentData.method === 'credit_card' && result.payment?.status === 2) {
          // Para cartão aprovado (status 2), redirecionar imediatamente para customer/login com parâmetro para mostrar popup
          logger.log('🎉 [CHECKOUT] Pagamento com cartão aprovado, redirecionando para login!');
          navigate('/cliente/login?payment_success=true');
        } else {
          navigate(`/checkout-success?order=${result.payment?.orderId}&method=${paymentData.method}`);
        }
      } else {
        // Capturar erro detalhado do backend
        try {
          const errorData = await response.json();
          const errorMessage = errorData.error || 'Ocorreu um erro no processamento do pagamento';
          const errorDetails = errorData.details || '';
          
          // Mapear códigos de erro para mensagens mais user-friendly
          let userMessage = errorMessage;
          let title = 'Pagamento Não Autorizado';
          
          if (errorMessage.includes('não autorizado')) {
            title = 'Cartão Recusado';
            userMessage = 'Seu cartão foi recusado pela operadora. Verifique os dados do cartão ou tente outro cartão.';
          } else if (errorMessage.includes('CPF')) {
            title = 'CPF Inválido';
            userMessage = 'O CPF informado não é válido. Verifique os números e tente novamente.';
          } else if (errorMessage.includes('cartão') || errorMessage.includes('card')) {
            title = 'Dados do Cartão';
            userMessage = 'Verifique os dados do seu cartão (número, validade, CVV) e tente novamente.';
          }
          
          setPaymentError({
            show: true,
            title,
            message: userMessage
          });
        } catch {
          // Se não conseguir fazer parse da resposta, usar erro genérico
          setPaymentError({
            show: true,
            title: 'Erro no Pagamento',
            message: 'Ocorreu um erro no processamento do pagamento. Verifique os dados e tente novamente.'
          });
        }
      }
    } catch (error) {
      logger.error('Error during checkout:', error);
      setPaymentError({
        show: true,
        title: 'Erro de Conexão',
        message: 'Não foi possível conectar com o servidor. Verifique sua conexão e tente novamente.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price / 100);
  };

  const formatPriceForPricing = (priceInCents: number): string => {
    return (priceInCents / 100).toFixed(2).replace('.', ',');
  };

  // Função para obter texto de coparticipação
  const getCoParticipationText = (planType?: string): string => {
    return planType === "with_waiting_period" ? "Sem coparticipação" : "Com coparticipação";
  };

  // Calcular valor total com descontos por pet usando basePrice correto
  const calculateTotal = () => {
    if (!selectedPlan) return 0;
    
    let totalCents = 0;
    // Converter basePrice (string em reais) para centavos
    let basePriceCents = Math.round(parseFloat(selectedPlan.basePrice || '0') * 100);
    
    // Para planos COMFORT e PLATINUM, multiplicar por 12 (cobrança anual)
    if (['COMFORT', 'PLATINUM'].some(type => selectedPlan.name.toUpperCase().includes(type))) {
      basePriceCents = basePriceCents * 12;
    }
    
    // Calcular preço por pet com desconto individual
    petsData.forEach((_, index) => {
      let petPriceCents = basePriceCents;
      
      // Aplicar desconto apenas para planos Basic/Infinity e pets a partir do 2º
      if (['BASIC', 'INFINITY'].some(type => selectedPlan.name.toUpperCase().includes(type)) && index > 0) {
        const discountPercentage = index === 1 ? 5 :  // 2º pet: 5%
                                 index === 2 ? 10 : // 3º pet: 10%
                                 15;                 // 4º+ pets: 15%
        petPriceCents = Math.round(basePriceCents * (1 - discountPercentage / 100));
      }
      
      totalCents += petPriceCents;
    });
    
    // Aplicar desconto do cupom se houver
    if (appliedCoupon) {
      const couponValue = Number(appliedCoupon.value);
      if (appliedCoupon.type === 'percentage') {
        // Desconto percentual
        const discountAmount = Math.round(totalCents * (couponValue / 100));
        totalCents = totalCents - discountAmount;
      } else {
        // Desconto fixo em reais (converter para centavos)
        const discountCents = Math.round(couponValue * 100);
        totalCents = Math.max(0, totalCents - discountCents); // Não permitir valor negativo
      }
    }
    
    return totalCents;
  };

  // Função para identificar se o plano tem desconto por múltiplos pets
  const isPlanEligibleForDiscount = (planName: string) => {
    const name = planName.toLowerCase();
    return name === 'basic' || name === 'infinity';
  };

  // Função para calcular desconto por pet
  const calculatePetDiscount = (petIndex: number) => {
    if (petIndex === 0) return 0; // Primeiro pet não tem desconto
    if (petIndex === 1) return 5; // 2º pet: 5%
    if (petIndex === 2) return 10; // 3º pet: 10%
    return 15; // 4º e 5º pet: 15%
  };

  // Função para gerar resumo das etapas anteriores
  const getStepSummary = (step: number) => {
    const parts = [];
    
    // Plano selecionado (disponível a partir da etapa 2)
    if (step >= 2 && selectedPlan) {
      parts.push(selectedPlan.name.toLowerCase());
    }
    
    // Número de pets (disponível a partir da etapa 3)
    if (step >= 3 && petsData.length > 0) {
      const validPets = petsData.filter(pet => pet.name.trim() !== '');
      parts.push(`${validPets.length}-pet${validPets.length !== 1 ? 's' : ''}`);
    }
    
    // Primeiro nome do cliente (disponível a partir da etapa 4)
    if (step >= 4 && customerData.name.trim() !== '') {
      const firstName = customerData.name.trim().split(' ')[0];
      if (firstName) {
        parts.push(firstName.toLowerCase());
      }
    }
    
    return parts.join('/');
  };


  return (
    <>
      <Header />
      <div className="min-h-screen pt-16" style={{backgroundColor: '#277677'}}>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-6 xs:mb-8">
            <div className="flex justify-center items-center space-x-1 xs:space-x-2 lg:space-x-4">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`w-6 h-6 xs:w-8 xs:h-8 rounded-full flex items-center justify-center text-xs xs:text-sm font-medium ${
                      currentStep >= step
                        ? 'bg-white/20 text-white border border-white'
                        : 'bg-teal-700 text-white border border-white/30'
                    }`}
                  >
                    {currentStep > step ? <CheckCircle className="w-4 h-4" /> : step}
                  </div>
                  {step < 4 && (
                    <div
                      className={`w-6 xs:w-12 h-1 mx-1 xs:mx-2 ${
                        currentStep > step ? 'bg-white' : 'bg-teal-700'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          {currentStep === 1 ? (
            <div className="bg-white rounded-lg shadow-lg px-4 md:px-12 py-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <h2 className="text-xl xs:text-2xl font-bold text-center mb-4 xs:mb-6">
                  Escolha seu Plano
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 perspective-1000 max-w-7xl mx-auto">
                  {plans.map((plan, index) => (
                    <motion.div
                      key={plan.id}
                      initial={{ opacity: 0 }}
                      whileInView={{
                        opacity: 1,
                      }}
                      viewport={{ once: true }}
                      transition={{
                        duration: 0.5,
                        ease: "easeOut",
                        delay: index * 0.1,
                      }}
                      className={cn(
                        "rounded-2xl border-[1px] bg-[var(--bg-cream-light)] text-center flex flex-col relative transform-style-preserve-3d backface-hidden transition-all duration-300 cursor-pointer",
                        index === 1
                          ? "border-[var(--text-gold)] border-2"
                          : "border-[var(--border-teal-light)]",
                        // Apply 3D effects only on desktop and when there are exactly 3 plans visible
                        isDesktop && plans.length >= 3 && [
                          index === 0 && "pricing-card-left",
                          index === 1 && "pricing-card-popular", 
                          index === 2 && "pricing-card-right"
                        ]
                      )}
                      onClick={() => handlePlanSelect(plan)}
                    >
                      {index === 1 && (
                        <div className="absolute top-0 right-0 bg-[var(--text-gold)] py-0.5 px-2 rounded-bl-xl rounded-tr-xl flex items-center">
                          <Star className="text-[var(--text-light)] h-4 w-4 fill-current" />
                          <span className="text-[var(--text-light)] ml-1 font-sans font-semibold">
                            Popular
                          </span>
                        </div>
                      )}

                      <div className="flex flex-col h-full p-6">
                        {/* Conteúdo superior */}
                        <div className="flex-1">
                          {/* Nome do plano */}
                          <div className="flex items-center justify-center mb-6">
                            <p className="text-base font-semibold text-[var(--text-dark-primary)]">
                              {plan.name}
                            </p>
                          </div>

                          {/* Preço */}
                          <div className="mb-4 flex items-center justify-center">
                            <span className="text-3xl font-bold tracking-tight text-[var(--text-teal)]">
                              R$ {parseFloat(String(plan.basePrice || 0)).toFixed(2).replace('.', ',')}/mês
                            </span>
                          </div>

                          <p className="text-xs leading-5 text-[var(--text-dark-primary)] mb-4">
                            {plan.billingFrequency === 'annual' ? 'faturamento anual' : 'faturamento mensal'}
                          </p>

                          {/* Lista de recursos */}
                          <ul className="mt-5 gap-2 flex flex-col mb-8 text-left">
                            {plan.features.map((feature, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <Check className="h-4 w-4 text-[var(--text-teal)] mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-[var(--text-dark-primary)]">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Conteúdo inferior fixo */}
                        <div className="mt-auto">
                          <hr className="w-full my-4 border-[var(--border-teal-light)]" />

                          {/* Badge de coparticipação */}
                          <div className="mb-4 text-center">
                            <span 
                              className="inline-block px-3 py-1 text-xs font-semibold rounded-full" 
                              style={{
                                background: 'var(--bg-teal)', 
                                color: 'var(--text-light)'
                              }}
                            >
                              {getCoParticipationText(plan.planType)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Navigation Buttons for Step 1 (now inside white container) */}
              </motion.div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-lg p-8">

            {currentStep === 2 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="mb-6">
                  <h2 className="text-xl xs:text-2xl font-bold">
                    Dados do Pet
                  </h2>
                  {getStepSummary(2) && (
                    <div className="text-sm mb-2" style={{ color: '#E1AC33' }}>
                      {getStepSummary(2)}
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  {petsData.map((pet, index) => {
                    const isCollapsed = collapsedPets[index];
                    
                    return (
                      <div key={index} className={`border border-gray-200 rounded-lg relative ${isCollapsed ? 'py-3 px-4' : 'p-6'}`}>
                        <div className={`flex justify-between items-center ${isCollapsed ? 'mb-0' : 'mb-4'}`}>
                          <div className="flex flex-col lg:flex-row lg:items-center">
                          <h3 
                            className="text-lg font-semibold cursor-pointer flex items-center"
                            onClick={() => togglePetCollapse(index)}
                          >
                            Pet {index + 1}
                            {selectedPlan && isPlanEligibleForDiscount(selectedPlan.name) && calculatePetDiscount(index) > 0 && (
                              <span className="hidden lg:inline text-sm text-green-600 ml-2">
                                ({calculatePetDiscount(index)}% desconto)
                              </span>
                            )}
                            {isCollapsed && pet.name && (
                              <span className="text-sm text-gray-600 ml-2 font-normal">
                                - {pet.name}{pet.species && ` - ${pet.species}`}
                              </span>
                            )}
                          </h3>
                          
                          {/* Texto de desconto - Versão Mobile (embaixo do título) */}
                          {selectedPlan && isPlanEligibleForDiscount(selectedPlan.name) && calculatePetDiscount(index) > 0 && (
                            <span className="lg:hidden text-xs text-green-600 mt-1">
                              ({calculatePetDiscount(index)}% desconto)
                            </span>
                          )}
                          </div>
                          
                          {/* Botões para Desktop */}
                          <div className="hidden lg:flex items-center gap-2">
                            {isCollapsed && (
                              <button
                                type="button"
                                onClick={() => startEditingPet(index)}
                                className="flex items-center justify-center w-8 h-8 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            {!editingPets[index] && petsData.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removePet(index)}
                                className="flex items-center justify-center w-8 h-8 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                title="Remover"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {!isCollapsed && (
                          <div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                              <div>
                                <label className="block text-sm font-medium mb-2">
                                  Nome do Pet
                                </label>
                                <input
                                  type="text"
                                  value={pet.name}
                                  onChange={(e) => updatePet(index, 'name', e.target.value)}
                                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
                                  placeholder="Nome do seu pet"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-2">
                                  Espécie
                                </label>
                                <Select value={pet.species} onValueChange={(value) => updatePet(index, 'species', value)}>
                                  <SelectTrigger 
                                    className="w-full p-3 rounded-lg border text-sm"
                                    style={{
                                      borderColor: 'var(--border-gray)',
                                      background: 'white'
                                    }}
                                  >
                                    <SelectValue placeholder="Selecione a espécie" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {speciesLoading ? (
                                      <SelectItem value="loading" disabled>
                                        Carregando espécies...
                                      </SelectItem>
                                    ) : (
                                      (species || []).flatMap((speciesItem, index, array) => [
                                        <SelectItem key={speciesItem.id} value={speciesItem.name}>
                                          {speciesItem.name}
                                        </SelectItem>,
                                        ...(index < array.length - 1 ? [<SelectSeparator key={`separator-${speciesItem.id}`} />] : [])
                                      ])
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-2">
                                  Raça
                                </label>
                                <input
                                  type="text"
                                  value={pet.breed}
                                  onChange={(e) => updatePet(index, 'breed', e.target.value)}
                                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
                                  placeholder="Raça do pet (opcional)"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-2">
                                  Idade (anos)
                                </label>
                                <input
                                  type="number"
                                  value={pet.age || ''}
                                  onChange={(e) => updatePet(index, 'age', e.target.value)}
                                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
                                  placeholder="Idade"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-2">
                                  Sexo
                                </label>
                                <Select value={pet.sex || ''} onValueChange={(value) => updatePet(index, 'sex', value)}>
                                  <SelectTrigger 
                                    className="w-full p-3 rounded-lg border text-sm"
                                    style={{
                                      borderColor: 'var(--border-gray)',
                                      background: 'white'
                                    }}
                                  >
                                    <SelectValue placeholder="Selecione o sexo" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Macho">Macho</SelectItem>
                                    <SelectSeparator />
                                    <SelectItem value="Fêmea">Fêmea</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            
                            {/* Botão Salvar (aparece quando o pet não está colapsado) */}
                            <div className="flex justify-end mt-4">
                              <button
                                type="button"
                                onClick={() => savePet(index)}
                                disabled={!isPetDataValid(pet)}
                                className="px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{
                                  background: 'var(--btn-ver-planos-bg)',
                                  color: 'var(--btn-ver-planos-text)',
                                  border: 'none'
                                }}
                              >
                                Salvar
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Botões Mobile */}
                        <div className="lg:hidden flex gap-2 mt-3 pt-3 border-t border-gray-100">
                          {isCollapsed && (
                            <button
                              type="button"
                              onClick={() => startEditingPet(index)}
                              className="flex items-center justify-center flex-1 px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {!editingPets[index] && petsData.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removePet(index)}
                              className="flex items-center justify-center flex-1 px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                              title="Remover"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Botão Adicionar Pet - Embaixo da div dos pets - só aparece se o primeiro pet estiver colapsado */}
                {petsData.length < 5 && collapsedPets[0] && (
                  <div className="flex justify-center mt-6">
                    <button
                      type="button"
                      onClick={addPet}
                      className="flex items-center px-4 py-2 text-sm font-medium rounded-lg w-full xs:w-auto justify-center transition-transform duration-300 hover:scale-95"
                      style={{
                        background: 'var(--btn-cotacao-gratuita-bg)',
                        color: 'var(--btn-cotacao-gratuita-text)',
                        border: 'var(--btn-cotacao-gratuita-border)'
                      }}
                    >
                      <span className="flex items-center">
                        <Plus className="w-4 h-4 mr-1" />
                        Adicionar Pet
                      </span>
                    </button>
                  </div>
                )}

              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <h2 className="text-xl xs:text-2xl font-bold text-center mb-4 xs:mb-6">
                  Dados do Cliente
                </h2>
                {getStepSummary(3) && (
                  <div className="text-sm text-center mb-4" style={{ color: '#E1AC33' }}>
                    {getStepSummary(3)}
                  </div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      value={customerData.name}
                      onChange={(e) => setCustomerData({...customerData, name: e.target.value})}
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
                      placeholder="Seu nome completo"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={customerData.email}
                      onChange={(e) => setCustomerData({...customerData, email: e.target.value})}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 ${
                        showValidationErrors && !validateEmail(customerData.email) 
                          ? 'border-red-500' 
                          : ''
                      }`}
                      placeholder="seu@email.com"
                    />
                    {showValidationErrors && !validateEmail(customerData.email) && (
                      <p className="text-red-500 text-sm mt-1">Insira um email válido</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      CPF
                    </label>
                    <input
                      type="text"
                      value={customerData.cpf}
                      onChange={(e) => {
                        const formattedCPF = formatCPF(e.target.value);
                        setCustomerData({...customerData, cpf: formattedCPF});
                      }}
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Telefone
                    </label>
                    <input
                      type="text"
                      value={customerData.phone}
                      onChange={(e) => {
                        const formattedPhone = formatPhone(e.target.value);
                        setCustomerData({...customerData, phone: formattedPhone});
                      }}
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
                      placeholder="(11) 99999-9999"
                      maxLength={15}
                    />
                  </div>
                </div>
                
                {/* Campos de Endereço */}
                <h3 className="text-lg font-medium mt-6 mb-4">Endereço</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                  <div className="col-span-1 lg:col-span-2">
                    <label className="block text-sm font-medium mb-2">
                      CEP
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={customerData.zipCode}
                        onChange={async (e) => {
                          const formattedCEP = formatCEP(e.target.value);
                          setCustomerData({...customerData, zipCode: formattedCEP});
                          setCepError(''); // Limpa erro anterior
                          
                          // Busca endereço quando CEP tem 8 dígitos
                          const cleanCEP = formattedCEP.replace(/\D/g, '');
                          if (cleanCEP.length === 8) {
                            await fetchAddressByCEP(formattedCEP);
                          }
                        }}
                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 ${
                          cepError ? 'border-red-500' : ''
                        }`}
                        placeholder="00000-000"
                        maxLength={9}
                      />
                      {/* Indicador de carregamento */}
                      {isLoadingCEP && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-teal-500 rounded-full loading-dot"></div>
                            <div className="w-2 h-2 bg-teal-500 rounded-full loading-dot"></div>
                            <div className="w-2 h-2 bg-teal-500 rounded-full loading-dot"></div>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Mensagem de erro do CEP */}
                    {cepError && (
                      <p className="mt-1 text-sm text-red-600">{cepError}</p>
                    )}
                  </div>
                  
                  {/* Só mostra os outros campos se o CEP tem 8 dígitos */}
                  {customerData.zipCode && customerData.zipCode.replace(/\D/g, '').length === 8 && (
                    <>
                      <div className="col-span-1 lg:col-span-2">
                        <label className="block text-sm font-medium mb-2">
                          Endereço
                        </label>
                        <input
                          type="text"
                          value={customerData.address}
                          onChange={(e) => setCustomerData({...customerData, address: e.target.value})}
                          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
                          placeholder="Rua, Avenida, etc."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Número
                        </label>
                        <input
                          type="text"
                          value={customerData.number}
                          onChange={(e) => setCustomerData({...customerData, number: e.target.value})}
                          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
                          placeholder="Número"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Complemento (opcional)
                        </label>
                        <input
                          type="text"
                          value={customerData.complement}
                          onChange={(e) => setCustomerData({...customerData, complement: e.target.value})}
                          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
                          placeholder="Apto, Sala, etc."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Bairro
                        </label>
                        <input
                          type="text"
                          value={customerData.district}
                          onChange={(e) => setCustomerData({...customerData, district: e.target.value})}
                          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
                          placeholder="Bairro"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Cidade
                        </label>
                        <input
                          type="text"
                          value={customerData.city}
                          onChange={(e) => setCustomerData({...customerData, city: e.target.value})}
                          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
                          placeholder="Cidade"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Estado
                        </label>
                        <input
                          type="text"
                          value={customerData.state}
                          onChange={(e) => setCustomerData({...customerData, state: e.target.value.toUpperCase()})}
                          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
                          placeholder="UF"
                          maxLength={2}
                        />
                      </div>
                    </>
                  )}
                </div>
                
                {/* Checkbox de Termos de Privacidade */}
                <div className="flex items-center mt-6">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptedPrivacyTerms}
                      onChange={(e) => setAcceptedPrivacyTerms(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className="relative w-5 h-5 rounded border mr-3 flex-shrink-0 transition-all duration-200"
                      style={{
                        borderColor: 'rgb(209 213 219)',
                        backgroundColor: acceptedPrivacyTerms ? '#277677' : '#FFFFFF'
                      }}
                    >
                      {acceptedPrivacyTerms && (
                        <svg
                          className="absolute inset-0 w-full h-full p-0.5"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M5 13l4 4L19 7"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm text-gray-700">
                      Li e aceito os{' '}
                      <a href="/termos-de-privacidade" target="_blank" className="underline text-teal-600 hover:text-teal-700">
                        Termos de Privacidade
                      </a>
                    </span>
                  </label>
                </div>
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <h2 className="text-xl xs:text-2xl font-bold text-center mb-4 xs:mb-6">
                  Pagamento
                </h2>
                {getStepSummary(4) && (
                  <div className="text-sm text-center mb-4" style={{ color: '#E1AC33' }}>
                    {getStepSummary(4)}
                  </div>
                )}
                
                <div className="space-y-6">
                  {/* Seleção de método de pagamento */}
                  <div>
                    <label className="block text-lg font-medium mb-4">
                      Método de Pagamento
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div 
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          paymentData.method === 'credit_card' 
                            ? 'border-teal-600 bg-teal-50' 
                            : 'border-gray-200 hover:border-teal-300'
                        }`}
                        onClick={() => setPaymentData({...paymentData, method: 'credit_card'})}
                      >
                        <div className="flex items-center space-x-3">
                          <div 
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                              paymentData.method === 'credit_card' 
                                ? 'border-gray-300' 
                                : 'border-gray-300'
                            }`}
                            style={paymentData.method === 'credit_card' ? {
                              borderColor: '#277677',
                              backgroundColor: '#277677'
                            } : {}}
                          >
                            {paymentData.method === 'credit_card' && <div className="w-3 h-3 bg-white rounded-full"></div>}
                          </div>
                          <div>
                            <h3 className="font-medium">Cartão de Crédito</h3>
                            <p className="text-sm text-gray-600">Visa, Mastercard, Elo</p>
                          </div>
                        </div>
                      </div>
                      
                      <div 
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          paymentData.method === 'pix' 
                            ? 'border-teal-600 bg-teal-50' 
                            : 'border-gray-200 hover:border-teal-300'
                        }`}
                        onClick={() => setPaymentData({...paymentData, method: 'pix'})}
                      >
                        <div className="flex items-center space-x-3">
                          <div 
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                              paymentData.method === 'pix' 
                                ? 'border-gray-300' 
                                : 'border-gray-300'
                            }`}
                            style={paymentData.method === 'pix' ? {
                              borderColor: '#277677',
                              backgroundColor: '#277677'
                            } : {}}
                          >
                            {paymentData.method === 'pix' && <div className="w-3 h-3 bg-white rounded-full"></div>}
                          </div>
                          <div>
                            <h3 className="font-medium">PIX</h3>
                            <p className="text-sm text-gray-600">Pagamento instantâneo</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Campo de cupom de desconto */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="block text-sm font-medium mb-3">
                      Cupom de Desconto
                    </label>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleApplyCoupon();
                          }
                        }}
                        placeholder="Digite o código do cupom"
                        disabled={!!appliedCoupon}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      {appliedCoupon ? (
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Remover
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleApplyCoupon(e)}
                          disabled={isValidatingCoupon || !couponCode.trim()}
                          className="w-full unipet-button-primary text-base sm:text-lg py-2 text-[var(--text-light)] rounded-lg transition-transform duration-300 hover:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            background: 'var(--btn-cotacao-gratuita-bg)',
                            border: 'none'
                          }}
                        >
                          {isValidatingCoupon ? 'Validando...' : 'Aplicar desconto'}
                        </button>
                      )}
                    </div>
                    {couponError && (
                      <p className="mt-2 text-sm text-red-600">{couponError}</p>
                    )}
                    {appliedCoupon && (
                      <p className="mt-2 text-sm text-green-600">
                        ✓ Cupom aplicado: {appliedCoupon.type === 'percentage' 
                          ? `${appliedCoupon.value}% de desconto` 
                          : `R$ ${Number(appliedCoupon.value).toFixed(2)} de desconto`}
                      </p>
                    )}
                  </div>
                  
                  {/* Formulário de cartão de crédito */}
                  {paymentData.method === 'credit_card' && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Dados do Cartão</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-1 md:col-span-2">
                          <label className="block text-sm font-medium mb-2">
                            Número do Cartão
                          </label>
                          <input
                            type="text"
                            value={paymentData.creditCard?.cardNumber || ''}
                            onChange={(e) => {
                              const formattedValue = formatCardNumber(e.target.value);
                              setPaymentData({
                                ...paymentData,
                                creditCard: {
                                  ...paymentData.creditCard!,
                                  cardNumber: formattedValue
                                }
                              });
                            }}
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
                            placeholder="0000 0000 0000 0000"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Nome no Cartão
                          </label>
                          <input
                            type="text"
                            value={paymentData.creditCard?.holder || ''}
                            onChange={(e) => setPaymentData({
                              ...paymentData,
                              creditCard: {
                                ...paymentData.creditCard!,
                                holder: e.target.value
                              }
                            })}
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
                            placeholder="Nome conforme cartão"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Validade
                          </label>
                          <input
                            type="text"
                            value={paymentData.creditCard?.expirationDate || ''}
                            onChange={(e) => {
                              const formattedValue = formatExpiry(e.target.value);
                              setPaymentData({
                                ...paymentData,
                                creditCard: {
                                  ...paymentData.creditCard!,
                                  expirationDate: formattedValue
                                }
                              });
                            }}
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
                            placeholder="MM/AA"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            CVV
                          </label>
                          <input
                            type="text"
                            value={paymentData.creditCard?.securityCode || ''}
                            onChange={(e) => {
                              const formattedValue = formatCVV(e.target.value);
                              setPaymentData({
                                ...paymentData,
                                creditCard: {
                                  ...paymentData.creditCard!,
                                  securityCode: formattedValue
                                }
                              });
                            }}
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
                            placeholder="000"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Parcelas
                          </label>
                          <Select 
                            value={String(paymentData.creditCard?.installments || 1)} 
                            onValueChange={(value) => setPaymentData({
                              ...paymentData,
                              creditCard: {
                                ...paymentData.creditCard!,
                                installments: parseInt(value)
                              }
                            })}
                            disabled={!!selectedPlan && ['BASIC', 'INFINITY'].some(type => selectedPlan.name.toUpperCase().includes(type))}
                          >
                            <SelectTrigger 
                              className="w-full p-3 rounded-lg border text-sm"
                              style={{
                                borderColor: 'var(--border-gray)',
                                background: 'white'
                              }}
                            >
                              <SelectValue placeholder="Selecionar parcelas" />
                            </SelectTrigger>
                            <SelectContent>
                              {selectedPlan && ['BASIC', 'INFINITY'].some(type => selectedPlan.name.toUpperCase().includes(type)) ? (
                                <SelectItem value="1">1x à vista (único disponível)</SelectItem>
                              ) : (
                                [...Array(12)].map((_, i) => {
                                  const totalCents = calculateTotal();
                                  const installmentValue = totalCents / (i + 1) / 100;
                                  return (
                                    <SelectItem key={i + 1} value={String(i + 1)}>
                                      {i + 1}x {i === 0 ? 'à vista' : `de R$ ${installmentValue.toFixed(2)}`}
                                    </SelectItem>
                                  );
                                })
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Informações do PIX */}
                  {paymentData.method === 'pix' && (
                    <div className="p-4 rounded-lg" style={{backgroundColor: 'rgba(39, 118, 119, 0.1)'}}>
                      <h3 className="text-lg font-medium mb-2">Pagamento via PIX</h3>
                      <p className="text-sm text-gray-600">
                        Após confirmar o pedido, você receberá um QR Code para pagamento instantâneo via PIX.
                      </p>
                    </div>
                  )}
                  
                  {/* Resumo do pedido */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium mb-3">Resumo do Pedido</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Plano:</span>
                        <span className="font-medium">{selectedPlan?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Quantidade de Pets:</span>
                        <span className="font-medium">{petsData.length}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold pt-2 border-t">
                        <span>Total:</span>
                        <span>{formatPrice(calculateTotal())}</span>
                      </div>
                    </div>
                  </div>

                  {/* Seção do PIX - aparece após processamento */}
                  {pixData && paymentData.method === 'pix' && (
                    <div 
                      className="p-4 md:p-6 rounded-lg"
                      style={{
                        backgroundColor: 'rgba(39, 118, 119, 0.1)',
                        border: '1px solid #277677'
                      }}
                    >
                      
                      <div className="space-y-6 md:grid md:grid-cols-2 md:gap-6 md:space-y-0">
                        {/* QR Code */}
                        <div className="text-center">
                          <h4 className="font-medium mb-3 text-gray-700">Escaneie o QR Code</h4>
                          <div className="bg-white p-6 md:p-8 rounded-lg border shadow-sm inline-block">
                            <img 
                              src={`data:image/png;base64,${pixData.qrCode}`}
                              alt="QR Code PIX" 
                              className="w-56 h-56 md:w-72 md:h-72 mx-auto object-contain"
                              style={{ imageRendering: 'crisp-edges' }}
                            />
                          </div>
                        </div>
                        
                        {/* Código Copia e Cola */}
                        <div>
                          <h4 className="font-medium mb-3 text-gray-700">Ou copie o código PIX</h4>
                          <div className="bg-white p-3 md:p-4 rounded-lg border">
                            <div className="text-sm text-gray-600 mb-2">Código PIX:</div>
                            <div className="bg-gray-50 p-2 md:p-3 rounded text-xs font-mono break-all border max-h-24 md:max-h-none overflow-y-auto">
                              {pixData.copyPasteCode}
                            </div>
                            <CopyButton
                              textToCopy={pixData.copyPasteCode}
                              className="mt-3 w-full text-white py-2 px-4 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2"
                              style={{
                                background: 'var(--btn-cotacao-gratuita-bg)'
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      
                      
                    </div>
                  )}
                  
                  {/* Checkbox de Termos e Condições */}
                  <div className="flex items-center mt-6">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptedTermsConditions}
                        onChange={(e) => setAcceptedTermsConditions(e.target.checked)}
                        className="sr-only"
                      />
                      <div
                        className="relative w-5 h-5 rounded border mr-3 flex-shrink-0 transition-all duration-200"
                        style={{
                          borderColor: 'rgb(209 213 219)',
                          backgroundColor: acceptedTermsConditions ? '#277677' : '#FFFFFF'
                        }}
                      >
                        {acceptedTermsConditions && (
                          <svg
                            className="absolute inset-0 w-full h-full p-0.5"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M5 13l4 4L19 7"
                              stroke="white"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm text-gray-700">
                        Li e aceito os{' '}
                        <a href="/termos-e-condicoes" target="_blank" className="underline text-teal-600 hover:text-teal-700">
                          Termos e Condições
                        </a>
                      </span>
                    </label>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Navigation Buttons for Steps 2-4 */}
            <div className="flex flex-col xs:flex-row xs:justify-between gap-3 xs:gap-0 mt-8 pt-6 border-t">
              <button
                onClick={handlePrevStep}
                className="flex items-center justify-center w-full xs:w-auto px-6 py-3 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-transform duration-300 hover:scale-95"
              >
                <span className="flex items-center">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </span>
              </button>

              <button
                onClick={handleNextStep}
                disabled={
                  isLoading || 
                  (currentStep === 2 && (!isPetsDataValid() || !areAllPetsCollapsed())) ||
                  (currentStep === 3 && !isCustomerDataValid()) ||
                  (currentStep === 4 && !isPaymentDataValid())
                }
                className="flex items-center justify-center w-full xs:w-auto px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-transform duration-300 hover:scale-95"
                style={{
                  background: 'var(--btn-ver-planos-bg)',
                  color: 'var(--btn-ver-planos-text)',
                  border: 'none'
                }}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Processando...
                  </>
                ) : (
                  <>
                    <span className="flex items-center">
                      {currentStep === 4 ? 'Finalizar' : 'Próximo'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </span>
                  </>
                )}
              </button>
            </div>
            </div>
          )}
          </div>
        </div>
      </div>
      
      {/* Popup de Erro de Pagamento */}
      {paymentError.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{paymentError.title}</h3>
              </div>
            </div>
            
            <p className="text-gray-600 mb-6 leading-relaxed">
              {paymentError.message}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setPaymentError({ show: false, title: '', message: '' })}
                className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  setPaymentError({ show: false, title: '', message: '' });
                  // Voltar para o step de pagamento para correção
                  setCurrentStep(4);
                }}
                className="flex-1 px-4 py-2 text-white rounded-lg transition-colors"
                style={{
                  background: 'var(--btn-ver-planos-bg)',
                }}
              >
                Corrigir Dados
              </button>
            </div>
          </div>
        </div>
      )}
      
      <Footer />
    </>
  );
}