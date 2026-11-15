/**
 * Withdrawal Phase Calculation Functions
 * 
 * This module contains all the calculation functions for the withdrawal phase
 * of the German Financial Planner application.
 * 
 * These functions handle:
 * - Direct annuity payment calculations
 * - Withdrawal plan calculations with tax considerations
 * - Inflation adjustments
 * - German tax calculations (Abgeltungssteuer, Teilfreistellung)
 * - Withdrawal simulations
 */

import { formatCurrency, parseGermanNumber } from '../utils.js';

/**
 * Calculate exact annuity payment using direct mathematical formula
 * Formula: PMT = PV × [r(1+r)^n] / [(1+r)^n - 1]
 * 
 * This calculates the payment amount that will exactly deplete the present value
 * over the specified number of periods at the given interest rate.
 * 
 * @param {number} presentValue - The initial capital amount
 * @param {number} periods - Number of withdrawal periods (years)
 * @param {number} interestRate - Annual interest rate (as decimal, e.g., 0.05 for 5%)
 * @returns {number} Annual payment amount
 */
export function calculateDirectAnnuityPayment(presentValue, periods, interestRate) {
    // Input validation
    if (presentValue <= 0) throw new Error('Present value must be positive');
    if (periods <= 0) throw new Error('Number of periods must be positive');
    if (isNaN(interestRate)) throw new Error('Interest rate must be a valid number');
    
    // Handle special case: zero or very low interest rate
    if (Math.abs(interestRate) < 0.0001) {
        console.log(`🔢 Near-zero interest rate (${(interestRate*100).toFixed(4)}%), using simple division`);
        return presentValue / periods; // Simple division when no meaningful growth
    }
    
    // Handle negative interest rates (deflation scenario)
    if (interestRate < 0) {
        console.log(`⚠️ Negative interest rate detected: ${(interestRate*100).toFixed(2)}%`);
        // For negative rates, the formula still works but results in lower payments
    }
    
    // Standard annuity formula
    const onePlusR = 1 + interestRate;
    const onePlusRToPowerN = Math.pow(onePlusR, periods);
    const numerator = interestRate * onePlusRToPowerN;
    const denominator = onePlusRToPowerN - 1;
    
    // Avoid division by zero in edge cases
    if (Math.abs(denominator) < 1e-10) {
        console.log(`⚠️ Denominator very close to zero, using fallback calculation`);
        return presentValue / periods;
    }
    
    const annuityPayment = presentValue * (numerator / denominator);
    
    console.log(`🔢 Direct annuity formula:`);
    console.log(`   Present Value: €${presentValue.toLocaleString()}`);
    console.log(`   Interest Rate: ${(interestRate*100).toFixed(3)}% per period`);
    console.log(`   Number of Periods: ${periods}`);
    console.log(`   Factor: ${(numerator/denominator).toFixed(6)}`);
    console.log(`   Annual Payment: €${annuityPayment.toFixed(2)}`);
    console.log(`   Monthly Payment: €${(annuityPayment/12).toFixed(2)}`);
    
    // Sanity check: payment should be reasonable
    const minExpected = presentValue / (periods * 2); // Very conservative minimum
    const maxExpected = presentValue; // Maximum would be paying entire amount in first year
    
    if (annuityPayment < minExpected || annuityPayment > maxExpected) {
        console.warn(`⚠️ Calculated payment seems unreasonable: €${annuityPayment.toFixed(2)}`);
        console.warn(`   Expected range: €${minExpected.toFixed(2)} - €${maxExpected.toFixed(2)}`);
    }
    
    return annuityPayment;
}

/**
 * Calculate the real interest rate adjusted for inflation
 * Real Rate = (1 + Nominal Rate) / (1 + Inflation Rate) - 1
 * 
 * @param {number} nominalRate - Nominal interest rate (as decimal)
 * @param {number} inflationRate - Inflation rate (as decimal)
 * @returns {number} Real interest rate (as decimal)
 */
export function calculateRealInterestRate(nominalRate, inflationRate) {
    return (1 + nominalRate) / (1 + inflationRate) - 1;
}

/**
 * Adjust withdrawal amount for inflation and returns when taxes are disabled
 * This solves for the withdrawal amount that achieves zero final balance without taxes
 * 
 * @param {number} initialGuess - Initial withdrawal amount guess
 * @param {number} presentValue - Initial capital
 * @param {number} periods - Number of withdrawal periods
 * @param {number} interestRate - Annual interest rate
 * @param {number} inflationRate - Annual inflation rate
 * @param {boolean} includeTax - Whether to include tax calculations
 * @param {number|Array<{value: number, cost: number}>} userDefinedTotalContributions - Cost basis, or purchase lots oldest first
 * @returns {number} Adjusted withdrawal amount
 */
