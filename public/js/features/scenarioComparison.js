// scenarioComparison.js - Basic Scenario Comparison Module
class ScenarioComparisonManager {
    constructor() {
        this.charts = {};
        this.currentChartView = 'lifecycle';
        this.activeScenarios = new Set(['optimistic', 'conservative']);
        this.initializeEventListeners();
        this.initializeCharts();
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

        // Scenario visibility toggles
        document.querySelectorAll('.scenario-visibility input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.toggleScenarioVisibility(checkbox));
        });

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
        const scenarioName = checkbox.parentElement.textContent.includes('Optimistisch') ? 'optimistic' : 'conservative';
        
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
        }
    }

    initializeCharts() {
        // Initialize Chart.js charts with sample data
        this.createLifecycleChart();
        this.createAccumulationChart();
        this.createWithdrawalChart();
        this.createMetricsChart();
    }

    createLifecycleChart() {
        const ctx = document.getElementById('comparisonLifecycleChart');
        if (!ctx) return;

        this.charts.lifecycle = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['2025', '2030', '2035', '2040', '2045', '2050'],
                datasets: [
                    {
                        label: '🎯 Optimistisch',
                        data: [100, 220, 470, 820, 1200, 1000],
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52,152,219,0.1)',
                        tension: 0.3,
                        pointBackgroundColor: '#3498db',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2
                    },
                    {
                        label: '🛡️ Konservativ',
                        data: [100, 160, 270, 420, 600, 500],
                        borderColor: '#27ae60',
                        backgroundColor: 'rgba(39,174,96,0.1)',
                        tension: 0.3,
                        pointBackgroundColor: '#27ae60',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2
                    }
                ]
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
    }

    createAccumulationChart() {
        const ctx = document.getElementById('comparisonAccumulationChart');
        if (!ctx) return;

        this.charts.accumulation = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Jahr 5', 'Jahr 10', 'Jahr 15', 'Jahr 20', 'Jahr 25'],
                datasets: [
                    {
                        label: '🎯 Optimistisch',
                        data: [50, 120, 280, 500, 820],
                        backgroundColor: '#3498db',
                        borderRadius: 8
                    },
                    {
                        label: '🛡️ Konservativ',
                        data: [40, 90, 180, 300, 420],
                        backgroundColor: '#27ae60',
                        borderRadius: 8
                    }
                ]
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

        this.charts.withdrawal = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jahr 1', 'Jahr 5', 'Jahr 10', 'Jahr 15', 'Jahr 20', 'Jahr 25'],
                datasets: [
                    {
                        label: '🎯 Optimistisch',
                        data: [1200, 1000, 800, 600, 400, 200],
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52,152,219,0.1)',
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: '🛡️ Konservativ',
                        data: [600, 520, 440, 360, 280, 200],
                        borderColor: '#27ae60',
                        backgroundColor: 'rgba(39,174,96,0.1)',
                        tension: 0.3,
                        fill: true
                    }
                ]
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

        this.charts.metrics = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Rendite', 'Risiko', 'Liquidität', 'Flexibilität', 'Steuereffizienz'],
                datasets: [
                    {
                        label: '🎯 Optimistisch',
                        data: [9, 6, 7, 8, 7],
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52,152,219,0.2)',
                        pointBackgroundColor: '#3498db'
                    },
                    {
                        label: '🛡️ Konservativ',
                        data: [6, 9, 8, 7, 8],
                        borderColor: '#27ae60',
                        backgroundColor: 'rgba(39,174,96,0.2)',
                        pointBackgroundColor: '#27ae60'
                    }
                ]
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
        chart.data.datasets.forEach((dataset, index) => {
            const scenarioName = index === 0 ? 'optimistic' : 'conservative';
            dataset.hidden = !this.activeScenarios.has(scenarioName);
        });

        chart.update('none');
    }

    updateAllCharts() {
        Object.keys(this.charts).forEach(chartType => {
            this.updateChart(chartType);
        });
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
        console.log('Creating new scenario - placeholder');
        // TODO: Implement new scenario creation
    }
}

export default ScenarioComparisonManager;