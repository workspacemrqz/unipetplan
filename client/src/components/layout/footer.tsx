import { Link } from "wouter";
import { Phone, Mail, Facebook, Instagram, Linkedin, Youtube } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useSiteSettingsWithDefaults } from "@/hooks/use-site-settings";
import { useWhatsAppRedirect } from "@/hooks/use-whatsapp-redirect";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function Footer() {
  const { settings, shouldShow } = useSiteSettingsWithDefaults();
  const { getWhatsAppLink } = useWhatsAppRedirect();
  
  const quickLinks = [
    { name: "Início", href: "/" },
    { name: "Planos", href: "/planos" },
    { name: "Sobre", href: "/sobre" },
    { name: "Contato", href: "/contato" },
    { name: "FAQ", href: "/faq" },
  ];

  // Buscar planos ativos
  const { data: plans = [], isLoading } = useQuery<Array<{ id: string; name: string; isActive: boolean }>>({
    queryKey: ["/api/plans"],
  });

  const activePlans = Array.isArray(plans) ? plans.filter((plan) => plan.isActive === true) : [];

  return (
    <footer className="border-t border-t-accent bg-muted py-12">
      <div className="section-container">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {/* Company Info */}
          <div className="col-span-1 sm:col-span-2 md:col-span-1">
            <div className="flex items-start justify-start mb-4 sm:mb-6">
              <img src="/unipet-logo.png" alt="Unipet Plan" className="h-8 sm:h-10 w-auto" />
            </div>
            <p className="mb-4 sm:mb-6 text-sm sm:text-base leading-relaxed text-foreground">
              <span className="sm:hidden">
                Cuidando da saúde do seu pet com carinho,<br />
                qualidade e preços acessíveis.
              </span>
              <span className="hidden sm:inline">
                Cuidando da saúde do seu pet com carinho, qualidade e preços acessíveis.
              </span>
            </p>
            <div className="flex space-x-4">
              {shouldShow.facebookUrl && (
                <a href={settings.facebookUrl || undefined} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-95 bg-primary text-primary-foreground">
                  <Facebook className="h-4 w-4" />
                </a>
              )}
              {shouldShow.instagramUrl && (
                <a href={settings.instagramUrl || undefined} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-95 bg-primary text-primary-foreground">
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {shouldShow.linkedinUrl && (
                <a href={settings.linkedinUrl || undefined} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-95 bg-primary text-primary-foreground">
                  <Linkedin className="h-4 w-4" />
                </a>
              )}
              {shouldShow.youtubeUrl && (
                <a href={settings.youtubeUrl || undefined} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-95 bg-primary text-primary-foreground">
                  <Youtube className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 text-primary">Links Rápidos</h4>
            <ul className="space-y-2 sm:space-y-3">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link 
                    href={link.href}
                    className="transition-colors text-sm sm:text-base text-foreground"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Plans */}
          <div>
            <h4 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 text-primary">Planos</h4>
            <ul className="space-y-2 sm:space-y-3">
              {isLoading ? (
                <li>
                  <span className="text-sm sm:text-base text-foreground">
                    Carregando planos...
                  </span>
                </li>
              ) : activePlans.length > 0 ? (
                activePlans.map((plan) => (
                  <li key={plan.id}>
                    <Link
                      href="/planos"
                      className="transition-colors text-sm sm:text-base text-foreground hover:text-primary"
                    >
                      {plan.name}
                    </Link>
                  </li>
                ))
              ) : (
                <li>
                  <span className="text-sm sm:text-base text-foreground">
                    Nenhum plano disponível
                  </span>
                </li>
              )}
            </ul>
          </div>

          {/* Contact */}
          <div className="col-span-1 sm:col-span-2 md:col-span-1">
            <h4 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 text-primary">Contato</h4>
            <div className="space-y-3 sm:space-y-4">
              {shouldShow.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 flex-shrink-0 mt-0.5 text-primary" />
                  <div>
                    <div className="font-semibold text-sm sm:text-base text-foreground">Telefone</div>
                    <div className="text-sm sm:text-base text-foreground">{settings.phone}</div>
                  </div>
                </div>
              )}
              {shouldShow.email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 flex-shrink-0 mt-0.5 text-primary" />
                  <div>
                    <div className="font-semibold text-sm sm:text-base text-foreground">E-mail</div>
                    <div className="text-sm sm:text-base break-all md:break-normal text-foreground">{settings.email}</div>
                  </div>
                </div>
              )}
              {shouldShow.whatsapp && (
                <div className="flex items-start gap-3">
                  <FaWhatsapp className="h-4 w-4 flex-shrink-0 mt-0.5 text-primary" />
                  <div>
                    <div className="font-semibold text-sm sm:text-base text-foreground">WhatsApp</div>
                    <a 
                      href={getWhatsAppLink()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm sm:text-base transition-colors cursor-pointer text-foreground"
                    >
                      {settings.whatsapp}
                    </a>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="border-t border-t-accent mt-8 sm:mt-12 pt-6 sm:pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-xs sm:text-sm text-center md:text-left text-foreground">
              <div>© {new Date().getFullYear()} UNIPET PLAN - Todos os direitos reservados.</div>
              {shouldShow.cnpj && (
                <div className="mt-1">CNPJ: {settings.cnpj}</div>
              )}
            </div>
            <div className="flex flex-row justify-center sm:justify-end gap-4 sm:gap-6 text-xs sm:text-sm text-center">
              <Link 
                href="/politica-privacidade" 
                className="transition-colors text-foreground" 
              >
                Política de Privacidade
              </Link>
              <Link 
                href="/termos-uso" 
                className="transition-colors text-foreground" 
              >
                Termos de Uso
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}