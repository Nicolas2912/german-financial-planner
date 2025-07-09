/**
 * Scenario Management Functions for German Financial Planner
 * 
 * This module contains all scenario management functions including creation, 
 * switching, renaming, copying, and removing scenarios.
 */

import { formatGermanNumber, parseGermanNumber } from '../utils/utils.js';

// ===================================
// SCENARIO CREATION AND MANAGEMENT
// ===================================

/**
 * Add a new scenario to the system
 * @returns {Object|null} The new scenario object or null if maximum scenarios reached
 */
export function addNewScenario() {
    // Get global variables from window object
    const { scenarios, scenarioColors, selectedScenariosForChart, setupSavingsModeForScenario, 
            updateScenarioCheckboxes, updateContributionsScenarioDropdown, saveIndividualAnsparphaseScenario,
            showNotification } = window;
    
    if (scenarios.length >= 4) {
        showNotification('⚠️ Maximale Anzahl erreicht', 'Maximal 4 Szenarien sind möglich.', 'warning');
        return null;
    }

    const newScenarioId = String.fromCharCode(65 + scenarios.length); // A, B, C, D
    const newScenario = {
        id: newScenarioId,
        name: 'Szenario ' + newScenarioId,
        color: scenarioColors[newScenarioId],
        inputs: {},
        yearlyData: [],
        results: {}
    };

    scenarios.push(newScenario);
    createScenarioPanel(newScenario);
    createScenarioTab(newScenario);
    
    // Set up savings mode functionality for the new scenario
    setupSavingsModeForScenario(newScenarioId);
    
    switchToScenario(newScenarioId);
    // Auto-select new scenario for chart display
    selectedScenariosForChart.add(newScenarioId);
    // Update scenario checkboxes and dropdown
    updateScenarioCheckboxes();
    updateContributionsScenarioDropdown();
    // Auto-save the new scenario
    setTimeout(() => saveIndividualAnsparphaseScenario(newScenarioId), 2000);
    
    return newScenario;
}

/**
 * Create a new scenario without switching to it
 * @returns {Object|null} The new scenario object or null if maximum scenarios reached
 */
export function createNewScenarioWithoutSwitching() {
    const { scenarios, scenarioColors } = window;
    
    if (scenarios.length >= 4) {
        return null;
    }

    const newScenarioId = String.fromCharCode(65 + scenarios.length); // A, B, C, D
    const newScenario = {
        id: newScenarioId,
        name: 'Szenario ' + newScenarioId,
        color: scenarioColors[newScenarioId],
        inputs: {},
        yearlyData: [],
        results: {}
    };

    scenarios.push(newScenario);
    createScenarioPanel(newScenario);
    createScenarioTab(newScenario);
    
    return newScenario;
}

/**
 * Create a scenario tab in the UI
 * @param {Object} scenario - The scenario object
 */
export function createScenarioTab(scenario) {
    const tabsContainer = document.getElementById('scenarioTabs');
    const addBtn = document.getElementById('addScenarioBtn');
    
    const tab = document.createElement('button');
    tab.className = 'scenario-tab';
    tab.dataset.scenario = scenario.id;
    tab.innerHTML = `📈 ${scenario.name}`;
    
    // Insert before the add button
    tabsContainer.insertBefore(tab, addBtn);
}

/**
 * Switch to a specific scenario
 * @param {string} scenarioId - The ID of the scenario to switch to
 */
