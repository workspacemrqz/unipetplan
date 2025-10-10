import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Star, Check, X, Loader2 } from "lucide-react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { useAuth } from "@/contexts/AuthContext";

export default function CustomerSurveys() {
  const [, navigate] = useLocation();
  const { client, isLoading, error: authError } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    rating: 0,
    feedback: '',
    suggestions: '',
    wouldRecommend: undefined as boolean | undefined
  });
  const [isCreating, setIsCreating] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !client && !authError) {
      navigate('/cliente/login');
    }
  }, [isLoading, client, authError, navigate]);

  const resetForm = () => {
    setCreateForm({
      rating: 0,
      feedback: '',
      suggestions: '',
      wouldRecommend: undefined
    });
  };

  const updateCreateForm = (field: keyof typeof createForm, value: any) => {
    setCreateForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const submitCreateSurvey = async () => {
    if (createForm.rating === 0) {
      setError('Por favor, selecione uma avaliação de 1 a 5 estrelas');
      return;
    }

    setIsCreating(true);
    setError(null);
    
    try {
      const response = await fetch('/api/clients/surveys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(createForm)
      });

      if (response.ok) {
        resetForm();
        setError(null);
        // Show success message temporarily
        setError('Feedback enviado com sucesso! Obrigado pela sua avaliação.');
        setTimeout(() => setError(null), 3000);
      } else {
        const result = await response.json();
        setError(result.error || 'Erro ao enviar feedback');
      }
    } catch (error) {
      console.error('Error creating survey:', error);
      setError('Erro ao enviar feedback');
    } finally {
      setIsCreating(false);
    }
  };


  const handleStarClick = (rating: number) => {
    updateCreateForm('rating', rating);
  };

  const renderStars = (rating: number, interactive: boolean = false, onClick?: (rating: number) => void) => {
    return (
      <div className="flex space-x-1">
        {Array.from({ length: 5 }, (_, i) => {
          const isActive = i < rating;
          const starRating = i + 1;
          
          return (
            <button
              key={i}
              type="button"
              className={`p-1 rounded transition-all duration-200 ${
                ''
              }`}
              onClick={() => interactive && onClick && onClick(starRating)}
              disabled={!interactive}
            >
              <Star
                className="w-6 h-6"
                style={{ 
                  color: isActive ? 'rgb(var(--star-active))' : 'rgb(var(--star-inactive))',
                  fill: isActive ? 'rgb(var(--star-active))' : 'transparent',
                  stroke: isActive ? 'rgb(var(--star-active))' : 'rgb(var(--star-inactive))',
                  strokeWidth: '1.5px'
                }}
              />
            </button>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="min-h-screen pt-16 flex items-center justify-center" style={{ background: 'var(--bg-cream-light)' }}>
          <div className="text-center">
            <div className="w-8 h-8 border-4 rounded-full animate-spin mx-auto mb-4" 
              style={{borderColor: 'var(--text-teal)', borderTopColor: 'transparent'}}></div>
            <p style={{ color: 'var(--text-dark-secondary)' }}>Carregando pesquisas...</p>
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
          
          {/* Header */}
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
                  Enviar Feedback
                </h1>
                <p style={{ color: 'var(--text-dark-secondary)' }}>
                  Compartilhe sua experiência conosco. Sua opinião é muito importante.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Feedback Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            {error && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${
                error.includes('sucesso') 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-dark-primary)' }}>
                  Avaliação * (1-5 estrelas)
                </label>
                {renderStars(createForm.rating, true, handleStarClick)}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-dark-primary)' }}>
                  Comentário (opcional)
                </label>
                <textarea
                  value={createForm.feedback}
                  onChange={(e) => updateCreateForm('feedback', e.target.value)}
                  placeholder="Conte-nos sobre sua experiência com nossos serviços..."
                  rows={3}
                  className="w-full p-3 border rounded-lg"
                  style={{ 
                    borderColor: 'var(--border-gray)',
                    backgroundColor: '#FFFFFF'
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-dark-primary)' }}>
                  Sugestões (opcional)
                </label>
                <textarea
                  value={createForm.suggestions}
                  onChange={(e) => updateCreateForm('suggestions', e.target.value)}
                  placeholder="Como podemos melhorar nossos serviços? Deixe suas sugestões..."
                  rows={3}
                  className="w-full p-3 border rounded-lg"
                  style={{ 
                    borderColor: 'var(--border-gray)',
                    backgroundColor: '#FFFFFF'
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-dark-primary)' }}>
                  Você recomendaria nossos serviços?
                </label>
                <div className="flex space-x-4">
                  <button
                    onClick={() => updateCreateForm('wouldRecommend', true)}
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg border"
                    style={{ 
                      background: createForm.wouldRecommend === true ? 'var(--btn-ver-planos-bg)' : 'var(--bg-beige)',
                      color: createForm.wouldRecommend === true ? 'var(--btn-ver-planos-text)' : 'var(--text-dark-secondary)',
                      borderColor: createForm.wouldRecommend === true ? 'transparent' : 'var(--border-gray)'
                    }}
                  >
                    <Check className="w-4 h-4" style={{ 
                      color: createForm.wouldRecommend === true ? 'var(--btn-ver-planos-text)' : 'var(--text-dark-secondary)' 
                    }} />
                    <span>Sim</span>
                  </button>
                  <button
                    onClick={() => updateCreateForm('wouldRecommend', false)}
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg border"
                    style={{ 
                      background: createForm.wouldRecommend === false ? 'var(--btn-ver-planos-bg)' : 'var(--bg-beige)',
                      color: createForm.wouldRecommend === false ? 'var(--btn-ver-planos-text)' : 'var(--text-dark-secondary)',
                      borderColor: createForm.wouldRecommend === false ? 'transparent' : 'var(--border-gray)'
                    }}
                  >
                    <X className="w-4 h-4" style={{ 
                      color: createForm.wouldRecommend === false ? 'var(--btn-ver-planos-text)' : 'var(--text-dark-secondary)' 
                    }} />
                    <span>Não</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={submitCreateSurvey}
                disabled={isCreating || createForm.rating === 0}
                className="px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50 min-w-[160px]"
                style={{ background: 'var(--btn-ver-planos-bg)', color: 'var(--btn-ver-planos-text)' }}
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  'Enviar Feedback'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
      <Footer />
    </>
  );
}