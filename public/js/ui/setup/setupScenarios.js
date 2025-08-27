// UI setup: Scenarios and cross-feature wiring

import * as state from '../../state.js';
import { updateMainChart, updateContributionsGainsChart } from '../mainChart.js';
import { updateWithdrawalChart, createIntegratedTimeline } from '../withdrawalChart.js';
import { 
  updateScenarioCheckboxVisibility,
  updateScenarioCheckboxes,
  updateContributionsScenarioDropdown,
  showNotification,
  updateScenarioSliderValue,
} from '../dom.js';
import { loadComparisonProfiles } from '../../features/profileManager.js';
import { addNewScenario, switchToScenario } from '../../features/scenarioManager.js';
import { calculateBudget } from './setupBudget.js';
import { calculateTaxes } from './setupTaxes.js';
import { calculateWithdrawal } from './setupWithdrawal.js';

// Scenario listeners and management
export function setupScenarioListeners() {
  setupScenarioTabs();
  setupScenarioInputListeners('A');
  initializeScenarioSliderValues('A');
  setupScenarioManagementListeners();
  // Ensure global delegation exists so dynamically added scenarios
  // have working phase toggle buttons without rebinding
  ensurePhaseToggleDelegation();
}

function setupScenarioTabs() {
  const addBtn = document.getElementById('addScenarioBtn');
  if (addBtn) addBtn.addEventListener('click', addNewScenario);
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('scenario-tab')) {
      const scenarioId = e.target.dataset.scenario;
      switchToScenario(scenarioId);
    }
  });
}

// Expose for scenarioManager.js dependency
export function setupScenarioInputListeners(scenarioId) {
  const sliders = ['annualReturn', 'inflationRate', 'salaryGrowth', 'duration', 'salaryToSavings'];
  sliders.forEach(sliderId => {
    const fullId = sliderId + '_' + scenarioId;
    const slider = document.getElementById(fullId);
    if (slider) {
      slider.addEventListener('input', function() {
        if (window.updateScenarioSliderValue) {
          window.updateScenarioSliderValue(sliderId, scenarioId);
        } else {
          updateScenarioSliderValue(sliderId, scenarioId);
        }
        if (window.debouncedRecalculateAll) window.debouncedRecalculateAll();
        setTimeout(() => {
          if (window.saveIndividualAnsparphaseScenario) window.saveIndividualAnsparphaseScenario(scenarioId);
        }, 500);
      });
    }
  });

  ['monthlySavings', 'initialCapital', 'baseSalary'].forEach(inputId => {
    const fullId = inputId + '_' + scenarioId;
    const input = document.getElementById(fullId);
    if (input) {
      let typingTimeout;
      input.addEventListener('input', function() {
        state.setUserIsTyping(true);
        if (typingTimeout) clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
          state.setUserIsTyping(false);
          if (window.saveIndividualAnsparphaseScenario) window.saveIndividualAnsparphaseScenario(scenarioId);
        }, 1000);
        if (window.debouncedRecalculateAll) window.debouncedRecalculateAll();
      });
      input.addEventListener('blur', function() {
        state.setUserIsTyping(false);
        if (typingTimeout) clearTimeout(typingTimeout);
        setTimeout(() => { if (window.autoSyncWithdrawalCapital) window.autoSyncWithdrawalCapital(true); }, 200);
      });
    }
  });

  const taxToggle = document.getElementById('taxToggle_' + scenarioId);
  if (taxToggle) {
    taxToggle.addEventListener('click', function() {
      this.classList.toggle('active');
      const isActive = this.classList.contains('active');
      if (window.updateTeilfreistellungToggleState) window.updateTeilfreistellungToggleState(scenarioId);
      if (window.updateScenarioParameter) {
        window.updateScenarioParameter(scenarioId, 'accumulation.includeTax', isActive);
        window.updateScenarioParameter(scenarioId, 'withdrawal.includeTax', isActive);
      }
      if (window.recalculateAll) window.recalculateAll();
      if (window.calculateComparisonScenarioResults) window.calculateComparisonScenarioResults(scenarioId);
      setTimeout(() => { if (window.saveIndividualAnsparphaseScenario) window.saveIndividualAnsparphaseScenario(scenarioId); }, 500);
    });
  }

  const etfTypeRadios = document.querySelectorAll(`input[name="etfType-${scenarioId}"]`);
  etfTypeRadios.forEach(radio => {
    radio.addEventListener('change', function() {
      if (window.debouncedRecalculateAll) window.debouncedRecalculateAll();
      setTimeout(() => { if (window.saveIndividualAnsparphaseScenario) window.saveIndividualAnsparphaseScenario(scenarioId); }, 500);
    });
  });

  const teilfreistellungToggle = document.getElementById('teilfreistellungToggle_' + scenarioId);
  if (teilfreistellungToggle) {
    teilfreistellungToggle.addEventListener('click', function() {
      if (!this.classList.contains('disabled')) {
        this.classList.toggle('active');
        const isActive = this.classList.contains('active');
        if (window.updateScenarioParameter) window.updateScenarioParameter(scenarioId, 'accumulation.teilfreistellung', isActive);
        if (window.recalculateAll) window.recalculateAll();
        if (window.calculateComparisonScenarioResults) window.calculateComparisonScenarioResults(scenarioId);
        setTimeout(() => { if (window.saveIndividualAnsparphaseScenario) window.saveIndividualAnsparphaseScenario(scenarioId); }, 500);
      }
    });
  }

  setTimeout(() => {
    if (window.updateTeilfreistellungToggleState) window.updateTeilfreistellungToggleState(scenarioId);
    if (window.updateScenarioParameter) {
      const taxToggle = document.getElementById('taxToggle_' + scenarioId);
      const teilToggle = document.getElementById('teilfreistellungToggle_' + scenarioId);
      if (taxToggle) {
        const isTaxActive = taxToggle.classList.contains('active');
        window.updateScenarioParameter(scenarioId, 'accumulation.includeTax', isTaxActive);
        window.updateScenarioParameter(scenarioId, 'withdrawal.includeTax', isTaxActive);
      }
      if (teilToggle) {
        const isActive = teilToggle.classList.contains('active');
        window.updateScenarioParameter(scenarioId, 'accumulation.teilfreistellung', isActive);
      }
      if (window.calculateComparisonScenarioResults) window.calculateComparisonScenarioResults(scenarioId);
    }
  }, 100);
}

