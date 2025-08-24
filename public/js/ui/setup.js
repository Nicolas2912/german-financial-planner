/**
 * Setup Functions for German Financial Planner
 * 
 * This module contains all setup functions for event listeners and initialization
 * that are used throughout the application.
 */

import { parseGermanNumber, formatGermanNumber, formatCurrency } from '../utils.js';

// Import calculation functions
import { calculateBudget as calculateBudgetCore } from '../core/budget.js';
import { calculateTaxes as calculateTaxesCore } from '../core/tax.js';
import { calculateWithdrawalPlan as calculateWithdrawalCore } from '../core/withdrawal.js';
// Core functions will be available on window object from app.js

// Import state management
import * as state from '../state.js';

// Import DOM functions
import { 
    updateScenarioCheckboxVisibility,
    updateScenarioCheckboxes,
    updateContributionsScenarioDropdown,
    showNotification,
    updateScenarioSliderValue as domUpdateScenarioSliderValue,
    updateWithdrawalResults,
    updateWithdrawalTable
} from './dom.js';

// Import chart functions
import { updateBudgetPieChart } from './budgetChart.js';
import { updateMainChart, updateContributionsGainsChart } from './mainChart.js';
import { updateWithdrawalChart, createIntegratedTimeline } from './withdrawalChart.js';

// Import feature functions
import { loadComparisonProfiles } from '../features/profileManager.js';
import { addNewScenario, switchToScenario } from '../features/scenarioManager.js';

// Import core calculation functions
import { runScenario } from '../core/accumulation.js';



// ===================================
// WRAPPER FUNCTIONS FOR CALCULATIONS
// ===================================

/**
 * Wrapper for budget calculation that collects DOM data and updates UI
 */
function calculateBudget() {
    // Get current periods
    const incomePeriod = document.querySelector('#incomePeriodToggle .period-option.active')?.dataset.period || 'monthly';
    const fixedPeriod = document.querySelector('#fixedPeriodToggle .period-option.active')?.dataset.period || 'monthly';
    const variablePeriod = document.querySelector('#variablePeriodToggle .period-option.active')?.dataset.period || 'monthly';

    // Collect input data
    const inputData = {
        income: {
            salary: document.getElementById('salary')?.value || '0',
            sideIncome: document.getElementById('sideIncome')?.value || '0',
            otherIncome: document.getElementById('otherIncome')?.value || '0'
        },
        expenses: {
            rent: document.getElementById('rent')?.value || '0',
            utilities: document.getElementById('utilities')?.value || '0',
            health: document.getElementById('health')?.value || '0',
            insurance: document.getElementById('insurance')?.value || '0',
            internet: document.getElementById('internet')?.value || '0',
            gez: document.getElementById('gez')?.value || '0',
            food: document.getElementById('food')?.value || '0',
            transport: document.getElementById('transport')?.value || '0',
            leisure: document.getElementById('leisure')?.value || '0',
            clothing: document.getElementById('clothing')?.value || '0',
            subscriptions: document.getElementById('subscriptions')?.value || '0',
            miscellaneous: document.getElementById('miscellaneous')?.value || '0'
        },
        periods: {
            income: incomePeriod,
            fixed: fixedPeriod,
            variable: variablePeriod
        }
    };

    try {
        // Calculate budget using core function
        const results = calculateBudgetCore(inputData);
        
        // Update UI displays
        if (document.getElementById('incomeTotal')) {
            document.getElementById('incomeTotal').textContent = formatCurrency(results.totalIncome);
        }
        if (document.getElementById('fixedTotal')) {
            document.getElementById('fixedTotal').textContent = formatCurrency(results.fixedTotal);
        }
        if (document.getElementById('variableTotal')) {
            document.getElementById('variableTotal').textContent = formatCurrency(results.variableTotal);
        }
        if (document.getElementById('totalIncome')) {
            document.getElementById('totalIncome').textContent = formatCurrency(results.totalIncome);
        }
        if (document.getElementById('totalExpenses')) {
            document.getElementById('totalExpenses').textContent = formatCurrency(results.totalExpenses);
        }
        if (document.getElementById('remainingBudget')) {
            document.getElementById('remainingBudget').textContent = formatCurrency(results.remainingBudget);
        }

        // Update remaining budget color
        const remainingDisplay = document.querySelector('.remaining-display');
        if (remainingDisplay) {
            if (results.remainingBudget < 0) {
                remainingDisplay.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
            } else if (results.remainingBudget < 200) {
                remainingDisplay.style.background = 'linear-gradient(135deg, #f39c12, #e67e22)';
            } else {
                remainingDisplay.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';
            }
        }

        // Update budget pie chart
        updateBudgetPieChart(results.monthlyFixedExpenses, results.monthlyVariableExpenses, results.remainingBudget);
        
        // Update global budgetData object with calculated results
        window.budgetData.totalIncome = results.totalIncome;
        window.budgetData.totalExpenses = results.totalExpenses;
        window.budgetData.remainingBudget = results.remainingBudget;
        
        // Update savings display
        updateSavingsDisplay();
        
        // Store in state
        state.setBudgetData({
            totalIncome: results.totalIncome,
            totalExpenses: results.totalExpenses,
            remainingBudget: results.remainingBudget,
            results: results
        });

    } catch (error) {
        console.error('Error calculating budget:', error);
    }
}

/**
 * Wrapper for tax calculation that collects DOM data and updates UI
 */
function calculateTaxes() {
    // Collect input data
    const grossSalary = parseGermanNumber(document.getElementById('grossSalary')?.value || '60000');
    const taxClass = parseInt(document.getElementById('taxClass')?.value || '1');
    const federalState = document.getElementById('federalState')?.value || 'nw';
    const age = parseInt(document.getElementById('age')?.value || '30');
    const children = parseInt(document.getElementById('children')?.value || '0');
    const churchTax = document.getElementById('churchTaxToggle')?.classList.contains('active') || false;
    const publicHealthInsurance = document.getElementById('publicHealthInsuranceToggle')?.classList.contains('active') || true;
    const healthInsuranceRate = parseFloat(document.getElementById('healthInsuranceRate')?.value || '2.5');

    try {
        // Calculate using core function
        const results = calculateTaxesCore(grossSalary, taxClass, federalState, age, children, churchTax, publicHealthInsurance, healthInsuranceRate);
        
        // Update UI displays
        if (document.getElementById('grossMonthlySalary')) {
            document.getElementById('grossMonthlySalary').textContent = formatCurrency(results.grossMonthlySalary);
        }
        if (document.getElementById('netMonthlySalary')) {
            document.getElementById('netMonthlySalary').textContent = formatCurrency(results.netMonthlySalary);
        }
        if (document.getElementById('netYearlySalary')) {
            document.getElementById('netYearlySalary').textContent = formatCurrency(results.netYearlySalary);
        }
        if (document.getElementById('totalDeductions')) {
            document.getElementById('totalDeductions').textContent = formatCurrency(results.totalDeductions);
        }
        if (document.getElementById('incomeTax')) {
            document.getElementById('incomeTax').textContent = formatCurrency(results.breakdown?.incomeTax || 0);
        }
        if (document.getElementById('churchTax')) {
            document.getElementById('churchTax').textContent = formatCurrency(results.breakdown?.churchTax || 0);
        }
        if (document.getElementById('healthInsurance')) {
            document.getElementById('healthInsurance').textContent = formatCurrency(results.breakdown?.healthInsurance || 0);
        }
        if (document.getElementById('careInsurance')) {
            document.getElementById('careInsurance').textContent = formatCurrency(results.breakdown?.careInsurance || 0);
        }
        if (document.getElementById('pensionInsurance')) {
            document.getElementById('pensionInsurance').textContent = formatCurrency(results.breakdown?.pensionInsurance || 0);
        }
        if (document.getElementById('unemploymentInsurance')) {
            document.getElementById('unemploymentInsurance').textContent = formatCurrency(results.breakdown?.unemploymentInsurance || 0);
        }

    } catch (error) {
        console.error('Error calculating taxes:', error);
    }
}

/**
 * Wrapper for withdrawal calculation that collects DOM data and updates UI
 */
function calculateWithdrawal() {
    // Collect input data
    const retirementCapital = parseGermanNumber(document.getElementById('retirementCapital')?.value || '1000000');
    const duration = parseInt(document.getElementById('withdrawalDuration')?.value || '25');
    const annualReturn = parseFloat(document.getElementById('postRetirementReturn')?.value || '5') / 100;
    const inflationRate = parseFloat(document.getElementById('withdrawalInflation')?.value || '2') / 100;
    const includeTax = document.getElementById('withdrawalTaxToggle')?.classList.contains('active') || false;

    try {
        // Calculate using core function
        const results = calculateWithdrawalCore(retirementCapital, duration, annualReturn, inflationRate, includeTax, 0);
        
        // Update UI displays
        updateWithdrawalResults(results);
        
        // Update withdrawal chart and table
        if (results.yearlyData && results.yearlyData.length > 0) {
            updateWithdrawalChart(results.yearlyData);
            updateWithdrawalTable(results.yearlyData);
        }
        
        // Update integrated timeline if it's currently visible
        const integratedTimelineView = document.getElementById('integratedTimelineView');
        if (integratedTimelineView && integratedTimelineView.style.display !== 'none') {
            createIntegratedTimeline();
        }
        
        // Store in state
        state.setWithdrawalData(results);

    } catch (error) {
        console.error('Error calculating withdrawal:', error);
    }
}

/**
 * Update savings display
 */
function updateSavingsDisplay() {
    const budgetData = state.budgetData || {};
    const savingsAmountInput = document.getElementById('savingsAmount');
    const savingsPercentageInput = document.getElementById('savingsPercentage');
    const finalSavingsAmountEl = document.getElementById('finalSavingsAmount');
    
    if (!savingsAmountInput || !finalSavingsAmountEl) return;

    let finalSavingsAmount = 0;
    const savingsMode = document.querySelector('.allocation-option.active')?.id || 'fixedAmount';

    if (savingsMode === 'fixedAmount') {
        finalSavingsAmount = parseGermanNumber(savingsAmountInput.value) || 0;
    } else {
        const percentage = parseFloat(savingsPercentageInput?.value || '50');
        finalSavingsAmount = (budgetData.remainingBudget || 0) * (percentage / 100);
    }

    // Ensure savings don't exceed remaining budget
    finalSavingsAmount = Math.min(finalSavingsAmount, budgetData.remainingBudget || 0);
    finalSavingsAmount = Math.max(0, finalSavingsAmount);

    finalSavingsAmountEl.textContent = formatCurrency(finalSavingsAmount);

    // Update savings result color
    const savingsResult = document.querySelector('.savings-result');
    if (savingsResult) {
        if (finalSavingsAmount > (budgetData.remainingBudget || 0)) {
            savingsResult.style.background = '#e74c3c';
        } else if (finalSavingsAmount === 0) {
            savingsResult.style.background = '#95a5a6';
        } else {
            savingsResult.style.background = '#27ae60';
        }
    }
    
    // Update global budgetData object for compatibility
    window.budgetData.finalSavingsAmount = finalSavingsAmount;
}

// Initialize global budgetData for compatibility
window.budgetData = {
    income: {},
    expenses: {},
    savings: { amount: 500, mode: 'fixed', percentage: 50 },
    periods: { income: 'monthly', fixed: 'monthly', variable: 'monthly' }
};

// Expose wrapper functions to window for global access
window.calculateBudget = calculateBudget;
window.calculateTaxes = calculateTaxes;
window.calculateWithdrawal = calculateWithdrawal;

// Initialize window.budgetData if it doesn't exist
if (!window.budgetData) {
    window.budgetData = {
        totalIncome: 0,
        totalExpenses: 0,
        remainingBudget: 0,
        savings: { mode: 'fixed', amount: 500, percentage: 50 },
        finalSavingsAmount: 500,
        periods: { income: 'monthly', fixed: 'monthly', variable: 'monthly' }
    };
}

// Export the main calculation functions so they can be used elsewhere
export { calculateBudget, calculateTaxes, calculateWithdrawal };

// ===================================
// MAIN SETUP FUNCTIONS
// ===================================

/**
 * Setup scenario listeners and management
 */
export function setupScenarioListeners() {
    // Set up scenario tabs
    setupScenarioTabs();
    
    // Set up scenario-specific input listeners for initial scenario A
    setupScenarioInputListeners('A');
    
    // Initialize slider values for scenario A
    initializeScenarioSliderValues('A');
    
    // Set up scenario management button listeners
    setupScenarioManagementListeners();
}

/**
 * Setup scenario input listeners for a specific scenario
 * @param {string} scenarioId - The ID of the scenario to setup
 */
