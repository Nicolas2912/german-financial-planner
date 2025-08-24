// js/features/scenarioComparison.js - Comprehensive Multi-Scenario Financial Comparison Tool
// German Financial Planner - Advanced Scenario Comparison Module

'use strict';

// Global State Management
let scenarios = [
    {
        id: 'A',
        name: 'Basis-Szenario',
        emoji: '📈',
        color: '#3498db',
        visible: true,
        parameters: {
            budget: {
                netIncome: 3500,
                monthlyExpenses: 2800,
                availableForSaving: 700
            },
            accumulation: {
                monthlySavings: 500,
                initialCapital: 10000,
                annualReturn: 7.0,
                duration: 25,
                inflationRate: 2.0,
                includeTax: true,
                teilfreistellung: true
            },
            withdrawal: {
                duration: 25,
                returnRate: 5.0,
                inflationRate: 2.0,
                includeTax: true
            }
        },
        results: {
            accumulation: {},
            withdrawal: {},
            performance: {}
        }
    },
    {
        id: 'B',
        name: 'Vergleichs-Szenario',
        emoji: '📊',
        color: '#27ae60',
        visible: true,
        parameters: {
            budget: {
                netIncome: 3500,
                monthlyExpenses: 2800,
                availableForSaving: 700
            },
            accumulation: {
                monthlySavings: 600,
                initialCapital: 15000,
                annualReturn: 8.0,
                duration: 20,
                inflationRate: 2.5,
                includeTax: true,
                teilfreistellung: true
            },
            withdrawal: {
                duration: 30,
                returnRate: 6.0,
                inflationRate: 2.5,
                includeTax: true
            }
        },
        results: {
            accumulation: {},
            withdrawal: {},
            performance: {}
        }
    }
];

