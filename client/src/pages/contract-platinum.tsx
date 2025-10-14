import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const defaultContractText = `
# Contrato - Plano PLATINUM

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

O presente contrato tem por objeto a prestação de serviços de assistência médico-veterinária premium ao animal de estimação identificado no momento da contratação, através do **Plano PLATINUM**, que oferece cobertura completa e diferenciada para todos os cuidados veterinários.

### 2.1 Coberturas do Plano PLATINUM
- **Consultas veterinárias:** Ilimitadas com especialistas na rede credenciada
- **Exames laboratoriais completos:** Todos os tipos de exames laboratoriais
- **Exames de imagem avançados:** Raio-X, ultrassonografia, tomografia, ressonância magnética
- **Vacinas completas:** Todo calendário vacinal nacional e internacional
- **Procedimentos especializados:** Endoscopia, artroscopia, ecocardiograma
- **Internação:** Ilimitada conforme necessidade médica
- **Cirurgias complexas:** Ortopédicas, neurológicas, oncológicas, cardíacas
- **UTI veterinária:** Cobertura integral quando necessário
- **Fisioterapia e reabilitação:** Sessões ilimitadas com prescrição
- **Atendimento emergencial VIP:** 24 horas com atendimento prioritário e ambulância

## 3. Vigência e Renovação

### 3.1 Início da Vigência
O contrato entra em vigor imediatamente após assinatura e confirmação do pagamento, com carências reduzidas para beneficiários platinum.

### 3.2 Prazo Contratual
O contrato tem prazo indeterminado, com renovação automática e benefícios de fidelidade progressivos.

### 3.3 Períodos de Carência Reduzidos
- **Consultas:** Sem carência
- **Exames:** 15 dias
- **Procedimentos ambulatoriais:** 15 dias
- **Cirurgias simples:** 30 dias
- **Cirurgias complexas:** 60 dias
- **Procedimentos de alta complexidade:** 90 dias

## 4. Valores e Forma de Pagamento

### 4.1 Investimento Mensal
O valor do Plano PLATINUM reflete o nível premium de cobertura oferecido, com reajuste anual limitado ao IGPM ou índice substituto.

### 4.2 Modalidades de Pagamento Exclusivas
- **Mensal:** Com desconto por fidelidade após 12 meses
- **Anual:** Desconto especial de 15% no pagamento à vista
- **Parcelamento:** Em até 12x sem juros no cartão

### 4.3 Formas de Pagamento
- Cartão de crédito premium (bandeiras selecionadas)
- PIX com confirmação instantânea
- Transferência bancária
- Débito automático com benefícios

## 5. Obrigações do Contratante

### 5.1 Deveres Premium
- Manter cadastro atualizado através do app exclusivo
- Honrar pagamentos nas datas estabelecidas
- Utilizar preferencialmente a rede premium credenciada
- Apresentar documentação digital do pet
- Comunicar eventos relevantes em até 24 horas
- Participar dos programas de prevenção oferecidos

### 5.2 Uso Consciente e Exclusivo
- Benefício intransferível e personalizado
- Seguir protocolos médicos recomendados
- Utilizar canais VIP de autorização
- Comparecer às consultas preventivas programadas

## 6. Obrigações da Contratada

### 6.1 Prestação de Serviços Premium
- Garantir atendimento VIP em toda rede credenciada
- Manter rede de especialistas e centros de referência
- Autorização expressa em até 2 horas para emergências
- Concierge veterinário 24/7
- Cartão platinum digital e físico personalizado
- App exclusivo com funcionalidades avançadas
- Relatórios mensais de saúde do pet

### 6.2 Excelência e Garantias
- Padrão internacional de qualidade
- Auditoria contínua da rede credenciada
- Segunda e terceira opinião médica incluída
- Telemedicina veterinária ilimitada
- Suporte internacional para viagens

## 7. Exclusões de Cobertura

### 7.1 Exclusões Mínimas
- Doenças preexistentes graves não declaradas (com período de observação)
- Procedimentos puramente estéticos
- Competições esportivas profissionais
- Clonagem ou procedimentos experimentais não aprovados

*Nota: O Plano PLATINUM possui as menores exclusões do mercado, com análise caso a caso para situações especiais.*

## 8. Rescisão Contratual

### 8.1 Flexibilidade Premium
- Rescisão sem multa a qualquer momento após 3 meses
- Portabilidade de carências para outros planos UNIPET
- Reembolso proporcional em casos especiais

### 8.2 Proteção ao Cliente
- Notificação prévia de 60 dias para inadimplência
- Plano de recuperação personalizado
- Manutenção de emergências durante negociação

## 9. Coparticipação

O Plano PLATINUM possui coparticipação máxima de 10% apenas em procedimentos estéticos eletivos, com teto anual estabelecido.

## 10. Benefícios Exclusivos PLATINUM

### 10.1 Programa Saúde Total
- Check-up completo semestral
- Perfil genético do pet
- Nutricionista veterinário dedicado
- Personal trainer canino/felino
- Spa e bem-estar mensal

### 10.2 Serviços Concierge
- Transporte pet executivo
- Hotel pet 5 estrelas (7 diárias/ano)
- Grooming premium mensal
- Kit farmácia personalizado
- Desconto 30% em produtos premium

### 10.3 Cobertura Internacional
- Atendimento em viagens internacionais
- Seguro viagem pet incluído
- Documentação sanitária internacional

## 11. Programa de Fidelidade

### 11.1 Benefícios Progressivos
- 12 meses: Upgrade para quarto privativo em internações
- 24 meses: Exames preventivos extras sem custo
- 36 meses: Status Platinum Lifetime com benefícios vitalícios

## 12. Disposições Gerais

### 12.1 Comunicação VIP
- Canais exclusivos de atendimento
- Gerente de relacionamento dedicado
- Comunicações prioritárias via app premium

### 12.2 Alterações e Melhorias
- Cliente PLATINUM tem prioridade em novos benefícios
- Participação em programa beta de novos serviços
- Voto consultivo em melhorias do plano

## 13. Atendimento PLATINUM

### Concierge 24/7
- Linha exclusiva: 8632327374 (Opção Platinum)
- WhatsApp Business VIP: 8632327374
- E-mail prioritário: platinum@unipetplan.com.br
- Video chamada com especialistas
- Atendimento em português, inglês e espanhol

### Gerente de Relacionamento
- Contato direto com gerente dedicado
- Reuniões trimestrais de acompanhamento
- Relatórios personalizados de saúde

## 14. Foro

Fica eleito o foro da comarca de domicílio do contratante, com opção de arbitragem para resolução expressa de conflitos.

**Última atualização:** ${new Date().toLocaleDateString('pt-BR')}
`;

interface PlanContract {
  contractText?: string;
}

export default function ContractPlatinum() {
  const { data: contractData } = useQuery<PlanContract>({
    queryKey: ["plan-contract", "PLATINUM"],
    queryFn: async () => {
      return await apiRequest("GET", "/api/plans/PLATINUM/contract");
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
        if (line.startsWith('*') && line.endsWith('*') && !line.startsWith('**')) {
          return <p key={index} className="italic mb-4" style={{ color: 'var(--text-dark-secondary)' }}>{line.substring(1, line.length - 1)}</p>;
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
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all hover:gap-3"
              style={{ 
                color: 'var(--text-dark-primary)',
                backgroundColor: 'var(--bg-cream)'
              }}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Voltar ao Início</span>
            </Link>
          </div>

          {/* Content Container with proper padding */}
          <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12">
            {formatContent(content)}
          </div>
        </div>
      </div>
    </div>
  );
}