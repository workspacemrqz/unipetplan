import { useEffect, useRef, useState } from 'react';

interface UseScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  delay?: number;
}

export function useScrollAnimation({
  threshold = 0.1,
  rootMargin = '0px 0px -50px 0px',
  triggerOnce = true,
  delay = 0
}: UseScrollAnimationOptions = {}) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delay > 0) {
            setTimeout(() => {
              setIsVisible(true);
              if (triggerOnce) {
                setHasTriggered(true);
              }
            }, delay);
          } else {
            setIsVisible(true);
            if (triggerOnce) {
              setHasTriggered(true);
            }
          }
        } else if (!triggerOnce && !hasTriggered) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, rootMargin, triggerOnce, delay, hasTriggered]);

  return { elementRef, isVisible };
}

// Hook para múltiplos elementos com stagger effect
export function useStaggeredScrollAnimation({
  threshold = 0.1,
  rootMargin = '0px 0px -50px 0px',
  staggerDelay = 50,
  triggerOnce = true
}: UseScrollAnimationOptions & { staggerDelay?: number } = {}) {
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set());
  const elementsRef = useRef<(HTMLElement | null)[]>([]);
  const observersRef = useRef<IntersectionObserver[]>([]);

  const registerElement = (index: number) => (element: HTMLElement | null) => {
    elementsRef.current[index] = element;
    
    if (element) {
      // Limpar observer anterior se existir
      if (observersRef.current[index]) {
        observersRef.current[index].disconnect();
      }

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              setVisibleItems(prev => new Set([...prev, index]));
            }, index * staggerDelay);
            
            if (triggerOnce) {
              observer.unobserve(element);
            }
          } else if (!triggerOnce) {
            setVisibleItems(prev => {
              const newSet = new Set(prev);
              newSet.delete(index);
              return newSet;
            });
          }
        },
        {
          threshold,
          rootMargin
        }
      );

      observer.observe(element);
      observersRef.current[index] = observer;
    }
  };

  const isVisible = (index: number) => visibleItems.has(index);

  useEffect(() => {
    return () => {
      // Cleanup all observers
      observersRef.current.forEach(observer => {
        if (observer) observer.disconnect();
      });
    };
  }, []);

  return { registerElement, isVisible };
}