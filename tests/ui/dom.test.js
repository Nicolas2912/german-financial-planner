import { describe, test, expect } from 'vitest';
import { updateScenarioResults, refreshScenarioResultNames, updateWithdrawalTable } from '../../public/js/ui/dom.js';
import * as state from '../../public/js/state.js';

describe('UI DOM helpers', () => {
  test('updateScenarioResults renders scenario metrics grid', () => {
    document.body.innerHTML = `<section id="scenarioResults"></section>`;

    state.setScenarios([
      {
        id: 'A',
        name: 'Szenario A',
        color: '#3498db',
        results: {
          finalNominal: 250_000,
          finalReal: 180_000,
          totalInvested: 120_000,
          totalReturn: 130_000,
          totalTaxesPaid: 8_500
        }
      },
      {
        id: 'B',
        name: 'Szenario B',
        color: '#27ae60',
        results: {
          finalNominal: 310_000,
          finalReal: 220_000,
          totalInvested: 150_000,
          totalReturn: 160_000,
          totalTaxesPaid: 12_400
        }
      }
    ]);

    updateScenarioResults();

    const cards = document.querySelectorAll('.scenario-result-card');
    expect(cards).toHaveLength(2);
    expect(cards[0].querySelector('.scenario-result-title').textContent).toContain('Szenario A');
    expect(cards[0].textContent).toContain('250.000 €');
    expect(cards[0].textContent).toContain('8.500 €');
  });

  test('refreshScenarioResultNames updates card headers without re-rendering', () => {
    document.body.innerHTML = `<section id="scenarioResults"></section>`;

    state.setScenarios([
      {
        id: 'A',
        name: 'Szenario A',
        color: '#3498db',
        results: {
          finalNominal: 250_000,
          finalReal: 180_000,
          totalInvested: 120_000,
          totalReturn: 130_000,
          totalTaxesPaid: 8_500
        }
      }
    ]);

    updateScenarioResults();

    const header = document.querySelector('.scenario-result-title');
    expect(header.textContent).toContain('Szenario A');

    state.setScenarios([
      {
        id: 'A',
        name: 'Neuer Name',
        color: '#3498db',
        results: {
          finalNominal: 250_000,
          finalReal: 180_000,
          totalInvested: 120_000,
          totalReturn: 130_000,
          totalTaxesPaid: 8_500
        }
      }
    ]);

    refreshScenarioResultNames();
    expect(header.textContent).toContain('Neuer Name');
  });

  test('updateWithdrawalTable deflates the end capital by the full year count', () => {
    document.body.innerHTML = `
      <input id="withdrawalInflation" value="10">
      <table id="withdrawalTable"><tbody></tbody></table>`;

    updateWithdrawalTable([
      { year: 1, startCapital: 100_000, grossWithdrawal: 0, taxesPaid: 0, netWithdrawal: 0, endCapital: 110_000 },
      { year: 2, startCapital: 110_000, grossWithdrawal: 0, taxesPaid: 0, netWithdrawal: 0, endCapital: 121_000 }
    ]);

    // The end capital sits at the end of the year: 110.000 / 1,1 and 121.000 / 1,21
    const realCells = [...document.querySelectorAll('#withdrawalTable tbody tr')].map(row => row.cells[6].textContent);
    expect(realCells).toEqual(['100.000,00 €', '100.000,00 €']);
  });
});
