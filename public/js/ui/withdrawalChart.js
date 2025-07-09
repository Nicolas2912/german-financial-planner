/**
 * Withdrawal Chart UI Functions
 * 
 * This module contains all the chart-related functions for the withdrawal phase
 * including the main withdrawal chart and the integrated timeline chart.
 */

// Import required modules
import { formatCurrency, parseGermanNumber } from '../utils/utils.js';
import { calculateTotalContributionsFromAccumulation, calculateWithdrawalPlan } from '../core/withdrawal.js';
import { displayChartErrorMessage } from './mainChart.js';

// Chart instances (global for destruction)
let withdrawalChart = null;
let integratedChart = null;

/**
 * Update the withdrawal chart with yearly data
 * @param {Array} yearlyData - Array of yearly withdrawal data
 */
export function updateWithdrawalChart(yearlyData) {
    const ctx = document.getElementById('withdrawalChart').getContext('2d');
    
    if (withdrawalChart) {
        withdrawalChart.destroy();
    }

    // Check if we have data
    if (!yearlyData || yearlyData.length === 0) {
        const canvas = document.getElementById('withdrawalChart');
        displayChartErrorMessage(canvas, ctx, 'no-data', {
            icon: '💰',
            title: 'Keine Entnahmedaten verfügbar',
            subtitle: 'Es sind noch keine Entnahmeberechnungen vorhanden.',
            action: 'Bitte führen Sie eine Entnahmeberechnung durch.'
        });
        return;
    }

    // Get current inflation rate from the slider
    const inflationRate = parseFloat(document.getElementById('withdrawalInflation').value) / 100;

    const years = yearlyData.map(d => d.year);
    const capitalValues = yearlyData.map(d => d.endCapital);
    const realCapitalValues = yearlyData.map(d => d.endCapital / Math.pow(1 + inflationRate, d.year - 1)); // Real portfolio value
    const netWithdrawals = yearlyData.map(d => d.netWithdrawal);
    const taxes = yearlyData.map(d => d.taxesPaid);

    // Create gradients
    const capitalGradient = ctx.createLinearGradient(0, 0, 0, 400);
    capitalGradient.addColorStop(0, 'rgba(231, 76, 60, 0.8)');
    capitalGradient.addColorStop(1, 'rgba(231, 76, 60, 0.1)');

    const realGradient = ctx.createLinearGradient(0, 0, 0, 400);
    realGradient.addColorStop(0, 'rgba(155, 89, 182, 0.8)');
    realGradient.addColorStop(1, 'rgba(155, 89, 182, 0.1)');

    withdrawalChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [
                {
                    label: 'Portfoliowert (Nominal)',
                    data: capitalValues,
                    borderColor: '#e74c3c',
                    backgroundColor: capitalGradient,
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    yAxisID: 'y'
                },
                {
                    label: 'Portfoliowert (Real)',
                    data: realCapitalValues,
                    borderColor: '#9b59b6',
                    backgroundColor: realGradient,
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    yAxisID: 'y'
                },
                {
                    label: 'Netto-Entnahme',
                    data: netWithdrawals,
                    borderColor: '#27ae60',
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0.4,
                    borderWidth: 2,
                    yAxisID: 'y1'
                },
                {
                    label: 'Jährliche Steuern',
                    data: taxes,
                    borderColor: '#f39c12',
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0.4,
                    borderWidth: 2,
                    borderDash: [5, 5],
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Entnahmeplan: Portfolio & Cashflows',
                    font: { size: 18, weight: 'bold' },
                    color: '#2c3e50'
                },
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        font: { size: 12 }
                    }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Portfolio Wert (€)',
                        color: '#2c3e50'
                    },
                    ticks: {
                        callback: function(value) {
                            return '€' + value.toLocaleString('de-DE', { 
                                minimumFractionDigits: 0, 
                                maximumFractionDigits: 0 
                            });
                        }
                    },
                    // Allow negative values to be displayed properly
                    beginAtZero: false,
                    // Ensure proper scaling for negative values
                    suggestedMin: Math.min(0, Math.min(...capitalValues) * 1.1)
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Jährliche Beträge (€)',
                        color: '#2c3e50'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                    ticks: {
                        callback: function(value) {
                            return '€' + value.toLocaleString('de-DE', { 
                                minimumFractionDigits: 2, 
                                maximumFractionDigits: 2 
                            });
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Jahre im Ruhestand',
                        color: '#2c3e50'
                    }
                }
            },
            animation: {
                duration: 1500,
                easing: 'easeInOutQuart'
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return `Jahr ${context[0].parsed.x}`;
                        },
                        label: function(context) {
                            const scenarioName = context.dataset.label.split(' - ')[0];
                            const value = context.parsed.y;
                            return `${scenarioName}: €${value.toLocaleString('de-DE', { 
                                minimumFractionDigits: 0, 
                                maximumFractionDigits: 0 
                            })}`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Create integrated timeline chart showing both accumulation and withdrawal phases
 */
export function createIntegratedTimeline() {
    const ctx = document.getElementById('integratedChart').getContext('2d');
    
    if (integratedChart) {
        integratedChart.destroy();
    }

    // Get accumulation data from active scenario
    // Note: This requires access to global scenarios and activeScenario variables
    // These need to be available in the scope where this function is called
    const currentActiveScenario = typeof scenarios !== 'undefined' && typeof activeScenario !== 'undefined' 
        ? scenarios.find(s => s.id === activeScenario) || scenarios[0]
        : null;
        
    if (!currentActiveScenario || !currentActiveScenario.yearlyData || currentActiveScenario.yearlyData.length === 0) {
        console.log('No accumulation data available for integrated timeline');
        const canvas = document.getElementById('integratedChart');
        displayChartErrorMessage(canvas, ctx, 'no-scenario-data', {
            icon: '🔄',
            title: 'Keine Daten für Lebenszyklus-Ansicht',
            subtitle: 'Es sind keine Berechnungsdaten für das aktuelle Szenario verfügbar.',
            action: 'Bitte führen Sie eine Berechnung in der Ansparphase durch.'
        });
        return;
    }

    // Get withdrawal data
    const retirementCapital = parseGermanNumber(document.getElementById('retirementCapital').value);
    const withdrawalDuration = parseInt(document.getElementById('withdrawalDuration').value);
    const postRetirementReturn = parseFloat(document.getElementById('postRetirementReturn').value) / 100;
    const inflationRate = parseFloat(document.getElementById('withdrawalInflation').value) / 100;
    const includeTax = document.getElementById('withdrawalTaxToggle').classList.contains('active');

    let withdrawalData = [];
    try {
        // Calculate total contributions for the integrated timeline
        const calculatedTotalContributions = calculateTotalContributionsFromAccumulation();
        const validatedContributions = calculatedTotalContributions > 0 ? 
            Math.min(calculatedTotalContributions, retirementCapital) : 
            retirementCapital * 0.6; // fallback estimate
        
        const withdrawalResults = calculateWithdrawalPlan(
            retirementCapital, withdrawalDuration, postRetirementReturn, 
            inflationRate, includeTax, validatedContributions
        );
        withdrawalData = withdrawalResults.yearlyData || [];
        
        // Debug: Check if we got the expected number of years
        console.log(`Integrated Timeline: Requested ${withdrawalDuration} years, got ${withdrawalData.length} data points`);
        console.log(`Withdrawal data sample:`, withdrawalData.slice(0, 3));
        console.log(`Withdrawal final capital:`, withdrawalResults.finalCapital);
        if (withdrawalData.length < withdrawalDuration) {
            console.log('Portfolio depleted early - this is normal if withdrawal rate is too high');
        }
    } catch (error) {
        console.log('Could not calculate withdrawal data for integrated timeline:', error);
    }

    // Prepare accumulation data
    const accumulationYears = currentActiveScenario.yearlyData.map(d => d.year);
    const accumulationCapital = currentActiveScenario.yearlyData.map(d => d.capital);
    const accumulationReal = currentActiveScenario.yearlyData.map(d => d.realCapital);
    
    // Prepare withdrawal data with proper continuation
    const maxAccumulationYear = Math.max(...accumulationYears);
    console.log(`Creating integrated timeline: maxAccumulationYear = ${maxAccumulationYear}`);
    const withdrawalYears = withdrawalData.map(d => maxAccumulationYear + d.year);
    const withdrawalCapital = withdrawalData.map(d => d.endCapital);
    
    // Fix real value calculation for withdrawal phase - use accumulation inflation rate for consistency
    const accumulationInflationRate = parseFloat(getScenarioValue('inflationRate', currentActiveScenario.id)) / 100;
    const withdrawalReal = withdrawalData.map(d => {
        // Calculate real value using total years from start of accumulation
        const totalYears = maxAccumulationYear + d.year - 1;
        return d.endCapital / Math.pow(1 + accumulationInflationRate, totalYears);
    });

    // Create seamless connection by adding transition points
    const lastAccumulationCapital = accumulationCapital[accumulationCapital.length - 1];
    const lastAccumulationReal = accumulationReal[accumulationReal.length - 1];
    
    // Add transition point to withdrawal data (year 0 of withdrawal = final year of accumulation)
    const withdrawalYearsWithTransition = [maxAccumulationYear, ...withdrawalYears];
    const withdrawalCapitalWithTransition = [lastAccumulationCapital, ...withdrawalCapital];
    const withdrawalRealWithTransition = [lastAccumulationReal, ...withdrawalReal];
    
    // Update timeline info
    document.getElementById('accumulationYears').textContent = accumulationYears.length;
    
    // Show withdrawal duration - the mathematical calculation ensures exact depletion
    document.getElementById('withdrawalYears').textContent = withdrawalDuration;
    
    document.getElementById('transitionCapital').textContent = retirementCapital.toLocaleString('de-DE');

    // Create gradients
    const accumulationGradient = ctx.createLinearGradient(0, 0, 0, 400);
    accumulationGradient.addColorStop(0, 'rgba(39, 174, 96, 0.8)');
    accumulationGradient.addColorStop(1, 'rgba(39, 174, 96, 0.1)');

    const withdrawalGradient = ctx.createLinearGradient(0, 0, 0, 400);
    withdrawalGradient.addColorStop(0, 'rgba(231, 76, 60, 0.8)');
    withdrawalGradient.addColorStop(1, 'rgba(231, 76, 60, 0.1)');

    // Store maxAccumulationYear for tooltip access
    const transitionYear = maxAccumulationYear;
    
    integratedChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Ansparphase (Nominal)',
                    data: accumulationCapital.map((value, index) => ({
                        x: accumulationYears[index],
                        y: value
                    })),
                    borderColor: '#27ae60',
                    backgroundColor: accumulationGradient,
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 10,
                    pointBackgroundColor: '#27ae60',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 3,
                    pointHoverBackgroundColor: '#2ecc71',
                    pointHoverBorderColor: '#ffffff',
                    pointHoverBorderWidth: 4,
                    hoverBorderWidth: 4,
                    hoverBackgroundColor: 'rgba(39, 174, 96, 0.9)',
                },
                {
                    label: 'Ansparphase (Real)',
                    data: accumulationReal.map((value, index) => ({
                        x: accumulationYears[index],
                        y: value
                    })),
                    borderColor: '#2ecc71',
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0.4,
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    pointHoverRadius: 8,
                    pointBackgroundColor: '#2ecc71',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointHoverBackgroundColor: '#27ae60',
                    pointHoverBorderColor: '#ffffff',
                    pointHoverBorderWidth: 3,
                    hoverBorderWidth: 3,
                },
                {
                    label: 'Entnahmephase (Nominal)',
                    data: withdrawalCapitalWithTransition.map((value, index) => ({
                        x: withdrawalYearsWithTransition[index],
                        y: value
                    })),
                    borderColor: '#e74c3c',
                    backgroundColor: withdrawalGradient,
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 10,
                    pointBackgroundColor: '#e74c3c',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 3,
                    pointHoverBackgroundColor: '#c0392b',
                    pointHoverBorderColor: '#ffffff',
                    pointHoverBorderWidth: 4,
                    hoverBorderWidth: 4,
                    hoverBackgroundColor: 'rgba(231, 76, 60, 0.9)',
                },
                {
                    label: 'Entnahmephase (Real)',
                    data: withdrawalRealWithTransition.map((value, index) => ({
                        x: withdrawalYearsWithTransition[index],
                        y: value
                    })),
                    borderColor: '#c0392b',
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0.4,
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    pointHoverRadius: 8,
                    pointBackgroundColor: '#c0392b',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointHoverBackgroundColor: '#e74c3c',
                    pointHoverBorderColor: '#ffffff',
                    pointHoverBorderWidth: 3,
                    hoverBorderWidth: 3,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Integrierte Finanzplanung: Anspar- & Entnahmephase',
                    font: {
                        size: 18,
                        weight: 'bold'
                    },
                    color: '#2c3e50'
                },
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        font: { size: 12 }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    titleColor: '#2c3e50',
                    bodyColor: '#2c3e50',
                    borderColor: '#3498db',
                    borderWidth: 2,
                    cornerRadius: 12,
                    displayColors: true,
                    boxPadding: 6,
                    usePointStyle: true,
                    filter: function(tooltipItem) {
                        // Show tooltip for all valid data points
                        return tooltipItem.parsed.y !== null && tooltipItem.parsed.y !== undefined;
                    },
                    callbacks: {
                        title: function(context) {
                            const year = context[0].parsed.x;
                            
                            // Use year-based logic: if year > transitionYear, it's Entnahmephase
                            const phase = year > transitionYear ? 'Entnahmephase' : 'Ansparphase';
                            
                            return `Jahr ${year} (${phase})`;
                        },
                        label: function(context) {
                            return context.dataset.label + ': €' + context.parsed.y.toLocaleString('de-DE', { 
                                minimumFractionDigits: 2, 
                                maximumFractionDigits: 2 
                            });
                        },
                        afterBody: function(context) {
                            const year = context[0].parsed.x;
                            
                            if (year === transitionYear) {
                                return ['', '🔄 Übergang zur Entnahmephase', 'Renteneintritt erreicht!'];
                            }
                            
                            // Use year-based logic: if year > transitionYear, it's Entnahmephase
                            if (year > transitionYear) {
                                const withdrawalYear = Math.max(1, year - transitionYear);
                                return ['', `Jahr ${withdrawalYear} der Entnahmephase`];
                            } else {
                                return ['', `Jahr ${year} der Ansparphase`];
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: {
                        display: true,
                        text: 'Jahre',
                        color: '#2c3e50',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        color: function(context) {
                            // Highlight transition point
                            return context.tick.value === transitionYear ? 
                                'rgba(231, 76, 60, 0.5)' : 'rgba(0, 0, 0, 0.05)';
                        },
                        lineWidth: function(context) {
                            return context.tick.value === transitionYear ? 3 : 1;
                        }
                    },
                    ticks: {
                        stepSize: 5,
                        maxTicksLimit: 15,
                        font: {
                            size: 11
                        },
                        color: '#7f8c8d'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Portfolio Wert (€)',
                        color: '#2c3e50'
                    },
                    ticks: {
                        callback: function(value) {
                            return '€' + value.toLocaleString('de-DE', { 
                                minimumFractionDigits: 2, 
                                maximumFractionDigits: 2 
                            });
                        }
                    }
                }
            },
            interaction: {
                intersect: true,
                mode: 'nearest'
            },
            hover: {
                mode: 'nearest',
                intersect: true,
                animationDuration: 200,
                axis: 'x'
            },
            elements: {
                line: {
                    tension: 0.4,
                    hoverBorderWidth: 4
                },
                point: {
                    hoverRadius: 12,
                    hitRadius: 25,
                    pointStyle: 'circle'
                }
            },
            animation: {
                duration: 2000,
                easing: 'easeInOutQuart'
            }
        }
    });
}

/**
 * Helper function to get scenario value
 * Note: This function requires the global getScenarioValue function to be available
 * @param {string} inputId - The input ID to get value for
 * @param {string} scenarioId - The scenario ID
 * @returns {string} The scenario value
 */
function getScenarioValue(inputId, scenarioId) {
    if (typeof window.getScenarioValue === 'function') {
        return window.getScenarioValue(inputId, scenarioId);
    } else {
        // Fallback: try to get the value directly from DOM
        const element = document.getElementById(inputId + '_' + scenarioId);
        return element ? element.value : '0';
    }
}

// Export chart instances for external access if needed
export { withdrawalChart, integratedChart };