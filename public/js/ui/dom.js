/**
 * DOM Manipulation Functions
 * Handles all DOM updates, UI state management, and element manipulation
 */

// Import utility functions
import { formatCurrency, parseGermanNumber } from '../utils/formatting.js';
import { scenarios, selectedScenariosForChart, selectedContributionsScenario, currentPhase, currentChartMode } from '../state/globalState.js';

// ==================== Scenario Results Display ====================

/**
 * Updates the scenario results display with current scenario data
 */
export function updateScenarioResults() {
    const resultsContainer = document.getElementById('scenarioResults');
    resultsContainer.innerHTML = '';

    scenarios.forEach(scenario => {
        if (!scenario.results || !scenario.results.finalNominal) return;

        const resultCard = document.createElement('div');
        resultCard.className = 'scenario-result-card';
        resultCard.dataset.scenario = scenario.id;
        
        resultCard.innerHTML = `
            <div class="scenario-result-header">
                <h3 class="scenario-result-title">📊 ${scenario.name}</h3>
            </div>
            <div class="scenario-result-grid">
                <div class="scenario-result-item">
                    <div class="scenario-result-label">Endbetrag (Nominal)</div>
                    <div class="scenario-result-value">${formatCurrency(scenario.results.finalNominal)}</div>
                </div>
                <div class="scenario-result-item">
                    <div class="scenario-result-label">Endbetrag (Real)</div>
                    <div class="scenario-result-value">${formatCurrency(scenario.results.finalReal)}</div>
                </div>
                <div class="scenario-result-item">
                    <div class="scenario-result-label">Gesamt Eingezahlt</div>
                    <div class="scenario-result-value">${formatCurrency(scenario.results.totalInvested)}</div>
                </div>
                <div class="scenario-result-item">
                    <div class="scenario-result-label">Gesamtrendite</div>
                    <div class="scenario-result-value">${formatCurrency(scenario.results.totalReturn)}</div>
                </div>
                <div class="scenario-result-item">
                    <div class="scenario-result-label">Gezahlte Steuern</div>
                    <div class="scenario-result-value" style="color: #e74c3c;">${formatCurrency(scenario.results.totalTaxesPaid || 0)}</div>
                </div>
                <div class="scenario-result-item">
                    <div class="scenario-result-label">Netto-Rendite</div>
                    <div class="scenario-result-value" style="color: #27ae60;">${formatCurrency((scenario.results.totalReturn || 0) - (scenario.results.totalTaxesPaid || 0))}</div>
                </div>
            </div>
        `;
        
        resultsContainer.appendChild(resultCard);
    });
}

// ==================== Withdrawal Phase Results ====================

/**
 * Updates the withdrawal results display with calculated values
 */
export function updateWithdrawalResults(results) {
    // Update UI with proper average values and labels
    document.getElementById('monthlyWithdrawal').textContent = formatCurrency(results.monthlyGrossWithdrawal);
    document.getElementById('monthlyNetWithdrawal').textContent = formatCurrency(results.monthlyNetWithdrawal);
    document.getElementById('totalTaxesPaid').textContent = formatCurrency(results.totalTaxesPaid);
    document.getElementById('realPurchasingPower').textContent = formatCurrency(results.realPurchasingPower);
    
    // Update additional fields if they exist
    if (document.getElementById('averageMonthlyTax')) {
        document.getElementById('averageMonthlyTax').textContent = formatCurrency(results.averageMonthlyTax);
    }
    if (document.getElementById('firstYearMonthlyNet')) {
        document.getElementById('firstYearMonthlyNet').textContent = formatCurrency(results.firstYearMonthlyNet);
    }
    if (document.getElementById('firstYearMonthlyGross')) {
        document.getElementById('firstYearMonthlyGross').textContent = formatCurrency(results.firstYearMonthlyGross);
    }
}

/**
 * Updates the withdrawal table with yearly data
 */
export function updateWithdrawalTable(yearlyData) {
    const tbody = document.querySelector('#withdrawalTable tbody');
    tbody.innerHTML = '';

    // Get current inflation rate for real value calculation
    const inflationRate = parseFloat(document.getElementById('withdrawalInflation').value) / 100;

    yearlyData.forEach((data, index) => {
        const row = tbody.insertRow();
        const isLastYear = index === yearlyData.length - 1;
        
        if (isLastYear) {
            row.classList.add('highlight-row');
        }

        // Calculate real value of end capital (today's purchasing power)
        const realEndCapital = data.endCapital / Math.pow(1 + inflationRate, data.year - 1);

        row.innerHTML = `
            <td>${data.year}</td>
            <td>${formatCurrency(data.startCapital)}</td>
            <td>${formatCurrency(data.grossWithdrawal)}</td>
            <td>${formatCurrency(data.taxesPaid)}</td>
            <td>${formatCurrency(data.netWithdrawal)}</td>
            <td>${formatCurrency(data.endCapital)}</td>
            <td>${formatCurrency(realEndCapital)}</td>
        `;
    });
}

