import { Switch, Route, Router as WouterRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Suspense } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Plans from "@/pages/plans";
import About from "@/pages/about";
import Contact from "@/pages/contact";
import FAQ from "@/pages/faq";
import Network from "@/pages/network";
import UnitLoginPage from "@/pages/unit-login";
import UnitDashboard from "@/pages/unit-dashboard";
import GuiasPage from "@/pages/unit/GuiasPage";
import NovaGuiaPage from "@/pages/unit/NovaGuiaPage";
import ClientesPage from "@/pages/unit/ClientesPage";
import ProcedimentosPage from "@/pages/unit/ProcedimentosPage";
import PrivacyPolicy from "@/pages/privacy-policy";
import TermsOfUse from "@/pages/terms-of-use";
import CheckoutPage from "@/pages/checkout";
import CheckoutSuccessPage from "@/pages/checkout-success";
import CustomerLoginPage from "@/pages/customer-login";
import CustomerDashboard from "@/pages/customer-dashboard";
import CustomerPets from "@/pages/customer-pets";
import CustomerProfile from "@/pages/customer-profile";
import CustomerSurveys from "@/pages/customer-surveys";
import CustomerFinancial from "@/pages/customer-financial";
import CustomerProcedures from "@/pages/customer-procedures";
import RenewalCheckout from "@/pages/renewal-checkout";
import InstallmentPayment from "@/pages/installment-payment";
import TelemedicinePage from "@/pages/telemedicine";
import AdminLoginPage from "@/pages/admin-login";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import ScrollToTop from "@/components/scroll-to-top";
import ErrorBoundary from "@/components/error-boundary";
import PageLayout from "@/components/layout/page-layout";
import ChatAI from "@/components/chat/chat-ai";

// Admin imports
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminLayout from "@/components/admin/Layout";
import AuthGuard from "@/components/admin/AuthGuard";
import { queryClient as adminQueryClient } from "./lib/admin/queryClient";

// Componente de loading global com fallback robusto
function GlobalLoading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-gradient-to-br from-primary to-teal-dark">
      <div className="text-center">
        <div className="w-16 h-16 border-4 rounded-full animate-spin mx-auto mb-6" style={{ borderColor: 'rgb(var(--gold))', borderTopColor: 'transparent' }}></div>
        <div className="text-lg" style={{ color: 'rgb(var(--gold))' }}>Carregando...</div>
      </div>
    </div>
  );
}

// Import admin pages - direct imports for instant navigation
import AdminClients from './pages/admin/Clients';
import AdminClientForm from './pages/admin/ClientForm';
import AdminPetForm from './pages/admin/PetForm';
import AdminGuides from './pages/admin/Guides';
import AdminGuideForm from './pages/admin/GuideForm';
import AdminPlans from './pages/admin/Plans';
import AdminPlanForm from './pages/admin/PlanForm';
import AdminNetwork from './pages/admin/Network';
import AdminNetworkForm from './pages/admin/NetworkForm';
import AdminProcedures from './pages/admin/Procedures';
import AdminFAQ from './pages/admin/FAQ';
import AdminContactSubmissions from './pages/admin/ContactSubmissions';
import AdminSettings from './pages/admin/Settings';
import AdminAdministration from './pages/admin/Administration';
import AdminUnitDashboard from './pages/admin/UnitDashboard';
import AdminFinancial from './pages/admin/Financial';
import AdminContracts from './pages/admin/Contracts';
import AdminCoupons from './pages/admin/Coupons';
import AdminEvaluations from './pages/admin/Evaluations';
import AdminSellers from './pages/admin/Sellers';
import AdminSellerForm from './pages/admin/SellerForm';
import AdminSellerPayments from './pages/admin/SellerPayments';
import AdminNotFound from './pages/admin/not-found';
import { AuthProvider } from './contexts/AuthContext';
import { SellerAuthProvider } from './contexts/SellerAuthContext';

// Import seller pages
import SellerLogin from './pages/seller-login';
import SellerDashboard from './pages/seller-dashboard';
import SellerLink from './pages/seller-link';
import SellerReferral from './pages/seller-referral';

