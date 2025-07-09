/**
 * Setup Functions for German Financial Planner
 * 
 * This module contains all setup functions for event listeners and initialization
 * that are used throughout the application.
 */

import { parseGermanNumber, formatGermanNumber, formatCurrency } from '../utils/utils.js';

// Import calculation functions
import { calculateBudget as calculateBudgetCore } from '../core/budget.js';
import { calculateTaxes as calculateTaxesCore } from '../core/tax.js';
import { calculateWithdrawalPlan as calculateWithdrawalCore } from '../core/withdrawal.js';
import { recalculateAll, debouncedRecalculateAll, autoSyncWithdrawalCapital } from '../app.js';

// Import DOM functions
import { 
    updateScenarioSliderValue, 
    updateWithdrawalSliderValue,
    updateTeilfreistellungToggleState,
    updateComparisonTeilfreistellungState,
    updateScenarioCheckboxVisibility,
    updateWithdrawalResults
} from './dom.js';

// Import chart functions
import { updateBudgetPieChart } from './budgetChart.js';

// Import feature functions
import { loadComparisonProfiles } from '../features/profileManager.js';

// Import state management
import * as state from '../state.js';

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
            document.getElementById('incomeTax').textContent = formatCurrency(results.incomeTax);
        }
        if (document.getElementById('churchTax')) {
            document.getElementById('churchTax').textContent = formatCurrency(results.churchTax);
        }
        if (document.getElementById('healthInsurance')) {
            document.getElementById('healthInsurance').textContent = formatCurrency(results.healthInsurance);
        }
        if (document.getElementById('careInsurance')) {
            document.getElementById('careInsurance').textContent = formatCurrency(results.careInsurance);
        }
        if (document.getElementById('pensionInsurance')) {
            document.getElementById('pensionInsurance').textContent = formatCurrency(results.pensionInsurance);
        }
        if (document.getElementById('unemploymentInsurance')) {
            document.getElementById('unemploymentInsurance').textContent = formatCurrency(results.unemploymentInsurance);
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
        
        // Update UI
        updateWithdrawalResults(results);
        
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
                updateScenarioSliderValue(sliderId, scenarioId);
                debouncedRecalculateAll();
            // Auto-save individual scenario after slider change
            setTimeout(() => saveIndividualAnsparphaseScenario(scenarioId), 500);
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
                
                debouncedRecalculateAll();
            });
            
            // Also detect when user finishes editing (blur event)
            input.addEventListener('blur', function() {
                state.setUserIsTyping(false);
                if (typingTimeout) {
                    clearTimeout(typingTimeout);
                }
                // Trigger sync with notification after user finishes editing
                setTimeout(() => {
                    autoSyncWithdrawalCapital(true);
                }, 200);
            });
        }
    });

    // Tax toggle
    const taxToggle = document.getElementById('taxToggle_' + scenarioId);
    if (taxToggle) {
        taxToggle.addEventListener('click', function() {
            this.classList.toggle('active');
            updateTeilfreistellungToggleState(scenarioId);
            debouncedRecalculateAll();
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
            debouncedRecalculateAll();
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
                debouncedRecalculateAll();
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
    updateTeilfreistellungToggleState(scenarioId);
}

/**
 * Setup comparison scenario listeners
 */
export function setupComparisonScenarioListeners() {
    // Set up comparison scenario tabs event listeners
    setupComparisonScenarioTabs();
    
    // Set up profile selection functionality
    setupComparisonProfileSelection();
    
    // Set up add comparison scenario button
    const addComparisonScenarioBtn = document.getElementById('addComparisonScenarioBtn');
    if (addComparisonScenarioBtn) {
        addComparisonScenarioBtn.addEventListener('click', function() {
            if (window.addNewComparisonScenario) {
                window.addNewComparisonScenario();
            }
        });
    }
    
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
        autoSyncWithdrawalCapital(true);
    });
}

/**
 * Setup budget phase listeners
 */
