import { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, XCircle, Clock, Download } from "lucide-react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import confetti from "canvas-confetti";
import { useAuth } from "@/contexts/AuthContext";

interface Contract {
  id: string;
  contractNumber: string;
  status: string;
  originalStatus: string;
  startDate: string;
  endDate?: string;
  monthlyAmount: string;
  annualAmount?: string;
  planName: string;
  petName: string;
  planId?: string;
  petId?: string;
  billingPeriod?: string;
  isOverdue: boolean;
  daysPastDue: number;
  nextDueDate?: string | null;
  gracePeriodEnds?: string | null;
  statusReason: string;
  statusDescription: string;
  actionRequired?: string | null;
  expirationDate: string | null;
  daysRemaining: number;
  isExpired: boolean;
}

interface Installment {
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
  petId: string;
  planId: string;
  billingPeriod: string;
  status: 'paid' | 'current' | 'overdue';
  paidAt?: string;
  paymentMethod?: string;
  receiptId?: string;
  daysUntilDue?: number;
  daysOverdue?: number;
  paidAmount?: number; // Actual amount paid (may include discounts)
}

interface InstallmentsData {
  paid: Installment[];
  current: Installment[];
  overdue: Installment[];
  summary: {
    totalPaid: number;
    totalCurrent: number;
    totalOverdue: number;
  };
}

