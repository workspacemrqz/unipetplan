import { z } from "zod";
import * as https from 'https';
import { randomUUID } from 'crypto';

// Interfaces para a API Cielo
export interface CieloConfig {
  merchantId: string;
  merchantKey: string;
  apiUrl: string;
  queryUrl: string;
  environment: 'sandbox' | 'production';
  timeout?: number;
  maxRetries?: number;
  rateLimitDelay?: number;
}

// Custom error classes for better error handling
export class CieloApiError extends Error {
  constructor(
    public statusCode: number,
    public apiCode?: string,
    message?: string,
    public correlationId?: string
  ) {
    super(message || 'Erro na API Cielo');
    this.name = 'CieloApiError';
  }
}

export class CieloTimeoutError extends Error {
  constructor(public correlationId?: string) {
    super('Timeout na requisição para API Cielo');
    this.name = 'CieloTimeoutError';
  }
}

// Rate limiter for external API calls
class ApiRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs = 60000; // 1 minuto
  private readonly maxRequests = 30; // 30 requests por minuto

  canMakeRequest(key: string = 'default'): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove requests older than window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    this.requests.set(key, validRequests);
    
    return validRequests.length < this.maxRequests;
  }

  recordRequest(key: string = 'default'): void {
    const requests = this.requests.get(key) || [];
    requests.push(Date.now());
    this.requests.set(key, requests);
  }

  async waitForSlot(key: string = 'default'): Promise<void> {
    while (!this.canMakeRequest(key)) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    this.recordRequest(key);
  }
}

export interface CreditCardPaymentRequest {
  merchantOrderId: string;
  customer: {
    name: string;
    identity?: string;
    identityType?: 'CPF' | 'CNPJ';
    email?: string;
    birthdate?: string;
    address?: {
      street: string;
      number: string;
      complement?: string;
      zipCode: string;
      city: string;
      state: string;
      country?: string;
    };
  };
  payment: {
    type: 'CreditCard';
    amount: number; // em centavos
    installments: number;
    softDescriptor?: string;
    capture?: boolean;
    authenticate?: boolean;
    returnUrl?: string;
    creditCard: {
      cardNumber: string;
      holder: string;
      expirationDate: string; // MM/YYYY
      securityCode: string;
      brand?: string;
      saveCard?: boolean;
    };
  };
}



export interface PixPaymentRequest {
  MerchantOrderId: string;
  Customer: {
    Name: string;
    Identity?: string;
    IdentityType?: 'CPF' | 'CNPJ';
    Email?: string;
  };
  Payment: {
    Type: 'Pix';
    Amount: number;
    Provider?: 'Cielo';
  };
}

export interface CieloPaymentResponse {
  merchantOrderId: string;
  customer: any;
  payment: {
    serviceId?: string;
    serviceTaxAmount?: number;
    installments: number;
    interest?: number;
    capture: boolean;
    authenticate: boolean;
    recurrent?: boolean;
    creditCard?: any;
    debitCard?: any;
    tid: string;
    proofOfSale: string;
    authorizationCode?: string;
    softDescriptor?: string;
    provider?: string;
    paymentId: string;
    type: string;
    amount: number;
    receivedDate: string;
    capturedAmount?: number;
    capturedDate?: string;
    currency: string;
    country: string;
    returnCode: string;
    returnMessage: string;
    status: number;
    links?: Array<{
      method: string;
      rel: string;
      href: string;
    }>;
    // PIX specific fields
    qrCodeBase64Image?: string;
    qrCodeString?: string;
    pixKey?: string;
  };
}

export class CieloService {
  private config: CieloConfig;
  private rateLimiter = new ApiRateLimiter();
  private tokenData?: {
    token: string;
    expiresAt: number;
    refreshToken?: string;
  };

