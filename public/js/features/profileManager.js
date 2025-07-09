/**
 * Profile Management Module
 * 
 * This module handles all profile-related functionality including saving, loading,
 * and managing user budget profiles with localStorage persistence.
 */

import { formatCurrency, parseGermanNumber, formatGermanNumber } from '../utils/utils.js';
import { calculateProfileTotalIncome, calculateProfileTotalExpenses } from '../core/budget.js';

// Global variable to track selected profile for loading
let selectedProfileForLoad = null;

/**
 * HTML escape utility function
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show notification with styling
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type ('success', 'error', 'info')
 */
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

// ==================== Save Profile Modal Functions ====================

/**
 * Open the save profile modal
 */
export function openSaveProfileModal() {
    document.getElementById('saveProfileModal').style.display = 'block';
    document.getElementById('profileName').value = '';
    document.getElementById('profileDescription').value = '';
    updateProfilePreview();
    
    // Focus on profile name input
    setTimeout(() => {
        document.getElementById('profileName').focus();
    }, 100);
}

/**
 * Close the save profile modal
 */
export function closeSaveProfileModal() {
    document.getElementById('saveProfileModal').style.display = 'none';
}

/**
 * Update the profile preview in the save modal
 */
export function updateProfilePreview() {
    const previewContainer = document.getElementById('profilePreview');
    
    // Get current values - these need to be accessible from the global scope
    // or passed as parameters when this module is used
    const totalIncome = window.budgetData?.totalIncome || 0;
    const totalExpenses = window.budgetData?.totalExpenses || 0;
    const savingsAmount = window.budgetData?.savings?.amount || 0;
    const savingsMode = window.budgetData?.savings?.mode || 'fixed';
    
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
    if (saveBtn) {
        saveBtn.disabled = profileName.length === 0;
    }
}

/**
 * Confirm and save the profile
 */
export function confirmSaveProfile() {
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
        savings: window.budgetData?.savings || { mode: 'fixed', amount: 0, percentage: 10 },
        periods: window.budgetData?.periods || { income: 'monthly', fixed: 'monthly', variable: 'monthly' },
        budgetData: {
            totalIncome: window.budgetData?.totalIncome || 0,
            totalExpenses: window.budgetData?.totalExpenses || 0
        }
    };

    localStorage.setItem('budgetProfile_' + profileName, JSON.stringify(profile));
    closeSaveProfileModal();
    
    // Show success message with nice styling
    showNotification('✅ Profil erfolgreich gespeichert!', `Das Profil "${profileName}" wurde erfolgreich gespeichert.`, 'success');
}

// ==================== Load Profile Modal Functions ====================

/**
 * Open the load profile modal
 */
export function openLoadProfileModal() {
    document.getElementById('loadProfileModal').style.display = 'block';
    loadProfilesForModal();
}

/**
 * Close the load profile modal
 */
export function closeLoadProfileModal() {
    document.getElementById('loadProfileModal').style.display = 'none';
}

/**
 * Load profiles for the modal display
 */
