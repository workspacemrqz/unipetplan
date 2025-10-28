// NEW CHECKOUT ENDPOINT WITH PENDING PAYMENTS
// This file contains the new checkout logic that saves to pending_payments table
// and only creates client/pets/contracts after payment confirmation

import { CieloService } from "./services/cielo-service.js";
import { storage } from "./storage.js";
import bcrypt from "bcrypt";

/**
 * Process checkout and create pending payment
 * @param req - Express request
 * @param res - Express response
 */
export async function processCheckout(req: any, res: any) {
  try {
    console.log("🛒 [CHECKOUT-V2] Iniciando checkout com pagamentos pendentes");
    
    // Extract and validate data
    const { paymentData, planData, paymentMethod, addressData, coupon } = req.body;
    
    if (!paymentData || !planData || !paymentMethod) {
      return res.status(400).json({ 
        error: "Dados incompletos - paymentData, planData e paymentMethod são obrigatórios" 
      });
    }
    
    // Extract customer data
    const customerCpf = paymentData.customer?.cpf?.replace(/\D/g, '');
    const customerEmail = paymentData.customer?.email?.toLowerCase().trim();
    const customerName = paymentData.customer?.name || 'Cliente';
    
    // Extract seller ID if present
    const sellerId = req.body.sellerId || null;
    
    // Get plan details for pricing
    const selectedPlan = await storage.getPlan(planData.planId);
    if (!selectedPlan) {
      return res.status(400).json({
        error: "Plano não encontrado",
        planId: planData.planId
      });
    }
    
    // Calculate price with multi-pet discounts
    const petCount = paymentData.pets?.length || 1;
    const basePriceDecimal = parseFloat(selectedPlan.basePrice || '0');
    let basePriceCents = Math.round(basePriceDecimal * 100);
    
    // For COMFORT and PLATINUM plans, multiply by 12 (annual billing)
    if (['COMFORT', 'PLATINUM'].some(type => selectedPlan.name.toUpperCase().includes(type))) {
      basePriceCents = basePriceCents * 12;
    }
    
    // Apply discount for multiple pets (BASIC/INFINITY plans only)
    let totalCents = 0;
    for (let i = 0; i < petCount; i++) {
      let petPriceCents = basePriceCents;
      
      if (['BASIC', 'INFINITY'].some(type => selectedPlan.name.toUpperCase().includes(type)) && i > 0) {
        const discountPercentage = i === 1 ? 5 :  // 2º pet: 5%
                                 i === 2 ? 10 : // 3º pet: 10%
                                 15;             // 4º+ pets: 15%
        petPriceCents = Math.round(basePriceCents * (1 - discountPercentage / 100));
      }
      
      totalCents += petPriceCents;
    }
    
    // Apply coupon discount if present
    let finalAmountCents = totalCents;
    let couponDiscountAmount = 0;
    
    if (coupon) {
      try {
        console.log(`🎫 [CHECKOUT-V2] Validando cupom: ${coupon}`);
        const couponResult = await storage.validateCoupon(coupon);
        
        if (couponResult.valid && couponResult.coupon) {
          const couponValue = Number(couponResult.coupon.value);
          
          if (couponResult.coupon.type === 'percentage') {
            couponDiscountAmount = Math.round(finalAmountCents * (couponValue / 100));
            finalAmountCents = finalAmountCents - couponDiscountAmount;
            console.log(`✅ [CHECKOUT-V2] Cupom percentual aplicado: ${couponValue}%`);
          } else {
            couponDiscountAmount = Math.round(couponValue * 100);
            finalAmountCents = Math.max(0, finalAmountCents - couponDiscountAmount);
            console.log(`✅ [CHECKOUT-V2] Cupom fixo aplicado: R$ ${couponValue}`);
          }
        }
      } catch (error) {
        console.error(`⚠️ [CHECKOUT-V2] Erro ao validar cupom:`, error);
      }
    }
    
    console.log("💰 [CHECKOUT-V2] Preço calculado:", {
      planName: selectedPlan.name,
      petCount: petCount,
      totalBeforeCoupon: (totalCents / 100).toFixed(2),
      couponDiscount: (couponDiscountAmount / 100).toFixed(2),
      finalAmount: (finalAmountCents / 100).toFixed(2)
    });
    
    // Determine billing period based on plan type
    const isAnnualPlan = ['COMFORT', 'PLATINUM'].some(type => 
      selectedPlan.name.toUpperCase().includes(type)
    );
    const billingPeriod = isAnnualPlan ? 'annual' : 'monthly';
    
    // Process payment based on method
    const cieloService = new CieloService();
    let paymentResult;
    
    if (paymentMethod === 'credit_card') {
      // Process credit card payment
      console.log('💳 [CHECKOUT-V2] Processando pagamento com cartão de crédito');
      
      const creditCardRequest = {
        merchantOrderId: `ORDER_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        customer: {
          name: customerName,
          email: customerEmail,
          cpf: customerCpf,
          address: {
            street: addressData?.address || '',
            number: addressData?.number || '',
            complement: addressData?.complement || '',
            zipCode: addressData?.cep || '',
            city: addressData?.city || '',
            state: addressData?.state || '',
            country: 'BRA'
          }
        },
        payment: {
          type: 'CreditCard' as const,
          amount: finalAmountCents,
          installments: paymentData.payment?.installments || 1,
          creditCard: {
            cardNumber: paymentData.payment?.cardNumber || '',
            holder: paymentData.payment?.holder || '',
            expirationDate: paymentData.payment?.expirationDate || '',
            securityCode: paymentData.payment?.securityCode || ''
          }
        }
      };
      
      paymentResult = await cieloService.createCreditCardPayment(creditCardRequest);
      
      console.log(`💳 [CHECKOUT-V2] Resultado do pagamento:`, {
        paymentId: paymentResult.payment?.paymentId,
        status: paymentResult.payment?.status,
        approved: paymentResult.payment?.status === 2
      });
      
      // Save pending payment data
      const pendingPaymentData = {
        cieloPaymentId: paymentResult.payment.paymentId,
        paymentMethod: 'credit_card',
        paymentStatus: paymentResult.payment?.status === 2 ? 'approved' : 'pending',
        customerName,
        customerEmail,
        customerCpf,
        customerPhone: addressData?.phone || null,
        address: addressData?.address || null,
        number: addressData?.number || null,
        complement: addressData?.complement || null,
        district: addressData?.district || null,
        city: addressData?.city || null,
        state: addressData?.state || null,
        cep: addressData?.cep || null,
        planId: planData.planId,
        billingPeriod,
        totalAmount: (finalAmountCents / 100).toFixed(2),
        petsData: JSON.stringify(paymentData.pets || []),
        sellerId,
        couponCode: coupon || null,
        couponDiscountAmount: couponDiscountAmount > 0 ? (couponDiscountAmount / 100).toFixed(2) : null,
        metadata: JSON.stringify({
          proofOfSale: paymentResult.payment.proofOfSale,
          authorizationCode: paymentResult.payment.authorizationCode,
          tid: paymentResult.payment.tid,
          returnCode: paymentResult.payment.returnCode,
          returnMessage: paymentResult.payment.returnMessage
        })
      };
      
      const pendingPayment = await storage.createPendingPayment(pendingPaymentData);
      console.log('💾 [CHECKOUT-V2] Pagamento pendente salvo:', pendingPayment.id);
      
      if (paymentResult.payment?.status === 2) {
        // Payment approved - process immediately
        console.log('✅ [CHECKOUT-V2] Pagamento aprovado, processando imediatamente...');
        
        // Import and use the helper function to process the payment
        const { processPendingPayment } = await import('./routes.js');
        const processResult = await processPendingPayment(pendingPayment, `CC-${Date.now()}`);
        
        // Increment coupon usage if payment was successful
        if (coupon) {
          await storage.incrementCouponUsage(coupon);
        }
        
        return res.status(200).json({
          success: true,
          message: "Pagamento aprovado com sucesso!",
          payment: {
            paymentId: paymentResult.payment.paymentId,
            status: paymentResult.payment.status,
            method: paymentMethod
          },
          client: processResult.client ? {
            id: processResult.client.id,
            name: processResult.client.fullName,
            email: processResult.client.email
          } : undefined
        });
      } else {
        // Payment not approved
        return res.status(400).json({
          error: "Pagamento não autorizado",
          details: paymentResult.payment?.returnMessage || "Transação recusada",
          paymentMethod,
          status: paymentResult.payment?.status,
          returnCode: paymentResult.payment?.returnCode
        });
      }
      
    } else if (paymentMethod === 'pix') {
      // Process PIX payment
      console.log('🔄 [CHECKOUT-V2] Processando pagamento PIX');
      
      const pixRequest = {
        MerchantOrderId: `UNIPET-${Date.now()}`,
        Customer: {
          Name: customerName,
          Identity: customerCpf.replace(/\D/g, ''),
          IdentityType: 'CPF' as 'CPF' | 'CNPJ',
          Email: customerEmail
        },
        Payment: {
          Type: 'Pix' as const,
          Amount: finalAmountCents,
          Provider: 'Cielo' as const
        }
      };
      
      try {
        paymentResult = await cieloService.createPixPayment(pixRequest);
        console.log('✅ [CHECKOUT-V2] PIX gerado com sucesso:', {
          paymentId: paymentResult.payment?.paymentId,
          hasQrCode: !!paymentResult.payment?.qrCodeBase64Image,
          hasQrCodeString: !!paymentResult.payment?.qrCodeString
        });
      } catch (pixError: any) {
        console.error('❌ [CHECKOUT-V2] Erro ao gerar PIX:', pixError);
        return res.status(400).json({
          error: 'Erro ao gerar código PIX',
          details: pixError.message
        });
      }
      
      // Check if PIX was generated successfully (status 12 = Pending)
      if (paymentResult.payment?.status === 12) {
        // Save pending payment data
        const pendingPaymentData = {
          cieloPaymentId: paymentResult.payment.paymentId,
          paymentMethod: 'pix',
          paymentStatus: 'pending',
          customerName,
          customerEmail,
          customerCpf,
          customerPhone: addressData?.phone || null,
          address: addressData?.address || null,
          number: addressData?.number || null,
          complement: addressData?.complement || null,
          district: addressData?.district || null,
          city: addressData?.city || null,
          state: addressData?.state || null,
          cep: addressData?.cep || null,
          planId: planData.planId,
          billingPeriod,
          totalAmount: (finalAmountCents / 100).toFixed(2),
          petsData: JSON.stringify(paymentData.pets || []),
          pixQrCode: paymentResult.payment.qrCodeBase64Image || null,
          pixCode: paymentResult.payment.qrCodeString || null,
          sellerId,
          couponCode: coupon || null,
          couponDiscountAmount: couponDiscountAmount > 0 ? (couponDiscountAmount / 100).toFixed(2) : null,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expires in 24 hours
          metadata: JSON.stringify({
            proofOfSale: paymentResult.payment.proofOfSale || '',
            tid: paymentResult.payment.tid || ''
          })
        };
        
        const pendingPayment = await storage.createPendingPayment(pendingPaymentData);
        console.log('💾 [CHECKOUT-V2] PIX pendente salvo:', pendingPayment.id);
        console.log('⏳ [CHECKOUT-V2] Aguardando confirmação de pagamento via webhook');
        
        // Validate PIX response has required fields
        if (!paymentResult.payment.qrCodeBase64Image || !paymentResult.payment.qrCodeString) {
          console.error('❌ [CHECKOUT-V2] Resposta PIX incompleta');
          return res.status(400).json({
            error: 'Resposta PIX incompleta',
            details: 'QR Code ou código copia-cola não foram gerados corretamente'
          });
        }
        
        // Return PIX data for display to user
        return res.status(200).json({
          success: true,
          message: "PIX gerado com sucesso! Aguardando pagamento.",
          payment: {
            paymentId: paymentResult.payment.paymentId,
            status: paymentResult.payment.status,
            method: 'pix',
            pixQrCode: paymentResult.payment.qrCodeBase64Image,
            pixCode: paymentResult.payment.qrCodeString,
            amount: (finalAmountCents / 100).toFixed(2)
          }
        });
      } else {
        return res.status(400).json({
          error: 'Erro ao gerar PIX',
          details: 'Status inesperado do PIX',
          status: paymentResult.payment?.status
        });
      }
      
    } else {
      return res.status(400).json({
        error: 'Método de pagamento inválido',
        method: paymentMethod
      });
    }
    
  } catch (error: any) {
    console.error('❌ [CHECKOUT-V2] Erro no checkout:', error);
    
    // Handle specific errors
    if (error.name === 'CieloApiError') {
      return res.status(400).json({
        error: 'Erro no processamento do pagamento',
        details: error.message,
        code: error.code,
        paymentMethod: req.body.paymentMethod
      });
    }
    
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}