export function setupScenarioInputListeners(scenarioId) {
    // Sliders
    const sliders = ['annualReturn', 'inflationRate', 'salaryGrowth', 'duration', 'salaryToSavings'];
    sliders.forEach(sliderId => {
        const fullId = sliderId + '_' + scenarioId;
        const slider = document.getElementById(fullId);
        if (slider) {
            slider.addEventListener('input', function() {
                // Use window functions if available for better compatibility
                if (window.updateScenarioSliderValue) {
                    window.updateScenarioSliderValue(sliderId, scenarioId);
                } else {
                    updateScenarioSliderValue(sliderId, scenarioId);
                }
                
                if (window.debouncedRecalculateAll) {
                    window.debouncedRecalculateAll();
                }
                
                // Auto-save individual scenario after slider change
                setTimeout(() => {
                    if (window.saveIndividualAnsparphaseScenario) {
                        window.saveIndividualAnsparphaseScenario(scenarioId);
                    } else {
                        saveIndividualAnsparphaseScenario(scenarioId);
                    }
                }, 500);
            });
        }
    });

    // Input fields with typing detection
    ['monthlySavings', 'initialCapital', 'baseSalary'].forEach(inputId => {
        const fullId = inputId + '_' + scenarioId;
        const input = document.getElementById(fullId);
        if (input) {
            let typingTimeout;
            
            input.addEventListener('input', function() {
                state.setUserIsTyping(true);
                
                // Clear existing timeout
                if (typingTimeout) {
                    clearTimeout(typingTimeout);
                }
                
                // Set user as not typing after 1 second of inactivity
                typingTimeout = setTimeout(() => {
                    state.setUserIsTyping(false);
                    // Auto-save individual scenario after typing stops
                    if (window.saveIndividualAnsparphaseScenario) {
                        window.saveIndividualAnsparphaseScenario(scenarioId);
                    }
                }, 1000);
                
                if (window.debouncedRecalculateAll) {
                    window.debouncedRecalculateAll();
                }
            });
            
            // Also detect when user finishes editing (blur event)
            input.addEventListener('blur', function() {
                state.setUserIsTyping(false);
                if (typingTimeout) {
                    clearTimeout(typingTimeout);
                }
                // Trigger sync with notification after user finishes editing
                setTimeout(() => {
                    if (window.autoSyncWithdrawalCapital) {
                        window.autoSyncWithdrawalCapital(true);
                    }
                }, 200);
            });
        }
    });

    // Tax toggle
    const taxToggle = document.getElementById('taxToggle_' + scenarioId);
    if (taxToggle) {
        taxToggle.addEventListener('click', function() {
            this.classList.toggle('active');
            const isActive = this.classList.contains('active');
            
            if (window.updateTeilfreistellungToggleState) {
                window.updateTeilfreistellungToggleState(scenarioId);
            } else {
                updateTeilfreistellungToggleState(scenarioId);
            }
            
            // Update scenario comparison parameters to sync with main toggles
            if (window.updateScenarioParameter) {
                // Update both accumulation and withdrawal tax settings
                window.updateScenarioParameter(scenarioId, 'accumulation.includeTax', isActive);
                window.updateScenarioParameter(scenarioId, 'withdrawal.includeTax', isActive);
                console.log(`🔄 Synced tax settings for scenario ${scenarioId}: ${isActive}`);
            }
            
            // For toggle actions, calculate immediately without debouncing
            if (window.recalculateAll) {
                window.recalculateAll();
            }
            
            // Update comparison scenario results for this scenario
            if (window.calculateComparisonScenarioResults) {
                window.calculateComparisonScenarioResults(scenarioId);
            }
            
            // Auto-save individual scenario after toggle change
            setTimeout(() => {
                if (window.saveIndividualAnsparphaseScenario) {
                    window.saveIndividualAnsparphaseScenario(scenarioId);
                }
            }, 500);
        });
    }

    // ETF type radio buttons
    const etfTypeRadios = document.querySelectorAll(`input[name="etfType-${scenarioId}"]`);
    etfTypeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (window.debouncedRecalculateAll) {
                window.debouncedRecalculateAll();
            } else {
                if (window.debouncedRecalculateAll) {
                    window.debouncedRecalculateAll();
                }
            }
            
            // Auto-save individual scenario after ETF type change
            setTimeout(() => {
                if (window.saveIndividualAnsparphaseScenario) {
                    window.saveIndividualAnsparphaseScenario(scenarioId);
                }
            }, 500);
        });
    });

    // Teilfreistellung toggle
    const teilfreistellungToggle = document.getElementById('teilfreistellungToggle_' + scenarioId);
    if (teilfreistellungToggle) {
        teilfreistellungToggle.addEventListener('click', function() {
            // Only allow toggle if not disabled
            if (!this.classList.contains('disabled')) {
                this.classList.toggle('active');
                const isActive = this.classList.contains('active');
                
                // Update scenario comparison parameters to sync with main toggles
                if (window.updateScenarioParameter) {
                    window.updateScenarioParameter(scenarioId, 'accumulation.teilfreistellung', isActive);
                    console.log(`🔄 Synced Teilfreistellung setting for scenario ${scenarioId}: ${isActive}`);
                }
                
                // For toggle actions, calculate immediately without debouncing
                if (window.recalculateAll) {
                    window.recalculateAll();
                }
                
                // Update comparison scenario results for this scenario
                if (window.calculateComparisonScenarioResults) {
                    window.calculateComparisonScenarioResults(scenarioId);
                }
                
                // Auto-save individual scenario after toggle change
                setTimeout(() => {
                    if (window.saveIndividualAnsparphaseScenario) {
                        window.saveIndividualAnsparphaseScenario(scenarioId);
                    }
                }, 500);
            }
        });
    }

    // Initialize the Teilfreistellung toggle state
    // Use a small delay to ensure DOM is fully ready
    setTimeout(() => {
        if (window.updateTeilfreistellungToggleState) {
            window.updateTeilfreistellungToggleState(scenarioId);
        } else {
            updateTeilfreistellungToggleState(scenarioId);
        }
        
        // Sync initial toggle states with scenario comparison parameters
        if (window.updateScenarioParameter) {
            const taxToggle = document.getElementById('taxToggle_' + scenarioId);
            const teilfreistellungToggle = document.getElementById('teilfreistellungToggle_' + scenarioId);
            
            if (taxToggle) {
                const isTaxActive = taxToggle.classList.contains('active');
                window.updateScenarioParameter(scenarioId, 'accumulation.includeTax', isTaxActive);
                window.updateScenarioParameter(scenarioId, 'withdrawal.includeTax', isTaxActive);
                console.log(`🔄 Initial sync tax settings for scenario ${scenarioId}: ${isTaxActive}`);
            }
            
            if (teilfreistellungToggle) {
                const isTeilfreistellungActive = teilfreistellungToggle.classList.contains('active');
                window.updateScenarioParameter(scenarioId, 'accumulation.teilfreistellung', isTeilfreistellungActive);
                console.log(`🔄 Initial sync Teilfreistellung for scenario ${scenarioId}: ${isTeilfreistellungActive}`);
            }
            
            // Recalculate results with synced parameters
            if (window.calculateComparisonScenarioResults) {
                window.calculateComparisonScenarioResults(scenarioId);
            }
        }
    }, 100);
}

/**
 * Setup comparison scenario listeners
 */
export function setupComparisonScenarioListeners() {
    // Set up comparison scenario tabs event listeners
    setupComparisonScenarioTabs();
    
    // Set up profile selection functionality
    setupComparisonProfileSelection();
    
    // Note: Add comparison scenario button event listener is now handled in scenarioComparison.js
    // to prevent duplicate event listeners
    
    // Initialize static HTML scenario controls for A and B
    if (window.initializeComparisonScenarioControls) {
        window.initializeComparisonScenarioControls('A');
        window.initializeComparisonScenarioControls('B');
    }
    
    // Initialize budget calculations for default scenarios
    setTimeout(() => {
        // Set up Teilfreistellung dependency for default scenarios
        updateComparisonTeilfreistellungState('A');
        updateComparisonTeilfreistellungState('B');
        
        if (window.updateComparisonScenarioBudget) {
            window.updateComparisonScenarioBudget('A');
            window.updateComparisonScenarioBudget('B');
        }
        // Calculate initial results for default scenarios (immediate, not debounced)
        if (window.calculateComparisonScenarioResults) {
            window.calculateComparisonScenarioResults('A');
            window.calculateComparisonScenarioResults('B');
        }
            // Setup comparison chart view toggles
    setupComparisonChartViewToggle();
    // Setup scenario visibility controls
    setupScenarioVisibilityControls();
    // Setup parameter comparison table
    setupParameterComparisonTable();
        // Also ensure profiles are loaded
        if (window.loadComparisonProfiles) window.loadComparisonProfiles();
        // Load scenario imports
        if (window.loadScenarioImports) window.loadScenarioImports();
    }, 100);
}

/**
 * Setup withdrawal phase listeners
 */
export function setupWithdrawalListeners() {
    // Setup Teilfreistellung rate slider
    const teilfreistellungRateSlider = document.getElementById('withdrawalTeilfreistellungRate');
    const teilfreistellungGroup = document.getElementById('teilfreistellungGroup');
    
    if (teilfreistellungRateSlider) {
        teilfreistellungRateSlider.addEventListener('input', function() {
            updateWithdrawalSliderValue('withdrawalTeilfreistellungRate');
            debouncedCalculateWithdrawal();
        });
    }
    
    let withdrawalCalculationTimeout = null;
    
    // Debounced calculation function to prevent excessive calculations
    function debouncedCalculateWithdrawal() {
        if (withdrawalCalculationTimeout) {
            clearTimeout(withdrawalCalculationTimeout);
        }
        withdrawalCalculationTimeout = setTimeout(() => {
            calculateWithdrawal();
        }, 150); // 150ms delay to allow for smooth slider interaction
    }

    // Withdrawal sliders with debounced calculation
    const withdrawalSliders = ['withdrawalDuration', 'postRetirementReturn', 'withdrawalInflation'];
    withdrawalSliders.forEach(id => {
        const slider = document.getElementById(id);
        if (slider) {
            // Update display immediately, but debounce calculation
            slider.addEventListener('input', function() {
                updateWithdrawalSliderValue(id);
                debouncedCalculateWithdrawal();
            });
            
            // Also handle 'change' event for when user stops dragging
            slider.addEventListener('change', function() {
                updateWithdrawalSliderValue(id);
                if (withdrawalCalculationTimeout) {
                    clearTimeout(withdrawalCalculationTimeout);
                }
                calculateWithdrawal(); // Immediate calculation on final change
            });
            
            // Initialize slider display value
            updateWithdrawalSliderValue(id);
        }
    });

    // Withdrawal input fields with debouncing
    document.getElementById('retirementCapital').addEventListener('input', debouncedCalculateWithdrawal);

    // Withdrawal tax toggle (immediate calculation)
    document.getElementById('withdrawalTaxToggle').addEventListener('click', function() {
        this.classList.toggle('active');
        
        // Show/hide Teilfreistellung rate control based on tax toggle
        const teilfreistellungGroup = document.getElementById('teilfreistellungGroup');
        if (teilfreistellungGroup) {
            if (this.classList.contains('active')) {
                teilfreistellungGroup.style.display = 'block';
            } else {
                teilfreistellungGroup.style.display = 'none';
            }
        }
        
        calculateWithdrawal();
    });
    
    // Use accumulation result button
    document.getElementById('useAccumulationResult').addEventListener('click', function() {
        const selectedScenarioId = document.getElementById('scenarioSelector').value;
        
        if (!selectedScenarioId) {
            alert('Bitte wählen Sie zuerst ein Szenario aus der Liste aus.');
            return;
        }
        
        const selectedScenario = scenarios.find(s => s.id === selectedScenarioId);
        if (selectedScenario && selectedScenario.yearlyData && selectedScenario.yearlyData.length > 0) {
            const finalValue = selectedScenario.yearlyData[selectedScenario.yearlyData.length - 1].capital;
            document.getElementById('retirementCapital').value = Math.round(finalValue).toLocaleString('de-DE');
            
            // The total contributions will be automatically calculated from the selected scenario
            // when calculateWithdrawal() is called
            calculateWithdrawal();
            
            // Show notification with cost basis information
            const totalContributions = (selectedScenario.monthlyContribution || 0) * 12 * (selectedScenario.duration || 0);
            const unrealizedGains = finalValue - totalContributions;
            showNotification(
                '📊 Szenario übernommen', 
                `Endkapital: €${Math.round(finalValue).toLocaleString('de-DE')} | Einzahlungen: €${Math.round(totalContributions).toLocaleString('de-DE')} | Kursgewinne: €${Math.round(unrealizedGains).toLocaleString('de-DE')}`, 
                'success'
            );
        } else {
            alert('Das gewählte Szenario hat keine berechneten Ergebnisse. Bitte berechnen Sie zuerst die Ansparphase.');
        }
    });
    
    // Manual sync button
    document.getElementById('manualSyncBtn').addEventListener('click', function() {
        if (window.autoSyncWithdrawalCapital) {
            window.autoSyncWithdrawalCapital(true);
        }
    });
}

/**
 * Setup budget phase listeners
 */
export function setupBudgetListeners() {
    // Profile management buttons - import the functions directly
    const { openSaveProfileModal, openLoadProfileModal, openProfileManager, closeSaveProfileModal, closeLoadProfileModal, closeProfileManager, updateProfilePreview, confirmSaveProfile } = window.profileManager;
    
    const saveProfileBtn = document.getElementById('saveProfile');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', openSaveProfileModal);
    }
    
    // Load profile functionality removed - now only available in "Profile verwalten"
    
    const manageProfilesBtn = document.getElementById('manageProfiles');
    if (manageProfilesBtn) {
        manageProfilesBtn.addEventListener('click', openProfileManager);
    }
    
    const resetBudgetBtn = document.getElementById('resetBudget');
    if (resetBudgetBtn) {
        resetBudgetBtn.addEventListener('click', resetBudget);
    }

    // Profile modal close buttons
    const closeSaveProfileModalBtn = document.getElementById('closeSaveProfileModal');
    if (closeSaveProfileModalBtn) {
        closeSaveProfileModalBtn.addEventListener('click', closeSaveProfileModal);
    }
    
    const cancelSaveProfileBtn = document.getElementById('cancelSaveProfile');
    if (cancelSaveProfileBtn) {
        cancelSaveProfileBtn.addEventListener('click', closeSaveProfileModal);
    }
    
    const confirmSaveProfileBtn = document.getElementById('confirmSaveProfile');
    if (confirmSaveProfileBtn) {
        confirmSaveProfileBtn.addEventListener('click', confirmSaveProfile);
    }
    
    // Load profile modal event listeners removed - functionality moved to "Profile verwalten"
    
    const closeProfileModalBtn = document.getElementById('closeProfileModal');
    if (closeProfileModalBtn) {
        closeProfileModalBtn.addEventListener('click', closeProfileManager);
    }

    // Profile name and description inputs for preview updates
    const profileNameInput = document.getElementById('profileName');
    if (profileNameInput) {
        profileNameInput.addEventListener('input', updateProfilePreview);
    }
    
    const profileDescriptionInput = document.getElementById('profileDescription');
    if (profileDescriptionInput) {
        profileDescriptionInput.addEventListener('input', updateProfilePreview);
    }

    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        const saveModal = document.getElementById('saveProfileModal');
        const manageModal = document.getElementById('profileModal');
        
        if (event.target === saveModal) {
            closeSaveProfileModal();
        }
        if (event.target === manageModal) {
            closeProfileManager();
        }
    });

    // Income inputs
    const incomeInputs = ['salary', 'sideIncome', 'otherIncome'];
    incomeInputs.forEach(id => {
        document.getElementById(id).addEventListener('input', calculateBudget);
    });

    // Expense inputs
    const expenseInputs = ['rent', 'utilities', 'health', 'insurance', 'internet', 'gez', 
                         'food', 'transport', 'leisure', 'clothing', 'subscriptions', 'miscellaneous'];
    expenseInputs.forEach(id => {
        document.getElementById(id).addEventListener('input', calculateBudget);
    });

    // Period toggles
    setupPeriodToggle('incomePeriodToggle', 'income');
    setupPeriodToggle('fixedPeriodToggle', 'fixed');
    setupPeriodToggle('variablePeriodToggle', 'variable');

    // Savings allocation controls
    document.getElementById('fixedAmount').addEventListener('click', function() {
        setSavingsMode('fixed');
    });

    document.getElementById('percentage').addEventListener('click', function() {
        setSavingsMode('percentage');
    });

    document.getElementById('savingsAmount').addEventListener('input', function() {
        budgetData.savings.amount = parseGermanNumber(this.value);
        updateSavingsDisplay();
    });

    document.getElementById('savingsPercentage').addEventListener('input', function() {
        const percentage = parseFloat(this.value);
        budgetData.savings.percentage = percentage;
        document.getElementById('savingsPercentageValue').textContent = percentage + '%';
        updateSavingsDisplay();
    });

    // Apply savings rate to accumulation phase
    document.getElementById('applySavingsRate').addEventListener('click', function() {
        const savingsText = document.getElementById('finalSavingsAmount').textContent.replace('€', '').trim();
        const savingsAmount = parseGermanNumber(savingsText);
        document.getElementById(`monthlySavings_${state.activeScenario}`).value = formatGermanNumber(savingsAmount, 0).replace(',00', '');
        
        // Switch to accumulation phase
        document.getElementById('accumulationPhase').click();
        if (window.recalculateAll) {
            window.recalculateAll();
        }
        
        // Show success notification
        showNotification('✅ Übernommen', 'Die Sparrate wurde in die Ansparphase übertragen.', 'success');
    });
}

