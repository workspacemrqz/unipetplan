import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

export default function Testimonials() {

  const testimonials = [
    {
      name: "Maria Silva",
      location: "",
      initials: "MS",
      testimonial: "Minha Luna foi atendida super rápido quando precisou de uma cirurgia de emergência. Recomendo demais!"
    },
    {
      name: "Carlos Mendes",
      location: "",
      initials: "CM",
      testimonial: "O plano familiar cobriu tudo que meus dois cães precisaram. Desde vacinas até exames especializados."
    },
    {
      name: "Ana Costa",
      location: "",
      initials: "AC",
      testimonial: "Atendimento 24h salvou a vida do meu gato. A equipe é muito profissional. Indico para todos!"
    }
  ];

  const renderStars = () => (
    <div className="flex mb-4">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className="h-4 w-4 fill-current text-gold" />
      ))}
    </div>
  );

  return (
    <section className="py-20 text-teal bg-beige">
      <div className="section-container">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-[28px] md:text-[36px] font-bold mb-4 leading-tight text-foreground">
            <span className="block sm:inline">O que nossos</span> <span className="text-teal">clientes dizem</span>
          </h2>
          <p className="text-[18px] font-normal text-foreground">Depoimentos reais de quem<br className="lg:hidden" /><span className="lg:hidden"> </span>confia na UNIPET PLAN</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {testimonials.map((testimonial, index) => {
            return (
              <Card
                key={index}
                className="rounded-2xl shadow-lg border-0 h-[200px] sm:h-[260px] w-full max-w-[380px] sm:max-w-[420px] mx-auto flex flex-col bg-muted"

              >
                <CardContent className="pt-4 sm:pt-8 p-4 sm:p-6 flex flex-col flex-1 justify-center sm:justify-start">
                  <div className="flex items-center mb-4 sm:mb-6 flex-shrink-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold flex-shrink-0">
                      {testimonial.initials}
                    </div>
                    <div className="ml-3 sm:ml-4">
                      <h4 className="font-semibold text-sm sm:text-base text-foreground">{testimonial.name}</h4>
                      {testimonial.location && <p className="text-xs sm:text-sm text-foreground">{testimonial.location}</p>}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {renderStars()}
                  </div>
                  <p className="italic text-sm sm:text-base leading-relaxed flex-1 overflow-y-auto text-foreground">
                    "{testimonial.testimonial}"
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