  constructor(config?: Partial<CieloConfig>) {
    // Force explicit configuration to avoid accidental sandbox usage in production
    if (!process.env.CIELO_API_URL) {
      throw new Error('CIELO_API_URL deve ser configurado explicitamente nas variáveis de ambiente');
    }
    if (!process.env.CIELO_QUERY_URL) {
      throw new Error('CIELO_QUERY_URL deve ser configurado explicitamente nas variáveis de ambiente');
    }
    if (!process.env.CIELO_MERCHANT_ID || !process.env.CIELO_MERCHANT_KEY) {
      throw new Error('CIELO_MERCHANT_ID e CIELO_MERCHANT_KEY devem ser configurados nas variáveis de ambiente');
    }

    // Usar ambiente de produção conforme configurado nas variáveis de ambiente
    const isProduction = process.env.CIELO_ENVIRONMENT === 'production';
    
    this.config = {
      merchantId: config?.merchantId || process.env.CIELO_MERCHANT_ID,
      merchantKey: config?.merchantKey || process.env.CIELO_MERCHANT_KEY,
      apiUrl: config?.apiUrl || process.env.CIELO_API_URL || (isProduction ? 'https://api.cieloecommerce.cielo.com.br' : 'https://apisandbox.cieloecommerce.cielo.com.br'),
      queryUrl: config?.queryUrl || process.env.CIELO_QUERY_URL || (isProduction ? 'https://apiquery.cieloecommerce.cielo.com.br' : 'https://apiquerysandbox.cieloecommerce.cielo.com.br'),
      environment: (isProduction ? 'production' : 'sandbox') as 'sandbox' | 'production',
      timeout: config?.timeout || 30000,
      maxRetries: config?.maxRetries || 3,
      rateLimitDelay: config?.rateLimitDelay || 1000
    };
  }

  private getHeaders(correlationId?: string): Record<string, string> {
    const requestId = correlationId || this.generateRequestId();
    
    return {
      'Content-Type': 'application/json',
      'MerchantId': this.config.merchantId,
      'MerchantKey': this.config.merchantKey,
      'RequestId': requestId,
      'X-Correlation-ID': requestId,
      'User-Agent': 'UNIPET-PLAN/1.0'
    };
  }

  private generateRequestId(): string {
    return randomUUID();
  }

  // Secure HTTPS agent with certificate validation
  private getHttpsAgent(): https.Agent {
    return new https.Agent({
      rejectUnauthorized: true,
      keepAlive: true,
      timeout: this.config.timeout,
      checkServerIdentity: (host, cert) => {
        // Additional certificate validation if needed
        return undefined;
      }
    });
  }