export function adjustForInflationAndReturns(initialGuess, presentValue, periods, interestRate, inflationRate, includeTax, userDefinedTotalContributions) {
    console.log(`📈 Adjusting for inflation effects without taxes`);
    
    let withdrawal = initialGuess;
    let previousWithdrawal = withdrawal;
    
    // Newton-Raphson iteration
    for (let iteration = 0; iteration < 20; iteration++) {
        // Calculate final capital with current withdrawal guess
        const simulation = simulateWithdrawal(presentValue, periods, interestRate, inflationRate, includeTax, withdrawal, userDefinedTotalContributions);
        const finalCapital = simulation.finalCapital;
        
        // If we're close enough to zero, we're done
        if (Math.abs(finalCapital) < 1) {
            console.log(`🎯 Inflation adjustment converged in ${iteration} iterations: Final capital = €${finalCapital.toFixed(2)}`);
            return withdrawal;
        }
        
        // Calculate derivative (numerical approximation)
        const deltaWithdrawal = withdrawal * 0.001; // 0.1% change
        const simulation2 = simulateWithdrawal(presentValue, periods, interestRate, inflationRate, includeTax, withdrawal + deltaWithdrawal, userDefinedTotalContributions);
        const finalCapital2 = simulation2.finalCapital;
        const derivative = (finalCapital2 - finalCapital) / deltaWithdrawal;
        
        // Newton-Raphson update: x_new = x_old - f(x)/f'(x)
        // We want f(x) = finalCapital = 0, so we adjust withdrawal
        if (Math.abs(derivative) > 0.001) {
            previousWithdrawal = withdrawal;
            withdrawal = withdrawal - (finalCapital / derivative);
            
            // Prevent unreasonable changes
            const maxChange = initialGuess * 0.2; // Max 20% change per iteration
            if (Math.abs(withdrawal - previousWithdrawal) > maxChange) {
                withdrawal = previousWithdrawal + Math.sign(withdrawal - previousWithdrawal) * maxChange;
            }
            
            // Ensure withdrawal stays positive
            withdrawal = Math.max(withdrawal, initialGuess * 0.1);
            
            console.log(`🔄 Iteration ${iteration}: Withdrawal = €${withdrawal.toFixed(2)}, Final capital = €${finalCapital.toFixed(2)}`);
        } else {
            console.log(`⚠️ Derivative too small, stopping iteration`);
            break;
        }
        
        // Check for convergence in withdrawal amount
        if (Math.abs(withdrawal - previousWithdrawal) < 0.01) {
            console.log(`✅ Withdrawal amount converged in ${iteration} iterations`);
            break;
        }
    }
    
    return withdrawal;
}

/**
 * Adjust withdrawal amount for German taxes using Newton-Raphson method
 * This solves for the withdrawal amount that achieves zero final balance after taxes
 * 
 * @param {number} initialGuess - Initial withdrawal amount guess
 * @param {number} presentValue - Initial capital
 * @param {number} periods - Number of withdrawal periods
 * @param {number} interestRate - Annual interest rate
 * @param {number} inflationRate - Annual inflation rate
 * @param {number} taxFreeAllowance - Annual tax-free allowance (€1,000)
 * @param {number} taxRate - Tax rate (25% Abgeltungssteuer)
 * @param {number|Array<{value: number, cost: number}>} userDefinedTotalContributions - Cost basis, or purchase lots oldest first
 * @returns {number} Adjusted withdrawal amount
 */
