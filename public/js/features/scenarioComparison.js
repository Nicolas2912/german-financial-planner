// scenarioComparison.js - Basic Scenario Comparison Module
import { scenarioColors as baseScenarioColors } from '../state.js';
import { calculateWealthDevelopment } from '../core/accumulation.js';
import { calculateDirectAnnuityPayment } from '../core/withdrawal.js';
class ScenarioComparisonManager {
    constructor() {
        this.charts = {};
        this.currentChartView = 'lifecycle';
        // Track selected budget profile for toggle/deselect behavior
        this.selectedBudgetProfileKey = null;
        // Track selected import items for checkmark display
        this.selectedBudgetProfileKey = this.selectedBudgetProfileKey || null;
        this.selectedAccumScenarioKey = null;
        this.selectedWithdrawScenarioKey = null;

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
                    results: { finalWealth: '1.2 Mio €' },
                    sources: { budgetName: '—', accumName: '—', withdrawName: '—' }
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
                    results: { finalWealth: '800k €' },
                    sources: { budgetName: '—', accumName: '—', withdrawName: '—' }
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
        // Apply accent colors to scenario buttons (borders + active fill)
        this.applyScenarioButtonAccents();

        // Bind inputs and initialize with active scenario values
        this.bindParameterInputs();
        this.populateInputsFromActiveScenario();
        this.updateAllSummaries();
        // Ensure the budget readonly area uses the same card layout even
        // when no profile is selected yet
        this.renderEmptyBudgetCards();
        // And ensure accumulation/withdrawal placeholders are visible
        this.renderEmptyAccumCards();
        this.renderEmptyWithdrawCards();

        // Attach edit actions to initial cards (optimistic, conservative)
        try {
            const initCards = document.querySelectorAll('.summary-cards .summary-card');
            if (initCards[0]) this.attachCardActions(initCards[0], 'optimistic');
            if (initCards[1]) this.attachCardActions(initCards[1], 'conservative');
        } catch (_) {}
    }

    // Create a scenario from the current left-side selections and add to overview
    addSelectionAsScenario() {
        if (this.scenarioConfigs.length >= 5) {
            alert('⚠️ Maximal 5 Szenarien im Vergleich erlaubt.');
            return;
        }

        const loadJson = (key) => { try { return key ? JSON.parse(localStorage.getItem(key) || '{}') : null; } catch { return null; } };
        const getName = (prefix, key, data) => {
            if (!key) return '—';
            const n = data?.name || key.replace(prefix, '');
            return n || '—';
        };

        const accData = loadJson(this.selectedAccumScenarioKey);
        const wdData = loadJson(this.selectedWithdrawScenarioKey);
        const budData = loadJson(this.selectedBudgetProfileKey);

        const accP = accData?.scenario?.parameters || accData?.parameters || {};
        const wdP = wdData?.scenario?.parameters || wdData?.parameters || {};
        const num = (v, d=0) => (typeof v === 'number' && !isNaN(v)) ? v : (parseFloat(String(v||'').replace(/\./g,'').replace(',','.')) || d);

        const accumulation = {
            returnRate: num(accP.annualReturn, 0),
            years: parseInt(accP.duration ?? 0) || 0,
            initialCapital: num(accP.initialCapital, 0),
            monthlySavings: num(accP.monthlySavings, 0)
        };
        const withdrawal = {
            rate: num(wdP.withdrawalRate ?? wdP.rate, 0),
            years: parseInt(wdP.duration ?? wdP.withdrawalYears ?? wdP.years ?? 0) || 0,
            taxRate: 26.375,
            partialExemption: 30
        };
        const budget = {
            income: 0,
            expenses: 0,
            savingsRate: 0,
            inflation: num(budData?.budgetData?.inflationRate ?? budData?.inflation ?? 2.0, 2.0)
        };

        const existingCustom = this.scenarioConfigs.filter(s => s.id.startsWith('custom-')).length;
        const newId = `custom-${existingCustom + 1}`;
        const newIndex = this.scenarioConfigs.length + 1;
        const scColors = baseScenarioColors || { 'A': '#3498db', 'B': '#27ae60', 'C': '#e74c3c', 'D': '#f39c12' };
        const pickOrder = ['C','D','E'];
        const pick = pickOrder[existingCustom] || 'D';
        const color = scColors[pick] || '#8e44ad';

        const label = `✨ Szenario ${newIndex}`;
        const sources = {
            budgetName: getName('budgetProfile_', this.selectedBudgetProfileKey, budData),
            accumName: getName('ansparphaseScenario_', this.selectedAccumScenarioKey, accData),
            withdrawName: getName('entnahmephaseScenario_', this.selectedWithdrawScenarioKey, wdData)
        };

        const newScenario = {
            id: newId,
            label,
            color,
            params: {
                budget,
                accumulation,
                withdrawal,
                results: { finalWealth: '—' },
                sources
            },
            lifecycleData: [100, 150, 220, 330, 480, 600],
            accumulationData: [30, 70, 140, 240, 380],
            withdrawalData: [600, 520, 440, 360, 280, 200],
            metricsData: [7, 7, 7, 7, 7]
        };

        try { newScenario.params.results.finalWealth = this.computeFinalWealth(newScenario); } catch {}

        this.scenarioConfigs.push(newScenario);
        this.activeScenarios.add(newScenario.id);
        this.insertScenarioUI(newScenario);
        this.initializeCharts();
        this.updateAllCharts();
        this.addScenarioColumnToTable(newScenario);
    }

    insertScenarioUI(newScenario) {
        const chooser = document.querySelector('.scenario-chooser');
        if (chooser) {
            const newBtn = document.createElement('button');
            newBtn.className = 'btn-scenario';
            newBtn.setAttribute('data-scenario', newScenario.id);
            newBtn.textContent = newScenario.label;
            newBtn.style.setProperty('--scenario-accent', newScenario.color);
            newBtn.style.setProperty('--scenario-accent-light', this.hexToRgba(newScenario.color, 0.15));
            const addBtn = chooser.querySelector('.btn-scenario.btn-new');
            chooser.insertBefore(newBtn, addBtn);
            newBtn.addEventListener('click', () => this.selectScenario(newBtn));
        }

        const cards = document.querySelector('.summary-cards');
        if (cards) {
            const card = document.createElement('div');
            card.className = 'summary-card';
            card.style.setProperty('--accent-color', newScenario.color);
            const riskLabel = 'Mittel';
            const riskClass = 'risk-medium';
            const fmt = new Intl.NumberFormat('de-DE');
            card.setAttribute('data-scenario-id', newScenario.id);
            card.innerHTML = `
                <div class="summary-compact">
                    <div class="top">
                        <h4>${newScenario.label}</h4>
                        <span class="risk-badge ${riskClass}">${riskLabel}</span>
                    </div>
                    <div class="sources">
                        <span class="chip chip-budget">${newScenario.params.sources.budgetName || '—'}</span>
                        <span class="chip chip-accum">${newScenario.params.sources.accumName || '—'}</span>
                        <span class="chip chip-withdraw">${newScenario.params.sources.withdrawName || '—'}</span>
                    </div>
                    <div class="headline">
                        <span class="headline-value">${newScenario.params.results.finalWealth}</span>
                    </div>
                    <div class="meta">
                        <span class="metric">${newScenario.params.accumulation.returnRate}% Rendite</span>
                        <span class="dot">•</span>
                        <span class="metric">${newScenario.params.accumulation.years}J Sparphase</span>
                        <span class="dot">•</span>
                        <span class="metric">${newScenario.params.withdrawal.years}J Entnahme</span>
                        <span class="dot">•</span>
                        <span class="break"></span>
                        <span class="metric">${fmt.format(newScenario.params.accumulation.monthlySavings || 0)} € /M</span>
                        <span class="dot">•</span>
                        <span class="metric">${newScenario.params.withdrawal.rate}% Entnahme</span>
                    </div>
                </div>`;
            cards.appendChild(card);
            this.attachCardActions(card, newScenario.id);
        }

        const vis = document.querySelector('.scenario-visibility');
        if (vis) {
            const label = document.createElement('label');
            label.innerHTML = `<input type="checkbox" checked data-scenario="${newScenario.id}" />${newScenario.label}`;
            vis.appendChild(label);
            const input = label.querySelector('input');
            input?.addEventListener('change', () => this.toggleScenarioVisibility(input));
        }
    }