export function setupComparisonScenarioListeners() {
  setupComparisonScenarioTabs();
  setupComparisonProfileSelection();
  if (window.initializeComparisonScenarioControls) {
    window.initializeComparisonScenarioControls('A');
    window.initializeComparisonScenarioControls('B');
  }
  setTimeout(() => {
    updateComparisonTeilfreistellungState('A');
    updateComparisonTeilfreistellungState('B');
    if (window.updateComparisonScenarioBudget) {
      window.updateComparisonScenarioBudget('A');
      window.updateComparisonScenarioBudget('B');
    }
    if (window.calculateComparisonScenarioResults) {
      window.calculateComparisonScenarioResults('A');
      window.calculateComparisonScenarioResults('B');
    }
    setupComparisonChartViewToggle();
    setupScenarioVisibilityControls();
    setupParameterComparisonTable();
    if (window.loadComparisonProfiles) window.loadComparisonProfiles();
    if (window.loadScenarioImports) window.loadScenarioImports();
  }, 100);
}

function setupComparisonScenarioTabs() {
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('scenario-tab') && e.target.closest('#comparisonScenarioTabs')) {
      const scenarioId = e.target.dataset.scenario;
      if (window.switchToComparisonScenario) window.switchToComparisonScenario(scenarioId);
    }
  });
}

function setupComparisonProfileSelection() {
  loadComparisonProfiles();
  document.addEventListener('change', function(e) {
    if (e.target.classList.contains('profile-selector')) {
      const scenarioId = e.target.getAttribute('data-scenario');
      const profileName = e.target.value;
      if (profileName && scenarioId && window.loadComparisonProfile) {
        window.loadComparisonProfile(profileName, scenarioId);
      }
    }
  });
}

function setupScenarioSelectorListeners() {
  const contributionsDropdown = document.getElementById('contributionsScenarioDropdown');
  if (contributionsDropdown) {
    contributionsDropdown.addEventListener('change', function() {
      state.setSelectedContributionsScenario(this.value);
      updateContributionsGainsChart();
    });
  }
}