const scenarioColors = ['#3498db', '#27ae60', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c'];
const scenarioEmojis = ['📈', '📊', '📉', '💼', '🎯', '🚀'];
let currentChartView = 'lifecycle';
let comparisonChart = null;

// Utility Functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function formatPercentage(value, decimals = 1) {
    return value.toFixed(decimals) + '%';
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showNotification(title, message, type = 'info', duration = 4000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : type === 'warning' ? '#f39c12' : '#3498db'};
        color: white;
        border-radius: 8px;
        z-index: 10000;
        max-width: 350px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        animation: slideIn 0.3s ease-out;
    `;
    notification.innerHTML = `<strong>${title}</strong><br>${message}`;
    
    // Add animation keyframes
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

// Core Calculation Functions
function calculateAccumulationPhase(params) {
    const {
        monthlySavings,
        initialCapital,
        annualReturn,
        duration,
        inflationRate,
        includeTax,
        teilfreistellung
    } = params;
    
    const monthlyReturn = annualReturn / 100 / 12;
    const totalMonths = duration * 12;
    
    let capital = initialCapital;
    let totalInvested = initialCapital;
    let totalGains = 0;
    let totalTaxes = 0;
    
    const monthlyData = [];
    
    for (let month = 1; month <= totalMonths; month++) {
        // Add monthly contribution
        capital += monthlySavings;
        totalInvested += monthlySavings;
        
        // Calculate monthly gains
        const monthlyGains = capital * monthlyReturn;
        totalGains += monthlyGains;
        
        // Apply taxes if enabled
        let taxOnGains = 0;
        if (includeTax && monthlyGains > 0) {
            let taxableGains = monthlyGains;
            if (teilfreistellung) {
                taxableGains = monthlyGains * 0.7; // 30% tax-free allowance
            }
            taxOnGains = taxableGains * 0.26375; // 25% capital gains tax + 5.5% solidarity surcharge
            totalTaxes += taxOnGains;
        }
        
        capital += monthlyGains - taxOnGains;
        
        // Store monthly data for charts
        if (month % 12 === 0) {
            monthlyData.push({
                year: month / 12,
                capital: capital,
                invested: totalInvested,
                gains: totalGains,
                taxes: totalTaxes
            });
        }
    }
    
    const finalNominal = capital;
    const totalReturn = finalNominal - totalInvested;
    const effectiveAnnualReturn = totalInvested > 0 ? (Math.pow(finalNominal / totalInvested, 1 / duration) - 1) * 100 : 0;
    
    // Real value calculation (inflation-adjusted)
    const inflationFactor = Math.pow(1 + inflationRate / 100, duration);
    const finalReal = finalNominal / inflationFactor;
    
    return {
        finalNominal,
        finalReal,
        totalInvested,
        totalReturn,
        totalGains,
        totalTaxes,
        effectiveAnnualReturn,
        inflationFactor,
        monthlyData
    };
}

function calculateWithdrawalPhase(accumulationResults, params) {
    const {
        duration,
        returnRate,
        inflationRate,
        includeTax
    } = params;
    
    const startCapital = accumulationResults.finalNominal || 0;
    if (startCapital <= 0) return {};
    
    // Use 4% rule as base, but allow for different withdrawal strategies
    const annualWithdrawalRate = 0.04;
    const baseAnnualWithdrawal = startCapital * annualWithdrawalRate;
    
    let remainingCapital = startCapital;
    let totalWithdrawn = 0;
    let totalTaxes = 0;
    const withdrawalData = [];
    
    for (let year = 1; year <= duration; year++) {
        // Apply investment returns
        const yearlyReturns = remainingCapital * (returnRate / 100);
        remainingCapital += yearlyReturns;
        
        // Calculate withdrawal (adjusted for inflation)
        const inflationAdjustment = Math.pow(1 + inflationRate / 100, year - 1);
        let yearlyWithdrawal = baseAnnualWithdrawal * inflationAdjustment;
        
        // Apply taxes if enabled
        let taxOnWithdrawal = 0;
        if (includeTax) {
            // German tax system: only gains are taxed
            const gainsPortion = yearlyReturns > 0 ? (yearlyReturns / remainingCapital) * yearlyWithdrawal : 0;
            taxOnWithdrawal = gainsPortion * 0.26375;
            totalTaxes += taxOnWithdrawal;
        }
        
        const netYearlyWithdrawal = yearlyWithdrawal - taxOnWithdrawal;
        remainingCapital -= yearlyWithdrawal;
        totalWithdrawn += yearlyWithdrawal;
        
        withdrawalData.push({
            year: year,
            capital: Math.max(0, remainingCapital),
            withdrawal: yearlyWithdrawal,
            netWithdrawal: netYearlyWithdrawal,
            taxes: taxOnWithdrawal
        });
        
        // Stop if capital is depleted
        if (remainingCapital <= 0) {
            remainingCapital = 0;
            break;
        }
    }
    
    const monthlyGrossWithdrawal = baseAnnualWithdrawal / 12;
    const monthlyNetWithdrawal = (baseAnnualWithdrawal - (totalTaxes / duration)) / 12;
    const realPurchasingPower = monthlyNetWithdrawal / Math.pow(1 + inflationRate / 100, duration / 2);
    
    return {
        monthlyGrossWithdrawal,
        monthlyNetWithdrawal,
        realPurchasingPower,
        totalWithdrawn,
        remainingCapital,
        totalTaxes,
        yearsUntilDepletion: remainingCapital > 0 ? duration : withdrawalData.length,
        withdrawalData
    };
}

function calculatePerformanceMetrics(scenario) {
    const accumResults = scenario.results.accumulation;
    const withdrawResults = scenario.results.withdrawal;
    const params = scenario.parameters;
    
    if (!accumResults.finalNominal) return {};
    
    // Risk Score (0-10, higher = riskier)
    const returnRisk = Math.max(0, (params.accumulation.annualReturn - 5) * 1.5);
    const durationRisk = Math.max(0, (params.accumulation.duration - 20) * 0.3);
    const inflationRisk = params.accumulation.inflationRate * 1.2;
    const riskScore = Math.min(10, returnRisk + durationRisk + inflationRisk);
    
    // Efficiency Score (0-10, higher = better)
    const returnEfficiency = Math.min(10, accumResults.effectiveAnnualReturn * 0.8);
    const taxEfficiency = params.accumulation.includeTax ? (params.accumulation.teilfreistellung ? 7 : 5) : 10;
    const efficiencyScore = (returnEfficiency + taxEfficiency) / 2;
    
    // Stability Score (0-10, higher = more stable)
    const returnStability = Math.max(0, 10 - Math.abs(params.accumulation.annualReturn - 7));
    const inflationStability = Math.max(0, 10 - params.accumulation.inflationRate * 2);
    const stabilityScore = (returnStability + inflationStability) / 2;
    
    return {
        riskScore,
        efficiencyScore,
        stabilityScore,
        overallScore: (efficiencyScore * 0.4 + stabilityScore * 0.35 + (10 - riskScore) * 0.25)
    };
}

// Debounced calculation function
const debouncedCalculateScenario = debounce((scenarioId) => {
    calculateScenarioResults(scenarioId);
}, 300);

function calculateScenarioResults(scenarioId) {
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario) return;
    
    // Calculate accumulation phase
    scenario.results.accumulation = calculateAccumulationPhase(scenario.parameters.accumulation);
    
    // Calculate withdrawal phase
    scenario.results.withdrawal = calculateWithdrawalPhase(
        scenario.results.accumulation, 
        scenario.parameters.withdrawal
    );
    
    // Calculate performance metrics
    scenario.results.performance = calculatePerformanceMetrics(scenario);
    
    // Update UI
    updateResultsDisplay();
    updateChart();
    updateParameterTable();
    updatePerformanceAnalysis();
}

// UI Generation Functions
function createScenarioConfigurationPanel(scenario) {
    const panel = document.createElement('div');
    panel.className = 'scenario-config-panel';
    panel.dataset.scenarioId = scenario.id;
    panel.style.display = 'none';
    
    panel.innerHTML = `
        <div class="config-panel-header" style="border-left: 4px solid ${scenario.color};">
            <h3 class="panel-title">${scenario.emoji} ${scenario.name}</h3>
            <div class="scenario-actions">
                <button class="btn btn-sm btn-secondary" onclick="renameScenario('${scenario.id}')">
                    ✏️ Umbenennen
                </button>
                <button class="btn btn-sm btn-secondary" onclick="duplicateScenario('${scenario.id}')">
                    📋 Duplizieren
                </button>
                ${scenario.id !== 'A' ? `
                <button class="btn btn-sm btn-danger" onclick="removeScenario('${scenario.id}')">
                    🗑️ Löschen
                </button>
                ` : ''}
            </div>
        </div>

        <div class="config-sections">
            <!-- Budget Parameters -->
            <div class="config-section">
                <h4 class="config-section-title">💰 Budget-Planung</h4>
                <div class="parameter-grid">
                    <div class="parameter-group">
                        <label class="parameter-label">Monatliches Netto-Einkommen</label>
                        <div class="input-with-unit">
                            <input type="number" class="parameter-input" 
                                   data-param="budget.netIncome" 
                                   value="${scenario.parameters.budget.netIncome}" 
                                   min="0" step="100">
                            <span class="input-unit">€</span>
                        </div>
                    </div>
                    <div class="parameter-group">
                        <label class="parameter-label">Monatliche Ausgaben</label>
                        <div class="input-with-unit">
                            <input type="number" class="parameter-input" 
                                   data-param="budget.monthlyExpenses" 
                                   value="${scenario.parameters.budget.monthlyExpenses}" 
                                   min="0" step="50">
                            <span class="input-unit">€</span>
                        </div>
                    </div>
                    <div class="parameter-group">
                        <label class="parameter-label">Verfügbar für Sparen</label>
                        <div class="input-with-unit">
                            <input type="number" class="parameter-input" 
                                   data-param="budget.availableForSaving" 
                                   value="${scenario.parameters.budget.availableForSaving}" 
                                   min="0" step="50">
                            <span class="input-unit">€</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Accumulation Phase Parameters -->
            <div class="config-section">
                <h4 class="config-section-title">📈 Ansparphase</h4>
                <div class="parameter-grid">
                    <div class="parameter-group">
                        <label class="parameter-label">Monatliche Sparrate</label>
                        <div class="input-with-unit">
                            <input type="number" class="parameter-input" 
                                   data-param="accumulation.monthlySavings" 
                                   value="${scenario.parameters.accumulation.monthlySavings}" 
                                   min="0" step="50">
                            <span class="input-unit">€</span>
                        </div>
                    </div>
                    <div class="parameter-group">
                        <label class="parameter-label">Startkapital</label>
                        <div class="input-with-unit">
                            <input type="number" class="parameter-input" 
                                   data-param="accumulation.initialCapital" 
                                   value="${scenario.parameters.accumulation.initialCapital}" 
                                   min="0" step="1000">
                            <span class="input-unit">€</span>
                        </div>
                    </div>
                    <div class="parameter-group">
                        <label class="parameter-label">Jährliche Rendite</label>
                        <div class="range-input-group">
                            <input type="range" class="parameter-range" 
                                   data-param="accumulation.annualReturn" 
                                   value="${scenario.parameters.accumulation.annualReturn}" 
                                   min="0" max="15" step="0.1">
                            <span class="range-value">${scenario.parameters.accumulation.annualReturn.toFixed(1)}%</span>
                        </div>
                    </div>
                    <div class="parameter-group">
                        <label class="parameter-label">Anlagedauer</label>
                        <div class="range-input-group">
                            <input type="range" class="parameter-range" 
                                   data-param="accumulation.duration" 
                                   value="${scenario.parameters.accumulation.duration}" 
                                   min="1" max="50" step="1">
                            <span class="range-value">${scenario.parameters.accumulation.duration} Jahre</span>
                        </div>
                    </div>
                    <div class="parameter-group">
                        <label class="parameter-label">Inflationsrate</label>
                        <div class="range-input-group">
                            <input type="range" class="parameter-range" 
                                   data-param="accumulation.inflationRate" 
                                   value="${scenario.parameters.accumulation.inflationRate}" 
                                   min="0" max="6" step="0.1">
                            <span class="range-value">${scenario.parameters.accumulation.inflationRate.toFixed(1)}%</span>
                        </div>
                    </div>
                </div>
                
                <div class="toggle-options">
                    <div class="toggle-group">
                        <label class="toggle-label">
                            <input type="checkbox" class="toggle-input" 
                                   data-param="accumulation.includeTax" 
                                   ${scenario.parameters.accumulation.includeTax ? 'checked' : ''}>
                            <span class="toggle-switch"></span>
                            Deutsche Abgeltungssteuer (26,375%) berücksichtigen
                        </label>
                    </div>
                    <div class="toggle-group">
                        <label class="toggle-label">
                            <input type="checkbox" class="toggle-input" 
                                   data-param="accumulation.teilfreistellung" 
                                   ${scenario.parameters.accumulation.teilfreistellung ? 'checked' : ''}>
                            <span class="toggle-switch"></span>
                            ETF-Teilfreistellung (30%) anwenden
                        </label>
                    </div>
                </div>
            </div>

            <!-- Withdrawal Phase Parameters -->
            <div class="config-section">
                <h4 class="config-section-title">🏖️ Entnahmephase</h4>
                <div class="parameter-grid">
                    <div class="parameter-group">
                        <label class="parameter-label">Entnahmedauer</label>
                        <div class="range-input-group">
                            <input type="range" class="parameter-range" 
                                   data-param="withdrawal.duration" 
                                   value="${scenario.parameters.withdrawal.duration}" 
                                   min="10" max="50" step="1">
                            <span class="range-value">${scenario.parameters.withdrawal.duration} Jahre</span>
                        </div>
                    </div>
                    <div class="parameter-group">
                        <label class="parameter-label">Rendite im Ruhestand</label>
                        <div class="range-input-group">
                            <input type="range" class="parameter-range" 
                                   data-param="withdrawal.returnRate" 
                                   value="${scenario.parameters.withdrawal.returnRate}" 
                                   min="0" max="12" step="0.1">
                            <span class="range-value">${scenario.parameters.withdrawal.returnRate.toFixed(1)}%</span>
                        </div>
                    </div>
                    <div class="parameter-group">
                        <label class="parameter-label">Inflationsrate im Ruhestand</label>
                        <div class="range-input-group">
                            <input type="range" class="parameter-range" 
                                   data-param="withdrawal.inflationRate" 
                                   value="${scenario.parameters.withdrawal.inflationRate}" 
                                   min="0" max="6" step="0.1">
                            <span class="range-value">${scenario.parameters.withdrawal.inflationRate.toFixed(1)}%</span>
                        </div>
                    </div>
                </div>
                
                <div class="toggle-options">
                    <div class="toggle-group">
                        <label class="toggle-label">
                            <input type="checkbox" class="toggle-input" 
                                   data-param="withdrawal.includeTax" 
                                   ${scenario.parameters.withdrawal.includeTax ? 'checked' : ''}>
                            <span class="toggle-switch"></span>
                            Abgeltungssteuer bei Entnahmen berücksichtigen
                        </label>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    setupPanelEventListeners(panel, scenario.id);
    return panel;
}

