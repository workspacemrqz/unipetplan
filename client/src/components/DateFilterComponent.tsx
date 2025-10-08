import * as React from "react"
import { CalendarDate } from "@internationalized/date"
import { Calendar as CalendarIcon, X, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useDateFilter, type DateRange } from "@/hooks/use-date-filter"
import { formatDateRangeForDisplay, jsDateToCalendarDate } from "@/lib/date-utils"
import { cn } from "@/lib/utils"

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
    isValidRange,
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
    <Card className={cn("w-full", className)}>
      <CardContent className="p-3 sm:p-4">
        <div className="space-y-3 sm:space-y-4">
          {/* Header */}
          <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <h3 className="text-sm font-medium text-foreground">
                Filtrar por período
              </h3>
            </div>
            {isFiltering && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilter}
                className="h-8 px-2 text-xs w-full xs:w-auto"
                disabled={isLoading}
              >
                <X className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          {/* Date Range Picker with Quick Selection Buttons */}
          <div className="space-y-2">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
              <div className="flex-1">
                <DateRangePicker
                  value={dateRange}
                  onChange={handleDateRangeChange}
                  placeholder="Selecionar período personalizado"
                  disabled={isLoading}
                  isLoading={isLoading}
                  className="w-full"
                />
              </div>
              
              {/* Quick Selection Buttons - Mobile: above, Desktop: right side */}
              <div className="flex flex-wrap gap-2 md:flex-nowrap md:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCurrentMonth}
                  disabled={isLoading}
                  className="h-10 px-3 text-xs bg-input text-accent-foreground bg-input/80"
                  aria-label="Filtrar por mês atual"
                >
                  Mês atual
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCurrentWeek}
                  disabled={isLoading}
                  className="h-10 px-3 text-xs bg-input text-accent-foreground bg-input/80"
                  aria-label="Filtrar por semana atual"
                >
                  Semana atual
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToday}
                  disabled={isLoading}
                  className="h-10 px-3 text-xs bg-input text-accent-foreground bg-input/80"
                  aria-label="Filtrar por hoje"
                >
                  Hoje
                </Button>
              </div>
            </div>
            
            {/* Error Message */}
            {errorMessage && (
              <Alert variant="destructive">
                <AlertDescription className="text-xs">
                  {errorMessage}
                </AlertDescription>
              </Alert>
            )}
          </div>


        </div>
      </CardContent>
    </Card>
  )
})

export { DateFilterComponent }