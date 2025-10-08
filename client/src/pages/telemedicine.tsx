import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { 
  Video,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Clock,
  Shield,
  Phone,
  MessageSquare,
  Monitor
} from "lucide-react";

interface EligibilityResult {
  eligible: boolean;
  code: string;
  message: string;
  details?: any;
}

interface TelemedicineRequest {
  available: boolean;
  code: string;
  message: string;
  accessUrl?: string;
}

export default function TelemedicinePage() {
  const [, navigate] = useLocation();
  const [eligibilityStatus, setEligibilityStatus] = useState<EligibilityResult | null>(null);
  const [telemedicineRequest, setTelemedicineRequest] = useState<TelemedicineRequest | null>(null);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(true);
  const [isRequestingService, setIsRequestingService] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('customer_token');
    if (!token) {
      navigate('/cliente/login');
      return;
    }

    checkEligibility(token);
  }, [navigate]);

  const checkEligibility = async (token: string) => {
    try {
      const response = await fetch('/api/customer/telemedicine/eligibility', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('customer_token');
        navigate('/cliente/login');
        return;
      }

      const result = await response.json();
      
      if (result.success) {
        setEligibilityStatus(result.data);
      } else {
        setError(result.error || 'Erro ao verificar elegibilidade');
      }
    } catch (error) {
      setError('Erro de conexão');
    } finally {
      setIsCheckingEligibility(false);
    }
  };

  const requestTelemedicine = async (integrator: string = 'DOC24') => {
    const token = localStorage.getItem('customer_token');
    if (!token) return;

    setIsRequestingService(true);
    setError(null);

    try {
      const response = await fetch('/api/customer/telemedicine/request', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ integrator }),
      });

      const result = await response.json();
      
      if (result.success) {
        setTelemedicineRequest(result.data);
        if (result.data.accessUrl) {
          // Abrir em nova janela/tab
          window.open(result.data.accessUrl, '_blank');
        }
      } else {
        setError(result.error || 'Erro ao solicitar atendimento');
      }
    } catch (error) {
      setError('Erro de conexão');
    } finally {
      setIsRequestingService(false);
    }
  };

  const getEligibilityIcon = (eligible: boolean) => {
    return eligible ? (
      <CheckCircle className="w-12 h-12" style={{color: 'var(--icon-gold)'}} />
    ) : (
      <AlertCircle className="w-12 h-12" style={{color: 'var(--text-dark-primary)'}} />
    );
  };

  const getEligibilityStyles = (eligible: boolean) => {
    return eligible 
      ? {
          background: 'var(--bg-cream-lighter)',
          borderColor: 'var(--border-teal-light)',
          titleColor: 'var(--text-teal)',
          textColor: 'var(--text-dark-secondary)'
        }
      : {
          background: 'var(--bg-cream-light)',
          borderColor: 'var(--border-gray)',
          titleColor: 'var(--text-dark-primary)',
          textColor: 'var(--text-dark-secondary)'
        };
  };

  if (isCheckingEligibility) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: 'var(--bg-cream-light)'}}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 rounded-full animate-spin mx-auto mb-4" 
            style={{borderColor: 'var(--border-teal)', borderTopColor: 'transparent'}}></div>
          <p style={{color: 'var(--text-dark-secondary)'}}>Verificando sua elegibilidade...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12" style={{background: 'var(--bg-cream-light)'}}>
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <button
            onClick={() => navigate('/cliente/painel')}
            className="p-2 rounded-lg transition-all"
            style={{background: 'var(--bg-cream-lighter)'}}


          >
            <ArrowLeft className="w-6 h-6" style={{color: 'var(--text-dark-primary)'}} />
          </button>
          <div>
            <h1 className="text-3xl font-bold" style={{color: 'var(--text-dark-primary)'}}>Telemedicina</h1>
            <p style={{color: 'var(--text-dark-secondary)'}}>Consulte um veterinário online</p>
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-lg"
            style={{
              background: 'var(--bg-cream-lighter)', 
              border: '1px solid var(--border-teal-light)', 
              color: 'var(--text-dark-primary)'
            }}
          >
            {error}
          </motion.div>
        )}

        {/* Eligibility Status */}
        {eligibilityStatus && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 border rounded-xl p-8"
            style={{
              background: getEligibilityStyles(eligibilityStatus.eligible).background,
              borderColor: getEligibilityStyles(eligibilityStatus.eligible).borderColor
            }}
          >
            <div className="flex items-center space-x-6">
              {getEligibilityIcon(eligibilityStatus.eligible)}
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2" 
                  style={{color: getEligibilityStyles(eligibilityStatus.eligible).titleColor}}>
                  {eligibilityStatus.eligible ? 'Você está elegível!' : 'Não elegível no momento'}
                </h2>
                <p className="text-lg" 
                  style={{color: getEligibilityStyles(eligibilityStatus.eligible).textColor}}>
                  {eligibilityStatus.message}
                </p>
                {eligibilityStatus.code && (
                  <p className="text-sm opacity-75 mt-2" 
                    style={{color: getEligibilityStyles(eligibilityStatus.eligible).textColor}}>
                    Código: {eligibilityStatus.code}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {eligibilityStatus?.eligible && (
          <>
            {/* Service Options */}
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-xl shadow-lg p-8"
                style={{background: 'var(--bg-cream-lighter)'}}
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" 
                    style={{background: 'var(--bg-cream-light)'}}>
                    <Video className="w-8 h-8" style={{color: 'var(--text-teal)'}} />
                  </div>
                  <h3 className="text-xl font-bold mb-2" style={{color: 'var(--text-dark-primary)'}}>Consulta por Vídeo</h3>
                  <p style={{color: 'var(--text-dark-secondary)'}}>
                    Fale diretamente com um veterinário por videochamada
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5" style={{color: 'var(--icon-gold)'}} />
                    <span style={{color: 'var(--text-dark-primary)'}}>Consulta em tempo real</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5" style={{color: 'var(--icon-gold)'}} />
                    <span style={{color: 'var(--text-dark-primary)'}}>Exame visual do pet</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5" style={{color: 'var(--icon-gold)'}} />
                    <span style={{color: 'var(--text-dark-primary)'}}>Receituário digital</span>
                  </div>
                </div>

                <button
                  onClick={() => requestTelemedicine('DOC24')}
                  disabled={isRequestingService}
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                  style={{
                    background: 'var(--btn-ver-planos-bg)',
                    color: 'var(--btn-ver-planos-text)'
                  }}
                >
                  {isRequestingService ? (
                    <>
                      <div className="w-5 h-5 border-2 rounded-full animate-spin" 
                        style={{borderColor: 'var(--text-light)', borderTopColor: 'transparent'}}></div>
                      <span>Conectando...</span>
                    </>
                  ) : (
                    <>
                      <Video className="w-5 h-5" />
                      <span>Iniciar Consulta</span>
                    </>
                  )}
                </button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="rounded-xl shadow-lg p-8"
                style={{background: 'var(--bg-cream-lighter)'}}
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" 
                    style={{background: 'var(--bg-beige)'}}>
                    <MessageSquare className="w-8 h-8" style={{color: 'var(--text-gold)'}} />
                  </div>
                  <h3 className="text-xl font-bold mb-2" style={{color: 'var(--text-dark-primary)'}}>Chat Online</h3>
                  <p style={{color: 'var(--text-dark-secondary)'}}>
                    Tire dúvidas por mensagem de texto
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5" style={{color: 'var(--icon-gold)'}} />
                    <span style={{color: 'var(--text-dark-primary)'}}>Respostas rápidas</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5" style={{color: 'var(--icon-gold)'}} />
                    <span style={{color: 'var(--text-dark-primary)'}}>Histórico salvo</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5" style={{color: 'var(--icon-gold)'}} />
                    <span style={{color: 'var(--text-dark-primary)'}}>Disponível 24h</span>
                  </div>
                </div>

                <button
                  onClick={() => requestTelemedicine('RAPIDOC-TEMA')}
                  disabled={isRequestingService}
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                  style={{
                    background: 'var(--bg-gold)',
                    color: 'var(--text-light)'
                  }}
                >
                  {isRequestingService ? (
                    <>
                      <div className="w-5 h-5 border-2 rounded-full animate-spin" 
                        style={{borderColor: 'var(--text-light)', borderTopColor: 'transparent'}}></div>
                      <span>Conectando...</span>
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-5 h-5" />
                      <span>Iniciar Chat</span>
                    </>
                  )}
                </button>
              </motion.div>
            </div>

            {/* Request Result */}
            {telemedicineRequest && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-xl border"
                style={{
                  background: telemedicineRequest.available 
                    ? 'var(--bg-cream-lighter)' 
                    : 'var(--bg-beige)',
                  borderColor: telemedicineRequest.available 
                    ? 'var(--border-teal-light)' 
                    : 'var(--border-gray)'
                }}
              >
                <div className="flex items-center space-x-4">
                  {telemedicineRequest.available ? (
                    <CheckCircle className="w-8 h-8" style={{color: 'var(--icon-gold)'}} />
                  ) : (
                    <Clock className="w-8 h-8" style={{color: 'var(--text-gold)'}} />
                  )}
                  <div>
                    <h3 className="text-lg font-semibold" 
                      style={{color: telemedicineRequest.available ? 'var(--text-teal)' : 'var(--text-gold)'}}>
                      {telemedicineRequest.available ? 'Atendimento Iniciado' : 'Aguardando Disponibilidade'}
                    </h3>
                    <p style={{color: 'var(--text-dark-secondary)'}}>
                      {telemedicineRequest.message}
                    </p>
                  </div>
                </div>

                {telemedicineRequest.accessUrl && (
                  <div className="mt-4 pt-4 border-t" style={{borderColor: 'var(--border-teal-light)'}}>
                    <a
                      href={telemedicineRequest.accessUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors"
                      style={{background: 'var(--btn-ver-planos-bg)', color: 'var(--btn-ver-planos-text)'}}
                    >
                      <Monitor className="w-5 h-5" />
                      <span>Abrir Consulta</span>
                    </a>
                  </div>
                )}
              </motion.div>
            )}
          </>
        )}

        {/* Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-xl shadow-lg p-8"
          style={{background: 'var(--bg-cream-lighter)'}}
        >
          <h3 className="text-xl font-bold mb-6 flex items-center space-x-2" style={{color: 'var(--text-dark-primary)'}}>
            <Shield className="w-6 h-6" style={{color: 'var(--text-teal)'}} />
            <span>Como Funciona a Telemedicina</span>
          </h3>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" 
                style={{background: 'var(--bg-cream-light)'}}>
                <span className="font-bold" style={{color: 'var(--text-teal)'}}>1</span>
              </div>
              <h4 className="font-semibold mb-2" style={{color: 'var(--text-dark-primary)'}}>Verificação</h4>
              <p className="text-sm" style={{color: 'var(--text-dark-secondary)'}}>
                Verificamos sua elegibilidade e status do plano
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" 
                style={{background: 'var(--bg-cream-light)'}}>
                <span className="font-bold" style={{color: 'var(--text-teal)'}}>2</span>
              </div>
              <h4 className="font-semibold mb-2" style={{color: 'var(--text-dark-primary)'}}>Conexão</h4>
              <p className="text-sm" style={{color: 'var(--text-dark-secondary)'}}>
                Conectamos você com um veterinário disponível
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" 
                style={{background: 'var(--bg-cream-light)'}}>
                <span className="font-bold" style={{color: 'var(--text-teal)'}}>3</span>
              </div>
              <h4 className="font-semibold mb-2" style={{color: 'var(--text-dark-primary)'}}>Atendimento</h4>
              <p className="text-sm" style={{color: 'var(--text-dark-secondary)'}}>
                Receba orientação profissional online
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t" style={{borderColor: 'var(--border-gray)'}}>
            <h4 className="font-semibold mb-4" style={{color: 'var(--text-dark-primary)'}}>Importante:</h4>
            <ul className="space-y-2 text-sm" style={{color: 'var(--text-dark-secondary)'}}>
              <li>• A telemedicina é ideal para orientações e consultas preventivas</li>
              <li>• Para emergências, procure atendimento presencial imediato</li>
              <li>• Mantenha seu pet próximo durante a consulta por vídeo</li>
              <li>• Tenha em mãos o histórico médico do seu pet</li>
            </ul>
          </div>
        </motion.div>

        {/* Support */}
        <div className="mt-8 text-center">
          <p className="mb-4" style={{color: 'var(--text-dark-secondary)'}}>
            Precisa de ajuda com a telemedicina?
          </p>
          <button className="flex items-center space-x-2 mx-auto px-6 py-3 rounded-lg transition-colors"
            style={{color: 'var(--text-teal)'}}
          >
            <Phone className="w-5 h-5" />
            <span>Falar com Suporte</span>
          </button>
        </div>
      </div>
    </div>
  );
}