import { describe, test, expect, beforeEach } from 'vitest';
import { calculateWealthDevelopment, runScenario } from '../../public/js/core/accumulation.js';
import { resetETFTaxAllowance } from '../../public/js/core/tax.js';

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
});
