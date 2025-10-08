import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { LogOut, Clipboard, Star, Settings, Shield, FileText } from "lucide-react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { useWhatsAppRedirect } from "@/hooks/use-whatsapp-redirect";
import { useAuth } from "@/contexts/AuthContext";


export default function CustomerDashboard() {
  const [, navigate] = useLocation();
  const { client, isLoading, error, logout } = useAuth();
  const { redirectToWhatsApp } = useWhatsAppRedirect();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !client && !error) {
      navigate('/cliente/login');
    }
  }, [isLoading, client, error, navigate]);

  // Function to handle profile view
  const handleViewProfile = () => {
    navigate('/cliente/perfil');
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="min-h-screen pt-16 flex items-center justify-center" style={{ background: 'var(--bg-cream-light)' }}>
          <div className="text-center">
            <div className="w-8 h-8 border-4 rounded-full animate-spin mx-auto mb-4" 
              style={{borderColor: 'var(--text-teal)', borderTopColor: 'transparent'}}></div>
            <p style={{ color: 'var(--text-dark-secondary)' }}>Carregando...</p>
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
              onClick={() => navigate('/cliente/login')}
              className="px-6 py-2 rounded-lg"
              style={{ background: 'var(--btn-ver-planos-bg)', color: 'var(--btn-ver-planos-text)' }}
            >
              Fazer Login
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
          
          {/* Welcome Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <button
              onClick={logout}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg mb-4"
              style={{ background: 'var(--bg-beige)', color: 'var(--text-dark-secondary)' }}
            >
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </button>
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-dark-primary)' }}>
                Olá, {client?.full_name}!
              </h1>
              <p style={{ color: 'var(--text-dark-secondary)' }}>
                Bem-vindo à sua área do cliente
              </p>
            </div>
          </motion.div>

          {/* Dashboard Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
          >
            {/* My Pets Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 shadow-xl transition-shadow duration-300">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--bg-cream-light)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 -960 960 960" style={{ fill: 'var(--text-teal)' }}>
                    <path d="M180-475q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29Zm180-160q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29Zm240 0q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29Zm180 160q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29ZM266-75q-45 0-75.5-34.5T160-191q0-52 35.5-91t70.5-77q29-31 50-67.5t50-68.5q22-26 51-43t63-17q34 0 63 16t51 42q28 32 49.5 69t50.5 69q35 38 70.5 77t35.5 91q0 47-30.5 81.5T694-75q-54 0-107-9t-107-9q-54 0-107 9t-107 9Z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold" style={{ color: 'var(--text-dark-primary)' }}>
                    Meus Pets
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-dark-secondary)' }}>
                    Gerencie seus pets
                  </p>
                </div>
              </div>
              <button 
                onClick={() => navigate('/cliente/pets')}
                className="w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                style={{ background: 'var(--btn-ver-planos-bg)', color: 'var(--btn-ver-planos-text)' }}>
                Ver Pets
              </button>
            </div>

            {/* Procedimentos Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 shadow-xl transition-shadow duration-300">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--bg-cream-light)' }}>
                  <FileText className="w-6 h-6" style={{ color: 'var(--text-teal)' }} />
                </div>
                <div>
                  <h3 className="font-semibold" style={{ color: 'var(--text-dark-primary)' }}>
                    Procedimentos
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-dark-secondary)' }}>
                    Gerenciar uso de procedimentos
                  </p>
                </div>
              </div>
              <button 
                onClick={() => navigate('/cliente/procedimentos')}
                className="w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                style={{ background: 'var(--btn-ver-planos-bg)', color: 'var(--btn-ver-planos-text)' }}>
                Ver Procedimentos
              </button>
            </div>

            {/* Contratos Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 shadow-xl transition-shadow duration-300">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--bg-cream-light)' }}>
                  <Clipboard className="w-6 h-6" style={{ color: 'var(--text-teal)' }} />
                </div>
                <div>
                  <h3 className="font-semibold" style={{ color: 'var(--text-dark-primary)' }}>
                    Financeiro
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-dark-secondary)' }}>
                    Visualizar financeiro
                  </p>
                </div>
              </div>
              <button 
                onClick={() => navigate('/cliente/financeiro')}
                className="w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                style={{ background: 'var(--btn-ver-planos-bg)', color: 'var(--btn-ver-planos-text)' }}>
                Ver Financeiro
              </button>
            </div>

            {/* Pesquisas de Satisfação Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 shadow-xl transition-shadow duration-300">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--bg-cream-light)' }}>
                  <Star className="w-6 h-6" style={{ color: 'var(--text-teal)' }} />
                </div>
                <div>
                  <h3 className="font-semibold" style={{ color: 'var(--text-dark-primary)' }}>
                    Pesquisas de Satisfação
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-dark-secondary)' }}>
                    Avalie nossos serviços
                  </p>
                </div>
              </div>
              <button 
                onClick={() => navigate('/cliente/pesquisas')}
                className="w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                style={{ background: 'var(--btn-ver-planos-bg)', color: 'var(--btn-ver-planos-text)' }}>
                Enviar Feedback
              </button>
            </div>

            {/* Profile Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 shadow-xl transition-shadow duration-300">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--bg-cream-light)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="var(--text-teal)"><path d="M481-781q106 0 200 45.5T838-604q7 9 4.5 16t-8.5 12q-6 5-14 4.5t-14-8.5q-55-78-141.5-119.5T481-741q-97 0-182 41.5T158-580q-6 9-14 10t-14-4q-7-5-8.5-12.5T126-602q62-85 155.5-132T481-781Zm0 94q135 0 232 90t97 223q0 50-35.5 83.5T688-257q-51 0-87.5-33.5T564-374q0-33-24.5-55.5T481-452q-34 0-58.5 22.5T398-374q0 97 57.5 162T604-121q9 3 12 10t1 15q-2 7-8 12t-15 3q-104-26-170-103.5T358-374q0-50 36-84t87-34q51 0 87 34t36 84q0 33 25 55.5t59 22.5q34 0 58-22.5t24-55.5q0-116-85-195t-203-79q-118 0-203 79t-85 194q0 24 4.5 60t21.5 84q3 9-.5 16T208-205q-8 3-15.5-.5T182-217q-15-39-21.5-77.5T154-374q0-133 96.5-223T481-687Zm0-192q64 0 125 15.5T724-819q9 5 10.5 12t-1.5 14q-3 7-10 11t-17-1q-53-27-109.5-41.5T481-839q-58 0-114 13.5T260-783q-8 5-16 2.5T232-791q-4-8-2-14.5t10-11.5q56-30 117-46t124-16Zm0 289q93 0 160 62.5T708-374q0 9-5.5 14.5T688-354q-8 0-14-5.5t-6-14.5q0-75-55.5-125.5T481-550q-76 0-130.5 50.5T296-374q0 81 28 137.5T406-123q6 6 6 14t-6 14q-6 6-14 6t-14-6q-59-62-90.5-126.5T256-374q0-91 66-153.5T481-590Zm-1 196q9 0 14.5 6t5.5 14q0 75 54 123t126 48q6 0 17-1t23-3q9-2 15.5 2.5T744-191q2 8-3 14t-13 8q-18 5-31.5 5.5t-16.5.5q-89 0-154.5-60T460-374q0-8 5.5-14t14.5-6Z"/></svg>
                </div>
                <div>
                  <h3 className="font-semibold" style={{ color: 'var(--text-dark-primary)' }}>
                    Meu Perfil
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-dark-secondary)' }}>
                    Dados pessoais
                  </p>
                </div>
              </div>
              <button 
                onClick={handleViewProfile}
                className="w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                style={{ background: 'var(--btn-ver-planos-bg)', color: 'var(--btn-ver-planos-text)' }}>
                Ver Perfil
              </button>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-lg p-8"
          >
            <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--text-dark-primary)' }}>
              Ações Rápidas
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <button
                onClick={() => redirectToWhatsApp('Olá! Preciso de suporte.')}
                className="flex items-center space-x-4 p-4 rounded-lg border-2"
                style={{ 
                  borderColor: 'var(--border-gray)',
                  background: 'transparent'
                }}
              >
                <Settings className="w-8 h-8" style={{ color: 'var(--text-teal)' }} />
                <div className="text-left">
                  <h3 className="font-medium" style={{ color: 'var(--text-dark-primary)' }}>
                    Suporte
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-dark-secondary)' }}>
                    Entre em contato conosco
                  </p>
                </div>
              </button>

              <button
                onClick={() => navigate('/rede-credenciada')}
                className="flex items-center space-x-4 p-4 rounded-lg border-2"
                style={{ 
                  borderColor: 'var(--border-gray)',
                  background: 'transparent'
                }}
              >
                <Shield className="w-8 h-8" style={{ color: 'var(--text-teal)' }} />
                <div className="text-left">
                  <h3 className="font-medium" style={{ color: 'var(--text-dark-primary)' }}>
                    Rede Credenciada
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-dark-secondary)' }}>
                    Encontre clínicas próximas
                  </p>
                </div>
              </button>
            </div>
          </motion.div>

        </div>
      </div>

      <Footer />
    </>
  );
}