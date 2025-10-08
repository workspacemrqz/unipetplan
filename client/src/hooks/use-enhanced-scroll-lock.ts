import { useEffect, useRef, useCallback } from 'react';
import { 
  getScrollbarWidth, 
  detectOverlayScrollbar, 
  hasVerticalScrollbar,
  resetScrollbarCache 
} from '../lib/scrollbar-width';

// Estado global unificado
interface ScrollLockState {
  activeLocks: Set<string>;
  originalBodyStyles: {
    overflow: string;
    paddingRight: string;
    position: string;
    top: string;
    width: string;
    marginRight: string;
  } | null;
  mutationObserver: MutationObserver | null;
  isApplyingStyles: boolean;
  pendingOperations: Array<() => void>;
  measuredScrollbarWidth: number | null;
}

const globalState: ScrollLockState = {
  activeLocks: new Set(),
  originalBodyStyles: null,
  mutationObserver: null,
  isApplyingStyles: false,
  pendingOperations: [],
  measuredScrollbarWidth: null
};

/**
 * Debounce timers for different operation types
 */
let applyDebounceTimer: NodeJS.Timeout | null = null;
let removeDebounceTimer: NodeJS.Timeout | null = null;
let mutationDebounceTimer: NodeJS.Timeout | null = null;

/**
 * Executa operação com debounce específico por tipo para evitar race conditions
 */
function debouncedOperation(operation: () => void, delay: number = 16, type: 'apply' | 'remove' | 'mutation' = 'mutation') {
  let timer: NodeJS.Timeout | null = null;
  
  switch (type) {
    case 'apply':
      if (applyDebounceTimer) {
        clearTimeout(applyDebounceTimer);
      }
      timer = applyDebounceTimer = setTimeout(() => {
        operation();
        applyDebounceTimer = null;
      }, delay);
      break;
    case 'remove':
      if (removeDebounceTimer) {
        clearTimeout(removeDebounceTimer);
      }
      timer = removeDebounceTimer = setTimeout(() => {
        operation();
        removeDebounceTimer = null;
      }, delay);
      break;
    case 'mutation':
      if (mutationDebounceTimer) {
        clearTimeout(mutationDebounceTimer);
      }
      timer = mutationDebounceTimer = setTimeout(() => {
        operation();
        mutationDebounceTimer = null;
      }, delay);
      break;
  }
}

/**
 * Executa operações pendentes de forma síncrona
 */
function flushPendingOperations() {
  if (globalState.isApplyingStyles) {
    return; // Evita reentrada
  }
  
  globalState.isApplyingStyles = true;
  
  try {
    while (globalState.pendingOperations.length > 0) {
      const operation = globalState.pendingOperations.shift();
      if (operation) {
        operation();
      }
    }
  } finally {
    globalState.isApplyingStyles = false;
  }
}

/**
 * Remove compensação externa aplicada por bibliotecas (especialmente Radix UI)
 * Detecta e corrige margin-right indevido que causa conflito com scrollbar-gutter
 */
function removeExternalCompensation() {
  const body = document.body;
  const computedStyle = getComputedStyle(body);
  
  // Detectar padding suspeito aplicado externamente
  const currentPadding = parseInt(computedStyle.paddingRight, 10) || 0;
  // CORREÇÃO: Usar valor armazenado em vez de recalcular após overflow: hidden
  const expectedScrollbarWidth = globalState.measuredScrollbarWidth || 0;
  
  console.log('removeExternalCompensation using stored value:', {
    currentPadding,
    expectedScrollbarWidth,
    measuredScrollbarWidth: globalState.measuredScrollbarWidth
  });
  
  // Detectar e corrigir margin-right aplicado pelo Radix UI
  const currentMarginRight = parseInt(computedStyle.marginRight, 10) || 0;
  if (currentMarginRight > 0) {
    console.log('Removing external margin-right compensation from Radix UI:', currentMarginRight);
    // Forçar margin-right para 0 (o CSS override também faz isso, mas garantimos aqui)
    body.style.marginRight = '0px';
    
    // Se margin-right for maior que a largura real da scrollbar, ajustar (clamp)
    if (currentMarginRight > expectedScrollbarWidth && expectedScrollbarWidth > 0) {
      console.log('Clamping excessive margin-right:', currentMarginRight, 'to scrollbar width:', expectedScrollbarWidth);
      // Mesmo assim, mantemos em 0 para evitar conflito com scrollbar-gutter
      body.style.marginRight = '0px';
    }
  }
  
  // Se há padding mas não deveria ter (overlay scrollbar ou sem scroll)
  if (currentPadding > 0 && (detectOverlayScrollbar() || expectedScrollbarWidth === 0)) {
    console.log('Removing external padding compensation:', currentPadding);
    body.style.paddingRight = '0px';
  }
  
  // Se há padding duplo - usar valor armazenado para comparação
  if (currentPadding > expectedScrollbarWidth && expectedScrollbarWidth > 0) {
    console.log('Removing double padding compensation:', currentPadding, 'expected:', expectedScrollbarWidth);
    body.style.paddingRight = `${expectedScrollbarWidth}px`;
  }
}

