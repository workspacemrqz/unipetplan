import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const defaultContractText = `
# Contrato - Plano COMFORT

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

O presente contrato tem por objeto a prestação de serviços de assistência médico-veterinária ao animal de estimação identificado no momento da contratação, através do **Plano COMFORT**, que oferece cobertura ampliada para cuidados veterinários completos e especializados.

### 2.1 Coberturas do Plano COMFORT
- **Consultas veterinárias:** Ilimitadas na rede credenciada
- **Exames laboratoriais:** Hemograma completo, bioquímico, urina, fezes e parasitológico
- **Exames de imagem:** Raio-X simples e ultrassonografia
- **Vacinas completas:** Todo calendário vacinal, incluindo vacinas importadas
- **Procedimentos ambulatoriais:** Suturas, drenagens, cauterizações
- **Internação:** Até 5 dias por ano
- **Cirurgias simples:** Castração, limpeza dentária, pequenos tumores
- **Atendimento emergencial:** 24 horas com prioridade

## 3. Vigência e Renovação

### 3.1 Início da Vigência
O contrato entra em vigor na data de assinatura e confirmação do pagamento da primeira mensalidade, respeitados os períodos de carência estabelecidos.

### 3.2 Prazo Contratual
O contrato tem prazo indeterminado, com renovação automática mensal ou anual, conforme modalidade escolhida pelo contratante.

### 3.3 Períodos de Carência
- **Consultas:** Sem carência
- **Exames laboratoriais:** 30 dias
- **Exames de imagem:** 60 dias
- **Procedimentos ambulatoriais:** 30 dias
- **Cirurgias:** 90 dias
- **Internação:** 60 dias

## 4. Valores e Forma de Pagamento

### 4.1 Mensalidade
O valor mensal do Plano COMFORT será informado no momento da contratação, podendo sofrer reajuste anual conforme variação do IGPM ou outro índice que venha a substituí-lo.

### 4.2 Modalidades de Pagamento
- **Mensal:** Pagamento todo dia do vencimento escolhido
- **Anual:** Pagamento à vista com desconto especial ou parcelado em até 12x

### 4.3 Formas de Pagamento
- Cartão de crédito
- PIX
- Boleto bancário
- Débito automático

## 5. Obrigações do Contratante

### 5.1 Deveres Gerais
- Manter os dados cadastrais atualizados
- Efetuar o pagamento das mensalidades nas datas acordadas
- Utilizar os serviços exclusivamente na rede credenciada
- Apresentar documentação do pet quando solicitado
- Comunicar imediatamente o óbito do animal
- Solicitar autorização prévia para procedimentos especializados

### 5.2 Uso Adequado
- Não ceder ou emprestar o benefício a terceiros
- Seguir as orientações veterinárias
- Respeitar os procedimentos de autorização prévia
- Comparecer às consultas agendadas

## 6. Obrigações da Contratada

### 6.1 Prestação de Serviços
- Garantir atendimento prioritário na rede credenciada
- Manter rede credenciada ampla e qualificada
- Autorizar procedimentos cobertos em até 24 horas
- Disponibilizar canais de atendimento ao cliente
- Fornecer carteirinha de identificação do pet
- Disponibilizar aplicativo para gestão do plano

### 6.2 Qualidade e Garantia
- Zelar pela excelência dos serviços prestados
- Fiscalizar e auditar a rede credenciada
- Substituir prestadores que não atendam aos padrões
- Garantir segunda opinião médica quando solicitado

## 7. Exclusões de Cobertura

### 7.1 Não Estão Cobertos
- Doenças preexistentes não declaradas
- Procedimentos estéticos sem indicação médica
- Medicamentos para uso domiciliar (exceto emergenciais)
- Rações terapêuticas e suplementos
- Produtos de higiene e beleza
- Hospedagem sem indicação médica
- Transporte do animal (exceto ambulância em emergências)
- Procedimentos experimentais
- Tratamentos alternativos não reconhecidos

## 8. Rescisão Contratual

### 8.1 Por Iniciativa do Contratante
O contrato poderá ser rescindido a qualquer momento, mediante comunicação com 30 dias de antecedência, sem multa após 6 meses de contrato.

### 8.2 Por Iniciativa da Contratada
- Inadimplência superior a 45 dias
- Fraude ou má-fé comprovada
- Uso indevido dos benefícios
- Prestação de informações falsas
- Agressão a profissionais da rede credenciada

## 9. Coparticipação

Alguns procedimentos especializados podem exigir coparticipação de até 20% do valor, conforme tabela vigente disponível no site e aplicativo.

## 10. Benefícios Adicionais

### 10.1 Programa de Prevenção
- Check-up anual completo
- Orientação nutricional
- Programa de controle de peso
- Acompanhamento geriátrico

### 10.2 Serviços Extras
- Desconto em pet shop parceiros
- Orientação veterinária por telefone
- Agendamento online prioritário

## 11. Disposições Gerais

### 11.1 Comunicações
Todas as comunicações serão consideradas válidas quando enviadas para os endereços informados no cadastro ou através do aplicativo.

### 11.2 Alterações Contratuais
Alterações nas condições contratuais serão comunicadas com 30 dias de antecedência através de todos os canais disponíveis.

### 11.3 Legislação Aplicável
Este contrato é regido pelas leis brasileiras, especialmente o Código de Defesa do Consumidor e regulamentações do setor.

## 12. Atendimento ao Cliente

### Central de Relacionamento
- Telefone: 8632327374
- WhatsApp: 8632327374
- E-mail: contato@unipetplan.com.br
- Chat online: disponível no site e aplicativo
- Horário: Segunda a sexta, das 8h às 20h | Sábados das 8h às 14h

### Atendimento de Emergência
- Disponível 24 horas, 7 dias por semana
- Linha direta: 8632327374
- Através da rede credenciada com prioridade

## 13. Foro

Fica eleito o foro da comarca de domicílio do contratante para dirimir quaisquer questões oriundas deste contrato.

**Última atualização:** ${new Date().toLocaleDateString('pt-BR')}
`;

interface PlanContract {
  contractText?: string;
}

export default function ContractComfort() {
  const { data: contractData } = useQuery<PlanContract>({
    queryKey: ["plan-contract", "COMFORT"],
    queryFn: async () => {
      return await apiRequest("GET", "/api/plans/COMFORT/contract");
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