function initializeScenarioSliderValues(scenarioId) {
  const sliders = ['annualReturn', 'inflationRate', 'salaryGrowth', 'duration', 'salaryToSavings'];
  sliders.forEach(sliderId => updateScenarioSliderValue(sliderId, scenarioId));
}

function setupScenarioManagementListeners() {
  const loadPresetBtn = document.getElementById('loadPresetBtn');
  if (loadPresetBtn) loadPresetBtn.addEventListener('click', togglePresetTemplates);
  const saveConfigBtn = document.getElementById('saveConfigBtn');
  if (saveConfigBtn && window.saveScenarioConfiguration) saveConfigBtn.addEventListener('click', window.saveScenarioConfiguration);
  const exportComparisonBtn = document.getElementById('exportComparisonBtn');
  if (exportComparisonBtn && window.exportComparisonData) exportComparisonBtn.addEventListener('click', window.exportComparisonData);
  document.addEventListener('click', function(e) {
    if (e.target.closest('.preset-btn')) {
      const presetBtn = e.target.closest('.preset-btn');
      const presetType = presetBtn.dataset.preset;
      if (window.loadPresetTemplate) window.loadPresetTemplate(presetType);
    }
  });
}

function togglePresetTemplates() {
  const container = document.getElementById('presetTemplates');
  if (container) container.classList.toggle('open');
}

export function setupChartToggleListeners() {
  const scenarioComparisonBtn = document.getElementById('scenarioComparisonBtn');
  const contributionsGainsBtn = document.getElementById('contributionsGainsBtn');
  if (scenarioComparisonBtn) {
    scenarioComparisonBtn.addEventListener('click', function() {
      scenarioComparisonBtn.classList.add('active');
      contributionsGainsBtn && contributionsGainsBtn.classList.remove('active');
      state.setCurrentChartMode('comparison');
      updateMainChart();
      updateScenarioCheckboxVisibility();
    });
  }
  if (contributionsGainsBtn) {
    contributionsGainsBtn.addEventListener('click', function() {
      contributionsGainsBtn.classList.add('active');
      scenarioComparisonBtn && scenarioComparisonBtn.classList.remove('active');
      state.setCurrentChartMode('contributions');
      updateContributionsGainsChart();
      updateScenarioCheckboxVisibility();
    });
  }
  setupScenarioSelectorListeners();

  const withdrawalChartBtn = document.getElementById('withdrawalChartBtn');
  const integratedTimelineBtn = document.getElementById('integratedTimelineBtn');
  const withdrawalChartView = document.getElementById('withdrawalChartView');
  const integratedTimelineView = document.getElementById('integratedTimelineView');
  if (withdrawalChartBtn) {
    withdrawalChartBtn.addEventListener('click', function() {
      withdrawalChartBtn.classList.add('active');
      integratedTimelineBtn && integratedTimelineBtn.classList.remove('active');
      if (withdrawalChartView) withdrawalChartView.style.display = 'block';
      if (integratedTimelineView) integratedTimelineView.style.display = 'none';
      const withdrawalData = state.withdrawalData;
      if (withdrawalData?.yearlyData?.length) updateWithdrawalChart(withdrawalData.yearlyData);
    });
  }
  if (integratedTimelineBtn) {
    integratedTimelineBtn.addEventListener('click', function() {
      integratedTimelineBtn.classList.add('active');
      withdrawalChartBtn && withdrawalChartBtn.classList.remove('active');
      if (integratedTimelineView) integratedTimelineView.style.display = 'block';
      if (withdrawalChartView) withdrawalChartView.style.display = 'none';
      createIntegratedTimeline();
    });
  }
}