    attachCardActions(card, scenarioId) {
        const top = card.querySelector('.top');
        if (!top) return;
        if (!card.getAttribute('data-scenario-id')) card.setAttribute('data-scenario-id', scenarioId);
        const wrap = document.createElement('div');
        wrap.style.display = 'flex';
        wrap.style.gap = '6px';
        wrap.style.marginLeft = '8px';
        const btnEdit = document.createElement('button');
        btnEdit.textContent = '✏️';
        btnEdit.title = 'Umbenennen';
        btnEdit.style.border = '0';
        btnEdit.style.background = 'transparent';
        btnEdit.style.cursor = 'pointer';
        const btnRefresh = document.createElement('button');
        btnRefresh.textContent = '⟲';
        btnRefresh.title = 'Mit Auswahl aktualisieren';
        btnRefresh.style.border = '0';
        btnRefresh.style.background = 'transparent';
        btnRefresh.style.cursor = 'pointer';
        const btnDelete = document.createElement('button');
        btnDelete.textContent = '🗑️';
        btnDelete.title = 'Szenario entfernen';
        btnDelete.style.border = '0';
        btnDelete.style.background = 'transparent';
        btnDelete.style.cursor = 'pointer';
        wrap.appendChild(btnEdit);
        wrap.appendChild(btnRefresh);
        wrap.appendChild(btnDelete);
        top.appendChild(wrap);

        btnEdit.addEventListener('click', () => this.renameScenarioInline(scenarioId, card));
        btnRefresh.addEventListener('click', () => this.updateScenarioFromSelection(scenarioId, card));
        btnDelete.addEventListener('click', () => this.removeScenarioById(scenarioId));
    }

    removeScenarioById(id) {
        const sc = this.scenarioConfigs.find(s => s.id === id);
        if (!sc) return;
        const ok = confirm(`Szenario "${sc.label}" wirklich entfernen?`);
        if (!ok) return;

        // Remove from registry and active set
        this.scenarioConfigs = this.scenarioConfigs.filter(s => s.id !== id);
        this.activeScenarios.delete(id);

        // Remove card
        const card = document.querySelector(`.summary-cards .summary-card[data-scenario-id="${id}"]`);
        if (card) card.remove();

        // Remove chooser button
        const btn = document.querySelector(`.btn-scenario[data-scenario="${id}"]`);
        if (btn) btn.remove();

        // Remove visibility checkbox
        const visInput = document.querySelector(`.scenario-visibility input[data-scenario="${id}"]`);
        if (visInput && visInput.parentElement) visInput.parentElement.remove();

        // Remove table column matching label (if present)
        const table = document.getElementById('comparisonTable');
        if (table) {
            const headerRow = table.querySelector('thead tr');
            if (headerRow) {
                const ths = Array.from(headerRow.children);
                const colIndex = ths.findIndex(th => (th.textContent || '').trim() === sc.label.trim());
                if (colIndex !== -1) {
                    headerRow.removeChild(ths[colIndex]);
                    table.querySelectorAll('tbody tr').forEach(row => {
                        if (row.classList.contains('group-header')) {
                            const th = row.querySelector('th');
                            if (th) {
                                const span = parseInt(th.getAttribute('colspan') || '3', 10);
                                th.setAttribute('colspan', String(Math.max(1, span - 1)));
                            }
                        } else {
                            const cells = Array.from(row.children);
                            if (cells[colIndex]) row.removeChild(cells[colIndex]);
                        }
                    });
                }
            }
        }

        // Update charts
        this.initializeCharts();
        this.updateAllCharts();
    }

    renameScenarioInline(id, card) {
        const sc = this.scenarioConfigs.find(s => s.id === id);
        if (!sc) return;
        const current = sc.label.replace(/^\p{Emoji_Presentation}\s*/u, '');
        const name = prompt('Neuer Szenario‑Name:', current || sc.label) || sc.label;
        sc.label = name;
        const h4 = card.querySelector('h4');
        if (h4) h4.textContent = name;
        document.querySelectorAll(`.btn-scenario[data-scenario="${id}"]`).forEach(b => b.textContent = name);
        document.querySelectorAll('.scenario-visibility label').forEach(l => {
            const input = l.querySelector('input');
            if (input?.dataset.scenario === id) l.lastChild.nodeValue = name;
        });
        const table = document.getElementById('comparisonTable');
        if (table) {
            const headerRow = table.querySelector('thead tr');
            const idx = this.scenarioConfigs.findIndex(s => s.id === id);
            if (headerRow && idx >= 0) {
                const th = headerRow.children[idx + 1];
                if (th) th.textContent = name;
            }
        }
        Object.values(this.charts).forEach(ch => {
            if (!ch) return;
            ch.data.datasets?.forEach(ds => { if (ds._scenarioId === id) ds.label = name; });
            ch.update?.('none');
        });
    }

    updateScenarioFromSelection(id, card) {
        const sc = this.scenarioConfigs.find(s => s.id === id);
        if (!sc) return;
        const loadJson = (key) => { try { return key ? JSON.parse(localStorage.getItem(key) || '{}') : null; } catch { return null; } };
        const accData = loadJson(this.selectedAccumScenarioKey);
        const wdData = loadJson(this.selectedWithdrawScenarioKey);
        const budData = loadJson(this.selectedBudgetProfileKey);
        const accP = accData?.scenario?.parameters || accData?.parameters || {};
        const wdP = wdData?.scenario?.parameters || wdData?.parameters || {};
        const num = (v, d=0) => (typeof v === 'number' && !isNaN(v)) ? v : (parseFloat(String(v||'').replace(/\./g,'').replace(',','.')) || d);
        sc.params.accumulation.returnRate = num(accP.annualReturn, sc.params.accumulation.returnRate);
        sc.params.accumulation.years = parseInt(accP.duration ?? sc.params.accumulation.years) || sc.params.accumulation.years;
        sc.params.accumulation.initialCapital = num(accP.initialCapital, sc.params.accumulation.initialCapital || 0);
        sc.params.accumulation.monthlySavings = num(accP.monthlySavings, sc.params.accumulation.monthlySavings || 0);
        sc.params.withdrawal.rate = num(wdP.withdrawalRate ?? wdP.rate, sc.params.withdrawal.rate);
        sc.params.withdrawal.years = parseInt(wdP.duration ?? wdP.withdrawalYears ?? wdP.years ?? sc.params.withdrawal.years) || sc.params.withdrawal.years;
        sc.params.budget.inflation = num(budData?.budgetData?.inflationRate ?? budData?.inflation ?? sc.params.budget.inflation, sc.params.budget.inflation);
        sc.params.sources = sc.params.sources || {};
        const getDisplay = (key, data) => (data?.name || (key ? key.replace(/^[^_]+_/, '') : '—'));
        sc.params.sources.budgetName = getDisplay(this.selectedBudgetProfileKey, budData);
        sc.params.sources.accumName = getDisplay(this.selectedAccumScenarioKey, accData);
        sc.params.sources.withdrawName = getDisplay(this.selectedWithdrawScenarioKey, wdData);

        try { sc.params.results.finalWealth = this.computeFinalWealth(sc); } catch {}

        const fmt = new Intl.NumberFormat('de-DE');
        card.querySelector('.headline-value')?.replaceChildren(document.createTextNode(sc.params.results.finalWealth));
        const meta = card.querySelector('.meta');
        if (meta) {
            meta.innerHTML = `
                <span class="metric">${sc.params.accumulation.returnRate}% Rendite</span>
                <span class="dot">•</span>
                <span class="metric">${sc.params.accumulation.years}J Sparphase</span>
                <span class="dot">•</span>
                <span class="metric">${sc.params.withdrawal.years}J Entnahme</span>
                <span class="dot">•</span>
                <span class="break"></span>
                <span class="metric">${fmt.format(sc.params.accumulation.monthlySavings || 0)} € /M</span>
                <span class="dot">•</span>
                <span class="metric">${sc.params.withdrawal.rate}% Entnahme</span>`;
        }
        const chips = card.querySelectorAll('.sources .chip');
        if (chips?.length >= 3) {
            chips[0].textContent = sc.params.sources.budgetName || '—';
            chips[1].textContent = sc.params.sources.accumName || '—';
            chips[2].textContent = sc.params.sources.withdrawName || '—';
        }
        this.updateAllCharts();
    }
    // Render helpers to ensure values show even if static spans are missing
    renderAccumValues(vals) {
        const fmt = new Intl.NumberFormat('de-DE');
        const euros = (n) => `${fmt.format(Math.round(n || 0))} €`;
        const yesNo = (b) => b ? 'Aktiv' : 'Aus';
        const etf = (t) => t === 'distributing' ? 'Ausschüttend' : 'Thesaurierend';

        const buildList = (entries) => `
            <div class="kvv-list">
              ${entries.map(([k,v]) => `
                <div class="kvv-item"><div class="kvv-k">${k}</div><div class="kvv-v">${v}</div></div>
              `).join('')}
            </div>`;
        const group = (title, entries) => `
            <div class="budget-group">
                <div class="budget-chip">${title}</div>
                ${buildList(entries)}
            </div>`;

        const summary = [
          ['Jährliche Rendite (%)', `${vals.annualReturn ?? 0}%`],
          ['Anlagedauer (Jahre)', `${vals.duration ?? 0}`],
          ['Monatliche Sparrate (€)', euros(vals.monthlySavings)],
          ['Startkapital (€)', euros(vals.initialCapital)],
        ];
        const assumptions = [
          ['Inflationsrate (%)', `${vals.inflationRate ?? 0}%`],
          ['Jährliche Gehaltssteigerung (%)', `${vals.salaryGrowth ?? 0}%`],
          ['Deutsche Abgeltungssteuer einbeziehen (25% mit Vorabpauschale)', yesNo(!!vals.includeTax)],
          ['ETF-Typ für Steuerberechnung', etf(vals.etfType)],
        ];
        const salary = [
          ['Aktuelles Brutto‑Jahresgehalt (€)', euros(vals.baseSalary)],
          ['Gehaltssteigerung für Sparrate (%)', `${vals.salaryToSavings ?? 0}%`],
          ['Teilfreistellung bei Aktienfonds anwenden (30% steuerfrei)', yesNo(!!vals.teilfreistellung)],
        ];

        const html = `
            <div class="budget-grid">
                <div class="budget-card summary">${group('Zusammenfassung', summary)}${group('Annahmen', assumptions)}</div>
                <div class="budget-card income">${group('Gehalt', salary)}</div>
            </div>`;

        const container = document.getElementById('accumReadonly');
        if (container) container.innerHTML = html;
    }