// AdminRouter - handles all admin routes with base="/admin"
function AdminRouter() {
  return (
    <WouterRouter base="/admin">
      <QueryClientProvider client={adminQueryClient}>
        <AuthGuard>
          <AdminLayout>
          <Switch>
            {/* Dashboard route */}
            <Route path="/" component={AdminDashboard} />
            
            {/* Client management routes */}
            <Route path="/clientes" component={AdminClients} />
            <Route path="/clientes/novo" component={AdminClientForm} />
            <Route path="/clientes/:id/editar" component={AdminClientForm} />
            <Route path="/clientes/:clientId/pets/novo" component={AdminPetForm} />
            
            {/* Pet management routes */}
            <Route path="/pets/:id/editar" component={AdminPetForm} />
            
            {/* Guide management routes */}
            <Route path="/guias" component={AdminGuides} />
            <Route path="/guias/novo" component={AdminGuideForm} />
            <Route path="/guias/:id/editar" component={AdminGuideForm} />
            
            {/* Plan management routes */}
            <Route path="/planos" component={AdminPlans} />
            <Route path="/planos/novo" component={AdminPlanForm} />
            <Route path="/planos/:id/editar" component={AdminPlanForm} />
            
            {/* Network management routes */}
            <Route path="/rede" component={AdminNetwork} />
            <Route path="/rede/novo" component={AdminNetworkForm} />
            <Route path="/rede/:id/editar" component={AdminNetworkForm} />
            
            {/* Seller management routes */}
            <Route path="/vendedores" component={AdminSellers} />
            <Route path="/vendedores/novo" component={AdminSellerForm} />
            <Route path="/vendedores/:id/editar" component={AdminSellerForm} />
            <Route path="/vendedores/:id/pagamentos" component={AdminSellerPayments} />
            
            {/* Financial and Contracts routes */}
            <Route path="/financeiro" component={AdminFinancial} />
            <Route path="/cupom" component={AdminCoupons} />
            <Route path="/contratos" component={AdminContracts} />
            
            {/* Other admin routes */}
            <Route path="/procedimentos" component={AdminProcedures} />
            <Route path="/perguntas-frequentes" component={AdminFAQ} />
            <Route path="/formularios" component={AdminContactSubmissions} />
            <Route path="/avaliacoes" component={AdminEvaluations} />
            <Route path="/configuracoes" component={AdminSettings} />
            <Route path="/administracao" component={AdminAdministration} />
            
            {/* Unit Dashboard (special case) */}
            <Route path="/unidade/:slug" component={AdminUnitDashboard} />
            
            {/* Fallback */}
            <Route component={AdminNotFound} />
          </Switch>
          </AdminLayout>
        </AuthGuard>
      </QueryClientProvider>
    </WouterRouter>
  );
}

