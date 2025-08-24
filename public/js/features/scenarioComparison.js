// scenarioComparison.js - Basic Scenario Comparison Module
import { scenarioColors as baseScenarioColors } from '../state.js';
class ScenarioComparisonManager {
    constructor() {
        this.charts = {};
        this.currentChartView = 'lifecycle';
        // Base scenarios registry powering charts/table/overview
        const scColors = baseScenarioColors || { 'A': '#3498db', 'B': '#27ae60', 'C': '#e74c3c', 'D': '#f39c12' };
        this.scenarioConfigs = [
            {
                id: 'optimistic',
                label: '🎯 Optimistisch',
                color: scColors['A'] || '#3498db',
                // Sample values to render table and charts
                params: {
                    budget: { income: 4000, expenses: 3000, savingsRate: 25, inflation: 2.2 },
                    accumulation: { returnRate: 8.5, years: 30, monthlySavings: 1000 },
                    withdrawal: { rate: 4, years: 25, taxRate: 26.375, partialExemption: 30 },
                    results: { finalWealth: '1.2 Mio €', maxDrawdown: -28 }
                },
                lifecycleData: [100, 220, 470, 820, 1200, 1000],
                accumulationData: [50, 120, 280, 500, 820],
                withdrawalData: [1200, 1000, 800, 600, 400, 200],
                metricsData: [9, 6, 7, 8, 7]
            },
            {
                id: 'conservative',
                label: '🛡️ Konservativ',
                color: scColors['B'] || '#27ae60',
                params: {
                    budget: { income: 3500, expenses: 2800, savingsRate: 15, inflation: 2.2 },
                    accumulation: { returnRate: 5.5, years: 25, monthlySavings: 500 },
                    withdrawal: { rate: 3, years: 30, taxRate: 26.375, partialExemption: 30 },
                    results: { finalWealth: '800k €', maxDrawdown: -12 }
                },
                lifecycleData: [100, 160, 270, 420, 600, 500],
                accumulationData: [40, 90, 180, 300, 420],
                withdrawalData: [600, 520, 440, 360, 280, 200],
                metricsData: [6, 9, 8, 7, 8]
            }
        ];
        this.activeScenarios = new Set(this.scenarioConfigs.map(s => s.id));
        this.initializeEventListeners();
        this.initializeCharts();
        this.initializeLayout();
    }

