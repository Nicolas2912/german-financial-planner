/**
 * Ansparphase Scenario Manager
 *
 * Provides save/manage functionality for accumulation (Ansparphase) scenarios,
 * mirroring the UX of the Budgetplanung profile manager.
 */

import { formatGermanNumber, parseGermanNumber } from '../utils.js';
import * as state from '../state.js';
import { showNotification } from '../ui/dom.js';
import { applySavingsConfiguration } from '../ui/setup/setupScenarios.js';

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getActiveScenarioSafe() {
  return state.getActiveScenario();
}

// =============== Save Modal ===============
export function openSaveAnsparphaseScenarioModal() {
  const modal = document.getElementById('saveAnsparphaseScenarioModal');
  const nameInput = document.getElementById('ansparphaseScenarioName');
  const descInput = document.getElementById('ansparphaseScenarioDescription');
  if (!modal) return;

  modal.style.display = 'block';
  if (nameInput) nameInput.value = '';
  if (descInput) descInput.value = '';

  setTimeout(() => {
    if (nameInput) nameInput.focus();
    updateAnsparphaseScenarioPreview();
  }, 50);
}

export function closeSaveAnsparphaseScenarioModal() {
  const modal = document.getElementById('saveAnsparphaseScenarioModal');
  const nameInput = document.getElementById('ansparphaseScenarioName');
  const descInput = document.getElementById('ansparphaseScenarioDescription');
  if (modal) modal.style.display = 'none';
  if (nameInput) nameInput.value = '';
  if (descInput) descInput.value = '';
}

export function updateAnsparphaseScenarioPreview() {
  const previewContainer = document.getElementById('ansparphaseScenarioPreview');
  if (!previewContainer) return;

  const current = getActiveScenarioSafe();
  if (!current) return;

  const monthlySavings = parseGermanNumber(document.getElementById(`monthlySavings_${current.id}`)?.value || '0') || 0;
  const initialCapital = parseGermanNumber(document.getElementById(`initialCapital_${current.id}`)?.value || '0') || 0;
  const annualReturn = parseFloat(document.getElementById(`annualReturn_${current.id}`)?.value || '0') || 0;
  const duration = parseInt(document.getElementById(`duration_${current.id}`)?.value || '0') || 0;

  const activeModeButton = document.querySelector(`.savings-mode-btn.active[data-scenario="${current.id}"]`);
  const savingsMode = activeModeButton ? (activeModeButton.dataset.mode === 'multi-phase' ? 'Mehrphasig' : 'Einfach') : 'Einfach';

  previewContainer.innerHTML = `
    <div class="preview-item">
      <span class="preview-label">Aktives Szenario</span>
      <span class="preview-value">${escapeHtml(current.name)}</span>
    </div>
    <div class="preview-item">
      <span class="preview-label">Monatliche Sparrate</span>
      <span class="preview-value">${formatGermanNumber(monthlySavings, 0)} €</span>
    </div>
    <div class="preview-item">
      <span class="preview-label">Startkapital</span>
      <span class="preview-value">${formatGermanNumber(initialCapital, 0)} €</span>
    </div>
    <div class="preview-item">
      <span class="preview-label">Jährliche Rendite</span>
      <span class="preview-value">${annualReturn}%</span>
    </div>
    <div class="preview-item">
      <span class="preview-label">Anlagedauer</span>
      <span class="preview-value">${duration} Jahre</span>
    </div>
    <div class="preview-item">
      <span class="preview-label">Sparmodus</span>
      <span class="preview-value">${savingsMode}</span>
    </div>
    <div class="preview-item">
      <span class="preview-label">Erstellt</span>
      <span class="preview-value">${new Date().toLocaleDateString('de-DE')}</span>
    </div>
  `;

  const saveBtn = document.getElementById('confirmSaveAnsparphaseScenario');
  const scenarioName = document.getElementById('ansparphaseScenarioName')?.value.trim() || '';
  if (saveBtn) saveBtn.disabled = scenarioName.length === 0;
}

