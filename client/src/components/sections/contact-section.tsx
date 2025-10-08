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

export default function ContactSection() {
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
      await apiRequest("POST", "/api/contact", data);
      // Notificação de sucesso removida
      form.reset();
    } catch (error) {
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-20 overflow-visible" style={{background: 'var(--bg-teal)'}}>
      <div className="section-container overflow-visible">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="font-bold mb-4 text-[28px] md:text-[36px]" style={{color: 'var(--text-light)'}}>
            Entre em <span style={{color: 'var(--text-gold)'}}>contato</span>
          </h2>
          <p className="text-[18px] font-normal" style={{color: 'var(--text-light)'}}>
            <span className="block sm:hidden">Tire suas dúvidas ou solicite<br />numa cotação personalizada</span>
            <span className="hidden sm:block">Tire suas dúvidas ou solicite uma cotação personalizada</span>
          </p>
        </div>

        <div className="flex justify-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-4 items-start max-w-6xl w-full p-0 m-0" style={{overflow: 'visible'}}>
            {/* Contact Form */}
            <div className="pr-0 lg:pr-2">
            <Card className="unipet-card shadow-lg rounded-xl border-0">
              <CardHeader className="flex flex-col space-y-1.5 p-4 sm:p-6 rounded-t-xl" style={{background: 'var(--bg-cream-light)', color: 'var(--text-light)'}}>
                <CardTitle className="tracking-tight text-xl sm:text-2xl lg:text-[26px] font-semibold" style={{color: 'var(--text-teal)'}}>Solicitar Cotação</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 rounded-b-xl" style={{color: 'var(--text-dark-primary)', background: 'var(--bg-cream-light)'}}>
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
                              <Input placeholder="Seu nome completo" className="mobile-form-input" {...field} />
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
                              <Input placeholder="seu@email.com" className="mobile-form-input" {...field} />
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
                              <Input placeholder="(11) 99999-9999" className="mobile-form-input" {...field} />
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
                              <Input placeholder="Sua cidade" className="mobile-form-input" {...field} />
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
                            <Input placeholder="Nome do seu pet" className="mobile-form-input" {...field} />
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
                                <SelectTrigger className="mobile-form-input">
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
                                <SelectTrigger className="mobile-form-input">
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
                              <SelectTrigger className="mobile-form-input">
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
                        className="w-full unipet-button-primary text-base sm:text-lg py-3 sm:py-4 mobile-touch-target transition-transform duration-300 hover:scale-95"
                        style={{
                          background: 'var(--btn-cotacao-gratuita-bg)',
                          border: 'none',
                          color: 'var(--btn-cotacao-gratuita-text)'
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

            {/* Contact Information Container */}
            <div className="space-y-6 pl-0 lg:pl-2 mt-5 lg:mt-0" style={{overflow: 'visible'}}>
            {/* Contact Information */}
            <div className="rounded-xl w-full" style={{backgroundColor: '#277677', border: '2px solid rgba(255, 255, 255, 0.2)', position: 'relative'}}>
              <div className="p-6 sm:p-8 text-left">
                <div className="mb-6">
                  <div className="text-xl sm:text-2xl font-bold mb-3" style={{color: 'var(--text-light)'}}>
                    Outras Formas de Contato
                  </div>
                  <div className="w-12 h-0.5" style={{background: 'var(--bg-gold)'}}></div>
                </div>
                <div className="space-y-5 text-sm sm:text-base">
                  {shouldShow.phone && (
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{background: 'var(--bg-gold)'}}>
                        <Phone className="h-4 w-4" style={{color: 'var(--text-light)'}} />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm" style={{color: 'var(--text-light)'}}>Telefone</div>
                        <div className="opacity-80" style={{color: 'var(--text-light)'}}>{settings.phone}</div>
                      </div>
                    </div>
                  )}

                  {shouldShow.email && (
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{background: 'var(--bg-gold)'}}>
                        <Mail className="h-4 w-4" style={{color: 'var(--text-light)'}} />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm" style={{color: 'var(--text-light)'}}>E-mail</div>
                        <div className="opacity-80" style={{color: 'var(--text-light)'}}>{settings.email}</div>
                      </div>
                    </div>
                  )}

                  {shouldShow.whatsapp && (
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{background: 'var(--bg-gold)'}}>
                        <FaWhatsapp className="h-4 w-4" style={{color: 'var(--text-light)'}} />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm" style={{color: 'var(--text-light)'}}>WhatsApp</div>
                        <a 
                          href={getWhatsAppLink()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="opacity-80 transition-colors cursor-pointer"
                          style={{color: 'var(--text-light)'}}
                        >
                          {settings.whatsapp}
                        </a>
                      </div>
                    </div>
                  )}

                  {shouldShow.address && (
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{background: 'var(--bg-gold)'}}>
                        <svg className="h-4 w-4" style={{color: 'var(--text-light)'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm" style={{color: 'var(--text-light)'}}>Endereço</div>
                        <div className="opacity-80" style={{color: 'var(--text-light)'}}>{settings.address}</div>
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
                    <div className="text-xl sm:text-2xl font-bold mb-3" style={{color: 'var(--text-light)'}}>Siga-nos</div>
                    <div className="w-12 h-0.5" style={{background: 'var(--bg-gold)'}}></div>
                  </div>
                  <div className="flex space-x-4">
                    {shouldShow.facebookUrl && (
                      <a href={settings.facebookUrl || undefined} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-95" style={{background: 'var(--bg-cream-light)', color: 'var(--text-teal)'}}>
                        <Facebook className="h-4 w-4" />
                      </a>
                    )}
                    {shouldShow.instagramUrl && (
                      <a href={settings.instagramUrl || undefined} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-95" style={{background: 'var(--bg-cream-light)', color: 'var(--text-teal)'}}>
                        <Instagram className="h-4 w-4" />
                      </a>
                    )}
                    {shouldShow.linkedinUrl && (
                      <a href={settings.linkedinUrl || undefined} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-95" style={{background: 'var(--bg-cream-light)', color: 'var(--text-teal)'}}>
                        <Linkedin className="h-4 w-4" />
                      </a>
                    )}
                    {shouldShow.youtubeUrl && (
                      <a href={settings.youtubeUrl || undefined} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-95" style={{background: 'var(--bg-cream-light)', color: 'var(--text-teal)'}}>
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
                    <div className="text-xl sm:text-2xl font-bold" style={{color: 'var(--text-light)'}}>
                      Horário de Atendimento
                    </div>
                  </div>
                  <div className="text-sm sm:text-base leading-relaxed" style={{color: 'var(--text-light)'}}>
                    {settings.businessHours}
                  </div>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}