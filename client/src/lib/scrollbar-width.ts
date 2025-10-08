/**
 * Utilitário robusto para detecção e compensação de scrollbar
 * Suporta scrollbar overlay (macOS/iOS) e previne dupla compensação
 */

let scrollbarWidth: number | null = null;
let isOverlayScrollbar: boolean | null = null;
let hasNativeScrollbar: boolean | null = null;

/**
 * Detecta se o sistema usa scrollbar overlay (macOS, iOS)
 */
export function detectOverlayScrollbar(): boolean {
  if (isOverlayScrollbar !== null) {
    return isOverlayScrollbar;
  }

  // Detectar pelo user agent primeiro
  const userAgent = navigator.userAgent.toLowerCase();
  const isMacOS = userAgent.includes('mac os x');
  const isIOS = /ipad|iphone|ipod/.test(userAgent);
  
  if (isIOS) {
    isOverlayScrollbar = true;
    return true;
  }

  // Teste prático para scrollbar overlay
  const testElement = document.createElement('div');
  testElement.style.cssText = `
    position: absolute;
    top: -9999px;
    width: 100px;
    height: 100px;
    overflow: scroll;
    -ms-overflow-style: scrollbar;
  `;
  
  document.body.appendChild(testElement);
  
  const innerElement = document.createElement('div');
  innerElement.style.height = '200px';
  testElement.appendChild(innerElement);
  
  // Forçar scroll
  testElement.scrollTop = 1;
  
  // Se a largura não mudou com scroll, é overlay
  const widthWithScroll = testElement.offsetWidth;
  const clientWidthWithScroll = testElement.clientWidth;
  
  document.body.removeChild(testElement);
  
  // Em scrollbar overlay, offsetWidth === clientWidth mesmo com scroll
  isOverlayScrollbar = widthWithScroll === clientWidthWithScroll || isMacOS;
  
  return isOverlayScrollbar;
}

/**
 * Detecta se há scrollbar nativa visível
 */
export function hasNativeScrollbarVisible(): boolean {
  if (hasNativeScrollbar !== null) {
    return hasNativeScrollbar;
  }

  // Se é overlay, não há scrollbar visível que cause deslocamento
  if (detectOverlayScrollbar()) {
    hasNativeScrollbar = false;
    return false;
  }

  // Verificar se há conteúdo que causa scroll
  const hasVerticalScroll = document.documentElement.scrollHeight > window.innerHeight;
  const hasHorizontalScroll = document.documentElement.scrollWidth > window.innerWidth;
  
  hasNativeScrollbar = hasVerticalScroll || hasHorizontalScroll;
  return hasNativeScrollbar;
}

/**
 * Calcula a largura da scrollbar nativa
 */
export function getScrollbarWidth(): number {
  if (scrollbarWidth !== null) {
    return scrollbarWidth;
  }

  // Se é scrollbar overlay, largura é 0 para compensação
  if (detectOverlayScrollbar()) {
    scrollbarWidth = 0;
    return 0;
  }

  // Criar elementos de teste
  const outer = document.createElement('div');
  outer.style.cssText = `
    position: absolute;
    top: -9999px;
    width: 100px;
    height: 100px;
    overflow: scroll;
    -ms-overflow-style: scrollbar;
    scrollbar-width: auto;
  `;
  
  document.body.appendChild(outer);

  const inner = document.createElement('div');
  inner.style.cssText = `
    width: 100%;
    height: 200px;
  `;
  outer.appendChild(inner);

  // Calcular diferença
  scrollbarWidth = outer.offsetWidth - outer.clientWidth;
  
  // Limpar
  document.body.removeChild(outer);

  // Garantir valor mínimo para scrollbars muito finas
  if (scrollbarWidth < 0) scrollbarWidth = 0;
  if (scrollbarWidth > 0 && scrollbarWidth < 8) scrollbarWidth = Math.max(scrollbarWidth, 15);

  return scrollbarWidth;
}

/**
 * Verifica se há scroll vertical na página
 */
export function hasVerticalScrollbar(): boolean {
  return document.documentElement.scrollHeight > window.innerHeight;
}

/**
 * Verifica se há scroll horizontal na página
 */
export function hasHorizontalScrollbar(): boolean {
  return document.documentElement.scrollWidth > window.innerWidth;
}

/**
 * Verifica se há qualquer tipo de scrollbar
 */
export function hasScrollbar(): boolean {
  return hasVerticalScrollbar() || hasHorizontalScrollbar();
}

/**
 * Reseta todos os caches
 */
export function resetScrollbarCache(): void {
  scrollbarWidth = null;
  isOverlayScrollbar = null;
  hasNativeScrollbar = null;
}

/**
 * Obtém informações completas sobre scrollbar
 */
export function getScrollbarInfo() {
  return {
    width: getScrollbarWidth(),
    isOverlay: detectOverlayScrollbar(),
    hasNative: hasNativeScrollbarVisible(),
    hasVertical: hasVerticalScrollbar(),
    hasHorizontal: hasHorizontalScrollbar(),
  };
}

/**
 * Aplica compensação inteligente considerando tipo de scrollbar
 */
export function applySmartScrollbarCompensation(element: HTMLElement): void {
  if (!hasVerticalScrollbar()) return;
  
  const width = getScrollbarWidth();
  if (width > 0) {
    const currentPadding = parseInt(getComputedStyle(element).paddingRight, 10) || 0;
    element.style.paddingRight = `${currentPadding + width}px`;
  }
}

/**
 * Remove compensação de scrollbar
 */
export function removeScrollbarCompensation(element: HTMLElement): void {
  element.style.paddingRight = '';
}