/**
 * Setup tax calculator listeners
 */
export function setupTaxCalculatorListeners() {
    // Input fields
    ['grossSalary', 'age', 'children'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', calculateTaxes);
        }
    });

    // Select fields
    ['taxClass', 'federalState'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', calculateTaxes);
        }
    });

    // Tax toggles
    const churchTaxToggle = document.getElementById('churchTaxToggle');
    if (churchTaxToggle) {
        churchTaxToggle.addEventListener('click', function() {
            this.classList.toggle('active');
            calculateTaxes();
        });
    }

    const publicHealthInsuranceToggle = document.getElementById('publicHealthInsuranceToggle');
    if (publicHealthInsuranceToggle) {
        publicHealthInsuranceToggle.addEventListener('click', function() {
            this.classList.toggle('active');
            const healthGroup = document.getElementById('healthInsuranceRateGroup');
            if (healthGroup) {
                healthGroup.style.display = this.classList.contains('active') ? 'block' : 'none';
            }
            calculateTaxes();
        });
    }

    // Health insurance rate slider
    const healthSlider = document.getElementById('healthInsuranceRate');
    if (healthSlider) {
        healthSlider.addEventListener('input', function() {
            const valueElement = document.getElementById('healthInsuranceRateValue');
            if (valueElement) {
                valueElement.textContent = parseFloat(this.value).toFixed(1) + '%';
            }
            calculateTaxes();
        });
    }

    // Annual salary increase slider
    const salarySlider = document.getElementById('annualSalaryIncrease');
    if (salarySlider) {
        salarySlider.addEventListener('input', function() {
            const valueElement = document.getElementById('annualSalaryIncreaseValue');
            if (valueElement) {
                valueElement.textContent = parseFloat(this.value).toFixed(1) + '%';
            }
            calculateTaxes();
        });
    }

    // Integration button
    const integrationButton = document.getElementById('useTaxCalculatorResults');
    if (integrationButton) {
        integrationButton.addEventListener('click', function() {
            const netMonthlySalaryElement = document.getElementById('netMonthlySalary');
            const grossSalaryElement = document.getElementById('grossSalary');
            
            if (netMonthlySalaryElement && grossSalaryElement) {
                const netMonthlySalary = parseGermanNumber(netMonthlySalaryElement.textContent.replace('€', ''));
                const grossSalary = parseGermanNumber(grossSalaryElement.value);
                
                // Update budget section with net salary
                const salaryElement = document.getElementById('salary');
                if (salaryElement) {
                    salaryElement.value = formatGermanNumber(netMonthlySalary, 0);
                }
                
                // Update ETF calculator with net monthly salary as monthly savings base for active scenario
                const suggestedSavingsRate = Math.min(500, netMonthlySalary * 0.2); // Suggest 20% savings rate
                const baseSalaryElement = document.getElementById(`baseSalary_${state.activeScenario}`);
                if (baseSalaryElement) {
                    baseSalaryElement.value = formatGermanNumber(grossSalary, 0);
                }
                
                // Switch to budget phase
                document.getElementById('budgetPhase').click();
                calculateBudget();
                
                // Show success notification
                showNotification('✅ Übernommen', 'Die Gehaltsberechnungen wurden in das Budget übertragen.', 'success');
            }
        });
    }
}

/**
 * Setup chart toggle listeners
 */
export function setupChartToggleListeners() {
    // Accumulation phase chart toggle
    const scenarioComparisonBtn = document.getElementById('scenarioComparisonBtn');
    const contributionsGainsBtn = document.getElementById('contributionsGainsBtn');

    if (scenarioComparisonBtn) {
        scenarioComparisonBtn.addEventListener('click', function() {
            // Switch to scenario comparison view
            scenarioComparisonBtn.classList.add('active');
            contributionsGainsBtn.classList.remove('active');
            state.setCurrentChartMode('comparison');
            updateMainChart();
            updateScenarioCheckboxVisibility();
        });
    }

    if (contributionsGainsBtn) {
        contributionsGainsBtn.addEventListener('click', function() {
            // Switch to contributions vs gains view
            contributionsGainsBtn.classList.add('active');
            scenarioComparisonBtn.classList.remove('active');
            state.setCurrentChartMode('contributions');
            updateContributionsGainsChart();
            updateScenarioCheckboxVisibility();
        });
    }

    // Scenario selector listeners
    setupScenarioSelectorListeners();

    // Withdrawal phase chart toggle
    const withdrawalChartBtn = document.getElementById('withdrawalChartBtn');
    const integratedTimelineBtn = document.getElementById('integratedTimelineBtn');
    const withdrawalChartView = document.getElementById('withdrawalChartView');
    const integratedTimelineView = document.getElementById('integratedTimelineView');

    if (withdrawalChartBtn) {
        withdrawalChartBtn.addEventListener('click', function() {
            // Switch to withdrawal chart view
            withdrawalChartBtn.classList.add('active');
            integratedTimelineBtn.classList.remove('active');
            withdrawalChartView.style.display = 'block';
            integratedTimelineView.style.display = 'none';
            
            // Update withdrawal chart when switching to this view
            const withdrawalData = state.withdrawalData;
            if (withdrawalData && withdrawalData.yearlyData && withdrawalData.yearlyData.length > 0) {
                updateWithdrawalChart(withdrawalData.yearlyData);
            }
        });
    }

    if (integratedTimelineBtn) {
        integratedTimelineBtn.addEventListener('click', function() {
            // Switch to integrated timeline view
            integratedTimelineBtn.classList.add('active');
            if (withdrawalChartBtn) withdrawalChartBtn.classList.remove('active');
            integratedTimelineView.style.display = 'block';
            withdrawalChartView.style.display = 'none';
            // Regenerate integrated timeline when switching to this view
            createIntegratedTimeline();
        });
    }
}

/**
 * Setup phase toggle functionality
 */
export function setupPhaseToggle() {
    const budgetBtn = document.getElementById('budgetPhase');
    const taxCalculatorBtn = document.getElementById('taxCalculatorPhase');
    const accumulationBtn = document.getElementById('accumulationPhase');
    const withdrawalBtn = document.getElementById('withdrawalPhase');
    const scenarioComparisonBtn = document.getElementById('scenarioComparisonPhase');
    const budgetSection = document.getElementById('budgetSection');
    const taxCalculatorSection = document.getElementById('taxCalculatorSection');
    const accumulationSection = document.querySelector('.top-section');
    const accumulationChart = document.getElementById('accumulationChart');
    const withdrawalSection = document.getElementById('withdrawalSection');
    const scenarioComparisonSection = document.getElementById('scenarioComparisonSection');

    const allSections = [budgetSection, taxCalculatorSection, accumulationSection, accumulationChart, withdrawalSection, scenarioComparisonSection];

    // Hide all sections initially
    allSections.forEach(section => {
        if (section) {
            section.style.display = 'none';
        }
    });

    // Show initial section (accumulation)
    if (accumulationSection) {
        accumulationSection.style.display = 'grid';
    }
    if (accumulationChart) {
        accumulationChart.style.display = 'block';
    }

    if (budgetBtn) {
        budgetBtn.addEventListener('click', function() {
            state.setCurrentPhase('budget');
            setActivePhase(budgetBtn);
            showSingleSection(budgetSection);
            calculateBudget();
            updateScenarioCheckboxVisibility();
            if (window.resetStickyScenarioCards) window.resetStickyScenarioCards();
        });
    }

    if (taxCalculatorBtn) {
        taxCalculatorBtn.addEventListener('click', function() {
            state.setCurrentPhase('taxCalculator');
            setActivePhase(taxCalculatorBtn);
            showSingleSection(taxCalculatorSection);
            calculateTaxes();
            updateScenarioCheckboxVisibility();
            if (window.resetStickyScenarioCards) window.resetStickyScenarioCards();
        });
    }

    if (accumulationBtn) {
        accumulationBtn.addEventListener('click', function() {
            state.setCurrentPhase('accumulation');
            setActivePhase(accumulationBtn);
            showAccumulationSections();
            updateScenarioCheckboxVisibility();
            if (window.resetStickyScenarioCards) window.resetStickyScenarioCards();
        });
    }

    if (withdrawalBtn) {
        withdrawalBtn.addEventListener('click', function() {
            state.setCurrentPhase('withdrawal');
            setActivePhase(withdrawalBtn);
            showSingleSection(withdrawalSection);
            
            // Ensure withdrawal calculations and charts are up-to-date
            calculateWithdrawal();
            
            // Initialize chart display based on current active button
            setTimeout(() => {
                const activeChartBtn = document.querySelector('#withdrawalChartBtn.active, #integratedTimelineBtn.active');
                if (activeChartBtn && activeChartBtn.id === 'integratedTimelineBtn') {
                    createIntegratedTimeline();
                } else {
                    // Default to withdrawal chart view
                    const withdrawalData = state.withdrawalData;
                    if (withdrawalData && withdrawalData.yearlyData && withdrawalData.yearlyData.length > 0) {
                        updateWithdrawalChart(withdrawalData.yearlyData);
                    }
                }
            }, 100);
            
            updateScenarioCheckboxVisibility();
            if (window.resetStickyScenarioCards) window.resetStickyScenarioCards();
        });
    }

    if (scenarioComparisonBtn) {
        scenarioComparisonBtn.addEventListener('click', function() {
            state.setCurrentPhase('scenarioComparison');
            setActivePhase(scenarioComparisonBtn);
            showSingleSection(scenarioComparisonSection);
            // Recalculate all scenarios to ensure data is up to date
            if (window.recalculateAll) {
            window.recalculateAll();
        }
            // Reload profiles when scenario comparison section is shown
            loadComparisonProfiles();
            updateScenarioCheckboxVisibility();
            if (window.resetStickyScenarioCards) window.resetStickyScenarioCards();
            // Trigger initial scroll check after a short delay to allow section to render
            setTimeout(() => {
                if (window.scrollY > 0) {
                    window.scrollBy(0, 1);
                    window.scrollBy(0, -1);
                }
            }, 100);
        });
    }

    function setActivePhase(activeBtn) {
        [budgetBtn, taxCalculatorBtn, accumulationBtn, withdrawalBtn, scenarioComparisonBtn].forEach(btn => {
            if (btn) {
                btn.classList.remove('active');
            }
        });
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }

    function showSingleSection(sectionToShow) {
        allSections.forEach(section => {
            if (section) {
                section.style.display = 'none';
            }
        });
        if (sectionToShow) {
            sectionToShow.style.display = 'block';
        }
    }

    function showAccumulationSections() {
        allSections.forEach(section => {
            if (section) {
                section.style.display = 'none';
            }
        });
        if (accumulationSection) {
            accumulationSection.style.display = 'grid';
        }
        if (accumulationChart) {
            accumulationChart.style.display = 'block';
        }
    }
}

/**
 * Setup German number input formatting
 */
export function setupGermanNumberInputs() {
    // Handle all number inputs and text inputs in budget section to support German formatting
    const numberInputs = document.querySelectorAll('input[type="number"], input[type="text"]');
    
    numberInputs.forEach(input => {
        // Skip profile-related inputs and scenario name inputs (they should not be treated as numbers)
        if (input.id === 'profileName' || 
            input.id === 'profileDescription' || 
            input.id === 'ansparphaseScenarioName' || 
            input.id === 'ansparphaseScenarioDescription' ||
            input.id === 'entnahmephaseScenarioName' ||
            input.id === 'entnahmephaseScenarioDescription') {
            return;
        }
        
        // Format display when losing focus
        input.addEventListener('blur', function() {
            const value = parseGermanNumber(this.value);
            if (value !== 0 || this.value !== '') {
                // Only format if there's a value or if it's not empty
                if (this.id === 'monthlySavings' || this.id === 'initialCapital' || this.id === 'retirementCapital') {
                    // No decimals for currency inputs
                    this.value = value.toString().replace('.', ',');
                } else {
                    // Keep decimals for percentage inputs
                    this.value = value.toString().replace('.', ',');
                }
            }
        });

        // Allow comma input
        input.addEventListener('keypress', function(e) {
            // Allow comma as decimal separator
            if (e.key === ',') {
                // Prevent multiple commas
                if (this.value.includes(',')) {
                    e.preventDefault();
                }
            }
        });

        // Convert comma to dot for internal processing but display with comma
        input.addEventListener('input', function() {
            // Store cursor position
            const cursorPos = this.selectionStart;
            
            // Allow commas in the display
            let value = this.value;
            
            // Update the associated calculation immediately
            if (this.closest('.budget-section')) {
                calculateBudget();
            } else if (this.closest('.controls-section')) {
                if (window.recalculateAll) {
            window.recalculateAll();
        }
            } else if (this.closest('.withdrawal-section')) {
                calculateWithdrawal();
            }
            
            // Restore cursor position
            this.setSelectionRange(cursorPos, cursorPos);
        });
    });
}

/**
 * Setup savings mode functionality (Multi-phase vs Simple)
 */
export function setupSavingsModeFunctionality() {
    // Initialize savings mode functionality for all scenarios
    state.scenarios.forEach(scenario => {
        setupSavingsModeForScenario(scenario.id);
    });
}

/**
 * Setup sticky scenario cards behavior - DISABLED
 * Static cards with no movement or scrolling behavior
 */
export function setupStickyScenarioCards() {
    const scenarioResults = document.getElementById('scenarioResults');
    if (!scenarioResults) return;
    
    // Ensure no sticky positioning or transformations are applied
    function resetStickyState() {
        scenarioResults.style.transform = '';
        scenarioResults.style.position = '';
        scenarioResults.style.top = '';
        scenarioResults.style.left = '';
        scenarioResults.style.width = '';
        scenarioResults.style.maxWidth = '';
        scenarioResults.style.zIndex = '';
        scenarioResults.classList.remove('sticky-active', 'sticky');
    }
    
    // Initial cleanup
    resetStickyState();
    
    // Global reset function (for compatibility with existing code)
    window.resetStickyScenarioCards = function() {
        resetStickyState();
    };
}

// ===================================
// HELPER FUNCTIONS
// ===================================

/**
 * Setup scenario tabs functionality
 */
function setupScenarioTabs() {
    // Add scenario button
    document.getElementById('addScenarioBtn').addEventListener('click', addNewScenario);
    
    // Scenario tab switching
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('scenario-tab')) {
            const scenarioId = e.target.dataset.scenario;
            switchToScenario(scenarioId);
        }
    });
}

/**
 * Setup scenario management listeners
 */
function setupScenarioManagementListeners() {
    // Load Preset Button
    const loadPresetBtn = document.getElementById('loadPresetBtn');
    if (loadPresetBtn) {
        loadPresetBtn.addEventListener('click', togglePresetTemplates);
    }
    
    // Save Configuration Button
    const saveConfigBtn = document.getElementById('saveConfigBtn');
    if (saveConfigBtn) {
        saveConfigBtn.addEventListener('click', saveScenarioConfiguration);
    }
    
    // Export Comparison Button
    const exportComparisonBtn = document.getElementById('exportComparisonBtn');
    if (exportComparisonBtn) {
        exportComparisonBtn.addEventListener('click', exportComparisonData);
    }
    
    // Preset template buttons
    document.addEventListener('click', function(e) {
        if (e.target.closest('.preset-btn')) {
            const presetBtn = e.target.closest('.preset-btn');
            const presetType = presetBtn.dataset.preset;
            loadPresetTemplate(presetType);
        }
    });
}

