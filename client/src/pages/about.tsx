import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSiteSettingsWithDefaults } from "@/hooks/use-site-settings";
import { AnimatedSection } from "@/components/ui/animated-section";
// ByteaImageDisplay removed - now using Supabase Storage images

export default function About() {
  const { settings, shouldShow } = useSiteSettingsWithDefaults();

  const values = [
    {
      title: "Missão",
      content: <span style={{color: '#303030'}}>Garantir que todos os pets tenham acesso a cuidados de saúde de qualidade, proporcionando tranquilidade às famílias brasileiras que amam seus animais de estimação.</span>
    },
    {
      title: "Visão",
      content: <span style={{color: '#303030'}}>Ser a principal referência em planos de saúde para pets no Brasil, reconhecida pela excelência no atendimento e compromisso com o bem-estar animal.</span>
    },
    {
      title: "Valores",
      content: <span style={{color: '#303030'}}>Transparência, comprometimento com o bem-estar animal, atendimento humanizado, preços justos e acessibilidade para todas as famílias brasileiras.</span>
    }
  ];

  return (
    <main className="page-section bg-primary">
      <div className="section-container">
        {/* Header */}
        <div className="page-header">
          <AnimatedSection animation="slideUp" delay={100}>
            <h1 className="page-title text-foreground">
              <span className="text-primary-foreground">Sobre a</span> <span className="text-gold">UNIPET PLAN</span>
            </h1>
          </AnimatedSection>
        </div>

        {/* Company Story */}
        <div className={`grid ${settings?.aboutImageUrl ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} gap-12 md:gap-16 lg:gap-20 items-center mb-20`}>
          {settings?.aboutImageUrl && (
            <AnimatedSection animation="slideRight" delay={200}>
              <div className="relative w-full mx-auto lg:mx-0" style={{ padding: '0', margin: '0' }}>
                <div 
                  className="relative rounded-2xl shadow-2xl overflow-hidden" 
                  style={{ 
                    position: 'relative',
                    aspectRatio: '7/6',
                    width: '100%',
                    height: 'auto',
                    overflow: 'hidden',
                    margin: '0',
                    padding: '0'
                  }}
                >
                  <img
                    src={settings.aboutImageUrl}
                    alt="Sobre a UNIPET PLAN"
                    className="w-full h-full object-cover object-center"
                    loading="lazy"
                  />
                </div>
              </div>
            </AnimatedSection>
          )}
          <div className={settings?.aboutImageUrl ? '' : 'max-w-4xl mx-auto'}>
            <AnimatedSection animation="slideLeft" delay={200}>
              <h2 className="section-title text-gold mb-6">Nossa História</h2>
            </AnimatedSection>
            <AnimatedSection animation="slideLeft" delay={300}>
              {shouldShow.ourStory && (
                <div className="text-lg leading-relaxed whitespace-pre-line text-primary-foreground">
                  {settings.ourStory}
                </div>
              )}
            </AnimatedSection>
          </div>
        </div>



        {/* Mission, Vision, Values */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mb-20">
          {values.map((item, index) => (
            <AnimatedSection key={index} animation="slideUp" delay={800 + (index * 200)}>
              <Card className="backdrop-blur-sm shadow-xl border-0 h-full bg-muted">
                <CardHeader>
                  <CardTitle className="text-2xl text-primary">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="leading-relaxed text-primary-foreground">{item.content}</p>
                </CardContent>
              </Card>
            </AnimatedSection>
          ))}
        </div>

        {/* Team Section */}
        <div className="text-center mb-16">
          <AnimatedSection animation="slideUp" delay={600}>
            <h2 className="page-title text-foreground">
              <span className="text-primary-foreground">Nosso</span> <span className="text-gold">Compromisso</span>
            </h2>
          </AnimatedSection>
          <div className="max-w-4xl mx-auto">
            <AnimatedSection animation="slideUp" delay={700}>
              <p className="page-subtitle leading-relaxed mb-8 text-primary-foreground">
                Nossa equipe é formada por veterinários, especialistas em seguros e profissionais
                apaixonados por animais. Trabalhamos incansavelmente para garantir que cada pet
                receba o cuidado que merece, quando precisa.
              </p>
            </AnimatedSection>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <AnimatedSection animation="slideUp" delay={800}>
                <Card className="backdrop-blur-sm shadow-xl border-0 h-full bg-muted">
                  <CardContent className="pt-6">
                    <h3 className="text-xl font-semibold text-primary mb-4">Atendimento Humanizado</h3>
                    <p className="text-primary-foreground">
                      <span style={{color: '#303030'}}>Tratamos cada pet como se fosse nosso, oferecendo cuidado personalizado
                      e suporte emocional para as famílias em momentos difíceis.</span>
                    </p>
                  </CardContent>
                </Card>
              </AnimatedSection>
              <AnimatedSection animation="slideUp" delay={900}>
                <Card className="backdrop-blur-sm shadow-xl border-0 h-full bg-muted">
                  <CardContent className="pt-6">
                    <h3 className="text-xl font-semibold text-primary mb-4">Inovação Constante</h3>
                    <p className="text-primary-foreground">
                      <span style={{color: '#303030'}}>Investimos continuamente em tecnologia e processos para tornar
                      o acesso aos cuidados veterinários mais fácil e eficiente.</span>
                    </p>
                  </CardContent>
                </Card>
              </AnimatedSection>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
