# UNIPET PLAN - Pet Health Plan System

## Overview
UNIPET PLAN is a comprehensive pet health plan management system for pet insurance administration, customer relationship management, and healthcare network unit management. It includes a customer-facing website for plan selection and quote requests, and an admin dashboard for content and business management. The system aims to streamline pet healthcare administration and enhance user experience through a full-stack TypeScript solution, focusing on business vision and market potential in the pet insurance sector.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React 18 with TypeScript and Vite, Wouter for routing (user-facing routes in Portuguese), and Tailwind CSS with Radix UI and shadcn/ui for styling. State management is handled by TanStack React Query, and forms utilize React Hook Form with Zod validation. Framer Motion provides animations, including standardized button and page loading states. Responsive design with dynamic grid adjustments is a key focus. The admin interface maintains high consistency in design patterns, navigation, and component styling (e.g., dropdowns, buttons, detail popups). Specific features include step-by-step navigation for "Atendimento" creation with animations and visual progress indicators, and support for decimal percentages in admin rules settings. **Unit Dashboard (October 2025)**: Comprehensive dashboard with real-time charts at `/unidade/:slug/painel` showing procedures sold, value by user, and total sales statistics. All cards use consistent styling matching admin "Visão Geral em Gráficos" section with white backgrounds, semantic classes, and responsive layouts. Charts auto-refresh every 30 seconds.

### Technical Implementations
The backend is built with Node.js, Express.js, and TypeScript. PostgreSQL with Drizzle ORM is used for the database. Authentication is session-based for Admin, and uses JWT, bcrypt, and Express sessions for clients, with client login migrating to CPF hashing. Robust security measures are in place, including Helmet, CORS, rate limiting, input sanitization, CSRF, XSS, SQL injection prevention, mass assignment protection, comprehensive admin endpoint protection, and IDOR prevention. Strict CORS validation is implemented using URL parsing to prevent domain bypass attacks. Admin password security (October 2025): Supports both bcrypt-hashed and plain text passwords with environment-aware validation. Detects Replit environments (via REPL_ID, REPL_OWNER, REPLIT_DEPLOYMENT) and allows plain text passwords even when NODE_ENV='production', while non-Replit production environments require bcrypt hashes for security. Image management leverages Supabase Storage for uploads and Sharp for processing.

Key features include extensive admin management (FAQs, Site Settings, Network Units, Procedures, Clients, Coupons, Surveys, Sellers), a customer dashboard (pets, procedures, financial, surveys), and a Unit Portal (client/pet management, guide creation). The system supports procedure categorization with 23 predefined categories, a comprehensive seller management system with whitelabel URLs and commission tracking, and a completely refactored "Atendimentos" (formerly "Guias") management system. This refactoring involved renaming terminology across the entire codebase, implementing an intelligent form for procedure filtering and coparticipation, and an automatic cache invalidation system using localStorage versioning. Unit-specific "Atendimentos" management includes dedicated pages, authentication, status editing, and a historical view. Atendimentos display creator attribution (veterinarian name or "Unidade") in detail popups and copied text, implemented via leftJoin with veterinarians table. Veterinarians see only their own created atendimentos while units see all. A comprehensive action logging system tracks user actions on "Atendimento" creation pages. Unit dashboard statistics provide aggregated counts of unique clients and pets. Performance is optimized through various techniques like code splitting, lazy loading, and reduced database queries. Contract status management includes fixes for critical bugs related to payment webhooks. A complete administrative audit logging system tracks all admin panel actions with detailed filtering. **Automatic backend logging (October 2025)**: All administrative CRUD operations are now automatically logged in the backend using the `logAdminAction()` helper function, capturing 50+ operations across 13 categories including Planos, Procedimentos, Unidades da Rede, Clientes, Vendedores, Cupons, FAQ, Pets, Contratos, Atendimentos, Configurações, and Usuários Admin. The admin_action_logs schema supports both database-backed admin users (with userId) and environment-variable-based admins (with adminIdentifier for tracking). Schema updated via SQL: admin_user_id is nullable, admin_identifier is NOT NULL with DEFAULT 'unknown'.

### System Design Choices
The API is RESTful with structured error handling. Performance optimizations include code splitting, lazy loading, optimized bundle sizes, connection pooling, query optimization, and response compression. Deployment involves separate client/server builds for development and a unified server for production, with standardized port configuration and enhanced CORS/security for Replit environments, including trust proxy configuration. The development workflow uses a simple two-server setup with Vite proxying API requests.

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