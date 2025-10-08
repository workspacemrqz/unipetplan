import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, DollarSign, Clock, Heart } from "lucide-react";
import { useLocation } from "wouter";
import { useWhatsAppRedirect } from "@/hooks/use-whatsapp-redirect";
import { AnimatedSection } from "@/components/ui/animated-section";
import { useSiteSettingsWithDefaults } from "@/hooks/use-site-settings";
import { Typewriter } from "@/components/ui/typewriter";

export default function Hero() {
  const [, setLocation] = useLocation();
  const { } = useWhatsAppRedirect();
  const { settings } = useSiteSettingsWithDefaults();


  const benefits = [
    {
      icon: CheckCircle,
      text: "Sem carência de início"
    },
    {
      icon: DollarSign,
      text: "A partir de R$20/mês"
    },
    {
      icon: Clock,
      text: "Agendamento rápido"
    },
    {
      icon: Heart,
      text: "Atendimento emergencial 24h"
    }
  ];

  return (
    <>
      <section className="min-h-screen flex items-center bg-[var(--bg-cream-light)] pt-4 pb-12 sm:py-0">
        <div className="section-container">
          <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 items-center">
            <div className="order-2 lg:order-1">
              <AnimatedSection animation="slideUp" delay={100}>
                <h1
                  className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-[var(--text-dark-primary)] leading-tight"
                >
                  Cuidado completo para o seu{" "}
                  <span style={{color: 'var(--text-gold)'}}>
                    <Typewriter
                      text={[
                        "melhor amigo",
                        "companheiro de quatro patas",
                        "membro da família",
                        "xodó da casa",
                        "pet"
                      ]}
                      speed={100}
                      waitTime={3000}
                      deleteSpeed={50}
                      loop={true}
                      showCursor={true}
                      cursorChar="|"
                      cursorClassName="ml-1"
                    />
                  </span>
                </h1>
              </AnimatedSection>
              <AnimatedSection animation="slideUp" delay={200}>
                <p className="text-base sm:text-lg lg:text-xl mb-4 sm:mb-6 leading-snug text-[var(--text-dark-primary)] font-normal">
                  Planos de saúde pet sem carência, cobertura para animais domésticos e Silvestres com preços acessíveis a partir de R$20/mês.
                </p>
              </AnimatedSection>

              {/* Key Benefits */}
              <AnimatedSection animation="slideUp" delay={300}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6">
                  {benefits.map((benefit, index) => {
                    const Icon = benefit.icon;
                    return (
                      <div key={index} className="flex items-center space-x-2">
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-[var(--text-teal)] flex-shrink-0" />
                        <span className="text-[var(--text-dark-primary)] text-sm sm:text-base">{benefit.text}</span>
                      </div>
                    );
                  })}
                </div>
              </AnimatedSection>

              <AnimatedSection animation="slideUp" delay={400}>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button
                  className="text-base sm:text-lg font-semibold px-6 sm:px-8 py-3 sm:py-4 rounded-md h-12 sm:h-14 min-w-0 sm:min-w-[150px] transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-teal-500/25"
                  style={{
                    background: 'var(--btn-ver-planos-bg)',
                    color: 'var(--btn-ver-planos-text)',
                    border: 'none',
                    cursor: 'pointer',

                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onClick={() => {
                    setLocation('/planos');
                    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
                  }}
                >
                  Ver Planos
                </button>
                <button
                  className="text-base sm:text-lg font-semibold px-6 sm:px-8 py-3 sm:py-4 rounded-md h-12 sm:h-14 min-w-0 sm:min-w-[180px] transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-teal-500/25"
                  style={{
                    background: 'var(--btn-solicitar-cotacao-bg)',
                    color: 'var(--btn-solicitar-cotacao-text)',
                    border: '1px solid var(--btn-solicitar-cotacao-border)',
                    cursor: 'pointer',

                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onClick={() => window.open('https://wa.me/558632327374', '_blank')}
                >
                  Solicitar Cotação
                </button>
                </div>
              </AnimatedSection>
            </div>

            <div className="relative order-1 lg:order-2 mb-8 lg:mb-0">
              <AnimatedSection animation="slideLeft" delay={150}>
                {settings?.mainImageUrl && (
                  <div 
                    className="relative rounded-2xl overflow-hidden shadow-2xl"
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
                      src={settings.mainImageUrl}
                      alt="Família feliz com seus pets"
                      className="w-full h-full object-cover object-center"
                      loading="lazy"
                      key={settings.mainImageUrl}
                    />
                  </div>
                )}
              </AnimatedSection>

              <AnimatedSection animation="scale" delay={500}>
                {/* Floating Stats Card */}
                <Card className="absolute -bottom-3 -left-3 sm:-bottom-6 sm:-left-6 shadow-xl rounded-xl border-0 hero-stats-card">
                  <CardContent 
                    className="p-3 sm:p-6 text-center rounded-xl card-content"
                    style={{
                      background: 'var(--btn-solicitar-cotacao-hover)',
                      border: '1px solid var(--bg-teal-light)',
                      color: 'var(--text-light)'
                    }}
                  >
                    <div className="text-lg sm:text-2xl font-bold mb-1" style={{color: 'var(--text-light)'}}>
                      50.000+
                    </div>
                    <div className="text-xs sm:text-sm" style={{color: 'var(--text-light)', opacity: '0.9'}}>Pets Atendidos</div>
                  </CardContent>
                </Card>
              </AnimatedSection>
            </div>
          </div>
        </div>
      </section>


    </>
  );
}
