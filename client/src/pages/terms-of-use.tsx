import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { SiteSettings } from "@shared/schema";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const defaultTermsOfUse = `
# Termos de Uso

## 1. Identificação da Prestadora

**UNIPET PLAN LTDA.**
CNPJ: 61.863.611/0001-58
Endereço: Av. Dom Severino, 1372, Fátima, Teresina-PI, CEP: 64049-370
Telefone: 8632327374
E-mail: contato@unipetplan.com.br
Horário de Funcionamento: Segunda a sexta: 8h às 18h | Sábado: 8h às 12h

## 2. Aceitação dos Termos

Ao acessar, navegar ou utilizar qualquer serviço disponibilizado pela UNIPET PLAN, o USUÁRIO declara ter lido, compreendido e aceito integralmente estes Termos de Uso, bem como nossa Política de Privacidade, comprometendo-se ao seu cumprimento.

A não concordância com qualquer disposição destes termos implica na vedação do uso dos serviços oferecidos.

## 3. Definições

Para os fins deste instrumento, considera-se:
- **Prestadora:** UNIPET PLAN LTDA.;
- **Usuário:** pessoa física que acessa a plataforma;
- **Contratante:** pessoa física que celebra contrato de plano de saúde animal;
- **Beneficiário:** animal de estimação coberto pelo plano;
- **Rede Credenciada:** profissionais e estabelecimentos veterinários conveniados;
- **Plataforma:** website, aplicativo e demais canais digitais da Prestadora.

## 4. Objeto e Descrição dos Serviços

### 4.1 Serviços Oferecidos
A UNIPET PLAN oferece planos de saúde para animais de estimação, proporcionando:
- Acesso à rede credenciada de clínicas e hospitais veterinários;
- Cobertura de procedimentos conforme modalidade contratada;
- Atendimento 24 horas para emergências;
- Serviços de telemedicina veterinária;
- Programas de bem-estar e prevenção.

### 4.2 Modalidades de Planos
Os planos são oferecidos em diferentes modalidades, com coberturas específicas detalhadas no contrato individual de cada Contratante.

## 5. Condições de Elegibilidade

### 5.1 Do Contratante
Para contratar os serviços, o interessado deve:
- Ter capacidade civil plena (maior de 18 anos) ou estar representado/assistido;
- Fornecer informações verdadeiras, atuais e completas;
- Possuir CPF regularizado junto à Receita Federal;
- Ser proprietário ou responsável legal pelo animal beneficiário;
- Residir em área de cobertura da rede credenciada.

### 5.2 Do Animal Beneficiário
O animal deve:
- Ter idade compatível com a modalidade do plano escolhida;
- Estar em condições de saúde que permitam a contratação;
- Possuir documentação veterinária adequada quando exigível;
- Submeter-se a período de carência conforme regulamentação.

## 6. Processo de Contratação

### 6.1 Solicitação de Cotação
O interessado pode solicitar cotação através dos canais disponíveis, fornecendo informações sobre:
- Dados pessoais do contratante;
- Características do animal (espécie, raça, idade, histórico);
- Modalidade de plano desejada;
- Localização geográfica.

### 6.2 Análise e Aprovação
A contratação está sujeita à análise de risco e pode ser:
- Aprovada integralmente;
- Aprovada com restrições ou coparticipação;
- Recusada conforme critérios técnicos e atuariais.

### 6.3 Documentação Necessária
Para formalização do contrato, podem ser exigidos:
- Documento de identidade e CPF do contratante;
- Comprovante de residência;
- Carteira de vacinação do animal;
- Atestado de saúde veterinário;
- Outros documentos conforme modalidade escolhida.

## 7. Obrigações das Partes

### 7.1 Obrigações da UNIPET PLAN
- Disponibilizar rede credenciada adequada;
- Garantir cobertura conforme contrato;
- Manter sistema de atendimento eficiente;
- Processar reembolsos nos prazos estabelecidos;
- Prestar informações claras sobre serviços e coberturas.

### 7.2 Obrigações do Contratante
- Efetuar pagamento das mensalidades na data de vencimento;
- Manter dados atualizados;
- Utilizar os serviços conforme termos contratuais;
- Cumprir orientações da rede credenciada;
- Comunicar sinistros dentro dos prazos estabelecidos.

## 8. Condições Financeiras

### 8.1 Mensalidades
- O valor da mensalidade é definido conforme modalidade do plano;
- Pagamento deve ser realizado até a data de vencimento;
- Atraso superior a 60 dias implica suspensão automática;
- Inadimplência por mais de 90 dias resulta em cancelamento.

### 8.2 Reajustes
- Reajustes anuais seguem regulamentação específica do setor;
- Alterações serão comunicadas com antecedência mínima de 60 dias;
- Mudança de faixa etária pode implicar revisão de valores.

### 8.3 Coparticipação
Alguns procedimentos podem incluir coparticipação do contratante, conforme:
- Percentual definido em contrato;
- Valor comunicado no momento do atendimento;
- Cobrança direta ao usuário no estabelecimento credenciado.

## 9. Carências e Coberturas

### 9.1 Períodos de Carência
- Consultas: sem carência;
- Exames simples: 30 dias;
- Cirurgias eletivas: 120 dias;
- Emergências: 24 horas;
- Condições pré-existentes: conforme análise médica.

### 9.2 Exclusões de Cobertura
Não estão cobertos:
- Procedimentos estéticos;
- Reprodução assistida;
- Tratamentos experimentais;
- Condições pré-existentes não declaradas;
- Outras exclusões específicas do contrato.

## 10. Uso da Plataforma Digital

### 10.1 Criação de Conta
O usuário compromete-se a:
- Fornecer informações verdadeiras e atualizadas;
- Manter confidencialidade de suas credenciais de acesso;
- Notificar imediatamente sobre uso não autorizado;
- Não compartilhar sua conta com terceiros.

### 10.2 Conduta Permitida
É vedado utilizar a plataforma para:
- Atividades ilícitas ou fraudulentas;
- Transmissão de conteúdo ofensivo ou inadequado;
- Tentativas de acesso não autorizado;
- Interferência no funcionamento do sistema.

## 11. Propriedade Intelectual

### 11.1 Direitos da UNIPET PLAN
Todo conteúdo da plataforma, incluindo:
- Marca, logotipos e identidade visual;
- Textos, imagens e vídeos;
- Software e funcionalidades;
- Banco de dados e informações;

São de propriedade exclusiva da UNIPET PLAN, protegidos por direitos autorais e propriedade intelectual.

### 11.2 Uso Autorizado
O usuário pode acessar o conteúdo exclusivamente para:
- Utilização pessoal dos serviços contratados;
- Consulta de informações relevantes ao seu plano;
- Comunicação com a rede credenciada.

## 12. Proteção de Dados

O tratamento de dados pessoais observa nossa Política de Privacidade e a Lei Geral de Proteção de Dados (LGPD), garantindo:
- Transparência no uso de informações;
- Segurança no armazenamento de dados;
- Respeito aos direitos dos titulares;
- Finalidades específicas e legítimas.

## 13. Responsabilidades e Limitações

### 13.1 Responsabilidade da Rede Credenciada
- Profissionais credenciados atuam com autonomia técnica;
- UNIPET PLAN não se responsabiliza por atos profissionais específicos;
- Qualidade do atendimento é de responsabilidade do prestador;
- Reclamações devem ser direcionadas aos órgãos competentes.

### 13.2 Limitações de Responsabilidade
A UNIPET PLAN não se responsabiliza por:
- Danos causados por caso fortuito ou força maior;
- Interrupções de serviço por manutenção programada;
- Atos de terceiros não controlados pela empresa;
- Decisões técnicas dos profissionais credenciados;
- Lucros cessantes ou danos indiretos.

### 13.3 Excludentes de Responsabilidade
Não há responsabilidade nos casos de:
- Informações falsas fornecidas pelo contratante;
- Não cumprimento das orientações médicas;
- Utilização inadequada dos serviços;
- Violação destes termos de uso.

## 14. Rescisão e Cancelamento

### 14.1 Por Iniciativa do Contratante
- Cancelamento pode ser solicitado a qualquer momento;
- Deve ser formalizado através dos canais oficiais;
- Direito de arrependimento conforme Código de Defesa do Consumidor;
- Eventual reembolso seguirá critérios contratuais.

### 14.2 Por Iniciativa da UNIPET PLAN
O contrato pode ser rescindido por:
- Inadimplência superior a 90 dias;
- Violação grave dos termos contratuais;
- Fraude ou informações falsas;
- Conduta inadequada na utilização dos serviços.

### 14.3 Efeitos da Rescisão
- Cessação imediata da cobertura;
- Quitação de débitos pendentes;
- Devolução de documentos quando aplicável;
- Exclusão de dados conforme política de privacidade.

## 15. Reclamações e Atendimento

### 15.1 Canais de Atendimento
- Telefone: 8632327374
- E-mail: contato@unipetplan.com.br
- WhatsApp: 8632327374
- Endereço: Av. Dom Severino, 1372, Fátima, Teresina-PI, CEP: 64049-370
- Horário de Funcionamento: Segunda a sexta: 8h às 18h | Sábado: 8h às 12h

### 15.2 Reclamações
Para reclamações não resolvidas pelos canais convencionais, utilize nossos canais oficiais:
- E-mail: contato@unipetplan.com.br
- Prazo de resposta: até 10 dias úteis

### 15.3 Órgãos Externos
O contratante pode recorrer a:
- Procon local
- Agência Nacional de Saúde Suplementar (ANS)
- Poder Judiciário

## 16. Alterações dos Termos

### 16.1 Modificações
A UNIPET PLAN reserva-se o direito de alterar estes termos mediante:
- Comunicação prévia de 30 dias para alterações substanciais;
- Publicação no website oficial;
- Notificação através dos canais de contato cadastrados.

### 16.2 Aceitação das Alterações
O uso continuado dos serviços após as modificações implica aceitação tácita dos novos termos.

## 17. Disposições Gerais

### 17.1 Lei Aplicável e Foro
Este contrato é regido pelas leis brasileiras, especialmente:
- Lei nº 8.078/90 (Código de Defesa do Consumidor);
- Lei nº 13.709/18 (Lei Geral de Proteção de Dados);
- Lei nº 10.406/02 (Código Civil);
- Regulamentações específicas do setor.

### 17.2 Foro Competente
Fica eleito o foro da Comarca de Teresina, Estado do Piauí, para dirimir quaisquer controvérsias decorrentes deste instrumento, renunciando as partes a qualquer outro, por mais privilegiado que seja.

### 17.3 Validade das Cláusulas
A eventual nulidade ou inaplicabilidade de qualquer disposição não afetará a validade e eficácia das demais cláusulas.

### 17.4 Comunicações
Todas as comunicações serão consideradas válidas quando enviadas para os endereços cadastrados na plataforma ou constantes deste instrumento.

**Última atualização:** ${new Date().toLocaleDateString('pt-BR')}
`;

