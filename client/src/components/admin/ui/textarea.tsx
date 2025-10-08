import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, style, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-lg border text-base placeholder:text-placeholder-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none p-3",
        className
      )}
      style={{
        borderColor: 'var(--border-gray)',
        backgroundColor: '#FFFFFF',
        ...style
      }}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
