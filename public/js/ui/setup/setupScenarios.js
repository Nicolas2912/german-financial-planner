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

function setupSavingsModeForScenario(scenarioId) {
  const savingsModeButtons = document.querySelectorAll(`.savings-mode-btn[data-scenario="${scenarioId}"]`);
  savingsModeButtons.forEach(button => {
    button.addEventListener('click', function() {
      const mode = this.dataset.mode;
      if (window.switchSavingsMode) window.switchSavingsMode(scenarioId, mode);
    });
  });
  const phaseToggleButtons = document.querySelectorAll(`.phase-toggle-btn[data-scenario="${scenarioId}"]`);
  phaseToggleButtons.forEach(button => {
    button.addEventListener('click', function() {
      const phase = parseInt(this.dataset.phase);
      if (window.togglePhase) window.togglePhase(scenarioId, phase);
    });
  });
  if (window.updatePhaseSummaries) window.updatePhaseSummaries(scenarioId);
  if (window.updateMultiPhaseSummary) window.updateMultiPhaseSummary(scenarioId);
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