export function setupPhaseToggle() {
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
  allSections.forEach(section => { if (section) section.style.display = 'none'; });
  if (accumulationSection) accumulationSection.style.display = 'grid';
  if (accumulationChart) accumulationChart.style.display = 'block';

  function setActivePhase(activeBtn) {
    [budgetBtn, taxCalculatorBtn, accumulationBtn, withdrawalBtn, scenarioComparisonBtn].forEach(btn => btn && btn.classList.remove('active'));
    if (activeBtn) activeBtn.classList.add('active');
  }
  function showSingleSection(sectionToShow) {
    allSections.forEach(section => { if (section) section.style.display = 'none'; });
    if (sectionToShow) sectionToShow.style.display = 'block';
  }
  function showAccumulationSections() {
    allSections.forEach(section => { if (section) section.style.display = 'none'; });
    if (accumulationSection) accumulationSection.style.display = 'grid';
    if (accumulationChart) accumulationChart.style.display = 'block';
  }

  if (budgetBtn) budgetBtn.addEventListener('click', function() {
    state.setCurrentPhase('budget');
    setActivePhase(budgetBtn);
    showSingleSection(budgetSection);
    calculateBudget();
    updateScenarioCheckboxVisibility();
    if (window.resetStickyScenarioCards) window.resetStickyScenarioCards();
  });
  if (taxCalculatorBtn) taxCalculatorBtn.addEventListener('click', function() {
    state.setCurrentPhase('taxCalculator');
    setActivePhase(taxCalculatorBtn);
    showSingleSection(taxCalculatorSection);
    calculateTaxes();
    updateScenarioCheckboxVisibility();
    if (window.resetStickyScenarioCards) window.resetStickyScenarioCards();
  });
  if (accumulationBtn) accumulationBtn.addEventListener('click', function() {
    state.setCurrentPhase('accumulation');
    setActivePhase(accumulationBtn);
    showAccumulationSections();
    updateScenarioCheckboxVisibility();
    if (window.resetStickyScenarioCards) window.resetStickyScenarioCards();
  });
  if (withdrawalBtn) withdrawalBtn.addEventListener('click', function() {
    state.setCurrentPhase('withdrawal');
    setActivePhase(withdrawalBtn);
    showSingleSection(withdrawalSection);
    calculateWithdrawal();
    setTimeout(() => {
      const activeChartBtn = document.querySelector('#withdrawalChartBtn.active, #integratedTimelineBtn.active');
      if (activeChartBtn && activeChartBtn.id === 'integratedTimelineBtn') {
        createIntegratedTimeline();
      } else {
        const withdrawalData = state.withdrawalData;
        if (withdrawalData?.yearlyData?.length) updateWithdrawalChart(withdrawalData.yearlyData);
      }
    }, 100);
    updateScenarioCheckboxVisibility();
    if (window.resetStickyScenarioCards) window.resetStickyScenarioCards();
  });
  if (scenarioComparisonBtn) scenarioComparisonBtn.addEventListener('click', function() {
    state.setCurrentPhase('scenarioComparison');
    setActivePhase(scenarioComparisonBtn);
    showSingleSection(scenarioComparisonSection);
    if (window.recalculateAll) window.recalculateAll();
    loadComparisonProfiles();
    updateScenarioCheckboxVisibility();
    if (window.resetStickyScenarioCards) window.resetStickyScenarioCards();
    setTimeout(() => {
      if (window.scrollY > 0) { window.scrollBy(0, 1); window.scrollBy(0, -1); }
    }, 100);
  });
}

export function setupGermanNumberInputs() {
  const numberInputs = document.querySelectorAll('input[type="number"], input[type="text"]');
  numberInputs.forEach(input => {
    if (['profileName', 'profileDescription', 'ansparphaseScenarioName', 'ansparphaseScenarioDescription', 'entnahmephaseScenarioName', 'entnahmephaseScenarioDescription'].includes(input.id)) return;
    input.addEventListener('blur', function() {
      // keep display formatting simple: leave as-is but normalize comma
      const v = this.value;
      if (v !== '') this.value = v.toString().replace('.', ',');
    });
    input.addEventListener('keypress', function(e) {
      if (e.key === ',' && this.value.includes(',')) e.preventDefault();
    });
    input.addEventListener('input', function() {
      const cursorPos = this.selectionStart;
      if (this.closest('.budget-section')) {
        calculateBudget();
      } else if (this.closest('.controls-section')) {
        if (window.recalculateAll) window.recalculateAll();
      } else if (this.closest('.withdrawal-section')) {
        calculateWithdrawal();
      }
      this.setSelectionRange(cursorPos, cursorPos);
    });
  });
}

export function setupSavingsModeFunctionality() {
  state.scenarios.forEach(scenario => {
    setupSavingsModeForScenario(scenario.id);
  });
  ensurePhaseToggleDelegation();
}

