# UNIPET PLAN - Pet Health Plan System

## Overview
UNIPET PLAN is a comprehensive pet health plan management system for pet insurance administration, customer relationship management, and healthcare network unit management. It includes a customer-facing website for plan selection and quote requests, and an admin dashboard for content and business management. The system aims to streamline pet healthcare administration and enhance user experience through a full-stack TypeScript solution, focusing on business vision and market potential in the pet insurance sector.

## Recent Changes

### Admin Login Redirect Investigation (October 21, 2025)
**Investigation Completed**: Comprehensive investigation of admin login redirecionamento system to identify and prevent potential `/admin/admin` redirect issue.

**Problem Reported**: After login, the system could be redirecting to `unipetplan.com.br/admin/admin` instead of `/admin`, resulting in a 404 error.

**Root Cause Identified**: Route duplication in `client/src/App.tsx` (lines 289-290):
```typescript
// BEFORE (Duplicated routes)
<Route path="/admin" component={AdminRouter} />
<Route path="/admin/:rest*" component={AdminRouter} />
```

Both routes were rendering the same `AdminRouter` component which uses `<WouterRouter base="/admin">`, potentially causing path concatenation issues.

**Solution Applied**:
- ✅ Removed duplicate route in `client/src/App.tsx`
- ✅ Kept only the catch-all route: `<Route path="/admin/:rest*" component={AdminRouter} />`
- ✅ AdminRouter configuration remains unchanged with `base="/admin"`

**Files Modified**:
- `client/src/App.tsx` (line 289): Removed duplicate route `<Route path="/admin" component={AdminRouter} />`

**Testing Performed**:
- ✅ `/admin` without login → Correctly redirects to `/admin/login`
- ✅ `/admin/admin` without login → Correctly redirects to `/admin/login` (no 404)
- ✅ Admin routes functioning correctly with proper authentication guard

**Verification**:
- ✅ `admin-login.tsx` (line 54): Redirect code confirmed correct: `window.location.href = '/admin'`
- ✅ `AuthGuard.tsx`: Authentication verification working properly
- ✅ No backend middleware adding extra `/admin` prefix
- ✅ Wouter routing with `base="/admin"` functioning as expected

**Result**: The potential routing issue has been prevented by removing route duplication. The login flow now works correctly with a clean routing structure.

### User Management - Deactivate/Delete Actions (October 21, 2025)
**Investigation Completed**: Comprehensive code review of user deactivation and deletion functionality in the Administration panel (`/admin/administracao`) confirmed all features are working correctly:

**Backend Endpoints (server/routes.ts)**:
- ✅ `PUT /admin/api/users/:id` (lines 3681-3715): Updates user data including `isActive` status with proper authentication, validation, password hashing, and admin action logging
- ✅ `DELETE /admin/api/users/:id` (lines 3717-3730): Deletes user with proper authentication and admin action logging
- ✅ `POST /admin/api/admin/verify-password` (lines 717-760): Verifies admin password for deletion confirmation with rate limiting

**Database Layer (server/storage.ts)**:
- ✅ `updateUser(id, userData)` (lines 2070-2077): Updates user records with automatic `updatedAt` timestamp
- ✅ `deleteUser(id)` (lines 2079-2082): Deletes user records, returns boolean for success confirmation

**Frontend Implementation (client/src/pages/admin/Administration.tsx)**:
- ✅ `toggleUserMutation` (lines 217-235): Toggles user active status with cache invalidation and toast feedback
- ✅ `deleteMutation` (lines 169-187): Deletes users with cache invalidation and toast feedback
- ✅ `handleToggleStatus` (line 311-313): Toggles between active/inactive states
- ✅ `handleDelete` (lines 273-278): Opens secure deletion confirmation dialog
- ✅ `confirmDelete` (lines 280-309): Verifies admin password before executing deletion

**UI Components**:
- ✅ Active/Inactive Switch (lines 843-853): Visual toggle with loading state and test IDs
- ✅ Edit Button (lines 858-867): Permission-controlled with disabled state and tooltips
- ✅ Delete Button (lines 868-877): Permission-controlled with disabled state and tooltips
- ✅ Deletion Confirmation Dialog (lines 1283-1342): Secure password verification, error handling, loading states

