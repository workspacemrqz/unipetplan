import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeConfig } from "./config/app-config";
import { errorHandler, logInfo } from "./utils/error-handler";

// Inicializar configurações robustas
initializeConfig();

// Verificar se o elemento root existe
const rootElement = document.getElementById("root");

if (!rootElement) {
  const error = new Error("Root element not found");
  errorHandler.handleError(error, { context: 'initialization', phase: 'root-check' });
  throw error;
}

// Função de inicialização robusta
async function initializeApp(): Promise<void> {
  try {
    logInfo('🚀 Iniciando aplicação...', { 
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    // Verificar se o navegador suporta recursos necessários
    if (!window.fetch) {
      throw new Error('Fetch API não suportada');
    }

    if (!window.Promise) {
      throw new Error('Promises não suportadas');
    }

    // Verificar conectividade
    if (!navigator.onLine) {
      logInfo('⚠️ Aplicação iniciando offline', { 
        online: navigator.onLine,
        connectionType: (navigator as any).connection?.effectiveType || 'unknown'
      });
    }

    // Criar root do React
    const root = createRoot(rootElement!);
    
    // Renderizar aplicação
    root.render(<App />);

    logInfo('✅ Aplicação inicializada com sucesso', {
      reactVersion: React.version,
      // SECURITY FIX: process is not available in browser environment
      nodeEnv: import.meta.env.MODE || 'production'
    });

  } catch (error) {
    const appError = error instanceof Error ? error : new Error(String(error));
    
    errorHandler.handleError(appError, { 
      context: 'initialization', 
      phase: 'app-startup' 
    });

    // Mostrar erro de inicialização robusto
    showInitializationError(appError);
  }
}

// Função para mostrar erro de inicialização de forma robusta e segura
function showInitializationError(error: Error): void {
  try {
    // Remover qualquer conteúdo existente
    if (rootElement) {
      rootElement.innerHTML = '';
    }

    // Criar elemento de erro usando métodos seguros do DOM
    const errorDiv = document.createElement("div");
    
    // Container principal
    const container = document.createElement("div");
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, var(--bg-red-2) 0%, var(--bg-red-3) 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      font-family: system-ui, -apple-system, sans-serif;
      color: rgb(var(--primary-foreground));
      text-align: center;
      padding: 20px;
      box-sizing: border-box;
    `;

    // Ícone de erro
    const icon = document.createElement("div");
    icon.style.cssText = "font-size: 48px; margin-bottom: 20px;";
    icon.textContent = "🚨";

    // Título
    const title = document.createElement("h1");
    title.style.cssText = "font-size: 24px; margin-bottom: 16px; margin: 0 0 16px 0;";
    title.textContent = "Falha na inicialização";

    // Mensagem de erro (usando textContent para segurança)
    const message = document.createElement("p");
    message.style.cssText = "font-size: 16px; margin-bottom: 24px; max-width: 500px; line-height: 1.5;";
    message.textContent = `Erro: ${error.message}`;

    // Container do botão
    const buttonContainer = document.createElement("div");
    buttonContainer.style.cssText = "display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;";
    
    const homeButton = document.createElement("button");
    homeButton.style.cssText = `
      background: var(--bg-teal);
      color: var(--text-light);
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
      min-width: 140px;
    `;
    homeButton.textContent = "🏠 Página Inicial";
    
    // Usar addEventListener ao invés de onclick inline para segurança
    homeButton.addEventListener('click', () => window.location.href = '/');
    homeButton.addEventListener('mouseover', () => homeButton.style.background = 'var(--bg-teal-dark)');
    homeButton.addEventListener('mouseout', () => homeButton.style.background = 'var(--bg-teal)');

    // Container das dicas
    const tipsContainer = document.createElement("div");
    tipsContainer.style.cssText = `
      margin-top: 24px;
      font-size: 12px;
      opacity: 0.8;
      max-width: 600px;
    `;
    
    const tipsTitle = document.createElement("p");
    tipsTitle.textContent = "Se o problema persistir, tente:";
    
    const tipsList = document.createElement("ul");
    tipsList.style.cssText = "text-align: left; display: inline-block; margin: 8px 0;";
    
    const tips = [
      "Limpar cache do navegador",
      "Verificar conexão com a internet", 
      "Usar um navegador diferente",
      "Contatar suporte técnico"
    ];
    
    tips.forEach(tip => {
      const li = document.createElement("li");
      li.textContent = tip;
      tipsList.appendChild(li);
    });

    // Stack trace (usando textContent para segurança)
    const stackContainer = document.createElement("div");
    stackContainer.style.cssText = `
      margin-top: 16px;
      font-size: 10px;
      opacity: 0.6;
      font-family: monospace;
    `;
    stackContainer.textContent = error.stack 
      ? error.stack.split('\n').slice(0, 3).join('\n')
      : 'Stack trace não disponível';

    // Montar estrutura do DOM
    buttonContainer.appendChild(homeButton);
    tipsContainer.appendChild(tipsTitle);
    tipsContainer.appendChild(tipsList);
    
    container.appendChild(icon);
    container.appendChild(title);
    container.appendChild(message);
    container.appendChild(buttonContainer);
    container.appendChild(tipsContainer);
    container.appendChild(stackContainer);
    
    errorDiv.appendChild(container);

    // Adicionar ao DOM
    document.body.appendChild(errorDiv);

    // Log adicional
    console.error('❌ Falha crítica na inicialização:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    });

  } catch (fallbackError) {
    // Fallback extremo se até o erro falhar
    console.error('❌ Falha no fallback de erro:', fallbackError);
    
    // Mensagem simples no console
    console.error(`
      🚨 FALHA CRÍTICA NA APLICAÇÃO
      ==============================
      Erro: ${error.message}
      Stack: ${error.stack}
      
      Por favor:
      1. Recarregue a página
      2. Limpe o cache do navegador
      3. Verifique sua conexão
      4. Contate o suporte se o problema persistir
    `);
  }
}

// Função para verificar saúde da aplicação
function checkAppHealth(): void {
  try {
    // Verificar se o DOM está funcionando
    if (!document.body) {
      throw new Error('DOM não está funcionando corretamente');
    }

    // Verificar se o JavaScript está funcionando
    if (typeof window === 'undefined') {
      throw new Error('Objeto window não disponível');
    }

    // Verificar se as APIs básicas estão funcionando
    if (typeof JSON === 'undefined') {
      throw new Error('JSON API não disponível');
    }

    logInfo('✅ Verificação de saúde da aplicação passou', {
      dom: !!document.body,
      window: !!window,
      json: !!JSON
    });

  } catch (error) {
    errorHandler.handleError(error, { 
      context: 'health-check', 
      phase: 'startup' 
    });
  }
}

// Função para configurar listeners de recuperação
function setupRecoveryListeners(): void {
  // Listener para quando a conexão volta
  window.addEventListener('online', () => {
    logInfo('🌐 Conexão restaurada', { timestamp: new Date().toISOString() });
    
    // Tentar recarregar dados se necessário
    if (window.location.pathname !== '/') {
      logInfo('🔄 Tentando restaurar estado da aplicação...');
    }
  });

  // Listener para quando a conexão cai
  window.addEventListener('offline', () => {
    logInfo('📡 Conexão perdida', { timestamp: new Date().toISOString() });
    
    // Mostrar notificação para o usuário
    showOfflineNotification();
  });

  // Listener para mudanças na visibilidade da página
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      logInfo('👁️ Página oculta', { timestamp: new Date().toISOString() });
    } else {
      logInfo('👁️ Página visível', { timestamp: new Date().toISOString() });
    }
  });

  // Listener para erros de recursos
  window.addEventListener('error', (event) => {
    if (event.target && event.target !== window) {
      const target = event.target as HTMLElement;
      logInfo('📦 Erro de recurso detectado', {
        type: target.tagName,
        src: (target as any).src || (target as any).href
      });
    }
  }, true);
}

// Função para mostrar notificação offline (usando métodos seguros do DOM)
function showOfflineNotification(): void {
  try {
    const notification = document.createElement('div');
    
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--bg-gold);
      color: var(--text-light);
      padding: 12px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px var(--shadow-dark);
      z-index: 10000;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    
    const iconSpan = document.createElement('span');
    iconSpan.textContent = '📡';
    
    const messageSpan = document.createElement('span');
    messageSpan.textContent = 'Você está offline. Algumas funcionalidades podem não funcionar.';
    
    container.appendChild(iconSpan);
    container.appendChild(messageSpan);
    notification.appendChild(container);

    document.body.appendChild(notification);

    // Remover após 5 segundos
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);

  } catch (error) {
    console.warn('⚠️ Falha ao mostrar notificação offline:', error);
  }
}

// Inicializar aplicação de forma robusta
try {
  // Verificar saúde primeiro
  checkAppHealth();
  
  // Configurar listeners de recuperação
  setupRecoveryListeners();
  
  // Inicializar aplicação
  initializeApp();

} catch (criticalError) {
  // Erro crítico que impede a inicialização
  console.error('🚨 ERRO CRÍTICO NA INICIALIZAÇÃO:', criticalError);
  
  // Tentar mostrar erro de inicialização
  if (criticalError instanceof Error) {
    showInitializationError(criticalError);
  } else {
    showInitializationError(new Error('Erro crítico desconhecido'));
  }
}