/**
 * Inicia observador de mutações no body
 */
function startMutationObserver() {
  if (globalState.mutationObserver) {
    return;
  }
  
  globalState.mutationObserver = new MutationObserver((mutations) => {
    let hasRelevantStyleChanges = false;
    
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && 
          mutation.attributeName === 'style' &&
          mutation.target === document.body) {
        
        // Ignorar mudanças causadas pelo Radix UI Select/Dropdown
        const body = document.body;
        const currentMarginRight = parseInt(body.style.marginRight || '0', 10);
        const currentPaddingRight = parseInt(body.style.paddingRight || '0', 10);
        const currentOverflow = body.style.overflow;
        
        // Se a mudança é apenas margin-right, padding-right ou overflow (típico do Radix UI),
        // e não temos scroll locks ativos, ignorar completamente
        if (globalState.activeLocks.size === 0) {
          // Verificar se é uma mudança típica do Radix UI:
          // 1. Pequenos valores de margin-right/padding-right (≤ 17px)
          // 2. Overflow hidden (usado pelo react-remove-scroll)
          const isRadixMarginChange = (currentMarginRight > 0 && currentMarginRight <= 17) || 
                                     (currentPaddingRight > 0 && currentPaddingRight <= 17);
          const isRadixOverflowChange = currentOverflow === 'hidden';
          
          if (isRadixMarginChange || isRadixOverflowChange) {
            console.log('Ignoring Radix UI Select style change:', { 
              marginRight: currentMarginRight, 
              paddingRight: currentPaddingRight,
              overflow: currentOverflow 
            });
            continue; // Ignorar esta mudança
          }
        }
        
        hasRelevantStyleChanges = true;
        break;
      }
    }
    
    if (hasRelevantStyleChanges && !globalState.isApplyingStyles) {
      console.log('External body style modification detected (non-Radix)');
      debouncedOperation(() => {
        removeExternalCompensation();
      }, 100, 'mutation'); // Increased delay and specific type
    }
  });
  
  globalState.mutationObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ['style'],
    subtree: false
  });
}

/**
 * Para observador de mutações
 */
function stopMutationObserver() {
  if (globalState.mutationObserver) {
    globalState.mutationObserver.disconnect();
    globalState.mutationObserver = null;
  }
}

/**
 * Aplica scroll lock de forma robusta
 */
function applyScrollLock() {
  const operation = () => {
    const body = document.body;
    const scrollY = window.scrollY;
    
    // CORREÇÃO FUNDAMENTAL: Medir scrollbar ANTES de aplicar overflow: hidden
    if (globalState.measuredScrollbarWidth === null) {
      globalState.measuredScrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      console.log('Measured scrollbar width before lock:', globalState.measuredScrollbarWidth);
    }
    
    // Salvar estilos originais apenas na primeira vez
    if (!globalState.originalBodyStyles) {
      globalState.originalBodyStyles = {
        overflow: body.style.overflow || '',
        paddingRight: body.style.paddingRight || '',
        position: body.style.position || '',
        top: body.style.top || '',
        width: body.style.width || '',
        marginRight: body.style.marginRight || '',
      };
    }
    
    // Resetar cache e recalcular
    resetScrollbarCache();
    
    console.log('Applying scroll lock:', {
      activeLocks: globalState.activeLocks.size,
      scrollY,
      measuredScrollbarWidth: globalState.measuredScrollbarWidth
    });
    
    // Aplicar estilos de bloqueio
    body.style.overflow = 'hidden';
    
    // Manter posição de scroll
    if (scrollY > 0) {
      body.style.position = 'fixed';
      body.style.top = `-${scrollY}px`;
      body.style.width = '100%';
    }
    
    // Aplicar compensação usando valor medido ANTES do lock
    if (globalState.measuredScrollbarWidth > 0) {
      body.style.paddingRight = `${globalState.measuredScrollbarWidth}px`;
    }
    
    // Iniciar observador
    startMutationObserver();
  };
  
  if (globalState.isApplyingStyles) {
    globalState.pendingOperations.push(operation);
  } else {
    operation();
  }
}

/**
 * Remove scroll lock de forma robusta
 */
function removeScrollLock() {
  const operation = () => {
    if (!globalState.originalBodyStyles) {
      return;
    }
    
    const body = document.body;
    const scrollY = parseInt(body.style.top?.replace('-', '').replace('px', '') || '0', 10);
    
    console.log('Removing scroll lock:', {
      scrollY,
      activeLocks: globalState.activeLocks.size
    });
    
    // Restaurar estilos originais
    body.style.overflow = globalState.originalBodyStyles.overflow;
    body.style.paddingRight = globalState.originalBodyStyles.paddingRight;
    body.style.position = globalState.originalBodyStyles.position;
    body.style.top = globalState.originalBodyStyles.top;
    body.style.width = globalState.originalBodyStyles.width;
    body.style.marginRight = globalState.originalBodyStyles.marginRight;
    
    // Restaurar posição de scroll
    if (scrollY > 0) {
      // Usar requestAnimationFrame para garantir que o scroll aconteça após a restauração dos estilos
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    }

    globalState.originalBodyStyles = null;
    if (globalState.activeLocks.size === 0) {
      globalState.measuredScrollbarWidth = null;
    }

    // Parar observador
    stopMutationObserver();
  };
  
  if (globalState.isApplyingStyles) {
    globalState.pendingOperations.push(operation);
  } else {
    operation();
  }
}

