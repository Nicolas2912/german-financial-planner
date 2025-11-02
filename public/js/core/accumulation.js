/**
 * Accumulation Phase Calculations
 * 
 * This module contains all calculation functions related to the accumulation phase
 * of wealth development, extracted from the main app.js file.
 */

// Import utility functions
import { parseGermanNumber, formatGermanNumber, formatCurrency } from '../utils.js';

// Import tax calculation functions
import { applyCapitalGainsTax, calculateGermanNetSalary, normalizeEtfType, resetETFTaxAllowance, TAX_CONSTANTS } from './tax.js';

const MONTHS_PER_YEAR = 12;
const DISTRIBUTION_YIELD_ANNUAL = 0.02;

function computeMonthlyRate(annualRate = 0) {
    const sanitized = Number(annualRate) || 0;
    if (Math.abs(sanitized) < 1e-8) {
        return sanitized / MONTHS_PER_YEAR;
    }
    return Math.pow(1 + sanitized, 1 / MONTHS_PER_YEAR) - 1;
}

function computeAnnualizedReturn(cashFlows, periodsPerYear = MONTHS_PER_YEAR) {
    if (!Array.isArray(cashFlows) || cashFlows.length === 0) {
        return 0;
    }

    const hasPositive = cashFlows.some(value => value > 0);
    const hasNegative = cashFlows.some(value => value < 0);
    if (!hasPositive || !hasNegative) {
        return 0;
    }

    const tolerance = 1e-7;
    let rate = 0.05 / periodsPerYear;

    for (let iteration = 0; iteration < 100; iteration++) {
        let npv = 0;
        let derivative = 0;

        for (let t = 0; t < cashFlows.length; t++) {
            const discount = Math.pow(1 + rate, t);
            npv += cashFlows[t] / discount;
            if (t > 0) {
                derivative -= t * cashFlows[t] / Math.pow(1 + rate, t + 1);
            }
        }

        if (Math.abs(npv) < tolerance) {
            return Math.pow(1 + rate, periodsPerYear) - 1;
        }

        if (Math.abs(derivative) < 1e-12) {
            break;
        }

        const nextRate = rate - npv / derivative;
        if (!Number.isFinite(nextRate) || nextRate <= -0.9999) {
            break;
        }
        rate = nextRate;
    }

    const evaluate = (r) => {
        let npv = 0;
        for (let t = 0; t < cashFlows.length; t++) {
            npv += cashFlows[t] / Math.pow(1 + r, t);
        }
        return npv;
    };

    let low = -0.9999;
    let high = 10;
    let npvLow = evaluate(low);
    let npvHigh = evaluate(high);

    if (npvLow * npvHigh > 0) {
        return 0;
    }

    for (let iteration = 0; iteration < 200; iteration++) {
        const mid = (low + high) / 2;
        const npvMid = evaluate(mid);
        if (Math.abs(npvMid) < tolerance) {
            return Math.pow(1 + mid, periodsPerYear) - 1;
        }
        if (npvLow * npvMid < 0) {
            high = mid;
            npvHigh = npvMid;
        } else {
            low = mid;
            npvLow = npvMid;
        }
    }

    const approximateRate = (low + high) / 2;
    return Math.pow(1 + approximateRate, periodsPerYear) - 1;
}

function normalizePhases(phases = []) {
    return phases
        .filter(phase => phase && Number.isFinite(parseFloat(phase.startYear)))
        .map(phase => {
            const startYear = Math.max(1, parseInt(phase.startYear, 10) || 1);
            const endYear = Math.max(startYear, parseInt(phase.endYear, 10) || startYear);
            return {
                startYear,
                endYear,
                monthlySavingsRate: Number(phase.monthlySavingsRate || 0),
                annualReturn: (typeof phase.annualReturn === 'number' && !Number.isNaN(phase.annualReturn)) ? phase.annualReturn : null
            };
        });
}

