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

export function normalizeEtfType(value) {
    const normalized = (value ?? '').toString().toLowerCase();
    if (normalized === 'distributing' || normalized === 'ausschüttend') {
        return 'ausschüttend';
    }
    if (normalized === 'accumulating' || normalized === 'thesaurierend') {
        return 'thesaurierend';
    }
    return 'thesaurierend';
}

/**
 * Apply capital gains tax with consideration of the Sparerpauschbetrag.
 * Returns the payable tax and bookkeeping details so callers can update totals.
 *
 * @param {number} taxableAmount - Amount subject to tax after Teilfreistellung
 * @returns {{ tax: number, allowanceUsed: number, taxableAfterAllowance: number }}
 */
export function applyCapitalGainsTax(taxableAmount) {
    const sanitizedAmount = Math.max(0, Number(taxableAmount) || 0);
    if (sanitizedAmount <= 0) {
        return { tax: 0, allowanceUsed: 0, taxableAfterAllowance: 0 };
    }

    const allowance = TAX_CONSTANTS.SPARERPAUSCHBETRAG;
    const remainingAllowance = Math.max(0, allowance - usedSparerpauschbetrag);
    const allowanceUsed = Math.min(remainingAllowance, sanitizedAmount);
    usedSparerpauschbetrag += allowanceUsed;

    const taxableAfterAllowance = Math.max(0, sanitizedAmount - allowanceUsed);
    const tax = taxableAfterAllowance * TAX_CONSTANTS.ABGELTUNGSSTEUER_RATE;

    return { tax, allowanceUsed, taxableAfterAllowance };
}

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
    const normalizedEtfType = normalizeEtfType(etfType);
    const TEILFREISTELLUNG_EQUITY = TAX_CONSTANTS.TEILFREISTELLUNG_EQUITY;
    const BASISZINS = TAX_CONSTANTS.BASISZINS;
    
    // Reset allowance tracking at the beginning of calculation
    if (year === 1) {
        usedSparerpauschbetrag = 0;
    }
    
    // Use the passed parameters instead of DOM lookup
    const teilfreistellungRate = teilfreistellung ? TEILFREISTELLUNG_EQUITY : 0;
    
    let taxableAmount = 0;
    
    if (normalizedEtfType === 'thesaurierend') {
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
    const { tax, allowanceUsed, taxableAfterAllowance } = applyCapitalGainsTax(taxableAmount);
    const remainingAllowance = Math.max(0, TAX_CONSTANTS.SPARERPAUSCHBETRAG - usedSparerpauschbetrag);

    console.log(`Remaining Allowance: €${remainingAllowance.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`Allowance Used This Year: €${allowanceUsed.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`Taxable After Allowance: €${taxableAfterAllowance.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`Final Tax (${TAX_CONSTANTS.ABGELTUNGSSTEUER_RATE * 100}%): €${tax.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log('---');
    
    return tax;
}

/**
 * Approximate the zu versteuerndes Einkommen (zvE) of an employee:
 * gross salary minus Arbeitnehmer-Pauschbetrag, deductible social
 * contributions (pension, health, care) and Kinderfreibetrag.
 *
 * @param {number} grossSalary - Gross annual salary
 * @param {number} children - Number of children
 * @param {number} deductibleContributions - Deductible social contributions
 * @returns {number} Taxable income (zvE)
 */
export function calculateTaxableIncome(grossSalary, children = 0, deductibleContributions = 0) {
    const childAllowance = children * TAX_CONSTANTS.KINDERFREIBETRAG;
    return Math.max(0, grossSalary - TAX_CONSTANTS.ARBEITNEHMER_PAUSCHBETRAG - deductibleContributions - childAllowance);
}

/**
 * German income tax according to the 2025 tariff (§32a EStG).
 * The Grundfreibetrag is part of the tariff, so zvE must not be reduced by it beforehand.
 *
 * @param {number} zvE - Taxable income (zu versteuerndes Einkommen)
 * @returns {number} Annual income tax
 */
export function calculateIncomeTax(zvE) {
    const income = Math.floor(Math.max(0, Number(zvE) || 0));
    if (income <= TAX_CONSTANTS.GRUNDFREIBETRAG) {
        return 0;
    }
    if (income <= 17443) {
        const y = (income - TAX_CONSTANTS.GRUNDFREIBETRAG) / 10000;
        return (932.30 * y + 1400) * y;
    }
    if (income <= 68480) {
        const z = (income - 17443) / 10000;
        return (176.64 * z + 2397) * z + 1015.13;
    }
    if (income <= 277825) {
        return 0.42 * income - 10911.92;
    }
    return 0.45 * income - 19246.67;
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

    const taxableIncome = calculateTaxableIncome(grossSalary, children, pensionInsurance + healthInsurance + careInsurance);
    const incomeTax = calculateIncomeTax(taxableIncome);

    // Church tax (8% or 9% depending on state)
    const churchTaxAmount = churchTax ? incomeTax * 0.09 : 0;

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

    const taxableIncome = calculateTaxableIncome(grossSalary, children, pensionInsuranceAmount + healthInsuranceAmount + careInsuranceAmount);
    const incomeTax = calculateIncomeTax(taxableIncome);

    // Church tax (8% or 9% of income tax depending on state)
    const churchTaxRates = {
        'bw': 0.08, 'by': 0.08, 'be': 0.09, 'bb': 0.09, 'hb': 0.09, 'hh': 0.09,
        'he': 0.09, 'mv': 0.09, 'ni': 0.09, 'nw': 0.09, 'rp': 0.09, 'sl': 0.09,
        'sn': 0.09, 'st': 0.09, 'sh': 0.09, 'th': 0.09
    };
    const churchTaxAmount = churchTax ? incomeTax * (churchTaxRates[federalState] || 0.09) : 0;

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
    ARBEITNEHMER_PAUSCHBETRAG: 1230,
    MAX_PENSION_BASE: 96600,
    MAX_HEALTH_BASE: 66150,
    PENSION_RATE_EMPLOYEE: 0.093,
    UNEMPLOYMENT_RATE_EMPLOYEE: 0.013,
    HEALTH_BASE_RATE_EMPLOYEE: 0.073,
    CARE_BASE_RATE_EMPLOYEE: 0.018,
    CARE_ADDITIONAL_CHILDLESS: 0.006
};
