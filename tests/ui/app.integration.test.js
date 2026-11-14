import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test, expect, beforeAll, vi } from 'vitest';
import { parseGermanNumber } from '../../public/js/utils.js';
import * as state from '../../public/js/state.js';

const html = readFileSync(resolve(__dirname, '../../public/etf_savings.html'), 'utf8');

const scenarioIds = () => state.scenarios.map(s => s.id);
const isActive = (id) => document.getElementById(id).classList.contains('active');

describe('ETF savings page (jsdom)', () => {
  beforeAll(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    window.scrollTo = () => {};
    if (!globalThis.localStorage) {
      const items = new Map();
      globalThis.localStorage = {
        get length() { return items.size; },
        key: (index) => [...items.keys()][index] ?? null,
        getItem: (key) => (items.has(key) ? items.get(key) : null),
        setItem: (key, value) => items.set(key, String(value)),
        removeItem: (key) => items.delete(key),
        clear: () => items.clear()
      };
    }
    // jsdom has no canvas: hand charts a context whose methods all do nothing
    const context = new Proxy({}, { get: (target, prop) => (prop in target ? target[prop] : () => context) });
    HTMLCanvasElement.prototype.getContext = () => context;
    document.documentElement.innerHTML = html.replace(/<script[\s\S]*?<\/script>/gi, '');
    await import('../../public/js/app.js');
    globalThis.__triggerDOMContentLoaded();
  });

  test('leaving a number field keeps thousands separators', () => {
    const input = document.getElementById('initialCapital_A');
    input.value = '3.000';
    input.dispatchEvent(new Event('blur'));
    expect(input.value).toBe('3.000');
    expect(parseGermanNumber(input.value)).toBe(3000);
  });

  test('auto-sync copies the end capital and cost basis into the withdrawal phase', () => {
    window.recalculateAll();
    const scenarioA = state.findScenario('A');
    const retirementCapital = parseGermanNumber(document.getElementById('retirementCapital').value);
    expect(retirementCapital).toBeCloseTo(scenarioA.results.endCapital, -1);

    // Recover the cost basis used by the withdrawal from the first year's proportional sale
    const firstYear = state.withdrawalData.yearlyData[0];
    const saleRatio = firstYear.grossWithdrawal / firstYear.capitalAfterReturns;
    const usedCostBasis = firstYear.remainingCostBasis / (1 - saleRatio);
    expect(usedCostBasis).toBeCloseTo(Math.min(scenarioA.results.costBasis, retirementCapital), 0);
  });

  test('budget savings use the current remaining budget', () => {
    document.getElementById('salary').value = '100';
    window.calculateBudget();
    const remaining = state.budgetData.remainingBudget;
    const finalSavings = parseGermanNumber(document.getElementById('finalSavingsAmount').textContent.replace(/[^\d.,-]/g, ''));
    expect(finalSavings).toBe(Math.max(0, Math.min(500, remaining)));
  });

  test('loading a budget profile can switch the savings mode', () => {
    expect(typeof window.setSavingsMode).toBe('function');
    window.setSavingsMode('percentage');
    expect(isActive('percentage')).toBe(true);
    window.setSavingsMode('fixed');
    expect(isActive('fixedAmount')).toBe(true);
  });

  test('switching off public health insurance changes the tax calculator', () => {
    const toggle = document.getElementById('publicHealthInsuranceToggle');
    window.calculateTaxes();
    const publicHealth = document.getElementById('healthInsurance').textContent;

    toggle.classList.remove('active');
    window.calculateTaxes();
    expect(document.getElementById('healthInsurance').textContent).not.toBe(publicHealth);

    toggle.classList.add('active');
    window.calculateTaxes();
  });

  test('scenario A ETF type radios trigger a recalculation', async () => {
    const before = state.findScenario('A').results.totalTaxesPaid;
    const distributing = document.querySelector('input[name="etfType-A"][value="distributing"]');
    distributing.checked = true;
    distributing.dispatchEvent(new Event('change'));
    await new Promise(resolve => setTimeout(resolve, 200));
    expect(state.findScenario('A').results.totalTaxesPaid).not.toBe(before);

    const accumulating = document.querySelector('input[name="etfType-A"][value="accumulating"]');
    accumulating.checked = true;
    accumulating.dispatchEvent(new Event('change'));
    await new Promise(resolve => setTimeout(resolve, 200));
  });

  test('phase durations match the simulated years', () => {
    const duration = document.querySelector('.savings-phase[data-phase="1"][data-scenario="A"] .phase-duration');
    expect(duration.textContent).toBe('Dauer: 10 Jahre');
  });

  test('new scenario IDs stay unique after deleting a middle scenario', () => {
    window.addNewScenario();
    window.addNewScenario();
    expect(scenarioIds()).toEqual(['A', 'B', 'C']);

    window.removeScenario('B');
    window.addNewScenario();
    expect([...scenarioIds()].sort()).toEqual(['A', 'B', 'C']);
    expect(document.querySelectorAll('.scenario-panel[data-scenario="C"]')).toHaveLength(1);

    window.removeScenario('B');
    window.removeScenario('C');
    expect(scenarioIds()).toEqual(['A']);
  });

  test('copying a scenario keeps disabled toggles and the multi-phase plan', () => {
    document.getElementById('taxToggle_A').classList.remove('active');
    document.getElementById('teilfreistellungToggle_A').classList.remove('active');
    document.querySelector('.savings-mode-btn[data-mode="multi-phase"][data-scenario="A"]').click();
    document.querySelector('.phase-savings-rate[data-phase="1"][data-scenario="A"]').value = '1.000';

    window.copyScenario('A');
    const copyId = scenarioIds()[scenarioIds().length - 1];

    expect(isActive(`taxToggle_${copyId}`)).toBe(false);
    expect(isActive(`teilfreistellungToggle_${copyId}`)).toBe(false);
    expect(document.querySelector(`.savings-mode-btn.active[data-scenario="${copyId}"]`).dataset.mode).toBe('multi-phase');
    expect(document.querySelector(`.multi-phase-savings-container[data-scenario="${copyId}"]`).style.display).toBe('block');
    expect(document.querySelector(`.phase-savings-rate[data-phase="1"][data-scenario="${copyId}"]`).value).toBe('1.000');
    expect(state.findScenario(copyId).results.endCapital).toBeCloseTo(state.findScenario('A').results.endCapital, 2);

    window.removeScenario(copyId);
  });

  test('loading a saved multi-phase scenario restores mode and phases', async () => {
    const { loadAnsparphaseScenarioFromManager } = await import('../../public/js/features/ansparphaseScenarioManager.js');
    localStorage.setItem('ansparphaseScenario_Phasen', JSON.stringify({
      name: 'Phasen',
      type: 'single',
      scenario: {
        name: 'Phasen',
        parameters: {
          monthlySavings: 500, initialCapital: 0, annualReturn: 0, inflationRate: 0, salaryGrowth: 0,
          duration: 10, baseSalary: 60000, salaryToSavings: 0, includeTax: false, teilfreistellung: false,
          etfType: 'accumulating', savingsMode: 'multi-phase',
          multiPhaseData: [{ startYear: 1, endYear: 10, monthlySavingsRate: 1000, annualReturn: 0 }]
        }
      }
    }));

    loadAnsparphaseScenarioFromManager('Phasen');
    const loaded = state.scenarios[state.scenarios.length - 1];

    expect(document.querySelector(`.multi-phase-savings-container[data-scenario="${loaded.id}"]`).style.display).toBe('block');
    expect(loaded.results.endCapital).toBeCloseTo(120_000, 0);
    window.removeScenario(loaded.id);
  });

  test('comparison calculates saved multi-phase plans', () => {
    const series = window.scenarioComparison.calculateAccumulationSeries({
      years: 10,
      monthlySavings: 500,
      returnRate: 0,
      savingsMode: 'multi-phase',
      phases: [{ startYear: 1, endYear: 10, monthlySavingsRate: 1000, annualReturn: 0 }]
    });
    expect(series.finalNominal).toBeCloseTo(120_000, 0);
  });
});