    initializeEventListeners() {
        // Phase pills navigation
        document.querySelectorAll('#comparisonPhasePills .pill').forEach(pill => {
            pill.addEventListener('click', () => this.handlePhaseNavigation(pill));
        });

        // Parameter section toggles
        document.querySelectorAll('.toggle-icon').forEach(toggleIcon => {
            toggleIcon.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const header = toggleIcon.closest('.param-header');
                if (header) {
                    this.toggleParameterSection(header);
                }
            });
        });

        // Make entire param headers clickable
        document.querySelectorAll('.param-header[data-toggle]').forEach(header => {
            header.addEventListener('click', (e) => {
                // Don't trigger if clicking on buttons inside the header
                if (e.target.closest('.btn-import')) {
                    return;
                }
                e.preventDefault();
                this.toggleParameterSection(header);
            });
        });

        // Chart view toggles
        document.querySelectorAll('.chart-view-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchChartView(btn));
        });

        // Table filters
        document.querySelectorAll('#comparisonTableFilters .filter-btn').forEach(btn => {
            btn.addEventListener('click', () => this.filterComparisonTable(btn));
        });

        // Scenario visibility toggles (support dynamic scenarios via delegation)
        const visibilityContainer = document.querySelector('.scenario-visibility');
        if (visibilityContainer) {
            visibilityContainer.addEventListener('change', (e) => {
                const checkbox = e.target;
                if (checkbox && checkbox.matches('input[type="checkbox"]')) {
                    this.toggleScenarioVisibility(checkbox);
                }
            });
            // Attach data attributes to initial checkboxes if missing
            const labels = visibilityContainer.querySelectorAll('label');
            labels.forEach(label => {
                const input = label.querySelector('input[type="checkbox"]');
                if (!input) return;
                if (label.textContent.includes('Optimistisch')) input.dataset.scenario = 'optimistic';
                if (label.textContent.includes('Konservativ')) input.dataset.scenario = 'conservative';
            });
        }

        // Scenario chooser buttons
        document.querySelectorAll('.btn-scenario').forEach(btn => {
            btn.addEventListener('click', () => this.selectScenario(btn));
        });

        // Action buttons
        document.querySelector('.comparison-btn.btn-load')?.addEventListener('click', () => this.loadTemplate());
        document.querySelector('.comparison-btn.btn-save')?.addEventListener('click', () => this.saveConfiguration());
        document.querySelector('.comparison-btn.btn-export')?.addEventListener('click', () => this.exportData());
    }

    handlePhaseNavigation(pill) {
        // Update active pill
        document.querySelectorAll('#comparisonPhasePills .pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        // Show corresponding section
        const target = pill.dataset.target;
        this.scrollToSection(target);
    }

    scrollToSection(target) {
        const sections = {
            'budget': '#comparisonBudgetSection',
            'accumulation': '#comparisonAccumSection',
            'withdrawal': '#comparisonWithdrawSection'
        };

        const selector = sections[target];
        if (selector) {
            const element = document.querySelector(selector);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // Ensure section is expanded
                const grid = element.querySelector('.param-grid');
                if (grid && !grid.classList.contains('active')) {
                    grid.classList.add('active');
                }
            }
        }
    }

    toggleParameterSection(header) {
        const toggle = header.getAttribute('data-toggle');
        const grid = document.getElementById(toggle);
        const toggleIcon = header.querySelector('.toggle-icon');
        
        if (grid) {
            grid.classList.toggle('active');
            
            // Update toggle icon
            if (toggleIcon) {
                toggleIcon.textContent = grid.classList.contains('active') ? '▲' : '▼';
            }
        }
    }

    switchChartView(btn) {
        // Update active button
        document.querySelectorAll('.chart-view-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update chart view
        const view = btn.dataset.view;
        this.currentChartView = view;

        document.querySelectorAll('.comparison-chart-view').forEach(chartView => {
            chartView.classList.remove('active');
        });

        const targetView = document.getElementById(`comparison${view.charAt(0).toUpperCase() + view.slice(1)}View`);
        if (targetView) {
            targetView.classList.add('active');
            // Update chart if needed
            this.updateChart(view);
        }
    }

    filterComparisonTable(btn) {
        // Update active filter
        document.querySelectorAll('#comparisonTableFilters .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const category = btn.dataset.category;
        
        // Handle Group Headers
        document.querySelectorAll('#comparisonTable tbody .group-header').forEach(headerRow => {
            headerRow.style.display = (category === 'all') ? '' : 'none';
        });

        // Handle Data Rows
        document.querySelectorAll('#comparisonTable tbody tr:not(.group-header)').forEach(row => {
            row.style.display = (category === 'all' || row.dataset.category === category) ? '' : 'none';
        });
    }

    toggleScenarioVisibility(checkbox) {
        const scenarioName = checkbox.dataset.scenario
            || (checkbox.parentElement.textContent.includes('Optimistisch') ? 'optimistic' : 'conservative');
        
        if (checkbox.checked) {
            this.activeScenarios.add(scenarioName);
        } else {
            this.activeScenarios.delete(scenarioName);
        }

        // Update all charts
        this.updateAllCharts();
    }

    selectScenario(btn) {
        if (btn.classList.contains('btn-new')) {
            this.createNewScenario();
        } else {
            // Update active scenario
            document.querySelectorAll('.btn-scenario:not(.btn-new)').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update layout border color based on selected scenario
            const scenarioType = btn.getAttribute('data-scenario');
            console.log(`Scenario clicked: ${scenarioType}`);
            this.updateLayoutBorder(scenarioType);
        }
    }

    updateLayoutBorder(scenarioType) {
        const layout = document.getElementById('comparisonLayout');
        if (!layout) return;
        
        // Remove existing scenario classes
        layout.classList.remove('scenario-optimistic', 'scenario-conservative');
        
        // Add new scenario class based on selection
        if (scenarioType === 'optimistic') {
            layout.classList.add('scenario-optimistic');
        } else if (scenarioType === 'conservative') {
            layout.classList.add('scenario-conservative');
        }
        
        console.log(`Layout border updated to: ${scenarioType}`);
    }

    initializeLayout() {
        // Set initial layout border based on active scenario
        const activeScenarioBtn = document.querySelector('.btn-scenario.active');
        if (activeScenarioBtn) {
            const scenarioType = activeScenarioBtn.getAttribute('data-scenario');
            console.log(`Initializing layout with scenario: ${scenarioType}`);
            this.updateLayoutBorder(scenarioType);
        } else {
            console.log('No active scenario button found during initialization');
        }
    }

    initializeCharts() {
        // Destroy existing charts first
        this.destroyAllCharts();
        
        // Initialize Chart.js charts with sample data
        this.createLifecycleChart();
        this.createAccumulationChart();
        this.createWithdrawalChart();
        this.createMetricsChart();
    }

    destroyAllCharts() {
        // Destroy all existing charts to prevent canvas reuse errors
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts = {};
    }

    createLifecycleChart() {
        try {
            const ctx = document.getElementById('comparisonLifecycleChart');
            if (!ctx) {
                console.warn('Canvas element comparisonLifecycleChart not found');
                return;
            }

            // Destroy existing chart if it exists
            if (this.charts.lifecycle) {
                this.charts.lifecycle.destroy();
            }

            const datasets = this.scenarioConfigs.map(sc => ({
                label: sc.label,
                data: sc.lifecycleData,
                borderColor: sc.color,
                backgroundColor: this.hexToRgba(sc.color, 0.1),
                tension: 0.3,
                pointBackgroundColor: sc.color,
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                _scenarioId: sc.id
            }));

            this.charts.lifecycle = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['2025', '2030', '2035', '2040', '2045', '2050'],
                datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: 'Vermögen (€)'
                        },
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: {
                            callback: function(value) {
                                return new Intl.NumberFormat('de-DE', {
                                    style: 'currency',
                                    currency: 'EUR',
                                    notation: 'compact',
                                    maximumFractionDigits: 0
                                }).format(value * 1000);
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Jahr'
                        },
                        grid: { color: 'rgba(0,0,0,0.03)' }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
        } catch (error) {
            console.error('Error creating lifecycle chart:', error);
        }
    }

    createAccumulationChart() {
        const ctx = document.getElementById('comparisonAccumulationChart');
        if (!ctx) return;

        // Destroy existing chart if it exists
        if (this.charts.accumulation) {
            this.charts.accumulation.destroy();
        }

        const datasets = this.scenarioConfigs.map(sc => ({
            label: sc.label,
            data: sc.accumulationData,
            backgroundColor: sc.color,
            borderRadius: 8,
            _scenarioId: sc.id
        }));

        this.charts.accumulation = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Jahr 5', 'Jahr 10', 'Jahr 15', 'Jahr 20', 'Jahr 25'],
                datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    }
                },
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: 'Vermögen (€)'
                        },
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: {
                            callback: function(value) {
                                return new Intl.NumberFormat('de-DE', {
                                    style: 'currency',
                                    currency: 'EUR',
                                    notation: 'compact',
                                    maximumFractionDigits: 0
                                }).format(value * 1000);
                            }
                        }
                    },
                    x: {
                        grid: { color: 'rgba(0,0,0,0.03)' }
                    }
                }
            }
        });
    }

    createWithdrawalChart() {
        const ctx = document.getElementById('comparisonWithdrawalChart');
        if (!ctx) return;

        // Destroy existing chart if it exists
        if (this.charts.withdrawal) {
            this.charts.withdrawal.destroy();
        }

        const datasets = this.scenarioConfigs.map(sc => ({
            label: sc.label,
            data: sc.withdrawalData,
            borderColor: sc.color,
            backgroundColor: this.hexToRgba(sc.color, 0.1),
            tension: 0.3,
            fill: true,
            _scenarioId: sc.id
        }));

        this.charts.withdrawal = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jahr 1', 'Jahr 5', 'Jahr 10', 'Jahr 15', 'Jahr 20', 'Jahr 25'],
                datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    }
                },
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: 'Verbleibendes Kapital (€)'
                        },
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Entnahmejahr'
                        },
                        grid: { color: 'rgba(0,0,0,0.03)' }
                    }
                }
            }
        });
    }

    createMetricsChart() {
        const ctx = document.getElementById('comparisonMetricsChart');
        if (!ctx) return;

        // Destroy existing chart if it exists
        if (this.charts.metrics) {
            this.charts.metrics.destroy();
        }

        const datasets = this.scenarioConfigs.map(sc => ({
            label: sc.label,
            data: sc.metricsData,
            borderColor: sc.color,
            backgroundColor: this.hexToRgba(sc.color, 0.2),
            pointBackgroundColor: sc.color,
            _scenarioId: sc.id
        }));

        this.charts.metrics = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Rendite', 'Risiko', 'Liquidität', 'Flexibilität', 'Steuereffizienz'],
                datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 10,
                        grid: { color: 'rgba(0,0,0,0.1)' },
                        pointLabels: { font: { size: 12 } }
                    }
                }
            }
        });
    }

    updateChart(chartType) {
        const chart = this.charts[chartType];
        if (!chart) return;

        // Update chart visibility based on active scenarios
        chart.data.datasets.forEach((dataset) => {
            const id = dataset._scenarioId || '';
            dataset.hidden = !this.activeScenarios.has(id);
        });

        chart.update('none');
    }

    updateAllCharts() {
        Object.keys(this.charts).forEach(chartType => {
            this.updateChart(chartType);
        });
    }

    // Helpers
    hexToRgba(hex, alpha) {
        const m = hex.replace('#', '');
        const bigint = parseInt(m.length === 3 ? m.split('').map(ch => ch + ch).join('') : m, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return `rgba(${r},${g},${b},${alpha})`;
    }

    // Placeholder methods for future functionality
    loadTemplate() {
        console.log('Loading template - placeholder');
        // TODO: Implement template loading
    }

    saveConfiguration() {
        console.log('Saving configuration - placeholder');
        // TODO: Implement configuration saving
    }

    exportData() {
        console.log('Exporting data - placeholder');
        // TODO: Implement data export
    }

    createNewScenario() {
        // Enforce maximum of 5 scenarios total
        if (this.scenarioConfigs.length >= 5) {
            alert('⚠️ Maximal 5 Szenarien im Vergleich erlaubt.');
            return;
        }

        // Derive a new scenario from conservative as baseline
        const base = this.scenarioConfigs.find(s => s.id === 'conservative') || this.scenarioConfigs[0];
        const existingCustom = this.scenarioConfigs.filter(s => s.id.startsWith('custom-')).length;
        const newId = `custom-${existingCustom + 1}`;
        const newIndex = this.scenarioConfigs.length + 1;
        // Use same palette as Ansparphase (A-D), try C, then D, then E if present, else a fallback
        const scColors = baseScenarioColors || { 'A': '#3498db', 'B': '#27ae60', 'C': '#e74c3c', 'D': '#f39c12' };
        const colorOrder = ['C', 'D', 'E'];
        const pick = colorOrder[existingCustom] || 'D';
        const color = scColors[pick] || '#8e44ad';

        const cloned = (arr) => arr.map(v => Math.round(v * (0.95 + Math.random() * 0.1)));

        const newScenario = {
            id: newId,
            label: `✨ Szenario ${newIndex}`,
            color,
            params: {
                budget: { ...base.params.budget },
                accumulation: { ...base.params.accumulation },
                withdrawal: { ...base.params.withdrawal },
                results: { ...base.params.results }
            },
            lifecycleData: cloned(base.lifecycleData),
            accumulationData: cloned(base.accumulationData),
            withdrawalData: cloned(base.withdrawalData),
            metricsData: base.metricsData.map(v => Math.max(1, Math.min(10, Math.round(v + (Math.random() * 2 - 1)))))
        };

        this.scenarioConfigs.push(newScenario);
        this.activeScenarios.add(newScenario.id);

        // UI: add selectable button before "+ Neues Szenario"
        const chooser = document.querySelector('.scenario-chooser');
        if (chooser) {
            const newBtn = document.createElement('button');
            newBtn.className = 'btn-scenario';
            newBtn.setAttribute('data-scenario', newScenario.id);
            newBtn.textContent = newScenario.label;
            const addBtn = chooser.querySelector('.btn-scenario.btn-new');
            chooser.insertBefore(newBtn, addBtn);
            newBtn.addEventListener('click', () => this.selectScenario(newBtn));
        }

        // UI: add summary card
        const cards = document.querySelector('.summary-cards');
        if (cards) {
            const card = document.createElement('div');
            card.className = 'summary-card';
            card.style.borderTop = `4px solid ${newScenario.color}`;
            card.innerHTML = `
                <h4>${newScenario.label}</h4>
                <div class="kv-container">
                    <div class="kv">
                        <span class="k">Endvermögen</span><span class="v">${newScenario.params.results.finalWealth}</span>
                        <span class="k">Ø Rendite</span><span class="v">${newScenario.params.accumulation.returnRate}%</span>
                        <span class="k">Sparquote</span><span class="v">${newScenario.params.budget.savingsRate}%</span>
                        <span class="k">Entnahmerate</span><span class="v">${newScenario.params.withdrawal.rate}%</span>
                    </div>
                    <div class="kv">
                        <span class="k">Risikoprofil</span><span class="v">Mittel</span>
                        <span class="k">Max. Drawdown</span><span class="v">${newScenario.params.results.maxDrawdown}%</span>
                        <span class="k">Wahrsch. 30y Erfolg</span><span class="v">—</span>
                    </div>
                </div>`;
            cards.appendChild(card);
        }

        // UI: add visibility checkbox
        const vis = document.querySelector('.scenario-visibility');
        if (vis) {
            const label = document.createElement('label');
            label.innerHTML = `<input type="checkbox" checked data-scenario="${newScenario.id}" />${newScenario.label}`;
            vis.appendChild(label);
        }

        // Charts: rebuild with new datasets and respect activeScenarios
        this.initializeCharts();
        this.updateAllCharts();

        // Table: add a new column for the scenario
        this.addScenarioColumnToTable(newScenario);
    }

    addScenarioColumnToTable(sc) {
        const table = document.getElementById('comparisonTable');
        if (!table) return;

        // Header
        const headerRow = table.querySelector('thead tr');
        if (headerRow) {
            const th = document.createElement('th');
            th.textContent = sc.label;
            headerRow.appendChild(th);
        }

        // Increase group header colspan
        table.querySelectorAll('tbody tr.group-header th[colspan]').forEach(th => {
            const span = parseInt(th.getAttribute('colspan') || '3', 10);
            th.setAttribute('colspan', String(span + 1));
        });

        // Map parameter names to values
        const getValue = (row) => {
            const category = row.getAttribute('data-category') || '';
            const key = (row.querySelector('td')?.textContent || '').toLowerCase();
            try {
                if (category === 'budget') {
                    if (key.includes('einkommen')) return String(sc.params.budget.income);
                    if (key.includes('ausgaben')) return String(sc.params.budget.expenses);
                    if (key.includes('sparquote')) return `${sc.params.budget.savingsRate}%`;
                    if (key.includes('inflation')) return `${sc.params.budget.inflation}%`;
                }
                if (category === 'accumulation') {
                    if (key.includes('rendite')) return `${sc.params.accumulation.returnRate}%`;
                    if (key.includes('dauer')) return String(sc.params.accumulation.years);
                    if (key.includes('monatl')) return new Intl.NumberFormat('de-DE').format(sc.params.accumulation.monthlySavings);
                }
                if (category === 'withdrawal') {
                    if (key.includes('entnahmerate')) return `${sc.params.withdrawal.rate}%`;
                    if (key.includes('dauer')) return String(sc.params.withdrawal.years);
                }
                if (category === 'results') {
                    if (key.includes('endvermögen')) return sc.params.results.finalWealth;
                    if (key.includes('drawdown')) return `${sc.params.results.maxDrawdown}%`;
                }
            } catch (_) { /* ignore */ }
            return '—';
        };

        table.querySelectorAll('tbody tr:not(.group-header)').forEach(row => {
            const td = document.createElement('td');
            td.textContent = getValue(row);
            row.appendChild(td);
        });
    }
}

export default ScenarioComparisonManager;

// Initialize the scenario comparison manager when the DOM is loaded (only once)
let scenarioManagerInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're on the scenario comparison page
    if (document.querySelector('.scenario-comparison') && !scenarioManagerInstance) {
        try {
            scenarioManagerInstance = new ScenarioComparisonManager();
        } catch (error) {
            console.error('Error initializing ScenarioComparisonManager:', error);
        }
    }
});
