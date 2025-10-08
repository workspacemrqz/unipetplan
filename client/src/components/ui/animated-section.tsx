import React from 'react';
import { useScrollAnimation, useStaggeredScrollAnimation } from '@/hooks/use-scroll-animation';
import { cn } from '@/lib/utils';

export type AnimationType = 'fadeIn' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'scale' | 'rotateIn';

interface AnimatedSectionProps {
  children: React.ReactNode;
  animation?: AnimationType;
  duration?: number;
  delay?: number;
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

const animationClasses: Record<AnimationType, { initial: string; animate: string }> = {
  fadeIn: {
    initial: 'opacity-0',
    animate: 'opacity-100'
  },
  slideUp: {
    initial: 'opacity-0 translate-y-8',
    animate: 'opacity-100 translate-y-0'
  },
  slideDown: {
    initial: 'opacity-0 -translate-y-8',
    animate: 'opacity-100 translate-y-0'
  },
  slideLeft: {
    initial: 'opacity-0 translate-x-8',
    animate: 'opacity-100 translate-x-0'
  },
  slideRight: {
    initial: 'opacity-0 -translate-x-8',
    animate: 'opacity-100 translate-x-0'
  },
  scale: {
    initial: 'opacity-0 scale-95',
    animate: 'opacity-100 scale-100'
  },
  rotateIn: {
    initial: 'opacity-0 rotate-12 scale-95',
    animate: 'opacity-100 rotate-0 scale-100'
  }
};

export function AnimatedSection({
  children,
  animation = 'fadeIn',
  duration = 300,
  delay = 0,
  threshold = 0.1,
  rootMargin = '0px 0px -50px 0px',
  triggerOnce = true,
  className,
  as: Component = 'div'
}: AnimatedSectionProps) {
  const { elementRef, isVisible } = useScrollAnimation({
    threshold,
    rootMargin,
    triggerOnce,
    delay
  });

  const animationConfig = animationClasses[animation];
  
  const ComponentElement = Component as any;
  
  return (
    <ComponentElement
      ref={elementRef}
      className={cn(
        'transition-all ease-out',
        isVisible ? animationConfig.animate : animationConfig.initial,
        className
      )}
      style={{
        transitionDuration: `${duration}ms`
      }}
    >
      {children}
    </ComponentElement>
  );
}

// Componente para animações em lista com efeito stagger
interface AnimatedListProps {
  children: React.ReactNode[];
  animation?: AnimationType;
  duration?: number;
  staggerDelay?: number;
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  className?: string;
  itemClassName?: string;
  as?: keyof JSX.IntrinsicElements;
  itemAs?: keyof JSX.IntrinsicElements;
}

export function AnimatedList({
  children,
  animation = 'slideUp',
  duration = 300,
  staggerDelay = 50,
  threshold = 0.1,
  rootMargin = '0px 0px -50px 0px',
  triggerOnce = true,
  className,
  itemClassName,
  as: Component = 'div',
  itemAs: ItemComponent = 'div'
}: AnimatedListProps) {
  const { registerElement, isVisible } = useStaggeredScrollAnimation({
    threshold,
    rootMargin,
    staggerDelay,
    triggerOnce
  });

  const animationConfig = animationClasses[animation];
  const ComponentElement = Component as any;
  const ItemComponentElement = ItemComponent as any;

  return (
    <ComponentElement className={className}>
      {children.map((child, index) => (
        <ItemComponentElement
          key={index}
          ref={registerElement(index) as any}
          className={cn(
            'transition-all ease-out',
            isVisible(index) ? animationConfig.animate : animationConfig.initial,
            itemClassName
          )}
          style={{
            transitionDuration: `${duration}ms`
          }}
        >
          {child}
        </ItemComponentElement>
      ))}
    </ComponentElement>
  );
}