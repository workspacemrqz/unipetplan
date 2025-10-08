import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { ArrowLeft, CreditCard, QrCodeIcon } from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';

interface InstallmentData {
  id: string;
  contractId: string;
  contractNumber: string;
  installmentNumber: number;
  dueDate: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
  petName: string;
  planName: string;
  status: string;
  daysOverdue?: number;
  daysUntilDue?: number;
}

export default function InstallmentPayment() {
  const [, navigate] = useLocation();
  const urlParams = new URLSearchParams(window.location.search);
  const installmentId = urlParams.get('installmentId');

  // Estados principais
  const [isLoading, setIsLoading] = useState(true);
  const [installmentData, setInstallmentData] = useState<InstallmentData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Estados de pagamento
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'pix'>('credit');
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

  // Estados do cupom
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // Buscar dados da mensalidade
  useEffect(() => {
    const fetchInstallmentData = async () => {
      if (!installmentId) {
        setError('ID da mensalidade não encontrado');
        setIsLoading(false);
        return;
      }

      try {
        // Buscar todas as mensalidades e filtrar pela ID
        const response = await fetch('/api/customer/installments', {
          credentials: 'include'
        });

        if (!response.ok) {
          if (response.status === 401) {
            navigate('/cliente/login');
            return;
          }
          throw new Error('Erro ao carregar dados da mensalidade');
        }

        const data = await response.json();
        
        // Procurar a mensalidade específica em todas as categorias
        let foundInstallment = null;
        
        // Verificar mensalidades atuais
        if (data.current) {
          foundInstallment = data.current.find((inst: InstallmentData) => inst.id === installmentId);
        }
        
        // Verificar mensalidades atrasadas
        if (!foundInstallment && data.overdue) {
          foundInstallment = data.overdue.find((inst: InstallmentData) => inst.id === installmentId);
        }
        
        if (!foundInstallment) {
          setError('Mensalidade não encontrada ou já foi paga');
          setIsLoading(false);
          return;
        }

        setInstallmentData(foundInstallment);
        setIsLoading(false);
      } catch (err) {
        console.error('Erro ao buscar dados da mensalidade:', err);
        setError('Erro ao carregar dados da mensalidade');
        setIsLoading(false);
      }
    };

    fetchInstallmentData();
  }, [installmentId, navigate]);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Função para calcular o valor final com desconto do cupom
  const calculateFinalAmount = (): number => {
    if (!installmentData) return 0;
    
    let amount = installmentData.amount;
    
    if (appliedCoupon) {
      if (appliedCoupon.type === 'percentage') {
        const discount = amount * (Number(appliedCoupon.value) / 100);
        amount = amount - discount;
      } else {
        // Desconto fixo
        amount = Math.max(0, amount - Number(appliedCoupon.value));
      }
    }
    
    return amount;
  };

  // Funções do cupom (idênticas ao checkout)
  const handleApplyCoupon = async (e?: React.MouseEvent | React.FormEvent) => {
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
        toast.success('Cupom aplicado com sucesso!');
      } else {
        setCouponError(data.error || 'Cupom inválido');
        setAppliedCoupon(null);
      }
    } catch (error) {
      console.error('Error validating coupon:', error);
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
    toast.success('Cupom removido');
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\s/g, '');
    value = value.replace(/[^\d]/g, '');
    value = value.slice(0, 16);
    
    let formatted = '';
    for (let i = 0; i < value.length; i++) {
      if (i > 0 && i % 4 === 0) {
        formatted += ' ';
      }
      formatted += value[i];
    }
    
    setCardData({
      ...cardData,
      cardNumber: formatted
    });
  };

  const handleExpirationDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^\d]/g, '');
    value = value.slice(0, 4);
    
    if (value.length >= 2) {
      value = value.slice(0, 2) + '/' + value.slice(2);
    }
    
    setCardData({
      ...cardData,
      expirationDate: value
    });
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🚀 [PAYMENT] Iniciando processamento de pagamento', {
      installmentId: installmentData?.id,
      installmentStatus: installmentData?.status,
      paymentMethod,
      coupon: appliedCoupon ? appliedCoupon.code : 'none'
    });
    
    if (!installmentData) {
      console.error('❌ [PAYMENT] Dados da mensalidade não encontrados');
      toast.error('Erro: Dados da mensalidade não encontrados');
      return;
    }

    setIsProcessingPayment(true);

    try {
      const finalAmount = calculateFinalAmount();
      const paymentData = {
        installmentId: installmentData.id,
        contractId: installmentData.contractId,
        amount: finalAmount,
        originalAmount: installmentData.amount,
        paymentMethod,
        coupon: appliedCoupon?.code || null,
        payment: paymentMethod === 'credit' ? {
          creditCard: {
            cardNumber: cardData.cardNumber.replace(/\s/g, ''),
            holder: cardData.cardHolder,
            expirationDate: cardData.expirationDate,
            securityCode: cardData.securityCode,
            brand: detectCardBrand(cardData.cardNumber)
          }
        } : undefined
      };

      const response = await fetch('/api/checkout/installment-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(paymentData)
      });

      const result = await response.json();
      
      console.log('💳 [PAYMENT] Resposta do pagamento:', { 
        status: response.status, 
        ok: response.ok, 
        result 
      });

      if (response.ok) {
        if (paymentMethod === 'pix') {
          // Exibir QR Code PIX
          setPixQrCode(result.pixQrCode);
          setPixCode(result.pixCode);
          setShowPixResult(true);
          setIsPollingPayment(true);
          
          // Iniciar polling para verificar status do pagamento
          pollPaymentStatus(result.paymentId);
        } else {
          // Pagamento com cartão aprovado - redirecionar para página financeira
          // O popup de sucesso será mostrado na página de destino
          setTimeout(() => {
            window.location.href = '/cliente/financeiro?payment_success=true';
          }, 500);
        }
      } else {
        // Log detalhado do erro
        console.error('❌ [PAYMENT] Erro ao processar pagamento:', {
          status: response.status,
          error: result.error,
          fullResult: result
        });
        
        // Mostrar mensagem de erro clara
        const errorMessage = result.error || 'Erro ao processar pagamento';
        toast.error(errorMessage, {
          duration: 5000,
          description: 'Verifique os dados do cartão e tente novamente.'
        });
      }
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      toast.error('Erro ao processar pagamento. Tente novamente.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Função para verificar status do PIX - similar ao checkout
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
        
        console.log('🔍 [PAYMENT] Status do pagamento:', { mappedStatus });
        
        // Lógica simplificada: apenas mappedStatus
        // pending = aguardando pagamento
        // approved = aprovado, pode redirecionar
        const isApproved = mappedStatus === 'approved';
        
        console.log('🔍 [PAYMENT] Verificação de aprovação:', {
          mappedStatus,
          isApproved
        });
        
        // Log quando aprovado
        if (isApproved) {
          console.log('✅ PIX aprovado! Status:', { mappedStatus });
        }
        
        return isApproved;
      } else {
        console.log('❌ [PAYMENT] Resposta da API não foi OK:', response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.error('❌ [PAYMENT] Erro ao verificar status PIX:', error);
      return false;
    }
  };

  const pollPaymentStatus = async (paymentId: string) => {
    console.log('🚀 Iniciando polling PIX para pagamento:', paymentId);
    
    let checkCount = 0;
    let isRedirecting = false; // Flag para prevenir redirecionamentos duplicados
    
    const pollInterval = setInterval(async () => {
      checkCount++;
      console.log(`🔄 [${checkCount}] Verificando status do PIX para payment: ${paymentId}`);
      
      try {
        const isConfirmed = await checkPixPaymentStatus(paymentId);
        console.log(`📊 [${checkCount}] Resultado da verificação PIX:`, isConfirmed);
        
        if (isConfirmed && !isRedirecting) {
          isRedirecting = true; // Marcar que estamos redirecionando
          console.log('🎉 PIX APROVADO! Redirecionando para área financeira...');
          clearInterval(pollInterval);
          setIsPollingPayment(false);
          
          // Redirecionar para página financeira com sucesso
          // O popup de sucesso será mostrado na página de destino
          setTimeout(() => {
            console.log('🚪 Executando redirecionamento...');
            window.location.href = '/cliente/financeiro?payment_success=true';
          }, 500);
        }
      } catch (error) {
        console.error(`❌ [${checkCount}] Erro durante verificação do PIX:`, error);
      }
    }, 3000); // Verificar a cada 3 segundos

    // Fazer primeira verificação imediatamente
    setTimeout(async () => {
      console.log('🔍 Primeira verificação imediata...');
      try {
        const isConfirmed = await checkPixPaymentStatus(paymentId);
        console.log('📊 Status inicial:', isConfirmed);
        
        if (isConfirmed && !isRedirecting) {
          isRedirecting = true; // Marcar que estamos redirecionando
          console.log('🎉 PIX JÁ ESTAVA APROVADO! Redirecionando imediatamente...');
          clearInterval(pollInterval);
          setIsPollingPayment(false);
          
          // Forçar redirecionamento
          // O popup de sucesso será mostrado na página de destino
          setTimeout(() => {
            console.log('🚪 Executando redirecionamento imediato...');
            window.location.href = '/cliente/financeiro?payment_success=true';
          }, 100);
        }
      } catch (error) {
        console.error('❌ Erro na primeira verificação:', error);
      }
    }, 500);

    // Limpar polling após 10 minutos (600 segundos) para evitar polling infinito
    const timeout = setTimeout(() => {
      if (!isRedirecting) {
        console.log('⏰ Timeout do polling PIX após 10 minutos');
        clearInterval(pollInterval);
        setIsPollingPayment(false);
        toast.error('Tempo limite para pagamento expirado');
      }
    }, 600000);

    // Guardar referências para limpeza se necessário
    return () => {
      console.log('🧹 Limpando polling PIX...');
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  };

  const detectCardBrand = (cardNumber: string): string => {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    if (cleanNumber.startsWith('4')) return 'Visa';
    if (/^5[1-5]/.test(cleanNumber)) return 'Mastercard';
    if (cleanNumber.startsWith('34') || cleanNumber.startsWith('37')) return 'Amex';
    if (cleanNumber.startsWith('6011') || cleanNumber.startsWith('65')) return 'Discover';
    if (cleanNumber.startsWith('35')) return 'JCB';
    if (cleanNumber.startsWith('30') || cleanNumber.startsWith('36') || cleanNumber.startsWith('38')) return 'Diners';
    return 'Unknown';
  };

  // Loading state
  if (isLoading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center" style={{background: '#FBF9F7'}}>
          <div className="text-center">
            <div className="w-8 h-8 border-4 rounded-full animate-spin mx-auto mb-4" 
              style={{borderColor: 'var(--text-teal)', borderTopColor: 'transparent'}}></div>
            <p style={{color: 'var(--text-dark-secondary)'}}>Carregando dados da mensalidade...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // Error state
  if (error || !installmentData) {
    return (
      <>
        <Header />
        <div className="min-h-screen" style={{background: '#FBF9F7'}}>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="container mx-auto px-4 py-16 text-center"
          >
            <h1 className="text-2xl font-bold mb-4" style={{color: 'var(--text-dark-primary)'}}>
              Erro ao carregar mensalidade
            </h1>
            <p className="mb-8" style={{color: 'var(--text-dark-secondary)'}}>
              {error || 'Mensalidade não encontrada'}
            </p>
            <button
              onClick={() => navigate('/cliente/financeiro')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg transition-colors"
              style={{
                background: 'var(--btn-ver-planos-bg)',
                color: 'var(--btn-ver-planos-text)'
              }}
            >
              <ArrowLeft className="w-5 h-5" />
              Voltar para Área Financeira
            </button>
          </motion.div>
        </div>
        <Footer />
      </>
    );
  }

  // PIX Result View
  if (showPixResult) {
    return (
      <>
        <Header />
        <div className="min-h-screen pt-24 pb-16" style={{background: '#FBF9F7'}}>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="container mx-auto px-4"
          >
            <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl p-8 md:p-12">
              <h2 className="text-3xl font-bold mb-8 text-center" style={{color: 'var(--text-dark-primary)'}}>
                Pagamento via PIX
              </h2>
              
              <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-start">
                {/* QR Code Section */}
                {pixQrCode && (
                  <div className="flex flex-col items-center justify-center mx-auto md:mx-0">
                    <div className="bg-white p-6 rounded-2xl shadow-md border-2" style={{borderColor: 'var(--border-gray)'}}>
                      <img 
                        src={`data:image/png;base64,${pixQrCode}`} 
                        alt="QR Code PIX" 
                        className="w-72 h-auto aspect-square object-contain"
                      />
                    </div>
                    <p className="text-sm mt-4 text-center" style={{color: 'var(--text-dark-secondary)'}}>
                      Escaneie o QR Code<br className="md:hidden" /> com o app do seu banco
                    </p>
                  </div>
                )}
                
                {/* PIX Code and Instructions Section */}
                <div className="flex flex-col justify-center space-y-6 mx-auto md:mx-0 w-full max-w-md md:max-w-none">
                  {pixCode && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 text-center md:text-left" style={{color: 'var(--text-dark-primary)'}}>
                        Ou copie o código PIX
                      </h3>
                      <div className="p-4 rounded-xl border-2" style={{background: 'var(--bg-cream-light)', borderColor: 'var(--border-gray)'}}>
                        <div className="flex flex-col gap-3">
                          <textarea
                            value={pixCode}
                            readOnly
                            rows={4}
                            className="w-full p-3 text-xs rounded-lg border-0 bg-white font-mono resize-none break-all"
                            style={{color: 'var(--text-dark-primary)', wordBreak: 'break-all'}}
                          />
                          <CopyButton
                            textToCopy={pixCode}
                            className="mt-3 w-full text-white py-2 px-4 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2"
                            style={{
                              background: 'var(--btn-cotacao-gratuita-bg)'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    <div className="p-5 rounded-xl" style={{background: 'var(--bg-cream-light)'}}>
                      {isPollingPayment ? (
                        <div className="flex items-center gap-3">
                          <span className="w-5 h-5 border-2 rounded-full animate-spin flex-shrink-0" 
                            style={{borderColor: 'var(--text-teal)', borderTopColor: 'transparent'}}></span>
                          <p className="text-sm" style={{color: 'var(--text-dark-primary)'}}>
                            Aguardando confirmação do pagamento...
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm" style={{color: 'var(--text-dark-secondary)'}}>
                          Após efetuar o pagamento, você será redirecionado automaticamente
                        </p>
                      )}
                    </div>
                    
                    <button
                      onClick={() => navigate('/cliente/financeiro')}
                      className="w-full px-6 py-3 rounded-xl transition-all duration-300 hover:opacity-90 font-medium"
                      style={{
                        background: 'var(--btn-cancelar-bg)',
                        color: 'var(--btn-cancelar-text)'
                      }}
                    >
                      Voltar para Área Financeira
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen" style={{background: '#FBF9F7'}}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="container mx-auto px-4 py-8"
        >
          <button
            onClick={() => navigate('/cliente/financeiro')}
            className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-lg transition-colors hover:bg-gray-100"
            style={{color: 'var(--text-dark-secondary)'}}
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Resumo da Mensalidade */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4" style={{color: 'var(--text-dark-primary)'}}>
                Resumo da Mensalidade
              </h2>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-3 border-b" style={{borderColor: 'var(--border-gray)'}}>
                  <span style={{color: 'var(--text-dark-secondary)'}}>Pet:</span>
                  <span className="font-medium" style={{color: 'var(--text-dark-primary)'}}>
                    {installmentData.petName}
                  </span>
                </div>
                
                <div className="flex justify-between items-center pb-3 border-b" style={{borderColor: 'var(--border-gray)'}}>
                  <span style={{color: 'var(--text-dark-secondary)'}}>Plano:</span>
                  <span className="font-medium" style={{color: 'var(--text-dark-primary)'}}>
                    {installmentData.planName}
                  </span>
                </div>
                
                <div className="flex justify-between items-center pb-3 border-b" style={{borderColor: 'var(--border-gray)'}}>
                  <span style={{color: 'var(--text-dark-secondary)'}}>Parcela:</span>
                  <span className="font-medium" style={{color: 'var(--text-dark-primary)'}}>
                    #{installmentData.installmentNumber}
                  </span>
                </div>
                
                <div className="flex justify-between items-center pb-3 border-b" style={{borderColor: 'var(--border-gray)'}}>
                  <span style={{color: 'var(--text-dark-secondary)'}}>Período:</span>
                  <span className="font-medium" style={{color: 'var(--text-dark-primary)'}}>
                    {formatDate(installmentData.periodStart)} - {formatDate(installmentData.periodEnd)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center pb-3 border-b" style={{borderColor: 'var(--border-gray)'}}>
                  <span style={{color: 'var(--text-dark-secondary)'}}>Vencimento:</span>
                  <span className="font-medium" style={{color: installmentData.daysOverdue ? '#dc2626' : 'var(--text-dark-primary)'}}>
                    {formatDate(installmentData.dueDate)}
                    {installmentData.daysOverdue && ` (${installmentData.daysOverdue} dias atraso)`}
                    {installmentData.daysUntilDue && installmentData.daysUntilDue > 0 && ` (${installmentData.daysUntilDue} dias)`}
                  </span>
                </div>
                
                <div className="flex justify-between items-center pt-3">
                  <span className="font-bold text-lg" style={{color: 'var(--text-dark-primary)'}}>
                    Valor Total:
                  </span>
                  <span className="font-bold text-2xl" style={{color: 'var(--text-teal)'}}>
                    {formatCurrency(installmentData.amount)}
                  </span>
                </div>
                
                {/* Mostrar valor com desconto se cupom aplicado */}
                {appliedCoupon && (
                  <div className="flex justify-between items-center pt-2 border-t" style={{borderColor: 'var(--border-gray)'}}>
                    <span className="text-sm" style={{color: 'var(--text-dark-secondary)'}}>
                      Desconto ({appliedCoupon.code}):
                    </span>
                    <span className="text-sm font-medium" style={{color: '#16a34a'}}>
                      -{appliedCoupon.type === 'percentage' 
                        ? `${appliedCoupon.value}%` 
                        : formatCurrency(Number(appliedCoupon.value))}
                    </span>
                  </div>
                )}
                
                {appliedCoupon && (
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-bold text-lg" style={{color: 'var(--text-dark-primary)'}}>
                      Total com Desconto:
                    </span>
                    <span className="font-bold text-2xl" style={{color: '#16a34a'}}>
                      {formatCurrency(calculateFinalAmount())}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Campo de cupom de desconto */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4">
                <label className="block text-sm font-medium mb-3" style={{color: 'var(--text-dark-primary)'}}>
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
                      className="w-full unipet-button-primary text-base py-2 text-white rounded-lg transition-transform duration-300 hover:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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
            </div>

            {/* Formulário de Pagamento */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4" style={{color: 'var(--text-dark-primary)'}}>
                Forma de Pagamento
              </h2>

              {/* Seletor de Método de Pagamento */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => setPaymentMethod('credit')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    paymentMethod === 'credit' ? 'border-teal-600' : 'border-gray-200'
                  }`}
                  style={{
                    background: paymentMethod === 'credit' ? 'var(--bg-cream-light)' : 'white'
                  }}
                >
                  <CreditCard className="w-6 h-6 mx-auto mb-2" 
                    style={{color: paymentMethod === 'credit' ? 'var(--text-teal)' : 'var(--text-dark-secondary)'}} />
                  <span style={{color: 'var(--text-dark-primary)'}}>Cartão de Crédito</span>
                </button>
                
                <button
                  onClick={() => setPaymentMethod('pix')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    paymentMethod === 'pix' ? 'border-teal-600' : 'border-gray-200'
                  }`}
                  style={{
                    background: paymentMethod === 'pix' ? 'var(--bg-cream-light)' : 'white'
                  }}
                >
                  <QrCodeIcon className="w-6 h-6 mx-auto mb-2" 
                    style={{color: paymentMethod === 'pix' ? 'var(--text-teal)' : 'var(--text-dark-secondary)'}} />
                  <span style={{color: 'var(--text-dark-primary)'}}>PIX</span>
                </button>
              </div>

              <form onSubmit={handlePaymentSubmit}>
                {paymentMethod === 'credit' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-dark-primary)'}}>
                        Número do Cartão
                      </label>
                      <input
                        type="text"
                        value={cardData.cardNumber}
                        onChange={handleCardNumberChange}
                        placeholder="0000 0000 0000 0000"
                        maxLength="19"
                        required
                        className="w-full px-4 py-2 border rounded-lg"
                        style={{borderColor: 'var(--border-gray)'}}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-dark-primary)'}}>
                        Nome do Titular
                      </label>
                      <input
                        type="text"
                        value={cardData.cardHolder}
                        onChange={(e) => setCardData({...cardData, cardHolder: e.target.value.toUpperCase()})}
                        placeholder="NOME COMO NO CARTÃO"
                        required
                        className="w-full px-4 py-2 border rounded-lg uppercase"
                        style={{borderColor: 'var(--border-gray)'}}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-dark-primary)'}}>
                          Validade
                        </label>
                        <input
                          type="text"
                          value={cardData.expirationDate}
                          onChange={handleExpirationDateChange}
                          placeholder="MM/AA"
                          maxLength="5"
                          required
                          className="w-full px-4 py-2 border rounded-lg"
                          style={{borderColor: 'var(--border-gray)'}}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-dark-primary)'}}>
                          CVV
                        </label>
                        <input
                          type="text"
                          value={cardData.securityCode}
                          onChange={(e) => setCardData({...cardData, securityCode: e.target.value.replace(/[^\d]/g, '').slice(0, 4)})}
                          placeholder="000"
                          maxLength="4"
                          required
                          className="w-full px-4 py-2 border rounded-lg"
                          style={{borderColor: 'var(--border-gray)'}}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === 'pix' && (
                  <div className="p-4 rounded-lg" style={{background: 'var(--bg-cream-light)'}}>
                    <QrCodeIcon className="w-12 h-12 mx-auto mb-3" style={{color: 'var(--text-teal)'}} />
                    <p className="text-center" style={{color: 'var(--text-dark-secondary)'}}>
                      Ao clicar em "Pagar com PIX", será gerado um QR Code para pagamento.
                      O código tem validade de 30 minutos.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isProcessingPayment}
                  className="w-full mt-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                  style={{
                    background: isProcessingPayment ? 'var(--text-dark-secondary)' : 'var(--btn-ver-planos-bg)',
                    color: 'white'
                  }}
                >
                  {isProcessingPayment ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 rounded-full animate-spin" 
                        style={{borderColor: 'white', borderTopColor: 'transparent'}}></span>
                      Processando...
                    </span>
                  ) : (
                    'Pagar'
                  )}
                </button>
              </form>
            </div>
          </div>
        </motion.div>
      </div>
      <Footer />
    </>
  );
}