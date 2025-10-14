import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select";
import { Separator } from "@/components/admin/ui/separator";
import { ScrollArea } from "@/components/admin/ui/scroll-area";
import { Badge } from "@/components/admin/ui/badge";
import { 
  FileText, 
  Database, 
  Shield, 
  Globe, 
  Settings,
  CheckCircle,
  Clipboard
} from "lucide-react";

export default function Documentation() {
  const [selectedSection, setSelectedSection] = useState("resumo");

  const sections = [
    { value: "resumo", label: "Resumo" },
    { value: "funcionalidades", label: "Funcionalidades" },
    { value: "botoes", label: "Botões" },
    { value: "funcoes", label: "Funções" },
    { value: "apis", label: "APIs" },
    { value: "database", label: "Database" },
    { value: "seguranca", label: "Segurança" }
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground break-words">Documentação Técnica</h1>
          <p className="text-sm text-muted-foreground">Documentação completa do sistema UNIPET PLAN - Plataforma de Gerenciamento de Planos de Saúde Pet</p>
        </div>
      </div>

      {/* Section Selector */}
      <div className="flex items-center gap-4">
        <Select value={selectedSection} onValueChange={setSelectedSection}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Selecione uma seção" />
          </SelectTrigger>
          <SelectContent>
            {sections.flatMap((section, index, array) => [
              <SelectItem 
                key={section.value} 
                value={section.value} 
                className="py-3 pl-10 pr-4 data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground"
              >
                {section.label}
              </SelectItem>,
              ...(index < array.length - 1 ? [<Separator key={`separator-${section.value}`} />] : [])
            ])}
          </SelectContent>
        </Select>
      </div>

      {/* Content based on selection */}
      <div className="mt-6">
        {/* Resumo Técnico */}
        {selectedSection === "resumo" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
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
                    <Clipboard className="h-4 w-4" />
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
                    <Settings className="h-4 w-4" />
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
        )}

        {/* Funcionalidades */}
        {selectedSection === "funcionalidades" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
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
        )}

        {/* Botões */}
        {selectedSection === "botoes" && (
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
                        <p className="text-sm text-muted-foreground mt-1">Processa pagamento com cartão de crédito/débito via API da Cielo.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Funções */}
        {selectedSection === "funcoes" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clipboard className="h-5 w-5" />
                Principais Funções Implementadas
              </CardTitle>
              <CardDescription>Detalhamento das principais funções e hooks do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-6">
                  {/* Hooks Customizados */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Hooks Customizados</h3>
                    <div className="space-y-3">
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-medium">useAuth()</p>
                        <p className="text-sm text-muted-foreground mt-1">Gerencia estado de autenticação, login/logout e redirecionamentos.</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-medium">useSiteSettings()</p>
                        <p className="text-sm text-muted-foreground mt-1">Carrega e gerencia configurações globais do site (contato, redes sociais, etc.).</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-medium">useToast()</p>
                        <p className="text-sm text-muted-foreground mt-1">Exibe notificações toast para feedback ao usuário.</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-medium">useColumnPreferences()</p>
                        <p className="text-sm text-muted-foreground mt-1">Gerencia visibilidade de colunas em tabelas, salvando preferências no localStorage.</p>
                      </div>
                    </div>
                  </div>

                  {/* Funções de Validação */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Funções de Validação</h3>
                    <div className="space-y-3">
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-medium">validateCPF(cpf: string)</p>
                        <p className="text-sm text-muted-foreground mt-1">Valida CPF brasileiro usando algoritmo de dígito verificador.</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-medium">validateEmail(email: string)</p>
                        <p className="text-sm text-muted-foreground mt-1">Valida formato de email com regex.</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-medium">validatePhone(phone: string)</p>
                        <p className="text-sm text-muted-foreground mt-1">Valida telefone brasileiro (celular e fixo).</p>
                      </div>
                    </div>
                  </div>

                  {/* Funções de Formatação */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Funções de Formatação</h3>
                    <div className="space-y-3">
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-medium">formatCurrency(value: number)</p>
                        <p className="text-sm text-muted-foreground mt-1">Formata valores monetários para R$ 0.000,00</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-medium">formatCPF(cpf: string)</p>
                        <p className="text-sm text-muted-foreground mt-1">Formata CPF para 000.000.000-00</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-medium">formatPhone(phone: string)</p>
                        <p className="text-sm text-muted-foreground mt-1">Formata telefone para (00) 00000-0000</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-medium">formatDate(date: Date)</p>
                        <p className="text-sm text-muted-foreground mt-1">Formata datas usando date-fns com locale pt-BR</p>
                      </div>
                    </div>
                  </div>

                  {/* Funções de API */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Funções de API</h3>
                    <div className="space-y-3">
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-medium">apiRequest(url, options)</p>
                        <p className="text-sm text-muted-foreground mt-1">Cliente HTTP base com tratamento de erros e refresh de token.</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-medium">queryClient.prefetch()</p>
                        <p className="text-sm text-muted-foreground mt-1">Pre-carrega dados para melhorar performance de navegação.</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-medium">queryClient.invalidate()</p>
                        <p className="text-sm text-muted-foreground mt-1">Invalida cache e força refresh de dados.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* APIs */}
        {selectedSection === "apis" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Endpoints da API
              </CardTitle>
              <CardDescription>Documentação completa dos endpoints REST disponíveis</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-6">
                  {/* Autenticação */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Autenticação</h3>
                    <div className="space-y-3">
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">POST</Badge>
                          <code className="text-sm">/admin/api/login</code>
                        </div>
                        <p className="text-sm text-muted-foreground">Login de administradores. Retorna sessão HTTP-only.</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">POST</Badge>
                          <code className="text-sm">/admin/api/logout</code>
                        </div>
                        <p className="text-sm text-muted-foreground">Logout e destruição de sessão.</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">GET</Badge>
                          <code className="text-sm">/admin/api/auth/check</code>
                        </div>
                        <p className="text-sm text-muted-foreground">Verifica autenticação atual.</p>
                      </div>
                    </div>
                  </div>

                  {/* Clientes */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Clientes</h3>
                    <div className="space-y-3">
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">GET</Badge>
                          <code className="text-sm">/admin/api/clients</code>
                        </div>
                        <p className="text-sm text-muted-foreground">Lista todos os clientes.</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">GET</Badge>
                          <code className="text-sm">/admin/api/clients/:id</code>
                        </div>
                        <p className="text-sm text-muted-foreground">Busca cliente por ID.</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">POST</Badge>
                          <code className="text-sm">/admin/api/clients</code>
                        </div>
                        <p className="text-sm text-muted-foreground">Cria novo cliente.</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">PATCH</Badge>
                          <code className="text-sm">/admin/api/clients/:id</code>
                        </div>
                        <p className="text-sm text-muted-foreground">Atualiza cliente existente.</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">DELETE</Badge>
                          <code className="text-sm">/admin/api/clients/:id</code>
                        </div>
                        <p className="text-sm text-muted-foreground">Remove cliente.</p>
                      </div>
                    </div>
                  </div>

                  {/* Pets */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Pets</h3>
                    <div className="space-y-3">
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">GET</Badge>
                          <code className="text-sm">/admin/api/clients/:id/pets</code>
                        </div>
                        <p className="text-sm text-muted-foreground">Lista pets de um cliente.</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">POST</Badge>
                          <code className="text-sm">/admin/api/pets</code>
                        </div>
                        <p className="text-sm text-muted-foreground">Cria novo pet.</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">PATCH</Badge>
                          <code className="text-sm">/admin/api/pets/:id</code>
                        </div>
                        <p className="text-sm text-muted-foreground">Atualiza pet existente.</p>
                      </div>
                    </div>
                  </div>

                  {/* Planos */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Planos</h3>
                    <div className="space-y-3">
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">GET</Badge>
                          <code className="text-sm">/admin/api/plans</code>
                        </div>
                        <p className="text-sm text-muted-foreground">Lista todos os planos.</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">POST</Badge>
                          <code className="text-sm">/admin/api/plans</code>
                        </div>
                        <p className="text-sm text-muted-foreground">Cria novo plano.</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">PATCH</Badge>
                          <code className="text-sm">/admin/api/plans/:id</code>
                        </div>
                        <p className="text-sm text-muted-foreground">Atualiza plano existente.</p>
                      </div>
                    </div>
                  </div>

                  {/* Pagamentos */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Pagamentos</h3>
                    <div className="space-y-3">
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">POST</Badge>
                          <code className="text-sm">/api/payment/cielo</code>
                        </div>
                        <p className="text-sm text-muted-foreground">Processa pagamento via Cielo.</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">POST</Badge>
                          <code className="text-sm">/api/payment/cielo/pix</code>
                        </div>
                        <p className="text-sm text-muted-foreground">Gera QR Code PIX.</p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">POST</Badge>
                          <code className="text-sm">/api/webhook/cielo</code>
                        </div>
                        <p className="text-sm text-muted-foreground">Webhook de notificações Cielo.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Database */}
        {selectedSection === "database" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Estrutura do Banco de Dados
              </CardTitle>
              <CardDescription>Schema e relacionamentos das tabelas PostgreSQL</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-6">
                  {/* Tabela Clients */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">clients</h3>
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">Armazena dados dos clientes</p>
                      <ul className="text-sm space-y-1 ml-4">
                        <li>• id (UUID, PK)</li>
                        <li>• full_name (VARCHAR)</li>
                        <li>• cpf (VARCHAR, UNIQUE)</li>
                        <li>• email (VARCHAR)</li>
                        <li>• phone (VARCHAR)</li>
                        <li>• address, city, state, cep (VARCHAR)</li>
                        <li>• created_at, updated_at (TIMESTAMP)</li>
                      </ul>
                    </div>
                  </div>

                  {/* Tabela Pets */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">pets</h3>
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">Armazena dados dos pets</p>
                      <ul className="text-sm space-y-1 ml-4">
                        <li>• id (UUID, PK)</li>
                        <li>• client_id (UUID, FK → clients)</li>
                        <li>• name, species, breed (VARCHAR)</li>
                        <li>• age, sex, color, weight (VARCHAR/DECIMAL)</li>
                        <li>• castrated (BOOLEAN)</li>
                        <li>• vaccine_data (JSONB)</li>
                        <li>• medical info (TEXT)</li>
                        <li>• created_at, updated_at (TIMESTAMP)</li>
                      </ul>
                    </div>
                  </div>

                  {/* Tabela Plans */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">plans</h3>
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">Planos de saúde disponíveis</p>
                      <ul className="text-sm space-y-1 ml-4">
                        <li>• id (UUID, PK)</li>
                        <li>• name (VARCHAR)</li>
                        <li>• description (TEXT)</li>
                        <li>• pricing (JSONB)</li>
                        <li>• is_active (BOOLEAN)</li>
                        <li>• created_at, updated_at (TIMESTAMP)</li>
                      </ul>
                    </div>
                  </div>

                  {/* Tabela Contracts */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">contracts</h3>
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">Contratos de clientes</p>
                      <ul className="text-sm space-y-1 ml-4">
                        <li>• id (UUID, PK)</li>
                        <li>• client_id (UUID, FK → clients)</li>
                        <li>• plan_id (UUID, FK → plans)</li>
                        <li>• status (VARCHAR)</li>
                        <li>• start_date, end_date (DATE)</li>
                        <li>• payment info (JSONB)</li>
                        <li>• created_at, updated_at (TIMESTAMP)</li>
                      </ul>
                    </div>
                  </div>

                  {/* Tabela Network Units */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">network_units</h3>
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">Unidades credenciadas da rede</p>
                      <ul className="text-sm space-y-1 ml-4">
                        <li>• id (UUID, PK)</li>
                        <li>• name (VARCHAR)</li>
                        <li>• slug (VARCHAR, UNIQUE)</li>
                        <li>• address, city, state (VARCHAR)</li>
                        <li>• phone, email (VARCHAR)</li>
                        <li>• is_active (BOOLEAN)</li>
                        <li>• created_at, updated_at (TIMESTAMP)</li>
                      </ul>
                    </div>
                  </div>

                  {/* Tabela Atendimentos */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3">atendimentos</h3>
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">Registro de atendimentos</p>
                      <ul className="text-sm space-y-1 ml-4">
                        <li>• id (UUID, PK)</li>
                        <li>• pet_id (UUID, FK → pets)</li>
                        <li>• network_unit_id (UUID, FK → network_units)</li>
                        <li>• procedure_data (JSONB)</li>
                        <li>• total_value (DECIMAL)</li>
                        <li>• status (VARCHAR)</li>
                        <li>• created_at, updated_at (TIMESTAMP)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Segurança */}
        {selectedSection === "seguranca" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Segurança e Proteções
              </CardTitle>
              <CardDescription>Medidas de segurança implementadas no sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-6">
                  {/* Autenticação */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Autenticação e Sessão</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground ml-4">
                      <li>• Sessões HTTP-only com express-session</li>
                      <li>• Passwords hash com bcrypt (salt rounds: 10)</li>
                      <li>• JWT tokens para clientes (refresh + access)</li>
                      <li>• Timeout de sessão configurável</li>
                      <li>• CSRF protection com tokens</li>
                    </ul>
                  </div>

                  {/* Proteções HTTP */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Proteções HTTP</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground ml-4">
                      <li>• Helmet.js para headers de segurança</li>
                      <li>• CORS configurado com whitelist</li>
                      <li>• Rate limiting (100 req/15min por IP)</li>
                      <li>• Content Security Policy (CSP)</li>
                      <li>• XSS Protection habilitado</li>
                    </ul>
                  </div>

                  {/* Validação de Dados */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Validação de Dados</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground ml-4">
                      <li>• Validação com Zod em frontend e backend</li>
                      <li>• Sanitização de inputs com DOMPurify</li>
                      <li>• Prevenção de SQL Injection com Drizzle ORM</li>
                      <li>• Proteção contra mass assignment</li>
                      <li>• Validação de tipos TypeScript</li>
                    </ul>
                  </div>

                  {/* Upload de Arquivos */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Upload de Arquivos</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground ml-4">
                      <li>• Validação de tipo MIME com file-type</li>
                      <li>• Limite de tamanho: 5MB por arquivo</li>
                      <li>• Processamento com Sharp (resize, optimize)</li>
                      <li>• Armazenamento seguro no Supabase Storage</li>
                      <li>• URLs assinadas com expiração</li>
                    </ul>
                  </div>

                  {/* Logs e Auditoria */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Logs e Auditoria</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground ml-4">
                      <li>• Registro de todas ações administrativas</li>
                      <li>• Tracking de IP e User-Agent</li>
                      <li>• Metadata detalhado de operações</li>
                      <li>• Logs separados por fonte (admin/units)</li>
                      <li>• Retenção configurável de logs</li>
                    </ul>
                  </div>

                  {/* Permissões */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Controle de Permissões</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground ml-4">
                      <li>• Sistema de roles (admin, editor, view)</li>
                      <li>• Permissões granulares por recurso</li>
                      <li>• Middleware de verificação em rotas</li>
                      <li>• IDOR prevention com ownership check</li>
                      <li>• Isolamento de dados por unidade de rede</li>
                    </ul>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}