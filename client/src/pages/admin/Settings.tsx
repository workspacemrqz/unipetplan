import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAdminLogger } from "@/hooks/admin/use-admin-logger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/admin/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { InputMasked } from "@/components/ui/input-masked";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/admin/queryClient";
import { insertSiteSettingsSchema, insertRulesSettingsSchema, insertChatSettingsSchema } from "@shared/schema";
import { Save, Loader2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SiteSettingsImageUpload } from "@/components/admin/ui/site-settings-image-upload";
import { ChatImageUpload } from "@/components/admin/ui/chat-image-upload";
import { Switch } from "@/components/admin/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select";
import { Separator } from "@/components/admin/ui/separator";
import CustomIcon from "@/components/admin/ui/CustomIcon";

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const hasInitializedRef = useRef(false);
  const { logAction } = useAdminLogger();

  const { data: siteSettings, isLoading: siteLoading } = useQuery({
    queryKey: ["/admin/api/settings/site"],
    queryFn: () => apiRequest("GET", "/admin/api/settings/site"),
    retry: 3,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const { data: rulesSettings, isLoading: rulesLoading } = useQuery({
    queryKey: ["/admin/api/settings/rules"],
    queryFn: () => apiRequest("GET", "/admin/api/settings/rules"),
    retry: 3,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const { data: chatSettings, isLoading: chatLoading } = useQuery({
    queryKey: ["/admin/api/settings/chat"],
    queryFn: () => apiRequest("GET", "/admin/api/settings/chat"),
    retry: 3,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });


  const siteForm = useForm({
    resolver: zodResolver(insertSiteSettingsSchema),
    defaultValues: {
      whatsapp: "",
      email: "",
      phone: "",
      instagramUrl: "",
      facebookUrl: "",
      linkedinUrl: "",
      youtubeUrl: "",
      cnpj: "",
      businessHours: "",
      ourStory: "",
      privacyPolicy: "",
      termsOfUse: "",
      address: "",
      mainImageUrl: "",
      networkImageUrl: "",
      aboutImageUrl: "",
    },
  });

  const rulesForm = useForm({
    resolver: zodResolver(insertRulesSettingsSchema),
    defaultValues: {
      fixedPercentage: 0,
      coparticipationPercentage: 10,
      defaultCpaPercentage: 0,
      defaultRecurringCommissionPercentage: 0,
    },
  });

  const chatForm = useForm({
    resolver: zodResolver(insertChatSettingsSchema),
    defaultValues: {
      welcomeMessage: "",
      placeholderText: "",
      chatTitle: "",
      buttonIcon: "MessageCircle",
      botIconUrl: "",
      userIconUrl: "",
      chatPosition: "bottom-right",
      chatSize: "md",
      isEnabled: true,
    },
  });


  const saveSiteMutation = useMutation({
    mutationFn: async (data: any) => {
      const result = await apiRequest("PUT", "/admin/api/settings/site", data);
      return result;
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["/admin/api/settings/site"] });
      await queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      
      await logAction({
        actionType: "updated",
        entityType: "settings",
        entityId: result?.id || "site-settings",
        metadata: {
          type: "site",
          action: "update_site_settings"
        }
      });
      
      toast({
        title: "Configurações salvas",
        description: "Configurações do site foram salvas com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao salvar configurações do site.",
        variant: "destructive",
      });
    },
  });

  const saveRulesMutation = useMutation({
    mutationFn: async (data: any) => {
      const result = await apiRequest("PUT", "/admin/api/settings/rules", data);
      return result;
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ["/admin/api/settings/rules"] });
      
      await logAction({
        actionType: "updated",
        entityType: "settings",
        entityId: result?.id || "rules-settings",
        metadata: {
          type: "rules",
          action: "update_rules_settings"
        }
      });
      
      toast({
        title: "Regras salvas",
        description: "Configurações de regras foram salvas com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao salvar configurações de regras.",
        variant: "destructive",
      });
    },
  });

  const saveChatMutation = useMutation({
    mutationFn: async (data: any) => {
      const result = await apiRequest("PUT", "/admin/api/settings/chat", data);
      return result;
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ["/admin/api/settings/chat"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/settings"] });
      
      await logAction({
        actionType: "updated",
        entityType: "settings",
        entityId: result?.id || "chat-settings",
        metadata: {
          type: "chat",
          action: "update_chat_settings"
        }
      });
      
      toast({
        title: "Configurações do chat salvas",
        description: "Configurações do chat foram salvas com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao salvar configurações do chat.",
        variant: "destructive",
      });
    },
  });


  // Initialize form ONCE on first load only - never reset after that to preserve user changes
  useEffect(() => {
    if (siteSettings && typeof siteSettings === 'object' && !siteLoading && !hasInitializedRef.current) {
      const mergedSettings = {
        whatsapp: (siteSettings as any).whatsapp || "",
        email: (siteSettings as any).email || "",
        phone: (siteSettings as any).phone || "",
        instagramUrl: (siteSettings as any).instagramUrl || "",
        facebookUrl: (siteSettings as any).facebookUrl || "",
        linkedinUrl: (siteSettings as any).linkedinUrl || "",
        youtubeUrl: (siteSettings as any).youtubeUrl || "",
        cnpj: (siteSettings as any).cnpj || "",
        businessHours: (siteSettings as any).businessHours || "",
        ourStory: (siteSettings as any).ourStory || "",
        privacyPolicy: (siteSettings as any).privacyPolicy || "",
        termsOfUse: (siteSettings as any).termsOfUse || "",
        address: (siteSettings as any).address || "",
        mainImageUrl: (siteSettings as any).mainImageUrl || "",
        networkImageUrl: (siteSettings as any).networkImageUrl || "",
        aboutImageUrl: (siteSettings as any).aboutImageUrl || ""
      };
      
      siteForm.reset(mergedSettings);
      hasInitializedRef.current = true;
    }
  }, [siteSettings, siteLoading, siteForm]);

  useEffect(() => {
    if (rulesSettings && typeof rulesSettings === 'object' && !rulesLoading) {
      const mergedRulesSettings = {
        fixedPercentage: Number((rulesSettings as any).fixedPercentage ?? 0),
        coparticipationPercentage: Number((rulesSettings as any).coparticipationPercentage ?? 10),
        defaultCpaPercentage: Number((rulesSettings as any).defaultCpaPercentage ?? 0),
        defaultRecurringCommissionPercentage: Number((rulesSettings as any).defaultRecurringCommissionPercentage ?? 0),
      };
      
      rulesForm.reset(mergedRulesSettings);
    }
  }, [rulesSettings, rulesLoading, rulesForm]);

  useEffect(() => {
    if (chatSettings && typeof chatSettings === 'object' && !chatLoading) {
      const mergedChatSettings = {
        welcomeMessage: (chatSettings as any).welcomeMessage || "",
        placeholderText: (chatSettings as any).placeholderText || "",
        chatTitle: (chatSettings as any).chatTitle || "",
        buttonIcon: (chatSettings as any).buttonIcon || "MessageCircle",
        botIconUrl: (chatSettings as any).botIconUrl || "",
        userIconUrl: (chatSettings as any).userIconUrl || "",
        chatPosition: (chatSettings as any).chatPosition || "bottom-right",
        chatSize: (chatSettings as any).chatSize || "md",
        isEnabled: (chatSettings as any).isEnabled ?? true,
      };
      
      chatForm.reset(mergedChatSettings);
    }
  }, [chatSettings, chatLoading, chatForm]);


  const onSubmitSite = (data: any) => {
    console.log('💾 [FORM] onSubmitSite called with data:', data);
    console.log('💾 [FORM] mainImageUrl:', data.mainImageUrl);
    console.log('💾 [FORM] networkImageUrl:', data.networkImageUrl);
    console.log('💾 [FORM] aboutImageUrl:', data.aboutImageUrl);
    
    // Remove apenas valores null e undefined, mas MANTER strings vazias para permitir limpeza de campos
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => 
        value !== null && value !== undefined
      )
    );
    
    console.log('💾 [FORM] Clean data to be sent:', cleanData);
    console.log('💾 [FORM] Image URLs in clean data:', {
      mainImageUrl: cleanData["mainImageUrl"],
      networkImageUrl: cleanData["networkImageUrl"],
      aboutImageUrl: cleanData["aboutImageUrl"]
    });
    
    saveSiteMutation.mutate(cleanData);
  };

  const onSubmitRules = (data: any) => {
    saveRulesMutation.mutate(data);
  };

  const onSubmitChat = (data: any) => {
    saveChatMutation.mutate(data);
  };


  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground break-words">Configurações</h1>
          <p className="text-sm text-muted-foreground">Gerencie as configurações do sistema</p>
        </div>
      </div>

      <Tabs defaultValue="site" className="space-y-4 sm:space-y-6">
        <TabsList 
          className="grid w-full grid-cols-3 gap-1 border border-[#eaeaea] bg-white shadow-sm rounded-md"
        >
          <TabsTrigger 
            value="site" 
            className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <CustomIcon name="Conteudo" className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="truncate">Geral</span>
          </TabsTrigger>
          <TabsTrigger 
            value="chat" 
            className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <CustomIcon name="Chat" className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="truncate">Chat</span>
          </TabsTrigger>
          <TabsTrigger 
            value="rules" 
            className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <CustomIcon name="Regras" className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="truncate">Regras</span>
          </TabsTrigger>
        </TabsList>

        {/* Site Settings */}
        <TabsContent value="site" className="space-y-4 sm:space-y-6">
          {siteLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
                    <div className="space-y-3">
                      <div className="h-10 bg-muted rounded"></div>
                      <div className="h-10 bg-muted rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-[#eaeaea] bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-foreground">
                  Configurações Gerais
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...siteForm}>
                  <form onSubmit={siteForm.handleSubmit(onSubmitSite)} className="space-y-4 sm:space-y-6">
                    <Accordion type="single" collapsible className="w-full">
                  
                  {/* Contact Information */}
                  <AccordionItem value="contact" data-testid="accordion-contact">
                    <AccordionTrigger className="flex items-center space-x-2">
                      <div>
                        <span>Informações de Contato</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        <FormField
                          control={siteForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <InputMasked 
                                  {...field} 
                                  type="email" 
                                  mask="email"
                                  data-testid="input-site-email" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={siteForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Telefone</FormLabel>
                              <FormControl>
                                <InputMasked 
                                  mask="phone"
                                  {...field} 
                                  data-testid="input-site-phone" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={siteForm.control}
                          name="whatsapp"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>WhatsApp</FormLabel>
                              <FormControl>
                                <InputMasked 
                                  mask="whatsapp"
                                  {...field} 
                                  data-testid="input-site-whatsapp" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={siteForm.control}
                          name="cnpj"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CNPJ</FormLabel>
                              <FormControl>
                                <InputMasked 
                                  mask="cnpj"
                                  {...field} 
                                  data-testid="input-site-cnpj" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={siteForm.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Endereço</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-site-address" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={siteForm.control}
                          name="businessHours"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Horário de Atendimento</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Ex: Segunda à Sexta, 8h às 18h" data-testid="input-business-hours" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Social Media */}
                  <AccordionItem value="social" data-testid="accordion-social">
                    <AccordionTrigger className="flex items-center space-x-2">
                      <div>
                        <span>Redes Sociais</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        <FormField
                          control={siteForm.control}
                          name="instagramUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Instagram</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="https://instagram.com/..." data-testid="input-instagram" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={siteForm.control}
                          name="facebookUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Facebook</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="https://facebook.com/..." data-testid="input-facebook" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={siteForm.control}
                          name="linkedinUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>LinkedIn</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="https://linkedin.com/..." data-testid="input-linkedin" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={siteForm.control}
                          name="youtubeUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>YouTube</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="https://youtube.com/..." data-testid="input-youtube" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Content */}
                  <AccordionItem value="content" data-testid="accordion-content">
                    <AccordionTrigger className="flex items-center space-x-2">
                      <div>
                        <span>Conteúdo</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-6">
                      <FormField
                        control={siteForm.control}
                        name="ourStory"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nossa História</FormLabel>
                            <FormControl>
                              <Textarea {...field} rows={4} data-testid="textarea-our-story" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={siteForm.control}
                        name="privacyPolicy"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Política de Privacidade</FormLabel>
                            <FormControl>
                              <Textarea {...field} rows={6} data-testid="textarea-privacy-policy" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={siteForm.control}
                        name="termsOfUse"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Termos de Uso</FormLabel>
                            <FormControl>
                              <Textarea {...field} rows={6} data-testid="textarea-terms-of-use" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </AccordionContent>
                  </AccordionItem>

                  {/* Images */}
                  <AccordionItem value="images" data-testid="accordion-images">
                    <AccordionTrigger className="flex items-center space-x-2">
                      <div>
                        <span>Imagens</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                        <FormField
                          control={siteForm.control}
                          name="mainImageUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Imagem Principal</FormLabel>
                              <FormControl>
                                <SiteSettingsImageUpload 
                                  value={field.value} 
                                  onChange={field.onChange}
                                  imageType="main"
                                  data-testid="input-main-image"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={siteForm.control}
                          name="networkImageUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Imagem da Rede</FormLabel>
                              <FormControl>
                                <SiteSettingsImageUpload 
                                  value={field.value} 
                                  onChange={field.onChange}
                                  imageType="network"
                                  data-testid="input-network-image"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={siteForm.control}
                          name="aboutImageUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Imagem Sobre Nós</FormLabel>
                              <FormControl>
                                <SiteSettingsImageUpload 
                                  value={field.value} 
                                  onChange={field.onChange}
                                  imageType="about"
                                  data-testid="input-about-image"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                </Accordion>

                <div className="flex justify-end pt-6">
                  <Button
                    type="submit"
                    variant="admin-action"
                    size="sm"
                    disabled={saveSiteMutation.isPending}
                    data-testid="button-save-site"
                    className="min-w-[140px]"
                  >
                    {saveSiteMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar Alterações
                      </>
                    )}
                  </Button>
                </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Chat Settings */}
        <TabsContent value="chat" className="space-y-6" data-testid="tab-content-chat">
          {chatLoading ? (
            <div className="space-y-4">
              <Card className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-10 bg-muted rounded"></div>
                    <div className="h-10 bg-muted rounded"></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border-[#eaeaea] bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-foreground">
                  Configurações do Chat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...chatForm}>
                  <form onSubmit={chatForm.handleSubmit(onSubmitChat)} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <FormField
                        control={chatForm.control}
                        name="chatTitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Título do Chat</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Atendimento Virtual" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={chatForm.control}
                        name="welcomeMessage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mensagem de Boas-vindas</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Olá! Como posso te ajudar hoje?" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={chatForm.control}
                        name="placeholderText"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Texto do Placeholder</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Digite sua mensagem..." />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={chatForm.control}
                        name="chatPosition"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Posição do Chat</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger 
                                  className="[&>span]:text-left [&>span]:flex [&>span]:flex-col [&>span]:items-start"
                                  style={{
                                    borderColor: 'var(--border-gray)',
                                    background: 'white'
                                  }}
                                >
                                  <SelectValue placeholder="Selecione a posição" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {[
                                  { value: "bottom-right", label: "Inferior Direito" },
                                  { value: "bottom-left", label: "Inferior Esquerdo" }
                                ].flatMap((position, index, array) => [
                                  <SelectItem key={position.value} value={position.value} className="py-3 pl-10 pr-4 data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground">
                                    {position.label}
                                  </SelectItem>,
                                  ...(index < array.length - 1 ? [<Separator key={`separator-${position.value}`} />] : [])
                                ])}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={chatForm.control}
                        name="chatSize"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tamanho do Chat</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger 
                                  className="[&>span]:text-left [&>span]:flex [&>span]:flex-col [&>span]:items-start"
                                  style={{
                                    borderColor: 'var(--border-gray)',
                                    background: 'white'
                                  }}
                                >
                                  <SelectValue placeholder="Selecione o tamanho" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {[
                                  { value: "sm", label: "Pequeno" },
                                  { value: "md", label: "Médio" },
                                  { value: "lg", label: "Grande" },
                                  { value: "xl", label: "Extra Grande" },
                                  { value: "full", label: "Tela Cheia" }
                                ].flatMap((size, index, array) => [
                                  <SelectItem key={size.value} value={size.value} className="py-3 pl-10 pr-4 data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground">
                                    {size.label}
                                  </SelectItem>,
                                  ...(index < array.length - 1 ? [<Separator key={`separator-${size.value}`} />] : [])
                                ])}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={chatForm.control}
                        name="isEnabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Chat Ativo</FormLabel>
                              <p className="text-sm text-muted-foreground">
                                Ativar ou desativar o chat no site
                              </p>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Image Upload Section */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-foreground">Avatares do Chat</h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <FormField
                          control={chatForm.control}
                          name="botIconUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Imagem do Bot</FormLabel>
                              <FormControl>
                                <ChatImageUpload 
                                  value={field.value} 
                                  onChange={field.onChange}
                                  imageType="bot"
                                  placeholder="Selecione a imagem do bot"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={chatForm.control}
                          name="userIconUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Imagem do Usuário</FormLabel>
                              <FormControl>
                                <ChatImageUpload 
                                  value={field.value} 
                                  onChange={field.onChange}
                                  imageType="user"
                                  placeholder="Selecione a imagem do usuário"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-6">
                      <Button
                        type="submit"
                        variant="admin-action"
                        size="sm"
                        disabled={saveChatMutation.isPending}
                        className="min-w-[140px]"
                      >
                        {saveChatMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Salvar Alterações
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Rules Settings */}
        <TabsContent value="rules" className="space-y-6" data-testid="tab-content-rules">
          {rulesLoading ? (
            <div className="space-y-4">
              <Card className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-10 bg-muted rounded"></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Form {...rulesForm}>
              <form onSubmit={rulesForm.handleSubmit(onSubmitRules)} className="space-y-4 sm:space-y-6">
                <Card className="border-[#eaeaea] bg-white shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-foreground">
                      Configurações de Regras
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="plans" data-testid="accordion-plans">
                        <AccordionTrigger className="flex items-center space-x-2">
                          <div>
                            <span>Planos & Procedimentos</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4">
                          <FormField
                            control={rulesForm.control}
                            name="fixedPercentage"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Porcentagem para Valor a Pagar</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field}
                                    type="number" 
                                    placeholder="Ex: 50 ou 0.5" 
                                    min="0" 
                                    max="100"
                                    step="0.01"
                                    value={field.value ?? ""}
                                    onChange={(e) => {
                                      const value = e.target.value === "" ? "" : Number(e.target.value);
                                      field.onChange(value);
                                    }}
                                    data-testid="input-percentage-fixed"
                                  />
                                </FormControl>
                                <FormMessage />
                                <p className="text-sm text-muted-foreground">
                                  Porcentagem que será aplicada automaticamente no campo "Pagar (R$)" quando inserir um valor em "Valor integral"
                                </p>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={rulesForm.control}
                            name="coparticipationPercentage"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Porcentagem para Coparticipação</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field}
                                    type="number" 
                                    placeholder="Ex: 10 ou 0.5" 
                                    min="0" 
                                    max="100"
                                    step="0.01"
                                    value={field.value ?? ""}
                                    onChange={(e) => {
                                      const value = e.target.value === "" ? "" : Number(e.target.value);
                                      field.onChange(value);
                                    }}
                                    data-testid="input-percentage-coparticipation"
                                  />
                                </FormControl>
                                <FormMessage />
                                <p className="text-sm text-muted-foreground">
                                  Porcentagem que será aplicada automaticamente no campo "Coparticipação" quando habilitado, baseado no "Valor integral"
                                </p>
                              </FormItem>
                            )}
                          />
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="commissions" data-testid="accordion-commissions">
                        <AccordionTrigger className="flex items-center space-x-2">
                          <div>
                            <span>Comissões</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4">
                          <FormField
                            control={rulesForm.control}
                            name="defaultCpaPercentage"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>CPA Padrão (%)</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field}
                                    type="number" 
                                    placeholder="Ex: 10" 
                                    min="0" 
                                    max="100"
                                    step="0.01"
                                    value={field.value ?? ""}
                                    onChange={(e) => {
                                      const value = e.target.value === "" ? "" : Number(e.target.value);
                                      field.onChange(value);
                                    }}
                                    data-testid="input-default-cpa-percentage"
                                  />
                                </FormControl>
                                <FormMessage />
                                <p className="text-sm text-muted-foreground">
                                  Porcentagem de CPA que será aplicada automaticamente ao criar um novo vendedor
                                </p>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={rulesForm.control}
                            name="defaultRecurringCommissionPercentage"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Comissão Recorrente Padrão (%)</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field}
                                    type="number" 
                                    placeholder="Ex: 5" 
                                    min="0" 
                                    max="100"
                                    step="0.01"
                                    value={field.value ?? ""}
                                    onChange={(e) => {
                                      const value = e.target.value === "" ? "" : Number(e.target.value);
                                      field.onChange(value);
                                    }}
                                    data-testid="input-default-recurring-commission-percentage"
                                  />
                                </FormControl>
                                <FormMessage />
                                <p className="text-sm text-muted-foreground">
                                  Porcentagem de comissão recorrente que será aplicada automaticamente ao criar um novo vendedor
                                </p>
                              </FormItem>
                            )}
                          />
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    <div className="flex justify-end pt-6">
                      <Button
                        type="submit"
                        variant="admin-action"
                        size="sm"
                        disabled={saveRulesMutation.isPending}
                        data-testid="button-save-rules"
                        className="min-w-[140px]"
                      >
                        {saveRulesMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Salvar Alterações
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </form>
            </Form>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
