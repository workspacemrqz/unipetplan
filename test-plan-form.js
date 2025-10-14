const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  try {
    // Ir para página de login do admin
    console.log('Navegando para página de login...');
    await page.goto('http://localhost:5000/admin');
    
    // Fazer login
    console.log('Fazendo login...');
    await page.waitForSelector('input[type="text"]', { timeout: 5000 });
    await page.type('input[type="text"]', '1');
    await page.type('input[type="password"]', '1');
    await page.click('button[type="submit"]');
    
    // Aguardar navegação
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('Login realizado com sucesso!');
    
    // Navegar para a página de planos
    await page.goto('http://localhost:5000/admin/planos');
    await page.waitForSelector('table', { timeout: 5000 });
    console.log('Na página de planos');
    
    // Clicar no primeiro botão de editar
    const editButtons = await page.$$('button:has-text("Editar")');
    if (editButtons.length > 0) {
      console.log('Clicando em editar primeiro plano...');
      await editButtons[0].click();
      
      // Aguardar o formulário carregar
      await page.waitForSelector('textarea', { timeout: 5000 });
      
      // Verificar o conteúdo do campo de texto do contrato
      const contractText = await page.$eval('textarea[name="contractText"]', el => el.value);
      console.log('Texto do contrato tem', contractText.length, 'caracteres');
      
      if (contractText.length > 100) {
        console.log('✅ SUCESSO: Texto do contrato foi carregado automaticamente!');
        console.log('Primeiros 200 caracteres:', contractText.substring(0, 200));
      } else {
        console.log('⚠️ AVISO: Campo de texto do contrato está vazio ou muito curto');
      }
    } else {
      console.log('Nenhum plano encontrado para editar');
    }
    
    // Aguardar um pouco para visualizar
    await new Promise(resolve => setTimeout(resolve, 5000));
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await browser.close();
  }
})();