// Use a single delegated click handler for phase toggle buttons to
// guarantee functionality across dynamically added scenarios.
let phaseToggleDelegationBound = false;
function ensurePhaseToggleDelegation() {
  if (phaseToggleDelegationBound) return;
  phaseToggleDelegationBound = true;
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.phase-toggle-btn');
    if (!btn) return;
    const scenarioId = btn.getAttribute('data-scenario');
    const phase = parseInt(btn.getAttribute('data-phase'));
    if (!scenarioId || !phase) return;
    try {
      togglePhase(scenarioId, phase);
    } catch (_) {}
  }, true);
}

export function setupStickyScenarioCards() {
  const scenarioResults = document.getElementById('scenarioResults');
  if (!scenarioResults) return;
  function resetStickyState() {
    scenarioResults.style.transform = '';
    scenarioResults.style.position = '';
    scenarioResults.style.top = '';
    scenarioResults.style.left = '';
    scenarioResults.style.width = '';
    scenarioResults.style.maxWidth = '';
    scenarioResults.style.zIndex = '';
    scenarioResults.classList.remove('sticky-active', 'sticky');
  }
  resetStickyState();
  window.resetStickyScenarioCards = function() { resetStickyState(); };
}

export function setupSavingsModeForScenario(scenarioId) {
  const savingsModeButtons = document.querySelectorAll(`.savings-mode-btn[data-scenario="${scenarioId}"]`);
  savingsModeButtons.forEach(button => {
    button.addEventListener('click', function() {
      const mode = this.dataset.mode;
      switchSavingsMode(scenarioId, mode);
    });
  });
  const phaseToggleButtons = document.querySelectorAll(`.phase-toggle-btn[data-scenario="${scenarioId}"]`);
  phaseToggleButtons.forEach(button => {
    button.addEventListener('click', function() {
      const phase = parseInt(this.dataset.phase);
      togglePhase(scenarioId, phase);
    });
  });

  // Add event listeners for input changes to update summaries
  const phaseInputs = document.querySelectorAll(`
    .phase-start-year[data-scenario="${scenarioId}"],
    .phase-end-year[data-scenario="${scenarioId}"],
    .phase-savings-rate[data-scenario="${scenarioId}"],
    .phase-return-rate[data-scenario="${scenarioId}"]
  `);
  
  phaseInputs.forEach(input => {
    ['input', 'change', 'blur'].forEach(eventType => {
      input.addEventListener(eventType, function(e) {
        // Normalize Rendite input on blur so it never clears due to invalid number formats
        if (eventType === 'blur' && this.classList.contains('phase-return-rate')) {
          const raw = (this.value || '').toString().trim();
          if (raw !== '') {
            // Accept both comma and dot, display with comma for de-DE
            const normalized = raw.replace(/\s+/g, '').replace(',', '.');
            const num = parseFloat(normalized);
            if (!isNaN(num)) {
              this.value = num.toString().replace('.', ',');
            }
          }
        }

        // If user changed an end year, keep next phase's start in sync
        if (this.classList.contains('phase-end-year')) {
          const phase = parseInt(this.getAttribute('data-phase'));
          syncNextPhaseStart(scenarioId, phase);
        }

        updatePhaseSummaries(scenarioId);
        updateMultiPhaseSummary(scenarioId);
        
        // Trigger recalculation if needed
        if (window.recalculateAll) {
          clearTimeout(window.phaseUpdateTimeout);
          window.phaseUpdateTimeout = setTimeout(() => {
            window.recalculateAll();
          }, 300);
        }
      });
    });
  });
  
  // Initial update
  updatePhaseSummaries(scenarioId);
  updateMultiPhaseSummary(scenarioId);
}

