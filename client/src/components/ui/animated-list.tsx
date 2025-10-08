import React from 'react';
import { AnimatedSection, AnimationType } from './animated-section';

interface AnimatedListProps {
  children: React.ReactNode;
  animation?: AnimationType;
  delay?: number;
  staggerDelay?: number;
  className?: string;
}

export function AnimatedList({
  children,
  animation = 'slideUp',
  delay = 0,
  staggerDelay = 100,
  className = ''
}: AnimatedListProps) {
  const childrenArray = React.Children.toArray(children);
  
  // If there's only one child and it's a container element, apply stagger to its children
  if (childrenArray.length === 1) {
    const child = childrenArray[0] as React.ReactElement;
    if (React.isValidElement(child) && (child.props as any).children) {
      const grandChildren = React.Children.toArray((child.props as any).children);
      
      const animatedGrandChildren = grandChildren.map((grandChild, index) => {
        if (React.isValidElement(grandChild)) {
          return (
            <AnimatedSection
              key={index}
              animation={animation}
              delay={delay + (index * staggerDelay)}
            >
              {grandChild}
            </AnimatedSection>
          );
        }
        return grandChild;
      });
      
      const childProps = child.props as any;
      return React.cloneElement(child, {
        ...childProps,
        className: `${childProps.className || ''} ${className}`.trim(),
        children: animatedGrandChildren
      });
    }
  }
  
  // Default behavior: animate direct children
  return (
    <div className={className}>
      {childrenArray.map((child, index) => (
        <AnimatedSection
          key={index}
          animation={animation}
          delay={delay + (index * staggerDelay)}
        >
          {child}
        </AnimatedSection>
      ))}
    </div>
  );
}