export default function CustomerFinancial() {
  const [, navigate] = useLocation();
  const { client, isLoading: authLoading, error: authError } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [installments, setInstallments] = useState<InstallmentsData>({
    paid: [],
    current: [],
    overdue: [],
    summary: {
      totalPaid: 0,
      totalCurrent: 0,
      totalOverdue: 0
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPet, setSelectedPet] = useState<string>('');
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null);
  const [showPaymentSuccessPopup, setShowPaymentSuccessPopup] = useState(false);
  const [shouldRefreshData, setShouldRefreshData] = useState(false);
  const [pendingPaymentSuccess, setPendingPaymentSuccess] = useState(false);
  const [shouldShowConfetti, setShouldShowConfetti] = useState(false);

  // Check for payment success parameter on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentSuccessParam = urlParams.get('payment_success');
    
    // Check if we already showed the popup for this payment session
    const popupAlreadyShown = sessionStorage.getItem('payment_popup_shown');
    
    if (paymentSuccessParam === 'true' && !popupAlreadyShown) {
      // Mark popup as shown to prevent duplicates
      sessionStorage.setItem('payment_popup_shown', 'true');
      
      // Store that we need to show the popup, but don't show it yet
      setPendingPaymentSuccess(true);
      setShouldShowConfetti(true); // Only trigger confetti for new payments
      
      // Add a small delay before refreshing data to ensure backend has processed the payment
      setTimeout(() => {
        setShouldRefreshData(true);
      }, 500);
      
      // Remove the parameter from URL without reload
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
      // Clear the flag after 5 seconds to allow new payment successes
      setTimeout(() => {
        sessionStorage.removeItem('payment_popup_shown');
      }, 5000);
    }
  }, []);

  // Trigger confetti ONLY when it's a new payment (not when downloading receipts)
  useEffect(() => {
    if (showPaymentSuccessPopup && shouldShowConfetti) {
      // Wait for popup animation to complete (300ms) plus a small delay
      const confettiTimer = setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#14b8a6', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899']
        });
        setShouldShowConfetti(false); // Reset flag after showing confetti
      }, 400); // Reduced from 600ms to 400ms (300ms animation + 100ms delay)
      
      return () => clearTimeout(confettiTimer);
    }
    return undefined;
  }, [showPaymentSuccessPopup, shouldShowConfetti]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !client && !authError) {
      navigate('/cliente/login');
    }
  }, [authLoading, client, authError, navigate]);

  useEffect(() => {
    const loadFinancialData = async () => {
      // Only load data if authenticated
      if (authLoading || !client) {
        return;
      }

      try {
        // If refreshing data after payment, set loading state
        if (shouldRefreshData) {
          setIsLoading(true);
        }

        const contractsResponse = await fetch('/api/clients/contracts', {
          credentials: 'include'
        });

        if (contractsResponse.ok) {
          const contractsResult = await contractsResponse.json();
          setContracts(contractsResult.contracts || []);
        } else if (contractsResponse.status === 401) {
          navigate('/cliente/login');
          return;
        } else {
          console.error('Error loading contracts:', contractsResponse.status, contractsResponse.statusText);
          setError(`Erro ao carregar contratos: ${contractsResponse.statusText}`);
        }

        // Load installments (mensalidades) - force cache refresh
        const timestamp = Date.now();
        const installmentsResponse = await fetch(`/api/customer/installments?t=${timestamp}`, {
          credentials: 'include',
          cache: 'no-cache', // Force fresh data from server
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });

        if (installmentsResponse.ok) {
          const installmentsResult = await installmentsResponse.json();
          console.log('Installments loaded:', {
            paid: installmentsResult.paid?.length || 0,
            current: installmentsResult.current?.length || 0,
            overdue: installmentsResult.overdue?.length || 0
          });
          setInstallments(installmentsResult);
        } else {
          console.error('Error loading installments:', installmentsResponse.status);
          // Retry once after a delay if error occurred
          if (shouldRefreshData && installmentsResponse.status >= 500) {
            setTimeout(async () => {
              const retryResponse = await fetch(`/api/customer/installments?t=${Date.now()}`, {
                credentials: 'include',
                cache: 'no-cache'
              });
              if (retryResponse.ok) {
                const retryResult = await retryResponse.json();
                console.log('Retry successful - Installments loaded:', {
                  paid: retryResult.paid?.length || 0,
                  current: retryResult.current?.length || 0,
                  overdue: retryResult.overdue?.length || 0
                });
                setInstallments(retryResult);
              }
            }, 1000);
          }
        }

        // Reset refresh flag after successful load
        if (shouldRefreshData) {
          setShouldRefreshData(false);
        }

      } catch (error) {
        console.error('Error loading financial data:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        setError(`Erro ao carregar dados financeiros: ${errorMessage}`);
      } finally {
        setIsLoading(false);
        
        // Show payment success popup only after page has fully loaded
        if (pendingPaymentSuccess) {
          setTimeout(() => {
            setShowPaymentSuccessPopup(true);
            setPendingPaymentSuccess(false);
          }, 300); // Small delay to ensure UI is ready
        }
      }
    };

    loadFinancialData();
  }, [authLoading, client, shouldRefreshData, pendingPaymentSuccess]);

  const uniquePets = useMemo(() => {
    const petsMap = new Map<string, { id: string, name: string }>();
    
    contracts.forEach(contract => {
      if (contract.petId && contract.petName && !petsMap.has(contract.petId)) {
        petsMap.set(contract.petId, {
          id: contract.petId,
          name: contract.petName
        });
      }
    });
    
    return Array.from(petsMap.values());
  }, [contracts]);

  // Auto-select the first pet when pets are loaded
  useEffect(() => {
    if (uniquePets.length > 0 && !selectedPet && uniquePets[0]) {
      setSelectedPet(uniquePets[0].id);
    }
  }, [uniquePets, selectedPet]);

  const filteredInstallments = useMemo(() => {
    if (!selectedPet) {
      return installments;
    }
    
    return {
      paid: installments.paid.filter(inst => inst.petId === selectedPet),
      current: installments.current.filter(inst => inst.petId === selectedPet),
      overdue: installments.overdue.filter(inst => inst.petId === selectedPet),
      summary: {
        totalPaid: installments.paid.filter(inst => inst.petId === selectedPet).reduce((sum, i) => sum + (i.paidAmount ?? i.amount), 0),
        totalCurrent: installments.current.filter(inst => inst.petId === selectedPet).reduce((sum, i) => sum + i.amount, 0),
        totalOverdue: installments.overdue.filter(inst => inst.petId === selectedPet).reduce((sum, i) => sum + i.amount, 0),
      }
    };
  }, [installments, selectedPet]);

  const formatCurrency = (value: string | number): string => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Função para determinar se o plano é anual ou mensal
  const isAnnualPlan = (billingPeriod: string | undefined, planName?: string): boolean => {
    // COMFORT e PLATINUM sempre são anuais, independente do billingPeriod
    if (planName) {
      const upperPlanName = planName.toUpperCase();
      if (upperPlanName.includes('COMFORT') || upperPlanName.includes('PLATINUM')) {
        return true;
      }
    }
    return billingPeriod === 'annual';
  };


  const handleDownloadReceipt = async (installment: any) => {
    // Use installment.id as the downloading indicator
    setDownloadingReceiptId(installment.id);
    
    try {
      // If there's no receipt ID, generate one first
      if (!installment.receiptId) {
        console.log('Generating receipt for installment:', installment.id);
        
        const generateResponse = await fetch(`/api/customer/installments/${installment.id}/generate-receipt`, {
          credentials: 'include',
          method: 'POST'
        });

        if (!generateResponse.ok) {
          if (generateResponse.status === 401) {
            alert('Sessão expirada. Faça login novamente.');
            navigate('/cliente/login');
            setDownloadingReceiptId(null);
            return;
          }
          const errorData = await generateResponse.json().catch(() => ({ error: 'Erro desconhecido' }));
          alert(`Erro ao gerar comprovante: ${errorData.error || 'Erro desconhecido'}`);
          setDownloadingReceiptId(null);
          return;
        }

        const { receiptId } = await generateResponse.json();
        
        // Update the installment with the new receiptId
        installment.receiptId = receiptId;
        
        // Also update the state to reflect the new receiptId
        setInstallments(prev => ({
          ...prev,
          paid: prev.paid.map(item => 
            item.id === installment.id ? { ...item, receiptId } : item
          )
        }));
      }

      // Now download the receipt
      const response = await fetch(`/api/customer/payment-receipts/${installment.receiptId}/download`, {
        credentials: 'include',
        method: 'GET'
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `comprovante_${installment.receiptId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else if (response.status === 401) {
        alert('Sessão expirada. Faça login novamente.');
        navigate('/cliente/login');
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        alert(`Erro ao baixar comprovante: ${errorData.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao baixar comprovante:', error);
      alert('Erro ao tentar baixar o comprovante. Tente novamente.');
    }
    setDownloadingReceiptId(null);
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="min-h-screen pt-16 flex items-center justify-center" style={{ background: 'var(--bg-cream-light)' }}>
          <div className="text-center">
            <div className="w-8 h-8 border-4 rounded-full animate-spin mx-auto mb-4" 
              style={{borderColor: 'var(--text-teal)', borderTopColor: 'transparent'}}></div>
            <p style={{ color: 'var(--text-dark-secondary)' }}>Carregando dados financeiros...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <div className="min-h-screen pt-16 flex items-center justify-center" style={{ background: 'var(--bg-cream-light)' }}>
          <div className="text-center">
            <p className="mb-4" style={{ color: 'var(--text-dark-primary)' }}>{error}</p>
            <button
              onClick={() => navigate('/cliente/painel')}
              className="px-6 py-2 rounded-lg"
              style={{ background: 'var(--btn-ver-planos-bg)', color: 'var(--btn-ver-planos-text)' }}
            >
              Voltar ao Dashboard
            </button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen pt-16" style={{ background: 'var(--bg-cream-light)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="mb-6">
              <button
                onClick={() => navigate('/cliente/painel')}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg mb-4"
                style={{ background: 'var(--bg-beige)', color: 'var(--text-dark-secondary)' }}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>
              <div>
                <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-dark-primary)' }}>
                  Informações Financeiras
                </h1>
                <p className="mb-4" style={{ color: 'var(--text-dark-secondary)' }}>
                  Acompanhe suas {filteredInstallments.current.some(i => isAnnualPlan(i.billingPeriod, i.planName)) || 
                                  filteredInstallments.overdue.some(i => isAnnualPlan(i.billingPeriod, i.planName)) ||
                                  filteredInstallments.paid.some(i => isAnnualPlan(i.billingPeriod, i.planName)) ? 'anualidades' : 'mensalidades'} e pagamentos
                </p>
                {uniquePets.length > 0 && (
                  <div className="w-full sm:w-[250px]">
                    <Select value={selectedPet} onValueChange={setSelectedPet}>
                      <SelectTrigger 
                        className="w-full p-3 rounded-lg border text-sm [&>span]:text-left [&>span]:flex [&>span]:flex-col [&>span]:items-start"
                        style={{
                          borderColor: 'var(--border-gray)',
                          background: 'white'
                        }}
                      >
                        <SelectValue placeholder="Filtrar por pet" />
                      </SelectTrigger>
                      <SelectContent>
                        {uniquePets.map((pet) => (
                          <SelectItem key={pet.id} value={pet.id}>
                            {pet.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Seção de Mensalidades */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* Mensalidades Atrasadas */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl shadow-lg p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text-teal)' }}>
                  {(filteredInstallments.overdue.some(i => isAnnualPlan(i.billingPeriod, i.planName)) ||
                    filteredInstallments.current.some(i => isAnnualPlan(i.billingPeriod, i.planName)) ||
                    filteredInstallments.paid.some(i => isAnnualPlan(i.billingPeriod, i.planName)))
                    ? 'Anualidades Atrasadas' 
                    : 'Mensalidades Atrasadas'}
                </h3>
                <XCircle className="w-6 h-6" style={{ color: 'var(--text-teal)' }} />
              </div>
              
              {filteredInstallments.overdue.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredInstallments.overdue.map((installment) => (
                    <div key={installment.id} className="p-3 rounded-lg border" style={{ borderColor: 'var(--border-gray)', background: 'var(--bg-cream-light)' }}>
                      <div className="mb-2">
                        <p className="font-medium text-sm" style={{ color: 'var(--text-dark-primary)' }}>
                          {installment.petName} - {installment.planName}
                        </p>
                        <p className="text-xs mb-1" style={{ color: 'var(--text-dark-secondary)' }}>
                          {isAnnualPlan(installment.billingPeriod, installment.planName) ? 'Anualidade' : 'Parcela'} {installment.installmentNumber} • Vencimento: {formatDate(installment.dueDate)}
                        </p>
                        <span className="inline-block text-xs font-medium px-2 py-1 rounded" style={{ background: 'rgb(254, 226, 226)', color: '#dc2626' }}>
                          {installment.daysOverdue} dias atraso
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold" style={{ color: 'var(--text-teal)' }}>
                          {formatCurrency(installment.amount)}
                        </span>
                        <button
                          onClick={() => navigate(`/cliente/pagamento?installmentId=${installment.id}`)}
                          className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-all duration-300 hover:scale-95"
                          style={{ borderRadius: '0.5rem' }}
                        >
                          Pagar Agora
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--border-gray)' }}>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold" style={{ color: 'var(--text-dark-primary)' }}>Total Atrasado:</span>
                      <span className="font-bold text-lg" style={{ color: 'var(--text-teal)' }}>
                        {formatCurrency(filteredInstallments.summary.totalOverdue)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center">
                  <p className="text-sm" style={{ color: 'var(--text-dark-secondary)' }}>
                    {(filteredInstallments.current.some(i => isAnnualPlan(i.billingPeriod, i.planName)) || 
                      filteredInstallments.paid.some(i => isAnnualPlan(i.billingPeriod, i.planName)) ||
                      filteredInstallments.overdue.some(i => isAnnualPlan(i.billingPeriod, i.planName)))
                      ? 'Nenhuma anualidade atrasada' 
                      : 'Nenhuma mensalidade atrasada'}
                  </p>
                </div>
              )}
            </motion.div>

            {/* Mensalidade do Mês Atual */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl shadow-lg p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text-teal)' }}>
                  {filteredInstallments.current.some(i => isAnnualPlan(i.billingPeriod, i.planName)) 
                    ? 'Próxima Anualidade' 
                    : 'Próxima Mensalidade'}
                </h3>
                <Clock className="w-6 h-6" style={{ color: 'var(--text-teal)' }} />
              </div>
              
              {filteredInstallments.current.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredInstallments.current.map((installment) => (
                    <div key={installment.id} className="p-3 rounded-lg border" style={{ borderColor: 'var(--border-gray)', background: 'var(--bg-cream-light)' }}>
                      <div className="mb-2">
                        <p className="font-medium text-sm" style={{ color: 'var(--text-dark-primary)' }}>
                          {installment.petName} - {installment.planName}
                        </p>
                        <p className="text-xs mb-1" style={{ color: 'var(--text-dark-secondary)' }}>
                          {isAnnualPlan(installment.billingPeriod, installment.planName) ? 'Anualidade' : 'Parcela'} {installment.installmentNumber} • Vencimento: {formatDate(installment.dueDate)}
                        </p>
                        {installment.daysUntilDue && installment.daysUntilDue > 0 && (
                          <span className="inline-block text-xs font-medium px-2 py-1 rounded" style={{ background: '#d4eded', color: '#277677' }}>
                            {installment.daysUntilDue} dias para vencer
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold" style={{ color: 'var(--text-teal)' }}>
                          {formatCurrency(installment.amount)}
                        </span>
                        <button
                          onClick={() => navigate(`/cliente/pagamento?installmentId=${installment.id}`)}
                          className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-all duration-300 hover:scale-95"
                          style={{ background: '#277677', borderRadius: '0.5rem' }}
                        >
                          Pagar Agora
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--border-gray)' }}>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold" style={{ color: 'var(--text-dark-primary)' }}>
                        Total {filteredInstallments.current.some(i => isAnnualPlan(i.billingPeriod, i.planName)) ? 'do Ano' : 'do Mês'}:
                      </span>
                      <span className="font-bold text-lg" style={{ color: 'var(--text-teal)' }}>
                        {formatCurrency(filteredInstallments.summary.totalCurrent)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center">
                  <p className="text-sm" style={{ color: 'var(--text-dark-secondary)' }}>
                    {(filteredInstallments.overdue.some(i => isAnnualPlan(i.billingPeriod, i.planName)) || 
                      filteredInstallments.paid.some(i => isAnnualPlan(i.billingPeriod, i.planName)) ||
                      filteredInstallments.current.some(i => isAnnualPlan(i.billingPeriod, i.planName)))
                      ? 'Nenhuma anualidade para este ano' 
                      : 'Nenhuma mensalidade para este mês'}
                  </p>
                </div>
              )}
            </motion.div>

            {/* Mensalidades Pagas */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-xl shadow-lg p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text-teal)' }}>
                  {filteredInstallments.paid.some(i => isAnnualPlan(i.billingPeriod, i.planName)) 
                    ? 'Anualidades Pagas' 
                    : 'Mensalidades Pagas'}
                </h3>
              </div>
              
              {filteredInstallments.paid.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredInstallments.paid.map((installment) => (
                    <div key={installment.id} className="p-3 rounded-lg border" style={{ borderColor: 'var(--border-gray)', background: 'var(--bg-cream-light)' }}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-sm" style={{ color: 'var(--text-dark-primary)' }}>
                            {installment.petName} - {installment.planName}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-dark-secondary)' }}>
                            {isAnnualPlan(installment.billingPeriod, installment.planName) ? 'Anualidade' : 'Parcela'} {installment.installmentNumber} • Paga em: {formatDate(installment.paidAt || installment.dueDate)}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold" style={{ color: 'var(--text-teal)' }}>
                          {formatCurrency(installment.paidAmount ?? installment.amount)}
                        </span>
                        <button
                          onClick={() => handleDownloadReceipt(installment)}
                          disabled={downloadingReceiptId === installment.id}
                          className="flex items-center space-x-1 unipet-button-primary text-sm px-3 py-2 text-[var(--text-light)] transition-transform duration-300 hover:scale-95"
                          style={{ 
                            background: 'var(--btn-cotacao-gratuita-bg)',
                            border: 'none',
                            borderRadius: '0.5rem'
                          }}
                        >
                          {downloadingReceiptId === installment.id ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>{installment.receiptId ? 'Baixando...' : 'Gerando...'}</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-3 h-3" />
                              <span>Comprovante</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--border-gray)' }}>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold" style={{ color: 'var(--text-dark-primary)' }}>Total Pago:</span>
                      <span className="font-bold text-lg" style={{ color: 'var(--text-teal)' }}>
                        {formatCurrency(filteredInstallments.summary.totalPaid)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center">
                  <p className="text-sm" style={{ color: 'var(--text-dark-secondary)' }}>
                    {(filteredInstallments.current.some(i => isAnnualPlan(i.billingPeriod, i.planName)) || 
                      filteredInstallments.overdue.some(i => isAnnualPlan(i.billingPeriod, i.planName)) ||
                      filteredInstallments.paid.some(i => isAnnualPlan(i.billingPeriod, i.planName)))
                      ? 'Nenhuma anualidade paga encontrada' 
                      : 'Nenhuma mensalidade paga encontrada'}
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
      <Footer />

      {/* Payment Success Popup */}
      <AnimatePresence>
        {showPaymentSuccessPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowPaymentSuccessPopup(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="relative rounded-lg shadow-xl max-w-md w-full mx-4 border"
              onClick={(e) => e.stopPropagation()}
              style={{background: 'var(--bg-teal)'}}
            >
              {/* Header */}
              <div className="flex items-center justify-center p-6 pb-4">
                <div className="text-3xl mb-2">🎉</div>
              </div>
              
              {/* Content */}
              <div className="px-6 pb-6 text-center">
                <h2 className="text-xl font-semibold mb-3 text-white">
                  Pagamento Realizado com Sucesso!
                </h2>
                <p className="text-sm mb-6 text-white opacity-90">
                  Seu pagamento foi processado com sucesso e o comprovante está sendo gerado. 
                  O pagamento agora aparece na seção correspondente.
                </p>
                
                {/* Action */}
                <button
                  onClick={() => setShowPaymentSuccessPopup(false)}
                  className="w-full py-2.5 px-4 rounded-lg font-medium transition-all duration-200 opacity-90 hover:opacity-100"
                  style={{
                    background: 'white',
                    color: 'var(--bg-teal)'
                  }}
                >
                  Continuar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