// Keep next phase's start year exactly one year after current phase's end year
function syncNextPhaseStart(scenarioId, currentPhase) {
  const nextPhase = currentPhase + 1;
  if (nextPhase > 3) return;
  const currentEndEl = document.querySelector(`.phase-end-year[data-phase="${currentPhase}"][data-scenario="${scenarioId}"]`);
  const nextStartEl = document.querySelector(`.phase-start-year[data-phase="${nextPhase}"][data-scenario="${scenarioId}"]`);
  const nextPhaseElement = document.querySelector(`.savings-phase[data-phase="${nextPhase}"][data-scenario="${scenarioId}"]`);
  if (!currentEndEl || !nextStartEl || !nextPhaseElement) return;
  if (!nextPhaseElement.classList.contains('active')) return; // only adjust if next phase is active

  const currentEnd = parseInt(currentEndEl.value) || 0;
  const desiredStart = currentEnd + 1;

  // Only update if different to avoid unnecessary event noise
  if ((parseInt(nextStartEl.value) || 0) !== desiredStart) {
    nextStartEl.value = desiredStart;
    // Also adjust the min of next end-year to be at least start
    const nextEndEl = document.querySelector(`.phase-end-year[data-phase="${nextPhase}"][data-scenario="${scenarioId}"]`);
    if (nextEndEl) {
      const start = desiredStart;
      const minEnd = Math.max(start, parseInt(nextEndEl.getAttribute('min') || '0'));
      nextEndEl.setAttribute('min', String(minEnd));
      // If current nextEnd is before new start, snap it to start
      if ((parseInt(nextEndEl.value) || 0) < start) {
        nextEndEl.value = start;
      }
    }
  }
}

// Implement the switchSavingsMode function
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
  }

  // Recalculate after mode change
  if (window.recalculateAll) {
    window.recalculateAll();
  }
}

// Implement the togglePhase function
function togglePhase(scenarioId, phase) {
  const phaseElement = document.querySelector(`.savings-phase[data-phase="${phase}"][data-scenario="${scenarioId}"]`);
  if (!phaseElement) return;

  const phaseContent = phaseElement.querySelector('.phase-content');
  const toggleBtn = phaseElement.querySelector('.phase-toggle-btn');
  const toggleText = toggleBtn?.querySelector('.toggle-text');
  const statusIndicator = phaseElement.querySelector('.phase-status-indicator');

  if (phaseElement.classList.contains('active')) {
    // Disable phase (phase 1 cannot be disabled)
    if (phase > 1) {
      phaseElement.classList.remove('active');
      if (phaseContent) phaseContent.style.display = 'none';
      if (toggleText) toggleText.textContent = 'Aktivieren';
      if (statusIndicator) statusIndicator.classList.remove('active');
    }
  } else {
    // Enable phase
    phaseElement.classList.add('active');
    if (phaseContent) phaseContent.style.display = 'block';
    if (toggleText) toggleText.textContent = 'Deaktivieren';
    if (statusIndicator) statusIndicator.classList.add('active');

    // When enabling phase 2 or 3, align its start with previous phase end + 1
    if (phase > 1) {
      const prevEndEl = document.querySelector(`.phase-end-year[data-phase="${phase-1}"][data-scenario="${scenarioId}"]`);
      const thisStartEl = document.querySelector(`.phase-start-year[data-phase="${phase}"][data-scenario="${scenarioId}"]`);
      if (prevEndEl && thisStartEl) {
        const desiredStart = (parseInt(prevEndEl.value) || 0) + 1;
        const currentStart = parseInt(thisStartEl.value) || 0;
        if (currentStart !== desiredStart) {
          thisStartEl.value = desiredStart;
        }
        // Ensure end-year min respects new start
        const thisEndEl = document.querySelector(`.phase-end-year[data-phase="${phase}"][data-scenario="${scenarioId}"]`);
        if (thisEndEl) {
          thisEndEl.setAttribute('min', String(desiredStart));
          if ((parseInt(thisEndEl.value) || 0) < desiredStart) {
            thisEndEl.value = desiredStart;
          }
        }
      }
    }
  }

  updateMultiPhaseSummary(scenarioId);
  updatePhaseSummaries(scenarioId);
  if (window.recalculateAll) {
    window.recalculateAll();
  }
}

