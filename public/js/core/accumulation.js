/**
 * Accumulation Phase Calculations
 * 
 * This module contains all calculation functions related to the accumulation phase
 * of wealth development, extracted from the main app.js file.
 */

// Import utility functions
import { parseGermanNumber, formatGermanNumber, formatCurrency } from '../utils.js';

// Import tax calculation functions
import { calculateGermanETFTax, calculateGermanNetSalary, resetETFTaxAllowance } from './tax.js';

// Global variable to track used tax-free allowance
let usedSparerpauschbetrag = 0;

/**
 * Main scenario calculation function
 * Determines the calculation mode and runs the appropriate wealth development calculation
 * 
 * @param {Object} scenario - The scenario object containing configuration
 * @returns {Object} The scenario object with updated results
 */
function runScenario(scenario) {
    const scenarioId = scenario.id;
    
    // Determine savings mode
    const savingsMode = getSavingsMode(scenarioId);
    
    // Get common input values for this scenario
    const initialCapital = parseGermanNumber(getScenarioValue('initialCapital', scenarioId));
    const baseSalary = parseGermanNumber(getScenarioValue('baseSalary', scenarioId));
    const annualReturn = parseFloat(getScenarioValue('annualReturn', scenarioId)) / 100;
    const inflationRate = parseFloat(getScenarioValue('inflationRate', scenarioId)) / 100;
    const salaryGrowth = parseFloat(getScenarioValue('salaryGrowth', scenarioId)) / 100;
    const salaryToSavings = parseFloat(getScenarioValue('salaryToSavings', scenarioId)) / 100;
    const includeTax = getScenarioToggleValue('taxToggle', scenarioId);

    // Get Teilfreistellung and ETF type for main scenarios
    const teilfreistellung = getScenarioToggleValue('teilfreistellungToggle', scenarioId);
    const etfType = getScenarioETFType(scenarioId);

    let results;
    let monthlySavings = 0;
    let duration = 0;

    if (savingsMode === 'multi-phase') {
        // Multi-phase calculation
        const phases = getMultiPhaseData(scenarioId);
        
        if (phases.length > 0) {
            // Calculate duration from phases
            duration = Math.max(...phases.map(phase => phase.endYear));
            
            // Calculate average monthly savings for backward compatibility
            let totalContributions = 0;
            let totalMonths = 0;
            phases.forEach(phase => {
                const phaseDuration = phase.endYear - phase.startYear + 1;
                const phaseMonths = phaseDuration * 12;
                totalContributions += phaseMonths * phase.monthlySavingsRate;
                totalMonths += phaseMonths;
            });
            monthlySavings = totalMonths > 0 ? totalContributions / totalMonths : 0;
            
            // Use multi-phase calculation
            results = calculateMultiPhaseWealthDevelopment(
                phases, initialCapital, annualReturn, inflationRate, 
                salaryGrowth, salaryToSavings, includeTax, baseSalary,
                teilfreistellung, etfType
            );
        } else {
            // No active phases, use defaults
            monthlySavings = 0;
            duration = 25;
            results = calculateWealthDevelopment(
                0, initialCapital, annualReturn, inflationRate, 
                salaryGrowth, duration, salaryToSavings, includeTax, baseSalary,
                teilfreistellung, etfType
            );
        }
    } else {
        // Simple single-rate calculation
        monthlySavings = parseGermanNumber(getScenarioValue('monthlySavings', scenarioId));
        duration = parseInt(getScenarioValue('duration', scenarioId));
        
        results = calculateWealthDevelopment(
            monthlySavings, initialCapital, annualReturn, inflationRate, 
            salaryGrowth, duration, salaryToSavings, includeTax, baseSalary,
            teilfreistellung, etfType
        );
    }

    // Store inputs in scenario object
    scenario.inputs = {
        monthlySavings,
        initialCapital,
        baseSalary,
        annualReturn,
        inflationRate,
        salaryGrowth,
        duration,
        salaryToSavings,
        includeTax,
        savingsMode,
        phases: savingsMode === 'multi-phase' ? getMultiPhaseData(scenarioId) : null
    };
    
    // Also store convenient aliases for withdrawal phase calculations
    scenario.monthlyContribution = monthlySavings;
    scenario.duration = duration;

    // Store results
    scenario.yearlyData = results.yearlyData;
    scenario.results = {
        finalNominal: results.finalNominal,
        finalReal: results.finalReal,
        totalInvested: results.totalInvested,
        totalReturn: results.totalReturn,
        totalTaxesPaid: results.totalTaxesPaid,
        endCapital: results.finalNominal  // Alias for backward compatibility
    };

    // Update salary increase analysis for this scenario
    updateScenarioSalaryAnalysis(scenarioId, baseSalary, salaryGrowth);

    return scenario;
}