/**
 * Initialize scenario slider values
 * @param {string} scenarioId - The ID of the scenario
 */
function initializeScenarioSliderValues(scenarioId) {
    const sliders = ['annualReturn', 'inflationRate', 'salaryGrowth', 'duration', 'salaryToSavings'];
    sliders.forEach(sliderId => {
        updateScenarioSliderValue(sliderId, scenarioId);
    });
}

/**
 * Setup comparison scenario tabs
 */
function setupComparisonScenarioTabs() {
    // Comparison scenario tab switching
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('scenario-tab') && e.target.closest('#comparisonScenarioTabs')) {
            const scenarioId = e.target.dataset.scenario;
            switchToComparisonScenario(scenarioId);
        }
    });
}

/**
 * Setup comparison profile selection
 */
function setupComparisonProfileSelection() {
    // Load available profiles for all existing dropdowns
    loadComparisonProfiles();
    
    // Setup event listeners for all profile selectors using event delegation
    document.addEventListener('change', function(e) {
        if (e.target.classList.contains('profile-selector')) {
            const scenarioId = e.target.getAttribute('data-scenario');
            const profileName = e.target.value;
            
            if (profileName && scenarioId) {
                loadComparisonProfile(profileName, scenarioId);
            }
        }
    });
}

/**
 * Setup scenario selector listeners
 */
function setupScenarioSelectorListeners() {
    // Set up the contributions scenario dropdown listener
    const contributionsDropdown = document.getElementById('contributionsScenarioDropdown');
    if (contributionsDropdown) {
        contributionsDropdown.addEventListener('change', function() {
            state.setSelectedContributionsScenario(this.value);
            updateContributionsGainsChart();
        });
    }
    
    // Individual scenario checkbox functionality is handled in updateScenarioCheckboxes()
}

/**
 * Setup period toggle functionality
 * @param {string} toggleId - The ID of the toggle element
 * @param {string} category - The category of the toggle
 */
function setupPeriodToggle(toggleId, category) {
    const toggle = document.getElementById(toggleId);
    const buttons = toggle.querySelectorAll('.period-option');
    
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons in this toggle
            buttons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Update the period for this category
            const period = this.dataset.period;
            updatePeriod(category, period);
        });
    });
}

/**
 * Setup savings mode for a specific scenario
 * @param {string} scenarioId - The ID of the scenario
 */
function setupSavingsModeForScenario(scenarioId) {
    // Set up savings mode toggle buttons
    const savingsModeButtons = document.querySelectorAll(`.savings-mode-btn[data-scenario="${scenarioId}"]`);
    savingsModeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const mode = this.dataset.mode;
            switchSavingsMode(scenarioId, mode);
        });
    });

    // Set up phase toggle buttons for enabling/disabling phases 2 and 3
    const phaseToggleButtons = document.querySelectorAll(`.phase-toggle-btn[data-scenario="${scenarioId}"]`);
    phaseToggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const phase = parseInt(this.dataset.phase);
            togglePhase(scenarioId, phase);
        });
    });

    // Set up phase input listeners
    setupPhaseInputListeners(scenarioId);
    
    // Initialize phase summaries
    updatePhaseSummaries(scenarioId);
    updateMultiPhaseSummary(scenarioId);
}

/**
 * Setup phase input listeners for a specific scenario
 * @param {string} scenarioId - The ID of the scenario
 */
function setupPhaseInputListeners(scenarioId) {
    // Set up listeners for all phase inputs
    for (let phase = 1; phase <= 3; phase++) {
        const startYearInput = document.querySelector(`.phase-start-year[data-phase="${phase}"][data-scenario="${scenarioId}"]`);
        const endYearInput = document.querySelector(`.phase-end-year[data-phase="${phase}"][data-scenario="${scenarioId}"]`);
        const savingsRateInput = document.querySelector(`.phase-savings-rate[data-phase="${phase}"][data-scenario="${scenarioId}"]`);
        
        if (startYearInput) {
            startYearInput.addEventListener('input', () => {
                updatePhaseSummaries(scenarioId);
                updateMultiPhaseSummary(scenarioId);
                generatePhaseTimeline(scenarioId);
                if (window.debouncedRecalculateAll) {
                    window.debouncedRecalculateAll();
                }
            });
        }
        
        if (endYearInput) {
            endYearInput.addEventListener('input', () => {
                updatePhaseSummaries(scenarioId);
                updateMultiPhaseSummary(scenarioId);
                generatePhaseTimeline(scenarioId);
                if (window.debouncedRecalculateAll) {
                    window.debouncedRecalculateAll();
                }
            });
        }
        
        if (savingsRateInput) {
            savingsRateInput.addEventListener('input', () => {
                updatePhaseSummaries(scenarioId);
                updateMultiPhaseSummary(scenarioId);
                if (window.debouncedRecalculateAll) {
                    window.debouncedRecalculateAll();
                }
            });
        }
    }
}

/**
 * Setup comparison chart view toggle
 */
function setupComparisonChartViewToggle() {
    const chartViewButtons = document.querySelectorAll('.chart-view-btn');
    const chartViews = document.querySelectorAll('.comparison-chart-view');

    chartViewButtons.forEach(button => {
        button.addEventListener('click', function() {
            const viewType = this.dataset.view;
            
            // Update button states
            chartViewButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Show/hide chart views
            chartViews.forEach(view => {
                view.style.display = view.id === `${viewType}ChartView` ? 'block' : 'none';
            });
            
            // Update chart based on view type
            if (viewType === 'comparison') {
                if (window.updateMainChart) {
                    window.updateMainChart();
                }
            } else if (viewType === 'timeline') {
                if (window.updateMainChart) {
                    window.updateMainChart();
                }
            }
        });
    });
}

/**
 * Setup scenario visibility controls
 */
function setupScenarioVisibilityControls() {
    updateScenarioVisibilityControls();
}

/**
 * Update scenario visibility controls dynamically
 */
function updateScenarioVisibilityControls() {
    const controlsContainer = document.getElementById('scenarioVisibilityControls');
    if (!controlsContainer) return;
    
    // Clear existing controls
    controlsContainer.innerHTML = '';
    
    // Add controls for each scenario
    state.scenarios.forEach(scenario => {
        const control = document.createElement('div');
        control.className = 'visibility-control';
        control.innerHTML = `
            <label>
                <input type="checkbox" checked data-scenario="${scenario.id}">
                <span>${scenario.name}</span>
            </label>
        `;
        controlsContainer.appendChild(control);
    });
    
    // Add event listeners
    controlsContainer.addEventListener('change', function(e) {
        if (e.target.type === 'checkbox') {
            const scenarioId = e.target.dataset.scenario;
            const isVisible = e.target.checked;
            toggleScenarioVisibility(scenarioId, isVisible);
        }
    });
}

/**
 * Setup parameter comparison table
 */
function setupParameterComparisonTable() {
    const tableControls = document.querySelectorAll('.table-control-btn');
    
    tableControls.forEach(btn => {
        btn.addEventListener('click', function() {
            // Update active button
            tableControls.forEach(control => control.classList.remove('active'));
            this.classList.add('active');
            
            // Update table view
            const viewType = this.dataset.view;
            updateParameterTable(viewType);
        });
    });
}

/**
 * Setup scenario import functionality
 */
export function setupScenarioImport() {
    // Setup event listeners for import functionality
    document.addEventListener('click', function(e) {
        // Handle scenario-specific import buttons
        if (e.target.classList.contains('scenario-import-btn')) {
            const scenarioId = e.target.getAttribute('data-scenario');
            if (scenarioId && window.handleScenarioImport) {
                window.handleScenarioImport(scenarioId);
            }
        }
        
        // Handle scenario-specific refresh buttons
        if (e.target.classList.contains('scenario-refresh-btn')) {
            if (window.loadScenarioImports) window.loadScenarioImports();
            const scenarioId = e.target.getAttribute('data-scenario');
            if (scenarioId && window.showScenarioImportStatusForScenario) {
                window.showScenarioImportStatusForScenario(scenarioId, 'info', 'Verfügbare Szenarien wurden neu geladen.');
            }
        }
        
        if (e.target.classList.contains('delete-scenario-import-btn')) {
            const storageKey = e.target.dataset.storageKey;
            if (window.deleteAnsparphaseScenarioSet) {
                window.deleteAnsparphaseScenarioSet(storageKey);
            }
        }
    });
    
    // Setup dropdown change listener for scenario-specific dropdowns
    document.addEventListener('change', function(e) {
        if (e.target.classList.contains('scenario-import-dropdown')) {
            const scenarioId = e.target.getAttribute('data-scenario');
            if (scenarioId) {
                const importBtn = document.querySelector(`.scenario-import-btn[data-scenario="${scenarioId}"]`);
                if (importBtn) {
                    importBtn.disabled = !e.target.value;
                }
            }
        }
    });
    
    // Load available scenarios into dropdowns on initial setup
    setTimeout(() => {
        if (window.loadScenarioImports) {
            window.loadScenarioImports();
        }
    }, 100);
}

/**
 * Setup auto-save functionality
 */
export function setupAutoSaveScenarios() {
    // Auto-save when switching away from accumulation phase
    const phaseButtons = document.querySelectorAll('.phase-button');
    phaseButtons.forEach(button => {
        if (button.id !== 'accumulationPhase') {
            button.addEventListener('click', () => {
                setTimeout(() => {
                    if (window.autoSaveAnsparphaseScenarios) {
                        window.autoSaveAnsparphaseScenarios();
                    }
                }, 100);
            });
        }
    });
    
    // Also save when page unloads
    window.addEventListener('beforeunload', () => {
        if (window.autoSaveAnsparphaseScenarios) {
            window.autoSaveAnsparphaseScenarios();
        }
    });
}

/**
 * Setup profile integration for Ansparphase
 */
export function setupAnsparphaseProfileIntegration() {
    // Add profile import functionality to Ansparphase scenario management
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('import-budget-profile-btn')) {
            importBudgetProfileToAnsparphase();
        }
    });
}

/**
 * Import budget profile data to current Ansparphase scenario
 */
function importBudgetProfileToAnsparphase() {
    // Get current budget data (if available)
    const budgetData = window.budgetData;
    if (!budgetData || !budgetData.finalSavingsAmount) {
        showNotification('❌ Keine Budget-Daten', 'Bitte berechnen Sie zuerst Ihr Budget in der Budgetplanung.', 'error');
        return;
    }
    
    const activeScenarioId = state.activeScenario || 'A';
    const monthlySavingsInput = document.getElementById(`monthlySavings_${activeScenarioId}`);
    
    if (monthlySavingsInput) {
        // Use the final savings amount from budget calculation
        monthlySavingsInput.value = formatGermanNumber(budgetData.finalSavingsAmount, 0);
        
        // Trigger recalculation
        if (window.recalculateAll) {
            window.recalculateAll();
        }
        
        showNotification(
            '✅ Budget importiert', 
            `Sparrate von €${formatGermanNumber(budgetData.finalSavingsAmount, 0)} wurde in Szenario ${activeScenarioId} übertragen.`, 
            'success'
        );
    }
}

/**
 * Setup Ansparphase scenario listeners
 */
export function setupAnsparphaseScenarioListeners() {
    // Save scenario modal
    const saveBtn = document.getElementById('saveAnsparphaseScenario');
    if (saveBtn) saveBtn.addEventListener('click', openSaveAnsparphaseScenarioModal);
    
    const closeSaveBtn = document.getElementById('closeSaveAnsparphaseScenarioModal');
    if (closeSaveBtn) closeSaveBtn.addEventListener('click', closeSaveAnsparphaseScenarioModal);
    
    const cancelSaveBtn = document.getElementById('cancelSaveAnsparphaseScenario');
    if (cancelSaveBtn) cancelSaveBtn.addEventListener('click', closeSaveAnsparphaseScenarioModal);
    
    const confirmSaveBtn = document.getElementById('confirmSaveAnsparphaseScenario');
    if (confirmSaveBtn) confirmSaveBtn.addEventListener('click', confirmSaveAnsparphaseScenario);
    
    const scenarioNameInput = document.getElementById('ansparphaseScenarioName');
    if (scenarioNameInput) scenarioNameInput.addEventListener('input', updateAnsparphaseScenarioPreview);
    
    const scenarioDescInput = document.getElementById('ansparphaseScenarioDescription');
    if (scenarioDescInput) scenarioDescInput.addEventListener('input', updateAnsparphaseScenarioPreview);

    // Load scenario functionality removed - now only available in "Szenarien verwalten"

    // Manage scenarios modal
    const manageBtn = document.getElementById('manageAnsparphaseScenarios');
    if (manageBtn) manageBtn.addEventListener('click', openManageAnsparphaseScenarioModal);
    
    const closeManageBtn = document.getElementById('closeManageAnsparphaseScenarioModal');
    if (closeManageBtn) closeManageBtn.addEventListener('click', closeManageAnsparphaseScenarioModal);

    // Reset scenarios
    const resetBtn = document.getElementById('resetAnsparphaseScenario');
    if (resetBtn) resetBtn.addEventListener('click', resetAnsparphaseScenarios);

    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        const saveModal = document.getElementById('saveAnsparphaseScenarioModal');
        const manageModal = document.getElementById('manageAnsparphaseScenarioModal');
        
        if (event.target === saveModal) {
            closeSaveAnsparphaseScenarioModal();
        }
        if (event.target === manageModal) {
            closeManageAnsparphaseScenarioModal();
        }
    });
}

/**
 * Setup Entnahmephase scenario listeners
 */
export function setupEntnahmephaseScenarioListeners() {
    // Save scenario modal
    const saveBtn = document.getElementById('saveEntnahmephaseScenario');
    if (saveBtn) saveBtn.addEventListener('click', openSaveEntnahmephaseScenarioModal);
    
    const closeSaveBtn = document.getElementById('closeSaveEntnahmephaseScenarioModal');
    if (closeSaveBtn) closeSaveBtn.addEventListener('click', closeSaveEntnahmephaseScenarioModal);
    
    const cancelSaveBtn = document.getElementById('cancelSaveEntnahmephaseScenario');
    if (cancelSaveBtn) cancelSaveBtn.addEventListener('click', closeSaveEntnahmephaseScenarioModal);
    
    const confirmSaveBtn = document.getElementById('confirmSaveEntnahmephaseScenario');
    if (confirmSaveBtn) confirmSaveBtn.addEventListener('click', confirmSaveEntnahmephaseScenario);
    
    const scenarioNameInput = document.getElementById('entnahmephaseScenarioName');
    if (scenarioNameInput) scenarioNameInput.addEventListener('input', updateEntnahmephaseScenarioPreview);
    
    const scenarioDescInput = document.getElementById('entnahmephaseScenarioDescription');
    if (scenarioDescInput) scenarioDescInput.addEventListener('input', updateEntnahmephaseScenarioPreview);

    // Load scenario functionality removed - now only available in "Szenarien verwalten"

    // Manage scenarios modal
    const manageBtn = document.getElementById('manageEntnahmephaseScenarios');
    if (manageBtn) manageBtn.addEventListener('click', openManageEntnahmephaseScenarioModal);
    
    const closeManageBtn = document.getElementById('closeManageEntnahmephaseScenarioModal');
    if (closeManageBtn) closeManageBtn.addEventListener('click', closeManageEntnahmephaseScenarioModal);

    // Reset scenarios
    const resetBtn = document.getElementById('resetEntnahmephaseScenario');
    if (resetBtn) resetBtn.addEventListener('click', resetEntnahmephaseScenarios);

    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        const saveModal = document.getElementById('saveEntnahmephaseScenarioModal');
        const manageModal = document.getElementById('manageEntnahmephaseScenarioModal');
        
        if (event.target === saveModal) {
            closeSaveEntnahmephaseScenarioModal();
        }
        if (event.target === manageModal) {
            closeManageEntnahmephaseScenarioModal();
        }
    });
}

