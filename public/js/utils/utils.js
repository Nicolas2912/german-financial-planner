/**
 * Utility Functions for German Financial Planner
 * 
 * This module contains utility functions for number formatting, parsing, and currency display
 * that are used throughout the application.
 */

/**
 * Format a number as currency with German locale
 * 
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string (e.g., "€1.234,56")
 */
export function formatCurrency(amount) {
    // Handle null, undefined, or invalid values
    if (amount === null || amount === undefined || typeof amount !== 'number' || isNaN(amount)) {
        return '€0,00';
    }
    
    return '€' + amount.toLocaleString('de-DE', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });
}

/**
 * Parse a German-formatted number string into a number
 * Handles German decimal format with comma as decimal separator
 * 
 * @param {string|number} value - The value to parse
 * @returns {number} Parsed number or 0 if invalid
 */
export function parseGermanNumber(value) {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return 0;
    
    // Replace German decimal comma with dot for parsing
    const normalizedValue = value.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(normalizedValue);
    return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format a number using German locale
 * 
 * @param {number} value - The number to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted number string
 */
export function formatGermanNumber(value, decimals = 2) {
    if (typeof value !== 'number' || isNaN(value)) return '0';
    return value.toLocaleString('de-DE', { 
        minimumFractionDigits: decimals, 
        maximumFractionDigits: decimals 
    });
}

/**
 * Debounce function to limit the rate at which a function can fire
 * 
 * @param {Function} func - The function to debounce
 * @param {number} wait - The number of milliseconds to delay
 * @returns {Function} The debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}