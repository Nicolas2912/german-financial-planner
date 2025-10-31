// UI setup: Budget module
// Contains budget calculation wrapper and related UI listeners/utilities

import { parseGermanNumber, formatGermanNumber, formatCurrency } from '../../utils.js';
import * as state from '../../state.js';
import { calculateBudget as calculateBudgetCore } from '../../core/budget.js';
import { updateBudgetPieChart } from '../budgetChart.js';
import { showNotification } from '../dom.js';

// Wrapper for budget calculation that collects DOM data and updates UI
export function calculateBudget() {
  const incomePeriod = document.querySelector('#incomePeriodToggle .period-option.active')?.dataset.period || 'monthly';
  const fixedPeriod = document.querySelector('#fixedPeriodToggle .period-option.active')?.dataset.period || 'monthly';
  const variablePeriod = document.querySelector('#variablePeriodToggle .period-option.active')?.dataset.period || 'monthly';

  const inputData = {
    income: {
      salary: document.getElementById('salary')?.value || '0',
      sideIncome: document.getElementById('sideIncome')?.value || '0',
      otherIncome: document.getElementById('otherIncome')?.value || '0'
    },
    expenses: {
      rent: document.getElementById('rent')?.value || '0',
      utilities: document.getElementById('utilities')?.value || '0',
      insurance: document.getElementById('insurance')?.value || '0',
      internet: document.getElementById('internet')?.value || '0',
      gez: document.getElementById('gez')?.value || '0',
      food: document.getElementById('food')?.value || '0',
      transport: document.getElementById('transport')?.value || '0',
      leisure: document.getElementById('leisure')?.value || '0',
      clothing: document.getElementById('clothing')?.value || '0',
      subscriptions: document.getElementById('subscriptions')?.value || '0',
      miscellaneous: document.getElementById('miscellaneous')?.value || '0'
    },
    periods: {
      income: incomePeriod,
      fixed: fixedPeriod,
      variable: variablePeriod
    }
  };

  try {
    const results = calculateBudgetCore(inputData);

    if (document.getElementById('incomeTotal')) {
      document.getElementById('incomeTotal').textContent = formatCurrency(results.totalIncome);
    }
    if (document.getElementById('fixedTotal')) {
      document.getElementById('fixedTotal').textContent = formatCurrency(results.fixedTotal);
    }
    if (document.getElementById('variableTotal')) {
      document.getElementById('variableTotal').textContent = formatCurrency(results.variableTotal);
    }
    if (document.getElementById('totalIncome')) {
      document.getElementById('totalIncome').textContent = formatCurrency(results.totalIncome);
    }
    if (document.getElementById('totalExpenses')) {
      document.getElementById('totalExpenses').textContent = formatCurrency(results.totalExpenses);
    }
    if (document.getElementById('remainingBudget')) {
      document.getElementById('remainingBudget').textContent = formatCurrency(results.remainingBudget);
    }

    const remainingDisplay = document.querySelector('.remaining-display');
    if (remainingDisplay) {
      if (results.remainingBudget < 0) {
        remainingDisplay.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
      } else if (results.remainingBudget < 200) {
        remainingDisplay.style.background = 'linear-gradient(135deg, #f39c12, #e67e22)';
      } else {
        remainingDisplay.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';
      }
    }

    updateBudgetPieChart(results.monthlyFixedExpenses, results.monthlyVariableExpenses, results.remainingBudget);

    if (!window.budgetData) window.budgetData = {};
    window.budgetData.totalIncome = results.totalIncome;
    window.budgetData.totalExpenses = results.totalExpenses;
    window.budgetData.remainingBudget = results.remainingBudget;

    updateSavingsDisplay();

    state.setBudgetData({
      totalIncome: results.totalIncome,
      totalExpenses: results.totalExpenses,
      remainingBudget: results.remainingBudget,
      results: results
    });
  } catch (error) {
    console.error('Error calculating budget:', error);
  }
}

