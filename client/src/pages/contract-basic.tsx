import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const defaultContractText = `
# Contrato - Plano BASIC

## 1. Identificação das Partes

### Contratante
Nome completo conforme documento de identidade
CPF do titular do plano
Endereço completo de correspondência
Telefone e e-mail para contato

### Contratada
**UNIPET PLAN LTDA.**
CNPJ: 61.863.611/0001-58
Endereço: Av. Dom Severino, 1372, Fátima, Teresina-PI, CEP: 64049-370
Telefone: 8632327374
E-mail: contato@unipetplan.com.br

## 2. Objeto do Contrato

O presente contrato tem por objeto a prestação de serviços de assistência médico-veterinária ao animal de estimação identificado no momento da contratação, através do **Plano BASIC**, que oferece cobertura essencial para cuidados veterinários preventivos e emergenciais.

### 2.1 Coberturas do Plano BASIC
- **Consultas veterinárias:** Ilimitadas na rede credenciada
- **Exames básicos:** Hemograma, urina e fezes
- **Vacinas essenciais:** Conforme calendário veterinário
- **Procedimentos simples:** Curativos, medicação oral e injetável
- **Atendimento emergencial:** 24 horas na rede credenciada

## 3. Vigência e Renovação

### 3.1 Início da Vigência
O contrato entra em vigor na data de assinatura e confirmação do pagamento da primeira mensalidade, respeitados os períodos de carência estabelecidos.

### 3.2 Prazo Contratual
O contrato tem prazo indeterminado, com renovação automática mensal ou anual, conforme modalidade escolhida pelo contratante.

### 3.3 Períodos de Carência
- **Consultas:** Sem carência
- **Exames básicos:** 30 dias
- **Procedimentos simples:** 30 dias
- **Vacinas:** 60 dias

## 4. Valores e Forma de Pagamento

### 4.1 Mensalidade
O valor mensal do Plano BASIC será informado no momento da contratação, podendo sofrer reajuste anual conforme variação do IGPM ou outro índice que venha a substituí-lo.

### 4.2 Modalidades de Pagamento
- **Mensal:** Pagamento todo dia do vencimento escolhido
- **Anual:** Pagamento à vista com desconto ou parcelado em até 12x

### 4.3 Formas de Pagamento
- Cartão de crédito
- PIX
- Boleto bancário

## 5. Obrigações do Contratante

### 5.1 Deveres Gerais
- Manter os dados cadastrais atualizados
- Efetuar o pagamento das mensalidades nas datas acordadas
- Utilizar os serviços exclusivamente na rede credenciada
- Apresentar documentação do pet quando solicitado
- Comunicar imediatamente o óbito do animal

### 5.2 Uso Adequado
- Não ceder ou emprestar o benefício a terceiros
- Seguir as orientações veterinárias
- Respeitar os procedimentos de autorização prévia quando aplicável

## 6. Obrigações da Contratada

### 6.1 Prestação de Serviços
- Garantir atendimento na rede credenciada
- Manter rede credenciada suficiente e qualificada
- Autorizar procedimentos cobertos em até 48 horas
- Disponibilizar canais de atendimento ao cliente
- Fornecer carteirinha de identificação do pet

### 6.2 Qualidade e Garantia
- Zelar pela qualidade dos serviços prestados
- Fiscalizar a rede credenciada
- Substituir prestadores que não atendam aos padrões de qualidade

## 7. Exclusões de Cobertura

### 7.1 Não Estão Cobertos
- Doenças preexistentes não declaradas
- Procedimentos estéticos
- Medicamentos para uso domiciliar
- Rações e suplementos alimentares
- Produtos de higiene e beleza
- Hospedagem sem indicação médica
- Transporte do animal
- Procedimentos experimentais

## 8. Rescisão Contratual

### 8.1 Por Iniciativa do Contratante
O contrato poderá ser rescindido a qualquer momento, mediante comunicação com 30 dias de antecedência, sem multa após 12 meses de contrato.

### 8.2 Por Iniciativa da Contratada
- Inadimplência superior a 60 dias
- Fraude ou má-fé comprovada
- Uso indevido dos benefícios
- Prestação de informações falsas

## 9. Coparticipação

Alguns procedimentos podem exigir coparticipação de até 30% do valor, conforme tabela vigente disponível no site.

## 10. Disposições Gerais

### 10.1 Comunicações
Todas as comunicações serão consideradas válidas quando enviadas para os endereços informados no cadastro.

### 10.2 Alterações Contratuais
Alterações nas condições contratuais serão comunicadas com 30 dias de antecedência.

### 10.3 Legislação Aplicável
Este contrato é regido pelas leis brasileiras, especialmente o Código de Defesa do Consumidor.

## 11. Atendimento ao Cliente

### Central de Relacionamento
- Telefone: 8632327374
- WhatsApp: 8632327374
- E-mail: contato@unipetplan.com.br
- Horário: Segunda a sexta, das 8h às 18h

### Atendimento de Emergência
- Disponível 24 horas, 7 dias por semana
- Através da rede credenciada

## 12. Foro

Fica eleito o foro da comarca de domicílio do contratante para dirimir quaisquer questões oriundas deste contrato.

**Última atualização:** ${new Date().toLocaleDateString('pt-BR')}
`;

interface PlanContract {
  contractText?: string;
}

export default function ContractBasic() {
  const { data: contractData } = useQuery<PlanContract>({
    queryKey: ["plan-contract", "BASIC"],
    queryFn: async () => {
      return await apiRequest("GET", "/api/plans/BASIC/contract");
    },
  });

  const content = contractData?.contractText || defaultContractText;

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
          {/* Back Button - Aligned to left edge on desktop */}
          <div className="mb-4">
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