import { describe, test, expect, beforeEach } from 'vitest';
import {
  calculateGermanETFTax,
  calculateGermanNetSalary,
  calculateTaxes,
  resetETFTaxAllowance
} from '../../public/js/core/tax.js';

describe('tax calculations', () => {
  beforeEach(() => {
    resetETFTaxAllowance();
  });

  test('applies Teilfreistellung and Sparpauschbetrag for accumulating ETFs', () => {
    const yearOneTax = calculateGermanETFTax(100_000, 110_000, 0.07, 1, true, 'thesaurierend');
    expect(yearOneTax).toBeCloseTo(59.925, 3);

    const yearTwoTax = calculateGermanETFTax(110_000, 121_000, 0.07, 2, true, 'thesaurierend');
    expect(yearTwoTax).toBeCloseTo(340.9175, 3);
  });

  test('returns zero tax when distributing ETF posts no gains', () => {
    const tax = calculateGermanETFTax(50_000, 48_000, 0.02, 1, false, 'ausschüttend');
    expect(tax).toBe(0);
  });

  test('net salary reflects progressive taxation and social deductions', () => {
    const netWithoutChurch = calculateGermanNetSalary(65_000, 1, 'bw', 35, 0, false, true, 1.6);
    const netWithChurch = calculateGermanNetSalary(65_000, 1, 'bw', 35, 0, true, true, 1.6);

    expect(netWithoutChurch).toBeLessThan(65_000);
    expect(netWithChurch).toBeLessThan(netWithoutChurch);
    expect(netWithoutChurch).toBeGreaterThan(40_000);
  });

  test('detailed tax calculation matches core expectations', () => {
    const detailed = calculateTaxes(80_000, 1, 'by', 40, 2, true, true, 1.6);
    expect(detailed.netYearlySalary).toBeLessThan(80_000);
    expect(detailed.breakdown.incomeTax).toBeGreaterThan(0);
    expect(detailed.totalSocialInsurance).toBeGreaterThan(detailed.breakdown.healthInsurance);

    const withoutChurch = calculateTaxes(80_000, 1, 'by', 40, 2, false, true, 1.6);
    expect(detailed.totalTaxes).toBeGreaterThan(withoutChurch.totalTaxes);
  });
});
