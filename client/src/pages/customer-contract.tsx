import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ChevronLeft, Download } from "lucide-react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { useAuth } from "@/contexts/AuthContext";

export default function CustomerContract() {
  const [, navigate] = useLocation();
  const { client, isLoading: authLoading } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);
  const contractContentRef = useRef<HTMLDivElement>(null);

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

  if (authLoading) {
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

  return (
    <>
      <Header />
      <div className="min-h-screen pt-16" style={{ background: 'var(--bg-cream-light)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Back Button */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate('/cliente/painel')}
            className="flex items-center space-x-2 mb-6 text-sm font-medium"
            style={{ color: 'var(--text-teal)' }}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Voltar ao Painel</span>
          </motion.button>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg p-6 mb-6"
          >
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold" style={{ color: 'var(--text-dark-primary)' }}>
                  Contrato de Prestação de Serviços
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--text-dark-secondary)' }}>
                  Plano de Saúde Pet
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
          </motion.div>

          {/* Contract Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-lg p-8"
            ref={contractContentRef}
          >
            <div className="prose max-w-none" style={{ color: 'var(--text-dark-primary)' }}>
              <h2 className="text-center text-xl font-bold mb-6">
                CONTRATO DE PRESTAÇÃO DE SERVIÇOS VETERINÁRIOS - PLANO DE SAÚDE PET
              </h2>

              <div className="space-y-4 text-sm">
                <p>
                  Por este instrumento particular de Contrato de Prestação de Serviços Veterinários, 
                  as partes abaixo qualificadas celebram o presente contrato mediante as cláusulas e condições seguintes:
                </p>

                <h3 className="font-bold mt-6">CLÁUSULA PRIMEIRA - DAS PARTES</h3>
                <p>
                  <strong>CONTRATADA:</strong> CLÍNICA VETERINÁRIA PET SAÚDE, pessoa jurídica de direito privado, 
                  inscrita no CNPJ sob o nº XX.XXX.XXX/0001-XX, com sede na Rua Example, nº 123, Bairro Centro, 
                  Cidade/Estado, CEP 00000-000, neste ato representada na forma de seu contrato social.
                </p>
                <p>
                  <strong>CONTRATANTE:</strong> {client?.full_name || '[Nome do Cliente]'}, 
                  inscrito(a) no CPF sob o nº {client?.cpf || '[CPF do Cliente]'}, 
                  residente e domiciliado(a) no endereço cadastrado em nosso sistema.
                </p>

                <h3 className="font-bold mt-6">CLÁUSULA SEGUNDA - DO OBJETO</h3>
                <p>
                  O presente contrato tem por objeto a prestação de serviços veterinários através do plano de saúde 
                  pet contratado, que oferece cobertura para consultas, exames, procedimentos e tratamentos 
                  veterinários, conforme as condições e coberturas específicas do plano escolhido pelo CONTRATANTE.
                </p>

                <h3 className="font-bold mt-6">CLÁUSULA TERCEIRA - DOS PLANOS DISPONÍVEIS</h3>
                <p>
                  A CONTRATADA oferece os seguintes planos de saúde pet:
                </p>
                <ul className="list-disc ml-6 space-y-2">
                  <li><strong>Plano Basic:</strong> Cobertura básica incluindo consultas, exames laboratoriais simples, 
                  vacinas essenciais e procedimentos ambulatoriais básicos.</li>
                  <li><strong>Plano Confort:</strong> Inclui todas as coberturas do plano Basic, além de exames 
                  especializados, procedimentos cirúrgicos simples e descontos em medicamentos.</li>
                  <li><strong>Plano Platinum:</strong> Cobertura ampliada com exames complexos, cirurgias de médio 
                  porte, internação e tratamentos especializados.</li>
                  <li><strong>Plano Infinity:</strong> Cobertura completa incluindo todas as especialidades, 
                  cirurgias complexas, tratamentos oncológicos e atendimento 24 horas.</li>
                </ul>

                <h3 className="font-bold mt-6">CLÁUSULA QUARTA - DAS COBERTURAS</h3>
                <p>
                  As coberturas específicas de cada plano estão detalhadas no Anexo I deste contrato e incluem:
                </p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Consultas veterinárias conforme limite do plano</li>
                  <li>Exames laboratoriais e de imagem conforme cobertura</li>
                  <li>Procedimentos ambulatoriais</li>
                  <li>Vacinas inclusas no plano</li>
                  <li>Cirurgias conforme porte e cobertura do plano</li>
                  <li>Medicamentos com desconto ou cobertura conforme plano</li>
                </ul>

                <h3 className="font-bold mt-6">CLÁUSULA QUINTA - DAS CARÊNCIAS</h3>
                <p>
                  Ficam estabelecidos os seguintes prazos de carência a partir da data de contratação:
                </p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Consultas e emergências: 24 horas</li>
                  <li>Exames simples: 30 dias</li>
                  <li>Procedimentos ambulatoriais: 30 dias</li>
                  <li>Cirurgias eletivas: 60 dias</li>
                  <li>Exames complexos: 90 dias</li>
                  <li>Doenças preexistentes: 180 dias</li>
                </ul>

                <h3 className="font-bold mt-6">CLÁUSULA SEXTA - DO PAGAMENTO</h3>
                <p>
                  O CONTRATANTE pagará à CONTRATADA o valor mensal correspondente ao plano escolhido, 
                  conforme valores vigentes na data da contratação:
                </p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Plano Basic: R$ 49,90/mês</li>
                  <li>Plano Confort: R$ 79,90/mês (cobrança anual)</li>
                  <li>Plano Platinum: R$ 129,90/mês (cobrança anual)</li>
                  <li>Plano Infinity: R$ 69,90/mês</li>
                </ul>
                <p className="mt-2">
                  O pagamento deverá ser realizado até o dia de vencimento escolhido pelo CONTRATANTE, 
                  através dos meios de pagamento disponibilizados pela CONTRATADA (cartão de crédito ou PIX).
                </p>

                <h3 className="font-bold mt-6">CLÁUSULA SÉTIMA - DO PRAZO</h3>
                <p>
                  O presente contrato é celebrado por prazo indeterminado, iniciando-se na data de sua assinatura 
                  eletrônica através da aceitação dos termos no momento da contratação online.
                </p>

                <h3 className="font-bold mt-6">CLÁUSULA OITAVA - DO CANCELAMENTO</h3>
                <p>
                  O CONTRATANTE poderá solicitar o cancelamento do plano a qualquer momento, mediante comunicação 
                  prévia de 30 dias. O cancelamento não dará direito à devolução de valores já pagos referentes 
                  a períodos já utilizados ou em curso.
                </p>

                <h3 className="font-bold mt-6">CLÁUSULA NONA - DAS EXCLUSÕES</h3>
                <p>
                  Não estão cobertos pelo plano:
                </p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Tratamentos estéticos</li>
                  <li>Produtos de higiene e beleza</li>
                  <li>Rações e suplementos não prescritos</li>
                  <li>Despesas com transporte</li>
                  <li>Procedimentos experimentais</li>
                  <li>Danos causados por maus-tratos ou negligência</li>
                </ul>

                <h3 className="font-bold mt-6">CLÁUSULA DÉCIMA - DAS OBRIGAÇÕES DO CONTRATANTE</h3>
                <p>
                  São obrigações do CONTRATANTE:
                </p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Manter os pagamentos em dia</li>
                  <li>Fornecer informações verdadeiras sobre o pet</li>
                  <li>Seguir as orientações veterinárias</li>
                  <li>Comunicar alterações cadastrais</li>
                  <li>Utilizar os serviços de forma consciente</li>
                </ul>

                <h3 className="font-bold mt-6">CLÁUSULA DÉCIMA PRIMEIRA - DAS OBRIGAÇÕES DA CONTRATADA</h3>
                <p>
                  São obrigações da CONTRATADA:
                </p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Prestar os serviços conforme cobertura do plano</li>
                  <li>Manter equipe veterinária qualificada</li>
                  <li>Disponibilizar estrutura adequada</li>
                  <li>Respeitar os prazos de atendimento</li>
                  <li>Manter sigilo sobre informações do pet e do tutor</li>
                </ul>

                <h3 className="font-bold mt-6">CLÁUSULA DÉCIMA SEGUNDA - DA RESCISÃO</h3>
                <p>
                  O presente contrato poderá ser rescindido:
                </p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Por acordo entre as partes</li>
                  <li>Por inadimplência superior a 60 dias</li>
                  <li>Por descumprimento de cláusulas contratuais</li>
                  <li>Por fraude ou má-fé comprovada</li>
                </ul>

                <h3 className="font-bold mt-6">CLÁUSULA DÉCIMA TERCEIRA - DAS DISPOSIÇÕES GERAIS</h3>
                <p>
                  1. Os casos omissos serão resolvidos de comum acordo entre as partes.
                </p>
                <p>
                  2. Este contrato poderá ser alterado mediante termo aditivo assinado por ambas as partes.
                </p>
                <p>
                  3. A tolerância de uma parte quanto ao descumprimento da outra não implicará renúncia de direitos.
                </p>
                <p>
                  4. Este contrato obriga as partes e seus sucessores.
                </p>

                <h3 className="font-bold mt-6">CLÁUSULA DÉCIMA QUARTA - DO FORO</h3>
                <p>
                  Fica eleito o foro da comarca da sede da CONTRATADA para dirimir quaisquer dúvidas ou litígios 
                  decorrentes deste contrato, renunciando as partes a qualquer outro, por mais privilegiado que seja.
                </p>

                <div className="mt-8 pt-8 border-t border-gray-300">
                  <p className="text-center text-sm">
                    E por estarem assim justas e contratadas, as partes aceitam o presente contrato em todos os seus termos.
                  </p>
                  
                  <div className="mt-6 text-center text-xs" style={{ color: 'var(--text-dark-secondary)' }}>
                    <p>Data de aceite: {new Date().toLocaleDateString('pt-BR')}</p>
                    <p>Contrato aceito eletronicamente através da plataforma online</p>
                    <p className="mt-2">
                      Este documento é uma cópia do contrato aceito pelo cliente durante o processo de checkout.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      <Footer />
    </>
  );
}