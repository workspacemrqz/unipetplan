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
-   **Guide Management**: Intelligent guide form with procedure filtering by pet's plan and usage, automatic coparticipation filling, and validation of annual limits/grace periods. Client/pet selection via exact CPF search with optimized endpoint.
-   **Performance**: Optimized login and navigation, reduced database queries, `AuthContext` with `sessionStorage` caching. Instant admin redirects and optimized network units page with skeleton loaders.
-   **Data Updates**: Migrated all data updates from `window.location.reload()` to React Query invalidation for improved UX.

### System Design Choices
-   **API Design**: RESTful with structured error handling.
-   **Performance**: Code splitting, lazy loading, optimized bundle sizes, connection pooling, query optimization, response compression.
-   **Deployment**: Separate client/server builds for development, unified server for production. Standardized port configuration (5000 in production). Enhanced CORS and security configurations for Replit deployment, ensuring proper handling of `.replit.app` and `.replit.dev` domains.

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