// ===================================
// ANSPARPHASE SCENARIO MANAGEMENT FUNCTIONS
// ===================================

// Global variable to store selected scenarios for loading
let selectedScenariosForLoading = [];

/**
 * Open save Ansparphase scenario modal
 */
function openSaveAnsparphaseScenarioModal() {
    const modal = document.getElementById('saveAnsparphaseScenarioModal');
    if (modal) {
        modal.style.display = 'block';
        
        const nameInput = document.getElementById('ansparphaseScenarioName');
        const descInput = document.getElementById('ansparphaseScenarioDescription');
        
        // Clear fields
        if (nameInput) nameInput.value = '';
        if (descInput) descInput.value = '';
        
        // Clear again after a short delay to override any browser auto-fill
        setTimeout(() => {
            if (nameInput) {
                nameInput.value = '';
                nameInput.focus();
            }
            if (descInput) descInput.value = '';
            updateAnsparphaseScenarioPreview();
        }, 50);
        
        // Clear one more time for persistent auto-fill
        setTimeout(() => {
            if (nameInput && (nameInput.value === '0' || nameInput.value.trim() === '0')) {
                nameInput.value = '';
                updateAnsparphaseScenarioPreview();
            }
        }, 200);
    }
}

/**
 * Close save Ansparphase scenario modal
 */
function closeSaveAnsparphaseScenarioModal() {
    const modal = document.getElementById('saveAnsparphaseScenarioModal');
    if (modal) {
        modal.style.display = 'none';
        const nameInput = document.getElementById('ansparphaseScenarioName');
        const descInput = document.getElementById('ansparphaseScenarioDescription');
        if (nameInput) nameInput.value = '';
        if (descInput) descInput.value = '';
    }
}

/**
 * Update Ansparphase scenario preview
 */
function updateAnsparphaseScenarioPreview() {
    const previewContainer = document.getElementById('ansparphaseScenarioPreview');
    if (!previewContainer) return;
    
    // Get current active scenario data
    const activeScenarioId = state.activeScenario || 'A';
    const activeScenario = state.scenarios.find(s => s.id === activeScenarioId);
    
    if (!activeScenario) {
        previewContainer.innerHTML = '<div>Kein aktives Szenario gefunden.</div>';
        return;
    }
    
    const monthlySavings = parseGermanNumber(document.getElementById(`monthlySavings_${activeScenarioId}`)?.value || '0');
    const initialCapital = parseGermanNumber(document.getElementById(`initialCapital_${activeScenarioId}`)?.value || '0');
    const annualReturn = parseFloat(document.getElementById(`annualReturn_${activeScenarioId}`)?.value || '0');
    const duration = parseInt(document.getElementById(`duration_${activeScenarioId}`)?.value || '0');
    
    // Determine savings mode
    const simpleContainer = document.querySelector(`.simple-savings-container[data-scenario="${activeScenarioId}"]`);
    const multiPhaseContainer = document.querySelector(`.multi-phase-savings-container[data-scenario="${activeScenarioId}"]`);
    const savingsMode = (multiPhaseContainer && multiPhaseContainer.style.display !== 'none') ? 'Mehrphasig' : 'Einfach';
    
    previewContainer.innerHTML = `
        <div class="preview-item">
            <span class="preview-label">📊 Aktives Szenario</span>
            <span class="preview-value">${activeScenario.name}</span>
        </div>
        <div class="preview-item">
            <span class="preview-label">💰 Monatliche Sparrate</span>
            <span class="preview-value">€${formatGermanNumber(monthlySavings, 0)}</span>
        </div>
        <div class="preview-item">
            <span class="preview-label">🏦 Startkapital</span>
            <span class="preview-value">€${formatGermanNumber(initialCapital, 0)}</span>
        </div>
        <div class="preview-item">
            <span class="preview-label">📈 Jährliche Rendite</span>
            <span class="preview-value">${annualReturn}%</span>
        </div>
        <div class="preview-item">
            <span class="preview-label">⏱️ Anlagedauer</span>
            <span class="preview-value">${duration} Jahre</span>
        </div>
        <div class="preview-item">
            <span class="preview-label">🎯 Sparmodus</span>
            <span class="preview-value">${savingsMode}</span>
        </div>
        <div class="preview-item">
            <span class="preview-label">📅 Erstellt</span>
            <span class="preview-value">${new Date().toLocaleDateString('de-DE')}</span>
        </div>
    `;
    
    // Enable/disable save button based on scenario name
    const saveBtn = document.getElementById('confirmSaveAnsparphaseScenario');
    const scenarioName = document.getElementById('ansparphaseScenarioName')?.value.trim();
    if (saveBtn) {
        saveBtn.disabled = !scenarioName || scenarioName.length === 0;
    }
}

/**
 * Confirm save Ansparphase scenario
 */
function confirmSaveAnsparphaseScenario() {
    const scenarioName = document.getElementById('ansparphaseScenarioName')?.value.trim();
    const scenarioDescription = document.getElementById('ansparphaseScenarioDescription')?.value.trim();
    
    if (!scenarioName) {
        showNotification('❌ Fehler', 'Bitte geben Sie einen Szenario-Namen ein.', 'error');
        return;
    }
    
    // Get current active scenario
    const activeScenarioId = state.activeScenario || 'A';
    const activeScenario = state.scenarios.find(s => s.id === activeScenarioId);
    
    if (!activeScenario) {
        showNotification('❌ Fehler', 'Kein aktives Szenario gefunden.', 'error');
        return;
    }
    
    // Check if scenario already exists
    const existingScenario = localStorage.getItem('ansparphaseScenario_' + scenarioName);
    if (existingScenario) {
        showNotification('⚠️ Szenario überschrieben', `Ein Szenario mit dem Namen "${scenarioName}" wurde überschrieben.`, 'warning');
    }
    
    // Get savings mode
    const simpleContainer = document.querySelector(`.simple-savings-container[data-scenario="${activeScenarioId}"]`);
    const multiPhaseContainer = document.querySelector(`.multi-phase-savings-container[data-scenario="${activeScenarioId}"]`);
    const savingsMode = (multiPhaseContainer && multiPhaseContainer.style.display !== 'none') ? 'multi-phase' : 'simple';
    
    // Get ETF type
    const etfTypeRadios = document.querySelectorAll(`input[name="etfType-${activeScenarioId}"]`);
    let etfType = 'thesaurierend'; // default
    etfTypeRadios.forEach(radio => {
        if (radio.checked) {
            etfType = radio.value;
        }
    });
    
    // Get multi-phase data if applicable
    let multiPhaseData = null;
    if (savingsMode === 'multi-phase') {
        multiPhaseData = getMultiPhaseDataForScenario(activeScenarioId);
    }
    
    // Save scenario data
    const scenarioData = {
        name: scenarioName,
        description: scenarioDescription,
        createdAt: new Date().toISOString(),
        type: 'single',
        scenario: {
            id: activeScenario.id,
            name: scenarioName,
            color: activeScenario.color,
            parameters: {
                monthlySavings: parseGermanNumber(document.getElementById(`monthlySavings_${activeScenarioId}`)?.value || '0'),
                initialCapital: parseGermanNumber(document.getElementById(`initialCapital_${activeScenarioId}`)?.value || '0'),
                annualReturn: parseFloat(document.getElementById(`annualReturn_${activeScenarioId}`)?.value || '7'),
                inflationRate: parseFloat(document.getElementById(`inflationRate_${activeScenarioId}`)?.value || '2'),
                salaryGrowth: parseFloat(document.getElementById(`salaryGrowth_${activeScenarioId}`)?.value || '3'),
                duration: parseInt(document.getElementById(`duration_${activeScenarioId}`)?.value || '25'),
                baseSalary: parseGermanNumber(document.getElementById(`baseSalary_${activeScenarioId}`)?.value || '60000'),
                salaryToSavings: parseFloat(document.getElementById(`salaryToSavings_${activeScenarioId}`)?.value || '50'),
                includeTax: document.getElementById(`taxToggle_${activeScenarioId}`)?.classList.contains('active') || false,
                teilfreistellung: document.getElementById(`teilfreistellungToggle_${activeScenarioId}`)?.classList.contains('active') || false,
                etfType: etfType,
                savingsMode: savingsMode,
                multiPhaseData: multiPhaseData
            },
            results: activeScenario.results || {}
        }
    };
    
    localStorage.setItem('ansparphaseScenario_' + scenarioName, JSON.stringify(scenarioData));
    closeSaveAnsparphaseScenarioModal();
    
    showNotification('✅ Szenario erfolgreich gespeichert!', `Das Ansparphase-Szenario "${scenarioName}" wurde erfolgreich gespeichert.`, 'success');
}

/**
 * Open load Ansparphase scenario modal
 */
function openLoadAnsparphaseScenarioModal() {
    const modal = document.getElementById('loadAnsparphaseScenarioModal');
    if (modal) {
        modal.style.display = 'block';
        loadAnsparphaseScenarioList();
    }
}

/**
 * Close load Ansparphase scenario modal
 */
function closeLoadAnsparphaseScenarioModal() {
    const modal = document.getElementById('loadAnsparphaseScenarioModal');
    if (modal) {
        modal.style.display = 'none';
        // Reset selection
        selectedScenariosForLoading = [];
        const confirmBtn = document.getElementById('confirmLoadAnsparphaseScenario');
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Szenarien laden';
        }
        // Remove selected class from all items
        document.querySelectorAll('#loadAnsparphaseScenarioList .load-profile-item').forEach(item => {
            item.classList.remove('selected');
        });
    }
}

/**
 * Load Ansparphase scenario list
 */