function simulateAccumulationPhase({
    initialCapital,
    durationYears,
    defaultAnnualReturn,
    inflationRate,
    initialMonthlyContribution,
    salaryGrowth,
    salaryToSavings,
    includeTax,
    baseSalary,
    teilfreistellung,
    etfType,
    phases
}) {
    const normalizedPhases = normalizePhases(phases);
    const effectiveEtfType = normalizeEtfType(etfType);
    const duration = Math.max(0, Number.isFinite(durationYears) ? durationYears : 0);
    const totalYears = normalizedPhases.length > 0
        ? Math.max(duration, Math.max(...normalizedPhases.map(phase => phase.endYear)))
        : duration;
    const effectiveYears = Math.max(0, Math.round(totalYears));
    const totalMonths = effectiveYears * MONTHS_PER_YEAR;

    resetETFTaxAllowance();

    const teilfreistellungRate = teilfreistellung ? TAX_CONSTANTS.TEILFREISTELLUNG_EQUITY : 0;
    const distributionMonthlyRate = (effectiveEtfType === 'ausschüttend') ? computeMonthlyRate(DISTRIBUTION_YIELD_ANNUAL) : 0;

    let balance = initialCapital;
    let costBasis = initialCapital;
    let currentSalary = baseSalary;
    let currentMonthlyContribution = initialMonthlyContribution;
    let totalTaxesPaid = 0;
    let totalUserContributions = initialCapital;

    const yearlyData = [{
        year: 0,
        capital: balance,
        realCapital: balance,
        totalInvested: totalUserContributions,
        monthlySavings: initialMonthlyContribution,
        yearlySalary: currentSalary,
        netSalary: calculateGermanNetSalary(currentSalary),
        taxesPaid: 0,
        cumulativeTaxesPaid: 0,
        costBasis
    }];

    const cashFlows = new Array(totalMonths + 1).fill(0);
    cashFlows[0] = -(initialCapital || 0);

    const phaseAdjustments = normalizedPhases.map(() => 0);

    let yearlyStartCapital = balance;
    let yearlyDeposits = 0;
    let yearlyTaxPaid = 0;
    let lastMonthlyContribution = initialMonthlyContribution;

    for (let monthIndex = 0; monthIndex < totalMonths; monthIndex++) {
        const yearNumber = Math.floor(monthIndex / MONTHS_PER_YEAR) + 1;
        const monthWithinYear = monthIndex % MONTHS_PER_YEAR;

        let monthlyContribution;
        let annualReturn = defaultAnnualReturn;

        if (normalizedPhases.length > 0) {
            const phaseIndex = normalizedPhases.findIndex(phase => yearNumber >= phase.startYear && yearNumber <= phase.endYear);
            if (phaseIndex !== -1) {
                const baseContribution = normalizedPhases[phaseIndex].monthlySavingsRate;
                const adjustment = phaseAdjustments[phaseIndex] || 0;
                monthlyContribution = Math.max(0, baseContribution + adjustment);
                if (typeof normalizedPhases[phaseIndex].annualReturn === 'number' && !Number.isNaN(normalizedPhases[phaseIndex].annualReturn)) {
                    annualReturn = normalizedPhases[phaseIndex].annualReturn;
                }
            } else {
                monthlyContribution = 0;
            }
        } else {
            monthlyContribution = Math.max(0, currentMonthlyContribution);
        }

        lastMonthlyContribution = monthlyContribution;

        const monthlyReturn = computeMonthlyRate(annualReturn);
        if (monthlyReturn !== 0 && balance !== 0) {
            balance *= (1 + monthlyReturn);
        }

        if (includeTax && distributionMonthlyRate > 0 && balance > 0 && effectiveEtfType === 'ausschüttend') {
            const grossDistribution = balance * distributionMonthlyRate;
            if (grossDistribution > 0) {
                balance -= grossDistribution;
                const taxable = grossDistribution * (1 - teilfreistellungRate);
                const { tax } = applyCapitalGainsTax(taxable);
                const netDistribution = grossDistribution - tax;
                balance += netDistribution;
                costBasis += netDistribution;
                totalTaxesPaid += tax;
                yearlyTaxPaid += tax;
                if (costBasis > balance) {
                    costBasis = balance;
                }
            }
        }

        if (monthlyContribution > 0) {
            balance += monthlyContribution;
            costBasis += monthlyContribution;
            totalUserContributions += monthlyContribution;
            yearlyDeposits += monthlyContribution;
            cashFlows[monthIndex + 1] -= monthlyContribution;
        }

        if (costBasis > balance) {
            costBasis = balance;
        }
        if (costBasis < 0) {
            costBasis = 0;
        }

        const isYearEnd = (monthWithinYear === MONTHS_PER_YEAR - 1) || (monthIndex === totalMonths - 1);
        if (isYearEnd) {
            if (includeTax && effectiveEtfType === 'thesaurierend') {
                const basisertrag = yearlyStartCapital * TAX_CONSTANTS.BASISZINS * 0.7;
                const capitalGains = Math.max(0, balance - (yearlyStartCapital + yearlyDeposits));
                const vorabpauschale = Math.max(0, Math.min(basisertrag, capitalGains));
                if (vorabpauschale > 0) {
                    const taxable = vorabpauschale * (1 - teilfreistellungRate);
                    const { tax } = applyCapitalGainsTax(taxable);
                    if (tax > 0) {
                        balance -= tax;
                        totalTaxesPaid += tax;
                        yearlyTaxPaid += tax;
                        if (balance < 0) {
                            balance = 0;
                        }
                        if (costBasis > balance) {
                            costBasis = balance;
                        }
                    }
                }
            }

            const realCapital = (1 + inflationRate) > 0 ? balance / Math.pow(1 + inflationRate, yearNumber) : balance;
            yearlyData.push({
                year: yearNumber,
                capital: balance,
                realCapital,
                totalInvested: totalUserContributions,
                monthlySavings: lastMonthlyContribution,
                yearlySalary: currentSalary,
                netSalary: calculateGermanNetSalary(currentSalary),
                taxesPaid: yearlyTaxPaid,
                cumulativeTaxesPaid: totalTaxesPaid,
                costBasis
            });

            yearlyStartCapital = balance;
            yearlyDeposits = 0;
            yearlyTaxPaid = 0;
            resetETFTaxAllowance();

            if (salaryGrowth > 0 && salaryToSavings > 0 && yearNumber < effectiveYears) {
                const previousNetSalary = calculateGermanNetSalary(currentSalary);
                currentSalary *= (1 + salaryGrowth);
                const newNetSalary = calculateGermanNetSalary(currentSalary);
                const netIncrease = newNetSalary - previousNetSalary;
                const monthlyIncrease = (netIncrease / MONTHS_PER_YEAR) * salaryToSavings;
                if (monthlyIncrease > 0) {
                    if (normalizedPhases.length === 0) {
                        currentMonthlyContribution += monthlyIncrease;
                    } else {
                        normalizedPhases.forEach((phase, index) => {
                            if (phase.endYear >= yearNumber + 1) {
                                phaseAdjustments[index] = (phaseAdjustments[index] || 0) + monthlyIncrease;
                            }
                        });
                    }
                }
            }
        }
    }

    if (cashFlows.length > 0) {
        cashFlows[cashFlows.length - 1] += balance;
    }

    const effectiveDurationYears = totalMonths / MONTHS_PER_YEAR;
    const finalNominal = balance;
    const finalReal = (1 + inflationRate) > 0
        ? finalNominal / Math.pow(1 + inflationRate, effectiveDurationYears)
        : finalNominal;
    const totalReturn = finalNominal - totalUserContributions;
    const annualizedReturn = computeAnnualizedReturn(cashFlows, MONTHS_PER_YEAR);

    return {
        finalNominal,
        finalReal,
        totalInvested: totalUserContributions,
        totalReturn,
        totalTaxesPaid,
        yearlyData,
        costBasis,
        annualizedReturn,
        phases: normalizedPhases,
        durationYears: effectiveYears
    };
}

