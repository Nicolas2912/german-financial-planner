/**
 * Budget Chart Functions for German Financial Planner
 * 
 * This module contains functions for creating and updating the budget pie chart
 * that displays the breakdown of fixed expenses, variable expenses, and remaining budget.
 */

import { formatCurrency } from '../utils/utils.js';

// Chart instance for budget pie chart
let budgetPieChart = null;

/**
 * Update the budget pie chart with current expense data
 * 
 * @param {Object} fixedExpenses - Object containing fixed expense categories and amounts
 * @param {Object} variableExpenses - Object containing variable expense categories and amounts
 * @param {number} remainingBudget - The remaining budget amount
 */
export function updateBudgetPieChart(fixedExpenses, variableExpenses, remainingBudget) {
    const ctx = document.getElementById('budgetPieChart').getContext('2d');
    
    if (budgetPieChart) {
        budgetPieChart.destroy();
    }

    // Check if we have any budget data
    const fixedTotal = Object.values(fixedExpenses).reduce((sum, val) => sum + val, 0);
    const variableTotal = Object.values(variableExpenses).reduce((sum, val) => sum + val, 0);
    const totalBudget = fixedTotal + variableTotal + Math.max(0, remainingBudget);
    
    if (totalBudget <= 0) {
        const canvas = document.getElementById('budgetPieChart');
        displayChartErrorMessage(canvas, ctx, 'no-data', {
            icon: '💰',
            title: 'Keine Budgetdaten verfügbar',
            subtitle: 'Es wurden noch keine Einnahmen oder Ausgaben eingegeben.',
            action: 'Bitte geben Sie Ihre Einnahmen und Ausgaben ein.'
        });
        return;
    }
    
    // Prepare data for the pie chart
    const chartData = [];
    const chartLabels = [];
    const chartColors = [];

    // Add fixed expenses as individual categories
    const fixedCategories = {
        'Miete/Hypothek': { value: fixedExpenses.rent || 0, color: '#e74c3c' },
        'Nebenkosten': { value: fixedExpenses.utilities || 0, color: '#e67e22' },
        'Krankenkasse': { value: fixedExpenses.health || 0, color: '#f39c12' },
        'Versicherungen': { value: fixedExpenses.insurance || 0, color: '#f1c40f' },
        'Internet/Telefon': { value: fixedExpenses.internet || 0, color: '#9b59b6' },
        'GEZ': { value: fixedExpenses.gez || 0, color: '#8e44ad' }
    };

    // Add variable expenses as individual categories
    const variableCategories = {
        'Lebensmittel': { value: variableExpenses.food || 0, color: '#27ae60' },
        'Transport/Auto': { value: variableExpenses.transport || 0, color: '#2ecc71' },
        'Freizeit': { value: variableExpenses.leisure || 0, color: '#16a085' },
        'Kleidung': { value: variableExpenses.clothing || 0, color: '#1abc9c' },
        'Abonnements': { value: variableExpenses.subscriptions || 0, color: '#3498db' },
        'Sonstiges': { value: variableExpenses.miscellaneous || 0, color: '#2980b9' }
    };

    // Add all categories with values > 0
    [...Object.entries(fixedCategories), ...Object.entries(variableCategories)].forEach(([label, data]) => {
        if (data.value > 0) {
            chartLabels.push(label);
            chartData.push(data.value);
            chartColors.push(data.color);
        }
    });

    // Add remaining budget if positive
    if (remainingBudget > 0) {
        chartLabels.push('Verfügbar');
        chartData.push(remainingBudget);
        chartColors.push('#95a5a6');
    }

    budgetPieChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: chartLabels,
            datasets: [{
                data: chartData,
                backgroundColor: chartColors,
                borderColor: '#ffffff',
                borderWidth: 2,
                hoverBorderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    align: 'center',
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: {
                            size: 11,
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                        },
                        color: '#2c3e50',
                        padding: 15,
                        boxWidth: 10,
                        boxHeight: 10,
                        generateLabels: function(chart) {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                return data.labels.map((label, i) => {
                                    const value = data.datasets[0].data[i];
                                    const percentage = ((value / chartData.reduce((a, b) => a + b, 0)) * 100).toFixed(1);
                                    return {
                                        text: `${label}: ${formatCurrency(value)} (${percentage}%)`,
                                        fillStyle: data.datasets[0].backgroundColor[i],
                                        hidden: false,
                                        index: i
                                    };
                                });
                            }
                            return [];
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    titleColor: '#2c3e50',
                    bodyColor: '#2c3e50',
                    borderColor: '#3498db',
                    borderWidth: 2,
                    cornerRadius: 8,
                    titleFont: {
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 13
                    },
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
                        }
                    }
                }
            },
            layout: {
                padding: {
                    left: 10,
                    right: 10,
                    top: 10,
                    bottom: 10
                }
            },
            animation: {
                animateRotate: true,
                animateScale: true,
                duration: 1000,
                easing: 'easeInOutQuart'
            }
        }
    });
}

/**
 * Display an error message on a chart canvas
 * 
 * @param {HTMLCanvasElement} canvas - The canvas element to draw on
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
 * @param {string} errorType - Type of error ('no-scenarios', 'no-data', 'no-scenario-data', 'calculation-error')
 * @param {Object} customMessage - Optional custom message object with title, subtitle, and action properties
 */
export function displayChartErrorMessage(canvas, ctx, errorType = 'no-scenarios', customMessage = null) {
    // Get the actual display dimensions
    const rect = canvas.getBoundingClientRect();
    
    // Set canvas size to match container
    canvas.width = Math.max(rect.width, 600);
    canvas.height = Math.max(rect.height, 400);
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set up styling for the error message
    ctx.save();
    
    // Simple light background
    ctx.fillStyle = 'rgba(248, 249, 250, 0.95)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Calculate center position
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Define simple error messages
    const errorMessages = {
        'no-scenarios': {
            title: 'Keine Szenarien ausgewählt',
            subtitle: 'Für die Übersicht muss mindestens ein Szenario ausgewählt werden'
        },
        'no-data': {
            title: 'Keine Daten verfügbar',
            subtitle: 'Bitte Parameter eingeben'
        },
        'no-scenario-data': {
            title: 'Szenario nicht berechnet',
            subtitle: 'Parameter überprüfen'
        },
        'calculation-error': {
            title: 'Berechnungsfehler',
            subtitle: 'Eingaben überprüfen'
        }
    };
    
    const message = customMessage || errorMessages[errorType] || errorMessages['no-data'];
    
    // Draw main title in red
    const titleSize = Math.max(18, Math.min(24, canvas.width * 0.035));
    ctx.font = `bold ${titleSize}px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e74c3c'; // Red color
    ctx.fillText(message.title, centerX, centerY - 15);
    
    // Draw subtitle in lighter red
    const subtitleSize = Math.max(14, Math.min(16, canvas.width * 0.025));
    ctx.font = `${subtitleSize}px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif`;
    ctx.fillStyle = '#c0392b'; // Darker red
    ctx.fillText(message.subtitle, centerX, centerY + 15);
    
    ctx.restore();
}

/**
 * Get the current budget pie chart instance
 * 
 * @returns {Chart|null} The current Chart.js instance or null if not initialized
 */
export function getBudgetPieChart() {
    return budgetPieChart;
}

/**
 * Destroy the current budget pie chart instance
 */
export function destroyBudgetPieChart() {
    if (budgetPieChart) {
        budgetPieChart.destroy();
        budgetPieChart = null;
    }
}