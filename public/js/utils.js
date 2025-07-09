// js/utils.js
// Utility functions for German Financial Planner

// Number formatting functions
export function formatCurrency(amount) {
    return '€' + amount.toLocaleString('de-DE', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });
}

export function parseGermanNumber(value) {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return 0;
    
    // Replace German decimal comma with dot for parsing
    const normalizedValue = value.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(normalizedValue);
    return isNaN(parsed) ? 0 : parsed;
}

export function formatGermanNumber(value, decimals = 2) {
    if (typeof value !== 'number' || isNaN(value)) return '0';
    return value.toLocaleString('de-DE', { 
        minimumFractionDigits: decimals, 
        maximumFractionDigits: decimals 
    });
}

// HTML escaping for security
export function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Generic debounce function
export function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// Notification system
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

// Scenario utility functions
export function getScenarioValue(inputId, scenarioId) {
    const element = document.getElementById(inputId + '_' + scenarioId);
    return element ? element.value : '0';
}

export function getScenarioToggleValue(toggleId, scenarioId) {
    const element = document.getElementById(toggleId + '_' + scenarioId);
    return element ? element.classList.contains('active') : false;
}

// Generic array utility functions
export function findById(array, id) {
    return array.find(item => item.id === id);
}

export function removeById(array, id) {
    return array.filter(item => item.id !== id);
}

// Validation utilities
export function isValidNumber(value) {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// Date utilities
export function formatDate(date) {
    return new Intl.DateTimeFormat('de-DE').format(date);
}

export function addYears(date, years) {
    const newDate = new Date(date);
    newDate.setFullYear(newDate.getFullYear() + years);
    return newDate;
}

// Math utilities
export function roundToDecimal(value, decimals) {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

export function percentage(value, total) {
    return total !== 0 ? (value / total) * 100 : 0;
}

// Object utilities
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

export function mergeObjects(target, source) {
    return Object.assign({}, target, source);
}