/**
 * Main scenario calculation function
 * Determines the calculation mode and runs the appropriate wealth development calculation
 * 
 * @param {Object} scenario - The scenario object containing configuration
 * @returns {Object} The scenario object with updated results
 */
export function runScenario(scenario) {
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
        costBasis: results.costBasis,
        annualizedReturn: results.annualizedReturn,
        durationYears: results.durationYears,
        endCapital: results.finalNominal  // Alias for backward compatibility
    };

    scenario.costBasis = results.costBasis;
    scenario.annualizedReturn = results.annualizedReturn;

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
export function calculateWealthDevelopment(monthlySavings, initialCapital, annualReturn, inflationRate, salaryGrowth, duration, salaryToSavings, includeTax, baseSalary = 60000, teilfreistellung = false, etfType = 'thesaurierend') {
    return simulateAccumulationPhase({
        initialCapital,
        durationYears: duration,
        defaultAnnualReturn: annualReturn,
        inflationRate,
        initialMonthlyContribution: monthlySavings,
        salaryGrowth,
        salaryToSavings,
        includeTax,
        baseSalary,
        teilfreistellung,
        etfType,
        phases: []
    });
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
    return simulateAccumulationPhase({
        initialCapital,
        durationYears: 0,
        defaultAnnualReturn: annualReturn,
        inflationRate,
        initialMonthlyContribution: 0,
        salaryGrowth,
        salaryToSavings,
        includeTax,
        baseSalary,
        teilfreistellung,
        etfType,
        phases
    });
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
// SCENARIO HELPER FUNCTIONS
// ============================================================================

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
            // Parse per-phase annual return from the text input; allow comma decimal
            const returnRaw = (document.querySelector(`.phase-return-rate[data-phase="${phase}"][data-scenario="${scenarioId}"]`)?.value || '').toString().trim();
            const parsedReturnPct = returnRaw ? parseFloat(returnRaw.replace(/\s+/g, '').replace(',', '.')) : NaN;
            const annualReturnPhase = isNaN(parsedReturnPct) ? null : (parsedReturnPct / 100);
            
            phases.push({
                startYear: startYear,
                endYear: endYear,
                monthlySavingsRate: savingsRate,
                annualReturn: annualReturnPhase
            });
        }
    }
    
    return phases;
}

// (Removed legacy CommonJS and window exports — ES modules are used across the app)