// Update savings display
export function updateSavingsDisplay() {
  const budgetData = state.budgetData || {};
  const savingsAmountInput = document.getElementById('savingsAmount');
  const savingsPercentageInput = document.getElementById('savingsPercentage');
  const finalSavingsAmountEl = document.getElementById('finalSavingsAmount');

  if (!savingsAmountInput || !finalSavingsAmountEl) return;

  let finalSavingsAmount = 0;
  const savingsMode = document.querySelector('.allocation-option.active')?.id || 'fixedAmount';

  if (savingsMode === 'fixedAmount') {
    finalSavingsAmount = parseGermanNumber(savingsAmountInput.value) || 0;
  } else {
    const percentage = parseFloat(savingsPercentageInput?.value || '50');
    finalSavingsAmount = (budgetData.remainingBudget || 0) * (percentage / 100);
  }

  finalSavingsAmount = Math.min(finalSavingsAmount, budgetData.remainingBudget || 0);
  finalSavingsAmount = Math.max(0, finalSavingsAmount);

  finalSavingsAmountEl.textContent = formatCurrency(finalSavingsAmount);

  const savingsResult = document.querySelector('.savings-result');
  if (savingsResult) {
    if (finalSavingsAmount > (budgetData.remainingBudget || 0)) {
      savingsResult.style.background = '#e74c3c';
    } else if (finalSavingsAmount === 0) {
      savingsResult.style.background = '#95a5a6';
    } else {
      savingsResult.style.background = '#27ae60';
    }
  }

  if (!window.budgetData) window.budgetData = {};
  window.budgetData.finalSavingsAmount = finalSavingsAmount;
}

function updatePeriod(category, period) {
  if (!window.budgetData) window.budgetData = { periods: {} };
  if (!window.budgetData.periods) window.budgetData.periods = {};
  window.budgetData.periods[category] = period;
  calculateBudget();
}

function setupPeriodToggle(toggleId, category) {
  const toggle = document.getElementById(toggleId);
  if (!toggle) return;
  const buttons = toggle.querySelectorAll('.period-option');
  buttons.forEach(button => {
    button.addEventListener('click', function() {
      buttons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      const period = this.dataset.period;
      updatePeriod(category, period);
    });
  });
}

function setSavingsMode(mode) {
  if (!window.budgetData) {
    window.budgetData = { savings: { mode: 'fixed', amount: 500, percentage: 50 } };
  }
  window.budgetData.savings.mode = mode;

  const fixedAmountControl = document.getElementById('fixedAmountControl');
  const percentageControl = document.getElementById('percentageControl');
  const fixedBtn = document.getElementById('fixedAmount');
  const percentageBtn = document.getElementById('percentage');

  if (mode === 'fixed') {
    if (fixedAmountControl) fixedAmountControl.style.display = 'block';
    if (percentageControl) percentageControl.style.display = 'none';
    if (fixedBtn) fixedBtn.classList.add('active');
    if (percentageBtn) percentageBtn.classList.remove('active');
  } else {
    if (fixedAmountControl) fixedAmountControl.style.display = 'none';
    if (percentageControl) percentageControl.style.display = 'block';
    if (fixedBtn) fixedBtn.classList.remove('active');
    if (percentageBtn) percentageBtn.classList.add('active');
  }

  updateSavingsDisplay();
}

function resetBudget() {
  if (confirm('🔄 Möchten Sie wirklich alle Budget-Einstellungen zurücksetzen?')) {
    document.getElementById('salary').value = '3000';
    document.getElementById('sideIncome').value = '0';
    document.getElementById('otherIncome').value = '0';

    const expenseDefaults = {
      rent: '800', utilities: '150', insurance: '80',
      internet: '30', gez: '18', food: '300', transport: '100',
      leisure: '200', clothing: '50', subscriptions: '30', miscellaneous: '100'
    };
    Object.entries(expenseDefaults).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.value = value;
    });

    document.getElementById('savingsAmount').value = '500';
    document.getElementById('savingsPercentage').value = '50';
    const percentageValueElement = document.getElementById('savingsPercentageValue');
    if (percentageValueElement) percentageValueElement.textContent = '50%';

    setSavingsMode('fixed');

    document.querySelectorAll('.period-option').forEach(btn => btn.classList.remove('active'));
    ['incomePeriodToggle', 'fixedPeriodToggle', 'variablePeriodToggle'].forEach(toggleId => {
      const toggle = document.getElementById(toggleId);
      if (toggle) {
        const monthlyBtn = toggle.querySelector('[data-period="monthly"]');
        if (monthlyBtn) monthlyBtn.classList.add('active');
      }
    });

    window.budgetData = {
      totalIncome: 0,
      totalExpenses: 0,
      remainingBudget: 0,
      savings: { mode: 'fixed', amount: 500, percentage: 50 },
      finalSavingsAmount: 500,
      periods: { income: 'monthly', fixed: 'monthly', variable: 'monthly' }
    };

    calculateBudget();
    showNotification('🔄 Budget zurückgesetzt', 'Alle Budget-Einstellungen wurden auf Standardwerte zurückgesetzt.', 'success');
  }
}