function setupPanelEventListeners(panel, scenarioId) {
    // Number input listeners
    panel.querySelectorAll('.parameter-input').forEach(input => {
        input.addEventListener('input', (e) => {
            updateScenarioParameter(scenarioId, e.target.dataset.param, parseFloat(e.target.value) || 0);
            debouncedCalculateScenario(scenarioId);
        });
    });
    
    // Range input listeners
    panel.querySelectorAll('.parameter-range').forEach(range => {
        range.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            const valueSpan = e.target.nextElementSibling;
            
            // Update display value
            if (e.target.dataset.param.includes('Rate') || e.target.dataset.param.includes('Return') || e.target.dataset.param.includes('inflation')) {
                valueSpan.textContent = value.toFixed(1) + '%';
            } else if (e.target.dataset.param.includes('duration')) {
                valueSpan.textContent = value + ' Jahre';
            }
            
            updateScenarioParameter(scenarioId, e.target.dataset.param, value);
            debouncedCalculateScenario(scenarioId);
        });
    });
    
    // Toggle input listeners
    panel.querySelectorAll('.toggle-input').forEach(toggle => {
        toggle.addEventListener('change', (e) => {
            updateScenarioParameter(scenarioId, e.target.dataset.param, e.target.checked);
            
            // Handle teilfreistellung dependency
            if (e.target.dataset.param === 'accumulation.includeTax') {
                const teilfreistellungToggle = panel.querySelector('[data-param="accumulation.teilfreistellung"]');
                if (teilfreistellungToggle) {
                    teilfreistellungToggle.disabled = !e.target.checked;
                    if (!e.target.checked) {
                        teilfreistellungToggle.checked = false;
                        updateScenarioParameter(scenarioId, 'accumulation.teilfreistellung', false);
                    }
                }
            }
            
            debouncedCalculateScenario(scenarioId);
        });
    });
}

function updateScenarioParameter(scenarioId, paramPath, value) {
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario) return;
    
    const parts = paramPath.split('.');
    let current = scenario.parameters;
    
    for (let i = 0; i < parts.length - 1; i++) {
        current = current[parts[i]];
    }
    
    current[parts[parts.length - 1]] = value;
}

// Chart Creation Functions
function createLifecycleChart() {
    const canvas = document.getElementById('comparisonChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (comparisonChart) {
        comparisonChart.destroy();
    }
    
    const visibleScenarios = scenarios.filter(s => s.visible && s.results.accumulation.finalNominal);
    
    if (visibleScenarios.length === 0) {
        showEmptyChartMessage(canvas, 'Keine Daten verfügbar', 'Bitte konfigurieren Sie mindestens ein Szenario');
        return;
    }
    
    const datasets = visibleScenarios.map(scenario => {
        const accumData = scenario.results.accumulation.monthlyData || [];
        const withdrawData = scenario.results.withdrawal.withdrawalData || [];
        
        const lifecycleData = [
            ...accumData.map(d => ({ x: d.year, y: d.capital })),
            ...withdrawData.map(d => ({ x: scenario.parameters.accumulation.duration + d.year, y: d.capital }))
        ];
        
        return {
            label: `${scenario.emoji} ${scenario.name}`,
            data: lifecycleData,
            borderColor: scenario.color,
            backgroundColor: scenario.color + '20',
            tension: 0.4,
            pointRadius: 2,
            pointHoverRadius: 5
        };
    });
    
    comparisonChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '🔄 Kompletter Finanz-Lebenszyklus: Anspar- und Entnahmephase'
                },
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
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
                        text: 'Jahre'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Kapital (€)'
                    },
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

function createAccumulationChart() {
    const canvas = document.getElementById('comparisonChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (comparisonChart) {
        comparisonChart.destroy();
    }
    
    const visibleScenarios = scenarios.filter(s => s.visible && s.results.accumulation.finalNominal);
    
    const datasets = visibleScenarios.map(scenario => ({
        label: `${scenario.emoji} ${scenario.name}`,
        data: scenario.results.accumulation.monthlyData?.map(d => ({ x: d.year, y: d.capital })) || [],
        borderColor: scenario.color,
        backgroundColor: scenario.color + '20',
        tension: 0.4
    }));
    
    comparisonChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '📈 Ansparphase: Kapitalaufbau über die Zeit'
                }
            },
            scales: {
                x: { title: { display: true, text: 'Jahre' } },
                y: { 
                    title: { display: true, text: 'Kapital (€)' },
                    ticks: { callback: value => formatCurrency(value) }
                }
            }
        }
    });
}

