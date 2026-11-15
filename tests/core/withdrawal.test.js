import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calculateDirectAnnuityPayment,
  buildWithdrawalLots,
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

  test('simulateWithdrawal with a single cost basis sells it pro rata', () => {
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

  test('simulateWithdrawal keeps an explicit cost basis of zero', () => {
    const allGains = simulateWithdrawal(100_000, 1, 0, 0, true, 100_000, 0);
    const unknownBasis = simulateWithdrawal(100_000, 1, 0, 0, true, 100_000);

    // Whole withdrawal is gain: (100.000 * 70% - 1.000) * 25%
    expect(allGains.yearlyData[0].taxesPaid).toBeCloseTo(17_250, 2);
    // Unknown basis falls back to 60% of capital: (40.000 * 70% - 1.000) * 25%
    expect(unknownBasis.yearlyData[0].taxesPaid).toBeCloseTo(6_750, 2);
  });

  test('sales take the oldest purchase lots first', () => {
    const lots = [
      { value: 50_000, cost: 10_000 },
      { value: 50_000, cost: 50_000 }
    ];
    const result = simulateWithdrawal(100_000, 1, 0, 0, true, 50_000, lots);

    // The 50.000 sale empties the old lot: gain 40.000, (40.000 * 70% - 1.000) * 25% = 6.750.
    // Average cost would have taxed only 50.000 - 30.000 = 20.000.
    expect(result.yearlyData[0].taxesPaid).toBeCloseTo(6_750, 6);
    expect(result.yearlyData[0].remainingCostBasis).toBeCloseTo(50_000, 6);
    // The caller's lots are not changed by the simulation
    expect(lots[0]).toEqual({ value: 50_000, cost: 10_000 });
  });

  test('realized losses are carried forward against later gains', () => {
    const lots = [
      { value: 50_000, cost: 80_000 },
      { value: 50_000, cost: 10_000 }
    ];
    const result = simulateWithdrawal(100_000, 2, 0, 0, true, 50_000, lots);

    // Year 1 sells the losing lot: loss 30.000, 70% of it (21.000) is carried forward
    expect(result.yearlyData[0].taxesPaid).toBe(0);
    expect(result.yearlyData[0].lossCarryforward).toBeCloseTo(21_000, 6);
    // Year 2: gain 40.000 * 70% = 28.000, minus the 21.000 loss and the 1.000 allowance
    expect(result.yearlyData[1].taxesPaid).toBeCloseTo((28_000 - 21_000 - 1_000) * 0.25, 6);
    expect(result.yearlyData[1].lossCarryforward).toBe(0);
  });

  test('purchase lots are scaled to the withdrawal capital', () => {
    const lots = buildWithdrawalLots(50_000, [
      { value: 60_000, cost: 30_000 },
      { value: 40_000, cost: 40_000 }
    ]);
    expect(lots).toEqual([
      { value: 30_000, cost: 15_000 },
      { value: 20_000, cost: 20_000 }
    ]);
    expect(buildWithdrawalLots(10_000, 4_000)).toEqual([{ value: 10_000, cost: 4_000 }]);
    expect(buildWithdrawalLots(10_000)).toEqual([{ value: 10_000, cost: 6_000 }]);
  });

  test('real purchasing power uses net withdrawals deflated to the payment date', () => {
    // No tax, 10% inflation: 50.000 at the end of year 1, 55.000 at the end of year 2
    const noTax = simulateWithdrawal(100_000, 2, 0, 0.1, false, 50_000, 100_000);
    expect(noTax.yearlyData[0].realValue).toBeCloseTo(50_000 / 1.1, 6);
    expect(noTax.yearlyData[1].realValue).toBeCloseTo(55_000 / 1.21, 6);
    expect(noTax.realPurchasingPower).toBeCloseTo((50_000 / 1.1 + 55_000 / 1.21) / 24, 6);

    // With tax the purchasing power is based on the net amount: 60.000 - (60.000 * 70% - 1.000) * 25%
    const taxed = simulateWithdrawal(100_000, 1, 0, 0, true, 60_000, 0);
    expect(taxed.realPurchasingPower).toBeCloseTo((60_000 - 10_250) / 12, 6);
  });
});
