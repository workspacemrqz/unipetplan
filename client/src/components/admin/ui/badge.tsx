import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-semibold transition-colors leading-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground rounded-full border border-border",
        secondary:
          "bg-secondary text-secondary-foreground rounded-full border border-border",
        destructive:
          "bg-destructive text-destructive-foreground rounded-full border border-border",
        outline: "bg-transparent text-foreground rounded-full border border-border",
        neutral: "border border-border rounded-lg bg-background text-foreground",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
