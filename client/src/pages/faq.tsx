import FaqSection from "@/components/sections/faq-section";
import { Suspense } from 'react';

// Componente de fallback para carregamento
const LoadingFallback = () => (
  <div className="py-20 flex items-center justify-center">
    <div className="text-lg text-[var(--text-light)]">Carregando...</div>
  </div>
);

export default function FAQ() {
  return (
    <main className="pt-16">
      {/* FAQ Section - idêntica à página inicial mas sem limite de items */}
      <Suspense fallback={<LoadingFallback />}>
        <FaqSection 
          showTitle={true}
          showViewMoreButton={false}
          className="py-20"
          customColors={{
            background: 'var(--bg-teal)',
            titleColor: 'var(--text-light)',
            subtitleColor: 'var(--text-light)'
          }}
        />
      </Suspense>
    </main>
  );
}