function loadAnsparphaseScenarioList() {
    const scenarioList = document.getElementById('loadAnsparphaseScenarioList');
    if (!scenarioList) return;
    
    const scenarios = [];
    
    // Get all saved scenarios
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('ansparphaseScenario_')) {
            try {
                const scenarioData = JSON.parse(localStorage.getItem(key));
                scenarios.push({
                    key: key,
                    name: key.replace('ansparphaseScenario_', ''),
                    data: scenarioData
                });
            } catch (e) {
                console.warn(`Invalid JSON in localStorage key: ${key}`, e);
            }
        }
    }
    
    if (scenarios.length === 0) {
        scenarioList.innerHTML = `
            <div class="no-profiles">
                <div class="no-profiles-icon">📂</div>
                <h4>Keine Szenarien gefunden</h4>
                <p>Erstellen Sie Ihr erstes Szenario mit "Szenario speichern".</p>
            </div>
        `;
        return;
    }
    
    // Sort scenarios by creation date (newest first)
    scenarios.sort((a, b) => {
        const dateA = new Date(a.data.createdAt || 0);
        const dateB = new Date(b.data.createdAt || 0);
        return dateB - dateA;
    });
    
    scenarioList.innerHTML = scenarios.map(scenario => {
        const createdDate = scenario.data.createdAt ? 
            new Date(scenario.data.createdAt).toLocaleDateString('de-DE') : 
            'Unbekannt';
        
        // Handle both old format (scenario sets) and new format (single scenarios)
        let monthlySavings = 0;
        let duration = 0;
        let annualReturn = 0;
        let scenarioCount = 0;
        
        if (scenario.data.type === 'single' && scenario.data.scenario) {
            // New format: single scenario
            const singleScenario = scenario.data.scenario;
            monthlySavings = singleScenario.parameters?.monthlySavings || 0;
            duration = singleScenario.parameters?.duration || 0;
            annualReturn = singleScenario.parameters?.annualReturn || 0;
            scenarioCount = 1;
        } else if (scenario.data.scenarios) {
            // Old format: scenario set
            const firstScenario = scenario.data.scenarios[0];
            monthlySavings = firstScenario?.parameters?.monthlySavings || 0;
            duration = firstScenario?.parameters?.duration || 0;
            annualReturn = firstScenario?.parameters?.annualReturn || 0;
            scenarioCount = scenario.data.scenarios.length;
        }
        
        return `
            <div class="load-profile-item" onclick="selectAnsparphaseScenarioForLoad('${escapeHtml(scenario.data.name || scenario.name)}')">
                <div class="profile-info">
                    <div class="profile-name">${escapeHtml(scenario.data.name || scenario.name)}</div>
                    <div class="profile-details">
                        ${scenario.data.description ? `<div style="margin-bottom: 5px; color: #34495e;">${escapeHtml(scenario.data.description)}</div>` : ''}
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.8rem;">
                            <span>💰 Sparrate: €${formatGermanNumber(monthlySavings, 0)}</span>
                            <span>⏱️ Dauer: ${duration} Jahre</span>
                            <span>📈 Rendite: ${annualReturn}%</span>
                            <span>📅 Erstellt: ${createdDate}</span>
                            <span style="grid-column: 1 / -1; color: #7f8c8d; font-size: 0.75rem;">
                                ${scenario.data.type === 'single' ? '📄 Einzelszenario' : `📊 Szenario-Set (${scenarioCount} Szenarien)`}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Select Ansparphase scenario for loading
 */
function selectAnsparphaseScenarioForLoad(scenarioName) {
    // Toggle selection on clicked item
    const clickedItem = event.target.closest('.load-profile-item');
    
    if (!clickedItem) return;
    
    if (clickedItem.classList.contains('selected')) {
        // Deselect if already selected
        clickedItem.classList.remove('selected');
        
        // Remove from selected scenarios
        const index = selectedScenariosForLoading.indexOf(scenarioName);
        if (index > -1) {
            selectedScenariosForLoading.splice(index, 1);
        }
    } else {
        // Select if not selected
        clickedItem.classList.add('selected');
        
        // Add to selected scenarios
        if (!selectedScenariosForLoading.includes(scenarioName)) {
            selectedScenariosForLoading.push(scenarioName);
        }
    }
    
    // Update the confirmation button state
    const confirmBtn = document.getElementById('confirmLoadAnsparphaseScenario');
    if (confirmBtn) {
        confirmBtn.disabled = selectedScenariosForLoading.length === 0;
        
        // Update button text to show count
        if (selectedScenariosForLoading.length === 0) {
            confirmBtn.textContent = 'Szenarien laden';
        } else if (selectedScenariosForLoading.length === 1) {
            confirmBtn.textContent = '1 Szenario laden';
        } else {
            confirmBtn.textContent = `${selectedScenariosForLoading.length} Szenarien laden`;
        }
    }
}

/**
 * Confirm loading of selected scenarios
 */
function confirmLoadAnsparphaseScenario() {
    if (selectedScenariosForLoading.length > 0) {
        selectedScenariosForLoading.forEach(scenarioName => {
            loadSelectedAnsparphaseScenario(scenarioName);
        });
        selectedScenariosForLoading = [];
        const confirmBtn = document.getElementById('confirmLoadAnsparphaseScenario');
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Szenarien laden';
        }
        closeLoadAnsparphaseScenarioModal();
    }
}

/**
 * Load selected Ansparphase scenario
 */
function loadSelectedAnsparphaseScenario(scenarioName) {
    // Find the correct localStorage key for this scenario name
    let scenarioData = null;
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('ansparphaseScenario_')) {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                if (data && data.name === scenarioName) {
                    scenarioData = data;
                    break;
                }
            } catch (e) {
                console.warn(`Invalid JSON in localStorage key: ${key}`, e);
            }
        }
    }
    
    if (!scenarioData) {
        showNotification('❌ Fehler beim Laden', 'Szenario konnte nicht geladen werden.', 'error');
        return;
    }
    
    // Handle both old format (scenario sets) and new format (single scenarios)
    let selectedScenarios = [];
    
    if (scenarioData.type === 'single' && scenarioData.scenario) {
        // New format: single scenario
        selectedScenarios = [scenarioData.scenario];
    } else if (scenarioData.scenarios) {
        // Old format: scenario set - load all scenarios
        selectedScenarios = scenarioData.scenarios;
    } else {
        showNotification('❌ Fehler', 'Ungültiges Szenario-Format.', 'error');
        return;
    }
    
    // Load the first scenario into the current active scenario
    if (selectedScenarios.length > 0) {
        const scenarioToLoad = selectedScenarios[0];
        const activeScenarioId = state.activeScenario || 'A';
        
        loadScenarioParametersIntoScenario(scenarioToLoad, activeScenarioId);
        
        // Recalculate with new values
        if (window.recalculateAll) {
            window.recalculateAll();
        }
        
        showNotification('✅ Szenario geladen!', `Das Ansparphase-Szenario "${scenarioName}" wurde in Szenario ${activeScenarioId} geladen.`, 'success');
    }
}

/**
 * Open manage Ansparphase scenarios modal
 */
function openManageAnsparphaseScenarioModal() {
    const modal = document.getElementById('manageAnsparphaseScenarioModal');
    if (modal) {
        modal.style.display = 'block';
        loadManageAnsparphaseScenarioList();
    }
}

/**
 * Close manage Ansparphase scenarios modal
 */
function closeManageAnsparphaseScenarioModal() {
    const modal = document.getElementById('manageAnsparphaseScenarioModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Load manage Ansparphase scenario list
 */
function loadManageAnsparphaseScenarioList() {
    const scenarioList = document.getElementById('manageAnsparphaseScenarioList');
    if (!scenarioList) return;
    
    const scenarios = [];
    
    // Get all saved scenarios
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('ansparphaseScenario_')) {
            try {
                const scenarioName = key.replace('ansparphaseScenario_', '');
                const scenarioData = JSON.parse(localStorage.getItem(key));
                scenarios.push({ name: scenarioName, data: scenarioData });
            } catch (e) {
                console.warn(`Invalid JSON in localStorage key: ${key}`, e);
            }
        }
    }
    
    if (scenarios.length === 0) {
        scenarioList.innerHTML = `
            <div class="no-profiles">
                <div class="no-profiles-icon">📁</div>
                <p>Keine gespeicherten Szenarien gefunden.</p>
                <p>Erstellen Sie Ihr erstes Szenario mit "Szenario speichern".</p>
            </div>
        `;
        return;
    }
    
    // Sort scenarios alphabetically
    scenarios.sort((a, b) => (a.data.name || a.name).localeCompare(b.data.name || b.name));
    
    scenarioList.innerHTML = scenarios.map(scenario => {
        // Get scenario parameters for display
        let monthlySavings = 0;
        let duration = 0;
        let annualReturn = 0;
        let scenarioType = 'Unbekannter Typ';
        
        if (scenario.data.type === 'single' && scenario.data.scenario) {
            const singleScenario = scenario.data.scenario;
            monthlySavings = singleScenario.parameters?.monthlySavings || 0;
            duration = singleScenario.parameters?.duration || 0;
            annualReturn = singleScenario.parameters?.annualReturn || 0;
            scenarioType = 'Einzelszenario';
        } else if (scenario.data.scenarios) {
            const firstScenario = scenario.data.scenarios[0];
            monthlySavings = firstScenario?.parameters?.monthlySavings || 0;
            duration = firstScenario?.parameters?.duration || 0;
            annualReturn = firstScenario?.parameters?.annualReturn || 0;
            scenarioType = `Szenario-Set (${scenario.data.scenarios.length} Szenarien)`;
        }
        
        return `
            <div class="profile-item">
                <div class="profile-info">
                    <div class="profile-name">${escapeHtml(scenario.data.name || scenario.name)}</div>
                    <div class="profile-details">
                        Sparrate: €${formatGermanNumber(monthlySavings, 0)} | 
                        Dauer: ${duration} Jahre | 
                        Rendite: ${annualReturn}%<br>
                        <span style="color: #7f8c8d; font-size: 0.85rem;">${scenarioType}</span>
                    </div>
                </div>
                <div class="profile-actions">
                    <button class="profile-action-btn profile-load-btn" onclick="loadAnsparphaseScenarioFromManager('${escapeHtml(scenario.data.name || scenario.name)}')">
                        📂 Laden
                    </button>
                    <button class="profile-action-btn profile-delete-btn" onclick="deleteAnsparphaseScenario('${escapeHtml(scenario.data.name || scenario.name)}')">
                        🗑️ Löschen
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Load Ansparphase scenario from manager
 */
function loadAnsparphaseScenarioFromManager(scenarioName) {
    loadSelectedAnsparphaseScenario(scenarioName);
    closeManageAnsparphaseScenarioModal();
}

/**
 * Delete Ansparphase scenario
 */
function deleteAnsparphaseScenario(scenarioName) {
    if (window.confirm(`❓ Szenario "${scenarioName}" wirklich löschen?\n\nDiese Aktion kann nicht rückgängig gemacht werden.`)) {
        // Find ALL localStorage keys that match this scenario name
        const keysToDelete = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('ansparphaseScenario_')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (data && data.name === scenarioName) {
                        keysToDelete.push(key);
                    }
                } catch (e) {
                    console.warn(`Invalid JSON in localStorage key: ${key}`, e);
                    // If the data is corrupted, also delete it
                    if (key.includes(scenarioName)) {
                        keysToDelete.push(key);
                    }
                }
            }
        }
        
        if (keysToDelete.length > 0) {
            // Delete all matching keys
            keysToDelete.forEach(key => {
                localStorage.removeItem(key);
                console.log(`Deleted localStorage key: ${key}`);
            });
            
            // Force refresh the lists after a delay
            setTimeout(() => {
                loadManageAnsparphaseScenarioList(); // Refresh the manage list
                // Also refresh the load list if it's open
                const loadModal = document.getElementById('loadAnsparphaseScenarioModal');
                if (loadModal && loadModal.style.display === 'block') {
                    loadAnsparphaseScenarioList();
                }
            }, 100);
            
            showNotification('🗑️ Szenario gelöscht!', `Das Ansparphase-Szenario "${scenarioName}" wurde gelöscht (${keysToDelete.length} Einträge entfernt).`, 'success');
        } else {
            showNotification('Fehler', 'Szenario konnte nicht gefunden werden.', 'error');
        }
    }
}

/**
 * Reset Ansparphase scenarios
 */
function resetAnsparphaseScenarios() {
    if (window.confirm('❓ Alle Ansparphase-Szenarien auf Standardwerte zurücksetzen?\n\nDiese Aktion kann nicht rückgängig gemacht werden.')) {
        // Reset all scenarios to default values
        state.scenarios.forEach(scenario => {
            const scenarioId = scenario.id;
            
            // Reset input values
            const fields = {
                [`monthlySavings_${scenarioId}`]: '500',
                [`initialCapital_${scenarioId}`]: '3000',
                [`annualReturn_${scenarioId}`]: '7',
                [`inflationRate_${scenarioId}`]: '2',
                [`salaryGrowth_${scenarioId}`]: '3',
                [`duration_${scenarioId}`]: '25',
                [`baseSalary_${scenarioId}`]: '60000',
                [`salaryToSavings_${scenarioId}`]: '50'
            };
            
            Object.entries(fields).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.value = value;
                }
            });
            
            // Update slider displays
            const sliderValues = {
                [`annualReturnValue_${scenarioId}`]: '7%',
                [`inflationRateValue_${scenarioId}`]: '2%',
                [`salaryGrowthValue_${scenarioId}`]: '3%',
                [`durationValue_${scenarioId}`]: '25 Jahre',
                [`salaryToSavingsValue_${scenarioId}`]: '50%'
            };
            
            Object.entries(sliderValues).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = value;
                }
            });
            
            // Reset toggles
            const taxToggle = document.getElementById(`taxToggle_${scenarioId}`);
            if (taxToggle) {
                taxToggle.classList.add('active');
            }
            
            const teilfreistellungToggle = document.getElementById(`teilfreistellungToggle_${scenarioId}`);
            if (teilfreistellungToggle) {
                teilfreistellungToggle.classList.add('active');
            }
            
            // Reset ETF type
            const etfTypeRadios = document.querySelectorAll(`input[name="etfType-${scenarioId}"]`);
            etfTypeRadios.forEach(radio => {
                radio.checked = radio.value === 'thesaurierend';
            });
            
            // Reset to simple savings mode
            const simpleContainer = document.querySelector(`.simple-savings-container[data-scenario="${scenarioId}"]`);
            const multiPhaseContainer = document.querySelector(`.multi-phase-savings-container[data-scenario="${scenarioId}"]`);
            
            if (simpleContainer) simpleContainer.style.display = 'block';
            if (multiPhaseContainer) multiPhaseContainer.style.display = 'none';
            
            // Update mode buttons
            const modeButtons = document.querySelectorAll(`.savings-mode-btn[data-scenario="${scenarioId}"]`);
            modeButtons.forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.mode === 'simple') {
                    btn.classList.add('active');
                }
            });
        });
        
        // Recalculate all scenarios
        if (window.recalculateAll) {
            window.recalculateAll();
        }
        
        showNotification('🔄 Szenarien zurückgesetzt!', 'Alle Ansparphase-Szenarien wurden auf Standardwerte zurückgesetzt.', 'success');
    }
}

// ===================================
// HELPER FUNCTIONS FOR ANSPARPHASE SCENARIOS
// ===================================

/**
 * Load scenario parameters into a specific scenario
 */
function loadScenarioParametersIntoScenario(scenarioData, targetScenarioId) {
    const params = scenarioData.parameters;
    if (!params) return;
    
    // Load basic parameters
    const fields = {
        [`monthlySavings_${targetScenarioId}`]: params.monthlySavings || 0,
        [`initialCapital_${targetScenarioId}`]: params.initialCapital || 0,
        [`annualReturn_${targetScenarioId}`]: params.annualReturn || 7,
        [`inflationRate_${targetScenarioId}`]: params.inflationRate || 2,
        [`salaryGrowth_${targetScenarioId}`]: params.salaryGrowth || 3,
        [`duration_${targetScenarioId}`]: params.duration || 25,
        [`baseSalary_${targetScenarioId}`]: params.baseSalary || 60000,
        [`salaryToSavings_${targetScenarioId}`]: params.salaryToSavings || 50
    };
    
    Object.entries(fields).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            if (id.includes('monthlySavings') || id.includes('initialCapital') || id.includes('baseSalary')) {
                element.value = formatGermanNumber(value, 0);
            } else {
                element.value = value;
            }
        }
    });
    
    // Update slider displays
    if (window.updateScenarioSliderValue) {
        const sliders = ['annualReturn', 'inflationRate', 'salaryGrowth', 'duration', 'salaryToSavings'];
        sliders.forEach(sliderId => {
            window.updateScenarioSliderValue(sliderId, targetScenarioId);
        });
    }
    
    // Load toggles
    const taxToggle = document.getElementById(`taxToggle_${targetScenarioId}`);
    if (taxToggle) {
        if (params.includeTax) {
            taxToggle.classList.add('active');
        } else {
            taxToggle.classList.remove('active');
        }
    }
    
    const teilfreistellungToggle = document.getElementById(`teilfreistellungToggle_${targetScenarioId}`);
    if (teilfreistellungToggle) {
        if (params.teilfreistellung) {
            teilfreistellungToggle.classList.add('active');
        } else {
            teilfreistellungToggle.classList.remove('active');
        }
    }
    
    // Load ETF type
    if (params.etfType) {
        const etfTypeRadios = document.querySelectorAll(`input[name="etfType-${targetScenarioId}"]`);
        etfTypeRadios.forEach(radio => {
            radio.checked = radio.value === params.etfType;
        });
    }
    
    // Load savings mode
    if (params.savingsMode) {
        const simpleContainer = document.querySelector(`.simple-savings-container[data-scenario="${targetScenarioId}"]`);
        const multiPhaseContainer = document.querySelector(`.multi-phase-savings-container[data-scenario="${targetScenarioId}"]`);
        
        if (params.savingsMode === 'multi-phase') {
            if (simpleContainer) simpleContainer.style.display = 'none';
            if (multiPhaseContainer) multiPhaseContainer.style.display = 'block';
        } else {
            if (simpleContainer) simpleContainer.style.display = 'block';
            if (multiPhaseContainer) multiPhaseContainer.style.display = 'none';
        }
        
        // Update mode buttons
        const modeButtons = document.querySelectorAll(`.savings-mode-btn[data-scenario="${targetScenarioId}"]`);
        modeButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.mode === params.savingsMode) {
                btn.classList.add('active');
            }
        });
    }
}

/**
 * Get multi-phase data for a scenario
 */
function getMultiPhaseDataForScenario(scenarioId) {
    const multiPhaseData = {
        phases: []
    };
    
    for (let phase = 1; phase <= 3; phase++) {
        const phaseElement = document.querySelector(`.savings-phase[data-phase="${phase}"][data-scenario="${scenarioId}"]`);
        if (phaseElement && phaseElement.classList.contains('active')) {
            const startYear = parseInt(phaseElement.querySelector('.phase-start-year')?.value || 0);
            const endYear = parseInt(phaseElement.querySelector('.phase-end-year')?.value || 0);
            const savingsRate = parseGermanNumber(phaseElement.querySelector('.phase-savings-rate')?.value || '0');
            
            multiPhaseData.phases.push({
                phase,
                startYear,
                endYear,
                savingsRate,
                active: true
            });
        }
    }
    
    return multiPhaseData.phases.length > 0 ? multiPhaseData : null;
}