export function adjustForTaxes(initialGuess, presentValue, periods, interestRate, inflationRate, taxFreeAllowance, taxRate, userDefinedTotalContributions) {
    console.log(`🇩🇪 Adjusting for German taxes (${(taxRate*100).toFixed(3)}% on gains above €${taxFreeAllowance})`);
    
    let withdrawal = initialGuess;
    let previousWithdrawal = withdrawal;
    
    // Newton-Raphson iteration
    for (let iteration = 0; iteration < 20; iteration++) {
        // Calculate final capital with current withdrawal guess
        const simulation = simulateWithdrawal(presentValue, periods, interestRate, inflationRate, true, withdrawal, userDefinedTotalContributions);
        const finalCapital = simulation.finalCapital;
        
        // If we're close enough to zero, we're done
        if (Math.abs(finalCapital) < 1) {
            console.log(`🎯 Tax adjustment converged in ${iteration} iterations: Final capital = €${finalCapital.toFixed(2)}`);
            return withdrawal;
        }
        
        // Calculate derivative (numerical approximation)
        const deltaWithdrawal = withdrawal * 0.001; // 0.1% change
        const simulation2 = simulateWithdrawal(presentValue, periods, interestRate, inflationRate, true, withdrawal + deltaWithdrawal, userDefinedTotalContributions);
        const finalCapital2 = simulation2.finalCapital;
        const derivative = (finalCapital2 - finalCapital) / deltaWithdrawal;
        
        // Newton-Raphson update: x_new = x_old - f(x)/f'(x)
        // We want f(x) = finalCapital = 0, so we adjust withdrawal
        if (Math.abs(derivative) > 0.001) {
            previousWithdrawal = withdrawal;
            withdrawal = withdrawal - (finalCapital / derivative);
            
            // Prevent unreasonable changes
            const maxChange = initialGuess * 0.2; // Max 20% change per iteration
            if (Math.abs(withdrawal - previousWithdrawal) > maxChange) {
                withdrawal = previousWithdrawal + Math.sign(withdrawal - previousWithdrawal) * maxChange;
            }
            
            // Ensure withdrawal stays positive
            withdrawal = Math.max(withdrawal, initialGuess * 0.1);
            
            console.log(`🔄 Iteration ${iteration}: Withdrawal = €${withdrawal.toFixed(2)}, Final capital = €${finalCapital.toFixed(2)}`);
        } else {
            console.log(`⚠️ Derivative too small, stopping iteration`);
            break;
        }
        
        // Check for convergence in withdrawal amount
        if (Math.abs(withdrawal - previousWithdrawal) < 0.01) {
            console.log(`✅ Withdrawal amount converged in ${iteration} iterations`);
            break;
        }
    }
    
    return withdrawal;
}

/**
 * Print a detailed summary of the withdrawal calculation for user understanding
 * 
 * @param {number} initialCapital - Initial capital amount
 * @param {number} duration - Withdrawal duration in years
 * @param {number} annualReturn - Annual return rate
 * @param {number} inflationRate - Annual inflation rate
 * @param {boolean} includeTax - Whether taxes are included
 * @param {number} baseAnnualWithdrawal - Base annual withdrawal amount
 * @param {Object} results - Calculation results
 */
export function printCalculationSummary(initialCapital, duration, annualReturn, inflationRate, includeTax, baseAnnualWithdrawal, results) {
    console.log(`\n📋 ===== WITHDRAWAL CALCULATION SUMMARY =====`);
    console.log(`💼 Starting Portfolio: €${initialCapital.toLocaleString()}`);
    console.log(`⏱️ Withdrawal Period: ${duration} years`);
    console.log(`📈 Expected Annual Return: ${(annualReturn*100).toFixed(1)}%`);
    console.log(`📊 Inflation Rate: ${(inflationRate*100).toFixed(1)}%`);

    console.log(`🇩🇪 German Taxes Applied: ${includeTax ? 'Yes' : 'No'}`);
    console.log(`\n💳 WITHDRAWAL AMOUNTS:`);
    console.log(`   Year 1 Annual Withdrawal: €${baseAnnualWithdrawal.toFixed(2)}`);
    console.log(`   Year 1 Monthly Withdrawal: €${(baseAnnualWithdrawal/12).toFixed(2)}`);
    console.log(`   Final Year Withdrawal: €${(baseAnnualWithdrawal * Math.pow(1 + inflationRate, duration - 1)).toFixed(2)}`);
    console.log(`\n💼 FINAL RESULTS:`);
    console.log(`   Portfolio End Value: €${results.finalCapital.toFixed(2)}`);
    console.log(`   Total Taxes Paid: €${results.totalTaxesPaid.toFixed(2)}`);
    console.log(`   Average Monthly Net: €${results.monthlyNetWithdrawal.toFixed(2)}`);
    console.log(`   Real Purchasing Power: €${results.realPurchasingPower.toFixed(2)} (in today's money)`);
    
    // Calculate some additional insights
    const totalWithdrawn = results.yearlyData.reduce((sum, year) => sum + year.grossWithdrawal, 0);
    const effectiveYield = totalWithdrawn / initialCapital;
    const realRate = calculateRealInterestRate(annualReturn, inflationRate);
    
    console.log(`\n🧮 CALCULATION INSIGHTS:`);
    console.log(`   Total Amount Withdrawn: €${totalWithdrawn.toFixed(2)}`);
    console.log(`   Effective Yield: ${(effectiveYield*100).toFixed(1)}% of initial capital`);
    console.log(`   Real Interest Rate: ${(realRate*100).toFixed(2)}% (inflation-adjusted)`);
    console.log(`   Tax Efficiency: ${((1 - results.totalTaxesPaid/totalWithdrawn)*100).toFixed(1)}%`);
    
    if (Math.abs(results.finalCapital) > 100) {
        console.warn(`⚠️ WARNING: Portfolio not fully depleted! Remaining: €${results.finalCapital.toFixed(2)}`);
        console.warn(`   This suggests the calculation may need refinement.`);
    } else if (Math.abs(results.finalCapital) < 1) {
        console.log(`✅ EXCELLENT: Portfolio depleted within €${Math.abs(results.finalCapital).toFixed(2)} of target.`);
    }
    
    console.log(`====================================\n`);
}

