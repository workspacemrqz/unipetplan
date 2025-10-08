import { CalendarDate } from "@internationalized/date"
import { format, isValid, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

/**
 * Convert CalendarDate to JavaScript Date
 */
export function calendarDateToJSDate(date: CalendarDate): Date {
  return new Date(date.year, date.month - 1, date.day)
}

/**
 * Convert JavaScript Date to CalendarDate
 */
export function jsDateToCalendarDate(date: Date): CalendarDate {
  return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

/**
 * Format CalendarDate for API (ISO format: YYYY-MM-DD)
 */
export function formatDateForAPI(date: CalendarDate | null): string | null {
  if (!date) return null
  
  const jsDate = calendarDateToJSDate(date)
  return format(jsDate, "yyyy-MM-dd")
}

/**
 * Format CalendarDate for display (Brazilian format: DD/MM/YYYY)
 */
export function formatDateForDisplay(date: CalendarDate | null): string {
  if (!date) return ""
  
  const jsDate = calendarDateToJSDate(date)
  return format(jsDate, "dd/MM/yyyy", { locale: ptBR })
}

/**
 * Format date range for display
 */
export function formatDateRangeForDisplay(
  startDate: CalendarDate | null, 
  endDate: CalendarDate | null,
  placeholder = "Selecionar período"
): string {
  if (!startDate && !endDate) {
    return placeholder
  }
  
  if (startDate && endDate) {
    return `${formatDateForDisplay(startDate)} - ${formatDateForDisplay(endDate)}`
  } else if (startDate) {
    return `A partir de ${formatDateForDisplay(startDate)}`
  } else if (endDate) {
    return `Até ${formatDateForDisplay(endDate)}`
  }
  
  return placeholder
}

/**
 * Validate date range
 */
export function validateDateRange(
  startDate: CalendarDate | null, 
  endDate: CalendarDate | null
): { isValid: boolean; errorMessage: string | null } {
  if (!startDate || !endDate) {
    return { isValid: true, errorMessage: null }
  }
  
  const startJs = calendarDateToJSDate(startDate)
  const endJs = calendarDateToJSDate(endDate)
  
  if (startJs > endJs) {
    return { 
      isValid: false, 
      errorMessage: "A data inicial deve ser anterior ou igual à data final" 
    }
  }
  
  return { isValid: true, errorMessage: null }
}

/**
 * Parse ISO date string to CalendarDate
 */
export function parseISOToCalendarDate(isoString: string): CalendarDate | null {
  try {
    const date = parseISO(isoString)
    if (!isValid(date)) return null
    
    return jsDateToCalendarDate(date)
  } catch {
    return null
  }
}

/**
 * Get date range query parameters for API calls
 */
export function getDateRangeParams(
  startDate: CalendarDate | null, 
  endDate: CalendarDate | null
): { startDate?: string; endDate?: string } {
  const params: { startDate?: string; endDate?: string } = {}
  
  if (startDate) {
    params.startDate = formatDateForAPI(startDate)!
  }
  
  if (endDate) {
    params.endDate = formatDateForAPI(endDate)!
  }
  
  return params
}