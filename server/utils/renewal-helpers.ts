/**
 * Helper functions for contract renewal and regularization
 * These functions ensure that contracts maintain their original renewal day
 * instead of being shifted to the payment date during regularization
 */

/**
 * Calculates the next renewal date maintaining the original day of the month
 * This ensures that contracts always renew on their original day, not the payment day
 */
export function calculateNextRenewalDate(
  originalStartDate: Date, 
  currentDate: Date, 
  billingPeriod: 'monthly' | 'annual'
): Date {
  const originalDay = originalStartDate.getDate();
  const nextRenewal = new Date(currentDate);
  
  if (billingPeriod === 'monthly') {
    // Start with current month
    nextRenewal.setDate(1); // Set to first to avoid date overflow issues
    
    // Find the next month where the original day hasn't passed yet
    while (true) {
      const daysInMonth = new Date(nextRenewal.getFullYear(), nextRenewal.getMonth() + 1, 0).getDate();
      const targetDay = Math.min(originalDay, daysInMonth); // Handle months with fewer days
      
      nextRenewal.setDate(targetDay);
      
      // If this date is after the current date, we found our next renewal
      if (nextRenewal > currentDate) {
        return nextRenewal;
      }
      
      // Move to next month
      nextRenewal.setMonth(nextRenewal.getMonth() + 1);
      nextRenewal.setDate(1);
    }
  } else { // annual
    // Set to the anniversary date in the current year
    nextRenewal.setMonth(originalStartDate.getMonth());
    nextRenewal.setDate(originalStartDate.getDate());
    
    // If we've already passed this year's anniversary, move to next year
    if (nextRenewal <= currentDate) {
      nextRenewal.setFullYear(nextRenewal.getFullYear() + 1);
    }
    
    return nextRenewal;
  }
}

/**
 * Calculates how many billing periods are overdue
 * This is used to charge all overdue periods at once during regularization
 */
export function calculateOverduePeriods(
  lastPaidDate: Date | null,
  currentDate: Date,
  billingPeriod: 'monthly' | 'annual',
  originalStartDate: Date
): number {
  // If never paid, calculate from original start date
  const referenceDate = lastPaidDate || originalStartDate;
  
  // Calculate the actual days overdue
  const daysOverdue = Math.floor((currentDate.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (billingPeriod === 'monthly') {
    // For monthly billing, only count complete 30-day periods as overdue
    // This avoids charging multiple periods for partial month delays
    const completePeriodsOverdue = Math.floor(daysOverdue / 30);
    
    // Don't count the current period as overdue - it will be added separately
    // This ensures we only charge for truly overdue complete periods
    return Math.max(0, completePeriodsOverdue - 1);
  } else { // annual
    // For annual billing, only count complete 365-day periods as overdue
    const completePeriodsOverdue = Math.floor(daysOverdue / 365);
    
    // Don't count the current period as overdue - it will be added separately
    return Math.max(0, completePeriodsOverdue - 1);
  }
}

/**
 * Calculates the correct received date for contract regularization
 * This maintains the original billing day instead of using the payment date
 */
export function calculateRegularizationReceivedDate(
  originalStartDate: Date,
  currentDate: Date,
  billingPeriod: 'monthly' | 'annual'
): Date {
  const originalDay = originalStartDate.getDate();
  const receivedDate = new Date(currentDate);
  
  if (billingPeriod === 'monthly') {
    // Set to the billing day of the current month
    const daysInCurrentMonth = new Date(receivedDate.getFullYear(), receivedDate.getMonth() + 1, 0).getDate();
    const targetDay = Math.min(originalDay, daysInCurrentMonth);
    
    receivedDate.setDate(targetDay);
    
    // If we've already passed this month's billing day, this payment covers this month
    // Otherwise, it covers last month
    if (currentDate.getDate() < targetDay) {
      receivedDate.setMonth(receivedDate.getMonth() - 1);
    }
  } else { // annual
    // Set to this year's anniversary date
    receivedDate.setMonth(originalStartDate.getMonth());
    receivedDate.setDate(originalStartDate.getDate());
    
    // If we haven't reached this year's anniversary yet, use last year's
    if (currentDate < receivedDate) {
      receivedDate.setFullYear(receivedDate.getFullYear() - 1);
    }
  }
  
  return receivedDate;
}

/**
 * Calculates the total amount to charge for overdue periods
 * Used during regularization to charge all overdue payments at once
 */
export function calculateRegularizationAmount(
  baseAmount: number,
  overduePeriods: number,
  includeCurrentPeriod: boolean = true
): number {
  // overduePeriods now represents only complete overdue periods (not including current)
  // Add 1 for the current period if includeCurrentPeriod is true
  const totalPeriods = includeCurrentPeriod ? overduePeriods + 1 : overduePeriods;
  
  // Ensure we always charge at least 1 period
  return baseAmount * Math.max(1, totalPeriods);
}

/**
 * Adds months to a date while preserving the day of the month
 * If the target month has fewer days, it clamps to the last day of that month
 * Example: Jan 31 + 1 month = Feb 28 (or 29 in leap years)
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const originalDay = result.getDate();
  
  // Add months
  result.setMonth(result.getMonth() + months);
  
  // If day changed due to month overflow (e.g., Jan 31 -> Mar 3), fix it
  if (result.getDate() !== originalDay) {
    // Set to last day of previous month
    result.setDate(0);
  }
  
  return result;
}

/**
 * Adds years to a date while preserving the day and month
 * Handles leap year edge case (Feb 29 -> Feb 28 in non-leap years)
 */
export function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  const originalDay = result.getDate();
  
  // Add years
  result.setFullYear(result.getFullYear() + years);
  
  // If day changed (Feb 29 in leap year -> Feb 28), fix it
  if (result.getDate() !== originalDay) {
    // Set to last day of previous month
    result.setDate(0);
  }
  
  return result;
}