function createWithdrawalChart() {
    const canvas = document.getElementById('comparisonChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (comparisonChart) {
        comparisonChart.destroy();
    }
    
    const visibleScenarios = scenarios.filter(s => s.visible && s.results.withdrawal.withdrawalData);
    
    const datasets = visibleScenarios.map(scenario => ({
        label: `${scenario.emoji} ${scenario.name}`,
        data: scenario.results.withdrawal.withdrawalData?.map(d => ({ x: d.year, y: d.capital })) || [],
        borderColor: scenario.color,
        backgroundColor: scenario.color + '20',
        tension: 0.4
    }));
    
    comparisonChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '🏖️ Entnahmephase: Kapitalverlauf im Ruhestand'
                }
            },
            scales: {
                x: { title: { display: true, text: 'Jahre im Ruhestand' } },
                y: { 
                    title: { display: true, text: 'Verbliebenes Kapital (€)' },
                    ticks: { callback: value => formatCurrency(value) }
                }
            }
        }
    });
}

function createMetricsRadarChart() {
    const canvas = document.getElementById('comparisonChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (comparisonChart) {
        comparisonChart.destroy();
    }
    
    const visibleScenarios = scenarios.filter(s => s.visible && s.results.performance.overallScore);
    
    const datasets = visibleScenarios.map(scenario => ({
        label: `${scenario.emoji} ${scenario.name}`,
        data: [
            scenario.results.performance.efficiencyScore || 0,
            scenario.results.performance.stabilityScore || 0,
            (10 - scenario.results.performance.riskScore) || 5, // Inverted risk for better visualization
            scenario.results.accumulation.effectiveAnnualReturn || 0,
            (scenario.results.accumulation.finalNominal / 100000) || 0, // Scaled final capital
            scenario.results.withdrawal.monthlyNetWithdrawal / 500 || 0 // Scaled monthly withdrawal
        ],
        borderColor: scenario.color,
        backgroundColor: scenario.color + '40',
        borderWidth: 2
    }));
    
    comparisonChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: [
                'Effizienz',
                'Stabilität', 
                'Sicherheit',
                'Rendite (%)',
                'Endkapital (×100k€)',
                'Rente (×500€)'
            ],
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '🎯 Metriken-Vergleich: Multi-dimensionale Analyse'
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: 10,
                    ticks: {
                        stepSize: 2
                    }
                }
            }
        }
    });
}

function showEmptyChartMessage(canvas, title, message) {
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = Math.max(rect.width, 400);
    canvas.height = Math.max(rect.height, 300);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Center content
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Title
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e74c3c';
    ctx.fillText(title, centerX, centerY - 20);
    
    // Message
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#7f8c8d';
    ctx.fillText(message, centerX, centerY + 20);
}

// UI Update Functions
function updateChart() {
    switch (currentChartView) {
        case 'lifecycle':
            createLifecycleChart();
            break;
        case 'accumulation':
            createAccumulationChart();
            break;
        case 'withdrawal':
            createWithdrawalChart();
            break;
        case 'metrics':
            createMetricsRadarChart();
            break;
    }
}

function updateResultsDisplay() {
    const container = document.getElementById('resultsGrid');
    if (!container) return;
    
    container.innerHTML = '';
    
    scenarios.filter(s => s.visible && s.results.accumulation.finalNominal).forEach(scenario => {
        const card = document.createElement('div');
        card.className = 'result-card';
        card.style.borderLeft = `4px solid ${scenario.color}`;
        
        const accumResults = scenario.results.accumulation;
        const withdrawResults = scenario.results.withdrawal;
        
        card.innerHTML = `
            <div class="result-card-header">
                <h4 class="result-card-title">${scenario.emoji} ${scenario.name}</h4>
            </div>
            <div class="result-metrics">
                <div class="metric-row">
                    <span class="metric-label">💰 Endkapital</span>
                    <span class="metric-value">${formatCurrency(accumResults.finalNominal || 0)}</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">🏖️ Monatliche Rente</span>
                    <span class="metric-value">${formatCurrency(withdrawResults.monthlyNetWithdrawal || 0)}</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">📈 Effektive Rendite</span>
                    <span class="metric-value">${formatPercentage(accumResults.effectiveAnnualReturn || 0)}</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">💸 Steuern gesamt</span>
                    <span class="metric-value">${formatCurrency((accumResults.totalTaxes || 0) + (withdrawResults.totalTaxes || 0))}</span>
                </div>
            </div>
        `;
        
        container.appendChild(card);
    });
}