**Security Features**:
- Password verification required for all deletions
- Permission-based button enabling/disabling via `canEdit()` and `canDelete()`
- Rate limiting on password verification endpoint
- Admin action logging for all modifications
- Input validation with Zod schemas

**No corrections needed** - all functionality is properly implemented with security best practices, error handling, and user feedback mechanisms.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React 18 with TypeScript and Vite, Wouter for routing (user-facing routes in Portuguese), and Tailwind CSS with Radix UI and shadcn/ui for styling. State management is handled by TanStack React Query, and forms utilize React Hook Form with Zod validation. Framer Motion provides animations, including standardized button and page loading states. Responsive design with dynamic grid adjustments is a key focus. The admin interface maintains high consistency in design patterns, navigation, and component styling (e.g., dropdowns, buttons, detail popups). Specific features include step-by-step navigation for "Atendimento" creation with animations and visual progress indicators, and support for decimal percentages in admin rules settings. **Unit Dashboard (October 2025)**: Comprehensive dashboard with real-time charts at `/unidade/:slug/painel` showing procedures sold, value by user, and total sales statistics. All cards use consistent styling matching admin "Visão Geral em Gráficos" section with white backgrounds, semantic classes, and responsive layouts. Charts auto-refresh every 30 seconds.

### Technical Implementations
The backend is built with Node.js, Express.js, and TypeScript. PostgreSQL with Drizzle ORM is used for the database. Authentication is session-based for Admin, and uses JWT, bcrypt, and Express sessions for clients, with client login migrating to CPF hashing. Robust security measures are in place, including Helmet, CORS, rate limiting, input sanitization, CSRF, XSS, SQL injection prevention, mass assignment protection, comprehensive admin endpoint protection, and IDOR prevention. Strict CORS validation is implemented using URL parsing to prevent domain bypass attacks. Admin password security (October 2025): Supports both bcrypt-hashed and plain text passwords with environment-aware validation. Detects Replit environments (via REPL_ID, REPL_OWNER, REPLIT_DEPLOYMENT) and allows plain text passwords even when NODE_ENV='production', while non-Replit production environments require bcrypt hashes for security. Image management leverages Supabase Storage for uploads and Sharp for processing. **Dynamic Contract Management (October 2025)**: Contract text is editable in /admin/configuracoes (site_settings.contract_text) and automatically displays in /cliente/contrato with placeholder replacement ([Nome do Cliente], [CPF do Cliente] replaced with actual client data). PDF generation uses dynamic contract text from database with automatic placeholder substitution.

