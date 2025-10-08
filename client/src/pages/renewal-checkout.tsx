import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { ArrowLeft } from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';

// Reutilizar tipos e utilitários do checkout principal
interface Plan {
  id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  image?: string;
  buttonText?: string;
  planType?: string;
  isActive?: boolean;
  displayOrder?: number;
  createdAt?: string;
}

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: string;
  weight: string;
}

interface ContractData {
  id: string;
  contractNumber: string;
  client: {
    id: string;
    name: string;
    email: string;
    phone: string;
    cpf?: string;
    address?: string;
    zipCode?: string;
    city?: string;
    state?: string;
    district?: string;
  };
  plan: Plan;
  pet: Pet;
  billingPeriod: 'monthly' | 'annual';
  monthlyAmount: string;
  annualAmount: string;
  status: string;
}

export default function RenewalCheckout() {
  const [, navigate] = useLocation();
  // Usar window.location.search para capturar os query parameters corretamente
  const urlParams = new URLSearchParams(window.location.search);
  const contractId = urlParams.get('contractId');

  // Estados principais
  const [isLoading, setIsLoading] = useState(true);
  const [contractData, setContractData] = useState<ContractData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Estados de pagamento
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'pix'>('credit');
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Estados do cartão
  const [cardData, setCardData] = useState({
    cardNumber: '',
    cardHolder: '',
    expirationDate: '',
    securityCode: ''
  });

  // Estados PIX
  const [pixQrCode, setPixQrCode] = useState<string | null>(null);
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [showPixResult, setShowPixResult] = useState(false);
  const [isPollingPayment, setIsPollingPayment] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  // Dados de endereço serão usados diretamente do cliente cadastrado

  // Função para verificar status do pagamento PIX (usando mesmo método do checkout)
  const checkPixPaymentStatus = async (paymentId: string) => {
    try {
      console.log('🔍 [PIX-POLLING] Verificando status do pagamento:', paymentId);
      
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
        console.log('📊 [PIX-POLLING] Status do pagamento:', result);
        
        // Verificar se o pagamento foi aprovado (status 'approved' = aprovado)
        // A API retorna {success: true, data: {mappedStatus: 'approved'}}
        if (result.success && result.data && result.data.mappedStatus === 'approved') {
          console.log('✅ [PIX-POLLING] Pagamento PIX confirmado!');
          setIsPollingPayment(false);
          toast.success('Pagamento confirmado! Redirecionando para área financeira...');
          
          // Aguardar um pouco antes do redirecionamento para mostrar a mensagem
          setTimeout(() => {
            navigate('/cliente/financeiro');
          }, 2000);
          
          return true;
        }
        
        return false;
      } else {
        console.error('❌ [PIX-POLLING] Erro na resposta:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ [PIX-POLLING] Erro ao verificar status:', error);
      return false;
    }
  };

  // Sistema de polling para verificar status do pagamento PIX
  useEffect(() => {
    if (!paymentId || !isPollingPayment || !showPixResult) {
      return;
    }

    console.log('🚀 Iniciando polling PIX para pagamento de renovação:', paymentId);
    
    // Captura o paymentId em uma variável local para evitar problemas de closure
    const currentPaymentId = paymentId;
    let checkCount = 0;
    
    const pollInterval = setInterval(async () => {
      checkCount++;
      console.log(`🔄 [${checkCount}] Verificando status do PIX para renovação: ${currentPaymentId}`);
      
      try {
        const isConfirmed = await checkPixPaymentStatus(currentPaymentId);
        console.log(`📊 [${checkCount}] Resultado da verificação PIX:`, isConfirmed);
        
        if (isConfirmed) {
          console.log('🎉 PIX RENOVAÇÃO APROVADO! Redirecionando para área financeira...');
          clearInterval(pollInterval);
          return;
        }
      } catch (error) {
        console.error('❌ Erro durante polling:', error);
      }
    }, 3000);

    // Verificação inicial
    setTimeout(async () => {
      try {
        const isConfirmed = await checkPixPaymentStatus(currentPaymentId);
        console.log('📊 Status inicial:', isConfirmed);
        
        if (isConfirmed) {
          console.log('🎉 PIX JÁ ESTAVA APROVADO! Redirecionando imediatamente...');
          clearInterval(pollInterval);
          return;
        }
      } catch (error) {
        console.error('❌ Erro na primeira verificação:', error);
      }
    }, 500);

    // Limpar polling após 10 minutos (600 segundos) para evitar polling infinito
    const timeout = setTimeout(() => {
      console.log('⏰ Timeout do polling PIX após 10 minutos');
      clearInterval(pollInterval);
    }, 600000);

    return () => {
      console.log('🧹 Limpando polling PIX de renovação...');
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [paymentId, isPollingPayment, showPixResult]);

  // Buscar dados do contrato
  useEffect(() => {
    const fetchContractData = async () => {
      if (!contractId) {
        setError('ID do contrato não encontrado');
        setIsLoading(false);
        return;
      }

      try {
        console.log('📋 [RENEWAL] Buscando dados do contrato:', contractId);
        
        // Buscar dados do contrato para renovação
        const response = await fetch(`/api/contracts/${contractId}/renewal`, {
          credentials: 'include' // Usar cookies de sessão ao invés de token JWT
        });

        if (!response.ok) {
          throw new Error('Erro ao buscar dados do contrato');
        }

        const data = await response.json();
        console.log('✅ [RENEWAL] Dados do contrato recebidos:', data);
        
        // A API retorna os dados dentro de renewalData
        const renewalData = data.renewalData || data;
        
        // Transformar os dados para o formato esperado
        const contractInfo = {
          id: renewalData.contractId || renewalData.id,
          contractNumber: renewalData.contractNumber,
          client: renewalData.client,
          plan: renewalData.plan || renewalData.plan,
          pet: renewalData.pet,
          billingPeriod: renewalData.billingPeriod || 'monthly',
          monthlyAmount: renewalData.amount?.toString() || renewalData.monthlyAmount || renewalData.plan?.price,
          annualAmount: renewalData.annualAmount || (renewalData.amount * 12)?.toString(),
          status: renewalData.status
        };
        
        setContractData(contractInfo);
        
        // Se tem billing period configurado, usar ele
        if (contractInfo.billingPeriod) {
          setBillingPeriod(contractInfo.billingPeriod);
        }

        // Dados do cliente já estão no contractInfo.client

      } catch (err) {
        console.error('❌ [RENEWAL] Erro ao buscar dados:', err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      } finally {
        setIsLoading(false);
      }
    };

    fetchContractData();
  }, [contractId]);

  // Função de processamento do pagamento
  const processRenewalPayment = async () => {
    if (!contractData) return;

    // Validações básicas - dados já vêm do cliente cadastrado

    if (paymentMethod === 'credit') {
      if (!cardData.cardNumber || !cardData.cardHolder || !cardData.expirationDate || !cardData.securityCode) {
        toast.error('Por favor, preencha todos os dados do cartão');
        return;
      }
    }

    try {
      setIsProcessingPayment(true);
      console.log('💳 [RENEWAL] Processando renovação...');

      // Usar o valor baseado no período escolhido (que agora vem do contrato)
      const amount = billingPeriod === 'monthly' 
        ? parseFloat(contractData.monthlyAmount || contractData.plan.price)
        : parseFloat(contractData.annualAmount || contractData.plan.price);

      const payload = {
        contractId: contractData.id,
        paymentMethod,
        billingPeriod,
        amount,
        clientData: {
          zipCode: contractData.client.zipCode || '',
          city: contractData.client.city || '',
          state: contractData.client.state || '',
          district: contractData.client.district || '',
          address: contractData.client.address || '',
          cpf: contractData.client.cpf || '',
          name: contractData.client.name,
          email: contractData.client.email,
          phone: contractData.client.phone
        },
        ...(paymentMethod === 'credit' && { cardData })
      };

      console.log('📤 [RENEWAL] Enviando payload:', payload);

      // Preparar dados no formato esperado pela API
      const checkoutPayload = {
        clientId: contractData.client.id,
        addressData: {
          cep: contractData.client.zipCode || '',
          address: contractData.client.address || '',
          number: '',
          complement: '',
          district: contractData.client.district || '',
          city: contractData.client.city || '',
          state: contractData.client.state || '',
          phone: contractData.client.phone
        },
        paymentData: {
          customer: {
            name: contractData.client.name,
            email: contractData.client.email,
            cpf: contractData.client.cpf || ''
          },
          payment: paymentMethod === 'credit' ? {
            type: 'CreditCard',
            installments: 1,
            card: {
              number: cardData.cardNumber,
              holder: cardData.cardHolder,
              expirationDate: cardData.expirationDate,
              securityCode: cardData.securityCode
            }
          } : undefined
        },
        planData: {
          planId: contractData.plan.id,
          billingPeriod: billingPeriod,
          pets: [{
            id: contractData.pet.id,
            name: contractData.pet.name,
            species: contractData.pet.species,
            breed: contractData.pet.breed,
            age: contractData.pet.age,
            weight: contractData.pet.weight
          }]
        },
        paymentMethod: paymentMethod === 'credit' ? 'credit_card' : 'pix',
        isRenewal: true,
        renewalContractId: contractId
      };

      console.log('📤 [RENEWAL] Enviando payload para checkout/process:', checkoutPayload);

      const response = await fetch('/api/checkout/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Usar cookies de sessão
        body: JSON.stringify(checkoutPayload)
      });

      const result = await response.json();
      console.log('📥 [RENEWAL] Resposta do servidor:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Erro no processamento do pagamento');
      }

      if (paymentMethod === 'pix') {
        setPixQrCode(result.payment.pixQrCode);
        setPixCode(result.payment.pixCode);
        setPaymentId(result.payment.paymentId); // Salvar paymentId para o polling
        setShowPixResult(true);
        setIsPollingPayment(true); // Iniciar polling após gerar PIX
        toast.success('QR Code PIX gerado! Escaneie para pagar. Verificando pagamento automaticamente...');
      } else {
        // Pagamento com cartão aprovado
        // Redirecionar imediatamente para customer/login com parâmetro para mostrar popup
        navigate('/cliente/login?payment_success=true');


      }

    } catch (error) {
      console.error('❌ [RENEWAL] Erro no pagamento:', error);
      toast.error(error instanceof Error ? error.message : 'Erro no processamento');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center" style={{background: '#FBF9F7'}}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{borderColor: 'var(--bg-teal-dark)'}}></div>
            <p style={{color: 'var(--text-dark-primary)'}}>Carregando dados da renovação...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center" style={{background: '#FBF9F7'}}>
          <div className="text-center max-w-md mx-auto p-6">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold mb-4" style={{color: 'var(--text-dark-primary)'}}>Ops! Algo deu errado</h2>
            <p className="mb-6" style={{color: 'var(--text-dark-secondary)'}}>{error}</p>
            <button
              onClick={() => navigate('/cliente/financeiro')}
              className="px-6 py-3 rounded-lg font-semibold"
              style={{background: 'var(--btn-ver-planos-bg)', color: 'var(--text-light)'}}
            >
              Voltar para Área Financeira
            </button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // PIX Result view
  if (showPixResult && pixQrCode) {
    return (
      <>
        <Header />
        <div className="min-h-screen" style={{background: '#FBF9F7'}}>
          <motion.div 
            className="container mx-auto px-4 pt-24 pb-12 max-w-4xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4" style={{color: 'var(--text-dark-primary)'}}>
                Pagamento via PIX
              </h2>
              <p style={{color: 'var(--text-dark-secondary)'}}>
                Escaneie o código QR ou copie o código PIX
              </p>
            </div>

            {/* Container PIX igual ao checkout */}
            <div 
              className="p-4 md:p-6 rounded-lg mb-6"
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
                      src={`data:image/png;base64,${pixQrCode}`}
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
                      {pixCode}
                    </div>
                    <CopyButton
                      textToCopy={pixCode || ''}
                      className="mt-3 w-full text-white py-2 px-4 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2"
                      style={{
                        background: 'var(--btn-cotacao-gratuita-bg)'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={() => navigate('/cliente/financeiro')}
                className="text-sm underline"
                style={{color: 'var(--text-dark-secondary)'}}
              >
                Voltar para Área Financeira
              </button>
            </div>
          </motion.div>
        </div>
        <Footer />
      </>
    );
  }

  // Main checkout view
  if (!contractData) return null;

  return (
    <>
      <Header />
      <div className="min-h-screen" style={{background: '#FBF9F7'}}>
        <motion.div 
          className="container mx-auto px-4 py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="max-w-6xl mx-auto">
            {/* Back Button */}
            <button
              onClick={() => navigate('/cliente/financeiro')}
              className="flex items-center gap-2 mb-6 px-4 py-2 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
              style={{color: 'var(--text-dark-primary)'}}
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para Área Financeira
            </button>

            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold mb-2" style={{color: 'var(--text-dark-primary)'}}>
                Renovação de Contrato
              </h1>
              <p style={{color: 'var(--text-dark-secondary)'}}>
                Contrato #{contractData.contractNumber}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Resumo do Contrato */}
              <div>
                <h2 className="text-xl font-bold mb-4" style={{color: 'var(--text-dark-primary)'}}>
                  Resumo da Renovação
                </h2>

                {/* Card do Plano */}
                <div className="bg-white rounded-lg p-6 shadow-sm mb-4">
                  <h3 className="font-semibold text-lg mb-2" style={{color: 'var(--text-dark-primary)'}}>
                    {contractData.plan.name}
                  </h3>
                  
                  {/* Pet Info */}
                  <div className="mb-4 p-3 bg-gray-50 rounded">
                    <p className="text-sm font-medium" style={{color: 'var(--text-dark-secondary)'}}>
                      Pet: {contractData.pet.name}
                    </p>
                    <p className="text-xs" style={{color: 'var(--text-dark-tertiary)'}}>
                      {contractData.pet.species} • {contractData.pet.breed}
                    </p>
                  </div>

                  {/* Billing Info - sem seletor, apenas mostra o configurado */}
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2" style={{color: 'var(--text-dark-secondary)'}}>
                      Período de Cobrança
                    </p>
                    <div 
                      className="p-3 border rounded"
                      style={{
                        backgroundColor: 'rgba(39, 118, 119, 0.1)',
                        borderColor: '#277677'
                      }}
                    >
                      <p className="font-semibold" style={{color: 'var(--text-dark-primary)'}}>
                        {billingPeriod === 'monthly' ? 'Mensal' : 'Anual'}
                      </p>
                    </div>
                  </div>

                  {/* Valor a ser pago */}
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2" style={{color: 'var(--text-dark-secondary)'}}>
                      Valor a ser pago
                    </p>
                    <div 
                      className="p-3 border rounded"
                      style={{
                        backgroundColor: 'rgba(39, 118, 119, 0.05)',
                        borderColor: '#277677'
                      }}
                    >
                      <p className="text-2xl font-bold" style={{color: '#277677'}}>
                        R$ {(billingPeriod === 'monthly' 
                          ? parseFloat(contractData.monthlyAmount || contractData.plan.price)
                          : parseFloat(contractData.annualAmount || contractData.plan.price)
                        ).toFixed(2).replace('.', ',')}
                      </p>
                      <p className="text-xs mt-1" style={{color: 'var(--text-dark-tertiary)'}}>
                        {billingPeriod === 'monthly' ? 'Pagamento mensal' : 'Pagamento anual'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Features do Plano */}
                {contractData.plan.features && contractData.plan.features.length > 0 && (
                  <div className="bg-white rounded-lg p-6 shadow-sm">
                    <h3 className="font-semibold mb-3" style={{color: 'var(--text-dark-primary)'}}>
                      Benefícios Inclusos
                    </h3>
                    <ul className="space-y-2">
                      {contractData.plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start">
                          <span className="mr-2" style={{color: 'var(--accent-teal)'}}>✓</span>
                          <span className="text-sm" style={{color: 'var(--text-dark-secondary)'}}>
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Formulário de Pagamento */}
              <div>
                <h2 className="text-xl font-bold mb-4" style={{color: 'var(--text-dark-primary)'}}>
                  Dados de Pagamento
                </h2>

                {/* Método de Pagamento */}
                <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
                  <h3 className="font-semibold mb-4" style={{color: 'var(--text-dark-primary)'}}>
                    Forma de Pagamento
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div 
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        paymentMethod === 'credit' 
                          ? 'border-teal-600 bg-teal-50' 
                          : 'border-gray-200 hover:border-teal-300'
                      }`}
                      onClick={() => setPaymentMethod('credit')}
                    >
                      <div className="flex items-center space-x-3">
                        <div 
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            paymentMethod === 'credit' 
                              ? 'border-gray-300' 
                              : 'border-gray-300'
                          }`}
                          style={paymentMethod === 'credit' ? {
                            borderColor: '#277677',
                            backgroundColor: '#277677'
                          } : {}}
                        >
                          {paymentMethod === 'credit' && <div className="w-3 h-3 bg-white rounded-full"></div>}
                        </div>
                        <div>
                          <h3 className="font-medium">Cartão de Crédito</h3>
                          <p className="text-sm text-gray-600">Visa, Mastercard, Elo</p>
                        </div>
                      </div>
                    </div>
                    
                    <div 
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        paymentMethod === 'pix' 
                          ? 'border-teal-600 bg-teal-50' 
                          : 'border-gray-200 hover:border-teal-300'
                      }`}
                      onClick={() => setPaymentMethod('pix')}
                    >
                      <div className="flex items-center space-x-3">
                        <div 
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            paymentMethod === 'pix' 
                              ? 'border-gray-300' 
                              : 'border-gray-300'
                          }`}
                          style={paymentMethod === 'pix' ? {
                            borderColor: '#277677',
                            backgroundColor: '#277677'
                          } : {}}
                        >
                          {paymentMethod === 'pix' && <div className="w-3 h-3 bg-white rounded-full"></div>}
                        </div>
                        <div>
                          <h3 className="font-medium">PIX</h3>
                          <p className="text-sm text-gray-600">Pagamento instantâneo</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Campos do Cartão */}
                  {paymentMethod === 'credit' && (
                    <div className="space-y-4 pt-4">
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-dark-secondary)'}}>
                          Número do Cartão
                        </label>
                        <input
                          type="text"
                          value={cardData.cardNumber}
                          onChange={(e) => setCardData({...cardData, cardNumber: e.target.value})}
                          placeholder="0000 0000 0000 0000"
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-dark-secondary)'}}>
                          Nome no Cartão
                        </label>
                        <input
                          type="text"
                          value={cardData.cardHolder}
                          onChange={(e) => setCardData({...cardData, cardHolder: e.target.value})}
                          placeholder="Nome como está no cartão"
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-dark-secondary)'}}>
                            Validade
                          </label>
                          <input
                            type="text"
                            value={cardData.expirationDate}
                            onChange={(e) => setCardData({...cardData, expirationDate: e.target.value})}
                            placeholder="MM/AA"
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-dark-secondary)'}}>
                            CVV
                          </label>
                          <input
                            type="text"
                            value={cardData.securityCode}
                            onChange={(e) => setCardData({...cardData, securityCode: e.target.value})}
                            placeholder="000"
                            className="w-full px-3 py-2 border rounded-lg"
                            maxLength={4}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Botão de Pagamento */}
                <button
                  onClick={processRenewalPayment}
                  disabled={isProcessingPayment}
                  className="w-full py-4 rounded-lg font-semibold transition-colors"
                  style={{
                    background: isProcessingPayment ? '#ccc' : 'var(--btn-ver-planos-bg)',
                    color: 'var(--text-light)'
                  }}
                >
                  {isProcessingPayment ? (
                    <span className="flex items-center justify-center">
                      <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>
                      Processando...
                    </span>
                  ) : (
                    'Renovar Contrato'
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      <Footer />
    </>
  );
}
