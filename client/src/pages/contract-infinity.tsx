import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const defaultContractText = `
# Contrato - Plano INFINITY

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

O presente contrato tem por objeto a prestação de serviços de assistência médico-veterinária ilimitada e sem restrições ao animal de estimação identificado no momento da contratação, através do **Plano INFINITY**, o mais completo e exclusivo plano de saúde pet do mercado.

### 2.1 Coberturas do Plano INFINITY - Sem Limites
- **Consultas veterinárias:** Ilimitadas com qualquer especialista, incluindo home care
- **Todos os exames existentes:** Laboratoriais, imagem, genéticos, sem qualquer restrição
- **Tecnologia de ponta:** Acesso a todos os equipamentos e tecnologias disponíveis
- **Vacinas globais:** Todas as vacinas disponíveis no mundo
- **Cirurgias sem limites:** Qualquer procedimento cirúrgico sem restrição de valor
- **UTI e internação:** Tempo ilimitado conforme necessidade
- **Tratamentos especializados:** Oncologia, neurologia, cardiologia, oftalmologia, dermatologia
- **Terapias avançadas:** Células-tronco, acupuntura, ozonioterapia, quimioterapia
- **Reabilitação completa:** Fisioterapia, hidroterapia, laserterapia sem limites
- **Medicina preventiva personalizada:** Programa exclusivo de longevidade
- **Cobertura mundial:** Atendimento em qualquer país

## 3. Vigência e Renovação

### 3.1 Início Imediato
Cobertura total iniciada no momento da assinatura, sem qualquer período de carência.

### 3.2 Contrato Vitalício
Opção de contrato vitalício com valor fixo, protegido contra reajustes por idade.

### 3.3 Sem Carências
- **Todas as coberturas:** Disponíveis imediatamente
- **Doenças preexistentes:** Cobertas após avaliação médica inicial
- **Emergências:** Cobertura total desde o primeiro segundo

## 4. Valores e Forma de Pagamento

### 4.1 Investimento Premium Infinity
Valor compatível com a cobertura ilimitada oferecida, com possibilidade de congelamento por fidelidade.

### 4.2 Modalidades Exclusivas INFINITY
- **Mensal VIP:** Com cashback de 5% após 24 meses
- **Anual Diamond:** 20% de desconto + benefícios extras
- **Vitalício:** Pagamento único com cobertura lifetime
- **Família INFINITY:** Desconto progressivo para múltiplos pets

### 4.3 Formas de Pagamento Premium
- Cartões Black e Infinite com benefícios especiais
- PIX com confirmação instantânea e bônus
- Transferência com gerente dedicado
- Criptomoedas aceitas

## 5. Obrigações do Contratante

### 5.1 Compromissos INFINITY
- Manter dados atualizados via app premium ou concierge
- Honrar investimento conforme modalidade escolhida
- Participar do programa de saúde preventiva personalizado
- Comunicar viagens internacionais para cobertura global

### 5.2 Parceria na Saúde
- Colaborar com o programa de longevidade do pet
- Permitir monitoramento de saúde via dispositivos IoT fornecidos
- Participar das avaliações trimestrais de bem-estar

## 6. Obrigações da Contratada

### 6.1 Serviços INFINITY Ilimitados
- Cobertura total sem questionamentos ou limitações
- Rede global de atendimento premium
- Autorização instantânea via IA para qualquer procedimento
- Concierge médico veterinário pessoal 24/7/365
- Transporte aéreo para tratamentos especializados
- Second opinion com especialistas internacionais
- Prontuário digital com blockchain
- Tradutor veterinário em 15 idiomas

### 6.2 Tecnologia e Inovação
- Acesso prioritário a tratamentos experimentais aprovados
- Participação em pesquisas de ponta
- Dispositivos de monitoramento health-tech inclusos
- App com IA preditiva de saúde
- Realidade virtual para consultas remotas

## 7. Sem Exclusões

O Plano INFINITY não possui exclusões. Toda e qualquer necessidade médica veterinária está coberta, incluindo:
- Tratamentos experimentais com aprovação científica
- Procedimentos estéticos com ou sem indicação médica
- Medicina regenerativa e antienvelhecimento
- Terapias alternativas e holísticas
- Qualquer medicamento ou suplemento prescrito

## 8. Flexibilidade Total

### 8.1 Liberdade INFINITY
- Suspensão temporária do plano em viagens longas (com manutenção de emergências)
- Transferência de titularidade sem burocracia
- Upgrade/downgrade sem carências
- Cancelamento com reembolso proporcional integral

### 8.2 Proteção Vitalícia
- Impossibilidade de cancelamento por sinistralidade
- Proteção contra reajustes abusivos
- Garantia de atendimento vitalício

## 9. Sem Coparticipação

O Plano INFINITY não possui qualquer tipo de coparticipação. 100% dos custos são cobertos pelo plano.

## 10. Experiência INFINITY

### 10.1 Lifestyle Pet Premium
- Personal pet concierge 24/7
- Chef veterinário para dietas especiais
- Spa semanal completo
- Personal trainer especializado
- Psicólogo animal
- Musicoterapia e aromaterapia
- Passeador profissional diário
- Hotel 7 estrelas ilimitado

### 10.2 Tecnologia Exclusiva
- Coleira inteligente com monitoramento vital
- Câmeras de monitoramento residencial
- Comedouro inteligente com IA
- App de comunicação pet-tutor
- Tradução de latidos/miados via IA

### 10.3 Benefícios Família
- Cobertura para toda ninhada (filhotes)
- Seguro vida pet incluído
- Cremação VIP e memorial digital
- Suporte psicológico para a família
- Programa de adoção responsável

## 11. Programa INFINITY Rewards

### 11.1 Benefícios Acumulativos
- Milhas aéreas por cada consulta
- Cashback em todos os procedimentos
- Pontos conversíveis em produtos premium
- Acesso a eventos exclusivos pet
- Viagens anuais pet-friendly

### 11.2 Status INFINITY
- Black: Após 6 meses
- Diamond: Após 12 meses  
- Royal: Após 24 meses
- Imperial: Após 36 meses (benefícios perpétuos)

## 12. Governança e Transparência

### 12.1 Conselho INFINITY
- Participação em conselho consultivo
- Voto em novos benefícios
- Acesso a relatórios financeiros
- Reuniões semestrais com diretoria

### 12.2 Garantias
- Auditoria externa anual
- Certificações internacionais
- Compliance total com regulamentações
- Selo de excelência INFINITY

## 13. Atendimento INFINITY

### Concierge Pessoal
- Linha direta do seu concierge: Fornecida na contratação
- WhatsApp pessoal do concierge
- E-mail VIP: infinity@unipetplan.com.br
- Videochamada HD com especialistas mundiais
- Atendimento em 20 idiomas

### Executive Lounge
- Salas VIP em todas as clínicas premium
- Atendimento sem filas
- Serviço de valet pet
- Café gourmet e pet treats premium

## 14. Compromisso INFINITY

A UNIPET PLAN se compromete a proporcionar não apenas saúde, mas qualidade de vida excepcional para seu pet, tratando-o como membro único e especial da família que é.

## 15. Foro

Fica eleito o foro de escolha do contratante, com opção de mediação ou arbitragem premium para resolução imediata de qualquer questão.

**Este contrato representa o compromisso máximo com a saúde e bem-estar do seu companheiro.**

**Última atualização:** ${new Date().toLocaleDateString('pt-BR')}
`;

interface PlanContract {
  contractText?: string;
}

export default function ContractInfinity() {
  const { data: contractData } = useQuery<PlanContract>({
    queryKey: ["plan-contract", "INFINITY"],
    queryFn: async () => {
      return await apiRequest("GET", "/api/plans/INFINITY/contract");
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