/**
 * Calculate withdrawal plan with tax considerations
 * 
 * @param {number} initialCapital - Initial capital amount
 * @param {number} duration - Withdrawal duration in years
 * @param {number} annualReturn - Annual return rate (as decimal)
 * @param {number} inflationRate - Annual inflation rate (as decimal)
 * @param {boolean} includeTax - Whether to include German tax calculations
 * @param {number|Array<{value: number, cost: number}>} userDefinedTotalContributions - Cost basis, or purchase lots oldest first
 * @returns {Object} Withdrawal plan results
 */
export function calculateWithdrawalPlan(initialCapital, duration, annualReturn, inflationRate, includeTax, userDefinedTotalContributions) {
    const TAX_FREE_ALLOWANCE = 1000; // Sparerpauschbetrag
    // Unknown cost basis: assume 60% of the capital was paid in. Purchase lots pass through unchanged.
    if (!Array.isArray(userDefinedTotalContributions)) {
        userDefinedTotalContributions = Number.isFinite(userDefinedTotalContributions) ? userDefinedTotalContributions : initialCapital * 0.6;
    }
    const TAX_RATE = 0.25; // Abgeltungssteuer
    
    console.log(`🧮 Starting direct mathematical calculation...`);
    console.log(`Parameters: Capital=€${initialCapital.toLocaleString()}, Duration=${duration}y, Return=${(annualReturn*100).toFixed(1)}%, Inflation=${(inflationRate*100).toFixed(1)}%`);
    const startingCostBasis = buildWithdrawalLots(initialCapital, userDefinedTotalContributions).reduce((sum, lot) => sum + lot.cost, 0);
    console.log(`Cost Basis: €${startingCostBasis.toLocaleString()}, Unrealized Gains: €${(initialCapital - startingCostBasis).toLocaleString()}`);
    
    // Step 1: Calculate base withdrawal using direct annuity formula
    // We need to adjust for inflation-adjusted withdrawals by using the real return rate
    const realReturnRate = calculateRealInterestRate(annualReturn, inflationRate);
    let baseAnnualWithdrawal = calculateDirectAnnuityPayment(initialCapital, duration, realReturnRate);
    console.log(`📊 Base annuity calculation (real return ${(realReturnRate*100).toFixed(2)}%): €${baseAnnualWithdrawal.toFixed(2)}/year (€${(baseAnnualWithdrawal/12).toFixed(2)}/month)`);
    
    // Step 2: Adjust withdrawal amount to achieve exactly 0€ at the end
    // This is needed for both tax and no-tax scenarios due to inflation adjustments
    if (includeTax) {
        baseAnnualWithdrawal = adjustForTaxes(baseAnnualWithdrawal, initialCapital, duration, annualReturn, inflationRate, TAX_FREE_ALLOWANCE, TAX_RATE, userDefinedTotalContributions);
        console.log(`💰 Tax-adjusted withdrawal: €${baseAnnualWithdrawal.toFixed(2)}/year (€${(baseAnnualWithdrawal/12).toFixed(2)}/month)`);
    } else {
        // Even without taxes, we need to adjust for inflation effects
        baseAnnualWithdrawal = adjustForInflationAndReturns(baseAnnualWithdrawal, initialCapital, duration, annualReturn, inflationRate, includeTax, userDefinedTotalContributions);
        console.log(`📈 Inflation-adjusted withdrawal: €${baseAnnualWithdrawal.toFixed(2)}/year (€${(baseAnnualWithdrawal/12).toFixed(2)}/month)`);
    }
    
    // Step 3: Run final simulation to get complete results
    const finalResults = simulateWithdrawal(initialCapital, duration, annualReturn, inflationRate, includeTax, baseAnnualWithdrawal, userDefinedTotalContributions);
    console.log(`✅ Final portfolio value: €${finalResults.finalCapital.toFixed(2)} (Target: €0)`);
    
    // Step 4: Provide calculation summary
    printCalculationSummary(initialCapital, duration, annualReturn, inflationRate, includeTax, baseAnnualWithdrawal, finalResults);
    
    return finalResults;
}

