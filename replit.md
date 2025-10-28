# UNIPET PLAN - Pet Health Plan System

## Overview
UNIPET PLAN is a comprehensive pet health plan management system designed for pet insurance administration, customer relationship management, and healthcare network unit management. It features a customer-facing website for plan selection and quote requests, alongside an admin dashboard for content and business management. The system aims to streamline pet healthcare administration, enhance user experience, and capitalize on the market potential within the pet insurance sector through a full-stack TypeScript solution.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend utilizes React 18 with TypeScript, Vite, and Wouter for routing (user-facing routes in Portuguese). Styling is managed with Tailwind CSS, Radix UI, and shadcn/ui. State management is handled by TanStack React Query, while React Hook Form with Zod validation manages forms. Framer Motion provides animations, including standardized button and page loading states. The design emphasizes responsiveness with dynamic grid adjustments. The admin interface maintains high consistency in design patterns, navigation, and component styling. Features include step-by-step navigation for "Atendimento" creation with animations and visual progress, and support for decimal percentages in admin rules settings. A comprehensive Unit Dashboard at `/unidade/:slug/painel` provides real-time charts for procedures sold, value by user, and total sales statistics, with consistent styling and 30-second auto-refresh.

**Admin Routing**: The admin section uses Wouter's nested router with `base="/admin"`. All navigation within admin components uses relative paths (e.g., `/clientes` instead of `/admin/clientes`) to prevent path duplication. Components using `setLocation` from Wouter hooks use relative paths that are automatically resolved by the base router, while components using `window.location.href` require absolute paths.

### Technical Implementations
The backend is built with Node.js, Express.js, and TypeScript, utilizing PostgreSQL with Drizzle ORM. Authentication is session-based for Admin users and uses JWT, bcrypt, and Express sessions for clients, with client login migrating to CPF hashing. Security measures include Helmet, CORS, rate limiting, input sanitization, CSRF, XSS, SQL injection prevention, mass assignment protection, comprehensive admin endpoint protection, and IDOR prevention. Strict CORS validation uses URL parsing. Admin password security supports both bcrypt-hashed and plain text passwords, with environment-aware validation for Replit deployments. Image management uses Supabase Storage for uploads and Sharp for processing. Dynamic contract management allows contract text to be editable in `/admin/configuracoes` and automatically displayed in `/cliente/contrato` with placeholder replacement for client data. PDF generation dynamically uses this contract text.

**Checkout Error Handling**: The checkout flow includes comprehensive validation error handling for credit card payments. The backend (`/api/checkout/simple-process`) detects `CieloApiError` exceptions and returns specific error codes (e.g., `INVALID_CPF`, `INVALID_CARD_NUMBER`, `EXPIRED_CARD`, `INVALID_CVV`) with clear Portuguese messages. The frontend maps these codes to user-friendly messages that provide actionable guidance (e.g., "Por favor, insira um CPF válido. Verifique se digitou corretamente todos os 11 dígitos"). This ensures customers receive clear, specific feedback when validation fails, improving the checkout experience.

Key features include extensive admin management (FAQs, Site Settings, Network Units, Procedures, Clients, Coupons, Surveys, Sellers, Admin Users), a customer dashboard (pets, procedures, financial, surveys), and a Unit Portal (client/pet management, guide creation). The system supports 23 predefined procedure categories, comprehensive seller management with whitelabel URLs and commission tracking, and a refactored "Atendimentos" (formerly "Guias") management system. This refactoring includes terminology renaming, intelligent forms for procedure filtering and coparticipation, and an automatic cache invalidation system. Unit-specific "Atendimentos" management includes dedicated pages, authentication, status editing, and historical views, displaying creator attribution. Unit dashboard statistics provide aggregated counts of unique clients and pets. Performance is optimized via code splitting, lazy loading, and reduced database queries. Contract status management includes payment webhook fixes. Enhanced search functionality supports comprehensive multi-field CPF search with debouncing across Admin Panel and Network Unit financial sections. Contract coparticipation logic is automatically determined by plan type (BASIC/INFINITY plans have coparticipation, COMFORT/PLATINUM do not). A contract status validation system prevents "Atendimento" creation for suspended or cancelled contracts, with backend validation and frontend alerts. Data tables across admin and unit portals display records in descending chronological order. Fixed an issue where pets with the INFINITY plan weren't showing procedures in "Atendimento" creation pages.

### System Design Choices
The API is RESTful with structured error handling. Performance optimizations include code splitting, lazy loading, optimized bundle sizes, connection pooling, query optimization, and response compression. Deployment involves separate client/server builds for development and a unified server for production, with standardized port configuration and enhanced CORS/security for Replit environments, including trust proxy. The development workflow uses a two-server setup with Vite proxying API requests.

Authentication uses a unified login system at `/unidade/:slug` that automatically detects user type (unit, veterinarian, or admin) via a single endpoint and redirects based on role. The `veterinarians` table includes an `isAdmin` field to manage full system access, dynamically adapting the "Corpo Clínico" interface.

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