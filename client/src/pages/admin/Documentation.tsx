import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select";
import { Separator } from "@/components/admin/ui/separator";
import { ScrollArea } from "@/components/admin/ui/scroll-area";
import { Badge } from "@/components/admin/ui/badge";

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
          <p className="text-sm text-muted-foreground">Sistema completo de gerenciamento de planos de saúde para pets, incluindo administração de clientes, animais, rede credenciada, procedimentos médicos e processamento de pagamentos.</p>
        </div>
      </div>

      {/* Section Selector */}
      <div className="flex items-center gap-4">
        <Select value={selectedSection} onValueChange={setSelectedSection}>
          <SelectTrigger 
            className="w-48 [&>span]:text-left [&>span]:flex [&>span]:flex-col [&>span]:items-start"
            style={{
              borderColor: 'var(--border-gray)',
              background: 'white'
            }}
          >
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
              <CardTitle>Resumo Técnico do Projeto</CardTitle>
              <CardDescription>Visão geral completa da arquitetura, tecnologias e padrões utilizados no sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-3">UNIPET PLAN - Plataforma de Planos de Saúde Pet</h3>
                <p className="text-muted-foreground mb-4">
                  Sistema web completo desenvolvido com arquitetura cliente-servidor para gestão de planos de saúde 
                  para animais de estimação. Oferece administração de clientes, cadastro de pets, gerenciamento de 
                  rede credenciada, controle de procedimentos médicos, processamento de pagamentos e emissão de documentos.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-4">
                  <h4 className="font-semibold mb-2">Frontend (Client)</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• React 18 + TypeScript - Interface reativa e tipada</li>
                    <li>• Vite - Build tool otimizado para desenvolvimento</li>
                    <li>• Wouter - Roteamento leve e performático</li>
                    <li>• Tailwind CSS + shadcn/ui - Design system consistente</li>
                    <li>• TanStack React Query - Gerenciamento de estado e cache</li>
                    <li>• React Hook Form + Zod - Validação de formulários</li>
                    <li>• Framer Motion - Animações e transições</li>
                    <li>• Supabase Storage - Armazenamento de imagens</li>
                  </ul>
                </div>

                <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-4">
                  <h4 className="font-semibold mb-2">Backend (Server)</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Node.js + Express.js - API RESTful robusta</li>
                    <li>• TypeScript - Código tipado e seguro</li>
                    <li>• PostgreSQL (Neon) - Banco de dados relacional</li>
                    <li>• Drizzle ORM - Mapeamento objeto-relacional</li>
                    <li>• Express Sessions - Gerenciamento de sessões</li>
                    <li>• JWT + bcrypt - Autenticação e criptografia</li>
                    <li>• Helmet + CORS - Segurança e proteção</li>
                    <li>• Nodemailer - Envio de notificações por email</li>
                  </ul>
                </div>
              </div>

              <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-4">
                <h4 className="font-semibold mb-3">Arquitetura e Estrutura do Projeto</h4>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-medium mb-2">Client (Frontend)</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• /pages - Páginas e rotas da aplicação</li>
                      <li>• /components - Componentes reutilizáveis</li>
                      <li>• /lib - Utilitários e configurações</li>
                      <li>• /hooks - Hooks personalizados</li>
                      <li>• /types - Definições de tipos TypeScript</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium mb-2">Server (Backend)</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• /routes - Definição de endpoints da API</li>
                      <li>• /services - Lógica de negócio e serviços</li>
                      <li>• /middleware - Middlewares de segurança</li>
                      <li>• /utils - Funções auxiliares</li>
                      <li>• /lib - Bibliotecas e configurações</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium mb-2">Shared (Compartilhado)</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• /schema.ts - Schemas do banco de dados</li>
                      <li>• Tipos TypeScript compartilhados</li>
                      <li>• Validações Zod para formulários</li>
                      <li>• Constantes e configurações globais</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-4">
                <h4 className="font-semibold mb-3">Integrações e Serviços Externos</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• <span className="font-medium text-foreground">Cielo E-commerce:</span> Processamento de pagamentos via cartão e PIX</li>
                  <li>• <span className="font-medium text-foreground">ViaCEP:</span> Consulta automática de endereços por CEP</li>
                  <li>• <span className="font-medium text-foreground">Supabase Storage:</span> Armazenamento em nuvem de imagens e documentos</li>
                  <li>• <span className="font-medium text-foreground">pdfMake:</span> Geração de recibos e documentos em PDF</li>
                  <li>• <span className="font-medium text-foreground">Nodemailer:</span> Envio de emails transacionais e notificações</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Funcionalidades */}
        {selectedSection === "funcionalidades" && (
          <Card>
            <CardHeader>
              <CardTitle>Funcionalidades Implementadas</CardTitle>
              <CardDescription>Detalhamento completo de todos os módulos e recursos disponíveis no sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-6">
                  {/* Gestão de Clientes */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">1. Gestão de Clientes e Pets</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                      <li>• Cadastro completo de clientes com validação de CPF, email e dados pessoais</li>
                      <li>• Integração com ViaCEP para preenchimento automático de endereço por CEP</li>
                      <li>• Cadastro detalhado de pets incluindo espécie, raça, idade, peso e porte</li>
                      <li>• Registro de informações médicas, histórico de vacinas e condições de saúde</li>
                      <li>• Upload e gerenciamento de fotos de pets via Supabase Storage</li>
                      <li>• Sistema de busca avançada com filtros por CPF, nome, email e cidade</li>
                      <li>• Vinculação automática de pets aos contratos e planos de saúde</li>
                      <li>• Exportação de dados para Excel e PDF</li>
                    </ul>
                  </div>

                  {/* Planos de Saúde */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">2. Planos de Saúde</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                      <li>• Gestão completa de planos (Basic, Infinity, Comfort, Platinum)</li>
                      <li>• Configuração de preços diferenciados por espécie (cão/gato) e porte do animal</li>
                      <li>• Definição de períodos de carência específicos por procedimento</li>
                      <li>• Configuração de coparticipação com regras por tipo de plano</li>
                      <li>• Gestão de procedimentos incluídos, excluídos e com limite anual</li>
                      <li>• Sistema de ativação/desativação de planos para controle de vendas</li>
                      <li>• Configuração de formas de pagamento (mensal, anual, parcelado)</li>
                      <li>• Edição de textos contratuais personalizados por plano</li>
                    </ul>
                  </div>

                  {/* Contratos */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">3. Gestão de Contratos</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                      <li>• Criação automática de contratos ao finalizar checkout de compra</li>
                      <li>• Gestão de status: ativo, inativo, suspenso, cancelado e em análise</li>
                      <li>• Cálculo automático de datas de vencimento e períodos de cobrança</li>
                      <li>• Parcelamento de pagamentos com controle detalhado de cada parcela</li>
                      <li>• Renovação automática de contratos mensais e anuais via cron jobs</li>
                      <li>• Sistema de graça de 15 dias para pagamentos em atraso</li>
                      <li>• Suspensão automática após período de graça expirado</li>
                      <li>• Histórico completo de alterações e modificações no contrato</li>
                      <li>• Geração de contratos em PDF com dados do cliente e pet</li>
                    </ul>
                  </div>

                  {/* Pagamentos */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">4. Sistema de Pagamentos</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                      <li>• Integração completa com Cielo para processamento de pagamentos</li>
                      <li>• Pagamento via cartão de crédito e débito com validação em tempo real</li>
                      <li>• Geração de QR Code PIX para pagamento instantâneo</li>
                      <li>• Checkout multi-etapas com validação progressiva de dados</li>
                      <li>• Sistema de cupons de desconto (percentual ou valor fixo)</li>
                      <li>• Geração automática de recibos em PDF usando pdfMake</li>
                      <li>• Armazenamento seguro de recibos no Supabase Storage</li>
                      <li>• Webhooks da Cielo para atualização automática de status</li>
                      <li>• Notificações por email de confirmação de pagamento</li>
                      <li>• Lembretes automáticos de vencimento e pagamentos pendentes</li>
                      <li>• Controle de parcelas com registro de cada pagamento realizado</li>
                    </ul>
                  </div>

                  {/* Rede Credenciada */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">5. Rede Credenciada</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                      <li>• Cadastro de clínicas e hospitais veterinários da rede</li>
                      <li>• Portal exclusivo para cada unidade da rede com autenticação própria</li>
                      <li>• Gestão de veterinários por unidade (permanentes ou volantes)</li>
                      <li>• Sistema de credenciais e permissões específicas por veterinário</li>
                      <li>• Controle de acesso com níveis de permissão (administrador da unidade)</li>
                      <li>• Registro de atendimentos realizados com procedimentos detalhados</li>
                      <li>• Cálculo automático de valores de coparticipação por procedimento</li>
                      <li>• Dashboard com estatísticas de atendimentos e faturamento</li>
                      <li>• Sistema de busca de clientes por CPF para validação de planos</li>
                    </ul>
                  </div>

                  {/* Atendimentos */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">6. Atendimentos (Guias)</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                      <li>• Registro de atendimentos com múltiplos procedimentos simultâneos</li>
                      <li>• Verificação automática de períodos de carência por procedimento</li>
                      <li>• Controle de limites anuais de uso de procedimentos específicos</li>
                      <li>• Validação de status do contrato antes de aprovar atendimento</li>
                      <li>• Cálculo automático de coparticipação conforme regras do plano</li>
                      <li>• Geração de guias de atendimento para impressão</li>
                      <li>• Busca rápida de clientes por CPF para emissão de carteirinha digital</li>
                      <li>• Histórico completo de atendimentos realizados por pet</li>
                      <li>• Sistema de status: pendente, aprovado, negado, realizado</li>
                      <li>• Registro de veterinário responsável pelo atendimento</li>
                    </ul>
                  </div>

                  {/* Área do Cliente */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">7. Área do Cliente (Portal do Cliente)</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                      <li>• Dashboard personalizado com resumo de contratos ativos e pets cadastrados</li>
                      <li>• Visualização detalhada de todos os procedimentos disponíveis por plano</li>
                      <li>• Consulta de períodos de carência e limites de uso restantes</li>
                      <li>• Histórico financeiro completo com todas as faturas e pagamentos</li>
                      <li>• Download de recibos e comprovantes de pagamento em PDF</li>
                      <li>• Abertura de protocolos de atendimento e solicitações</li>
                      <li>• Solicitação de mudança de plano com análise administrativa</li>
                      <li>• Sistema de avaliações e pesquisas de satisfação</li>
                      <li>• Renovação manual de contratos com processamento de pagamento</li>
                      <li>• Atualização de dados cadastrais e informações de pets</li>
                      <li>• Visualização da rede credenciada por localização</li>
                    </ul>
                  </div>

                  {/* Vendedores */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">8. Sistema de Vendedores e Parceiros</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                      <li>• Cadastro completo de vendedores e parceiros comerciais</li>
                      <li>• Geração automática de links personalizados (whitelabel) para cada vendedor</li>
                      <li>• Rastreamento de cliques, visualizações e conversões por link</li>
                      <li>• Cálculo automático de comissões sobre vendas realizadas</li>
                      <li>• Gestão de pagamentos a vendedores com controle de status</li>
                      <li>• Dashboard com analytics de performance e vendas</li>
                      <li>• Relatórios de conversão e taxa de fechamento por vendedor</li>
                      <li>• Sistema de metas e bonificações por desempenho</li>
                      <li>• Controle de cupons de desconto vinculados a vendedores</li>
                    </ul>
                  </div>

                  {/* Comunicação */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">9. Comunicação e Atendimento</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                      <li>• Chat com inteligência artificial integrado via webhook configurável</li>
                      <li>• Customização de mensagens, ícones e posicionamento do chat</li>
                      <li>• Formulários de contato com validação e envio por email</li>
                      <li>• Sistema de FAQ (perguntas frequentes) gerenciável pelo admin</li>
                      <li>• Notificações por email via Nodemailer (transacionais e marketing)</li>
                      <li>• Lembretes automáticos de vencimento de pagamentos</li>
                      <li>• Emails de confirmação de cadastro e checkout</li>
                      <li>• Sistema de templates de email personalizáveis</li>
                      <li>• Logs de envio de emails para auditoria</li>
                    </ul>
                  </div>

                  {/* Administração */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3">10. Painel Administrativo</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                      <li>• Gestão completa de usuários administradores com controle de permissões</li>
                      <li>• Configurações globais do site (contato, redes sociais, textos institucionais)</li>
                      <li>• Upload de imagens (logo, banners) com integração ao Supabase</li>
                      <li>• Logs de auditoria de todas as ações administrativas (CRUD operations)</li>
                      <li>• Dashboard com métricas, gráficos e relatórios de performance</li>
                      <li>• Controle de visibilidade de colunas em tabelas de dados</li>
                      <li>• Sistema de busca e filtros avançados em todas as listagens</li>
                      <li>• Exportação de dados para Excel e PDF em todas as seções</li>
                      <li>• Gestão de procedimentos com 23 categorias predefinidas</li>
                      <li>• Configuração de regras de negócio (carências, limites, coparticipações)</li>
                      <li>• Sistema de cupons de desconto com controle de validade e uso</li>
                      <li>• Gestão de textos contratuais editáveis por plano</li>
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
              <CardTitle>Funcionalidade dos Botões</CardTitle>
              <CardDescription>Descrição detalhada das ações executadas por cada tipo de botão no sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-6">
                  {/* Botões de Navegação */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Botões de Navegação</h3>
                    <div className="space-y-3">
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Menu Lateral (Sidebar)</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Permite navegação entre as diferentes seções do painel administrativo: Dashboard, 
                          Clientes, Contratos, Financeiro, Rede Credenciada, Vendedores, Configurações, etc. 
                          Utiliza o componente Wouter para roteamento client-side sem recarregar a página.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Voltar / Retornar</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Retorna para a página anterior utilizando a função setLocation do Wouter. 
                          Preserva o estado da aplicação e histórico de navegação do usuário.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Breadcrumb (Navegação em Trilha)</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Exibe o caminho de navegação atual e permite voltar para níveis anteriores da hierarquia.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Botões de CRUD */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Botões de Ação (CRUD)</h3>
                    <div className="space-y-3">
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Adicionar / Novo / Criar</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Abre um formulário modal ou página dedicada para criação de novo registro (cliente, pet, plano, etc.). 
                          Utiliza React Query mutation para enviar requisição POST para a API, com invalidação automática 
                          do cache após sucesso para atualizar a listagem.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Editar / Modificar</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Carrega os dados atuais do registro via React Query e abre formulário preenchido em modo de edição. 
                          Utiliza mutation para enviar requisição PUT ou PATCH para a API, com atualização otimista do cache 
                          antes mesmo da confirmação do servidor.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Excluir / Deletar / Remover</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Abre um diálogo de confirmação que solicita a senha do administrador para segurança adicional. 
                          Após confirmação, envia requisição DELETE para a API e remove o item do cache automaticamente, 
                          atualizando a interface sem necessidade de recarregar.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Visualizar Detalhes / Ver Mais</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Abre um modal ou painel lateral com informações detalhadas do registro selecionado, 
                          incluindo dados relacionados e histórico. Modo somente leitura, sem permitir edição direta.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Botões de Formulário */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Botões de Formulário</h3>
                    <div className="space-y-3">
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Salvar / Confirmar / Enviar</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Executa validação completa do formulário usando Zod schema, exibe erros de validação nos campos 
                          específicos se necessário. Após validação bem-sucedida, envia dados via React Hook Form usando 
                          React Query mutation, exibe feedback visual de loading e fecha o formulário após confirmação.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Cancelar / Fechar</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Fecha o formulário ou modal sem salvar alterações. Se houver dados não salvos, pode exibir 
                          confirmação para evitar perda acidental de informações. Reseta o estado do formulário para os valores iniciais.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Próximo / Anterior (Navegação de Etapas)</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Navega entre as etapas de formulários multi-step (como checkout). Valida os campos da etapa atual 
                          antes de permitir avançar para a próxima. Mantém os dados preenchidos ao retornar para etapas anteriores.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Limpar / Resetar Formulário</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Reseta todos os campos do formulário para seus valores padrão ou vazios, limpando também 
                          mensagens de erro de validação.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Botões de Ação Específica */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Botões de Ação Específica</h3>
                    <div className="space-y-3">
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Ativar / Desativar (Toggle)</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Componente Switch que alterna o status de ativação de um registro (plano, procedimento, FAQ, etc.). 
                          Atualiza o status via API com atualização otimista do cache no React Query, mostrando mudança 
                          instantânea na interface antes da confirmação do servidor.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Buscar CEP</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Consulta a API ViaCEP com o CEP informado e preenche automaticamente os campos de endereço 
                          (logradouro, bairro, cidade, estado). Exibe mensagem de erro se o CEP for inválido ou não encontrado.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Aplicar Cupom de Desconto</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Valida o código do cupom via API verificando validade, limite de uso e aplicabilidade. 
                          Calcula o desconto (percentual ou valor fixo) e atualiza o valor total do checkout em tempo real, 
                          exibindo o desconto aplicado detalhadamente.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Adicionar Pet (Checkout)</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Adiciona um novo card de pet no array de pets do formulário de checkout. Atualiza automaticamente 
                          o cálculo de valores considerando descontos progressivos por quantidade de pets.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Gerar Carteirinha Digital</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Busca cliente por CPF no banco de dados, valida se possui contrato ativo, gera carteirinha 
                          digital do pet em formato PDF ou imagem para download ou impressão.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Copiar para Área de Transferência</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Utiliza a API navigator.clipboard.writeText() para copiar texto selecionado (código PIX, 
                          link de vendedor, URL, etc.). Exibe feedback toast de confirmação após cópia bem-sucedida.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Exportar Dados (Excel/PDF)</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Exporta os dados da tabela atual para arquivo Excel (xlsx) ou PDF, incluindo filtros e colunas 
                          visíveis aplicados. Gera arquivo para download com nome descritivo e data atual.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Atualizar / Refresh</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Invalida o cache do React Query e força uma nova busca de dados no servidor, 
                          atualizando a interface com as informações mais recentes.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Botões de Autenticação */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Botões de Autenticação</h3>
                    <div className="space-y-3">
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Login / Entrar</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Valida as credenciais (login/senha ou CPF/senha) no servidor, cria sessão HTTP-only cookie, 
                          armazena informações básicas do usuário no session storage para acesso rápido e redireciona 
                          para a página apropriada (admin, cliente ou unidade) conforme tipo de usuário.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Logout / Sair</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Destroi a sessão no servidor via endpoint de logout, limpa todos os dados do session storage 
                          e local storage, invalida o cache do React Query e redireciona para a página de login.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Botões de Pagamento */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Botões de Pagamento</h3>
                    <div className="space-y-3">
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Finalizar Compra / Checkout</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Valida todos os dados do formulário de checkout, processa o pagamento via API da Cielo, 
                          cria contrato e registros de pets no banco de dados, gera recibo em PDF, armazena no Supabase, 
                          envia email de confirmação e redireciona para página de sucesso com detalhes da compra.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Pagar com PIX</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Gera QR Code PIX via API da Cielo, exibe código visual e copia-e-cola para o usuário, 
                          inicia polling automático para verificar status do pagamento a cada 5 segundos até 
                          confirmação ou timeout, atualiza interface quando pagamento for confirmado.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Pagar com Cartão</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Valida dados do cartão (número, CVV, validade, nome do titular), processa pagamento 
                          com cartão de crédito ou débito via API da Cielo, retorna confirmação instantânea de 
                          aprovação ou recusa com mensagem detalhada do motivo.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Emitir Recibo / Segunda Via</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Gera ou recupera recibo de pagamento em PDF a partir dos dados armazenados, 
                          disponibiliza para download ou impressão.
                        </p>
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
              <CardTitle>Principais Funções Implementadas</CardTitle>
              <CardDescription>Detalhamento técnico de funções, hooks, serviços e middlewares do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-6">
                  {/* Hooks Customizados */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Hooks Customizados (React)</h3>
                    <div className="space-y-3">
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">useAuth()</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Gerencia todo o fluxo de autenticação da aplicação incluindo login, logout, verificação de 
                          sessão ativa e redirecionamentos automáticos. Utiliza React Query para verificar autenticação 
                          e session storage para persistência local.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">useSiteSettings()</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Carrega e gerencia as configurações globais do site (informações de contato, redes sociais, 
                          textos institucionais, cores personalizadas). Utiliza cache do React Query para evitar 
                          requisições desnecessárias.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">useToast()</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Hook do shadcn/ui para exibir notificações toast (sucesso, erro, aviso, informação) 
                          com posicionamento configurável e fechamento automático ou manual.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">useColumnPreferences()</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Gerencia a visibilidade de colunas em tabelas de dados, salvando preferências do usuário 
                          no localStorage para manter configuração entre sessões.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Middlewares de Autenticação */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Middlewares de Autenticação e Autorização</h3>
                    <div className="space-y-3">
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">requireAdmin()</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Middleware que verifica se existe uma sessão de administrador ativa antes de permitir 
                          acesso a rotas protegidas do painel admin. Retorna 401 Unauthorized se sessão inválida.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">requireAuth()</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Middleware genérico para proteger rotas de cliente, verificando se existe sessão ativa 
                          no sistema. Utilizado nas rotas da área do cliente e portal de unidades.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">requireUnitAuth()</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Middleware específico para autenticação de unidades da rede credenciada. Valida credenciais 
                          de veterinários e administradores de unidade com diferentes níveis de permissão.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Funções de Validação */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Funções de Validação</h3>
                    <div className="space-y-3">
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">validateCPF(cpf: string): boolean</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Valida CPF brasileiro usando o algoritmo de dígito verificador. Verifica formato, 
                          sequências inválidas (111.111.111-11) e calcula dígitos verificadores corretos.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">validateEmail(email: string): boolean</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Valida formato de endereço de email usando expressão regular (regex) compatível com 
                          padrões RFC 5322.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">validatePhone(phone: string): boolean</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Valida formato de telefone brasileiro (celular com 9 dígitos e fixo com 8 dígitos), 
                          incluindo código de área.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Funções de Formatação */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Funções de Formatação</h3>
                    <div className="space-y-3">
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">formatCurrency(value: number): string</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Formata valores numéricos para formato monetário brasileiro: R$ 1.234,56. 
                          Utiliza Intl.NumberFormat para internacionalização.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">formatCPF(cpf: string): string</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Formata string de CPF para o padrão brasileiro: 123.456.789-01
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">formatPhone(phone: string): string</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Formata número de telefone para: (11) 98765-4321 ou (11) 3456-7890
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">formatDate(date: Date): string</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Formata datas usando biblioteca date-fns com localização pt-BR: 25/12/2025 ou 
                          25 de dezembro de 2025.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">capitalizeFirst(text: string): string</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Formata texto com apenas a primeira letra maiúscula e demais em minúsculo. 
                          Exemplo: "JOÃO SILVA" → "João silva"
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Serviços de Pagamento */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Serviços de Pagamento (Cielo)</h3>
                    <div className="space-y-3">
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">CieloService.createCreditCardPayment()</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Processa pagamento com cartão de crédito/débito via API da Cielo. Inclui lógica de retry 
                          automático em caso de falha temporária, validação de dados do cartão e tratamento de erros 
                          específicos da operadora.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">CieloService.createPixPayment()</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Gera QR Code PIX via API da Cielo e retorna código copia-e-cola. Processa pagamento 
                          instantâneo PIX com confirmação em tempo real via polling.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">PaymentReceiptService.generateReceipt()</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Gera recibo de pagamento em formato PDF usando biblioteca pdfMake. Armazena arquivo no 
                          Supabase Storage e retorna URL pública para download ou envio por email.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">CieloWebhookService.processNotification()</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Processa notificações enviadas pela Cielo via webhook para atualizar status de pagamentos 
                          automaticamente (aprovado, recusado, cancelado). Valida autenticidade da notificação.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Regras de Negócio */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Regras de Negócio e Cálculos</h3>
                    <div className="space-y-3">
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">calculateCoparticipation()</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Calcula o valor de coparticipação que o cliente deve pagar baseado nas regras do plano 
                          contratado e do procedimento realizado. Considera descontos progressivos e limites de valor.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">checkWaitingPeriod()</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Verifica se o período de carência do procedimento já foi cumprido desde a data de início 
                          do contrato. Retorna true se liberado ou false se ainda em carência.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">checkAnnualLimit()</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Verifica se o limite anual de uso do procedimento foi atingido para o pet. Conta quantas 
                          vezes o procedimento foi utilizado no ano corrente e compara com limite configurado.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">calculateNextRenewalDate()</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Calcula a próxima data de renovação automática do contrato baseado no período de cobrança 
                          configurado (mensal ou anual), adicionando o intervalo correspondente à data atual.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Renovação Automática */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Sistema de Renovação Automática</h3>
                    <div className="space-y-3">
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">AutomaticRenewalService.processAutomaticRenewals()</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Processa renovações automáticas de contratos vencidos via cron job executado diariamente. 
                          Identifica contratos elegíveis, atualiza datas de vencimento e envia notificações.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Funções de API */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Funções de Comunicação com API</h3>
                    <div className="space-y-3">
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">apiRequest(url, options)</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Cliente HTTP base para todas as requisições à API. Inclui tratamento automático de erros, 
                          retry logic para falhas temporárias, refresh automático de token expirado e interceptors 
                          para logging.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">queryClient.prefetchQuery()</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Pré-carrega dados no cache do React Query antes que o usuário navegue para a página, 
                          melhorando significativamente a performance e experiência de navegação.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">queryClient.invalidateQueries()</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Invalida queries específicas no cache do React Query, forçando uma nova busca de dados 
                          no servidor para garantir que informações estão atualizadas.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Integrações Externas */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Integrações com Serviços Externos</h3>
                    <div className="space-y-3">
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">CepService.lookup(cep: string)</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Busca informações completas de endereço via API ViaCEP. Inclui timeout de 5 segundos, 
                          tratamento de CEPs inválidos e fallback para serviço alternativo em caso de falha.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">SupabaseStorage.upload(file, bucket)</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Upload de arquivos (imagens de pets, documentos, recibos) para buckets do Supabase Storage 
                          com controle de permissões e geração de URLs públicas ou privadas.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">NotificationService.sendEmail()</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Envia emails transacionais e de notificação usando Nodemailer. Suporta templates HTML, 
                          anexos e fila de envio para grandes volumes.
                        </p>
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
              <CardTitle>Endpoints da API</CardTitle>
              <CardDescription>Documentação completa dos endpoints REST disponíveis com métodos HTTP, parâmetros e respostas</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-6">
                  {/* Autenticação */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Autenticação</h3>
                    <div className="space-y-3">
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">POST</Badge>
                          <code className="text-sm">/admin/api/login</code>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Realiza login de administradores no sistema. Retorna sessão HTTP-only cookie com duração configurável.
                          <br /><span className="font-medium">Body:</span> &#123; login: string, senha: string &#125;
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">POST</Badge>
                          <code className="text-sm">/admin/api/logout</code>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Realiza logout e destruição da sessão de administrador. Limpa cookie de autenticação.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">GET</Badge>
                          <code className="text-sm">/admin/api/auth/check</code>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Verifica se existe sessão de administrador ativa. Retorna dados básicos do admin logado ou erro 401.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">POST</Badge>
                          <code className="text-sm">/api/auth/client/login</code>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Login de clientes usando CPF e senha. Retorna JWT token e dados do cliente.
                          <br /><span className="font-medium">Body:</span> &#123; cpf: string, password: string &#125;
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Clientes */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Clientes</h3>
                    <div className="space-y-3">
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">GET</Badge>
                          <code className="text-sm">/admin/api/clients</code>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Lista todos os clientes cadastrados. Suporta paginação, filtros e ordenação.
                          <br /><span className="font-medium">Query params:</span> page, limit, search, orderBy
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">GET</Badge>
                          <code className="text-sm">/admin/api/clients/:id</code>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Busca cliente específico por ID incluindo dados de pets e contratos associados.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">POST</Badge>
                          <code className="text-sm">/admin/api/clients</code>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Cria novo cliente no sistema com validação de CPF único.
                          <br /><span className="font-medium">Body:</span> &#123; fullName, cpf, email, phone, address, ... &#125;
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">PATCH</Badge>
                          <code className="text-sm">/admin/api/clients/:id</code>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Atualiza dados de cliente existente. Permite atualização parcial de campos.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">DELETE</Badge>
                          <code className="text-sm">/admin/api/clients/:id</code>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Remove cliente do sistema. Verifica se possui contratos ativos antes de permitir exclusão.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">GET</Badge>
                          <code className="text-sm">/admin/api/clients/search/cpf/:cpf</code>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Busca cliente por CPF. Útil para validações e emissão de carteirinhas.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Pets */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Pets</h3>
                    <div className="space-y-3">
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">GET</Badge>
                          <code className="text-sm">/admin/api/clients/:clientId/pets</code>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Lista todos os pets de um cliente específico incluindo dados de contratos ativos.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">GET</Badge>
                          <code className="text-sm">/admin/api/pets/:id</code>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Busca dados detalhados de um pet específico incluindo histórico de atendimentos.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">POST</Badge>
                          <code className="text-sm">/admin/api/pets</code>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Cria novo pet vinculado a um cliente. Suporta upload de foto.
                          <br /><span className="font-medium">Body:</span> &#123; clientId, name, species, breed, age, ... &#125;
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">PATCH</Badge>
                          <code className="text-sm">/admin/api/pets/:id</code>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Atualiza informações de pet existente incluindo dados médicos e vacinas.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Planos */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Planos de Saúde</h3>
                    <div className="space-y-3">
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">GET</Badge>
                          <code className="text-sm">/api/plans</code>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Lista todos os planos ativos disponíveis para venda. Rota pública.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">GET</Badge>
                          <code className="text-sm">/admin/api/plans</code>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Lista todos os planos (ativos e inativos) para gestão administrativa.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">POST</Badge>
                          <code className="text-sm">/admin/api/plans</code>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Cria novo plano com configurações de preços, procedimentos e carências.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">PATCH</Badge>
                          <code className="text-sm">/admin/api/plans/:id</code>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Atualiza configurações de plano existente incluindo preços e regras.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Contratos */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Contratos</h3>
                    <div className="space-y-3">
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">GET</Badge>
                          <code className="text-sm">/admin/api/contracts</code>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Lista todos os contratos com filtros por status, cliente, plano e datas.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">GET</Badge>
                          <code className="text-sm">/admin/api/contracts/:id</code>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Busca contrato específico com histórico completo de pagamentos e alterações.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">PATCH</Badge>
                          <code className="text-sm">/admin/api/contracts/:id/status</code>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Atualiza status do contrato (ativo, suspenso, cancelado). Registra motivo em log de auditoria.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Pagamentos */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Pagamentos</h3>
                    <div className="space-y-3">
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">POST</Badge>
                          <code className="text-sm">/api/payment/cielo/credit</code>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Processa pagamento via cartão de crédito/débito usando API da Cielo. Retorna status de aprovação.
                          <br /><span className="font-medium">Body:</span> &#123; cardData, amount, installments, ... &#125;
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">POST</Badge>
                          <code className="text-sm">/api/payment/cielo/pix</code>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Gera QR Code PIX para pagamento instantâneo. Retorna código e URL do QR Code.
                          <br /><span className="font-medium">Body:</span> &#123; amount, description, ... &#125;
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">POST</Badge>
                          <code className="text-sm">/api/webhook/cielo</code>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Webhook para receber notificações automáticas da Cielo sobre mudanças de status de pagamentos.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">GET</Badge>
                          <code className="text-sm">/api/payment/pix/:paymentId/status</code>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Consulta status de pagamento PIX para polling. Retorna se foi aprovado ou ainda pendente.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Rede Credenciada */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Rede Credenciada</h3>
                    <div className="space-y-3">
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">GET</Badge>
                          <code className="text-sm">/api/network-units</code>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Lista unidades da rede credenciada. Suporta filtro por cidade e especialidade. Rota pública.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">POST</Badge>
                          <code className="text-sm">/admin/api/network-units</code>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Cadastra nova unidade na rede credenciada com dados de contato e localização.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">POST</Badge>
                          <code className="text-sm">/unidade/:slug/api/atendimentos</code>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Cria novo registro de atendimento pela unidade da rede. Valida carências e limites.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Utilitários */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Utilitários e Serviços</h3>
                    <div className="space-y-3">
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">GET</Badge>
                          <code className="text-sm">/api/cep/:cep</code>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Consulta informações de endereço via CEP usando integração com ViaCEP.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">GET</Badge>
                          <code className="text-sm">/api/site-settings</code>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Retorna configurações globais do site (contato, redes sociais, textos). Rota pública com cache.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">GET</Badge>
                          <code className="text-sm">/api/faq</code>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Lista perguntas frequentes ativas ordenadas por prioridade. Rota pública.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">POST</Badge>
                          <code className="text-sm">/api/contact</code>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Envia formulário de contato por email. Valida recaptcha e aplica rate limit.
                        </p>
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
              <CardTitle>Estrutura do Banco de Dados</CardTitle>
              <CardDescription>Schema detalhado e relacionamentos das tabelas PostgreSQL com Drizzle ORM</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-6">
                  {/* Tabela Clients */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">clients (Clientes)</h3>
                    <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                      <p className="text-sm text-muted-foreground mb-3">
                        Armazena dados pessoais e de contato dos clientes do sistema.
                      </p>
                      <p className="text-sm font-medium mb-2">Campos:</p>
                      <ul className="text-sm space-y-1 ml-4 text-muted-foreground">
                        <li>• <span className="font-medium">id</span> - UUID, chave primária</li>
                        <li>• <span className="font-medium">full_name</span> - VARCHAR(255), nome completo</li>
                        <li>• <span className="font-medium">cpf</span> - VARCHAR(14), UNIQUE, indexado</li>
                        <li>• <span className="font-medium">email</span> - VARCHAR(255)</li>
                        <li>• <span className="font-medium">phone</span> - VARCHAR(20)</li>
                        <li>• <span className="font-medium">address</span> - VARCHAR(500), endereço completo</li>
                        <li>• <span className="font-medium">city, state, cep</span> - VARCHAR</li>
                        <li>• <span className="font-medium">district</span> - VARCHAR(100), bairro</li>
                        <li>• <span className="font-medium">created_at, updated_at</span> - TIMESTAMP</li>
                      </ul>
                      <p className="text-sm font-medium mt-3 mb-2">Relacionamentos:</p>
                      <ul className="text-sm space-y-1 ml-4 text-muted-foreground">
                        <li>• Um cliente possui vários pets (1:N com pets)</li>
                        <li>• Um cliente possui vários contratos (1:N com contracts)</li>
                      </ul>
                    </div>
                  </div>

                  {/* Tabela Pets */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">pets (Animais de Estimação)</h3>
                    <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                      <p className="text-sm text-muted-foreground mb-3">
                        Armazena informações detalhadas sobre os pets cadastrados no sistema.
                      </p>
                      <p className="text-sm font-medium mb-2">Campos:</p>
                      <ul className="text-sm space-y-1 ml-4 text-muted-foreground">
                        <li>• <span className="font-medium">id</span> - UUID, chave primária</li>
                        <li>• <span className="font-medium">client_id</span> - UUID, FK → clients.id</li>
                        <li>• <span className="font-medium">name</span> - VARCHAR(100), nome do pet</li>
                        <li>• <span className="font-medium">species</span> - VARCHAR(50), espécie (cão/gato)</li>
                        <li>• <span className="font-medium">breed</span> - VARCHAR(100), raça</li>
                        <li>• <span className="font-medium">age</span> - INTEGER, idade em anos</li>
                        <li>• <span className="font-medium">sex</span> - VARCHAR(10), macho/fêmea</li>
                        <li>• <span className="font-medium">color</span> - VARCHAR(50), cor predominante</li>
                        <li>• <span className="font-medium">weight</span> - DECIMAL(5,2), peso em kg</li>
                        <li>• <span className="font-medium">castrated</span> - BOOLEAN, se é castrado</li>
                        <li>• <span className="font-medium">vaccine_data</span> - JSONB, histórico de vacinas</li>
                        <li>• <span className="font-medium">medical_info</span> - TEXT, informações médicas</li>
                        <li>• <span className="font-medium">photo_url</span> - VARCHAR(500), URL da foto</li>
                        <li>• <span className="font-medium">created_at, updated_at</span> - TIMESTAMP</li>
                      </ul>
                      <p className="text-sm font-medium mt-3 mb-2">Relacionamentos:</p>
                      <ul className="text-sm space-y-1 ml-4 text-muted-foreground">
                        <li>• Pertence a um cliente (N:1 com clients)</li>
                        <li>• Possui vários atendimentos (1:N com atendimentos)</li>
                      </ul>
                    </div>
                  </div>

                  {/* Tabela Plans */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">plans (Planos de Saúde)</h3>
                    <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                      <p className="text-sm text-muted-foreground mb-3">
                        Define os planos de saúde disponíveis (Basic, Infinity, Comfort, Platinum) com suas configurações.
                      </p>
                      <p className="text-sm font-medium mb-2">Campos:</p>
                      <ul className="text-sm space-y-1 ml-4 text-muted-foreground">
                        <li>• <span className="font-medium">id</span> - UUID, chave primária</li>
                        <li>• <span className="font-medium">name</span> - VARCHAR(100), nome do plano</li>
                        <li>• <span className="font-medium">plan_type</span> - VARCHAR(50), tipo (BASIC, INFINITY, etc)</li>
                        <li>• <span className="font-medium">description</span> - TEXT, descrição detalhada</li>
                        <li>• <span className="font-medium">features</span> - TEXT[], lista de benefícios</li>
                        <li>• <span className="font-medium">base_price</span> - DECIMAL(10,2), preço base mensal</li>
                        <li>• <span className="font-medium">annual_price</span> - DECIMAL(10,2), preço anual</li>
                        <li>• <span className="font-medium">installment_price</span> - DECIMAL(10,2)</li>
                        <li>• <span className="font-medium">installment_count</span> - INTEGER</li>
                        <li>• <span className="font-medium">pricing_by_species</span> - JSONB, preços por espécie</li>
                        <li>• <span className="font-medium">pet_discounts</span> - JSONB, descontos progressivos</li>
                        <li>• <span className="font-medium">is_active</span> - BOOLEAN, se está ativo para venda</li>
                        <li>• <span className="font-medium">contract_text</span> - TEXT, texto contratual personalizado</li>
                        <li>• <span className="font-medium">created_at, updated_at</span> - TIMESTAMP</li>
                      </ul>
                      <p className="text-sm font-medium mt-3 mb-2">Relacionamentos:</p>
                      <ul className="text-sm space-y-1 ml-4 text-muted-foreground">
                        <li>• Um plano possui vários contratos (1:N com contracts)</li>
                        <li>• Relacionamento N:N com procedures via plan_procedures</li>
                      </ul>
                    </div>
                  </div>

                  {/* Tabela Contracts */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">contracts (Contratos)</h3>
                    <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                      <p className="text-sm text-muted-foreground mb-3">
                        Registra contratos de planos de saúde assinados pelos clientes para seus pets.
                      </p>
                      <p className="text-sm font-medium mb-2">Campos:</p>
                      <ul className="text-sm space-y-1 ml-4 text-muted-foreground">
                        <li>• <span className="font-medium">id</span> - UUID, chave primária</li>
                        <li>• <span className="font-medium">client_id</span> - UUID, FK → clients.id</li>
                        <li>• <span className="font-medium">pet_id</span> - UUID, FK → pets.id</li>
                        <li>• <span className="font-medium">plan_id</span> - UUID, FK → plans.id</li>
                        <li>• <span className="font-medium">status</span> - VARCHAR(20), ativo/suspenso/cancelado</li>
                        <li>• <span className="font-medium">start_date</span> - DATE, data de início</li>
                        <li>• <span className="font-medium">end_date</span> - DATE, data de término</li>
                        <li>• <span className="font-medium">next_due_date</span> - DATE, próximo vencimento</li>
                        <li>• <span className="font-medium">billing_frequency</span> - VARCHAR(20), mensal/anual</li>
                        <li>• <span className="font-medium">payment_method</span> - VARCHAR(50)</li>
                        <li>• <span className="font-medium">total_amount</span> - DECIMAL(10,2)</li>
                        <li>• <span className="font-medium">installments</span> - INTEGER, nº de parcelas</li>
                        <li>• <span className="font-medium">paid_installments</span> - INTEGER</li>
                        <li>• <span className="font-medium">created_at, updated_at</span> - TIMESTAMP</li>
                      </ul>
                      <p className="text-sm font-medium mt-3 mb-2">Índices:</p>
                      <ul className="text-sm space-y-1 ml-4 text-muted-foreground">
                        <li>• Índice composto em (client_id, status) para queries otimizadas</li>
                        <li>• Índice em next_due_date para renovações automáticas</li>
                      </ul>
                    </div>
                  </div>

                  {/* Tabela Network Units */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">network_units (Unidades da Rede)</h3>
                    <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                      <p className="text-sm text-muted-foreground mb-3">
                        Cadastro de clínicas e hospitais veterinários credenciados.
                      </p>
                      <p className="text-sm font-medium mb-2">Campos:</p>
                      <ul className="text-sm space-y-1 ml-4 text-muted-foreground">
                        <li>• <span className="font-medium">id</span> - UUID, chave primária</li>
                        <li>• <span className="font-medium">name</span> - VARCHAR(200), nome da unidade</li>
                        <li>• <span className="font-medium">slug</span> - VARCHAR(100), UNIQUE, para URLs</li>
                        <li>• <span className="font-medium">address, city, state, cep</span> - VARCHAR</li>
                        <li>• <span className="font-medium">phone, email</span> - VARCHAR</li>
                        <li>• <span className="font-medium">specialties</span> - TEXT[], especialidades oferecidas</li>
                        <li>• <span className="font-medium">is_active</span> - BOOLEAN</li>
                        <li>• <span className="font-medium">created_at, updated_at</span> - TIMESTAMP</li>
                      </ul>
                      <p className="text-sm font-medium mt-3 mb-2">Relacionamentos:</p>
                      <ul className="text-sm space-y-1 ml-4 text-muted-foreground">
                        <li>• Possui vários veterinários (1:N com veterinarians)</li>
                        <li>• Realiza vários atendimentos (1:N com atendimentos)</li>
                      </ul>
                    </div>
                  </div>

                  {/* Tabela Atendimentos */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">atendimentos (Guias de Atendimento)</h3>
                    <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                      <p className="text-sm text-muted-foreground mb-3">
                        Registra atendimentos veterinários realizados nas unidades da rede.
                      </p>
                      <p className="text-sm font-medium mb-2">Campos:</p>
                      <ul className="text-sm space-y-1 ml-4 text-muted-foreground">
                        <li>• <span className="font-medium">id</span> - UUID, chave primária</li>
                        <li>• <span className="font-medium">pet_id</span> - UUID, FK → pets.id</li>
                        <li>• <span className="font-medium">contract_id</span> - UUID, FK → contracts.id</li>
                        <li>• <span className="font-medium">network_unit_id</span> - UUID, FK → network_units.id</li>
                        <li>• <span className="font-medium">veterinarian_id</span> - UUID, FK → veterinarians.id</li>
                        <li>• <span className="font-medium">procedure_data</span> - JSONB, procedimentos realizados</li>
                        <li>• <span className="font-medium">coparticipation_total</span> - DECIMAL(10,2)</li>
                        <li>• <span className="font-medium">status</span> - VARCHAR(20), pendente/aprovado/realizado</li>
                        <li>• <span className="font-medium">diagnosis</span> - TEXT, diagnóstico</li>
                        <li>• <span className="font-medium">observations</span> - TEXT</li>
                        <li>• <span className="font-medium">created_at, updated_at</span> - TIMESTAMP</li>
                        <li>• <span className="font-medium">created_by</span> - VARCHAR(100), usuário criador</li>
                      </ul>
                    </div>
                  </div>

                  {/* Tabela Procedures */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">procedures (Procedimentos Médicos)</h3>
                    <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                      <p className="text-sm text-muted-foreground mb-3">
                        Catálogo de procedimentos veterinários disponíveis com regras de cobertura.
                      </p>
                      <p className="text-sm font-medium mb-2">Campos:</p>
                      <ul className="text-sm space-y-1 ml-4 text-muted-foreground">
                        <li>• <span className="font-medium">id</span> - UUID, chave primária</li>
                        <li>• <span className="font-medium">name</span> - VARCHAR(200), nome do procedimento</li>
                        <li>• <span className="font-medium">category</span> - VARCHAR(100), categoria (consulta, exame, etc)</li>
                        <li>• <span className="font-medium">description</span> - TEXT</li>
                        <li>• <span className="font-medium">waiting_period_days</span> - INTEGER, carência em dias</li>
                        <li>• <span className="font-medium">annual_limit</span> - INTEGER, limite anual de uso</li>
                        <li>• <span className="font-medium">coparticipation_percentage</span> - DECIMAL(5,2)</li>
                        <li>• <span className="font-medium">reference_value</span> - DECIMAL(10,2)</li>
                        <li>• <span className="font-medium">is_active</span> - BOOLEAN</li>
                        <li>• <span className="font-medium">created_at, updated_at</span> - TIMESTAMP</li>
                      </ul>
                    </div>
                  </div>

                  {/* Tabela Sellers */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">sellers (Vendedores/Parceiros)</h3>
                    <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                      <p className="text-sm text-muted-foreground mb-3">
                        Cadastro de vendedores e parceiros com links personalizados e comissões.
                      </p>
                      <p className="text-sm font-medium mb-2">Campos:</p>
                      <ul className="text-sm space-y-1 ml-4 text-muted-foreground">
                        <li>• <span className="font-medium">id</span> - UUID, chave primária</li>
                        <li>• <span className="font-medium">full_name</span> - VARCHAR(200)</li>
                        <li>• <span className="font-medium">cpf</span> - VARCHAR(14), UNIQUE</li>
                        <li>• <span className="font-medium">email, phone</span> - VARCHAR</li>
                        <li>• <span className="font-medium">seller_link</span> - VARCHAR(100), UNIQUE, whitelabel</li>
                        <li>• <span className="font-medium">commission_percentage</span> - DECIMAL(5,2)</li>
                        <li>• <span className="font-medium">clicks_count</span> - INTEGER, total de cliques</li>
                        <li>• <span className="font-medium">conversions_count</span> - INTEGER, vendas realizadas</li>
                        <li>• <span className="font-medium">total_commission</span> - DECIMAL(10,2)</li>
                        <li>• <span className="font-medium">is_active</span> - BOOLEAN</li>
                        <li>• <span className="font-medium">created_at, updated_at</span> - TIMESTAMP</li>
                      </ul>
                    </div>
                  </div>

                  {/* Tabela Admins */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3">admins (Administradores)</h3>
                    <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                      <p className="text-sm text-muted-foreground mb-3">
                        Usuários com acesso ao painel administrativo do sistema.
                      </p>
                      <p className="text-sm font-medium mb-2">Campos:</p>
                      <ul className="text-sm space-y-1 ml-4 text-muted-foreground">
                        <li>• <span className="font-medium">id</span> - UUID, chave primária</li>
                        <li>• <span className="font-medium">login</span> - VARCHAR(50), UNIQUE</li>
                        <li>• <span className="font-medium">senha</span> - VARCHAR(255), hash bcrypt</li>
                        <li>• <span className="font-medium">nome</span> - VARCHAR(200)</li>
                        <li>• <span className="font-medium">email</span> - VARCHAR(255)</li>
                        <li>• <span className="font-medium">role</span> - VARCHAR(20), super_admin/admin</li>
                        <li>• <span className="font-medium">is_active</span> - BOOLEAN</li>
                        <li>• <span className="font-medium">last_login</span> - TIMESTAMP</li>
                        <li>• <span className="font-medium">created_at, updated_at</span> - TIMESTAMP</li>
                      </ul>
                      <p className="text-sm font-medium mt-3 mb-2">Segurança:</p>
                      <ul className="text-sm space-y-1 ml-4 text-muted-foreground">
                        <li>• Senhas armazenadas com hash bcrypt (custo 12)</li>
                        <li>• Suporte a senhas em texto plano para ambiente Replit (fallback)</li>
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
              <CardTitle>Segurança e Proteção</CardTitle>
              <CardDescription>Medidas de segurança implementadas para proteger dados e prevenir ataques</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-6">
                  {/* Autenticação */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Autenticação e Autorização</h3>
                    <div className="space-y-3">
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Express Sessions com HTTP-Only Cookies</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Sessões armazenadas no servidor usando connect-pg-simple com PostgreSQL. Cookies de sessão 
                          configurados como HTTP-Only para prevenir acesso via JavaScript (proteção contra XSS). 
                          Expiração automática de sessões após período de inatividade.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Criptografia de Senhas com bcrypt</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Todas as senhas são hash com bcrypt usando cost factor 12 antes de armazenamento. 
                          Senhas nunca são armazenadas em texto plano. Sistema suporta fallback para senhas 
                          em texto plano apenas em ambiente Replit para facilitar desenvolvimento.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">JWT Tokens para Clientes</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Clientes autenticam via CPF e recebem JWT token com tempo de expiração configurável. 
                          Tokens são validados em cada requisição para áreas protegidas.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Middlewares de Proteção de Rotas</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Todas as rotas admin protegidas por middleware requireAdmin(). Rotas de cliente protegidas 
                          por requireAuth(). Rotas de unidades protegidas por requireUnitAuth(). Retorno 401 
                          Unauthorized para acessos não autorizados.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Proteção contra Ataques */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Proteção contra Ataques Web</h3>
                    <div className="space-y-3">
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Helmet.js - Headers de Segurança</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Helmet configurado para adicionar headers de segurança HTTP: Content-Security-Policy, 
                          X-Frame-Options (proteção contra clickjacking), X-Content-Type-Options, 
                          Strict-Transport-Security (HSTS), X-XSS-Protection.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">CORS - Controle de Origem Cruzada</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          CORS configurado com whitelist de domínios permitidos. Validação rigorosa de origem usando 
                          URL parsing. Rejeição automática de requisições de origens não autorizadas. Suporte a 
                          credenciais (cookies) apenas para origens confiáveis.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Rate Limiting - Limitação de Taxa</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Express-rate-limit aplicado em rotas críticas (login, registro, pagamento). Limite de 
                          requisições por IP/hora configurável. Proteção contra ataques de força bruta e DDoS. 
                          Respostas 429 Too Many Requests quando limite excedido.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">CSRF Protection</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Proteção CSRF implementada com csurf para formulários. Tokens CSRF gerados e validados 
                          em operações sensíveis (mudança de senha, exclusão de dados). Rejeição de requisições 
                          sem token válido.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Sanitização de Entrada - XSS Prevention</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Sanitize-html usado para limpar inputs de usuário antes de armazenamento. Remoção de 
                          tags HTML maliciosas, scripts e eventos JavaScript. Validação de tipos de dados com 
                          Zod antes de processamento.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">SQL Injection Prevention</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Uso exclusivo de queries parametrizadas via Drizzle ORM. Nunca concatenação direta de 
                          strings SQL. Validação e sanitização de todos os inputs antes de queries. Prepared 
                          statements para todas as operações de banco.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Proteção de Dados */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Proteção e Privacidade de Dados</h3>
                    <div className="space-y-3">
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Mass Assignment Protection</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Proteção contra mass assignment em todas as operações de criação/atualização. Whitelist 
                          explícita de campos permitidos. Rejeição de campos não autorizados enviados pelo cliente. 
                          Schemas Zod validam estrutura exata dos dados aceitos.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">IDOR Prevention - Insecure Direct Object Reference</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Validação de propriedade de recursos antes de permitir acesso. Verificação se usuário 
                          autenticado é dono do recurso solicitado. Uso de UUIDs ao invés de IDs sequenciais para 
                          dificultar enumeração. Retorno 403 Forbidden para tentativas de acesso não autorizado.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Validação de Uploads de Arquivos</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Validação rigorosa de tipo MIME de arquivos enviados. Limite de tamanho de arquivo configurável 
                          (máx 5MB). Whitelist de extensões permitidas (.jpg, .png, .pdf). Renomeação automática de 
                          arquivos para prevenir execução de código. Armazenamento em bucket isolado do Supabase Storage.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Logs de Auditoria</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Sistema completo de logging de todas as ações administrativas (CRUD operations). Registro de 
                          IP, timestamp, usuário responsável e dados modificados. Logs imutáveis armazenados em tabela 
                          separada. Facilita investigação de incidentes e compliance.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Segurança de Pagamentos */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Segurança de Pagamentos</h3>
                    <div className="space-y-3">
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">PCI DSS Compliance via Cielo</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Dados de cartão nunca armazenados no servidor. Processamento delegado completamente à Cielo 
                          (gateway PCI DSS Level 1 compliant). Apenas tokens de transação armazenados localmente. 
                          Comunicação HTTPS obrigatória para todas as transações.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Validação de Webhooks</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Webhooks da Cielo validados por assinatura digital. Verificação de origem das requisições. 
                          Proteção contra replay attacks com timestamps. Rejeição de webhooks malformados ou suspeitos.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Ambiente Isolado para Testes</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Ambiente sandbox da Cielo para testes sem uso de dados reais. Separação clara entre 
                          credenciais de produção e desenvolvimento. Impossível processar pagamentos reais em ambiente dev.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Boas Práticas */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Boas Práticas e Configurações</h3>
                    <div className="space-y-3">
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Trust Proxy Configuration</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Express configurado com trust proxy para ambientes Replit/EasyPanel. Captura correta de IP 
                          real do cliente através de proxies reversos. Essencial para rate limiting e logging precisos.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Variáveis de Ambiente</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Todas as credenciais e chaves secretas armazenadas em variáveis de ambiente (.env). 
                          Arquivo .env incluído em .gitignore para prevenir commit acidental. Validação de presença 
                          de variáveis críticas na inicialização do servidor.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Tratamento de Erros Seguro</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Erros de servidor nunca expõem detalhes internos para cliente. Mensagens genéricas em produção, 
                          detalhadas apenas em desenvolvimento. Stack traces e informações sensíveis logadas apenas no 
                          servidor. Respostas padronizadas para diferentes tipos de erro.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Atualizações de Dependências</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Dependências npm mantidas atualizadas para corrigir vulnerabilidades conhecidas. 
                          Uso de npm audit para identificar e corrigir issues de segurança. Versionamento semântico 
                          respeitado para evitar breaking changes.
                        </p>
                      </div>
                      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm p-3">
                        <p className="font-medium">Compressão de Respostas</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Middleware compression configurado para reduzir tamanho de respostas HTTP. 
                          Melhora performance e reduz consumo de banda. Compressão gzip/deflate automática 
                          para respostas maiores que 1KB.
                        </p>
                      </div>
                    </div>
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
