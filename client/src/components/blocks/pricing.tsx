"use client";

import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { Check, Star } from "lucide-react";
import { useLocation } from "wouter";
import { AnimatedSection } from "@/components/ui/animated-section";

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  basePrice?: string | number;
  period: string;
  features: string[];
  description?: string | undefined;
  buttonText: string;
  href?: string | undefined;
  isPopular: boolean;
  planType?: string | undefined;
  image?: string;
}

interface PricingProps {
  plans: PricingPlan[];
  onPlanSelect?: (plan: PricingPlan) => void;
  onPlanDetails?: (planName: string) => void;
}

export function Pricing({
  plans,
  onPlanSelect,
  onPlanDetails
}: PricingProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [, navigate] = useLocation();

  const handlePlanSelect = (plan: PricingPlan) => {
    if (onPlanSelect) {
      onPlanSelect(plan);
    } else {
      // Use the checkout route based on plan ID
      navigate(`/checkout?plan=${plan.id}`);
    }
  };

  const handlePlanDetails = (planName: string) => {
    if (onPlanDetails) {
      onPlanDetails(planName);
    }
  };

  // Função para obter texto de coparticipação
  const getCoParticipationText = (planType?: string): string => {
    return planType === "with_waiting_period" ? "Sem coparticipação" : "Com coparticipação";
  };

  return (
    <div className="w-full">
      <div className="w-full">
        <div className="flex flex-wrap justify-center gap-6 perspective-1000">
          {plans.map((plan, index) => (
            <AnimatedSection
              key={plan.id}
              animation="slideUp"
              delay={index * 80}
              duration={400}
              className={cn(
                "rounded-2xl border-[1px] bg-[var(--bg-cream-light)] text-center flex flex-col relative transform-style-preserve-3d backface-hidden transition-all duration-300 w-full max-w-[280px]",
                plan.isPopular ? "border-[var(--text-gold)] border-2" : "border-[var(--border-teal-light)]",
                // Apply 3D effects only on desktop and when there are exactly 3 plans visible
                isDesktop && plans.length >= 3 && [
                  index === 0 && "pricing-card-left",
                  index === 1 && plan.isPopular && "pricing-card-popular", 
                  index === 2 && "pricing-card-right"
                ]
              )}
            >
              {plan.isPopular && (
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
                      R$ {parseFloat(String(plan.basePrice || 0)).toFixed(2).replace('.', ',')}/{plan.period}
                    </span>
                  </div>

                  <p className="text-xs leading-5 text-[var(--text-dark-primary)] mb-4">
                    {plan.planType === "with_waiting_period" ? "faturamento anual" : "faturamento mensal"}
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

                  {/* Botão principal */}
                  <button
                    onClick={() => handlePlanSelect(plan)}
                    className={cn(
                      "group relative w-full gap-2 overflow-hidden text-lg font-semibold tracking-tighter mb-4",
                      "transform-gpu transition-all duration-300 ease-out",
                      "rounded-lg py-3 px-6",
                      "hover:-translate-y-1 hover:shadow-lg",
                      plan.isPopular
                        ? "text-[var(--btn-cotacao-gratuita-text)]"
                        : "text-[var(--btn-ver-planos-text)]"
                    )}
                    style={{
                      background: plan.isPopular 
                        ? 'var(--btn-cotacao-gratuita-bg)' 
                        : 'var(--btn-ver-planos-bg)',
                      border: 'none'
                    }}
                  >
                    {plan.buttonText}
                  </button>

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

                  {/* Link "Ver detalhes" */}
                  <button
                    className="w-full text-[var(--text-gold)] text-sm font-medium cursor-pointer flex items-center justify-center gap-1 hover:text-[var(--text-gold)]/80 transition-colors"
                    onClick={() => handlePlanDetails(plan.name)}
                  >
                    Ver detalhes
                  </button>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </div>
  );
}