export function confirmSaveAnsparphaseScenario() {
  const scenarioName = document.getElementById('ansparphaseScenarioName')?.value.trim();
  const scenarioDescription = document.getElementById('ansparphaseScenarioDescription')?.value.trim() || '';
  if (!scenarioName) {
    showNotification('Fehler', 'Bitte geben Sie einen Szenario-Namen ein.', 'error');
    return;
  }

  const current = getActiveScenarioSafe();
  if (!current) {
    showNotification('Fehler', 'Kein aktives Szenario gefunden.', 'error');
    return;
  }

  // Build persistable snapshot for the active scenario
  const params = {
    monthlySavings: parseGermanNumber(document.getElementById(`monthlySavings_${current.id}`)?.value || '0') || 0,
    initialCapital: parseGermanNumber(document.getElementById(`initialCapital_${current.id}`)?.value || '0') || 0,
    annualReturn: parseFloat(document.getElementById(`annualReturn_${current.id}`)?.value || '0') || 0,
    inflationRate: parseFloat(document.getElementById(`inflationRate_${current.id}`)?.value || '0') || 0,
    salaryGrowth: parseFloat(document.getElementById(`salaryGrowth_${current.id}`)?.value || '0') || 0,
    duration: parseInt(document.getElementById(`duration_${current.id}`)?.value || '0') || 0,
    baseSalary: parseGermanNumber(document.getElementById(`baseSalary_${current.id}`)?.value || '0') || 0,
    salaryToSavings: parseFloat(document.getElementById(`salaryToSavings_${current.id}`)?.value || '0') || 0,
    basiszins: parseFloat(document.getElementById(`basiszins_${current.id}`)?.value || ''),
    includeTax: document.getElementById(`taxToggle_${current.id}`)?.classList.contains('active') || false,
    teilfreistellung: document.getElementById(`teilfreistellungToggle_${current.id}`)?.classList.contains('active') || false,
    etfType: (document.querySelector(`input[name="etfType-${current.id}"]:checked`)?.value) ||
            (document.querySelector('input[name="etfType"]:checked')?.value) || 'thesaurierend',
    savingsMode: (document.querySelector(`.savings-mode-btn.active[data-scenario="${current.id}"]`)?.dataset.mode) || 'simple',
  };

  // Collect multi-phase data if visible
  const phases = [];
  for (let p = 1; p <= 3; p++) {
    const active = document.querySelector(`.savings-phase[data-phase="${p}"][data-scenario="${current.id}"]`);
    if (active && active.classList.contains('active')) {
      const startYear = parseInt(document.querySelector(`.phase-start-year[data-phase="${p}"][data-scenario="${current.id}"]`)?.value || '0');
      const endYear = parseInt(document.querySelector(`.phase-end-year[data-phase="${p}"][data-scenario="${current.id}"]`)?.value || '0');
      const savingsRate = parseGermanNumber(document.querySelector(`.phase-savings-rate[data-phase="${p}"][data-scenario="${current.id}"]`)?.value || '0') || 0;
      const rrRaw = (document.querySelector(`.phase-return-rate[data-phase="${p}"][data-scenario="${current.id}"]`)?.value || '').toString();
      const rrPct = rrRaw ? parseFloat(rrRaw.replace(/\s+/g, '').replace(',', '.')) : NaN;
      phases.push({ phase: p, startYear, endYear, monthlySavingsRate: savingsRate, annualReturn: isNaN(rrPct) ? null : rrPct / 100 });
    }
  }
  params.multiPhaseData = phases;

  const data = {
    name: scenarioName,
    description: scenarioDescription,
    createdAt: new Date().toISOString(),
    type: 'single',
    scenario: {
      id: current.id,
      name: scenarioName,
      color: current.color,
      parameters: params,
      results: current.results || {}
    }
  };

  const key = 'ansparphaseScenario_' + scenarioName;
  const existed = !!localStorage.getItem(key);
  localStorage.setItem(key, JSON.stringify(data));

  closeSaveAnsparphaseScenarioModal();
  showNotification(existed ? 'Überschrieben' : 'Gespeichert', `Ansparphase-Szenario "${scenarioName}" ${existed ? 'überschrieben' : 'gespeichert'}.`, existed ? 'warning' : 'success');
}

