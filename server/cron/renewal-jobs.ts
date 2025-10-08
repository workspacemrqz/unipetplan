import cron, { ScheduledTask } from 'node-cron';
import { automaticRenewalService } from '../services/automatic-renewal-service.js';
import { storage } from '../storage.js';

export class RenewalCronJobs {
  private jobs: ScheduledTask[] = [];
  private isEnabled: boolean = true;

  constructor() {
    // Verifica se cron jobs devem ser habilitados
    const cronEnabled = process.env.ENABLE_CRON_JOBS !== 'false';
    this.isEnabled = cronEnabled;

    if (!this.isEnabled) {
      console.log('[CronJobs] Cron jobs DESABILITADOS via variável ENABLE_CRON_JOBS');
    }
  }

  start(): void {
    if (!this.isEnabled) {
      console.log('[CronJobs] Cron jobs não serão iniciados (desabilitados)');
      return;
    }

    console.log('[CronJobs] Inicializando cron jobs de renovação automática');

    // Job 1: Notificações de vencimento próximo (3 dias antes)
    // Executa todo dia às 08:00
    const upcomingDueJob = cron.schedule('0 8 * * *', async () => {
      console.log('[CronJob-UpcomingDue] Iniciando job de notificações de vencimento');
      try {
        const notificationsSent = await automaticRenewalService.sendUpcomingDueNotifications(3);
        console.log(`[CronJob-UpcomingDue] Job concluído: ${notificationsSent} notificações enviadas`);
      } catch (error) {
        console.error('[CronJob-UpcomingDue] Erro ao executar job:', error);
      }
    }, {
      timezone: 'America/Sao_Paulo'
    });

    this.jobs.push(upcomingDueJob);
    console.log('[CronJobs] ✅ Job configurado: Notificações de vencimento (diário às 08:00)');

    // Job 2: Tentativa de renovação automática
    // Executa todo dia às 03:00 (horário com menos carga)
    const renewalJob = cron.schedule('0 3 * * *', async () => {
      console.log('[CronJob-Renewal] Iniciando job de renovações automáticas');
      try {
        const result = await automaticRenewalService.processAutomaticRenewals();
        console.log(`[CronJob-Renewal] Job concluído: ${result.successful} sucessos, ${result.failed} falhas de ${result.processed} processadas`);
      } catch (error) {
        console.error('[CronJob-Renewal] Erro ao executar job:', error);
      }
    }, {
      timezone: 'America/Sao_Paulo'
    });

    this.jobs.push(renewalJob);
    console.log('[CronJobs] ✅ Job configurado: Renovações automáticas (diário às 03:00)');

    // Job 3: Atualização de status de contratos
    // Executa todo dia às 04:00
    const statusUpdateJob = cron.schedule('0 4 * * *', async () => {
      console.log('[CronJob-StatusUpdate] Iniciando job de atualização de status');
      try {
        await this.updateContractStatuses();
        console.log('[CronJob-StatusUpdate] Job concluído');
      } catch (error) {
        console.error('[CronJob-StatusUpdate] Erro ao executar job:', error);
      }
    }, {
      timezone: 'America/Sao_Paulo'
    });

    this.jobs.push(statusUpdateJob);
    console.log('[CronJobs] ✅ Job configurado: Atualização de status (diário às 04:00)');

    // Job 4: Notificações de atraso
    // Executa todo dia às 10:00
    const overdueNotificationsJob = cron.schedule('0 10 * * *', async () => {
      console.log('[CronJob-OverdueNotifications] Iniciando job de notificações de atraso');
      try {
        const notificationsSent = await automaticRenewalService.sendOverdueNotifications();
        console.log(`[CronJob-OverdueNotifications] Job concluído: ${notificationsSent} notificações enviadas`);
      } catch (error) {
        console.error('[CronJob-OverdueNotifications] Erro ao executar job:', error);
      }
    }, {
      timezone: 'America/Sao_Paulo'
    });

    this.jobs.push(overdueNotificationsJob);
    console.log('[CronJobs] ✅ Job configurado: Notificações de atraso (diário às 10:00)');

    console.log(`[CronJobs] ${this.jobs.length} cron jobs iniciados com sucesso`);
  }

  private async updateContractStatuses(): Promise<void> {
    // Atualiza status de contratos baseado em regras de negócio
    const allContracts = await storage.getAllContracts();
    let updated = 0;

    for (const contract of allContracts) {
      try {
        if (contract.status === 'cancelled') continue;

        const installments = await storage.getContractInstallmentsByContractId(contract.id);
        const now = new Date();

        // Verificar se há parcelas vencidas
        const overdueInstallments = installments.filter(inst => {
          if (inst.status === 'paid') return false;
          const dueDate = new Date(inst.dueDate);
          return dueDate < now;
        });

        if (overdueInstallments.length > 0) {
          // Calcular dias de atraso da parcela mais antiga
          const oldestOverdue = overdueInstallments.reduce((oldest, current) => {
            return new Date(current.dueDate) < new Date(oldest.dueDate) ? current : oldest;
          });

          const daysOverdue = Math.floor(
            (now.getTime() - new Date(oldestOverdue.dueDate).getTime()) / (1000 * 60 * 60 * 24)
          );

          let newStatus: 'active' | 'inactive' | 'suspended' | 'cancelled' | 'pending' = contract.status;

          if (daysOverdue > 60) {
            newStatus = 'cancelled';
          } else if (daysOverdue > 15) {
            newStatus = 'suspended';
          } else {
            // Dentro do período de carência (15 dias)
            newStatus = 'active';
          }

          if (newStatus !== contract.status) {
            await storage.updateContract(contract.id, { status: newStatus });
            console.log(`[StatusUpdate] Contrato ${contract.contractNumber} atualizado de ${contract.status} para ${newStatus} (${daysOverdue} dias de atraso)`);
            updated++;
          }
        } else {
          // Sem parcelas vencidas - garantir que está ativo
          if (contract.status !== 'active') {
            await storage.updateContract(contract.id, { status: 'active' });
            console.log(`[StatusUpdate] Contrato ${contract.contractNumber} reativado (sem atrasos)`);
            updated++;
          }
        }
      } catch (error) {
        console.error(`[StatusUpdate] Erro ao atualizar contrato ${contract.id}:`, error);
      }
    }

    console.log(`[StatusUpdate] ${updated} contratos atualizados`);
  }

  stop(): void {
    console.log('[CronJobs] Parando cron jobs');
    this.jobs.forEach(job => job.stop());
    this.jobs = [];
  }

  getStatus(): { enabled: boolean; jobCount: number } {
    return {
      enabled: this.isEnabled,
      jobCount: this.jobs.length,
    };
  }

  // Método para executar jobs manualmente (útil para testes)
  async runJob(jobName: 'upcoming' | 'renewal' | 'status' | 'overdue'): Promise<any> {
    console.log(`[CronJobs] Executando job manualmente: ${jobName}`);

    switch (jobName) {
      case 'upcoming':
        return await automaticRenewalService.sendUpcomingDueNotifications(3);
      case 'renewal':
        return await automaticRenewalService.processAutomaticRenewals();
      case 'status':
        return await this.updateContractStatuses();
      case 'overdue':
        return await automaticRenewalService.sendOverdueNotifications();
      default:
        throw new Error(`Job desconhecido: ${jobName}`);
    }
  }
}

export const renewalCronJobs = new RenewalCronJobs();