function updateParameterTable() {
    const container = document.getElementById('parameterTableContainer');
    if (!container) return;
    
    const filter = document.getElementById('parameterFilter')?.value || 'all';
    
    const parameterDefinitions = {
        budget: [
            { key: 'budget.netIncome', label: 'Netto-Einkommen', unit: '€', format: 'currency' },
            { key: 'budget.monthlyExpenses', label: 'Monatliche Ausgaben', unit: '€', format: 'currency' },
            { key: 'budget.availableForSaving', label: 'Verfügbar zum Sparen', unit: '€', format: 'currency' }
        ],
        accumulation: [
            { key: 'accumulation.monthlySavings', label: 'Monatliche Sparrate', unit: '€', format: 'currency' },
            { key: 'accumulation.initialCapital', label: 'Startkapital', unit: '€', format: 'currency' },
            { key: 'accumulation.annualReturn', label: 'Jährliche Rendite', unit: '%', format: 'percentage' },
            { key: 'accumulation.duration', label: 'Anlagedauer', unit: ' Jahre', format: 'number' },
            { key: 'accumulation.inflationRate', label: 'Inflationsrate', unit: '%', format: 'percentage' },
            { key: 'accumulation.includeTax', label: 'Abgeltungssteuer', unit: '', format: 'boolean' },
            { key: 'accumulation.teilfreistellung', label: 'Teilfreistellung', unit: '', format: 'boolean' }
        ],
        withdrawal: [
            { key: 'withdrawal.duration', label: 'Entnahmedauer', unit: ' Jahre', format: 'number' },
            { key: 'withdrawal.returnRate', label: 'Rendite im Ruhestand', unit: '%', format: 'percentage' },
            { key: 'withdrawal.inflationRate', label: 'Inflationsrate', unit: '%', format: 'percentage' },
            { key: 'withdrawal.includeTax', label: 'Steuer bei Entnahme', unit: '', format: 'boolean' }
        ]
    };
    
    const categoriesToShow = filter === 'all' ? Object.keys(parameterDefinitions) : [filter];
    
    let tableHTML = `
        <table class="parameter-table">
            <thead>
                <tr>
                    <th class="param-name-col">Parameter</th>
                    ${scenarios.map(s => `<th class="scenario-col" style="color: ${s.color}">${s.emoji} ${s.name}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
    `;
    
    categoriesToShow.forEach(category => {
        const categoryName = {
            budget: '💰 Budget-Planung',
            accumulation: '📈 Ansparphase',
            withdrawal: '🏖️ Entnahmephase'
        }[category];
        
        tableHTML += `
            <tr class="category-row">
                <td colspan="${scenarios.length + 1}" class="category-header">
                    <strong>${categoryName}</strong>
                </td>
            </tr>
        `;
        
        parameterDefinitions[category].forEach(param => {
            tableHTML += `<tr><td class="param-name">${param.label}</td>`;
            
            scenarios.forEach(scenario => {
                const value = getParameterValue(scenario, param.key);
                const formattedValue = formatParameterValue(value, param.format, param.unit);
                tableHTML += `<td class="param-value">${formattedValue}</td>`;
            });
            
            tableHTML += '</tr>';
        });
    });
    
    tableHTML += '</tbody></table>';
    container.innerHTML = tableHTML;
}

function getParameterValue(scenario, paramKey) {
    const parts = paramKey.split('.');
    let current = scenario.parameters;
    
    for (const part of parts) {
        current = current[part];
        if (current === undefined) return 0;
    }
    
    return current;
}

function formatParameterValue(value, format, unit) {
    switch (format) {
        case 'currency':
            return formatCurrency(value);
        case 'percentage':
            return value.toFixed(1) + '%';
        case 'number':
            return value + unit;
        case 'boolean':
            return value ? '✅ Ja' : '❌ Nein';
        default:
            return value + unit;
    }
}

function updatePerformanceAnalysis() {
    const container = document.getElementById('performanceSummary');
    if (!container) return;
    
    const validScenarios = scenarios.filter(s => s.results.accumulation.finalNominal);
    
    if (validScenarios.length === 0) {
        container.innerHTML = '<p class="no-data">Keine berechneten Szenarien verfügbar.</p>';
        return;
    }
    
    // Find best scenarios
    const bestCapital = validScenarios.reduce((max, curr) => 
        (curr.results.accumulation.finalNominal || 0) > (max.results.accumulation.finalNominal || 0) ? curr : max
    );
    
    const bestReturn = validScenarios.reduce((max, curr) => 
        (curr.results.accumulation.effectiveAnnualReturn || 0) > (max.results.accumulation.effectiveAnnualReturn || 0) ? curr : max
    );
    
    const bestWithdrawal = validScenarios.reduce((max, curr) => 
        (curr.results.withdrawal.monthlyNetWithdrawal || 0) > (max.results.withdrawal.monthlyNetWithdrawal || 0) ? curr : max
    );
    
    const lowestRisk = validScenarios.reduce((min, curr) => 
        (curr.results.performance.riskScore || 10) < (min.results.performance.riskScore || 10) ? curr : min
    );
    
    container.innerHTML = `
        <div class="performance-grid">
            <div class="performance-card best-capital">
                <h4 class="card-title">🏆 Höchstes Endkapital</h4>
                <div class="card-content">
                    <div class="scenario-name">${bestCapital.emoji} ${bestCapital.name}</div>
                    <div class="primary-value">${formatCurrency(bestCapital.results.accumulation.finalNominal)}</div>
                    <div class="secondary-info">
                        Effektive Rendite: ${formatPercentage(bestCapital.results.accumulation.effectiveAnnualReturn)}
                    </div>
                </div>
            </div>
            
            <div class="performance-card best-return">
                <h4 class="card-title">📈 Höchste Rendite</h4>
                <div class="card-content">
                    <div class="scenario-name">${bestReturn.emoji} ${bestReturn.name}</div>
                    <div class="primary-value">${formatPercentage(bestReturn.results.accumulation.effectiveAnnualReturn)}</div>
                    <div class="secondary-info">
                        Endkapital: ${formatCurrency(bestReturn.results.accumulation.finalNominal)}
                    </div>
                </div>
            </div>
            
            <div class="performance-card best-withdrawal">
                <h4 class="card-title">🏖️ Höchste Rente</h4>
                <div class="card-content">
                    <div class="scenario-name">${bestWithdrawal.emoji} ${bestWithdrawal.name}</div>
                    <div class="primary-value">${formatCurrency(bestWithdrawal.results.withdrawal.monthlyNetWithdrawal)}/Monat</div>
                    <div class="secondary-info">
                        Kaufkraft: ${formatCurrency(bestWithdrawal.results.withdrawal.realPurchasingPower)}/Monat
                    </div>
                </div>
            </div>
            
            <div class="performance-card lowest-risk">
                <h4 class="card-title">🛡️ Niedrigstes Risiko</h4>
                <div class="card-content">
                    <div class="scenario-name">${lowestRisk.emoji} ${lowestRisk.name}</div>
                    <div class="primary-value">Risiko-Score: ${(lowestRisk.results.performance.riskScore || 0).toFixed(1)}</div>
                    <div class="secondary-info">
                        Stabilität: ${(lowestRisk.results.performance.stabilityScore || 0).toFixed(1)}/10
                    </div>
                </div>
            </div>
        </div>
        
        <div class="performance-comparison">
            <h4>📊 Vergleichsmatrix</h4>
            <div class="comparison-matrix">
                ${validScenarios.map(scenario => `
                    <div class="matrix-item" style="border-left: 4px solid ${scenario.color}">
                        <div class="matrix-scenario">${scenario.emoji} ${scenario.name}</div>
                        <div class="matrix-metrics">
                            <span class="matrix-metric">
                                <strong>Kapital:</strong> ${formatCurrency(scenario.results.accumulation.finalNominal)}
                            </span>
                            <span class="matrix-metric">
                                <strong>Rente:</strong> ${formatCurrency(scenario.results.withdrawal.monthlyNetWithdrawal)}/M
                            </span>
                            <span class="matrix-metric">
                                <strong>Rendite:</strong> ${formatPercentage(scenario.results.accumulation.effectiveAnnualReturn)}
                            </span>
                            <span class="matrix-metric">
                                <strong>Risiko:</strong> ${(scenario.results.performance.riskScore || 0).toFixed(1)}/10
                            </span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function updateScenarioTabs() {
    const container = document.getElementById('scenarioTabs');
    if (!container) return;
    
    // Clear existing tabs (but keep add button)
    const addButton = container.querySelector('#addScenarioBtn');
    container.innerHTML = '';
    
    // Add scenario tabs
    scenarios.forEach(scenario => {
        const tab = document.createElement('button');
        tab.className = 'scenario-tab';
        tab.dataset.scenario = scenario.id;
        tab.innerHTML = `
            <span class="tab-emoji">${scenario.emoji}</span>
            <span class="tab-name">${scenario.name}</span>
        `;
        container.appendChild(tab);
    });
    
    // Re-add the add button
    if (addButton) {
        container.appendChild(addButton);
    }
    
    // Make first tab active
    if (scenarios.length > 0) {
        switchToScenario(scenarios[0].id);
    }
}

function updateVisibilityControls() {
    const container = document.getElementById('visibilityControls');
    if (!container) return;
    
    container.innerHTML = '';
    
    scenarios.forEach(scenario => {
        const control = document.createElement('label');
        control.className = 'visibility-control';
        control.innerHTML = `
            <input type="checkbox" ${scenario.visible ? 'checked' : ''} 
                   onchange="toggleScenarioVisibility('${scenario.id}', this.checked)">
            <span class="control-indicator" style="background-color: ${scenario.color}"></span>
            <span class="control-label">${scenario.emoji} ${scenario.name}</span>
        `;
        container.appendChild(control);
    });
}

// Scenario Management Functions
function switchToScenario(scenarioId) {
    // Update tab states
    document.querySelectorAll('.scenario-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.scenario === scenarioId);
    });
    
    // Update panel visibility
    document.querySelectorAll('.scenario-config-panel').forEach(panel => {
        panel.style.display = panel.dataset.scenarioId === scenarioId ? 'block' : 'none';
    });
}

function addScenario() {
    if (scenarios.length >= 6) {
        showNotification('⚠️ Maximum erreicht', 'Es können maximal 6 Szenarien verglichen werden.', 'warning');
        return;
    }
    
    const newId = String.fromCharCode(65 + scenarios.length); // A, B, C, D, E, F
    const newScenario = {
        id: newId,
        name: `Szenario ${newId}`,
        emoji: scenarioEmojis[scenarios.length],
        color: scenarioColors[scenarios.length],
        visible: true,
        parameters: {
            budget: {
                netIncome: 3500,
                monthlyExpenses: 2800,
                availableForSaving: 700
            },
            accumulation: {
                monthlySavings: 500,
                initialCapital: 10000,
                annualReturn: 7.0,
                duration: 25,
                inflationRate: 2.0,
                includeTax: true,
                teilfreistellung: true
            },
            withdrawal: {
                duration: 25,
                returnRate: 5.0,
                inflationRate: 2.0,
                includeTax: true
            }
        },
        results: {
            accumulation: {},
            withdrawal: {},
            performance: {}
        }
    };
    
    scenarios.push(newScenario);
    
    // Create and add configuration panel
    const panel = createScenarioConfigurationPanel(newScenario);
    document.getElementById('configurationPanels').appendChild(panel);
    
    // Update UI
    updateScenarioTabs();
    updateVisibilityControls();
    switchToScenario(newId);
    calculateScenarioResults(newId);
    
    showNotification('✅ Szenario hinzugefügt', `${newScenario.name} wurde erfolgreich erstellt.`, 'success');
}

// Global functions for button handlers
window.renameScenario = function(scenarioId) {
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario) return;
    
    const newName = prompt('Neuer Name für das Szenario:', scenario.name);
    if (newName && newName.trim()) {
        scenario.name = newName.trim();
        updateScenarioTabs();
        updateVisibilityControls();
        updateResultsDisplay();
        updateParameterTable();
        updatePerformanceAnalysis();
        showNotification('✅ Umbenannt', `Szenario wurde erfolgreich umbenannt.`, 'success');
    }
};

window.duplicateScenario = function(scenarioId) {
    if (scenarios.length >= 6) {
        showNotification('⚠️ Maximum erreicht', 'Es können maximal 6 Szenarien verglichen werden.', 'warning');
        return;
    }
    
    const originalScenario = scenarios.find(s => s.id === scenarioId);
    if (!originalScenario) return;
    
    const newId = String.fromCharCode(65 + scenarios.length);
    const duplicatedScenario = JSON.parse(JSON.stringify(originalScenario));
    duplicatedScenario.id = newId;
    duplicatedScenario.name = `Kopie von ${originalScenario.name}`;
    duplicatedScenario.emoji = scenarioEmojis[scenarios.length];
    duplicatedScenario.color = scenarioColors[scenarios.length];
    duplicatedScenario.results = { accumulation: {}, withdrawal: {}, performance: {} };
    
    scenarios.push(duplicatedScenario);
    
    const panel = createScenarioConfigurationPanel(duplicatedScenario);
    document.getElementById('configurationPanels').appendChild(panel);
    
    updateScenarioTabs();
    updateVisibilityControls();
    switchToScenario(newId);
    calculateScenarioResults(newId);
    
    showNotification('✅ Dupliziert', `Szenario wurde erfolgreich dupliziert.`, 'success');
};

window.removeScenario = function(scenarioId) {
    if (scenarioId === 'A') {
        showNotification('⚠️ Nicht möglich', 'Das Basis-Szenario kann nicht gelöscht werden.', 'warning');
        return;
    }
    
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario) return;
    
    if (confirm(`Möchten Sie "${scenario.name}" wirklich löschen?`)) {
        // Remove from array
        const index = scenarios.findIndex(s => s.id === scenarioId);
        if (index > -1) {
            scenarios.splice(index, 1);
        }
        
        // Remove panel
        const panel = document.querySelector(`[data-scenario-id="${scenarioId}"]`);
        if (panel) {
            panel.remove();
        }
        
        // Update UI
        updateScenarioTabs();
        updateVisibilityControls();
        updateResultsDisplay();
        updateParameterTable();
        updatePerformanceAnalysis();
        updateChart();
        
        showNotification('✅ Gelöscht', `${scenario.name} wurde gelöscht.`, 'success');
    }
};

window.toggleScenarioVisibility = function(scenarioId, visible) {
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (scenario) {
        scenario.visible = visible;
        updateResultsDisplay();
        updateChart();
    }
};

// Preset Templates Functions
const presetTemplates = {
    conservative: [
        {
            name: 'Sicherheitsorientiert',
            parameters: {
                budget: { netIncome: 3000, monthlyExpenses: 2400, availableForSaving: 600 },
                accumulation: { monthlySavings: 400, initialCapital: 5000, annualReturn: 5.0, duration: 30, inflationRate: 2.0, includeTax: true, teilfreistellung: true },
                withdrawal: { duration: 25, returnRate: 4.0, inflationRate: 2.0, includeTax: true }
            }
        },
        {
            name: 'Moderates Wachstum',
            parameters: {
                budget: { netIncome: 3500, monthlyExpenses: 2800, availableForSaving: 700 },
                accumulation: { monthlySavings: 500, initialCapital: 8000, annualReturn: 6.0, duration: 25, inflationRate: 2.0, includeTax: true, teilfreistellung: true },
                withdrawal: { duration: 25, returnRate: 5.0, inflationRate: 2.0, includeTax: true }
            }
        }
    ],
    balanced: [
        {
            name: 'Standard ETF-Portfolio',
            parameters: {
                budget: { netIncome: 4000, monthlyExpenses: 3000, availableForSaving: 1000 },
                accumulation: { monthlySavings: 600, initialCapital: 10000, annualReturn: 7.0, duration: 25, inflationRate: 2.0, includeTax: true, teilfreistellung: true },
                withdrawal: { duration: 25, returnRate: 5.5, inflationRate: 2.0, includeTax: true }
            }
        },
        {
            name: 'Diversifiziertes Portfolio',
            parameters: {
                budget: { netIncome: 4500, monthlyExpenses: 3200, availableForSaving: 1300 },
                accumulation: { monthlySavings: 800, initialCapital: 15000, annualReturn: 7.5, duration: 20, inflationRate: 2.5, includeTax: true, teilfreistellung: true },
                withdrawal: { duration: 30, returnRate: 6.0, inflationRate: 2.5, includeTax: true }
            }
        }
    ],
    aggressive: [
        {
            name: 'Wachstumsfokus',
            parameters: {
                budget: { netIncome: 5000, monthlyExpenses: 3500, availableForSaving: 1500 },
                accumulation: { monthlySavings: 1000, initialCapital: 20000, annualReturn: 10.0, duration: 20, inflationRate: 3.0, includeTax: true, teilfreistellung: true },
                withdrawal: { duration: 25, returnRate: 8.0, inflationRate: 3.0, includeTax: true }
            }
        },
        {
            name: 'Tech-Fokussiert',
            parameters: {
                budget: { netIncome: 6000, monthlyExpenses: 4000, availableForSaving: 2000 },
                accumulation: { monthlySavings: 1200, initialCapital: 25000, annualReturn: 12.0, duration: 15, inflationRate: 3.0, includeTax: true, teilfreistellung: false },
                withdrawal: { duration: 20, returnRate: 10.0, inflationRate: 3.0, includeTax: true }
            }
        }
    ],
    lifecycle: [
        {
            name: 'Frühe Karriere (25-35)',
            parameters: {
                budget: { netIncome: 2500, monthlyExpenses: 2000, availableForSaving: 500 },
                accumulation: { monthlySavings: 300, initialCapital: 2000, annualReturn: 8.0, duration: 35, inflationRate: 2.0, includeTax: true, teilfreistellung: true },
                withdrawal: { duration: 30, returnRate: 6.0, inflationRate: 2.0, includeTax: true }
            }
        },
        {
            name: 'Karrieremitte (35-50)',
            parameters: {
                budget: { netIncome: 5000, monthlyExpenses: 3500, availableForSaving: 1500 },
                accumulation: { monthlySavings: 800, initialCapital: 50000, annualReturn: 7.0, duration: 20, inflationRate: 2.0, includeTax: true, teilfreistellung: true },
                withdrawal: { duration: 25, returnRate: 5.5, inflationRate: 2.0, includeTax: true }
            }
        },
        {
            name: 'Vor Ruhestand (50-65)',
            parameters: {
                budget: { netIncome: 6000, monthlyExpenses: 4000, availableForSaving: 2000 },
                accumulation: { monthlySavings: 1200, initialCapital: 200000, annualReturn: 5.0, duration: 10, inflationRate: 2.0, includeTax: true, teilfreistellung: true },
                withdrawal: { duration: 25, returnRate: 4.0, inflationRate: 2.0, includeTax: true }
            }
        }
    ]
};

function loadPresetTemplate(templateName) {
    const template = presetTemplates[templateName];
    if (!template) {
        showNotification('❌ Fehler', 'Vorlage nicht gefunden.', 'error');
        return;
    }
    
    // Clear existing scenarios except the first one
    while (scenarios.length > 1) {
        const lastScenario = scenarios[scenarios.length - 1];
        const panel = document.querySelector(`[data-scenario-id="${lastScenario.id}"]`);
        if (panel) panel.remove();
        scenarios.pop();
    }
    
    // Update scenarios with template data
    template.forEach((templateScenario, index) => {
        if (index === 0) {
            // Update first scenario
            scenarios[0].name = templateScenario.name;
            scenarios[0].parameters = JSON.parse(JSON.stringify(templateScenario.parameters));
        } else {
            // Add new scenarios
            addScenario();
            const newScenario = scenarios[scenarios.length - 1];
            newScenario.name = templateScenario.name;
            newScenario.parameters = JSON.parse(JSON.stringify(templateScenario.parameters));
        }
    });
    
    // Recalculate all scenarios
    scenarios.forEach(scenario => {
        calculateScenarioResults(scenario.id);
        
        // Update the configuration panel inputs
        const panel = document.querySelector(`[data-scenario-id="${scenario.id}"]`);
        if (panel) {
            updatePanelInputs(panel, scenario);
        }
    });
    
    updateScenarioTabs();
    updateVisibilityControls();
    switchToScenario(scenarios[0].id);
    
    const templateNames = {
        conservative: 'Konservative Strategien',
        balanced: 'Ausgewogene Strategien',
        aggressive: 'Wachstumsorientierte Strategien',
        lifecycle: 'Lebenszyklus-Strategien'
    };
    
    showNotification('✅ Vorlage geladen', `${templateNames[templateName]} wurden erfolgreich geladen.`, 'success');
    document.getElementById('presetTemplatesSection').style.display = 'none';
}

function updatePanelInputs(panel, scenario) {
    // Update number inputs
    panel.querySelectorAll('.parameter-input').forEach(input => {
        const value = getParameterValue(scenario, input.dataset.param);
        input.value = value;
    });
    
    // Update range inputs
    panel.querySelectorAll('.parameter-range').forEach(range => {
        const value = getParameterValue(scenario, range.dataset.param);
        range.value = value;
        
        const valueSpan = range.nextElementSibling;
        if (valueSpan) {
            if (range.dataset.param.includes('Rate') || range.dataset.param.includes('Return') || range.dataset.param.includes('inflation')) {
                valueSpan.textContent = value.toFixed(1) + '%';
            } else if (range.dataset.param.includes('duration')) {
                valueSpan.textContent = value + ' Jahre';
            }
        }
    });
    
    // Update checkboxes
    panel.querySelectorAll('.toggle-input').forEach(toggle => {
        const value = getParameterValue(scenario, toggle.dataset.param);
        toggle.checked = value;
    });
}

// Export Functions
function exportAsJSON() {
    const exportData = {
        metadata: {
            exportedAt: new Date().toISOString(),
            version: '2.0.0',
            source: 'ETF Financial Planner - Comprehensive Scenario Comparison',
            scenarioCount: scenarios.length
        },
        scenarios: scenarios.map(scenario => ({
            ...scenario,
            results: scenario.results
        }))
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const timestamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(/:/g, '-');
    downloadFile(blob, `scenario-comparison_${timestamp}.json`);
}

function exportAsCSV() {
    const headers = ['Parameter', ...scenarios.map(s => s.name)];
    const rows = [headers];
    
    // Parameter categories
    const categories = {
        'Budget-Planung': [
            ['Netto-Einkommen', 'budget.netIncome'],
            ['Monatliche Ausgaben', 'budget.monthlyExpenses'],
            ['Verfügbar zum Sparen', 'budget.availableForSaving']
        ],
        'Ansparphase': [
            ['Monatliche Sparrate', 'accumulation.monthlySavings'],
            ['Startkapital', 'accumulation.initialCapital'],
            ['Jährliche Rendite (%)', 'accumulation.annualReturn'],
            ['Anlagedauer (Jahre)', 'accumulation.duration'],
            ['Inflationsrate (%)', 'accumulation.inflationRate'],
            ['Abgeltungssteuer', 'accumulation.includeTax'],
            ['Teilfreistellung', 'accumulation.teilfreistellung']
        ],
        'Entnahmephase': [
            ['Entnahmedauer (Jahre)', 'withdrawal.duration'],
            ['Rendite im Ruhestand (%)', 'withdrawal.returnRate'],
            ['Inflationsrate (%)', 'withdrawal.inflationRate'],
            ['Steuer bei Entnahme', 'withdrawal.includeTax']
        ]
    };
    
    // Add parameter rows
    Object.entries(categories).forEach(([categoryName, params]) => {
        rows.push(['']); // Empty row for spacing
        rows.push([categoryName]);
        
        params.forEach(([label, paramKey]) => {
            const row = [label];
            scenarios.forEach(scenario => {
                const value = getParameterValue(scenario, paramKey);
                row.push(typeof value === 'boolean' ? (value ? 'Ja' : 'Nein') : value);
            });
            rows.push(row);
        });
    });
    
    // Add results section
    rows.push([''], ['ERGEBNISSE']);
    
    const resultMetrics = [
        ['Endkapital (€)', 'results.accumulation.finalNominal'],
        ['Monatliche Rente (€)', 'results.withdrawal.monthlyNetWithdrawal'],
        ['Effektive Rendite (%)', 'results.accumulation.effectiveAnnualReturn'],
        ['Gesamte Steuern (€)', '']  // Special handling needed
    ];
    
    resultMetrics.forEach(([label, path]) => {
        const row = [label];
        scenarios.forEach(scenario => {
            if (path === '') {
                // Special case for total taxes
                const accumTaxes = scenario.results.accumulation.totalTaxes || 0;
                const withdrawTaxes = scenario.results.withdrawal.totalTaxes || 0;
                row.push(accumTaxes + withdrawTaxes);
            } else {
                const parts = path.split('.');
                let value = scenario;
                for (const part of parts) {
                    value = value[part];
                    if (value === undefined) {
                        value = 0;
                        break;
                    }
                }
                row.push(value || 0);
            }
        });
        rows.push(row);
    });
    
    const csvContent = rows.map(row => 
        row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const timestamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(/:/g, '-');
    downloadFile(blob, `scenario-comparison_${timestamp}.csv`);
}

function exportChartAsPNG() {
    const canvas = document.getElementById('comparisonChart');
    if (canvas) {
        canvas.toBlob(blob => {
            if (blob) {
                const timestamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(/:/g, '-');
                downloadFile(blob, `scenario-chart_${timestamp}.png`);
            }
        });
    }
}

function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('Advanced Scenario Comparison module initializing...');
    
    // Create initial configuration panels
    const panelsContainer = document.getElementById('configurationPanels');
    if (panelsContainer) {
        scenarios.forEach(scenario => {
            const panel = createScenarioConfigurationPanel(scenario);
            panelsContainer.appendChild(panel);
        });
    }
    
    // Setup event listeners
    setupEventListeners();
    
    // Initial UI updates
    updateScenarioTabs();
    updateVisibilityControls();
    switchToScenario('A');
    
    // Initial calculations
    scenarios.forEach(scenario => {
        calculateScenarioResults(scenario.id);
    });
    
    // Create initial chart
    updateChart();
    
    console.log('Advanced Scenario Comparison module initialized successfully');
});

function setupEventListeners() {
    // Add scenario button
    const addBtn = document.getElementById('addScenarioBtn');
    if (addBtn) {
        addBtn.addEventListener('click', addScenario);
    }
    
    // Scenario tab switching
    document.addEventListener('click', function(e) {
        if (e.target.closest('.scenario-tab')) {
            const tab = e.target.closest('.scenario-tab');
            const scenarioId = tab.dataset.scenario;
            if (scenarioId) {
                switchToScenario(scenarioId);
            }
        }
    });
    
    // Chart view switching
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('chart-view-tab')) {
            document.querySelectorAll('.chart-view-tab').forEach(tab => tab.classList.remove('active'));
            e.target.classList.add('active');
            currentChartView = e.target.dataset.view;
            updateChart();
        }
    });
    
    // Preset template selection
    document.addEventListener('click', function(e) {
        if (e.target.closest('.preset-card')) {
            const card = e.target.closest('.preset-card');
            const preset = card.dataset.preset;
            if (preset) {
                loadPresetTemplate(preset);
            }
        }
    });
    
    // Load presets button
    const loadPresetBtn = document.getElementById('loadPresetBtn');
    if (loadPresetBtn) {
        loadPresetBtn.addEventListener('click', function() {
            const section = document.getElementById('presetTemplatesSection');
            if (section) {
                section.style.display = section.style.display === 'none' ? 'block' : 'none';
            }
        });
    }
    
    // Parameter filter
    const parameterFilter = document.getElementById('parameterFilter');
    if (parameterFilter) {
        parameterFilter.addEventListener('change', updateParameterTable);
    }
    
    // Modal handlers
    setupModalHandlers();
}

function setupModalHandlers() {
    // Save configuration modal
    const saveConfigBtn = document.getElementById('saveConfigBtn');
    const saveConfigModal = document.getElementById('saveConfigModal');
    const closeSaveModal = document.getElementById('closeSaveModal');
    const cancelSaveConfig = document.getElementById('cancelSaveConfig');
    const confirmSaveConfig = document.getElementById('confirmSaveConfig');
    const configNameInput = document.getElementById('configName');
    
    if (saveConfigBtn && saveConfigModal) {
        saveConfigBtn.addEventListener('click', () => {
            saveConfigModal.style.display = 'flex';
        });
    }
    
    [closeSaveModal, cancelSaveConfig].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                if (saveConfigModal) saveConfigModal.style.display = 'none';
                if (configNameInput) configNameInput.value = '';
            });
        }
    });
    
    if (configNameInput && confirmSaveConfig) {
        configNameInput.addEventListener('input', () => {
            confirmSaveConfig.disabled = !configNameInput.value.trim();
        });
        
        confirmSaveConfig.addEventListener('click', () => {
            saveConfiguration();
            saveConfigModal.style.display = 'none';
            configNameInput.value = '';
        });
    }
    
    // Export modal
    const exportBtn = document.getElementById('exportComparisonBtn');
    const exportModal = document.getElementById('exportModal');
    const closeExportModal = document.getElementById('closeExportModal');
    const cancelExport = document.getElementById('cancelExport');
    const confirmExport = document.getElementById('confirmExport');
    
    if (exportBtn && exportModal) {
        exportBtn.addEventListener('click', () => {
            exportModal.style.display = 'flex';
        });
    }
    
    [closeExportModal, cancelExport].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                if (exportModal) exportModal.style.display = 'none';
            });
        }
    });
    
    if (confirmExport) {
        confirmExport.addEventListener('click', () => {
            performExport();
            if (exportModal) exportModal.style.display = 'none';
        });
    }
}

function saveConfiguration() {
    const configName = document.getElementById('configName')?.value?.trim();
    const configDescription = document.getElementById('configDescription')?.value?.trim();
    
    if (!configName) {
        showNotification('❌ Fehler', 'Bitte geben Sie einen Namen ein.', 'error');
        return;
    }
    
    const config = {
        name: configName,
        description: configDescription,
        timestamp: new Date().toISOString(),
        scenarios: scenarios.map(scenario => ({
            id: scenario.id,
            name: scenario.name,
            emoji: scenario.emoji,
            color: scenario.color,
            visible: scenario.visible,
            parameters: scenario.parameters
        }))
    };
    
    // Save to localStorage
    const savedConfigs = JSON.parse(localStorage.getItem('scenarioConfigurations') || '[]');
    savedConfigs.push(config);
    localStorage.setItem('scenarioConfigurations', JSON.stringify(savedConfigs));
    
    showNotification('✅ Gespeichert', `Konfiguration "${configName}" wurde erfolgreich gespeichert.`, 'success');
}

function performExport() {
    const exportJSON = document.getElementById('exportJSON')?.checked;
    const exportCSV = document.getElementById('exportCSV')?.checked;
    const exportChart = document.getElementById('exportChart')?.checked;
    
    if (exportJSON) {
        exportAsJSON();
    }
    
    if (exportCSV) {
        exportAsCSV();
    }
    
    if (exportChart) {
        exportChartAsPNG();
    }
    
    if (!exportJSON && !exportCSV && !exportChart) {
        showNotification('⚠️ Hinweis', 'Bitte wählen Sie mindestens eine Export-Option.', 'warning');
        return;
    }
    
    showNotification('✅ Export abgeschlossen', 'Die ausgewählten Dateien wurden heruntergeladen.', 'success');
}

// Export for potential external use
window.ScenarioComparison = {
    scenarios,
    addScenario,
    calculateScenarioResults,
    updateChart,
    exportAsJSON,
    exportAsCSV,
    exportChartAsPNG
};