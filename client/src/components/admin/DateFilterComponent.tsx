import * as React from "react"
import { CalendarDate } from "@internationalized/date"
import { X, Filter } from "lucide-react"
import { Button } from "@/components/admin/ui/button"
import { DateRangePicker } from "@/components/admin/ui/date-range-picker"
import { Alert, AlertDescription } from "@/components/admin/ui/alert"
import { useDateFilter, type DateRange } from "@/hooks/admin/use-date-filter"
import { jsDateToCalendarDate } from "@/lib/admin/date-utils"
import { cn } from "@/lib/admin/utils"

export interface DateFilterComponentProps {
  onDateRangeChange?: (startDate: CalendarDate | null, endDate: CalendarDate | null) => void
  isLoading?: boolean
  className?: string
  initialRange?: DateRange
}


// Helper function to get current month range
const getCurrentMonthRange = (): DateRange => {
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  
  return {
    startDate: jsDateToCalendarDate(firstDay),
    endDate: jsDateToCalendarDate(lastDay)
  }
}

// Helper function to get current week range
const getCurrentWeekRange = (): DateRange => {
  const today = new Date()
  const currentDay = today.getDay()
  const diff = currentDay === 0 ? -6 : 1 - currentDay // Adjust for Monday start
  
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)
  
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  
  return {
    startDate: jsDateToCalendarDate(monday),
    endDate: jsDateToCalendarDate(sunday)
  }
}

// Helper function to get today's range
const getTodayRange = (): DateRange => {
  const today = new Date()
  
  return {
    startDate: jsDateToCalendarDate(today),
    endDate: jsDateToCalendarDate(today)
  }
}

const DateFilterComponent = React.memo(function DateFilterComponent({
  onDateRangeChange,
  isLoading = false,
  className,
  initialRange
}: DateFilterComponentProps) {
  // Use default range (no filter) if no valid initial range provided
  const defaultRange = React.useMemo(() => {
    if (initialRange?.startDate && initialRange?.endDate) {
      return initialRange
    }
    return { startDate: null, endDate: null }
  }, [initialRange])
  
  const {
    dateRange,
    setDateRange,
    clearFilter,
    isFiltering,
    errorMessage
  } = useDateFilter(defaultRange)

  const handleDateRangeChange = React.useCallback((range: DateRange) => {
    setDateRange(range)
    onDateRangeChange?.(range.startDate, range.endDate)
  }, [setDateRange, onDateRangeChange])

  const handleClearFilter = React.useCallback(() => {
    clearFilter()
    onDateRangeChange?.(null, null)
  }, [clearFilter, onDateRangeChange])

  // Quick date selection handlers
  const handleQuickSelection = React.useCallback((range: DateRange) => {
    setDateRange(range)
    onDateRangeChange?.(range.startDate, range.endDate)
  }, [setDateRange, onDateRangeChange])

  const handleCurrentMonth = React.useCallback(() => {
    handleQuickSelection(getCurrentMonthRange())
  }, [handleQuickSelection])

  const handleCurrentWeek = React.useCallback(() => {
    handleQuickSelection(getCurrentWeekRange())
  }, [handleQuickSelection])

  const handleToday = React.useCallback(() => {
    handleQuickSelection(getTodayRange())
  }, [handleQuickSelection])

  // No default range on component mount - starts with no filter

  return (
    <div 
      className={cn("rounded-xl p-6", className)} 
      style={{ 
        background: 'linear-gradient(135deg, #0e7074 0%, #277677 100%)',
        border: 'none',
        boxShadow: '0 10px 40px rgba(14, 112, 116, 0.2)'
      }}
    >
      <div className="space-y-3 sm:space-y-4">
        {/* Header */}
        <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-white/80 flex-shrink-0" />
            <h3 className="text-lg font-semibold text-white">
              Filtrar por período
            </h3>
          </div>
          {isFiltering && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilter}
              disabled={isLoading}
              className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
            >
              <X className="h-4 w-4 mr-2" />
              Limpar
            </Button>
          )}
        </div>

        {/* Date Range Picker with Quick Selection Buttons */}
        <div className="relative overflow-hidden rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 p-4 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12"></div>
          <div className="relative z-10 space-y-2">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
              <div className="flex-1">
                <DateRangePicker
                  value={dateRange}
                  onChange={handleDateRangeChange}
                  placeholder="Selecionar período personalizado"
                  disabled={isLoading}
                  isLoading={isLoading}
                  className="w-full bg-white/20 text-white border-white/30 [&_input]:text-white [&_input]:placeholder-white/60"
                />
              </div>
              
              {/* Quick Selection Buttons - Mobile: above, Desktop: right side */}
              <div className="flex flex-wrap gap-2 md:flex-nowrap md:gap-2">
                <Button
                  size="sm"
                  onClick={handleCurrentMonth}
                  disabled={isLoading}
                  aria-label="Filtrar por mês atual"
                  className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30 hover:border-white/40"
                >
                  Mês atual
                </Button>
                <Button
                  size="sm"
                  onClick={handleCurrentWeek}
                  disabled={isLoading}
                  aria-label="Filtrar por semana atual"
                  className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30 hover:border-white/40"
                >
                  Semana atual
                </Button>
                <Button
                  size="sm"
                  onClick={handleToday}
                  disabled={isLoading}
                  aria-label="Filtrar por hoje"
                  className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30 hover:border-white/40"
                >
                  Hoje
                </Button>
              </div>
            </div>
            
            {/* Error Message */}
            {errorMessage && (
              <Alert className="bg-red-500/20 border-red-400/30 text-white">
                <AlertDescription className="text-xs text-white">
                  {errorMessage}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})

export { DateFilterComponent }