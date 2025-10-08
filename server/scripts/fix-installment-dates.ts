/**
 * Script de migração para corrigir datas de vencimento de parcelas
 * 
 * PROBLEMA:
 * Algumas parcelas foram criadas com bug onde a segunda parcela tinha dueDate 
 * calculado com +2 períodos ao invés de +1 período da primeira parcela.
 * 
 * SOLUÇÃO:
 * Este script:
 * 1. Analisa todos os contratos ativos
 * 2. Identifica parcelas com dueDate incorreto (2 períodos ao invés de 1)
 * 3. Recalcula corretamente: dueDate_segunda = dueDate_primeira + 1 período
 * 4. Atualiza no banco de dados (apenas com --apply)
 * 5. Gera relatório detalhado
 * 
 * CRITÉRIOS DE SEGURANÇA:
 * - Apenas corrige parcelas com status 'pending' ou 'current'
 * - NÃO mexe em parcelas já pagas
 * - Usa funções validadas de cálculo de data (addMonths/addYears)
 * - Dry-run por padrão (sem alterações no banco)
 * 
 * USO:
 * npm run fix-dates           # Executa dry-run (apenas analisa e mostra o que seria corrigido)
 * npm run fix-dates:apply     # Aplica as correções no banco de dados
 */

import { storage } from '../storage.js';
import { addMonths, addYears } from '../utils/renewal-helpers.js';

interface ContractWithIssue {
  contractId: string;
  contractNumber: string;
  planName: string;
  billingPeriod: 'monthly' | 'annual';
  installment1: {
    id: string;
    number: number;
    dueDate: Date;
  };
  installment2: {
    id: string;
    number: number;
    currentDueDate: Date;
    correctDueDate: Date;
  };
}

async function fixInstallmentDates(dryRun: boolean = true) {
  console.log('🔍 Analisando contratos com parcelas...\n');

  try {
    const allContracts = await storage.getAllContracts();
    const contractsWithIssues: ContractWithIssue[] = [];

    for (const contract of allContracts) {
      const installments = await storage.getContractInstallmentsByContractId(contract.id);

      if (installments.length < 2) {
        continue;
      }

      installments.sort((a, b) => a.installmentNumber - b.installmentNumber);

      const firstInstallment = installments[0];
      const secondInstallment = installments[1];

      if (
        !secondInstallment ||
        (secondInstallment.status !== 'pending' && secondInstallment.status !== 'current')
      ) {
        continue;
      }

      const firstDueDate = new Date(firstInstallment.dueDate);
      const secondCurrentDueDate = new Date(secondInstallment.dueDate);

      const correctSecondDueDate =
        contract.billingPeriod === 'monthly'
          ? addMonths(firstDueDate, 1)
          : addYears(firstDueDate, 1);

      const wrongDueDate =
        contract.billingPeriod === 'monthly'
          ? addMonths(firstDueDate, 2)
          : addYears(firstDueDate, 2);

      const diffCorrect = Math.abs(
        secondCurrentDueDate.getTime() - correctSecondDueDate.getTime()
      );
      const diffWrong = Math.abs(
        secondCurrentDueDate.getTime() - wrongDueDate.getTime()
      );

      const oneDayMs = 24 * 60 * 60 * 1000;

      if (diffWrong <= oneDayMs && diffCorrect > oneDayMs) {
        const plan = await storage.getPlan(contract.planId);

        contractsWithIssues.push({
          contractId: contract.id,
          contractNumber: contract.contractNumber,
          planName: plan?.name || 'Unknown',
          billingPeriod: contract.billingPeriod,
          installment1: {
            id: firstInstallment.id,
            number: firstInstallment.installmentNumber,
            dueDate: firstDueDate,
          },
          installment2: {
            id: secondInstallment.id,
            number: secondInstallment.installmentNumber,
            currentDueDate: secondCurrentDueDate,
            correctDueDate: correctSecondDueDate,
          },
        });
      }
    }

    if (contractsWithIssues.length === 0) {
      console.log('✅ Nenhum contrato com problema encontrado!\n');
      return;
    }

    console.log(`📋 Encontrados ${contractsWithIssues.length} contratos com datas incorretas:\n`);

    for (const issue of contractsWithIssues) {
      const periodLabel = issue.billingPeriod === 'monthly' ? 'mensal' : 'anual';
      
      console.log(`✅ Contrato ${issue.contractNumber} (${issue.planName} - ${periodLabel}):`);
      console.log(`   - Parcela 1: ${formatDate(issue.installment1.dueDate)} (correto)`);
      console.log(
        `   - Parcela 2: ${formatDate(issue.installment2.currentDueDate)} (ERRADO - deveria ser ${formatDate(issue.installment2.correctDueDate)})`
      );
      console.log(
        `   - Correção: ${formatDate(issue.installment2.currentDueDate)} → ${formatDate(issue.installment2.correctDueDate)}\n`
      );
    }

    console.log('📊 Resumo:');
    console.log(`- Total de contratos analisados: ${allContracts.length}`);
    console.log(`- Contratos com erro: ${contractsWithIssues.length}`);
    console.log(`- Parcelas a corrigir: ${contractsWithIssues.length}\n`);

    if (dryRun) {
      console.log('⚠️  [DRY-RUN] Execute com --apply para aplicar as correções');
    } else {
      console.log('🔧 Aplicando correções...\n');

      let correctedCount = 0;

      for (const issue of contractsWithIssues) {
        try {
          await storage.updateContractInstallment(issue.installment2.id, {
            dueDate: issue.installment2.correctDueDate,
          });

          console.log(
            `✅ Corrigido: ${issue.contractNumber} - Parcela ${issue.installment2.number}`
          );
          correctedCount++;
        } catch (error) {
          console.error(
            `❌ Erro ao corrigir ${issue.contractNumber}:`,
            error instanceof Error ? error.message : error
          );
        }
      }

      console.log(`\n✅ Correções concluídas: ${correctedCount}/${contractsWithIssues.length}`);
    }
  } catch (error) {
    console.error('❌ Erro ao executar script:', error);
    process.exit(1);
  }
}

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

const args = process.argv.slice(2);
const shouldApply = args.includes('--apply');

fixInstallmentDates(!shouldApply)
  .then(() => {
    console.log('\n✅ Script executado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
