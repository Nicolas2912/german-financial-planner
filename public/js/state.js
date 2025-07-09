// js/state.js
// Global State Management for German Financial Planner

// Chart instances
export let chart = null;
export let withdrawalChart = null;
export let budgetPieChart = null;
export let integratedChart = null;
export let lifecycleComparisonChart = null;
export let accumulationComparisonChart = null;
export let withdrawalComparisonChart = null;
export let metricsRadarChart = null;

// Main application state
export let currentPhase = 'accumulation';
export let activeScenario = 'A';
export let withdrawalData = [];

// Budget data structure
export let budgetData = {
    income: {},
    expenses: {},
    savings: { amount: 500, mode: 'fixed', percentage: 50 },
    periods: { income: 'monthly', fixed: 'monthly', variable: 'monthly' }
};

// Scenario management
export let scenarios = [
    {
        id: 'A',
        name: 'Szenario A',
        color: '#3498db',
        inputs: {},
        yearlyData: [],
        results: {}
    }
];

// Scenario colors
export const scenarioColors = {
    'A': '#3498db',
    'B': '#27ae60', 
    'C': '#e74c3c',
    'D': '#f39c12'
};

// Chart and UI state
export let currentChartMode = 'comparison'; // 'comparison' or 'contributions'
export let selectedScenariosForChart = new Set(['A']); // Track which scenarios to show on chart
export let selectedContributionsScenario = 'A'; // Track selected scenario for contributions chart

// Sync and timing flags
export let isSyncing = false; // Flag to prevent recursive sync calls
export let lastSyncValue = 0; // Track last synced value to prevent duplicate notifications
export let userIsTyping = false; // Track if user is actively typing
export let recalculationTimeout = null;

// Tax calculation state
export let usedSparerpauschbetrag = 0;

// Setters for chart instances
export function setChart(newChart) { chart = newChart; }
export function setWithdrawalChart(newChart) { withdrawalChart = newChart; }
export function setBudgetPieChart(newChart) { budgetPieChart = newChart; }
export function setIntegratedChart(newChart) { integratedChart = newChart; }
export function setLifecycleComparisonChart(newChart) { lifecycleComparisonChart = newChart; }
export function setAccumulationComparisonChart(newChart) { accumulationComparisonChart = newChart; }
export function setWithdrawalComparisonChart(newChart) { withdrawalComparisonChart = newChart; }
export function setMetricsRadarChart(newChart) { metricsRadarChart = newChart; }

// Setters for application state
export function setCurrentPhase(phase) { currentPhase = phase; }
export function setActiveScenario(id) { activeScenario = id; }
export function setWithdrawalData(data) { withdrawalData = data; }
export function setBudgetData(data) { budgetData = data; }
export function setScenarios(newScenarios) { scenarios = newScenarios; }
export function setCurrentChartMode(mode) { currentChartMode = mode; }
export function setSelectedScenariosForChart(scenarios) { selectedScenariosForChart = scenarios; }
export function setSelectedContributionsScenario(scenario) { selectedContributionsScenario = scenario; }

// Setters for sync and timing flags
export function setIsSyncing(value) { isSyncing = value; }
export function setLastSyncValue(value) { lastSyncValue = value; }
export function setUserIsTyping(value) { userIsTyping = value; }
export function setRecalculationTimeout(timeout) { recalculationTimeout = timeout; }

// Setters for tax state
export function setUsedSparerpauschbetrag(value) { usedSparerpauschbetrag = value; }

// Utility functions for scenario management
export function addScenario(scenario) {
    scenarios.push(scenario);
}

export function removeScenario(id) {
    scenarios = scenarios.filter(s => s.id !== id);
}

export function findScenario(id) {
    return scenarios.find(s => s.id === id);
}

export function updateScenario(id, updates) {
    const scenario = findScenario(id);
    if (scenario) {
        Object.assign(scenario, updates);
    }
}

export function getActiveScenario() {
    return findScenario(activeScenario);
}

// Utility functions for selected scenarios
export function addSelectedScenario(id) {
    selectedScenariosForChart.add(id);
}

export function removeSelectedScenario(id) {
    selectedScenariosForChart.delete(id);
}

export function clearSelectedScenarios() {
    selectedScenariosForChart.clear();
}

export function isScenarioSelected(id) {
    return selectedScenariosForChart.has(id);
}