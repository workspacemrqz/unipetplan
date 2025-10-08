import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useFaqPageData } from "@/hooks/use-parallel-data";
import { FormattedText } from "@/components/ui/formatted-text";
import { Link } from "wouter";

interface FaqSectionProps {
  showTitle?: boolean;
  maxItems?: number;
  showViewMoreButton?: boolean;
  className?: string;
  customColors?: {
    background?: string;
    titleColor?: string;
    subtitleColor?: string;
  };
}

export default function FaqSection({ showTitle = true, maxItems, showViewMoreButton = false, className = "", customColors }: FaqSectionProps) {
  const { data } = useFaqPageData();
  const faqItems = data?.faq ?? [];
  const displayItems = maxItems ? faqItems.slice(0, maxItems) : faqItems;

  const bgColor = customColors?.background || "var(--bg-cream-light)";
  const titleColor = customColors?.titleColor || "var(--text-teal)";
  const subtitleColor = customColors?.subtitleColor || "var(--text-dark-primary)";

  return (
    <section className={`${className}`} style={{ background: bgColor }}>
      <div className="section-container">
        {showTitle && (
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-[28px] md:text-[36px] font-bold mb-4 leading-tight" style={{ color: titleColor }}>
              Tire suas <span className="text-[var(--text-gold)]">dúvidas</span>
            </h2>
            <p className="text-[18px] font-normal" style={{ color: subtitleColor }}>
              Selecionamos as perguntas mais comuns de nossos clientes
            </p>
          </div>
        )}

        <div className="max-w-4xl mx-auto">
          <Card className="bg-[var(--bg-cream-light)] border-none shadow-lg rounded-xl">
            <CardContent className="p-4 sm:p-6 px-6 sm:px-8">
              <Accordion type="single" collapsible className="space-y-4">
                {displayItems.map((faq) => (
                  <AccordionItem 
                    key={faq.id} 
                    value={`item-${faq.id}`}
                    className="border border-[var(--border-teal)]/20 rounded-lg bg-[var(--bg-cream-lighter)]"
                  >
                    <AccordionTrigger 
                      className="text-left py-4 hover:no-underline text-[var(--text-teal)] font-semibold text-sm lg:text-base"
                      data-testid={`faq-question-${faq.id}`}
                    >
                      <span className="px-6 flex-1">{faq.question}</span>
                    </AccordionTrigger>
                    <AccordionContent 
                      className="text-[var(--text-dark-primary)] leading-relaxed"
                      data-testid={`faq-answer-${faq.id}`}
                    >
                      <div className="px-6 pb-4">
                        <FormattedText 
                          text={faq.answer} 
                          className="whitespace-pre-wrap leading-relaxed"
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>

        {/* Botão Ver Mais */}
        {showViewMoreButton && maxItems && faqItems.length > maxItems && (
          <div className="text-center mt-8">
            <Button
              asChild
              className="unipet-button-primary text-base sm:text-lg font-semibold px-6 sm:px-8 py-3 sm:py-4 rounded-md h-12 sm:h-14 min-w-0 sm:min-w-[150px] border-none inline-block"
              style={{
                background: 'var(--btn-cotacao-gratuita-bg)',
                color: 'var(--btn-cotacao-gratuita-text)',
                border: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 'auto'
              }}
            >
              <Link href="/faq" className="transition-transform duration-300 hover:scale-95">
                Ver todas as dúvidas
              </Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}