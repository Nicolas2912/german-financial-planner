import { describe, test, expect } from 'vitest';
import {
  calculateBudget,
  calculateProfileTotalIncome,
  calculateProfileTotalExpenses,
  calculateSavings,
  calculateRemainingAfterSavings
} from '../../public/js/core/budget.js';

describe('budget calculations', () => {
  test('calculateBudget normalises mixed periods to monthly values', () => {
    const result = calculateBudget({
      income: {
        salary: '60.000',
        sideIncome: '12.000',
        otherIncome: '1.200'
      },
      expenses: {
        rent: '18.000',
        utilities: '2.400',
        insurance: '1.200',
        internet: '600',
        gez: '210',
        food: '600',
        transport: '150',
        leisure: '250',
        clothing: '80',
        subscriptions: '45',
        miscellaneous: '120'
      },
      periods: {
        income: 'yearly',
        fixed: 'yearly',
        variable: 'monthly'
      }
    });

    expect(result.totalIncome).toBeCloseTo(6_100, 4);
    expect(result.fixedTotal).toBeCloseTo((18_000 + 2_400 + 1_200 + 600 + 210) / 12, 4);
    expect(result.totalExpenses).toBeCloseTo(result.fixedTotal + result.variableTotal, 5);
    expect(result.totalExpenses).toBeCloseTo(3_112.5, 1);
    expect(result.remainingBudget).toBeCloseTo(result.totalIncome - result.totalExpenses, 5);
  });

  test('profile helpers aggregate yearly and monthly views consistently', () => {
    const profile = {
      income: { salary: '60.000', sideIncome: '12.000', otherIncome: '0' },
      expenses: {
        rent: '1.500',
        utilities: '200',
        insurance: '180',
        internet: '50',
        gez: '17,50',
        food: '600',
        transport: '150',
        leisure: '250',
        clothing: '80',
        subscriptions: '45',
        miscellaneous: '120'
      },
      periods: { income: 'yearly', fixed: 'monthly', variable: 'monthly' }
    };

    expect(calculateProfileTotalIncome(profile)).toBeCloseTo(6_000, 4);
    expect(calculateProfileTotalExpenses(profile)).toBeCloseTo(3_192.5, 4);
  });

  test('calculateSavings enforces caps and computes remainder correctly', () => {
    const savingsFixed = calculateSavings({
      mode: 'fixed',
      amount: 1_000,
      remainingBudget: 900
    });
    expect(savingsFixed.finalSavingsAmount).toBe(900);
    expect(savingsFixed.exceedsRemaining).toBe(false);

    const savingsPercent = calculateSavings({
      mode: 'percentage',
      percentage: 30,
      remainingBudget: 3_000
    });
    expect(savingsPercent.finalSavingsAmount).toBeCloseTo(900, 3);

    const remaining = calculateRemainingAfterSavings(5_000, 2_500, savingsPercent.finalSavingsAmount);
    expect(remaining).toBeCloseTo(1_600, 3);
  });
});
