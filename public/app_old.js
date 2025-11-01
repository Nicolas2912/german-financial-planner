// Chart instances
let chart = null;
let withdrawalChart = null;
let budgetPieChart = null;
let integratedChart = null;
let lifecycleComparisonChart = null;
let accumulationComparisonChart = null;
let withdrawalComparisonChart = null;
let metricsRadarChart = null;
let withdrawalData = [];
let currentPhase = 'accumulation';
let budgetData = {
    income: {},
    expenses: {},
    savings: { amount: 500, mode: 'fixed', percentage: 50 },
    periods: { income: 'monthly', fixed: 'monthly', variable: 'monthly' }
};

// Scenario Management
let scenarios = [
    {
        id: 'A',
        name: 'Szenario A',
        color: '#3498db',
        inputs: {},
        yearlyData: [],
        results: {}
    }
];
// Import state management
import * as state from './js/state.js';

// Scenario colors
const scenarioColors = {
    'A': '#3498db',
    'B': '#27ae60', 
    'C': '#e74c3c',
    'D': '#f39c12'
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Set up event listeners
    setupScenarioListeners();
    setupComparisonScenarioListeners();
    setupWithdrawalListeners();
    setupBudgetListeners();
    setupTaxCalculatorListeners();
    setupChartToggleListeners();

    // Setup scenario import functionality
    setupScenarioImport();
    setupAutoSaveScenarios();

    // Setup scenario saving functionality
    setupAnsparphaseScenarioListeners();
    setupEntnahmephaseScenarioListeners();

    setupPhaseToggle();
    setupGermanNumberInputs();
    setupSavingsModeFunctionality();
    setupStickyScenarioCards();
    // Initial calculation
    recalculateAll();
    calculateBudget();
    calculateTaxes();
    
    // Initialize scenario checkboxes and dropdowns
    updateScenarioCheckboxes();
    updateContributionsScenarioDropdown();
    setupContributionsScenarioSelector();
    updateScenarioCheckboxVisibility();
    
    // Show sync indicator on page load
    setTimeout(() => {
        autoSyncWithdrawalCapital(false);
    }, 500);
});

// Setup sticky behavior for scenario results cards in Ansparphase
function setupStickyScenarioCards() {
    const scenarioResults = document.getElementById('scenarioResults');
    if (!scenarioResults) return;
    
    let isSticky = false;
    let originalTop = 0;
    
    // Function to handle scroll events
    function handleScroll() {
        // Only apply on desktop (768px and up)
        if (window.innerWidth <= 768) {
            scenarioResults.style.transform = '';
            return;
        }
        
        // Only apply when accumulation phase is active
        if (currentPhase !== 'accumulation') {
            scenarioResults.style.transform = '';
            return;
        }
        
        // Check if the scenario results container is visible
        const computedStyle = window.getComputedStyle(scenarioResults);
        if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
            scenarioResults.style.transform = '';
            return;
        }
        
        // Check if there are any scenario result cards
        const cards = scenarioResults.querySelectorAll('.scenario-result-card');
        if (cards.length === 0) {
            scenarioResults.style.transform = '';
            return;
        }
        
        const scrollY = window.scrollY;
        
        // Get the original position if not set or if cards are back to original position
        if (originalTop === 0 || scenarioResults.style.transform === '') {
            // Reset transform to get true original position
            const currentTransform = scenarioResults.style.transform;
            scenarioResults.style.transform = '';
            
            const rect = scenarioResults.getBoundingClientRect();
            originalTop = scrollY + rect.top;
            
            // Restore transform if it was set
            if (currentTransform && scrollY > originalTop) {
                scenarioResults.style.transform = currentTransform;
            }
        }
        
        // Simple: move the cards down with scroll after passing the original position
        if (scrollY > originalTop) {
            let moveDistance = scrollY - originalTop;
            
            // Set a custom boundary that allows cards to move much further down
            // Count the number of scenario cards for dynamic spacing
            const scenarioCards = scenarioResults.querySelectorAll('.scenario-result-card');
            const numberOfScenarios = scenarioCards.length;
            
            // Find the chart section to use as a reference point
            const chartSection = document.getElementById('accumulationChart');
            if (chartSection) {
                const chartRect = chartSection.getBoundingClientRect();
                const cardsRect = scenarioResults.getBoundingClientRect();
                
                // Calculate dynamic spacing based on number of scenarios
                // 1-2 scenarios: can go closer to chart (less buffer)
                // 3-4 scenarios: need more space (current buffer)
                let dynamicSpacing;
                if (numberOfScenarios <= 2) {
                    dynamicSpacing = 500 + numberOfScenarios * 3; // 65px for 1, 80px for 2
                } else {
                    dynamicSpacing = 100 + (numberOfScenarios + 1) * 25; // 200px for 3, 225px for 4
                }
                
                // Allow cards to move until they're close to the chart section
                const maxDistance = chartRect.top - cardsRect.bottom - dynamicSpacing;
                
                // Limit the movement
                if (moveDistance > maxDistance) {
                    moveDistance = Math.max(800, maxDistance + 200);
                }
            }
            
            scenarioResults.style.transform = `translateY(${moveDistance}px)`;
        } else {
            scenarioResults.style.transform = '';
        }
    }
    
    // Function to reset on window resize
    function handleResize() {
        originalTop = 0;
        isSticky = false;
        scenarioResults.classList.remove('sticky');
        // Recalculate on next scroll
        setTimeout(handleScroll, 100);
    }
    
    // Function to reset sticky state (call when phases change)
    function resetStickyState() {
        originalTop = 0;
        isSticky = false;
        scenarioResults.classList.remove('sticky');
    }
    
    // Expose reset function globally so it can be called from phase toggle
    window.resetStickyScenarioCards = resetStickyState;
    
    // Add event listeners
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    
    // Initial check
    setTimeout(handleScroll, 100);
}

function setupChartToggleListeners() {
    // Accumulation phase chart toggle
    const scenarioComparisonBtn = document.getElementById('scenarioComparisonBtn');
    const contributionsGainsBtn = document.getElementById('contributionsGainsBtn');

    if (scenarioComparisonBtn) {
        scenarioComparisonBtn.addEventListener('click', function() {
            // Switch to scenario comparison view
            scenarioComparisonBtn.classList.add('active');
            contributionsGainsBtn.classList.remove('active');
            state.setCurrentChartMode('comparison');
            updateMainChart();
            updateScenarioCheckboxVisibility();
        });
    }

    if (contributionsGainsBtn) {
        contributionsGainsBtn.addEventListener('click', function() {
            // Switch to contributions vs gains view
            contributionsGainsBtn.classList.add('active');
            scenarioComparisonBtn.classList.remove('active');
            state.setCurrentChartMode('contributions');
            updateContributionsGainsChart();
            updateScenarioCheckboxVisibility();
        });
    }

    // Scenario selector listeners
    setupScenarioSelectorListeners();

    // Withdrawal phase chart toggle
    const withdrawalChartBtn = document.getElementById('withdrawalChartBtn');
    const integratedTimelineBtn = document.getElementById('integratedTimelineBtn');
    const withdrawalChartView = document.getElementById('withdrawalChartView');
    const integratedTimelineView = document.getElementById('integratedTimelineView');

    if (withdrawalChartBtn) {
        withdrawalChartBtn.addEventListener('click', function() {
            // Switch to withdrawal chart view
            withdrawalChartBtn.classList.add('active');
            integratedTimelineBtn.classList.remove('active');
            withdrawalChartView.style.display = 'block';
            integratedTimelineView.style.display = 'none';
        });
    }

    if (integratedTimelineBtn) {
        integratedTimelineBtn.addEventListener('click', function() {
            // Switch to integrated timeline view
            integratedTimelineBtn.classList.add('active');
            if (withdrawalChartBtn) withdrawalChartBtn.classList.remove('active');
            if (withdrawalChartView) withdrawalChartView.style.display = 'none';
            integratedTimelineView.style.display = 'block';
            
            // Create the integrated timeline
            createIntegratedTimeline();
        });
    }
}

function setupScenarioListeners() {
    // Set up scenario tabs
    setupScenarioTabs();
    
    // Set up scenario-specific input listeners for initial scenario A
    setupScenarioInputListeners('A');
    
    // Initialize slider values for scenario A
    initializeScenarioSliderValues('A');
    
    // Set up scenario management button listeners
    setupScenarioManagementListeners();
}

function setupScenarioManagementListeners() {
    // Load Preset Button
    const loadPresetBtn = document.getElementById('loadPresetBtn');
    if (loadPresetBtn) {
        loadPresetBtn.addEventListener('click', togglePresetTemplates);
    }
    
    // Save Configuration Button
    const saveConfigBtn = document.getElementById('saveConfigBtn');
    if (saveConfigBtn) {
        saveConfigBtn.addEventListener('click', saveScenarioConfiguration);
    }
    
    // Export Comparison Button
    const exportComparisonBtn = document.getElementById('exportComparisonBtn');
    if (exportComparisonBtn) {
        exportComparisonBtn.addEventListener('click', exportComparisonData);
    }
    
    // Preset template buttons
    document.addEventListener('click', function(e) {
        if (e.target.closest('.preset-btn')) {
            const presetBtn = e.target.closest('.preset-btn');
            const presetType = presetBtn.dataset.preset;
            loadPresetTemplate(presetType);
        }
    });
}

function setupScenarioTabs() {
    // Add scenario button
    document.getElementById('addScenarioBtn').addEventListener('click', addNewScenario);
    
    // Scenario tab switching
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('scenario-tab')) {
            const scenarioId = e.target.dataset.scenario;
            switchToScenario(scenarioId);
        }
    });
}

function updateTeilfreistellungToggleState(scenarioId) {
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

// Comparison scenario version of the Teilfreistellung dependency function
function updateComparisonTeilfreistellungState(scenarioId) {
    const taxToggle = document.querySelector(`[data-scenario="${scenarioId}"] [data-param="accumulation.includeTax"]`);
    const teilfreistellungToggle = document.querySelector(`[data-scenario="${scenarioId}"] [data-param="accumulation.teilfreistellung"]`);
    const teilfreistellungContainer = teilfreistellungToggle ? teilfreistellungToggle.closest('.toggle-container') : null;

    if (taxToggle && teilfreistellungToggle && teilfreistellungContainer) {
        if (taxToggle.classList.contains('active')) {
            console.log(`Comparison tax toggle active for scenario ${scenarioId} - enabling Teilfreistellung`);
            
            // Enable Teilfreistellung toggle
            teilfreistellungToggle.classList.remove('disabled');
            teilfreistellungContainer.classList.remove('disabled');
            teilfreistellungContainer.style.opacity = '';
            teilfreistellungContainer.style.pointerEvents = '';
        } else {
            console.log(`Comparison tax toggle inactive for scenario ${scenarioId} - disabling Teilfreistellung`);
            
            // Disable Teilfreistellung toggle
            teilfreistellungToggle.classList.add('disabled');
            teilfreistellungContainer.classList.add('disabled');
            teilfreistellungContainer.style.opacity = '0.5';
            teilfreistellungContainer.style.pointerEvents = 'none';
            // Also deactivate it when disabled
            teilfreistellungToggle.classList.remove('active');
        }
    } else {
        console.log(`Could not find toggles for scenario ${scenarioId}:`, {
            taxToggle: !!taxToggle,
            teilfreistellungToggle: !!teilfreistellungToggle,
            teilfreistellungContainer: !!teilfreistellungContainer
        });
    }
}

function setupScenarioInputListeners(scenarioId) {
    // Sliders
    const sliders = ['annualReturn', 'inflationRate', 'salaryGrowth', 'duration', 'salaryToSavings'];
    sliders.forEach(sliderId => {
        const fullId = sliderId + '_' + scenarioId;
        const slider = document.getElementById(fullId);
        if (slider) {
            slider.addEventListener('input', function() {
                updateScenarioSliderValue(sliderId, scenarioId);
                debouncedRecalculateAll();
            // Auto-save individual scenario after slider change
            setTimeout(() => saveIndividualAnsparphaseScenario(scenarioId), 500);
            });
        }
    });

    // Input fields with typing detection
    ['monthlySavings', 'initialCapital', 'baseSalary'].forEach(inputId => {
        const fullId = inputId + '_' + scenarioId;
        const input = document.getElementById(fullId);
        if (input) {
            let typingTimeout;
            
            input.addEventListener('input', function() {
                userIsTyping = true;
                
                // Clear existing timeout
                if (typingTimeout) {
                    clearTimeout(typingTimeout);
                }
                
                // Set user as not typing after 1 second of inactivity
                typingTimeout = setTimeout(() => {
                    userIsTyping = false;
                    // Auto-save individual scenario after typing stops
                    saveIndividualAnsparphaseScenario(scenarioId);
                }, 1000);
                
                debouncedRecalculateAll();
            });
            
            // Also detect when user finishes editing (blur event)
            input.addEventListener('blur', function() {
                userIsTyping = false;
                if (typingTimeout) {
                    clearTimeout(typingTimeout);
                }
                // Trigger sync with notification after user finishes editing
                setTimeout(() => {
                    autoSyncWithdrawalCapital(true);
                }, 200);
            });
        }
    });

    // Tax toggle
    const taxToggle = document.getElementById('taxToggle_' + scenarioId);
    if (taxToggle) {
        taxToggle.addEventListener('click', function() {
            this.classList.toggle('active');
            updateTeilfreistellungToggleState(scenarioId);
            debouncedRecalculateAll();
            // Auto-save individual scenario after toggle change
            setTimeout(() => saveIndividualAnsparphaseScenario(scenarioId), 500);
        });
    }

    // ETF type radio buttons
    const etfTypeRadios = document.querySelectorAll(`input[name="etfType-${scenarioId}"]`);
    etfTypeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            debouncedRecalculateAll();
            // Auto-save individual scenario after ETF type change
            setTimeout(() => saveIndividualAnsparphaseScenario(scenarioId), 500);
        });
    });

    // Teilfreistellung toggle
    const teilfreistellungToggle = document.getElementById('teilfreistellungToggle_' + scenarioId);
    if (teilfreistellungToggle) {
        teilfreistellungToggle.addEventListener('click', function() {
            // Only allow toggle if not disabled
            if (!this.classList.contains('disabled')) {
                this.classList.toggle('active');
                debouncedRecalculateAll();
                // Auto-save individual scenario after toggle change
                setTimeout(() => saveIndividualAnsparphaseScenario(scenarioId), 500);
            }
        });
    }

    // Initialize the Teilfreistellung toggle state
    updateTeilfreistellungToggleState(scenarioId);
}

function initializeScenarioSliderValues(scenarioId) {
    const sliders = ['annualReturn', 'inflationRate', 'salaryGrowth', 'duration', 'salaryToSavings'];
    sliders.forEach(sliderId => {
        updateScenarioSliderValue(sliderId, scenarioId);
    });
}

function updateScenarioSliderValue(sliderId, scenarioId) {
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

function debouncedRecalculateAll() {
    if (recalculationTimeout) {
        clearTimeout(recalculationTimeout);
    }
    recalculationTimeout = setTimeout(() => {
        recalculateAll();
    }, 100);
}

function recalculateAll() {
    scenarios.forEach(scenario => {
        runScenario(scenario);
    });
    updateScenarioResults();
    updateMainChart();
    updateScenarioSelector();
    
    // Auto-sync withdrawal capital with active scenario (silent during calculations)
    autoSyncWithdrawalCapital(false);
    
    // Update integrated timeline if it's currently visible in withdrawal phase
    if (currentPhase === 'withdrawal') {
        const integratedTimelineView = document.getElementById('integratedTimelineView');
        if (integratedTimelineView && integratedTimelineView.style.display !== 'none') {
            createIntegratedTimeline();
        }
    }
}

// Setup scenario selector for chart
function setupScenarioSelectorListeners() {
    // Individual scenario checkbox functionality is handled in updateScenarioCheckboxes()
}

function updateScenarioCheckboxes() {
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

function updateContributionsScenarioDropdown() {
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
    
    // Update dropdown color to match currently selected scenario
    const selectedScenario = scenarios.find(s => s.id === selectedContributionsScenario);
    if (selectedScenario) {
        dropdown.style.color = selectedScenario.color;
    }
}

function setupContributionsScenarioSelector() {
    const dropdown = document.getElementById('contributionsScenarioDropdown');
    if (!dropdown) return;
    
    dropdown.addEventListener('change', function() {
        state.setSelectedContributionsScenario(this.value);
        
        // Update dropdown color to match selected scenario
        const selectedScenario = state.scenarios.find(s => s.id === this.value);
        if (selectedScenario) {
            this.style.color = selectedScenario.color;
        }
        
        updateContributionsGainsChart();
    });
    
    // Set initial color
    const initialScenario = scenarios.find(s => s.id === selectedContributionsScenario);
    if (initialScenario) {
        dropdown.style.color = initialScenario.color;
    }
}

// Get the currently active scenario object
function getActiveScenario() {
    return scenarios.find(s => s.id === activeScenario);
}

// Auto-sync withdrawal capital when accumulation results change
function autoSyncWithdrawalCapital(showNotificationFlag = false) {
    if (isSyncing) return; // Prevent recursive calls
    
    const currentActiveScenario = getActiveScenario();
    if (currentActiveScenario && currentActiveScenario.yearlyData && currentActiveScenario.yearlyData.length > 0) {
        const finalCapital = currentActiveScenario.yearlyData[currentActiveScenario.yearlyData.length - 1].capital;
        const retirementCapitalField = document.getElementById('retirementCapital');
        const syncIndicator = document.getElementById('syncIndicator');
        const syncScenarioName = document.getElementById('syncScenarioName');
        
        if (retirementCapitalField) {
            const currentValue = parseGermanNumber(retirementCapitalField.value);
            const newValue = Math.round(finalCapital);
            
            // Update sync indicator (always show current scenario)
            if (syncIndicator && syncScenarioName) {
                syncScenarioName.textContent = currentActiveScenario.name;
                syncIndicator.style.display = 'block';
            }
            
            // Only update if the value has actually changed significantly
            if (Math.abs(currentValue - newValue) > 100 && Math.abs(lastSyncValue - newValue) > 100) {
                isSyncing = true; // Set flag to prevent recursive calls
                
                retirementCapitalField.value = newValue.toLocaleString('de-DE');
                lastSyncValue = newValue; // Remember this value
                
                // Only show notification if explicitly requested (not during typing)
                if (showNotificationFlag && !userIsTyping) {
                    // Add animation to sync icon
                    const syncIcon = document.getElementById('syncIcon');
                    if (syncIcon) {
                        syncIcon.style.transform = 'rotate(360deg)';
                        setTimeout(() => {
                            syncIcon.style.transform = 'rotate(0deg)';
                        }, 500);
                    }
                    
                    showNotification(
                        '🔄 Automatische Synchronisation', 
                        `Entnahmekapital wurde automatisch auf ${newValue.toLocaleString('de-DE')} € aktualisiert (${currentActiveScenario.name})`, 
                        'info'
                    );
                }
                
                // Auto-recalculate withdrawal if user is on withdrawal phase
                if (currentPhase === 'withdrawal') {
                    calculateWithdrawal();
                }
                
                // Reset flag after a short delay
                setTimeout(() => {
                    isSyncing = false;
                }, 100);
            }
        }
    } else {
        // Hide sync indicator if no valid scenario data
        const syncIndicator = document.getElementById('syncIndicator');
        if (syncIndicator) {
            syncIndicator.style.display = 'none';
        }
    }
}

// Chart instances
let chart = null;
let withdrawalChart = null;
let budgetPieChart = null;
let integratedChart = null;
let lifecycleComparisonChart = null;
let accumulationComparisonChart = null;
let withdrawalComparisonChart = null;
let metricsRadarChart = null;
let withdrawalData = [];
let currentPhase = 'accumulation';
let budgetData = {
    income: {},
    expenses: {},
    savings: { amount: 500, mode: 'fixed', percentage: 50 },
    periods: { income: 'monthly', fixed: 'monthly', variable: 'monthly' }
};

// Scenario Management
let scenarios = [
    {
        id: 'A',
        name: 'Szenario A',
        color: '#3498db',
        inputs: {},
        yearlyData: [],
        results: {}
    }
];
// Import state management
import * as state from './js/state.js';

// Scenario colors
const scenarioColors = {
    'A': '#3498db',
    'B': '#27ae60', 
    'C': '#e74c3c',
    'D': '#f39c12'
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Set up event listeners
    setupScenarioListeners();
    setupComparisonScenarioListeners();
    setupWithdrawalListeners();
    setupBudgetListeners();
    setupTaxCalculatorListeners();
    setupChartToggleListeners();

    // Setup scenario import functionality
    setupScenarioImport();
    setupAutoSaveScenarios();

    // Setup scenario saving functionality
    setupAnsparphaseScenarioListeners();
    setupEntnahmephaseScenarioListeners();

    setupPhaseToggle();
    setupGermanNumberInputs();
    setupSavingsModeFunctionality();
    setupStickyScenarioCards();
    // Initial calculation
    recalculateAll();
    calculateBudget();
    calculateTaxes();
    
    // Initialize scenario checkboxes and dropdowns
    updateScenarioCheckboxes();
    updateContributionsScenarioDropdown();
    setupContributionsScenarioSelector();
    updateScenarioCheckboxVisibility();
    
    // Show sync indicator on page load
    setTimeout(() => {
        autoSyncWithdrawalCapital(false);
    }, 500);
});

// Setup sticky behavior for scenario results cards in Ansparphase
function setupStickyScenarioCards() {
    const scenarioResults = document.getElementById('scenarioResults');
    if (!scenarioResults) return;
    
    let isSticky = false;
    let originalTop = 0;
    
    // Function to handle scroll events
    function handleScroll() {
        // Only apply on desktop (768px and up)
        if (window.innerWidth <= 768) {
            scenarioResults.style.transform = '';
            return;
        }
        
        // Only apply when accumulation phase is active
        if (currentPhase !== 'accumulation') {
            scenarioResults.style.transform = '';
            return;
        }
        
        // Check if the scenario results container is visible
        const computedStyle = window.getComputedStyle(scenarioResults);
        if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
            scenarioResults.style.transform = '';
            return;
        }
        
        // Check if there are any scenario result cards
        const cards = scenarioResults.querySelectorAll('.scenario-result-card');
        if (cards.length === 0) {
            scenarioResults.style.transform = '';
            return;
        }
        
        const scrollY = window.scrollY;
        
        // Get the original position if not set or if cards are back to original position
        if (originalTop === 0 || scenarioResults.style.transform === '') {
            // Reset transform to get true original position
            const currentTransform = scenarioResults.style.transform;
            scenarioResults.style.transform = '';
            
            const rect = scenarioResults.getBoundingClientRect();
            originalTop = scrollY + rect.top;
            
            // Restore transform if it was set
            if (currentTransform && scrollY > originalTop) {
                scenarioResults.style.transform = currentTransform;
            }
        }
        
        // Simple: move the cards down with scroll after passing the original position
        if (scrollY > originalTop) {
            let moveDistance = scrollY - originalTop;
            
            // Set a custom boundary that allows cards to move much further down
            // Count the number of scenario cards for dynamic spacing
            const scenarioCards = scenarioResults.querySelectorAll('.scenario-result-card');
            const numberOfScenarios = scenarioCards.length;
            
            // Find the chart section to use as a reference point
            const chartSection = document.getElementById('accumulationChart');
            if (chartSection) {
                const chartRect = chartSection.getBoundingClientRect();
                const cardsRect = scenarioResults.getBoundingClientRect();
                
                // Calculate dynamic spacing based on number of scenarios
                // 1-2 scenarios: can go closer to chart (less buffer)
                // 3-4 scenarios: need more space (current buffer)
                let dynamicSpacing;
                if (numberOfScenarios <= 2) {
                    dynamicSpacing = 500 + numberOfScenarios * 3; // 65px for 1, 80px for 2
                } else {
                    dynamicSpacing = 100 + (numberOfScenarios + 1) * 25; // 200px for 3, 225px for 4
                }
                
                // Allow cards to move until they're close to the chart section
                const maxDistance = chartRect.top - cardsRect.bottom - dynamicSpacing;
                
                // Limit the movement
                if (moveDistance > maxDistance) {
                    moveDistance = Math.max(800, maxDistance + 200);
                }
            }
            
            scenarioResults.style.transform = `translateY(${moveDistance}px)`;
        } else {
            scenarioResults.style.transform = '';
        }
    }
    
    // Function to reset on window resize
    function handleResize() {
        originalTop = 0;
        isSticky = false;
        scenarioResults.classList.remove('sticky');
        // Recalculate on next scroll
        setTimeout(handleScroll, 100);
    }
    
    // Function to reset sticky state (call when phases change)
    function resetStickyState() {
        originalTop = 0;
        isSticky = false;
        scenarioResults.classList.remove('sticky');
    }
    
    // Expose reset function globally so it can be called from phase toggle
    window.resetStickyScenarioCards = resetStickyState;
    
    // Add event listeners
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    
    // Initial check
    setTimeout(handleScroll, 100);
}

function setupChartToggleListeners() {
    // Accumulation phase chart toggle
    const scenarioComparisonBtn = document.getElementById('scenarioComparisonBtn');
    const contributionsGainsBtn = document.getElementById('contributionsGainsBtn');

    if (scenarioComparisonBtn) {
        scenarioComparisonBtn.addEventListener('click', function() {
            // Switch to scenario comparison view
            scenarioComparisonBtn.classList.add('active');
            contributionsGainsBtn.classList.remove('active');
            state.setCurrentChartMode('comparison');
            updateMainChart();
            updateScenarioCheckboxVisibility();
        });
    }

    if (contributionsGainsBtn) {
        contributionsGainsBtn.addEventListener('click', function() {
            // Switch to contributions vs gains view
            contributionsGainsBtn.classList.add('active');
            scenarioComparisonBtn.classList.remove('active');
            state.setCurrentChartMode('contributions');
            updateContributionsGainsChart();
            updateScenarioCheckboxVisibility();
        });
    }

    // Scenario selector listeners
    setupScenarioSelectorListeners();

    // Withdrawal phase chart toggle
    const withdrawalChartBtn = document.getElementById('withdrawalChartBtn');
    const integratedTimelineBtn = document.getElementById('integratedTimelineBtn');
    const withdrawalChartView = document.getElementById('withdrawalChartView');
    const integratedTimelineView = document.getElementById('integratedTimelineView');

    if (withdrawalChartBtn) {
        withdrawalChartBtn.addEventListener('click', function() {
            // Switch to withdrawal chart view
            withdrawalChartBtn.classList.add('active');
            integratedTimelineBtn.classList.remove('active');
            withdrawalChartView.style.display = 'block';
            integratedTimelineView.style.display = 'none';
        });
    }

    if (integratedTimelineBtn) {
        integratedTimelineBtn.addEventListener('click', function() {
            // Switch to integrated timeline view
            integratedTimelineBtn.classList.add('active');
            if (withdrawalChartBtn) withdrawalChartBtn.classList.remove('active');
            if (withdrawalChartView) withdrawalChartView.style.display = 'none';
            integratedTimelineView.style.display = 'block';
            
            // Create the integrated timeline
            createIntegratedTimeline();
        });
    }
}

function setupScenarioListeners() {
    // Set up scenario tabs
    setupScenarioTabs();
    
    // Set up scenario-specific input listeners for initial scenario A
    setupScenarioInputListeners('A');
    
    // Initialize slider values for scenario A
    initializeScenarioSliderValues('A');
    
    // Set up scenario management button listeners
    setupScenarioManagementListeners();
}

function setupScenarioManagementListeners() {
    // Load Preset Button
    const loadPresetBtn = document.getElementById('loadPresetBtn');
    if (loadPresetBtn) {
        loadPresetBtn.addEventListener('click', togglePresetTemplates);
    }
    
    // Save Configuration Button
    const saveConfigBtn = document.getElementById('saveConfigBtn');
    if (saveConfigBtn) {
        saveConfigBtn.addEventListener('click', saveScenarioConfiguration);
    }
    
    // Export Comparison Button
    const exportComparisonBtn = document.getElementById('exportComparisonBtn');
    if (exportComparisonBtn) {
        exportComparisonBtn.addEventListener('click', exportComparisonData);
    }
    
    // Preset template buttons
    document.addEventListener('click', function(e) {
        if (e.target.closest('.preset-btn')) {
            const presetBtn = e.target.closest('.preset-btn');
            const presetType = presetBtn.dataset.preset;
            loadPresetTemplate(presetType);
        }
    });
}

function setupScenarioTabs() {
    // Add scenario button
    document.getElementById('addScenarioBtn').addEventListener('click', addNewScenario);
    
    // Scenario tab switching
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('scenario-tab')) {
            const scenarioId = e.target.dataset.scenario;
            switchToScenario(scenarioId);
        }
    });
}

function updateTeilfreistellungToggleState(scenarioId) {
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

// Comparison scenario version of the Teilfreistellung dependency function
function updateComparisonTeilfreistellungState(scenarioId) {
    const taxToggle = document.querySelector(`[data-scenario="${scenarioId}"] [data-param="accumulation.includeTax"]`);
    const teilfreistellungToggle = document.querySelector(`[data-scenario="${scenarioId}"] [data-param="accumulation.teilfreistellung"]`);
    const teilfreistellungContainer = teilfreistellungToggle ? teilfreistellungToggle.closest('.toggle-container') : null;

    if (taxToggle && teilfreistellungToggle && teilfreistellungContainer) {
        if (taxToggle.classList.contains('active')) {
            console.log(`Comparison tax toggle active for scenario ${scenarioId} - enabling Teilfreistellung`);
            
            // Enable Teilfreistellung toggle
            teilfreistellungToggle.classList.remove('disabled');
            teilfreistellungContainer.classList.remove('disabled');
            teilfreistellungContainer.style.opacity = '';
            teilfreistellungContainer.style.pointerEvents = '';
        } else {
            console.log(`Comparison tax toggle inactive for scenario ${scenarioId} - disabling Teilfreistellung`);
            
            // Disable Teilfreistellung toggle
            teilfreistellungToggle.classList.add('disabled');
            teilfreistellungContainer.classList.add('disabled');
            teilfreistellungContainer.style.opacity = '0.5';
            teilfreistellungContainer.style.pointerEvents = 'none';
            // Also deactivate it when disabled
            teilfreistellungToggle.classList.remove('active');
        }
    } else {
        console.log(`Could not find toggles for scenario ${scenarioId}:`, {
            taxToggle: !!taxToggle,
            teilfreistellungToggle: !!teilfreistellungToggle,
            teilfreistellungContainer: !!teilfreistellungContainer
        });
    }
}

function setupScenarioInputListeners(scenarioId) {
    // Sliders
    const sliders = ['annualReturn', 'inflationRate', 'salaryGrowth', 'duration', 'salaryToSavings'];
    sliders.forEach(sliderId => {
        const fullId = sliderId + '_' + scenarioId;
        const slider = document.getElementById(fullId);
        if (slider) {
            slider.addEventListener('input', function() {
                updateScenarioSliderValue(sliderId, scenarioId);
                debouncedRecalculateAll();
            // Auto-save individual scenario after slider change
            setTimeout(() => saveIndividualAnsparphaseScenario(scenarioId), 500);
            });
        }
    });

    // Input fields with typing detection
    ['monthlySavings', 'initialCapital', 'baseSalary'].forEach(inputId => {
        const fullId = inputId + '_' + scenarioId;
        const input = document.getElementById(fullId);
        if (input) {
            let typingTimeout;
            
            input.addEventListener('input', function() {
                userIsTyping = true;
                
                // Clear existing timeout
                if (typingTimeout) {
                    clearTimeout(typingTimeout);
                }
                
                // Set user as not typing after 1 second of inactivity
                typingTimeout = setTimeout(() => {
                    userIsTyping = false;
                    // Auto-save individual scenario after typing stops
                    saveIndividualAnsparphaseScenario(scenarioId);
                }, 1000);
                
                debouncedRecalculateAll();
            });
            
            // Also detect when user finishes editing (blur event)
            input.addEventListener('blur', function() {
                userIsTyping = false;
                if (typingTimeout) {
                    clearTimeout(typingTimeout);
                }
                // Trigger sync with notification after user finishes editing
                setTimeout(() => {
                    autoSyncWithdrawalCapital(true);
                }, 200);
            });
        }
    });

    // Tax toggle
    const taxToggle = document.getElementById('taxToggle_' + scenarioId);
    if (taxToggle) {
        taxToggle.addEventListener('click', function() {
            this.classList.toggle('active');
            updateTeilfreistellungToggleState(scenarioId);
            debouncedRecalculateAll();
            // Auto-save individual scenario after toggle change
            setTimeout(() => saveIndividualAnsparphaseScenario(scenarioId), 500);
        });
    }

    // ETF type radio buttons
    const etfTypeRadios = document.querySelectorAll(`input[name="etfType-${scenarioId}"]`);
    etfTypeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            debouncedRecalculateAll();
            // Auto-save individual scenario after ETF type change
            setTimeout(() => saveIndividualAnsparphaseScenario(scenarioId), 500);
        });
    });

    // Teilfreistellung toggle
    const teilfreistellungToggle = document.getElementById('teilfreistellungToggle_' + scenarioId);
    if (teilfreistellungToggle) {
        teilfreistellungToggle.addEventListener('click', function() {
            // Only allow toggle if not disabled
            if (!this.classList.contains('disabled')) {
                this.classList.toggle('active');
                debouncedRecalculateAll();
                // Auto-save individual scenario after toggle change
                setTimeout(() => saveIndividualAnsparphaseScenario(scenarioId), 500);
            }
        });
    }

    // Initialize the Teilfreistellung toggle state
    updateTeilfreistellungToggleState(scenarioId);
}

function initializeScenarioSliderValues(scenarioId) {
    const sliders = ['annualReturn', 'inflationRate', 'salaryGrowth', 'duration', 'salaryToSavings'];
    sliders.forEach(sliderId => {
        updateScenarioSliderValue(sliderId, scenarioId);
    });
}

function updateScenarioSliderValue(sliderId, scenarioId) {
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

function debouncedRecalculateAll() {
    if (recalculationTimeout) {
        clearTimeout(recalculationTimeout);
    }
    recalculationTimeout = setTimeout(() => {
        recalculateAll();
    }, 100);
}

function recalculateAll() {
    scenarios.forEach(scenario => {
        runScenario(scenario);
    });
    updateScenarioResults();
    updateMainChart();
    updateScenarioSelector();
    
    // Auto-sync withdrawal capital with active scenario (silent during calculations)
    autoSyncWithdrawalCapital(false);
    
    // Update integrated timeline if it's currently visible in withdrawal phase
    if (currentPhase === 'withdrawal') {
        const integratedTimelineView = document.getElementById('integratedTimelineView');
        if (integratedTimelineView && integratedTimelineView.style.display !== 'none') {
            createIntegratedTimeline();
        }
    }
}

// Setup scenario selector for chart
function setupScenarioSelectorListeners() {
    // Individual scenario checkbox functionality is handled in updateScenarioCheckboxes()
}

function updateScenarioCheckboxes() {
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

function updateContributionsScenarioDropdown() {
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
    
    // Update dropdown color to match currently selected scenario
    const selectedScenario = scenarios.find(s => s.id === selectedContributionsScenario);
    if (selectedScenario) {
        dropdown.style.color = selectedScenario.color;
    }
}

function setupContributionsScenarioSelector() {
    const dropdown = document.getElementById('contributionsScenarioDropdown');
    if (!dropdown) return;
    
    dropdown.addEventListener('change', function() {
        state.setSelectedContributionsScenario(this.value);
        
        // Update dropdown color to match selected scenario
        const selectedScenario = state.scenarios.find(s => s.id === this.value);
        if (selectedScenario) {
            this.style.color = selectedScenario.color;
        }
        
        updateContributionsGainsChart();
    });
    
    // Set initial color
    const initialScenario = scenarios.find(s => s.id === selectedContributionsScenario);
    if (initialScenario) {
        dropdown.style.color = initialScenario.color;
    }
}

// Get the currently active scenario object
function getActiveScenario() {
    return scenarios.find(s => s.id === activeScenario);
}

// Auto-sync withdrawal capital when accumulation results change
function autoSyncWithdrawalCapital(showNotificationFlag = false) {
    if (isSyncing) return; // Prevent recursive calls
    
    const currentActiveScenario = getActiveScenario();
    if (currentActiveScenario && currentActiveScenario.yearlyData && currentActiveScenario.yearlyData.length > 0) {
        const finalCapital = currentActiveScenario.yearlyData[currentActiveScenario.yearlyData.length - 1].capital;
        const retirementCapitalField = document.getElementById('retirementCapital');
        const syncIndicator = document.getElementById('syncIndicator');
        const syncScenarioName = document.getElementById('syncScenarioName');
        
        if (retirementCapitalField) {
            const currentValue = parseGermanNumber(retirementCapitalField.value);
            const newValue = Math.round(finalCapital);
            
            // Update sync indicator (always show current scenario)
            if (syncIndicator && syncScenarioName) {
                syncScenarioName.textContent = currentActiveScenario.name;
                syncIndicator.style.display = 'block';
            }
            
            // Only update if the value has actually changed significantly
            if (Math.abs(currentValue - newValue) > 100 && Math.abs(lastSyncValue - newValue) > 100) {
                isSyncing = true; // Set flag to prevent recursive calls
                
                retirementCapitalField.value = newValue.toLocaleString('de-DE');
                lastSyncValue = newValue; // Remember this value
                
                // Only show notification if explicitly requested (not during typing)
                if (showNotificationFlag && !userIsTyping) {
                    // Add animation to sync icon
                    const syncIcon = document.getElementById('syncIcon');
                    if (syncIcon) {
                        syncIcon.style.transform = 'rotate(360deg)';
                        setTimeout(() => {
                            syncIcon.style.transform = 'rotate(0deg)';
                        }, 500);
                    }
                    
                    showNotification(
                        '🔄 Automatische Synchronisation', 
                        `Entnahmekapital wurde automatisch auf ${newValue.toLocaleString('de-DE')} € aktualisiert (${currentActiveScenario.name})`, 
                        'info'
                    );
                }
                
                // Auto-recalculate withdrawal if user is on withdrawal phase
                if (currentPhase === 'withdrawal') {
                    calculateWithdrawal();
                }
                
                // Reset flag after a short delay
                setTimeout(() => {
                    isSyncing = false;
                }, 100);
            }
        }
    } else {
        // Hide sync indicator if no valid scenario data
        const syncIndicator = document.getElementById('syncIndicator');
        if (syncIndicator) {
            syncIndicator.style.display = 'none';
        }
    }
}

function runScenario(scenario) {
    const scenarioId = scenario.id;
    
    // Determine savings mode
    const savingsMode = getSavingsMode(scenarioId);
    
    // Get common input values for this scenario
    const initialCapital = parseGermanNumber(getScenarioValue('initialCapital', scenarioId));
    const baseSalary = parseGermanNumber(getScenarioValue('baseSalary', scenarioId));
    const annualReturn = parseFloat(getScenarioValue('annualReturn', scenarioId)) / 100;
    const inflationRate = parseFloat(getScenarioValue('inflationRate', scenarioId)) / 100;
    const salaryGrowth = parseFloat(getScenarioValue('salaryGrowth', scenarioId)) / 100;
    const salaryToSavings = parseFloat(getScenarioValue('salaryToSavings', scenarioId)) / 100;
    const includeTax = getScenarioToggleValue('taxToggle', scenarioId);

    // Get Teilfreistellung and ETF type for main scenarios
    const teilfreistellung = getScenarioToggleValue('teilfreistellungToggle', scenarioId);
    const etfType = getScenarioETFType(scenarioId);

    let results;
    let monthlySavings = 0;
    let duration = 0;

    if (savingsMode === 'multi-phase') {
        // Multi-phase calculation
        const phases = getMultiPhaseData(scenarioId);
        
        if (phases.length > 0) {
            // Calculate duration from phases
            duration = Math.max(...phases.map(phase => phase.endYear));
            
            // Calculate average monthly savings for backward compatibility
            let totalContributions = 0;
            let totalMonths = 0;
            phases.forEach(phase => {
                const phaseDuration = phase.endYear - phase.startYear + 1;
                const phaseMonths = phaseDuration * 12;
                totalContributions += phaseMonths * phase.monthlySavingsRate;
                totalMonths += phaseMonths;
            });
            monthlySavings = totalMonths > 0 ? totalContributions / totalMonths : 0;
            
            // Use multi-phase calculation
            results = calculateMultiPhaseWealthDevelopment(
                phases, initialCapital, annualReturn, inflationRate, 
                salaryGrowth, salaryToSavings, includeTax, baseSalary,
                teilfreistellung, etfType
            );
        } else {
            // No active phases, use defaults
            monthlySavings = 0;
            duration = 25;
            results = calculateWealthDevelopment(
                0, initialCapital, annualReturn, inflationRate, 
                salaryGrowth, duration, salaryToSavings, includeTax, baseSalary,
                teilfreistellung, etfType
            );
        }
    } else {
        // Simple single-rate calculation
        monthlySavings = parseGermanNumber(getScenarioValue('monthlySavings', scenarioId));
        duration = parseInt(getScenarioValue('duration', scenarioId));
        
        results = calculateWealthDevelopment(
            monthlySavings, initialCapital, annualReturn, inflationRate, 
            salaryGrowth, duration, salaryToSavings, includeTax, baseSalary,
            teilfreistellung, etfType
        );
    }

    // Store inputs in scenario object
    scenario.inputs = {
        monthlySavings,
        initialCapital,
        baseSalary,
        annualReturn,
        inflationRate,
        salaryGrowth,
        duration,
        salaryToSavings,
        includeTax,
        savingsMode,
        phases: savingsMode === 'multi-phase' ? getMultiPhaseData(scenarioId) : null
    };
    
    // Also store convenient aliases for withdrawal phase calculations
    scenario.monthlyContribution = monthlySavings;
    scenario.duration = duration;

    // Store results
    scenario.yearlyData = results.yearlyData;
    scenario.results = {
        finalNominal: results.finalNominal,
        finalReal: results.finalReal,
        totalInvested: results.totalInvested,
        totalReturn: results.totalReturn,
        totalTaxesPaid: results.totalTaxesPaid
    };

    // Update salary increase analysis for this scenario
    updateScenarioSalaryAnalysis(scenarioId, baseSalary, salaryGrowth);
}

function getScenarioValue(inputId, scenarioId) {
    const element = document.getElementById(inputId + '_' + scenarioId);
    return element ? element.value : '0';
}

function getScenarioToggleValue(toggleId, scenarioId) {
    const element = document.getElementById(toggleId + '_' + scenarioId);
    return element ? element.classList.contains('active') : false;
}

function addNewScenario() {
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

function createNewScenarioWithoutSwitching() {
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
    
    // Set up savings mode functionality for the new scenario
    setupSavingsModeForScenario(newScenarioId);
    
    // DON'T switch to the new scenario (this is the key difference)
    
    // Auto-select new scenario for chart display
    selectedScenariosForChart.add(newScenarioId);
    // Update scenario checkboxes and dropdown
    updateScenarioCheckboxes();
    updateContributionsScenarioDropdown();
    // Auto-save the new scenario
    setTimeout(() => saveIndividualAnsparphaseScenario(newScenarioId), 2000);
    
    return newScenario;
}

function createScenarioTab(scenario) {
    const tabsContainer = document.getElementById('scenarioTabs');
    const addBtn = document.getElementById('addScenarioBtn');
    
    const tab = document.createElement('button');
    tab.className = 'scenario-tab';
    tab.dataset.scenario = scenario.id;
    tab.innerHTML = `📈 ${scenario.name}`;
    
    // Insert before the add button
    tabsContainer.insertBefore(tab, addBtn);
}

function switchToScenario(scenarioId) {
    // Update active scenario
    activeScenario = scenarioId;
    
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

// Centralized function for displaying improved chart error messages
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

function createScenarioPanel(scenario) {
    const panelsContainer = document.getElementById('scenarioPanels');
    
    const panel = document.createElement('div');
    panel.className = 'scenario-panel';
    panel.dataset.scenario = scenario.id;
    
    // Copy values from scenario A as default
    const baseScenario = scenarios[0];
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
                <button class="scenario-action-btn" onclick="renameScenario('${scenario.id}')" title="Szenario umbenennen">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Umbenennen
                </button>
                ${scenario.id !== 'A' ? `<button class="scenario-action-btn danger" onclick="removeScenario('${scenario.id}')" title="Szenario löschen">
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
                                <span class="phase-icon">📈</span>
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
                        <h4>📊 Sparplan-Übersicht</h4>
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

        <div class="toggle-container">
            <label>Deutsche Abgeltungssteuer einbeziehen (25% mit Vorabpauschale)</label>
            <div class="toggle scenario-toggle" id="taxToggle_${scenario.id}" data-scenario="${scenario.id}"></div>
        </div>

        <!-- ETF Type Selection -->
        <div class="input-group" style="margin-top: 20px; margin-bottom: 25px;">
            <label style="margin-bottom: 12px; display: block; font-weight: 600;">ETF-Typ für Steuerberechnung</label>
            <div class="radio-group" style="margin-top: 10px;">
                <label class="radio-option">
                    <input type="radio" name="etfType-${scenario.id}" value="thesaurierend" checked>
                    <span class="radio-custom"></span>
                    Thesaurierend (Vorabpauschale)
                </label>
                <label class="radio-option">
                    <input type="radio" name="etfType-${scenario.id}" value="ausschuettend">
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
    
    // Set up event listeners for this new scenario
    setupScenarioInputListeners(scenario.id);
    initializeScenarioSliderValues(scenario.id);
    
    // Trigger initial calculation
    debouncedRecalculateAll();
}

function updateScenarioResults() {
    const resultsContainer = document.getElementById('scenarioResults');
    resultsContainer.innerHTML = '';

    scenarios.forEach(scenario => {
        if (!scenario.results || !scenario.results.finalNominal) return;

        const resultCard = document.createElement('div');
        resultCard.className = 'scenario-result-card';
        resultCard.dataset.scenario = scenario.id;
        resultCard.style.setProperty('--scenario-color', scenario.color);
        
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

function updateMainChart() {
    // Update chart based on current mode
    if (currentChartMode === 'comparison') {
        updateComparisonChart();
    } else if (currentChartMode === 'contributions') {
        updateContributionsGainsChart();
    }
}

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

function calculateWealthDevelopment(monthlySavings, initialCapital, annualReturn, inflationRate, salaryGrowth, duration, salaryToSavings, includeTax, baseSalary = 60000, teilfreistellung = false, etfType = 'thesaurierend') {
    const monthlyReturn = annualReturn / 12;
    
    let capital = initialCapital;
    let currentMonthlySavings = monthlySavings;
    let currentSalary = baseSalary;
    let totalInvested = initialCapital;
    let cumulativeTaxesPaid = 0;
    
    const yearlyData = [{
        year: 0,
        capital: capital,
        realCapital: capital,
        totalInvested: totalInvested,
        monthlySavings: currentMonthlySavings,
        yearlySalary: currentSalary,
        netSalary: calculateGermanNetSalary(currentSalary),
        taxesPaid: 0,
        cumulativeTaxesPaid: 0
    }];

    for (let year = 1; year <= duration; year++) {
        const startOfYearCapital = capital;
        let yearlyTaxesPaid = 0;
        
        for (let month = 1; month <= 12; month++) {
            // Apply monthly return (no tax applied monthly)
            const monthlyGain = capital * monthlyReturn;
            capital += monthlyGain;
            
            // Add monthly savings
            capital += currentMonthlySavings;
            totalInvested += currentMonthlySavings;
        }
        
        // Apply German ETF taxes annually (more realistic)
        if (includeTax) {
            const annualTax = calculateGermanETFTax(startOfYearCapital, capital, annualReturn, year, teilfreistellung, etfType);
            capital -= annualTax;
            yearlyTaxesPaid = annualTax;
            cumulativeTaxesPaid += annualTax;
        }
        
        // Annual salary increase affects savings rate (realistic calculation with progressive taxation)
        if (year < duration) {
            // Calculate previous net salary
            const previousNetSalary = calculateGermanNetSalary(currentSalary);
            
            // Calculate new gross salary
            const annualSalaryIncrease = currentSalary * salaryGrowth;
            currentSalary += annualSalaryIncrease;
            
            // Calculate new net salary with progressive taxation
            const newNetSalary = calculateGermanNetSalary(currentSalary);
            
            // Calculate actual net increase (accounts for higher tax rates)
            const netSalaryIncrease = newNetSalary - previousNetSalary;
            
            // Apply percentage of NET salary increase to monthly savings
            const monthlySalaryIncrease = (netSalaryIncrease / 12) * salaryToSavings;
            currentMonthlySavings += monthlySalaryIncrease;
        }
        
        // Calculate real value (inflation-adjusted)
        const realCapital = capital / Math.pow(1 + inflationRate, year);
        
        yearlyData.push({
            year: year,
            capital: capital,
            realCapital: realCapital,
            totalInvested: totalInvested,
            monthlySavings: currentMonthlySavings,
            yearlySalary: currentSalary,
            netSalary: calculateGermanNetSalary(currentSalary),
            taxesPaid: yearlyTaxesPaid,
            cumulativeTaxesPaid: cumulativeTaxesPaid
        });
    }

    const finalNominal = capital;
    const finalReal = capital / Math.pow(1 + inflationRate, duration);
    const totalReturn = finalNominal - totalInvested;

    return {
        finalNominal,
        finalReal,
        totalInvested,
        totalReturn,
        totalTaxesPaid: cumulativeTaxesPaid,
        yearlyData
    };
}

// German ETF Tax Calculator (Abgeltungssteuer with Vorabpauschale)
// Global variable to track used tax-free allowance
let usedSparerpauschbetrag = 0;

function calculateGermanETFTax(startCapital, endCapital, annualReturn, year, teilfreistellung = false, etfType = 'thesaurierend') {
    // German tax constants for 2025
    const ABGELTUNGSSTEUER_RATE = 0.25; // 25% Abgeltungssteuer
    const SPARERPAUSCHBETRAG = 1000; // Annual tax-free allowance
    const TEILFREISTELLUNG_EQUITY = 0.30; // 30% partial exemption for equity ETFs
    const BASISZINS = 0.0253; // Base interest rate for Vorabpauschale (2.53% for 2025)
    
    // Reset allowance tracking at the beginning of calculation
    if (year === 1) {
        usedSparerpauschbetrag = 0;
    }
    
    // Use the passed parameters instead of DOM lookup
    const teilfreistellungRate = teilfreistellung ? TEILFREISTELLUNG_EQUITY : 0;
    
    let taxableAmount = 0;
    
    if (etfType === 'thesaurierend') {
        // For accumulating ETFs: Calculate Vorabpauschale according to German law
        // Basisertrag = Fondswert am Jahresanfang × Basiszins × 70%
        const basisertrag = startCapital * BASISZINS * 0.7;
        const capitalGains = Math.max(0, endCapital - startCapital);
        
        // Vorabpauschale = min(Basisertrag, Wertsteigerung)
        // Only applies if there are capital gains
        let vorabpauschale = 0;
        if (capitalGains > 0) {
            vorabpauschale = Math.min(basisertrag, capitalGains);
        }
        
        // Apply partial exemption (Teilfreistellung) - configurable tax-free rate for equity ETFs
        taxableAmount = vorabpauschale * (1 - teilfreistellungRate);
        
        // Debug logging
        console.log(`Year ${year}: Start Capital: €${startCapital.toFixed(2)}, End Capital: €${endCapital.toFixed(2)}`);
        console.log(`Basisertrag (${BASISZINS * 100}% * 70%): €${basisertrag.toFixed(2)}`);
        console.log(`Capital Gains: €${capitalGains.toFixed(2)}`);
        console.log(`Vorabpauschale: €${vorabpauschale.toFixed(2)}`);
        console.log(`Teilfreistellung Rate: ${teilfreistellungRate * 100}%`);
        console.log(`Taxable after Teilfreistellung: €${taxableAmount.toFixed(2)}`);
    } else {
        // For distributing ETFs: Tax on distributions (simplified as portion of gains)
        const estimatedDistribution = (endCapital - startCapital) * 0.02; // Assume 2% distribution yield
        taxableAmount = Math.max(0, estimatedDistribution) * (1 - teilfreistellungRate);
        
        console.log(`Year ${year}: Distributing ETF - Estimated Distribution: €${estimatedDistribution.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        console.log(`Teilfreistellung Rate: ${teilfreistellungRate * 100}%`);
        console.log(`Taxable after Teilfreistellung: €${taxableAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    }
    
    // Apply Sparerpauschbetrag (tax-free allowance) - annual allowance
    const remainingAllowance = Math.max(0, SPARERPAUSCHBETRAG - usedSparerpauschbetrag);
    const allowanceUsedThisYear = Math.min(remainingAllowance, taxableAmount);
    usedSparerpauschbetrag += allowanceUsedThisYear;
    
    const taxableAfterAllowance = Math.max(0, taxableAmount - allowanceUsedThisYear);
    
    // Calculate final tax
    const tax = taxableAfterAllowance * ABGELTUNGSSTEUER_RATE;
    
    console.log(`Remaining Allowance: €${remainingAllowance.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`Allowance Used This Year: €${allowanceUsedThisYear.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`Taxable After Allowance: €${taxableAfterAllowance.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`Final Tax (${ABGELTUNGSSTEUER_RATE * 100}%): €${tax.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log('---');
    
    return tax;
}

// German Progressive Tax Calculator for 2025 (based on official data)
function calculateGermanNetSalary(grossSalary, taxClass = 1, children = 0, age = 30, churchTax = false, publicHealthInsurance = true, additionalHealthRate = 2.5) {
    // 2025 tax brackets (official data from web sources)
    const basicAllowance = 12096; // Grundfreibetrag 2025
    const childAllowance = children * 9600; // Kinderfreibetrag per child
    
    // Calculate taxable income
    let taxableIncome = Math.max(0, grossSalary - basicAllowance - childAllowance);
    
    // Progressive tax calculation (2025 official formula)
    let incomeTax = 0;
    if (taxableIncome > 0) {
        if (taxableIncome <= 17005) {
            // First progression zone: 14% to 24%
            const y = taxableIncome / 10000;
            incomeTax = (922.98 * y + 1400) * y;
        } else if (taxableIncome <= 68429) {
            // Second progression zone: 24% to 42%
            const z = (taxableIncome - 17005) / 10000;
            incomeTax = (181.19 * z + 2397) * z + 1025.38;
        } else if (taxableIncome <= 277825) {
            // Third zone: constant 42%
            incomeTax = 0.42 * taxableIncome - 10602.13;
        } else {
            // Top tax rate: 45%
            incomeTax = 0.45 * taxableIncome - 18936.88;
        }
    }



    // Church tax (8% or 9% depending on state)
    const churchTaxAmount = churchTax ? incomeTax * 0.09 : 0;

    // Social security contributions (2025 rates from web sources)
    const maxPensionBase = 96600;  // 2025 contribution ceiling
    const maxHealthBase = 66150;   // 2025 health insurance ceiling

    const pensionBase = Math.min(grossSalary, maxPensionBase);
    const healthBase = Math.min(grossSalary, maxHealthBase);

    // Employee shares (2025 official rates)
    const pensionInsurance = pensionBase * 0.093;        // 9.3% employee share
    const unemploymentInsurance = pensionBase * 0.013;   // 1.3% employee share
    
    let healthInsurance = 0;
    let careInsurance = 0;

    if (publicHealthInsurance) {
        // Health insurance: 7.3% base + additional contribution
        const baseHealthRate = 0.073;
        const additionalContribution = (additionalHealthRate / 100) / 2;
        healthInsurance = healthBase * (baseHealthRate + additionalContribution);
        
        // Care insurance: 1.8% base + additional for childless
        let careRate = 0.018;
        if (children === 0 && age >= 23) {
            careRate += 0.006; // Additional 0.6% for childless
        }
        careInsurance = healthBase * careRate;
    } else {
        // Private health insurance estimate
        healthInsurance = Math.min(900, grossSalary * 0.08);
        let careRate = 0.018;
        if (children === 0 && age >= 23) {
            careRate += 0.006;
        }
        careInsurance = healthBase * careRate;
    }

    // Calculate total deductions
    const totalTaxes = incomeTax + churchTaxAmount;
    const totalSocialInsurance = pensionInsurance + unemploymentInsurance + healthInsurance + careInsurance;
    const totalDeductions = totalTaxes + totalSocialInsurance;

    // Calculate net salary
    const netSalary = grossSalary - totalDeductions;

    return netSalary;
}

// Multi-Phase Wealth Development Calculator
function calculateMultiPhaseWealthDevelopment(phases, initialCapital, annualReturn, inflationRate, salaryGrowth, salaryToSavings, includeTax, baseSalary = 60000, teilfreistellung = false, etfType = 'thesaurierend') {
    console.log('Starting multi-phase wealth calculation with phases:', phases);
    
    const monthlyReturn = annualReturn / 12;
    
    let capital = initialCapital;
    let currentSalary = baseSalary;
    let totalInvested = initialCapital;
    let cumulativeTaxesPaid = 0;
    
    const yearlyData = [{
        year: 0,
        capital: capital,
        realCapital: capital,
        totalInvested: totalInvested,
        monthlySavings: 0,
        yearlySalary: currentSalary,
        netSalary: calculateGermanNetSalary(currentSalary),
        taxesPaid: 0,
        cumulativeTaxesPaid: 0,
        currentPhase: null
    }];

    // Determine the maximum duration from all phases
    const maxDuration = Math.max(...phases.map(phase => phase.endYear));
    
    // Reset tax allowance tracking for new calculation
    usedSparerpauschbetrag = 0;

    for (let year = 1; year <= maxDuration; year++) {
        const startOfYearCapital = capital;
        let yearlyTaxesPaid = 0;
        
        // Find which phase applies for this year
        const currentPhase = phases.find(phase => year >= phase.startYear && year <= phase.endYear);
        let currentMonthlySavings = currentPhase ? currentPhase.monthlySavingsRate : 0;
        
        console.log(`Year ${year}: Phase: ${currentPhase ? `${currentPhase.startYear}-${currentPhase.endYear}` : 'none'}, Monthly savings: €${currentMonthlySavings}`);
        
        for (let month = 1; month <= 12; month++) {
            // Apply monthly return
            const monthlyGain = capital * monthlyReturn;
            capital += monthlyGain;
            
            // Add monthly savings if in an active phase
            if (currentMonthlySavings > 0) {
                capital += currentMonthlySavings;
                totalInvested += currentMonthlySavings;
            }
        }
        
        // Apply German ETF taxes annually
        if (includeTax && capital > startOfYearCapital) {
            const annualTax = calculateGermanETFTax(startOfYearCapital, capital, annualReturn, year, teilfreistellung, etfType);
            capital -= annualTax;
            yearlyTaxesPaid = annualTax;
            cumulativeTaxesPaid += annualTax;
        }
        
        // Annual salary increase affects savings rate (apply to all active phases)
        if (year < maxDuration) {
            const previousNetSalary = calculateGermanNetSalary(currentSalary);
            const annualSalaryIncrease = currentSalary * salaryGrowth;
            currentSalary += annualSalaryIncrease;
            const newNetSalary = calculateGermanNetSalary(currentSalary);
            const netSalaryIncrease = newNetSalary - previousNetSalary;
            
            // Apply percentage of NET salary increase to monthly savings
            const monthlySalaryIncrease = (netSalaryIncrease / 12) * salaryToSavings;
            
            // Update phase savings rates proportionally for the current year
            if (monthlySalaryIncrease > 0) {
                console.log(`Year ${year}: Salary increased by €${monthlySalaryIncrease.toFixed(2)}/month`);
                
                // Update the phases array to reflect the salary growth increase
                for (let i = 0; i < phases.length; i++) {
                    // Update phases that are active from current year onwards
                    if (phases[i].endYear >= year) {
                        phases[i].monthlySavingsRate += monthlySalaryIncrease;
                        console.log(`Updated phase ${i+1} (${phases[i].startYear}-${phases[i].endYear}): €${phases[i].monthlySavingsRate.toFixed(2)}/month`);
                    }
                }
                
                // Update current monthly savings if we're in an active phase
                if (currentPhase) {
                    currentMonthlySavings += monthlySalaryIncrease;
                    console.log(`Updated current monthly savings: €${currentMonthlySavings.toFixed(2)}/month`);
                }
            }
        }
        
        // Calculate real value (inflation-adjusted)
        const realCapital = capital / Math.pow(1 + inflationRate, year);
        
        yearlyData.push({
            year: year,
            capital: capital,
            realCapital: realCapital,
            totalInvested: totalInvested,
            monthlySavings: currentMonthlySavings,
            yearlySalary: currentSalary,
            netSalary: calculateGermanNetSalary(currentSalary),
            taxesPaid: yearlyTaxesPaid,
            cumulativeTaxesPaid: cumulativeTaxesPaid,
            currentPhase: currentPhase ? `Phase ${phases.indexOf(currentPhase) + 1}` : 'Keine Phase'
        });
    }

    const finalNominal = capital;
    const finalReal = capital / Math.pow(1 + inflationRate, maxDuration);
    const totalReturn = finalNominal - totalInvested;

    console.log('Multi-phase calculation completed:', {
        finalNominal,
        finalReal,
        totalInvested,
        totalReturn,
        totalTaxesPaid: cumulativeTaxesPaid
    });

    return {
        finalNominal,
        finalReal,
        totalInvested,
        totalReturn,
        totalTaxesPaid: cumulativeTaxesPaid,
        yearlyData,
        phases: phases // Include phase information for chart visualization
    };
}

function updateScenarioSalaryAnalysis(scenarioId, baseSalary, salaryGrowthRate) {
    // Calculate current net salary
    const currentNetSalary = calculateGermanNetSalary(baseSalary);
    
    // Calculate salary after increase
    const grossIncrease = baseSalary * salaryGrowthRate;
    const newGrossSalary = baseSalary + grossIncrease;
    const newNetSalary = calculateGermanNetSalary(newGrossSalary);
    
    // Calculate net increase and tax impact
    const netIncrease = newNetSalary - currentNetSalary;
    const taxOnIncrease = grossIncrease - netIncrease;
    const netIncreaseRate = (netIncrease / grossIncrease) * 100;
    
    // Update display for this scenario
    const analysisContainer = document.getElementById(`salaryIncreaseAnalysis_${scenarioId}`);
    if (analysisContainer) {
        const grossIncreaseEl = analysisContainer.querySelector('.gross-increase');
        const netIncreaseEl = analysisContainer.querySelector('.net-increase');
        const taxOnIncreaseEl = analysisContainer.querySelector('.tax-on-increase');
        const netIncreaseRateEl = analysisContainer.querySelector('.net-increase-rate');
        
        if (grossIncreaseEl) grossIncreaseEl.textContent = formatCurrency(grossIncrease);
        if (netIncreaseEl) netIncreaseEl.textContent = formatCurrency(netIncrease);
        if (taxOnIncreaseEl) taxOnIncreaseEl.textContent = formatCurrency(taxOnIncrease);
        if (netIncreaseRateEl) netIncreaseRateEl.textContent = formatGermanNumber(netIncreaseRate, 1) + '%';
        
        // Update color coding based on net rate
        if (netIncreaseEl && netIncreaseRateEl) {
            if (netIncreaseRate >= 70) {
                netIncreaseEl.style.color = '#27ae60'; // Green
                netIncreaseRateEl.style.color = '#27ae60';
            } else if (netIncreaseRate >= 60) {
                netIncreaseEl.style.color = '#f39c12'; // Orange
                netIncreaseRateEl.style.color = '#f39c12';
            } else {
                netIncreaseEl.style.color = '#e74c3c'; // Red
                netIncreaseRateEl.style.color = '#e74c3c';
            }
        }
    }
}

function copyScenario(scenarioId) {
    addNewScenario();
    
    // Get the newly created scenario ID
    const newScenarioId = scenarios[scenarios.length - 1].id;
    
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
    
    // Copy Teilfreistellung toggle state
    const sourceTeilfreistellungToggle = document.getElementById(`teilfreistellungToggle_${scenarioId}`);
    const targetTeilfreistellungToggle = document.getElementById(`teilfreistellungToggle_${newScenarioId}`);
    
    if (sourceTeilfreistellungToggle && targetTeilfreistellungToggle) {
        if (sourceTeilfreistellungToggle.classList.contains('active')) {
            targetTeilfreistellungToggle.classList.add('active');
        } else {
            targetTeilfreistellungToggle.classList.remove('active');
        }
    }
    
    debouncedRecalculateAll();
    
    // Show success notification
    const sourceScenario = scenarios.find(s => s.id === scenarioId);
    const newScenario = scenarios.find(s => s.id === newScenarioId);
    if (sourceScenario && newScenario) {
        showNotification(
            'Szenario kopiert', 
            `📊 ${sourceScenario.name} wurde erfolgreich als ${newScenario.name} kopiert.`, 
            'success'
        );
    }
}

function removeScenario(scenarioId) {
    if (scenarioId === 'A') {
        alert('❌ Das Basis-Szenario A kann nicht gelöscht werden.');
        return;
    }
    
    if (confirm(`Szenario ${scenarioId} wirklich löschen?`)) {
        // Remove from scenarios array
        scenarios = scenarios.filter(s => s.id !== scenarioId);
        
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
        if (state.selectedContributionsScenario === scenarioId) {
            state.setSelectedContributionsScenario('A');
        }
        
        // Update scenario checkboxes, dropdown, and recalculate
        updateScenarioCheckboxes();
        updateContributionsScenarioDropdown();
        debouncedRecalculateAll();
    }
}

function renameScenario(scenarioId) {
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
    
    // Update tab name
    const tab = document.querySelector(`.scenario-tab[data-scenario="${scenarioId}"]`);
    if (tab) {
        tab.innerHTML = `📈 ${scenario.name}`;
    }
    
    // Update all UI elements that display scenario names
    updateScenarioResults();
    updateScenarioSelector();
    updateScenarioCheckboxes();
    updateContributionsScenarioDropdown();
    
    // Update the currently active chart with new names
    if (currentChartMode === 'comparison') {
        updateMainChart();
    } else if (currentChartMode === 'contributions') {
        updateContributionsGainsChart();
    }
    
    // Update sync indicator if this is the active scenario
    if (scenarioId === activeScenario) {
        autoSyncWithdrawalCapital(false);
    }
    
    showNotification('Szenario umbenannt', `"${currentName}" wurde erfolgreich in "${scenario.name}" umbenannt.`, 'success');
}

function updateScenarioSelector() {
    const selector = document.getElementById('scenarioSelector');
    if (!selector) return;
    
    // Clear existing options except the first one
    selector.innerHTML = '<option value="">Szenario wählen...</option>';
    
    // Add options for each scenario with calculated results
    scenarios.forEach(scenario => {
        if (scenario.yearlyData && scenario.yearlyData.length > 0) {
            const finalValue = scenario.yearlyData[scenario.yearlyData.length - 1].capital;
            const option = document.createElement('option');
            option.value = scenario.id;
            option.textContent = `${scenario.name} (€${Math.round(finalValue).toLocaleString('de-DE')})`;
            option.style.color = scenario.color;
            selector.appendChild(option);
        }
    });
}

function updateChart(yearlyData) {
    const ctx = document.getElementById('wealthChart').getContext('2d');
    
    if (chart) {
        chart.destroy();
    }

    // Check if we have data
    if (!yearlyData || yearlyData.length === 0) {
        const canvas = document.getElementById('wealthChart');
        displayChartErrorMessage(canvas, ctx, 'no-data');
        return;
    }

    const years = yearlyData.map(d => d.year);
    const nominalValues = yearlyData.map(d => d.capital);
    const realValues = yearlyData.map(d => d.realCapital);
    const totalInvestedValues = yearlyData.map(d => d.totalInvested);
    const gainsValues = yearlyData.map(d => d.capital - d.totalInvested); // Calculate gains = total - contributions

    // Create gradients for stacked visualization
    const contributionsGradient = ctx.createLinearGradient(0, 0, 0, 400);
    contributionsGradient.addColorStop(0, 'rgba(52, 152, 219, 0.8)');
    contributionsGradient.addColorStop(1, 'rgba(52, 152, 219, 0.4)');

    const gainsGradient = ctx.createLinearGradient(0, 0, 0, 400);
    gainsGradient.addColorStop(0, 'rgba(46, 204, 113, 0.8)');
    gainsGradient.addColorStop(1, 'rgba(46, 204, 113, 0.4)');

    const realGradient = ctx.createLinearGradient(0, 0, 0, 400);
    realGradient.addColorStop(0, 'rgba(155, 89, 182, 0.6)');
    realGradient.addColorStop(1, 'rgba(155, 89, 182, 0.2)');

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [
                {
                    label: '💰 Ihre Einzahlungen',
                    data: totalInvestedValues,
                    borderColor: '#3498db',
                    backgroundColor: contributionsGradient,
                    fill: 'origin', // Fill from zero
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 8,
                    pointBackgroundColor: '#3498db',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    order: 2
                },
                {
                    label: '📈 Kursgewinne/Zinsen',
                    data: nominalValues, // Total value
                    borderColor: '#27ae60',
                    backgroundColor: gainsGradient,
                    fill: '-1', // Fill to previous dataset (contributions)
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 8,
                    pointBackgroundColor: '#27ae60',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    order: 1
                },
                {
                    label: 'Realwert (Inflationsbereinigt)',
                    data: realValues,
                    borderColor: '#9b59b6',
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0.4,
                    borderWidth: 2,
                    borderDash: [8, 4],
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#9b59b6',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    order: 0
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
                    text: 'Vermögensentwicklung: Einzahlungen vs. Kursgewinne',
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
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    titleColor: '#2c3e50',
                    bodyColor: '#2c3e50',
                    borderColor: '#3498db',
                    borderWidth: 2,
                    cornerRadius: 12,
                    displayColors: true,
                    mode: 'nearest',
                    intersect: true,
                    titleFont: {
                        size: 16,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 14
                    },
                    footerFont: {
                        size: 12,
                        style: 'italic'
                    },
                    padding: 16,
                    caretSize: 8,
                    callbacks: {
                        title: function(context) {
                            return 'Jahr ' + context[0].label;
                        },
                        label: function(context) {
                            return context.dataset.label + ': €' + context.parsed.y.toLocaleString('de-DE', { 
                                minimumFractionDigits: 2, 
                                maximumFractionDigits: 2 
                            });
                        },
                        afterBody: function(context) {
                            const year = parseInt(context[0].label);
                            const yearData = yearlyData[year];
                            if (yearData) {
                                const monthlyContribution = getMonthlySavingsForYear(year);
                                const annualContribution = monthlyContribution * 12;
                                const gains = yearData.capital - yearData.totalInvested;
                                const gainsPercentage = yearData.capital > 0 ? (gains / yearData.capital * 100) : 0;
                                const contributionsPercentage = yearData.capital > 0 ? (yearData.totalInvested / yearData.capital * 100) : 0;
                                const netMonthlySalary = yearData.netSalary ? yearData.netSalary / 12 : 0;
                                const grossMonthlySalary = yearData.yearlySalary / 12;
                                const taxRate = ((grossMonthlySalary - netMonthlySalary) / grossMonthlySalary * 100);
                                
                                return [
                                    '',
                                    '💰 Ihre Einzahlungen: €' + yearData.totalInvested.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' (' + contributionsPercentage.toFixed(1) + '%)',
                                    '📈 Kursgewinne: €' + gains.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' (' + gainsPercentage.toFixed(1) + '%)',
                                    '💼 Gesamtvermögen: €' + yearData.capital.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
                                    '',
                                    'Brutto-Jahresgehalt: €' + yearData.yearlySalary.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
                                    'Jährliche Einzahlung: €' + annualContribution.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
                                    'Kaufkraftverlust: €' + (yearData.capital - yearData.realCapital).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                                ];
                            }
                            return [];
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
                intersect: true,
                mode: 'nearest'
            },
            hover: {
                mode: 'nearest',
                intersect: true,
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

function createIntegratedTimeline() {
    const ctx = document.getElementById('integratedChart').getContext('2d');
    
    if (integratedChart) {
        integratedChart.destroy();
    }

    // Get accumulation data from active scenario
    const currentActiveScenario = scenarios.find(s => s.id === activeScenario) || scenarios[0];
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

function formatCurrency(amount) {
    return '€' + amount.toLocaleString('de-DE', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });
}

// Helper functions for German number formatting
function parseGermanNumber(value) {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return 0;
    
    // Replace German decimal comma with dot for parsing
    const normalizedValue = value.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(normalizedValue);
    return isNaN(parsed) ? 0 : parsed;
}

function formatGermanNumber(value, decimals = 2) {
    if (typeof value !== 'number' || isNaN(value)) return '0';
    return value.toLocaleString('de-DE', { 
        minimumFractionDigits: decimals, 
        maximumFractionDigits: decimals 
    });
}

function setupGermanNumberInputs() {
    // Handle all number inputs and text inputs in budget section to support German formatting
    const numberInputs = document.querySelectorAll('input[type="number"], input[type="text"]');
    
    numberInputs.forEach(input => {
        // Skip profile-related inputs and scenario name inputs (they should not be treated as numbers)
        if (input.id === 'profileName' || 
            input.id === 'profileDescription' || 
            input.id === 'ansparphaseScenarioName' || 
            input.id === 'ansparphaseScenarioDescription' ||
            input.id === 'entnahmephaseScenarioName' ||
            input.id === 'entnahmephaseScenarioDescription') {
            return;
        }
        
        // Format display when losing focus
        input.addEventListener('blur', function() {
            const value = parseGermanNumber(this.value);
            if (value !== 0 || this.value !== '') {
                // Only format if there's a value or if it's not empty
                if (this.id === 'monthlySavings' || this.id === 'initialCapital' || this.id === 'retirementCapital') {
                    // No decimals for currency inputs
                    this.value = value.toString().replace('.', ',');
                } else {
                    // Keep decimals for percentage inputs
                    this.value = value.toString().replace('.', ',');
                }
            }
        });

        // Allow comma input
        input.addEventListener('keypress', function(e) {
            // Allow comma as decimal separator
            if (e.key === ',') {
                // Prevent multiple commas
                if (this.value.includes(',')) {
                    e.preventDefault();
                }
            }
        });

        // Convert comma to dot for internal processing but display with comma
        input.addEventListener('input', function() {
            // Store cursor position
            const cursorPos = this.selectionStart;
            
            // Allow commas in the display
            let value = this.value;
            
            // Update the associated calculation immediately
            if (this.closest('.budget-section')) {
                calculateBudget();
            } else if (this.closest('.controls-section')) {
                recalculateAll();
            } else if (this.closest('.withdrawal-section')) {
                calculateWithdrawal();
            }
            
            // Restore cursor position
            this.setSelectionRange(cursorPos, cursorPos);
        });
    });
}



function setupPhaseToggle() {
    const budgetBtn = document.getElementById('budgetPhase');
    const taxCalculatorBtn = document.getElementById('taxCalculatorPhase');
    const accumulationBtn = document.getElementById('accumulationPhase');
    const withdrawalBtn = document.getElementById('withdrawalPhase');
    const scenarioComparisonBtn = document.getElementById('scenarioComparisonPhase');
    const budgetSection = document.getElementById('budgetSection');
    const taxCalculatorSection = document.getElementById('taxCalculatorSection');
    const accumulationSection = document.querySelector('.top-section');
    const accumulationChart = document.getElementById('accumulationChart');
    const withdrawalSection = document.getElementById('withdrawalSection');
    const scenarioComparisonSection = document.getElementById('scenarioComparisonSection');

    const allSections = [budgetSection, taxCalculatorSection, accumulationSection, accumulationChart, withdrawalSection, scenarioComparisonSection];

    // Hide all sections initially
    allSections.forEach(section => {
        if (section) {
            section.style.display = 'none';
        }
    });

    // Show initial section (accumulation)
    if (accumulationSection) {
        accumulationSection.style.display = 'grid';
    }
    if (accumulationChart) {
        accumulationChart.style.display = 'block';
    }

    if (budgetBtn) {
        budgetBtn.addEventListener('click', function() {
            currentPhase = 'budget';
            setActivePhase(budgetBtn);
            showSingleSection(budgetSection);
            calculateBudget();
            updateScenarioCheckboxVisibility();
            if (window.resetStickyScenarioCards) window.resetStickyScenarioCards();
        });
    }

    if (taxCalculatorBtn) {
        taxCalculatorBtn.addEventListener('click', function() {
            currentPhase = 'taxCalculator';
            setActivePhase(taxCalculatorBtn);
            showSingleSection(taxCalculatorSection);
            calculateTaxes();
            updateScenarioCheckboxVisibility();
            if (window.resetStickyScenarioCards) window.resetStickyScenarioCards();
        });
    }

    if (accumulationBtn) {
        accumulationBtn.addEventListener('click', function() {
            currentPhase = 'accumulation';
            setActivePhase(accumulationBtn);
            showAccumulationSections();
            updateScenarioCheckboxVisibility();
            if (window.resetStickyScenarioCards) window.resetStickyScenarioCards();
        });
    }

    if (withdrawalBtn) {
        withdrawalBtn.addEventListener('click', function() {
            currentPhase = 'withdrawal';
            setActivePhase(withdrawalBtn);
            showSingleSection(withdrawalSection);
            calculateWithdrawal();
            updateScenarioCheckboxVisibility();
            if (window.resetStickyScenarioCards) window.resetStickyScenarioCards();
        });
    }

    if (scenarioComparisonBtn) {
        scenarioComparisonBtn.addEventListener('click', function() {
            currentPhase = 'scenarioComparison';
            setActivePhase(scenarioComparisonBtn);
            showSingleSection(scenarioComparisonSection);
            // Recalculate all scenarios to ensure data is up to date
            recalculateAll();
            // Reload profiles when scenario comparison section is shown
            loadComparisonProfiles();
            updateScenarioCheckboxVisibility();
            if (window.resetStickyScenarioCards) window.resetStickyScenarioCards();
            // Trigger initial scroll check after a short delay to allow section to render
            setTimeout(() => {
                if (window.scrollY > 0) {
                    window.scrollBy(0, 1);
                    window.scrollBy(0, -1);
                }
            }, 100);
        });
    }

    function setActivePhase(activeBtn) {
        [budgetBtn, taxCalculatorBtn, accumulationBtn, withdrawalBtn, scenarioComparisonBtn].forEach(btn => {
            if (btn) {
                btn.classList.remove('active');
            }
        });
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }

    function hideAllSections() {
        allSections.forEach(section => {
            if (section) {
                section.style.display = 'none';
            }
        });
    }

    function showSingleSection(sectionToShow) {
        hideAllSections();
        if (sectionToShow) {
            sectionToShow.style.display = 'block';
        }
    }

    function showAccumulationSections() {
        hideAllSections();
        if (accumulationSection) {
            accumulationSection.style.display = 'grid';
        }
        if (accumulationChart) {
            accumulationChart.style.display = 'block';
        }
    }
}

// Savings Mode Functionality - Multi-phase vs Simple
function setupSavingsModeFunctionality() {
    // Initialize savings mode functionality for all scenarios
    scenarios.forEach(scenario => {
        setupSavingsModeForScenario(scenario.id);
    });
}

function setupSavingsModeForScenario(scenarioId) {
    // Set up savings mode toggle buttons
    const savingsModeButtons = document.querySelectorAll(`.savings-mode-btn[data-scenario="${scenarioId}"]`);
    savingsModeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const mode = this.dataset.mode;
            switchSavingsMode(scenarioId, mode);
        });
    });

    // Set up phase toggle buttons for enabling/disabling phases 2 and 3
    const phaseToggleButtons = document.querySelectorAll(`.phase-toggle-btn[data-scenario="${scenarioId}"]`);
    phaseToggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const phase = parseInt(this.dataset.phase);
            togglePhase(scenarioId, phase);
        });
    });

    // Set up phase input listeners
    setupPhaseInputListeners(scenarioId);
    
    // Initialize phase summaries
    updatePhaseSummaries(scenarioId);
    updateMultiPhaseSummary(scenarioId);
}

function switchSavingsMode(scenarioId, mode) {
    // Update button states
    const savingsModeButtons = document.querySelectorAll(`.savings-mode-btn[data-scenario="${scenarioId}"]`);
    savingsModeButtons.forEach(button => {
        button.classList.remove('active');
        if (button.dataset.mode === mode) {
            button.classList.add('active');
        }
    });

    // Show/hide appropriate containers
    const simpleContainer = document.querySelector(`.simple-savings-container[data-scenario="${scenarioId}"]`);
    const multiPhaseContainer = document.querySelector(`.multi-phase-savings-container[data-scenario="${scenarioId}"]`);

    if (mode === 'simple') {
        if (simpleContainer) simpleContainer.style.display = 'block';
        if (multiPhaseContainer) multiPhaseContainer.style.display = 'none';
    } else if (mode === 'multi-phase') {
        if (simpleContainer) simpleContainer.style.display = 'none';
        if (multiPhaseContainer) multiPhaseContainer.style.display = 'block';
        
        // Update multi-phase summary when switching to multi-phase mode
        updateMultiPhaseSummary(scenarioId);
        generatePhaseTimeline(scenarioId);
    }

    // Trigger recalculation
    debouncedRecalculateAll();
}

function togglePhase(scenarioId, phaseNumber) {
    const phaseElement = document.querySelector(`.savings-phase[data-phase="${phaseNumber}"][data-scenario="${scenarioId}"]`);
    const toggleButton = document.querySelector(`.phase-toggle-btn[data-phase="${phaseNumber}"][data-scenario="${scenarioId}"]`);
    const phaseContent = phaseElement.querySelector('.phase-content');
    const phaseStatusIndicator = phaseElement.querySelector('.phase-status-indicator');
    const toggleText = toggleButton.querySelector('.toggle-text');

    if (phaseElement.classList.contains('active')) {
        // Deactivate phase
        phaseElement.classList.remove('active');
        phaseContent.style.display = 'none';
        phaseStatusIndicator.classList.remove('active');
        toggleText.textContent = 'Aktivieren';
        toggleButton.classList.remove('active');
    } else {
        // Activate phase
        phaseElement.classList.add('active');
        phaseContent.style.display = 'block';
        phaseStatusIndicator.classList.add('active');
        toggleText.textContent = 'Deaktivieren';
        toggleButton.classList.add('active');
        
        // Validate phase time ranges when activating
        validatePhaseTimeRanges(scenarioId);
    }

    // Update summaries
    updatePhaseSummaries(scenarioId);
    updateMultiPhaseSummary(scenarioId);
    generatePhaseTimeline(scenarioId);
    
    // Trigger recalculation
    debouncedRecalculateAll();
}

function setupPhaseInputListeners(scenarioId) {
    // Set up listeners for all phase inputs
    for (let phase = 1; phase <= 3; phase++) {
        const startYearInput = document.querySelector(`.phase-start-year[data-phase="${phase}"][data-scenario="${scenarioId}"]`);
        const endYearInput = document.querySelector(`.phase-end-year[data-phase="${phase}"][data-scenario="${scenarioId}"]`);
        const savingsRateInput = document.querySelector(`.phase-savings-rate[data-phase="${phase}"][data-scenario="${scenarioId}"]`);

        if (startYearInput) {
            startYearInput.addEventListener('input', () => {
                validatePhaseTimeRanges(scenarioId);
                updatePhaseSummaries(scenarioId);
                updateMultiPhaseSummary(scenarioId);
                generatePhaseTimeline(scenarioId);
                debouncedRecalculateAll();
            });
            
            // Improve keyboard input behavior - select all text when focused
            startYearInput.addEventListener('focus', function() {
                this.select();
            });
            
            startYearInput.addEventListener('click', function() {
                this.select();
            });
        }

        if (endYearInput) {
            endYearInput.addEventListener('input', () => {
                validatePhaseTimeRanges(scenarioId);
                updatePhaseSummaries(scenarioId);
                updateMultiPhaseSummary(scenarioId);
                generatePhaseTimeline(scenarioId);
                debouncedRecalculateAll();
            });
            
            // Improve keyboard input behavior - select all text when focused
            endYearInput.addEventListener('focus', function() {
                this.select();
            });
            
            endYearInput.addEventListener('click', function() {
                this.select();
            });
        }

        if (savingsRateInput) {
            savingsRateInput.addEventListener('input', () => {
                updatePhaseSummaries(scenarioId);
                updateMultiPhaseSummary(scenarioId);
                debouncedRecalculateAll();
            });
        }
    }
}

function validatePhaseTimeRanges(scenarioId) {
    // Ensure phases don't overlap and are in logical order
    const phases = [];
    
    for (let phase = 1; phase <= 3; phase++) {
        const phaseElement = document.querySelector(`.savings-phase[data-phase="${phase}"][data-scenario="${scenarioId}"]`);
        const startYearInput = document.querySelector(`.phase-start-year[data-phase="${phase}"][data-scenario="${scenarioId}"]`);
        const endYearInput = document.querySelector(`.phase-end-year[data-phase="${phase}"][data-scenario="${scenarioId}"]`);
        
        if (phaseElement && phaseElement.classList.contains('active')) {
            const startYear = parseInt(startYearInput.value) || 0;
            const endYear = parseInt(endYearInput.value) || 0;
            
            phases.push({
                phase: phase,
                startYear: startYear,
                endYear: endYear,
                startInput: startYearInput,
                endInput: endYearInput
            });
        }
    }

    // Sort phases by start year
    phases.sort((a, b) => a.startYear - b.startYear);

    // Validate each phase
    for (let i = 0; i < phases.length; i++) {
        const currentPhase = phases[i];
        
        // Ensure values don't exceed 100 years
        if (currentPhase.startYear > 100) {
            currentPhase.startInput.value = 100;
            currentPhase.startYear = 100;
        }
        if (currentPhase.endYear > 100) {
            currentPhase.endInput.value = 100;
            currentPhase.endYear = 100;
        }
        
        // Ensure end year is after start year
        if (currentPhase.endYear <= currentPhase.startYear) {
            currentPhase.endInput.value = Math.min(currentPhase.startYear + 1, 100);
        }
        
        // Ensure no overlap with next phase
        if (i < phases.length - 1) {
            const nextPhase = phases[i + 1];
            if (currentPhase.endYear >= nextPhase.startYear) {
                nextPhase.startInput.value = Math.min(currentPhase.endYear + 1, 100);
            }
        }
    }
}

function updatePhaseSummaries(scenarioId) {
    for (let phase = 1; phase <= 3; phase++) {
        const phaseElement = document.querySelector(`.savings-phase[data-phase="${phase}"][data-scenario="${scenarioId}"]`);
        
        if (phaseElement) {
            const startYear = parseInt(document.querySelector(`.phase-start-year[data-phase="${phase}"][data-scenario="${scenarioId}"]`).value) || 0;
            const endYear = parseInt(document.querySelector(`.phase-end-year[data-phase="${phase}"][data-scenario="${scenarioId}"]`).value) || 0;
            const savingsRate = parseGermanNumber(document.querySelector(`.phase-savings-rate[data-phase="${phase}"][data-scenario="${scenarioId}"]`).value) || 0;
            
            const duration = Math.max(0, endYear - startYear + 1);
            const totalContributions = duration * 12 * savingsRate;
            
            const durationElement = phaseElement.querySelector('.phase-duration');
            const totalElement = phaseElement.querySelector('.phase-total');
            
            if (durationElement) {
                durationElement.textContent = `Dauer: ${duration} Jahre`;
            }
            if (totalElement) {
                totalElement.textContent = `Gesamt: ${formatCurrency(totalContributions)}`;
            }
        }
    }
}

function updateMultiPhaseSummary(scenarioId) {
    const activePhasesCountElement = document.getElementById(`activePhasesCount_${scenarioId}`);
    const totalDurationElement = document.getElementById(`totalDuration_${scenarioId}`);
    const averageSavingsRateElement = document.getElementById(`averageSavingsRate_${scenarioId}`);
    const totalContributionsElement = document.getElementById(`totalContributions_${scenarioId}`);

    let activePhases = 0;
    let minStartYear = Infinity;
    let maxEndYear = -Infinity;
    let totalContributions = 0;
    let weightedSavingsSum = 0;
    let totalMonths = 0;

    for (let phase = 1; phase <= 3; phase++) {
        const phaseElement = document.querySelector(`.savings-phase[data-phase="${phase}"][data-scenario="${scenarioId}"]`);
        
        if (phaseElement && phaseElement.classList.contains('active')) {
            activePhases++;
            
            const startYear = parseInt(document.querySelector(`.phase-start-year[data-phase="${phase}"][data-scenario="${scenarioId}"]`).value) || 0;
            const endYear = parseInt(document.querySelector(`.phase-end-year[data-phase="${phase}"][data-scenario="${scenarioId}"]`).value) || 0;
            const savingsRate = parseGermanNumber(document.querySelector(`.phase-savings-rate[data-phase="${phase}"][data-scenario="${scenarioId}"]`).value) || 0;
            
            minStartYear = Math.min(minStartYear, startYear);
            maxEndYear = Math.max(maxEndYear, endYear);
            
            const phaseDuration = Math.max(0, endYear - startYear + 1);
            const phaseMonths = phaseDuration * 12;
            const phaseContributions = phaseMonths * savingsRate;
            
            totalContributions += phaseContributions;
            weightedSavingsSum += savingsRate * phaseMonths;
            totalMonths += phaseMonths;
        }
    }

    const totalDuration = activePhases > 0 ? maxEndYear - minStartYear + 1 : 0;
    const averageSavingsRate = totalMonths > 0 ? weightedSavingsSum / totalMonths : 0;

    if (activePhasesCountElement) activePhasesCountElement.textContent = activePhases.toString();
    if (totalDurationElement) totalDurationElement.textContent = `${totalDuration} Jahre`;
    if (averageSavingsRateElement) averageSavingsRateElement.textContent = formatCurrency(averageSavingsRate);
    if (totalContributionsElement) totalContributionsElement.textContent = formatCurrency(totalContributions);
}

function generatePhaseTimeline(scenarioId) {
    const timelineElement = document.getElementById(`phaseTimeline_${scenarioId}`);
    if (!timelineElement) return;

    // Get active phases
    const activePhases = [];
    let minStartYear = Infinity;
    let maxEndYear = -Infinity;

    for (let phase = 1; phase <= 3; phase++) {
        const phaseElement = document.querySelector(`.savings-phase[data-phase="${phase}"][data-scenario="${scenarioId}"]`);
        
        if (phaseElement && phaseElement.classList.contains('active')) {
            const startYear = parseInt(document.querySelector(`.phase-start-year[data-phase="${phase}"][data-scenario="${scenarioId}"]`).value) || 0;
            const endYear = parseInt(document.querySelector(`.phase-end-year[data-phase="${phase}"][data-scenario="${scenarioId}"]`).value) || 0;
            const savingsRate = parseGermanNumber(document.querySelector(`.phase-savings-rate[data-phase="${phase}"][data-scenario="${scenarioId}"]`).value) || 0;
            
            activePhases.push({
                phase: phase,
                startYear: startYear,
                endYear: endYear,
                savingsRate: savingsRate
            });
            
            minStartYear = Math.min(minStartYear, startYear);
            maxEndYear = Math.max(maxEndYear, endYear);
        }
    }

    if (activePhases.length === 0) {
        timelineElement.innerHTML = '<div style="text-align: center; color: #7f8c8d; padding: 20px;">Keine aktiven Phasen</div>';
        return;
    }

    const totalDuration = maxEndYear - minStartYear + 1;
    
    // Create timeline HTML
    let timelineHTML = '<div class="timeline-bar">';
    
    activePhases.forEach(phaseData => {
        const phaseStartPercent = ((phaseData.startYear - minStartYear) / totalDuration) * 100;
        const phaseWidthPercent = ((phaseData.endYear - phaseData.startYear + 1) / totalDuration) * 100;
        
        timelineHTML += `
            <div class="timeline-segment phase-${phaseData.phase}" 
                 style="left: ${phaseStartPercent}%; width: ${phaseWidthPercent}%;"
                 title="Phase ${phaseData.phase}: Jahr ${phaseData.startYear}-${phaseData.endYear}, ${formatCurrency(phaseData.savingsRate)}/Monat">
            </div>
        `;
    });
    
    timelineHTML += '</div>';
    
    // Add legend
    timelineHTML += '<div class="timeline-legend">';
    activePhases.forEach(phaseData => {
        const phaseName = ['', 'Anfangsphase', 'Wachstumsphase', 'Spitzenphase'][phaseData.phase];
        timelineHTML += `
            <div class="legend-item">
                <div class="legend-color phase-${phaseData.phase}"></div>
                <span class="legend-text">${phaseName} (${phaseData.startYear}-${phaseData.endYear})</span>
            </div>
        `;
    });
    timelineHTML += '</div>';
    
    timelineElement.innerHTML = timelineHTML;
}

function getSavingsMode(scenarioId) {
    const activeModeButton = document.querySelector(`.savings-mode-btn.active[data-scenario="${scenarioId}"]`);
    return activeModeButton ? activeModeButton.dataset.mode : 'simple';
}

function getMultiPhaseData(scenarioId) {
    const phases = [];
    
    for (let phase = 1; phase <= 3; phase++) {
        const phaseElement = document.querySelector(`.savings-phase[data-phase="${phase}"][data-scenario="${scenarioId}"]`);
        
        if (phaseElement && phaseElement.classList.contains('active')) {
            const startYear = parseInt(document.querySelector(`.phase-start-year[data-phase="${phase}"][data-scenario="${scenarioId}"]`).value) || 0;
            const endYear = parseInt(document.querySelector(`.phase-end-year[data-phase="${phase}"][data-scenario="${scenarioId}"]`).value) || 0;
            const savingsRate = parseGermanNumber(document.querySelector(`.phase-savings-rate[data-phase="${phase}"][data-scenario="${scenarioId}"]`).value) || 0;
            
            phases.push({
                startYear: startYear,
                endYear: endYear,
                monthlySavingsRate: savingsRate
            });
        }
    }
    
    return phases;
}

function setupWithdrawalListeners() {
    // Setup Teilfreistellung rate slider
    const teilfreistellungRateSlider = document.getElementById('withdrawalTeilfreistellungRate');
    const teilfreistellungGroup = document.getElementById('teilfreistellungGroup');
    
    if (teilfreistellungRateSlider) {
        teilfreistellungRateSlider.addEventListener('input', function() {
            updateWithdrawalSliderValue('withdrawalTeilfreistellungRate');
            debouncedCalculateWithdrawal();
        });
    }
    let withdrawalCalculationTimeout = null;
    
    // Debounced calculation function to prevent excessive calculations
    function debouncedCalculateWithdrawal() {
        if (withdrawalCalculationTimeout) {
            clearTimeout(withdrawalCalculationTimeout);
        }
        withdrawalCalculationTimeout = setTimeout(() => {
            calculateWithdrawal();
        }, 150); // 150ms delay to allow for smooth slider interaction
    }

    // Withdrawal sliders with debounced calculation
    const withdrawalSliders = ['withdrawalDuration', 'postRetirementReturn', 'withdrawalInflation'];
    withdrawalSliders.forEach(id => {
        const slider = document.getElementById(id);
        if (slider) {
            // Update display immediately, but debounce calculation
            slider.addEventListener('input', function() {
                updateWithdrawalSliderValue(id);
                debouncedCalculateWithdrawal();
            });
            
            // Also handle 'change' event for when user stops dragging
            slider.addEventListener('change', function() {
                updateWithdrawalSliderValue(id);
                if (withdrawalCalculationTimeout) {
                    clearTimeout(withdrawalCalculationTimeout);
                }
                calculateWithdrawal(); // Immediate calculation on final change
            });
            
            // Initialize slider display value
            updateWithdrawalSliderValue(id);
        }
    });

    // Withdrawal input fields with debouncing
    document.getElementById('retirementCapital').addEventListener('input', debouncedCalculateWithdrawal);

    // Withdrawal tax toggle (immediate calculation)
    document.getElementById('withdrawalTaxToggle').addEventListener('click', function() {
        this.classList.toggle('active');
        
        // Show/hide Teilfreistellung rate control based on tax toggle
        const teilfreistellungGroup = document.getElementById('teilfreistellungGroup');
        if (teilfreistellungGroup) {
            if (this.classList.contains('active')) {
                teilfreistellungGroup.style.display = 'block';
            } else {
                teilfreistellungGroup.style.display = 'none';
            }
        }
        
        calculateWithdrawal();
    });
    
    // Use accumulation result button
    document.getElementById('useAccumulationResult').addEventListener('click', function() {
        const selectedScenarioId = document.getElementById('scenarioSelector').value;
        
        if (!selectedScenarioId) {
            alert('Bitte wählen Sie zuerst ein Szenario aus der Liste aus.');
            return;
        }
        
        const selectedScenario = scenarios.find(s => s.id === selectedScenarioId);
        if (selectedScenario && selectedScenario.yearlyData && selectedScenario.yearlyData.length > 0) {
            const finalValue = selectedScenario.yearlyData[selectedScenario.yearlyData.length - 1].capital;
            document.getElementById('retirementCapital').value = Math.round(finalValue).toLocaleString('de-DE');
            
            // The total contributions will be automatically calculated from the selected scenario
            // when calculateWithdrawal() is called
            calculateWithdrawal();
            
            // Show notification with cost basis information
            const totalContributions = (selectedScenario.monthlyContribution || 0) * 12 * (selectedScenario.duration || 0);
            const unrealizedGains = finalValue - totalContributions;
            showNotification(
                '📊 Szenario übernommen', 
                `Endkapital: €${Math.round(finalValue).toLocaleString('de-DE')} | Einzahlungen: €${Math.round(totalContributions).toLocaleString('de-DE')} | Kursgewinne: €${Math.round(unrealizedGains).toLocaleString('de-DE')}`, 
                'success'
            );
        } else {
            alert('Das gewählte Szenario hat keine berechneten Ergebnisse. Bitte berechnen Sie zuerst die Ansparphase.');
        }
    });
    
    // Manual sync button
    document.getElementById('manualSyncBtn').addEventListener('click', function() {
        autoSyncWithdrawalCapital(true);
        showNotification(
            '🔄 Manuelle Synchronisation', 
            `Entnahmekapital wurde mit Szenario ${activeScenario} synchronisiert`, 
            'success'
        );
    });
    
    // Scenario selector dropdown change
    document.getElementById('scenarioSelector').addEventListener('change', function() {
        // Recalculate withdrawal when scenario selection changes
        // This will automatically update the cost basis calculation
        calculateWithdrawal();
    });
}

function updateWithdrawalSliderValue(sliderId) {
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

/**
 * Calculate total contributions from accumulation phase parameters
 * This is the sum of all monthly contributions over the savings period
 */
function calculateTotalContributionsFromAccumulation() {
    // Try to get parameters from the currently selected scenario
    const selectedScenarioId = document.getElementById('scenarioSelector').value;
    let monthlyContribution = 0;
    let duration = 0;
    
    if (selectedScenarioId) {
        const selectedScenario = scenarios.find(s => s.id === selectedScenarioId);
        if (selectedScenario) {
            // Check for direct properties first, then inputs object
            monthlyContribution = selectedScenario.monthlyContribution || 
                                (selectedScenario.inputs && selectedScenario.inputs.monthlySavings) || 0;
            duration = selectedScenario.duration || 
                      (selectedScenario.inputs && selectedScenario.inputs.duration) || 0;
        }
    }
    
    // If no scenario selected or no valid data, try to get from current active scenario
    if ((monthlyContribution === 0 || duration === 0) && activeScenario) {
        const activeScen = scenarios.find(s => s.id === activeScenario);
        if (activeScen) {
            monthlyContribution = activeScen.monthlyContribution || 
                                (activeScen.inputs && activeScen.inputs.monthlySavings) || 0;
            duration = activeScen.duration || 
                      (activeScen.inputs && activeScen.inputs.duration) || 0;
        }
    }
    
    // If still no data, try to get from current UI values
    if (monthlyContribution === 0 || duration === 0) {
        try {
            // Get values from the active scenario inputs
            if (activeScenario) {
                const monthlyInput = document.getElementById('monthlySavings_' + activeScenario);
                const durationInput = document.getElementById('duration_' + activeScenario);
                
                if (monthlyInput && durationInput) {
                    monthlyContribution = parseGermanNumber(monthlyInput.value) || 0;
                    duration = parseInt(durationInput.value) || 0;
                }
            }
            
            // Fallback to general inputs if scenario-specific inputs not found
            if (monthlyContribution === 0 || duration === 0) {
                const monthlyInput = document.getElementById('monthlySavings');
                const durationInput = document.getElementById('duration');
                
                if (monthlyInput && durationInput) {
                    monthlyContribution = parseGermanNumber(monthlyInput.value) || 0;
                    duration = parseInt(durationInput.value) || 0;
                }
            }
        } catch (error) {
            console.warn('Could not get accumulation parameters from UI:', error);
        }
    }
    
    // Calculate total contributions: monthly amount × 12 months × years
    const totalContributions = monthlyContribution * 12 * duration;
    
    console.log(`📊 Calculated total contributions from accumulation phase:`);
    console.log(`   Monthly contribution: €${monthlyContribution.toFixed(2)}`);
    console.log(`   Duration: ${duration} years`);
    console.log(`   Total contributions: €${totalContributions.toFixed(2)}`);
    console.log(`   Source: ${selectedScenarioId ? 'Selected scenario ' + selectedScenarioId : activeScenario ? 'Active scenario ' + activeScenario : 'UI inputs'}`);
    
    return totalContributions;
}

function calculateWithdrawal() {
    // Get input values - use parseGermanNumber for text inputs, parseFloat for sliders
    const retirementCapital = parseGermanNumber(document.getElementById('retirementCapital').value);
    const withdrawalDuration = parseInt(document.getElementById('withdrawalDuration').value);
    const postRetirementReturn = parseFloat(document.getElementById('postRetirementReturn').value) / 100;
    const inflationRate = parseFloat(document.getElementById('withdrawalInflation').value) / 100;
    const includeTax = document.getElementById('withdrawalTaxToggle').classList.contains('active');

    // Calculate total contributions from accumulation phase
    const calculatedTotalContributions = calculateTotalContributionsFromAccumulation();

    // Validation to prevent calculation errors
    if (retirementCapital <= 0 || withdrawalDuration <= 0 || isNaN(postRetirementReturn) || isNaN(inflationRate)) {
        console.warn('Invalid withdrawal parameters detected, using default values');
        return;
    }

    // Ensure contributions don't exceed retirement capital (in case of calculation errors)
    let validatedContributions = Math.min(calculatedTotalContributions, retirementCapital);
    
    // If no contributions were calculated (e.g., no scenario data), use a conservative estimate
    if (calculatedTotalContributions === 0 || validatedContributions === 0) {
        // Conservative fallback: assume 60% of retirement capital is contributions, 40% is gains
        // This is a reasonable assumption for long-term investing
        validatedContributions = retirementCapital * 0.6;
        console.warn('No accumulation data available - using conservative 60/40 cost basis estimate');
    } else if (validatedContributions !== calculatedTotalContributions && calculatedTotalContributions > 0) {
        console.warn('Calculated contributions exceed retirement capital - using fallback calculation');
    }

    // Update display elements with calculated values
    const unrealizedGain = retirementCapital - validatedContributions;
    const totalContributionsElement = document.getElementById('totalContributions');
    const unrealizedGainElement = document.getElementById('unrealizedGain');
    
    if (totalContributionsElement) {
        totalContributionsElement.textContent = formatCurrency(validatedContributions).replace('€', '');
    }
    if (unrealizedGainElement) {
        unrealizedGainElement.textContent = formatCurrency(unrealizedGain).replace('€', '');
    }

    // Additional validation for extreme values
    if (postRetirementReturn < 0 || postRetirementReturn > 0.5) {
        console.warn('Return rate out of reasonable range:', postRetirementReturn);
    }

    try {
        // Calculate withdrawal plan
        const results = calculateWithdrawalPlan(
            retirementCapital, withdrawalDuration, postRetirementReturn, 
            inflationRate, includeTax, validatedContributions
        );

        // Validate results before updating display
        if (results && results.yearlyData && results.yearlyData.length > 0) {
            // Update display
            updateWithdrawalResults(results);
            updateWithdrawalChart(results.yearlyData);
            updateWithdrawalTable(results.yearlyData);
            
            // Update integrated timeline if it's currently visible in withdrawal phase
            if (currentPhase === 'withdrawal') {
                const integratedTimelineView = document.getElementById('integratedTimelineView');
                if (integratedTimelineView && integratedTimelineView.style.display !== 'none') {
                    createIntegratedTimeline();
                }
            }
        } else {
            console.error('Invalid withdrawal calculation results');
        }
    } catch (error) {
        console.error('Error in withdrawal calculation:', error);
        // Fallback: try with slightly adjusted parameters
        setTimeout(() => calculateWithdrawal(), 100);
    }
}

function calculateWithdrawalPlan(initialCapital, duration, annualReturn, inflationRate, includeTax, userDefinedTotalContributions) {
    const TAX_FREE_ALLOWANCE = 1000; // Sparerpauschbetrag
    const TAX_RATE = 0.25; // Abgeltungssteuer
    
    console.log(`🧮 Starting direct mathematical calculation...`);
    console.log(`Parameters: Capital=€${initialCapital.toLocaleString()}, Duration=${duration}y, Return=${(annualReturn*100).toFixed(1)}%, Inflation=${(inflationRate*100).toFixed(1)}%`);
    console.log(`Cost Basis: €${userDefinedTotalContributions.toLocaleString()}, Unrealized Gains: €${(initialCapital - userDefinedTotalContributions).toLocaleString()}`);
    
    // Step 1: Calculate base withdrawal using direct annuity formula
    let baseAnnualWithdrawal = calculateDirectAnnuityPayment(initialCapital, duration, annualReturn);
    console.log(`📊 Base annuity calculation: €${baseAnnualWithdrawal.toFixed(2)}/year (€${(baseAnnualWithdrawal/12).toFixed(2)}/month)`);
    
    // Step 2: Adjust withdrawal amount to achieve exactly 0€ at the end
    // This is needed for both tax and no-tax scenarios due to inflation adjustments
    if (includeTax) {
        baseAnnualWithdrawal = adjustForTaxes(baseAnnualWithdrawal, initialCapital, duration, annualReturn, inflationRate, TAX_FREE_ALLOWANCE, TAX_RATE, userDefinedTotalContributions);
        console.log(`💰 Tax-adjusted withdrawal: €${baseAnnualWithdrawal.toFixed(2)}/year (€${(baseAnnualWithdrawal/12).toFixed(2)}/month)`);
    } else {
        // Even without taxes, we need to adjust for inflation effects
        baseAnnualWithdrawal = adjustForInflationAndReturns(baseAnnualWithdrawal, initialCapital, duration, annualReturn, inflationRate, includeTax, userDefinedTotalContributions);
        console.log(`📈 Inflation-adjusted withdrawal: €${baseAnnualWithdrawal.toFixed(2)}/year (€${(baseAnnualWithdrawal/12).toFixed(2)}/month)`);
    }
    
    // Step 3: Run final simulation to get complete results
    const finalResults = simulateWithdrawal(initialCapital, duration, annualReturn, inflationRate, includeTax, baseAnnualWithdrawal, userDefinedTotalContributions);
    console.log(`✅ Final portfolio value: €${finalResults.finalCapital.toFixed(2)} (Target: €0)`);
    
    // Step 4: Provide calculation summary
    printCalculationSummary(initialCapital, duration, annualReturn, inflationRate, includeTax, baseAnnualWithdrawal, finalResults);
    
    return finalResults;
}

/**
 * Print a detailed summary of the withdrawal calculation for user understanding
 */
function printCalculationSummary(initialCapital, duration, annualReturn, inflationRate, includeTax, baseAnnualWithdrawal, results) {
    console.log(`\n📋 ===== WITHDRAWAL CALCULATION SUMMARY =====`);
    console.log(`💼 Starting Portfolio: €${initialCapital.toLocaleString()}`);
    console.log(`⏱️ Withdrawal Period: ${duration} years`);
    console.log(`📈 Expected Annual Return: ${(annualReturn*100).toFixed(1)}%`);
    console.log(`📊 Inflation Rate: ${(inflationRate*100).toFixed(1)}%`);

    console.log(`🇩🇪 German Taxes Applied: ${includeTax ? 'Yes' : 'No'}`);
    console.log(`\n💳 WITHDRAWAL AMOUNTS:`);
    console.log(`   Year 1 Annual Withdrawal: €${baseAnnualWithdrawal.toFixed(2)}`);
    console.log(`   Year 1 Monthly Withdrawal: €${(baseAnnualWithdrawal/12).toFixed(2)}`);
    console.log(`   Final Year Withdrawal: €${(baseAnnualWithdrawal * Math.pow(1 + inflationRate, duration - 1)).toFixed(2)}`);
    console.log(`\n💼 FINAL RESULTS:`);
    console.log(`   Portfolio End Value: €${results.finalCapital.toFixed(2)}`);
    console.log(`   Total Taxes Paid: €${results.totalTaxesPaid.toFixed(2)}`);
    console.log(`   Average Monthly Net: €${results.monthlyNetWithdrawal.toFixed(2)}`);
    console.log(`   Real Purchasing Power: €${results.realPurchasingPower.toFixed(2)} (in today's money)`);
    
    // Calculate some additional insights
    const totalWithdrawn = results.yearlyData.reduce((sum, year) => sum + year.grossWithdrawal, 0);
    const effectiveYield = totalWithdrawn / initialCapital;
    const realRate = calculateRealInterestRate(annualReturn, inflationRate);
    
    console.log(`\n🧮 CALCULATION INSIGHTS:`);
    console.log(`   Total Amount Withdrawn: €${totalWithdrawn.toFixed(2)}`);
    console.log(`   Effective Yield: ${(effectiveYield*100).toFixed(1)}% of initial capital`);
    console.log(`   Real Interest Rate: ${(realRate*100).toFixed(2)}% (inflation-adjusted)`);
    console.log(`   Tax Efficiency: ${((1 - results.totalTaxesPaid/totalWithdrawn)*100).toFixed(1)}%`);
    
    if (Math.abs(results.finalCapital) > 100) {
        console.warn(`⚠️ WARNING: Portfolio not fully depleted! Remaining: €${results.finalCapital.toFixed(2)}`);
        console.warn(`   This suggests the calculation may need refinement.`);
    } else if (Math.abs(results.finalCapital) < 1) {
        console.log(`✅ EXCELLENT: Portfolio depleted within €${Math.abs(results.finalCapital).toFixed(2)} of target.`);
    }
    
    console.log(`====================================\n`);
}

/**
 * Calculate exact annuity payment using direct mathematical formula
 * Formula: PMT = PV × [r(1+r)^n] / [(1+r)^n - 1]
 * 
 * This calculates the payment amount that will exactly deplete the present value
 * over the specified number of periods at the given interest rate.
 */
function calculateDirectAnnuityPayment(presentValue, periods, interestRate) {
    // Input validation
    if (presentValue <= 0) throw new Error('Present value must be positive');
    if (periods <= 0) throw new Error('Number of periods must be positive');
    if (isNaN(interestRate)) throw new Error('Interest rate must be a valid number');
    
    // Handle special case: zero or very low interest rate
    if (Math.abs(interestRate) < 0.0001) {
        console.log(`🔢 Near-zero interest rate (${(interestRate*100).toFixed(4)}%), using simple division`);
        return presentValue / periods; // Simple division when no meaningful growth
    }
    
    // Handle negative interest rates (deflation scenario)
    if (interestRate < 0) {
        console.log(`⚠️ Negative interest rate detected: ${(interestRate*100).toFixed(2)}%`);
        // For negative rates, the formula still works but results in lower payments
    }
    
    // Standard annuity formula
    const onePlusR = 1 + interestRate;
    const onePlusRToPowerN = Math.pow(onePlusR, periods);
    const numerator = interestRate * onePlusRToPowerN;
    const denominator = onePlusRToPowerN - 1;
    
    // Avoid division by zero in edge cases
    if (Math.abs(denominator) < 1e-10) {
        console.log(`⚠️ Denominator very close to zero, using fallback calculation`);
        return presentValue / periods;
    }
    
    const annuityPayment = presentValue * (numerator / denominator);
    
    console.log(`🔢 Direct annuity formula:`);
    console.log(`   Present Value: €${presentValue.toLocaleString()}`);
    console.log(`   Interest Rate: ${(interestRate*100).toFixed(3)}% per period`);
    console.log(`   Number of Periods: ${periods}`);
    console.log(`   Factor: ${(numerator/denominator).toFixed(6)}`);
    console.log(`   Annual Payment: €${annuityPayment.toFixed(2)}`);
    console.log(`   Monthly Payment: €${(annuityPayment/12).toFixed(2)}`);
    
    // Sanity check: payment should be reasonable
    const minExpected = presentValue / (periods * 2); // Very conservative minimum
    const maxExpected = presentValue; // Maximum would be paying entire amount in first year
    
    if (annuityPayment < minExpected || annuityPayment > maxExpected) {
        console.warn(`⚠️ Calculated payment seems unreasonable: €${annuityPayment.toFixed(2)}`);
        console.warn(`   Expected range: €${minExpected.toFixed(2)} - €${maxExpected.toFixed(2)}`);
    }
    
    return annuityPayment;
}

/**
 * Calculate the real interest rate adjusted for inflation
 * Real Rate = (1 + Nominal Rate) / (1 + Inflation Rate) - 1
 */
function calculateRealInterestRate(nominalRate, inflationRate) {
    return (1 + nominalRate) / (1 + inflationRate) - 1;
}

/**
 * Adjust withdrawal amount for inflation and returns when taxes are disabled
 * This solves for the withdrawal amount that achieves zero final balance without taxes
 */
function adjustForInflationAndReturns(initialGuess, presentValue, periods, interestRate, inflationRate, includeTax, userDefinedTotalContributions) {
    console.log(`📈 Adjusting for inflation effects without taxes`);
    
    let withdrawal = initialGuess;
    let previousWithdrawal = withdrawal;
    
    // Newton-Raphson iteration
    for (let iteration = 0; iteration < 20; iteration++) {
        // Calculate final capital with current withdrawal guess
        const simulation = simulateWithdrawal(presentValue, periods, interestRate, inflationRate, includeTax, withdrawal, userDefinedTotalContributions);
        const finalCapital = simulation.finalCapital;
        
        // If we're close enough to zero, we're done
        if (Math.abs(finalCapital) < 1) {
            console.log(`🎯 Inflation adjustment converged in ${iteration} iterations: Final capital = €${finalCapital.toFixed(2)}`);
            return withdrawal;
        }
        
        // Calculate derivative (numerical approximation)
        const deltaWithdrawal = withdrawal * 0.001; // 0.1% change
        const simulation2 = simulateWithdrawal(presentValue, periods, interestRate, inflationRate, includeTax, withdrawal + deltaWithdrawal, userDefinedTotalContributions);
        const finalCapital2 = simulation2.finalCapital;
        const derivative = (finalCapital2 - finalCapital) / deltaWithdrawal;
        
        // Newton-Raphson update: x_new = x_old - f(x)/f'(x)
        // We want f(x) = finalCapital = 0, so we adjust withdrawal
        if (Math.abs(derivative) > 0.001) {
            previousWithdrawal = withdrawal;
            withdrawal = withdrawal - (finalCapital / derivative);
            
            // Prevent unreasonable changes
            const maxChange = initialGuess * 0.2; // Max 20% change per iteration
            if (Math.abs(withdrawal - previousWithdrawal) > maxChange) {
                withdrawal = previousWithdrawal + Math.sign(withdrawal - previousWithdrawal) * maxChange;
            }
            
            // Ensure withdrawal stays positive
            withdrawal = Math.max(withdrawal, initialGuess * 0.1);
            
            console.log(`🔄 Iteration ${iteration}: Withdrawal = €${withdrawal.toFixed(2)}, Final capital = €${finalCapital.toFixed(2)}`);
        } else {
            console.log(`⚠️ Derivative too small, stopping iteration`);
            break;
        }
        
        // Check for convergence in withdrawal amount
        if (Math.abs(withdrawal - previousWithdrawal) < 0.01) {
            console.log(`✅ Withdrawal amount converged in ${iteration} iterations`);
            break;
        }
    }
    
    return withdrawal;
}

/**
 * Adjust withdrawal amount for German taxes using Newton-Raphson method
 * This solves for the withdrawal amount that achieves zero final balance after taxes
 */
function adjustForTaxes(initialGuess, presentValue, periods, interestRate, inflationRate, taxFreeAllowance, taxRate, userDefinedTotalContributions) {
    console.log(`🇩🇪 Adjusting for German taxes (${(taxRate*100).toFixed(3)}% on gains above €${taxFreeAllowance})`);
    
    let withdrawal = initialGuess;
    let previousWithdrawal = withdrawal;
    
    // Newton-Raphson iteration
    for (let iteration = 0; iteration < 20; iteration++) {
        // Calculate final capital with current withdrawal guess
        const simulation = simulateWithdrawal(presentValue, periods, interestRate, inflationRate, true, withdrawal, userDefinedTotalContributions);
        const finalCapital = simulation.finalCapital;
        
        // If we're close enough to zero, we're done
        if (Math.abs(finalCapital) < 1) {
            console.log(`🎯 Tax adjustment converged in ${iteration} iterations: Final capital = €${finalCapital.toFixed(2)}`);
            return withdrawal;
        }
        
        // Calculate derivative (numerical approximation)
        const deltaWithdrawal = withdrawal * 0.001; // 0.1% change
        const simulation2 = simulateWithdrawal(presentValue, periods, interestRate, inflationRate, true, withdrawal + deltaWithdrawal, userDefinedTotalContributions);
        const finalCapital2 = simulation2.finalCapital;
        const derivative = (finalCapital2 - finalCapital) / deltaWithdrawal;
        
        // Newton-Raphson update: x_new = x_old - f(x)/f'(x)
        // We want f(x) = finalCapital = 0, so we adjust withdrawal
        if (Math.abs(derivative) > 0.001) {
            previousWithdrawal = withdrawal;
            withdrawal = withdrawal - (finalCapital / derivative);
            
            // Prevent unreasonable changes
            const maxChange = initialGuess * 0.2; // Max 20% change per iteration
            if (Math.abs(withdrawal - previousWithdrawal) > maxChange) {
                withdrawal = previousWithdrawal + Math.sign(withdrawal - previousWithdrawal) * maxChange;
            }
            
            // Ensure withdrawal stays positive
            withdrawal = Math.max(withdrawal, initialGuess * 0.1);
            
            console.log(`🔄 Iteration ${iteration}: Withdrawal = €${withdrawal.toFixed(2)}, Final capital = €${finalCapital.toFixed(2)}`);
        } else {
            console.log(`⚠️ Derivative too small, stopping iteration`);
            break;
        }
        
        // Check for convergence in withdrawal amount
        if (Math.abs(withdrawal - previousWithdrawal) < 0.01) {
            console.log(`✅ Withdrawal amount converged in ${iteration} iterations`);
            break;
        }
    }
    
    return withdrawal;
}

function simulateWithdrawal(initialCapital, duration, annualReturn, inflationRate, includeTax, baseAnnualWithdrawal, userDefinedTotalContributions = 0) {
    const TAX_FREE_ALLOWANCE = 1000; // Annual tax-free allowance for capital gains
    const BASE_TAX_RATE = 0.25; // 25% Abgeltungssteuer
    const EFFECTIVE_TAX_RATE = BASE_TAX_RATE; // 25%
    const TEILFREISTELLUNG_EQUITY = 0.30; // 30% partial exemption for equity ETFs
    
    // Input validation with better error messages
    if (initialCapital <= 0) throw new Error('Initial capital must be positive');
    if (duration <= 0) throw new Error('Duration must be positive');
    if (isNaN(annualReturn)) throw new Error('Annual return must be a valid number');
    if (isNaN(baseAnnualWithdrawal) || baseAnnualWithdrawal <= 0) throw new Error('Base annual withdrawal must be positive');
    
    let capital = initialCapital;
    let remainingCostBasis = userDefinedTotalContributions || initialCapital * 0.6; // Track remaining cost basis
    let totalTaxesPaid = 0;
    let totalNetWithdrawals = 0;
    let annualTaxFreeAllowanceUsed = 0; // Track annual tax-free allowance usage (resets each year)
    
    // Get Teilfreistellung rate directly from withdrawal-specific UI element
    // In withdrawal phase, Teilfreistellung is always available when taxes are enabled
    let teilfreistellungRate = 0;
    if (includeTax) {
        // Get the withdrawal-specific Teilfreistellung rate setting
        const teilfreistellungRateElement = document.getElementById('withdrawalTeilfreistellungRate');
        if (teilfreistellungRateElement) {
            teilfreistellungRate = parseFloat(teilfreistellungRateElement.value) / 100;
        } else {
            // Fallback to 30% for equity ETFs if no specific setting
            teilfreistellungRate = TEILFREISTELLUNG_EQUITY; // 0.30
        }
    }
    
    console.log(`💰 Tax calculation setup (Proportional Cost Basis Method):`);
    console.log(`   Initial Capital: €${initialCapital.toLocaleString()}`);
    console.log(`   Initial Cost Basis: €${remainingCostBasis.toLocaleString()}`);
    console.log(`   Initial Embedded Gains: €${(initialCapital - remainingCostBasis).toLocaleString()}`);
    console.log(`   Teilfreistellung Rate: ${(teilfreistellungRate * 100).toFixed(1)}%`);
    console.log(`   Tax-Free Allowance: €${TAX_FREE_ALLOWANCE} per year`);
    
    const yearlyData = [];
    
    for (let year = 1; year <= duration; year++) {
        const startCapital = capital;
        
        // Step 1: Apply investment returns for the year
        const clampedReturn = Math.max(-0.5, Math.min(0.5, annualReturn)); // Clamp return rate for safety
        const capitalAfterReturns = startCapital * (1 + clampedReturn);
        
        // Step 2: Calculate inflation-adjusted withdrawal for this specific year
        const clampedInflation = Math.max(0, Math.min(0.2, inflationRate)); // Clamp inflation rate
        const inflationMultiplier = Math.pow(1 + clampedInflation, year - 1);
        const inflationAdjustedWithdrawal = baseAnnualWithdrawal * inflationMultiplier;
        
        // Step 3: Use the calculated withdrawal amount (trust the mathematical formula)
        const grossAnnualWithdrawal = inflationAdjustedWithdrawal;
        
        // Step 4: Calculate German taxes using proportional cost basis method
        let taxesPaid = 0;
        
        if (includeTax && grossAnnualWithdrawal > 0) {
            // Step 4.1: Calculate cost basis of shares being sold (proportional method)
            const costBasisOut = remainingCostBasis * (grossAnnualWithdrawal / capitalAfterReturns);
            
            // Step 4.2: Calculate realized gain
            const realizedGain = Math.max(0, grossAnnualWithdrawal - costBasisOut);
            
            // Step 4.3: Update remaining cost basis
            remainingCostBasis = Math.max(0, remainingCostBasis - costBasisOut);
            
            // Step 4.4: Apply Teilfreistellung (30% of gains from equity ETFs are tax-free)
            const taxableGainBeforeAllowance = realizedGain * (1 - teilfreistellungRate);
            
            // Step 4.5: Apply annual tax-free allowance (€1,000 per year)
            const remainingAllowance = Math.max(0, TAX_FREE_ALLOWANCE - annualTaxFreeAllowanceUsed);
            const taxableGainAfterAllowance = Math.max(0, taxableGainBeforeAllowance - remainingAllowance);
            const allowanceUsed = Math.min(remainingAllowance, taxableGainBeforeAllowance);
            annualTaxFreeAllowanceUsed += allowanceUsed;
            
            // Step 4.6: Calculate final tax (25% Abgeltungssteuer)
            taxesPaid = taxableGainAfterAllowance * EFFECTIVE_TAX_RATE;
            
            console.log(`📊 Year ${year} Tax Calculation (Proportional Cost Basis):`);
            console.log(`   Portfolio before withdrawal: €${capitalAfterReturns.toFixed(2)}`);
            console.log(`   Gross Withdrawal: €${grossAnnualWithdrawal.toFixed(2)}`);
            console.log(`   Cost Basis out: €${costBasisOut.toFixed(2)}`);
            console.log(`   Realized Gain: €${realizedGain.toFixed(2)}`);
            console.log(`   Remaining Cost Basis: €${remainingCostBasis.toFixed(2)}`);
            console.log(`   Taxable Gain (after Teilfreistellung ${(teilfreistellungRate*100).toFixed(0)}%): €${taxableGainBeforeAllowance.toFixed(2)}`);
            console.log(`   Allowance Used: €${allowanceUsed.toFixed(2)} (remaining: €${(remainingAllowance - allowanceUsed).toFixed(2)})`);
            console.log(`   Final Taxable Amount: €${taxableGainAfterAllowance.toFixed(2)}`);
            console.log(`   Tax Paid (25%): €${taxesPaid.toFixed(2)}`);
        }
        
        // Step 5: Calculate net withdrawal after taxes
        const netAnnualWithdrawal = Math.max(0, grossAnnualWithdrawal - taxesPaid);
        
        // Step 6: Update portfolio capital (allow negative for mathematical accuracy)
        capital = capitalAfterReturns - grossAnnualWithdrawal;
        
        // Step 7: Calculate real value (constant purchasing power)
        const realWithdrawal = grossAnnualWithdrawal / inflationMultiplier;
        
        // Step 8: Accumulate totals
        totalTaxesPaid += taxesPaid;
        totalNetWithdrawals += netAnnualWithdrawal;
        
        // Step 9: Store yearly data for display and analysis
        yearlyData.push({
            year: year,
            startCapital: startCapital,
            capitalAfterReturns: capitalAfterReturns,
            grossWithdrawal: grossAnnualWithdrawal,
            taxesPaid: taxesPaid,
            netWithdrawal: netAnnualWithdrawal,
            endCapital: capital, // Allow negative values for accurate calculation
            realValue: realWithdrawal,
            inflationMultiplier: inflationMultiplier,
            remainingCostBasis: remainingCostBasis, // Track cost basis over time
            teilfreistellungApplied: teilfreistellungRate * 100, // For debugging/display
            allowanceUsedThisYear: annualTaxFreeAllowanceUsed // Track allowance usage
        });
        
        // Step 10: Reset annual allowance for next year (German tax law)
        annualTaxFreeAllowanceUsed = 0;
        
        // The mathematical calculation should ensure the portfolio lasts exactly the specified duration
        // If capital goes negative, it's due to rounding errors - we'll handle this at the end
    }
    
    // Calculate correct average monthly values over the entire withdrawal period
    const totalMonths = duration * 12;
    const totalGrossWithdrawn = yearlyData.reduce((sum, year) => sum + year.grossWithdrawal, 0);
    const totalNetWithdrawn = yearlyData.reduce((sum, year) => sum + year.netWithdrawal, 0);
    
    // True averages over the entire period
    const avgGrossNominal = totalGrossWithdrawn / totalMonths;
    const avgTaxNominal = totalTaxesPaid / totalMonths;
    const avgNetNominal = totalNetWithdrawn / totalMonths;
    
    // First year values for comparison
    const firstYearGross = baseAnnualWithdrawal / 12;
    const firstYearTax = yearlyData.length > 0 ? yearlyData[0].taxesPaid / 12 : 0;
    const firstYearNet = yearlyData.length > 0 ? yearlyData[0].netWithdrawal / 12 : firstYearGross - firstYearTax;
    
    console.log(`💰 Monthly Withdrawal Calculations (Corrected):`);
    console.log(`- First Year Monthly Gross: €${firstYearGross.toFixed(2)}`);
    console.log(`- First Year Monthly Tax: €${firstYearTax.toFixed(2)}`);
    console.log(`- First Year Monthly Net: €${firstYearNet.toFixed(2)}`);
    console.log(`- Average Monthly Gross (${duration} years): €${avgGrossNominal.toFixed(2)}`);
    console.log(`- Average Monthly Tax (${duration} years): €${avgTaxNominal.toFixed(2)}`);
    console.log(`- Average Monthly Net (${duration} years): €${avgNetNominal.toFixed(2)}`);
    
    // Real purchasing power calculation:
    // The real purchasing power is the constant purchasing power throughout withdrawal
    // expressed in today's money (year 0). Since withdrawals are inflation-adjusted,
    // the real purchasing power is simply the first year's withdrawal amount.
    const realPurchasingPowerMonthly = firstYearGross; // Already in today's purchasing power
    const realPurchasingPower = realPurchasingPowerMonthly;
    
    // Handle small rounding errors in final capital
    if (Math.abs(capital) < 1) {
        capital = 0; // Consider it exactly zero if within €1
    }
    
    console.log(`\n🏁 ETF Withdrawal Tax Calculation Summary:`);
    console.log(`- Initial Portfolio: €${initialCapital.toLocaleString()}`);
    console.log(`- Initial Cost Basis: €${(userDefinedTotalContributions || initialCapital * 0.6).toLocaleString()}`);
    console.log(`- Final Remaining Cost Basis: €${remainingCostBasis.toFixed(2)}`);
    console.log(`- Teilfreistellung applied: ${teilfreistellungRate * 100}%`);
    console.log(`- Effective tax rate on taxable gains: ${EFFECTIVE_TAX_RATE * 100}%`);
    console.log(`- Total taxes paid over ${duration} years: €${totalTaxesPaid.toFixed(2)}`);
    console.log(`- Average annual tax: €${(totalTaxesPaid / duration).toFixed(2)}`);
    console.log(`- Tax efficiency: ${((1 - totalTaxesPaid / (yearlyData.reduce((sum, year) => sum + year.grossWithdrawal, 0))) * 100).toFixed(1)}%`);
    
    return {
        monthlyGrossWithdrawal: avgGrossNominal,        // True average monthly gross
        monthlyNetWithdrawal: avgNetNominal,            // True average monthly net
        firstYearMonthlyGross: firstYearGross,          // First year monthly gross
        firstYearMonthlyNet: firstYearNet,              // First year monthly net
        averageMonthlyTax: avgTaxNominal,               // True average monthly tax
        totalTaxesPaid: totalTaxesPaid,
        realPurchasingPower: realPurchasingPower,
        yearlyData,
        finalCapital: capital
    };
}

function updateWithdrawalResults(results) {
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

function updateWithdrawalChart(yearlyData) {
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

function updateWithdrawalTable(yearlyData) {
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

 function setupBudgetListeners() {
    // Income inputs
    const incomeInputs = ['salary', 'sideIncome', 'otherIncome'];
    incomeInputs.forEach(id => {
        document.getElementById(id).addEventListener('input', calculateBudget);
    });

    // Expense inputs
    const expenseInputs = ['rent', 'utilities', 'health', 'insurance', 'internet', 'gez', 
                         'food', 'transport', 'leisure', 'clothing', 'subscriptions', 'miscellaneous'];
    expenseInputs.forEach(id => {
        document.getElementById(id).addEventListener('input', calculateBudget);
    });

    // Period toggles
    setupPeriodToggle('incomePeriodToggle', 'income');
    setupPeriodToggle('fixedPeriodToggle', 'fixed');
    setupPeriodToggle('variablePeriodToggle', 'variable');

    // Savings allocation controls
    document.getElementById('fixedAmount').addEventListener('click', function() {
        setSavingsMode('fixed');
    });

    document.getElementById('percentage').addEventListener('click', function() {
        setSavingsMode('percentage');
    });

                 document.getElementById('savingsAmount').addEventListener('input', function() {
         budgetData.savings.amount = parseGermanNumber(this.value);
         updateSavingsDisplay();
     });

     document.getElementById('savingsPercentage').addEventListener('input', function() {
         const percentage = parseFloat(this.value);
         budgetData.savings.percentage = percentage;
         document.getElementById('savingsPercentageValue').textContent = percentage + '%';
         updateSavingsDisplay();
     });

                 // Apply savings rate to accumulation phase
     document.getElementById('applySavingsRate').addEventListener('click', function() {
         const savingsText = document.getElementById('finalSavingsAmount').textContent.replace('€', '').trim();
         const savingsAmount = parseGermanNumber(savingsText);
         document.getElementById(`monthlySavings_${activeScenario}`).value = formatGermanNumber(savingsAmount, 0).replace(',00', '');
        
        // Switch to accumulation phase
        document.getElementById('accumulationPhase').click();
        recalculateAll();
        
        // Show success notification
        showNotification('✅ Sparrate übernommen!', `Die Sparrate von ${formatCurrency(savingsAmount)} wurde erfolgreich in die Ansparphase übernommen.`, 'success');
    });



    // Profile management
            document.getElementById('saveProfile').addEventListener('click', openSaveProfileModal);
document.getElementById('loadProfile').addEventListener('click', openLoadProfileModal);
document.getElementById('manageProfiles').addEventListener('click', openProfileManager);

// Save Profile Modal Event Listeners
document.getElementById('closeSaveProfileModal').addEventListener('click', closeSaveProfileModal);
document.getElementById('cancelSaveProfile').addEventListener('click', closeSaveProfileModal);
document.getElementById('confirmSaveProfile').addEventListener('click', confirmSaveProfile);
document.getElementById('profileName').addEventListener('input', updateProfilePreview);
document.getElementById('profileDescription').addEventListener('input', updateProfilePreview);

// Load Profile Modal Event Listeners
document.getElementById('closeLoadProfileModal').addEventListener('click', closeLoadProfileModal);
document.getElementById('cancelLoadProfile').addEventListener('click', closeLoadProfileModal);

// Close modals when clicking outside
window.addEventListener('click', function(event) {
    const saveModal = document.getElementById('saveProfileModal');
    const loadModal = document.getElementById('loadProfileModal');
    
    if (event.target === saveModal) {
        closeSaveProfileModal();
    }
    if (event.target === loadModal) {
        closeLoadProfileModal();
    }
});
    document.getElementById('resetBudget').addEventListener('click', resetBudget);
    
    // Profile modal
    document.getElementById('closeProfileModal').addEventListener('click', closeProfileManager);
    document.getElementById('profileModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeProfileManager();
        }
    });
}

         function calculateBudget() {
     // Calculate income with German number parsing and period conversion
     const incomeData = {
         salary: parseGermanNumber(document.getElementById('salary').value),
         sideIncome: parseGermanNumber(document.getElementById('sideIncome').value),
         otherIncome: parseGermanNumber(document.getElementById('otherIncome').value)
     };

     // Convert to monthly amounts based on period selection
     const monthlyIncome = convertToMonthly(incomeData, budgetData.periods.income);
     const totalIncome = Object.values(monthlyIncome).reduce((sum, val) => sum + val, 0);

     // Update income total display
     document.getElementById('incomeTotal').textContent = formatCurrency(totalIncome);

     // Calculate fixed expenses with German number parsing and period conversion
     const fixedExpenses = {
         rent: parseGermanNumber(document.getElementById('rent').value),
         utilities: parseGermanNumber(document.getElementById('utilities').value),
         health: parseGermanNumber(document.getElementById('health').value),
         insurance: parseGermanNumber(document.getElementById('insurance').value),
         internet: parseGermanNumber(document.getElementById('internet').value),
         gez: parseGermanNumber(document.getElementById('gez').value)
     };

     // Calculate variable expenses with German number parsing and period conversion
     const variableExpenses = {
         food: parseGermanNumber(document.getElementById('food').value),
         transport: parseGermanNumber(document.getElementById('transport').value),
         leisure: parseGermanNumber(document.getElementById('leisure').value),
         clothing: parseGermanNumber(document.getElementById('clothing').value),
         subscriptions: parseGermanNumber(document.getElementById('subscriptions').value),
         miscellaneous: parseGermanNumber(document.getElementById('miscellaneous').value)
     };

     // Convert to monthly amounts based on period selection
     const monthlyFixedExpenses = convertToMonthly(fixedExpenses, budgetData.periods.fixed);
     const monthlyVariableExpenses = convertToMonthly(variableExpenses, budgetData.periods.variable);

     // Calculate totals
     const fixedTotal = Object.values(monthlyFixedExpenses).reduce((sum, val) => sum + val, 0);
     const variableTotal = Object.values(monthlyVariableExpenses).reduce((sum, val) => sum + val, 0);
     const totalExpenses = fixedTotal + variableTotal;

     // Update category totals display
     document.getElementById('fixedTotal').textContent = formatCurrency(fixedTotal);
     document.getElementById('variableTotal').textContent = formatCurrency(variableTotal);

    const remainingBudget = totalIncome - totalExpenses;

    // Update displays
    document.getElementById('totalIncome').textContent = formatCurrency(totalIncome);
    document.getElementById('totalExpenses').textContent = formatCurrency(totalExpenses);
    document.getElementById('remainingBudget').textContent = formatCurrency(remainingBudget);

    // Update remaining budget color
    const remainingDisplay = document.querySelector('.remaining-display');
    if (remainingBudget < 0) {
        remainingDisplay.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
    } else if (remainingBudget < 200) {
        remainingDisplay.style.background = 'linear-gradient(135deg, #f39c12, #e67e22)';
    } else {
        remainingDisplay.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';
    }

    // Store data
    budgetData.totalIncome = totalIncome;
    budgetData.totalExpenses = totalExpenses;
    budgetData.remainingBudget = remainingBudget;

    updateSavingsDisplay();
    updateBudgetPieChart(monthlyFixedExpenses, monthlyVariableExpenses, remainingBudget);
}

function setSavingsMode(mode) {
    budgetData.savings.mode = mode;
    
    const fixedBtn = document.getElementById('fixedAmount');
    const percentageBtn = document.getElementById('percentage');
    const fixedControl = document.getElementById('fixedAmountControl');
    const percentageControl = document.getElementById('percentageControl');

    if (mode === 'fixed') {
        fixedBtn.classList.add('active');
        percentageBtn.classList.remove('active');
        fixedControl.style.display = 'block';
        percentageControl.style.display = 'none';
    } else {
        fixedBtn.classList.remove('active');
        percentageBtn.classList.add('active');
        fixedControl.style.display = 'none';
        percentageControl.style.display = 'block';
    }

    updateSavingsDisplay();
}

function updateSavingsDisplay() {
    let finalSavingsAmount = 0;

    if (budgetData.savings.mode === 'fixed') {
        finalSavingsAmount = budgetData.savings.amount;
    } else {
        finalSavingsAmount = (budgetData.remainingBudget || 0) * (budgetData.savings.percentage / 100);
    }

    // Ensure savings don't exceed remaining budget
    finalSavingsAmount = Math.min(finalSavingsAmount, budgetData.remainingBudget || 0);
    finalSavingsAmount = Math.max(0, finalSavingsAmount);

    document.getElementById('finalSavingsAmount').textContent = formatCurrency(finalSavingsAmount);

    // Update savings result color
    const savingsResult = document.querySelector('.savings-result');
    if (finalSavingsAmount > (budgetData.remainingBudget || 0)) {
        savingsResult.style.background = '#e74c3c';
    } else if (finalSavingsAmount === 0) {
        savingsResult.style.background = '#95a5a6';
    } else {
        savingsResult.style.background = '#27ae60';
    }
}

// ==================== Save Profile Modal Functions ====================
function openSaveProfileModal() {
    document.getElementById('saveProfileModal').style.display = 'block';
    document.getElementById('profileName').value = '';
    document.getElementById('profileDescription').value = '';
    updateProfilePreview();
    
    // Focus on profile name input
    setTimeout(() => {
        document.getElementById('profileName').focus();
    }, 100);
}

function closeSaveProfileModal() {
    document.getElementById('saveProfileModal').style.display = 'none';
}

function updateProfilePreview() {
    const previewContainer = document.getElementById('profilePreview');
    
    // Get current values
    const totalIncome = budgetData.totalIncome || 0;
    const totalExpenses = budgetData.totalExpenses || 0;
    const savingsAmount = budgetData.savings.amount || 0;
    const savingsMode = budgetData.savings.mode || 'fixed';
    
    previewContainer.innerHTML = `
        <div class="preview-item">
            <span class="preview-label">💰 Gesamteinkommen</span>
            <span class="preview-value">€${totalIncome.toLocaleString('de-DE')}</span>
        </div>
        <div class="preview-item">
            <span class="preview-label">💸 Gesamtausgaben</span>
            <span class="preview-value">€${totalExpenses.toLocaleString('de-DE')}</span>
        </div>
        <div class="preview-item">
            <span class="preview-label">💾 Sparrate</span>
            <span class="preview-value">€${savingsAmount.toLocaleString('de-DE')}</span>
        </div>
        <div class="preview-item">
            <span class="preview-label">📊 Sparmodus</span>
            <span class="preview-value">${savingsMode === 'fixed' ? 'Fester Betrag' : 'Prozentsatz'}</span>
        </div>
        <div class="preview-item">
            <span class="preview-label">📅 Erstellt</span>
            <span class="preview-value">${new Date().toLocaleDateString('de-DE')}</span>
        </div>
        <div class="preview-item">
            <span class="preview-label">🎯 Verfügbar</span>
            <span class="preview-value">€${Math.max(0, totalIncome - totalExpenses).toLocaleString('de-DE')}</span>
        </div>
    `;
    
    // Enable/disable save button based on profile name
    const saveBtn = document.getElementById('confirmSaveProfile');
    const profileName = document.getElementById('profileName').value.trim();
    saveBtn.disabled = profileName.length === 0;
}

function confirmSaveProfile() {
    const profileName = document.getElementById('profileName').value.trim();
    const profileDescription = document.getElementById('profileDescription').value.trim();
    
    if (!profileName) {
        alert('❌ Bitte geben Sie einen Profilnamen ein.');
        return;
    }
    
    // Check if profile already exists
    if (localStorage.getItem('budgetProfile_' + profileName)) {
        if (!confirm(`⚠️ Ein Profil mit dem Namen "${profileName}" existiert bereits. Möchten Sie es überschreiben?`)) {
            return;
        }
    }
    
    const profile = {
        name: profileName,
        description: profileDescription,
        createdAt: new Date().toISOString(),
        income: {
            salary: document.getElementById('salary').value,
            sideIncome: document.getElementById('sideIncome').value,
            otherIncome: document.getElementById('otherIncome').value
        },
        expenses: {
            rent: document.getElementById('rent').value,
            utilities: document.getElementById('utilities').value,
            health: document.getElementById('health').value,
            insurance: document.getElementById('insurance').value,
            internet: document.getElementById('internet').value,
            gez: document.getElementById('gez').value,
            food: document.getElementById('food').value,
            transport: document.getElementById('transport').value,
            leisure: document.getElementById('leisure').value,
            clothing: document.getElementById('clothing').value,
            subscriptions: document.getElementById('subscriptions').value,
            miscellaneous: document.getElementById('miscellaneous').value
        },
        savings: budgetData.savings,
        periods: budgetData.periods,
        budgetData: {
            totalIncome: budgetData.totalIncome,
            totalExpenses: budgetData.totalExpenses
        }
    };

    localStorage.setItem('budgetProfile_' + profileName, JSON.stringify(profile));
    closeSaveProfileModal();
    
    // Show success message with nice styling
    showNotification('✅ Profil erfolgreich gespeichert!', `Das Profil "${profileName}" wurde erfolgreich gespeichert.`, 'success');
}

// ==================== Load Profile Modal Functions ====================
function openLoadProfileModal() {
    document.getElementById('loadProfileModal').style.display = 'block';
    loadProfilesForModal();
}

function closeLoadProfileModal() {
    document.getElementById('loadProfileModal').style.display = 'none';
}

function loadProfilesForModal() {
    const profileList = document.getElementById('loadProfileList');
    const profiles = [];
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('budgetProfile_')) {
            const profileData = JSON.parse(localStorage.getItem(key));
            profiles.push({
                key: key,
                name: key.replace('budgetProfile_', ''),
                data: profileData
            });
        }
    }

    if (profiles.length === 0) {
        profileList.innerHTML = `
            <div class="no-profiles">
                <div class="no-profiles-icon">📂</div>
                <h4>Keine Profile gefunden</h4>
                <p>Erstellen Sie Ihr erstes Profil mit "Profil speichern".</p>
            </div>
        `;
        return;
    }

    // Sort profiles by creation date (newest first)
    profiles.sort((a, b) => {
        const dateA = new Date(a.data.createdAt || 0);
        const dateB = new Date(b.data.createdAt || 0);
        return dateB - dateA;
    });

    profileList.innerHTML = profiles.map(profile => {
        const createdDate = profile.data.createdAt ? 
            new Date(profile.data.createdAt).toLocaleDateString('de-DE') : 
            'Unbekannt';
        
        const totalIncome = profile.data.budgetData?.totalIncome || 0;
        const totalExpenses = profile.data.budgetData?.totalExpenses || 0;
        const savingsAmount = profile.data.savings?.amount || 0;
        
        return `
            <div class="load-profile-item" onclick="selectProfileForLoad('${escapeHtml(profile.name)}')">
                <div class="profile-info">
                    <div class="profile-name">${escapeHtml(profile.data.name || profile.name)}</div>
                    <div class="profile-details">
                        ${profile.data.description ? `<div style="margin-bottom: 5px; color: #34495e;">${escapeHtml(profile.data.description)}</div>` : ''}
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.8rem;">
                            <span>💰 Einkommen: €${totalIncome.toLocaleString('de-DE')}</span>
                            <span>💸 Ausgaben: €${totalExpenses.toLocaleString('de-DE')}</span>
                            <span>💾 Sparrate: €${savingsAmount.toLocaleString('de-DE')}</span>
                            <span>📅 Erstellt: ${createdDate}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

let selectedProfileForLoad = null;

function selectProfileForLoad(profileName) {
    // Remove selection from all items
    document.querySelectorAll('.load-profile-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Add selection to clicked item
    event.target.closest('.load-profile-item').classList.add('selected');
    selectedProfileForLoad = profileName;
    
    // Load the profile immediately
    loadSelectedProfile(profileName);
}

function loadSelectedProfile(profileName) {
    const profile = JSON.parse(localStorage.getItem('budgetProfile_' + profileName));
    
    if (!profile) {
        alert('❌ Profil konnte nicht geladen werden.');
        return;
    }
    
    // Load income
    document.getElementById('salary').value = profile.income.salary;
    document.getElementById('sideIncome').value = profile.income.sideIncome;
    document.getElementById('otherIncome').value = profile.income.otherIncome;

    // Load expenses
    Object.keys(profile.expenses).forEach(key => {
        const element = document.getElementById(key);
        if (element) element.value = profile.expenses[key];
    });

    // Load savings settings
    budgetData.savings = profile.savings;
    document.getElementById('savingsAmount').value = profile.savings.amount;
    document.getElementById('savingsPercentage').value = profile.savings.percentage;
    document.getElementById('savingsPercentageValue').textContent = profile.savings.percentage + '%';
    
    // Load period settings
    if (profile.periods) {
        budgetData.periods = profile.periods;
        
        // Update period toggles
        document.querySelectorAll('.period-option').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Set income period toggle
        if (profile.periods.income) {
            const incomeToggle = document.getElementById('incomePeriodToggle');
            const incomeBtn = incomeToggle.querySelector(`[data-period="${profile.periods.income}"]`);
            if (incomeBtn) incomeBtn.classList.add('active');
        }
        
        // Set fixed period toggle
        const fixedToggle = document.getElementById('fixedPeriodToggle');
        const fixedBtn = fixedToggle.querySelector(`[data-period="${profile.periods.fixed}"]`);
        if (fixedBtn) fixedBtn.classList.add('active');
        
        // Set variable period toggle
        const variableToggle = document.getElementById('variablePeriodToggle');
        const variableBtn = variableToggle.querySelector(`[data-period="${profile.periods.variable}"]`);
        if (variableBtn) variableBtn.classList.add('active');
    }
    
    setSavingsMode(profile.savings.mode);
    calculateBudget();
    
    closeLoadProfileModal();
    showNotification('✅ Profil erfolgreich geladen!', `Das Profil "${profile.name || profileName}" wurde erfolgreich geladen.`, 'success');
}

// ==================== Utility Functions ====================
function showNotification(title, message, type = 'info') {
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
                animation: slideInNotification 0.3s ease-out;
            }
            
            .notification-success {
                border-left-color: #27ae60;
            }
            
            .notification-error {
                border-left-color: #e74c3c;
            }
            
            .notification-content {
                margin-right: 30px;
            }
            
            .notification-title {
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 5px;
            }
            
            .notification-message {
                color: #7f8c8d;
                font-size: 0.9rem;
            }
            
            .notification-close {
                position: absolute;
                top: 10px;
                right: 10px;
                background: none;
                border: none;
                font-size: 1.5rem;
                color: #bdc3c7;
                cursor: pointer;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .notification-close:hover {
                background: #ecf0f1;
                color: #7f8c8d;
            }
            
            @keyframes slideInNotification {
                from {
                    opacity: 0;
                    transform: translateX(100%);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
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
            notification.style.animation = 'slideInNotification 0.3s ease-out reverse';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function setupPeriodToggle(toggleId, category) {
    const toggle = document.getElementById(toggleId);
    const buttons = toggle.querySelectorAll('.period-option');
    
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons in this toggle
            buttons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            
            // Update budget data
            budgetData.periods[category] = this.dataset.period;
            
            // Recalculate budget
            calculateBudget();
        });
    });
}

function convertToMonthly(expenses, period) {
    const monthlyExpenses = {};
    for (const [key, value] of Object.entries(expenses)) {
        if (period === 'yearly') {
            monthlyExpenses[key] = value / 12;
        } else {
            monthlyExpenses[key] = value;
        }
    }
    return monthlyExpenses;
}

function updateBudgetPieChart(fixedExpenses, variableExpenses, remainingBudget) {
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
            },
            elements: {
                arc: {
                    borderAlign: 'center'
                }
            }
        }
    });
}

function openProfileManager() {
    document.getElementById('profileModal').style.display = 'block';
    loadProfileList();
}

function closeProfileManager() {
    document.getElementById('profileModal').style.display = 'none';
}

function loadProfileList() {
    const profileList = document.getElementById('profileList');
    const profiles = [];
    
    // Get all saved profiles
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('budgetProfile_')) {
            const profileName = key.replace('budgetProfile_', '');
            const profileData = JSON.parse(localStorage.getItem(key));
            profiles.push({ name: profileName, data: profileData });
        }
    }

    if (profiles.length === 0) {
        profileList.innerHTML = `
            <div class="no-profiles">
                <div class="no-profiles-icon">📁</div>
                <p>Keine gespeicherten Profile gefunden.</p>
                <p>Erstellen Sie Ihr erstes Profil mit "Profil speichern".</p>
            </div>
        `;
        return;
    }

    // Sort profiles alphabetically
    profiles.sort((a, b) => a.name.localeCompare(b.name));

    profileList.innerHTML = profiles.map(profile => {
        const totalIncome = calculateProfileTotalIncome(profile.data);
        const totalExpenses = calculateProfileTotalExpenses(profile.data);
        const savings = profile.data.savings?.amount || 0;
        
        return `
            <div class="profile-item">
                <div class="profile-info">
                    <div class="profile-name">${escapeHtml(profile.name)}</div>
                    <div class="profile-details">
                        Einkommen: €${formatGermanNumber(totalIncome, 0)} | 
                        Ausgaben: €${formatGermanNumber(totalExpenses, 0)} | 
                        Sparrate: €${formatGermanNumber(savings, 0)}
                    </div>
                </div>
                <div class="profile-actions">
                    <button class="profile-action-btn profile-load-btn" onclick="loadProfileFromManager('${escapeHtml(profile.name)}')">
                        📂 Laden
                    </button>
                    <button class="profile-action-btn profile-delete-btn" onclick="deleteProfile('${escapeHtml(profile.name)}')">
                        🗑️ Löschen
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function calculateProfileTotalIncome(profileData) {
    const income = profileData.income || {};
    const period = profileData.periods?.income || 'monthly';
    
    let total = (parseGermanNumber(income.salary) || 0) + 
               (parseGermanNumber(income.sideIncome) || 0) + 
               (parseGermanNumber(income.otherIncome) || 0);
    
    return period === 'yearly' ? total / 12 : total;
}

function calculateProfileTotalExpenses(profileData) {
    const expenses = profileData.expenses || {};
    const fixedPeriod = profileData.periods?.fixed || 'monthly';
    const variablePeriod = profileData.periods?.variable || 'monthly';
    
    // Fixed expenses
    let fixedTotal = (parseGermanNumber(expenses.rent) || 0) + 
                   (parseGermanNumber(expenses.utilities) || 0) + 
                   (parseGermanNumber(expenses.health) || 0) + 
                   (parseGermanNumber(expenses.insurance) || 0) + 
                   (parseGermanNumber(expenses.internet) || 0) + 
                   (parseGermanNumber(expenses.gez) || 0);
    
    if (fixedPeriod === 'yearly') fixedTotal /= 12;
    
    // Variable expenses
    let variableTotal = (parseGermanNumber(expenses.food) || 0) + 
                      (parseGermanNumber(expenses.transport) || 0) + 
                      (parseGermanNumber(expenses.leisure) || 0) + 
                      (parseGermanNumber(expenses.clothing) || 0) + 
                      (parseGermanNumber(expenses.subscriptions) || 0) + 
                      (parseGermanNumber(expenses.miscellaneous) || 0);
    
    if (variablePeriod === 'yearly') variableTotal /= 12;
    
    return fixedTotal + variableTotal;
}

function loadProfileFromManager(profileName) {
    const profile = JSON.parse(localStorage.getItem('budgetProfile_' + profileName));
    
    // Load income
    document.getElementById('salary').value = profile.income.salary;
    document.getElementById('sideIncome').value = profile.income.sideIncome;
    document.getElementById('otherIncome').value = profile.income.otherIncome;

    // Load expenses
    Object.keys(profile.expenses).forEach(key => {
        const element = document.getElementById(key);
        if (element) element.value = profile.expenses[key];
    });

    // Load savings settings
    budgetData.savings = profile.savings;
    document.getElementById('savingsAmount').value = profile.savings.amount;
    document.getElementById('savingsPercentage').value = profile.savings.percentage;
    document.getElementById('savingsPercentageValue').textContent = profile.savings.percentage + '%';
    
    // Load period settings
    if (profile.periods) {
        budgetData.periods = profile.periods;
        
        // Update period toggles
        document.querySelectorAll('.period-option').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Set income period toggle
        if (profile.periods.income) {
            const incomeToggle = document.getElementById('incomePeriodToggle');
            const incomeBtn = incomeToggle.querySelector(`[data-period="${profile.periods.income}"]`);
            if (incomeBtn) incomeBtn.classList.add('active');
        }
        
        // Set fixed period toggle
        const fixedToggle = document.getElementById('fixedPeriodToggle');
        const fixedBtn = fixedToggle.querySelector(`[data-period="${profile.periods.fixed}"]`);
        if (fixedBtn) fixedBtn.classList.add('active');
        
        // Set variable period toggle
        const variableToggle = document.getElementById('variablePeriodToggle');
        const variableBtn = variableToggle.querySelector(`[data-period="${profile.periods.variable}"]`);
        if (variableBtn) variableBtn.classList.add('active');
    }
    
    setSavingsMode(profile.savings.mode);
    calculateBudget();
    
    closeProfileManager();
    
    // Show success message
    const successMsg = document.createElement('div');
    successMsg.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 1001;
        background: #27ae60; color: white; padding: 15px 20px;
        border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        font-weight: bold; animation: slideInRight 0.3s ease-out;
    `;
    successMsg.textContent = `✅ Profil "${profileName}" erfolgreich geladen!`;
    document.body.appendChild(successMsg);
    
    setTimeout(() => {
        successMsg.style.opacity = '0';
        successMsg.style.transform = 'translateX(100%)';
        setTimeout(() => successMsg.remove(), 300);
    }, 3000);
}

function deleteProfile(profileName) {
    if (confirm(`❓ Profil "${profileName}" wirklich löschen?\n\nDiese Aktion kann nicht rückgängig gemacht werden.`)) {
        localStorage.removeItem('budgetProfile_' + profileName);
        loadProfileList(); // Refresh the list
        
        // Show success message
        const successMsg = document.createElement('div');
        successMsg.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 1001;
            background: #e74c3c; color: white; padding: 15px 20px;
            border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            font-weight: bold; animation: slideInRight 0.3s ease-out;
        `;
        successMsg.textContent = `🗑️ Profil "${profileName}" gelöscht!`;
        document.body.appendChild(successMsg);
        
        setTimeout(() => {
            successMsg.style.opacity = '0';
            successMsg.style.transform = 'translateX(100%)';
            setTimeout(() => successMsg.remove(), 300);
        }, 3000);
    }
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

function resetBudget() {
    if (confirm('❓ Alle Eingaben zurücksetzen?')) {
        // Reset income
        document.getElementById('salary').value = '3.500';
        document.getElementById('sideIncome').value = 0;
        document.getElementById('otherIncome').value = 0;

        // Reset expenses
        document.getElementById('rent').value = '1.200';
        document.getElementById('utilities').value = 150;
        document.getElementById('health').value = 180;
        document.getElementById('insurance').value = 120;
        document.getElementById('internet').value = 45;
        document.getElementById('gez').value = 18;
        document.getElementById('food').value = 400;
        document.getElementById('transport').value = 200;
        document.getElementById('leisure').value = 250;
        document.getElementById('clothing').value = 100;
        document.getElementById('subscriptions').value = 50;
        document.getElementById('miscellaneous').value = 100;

        // Reset savings
        document.getElementById('savingsAmount').value = 500;
        document.getElementById('savingsPercentage').value = 50;
        document.getElementById('savingsPercentageValue').textContent = '50%';
        
        // Reset periods
        budgetData.periods = { income: 'monthly', fixed: 'monthly', variable: 'monthly' };
        
        // Reset period toggles
        document.querySelectorAll('.period-option').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.period === 'monthly') {
                btn.classList.add('active');
            }
        });
        
        budgetData.savings = { amount: 500, mode: 'fixed', percentage: 50 };
        setSavingsMode('fixed');
        calculateBudget();
    }
}

// German Tax Calculator Functions
function setupTaxCalculatorListeners() {
    // Input fields
    ['grossSalary', 'age', 'children'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', calculateTaxes);
        }
    });

    // Select fields
    ['taxClass', 'federalState'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', calculateTaxes);
        }
    });

    // Tax toggles
    const churchTaxToggle = document.getElementById('churchTaxToggle');
    if (churchTaxToggle) {
        churchTaxToggle.addEventListener('click', function() {
            this.classList.toggle('active');
            calculateTaxes();
        });
    }

    const publicHealthInsuranceToggle = document.getElementById('publicHealthInsuranceToggle');
    if (publicHealthInsuranceToggle) {
        publicHealthInsuranceToggle.addEventListener('click', function() {
            this.classList.toggle('active');
            const healthGroup = document.getElementById('healthInsuranceRateGroup');
            if (healthGroup) {
                healthGroup.style.display = this.classList.contains('active') ? 'block' : 'none';
            }
            calculateTaxes();
        });
    }

    // Health insurance rate slider
    const healthSlider = document.getElementById('healthInsuranceRate');
    if (healthSlider) {
        healthSlider.addEventListener('input', function() {
            const valueElement = document.getElementById('healthInsuranceRateValue');
            if (valueElement) {
                valueElement.textContent = parseFloat(this.value).toFixed(1) + '%';
            }
            calculateTaxes();
        });
    }

    // Annual salary increase slider
    const salarySlider = document.getElementById('annualSalaryIncrease');
    if (salarySlider) {
        salarySlider.addEventListener('input', function() {
            const valueElement = document.getElementById('annualSalaryIncreaseValue');
            if (valueElement) {
                valueElement.textContent = parseFloat(this.value).toFixed(1) + '%';
            }
            calculateTaxes();
        });
    }

    // Integration button
    const integrationButton = document.getElementById('useTaxCalculatorResults');
    if (integrationButton) {
        integrationButton.addEventListener('click', function() {
            const netMonthlySalaryElement = document.getElementById('netMonthlySalary');
            const grossSalaryElement = document.getElementById('grossSalary');
            
            if (netMonthlySalaryElement && grossSalaryElement) {
                const netMonthlySalary = parseGermanNumber(netMonthlySalaryElement.textContent.replace('€', ''));
                const grossSalary = parseGermanNumber(grossSalaryElement.value);
                
                // Update budget section with net salary
                const salaryElement = document.getElementById('salary');
                if (salaryElement) {
                    salaryElement.value = formatGermanNumber(netMonthlySalary, 0);
                }
                
                // Update ETF calculator with net monthly salary as monthly savings base for active scenario
                const suggestedSavingsRate = Math.min(500, netMonthlySalary * 0.2); // Suggest 20% savings rate
                const monthlySavingsElement = document.getElementById(`monthlySavings_${activeScenario}`);
                if (monthlySavingsElement) {
                    monthlySavingsElement.value = formatGermanNumber(suggestedSavingsRate, 0);
                }
                
                // Also update the base salary field in ETF calculator for active scenario
                const baseSalaryElement = document.getElementById(`baseSalary_${activeScenario}`);
                if (baseSalaryElement) {
                    baseSalaryElement.value = formatGermanNumber(grossSalary, 0);
                }
                
                // Switch to accumulation phase
                const accumulationPhaseButton = document.getElementById('accumulationPhase');
                if (accumulationPhaseButton) {
                    accumulationPhaseButton.click();
                }
                recalculateAll();
                
                showNotification('✅ Netto-Gehalt übernommen!', `Das Netto-Gehalt von ${formatCurrency(netMonthlySalary)} wurde erfolgreich übernommen. Empfohlene Sparrate: 20% des Netto-Einkommens (${formatCurrency(suggestedSavingsRate)}).`, 'success');
            }
        });
    }

    // Initialize slider values
    const healthInsuranceRateValue = document.getElementById('healthInsuranceRateValue');
    if (healthInsuranceRateValue) {
        healthInsuranceRateValue.textContent = '2.5%';
    }
    
    const annualSalaryIncreaseValue = document.getElementById('annualSalaryIncreaseValue');
    if (annualSalaryIncreaseValue) {
        annualSalaryIncreaseValue.textContent = '3.0%';
    }
}

function calculateTaxes() {
    // Get input values
    const grossSalary = parseGermanNumber(document.getElementById('grossSalary').value);
    const taxClass = parseInt(document.getElementById('taxClass').value);
    const federalState = document.getElementById('federalState').value;
    const age = parseInt(document.getElementById('age').value);
    const children = parseInt(document.getElementById('children').value);
    const churchTax = document.getElementById('churchTaxToggle').classList.contains('active');
    const publicHealthInsurance = document.getElementById('publicHealthInsuranceToggle').classList.contains('active');
    const healthInsuranceRate = parseFloat(document.getElementById('healthInsuranceRate').value);

    // Official 2025 German tax calculation
    const basicAllowance = 12096; // Grundfreibetrag 2025 (official)
    const childAllowance = children * 9600; // Kinderfreibetrag 2025: €9,600 per child (official)
    
    // Calculate taxable income
    let taxableIncome = Math.max(0, grossSalary - basicAllowance - childAllowance);
    
    // Official German progressive tax formula for 2025
    let incomeTax = 0;
    if (taxableIncome > 0) {
        if (taxableIncome <= 17005) {
            // First progression zone: 14% to 24%
            const y = taxableIncome / 10000;
            incomeTax = (922.98 * y + 1400) * y;
        } else if (taxableIncome <= 68430) {
            // Second progression zone: 24% to 42%
            const z = (taxableIncome - 17005) / 10000;
            incomeTax = (181.19 * z + 2397) * z + 1025.38;
        } else if (taxableIncome <= 277825) {
            // Third zone: constant 42%
            incomeTax = 0.42 * taxableIncome - 10602.13;
        } else {
            // Top tax rate: 45%
            incomeTax = 0.45 * taxableIncome - 18936.88;
        }
    }



    // Church tax (8% or 9% of income tax depending on state)
    const churchTaxRates = {
        'bw': 0.08, 'by': 0.08, 'be': 0.09, 'bb': 0.09, 'hb': 0.09, 'hh': 0.09,
        'he': 0.09, 'mv': 0.09, 'ni': 0.09, 'nw': 0.09, 'rp': 0.09, 'sl': 0.09,
        'sn': 0.09, 'st': 0.09, 'sh': 0.09, 'th': 0.09
    };
    const churchTaxAmount = churchTax ? incomeTax * (churchTaxRates[federalState] || 0.09) : 0;

    // Social insurance contributions (official 2025 rates)
    const maxPensionBase = 96600;  // Unified for all of Germany in 2025
    const maxHealthBase = 66150;   // Updated for 2025

    const pensionBase = Math.min(grossSalary, maxPensionBase);
    const healthBase = Math.min(grossSalary, maxHealthBase);

    // Pension insurance: 18.6% (9.3% employee share)
    const pensionInsuranceAmount = pensionBase * 0.093;
    
    // Unemployment insurance: 2.6% (1.3% employee share)
    const unemploymentInsuranceAmount = pensionBase * 0.013;
    
    let healthInsuranceAmount = 0;
    let careInsuranceAmount = 0;

    if (publicHealthInsurance) {
        // Health insurance: 14.6% base + additional contribution (default 2.5% in 2025)
        const baseHealthRate = 0.073; // 7.3% employee share of base rate
        const additionalContribution = healthInsuranceRate / 100 / 2; // Split with employer
        healthInsuranceAmount = healthBase * (baseHealthRate + additionalContribution);
        
        // Care insurance: 3.6% in 2025 (1.8% employee share)
        // Additional 0.6% for childless employees over 23
        let careRate = 0.018; // Base employee share
        if (children === 0 && age >= 23) {
            careRate += 0.006; // Additional for childless
        } else if (children >= 2) {
            // Reduction for families with 2+ children (0.25% per child, max 1.0%)
            const reduction = Math.min((children - 1) * 0.0025, 0.01);
            careRate = Math.max(0.008, careRate - reduction);
        }
        careInsuranceAmount = healthBase * careRate;
    } else {
        // Private health insurance - rough estimate
        healthInsuranceAmount = Math.min(900, grossSalary * 0.08);
        // Still need to pay care insurance
        let careRate = 0.018;
        if (children === 0 && age >= 23) {
            careRate += 0.006;
        }
        careInsuranceAmount = healthBase * careRate;
    }

    // Calculate total deductions
    const totalTaxes = incomeTax + churchTaxAmount;
    const totalSocialInsurance = pensionInsuranceAmount + unemploymentInsuranceAmount + healthInsuranceAmount + careInsuranceAmount;
    const totalDeductions = totalTaxes + totalSocialInsurance;

    // Calculate net salary
    const netYearlySalary = grossSalary - totalDeductions;
    const netMonthlySalary = netYearlySalary / 12;
    const grossMonthlySalary = grossSalary / 12;

    // Update display
    document.getElementById('grossMonthlySalary').textContent = formatCurrency(grossMonthlySalary);
    document.getElementById('netMonthlySalary').textContent = formatCurrency(netMonthlySalary);
    document.getElementById('netYearlySalary').textContent = formatCurrency(netYearlySalary);
    document.getElementById('totalDeductions').textContent = formatCurrency(totalDeductions);

    // Update breakdown
    document.getElementById('incomeTax').textContent = formatCurrency(incomeTax);
    document.getElementById('churchTax').textContent = formatCurrency(churchTaxAmount);
    document.getElementById('healthInsurance').textContent = formatCurrency(healthInsuranceAmount);
    document.getElementById('careInsurance').textContent = formatCurrency(careInsuranceAmount);
    document.getElementById('pensionInsurance').textContent = formatCurrency(pensionInsuranceAmount);
    document.getElementById('unemploymentInsurance').textContent = formatCurrency(unemploymentInsuranceAmount);

    return {
        grossSalary,
        netYearlySalary,
        netMonthlySalary,
        totalDeductions,
        breakdown: {
            incomeTax,
            churchTax: churchTaxAmount,
            healthInsurance: healthInsuranceAmount,
            careInsurance: careInsuranceAmount,
            pensionInsurance: pensionInsuranceAmount,
            unemploymentInsurance: unemploymentInsuranceAmount
        }
    };
}

// ===== Scenario Management Functions =====

function togglePresetTemplates() {
    const presetTemplates = document.getElementById('presetTemplates');
    const isVisible = presetTemplates.style.display !== 'none';
    
    if (isVisible) {
        presetTemplates.style.display = 'none';
        showNotification('Vorlagen ausgeblendet', 'Die Vorlagen-Auswahl wurde geschlossen.', 'info');
    } else {
        presetTemplates.style.display = 'block';
        showNotification('Vorlagen verfügbar', 'Wählen Sie eine Vorlage aus der Liste unten.', 'success');
    }
}

function loadPresetTemplate(presetType) {
    const presets = {
        optimistic: {
            name: 'Optimistisch',
            parameters: {
                annualReturn: 8.5,
                inflationRate: 2.0,
                monthlySavings: 800,
                salaryGrowth: 3.5,
                duration: 25,
                initialCapital: 10000,
                includeTax: true,
                teilfreistellung: true
            }
        },
        conservative: {
            name: 'Konservativ',
            parameters: {
                annualReturn: 5.5,
                inflationRate: 2.5,
                monthlySavings: 500,
                salaryGrowth: 2.0,
                duration: 30,
                initialCapital: 5000,
                includeTax: true,
                teilfreistellung: true
            }
        },
        realistic: {
            name: 'Realistisch',
            parameters: {
                annualReturn: 7.0,
                inflationRate: 2.2,
                monthlySavings: 650,
                salaryGrowth: 2.8,
                duration: 25,
                initialCapital: 8000,
                includeTax: true,
                teilfreistellung: true
            }
        },
        crisis: {
            name: 'Krisenfall',
            parameters: {
                annualReturn: 4.0,
                inflationRate: 3.0,
                monthlySavings: 400,
                salaryGrowth: 1.0,
                duration: 35,
                initialCapital: 3000,
                includeTax: true,
                teilfreistellung: false
            }
        },
        house: {
            name: 'Immobilienkauf',
            parameters: {
                annualReturn: 6.5,
                inflationRate: 2.0,
                monthlySavings: 300,
                salaryGrowth: 2.5,
                duration: 20,
                initialCapital: 15000,
                includeTax: true,
                teilfreistellung: true
            }
        }
    };
    
    const preset = presets[presetType];
    if (!preset) {
        showNotification('Fehler', 'Unbekannte Vorlage ausgewählt.', 'error');
        return;
    }
    
    // Check if we're in comparison phase
    const isComparisonPhase = document.getElementById('scenarioComparisonPhase').classList.contains('active');
    
    if (isComparisonPhase) {
        // Create new comparison scenario with preset data
        createComparisonScenarioFromPreset(preset);
    } else {
        // Apply preset to current active scenario in main phase
        const activeScenarioId = getActiveScenario();
        if (!activeScenarioId) {
            showNotification('Fehler', 'Kein aktives Szenario gefunden.', 'error');
            return;
        }
        
        applyPresetToScenario(activeScenarioId, preset);
    }
    
    // Hide preset templates
    document.getElementById('presetTemplates').style.display = 'none';
    
    showNotification('Vorlage geladen', `Die Vorlage "${preset.name}" wurde erfolgreich geladen.`, 'success');
}

function createComparisonScenarioFromPreset(preset) {
    // Check if we can add more scenarios
    if (comparisonScenarios.length >= 6) {
        showNotification('Fehler', '⚠️ Maximal 6 Szenarien sind möglich. Bitte löschen Sie ein vorhandenes Szenario.', 'error');
        return;
    }

    const newScenarioId = String.fromCharCode(65 + comparisonScenarios.length); // A, B, C, D, E, F
    const scenarioColors = {
        'A': '#3498db',
        'B': '#27ae60', 
        'C': '#e74c3c',
        'D': '#f39c12',
        'E': '#9b59b6',
        'F': '#34495e'
    };
    
    const scenarioEmojis = {
        'A': '🎯',
        'B': '🛡️',
        'C': '💥',
        'D': '⚡',
        'E': '🚀',
        'F': '🏆'
    };

    // Create new comparison scenario with preset name
    const newComparisonScenario = {
        id: newScenarioId,
        name: preset.name,
        color: scenarioColors[newScenarioId],
        emoji: scenarioEmojis[newScenarioId]
    };

    // Add scenario to the list
    comparisonScenarios.push(newComparisonScenario);
    
    // Create UI elements
    createComparisonScenarioTab(newComparisonScenario);
    createComparisonScenarioPanel(newComparisonScenario);
    
    // Update scenario visibility controls
    updateScenarioVisibilityControls();
    
    // Initialize controls and apply preset values
    setTimeout(() => {
        initializeComparisonScenarioControls(newScenarioId);
        
        // Apply preset parameters to the new scenario
        setTimeout(() => {
            applyPresetToComparisonScenario(newScenarioId, preset);
            updateComparisonTeilfreistellungState(newScenarioId);
            switchToComparisonScenario(newScenarioId);
            calculateComparisonScenarioResults(newScenarioId);
        }, 100);
    }, 50);
    
    console.log(`Created new comparison scenario ${newScenarioId} with preset: ${preset.name}`);
}

function applyPresetToComparisonScenario(scenarioId, preset) {
    const params = preset.parameters;
    
    // Apply accumulation phase parameters
    setComparisonScenarioValue(scenarioId, 'accumulation.monthlySavings', params.monthlySavings);
    setComparisonScenarioValue(scenarioId, 'accumulation.initialCapital', params.initialCapital);
    setComparisonScenarioSlider(scenarioId, 'accumulation.annualReturn', params.annualReturn);
    setComparisonScenarioSlider(scenarioId, 'accumulation.inflationRate', params.inflationRate);
    setComparisonScenarioSlider(scenarioId, 'accumulation.salaryGrowth', params.salaryGrowth);
    setComparisonScenarioSlider(scenarioId, 'accumulation.duration', params.duration);
    setComparisonScenarioToggle(scenarioId, 'accumulation.includeTax', params.includeTax);
    setComparisonScenarioToggle(scenarioId, 'accumulation.teilfreistellung', params.teilfreistellung);
    
    // Apply reasonable withdrawal phase defaults
    setComparisonScenarioSlider(scenarioId, 'withdrawal.duration', 25);
    setComparisonScenarioSlider(scenarioId, 'withdrawal.postRetirementReturn', Math.max(3.0, params.annualReturn - 1.5));
    setComparisonScenarioSlider(scenarioId, 'withdrawal.inflationRate', params.inflationRate);
    setComparisonScenarioToggle(scenarioId, 'withdrawal.includeTax', params.includeTax);
    
    // Update the Teilfreistellung dependency
    updateComparisonTeilfreistellungState(scenarioId);
    
    console.log(`Applied preset "${preset.name}" to comparison scenario ${scenarioId}`);
}

function applyPresetToScenario(scenarioId, preset) {
    const params = preset.parameters;
    
    // Update sliders
    const sliderMappings = {
        annualReturn: 'annualReturn_' + scenarioId,
        inflationRate: 'inflationRate_' + scenarioId,
        salaryGrowth: 'salaryGrowth_' + scenarioId,
        duration: 'duration_' + scenarioId
    };
    
    Object.entries(sliderMappings).forEach(([paramKey, sliderId]) => {
        const slider = document.getElementById(sliderId);
        if (slider && params[paramKey] !== undefined) {
            slider.value = params[paramKey];
            updateScenarioSliderValue(paramKey, scenarioId);
        }
    });
    
    // Update input fields
    const inputMappings = {
        monthlySavings: 'monthlySavings_' + scenarioId,
        initialCapital: 'initialCapital_' + scenarioId
    };
    
    Object.entries(inputMappings).forEach(([paramKey, inputId]) => {
        const input = document.getElementById(inputId);
        if (input && params[paramKey] !== undefined) {
            input.value = formatGermanNumber(params[paramKey], 0);
        }
    });
    
    // Update toggles
    const toggleMappings = {
        includeTax: 'taxToggle_' + scenarioId,
        teilfreistellung: 'teilfreistellungToggle_' + scenarioId
    };
    
    Object.entries(toggleMappings).forEach(([paramKey, toggleId]) => {
        const toggle = document.getElementById(toggleId);
        if (toggle && params[paramKey] !== undefined) {
            if (params[paramKey]) {
                toggle.classList.add('active');
            } else {
                toggle.classList.remove('active');
            }
        }
    });
    
    // Update Teilfreistellung state based on tax toggle
    updateTeilfreistellungToggleState(scenarioId);
    
    // Recalculate results
    debouncedRecalculateAll();
}

function saveScenarioConfiguration() {
    try {
        // Collect current scenario data
        const configData = {
            scenarios: [],
            savedAt: new Date().toISOString(),
            version: '1.0'
        };
        
        // Get all scenarios
        scenarios.forEach(scenario => {
            const scenarioConfig = {
                id: scenario.id,
                name: scenario.name,
                color: scenario.color,
                parameters: {}
            };
            
            // Collect parameters for this scenario
            const parameterSelectors = [
                { key: 'monthlySavings', id: 'monthlySavings_' + scenario.id, type: 'input' },
                { key: 'initialCapital', id: 'initialCapital_' + scenario.id, type: 'input' },
                { key: 'annualReturn', id: 'annualReturn_' + scenario.id, type: 'slider' },
                { key: 'inflationRate', id: 'inflationRate_' + scenario.id, type: 'slider' },
                { key: 'salaryGrowth', id: 'salaryGrowth_' + scenario.id, type: 'slider' },
                { key: 'duration', id: 'duration_' + scenario.id, type: 'slider' },
                { key: 'includeTax', id: 'taxToggle_' + scenario.id, type: 'toggle' },
                { key: 'teilfreistellung', id: 'teilfreistellungToggle_' + scenario.id, type: 'toggle' }
            ];
            
            parameterSelectors.forEach(param => {
                const element = document.getElementById(param.id);
                if (element) {
                    switch (param.type) {
                        case 'input':
                            scenarioConfig.parameters[param.key] = parseGermanNumber(element.value);
                            break;
                        case 'slider':
                            scenarioConfig.parameters[param.key] = parseFloat(element.value);
                            break;
                        case 'toggle':
                            scenarioConfig.parameters[param.key] = element.classList.contains('active');
                            break;
                    }
                }
            });
            
            configData.scenarios.push(scenarioConfig);
        });
        
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
        const filename = `Szenario-Vergleich_${timestamp}.json`;
        
        // Create and download file
        const dataStr = JSON.stringify(configData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        
        showNotification('Konfiguration gespeichert', `Die Szenarien wurden als "${filename}" heruntergeladen.`, 'success');
        
    } catch (error) {
        console.error('Error saving configuration:', error);
        showNotification('Fehler beim Speichern', 'Die Konfiguration konnte nicht gespeichert werden.', 'error');
    }
}

function exportComparisonData() {
    try {
        // Collect all scenario results and comparison data
        const exportData = {
            metadata: {
                exportDate: new Date().toISOString(),
                title: 'ETF-Sparplan Szenario-Vergleich',
                version: '1.0'
            },
            scenarios: [],
            summary: {
                totalScenarios: scenarios.length,
                comparisonPeriod: 'Jahre',
                currency: 'EUR'
            }
        };
        
        // Process each scenario
        scenarios.forEach(scenario => {
            const scenarioData = {
                id: scenario.id,
                name: scenario.name,
                color: scenario.color,
                parameters: {},
                results: {},
                yearlyData: scenario.yearlyData || []
            };
            
            // Get current parameters
            const paramIds = {
                monthlySavings: 'monthlySavings_' + scenario.id,
                initialCapital: 'initialCapital_' + scenario.id,
                annualReturn: 'annualReturn_' + scenario.id,
                inflationRate: 'inflationRate_' + scenario.id,
                salaryGrowth: 'salaryGrowth_' + scenario.id,
                duration: 'duration_' + scenario.id,
                includeTax: 'taxToggle_' + scenario.id,
                teilfreistellung: 'teilfreistellungToggle_' + scenario.id
            };
            
            Object.entries(paramIds).forEach(([key, id]) => {
                const element = document.getElementById(id);
                if (element) {
                    if (key === 'includeTax' || key === 'teilfreistellung') {
                        scenarioData.parameters[key] = element.classList.contains('active');
                    } else if (key === 'monthlySavings' || key === 'initialCapital') {
                        scenarioData.parameters[key] = parseGermanNumber(element.value);
                    } else {
                        scenarioData.parameters[key] = parseFloat(element.value);
                    }
                }
            });
            
            // Get calculated results
            if (scenario.results) {
                scenarioData.results = {
                    finalCapital: scenario.results.finalCapital || 0,
                    totalContributions: scenario.results.totalContributions || 0,
                    totalGains: scenario.results.totalGains || 0,
                    taxesPaid: scenario.results.taxesPaid || 0,
                    netGains: scenario.results.netGains || 0,
                    effectiveReturn: scenario.results.effectiveReturn || 0
                };
            }
            
            exportData.scenarios.push(scenarioData);
        });
        
        // Create different export formats
        createExportFile(exportData, 'json');
        
        // Also create a simplified CSV for Excel
        createCSVExport(exportData);
        
        showNotification('Export erfolgreich', 'Die Vergleichsdaten wurden als JSON und CSV heruntergeladen.', 'success');
        
    } catch (error) {
        console.error('Error exporting data:', error);
        showNotification('Export-Fehler', 'Die Daten konnten nicht exportiert werden.', 'error');
    }
}

function createExportFile(data, format) {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const filename = `ETF-Szenario-Export_${timestamp}.${format}`;
    
    let content, mimeType;
    
    if (format === 'json') {
        content = JSON.stringify(data, null, 2);
        mimeType = 'application/json';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
}

function createCSVExport(data) {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const filename = `ETF-Szenario-Vergleich_${timestamp}.csv`;
    
    // Create CSV header
    let csv = 'Szenario;Name;Monatliche Sparrate (€);Startkapital (€);Jährliche Rendite (%);Inflationsrate (%);Gehaltssteigerung (%);Anlagedauer (Jahre);Steuern;Teilfreistellung;Endkapital (€);Gesamte Einzahlungen (€);Gewinne (€);Gezahlte Steuern (€);Nettogewinne (€);Effektive Rendite (%)\n';
    
    // Add scenario data
    data.scenarios.forEach(scenario => {
        const params = scenario.parameters;
        const results = scenario.results;
        
        csv += `${scenario.id};`;
        csv += `"${scenario.name}";`;
        csv += `${params.monthlySavings || 0};`;
        csv += `${params.initialCapital || 0};`;
        csv += `${params.annualReturn || 0};`;
        csv += `${params.inflationRate || 0};`;
        csv += `${params.salaryGrowth || 0};`;
        csv += `${params.duration || 0};`;
        csv += `${params.includeTax ? 'Ja' : 'Nein'};`;
        csv += `${params.teilfreistellung ? 'Ja' : 'Nein'};`;
        csv += `${Math.round(results.finalCapital || 0)};`;
        csv += `${Math.round(results.totalContributions || 0)};`;
        csv += `${Math.round(results.totalGains || 0)};`;
        csv += `${Math.round(results.taxesPaid || 0)};`;
        csv += `${Math.round(results.netGains || 0)};`;
        csv += `${((results.effectiveReturn || 0) * 100).toFixed(2)}`;
        csv += '\n';
    });
    
    // Create and download CSV file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
}

// Add this after the existing setupScenarioListeners function

function setupComparisonScenarioListeners() {
    // Set up comparison scenario tabs event listeners
    setupComparisonScenarioTabs();
    
    // Set up profile selection functionality
    setupComparisonProfileSelection();
    
    // Set up add comparison scenario button
    const addComparisonScenarioBtn = document.getElementById('addComparisonScenarioBtn');
    if (addComparisonScenarioBtn) {
        addComparisonScenarioBtn.addEventListener('click', addNewComparisonScenario);
    }
    
    // Initialize static HTML scenario controls for A and B
    initializeComparisonScenarioControls('A');
    initializeComparisonScenarioControls('B');
    
    // Initialize budget calculations for default scenarios
    setTimeout(() => {
        // Set up Teilfreistellung dependency for default scenarios
        updateComparisonTeilfreistellungState('A');
        updateComparisonTeilfreistellungState('B');
        
        updateComparisonScenarioBudget('A');
        updateComparisonScenarioBudget('B');
        // Calculate initial results for default scenarios (immediate, not debounced)
        calculateComparisonScenarioResults('A');
        calculateComparisonScenarioResults('B');
            // Setup comparison chart view toggles
    setupComparisonChartViewToggle();
    // Setup scenario visibility controls
    setupScenarioVisibilityControls();
    // Setup parameter comparison table
    setupParameterComparisonTable();
        // Also ensure profiles are loaded
        loadComparisonProfiles();
        // Load scenario imports
        loadScenarioImports();
    }, 100);
}

function setupComparisonScenarioTabs() {
    // Comparison scenario tab switching
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('scenario-tab') && e.target.closest('#comparisonScenarioTabs')) {
            const scenarioId = e.target.dataset.scenario;
            switchToComparisonScenario(scenarioId);
        }
    });
}

// Global variable to track comparison scenarios
let comparisonScenarios = [
    {
        id: 'A',
        name: 'Szenario A',
        color: '#3498db',
        emoji: '📈'
    },
    {
        id: 'B', 
        name: 'Szenario B',
        color: '#27ae60', 
        emoji: '📈'
    }
];

let activeComparisonScenario = 'A';

function switchToComparisonScenario(scenarioId) {
    // Update active comparison scenario
    activeComparisonScenario = scenarioId;
    
    // Update tab appearance in comparison section
    const comparisonTabs = document.querySelectorAll('#comparisonScenarioTabs .scenario-tab');
    comparisonTabs.forEach(tab => {
        tab.classList.remove('active');
    });
    
    const activeTab = document.querySelector(`#comparisonScenarioTabs [data-scenario="${scenarioId}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    // Update panel visibility in comparison section
    const comparisonPanels = document.querySelectorAll('#comparisonScenarioPanels .comparison-scenario-panel');
    comparisonPanels.forEach(panel => {
        panel.classList.remove('active');
        panel.style.display = 'none';
    });
    
    const activePanel = document.querySelector(`#comparisonScenarioPanels .comparison-scenario-panel[data-scenario="${scenarioId}"]`);
    if (activePanel) {
        activePanel.classList.add('active');
        activePanel.style.display = 'block';
        
        // Update the border color to match the scenario color
        const scenario = comparisonScenarios.find(s => s.id === scenarioId);
        if (scenario) {
            activePanel.style.setProperty('--active-scenario-color', scenario.color);
        }
        
        // Update budget calculation for this scenario
        updateComparisonScenarioBudget(scenarioId);
    }
    
    console.log(`Switched to comparison scenario ${scenarioId}`);
}

function addNewComparisonScenario() {
    if (comparisonScenarios.length >= 6) {
        alert('⚠️ Maximal 6 Szenarien sind möglich.');
        return;
    }

    const newScenarioId = String.fromCharCode(65 + comparisonScenarios.length); // A, B, C, D, E, F
    const scenarioColors = {
        'A': '#3498db',
        'B': '#27ae60', 
        'C': '#e74c3c',
        'D': '#f39c12',
        'E': '#9b59b6',
        'F': '#34495e'
    };
    
    const scenarioEmojis = {
        'A': '📈',
        'B': '📈',
        'C': '📈',
        'D': '📈',
        'E': '📈',
        'F': '📈'
    };

    const newComparisonScenario = {
        id: newScenarioId,
        name: `Szenario ${newScenarioId}`,
        color: scenarioColors[newScenarioId],
        emoji: scenarioEmojis[newScenarioId]
    };

    comparisonScenarios.push(newComparisonScenario);
    createComparisonScenarioTab(newComparisonScenario);
    createComparisonScenarioPanel(newComparisonScenario);
    
    // Update scenario visibility controls to include the new scenario
    updateScenarioVisibilityControls();
    
    // Initialize controls for the new scenario
    setTimeout(() => {
        initializeComparisonScenarioControls(newScenarioId);
        // Apply the Teilfreistellung dependency only after initialization
        setTimeout(() => {
            updateComparisonTeilfreistellungState(newScenarioId);
        }, 50);
        switchToComparisonScenario(newScenarioId);
        // Calculate initial results for the new scenario (immediate)
        calculateComparisonScenarioResults(newScenarioId);
    }, 100);
    
    showNotification('Neues Szenario erstellt', `${newComparisonScenario.emoji} Szenario ${newScenarioId} wurde erfolgreich erstellt.`, 'success');
}

function createComparisonScenarioTab(scenario) {
    const tabsContainer = document.getElementById('comparisonScenarioTabs');
    const addBtn = document.getElementById('addComparisonScenarioBtn');
    
    const tab = document.createElement('button');
    tab.className = 'scenario-tab';
    tab.dataset.scenario = scenario.id;
    tab.style.setProperty('--scenario-color', scenario.color);
    tab.innerHTML = `${scenario.emoji} ${scenario.name}`;
    
    // Insert before the add button
    tabsContainer.insertBefore(tab, addBtn);
}

function createComparisonScenarioPanel(scenario) {
    const panelsContainer = document.getElementById('comparisonScenarioPanels');
    
    const panel = document.createElement('div');
    panel.className = 'comparison-scenario-panel';
    panel.dataset.scenario = scenario.id;
    panel.style.display = 'none';
    
    panel.innerHTML = `
        <div class="scenario-panel-header" style="--scenario-color: ${scenario.color};">
            <h4 class="scenario-panel-title">
                ${scenario.emoji} ${scenario.name}
                <button class="rename-scenario-btn" title="Szenario umbenennen" onclick="renameComparisonScenario('${scenario.id}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </button>
            </h4>
            <div class="scenario-panel-actions">
                <button class="panel-action-btn" onclick="duplicateComparisonScenario('${scenario.id}')" title="Szenario duplizieren">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    Kopieren
                </button>
                ${scenario.id !== 'A' ? `<button class="panel-action-btn delete-btn" onclick="removeComparisonScenario('${scenario.id}')" title="Szenario löschen">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                    Löschen
                </button>` : ''}
            </div>
        </div>

        <!-- Parameter Sections -->
        <div class="parameter-sections">
            <!-- Budget Planning Parameters -->
            <div class="parameter-section" data-section="budget">
                <div class="section-header-toggle">
                    <h4 class="section-header">💼 Budgetplanung</h4>
                                                    <button class="section-toggle-btn" data-target="budget-${scenario.id}"></button>
                </div>
                <div class="parameter-grid" id="budget-${scenario.id}">
                    <!-- Profile Selection for this scenario -->
                    <div class="profile-selection-inline">
                        <div class="profile-selection-header-inline">
                            <h5 class="profile-selection-title-inline">📋 Budget-Profil laden</h5>
                        </div>
                        <div class="profile-selection-controls-inline">
                            <div class="profile-dropdown-container-inline">
                                <select class="profile-dropdown-inline scenario-profile-select" data-scenario="${scenario.id}">
                                    <option value="">-- Profil auswählen --</option>
                                    <!-- Profiles will be loaded dynamically -->
                                </select>
                            </div>
                        </div>
                        <div class="profile-selection-status-inline" data-scenario="${scenario.id}" style="display: none;">
                            <span class="status-icon">ℹ️</span>
                            <span class="status-message">Wählen Sie ein Profil aus um die Budget-Daten zu übernehmen</span>
                        </div>
                    </div>
                    
                    <div class="parameter-row">
                        <div class="input-group">
                            <label>Netto-Gehalt (€/Monat)</label>
                            <input type="text" class="input-field comparison-input" data-param="budget.netSalary" data-scenario="${scenario.id}" value="3500" placeholder="3500">
                        </div>
                        <div class="input-group">
                            <label>Nebeneinkommen (€/Monat)</label>
                            <input type="text" class="input-field comparison-input" data-param="budget.sideIncome" data-scenario="${scenario.id}" value="0" placeholder="0">
                        </div>
                    </div>
                    <div class="parameter-row">
                        <div class="input-group">
                            <label>Fixkosten (€/Monat)</label>
                            <input type="text" class="input-field comparison-input" data-param="budget.fixedExpenses" data-scenario="${scenario.id}" value="1713" placeholder="1713">
                        </div>
                        <div class="input-group">
                            <label>Variable Kosten (€/Monat)</label>
                            <input type="text" class="input-field comparison-input" data-param="budget.variableExpenses" data-scenario="${scenario.id}" value="1100" placeholder="1100">
                        </div>
                    </div>
                    <div class="budget-summary-preview">
                        <div class="budget-calculation">
                            <div class="budget-line">
                                <span class="budget-label">📊 Einkommen:</span>
                                <span class="budget-value total-income" data-scenario="${scenario.id}">€3.500</span>
                            </div>
                            <div class="budget-line">
                                <span class="budget-label">💸 Ausgaben:</span>
                                <span class="budget-value total-expenses" data-scenario="${scenario.id}">€2.813</span>
                            </div>
                            <div class="budget-line savings-line">
                                <span class="budget-label">💰 Für ETF-Sparplan verfügbar:</span>
                                <span class="budget-value savings-amount" data-scenario="${scenario.id}">€687/Monat</span>
                            </div>
                                                                        </div>
                                                <div class="savings-rate-selector" data-scenario="${scenario.id}">
                            <label class="savings-rate-label">🎯 Sparrate festlegen:</label>
                            <div class="savings-rate-container">
                                <div class="slider-container">
                                    <input type="range" class="slider savings-rate-slider" data-scenario="${scenario.id}" min="0" max="100" value="80" step="5">
                                    <span class="slider-value savings-rate-value">80%</span>
                                </div>
                                <div class="savings-rate-result">
                                    <span class="savings-rate-amount" data-scenario="${scenario.id}">€550/Monat</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Accumulation Phase Parameters -->
            <div class="parameter-section" data-section="accumulation">
                <div class="section-header-toggle">
                    <h4 class="section-header">📈 Ansparphase</h4>
                                                    <button class="section-toggle-btn" data-target="accumulation-${scenario.id}"></button>
                </div>
                <div class="parameter-grid" id="accumulation-${scenario.id}">
                    <div class="parameter-row">
                        <div class="input-group">
                            <label>Monatliche Sparrate (€)</label>
                            <div class="input-with-checkbox">
                                <input type="text" class="input-field comparison-input" data-param="accumulation.monthlySavings" data-scenario="${scenario.id}" value="500" placeholder="500" readonly>
                                <label class="checkbox-container" title="Manuelle Eingabe aktivieren">
                                    <input type="checkbox" class="manual-savings-checkbox" data-scenario="${scenario.id}">
                                    <span class="checkmark">✏️</span>
                                </label>
                            </div>
                        </div>
                        <div class="input-group">
                            <label>Startkapital (€)</label>
                            <input type="text" class="input-field comparison-input" data-param="accumulation.initialCapital" data-scenario="${scenario.id}" value="5000" placeholder="5000">
                        </div>
                    </div>
                    <div class="parameter-row">
                        <div class="input-group">
                            <label>Jährliche Rendite (%)</label>
                            <div class="slider-container">
                                <input type="range" class="slider comparison-slider" data-param="accumulation.annualReturn" data-scenario="${scenario.id}" min="1" max="50" value="7" step="0.1">
                                <span class="slider-value">7.0%</span>
                            </div>
                        </div>
                        <div class="input-group">
                            <label>Inflationsrate (%)</label>
                            <div class="slider-container">
                                <input type="range" class="slider comparison-slider" data-param="accumulation.inflationRate" data-scenario="${scenario.id}" min="0" max="6" value="2" step="0.1">
                                <span class="slider-value">2.0%</span>
                            </div>
                        </div>
                    </div>
                    <div class="parameter-row">
                        <div class="input-group">
                            <label>Anlagedauer (Jahre)</label>
                            <div class="slider-container">
                                <input type="range" class="slider comparison-slider" data-param="accumulation.duration" data-scenario="${scenario.id}" min="1" max="50" value="25" step="1">
                                <span class="slider-value">25 Jahre</span>
                            </div>
                        </div>
                        <div class="input-group">
                            <label>Gehaltssteigerung (%)</label>
                            <div class="slider-container">
                                <input type="range" class="slider comparison-slider" data-param="accumulation.salaryGrowth" data-scenario="${scenario.id}" min="0" max="8" value="3" step="0.1">
                                <span class="slider-value">3.0%</span>
                            </div>
                        </div>
                    </div>
                    <div class="parameter-row">
                        <div class="input-group">
                            <label>Gehaltssteigerung → Sparrate (%)</label>
                            <div class="slider-container">
                                <input type="range" class="slider comparison-slider" data-param="accumulation.salaryToSavings" data-scenario="${scenario.id}" min="0" max="100" value="50" step="5">
                                <span class="slider-value">50%</span>
                            </div>
                        </div>
                        <div class="input-group">
                            <label>ETF-Typ</label>
                            <div class="radio-group">
                                <label class="radio-option">
                                    <input type="radio" name="etfType-${scenario.id}" value="thesaurierend" data-param="accumulation.etfType" data-scenario="${scenario.id}" checked>
                                    <span class="radio-custom"></span>
                                    Thesaurierend
                                </label>
                                <label class="radio-option">
                                    <input type="radio" name="etfType-${scenario.id}" value="ausschuettend" data-param="accumulation.etfType" data-scenario="${scenario.id}">
                                    <span class="radio-custom"></span>
                                    Ausschüttend
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="parameter-row">
                        <div class="toggle-group">
                            <div class="toggle-container">
                                <label>Deutsche Abgeltungssteuer (25%)</label>
                                <div class="toggle comparison-toggle" data-param="accumulation.includeTax" data-scenario="${scenario.id}"></div>
                            </div>
                            <div class="toggle-container">
                                <label>Teilfreistellung (30%)</label>
                                <div class="toggle comparison-toggle" data-param="accumulation.teilfreistellung" data-scenario="${scenario.id}"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Withdrawal Phase Parameters -->
            <div class="parameter-section" data-section="withdrawal">
                <div class="section-header-toggle">
                    <h4 class="section-header">🏖️ Entnahmephase</h4>
                                                    <button class="section-toggle-btn" data-target="withdrawal-${scenario.id}"></button>
                </div>
                <div class="parameter-grid" id="withdrawal-${scenario.id}">
                    <div class="parameter-row">
                        <div class="input-group">
                            <label>Verfügbares Kapital (€)</label>
                            <div class="input-with-checkbox">
                                <input type="text" class="input-field comparison-input" data-param="withdrawal.retirementCapital" data-scenario="${scenario.id}" value="800000" placeholder="800000" readonly>
                                <label class="checkbox-container" title="Manuelle Eingabe aktivieren">
                                    <input type="checkbox" class="manual-capital-checkbox" data-scenario="${scenario.id}">
                                    <span class="checkmark">✏️</span>
                                </label>
                            </div>
                            <div class="sync-indicator">
                                🔄 Auto-Sync aus Ansparphase verfügbar
                            </div>
                        </div>
                        <div class="input-group">
                            <label>Entnahmedauer (Jahre)</label>
                            <div class="slider-container">
                                <input type="range" class="slider comparison-slider" data-param="withdrawal.duration" data-scenario="${scenario.id}" min="10" max="60" value="25" step="1">
                                <span class="slider-value">25 Jahre</span>
                            </div>
                        </div>
                    </div>
                    <div class="parameter-row">
                        <div class="input-group">
                            <label>Rendite im Ruhestand (%)</label>
                            <div class="slider-container">
                                <input type="range" class="slider comparison-slider" data-param="withdrawal.postRetirementReturn" data-scenario="${scenario.id}" min="1" max="15" value="5" step="0.1">
                                <span class="slider-value">5.0%</span>
                            </div>
                        </div>
                        <div class="input-group">
                            <label>Inflationsrate (%)</label>
                            <div class="slider-container">
                                <input type="range" class="slider comparison-slider" data-param="withdrawal.inflationRate" data-scenario="${scenario.id}" min="0" max="5" value="2" step="0.1">
                                <span class="slider-value">2.0%</span>
                            </div>
                        </div>
                    </div>
                    <div class="parameter-row">
                        <div class="toggle-container">
                            <label>Abgeltungssteuer anwenden (25%)</label>
                            <div class="toggle comparison-toggle" data-param="withdrawal.includeTax" data-scenario="${scenario.id}"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    panelsContainer.appendChild(panel);
    
    // Initialize toggles and sliders for the new panel
    initializeComparisonScenarioControls(scenario.id);
}

function initializeComparisonScenarioControls(scenarioId) {
    // Initialize toggles with dependency logic
    const toggles = document.querySelectorAll(`[data-scenario="${scenarioId}"] .comparison-toggle`);
    console.log(`Initializing ${toggles.length} toggles for scenario ${scenarioId}`);
    
    toggles.forEach(toggle => {
        // Remove any existing event listeners to prevent duplicates
        const newToggle = toggle.cloneNode(true);
        toggle.parentNode.replaceChild(newToggle, toggle);
        
        newToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log(`Toggle clicked: ${this.dataset.param} for scenario ${scenarioId}, current state: ${this.classList.contains('active')}`);
            
            // Check if this toggle is disabled (e.g., Teilfreistellung when tax is off)
            if (this.classList.contains('disabled')) {
                console.log(`Toggle ${this.dataset.param} is disabled, ignoring click`);
                return; // Don't allow clicking disabled toggles
            }
            
            this.classList.toggle('active');
            console.log(`Toggle ${this.dataset.param} new state: ${this.classList.contains('active')}`);
            
            // Update Teilfreistellung dependency if this is the tax toggle
            if (this.dataset.param === 'accumulation.includeTax') {
                updateComparisonTeilfreistellungState(scenarioId);
            }
            
            // Calculate results to update the charts and data
            debouncedCalculateComparisonScenarioResults(scenarioId);
            
            updateComparisonScenarioBudget(scenarioId);
        });
    });
    
    // Don't automatically update Teilfreistellung state for new scenarios
    // Let users configure their toggles first
    
    // Initialize sliders
    const sliders = document.querySelectorAll(`[data-scenario="${scenarioId}"] .comparison-slider`);
    sliders.forEach(slider => {
        slider.addEventListener('input', function() {
            const valueSpan = this.parentElement.querySelector('.slider-value');
            if (valueSpan) {
                const param = this.dataset.param;
                if (param && param.includes('duration')) {
                    valueSpan.textContent = `${this.value} Jahre`;
                } else {
                    valueSpan.textContent = `${parseFloat(this.value).toFixed(1)}%`;
                }
            }
            updateComparisonScenarioBudget(scenarioId);
        });
    });
    
    // Initialize all comparison input listeners (budget and accumulation parameters)
    const comparisonInputs = document.querySelectorAll(`[data-scenario="${scenarioId}"] .comparison-input`);
    comparisonInputs.forEach(input => {
        input.addEventListener('input', function() {
            const param = this.dataset.param;
            if (param && (param.startsWith('budget.') || param.startsWith('accumulation.') || param.startsWith('withdrawal.'))) {
                updateComparisonScenarioBudget(scenarioId);
            }
        });
        
        // Add specific listeners for accumulation parameters to maintain proper formatting
        input.addEventListener('blur', function() {
            const param = this.dataset.param;
            if (param && param.includes('monthlySavings') || param.includes('initialCapital') || param.includes('retirementCapital')) {
                // Format as currency without decimals
                const value = parseGermanNumber(this.value);
                if (!isNaN(value) && value >= 0) {
                    this.value = formatGermanNumber(value, 0).replace(',00', '');
                }
            }
        });
    });
    
    // Initialize savings rate slider listeners
    const savingsRateSliders = document.querySelectorAll(`[data-scenario="${scenarioId}"] .savings-rate-slider`);
    savingsRateSliders.forEach(slider => {
        slider.addEventListener('input', function() {
            const valueSpan = this.parentElement.querySelector('.savings-rate-value');
            if (valueSpan) {
                valueSpan.textContent = `${this.value}%`;
            }
            updateComparisonScenarioBudget(scenarioId);
        });
    });
    
    // Initialize radio buttons
    const radioButtons = document.querySelectorAll(`[data-scenario="${scenarioId}"] input[type="radio"]`);
    radioButtons.forEach(radio => {
        radio.addEventListener('change', function() {
            // Radio buttons handle their own state through browser default behavior
            console.log(`Radio button changed: ${this.name} = ${this.value} for scenario ${scenarioId}`);
            updateComparisonScenarioBudget(scenarioId);
            
            // Update the parameter comparison table immediately when ETF-Type changes
            const activeTableBtn = document.querySelector('.table-control-btn.active');
            const category = activeTableBtn ? activeTableBtn.dataset.category : 'all';
            updateParameterComparisonTable(category);
        });
    });
    
    // Initialize manual savings checkbox
    const manualSavingsCheckbox = document.querySelector(`[data-scenario="${scenarioId}"] .manual-savings-checkbox`);
    if (manualSavingsCheckbox) {
        manualSavingsCheckbox.addEventListener('change', function() {
            const monthlySavingsInput = document.querySelector(`[data-scenario="${scenarioId}"] [data-param="accumulation.monthlySavings"]`);
            if (monthlySavingsInput) {
                if (this.checked) {
                    // Enable manual editing
                    monthlySavingsInput.readOnly = false;
                    monthlySavingsInput.style.backgroundColor = '#fff';
                    monthlySavingsInput.style.cursor = 'text';
                    monthlySavingsInput.focus();
                } else {
                    // Disable manual editing and sync with budget
                    monthlySavingsInput.readOnly = true;
                    monthlySavingsInput.style.backgroundColor = '#f8f9fa';
                    monthlySavingsInput.style.cursor = 'not-allowed';
                    // Trigger budget recalculation to sync the value
                    updateComparisonScenarioBudget(scenarioId);
                }
            }
        });
    }
    
    // Initialize manual capital checkbox
    const manualCapitalCheckbox = document.querySelector(`[data-scenario="${scenarioId}"] .manual-capital-checkbox`);
    if (manualCapitalCheckbox) {
        manualCapitalCheckbox.addEventListener('change', function() {
            const retirementCapitalInput = document.querySelector(`[data-scenario="${scenarioId}"] [data-param="withdrawal.retirementCapital"]`);
            if (retirementCapitalInput) {
                if (this.checked) {
                    // Enable manual editing
                    retirementCapitalInput.readOnly = false;
                    retirementCapitalInput.style.backgroundColor = '#fff';
                    retirementCapitalInput.style.cursor = 'text';
                    retirementCapitalInput.focus();
                } else {
                    // Disable manual editing and sync with calculated endkapital
                    retirementCapitalInput.readOnly = true;
                    retirementCapitalInput.style.backgroundColor = '#f8f9fa';
                    retirementCapitalInput.style.cursor = 'not-allowed';
                    // Trigger calculation to sync the value with Ansparphase
                    calculateAndSyncEndkapital(scenarioId);
                }
            }
        });
    }
    
    // Initialize section toggles
    const sectionToggles = document.querySelectorAll(`[data-scenario="${scenarioId}"] .section-toggle-btn`);
    sectionToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const targetId = this.dataset.target;
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                if (targetSection.style.display === 'none') {
                    targetSection.style.display = 'flex';
                    this.classList.remove('collapsed');
                } else {
                    targetSection.style.display = 'none';
                    this.classList.add('collapsed');
                }
            }
        });
    });
    
    // Load profiles for this scenario
    loadComparisonProfiles();
    
    // Initial budget calculation
    updateComparisonScenarioBudget(scenarioId);
}

function duplicateComparisonScenario(scenarioId) {
    if (comparisonScenarios.length >= 6) {
        alert('⚠️ Maximal 6 Szenarien sind möglich.');
        return;
    }
    
    const sourceScenario = comparisonScenarios.find(s => s.id === scenarioId);
    if (!sourceScenario) {
        showNotification('Fehler', 'Quell-Szenario nicht gefunden.', 'error');
        return;
    }
    
    const newScenarioId = String.fromCharCode(65 + comparisonScenarios.length);
    const scenarioColors = {
        'A': '#3498db', 'B': '#27ae60', 'C': '#e74c3c',
        'D': '#f39c12', 'E': '#9b59b6', 'F': '#34495e'
    };
    const scenarioEmojis = {
        'A': '📈', 'B': '📈', 'C': '📈',
        'D': '📈', 'E': '📈', 'F': '📈'
    };
    
    // Create a smart copy name that respects the 17 character limit
    let newName;
    const kopieText = " (Kopie)";
    const maxLength = 17;
    
    if ((sourceScenario.name + kopieText).length <= maxLength) {
        // If the full name fits, use it
        newName = sourceScenario.name + kopieText;
    } else {
        // If too long, truncate the original name to fit
        const availableLength = maxLength - kopieText.length;
        newName = sourceScenario.name.substring(0, availableLength).trim() + kopieText;
    }
    
    const newComparisonScenario = {
        id: newScenarioId,
        name: newName,
        color: scenarioColors[newScenarioId],
        emoji: scenarioEmojis[newScenarioId]
    };
    
    comparisonScenarios.push(newComparisonScenario);
    createComparisonScenarioTab(newComparisonScenario);
    createComparisonScenarioPanel(newComparisonScenario);
    
    // Initialize controls and copy all parameter values from source scenario
    setTimeout(() => {
        initializeComparisonScenarioControls(newScenarioId);
        copyComparisonScenarioParameters(scenarioId, newScenarioId);
        // Update Teilfreistellung state after copying parameters
        updateComparisonTeilfreistellungState(newScenarioId);
        switchToComparisonScenario(newScenarioId);
        // Calculate results for the new scenario (immediate)
        calculateComparisonScenarioResults(newScenarioId);
        showNotification('Szenario dupliziert', `${newComparisonScenario.emoji} ${newComparisonScenario.name} wurde erfolgreich erstellt.`, 'success');
    }, 100);
}

function copyComparisonScenarioParameters(fromScenarioId, toScenarioId) {
    // Copy all input values
    const sourceInputs = document.querySelectorAll(`[data-scenario="${fromScenarioId}"] .comparison-input`);
    sourceInputs.forEach(input => {
        const param = input.dataset.param;
        const targetInput = document.querySelector(`[data-scenario="${toScenarioId}"] [data-param="${param}"]`);
        if (targetInput) {
            targetInput.value = input.value;
        }
    });
    
    // Copy all slider values
    const sourceSliders = document.querySelectorAll(`[data-scenario="${fromScenarioId}"] .comparison-slider`);
    sourceSliders.forEach(slider => {
        const param = slider.dataset.param;
        const targetSlider = document.querySelector(`[data-scenario="${toScenarioId}"] [data-param="${param}"]`);
        if (targetSlider) {
            targetSlider.value = slider.value;
            // Update the slider value display
            const valueSpan = targetSlider.parentElement.querySelector('.slider-value');
            if (valueSpan) {
                if (param && param.includes('duration')) {
                    valueSpan.textContent = `${targetSlider.value} Jahre`;
                } else {
                    valueSpan.textContent = `${parseFloat(targetSlider.value).toFixed(1)}%`;
                }
            }
        }
    });
    
    // Copy all toggle states
    const sourceToggles = document.querySelectorAll(`[data-scenario="${fromScenarioId}"] .comparison-toggle`);
    sourceToggles.forEach(toggle => {
        const param = toggle.dataset.param;
        const targetToggle = document.querySelector(`[data-scenario="${toScenarioId}"] [data-param="${param}"]`);
        if (targetToggle) {
            if (toggle.classList.contains('active')) {
                targetToggle.classList.add('active');
            } else {
                targetToggle.classList.remove('active');
            }
        }
    });
    
    // Copy savings rate slider values
    const sourceSavingsRateSlider = document.querySelector(`[data-scenario="${fromScenarioId}"] .savings-rate-slider`);
    const targetSavingsRateSlider = document.querySelector(`[data-scenario="${toScenarioId}"] .savings-rate-slider`);
    if (sourceSavingsRateSlider && targetSavingsRateSlider) {
        targetSavingsRateSlider.value = sourceSavingsRateSlider.value;
        const valueSpan = targetSavingsRateSlider.parentElement.querySelector('.savings-rate-value');
        if (valueSpan) {
            valueSpan.textContent = `${targetSavingsRateSlider.value}%`;
        }
    }
    
    // Copy manual savings checkbox state
    const sourceManualSavingsCheckbox = document.querySelector(`[data-scenario="${fromScenarioId}"] .manual-savings-checkbox`);
    const targetManualSavingsCheckbox = document.querySelector(`[data-scenario="${toScenarioId}"] .manual-savings-checkbox`);
    if (sourceManualSavingsCheckbox && targetManualSavingsCheckbox) {
        targetManualSavingsCheckbox.checked = sourceManualSavingsCheckbox.checked;
        // Apply the same visual state to the target monthly savings input
        const targetMonthlySavingsInput = document.querySelector(`[data-scenario="${toScenarioId}"] [data-param="accumulation.monthlySavings"]`);
        if (targetMonthlySavingsInput) {
            if (targetManualSavingsCheckbox.checked) {
                targetMonthlySavingsInput.readOnly = false;
                targetMonthlySavingsInput.style.backgroundColor = '#fff';
                targetMonthlySavingsInput.style.cursor = 'text';
            } else {
                targetMonthlySavingsInput.readOnly = true;
                targetMonthlySavingsInput.style.backgroundColor = '#f8f9fa';
                targetMonthlySavingsInput.style.cursor = 'not-allowed';
            }
        }
    }
    
    // Copy manual capital checkbox state
    const sourceManualCapitalCheckbox = document.querySelector(`[data-scenario="${fromScenarioId}"] .manual-capital-checkbox`);
    const targetManualCapitalCheckbox = document.querySelector(`[data-scenario="${toScenarioId}"] .manual-capital-checkbox`);
    if (sourceManualCapitalCheckbox && targetManualCapitalCheckbox) {
        targetManualCapitalCheckbox.checked = sourceManualCapitalCheckbox.checked;
        // Apply the same visual state to the target retirement capital input
        const targetRetirementCapitalInput = document.querySelector(`[data-scenario="${toScenarioId}"] [data-param="withdrawal.retirementCapital"]`);
        if (targetRetirementCapitalInput) {
            if (targetManualCapitalCheckbox.checked) {
                targetRetirementCapitalInput.readOnly = false;
                targetRetirementCapitalInput.style.backgroundColor = '#fff';
                targetRetirementCapitalInput.style.cursor = 'text';
            } else {
                targetRetirementCapitalInput.readOnly = true;
                targetRetirementCapitalInput.style.backgroundColor = '#f8f9fa';
                targetRetirementCapitalInput.style.cursor = 'not-allowed';
            }
        }
    }
}

function removeComparisonScenario(scenarioId) {
    if (scenarioId === 'A') {
        alert('❌ Das Basis-Szenario A kann nicht gelöscht werden.');
        return;
    }
    
    const scenario = comparisonScenarios.find(s => s.id === scenarioId);
    if (!scenario) {
        showNotification('Fehler', 'Szenario nicht gefunden.', 'error');
        return;
    }
    
    if (confirm(`Szenario ${scenario.emoji} ${scenario.name} wirklich löschen?`)) {
            // Remove from scenarios array
    comparisonScenarios = comparisonScenarios.filter(s => s.id !== scenarioId);
    
    // Remove DOM elements
    const tab = document.querySelector(`#comparisonScenarioTabs [data-scenario="${scenarioId}"]`);
    const panel = document.querySelector(`#comparisonScenarioPanels [data-scenario="${scenarioId}"]`);
    
    if (tab) tab.remove();
    if (panel) panel.remove();
    
    // If the deleted scenario was active, switch to scenario A
    if (activeComparisonScenario === scenarioId) {
        switchToComparisonScenario('A');
    }
    
    // Update the results grid to remove the deleted scenario
    updateComparisonResultsGrid();
    
    // Update scenario visibility controls to remove the deleted scenario
    updateScenarioVisibilityControls();
    
    showNotification('Szenario gelöscht', `${scenario.emoji} ${scenario.name} wurde erfolgreich gelöscht.`, 'success');
    }
}

/**
 * Calculate and sync Endkapital from Ansparphase parameters
 */
function calculateAndSyncEndkapital(scenarioId) {
    try {
        // Get Ansparphase parameters
        const monthlySavingsElement = document.querySelector(`[data-scenario="${scenarioId}"] [data-param="accumulation.monthlySavings"]`);
        const initialCapitalElement = document.querySelector(`[data-scenario="${scenarioId}"] [data-param="accumulation.initialCapital"]`);
        const annualReturnSlider = document.querySelector(`[data-scenario="${scenarioId}"] [data-param="accumulation.annualReturn"]`);
        const durationSlider = document.querySelector(`[data-scenario="${scenarioId}"] [data-param="accumulation.duration"]`);
        const includeTaxToggle = document.querySelector(`[data-scenario="${scenarioId}"] [data-param="accumulation.includeTax"]`);
        const teilfreistellungToggle = document.querySelector(`[data-scenario="${scenarioId}"] [data-param="accumulation.teilfreistellung"]`);
        const etfTypeRadio = document.querySelector(`[data-scenario="${scenarioId}"] input[name="etfType-${scenarioId}"]:checked`);
        
        // Get retirement capital input
        const retirementCapitalInput = document.querySelector(`[data-scenario="${scenarioId}"] [data-param="withdrawal.retirementCapital"]`);
        const manualCapitalCheckbox = document.querySelector(`[data-scenario="${scenarioId}"] .manual-capital-checkbox`);
        
        if (!monthlySavingsElement || !initialCapitalElement || !annualReturnSlider || !durationSlider || !retirementCapitalInput) {
            console.warn(`Missing elements for endkapital calculation in scenario ${scenarioId}`);
            return;
        }
        
        // Only auto-sync if manual editing is not enabled
        if (manualCapitalCheckbox && manualCapitalCheckbox.checked) {
            console.log(`Manual capital editing enabled for scenario ${scenarioId}, skipping auto-sync`);
            return;
        }
        
        // Parse values
        const monthlySavings = parseGermanNumber(monthlySavingsElement.value) || 0;
        const initialCapital = parseGermanNumber(initialCapitalElement.value) || 0;
        const annualReturn = parseFloat(annualReturnSlider.value) || 7;
        const duration = parseInt(durationSlider.value) || 25;
        const includeTax = includeTaxToggle ? includeTaxToggle.classList.contains('active') : false;
        const teilfreistellung = teilfreistellungToggle ? teilfreistellungToggle.classList.contains('active') : false;
        const etfType = etfTypeRadio ? etfTypeRadio.value : 'thesaurierend';
        
        // Get additional parameters needed for accurate calculation
        const inflationRateSlider = document.querySelector(`[data-scenario="${scenarioId}"] [data-param="accumulation.inflationRate"]`);
        const salaryGrowthSlider = document.querySelector(`[data-scenario="${scenarioId}"] [data-param="accumulation.salaryGrowth"]`);
        const salaryToSavingsSlider = document.querySelector(`[data-scenario="${scenarioId}"] [data-param="accumulation.salaryToSavings"]`);
        const grossSalaryInput = document.querySelector(`[data-scenario="${scenarioId}"] [data-param="budget.grossSalary"]`);
        
        // Parse additional parameters
        const inflationRate = inflationRateSlider ? parseFloat(inflationRateSlider.value) / 100 : 0.02;
        const salaryGrowth = salaryGrowthSlider ? parseFloat(salaryGrowthSlider.value) / 100 : 0.03;
        const salaryToSavings = salaryToSavingsSlider ? parseFloat(salaryToSavingsSlider.value) / 100 : 0.50;
        const baseSalary = grossSalaryInput ? parseGermanNumber(grossSalaryInput.value) : 70000;
        
        // Calculate the wealth development to get the final capital
        const wealthData = calculateWealthDevelopment(
            monthlySavings,
            initialCapital,
            annualReturn / 100, // Convert percentage to decimal
            inflationRate,
            salaryGrowth,
            duration,
            salaryToSavings,
            includeTax,
            baseSalary,
            teilfreistellung,
            etfType
        );
        
        if (wealthData && wealthData.finalNominal) {
            // Get the final capital value
            const endkapital = wealthData.finalNominal;
            
            // Update the retirement capital field
            retirementCapitalInput.value = formatGermanNumber(endkapital, 0).replace(',00', '');
            
            console.log(`Auto-synced endkapital for scenario ${scenarioId}: €${formatGermanNumber(endkapital, 0)}`);
            
            // Update sync indicator
            const syncIndicator = document.querySelector(`[data-scenario="${scenarioId}"] .sync-indicator`);
            if (syncIndicator) {
                syncIndicator.innerHTML = '🔄 Auto-Sync aus Ansparphase aktiv';
                syncIndicator.style.color = '#27ae60';
            }
        }
        
    } catch (error) {
        console.error(`Error calculating endkapital for scenario ${scenarioId}:`, error);
    }
}

function updateComparisonScenarioBudget(scenarioId) {
    // Get budget input values for this scenario
    const netSalary = parseGermanNumber(getComparisonScenarioValue(scenarioId, 'budget.netSalary') || '0');
    const sideIncome = parseGermanNumber(getComparisonScenarioValue(scenarioId, 'budget.sideIncome') || '0');
    const fixedExpenses = parseGermanNumber(getComparisonScenarioValue(scenarioId, 'budget.fixedExpenses') || '0');
    const variableExpenses = parseGermanNumber(getComparisonScenarioValue(scenarioId, 'budget.variableExpenses') || '0');
    
    // Calculate budget
    const totalIncome = netSalary + sideIncome;
    const totalExpenses = fixedExpenses + variableExpenses;
    const availableSavings = totalIncome - totalExpenses;
    
    // Update total income display
    const totalIncomeElement = document.querySelector(`[data-scenario="${scenarioId}"] .total-income`);
    if (totalIncomeElement) {
        totalIncomeElement.textContent = `€${formatGermanNumber(totalIncome, 0)}`;
    }
    
    // Update total expenses display
    const totalExpensesElement = document.querySelector(`[data-scenario="${scenarioId}"] .total-expenses`);
    if (totalExpensesElement) {
        totalExpensesElement.textContent = `€${formatGermanNumber(totalExpenses, 0)}`;
    }
    
    // Update savings amount display and add deficit class
    const savingsAmountElement = document.querySelector(`[data-scenario="${scenarioId}"] .savings-amount`);
    const savingsLineElement = document.querySelector(`[data-scenario="${scenarioId}"] .budget-line.savings-line`);
    
    if (savingsAmountElement && savingsLineElement) {
        if (availableSavings > 0) {
            savingsAmountElement.textContent = `€${formatGermanNumber(availableSavings, 0)}/Monat`;
            savingsAmountElement.style.color = '#27ae60';
            savingsLineElement.classList.remove('deficit');
        } else {
            savingsAmountElement.textContent = `€${formatGermanNumber(Math.abs(availableSavings), 0)}/Monat Defizit`;
            savingsAmountElement.style.color = '#e74c3c';
            savingsLineElement.classList.add('deficit');
        }
    }
    
    // Update savings rate slider calculation
    updateSavingsRateDisplay(scenarioId, availableSavings);
    

    
    // Get current savings rate from slider and update accumulation section
    const savingsRateSlider = document.querySelector(`[data-scenario="${scenarioId}"] .savings-rate-slider`);
    const currentSavingsRate = savingsRateSlider ? parseFloat(savingsRateSlider.value) : 80;
    const calculatedSavingsAmount = availableSavings * (currentSavingsRate / 100);
    
    // Auto-update monthly savings rate in accumulation section (only if manual editing is disabled)
    const monthlySavingsInput = document.querySelector(`[data-scenario="${scenarioId}"] [data-param="accumulation.monthlySavings"]`);
    const manualSavingsCheckbox = document.querySelector(`[data-scenario="${scenarioId}"] .manual-savings-checkbox`);
    
    if (monthlySavingsInput && calculatedSavingsAmount > 0) {
        // Only update automatically if manual editing is not enabled
        if (!manualSavingsCheckbox || !manualSavingsCheckbox.checked) {
            monthlySavingsInput.value = formatGermanNumber(calculatedSavingsAmount, 0);
        }
    }
    
    // Calculate and sync endkapital from Ansparphase parameters
    calculateAndSyncEndkapital(scenarioId);
    
    // Calculate and update scenario results (debounced for performance)
    debouncedCalculateComparisonScenarioResults(scenarioId);
}

// Debounced version for better performance (per scenario)
let comparisonCalculationTimeouts = new Map();
function debouncedCalculateComparisonScenarioResults(scenarioId) {
    // Clear existing timeout for this specific scenario
    if (comparisonCalculationTimeouts.has(scenarioId)) {
        clearTimeout(comparisonCalculationTimeouts.get(scenarioId));
    }
    
    // Set new timeout for this scenario
    const timeoutId = setTimeout(() => {
        calculateComparisonScenarioResults(scenarioId);
        comparisonCalculationTimeouts.delete(scenarioId);
    }, 300); // 300ms delay
    
    comparisonCalculationTimeouts.set(scenarioId, timeoutId);
}

function calculateComparisonScenarioResults(scenarioId) {
    try {
        // Get all parameters for this scenario
        const monthlySavings = parseGermanNumber(getComparisonScenarioValue(scenarioId, 'accumulation.monthlySavings') || '500');
        const initialCapital = parseGermanNumber(getComparisonScenarioValue(scenarioId, 'accumulation.initialCapital') || '3000');
        const annualReturn = parseFloat(getComparisonScenarioValue(scenarioId, 'accumulation.annualReturn') || '7');
        const inflationRate = parseFloat(getComparisonScenarioValue(scenarioId, 'accumulation.inflationRate') || '2');
        const duration = parseInt(getComparisonScenarioValue(scenarioId, 'accumulation.duration') || '25');
        const salaryGrowth = parseFloat(getComparisonScenarioValue(scenarioId, 'accumulation.salaryGrowth') || '3');
        const salaryToSavings = parseFloat(getComparisonScenarioValue(scenarioId, 'accumulation.salaryToSavings') || '50');
        
        // Get toggle values
        const includeTax = getComparisonScenarioToggleValue(scenarioId, 'accumulation.includeTax');
        const teilfreistellung = getComparisonScenarioToggleValue(scenarioId, 'accumulation.teilfreistellung');
        
        // Get ETF type
        const etfType = getComparisonScenarioETFType(scenarioId);
        
        // Get base salary directly from input field
        const baseSalary = parseGermanNumber(getComparisonScenarioValue(scenarioId, 'budget.grossSalary') || '70000');
        

        
        // Calculate wealth development
        const results = calculateWealthDevelopment(
            monthlySavings,
            initialCapital,
            annualReturn / 100,
            inflationRate / 100,
            salaryGrowth / 100,
            duration,
            salaryToSavings / 100,
            includeTax,
            baseSalary,
            teilfreistellung,
            etfType
        );
        
        // Store results in the scenario object
        const scenario = comparisonScenarios.find(s => s.id === scenarioId);
        if (scenario) {
            scenario.results = {
                finalCapital: results.finalNominal,
                finalReal: results.finalReal,
                totalContributions: results.totalInvested,
                totalGains: results.totalReturn,
                taxesPaid: results.totalTaxesPaid || 0,
                netGains: results.totalReturn - (results.totalTaxesPaid || 0),
                effectiveReturn: ((results.finalNominal / results.totalInvested) - 1) * 100,
                yearlyData: results.yearlyData || []
            };
            
            // Calculate withdrawal phase results if we have withdrawal parameters
            const retirementCapital = parseGermanNumber(getComparisonScenarioValue(scenarioId, 'withdrawal.retirementCapital') || results.finalNominal.toString());
            const withdrawalDuration = parseInt(getComparisonScenarioValue(scenarioId, 'withdrawal.duration') || '25');
            const withdrawalReturn = parseFloat(getComparisonScenarioValue(scenarioId, 'withdrawal.postRetirementReturn') || '6');
            const withdrawalInflation = parseFloat(getComparisonScenarioValue(scenarioId, 'withdrawal.inflationRate') || '2');
            const withdrawalIncludeTax = getComparisonScenarioToggleValue(scenarioId, 'withdrawal.includeTax');
            
            console.log(`=== Withdrawal Calculation Debug for Scenario ${scenarioId} ===`);
            console.log(`Retirement Capital: €${formatGermanNumber(retirementCapital, 0)}`);
            console.log(`Duration: ${withdrawalDuration} years`);
            console.log(`Return: ${withdrawalReturn}%`);
            console.log(`Inflation: ${withdrawalInflation}%`);
            console.log(`Include Tax: ${withdrawalIncludeTax}`);
            console.log(`Total Invested: €${formatGermanNumber(results.totalInvested, 0)}`);
            
            // Calculate withdrawal results
            const withdrawalResults = calculateWithdrawalPlan(
                retirementCapital,
                withdrawalDuration,
                withdrawalReturn / 100,
                withdrawalInflation / 100,
                withdrawalIncludeTax,
                results.totalInvested
            );
            
            console.log(`Withdrawal Results for Scenario ${scenarioId}:`, withdrawalResults);
            if (withdrawalResults.yearlyData && withdrawalResults.yearlyData.length > 0) {
                console.log(`First year data:`, withdrawalResults.yearlyData[0]);
                console.log(`Last year data:`, withdrawalResults.yearlyData[withdrawalResults.yearlyData.length - 1]);
            }
            
            // Store complete withdrawal results for chart display
            scenario.results.withdrawalResults = withdrawalResults;
            
            // Use the correct property names from the withdrawal calculation
            scenario.results.monthlyPension = withdrawalResults.monthlyGrossWithdrawal || 0;
            scenario.results.realPurchasingPower = withdrawalResults.realPurchasingPower || 0;
        }
        
        // Update the results grid
        updateComparisonResultsGrid();
        
        // Update parameter comparison table
        const activeTableBtn = document.querySelector('.table-control-btn.active');
        if (activeTableBtn) {
            updateParameterComparisonTable(activeTableBtn.dataset.category);
        }
        
        // Update the currently active chart view
        const activeView = document.querySelector('.chart-view-btn.active');
        if (activeView) {
            const targetView = activeView.dataset.view;
            switch (targetView) {
                case 'lifecycle':
                    createLifecycleComparisonChart();
                    break;
                case 'accumulation':
                    createAccumulationComparisonChart();
                    break;
                case 'withdrawal':
                    createWithdrawalComparisonChart();
                    break;
                case 'metrics':
                    createMetricsRadarChart();
                    break;
            }
        }
        
    } catch (error) {
        console.error(`Error calculating results for scenario ${scenarioId}:`, error);
    }
}

function getComparisonScenarioToggleValue(scenarioId, param) {
    const toggle = document.querySelector(`[data-scenario="${scenarioId}"] [data-param="${param}"]`);
    return toggle ? toggle.classList.contains('active') : true; // Default to true
}

function getComparisonScenarioETFType(scenarioId) {
    const radioButton = document.querySelector(`[data-scenario="${scenarioId}"] input[name="etfType-${scenarioId}"]:checked`);
    return radioButton ? radioButton.value : 'thesaurierend'; // Default to thesaurierend
}

function updateComparisonResultsGrid() {
    const resultsGrid = document.querySelector('.scenario-results-grid');
    if (!resultsGrid) return;

    resultsGrid.innerHTML = '';
    
    comparisonScenarios.forEach(scenario => {
        if (scenario.results) {
            const card = createComparisonResultCard(scenario);
            resultsGrid.appendChild(card);
        }
    });
    
    // Update performance summary after results are updated
    updatePerformanceSummary();
}

// Setup comparison chart view toggle functionality
function setupComparisonChartViewToggle() {
    const chartViewButtons = document.querySelectorAll('.chart-view-btn');
    const chartViews = document.querySelectorAll('.comparison-chart-view');

    chartViewButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetView = this.dataset.view;
            
            // Update button active states
            chartViewButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Update chart view visibility
            chartViews.forEach(view => {
                view.style.display = 'none';
                view.classList.remove('active');
            });
            
            let targetChartView;
            if (targetView === 'withdrawal') {
                targetChartView = document.getElementById('withdrawalComparisonChartView');
            } else {
                targetChartView = document.getElementById(`${targetView}ChartView`);
            }
            
            if (targetChartView) {
                targetChartView.style.display = 'block';
                targetChartView.classList.add('active');
                
                // Create the appropriate chart
                switch (targetView) {
                    case 'lifecycle':
                        createLifecycleComparisonChart();
                        break;
                    case 'accumulation':
                        createAccumulationComparisonChart();
                        break;
                    case 'withdrawal':
                        createWithdrawalComparisonChart();
                        break;
                    case 'metrics':
                        createMetricsRadarChart();
                        break;
                }
            }
        });
    });
    
    // Create initial lifecycle chart
    createLifecycleComparisonChart();
}

// Setup scenario visibility controls
function setupScenarioVisibilityControls() {
    updateScenarioVisibilityControls();
}

// Update scenario visibility controls dynamically based on available scenarios
function updateScenarioVisibilityControls() {
    const visibilityControlsContainer = document.querySelector('.scenario-visibility-controls');
    if (!visibilityControlsContainer) return;
    
    // Clear existing controls
    visibilityControlsContainer.innerHTML = '';
    
    // Get scenario colors and emojis
    const scenarioColors = {
        'A': '#3498db',
        'B': '#27ae60', 
        'C': '#e74c3c',
        'D': '#f39c12',
        'E': '#9b59b6',
        'F': '#34495e'
    };
    
    const scenarioEmojis = {
        'A': '📈',
        'B': '📈',
        'C': '📈',
        'D': '📈',
        'E': '📈',
        'F': '📈'
    };
    
    // Create controls for each available scenario
    comparisonScenarios.forEach(scenario => {
        const scenarioId = scenario.id;
        const scenarioName = scenario.name;
        const scenarioColor = scenarioColors[scenarioId] || '#7f8c8d';
        const scenarioEmoji = scenarioEmojis[scenarioId] || '📊';
        
        const label = document.createElement('label');
        label.className = 'scenario-visibility-item';
        label.style.setProperty('--scenario-color', scenarioColor);
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'scenario-visibility-checkbox';
        checkbox.setAttribute('data-scenario', scenarioId);
        checkbox.checked = true; // Default to checked
        
        const textWrapper = document.createElement('span');
        textWrapper.className = 'scenario-visibility-item-text';
        textWrapper.textContent = `${scenarioEmoji} ${scenarioName}`;
        
        label.appendChild(checkbox);
        label.appendChild(textWrapper);
        
        visibilityControlsContainer.appendChild(label);
        
        // Add event listener for this checkbox
        checkbox.addEventListener('change', function() {
            // Update parameter comparison table
            const activeTableBtn = document.querySelector('.table-control-btn.active');
            if (activeTableBtn) {
                updateParameterComparisonTable(activeTableBtn.dataset.category);
            }
            
            // Update the active chart view
            const activeView = document.querySelector('.chart-view-btn.active');
            if (activeView) {
                const targetView = activeView.dataset.view;
                switch (targetView) {
                    case 'lifecycle':
                        createLifecycleComparisonChart();
                        break;
                    case 'accumulation':
                        createAccumulationComparisonChart();
                        break;
                    case 'withdrawal':
                        createWithdrawalComparisonChart();
                        break;
                    case 'metrics':
                        createMetricsRadarChart();
                        break;
                }
            }
        });
    });
}

// Create the complete lifecycle chart combining accumulation and withdrawal phases
function createLifecycleComparisonChart() {
    const canvas = document.getElementById('lifecycleComparisonChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (lifecycleComparisonChart) {
        lifecycleComparisonChart.destroy();
    }

    // Get visible scenarios based on checkboxes
    const visibleScenarios = getVisibleComparisonScenarios();
    
    if (visibleScenarios.length === 0) {
        // Show message when no scenarios are selected
        displayChartErrorMessage(canvas, ctx, 'no-scenarios');
        return;
    }

    const datasets = [];
    const colors = {
        'A': '#3498db',
        'B': '#27ae60',
        'C': '#e74c3c',
        'D': '#f39c12'
    };

    visibleScenarios.forEach(scenario => {
        if (!scenario.results || !scenario.results.yearlyData) return;
        
        const color = colors[scenario.id] || '#7f8c8d';
        
        // Get accumulation data
        const accumulationData = scenario.results.yearlyData;
        const maxAccumulationYear = Math.max(...accumulationData.map(d => d.year));
        
        // Get the actual final capital from accumulation phase results (not from user input)
        const actualFinalCapital = scenario.results.finalCapital;
        
        // Get withdrawal parameters (but use actual final capital instead of user input)
        const withdrawalDuration = parseInt(getComparisonScenarioValue(scenario.id, 'withdrawal.duration') || '25');
        const withdrawalReturn = parseFloat(getComparisonScenarioValue(scenario.id, 'withdrawal.postRetirementReturn') || '5') / 100;
        const withdrawalInflation = parseFloat(getComparisonScenarioValue(scenario.id, 'withdrawal.inflationRate') || '2') / 100;
        const withdrawalIncludeTax = getComparisonScenarioToggleValue(scenario.id, 'withdrawal.includeTax');
        
        // Calculate withdrawal phase data
        let withdrawalData = [];
        try {
            const withdrawalResults = calculateWithdrawalPlan(
                actualFinalCapital,
                withdrawalDuration,
                withdrawalReturn,
                withdrawalInflation,
                withdrawalIncludeTax,
                scenario.results.totalContributions
            );
            withdrawalData = withdrawalResults.yearlyData || [];
        } catch (error) {
            console.warn(`Could not calculate withdrawal data for scenario ${scenario.id}:`, error);
        }
        
        // Combine accumulation and withdrawal data
        const accumulationPoints = accumulationData.map(d => ({
            x: d.year,
            y: d.capital
        }));
        
        const withdrawalPoints = withdrawalData.map(d => ({
            x: maxAccumulationYear + d.year,
            y: d.endCapital
        }));
        
        // Add transition point to withdrawal data for seamless connection
        if (withdrawalPoints.length > 0) {
            withdrawalPoints.unshift({
                x: maxAccumulationYear,
                y: actualFinalCapital
            });
        }
        
        // Create gradients
        const accumulationGradient = ctx.createLinearGradient(0, 0, 0, 400);
        accumulationGradient.addColorStop(0, color + '80'); // 50% opacity
        accumulationGradient.addColorStop(1, color + '20'); // 12% opacity
        
        const withdrawalGradient = ctx.createLinearGradient(0, 0, 0, 400);
        withdrawalGradient.addColorStop(0, color + '60'); // 38% opacity
        withdrawalGradient.addColorStop(1, color + '10'); // 6% opacity
        
        // Add accumulation phase dataset
        datasets.push({
            label: `${scenario.name} - Ansparphase`,
            data: accumulationPoints,
            borderColor: color,
            backgroundColor: accumulationGradient,
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 2,
            pointHoverRadius: 8,
            pointBackgroundColor: color,
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            scenarioId: scenario.id,
            phase: 'accumulation'
        });
        
        // Add withdrawal phase dataset
        if (withdrawalPoints.length > 1) {
            datasets.push({
                label: `${scenario.name} - Entnahmephase`,
                data: withdrawalPoints,
                borderColor: color,
                backgroundColor: withdrawalGradient,
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                borderDash: [8, 4],
                pointRadius: 2,
                pointHoverRadius: 8,
                pointBackgroundColor: color,
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                scenarioId: scenario.id,
                phase: 'withdrawal'
            });
        }
    });

    lifecycleComparisonChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Kompletter Finanz-Lebenszyklus: Anspar- & Entnahmephase',
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
                        font: { size: 12 },
                        filter: function(item, chart) {
                            // Group by scenario instead of showing all datasets
                            const scenarioNames = new Set();
                            return !scenarioNames.has(item.text.split(' - ')[0]) && scenarioNames.add(item.text.split(' - ')[0]);
                        }
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
                    boxPadding: 8,
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
                        color: 'rgba(0, 0, 0, 0.05)',
                        lineWidth: 1
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
                    min: 0,
                    title: {
                        display: true,
                        text: 'Portfolio Wert (€)',
                        color: '#2c3e50',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        lineWidth: 1
                    },
                    ticks: {
                        callback: function(value) {
                            return '€' + value.toLocaleString('de-DE', { 
                                minimumFractionDigits: 0, 
                                maximumFractionDigits: 0 
                            });
                        },
                        font: {
                            size: 11
                        },
                        color: '#7f8c8d'
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
                    tension: 0.4
                },
                point: {
                    hoverRadius: 12,
                    hitRadius: 25
                }
            },
            animation: {
                duration: 2000,
                easing: 'easeInOutQuart'
            }
        }
    });
}

// Get visible scenarios based on checkbox state
function getVisibleComparisonScenarios() {
    const visibleScenarios = [];
    const checkboxes = document.querySelectorAll('.scenario-visibility-checkbox');
    
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            const scenarioId = checkbox.dataset.scenario;
            const scenario = comparisonScenarios.find(s => s.id === scenarioId);
            if (scenario) {
                visibleScenarios.push(scenario);
            }
        }
    });
    
    return visibleScenarios;
}

// Create the accumulation phase comparison chart
function createAccumulationComparisonChart() {
    const canvas = document.getElementById('accumulationComparisonChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (accumulationComparisonChart) {
        accumulationComparisonChart.destroy();
    }

    // Get visible scenarios based on checkboxes
    const visibleScenarios = getVisibleComparisonScenarios();
    
    if (visibleScenarios.length === 0) {
        // Show message when no scenarios are selected
        displayChartErrorMessage(canvas, ctx, 'no-scenarios');
        return;
    }

    const datasets = [];
    const colors = {
        'A': '#3498db',
        'B': '#27ae60',
        'C': '#e74c3c',
        'D': '#f39c12',
        'E': '#9b59b6',
        'F': '#34495e'
    };

    visibleScenarios.forEach(scenario => {
        if (!scenario.results || !scenario.results.yearlyData) return;
        
        const color = colors[scenario.id] || '#7f8c8d';
        
        // Get accumulation data
        const accumulationData = scenario.results.yearlyData;
        
        // Create data points for accumulation phase
        const accumulationPoints = accumulationData.map(d => ({
            x: d.year,
            y: d.capital
        }));
        
        // Create gradient
        const accumulationGradient = ctx.createLinearGradient(0, 0, 0, 400);
        accumulationGradient.addColorStop(0, color + '60'); // 38% opacity
        accumulationGradient.addColorStop(1, color + '20'); // 12% opacity
        
        // Add accumulation phase dataset
        datasets.push({
            label: `${scenario.name}`,
            data: accumulationPoints,
            borderColor: color,
            backgroundColor: accumulationGradient,
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 2,
            pointHoverRadius: 8,
            pointBackgroundColor: color,
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            scenarioId: scenario.id
        });
    });

    accumulationComparisonChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: {
                        display: true,
                        text: 'Jahre',
                        font: { size: 14, weight: 'bold' },
                        color: '#2c3e50'
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    },
                    ticks: {
                        color: '#7f8c8d',
                        font: { size: 12 }
                    }
                },
                y: {
                    beginAtZero: true,
                    min: 0,
                    title: {
                        display: true,
                        text: 'Portfolio-Wert (€)',
                        font: { size: 14, weight: 'bold' },
                        color: '#2c3e50'
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    },
                    ticks: {
                        color: '#7f8c8d',
                        font: { size: 12 },
                        callback: function(value) {
                            return '€' + formatGermanNumber(value, 0);
                        }
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Ansparphase: Portfolio-Entwicklung im Vergleich',
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
                        font: { size: 12 },
                        color: '#2c3e50'
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
                    boxPadding: 8,
                    callbacks: {
                        title: function(context) {
                            return `Jahr ${context[0].parsed.x}`;
                        },
                        label: function(context) {
                            const scenarioName = context.dataset.label;
                            const value = context.parsed.y;
                            return `${scenarioName}: €${value.toLocaleString('de-DE', { 
                                minimumFractionDigits: 0, 
                                maximumFractionDigits: 0 
                            })}`;
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
                    tension: 0.4
                },
                point: {
                    hoverRadius: 12,
                    hitRadius: 25
                }
            }
        }
    });
}

// Create the withdrawal phase comparison chart
function createWithdrawalComparisonChart() {
    console.log('=== Creating Withdrawal Comparison Chart ===');
    
    const canvas = document.getElementById('withdrawalComparisonChart');
    if (!canvas) {
        console.error('Withdrawal comparison canvas not found!');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    if (withdrawalComparisonChart) {
        withdrawalComparisonChart.destroy();
    }

    // Get visible scenarios based on checkboxes
    const visibleScenarios = getVisibleComparisonScenarios();
    console.log('Visible scenarios:', visibleScenarios.map(s => `${s.id}: ${s.name}`));
    
    if (visibleScenarios.length === 0) {
        console.log('No scenarios selected, showing message');
        // Show message when no scenarios are selected
        displayChartErrorMessage(canvas, ctx, 'no-scenarios');
        return;
    }

    const datasets = [];
    const colors = {
        'A': '#3498db',
        'B': '#27ae60',
        'C': '#e74c3c',
        'D': '#f39c12',
        'E': '#9b59b6',
        'F': '#34495e'
    };

    visibleScenarios.forEach(scenario => {
        console.log(`Processing scenario ${scenario.id}:`, scenario);
        console.log(`  - Has results:`, !!scenario.results);
        console.log(`  - Has withdrawalResults:`, !!scenario.results?.withdrawalResults);
        console.log(`  - Has yearlyData:`, !!scenario.results?.withdrawalResults?.yearlyData);
        
        if (!scenario.results) {
            console.log(`No results for scenario ${scenario.id}, calculating...`);
            // Try to calculate results if they don't exist
            calculateComparisonScenarioResults(scenario.id);
            return;
        }
        
        if (!scenario.results.withdrawalResults) {
            console.log(`No withdrawal results for scenario ${scenario.id}`);
            return;
        }
        
        const color = colors[scenario.id] || '#7f8c8d';
        
        // Get withdrawal phase data
        const withdrawalData = scenario.results.withdrawalResults.yearlyData || [];
        console.log(`Withdrawal data for scenario ${scenario.id}:`, withdrawalData.length, 'data points');
        console.log('Sample data:', withdrawalData.slice(0, 3));
        console.log('Full first year data structure:', withdrawalData[0]);
        
        // Log the starting and ending capital for analysis
        if (withdrawalData.length > 0) {
            const firstYear = withdrawalData[0];
            const lastYear = withdrawalData[withdrawalData.length - 1];
            console.log(`Scenario ${scenario.id} - Starting capital: €${formatGermanNumber(firstYear.startCapital || 0, 0)}`);
            console.log(`Scenario ${scenario.id} - Ending capital: €${formatGermanNumber(lastYear.endCapital || 0, 0)}`);
            console.log(`Scenario ${scenario.id} - Gross withdrawal: €${formatGermanNumber(firstYear.grossWithdrawal || 0, 0)}`);
        }
        
        if (withdrawalData.length === 0) {
            console.log(`No withdrawal yearly data for scenario ${scenario.id}`);
            return;
        }
        
        // Transform data for Chart.js (using actual year data, year 1 = x:0)
        const chartData = withdrawalData.map((data, index) => {
            const xValue = (data.year || (index + 1)) - 1;  // Use year property or fallback to index+1, then convert to 0-based
            const yValue = data.endCapital || 0;
            return {
                x: xValue,
                y: yValue
            };
        });
        
        console.log(`Chart data for scenario ${scenario.id}:`, chartData.slice(0, 3));
        console.log(`Chart data range for ${scenario.id}: €${formatGermanNumber(Math.min(...chartData.map(d => d.y)), 0)} to €${formatGermanNumber(Math.max(...chartData.map(d => d.y)), 0)}`);
        
        // Create gradient fill
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, color + '40');
        gradient.addColorStop(1, color + '10');
        
        // Use fallback emoji if not available
        const scenarioEmoji = scenario.emoji || '📊';
        
        datasets.push({
            label: scenario.name,
            data: chartData,
            borderColor: color,
            backgroundColor: gradient,
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: color,
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointHoverBackgroundColor: color,
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 3,
            scenarioId: scenario.id
        });
        
        console.log(`Added dataset for scenario ${scenario.id} with ${chartData.length} points`);
    });

    console.log(`Total datasets created: ${datasets.length}`);

    if (datasets.length === 0) {
        console.log('No datasets available, showing no data message');
        displayChartErrorMessage(canvas, ctx, 'no-data');
        return;
    }

    console.log('Creating Chart.js instance...');

    withdrawalComparisonChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: {
                        display: true,
                        text: 'Jahre in der Entnahmephase',
                        font: { size: 14, weight: 'bold' },
                        color: '#2c3e50'
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    },
                    ticks: {
                        color: '#7f8c8d',
                        font: { size: 12 },
                        stepSize: 1,
                        callback: function(value) {
                            return 'Jahr ' + (value + 1);  // Display as Jahr 1, Jahr 2, etc.
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    min: 0,
                    title: {
                        display: true,
                        text: 'Verbleibendes Portfolio (€)',
                        font: { size: 14, weight: 'bold' },
                        color: '#2c3e50'
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    },
                    ticks: {
                        color: '#7f8c8d',
                        font: { size: 12 },
                        callback: function(value) {
                            return '€' + formatGermanNumber(value, 0);
                        }
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Entnahmephase: Portfolio-Entwicklung im Vergleich',
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
                        font: { size: 12 },
                        color: '#2c3e50'
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
                    boxPadding: 8,
                    callbacks: {
                        title: function(context) {
                            return `Jahr ${context[0].parsed.x + 1}`;
                        },
                        label: function(context) {
                            const scenarioName = context.dataset.label;
                            const value = context.parsed.y;
                            return `${scenarioName}: €${value.toLocaleString('de-DE', { 
                                minimumFractionDigits: 0, 
                                maximumFractionDigits: 0 
                            })}`;
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
                    tension: 0.4
                },
                point: {
                    hoverRadius: 12,
                    hitRadius: 25
                }
            }
        }
    });
    
    console.log('Withdrawal comparison chart created successfully');
}

function createMetricsRadarChart() {
    const canvas = document.getElementById('metricsRadarChart');
    if (!canvas) {
        console.log('Metrics radar chart canvas not found');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if it exists
    if (metricsRadarChart) {
        metricsRadarChart.destroy();
    }

    // Get visible scenarios based on checkboxes
    const visibleScenarios = getVisibleComparisonScenarios();
    
    if (visibleScenarios.length === 0) {
        // Show message when no scenarios are selected
        displayChartErrorMessage(canvas, ctx, 'no-scenarios');
        return;
    }

    // Calculate normalized metrics for each scenario
    const datasets = [];
    const colors = {
        'A': '#3498db',
        'B': '#27ae60',
        'C': '#e74c3c',
        'D': '#f39c12',
        'E': '#9b59b6',
        'F': '#34495e'
    };

    // Define the metrics labels
    const metricLabels = [
        'Portfolio-Wert',
        'Rendite-Effizienz', 
        'Steuer-Effizienz',
        'Risiko-Level',
        'Nachhaltigkeit'
    ];

    // Calculate metrics for normalization (find min/max values across all scenarios)
    const allMetrics = {
        portfolioValue: [],
        returnEfficiency: [],
        taxEfficiency: [],
        riskLevel: [],
        sustainability: []
    };

    visibleScenarios.forEach(scenario => {
        if (scenario.results) {
            const metrics = calculateScenarioMetrics(scenario);
            allMetrics.portfolioValue.push(metrics.portfolioValue);
            allMetrics.returnEfficiency.push(metrics.returnEfficiency);
            allMetrics.taxEfficiency.push(metrics.taxEfficiency);
            allMetrics.riskLevel.push(metrics.riskLevel);
            allMetrics.sustainability.push(metrics.sustainability);
        }
    });

    // Find min/max for normalization
    const normalize = (value, min, max) => {
        if (max === min) return 50; // Default to middle if all values are the same
        return ((value - min) / (max - min)) * 100;
    };

    const ranges = {
        portfolioValue: { min: Math.min(...allMetrics.portfolioValue), max: Math.max(...allMetrics.portfolioValue) },
        returnEfficiency: { min: Math.min(...allMetrics.returnEfficiency), max: Math.max(...allMetrics.returnEfficiency) },
        taxEfficiency: { min: Math.min(...allMetrics.taxEfficiency), max: Math.max(...allMetrics.taxEfficiency) },
        riskLevel: { min: Math.min(...allMetrics.riskLevel), max: Math.max(...allMetrics.riskLevel) },
        sustainability: { min: Math.min(...allMetrics.sustainability), max: Math.max(...allMetrics.sustainability) }
    };

    // Create datasets for each visible scenario
    visibleScenarios.forEach(scenario => {
        if (!scenario.results) return;

        const metrics = calculateScenarioMetrics(scenario);
        const color = colors[scenario.id] || '#7f8c8d';

        // Normalize metrics to 0-100 scale
        const normalizedData = [
            normalize(metrics.portfolioValue, ranges.portfolioValue.min, ranges.portfolioValue.max),
            normalize(metrics.returnEfficiency, ranges.returnEfficiency.min, ranges.returnEfficiency.max),
            normalize(metrics.taxEfficiency, ranges.taxEfficiency.min, ranges.taxEfficiency.max),
            100 - normalize(metrics.riskLevel, ranges.riskLevel.min, ranges.riskLevel.max), // Invert risk (lower risk = better)
            normalize(metrics.sustainability, ranges.sustainability.min, ranges.sustainability.max)
        ];

        datasets.push({
            label: scenario.name,
            data: normalizedData,
            borderColor: color,
            backgroundColor: color + '20', // 20% transparency
            pointBackgroundColor: color,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
            fill: true,
            tension: 0.1
        });
    });

    console.log('Creating metrics radar chart with datasets:', datasets.length);

    // Create the radar chart
    metricsRadarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: metricLabels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    min: 0,
                    ticks: {
                        stepSize: 20,
                        color: '#7f8c8d',
                        font: { size: 11 },
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    },
                    angleLines: {
                        color: 'rgba(0,0,0,0.1)'
                    },
                    pointLabels: {
                        color: '#2c3e50',
                        font: { 
                            size: 12,
                            weight: 'bold'
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        color: '#2c3e50',
                        font: { size: 12 },
                        padding: 20
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#2c3e50',
                    bodyColor: '#2c3e50',
                    borderColor: '#ddd',
                    borderWidth: 1,
                    callbacks: {
                        title: function(context) {
                            return context[0].dataset.label;
                        },
                        label: function(context) {
                            const scenario = visibleScenarios.find(s => s.name === context.dataset.label);
                            if (!scenario) return '';
                            
                            const metrics = calculateScenarioMetrics(scenario);
                            const label = context.label;
                            
                            switch(label) {
                                case 'Portfolio-Wert':
                                    return `Portfolio-Wert: ${formatCurrency(metrics.portfolioValue)}`;
                                case 'Rendite-Effizienz':
                                    return `Jährliche Rendite: ${metrics.returnEfficiency.toFixed(1)}%`;
                                case 'Steuer-Effizienz':
                                    return `Netto-Rendite: ${metrics.taxEfficiency.toFixed(1)}%`;
                                case 'Risiko-Level':
                                    return `Risiko-Score: ${metrics.riskLevel.toFixed(1)}`;
                                case 'Nachhaltigkeit':
                                    return `Nachhaltigkeit: ${metrics.sustainability.toFixed(0)} Jahre`;
                                default:
                                    return '';
                            }
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'nearest'
            }
        }
    });
}

// Helper function to calculate metrics for a scenario
function calculateScenarioMetrics(scenario) {
    const results = scenario.results;
    
    // Portfolio Value: Final capital at retirement
    const portfolioValue = results.finalCapital || 0;
    
    // Return Efficiency: Effective annual return percentage
    const returnEfficiency = results.effectiveReturn || 0;
    
    // Tax Efficiency: Net return after taxes
    const grossReturn = results.effectiveReturn || 0;
    const taxRate = results.taxesPaid / Math.max(results.totalGains, 1); // Avoid division by zero
    const taxEfficiency = grossReturn * (1 - taxRate);
    
    // Risk Level: Calculate based on return rate and duration (higher return = higher risk)
    const annualReturn = parseFloat(getComparisonScenarioValue(scenario.id, 'accumulation.annualReturn') || '7');
    const postRetirementReturn = parseFloat(getComparisonScenarioValue(scenario.id, 'withdrawal.postRetirementReturn') || '6');
    const avgReturn = (annualReturn + postRetirementReturn) / 2;
    const riskLevel = Math.min(Math.max(avgReturn - 3, 0), 10); // Scale 0-10, 3% as baseline "safe" return
    
    // Sustainability: Based on withdrawal duration and capital preservation
    const withdrawalDuration = parseInt(getComparisonScenarioValue(scenario.id, 'withdrawal.duration') || '25');
    const capitalPreservation = results.withdrawalResults?.remainingCapital > 0 ? 1.2 : 1.0; // Bonus if capital is preserved
    const sustainability = withdrawalDuration * capitalPreservation;
    
    return {
        portfolioValue,
        returnEfficiency,
        taxEfficiency,
        riskLevel,
        sustainability
    };
}

function calculateRealValue(nominalValue, inflationRate, years) {
    // Calculate real value: nominalValue / (1 + inflationRate)^years
    return nominalValue / Math.pow(1 + inflationRate, years);
}

function createComparisonResultCard(scenario) {
    const card = document.createElement('div');
    card.className = 'scenario-result-card';
    card.dataset.scenario = scenario.id;
    
    const colors = {
        'A': '#3498db',
        'B': '#27ae60',
        'C': '#e74c3c',
        'D': '#f39c12'
    };
    
    card.style.setProperty('--scenario-color', colors[scenario.id] || '#7f8c8d');
    
    // Calculate real value for capital at retirement
    const nominalCapital = scenario.results.finalCapital || 0;
    const inflationRate = parseFloat(getComparisonScenarioValue(scenario.id, 'accumulation.inflationRate') || '2') / 100;
    const duration = parseInt(getComparisonScenarioValue(scenario.id, 'accumulation.duration') || '25');
    const realCapital = calculateRealValue(nominalCapital, inflationRate, duration);
    
    card.innerHTML = `
        <div class="scenario-card-header">
            <h4>
                <span class="scenario-color-indicator" style="background-color: ${colors[scenario.id] || '#7f8c8d'};"></span>
                ${scenario.emoji} ${scenario.name}
            </h4>
        </div>
        <div class="key-metrics">
            <div class="metric">
                <span class="metric-label">Verfügbare Sparrate</span>
                <span class="metric-value">${formatCurrency(parseGermanNumber(getComparisonScenarioValue(scenario.id, 'accumulation.monthlySavings') || '0'))}/Monat</span>
            </div>
            <div class="metric">
                <span class="metric-label">Kapital bei Renteneintritt</span>
                <span class="metric-value">
                    ${formatCurrency(nominalCapital)}
                    <div style="font-size: 0.8em; font-weight: normal; color: #7f8c8d; margin-top: 2px;">
                        (${formatCurrency(realCapital)})
                    </div>
                </span>
            </div>
            <div class="metric">
                <span class="metric-label">Monatliche Rente</span>
                <span class="metric-value">${formatCurrency(scenario.results.monthlyPension || 0)}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Rentenjahre</span>
                <span class="metric-value">${parseInt(getComparisonScenarioValue(scenario.id, 'withdrawal.duration') || '25')} Jahre</span>
            </div>
        </div>
    `;
    
    return card;
}

function updateSavingsRateDisplay(scenarioId, availableSavings) {
    const savingsRateSlider = document.querySelector(`[data-scenario="${scenarioId}"] .savings-rate-slider`);
    const savingsRateValue = document.querySelector(`[data-scenario="${scenarioId}"] .savings-rate-value`);
    const savingsRateAmount = document.querySelector(`[data-scenario="${scenarioId}"] .savings-rate-amount`);
    
    if (savingsRateSlider && savingsRateValue && savingsRateAmount) {
        const percentage = parseFloat(savingsRateSlider.value);
        const calculatedAmount = availableSavings * (percentage / 100);
        
        savingsRateValue.textContent = `${percentage}%`;
        
        if (calculatedAmount > 0) {
            savingsRateAmount.textContent = `€${formatGermanNumber(calculatedAmount, 0)}/Monat`;
            // Use solid green background like €887/Monat box
            savingsRateAmount.style.background = '#27ae60';
            savingsRateAmount.style.border = 'none';
            savingsRateAmount.style.boxShadow = '0 2px 6px rgba(39, 174, 96, 0.3)';
            // Remove glass effect properties
            savingsRateAmount.style.backdropFilter = '';
            savingsRateAmount.style.webkitBackdropFilter = '';
        } else {
            savingsRateAmount.textContent = `€0/Monat`;
            savingsRateAmount.style.background = 'linear-gradient(135deg, #95a5a6, #7f8c8d)';
        }
    }
}

function getComparisonScenarioValue(scenarioId, param) {
    const input = document.querySelector(`[data-scenario="${scenarioId}"] [data-param="${param}"]`);
    return input ? input.value : null;
}

function setupComparisonProfileSelection() {
    // Load available profiles for all existing dropdowns
    loadComparisonProfiles();
    
    // Setup event listeners for all profile selectors using event delegation
    document.addEventListener('change', function(e) {
        if (e.target.classList.contains('scenario-profile-select')) {
            const scenarioId = e.target.dataset.scenario;
            const hasProfile = e.target.value !== '';
            
            if (hasProfile) {
                // Immediately apply profile to current scenario
                applyProfileToScenario(e.target.value, scenarioId);
                showProfileSelectionStatusForScenario(scenarioId, 'success', `Profil "${e.target.options[e.target.selectedIndex].text}" wurde automatisch angewendet.`);
            } else {
                hideProfileSelectionStatusForScenario(scenarioId);
            }
        }
    });
    
}

function loadComparisonProfiles() {
    // Find all profile dropdowns
    const profileSelects = document.querySelectorAll('.scenario-profile-select');
    if (profileSelects.length === 0) return;
    
    console.log('=== Debug: localStorage keys ===');
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        console.log(`Key ${i}: ${key}`);
    }
    console.log('=== End localStorage keys ===');
    
    // Load profiles from localStorage with the correct key pattern
    const profiles = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('budgetProfile_')) {
            const profileName = key.replace('budgetProfile_', '');
            try {
                const profileData = JSON.parse(localStorage.getItem(key));
                console.log(`Found profile: ${profileName}`, profileData);
                profiles.push({
                    name: profileName,
                    displayName: profileData.name || profileName,
                    data: profileData
                });
            } catch (error) {
                console.error(`Error parsing profile ${profileName}:`, error);
            }
        }
    }
    
    console.log(`Total profiles found: ${profiles.length}`);
    
    // Update all profile dropdowns
    profileSelects.forEach(profileSelect => {
        // Clear existing options except the first one
        while (profileSelect.children.length > 1) {
            profileSelect.removeChild(profileSelect.lastChild);
        }
        
        if (profiles.length > 0) {
            // Sort profiles alphabetically
            profiles.sort((a, b) => a.displayName.localeCompare(b.displayName));
            
            profiles.forEach(profile => {
                const option = document.createElement('option');
                option.value = profile.name;
                option.textContent = profile.displayName;
                profileSelect.appendChild(option);
            });
        }
    });
    
    // Show status for the first scenario (or could be removed entirely)
    if (profiles.length === 0) {
        console.log('No profiles found in localStorage');
    }
}

function applyProfileToScenario(profileName, scenarioId) {
    const profileData = localStorage.getItem('budgetProfile_' + profileName);
    if (!profileData) {
        showProfileSelectionStatus('error', 'Profil nicht gefunden.');
        return;
    }
    
    const profile = JSON.parse(profileData);
    
    // Extract data from profile structure  
    let netSalary = parseGermanNumber(profile.income?.salary || '0');
    let sideIncome = parseGermanNumber(profile.income?.sideIncome || '0') + parseGermanNumber(profile.income?.otherIncome || '0');
    
    // Convert income to monthly if saved as yearly
    const incomePeriod = profile.periods?.income || 'monthly';
    if (incomePeriod === 'yearly') {
        netSalary /= 12;
        sideIncome /= 12;
    }
    
    // Debug: Log profile data structure
    console.log('Profile data structure:', profile);
    console.log('Profile expenses:', profile.expenses);
    console.log('Profile periods:', profile.periods);
    
    // Calculate fixed expenses from profile (same categories as in main budget)
    let rentValue = parseGermanNumber(profile.expenses?.rent || '0');
    let utilitiesValue = parseGermanNumber(profile.expenses?.utilities || '0');
    let healthValue = parseGermanNumber(profile.expenses?.health || '0');
    let insuranceValue = parseGermanNumber(profile.expenses?.insurance || '0');
    let internetValue = parseGermanNumber(profile.expenses?.internet || '0');
    let gezValue = parseGermanNumber(profile.expenses?.gez || '0');
    
    // Convert to monthly if saved as yearly
    const fixedPeriod = profile.periods?.fixed || 'monthly';
    if (fixedPeriod === 'yearly') {
        rentValue /= 12;
        utilitiesValue /= 12;
        healthValue /= 12;
        insuranceValue /= 12;
        internetValue /= 12;
        gezValue /= 12;
    }
    
    const fixedExpenses = rentValue + utilitiesValue + healthValue + insuranceValue + internetValue + gezValue;
    
    console.log('Fixed expenses breakdown:', {
        rent: rentValue, utilities: utilitiesValue, health: healthValue,
        insurance: insuranceValue, internet: internetValue, gez: gezValue,
        total: fixedExpenses
    });
    
    // Calculate variable expenses from profile (same categories as in main budget)
    let foodValue = parseGermanNumber(profile.expenses?.food || '0');
    let transportValue = parseGermanNumber(profile.expenses?.transport || '0');
    let leisureValue = parseGermanNumber(profile.expenses?.leisure || '0');
    let clothingValue = parseGermanNumber(profile.expenses?.clothing || '0');
    let subscriptionsValue = parseGermanNumber(profile.expenses?.subscriptions || '0');
    let miscellaneousValue = parseGermanNumber(profile.expenses?.miscellaneous || '0');
    
    // Convert to monthly if saved as yearly
    const variablePeriod = profile.periods?.variable || 'monthly';
    if (variablePeriod === 'yearly') {
        foodValue /= 12;
        transportValue /= 12;
        leisureValue /= 12;
        clothingValue /= 12;
        subscriptionsValue /= 12;
        miscellaneousValue /= 12;
    }
    
    const variableExpenses = foodValue + transportValue + leisureValue + clothingValue + subscriptionsValue + miscellaneousValue;
    
    console.log('Variable expenses breakdown:', {
        food: foodValue, transport: transportValue, leisure: leisureValue,
        clothing: clothingValue, subscriptions: subscriptionsValue, miscellaneous: miscellaneousValue,
        total: variableExpenses
    });
    
    // Update input fields
    const netSalaryInput = document.querySelector(`[data-scenario="${scenarioId}"] [data-param="budget.netSalary"]`);
    const sideIncomeInput = document.querySelector(`[data-scenario="${scenarioId}"] [data-param="budget.sideIncome"]`);
    const fixedExpensesInput = document.querySelector(`[data-scenario="${scenarioId}"] [data-param="budget.fixedExpenses"]`);
    const variableExpensesInput = document.querySelector(`[data-scenario="${scenarioId}"] [data-param="budget.variableExpenses"]`);
    
    if (netSalaryInput) netSalaryInput.value = formatGermanNumber(netSalary, 0);
    if (sideIncomeInput) sideIncomeInput.value = formatGermanNumber(sideIncome, 0);
    if (fixedExpensesInput) fixedExpensesInput.value = formatGermanNumber(fixedExpenses, 0);
    if (variableExpensesInput) variableExpensesInput.value = formatGermanNumber(variableExpenses, 0);
    
    // Recalculate budget and results
    updateComparisonScenarioBudget(scenarioId);
    // Note: updateComparisonScenarioBudget now calls calculateComparisonScenarioResults automatically
    
    const scenarioName = comparisonScenarios.find(s => s.id === scenarioId)?.name || scenarioId;
    showProfileSelectionStatus('success', `Profil "${profile.name || profileName}" wurde erfolgreich auf ${scenarioName} angewendet.`);
    setTimeout(hideProfileSelectionStatus, 3000);
}

function applyProfileToAllScenarios(profileName) {
    let successCount = 0;
    
    comparisonScenarios.forEach(scenario => {
        try {
            applyProfileToScenario(profileName, scenario.id);
            successCount++;
        } catch (error) {
            console.error(`Failed to apply profile to scenario ${scenario.id}:`, error);
        }
    });
    
    if (successCount === comparisonScenarios.length) {
        showProfileSelectionStatus('success', `Profil "${profileName}" wurde erfolgreich auf alle ${successCount} Szenarien angewendet.`);
    } else if (successCount > 0) {
        showProfileSelectionStatus('warning', `Profil "${profileName}" wurde auf ${successCount} von ${comparisonScenarios.length} Szenarien angewendet.`);
    } else {
        showProfileSelectionStatus('error', `Fehler beim Anwenden des Profils "${profileName}".`);
    }
    
    setTimeout(hideProfileSelectionStatus, 4000);
}

function showProfileSelectionStatus(type, message) {
    // Legacy function - now redirects to scenario-specific function
    showProfileSelectionStatusForScenario('A', type, message);
}

function hideProfileSelectionStatus() {
    // Legacy function - now redirects to scenario-specific function
    hideProfileSelectionStatusForScenario('A');
}

function showProfileSelectionStatusForScenario(scenarioId, type, message) {
    const statusElement = document.querySelector(`[data-scenario="${scenarioId}"] .profile-selection-status-inline`);
    if (!statusElement) return;
    
    const statusIcon = statusElement.querySelector('.status-icon');
    const statusMessage = statusElement.querySelector('.status-message');
    
    // Remove existing type classes
    statusElement.classList.remove('success', 'warning', 'error', 'info');
    
    // Add appropriate type class and icon
    statusElement.classList.add(type);
    
    switch (type) {
        case 'success':
            statusIcon.textContent = '✅';
            break;
        case 'warning':
            statusIcon.textContent = '⚠️';
            break;
        case 'error':
            statusIcon.textContent = '❌';
            break;
        case 'ready':
            statusIcon.textContent = '🎯';
            statusElement.classList.add('info');
            break;
        default:
            statusIcon.textContent = 'ℹ️';
            break;
    }
    
    statusMessage.textContent = message;
    statusElement.style.display = 'flex';
}

function hideProfileSelectionStatusForScenario(scenarioId) {
    const statusElement = document.querySelector(`[data-scenario="${scenarioId}"] .profile-selection-status-inline`);
    if (statusElement) {
        statusElement.style.display = 'none';
    }
}

function renameComparisonScenario(scenarioId) {
    const scenario = comparisonScenarios.find(s => s.id === scenarioId);
    if (!scenario) return;
    
    const newName = prompt('Neuer Name für das Szenario:', scenario.name);
    if (newName && newName.trim() !== '') {
        scenario.name = newName.trim();
        
        // Update tab title
        const tab = document.querySelector(`#comparisonScenarioTabs .scenario-tab[data-scenario="${scenarioId}"]`);
        if (tab) {
            // Keep the existing icon/emoji and color dot, just update the text
            const colorDot = tab.querySelector('.scenario-color-dot');
            const icon = tab.innerHTML.split(' ')[0]; // Get the emoji/icon
            tab.innerHTML = `${icon} ${scenario.name}`;
            if (colorDot) {
                tab.insertBefore(colorDot, tab.firstChild);
            }
        }
        
        // Update panel title
        const panel = document.querySelector(`.comparison-scenario-panel[data-scenario="${scenarioId}"] .scenario-panel-title`);
        if (panel) {
            const colorDot = panel.querySelector('.scenario-color-dot');
            const icon = panel.innerHTML.split(' ')[0]; // Get the emoji/icon
            panel.innerHTML = `${icon} ${scenario.name}`;
            if (colorDot) {
                panel.insertBefore(colorDot, panel.firstChild);
            }
            // Re-add the rename button
            const renameBtn = document.createElement('button');
            renameBtn.className = 'rename-scenario-btn';
            renameBtn.title = 'Szenario umbenennen';
            renameBtn.onclick = () => renameComparisonScenario(scenarioId);
            renameBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
            `;
            panel.appendChild(renameBtn);
        }
        
        // Update results cards and any other references
        updateComparisonResultsGrid();
        
        // Update scenario visibility controls to reflect the new name
        updateScenarioVisibilityControls();
        
        // Update parameter comparison table to reflect the new scenario name in headers
        const activeTableBtn = document.querySelector('.table-control-btn.active');
        if (activeTableBtn) {
            updateParameterComparisonTable(activeTableBtn.dataset.category);
        }
        
        // Update charts to reflect the new scenario name in legends
        const activeView = document.querySelector('.chart-view-btn.active');
        if (activeView) {
            const targetView = activeView.dataset.view;
            switch (targetView) {
                case 'lifecycle':
                    createLifecycleComparisonChart();
                    break;
                case 'accumulation':
                    createAccumulationComparisonChart();
                    break;
                case 'withdrawal':
                    createWithdrawalComparisonChart();
                    break;
                case 'metrics':
                    createMetricsRadarChart();
                    break;
            }
        }
    }
}

// ===========================================
// SCENARIO IMPORT FUNCTIONALITY
// ===========================================

/**
 * Save current Ansparphase scenarios to localStorage for import in comparison
 */
/**
 * Save individual scenario from Ansparphase to localStorage for import into comparison
 */
function saveIndividualAnsparphaseScenario(scenarioId) {
    try {
        const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario) {
            console.log('Scenario not found:', scenarioId);
            return false;
        }

        // Prepare scenario data with all parameters
        const scenarioData = {
            id: scenario.id,
            name: scenario.name,
            color: scenario.color,
            parameters: {
                monthlySavings: parseGermanNumber(getScenarioValue('monthlySavings', scenario.id)),
                initialCapital: parseGermanNumber(getScenarioValue('initialCapital', scenario.id)),
                annualReturn: parseFloat(getScenarioValue('annualReturn', scenario.id)),
                inflationRate: parseFloat(getScenarioValue('inflationRate', scenario.id)),
                salaryGrowth: parseFloat(getScenarioValue('salaryGrowth', scenario.id)),
                duration: parseInt(getScenarioValue('duration', scenario.id)),
                baseSalary: parseGermanNumber(getScenarioValue('baseSalary', scenario.id)),
                salaryToSavings: parseFloat(getScenarioValue('salaryToSavings', scenario.id)),
                includeTax: getScenarioToggleValue('taxToggle', scenario.id),
                teilfreistellung: getScenarioToggleValue('teilfreistellungToggle', scenario.id),
                etfType: getScenarioETFType(scenario.id)
            },
            results: scenario.results || {},
            savedAt: new Date().toISOString()
        };

        // Save with simple key format: ansparScenario_A, ansparScenario_B, etc.
        const storageKey = `ansparScenario_${scenarioId}`;
        localStorage.setItem(storageKey, JSON.stringify(scenarioData));
        console.log('Individual scenario saved:', storageKey, scenarioData);
        
        // Refresh the dropdown in comparison section if it exists
        if (typeof loadScenarioImports === 'function') {
            loadScenarioImports();
        }
        
        return storageKey;
    } catch (error) {
        console.error('Error saving individual scenario:', error);
        return false;
    }
}

/**
 * Save all current scenarios from Ansparphase (calls individual save for each)
 */
function saveAnsparphaseScenarios() {
    try {
        if (scenarios.length === 0) {
            console.log('No scenarios to save');
            return false;
        }

        // Save each scenario individually
        let savedCount = 0;
        scenarios.forEach(scenario => {
            if (saveIndividualAnsparphaseScenario(scenario.id)) {
                savedCount++;
            }
        });

        console.log(`Saved ${savedCount} individual scenarios`);
        return savedCount > 0;
    } catch (error) {
        console.error('Error saving scenarios:', error);
        return false;
    }
}

/**
 * Get ETF Type for a scenario
 */
function getScenarioETFType(scenarioId) {
    const etfTypeElement = document.querySelector(`input[name="etfType-${scenarioId}"]:checked`);
    if (etfTypeElement) {
        return etfTypeElement.value;
    }
    // Fallback to main ETF type if scenario-specific not found
    const mainEtfTypeElement = document.querySelector('input[name="etfType"]:checked');
    return mainEtfTypeElement ? mainEtfTypeElement.value : 'thesaurierend';
}

/**
 * Load available individual Ansparphase scenarios from localStorage
 */
function loadAvailableAnsparphaseScenarios() {
    const availableScenarios = [];
    
    try {
        // Only include scenarios that actually exist in the current scenarios array
        scenarios.forEach(scenario => {
            const storageKey = `ansparScenario_${scenario.id}`;
            const storedData = localStorage.getItem(storageKey);
            
            if (storedData) {
                try {
                    const data = JSON.parse(storedData);
                    if (data && data.id) {
                        // Get the current scenario name from the UI
                        const scenarioTitle = document.querySelector(`.scenario-panel-title[data-scenario="${scenario.id}"]`) || 
                                            document.querySelector(`h3[data-scenario="${scenario.id}"]`) ||
                                            document.querySelector(`.scenario-tab[data-scenario="${scenario.id}"]`);
                        
                        let currentScenarioName = scenario.name || `Szenario ${scenario.id}`;
                        if (scenarioTitle) {
                            const titleText = scenarioTitle.textContent.trim();
                            // Extract name after emoji and scenario ID
                            const nameMatch = titleText.match(/(?:🎯|📈|💥|⚡|🚀|🏆|📊)\s*Szenario\s+[A-Z]\s*-\s*(.+)/) || 
                                            titleText.match(/Szenario\s+[A-Z]\s*-\s*(.+)/) ||
                                            titleText.match(/(?:🎯|📈|💥|⚡|🚀|🏆|📊)\s*(.+)/);
                            if (nameMatch && nameMatch[1]) {
                                currentScenarioName = nameMatch[1].trim();
                            } else if (titleText.includes('Szenario')) {
                                currentScenarioName = titleText;
                            }
                        }
                        
                        // Use saved data values, as they represent the complete saved state
                        const monthlySavings = data.parameters.monthlySavings || 500;
                        
                        availableScenarios.push({
                            storageKey: storageKey,
                            scenarioId: data.id,
                            name: currentScenarioName,
                            savedAt: data.savedAt,
                            data: data,
                            displayName: `${currentScenarioName} (€${formatGermanNumber(monthlySavings, 0)}, ${data.parameters.duration || 25}J, ${data.parameters.annualReturn || 7}%)`
                        });
                    }
                } catch (parseError) {
                    console.warn(`Error parsing scenario data for ${storageKey}:`, parseError);
                }
            } else {
                // If not saved yet, create from current UI values
                const monthlySavingsElement = document.getElementById(`monthlySavings_${scenario.id}`);
                const initialCapitalElement = document.getElementById(`initialCapital_${scenario.id}`);
                const annualReturnElement = document.getElementById(`annualReturn_${scenario.id}`);
                const durationElement = document.getElementById(`duration_${scenario.id}`);
                
                if (monthlySavingsElement) {
                    // Get the current scenario name from the UI
                    const scenarioTitle = document.querySelector(`.scenario-panel-title[data-scenario="${scenario.id}"]`) || 
                                        document.querySelector(`h3[data-scenario="${scenario.id}"]`) ||
                                        document.querySelector(`.scenario-tab[data-scenario="${scenario.id}"]`);
                    
                    let currentScenarioName = scenario.name || `Szenario ${scenario.id}`;
                    if (scenarioTitle) {
                        const titleText = scenarioTitle.textContent.trim();
                        // Extract name after emoji and scenario ID
                        const nameMatch = titleText.match(/(?:🎯|📈|💥|⚡|🚀|🏆|📊)\s*Szenario\s+[A-Z]\s*-\s*(.+)/) || 
                                        titleText.match(/Szenario\s+[A-Z]\s*-\s*(.+)/) ||
                                        titleText.match(/(?:🎯|📈|💥|⚡|🚀|🏆|📊)\s*(.+)/);
                        if (nameMatch && nameMatch[1]) {
                            currentScenarioName = nameMatch[1].trim();
                        } else if (titleText.includes('Szenario')) {
                            currentScenarioName = titleText;
                        }
                    }
                    
                    const monthlySavings = parseGermanNumber(monthlySavingsElement.value) || 500;
                    const initialCapital = initialCapitalElement ? parseGermanNumber(initialCapitalElement.value) || 3000 : 3000;
                    const annualReturn = annualReturnElement ? parseFloat(annualReturnElement.value) || 7 : 7;
                    const duration = durationElement ? parseInt(durationElement.value) || 25 : 25;
                    
                    // Create temporary data for display
                    const tempData = {
                        id: scenario.id,
                        name: currentScenarioName,
                        parameters: {
                            monthlySavings: monthlySavings,
                            initialCapital: initialCapital,
                            annualReturn: annualReturn,
                            duration: duration
                        }
                    };
                    
                    availableScenarios.push({
                        storageKey: `ansparScenario_${scenario.id}`,
                        scenarioId: scenario.id,
                        name: currentScenarioName,
                        savedAt: null,
                        data: tempData,
                        displayName: `${currentScenarioName} (€${formatGermanNumber(monthlySavings, 0)}, ${duration}J, ${annualReturn}%)`
                    });
                }
            }
        });
        
        // Sort by scenario ID (A, B, C, etc.)
        availableScenarios.sort((a, b) => a.scenarioId.localeCompare(b.scenarioId));
        
    } catch (error) {
        console.error('Error loading Ansparphase scenarios:', error);
    }
    
    return availableScenarios;
}

/**
 * Apply imported parameters to a comparison scenario
 */
function applyImportedParametersToScenario(scenarioId, parameters) {
    try {
        // Apply accumulation parameters
        const accParams = parameters.accumulation;
        
        // Set input fields
        setComparisonScenarioValue(scenarioId, 'accumulation.monthlySavings', accParams.monthlySavings);
        setComparisonScenarioValue(scenarioId, 'accumulation.initialCapital', accParams.initialCapital);
        
        // Set base salary if available
        if (accParams.baseSalary !== undefined) {
            const baseSalaryElement = document.querySelector(`[data-param="accumulation.baseSalary"][data-scenario="${scenarioId}"]`);
            if (baseSalaryElement) {
                baseSalaryElement.value = formatGermanNumber(accParams.baseSalary, 0);
                baseSalaryElement.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
        
        // Set sliders with proper value updates
        setComparisonScenarioSlider(scenarioId, 'accumulation.annualReturn', accParams.annualReturn);
        setComparisonScenarioSlider(scenarioId, 'accumulation.inflationRate', accParams.inflationRate);
        setComparisonScenarioSlider(scenarioId, 'accumulation.duration', accParams.duration);
        setComparisonScenarioSlider(scenarioId, 'accumulation.salaryGrowth', accParams.salaryGrowth);
        setComparisonScenarioSlider(scenarioId, 'accumulation.salaryToSavings', accParams.salaryToSavings);
        
        // Set toggles
        setComparisonScenarioToggle(scenarioId, 'accumulation.includeTax', accParams.includeTax);
        setComparisonScenarioToggle(scenarioId, 'accumulation.teilfreistellung', accParams.teilfreistellung);
        
        // Set ETF type radio button
        setComparisonScenarioETFType(scenarioId, accParams.etfType);
        
        // Apply withdrawal parameters if available
        if (parameters.withdrawal) {
            const withParams = parameters.withdrawal;
            setComparisonScenarioValue(scenarioId, 'withdrawal.retirementCapital', withParams.retirementCapital);
            if (withParams.duration !== undefined) {
                setComparisonScenarioSlider(scenarioId, 'withdrawal.duration', withParams.duration);
            }
            if (withParams.postRetirementReturn !== undefined) {
                setComparisonScenarioSlider(scenarioId, 'withdrawal.postRetirementReturn', withParams.postRetirementReturn);
            }
            setComparisonScenarioSlider(scenarioId, 'withdrawal.inflationRate', withParams.inflationRate);
            setComparisonScenarioToggle(scenarioId, 'withdrawal.includeTax', withParams.includeTax);
        }
        
        // Update budget calculations
        updateComparisonScenarioBudget(scenarioId);
        
        // Show import success indication
        setTimeout(() => {
            const monthlySavingsElement = document.querySelector(`[data-param="accumulation.monthlySavings"][data-scenario="${scenarioId}"]`);
            if (monthlySavingsElement) {
                // Flash green to indicate successful import
                monthlySavingsElement.style.borderColor = '#27ae60';
                monthlySavingsElement.style.borderWidth = '2px';
                setTimeout(() => {
                    monthlySavingsElement.style.borderColor = '';
                    monthlySavingsElement.style.borderWidth = '';
                }, 2000);
            }
            
            // Update budget calculation for the scenario
            updateComparisonScenarioBudget(scenarioId);
            
            console.log(`Successfully imported parameters to scenario ${scenarioId}`);
        }, 200);
        
    } catch (error) {
        console.error('Error applying imported parameters:', error);
    }
}

/**
 * Helper functions to set values in comparison scenarios
 */
function setComparisonScenarioValue(scenarioId, param, value) {
    const element = document.querySelector(`[data-param="${param}"][data-scenario="${scenarioId}"]`);
    if (element) {
        // Temporarily disable event listeners to prevent interference
        const originalOnInput = element.oninput;
        const originalOnChange = element.onchange;
        const originalOnBlur = element.onblur;
        
        element.oninput = null;
        element.onchange = null;
        element.onblur = null;
        
        // Special handling for monthly savings - enable manual editing
        if (param === 'accumulation.monthlySavings') {
            const manualSavingsCheckbox = document.querySelector(`[data-scenario="${scenarioId}"] .manual-savings-checkbox`);
            if (manualSavingsCheckbox) {
                // Check the checkbox to enable manual editing
                manualSavingsCheckbox.checked = true;
                
                // Remove readonly attribute and update styling
                element.removeAttribute('readonly');
                element.style.backgroundColor = '#fff';
                element.style.cursor = 'text';
                
                console.log(`Enabled manual editing for monthly savings in scenario ${scenarioId}`);
            }
        }
        
        // Special handling for retirement capital - enable manual editing
        if (param === 'withdrawal.retirementCapital') {
            const manualCapitalCheckbox = document.querySelector(`[data-scenario="${scenarioId}"] .manual-capital-checkbox`);
            if (manualCapitalCheckbox) {
                // Check the checkbox to enable manual editing
                manualCapitalCheckbox.checked = true;
                
                // Remove readonly attribute and update styling
                element.removeAttribute('readonly');
                element.style.backgroundColor = '#fff';
                element.style.cursor = 'text';
                
                console.log(`Enabled manual editing for retirement capital in scenario ${scenarioId}`);
            }
        }
        
        // For numeric inputs, format appropriately
        if (param.includes('monthlySavings') || param.includes('initialCapital') || param.includes('baseSalary') || param.includes('retirementCapital')) {
            element.value = formatGermanNumber(value, 0).replace(',00', '');
        } else {
            element.value = formatGermanNumber(value);
        }
        
        // Add a specific class to mark this as an imported value
        element.classList.add('imported-value');
        
        // Remove green animation - no visual highlighting needed for imported values
        // element.style.background = '#e8f5e8';
        // setTimeout(() => {
        //     element.style.background = '';
        //     element.classList.remove('imported-value');
        // }, 1000);
        
        // Restore event listeners after a short delay
        setTimeout(() => {
            element.oninput = originalOnInput;
            element.onchange = originalOnChange;
            element.onblur = originalOnBlur;
            
            // Remove the imported-value class and trigger a single change event to update calculations
            element.classList.remove('imported-value');
            element.dispatchEvent(new Event('input', { bubbles: true }));
        }, 100);
        
        console.log(`Set ${param} for scenario ${scenarioId} to ${element.value} (formatted value: ${value})`);
    } else {
        console.warn(`Element not found for ${param} in scenario ${scenarioId}`);
    }
}

function setComparisonScenarioSlider(scenarioId, param, value) {
    const slider = document.querySelector(`[data-param="${param}"][data-scenario="${scenarioId}"]`);
    if (slider) {
        slider.value = value;
        
        // Update the display value
        const valueSpan = slider.parentNode.querySelector('.slider-value');
        if (valueSpan) {
            if (param.includes('duration')) {
                valueSpan.textContent = `${value} Jahre`;
            } else {
                valueSpan.textContent = `${parseFloat(value).toFixed(1)}%`;
            }
        }
        
        // Force visual update by triggering multiple events
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        slider.dispatchEvent(new Event('change', { bubbles: true }));
        slider.dispatchEvent(new Event('mousemove', { bubbles: true }));
        
        // Remove focus/blur to prevent unwanted scrolling
        // setTimeout(() => {
        //     slider.focus();
        //     setTimeout(() => slider.blur(), 50);
        // }, 10);
        
        console.log(`Set slider ${param} for scenario ${scenarioId} to ${value} (display: ${valueSpan ? valueSpan.textContent : 'no display'})`);
    } else {
        console.warn(`Slider not found for ${param} in scenario ${scenarioId}`);
    }
}

function setComparisonScenarioToggle(scenarioId, param, value) {
    const toggle = document.querySelector(`[data-param="${param}"][data-scenario="${scenarioId}"]`);
    if (toggle) {
        // Set the visual state
        toggle.classList.remove('active');
        if (value === true || value === 'true' || value === 1 || value === '1') {
            toggle.classList.add('active');
        }
        
        // Force visual update by triggering custom event
        const customEvent = new CustomEvent('toggleStateChanged', { 
            bubbles: true, 
            detail: { active: toggle.classList.contains('active'), param: param, scenario: scenarioId }
        });
        toggle.dispatchEvent(customEvent);
        
        // Also trigger standard events
        toggle.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Force re-render by briefly adding/removing a class
        toggle.classList.add('updating');
        setTimeout(() => toggle.classList.remove('updating'), 100);
        
        console.log(`Set toggle ${param} for scenario ${scenarioId} to ${value} (active: ${toggle.classList.contains('active')})`);
    } else {
        console.warn(`Toggle not found for ${param} in scenario ${scenarioId}`);
    }
}

function setComparisonScenarioETFType(scenarioId, etfType) {
    const radioName = `etfType-${scenarioId}`;
    const radioValue = etfType || 'thesaurierend';
    
    // First, uncheck all radio buttons in this group
    const allRadios = document.querySelectorAll(`input[name="${radioName}"]`);
    allRadios.forEach(r => r.checked = false);
    
    // Then check the correct one
    const radio = document.querySelector(`input[name="${radioName}"][value="${radioValue}"]`);
    if (radio) {
        radio.checked = true;
        
        // Remove focus/blur to prevent unwanted scrolling
        // radio.focus();
        
        // Trigger multiple events to ensure listeners respond
        radio.dispatchEvent(new Event('change', { bubbles: true }));
        radio.dispatchEvent(new Event('click', { bubbles: true }));
        radio.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Remove focus/blur to prevent unwanted scrolling
        // setTimeout(() => radio.blur(), 100);
        
        console.log(`Set ETF type for scenario ${scenarioId} to ${radioValue} (checked: ${radio.checked})`);
    } else {
        console.warn(`ETF type radio not found for scenario ${scenarioId}, name: ${radioName}, value: ${radioValue}`);
        console.log('Available radios:', Array.from(allRadios).map(r => ({value: r.value, checked: r.checked})));
        
        // Try alternative values
        const alternativeValues = ['accumulating', 'thesaurierend', 'distributing', 'ausschuettend'];
        for (const altValue of alternativeValues) {
            const altRadio = document.querySelector(`input[name="${radioName}"][value="${altValue}"]`);
            if (altRadio) {
                console.log(`Found alternative radio with value: ${altValue}`);
                altRadio.checked = true;
                altRadio.dispatchEvent(new Event('change', { bubbles: true }));
                break;
            }
        }
    }
}

/**
 * Setup scenario import functionality
 */
function setupScenarioImport() {
    // Setup event listeners for import functionality
    document.addEventListener('click', function(e) {
        // Handle scenario-specific import buttons
        if (e.target.classList.contains('scenario-import-btn')) {
            const scenarioId = e.target.getAttribute('data-scenario');
            if (scenarioId) {
                handleScenarioImport(scenarioId);
            }
        }
        
        // Handle scenario-specific refresh buttons
        if (e.target.classList.contains('scenario-refresh-btn')) {
            loadScenarioImports();
            const scenarioId = e.target.getAttribute('data-scenario');
            if (scenarioId) {
                showScenarioImportStatusForScenario(scenarioId, 'info', 'Verfügbare Szenarien wurden neu geladen.');
            }
        }
        
        if (e.target.classList.contains('delete-scenario-import-btn')) {
            const storageKey = e.target.dataset.storageKey;
            deleteAnsparphaseScenarioSet(storageKey);
        }
    });
    
    // Setup dropdown change listener for scenario-specific dropdowns
    document.addEventListener('change', function(e) {
        if (e.target.classList.contains('scenario-import-dropdown')) {
            const scenarioId = e.target.getAttribute('data-scenario');
            if (scenarioId) {
                const importBtn = document.querySelector(`.scenario-import-btn[data-scenario="${scenarioId}"]`);
                if (importBtn) {
                    importBtn.disabled = !e.target.value;
                }
            }
        }
    });
    
    // Add listener for force refresh events - remove animation
    document.addEventListener('forceRefresh', function(e) {
        if (e.target.tagName === 'INPUT' && e.target.type === 'text') {
            // Force visual update of text input without animation
            const originalValue = e.target.value;
            // e.target.style.background = '#ffffcc';
            // setTimeout(() => {
            //     e.target.style.background = '';
                e.target.value = originalValue;
                e.target.dispatchEvent(new Event('input', { bubbles: true }));
            // }, 100);
        }
    });
    
    // Load scenarios when comparison section is shown - remove delay for immediate loading
    loadScenarioImports();
}

/**
 * Import Ansparphase scenario data to a comparison scenario
 */
function importAnsparphaseScenario(storageKey, scenarioId) {
    try {
        const storedData = localStorage.getItem(storageKey);
        if (!storedData) {
            console.error(`No data found for storage key: ${storageKey}`);
            showScenarioImportStatusForScenario(scenarioId, 'error', 'Szenario-Daten nicht gefunden.');
            return false;
        }
        
        const data = JSON.parse(storedData);
        if (!data || !data.parameters) {
            console.error('Invalid scenario data format');
            showScenarioImportStatusForScenario(scenarioId, 'error', 'Ungültiges Szenario-Datenformat.');
            return false;
        }
        
        // Convert the old data format to the new comparison scenario format
        const parameters = {
            accumulation: {
                monthlySavings: data.parameters.monthlySavings || 500,
                initialCapital: data.parameters.initialCapital || 3000,
                annualReturn: data.parameters.annualReturn || 7,
                inflationRate: data.parameters.inflationRate || 2,
                duration: data.parameters.duration || 25,
                salaryGrowth: data.parameters.salaryGrowth || 3,
                salaryToSavings: data.parameters.salaryToSavings || 50,
                includeTax: data.parameters.includeTax !== false, // Default to true
                teilfreistellung: data.parameters.teilfreistellung !== false, // Default to true
                etfType: data.parameters.etfType || 'thesaurierend'
            }
        };
        
        // Add withdrawal parameters if available
        if (data.parameters.retirementCapital !== undefined) {
            parameters.withdrawal = {
                retirementCapital: data.parameters.retirementCapital,
                duration: data.parameters.withdrawalDuration || 25,
                postRetirementReturn: data.parameters.postRetirementReturn || 6,
                inflationRate: data.parameters.withdrawalInflationRate || data.parameters.inflationRate || 2,
                includeTax: data.parameters.withdrawalIncludeTax !== false
            };
        }
        
        // Apply the parameters to the scenario
        applyImportedParametersToScenario(scenarioId, parameters);
        
        console.log(`Successfully imported scenario data from ${storageKey} to scenario ${scenarioId}`);
        return true;
        
    } catch (error) {
        console.error('Error importing scenario:', error);
        showScenarioImportStatusForScenario(scenarioId, 'error', 'Fehler beim Importieren des Szenarios.');
        return false;
    }
}

/**
 * Handle scenario import from dropdown selection
 */
function handleScenarioImport(scenarioId) {
    const dropdown = document.querySelector(`.scenario-import-dropdown[data-scenario="${scenarioId}"]`);
    if (!dropdown || !dropdown.value) {
        showScenarioImportStatusForScenario(scenarioId, 'error', 'Bitte wählen Sie ein Szenario aus.');
        return;
    }
    
    const storageKey = dropdown.value;
    const success = importAnsparphaseScenario(storageKey, scenarioId);
    if (success) {
        // Reset dropdown
        dropdown.value = '';
        const importBtn = document.querySelector(`.scenario-import-btn[data-scenario="${scenarioId}"]`);
        if (importBtn) {
            importBtn.disabled = true;
        }
        showScenarioImportStatusForScenario(scenarioId, 'success', 'Szenario wurde erfolgreich importiert.');
    }
}

/**
 * Show status message for scenario import
 */
function showScenarioImportStatus(type, message) {
    const statusDiv = document.getElementById('scenarioImportStatus');
    if (!statusDiv) return;
    
    const statusIcon = statusDiv.querySelector('.status-icon');
    const statusMessage = statusDiv.querySelector('.status-message');
    
    if (statusIcon && statusMessage) {
        // Set icon and colors based on type
        let icon, bgColor, textColor;
        switch (type) {
            case 'success':
                icon = '✅';
                bgColor = '#d4edda';
                textColor = '#155724';
                break;
            case 'error':
                icon = '❌';
                bgColor = '#f8d7da';
                textColor = '#721c24';
                break;
            case 'warning':
                icon = '⚠️';
                bgColor = '#fff3cd';
                textColor = '#856404';
                break;
            default: // info
                icon = 'ℹ️';
                bgColor = '#d1ecf1';
                textColor = '#0c5460';
        }
        
        statusIcon.textContent = icon;
        statusMessage.textContent = message;
        
        statusDiv.style.backgroundColor = bgColor;
        statusDiv.style.color = textColor;
        statusDiv.style.border = `1px solid ${textColor}40`;
        statusDiv.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }
}

/**
 * Show status message for scenario import for a specific scenario
 */
function showScenarioImportStatusForScenario(scenarioId, type, message) {
    const statusDiv = document.querySelector(`.scenario-import-status[data-scenario="${scenarioId}"]`);
    if (!statusDiv) return;
    
    const statusIcon = statusDiv.querySelector('.status-icon');
    const statusMessage = statusDiv.querySelector('.status-message');
    
    if (statusIcon && statusMessage) {
        // Set icon and colors based on type
        let icon, bgColor, textColor;
        switch (type) {
            case 'success':
                icon = '✅';
                bgColor = '#d4edda';
                textColor = '#155724';
                break;
            case 'error':
                icon = '❌';
                bgColor = '#f8d7da';
                textColor = '#721c24';
                break;
            case 'warning':
                icon = '⚠️';
                bgColor = '#fff3cd';
                textColor = '#856404';
                break;
            default: // info
                icon = 'ℹ️';
                bgColor = '#d1ecf1';
                textColor = '#0c5460';
        }
        
        statusIcon.textContent = icon;
        statusMessage.textContent = message;
        
        statusDiv.style.backgroundColor = bgColor;
        statusDiv.style.color = textColor;
        statusDiv.style.border = `1px solid ${textColor}40`;
        statusDiv.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }
}

/**
 * Load scenario imports into dropdown
 */
function loadScenarioImports() {
    const scenarios = loadAvailableAnsparphaseScenarios();
    const dropdowns = document.querySelectorAll('.scenario-import-dropdown');
    
    dropdowns.forEach(dropdown => {
        // Clear existing options
        dropdown.innerHTML = '<option value="">-- Szenario auswählen --</option>';
        
        if (scenarios.length === 0) {
            dropdown.innerHTML += '<option value="" disabled>Keine Szenarien verfügbar</option>';
        return;
    }
    
        // Add individual scenarios to dropdown
        scenarios.forEach(scenario => {
            const option = document.createElement('option');
            option.value = scenario.storageKey;
            option.textContent = scenario.displayName;
            dropdown.appendChild(option);
        });
    });
}

/**
 * Delete a set of Ansparphase scenarios from localStorage
 */
function deleteAnsparphaseScenarioSet(storageKey) {
    try {
        localStorage.removeItem(storageKey);
        loadScenarioImports(); // Refresh the dropdown
        showNotification('Szenarien gelöscht', 'Die Ansparphase-Szenarien wurden erfolgreich gelöscht.', 'success');
    } catch (error) {
        console.error('Error deleting scenario set:', error);
        showNotification('Lösch-Fehler', 'Die Szenarien konnten nicht gelöscht werden.', 'error');
    }
}

/**
 * Auto-save scenarios when leaving Ansparphase
 */
function autoSaveAnsparphaseScenarios() {
    if (scenarios.length > 0) {
        const saved = saveAnsparphaseScenarios();
        if (saved) {
            console.log('Ansparphase scenarios auto-saved:', saved);
        }
    }
}

/**
 * Setup auto-save functionality
 */
function setupAutoSaveScenarios() {
    // Auto-save when switching away from accumulation phase
    const phaseButtons = document.querySelectorAll('.phase-button');
    phaseButtons.forEach(button => {
        if (button.id !== 'accumulationPhase') {
            button.addEventListener('click', () => {
                setTimeout(autoSaveAnsparphaseScenarios, 100);
            });
        }
    });
    
    // Also save when page unloads
    window.addEventListener('beforeunload', autoSaveAnsparphaseScenarios);
}

// ===========================================
// ANSPARPHASE SCENARIO SAVING FUNCTIONALITY
// ===========================================

/**
 * Setup event listeners for Ansparphase scenario saving functionality
 */
function setupAnsparphaseScenarioListeners() {
    // Save scenario modal
    document.getElementById('saveAnsparphaseScenario').addEventListener('click', openSaveAnsparphaseScenarioModal);
    document.getElementById('closeSaveAnsparphaseScenarioModal').addEventListener('click', closeSaveAnsparphaseScenarioModal);
    document.getElementById('cancelSaveAnsparphaseScenario').addEventListener('click', closeSaveAnsparphaseScenarioModal);
    document.getElementById('confirmSaveAnsparphaseScenario').addEventListener('click', confirmSaveAnsparphaseScenario);
    document.getElementById('ansparphaseScenarioName').addEventListener('input', updateAnsparphaseScenarioPreview);
    document.getElementById('ansparphaseScenarioDescription').addEventListener('input', updateAnsparphaseScenarioPreview);

    // Load scenario modal
    document.getElementById('loadAnsparphaseScenario').addEventListener('click', openLoadAnsparphaseScenarioModal);
    document.getElementById('closeLoadAnsparphaseScenarioModal').addEventListener('click', closeLoadAnsparphaseScenarioModal);
    document.getElementById('cancelLoadAnsparphaseScenario').addEventListener('click', closeLoadAnsparphaseScenarioModal);
    document.getElementById('confirmLoadAnsparphaseScenario').addEventListener('click', confirmLoadAnsparphaseScenario);

    // Manage scenarios modal
    document.getElementById('manageAnsparphaseScenarios').addEventListener('click', openManageAnsparphaseScenarioModal);
    document.getElementById('closeManageAnsparphaseScenarioModal').addEventListener('click', closeManageAnsparphaseScenarioModal);

    // Reset scenarios
    document.getElementById('resetAnsparphaseScenario').addEventListener('click', resetAnsparphaseScenarios);

    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        const saveModal = document.getElementById('saveAnsparphaseScenarioModal');
        const loadModal = document.getElementById('loadAnsparphaseScenarioModal');
        const manageModal = document.getElementById('manageAnsparphaseScenarioModal');
        
        if (event.target === saveModal) {
            closeSaveAnsparphaseScenarioModal();
        }
        if (event.target === loadModal) {
            closeLoadAnsparphaseScenarioModal();
        }
        if (event.target === manageModal) {
            closeManageAnsparphaseScenarioModal();
        }
    });
}

/**
 * Open save Ansparphase scenario modal
 */
function openSaveAnsparphaseScenarioModal() {
    document.getElementById('saveAnsparphaseScenarioModal').style.display = 'block';
    
    const nameInput = document.getElementById('ansparphaseScenarioName');
    const descInput = document.getElementById('ansparphaseScenarioDescription');
    
    // Immediately clear fields
    nameInput.value = '';
    descInput.value = '';
    
    // Clear again after a short delay to override any browser auto-fill
    setTimeout(() => {
        nameInput.value = '';
        descInput.value = '';
        nameInput.focus();
        updateAnsparphaseScenarioPreview();
    }, 50);
    
    // Clear one more time after a longer delay for persistent auto-fill
    setTimeout(() => {
        if (nameInput.value === '0' || nameInput.value.trim() === '0') {
            nameInput.value = '';
            updateAnsparphaseScenarioPreview();
        }
    }, 200);
}

/**
 * Close save Ansparphase scenario modal
 */
function closeSaveAnsparphaseScenarioModal() {
    document.getElementById('saveAnsparphaseScenarioModal').style.display = 'none';
    document.getElementById('ansparphaseScenarioName').value = '';
    document.getElementById('ansparphaseScenarioDescription').value = '';
}

/**
 * Update Ansparphase scenario preview
 */
function updateAnsparphaseScenarioPreview() {
    const previewContainer = document.getElementById('ansparphaseScenarioPreview');
    
    // Get current scenario data
    const currentScenario = getActiveScenario();
    if (!currentScenario) return;
    
    const monthlySavings = parseGermanNumber(document.getElementById(`monthlySavings_${currentScenario.id}`).value) || 0;
    const initialCapital = parseGermanNumber(document.getElementById(`initialCapital_${currentScenario.id}`).value) || 0;
    const annualReturn = parseFloat(document.getElementById(`annualReturn_${currentScenario.id}`).value) || 0;
    const duration = parseInt(document.getElementById(`duration_${currentScenario.id}`).value) || 0;
    const savingsMode = getSavingsMode(currentScenario.id);
    
    previewContainer.innerHTML = `
        <div class="preview-item">
            <span class="preview-label">📊 Aktives Szenario</span>
            <span class="preview-value">${currentScenario.name}</span>
        </div>
        <div class="preview-item">
            <span class="preview-label">💰 Monatliche Sparrate</span>
            <span class="preview-value">€${formatGermanNumber(monthlySavings, 0)}</span>
        </div>
        <div class="preview-item">
            <span class="preview-label">🏦 Startkapital</span>
            <span class="preview-value">€${formatGermanNumber(initialCapital, 0)}</span>
        </div>
        <div class="preview-item">
            <span class="preview-label">📈 Jährliche Rendite</span>
            <span class="preview-value">${annualReturn}%</span>
        </div>
        <div class="preview-item">
            <span class="preview-label">⏱️ Anlagedauer</span>
            <span class="preview-value">${duration} Jahre</span>
        </div>
        <div class="preview-item">
            <span class="preview-label">🎯 Sparmodus</span>
            <span class="preview-value">${savingsMode === 'multi-phase' ? 'Mehrphasig' : 'Einfach'}</span>
        </div>
        <div class="preview-item">
            <span class="preview-label">📅 Erstellt</span>
            <span class="preview-value">${new Date().toLocaleDateString('de-DE')}</span>
        </div>
    `;
    
    // Enable/disable save button based on scenario name
    const saveBtn = document.getElementById('confirmSaveAnsparphaseScenario');
    const scenarioName = document.getElementById('ansparphaseScenarioName').value.trim();
    saveBtn.disabled = scenarioName.length === 0;
}

/**
 * Confirm save Ansparphase scenario
 */
function confirmSaveAnsparphaseScenario() {
    const scenarioName = document.getElementById('ansparphaseScenarioName').value.trim();
    const scenarioDescription = document.getElementById('ansparphaseScenarioDescription').value.trim();
    
    if (!scenarioName) {
        showNotification('❌ Fehler', 'Bitte geben Sie einen Szenario-Namen ein.', 'error');
        return;
    }
    
    // Check if scenario already exists - for now, just overwrite silently
    // (User can implement custom confirmation dialog later if needed)
    const existingScenario = localStorage.getItem('ansparphaseScenario_' + scenarioName);
    if (existingScenario) {
        showNotification('⚠️ Szenario überschrieben', `Ein Szenario mit dem Namen "${scenarioName}" wurde überschrieben.`, 'warning');
    }
    
    // Get current scenario data
    const currentScenario = getActiveScenario();
    if (!currentScenario) {
        showNotification('❌ Fehler', 'Kein aktives Szenario gefunden.', 'error');
        return;
    }
    
    // Get the currently active scenario to save
    const activeScenarioToSave = getActiveScenario();
    if (!activeScenarioToSave) {
        showNotification('❌ Fehler', 'Kein aktives Szenario gefunden.', 'error');
        return;
    }
    
    // Save only the active scenario as a single scenario (not a scenario set)
    const scenarioData = {
        name: scenarioName,
        description: scenarioDescription,
        createdAt: new Date().toISOString(),
        type: 'single', // Mark this as a single scenario
        scenario: {
            id: activeScenarioToSave.id,
            name: scenarioName, // Use the provided name instead of the scenario's internal name
            color: activeScenarioToSave.color,
            parameters: {
                monthlySavings: parseGermanNumber(document.getElementById(`monthlySavings_${activeScenarioToSave.id}`).value) || 0,
                initialCapital: parseGermanNumber(document.getElementById(`initialCapital_${activeScenarioToSave.id}`).value) || 0,
                annualReturn: parseFloat(document.getElementById(`annualReturn_${activeScenarioToSave.id}`).value) || 0,
                inflationRate: parseFloat(document.getElementById(`inflationRate_${activeScenarioToSave.id}`).value) || 0,
                salaryGrowth: parseFloat(document.getElementById(`salaryGrowth_${activeScenarioToSave.id}`).value) || 0,
                duration: parseInt(document.getElementById(`duration_${activeScenarioToSave.id}`).value) || 0,
                baseSalary: parseGermanNumber(document.getElementById(`baseSalary_${activeScenarioToSave.id}`).value) || 0,
                salaryToSavings: parseFloat(document.getElementById(`salaryToSavings_${activeScenarioToSave.id}`).value) || 0,
                includeTax: getScenarioToggleValue('taxToggle', activeScenarioToSave.id),
                teilfreistellung: getScenarioToggleValue('teilfreistellungToggle', activeScenarioToSave.id),
                etfType: getScenarioETFType(activeScenarioToSave.id),
                savingsMode: getSavingsMode(activeScenarioToSave.id),
                multiPhaseData: getMultiPhaseData(activeScenarioToSave.id)
            },
            results: activeScenarioToSave.results || {}
        }
    };

    localStorage.setItem('ansparphaseScenario_' + scenarioName, JSON.stringify(scenarioData));
    closeSaveAnsparphaseScenarioModal();
    
    showNotification('✅ Szenario erfolgreich gespeichert!', `Das Ansparphase-Szenario "${scenarioName}" wurde erfolgreich gespeichert.`, 'success');
}

/**
 * Open load Ansparphase scenario modal
 */
function openLoadAnsparphaseScenarioModal() {
    document.getElementById('loadAnsparphaseScenarioModal').style.display = 'block';
    loadAnsparphaseScenarioList();
}

/**
 * Close load Ansparphase scenario modal
 */
function closeLoadAnsparphaseScenarioModal() {
    document.getElementById('loadAnsparphaseScenarioModal').style.display = 'none';
    // Reset selection
    selectedScenariosForLoading = [];
    const confirmBtn = document.getElementById('confirmLoadAnsparphaseScenario');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Szenarien laden';
    document.querySelectorAll('#loadAnsparphaseScenarioList .load-profile-item').forEach(item => {
        item.classList.remove('selected');
    });
    // Hide preview
    const previewContainer = document.getElementById('loadScenarioPreviewContainer');
    if (previewContainer) {
        previewContainer.style.display = 'none';
    }
}

/**
 * Load Ansparphase scenario list
 */
function loadAnsparphaseScenarioList() {
    const scenarioList = document.getElementById('loadAnsparphaseScenarioList');
    const scenarios = [];
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('ansparphaseScenario_')) {
            const scenarioData = JSON.parse(localStorage.getItem(key));
            scenarios.push({
                key: key,
                name: key.replace('ansparphaseScenario_', ''),
                data: scenarioData
            });
        }
    }

    if (scenarios.length === 0) {
        scenarioList.innerHTML = `
            <div class="no-profiles">
                <div class="no-profiles-icon">📂</div>
                <h4>Keine Szenarien gefunden</h4>
                <p>Erstellen Sie Ihr erstes Szenario mit "Szenario speichern".</p>
            </div>
        `;
        return;
    }

    // Sort scenarios by creation date (newest first)
    scenarios.sort((a, b) => {
        const dateA = new Date(a.data.createdAt || 0);
        const dateB = new Date(b.data.createdAt || 0);
        return dateB - dateA;
    });

    scenarioList.innerHTML = scenarios.map(scenario => {
        const createdDate = scenario.data.createdAt ? 
            new Date(scenario.data.createdAt).toLocaleDateString('de-DE') : 
            'Unbekannt';
        
        // Handle both old format (scenario sets) and new format (single scenarios)
        let monthlySavings = 0;
        let duration = 0;
        let annualReturn = 0;
        let scenarioCount = 0;
        
        if (scenario.data.type === 'single' && scenario.data.scenario) {
            // New format: single scenario
            const singleScenario = scenario.data.scenario;
            monthlySavings = singleScenario.parameters?.monthlySavings || 0;
            duration = singleScenario.parameters?.duration || 0;
            annualReturn = singleScenario.parameters?.annualReturn || 0;
            scenarioCount = 1;
        } else if (scenario.data.scenarios) {
            // Old format: scenario set
            const firstScenario = scenario.data.scenarios[0];
            monthlySavings = firstScenario?.parameters?.monthlySavings || 0;
            duration = firstScenario?.parameters?.duration || 0;
            annualReturn = firstScenario?.parameters?.annualReturn || 0;
            scenarioCount = scenario.data.scenarios.length;
        }
        
        return `
            <div class="load-profile-item" onclick="selectAnsparphaseScenarioForLoad('${escapeHtml(scenario.data.name || scenario.name)}')">
                <div class="profile-info">
                    <div class="profile-name">${escapeHtml(scenario.data.name || scenario.name)}</div>
                    <div class="profile-details">
                        ${scenario.data.description ? `<div style="margin-bottom: 5px; color: #34495e;">${escapeHtml(scenario.data.description)}</div>` : ''}
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.8rem;">
                            <span>💰 Sparrate: €${formatGermanNumber(monthlySavings, 0)}</span>
                            <span>⏱️ Dauer: ${duration} Jahre</span>
                            <span>📈 Rendite: ${annualReturn}%</span>
                            <span>📅 Erstellt: ${createdDate}</span>
                            <span style="grid-column: 1 / -1; color: #7f8c8d; font-size: 0.75rem;">
                                ${scenario.data.type === 'single' ? '📄 Einzelszenario' : `📊 Szenario-Set (${scenarioCount} Szenarien)`}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Global variable to store selected scenarios for loading
let selectedScenariosForLoading = [];

/**
 * Select Ansparphase scenario for loading
 */
function selectAnsparphaseScenarioForLoad(scenarioName) {
    // Toggle selection on clicked item
    const clickedItem = event.target.closest('.load-profile-item');
    
    if (clickedItem.classList.contains('selected')) {
        // Deselect if already selected
        clickedItem.classList.remove('selected');
        
        // Remove from selected scenarios
        const index = selectedScenariosForLoading.indexOf(scenarioName);
        if (index > -1) {
            selectedScenariosForLoading.splice(index, 1);
        }
    } else {
        // Select if not selected
        clickedItem.classList.add('selected');
        
        // Add to selected scenarios
        if (!selectedScenariosForLoading.includes(scenarioName)) {
            selectedScenariosForLoading.push(scenarioName);
        }
    }
    
    // Update the confirmation button state
    const confirmBtn = document.getElementById('confirmLoadAnsparphaseScenario');
    confirmBtn.disabled = selectedScenariosForLoading.length === 0;
    
    // Update button text to show count
    if (selectedScenariosForLoading.length === 0) {
        confirmBtn.textContent = 'Szenarien laden';
    } else if (selectedScenariosForLoading.length === 1) {
        confirmBtn.textContent = '1 Szenario laden';
    } else {
        confirmBtn.textContent = `${selectedScenariosForLoading.length} Szenarien laden`;
    }
    
    // Hide preview container since we don't want to show it
    const previewContainer = document.getElementById('loadScenarioPreviewContainer');
    if (previewContainer) {
        previewContainer.style.display = 'none';
    }
}

/**
 * Confirm loading of selected scenarios
 */
function confirmLoadAnsparphaseScenario() {
    if (selectedScenariosForLoading.length > 0) {
        selectedScenariosForLoading.forEach(scenarioName => {
            loadSelectedAnsparphaseScenario(scenarioName);
        });
        selectedScenariosForLoading = [];
        const confirmBtn = document.getElementById('confirmLoadAnsparphaseScenario');
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Szenarien laden';
    }
}

/**
 * Show preview of scenario to be loaded
 */
function showLoadScenarioPreview(scenarioName) {
    // Find the scenario data
    let scenarioData = null;
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('ansparphaseScenario_')) {
            const data = JSON.parse(localStorage.getItem(key));
            if (data && data.name === scenarioName) {
                scenarioData = data;
                break;
            }
        }
    }
    
    if (!scenarioData) return;
    
    // Create detailed preview content
    const scenarios = scenarioData.scenarios;
    const createdDate = scenarioData.createdAt ? 
        new Date(scenarioData.createdAt).toLocaleDateString('de-DE') : 
        'Unbekannt';
    
    let previewHtml = `
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h5 style="margin: 0 0 10px 0; color: #2c3e50;">📊 ${escapeHtml(scenarioData.name)}</h5>
            <p style="margin: 0 0 10px 0; color: #7f8c8d; font-size: 0.9rem;">
                ${scenarioData.description ? escapeHtml(scenarioData.description) : 'Keine Beschreibung'}
            </p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.8rem; color: #34495e;">
                <span>📅 Erstellt: ${createdDate}</span>
                <span>🎯 Szenarien: ${scenarios.length}</span>
            </div>
        </div>
        <div style="margin-bottom: 10px; padding: 10px; background: #e8f4f8; border-radius: 6px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 600; color: #2c3e50;">Szenarien zum Laden auswählen:</span>
                <div>
                    <button onclick="selectAllScenarios()" style="background: #3498db; color: white; border: none; padding: 4px 8px; border-radius: 4px; margin-right: 5px; cursor: pointer; font-size: 0.8rem;">Alle</button>
                    <button onclick="selectNoScenarios()" style="background: #95a5a6; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">Keine</button>
                </div>
            </div>
        </div>
        <div style="max-height: 200px; overflow-y: auto;">
    `;
    
    scenarios.forEach((scenario, index) => {
        const params = scenario.parameters;
        previewHtml += `
            <div style="background: white; border: 1px solid #e0e0e0; border-radius: 6px; padding: 12px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <h6 style="margin: 0; color: #2c3e50;">📈 ${escapeHtml(scenario.name)}</h6>
                    <div>
                        <input type="checkbox" id="loadScenario_${index}" style="margin-right: 5px;" checked>
                        <label for="loadScenario_${index}" style="font-size: 0.8rem; color: #7f8c8d;">Laden</label>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.8rem;">
                    <span>💰 Sparrate: €${formatGermanNumber(params.monthlySavings || 0, 0)}</span>
                    <span>🏦 Startkapital: €${formatGermanNumber(params.initialCapital || 0, 0)}</span>
                    <span>📈 Rendite: ${params.annualReturn || 0}%</span>
                    <span>⏱️ Dauer: ${params.duration || 0} Jahre</span>
                    <span>💼 Grundgehalt: €${formatGermanNumber(params.baseSalary || 0, 0)}</span>
                    <span>🎯 Sparquote: ${params.salaryToSavings || 0}%</span>
                </div>
                <div style="margin-top: 8px; font-size: 0.75rem; color: #7f8c8d;">
                    ${params.includeTax ? '✅ Steuern berücksichtigt' : '❌ Ohne Steuern'} • 
                    ${params.teilfreistellung ? '✅ Teilfreistellung' : '❌ Keine Teilfreistellung'} • 
                    ${params.etfType === 'thesaurierend' ? '📊 Thesaurierend' : '💰 Ausschüttend'}
                </div>
            </div>
        `;
    });
    
    previewHtml += '</div>';
    
    // Add preview to modal (if there's a preview container)
    const previewContainer = document.getElementById('loadScenarioPreview');
    const previewContainerWrapper = document.getElementById('loadScenarioPreviewContainer');
    
    if (previewContainer && previewContainerWrapper) {
        previewContainer.innerHTML = previewHtml;
        previewContainerWrapper.style.display = 'block';
    } else {
        // Log for debugging
        console.log('Preview - Detailed scenario data:', {
            name: scenarioData.name,
            scenarios: scenarios.length,
            firstScenario: scenarios[0]?.parameters
        });
    }
}

/**
 * Load selected Ansparphase scenario
 */
function loadSelectedAnsparphaseScenario(scenarioName) {
    // Find the correct localStorage key for this scenario name
    let scenarioData = null;
    let foundKey = null;
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('ansparphaseScenario_')) {
            const data = JSON.parse(localStorage.getItem(key));
            if (data && data.name === scenarioName) {
                scenarioData = data;
                foundKey = key;
                break;
            }
        }
    }
    
    if (!scenarioData) {
        showNotification('❌ Fehler beim Laden', 'Szenario konnte nicht geladen werden.', 'error');
        return;
    }
    

    
    // Store the current active scenario to restore it after loading
    const currentActiveScenario = activeScenario;
    
    // Handle both old format (scenario sets) and new format (single scenarios)
    let selectedScenarios = [];
    
    if (scenarioData.type === 'single' && scenarioData.scenario) {
        // New format: single scenario
        selectedScenarios = [scenarioData.scenario];
    } else if (scenarioData.scenarios) {
        // Old format: scenario set - load all scenarios
        selectedScenarios = scenarioData.scenarios;
    } else {
        showNotification('❌ Fehler', 'Ungültiges Szenario-Format.', 'error');
        return;
    }
    
    // Check if we have enough space for selected scenarios to be loaded
    const selectedScenariosCount = selectedScenarios.length;
    const currentScenariosCount = scenarios.length;
    const maxScenariosLimit = 4;
    
    if (currentScenariosCount + selectedScenariosCount > maxScenariosLimit) {
        showNotification('⚠️ Zu viele Szenarien', `Das Laden würde ${currentScenariosCount + selectedScenariosCount} Szenarien ergeben, aber maximal ${maxScenariosLimit} sind erlaubt. Bitte löschen Sie zuerst einige Szenarien oder wählen Sie weniger Szenarien zum Laden aus.`, 'warning');
        return;
    }
    
    // Load selected scenarios from saved data - create new scenarios for each
    const loadedScenarios = [];
    
    selectedScenarios.forEach((savedScenario, index) => {
        // Always create new scenarios - but don't switch to them
        let targetScenario = createNewScenarioWithoutSwitching();
        if (!targetScenario) {
            // If createNewScenarioWithoutSwitching returns null/undefined, we've hit the limit
            showNotification('⚠️ Maximale Anzahl erreicht', 'Maximale Anzahl von Szenarien erreicht.', 'warning');
            return;
        }
        
        targetScenario.name = savedScenario.name;
        targetScenario.color = savedScenario.color;
        loadedScenarios.push(targetScenario);
        
        // Update scenario tab name immediately
        const scenarioTab = document.querySelector(`.scenario-tab[data-scenario="${targetScenario.id}"]`);
        if (scenarioTab) {
            scenarioTab.innerHTML = `📈 ${targetScenario.name}`;
        }
        
        // Update scenario panel title immediately
        const scenarioPanel = document.querySelector(`.scenario-panel[data-scenario="${targetScenario.id}"]`);
        if (scenarioPanel) {
            const panelTitle = scenarioPanel.querySelector('.scenario-panel-title');
            if (panelTitle) {
                panelTitle.textContent = `📊 ${targetScenario.name}`;
            }
        }
        
        // Load parameters
        const params = savedScenario.parameters;
        console.log(`Loading parameters for scenario ${targetScenario.id}:`, params);
        
        // Use a small delay to ensure DOM elements are ready and to override any default values
        setTimeout(() => {
            // Set input values with proper formatting
            const monthlySavingsInput = document.getElementById(`monthlySavings_${targetScenario.id}`);
            const initialCapitalInput = document.getElementById(`initialCapital_${targetScenario.id}`);
            const annualReturnInput = document.getElementById(`annualReturn_${targetScenario.id}`);
            const inflationRateInput = document.getElementById(`inflationRate_${targetScenario.id}`);
            const salaryGrowthInput = document.getElementById(`salaryGrowth_${targetScenario.id}`);
            const durationInput = document.getElementById(`duration_${targetScenario.id}`);
            const baseSalaryInput = document.getElementById(`baseSalary_${targetScenario.id}`);
            const salaryToSavingsInput = document.getElementById(`salaryToSavings_${targetScenario.id}`);
            
            if (monthlySavingsInput) monthlySavingsInput.value = formatGermanNumber(params.monthlySavings || 0, 0);
            if (initialCapitalInput) initialCapitalInput.value = formatGermanNumber(params.initialCapital || 0, 0);
            if (annualReturnInput) annualReturnInput.value = params.annualReturn || 0;
            if (inflationRateInput) inflationRateInput.value = params.inflationRate || 0;
            if (salaryGrowthInput) salaryGrowthInput.value = params.salaryGrowth || 0;
            if (durationInput) durationInput.value = params.duration || 0;
            if (baseSalaryInput) baseSalaryInput.value = formatGermanNumber(params.baseSalary || 0, 0);
            if (salaryToSavingsInput) salaryToSavingsInput.value = params.salaryToSavings || 0;
            
            console.log(`Successfully loaded values for scenario ${targetScenario.id}`);
        }, 100);
        
        // Update slider displays with same delay
        setTimeout(() => {
            const annualReturnValue = document.getElementById(`annualReturnValue_${targetScenario.id}`);
            const inflationRateValue = document.getElementById(`inflationRateValue_${targetScenario.id}`);
            const salaryGrowthValue = document.getElementById(`salaryGrowthValue_${targetScenario.id}`);
            const durationValue = document.getElementById(`durationValue_${targetScenario.id}`);
            const salaryToSavingsValue = document.getElementById(`salaryToSavingsValue_${targetScenario.id}`);
            
            if (annualReturnValue) annualReturnValue.textContent = params.annualReturn + '%';
            if (inflationRateValue) inflationRateValue.textContent = params.inflationRate + '%';
            if (salaryGrowthValue) salaryGrowthValue.textContent = params.salaryGrowth + '%';
            if (durationValue) durationValue.textContent = params.duration + ' Jahre';
            if (salaryToSavingsValue) salaryToSavingsValue.textContent = params.salaryToSavings + '%';
        }, 100);
        
        // Load toggles and ETF type with same delay
        setTimeout(() => {
            const taxToggle = document.getElementById(`taxToggle_${targetScenario.id}`);
            const teilfreistellungToggle = document.getElementById(`teilfreistellungToggle_${targetScenario.id}`);
            
            if (taxToggle) {
                if (params.includeTax) {
                    taxToggle.classList.add('active');
                } else {
                    taxToggle.classList.remove('active');
                }
            }
            
            if (teilfreistellungToggle) {
                if (params.teilfreistellung) {
                    teilfreistellungToggle.classList.add('active');
                } else {
                    teilfreistellungToggle.classList.remove('active');
                }
            }
            
            // Load ETF type
            const etfTypeRadios = document.querySelectorAll(`input[name="etfType_${targetScenario.id}"]`);
            etfTypeRadios.forEach(radio => {
                radio.checked = radio.value === params.etfType;
            });
        }, 100);
        
        // Load savings mode and multi-phase data
        if (params.savingsMode === 'multi-phase') {
            switchSavingsMode(targetScenario.id, 'multi-phase');
            
            // Load multi-phase data
            if (params.multiPhaseData) {
                params.multiPhaseData.forEach((phase, phaseIndex) => {
                    const phaseNum = phaseIndex + 1;
                    if (phaseNum > 1) {
                        // Activate phase
                        const phaseElement = document.querySelector(`.savings-phase[data-phase="${phaseNum}"][data-scenario="${targetScenario.id}"]`);
                        if (phaseElement) {
                            phaseElement.classList.add('active');
                            phaseElement.querySelector('.phase-content').style.display = 'block';
                            phaseElement.querySelector('.phase-toggle-btn').textContent = 'Deaktivieren';
                        }
                    }
                    
                    // Set phase values
                    const startYearInput = document.querySelector(`.phase-start-year[data-phase="${phaseNum}"][data-scenario="${targetScenario.id}"]`);
                    const endYearInput = document.querySelector(`.phase-end-year[data-phase="${phaseNum}"][data-scenario="${targetScenario.id}"]`);
                    const savingsRateInput = document.querySelector(`.phase-savings-rate[data-phase="${phaseNum}"][data-scenario="${targetScenario.id}"]`);
                    
                    if (startYearInput) startYearInput.value = phase.startYear;
                    if (endYearInput) endYearInput.value = phase.endYear;
                    if (savingsRateInput) savingsRateInput.value = formatGermanNumber(phase.monthlySavingsRate, 0);
                });
            }
        }
        

    });
    
    // Restore the original active scenario (don't switch to the newly loaded scenarios)
    if (currentActiveScenario && scenarios.find(s => s.id === currentActiveScenario)) {
        switchToScenario(currentActiveScenario);
    }
    
    // Recalculate all scenarios
    recalculateAll();
    
    closeLoadAnsparphaseScenarioModal();
    showNotification('✅ Szenario erfolgreich geladen!', `Das Ansparphase-Szenario "${scenarioData.name}" wurde erfolgreich geladen als ${loadedScenarios.length} neue Szenarien.`, 'success');
}

/**
 * Helper function to select all scenarios in preview
 */
function selectAllScenarios() {
    const checkboxes = document.querySelectorAll('[id^="loadScenario_"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
    });
}

/**
 * Helper function to deselect all scenarios in preview
 */
function selectNoScenarios() {
    const checkboxes = document.querySelectorAll('[id^="loadScenario_"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
}

/**
 * Select all scenarios for loading
 */
function selectAllScenariosForLoad() {
    const scenarioItems = document.querySelectorAll('#loadAnsparphaseScenarioList .load-profile-item');
    selectedScenariosForLoading = [];
    
    scenarioItems.forEach(item => {
        item.classList.add('selected');
        // Extract scenario name from the onclick attribute
        const onclickAttr = item.getAttribute('onclick');
        const match = onclickAttr.match(/selectAnsparphaseScenarioForLoad\('([^']+)'\)/);
        if (match && match[1]) {
            selectedScenariosForLoading.push(match[1]);
        }
    });
    
    // Update button state
    const confirmBtn = document.getElementById('confirmLoadAnsparphaseScenario');
    confirmBtn.disabled = selectedScenariosForLoading.length === 0;
    
    if (selectedScenariosForLoading.length === 0) {
        confirmBtn.textContent = 'Szenarien laden';
    } else if (selectedScenariosForLoading.length === 1) {
        confirmBtn.textContent = '1 Szenario laden';
    } else {
        confirmBtn.textContent = `${selectedScenariosForLoading.length} Szenarien laden`;
    }
}

/**
 * Clear all scenario selections for loading
 */
function clearAllScenariosForLoad() {
    const scenarioItems = document.querySelectorAll('#loadAnsparphaseScenarioList .load-profile-item');
    selectedScenariosForLoading = [];
    
    scenarioItems.forEach(item => {
        item.classList.remove('selected');
    });
    
    // Update button state
    const confirmBtn = document.getElementById('confirmLoadAnsparphaseScenario');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Szenarien laden';
}

/**
 * Debug function to show all scenario data in localStorage
 */
function debugLocalStorageScenarios() {
    console.log('=== DEBUG: All Ansparphase Scenarios in localStorage ===');
    const scenarioKeys = [];
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('ansparphaseScenario_')) {
            scenarioKeys.push(key);
            try {
                const data = JSON.parse(localStorage.getItem(key));
                console.log(`Key: ${key}`);
                console.log(`Name: ${data.name}`);
                console.log(`Created: ${data.createdAt}`);
                console.log(`Scenarios count: ${data.scenarios?.length || 0}`);
                console.log('---');
            } catch (e) {
                console.log(`Key: ${key} (CORRUPTED DATA)`);
                console.log('---');
            }
        }
    }
    
    console.log(`Total scenario keys found: ${scenarioKeys.length}`);
    console.log('=== END DEBUG ===');
    
    // Also show in notification
    showNotification('🔍 Debug Info', `${scenarioKeys.length} Szenarien in localStorage gefunden. Details in der Konsole.`, 'info');
}

/**
 * Debug function to clear all scenario data from localStorage
 */
function clearAllScenarioData() {
    if (window.confirm('⚠️ ACHTUNG: Alle gespeicherten Szenarien löschen?\n\nDiese Aktion kann NICHT rückgängig gemacht werden!')) {
        const keysToDelete = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('ansparphaseScenario_')) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => {
            localStorage.removeItem(key);
            console.log(`Cleared: ${key}`);
        });
        
        // Refresh all lists
        setTimeout(() => {
            loadManageAnsparphaseScenarioList();
            const loadModal = document.getElementById('loadAnsparphaseScenarioModal');
            if (loadModal && loadModal.style.display === 'block') {
                loadAnsparphaseScenarioList();
            }
        }, 100);
        
        showNotification('🧹 Alle Szenarien gelöscht', `${keysToDelete.length} Szenarien wurden aus dem Speicher entfernt.`, 'success');
        console.log(`Cleared ${keysToDelete.length} scenario entries from localStorage`);
    }
}

/**
 * Open manage Ansparphase scenarios modal
 */
function openManageAnsparphaseScenarioModal() {
    document.getElementById('manageAnsparphaseScenarioModal').style.display = 'block';
    loadManageAnsparphaseScenarioList();
}

/**
 * Close manage Ansparphase scenarios modal
 */
function closeManageAnsparphaseScenarioModal() {
    document.getElementById('manageAnsparphaseScenarioModal').style.display = 'none';
}

/**
 * Load manage Ansparphase scenario list
 */
function loadManageAnsparphaseScenarioList() {
    const scenarioList = document.getElementById('manageAnsparphaseScenarioList');
    const scenarios = [];
    
    // Get all saved scenarios
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('ansparphaseScenario_')) {
            const scenarioName = key.replace('ansparphaseScenario_', '');
            const scenarioData = JSON.parse(localStorage.getItem(key));
            scenarios.push({ name: scenarioName, data: scenarioData });
        }
    }

    if (scenarios.length === 0) {
        scenarioList.innerHTML = `
            <div class="no-profiles">
                <div class="no-profiles-icon">📁</div>
                <p>Keine gespeicherten Szenarien gefunden.</p>
                <p>Erstellen Sie Ihr erstes Szenario mit "Szenario speichern".</p>
            </div>
        `;
        return;
    }

    // Sort scenarios alphabetically
    scenarios.sort((a, b) => (a.data.name || a.name).localeCompare(b.data.name || b.name));

    scenarioList.innerHTML = scenarios.map(scenario => {
        // Handle both old format (scenario sets) and new format (single scenarios)
        let monthlySavings = 0;
        let duration = 0;
        let annualReturn = 0;
        let scenarioType = '';
        
        if (scenario.data.type === 'single' && scenario.data.scenario) {
            // New format: single scenario
            const singleScenario = scenario.data.scenario;
            monthlySavings = singleScenario.parameters?.monthlySavings || 0;
            duration = singleScenario.parameters?.duration || 0;
            annualReturn = singleScenario.parameters?.annualReturn || 0;
            scenarioType = '📄 Einzelszenario';
        } else if (scenario.data.scenarios) {
            // Old format: scenario set
            const firstScenario = scenario.data.scenarios[0];
            monthlySavings = firstScenario?.parameters?.monthlySavings || 0;
            duration = firstScenario?.parameters?.duration || 0;
            annualReturn = firstScenario?.parameters?.annualReturn || 0;
            scenarioType = `📊 Szenario-Set (${scenario.data.scenarios.length} Szenarien)`;
        }
        
        return `
            <div class="profile-item">
                <div class="profile-info">
                    <div class="profile-name">${escapeHtml(scenario.data.name || scenario.name)}</div>
                    <div class="profile-details">
                        Sparrate: €${formatGermanNumber(monthlySavings, 0)} | 
                        Dauer: ${duration} Jahre | 
                        Rendite: ${annualReturn}%<br>
                        <span style="color: #7f8c8d; font-size: 0.85rem;">${scenarioType}</span>
                    </div>
                </div>
                <div class="profile-actions">
                    <button class="profile-action-btn profile-load-btn" onclick="loadAnsparphaseScenarioFromManager('${escapeHtml(scenario.data.name || scenario.name)}')">
                        📂 Laden
                    </button>
                    <button class="profile-action-btn profile-delete-btn" onclick="deleteAnsparphaseScenario('${escapeHtml(scenario.data.name || scenario.name)}')">
                        🗑️ Löschen
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Load Ansparphase scenario from manager
 */
function loadAnsparphaseScenarioFromManager(scenarioName) {
    loadSelectedAnsparphaseScenario(scenarioName);
    closeManageAnsparphaseScenarioModal();
}

/**
 * Delete Ansparphase scenario
 */
function deleteAnsparphaseScenario(scenarioName) {
    if (window.confirm(`❓ Szenario "${scenarioName}" wirklich löschen?\n\nDiese Aktion kann nicht rückgängig gemacht werden.`)) {
        // Find ALL localStorage keys that match this scenario name (in case there are duplicates)
        const keysToDelete = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('ansparphaseScenario_')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (data && data.name === scenarioName) {
                        keysToDelete.push(key);
                    }
                } catch (e) {
                    console.warn(`Invalid JSON in localStorage key: ${key}`, e);
                    // If the data is corrupted, also delete it
                    if (key.includes(scenarioName)) {
                        keysToDelete.push(key);
                    }
                }
            }
        }
        
        if (keysToDelete.length > 0) {
            // Delete all matching keys
            keysToDelete.forEach(key => {
                localStorage.removeItem(key);
                console.log(`Deleted localStorage key: ${key}`);
            });
            
            // Force refresh the lists after a delay to ensure localStorage is updated
            setTimeout(() => {
                loadManageAnsparphaseScenarioList(); // Refresh the manage list
                // Also refresh the load list if it's open
                const loadModal = document.getElementById('loadAnsparphaseScenarioModal');
                if (loadModal && loadModal.style.display === 'block') {
                    loadAnsparphaseScenarioList();
                }
            }, 100);
            
            showNotification('🗑️ Szenario gelöscht!', `Das Ansparphase-Szenario "${scenarioName}" wurde gelöscht (${keysToDelete.length} Einträge entfernt).`, 'success');
        } else {
            showNotification('Fehler', 'Szenario konnte nicht gefunden werden.', 'error');
        }
    }
}

/**
 * Reset Ansparphase scenarios
 */
function resetAnsparphaseScenarios() {
    if (window.confirm('❓ Alle Ansparphase-Szenarien auf Standardwerte zurücksetzen?\n\nDiese Aktion kann nicht rückgängig gemacht werden.')) {
        // Reset all scenarios to default values
        scenarios.forEach(scenario => {
            document.getElementById(`monthlySavings_${scenario.id}`).value = '500';
            document.getElementById(`initialCapital_${scenario.id}`).value = '3000';
            document.getElementById(`annualReturn_${scenario.id}`).value = '7';
            document.getElementById(`inflationRate_${scenario.id}`).value = '2';
            document.getElementById(`salaryGrowth_${scenario.id}`).value = '3';
            document.getElementById(`duration_${scenario.id}`).value = '25';
            document.getElementById(`baseSalary_${scenario.id}`).value = '60000';
            document.getElementById(`salaryToSavings_${scenario.id}`).value = '50';
            
            // Update slider displays
            document.getElementById(`annualReturnValue_${scenario.id}`).textContent = '7%';
            document.getElementById(`inflationRateValue_${scenario.id}`).textContent = '2%';
            document.getElementById(`salaryGrowthValue_${scenario.id}`).textContent = '3%';
            document.getElementById(`durationValue_${scenario.id}`).textContent = '25 Jahre';
            document.getElementById(`salaryToSavingsValue_${scenario.id}`).textContent = '50%';
            
            // Reset toggles
            document.getElementById(`taxToggle_${scenario.id}`).classList.add('active');
            document.getElementById(`teilfreistellungToggle_${scenario.id}`).classList.add('active');
            
            // Reset ETF type
            const etfTypeRadios = document.querySelectorAll(`input[name="etfType_${scenario.id}"]`);
            etfTypeRadios.forEach(radio => {
                radio.checked = radio.value === 'thesaurierend';
            });
            
            // Reset to simple savings mode
            switchSavingsMode(scenario.id, 'simple');
        });
        
        // Recalculate all scenarios
        recalculateAll();
        
        showNotification('🔄 Szenarien zurückgesetzt!', 'Alle Ansparphase-Szenarien wurden auf Standardwerte zurückgesetzt.', 'success');
    }
}

// ===========================================
// ENTNAHMEPHASE SCENARIO SAVING FUNCTIONALITY
// ===========================================

/**
 * Setup event listeners for Entnahmephase scenario saving functionality
 */
function setupEntnahmephaseScenarioListeners() {
    // Save scenario modal
    document.getElementById('saveEntnahmephaseScenario').addEventListener('click', openSaveEntnahmephaseScenarioModal);
    document.getElementById('closeSaveEntnahmephaseScenarioModal').addEventListener('click', closeSaveEntnahmephaseScenarioModal);
    document.getElementById('cancelSaveEntnahmephaseScenario').addEventListener('click', closeSaveEntnahmephaseScenarioModal);
    document.getElementById('confirmSaveEntnahmephaseScenario').addEventListener('click', confirmSaveEntnahmephaseScenario);
    document.getElementById('entnahmephaseScenarioName').addEventListener('input', updateEntnahmephaseScenarioPreview);
    document.getElementById('entnahmephaseScenarioDescription').addEventListener('input', updateEntnahmephaseScenarioPreview);

    // Load scenario modal
    document.getElementById('loadEntnahmephaseScenario').addEventListener('click', openLoadEntnahmephaseScenarioModal);
    document.getElementById('closeLoadEntnahmephaseScenarioModal').addEventListener('click', closeLoadEntnahmephaseScenarioModal);
    document.getElementById('cancelLoadEntnahmephaseScenario').addEventListener('click', closeLoadEntnahmephaseScenarioModal);

    // Manage scenarios modal
    document.getElementById('manageEntnahmephaseScenarios').addEventListener('click', openManageEntnahmephaseScenarioModal);
    document.getElementById('closeManageEntnahmephaseScenarioModal').addEventListener('click', closeManageEntnahmephaseScenarioModal);

    // Reset scenarios
    document.getElementById('resetEntnahmephaseScenario').addEventListener('click', resetEntnahmephaseScenarios);

    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        const saveModal = document.getElementById('saveEntnahmephaseScenarioModal');
        const loadModal = document.getElementById('loadEntnahmephaseScenarioModal');
        const manageModal = document.getElementById('manageEntnahmephaseScenarioModal');
        
        if (event.target === saveModal) {
            closeSaveEntnahmephaseScenarioModal();
        }
        if (event.target === loadModal) {
            closeLoadEntnahmephaseScenarioModal();
        }
        if (event.target === manageModal) {
            closeManageEntnahmephaseScenarioModal();
        }
    });
}

/**
 * Open save Entnahmephase scenario modal
 */
function openSaveEntnahmephaseScenarioModal() {
    document.getElementById('saveEntnahmephaseScenarioModal').style.display = 'block';
    
    const nameInput = document.getElementById('entnahmephaseScenarioName');
    const descInput = document.getElementById('entnahmephaseScenarioDescription');
    
    // Immediately clear fields
    nameInput.value = '';
    descInput.value = '';
    
    // Clear again after a short delay to override any browser auto-fill
    setTimeout(() => {
        nameInput.value = '';
        descInput.value = '';
        nameInput.focus();
        updateEntnahmephaseScenarioPreview();
    }, 50);
    
    // Clear one more time after a longer delay for persistent auto-fill
    setTimeout(() => {
        if (nameInput.value === '0' || nameInput.value.trim() === '0') {
            nameInput.value = '';
            updateEntnahmephaseScenarioPreview();
        }
    }, 200);
}

/**
 * Close save Entnahmephase scenario modal
 */
function closeSaveEntnahmephaseScenarioModal() {
    document.getElementById('saveEntnahmephaseScenarioModal').style.display = 'none';
    document.getElementById('entnahmephaseScenarioName').value = '';
    document.getElementById('entnahmephaseScenarioDescription').value = '';
}

/**
 * Update Entnahmephase scenario preview
 */
function updateEntnahmephaseScenarioPreview() {
    const previewContainer = document.getElementById('entnahmephaseScenarioPreview');
    
    // Get current withdrawal data
    const retirementCapital = parseGermanNumber(document.getElementById('retirementCapital').value) || 0;
    const withdrawalDuration = parseInt(document.getElementById('withdrawalDuration').value) || 0;
    const postRetirementReturn = parseFloat(document.getElementById('postRetirementReturn').value) || 0;
    const withdrawalInflation = parseFloat(document.getElementById('withdrawalInflation').value) || 0;
    const withdrawalTaxActive = document.getElementById('withdrawalTaxToggle').classList.contains('active');
    const teilfreistellungRate = parseFloat(document.getElementById('withdrawalTeilfreistellungRate').value) || 0;
    
    previewContainer.innerHTML = `
        <div class="preview-item">
            <span class="preview-label">💰 Verfügbares Kapital</span>
            <span class="preview-value">€${formatGermanNumber(retirementCapital, 0)}</span>
        </div>
        <div class="preview-item">
            <span class="preview-label">⏱️ Entnahmedauer</span>
            <span class="preview-value">${withdrawalDuration} Jahre</span>
        </div>
        <div class="preview-item">
            <span class="preview-label">📈 Rendite im Ruhestand</span>
            <span class="preview-value">${postRetirementReturn}%</span>
        </div>
        <div class="preview-item">
            <span class="preview-label">📊 Inflationsrate</span>
            <span class="preview-value">${withdrawalInflation}%</span>
        </div>
        <div class="preview-item">
            <span class="preview-label">💸 Abgeltungssteuer</span>
            <span class="preview-value">${withdrawalTaxActive ? 'Ja (25%)' : 'Nein'}</span>
        </div>
        <div class="preview-item">
            <span class="preview-label">🛡️ Teilfreistellung</span>
            <span class="preview-value">${withdrawalTaxActive ? teilfreistellungRate + '%' : 'N/A'}</span>
        </div>
        <div class="preview-item">
            <span class="preview-label">📅 Erstellt</span>
            <span class="preview-value">${new Date().toLocaleDateString('de-DE')}</span>
        </div>
    `;
    
    // Enable/disable save button based on scenario name
    const saveBtn = document.getElementById('confirmSaveEntnahmephaseScenario');
    const scenarioName = document.getElementById('entnahmephaseScenarioName').value.trim();
    saveBtn.disabled = scenarioName.length === 0;
}

/**
 * Confirm save Entnahmephase scenario
 */
function confirmSaveEntnahmephaseScenario() {
    const scenarioName = document.getElementById('entnahmephaseScenarioName').value.trim();
    const scenarioDescription = document.getElementById('entnahmephaseScenarioDescription').value.trim();
    
    if (!scenarioName) {
        alert('❌ Bitte geben Sie einen Szenario-Namen ein.');
        return;
    }
    
    // Check if scenario already exists
    if (localStorage.getItem('entnahmephaseScenario_' + scenarioName)) {
        if (!confirm(`⚠️ Ein Szenario mit dem Namen "${scenarioName}" existiert bereits. Möchten Sie es überschreiben?`)) {
            return;
        }
    }
    
    const scenarioData = {
        name: scenarioName,
        description: scenarioDescription,
        createdAt: new Date().toISOString(),
        parameters: {
            retirementCapital: parseGermanNumber(document.getElementById('retirementCapital').value) || 0,
            withdrawalDuration: parseInt(document.getElementById('withdrawalDuration').value) || 0,
            postRetirementReturn: parseFloat(document.getElementById('postRetirementReturn').value) || 0,
            withdrawalInflation: parseFloat(document.getElementById('withdrawalInflation').value) || 0,
            withdrawalTaxActive: document.getElementById('withdrawalTaxToggle').classList.contains('active'),
            teilfreistellungRate: parseFloat(document.getElementById('withdrawalTeilfreistellungRate').value) || 0
        }
    };

    localStorage.setItem('entnahmephaseScenario_' + scenarioName, JSON.stringify(scenarioData));
    closeSaveEntnahmephaseScenarioModal();
    
    showNotification('✅ Szenario erfolgreich gespeichert!', `Das Entnahmephase-Szenario "${scenarioName}" wurde erfolgreich gespeichert.`, 'success');
}

/**
 * Open load Entnahmephase scenario modal
 */
function openLoadEntnahmephaseScenarioModal() {
    document.getElementById('loadEntnahmephaseScenarioModal').style.display = 'block';
    loadEntnahmephaseScenarioList();
}

/**
 * Close load Entnahmephase scenario modal
 */
function closeLoadEntnahmephaseScenarioModal() {
    document.getElementById('loadEntnahmephaseScenarioModal').style.display = 'none';
}

/**
 * Load Entnahmephase scenario list
 */
function loadEntnahmephaseScenarioList() {
    const scenarioList = document.getElementById('loadEntnahmephaseScenarioList');
    const scenarios = [];
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('entnahmephaseScenario_')) {
            const scenarioData = JSON.parse(localStorage.getItem(key));
            scenarios.push({
                key: key,
                name: key.replace('entnahmephaseScenario_', ''),
                data: scenarioData
            });
        }
    }

    if (scenarios.length === 0) {
        scenarioList.innerHTML = `
            <div class="no-profiles">
                <div class="no-profiles-icon">📂</div>
                <h4>Keine Szenarien gefunden</h4>
                <p>Erstellen Sie Ihr erstes Szenario mit "Szenario speichern".</p>
            </div>
        `;
        return;
    }

    // Sort scenarios by creation date (newest first)
    scenarios.sort((a, b) => {
        const dateA = new Date(a.data.createdAt || 0);
        const dateB = new Date(b.data.createdAt || 0);
        return dateB - dateA;
    });

    scenarioList.innerHTML = scenarios.map(scenario => {
        const createdDate = scenario.data.createdAt ? 
            new Date(scenario.data.createdAt).toLocaleDateString('de-DE') : 
            'Unbekannt';
        
        const params = scenario.data.parameters;
        const retirementCapital = params?.retirementCapital || 0;
        const duration = params?.withdrawalDuration || 0;
        const returnRate = params?.postRetirementReturn || 0;
        
        return `
            <div class="load-profile-item" onclick="selectEntnahmephaseScenarioForLoad('${escapeHtml(scenario.data.name || scenario.name)}')">
                <div class="profile-info">
                    <div class="profile-name">${escapeHtml(scenario.data.name || scenario.name)}</div>
                    <div class="profile-details">
                        ${scenario.data.description ? `<div style="margin-bottom: 5px; color: #34495e;">${escapeHtml(scenario.data.description)}</div>` : ''}
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.8rem;">
                            <span>💰 Kapital: €${formatGermanNumber(retirementCapital, 0)}</span>
                            <span>⏱️ Dauer: ${duration} Jahre</span>
                            <span>📈 Rendite: ${returnRate}%</span>
                            <span>📅 Erstellt: ${createdDate}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Select Entnahmephase scenario for loading
 */
function selectEntnahmephaseScenarioForLoad(scenarioName) {
    // Remove previous selection
    document.querySelectorAll('#loadEntnahmephaseScenarioList .load-profile-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Add selection to clicked item
    event.target.closest('.load-profile-item').classList.add('selected');
    
    // Load the scenario after a short delay
    setTimeout(() => {
        loadSelectedEntnahmephaseScenario(scenarioName);
    }, 300);
}

/**
 * Load selected Entnahmephase scenario
 */
function loadSelectedEntnahmephaseScenario(scenarioName) {
    // Find the correct localStorage key for this scenario name
    let scenarioData = null;
    let foundKey = null;
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('entnahmephaseScenario_')) {
            const data = JSON.parse(localStorage.getItem(key));
            if (data && data.name === scenarioName) {
                scenarioData = data;
                foundKey = key;
                break;
            }
        }
    }
    
    if (!scenarioData) {
        alert('❌ Szenario konnte nicht geladen werden.');
        return;
    }
    
    // Load parameters
    const params = scenarioData.parameters;
    document.getElementById('retirementCapital').value = formatGermanNumber(params.retirementCapital, 0);
    document.getElementById('withdrawalDuration').value = params.withdrawalDuration;
    document.getElementById('postRetirementReturn').value = params.postRetirementReturn;
    document.getElementById('withdrawalInflation').value = params.withdrawalInflation;
    document.getElementById('withdrawalTeilfreistellungRate').value = params.teilfreistellungRate;
    
    // Update slider displays
    document.getElementById('withdrawalDurationValue').textContent = params.withdrawalDuration + ' Jahre';
    document.getElementById('postRetirementReturnValue').textContent = params.postRetirementReturn + '%';
    document.getElementById('withdrawalInflationValue').textContent = params.withdrawalInflation + '%';
    document.getElementById('withdrawalTeilfreistellungRateValue').textContent = params.teilfreistellungRate + '%';
    
    // Load tax toggle
    const withdrawalTaxToggle = document.getElementById('withdrawalTaxToggle');
    if (params.withdrawalTaxActive) {
        withdrawalTaxToggle.classList.add('active');
        document.getElementById('teilfreistellungGroup').style.display = 'block';
    } else {
        withdrawalTaxToggle.classList.remove('active');
        document.getElementById('teilfreistellungGroup').style.display = 'none';
    }
    
    // Recalculate withdrawal
    calculateWithdrawal();
    
    closeLoadEntnahmephaseScenarioModal();
    showNotification('✅ Szenario erfolgreich geladen!', `Das Entnahmephase-Szenario "${scenarioData.name}" wurde erfolgreich geladen.`, 'success');
}

/**
 * Open manage Entnahmephase scenarios modal
 */
function openManageEntnahmephaseScenarioModal() {
    document.getElementById('manageEntnahmephaseScenarioModal').style.display = 'block';
    loadManageEntnahmephaseScenarioList();
}

/**
 * Close manage Entnahmephase scenarios modal
 */
function closeManageEntnahmephaseScenarioModal() {
    document.getElementById('manageEntnahmephaseScenarioModal').style.display = 'none';
}

/**
 * Load manage Entnahmephase scenario list
 */
function loadManageEntnahmephaseScenarioList() {
    const scenarioList = document.getElementById('manageEntnahmephaseScenarioList');
    const scenarios = [];
    
    // Get all saved scenarios
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('entnahmephaseScenario_')) {
            const scenarioName = key.replace('entnahmephaseScenario_', '');
            const scenarioData = JSON.parse(localStorage.getItem(key));
            scenarios.push({ name: scenarioName, data: scenarioData });
        }
    }

    if (scenarios.length === 0) {
        scenarioList.innerHTML = `
            <div class="no-profiles">
                <div class="no-profiles-icon">📁</div>
                <p>Keine gespeicherten Szenarien gefunden.</p>
                <p>Erstellen Sie Ihr erstes Szenario mit "Szenario speichern".</p>
            </div>
        `;
        return;
    }

    // Sort scenarios alphabetically
    scenarios.sort((a, b) => (a.data.name || a.name).localeCompare(b.data.name || b.name));

    scenarioList.innerHTML = scenarios.map(scenario => {
        const params = scenario.data.parameters;
        const retirementCapital = params?.retirementCapital || 0;
        const duration = params?.withdrawalDuration || 0;
        const returnRate = params?.postRetirementReturn || 0;
        
        return `
            <div class="profile-item">
                <div class="profile-info">
                    <div class="profile-name">${escapeHtml(scenario.data.name || scenario.name)}</div>
                    <div class="profile-details">
                        Kapital: €${formatGermanNumber(retirementCapital, 0)} | 
                        Dauer: ${duration} Jahre | 
                        Rendite: ${returnRate}%
                    </div>
                </div>
                <div class="profile-actions">
                    <button class="profile-action-btn profile-load-btn" onclick="loadEntnahmephaseScenarioFromManager('${escapeHtml(scenario.data.name || scenario.name)}')">
                        📂 Laden
                    </button>
                    <button class="profile-action-btn profile-delete-btn" onclick="deleteEntnahmephaseScenario('${escapeHtml(scenario.data.name || scenario.name)}')">
                        🗑️ Löschen
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Load Entnahmephase scenario from manager
 */
function loadEntnahmephaseScenarioFromManager(scenarioName) {
    loadSelectedEntnahmephaseScenario(scenarioName);
    closeManageEntnahmephaseScenarioModal();
}

/**
 * Delete Entnahmephase scenario
 */
function deleteEntnahmephaseScenario(scenarioName) {
    if (confirm(`❓ Szenario "${scenarioName}" wirklich löschen?\n\nDiese Aktion kann nicht rückgängig gemacht werden.`)) {
        // Find the correct localStorage key for this scenario name
        let foundKey = null;
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('entnahmephaseScenario_')) {
                const data = JSON.parse(localStorage.getItem(key));
                if (data && data.name === scenarioName) {
                    foundKey = key;
                    break;
                }
            }
        }
        
        if (foundKey) {
            localStorage.removeItem(foundKey);
            loadManageEntnahmephaseScenarioList(); // Refresh the list
            showNotification('🗑️ Szenario gelöscht!', `Das Entnahmephase-Szenario "${scenarioName}" wurde gelöscht.`, 'success');
        } else {
            showNotification('Fehler', 'Szenario konnte nicht gefunden werden.', 'error');
        }
    }
}

/**
 * Reset Entnahmephase scenarios
 */
function resetEntnahmephaseScenarios() {
    if (confirm('❓ Alle Entnahmephase-Parameter auf Standardwerte zurücksetzen?\n\nDiese Aktion kann nicht rückgängig gemacht werden.')) {
        // Reset to default values
        document.getElementById('retirementCapital').value = '1000000';
        document.getElementById('withdrawalDuration').value = '25';
        document.getElementById('postRetirementReturn').value = '5';
        document.getElementById('withdrawalInflation').value = '2';
        document.getElementById('withdrawalTeilfreistellungRate').value = '30';
        
        // Update slider displays
        document.getElementById('withdrawalDurationValue').textContent = '25 Jahre';
        document.getElementById('postRetirementReturnValue').textContent = '5%';
        document.getElementById('withdrawalInflationValue').textContent = '2%';
        document.getElementById('withdrawalTeilfreistellungRateValue').textContent = '30%';
        
        // Reset tax toggle
        document.getElementById('withdrawalTaxToggle').classList.add('active');
        document.getElementById('teilfreistellungGroup').style.display = 'block';
        
        // Recalculate withdrawal
        calculateWithdrawal();
        
        showNotification('🔄 Parameter zurückgesetzt!', 'Alle Entnahmephase-Parameter wurden auf Standardwerte zurückgesetzt.', 'success');
    }
}

// ==================================================
// PARAMETER COMPARISON TABLE FUNCTIONALITY
// ==================================================

function setupParameterComparisonTable() {
    const tableControls = document.querySelectorAll('.table-control-btn');
    
    tableControls.forEach(btn => {
        btn.addEventListener('click', function() {
            // Update active button
            tableControls.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Filter table based on category
            const category = this.dataset.category;
            updateParameterComparisonTable(category);
        });
    });
    
    // Initial load
    updateParameterComparisonTable('all');
}

function updateParameterComparisonTable(filterCategory = 'all') {
    const table = document.getElementById('scenarioComparisonTable');
    if (!table) return;
    
    // Get visible scenarios
    const visibleScenarios = getVisibleComparisonScenarios();
    
    if (visibleScenarios.length === 0) {
        table.innerHTML = `
            <thead>
                <tr>
                    <th class="parameter-column">Parameter</th>
                    <th>Keine Szenarien ausgewählt</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td colspan="2" style="text-align: center; padding: 40px; color: #7f8c8d;">
                        Bitte wählen Sie mindestens ein Szenario aus der Sichtbarkeits-Kontrolle aus.
                    </td>
                </tr>
            </tbody>
        `;
        return;
    }
    
    // Create table header
    let headerHtml = '<tr><th class="parameter-column">Parameter</th>';
    visibleScenarios.forEach(scenario => {
        headerHtml += `<th class="scenario-column" data-scenario="${scenario.id}" style="color: ${scenario.color};">${scenario.name}</th>`;
    });
    headerHtml += '</tr>';
    
    // Generate table content based on filter
    const tableData = generateTableData(visibleScenarios, filterCategory);
    
    table.innerHTML = `
        <thead>${headerHtml}</thead>
        <tbody>${tableData}</tbody>
    `;
}

function generateTableData(scenarios, filterCategory) {
    let html = '';
    const categories = getParameterCategories();
    
    categories.forEach((category, categoryIndex) => {
        if (filterCategory !== 'all' && filterCategory !== category.id) return;
        
        // Add spacing before category (except for the first one)
        if (categoryIndex > 0 && filterCategory === 'all') {
            html += `<tr class="category-spacer"><td colspan="${scenarios.length + 1}" style="height: 20px; border: none; background: transparent;"></td></tr>`;
        }
        
        // Category header
        html += `
            <tr class="category-header" data-category="${category.id}">
                <td colspan="${scenarios.length + 1}"><strong>${category.name}</strong></td>
            </tr>
        `;
        
        // Category parameters
        category.parameters.forEach(param => {
            html += `<tr data-category="${category.id}">`;
            html += `<td class="parameter-column">${param.label}</td>`;
            
            scenarios.forEach(scenario => {
                const value = getParameterValue(scenario, param);
                const formattedValue = formatParameterValue(value, param, scenario);
                const cssClass = getParameterCssClass(value, param, scenarios);
                
                html += `<td class="${cssClass}">${formattedValue}</td>`;
            });
            
            html += '</tr>';
        });
    });
    
    return html;
}

function getParameterCategories() {
    return [
        {
            id: 'budget',
            name: 'Budgetplanung',
            parameters: [
                { key: 'budget.netSalary', label: 'Netto-Gehalt', type: 'currency', formatter: 'monthly' },
                { key: 'budget.sideIncome', label: 'Nebeneinkommen', type: 'currency', formatter: 'monthly' },
                { key: 'budget.fixedExpenses', label: 'Fixkosten', type: 'currency', formatter: 'monthly' },
                { key: 'budget.variableExpenses', label: 'Variable Kosten', type: 'currency', formatter: 'monthly' },
                { key: 'calculated.availableSavings', label: 'Verfügbare Sparrate', type: 'currency', formatter: 'monthly', compareType: 'higher' },
                { key: 'calculated.usedSavingsRate', label: 'Genutzte Sparrate (%)', type: 'percentage', compareType: 'optimal' }
            ]
        },
        {
            id: 'accumulation',
            name: 'Ansparphase',
            parameters: [
                { key: 'accumulation.monthlySavings', label: 'Monatliche Sparrate', type: 'currency', formatter: 'monthly', compareType: 'higher' },
                { key: 'accumulation.initialCapital', label: 'Startkapital', type: 'currency', compareType: 'higher' },
                { key: 'accumulation.annualReturn', label: 'Jährliche Rendite', type: 'percentage', compareType: 'higher' },
                { key: 'accumulation.inflationRate', label: 'Inflationsrate', type: 'percentage', compareType: 'lower' },
                { key: 'accumulation.duration', label: 'Anlagedauer', type: 'years' },
                { key: 'accumulation.salaryGrowth', label: 'Gehaltssteigerung', type: 'percentage', compareType: 'higher' },
                { key: 'accumulation.includeTax', label: 'Deutsche Abgeltungssteuer', type: 'boolean' },
                { key: 'accumulation.teilfreistellung', label: 'Teilfreistellung (30%)', type: 'boolean' },
                { key: 'etfType', label: 'ETF-Typ', type: 'text' },
                { key: 'calculated.endkapitalNominal', label: 'Endkapital (Nominal)', type: 'currency', compareType: 'higher' },
                { key: 'calculated.endkapitalReal', label: 'Endkapital (Real)', type: 'currency', compareType: 'higher' }
            ]
        },
        {
            id: 'withdrawal',
            name: 'Entnahmephase',
            parameters: [
                { key: 'withdrawal.retirementCapital', label: 'Startkapital für Rente', type: 'currency', compareType: 'higher' },
                { key: 'withdrawal.duration', label: 'Entnahmedauer', type: 'years', compareType: 'higher' },
                { key: 'withdrawal.postRetirementReturn', label: 'Rendite im Ruhestand', type: 'percentage', compareType: 'higher' },
                { key: 'withdrawal.inflationRate', label: 'Inflationsrate', type: 'percentage', compareType: 'lower' },
                { key: 'withdrawal.includeTax', label: 'Abgeltungssteuer anwenden', type: 'boolean' }
            ]
        },
        {
            id: 'results',
            name: 'Ergebnisse',
            parameters: [
                { key: 'results.finalCapital', label: 'Kapital bei Renteneintritt', type: 'currency', compareType: 'higher' },
                { key: 'results.totalContributions', label: 'Gesamte Einzahlungen', type: 'currency' },
                { key: 'results.totalGains', label: 'Gesamte Gewinne', type: 'currency', compareType: 'higher' },
                { key: 'results.effectiveReturn', label: 'Effektive Rendite', type: 'percentage', compareType: 'higher' },
                { key: 'results.taxesPaid', label: 'Gezahlte Steuern', type: 'currency', compareType: 'lower' },
                { key: 'results.monthlyPension', label: 'Monatliche Rente', type: 'currency', formatter: 'monthly', compareType: 'higher' },
                { key: 'results.realPurchasingPower', label: 'Reale Kaufkraft', type: 'currency', formatter: 'monthly', compareType: 'higher' }
            ]
        }
    ];
}

function getParameterValue(scenario, param) {
    const keys = param.key.split('.');
    
    if (keys[0] === 'calculated') {
        return getCalculatedParameterValue(scenario, keys[1]);
    }
    
    if (keys[0] === 'results') {
        return getResultParameterValue(scenario, keys[1]);
    }
    
    // Fix ETF-Type handling - param.key is 'etfType', not 'etfType.something'
    if (param.key === 'etfType') {
        return getComparisonScenarioETFType(scenario.id);
    }
    
    // Standard parameter values
    if (keys[0] === 'budget' || keys[0] === 'accumulation' || keys[0] === 'withdrawal') {
        if (param.type === 'boolean') {
            return getComparisonScenarioToggleValue(scenario.id, param.key);
        } else {
            const value = getComparisonScenarioValue(scenario.id, param.key);
            if (!value) return 0;
            
            // For percentage parameters, the slider values are already in the correct format (e.g., 8.5 for 8.5%)
            // Don't multiply by 100 or do any additional conversion
            if (param.type === 'percentage') {
                const numericValue = parseFloat(value);
                return !isNaN(numericValue) ? numericValue : 0;
            }
            
            // For other numeric values, use parseGermanNumber for proper handling
            const numericValue = parseGermanNumber(value);
            return numericValue !== null ? numericValue : (parseFloat(value) || 0);
        }
    }
    
    return '';
}

function getCalculatedParameterValue(scenario, key) {
    const netSalary = parseGermanNumber(getComparisonScenarioValue(scenario.id, 'budget.netSalary') || '0');
    const sideIncome = parseGermanNumber(getComparisonScenarioValue(scenario.id, 'budget.sideIncome') || '0');
    const fixedExpenses = parseGermanNumber(getComparisonScenarioValue(scenario.id, 'budget.fixedExpenses') || '0');
    const variableExpenses = parseGermanNumber(getComparisonScenarioValue(scenario.id, 'budget.variableExpenses') || '0');
    const monthlySavings = parseGermanNumber(getComparisonScenarioValue(scenario.id, 'accumulation.monthlySavings') || '0');
    
    const totalIncome = netSalary + sideIncome;
    const totalExpenses = fixedExpenses + variableExpenses;
    const availableSavings = totalIncome - totalExpenses;
    
    switch (key) {
        case 'availableSavings':
            return availableSavings;
        case 'usedSavingsRate':
            return availableSavings > 0 ? (monthlySavings / availableSavings) * 100 : 0;
        case 'endkapitalNominal':
        case 'endkapitalReal':
            // Calculate endkapital using the wealth development function
            const initialCapital = parseGermanNumber(getComparisonScenarioValue(scenario.id, 'accumulation.initialCapital') || '0');
            const annualReturn = parseFloat(getComparisonScenarioValue(scenario.id, 'accumulation.annualReturn') || '0') / 100;
            const inflationRate = parseFloat(getComparisonScenarioValue(scenario.id, 'accumulation.inflationRate') || '0') / 100;
            const salaryGrowth = parseFloat(getComparisonScenarioValue(scenario.id, 'accumulation.salaryGrowth') || '0') / 100;
            const duration = parseInt(getComparisonScenarioValue(scenario.id, 'accumulation.duration') || '0');
            const salaryToSavings = parseFloat(getComparisonScenarioValue(scenario.id, 'accumulation.salaryToSavings') || '0') / 100;
            const includeTax = getComparisonScenarioToggleValue(scenario.id, 'accumulation.includeTax');
            const teilfreistellung = getComparisonScenarioToggleValue(scenario.id, 'accumulation.teilfreistellung');
            const etfType = getComparisonScenarioETFType(scenario.id);
            // Get base salary directly from input field
            const baseSalary = parseGermanNumber(getComparisonScenarioValue(scenario.id, 'budget.grossSalary') || '70000');
            
            if (monthlySavings > 0 && duration > 0) {
                const wealthResult = calculateWealthDevelopment(
                    monthlySavings,
                    initialCapital,
                    annualReturn,
                    inflationRate,
                    salaryGrowth,
                    duration,
                    salaryToSavings,
                    includeTax,
                    baseSalary,
                    teilfreistellung,
                    etfType
                );
                
                return key === 'endkapitalNominal' ? wealthResult.finalNominal : wealthResult.finalReal;
            }
            return 0;
        default:
            return 0;
    }
}

function getResultParameterValue(scenario, key) {
    if (!scenario.results) return 0;
    
    switch (key) {
        case 'finalCapital':
            return scenario.results.finalCapital || 0;
        case 'finalCapitalReal':
            // Calculate real value for the final capital
            const nominalCapital = scenario.results.finalCapital || 0;
            const inflationRate = parseFloat(getComparisonScenarioValue(scenario.id, 'accumulation.inflationRate') || '2') / 100;
            const duration = parseInt(getComparisonScenarioValue(scenario.id, 'accumulation.duration') || '25');
            return calculateRealValue(nominalCapital, inflationRate, duration);
        case 'totalContributions':
            return scenario.results.totalContributions || 0;
        case 'totalGains':
            return scenario.results.totalGains || 0;
        case 'effectiveReturn':
            return scenario.results.effectiveReturn || 0;
        case 'taxesPaid':
            return scenario.results.taxesPaid || 0;
        case 'monthlyPension':
            return scenario.results.monthlyPension || 0;
        case 'realPurchasingPower':
            return scenario.results.realPurchasingPower || 0;
        default:
            return 0;
    }
}

function formatParameterValue(value, param, scenario = null) {
    if (value === '' || value === null || value === undefined) return '-';
    
    switch (param.type) {
        case 'currency':
            if (param.formatter === 'monthly') {
                return formatCurrency(value) + '/Monat';
            }
            
            // Special formatting for final capital to show both nominal and real values
            if (param.key === 'results.finalCapital' && scenario) {
                const nominalValue = formatCurrency(value);
                const inflationRate = parseFloat(getComparisonScenarioValue(scenario.id, 'accumulation.inflationRate') || '2') / 100;
                const duration = parseInt(getComparisonScenarioValue(scenario.id, 'accumulation.duration') || '25');
                const realValue = calculateRealValue(value, inflationRate, duration);
                const realValueFormatted = formatCurrency(realValue);
                
                return `${nominalValue}<div style="font-size: 0.8em; font-weight: normal; color: #7f8c8d;">(${realValueFormatted})</div>`;
            }
            
            return formatCurrency(value);
        case 'percentage':
            return value.toFixed(1) + '%';
        case 'years':
            return value + ' Jahre';
        case 'boolean':
            return value ? '✅ Ja' : '❌ Nein';
        case 'text':
            return value === 'thesaurierend' ? 'Thesaurierend' : 
                   value === 'ausschuettend' ? 'Ausschüttend' : value;
        default:
            return value.toString();
    }
}

function getParameterCssClass(value, param, allScenarios) {
    if (!param.compareType || param.type === 'boolean' || param.type === 'text') {
        return '';
    }
    
    // Get all values for this parameter across scenarios
    const allValues = allScenarios.map(s => getParameterValue(s, param)).filter(v => v !== '' && v !== null && v !== undefined);
    
    if (allValues.length <= 1) return '';
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return '';
    
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    
    // Determine if this is the best value
    let isBest = false;
    let isWorst = false;
    
    if (param.compareType === 'higher') {
        isBest = numValue === maxValue && maxValue > minValue;
        isWorst = numValue === minValue && maxValue > minValue;
    } else if (param.compareType === 'lower') {
        isBest = numValue === minValue && maxValue > minValue;
        isWorst = numValue === maxValue && maxValue > minValue;
    } else if (param.compareType === 'optimal') {
        // For percentage values, assume optimal is around 80-90%
        const optimalRange = [80, 90];
        if (numValue >= optimalRange[0] && numValue <= optimalRange[1]) {
            isBest = true;
        } else if (numValue < 50 || numValue > 95) {
            isWorst = true;
        }
    }
    
    if (isBest) return 'positive';
    if (isWorst) return 'negative';
    
    // For values in between, check if they're significantly different
    const range = maxValue - minValue;
    const threshold = range * 0.1; // 10% threshold
    
    if (param.compareType === 'higher' && numValue > (minValue + threshold)) {
        return 'warning';
    } else if (param.compareType === 'lower' && numValue < (maxValue - threshold)) {
        return 'warning';
    }
    
    return '';
}

// Update performance summary cards with dynamic data based on actual scenario results
function updatePerformanceSummary() {
    const container = document.getElementById('performanceCardsContainer');
    if (!container) return;
    
    // Get scenarios with calculated results
    const scenariosWithResults = comparisonScenarios.filter(scenario => 
        scenario.results && 
        scenario.results.finalCapital && 
        scenario.results.monthlyPension
    );
    
    // Clear existing content
    container.innerHTML = '';
    
    if (scenariosWithResults.length === 0) {
        // Show empty state
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📊</div>
                <h4>Keine Berechnungen verfügbar</h4>
                <p>Führen Sie Berechnungen für mindestens ein Szenario durch, um eine Zusammenfassung zu erhalten.</p>
            </div>
        `;
        return;
    }
    
    // Find best performing scenario (highest final capital)
    const bestScenario = scenariosWithResults.reduce((best, current) => 
        current.results.finalCapital > best.results.finalCapital ? current : best
    );
    
    // Find most balanced scenario (best risk/return ratio)
    const balancedScenario = findMostBalancedScenario(scenariosWithResults);
    
    // Create performance cards
    const cards = [];
    
    // Best performing card
    if (bestScenario) {
        cards.push(createBestPerformanceCard(bestScenario, scenariosWithResults));
    }
    
    // Most balanced card (only if different from best)
    if (balancedScenario && balancedScenario.id !== bestScenario.id) {
        cards.push(createBalancedScenarioCard(balancedScenario, scenariosWithResults));
    }
    
    // Overview/insights card for multiple scenarios
    if (scenariosWithResults.length > 1) {
        cards.push(createInsightsCard(scenariosWithResults));
    }
    
    // Add cards to container
    cards.forEach(card => container.appendChild(card));
}

// Find the most balanced scenario based on risk vs return analysis
function findMostBalancedScenario(scenarios) {
    if (scenarios.length <= 1) return scenarios[0];
    
    // Calculate balance score for each scenario
    const scoredScenarios = scenarios.map(scenario => {
        const annualReturn = parseFloat(getComparisonScenarioValue(scenario.id, 'accumulation.annualReturn') || '0');
        const inflationRate = parseFloat(getComparisonScenarioValue(scenario.id, 'accumulation.inflationRate') || '2');
        const duration = parseInt(getComparisonScenarioValue(scenario.id, 'accumulation.duration') || '25');
        const finalCapital = scenario.results.finalCapital;
        const monthlyPension = scenario.results.monthlyPension;
        
        // Calculate real return adjusted for inflation
        const realReturn = annualReturn - inflationRate;
        
        // Balance score: considers return sustainability and risk
        // Higher real return is good, but extreme values get penalized
        const returnScore = Math.min(realReturn / 8, 1); // Normalize to max 8% real return
        const stabilityScore = Math.max(0, 1 - Math.abs(annualReturn - 6) / 10); // Penalty for being too far from 6%
        const durationScore = Math.min(duration / 30, 1); // Longer duration is more balanced
        
        const balanceScore = (returnScore * 0.4 + stabilityScore * 0.4 + durationScore * 0.2);
        
        return { scenario, balanceScore, realReturn, finalCapital, monthlyPension };
    });
    
    // Return scenario with highest balance score
    return scoredScenarios.reduce((best, current) => 
        current.balanceScore > best.balanceScore ? current : best
    ).scenario;
}

// Create best performance card
function createBestPerformanceCard(scenario, allScenarios) {
    const card = document.createElement('div');
    card.className = 'performance-card winner-card';
    
    const finalCapital = scenario.results.finalCapital;
    const monthlyPension = scenario.results.monthlyPension;
    const realPurchasingPower = scenario.results.realPurchasingPower;
    const totalReturn = scenario.results.effectiveReturn;
    
    // Calculate advantage over other scenarios
    const otherScenarios = allScenarios.filter(s => s.id !== scenario.id);
    const avgCapital = otherScenarios.reduce((sum, s) => sum + s.results.finalCapital, 0) / otherScenarios.length;
    const advantage = ((finalCapital - avgCapital) / avgCapital * 100);
    
    card.innerHTML = `
        <div class="card-icon">🏆</div>
        <div class="card-content">
            <h4 class="card-title">Bestes Szenario</h4>
            <div class="card-subtitle">${scenario.name}</div>
            
            <div class="key-metrics">
                <div class="metric">
                    <span class="metric-label">Endkapital</span>
                    <span class="metric-value">${formatCurrency(finalCapital)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Monatliche Rente</span>
                    <span class="metric-value">${formatCurrency(monthlyPension)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Reale Kaufkraft</span>
                    <span class="metric-value">${formatCurrency(realPurchasingPower)}</span>
                </div>
            </div>
            
            <div class="advantage-section">
                <div class="advantage-label">Vorteil gegenüber anderen Szenarien:</div>
                <div class="advantage-value ${advantage > 0 ? 'positive' : 'neutral'}">
                    ${advantage > 0 ? '+' : ''}${advantage.toFixed(1)}% mehr Kapital
                </div>
                <div class="advantage-description">
                    Gesamtrendite: <strong>${totalReturn.toFixed(1)}%</strong>
                </div>
            </div>
        </div>
    `;
    
    return card;
}

// Create balanced scenario card
function createBalancedScenarioCard(scenario, allScenarios) {
    const card = document.createElement('div');
    card.className = 'performance-card balanced-card';
    
    const finalCapital = scenario.results.finalCapital;
    const monthlyPension = scenario.results.monthlyPension;
    const annualReturn = parseFloat(getComparisonScenarioValue(scenario.id, 'accumulation.annualReturn') || '0');
    const inflationRate = parseFloat(getComparisonScenarioValue(scenario.id, 'accumulation.inflationRate') || '2');
    const realReturn = annualReturn - inflationRate;
    
    card.innerHTML = `
        <div class="card-icon">⚖️</div>
        <div class="card-content">
            <h4 class="card-title">Ausgewogenste Option</h4>
            <div class="card-subtitle">${scenario.name}</div>
            
            <div class="key-metrics">
                <div class="metric">
                    <span class="metric-label">Endkapital</span>
                    <span class="metric-value">${formatCurrency(finalCapital)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Monatliche Rente</span>
                    <span class="metric-value">${formatCurrency(monthlyPension)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Reale Rendite</span>
                    <span class="metric-value">${realReturn.toFixed(1)}%</span>
                </div>
            </div>
            
            <div class="balance-highlights">
                <div class="highlight-item">
                    <span class="highlight-icon">🛡️</span>
                    <span class="highlight-text">Konservative Anlagestrategie</span>
                </div>
                <div class="highlight-item">
                    <span class="highlight-icon">📈</span>
                    <span class="highlight-text">Nachhaltige Renditeerwartung</span>
                </div>
                <div class="highlight-item">
                    <span class="highlight-icon">💰</span>
                    <span class="highlight-text">Solide Altersvorsorge</span>
                </div>
            </div>
        </div>
    `;
    
    return card;
}

// Create insights card for multiple scenarios
function createInsightsCard(scenarios) {
    const card = document.createElement('div');
    card.className = 'performance-card insights-card';
    
    // Calculate aggregated insights
    const capitals = scenarios.map(s => s.results.finalCapital);
    const pensions = scenarios.map(s => s.results.monthlyPension);
    const returns = scenarios.map(s => s.results.effectiveReturn);
    
    const avgCapital = capitals.reduce((a, b) => a + b, 0) / capitals.length;
    const minCapital = Math.min(...capitals);
    const maxCapital = Math.max(...capitals);
    
    const avgPension = pensions.reduce((a, b) => a + b, 0) / pensions.length;
    const minPension = Math.min(...pensions);
    const maxPension = Math.max(...pensions);
    
    const capitalRange = ((maxCapital - minCapital) / avgCapital * 100);
    
    card.innerHTML = `
        <div class="card-icon">💡</div>
        <div class="card-content">
            <h4 class="card-title">Szenario-Insights</h4>
            <div class="card-subtitle">${scenarios.length} Szenarien analysiert</div>
            
            <div class="insights-grid">
                <div class="insight-item">
                    <div class="insight-label">Durchschnittliches Endkapital</div>
                    <div class="insight-value">${formatCurrency(avgCapital)}</div>
                </div>
                <div class="insight-item">
                    <div class="insight-label">Spannweite</div>
                    <div class="insight-value">${formatCurrency(minCapital)} - ${formatCurrency(maxCapital)}</div>
                </div>
                <div class="insight-item">
                    <div class="insight-label">Durchschnittliche Rente</div>
                    <div class="insight-value">${formatCurrency(avgPension)}/Monat</div>
                </div>
                <div class="insight-item">
                    <div class="insight-label">Rentenspanne</div>
                    <div class="insight-value">${formatCurrency(minPension)} - ${formatCurrency(maxPension)}</div>
                </div>
            </div>
            
            <div class="insights-summary">
                <div class="summary-label">Variabilität:</div>
                <div class="summary-value ${capitalRange > 50 ? 'warning' : 'positive'}">
                    ${capitalRange.toFixed(1)}% Unterschied zwischen Szenarien
                </div>
                ${capitalRange > 50 ? 
                    '<div class="summary-note">⚠️ Hohe Variabilität - Szenarioauswahl kritisch</div>' :
                    '<div class="summary-note">✅ Moderate Variabilität - Robuste Planung möglich</div>'
                }
            </div>
        </div>
    `;
    
    return card;
}