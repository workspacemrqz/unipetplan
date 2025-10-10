import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { SiteSettings } from "@shared/schema";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const defaultPrivacyPolicy = `
# Política de Privacidade

## 1. Identificação do Controlador

**UNIPET PLAN LTDA.**
CNPJ: 61.863.611/0001-58
Endereço: Av. Dom Severino, 1372, Fátima, Teresina-PI, CEP: 64049-370
Telefone: 8632327374
E-mail: contato@unipetplan.com.br

Esta Política de Privacidade foi elaborada em conformidade com a Lei Federal nº 13.709/2018 (Lei Geral de Proteção de Dados - LGPD) e demais normas aplicáveis sobre proteção de dados pessoais.

## 2. Definições

Para os fins desta Política, consideram-se:
- **Dados Pessoais:** informações relacionadas à pessoa natural identificada ou identificável;
- **Titular:** pessoa natural a quem se referem os dados pessoais objeto de tratamento;
- **Tratamento:** operação realizada com dados pessoais;
- **Controlador:** UNIPET PLAN, responsável pelas decisões referentes ao tratamento de dados pessoais.

## 3. Dados Pessoais Coletados

### 3.1 Dados Fornecidos pelo Titular
- Nome completo e documento de identidade
- CPF e dados de contato (telefone, e-mail, endereço)
- Informações do animal de estimação (nome, espécie, raça, idade, histórico de saúde)
- Dados bancários e financeiros para processamento de pagamentos
- Informações sobre preferências e necessidades específicas

### 3.2 Dados Coletados Automaticamente
- Endereço IP e dados de navegação
- Informações sobre dispositivo e navegador
- Cookies e tecnologias similares
- Logs de acesso e interação com a plataforma
- Dados de geolocalização (quando autorizado)

## 4. Finalidades do Tratamento e Base Legal

### 4.1 Finalidades
Os dados pessoais são tratados para:
- **Execução de contrato:** prestação de serviços de planos de saúde animal;
- **Interesse legítimo:** análise de risco, prevenção à fraude, atendimento ao cliente;
- **Consentimento:** envio de comunicações promocionais e marketing;
- **Cumprimento de obrigação legal:** atendimento a determinações legais e regulamentares;
- **Exercício regular de direitos:** defesa em processos judiciais e administrativos.

### 4.2 Base Legal
O tratamento fundamenta-se no art. 7º da LGPD, especialmente:
- Execução de contrato ou procedimentos preliminares;
- Cumprimento de obrigação legal ou regulatória;
- Interesse legítimo do controlador ou terceiro;
- Consentimento do titular.

## 5. Compartilhamento de Dados

### 5.1 Destinatários Autorizados
Os dados podem ser compartilhados com:
- **Rede credenciada:** clínicas e hospitais veterinários parceiros;
- **Prestadores de serviços:** empresas que auxiliam na operação dos serviços;
- **Autoridades públicas:** quando exigido por lei ou determinação judicial;
- **Parceiros comerciais:** mediante consentimento específico do titular.

### 5.2 Transferência Internacional
Eventuais transferências internacionais observarão as garantias da LGPD e regulamentações da ANPD.

## 6. Segurança e Proteção

### 6.1 Medidas Técnicas
- Criptografia de dados em trânsito e em repouso
- Controles de acesso baseados em perfis e necessidade
- Sistemas de backup e recuperação de dados
- Monitoramento contínuo de segurança
- Testes regulares de vulnerabilidade

### 6.2 Medidas Organizacionais
- Treinamento de colaboradores sobre proteção de dados
- Políticas internas de segurança da informação
- Contratos de confidencialidade
- Auditorias periódicas de conformidade

## 7. Retenção de Dados

Os dados pessoais serão mantidos pelo período necessário ao cumprimento das finalidades para as quais foram coletados, observando:
- **Dados contratuais:** durante a vigência do contrato e por 05 anos após seu término;
- **Dados de marketing:** até a revogação do consentimento;
- **Dados fiscais:** pelo prazo legal de 10 anos;
- **Dados de atendimento:** por 03 anos após o último contato.

## 8. Direitos do Titular

Conforme a LGPD, você possui os seguintes direitos:
- **Confirmação da existência** de tratamento de dados pessoais
- **Acesso aos dados** pessoais tratados
- **Correção de dados** incompletos, inexatos ou desatualizados
- **Anonimização, bloqueio ou eliminação** de dados desnecessários
- **Portabilidade dos dados** para outro fornecedor
- **Eliminação dos dados** tratados com consentimento
- **Informação sobre compartilhamento** dos dados
- **Revogação do consentimento** a qualquer momento

### 8.1 Exercício dos Direitos
Para exercer seus direitos, entre em contato através de:
- E-mail: contato@unipetplan.com.br
- Telefone: 8632327374
- WhatsApp: 8632327374
- Endereço: Av. Dom Severino, 1372, Fátima, Teresina-PI, CEP: 64049-370

## 9. Cookies e Tecnologias Similares

### 9.1 Tipos de Cookies
- **Essenciais:** necessários para o funcionamento do site
- **Funcionais:** melhoram a experiência do usuário
- **Analíticos:** fornecem estatísticas de uso
- **Publicitários:** personalizam anúncios e conteúdo

### 9.2 Gerenciamento
Você pode gerenciar suas preferências de cookies através das configurações do seu navegador.

## 10. Encarregado de Proteção de Dados

Para questões específicas sobre proteção de dados, entre em contato através dos nossos canais oficiais:
E-mail: contato@unipetplan.com.br

## 11. Alterações na Política

Esta Política poderá ser atualizada periodicamente. Alterações substanciais serão comunicadas com antecedência mínima de 30 dias através dos canais de contato cadastrados.

## 12. Autoridade Nacional de Proteção de Dados

Você possui o direito de apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD) caso considere que o tratamento de seus dados não está em conformidade com a legislação.

**Última atualização:** ${new Date().toLocaleDateString('pt-BR')}
`;

export default function PrivacyPolicy() {
  const { data: settings } = useQuery<SiteSettings>({
    queryKey: ["site-settings"],
    queryFn: async () => {
      return await apiRequest("GET", "/api/site-settings");
    },
  });

  const content = settings?.privacyPolicy || defaultPrivacyPolicy;

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
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button - Aligned with content text */}
          <div className="mb-4 pl-8">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium transition-colors bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200"
            >
              <ArrowLeft className="h-5 w-5" />
              Voltar ao Início
            </Link>
          </div>

          {/* Content */}
          <div className="rounded-lg shadow-sm border p-8" style={{ backgroundColor: 'var(--bg-cream-lighter)', borderColor: 'var(--border-gray)' }}>
            {formatContent(content)}
          </div>
        </div>
      </div>
    </div>
  );
}