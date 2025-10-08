import * as React from "react"
import { FieldError, Group, Label, Text } from "react-aria-components"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const fieldVariants = cva(
  "flex flex-col gap-1",
  {
    variants: {
      variant: {
        default: "",
        inline: "flex-row items-center gap-2",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface FieldProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof fieldVariants> {
  label?: string
  description?: string
  errorMessage?: string
  isRequired?: boolean
  isDisabled?: boolean
}

const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({ 
    className, 
    variant, 
    label, 
    description, 
    errorMessage, 
    isRequired = false,
    isDisabled = false,
    children,
    ...props 
  }, ref) => {
    return (
      <Group
        ref={ref}
        className={cn(fieldVariants({ variant, className }))}
        isDisabled={isDisabled}
      >
        {label && (
          <Label className={cn(
            "text-sm font-medium text-foreground",
            isDisabled && "opacity-50"
          )}>
            {label}
            {isRequired && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
        {children}
        {description && (
          <Text 
            slot="description" 
            className={cn(
              "text-xs text-muted-foreground",
              isDisabled && "opacity-50"
            )}
          >
            {description}
          </Text>
        )}
        {errorMessage && (
          <FieldError className="text-xs text-destructive">
            {errorMessage}
          </FieldError>
        )}
      </Group>
    )
  }
)

Field.displayName = "Field"

export { Field, fieldVariants }