export function setupBudgetListeners() {
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
        document.getElementById(`monthlySavings_${activeScenario}`).value = formatGermanNumber(savingsAmount, 0).replace(',00', '');
        
        // Switch to accumulation phase
        document.getElementById('accumulationPhase').click();
        recalculateAll();
        
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
                const baseSalaryElement = document.getElementById(`baseSalary_${activeScenario}`);
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
            currentChartMode = 'comparison';
            updateMainChart();
            updateScenarioCheckboxVisibility();
        });
    }

    if (contributionsGainsBtn) {
        contributionsGainsBtn.addEventListener('click', function() {
            // Switch to contributions vs gains view
            contributionsGainsBtn.classList.add('active');
            scenarioComparisonBtn.classList.remove('active');
            currentChartMode = 'contributions';
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
            generateIntegratedTimeline();
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
            calculateWithdrawal();
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
            recalculateAll();
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
                recalculateAll();
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
 * Setup sticky scenario cards behavior
 */
export function setupStickyScenarioCards() {
    const scenarioResults = document.getElementById('scenarioResults');
    if (!scenarioResults) return;
    
    let isSticky = false;
    let originalTop = 0;
    
    // Function to handle scroll events
    function handleScroll() {
        // Only apply on desktop (768px and up)
        if (window.innerWidth <= 768) {
            scenarioResults.style.transform = '';
            return;
        }
        
        // Only apply when accumulation phase is active
        if (currentPhase !== 'accumulation') {
            scenarioResults.style.transform = '';
            return;
        }
        
        // Check if the scenario results container is visible
        const computedStyle = window.getComputedStyle(scenarioResults);
        if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
            scenarioResults.style.transform = '';
            return;
        }
        
        // Check if there are any scenario result cards
        const cards = scenarioResults.querySelectorAll('.scenario-result-card');
        if (cards.length === 0) {
            scenarioResults.style.transform = '';
            return;
        }
        
        const scrollY = window.scrollY;
        
        // Get the original position if not set or if cards are back to original position
        if (originalTop === 0 || scenarioResults.style.transform === '') {
            // Reset transform to get true original position
            const currentTransform = scenarioResults.style.transform;
            scenarioResults.style.transform = '';
            
            const rect = scenarioResults.getBoundingClientRect();
            originalTop = scrollY + rect.top;
            
            // Restore transform if it was set
            if (currentTransform && scrollY > originalTop) {
                scenarioResults.style.transform = currentTransform;
            }
        }
        
        // Calculate sticky threshold (20px from top)
        const stickyThreshold = originalTop - 20;
        
        if (scrollY >= stickyThreshold && !isSticky) {
            // Make sticky
            isSticky = true;
            scenarioResults.style.transform = 'translateY(20px)';
            scenarioResults.style.position = 'sticky';
            scenarioResults.style.top = '0';
            scenarioResults.style.zIndex = '10';
        } else if (scrollY < stickyThreshold && isSticky) {
            // Remove sticky
            isSticky = false;
            scenarioResults.style.transform = '';
            scenarioResults.style.position = '';
            scenarioResults.style.top = '';
            scenarioResults.style.zIndex = '';
        }
    }
    
    // Add scroll event listener
    window.addEventListener('scroll', handleScroll);
    
    // Add resize event listener to handle responsive behavior
    window.addEventListener('resize', handleScroll);
    
    // Global reset function
    window.resetStickyScenarioCards = function() {
        isSticky = false;
        originalTop = 0;
        scenarioResults.style.transform = '';
        scenarioResults.style.position = '';
        scenarioResults.style.top = '';
        scenarioResults.style.zIndex = '';
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
                debouncedRecalculateAll();
            });
        }
        
        if (endYearInput) {
            endYearInput.addEventListener('input', () => {
                updatePhaseSummaries(scenarioId);
                updateMultiPhaseSummary(scenarioId);
                generatePhaseTimeline(scenarioId);
                debouncedRecalculateAll();
            });
        }
        
        if (savingsRateInput) {
            savingsRateInput.addEventListener('input', () => {
                updatePhaseSummaries(scenarioId);
                updateMultiPhaseSummary(scenarioId);
                debouncedRecalculateAll();
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
                updateComparisonChart();
            } else if (viewType === 'timeline') {
                updateTimelineChart();
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
            if (scenarioId && window.updateScenarioImportButton) {
                window.updateScenarioImportButton(scenarioId);
            }
        }
    });
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
 * Setup Ansparphase scenario listeners
 */
export function setupAnsparphaseScenarioListeners() {
    // Save scenario modal
    const saveBtn = document.getElementById('saveAnsparphaseScenario');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            if (window.openSaveAnsparphaseScenarioModal) window.openSaveAnsparphaseScenarioModal();
        });
    }
    
    const closeSaveBtn = document.getElementById('closeSaveAnsparphaseScenarioModal');
    if (closeSaveBtn) {
        closeSaveBtn.addEventListener('click', () => {
            if (window.closeSaveAnsparphaseScenarioModal) window.closeSaveAnsparphaseScenarioModal();
        });
    }
    
    const cancelSaveBtn = document.getElementById('cancelSaveAnsparphaseScenario');
    if (cancelSaveBtn) {
        cancelSaveBtn.addEventListener('click', () => {
            if (window.closeSaveAnsparphaseScenarioModal) window.closeSaveAnsparphaseScenarioModal();
        });
    }
    
    const confirmSaveBtn = document.getElementById('confirmSaveAnsparphaseScenario');
    if (confirmSaveBtn) {
        confirmSaveBtn.addEventListener('click', () => {
            if (window.confirmSaveAnsparphaseScenario) window.confirmSaveAnsparphaseScenario();
        });
    }
    
    const scenarioNameInput = document.getElementById('ansparphaseScenarioName');
    if (scenarioNameInput) {
        scenarioNameInput.addEventListener('input', () => {
            if (window.updateAnsparphaseScenarioPreview) window.updateAnsparphaseScenarioPreview();
        });
    }
    
    const scenarioDescInput = document.getElementById('ansparphaseScenarioDescription');
    if (scenarioDescInput) {
        scenarioDescInput.addEventListener('input', () => {
            if (window.updateAnsparphaseScenarioPreview) window.updateAnsparphaseScenarioPreview();
        });
    }

    // Load scenario modal
    const loadBtn = document.getElementById('loadAnsparphaseScenario');
    if (loadBtn) {
        loadBtn.addEventListener('click', () => {
            if (window.openLoadAnsparphaseScenarioModal) window.openLoadAnsparphaseScenarioModal();
        });
    }
    
    const closeLoadBtn = document.getElementById('closeLoadAnsparphaseScenarioModal');
    if (closeLoadBtn) {
        closeLoadBtn.addEventListener('click', () => {
            if (window.closeLoadAnsparphaseScenarioModal) window.closeLoadAnsparphaseScenarioModal();
        });
    }
    
    const cancelLoadBtn = document.getElementById('cancelLoadAnsparphaseScenario');
    if (cancelLoadBtn) {
        cancelLoadBtn.addEventListener('click', () => {
            if (window.closeLoadAnsparphaseScenarioModal) window.closeLoadAnsparphaseScenarioModal();
        });
    }
    
    const confirmLoadBtn = document.getElementById('confirmLoadAnsparphaseScenario');
    if (confirmLoadBtn) {
        confirmLoadBtn.addEventListener('click', () => {
            if (window.confirmLoadAnsparphaseScenario) window.confirmLoadAnsparphaseScenario();
        });
    }

    // Manage scenarios modal
    const manageBtn = document.getElementById('manageAnsparphaseScenarios');
    if (manageBtn) {
        manageBtn.addEventListener('click', () => {
            if (window.openManageAnsparphaseScenarioModal) window.openManageAnsparphaseScenarioModal();
        });
    }
    
    const closeManageBtn = document.getElementById('closeManageAnsparphaseScenarioModal');
    if (closeManageBtn) {
        closeManageBtn.addEventListener('click', () => {
            if (window.closeManageAnsparphaseScenarioModal) window.closeManageAnsparphaseScenarioModal();
        });
    }

    // Reset scenarios
    const resetBtn = document.getElementById('resetAnsparphaseScenario');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (window.resetAnsparphaseScenarios) window.resetAnsparphaseScenarios();
        });
    }

    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        const saveModal = document.getElementById('saveAnsparphaseScenarioModal');
        const loadModal = document.getElementById('loadAnsparphaseScenarioModal');
        const manageModal = document.getElementById('manageAnsparphaseScenarioModal');
        
        if (event.target === saveModal) {
            if (window.closeSaveAnsparphaseScenarioModal) window.closeSaveAnsparphaseScenarioModal();
        }
        if (event.target === loadModal) {
            if (window.closeLoadAnsparphaseScenarioModal) window.closeLoadAnsparphaseScenarioModal();
        }
        if (event.target === manageModal) {
            if (window.closeManageAnsparphaseScenarioModal) window.closeManageAnsparphaseScenarioModal();
        }
    });
}