/**
 * Escape HTML for safe display
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===================================
// SCENARIO MANAGEMENT FUNCTIONS
// ===================================

function togglePresetTemplates() {
    const presetTemplates = document.getElementById('presetTemplates');
    if (!presetTemplates) return;
    
    const isVisible = presetTemplates.style.display !== 'none';
    
    if (isVisible) {
        presetTemplates.style.display = 'none';
        showNotification('Vorlagen ausgeblendet', 'Die Vorlagen-Auswahl wurde geschlossen.', 'info');
    } else {
        presetTemplates.style.display = 'block';
        showNotification('Vorlagen verfügbar', 'Wählen Sie eine Vorlage aus der Liste unten.', 'success');
    }
}

function saveScenarioConfiguration() {
    showNotification('Speichern', 'Szenario-Konfiguration gespeichert.', 'success');
}

function exportComparisonData() {
    showNotification('Export', 'Vergleichsdaten werden exportiert.', 'info');
}

function loadPresetTemplate(presetType) {
    const presets = {
        optimistic: {
            name: 'Optimistisch',
            parameters: {
                annualReturn: 8.5,
                inflationRate: 2.0,
                monthlySavings: 800,
                salaryGrowth: 3.5,
                duration: 25,
                initialCapital: 10000,
                includeTax: true,
                teilfreistellung: true
            }
        },
        conservative: {
            name: 'Konservativ',
            parameters: {
                annualReturn: 5.5,
                inflationRate: 2.5,
                monthlySavings: 500,
                salaryGrowth: 2.0,
                duration: 30,
                initialCapital: 5000,
                includeTax: true,
                teilfreistellung: true
            }
        },
        realistic: {
            name: 'Realistisch',
            parameters: {
                annualReturn: 7.0,
                inflationRate: 2.2,
                monthlySavings: 650,
                salaryGrowth: 2.8,
                duration: 25,
                initialCapital: 8000,
                includeTax: true,
                teilfreistellung: true
            }
        }
    };
    
    const preset = presets[presetType];
    if (!preset) {
        showNotification('Fehler', 'Unbekannte Vorlage ausgewählt.', 'error');
        return;
    }
    
    // Apply preset to current active scenario
    if (window.applyPresetToScenario) {
        window.applyPresetToScenario(preset);
    }
    
    // Hide preset templates
    const presetTemplates = document.getElementById('presetTemplates');
    if (presetTemplates) {
        presetTemplates.style.display = 'none';
    }
    
    showNotification('Vorlage geladen', `Die Vorlage "${preset.name}" wurde erfolgreich geladen.`, 'success');
}

// Make functions available globally
window.togglePresetTemplates = togglePresetTemplates;
window.saveScenarioConfiguration = saveScenarioConfiguration;
window.exportComparisonData = exportComparisonData;
window.loadPresetTemplate = loadPresetTemplate;

function switchSavingsMode(scenarioId, mode) {
    const simpleContainer = document.querySelector(`.simple-savings-container[data-scenario="${scenarioId}"]`);
    const multiPhaseContainer = document.querySelector(`.multi-phase-savings-container[data-scenario="${scenarioId}"]`);
    const modeButtons = document.querySelectorAll(`.savings-mode-btn[data-scenario="${scenarioId}"]`);
    
    if (mode === 'simple') {
        if (simpleContainer) simpleContainer.style.display = 'block';
        if (multiPhaseContainer) multiPhaseContainer.style.display = 'none';
    } else if (mode === 'multi-phase') {
        if (simpleContainer) simpleContainer.style.display = 'none';
        if (multiPhaseContainer) multiPhaseContainer.style.display = 'block';
    }
    
    // Update button states
    modeButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.mode === mode) {
            btn.classList.add('active');
        }
    });
    
    console.log(`✅ Switched savings mode for scenario ${scenarioId} to ${mode}`);
}

function togglePhase(scenarioId, phase) {
    const phaseElement = document.querySelector(`.savings-phase[data-phase="${phase}"][data-scenario="${scenarioId}"]`);
    const toggleButton = document.querySelector(`.phase-toggle-btn[data-phase="${phase}"][data-scenario="${scenarioId}"]`);
    const phaseContent = phaseElement?.querySelector('.phase-content');
    const statusIndicator = phaseElement?.querySelector('.phase-status-indicator');
    
    if (!phaseElement || !toggleButton || !phaseContent) return;
    
    const isActive = phaseElement.classList.contains('active');
    
    if (isActive) {
        // Deactivate phase
        phaseElement.classList.remove('active');
        phaseContent.style.display = 'none';
        if (statusIndicator) statusIndicator.classList.remove('active');
        toggleButton.innerHTML = '<span class="toggle-text">Aktivieren</span>';
    } else {
        // Activate phase
        phaseElement.classList.add('active');
        phaseContent.style.display = 'block';
        if (statusIndicator) statusIndicator.classList.add('active');
        toggleButton.innerHTML = '<span class="toggle-text">Deaktivieren</span>';
    }
    
    // Update multi-phase summary
    updateMultiPhaseSummary(scenarioId);
    
    console.log(`✅ Toggled phase ${phase} for scenario ${scenarioId}: ${!isActive ? 'activated' : 'deactivated'}`);
}

function updatePhaseSummaries(scenarioId) {
    // Update individual phase summaries
    for (let phase = 1; phase <= 3; phase++) {
        const phaseElement = document.querySelector(`.savings-phase[data-phase="${phase}"][data-scenario="${scenarioId}"]`);
        if (!phaseElement) continue;
        
        const startYearInput = phaseElement.querySelector('.phase-start-year');
        const endYearInput = phaseElement.querySelector('.phase-end-year');
        const savingsRateInput = phaseElement.querySelector('.phase-savings-rate');
        const phaseSummary = phaseElement.querySelector('.phase-summary');
        
        if (startYearInput && endYearInput && savingsRateInput && phaseSummary) {
            const startYear = parseInt(startYearInput.value || '0');
            const endYear = parseInt(endYearInput.value || '0');
            const savingsRate = parseGermanNumber(savingsRateInput.value || '0');
            
            const duration = endYear - startYear + 1;
            const totalContributions = duration * savingsRate * 12;
            
            const durationSpan = phaseSummary.querySelector('.phase-duration');
            const totalSpan = phaseSummary.querySelector('.phase-total');
            
            if (durationSpan) {
                durationSpan.textContent = `Dauer: ${duration} Jahre`;
            }
            if (totalSpan) {
                totalSpan.textContent = `Gesamt: ${formatCurrency(totalContributions)}`;
            }
        }
    }
}

function updateMultiPhaseSummary(scenarioId) {
    const activePhases = document.querySelectorAll(`.savings-phase[data-scenario="${scenarioId}"].active`);
    const activePhasesCount = document.getElementById(`activePhasesCount_${scenarioId}`);
    const totalDuration = document.getElementById(`totalDuration_${scenarioId}`);
    const averageSavingsRate = document.getElementById(`averageSavingsRate_${scenarioId}`);
    const totalContributions = document.getElementById(`totalContributions_${scenarioId}`);
    
    if (activePhasesCount) activePhasesCount.textContent = activePhases.length;
    
    // Calculate totals from active phases
    let maxDuration = 0;
    let totalAmount = 0;
    let weightedSavings = 0;
    
    activePhases.forEach(phase => {
        const phaseNum = phase.dataset.phase;
        const endYear = parseInt(document.querySelector(`.phase-end-year[data-phase="${phaseNum}"][data-scenario="${scenarioId}"]`)?.value || '0');
        const savingsRate = parseGermanNumber(document.querySelector(`.phase-savings-rate[data-phase="${phaseNum}"][data-scenario="${scenarioId}"]`)?.value || '0');
        const startYear = parseInt(document.querySelector(`.phase-start-year[data-phase="${phaseNum}"][data-scenario="${scenarioId}"]`)?.value || '0');
        
        maxDuration = Math.max(maxDuration, endYear + 1);
        const phaseDuration = endYear - startYear + 1;
        const phaseContributions = savingsRate * 12 * phaseDuration;
        totalAmount += phaseContributions;
        weightedSavings += savingsRate * phaseDuration;
    });
    
    const avgSavings = maxDuration > 0 ? weightedSavings / maxDuration : 0;
    
    if (totalDuration) totalDuration.textContent = `${maxDuration} Jahre`;
    if (averageSavingsRate) averageSavingsRate.textContent = formatCurrency(avgSavings);
    if (totalContributions) totalContributions.textContent = formatCurrency(totalAmount);
}

function generatePhaseTimeline(scenarioId) {
    const timelineContainer = document.getElementById(`phaseTimeline_${scenarioId}`);
    if (!timelineContainer) return;
    
    // Clear existing timeline
    timelineContainer.innerHTML = '';
    
    // Get active phases
    const activePhases = [];
    for (let phase = 1; phase <= 3; phase++) {
        const phaseElement = document.querySelector(`.savings-phase[data-phase="${phase}"][data-scenario="${scenarioId}"]`);
        if (phaseElement && phaseElement.classList.contains('active')) {
            const startYear = parseInt(phaseElement.querySelector('.phase-start-year')?.value || '0');
            const endYear = parseInt(phaseElement.querySelector('.phase-end-year')?.value || '0');
            const savingsRate = parseGermanNumber(phaseElement.querySelector('.phase-savings-rate')?.value || '0');
            
            activePhases.push({
                phase,
                startYear,
                endYear,
                savingsRate,
                duration: endYear - startYear + 1
            });
        }
    }
    
    if (activePhases.length === 0) {
        timelineContainer.innerHTML = '<div class="timeline-empty">Keine aktiven Phasen</div>';
        return;
    }
    
    // Create timeline visualization
    const totalDuration = Math.max(...activePhases.map(p => p.endYear));
    const timeline = document.createElement('div');
    timeline.className = 'phase-timeline-container';
    
    activePhases.forEach(phaseData => {
        const phaseBar = document.createElement('div');
        phaseBar.className = `phase-timeline-bar phase-${phaseData.phase}`;
        
        const widthPercent = (phaseData.duration / totalDuration) * 100;
        const leftPercent = (phaseData.startYear / totalDuration) * 100;
        
        phaseBar.style.width = `${widthPercent}%`;
        phaseBar.style.left = `${leftPercent}%`;
        phaseBar.style.position = 'absolute';
        phaseBar.style.height = '30px';
        phaseBar.style.borderRadius = '4px';
        phaseBar.style.display = 'flex';
        phaseBar.style.alignItems = 'center';
        phaseBar.style.justifyContent = 'center';
        phaseBar.style.fontSize = '0.8rem';
        phaseBar.style.fontWeight = 'bold';
        phaseBar.style.color = 'white';
        phaseBar.style.marginBottom = '5px';
        
        // Set phase colors
        const phaseColors = ['#3498db', '#27ae60', '#e74c3c'];
        phaseBar.style.backgroundColor = phaseColors[phaseData.phase - 1];
        
        phaseBar.innerHTML = `
            <span>Phase ${phaseData.phase}: ${formatCurrency(phaseData.savingsRate)}/Monat</span>
        `;
        
        timeline.appendChild(phaseBar);
    });
    
    timeline.style.position = 'relative';
    timeline.style.height = `${activePhases.length * 35}px`;
    timeline.style.marginTop = '10px';
    
    timelineContainer.appendChild(timeline);
}

// ===================================
// EXISTING PLACEHOLDERS BELOW
// ===================================

// Placeholder functions to prevent errors
function openSaveEntnahmephaseScenarioModal() {
    const modal = document.getElementById('saveEntnahmephaseScenarioModal');
    if (modal) {
        modal.style.display = 'block';
        updateEntnahmephaseScenarioPreview();
    }
}

function closeSaveEntnahmephaseScenarioModal() {
    const modal = document.getElementById('saveEntnahmephaseScenarioModal');
    if (modal) {
        modal.style.display = 'none';
        // Clear form
        const nameInput = document.getElementById('entnahmephaseScenarioName');
        const descInput = document.getElementById('entnahmephaseScenarioDescription');
        if (nameInput) nameInput.value = '';
        if (descInput) descInput.value = '';
    }
}

function confirmSaveEntnahmephaseScenario() {
    const nameInput = document.getElementById('entnahmephaseScenarioName');
    const descInput = document.getElementById('entnahmephaseScenarioDescription');
    
    if (!nameInput?.value.trim()) {
        alert('Bitte geben Sie einen Namen für das Szenario ein.');
        return;
    }
    
    const scenarioData = {
        name: nameInput.value.trim(),
        description: descInput?.value.trim() || '',
        retirementCapital: document.getElementById('retirementCapital')?.value || '1000000',
        withdrawalDuration: document.getElementById('withdrawalDuration')?.value || '25',
        postRetirementReturn: document.getElementById('postRetirementReturn')?.value || '5',
        withdrawalInflation: document.getElementById('withdrawalInflation')?.value || '2',
        includeTax: document.getElementById('withdrawalTaxToggle')?.classList.contains('active') || false,
        timestamp: new Date().toISOString()
    };
    
    // Save to localStorage
    const existingScenarios = JSON.parse(localStorage.getItem('entnahmephaseScenarios') || '[]');
    existingScenarios.push(scenarioData);
    localStorage.setItem('entnahmephaseScenarios', JSON.stringify(existingScenarios));
    
    closeSaveEntnahmephaseScenarioModal();
    showNotification('✅ Szenario erfolgreich gespeichert!', `Das Entnahmephase-Szenario "${scenarioData.name}" wurde erfolgreich gespeichert.`, 'success');
}

function updateEntnahmephaseScenarioPreview() {
    const nameInput = document.getElementById('entnahmephaseScenarioName');
    const confirmBtn = document.getElementById('confirmSaveEntnahmephaseScenario');
    const preview = document.getElementById('entnahmephaseScenarioPreview');
    
    if (confirmBtn) {
        confirmBtn.disabled = !nameInput?.value.trim();
    }
    
    if (preview) {
        const retirementCapital = document.getElementById('retirementCapital')?.value || '1000000';
        const withdrawalDuration = document.getElementById('withdrawalDuration')?.value || '25';
        const postRetirementReturn = document.getElementById('postRetirementReturn')?.value || '5';
        
        preview.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.9rem;">
                <div><strong>Kapital:</strong> €${formatGermanNumber(parseGermanNumber(retirementCapital))}</div>
                <div><strong>Dauer:</strong> ${withdrawalDuration} Jahre</div>
                <div><strong>Rendite:</strong> ${postRetirementReturn}%</div>
                <div><strong>Inflation:</strong> ${document.getElementById('withdrawalInflation')?.value || '2'}%</div>
            </div>
        `;
    }
}

function openLoadEntnahmephaseScenarioModal() {
    const modal = document.getElementById('loadEntnahmephaseScenarioModal');
    if (modal) {
        modal.style.display = 'block';
        populateEntnahmephaseScenarioList();
    }
}

function closeLoadEntnahmephaseScenarioModal() {
    const modal = document.getElementById('loadEntnahmephaseScenarioModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function openManageEntnahmephaseScenarioModal() {
    const modal = document.getElementById('manageEntnahmephaseScenarioModal');
    if (modal) {
        modal.style.display = 'block';
        populateManageEntnahmephaseScenarioList();
    }
}

function closeManageEntnahmephaseScenarioModal() {
    const modal = document.getElementById('manageEntnahmephaseScenarioModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function populateEntnahmephaseScenarioList() {
    const list = document.getElementById('loadEntnahmephaseScenarioList');
    if (!list) return;
    
    const scenarios = JSON.parse(localStorage.getItem('entnahmephaseScenarios') || '[]');
    
    if (scenarios.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #7f8c8d;">Keine gespeicherten Entnahmephase-Szenarien gefunden.</p>';
        return;
    }
    
    list.innerHTML = scenarios.map((scenario, index) => `
        <div class="profile-item" style="cursor: pointer;" onclick="loadEntnahmephaseScenario(${index})">
            <h4>${scenario.name}</h4>
            <p>${scenario.description || 'Keine Beschreibung'}</p>
            <div class="profile-details">
                <small>Kapital: €${formatGermanNumber(parseGermanNumber(scenario.retirementCapital))}</small>
                <small>Dauer: ${scenario.withdrawalDuration} Jahre</small>
            </div>
        </div>
    `).join('');
}

function populateManageEntnahmephaseScenarioList() {
    const list = document.getElementById('manageEntnahmephaseScenarioList');
    if (!list) return;
    
    const scenarios = JSON.parse(localStorage.getItem('entnahmephaseScenarios') || '[]');
    
    if (scenarios.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #7f8c8d;">Keine gespeicherten Entnahmephase-Szenarien gefunden.</p>';
        return;
    }
    
    list.innerHTML = scenarios.map((scenario, index) => `
        <div class="profile-item">
            <h4>${scenario.name}</h4>
            <p>${scenario.description || 'Keine Beschreibung'}</p>
            <div class="profile-actions">
                <button onclick="loadEntnahmephaseScenario(${index})" class="profile-action-btn profile-load-btn">📂 Laden</button>
                <button onclick="deleteEntnahmephaseScenario(${index})" class="profile-action-btn profile-delete-btn">🗑️ Löschen</button>
            </div>
        </div>
    `).join('');
}

window.loadEntnahmephaseScenario = function(index) {
    const scenarios = JSON.parse(localStorage.getItem('entnahmephaseScenarios') || '[]');
    const scenario = scenarios[index];
    if (!scenario) return;
    
    // Load scenario data into form
    if (document.getElementById('retirementCapital')) document.getElementById('retirementCapital').value = scenario.retirementCapital;
    if (document.getElementById('withdrawalDuration')) document.getElementById('withdrawalDuration').value = scenario.withdrawalDuration;
    if (document.getElementById('postRetirementReturn')) document.getElementById('postRetirementReturn').value = scenario.postRetirementReturn;
    if (document.getElementById('withdrawalInflation')) document.getElementById('withdrawalInflation').value = scenario.withdrawalInflation;
    
    // Set tax toggle
    const taxToggle = document.getElementById('withdrawalTaxToggle');
    if (taxToggle) {
        if (scenario.includeTax) {
            taxToggle.classList.add('active');
        } else {
            taxToggle.classList.remove('active');
        }
    }
    
    // Update sliders
    updateWithdrawalSliderValue('withdrawalDuration');
    updateWithdrawalSliderValue('postRetirementReturn');
    updateWithdrawalSliderValue('withdrawalInflation');
    
    closeLoadEntnahmephaseScenarioModal();
    closeManageEntnahmephaseScenarioModal();
    
    // Recalculate
    if (window.calculateWithdrawal) {
        window.calculateWithdrawal();
    }
    
    showNotification('✅ Szenario erfolgreich geladen!', `Das Entnahmephase-Szenario "${scenario.name}" wurde erfolgreich geladen.`, 'success');
};

window.deleteEntnahmephaseScenario = function(index) {
    const scenarios = JSON.parse(localStorage.getItem('entnahmephaseScenarios') || '[]');
    const scenario = scenarios[index];
    if (!scenario) return;
    
    if (confirm(`Möchten Sie das Szenario "${scenario.name}" wirklich löschen?`)) {
        scenarios.splice(index, 1);
        localStorage.setItem('entnahmephaseScenarios', JSON.stringify(scenarios));
        populateManageEntnahmephaseScenarioList();
        showNotification('🗑️ Szenario gelöscht!', `Das Entnahmephase-Szenario "${scenario.name}" wurde gelöscht.`, 'success');
    }
};
function resetEntnahmephaseScenarios() {
    if (confirm('🔄 Möchten Sie wirklich alle Entnahmephase-Einstellungen zurücksetzen?')) {
        // Reset to default values
        const defaults = {
            retirementCapital: '1000000',
            withdrawalDuration: '25',
            postRetirementReturn: '5',
            withdrawalInflation: '2'
        };
        
        Object.entries(defaults).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value;
                // Trigger change event to update displays
                element.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
        
        // Reset toggles
        const taxToggle = document.getElementById('withdrawalTaxToggle');
        if (taxToggle) {
            taxToggle.classList.remove('active');
        }
        
        // Clear auto-sync
        const syncIndicator = document.getElementById('syncIndicator');
        if (syncIndicator) {
            syncIndicator.style.display = 'none';
        }
        
        // Recalculate
        if (window.calculateWithdrawal) {
            window.calculateWithdrawal();
        }
        
        console.log('✅ Reset Entnahmephase scenarios to defaults');
    }
}
function saveIndividualAnsparphaseScenario(scenarioId) {
    try {
        // Get current scenario data
        const scenarioData = {
            monthlySavings: parseGermanNumber(document.getElementById(`monthlySavings_${scenarioId}`)?.value || '500'),
            initialCapital: parseGermanNumber(document.getElementById(`initialCapital_${scenarioId}`)?.value || '3000'),
            annualReturn: parseFloat(document.getElementById(`annualReturn_${scenarioId}`)?.value || '7'),
            inflationRate: parseFloat(document.getElementById(`inflationRate_${scenarioId}`)?.value || '2'),
            salaryGrowth: parseFloat(document.getElementById(`salaryGrowth_${scenarioId}`)?.value || '3'),
            duration: parseInt(document.getElementById(`duration_${scenarioId}`)?.value || '25'),
            salaryToSavings: parseFloat(document.getElementById(`salaryToSavings_${scenarioId}`)?.value || '50'),
            baseSalary: parseGermanNumber(document.getElementById(`baseSalary_${scenarioId}`)?.value || '60000'),
            includeTax: document.getElementById(`taxToggle_${scenarioId}`)?.classList.contains('active') || false,
            teilfreistellung: document.getElementById(`teilfreistellungToggle_${scenarioId}`)?.classList.contains('active') || false,
            timestamp: new Date().toISOString()
        };
        
        // Store in localStorage
        const storageKey = `ansparphase_scenario_${scenarioId}_autosave`;
        localStorage.setItem(storageKey, JSON.stringify(scenarioData));
        
        console.log(`✅ Auto-saved scenario ${scenarioId}:`, scenarioData);
    } catch (error) {
        console.error(`❌ Error auto-saving scenario ${scenarioId}:`, error);
    }
}

// Add window assignments for functions that are being referenced
window.saveIndividualAnsparphaseScenario = saveIndividualAnsparphaseScenario;
window.setupScenarioInputListeners = setupScenarioInputListeners;
window.updateScenarioSliderValue = updateScenarioSliderValue;
window.updateWithdrawalSliderValue = updateWithdrawalSliderValue;
window.updateTeilfreistellungToggleState = updateTeilfreistellungToggleState;

// Add window assignments for scenario management functions
window.openSaveAnsparphaseScenarioModal = openSaveAnsparphaseScenarioModal;
window.closeSaveAnsparphaseScenarioModal = closeSaveAnsparphaseScenarioModal;
window.updateAnsparphaseScenarioPreview = updateAnsparphaseScenarioPreview;
window.confirmSaveAnsparphaseScenario = confirmSaveAnsparphaseScenario;
window.openLoadAnsparphaseScenarioModal = openLoadAnsparphaseScenarioModal;
window.closeLoadAnsparphaseScenarioModal = closeLoadAnsparphaseScenarioModal;
window.confirmLoadAnsparphaseScenario = confirmLoadAnsparphaseScenario;
window.selectAnsparphaseScenarioForLoad = selectAnsparphaseScenarioForLoad;
window.openManageAnsparphaseScenarioModal = openManageAnsparphaseScenarioModal;
window.closeManageAnsparphaseScenarioModal = closeManageAnsparphaseScenarioModal;
window.loadAnsparphaseScenarioFromManager = loadAnsparphaseScenarioFromManager;
window.deleteAnsparphaseScenario = deleteAnsparphaseScenario;
window.resetAnsparphaseScenarios = resetAnsparphaseScenarios;

/**
 * Set savings mode (fixed amount or percentage)
 */
