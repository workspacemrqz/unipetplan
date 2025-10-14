import { useEffect, useState, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { useAuth } from "@/contexts/AuthContext";

// Component to format and display contract content
function ContractContent({ text }: { text: string }) {
  const formatContractText = (content: string) => {
    const lines = content.split('\n');
    const elements: JSX.Element[] = [];
    let currentList: string[] = [];
    let listKey = 0;

    const flushList = () => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`list-${listKey++}`} className="list-disc list-inside mb-4 space-y-1">
            {currentList.map((item, idx) => (
              <li key={idx} className="text-sm" style={{ color: 'var(--text-dark-secondary)' }}>
                {item}
              </li>
            ))}
          </ul>
        );
        currentList = [];
      }
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      if (!trimmed) {
        flushList();
        elements.push(<div key={`space-${index}`} className="h-4" />);
      } else if (trimmed.startsWith('CONTRATO DE PRESTAÇÃO') && !trimmed.includes('CLÁUSULA')) {
        flushList();
        elements.push(
          <h1 key={`title-${index}`} className="text-2xl font-bold text-center mb-6" style={{ color: 'var(--text-dark-primary)' }}>
            {trimmed}
          </h1>
        );
      } else if (trimmed.startsWith('CLÁUSULA')) {
        flushList();
        elements.push(
          <h2 key={`clause-${index}`} className="text-lg font-semibold mb-3 mt-6" style={{ color: 'var(--text-dark-primary)' }}>
            {trimmed}
          </h2>
        );
      } else if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
        currentList.push(trimmed.substring(1).trim());
      } else if (trimmed.match(/^\d+\./)) {
        flushList();
        elements.push(
          <p key={`numbered-${index}`} className="text-sm mb-2" style={{ color: 'var(--text-dark-secondary)' }}>
            {trimmed}
          </p>
        );
      } else {
        flushList();
        // Handle bold text within paragraphs
        const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
        const formattedParts = parts.map((part, idx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={idx}>{part.slice(2, -2)}</strong>;
          }
          return part;
        });
        
        elements.push(
          <p key={`para-${index}`} className="text-sm mb-3 text-justify" style={{ color: 'var(--text-dark-secondary)' }}>
            {formattedParts}
          </p>
        );
      }
    });

    flushList();
    return elements;
  };

  return <div className="max-w-none">{formatContractText(text)}</div>;
}

export default function CustomerContract() {
  const [, navigate] = useLocation();
  const { client, isLoading: authLoading } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedPet, setSelectedPet] = useState<string>("");
  const [contracts, setContracts] = useState<any[]>([]);
  const contractContentRef = useRef<HTMLDivElement>(null);
  
  // Fetch site settings to get contract text
  const { data: siteSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const response = await fetch('/api/site-settings');
      if (!response.ok) {
        throw new Error('Erro ao carregar configurações');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Fetch contracts and pets
  useEffect(() => {
    const loadContracts = async () => {
      if (!client || authLoading) return;
      
      try {
        const response = await fetch('/api/customer/contracts', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          setContracts(data.contracts || []);
        }
      } catch (error) {
        console.error('Error loading contracts:', error);
      }
    };
    
    loadContracts();
  }, [client, authLoading]);
  
  // Get unique pets from contracts
  const uniquePets = useMemo(() => {
    const petsMap = new Map<string, { id: string, name: string, planName: string }>();
    
    contracts.forEach(contract => {
      if (contract.petId && contract.petName && !petsMap.has(contract.petId)) {
        petsMap.set(contract.petId, {
          id: contract.petId,
          name: contract.petName,
          planName: contract.planName
        });
      }
    });
    
    return Array.from(petsMap.values());
  }, [contracts]);
  
  // Auto-select the first pet when pets are loaded
  useEffect(() => {
    if (uniquePets.length > 0 && !selectedPet && uniquePets[0]) {
      setSelectedPet(uniquePets[0].id);
    }
  }, [uniquePets, selectedPet]);
  
  // Get selected contract and plan
  const selectedContract = useMemo(() => {
    if (!selectedPet) return null;
    return contracts.find(c => c.petId === selectedPet);
  }, [contracts, selectedPet]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !client) {
      navigate('/cliente/login');
    }
  }, [authLoading, client, navigate]);

  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);
      
      // Call API to generate and download PDF
      const response = await fetch('/api/clients/contract/download', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/pdf',
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao baixar o contrato');
      }

      // Get the blob from the response
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `contrato_plano_saude_pet_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      alert('Erro ao baixar o contrato. Por favor, tente novamente.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (authLoading || settingsLoading) {
    return (
      <>
        <Header />
        <div className="min-h-screen pt-16 flex items-center justify-center" style={{ background: 'var(--bg-cream-light)' }}>
          <div className="text-center">
            <div className="w-8 h-8 border-4 rounded-full animate-spin mx-auto mb-4" 
              style={{borderColor: 'var(--text-teal)', borderTopColor: 'transparent'}}></div>
            <p style={{ color: 'var(--text-dark-secondary)' }}>Carregando...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // Get contract text from database or use default
  const getContractText = () => {
    if (siteSettings?.contractText && siteSettings.contractText.trim()) {
      // Replace placeholders in the contract text
      return siteSettings.contractText
        .replace(/\[Nome do Cliente\]/g, client?.full_name || '[Nome do Cliente]')
        .replace(/\[CPF do Cliente\]/g, client?.cpf || '[CPF do Cliente]');
    }
    
    // Default contract text
    return getDefaultContractText();
  };

  const getDefaultContractText = () => {
    return `Contrato VETERINÁRIOS - PLANO DE SAÚDE PET

