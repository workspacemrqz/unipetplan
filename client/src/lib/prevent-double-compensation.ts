/**
 * Utilitário para prevenir dupla compensação de scrollbar por bibliotecas externas
 * Especialmente importante para bibliotecas como Uppy que podem aplicar suas próprias compensações
 */

// Armazena o estado original do body antes de qualquer modificação
let originalBodyStyles: {
  overflow?: string;
  paddingRight?: string;
  position?: string;
  top?: string;
  width?: string;
} | null = null;

// Contador de locks ativos para coordenar múltiplas bibliotecas
let activeLocks = 0;

// Observer para detectar mudanças externas no body
let bodyObserver: MutationObserver | null = null;

/**
 * Salva os estilos originais do body antes de qualquer modificação
 */
export function saveOriginalBodyStyles(): void {
  if (originalBodyStyles === null) {
    const body = document.body;
    const computedStyle = getComputedStyle(body);
    
    originalBodyStyles = {
      overflow: body.style.overflow || computedStyle.overflow,
      paddingRight: body.style.paddingRight || computedStyle.paddingRight,
      position: body.style.position || computedStyle.position,
      top: body.style.top || computedStyle.top,
      width: body.style.width || computedStyle.width,
    };
  }
}

/**
 * Restaura os estilos originais do body
 */
export function restoreOriginalBodyStyles(): void {
  if (originalBodyStyles && activeLocks === 0) {
    const body = document.body;
    
    // Restaurar apenas se não há outros locks ativos
    body.style.overflow = originalBodyStyles.overflow || '';
    body.style.paddingRight = originalBodyStyles.paddingRight || '';
    body.style.position = originalBodyStyles.position || '';
    body.style.top = originalBodyStyles.top || '';
    body.style.width = originalBodyStyles.width || '';
    
    originalBodyStyles = null;
  }
}

/**
 * Incrementa o contador de locks ativos
 */
export function incrementActiveLocks(): void {
  activeLocks++;
}

/**
 * Decrementa o contador de locks ativos
 */
export function decrementActiveLocks(): void {
  activeLocks = Math.max(0, activeLocks - 1);
}

/**
 * Retorna o número de locks ativos
 */
export function getActiveLocks(): number {
  return activeLocks;
}

/**
 * Detecta se há modificações externas no body que possam causar dupla compensação
 */
export function startBodyObserver(callback?: (mutations: MutationRecord[]) => void): void {
  if (bodyObserver) {
    stopBodyObserver();
  }
  
  bodyObserver = new MutationObserver((mutations) => {
    // Filtrar apenas mudanças relevantes
    const relevantMutations = mutations.filter(mutation => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        const target = mutation.target as HTMLElement;
        const style = target.style;
        
        // Detectar mudanças em propriedades relacionadas ao scroll lock
        return style.overflow !== undefined || 
               style.paddingRight !== undefined ||
               style.position !== undefined ||
               style.top !== undefined ||
               style.width !== undefined;
      }
      return false;
    });
    
    if (relevantMutations.length > 0) {
      callback?.(relevantMutations);
    }
  });
  
  bodyObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ['style'],
    attributeOldValue: true
  });
}

/**
 * Para o observer do body
 */
export function stopBodyObserver(): void {
  if (bodyObserver) {
    bodyObserver.disconnect();
    bodyObserver = null;
  }
}

/**
 * Detecta se uma biblioteca externa está aplicando compensação
 */
export function detectExternalCompensation(): boolean {
  const body = document.body;
  const computedStyle = getComputedStyle(body);
  
  // Verificar se há padding-right aplicado que não foi aplicado por nós
  const currentPaddingRight = parseInt(computedStyle.paddingRight, 10) || 0;
  const originalPaddingRight = parseInt(originalBodyStyles?.paddingRight || '0', 10) || 0;
  
  // Se há padding-right maior que o original e não temos locks ativos,
  // provavelmente uma biblioteca externa aplicou compensação
  return currentPaddingRight > originalPaddingRight && activeLocks === 0;
}

/**
 * Remove compensação externa detectada
 */
export function removeExternalCompensation(): void {
  if (detectExternalCompensation() && originalBodyStyles) {
    const body = document.body;
    body.style.paddingRight = originalBodyStyles.paddingRight || '';
  }
}

/**
 * Hook para coordenar com bibliotecas externas
 */
export function useExternalLibraryCoordination() {
  return {
    saveOriginalBodyStyles,
    restoreOriginalBodyStyles,
    incrementActiveLocks,
    decrementActiveLocks,
    getActiveLocks,
    startBodyObserver,
    stopBodyObserver,
    detectExternalCompensation,
    removeExternalCompensation,
  };
}

/**
 * Reseta todos os estados para situações de emergência
 */
export function resetAllStates(): void {
  activeLocks = 0;
  originalBodyStyles = null;
  stopBodyObserver();
  
  // Limpar estilos do body
  const body = document.body;
  body.style.overflow = '';
  body.style.paddingRight = '';
  body.style.position = '';
  body.style.top = '';
  body.style.width = '';
}