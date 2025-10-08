import { useState, useCallback, useMemo, useEffect } from "react"
import { CalendarDate } from "@internationalized/date"
import { format } from "date-fns"

export interface DateRange {
  startDate: CalendarDate | null
  endDate: CalendarDate | null
}

export interface UseDateFilterReturn {
  dateRange: DateRange
  setDateRange: (range: DateRange) => void
  clearFilter: () => void
  isFiltering: boolean
  formatDateForAPI: (date: CalendarDate | null) => string | null
  isValidRange: boolean
  errorMessage: string | null
  debouncedDateRange: DateRange
}

export function useDateFilter(initialRange?: DateRange) {
  const [dateRange, setDateRangeState] = useState<DateRange>(
    initialRange || { startDate: null, endDate: null }
  )
  const [debouncedDateRange, setDebouncedDateRange] = useState<DateRange>(dateRange)

  // Debounce the date range changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDateRange(dateRange)
    }, 500) // 500ms debounce

    return () => clearTimeout(timer)
  }, [dateRange])

  const setDateRange = useCallback((range: DateRange) => {
    setDateRangeState(range)
  }, [])

  const clearFilter = useCallback(() => {
    setDateRangeState({ startDate: null, endDate: null })
  }, [])

  const isFiltering = useMemo(() => {
    return dateRange.startDate !== null || dateRange.endDate !== null
  }, [dateRange])

  const formatDateForAPI = useCallback((date: CalendarDate | null): string | null => {
    if (!date) return null
    
    // Convert CalendarDate to JavaScript Date and format as ISO string
    const jsDate = new Date(date.year, date.month - 1, date.day)
    return format(jsDate, "yyyy-MM-dd")
  }, [])

  const isValidRange = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) {
      return true // Single date or no dates are valid
    }
    
    // Check if start date is before or equal to end date
    const startJs = new Date(dateRange.startDate.year, dateRange.startDate.month - 1, dateRange.startDate.day)
    const endJs = new Date(dateRange.endDate.year, dateRange.endDate.month - 1, dateRange.endDate.day)
    
    return startJs <= endJs
  }, [dateRange])

  const errorMessage = useMemo(() => {
    if (!isValidRange) {
      return "A data inicial deve ser anterior ou igual à data final"
    }
    return null
  }, [isValidRange])

  return {
    dateRange,
    setDateRange,
    clearFilter,
    isFiltering,
    formatDateForAPI,
    isValidRange,
    errorMessage,
    debouncedDateRange
  }
}