# Estrutura do Projeto - Documentação Completa

## 📋 Índice
- [Páginas Públicas](#páginas-públicas)
- [Área do Cliente](#área-do-cliente)
- [Área da Unidade](#área-da-unidade)
- [Área Administrativa](#área-administrativa)
- [Popups e Modais](#popups-e-modais)
- [Componentes UI](#componentes-ui)
- [Componentes de Layout](#componentes-de-layout)
- [Hooks Personalizados](#hooks-personalizados)

---

## 🌐 Páginas Públicas

### Rotas Principais
| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/` | `pages/home.tsx` | Página inicial |
| `/planos` | `pages/plans.tsx` | Listagem de planos disponíveis |
| `/sobre` | `pages/about.tsx` | Sobre a empresa |
| `/contato` | `pages/contact.tsx` | Formulário de contato |
| `/faq` | `pages/faq.tsx` | Perguntas frequentes |
| `/rede-credenciada` | `pages/network.tsx` | Rede de unidades credenciadas |
| `/politica-privacidade` | `pages/privacy-policy.tsx` | Política de privacidade |
| `/termos-uso` | `pages/terms-of-use.tsx` | Termos de uso |
| `/checkout/:planId?` | `pages/checkout.tsx` | Processo de checkout |
| `/checkout/sucesso` | `pages/checkout-success.tsx` | Confirmação de compra |
| `/unidade/:slug` | `pages/unit-login.tsx` | Login de unidade específica |

---

## 👤 Área do Cliente

### Autenticação
| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/cliente/login` | `pages/customer-login.tsx` | Login do cliente |
| `/auto-login-test` | `pages/auto-login-test.tsx` | Teste de login automático |

### Dashboard e Gestão
| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/cliente/painel` | `pages/customer-dashboard.tsx` | Painel do cliente |
| `/cliente/pets` | `pages/customer-pets.tsx` | Gestão de pets |
| `/cliente/perfil` | `pages/customer-profile.tsx` | Perfil do cliente |
| `/cliente/pesquisas` | `pages/customer-surveys.tsx` | Pesquisas de satisfação |
| `/cliente/financeiro` | `pages/customer-financial.tsx` | Informações financeiras |
| `/cliente/procedimentos` | `pages/customer-procedures.tsx` | Procedimentos disponíveis |
| `/cliente/renovacao` | `pages/renewal-checkout.tsx` | Renovação de contrato |
| `/cliente/pagamento` | `pages/installment-payment.tsx` | Pagamento de parcelas |
| `/cliente/telemedicina` | `pages/telemedicine.tsx` | Telemedicina |

---

## 🏥 Área da Unidade

### Dashboard da Unidade
| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/admin/unidade/:slug` | `pages/unit-dashboard.tsx` | Dashboard da unidade |

### Subpáginas da Unidade
| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/unidade/guias` | `pages/unit/GuiasPage.tsx` | Gestão de guias |
| `/unidade/clientes` | `pages/unit/ClientesPage.tsx` | Listagem de clientes |
| `/unidade/procedimentos` | `pages/unit/ProcedimentosPage.tsx` | Procedimentos da unidade |

---

## 🔐 Área Administrativa

### Autenticação Admin
| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/admin/login` | `pages/admin-login.tsx` | Login administrativo |

### Dashboard e Gestão
| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/admin` | `pages/admin/Dashboard.tsx` | Dashboard administrativo |
| `/admin/not-found` | `pages/admin/not-found.tsx` | Página não encontrada (admin) |

### Gestão de Clientes
| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/admin/clientes` | `pages/admin/Clients.tsx` | Lista de clientes |
| `/admin/clientes/novo` | `pages/admin/ClientForm.tsx` | Novo cliente |
| `/admin/clientes/:id/editar` | `pages/admin/ClientForm.tsx` | Editar cliente |
| `/admin/pets/:id/editar` | `pages/admin/PetForm.tsx` | Editar pet |

### Gestão de Guias
| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/admin/guias` | `pages/admin/Guides.tsx` | Lista de guias |
| `/admin/guias/novo` | `pages/admin/GuideForm.tsx` | Nova guia |
| `/admin/guias/:id/editar` | `pages/admin/GuideForm.tsx` | Editar guia |

### Gestão de Planos
| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/admin/planos` | `pages/admin/Plans.tsx` | Lista de planos |
| `/admin/planos/novo` | `pages/admin/PlanForm.tsx` | Novo plano |
| `/admin/planos/:id/editar` | `pages/admin/PlanForm.tsx` | Editar plano |

### Gestão de Rede
| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/admin/rede` | `pages/admin/Network.tsx` | Rede credenciada |
| `/admin/rede/novo` | `pages/admin/NetworkForm.tsx` | Nova unidade |
| `/admin/rede/:id/editar` | `pages/admin/NetworkForm.tsx` | Editar unidade |

### Outras Páginas Admin
| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/admin/financeiro` | `pages/admin/Financial.tsx` | Gestão financeira |
| `/admin/cupom` | `pages/admin/Coupons.tsx` | Gestão de cupons |
| `/admin/contratos` | `pages/admin/Contracts.tsx` | Gestão de contratos |
| `/admin/procedimentos` | `pages/admin/Procedures.tsx` | Gestão de procedimentos |
| `/admin/perguntas-frequentes` | `pages/admin/FAQ.tsx` | Gestão do FAQ |
| `/admin/formularios` | `pages/admin/ContactSubmissions.tsx` | Formulários de contato |
| `/admin/configuracoes` | `pages/admin/Settings.tsx` | Configurações do site |
| `/admin/administracao` | `pages/admin/Administration.tsx` | Administração de usuários |

---

## 💬 Popups e Modais

### Componentes de Diálogo
| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| `Dialog` | `ui/dialog.tsx` | Diálogo modal genérico |
| `AlertDialog` | `ui/alert-dialog.tsx` | Diálogo de alerta |
| `Sheet` | `ui/sheet.tsx` | Painel deslizante lateral |
| `Popover` | `ui/popover.tsx` | Popup contextual |
| `ResponsivePopover` | `ui/popover.tsx` | Popover responsivo (drawer em mobile) |
| `ConfirmDialog` | `ui/confirm-dialog.tsx` | Diálogo de confirmação |
| `PasswordDialog` | `ui/password-dialog.tsx` | Diálogo de senha |
| `CommandDialog` | `admin/ui/command.tsx` | Diálogo de comandos |
| `Drawer` | `ui/drawer.tsx` | Gaveta mobile |

### Hooks de Diálogo
| Hook | Arquivo | Descrição |
|------|---------|-----------|
| `usePasswordDialog` | `hooks/use-password-dialog.ts` | Gerencia diálogo de senha |
| `usePasswordDialog` (Admin) | `hooks/admin/use-password-dialog.ts` | Diálogo de senha (admin) |
| `useConfirmDialog` | `hooks/use-confirm-dialog.ts` | Gerencia diálogo de confirmação |

---

## 🎨 Componentes UI

### Componentes Básicos
| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| `Button` | `ui/button.tsx` | Botão |
| `Input` | `ui/input.tsx` | Campo de entrada |
| `InputMasked` | `admin/ui/input-masked.tsx` | Input com máscara |
| `Textarea` | `ui/textarea.tsx` | Área de texto |
| `Label` | `admin/ui/label.tsx` | Rótulo |
| `Field` | `ui/field.tsx` | Campo de formulário |

### Seleção e Escolha
| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| `Select` | `ui/select.tsx` | Seleção dropdown |
| `Checkbox` | `ui/checkbox.tsx` | Caixa de seleção |
| `CustomCheckbox` | `ui/custom-checkbox.tsx` | Checkbox customizado |
| `RadioGroup` | `ui/radio-group.tsx` | Grupo de opções |
| `Switch` | `ui/switch.tsx` | Interruptor |
| `Slider` | `ui/slider.tsx` | Controle deslizante |
| `Toggle` | `ui/toggle.tsx` | Alternador |
| `ToggleGroup` | `ui/toggle-group.tsx` | Grupo de alternadores |

### Exibição de Dados
| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| `Card` | `ui/card.tsx` | Cartão |
| `Table` | `admin/ui/table.tsx` | Tabela |
| `Badge` | `ui/badge.tsx` | Emblema |
| `Avatar` | `ui/avatar.tsx` | Avatar |
| `Skeleton` | `ui/skeleton.tsx` | Carregamento |
| `Progress` | `ui/progress.tsx` | Barra de progresso |

### Navegação
| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| `Tabs` | `ui/tabs.tsx` | Abas |
| `Accordion` | `ui/accordion.tsx` | Acordeão |
| `Breadcrumb` | `ui/breadcrumb.tsx` | Breadcrumb |
| `NavigationMenu` | `ui/navigation-menu.tsx` | Menu de navegação |
| `DropdownMenu` | `ui/dropdown-menu.tsx` | Menu dropdown |
| `ContextMenu` | `ui/context-menu.tsx` | Menu contextual |
| `Menubar` | `ui/menubar.tsx` | Barra de menu |

### Feedback
| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| `Alert` | `ui/alert.tsx` | Alerta |
| `Toast` | `ui/toast.tsx` | Notificação toast |
| `Tooltip` | `ui/tooltip.tsx` | Dica de ferramenta |
| `HoverCard` | `admin/ui/hover-card.tsx` | Cartão ao passar mouse |

### Outros
| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| `Separator` | `ui/separator.tsx` | Separador |
| `ScrollArea` | `ui/scroll-area.tsx` | Área de rolagem |
| `CustomScrollArea` | `ui/custom-scroll-area.tsx` | Área de rolagem customizada |
| `Collapsible` | `ui/collapsible.tsx` | Colapsável |
| `Calendar` | `ui/calendar.tsx` | Calendário |
| `DateField` | `ui/datefield.tsx` | Campo de data |
| `DateRangePicker` | `ui/date-range-picker.tsx` | Seletor de intervalo de datas |
| `Carousel` | `ui/carousel.tsx` | Carrossel |
| `Command` | `admin/ui/command.tsx` | Barra de comandos |
| `AspectRatio` | `ui/aspect-ratio.tsx` | Proporção de aspecto |

### Componentes de Imagem
| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| `ImageUpload` | `ui/image-upload.tsx` | Upload de imagem |
| `NetworkUnitImageUpload` | `ui/network-unit-image-upload.tsx` | Upload para unidades |
| `ChatImageUpload` | `ui/chat-image-upload.tsx` | Upload para chat |
| `SiteSettingsImageUpload` | `ui/site-settings-image-upload.tsx` | Upload para configurações |
| `OptimizedImage` | `ui/optimized-image.tsx` | Imagem otimizada |
| `RobustImage` | `ui/image.tsx` | Imagem robusta |

### Componentes Especiais
| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| `FormattedText` | `ui/formatted-text.tsx` | Texto formatado |
| `CharacterCounter` | `ui/character-counter.tsx` | Contador de caracteres |
| `Typewriter` | `ui/typewriter.tsx` | Efeito de digitação |
| `ChatInput` | `ui/chat-input.tsx` | Input de chat |
| `AnimatedSection` | `ui/animated-section.tsx` | Seção animada |
| `AnimatedList` | `ui/animated-list.tsx` | Lista animada |
| `CopyButton` | `ui/copy-button.tsx` | Botão copiar |
| `ModernToggle` | `ui/modern-toggle.tsx` | Toggle moderno |
| `AriaButton` | `ui/aria-button.tsx` | Botão acessível |
| `VisuallyHidden` | `ui/visually-hidden.tsx` | Oculto visualmente |

### Componentes de Gráficos
| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| `ChartContainer` | `ui/chart.tsx` | Container de gráfico |
| `ChartTooltipContent` | `ui/chart.tsx` | Tooltip de gráfico |
| `ChartLegendContent` | `ui/chart.tsx` | Legenda de gráfico |
| `ChartStyle` | `ui/chart.tsx` | Estilos de gráfico |

---

## 🏗️ Componentes de Layout

### Layout Geral
| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| `Layout` | `components/Layout.tsx` | Layout principal |
| `PageLayout` | `components/layout/page-layout.tsx` | Layout de página |
| `Header` | `components/layout/header.tsx` | Cabeçalho |
| `Footer` | `components/layout/footer.tsx` | Rodapé |

### Layout Administrativo
| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| `AdminLayout` | `components/admin/Layout.tsx` | Layout admin |
| `AuthGuard` | `components/admin/AuthGuard.tsx` | Guarda de autenticação |
| `Sidebar` | `components/admin/Sidebar.tsx` | Barra lateral admin |
| `SidebarProvider` | `components/admin/Sidebar.tsx` | Provedor da sidebar |
| `SidebarTrigger` | `components/admin/Sidebar.tsx` | Trigger da sidebar |
| `SidebarInset` | `components/admin/Sidebar.tsx` | Inset da sidebar |
| `SidebarHeader` | `components/admin/Sidebar.tsx` | Cabeçalho da sidebar |
| `SidebarFooter` | `components/admin/Sidebar.tsx` | Rodapé da sidebar |
| `SidebarContent` | `components/admin/Sidebar.tsx` | Conteúdo da sidebar |
| `SidebarMenu` | `components/admin/Sidebar.tsx` | Menu da sidebar |

### Layout da Unidade
| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| `UnitLayout` | `components/unit/UnitLayout.tsx` | Layout da unidade |
| `UnitSidebar` | `components/unit/UnitSidebar.tsx` | Sidebar da unidade |

### Outros Componentes de Layout
| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| `ErrorBoundary` | `components/error-boundary.tsx` | Boundary de erro |
| `ScrollToTop` | `components/scroll-to-top.tsx` | Rolar para o topo |
| `ChatAI` | `components/chat/chat-ai.tsx` | Chat AI |

### Seções da Página Inicial
| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| `PlansSection` | `components/sections/plans-section.tsx` | Seção de planos |

---

## 🔧 Hooks Personalizados

### Hooks de UI
| Hook | Arquivo | Descrição |
|------|---------|-----------|
| `useScrollAnimation` | `hooks/use-scroll-animation.ts` | Animação de rolagem |
| `useMediaQuery` | `hooks/use-media-query.ts` | Media query |
| `useIsMobile` | `hooks/use-mobile.tsx` | Detectar mobile |
| `useMobileViewport` | `hooks/use-mobile.tsx` | Viewport mobile |
| `useSafeArea` | `hooks/use-mobile.tsx` | Área segura |
| `useEnhancedScrollLock` | `hooks/use-enhanced-scroll-lock.ts` | Bloqueio de scroll |
| `useWhatsAppRedirect` | `hooks/use-whatsapp-redirect.ts` | Redirecionamento WhatsApp |

### Hooks de Dados
| Hook | Arquivo | Descrição |
|------|---------|-----------|
| `useCacheManager` | `hooks/use-cache-manager.ts` | Gerenciador de cache |
| `useVolatileData` | `hooks/use-cache-manager.ts` | Dados voláteis |
| `useStaticData` | `hooks/use-cache-manager.ts` | Dados estáticos |
| `useCacheDebug` | `hooks/use-cache-manager.ts` | Debug de cache |
| `useParallelData` | `hooks/use-parallel-data.ts` | Dados paralelos |
| `useHomePageData` | `hooks/use-parallel-data.ts` | Dados da home |
| `useNetworkPageData` | `hooks/use-parallel-data.ts` | Dados da rede |
| `useFaqPageData` | `hooks/use-parallel-data.ts` | Dados do FAQ |
| `useSiteSettings` | `hooks/use-site-settings.ts` | Configurações do site |
| `usePlans` | `hooks/use-plans.ts` | Planos |
| `useSpecies` | `hooks/use-species.ts` | Espécies de pets |

### Hooks de Upload
| Hook | Arquivo | Descrição |
|------|---------|-----------|
| `useImageUpload` | `hooks/use-image-upload.ts` | Upload de imagem |
| `useSiteSettingsImageUpload` | `hooks/use-site-settings-image-upload.ts` | Upload config site |
| `useNetworkUnitImageUpload` | `hooks/use-network-unit-image-upload.ts` | Upload unidade |
| `useChatImageUpload` | `hooks/use-chat-image-upload.ts` | Upload chat |

### Hooks Admin
| Hook | Arquivo | Descrição |
|------|---------|-----------|
| `useDateFilter` | `hooks/admin/use-date-filter.ts` | Filtro de data |
| `useColumnPreferences` | `hooks/admin/use-column-preferences.ts` | Preferências de coluna |

### Hooks de Autenticação
| Hook | Arquivo | Descrição |
|------|---------|-----------|
| `useAuth` | `contexts/AuthContext.tsx` | Autenticação |

---

## 📊 Componentes de Página Específicos

### Componentes de Unidade
| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| `DigitalCard` | Usado em `UnitDashboard.tsx` | Cartão digital |

---

## 🎯 Estrutura de Pastas

```
client/src/
├── components/
│   ├── admin/          # Componentes administrativos
│   ├── chat/           # Componentes de chat
│   ├── layout/         # Componentes de layout
│   ├── sections/       # Seções de páginas
│   ├── ui/             # Componentes UI base
│   └── unit/           # Componentes de unidade
├── contexts/           # Contextos React
├── hooks/              # Hooks customizados
│   └── admin/          # Hooks admin
├── lib/                # Bibliotecas e utilidades
│   └── admin/          # Utils admin
├── pages/              # Páginas da aplicação
│   ├── admin/          # Páginas admin
│   └── unit/           # Páginas de unidade
└── utils/              # Utilidades gerais

server/
├── routes/             # Rotas da API
├── services/           # Serviços backend
├── utils/              # Utilidades backend
└── cron/               # Jobs agendados

shared/
└── schema.ts           # Schema do banco de dados
```

---

## 🔗 Rotas da API

### APIs Públicas
- `/api/health` - Health check
- `/api/cep/:cep` - Consulta CEP
- `/api/site-settings` - Configurações do site
- `/api/network-units` - Unidades da rede
- `/api/species` - Espécies de pets
- `/api/coupons/validate` - Validar cupom

### APIs do Cliente
- `/api/customer/*` - APIs área do cliente
- `/api/clients/*` - Gestão de clientes

### APIs Admin
- `/admin/api/*` - APIs administrativas

### Webhooks
- `/api/webhooks/cielo` - Webhook Cielo

---

## 📝 Observações

- O projeto usa **React** com **TypeScript**
- **Wouter** para roteamento
- **TanStack Query** para gerenciamento de estado
- **Radix UI** para componentes base
- **Tailwind CSS** para estilização
- **Framer Motion** para animações
- **Drizzle ORM** para banco de dados
- **Express** no backend
- **PostgreSQL** como banco de dados
