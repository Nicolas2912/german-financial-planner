/**
 * Scenario Management Functions for German Financial Planner
 * 
 * This module contains all scenario management functions including creation, 
 * switching, renaming, copying, and removing scenarios.
 */

import { formatGermanNumber, parseGermanNumber } from "../utils.js";
import { setupScenarioInputListeners } from '../ui/setup/setupScenarios.js';
import * as state from '../state.js';

// ===================================
// SCENARIO CREATION AND MANAGEMENT
// ===================================

/**
 * Add a new scenario to the system
 * @returns {Object|null} The new scenario object or null if maximum scenarios reached
 */
export function addNewScenario() {
    // Get global variables from window object with fallbacks
    const scenarios = window.scenarios || [];
    const scenarioColors = window.scenarioColors || { 'A': '#3498db', 'B': '#27ae60', 'C': '#e74c3c', 'D': '#f39c12' };
    const selectedScenariosForChart = window.selectedScenariosForChart || new Set(['A']);
    const { setupSavingsModeForScenario, updateScenarioCheckboxes, updateContributionsScenarioDropdown, 
            saveIndividualAnsparphaseScenario, showNotification } = window;
    
    if (scenarios.length >= 4) {
        if (showNotification) {
            showNotification('⚠️ Maximale Anzahl erreicht', 'Maximal 4 Szenarien sind möglich.', 'warning');
        } else {
            alert('⚠️ Maximale Anzahl erreicht: Maximal 4 Szenarien sind möglich.');
        }
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
    window.scenarios = scenarios; // Update global reference
    
    // Also update state.scenarios to keep them synchronized
    if (window.state && window.state.setScenarios) {
        window.state.setScenarios(scenarios);
    }
    
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
    
    // Trigger calculations for the new scenario and update UI
    if (window.recalculateAll) {
        window.recalculateAll();
    }
    
    // Auto-save the new scenario
    setTimeout(() => saveIndividualAnsparphaseScenario(newScenarioId), 2000);
    
    return newScenario;
}

/**
 * Create a new scenario without switching to it
 * @returns {Object|null} The new scenario object or null if maximum scenarios reached
 */
export function createNewScenarioWithoutSwitching() {
    const scenarios = window.scenarios || [];
    const scenarioColors = window.scenarioColors || { 'A': '#3498db', 'B': '#27ae60', 'C': '#e74c3c', 'D': '#f39c12' };
    
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
    window.scenarios = scenarios; // Update global reference
    
    // Also update state.scenarios to keep them synchronized
    if (window.state && window.state.setScenarios) {
        window.state.setScenarios(scenarios);
    }
    
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
    tab.style.setProperty('--scenario-color', scenario.color);
    tab.innerHTML = `📈 ${scenario.name}`;
    
    // Insert before the add button
    tabsContainer.insertBefore(tab, addBtn);
    
    // Add click event listener for the new tab
    tab.addEventListener('click', function() {
        switchToScenario(scenario.id);
    });
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
    const scenarios = window.scenarios || [];
    const { getScenarioValue } = window;
    
    const panelsContainer = document.getElementById('scenarioPanels');
    
    const panel = document.createElement('div');
    panel.className = 'scenario-panel';
    panel.dataset.scenario = scenario.id;
    panel.style.setProperty('--scenario-color', scenario.color);
    
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
        <div class="scenario-panel-header" style="--scenario-color: ${scenario.color};">
            <h3 class="scenario-panel-title">📊 ${scenario.name}</h3>
            <div class="scenario-actions">
                <button class="scenario-action-btn" onclick="window.renameScenario('${scenario.id}')" title="Szenario umbenennen">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Umbenennen
                </button>
                <button class="scenario-action-btn" onclick="window.copyScenario('${scenario.id}')" title="Szenario kopieren">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    Kopieren
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
                                <div class="phase-number">1</div>
                                <h5>Phase 1</h5>
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
                                    <div class="input-group rendite-input">
                                        <label>Rendite (% p.a.)</label>
                                        <input type="number" class="phase-return-rate" value="7.0" min="0" max="20" step="0.1" data-phase="1" data-scenario="${scenario.id}">
                                    </div>
                                </div>
                                <div class="phase-summary">
                                    <span class="phase-duration">Dauer: 11 Jahre</span>
                                    <span class="phase-total">Gesamt: €39.600</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Phase 2 -->
                    <div class="savings-phase" data-phase="2" data-scenario="${scenario.id}">
                        <div class="phase-header">
                            <div class="phase-title">
                                <div class="phase-number">2</div>
                                <h5>Phase 2</h5>
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
                                        <input type="number" class="phase-start-year" value="11" min="1" data-phase="2" data-scenario="${scenario.id}">
                                    </div>
                                    <div class="input-group time-input">
                                        <label>Bis Jahr</label>
                                        <input type="number" class="phase-end-year" value="25" min="2" max="100" data-phase="2" data-scenario="${scenario.id}">
                                    </div>
                                    <div class="input-group savings-input">
                                        <label>Monatliche Sparrate (€)</label>
                                        <input type="text" class="phase-savings-rate" value="800" data-phase="2" data-scenario="${scenario.id}">
                                    </div>
                                    <div class="input-group rendite-input">
                                        <label>Rendite (% p.a.)</label>
                                        <input type="number" class="phase-return-rate" value="8.5" min="0" max="20" step="0.1" data-phase="2" data-scenario="${scenario.id}">
                                    </div>
                                </div>
                                <div class="phase-summary">
                                    <span class="phase-duration">Dauer: 15 Jahre</span>
                                    <span class="phase-total">Gesamt: €144.000</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Phase 3 -->
                    <div class="savings-phase" data-phase="3" data-scenario="${scenario.id}">
                        <div class="phase-header">
                            <div class="phase-title">
                                <div class="phase-number">3</div>
                                <h5>Phase 3</h5>
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
                                        <input type="number" class="phase-start-year" value="26" min="2" data-phase="3" data-scenario="${scenario.id}">
                                    </div>
                                    <div class="input-group time-input">
                                        <label>Bis Jahr</label>
                                        <input type="number" class="phase-end-year" value="40" min="3" max="100" data-phase="3" data-scenario="${scenario.id}">
                                    </div>
                                    <div class="input-group savings-input">
                                        <label>Monatliche Sparrate (€)</label>
                                        <input type="text" class="phase-savings-rate" value="1200" data-phase="3" data-scenario="${scenario.id}">
                                    </div>
                                    <div class="input-group rendite-input">
                                        <label>Rendite (% p.a.)</label>
                                        <input type="number" class="phase-return-rate" value="6.5" min="0" max="20" step="0.1" data-phase="3" data-scenario="${scenario.id}">
                                    </div>
                                </div>
                                <div class="phase-summary">
                                    <span class="phase-duration">Dauer: 15 Jahre</span>
                                    <span class="phase-total">Gesamt: €216.000</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Multi-Phase Summary -->
                <div class="multi-phase-summary">
                    <div class="summary-header">
                        <h4>Sparplan-Übersicht</h4>
                    </div>
                    <div class="summary-content">
                        <div class="summary-item">
                            <span class="summary-label">Aktive Phasen:</span>
                            <span class="summary-value" id="activePhasesCount_${scenario.id}">1</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Gesamtdauer:</span>
                            <span class="summary-value" id="totalDuration_${scenario.id}">11 Jahre</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Durchschnittliche Sparrate:</span>
                            <span class="summary-value" id="averageSavingsRate_${scenario.id}">€300</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Gesamteinzahlungen:</span>
                            <span class="summary-value" id="totalContributions_${scenario.id}">€39.600</span>
                        </div>
                    </div>
                    <div class="phase-timeline" id="phaseTimeline_${scenario.id}">
                        <!-- Visual timeline will be generated here -->
                    </div>
                </div>
            </div>
        </div>

        <div class="input-group">
            <label for="initialCapital_${scenario.id}">Startkapital (€)</label>
            <input type="text" id="initialCapital_${scenario.id}" class="input-field scenario-input" value="${defaultValues.initialCapital}" step="100" data-scenario="${scenario.id}">
        </div>

        <!-- Tax Toggle -->
        <div class="toggle-container" style="margin-bottom: 30px;">
            <label>Deutsche Abgeltungssteuer einbeziehen (25% mit Vorabpauschale)</label>
            <div class="toggle scenario-toggle" id="taxToggle_${scenario.id}" data-scenario="${scenario.id}"></div>
        </div>

        <!-- ETF Type Selection -->
        <div class="input-group" style="margin-top: 20px; margin-bottom: 25px;">
            <label style="margin-bottom: 12px; display: block; font-weight: 600;">ETF-Typ für Steuerberechnung</label>
            <div class="radio-group" style="margin-top: 10px;">
                <label class="radio-option">
                    <input type="radio" name="etfType-${scenario.id}" value="accumulating" checked>
                    <span class="radio-custom"></span>
                    Thesaurierend (Vorabpauschale)
                </label>
                <label class="radio-option">
                    <input type="radio" name="etfType-${scenario.id}" value="distributing">
                    <span class="radio-custom"></span>
                    Ausschüttend
                </label>
            </div>
            <small style="color: #7f8c8d; font-size: 0.85rem; margin-top: 12px; display: block; line-height: 1.4;">
                💡 Thesaurierende ETFs: Niedrigere Steuerlast durch Vorabpauschale. Ausschüttende ETFs: Steuern auf Dividenden.
            </small>
        </div>

        <!-- Teilfreistellung Toggle -->
        <div class="toggle-container" style="margin-top: 25px; margin-bottom: 30px;">
            <label>Teilfreistellung bei Aktienfonds anwenden (30% steuerfrei)</label>
            <div class="toggle scenario-toggle active" id="teilfreistellungToggle_${scenario.id}" data-scenario="${scenario.id}"></div>
        </div>
        <div style="margin-top: -15px; margin-bottom: 25px;" id="teilfreistellungHelp_${scenario.id}">
            <small style="color: #7f8c8d; font-size: 0.85rem; display: block; line-height: 1.4;">
                💡 Bei Aktien-ETFs sind 30% der Erträge steuerfrei. Bei Renten-ETFs oder Mischfonds gelten andere Sätze.
            </small>
        </div>

        <!-- Sliders -->
        <div class="input-group">
            <label>Jährliche Rendite (%)</label>
            <div class="slider-container">
                <input type="range" id="annualReturn_${scenario.id}" class="slider scenario-slider" min="1" max="50" value="${defaultValues.annualReturn}" step="0.1" data-scenario="${scenario.id}">
                <span class="slider-value" id="annualReturnValue_${scenario.id}">${parseFloat(defaultValues.annualReturn).toFixed(1)}%</span>
            </div>
        </div>

        <div class="input-group">
            <label>Inflationsrate (%)</label>
            <div class="slider-container">
                <input type="range" id="inflationRate_${scenario.id}" class="slider scenario-slider" min="0" max="6" value="${defaultValues.inflationRate}" step="0.1" data-scenario="${scenario.id}">
                <span class="slider-value" id="inflationRateValue_${scenario.id}">${parseFloat(defaultValues.inflationRate).toFixed(1)}%</span>
            </div>
        </div>

        <div class="input-group">
            <label>Jährliche Gehaltssteigerung (%)</label>
            <div class="slider-container">
                <input type="range" id="salaryGrowth_${scenario.id}" class="slider scenario-slider" min="0" max="8" value="${defaultValues.salaryGrowth}" step="0.1" data-scenario="${scenario.id}">
                <span class="slider-value" id="salaryGrowthValue_${scenario.id}">${parseFloat(defaultValues.salaryGrowth).toFixed(1)}%</span>
            </div>
        </div>

        <div class="input-group">
            <label>Anlagedauer (Jahre)</label>
            <div class="slider-container">
                <input type="range" id="duration_${scenario.id}" class="slider scenario-slider" min="1" max="50" value="${defaultValues.duration}" step="1" data-scenario="${scenario.id}">
                <span class="slider-value" id="durationValue_${scenario.id}">${defaultValues.duration} Jahre</span>
            </div>
        </div>

        <div class="input-group">
            <label for="baseSalary_${scenario.id}">Aktuelles Brutto-Jahresgehalt (€)</label>
            <input type="text" id="baseSalary_${scenario.id}" class="input-field scenario-input" value="${defaultValues.baseSalary}" step="1000" data-scenario="${scenario.id}">
            <small style="color: #7f8c8d; font-size: 0.85rem; margin-top: 5px; display: block;">
                💡 Benötigt für realistische Gehaltssteigerungs-Berechnung
            </small>
        </div>

        <div class="input-group">
            <label>Gehaltssteigerung für Sparrate (%)</label>
            <div class="slider-container">
                <input type="range" id="salaryToSavings_${scenario.id}" class="slider scenario-slider" min="0" max="100" value="${defaultValues.salaryToSavings}" step="5" data-scenario="${scenario.id}">
                <span class="slider-value" id="salaryToSavingsValue_${scenario.id}">${defaultValues.salaryToSavings}%</span>
            </div>
            <small style="color: #7f8c8d; font-size: 0.85rem; margin-top: 5px; display: block;">
                Wieviel % der <strong>Netto-Gehaltssteigerung</strong> fließt in die Sparrate?
            </small>
            <div style="background: #e8f4fd; border: 1px solid #3498db; border-radius: 6px; padding: 10px; margin-top: 8px; font-size: 0.8rem; color: #2c3e50;">
                💡 <strong>Realistische Berechnung:</strong> Berücksichtigt die deutsche progressive Besteuerung. Bei Gehaltssteigerungen steigt auch die Steuerlast, wodurch weniger Netto-Erhöhung für das Sparen verfügbar ist.
            </div>
            
            <!-- Salary Increase Analysis -->
            <div id="salaryIncreaseAnalysis_${scenario.id}" class="salary-increase-analysis" style="background: #f0fff0; border: 1px solid #27ae60; border-radius: 8px; padding: 15px; margin-top: 10px; font-size: 0.9rem; color: #2c3e50;">
                <h4 style="margin: 0 0 10px 0; color: #27ae60; font-size: 1rem;">📊 Auswirkung der Gehaltserhöhung</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div>
                        <strong>Brutto-Erhöhung:</strong><br>
                        <span class="gross-increase">€1.800</span>
                    </div>
                    <div>
                        <strong>Netto-Erhöhung:</strong><br>
                        <span class="net-increase" style="color: #27ae60; font-weight: bold;">€1.100</span>
                    </div>
                    <div>
                        <strong>Steuer/Abgaben auf Erhöhung:</strong><br>
                        <span class="tax-on-increase" style="color: #e74c3c;">€700</span>
                    </div>
                    <div>
                        <strong>Netto-Rate der Erhöhung:</strong><br>
                        <span class="net-increase-rate" style="color: #f39c12; font-weight: bold;">61.1%</span>
                    </div>
                </div>
                <div style="margin-top: 10px; padding: 8px; background: #fff; border-radius: 4px; font-size: 0.8rem; color: #7f8c8d;">
                    💡 Bei höheren Gehältern bleibt prozentual weniger netto übrig (progressive Besteuerung)
                </div>
            </div>
        </div>
    `;
    
    panelsContainer.appendChild(panel);
    
    // Set up event listeners for the new panel
    if (typeof setupScenarioInputListeners === 'function') {
        setupScenarioInputListeners(scenario.id);
        
        // Also initialize the slider display values
        const sliders = ['annualReturn', 'inflationRate', 'salaryGrowth', 'duration', 'salaryToSavings'];
        sliders.forEach(sliderId => {
            if (window.updateScenarioSliderValue) {
                window.updateScenarioSliderValue(sliderId, scenario.id);
            }
        });
    } else {
        console.error('setupScenarioInputListeners is not available, using fallback');
        // Fallback: use window.setupScenarioInputListeners if available
        if (window.setupScenarioInputListeners && typeof window.setupScenarioInputListeners === 'function') {
            window.setupScenarioInputListeners(scenario.id);
        }
    }
    
    // Set up savings mode functionality for this scenario
    if (window.setupSavingsModeForScenario && typeof window.setupSavingsModeForScenario === 'function') {
        window.setupSavingsModeForScenario(scenario.id);
    }
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
    const scenarios = window.scenarios || [];
    const selectedScenariosForChart = window.selectedScenariosForChart || new Set(['A']);
    const activeScenario = window.activeScenario || 'A';
    const selectedContributionsScenario = state.selectedContributionsScenario || 'A';
    const { updateScenarioCheckboxes, updateContributionsScenarioDropdown, recalculateAll } = window;
    
    if (scenarioId === 'A') {
        alert('❌ Das Basis-Szenario A kann nicht gelöscht werden.');
        return;
    }
    
    if (confirm(`Szenario ${scenarioId} wirklich löschen?`)) {
        // Remove from scenarios array
        const filteredScenarios = scenarios.filter(s => s.id !== scenarioId);
        window.scenarios = filteredScenarios;
        
        // Also update state.scenarios to keep them synchronized
        if (window.state && window.state.setScenarios) {
            window.state.setScenarios(filteredScenarios);
        }
        
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
            state.setSelectedContributionsScenario('A');
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
    const scenarios = window.scenarios || [];
    const { showNotification, updateScenarioCheckboxes, updateContributionsScenarioDropdown } = window;
    
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario) {
        if (showNotification) {
            showNotification('Fehler', 'Szenario nicht gefunden.', 'error');
        } else {
            alert('Fehler: Szenario nicht gefunden.');
        }
        return;
    }
    
    const currentName = scenario.name;
    const newName = prompt('Szenario umbenennen:', currentName);
    
    if (newName === null) {
        // User cancelled
        return;
    }
    
    if (newName.trim() === '') {
        if (showNotification) {
            showNotification('Fehler', 'Der Name darf nicht leer sein.', 'error');
        } else {
            alert('Fehler: Der Name darf nicht leer sein.');
        }
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
    
    if (showNotification) {
        showNotification('✅ Erfolg', `Szenario wurde zu "${scenario.name}" umbenannt.`, 'success');
    }
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
window.updateScenarioSliderValue = updateScenarioSliderValue;