/**
 * Calculate wealth development for a single phase with constant monthly savings
 * 
 * @param {number} monthlySavings - Monthly savings amount
 * @param {number} initialCapital - Initial capital amount
 * @param {number} annualReturn - Annual return rate (decimal)
 * @param {number} inflationRate - Inflation rate (decimal)
 * @param {number} salaryGrowth - Annual salary growth rate (decimal)
 * @param {number} duration - Duration in years
 * @param {number} salaryToSavings - Percentage of salary increases going to savings
 * @param {boolean} includeTax - Whether to include tax calculations
 * @param {number} baseSalary - Base salary amount
 * @param {boolean} teilfreistellung - Whether to apply Teilfreistellung
 * @param {string} etfType - ETF type ('thesaurierend' or 'ausschüttend')
 * @returns {Object} Calculation results
 */
function calculateWealthDevelopment(monthlySavings, initialCapital, annualReturn, inflationRate, salaryGrowth, duration, salaryToSavings, includeTax, baseSalary = 60000, teilfreistellung = false, etfType = 'thesaurierend') {
    const monthlyReturn = annualReturn / 12;
    
    let capital = initialCapital;
    let currentMonthlySavings = monthlySavings;
    let currentSalary = baseSalary;
    let totalInvested = initialCapital;
    let cumulativeTaxesPaid = 0;
    
    const yearlyData = [{
        year: 0,
        capital: capital,
        realCapital: capital,
        totalInvested: totalInvested,
        monthlySavings: currentMonthlySavings,
        yearlySalary: currentSalary,
        netSalary: calculateGermanNetSalary(currentSalary),
        taxesPaid: 0,
        cumulativeTaxesPaid: 0
    }];

    for (let year = 1; year <= duration; year++) {
        const startOfYearCapital = capital;
        let yearlyTaxesPaid = 0;
        
        for (let month = 1; month <= 12; month++) {
            // Apply monthly return (no tax applied monthly)
            const monthlyGain = capital * monthlyReturn;
            capital += monthlyGain;
            
            // Add monthly savings
            capital += currentMonthlySavings;
            totalInvested += currentMonthlySavings;
        }
        
        // Apply German ETF taxes annually (more realistic)
        if (includeTax) {
            const annualTax = calculateGermanETFTax(startOfYearCapital, capital, annualReturn, year, teilfreistellung, etfType);
            capital -= annualTax;
            yearlyTaxesPaid = annualTax;
            cumulativeTaxesPaid += annualTax;
        }
        
        // Annual salary increase affects savings rate (realistic calculation with progressive taxation)
        if (year < duration) {
            // Calculate previous net salary
            const previousNetSalary = calculateGermanNetSalary(currentSalary);
            
            // Calculate new gross salary
            const annualSalaryIncrease = currentSalary * salaryGrowth;
            currentSalary += annualSalaryIncrease;
            
            // Calculate new net salary with progressive taxation
            const newNetSalary = calculateGermanNetSalary(currentSalary);
            
            // Calculate actual net increase (accounts for higher tax rates)
            const netSalaryIncrease = newNetSalary - previousNetSalary;
            
            // Apply percentage of NET salary increase to monthly savings
            const monthlySalaryIncrease = (netSalaryIncrease / 12) * salaryToSavings;
            currentMonthlySavings += monthlySalaryIncrease;
        }
        
        // Calculate real value (inflation-adjusted)
        const realCapital = capital / Math.pow(1 + inflationRate, year);
        
        yearlyData.push({
            year: year,
            capital: capital,
            realCapital: realCapital,
            totalInvested: totalInvested,
            monthlySavings: currentMonthlySavings,
            yearlySalary: currentSalary,
            netSalary: calculateGermanNetSalary(currentSalary),
            taxesPaid: yearlyTaxesPaid,
            cumulativeTaxesPaid: cumulativeTaxesPaid
        });
    }

    const finalNominal = capital;
    const finalReal = capital / Math.pow(1 + inflationRate, duration);
    const totalReturn = finalNominal - totalInvested;

    return {
        finalNominal,
        finalReal,
        totalInvested,
        totalReturn,
        totalTaxesPaid: cumulativeTaxesPaid,
        yearlyData
    };
}

