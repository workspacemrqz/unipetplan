// Script de teste para verificar a API de installments
// Execute com: node test-cliente-financeiro.js

const fetch = require('node-fetch');

async function testInstallmentsAPI() {
    const API_URL = 'http://localhost:3000';
    
    console.log('🔍 Testando API de Installments...\n');
    
    // Primeiro, fazer login como cliente
    console.log('1️⃣ Fazendo login como cliente de teste...');
    
    const loginResponse = await fetch(`${API_URL}/api/clients/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email: 'cliente@example.com',
            cpf: '12345678900'
        }),
        credentials: 'include'
    });
    
    if (!loginResponse.ok) {
        console.error('❌ Falha ao fazer login:', loginResponse.status, loginResponse.statusText);
        console.log('Certifique-se de ter um cliente de teste cadastrado com email: cliente@example.com e cpf: 12345678900');
        return;
    }
    
    const loginData = await loginResponse.json();
    const cookies = loginResponse.headers.raw()['set-cookie'];
    
    console.log('✅ Login bem-sucedido:', loginData.client.fullName);
    console.log('');
    
    // Buscar os contratos do cliente
    console.log('2️⃣ Buscando contratos do cliente...');
    
    const contractsResponse = await fetch(`${API_URL}/api/clients/contracts`, {
        headers: {
            'Cookie': cookies ? cookies.join('; ') : ''
        },
        credentials: 'include'
    });
    
    if (!contractsResponse.ok) {
        console.error('❌ Falha ao buscar contratos:', contractsResponse.status);
        return;
    }
    
    const contractsData = await contractsResponse.json();
    console.log(`✅ Encontrados ${contractsData.contracts.length} contratos`);
    
    contractsData.contracts.forEach(contract => {
        console.log(`   - Pet: ${contract.petName} | Plano: ${contract.planName} | Status: ${contract.status}`);
    });
    console.log('');
    
    // Buscar as parcelas (installments)
    console.log('3️⃣ Buscando parcelas (installments) do cliente...');
    
    const installmentsResponse = await fetch(`${API_URL}/api/customer/installments`, {
        headers: {
            'Cookie': cookies ? cookies.join('; ') : ''
        },
        credentials: 'include'
    });
    
    if (!installmentsResponse.ok) {
        console.error('❌ Falha ao buscar parcelas:', installmentsResponse.status);
        return;
    }
    
    const installmentsData = await installmentsResponse.json();
    
    console.log('📊 Resumo das Parcelas:');
    console.log(`   - Parcelas Pagas: ${installmentsData.paid?.length || 0}`);
    console.log(`   - Parcelas Atuais (Próximas): ${installmentsData.current?.length || 0}`);
    console.log(`   - Parcelas Atrasadas: ${installmentsData.overdue?.length || 0}`);
    console.log('');
    
    // Detalhar as parcelas atuais (próximas)
    if (installmentsData.current && installmentsData.current.length > 0) {
        console.log('📅 Próximas Parcelas (Current):');
        installmentsData.current.forEach(inst => {
            console.log(`   - Pet: ${inst.petName}`);
            console.log(`     Plano: ${inst.planName}`);
            console.log(`     Vencimento: ${new Date(inst.dueDate).toLocaleDateString('pt-BR')}`);
            console.log(`     Valor: R$ ${inst.amount.toFixed(2)}`);
            console.log(`     Período: ${inst.billingPeriod}`);
            console.log(`     ID da Parcela: ${inst.id}`);
            console.log('');
        });
    } else {
        console.log('⚠️  Nenhuma parcela atual/próxima encontrada');
        console.log('   Isso pode indicar o problema relatado!');
    }
    
    // Verificar pets únicos
    const uniquePets = new Set();
    contractsData.contracts.forEach(c => {
        if (c.petId && c.petName) {
            uniquePets.add(`${c.petId}:${c.petName}`);
        }
    });
    
    console.log(`\n🐾 Pets únicos encontrados: ${uniquePets.size}`);
    uniquePets.forEach(pet => {
        const [id, name] = pet.split(':');
        console.log(`   - ${name} (ID: ${id})`);
        
        // Verificar se este pet tem parcelas atuais
        const hasCurrent = installmentsData.current?.some(i => i.petId === id);
        if (!hasCurrent) {
            console.log(`     ⚠️  SEM PRÓXIMA PARCELA!`);
        }
    });
}

// Executar o teste
testInstallmentsAPI().catch(console.error);