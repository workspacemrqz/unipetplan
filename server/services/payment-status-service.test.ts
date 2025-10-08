import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { PaymentStatusService } from './payment-status-service.js';
import { type Contract } from '../../shared/schema.js';

/**
 * Comprehensive unit tests for PaymentStatusService
 * Tests the fixed due date calculation logic to ensure contracts are properly marked as overdue
 */

// Helper function to create a test contract
function createTestContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: 'test-contract',
    startDate: '2024-01-05', // Default: 5th of each month
    billingPeriod: 'monthly',
    status: 'active',
    returnCode: null,
    receivedDate: null,
    ...overrides
  } as Contract;
}

describe('PaymentStatusService', () => {
  
  beforeEach(() => {
    // Reset any existing fake timers
    vi.useRealTimers();
  });
  
  afterEach(() => {
    // Clean up fake timers after each test
    vi.useRealTimers();
  });
  
  describe('Critical Overdue Calculation Fix', () => {
    
    test('FIXED: Contract due 5th, today 19th - should show 14 days overdue, inactive status', () => {
      // Mock system time to September 19th, 2025
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-09-19'));
      
      const contract = createTestContract({
        startDate: '2024-01-05', // Contract due on 5th of each month
        billingPeriod: 'monthly',
        status: 'active',
        returnCode: null // No payment
      });
      
      const result = PaymentStatusService.evaluateContractPaymentStatus(contract);
      
      // Should be 14 days overdue (Sept 19 - Sept 5 = 14 days)
      expect(result.isOverdue).toBe(true);
      expect(result.daysPastDue).toBe(14);
      expect(result.calculatedStatus).toBe('inactive'); // 14 days = within 0-15 range
      expect(result.nextDueDate?.getMonth()).toBe(9); // October (0-based)
      expect(result.nextDueDate?.getDate()).toBe(5);
      
      vi.useRealTimers();
    });

    test('Contract due 15th, today 10th - should show NOT overdue, active status', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-10')); // Before 15th
      
      const contract = createTestContract({
        startDate: '2024-03-15',
        billingPeriod: 'monthly'
      });
      
      const result = PaymentStatusService.evaluateContractPaymentStatus(contract);
      
      // Should NOT be overdue since we're before the due date
      expect(result.isOverdue).toBe(false);
      expect(result.daysPastDue).toBe(0);
      expect(result.calculatedStatus).toBe('active');
      expect(result.nextDueDate?.getMonth()).toBe(5); // June (0-based)
      expect(result.nextDueDate?.getDate()).toBe(15);
      
      vi.useRealTimers();
    });

    test('Contract due 15th, today 20th - should show 5 days overdue, inactive status', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-20')); // After 15th
      
      const contract = createTestContract({
        startDate: '2024-03-15',
        billingPeriod: 'monthly'
      });
      
      const result = PaymentStatusService.evaluateContractPaymentStatus(contract);
      
      // Should be 5 days overdue (June 20 - June 15 = 5 days)
      expect(result.isOverdue).toBe(true);
      expect(result.daysPastDue).toBe(5);
      expect(result.calculatedStatus).toBe('inactive'); // 5 days = within 0-15 range
      expect(result.nextDueDate?.getMonth()).toBe(6); // July (0-based)
      expect(result.nextDueDate?.getDate()).toBe(15);
      
      vi.useRealTimers();
    });

    test('Contract due 31st, today Feb 15th - should handle month clamping correctly', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-02-15'));
      
      const contract = createTestContract({
        startDate: '2024-01-31', // 31st day
        billingPeriod: 'monthly'
      });
      
      const result = PaymentStatusService.evaluateContractPaymentStatus(contract);
      
      // Should NOT be overdue since Feb 15 is before Feb 29 (clamped from 31st)
      expect(result.isOverdue).toBe(false);
      expect(result.daysPastDue).toBe(0);
      expect(result.calculatedStatus).toBe('active');
      // February clamps to 29th in leap year 2024
      expect(result.nextDueDate?.getMonth()).toBe(1); // February (0-based)
      expect(result.nextDueDate?.getDate()).toBe(29); // 2024 is leap year
      
      vi.useRealTimers();
    });

    test('Contract 16 days overdue - should show suspended status', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-21')); // 16 days after June 5th
      
      const contract = createTestContract({
        startDate: '2024-01-05',
        billingPeriod: 'monthly'
      });
      
      const result = PaymentStatusService.evaluateContractPaymentStatus(contract);
      
      // Should be 16 days overdue → suspended status
      expect(result.isOverdue).toBe(true);
      expect(result.daysPastDue).toBe(16);
      expect(result.calculatedStatus).toBe('suspended'); // 16 days = within 16-59 range
      expect(result.shouldSuspend).toBe(true);
      
      vi.useRealTimers();
    });
    
    test('Contract 60 days overdue - should show cancelled status', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-08-04')); // 60 days after June 5th
      
      const contract = createTestContract({
        startDate: '2024-01-05',
        billingPeriod: 'monthly'
      });
      
      const result = PaymentStatusService.evaluateContractPaymentStatus(contract);
      
      // Should be 60 days overdue → cancelled status
      expect(result.isOverdue).toBe(true);
      expect(result.daysPastDue).toBe(60);
      expect(result.calculatedStatus).toBe('cancelled'); // 60+ days
      expect(result.shouldCancel).toBe(true);
      
      vi.useRealTimers();
    });
    
    test('Contract with successful payment - should show active status', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-20')); // After due date
      
      const contract = createTestContract({
        startDate: '2024-01-05',
        billingPeriod: 'monthly',
        returnCode: '4', // Successful payment
        receivedDate: '2024-06-10' // Payment received within current billing period
      });
      
      const result = PaymentStatusService.evaluateContractPaymentStatus(contract);
      
      // Should be active despite being past due date because payment was successful
      expect(result.isOverdue).toBe(false);
      expect(result.daysPastDue).toBe(0);
      expect(result.calculatedStatus).toBe('active');
      expect(result.statusReason).toBe('Payment successful and current');
      
      vi.useRealTimers();
    });

  });

  describe('calculateNextDueDate - Annual Billing', () => {
    
    test('should calculate correct anniversary date', () => {
      const contract: Contract = {
        id: 'test-6',
        startDate: '2023-05-20',
        billingPeriod: 'annual',
        status: 'active'
      } as Contract;
      
      const currentDate = new Date('2024-03-15'); // Before anniversary
      const result = PaymentStatusService.evaluateContractPaymentStatus(contract);
      
      // Should show May 20th, 2024 as next due date
      expect(result.nextDueDate).toBeDefined();
      if (result.nextDueDate) {
        expect(result.nextDueDate.getFullYear()).toBe(2024);
        expect(result.nextDueDate.getMonth()).toBe(4); // May (0-based)
        expect(result.nextDueDate.getDate()).toBe(20);
      }
    });

    test('should advance to next year when past anniversary', () => {
      const contract: Contract = {
        id: 'test-7',
        startDate: '2023-05-20',
        billingPeriod: 'annual',
        status: 'active'
      } as Contract;
      
      const currentDate = new Date('2024-08-15'); // After anniversary
      const result = PaymentStatusService.evaluateContractPaymentStatus(contract);
      
      // Should show May 20th, 2025 as next due date
      expect(result.nextDueDate).toBeDefined();
      if (result.nextDueDate) {
        expect(result.nextDueDate.getFullYear()).toBe(2025);
        expect(result.nextDueDate.getMonth()).toBe(4); // May (0-based)
        expect(result.nextDueDate.getDate()).toBe(20);
      }
    });

    test('should handle leap year February 29th start date', () => {
      const contract: Contract = {
        id: 'test-8',
        startDate: '2024-02-29', // Leap year
        billingPeriod: 'annual',
        status: 'active'
      } as Contract;
      
      const currentDate = new Date('2025-01-15'); // Non-leap year
      const result = PaymentStatusService.evaluateContractPaymentStatus(contract);
      
      // Should clamp to February 28th in non-leap year
      expect(result.nextDueDate).toBeDefined();
      if (result.nextDueDate) {
        expect(result.nextDueDate.getFullYear()).toBe(2025);
        expect(result.nextDueDate.getMonth()).toBe(1); // February
        expect(result.nextDueDate.getDate()).toBe(28); // Clamped from 29th
      }
    });

  });

  describe('Grace Period and Status Calculations', () => {
    
    test('should show active status within grace period', () => {
      const contract: Contract = {
        id: 'test-9',
        startDate: '2024-08-01',
        billingPeriod: 'monthly',
        status: 'active',
        returnCode: null // No payment yet
      } as Contract;
      
      // Current date is 10 days after due date (within 15-day grace period)
      const currentDate = new Date('2024-09-11');
      
      // Mock the service to use our current date
      const originalDate = Date;
      global.Date = vi.fn(() => currentDate) as any;
      global.Date.prototype = originalDate.prototype;
      
      const result = PaymentStatusService.evaluateContractPaymentStatus(contract);
      
      expect(result.calculatedStatus).toBe('active');
      expect(result.isOverdue).toBe(true);
      expect(result.daysPastDue).toBe(10);
      expect(result.gracePeriodEnds).toBeDefined();
      
      // Restore original Date
      global.Date = originalDate;
    });

    test('should show inactive status after grace period but before suspension', () => {
      const contract: Contract = {
        id: 'test-10',
        startDate: '2024-07-01',
        billingPeriod: 'monthly',
        status: 'active',
        returnCode: null
      } as Contract;
      
      // Current date is 25 days after due date (past 15-day grace, before 30-day suspension)
      const currentDate = new Date('2024-08-26');
      
      const originalDate = Date;
      global.Date = vi.fn(() => currentDate) as any;
      global.Date.prototype = originalDate.prototype;
      
      const result = PaymentStatusService.evaluateContractPaymentStatus(contract);
      
      expect(result.calculatedStatus).toBe('inactive');
      expect(result.isOverdue).toBe(true);
      expect(result.daysPastDue).toBe(25);
      expect(result.shouldSuspend).toBe(false);
      
      global.Date = originalDate;
    });

    test('should recommend suspension after 30 days', () => {
      const contract: Contract = {
        id: 'test-11',
        startDate: '2024-07-01',
        billingPeriod: 'monthly',
        status: 'active',
        returnCode: null
      } as Contract;
      
      // Current date is 35 days after due date
      const currentDate = new Date('2024-09-06');
      
      const originalDate = Date;
      global.Date = vi.fn(() => currentDate) as any;
      global.Date.prototype = originalDate.prototype;
      
      const result = PaymentStatusService.evaluateContractPaymentStatus(contract);
      
      expect(result.calculatedStatus).toBe('suspended');
      expect(result.shouldSuspend).toBe(true);
      expect(result.daysPastDue).toBe(35);
      
      global.Date = originalDate;
    });

    test('should recommend cancellation after 60 days', () => {
      const contract: Contract = {
        id: 'test-12',
        startDate: '2024-06-01',
        billingPeriod: 'monthly',
        status: 'active',
        returnCode: null
      } as Contract;
      
      // Current date is 65 days after due date
      const currentDate = new Date('2024-09-06');
      
      const originalDate = Date;
      global.Date = vi.fn(() => currentDate) as any;
      global.Date.prototype = originalDate.prototype;
      
      const result = PaymentStatusService.evaluateContractPaymentStatus(contract);
      
      expect(result.calculatedStatus).toBe('cancelled');
      expect(result.shouldCancel).toBe(true);
      expect(result.daysPastDue).toBe(65);
      
      global.Date = originalDate;
    });

  });

  describe('Edge Cases', () => {
    
    test('should handle undefined start date', () => {
      const contract: Contract = {
        id: 'test-13',
        startDate: null,
        billingPeriod: 'monthly',
        status: 'active'
      } as Contract;
      
      const result = PaymentStatusService.evaluateContractPaymentStatus(contract);
      
      expect(result.nextDueDate).toBeNull();
    });

    test('should handle invalid start date', () => {
      const contract: Contract = {
        id: 'test-14',
        startDate: 'invalid-date',
        billingPeriod: 'monthly',
        status: 'active'
      } as Contract;
      
      const result = PaymentStatusService.evaluateContractPaymentStatus(contract);
      
      expect(result.nextDueDate).toBeNull();
    });

    test('should respect manually cancelled status', () => {
      const contract: Contract = {
        id: 'test-15',
        startDate: '2024-01-01',
        billingPeriod: 'monthly',
        status: 'cancelled'
      } as Contract;
      
      const result = PaymentStatusService.evaluateContractPaymentStatus(contract);
      
      expect(result.calculatedStatus).toBe('cancelled');
      expect(result.nextDueDate).toBeNull();
      expect(result.statusReason).toBe('Contract manually cancelled');
    });

    test('should respect manually suspended status', () => {
      const contract: Contract = {
        id: 'test-16',
        startDate: '2024-01-01',
        billingPeriod: 'monthly',
        status: 'suspended'
      } as Contract;
      
      const result = PaymentStatusService.evaluateContractPaymentStatus(contract);
      
      expect(result.calculatedStatus).toBe('suspended');
      expect(result.nextDueDate).toBeNull();
      expect(result.statusReason).toBe('Contract manually suspended');
    });

  });

  describe('Payment Success Detection', () => {
    
    test('should recognize successful payment with return code 4', () => {
      const contract: Contract = {
        id: 'test-17',
        startDate: '2024-08-01',
        billingPeriod: 'monthly',
        status: 'active',
        returnCode: '4', // Authorized
        receivedDate: '2024-09-01' // Recent payment
      } as Contract;
      
      const currentDate = new Date('2024-09-15');
      
      const originalDate = Date;
      global.Date = vi.fn(() => currentDate) as any;
      global.Date.prototype = originalDate.prototype;
      
      const result = PaymentStatusService.evaluateContractPaymentStatus(contract);
      
      expect(result.calculatedStatus).toBe('active');
      expect(result.isOverdue).toBe(false);
      expect(result.statusReason).toBe('Payment successful and current');
      
      global.Date = originalDate;
    });

    test('should recognize successful payment with return code 6', () => {
      const contract: Contract = {
        id: 'test-18',
        startDate: '2024-08-01',
        billingPeriod: 'monthly',
        status: 'active',
        returnCode: '6', // Paid
        receivedDate: '2024-09-01'
      } as Contract;
      
      const currentDate = new Date('2024-09-15');
      
      const originalDate = Date;
      global.Date = vi.fn(() => currentDate) as any;
      global.Date.prototype = originalDate.prototype;
      
      const result = PaymentStatusService.evaluateContractPaymentStatus(contract);
      
      expect(result.calculatedStatus).toBe('active');
      expect(result.statusReason).toBe('Payment successful and current');
      
      global.Date = originalDate;
    });

  });

});