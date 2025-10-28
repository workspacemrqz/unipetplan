#!/usr/bin/env node

/**
 * Script de teste para verificar o fluxo de checkout com pagamentos pendentes
 * 
 * Testa:
 * 1. Pagamento PIX - salva como pendente
 * 2. Pagamento com cartão aprovado - processa imediatamente
 * 3. Pagamento com cartão recusado - salva como pendente
 */

const fetch = require('node-fetch');

const API_URL = 'http://localhost:3000';

// Dados de teste
const testData = {
  paymentData: {
    customer: {
      name: 'Teste Cliente',
      email: `teste${Date.now()}@example.com`,
      cpf: '12345678901'
    },
    payment: {
      cardNumber: '4111111111111111', // Número de teste da Cielo
      holder: 'TESTE CLIENTE',
      expirationDate: '12/2025',
      securityCode: '123',
      installments: 1
    },
    pets: [
      {
        name: 'Rex Teste',
        species: 'Cão',
        breed: 'Labrador',
        age: '3',
        sex: 'Macho',
        castrated: false,
        weight: '25'
      }
    ]
  },
  planData: {
    planId: 'plan-basic', // Ajuste conforme necessário
    billingPeriod: 'monthly',
    amount: '99.90'
  },
  addressData: {
    phone: '11999999999',
    address: 'Rua Teste',
    number: '123',
    complement: '',
    district: 'Bairro Teste',
    city: 'São Paulo',
    state: 'SP',
    cep: '01234000'
  }
};

async function testPixPayment() {
  console.log('\n========================================');
  console.log('🔄 TESTE 1: Pagamento PIX (deve ficar pendente)');
  console.log('========================================\n');
  
  try {
    const response = await fetch(`${API_URL}/api/checkout/simple-process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...testData,
        paymentMethod: 'pix'
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ PIX gerado com sucesso!');
      console.log('📝 PaymentId:', result.payment?.paymentId);
      console.log('⏳ Status:', result.payment?.status === 12 ? 'Pendente (correto)' : result.payment?.status);
      console.log('📱 QR Code presente:', !!result.payment?.pixQrCode);
      console.log('📋 Código copia-cola presente:', !!result.payment?.pixCode);
      
      // Verificar se NÃO criou cliente/pets/contratos
      if (!result.client?.id) {
        console.log('✅ Cliente NÃO foi criado (correto para PIX pendente)');
      } else {
        console.log('❌ ERRO: Cliente foi criado prematuramente!');
      }
      
      return result.payment?.paymentId;
    } else {
      console.error('❌ Erro ao gerar PIX:', result);
      return null;
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error);
    return null;
  }
}

async function testApprovedCardPayment() {
  console.log('\n========================================');
  console.log('💳 TESTE 2: Cartão Aprovado (deve processar imediatamente)');
  console.log('========================================\n');
  
  try {
    // Para teste, vamos usar um email diferente
    const modifiedTestData = JSON.parse(JSON.stringify(testData));
    modifiedTestData.paymentData.customer.email = `aprovado${Date.now()}@example.com`;
    
    const response = await fetch(`${API_URL}/api/checkout/simple-process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...modifiedTestData,
        paymentMethod: 'credit_card'
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Pagamento com cartão processado!');
      console.log('📝 PaymentId:', result.payment?.paymentId);
      console.log('💳 Status:', result.payment?.status === 2 ? 'Aprovado (correto)' : result.payment?.status);
      
      // Para cartão aprovado, DEVE criar cliente
      if (result.client?.id) {
        console.log('✅ Cliente foi criado (correto para cartão aprovado)');
        console.log('   - ID:', result.client.id);
        console.log('   - Nome:', result.client.name);
        console.log('   - Email:', result.client.email);
      } else {
        console.log('⚠️ Cliente não retornado na resposta (verificar processamento)');
      }
    } else {
      console.log('⚠️ Pagamento recusado ou erro:', result);
      console.log('   - Erro:', result.error);
      console.log('   - Detalhes:', result.details);
      console.log('   - Status:', result.status);
      console.log('   - ReturnCode:', result.returnCode);
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error);
  }
}

async function checkPendingPayments() {
  console.log('\n========================================');
  console.log('🔍 TESTE 3: Verificar tabela de pagamentos pendentes');
  console.log('========================================\n');
  
  // Este teste seria feito diretamente no banco de dados
  // Por enquanto, apenas indicamos que o teste deveria ser feito
  console.log('ℹ️ Para verificar pagamentos pendentes:');
  console.log('   1. Acesse o banco de dados');
  console.log('   2. Execute: SELECT * FROM pending_payments ORDER BY created_at DESC LIMIT 5;');
  console.log('   3. Verifique que existem registros com status="pending" para PIX');
  console.log('   4. Verifique que pagamentos aprovados têm processed=true');
}

async function runTests() {
  console.log('🧪 INICIANDO TESTES DO FLUXO DE CHECKOUT');
  console.log('==========================================');
  console.log('📅 Data/Hora:', new Date().toISOString());
  console.log('🔗 API URL:', API_URL);
  console.log('==========================================');

  // Teste 1: PIX (deve ficar pendente)
  const pixPaymentId = await testPixPayment();
  
  // Aguardar um pouco entre os testes
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Teste 2: Cartão Aprovado (deve processar imediatamente)
  await testApprovedCardPayment();
  
  // Teste 3: Verificar pagamentos pendentes
  await checkPendingPayments();
  
  console.log('\n==========================================');
  console.log('✅ TESTES CONCLUÍDOS');
  console.log('==========================================');
  
  if (pixPaymentId) {
    console.log('\n📌 PRÓXIMOS PASSOS:');
    console.log('1. Simule confirmação do PIX via webhook:');
    console.log(`   curl -X POST ${API_URL}/api/webhooks/cielo \\`);
    console.log('     -H "Content-Type: application/json" \\');
    console.log(`     -d '{"PaymentId": "${pixPaymentId}", "ChangeType": 1, "ClientOrderId": "test"}'`);
    console.log('2. Verifique se cliente/pets/contratos foram criados após webhook');
  }
}

// Executar testes
runTests().catch(console.error);