/**
 * Entnahmephase Scenario Manager
 *
 * Mirrors the Ansparphase scenario save/manage UX but captures
 * withdrawal-phase inputs and persists them under
 * localStorage keys: entnahmephaseScenario_<Name>
 */

import { formatGermanNumber, parseGermanNumber } from '../utils.js';
import { showNotification } from '../ui/dom.js';
import { updateWithdrawalSliderValue } from '../ui/dom.js';
import { calculateWithdrawal } from '../ui/setup/index.js';

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

function collectCurrentWithdrawalParams() {
  const retirementCapital = parseGermanNumber(document.getElementById('retirementCapital')?.value || '0') || 0;
  const withdrawalDuration = parseInt(document.getElementById('withdrawalDuration')?.value || '0') || 0;
  const postRetirementReturn = parseFloat(document.getElementById('postRetirementReturn')?.value || '0') || 0; // percent
  const withdrawalInflation = parseFloat(document.getElementById('withdrawalInflation')?.value || '0') || 0; // percent
  const withdrawalTaxActive = document.getElementById('withdrawalTaxToggle')?.classList.contains('active') || false;
  const teilfreistellungRate = parseFloat(document.getElementById('withdrawalTeilfreistellungRate')?.value || '0') || 0; // percent

  return {
    retirementCapital,
    withdrawalDuration,
    postRetirementReturn,
    withdrawalInflation,
    withdrawalTaxActive,
    teilfreistellungRate,
  };
}

// =============== Save Modal ===============
function openSaveEntnahmephaseScenarioModal() {
  const modal = document.getElementById('saveEntnahmephaseScenarioModal');
  const nameInput = document.getElementById('entnahmephaseScenarioName');
  const descInput = document.getElementById('entnahmephaseScenarioDescription');
  if (!modal) return;
  modal.style.display = 'block';
  if (nameInput) nameInput.value = '';
  if (descInput) descInput.value = '';
  setTimeout(() => {
    nameInput?.focus();
    updateEntnahmephaseScenarioPreview();
  }, 50);
}

function closeSaveEntnahmephaseScenarioModal() {
  const modal = document.getElementById('saveEntnahmephaseScenarioModal');
  if (modal) modal.style.display = 'none';
  const nameInput = document.getElementById('entnahmephaseScenarioName');
  const descInput = document.getElementById('entnahmephaseScenarioDescription');
  if (nameInput) nameInput.value = '';
  if (descInput) descInput.value = '';
}

function updateEntnahmephaseScenarioPreview() {
  const previewContainer = document.getElementById('entnahmephaseScenarioPreview');
  if (!previewContainer) return;

  const p = collectCurrentWithdrawalParams();
  previewContainer.innerHTML = `
    <div class="preview-item"><span class="preview-label">🏦 Kapital zum Rentenstart</span><span class="preview-value">€${formatGermanNumber(p.retirementCapital, 0)}</span></div>
    <div class="preview-item"><span class="preview-label">⏱️ Entnahmedauer</span><span class="preview-value">${p.withdrawalDuration} Jahre</span></div>
    <div class="preview-item"><span class="preview-label">📈 Rendite (Ruhestand)</span><span class="preview-value">${p.postRetirementReturn}%</span></div>
    <div class="preview-item"><span class="preview-label">📉 Inflation</span><span class="preview-value">${p.withdrawalInflation}%</span></div>
    <div class="preview-item"><span class="preview-label">🇩🇪 Abgeltungssteuer</span><span class="preview-value">${p.withdrawalTaxActive ? 'Aktiv' : 'Aus'}</span></div>
    <div class="preview-item"><span class="preview-label">🧾 Teilfreistellung</span><span class="preview-value">${p.teilfreistellungRate}%</span></div>
    <div class="preview-item"><span class="preview-label">📅 Erstellt</span><span class="preview-value">${new Date().toLocaleDateString('de-DE')}</span></div>
  `;

  const saveBtn = document.getElementById('confirmSaveEntnahmephaseScenario');
  const scenarioName = document.getElementById('entnahmephaseScenarioName')?.value.trim() || '';
  if (saveBtn) saveBtn.disabled = scenarioName.length === 0;
}