Por este instrumento particular de Contrato Veterinários, as partes abaixo qualificadas celebram o presente contrato mediante as cláusulas e condições seguintes:

CLÁUSULA PRIMEIRA - DAS PARTES

CONTRATADA: CLÍNICA VETERINÁRIA PET SAÚDE, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº XX.XXX.XXX/0001-XX, com sede na Rua Example, nº 123, Bairro Centro, Cidade/Estado, CEP 00000-000, neste ato representada na forma de seu contrato social.

CONTRATANTE: ${client?.full_name || '[Nome do Cliente]'}, inscrito(a) no CPF sob o nº ${client?.cpf || '[CPF do Cliente]'}, residente e domiciliado(a) no endereço cadastrado em nosso sistema.

CLÁUSULA SEGUNDA - DO OBJETO

O presente contrato tem por objeto a prestação de serviços veterinários através do plano de saúde pet contratado, que oferece cobertura para consultas, exames, procedimentos e tratamentos veterinários, conforme as condições e coberturas específicas do plano escolhido pelo CONTRATANTE.

CLÁUSULA TERCEIRA - DOS PLANOS DISPONÍVEIS

A CONTRATADA oferece os seguintes planos de saúde pet:
• Plano Basic: Cobertura básica incluindo consultas, exames laboratoriais simples, vacinas essenciais e procedimentos ambulatoriais básicos.
• Plano Confort: Inclui todas as coberturas do plano Basic, além de exames especializados, procedimentos cirúrgicos simples e descontos em medicamentos.
• Plano Platinum: Cobertura ampliada com exames complexos, cirurgias de médio porte, internação e tratamentos especializados.
• Plano Infinity: Cobertura completa incluindo todas as especialidades, cirurgias complexas, tratamentos oncológicos e atendimento 24 horas.

CLÁUSULA QUARTA - DAS COBERTURAS

As coberturas específicas de cada plano estão detalhadas no Anexo I deste contrato e incluem:
• Consultas veterinárias conforme limite do plano
• Exames laboratoriais e de imagem conforme cobertura
• Procedimentos ambulatoriais
• Vacinas inclusas no plano
• Cirurgias conforme porte e cobertura do plano
• Medicamentos com desconto ou cobertura conforme plano

CLÁUSULA QUINTA - DAS CARÊNCIAS

Ficam estabelecidos os seguintes prazos de carência a partir da data de contratação:
• Consultas e emergências: 24 horas
• Exames simples: 30 dias
• Procedimentos ambulatoriais: 30 dias
• Cirurgias eletivas: 60 dias
• Exames complexos: 90 dias
• Doenças preexistentes: 180 dias

CLÁUSULA SEXTA - DO PAGAMENTO

O CONTRATANTE pagará à CONTRATADA o valor mensal correspondente ao plano escolhido, conforme valores vigentes na data da contratação:
• Plano Basic: R$ 49,90/mês
• Plano Confort: R$ 79,90/mês (cobrança anual)
• Plano Platinum: R$ 129,90/mês (cobrança anual)
• Plano Infinity: R$ 69,90/mês

O pagamento deverá ser realizado até o dia de vencimento escolhido pelo CONTRATANTE, através dos meios de pagamento disponibilizados pela CONTRATADA (cartão de crédito ou PIX).

CLÁUSULA SÉTIMA - DO PRAZO

O presente contrato é celebrado por prazo indeterminado, iniciando-se na data de sua assinatura eletrônica através da aceitação dos termos no momento da contratação online.

CLÁUSULA OITAVA - DO CANCELAMENTO

O CONTRATANTE poderá solicitar o cancelamento do plano a qualquer momento, mediante comunicação prévia de 30 dias. O cancelamento não dará direito à devolução de valores já pagos referentes a períodos já utilizados ou em curso.

CLÁUSULA NONA - DAS EXCLUSÕES

Não estão cobertos pelo plano:
• Tratamentos estéticos
• Produtos de higiene e beleza
• Rações e suplementos não prescritos
• Despesas com transporte
• Procedimentos experimentais
• Danos causados por maus-tratos ou negligência

CLÁUSULA DÉCIMA - DAS OBRIGAÇÕES DO CONTRATANTE

São obrigações do CONTRATANTE:
• Manter os pagamentos em dia
• Fornecer informações verdadeiras sobre o pet
• Seguir as orientações veterinárias
• Comunicar alterações cadastrais
• Utilizar os serviços de forma consciente

