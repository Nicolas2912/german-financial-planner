import { describe, test, expect, beforeEach } from 'vitest';
import {
  calculateGermanETFTax,
  calculateGermanNetSalary,
  calculateIncomeTax,
  calculateTaxes,
  resetETFTaxAllowance
} from '../../public/js/core/tax.js';

describe('tax calculations', () => {
  beforeEach(() => {
    resetETFTaxAllowance();
  });

  test('applies Teilfreistellung and Sparpauschbetrag for accumulating ETFs', () => {
    const yearOneTax = calculateGermanETFTax(100_000, 110_000, 0.07, 1, true, 'thesaurierend', 0.0253);
    expect(yearOneTax).toBeCloseTo(59.925, 3);

    const yearTwoTax = calculateGermanETFTax(110_000, 121_000, 0.07, 2, true, 'thesaurierend', 0.0253);
    expect(yearTwoTax).toBeCloseTo(340.9175, 3);
  });

  test('returns zero tax when distributing ETF posts no gains', () => {
    const tax = calculateGermanETFTax(50_000, 48_000, 0.02, 1, false, 'ausschüttend');
    expect(tax).toBe(0);
  });

  test('net salary reflects progressive taxation and social deductions', () => {
    const netWithoutChurch = calculateGermanNetSalary(65_000, 1, 0, 35, false, true, 1.6);
    const netWithChurch = calculateGermanNetSalary(65_000, 1, 0, 35, true, true, 1.6);

    expect(netWithoutChurch).toBeLessThan(65_000);
    expect(netWithChurch).toBeLessThan(netWithoutChurch);
    expect(netWithoutChurch).toBeGreaterThan(40_000);
  });

  test('income tax follows the 2025 tariff (§32a EStG)', () => {
    expect(calculateIncomeTax(12_096)).toBe(0);
    expect(calculateIncomeTax(17_443)).toBeCloseTo(1_015.13, 1);
    expect(calculateIncomeTax(68_480)).toBeCloseTo(17_849.77, 1);
    expect(calculateIncomeTax(277_825)).toBeCloseTo(105_774.58, 1);
  });

  test('income tax and net salary have no jumps at zone boundaries', () => {
    [12_096, 17_443, 68_480, 277_825].forEach(boundary => {
      expect(Math.abs(calculateIncomeTax(boundary + 1) - calculateIncomeTax(boundary))).toBeLessThan(1);
    });

    let previousNet = calculateGermanNetSalary(0);
    for (let gross = 100; gross <= 300_000; gross += 100) {
      const net = calculateGermanNetSalary(gross);
      expect(net - previousNet).toBeLessThan(100);
      previousNet = net;
    }
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