/**
 * Calculate wealth development for multiple phases with different savings rates
 * 
 * @param {Array} phases - Array of phase objects with startYear, endYear, monthlySavingsRate
 * @param {number} initialCapital - Initial capital amount
 * @param {number} annualReturn - Annual return rate (decimal)
 * @param {number} inflationRate - Inflation rate (decimal)
 * @param {number} salaryGrowth - Annual salary growth rate (decimal)
 * @param {number} salaryToSavings - Percentage of salary increases going to savings
 * @param {boolean} includeTax - Whether to include tax calculations
 * @param {number} baseSalary - Base salary amount
 * @param {boolean} teilfreistellung - Whether to apply Teilfreistellung
 * @param {string} etfType - ETF type ('thesaurierend' or 'ausschüttend')
 * @returns {Object} Calculation results
 */
function calculateMultiPhaseWealthDevelopment(phases, initialCapital, annualReturn, inflationRate, salaryGrowth, salaryToSavings, includeTax, baseSalary = 60000, teilfreistellung = false, etfType = 'thesaurierend') {
    console.log('Starting multi-phase wealth calculation with phases:', phases);
    
    const monthlyReturn = annualReturn / 12;
    
    let capital = initialCapital;
    let currentSalary = baseSalary;
    let totalInvested = initialCapital;
    let cumulativeTaxesPaid = 0;
    
    const yearlyData = [{
        year: 0,
        capital: capital,
        realCapital: capital,
        totalInvested: totalInvested,
        monthlySavings: 0,
        yearlySalary: currentSalary,
        netSalary: calculateGermanNetSalary(currentSalary),
        taxesPaid: 0,
        cumulativeTaxesPaid: 0,
        currentPhase: null
    }];

    // Determine the maximum duration from all phases
    const maxDuration = Math.max(...phases.map(phase => phase.endYear));
    
    // Reset tax allowance tracking for new calculation
    usedSparerpauschbetrag = 0;

    for (let year = 1; year <= maxDuration; year++) {
        const startOfYearCapital = capital;
        let yearlyTaxesPaid = 0;
        
        // Find which phase applies for this year
        const currentPhase = phases.find(phase => year >= phase.startYear && year <= phase.endYear);
        let currentMonthlySavings = currentPhase ? currentPhase.monthlySavingsRate : 0;
        
        console.log(`Year ${year}: Phase: ${currentPhase ? `${currentPhase.startYear}-${currentPhase.endYear}` : 'none'}, Monthly savings: €${currentMonthlySavings}`);
        
        for (let month = 1; month <= 12; month++) {
            // Apply monthly return
            const monthlyGain = capital * monthlyReturn;
            capital += monthlyGain;
            
            // Add monthly savings if in an active phase
            if (currentMonthlySavings > 0) {
                capital += currentMonthlySavings;
                totalInvested += currentMonthlySavings;
            }
        }
        
        // Apply German ETF taxes annually
        if (includeTax && capital > startOfYearCapital) {
            const annualTax = calculateGermanETFTax(startOfYearCapital, capital, annualReturn, year, teilfreistellung, etfType);
            capital -= annualTax;
            yearlyTaxesPaid = annualTax;
            cumulativeTaxesPaid += annualTax;
        }
        
        // Annual salary increase affects savings rate (apply to all active phases)
        if (year < maxDuration) {
            const previousNetSalary = calculateGermanNetSalary(currentSalary);
            const annualSalaryIncrease = currentSalary * salaryGrowth;
            currentSalary += annualSalaryIncrease;
            const newNetSalary = calculateGermanNetSalary(currentSalary);
            const netSalaryIncrease = newNetSalary - previousNetSalary;
            
            // Apply percentage of NET salary increase to monthly savings
            const monthlySalaryIncrease = (netSalaryIncrease / 12) * salaryToSavings;
            
            // Update phase savings rates proportionally for the current year
            if (monthlySalaryIncrease > 0) {
                console.log(`Year ${year}: Salary increased by €${monthlySalaryIncrease.toFixed(2)}/month`);
                
                // Update the phases array to reflect the salary growth increase
                for (let i = 0; i < phases.length; i++) {
                    // Update phases that are active from current year onwards
                    if (phases[i].endYear >= year) {
                        phases[i].monthlySavingsRate += monthlySalaryIncrease;
                        console.log(`Updated phase ${i+1} (${phases[i].startYear}-${phases[i].endYear}): €${phases[i].monthlySavingsRate.toFixed(2)}/month`);
                    }
                }
                
                // Update current monthly savings if we're in an active phase
                if (currentPhase) {
                    currentMonthlySavings += monthlySalaryIncrease;
                    console.log(`Updated current monthly savings: €${currentMonthlySavings.toFixed(2)}/month`);
                }
            }
        }
        
        // Calculate real value (inflation-adjusted)
        const realCapital = capital / Math.pow(1 + inflationRate, year);
        
        yearlyData.push({
            year: year,
            capital: capital,
            realCapital: realCapital,
            totalInvested: totalInvested,
            monthlySavings: currentMonthlySavings,
            yearlySalary: currentSalary,
            netSalary: calculateGermanNetSalary(currentSalary),
            taxesPaid: yearlyTaxesPaid,
            cumulativeTaxesPaid: cumulativeTaxesPaid,
            currentPhase: currentPhase ? `Phase ${phases.indexOf(currentPhase) + 1}` : 'Keine Phase'
        });
    }

    const finalNominal = capital;
    const finalReal = capital / Math.pow(1 + inflationRate, maxDuration);
    const totalReturn = finalNominal - totalInvested;

    console.log('Multi-phase calculation completed:', {
        finalNominal,
        finalReal,
        totalInvested,
        totalReturn,
        totalTaxesPaid: cumulativeTaxesPaid
    });

    return {
        finalNominal,
        finalReal,
        totalInvested,
        totalReturn,
        totalTaxesPaid: cumulativeTaxesPaid,
        yearlyData,
        phases: phases // Include phase information for chart visualization
    };
}

