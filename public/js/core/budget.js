/**
 * Budget Calculation Functions
 * 
 * This module contains pure calculation functions for budget management
 * including income, expenses, and savings calculations.
 */

import { formatCurrency, parseGermanNumber } from '../utils/utils.js';

/**
 * Convert expense amounts to monthly values based on period
 * 
 * @param {Object} expenses - Object containing expense amounts
 * @param {string} period - Either 'monthly' or 'yearly'
 * @returns {Object} Object with monthly expense amounts
 */
export function convertToMonthly(expenses, period) {
    const monthlyExpenses = {};
    for (const [key, value] of Object.entries(expenses)) {
        if (period === 'yearly') {
            monthlyExpenses[key] = value / 12;
        } else {
            monthlyExpenses[key] = value;
        }
    }
    return monthlyExpenses;
}

/**
 * Calculate total income from profile data
 * 
 * @param {Object} profileData - Profile data containing income and periods
 * @returns {number} Total monthly income
 */
export function calculateProfileTotalIncome(profileData) {
    const income = profileData.income || {};
    const period = profileData.periods?.income || 'monthly';
    
    let total = (parseGermanNumber(income.salary) || 0) + 
               (parseGermanNumber(income.sideIncome) || 0) + 
               (parseGermanNumber(income.otherIncome) || 0);
    
    return period === 'yearly' ? total / 12 : total;
}

/**
 * Calculate total expenses from profile data
 * 
 * @param {Object} profileData - Profile data containing expenses and periods
 * @returns {number} Total monthly expenses
 */
export function calculateProfileTotalExpenses(profileData) {
    const expenses = profileData.expenses || {};
    const fixedPeriod = profileData.periods?.fixed || 'monthly';
    const variablePeriod = profileData.periods?.variable || 'monthly';
    
    // Fixed expenses
    let fixedTotal = (parseGermanNumber(expenses.rent) || 0) + 
                   (parseGermanNumber(expenses.utilities) || 0) + 
                   (parseGermanNumber(expenses.health) || 0) + 
                   (parseGermanNumber(expenses.insurance) || 0) + 
                   (parseGermanNumber(expenses.internet) || 0) + 
                   (parseGermanNumber(expenses.gez) || 0);
    
    if (fixedPeriod === 'yearly') fixedTotal /= 12;
    
    // Variable expenses
    let variableTotal = (parseGermanNumber(expenses.food) || 0) + 
                      (parseGermanNumber(expenses.transport) || 0) + 
                      (parseGermanNumber(expenses.leisure) || 0) + 
                      (parseGermanNumber(expenses.clothing) || 0) + 
                      (parseGermanNumber(expenses.subscriptions) || 0) + 
                      (parseGermanNumber(expenses.miscellaneous) || 0);
    
    if (variablePeriod === 'yearly') variableTotal /= 12;
    
    return fixedTotal + variableTotal;
}

/**
 * Calculate budget from input data
 * 
 * @param {Object} inputData - Object containing income, expenses, and periods
 * @returns {Object} Budget calculation results
 */
export function calculateBudget(inputData) {
    const {
        income,
        expenses,
        periods
    } = inputData;

    // Parse income data
    const incomeData = {
        salary: parseGermanNumber(income.salary),
        sideIncome: parseGermanNumber(income.sideIncome),
        otherIncome: parseGermanNumber(income.otherIncome)
    };

    // Convert to monthly amounts based on period selection
    const monthlyIncome = convertToMonthly(incomeData, periods.income);
    const totalIncome = Object.values(monthlyIncome).reduce((sum, val) => sum + val, 0);

    // Parse fixed expenses
    const fixedExpenses = {
        rent: parseGermanNumber(expenses.rent),
        utilities: parseGermanNumber(expenses.utilities),
        health: parseGermanNumber(expenses.health),
        insurance: parseGermanNumber(expenses.insurance),
        internet: parseGermanNumber(expenses.internet),
        gez: parseGermanNumber(expenses.gez)
    };

    // Parse variable expenses
    const variableExpenses = {
        food: parseGermanNumber(expenses.food),
        transport: parseGermanNumber(expenses.transport),
        leisure: parseGermanNumber(expenses.leisure),
        clothing: parseGermanNumber(expenses.clothing),
        subscriptions: parseGermanNumber(expenses.subscriptions),
        miscellaneous: parseGermanNumber(expenses.miscellaneous)
    };

    // Convert to monthly amounts based on period selection
    const monthlyFixedExpenses = convertToMonthly(fixedExpenses, periods.fixed);
    const monthlyVariableExpenses = convertToMonthly(variableExpenses, periods.variable);

    // Calculate totals
    const fixedTotal = Object.values(monthlyFixedExpenses).reduce((sum, val) => sum + val, 0);
    const variableTotal = Object.values(monthlyVariableExpenses).reduce((sum, val) => sum + val, 0);
    const totalExpenses = fixedTotal + variableTotal;

    const remainingBudget = totalIncome - totalExpenses;

    return {
        totalIncome,
        totalExpenses,
        fixedTotal,
        variableTotal,
        remainingBudget,
        monthlyIncome,
        monthlyFixedExpenses,
        monthlyVariableExpenses
    };
}

