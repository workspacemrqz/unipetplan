import { storage } from '../storage.js';
import { CieloService } from './cielo-service.js';
import { notificationService } from './notification-service.js';
import { calculateNextRenewalDate, calculateOverduePeriods } from '../utils/renewal-helpers.js';
import type { Contract, Client, Pet, Plan } from '../../shared/schema.js';

interface RenewalAttempt {
  contractId: string;
  installmentId: string;
  success: boolean;
  paymentId?: string;
  error?: string;
}

export class AutomaticRenewalService {
  private cieloService: CieloService;

  constructor() {
    this.cieloService = new CieloService();
  }

  async processAutomaticRenewals(): Promise<{
    processed: number;
    successful: number;
    failed: number;
    attempts: RenewalAttempt[];
  }> {
    console.log('[AutomaticRenewal] Iniciando processamento de renovações automáticas');

    const overdueInstallments = await this.getOverdueInstallments();
    console.log(`[AutomaticRenewal] Encontradas ${overdueInstallments.length} parcelas vencidas`);

    const attempts: RenewalAttempt[] = [];
    let successful = 0;
    let failed = 0;

    for (const installment of overdueInstallments) {
      try {
        const contract = await storage.getContract(installment.contractId);
        
        if (!contract) {
          console.log(`[AutomaticRenewal] Contrato ${installment.contractId} não encontrado, pulando`);
          continue;
        }
        
        // Só tenta renovação automática se tiver cartão cadastrado
        if (contract.paymentMethod !== 'cartao' && contract.paymentMethod !== 'credit_card') {
          console.log(`[AutomaticRenewal] Contrato ${contract.id} usa ${contract.paymentMethod}, pulando renovação automática`);
          continue;
        }

        // Não tenta renovação se já estiver cancelado
        if (contract.status === 'cancelled') {
          console.log(`[AutomaticRenewal] Contrato ${contract.id} está cancelado, pulando`);
          continue;
        }

        console.log(`[AutomaticRenewal] Processando renovação do contrato ${contract.id}`);
        
        const attempt = await this.attemptRenewal(contract, installment);
        attempts.push(attempt);

        if (attempt.success) {
          successful++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`[AutomaticRenewal] Erro ao processar parcela ${installment.id}:`, error);
        attempts.push({
          contractId: installment.contractId,
          installmentId: installment.id!,
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
        failed++;
      }
    }

    console.log(`[AutomaticRenewal] Processamento concluído: ${successful} sucesso, ${failed} falhas`);

    return {
      processed: overdueInstallments.length,
      successful,
      failed,
      attempts,
    };
  }

  private async getOverdueInstallments() {
    // Busca parcelas vencidas (due_date < hoje) que ainda não foram pagas
    const allInstallments = await storage.getAllInstallments();
    const now = new Date();

    return allInstallments.filter(installment => {
      if (installment.status === 'paid') return false;
      
      const dueDate = new Date(installment.dueDate);
      const isOverdue = dueDate < now;
      
      // Só tenta renovação automática se estiver vencido há pelo menos 1 dia
      const daysSinceDue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      return isOverdue && daysSinceDue >= 1;
    });
  }

  private async attemptRenewal(
    contract: Contract,
    installment: any
  ): Promise<RenewalAttempt> {
    try {
      // Buscar dados necessários
      const client = await storage.getClientById(contract.clientId);
      const pet = await storage.getPet(contract.petId);
      const plan = await storage.getPlan(contract.planId);

      if (!client || !pet || !plan) {
        throw new Error('Dados incompletos do contrato');
      }

      console.log(`[AutomaticRenewal] Tentando renovação para cliente ${client.fullName}, pet ${pet.name}`);

      // Nota: O sistema atual não armazena dados do cartão (por segurança)
      // Portanto, não é possível fazer cobrança automática real sem tokenização
      // Por enquanto, vamos apenas criar a lógica que tentaria a cobrança
      
      // Em uma implementação real, você precisaria:
      // 1. Usar tokenização da Cielo (salvar token do cartão, não os dados)
      // 2. Ou usar Recorrência Programada da Cielo
      // 3. Ou pedir para cliente cadastrar cartão para débito automático

      // Verificar se temos token do cartão para cobrança automática
      if (contract.cieloCardToken) {
        console.log(`[AutomaticRenewal] Tentando cobrança automática com token do cartão`);
        
        try {
          // Importar CieloService
          const CieloService = (await import('./cielo-service.js')).default;
          const cieloService = new CieloService();
          
          const paymentData = {
            merchantOrderId: `RENEWAL-${contract.contractNumber}-${Date.now()}`,
            customer: {
              name: client.fullName || client.email,
              identity: client.cpf || undefined,
              email: client.email,
            },
            payment: {
              amount: Math.round(parseFloat(installment.amount) * 100), // Converter para centavos
              cardToken: contract.cieloCardToken,
              brand: contract.cardBrand || 'Visa', // Usar a bandeira salva
              installments: 1, // Renovação sempre em 1x
            },
          };
          
          console.log(`[AutomaticRenewal] Processando pagamento via Cielo com token`);
          const paymentResult = await cieloService.processPaymentWithToken(paymentData);
          
          // Status 2 = Autorizado/Capturado na Cielo
          if (paymentResult.payment && paymentResult.payment.status === 2) {
            // Pagamento aprovado - atualizar a parcela
            await storage.updateContractInstallment(installment.id!, {
              status: 'paid',
              paidAt: new Date(),
              paymentMethod: 'credit_card',
              cieloPaymentId: paymentResult.payment.paymentId,
            });
            
            // Atualizar contrato
            await storage.updateContract(contract.id, {
              status: 'active',
              updatedAt: new Date(),
            });
            
            // Criar próxima parcela
            await this.createNextInstallment(contract, installment);
            
            console.log(`[AutomaticRenewal] Renovação processada com sucesso para contrato ${contract.id}`);
            
            // Enviar notificação de sucesso
            await notificationService.sendRenewalSuccessNotification(
              client.fullName || client.email,
              client.email,
              parseFloat(installment.amount),
              plan.name,
              pet.name
            );
            
            return {
              contractId: contract.id,
              installmentId: installment.id!,
              success: true,
              paymentId: paymentResult.payment.paymentId,
            };
          } else {
            // Pagamento recusado
            const errorMessage = paymentResult.payment?.returnMessage || 'Pagamento não autorizado';
            console.log(`[AutomaticRenewal] Pagamento recusado: ${errorMessage}`);
            
            await notificationService.sendRenewalFailureNotification(
              client.fullName || client.email,
              client.email,
              parseFloat(installment.amount),
              plan.name,
              pet.name,
              `Pagamento recusado: ${errorMessage}. Por favor, atualize seus dados de pagamento.`
            );
            
            return {
              contractId: contract.id,
              installmentId: installment.id!,
              success: false,
              error: `Pagamento recusado: ${errorMessage}`,
            };
          }
        } catch (error) {
          console.error(`[AutomaticRenewal] Erro ao processar pagamento com token:`, error);
          
          await notificationService.sendRenewalFailureNotification(
            client.fullName || client.email,
            client.email,
            parseFloat(installment.amount),
            plan.name,
            pet.name,
            'Erro ao processar pagamento automático. Por favor, efetue o pagamento manualmente.'
          );
          
          return {
            contractId: contract.id,
            installmentId: installment.id!,
            success: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido',
          };
        }
      } else {
        // Sem token do cartão - enviar notificação para pagamento manual
        console.log(`[AutomaticRenewal] Contrato sem token de cartão. Notificando cliente para pagamento manual.`);
        
        await notificationService.sendRenewalFailureNotification(
          client.fullName || client.email,
          client.email,
          parseFloat(installment.amount),
          plan.name,
          pet.name,
          'Pagamento automático não configurado. Por favor, efetue o pagamento manualmente ou cadastre um cartão para débito automático.'
        );

        return {
          contractId: contract.id,
          installmentId: installment.id!,
          success: false,
          error: 'Sem token de cartão para cobrança automática',
        };
      }

    } catch (error) {
      console.error(`[AutomaticRenewal] Erro ao tentar renovação:`, error);
      return {
        contractId: contract.id,
        installmentId: installment.id!,
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  private async createNextInstallment(
    contract: Contract,
    paidInstallment: any
  ): Promise<void> {
    const contractStartDate = new Date(contract.startDate);
    const paidDueDate = new Date(paidInstallment.dueDate);
    
    const nextDueDate = calculateNextRenewalDate(
      contractStartDate,
      paidDueDate,
      contract.billingPeriod
    );

    const periodLength = contract.billingPeriod === 'annual' ? 365 : 30;
    const nextPeriodEnd = new Date(nextDueDate.getTime() + (periodLength * 86400000));

    await storage.createContractInstallment({
      contractId: contract.id,
      installmentNumber: (paidInstallment.installmentNumber || 0) + 1,
      dueDate: nextDueDate,
      periodStart: new Date(paidInstallment.periodEnd.getTime() + 86400000),
      periodEnd: nextPeriodEnd,
      amount: contract.billingPeriod === 'annual' 
        ? (contract.annualAmount || contract.monthlyAmount)
        : contract.monthlyAmount,
      status: 'pending',
    });

    console.log(`[AutomaticRenewal] Próxima parcela criada para contrato ${contract.id}, vencimento: ${nextDueDate.toLocaleDateString('pt-BR')}`);
  }

  async sendUpcomingDueNotifications(daysAhead: number = 3): Promise<number> {
    console.log(`[AutomaticRenewal] Enviando notificações de vencimento em ${daysAhead} dias`);

    const upcomingInstallments = await this.getInstallmentsDueInDays(daysAhead);
    console.log(`[AutomaticRenewal] Encontradas ${upcomingInstallments.length} parcelas vencendo em ${daysAhead} dias`);

    let notificationsSent = 0;

    for (const installment of upcomingInstallments) {
      try {
        const contract = await storage.getContract(installment.contractId);
        if (!contract) continue;
        
        const client = await storage.getClientById(contract.clientId);
        const pet = await storage.getPet(contract.petId);
        const plan = await storage.getPlan(contract.planId);

        if (!client || !pet || !plan) continue;

        await notificationService.sendPaymentReminder({
          clientName: client.fullName || client.email,
          clientEmail: client.email,
          dueDate: installment.dueDate,
          amount: parseFloat(installment.amount),
          planName: plan.name,
          petName: pet.name,
          daysUntilDue: daysAhead,
        });

        notificationsSent++;
      } catch (error) {
        console.error(`[AutomaticRenewal] Erro ao enviar notificação:`, error);
      }
    }

    console.log(`[AutomaticRenewal] ${notificationsSent} notificações enviadas`);
    return notificationsSent;
  }

  private async getInstallmentsDueInDays(days: number) {
    const allInstallments = await storage.getAllInstallments();
    const now = new Date();
    const targetDate = new Date(now.getTime() + (days * 86400000));

    // Normalizar para início do dia
    now.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);

    return allInstallments.filter(installment => {
      if (installment.status === 'paid') return false;

      const dueDate = new Date(installment.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      return dueDate.getTime() === targetDate.getTime();
    });
  }

  async sendOverdueNotifications(): Promise<number> {
    console.log('[AutomaticRenewal] Enviando notificações de atraso');

    const overdueInstallments = await this.getOverdueInstallments();
    let notificationsSent = 0;

    for (const installment of overdueInstallments) {
      try {
        const contract = await storage.getContract(installment.contractId);
        if (!contract) continue;
        
        const client = await storage.getClientById(contract.clientId);
        const pet = await storage.getPet(contract.petId);
        const plan = await storage.getPlan(contract.planId);

        if (!client || !pet || !plan) continue;

        const now = new Date();
        const dueDate = new Date(installment.dueDate);
        const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        // Envia notificações em marcos específicos: 1, 3, 7, 15, 30 dias
        if ([1, 3, 7, 15, 30].includes(daysOverdue)) {
          await notificationService.sendPaymentOverdueNotification({
            clientName: client.fullName || client.email,
            clientEmail: client.email,
            dueDate: installment.dueDate,
            amount: parseFloat(installment.amount),
            planName: plan.name,
            petName: pet.name,
            daysOverdue,
          });

          notificationsSent++;
        }
      } catch (error) {
        console.error(`[AutomaticRenewal] Erro ao enviar notificação de atraso:`, error);
      }
    }

    console.log(`[AutomaticRenewal] ${notificationsSent} notificações de atraso enviadas`);
    return notificationsSent;
  }
}

export const automaticRenewalService = new AutomaticRenewalService();
