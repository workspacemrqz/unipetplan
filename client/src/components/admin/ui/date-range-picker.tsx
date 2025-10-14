import * as React from "react"
import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date"
import { Calendar as CalendarIcon, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer"
import { useMobileViewport } from "@/hooks/use-mobile"
import { DateField } from "@/components/ui/datefield"
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
    <div className="p-4 space-y-4" style={{ 
      background: 'linear-gradient(135deg, #0e7074 0%, #277677 100%)'
    }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-white/90">Data inicial</label>
          <DateField
            value={tempRange.startDate}
            onChange={handleStartDateChange}
            placeholder="dd/mm/aaaa"
            className="bg-white/20 border border-white/30 rounded-md px-3 py-2 [&_span]:!text-white [&_span[data-placeholder]]:!text-white/60"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-white/90">Data final</label>
          <DateField
            value={tempRange.endDate}
            onChange={handleEndDateChange}
            placeholder="dd/mm/aaaa"
            className="bg-white/20 border border-white/30 rounded-md px-3 py-2 [&_span]:!text-white [&_span[data-placeholder]]:!text-white/60"
          />
        </div>
      </div>
      
      <div className="flex justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleClear}
          className="flex-1 bg-white/20 border-white/30 text-white hover:bg-white/30"
        >
          <X className="mr-2 h-4 w-4" />
          Limpar
        </Button>
        <Button
          size="sm"
          onClick={handleApply}
          className="flex-1 bg-white/30 border-white/40 text-white hover:bg-white/40 font-semibold"
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
        "w-full justify-start text-left font-normal"
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
          <DrawerContent className="border-0">
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
        <PopoverContent className="w-auto p-0 border-0 shadow-lg rounded-lg overflow-hidden" align="start">
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