Key features include extensive admin management (FAQs, Site Settings, Network Units, Procedures, Clients, Coupons, Surveys, Sellers), a customer dashboard (pets, procedures, financial, surveys), and a Unit Portal (client/pet management, guide creation). The system supports procedure categorization with 23 predefined categories, a comprehensive seller management system with whitelabel URLs and commission tracking, and a completely refactored "Atendimentos" (formerly "Guias") management system. This refactoring involved renaming terminology across the entire codebase, implementing an intelligent form for procedure filtering and coparticipation, and an automatic cache invalidation system using localStorage versioning. Unit-specific "Atendimentos" management includes dedicated pages, authentication, status editing, and a historical view. Atendimentos display creator attribution (veterinarian name or "Unidade") in detail popups and copied text, implemented via leftJoin with veterinarians table. Veterinarians see only their own created atendimentos while units see all. A comprehensive action logging system tracks user actions on "Atendimento" creation pages. Unit dashboard statistics provide aggregated counts of unique clients and pets. Performance is optimized through various techniques like code splitting, lazy loading, and reduced database queries. Contract status management includes fixes for critical bugs related to payment webhooks. **Enhanced Search Functionality (October 2025)**: Implemented comprehensive CPF search across Admin Panel and Network Unit financial sections. All financial and report endpoints (/admin/api/payment-receipts, /admin/api/relatorio-financeiro, /api/units/:slug/atendimentos, /api/units/:slug/relatorio-financeiro) now support multi-field searching including CPF (with normalization by removing non-digit characters), clientName, petName, procedure, networkUnitName, and other relevant fields. Frontend components implement 500ms debounced search to optimize API performance, automatically resetting pagination when search terms change. **Contract Coparticipation Logic (October 2025)**: Contracts automatically determine coparticipation based on plan type - plans without waiting period (BASIC/INFINITY) HAVE coparticipation (hasCoparticipation=true), while plans with waiting period (COMFORT/PLATINUM) do NOT have coparticipation (hasCoparticipation=false). The createContract function validates plan existence and type before assignment, throwing explicit errors for invalid data. All existing contracts were migrated to reflect this correct logic. **Contract Status Validation (October 2025)**: Comprehensive validation system prevents atendimento creation when contracts are suspended or cancelled. Backend validation in both admin (/admin/api/atendimentos) and unit (/api/units/:slug/atendimentos) endpoints checks contract status and returns 403 errors with clear messaging. Frontend SteppedAtendimentoForm displays visual warning alerts and blocks step progression when pet has suspended/cancelled contract. New dedicated endpoints (/admin/api/pets/:id/contracts and /api/units/:slug/pets/:petId/contracts) provide contract status lookup. React Query cache invalidation ensures immediate status recognition when contracts are updated via predicate-based query invalidation. A complete administrative audit logging system tracks all admin panel actions with detailed filtering. **Automatic backend logging (October 2025)**: All administrative CRUD operations are now automatically logged in the backend using the `logAdminAction()` helper function, capturing 50+ operations across 13 categories including Planos, Procedimentos, Unidades da Rede, Clientes, Vendedores, Cupons, FAQ, Pets, Contratos, Atendimentos, Configurações, and Usuários Admin. The admin_action_logs schema supports both database-backed admin users (with userId) and environment-variable-based admins (with adminIdentifier for tracking). Schema updated via SQL: admin_user_id is nullable, admin_identifier is NOT NULL with DEFAULT 'unknown'. **Chronological sorting (October 2025)**: All data tables across admin and unit portals now display records in descending chronological order (newest first) by createdAt/date. Client-side sorting implemented in 15 pages using `[...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())` applied after filtering and before pagination: Admin pages (Clients, Sellers, Network, Financial, Plans, Contracts, Coupons, Procedures, FAQ, ContactSubmissions, Evaluations, SellerPayments, RelatorioFinanceiro) and Unit components (CorpoClinicoPage, UnitRelatorioFinanceiro). Spread operator used to prevent React Query cache mutation. Server-side sorting already implemented in atendimentos endpoints for both admin and unit portals. AdminLogsPage and unit LogsPage use backend-sorted pagination. **INFINITY plan procedures fix (October 2025)**: Fixed issue where pets with INFINITY plan weren't showing procedures in atendimento creation pages. Backend routes `/admin/api/pets/:id/available-procedures` and `/api/units/:slug/pets/:petId/available-procedures` now correctly identify unlimited procedures by checking for keywords ('ilimitado', 'sem limite', 'unlimited', 'infinity') in limitesAnuais field and treating annualLimit=0 as unlimited for INFINITY plans. Updated canUse logic to always allow unlimited procedures (if no waiting period) and removed the restrictive `annualLimit > 0` filter.

### System Design Choices
The API is RESTful with structured error handling. Performance optimizations include code splitting, lazy loading, optimized bundle sizes, connection pooling, query optimization, and response compression. Deployment involves separate client/server builds for development and a unified server for production, with standardized port configuration and enhanced CORS/security for Replit environments, including trust proxy configuration. The development workflow uses a simple two-server setup with Vite proxying API requests.

### Authentication Improvements (October 2025)
**Unified Login System**: Single login form at `/unidade/:slug` that automatically detects user type (unit, veterinarian, or admin) through the `/api/unified-auth/login` endpoint. The system tries unit authentication first, then veterinarian/admin if unit fails. Users are redirected based on their role: units and admins to dashboard (`/painel`), veterinarians to new attendance page (`/atendimentos/novo`). This replaces the previous tab-based login system for improved UX.

**Veterinarian/Admin Management**: The veterinarians table now includes an `isAdmin` boolean field to distinguish between regular veterinarians and administrators. Administrators automatically receive full system access (`canAccessAtendimentos=true`) and don't require veterinary-specific fields (CRMV, specialty, type). The "Corpo Clínico" interface dynamically adapts form fields based on user role selection.

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