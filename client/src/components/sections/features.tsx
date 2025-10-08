import { Button } from "@/components/ui/button";
import { Rocket, DollarSign, CalendarCheck, Heart, MapPin, UserCheck, Microscope, Phone } from "lucide-react";
import { useLocation } from "wouter";
import { AnimatedSection } from "@/components/ui/animated-section";
import { useSiteSettingsWithDefaults } from "@/hooks/use-site-settings";
import { cn } from "@/lib/utils";

export default function Features() {
  const [, setLocation] = useLocation();
  const { settings } = useSiteSettingsWithDefaults();

  const mainFeatures = [
    {
      icon: Rocket,
      title: "Início Imediato",
      description: "Sem carência, seu pet estará protegido desde o primeiro dia"
    },
    {
      icon: DollarSign,
      title: "Preços Acessíveis",
      description: "Planos a partir de R$20 para caber no seu orçamento"
    },
    {
      icon: CalendarCheck,
      title: "Agendamento Rápido",
      description: "Atendimento rápido para agendar consultas com facilidade"
    },
    {
      icon: Heart,
      title: "Rede 24h",
      description: "Atendimento 24 h para urgencia e emergência"
    }
  ];

  const networkFeatures = [
    {
      icon: MapPin,
      text: "Unidades em teresina e região"
    },
    {
      icon: UserCheck,
      text: "Veterinários especializados"
    },
    {
      icon: Microscope,
      text: "Equipamentos de última geração"
    },
    {
      icon: Phone,
      text: "Atendimento de emergência"
    }
  ];

  return (
    <section className="py-20" style={{background: 'var(--bg-cream-light)'}}>
      <div className="section-container">
        <div className="text-center mb-12 sm:mb-16">
          <AnimatedSection animation="slideUp" delay={100}>
            <h2 className="font-bold mb-4 text-[var(--text-dark-primary)] text-[25px] md:text-[36px] leading-tight">
              Por que escolher a <span className="text-[var(--text-teal)]">UNIPET PLAN?</span>
            </h2>
          </AnimatedSection>
          <AnimatedSection animation="slideUp" delay={200}>
            <p className="text-[18px] text-[var(--text-dark-primary)] max-w-2xl mx-auto font-normal"></p>
          </AnimatedSection>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 mb-16 sm:mb-20 relative z-10">
          {mainFeatures.map((feature, index) => (
            <Feature
              key={index}
              feature={feature}
              index={index}
            />
          ))}
        </div>

        </div>

      {/* Network Information */}
      <div className="section-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center relative z-10">
          {settings?.networkImageUrl && (
            <div className="order-2 lg:order-1">
              <AnimatedSection animation="slideRight" delay={500}>
                <div 
                  className="relative rounded-2xl overflow-hidden shadow-xl"
                  style={{ 
                    position: 'relative',
                    aspectRatio: '7/6',
                    width: '100%',
                    height: 'auto',
                    overflow: 'hidden',
                    margin: '0',
                    padding: '0',
                    border: '0',
                    boxSizing: 'border-box'
                  }}
                >
                  <img
                    src={settings.networkImageUrl}
                    alt="Rede credenciada de hospitais veterinários"
                    className="w-full h-full object-cover object-center"
                    loading="lazy"
                    key={settings.networkImageUrl}
                  />
                </div>
              </AnimatedSection>
            </div>
          )}
          <div className="order-1 lg:order-2">
            <AnimatedSection animation="slideLeft" delay={500}>
              <h3 className="sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 text-[var(--text-dark-primary)] text-[25px]">
                Rede Credenciada<br /><span className="text-[var(--text-teal)]">Hospital 24h</span>
              </h3>
            </AnimatedSection>
            <AnimatedSection animation="slideLeft" delay={600}>
              <p className="text-[var(--text-dark-primary)] text-sm sm:text-base lg:text-lg mb-4 sm:mb-6 leading-relaxed">
                <span className="network-text-break">
                  Tenha acesso a uma das maiores redes de hospitais veterinários do Brasil,
                  com atendimento 24 horas e profissionais especializados.
                </span>
              </p>
            </AnimatedSection>

            <AnimatedSection animation="slideLeft" delay={700}>
              <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                {networkFeatures.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div key={index} className="flex items-center space-x-3">
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-[var(--icon-teal)] flex-shrink-0" />
                      <span className="text-[var(--text-dark-primary)] text-sm sm:text-base">{item.text}</span>
                    </div>
                  );
                })}
              </div>
            </AnimatedSection>

            <AnimatedSection animation="scale" delay={800}>
              <Button
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 sm:h-12 px-4 py-2 unipet-button-primary text-[var(--btn-ver-planos-text)] mobile-touch-target w-full sm:w-auto transition-transform duration-300 hover:scale-95"
                style={{
                  background: 'var(--btn-ver-planos-bg)'
                }}
                onClick={() => {
                  setLocation('/rede-credenciada');
                  setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
                }}
              >
                Encontrar Unidade Próxima
              </Button>
            </AnimatedSection>
          </div>
        </div>
      </div>
    </section>
  );
}

const Feature = ({
  feature,
  index,
}: {
  feature: {
    icon: any;
    title: string;
    description: string;
  };
  index: number;
}) => {
  const Icon = feature.icon;

  return (
    <div
      className={cn(
        "flex flex-col py-10 relative group/feature",
        (index === 0 || index === 4) && "lg:border-l",
        index < 4 && "lg:border-b",
        // Adiciona borda direita apenas para os containers que não são o último
        index < 3 && "lg:border-r",
        // Desktop: Início Imediato (index 0) - bordas esquerda arredondadas
        index === 0 && "lg:rounded-l-lg lg:rounded-tr-none",
        // Desktop: Rede 24h (index 3) - bordas direita arredondadas
        index === 3 && "lg:rounded-r-lg",
        // Mobile: Início Imediato (index 0) - bordas topo arredondadas
        index === 0 && "rounded-t-lg",
        // Mobile: Rede 24h (index 3) - bordas base arredondadas
        index === 3 && "rounded-b-lg lg:rounded-b-none"
      )}
      style={{ background: 'var(--bg-teal)', color: 'var(--text-light)', borderColor: 'var(--border-teal)' }}
    >
      {index < 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full pointer-events-none" style={{ background: 'linear-gradient(to top, var(--overlay-light), transparent)' }} />
      )}
      {index >= 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full pointer-events-none" style={{ background: 'linear-gradient(to bottom, var(--overlay-light), transparent)' }} />
      )}

      <div className="mb-4 relative z-10 px-10">
        <Icon 
          className="h-6 w-6 sm:h-8 sm:w-8 transition-all duration-200 group-hover/feature:scale-110" 
          style={{
            color: 'var(--text-light)',
            transition: 'all 0.2s ease-in-out'
          }}
        />
      </div>

      <div className="text-lg font-bold mb-2 relative z-10 px-10">
        <div 
          className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full transition-all duration-200 origin-center" 
          style={{background: 'var(--text-light)'}} 
        />
        <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block" style={{color: 'var(--text-light)'}}>
          {feature.title}
        </span>
      </div>

      <p className="text-sm max-w-xs relative z-10 px-10" style={{color: 'var(--text-light)'}}>
        {feature.description}
      </p>
    </div>
  );
};
