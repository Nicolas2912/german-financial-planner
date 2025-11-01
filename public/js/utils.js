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
 * Escape HTML characters for security
 * 
 * @param {string} text - The text to escape
 * @returns {string} HTML-escaped text
 */
export function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

/**
 * Debounce function to limit the rate at which a function can fire
 * 
 * @param {Function} func - The function to debounce
 * @param {number} delay - The number of milliseconds to delay
 * @returns {Function} The debounced function
 */
export function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// (Removed duplicate showNotification — authoritative version lives in ui/dom.js)

// Scenario utility functions
// (Removed scenario DOM helpers — maintained where needed in app/core/features modules)

// Generic array utility functions
export function findById(array, id) {
    return array.find(item => item.id === id);
}

export function removeById(array, id) {
    return array.filter(item => item.id !== id);
}

// Validation utilities
export function isValidNumber(value) {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// Date utilities
export function formatDate(date) {
    return new Intl.DateTimeFormat('de-DE').format(date);
}

export function addYears(date, years) {
    const newDate = new Date(date);
    newDate.setFullYear(newDate.getFullYear() + years);
    return newDate;
}

// Math utilities
export function roundToDecimal(value, decimals) {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

export function percentage(value, total) {
    return total !== 0 ? (value / total) * 100 : 0;
}

// Object utilities
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

export function mergeObjects(target, source) {
    return Object.assign({}, target, source);
}
