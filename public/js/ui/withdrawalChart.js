/**
 * Withdrawal Chart UI Functions
 * 
 * This module contains all the chart-related functions for the withdrawal phase
 * including the main withdrawal chart and the integrated timeline chart.
 */

// Import required modules
import { formatCurrency, parseGermanNumber } from '../utils.js';
import { calculateTotalContributionsFromAccumulation, calculateWithdrawalPlan } from '../core/withdrawal.js';
import { displayChartErrorMessage } from './mainChart.js';
import { showNotification } from './dom.js';
import * as state from '../state.js';

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

    // Get accumulation data from active scenario using state module
    const currentActiveScenario = state.getActiveScenario();
        
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

    // Get withdrawal data - for integrated timeline, ALWAYS use the retirement capital from input field
    // This ensures the withdrawal phase starts exactly where the user has specified
    let retirementCapital = parseGermanNumber(document.getElementById('retirementCapital').value);
    
    console.log(`🎯 Integrated Timeline: Using retirement capital from input field: €${retirementCapital.toLocaleString()}`);
    
    // Log the accumulation vs retirement capital difference for awareness
    if (currentActiveScenario.yearlyData && currentActiveScenario.yearlyData.length > 0) {
        const actualFinalCapital = currentActiveScenario.yearlyData[currentActiveScenario.yearlyData.length - 1].capital;
        const difference = Math.abs(actualFinalCapital - retirementCapital);
        if (difference > 1000) {
            console.log(`ℹ️ Note: Accumulation ends with €${actualFinalCapital.toLocaleString()}, withdrawal starts with €${retirementCapital.toLocaleString()}`);
            console.log(`📊 Difference at retirement: €${difference.toLocaleString()} (${difference > 0 ? 'increase' : 'decrease'})`);
        }
    }
    
    const withdrawalDuration = parseInt(document.getElementById('withdrawalDuration').value);
    const postRetirementReturn = parseFloat(document.getElementById('postRetirementReturn').value) / 100;
    const inflationRate = parseFloat(document.getElementById('withdrawalInflation').value) / 100;
    const includeTax = document.getElementById('withdrawalTaxToggle').classList.contains('active');
    
    // Debug: Log withdrawal parameters to check for unreasonable values
    console.log(`📊 Withdrawal Parameters:`, {
        retirementCapital: retirementCapital,
        withdrawalDuration: withdrawalDuration,
        postRetirementReturn: postRetirementReturn * 100 + '%',
        inflationRate: inflationRate * 100 + '%',
        includeTax: includeTax
    });

    // Prepare accumulation data
    const accumulationYears = currentActiveScenario.yearlyData.map(d => d.year);
    const accumulationCapital = currentActiveScenario.yearlyData.map(d => d.capital);
    const accumulationReal = currentActiveScenario.yearlyData.map(d => d.realCapital);
    
    // Always use the retirement capital from input for withdrawal calculations in integrated timeline
    // This ensures the withdrawal phase starts exactly at the user-specified value
    const lastAccumulationCapital = accumulationCapital[accumulationCapital.length - 1];

    // Use proper withdrawal calculation that depletes portfolio to zero
    let withdrawalData = [];
    try {
        // Calculate total contributions for the withdrawal calculation
        const calculatedTotalContributions = calculateTotalContributionsFromAccumulation();
        const validatedContributions = calculatedTotalContributions > 0 ? 
            Math.min(calculatedTotalContributions, retirementCapital) : 
            retirementCapital * 0.6; // fallback estimate
        
        console.log(`💰 Calculating optimal withdrawal that depletes portfolio to €0 in ${withdrawalDuration} years`);
        console.log(`Starting capital: €${retirementCapital.toLocaleString()}`);
        
        const withdrawalResults = calculateWithdrawalPlan(
            retirementCapital, withdrawalDuration, postRetirementReturn, 
            inflationRate, includeTax, validatedContributions
        );
        withdrawalData = withdrawalResults.yearlyData || [];
        
        console.log(`Withdrawal calculation complete: ${withdrawalData.length} years of data`);
        console.log(`Final portfolio value: €${withdrawalResults.finalCapital.toLocaleString()}`);
        console.log(`Monthly withdrawal amount: €${withdrawalResults.monthlyGrossWithdrawal.toLocaleString()}`);
        
    } catch (error) {
        console.error('Withdrawal calculation failed for integrated timeline:', error);
        
        // Fallback: simple withdrawal simulation
        console.log('Using fallback withdrawal simulation...');
        const annualWithdrawalAmount = retirementCapital * 0.04;
        let currentCapital = retirementCapital;
        
        for (let year = 1; year <= withdrawalDuration; year++) {
            const startCapital = currentCapital;
            const capitalAfterReturn = startCapital * (1 + postRetirementReturn);
            const inflationAdjustedWithdrawal = annualWithdrawalAmount * Math.pow(1 + inflationRate, year - 1);
            const endCapital = Math.max(0, capitalAfterReturn - inflationAdjustedWithdrawal);
            
            withdrawalData.push({
                year: year,
                startCapital: startCapital,
                endCapital: endCapital,
                grossWithdrawal: inflationAdjustedWithdrawal,
                netWithdrawal: inflationAdjustedWithdrawal,
                capitalAfterReturns: capitalAfterReturn
            });
            
            currentCapital = endCapital;
            if (endCapital <= 0) break;
        }
    }
    
    // Prepare withdrawal data with proper continuation
    const maxAccumulationYear = Math.max(...accumulationYears);
    console.log(`Creating integrated timeline: maxAccumulationYear = ${maxAccumulationYear}`);
    const withdrawalYears = withdrawalData.map(d => maxAccumulationYear + d.year);
    
    // Debug: Log withdrawal data to identify the issue
    console.log(`Withdrawal data debugging:`, {
        withdrawalDataLength: withdrawalData.length,
        maxAccumulationYear: maxAccumulationYear,
        withdrawalYears: withdrawalYears.slice(0, 5),
        withdrawalStartCapitals: withdrawalData.slice(0, 5).map(d => d.startCapital),
        withdrawalEndCapitals: withdrawalData.slice(0, 5).map(d => d.endCapital),
        lastAccumulationCapital: accumulationCapital[accumulationCapital.length - 1]
    });
    
    // Verify that withdrawal data makes sense
    if (withdrawalData.length > 0) {
        console.log(`✅ Withdrawal data verification:`);
        console.log(`   First withdrawal year start: €${withdrawalData[0].startCapital.toLocaleString()}`);
        console.log(`   First withdrawal year end: €${withdrawalData[0].endCapital.toLocaleString()}`);
        console.log(`   Last withdrawal year start: €${withdrawalData[withdrawalData.length - 1].startCapital.toLocaleString()}`);
        console.log(`   Last withdrawal year end: €${withdrawalData[withdrawalData.length - 1].endCapital.toLocaleString()}`);
        console.log(`   Portfolio correctly declining: ${withdrawalData[0].startCapital > withdrawalData[withdrawalData.length - 1].endCapital ? 'YES' : 'NO'}`);
        console.log(`   Any negative end values: ${withdrawalData.some(d => d.endCapital < 0) ? 'YES' : 'NO'}`);
    }
    
    // Get accumulation inflation rate for consistent real value calculations
    const accumulationInflationRate = parseFloat(getScenarioValue('inflationRate', currentActiveScenario.id)) / 100;

    // Create seamless transition by extending accumulation data to match retirement capital
    const difference = Math.abs(lastAccumulationCapital - retirementCapital);
    
    let finalAccumulationYears = [...accumulationYears];
    let finalAccumulationCapital = [...accumulationCapital];
    let finalAccumulationReal = [...accumulationReal];
    
    // Always ensure the accumulation phase ends exactly at retirement capital for perfect visual connection
    console.log(`🌉 Ensuring seamless transition: Accumulation ends at €${lastAccumulationCapital.toLocaleString()}, retirement starts at €${retirementCapital.toLocaleString()}`);
    
    // Always add/update the retirement capital as the final point of accumulation phase
    if (finalAccumulationYears[finalAccumulationYears.length - 1] === maxAccumulationYear) {
        // Update existing final year
        finalAccumulationCapital[finalAccumulationCapital.length - 1] = retirementCapital;
        finalAccumulationReal[finalAccumulationReal.length - 1] = retirementCapital / Math.pow(1 + accumulationInflationRate, maxAccumulationYear);
    } else {
        // Add new final year
        finalAccumulationYears.push(maxAccumulationYear);
        finalAccumulationCapital.push(retirementCapital);
        finalAccumulationReal.push(retirementCapital / Math.pow(1 + accumulationInflationRate, maxAccumulationYear));
    }
    
    console.log(`📊 Accumulation phase now ends exactly at €${retirementCapital.toLocaleString()} in year ${maxAccumulationYear}`);
    
    // For integrated timeline, show the portfolio decline by using endCapital
    // This will show the portfolio value AFTER withdrawals are made, reaching exactly €0
    const withdrawalEndCapital = withdrawalData.map(d => d.endCapital);
    
    // Create seamless transition by including the transition point
    // Start with retirement capital, then show the declining portfolio after each withdrawal
    const withdrawalYearsWithTransition = [maxAccumulationYear, ...withdrawalYears];
    const withdrawalCapitalWithTransition = [retirementCapital, ...withdrawalEndCapital];
    
    // For real values, use endCapital to match the nominal values and show decline to €0
    const withdrawalRealFromEnd = withdrawalData.map(d => {
        // Calculate real value using total years from start of accumulation
        const totalYears = maxAccumulationYear + d.year - 1;
        return d.endCapital / Math.pow(1 + accumulationInflationRate, totalYears);
    });
    const withdrawalRealWithTransition = [retirementCapital / Math.pow(1 + accumulationInflationRate, maxAccumulationYear), ...withdrawalRealFromEnd];
    
    // Debug: Check the transition point
    console.log(`🔍 Transition point analysis:`, {
        originalAccumulationEnd: lastAccumulationCapital,
        retirementCapitalFromInput: retirementCapital,
        finalAccumulationEnd: finalAccumulationCapital[finalAccumulationCapital.length - 1],
        firstWithdrawalStartCapital: withdrawalData.length > 0 ? withdrawalData[0].startCapital : 'N/A',
        firstWithdrawalEndCapital: withdrawalData.length > 0 ? withdrawalData[0].endCapital : 'N/A',
        bridgeAdded: difference > 1000,
        perfectTransition: withdrawalData.length > 0 ? (Math.abs(retirementCapital - withdrawalData[0].startCapital) < 1) : 'N/A',
        fixApplied: 'Using startCapital for withdrawal plotting to show portfolio value before withdrawal'
    });
    
    // Update timeline info
    document.getElementById('accumulationYears').textContent = finalAccumulationYears.length;
    
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
                    data: finalAccumulationCapital.map((value, index) => ({
                        x: finalAccumulationYears[index],
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
                    data: finalAccumulationReal.map((value, index) => ({
                        x: finalAccumulationYears[index],
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
                intersect: true,     // Must intersect with data point
                mode: 'nearest'      // Find nearest point to cursor
            },
            hover: {
                mode: 'nearest',     // Same as interaction
                intersect: true,     // Same as interaction
                animationDuration: 200,
                axis: 'x'           // Primary axis for nearest calculation
            },
            elements: {
                line: {
                    tension: 0.4,
                    hoverBorderWidth: 4
                },
                point: {
                    hoverRadius: 12,
                    hitRadius: 50, // Increased hit detection radius for better user experience
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