// ==================== Toggle State Management ====================

/**
 * Updates the Teilfreistellung toggle state based on tax toggle
 */
export function updateTeilfreistellungToggleState(scenarioId) {
    const taxToggle = document.getElementById('taxToggle_' + scenarioId);
    const teilfreistellungToggle = document.getElementById('teilfreistellungToggle_' + scenarioId);
    const teilfreistellungContainer = teilfreistellungToggle ? teilfreistellungToggle.closest('.toggle-container') : null;
    const teilfreistellungHelp = document.getElementById('teilfreistellungHelp_' + scenarioId);
    
    if (taxToggle && teilfreistellungToggle && teilfreistellungContainer) {
        const isTaxEnabled = taxToggle.classList.contains('active');
        
        if (isTaxEnabled) {
            // Enable Teilfreistellung toggle
            teilfreistellungToggle.classList.remove('disabled');
            teilfreistellungContainer.classList.remove('disabled');
            if (teilfreistellungHelp) {
                teilfreistellungHelp.innerHTML = `
                    <small style="color: #7f8c8d; font-size: 0.85rem; display: block; line-height: 1.4;">
                        💡 Bei Aktien-ETFs sind 30% der Erträge steuerfrei. Bei Renten-ETFs oder Mischfonds gelten andere Sätze.
                    </small>
                `;
            }
        } else {
            // Disable Teilfreistellung toggle
            teilfreistellungToggle.classList.add('disabled');
            teilfreistellungContainer.classList.add('disabled');
            // Deactivate it when tax is disabled
            teilfreistellungToggle.classList.remove('active');
            if (teilfreistellungHelp) {
                teilfreistellungHelp.innerHTML = `
                    <small style="color: #999; font-size: 0.85rem; display: block; line-height: 1.4;">
                        ⚠️ Teilfreistellung ist nur verfügbar, wenn die Abgeltungssteuer aktiviert ist.
                    </small>
                `;
            }
        }
    }
}

/**
 * Updates comparison scenario Teilfreistellung state
 */
export function updateComparisonTeilfreistellungState(scenarioId) {
    const taxToggle = document.querySelector(`[data-scenario="${scenarioId}"] [data-param="accumulation.includeTax"]`);
    const teilfreistellungToggle = document.querySelector(`[data-scenario="${scenarioId}"] [data-param="accumulation.teilfreistellung"]`);
    const teilfreistellungContainer = teilfreistellungToggle ? teilfreistellungToggle.closest('.toggle-container') : null;

    if (taxToggle && teilfreistellungToggle && teilfreistellungContainer) {
        if (taxToggle.classList.contains('active')) {
            // Enable Teilfreistellung toggle
            teilfreistellungToggle.classList.remove('disabled');
            teilfreistellungContainer.classList.remove('disabled');
        } else {
            // Disable Teilfreistellung toggle
            teilfreistellungToggle.classList.add('disabled');
            teilfreistellungContainer.classList.add('disabled');
            // Deactivate it when tax is disabled
            teilfreistellungToggle.classList.remove('active');
        }
    }
}

// ==================== Slider Value Updates ====================

/**
 * Updates scenario slider display values
 */
export function updateScenarioSliderValue(sliderId, scenarioId) {
    const fullId = sliderId + '_' + scenarioId;
    const slider = document.getElementById(fullId);
    const valueSpan = document.getElementById(sliderId + 'Value_' + scenarioId);
    
    if (!slider || !valueSpan) return;
    
    const value = parseFloat(slider.value);

    switch(sliderId) {
        case 'annualReturn':
        case 'inflationRate':
        case 'salaryGrowth':
            valueSpan.textContent = value.toFixed(1) + '%';
            break;
        case 'duration':
            valueSpan.textContent = value + ' Jahre';
            break;
        case 'salaryToSavings':
            valueSpan.textContent = value.toFixed(0) + '%';
            break;
    }
}

/**
 * Updates withdrawal slider display values
 */
