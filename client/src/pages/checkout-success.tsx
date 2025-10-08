import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { CheckCircle, ArrowLeft, CreditCard, FileText, Smartphone, Copy } from "lucide-react";
import { CopyButton } from "@/components/ui/copy-button";

interface PaymentDetails {
  orderId: string;
  numeroContrato: string;
  paymentDetails: {
    status: 'approved' | 'pending' | 'rejected';
    method: 'credit_card' | 'debit_card' | 'pix';
    amount: string;
    pixQrCode?: string;
    pixCopyPaste?: string;
    installments: number;
  };
  customer: {
    nome: string;
    email: string;
  };
  pet: {
    name: string;
    species: string;
  };
  plan: {
    name: string;
  };
}

export default function CheckoutSuccessPage() {
  const [location, navigate] = useLocation();
  const [orderData, setOrderData] = useState<PaymentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pixData, setPixData] = useState<{qrCode?: string, copyPaste?: string} | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    const orderNumber = urlParams.get('order');
    const paymentMethod = urlParams.get('method');
    
    if (!orderNumber) {
      navigate('/');
      return;
    }

    // Capturar dados do PIX da URL se disponível
    if (paymentMethod === 'pix') {
      const pixQrCode = urlParams.get('pixQrCode');
      const pixCopyPaste = urlParams.get('pixCopyPaste');
      if (pixQrCode || pixCopyPaste) {
        setPixData({ 
          ...(pixQrCode && { qrCode: pixQrCode }), 
          ...(pixCopyPaste && { copyPaste: pixCopyPaste }) 
        });
      }
    }


    // Buscar dados reais do pedido
    fetchOrderData(orderNumber);
  }, [location, navigate]);

  const fetchOrderData = async (orderId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/checkout/orders/${orderId}`);
      const data = await response.json();
      
      if (response.ok) {
        setOrderData(data);
      } else {
        setError(data.error || 'Erro ao carregar dados do pedido');
      }
    } catch (error) {
      console.error('Erro ao buscar dados do pedido:', error);
      setError('Erro ao carregar dados do pedido');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'approved':
        return {
          color: 'var(--icon-gold)',
          bgColor: 'var(--bg-cream-lighter)',
          borderColor: 'var(--border-teal-light)',
          icon: CheckCircle,
          title: 'Pagamento Aprovado!',
          message: 'Seu plano foi ativado com sucesso.',
        };
      case 'pending':
        return {
          color: 'var(--text-gold)',
          bgColor: 'var(--bg-beige)',
          borderColor: 'var(--border-gray)',
          icon: CreditCard,
          title: 'Pagamento Pendente',
          message: 'Aguardando confirmação do pagamento.',
        };
      default:
        return {
          color: 'var(--text-dark-primary)',
          bgColor: 'var(--bg-cream-light)',
          borderColor: 'var(--border-gray)',
          icon: FileText,
          title: 'Pagamento Rejeitado',
          message: 'Houve um problema com o pagamento.',
        };
    }
  };

  const getMethodName = (method: string) => {
    switch (method) {
      case 'credit_card': return 'Cartão de Crédito';
      case 'debit_card': return 'Cartão de Débito';
      case 'pix': return 'PIX';
      default: return method;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: 'var(--bg-cream-light)'}}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 rounded-full animate-spin mx-auto mb-4" 
            style={{borderColor: 'var(--border-teal)', borderTopColor: 'transparent'}}></div>
          <p style={{color: 'var(--text-dark-secondary)'}}>Carregando informações do pedido...</p>
        </div>
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: 'var(--bg-cream-light)'}}>
        <div className="text-center">
          <p className="mb-4" style={{color: 'var(--text-dark-primary)'}}>{error || 'Pedido não encontrado'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 rounded-lg transition-colors"
            style={{background: 'var(--btn-ver-planos-bg)', color: 'var(--btn-ver-planos-text)'}}
          >
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(orderData.paymentDetails.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen py-12" style={{background: 'var(--bg-cream-light)'}}>
      <div className="max-w-2xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl shadow-lg overflow-hidden"
          style={{background: 'var(--bg-cream-lighter)'}}
        >
          {/* Header */}
          <div className="border-b px-8 py-6" 
            style={{
              background: statusInfo.bgColor,
              borderColor: statusInfo.borderColor
            }}>
            <div className="flex items-center space-x-4">
              <StatusIcon className="w-12 h-12" style={{color: statusInfo.color}} />
              <div>
                <h1 className="text-2xl font-bold" style={{color: statusInfo.color}}>
                  {statusInfo.title}
                </h1>
                <p className="mt-1" style={{color: 'var(--text-dark-secondary)'}}>
                  {statusInfo.message}
                </p>
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="px-8 py-6 space-y-6">
            <div className="text-center">
              <p className="text-sm" style={{color: 'var(--text-dark-secondary)'}}>Número do Contrato</p>
              <p className="text-xl font-mono font-bold" style={{color: 'var(--text-dark-primary)'}}>
                {orderData.numeroContrato}
              </p>
            </div>

            {/* Order Summary */}
            <div className="rounded-lg p-6" style={{background: 'var(--bg-beige)'}}>
              <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--text-dark-primary)'}}>Resumo do Pedido</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span style={{color: 'var(--text-dark-secondary)'}}>Cliente:</span>
                  <span className="font-medium" style={{color: 'var(--text-dark-primary)'}}>{orderData.customer.nome}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{color: 'var(--text-dark-secondary)'}}>Pet:</span>
                  <span className="font-medium" style={{color: 'var(--text-dark-primary)'}}>{orderData.pet.name}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{color: 'var(--text-dark-secondary)'}}>Plano:</span>
                  <span className="font-medium" style={{color: 'var(--text-dark-primary)'}}>{orderData.plan.name}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{color: 'var(--text-dark-secondary)'}}>Valor:</span>
                  <span className="font-medium" style={{color: 'var(--text-dark-primary)'}}>{orderData.paymentDetails.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{color: 'var(--text-dark-secondary)'}}>Pagamento:</span>
                  <span className="font-medium" style={{color: 'var(--text-dark-primary)'}}>
                    {getMethodName(orderData.paymentDetails.method)}
                    {orderData.paymentDetails.installments > 1 && 
                      ` (${orderData.paymentDetails.installments}x)`
                    }
                  </span>
                </div>
                <div className="flex justify-between border-t pt-3" style={{borderColor: 'var(--border-gray)'}}>
                  <span style={{color: 'var(--text-dark-secondary)'}}>Status:</span>
                  <span className="font-medium" style={{color: statusInfo.color}}>
                    {orderData.paymentDetails.status === 'approved' ? 'Aprovado' :
                     orderData.paymentDetails.status === 'pending' ? 'Pendente' : 'Rejeitado'}
                  </span>
                </div>
              </div>
            </div>


            {/* PIX Payment */}
            {((orderData?.paymentDetails.method === 'pix' && (orderData.paymentDetails.pixQrCode || orderData.paymentDetails.pixCopyPaste)) ||
              (pixData?.qrCode || pixData?.copyPaste)) && (
              <div className="border rounded-lg p-6" 
                style={{
                  background: 'var(--bg-cream-lighter)',
                  borderColor: 'var(--border-teal-light)'
                }}>
                <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2" style={{color: 'var(--text-teal)'}}>
                  <Smartphone className="w-5 h-5" />
                  <span>PIX - Pagamento Instantâneo</span>
                </h3>
                
                {(pixData?.qrCode || orderData?.paymentDetails?.pixQrCode) && (
                  <div className="mb-6">
                    <h4 className="font-medium mb-2" style={{color: 'var(--text-dark-primary)'}}>QR Code</h4>
                    <div className="flex justify-center p-8 bg-white rounded-lg border">
                      <img 
                        src={`data:image/png;base64,${pixData?.qrCode || orderData?.paymentDetails?.pixQrCode}`}
                        alt="QR Code PIX" 
                        className="w-72 h-72 object-contain"
                        style={{ imageRendering: 'crisp-edges' }}
                      />
                    </div>
                    <p className="text-sm mt-2 text-center" style={{color: 'var(--text-dark-secondary)'}}>
                      Escaneie o QR Code com o app do seu banco
                    </p>
                  </div>
                )}
                
                {(pixData?.copyPaste || orderData?.paymentDetails?.pixCopyPaste) && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-2" style={{color: 'var(--text-dark-primary)'}}>Código PIX (Copia e Cola)</h4>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={pixData?.copyPaste || orderData?.paymentDetails?.pixCopyPaste || ''}
                        readOnly
                        className="flex-1 p-3 rounded-lg border text-sm font-mono"
                        style={{
                          background: 'var(--bg-cream-light)',
                          borderColor: 'var(--border-gray)',
                          color: 'var(--text-dark-primary)'
                        }}
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(pixData?.copyPaste || orderData?.paymentDetails?.pixCopyPaste || '');
                          // Aqui você pode adicionar um toast de confirmação
                        }}
                        className="px-4 py-3 rounded-lg transition-colors flex items-center space-x-2"
                        style={{background: 'var(--btn-ver-planos-bg)', color: 'var(--btn-ver-planos-text)'}}
                        title="Copiar código PIX"
                      >
                        <Copy className="w-4 h-4" />
                        <span>Copiar</span>
                      </button>
                    </div>
                    <p className="text-sm mt-2" style={{color: 'var(--text-dark-secondary)'}}>
                      Cole este código no app do seu banco na opção PIX
                    </p>
                  </div>
                )}
                
              </div>
            )}

            {/* Next Steps */}
            <div className="border rounded-lg p-6" 
              style={{
                background: 'var(--bg-cream-lighter)',
                borderColor: 'var(--border-teal-light)'
              }}>
              <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--text-teal)'}}>Próximos Passos</h3>
              <ul className="space-y-2">
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{background: 'var(--icon-gold)'}}></div>
                  <span style={{color: 'var(--text-dark-secondary)'}}>Um email de confirmação foi enviado para {orderData.customer.email}</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{background: 'var(--icon-gold)'}}></div>
                  <span style={{color: 'var(--text-dark-secondary)'}}>Você pode acessar sua área do cliente para acompanhar o plano</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{background: 'var(--icon-gold)'}}></div>
                  <span style={{color: 'var(--text-dark-secondary)'}}>Em caso de dúvidas, entre em contato conosco</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="px-8 py-6 border-t flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3" 
            style={{background: 'var(--bg-beige)', borderColor: 'var(--border-gray)'}}>
            <button
              onClick={() => navigate('/')}
              className="flex items-center justify-center space-x-2 px-6 py-3 transition-colors"
              style={{color: 'var(--text-dark-secondary)'}}


            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao início</span>
            </button>
            
            <button
              onClick={() => navigate('/cliente/login')}
              className="flex items-center justify-center space-x-2 px-6 py-3 rounded-lg transition-colors flex-1"
              style={{background: 'var(--btn-ver-planos-bg)', color: 'var(--btn-ver-planos-text)'}}
            >
              <span>Acessar Área do Cliente</span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}