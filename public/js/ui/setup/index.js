// Orchestrator for modular UI setup
// Centralizes exports from feature-specific setup modules.

// Feature modules
export { calculateBudget, setupBudgetListeners } from './setupBudget.js';
export { calculateTaxes, setupTaxCalculatorListeners } from './setupTaxes.js';
export { calculateWithdrawal, setupWithdrawalListeners } from './setupWithdrawal.js';
export {
  setupScenarioListeners,
  setupComparisonScenarioListeners,
  setupChartToggleListeners,
  setupPhaseToggle,
  setupGermanNumberInputs,
  setupSavingsModeFunctionality,
  // expose per-scenario setup so new scenarios can wire multi‑phase inputs
  setupSavingsModeForScenario,
  setupStickyScenarioCards,
  setupScenarioImport,
  setupAutoSaveScenarios,
  setupAnsparphaseScenarioListeners,
  setupEntnahmephaseScenarioListeners,
} from './setupScenarios.js';

// Back-compat: bind actual calculation wrappers to window for code paths that call window.*
import { calculateBudget, setSavingsMode } from './setupBudget.js';
import { calculateTaxes } from './setupTaxes.js';
import { calculateWithdrawal } from './setupWithdrawal.js';

try {
  if (typeof window !== 'undefined') {
    if (!window.budgetData) {
      window.budgetData = {
        totalIncome: 0,
        totalExpenses: 0,
        remainingBudget: 0,
        savings: { mode: 'fixed', amount: 500, percentage: 50 },
        finalSavingsAmount: 500,
        periods: { income: 'monthly', fixed: 'monthly', variable: 'monthly' },
      };
    }
    window.calculateBudget = calculateBudget;
    window.setSavingsMode = setSavingsMode;
    window.calculateTaxes = calculateTaxes;
    window.calculateWithdrawal = calculateWithdrawal;
  }
} catch (_) {}