// =============== Manage Modal ===============
export function openManageAnsparphaseScenarioModal() {
  const modal = document.getElementById('manageAnsparphaseScenarioModal');
  if (!modal) return;
  modal.style.display = 'block';
  loadManageAnsparphaseScenarioList();
}

export function closeManageAnsparphaseScenarioModal() {
  const modal = document.getElementById('manageAnsparphaseScenarioModal');
  if (modal) modal.style.display = 'none';
}

export function loadManageAnsparphaseScenarioList() {
  const list = document.getElementById('manageAnsparphaseScenarioList');
  if (!list) return;

  const scenarios = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('ansparphaseScenario_')) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        scenarios.push({ name: key.replace('ansparphaseScenario_', ''), data });
      } catch (_) {}
    }
  }

  if (scenarios.length === 0) {
    list.innerHTML = `
      <div class="no-profiles">
        <div class="no-profiles-icon"></div>
        <p>Keine gespeicherten Szenarien gefunden.</p>
        <p>Erstellen Sie Ihr erstes Szenario mit "Szenario speichern".</p>
      </div>
    `;
    return;
  }

  scenarios.sort((a, b) => (a.data?.name || a.name).localeCompare(b.data?.name || b.name));

  list.innerHTML = scenarios.map(s => {
    let monthlySavings = 0;
    let duration = 0;
    let annualReturn = 0;
    if (s.data?.type === 'single' && s.data?.scenario) {
      monthlySavings = s.data.scenario.parameters?.monthlySavings || 0;
      duration = s.data.scenario.parameters?.duration || 0;
      annualReturn = s.data.scenario.parameters?.annualReturn || 0;
    } else if (Array.isArray(s.data?.scenarios) && s.data.scenarios.length) {
      const first = s.data.scenarios[0];
      monthlySavings = first?.parameters?.monthlySavings || 0;
      duration = first?.parameters?.duration || 0;
      annualReturn = first?.parameters?.annualReturn || 0;
    }
    const name = escapeHtml(s.data?.name || s.name);
    return `
      <div class="profile-item">
        <div class="profile-info">
          <div class="profile-name">${name}</div>
          <div class="profile-details">
            Sparrate: ${formatGermanNumber(monthlySavings, 0)} € | Dauer: ${duration} Jahre | Rendite: ${annualReturn}%
          </div>
        </div>
        <div class="profile-actions">
          <button class="profile-action-btn profile-load-btn" onclick="loadAnsparphaseScenarioFromManager('${name}')">Laden</button>
          <button class="profile-action-btn profile-delete-btn" onclick="deleteAnsparphaseScenario('${name}')">Löschen</button>
        </div>
      </div>
    `;
  }).join('');
}