/**
 * Purchase lots for the withdrawal phase, oldest first, scaled to the withdrawal capital.
 * A single cost basis becomes one lot; an unknown cost basis assumes 60% of the capital was paid in.
 *
 * @param {number} initialCapital - Capital at the start of the withdrawal phase
 * @param {number|Array<{value: number, cost: number}>} costBasisOrLots - Cost basis or purchase lots
 * @returns {Array<{value: number, cost: number}>} Lots whose values add up to the capital
 */
export function buildWithdrawalLots(initialCapital, costBasisOrLots) {
    if (Array.isArray(costBasisOrLots)) {
        const valid = costBasisOrLots.filter(lot => lot && Number(lot.value) > 0 && Number.isFinite(Number(lot.cost)));
        const totalValue = valid.reduce((sum, lot) => sum + Number(lot.value), 0);
        if (totalValue > 0) {
            const scale = initialCapital / totalValue;
            return valid.map(lot => ({
                value: Number(lot.value) * scale,
                cost: Math.max(0, Number(lot.cost)) * scale
            }));
        }
    }
    const costBasis = Number.isFinite(costBasisOrLots) ? costBasisOrLots : initialCapital * 0.6;
    return [{ value: initialCapital, cost: Math.max(0, costBasis) }];
}

/**
 * Simulate withdrawal with German tax calculations
 * 
 * @param {number} initialCapital - Initial capital amount
 * @param {number} duration - Withdrawal duration in years
 * @param {number} annualReturn - Annual return rate (as decimal)
 * @param {number} inflationRate - Annual inflation rate (as decimal)
 * @param {boolean} includeTax - Whether to include German tax calculations
 * @param {number} baseAnnualWithdrawal - Base annual withdrawal amount
 * @param {number|Array<{value: number, cost: number}>} userDefinedTotalContributions - Cost basis, or purchase lots oldest first
 * @returns {Object} Simulation results with yearly data
 */