/**
 * Hook aprimorado para scroll lock
 */
export function useEnhancedScrollLock(isLocked: boolean = false) {
  const lockIdRef = useRef<string | null>(null);
  const wasLockedRef = useRef(false);
  
  // Gerar ID único
  if (!lockIdRef.current) {
    lockIdRef.current = `lock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  const applyLock = useCallback(() => {
    if (!lockIdRef.current || globalState.activeLocks.has(lockIdRef.current)) {
      return;
    }
    
    // Cancel any pending remove operations to prevent conflicts
    if (removeDebounceTimer) {
      clearTimeout(removeDebounceTimer);
      removeDebounceTimer = null;
    }
    
    globalState.activeLocks.add(lockIdRef.current);
    
    if (globalState.activeLocks.size === 1) {
      // Primeiro lock - aplicar estilos
      debouncedOperation(() => {
        applyScrollLock();
        flushPendingOperations();
      }, 16, 'apply');
    }
  }, []);
  
  const removeLock = useCallback(() => {
    if (!lockIdRef.current || !globalState.activeLocks.has(lockIdRef.current)) {
      return;
    }
    
    // Cancel any pending apply operations to prevent conflicts
    if (applyDebounceTimer) {
      clearTimeout(applyDebounceTimer);
      applyDebounceTimer = null;
    }
    
    globalState.activeLocks.delete(lockIdRef.current);
    
    if (globalState.activeLocks.size === 0) {
      // Último lock - remover estilos
      debouncedOperation(() => {
        removeScrollLock();
        flushPendingOperations();
      }, 16, 'remove');
    }
  }, []);
  
  useEffect(() => {
    if (isLocked && !wasLockedRef.current) {
      wasLockedRef.current = true;
      applyLock();
    } else if (!isLocked && wasLockedRef.current) {
      wasLockedRef.current = false;
      removeLock();
    }
  }, [isLocked, applyLock, removeLock]);
  
  // Cleanup no unmount
  useEffect(() => {
    return () => {
      if (wasLockedRef.current) {
        removeLock();
      }
    };
  }, [removeLock]);
  
  return {
    isLocked: wasLockedRef.current,
    lockId: lockIdRef.current,
    activeLocks: globalState.activeLocks.size,
    hasOriginalStyles: globalState.originalBodyStyles !== null
  };
}

/**
 * Função para debug e diagnóstico
 */
export function getScrollLockDebugInfo() {
  return {
    activeLocks: Array.from(globalState.activeLocks),
    lockCount: globalState.activeLocks.size,
    hasOriginalStyles: globalState.originalBodyStyles !== null,
    isApplyingStyles: globalState.isApplyingStyles,
    pendingOperations: globalState.pendingOperations.length,
    hasObserver: globalState.mutationObserver !== null,
    bodyStyles: {
      overflow: document.body.style.overflow,
      paddingRight: document.body.style.paddingRight,
      position: document.body.style.position,
      top: document.body.style.top
    },
    scrollbarInfo: {
      width: getScrollbarWidth(),
      isOverlay: detectOverlayScrollbar(),
      hasVerticalScroll: hasVerticalScrollbar()
    }
  };
}

/**
 * Força reset completo do scroll lock (para casos extremos)
 */
export function forceResetScrollLock() {
  // Clear all debounce timers
  if (applyDebounceTimer) {
    clearTimeout(applyDebounceTimer);
    applyDebounceTimer = null;
  }
  if (removeDebounceTimer) {
    clearTimeout(removeDebounceTimer);
    removeDebounceTimer = null;
  }
  if (mutationDebounceTimer) {
    clearTimeout(mutationDebounceTimer);
    mutationDebounceTimer = null;
  }
  
  // Clear pending operations
  globalState.pendingOperations = [];
  
  // Stop mutation observer
  stopMutationObserver();
  
  // Reset cache
  resetScrollbarCache();
  
  // Restore original styles if they exist
  if (globalState.originalBodyStyles) {
    const body = document.body;
    body.style.overflow = globalState.originalBodyStyles.overflow;
    body.style.paddingRight = globalState.originalBodyStyles.paddingRight;
    body.style.position = globalState.originalBodyStyles.position;
    body.style.top = globalState.originalBodyStyles.top;
    body.style.width = globalState.originalBodyStyles.width;
    body.style.marginRight = globalState.originalBodyStyles.marginRight;
  }
  
  // Clear state
  globalState.activeLocks.clear();
  globalState.originalBodyStyles = null;
  globalState.isApplyingStyles = false;
  
  console.log('Scroll lock forcefully reset');
}