    renderWithdrawValues(vals) {
        const fmt = new Intl.NumberFormat('de-DE');
        const euros = (n) => `${fmt.format(Math.round(n || 0))} €`;
        const yesNo = (b) => b ? 'Aktiv' : 'Aus';

        const buildList = (entries) => `
            <div class="kvv-list">
              ${entries.map(([k,v]) => `
                <div class="kvv-item"><div class="kvv-k">${k}</div><div class="kvv-v">${v}</div></div>
              `).join('')}
            </div>`;
        const group = (title, entries) => `
            <div class="budget-group">
                <div class="budget-chip">${title}</div>
                ${buildList(entries)}
            </div>`;

        const params = [
          ['Entnahmedauer (Jahre)', `${vals.withdrawalDuration ?? vals.years ?? 0}`],
          ['Jährliche Rendite im Ruhestand (%)', `${vals.postRetirementReturn ?? vals.return ?? 0}%`],
          ['Inflationsrate (%)', `${vals.withdrawalInflation ?? vals.inflation ?? 0}%`],
          ['Verfügbares Kapital bei Renteneintritt (€)', euros(vals.retirementCapital ?? vals.capital)],
        ];
        const tax = [
          ['Abgeltungssteuer anwenden (25%)', yesNo(!!(vals.withdrawalTaxActive ?? vals.taxActive))],
          ['Teilfreistellung (%)', `${vals.teilfreistellungRate ?? vals.teilRate ?? 0}%`],
        ];

        const html = `
            <div class="budget-grid">
                <div class="budget-card summary">${group('Parameter', params)}</div>
                <div class="budget-card income">${group('Steuern', tax)}</div>
            </div>`;

        const container = document.getElementById('withdrawReadonly');
        if (container) container.innerHTML = html;
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

        // Scenario chooser buttons (toggleable)
        document.querySelectorAll('.btn-scenario').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectScenario(btn);
                this.populateInputsFromActiveScenario();
            });
        });

        // Inject a small clear-selection button if missing
        // Removed: previously injected a separate "Auswahl löschen" button.
        // Users can still deselect by clicking the active scenario again.

        // Action buttons
        document.querySelector('.comparison-btn.btn-load')?.addEventListener('click', () => this.loadTemplate());
        document.querySelector('.comparison-btn.btn-save')?.addEventListener('click', () => this.saveConfiguration());
        document.querySelector('.comparison-btn.btn-export')?.addEventListener('click', () => this.exportData());

        // Budget import menu
        const importBtn = document.getElementById('budgetImportBtn');
        if (importBtn) {
            importBtn.addEventListener('click', () => this.toggleBudgetImportMenu());
        }

        // Accumulation import menu
        const accumImportBtn = document.getElementById('accumImportBtn');
        if (accumImportBtn) {
            accumImportBtn.addEventListener('click', () => this.toggleAccumImportMenu());
        }

        // Withdrawal import menu
        const withdrawImportBtn = document.getElementById('withdrawImportBtn');
        if (withdrawImportBtn) {
            withdrawImportBtn.addEventListener('click', () => this.toggleWithdrawImportMenu());
        }
        
        // Compose: add selection to overview
        const addBtn = document.getElementById('addSelectionToOverview');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.addSelectionAsScenario());
        }
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

    // ============= Accumulation Import (Ansparphase) =============
    toggleAccumImportMenu() {
        const section = document.getElementById('comparisonAccumSection');
        const header = section?.querySelector('.param-header');
        if (!section || !header) return;

        let dropdown = section.querySelector('#accumImportDropdown');
        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.id = 'accumImportDropdown';
            dropdown.style.display = 'none';
            dropdown.style.marginTop = '10px';
            dropdown.style.border = '1px solid #e5e7eb';
            dropdown.style.borderRadius = '8px';
            dropdown.style.padding = '10px';
            dropdown.style.background = '#fff';
            header.after(dropdown);
        }

        const willOpen = (dropdown.style.display === 'none' || dropdown.style.display === '');
        dropdown.style.display = willOpen ? 'block' : 'none';

        const importBtn = document.getElementById('accumImportBtn');
        if (importBtn) importBtn.textContent = willOpen ? 'Importieren ▲' : 'Importieren ▼';

        if (!willOpen) return;

        // Build list from localStorage
        const entries = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('ansparphaseScenario_')) {
                try { entries.push({ key, data: JSON.parse(localStorage.getItem(key) || '{}') }); } catch (_) {}
            }
        }

        dropdown.innerHTML = '<strong style="display:block; margin-bottom:8px; color:#2c3e50;">Ansparphase‑Szenario wählen</strong>';
        const list = document.createElement('div');
        list.id = 'accumImportDropdownList';
        list.style.display = 'flex';
        list.style.flexWrap = 'wrap';
        list.style.gap = '8px';

        if (!entries.length) {
            list.innerHTML = '<div style="color:#7f8c8d">Keine gespeicherten Ansparphase‑Szenarien gefunden.</div>';
        } else {
            entries.sort((a,b) => (a.data?.name || a.key).localeCompare(b.data?.name || b.key));
            entries.forEach(({ key, data }) => {
                const name = (data?.name) || key.replace('ansparphaseScenario_','');
                const btn = document.createElement('button');
                btn.className = 'profile-action-btn profile-load-btn';
                btn.textContent = `📂 ${name}`;
                btn.style.justifySelf = 'start';
                btn.dataset.storageKey = key;
                if (this.selectedAccumScenarioKey === key) btn.classList.add('active');
                btn.addEventListener('click', () => {
                    const isDeselect = (this.selectedAccumScenarioKey === key);
                    this.selectedAccumScenarioKey = isDeselect ? null : key;
                    if (isDeselect) {
                        // Clear values back to placeholders
                        this.renderEmptyAccumCards();
                    } else {
                        this.applyAccumScenarioByKey(key);
                    }
                    this.refreshAccumImportDropdown(true);
                });
                list.appendChild(btn);
            });
        }
        dropdown.appendChild(list);
    }

    refreshAccumImportDropdown(keepOpen = false) {
        const section = document.getElementById('comparisonAccumSection');
        const header = section?.querySelector('.param-header');
        if (!section || !header) return;
        let dropdown = section.querySelector('#accumImportDropdown');
        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.id = 'accumImportDropdown';
            dropdown.style.display = 'none';
            dropdown.style.marginTop = '10px';
            dropdown.style.border = '1px solid #e5e7eb';
            dropdown.style.borderRadius = '8px';
            dropdown.style.padding = '10px';
            dropdown.style.background = '#fff';
            header.after(dropdown);
        }
        const wasOpen = dropdown.style.display !== 'none';
        dropdown.innerHTML = '<strong style="display:block; margin-bottom:8px; color:#2c3e50;">Ansparphase‑Szenario wählen</strong>';
        const list = document.createElement('div');
        list.id = 'accumImportDropdownList';
        list.style.display = 'flex';
        list.style.flexWrap = 'wrap';
        list.style.gap = '8px';
        const entries = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('ansparphaseScenario_')) {
                try { entries.push({ key, data: JSON.parse(localStorage.getItem(key) || '{}') }); } catch (_) {}
            }
        }
        entries.sort((a,b) => (a.data?.name || a.key).localeCompare(b.data?.name || b.key));
        entries.forEach(({ key, data }) => {
            const name = (data?.name) || key.replace('ansparphaseScenario_','');
            const btn = document.createElement('button');
            btn.className = 'profile-action-btn profile-load-btn';
            btn.textContent = `📂 ${name}`;
            btn.dataset.storageKey = key;
            if (this.selectedAccumScenarioKey === key) btn.classList.add('active');
            btn.addEventListener('click', () => {
                const isDeselect = (this.selectedAccumScenarioKey === key);
                this.selectedAccumScenarioKey = isDeselect ? null : key;
                if (isDeselect) {
                    this.renderEmptyAccumCards();
                } else {
                    this.applyAccumScenarioByKey(key);
                }
                this.refreshAccumImportDropdown(true);
            });
            list.appendChild(btn);
        });
        dropdown.appendChild(list);
        dropdown.style.display = (keepOpen || wasOpen) ? 'block' : 'none';
        const importBtn = document.getElementById('accumImportBtn');
        if (importBtn) importBtn.textContent = dropdown.style.display === 'block' ? 'Importieren ▲' : 'Importieren ▼';
    }

    applyAccumScenarioByKey(key) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return;
            const data = JSON.parse(raw);
            this.applyAccumScenario(data);
        } catch (e) {
            console.warn('Failed to load accumulation scenario by key', key, e);
        }
    }

    applyAccumScenario(data) {
        try {
            // Support both wrapped and direct structures
            const p = data?.scenario?.parameters || data?.parameters || {};
            const num = (v, d=0) => (typeof v === 'number' && !isNaN(v)) ? v : (parseFloat(String(v||'').replace(/\./g,'').replace(',','.')) || d);
            const fmt = new Intl.NumberFormat('de-DE');

            const accReturn = num(p.annualReturn, 0);
            const accYears = parseInt(p.duration ?? 0) || 0;
            const accInitial = num(p.initialCapital, 0);
            const accMonthly = num(p.monthlySavings, 0);
            const inflation = num(p.inflationRate, 0);
            const salaryGrowth = num(p.salaryGrowth, 0);
            const baseSalary = num(p.baseSalary, 0);
            const salaryToSavings = num(p.salaryToSavings, 0);
            const taxActive = !!p.includeTax;
            const teilfrei = !!p.teilfreistellung;
            const etfType = p.etfType === 'distributing' ? 'Ausschüttend' : 'Thesaurierend';

            const byId = (id) => document.getElementById(id);
            byId('accAnnualReturn') && (byId('accAnnualReturn').textContent = `${accReturn}%`);
            byId('accDuration') && (byId('accDuration').textContent = `${accYears}`);
            byId('accMonthlySavings') && (byId('accMonthlySavings').textContent = `${fmt.format(accMonthly)} €`);
            byId('accInitialCapital') && (byId('accInitialCapital').textContent = `${fmt.format(accInitial)} €`);
            byId('accInflation') && (byId('accInflation').textContent = `${inflation}%`);
            byId('accSalaryGrowth') && (byId('accSalaryGrowth').textContent = `${salaryGrowth}%`);
            byId('accTax') && (byId('accTax').textContent = taxActive ? 'Aktiv' : 'Aus');
            byId('accEtfType') && (byId('accEtfType').textContent = etfType);
            byId('accBaseSalary') && (byId('accBaseSalary').textContent = `${fmt.format(baseSalary)} €`);
            byId('accSalaryToSavings') && (byId('accSalaryToSavings').textContent = `${salaryToSavings}%`);
            byId('accTeilfreistellung') && (byId('accTeilfreistellung').textContent = teilfrei ? 'Aktiv' : 'Aus');

            // Force-render the card to avoid any stale placeholders
            this.renderAccumValues({
                annualReturn: accReturn,
                duration: accYears,
                monthlySavings: accMonthly,
                initialCapital: accInitial,
                inflationRate: inflation,
                salaryGrowth,
                includeTax: taxActive,
                etfType: (p.etfType || 'thesaurierend'),
                baseSalary,
                salaryToSavings,
                teilfreistellung: teilfrei,
            });

            // Also update local scenario snapshot for table and summaries
            const id = this.getActiveScenarioId() || 'conservative';
            const sc = this.scenarioConfigs.find(s => s.id === id) || this.scenarioConfigs[0];
            if (sc) {
                sc.params.accumulation.returnRate = accReturn;
                sc.params.accumulation.years = accYears;
                sc.params.accumulation.initialCapital = accInitial;
                sc.params.accumulation.monthlySavings = accMonthly;
            }
            this.updateAllSummaries();
        } catch (e) {
            console.warn('Failed to apply accumulation scenario', e);
        }
    }

    // ============= Withdrawal Import (Entnahmephase) =============
    toggleWithdrawImportMenu() {
        const section = document.getElementById('comparisonWithdrawSection');
        const header = section?.querySelector('.param-header');
        if (!section || !header) return;

        let dropdown = section.querySelector('#withdrawImportDropdown');
        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.id = 'withdrawImportDropdown';
            dropdown.style.display = 'none';
            dropdown.style.marginTop = '10px';
            dropdown.style.border = '1px solid #e5e7eb';
            dropdown.style.borderRadius = '8px';
            dropdown.style.padding = '10px';
            dropdown.style.background = '#fff';
            header.after(dropdown);
        }

        const willOpen = (dropdown.style.display === 'none' || dropdown.style.display === '');
        dropdown.style.display = willOpen ? 'block' : 'none';

        const importBtn = document.getElementById('withdrawImportBtn');
        if (importBtn) importBtn.textContent = willOpen ? 'Importieren ▲' : 'Importieren ▼';

        if (!willOpen) return;

        // Build list from localStorage
        const entries = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('entnahmephaseScenario_')) {
                try { entries.push({ key, data: JSON.parse(localStorage.getItem(key) || '{}') }); } catch (_) {}
            }
        }

        dropdown.innerHTML = '<strong style="display:block; margin-bottom:8px; color:#2c3e50;">Entnahmephase‑Szenario wählen</strong>';
        const list = document.createElement('div');
        list.id = 'withdrawImportDropdownList';
        list.style.display = 'flex';
        list.style.flexWrap = 'wrap';
        list.style.gap = '8px';

        if (!entries.length) {
            list.innerHTML = '<div style="color:#7f8c8d">Keine gespeicherten Entnahmephase‑Szenarien gefunden.</div>';
        } else {
            entries.sort((a,b) => (a.data?.name || a.key).localeCompare(b.data?.name || b.key));
            entries.forEach(({ key, data }) => {
                const name = (data?.name) || key.replace('entnahmephaseScenario_','');
                const btn = document.createElement('button');
                btn.className = 'profile-action-btn profile-load-btn';
                btn.textContent = `📂 ${name}`;
                btn.style.justifySelf = 'start';
                btn.dataset.storageKey = key;
                if (this.selectedWithdrawScenarioKey === key) btn.classList.add('active');
                btn.addEventListener('click', () => {
                    const isDeselect = (this.selectedWithdrawScenarioKey === key);
                    this.selectedWithdrawScenarioKey = isDeselect ? null : key;
                    if (isDeselect) {
                        this.renderEmptyWithdrawCards();
                    } else {
                        this.applyWithdrawScenarioByKey(key);
                    }
                    this.refreshWithdrawImportDropdown(true);
                });
                list.appendChild(btn);
            });
        }
        dropdown.appendChild(list);
    }

    refreshWithdrawImportDropdown(keepOpen = false) {
        const section = document.getElementById('comparisonWithdrawSection');
        const header = section?.querySelector('.param-header');
        if (!section || !header) return;
        let dropdown = section.querySelector('#withdrawImportDropdown');
        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.id = 'withdrawImportDropdown';
            dropdown.style.display = 'none';
            dropdown.style.marginTop = '10px';
            dropdown.style.border = '1px solid #e5e7eb';
            dropdown.style.borderRadius = '8px';
            dropdown.style.padding = '10px';
            dropdown.style.background = '#fff';
            header.after(dropdown);
        }
        const wasOpen = dropdown.style.display !== 'none';
        dropdown.innerHTML = '<strong style="display:block; margin-bottom:8px; color:#2c3e50;">Entnahmephase‑Szenario wählen</strong>';
        const list = document.createElement('div');
        list.id = 'withdrawImportDropdownList';
        list.style.display = 'flex';
        list.style.flexWrap = 'wrap';
        list.style.gap = '8px';
        const entries = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('entnahmephaseScenario_')) {
                try { entries.push({ key, data: JSON.parse(localStorage.getItem(key) || '{}') }); } catch (_) {}
            }
        }
        entries.sort((a,b) => (a.data?.name || a.key).localeCompare(b.data?.name || b.key));
        entries.forEach(({ key, data }) => {
            const name = (data?.name) || key.replace('entnahmephaseScenario_','');
            const btn = document.createElement('button');
            btn.className = 'profile-action-btn profile-load-btn';
            btn.textContent = `📂 ${name}`;
            btn.dataset.storageKey = key;
            if (this.selectedWithdrawScenarioKey === key) btn.classList.add('active');
            btn.addEventListener('click', () => {
                const isDeselect = (this.selectedWithdrawScenarioKey === key);
                this.selectedWithdrawScenarioKey = isDeselect ? null : key;
                if (isDeselect) {
                    this.renderEmptyWithdrawCards();
                } else {
                    this.applyWithdrawScenarioByKey(key);
                }
                this.refreshWithdrawImportDropdown(true);
            });
            list.appendChild(btn);
        });
        dropdown.appendChild(list);
        dropdown.style.display = (keepOpen || wasOpen) ? 'block' : 'none';
        const importBtn = document.getElementById('withdrawImportBtn');
        if (importBtn) importBtn.textContent = dropdown.style.display === 'block' ? 'Importieren ▲' : 'Importieren ▼';
    }

    applyWithdrawScenarioByKey(key) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return;
            const data = JSON.parse(raw);
            this.applyWithdrawScenario(data);
        } catch (e) {
            console.warn('Failed to load withdrawal scenario by key', key, e);
        }
    }

    applyWithdrawScenario(data) {
        try {
            const p = data?.parameters || data?.scenario?.parameters || {};
            const num = (v, d=0) => (typeof v === 'number' && !isNaN(v)) ? v : (parseFloat(String(v||'').replace(/\./g,'').replace(',','.')) || d);
            const fmt = new Intl.NumberFormat('de-DE');

            const capital = num(p.retirementCapital, 0);
            const years = parseInt(p.withdrawalDuration ?? 0) || 0;
            const nominalReturnPct = num(p.postRetirementReturn, 0);
            const inflationPct = num(p.withdrawalInflation, 0);
            const taxActive = !!p.withdrawalTaxActive;
            const teilRate = num(p.teilfreistellungRate, 0);

            // Implied Entnahmerate for table summaries
            let ratePct = 0;
            if (capital > 0 && years > 0) {
                try {
                    const annualPayment = calculateDirectAnnuityPayment(capital, years, nominalReturnPct/100);
                    ratePct = (annualPayment / capital) * 100;
                } catch (_) {}
            }

            const byId = (id) => document.getElementById(id);
            byId('wdDuration') && (byId('wdDuration').textContent = `${years}`);
            byId('wdReturn') && (byId('wdReturn').textContent = `${nominalReturnPct}%`);
            byId('wdInflation') && (byId('wdInflation').textContent = `${inflationPct}%`);
            byId('wdCapital') && (byId('wdCapital').textContent = `${fmt.format(capital)} €`);
            byId('wdTax') && (byId('wdTax').textContent = taxActive ? 'Aktiv' : 'Aus');
            byId('wdTeilfreistellung') && (byId('wdTeilfreistellung').textContent = `${teilRate}%`);

            // Force-render the card to avoid any stale placeholders
            this.renderWithdrawValues({
                retirementCapital: capital,
                withdrawalDuration: years,
                postRetirementReturn: nominalReturnPct,
                withdrawalInflation: inflationPct,
                withdrawalTaxActive: taxActive,
                teilfreistellungRate: teilRate,
            });

            // Update local snapshot for table
            const id = this.getActiveScenarioId() || 'conservative';
            const sc = this.scenarioConfigs.find(s => s.id === id) || this.scenarioConfigs[0];
            if (sc) {
                sc.params.withdrawal.rate = Number(ratePct.toFixed(2));
                sc.params.withdrawal.years = years;
            }
            this.updateAllSummaries();
        } catch (e) {
            console.warn('Failed to apply withdrawal scenario', e);
        }
    }

    selectScenario(btn) {
        if (btn.classList.contains('btn-new')) {
            this.createNewScenario();
        } else {
            // Toggle selection: clicking the active button deselects
            const alreadyActive = btn.classList.contains('active');
            document.querySelectorAll('.btn-scenario:not(.btn-new)').forEach(b => b.classList.remove('active'));
            if (!alreadyActive) {
                btn.classList.add('active');
                const scenarioType = btn.getAttribute('data-scenario');
                this.updateLayoutBorder(scenarioType);
            } else {
                this.clearActiveScenario();
            }
        }
    }

    clearActiveScenario() {
        document.querySelectorAll('.btn-scenario:not(.btn-new)').forEach(b => b.classList.remove('active'));
        this.updateLayoutBorder(null);
        // Clear parameter inputs to reflect no selection
        const ids = ['accReturn','accYears','accInitial','accMonthly','wdRate','wdYears'];
        ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
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
        
        // Set accent variables on layout (border + light fill) based on scenario color
        if (scenarioType) {
            const sc = this.scenarioConfigs.find(s => s.id === scenarioType);
            const color = sc?.color || '#3498db';
            layout.style.setProperty('--accent-color', color);
            layout.style.setProperty('--accent-light', this.hexToRgba(color, 0.15));
        } else {
            // Neutral accent when nothing selected
            layout.style.setProperty('--accent-color', '#cbd5e1');
            layout.style.setProperty('--accent-light', 'rgba(203,213,225,0.25)');
        }

        console.log(`Layout border updated to: ${scenarioType || 'none'}`);
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

    bindParameterInputs() {
        // Accumulation inputs
        const accIds = ['accReturn', 'accYears', 'accInitial', 'accMonthly'];
        accIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => this.onParamsChanged());
                el.addEventListener('change', () => this.onParamsChanged());
            }
        });

        // Withdrawal inputs
        const wdIds = ['wdRate', 'wdYears'];
        wdIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => this.onParamsChanged());
                el.addEventListener('change', () => this.onParamsChanged());
            }
        });
    }

    getActiveScenarioId() {
        const activeBtn = document.querySelector('.btn-scenario.active:not(.btn-new)');
        return activeBtn?.getAttribute('data-scenario') || null;
    }

    populateInputsFromActiveScenario() {
        const id = this.getActiveScenarioId();
        const sc = id ? this.scenarioConfigs.find(s => s.id === id) : null;
        if (!sc) {
            // No active scenario; inputs remain empty
            return;
        }
        const g = (sel) => document.getElementById(sel);
        if (g('accReturn')) g('accReturn').value = sc.params.accumulation.returnRate ?? '';
        if (g('accYears')) g('accYears').value = sc.params.accumulation.years ?? '';
        if (g('accInitial')) g('accInitial').value = sc.params.accumulation.initialCapital ?? 0;
        if (g('accMonthly')) g('accMonthly').value = sc.params.accumulation.monthlySavings ?? '';
        if (g('wdRate')) g('wdRate').value = sc.params.withdrawal.rate ?? '';
        if (g('wdYears')) g('wdYears').value = sc.params.withdrawal.years ?? '';
    }

    onParamsChanged() {
        const id = this.getActiveScenarioId();
        const sc = id ? this.scenarioConfigs.find(s => s.id === id) : null;
        if (!sc) return;

        // Read inputs
        const accReturn = parseFloat(document.getElementById('accReturn')?.value || '0');
        const accYears = parseInt(document.getElementById('accYears')?.value || '0');
        const accInitial = parseFloat(document.getElementById('accInitial')?.value || '0');
        const accMonthly = parseFloat(document.getElementById('accMonthly')?.value || '0');
        const wdRate = parseFloat(document.getElementById('wdRate')?.value || '0');
        const wdYears = parseInt(document.getElementById('wdYears')?.value || '0');

        // Update scenario params
        sc.params.accumulation.returnRate = isNaN(accReturn) ? 0 : accReturn;
        sc.params.accumulation.years = isNaN(accYears) ? 0 : accYears;
        sc.params.accumulation.initialCapital = isNaN(accInitial) ? 0 : accInitial;
        sc.params.accumulation.monthlySavings = isNaN(accMonthly) ? 0 : accMonthly;
        sc.params.withdrawal.rate = isNaN(wdRate) ? 0 : wdRate;
        sc.params.withdrawal.years = isNaN(wdYears) ? 0 : wdYears;

        // Recompute simple accumulation end wealth using core calculation for better fidelity
        try {
            const final = this.computeFinalWealth(sc);
            sc.params.results.finalWealth = final;
        } catch (e) {
            console.warn('Final wealth calc failed', e);
        }

        // Update summaries for both scenarios
        this.updateAllSummaries();
    }

    computeFinalWealth(sc) {
        // Map params to calculateWealthDevelopment inputs
        const monthlySavings = Number(sc.params.accumulation.monthlySavings || 0);
        const initialCapital = Number(sc.params.accumulation.initialCapital || 0);
        const annualReturn = Number(sc.params.accumulation.returnRate || 0) / 100;
        const duration = Number(sc.params.accumulation.years || 0);
        // Defaults for fields not present on comparison page
        const inflationRate = Number(sc.params.budget?.inflation || 2.0) / 100;
        const salaryGrowth = 0;
        const salaryToSavings = 0;
        const includeTax = false;
        const baseSalary = 60000;
        const teilfreistellung = false;
        const etfType = 'thesaurierend';
        const res = calculateWealthDevelopment(
            monthlySavings,
            initialCapital,
            annualReturn,
            inflationRate,
            salaryGrowth,
            duration,
            salaryToSavings,
            includeTax,
            baseSalary,
            teilfreistellung,
            etfType
        );
        const formatter = new Intl.NumberFormat('de-DE');
        return `${formatter.format(Math.round(res.finalNominal))} €`;
    }

    updateAllSummaries() {
        const fmt = new Intl.NumberFormat('de-DE');
        const apply = (scId) => {
            const sc = this.scenarioConfigs.find(s => s.id === scId);
            if (!sc) return;
            const prefix = scId === 'optimistic' ? 'optimistic' : (scId === 'conservative' ? 'conservative' : scId);
            const byId = (id) => document.getElementById(id);
            const final = sc.params.results.finalWealth || this.computeFinalWealth(sc);
            byId(`sum-final-${prefix}`)?.replaceChildren(document.createTextNode(final));
            byId(`sum-return-${prefix}`)?.replaceChildren(document.createTextNode(`${sc.params.accumulation.returnRate ?? 0}%`));
            byId(`sum-monthly-${prefix}`)?.replaceChildren(document.createTextNode(`${fmt.format(sc.params.accumulation.monthlySavings || 0)} €`));
            byId(`sum-wdrate-${prefix}`)?.replaceChildren(document.createTextNode(`${sc.params.withdrawal.rate ?? 0}%`));
            byId(`sum-accyears-${prefix}`)?.replaceChildren(document.createTextNode(`${sc.params.accumulation.years ?? 0}`));
            byId(`sum-wdyears-${prefix}`)?.replaceChildren(document.createTextNode(`${sc.params.withdrawal.years ?? 0}`));
            if (sc.params.sources) {
                byId(`sum-source-budget-${prefix}`)?.replaceChildren(document.createTextNode(sc.params.sources.budgetName || '—'));
                byId(`sum-source-accum-${prefix}`)?.replaceChildren(document.createTextNode(sc.params.sources.accumName || '—'));
                byId(`sum-source-withdraw-${prefix}`)?.replaceChildren(document.createTextNode(sc.params.sources.withdrawName || '—'));
            }
        };
        // Update known initial scenarios
        ['optimistic','conservative'].forEach(apply);
    }

    toggleBudgetImportMenu() {
        // Ensure dropdown container exists directly below the header, so it appears at the top
        const section = document.getElementById('comparisonBudgetSection');
        const header = section?.querySelector('.param-header');
        if (!section || !header) return;

        let dropdown = section.querySelector('#budgetImportDropdown');
        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.id = 'budgetImportDropdown';
            dropdown.style.display = 'none';
            dropdown.style.marginTop = '10px';
            dropdown.style.border = '1px solid #e5e7eb';
            dropdown.style.borderRadius = '8px';
            dropdown.style.padding = '10px';
            dropdown.style.background = '#fff';
            // Insert after header, before the grid
            header.after(dropdown);
        }

        // Toggle visibility
        const willOpen = (dropdown.style.display === 'none' || dropdown.style.display === '');
        dropdown.style.display = willOpen ? 'block' : 'none';

        // Toggle arrow on the button
        const importBtn = document.getElementById('budgetImportBtn');
        if (importBtn) importBtn.textContent = willOpen ? 'Importieren ▲' : 'Importieren ▼';

        if (!willOpen) return;

        // Build the list of profiles when opening
        const list = document.createElement('div');
        list.id = 'budgetImportDropdownList';
        list.style.display = 'flex';
        list.style.flexWrap = 'wrap';
        list.style.gap = '8px';

        const entries = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('budgetProfile_')) {
                try { entries.push({ key, data: JSON.parse(localStorage.getItem(key) || '{}') }); } catch (_) {}
            }
        }

        dropdown.innerHTML = '<strong style="display:block; margin-bottom:8px; color:#2c3e50;">Profil wählen</strong>';
        if (!entries.length) {
            dropdown.insertAdjacentHTML('beforeend', '<div style="color:#7f8c8d">Keine gespeicherten Profile gefunden.</div>');
            return;
        }

        entries.sort((a,b) => a.key.localeCompare(b.key));
        entries.forEach(({ key, data }) => {
            const name = (data?.name) || key.replace('budgetProfile_','');
            const btn = document.createElement('button');
            btn.className = 'profile-action-btn profile-load-btn';
            btn.textContent = `📂 ${name}`;
            btn.style.justifySelf = 'start';
            btn.dataset.key = key;
            if (this.selectedBudgetProfileKey === key) {
                btn.classList.add('active');
            }
            btn.addEventListener('click', () => {
                // Toggle: clicking the same profile deselects and resets view
                if (this.selectedBudgetProfileKey === key) {
                    this.clearBudgetProfile();
                    // keep dropdown open and refresh list
                    this.refreshBudgetImportDropdown(true);
                } else {
                    this.applyBudgetProfile(name, data, key);
                    // keep dropdown open and refresh list
                    this.refreshBudgetImportDropdown(true);
                }
            });
            list.appendChild(btn);
        });
        dropdown.appendChild(list);
    }

    // Rebuild the dropdown list from localStorage without changing open state,
    // unless keepOpen is true (ensures it stays open while refreshing).
    refreshBudgetImportDropdown(keepOpen = false) {
        const section = document.getElementById('comparisonBudgetSection');
        const header = section?.querySelector('.param-header');
        if (!section || !header) return;
        let dropdown = section.querySelector('#budgetImportDropdown');
        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.id = 'budgetImportDropdown';
            dropdown.style.display = 'none';
            dropdown.style.marginTop = '10px';
            dropdown.style.border = '1px solid #e5e7eb';
            dropdown.style.borderRadius = '8px';
            dropdown.style.padding = '10px';
            dropdown.style.background = '#fff';
            header.after(dropdown);
        }
        const wasOpen = dropdown.style.display !== 'none';
        // Always rebuild content
        dropdown.innerHTML = '<strong style="display:block; margin-bottom:8px; color:#2c3e50;">Profil wählen</strong>';
        const list = document.createElement('div');
        list.id = 'budgetImportDropdownList';
        list.style.display = 'flex';
        list.style.flexWrap = 'wrap';
        list.style.gap = '8px';

        const entries = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('budgetProfile_')) {
                try { entries.push({ key, data: JSON.parse(localStorage.getItem(key) || '{}') }); } catch (_) {}
            }
        }
        entries.sort((a,b) => a.key.localeCompare(b.key));
        entries.forEach(({ key, data }) => {
            const name = (data?.name) || key.replace('budgetProfile_','');
            const btn = document.createElement('button');
            btn.className = 'profile-action-btn profile-load-btn';
            btn.textContent = `📂 ${name}`;
            btn.style.justifySelf = 'start';
            btn.dataset.key = key;
            if (this.selectedBudgetProfileKey === key) btn.classList.add('active');
            btn.addEventListener('click', () => {
                if (this.selectedBudgetProfileKey === key) {
                    this.clearBudgetProfile();
                } else {
                    this.applyBudgetProfile(name, data, key);
                }
                // Stay open and refresh
                this.refreshBudgetImportDropdown(true);
            });
            list.appendChild(btn);
        });
        dropdown.appendChild(list);
        // Restore visibility
        dropdown.style.display = (keepOpen || wasOpen) ? 'block' : 'none';
        const importBtn = document.getElementById('budgetImportBtn');
        if (importBtn) importBtn.textContent = dropdown.style.display === 'block' ? 'Importieren ▲' : 'Importieren ▼';
    }

    applyBudgetProfile(profileName, profileData, profileKey = null) {
        try {
            const fmt = new Intl.NumberFormat('de-DE');
            const euros = (n) => `€${fmt.format(Math.round(n || 0))}`;
            const profile = profileData || {};
            const totals = profile.budgetData || {};
            const income = profile.income || {};
            const expenses = profile.expenses || {};
            const savings = profile.savings || { mode: 'fixed', amount: 0, percentage: 0 };
            const periods = profile.periods || {};

            const totalIncome = (typeof totals.totalIncome === 'number') ? totals.totalIncome : this.sumNumbers(income);
            // Guard against legacy profiles that may still contain a removed
            // health insurance field ("health"). Exclude it from fallback sums
            // and also from precomputed totals when present.
            let totalExpenses;
            if (typeof totals.totalExpenses === 'number') {
                // Prefer stored total, but subtract legacy health if the raw
                // expenses object still carries it to avoid double counting.
                const legacyHealth = this.parseNumber(expenses.health);
                totalExpenses = totals.totalExpenses - (isNaN(legacyHealth) ? 0 : legacyHealth);
            } else {
                // Derive by summing all expense fields except legacy health
                const { health, ...rest } = expenses || {};
                totalExpenses = this.sumNumbers(rest);
            }
            const available = Math.max(0, (totalIncome || 0) - (totalExpenses || 0));

            const pretty = (k) => this.prettyLabel(k);

            // Build vertical key-over-value lists for readability
            const buildList = (entries) => {
                return `<div class="kvv-list">${entries.map(([k,v,code]) => `
                    <div class="kvv-item"${code ? ` data-key="${code}"` : ''}>
                        <div class="kvv-k">${k}</div>
                        <div class="kvv-v">${v}</div>
                    </div>`).join('')}</div>`;
            };
            const group = (title, entries) => `
                <div class="budget-group">
                    <div class="budget-chip">${title}</div>
                    ${buildList(entries)}
                </div>`;

            const incomeEntries = Object.entries(income).map(([k, v]) => [pretty(k), euros(this.parseNumber(v)), k]);
            const expenseEntries = Object.entries(expenses)
                .filter(([k]) => k !== 'health')
                .map(([k, v]) => [pretty(k), euros(this.parseNumber(v))]);
            const savingsEntries = [
                ['Sparmodus', savings.mode === 'fixed' ? 'Fester Betrag' : 'Prozentsatz'],
                ['Sparrate', euros(this.parseNumber(savings.amount))],
                ['Spar‑Prozentsatz', `${this.parseNumber(savings.percentage) || 0}%`]
            ];
            const periodEntries = [
                ['Einkommen‑Periode', pretty(periods.income || 'monthly')],
                ['Fixkosten‑Periode', pretty(periods.fixed || 'monthly')],
                ['Variable‑Periode', pretty(periods.variable || 'monthly')]
            ];
            const summaryEntries = [
                ['Gesamteinkommen', euros(totalIncome)],
                ['Gesamtausgaben', euros(totalExpenses)],
                ['Verfügbar', euros(available)],
                ['Profil', profile.name || profileName || '—']
            ];
            if (profile.description) summaryEntries.push(['Beschreibung', this.escape(String(profile.description))]);
            if (profile.createdAt) summaryEntries.push(['Erstellt', new Date(profile.createdAt).toLocaleDateString('de-DE')]);

            const html = `
                <div class="budget-grid">
                  <div class="budget-card summary">
                    ${group('Zusammenfassung', summaryEntries)}
                    ${group('Sparen', savingsEntries)}
                  </div>
                  <div class="budget-card income">${group('Einkommen', incomeEntries)}</div>
                  <div class="budget-card expenses">${group('Ausgaben', expenseEntries)}</div>
                </div>
                `;

            const container = document.getElementById('budgetReadonly');
            if (container) container.innerHTML = html;

            // Remember selection key for toggle behavior
            if (profileKey) this.selectedBudgetProfileKey = profileKey;
        } catch (e) {
            console.warn('Failed to apply budget profile', e);
        }
    }

    clearBudgetProfile() {
        this.selectedBudgetProfileKey = null;
        this.renderEmptyBudgetCards();
    }

    renderEmptyBudgetCards() {
        const placeholder = (label) => label;
        const group = (title, entries) => `
            <div class="budget-group">
                <div class="budget-chip">${title}</div>
                <div class="kvv-list">
                  ${entries.map(([k,v]) => `
                    <div class="kvv-item"><div class="kvv-k">${k}</div><div class="kvv-v">—</div></div>
                  `).join('')}
                </div>
            </div>`;
        const summaryEntries = [['Gesamteinkommen','—'],['Gesamtausgaben','—'],['Verfügbar','—'],['Profil','—']];
        const savingsEntries = [['Sparmodus','—'],['Sparrate','—'],['Spar‑Prozentsatz','—']];
        const incomeEntries = [['Gehalt','—'],['Nebeneinkommen','—'],['Sonstige Einnahmen','—']];
        const expenseEntries = [['Miete','—'],['Nebenkosten','—'],['Versicherungen','—'],['Internet','—'],['Rundfunkbeitrag','—'],['Lebensmittel','—'],['Transport','—'],['Freizeit','—'],['Kleidung','—'],['Abos','—'],['Sonstiges','—']];

        const html = `
            <div class="budget-grid">
              <div class="budget-card summary">
                ${group('Zusammenfassung', summaryEntries)}
                ${group('Sparen', savingsEntries)}
              </div>
              <div class="budget-card income">${group('Einkommen', incomeEntries)}</div>
              <div class="budget-card expenses">${group('Ausgaben', expenseEntries)}</div>
            </div>`;

        const container = document.getElementById('budgetReadonly');
        if (container) container.innerHTML = html;
    }

    renderEmptyAccumCards() {
        const group = (title, entries) => `
            <div class="budget-group">
                <div class="budget-chip">${title}</div>
                <div class="kvv-list">
                  ${entries.map(([k]) => `
                    <div class="kvv-item"><div class="kvv-k">${k}</div><div class="kvv-v">—</div></div>
                  `).join('')}
                </div>
            </div>`;
        const summary = [['Jährliche Rendite (%)'],['Anlagedauer (Jahre)'],['Monatliche Sparrate (€)'],['Startkapital (€)']];
        const assumptions = [['Inflationsrate (%)'],['Jährliche Gehaltssteigerung (%)'],['Deutsche Abgeltungssteuer einbeziehen (25% mit Vorabpauschale)'],['ETF-Typ für Steuerberechnung']];
        const salary = [['Aktuelles Brutto‑Jahresgehalt (€)'],['Gehaltssteigerung für Sparrate (%)'],['Teilfreistellung bei Aktienfonds anwenden (30% steuerfrei)']];
        const html = `
            <div class="budget-grid">
                <div class="budget-card summary">${group('Zusammenfassung', summary)}${group('Annahmen', assumptions)}</div>
                <div class="budget-card income">${group('Gehalt', salary)}</div>
            </div>`;
        const container = document.getElementById('accumReadonly');
        if (container) container.innerHTML = html;
    }

    renderEmptyWithdrawCards() {
        const group = (title, entries) => `
            <div class="budget-group">
                <div class="budget-chip">${title}</div>
                <div class="kvv-list">
                  ${entries.map(([k]) => `
                    <div class="kvv-item"><div class="kvv-k">${k}</div><div class="kvv-v">—</div></div>
                  `).join('')}
                </div>
            </div>`;
        const params = [['Entnahmedauer (Jahre)'],['Jährliche Rendite im Ruhestand (%)'],['Inflationsrate (%)'],['Verfügbares Kapital bei Renteneintritt (€)']];
        const tax = [['Abgeltungssteuer anwenden (25%)'],['Teilfreistellung (%)']];
        const html = `
            <div class="budget-grid">
                <div class="budget-card summary">${group('Parameter', params)}</div>
                <div class="budget-card income">${group('Steuern', tax)}</div>
            </div>`;
        const container = document.getElementById('withdrawReadonly');
        if (container) container.innerHTML = html;
    }

    sumNumbers(obj) {
        if (!obj || typeof obj !== 'object') return 0;
        return Object.values(obj).reduce((acc, v) => acc + (parseFloat(String(v).replace(/\./g,'').replace(',','.')) || 0), 0);
    }

    parseNumber(v) {
        return parseFloat(String(v ?? 0).replace(/\./g,'').replace(',','.')) || 0;
    }

    escape(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    prettyLabel(key) {
        const map = {
            // Income
            salary: 'Gehalt',
            sideIncome: 'Nebeneinkommen',
            otherIncome: 'Sonstige Einnahmen',
            // Expenses
            rent: 'Miete',
            utilities: 'Nebenkosten',
            insurance: 'Versicherungen',
            internet: 'Internet',
            gez: 'Rundfunkbeitrag',
            food: 'Lebensmittel',
            transport: 'Transport',
            leisure: 'Freizeit',
            clothing: 'Kleidung',
            subscriptions: 'Abos',
            miscellaneous: 'Sonstiges',
            // Periods
            monthly: 'Monatlich',
            yearly: 'Jährlich',
            income: 'Einkommen',
            fixed: 'Fixkosten',
            variable: 'Variable Kosten'
        };
        return map[key] || key;
    }

    applyScenarioButtonAccents() {
        // Map scenario IDs to their colors
        const colorById = new Map(this.scenarioConfigs.map(sc => [sc.id, sc.color]));

        document.querySelectorAll('.btn-scenario').forEach(btn => {
            const id = btn.getAttribute('data-scenario');
            if (!id || id === 'new') return;
            const color = colorById.get(id)
                || (id === 'optimistic' ? (this.scenarioConfigs[0]?.color || '#3498db')
                    : id === 'conservative' ? (this.scenarioConfigs[1]?.color || '#27ae60')
                    : null);
            if (color) {
                btn.style.setProperty('--scenario-accent', color);
                btn.style.setProperty('--scenario-accent-light', this.hexToRgba(color, 0.15));
            }
        });
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
        // Ensure sources field exists for chips
        newScenario.params.sources = newScenario.params.sources || { budgetName: '—', accumName: '—', withdrawName: '—' };

        this.scenarioConfigs.push(newScenario);
        this.activeScenarios.add(newScenario.id);

        // UI: add selectable button before "+ Neues Szenario"
        const chooser = document.querySelector('.scenario-chooser');
        if (chooser) {
            const newBtn = document.createElement('button');
            newBtn.className = 'btn-scenario';
            newBtn.setAttribute('data-scenario', newScenario.id);
            newBtn.textContent = newScenario.label;
            // Accent variables for CSS (border + light fill on active)
            newBtn.style.setProperty('--scenario-accent', newScenario.color);
            newBtn.style.setProperty('--scenario-accent-light', this.hexToRgba(newScenario.color, 0.15));
            const addBtn = chooser.querySelector('.btn-scenario.btn-new');
            chooser.insertBefore(newBtn, addBtn);
            newBtn.addEventListener('click', () => this.selectScenario(newBtn));
        }

        // UI: add summary card
        const cards = document.querySelector('.summary-cards');
        if (cards) {
            const card = document.createElement('div');
            card.className = 'summary-card';
            card.style.setProperty('--accent-color', newScenario.color);
            const riskLabel = 'Mittel';
            const riskClass = 'risk-medium';
            card.innerHTML = `
                <div class=\"summary-compact\">
                    <div class=\"top\">
                        <h4>${newScenario.label}</h4>
                        <span class=\"risk-badge ${riskClass}\">${riskLabel}</span>
                    </div>
                    <div class=\"headline\">
                        <span class=\"headline-value\">${newScenario.params.results.finalWealth}</span>
                    </div>
                    <div class=\"meta\"> 
                        <span class=\"metric\">${newScenario.params.accumulation.returnRate}% Rendite</span>
                        <span class=\"dot\">•</span>
                        <span class=\"metric\">${newScenario.params.accumulation.years}J Sparphase</span>
                        <span class=\"dot\">•</span>
                        <span class=\"metric\">${newScenario.params.withdrawal.years}J Entnahme</span>
                        <span class=\"dot\">•</span>
                        <span class=\"break\"></span>
                        <span class=\"metric\">${new Intl.NumberFormat('de-DE').format(newScenario.params.accumulation.monthlySavings)} € /M</span>
                        <span class=\"dot\">•</span>
                        <span class=\"metric\">${newScenario.params.withdrawal.rate}% Entnahme</span>
                    </div>
                </div>`;
            cards.appendChild(card);
            // Inject sources chips before headline and attach actions
            try {
                const compact = card.querySelector('.summary-compact');
                const headline = card.querySelector('.headline');
                if (compact && headline) {
                    const sourcesDiv = document.createElement('div');
                    sourcesDiv.className = 'sources';
                    sourcesDiv.innerHTML = `
                        <span class="chip chip-budget">${newScenario.params.sources.budgetName || '—'}</span>
                        <span class="chip chip-accum">${newScenario.params.sources.accumName || '—'}</span>
                        <span class="chip chip-withdraw">${newScenario.params.sources.withdrawName || '—'}</span>`;
                    compact.insertBefore(sourcesDiv, headline);
                }
                this.attachCardActions(card, newScenario.id);
            } catch (_) {}
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
                    if (key.includes('sparrate') || key.includes('sparquote')) return new Intl.NumberFormat('de-DE').format(sc.params.accumulation.monthlySavings);
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
