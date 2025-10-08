import nodemailer from 'nodemailer';
import type { Contract } from '../../shared/schema.js';

interface EmailNotificationData {
  to: string;
  subject: string;
  html: string;
  clientName: string;
}

interface PaymentReminderData {
  clientName: string;
  clientEmail: string;
  dueDate: Date;
  amount: number;
  planName: string;
  petName: string;
  daysUntilDue: number;
}

interface PaymentOverdueData {
  clientName: string;
  clientEmail: string;
  dueDate: Date;
  amount: number;
  planName: string;
  petName: string;
  daysOverdue: number;
}

export class NotificationService {
  private transporter: any | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@unipetplan.com';

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn('[NotificationService] SMTP não configurado. Variáveis necessárias: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS');
      console.warn('[NotificationService] Notificações por email serão simuladas (logs apenas)');
      this.isConfigured = false;
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort || '587'),
        secure: smtpPort === '465',
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      this.isConfigured = true;
      console.log('[NotificationService] SMTP configurado com sucesso');
    } catch (error) {
      console.error('[NotificationService] Erro ao configurar SMTP:', error);
      this.isConfigured = false;
    }
  }

  private async sendEmail(data: EmailNotificationData): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      console.log('[NotificationService] SIMULAÇÃO de email:');
      console.log(`  Para: ${data.to}`);
      console.log(`  Assunto: ${data.subject}`);
      console.log(`  Cliente: ${data.clientName}`);
      return true;
    }

    try {
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM_EMAIL || '"UNIPET PLAN" <noreply@unipetplan.com>',
        to: data.to,
        subject: data.subject,
        html: data.html,
      });

      console.log('[NotificationService] Email enviado com sucesso:', info.messageId);
      return true;
    } catch (error) {
      console.error('[NotificationService] Erro ao enviar email:', error);
      return false;
    }
  }

  async sendPaymentReminder(data: PaymentReminderData): Promise<boolean> {
    const formattedDueDate = new Date(data.dueDate).toLocaleDateString('pt-BR');
    const formattedAmount = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(data.amount);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .highlight { background-color: #FEF3C7; padding: 15px; border-left: 4px solid #F59E0B; margin: 20px 0; }
          .button { display: inline-block; background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6B7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🐾 UNIPET PLAN</h1>
          </div>
          <div class="content">
            <h2>Olá, ${data.clientName}!</h2>
            <p>Este é um lembrete amigável sobre o pagamento do seu plano de saúde veterinária.</p>
            
            <div class="highlight">
              <strong>⏰ Seu pagamento vence em ${data.daysUntilDue} dia(s)</strong>
            </div>

            <p><strong>Detalhes do pagamento:</strong></p>
            <ul>
              <li><strong>Pet:</strong> ${data.petName}</li>
              <li><strong>Plano:</strong> ${data.planName}</li>
              <li><strong>Valor:</strong> ${formattedAmount}</li>
              <li><strong>Vencimento:</strong> ${formattedDueDate}</li>
            </ul>

            <p>Para evitar a suspensão do serviço, por favor efetue o pagamento até a data de vencimento.</p>

            <center>
              <a href="${process.env.REPLIT_DEV_DOMAIN || 'https://unipetplan.com'}/cliente/financeiro" class="button">
                Acessar Área Financeira
              </a>
            </center>

            <p>Se você já efetuou o pagamento, por favor desconsidere este aviso.</p>
          </div>
          <div class="footer">
            <p>UNIPET PLAN - Cuidando da saúde do seu melhor amigo</p>
            <p>Este é um email automático, por favor não responda.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: data.clientEmail,
      subject: `⏰ Lembrete: Pagamento UNIPET PLAN vence em ${data.daysUntilDue} dia(s)`,
      html,
      clientName: data.clientName,
    });
  }

  async sendPaymentOverdueNotification(data: PaymentOverdueData): Promise<boolean> {
    const formattedDueDate = new Date(data.dueDate).toLocaleDateString('pt-BR');
    const formattedAmount = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(data.amount);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #DC2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .alert { background-color: #FEE2E2; padding: 15px; border-left: 4px solid #DC2626; margin: 20px 0; }
          .button { display: inline-block; background-color: #DC2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6B7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🐾 UNIPET PLAN</h1>
          </div>
          <div class="content">
            <h2>Atenção, ${data.clientName}!</h2>
            <p>Identificamos que seu pagamento está em atraso.</p>
            
            <div class="alert">
              <strong>⚠️ Pagamento em atraso: ${data.daysOverdue} dia(s)</strong>
            </div>

            <p><strong>Detalhes do pagamento:</strong></p>
            <ul>
              <li><strong>Pet:</strong> ${data.petName}</li>
              <li><strong>Plano:</strong> ${data.planName}</li>
              <li><strong>Valor:</strong> ${formattedAmount}</li>
              <li><strong>Vencimento:</strong> ${formattedDueDate}</li>
            </ul>

            <p><strong>Importante:</strong> Para evitar a suspensão ou cancelamento do seu plano, regularize sua situação o quanto antes.</p>

            <p>Período de tolerância:</p>
            <ul>
              <li>Até 15 dias: Serviço mantido (período de carência)</li>
              <li>16 a 60 dias: Serviço suspenso</li>
              <li>Acima de 60 dias: Cancelamento automático</li>
            </ul>

            <center>
              <a href="${process.env.REPLIT_DEV_DOMAIN || 'https://unipetplan.com'}/cliente/financeiro" class="button">
                Regularizar Pagamento
              </a>
            </center>

            <p>Se você tiver dúvidas ou dificuldades, entre em contato conosco.</p>
          </div>
          <div class="footer">
            <p>UNIPET PLAN - Cuidando da saúde do seu melhor amigo</p>
            <p>Este é um email automático, por favor não responda.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: data.clientEmail,
      subject: `⚠️ URGENTE: Pagamento UNIPET PLAN em atraso (${data.daysOverdue} dia(s))`,
      html,
      clientName: data.clientName,
    });
  }

  async sendRenewalSuccessNotification(
    clientName: string,
    clientEmail: string,
    amount: number,
    planName: string,
    petName: string
  ): Promise<boolean> {
    const formattedAmount = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .success { background-color: #D1FAE5; padding: 15px; border-left: 4px solid #10B981; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6B7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🐾 UNIPET PLAN</h1>
          </div>
          <div class="content">
            <h2>Ótimas notícias, ${clientName}!</h2>
            
            <div class="success">
              <strong>✅ Renovação automática processada com sucesso!</strong>
            </div>

            <p>Seu plano foi renovado automaticamente e continuará ativo.</p>

            <p><strong>Detalhes da renovação:</strong></p>
            <ul>
              <li><strong>Pet:</strong> ${petName}</li>
              <li><strong>Plano:</strong> ${planName}</li>
              <li><strong>Valor:</strong> ${formattedAmount}</li>
              <li><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</li>
            </ul>

            <p>Você pode visualizar o comprovante de pagamento na sua área financeira.</p>

            <p>Obrigado por confiar na UNIPET PLAN para cuidar do seu pet! 🐶🐱</p>
          </div>
          <div class="footer">
            <p>UNIPET PLAN - Cuidando da saúde do seu melhor amigo</p>
            <p>Este é um email automático, por favor não responda.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: clientEmail,
      subject: '✅ Renovação UNIPET PLAN confirmada com sucesso',
      html,
      clientName,
    });
  }

  async sendRenewalFailureNotification(
    clientName: string,
    clientEmail: string,
    amount: number,
    planName: string,
    petName: string,
    reason: string
  ): Promise<boolean> {
    const formattedAmount = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #F59E0B; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .warning { background-color: #FEF3C7; padding: 15px; border-left: 4px solid #F59E0B; margin: 20px 0; }
          .button { display: inline-block; background-color: #F59E0B; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6B7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🐾 UNIPET PLAN</h1>
          </div>
          <div class="content">
            <h2>Atenção, ${clientName}!</h2>
            
            <div class="warning">
              <strong>⚠️ Não foi possível processar a renovação automática</strong>
            </div>

            <p>Tentamos renovar seu plano automaticamente, mas não foi possível concluir o pagamento.</p>

            <p><strong>Detalhes:</strong></p>
            <ul>
              <li><strong>Pet:</strong> ${petName}</li>
              <li><strong>Plano:</strong> ${planName}</li>
              <li><strong>Valor:</strong> ${formattedAmount}</li>
              <li><strong>Motivo:</strong> ${reason}</li>
            </ul>

            <p><strong>O que fazer agora:</strong></p>
            <ol>
              <li>Verifique os dados do seu cartão de crédito</li>
              <li>Certifique-se de que há limite disponível</li>
              <li>Acesse a área financeira para efetuar o pagamento manualmente</li>
            </ol>

            <center>
              <a href="${process.env.REPLIT_DEV_DOMAIN || 'https://unipetplan.com'}/cliente/financeiro" class="button">
                Efetuar Pagamento
              </a>
            </center>

            <p>Tentaremos novamente automaticamente em 3 dias. Para evitar suspensão do serviço, recomendamos regularizar o quanto antes.</p>
          </div>
          <div class="footer">
            <p>UNIPET PLAN - Cuidando da saúde do seu melhor amigo</p>
            <p>Este é um email automático, por favor não responda.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: clientEmail,
      subject: '⚠️ Atenção: Falha na renovação automática UNIPET PLAN',
      html,
      clientName,
    });
  }
}

export const notificationService = new NotificationService();
