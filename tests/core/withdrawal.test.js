import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calculateDirectAnnuityPayment,
  calculateWithdrawalPlan,
  simulateWithdrawal
} from '../../public/js/core/withdrawal.js';

describe('withdrawal phase calculations', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('calculateDirectAnnuityPayment handles near-zero and negative interest rates', () => {
    const nearZero = calculateDirectAnnuityPayment(200_000, 25, 0.00005);
    expect(nearZero).toBeCloseTo(8_000, 0);

    const negativeRate = calculateDirectAnnuityPayment(200_000, 25, -0.01);
    expect(negativeRate).toBeLessThan(nearZero);
    expect(negativeRate).toBeGreaterThan(7_000);
  });

  test('simulateWithdrawal applies proportional cost basis tax mechanics', () => {
    const initialCapital = 727_391;
    const duration = 25;
    const annualReturn = 0.05;
    const inflationRate = 0.02;
    const baseAnnualWithdrawal = 42_329;
    const costBasis = 500_000;

    const result = simulateWithdrawal(
      initialCapital,
      duration,
      annualReturn,
      inflationRate,
      true,
      baseAnnualWithdrawal,
      costBasis
    );

    expect(result.yearlyData).toHaveLength(duration);
    expect(Math.abs(result.finalCapital)).toBeLessThan(25);
    expect(result.totalTaxesPaid).toBeGreaterThan(0);

    const firstYear = result.yearlyData[0];
    const expectedCapitalAfterReturns = initialCapital * (1 + annualReturn);
    expect(firstYear.capitalAfterReturns).toBeCloseTo(expectedCapitalAfterReturns, 2);
    expect(firstYear.grossWithdrawal).toBeCloseTo(baseAnnualWithdrawal, 2);

    const costBasisOut = costBasis - firstYear.remainingCostBasis;
    const proportionalCostBasis = costBasis * (firstYear.grossWithdrawal / firstYear.capitalAfterReturns);
    expect(costBasisOut).toBeCloseTo(proportionalCostBasis, 2);

    const teilfreistellungRate = 0.7; // 30% tax-free
    const taxableGainBeforeAllowance = Math.max(0, firstYear.grossWithdrawal - costBasisOut) * teilfreistellungRate;
    const expectedTax = Math.max(0, taxableGainBeforeAllowance - 1_000) * 0.25;
    expect(firstYear.taxesPaid).toBeCloseTo(expectedTax, 2);
  });

  test('calculateWithdrawalPlan converges to zero balance without taxes', () => {
    const plan = calculateWithdrawalPlan(400_000, 20, 0.045, 0.02, false, 260_000);

    expect(plan.finalCapital).toBeCloseTo(0, 0);
    expect(plan.totalTaxesPaid).toBe(0);
    expect(plan.monthlyGrossWithdrawal).toBeCloseTo(plan.monthlyNetWithdrawal, 5);
  });

  test('calculateWithdrawalPlan with taxes yields lower net withdrawals', () => {
    const plan = calculateWithdrawalPlan(500_000, 25, 0.05, 0.02, true, 320_000);

    expect(plan.finalCapital).toBeCloseTo(0, 0);
    expect(plan.totalTaxesPaid).toBeGreaterThan(0);
    expect(plan.monthlyNetWithdrawal).toBeLessThan(plan.monthlyGrossWithdrawal);
  });
});