/**
 * Setup Entnahmephase scenario listeners
 */
export function setupEntnahmephaseScenarioListeners() {
    // Save scenario modal
    document.getElementById('saveEntnahmephaseScenario').addEventListener('click', openSaveEntnahmephaseScenarioModal);
    document.getElementById('closeSaveEntnahmephaseScenarioModal').addEventListener('click', closeSaveEntnahmephaseScenarioModal);
    document.getElementById('cancelSaveEntnahmephaseScenario').addEventListener('click', closeSaveEntnahmephaseScenarioModal);
    document.getElementById('confirmSaveEntnahmephaseScenario').addEventListener('click', confirmSaveEntnahmephaseScenario);
    document.getElementById('entnahmephaseScenarioName').addEventListener('input', updateEntnahmephaseScenarioPreview);
    document.getElementById('entnahmephaseScenarioDescription').addEventListener('input', updateEntnahmephaseScenarioPreview);

    // Load scenario modal
    document.getElementById('loadEntnahmephaseScenario').addEventListener('click', openLoadEntnahmephaseScenarioModal);
    document.getElementById('closeLoadEntnahmephaseScenarioModal').addEventListener('click', closeLoadEntnahmephaseScenarioModal);
    document.getElementById('cancelLoadEntnahmephaseScenario').addEventListener('click', closeLoadEntnahmephaseScenarioModal);

    // Manage scenarios modal
    document.getElementById('manageEntnahmephaseScenarios').addEventListener('click', openManageEntnahmephaseScenarioModal);
    document.getElementById('closeManageEntnahmephaseScenarioModal').addEventListener('click', closeManageEntnahmephaseScenarioModal);

    // Reset scenarios
    document.getElementById('resetEntnahmephaseScenario').addEventListener('click', resetEntnahmephaseScenarios);

    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        const saveModal = document.getElementById('saveEntnahmephaseScenarioModal');
        const loadModal = document.getElementById('loadEntnahmephaseScenarioModal');
        const manageModal = document.getElementById('manageEntnahmephaseScenarioModal');
        
        if (event.target === saveModal) {
            closeSaveEntnahmephaseScenarioModal();
        }
        if (event.target === loadModal) {
            closeLoadEntnahmephaseScenarioModal();
        }
        if (event.target === manageModal) {
            closeManageEntnahmephaseScenarioModal();
        }
    });
}