  // Retry logic with exponential backoff
  private async withRetry<T>(
    operation: () => Promise<T>,
    correlationId: string,
    context: string
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.maxRetries!; attempt++) {
      try {
        await this.rateLimiter.waitForSlot('cielo');
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on authentication or validation errors
        if (error instanceof CieloApiError && [400, 401, 403].includes(error.statusCode)) {
          throw error;
        }
        
        if (attempt === this.config.maxRetries) {
          console.error(`🚨 [Cielo] ${context} falhou após ${this.config.maxRetries} tentativas`, {
            correlationId,
            error: lastError.message
          });
          throw lastError;
        }
        
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.warn(`⚠️ [Cielo] ${context} tentativa ${attempt} falhou, aguardando ${delay}ms`, {
          correlationId,
          error: lastError.message
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  // Secure fetch with timeout and SSL validation
  private async secureFetch(
    url: string, 
    options: RequestInit, 
    correlationId: string
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.config.timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        // Note: In Node.js environment, you would use the HTTPS agent here
        // agent: this.getHttpsAgent() // For Node.js fetch polyfills
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new CieloTimeoutError(correlationId);
      }
      
      throw error;
    }
  }

  // Sanitize error messages to avoid exposing sensitive information
  private sanitizeErrorMessage(error: string): string {
    // Remove sensitive information from error messages
    return error
      .replace(/merchantid[^\s]*/gi, 'MERCHANT_ID_HIDDEN')
      .replace(/merchantkey[^\s]*/gi, 'MERCHANT_KEY_HIDDEN')
      .replace(/\b\d{16}\b/g, 'CARD_NUMBER_HIDDEN')
      .replace(/\b\d{3,4}\b/g, 'CVV_HIDDEN');
  }

  async createCreditCardPayment(paymentData: CreditCardPaymentRequest): Promise<CieloPaymentResponse> {
    const correlationId = this.generateRequestId();
    
    return this.withRetry(async () => {
      console.log('🔄 [Cielo] Processando pagamento com cartão de crédito', { 
        correlationId,
        merchantId: this.config.merchantId?.substring(0, 8) + '...', // Log parcial para debug
        environment: this.config.environment,
        apiUrl: this.config.apiUrl
      });
      
      // Verificação detalhada das credenciais para cartão
      if (!this.config.merchantId || !this.config.merchantKey) {
        console.error('❌ [Cielo] Erro de credenciais para cartão:', {
          hasMerchantId: !!this.config.merchantId,
          hasMerchantKey: !!this.config.merchantKey,
          merchantIdLength: this.config.merchantId?.length || 0,
          merchantKeyLength: this.config.merchantKey?.length || 0,
          environment: this.config.environment,
          apiUrl: this.config.apiUrl
        });
        throw new CieloApiError(401, 'INVALID_CREDENTIALS', 'Credenciais Cielo não configuradas para cartão', correlationId);
      }

      // Validate input data
      this.validatePaymentData(paymentData);
      
      const headers = this.getHeaders(correlationId);
      
      // 🚀 FORMATO OFICIAL CIELO 2025 - CARTÃO DE CRÉDITO
      const cieloPayload = {
        MerchantOrderId: paymentData.merchantOrderId,
        Customer: {
          Name: paymentData.customer.name,
          Identity: paymentData.customer.identity || '',
          IdentityType: paymentData.customer.identityType || 'CPF',
          Email: paymentData.customer.email || '',
          ...(paymentData.customer.address && {
            Address: {
              Street: paymentData.customer.address.street,
              Number: paymentData.customer.address.number,
              Complement: paymentData.customer.address.complement || '',
              ZipCode: this.cleanZipCode(paymentData.customer.address.zipCode),
              City: paymentData.customer.address.city,
              State: paymentData.customer.address.state,
              Country: paymentData.customer.address.country || 'BRA'
            }
          })
        },
        Payment: {
          Type: 'CreditCard',
          Amount: paymentData.payment.amount,
          Installments: paymentData.payment.installments,
          Capture: paymentData.payment.capture !== false,
          SoftDescriptor: 'UNIPETPLAN', // Max 13 caracteres, apenas letras e números
          CreditCard: {
            CardNumber: paymentData.payment.creditCard.cardNumber.replace(/\s/g, ''),
            Holder: paymentData.payment.creditCard.holder.toUpperCase(),
            ExpirationDate: this.formatExpirationDate(paymentData.payment.creditCard.expirationDate),
            SecurityCode: paymentData.payment.creditCard.securityCode,
            Brand: paymentData.payment.creditCard.brand || this.detectCardBrand(paymentData.payment.creditCard.cardNumber),
            SaveCard: paymentData.payment.creditCard.saveCard || false, // Salvar cartão para cobrança recorrente
          }
        }
      };

      
      console.log('🔄 [Cielo] Enviando formato oficial 2025 para cartão:', {
        MerchantOrderId: cieloPayload.MerchantOrderId,
        Payment: {
          Type: cieloPayload.Payment.Type,
          Amount: cieloPayload.Payment.Amount,
          Installments: cieloPayload.Payment.Installments,
          CreditCard: {
            cardNumber: `****${cieloPayload.Payment.CreditCard.CardNumber.slice(-4)}`,
            holder: cieloPayload.Payment.CreditCard.Holder,
            brand: cieloPayload.Payment.CreditCard.Brand,
            expirationDate: cieloPayload.Payment.CreditCard.ExpirationDate
          }
        }
      });

      const response = await this.secureFetch(`${this.config.apiUrl}/1/sales`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(cieloPayload),
      }, correlationId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [Cielo] Erro na API de cartão - Resposta completa:', {
          correlationId,
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText,
          requestUrl: `${this.config.apiUrl}/1/sales`,
          merchantIdPreview: this.config.merchantId?.substring(0, 8) + '...'
        });
        
        // Verificar se é um erro de autenticação específico
        if (response.status === 401 || errorText.toLowerCase().includes('unauthorized') || errorText.toLowerCase().includes('credenciais')) {
          throw new CieloApiError(401, 'INVALID_CREDENTIALS', `Credenciais inválidas na Cielo para cartão (Status: ${response.status}): ${errorText}`, correlationId);
        }
        
        const sanitizedError = this.sanitizeErrorMessage(errorText);
        throw new CieloApiError(response.status, 'API_ERROR', `${sanitizedError} (Status: ${response.status})`, correlationId);
      }

      const result: CieloPaymentResponse = await response.json();
      
      
      // Normalizar resposta da Cielo que retorna em PascalCase
      const resultAny = result as any;
      const payment = resultAny.Payment || result.payment;
      
      // SECURITY FIX: Log apenas informações não sensíveis (sem fullResponse)
      console.log('📋 [Cielo] Resposta Credit Card recebida:', {
        correlationId,
        responseStatus: response.status,
        paymentId: payment?.PaymentId || payment?.paymentId,
        status: payment?.Status || payment?.status
      });
      
      
      // Normalizar resposta para compatibilidade com frontend
      if (resultAny.Payment && !result.payment) {
        (result as any).payment = {
          paymentId: resultAny.Payment.PaymentId,
          status: resultAny.Payment.Status,
          returnCode: resultAny.Payment.ReturnCode,
          returnMessage: resultAny.Payment.ReturnMessage,
          authorizationCode: resultAny.Payment.AuthorizationCode,
          tid: resultAny.Payment.Tid,
          proofOfSale: resultAny.Payment.ProofOfSale,
          amount: resultAny.Payment.Amount,
          capturedAmount: resultAny.Payment.CapturedAmount,
          receivedDate: resultAny.Payment.ReceivedDate,
          capturedDate: resultAny.Payment.CapturedDate,
          type: resultAny.Payment.Type,
          currency: resultAny.Payment.Currency || 'BRL',
          country: resultAny.Payment.Country || 'BRA',
          installments: resultAny.Payment.Installments || 1,
          capture: resultAny.Payment.Status === 2,
          authenticate: false,
          provider: resultAny.Payment.Provider || 'Cielo',
          // Adicionar CardToken e dados do cartão quando SaveCard=true
          creditCard: resultAny.Payment.CreditCard ? {
            cardToken: resultAny.Payment.CreditCard.CardToken,
            brand: resultAny.Payment.CreditCard.Brand || paymentData.payment.creditCard.brand,
            lastDigits: paymentData.payment.creditCard.cardNumber.slice(-4)
          } : undefined
        };
      }
      
      console.log('✅ [Cielo] Credit Card processado com sucesso', { 
        correlationId, 
        paymentId: payment?.PaymentId || payment?.paymentId,
        status: payment?.Status || payment?.status
      });
      
      return result;
    }, correlationId, 'createCreditCardPayment');
  }



  async createPixPayment(paymentData: PixPaymentRequest): Promise<CieloPaymentResponse> {
    const correlationId = this.generateRequestId();
    
    return this.withRetry(async () => {
      console.log('🔄 [Cielo] Processando pagamento PIX', { correlationId });
      
      if (!this.config.merchantId || !this.config.merchantKey) {
        throw new CieloApiError(401, 'INVALID_CREDENTIALS', 'Credenciais Cielo não configuradas', correlationId);
      }

      // Validate input data
      this.validatePixData(paymentData);
      
      const headers = this.getHeaders(correlationId);

      const response = await this.secureFetch(`${this.config.apiUrl}/1/sales`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(paymentData),
      }, correlationId);

      if (!response.ok) {
        const errorText = await response.text();
        const sanitizedError = this.sanitizeErrorMessage(errorText);
        throw new CieloApiError(response.status, 'API_ERROR', sanitizedError, correlationId);
      }

      const result: CieloPaymentResponse = await response.json();
      
      
      // Cielo retorna dados em PascalCase, não camelCase! Precisamos usar any para acessar
      const resultAny = result as any;
      const payment = resultAny.Payment || result.payment;
      
      
      // SECURITY FIX: Log apenas informações não sensíveis
      console.log('📋 [Cielo] Resposta PIX recebida:', {
        correlationId,
        responseStatus: response.status,
        paymentId: payment?.PaymentId || payment?.paymentId,
        status: payment?.Status || payment?.status
      });
      
      // Normalizar resposta para compatibilidade com frontend
      if (resultAny.Payment && !result.payment) {
        (result as any).payment = {
          paymentId: resultAny.Payment.PaymentId,
          qrCodeBase64Image: resultAny.Payment.QrCodeBase64Image,
          qrCodeString: resultAny.Payment.QrCodeString,
          status: resultAny.Payment.Status,
          returnCode: resultAny.Payment.ReturnCode,
          returnMessage: resultAny.Payment.ReturnMessage
        };
      }
      
      return result;
    }, correlationId, 'createPixPayment');
  }

  async queryPayment(paymentId: string): Promise<CieloPaymentResponse> {
    const correlationId = this.generateRequestId();
    
    return this.withRetry(async () => {
      console.log('🔍 [Cielo] Consultando pagamento', { correlationId, paymentId });
      
      if (!this.config.merchantId || !this.config.merchantKey) {
        throw new CieloApiError(401, 'INVALID_CREDENTIALS', 'Credenciais Cielo não configuradas', correlationId);
      }

      if (!paymentId || typeof paymentId !== 'string') {
        throw new CieloApiError(400, 'INVALID_PAYMENT_ID', 'ID do pagamento é obrigatório', correlationId);
      }

      const headers = {
        'MerchantId': this.config.merchantId,
        'MerchantKey': this.config.merchantKey,
        'X-Correlation-ID': correlationId,
        'User-Agent': 'UNIPET-PLAN/1.0'
      };

      // ✅ URL CORRETA para Query API da Cielo
      const queryApiUrl = `${this.config.queryUrl}/1/sales/${paymentId}`;
      console.log('🔗 [Cielo] URL de consulta:', queryApiUrl);

      const response = await this.secureFetch(queryApiUrl, {
        method: 'GET',
        headers: headers,
      }, correlationId);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ [Cielo] Erro na consulta:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          correlationId
        });
        const sanitizedError = this.sanitizeErrorMessage(errorText);
        throw new CieloApiError(response.status, 'QUERY_ERROR', sanitizedError, correlationId);
      }

      const result: CieloPaymentResponse = await response.json();
      
      // ✅ CORRIGIR: A API da Cielo retorna "Payment" com maiúscula
      const cieloResponse = result as any;
      const payment = cieloResponse.Payment; // MAIÚSCULA!
      
      if (payment) {
        // Mapear o status da Cielo para nosso formato
        let mappedStatus = 'pending';
        const cieloStatus = payment.Status;
        
        if (cieloStatus === 1) {
          mappedStatus = 'pending'; // Authorized
        } else if (cieloStatus === 2) {
          mappedStatus = 'approved'; // Paid/Captured ✅
        } else if (cieloStatus === 3) {
          mappedStatus = 'declined'; // Denied
        } else if (cieloStatus === 10) {
          mappedStatus = 'cancelled'; // Voided
        } else if (cieloStatus === 11) {
          mappedStatus = 'refunded'; // Refunded
        } else if (cieloStatus === 12) {
          mappedStatus = 'pending'; // Pending
        } else if (cieloStatus === 13) {
          mappedStatus = 'cancelled'; // Aborted
        } else if (cieloStatus === 20) {
          mappedStatus = 'pending'; // Scheduled
        }

        // Criar resposta normalizada
        const normalizedResult: CieloPaymentResponse = {
          ...result,
          payment: {
            status: mappedStatus as any,
            paymentId: payment.PaymentId,
            returnCode: payment.ReturnCode || '0',
            returnMessage: payment.ReturnMessage || 'Success',
            amount: payment.Amount,
            capturedAmount: payment.CapturedAmount || payment.Amount,
            receivedDate: payment.ReceivedDate,
            capturedDate: payment.CapturedDate,
            type: payment.Type,
            // Campos obrigatórios da interface
            installments: payment.Installments || 1,
            capture: payment.Status === 2,
            authenticate: false,
            tid: payment.Tid || '',
            proofOfSale: payment.ProofOfSale || '',
            currency: payment.Currency || 'BRL',
            country: payment.Country || 'BRA',
            provider: payment.Provider || 'Cielo'
          }
        };

        console.log('✅ [Cielo] Status interpretado corretamente:', {
          correlationId,
          paymentId,
          cieloStatus: payment.Status,
          mappedStatus,
          capturedAmount: payment.CapturedAmount,
          capturedDate: payment.CapturedDate,
          isApproved: mappedStatus === 'approved'
        });
        
        return normalizedResult;
      }
      
      // Fallback se não encontrar Payment
      console.log('⚠️ [Cielo] Resposta sem campo Payment:', {
        correlationId,
        paymentId,
        responseKeys: Object.keys(result)
      });
      
      return result;
    }, correlationId, 'queryPayment');
  }

  async capturePayment(paymentId: string, amount?: number): Promise<CieloPaymentResponse> {
    const correlationId = this.generateRequestId();
    
    return this.withRetry(async () => {
      console.log('💰 [Cielo] Capturando pagamento', { correlationId, paymentId, amount });
      
      if (!this.config.merchantId || !this.config.merchantKey) {
        throw new CieloApiError(401, 'INVALID_CREDENTIALS', 'Credenciais Cielo não configuradas', correlationId);
      }

      if (!paymentId || typeof paymentId !== 'string') {
        throw new CieloApiError(400, 'INVALID_PAYMENT_ID', 'ID do pagamento é obrigatório', correlationId);
      }

      if (amount !== undefined && (typeof amount !== 'number' || amount <= 0)) {
        throw new CieloApiError(400, 'INVALID_AMOUNT', 'Valor deve ser um número positivo', correlationId);
      }

      const url = amount 
        ? `${this.config.apiUrl}/1/sales/${paymentId}/capture?amount=${amount}`
        : `${this.config.apiUrl}/1/sales/${paymentId}/capture`;

      const headers = {
        'MerchantId': this.config.merchantId,
        'MerchantKey': this.config.merchantKey,
        'X-Correlation-ID': correlationId,
        'User-Agent': 'UNIPET-PLAN/1.0'
      };

      const response = await this.secureFetch(url, {
        method: 'PUT',
        headers: headers,
      }, correlationId);

      if (!response.ok) {
        const errorText = await response.text();
        const sanitizedError = this.sanitizeErrorMessage(errorText);
        throw new CieloApiError(response.status, 'CAPTURE_ERROR', sanitizedError, correlationId);
      }

      const result: CieloPaymentResponse = await response.json();
      console.log('✅ [Cielo] Pagamento capturado com sucesso', { 
        correlationId, 
        paymentId 
      });
      
      return result;
    }, correlationId, 'capturePayment');
  }

  async cancelPayment(paymentId: string, amount?: number): Promise<CieloPaymentResponse> {
    const correlationId = this.generateRequestId();
    
    return this.withRetry(async () => {
      console.log('❌ [Cielo] Cancelando pagamento', { correlationId, paymentId, amount });
      
      if (!this.config.merchantId || !this.config.merchantKey) {
        throw new CieloApiError(401, 'INVALID_CREDENTIALS', 'Credenciais Cielo não configuradas', correlationId);
      }

      if (!paymentId || typeof paymentId !== 'string') {
        throw new CieloApiError(400, 'INVALID_PAYMENT_ID', 'ID do pagamento é obrigatório', correlationId);
      }

      if (amount !== undefined && (typeof amount !== 'number' || amount <= 0)) {
        throw new CieloApiError(400, 'INVALID_AMOUNT', 'Valor deve ser um número positivo', correlationId);
      }

      const url = amount 
        ? `${this.config.apiUrl}/1/sales/${paymentId}/void?amount=${amount}`
        : `${this.config.apiUrl}/1/sales/${paymentId}/void`;

      const headers = {
        'MerchantId': this.config.merchantId,
        'MerchantKey': this.config.merchantKey,
        'X-Correlation-ID': correlationId,
        'User-Agent': 'UNIPET-PLAN/1.0'
      };

      const response = await this.secureFetch(url, {
        method: 'PUT',
        headers: headers,
      }, correlationId);

      if (!response.ok) {
        const errorText = await response.text();
        const sanitizedError = this.sanitizeErrorMessage(errorText);
        throw new CieloApiError(response.status, 'CANCEL_ERROR', sanitizedError, correlationId);
      }

      const result: CieloPaymentResponse = await response.json();
      console.log('✅ [Cielo] Pagamento cancelado com sucesso', { 
        correlationId, 
        paymentId 
      });
      
      return result;
    }, correlationId, 'cancelPayment');
  }

  // Input validation methods
  private validatePaymentData(paymentData: CreditCardPaymentRequest): void {
    if (!paymentData.merchantOrderId || typeof paymentData.merchantOrderId !== 'string') {
      throw new CieloApiError(400, 'INVALID_ORDER_ID', 'ID do pedido é obrigatório');
    }
    
    if (!paymentData.customer?.name || typeof paymentData.customer.name !== 'string') {
      throw new CieloApiError(400, 'INVALID_CUSTOMER', 'Nome do cliente é obrigatório');
    }
    
    if (!paymentData.payment || typeof paymentData.payment.amount !== 'number' || paymentData.payment.amount <= 0) {
      throw new CieloApiError(400, 'INVALID_AMOUNT', 'Valor do pagamento deve ser maior que zero');
    }
    
    if (!paymentData.payment.creditCard) {
      throw new CieloApiError(400, 'INVALID_CARD_DATA', 'Dados do cartão são obrigatórios');
    }
    
    const card = paymentData.payment.creditCard;
    if (!card.cardNumber || !card.holder || !card.expirationDate || !card.securityCode) {
      throw new CieloApiError(400, 'INCOMPLETE_CARD_DATA', 'Dados do cartão incompletos');
    }
    
    // Validate card number format (remove spaces and check length)
    const cleanCardNumber = card.cardNumber.replace(/\s/g, '');
    if (!/^\d{13,19}$/.test(cleanCardNumber)) {
      throw new CieloApiError(400, 'INVALID_CARD_NUMBER', 'Número do cartão inválido');
    }
    
    // Validate expiration date format (MM/YY or MM/YYYY)
    if (!/^(0[1-9]|1[0-2])\/(\d{2}|\d{4})$/.test(card.expirationDate)) {
      throw new CieloApiError(400, 'INVALID_EXPIRATION_DATE', 'Data de expiração deve estar no formato MM/YY ou MM/YYYY');
    }
    
    // Convert MM/YY to MM/YYYY if needed
    if (card.expirationDate.length === 5) {
      const [month, year] = card.expirationDate.split('/');
      const fullYear = `20${year}`;
      card.expirationDate = `${month}/${fullYear}`;
    }
    
    // Validar se a data não está expirada
    const [month, year] = card.expirationDate.split('/');
    const expirationDate = new Date(parseInt(year), parseInt(month) - 1);
    const currentDate = new Date();
    currentDate.setDate(1); // Primeiro dia do mês atual
    
    if (expirationDate < currentDate) {
      throw new CieloApiError(400, 'EXPIRED_CARD', 'Cartão está expirado');
    }
    
    // Validate CVV format
    if (!/^\d{3,4}$/.test(card.securityCode)) {
      throw new CieloApiError(400, 'INVALID_CVV', 'Código de segurança deve ter 3 ou 4 dígitos');
    }
    
    // Validate customer CPF if provided
    if (paymentData.customer.identity && !this.validateCPF(paymentData.customer.identity)) {
      throw new CieloApiError(400, 'INVALID_CPF', 'CPF inválido');
    }
  }
  
  
  private validatePixData(paymentData: PixPaymentRequest): void {
    if (!paymentData.MerchantOrderId || typeof paymentData.MerchantOrderId !== 'string') {
      throw new CieloApiError(400, 'INVALID_ORDER_ID', 'ID do pedido é obrigatório');
    }
    
    if (!paymentData.Customer?.Name || typeof paymentData.Customer.Name !== 'string') {
      throw new CieloApiError(400, 'INVALID_CUSTOMER', 'Nome do cliente é obrigatório');
    }
    
    if (!paymentData.Payment || typeof paymentData.Payment.Amount !== 'number' || paymentData.Payment.Amount <= 0) {
      throw new CieloApiError(400, 'INVALID_AMOUNT', 'Valor do pagamento deve ser maior que zero');
    }
    
    // Para PIX, CPF e IdentityType são obrigatórios conforme documentação Cielo
    if (!paymentData.Customer.Identity) {
      throw new CieloApiError(400, 'INVALID_CPF', 'CPF é obrigatório para PIX');
    }
    
    if (!this.validateCPF(paymentData.Customer.Identity)) {
      throw new CieloApiError(400, 'INVALID_CPF', 'CPF inválido');
    }
    
    // IdentityType deve ser obrigatório quando Identity for fornecido
    if (!paymentData.Customer.IdentityType) {
      throw new CieloApiError(400, 'INVALID_IDENTITY_TYPE', 'IdentityType é obrigatório para PIX');
    }
  }

  // Utility methods - Detecção de bandeiras conforme Cielo API
  detectCardBrand(cardNumber: string): string {
    const number = cardNumber.replace(/\D/g, '');
    
    // Visa: começa com 4
    if (number.startsWith('4')) return 'Visa';
    
    // Mastercard: 5xxxxx ou 2221-2720
    if (number.startsWith('5') || (number.length >= 4 && parseInt(number.substring(0, 4)) >= 2221 && parseInt(number.substring(0, 4)) <= 2720)) {
      return 'Master';
    }
    
    // American Express: 34xxxx ou 37xxxx
    if (number.match(/^3[47]/)) return 'Amex';
    
    // Diners Club: 30xxxx, 300-305, 36xxxx, 38xxxx
    if (number.match(/^30[0-5]/) || number.startsWith('36') || number.startsWith('38')) return 'Diners';
    
    // Elo: 4011, 4312, 4389, 4514, 4573, 4576, 5041, 5066, 5067, 5090, 6277, 6362, 6363, 6504, 6505, 6516, 6550
    if (number.match(/^(4011|4312|4389|4514|4573|4576|5041|5066|5067|5090|6277|6362|6363|6504|6505|6516|6550)/)) {
      return 'Elo';
    }
    
    // Hipercard: 606282
    if (number.startsWith('606282')) return 'Hipercard';
    
    // Aura: 50xxxx
    if (number.startsWith('50')) return 'Aura';
    
    // JCB: 35xxxx
    if (number.match(/^35/)) return 'JCB';
    
    // Se não identificar, retornar Visa como padrão
    return 'Visa';
  }

  validateCPF(cpf: string): boolean {
    cpf = cpf.replace(/\D/g, '');
    
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let remainder = 11 - (sum % 11);
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    remainder = 11 - (sum % 11);
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(10))) return false;
    
    return true;
  }

  validateCNPJ(cnpj: string): boolean {
    cnpj = cnpj.replace(/\D/g, '');
    
    if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
    
    // Primeiro dígito verificador
    let sum = 0;
    let weight = 5;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cnpj.charAt(i)) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    let remainder = sum % 11;
    let digit1 = remainder < 2 ? 0 : 11 - remainder;
    if (digit1 !== parseInt(cnpj.charAt(12))) return false;
    
    // Segundo dígito verificador
    sum = 0;
    weight = 6;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cnpj.charAt(i)) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    remainder = sum % 11;
    let digit2 = remainder < 2 ? 0 : 11 - remainder;
    if (digit2 !== parseInt(cnpj.charAt(13))) return false;
    
    return true;
  }

  formatCurrency(amountInCents: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amountInCents / 100);
  }

  // Formatar data de expiração para API Cielo (formato MM/YYYY)
  formatExpirationDate(expirationDate: string): string {
    if (!expirationDate) return '';
    
    // Remove todos os caracteres exceto números e barras
    let cleaned = expirationDate.replace(/[^0-9/]/g, '');
    
    // Se contém barra, dividir em partes
    if (cleaned.includes('/')) {
      const parts = cleaned.split('/');
      if (parts.length === 2) {
        const month = parts[0].padStart(2, '0');
        let year = parts[1];
        
        // Se o ano tem apenas 2 dígitos, converter para 4 dígitos (20YY)
        if (year.length === 2) {
          const yearNum = parseInt(year);
          // Se é menor que 50, assumir 20XX, senão 19XX
          year = yearNum < 50 ? '20' + year : '19' + year;
        } else if (year.length === 4) {
          // Já está no formato correto
          year = year;
        } else if (year.length === 1) {
          year = '202' + year; // Para anos de 1 dígito, assumir 202X
        }
        
        return `${month}/${year}`;
      }
    } else {
      // Se não tem barra, assumir formato MMYY e converter para MM/YYYY
      cleaned = cleaned.replace(/\D/g, '');
      if (cleaned.length >= 4) {
        const month = cleaned.substring(0, 2);
        let year = cleaned.substring(2, 4);
        const yearNum = parseInt(year);
        // Se é menor que 50, assumir 20XX, senão 19XX
        const fullYear = yearNum < 50 ? '20' + year : '19' + year;
        return `${month}/${fullYear}`;
      }
    }
    
    // Fallback: tentar construir uma data válida
    const nums = cleaned.replace(/\D/g, '');
    if (nums.length >= 4) {
      const month = nums.substring(0, 2).padStart(2, '0');
      const year = nums.substring(2, 4);
      const yearNum = parseInt(year);
      const fullYear = yearNum < 50 ? '20' + year : '19' + year;
      return `${month}/${fullYear}`;
    }
    
    return '';
  }

  // Limpar e formatar CEP para API
  cleanZipCode(zipCode: string): string {
    if (!zipCode) return '00000000';
    
    // Remove todos os caracteres não numéricos
    const cleaned = zipCode.replace(/\D/g, '');
    
    // Garante que tenha exatamente 8 dígitos, completa com zeros se necessário
    return cleaned.padStart(8, '0').substring(0, 8);
  }

  // Detectar se é CPF ou CNPJ com base no número de dígitos
  // Detectar se é CPF ou CNPJ com base no número de dígitos
  private detectIdentityType(identity: string): 'CPF' | 'CNPJ' {
    const cleanIdentity = identity.replace(/\D/g, '');
    return cleanIdentity.length === 11 ? 'CPF' : 'CNPJ';
  }

  /**
   * Process payment using a saved card token (for recurring payments)
   * This is used for automatic renewals where we have the customer's card token
   * NOTE: This method is stubbed out for now as it requires token-based payment infrastructure
   * which is not yet implemented. The automatic renewal service will handle this differently.
   */
  async processPaymentWithToken(paymentData: {
    merchantOrderId: string;
    customer: {
      name: string;
      identity?: string;
      email: string;
    };
    payment: {
      amount: number; // Amount in cents
      cardToken: string;
      brand: string;
      installments?: number;
    };
  }): Promise<CieloPaymentResponse> {
    const correlationId = randomUUID();
    
    console.log('[processPaymentWithToken] Token-based payment not yet implemented', {
      correlationId,
      merchantOrderId: paymentData.merchantOrderId,
      amount: paymentData.payment.amount,
      brand: paymentData.payment.brand
    });

    // For now, return a failure response as tokenized payments are not supported
    // In the future, this should be properly implemented with Cielo's tokenization API
    throw new CieloApiError(
      501,
      'NOT_IMPLEMENTED',
      'Pagamento com token ainda não implementado. Use renovação manual.',
      correlationId
    );
  }
}

export default CieloService;