// Componente de roteamento principal
function Router() {
  return (
    <>
      <ScrollToTop />
      <Switch>
        
        {/* Admin Login Route (must come before other admin routes) */}
        <Route path="/admin/login" component={AdminLoginPage} />
        
        {/* Admin Routes - all routes starting with /admin */}
        <Route path="/admin" component={AdminRouter} />
        <Route path="/admin/:rest*" component={AdminRouter} />
        
        {/* Checkout Routes (standalone) */}
        <Route path="/checkout/1" component={() => (<><CheckoutPage /><ChatAI /></>)} />
        <Route path="/checkout/2" component={() => (<><CheckoutPage /><ChatAI /></>)} />
        <Route path="/checkout/3" component={() => (<><CheckoutPage /><ChatAI /></>)} />
        <Route path="/checkout/4" component={() => (<><CheckoutPage /><ChatAI /></>)} />
        <Route path="/checkout/:planId?" component={() => (<><CheckoutPage /><ChatAI /></>)} />
        <Route path="/checkout/sucesso" component={CheckoutSuccessPage} />
        
        {/* Customer Area Routes (standalone) */}
        <Route path="/cliente/login" component={() => (<><CustomerLoginPage /><ChatAI /></>)} />
        <Route path="/cliente/painel" component={() => (<><CustomerDashboard /><ChatAI /></>)} />
        <Route path="/cliente/pets" component={() => (<><CustomerPets /><ChatAI /></>)} />
        <Route path="/cliente/perfil" component={() => (<><CustomerProfile /><ChatAI /></>)} />
        <Route path="/cliente/pesquisas" component={() => (<><CustomerSurveys /><ChatAI /></>)} />
        <Route path="/cliente/financeiro" component={() => (<><CustomerFinancial /><ChatAI /></>)} />
        <Route path="/cliente/procedimentos" component={() => (<><CustomerProcedures /><ChatAI /></>)} />
        <Route path="/cliente/renovacao" component={() => (<><RenewalCheckout /><ChatAI /></>)} />
        <Route path="/cliente/pagamento" component={() => (<><InstallmentPayment /><ChatAI /></>)} />
        <Route path="/cliente/telemedicina" component={() => (<><TelemedicinePage /><ChatAI /></>)} />
        
        {/* Seller Area Routes */}
        <Route path="/vendedor/login" component={SellerLogin} />
        <Route path="/vendedor/dashboard" component={SellerDashboard} />
        <Route path="/vendedor/link" component={SellerLink} />
        <Route path="/vendedor/:slug" component={SellerReferral} />
        
        {/* Unit Routes - specific paths first */}
        <Route path="/unidade/:slug/painel" component={UnitDashboard} />
        <Route path="/unidade/:slug/guias/novo" component={NovaGuiaPage} />
        <Route path="/unidade/:slug/guias" component={GuiasPage} />
        <Route path="/unidade/:slug/clientes" component={ClientesPage} />
        <Route path="/unidade/:slug/procedimentos" component={ProcedimentosPage} />
        
        {/* Public Routes with Layout - MUST come before /:slug */}
        <Route path="/" component={() => (
          <PageLayout>
            <div className="min-h-screen bg-background">
              <Header />
              <main>
                <Suspense fallback={<GlobalLoading />}>
                  <Home />
                </Suspense>
              </main>
              <Footer />
            </div>
          </PageLayout>
        )} />
        
        <Route path="/planos" component={() => (
          <PageLayout>
            <div className="min-h-screen bg-background">
              <Header />
              <main>
                <Suspense fallback={<GlobalLoading />}>
                  <Plans />
                </Suspense>
              </main>
              <Footer />
            </div>
          </PageLayout>
        )} />
        
        <Route path="/sobre" component={() => (
          <PageLayout>
            <div className="min-h-screen bg-background">
              <Header />
              <main>
                <Suspense fallback={<GlobalLoading />}>
                  <About />
                </Suspense>
              </main>
              <Footer />
            </div>
          </PageLayout>
        )} />
        
        <Route path="/contato" component={() => (
          <PageLayout>
            <div className="min-h-screen bg-background">
              <Header />
              <main>
                <Suspense fallback={<GlobalLoading />}>
                  <Contact />
                </Suspense>
              </main>
              <Footer />
            </div>
          </PageLayout>
        )} />
        
        <Route path="/faq" component={() => (
          <PageLayout>
            <div className="min-h-screen bg-background">
              <Header />
              <main>
                <Suspense fallback={<GlobalLoading />}>
                  <FAQ />
                </Suspense>
              </main>
              <Footer />
            </div>
          </PageLayout>
        )} />
        
        <Route path="/rede-credenciada" component={() => (
          <PageLayout>
            <div className="min-h-screen bg-background">
              <Header />
              <main>
                <Suspense fallback={<GlobalLoading />}>
                  <Network />
                </Suspense>
              </main>
              <Footer />
            </div>
          </PageLayout>
        )} />
        
        <Route path="/rede" component={() => (
          <PageLayout>
            <div className="min-h-screen bg-background">
              <Header />
              <main>
                <Suspense fallback={<GlobalLoading />}>
                  <Network />
                </Suspense>
              </main>
              <Footer />
            </div>
          </PageLayout>
        )} />
        
        <Route path="/politica-privacidade" component={() => (
          <PageLayout>
            <div className="min-h-screen bg-background">
              <Header />
              <main>
                <Suspense fallback={<GlobalLoading />}>
                  <PrivacyPolicy />
                </Suspense>
              </main>
              <Footer />
            </div>
          </PageLayout>
        )} />
        
        <Route path="/termos-uso" component={() => (
          <PageLayout>
            <div className="min-h-screen bg-background">
              <Header />
              <main>
                <Suspense fallback={<GlobalLoading />}>
                  <TermsOfUse />
                </Suspense>
              </main>
              <Footer />
            </div>
          </PageLayout>
        )} />
        
        {/* Unit Login Route - MUST come AFTER all specific routes */}
        {/* This catches any slug that didn't match above routes */}
        <Route path="/unidade/:slug" component={UnitLoginPage} />
        
        {/* 404 Not Found - fallback for any unmatched route */}
        <Route component={() => (
          <PageLayout>
            <div className="min-h-screen bg-background">
              <Header />
              <main>
                <Suspense fallback={<GlobalLoading />}>
                  <NotFound />
                </Suspense>
              </main>
              <Footer />
            </div>
          </PageLayout>
        )} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <SellerAuthProvider>
              <Router />
              <ReactQueryDevtools initialIsOpen={false} />
            </SellerAuthProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;