export function setupBudgetListeners() {
  const pm = window.profileManager || {};
  const saveProfileBtn = document.getElementById('saveProfile');
  if (saveProfileBtn && pm.openSaveProfileModal) saveProfileBtn.addEventListener('click', pm.openSaveProfileModal);

  const manageProfilesBtn = document.getElementById('manageProfiles');
  if (manageProfilesBtn && pm.openProfileManager) manageProfilesBtn.addEventListener('click', pm.openProfileManager);

  const resetBudgetBtn = document.getElementById('resetBudget');
  if (resetBudgetBtn) resetBudgetBtn.addEventListener('click', resetBudget);

  const closeSaveProfileModalBtn = document.getElementById('closeSaveProfileModal');
  if (closeSaveProfileModalBtn && pm.closeSaveProfileModal) closeSaveProfileModalBtn.addEventListener('click', pm.closeSaveProfileModal);

  const cancelSaveProfileBtn = document.getElementById('cancelSaveProfile');
  if (cancelSaveProfileBtn && pm.closeSaveProfileModal) cancelSaveProfileBtn.addEventListener('click', pm.closeSaveProfileModal);

  const confirmSaveProfileBtn = document.getElementById('confirmSaveProfile');
  if (confirmSaveProfileBtn && pm.confirmSaveProfile) confirmSaveProfileBtn.addEventListener('click', pm.confirmSaveProfile);

  const closeProfileModalBtn = document.getElementById('closeProfileModal');
  if (closeProfileModalBtn && pm.closeProfileManager) closeProfileModalBtn.addEventListener('click', pm.closeProfileManager);

  const profileNameInput = document.getElementById('profileName');
  if (profileNameInput && pm.updateProfilePreview) profileNameInput.addEventListener('input', pm.updateProfilePreview);

  const profileDescriptionInput = document.getElementById('profileDescription');
  if (profileDescriptionInput && pm.updateProfilePreview) profileDescriptionInput.addEventListener('input', pm.updateProfilePreview);

  window.addEventListener('click', function(event) {
    const saveModal = document.getElementById('saveProfileModal');
    const manageModal = document.getElementById('profileModal');
    if (event.target === saveModal && pm.closeSaveProfileModal) pm.closeSaveProfileModal();
    if (event.target === manageModal && pm.closeProfileManager) pm.closeProfileManager();
  });

  const incomeInputs = ['salary', 'sideIncome', 'otherIncome'];
  incomeInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', calculateBudget);
  });

  const expenseInputs = ['rent', 'utilities', 'insurance', 'internet', 'gez', 'food', 'transport', 'leisure', 'clothing', 'subscriptions', 'miscellaneous'];
  expenseInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', calculateBudget);
  });

  setupPeriodToggle('incomePeriodToggle', 'income');
  setupPeriodToggle('fixedPeriodToggle', 'fixed');
  setupPeriodToggle('variablePeriodToggle', 'variable');

  const fixedAmountBtn = document.getElementById('fixedAmount');
  if (fixedAmountBtn) fixedAmountBtn.addEventListener('click', () => setSavingsMode('fixed'));
  const percentageBtn = document.getElementById('percentage');
  if (percentageBtn) percentageBtn.addEventListener('click', () => setSavingsMode('percentage'));

  const savingsAmountEl = document.getElementById('savingsAmount');
  if (savingsAmountEl) savingsAmountEl.addEventListener('input', function() {
    if (!window.budgetData) window.budgetData = { savings: { amount: 0 } };
    window.budgetData.savings.amount = parseGermanNumber(this.value);
    updateSavingsDisplay();
  });

  const savingsPercentageEl = document.getElementById('savingsPercentage');
  if (savingsPercentageEl) savingsPercentageEl.addEventListener('input', function() {
    const percentage = parseFloat(this.value);
    if (!window.budgetData) window.budgetData = { savings: {} };
    if (!window.budgetData.savings) window.budgetData.savings = {};
    window.budgetData.savings.percentage = percentage;
    const valueEl = document.getElementById('savingsPercentageValue');
    if (valueEl) valueEl.textContent = percentage + '%';
    updateSavingsDisplay();
  });

  const applyBtn = document.getElementById('applySavingsRate');
  if (applyBtn) applyBtn.addEventListener('click', function() {
    const savingsText = document.getElementById('finalSavingsAmount').textContent.replace('€', '').trim();
    const savingsAmount = parseGermanNumber(savingsText);
    const scenarioId = state.activeScenario || 'A';
    const input = document.getElementById(`monthlySavings_${scenarioId}`);
    if (input) input.value = formatGermanNumber(savingsAmount, 0).replace(',00', '');
    const accumulationPhaseBtn = document.getElementById('accumulationPhase');
    if (accumulationPhaseBtn) accumulationPhaseBtn.click();
    if (window.recalculateAll) window.recalculateAll();
    showNotification('✅ Übernommen', 'Die Sparrate wurde in die Ansparphase übertragen.', 'success');
  });
}