// Tax functions are now imported from ./tax.js module

/**
 * Update scenario salary analysis display
 * 
 * @param {string} scenarioId - Scenario ID
 * @param {number} baseSalary - Base salary amount
 * @param {number} salaryGrowthRate - Salary growth rate (decimal)
 */
function updateScenarioSalaryAnalysis(scenarioId, baseSalary, salaryGrowthRate) {
    // Calculate current net salary
    const currentNetSalary = calculateGermanNetSalary(baseSalary);
    
    // Calculate salary after increase
    const grossIncrease = baseSalary * salaryGrowthRate;
    const newGrossSalary = baseSalary + grossIncrease;
    const newNetSalary = calculateGermanNetSalary(newGrossSalary);
    
    // Calculate net increase and tax impact
    const netIncrease = newNetSalary - currentNetSalary;
    const taxOnIncrease = grossIncrease - netIncrease;
    const netIncreaseRate = (netIncrease / grossIncrease) * 100;
    
    // Update display for this scenario
    const analysisContainer = document.getElementById(`salaryIncreaseAnalysis_${scenarioId}`);
    if (analysisContainer) {
        const grossIncreaseEl = analysisContainer.querySelector('.gross-increase');
        const netIncreaseEl = analysisContainer.querySelector('.net-increase');
        const taxOnIncreaseEl = analysisContainer.querySelector('.tax-on-increase');
        const netIncreaseRateEl = analysisContainer.querySelector('.net-increase-rate');
        
        if (grossIncreaseEl) grossIncreaseEl.textContent = formatCurrency(grossIncrease);
        if (netIncreaseEl) netIncreaseEl.textContent = formatCurrency(netIncrease);
        if (taxOnIncreaseEl) taxOnIncreaseEl.textContent = formatCurrency(taxOnIncrease);
        if (netIncreaseRateEl) netIncreaseRateEl.textContent = formatGermanNumber(netIncreaseRate, 1) + '%';
        
        // Update color coding based on net rate
        if (netIncreaseEl && netIncreaseRateEl) {
            if (netIncreaseRate >= 70) {
                netIncreaseEl.style.color = '#27ae60'; // Green
                netIncreaseRateEl.style.color = '#27ae60';
            } else if (netIncreaseRate >= 60) {
                netIncreaseEl.style.color = '#f39c12'; // Orange
                netIncreaseRateEl.style.color = '#f39c12';
            } else {
                netIncreaseEl.style.color = '#e74c3c'; // Red
                netIncreaseRateEl.style.color = '#e74c3c';
            }
        }
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
// NOTE: These functions should ideally be imported from separate utility modules
// They are included here for completeness but should be moved to utils modules

/**
 * Parse German formatted number string
 * 
 * @param {string|number} value - Value to parse
 * @returns {number} Parsed number
 */
function parseGermanNumber(value) {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return 0;
    
    // Replace German decimal comma with dot for parsing
    const normalizedValue = value.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(normalizedValue);
    return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format number in German locale
 * 
 * @param {number} value - Value to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number
 */
function formatGermanNumber(value, decimals = 2) {
    if (typeof value !== 'number' || isNaN(value)) return '0';
    return value.toLocaleString('de-DE', { 
        minimumFractionDigits: decimals, 
        maximumFractionDigits: decimals 
    });
}

/**
 * Format currency in German locale
 * 
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency
 */
function formatCurrency(amount) {
    return '€' + amount.toLocaleString('de-DE', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });
}

/**
 * Get scenario input value
 * 
 * @param {string} inputId - Input element ID
 * @param {string} scenarioId - Scenario ID
 * @returns {string} Input value
 */
function getScenarioValue(inputId, scenarioId) {
    const element = document.getElementById(inputId + '_' + scenarioId);
    return element ? element.value : '0';
}

/**
 * Get scenario toggle value
 * 
 * @param {string} toggleId - Toggle element ID
 * @param {string} scenarioId - Scenario ID
 * @returns {boolean} Toggle state
 */
function getScenarioToggleValue(toggleId, scenarioId) {
    const element = document.getElementById(toggleId + '_' + scenarioId);
    return element ? element.classList.contains('active') : false;
}

/**
 * Get scenario ETF type
 * 
 * @param {string} scenarioId - Scenario ID
 * @returns {string} ETF type
 */
function getScenarioETFType(scenarioId) {
    const etfTypeElement = document.querySelector(`input[name="etfType-${scenarioId}"]:checked`);
    if (etfTypeElement) {
        return etfTypeElement.value;
    }
    // Fallback to main ETF type if scenario-specific not found
    const mainEtfTypeElement = document.querySelector('input[name="etfType"]:checked');
    return mainEtfTypeElement ? mainEtfTypeElement.value : 'thesaurierend';
}

/**
 * Get savings mode for scenario
 * 
 * @param {string} scenarioId - Scenario ID
 * @returns {string} Savings mode
 */
function getSavingsMode(scenarioId) {
    const activeModeButton = document.querySelector(`.savings-mode-btn.active[data-scenario="${scenarioId}"]`);
    return activeModeButton ? activeModeButton.dataset.mode : 'simple';
}

/**
 * Get multi-phase data for scenario
 * 
 * @param {string} scenarioId - Scenario ID
 * @returns {Array} Array of phase objects
 */
function getMultiPhaseData(scenarioId) {
    const phases = [];
    
    for (let phase = 1; phase <= 3; phase++) {
        const phaseElement = document.querySelector(`.savings-phase[data-phase="${phase}"][data-scenario="${scenarioId}"]`);
        
        if (phaseElement && phaseElement.classList.contains('active')) {
            const startYear = parseInt(document.querySelector(`.phase-start-year[data-phase="${phase}"][data-scenario="${scenarioId}"]`).value) || 0;
            const endYear = parseInt(document.querySelector(`.phase-end-year[data-phase="${phase}"][data-scenario="${scenarioId}"]`).value) || 0;
            const savingsRate = parseGermanNumber(document.querySelector(`.phase-savings-rate[data-phase="${phase}"][data-scenario="${scenarioId}"]`).value) || 0;
            
            phases.push({
                startYear: startYear,
                endYear: endYear,
                monthlySavingsRate: savingsRate
            });
        }
    }
    
    return phases;
}

// ============================================================================
// EXPORTS
// ============================================================================

// Export functions for use in other modules
// (In ES6 modules, these would be exported using export statement)
if (typeof module !== 'undefined' && module.exports) {
    // CommonJS exports
    module.exports = {
        runScenario,
        calculateWealthDevelopment,
        calculateMultiPhaseWealthDevelopment,
        updateScenarioSalaryAnalysis,
        parseGermanNumber,
        formatGermanNumber,
        formatCurrency,
        getScenarioValue,
        getScenarioToggleValue,
        getScenarioETFType,
        getSavingsMode,
        getMultiPhaseData
    };
}

// For browser usage, attach to window object
if (typeof window !== 'undefined') {
    window.AccumulationCalculations = {
        runScenario,
        calculateWealthDevelopment,
        calculateMultiPhaseWealthDevelopment,
        updateScenarioSalaryAnalysis,
        parseGermanNumber,
        formatGermanNumber,
        formatCurrency,
        getScenarioValue,
        getScenarioToggleValue,
        getScenarioETFType,
        getSavingsMode,
        getMultiPhaseData
    };
}