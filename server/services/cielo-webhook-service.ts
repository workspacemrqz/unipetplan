import { z } from "zod";
import crypto from 'crypto';
import { randomUUID } from 'crypto';

// Webhook notification interface from Cielo
export interface CieloWebhookNotification {
  PaymentId: string;
  ChangeType: number; // 1 = Payment status change, 2 = Recurrency, 3 = Chargeback
  ClientOrderId?: string;
  RequestId?: string;
}

// Webhook validation and processing service
export class CieloWebhookService {
  /**
   * Process webhook notification from Cielo
   */
  async processWebhookNotification(
    notification: CieloWebhookNotification,
    correlationId: string
  ): Promise<void> {
    try {
      console.log('📥 [CIELO-WEBHOOK] Processando notificação', {
        correlationId,
        paymentId: notification.PaymentId,
        changeType: notification.ChangeType,
        clientOrderId: notification.ClientOrderId
      });

      // Log security audit event
      this.logSecurityAuditEvent('webhook_received', {
        paymentId: notification.PaymentId,
        changeType: notification.ChangeType,
        clientOrderId: notification.ClientOrderId
      }, correlationId);

      switch (notification.ChangeType) {
        case 1: // Payment status change
          await this.handlePaymentStatusChange(notification, correlationId);
          break;
        case 2: // Recurrency 
          await this.handleRecurrencyNotification(notification, correlationId);
          break;
        case 3: // Chargeback
          await this.handleChargebackNotification(notification, correlationId);
          break;
        default:
          console.warn('⚠️ [CIELO-WEBHOOK] Tipo de mudança desconhecido', {
            correlationId,
            changeType: notification.ChangeType
          });
      }

      console.log('✅ [CIELO-WEBHOOK] Notificação processada com sucesso', {
        correlationId,
        paymentId: notification.PaymentId
      });

    } catch (error) {
      // Verificar se é um erro 404 (pagamento não encontrado)
      // Isso pode acontecer durante testes da Cielo ou se o pagamento foi cancelado/excluído
      const isNotFound = error instanceof Error && 
                         (error.message.includes('404') || 
                          error.message.includes('Not Found') ||
                          error.message.includes('não encontrado') ||
                          error.message.includes('Erro na API Cielo'));
      
      if (isNotFound) {
        console.warn('⚠️ [CIELO-WEBHOOK] Pagamento não encontrado na API - provavelmente teste da Cielo', {
          correlationId,
          paymentId: notification.PaymentId,
          changeType: notification.ChangeType
        });
        
        // Log informativo - não é um erro crítico
        console.log('💡 [CIELO-WEBHOOK] Webhook de teste processado (pagamento não existe na API)', {
          correlationId,
          paymentId: notification.PaymentId
        });
        
        // Não lançar erro - retornar normalmente
        return;
      }
      
      console.error('❌ [CIELO-WEBHOOK] Erro ao processar notificação', {
        correlationId,
        paymentId: notification.PaymentId,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      
      // Log security audit event for failed processing
      this.logSecurityAuditEvent('webhook_processing_failed', {
        paymentId: notification.PaymentId,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }, correlationId);
      
      throw error;
    }
  }

  /**
   * Handle payment status change notifications
   */
  private async handlePaymentStatusChange(
    notification: CieloWebhookNotification,
    correlationId: string
  ): Promise<void> {
    try {
      // Import CieloService dynamically to avoid circular dependencies
      const { CieloService } = await import('./cielo-service.js');
      const cieloService = new CieloService();

      // Query the current payment status from Cielo
      const paymentDetails = await cieloService.queryPayment(notification.PaymentId);
      
      console.log('💳 [CIELO-WEBHOOK] Status de pagamento atualizado', {
        correlationId,
        paymentId: notification.PaymentId,
        status: paymentDetails.payment?.status,
        returnCode: paymentDetails.payment?.returnCode,
        returnMessage: paymentDetails.payment?.returnMessage
      });

      // Update payment status in database
      await this.updatePaymentStatusInDatabase(
        notification.PaymentId,
        notification.ClientOrderId || '',
        paymentDetails.payment?.status || 0,
        paymentDetails.payment?.returnCode || '',
        paymentDetails.payment?.returnMessage || '',
        correlationId
      );

      // Handle specific status changes
      const status = paymentDetails.payment?.status;
      if (status === 2) { // Payment approved
        await this.handlePaymentApproved(notification, paymentDetails, correlationId);
      } else if (status === 3) { // Payment declined
        await this.handlePaymentDeclined(notification, paymentDetails, correlationId);
      } else if (status === 10) { // Payment cancelled
        await this.handlePaymentCancelled(notification, paymentDetails, correlationId);
      }

    } catch (error) {
      console.error('❌ [CIELO-WEBHOOK] Erro ao processar mudança de status de pagamento', {
        correlationId,
        paymentId: notification.PaymentId,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      throw error;
    }
  }

  /**
   * Handle recurrency notifications
   */
  private async handleRecurrencyNotification(
    notification: CieloWebhookNotification,
    correlationId: string
  ): Promise<void> {
    console.log('🔄 [CIELO-WEBHOOK] Notificação de recorrência recebida', {
      correlationId,
      paymentId: notification.PaymentId
    });

    // This would typically involve:
    // 1. Updating subscription status
    // 2. Generating next billing cycle
    // 3. Notifying customer
  }

  /**
   * Handle chargeback notifications
   */
  private async handleChargebackNotification(
    notification: CieloWebhookNotification,
    correlationId: string
  ): Promise<void> {
    console.log('⚠️ [CIELO-WEBHOOK] Notificação de chargeback recebida', {
      correlationId,
      paymentId: notification.PaymentId
    });

    // Log critical security event
    this.logSecurityAuditEvent('chargeback_received', {
      paymentId: notification.PaymentId,
      clientOrderId: notification.ClientOrderId
    }, correlationId);

    // This would typically involve:
    // 1. Flagging the transaction
    // 2. Notifying finance team
    // 3. Updating customer account status
    // 4. Initiating dispute process if necessary
  }

  /**
   * Handle approved payment
   */
  private async handlePaymentApproved(
    notification: CieloWebhookNotification,
    paymentDetails: any,
    correlationId: string
  ): Promise<void> {
    console.log('✅ [CIELO-WEBHOOK] Pagamento aprovado', {
      correlationId,
      paymentId: notification.PaymentId,
      amount: paymentDetails.payment?.amount
    });

    try {
      // Import storage and processing function dynamically to avoid circular dependencies
      const { storage } = await import('../storage.js');
      const { processPendingPayment } = await import('../routes.js');

      // Check if there's a pending payment for this PaymentId
      const pendingPayment = await storage.getPendingPaymentByCieloId(notification.PaymentId);
      
      if (pendingPayment) {
        console.log('🔄 [CIELO-WEBHOOK] Pagamento pendente encontrado, processando...', {
          correlationId,
          paymentId: notification.PaymentId,
          customerEmail: pendingPayment.customerEmail,
          paymentMethod: pendingPayment.paymentMethod
        });

        // Process the pending payment (create client, pets, contracts)
        // Webhook só é chamado quando pagamento está APROVADO, então criar contratos com status 'active'
        const result = await processPendingPayment(pendingPayment, correlationId, 'active');
        
        console.log('✅ [CIELO-WEBHOOK] Pagamento pendente processado com sucesso', {
          correlationId,
          paymentId: notification.PaymentId,
          clientCreated: result?.client?.id,
          petsCreated: result?.pets?.length || 0,
          contractsCreated: result?.contracts?.length || 0
        });

        // Increment coupon usage if applicable
        if (pendingPayment.couponCode) {
          try {
            await storage.incrementCouponUsage(pendingPayment.couponCode);
            console.log('🎫 [CIELO-WEBHOOK] Uso do cupom incrementado:', pendingPayment.couponCode);
          } catch (couponError) {
            console.error('⚠️ [CIELO-WEBHOOK] Erro ao incrementar uso do cupom:', couponError);
          }
        }
      } else {
        console.log('ℹ️ [CIELO-WEBHOOK] Nenhum pagamento pendente encontrado para este PaymentId', {
          correlationId,
          paymentId: notification.PaymentId,
          note: 'Pagamento pode ter sido processado diretamente (cartão aprovado) ou já processado anteriormente'
        });
      }

      // Log successful payment approval for audit
      this.logSecurityAuditEvent('payment_approved', {
        paymentId: notification.PaymentId,
        clientOrderId: notification.ClientOrderId,
        amount: paymentDetails.payment?.amount,
        pendingPaymentProcessed: !!pendingPayment
      }, correlationId);

      // Generate official payment receipt automatically
      await this.generatePaymentReceipt(notification, paymentDetails, correlationId);
      
      console.log('✅ [CIELO-WEBHOOK] Pagamento aprovado processado completamente', {
        correlationId,
        paymentId: notification.PaymentId
      });

    } catch (error) {
      console.error('❌ [CIELO-WEBHOOK] Erro ao processar pagamento aprovado', {
        correlationId,
        paymentId: notification.PaymentId,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      
      // Log error but don't throw - we don't want to break the webhook processing
      this.logSecurityAuditEvent('payment_approved_processing_failed', {
        paymentId: notification.PaymentId,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }, correlationId);
    }
  }

  /**
   * Handle declined payment
   */
  private async handlePaymentDeclined(
    notification: CieloWebhookNotification,
    paymentDetails: any,
    correlationId: string
  ): Promise<void> {
    console.log('❌ [CIELO-WEBHOOK] Pagamento recusado', {
      correlationId,
      paymentId: notification.PaymentId,
      returnCode: paymentDetails.payment?.returnCode,
      returnMessage: paymentDetails.payment?.returnMessage
    });

    // This would typically involve:
    // 1. Notifying customer of failed payment
    // 2. Offering alternative payment methods
    // 3. Setting retry schedule for subscription payments
  }

  /**
   * Handle cancelled payment
   */
  private async handlePaymentCancelled(
    notification: CieloWebhookNotification,
    paymentDetails: any,
    correlationId: string
  ): Promise<void> {
    console.log('🚫 [CIELO-WEBHOOK] Pagamento cancelado', {
      correlationId,
      paymentId: notification.PaymentId
    });

  }

  /**
   * Update payment status in database
   */
  private async updatePaymentStatusInDatabase(
    paymentId: string,
    clientOrderId: string,
    status: number,
    returnCode: string,
    returnMessage: string,
    correlationId: string
  ): Promise<void> {
    try {
      // Import storage dynamically to avoid circular dependencies
      const { storage } = await import('../storage.js');
      
      // Find contract by Cielo payment ID
      const contract = await storage.getContractByCieloPaymentId(paymentId);
      
      if (!contract) {
        console.warn('⚠️ [CIELO-WEBHOOK] Contrato não encontrado para paymentId', {
          correlationId,
          paymentId,
          clientOrderId
        });
        return;
      }

      // Map Cielo status to contract status
      // ✅ FIX: Preserve current contract status to prevent unwanted downgrades
      let contractStatus: 'active' | 'inactive' | 'suspended' | 'cancelled' | 'pending' = contract.status;
      let updatedAt = new Date();
      let receivedDate: Date | null = null;

      switch (status) {
        case 1: // Authorized
          // Only update to inactive if not already active
          if (contract.status !== 'active') {
            contractStatus = 'inactive'; // Authorized but not captured yet
          }
          break;
        case 2: // Paid/Captured
          contractStatus = 'active'; // Successfully paid and captured
          receivedDate = updatedAt;
          break;
        case 3: // Denied
          // ✅ FIX: Do NOT downgrade active contracts - payment may have been captured before denial
          if (contract.status !== 'active') {
            contractStatus = 'inactive'; // Payment denied
          }
          break;
        case 10: // Voided/Cancelled
          // ✅ FIX: Do NOT downgrade active contracts - may be a retroactive notification
          if (contract.status !== 'active') {
            contractStatus = 'cancelled'; // Payment cancelled
          }
          break;
        case 11: // Refunded
          // ✅ FIX: Do NOT downgrade active contracts - refunds need manual review
          if (contract.status !== 'active') {
            contractStatus = 'inactive'; // Refunded, may need manual review
          }
          break;
        case 12: // Pending (PIX)
          // ✅ FIX: Do NOT downgrade active contracts to inactive for pending status
          // PIX payments can send status 12 (pending) even after being paid
          // Only set to inactive if contract is not already active
          if (contract.status !== 'active') {
            contractStatus = 'inactive'; // Still pending
          }
          break;
        default:
          // ✅ FIX: Do NOT downgrade active contracts to inactive for unknown status
          if (contract.status !== 'active') {
            contractStatus = 'inactive'; // Unknown status, default to inactive
          }
      }

      // Prepare update data
      const updateData: any = {
        status: contractStatus,
        returnCode: returnCode || '',
        returnMessage: returnMessage || '',
        updatedAt
      };

      // Add received date if payment is successful
      if (receivedDate) {
        updateData.receivedDate = receivedDate;
      }

      // ✅ AUDIT LOG: Track all status changes (prevented or executed)
      if (contract.status !== contractStatus) {
        const isDowngrade = contract.status === 'active' && contractStatus !== 'active';
        const logLevel = isDowngrade ? 'warn' : 'info';
        const logMessage = isDowngrade 
          ? '⚠️ [CIELO-WEBHOOK] STATUS DOWNGRADE DETECTED'
          : '📝 [CIELO-WEBHOOK] STATUS CHANGE DETECTED';
        
        console[logLevel](logMessage, {
          correlationId,
          contractId: contract.id,
          contractNumber: contract.contractNumber,
          paymentId,
          previousStatus: contract.status,
          newStatus: contractStatus,
          statusChanged: true,
          isDowngrade,
          cieloStatus: status,
          returnCode,
          returnMessage,
          action: isDowngrade ? 'DOWNGRADE PREVENTED - keeping contract active' : 'Status updated normally'
        });
      } else if (contract.status === 'active') {
        // Log when webhook tried to change status but was prevented
        console.info('✅ [CIELO-WEBHOOK] STATUS PRESERVED - Active contract maintained', {
          correlationId,
          contractId: contract.id,
          contractNumber: contract.contractNumber,
          paymentId,
          status: contract.status,
          cieloStatus: status,
          returnCode,
          returnMessage
        });
      }

      // Update the contract
      const updatedContract = await storage.updateContract(contract.id, updateData);
      
      console.log('✅ [CIELO-WEBHOOK] Contrato atualizado no banco de dados', {
        correlationId,
        contractId: contract.id,
        contractNumber: contract.contractNumber,
        paymentId,
        oldStatus: contract.status,
        newStatus: contractStatus,
        statusChanged: contract.status !== contractStatus,
        cieloStatus: status,
        returnCode,
        returnMessage
      });

      // If payment is approved, also update installment status to 'paid'
      if (status === 2) {
        try {
          // Find installment by Cielo payment ID
          const installment = await storage.getContractInstallmentByCieloPaymentId(paymentId);
          
          if (installment) {
            console.log('📋 [CIELO-WEBHOOK] Atualizando status da mensalidade para pago', {
              correlationId,
              installmentId: installment.id,
              installmentNumber: installment.installmentNumber,
              paymentId
            });
            
            // Update installment status to 'paid'
            await storage.updateContractInstallment(installment.id, {
              status: 'paid',
              paidAt: new Date(),
              updatedAt: new Date()
            });
            
            console.log('✅ [CIELO-WEBHOOK] Mensalidade atualizada para status: paid', {
              correlationId,
              installmentId: installment.id,
              installmentNumber: installment.installmentNumber
            });
            
            // Get the full installment data with all fields
            const updatedInstallment = await storage.getContractInstallmentById(installment.id);
            
            if (updatedInstallment) {
              // Import the createNextAnnualInstallmentIfNeeded function
              const { createNextAnnualInstallmentIfNeeded } = await import('../routes.js');
              
              // Create the next installment after successful payment
              console.log('📅 [CIELO-WEBHOOK] Criando próxima parcela após pagamento PIX aprovado', {
                correlationId,
                contractId: updatedInstallment.contractId,
                installmentId: updatedInstallment.id,
                installmentNumber: updatedInstallment.installmentNumber
              });
              
              await createNextAnnualInstallmentIfNeeded(
                updatedInstallment.contractId, 
                updatedInstallment, 
                '[CIELO-WEBHOOK-PIX]'
              );
            }
          } else {
            console.warn('⚠️ [CIELO-WEBHOOK] Mensalidade não encontrada para paymentId', {
              correlationId,
              paymentId
            });
          }
        } catch (error) {
          console.error('❌ [CIELO-WEBHOOK] Erro ao atualizar status da mensalidade', {
            correlationId,
            paymentId,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        }
      }

      // Log security audit event for successful database update
      this.logSecurityAuditEvent('contract_status_updated', {
        contractId: contract.id,
        contractNumber: contract.contractNumber,
        paymentId,
        oldStatus: contract.status,
        newStatus: contractStatus,
        cieloStatus: status
      }, correlationId);
      
    } catch (error) {
      console.error('❌ [CIELO-WEBHOOK] Erro ao atualizar status no banco de dados', {
        correlationId,
        paymentId,
        clientOrderId,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Log security audit event for failed database update
      this.logSecurityAuditEvent('contract_update_failed', {
        paymentId,
        clientOrderId,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }, correlationId);
      
      throw error;
    }
  }

  /**
   * Generate official payment receipt automatically
   */
  private async generatePaymentReceipt(
    notification: CieloWebhookNotification,
    paymentDetails: any,
    correlationId: string
  ): Promise<void> {
    try {
      console.log('📄 [CIELO-WEBHOOK] Iniciando geração automática de comprovante', {
        correlationId,
        paymentId: notification.PaymentId
      });

      // Import necessary services
      const { storage } = await import('../storage.js');
      const { PaymentReceiptService } = await import('./payment-receipt-service.js');

      // Try to find contract/client data from payment or order
      let contractData: any = null;
      let clientData: any = null;

      // First, try to find contract by Cielo payment ID
      try {
        const contracts = await storage.getAllContracts();
        contractData = contracts.find(c => c.cieloPaymentId === notification.PaymentId) || null;
        
        if (contractData) {
          // Get client data from contract
          clientData = await storage.getClientById(contractData.clientId) || null;
          console.log('✅ [CIELO-WEBHOOK] Dados do contrato encontrados', {
            correlationId,
            contractId: contractData.id,
            clientName: clientData?.full_name,
            billingPeriod: contractData.billingPeriod,
            hasField: 'billingPeriod' in contractData
          });
        } else {
          console.warn('⚠️ [CIELO-WEBHOOK] Contrato não encontrado pelo PaymentId', {
            correlationId,
            paymentId: notification.PaymentId
          });
        }
      } catch (error) {
        console.error('❌ [CIELO-WEBHOOK] Erro ao buscar contrato', {
          correlationId,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }

      // If we still don't have client data, try to find by ClientOrderId
      if (!clientData && notification.ClientOrderId) {
        try {
          const clients = await storage.getAllClients();
          // ClientOrderId might contain email or client ID
          clientData = clients.find(c => 
            notification.ClientOrderId?.includes(c.email) ||
            notification.ClientOrderId?.includes(c.id)
          );

          if (clientData) {
            console.log('✅ [CIELO-WEBHOOK] Cliente encontrado pelo ClientOrderId', {
              correlationId,
              clientName: clientData.full_name
            });
          }
        } catch (error) {
          console.error('❌ [CIELO-WEBHOOK] Erro ao buscar cliente', {
            correlationId,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        }
      }

      // If we still don't have client data, we can't generate receipt
      if (!clientData) {
        console.warn('⚠️ [CIELO-WEBHOOK] Não foi possível encontrar dados do cliente para gerar comprovante', {
          correlationId,
          paymentId: notification.PaymentId,
          clientOrderId: notification.ClientOrderId
        });
        return;
      }

      // Get plan and pet data if available
      let planName: string | null | undefined = null;
      let petName: string | null | undefined = null;
      let petData: any = null;
      
      if (contractData) {
        try {
          const plan = await storage.getPlan(contractData.planId);
          const pet = await storage.getPet(contractData.petId);
          planName = plan?.name || null;
          petName = pet?.name || null;
          
          // ✅ Build complete pet data object for receipt
          if (pet && plan) {
            // ✅ CORRIGIDO: Usar APENAS valores do contrato (sem cálculo de desconto problemático)
            const contractValue = parseFloat(contractData.billingPeriod === 'annual' ? contractData.annualAmount : contractData.monthlyAmount) || 0;
            
            petData = {
              name: pet.name || 'Pet',
              species: pet.species || 'Não informado',
              breed: pet.breed || 'Não informado',
              age: pet.age ? parseInt(pet.age) : 0,
              sex: pet.sex || 'Não informado',
              planName: plan.name,
              planType: plan.name.toUpperCase(),
              value: Math.round(contractValue * 100), // valor em centavos - NECESSÁRIO para PDF
              discountedValue: Math.round(contractValue * 100) // mesmo valor (sem desconto) - NECESSÁRIO para PDF
            };
          }
        } catch (error) {
          console.error('❌ [CIELO-WEBHOOK] Erro ao buscar dados do plano/pet', {
            correlationId,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        }
      }

      // Get installment data to include installment number in receipt
      let installmentNumber: number | undefined = undefined;
      let installmentDueDate: string | undefined = undefined;
      let installmentPeriodStart: string | undefined = undefined;
      let installmentPeriodEnd: string | undefined = undefined;
      
      try {
        const installment = await storage.getContractInstallmentByCieloPaymentId(notification.PaymentId);
        if (installment) {
          installmentNumber = installment.installmentNumber;
          installmentDueDate = installment.dueDate;
          installmentPeriodStart = installment.periodStart;
          installmentPeriodEnd = installment.periodEnd;
          
          console.log('✅ [CIELO-WEBHOOK] Dados da parcela encontrados', {
            correlationId,
            installmentNumber,
            dueDate: installmentDueDate,
            periodStart: installmentPeriodStart,
            periodEnd: installmentPeriodEnd
          });
        } else if (contractData) {
          // If no installment found but contract exists, it's likely the first payment
          // This happens for PIX payments where installment is created after webhook confirms payment
          console.log('⚠️ [CIELO-WEBHOOK] Parcela não encontrada, assumindo primeira parcela para contrato recém criado', {
            correlationId,
            paymentId: notification.PaymentId,
            contractId: contractData.id
          });
          
          // Default to first installment for initial payments
          installmentNumber = 1;
          
          // Calculate period based on current date
          const now = new Date();
          const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          const dueDate = new Date(now);
          dueDate.setDate(dueDate.getDate() + 5); // Due in 5 days
          
          installmentDueDate = dueDate.toISOString().split('T')[0];
          installmentPeriodStart = periodStart.toISOString().split('T')[0];
          installmentPeriodEnd = periodEnd.toISOString().split('T')[0];
          
          console.log('✅ [CIELO-WEBHOOK] Dados padrão da primeira parcela configurados', {
            correlationId,
            installmentNumber: 1,
            periodStart: installmentPeriodStart,
            periodEnd: installmentPeriodEnd
          });
        }
      } catch (error) {
        console.error('❌ [CIELO-WEBHOOK] Erro ao buscar installment', {
          correlationId,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }

      // Generate receipt using PaymentReceiptService
      const receiptService = new PaymentReceiptService();
      const receiptData = {
        contractId: contractData?.id,
        cieloPaymentId: notification.PaymentId,
        clientName: clientData.full_name,
        clientEmail: clientData.email,
        clientCPF: clientData.cpf || undefined,
        clientPhone: clientData.phone || undefined,
        clientAddress: clientData.address && clientData.cep ? {
          street: clientData.address,
          number: clientData.number || 'S/N',
          complement: clientData.complement || '',
          neighborhood: clientData.district || '',
          city: clientData.city || '',
          state: clientData.state || '',
          zipCode: clientData.cep
        } : undefined,
        // ✅ Include pets array with complete pet data
        pets: petData ? [petData] : undefined,
        // ✅ Keep backward compatibility
        petName: petName || undefined,
        planName: planName || undefined,
        paymentAmount: paymentDetails.payment?.amount || 0,
        paymentDate: paymentDetails.payment?.receivedDate || new Date().toISOString(),
        paymentMethod: paymentDetails.payment?.type === 'Pix' ? 'pix' : 'credit_card',
        billingPeriod: (contractData?.billingPeriod === 'annual' ? 'annual' : 'monthly') as 'monthly' | 'annual',
        status: 'paid',
        proofOfSale: paymentDetails.payment?.proofOfSale,
        authorizationCode: paymentDetails.payment?.authorizationCode,
        tid: paymentDetails.payment?.tid,
        installmentNumber: installmentNumber,
        installmentDueDate: installmentDueDate,
        installmentPeriodStart: installmentPeriodStart,
        installmentPeriodEnd: installmentPeriodEnd
      };

      console.log('📄 [CIELO-WEBHOOK] Gerando comprovante oficial com dados:', {
        correlationId,
        clientName: receiptData.clientName,
        petName: receiptData.petName,
        planName: receiptData.planName,
        installmentNumber: receiptData.installmentNumber
      });

      const result = await receiptService.generatePaymentReceipt(receiptData, correlationId);

      if (result.success) {
        console.log('✅ [CIELO-WEBHOOK] Comprovante oficial gerado automaticamente', {
          correlationId,
          receiptId: result.receiptId,
          pdfUrl: result.pdfUrl
        });


        // ✅ VINCULAR O COMPROVANTE À MENSALIDADE (INSTALLMENT)
        try {
          // Find the installment by Cielo payment ID
          const installment = await storage.getContractInstallmentByCieloPaymentId(notification.PaymentId);
          
          if (installment) {
            // Update the installment with the receipt ID
            await storage.updateContractInstallment(installment.id, {
              paymentReceiptId: result.receiptId,
              status: 'paid',
              paidAt: new Date()
            });
            
            console.log('✅ [CIELO-WEBHOOK] Próxima Mensalidadeizada com receiptId', {
              correlationId,
              installmentId: installment.id,
              receiptId: result.receiptId
            });
          } else {
            console.warn('⚠️ [CIELO-WEBHOOK] Mensalidade não encontrada para vincular o comprovante', {
              correlationId,
              paymentId: notification.PaymentId
            });
          }
        } catch (linkError) {
          console.error('❌ [CIELO-WEBHOOK] Erro ao vincular comprovante à mensalidade', {
            correlationId,
            error: linkError instanceof Error ? linkError.message : 'Erro desconhecido'
          });
        }
        // Log success audit event
        this.logSecurityAuditEvent('payment_receipt_generated', {
          paymentId: notification.PaymentId,
          receiptId: result.receiptId,
          clientEmail: clientData.email
        }, correlationId);

      } else {
        console.error('❌ [CIELO-WEBHOOK] Erro na geração do comprovante', {
          correlationId,
          error: result.error
        });

        // Log failure audit event
        this.logSecurityAuditEvent('payment_receipt_generation_failed', {
          paymentId: notification.PaymentId,
          error: result.error,
          clientEmail: clientData.email
        }, correlationId);
      }

    } catch (error) {
      console.error('❌ [CIELO-WEBHOOK] Erro crítico na geração automática de comprovante', {
        correlationId,
        paymentId: notification.PaymentId,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      });

      // Log critical failure
      this.logSecurityAuditEvent('payment_receipt_generation_critical_error', {
        paymentId: notification.PaymentId,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }, correlationId);
    }
  }

  /**
   * Log security audit events
   */
  private logSecurityAuditEvent(event: string, details: any, correlationId: string): void {
    const auditLog = {
      timestamp: new Date().toISOString(),
      event,
      service: 'CieloWebhookService',
      correlationId,
      details: {
        ...details,
        ipAddress: 'webhook', // Will be populated by the route handler
        userAgent: 'Cielo-Webhook'
      }
    };

    console.log('🔒 [SECURITY-AUDIT] Cielo Webhook Security Event', auditLog);
  }

  /**
   * Get webhook configuration for Cielo dashboard
   */
  getWebhookConfiguration(): {
    url: string;
    events: string[];
    format: string;
  } {
    const baseUrl = process.env.WEBHOOK_BASE_URL || 'https://localhost:3000';

    return {
      url: `${baseUrl}/api/webhooks/cielo`,
      events: [
        'payment.status.changed',
        'recurrency.created',
        'chargeback.received'
      ],
      format: 'JSON'
    };
  }
}

export default CieloWebhookService;
