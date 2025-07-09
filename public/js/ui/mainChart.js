// Main Chart UI Functions
// Handles the main chart display, comparison charts, and contributions/gains charts

// Import required modules
import { scenarios, currentChartMode, selectedScenariosForChart, selectedContributionsScenario, currentPhase } from '../state/globalState.js';

// Chart instance (global for destruction)
let chart = null;

/**
 * Display error message on chart canvas
 * @param {HTMLCanvasElement} canvas - The canvas element
 * @param {CanvasRenderingContext2D} ctx - The canvas context
 * @param {string} errorType - Type of error ('no-scenarios', 'no-data', 'no-scenario-data', 'calculation-error')
 * @param {object} customMessage - Custom message object with title and subtitle
 */
function displayChartErrorMessage(canvas, ctx, errorType = 'no-scenarios', customMessage = null) {
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
 * Update the main chart based on current mode
 */
function updateMainChart() {
    // Update chart based on current mode
    if (currentChartMode === 'comparison') {
        updateComparisonChart();
    } else if (currentChartMode === 'contributions') {
        updateContributionsGainsChart();
    }
}

/**
 * Update the comparison chart showing multiple scenarios
 */
function updateComparisonChart() {
    const ctx = document.getElementById('wealthChart').getContext('2d');
    
    if (chart) {
        chart.destroy();
    }

    // Get only selected scenarios
    const selectedScenarios = scenarios.filter(s => selectedScenariosForChart.has(s.id));
    
    if (selectedScenarios.length === 0) {
        // If no scenarios selected, show a message
        const canvas = document.getElementById('wealthChart');
        displayChartErrorMessage(canvas, ctx, 'no-scenarios');
        return;
    }

    // Get the maximum duration to create consistent x-axis
    const maxDuration = Math.max(...selectedScenarios.map(s => s.yearlyData ? s.yearlyData.length - 1 : 0));
    const years = Array.from({length: maxDuration + 1}, (_, i) => i);

    // Create datasets for each selected scenario
    const datasets = [];
    
    // Define visibleScenarios for tooltip use
    const visibleScenarios = selectedScenarios;
    
    selectedScenarios.forEach(scenario => {
        if (!scenario.yearlyData || scenario.yearlyData.length === 0) return;
        
        // Nominal values
        const nominalData = years.map(year => {
            const yearData = scenario.yearlyData.find(d => d.year === year);
            return yearData ? yearData.capital : null;
        });

        // Real values  
        const realData = years.map(year => {
            const yearData = scenario.yearlyData.find(d => d.year === year);
            return yearData ? yearData.realCapital : null;
        });

        // Create gradient for this scenario
        const nominalGradient = ctx.createLinearGradient(0, 0, 0, 400);
        nominalGradient.addColorStop(0, scenario.color + '80'); // 50% opacity
        nominalGradient.addColorStop(1, scenario.color + '20'); // 12% opacity

        // Add nominal dataset
        datasets.push({
            label: `${scenario.name} (Nominal)`,
            data: nominalData,
            borderColor: scenario.color,
            backgroundColor: nominalGradient,
            fill: false,
            tension: 0.4,
            borderWidth: 3,
            pointBackgroundColor: scenario.color,
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 2,
            pointHoverRadius: 8,
            scenarioId: scenario.id
        });

        // Add real dataset (dashed line)
        datasets.push({
            label: `${scenario.name} (Real)`,
            data: realData,
            borderColor: scenario.color,
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.4,
            borderWidth: 2,
            borderDash: [8, 4],
            pointBackgroundColor: scenario.color,
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 2,
            pointHoverRadius: 6,
            scenarioId: scenario.id
        });
    });

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: years,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 20,
                    right: 20,
                    bottom: 20,
                    left: 20
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Szenario-Vergleich: Vermögensentwicklung',
                    font: {
                        size: 18,
                        weight: 'bold',
                        family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                    },
                    color: '#2c3e50',
                    padding: {
                        top: 10,
                        bottom: 30
                    }
                },
                legend: {
                    position: 'top',
                    align: 'center',
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: {
                            size: 12,
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                        },
                        color: '#2c3e50',
                        padding: 20,
                        boxWidth: 12,
                        boxHeight: 12
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#2c3e50',
                    bodyColor: '#2c3e50',
                    borderColor: '#3498db',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    usePointStyle: true,
                    mode: 'nearest',
                    intersect: false,
                    boxPadding: 8,
                    callbacks: {
                        title: function(context) {
                            return 'Jahr ' + context[0].label;
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
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Jahre',
                        font: {
                            size: 14,
                            weight: 'bold',
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                        },
                        color: '#2c3e50'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        lineWidth: 1
                    },
                    ticks: {
                        font: {
                            size: 12,
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                        },
                        color: '#7f8c8d',
                        maxTicksLimit: 10
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Betrag (€)',
                        font: {
                            size: 14,
                            weight: 'bold',
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                        },
                        color: '#2c3e50'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        lineWidth: 1
                    },
                    ticks: {
                        font: {
                            size: 12,
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                        },
                        color: '#7f8c8d',
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
                intersect: false,
                mode: 'nearest'
            },
            hover: {
                mode: 'nearest',
                intersect: false,
                animationDuration: 200
            },
            elements: {
                line: {
                    capBezierPoints: false
                }
            },
            animation: {
                duration: 1500,
                easing: 'easeInOutQuart'
            }
        }
    });
}