function setSavingsMode(mode) {
    if (!window.budgetData) {
        window.budgetData = { savings: { mode: 'fixed', amount: 500, percentage: 50 } };
    }
    
    window.budgetData.savings.mode = mode;
    
    const fixedAmountControl = document.getElementById('fixedAmountControl');
    const percentageControl = document.getElementById('percentageControl');
    const fixedBtn = document.getElementById('fixedAmount');
    const percentageBtn = document.getElementById('percentage');
    
    if (mode === 'fixed') {
        if (fixedAmountControl) fixedAmountControl.style.display = 'block';
        if (percentageControl) percentageControl.style.display = 'none';
        if (fixedBtn) fixedBtn.classList.add('active');
        if (percentageBtn) percentageBtn.classList.remove('active');
    } else {
        if (fixedAmountControl) fixedAmountControl.style.display = 'none';
        if (percentageControl) percentageControl.style.display = 'block';
        if (fixedBtn) fixedBtn.classList.remove('active');
        if (percentageBtn) percentageBtn.classList.add('active');
    }
    
    updateSavingsDisplay();
}
window.setSavingsMode = setSavingsMode;

/**
 * Generate integrated timeline (placeholder implementation)
 */
function generateIntegratedTimeline() {
    try {
        // Get accumulation data from active scenario
        const activeScenario = state.activeScenario || 'A';
        const accumulationDuration = parseInt(document.getElementById(`duration_${activeScenario}`)?.value || '25');
        
        // Get withdrawal data
        const withdrawalDuration = parseInt(document.getElementById('withdrawalDuration')?.value || '25');
        const retirementCapital = parseGermanNumber(document.getElementById('retirementCapital')?.value || '1000000');
        
        // Update timeline displays
        if (document.getElementById('accumulationYears')) {
            document.getElementById('accumulationYears').textContent = accumulationDuration;
        }
        if (document.getElementById('withdrawalYears')) {
            document.getElementById('withdrawalYears').textContent = withdrawalDuration;
        }
        if (document.getElementById('transitionCapital')) {
            document.getElementById('transitionCapital').textContent = formatGermanNumber(retirementCapital);
        }
        
        console.log('✅ Generated integrated timeline');
    } catch (error) {
        console.error('❌ Error generating integrated timeline:', error);
    }
}

// Use the updateScenarioSliderValue function from dom.js (imported at the top)
function updateScenarioSliderValue(sliderId, scenarioId) {
    domUpdateScenarioSliderValue(sliderId, scenarioId);
}

function updateWithdrawalSliderValue(id) {
    const slider = document.getElementById(id);
    const valueElement = document.getElementById(id + 'Value');
    
    if (!slider || !valueElement) {
        console.warn(`Missing elements for withdrawal slider ${id}:`, {
            slider: !!slider,
            valueElement: !!valueElement
        });
        return;
    }
    
    const value = parseFloat(slider.value);
    let formattedValue;
    
    switch(id) {
        case 'withdrawalDuration':
            formattedValue = `${value} Jahre`;
            break;
        case 'postRetirementReturn':
        case 'withdrawalInflation':
        case 'withdrawalTeilfreistellungRate':
            formattedValue = `${value.toFixed(1)}%`;
            break;
        default:
            formattedValue = value.toString();
    }
    
    valueElement.textContent = formattedValue;
    console.log(`Updated withdrawal slider ${id}: ${formattedValue}`);
}

function updateTeilfreistellungToggleState(scenarioId) {
    const toggleElement = document.getElementById(`teilfreistellungToggle_${scenarioId}`);
    const helpElement = document.getElementById(`teilfreistellungHelp_${scenarioId}`);
    
    if (toggleElement && helpElement) {
        const isActive = toggleElement.classList.contains('active');
        if (isActive) {
            helpElement.style.display = 'block';
        } else {
            helpElement.style.display = 'none';
        }
    }
}

function updateComparisonTeilfreistellungState() {
    // Update teilfreistellung state for all comparison scenarios
    const scenarios = ['A', 'B', 'C', 'D', 'E']; // Support up to 5 scenarios
    
    scenarios.forEach(scenarioId => {
        const toggleElement = document.querySelector(`[data-param="accumulation.teilfreistellung"][data-scenario="${scenarioId}"]`);
        if (toggleElement) {
            const isActive = toggleElement.classList.contains('active');
            // Find and update related UI elements if they exist
            const helpElement = document.querySelector(`#teilfreistellungHelp_${scenarioId}`);
            if (helpElement) {
                helpElement.style.display = isActive ? 'block' : 'none';
            }
        }
    });
}

/**
 * Reset budget to default values
 */
function resetBudget() {
    if (confirm('🔄 Möchten Sie wirklich alle Budget-Einstellungen zurücksetzen?')) {
        // Reset income fields
        document.getElementById('salary').value = '3000';
        document.getElementById('sideIncome').value = '0';
        document.getElementById('otherIncome').value = '0';
        
        // Reset expense fields
        const expenseDefaults = {
            rent: '800',
            utilities: '150',
            health: '100',
            insurance: '80',
            internet: '30',
            gez: '18',
            food: '300',
            transport: '100',
            leisure: '200',
            clothing: '50',
            subscriptions: '30',
            miscellaneous: '100'
        };
        
        Object.entries(expenseDefaults).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.value = value;
        });
        
        // Reset savings settings
        document.getElementById('savingsAmount').value = '500';
        document.getElementById('savingsPercentage').value = '50';
        const percentageValueElement = document.getElementById('savingsPercentageValue');
        if (percentageValueElement) {
            percentageValueElement.textContent = '50%';
        }
        
        // Reset to fixed amount mode
        setSavingsMode('fixed');
        
        // Reset period toggles to monthly
        document.querySelectorAll('.period-option').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Set monthly as active for all period toggles
        ['incomePeriodToggle', 'fixedPeriodToggle', 'variablePeriodToggle'].forEach(toggleId => {
            const toggle = document.getElementById(toggleId);
            if (toggle) {
                const monthlyBtn = toggle.querySelector('[data-period="monthly"]');
                if (monthlyBtn) monthlyBtn.classList.add('active');
            }
        });
        
        // Reset global budget data
        if (window.budgetData) {
            window.budgetData = {
                totalIncome: 0,
                totalExpenses: 0,
                remainingBudget: 0,
                savings: { mode: 'fixed', amount: 500, percentage: 50 },
                finalSavingsAmount: 500,
                periods: { income: 'monthly', fixed: 'monthly', variable: 'monthly' }
            };
        }
        
        // Recalculate budget
        calculateBudget();
        
        showNotification('🔄 Budget zurückgesetzt', 'Alle Budget-Einstellungen wurden auf Standardwerte zurückgesetzt.', 'success');
    }
}