export function simulateWithdrawal(initialCapital, duration, annualReturn, inflationRate, includeTax, baseAnnualWithdrawal, userDefinedTotalContributions) {
    const TAX_FREE_ALLOWANCE = 1000; // Annual tax-free allowance for capital gains
    const BASE_TAX_RATE = 0.25; // 25% Abgeltungssteuer
    const EFFECTIVE_TAX_RATE = BASE_TAX_RATE; // 25%
    const TEILFREISTELLUNG_EQUITY = 0.30; // 30% partial exemption for equity ETFs
    
    // Input validation with better error messages
    if (initialCapital <= 0) throw new Error('Initial capital must be positive');
    if (duration <= 0) throw new Error('Duration must be positive');
    if (isNaN(annualReturn)) throw new Error('Annual return must be a valid number');
    if (isNaN(baseAnnualWithdrawal) || baseAnnualWithdrawal <= 0) throw new Error('Base annual withdrawal must be positive');
    
    let capital = initialCapital;
    // Purchase lots, oldest first; sales follow first-in-first-out (§20 Abs. 4 EStG)
    const lots = buildWithdrawalLots(initialCapital, userDefinedTotalContributions);
    const initialCostBasis = lots.reduce((sum, lot) => sum + lot.cost, 0);
    let remainingCostBasis = initialCostBasis;
    // Taxable losses are carried forward and offset later gains (Verlustverrechnung)
    let lossCarryforward = 0;
    let totalTaxesPaid = 0;
    let totalRealNetWithdrawals = 0;
    let totalNetWithdrawals = 0;
    let annualTaxFreeAllowanceUsed = 0; // Track annual tax-free allowance usage (resets each year)
    
    // Get Teilfreistellung rate - Default to 30% for equity ETFs
    let teilfreistellungRate = 0;
    if (includeTax) {
        // Try to get withdrawal-specific Teilfreistellung rate
        if (typeof document !== 'undefined') {
            const teilfreistellungRateElement = document.getElementById('withdrawalTeilfreistellungRate');
            if (teilfreistellungRateElement) {
                teilfreistellungRate = parseFloat(teilfreistellungRateElement.value) / 100;
            } else {
                teilfreistellungRate = TEILFREISTELLUNG_EQUITY; // 0.30
            }
        } else {
            teilfreistellungRate = TEILFREISTELLUNG_EQUITY; // 0.30
        }
    }
    
    console.log(`💰 Tax calculation setup (FIFO cost basis):`);
    console.log(`   Initial Capital: €${initialCapital.toLocaleString()}`);
    console.log(`   Initial Cost Basis: €${remainingCostBasis.toLocaleString()}`);
    console.log(`   Initial Embedded Gains: €${(initialCapital - remainingCostBasis).toLocaleString()}`);
    console.log(`   Teilfreistellung Rate: ${(teilfreistellungRate * 100).toFixed(1)}%`);
    console.log(`   Tax-Free Allowance: €${TAX_FREE_ALLOWANCE} per year`);
    
    const yearlyData = [];
    
    for (let year = 1; year <= duration; year++) {
        const startCapital = capital;
        
        // Step 1: Apply investment returns for the year
        const clampedReturn = Math.max(-0.5, Math.min(0.5, annualReturn)); // Clamp return rate for safety
        const capitalAfterReturns = startCapital * (1 + clampedReturn);
        lots.forEach(lot => { lot.value *= (1 + clampedReturn); });
        
        // Step 2: Calculate inflation-adjusted withdrawal for this specific year
        const clampedInflation = Math.max(0, Math.min(0.2, inflationRate)); // Clamp inflation rate
        const inflationMultiplier = Math.pow(1 + clampedInflation, year - 1);
        const inflationAdjustedWithdrawal = baseAnnualWithdrawal * inflationMultiplier;
        
        // Step 3: Use the calculated withdrawal amount (trust the mathematical formula)
        const grossAnnualWithdrawal = inflationAdjustedWithdrawal;
        
        // Step 4: Sell the oldest lots first and work out the realized gain or loss
        let taxesPaid = 0;
        let costBasisOut = 0;
        let realizedGain = 0;

        if (grossAnnualWithdrawal > 0) {
            let toSell = grossAnnualWithdrawal;
            while (toSell > 1e-9 && lots.length > 0) {
                const lot = lots[0];
                if (!(lot.value > 0)) {
                    lots.shift();
                    continue;
                }
                const sold = Math.min(toSell, lot.value);
                const share = sold / lot.value;
                const lotCostOut = lot.cost * share;
                costBasisOut += lotCostOut;
                lot.cost -= lotCostOut;
                lot.value -= sold;
                toSell -= sold;
                if (share >= 1 - 1e-12) lots.shift();
            }
            realizedGain = grossAnnualWithdrawal - costBasisOut;
            remainingCostBasis = lots.reduce((sum, lot) => sum + lot.cost, 0);
        }

        if (includeTax && grossAnnualWithdrawal > 0) {
            // Step 4.4: Apply Teilfreistellung (30% of gains and losses from equity ETFs stay out of tax)
            const taxableResult = realizedGain * (1 - teilfreistellungRate);
            let taxableGainBeforeAllowance = 0;
            if (taxableResult < 0) {
                lossCarryforward += -taxableResult;
            } else {
                const offset = Math.min(lossCarryforward, taxableResult);
                lossCarryforward -= offset;
                taxableGainBeforeAllowance = taxableResult - offset;
            }

            // Step 4.5: Apply annual tax-free allowance (€1,000 per year)
            const remainingAllowance = Math.max(0, TAX_FREE_ALLOWANCE - annualTaxFreeAllowanceUsed);
            const taxableGainAfterAllowance = Math.max(0, taxableGainBeforeAllowance - remainingAllowance);
            const allowanceUsed = Math.min(remainingAllowance, taxableGainBeforeAllowance);
            annualTaxFreeAllowanceUsed += allowanceUsed;

            // Step 4.6: Calculate final tax (25% Abgeltungssteuer)
            taxesPaid = taxableGainAfterAllowance * EFFECTIVE_TAX_RATE;

            console.log(`📊 Year ${year} Tax Calculation (FIFO Cost Basis):`);
            console.log(`   Portfolio before withdrawal: €${capitalAfterReturns.toFixed(2)}`);
            console.log(`   Gross Withdrawal: €${grossAnnualWithdrawal.toFixed(2)}`);
            console.log(`   Cost Basis out: €${costBasisOut.toFixed(2)}`);
            console.log(`   Realized Gain: €${realizedGain.toFixed(2)} (loss carryforward: €${lossCarryforward.toFixed(2)})`);
            console.log(`   Remaining Cost Basis: €${remainingCostBasis.toFixed(2)}`);
            console.log(`   Taxable Gain (after Teilfreistellung ${(teilfreistellungRate*100).toFixed(0)}%): €${taxableGainBeforeAllowance.toFixed(2)}`);
            console.log(`   Allowance Used: €${allowanceUsed.toFixed(2)} (remaining: €${(remainingAllowance - allowanceUsed).toFixed(2)})`);
            console.log(`   Final Taxable Amount: €${taxableGainAfterAllowance.toFixed(2)}`);
            console.log(`   Tax Paid (25%): €${taxesPaid.toFixed(2)}`);
        }
        
        // Step 5: Calculate net withdrawal after taxes
        const netAnnualWithdrawal = Math.max(0, grossAnnualWithdrawal - taxesPaid);
        
        // Step 6: Update portfolio capital (allow negative for mathematical accuracy)
        capital = capitalAfterReturns - grossAnnualWithdrawal;
        
        // Step 7: Real value of the net withdrawal, paid at the end of the year,
        // in money of the start of the withdrawal phase
        const deflator = Math.pow(1 + clampedInflation, year);
        const realWithdrawal = netAnnualWithdrawal / deflator;
        
        // Step 8: Accumulate totals
        totalTaxesPaid += taxesPaid;
        totalNetWithdrawals += netAnnualWithdrawal;
        totalRealNetWithdrawals += realWithdrawal;
        
        // Step 9: Store yearly data for display and analysis
        yearlyData.push({
            year: year,
            startCapital: startCapital,
            capitalAfterReturns: capitalAfterReturns,
            grossWithdrawal: grossAnnualWithdrawal,
            taxesPaid: taxesPaid,
            netWithdrawal: netAnnualWithdrawal,
            endCapital: capital, // Allow negative values for accurate calculation
            realValue: realWithdrawal,
            realEndCapital: capital / deflator,
            inflationMultiplier: inflationMultiplier,
            remainingCostBasis: remainingCostBasis, // Track cost basis over time
            lossCarryforward: lossCarryforward,
            teilfreistellungApplied: teilfreistellungRate * 100, // For debugging/display
            allowanceUsedThisYear: annualTaxFreeAllowanceUsed // Track allowance usage
        });
        
        // Step 10: Reset annual allowance for next year (German tax law)
        annualTaxFreeAllowanceUsed = 0;
        
        // The mathematical calculation should ensure the portfolio lasts exactly the specified duration
        // If capital goes negative, it's due to rounding errors - we'll handle this at the end
    }
    
    // Calculate correct average monthly values over the entire withdrawal period
    const totalMonths = duration * 12;
    const totalGrossWithdrawn = yearlyData.reduce((sum, year) => sum + year.grossWithdrawal, 0);
    const totalNetWithdrawn = yearlyData.reduce((sum, year) => sum + year.netWithdrawal, 0);
    
    // True averages over the entire period
    const avgGrossNominal = totalGrossWithdrawn / totalMonths;
    const avgTaxNominal = totalTaxesPaid / totalMonths;
    const avgNetNominal = totalNetWithdrawn / totalMonths;
    
    // First year values for comparison
    const firstYearGross = baseAnnualWithdrawal / 12;
    const firstYearTax = yearlyData.length > 0 ? yearlyData[0].taxesPaid / 12 : 0;
    const firstYearNet = yearlyData.length > 0 ? yearlyData[0].netWithdrawal / 12 : firstYearGross - firstYearTax;
    
    console.log(`💰 Monthly Withdrawal Calculations (Corrected):`);
    console.log(`- First Year Monthly Gross: €${firstYearGross.toFixed(2)}`);
    console.log(`- First Year Monthly Tax: €${firstYearTax.toFixed(2)}`);
    console.log(`- First Year Monthly Net: €${firstYearNet.toFixed(2)}`);
    console.log(`- Average Monthly Gross (${duration} years): €${avgGrossNominal.toFixed(2)}`);
    console.log(`- Average Monthly Tax (${duration} years): €${avgTaxNominal.toFixed(2)}`);
    console.log(`- Average Monthly Net (${duration} years): €${avgNetNominal.toFixed(2)}`);
    
    // Real purchasing power: the average monthly net withdrawal after taxes,
    // in money of the start of the withdrawal phase
    const realPurchasingPower = totalRealNetWithdrawals / totalMonths;
    
    // Handle small rounding errors in final capital
    if (Math.abs(capital) < 1) {
        capital = 0; // Consider it exactly zero if within €1
    }
    
    // Ensure the last year's endCapital is exactly 0 for visual consistency
    if (yearlyData.length > 0) {
        yearlyData[yearlyData.length - 1].endCapital = capital;
    }
    
    console.log(`\n🏁 ETF Withdrawal Tax Calculation Summary:`);
    console.log(`- Initial Portfolio: €${initialCapital.toLocaleString()}`);
    console.log(`- Initial Cost Basis: €${initialCostBasis.toLocaleString()}`);
    console.log(`- Final Remaining Cost Basis: €${remainingCostBasis.toFixed(2)}`);
    console.log(`- Teilfreistellung applied: ${teilfreistellungRate * 100}%`);
    console.log(`- Effective tax rate on taxable gains: ${EFFECTIVE_TAX_RATE * 100}%`);
    console.log(`- Total taxes paid over ${duration} years: €${totalTaxesPaid.toFixed(2)}`);
    console.log(`- Average annual tax: €${(totalTaxesPaid / duration).toFixed(2)}`);
    console.log(`- Tax efficiency: ${((1 - totalTaxesPaid / (yearlyData.reduce((sum, year) => sum + year.grossWithdrawal, 0))) * 100).toFixed(1)}%`);
    
    return {
        monthlyGrossWithdrawal: avgGrossNominal,        // True average monthly gross
        monthlyNetWithdrawal: avgNetNominal,            // True average monthly net
        firstYearMonthlyGross: firstYearGross,          // First year monthly gross
        firstYearMonthlyNet: firstYearNet,              // First year monthly net
        averageMonthlyTax: avgTaxNominal,               // True average monthly tax
        totalTaxesPaid: totalTaxesPaid,
        realPurchasingPower: realPurchasingPower,
        initialCostBasis: initialCostBasis,
        yearlyData,
        finalCapital: capital
    };
}