export function updateWithdrawalSliderValue(sliderId) {
    const slider = document.getElementById(sliderId);
    const valueSpan = document.getElementById(sliderId + 'Value');
    const value = parseFloat(slider.value); // Use parseFloat for slider values, not parseGermanNumber

    switch(sliderId) {
        case 'postRetirementReturn':
        case 'withdrawalInflation':
            // Use simple formatting with fixed decimals for percentages to avoid German locale issues
            valueSpan.textContent = value.toFixed(1) + '%';
            break;
        case 'withdrawalDuration':
            valueSpan.textContent = value + ' Jahre';
            break;
        case 'withdrawalTeilfreistellungRate':
            valueSpan.textContent = value + '%';
            break;
    }
}

// ==================== Scenario Selection Controls ====================

/**
 * Updates scenario checkboxes for chart selection
 */
export function updateScenarioCheckboxes() {
    const checkboxContainer = document.getElementById('scenarioCheckboxes');
    if (!checkboxContainer) return;
    
    checkboxContainer.innerHTML = '';
    
    scenarios.forEach(scenario => {
        const checkboxItem = document.createElement('div');
        checkboxItem.className = 'scenario-checkbox-item';
        checkboxItem.dataset.scenario = scenario.id;
        checkboxItem.style.setProperty('--scenario-color', scenario.color);
        
        if (selectedScenariosForChart.has(scenario.id)) {
            checkboxItem.classList.add('checked');
        }
        
        checkboxItem.innerHTML = `
            <div class="scenario-checkbox"></div>
            <span>${scenario.name}</span>
        `;
        
        checkboxItem.addEventListener('click', function() {
            if (selectedScenariosForChart.has(scenario.id)) {
                selectedScenariosForChart.delete(scenario.id);
                this.classList.remove('checked');
            } else {
                selectedScenariosForChart.add(scenario.id);
                this.classList.add('checked');
            }
            
            // Only update comparison chart since contributions has its own dropdown
            updateMainChart();
        });
        
        checkboxContainer.appendChild(checkboxItem);
    });
}

/**
 * Updates visibility of scenario checkboxes based on current phase and chart mode
 */
