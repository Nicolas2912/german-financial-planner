// UI setup: Withdrawal module

import { parseGermanNumber, formatGermanNumber } from '../../utils.js';
import * as state from '../../state.js';
import { calculateWithdrawalPlan as calculateWithdrawalCore } from '../../core/withdrawal.js';
import { updateWithdrawalResults, updateWithdrawalTable, showNotification } from '../dom.js';
import { updateWithdrawalChart, createIntegratedTimeline } from '../withdrawalChart.js';

export function calculateWithdrawal() {
  const retirementCapital = parseGermanNumber(document.getElementById('retirementCapital')?.value || '1000000');
  const duration = parseInt(document.getElementById('withdrawalDuration')?.value || '25');
  const annualReturn = parseFloat(document.getElementById('postRetirementReturn')?.value || '5') / 100;
  const inflationRate = parseFloat(document.getElementById('withdrawalInflation')?.value || '2') / 100;
  const includeTax = document.getElementById('withdrawalTaxToggle')?.classList.contains('active') || false;

  try {
    const results = calculateWithdrawalCore(retirementCapital, duration, annualReturn, inflationRate, includeTax, 0);
    updateWithdrawalResults(results);
    if (results.yearlyData && results.yearlyData.length > 0) {
      updateWithdrawalChart(results.yearlyData);
      updateWithdrawalTable(results.yearlyData);
    }
    const integratedTimelineView = document.getElementById('integratedTimelineView');
    if (integratedTimelineView && integratedTimelineView.style.display !== 'none') {
      createIntegratedTimeline();
    }
    state.setWithdrawalData(results);
  } catch (error) {
    console.error('Error calculating withdrawal:', error);
  }
}

function updateWithdrawalSliderValue(id) {
  const slider = document.getElementById(id);
  const valueElement = document.getElementById(id + 'Value');
  if (!slider || !valueElement) return;
  const value = parseFloat(slider.value);
  let formattedValue;
  switch (id) {
    case 'withdrawalDuration':
      formattedValue = `${value} Jahre`;
      break;
    case 'postRetirementReturn':
    case 'withdrawalInflation':
    case 'withdrawalTeilfreistellungRate':
      formattedValue = `${value.toFixed(1)}%`;
      break;
    default:
      formattedValue = value.toString();
  }
  valueElement.textContent = formattedValue;
}

export function setupWithdrawalListeners() {
  const teilfreistellungRateSlider = document.getElementById('withdrawalTeilfreistellungRate');
  if (teilfreistellungRateSlider) {
    teilfreistellungRateSlider.addEventListener('input', function() {
      updateWithdrawalSliderValue('withdrawalTeilfreistellungRate');
      debouncedCalculateWithdrawal();
    });
  }

  let withdrawalCalculationTimeout = null;
  function debouncedCalculateWithdrawal() {
    if (withdrawalCalculationTimeout) clearTimeout(withdrawalCalculationTimeout);
    withdrawalCalculationTimeout = setTimeout(() => calculateWithdrawal(), 150);
  }

  const withdrawalSliders = ['withdrawalDuration', 'postRetirementReturn', 'withdrawalInflation'];
  withdrawalSliders.forEach(id => {
    const slider = document.getElementById(id);
    if (!slider) return;
    slider.addEventListener('input', function() {
      updateWithdrawalSliderValue(id);
      debouncedCalculateWithdrawal();
    });
    slider.addEventListener('change', function() {
      updateWithdrawalSliderValue(id);
      if (withdrawalCalculationTimeout) clearTimeout(withdrawalCalculationTimeout);
      calculateWithdrawal();
    });
    updateWithdrawalSliderValue(id);
  });

  const capitalInput = document.getElementById('retirementCapital');
  if (capitalInput) capitalInput.addEventListener('input', debouncedCalculateWithdrawal);

  const taxToggle = document.getElementById('withdrawalTaxToggle');
  if (taxToggle) {
    taxToggle.addEventListener('click', function() {
      this.classList.toggle('active');
      const group = document.getElementById('teilfreistellungGroup');
      if (group) group.style.display = this.classList.contains('active') ? 'block' : 'none';
      calculateWithdrawal();
    });
  }

  const useAccumBtn = document.getElementById('useAccumulationResult');
  if (useAccumBtn) {
    useAccumBtn.addEventListener('click', function() {
      const selectedScenarioId = document.getElementById('scenarioSelector').value;
      if (!selectedScenarioId) {
        alert('Bitte wählen Sie zuerst ein Szenario aus der Liste aus.');
        return;
      }
      const selectedScenario = (state.scenarios || []).find(s => s.id === selectedScenarioId);
      if (selectedScenario && selectedScenario.yearlyData && selectedScenario.yearlyData.length > 0) {
        const finalValue = selectedScenario.yearlyData[selectedScenario.yearlyData.length - 1].capital;
        const capitalEl = document.getElementById('retirementCapital');
        if (capitalEl) capitalEl.value = Math.round(finalValue).toLocaleString('de-DE');
        calculateWithdrawal();
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
  }

  const manualSyncBtn = document.getElementById('manualSyncBtn');
  if (manualSyncBtn) manualSyncBtn.addEventListener('click', function() {
    if (window.autoSyncWithdrawalCapital) window.autoSyncWithdrawalCapital(true);
  });
}

