import * as React from "react"
import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date"
import { Calendar as CalendarIcon, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer"
import { useMobileViewport } from "@/hooks/use-mobile"
import { DateField } from "@/components/ui/datefield"
import { Field } from "@/components/ui/field"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export interface DateRange {
  startDate: CalendarDate | null
  endDate: CalendarDate | null
}

export interface DateRangePickerProps {
  value?: DateRange
  onChange?: (range: DateRange) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  isLoading?: boolean
}

const DateRangePicker = React.forwardRef<
  HTMLDivElement,
  DateRangePickerProps
>(({ value, onChange, placeholder = "Selecionar período", className, disabled = false, isLoading = false }, ref) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [tempRange, setTempRange] = React.useState<DateRange>(
    value || { startDate: null, endDate: null }
  )
  const { isMobile } = useMobileViewport()

  const formatDateRange = (range: DateRange) => {
    if (!range.startDate && !range.endDate) {
      return placeholder
    }
    
    const formatDate = (date: CalendarDate | null) => {
      if (!date) return ""
      const jsDate = new Date(date.year, date.month - 1, date.day)
      return format(jsDate, "dd/MM/yyyy", { locale: ptBR })
    }

    if (range.startDate && range.endDate) {
      return `${formatDate(range.startDate)} - ${formatDate(range.endDate)}`
    } else if (range.startDate) {
      return `A partir de ${formatDate(range.startDate)}`
    } else if (range.endDate) {
      return `Até ${formatDate(range.endDate)}`
    }
    
    return placeholder
  }

  const handleApply = () => {
    onChange?.(tempRange)
    setIsOpen(false)
  }

  const handleClear = () => {
    const clearedRange = { startDate: null, endDate: null }
    setTempRange(clearedRange)
    onChange?.(clearedRange)
    setIsOpen(false)
  }

  const handleStartDateChange = (date: CalendarDate | null) => {
    setTempRange(prev => ({ ...prev, startDate: date }))
  }

  const handleEndDateChange = (date: CalendarDate | null) => {
    setTempRange(prev => ({ ...prev, endDate: date }))
  }

  React.useEffect(() => {
    if (value) {
      setTempRange(value)
    }
  }, [value])

  const renderContent = () => (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Data inicial">
          <DateField
            value={tempRange.startDate}
            onChange={handleStartDateChange}
            placeholder="dd/mm/aaaa"
          />
        </Field>
        <Field label="Data final">
          <DateField
            value={tempRange.endDate}
            onChange={handleEndDateChange}
            placeholder="dd/mm/aaaa"
          />
        </Field>
      </div>
      
      <div className="flex justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleClear}
          className="flex-1 bg-input text-accent-foreground"
        >
          <X className="mr-2 h-4 w-4" />
          Limpar
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleApply}
          className="flex-1"
        >
          Aplicar
        </Button>
      </div>
    </div>
  )

  const triggerButton = (
    <Button
      variant="outline"
      className={cn(
        "w-full justify-start text-left font-normal bg-input text-accent-foreground"
      )}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-accent-foreground border-t-transparent" />
      ) : (
        <CalendarIcon className="mr-2 h-4 w-4" />
      )}
      {isLoading ? "Aplicando filtro..." : formatDateRange(value || { startDate: null, endDate: null })}
    </Button>
  )

  if (isMobile) {
    return (
      <div ref={ref} className={cn("grid gap-2", className)}>
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
          <DrawerTrigger asChild>
            {triggerButton}
          </DrawerTrigger>
          <DrawerContent>
            {renderContent()}
          </DrawerContent>
        </Drawer>
      </div>
    )
  }

  return (
    <div ref={ref} className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          {triggerButton}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          {renderContent()}
        </PopoverContent>
      </Popover>
    </div>
  )
})

DateRangePicker.displayName = "DateRangePicker"

// Alternative implementation with calendar view
export interface JollyDateRangePickerProps extends DateRangePickerProps {
  showCalendar?: boolean
}

const JollyDateRangePicker = React.forwardRef<
  HTMLDivElement,
  JollyDateRangePickerProps
>(({ showCalendar = true, ...props }, ref) => {
  if (!showCalendar) {
    return <DateRangePicker ref={ref} {...props} />
  }

  // For now, return the basic DateRangePicker
  // Can be extended later with calendar integration
  return <DateRangePicker ref={ref} {...props} />
})

JollyDateRangePicker.displayName = "JollyDateRangePicker"

export { DateRangePicker, JollyDateRangePicker }