/**
 * German Tax Calculation Functions
 * 
 * This module contains all tax-related calculations for the German financial planner.
 * Includes ETF tax calculations, income tax calculations, and social security contributions.
 */

// Import utility functions
import { parseGermanNumber, formatCurrency, formatGermanNumber } from '../utils.js';

// Global variable to track used tax-free allowance for ETF taxes
let usedSparerpauschbetrag = 0;

/**
 * Calculate German ETF tax (Abgeltungssteuer with Vorabpauschale)
 * 
 * @param {number} startCapital - Capital at the beginning of the year
 * @param {number} endCapital - Capital at the end of the year
 * @param {number} annualReturn - Annual return rate (as decimal, e.g., 0.07 for 7%)
 * @param {number} year - Year number (1-based)
 * @param {boolean} teilfreistellung - Whether partial exemption applies (default: false)
 * @param {string} etfType - Type of ETF ('thesaurierend' or 'ausschüttend')
 * @returns {number} Tax amount to be paid
 */
export function calculateGermanETFTax(startCapital, endCapital, annualReturn, year, teilfreistellung = false, etfType = 'thesaurierend') {
    // German tax constants for 2025
    const ABGELTUNGSSTEUER_RATE = 0.25; // 25% Abgeltungssteuer
    const SPARERPAUSCHBETRAG = 1000; // Annual tax-free allowance
    const TEILFREISTELLUNG_EQUITY = 0.30; // 30% partial exemption for equity ETFs
    const BASISZINS = 0.0253; // Base interest rate for Vorabpauschale (2.53% for 2025)
    
    // Reset allowance tracking at the beginning of calculation
    if (year === 1) {
        usedSparerpauschbetrag = 0;
    }
    
    // Use the passed parameters instead of DOM lookup
    const teilfreistellungRate = teilfreistellung ? TEILFREISTELLUNG_EQUITY : 0;
    
    let taxableAmount = 0;
    
    if (etfType === 'thesaurierend') {
        // For accumulating ETFs: Calculate Vorabpauschale according to German law
        // Basisertrag = Fondswert am Jahresanfang × Basiszins × 70%
        const basisertrag = startCapital * BASISZINS * 0.7;
        const capitalGains = Math.max(0, endCapital - startCapital);
        
        // Vorabpauschale = min(Basisertrag, Wertsteigerung)
        // Only applies if there are capital gains
        let vorabpauschale = 0;
        if (capitalGains > 0) {
            vorabpauschale = Math.min(basisertrag, capitalGains);
        }
        
        // Apply partial exemption (Teilfreistellung) - configurable tax-free rate for equity ETFs
        taxableAmount = vorabpauschale * (1 - teilfreistellungRate);
        
        // Debug logging
        console.log(`Year ${year}: Start Capital: €${startCapital.toFixed(2)}, End Capital: €${endCapital.toFixed(2)}`);
        console.log(`Basisertrag (${BASISZINS * 100}% * 70%): €${basisertrag.toFixed(2)}`);
        console.log(`Capital Gains: €${capitalGains.toFixed(2)}`);
        console.log(`Vorabpauschale: €${vorabpauschale.toFixed(2)}`);
        console.log(`Teilfreistellung Rate: ${teilfreistellungRate * 100}%`);
        console.log(`Taxable after Teilfreistellung: €${taxableAmount.toFixed(2)}`);
    } else {
        // For distributing ETFs: Tax on distributions (simplified as portion of gains)
        const estimatedDistribution = (endCapital - startCapital) * 0.02; // Assume 2% distribution yield
        taxableAmount = Math.max(0, estimatedDistribution) * (1 - teilfreistellungRate);
        
        console.log(`Year ${year}: Distributing ETF - Estimated Distribution: €${estimatedDistribution.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        console.log(`Teilfreistellung Rate: ${teilfreistellungRate * 100}%`);
        console.log(`Taxable after Teilfreistellung: €${taxableAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    }
    
    // Apply Sparerpauschbetrag (tax-free allowance) - annual allowance
    const remainingAllowance = Math.max(0, SPARERPAUSCHBETRAG - usedSparerpauschbetrag);
    const allowanceUsedThisYear = Math.min(remainingAllowance, taxableAmount);
    usedSparerpauschbetrag += allowanceUsedThisYear;
    
    const taxableAfterAllowance = Math.max(0, taxableAmount - allowanceUsedThisYear);
    
    // Calculate final tax
    const tax = taxableAfterAllowance * ABGELTUNGSSTEUER_RATE;
    
    console.log(`Remaining Allowance: €${remainingAllowance.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`Allowance Used This Year: €${allowanceUsedThisYear.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`Taxable After Allowance: €${taxableAfterAllowance.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`Final Tax (${ABGELTUNGSSTEUER_RATE * 100}%): €${tax.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log('---');
    
    return tax;
}

/**
 * Calculate German net salary from gross salary
 * 
 * @param {number} grossSalary - Gross annual salary
 * @param {number} taxClass - Tax class (1-6, default: 1)
 * @param {number} children - Number of children (default: 0)
 * @param {number} age - Age of the employee (default: 30)
 * @param {boolean} churchTax - Whether church tax applies (default: false)
 * @param {boolean} publicHealthInsurance - Whether public health insurance applies (default: true)
 * @param {number} additionalHealthRate - Additional health insurance rate in percent (default: 2.5)
 * @returns {number} Net annual salary
 */
export function calculateGermanNetSalary(grossSalary, taxClass = 1, children = 0, age = 30, churchTax = false, publicHealthInsurance = true, additionalHealthRate = 2.5) {
    // 2025 tax brackets (official data from web sources)
    const basicAllowance = 12096; // Grundfreibetrag 2025
    const childAllowance = children * 9600; // Kinderfreibetrag per child
    
    // Calculate taxable income
    let taxableIncome = Math.max(0, grossSalary - basicAllowance - childAllowance);
    
    // Progressive tax calculation (2025 official formula)
    let incomeTax = 0;
    if (taxableIncome > 0) {
        if (taxableIncome <= 17005) {
            // First progression zone: 14% to 24%
            const y = taxableIncome / 10000;
            incomeTax = (922.98 * y + 1400) * y;
        } else if (taxableIncome <= 68429) {
            // Second progression zone: 24% to 42%
            const z = (taxableIncome - 17005) / 10000;
            incomeTax = (181.19 * z + 2397) * z + 1025.38;
        } else if (taxableIncome <= 277825) {
            // Third zone: constant 42%
            incomeTax = 0.42 * taxableIncome - 10602.13;
        } else {
            // Top tax rate: 45%
            incomeTax = 0.45 * taxableIncome - 18936.88;
        }
    }

    // Church tax (8% or 9% depending on state)
    const churchTaxAmount = churchTax ? incomeTax * 0.09 : 0;

    // Social security contributions (2025 rates from web sources)
    const maxPensionBase = 96600;  // 2025 contribution ceiling
    const maxHealthBase = 66150;   // 2025 health insurance ceiling

    const pensionBase = Math.min(grossSalary, maxPensionBase);
    const healthBase = Math.min(grossSalary, maxHealthBase);

    // Employee shares (2025 official rates)
    const pensionInsurance = pensionBase * 0.093;        // 9.3% employee share
    const unemploymentInsurance = pensionBase * 0.013;   // 1.3% employee share
    
    let healthInsurance = 0;
    let careInsurance = 0;

    if (publicHealthInsurance) {
        // Health insurance: 7.3% base + additional contribution
        const baseHealthRate = 0.073;
        const additionalContribution = (additionalHealthRate / 100) / 2;
        healthInsurance = healthBase * (baseHealthRate + additionalContribution);
        
        // Care insurance: 1.8% base + additional for childless
        let careRate = 0.018;
        if (children === 0 && age >= 23) {
            careRate += 0.006; // Additional 0.6% for childless
        }
        careInsurance = healthBase * careRate;
    } else {
        // Private health insurance estimate
        healthInsurance = Math.min(900, grossSalary * 0.08);
        let careRate = 0.018;
        if (children === 0 && age >= 23) {
            careRate += 0.006;
        }
        careInsurance = healthBase * careRate;
    }

    // Calculate total deductions
    const totalTaxes = incomeTax + churchTaxAmount;
    const totalSocialInsurance = pensionInsurance + unemploymentInsurance + healthInsurance + careInsurance;
    const totalDeductions = totalTaxes + totalSocialInsurance;

    // Calculate net salary
    const netSalary = grossSalary - totalDeductions;

    return netSalary;
}

/**
 * Calculate taxes for the tax calculator (with detailed breakdown)
 * 
 * @param {number} grossSalary - Gross annual salary
 * @param {number} taxClass - Tax class (1-6)
 * @param {string} federalState - Federal state code (e.g., 'bw', 'by')
 * @param {number} age - Age of the employee
 * @param {number} children - Number of children
 * @param {boolean} churchTax - Whether church tax applies
 * @param {boolean} publicHealthInsurance - Whether public health insurance applies
 * @param {number} healthInsuranceRate - Health insurance rate in percent
 * @returns {object} Detailed tax calculation results
 */
export function calculateTaxes(grossSalary, taxClass, federalState, age, children, churchTax, publicHealthInsurance, healthInsuranceRate) {
    // Official 2025 German tax calculation
    const basicAllowance = 12096; // Grundfreibetrag 2025 (official)
    const childAllowance = children * 9600; // Kinderfreibetrag 2025: €9,600 per child (official)
    
    // Calculate taxable income
    let taxableIncome = Math.max(0, grossSalary - basicAllowance - childAllowance);
    
    // Official German progressive tax formula for 2025
    let incomeTax = 0;
    if (taxableIncome > 0) {
        if (taxableIncome <= 17005) {
            // First progression zone: 14% to 24%
            const y = taxableIncome / 10000;
            incomeTax = (922.98 * y + 1400) * y;
        } else if (taxableIncome <= 68430) {
            // Second progression zone: 24% to 42%
            const z = (taxableIncome - 17005) / 10000;
            incomeTax = (181.19 * z + 2397) * z + 1025.38;
        } else if (taxableIncome <= 277825) {
            // Third zone: constant 42%
            incomeTax = 0.42 * taxableIncome - 10602.13;
        } else {
            // Top tax rate: 45%
            incomeTax = 0.45 * taxableIncome - 18936.88;
        }
    }

    // Church tax (8% or 9% of income tax depending on state)
    const churchTaxRates = {
        'bw': 0.08, 'by': 0.08, 'be': 0.09, 'bb': 0.09, 'hb': 0.09, 'hh': 0.09,
        'he': 0.09, 'mv': 0.09, 'ni': 0.09, 'nw': 0.09, 'rp': 0.09, 'sl': 0.09,
        'sn': 0.09, 'st': 0.09, 'sh': 0.09, 'th': 0.09
    };
    const churchTaxAmount = churchTax ? incomeTax * (churchTaxRates[federalState] || 0.09) : 0;

    // Social insurance contributions (official 2025 rates)
    const maxPensionBase = 96600;  // Unified for all of Germany in 2025
    const maxHealthBase = 66150;   // Updated for 2025

    const pensionBase = Math.min(grossSalary, maxPensionBase);
    const healthBase = Math.min(grossSalary, maxHealthBase);

    // Pension insurance: 18.6% (9.3% employee share)
    const pensionInsuranceAmount = pensionBase * 0.093;
    
    // Unemployment insurance: 2.6% (1.3% employee share)
    const unemploymentInsuranceAmount = pensionBase * 0.013;
    
    let healthInsuranceAmount = 0;
    let careInsuranceAmount = 0;

    if (publicHealthInsurance) {
        // Health insurance: 14.6% base + additional contribution (default 2.5% in 2025)
        const baseHealthRate = 0.073; // 7.3% employee share of base rate
        const additionalContribution = healthInsuranceRate / 100 / 2; // Split with employer
        healthInsuranceAmount = healthBase * (baseHealthRate + additionalContribution);
        
        // Care insurance: 3.6% in 2025 (1.8% employee share)
        // Additional 0.6% for childless employees over 23
        let careRate = 0.018; // Base employee share
        if (children === 0 && age >= 23) {
            careRate += 0.006; // Additional for childless
        } else if (children >= 2) {
            // Reduction for families with 2+ children (0.25% per child, max 1.0%)
            const reduction = Math.min((children - 1) * 0.0025, 0.01);
            careRate = Math.max(0.008, careRate - reduction);
        }
        careInsuranceAmount = healthBase * careRate;
    } else {
        // Private health insurance - rough estimate
        healthInsuranceAmount = Math.min(900, grossSalary * 0.08);
        // Still need to pay care insurance
        let careRate = 0.018;
        if (children === 0 && age >= 23) {
            careRate += 0.006;
        }
        careInsuranceAmount = healthBase * careRate;
    }

    // Calculate total deductions
    const totalTaxes = incomeTax + churchTaxAmount;
    const totalSocialInsurance = pensionInsuranceAmount + unemploymentInsuranceAmount + healthInsuranceAmount + careInsuranceAmount;
    const totalDeductions = totalTaxes + totalSocialInsurance;

    // Calculate net salary
    const netYearlySalary = grossSalary - totalDeductions;
    const netMonthlySalary = netYearlySalary / 12;
    const grossMonthlySalary = grossSalary / 12;

    return {
        grossSalary,
        grossMonthlySalary,
        netYearlySalary,
        netMonthlySalary,
        totalDeductions,
        totalTaxes,
        totalSocialInsurance,
        taxableIncome,
        breakdown: {
            incomeTax,
            churchTax: churchTaxAmount,
            healthInsurance: healthInsuranceAmount,
            careInsurance: careInsuranceAmount,
            pensionInsurance: pensionInsuranceAmount,
            unemploymentInsurance: unemploymentInsuranceAmount
        }
    };
}

/**
 * Reset the ETF tax allowance tracking
 * Call this at the beginning of new calculations
 */
export function resetETFTaxAllowance() {
    usedSparerpauschbetrag = 0;
}

/**
 * Get the current used ETF tax allowance
 * 
 * @returns {number} Currently used Sparerpauschbetrag amount
 */
export function getUsedETFTaxAllowance() {
    return usedSparerpauschbetrag;
}

/**
 * Get the remaining ETF tax allowance
 * 
 * @returns {number} Remaining Sparerpauschbetrag amount
 */
export function getRemainingETFTaxAllowance() {
    const SPARERPAUSCHBETRAG = 1000;
    return Math.max(0, SPARERPAUSCHBETRAG - usedSparerpauschbetrag);
}

/**
 * Tax constants for 2025
 */
export const TAX_CONSTANTS = {
    ABGELTUNGSSTEUER_RATE: 0.25,
    SPARERPAUSCHBETRAG: 1000,
    TEILFREISTELLUNG_EQUITY: 0.30,
    BASISZINS: 0.0253,
    GRUNDFREIBETRAG: 12096,
    KINDERFREIBETRAG: 9600,
    MAX_PENSION_BASE: 96600,
    MAX_HEALTH_BASE: 66150,
    PENSION_RATE_EMPLOYEE: 0.093,
    UNEMPLOYMENT_RATE_EMPLOYEE: 0.013,
    HEALTH_BASE_RATE_EMPLOYEE: 0.073,
    CARE_BASE_RATE_EMPLOYEE: 0.018,
    CARE_ADDITIONAL_CHILDLESS: 0.006
};