export function loadProfilesForModal() {
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

/**
 * Select a profile for loading
 * @param {string} profileName - Name of the profile to select
 */
export function selectProfileForLoad(profileName) {
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

/**
 * Load the selected profile
 * @param {string} profileName - Name of the profile to load
 */
export function loadSelectedProfile(profileName) {
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
    if (window.budgetData) {
        window.budgetData.savings = profile.savings;
    }
    document.getElementById('savingsAmount').value = profile.savings.amount;
    document.getElementById('savingsPercentage').value = profile.savings.percentage;
    const percentageValueElement = document.getElementById('savingsPercentageValue');
    if (percentageValueElement) {
        percentageValueElement.textContent = profile.savings.percentage + '%';
    }
    
    // Load period settings
    if (profile.periods) {
        if (window.budgetData) {
            window.budgetData.periods = profile.periods;
        }
        
        // Update period toggles
        document.querySelectorAll('.period-option').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Set income period toggle
        if (profile.periods.income) {
            const incomeToggle = document.getElementById('incomePeriodToggle');
            if (incomeToggle) {
                const incomeBtn = incomeToggle.querySelector(`[data-period="${profile.periods.income}"]`);
                if (incomeBtn) incomeBtn.classList.add('active');
            }
        }
        
        // Set fixed period toggle
        const fixedToggle = document.getElementById('fixedPeriodToggle');
        if (fixedToggle) {
            const fixedBtn = fixedToggle.querySelector(`[data-period="${profile.periods.fixed}"]`);
            if (fixedBtn) fixedBtn.classList.add('active');
        }
        
        // Set variable period toggle
        const variableToggle = document.getElementById('variablePeriodToggle');
        if (variableToggle) {
            const variableBtn = variableToggle.querySelector(`[data-period="${profile.periods.variable}"]`);
            if (variableBtn) variableBtn.classList.add('active');
        }
    }
    
    // Set savings mode - this function needs to be available globally or passed as parameter
    if (window.setSavingsMode) {
        window.setSavingsMode(profile.savings.mode);
    }
    
    // Calculate budget - this function needs to be available globally or passed as parameter
    if (window.calculateBudget) {
        window.calculateBudget();
    }
    
    closeLoadProfileModal();
    showNotification('✅ Profil erfolgreich geladen!', `Das Profil "${profile.name || profileName}" wurde erfolgreich geladen.`, 'success');
}

// ==================== Profile Manager Functions ====================

/**
 * Open the profile manager modal
 */
export function openProfileManager() {
    document.getElementById('profileModal').style.display = 'block';
    loadProfileList();
}

/**
 * Close the profile manager modal
 */
export function closeProfileManager() {
    document.getElementById('profileModal').style.display = 'none';
}

/**
 * Load and display the profile list in the manager
 */
export function loadProfileList() {
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

/**
 * Load a profile from the manager
 * @param {string} profileName - Name of the profile to load
 */
export function loadProfileFromManager(profileName) {
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
    if (window.budgetData) {
        window.budgetData.savings = profile.savings;
    }
    document.getElementById('savingsAmount').value = profile.savings.amount;
    document.getElementById('savingsPercentage').value = profile.savings.percentage;
    const percentageValueElement = document.getElementById('savingsPercentageValue');
    if (percentageValueElement) {
        percentageValueElement.textContent = profile.savings.percentage + '%';
    }
    
    // Load period settings
    if (profile.periods) {
        if (window.budgetData) {
            window.budgetData.periods = profile.periods;
        }
        
        // Update period toggles
        document.querySelectorAll('.period-option').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Set income period toggle
        if (profile.periods.income) {
            const incomeToggle = document.getElementById('incomePeriodToggle');
            if (incomeToggle) {
                const incomeBtn = incomeToggle.querySelector(`[data-period="${profile.periods.income}"]`);
                if (incomeBtn) incomeBtn.classList.add('active');
            }
        }
        
        // Set fixed period toggle
        const fixedToggle = document.getElementById('fixedPeriodToggle');
        if (fixedToggle) {
            const fixedBtn = fixedToggle.querySelector(`[data-period="${profile.periods.fixed}"]`);
            if (fixedBtn) fixedBtn.classList.add('active');
        }
        
        // Set variable period toggle
        const variableToggle = document.getElementById('variablePeriodToggle');
        if (variableToggle) {
            const variableBtn = variableToggle.querySelector(`[data-period="${profile.periods.variable}"]`);
            if (variableBtn) variableBtn.classList.add('active');
        }
    }
    
    // Set savings mode
    if (window.setSavingsMode) {
        window.setSavingsMode(profile.savings.mode);
    }
    
    // Calculate budget
    if (window.calculateBudget) {
        window.calculateBudget();
    }
    
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

/**
 * Delete a profile
 * @param {string} profileName - Name of the profile to delete
 */
export function deleteProfile(profileName) {
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

// ==================== Comparison Profile Functions ====================

/**
 * Setup comparison profile selection functionality
 */
export function setupComparisonProfileSelection() {
    // Load available profiles for all existing dropdowns
    loadComparisonProfiles();
    
    // Setup event listeners for all profile selectors using event delegation
    document.addEventListener('change', function(e) {
        if (e.target.classList.contains('scenario-profile-select')) {
            const scenarioId = e.target.dataset.scenario;
            const hasProfile = e.target.value !== '';
            
            // Update buttons for this scenario
            const scenarioPanel = document.querySelector(`[data-scenario="${scenarioId}"]`);
            if (scenarioPanel) {
                const applyCurrentBtn = scenarioPanel.querySelector('.apply-to-current');
                const applyAllBtn = scenarioPanel.querySelector('.apply-to-all');
                
                if (applyCurrentBtn) applyCurrentBtn.disabled = !hasProfile;
                if (applyAllBtn) applyAllBtn.disabled = !hasProfile;
                
                if (hasProfile) {
                    // Immediately apply profile to current scenario
                    applyProfileToScenario(e.target.value, scenarioId);
                    showProfileSelectionStatusForScenario(scenarioId, 'success', `Profil "${e.target.options[e.target.selectedIndex].text}" wurde automatisch angewendet.`);
                } else {
                    hideProfileSelectionStatusForScenario(scenarioId);
                }
            }
        }
    });
    
    // Setup button click listeners using event delegation
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('apply-to-current')) {
            const scenarioId = e.target.dataset.scenario;
            const profileSelect = document.querySelector(`[data-scenario="${scenarioId}"] .scenario-profile-select`);
            if (profileSelect && profileSelect.value) {
                applyProfileToScenario(profileSelect.value, scenarioId);
            }
        }
        
        if (e.target.classList.contains('apply-to-all')) {
            const scenarioId = e.target.dataset.scenario;
            const profileSelect = document.querySelector(`[data-scenario="${scenarioId}"] .scenario-profile-select`);
            if (profileSelect && profileSelect.value) {
                applyProfileToAllScenarios(profileSelect.value);
            }
        }
        
        if (e.target.classList.contains('refresh-profiles')) {
            const scenarioId = e.target.dataset.scenario;
            loadComparisonProfiles();
            showProfileSelectionStatusForScenario(scenarioId, 'info', 'Profile wurden neu geladen.');
            setTimeout(() => hideProfileSelectionStatusForScenario(scenarioId), 2000);
        }
    });
}

/**
 * Load comparison profiles for dropdowns
 */
export function loadComparisonProfiles() {
    // Find all profile dropdowns
    const profileSelects = document.querySelectorAll('.scenario-profile-select');
    if (profileSelects.length === 0) return;
    
    // Load profiles from localStorage with the correct key pattern
    const profiles = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('budgetProfile_')) {
            const profileName = key.replace('budgetProfile_', '');
            try {
                const profileData = JSON.parse(localStorage.getItem(key));
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
}

/**
 * Apply profile to a specific scenario
 * @param {string} profileName - Name of the profile to apply
 * @param {string} scenarioId - ID of the scenario to apply to
 */
export function applyProfileToScenario(profileName, scenarioId) {
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
    
    // Calculate fixed expenses from profile
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
    
    // Calculate variable expenses from profile
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
    
    // Update input fields
    const netSalaryInput = document.querySelector(`[data-scenario="${scenarioId}"] [data-param="budget.netSalary"]`);
    const sideIncomeInput = document.querySelector(`[data-scenario="${scenarioId}"] [data-param="budget.sideIncome"]`);
    const fixedExpensesInput = document.querySelector(`[data-scenario="${scenarioId}"] [data-param="budget.fixedExpenses"]`);
    const variableExpensesInput = document.querySelector(`[data-scenario="${scenarioId}"] [data-param="budget.variableExpenses"]`);
    
    if (netSalaryInput) netSalaryInput.value = formatGermanNumber(netSalary, 0);
    if (sideIncomeInput) sideIncomeInput.value = formatGermanNumber(sideIncome, 0);
    if (fixedExpensesInput) fixedExpensesInput.value = formatGermanNumber(fixedExpenses, 0);
    if (variableExpensesInput) variableExpensesInput.value = formatGermanNumber(variableExpenses, 0);
    
    // Recalculate budget and results - these functions need to be available globally
    if (window.updateComparisonScenarioBudget) {
        window.updateComparisonScenarioBudget(scenarioId);
    }
    
    // Find scenario name for display
    const scenarioName = window.comparisonScenarios?.find(s => s.id === scenarioId)?.name || scenarioId;
    showProfileSelectionStatus('success', `Profil "${profile.name || profileName}" wurde erfolgreich auf ${scenarioName} angewendet.`);
    setTimeout(hideProfileSelectionStatus, 3000);
}

/**
 * Apply profile to all scenarios
 * @param {string} profileName - Name of the profile to apply
 */
export function applyProfileToAllScenarios(profileName) {
    let successCount = 0;
    
    if (window.comparisonScenarios) {
        window.comparisonScenarios.forEach(scenario => {
            try {
                applyProfileToScenario(profileName, scenario.id);
                successCount++;
            } catch (error) {
                console.error(`Failed to apply profile to scenario ${scenario.id}:`, error);
            }
        });
        
        if (successCount === window.comparisonScenarios.length) {
            showProfileSelectionStatus('success', `Profil "${profileName}" wurde erfolgreich auf alle ${successCount} Szenarien angewendet.`);
        } else if (successCount > 0) {
            showProfileSelectionStatus('warning', `Profil "${profileName}" wurde auf ${successCount} von ${window.comparisonScenarios.length} Szenarien angewendet.`);
        } else {
            showProfileSelectionStatus('error', `Fehler beim Anwenden des Profils "${profileName}".`);
        }
    }
    
    setTimeout(hideProfileSelectionStatus, 4000);
}

/**
 * Show profile selection status (legacy function)
 * @param {string} type - Status type
 * @param {string} message - Status message
 */
export function showProfileSelectionStatus(type, message) {
    showProfileSelectionStatusForScenario('A', type, message);
}

/**
 * Hide profile selection status (legacy function)
 */
export function hideProfileSelectionStatus() {
    hideProfileSelectionStatusForScenario('A');
}

/**
 * Show profile selection status for a specific scenario
 * @param {string} scenarioId - ID of the scenario
 * @param {string} type - Status type
 * @param {string} message - Status message
 */
export function showProfileSelectionStatusForScenario(scenarioId, type, message) {
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

/**
 * Hide profile selection status for a specific scenario
 * @param {string} scenarioId - ID of the scenario
 */
export function hideProfileSelectionStatusForScenario(scenarioId) {
    const statusElement = document.querySelector(`[data-scenario="${scenarioId}"] .profile-selection-status-inline`);
    if (statusElement) {
        statusElement.style.display = 'none';
    }
}

// ==================== Utility Functions ====================

/**
 * Get all profiles from localStorage
 * @returns {Array} Array of profile objects
 */
export function getAllProfiles() {
    const profiles = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('budgetProfile_')) {
            const profileName = key.replace('budgetProfile_', '');
            try {
                const profileData = JSON.parse(localStorage.getItem(key));
                profiles.push({
                    name: profileName,
                    data: profileData
                });
            } catch (error) {
                console.error(`Error parsing profile ${profileName}:`, error);
            }
        }
    }
    return profiles;
}

/**
 * Check if a profile exists
 * @param {string} profileName - Name of the profile to check
 * @returns {boolean} True if profile exists
 */
export function profileExists(profileName) {
    return localStorage.getItem('budgetProfile_' + profileName) !== null;
}

/**
 * Get a specific profile by name
 * @param {string} profileName - Name of the profile to get
 * @returns {Object|null} Profile data or null if not found
 */
export function getProfile(profileName) {
    const profileData = localStorage.getItem('budgetProfile_' + profileName);
    return profileData ? JSON.parse(profileData) : null;
}

/**
 * Export profile data as JSON
 * @param {string} profileName - Name of the profile to export
 * @returns {string|null} JSON string of profile data or null if not found
 */
export function exportProfile(profileName) {
    const profile = getProfile(profileName);
    return profile ? JSON.stringify(profile, null, 2) : null;
}

/**
 * Import profile data from JSON
 * @param {string} jsonData - JSON string of profile data
 * @param {string} newProfileName - Optional new name for the profile
 * @returns {boolean} True if import was successful
 */
export function importProfile(jsonData, newProfileName = null) {
    try {
        const profile = JSON.parse(jsonData);
        const profileName = newProfileName || profile.name;
        
        if (!profileName) {
            throw new Error('Profile name is required');
        }
        
        // Update profile name if changed
        if (newProfileName) {
            profile.name = newProfileName;
        }
        
        localStorage.setItem('budgetProfile_' + profileName, JSON.stringify(profile));
        return true;
    } catch (error) {
        console.error('Error importing profile:', error);
        return false;
    }
}

// Make functions available globally for backward compatibility
window.profileManager = {
    openSaveProfileModal,
    closeSaveProfileModal,
    updateProfilePreview,
    confirmSaveProfile,
    openLoadProfileModal,
    closeLoadProfileModal,
    loadProfilesForModal,
    selectProfileForLoad,
    loadSelectedProfile,
    openProfileManager,
    closeProfileManager,
    loadProfileList,
    loadProfileFromManager,
    deleteProfile,
    setupComparisonProfileSelection,
    loadComparisonProfiles,
    applyProfileToScenario,
    applyProfileToAllScenarios,
    showProfileSelectionStatus,
    hideProfileSelectionStatus,
    showProfileSelectionStatusForScenario,
    hideProfileSelectionStatusForScenario,
    getAllProfiles,
    profileExists,
    getProfile,
    exportProfile,
    importProfile
};