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

### Technical Implementations
-   **Backend**: Node.js with Express.js, TypeScript, ES modules.
-   **Database**: PostgreSQL with Drizzle ORM.
-   **Authentication**: Session-based for Admin, JWT, bcrypt, Express sessions.
-   **Security**: Helmet, CORS, rate limiting, input sanitization, CSRF, XSS, SQL injection prevention, comprehensive mass assignment protection.
-   **Image Management**: Supabase Storage for uploads, Sharp for processing.
-   **Feature Highlights**: Admin management (FAQs, Site Settings, Network Units, Procedures, Clients, Coupons), customer dashboard (pets, procedures, financial), Unit Portal (client, pet management, guide creation), intelligent duplicate pet prevention, Brazilian phone formatting, password-protected deletions in admin, comprehensive coupon/discount system, differentiated billing logic (annual/monthly), strict billing period validation, customizable payment receipt PDFs, and annual plan renewal countdown.
-   **Performance**: Optimized login and navigation, reduced database queries, `AuthContext` with `sessionStorage` caching for client authentication data.
-   **Security Audit (October 2025)**: Comprehensive security audit completed with all 12 identified vulnerabilities fixed:
    -   **Critical (5)**: Admin bypass removed in production, cookies always secure with sameSite=strict, logs sanitized (no sensitive data exposure), webhook authentication mandatory, session regeneration on all logins
    -   **High (6)**: CORS restricted (no null origin in production), JWT secret enforcement (no fallbacks), enhanced file upload validation with Sharp, reduced rate limiting (30 req/min), error messages sanitized in production, session fixation prevention
    -   **Medium (1)**: API request timeouts (30s) configured
    -   **Low (1)**: CSP headers strengthened (no unsafe-inline, upgradeInsecureRequests enabled)

### System Design Choices
-   **API Design**: RESTful with structured error handling.
-   **Performance**: Code splitting, lazy loading, optimized bundle sizes, connection pooling, query optimization, response compression.
-   **Deployment**: Separate client/server builds, Node.js 18+ environment, health checks, graceful shutdown.

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