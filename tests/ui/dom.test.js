import { describe, test, expect } from 'vitest';
import { updateScenarioResults, refreshScenarioResultNames } from '../../public/js/ui/dom.js';
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
    expect(cards[0].textContent).toContain('€250.000,00');
    expect(cards[0].textContent).toContain('€8.500,00');
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
});