export default function TermsOfUse() {
  const { data: settings } = useQuery<SiteSettings>({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/site-settings");
      return await res.json();
    },
  });

  const content = settings?.termsOfUse || defaultTermsOfUse;

  // Convert markdown-like content to HTML
  const formatContent = (text: string) => {
    const formatInlineText = (text: string) => {
      // Process **bold text** within lines
      const parts = text.split(/\*\*(.*?)\*\*/g);
      return parts.map((part, i) => 
        i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
      );
    };

    return text
      .split('\n')
      .map((line, index) => {
        if (line.startsWith('# ')) {
          return <h1 key={index} className="text-3xl font-bold mb-6" style={{ color: 'var(--text-dark-primary)' }}>{line.substring(2)}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={index} className="text-2xl font-semibold mb-4 mt-8" style={{ color: 'var(--text-dark-primary)' }}>{line.substring(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={index} className="text-xl font-medium mb-3 mt-6" style={{ color: 'var(--text-dark-primary)' }}>{line.substring(4)}</h3>;
        }
        if (line.startsWith('- ')) {
          const content = line.substring(2);
          return <li key={index} className="mb-2 ml-4" style={{ color: 'var(--text-dark-secondary)' }}>{formatInlineText(content)}</li>;
        }
        if (line.startsWith('**') && line.endsWith('**') && line.split('**').length === 3) {
          return <p key={index} className="font-semibold mb-4" style={{ color: 'var(--text-dark-secondary)' }}>{line.substring(2, line.length - 2)}</p>;
        }
        if (line.trim() === '') {
          return <br key={index} />;
        }
        return <p key={index} className="mb-4 leading-relaxed" style={{ color: 'var(--text-dark-secondary)' }}>{formatInlineText(line)}</p>;
      });
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-cream-light)' }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center transition-colors" style={{ color: 'var(--text-teal)' }}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Início
          </Link>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto">
          <div className="rounded-lg shadow-sm border p-8" style={{ backgroundColor: 'var(--bg-cream-lighter)', borderColor: 'var(--border-gray)' }}>
            {formatContent(content)}
          </div>
        </div>
      </div>
    </div>
  );
}