import { lazy, Suspense, memo } from "react";
import Hero from "@/components/sections/hero";
import PlansSection from "@/components/sections/plans-section";
import Features from "@/components/sections/features";
import FaqSection from "@/components/sections/faq-section";

// Lazy load componentes não críticos para melhor performance inicial
const Testimonials = lazy(() => import("@/components/sections/testimonials").catch(() => ({ 
  default: () => (
    <div className="py-20 bg-[var(--bg-cream-light)] flex items-center justify-center">
      <div className="text-[var(--text-teal)] text-lg">Seção temporariamente indisponível</div>
    </div>
  )
})));

const AboutSection = lazy(() => import("@/components/sections/about-section").catch(() => ({ 
  default: () => (
    <div className="py-20 bg-[var(--bg-teal)] flex items-center justify-center">
      <div className="text-[var(--text-light)] text-lg">Seção temporariamente indisponível</div>
    </div>
  )
})));

const ContactSection = lazy(() => import("@/components/sections/contact-section").catch(() => ({ 
  default: () => (
    <div className="py-20 bg-[var(--bg-cream-light)] flex items-center justify-center">
      <div className="text-[var(--text-teal)] text-lg">Seção temporariamente indisponível</div>
    </div>
  )
})));

// Componente de fallback seguro
const SafeFallback = ({ message }: { message: string }) => (
  <div className="py-20 bg-[var(--bg-cream-light)] flex items-center justify-center">
    <div className="text-[var(--text-teal)] text-lg">{message}</div>
  </div>
);

// Placeholder para o LoadingFallback, que não foi fornecido no código original
const LoadingFallback = () => (
  <div className="py-20 flex items-center justify-center">
    <div className="text-lg">Carregando...</div>
  </div>
);


export default function Home() {
  try {
    return (
      <main className="pt-16">
        <Hero />
        <PlansSection />
        <Features />
        {/* FAQ Section */}
        <Suspense fallback={<LoadingFallback />}>
          <FaqSection 
            showTitle={true} 
            maxItems={6}
            showViewMoreButton={true}
            className="py-20"
            customColors={{
              background: 'var(--bg-teal)',
              titleColor: 'var(--text-light)',
              subtitleColor: 'var(--text-light)'
            }}
          />
        </Suspense>
        <Suspense fallback={<SafeFallback message="Carregando depoimentos..." />}>
          <Testimonials />
        </Suspense>
        <Suspense fallback={
          <div className="py-20 bg-[var(--bg-teal)] flex items-center justify-center">
            <div className="text-[var(--text-light)] text-lg">Carregando sobre nós...</div>
          </div>
        }>
          <AboutSection />
        </Suspense>
        <Suspense fallback={<SafeFallback message="Carregando contato..." />}>
          <ContactSection />
        </Suspense>
      </main>
    );
  } catch (error) {
    console.warn('Erro no componente Home:', error);

    // Renderizar apenas as seções essenciais em caso de erro
    return (
      <main className="pt-16">
        <Hero />
        <PlansSection />
        <Features />
      </main>
    );
  }
}