/**
 * Calculate total contributions from accumulation phase
 * This function attempts to extract contribution data from the UI or scenario data
 * 
 * @returns {number} Total contributions amount
 */
export function calculateTotalContributionsFromAccumulation() {
    // This function requires DOM access and scenario data
    // For pure calculation purposes, it's recommended to pass contributions directly
    // This is included for compatibility with the existing codebase
    
    if (typeof document === 'undefined') {
        console.warn('calculateTotalContributionsFromAccumulation requires DOM access');
        return 0;
    }
    
    // Try to get parameters from the currently selected scenario
    const scenarioSelectorElement = document.getElementById('scenarioSelector');
    if (!scenarioSelectorElement) {
        console.warn('No scenario selector found');
        return 0;
    }
    
    const selectedScenarioId = scenarioSelectorElement.value;
    let monthlyContribution = 0;
    let duration = 0;
    let initialCapitalInput = 0;
    
    // This would need access to the global scenarios array
    // For modular use, it's better to pass these values directly
    if (typeof scenarios !== 'undefined' && selectedScenarioId) {
        const selectedScenario = scenarios.find(s => s.id === selectedScenarioId);
        if (selectedScenario) {
            const scenarioCostBasis = Number(selectedScenario.results?.costBasis);
            if (Number.isFinite(scenarioCostBasis) && scenarioCostBasis > 0) {
                console.log(`📊 Using stored cost basis from accumulation: €${scenarioCostBasis.toFixed(2)}`);
                return scenarioCostBasis;
            }

            const totalInvested = Number(selectedScenario.results?.totalInvested);
            if (Number.isFinite(totalInvested) && totalInvested > 0) {
                console.log(`📊 Using stored total invested amount: €${totalInvested.toFixed(2)}`);
                return totalInvested;
            }

            monthlyContribution = selectedScenario.monthlyContribution || 
                                (selectedScenario.inputs && selectedScenario.inputs.monthlySavings) || 0;
            duration = selectedScenario.duration || 
                      (selectedScenario.inputs && selectedScenario.inputs.duration) || 0;
            initialCapitalInput = Number(selectedScenario.inputs?.initialCapital || 0);
        }
    }

    // If no scenario data, try to get from UI elements
    if (monthlyContribution === 0 || duration === 0) {
        const monthlyInput = document.getElementById('monthlySavings');
        const durationInput = document.getElementById('duration');
        const initialInput = document.getElementById('initialCapital');

        if (monthlyInput && durationInput) {
            monthlyContribution = parseGermanNumber(monthlyInput.value) || 0;
            duration = parseInt(durationInput.value) || 0;
        }
        if (initialInput) {
            initialCapitalInput = parseGermanNumber(initialInput.value) || 0;
        }
    }

    // Calculate total contributions
    const yearlyDeposits = monthlyContribution * 12 * duration;
    const totalContributions = yearlyDeposits + Math.max(0, initialCapitalInput || 0);

    console.log(`📊 Total contributions calculation:`);
    console.log(`   Monthly contribution: €${monthlyContribution.toFixed(2)}`);
    console.log(`   Duration: ${duration} years`);
    console.log(`   Initial capital: €${(initialCapitalInput || 0).toFixed(2)}`);
    console.log(`   Total contributions: €${totalContributions.toFixed(2)}`);

    return totalContributions;
}
