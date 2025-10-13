import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Book, 
  FileCode, 
  Database, 
  Shield, 
  GitBranch, 
  Globe, 
  Settings,
  CheckCircle,
  Command,
  LayoutDashboard
} from "lucide-react";

export default function Documentation() {
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Book className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Documentação Técnica</h1>
        </div>
        <p className="text-muted-foreground">
          Documentação completa do sistema UNIPET PLAN - Plataforma de Gerenciamento de Planos de Saúde Pet
        </p>
      </div>

      <Tabs defaultValue="resumo" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="funcionalidades">Funcionalidades</TabsTrigger>
          <TabsTrigger value="botoes">Botões</TabsTrigger>
          <TabsTrigger value="funcoes">Funções</TabsTrigger>
          <TabsTrigger value="apis">APIs</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="seguranca">Segurança</TabsTrigger>
        </TabsList>

        {/* Resumo Técnico */}
        <TabsContent value="resumo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCode className="h-5 w-5" />
                Resumo Técnico do Projeto
              </CardTitle>
              <CardDescription>Visão geral da arquitetura e tecnologias utilizadas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-3">UNIPET PLAN - Sistema de Planos de Saúde Pet</h3>
                <p className="text-muted-foreground mb-4">
                  Plataforma completa para gestão de planos de saúde para animais de estimação, incluindo 
                  administração de clientes, pets, rede credenciada, procedimentos e pagamentos.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Command className="h-4 w-4" />
                    Frontend
                  </h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• React 18 + TypeScript</li>
                    <li>• Vite (Build Tool)</li>
                    <li>• Wouter (Roteamento)</li>
                    <li>• Tailwind CSS + shadcn/ui</li>
                    <li>• TanStack React Query</li>
                    <li>• React Hook Form + Zod</li>
                    <li>• Framer Motion (Animações)</li>
                  </ul>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    Backend
                  </h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Node.js + Express.js</li>
                    <li>• TypeScript</li>
                    <li>• PostgreSQL (Neon)</li>
                    <li>• Drizzle ORM</li>
                    <li>• Express Sessions</li>
                    <li>• JWT + bcrypt</li>
                  </ul>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3">Estrutura do Projeto</h4>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-medium mb-2">Client (Frontend)</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• /pages - Páginas da aplicação</li>
                      <li>• /components - Componentes reutilizáveis</li>
                      <li>• /lib - Utilitários e configurações</li>
                      <li>• /hooks - Custom hooks</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium mb-2">Server (Backend)</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• /routes - Definição de rotas</li>
                      <li>• /services - Lógica de negócio</li>
                      <li>• /middleware - Middlewares</li>
                      <li>• /utils - Utilitários</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium mb-2">Shared</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• /schema.ts - Schemas do banco</li>
                      <li>• Tipos TypeScript compartilhados</li>
                      <li>• Validações Zod</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Funcionalidades */}
        <TabsContent value="funcionalidades" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Funcionalidades Implementadas
              </CardTitle>
              <CardDescription>Descrição detalhada de todas as funcionalidades do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-6">
                  {/* Gestão de Clientes */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      1. Gestão de Clientes e Pets
                    </h3>
                    <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                      <li>• Cadastro completo de clientes com dados pessoais e endereço</li>
                      <li>• Integração com ViaCEP para preenchimento automático de endereço</li>
                      <li>• Cadastro de pets com informações médicas, vacinas e histórico</li>
                      <li>• Vinculação de pets aos planos de saúde contratados</li>
                      <li>• Upload de fotos de pets via Supabase Storage</li>
                      <li>• Busca e filtros avançados de clientes</li>
                    </ul>
                  </div>

                  {/* Planos de Saúde */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      2. Planos de Saúde
                    </h3>
                    <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                      <li>• Criação e gestão de planos (Basic, Infinity, Comfort, Platinum)</li>
                      <li>• Configuração de preços por tipo de animal e porte</li>
                      <li>• Definição de carências e coparticipações por procedimento</li>
                      <li>• Gestão de procedimentos incluídos/excluídos em cada plano</li>
                      <li>• Ativação/desativação de planos</li>
                    </ul>
                  </div>

                  {/* Contratos */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      3. Gestão de Contratos
                    </h3>
                    <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                      <li>• Criação automática de contratos na finalização do checkout</li>
                      <li>• Gestão de status: ativo, inativo, suspenso, cancelado</li>
                      <li>• Cálculo automático de vencimentos e períodos de cobrança</li>
                      <li>• Parcelamento de pagamentos com controle de parcelas</li>
                      <li>• Renovação automática de contratos mensais/anuais</li>
                      <li>• Sistema de graça de 15 dias para pagamentos em atraso</li>
                    </ul>
                  </div>

                  {/* Pagamentos */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      4. Sistema de Pagamentos
                    </h3>
                    <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                      <li>• Integração com Cielo para pagamentos via cartão e PIX</li>
                      <li>• Checkout multi-etapas com validação progressiva</li>
                      <li>• Sistema de cupons de desconto (percentual/valor fixo)</li>
                      <li>• Geração automática de recibos em PDF com pdfMake</li>
                      <li>• Armazenamento seguro de recibos no Supabase Storage</li>
                      <li>• Webhooks da Cielo para atualização de status de pagamento</li>
                      <li>• Notificações por email de confirmação e lembretes</li>
                    </ul>
                  </div>

                  {/* Rede Credenciada */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      5. Rede Credenciada
                    </h3>
                    <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                      <li>• Cadastro de clínicas e hospitais veterinários</li>
                      <li>• Portal exclusivo para unidades da rede</li>
                      <li>• Gestão de veterinários por unidade (permanentes/volantes)</li>
                      <li>• Sistema de credenciais e permissões por veterinário</li>
                      <li>• Registro de atendimentos com procedimentos realizados</li>
                      <li>• Cálculo automático de coparticipação</li>
                    </ul>
                  </div>

                  {/* Atendimentos */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      6. Atendimentos
                    </h3>
                    <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                      <li>• Registro de atendimentos com múltiplos procedimentos</li>
                      <li>• Verificação automática de carências e limites anuais</li>
                      <li>• Controle de uso de procedimentos por pet/ano</li>
                      <li>• Geração de guias de atendimento</li>
                      <li>• Busca de clientes por CPF para emissão de carteirinha digital</li>
                    </ul>
                  </div>

                  {/* Área do Cliente */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      7. Área do Cliente
                    </h3>
                    <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                      <li>• Dashboard com informações de contratos e pets</li>
                      <li>• Visualização de procedimentos disponíveis por plano</li>
                      <li>• Histórico financeiro e pagamentos</li>
                      <li>• Abertura de protocolos de atendimento</li>
                      <li>• Solicitação de mudança de plano</li>
                      <li>• Avaliações e pesquisas de satisfação</li>
                      <li>• Renovação de contratos</li>
                    </ul>
                  </div>

                  {/* Vendedores */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      8. Sistema de Vendedores
                    </h3>
                    <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                      <li>• Cadastro de vendedores/parceiros</li>
                      <li>• Geração de links de vendedor personalizados</li>
                      <li>• Rastreamento de cliques e conversões</li>
                      <li>• Cálculo automático de comissões</li>
                      <li>• Gestão de pagamentos a vendedores</li>
                      <li>• Dashboard com analytics de performance</li>
                    </ul>
                  </div>

                  {/* Comunicação */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      9. Comunicação
                    </h3>
                    <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                      <li>• Chat com IA integrado (webhook configurável)</li>
                      <li>• Formulários de contato com validação</li>
                      <li>• Sistema de FAQ gerenciável</li>
                      <li>• Notificações por email (Nodemailer)</li>
                      <li>• Lembretes automáticos de pagamento</li>
                    </ul>
                  </div>

                  {/* Administração */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      10. Administração
                    </h3>
                    <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                      <li>• Gestão de usuários admin com controle de permissões</li>
                      <li>• Configurações globais do site</li>
                      <li>• Logs de auditoria de ações administrativas</li>
                      <li>• Dashboard com métricas e relatórios</li>
                      <li>• Controle de visibilidade de colunas em tabelas</li>
                      <li>• Sistema de busca e filtros avançados</li>
                    </ul>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Botões */}
        <TabsContent value="botoes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Funcionalidade dos Botões
              </CardTitle>
              <CardDescription>Descrição das ações executadas ao clicar nos botões do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-6">
                  {/* Botões de Navegação */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Botões de Navegação</h3>
                    <div className="space-y-3">
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-medium">Menu Lateral</p>
                        <p className="text-sm text-muted-foreground mt-1">Navega entre as diferentes seções do admin: Dashboard, Clientes, Financeiro, Rede Credenciada, etc.</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-medium">Voltar</p>
                        <p className="text-sm text-muted-foreground mt-1">Retorna para a página anterior usando setLocation do Wouter</p>
                      </div>
                    </div>
                  </div>

                  {/* Botões de CRUD */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Botões de Ação (CRUD)</h3>
                    <div className="space-y-3">
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-medium">Adicionar / Novo</p>
                        <p className="text-sm text-muted-foreground mt-1">Abre formulário para criação de novo registro (cliente, pet, plano, etc.). Usa mutation do React Query para POST na API.</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-medium">Editar</p>
                        <p className="text-sm text-muted-foreground mt-1">Carrega dados do registro e abre formulário em modo de edição. Usa mutation para PUT/PATCH na API.</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-medium">Excluir</p>
                        <p className="text-sm text-muted-foreground mt-1">Abre diálogo de confirmação com senha. Após confirmação, envia DELETE para API e atualiza a lista.</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-medium">Visualizar Detalhes</p>
                        <p className="text-sm text-muted-foreground mt-1">Abre modal/dialog com informações detalhadas do registro sem permitir edição.</p>
                      </div>
                    </div>
                  </div>

                  {/* Botões de Formulário */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Botões de Formulário</h3>
                    <div className="space-y-3">
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-medium">Salvar / Confirmar</p>
                        <p className="text-sm text-muted-foreground mt-1">Valida formulário com Zod, envia dados via React Hook Form, executa mutation e fecha o formulário.</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-medium">Cancelar</p>
                        <p className="text-sm text-muted-foreground mt-1">Fecha o formulário/modal sem salvar, descartando alterações.</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-medium">Próximo / Anterior (Stepper)</p>
                        <p className="text-sm text-muted-foreground mt-1">Navega entre etapas do formulário multi-step, validando cada etapa antes de avançar.</p>
                      </div>
                    </div>
                  </div>

                  {/* Botões de Ação Específica */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Botões de Ação Específica</h3>
                    <div className="space-y-3">
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-medium">Ativar/Desativar</p>
                        <p className="text-sm text-muted-foreground mt-1">Toggle de status usando Switch. Atualiza status via API com atualização otimista no cache.</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-medium">Buscar CEP</p>
                        <p className="text-sm text-muted-foreground mt-1">Consulta API ViaCEP e preenche automaticamente campos de endereço.</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-medium">Aplicar Cupom</p>
                        <p className="text-sm text-muted-foreground mt-1">Valida cupom via API, calcula desconto e atualiza valor total do checkout.</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-medium">Adicionar Pet (Checkout)</p>
                        <p className="text-sm text-muted-foreground mt-1">Adiciona novo card de pet no array do formulário, atualizando cálculo de valores.</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-medium">Gerar Carteirinha</p>
                        <p className="text-sm text-muted-foreground mt-1">Busca cliente por CPF e gera carteirinha digital do pet para download.</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-medium">Copiar para Área de Transferência</p>
                        <p className="text-sm text-muted-foreground mt-1">Usa navigator.clipboard.writeText para copiar texto (PIX, links, etc.).</p>
                      </div>
                    </div>
                  </div>

                  {/* Botões de Autenticação */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Botões de Autenticação</h3>
                    <div className="space-y-3">
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-medium">Login</p>
                        <p className="text-sm text-muted-foreground mt-1">Valida credenciais, cria sessão no servidor, armazena dados no session storage e redireciona.</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-medium">Logout / Sair</p>
                        <p className="text-sm text-muted-foreground mt-1">Destroi sessão no servidor, limpa dados locais e redireciona para login.</p>
                      </div>
                    </div>
                  </div>

                  {/* Botões de Pagamento */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Botões de Pagamento</h3>
                    <div className="space-y-3">
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-medium">Finalizar Compra</p>
                        <p className="text-sm text-muted-foreground mt-1">Processa pagamento via Cielo, cria contrato, gera recibo e redireciona para página de sucesso.</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-medium">Pagar com PIX</p>
                        <p className="text-sm text-muted-foreground mt-1">Gera QR Code PIX via Cielo e inicia polling para verificar status do pagamento.</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-medium">Pagar com Cartão</p>
                        <p className="text-sm text-muted-foreground mt-1">Envia dados do cartão para Cielo, processa pagamento e atualiza status do contrato.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Funções Principais */}
        <TabsContent value="funcoes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Command className="h-5 w-5" />
                Principais Funções Implementadas
              </CardTitle>
              <CardDescription>Descrição das funções mais importantes do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-6">
                  {/* Funções de Autenticação */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Autenticação e Autorização</h3>
                    <div className="space-y-3 text-sm">
                      <div className="bg-slate-50 p-3 rounded font-mono">
                        <p className="font-semibold text-foreground mb-1">requireAdmin()</p>
                        <p className="text-muted-foreground">Middleware que verifica sessão admin antes de permitir acesso a rotas protegidas.</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded font-mono">
                        <p className="font-semibold text-foreground mb-1">requireAuth()</p>
                        <p className="text-muted-foreground">Middleware para proteger rotas de cliente, verificando sessão ativa.</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded font-mono">
                        <p className="font-semibold text-foreground mb-1">requireUnitAuth()</p>
                        <p className="text-muted-foreground">Middleware para autenticação de unidades da rede credenciada.</p>
                      </div>
                    </div>
                  </div>

                  {/* Funções de Pagamento */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Sistema de Pagamentos</h3>
                    <div className="space-y-3 text-sm">
                      <div className="bg-slate-50 p-3 rounded font-mono">
                        <p className="font-semibold text-foreground mb-1">CieloService.createCreditCardPayment()</p>
                        <p className="text-muted-foreground">Processa pagamento com cartão de crédito via API Cielo, incluindo retry logic e validação.</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded font-mono">
                        <p className="font-semibold text-foreground mb-1">CieloService.createPixPayment()</p>
                        <p className="text-muted-foreground">Gera QR Code PIX e processa pagamento instantâneo via Cielo.</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded font-mono">
                        <p className="font-semibold text-foreground mb-1">PaymentReceiptService.generateReceipt()</p>
                        <p className="text-muted-foreground">Gera recibo em PDF usando pdfMake e armazena no Supabase Storage.</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded font-mono">
                        <p className="font-semibold text-foreground mb-1">CieloWebhookService.processNotification()</p>
                        <p className="text-muted-foreground">Processa webhooks da Cielo para atualizar status de pagamentos automaticamente.</p>
                      </div>
                    </div>
                  </div>

                  {/* Funções de Renovação */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Renovação Automática</h3>
                    <div className="space-y-3 text-sm">
                      <div className="bg-slate-50 p-3 rounded font-mono">
                        <p className="font-semibold text-foreground mb-1">AutomaticRenewalService.processAutomaticRenewals()</p>
                        <p className="text-muted-foreground">Processa renovações automáticas de contratos vencidos via cron job.</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded font-mono">
                        <p className="font-semibold text-foreground mb-1">calculateNextRenewalDate()</p>
                        <p className="text-muted-foreground">Calcula próxima data de renovação baseado no período de cobrança (mensal/anual).</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded font-mono">
                        <p className="font-semibold text-foreground mb-1">NotificationService.sendPaymentReminder()</p>
                        <p className="text-muted-foreground">Envia lembretes de pagamento por email antes do vencimento.</p>
                      </div>
                    </div>
                  </div>

                  {/* Funções de Validação */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Validação e Sanitização</h3>
                    <div className="space-y-3 text-sm">
                      <div className="bg-slate-50 p-3 rounded font-mono">
                        <p className="font-semibold text-foreground mb-1">sanitizeText()</p>
                        <p className="text-muted-foreground">Remove tags HTML perigosas e sanitiza texto para prevenir XSS.</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded font-mono">
                        <p className="font-semibold text-foreground mb-1">validateImageContent()</p>
                        <p className="text-muted-foreground">Valida tipo MIME, extensão, magic numbers e conteúdo de imagens uploadadas.</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded font-mono">
                        <p className="font-semibold text-foreground mb-1">zodResolver()</p>
                        <p className="text-muted-foreground">Integra schemas Zod com React Hook Form para validação de formulários.</p>
                      </div>
                    </div>
                  </div>

                  {/* Funções de Storage */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Armazenamento de Arquivos</h3>
                    <div className="space-y-3 text-sm">
                      <div className="bg-slate-50 p-3 rounded font-mono">
                        <p className="font-semibold text-foreground mb-1">SupabaseStorageService.uploadImage()</p>
                        <p className="text-muted-foreground">Upload de imagens para Supabase com processamento via Sharp (resize, otimização).</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded font-mono">
                        <p className="font-semibold text-foreground mb-1">SupabaseStorageService.uploadPDF()</p>
                        <p className="text-muted-foreground">Upload de PDFs (recibos) para bucket privado com controle de acesso.</p>
                      </div>
                    </div>
                  </div>

                  {/* Funções de Cálculo */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Cálculos e Regras de Negócio</h3>
                    <div className="space-y-3 text-sm">
                      <div className="bg-slate-50 p-3 rounded font-mono">
                        <p className="font-semibold text-foreground mb-1">calculateCoparticipation()</p>
                        <p className="text-muted-foreground">Calcula valor de coparticipação baseado em regras do procedimento e plano.</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded font-mono">
                        <p className="font-semibold text-foreground mb-1">checkWaitingPeriod()</p>
                        <p className="text-muted-foreground">Verifica se período de carência do procedimento já foi cumprido.</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded font-mono">
                        <p className="font-semibold text-foreground mb-1">checkAnnualLimit()</p>
                        <p className="text-muted-foreground">Verifica se limite anual de uso do procedimento foi atingido.</p>
                      </div>
                    </div>
                  </div>

                  {/* Funções de API */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Integrações Externas</h3>
                    <div className="space-y-3 text-sm">
                      <div className="bg-slate-50 p-3 rounded font-mono">
                        <p className="font-semibold text-foreground mb-1">CepService.lookup()</p>
                        <p className="text-muted-foreground">Busca endereço completo via API ViaCEP com timeout e tratamento de erros.</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded font-mono">
                        <p className="font-semibold text-foreground mb-1">apiRequest()</p>
                        <p className="text-muted-foreground">Função helper para requisições HTTP com tratamento de erros e retry automático.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* APIs */}
        <TabsContent value="apis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Integrações com APIs Externas
              </CardTitle>
              <CardDescription>Detalhamento de todas as integrações e serviços externos</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-6">
                  {/* Cielo */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <Badge variant="default">Gateway de Pagamento</Badge>
                      <h3 className="font-semibold text-lg">Cielo E-commerce API</h3>
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p><span className="font-medium text-foreground">Propósito:</span> Processamento de pagamentos (cartão de crédito e PIX)</p>
                      <p><span className="font-medium text-foreground">Endpoints utilizados:</span></p>
                      <ul className="ml-6 space-y-1">
                        <li>• POST /sales - Criação de transação com cartão</li>
                        <li>• POST /sales/{id}/capture - Captura de pagamento autorizado</li>
                        <li>• GET /sales/{id} - Consulta status de pagamento</li>
                        <li>• POST /pix/qrcode - Geração de QR Code PIX</li>
                      </ul>
                      <p><span className="font-medium text-foreground">Funcionalidades:</span></p>
                      <ul className="ml-6 space-y-1">
                        <li>• Tokenização de cartões para renovação automática</li>
                        <li>• Parcelamento em até 12x</li>
                        <li>• Webhooks para notificação de mudança de status</li>
                        <li>• Rate limiting (30 req/min) e retry automático</li>
                        <li>• Validação e sanitização de dados sensíveis</li>
                      </ul>
                    </div>
                  </div>

                  {/* ViaCEP */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <Badge variant="secondary">Consulta de CEP</Badge>
                      <h3 className="font-semibold text-lg">ViaCEP API</h3>
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p><span className="font-medium text-foreground">Propósito:</span> Busca automática de endereço por CEP</p>
                      <p><span className="font-medium text-foreground">Endpoint:</span> GET https://viacep.com.br/ws/{cep}/json/</p>
                      <p><span className="font-medium text-foreground">Funcionalidades:</span></p>
                      <ul className="ml-6 space-y-1">
                        <li>• Preenchimento automático de endereço em formulários</li>
                        <li>• Validação de CEP (8 dígitos)</li>
                        <li>• Timeout de 5 segundos para resiliência</li>
                        <li>• Rate limiting para evitar abuso</li>
                      </ul>
                    </div>
                  </div>

                  {/* Supabase */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <Badge variant="secondary">Cloud Storage</Badge>
                      <h3 className="font-semibold text-lg">Supabase Storage</h3>
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p><span className="font-medium text-foreground">Propósito:</span> Armazenamento de imagens e PDFs</p>
                      <p><span className="font-medium text-foreground">Buckets utilizados:</span></p>
                      <ul className="ml-6 space-y-1">
                        <li>• pet-images (público) - Fotos de pets e ícones do chat</li>
                        <li>• receipts-private (privado) - Recibos de pagamento em PDF</li>
                      </ul>
                      <p><span className="font-medium text-foreground">Funcionalidades:</span></p>
                      <ul className="ml-6 space-y-1">
                        <li>• Upload com processamento de imagem via Sharp (resize, otimização)</li>
                        <li>• Validação de tipo MIME e conteúdo</li>
                        <li>• Geração de URLs públicas/assinadas</li>
                        <li>• Controle de acesso por bucket</li>
                      </ul>
                    </div>
                  </div>

                  {/* Nodemailer */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <Badge variant="secondary">Email</Badge>
                      <h3 className="font-semibold text-lg">Nodemailer (SMTP)</h3>
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p><span className="font-medium text-foreground">Propósito:</span> Envio de notificações por email</p>
                      <p><span className="font-medium text-foreground">Configuração:</span> Variáveis SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS</p>
                      <p><span className="font-medium text-foreground">Tipos de email enviados:</span></p>
                      <ul className="ml-6 space-y-1">
                        <li>• Confirmação de pagamento</li>
                        <li>• Lembretes de vencimento (7 e 3 dias antes)</li>
                        <li>• Notificações de pagamento em atraso</li>
                        <li>• Boas-vindas após primeiro contrato</li>
                        <li>• Recibos de pagamento anexados</li>
                      </ul>
                    </div>
                  </div>

                  {/* Chat AI */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <Badge variant="secondary">IA</Badge>
                      <h3 className="font-semibold text-lg">Chat AI (Webhook Configurável)</h3>
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p><span className="font-medium text-foreground">Propósito:</span> Assistente virtual para atendimento ao cliente</p>
                      <p><span className="font-medium text-foreground">Configuração:</span> URL de webhook configurável via admin</p>
                      <p><span className="font-medium text-foreground">Funcionalidades:</span></p>
                      <ul className="ml-6 space-y-1">
                        <li>• Rate limiting (20 mensagens/minuto)</li>
                        <li>• Sanitização de mensagens com sanitize-html</li>
                        <li>• Customização de ícones e cores via admin</li>
                        <li>• Posicionamento configurável (esquerda/direita)</li>
                      </ul>
                    </div>
                  </div>

                  {/* React Query */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <Badge variant="outline">Internal API</Badge>
                      <h3 className="font-semibold text-lg">API Interna (Express)</h3>
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p><span className="font-medium text-foreground">Gerenciamento de Estado:</span> TanStack React Query</p>
                      <p><span className="font-medium text-foreground">Principais endpoints:</span></p>
                      <ul className="ml-6 space-y-1">
                        <li>• /admin/api/* - Rotas administrativas (protegidas)</li>
                        <li>• /api/clients/* - Área do cliente</li>
                        <li>• /api/unit/* - Portal de unidades</li>
                        <li>• /api/sellers/* - Sistema de vendedores</li>
                        <li>• /api/webhooks/* - Webhooks externos</li>
                      </ul>
                      <p><span className="font-medium text-foreground">Otimizações:</span></p>
                      <ul className="ml-6 space-y-1">
                        <li>• Cache inteligente com invalidação seletiva</li>
                        <li>• Optimistic updates para melhor UX</li>
                        <li>• Retry automático em caso de falha</li>
                        <li>• Stale time configurado por tipo de dado</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Database */}
        <TabsContent value="database" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Estrutura do Banco de Dados
              </CardTitle>
              <CardDescription>Organização das tabelas e relacionamentos no PostgreSQL</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-6">
                  {/* Info geral */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Tecnologias</h3>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• <span className="font-medium text-foreground">SGBD:</span> PostgreSQL (via Neon)</li>
                      <li>• <span className="font-medium text-foreground">ORM:</span> Drizzle ORM</li>
                      <li>• <span className="font-medium text-foreground">Migrações:</span> npm run db:push (sem SQL manual)</li>
                      <li>• <span className="font-medium text-foreground">Pool de Conexões:</span> Max 20, Min 5 conexões</li>
                    </ul>
                  </div>

                  {/* Tabelas Principais */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Tabelas Core</h3>
                    <div className="space-y-3">
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-semibold mb-1">users</p>
                        <p className="text-sm text-muted-foreground mb-2">Usuários administrativos do sistema</p>
                        <p className="text-xs font-mono">id, username, password (bcrypt), email, role, permissions[], isActive, createdAt</p>
                      </div>

                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-semibold mb-1">clients</p>
                        <p className="text-sm text-muted-foreground mb-2">Clientes (tutores) que contratam planos</p>
                        <p className="text-xs font-mono">id, fullName, email, phone, cpf, address, login, cpfHash, imageUrl, createdAt</p>
                      </div>

                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-semibold mb-1">pets</p>
                        <p className="text-sm text-muted-foreground mb-2">Animais de estimação vinculados aos clientes</p>
                        <p className="text-xs font-mono">id, clientId (FK), name, species, breed, birthDate, sex, weight, microchip, medicalHistory, vaccines, planId (FK), imageUrl</p>
                      </div>

                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-semibold mb-1">plans</p>
                        <p className="text-sm text-muted-foreground mb-2">Planos de saúde disponíveis</p>
                        <p className="text-xs font-mono">id, name, description, features[], pricing, type, billingFrequency, isActive, imageUrl</p>
                      </div>

                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-semibold mb-1">contracts</p>
                        <p className="text-sm text-muted-foreground mb-2">Contratos ativos entre clientes e planos</p>
                        <p className="text-xs font-mono">id, clientId (FK), planId (FK), petId (FK), contractNumber, status, startDate, endDate, billingPeriod, paymentMethod, cieloPaymentId</p>
                      </div>
                    </div>
                  </div>

                  {/* Procedimentos */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Sistema de Procedimentos</h3>
                    <div className="space-y-3">
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-semibold mb-1">procedureCategories</p>
                        <p className="text-sm text-muted-foreground mb-2">Categorias de procedimentos (Consultas, Exames, Cirurgias, etc.)</p>
                        <p className="text-xs font-mono">id, name, displayOrder, isActive</p>
                      </div>

                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-semibold mb-1">procedures</p>
                        <p className="text-sm text-muted-foreground mb-2">Procedimentos médicos disponíveis</p>
                        <p className="text-xs font-mono">id, name, description, categoryId (FK), displayOrder, isActive</p>
                      </div>

                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-semibold mb-1">planProcedures</p>
                        <p className="text-sm text-muted-foreground mb-2">Relação planos x procedimentos com regras</p>
                        <p className="text-xs font-mono">id, planId (FK), procedureId (FK), isIncluded, price, coparticipacao (%), carencia (dias), limitesAnuais, payValue</p>
                      </div>

                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-semibold mb-1">procedureUsage</p>
                        <p className="text-sm text-muted-foreground mb-2">Controle de uso anual de procedimentos por pet</p>
                        <p className="text-xs font-mono">id, petId (FK), procedureId (FK), planId (FK), year, usageCount</p>
                      </div>
                    </div>
                  </div>

                  {/* Rede Credenciada */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Rede Credenciada</h3>
                    <div className="space-y-3">
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-semibold mb-1">networkUnits</p>
                        <p className="text-sm text-muted-foreground mb-2">Clínicas e hospitais veterinários credenciados</p>
                        <p className="text-xs font-mono">id, name, address, phone, services[], login, senhaHash, urlSlug, isActive, imageUrl</p>
                      </div>

                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-semibold mb-1">veterinarians</p>
                        <p className="text-sm text-muted-foreground mb-2">Veterinários vinculados às unidades</p>
                        <p className="text-xs font-mono">id, networkUnitId (FK), name, crmv, specialty, type (permanente/volante), login, passwordHash, permissions[], isActive</p>
                      </div>

                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-semibold mb-1">atendimentos</p>
                        <p className="text-sm text-muted-foreground mb-2">Registros de atendimentos realizados</p>
                        <p className="text-xs font-mono">id, clientId (FK), petId (FK), networkUnitId (FK), veterinarianId (FK), status, value, notes, createdAt</p>
                      </div>

                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-semibold mb-1">atendimentoProcedures</p>
                        <p className="text-sm text-muted-foreground mb-2">Procedimentos realizados em cada atendimento</p>
                        <p className="text-xs font-mono">id, atendimentoId (FK), procedureId (FK), procedureName, value, coparticipacao, notes</p>
                      </div>
                    </div>
                  </div>

                  {/* Financeiro */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Sistema Financeiro</h3>
                    <div className="space-y-3">
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-semibold mb-1">contractInstallments</p>
                        <p className="text-sm text-muted-foreground mb-2">Parcelas de pagamento dos contratos</p>
                        <p className="text-xs font-mono">id, contractId (FK), installmentNumber, dueDate, amount, status, cieloPaymentId, paidAt</p>
                      </div>

                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-semibold mb-1">paymentReceipts</p>
                        <p className="text-sm text-muted-foreground mb-2">Recibos de pagamento gerados</p>
                        <p className="text-xs font-mono">id, contractId (FK), cieloPaymentId, receiptNumber, amount, paymentDate, method, pdfUrl, status</p>
                      </div>

                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-semibold mb-1">coupons</p>
                        <p className="text-sm text-muted-foreground mb-2">Cupons de desconto</p>
                        <p className="text-xs font-mono">id, code, type (percentage/fixed_value), value, usageLimit, usageCount, validFrom, validUntil, isActive</p>
                      </div>
                    </div>
                  </div>

                  {/* Vendedores */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Sistema de Vendedores</h3>
                    <div className="space-y-3">
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-semibold mb-1">sellers</p>
                        <p className="text-sm text-muted-foreground mb-2">Vendedores/parceiros cadastrados</p>
                        <p className="text-xs font-mono">id, name, cpf, email, phone, commission (%), whitelabelUrl, pixKey, isActive</p>
                      </div>

                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-semibold mb-1">sellerAnalytics</p>
                        <p className="text-sm text-muted-foreground mb-2">Métricas de performance dos vendedores</p>
                        <p className="text-xs font-mono">id, sellerId (FK), date, clicks, conversions, revenue</p>
                      </div>

                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-semibold mb-1">sellerPayments</p>
                        <p className="text-sm text-muted-foreground mb-2">Pagamentos realizados a vendedores</p>
                        <p className="text-xs font-mono">id, sellerId (FK), amount, paymentDate, description, createdBy (FK)</p>
                      </div>
                    </div>
                  </div>

                  {/* Comunicação */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Comunicação e Suporte</h3>
                    <div className="space-y-3">
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-semibold mb-1">protocols</p>
                        <p className="text-sm text-muted-foreground mb-2">Protocolos de atendimento ao cliente</p>
                        <p className="text-xs font-mono">id, clientId (FK), contractId (FK), protocolNumber, type, status, subject, description, resolution</p>
                      </div>

                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-semibold mb-1">satisfactionSurveys</p>
                        <p className="text-sm text-muted-foreground mb-2">Pesquisas de satisfação</p>
                        <p className="text-xs font-mono">id, clientId (FK), contractId (FK), rating, feedback, wouldRecommend, respondedAt</p>
                      </div>

                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-semibold mb-1">contactSubmissions</p>
                        <p className="text-sm text-muted-foreground mb-2">Formulários de contato do site</p>
                        <p className="text-xs font-mono">id, name, email, phone, city, petType, message, createdAt</p>
                      </div>

                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-semibold mb-1">chatSettings</p>
                        <p className="text-sm text-muted-foreground mb-2">Configurações do chat AI</p>
                        <p className="text-xs font-mono">id, welcomeMessage, webhookUrl, botIconUrl, userIconUrl, position, isActive</p>
                      </div>
                    </div>
                  </div>

                  {/* Configurações */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Configurações</h3>
                    <div className="space-y-3">
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-semibold mb-1">siteSettings</p>
                        <p className="text-sm text-muted-foreground mb-2">Configurações globais do site</p>
                        <p className="text-xs font-mono">id, contactEmail, phone, whatsapp, socialLinks, cnpj, businessHours, story, privacyPolicy, termsOfUse, images (bytea)</p>
                      </div>

                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-semibold mb-1">faqItems</p>
                        <p className="text-sm text-muted-foreground mb-2">Perguntas frequentes</p>
                        <p className="text-xs font-mono">id, question, answer, displayOrder, isActive</p>
                      </div>

                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-semibold mb-1">adminActionLogs</p>
                        <p className="text-sm text-muted-foreground mb-2">Logs de auditoria de ações administrativas</p>
                        <p className="text-xs font-mono">id, adminUserId (FK), adminIdentifier, actionType, entityType, entityId, metadata, ip, userAgent, createdAt</p>
                      </div>

                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-semibold mb-1">express_sessions</p>
                        <p className="text-sm text-muted-foreground mb-2">Sessões de autenticação (gerada automaticamente)</p>
                        <p className="text-xs font-mono">sid (PK), sess (jsonb), expire</p>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Segurança */}
        <TabsContent value="seguranca" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Medidas de Segurança
              </CardTitle>
              <CardDescription>Práticas de segurança implementadas no sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-6">
                  {/* Autenticação */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Autenticação e Autorização
                    </h3>
                    <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                      <li>• <span className="font-medium text-foreground">Sessões Seguras:</span> express-session com PostgreSQL store, SameSite=Lax, HttpOnly cookies</li>
                      <li>• <span className="font-medium text-foreground">Prevenção de Session Fixation:</span> Regeneração de sessão após login</li>
                      <li>• <span className="font-medium text-foreground">Hashing de Senhas:</span> bcryptjs com salt automático para senhas de admin e CPF de clientes</li>
                      <li>• <span className="font-medium text-foreground">JWT para Unidades:</span> Tokens com expiração de 8 horas</li>
                      <li>• <span className="font-medium text-foreground">Middleware de Proteção:</span> requireAdmin, requireAuth, requireUnitAuth em todas as rotas sensíveis</li>
                      <li>• <span className="font-medium text-foreground">RBAC:</span> Sistema de roles e permissões granulares para usuários admin</li>
                      <li>• <span className="font-medium text-foreground">Verificação Server-Side:</span> AuthGuard com retry e verificação contínua</li>
                    </ul>
                  </div>

                  {/* Proteção de Dados */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Proteção de Dados
                    </h3>
                    <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                      <li>• <span className="font-medium text-foreground">Sanitização de Inputs:</span> sanitize-html para prevenir XSS em mensagens de chat e textos</li>
                      <li>• <span className="font-medium text-foreground">Validação com Zod:</span> Schemas rigorosos em todas as entradas de dados</li>
                      <li>• <span className="font-medium text-foreground">SQL Injection:</span> Prevenção via Drizzle ORM com queries parametrizadas</li>
                      <li>• <span className="font-medium text-foreground">Mass Assignment:</span> Proteção via schemas explícitos e validação de campos</li>
                      <li>• <span className="font-medium text-foreground">Dados Sensíveis em Logs:</span> log-sanitizer mascara CPF, cartões, senhas e emails</li>
                      <li>• <span className="font-medium text-foreground">Schema Seguro:</span> secure-schema.ts evita armazenamento direto de dados pessoais</li>
                      <li>• <span className="font-medium text-foreground">Exclusão de Campos:</span> Passwords e hashes nunca retornam em respostas de API</li>
                    </ul>
                  </div>

                  {/* Ataques Web */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Prevenção de Ataques Web
                    </h3>
                    <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                      <li>• <span className="font-medium text-foreground">CSRF Protection:</span> csurf middleware com tokens em todas as requisições POST/PUT/DELETE</li>
                      <li>• <span className="font-medium text-foreground">XSS Prevention:</span> Sanitização HTML, CSP headers via Helmet</li>
                      <li>• <span className="font-medium text-foreground">CORS Restritivo:</span> Validação por parsing de URL, whitelist de domínios confiáveis</li>
                      <li>• <span className="font-medium text-foreground">Rate Limiting:</span> Limites por endpoint (login: 5/15min, chat: 20/min, uploads, CEP, etc.)</li>
                      <li>• <span className="font-medium text-foreground">IDOR Prevention:</span> Verificação de ownership e associação em todas as operações</li>
                      <li>• <span className="font-medium text-foreground">Helmet Security Headers:</span> HSTS, noSniff, XSS Filter, Referrer Policy</li>
                    </ul>
                  </div>

                  {/* Upload e Arquivos */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Segurança de Uploads
                    </h3>
                    <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                      <li>• <span className="font-medium text-foreground">Validação Multi-Camadas:</span> MIME type, extensão, magic numbers via file-type</li>
                      <li>• <span className="font-medium text-foreground">Processamento com Sharp:</span> Re-encoding de imagens para remover metadados maliciosos</li>
                      <li>• <span className="font-medium text-foreground">Limites de Tamanho:</span> Multer configurado com limits (10MB max)</li>
                      <li>• <span className="font-medium text-foreground">Validação de Conteúdo:</span> Verificação de padrões suspeitos em arquivos</li>
                      <li>• <span className="font-medium text-foreground">Isolamento de Buckets:</span> Separação de arquivos públicos e privados no Supabase</li>
                    </ul>
                  </div>

                  {/* APIs Externas */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Segurança em Integrações
                    </h3>
                    <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                      <li>• <span className="font-medium text-foreground">HTTPS Enforcement:</span> Todas as chamadas externas via HTTPS</li>
                      <li>• <span className="font-medium text-foreground">Timeout Configurado:</span> 5-10s para evitar hang indefinido</li>
                      <li>• <span className="font-medium text-foreground">Retry com Exponential Backoff:</span> CieloService com até 3 tentativas</li>
                      <li>• <span className="font-medium text-foreground">Rate Limiting Interno:</span> Controle de requisições para APIs externas (30 req/min)</li>
                      <li>• <span className="font-medium text-foreground">Validação de Webhooks:</span> Verificação de estrutura e origem em webhooks Cielo</li>
                      <li>• <span className="font-medium text-foreground">Audit Logs:</span> Log de todas as requisições webhook com IP e timestamp</li>
                    </ul>
                  </div>

                  {/* Infraestrutura */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Infraestrutura e Deploy
                    </h3>
                    <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                      <li>• <span className="font-medium text-foreground">Variáveis de Ambiente:</span> Secrets nunca commitados, uso de .env e Replit Secrets</li>
                      <li>• <span className="font-medium text-foreground">Trust Proxy:</span> Configurado para ambientes de produção (Replit, EasyPanel)</li>
                      <li>• <span className="font-medium text-foreground">Database Pool:</span> Configuração otimizada com limites e timeouts</li>
                      <li>• <span className="font-medium text-foreground">Graceful Shutdown:</span> Fechamento correto de conexões ao encerrar servidor</li>
                      <li>• <span className="font-medium text-foreground">Health Checks:</span> Monitoramento contínuo do estado do banco de dados</li>
                    </ul>
                  </div>

                  {/* Práticas de Código */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Práticas de Código Seguro
                    </h3>
                    <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                      <li>• <span className="font-medium text-foreground">TypeScript Strict:</span> Type safety em todo o código</li>
                      <li>• <span className="font-medium text-foreground">Princípio do Menor Privilégio:</span> Permissões mínimas necessárias por role</li>
                      <li>• <span className="font-medium text-foreground">Separação de Contextos:</span> Schemas e rotas separadas para admin, cliente, unidade</li>
                      <li>• <span className="font-medium text-foreground">Error Handling:</span> Mensagens genéricas ao cliente, detalhes em logs server-side</li>
                      <li>• <span className="font-medium text-foreground">Auditoria:</span> Registro de todas as ações administrativas em adminActionLogs</li>
                      <li>• <span className="font-medium text-foreground">Cache Seguro:</span> In-memory cache apenas para hints de UX, nunca para controle de acesso</li>
                    </ul>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
