/**
 * Função para scroll suave com easing personalizado
 * Simula o movimento natural do mouse com aceleração e desaceleração
 */
export const smoothScrollTo = (
  targetElement: HTMLElement,
  headerOffset: number = 80,
  duration: number = 800
): void => {
  const targetPosition = targetElement.offsetTop - headerOffset;
  const startPosition = window.pageYOffset;
  const distance = targetPosition - startPosition;
  let start: number | null = null;

  // Função de easing para movimento natural (cúbico)
  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  // Função de animação de scroll
  const animation = (currentTime: number): void => {
    if (start === null) start = currentTime;
    const timeElapsed = currentTime - start;
    const progress = Math.min(timeElapsed / duration, 1);
    const easedProgress = easeInOutCubic(progress);
    
    window.scrollTo(0, startPosition + distance * easedProgress);
    
    if (progress < 1) {
      requestAnimationFrame(animation);
    }
  };

  requestAnimationFrame(animation);
};

/**
 * Função para scroll suave para uma seção específica por ID
 */
export const smoothScrollToSection = (
  sectionId: string,
  headerOffset: number = 80,
  duration: number = 800
): void => {
  const element = document.getElementById(sectionId);
  if (element) {
    smoothScrollTo(element, headerOffset, duration);
  }
};

/**
 * Função para scroll automático quando há anchor na URL
 */
export const autoScrollToAnchor = (
  headerOffset: number = 80,
  duration: number = 800,
  delay: number = 500
): void => {
  const hash = window.location.hash;
  if (hash) {
    setTimeout(() => {
      const targetId = hash.substring(1); // Remove o #
      smoothScrollToSection(targetId, headerOffset, duration);
    }, delay);
  }
};