// Implement functions for phase summaries
function updatePhaseSummaries(scenarioId) {
  // Update individual phase summaries
  for (let phase = 1; phase <= 3; phase++) {
    const phaseElement = document.querySelector(`.savings-phase[data-phase="${phase}"][data-scenario="${scenarioId}"]`);
    if (!phaseElement || !phaseElement.classList.contains('active')) continue;

    const startYear = parseInt(document.querySelector(`.phase-start-year[data-phase="${phase}"][data-scenario="${scenarioId}"]`)?.value) || 0;
    const endYear = parseInt(document.querySelector(`.phase-end-year[data-phase="${phase}"][data-scenario="${scenarioId}"]`)?.value) || 0;
    const savingsRate = parseFloat(document.querySelector(`.phase-savings-rate[data-phase="${phase}"][data-scenario="${scenarioId}"]`)?.value?.replace(/[^\d,-]/g, '').replace(',', '.')) || 0;
    const returnPct = parseFloat((document.querySelector(`.phase-return-rate[data-phase="${phase}"][data-scenario="${scenarioId}"]`)?.value || '').toString().replace(',', '.')) || 0;
    
    const duration = endYear - startYear + 1;
    const months = Math.max(0, duration * 12);
    const r = (returnPct / 100) / 12;
    // Future value of monthly contributions at monthly rate r over n months
    const totalWithReturns = r > 0 ? (savingsRate * ((Math.pow(1 + r, months) - 1) / r)) : (savingsRate * months);

    // Update phase summary display
    const phaseSummary = phaseElement.querySelector('.phase-summary');
    if (phaseSummary) {
      const durationSpan = phaseSummary.querySelector('.phase-duration');
      const totalSpan = phaseSummary.querySelector('.phase-total');
      
      if (durationSpan) durationSpan.textContent = `Dauer: ${duration} Jahre`;
      if (totalSpan) totalSpan.textContent = `Gesamt: €${Math.round(totalWithReturns).toLocaleString('de-DE')}`;
    }
  }
}

function updateMultiPhaseSummary(scenarioId) {
  // Count active phases and calculate totals
  let activePhases = 0;
  let totalDuration = 0;
  let totalContributions = 0;
  let weightedSavingsSum = 0;
  let totalMonths = 0;

  for (let phase = 1; phase <= 3; phase++) {
    const phaseElement = document.querySelector(`.savings-phase[data-phase="${phase}"][data-scenario="${scenarioId}"]`);
    if (!phaseElement || !phaseElement.classList.contains('active')) continue;

    activePhases++;
    
    const startYear = parseInt(document.querySelector(`.phase-start-year[data-phase="${phase}"][data-scenario="${scenarioId}"]`)?.value) || 0;
    const endYear = parseInt(document.querySelector(`.phase-end-year[data-phase="${phase}"][data-scenario="${scenarioId}"]`)?.value) || 0;
    const savingsRate = parseFloat(document.querySelector(`.phase-savings-rate[data-phase="${phase}"][data-scenario="${scenarioId}"]`)?.value?.replace(/[^\d,-]/g, '').replace(',', '.')) || 0;
    
    const phaseDuration = endYear - startYear + 1;
    const phaseMonths = phaseDuration * 12;
    
    totalDuration = Math.max(totalDuration, endYear);
    totalContributions += phaseMonths * savingsRate;
    weightedSavingsSum += phaseMonths * savingsRate;
    totalMonths += phaseMonths;
  }

  const averageSavingsRate = totalMonths > 0 ? weightedSavingsSum / totalMonths : 0;

  // Update summary display
  const activePhasesElement = document.getElementById(`activePhasesCount_${scenarioId}`);
  const totalDurationElement = document.getElementById(`totalDuration_${scenarioId}`);
  const averageSavingsElement = document.getElementById(`averageSavingsRate_${scenarioId}`);
  const totalContributionsElement = document.getElementById(`totalContributions_${scenarioId}`);

  if (activePhasesElement) activePhasesElement.textContent = activePhases.toString();
  if (totalDurationElement) totalDurationElement.textContent = `${totalDuration} Jahre`;
  if (averageSavingsElement) averageSavingsElement.textContent = `€${Math.round(averageSavingsRate).toLocaleString('de-DE')}`;
  if (totalContributionsElement) totalContributionsElement.textContent = `€${Math.round(totalContributions).toLocaleString('de-DE')}`;
}

// Export functions to window object for backward compatibility
if (typeof window !== 'undefined') {
  // make the full-featured per-scenario setup available globally so
  // scenarioManager can call it when creating new scenarios
  window.setupSavingsModeForScenario = setupSavingsModeForScenario;
  window.switchSavingsMode = switchSavingsMode;
  window.togglePhase = togglePhase;
  window.updatePhaseSummaries = updatePhaseSummaries;
  window.updateMultiPhaseSummary = updateMultiPhaseSummary;
}