export function loadAnsparphaseScenarioFromManager(scenarioName) {
  // Resolve by name across potential duplicate keys
  let found = null;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('ansparphaseScenario_')) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        if (data && (data.name === scenarioName || key === 'ansparphaseScenario_' + scenarioName)) {
          found = data;
          break;
        }
      } catch (_) {}
    }
  }
  if (!found) {
    showNotification('Fehler', 'Szenario konnte nicht geladen werden.', 'error');
    return;
  }

  const selected = (found.type === 'single' && found.scenario)
    ? [found.scenario]
    : (Array.isArray(found.scenarios) ? found.scenarios : []);

  // Capacity check (max 4 scenarios total)
  const existing = state.scenarios.length;
  if (existing + selected.length > 4) {
    showNotification('Zu viele Szenarien', `Das Laden würde ${existing + selected.length} Szenarien ergeben (max. 4).`, 'warning');
    return;
  }

  // Create new scenarios and populate values
  selected.forEach(saved => {
    // Create a new scenario panel via existing utility
    const newScenario = window.addNewScenario ? window.addNewScenario() : null;
    if (!newScenario) return;
    newScenario.name = saved.name;

    // Update tab and panel titles immediately
    const tab = document.querySelector(`.scenario-tab[data-scenario="${newScenario.id}"]`);
    if (tab) tab.innerHTML = `${escapeHtml(saved.name)}`;
    const panelTitle = document.querySelector(`.scenario-panel[data-scenario="${newScenario.id}"] .scenario-panel-title`);
    if (panelTitle) panelTitle.textContent = `${escapeHtml(saved.name)}`;

    const p = saved.parameters || {};
    const setVal = (id, val) => {
      const el = document.getElementById(`${id}_${newScenario.id}`);
      if (!el) return;
      if (id === 'monthlySavings' || id === 'initialCapital' || id === 'baseSalary') {
        el.value = formatGermanNumber(val || 0, 0);
      } else {
        el.value = (val ?? '').toString();
      }
    };
    setVal('monthlySavings', p.monthlySavings);
    setVal('initialCapital', p.initialCapital);
    setVal('annualReturn', p.annualReturn);
    setVal('inflationRate', p.inflationRate);
    setVal('salaryGrowth', p.salaryGrowth);
    setVal('duration', p.duration);
    setVal('baseSalary', p.baseSalary);
    setVal('salaryToSavings', p.salaryToSavings);
    // Older saves have no Basiszins assumption: keep the panel's default
    if (Number.isFinite(p.basiszins)) setVal('basiszins', p.basiszins);

    // Toggles and radios
    const taxToggle = document.getElementById(`taxToggle_${newScenario.id}`);
    if (taxToggle) {
      taxToggle.classList.toggle('active', !!p.includeTax);
    }
    const teilToggle = document.getElementById(`teilfreistellungToggle_${newScenario.id}`);
    if (teilToggle) {
      teilToggle.classList.toggle('active', !!p.teilfreistellung);
    }
    const radios = document.querySelectorAll(`input[name="etfType-${newScenario.id}"]`);
    if (radios && p.etfType) {
      radios.forEach(r => { r.checked = (r.value === p.etfType); });
    }

    // Savings mode and phases (older saves have no phase number: use the list position)
    const savedPhases = Array.isArray(p.multiPhaseData)
      ? p.multiPhaseData.map((phase, idx) => ({ ...phase, phase: phase.phase ?? (idx + 1) }))
      : [];
    applySavingsConfiguration(newScenario.id, p.savingsMode, savedPhases);

    // Update slider displays
    ['annualReturn', 'inflationRate', 'salaryGrowth', 'duration', 'salaryToSavings', 'basiszins'].forEach(sliderId => {
      if (window.updateScenarioSliderValue) window.updateScenarioSliderValue(sliderId, newScenario.id);
    });
  });

  if (window.recalculateAll) window.recalculateAll();
  closeManageAnsparphaseScenarioModal();
  showNotification('Geladen', `Ansparphase-Szenario "${scenarioName}" geladen.`, 'success');
}

export function deleteAnsparphaseScenario(scenarioName) {
  if (!confirm(`Szenario "${scenarioName}" wirklich löschen?\n\nDiese Aktion kann nicht rückgängig gemacht werden.`)) return;

  const keysToDelete = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('ansparphaseScenario_')) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        if (data && data.name === scenarioName) keysToDelete.push(key);
      } catch (_) {
        if (key === 'ansparphaseScenario_' + scenarioName) keysToDelete.push(key);
      }
    }
  }

  keysToDelete.forEach(k => localStorage.removeItem(k));
  loadManageAnsparphaseScenarioList();
  showNotification('Gelöscht', `Szenario "${scenarioName}" entfernt.`, 'success');
}

// Back-compat: expose to window for inline onclick usage in generated HTML
if (typeof window !== 'undefined') {
  window.openSaveAnsparphaseScenarioModal = openSaveAnsparphaseScenarioModal;
  window.closeSaveAnsparphaseScenarioModal = closeSaveAnsparphaseScenarioModal;
  window.updateAnsparphaseScenarioPreview = updateAnsparphaseScenarioPreview;
  window.confirmSaveAnsparphaseScenario = confirmSaveAnsparphaseScenario;
  window.openManageAnsparphaseScenarioModal = openManageAnsparphaseScenarioModal;
  window.closeManageAnsparphaseScenarioModal = closeManageAnsparphaseScenarioModal;
  window.loadManageAnsparphaseScenarioList = loadManageAnsparphaseScenarioList;
  window.loadAnsparphaseScenarioFromManager = loadAnsparphaseScenarioFromManager;
  window.deleteAnsparphaseScenario = deleteAnsparphaseScenario;
}
