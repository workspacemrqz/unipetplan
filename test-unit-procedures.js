// Test script for verifying the unit procedures-with-plans endpoint
import http from 'http';

// Test the procedures-with-plans endpoint
function testProceduresWithPlans() {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/unit/clinica-veterinaria-pet-center/procedures-with-plans',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer test-token'
    }
  };

  console.log('Testing endpoint:', options.path);
  
  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('Status Code:', res.statusCode);
      if (res.statusCode === 200) {
        try {
          const procedures = JSON.parse(data);
          console.log('✅ Endpoint working!');
          console.log(`Found ${procedures.length} procedures`);
          
          // Display first procedure with plans if available
          if (procedures.length > 0 && procedures[0].plans && procedures[0].plans.length > 0) {
            const firstProc = procedures[0];
            console.log('\n📋 Sample Procedure with Plans:');
            console.log(`- Nome: ${firstProc.name}`);
            console.log(`- Categoria: ${firstProc.category}`);
            console.log(`- Planos vinculados: ${firstProc.plans.length}`);
            
            if (firstProc.plans[0]) {
              const plan = firstProc.plans[0];
              console.log('\n  📌 Primeiro plano:');
              console.log(`    - Plano: ${plan.planName}`);
              console.log(`    - Valor Integral: R$ ${(plan.price / 100).toFixed(2)}`);
              console.log(`    - Pagar: R$ ${(plan.payValue / 100).toFixed(2)}`);
              console.log(`    - Coparticipação: R$ ${(plan.coparticipacao / 100).toFixed(2)}`);
              console.log(`    - Carência: ${plan.carencia || 'N/A'}`);
              console.log(`    - Limites Anuais: ${plan.limitesAnuais || 'N/A'}`);
            }
          }
        } catch (error) {
          console.log('❌ Error parsing response:', error.message);
          console.log('Response:', data);
        }
      } else if (res.statusCode === 401) {
        console.log('❌ Authentication failed - need valid token');
      } else {
        console.log('❌ Unexpected status code');
        console.log('Response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Request error:', error.message);
  });

  req.end();
}

// Run the test
console.log('🧪 Testing Unit Procedures with Plans Endpoint\n');
testProceduresWithPlans();