function setupComparisonChartViewToggle() {
  const chartViewButtons = document.querySelectorAll('.chart-view-btn');
  const chartViews = document.querySelectorAll('.comparison-chart-view');
  chartViewButtons.forEach(button => {
    button.addEventListener('click', function() {
      const viewType = this.dataset.view;
      chartViewButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      chartViews.forEach(view => { view.style.display = view.id === `${viewType}ChartView` ? 'block' : 'none'; });
      if (window.updateMainChart) window.updateMainChart();
    });
  });
}

function setupScenarioVisibilityControls() {
  updateScenarioVisibilityControls();
}

function updateScenarioVisibilityControls() {
  const controlsContainer = document.getElementById('scenarioVisibilityControls');
  if (!controlsContainer) return;
  controlsContainer.innerHTML = '';
  state.scenarios.forEach(scenario => {
    const control = document.createElement('div');
    control.className = 'visibility-control';
    control.innerHTML = `
      <label>
        <input type="checkbox" checked data-scenario="${scenario.id}">
        <span>${scenario.name}</span>
      </label>
    `;
    controlsContainer.appendChild(control);
  });
  controlsContainer.addEventListener('change', function(e) {
    if (e.target.type === 'checkbox' && window.toggleScenarioVisibility) {
      const scenarioId = e.target.dataset.scenario;
      const isVisible = e.target.checked;
      window.toggleScenarioVisibility(scenarioId, isVisible);
    }
  });
}

function setupParameterComparisonTable() {
  const tableControls = document.querySelectorAll('.table-control-btn');
  tableControls.forEach(btn => {
    btn.addEventListener('click', function() {
      tableControls.forEach(control => control.classList.remove('active'));
      this.classList.add('active');
      const viewType = this.dataset.view;
      if (window.updateParameterTable) window.updateParameterTable(viewType);
    });
  });
}

export function setupScenarioImport() {
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('scenario-import-btn')) {
      const scenarioId = e.target.getAttribute('data-scenario');
      if (scenarioId && window.handleScenarioImport) window.handleScenarioImport(scenarioId);
    }
    if (e.target.classList.contains('scenario-refresh-btn')) {
      if (window.loadScenarioImports) window.loadScenarioImports();
      const scenarioId = e.target.getAttribute('data-scenario');
      if (scenarioId && window.showScenarioImportStatusForScenario) {
        window.showScenarioImportStatusForScenario(scenarioId, 'info', 'Verfügbare Szenarien wurden neu geladen.');
      }
    }
    if (e.target.classList.contains('delete-scenario-import-btn')) {
      const storageKey = e.target.dataset.storageKey;
      if (window.deleteAnsparphaseScenarioSet) window.deleteAnsparphaseScenarioSet(storageKey);
    }
  });
  setTimeout(() => { if (window.loadScenarioImports) window.loadScenarioImports(); }, 100);
}

export function setupAutoSaveScenarios() {
  const phaseButtons = document.querySelectorAll('.phase-button');
  phaseButtons.forEach(button => {
    if (button.id !== 'accumulationPhase') {
      button.addEventListener('click', () => {
        setTimeout(() => { if (window.autoSaveAnsparphaseScenarios) window.autoSaveAnsparphaseScenarios(); }, 100);
      });
    }
  });
  window.addEventListener('beforeunload', () => { if (window.autoSaveAnsparphaseScenarios) window.autoSaveAnsparphaseScenarios(); });
}

export function setupAnsparphaseScenarioListeners() {
  // Keep as thin wrappers delegating to window.* utilities where present
  // This preserves existing UX while removing the old monolith dependency
  if (window.setupAnsparphaseScenarioListeners) window.setupAnsparphaseScenarioListeners();
}

export function setupEntnahmephaseScenarioListeners() {
  if (window.setupEntnahmephaseScenarioListeners) window.setupEntnahmephaseScenarioListeners();
}

function updateComparisonTeilfreistellungState(scenarioId) {
  const toggle = document.querySelector(`[data-param="accumulation.teilfreistellung"][data-scenario="${scenarioId}"]`);
  if (toggle) {
    const isActive = toggle.classList.contains('active');
    const helpElement = document.querySelector(`#teilfreistellungHelp_${scenarioId}`);
    if (helpElement) helpElement.style.display = isActive ? 'block' : 'none';
  }
}