function confirmSaveEntnahmephaseScenario() {
  const scenarioName = document.getElementById('entnahmephaseScenarioName')?.value.trim();
  const scenarioDescription = document.getElementById('entnahmephaseScenarioDescription')?.value.trim() || '';
  if (!scenarioName) {
    showNotification('❌ Fehler', 'Bitte geben Sie einen Szenario-Namen ein.', 'error');
    return;
  }

  const params = collectCurrentWithdrawalParams();
  const data = {
    name: scenarioName,
    description: scenarioDescription,
    createdAt: new Date().toISOString(),
    type: 'single',
    parameters: params,
  };

  const key = 'entnahmephaseScenario_' + scenarioName;
  const existed = !!localStorage.getItem(key);
  localStorage.setItem(key, JSON.stringify(data));

  closeSaveEntnahmephaseScenarioModal();
  showNotification(existed ? '⚠️ Überschrieben' : '✅ Gespeichert', `Entnahmephase-Szenario "${escapeHtml(scenarioName)}" ${existed ? 'überschrieben' : 'gespeichert'}.`, existed ? 'warning' : 'success');
}

// =============== Manage Modal ===============
function openManageEntnahmephaseScenarioModal() {
  const modal = document.getElementById('manageEntnahmephaseScenarioModal');
  if (!modal) return;
  modal.style.display = 'block';
  loadManageEntnahmephaseScenarioList();
}

function closeManageEntnahmephaseScenarioModal() {
  const modal = document.getElementById('manageEntnahmephaseScenarioModal');
  if (modal) modal.style.display = 'none';
}

function loadManageEntnahmephaseScenarioList() {
  const list = document.getElementById('manageEntnahmephaseScenarioList');
  if (!list) return;

  const scenarios = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('entnahmephaseScenario_')) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        scenarios.push({ name: key.replace('entnahmephaseScenario_', ''), data });
      } catch (_) {}
    }
  }

  if (scenarios.length === 0) {
    list.innerHTML = `
      <div class="no-profiles">
        <div class="no-profiles-icon">📁</div>
        <p>Keine gespeicherten Szenarien gefunden.</p>
        <p>Erstellen Sie Ihr erstes Szenario mit "Szenario speichern".</p>
      </div>
    `;
    return;
  }

  scenarios.sort((a, b) => (a.data?.name || a.name).localeCompare(b.data?.name || b.name));

  list.innerHTML = scenarios.map(s => {
    const p = s.data?.parameters || s.data?.scenario?.parameters || {};
    const capital = p.retirementCapital || 0;
    const years = p.withdrawalDuration || 0;
    const ret = p.postRetirementReturn || 0;
    const name = escapeHtml(s.data?.name || s.name);
    return `
      <div class="profile-item">
        <div class="profile-info">
          <div class="profile-name">${name}</div>
          <div class="profile-details">Kapital: €${formatGermanNumber(capital, 0)} | Dauer: ${years} Jahre | Rendite: ${ret}%</div>
        </div>
        <div class="profile-actions">
          <button class="profile-action-btn profile-load-btn" onclick="loadEntnahmephaseScenarioFromManager('${name}')">📂 Laden</button>
          <button class="profile-action-btn profile-delete-btn" onclick="deleteEntnahmephaseScenario('${name}')">🗑️ Löschen</button>
        </div>
      </div>
    `;
  }).join('');
}

