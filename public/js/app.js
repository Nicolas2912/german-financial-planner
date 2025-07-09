// js/app.js
// Main entry point for German Financial Planner - Modular Version

// Import state management
import * as state from './state.js';

// Import utility functions
import { debounce } from './utils/utils.js';

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
    setupEntnahmephaseScenarioListeners,
    calculateBudget,
    calculateTaxes,
    calculateWithdrawal
} from './ui/setup.js';

import { 
    updateScenarioResults,
    updateScenarioCheckboxes,
    updateContributionsScenarioDropdown,
    updateScenarioCheckboxVisibility,
    showNotification,
    updateScenarioSliderValue
} from './ui/dom.js';

import { updateMainChart } from './ui/mainChart.js';
import { createIntegratedTimeline } from './ui/withdrawalChart.js';

// Import scenario management functions
import { addNewScenario, switchToScenario, removeScenario, renameScenario, copyScenario } from './features/scenarioManager.js';

// Import feature functions
// Note: setupContributionsScenarioSelector is implemented inline below

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
            calculateWithdrawal();
            
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

// Setup contributions scenario selector event listeners
function setupContributionsScenarioSelector() {
    const dropdown = document.getElementById('contributionsScenarioDropdown');
    if (!dropdown) return;
    
    dropdown.addEventListener('change', function() {
        state.setSelectedContributionsScenario(this.value);
        // Update the chart with the new selected scenario
        // We can access updateContributionsGainsChart via updateMainChart since it's already imported
        updateMainChart();
    });
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded fired, setting up application...');
    
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
    calculateBudget();
    calculateTaxes();
    
    // Initialize scenario checkboxes and dropdowns
    updateScenarioCheckboxes();
    updateContributionsScenarioDropdown();
    setupContributionsScenarioSelector();
    updateScenarioCheckboxVisibility();
    
    // Initialize slider values for existing scenarios
    setTimeout(() => {
        state.scenarios.forEach(scenario => {
            const sliders = ['annualReturn', 'inflationRate', 'salaryGrowth', 'duration', 'salaryToSavings'];
            sliders.forEach(sliderId => {
                updateScenarioSliderValue(sliderId, scenario.id);
            });
        });
        
        // Initialize withdrawal slider values
        const withdrawalSliders = ['withdrawalDuration', 'postRetirementReturn', 'withdrawalInflation'];
        withdrawalSliders.forEach(sliderId => {
            if (window.updateWithdrawalSliderValue) {
                window.updateWithdrawalSliderValue(sliderId);
            }
        });
    }, 100);
    
    // Show sync indicator on page load
    setTimeout(() => {
        autoSyncWithdrawalCapital(false);
    }, 500);
});

// Make functions available globally for onclick handlers and external access
window.recalculateAll = recalculateAll;
window.debouncedRecalculateAll = debouncedRecalculateAll;
window.autoSyncWithdrawalCapital = autoSyncWithdrawalCapital;
window.state = state;

// Make state variables available globally for scenario management
window.scenarios = state.scenarios;
window.scenarioColors = state.scenarioColors;
window.selectedScenariosForChart = state.selectedScenariosForChart;
window.activeScenario = state.activeScenario;
window.currentChartMode = state.currentChartMode;

// Make UI functions available globally for scenario management
window.updateScenarioCheckboxes = updateScenarioCheckboxes;
window.updateContributionsScenarioDropdown = updateContributionsScenarioDropdown;
window.showNotification = showNotification;
window.updateScenarioSliderValue = updateScenarioSliderValue;

// Add missing utility functions for scenario management
window.getScenarioValue = function(inputId, scenarioId) {
    const element = document.getElementById(`${inputId}_${scenarioId}`);
    return element ? element.value : null;
};

window.setupSavingsModeForScenario = function(scenarioId) {
    // This function sets up the savings mode toggle functionality for a scenario
    // For now, we'll implement a basic version
    console.log(`Setting up savings mode for scenario ${scenarioId}`);
    
    // Find and set up the savings mode buttons for this scenario
    const modeButtons = document.querySelectorAll(`.savings-mode-btn[data-scenario="${scenarioId}"]`);
    modeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const mode = this.dataset.mode;
            const scenario = this.dataset.scenario;
            
            // Update button states
            modeButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Show/hide appropriate containers
            const simpleContainer = document.querySelector(`.simple-savings-container[data-scenario="${scenario}"]`);
            const multiPhaseContainer = document.querySelector(`.multi-phase-savings-container[data-scenario="${scenario}"]`);
            
            if (mode === 'simple') {
                if (simpleContainer) simpleContainer.style.display = 'block';
                if (multiPhaseContainer) multiPhaseContainer.style.display = 'none';
            } else if (mode === 'multi-phase') {
                if (simpleContainer) simpleContainer.style.display = 'none';
                if (multiPhaseContainer) multiPhaseContainer.style.display = 'block';
            }
        });
    });
};

// Make scenario management functions available globally
window.addNewScenario = addNewScenario;
window.switchToScenario = switchToScenario;
window.removeScenario = removeScenario;
window.renameScenario = renameScenario;
window.copyScenario = copyScenario;

// Export main functions for external use
export { updateScenarioSelector };