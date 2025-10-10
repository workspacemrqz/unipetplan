import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Phone, Mail, Facebook, Instagram, Linkedin, Youtube } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { apiRequest } from "@/lib/queryClient";
import { useSiteSettingsWithDefaults } from "@/hooks/use-site-settings";
import { useWhatsAppRedirect } from "@/hooks/use-whatsapp-redirect";
import { usePlans, getPlanDisplayText } from "@/hooks/use-plans";
import { useSpecies } from "@/hooks/use-species";
import { AnimatedSection } from "@/components/ui/animated-section";

const contactFormSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
  city: z.string().min(2, "Cidade é obrigatória"),
  petName: z.string().min(1, "Nome do pet é obrigatório"),
  animalType: z.string().min(1, "Tipo de animal é obrigatório"),
  petAge: z.string().min(1, "Idade do pet é obrigatória"),
  planInterest: z.string().min(1, "Selecione um plano").refine((val) => val.trim().length > 0, {
    message: "Selecione um plano válido"
  }),
  message: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

export default function Contact() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { settings, shouldShow } = useSiteSettingsWithDefaults();
  const { getWhatsAppLink } = useWhatsAppRedirect();
  const { data: plans, isLoading: plansLoading, error: plansError } = usePlans();
  const { data: species, isLoading: speciesLoading } = useSpecies();

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      city: "",
      petName: "",
      animalType: "",
      petAge: "",
      planInterest: "",
      message: "",
    },
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      await apiRequest('POST', '/api/contact', data);
      
      // Notificação de sucesso removida
      
      form.reset();
    } catch (error) {
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="page-section" style={{background: 'var(--bg-teal)'}}>
      <div className="section-container">
        <div className="page-header">
          <AnimatedSection animation="slideUp" delay={100}>
            <h1 className="page-title text-[var(--text-light)]">
              Entre em <span className="text-[var(--text-gold)]">contato</span>
            </h1>
          </AnimatedSection>
          <AnimatedSection animation="slideUp" delay={200}>
            <p className="page-subtitle text-[var(--text-light)]">
              Tire suas dúvidas ou solicite uma cotação personalizada
            </p>
          </AnimatedSection>
        </div>

        <div className="flex justify-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-4 items-start max-w-6xl w-full p-0 m-0">
            {/* Contact Form */}
            <AnimatedSection animation="slideRight" delay={300}>
              <div className="pr-0 lg:pr-2">
              <Card className="unipet-card shadow-lg rounded-xl border-none">
                <CardHeader className="flex flex-col space-y-1.5 p-4 sm:p-6 bg-[var(--bg-cream-light)] text-[var(--text-light)] rounded-t-xl">
                  <CardTitle className="tracking-tight text-[var(--text-teal)] text-xl sm:text-2xl lg:text-[26px] font-semibold">Solicitar Cotação</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 text-[var(--text-dark-primary)] bg-[var(--bg-cream-light)] rounded-b-xl">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem className="contact-form-field">
                              <FormLabel>Nome Completo</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Seu nome completo" 
                                  className="mobile-form-input"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem className="contact-form-field">
                              <FormLabel>E-mail</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="seu@email.com" 
                                  className="mobile-form-input"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem className="contact-form-field">
                              <FormLabel>Telefone</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="(11) 99999-9999" 
                                  className="mobile-form-input"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem className="contact-form-field">
                              <FormLabel>Cidade</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Sua cidade" 
                                  className="mobile-form-input"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="petName"
                        render={({ field }) => (
                          <FormItem className="contact-form-field">
                            <FormLabel>Nome do Pet</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Nome do seu pet" 
                                className="mobile-form-input"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="animalType"
                          render={({ field }) => (
                            <FormItem className="contact-form-field">
                              <FormLabel>Tipo de Animal</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="mobile-form-input [&>span]:text-left [&>span]:flex [&>span]:flex-col [&>span]:items-start">
                                    <SelectValue placeholder="Selecione..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {speciesLoading ? (
                                    <SelectItem value="loading" disabled>
                                      Carregando espécies...
                                    </SelectItem>
                                  ) : (
                                    (species || []).flatMap((speciesItem, index, array) => [
                                      <SelectItem key={speciesItem.id} value={speciesItem.name}>
                                        {speciesItem.name}
                                      </SelectItem>,
                                      ...(index < array.length - 1 ? [<SelectSeparator key={`separator-${speciesItem.id}`} />] : [])
                                    ])
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="petAge"
                          render={({ field }) => (
                            <FormItem className="contact-form-field">
                              <FormLabel>Idade do Pet</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="mobile-form-input [&>span]:text-left [&>span]:flex [&>span]:flex-col [&>span]:items-start">
                                    <SelectValue placeholder="Selecione..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="0-1">0-1 ano</SelectItem>
                                  <SelectSeparator />
                                  <SelectItem value="1-3">1-3 anos</SelectItem>
                                  <SelectSeparator />
                                  <SelectItem value="3-7">3-7 anos</SelectItem>
                                  <SelectSeparator />
                                  <SelectItem value="7+">7+ anos</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="planInterest"
                        render={({ field }) => (
                          <FormItem className="contact-form-field">
                            <FormLabel>Plano de Interesse</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger className="mobile-form-input [&>span]:text-left [&>span]:flex [&>span]:flex-col [&>span]:items-start">
                                  <SelectValue placeholder="Selecione um plano..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {plansLoading ? (
                                  <SelectItem value="loading" disabled>
                                    Carregando planos...
                                  </SelectItem>
                                ) : plansError ? (
                                  <SelectItem value="error" disabled>
                                    Erro ao carregar planos
                                  </SelectItem>
                                ) : plans && plans.length > 0 ? (
                                  plans
                                    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                                    .map((plan, index) => (
                                      <React.Fragment key={plan.id}>
                                        <SelectItem value={plan.name}>
                                          {getPlanDisplayText(plan)}
                                        </SelectItem>
                                        {index < plans.length - 1 && <SelectSeparator />}
                                      </React.Fragment>
                                    ))
                                ) : (
                                  <SelectItem value="no-plans" disabled>
                                    Nenhum plano disponível
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem className="contact-form-field">
                            <FormLabel>Mensagem (Opcional)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Conte-nos mais sobre suas necessidades..."
                                rows={4}
                                className="mobile-form-input"
                                style={{resize: 'none'}}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        className="w-full unipet-button-primary text-base sm:text-lg py-3 sm:py-4 text-[var(--text-light)] mobile-touch-target transition-transform duration-300 hover:scale-95"
                        style={{
                          background: 'var(--btn-cotacao-gratuita-bg)',
                          border: 'none'
                        }}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Enviando..." : "Solicitar Cotação Gratuita"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
              </div>
            </AnimatedSection>

            {/* Contact Information */}
            <AnimatedSection animation="slideLeft" delay={400} className="overflow-visible">
              <div className="pl-0 lg:pl-2 space-y-6 mt-5 lg:mt-0" style={{overflow: 'visible'}}>
                <div className="rounded-xl w-full" style={{backgroundColor: '#277677', border: '2px solid rgba(255, 255, 255, 0.2)', position: 'relative'}}>
                  <div className="p-6 sm:p-8 text-left">
                    <div className="mb-6">
                      <div className="text-xl sm:text-2xl font-bold text-[var(--text-light)] mb-3">
                        Outras Formas de Contato
                      </div>
                      <div className="w-12 h-0.5 bg-[var(--bg-gold)]"></div>
                    </div>
                    <div className="space-y-5 text-sm sm:text-base">
                      {shouldShow.phone && (
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full bg-[var(--bg-gold)] flex items-center justify-center flex-shrink-0">
                            <Phone className="h-4 w-4 text-[var(--text-light)]" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-[var(--text-light)] text-sm">Telefone</div>
                            <div className="text-[var(--text-light)] opacity-80">{settings.phone}</div>
                          </div>
                        </div>
                      )}

                      {shouldShow.email && (
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full bg-[var(--bg-gold)] flex items-center justify-center flex-shrink-0">
                            <Mail className="h-4 w-4 text-[var(--text-light)]" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-[var(--text-light)] text-sm">E-mail</div>
                            <div className="text-[var(--text-light)] opacity-80">{settings.email}</div>
                          </div>
                        </div>
                      )}

                      {shouldShow.whatsapp && (
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full bg-[var(--bg-gold)] flex items-center justify-center flex-shrink-0">
                            <FaWhatsapp className="h-4 w-4 text-[var(--text-light)]" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-[var(--text-light)] text-sm">WhatsApp</div>
                            <a 
                              href={getWhatsAppLink()}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[var(--text-light)] opacity-80 transition-colors cursor-pointer"
                            >
                              {settings.whatsapp}
                            </a>
                          </div>
                        </div>
                      )}

                      {shouldShow.address && (
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full bg-[var(--bg-gold)] flex items-center justify-center flex-shrink-0">
                            <svg className="h-4 w-4 text-[var(--text-light)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-[var(--text-light)] text-sm">Endereço</div>
                            <div className="text-[var(--text-light)] opacity-80">{settings.address}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Social Media */}
                {(shouldShow.facebookUrl || shouldShow.instagramUrl || shouldShow.linkedinUrl || shouldShow.youtubeUrl) && (
                  <div className="rounded-xl w-full" style={{backgroundColor: '#277677', border: '2px solid rgba(255, 255, 255, 0.2)', position: 'relative'}}>
                    <div className="p-6 sm:p-8 text-left">
                      <div className="mb-6">
                        <div className="text-xl sm:text-2xl font-bold text-[var(--text-light)] mb-3">Siga-nos</div>
                        <div className="w-12 h-0.5 bg-[var(--bg-gold)]"></div>
                      </div>
                      <div className="flex space-x-4">
                        {shouldShow.facebookUrl && (
                          <a href={settings.facebookUrl || undefined} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--bg-cream-light)] text-[var(--text-teal)] transition-all duration-300 hover:scale-95">
                            <Facebook className="h-4 w-4" />
                          </a>
                        )}
                        {shouldShow.instagramUrl && (
                          <a href={settings.instagramUrl || undefined} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--bg-cream-light)] text-[var(--text-teal)] transition-all duration-300 hover:scale-95">
                            <Instagram className="h-4 w-4" />
                          </a>
                        )}
                        {shouldShow.linkedinUrl && (
                          <a href={settings.linkedinUrl || undefined} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--bg-cream-light)] text-[var(--text-teal)] transition-all duration-300 hover:scale-95">
                            <Linkedin className="h-4 w-4" />
                          </a>
                        )}
                        {shouldShow.youtubeUrl && (
                          <a href={settings.youtubeUrl || undefined} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--bg-cream-light)] text-[var(--text-teal)] transition-all duration-300 hover:scale-95">
                            <Youtube className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Service Hours */}
                {shouldShow.businessHours && (
                  <div className="rounded-xl w-full" style={{backgroundColor: '#277677', border: '2px solid rgba(255, 255, 255, 0.2)', position: 'relative'}}>
                    <div className="p-6 sm:p-8 text-center">
                      <div className="flex items-center justify-center mb-4">
                        <div className="text-xl sm:text-2xl font-bold text-[var(--text-light)]">
                          Horário de Atendimento
                        </div>
                      </div>
                      <div className="text-[var(--text-light)] text-sm sm:text-base leading-relaxed">
                        {settings.businessHours}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </AnimatedSection>
          </div>
        </div>
      </div>
    </main>
  );
}