function loadEntnahmephaseScenarioFromManager(scenarioName) {
  // Find by name across keys
  let found = null;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('entnahmephaseScenario_')) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        if (data && (data.name === scenarioName || key === 'entnahmephaseScenario_' + scenarioName)) {
          found = data;
          break;
        }
      } catch (_) {}
    }
  }
  if (!found) {
    showNotification('❌ Fehler', 'Szenario konnte nicht geladen werden.', 'error');
    return;
  }

  const p = found.parameters || found.scenario?.parameters || {};

  // Set inputs
  const capitalEl = document.getElementById('retirementCapital');
  if (capitalEl) capitalEl.value = formatGermanNumber(p.retirementCapital || 0, 0);

  const wdDur = document.getElementById('withdrawalDuration');
  if (wdDur) wdDur.value = String(p.withdrawalDuration || 0);
  updateWithdrawalSliderValue('withdrawalDuration');

  const wdRet = document.getElementById('postRetirementReturn');
  if (wdRet) wdRet.value = String(p.postRetirementReturn || 0);
  updateWithdrawalSliderValue('postRetirementReturn');

  const wdInfl = document.getElementById('withdrawalInflation');
  if (wdInfl) wdInfl.value = String(p.withdrawalInflation || 0);
  updateWithdrawalSliderValue('withdrawalInflation');

  const taxToggle = document.getElementById('withdrawalTaxToggle');
  if (taxToggle) {
    taxToggle.classList.toggle('active', !!p.withdrawalTaxActive);
    const group = document.getElementById('teilfreistellungGroup');
    if (group) group.style.display = p.withdrawalTaxActive ? 'block' : 'none';
  }

  const teilSlider = document.getElementById('withdrawalTeilfreistellungRate');
  if (teilSlider) {
    teilSlider.value = String(p.teilfreistellungRate || 0);
    updateWithdrawalSliderValue('withdrawalTeilfreistellungRate');
  }

  // Recalculate
  if (typeof calculateWithdrawal === 'function') calculateWithdrawal();

  closeManageEntnahmephaseScenarioModal();
  showNotification('✅ Geladen', `Entnahmephase-Szenario "${escapeHtml(scenarioName)}" geladen.`, 'success');
}

function deleteEntnahmephaseScenario(scenarioName) {
  if (!confirm(`❓ Szenario "${scenarioName}" wirklich löschen?\n\nDiese Aktion kann nicht rückgängig gemacht werden.`)) return;

  const keysToDelete = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('entnahmephaseScenario_')) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        if (data && data.name === scenarioName) keysToDelete.push(key);
      } catch (_) {
        if (key === 'entnahmephaseScenario_' + scenarioName) keysToDelete.push(key);
      }
    }
  }

  keysToDelete.forEach(k => localStorage.removeItem(k));
  loadManageEntnahmephaseScenarioList();
  showNotification('🗑️ Gelöscht', `Szenario "${escapeHtml(scenarioName)}" entfernt.`, 'success');
}

// =============== Public setup hook ===============
function setupEntnahmephaseScenarioListeners() {
  // Save modal
  document.getElementById('saveEntnahmephaseScenario')?.addEventListener('click', openSaveEntnahmephaseScenarioModal);
  document.getElementById('closeSaveEntnahmephaseScenarioModal')?.addEventListener('click', closeSaveEntnahmephaseScenarioModal);
  document.getElementById('cancelSaveEntnahmephaseScenario')?.addEventListener('click', closeSaveEntnahmephaseScenarioModal);
  document.getElementById('confirmSaveEntnahmephaseScenario')?.addEventListener('click', confirmSaveEntnahmephaseScenario);
  document.getElementById('entnahmephaseScenarioName')?.addEventListener('input', updateEntnahmephaseScenarioPreview);
  document.getElementById('entnahmephaseScenarioDescription')?.addEventListener('input', updateEntnahmephaseScenarioPreview);

  // Manage modal
  document.getElementById('manageEntnahmephaseScenarios')?.addEventListener('click', openManageEntnahmephaseScenarioModal);
  document.getElementById('closeManageEntnahmephaseScenarioModal')?.addEventListener('click', closeManageEntnahmephaseScenarioModal);

  // Global outside click closes
  window.addEventListener('click', function (event) {
    const saveModal = document.getElementById('saveEntnahmephaseScenarioModal');
    const manageModal = document.getElementById('manageEntnahmephaseScenarioModal');
    if (event.target === saveModal) closeSaveEntnahmephaseScenarioModal();
    if (event.target === manageModal) closeManageEntnahmephaseScenarioModal();
  });
}

// Expose to window so setupScenarios can call into this module
if (typeof window !== 'undefined') {
  window.setupEntnahmephaseScenarioListeners = setupEntnahmephaseScenarioListeners;
  window.loadEntnahmephaseScenarioFromManager = loadEntnahmephaseScenarioFromManager;
  window.deleteEntnahmephaseScenario = deleteEntnahmephaseScenario;
}

