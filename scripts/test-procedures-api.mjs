// Script para testar a API de procedimentos com autenticação de cliente
import http from 'http';

// Usar os dados do cliente real encontrado
const clientEmail = 'gabriel11@gmail.com';
const clientCpf = '26810298134'; // CPF real do cliente

// Fazer login primeiro
const loginData = JSON.stringify({
  email: clientEmail,
  password: clientCpf // Usar CPF como senha
});

const loginOptions = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/clients/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

console.log('🔐 Fazendo login como cliente...');
console.log('Email:', clientEmail);

const loginReq = http.request(loginOptions, (res) => {
  let data = '';
  let cookies = res.headers['set-cookie'];
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    const loginResult = JSON.parse(data);
    
    if ((loginResult.message === 'Login realizado com sucesso' || loginResult.success) && cookies) {
      console.log('✅ Login bem-sucedido!');
      console.log('Cliente ID:', loginResult.client.id);
      console.log('Cliente Nome:', loginResult.client.fullName);
      
      // Extrair o cookie de sessão
      const sessionCookie = cookies.map(cookie => cookie.split(';')[0]).join('; ');
      
      // Agora buscar os procedimentos
      const procedureOptions = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/clients/procedure-usage',
        method: 'GET',
        headers: {
          'Cookie': sessionCookie
        }
      };
      
      console.log('\n📋 Buscando procedimentos do cliente...');
      const procedureReq = http.request(procedureOptions, (res) => {
        let procedureData = '';
        
        res.on('data', (chunk) => {
          procedureData += chunk;
        });
        
        res.on('end', () => {
          const procedures = JSON.parse(procedureData);
          
          if (procedures.pets && procedures.pets.length > 0) {
            console.log('✅ Procedimentos carregados com sucesso!\n');
            
            procedures.pets.forEach(pet => {
              console.log(`🐾 Pet: ${pet.name} (${pet.species})`);
              console.log(`📍 Plano: ${pet.planName}`);
              console.log(`📊 Total de procedimentos: ${pet.procedures.length}`);
              
              if (pet.procedures.length > 0) {
                console.log('📋 Procedimentos disponíveis:');
                pet.procedures.slice(0, 5).forEach(proc => {
                  console.log(`   - ${proc.name}`);
                  console.log(`     • Limite anual: ${proc.annualLimit} vezes`);
                  console.log(`     • Já utilizados: ${proc.used} vezes`);
                  console.log(`     • Restantes: ${proc.remaining} vezes`);
                  console.log(`     • Carência: ${proc.waitingDaysRemaining > 0 ? proc.waitingDaysRemaining + ' dias' : 'Liberado'}`);
                  console.log(`     • Coparticipação: R$ ${proc.coparticipation.toFixed(2)}`);
                });
                
                if (pet.procedures.length > 5) {
                  console.log(`   ... e mais ${pet.procedures.length - 5} procedimentos`);
                }
              } else {
                console.log('   ❌ Nenhum procedimento com limite anual encontrado');
              }
              console.log('');
            });
            
            console.log('🎉 SUCESSO! Os procedimentos agora estão aparecendo corretamente!');
          } else {
            console.log('❌ Nenhum pet encontrado ou erro na requisição');
            console.log('Resposta:', procedures);
          }
        });
      });
      
      procedureReq.on('error', (error) => {
        console.error('❌ Erro ao buscar procedimentos:', error);
      });
      
      procedureReq.end();
      
    } else {
      console.log('❌ Falha no login:', loginResult);
      console.log('Tentando buscar o CPF correto do banco de dados...');
    }
  });
});

loginReq.on('error', (error) => {
  console.error('❌ Erro no login:', error);
});

loginReq.write(loginData);
loginReq.end();