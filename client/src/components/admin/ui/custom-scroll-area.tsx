import * as React from 'react';
import { ScrollArea as BaseScrollArea } from '@base-ui-components/react/scroll-area';
import { cn } from '@/lib/utils';

interface CustomScrollAreaProps {
  children: React.ReactNode;
  className?: string;
  viewportClassName?: string;
}

export const CustomScrollArea = React.forwardRef<
  HTMLDivElement,
  CustomScrollAreaProps
>(({ children, className, viewportClassName, ...props }, ref) => (
  <BaseScrollArea.Root 
    ref={ref}
    className={cn("relative overflow-hidden", className)} 
    {...props}
  >
    <BaseScrollArea.Viewport 
      className={cn(
        "h-full overscroll-contain rounded-md", 
        viewportClassName
      )}
    >
      {children}
    </BaseScrollArea.Viewport>
    <BaseScrollArea.Scrollbar className="m-2 flex w-1 justify-center rounded bg-muted opacity-0 transition-opacity delay-300 data-[hovering]:opacity-100 data-[hovering]:delay-0 data-[hovering]:duration-75 data-[scrolling]:opacity-100 data-[scrolling]:delay-0 data-[scrolling]:duration-75">
      <BaseScrollArea.Thumb className="w-full rounded bg-muted-foreground/50" />
    </BaseScrollArea.Scrollbar>
  </BaseScrollArea.Root>
));

CustomScrollArea.displayName = 'CustomScrollArea';