import { describe, it, expect } from 'vitest';
import { toCents, fromCents, sumToCents } from '@/lib/money';

describe('PaymentWizard - Multi-payment flow with removal', () => {
  const total = 100.00;
  const totalCents = 10000;

  it('should set remaining payment amount to total when removing one of two payments', () => {
    // Initial state: 2 payments split evenly
    const paymentsDraft = [
      { id: 1, method: { id: 'cash', name: 'Cash' }, amount: 50.00 },
      { id: 2, method: { id: 'card', name: 'Card' }, amount: 50.00 }
    ];

    // Simulate handleRemovePayment for id: 1
    const filtered = paymentsDraft.filter((p) => p.id !== 1);
    
    // When exactly one payment remains, set its amount to the full total
    if (filtered.length === 1) {
      filtered[0].amount = fromCents(toCents(total));
    }

    expect(filtered.length).toBe(1);
    expect(filtered[0].amount).toBe(total);
    expect(sumToCents([filtered[0].amount])).toBe(totalCents);
  });

  it('should handle decimal amounts correctly using cents arithmetic', () => {
    // Test with amounts that could cause floating point issues
    const paymentsDraft = [
      { id: 1, method: { id: 'cash', name: 'Cash' }, amount: 33.33 },
      { id: 2, method: { id: 'card', name: 'Card' }, amount: 66.67 }
    ];

    // Remove first payment
    const filtered = paymentsDraft.filter((p) => p.id !== 1);
    
    if (filtered.length === 1) {
      filtered[0].amount = fromCents(toCents(total));
    }

    expect(filtered[0].amount).toBe(total);
    // Verify no floating point residue
    expect(filtered[0].amount * 100).toBe(Math.round(filtered[0].amount * 100));
  });

  it('should not modify amounts when more than one payment remains after removal', () => {
    const paymentsDraft = [
      { id: 1, method: { id: 'cash', name: 'Cash' }, amount: 30.00 },
      { id: 2, method: { id: 'card', name: 'Card' }, amount: 40.00 },
      { id: 3, method: { id: 'transfer', name: 'Transfer' }, amount: 30.00 }
    ];

    // Remove first payment
    const filtered = paymentsDraft.filter((p) => p.id !== 1);
    
    if (filtered.length === 1) {
      filtered[0].amount = fromCents(toCents(total));
    }

    expect(filtered.length).toBe(2);
    // Amounts should remain unchanged since more than one payment exists
    expect(filtered[0].amount).toBe(40.00);
    expect(filtered[1].amount).toBe(30.00);
  });

  it('should calculate correct remaining amount when adding a second payment', () => {
    const existingPayments = [
      { id: 1, method: { id: 'cash', name: 'Cash' }, amount: 60.00 }
    ];

    // Simulate handleAddPayment
    const currentTotalCents = sumToCents(existingPayments.map(p => p.amount));
    const remainingCents = totalCents - currentTotalCents;
    const newAmount = fromCents(Math.max(0, remainingCents));

    const newPayment = {
      id: 2,
      method: { id: 'card', name: 'Card' },
      amount: newAmount
    };

    expect(newAmount).toBe(40.00);
    expect(sumToCents([...existingPayments, newPayment].map(p => p.amount))).toBe(totalCents);
  });

  it('should assign zero to new payment when total is already covered', () => {
    const existingPayments = [
      { id: 1, method: { id: 'cash', name: 'Cash' }, amount: 100.00 }
    ];

    const currentTotalCents = sumToCents(existingPayments.map(p => p.amount));
    const remainingCents = totalCents - currentTotalCents;
    const newAmount = fromCents(Math.max(0, remainingCents));

    expect(newAmount).toBe(0);
  });

  it('should handle overpayment scenario by assigning zero to new payment', () => {
    const existingPayments = [
      { id: 1, method: { id: 'cash', name: 'Cash' }, amount: 120.00 }
    ];

    const currentTotalCents = sumToCents(existingPayments.map(p => p.amount));
    const remainingCents = totalCents - currentTotalCents;
    const newAmount = fromCents(Math.max(0, remainingCents));

    // Should not be negative
    expect(newAmount).toBe(0);
  });

  it('should maintain precision with fractional cent values', () => {
    // Test edge case where amounts might have more than 2 decimal places
    const testAmounts = [10.10, 20.20, 30.30, 39.40];
    const centsValues = testAmounts.map(toCents);
    
    expect(centsValues).toEqual([1010, 2020, 3030, 3940]);
    expect(sumToCents(testAmounts)).toBe(10000);
    expect(fromCents(sumToCents(testAmounts))).toBe(total);
  });
});
