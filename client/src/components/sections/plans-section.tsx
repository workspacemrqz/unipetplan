// Interface local para compatibilidade
interface Plan {
  id: string;
  name: string;
  price: number;
  basePrice?: string | number; // ✅ Adicionar campo basePrice
  description: string;
  features: string[];
  buttonText?: string;
  planType?: string;
  image?: string;
  displayOrder?: number;
}
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

import { useParallelData } from "@/hooks/use-parallel-data";
import { AnimatedSection } from "@/components/ui/animated-section";
import { smoothScrollToSection } from "@/lib/scroll-utils";
import { Pricing } from "@/components/blocks/pricing";

// Mapeamento de IDs para índices numéricos baseado em displayOrder
const PLAN_URL_MAPPINGS: Record<string, string> = {
  '87aee1ab-774f-45bb-b43f-a4ca46ab21e5': '1',  // Plano Básico (displayOrder: 1)
  '8e5dba0c-1ae1-44f6-a341-5f0139c1ec16': '2',  // Plano Intermediário (displayOrder: 2)
  '734da3d8-a66f-4b44-ae63-befc6a3307fd': '3',  // Plano Premium (displayOrder: 3)
  'b48fabf4-1644-46e1-99c8-f8187de286ad': '4'   // Plano Emergência (displayOrder: 4)
};

// Mapeamento dinâmico de nomes de planos para IDs de seções
const getPlanSectionId = (planName: string): string => {
  const name = planName.toLowerCase();
  if (name === 'básico') return 'plan-basic-details';
  if (name === 'plano intermediário') return 'plan-comfort-details';
  if (name === 'plano completo') return 'plan-comfort-details';
  if (name === 'plano premium') return 'plan-platinum-details';
  if (name === 'plano emergência') return 'plan-infinity-details';
  
  // Fallback para nomes não mapeados
  return `plan-${name.replace(/\s+/g, '-')}-details`;
};


interface PlansSectionProps {
  showTitle?: boolean;
  showBackground?: boolean;
  removePadding?: boolean;
}

export default function PlansSection({ 
  showTitle = true, 
  showBackground = true, 
  removePadding = false 
}: PlansSectionProps) {
  const [location, navigate] = useLocation();
  const queryClient = useQueryClient();

  // Função para scroll suave para detalhes do plano
  const scrollToPlanDetails = (planName: string) => {
    // Verificar se estamos na página de planos ou na home
    const isPlansPage = location === '/planos';

    if (isPlansPage) {
      // Se já estamos na página de planos, fazer scroll suave
      const sectionId = getPlanSectionId(planName);
      smoothScrollToSection(sectionId);
    } else {
      // Se estamos na home, redirecionar para a página de planos
      // Primeiro navegar para a página de planos
      navigate('/planos');

      // Depois de um pequeno delay, fazer scroll para a seção específica
      setTimeout(() => {
        const sectionId = getPlanSectionId(planName);
        smoothScrollToSection(sectionId);
      }, 100);
    }
  };



  // Usar hook otimizado para carregamento paralelo de dados da home
  const { data, isLoading, hasError } = useParallelData({ plans: true });
  const plansData = data?.plans || [];
  const error = hasError;

  // Combinar todos os planos e ordenar por displayOrder
  const sortPlans = (plans: Plan[]) => [...plans].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  const allPlans = sortPlans(plansData);



  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[var(--bg-teal)] to-[var(--bg-teal-dark)] py-12">
        <div className="container mx-auto px-4">
          {showTitle && (
            <div className="text-center mb-12 sm:mb-16">
              <h1 className="text-[28px] md:text-[36px] font-bold text-[var(--text-light)] mb-4">Nossos Planos</h1>
              <p className="text-xl text-[var(--text-light)] mb-8">Encontre o plano ideal para seu pet</p>
            </div>
          )}
          <div className="text-center py-12">
            <p className="text-[var(--text-light)] text-lg">Carregando planos...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[var(--bg-teal)] to-[var(--bg-teal-dark)] flex items-center justify-center">
        <div className="text-center text-white max-w-md mx-auto px-4">
          <h2 className="text-2xl font-bold mb-4">Ops! Algo deu errado</h2>
          <p className="text-lg mb-6">Não conseguimos carregar os planos no momento. Por favor, tente acessar novamente mais tarde.</p>
        </div>
      </div>
    );
  }

  // If no plans available, show a friendly message
  if (!isLoading && (!plansData || plansData.length === 0)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[var(--bg-teal)] to-[var(--bg-teal-dark)] flex items-center justify-center">
        <div className="text-center text-white max-w-md mx-auto px-4">
          <h2 className="text-2xl font-bold mb-4">Planos em Breve!</h2>
          <p className="text-lg mb-6">Estamos preparando os melhores planos para seu pet. Volte em breve!</p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['plans'] })}
            className="bg-[var(--bg-gold)] text-[var(--text-teal)] px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Atualizar Página
          </button>
        </div>
      </div>
    );
  }

  // Mapear dados existentes para a nova interface
  const pricingPlans = allPlans.map((plan, index) => {
    // Determinar qual ícone usar baseado no ID do plano
    let image = plan.image;
    if (plan.id === 'ec994283-76de-4605-afa3-0670a8a0a475') {
      image = '/BASICicon.svg';
    } else if (plan.id === '7a8c94f9-1336-495f-a771-12755bfd4921') {
      image = '/INFINITY.svg';
    } else if (plan.id === '20f78143-ae37-4438-ab4b-57380fb17818') {
      image = '/PLATINUM.svg';
    } else if (plan.id === '887dd8ae-1885-4d66-bc65-0ec460912c59') {
      image = '/COMFORT.svg';
    }

    return {
      id: plan.id,
      name: plan.name,
      price: plan.price,
      basePrice: plan.basePrice || 0, // ✅ Adicionar campo basePrice com fallback
      period: "mês",
      features: plan.features,
      description: plan.description || "",
      buttonText: plan.buttonText || `Contratar Plano ${plan.name}`,
      href: undefined as string | undefined,
      isPopular: plan.id === '887dd8ae-1885-4d66-bc65-0ec460912c59', // INFINITY é o plano mais popular
      planType: plan.planType,
      image: image || '/default-plan.svg'
    };
  });

  return (
    <section 
      id="planos" 
      className={`${location === '/planos' ? 'pb-20' : 'py-20'} ${showBackground ? 'bg-[#277677]' : ''}`}
    >
      <div className="section-container">
        {showTitle && (
            <AnimatedSection animation="slideUp" delay={50}>
              <div className="text-center mb-12 sm:mb-16">
                <h1 className="text-[28px] md:text-[36px] font-bold text-[var(--text-light)] mb-4">
                  Nossos <span className="text-[var(--text-gold)]">Planos</span>
                </h1>
                <p className="text-xl text-[var(--text-light)] mb-8">
                  Escolha a proteção ideal <br className="sm:hidden" />
                  para seu melhor amigo
                </p>
              </div>
            </AnimatedSection>
          )}
          
          <Pricing 
            plans={pricingPlans}
            onPlanSelect={(plan) => {

              // Redirecionar diretamente para /checkout com o ID do plano para ir direto para etapa "Dados do Pet"
              navigate(`/checkout/${plan.id}`);
            }}
            onPlanDetails={scrollToPlanDetails}
          />
      </div>
    </section>
  );
}