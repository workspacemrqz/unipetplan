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
-   **Animation**: Framer Motion, with standardized button and page loading states using `Loader2` and a custom `LoadingDots` component.
-   **Responsiveness**: Dynamic grid adjustments.
-   **Admin UI Consistency**: Unified design patterns across all admin pages, consistent navigation structure, standardized dropdowns, and standardized button components (including delete confirmations). Detail popups (Client and Seller) have identical styling and features including copy-to-clipboard functionality.
-   **Admin Navigation Menu (October 2025)**: Menu lateral administrativo (`client/src/components/admin/Sidebar.tsx`) reorganizado. "Rede Credenciada" foi movida da seção "Comunicação" para a seção "Parceiros" junto com "Vendedores" para agrupar recursos relacionados a parceiros de negócio.
-   **Legal Pages Navigation**: Consistent back buttons and header overlap fixes.
-   **Instant Admin Loading**: Optimized admin authentication flow for instant rendering and redirection.
-   **Decimal Percentage Support (October 2025)**: Admin Rules settings now support decimal percentages (e.g., 0.5%, 1.25%) with proper handling of zero values using nullish coalescing operator (??) instead of logical OR (||).

### Technical Implementations
-   **Backend**: Node.js with Express.js, TypeScript, ES modules.
-   **Database**: PostgreSQL with Drizzle ORM.
-   **Authentication**: Session-based for Admin, JWT, bcrypt, Express sessions. Client authentication uses email + hashed CPF.
-   **Security**: Helmet, CORS, rate limiting, input sanitization, CSRF, XSS, SQL injection prevention, mass assignment protection, comprehensive admin endpoint protection (`requireAdmin`), IDOR prevention, and secure credential handling. Client login migrated to CPF hashing with automatic gradual migration for legacy clients.
-   **Image Management**: Supabase Storage for uploads, Sharp for processing.
-   **Feature Highlights**: Admin management (FAQs, Site Settings, Network Units, Procedures, Clients, Coupons, Surveys, Sellers), customer dashboard (pets, procedures, financial, surveys), Unit Portal (client, pet management, guide creation), duplicate pet prevention, Brazilian phone formatting, password-protected deletions in admin, comprehensive coupon/discount system, differentiated billing logic, strict billing period validation, customizable payment receipt PDFs, annual plan renewal countdown, customer satisfaction tracking, and seller management with whitelabel pages and commission tracking.
-   **Procedure Categories (October 2025)**: Implemented procedure categorization system with 23 predefined categories (CONSULTA 1-5, EXAMES LABORATORIAIS 1-2, EXAMES LABORATORIAIS COMPLEXOS, EXAMES IMAGEM 1-4, EXAMES ODONTOLOGICOS, various CIRURGIA types, INTERNAÇÃO variants, ANESTESIA 1-3, VACINAS). Category selection dropdown added to procedure creation/editing forms in admin panel. Backend endpoint `/admin/api/procedure-categories` fetches active categories ordered by display order.
-   **Seller Management System**: Complete seller registration, automatic whitelabel URL generation, seller authentication (email + CPF), dedicated seller dashboard, admin CRUD interface with status toggle (active/inactive), and a referral tracking system integrated into the checkout process for commission tracking. Inactive sellers cannot access the seller panel. **Seller Login & Dashboard (October 2025)**: Login page redesigned to match unit login visual style with bg-muted background, rounded-xl shadow-lg forms, lucide-react icons in inputs (Mail, CreditCard), framer-motion animations, and consistent color scheme. Dashboard completely redesigned (October 2025) with clean, modern layout: KPI cards with trend indicators, commission summary cards, and responsive grid layout. Header with dark text (#060606) on teal gradient background for better contrast. Unified color palette using teal shades (#257273, #277677, #e6f2f2) throughout for visual consistency.
-   **Atendimentos Management (formerly "Guias", October 2025)**: Complete refactoring renamed all "Guias" terminology to "Atendimentos" across database, backend, and frontend for clarity and consistency in Portuguese (pt-BR). Database table `guides` renamed to `atendimentos`, all endpoints updated from `/guides` to `/atendimentos` (`/admin/api/atendimentos`, `/api/units/:slug/atendimentos`), and frontend components/pages renamed (Atendimentos.tsx, AtendimentoForm.tsx, AtendimentosPage.tsx, UnitAtendimentos.tsx). **Total Internal Refactoring (October 2025)**: Completed comprehensive refactoring of ~500+ occurrences across entire codebase - ALL internal variables, function names, parameters, types, interfaces, and comments migrated from "guide/guides" to "atendimento/atendimentos" for complete Portuguese masculine concordance. Key transformations: `allGuides→allAtendimentos`, `Guide→Atendimento`, `GuideWithDetails→AtendimentoWithDetails`, `PetWithGuides→PetWithAtendimentos`, `invalidateGuideData→invalidateAtendimentoData`, `guideData→atendimentoData`. Zero residual "guide" references remain in codebase. Intelligent form with procedure filtering by pet's plan and usage, automatic coparticipation filling, and validation of annual limits/grace periods. Client/pet selection via exact CPF search with optimized endpoint. **Cache Versioning (October 2025)**: Implemented automatic cache invalidation system using localStorage versioning (version 2.0) to clear old React Query cache after refactoring. System detects version changes and automatically clears stale cache on both admin and public query clients, resolving issues where old "guides" data prevented display of new "atendimentos" data. **Unit Atendimentos Management (October 2025)**: Updated unit atendimentos page (`/unidade/:slug/atendimentos`) to match admin layout with table, filters, pagination, column preferences, and sequential "Nº" column. Unit sidebar (`client/src/components/unit/UnitSidebar.tsx`) supports subitems - "Novo Atendimento" added as subitem under "Atendimentos" menu item (accessible via `/unidade/:slug/atendimentos/novo`). Created unit atendimento creation page with pre-filled network unit based on URL slug (non-editable for security). Unit endpoints use `/api/units/:slug/atendimentos` with Bearer token authentication from localStorage ('unit-token'). Status editing implemented with PUT endpoint allowing units to update status (open/closed/cancelled). **Unit History (October 2025)**: Added "Histórico de atendimento" page (`/unidade/:slug/historico`) displaying all service history grouped chronologically by date with detail popup functionality showing pet information and procedures. Uses client-side pagination for optimal performance with up to 1000 records. **Date Period Filtering (October 2025)**: Implemented unified date period filter using CalendarDate from @internationalized/date on atendimentos page. Filter uses 500ms debounce for optimal performance, converting CalendarDate to native Date objects for accurate start/end of day comparisons with server-side filtering.
-   **Performance**: Optimized login and navigation, reduced database queries, `AuthContext` with `sessionStorage` caching. Instant admin redirects and optimized network units page with skeleton loaders.
-   **Data Updates**: Migrated all data updates from `window.location.reload()` to React Query invalidation for improved UX.

### System Design Choices
-   **API Design**: RESTful with structured error handling.
-   **Performance**: Code splitting, lazy loading, optimized bundle sizes, connection pooling, query optimization, response compression.
-   **Deployment**: Separate client/server builds for development, unified server for production. Standardized port configuration (5000 in production). Enhanced CORS and security configurations for Replit deployment, ensuring proper handling of `.replit.app` and `.replit.dev` domains. Trust proxy configuration enabled in production for correct HTTPS cookie handling behind Replit's proxy (October 2025).

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