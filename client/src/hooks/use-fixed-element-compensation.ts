import { useEffect, useRef } from 'react';
import { getScrollbarWidth, hasScrollbar } from '../lib/scrollbar-width';

/**
 * Hook para aplicar compensação de scrollbar a elementos fixos específicos
 * Útil para headers, navbars ou outros elementos que ficam fixos na tela
 */
export function useFixedElementCompensation(
  isActive: boolean,
  elementRef?: React.RefObject<HTMLElement>,
  selector?: string
) {
  const originalStylesRef = useRef<Map<HTMLElement, string>>(new Map());

  useEffect(() => {
    if (!isActive) {
      // Restaurar estilos originais
      originalStylesRef.current.forEach((originalPaddingRight, element) => {
        element.style.paddingRight = originalPaddingRight;
      });
      originalStylesRef.current.clear();
      return;
    }

    // Determinar quais elementos aplicar compensação
    let elements: HTMLElement[] = [];
    
    if (elementRef?.current) {
      elements = [elementRef.current];
    } else if (selector) {
      elements = Array.from(document.querySelectorAll(selector));
    }

    if (elements.length === 0) return;

    // Aplicar compensação se necessário
    if (hasScrollbar()) {
      const scrollbarWidth = getScrollbarWidth();
      
      elements.forEach(element => {
        // Salvar estilo original
        if (!originalStylesRef.current.has(element)) {
          originalStylesRef.current.set(element, element.style.paddingRight || '');
        }
        
        // Calcular padding atual
        const currentPaddingRight = parseInt(getComputedStyle(element).paddingRight, 10) || 0;
        
        // Aplicar compensação
        element.style.paddingRight = `${currentPaddingRight + scrollbarWidth}px`;
        
        // Adicionar classe para transição suave
        element.classList.add('fixed-element-compensation');
      });
    }

    // Cleanup
    return () => {
      originalStylesRef.current.forEach((originalPaddingRight, element) => {
        element.style.paddingRight = originalPaddingRight;
        element.classList.remove('fixed-element-compensation');
      });
      originalStylesRef.current.clear();
    };
  }, [isActive, elementRef, selector]);

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      originalStylesRef.current.forEach((originalPaddingRight, element) => {
        element.style.paddingRight = originalPaddingRight;
        element.classList.remove('fixed-element-compensation');
      });
      originalStylesRef.current.clear();
    };
  }, []);
}

/**
 * Hook simplificado para aplicar compensação a um elemento específico
 */
export function useElementScrollbarCompensation(
  elementRef: React.RefObject<HTMLElement>,
  isActive: boolean
) {
  return useFixedElementCompensation(isActive, elementRef);
}

/**
 * Hook para aplicar compensação a elementos por seletor CSS
 */
export function useSelectorScrollbarCompensation(
  selector: string,
  isActive: boolean
) {
  return useFixedElementCompensation(isActive, undefined, selector);
}