/**
 * Update the contributions vs gains chart for a selected scenario
 */
function updateContributionsGainsChart() {
    const ctx = document.getElementById('wealthChart').getContext('2d');
    
    if (chart) {
        chart.destroy();
    }

    // Use the selected scenario from the dropdown
    const displayScenario = scenarios.find(s => s.id === selectedContributionsScenario);
    
    if (!displayScenario || !displayScenario.yearlyData || displayScenario.yearlyData.length === 0) {
        const canvas = document.getElementById('wealthChart');
        displayChartErrorMessage(canvas, ctx, 'no-scenario-data');
        return;
    }

    const years = displayScenario.yearlyData.map(d => d.year);
    
    // Calculate contributions (cumulative invested capital)
    const contributionsData = displayScenario.yearlyData.map(d => d.totalInvested);
    
    // Calculate gains (total capital minus invested capital)
    const gainsData = displayScenario.yearlyData.map(d => Math.max(0, d.capital - d.totalInvested));
    
    // Calculate real value line
    const realValueData = displayScenario.yearlyData.map(d => d.realCapital);

    // Create gradients for the stacked areas - use consistent colors regardless of scenario
    const contributionsGradient = ctx.createLinearGradient(0, 0, 0, 400);
    contributionsGradient.addColorStop(0, '#3498db80'); // Always blue for contributions
    contributionsGradient.addColorStop(1, '#3498db40');

    const gainsGradient = ctx.createLinearGradient(0, 0, 0, 400);
    gainsGradient.addColorStop(0, '#27ae6080'); // Always green for gains
    gainsGradient.addColorStop(1, '#27ae6040');

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [
                {
                    label: 'Eingezahltes Kapital',
                    data: contributionsData,
                    borderColor: '#3498db', // Always blue for contributions
                    backgroundColor: contributionsGradient,
                    fill: 'origin',
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 2,
                    pointHoverRadius: 6
                },
                {
                    label: 'Kursgewinne',
                    data: gainsData.map((gain, index) => gain + contributionsData[index]),
                    borderColor: '#27ae60', // Always green for gains
                    backgroundColor: gainsGradient,
                    fill: '-1', // Fill to previous dataset
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 2,
                    pointHoverRadius: 6
                },
                {
                    label: 'Realer Wert (inflationsbereinigt)',
                    data: realValueData,
                    borderColor: '#9b59b6',
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0.4,
                    borderWidth: 2,
                    borderDash: [8, 4],
                    pointRadius: 2,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 20,
                    right: 20,
                    bottom: 20,
                    left: 20
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: `Vermögensentwicklung: Einzahlungen vs. Kursgewinne (${displayScenario.name})`,
                    font: {
                        size: 18,
                        weight: 'bold',
                        family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                    },
                    color: '#2c3e50',
                    padding: {
                        top: 10,
                        bottom: 30
                    }
                },
                legend: {
                    position: 'top',
                    align: 'center',
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: {
                            size: 12,
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                        },
                        color: '#2c3e50',
                        padding: 20,
                        boxWidth: 12,
                        boxHeight: 12
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#2c3e50',
                    bodyColor: '#2c3e50',
                    borderColor: '#3498db',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    usePointStyle: true,
                    mode: 'nearest',
                    intersect: false,
                    boxPadding: 8,
                    callbacks: {
                        title: function(context) {
                            return 'Jahr ' + context[0].label;
                        },
                        label: function(context) {
                            const datasetLabel = context.dataset.label;
                            const value = context.parsed.y;
                            return `${datasetLabel}: €${value.toLocaleString('de-DE', { 
                                minimumFractionDigits: 0, 
                                maximumFractionDigits: 0 
                            })}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Jahre',
                        font: {
                            size: 14,
                            weight: 'bold',
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                        },
                        color: '#2c3e50'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        lineWidth: 1
                    },
                    ticks: {
                        font: {
                            size: 12,
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                        },
                        color: '#7f8c8d',
                        maxTicksLimit: 10
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Betrag (€)',
                        font: {
                            size: 14,
                            weight: 'bold',
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                        },
                        color: '#2c3e50'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        lineWidth: 1
                    },
                    ticks: {
                        font: {
                            size: 12,
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                        },
                        color: '#7f8c8d',
                        callback: function(value) {
                            return '€' + value.toLocaleString('de-DE', { 
                                minimumFractionDigits: 2, 
                                maximumFractionDigits: 2 
                            });
                        }
                    },
                    stacked: false
                }
            },
            interaction: {
                intersect: false,
                mode: 'nearest'
            },
            hover: {
                mode: 'nearest',
                intersect: false,
                animationDuration: 200
            },
            elements: {
                line: {
                    capBezierPoints: false
                },
                point: {
                    hoverRadius: 8,
                    hitRadius: 15
                }
            },
            animation: {
                duration: 1500,
                easing: 'easeInOutQuart'
            }
        }
    });
}

/**
 * Set up event listeners for chart toggle buttons
 */
function setupChartToggleListeners() {
    // Accumulation phase chart toggle
    const scenarioComparisonBtn = document.getElementById('scenarioComparisonBtn');
    const contributionsGainsBtn = document.getElementById('contributionsGainsBtn');

    if (scenarioComparisonBtn) {
        scenarioComparisonBtn.addEventListener('click', function() {
            // Switch to scenario comparison view
            scenarioComparisonBtn.classList.add('active');
            contributionsGainsBtn.classList.remove('active');
            currentChartMode = 'comparison';
            updateMainChart();
            updateScenarioCheckboxVisibility();
        });
    }

    if (contributionsGainsBtn) {
        contributionsGainsBtn.addEventListener('click', function() {
            // Switch to contributions vs gains view
            contributionsGainsBtn.classList.add('active');
            scenarioComparisonBtn.classList.remove('active');
            currentChartMode = 'contributions';
            updateContributionsGainsChart();
            updateScenarioCheckboxVisibility();
        });
    }
}

/**
 * Update visibility of scenario selectors based on current chart mode
 */
function updateScenarioCheckboxVisibility() {
    const checkboxContainer = document.getElementById('scenarioCheckboxes');
    const contributionsSelector = document.getElementById('contributionsScenarioSelector');
    if (!checkboxContainer || !contributionsSelector) return;
    
    // Show checkboxes only in accumulation phase (not in scenario comparison phase)
    const isAccumulationPhase = currentPhase === 'accumulation';
    
    if (isAccumulationPhase) {
        // Show appropriate selector based on chart mode
        if (currentChartMode === 'comparison') {
            checkboxContainer.style.display = 'flex';
            contributionsSelector.style.display = 'none';
        } else if (currentChartMode === 'contributions') {
            checkboxContainer.style.display = 'none';
            contributionsSelector.style.display = 'block';
        }
    } else {
        // Hide both in other phases
        checkboxContainer.style.display = 'none';
        contributionsSelector.style.display = 'none';
    }
}

// Export functions for use in other modules
export {
    updateMainChart,
    updateComparisonChart,
    updateContributionsGainsChart,
    displayChartErrorMessage,
    setupChartToggleListeners,
    updateScenarioCheckboxVisibility
};