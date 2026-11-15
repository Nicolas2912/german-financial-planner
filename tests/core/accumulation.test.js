import { describe, test, expect, beforeEach } from 'vitest';
import { calculateWealthDevelopment, runScenario } from '../../public/js/core/accumulation.js';
import { getBasiszins, resetETFTaxAllowance } from '../../public/js/core/tax.js';

describe('accumulation calculations', () => {
  beforeEach(() => {
    resetETFTaxAllowance();
  });

  test('calculateWealthDevelopment compounds monthly contributions correctly', () => {
    const params = {
      monthlySavings: 500,
      initialCapital: 10_000,
      annualReturn: 0.06,
      inflationRate: 0.02,
      salaryGrowth: 0,
      duration: 1,
      salaryToSavings: 0,
      includeTax: false
    };

    const expected = (() => {
      const monthlyReturn = Math.pow(1 + params.annualReturn, 1 / 12) - 1;
      let capital = params.initialCapital;
      let totalInvested = params.initialCapital;

      for (let i = 0; i < 12; i++) {
        capital += capital * monthlyReturn;
        capital += params.monthlySavings;
        totalInvested += params.monthlySavings;
      }

      return { capital, totalInvested };
    })();

    const result = calculateWealthDevelopment(
      params.monthlySavings,
      params.initialCapital,
      params.annualReturn,
      params.inflationRate,
      params.salaryGrowth,
      params.duration,
      params.salaryToSavings,
      params.includeTax
    );

    expect(result.finalNominal).toBeCloseTo(expected.capital, 2);
    expect(result.totalInvested).toBeCloseTo(expected.totalInvested, 8);
    expect(result.finalReal).toBeCloseTo(
      result.finalNominal / Math.pow(1 + params.inflationRate, params.duration),
      5
    );
    expect(result.yearlyData).toHaveLength(2);
  });

  test('including taxes reduces final capital compared to tax-free scenario', () => {
    const baseResult = calculateWealthDevelopment(600, 15_000, 0.07, 0.02, 0.01, 20, 0.5, false, 60_000, false);
    resetETFTaxAllowance();
    const taxedResult = calculateWealthDevelopment(600, 15_000, 0.07, 0.02, 0.01, 20, 0.5, true, 60_000, true, 'thesaurierend');

    expect(taxedResult.finalNominal).toBeLessThan(baseResult.finalNominal);
    expect(taxedResult.totalTaxesPaid).toBeGreaterThan(0);
  });

  test('runScenario processes multi-phase savings with tax integration', () => {
    document.body.innerHTML = `
      <div id="salaryIncreaseAnalysis_A">
        <span class="gross-increase"></span>
        <span class="net-increase"></span>
        <span class="tax-on-increase"></span>
        <span class="net-increase-rate"></span>
      </div>
      <input id="initialCapital_A" value="25.000">
      <input id="baseSalary_A" value="60.000">
      <input id="annualReturn_A" value="7">
      <input id="inflationRate_A" value="2">
      <input id="salaryGrowth_A" value="2">
      <input id="salaryToSavings_A" value="50">
      <input id="monthlySavings_A" value="600">
      <input id="duration_A" value="15">
      <div id="taxToggle_A" class="active"></div>
      <div id="teilfreistellungToggle_A" class="active"></div>
      <button class="savings-mode-btn active" data-scenario="A" data-mode="multi-phase"></button>
      <div class="savings-phase active" data-phase="1" data-scenario="A"></div>
      <input class="phase-start-year" data-phase="1" data-scenario="A" value="1">
      <input class="phase-end-year" data-phase="1" data-scenario="A" value="5">
      <input class="phase-savings-rate" data-phase="1" data-scenario="A" value="600">
      <input class="phase-return-rate" data-phase="1" data-scenario="A" value="6.5">
      <div class="savings-phase active" data-phase="2" data-scenario="A"></div>
      <input class="phase-start-year" data-phase="2" data-scenario="A" value="6">
      <input class="phase-end-year" data-phase="2" data-scenario="A" value="10">
      <input class="phase-savings-rate" data-phase="2" data-scenario="A" value="800">
      <input class="phase-return-rate" data-phase="2" data-scenario="A" value="7.2">
      <input type="radio" id="etfTypeA" name="etfType-A" value="thesaurierend" checked>
    `;

    const scenario = {
      id: 'A',
      name: 'Szenario A',
      color: '#3498db',
      inputs: {},
      yearlyData: [],
      results: {}
    };

    const updatedScenario = runScenario(scenario);

    expect(updatedScenario.inputs.savingsMode).toBe('multi-phase');
    expect(updatedScenario.yearlyData.length).toBeGreaterThan(5);
    expect(updatedScenario.results.finalNominal).toBeGreaterThan(25_000);
    expect(updatedScenario.results.totalTaxesPaid).toBeGreaterThanOrEqual(0);
    expect(document.querySelector('#salaryIncreaseAnalysis_A .net-increase').textContent).not.toBe('');
  });

  test('Vorabpauschale is added to the cost basis', () => {
    const options = { startYear: 2025 };
    const withoutTax = calculateWealthDevelopment(0, 100_000, 0.1, 0, 0, 1, 0, false, 60_000, true, 'thesaurierend', options);
    const withTax = calculateWealthDevelopment(0, 100_000, 0.1, 0, 0, 1, 0, true, 60_000, true, 'thesaurierend', options);

    expect(withoutTax.costBasis).toBeCloseTo(100_000, 6);
    // Basisertrag = 100.000 * 2,53% * 70% = 1.771 (below the 10% gain)
    // Tax = (1.771 * 70% - 1.000) * 25% = 59,925, paid out of the portfolio of 110.000
    expect(withTax.totalTaxesPaid).toBeCloseTo(59.925, 3);
    expect(withTax.costBasis).toBeCloseTo(101_771 * (1 - 59.925 / 110_000), 2);
  });

  test('Vorabpauschale counts money invested during the year pro rata', () => {
    // No start capital, 1.000 per month, 10% return, 2025 Basiszins 2,53%, no Teilfreistellung
    const result = calculateWealthDevelopment(1_000, 0, 0.1, 0, 0, 1, 0, true, 60_000, false, 'thesaurierend', { startYear: 2025 });

    // Each deposit buys units at the price after that month's return. The Vorabpauschale per unit
    // is 1 * 2,53% * 70% (below the 10% gain), cut by one twelfth per full month before the purchase.
    const monthlyFactor = Math.pow(1.1, 1 / 12);
    let vorabpauschale = 0;
    for (let month = 1; month <= 12; month++) {
      const units = 1_000 / Math.pow(monthlyFactor, month);
      vorabpauschale += units * 0.0253 * 0.7 * (13 - month) / 12;
    }
    expect(vorabpauschale).toBeGreaterThan(100);
    // It stays below the 1.000 allowance, so no tax is due, but it raises the cost basis
    expect(result.totalTaxesPaid).toBe(0);
    expect(result.costBasis).toBeCloseTo(12_000 + vorabpauschale, 6);
  });

  test('Basiszins follows the calendar year and the assumption after the published years', () => {
    expect(getBasiszins(2024)).toBe(0.0229);
    expect(getBasiszins(2025)).toBe(0.0253);
    expect(getBasiszins(2026)).toBe(0.032);
    expect(getBasiszins(2031, 0.04)).toBe(0.04);

    const run = (startYear, basiszinsAssumption) => {
      resetETFTaxAllowance();
      return calculateWealthDevelopment(0, 100_000, 0.1, 0, 0, 1, 0, true, 60_000, false, 'thesaurierend', { startYear, basiszinsAssumption });
    };
    // 2026: 100.000 * 3,20% * 70% = 2.240, tax (2.240 - 1.000) * 25% = 310
    expect(run(2026, 0.04).totalTaxesPaid).toBeCloseTo(310, 6);
    // 2031 has no published rate: 100.000 * 4% * 70% = 2.800, tax (2.800 - 1.000) * 25% = 450
    expect(run(2031, 0.04).totalTaxesPaid).toBeCloseTo(450, 6);

    // A two-year plan from 2025 uses 2,53% in year 1 and 3,20% in year 2
    resetETFTaxAllowance();
    const twoYears = calculateWealthDevelopment(0, 100_000, 0.1, 0, 0, 2, 0, true, 60_000, false, 'thesaurierend', { startYear: 2025 });
    const yearOneTax = (1_771 - 1_000) * 0.25;
    const unitsAfterYearOne = 100_000 * (1 - yearOneTax / 110_000);
    const yearTwoBasisertrag = unitsAfterYearOne * 1.1 * 0.032 * 0.7;
    expect(twoYears.yearlyData[1].taxesPaid).toBeCloseTo(yearOneTax, 6);
    expect(twoYears.yearlyData[2].taxesPaid).toBeCloseTo((yearTwoBasisertrag - 1_000) * 0.25, 6);
  });

  test('losses do not lower the cost basis', () => {
    const result = calculateWealthDevelopment(0, 100_000, -0.2, 0, 0, 1, 0, false, 60_000, false, 'thesaurierend');

    expect(result.finalNominal).toBeCloseTo(80_000, 6);
    expect(result.costBasis).toBeCloseTo(100_000, 6);
    expect(result.lots).toHaveLength(1);
    expect(result.lots[0].value).toBeCloseTo(80_000, 6);
    expect(result.lots[0].cost).toBeCloseTo(100_000, 6);
  });

  test('purchase lots are returned oldest first with their own cost', () => {
    const result = calculateWealthDevelopment(100, 1_000, 0.12, 0, 0, 1, 0, false, 60_000, false, 'thesaurierend');

    expect(result.lots).toHaveLength(13);
    expect(result.lots[0].cost).toBeCloseTo(1_000, 6);
    // The start capital has grown for a full year, the December deposit not at all
    expect(result.lots[0].value).toBeCloseTo(1_120, 6);
    expect(result.lots[12].value).toBeCloseTo(100, 6);
    const totalValue = result.lots.reduce((sum, lot) => sum + lot.value, 0);
    expect(totalValue).toBeCloseTo(result.finalNominal, 6);
  });
});