/**
 * Calculate savings amount based on mode and parameters
 * 
 * @param {Object} savingsConfig - Configuration object for savings calculation
 * @returns {Object} Savings calculation results
 */
export function calculateSavings(savingsConfig) {
    const {
        mode,
        amount,
        percentage,
        remainingBudget
    } = savingsConfig;

    let finalSavingsAmount = 0;

    if (mode === 'fixed') {
        finalSavingsAmount = amount || 0;
    } else {
        finalSavingsAmount = (remainingBudget || 0) * ((percentage || 0) / 100);
    }

    // Ensure savings don't exceed remaining budget
    finalSavingsAmount = Math.min(finalSavingsAmount, remainingBudget || 0);
    finalSavingsAmount = Math.max(0, finalSavingsAmount);

    return {
        finalSavingsAmount,
        exceedsRemaining: finalSavingsAmount > (remainingBudget || 0),
        isZero: finalSavingsAmount === 0
    };
}

/**
 * Calculate remaining budget after savings
 * 
 * @param {number} totalIncome - Total monthly income
 * @param {number} totalExpenses - Total monthly expenses
 * @param {number} savingsAmount - Monthly savings amount
 * @returns {number} Remaining budget after savings
 */
export function calculateRemainingAfterSavings(totalIncome, totalExpenses, savingsAmount) {
    return totalIncome - totalExpenses - (savingsAmount || 0);
}

/**
 * Get budget status color based on remaining budget
 * 
 * @param {number} remainingBudget - Remaining budget amount
 * @returns {string} CSS color string for budget status
 */
export function getBudgetStatusColor(remainingBudget) {
    if (remainingBudget < 0) {
        return 'linear-gradient(135deg, #e74c3c, #c0392b)';
    } else if (remainingBudget < 200) {
        return 'linear-gradient(135deg, #f39c12, #e67e22)';
    } else {
        return 'linear-gradient(135deg, #27ae60, #2ecc71)';
    }
}

/**
 * Get savings status color based on savings calculation
 * 
 * @param {Object} savingsResult - Result from calculateSavings function
 * @param {number} remainingBudget - Remaining budget amount
 * @returns {string} CSS color string for savings status
 */
export function getSavingsStatusColor(savingsResult, remainingBudget) {
    if (savingsResult.finalSavingsAmount > (remainingBudget || 0)) {
        return '#e74c3c';
    } else if (savingsResult.finalSavingsAmount === 0) {
        return '#95a5a6';
    } else {
        return '#27ae60';
    }
}

/**
 * Validate budget input data
 * 
 * @param {Object} inputData - Budget input data to validate
 * @returns {Object} Validation result with isValid flag and errors array
 */
export function validateBudgetInput(inputData) {
    const errors = [];
    
    if (!inputData.income) {
        errors.push('Income data is required');
    }
    
    if (!inputData.expenses) {
        errors.push('Expenses data is required');
    }
    
    if (!inputData.periods) {
        errors.push('Period data is required');
    }
    
    // Validate that at least some income is provided
    if (inputData.income) {
        const totalIncome = (parseGermanNumber(inputData.income.salary) || 0) + 
                           (parseGermanNumber(inputData.income.sideIncome) || 0) + 
                           (parseGermanNumber(inputData.income.otherIncome) || 0);
        
        if (totalIncome <= 0) {
            errors.push('At least one income source must be greater than 0');
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Create budget summary object for reporting
 * 
 * @param {Object} budgetResult - Result from calculateBudget function
 * @param {Object} savingsResult - Result from calculateSavings function
 * @returns {Object} Budget summary object
 */
export function createBudgetSummary(budgetResult, savingsResult) {
    return {
        totalIncome: budgetResult.totalIncome,
        totalExpenses: budgetResult.totalExpenses,
        fixedExpenses: budgetResult.fixedTotal,
        variableExpenses: budgetResult.variableTotal,
        remainingBudget: budgetResult.remainingBudget,
        plannedSavings: savingsResult.finalSavingsAmount,
        finalRemaining: budgetResult.remainingBudget - savingsResult.finalSavingsAmount,
        savingsRate: budgetResult.totalIncome > 0 ? (savingsResult.finalSavingsAmount / budgetResult.totalIncome) * 100 : 0,
        budgetStatus: budgetResult.remainingBudget >= 0 ? 'positive' : 'negative',
        savingsStatus: savingsResult.isZero ? 'none' : savingsResult.exceedsRemaining ? 'exceeds' : 'valid'
    };
}