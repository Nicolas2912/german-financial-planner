// js/app.js
// Main entry point for German Financial Planner - Modular Version

// Import state management
import * as state from './state.js';

// Import utility functions
import { debounce } from './utils.js';

// Import core calculation functions
import { runScenario } from './core/accumulation.js';

// Import UI functions
import { 
    setupScenarioListeners,
    setupComparisonScenarioListeners, 
    setupWithdrawalListeners,
    setupBudgetListeners,
    setupTaxCalculatorListeners,
    setupChartToggleListeners,
    setupPhaseToggle,
    setupGermanNumberInputs,
    setupSavingsModeFunctionality,
    setupStickyScenarioCards,
    setupScenarioImport,
    setupAutoSaveScenarios,
    setupAnsparphaseScenarioListeners,
    setupEntnahmephaseScenarioListeners
} from './ui/setup.js';

import { 
    updateScenarioResults,
    updateScenarioCheckboxes,
    updateContributionsScenarioDropdown,
    updateScenarioCheckboxVisibility,
    showNotification
} from './ui/dom.js';

import { updateMainChart } from './ui/mainChart.js';
import { createIntegratedTimeline } from './ui/withdrawalChart.js';

// Import feature functions
import { setupContributionsScenarioSelector } from './features/scenarioManager.js';

// Main recalculation function that orchestrates all calculations
export function recalculateAll() {
    // Run calculations for all scenarios
    state.scenarios.forEach(scenario => {
        runScenario(scenario);
    });
    
    // Update UI components
    updateScenarioResults();
    updateMainChart();
    updateScenarioSelector();
    
    // Auto-sync withdrawal capital with active scenario (silent during calculations)
    autoSyncWithdrawalCapital(false);
    
    // Update integrated timeline if it's currently visible in withdrawal phase
    if (state.currentPhase === 'withdrawal') {
        const integratedTimelineView = document.getElementById('integratedTimelineView');
        if (integratedTimelineView && integratedTimelineView.style.display !== 'none') {
            createIntegratedTimeline();
        }
    }
}

// Debounced version of recalculateAll
export const debouncedRecalculateAll = debounce(recalculateAll, 100);

// Auto-sync withdrawal capital with active scenario
export function autoSyncWithdrawalCapital(showNotification = true) {
    if (state.isSyncing) return; // Prevent recursive calls
    
    const activeScenario = state.getActiveScenario();
    if (!activeScenario || !activeScenario.results || !activeScenario.results.endCapital) {
        return;
    }
    
    const endCapital = activeScenario.results.endCapital;
    const withdrawalCapitalInput = document.getElementById('withdrawalCapital');
    
    if (withdrawalCapitalInput) {
        state.setIsSyncing(true);
        
        // Only sync if the value has changed significantly (avoid rounding noise)
        const currentValue = parseFloat(withdrawalCapitalInput.value.replace(/\./g, '').replace(',', '.')) || 0;
        const difference = Math.abs(currentValue - endCapital);
        
        if (difference > 1) { // Only sync if difference > 1€
            withdrawalCapitalInput.value = endCapital.toLocaleString('de-DE', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            });
            
            // Update withdrawal calculations
            if (window.calculateWithdrawal) {
                window.calculateWithdrawal();
            }
            
            // Show notification only if requested and user isn't typing
            if (showNotification && !state.userIsTyping && endCapital !== state.lastSyncValue) {
                showNotification(
                    'Kapital synchronisiert',
                    `Startkapital für Entnahme wurde auf ${endCapital.toLocaleString('de-DE', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    })}€ aktualisiert.`,
                    'success'
                );
                state.setLastSyncValue(endCapital);
            }
        }
        
        state.setIsSyncing(false);
    }
}

// Update scenario selector dropdown
function updateScenarioSelector() {
    const selector = document.getElementById('scenarioSelector');
    if (!selector) return;
    
    selector.innerHTML = '';
    
    state.scenarios.forEach(scenario => {
        const option = document.createElement('option');
        option.value = scenario.id;
        option.textContent = scenario.name;
        if (scenario.id === state.activeScenario) {
            option.selected = true;
        }
        selector.appendChild(option);
    });
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Set up all event listeners
    setupScenarioListeners();
    setupComparisonScenarioListeners();
    setupWithdrawalListeners();
    setupBudgetListeners();
    setupTaxCalculatorListeners();
    setupChartToggleListeners();
    
    // Setup scenario import functionality
    setupScenarioImport();
    setupAutoSaveScenarios();
    
    // Setup scenario saving functionality
    setupAnsparphaseScenarioListeners();
    setupEntnahmephaseScenarioListeners();
    
    setupPhaseToggle();
    setupGermanNumberInputs();
    setupSavingsModeFunctionality();
    setupStickyScenarioCards();
    
    // Initial calculations
    recalculateAll();
    if (window.calculateBudget) window.calculateBudget();
    if (window.calculateTaxes) window.calculateTaxes();
    
    // Initialize scenario checkboxes and dropdowns
    updateScenarioCheckboxes();
    updateContributionsScenarioDropdown();
    setupContributionsScenarioSelector();
    updateScenarioCheckboxVisibility();
    
    // Show sync indicator on page load
    setTimeout(() => {
        autoSyncWithdrawalCapital(false);
    }, 500);
});

// Make functions available globally for onclick handlers and external access
window.recalculateAll = recalculateAll;
window.debouncedRecalculateAll = debouncedRecalculateAll;
window.autoSyncWithdrawalCapital = autoSyncWithdrawalCapital;

// Export main functions for external use
export { autoSyncWithdrawalCapital, updateScenarioSelector };