export function updateScenarioCheckboxVisibility() {
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

/**
 * Updates the contributions scenario dropdown
 */
export function updateContributionsScenarioDropdown() {
    const dropdown = document.getElementById('contributionsScenarioDropdown');
    if (!dropdown) return;
    
    dropdown.innerHTML = '';
    
    scenarios.forEach(scenario => {
        const option = document.createElement('option');
        option.value = scenario.id;
        option.textContent = scenario.name;
        option.style.color = scenario.color;
        option.style.fontWeight = 'bold';
        if (scenario.id === selectedContributionsScenario) {
            option.selected = true;
        }
        dropdown.appendChild(option);
    });
}

/**
 * Updates the scenario selector dropdown
 */
export function updateScenarioSelector() {
    const selector = document.getElementById('scenarioSelector');
    if (!selector) return;
    
    selector.innerHTML = '<option value="">Szenario wählen...</option>';
    
    scenarios.forEach(scenario => {
        const option = document.createElement('option');
        option.value = scenario.id;
        option.textContent = scenario.name;
        selector.appendChild(option);
    });
}

// ==================== Notification System ====================

/**
 * Shows a notification message to the user
 */
export function showNotification(title, message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-title">${title}</div>
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    // Add styles if not already added
    if (!document.getElementById('notificationStyles')) {
        const styles = document.createElement('style');
        styles.id = 'notificationStyles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                border-radius: 10px;
                padding: 20px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                z-index: 10000;
                max-width: 400px;
                border-left: 5px solid #3498db;
                animation: slideIn 0.3s ease-out;
            }
            
            .notification-success {
                border-left-color: #27ae60;
            }
            
            .notification-error {
                border-left-color: #e74c3c;
            }
            
            .notification-warning {
                border-left-color: #f39c12;
            }
            
            .notification-title {
                font-weight: bold;
                margin-bottom: 8px;
                color: #2c3e50;
            }
            
            .notification-message {
                color: #7f8c8d;
                line-height: 1.4;
            }
            
            .notification-close {
                position: absolute;
                top: 10px;
                right: 15px;
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: #7f8c8d;
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(styles);
    }
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOut 0.3s ease-out forwards';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
}

// ==================== Chart Error Messages ====================

/**
 * Displays error messages on chart canvas
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
            icon: '📊',
            title: 'Keine Szenarien ausgewählt',
            subtitle: 'Für die Übersicht muss mindestens ein Szenario ausgewählt werden',
            action: 'Wählen Sie ein oder mehrere Szenarien aus'
        },
        'no-data': {
            icon: '💰',
            title: 'Keine Daten verfügbar',
            subtitle: 'Es sind noch keine Berechnungen vorhanden.',
            action: 'Bitte Parameter eingeben und berechnen'
        },
        'no-scenario-data': {
            icon: '⚠️',
            title: 'Szenario nicht berechnet',
            subtitle: 'Die Berechnung für dieses Szenario ist fehlgeschlagen.',
            action: 'Parameter überprüfen und erneut berechnen'
        },
        'calculation-error': {
            icon: '❌',
            title: 'Berechnungsfehler',
            subtitle: 'Bei der Berechnung ist ein Fehler aufgetreten.',
            action: 'Eingaben überprüfen und erneut versuchen'
        }
    };
    
    const message = customMessage || errorMessages[errorType] || errorMessages['no-data'];
    
    // Draw icon
    if (message.icon) {
        const iconSize = Math.max(40, Math.min(60, canvas.width * 0.08));
        ctx.font = `${iconSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#bdc3c7';
        ctx.fillText(message.icon, centerX, centerY - 60);
    }
    
    // Draw main title
    const titleSize = Math.max(18, Math.min(24, canvas.width * 0.035));
    ctx.font = `bold ${titleSize}px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e74c3c';
    ctx.fillText(message.title || 'Fehler', centerX, centerY - 10);
    
    // Draw subtitle
    if (message.subtitle) {
        const subtitleSize = Math.max(12, Math.min(16, canvas.width * 0.025));
        ctx.font = `${subtitleSize}px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif`;
        ctx.fillStyle = '#7f8c8d';
        ctx.fillText(message.subtitle, centerX, centerY + 20);
    }
    
    // Draw action text
    if (message.action) {
        const actionSize = Math.max(11, Math.min(14, canvas.width * 0.022));
        ctx.font = `${actionSize}px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif`;
        ctx.fillStyle = '#95a5a6';
        ctx.fillText(message.action, centerX, centerY + 50);
    }
    
    ctx.restore();
}

// ==================== Multi-Phase Summary Updates ====================

/**
 * Updates phase summaries for a scenario
 */
export function updatePhaseSummaries(scenarioId) {
    const phases = ['phase1', 'phase2', 'phase3'];
    
    phases.forEach(phase => {
        const phaseElement = document.querySelector(`.savings-phase[data-phase="${phase}"][data-scenario="${scenarioId}"]`);
        if (!phaseElement) return;
        
        const isActive = phaseElement.querySelector('.phase-toggle').classList.contains('active');
        const summaryElement = phaseElement.querySelector('.phase-summary');
        
        if (isActive && summaryElement) {
            try {
                const startYear = parseInt(document.querySelector(`.phase-start-year[data-phase="${phase}"][data-scenario="${scenarioId}"]`).value) || 0;
                const duration = parseInt(document.querySelector(`.phase-duration[data-phase="${phase}"][data-scenario="${scenarioId}"]`).value) || 0;
                const endYear = startYear + duration;
                const monthlySavings = parseGermanNumber(document.querySelector(`.phase-amount[data-phase="${phase}"][data-scenario="${scenarioId}"]`).value) || 0;
                const totalContributions = monthlySavings * 12 * duration;
                
                summaryElement.innerHTML = `
                    <div class="phase-summary-item">
                        <span class="phase-summary-label">Zeitraum:</span>
                        <span class="phase-summary-value">Jahr ${startYear} - ${endYear}</span>
                    </div>
                    <div class="phase-summary-item">
                        <span class="phase-summary-label">Monatlich:</span>
                        <span class="phase-summary-value">${formatCurrency(monthlySavings)}</span>
                    </div>
                    <div class="phase-summary-item">
                        <span class="phase-summary-label">Gesamt:</span>
                        <span class="phase-summary-value">${formatCurrency(totalContributions)}</span>
                    </div>
                `;
            } catch (error) {
                console.error('Error updating phase summary:', error);
                summaryElement.innerHTML = '<div class="phase-summary-error">Fehler beim Berechnen der Zusammenfassung</div>';
            }
        }
    });
}

/**
 * Updates multi-phase summary for a scenario
 */
export function updateMultiPhaseSummary(scenarioId) {
    const activePhasesCountElement = document.getElementById(`activePhasesCount_${scenarioId}`);
    const totalDurationElement = document.getElementById(`totalDuration_${scenarioId}`);
    const averageSavingsRateElement = document.getElementById(`averageSavingsRate_${scenarioId}`);
    const totalContributionsElement = document.getElementById(`totalContributions_${scenarioId}`);
    
    if (!activePhasesCountElement || !totalDurationElement || !averageSavingsRateElement || !totalContributionsElement) {
        return;
    }
    
    const phases = ['phase1', 'phase2', 'phase3'];
    let activePhases = 0;
    let totalDuration = 0;
    let totalContributions = 0;
    let weightedSavingsSum = 0;
    
    phases.forEach(phase => {
        const phaseElement = document.querySelector(`.savings-phase[data-phase="${phase}"][data-scenario="${scenarioId}"]`);
        if (!phaseElement) return;
        
        const isActive = phaseElement.querySelector('.phase-toggle').classList.contains('active');
        
        if (isActive) {
            activePhases++;
            
            try {
                const duration = parseInt(document.querySelector(`.phase-duration[data-phase="${phase}"][data-scenario="${scenarioId}"]`).value) || 0;
                const monthlySavings = parseGermanNumber(document.querySelector(`.phase-amount[data-phase="${phase}"][data-scenario="${scenarioId}"]`).value) || 0;
                const phaseContributions = monthlySavings * 12 * duration;
                
                totalDuration += duration;
                totalContributions += phaseContributions;
                weightedSavingsSum += monthlySavings * duration;
            } catch (error) {
                console.error('Error processing phase data:', error);
            }
        }
    });
    
    const averageSavingsRate = totalDuration > 0 ? weightedSavingsSum / totalDuration : 0;
    
    // Update display
    activePhasesCountElement.textContent = activePhases.toString();
    totalDurationElement.textContent = `${totalDuration} Jahre`;
    averageSavingsRateElement.textContent = formatCurrency(averageSavingsRate);
    totalContributionsElement.textContent = formatCurrency(totalContributions);
}

// ==================== Profile and Status Functions ====================

/**
 * Shows profile selection status message
 */
export function showProfileSelectionStatus(type, message) {
    const statusElement = document.getElementById('profileSelectionStatus');
    if (statusElement) {
        statusElement.className = `profile-status profile-status-${type}`;
        statusElement.textContent = message;
        statusElement.style.display = 'block';
    }
}

/**
 * Hides profile selection status message
 */
export function hideProfileSelectionStatus() {
    const statusElement = document.getElementById('profileSelectionStatus');
    if (statusElement) {
        statusElement.style.display = 'none';
    }
}

/**
 * Shows profile selection status for specific scenario
 */
export function showProfileSelectionStatusForScenario(scenarioId, type, message) {
    const statusElement = document.getElementById(`profileSelectionStatus_${scenarioId}`);
    if (statusElement) {
        statusElement.className = `profile-status profile-status-${type}`;
        statusElement.textContent = message;
        statusElement.style.display = 'block';
    }
}

/**
 * Hides profile selection status for specific scenario
 */
export function hideProfileSelectionStatusForScenario(scenarioId) {
    const statusElement = document.getElementById(`profileSelectionStatus_${scenarioId}`);
    if (statusElement) {
        statusElement.style.display = 'none';
    }
}

/**
 * Shows scenario import status message
 */
export function showScenarioImportStatus(type, message) {
    const statusElement = document.getElementById('scenarioImportStatus');
    if (statusElement) {
        statusElement.className = `import-status import-status-${type}`;
        statusElement.textContent = message;
        statusElement.style.display = 'block';
    }
}

/**
 * Shows scenario import status for specific scenario
 */
export function showScenarioImportStatusForScenario(scenarioId, type, message) {
    const statusElement = document.getElementById(`scenarioImportStatus_${scenarioId}`);
    if (statusElement) {
        statusElement.className = `import-status import-status-${type}`;
        statusElement.textContent = message;
        statusElement.style.display = 'block';
    }
}

// ==================== Modal Management ====================

/**
 * Closes the save profile modal
 */
export function closeSaveProfileModal() {
    const modal = document.getElementById('saveProfileModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Shows load scenario preview
 */
export function showLoadScenarioPreview(scenarioName) {
    const previewElement = document.getElementById('loadScenarioPreview');
    if (previewElement) {
        previewElement.innerHTML = `
            <div class="scenario-preview">
                <h4>Vorschau: ${scenarioName}</h4>
                <p>Szenario wird geladen...</p>
            </div>
        `;
        previewElement.style.display = 'block';
    }
}

// ==================== Utility DOM Functions ====================

/**
 * Updates savings display elements
 */
export function updateSavingsDisplay() {
    // This function would update various savings-related display elements
    // Implementation depends on specific savings display requirements
    const savingsDisplays = document.querySelectorAll('.savings-display');
    savingsDisplays.forEach(display => {
        // Update display logic here
        display.classList.add('updated');
    });
}

// ==================== Export all functions ====================

// Note: Individual functions are already exported above
// This comment serves as a reference for what's available in this module