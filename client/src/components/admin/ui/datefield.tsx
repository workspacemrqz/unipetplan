import * as React from "react"
import { DateField, DateInput, DateSegment, Label } from "react-aria-components"
import { CalendarDate, parseDate } from "@internationalized/date"
import { cn } from "@/lib/utils"

export interface DateFieldProps {
  label?: string
  value?: CalendarDate | null
  onChange?: (date: CalendarDate | null) => void
  placeholder?: string
  isDisabled?: boolean
  isRequired?: boolean
  className?: string
  error?: string
}

const DateFieldComponent = React.forwardRef<
  React.ElementRef<typeof DateField>,
  DateFieldProps
>(({ 
  label, 
  value, 
  onChange, 
  placeholder = "dd/mm/yyyy",
  isDisabled = false,
  isRequired = false,
  className,
  error,
  ...props 
}, ref) => {
  return (
    <DateField
      ref={ref}
      value={value}
      onChange={onChange}
      isDisabled={isDisabled}
      isRequired={isRequired}
      className={cn("flex flex-col gap-1", className)}
      {...props}
    >
      {label && (
        <Label className="text-sm font-medium text-foreground">
          {label}
          {isRequired && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <DateInput className="flex">
        {(segment) => (
          <DateSegment
            segment={segment}
            className={cn(
              "inline-block px-1 py-1 text-sm tabular-nums text-foreground",
              "",
              "placeholder-shown:text-muted-foreground",
              segment.isPlaceholder && "text-muted-foreground",
              isDisabled && "opacity-50 cursor-not-allowed"
            )}
          />
        )}
      </DateInput>
      {error && (
        <span className="text-sm text-destructive">{error}</span>
      )}
    </DateField>
  )
})

DateFieldComponent.displayName = "DateField"

export { DateFieldComponent as DateField }