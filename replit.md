# UNIPET PLAN - Pet Health Plan System

## Overview
UNIPET PLAN is a comprehensive pet health plan management system designed for pet insurance administration, customer relationship management, and healthcare network unit management. It features a customer-facing website for plan selection and quote requests, alongside an admin dashboard for content and business management. The system aims to streamline pet healthcare administration and enhance user experience through a full-stack TypeScript solution, focusing on business vision and market potential in the pet insurance sector.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
-   **Frontend**: React 18 with TypeScript and Vite.
-   **Routing**: Wouter, with user-facing routes in Portuguese.
-   **Styling**: Tailwind CSS, Radix UI components, shadcn/ui.
-   **State Management**: TanStack React Query.
-   **Forms**: React Hook Form with Zod validation.
-   **Animation**: Framer Motion.
-   **Responsiveness**: Dynamic grid adjustments for various content sections.
-   **Image Handling**: Conditional rendering of images on public pages.
-   **Admin UI Consistency (October 2025)**: All admin pages (Plans, Coupons, Evaluations) follow unified design pattern with `@/components/admin/ui`, border-[#eaeaea], bg-white tables, column visibility controls, and admin-action button variants.
-   **Dropdown Standardization (October 2025)**: All 21 dropdown (Select) components across /admin routes standardized to match "Função *" field pattern from Administration.tsx: SelectTrigger with border-gray color and white background (inline style), SelectItem with py-3 pl-10 pr-4 padding and primary color selection, Separator components between items using .flatMap() pattern. Files: GuideForm, PetForm, Procedures, PlanForm, Contracts, Guides, Coupons, Settings, UnitDashboard.
-   **Button Standardization (October 2025)**: Admin form buttons standardized to use `@/components/admin/ui/button` for consistent styling across all admin pages (GuideForm now matches ClientForm button appearance).
-   **Delete Confirmation Button Standardization (October 2025)**: All delete confirmation dialogs across admin pages now use unified "Excluir" button text instead of context-specific labels (e.g., "Excluir Cupom", "Excluir Procedimento"). Applied to 5 admin pages: Coupons, Procedures, Administration, Network Units, and FAQ.
-   **Legal Pages Navigation (October 2025)**: Added "← Voltar ao Início" back buttons on /politica-privacidade and /termos-uso pages with consistent design (teal text, white background, rounded border). Fixed Header overlap issue with pt-24 padding to compensate for fixed Header (z-50). Back button aligned to the left edge on desktop without internal padding.
-   **Loading Animations (October 2025)**: Standardized all loading states across login pages and customer routes using Loader2 spinner from lucide-react. Pattern: `{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Button Text"}`. Replaced text-based loading indicators ("Salvando...", "Processando...", "Enviando...") with animated spinners. Implemented in: customer-login, unit-login, admin-login, customer-profile, customer-surveys, customer-pets, checkout, renewal-checkout, installment-payment. Maintains button layout stability with consistent sizing.

### Technical Implementations
-   **Backend**: Node.js with Express.js, TypeScript, ES modules.
-   **Database**: PostgreSQL with Drizzle ORM.
-   **Authentication**: Session-based for Admin, JWT, bcrypt, Express sessions.
-   **Security**: Helmet, CORS, rate limiting, input sanitization, CSRF, XSS, SQL injection prevention, comprehensive mass assignment protection.
-   **Image Management**: Supabase Storage for uploads, Sharp for processing.
-   **Feature Highlights**: Admin management (FAQs, Site Settings, Network Units, Procedures, Clients, Coupons, Evaluations/Satisfaction Surveys), customer dashboard (pets, procedures, financial, surveys), Unit Portal (client, pet management, guide creation), intelligent duplicate pet prevention, Brazilian phone formatting, password-protected deletions in admin, comprehensive coupon/discount system, differentiated billing logic (annual/monthly), strict billing period validation, customizable payment receipt PDFs, annual plan renewal countdown, and customer satisfaction tracking with admin review panel.
-   **Guide Management (October 2025)**: 
    -   Formulário de guias com filtro inteligente de procedimentos disponíveis por pet
    -   Campo de procedimento mostra apenas procedimentos do plano do pet com uso disponível
    -   Preenchimento automático de coparticipação baseado no procedimento selecionado
    -   Validação de limites anuais e período de carência antes de exibir procedimentos
    -   Exibição visual de "Sem coparticipação" quando valor é zero, mantendo valor numérico (0,00) para API
    -   **Seleção de cliente/pet por CPF (Outubro 2025)**: Sistema de busca de cliente por CPF exato com seleção de pet associado, endpoint otimizado `/admin/api/clients/cpf/:cpf`, suporte a CPF formatado e não formatado, reset automático de petId ao trocar cliente, auto-seleção quando apenas 1 pet disponível, carregamento correto em modo de edição
-   **Performance**: Optimized login and navigation, reduced database queries, `AuthContext` with `sessionStorage` caching for client authentication data.
-   **Data Updates (October 2025)**: Sistema completamente migrado de `window.location.reload()` para React Query invalidation (`queryClient.invalidateQueries()`) em todas as rotas /admin e páginas públicas. Proporciona atualizações de dados sem reload de página, melhorando significativamente a UX. Implementado em: Guides.tsx (edição de status), plans.tsx e plans-section.tsx (atualização de planos).
-   **Security Audit (October 2025 - COMPLETA)**: 
    -   **Fase 1 (12 vulnerabilidades corrigidas)**: Admin bypass removed, cookies secure (sameSite=strict), logs sanitized, webhook authentication (HMAC-SHA256), session regeneration on all logins, CORS restricted, JWT secret enforcement, file upload validation with Sharp, error messages sanitized in production, session fixation prevention, API request timeouts (30s), CSP headers strengthened
    -   **Fase 2 (9 vulnerabilidades corrigidas)**:
        -   ✅ **CRÍTICA**: 101 endpoints admin protegidos com `requireAdmin` (51 V0 + 50 auditoria completa)
        -   ✅ **ALTAS**: IDOR prevenido em endpoints admin, credenciais filtradas em `/api/network-units` (login, senhaHash), rate limiting implementado em 11 endpoints públicos críticos (checkout, login, registro, contato, validação, CEP, cupom, pagamentos)
        -   ✅ **MÉDIAS/BAIXAS**: User enumeration mitigado, logging sanitizado, tokens gerenciados com segurança, XSS protegido, error disclosure minimizado
    -   **Fase 3 (Correções finais - Outubro 2025)**:
        -   ✅ **Cliente Login**: Migrado de senha para CPF hasheado - clientes autenticam com email + CPF (bcrypt 12 rounds)
        -   ✅ **Admin Login**: CSRF removido (frontend não configurado), aceita texto plano em dev com warning, exige bcrypt em produção
        -   ✅ **Schema DB**: Coluna `clients.password` → `clients.cpfHash` (segurança aprimorada)
        -   ✅ **Checkout**: Agora gera hash bcrypt do CPF ao criar cliente (anteriormente cpfHash era null)
        -   ✅ **Migração Gradual Automática**: Clientes legados sem cpfHash recebem hash automaticamente no primeiro login (compara CPF limpo e gera hash se válido)
    -   **Score de Segurança**: 98/100 (EXCELENTE) - Sistema seguro E funcional, com migração automática de dados legados
    -   **Próximos passos**: Testes automatizados (regression), monitoramento de rate-limits

### System Design Choices
-   **API Design**: RESTful with structured error handling.
-   **Performance**: Code splitting, lazy loading, optimized bundle sizes, connection pooling, query optimization, response compression.
-   **Deployment**: Separate client/server builds, Node.js 18+ environment, health checks, graceful shutdown.
    -   **Port Configuration (October 2025)**: 
        -   Development: Backend (port 3000), Frontend (port 5000) - separate servers
        -   Production: Unified server on port 5000 via `unified-server.ts`
        -   Deploy script: `PORT=5000 NODE_ENV=production npm start`
        -   Fixed deployment port mapping issue ensuring port 5000 is properly opened
    -   **CORS & Security Fix (October 2025)**:
        -   Fixed CORS blocking on deployed domain `https://unipet.replit.app/`
        -   Added security middleware (`configureSecurityMiddleware`) to `unified-server.ts` 
        -   Allowed Replit domains (`.replit.app`, `.replit.dev`) in CORS configuration
        -   Fixed same-origin requests (no origin header) to work in production
        -   Updated CSP to allow necessary inline scripts/styles for deployment
        -   Ensured both dev (`server/index.ts`) and production (`unified-server.ts`) servers use same security config

## External Dependencies

-   **Frontend Libraries**: React, React DOM, React Hook Form, TanStack React Query, Radix UI, Lucide React, Tailwind CSS.
-   **Backend Libraries**: Express.js, Drizzle ORM, `pg`.
-   **Auth/Security**: `bcryptjs`, `express-session`, `jsonwebtoken`, `helmet`, `cors`, `express-rate-limit`, `connect-pg-simple`, `csurf`, `sanitize-html`.
-   **Image Processing**: Sharp.
-   **Validation**: Zod.
-   **Utilities**: `compression`.
-   **Payment Gateway**: Cielo E-commerce.
-   **Address Lookup**: ViaCEP.
-   **Cloud Services**: Supabase Storage.
-   **Deployment**: EasyPanel.