CLÁUSULA DÉCIMA PRIMEIRA - DAS OBRIGAÇÕES DA CONTRATADA

São obrigações da CONTRATADA:
• Prestar os serviços conforme cobertura do plano
• Manter equipe veterinária qualificada
• Disponibilizar estrutura adequada
• Respeitar os prazos de atendimento
• Manter sigilo sobre informações do pet e do tutor

CLÁUSULA DÉCIMA SEGUNDA - DA RESCISÃO

O presente contrato poderá ser rescindido:
• Por acordo entre as partes
• Por inadimplência superior a 60 dias
• Por descumprimento de cláusulas contratuais
• Por fraude ou má-fé comprovada

CLÁUSULA DÉCIMA TERCEIRA - DAS DISPOSIÇÕES GERAIS

1. Os casos omissos serão resolvidos de comum acordo entre as partes.
2. Este contrato poderá ser alterado mediante termo aditivo assinado por ambas as partes.
3. A tolerância de uma parte quanto ao descumprimento da outra não implicará renúncia de direitos.
4. Este contrato obriga as partes e seus sucessores.

CLÁUSULA DÉCIMA QUARTA - DO FORO

Fica eleito o foro da comarca da sede da CONTRATADA para dirimir quaisquer dúvidas ou litígios decorrentes deste contrato, renunciando as partes a qualquer outro, por mais privilegiado que seja.

E por estarem assim justas e contratadas, as partes aceitam o presente contrato em todos os seus termos.

Data de aceite: ${new Date().toLocaleDateString('pt-BR')}
Contrato aceito eletronicamente através da plataforma online
Este documento é uma cópia do contrato aceito pelo cliente durante o processo de checkout.`;
  };

  return (
    <>
      <Header />
      <div className="min-h-screen pt-16" style={{ background: 'var(--bg-cream-light)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Back Button */}
          <button
            onClick={() => navigate('/cliente/painel')}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg mb-4"
            style={{ background: 'var(--bg-beige)', color: 'var(--text-dark-secondary)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>

          {/* Pet Selector */}
          {uniquePets.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-dark-primary)' }}>
                Selecione o pet para visualizar o contrato:
              </label>
              <div className="w-full sm:w-[300px]">
                <Select value={selectedPet} onValueChange={setSelectedPet}>
                  <SelectTrigger 
                    className="w-full p-3 rounded-lg border text-sm [&>span]:text-left [&>span]:flex [&>span]:flex-col [&>span]:items-start"
                    style={{
                      borderColor: 'var(--border-gray)',
                      background: 'white'
                    }}
                  >
                    <SelectValue placeholder="Escolha um pet" />
                  </SelectTrigger>
                  <SelectContent>
                    {uniquePets.map((pet) => (
                      <SelectItem key={pet.id} value={pet.id}>
                        {pet.name} - {pet.planName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </motion.div>
          )}

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg p-6 mb-6"
          >
            {/* Desktop Layout */}
            <div className="hidden sm:flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold" style={{ color: 'var(--text-dark-primary)' }}>
                  Contrato
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--text-dark-secondary)' }}>
                  {selectedContract ? `${selectedContract.planName} - ${selectedContract.petName}` : 'Plano de Saúde Pet'}
                </p>
              </div>
              <button
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all"
                style={{ 
                  background: isDownloading ? 'var(--bg-beige)' : 'var(--btn-ver-planos-bg)', 
                  color: isDownloading ? 'var(--text-dark-secondary)' : 'var(--btn-ver-planos-text)',
                  opacity: isDownloading ? 0.7 : 1
                }}
              >
                <Download className="w-4 h-4" />
                <span>{isDownloading ? 'Baixando...' : 'Baixar PDF'}</span>
              </button>
            </div>

            {/* Mobile Layout */}
            <div className="sm:hidden">
              <div>
                <h1 className="text-2xl font-bold" style={{ color: 'var(--text-dark-primary)' }}>
                  Contrato
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--text-dark-secondary)' }}>
                  {selectedContract ? `${selectedContract.planName} - ${selectedContract.petName}` : 'Plano de Saúde Pet'}
                </p>
                <button
                  onClick={handleDownloadPDF}
                  disabled={isDownloading}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all mt-4"
                  style={{ 
                    background: isDownloading ? 'var(--bg-beige)' : 'var(--btn-ver-planos-bg)', 
                    color: isDownloading ? 'var(--text-dark-secondary)' : 'var(--btn-ver-planos-text)',
                    opacity: isDownloading ? 0.7 : 1
                  }}
                >
                  <Download className="w-4 h-4" />
                  <span>{isDownloading ? 'Baixando...' : 'Baixar PDF'}</span>
                </button>
              </div>
            </div>
          </motion.div>

          {/* Contract Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-lg p-8"
            ref={contractContentRef}
          >
            <ContractContent text={getContractText()} />
          </motion.div>
        </div>
      </div>
      <Footer />
    </>
  );
}