export function switchToScenario(scenarioId) {
    const { autoSyncWithdrawalCapital, updateContributionsGainsChart, currentChartMode } = window;
    
    // Update active scenario
    window.activeScenario = scenarioId;
    
    // Update tab appearance
    document.querySelectorAll('.scenario-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-scenario="${scenarioId}"]`).classList.add('active');
    
    // Update panel visibility
    document.querySelectorAll('.scenario-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    const activePanel = document.querySelector(`.scenario-panel[data-scenario="${scenarioId}"]`);
    if (activePanel) {
        activePanel.classList.add('active');
    }
    
    // Auto-sync withdrawal capital when switching scenarios (show notification)
    autoSyncWithdrawalCapital(true);
    
    // Update chart if we're in contributions mode (which shows active scenario only)
    if (currentChartMode === 'contributions') {
        updateContributionsGainsChart();
    }
}

/**
 * Create a scenario panel with all controls
 * @param {Object} scenario - The scenario object
 */
export function createScenarioPanel(scenario) {
    const { scenarios, getScenarioValue } = window;
    
    const panelsContainer = document.getElementById('scenarioPanels');
    
    const panel = document.createElement('div');
    panel.className = 'scenario-panel';
    panel.dataset.scenario = scenario.id;
    
    // Copy values from scenario A as default
    const defaultValues = {
        monthlySavings: getScenarioValue('monthlySavings', 'A') || '500',
        initialCapital: getScenarioValue('initialCapital', 'A') || '3.000',
        annualReturn: getScenarioValue('annualReturn', 'A') || '7',
        inflationRate: getScenarioValue('inflationRate', 'A') || '2',
        salaryGrowth: getScenarioValue('salaryGrowth', 'A') || '3',
        duration: getScenarioValue('duration', 'A') || '25',
        baseSalary: getScenarioValue('baseSalary', 'A') || '60.000',
        salaryToSavings: getScenarioValue('salaryToSavings', 'A') || '50'
    };
    
    panel.innerHTML = `
        <div class="scenario-panel-header">
            <h3 class="scenario-panel-title">📊 ${scenario.name}</h3>
            <div class="scenario-actions">
                <button class="scenario-action-btn" onclick="window.renameScenario('${scenario.id}')" title="Szenario umbenennen">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Umbenennen
                </button>
                ${scenario.id !== 'A' ? `<button class="scenario-action-btn danger" onclick="window.removeScenario('${scenario.id}')" title="Szenario löschen">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                    Löschen
                </button>` : ''}
            </div>
        </div>

        <!-- Savings Rate Configuration -->
        <div class="savings-configuration">
            <div class="savings-mode-toggle" style="margin-bottom: 20px;">
                <label style="font-weight: 600; margin-bottom: 10px; display: block;">💰 Sparraten-Konfiguration</label>
                <div class="savings-mode-buttons">
                    <button type="button" class="savings-mode-btn active" data-mode="simple" data-scenario="${scenario.id}">
                        <span class="mode-icon">📈</span>
                        <span class="mode-text">Einfache Sparrate</span>
                    </button>
                    <button type="button" class="savings-mode-btn" data-mode="multi-phase" data-scenario="${scenario.id}">
                        <span class="mode-icon">🎯</span>
                        <span class="mode-text">Mehrphasig</span>
                    </button>
                </div>
            </div>

            <!-- Simple Savings Rate (Default) -->
            <div class="simple-savings-container" data-scenario="${scenario.id}">
                <div class="input-group">
                    <label for="monthlySavings_${scenario.id}">Monatliche Sparrate (€)</label>
                    <input type="text" id="monthlySavings_${scenario.id}" class="input-field scenario-input" value="${defaultValues.monthlySavings}" step="10" data-scenario="${scenario.id}">
                </div>
            </div>

            <!-- Multi-Phase Savings Configuration -->
            <div class="multi-phase-savings-container" data-scenario="${scenario.id}" style="display: none;">
                <div class="multi-phase-header">
                    <h4 style="color: #2c3e50; margin-bottom: 15px;">🎯 Mehrphasige Sparplanung</h4>
                    <p style="color: #7f8c8d; font-size: 0.9rem; margin-bottom: 20px; line-height: 1.4;">
                        Definieren Sie bis zu 3 verschiedene Sparphasen mit unterschiedlichen monatlichen Sparraten. 
                        Perfekt für Lebensphasen wie Berufseinstieg, Karrieremitte und Spitzenverdienst.
                    </p>
                </div>

                <div class="phases-container" data-scenario="${scenario.id}">
                    <!-- Phase 1 (Always active) -->
                    <div class="savings-phase active" data-phase="1" data-scenario="${scenario.id}">
                        <div class="phase-header">
                            <div class="phase-title">
                                <span class="phase-icon">🌱</span>
                                <h5>Phase 1: Anfangsphase</h5>
                                <div class="phase-status-indicator active"></div>
                            </div>
                        </div>
                        <div class="phase-content">
                            <div class="phase-controls">
                                <div class="time-range-inputs">
                                    <div class="input-group time-input">
                                        <label>Von Jahr</label>
                                        <input type="number" class="phase-start-year" value="0" min="0" readonly data-phase="1" data-scenario="${scenario.id}">
                                    </div>
                                    <div class="input-group time-input">
                                        <label>Bis Jahr</label>
                                        <input type="number" class="phase-end-year" value="10" min="1" max="100" data-phase="1" data-scenario="${scenario.id}">
                                    </div>
                                    <div class="input-group savings-input">
                                        <label>Monatliche Sparrate (€)</label>
                                        <input type="text" class="phase-savings-rate" value="300" data-phase="1" data-scenario="${scenario.id}">
                                    </div>
                                </div>
                                <div class="phase-summary" data-phase="1" data-scenario="${scenario.id}">
                                    <div class="summary-item">
                                        <span class="summary-label">Dauer:</span>
                                        <span class="summary-value duration">10 Jahre</span>
                                    </div>
                                    <div class="summary-item">
                                        <span class="summary-label">Gesamteinzahlung:</span>
                                        <span class="summary-value total-contribution">€36.000</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Phase 2 (Optional) -->
                    <div class="savings-phase" data-phase="2" data-scenario="${scenario.id}">
                        <div class="phase-header">
                            <div class="phase-title">
                                <span class="phase-icon">💪</span>
                                <h5>Phase 2: Wachstumsphase</h5>
                                <div class="phase-status-indicator"></div>
                            </div>
                            <button type="button" class="phase-toggle-btn" data-phase="2" data-scenario="${scenario.id}">
                                <span class="toggle-text">Aktivieren</span>
                            </button>
                        </div>
                        <div class="phase-content" style="display: none;">
                            <div class="phase-controls">
                                <div class="time-range-inputs">
                                    <div class="input-group time-input">
                                        <label>Von Jahr</label>
                                        <input type="number" class="phase-start-year" value="10" min="0" data-phase="2" data-scenario="${scenario.id}">
                                    </div>
                                    <div class="input-group time-input">
                                        <label>Bis Jahr</label>
                                        <input type="number" class="phase-end-year" value="20" min="1" max="100" data-phase="2" data-scenario="${scenario.id}">
                                    </div>
                                    <div class="input-group savings-input">
                                        <label>Monatliche Sparrate (€)</label>
                                        <input type="text" class="phase-savings-rate" value="500" data-phase="2" data-scenario="${scenario.id}">
                                    </div>
                                </div>
                                <div class="phase-summary" data-phase="2" data-scenario="${scenario.id}">
                                    <div class="summary-item">
                                        <span class="summary-label">Dauer:</span>
                                        <span class="summary-value duration">10 Jahre</span>
                                    </div>
                                    <div class="summary-item">
                                        <span class="summary-label">Gesamteinzahlung:</span>
                                        <span class="summary-value total-contribution">€60.000</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Phase 3 (Optional) -->
                    <div class="savings-phase" data-phase="3" data-scenario="${scenario.id}">
                        <div class="phase-header">
                            <div class="phase-title">
                                <span class="phase-icon">🚀</span>
                                <h5>Phase 3: Spitzenphase</h5>
                                <div class="phase-status-indicator"></div>
                            </div>
                            <button type="button" class="phase-toggle-btn" data-phase="3" data-scenario="${scenario.id}">
                                <span class="toggle-text">Aktivieren</span>
                            </button>
                        </div>
                        <div class="phase-content" style="display: none;">
                            <div class="phase-controls">
                                <div class="time-range-inputs">
                                    <div class="input-group time-input">
                                        <label>Von Jahr</label>
                                        <input type="number" class="phase-start-year" value="20" min="0" data-phase="3" data-scenario="${scenario.id}">
                                    </div>
                                    <div class="input-group time-input">
                                        <label>Bis Jahr</label>
                                        <input type="number" class="phase-end-year" value="30" min="1" max="100" data-phase="3" data-scenario="${scenario.id}">
                                    </div>
                                    <div class="input-group savings-input">
                                        <label>Monatliche Sparrate (€)</label>
                                        <input type="text" class="phase-savings-rate" value="800" data-phase="3" data-scenario="${scenario.id}">
                                    </div>
                                </div>
                                <div class="phase-summary" data-phase="3" data-scenario="${scenario.id}">
                                    <div class="summary-item">
                                        <span class="summary-label">Dauer:</span>
                                        <span class="summary-value duration">10 Jahre</span>
                                    </div>
                                    <div class="summary-item">
                                        <span class="summary-label">Gesamteinzahlung:</span>
                                        <span class="summary-value total-contribution">€96.000</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Multi-Phase Summary -->
                    <div class="multi-phase-summary" data-scenario="${scenario.id}">
                        <h6>🎯 Gesamtübersicht</h6>
                        <div class="multi-phase-stats">
                            <div class="stat-item">
                                <span class="stat-label">Gesamtdauer:</span>
                                <span class="stat-value total-duration">10 Jahre</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Gesamteinzahlung:</span>
                                <span class="stat-value total-contributions">€36.000</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Ø monatliche Sparrate:</span>
                                <span class="stat-value avg-monthly-rate">€300</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Traditional input fields -->
        <div class="input-group">
            <label for="initialCapital_${scenario.id}">Startkapital (€)</label>
            <input type="text" id="initialCapital_${scenario.id}" class="input-field scenario-input" value="${defaultValues.initialCapital}" data-scenario="${scenario.id}">
        </div>

        <div class="input-group">
            <label for="annualReturn_${scenario.id}">
                Jährliche Rendite: <span id="annualReturnValue_${scenario.id}">${defaultValues.annualReturn}%</span>
            </label>
            <input type="range" id="annualReturn_${scenario.id}" class="slider" min="0" max="15" step="0.1" value="${defaultValues.annualReturn}" data-scenario="${scenario.id}">
        </div>

        <div class="input-group">
            <label for="inflationRate_${scenario.id}">
                Inflationsrate: <span id="inflationRateValue_${scenario.id}">${defaultValues.inflationRate}%</span>
            </label>
            <input type="range" id="inflationRate_${scenario.id}" class="slider" min="0" max="10" step="0.1" value="${defaultValues.inflationRate}" data-scenario="${scenario.id}">
        </div>

        <div class="input-group">
            <label for="salaryGrowth_${scenario.id}">
                Gehaltssteigerung: <span id="salaryGrowthValue_${scenario.id}">${defaultValues.salaryGrowth}%</span>
            </label>
            <input type="range" id="salaryGrowth_${scenario.id}" class="slider" min="0" max="10" step="0.1" value="${defaultValues.salaryGrowth}" data-scenario="${scenario.id}">
        </div>

        <div class="input-group">
            <label for="duration_${scenario.id}">
                Anlagedauer: <span id="durationValue_${scenario.id}">${defaultValues.duration} Jahre</span>
            </label>
            <input type="range" id="duration_${scenario.id}" class="slider" min="1" max="50" step="1" value="${defaultValues.duration}" data-scenario="${scenario.id}">
        </div>

        <div class="input-group">
            <label for="baseSalary_${scenario.id}">Bruttojahresgehalt (€)</label>
            <input type="text" id="baseSalary_${scenario.id}" class="input-field scenario-input" value="${defaultValues.baseSalary}" data-scenario="${scenario.id}">
        </div>

        <div class="input-group">
            <label for="salaryToSavings_${scenario.id}">
                Gehalt zu Sparrate: <span id="salaryToSavingsValue_${scenario.id}">${defaultValues.salaryToSavings}%</span>
            </label>
            <input type="range" id="salaryToSavings_${scenario.id}" class="slider" min="0" max="100" step="1" value="${defaultValues.salaryToSavings}" data-scenario="${scenario.id}">
        </div>

        <div class="toggle-container">
            <button type="button" class="toggle-btn" id="taxToggle_${scenario.id}">
                <span class="toggle-text">Steuern berücksichtigen</span>
            </button>
        </div>

        <div class="toggle-container">
            <button type="button" class="toggle-btn" id="teilfreistellungToggle_${scenario.id}">
                <span class="toggle-text">Teilfreistellung anwenden</span>
            </button>
            <div id="teilfreistellungHelp_${scenario.id}">
                <small style="color: #7f8c8d; font-size: 0.85rem; display: block; line-height: 1.4;">
                    💡 Erst nach Aktivierung der Steuerberechnung verfügbar. Bei Aktien-ETFs sind 30% der Erträge steuerfrei.
                </small>
            </div>
        </div>

        <div class="input-group">
            <label>ETF-Typ</label>
            <div class="radio-group">
                <div class="radio-item">
                    <input type="radio" id="etfStock_${scenario.id}" name="etfType-${scenario.id}" value="stock" checked>
                    <label for="etfStock_${scenario.id}">Aktien-ETF</label>
                </div>
                <div class="radio-item">
                    <input type="radio" id="etfMixed_${scenario.id}" name="etfType-${scenario.id}" value="mixed">
                    <label for="etfMixed_${scenario.id}">Misch-ETF</label>
                </div>
            </div>
        </div>
    `;
    
    panelsContainer.appendChild(panel);
    
    // Set up event listeners for the new panel
    const { setupScenarioInputListeners } = window;
    setupScenarioInputListeners(scenario.id);
}

/**
 * Copy an existing scenario to a new scenario
 * @param {string} scenarioId - The ID of the scenario to copy
 */
export function copyScenario(scenarioId) {
    const { updateScenarioSliderValue } = window;
    
    addNewScenario();
    
    // Get the newly created scenario ID
    const newScenarioId = window.scenarios[window.scenarios.length - 1].id;
    
    // Copy all values from source scenario
    const inputIds = ['monthlySavings', 'initialCapital', 'annualReturn', 'inflationRate', 'salaryGrowth', 'duration', 'baseSalary', 'salaryToSavings'];
    
    inputIds.forEach(inputId => {
        const sourceElement = document.getElementById(`${inputId}_${scenarioId}`);
        const targetElement = document.getElementById(`${inputId}_${newScenarioId}`);
        
        if (sourceElement && targetElement) {
            targetElement.value = sourceElement.value;
            if (targetElement.type === 'range') {
                updateScenarioSliderValue(inputId, newScenarioId);
            }
        }
    });
    
    // Copy tax toggle state
    const sourceTaxToggle = document.getElementById(`taxToggle_${scenarioId}`);
    const targetTaxToggle = document.getElementById(`taxToggle_${newScenarioId}`);
    
    if (sourceTaxToggle && targetTaxToggle) {
        if (sourceTaxToggle.classList.contains('active')) {
            targetTaxToggle.classList.add('active');
        }
    }
    
    // Copy ETF type selection
    const sourceETFRadios = document.querySelectorAll(`input[name="etfType-${scenarioId}"]`);
    const targetETFRadios = document.querySelectorAll(`input[name="etfType-${newScenarioId}"]`);
    
    sourceETFRadios.forEach((sourceRadio, index) => {
        if (sourceRadio.checked && targetETFRadios[index]) {
            targetETFRadios[index].checked = true;
        }
    });
    
    // Copy Teilfreistellung toggle state
    const sourceTeilfreistellungToggle = document.getElementById(`teilfreistellungToggle_${scenarioId}`);
    const targetTeilfreistellungToggle = document.getElementById(`teilfreistellungToggle_${newScenarioId}`);
    
    if (sourceTeilfreistellungToggle && targetTeilfreistellungToggle) {
        if (sourceTeilfreistellungToggle.classList.contains('active')) {
            targetTeilfreistellungToggle.classList.add('active');
        }
    }
    
    // Trigger recalculation
    const { recalculateAll } = window;
    recalculateAll();
}

/**
 * Remove a scenario from the system
 * @param {string} scenarioId - The ID of the scenario to remove
 */
export function removeScenario(scenarioId) {
    const { scenarios, selectedScenariosForChart, activeScenario, selectedContributionsScenario,
            updateScenarioCheckboxes, updateContributionsScenarioDropdown, recalculateAll } = window;
    
    if (scenarioId === 'A') {
        alert('❌ Das Basis-Szenario A kann nicht gelöscht werden.');
        return;
    }
    
    if (confirm(`Szenario ${scenarioId} wirklich löschen?`)) {
        // Remove from scenarios array
        window.scenarios = scenarios.filter(s => s.id !== scenarioId);
        
        // Remove from selected scenarios for chart
        selectedScenariosForChart.delete(scenarioId);
        
        // Remove DOM elements
        const tab = document.querySelector(`[data-scenario="${scenarioId}"].scenario-tab`);
        const panel = document.querySelector(`[data-scenario="${scenarioId}"].scenario-panel`);
        
        if (tab) tab.remove();
        if (panel) panel.remove();
        
        // If the deleted scenario was active, switch to scenario A
        if (activeScenario === scenarioId) {
            switchToScenario('A');
        }
        
        // If the deleted scenario was selected for contributions chart, switch to A
        if (selectedContributionsScenario === scenarioId) {
            window.selectedContributionsScenario = 'A';
        }
        
        // Update scenario checkboxes, dropdown, and recalculate
        updateScenarioCheckboxes();
        updateContributionsScenarioDropdown();
        recalculateAll();
    }
}

/**
 * Rename a scenario
 * @param {string} scenarioId - The ID of the scenario to rename
 */
export function renameScenario(scenarioId) {
    const { scenarios, showNotification, updateScenarioCheckboxes, updateContributionsScenarioDropdown } = window;
    
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario) {
        showNotification('Fehler', 'Szenario nicht gefunden.', 'error');
        return;
    }
    
    const currentName = scenario.name;
    const newName = prompt('Szenario umbenennen:', currentName);
    
    if (newName === null) {
        // User cancelled
        return;
    }
    
    if (newName.trim() === '') {
        showNotification('Fehler', 'Der Name darf nicht leer sein.', 'error');
        return;
    }
    
    if (newName.trim() === currentName) {
        // No change
        return;
    }
    
    // Update scenario name
    scenario.name = newName.trim();
    
    // Update panel title
    const panelTitle = document.querySelector(`.scenario-panel[data-scenario="${scenarioId}"] .scenario-panel-title`);
    if (panelTitle) {
        panelTitle.textContent = `📊 ${scenario.name}`;
    }
    
    // Update tab text
    const tab = document.querySelector(`[data-scenario="${scenarioId}"].scenario-tab`);
    if (tab) {
        tab.innerHTML = `📈 ${scenario.name}`;
    }
    
    // Update scenario checkboxes and dropdown
    updateScenarioCheckboxes();
    updateContributionsScenarioDropdown();
    
    showNotification('✅ Erfolg', `Szenario wurde zu "${scenario.name}" umbenannt.`, 'success');
}

// ===================================
// UTILITY FUNCTIONS
// ===================================

/**
 * Get the value of a scenario input field
 * @param {string} inputId - The base ID of the input
 * @param {string} scenarioId - The scenario ID
 * @returns {string} The value of the input field
 */
export function getScenarioValue(inputId, scenarioId) {
    const element = document.getElementById(inputId + '_' + scenarioId);
    return element ? element.value : '0';
}

/**
 * Get the value of a scenario toggle
 * @param {string} toggleId - The base ID of the toggle
 * @param {string} scenarioId - The scenario ID
 * @returns {boolean} Whether the toggle is active
 */
export function getScenarioToggleValue(toggleId, scenarioId) {
    const element = document.getElementById(toggleId + '_' + scenarioId);
    return element ? element.classList.contains('active') : false;
}

/**
 * Update a scenario slider value display
 * @param {string} sliderId - The base ID of the slider
 * @param {string} scenarioId - The scenario ID
 */
export function updateScenarioSliderValue(sliderId, scenarioId) {
    const fullId = sliderId + '_' + scenarioId;
    const slider = document.getElementById(fullId);
    const valueSpan = document.getElementById(sliderId + 'Value_' + scenarioId);
    
    if (!slider || !valueSpan) return;
    
    const value = parseFloat(slider.value);
    let formattedValue;
    
    switch (sliderId) {
        case 'annualReturn':
        case 'inflationRate':
        case 'salaryGrowth':
        case 'salaryToSavings':
            formattedValue = value.toFixed(1) + '%';
            break;
        case 'duration':
            formattedValue = Math.round(value) + ' Jahre';
            break;
        default:
            formattedValue = value.toString();
    }
    
    valueSpan.textContent = formattedValue;
}

// ===================================
// EXPORTS FOR GLOBAL ACCESS
// ===================================

// Make functions available globally for onclick handlers
window.addNewScenario = addNewScenario;
window.createScenarioPanel = createScenarioPanel;
window.createScenarioTab = createScenarioTab;
window.switchToScenario = switchToScenario;
window.removeScenario = removeScenario;
window.renameScenario = renameScenario;
window.copyScenario = copyScenario;
window.getScenarioValue = getScenarioValue;
window.getScenarioToggleValue = getScenarioToggleValue;
window.updateScenarioSliderValue = updateScenarioSliderValue;