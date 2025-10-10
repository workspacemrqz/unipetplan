import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { ProceduresTab } from "@/components/customer/ProceduresTab";
import { useAuth } from "@/contexts/AuthContext";
import LoadingDots from "@/components/ui/LoadingDots";

export default function CustomerProcedures() {
  const [, navigate] = useLocation();
  const { client, isLoading, error } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !client && !error) {
      navigate('/cliente/login');
    }
  }, [isLoading, client, error, navigate]);

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="min-h-screen pt-16 flex items-center justify-center" style={{ background: 'var(--bg-cream-light)' }}>
          <div className="text-center">
            <LoadingDots size="md" color="#0e7074" className="mb-4" />
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
          
          {/* Page Header */}
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
              <div className="mb-4">
                <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-dark-primary)' }}>
                  Procedimentos
                </h1>
                <p style={{ color: 'var(--text-dark-secondary)' }}>
                  Consulte os procedimentos disponíveis para seu pet
                </p>
              </div>
            </div>
          </motion.div>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-lg p-8"
          >
            <ProceduresTab />
          </motion.div>
        </div>
      </div>
      <Footer />
    </>
  );
}