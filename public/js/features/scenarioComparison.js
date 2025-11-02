// scenarioComparison.js - Basic Scenario Comparison Module
import { scenarioColors as baseScenarioColors } from '../state.js';
import { calculateWealthDevelopment } from '../core/accumulation.js';
import { calculateDirectAnnuityPayment, calculateRealInterestRate } from '../core/withdrawal.js';
class ScenarioComparisonManager {
    constructor() {
        this.charts = {};
        this.currentChartView = 'lifecycle';
        this.currencyFormatter = null;
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
                params: {
                    budget: {
                        income: 4000,
                        expenses: 3000,
                        savingsRate: 25,
                        available: 1000,
                        inflation: 2.2
                    },
                    accumulation: {
                        returnRate: 8.5,
                        years: 30,
                        initialCapital: 100000,
                        monthlySavings: 1000,
                        inflationRate: 2.0,
                        salaryGrowth: 2.5,
                        salaryToSavings: 25,
                        includeTax: true,
                        baseSalary: 60000,
                        teilfreistellung: true,
                        etfType: 'thesaurierend'
                    },
                    withdrawal: {
                        rate: 4,
                        years: 25,
                        retirementCapital: 950000,
                        postRetirementReturn: 4.0,
                        withdrawalInflation: 2.0,
                        withdrawalTaxActive: true,
                        teilfreistellungRate: 30,
                        annualWithdrawal: null
                    },
                    results: { finalWealth: '—' },
                    sources: { budgetName: '—', accumName: '—', withdrawName: '—' }
                }
            },
            {
                id: 'conservative',
                label: '🛡️ Konservativ',
                color: scColors['B'] || '#27ae60',
                params: {
                    budget: {
                        income: 3500,
                        expenses: 2800,
                        savingsRate: 15,
                        available: 700,
                        inflation: 2.2
                    },
                    accumulation: {
                        returnRate: 5.5,
                        years: 25,
                        initialCapital: 50000,
                        monthlySavings: 500,
                        inflationRate: 2.0,
                        salaryGrowth: 1.5,
                        salaryToSavings: 15,
                        includeTax: true,
                        baseSalary: 52000,
                        teilfreistellung: true,
                        etfType: 'thesaurierend'
                    },
                    withdrawal: {
                        rate: 3,
                        years: 30,
                        retirementCapital: 600000,
                        postRetirementReturn: 3.2,
                        withdrawalInflation: 1.8,
                        withdrawalTaxActive: true,
                        teilfreistellungRate: 30,
                        annualWithdrawal: null
                    },
                    results: { finalWealth: '—' },
                    sources: { budgetName: '—', accumName: '—', withdrawName: '—' }
                }
            }
        ];
        this.chartLabels = {
            lifecycle: [],
            accumulation: [],
            withdrawal: [],
            metrics: ['Rendite', 'Risiko', 'Liquidität', 'Flexibilität', 'Steuereffizienz']
        };
        this.refreshScenarioData();
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
            const optScenario = this.scenarioConfigs.find(s => s.id === 'optimistic');
            const consScenario = this.scenarioConfigs.find(s => s.id === 'conservative');
            if (initCards[0] && optScenario) this.updateScenarioCardElements(optScenario, initCards[0]);
            if (initCards[1] && consScenario) this.updateScenarioCardElements(consScenario, initCards[1]);
        } catch (_) {}

        // Note: comparison presets remain independent from A/B app scenarios
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
        const budParams = budData?.budgetData || {};
        const num = (v, d=0) => (typeof v === 'number' && !isNaN(v)) ? v : (parseFloat(String(v||'').replace(/\./g,'').replace(',','.')) || d);

        const accumulation = {
            returnRate: num(accP.annualReturn, 0),
            years: parseInt(accP.duration ?? 0) || 0,
            initialCapital: num(accP.initialCapital, 0),
            monthlySavings: num(accP.monthlySavings, 0),
            inflationRate: num(accP.inflationRate ?? budParams.inflationRate, 2.0),
            salaryGrowth: num(accP.salaryGrowth, 0),
            salaryToSavings: num(accP.salaryToSavings, 0),
            includeTax: !!accP.includeTax,
            baseSalary: num(accP.baseSalary, 60000),
            teilfreistellung: !!accP.teilfreistellung,
            etfType: accP.etfType || 'thesaurierend'
        };
        const incomeTotal = typeof budParams.totalIncome === 'number'
            ? budParams.totalIncome
            : this.sumNumbers(budData?.income);
        const expensesTotal = typeof budParams.totalExpenses === 'number'
            ? budParams.totalExpenses
            : this.sumNumbers(budData?.expenses);
        // Compute an estimated end capital from the accumulation inputs to use as a
        // sensible fallback for retirement capital (more accurate than initialCapital)
        let accEndFallback = 0;
        try {
            const accSeries = this.calculateAccumulationSeries(accumulation, {});
            if (accSeries?.values?.length) accEndFallback = accSeries.values[accSeries.values.length - 1] || 0;
        } catch (_) { /* ignore */ }

        const withdrawal = {
            rate: num(wdP.withdrawalRate ?? wdP.rate, 0),
            years: parseInt(wdP.duration ?? wdP.withdrawalYears ?? wdP.withdrawalDuration ?? wdP.years ?? 0) || 0,
            retirementCapital: num(wdP.retirementCapital, accEndFallback || accumulation.initialCapital || 0),
            postRetirementReturn: num(wdP.postRetirementReturn ?? wdP.nominalReturn, 0),
            withdrawalInflation: num(wdP.withdrawalInflation ?? wdP.inflationRate, accumulation.inflationRate ?? 0),
            withdrawalTaxActive: !!(wdP.withdrawalTaxActive ?? wdP.includeTax),
            teilfreistellungRate: num(wdP.teilfreistellungRate ?? wdP.teilfreistellung, 30),
            annualWithdrawal: num(wdP.annualWithdrawal, 0)
        };
        if (!withdrawal.annualWithdrawal && withdrawal.retirementCapital && withdrawal.years) {
            try {
                const realRate = calculateRealInterestRate(
                    withdrawal.postRetirementReturn / 100,
                    withdrawal.withdrawalInflation / 100
                );
                withdrawal.annualWithdrawal = calculateDirectAnnuityPayment(
                    withdrawal.retirementCapital,
                    withdrawal.years,
                    realRate
                );
            } catch (_) {
                withdrawal.annualWithdrawal = withdrawal.retirementCapital / withdrawal.years;
            }
        }
        if (withdrawal.retirementCapital) {
            const computedRate = (withdrawal.annualWithdrawal / withdrawal.retirementCapital) * 100;
            if (Number.isFinite(computedRate)) {
                withdrawal.rate = Number(computedRate.toFixed(2));
            }
        }
        const budget = {
            income: incomeTotal || 0,
            expenses: expensesTotal || 0,
            savingsRate: num(budData?.savings?.percentage ?? budData?.savingsRate, 0),
            available: Math.max(0, (incomeTotal || 0) - (expensesTotal || 0)),
            inflation: num(budParams.inflationRate ?? budData?.inflation ?? accumulation.inflationRate ?? 2.0, 2.0)
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
            }
        };

        try { newScenario.params.results.finalWealth = this.computeFinalWealth(newScenario); } catch {}

        this.scenarioConfigs.push(newScenario);
        this.activeScenarios.add(newScenario.id);
        this.refreshScenarioData(newScenario);
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
            this.updateScenarioCardElements(newScenario, card);
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

    updateScenarioCardElements(sc, card) {
        if (!sc || !card) return;
        const fmt = new Intl.NumberFormat('de-DE');
        card.querySelector('.headline-value')?.replaceChildren(document.createTextNode(sc.params.results?.finalWealth || '—'));
        const meta = card.querySelector('.meta');
        const annualized = sc.derived?.totals?.annualizedReturn;
        const formattedAnnualized = Number.isFinite(annualized)
            ? `${(annualized * 100).toFixed(2)}% Rendite`
            : `${sc.params.accumulation.returnRate ?? 0}% Rendite`;
        if (meta) {
            const withdrawalRateDisplay = (() => {
                const rateValue = Number(sc.params.withdrawal.rate || 0);
                return rateValue > 1 ? `${rateValue}% Entnahme` : `${(rateValue * 100).toFixed(2)}% Entnahme`;
            })();
            meta.innerHTML = `
                <span class="metric">${formattedAnnualized}</span>
                <span class="dot">•</span>
                <span class="metric">${sc.params.accumulation.years ?? 0}J Sparphase</span>
                <span class="dot">•</span>
                <span class="metric">${sc.params.withdrawal.years ?? 0}J Entnahme</span>
                <span class="dot">•</span>
                <span class="break"></span>
                <span class="metric">${fmt.format(sc.params.accumulation.monthlySavings || 0)} € /M</span>
                <span class="dot">•</span>
                <span class="metric">${withdrawalRateDisplay}</span>`;
        }
        const chips = card.querySelectorAll('.sources .chip');
        if (chips?.length >= 3) {
            chips[0].textContent = sc.params.sources?.budgetName || '—';
            chips[1].textContent = sc.params.sources?.accumName || '—';
            chips[2].textContent = sc.params.sources?.withdrawName || '—';
        }
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
        sc.params.withdrawal.years = parseInt(wdP.duration ?? wdP.withdrawalYears ?? wdP.withdrawalDuration ?? wdP.years ?? sc.params.withdrawal.years) || sc.params.withdrawal.years;
        sc.params.budget.inflation = num(budData?.budgetData?.inflationRate ?? budData?.inflation ?? sc.params.budget.inflation, sc.params.budget.inflation);
        sc.params.sources = sc.params.sources || {};
        const getDisplay = (key, data) => (data?.name || (key ? key.replace(/^[^_]+_/, '') : '—'));
        sc.params.sources.budgetName = getDisplay(this.selectedBudgetProfileKey, budData);
        sc.params.sources.accumName = getDisplay(this.selectedAccumScenarioKey, accData);
        sc.params.sources.withdrawName = getDisplay(this.selectedWithdrawScenarioKey, wdData);

        try { sc.params.results.finalWealth = this.computeFinalWealth(sc); } catch {}

        this.updateScenarioCardElements(sc, card);
        this.updateAllCharts();
    }

    // (Deliberately no coupling to A/B scenarios here)
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
                if (!input.dataset.scenario) {
                    if (label.textContent.includes('Optimistisch')) input.dataset.scenario = 'optimistic';
                    if (label.textContent.includes('Konservativ')) input.dataset.scenario = 'conservative';
                }
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
            // Lazily (re)create the chart when its view becomes active
            this.ensureChartExists(view);
            // Ensure derived metrics are current before drawing the radar chart
            if (view === 'metrics') {
                this.refreshScenarioData();
            }
            // Update and resize after toggling visibility to keep canvas dimensions in sync
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

            // Do not mutate comparison scenarios when previewing imports.
            // The overview only changes when "Zur Übersicht hinzufügen" is used
            // or when the refresh icon on a scenario card is clicked.
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

            // Accept multiple possible key variants from saved scenarios
            const capital = num(p.retirementCapital ?? p.withdrawalCapital ?? p.startCapital ?? p.capital, 0);
            const years = parseInt(p.duration ?? p.withdrawalYears ?? p.withdrawalDuration ?? p.years ?? 0, 10) || 0;
            const nominalReturnPct = num(p.postRetirementReturn ?? p.nominalReturn ?? p.return, 0);
            const inflationPct = num(p.withdrawalInflation ?? p.inflationRate ?? p.inflation, 0);
            const taxActive = !!(p.withdrawalTaxActive ?? p.includeTax ?? p.taxActive);
            const teilRate = num(p.teilfreistellungRate ?? p.teilfreistellung ?? p.teilRate, 0);

            // Implied Entnahmerate and annual withdrawal for table summaries
            let ratePct = 0;
            let annualPaymentCalc = NaN;
            if (capital > 0 && years > 0) {
                try {
                    // Use real rate to account for inflation where available
                    const realRate = calculateRealInterestRate(nominalReturnPct/100, inflationPct/100);
                    annualPaymentCalc = calculateDirectAnnuityPayment(capital, years, realRate);
                    ratePct = (annualPaymentCalc / capital) * 100;
                } catch (_) {
                    // Fallback to simple division if needed
                    annualPaymentCalc = capital / years;
                    ratePct = (annualPaymentCalc / capital) * 100;
                }
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

            // Do not mutate comparison scenarios when previewing imports.
            // The overview only changes when composing a new scenario or refreshing a specific card.
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

        this.refreshScenarioData(sc);
        // Update summaries for both scenarios
        this.updateAllSummaries();
        this.updateAllCharts();
    }

    refreshScenarioData(targets = null) {
        const items = Array.isArray(targets)
            ? targets
            : targets
                ? [targets]
                : this.scenarioConfigs;
        items.forEach((scenario) => {
            if (scenario) {
                this.recalculateScenarioSeries(scenario);
            }
        });
        this.rebuildChartLabels();
    }

    recalculateScenarioSeries(sc) {
        if (!sc || !sc.params) return;

        const { accumulation = {}, budget = {}, withdrawal = {} } = sc.params;
        const accumulationSeries = this.calculateAccumulationSeries(accumulation, budget);
        const lifecycleValues = accumulationSeries.values.slice();
        let phaseBreakIndex = Math.max(0, lifecycleValues.length - 1);

        const lastAccumValue = lifecycleValues.length ? lifecycleValues[lifecycleValues.length - 1] : 0;
        // Prefer the accumulation end value as the starting capital for lifecycle continuity.
        // Fall back to an explicitly set retirementCapital only if accumulation provides no value.
        const startCapital = (Number.isFinite(lastAccumValue) && lastAccumValue > 0)
            ? lastAccumValue
            : (withdrawal.retirementCapital ?? 0);
        const withdrawalSeries = this.calculateWithdrawalSeries({
            startCapital,
            years: withdrawal.years,
            annualReturn: withdrawal.postRetirementReturn,
            inflation: withdrawal.withdrawalInflation,
            annualWithdrawal: withdrawal.annualWithdrawal,
            rate: withdrawal.rate
        });

        if (withdrawalSeries) {
            const [firstValue, ...restValues] = withdrawalSeries.values;
            if (lifecycleValues.length === 0) {
                lifecycleValues.push(firstValue ?? 0);
                phaseBreakIndex = 0;
            } else if (typeof firstValue === 'number' && Number.isFinite(firstValue)) {
                const lastAccumValue = lifecycleValues[lifecycleValues.length - 1];
                if (Math.abs(lastAccumValue - firstValue) > 1) {
                    lifecycleValues.push(firstValue);
                    phaseBreakIndex = lifecycleValues.length - 2;
                }
            }
            restValues.forEach((value) => lifecycleValues.push(value));

            sc.params.withdrawal.annualWithdrawal = withdrawalSeries.baseWithdrawal;
            // Compute an implied withdrawal rate based on the actual start capital used
            if (startCapital) {
                const rate = (withdrawalSeries.baseWithdrawal / startCapital) * 100;
                sc.params.withdrawal.rate = Number.isFinite(rate) ? Number(rate.toFixed(2)) : sc.params.withdrawal.rate;
            }
        }

        const lifecycleLabels = this.buildSequentialLabels(lifecycleValues.length);

        sc.derived = sc.derived || {};
        sc.derived.accumulation = accumulationSeries;
        sc.derived.withdrawal = withdrawalSeries || { labels: [], values: [] };
        sc.derived.lifecycle = {
            labels: lifecycleLabels,
            values: lifecycleValues,
            phaseBreakIndex
        };
        const lastAccumulationValue = accumulationSeries.values.length ? accumulationSeries.values[accumulationSeries.values.length - 1] : 0;
        // Use accumulation end value for the card headline to match the Ansparphase chart
        sc.derived.totals = {
            finalWealth: lastAccumulationValue || 0,
            totalInvested: accumulationSeries.totalInvested,
            costBasis: accumulationSeries.costBasis,
            totalTaxesPaid: accumulationSeries.totalTaxesPaid,
            annualizedReturn: accumulationSeries.annualizedReturn,
            accumulationFinal: lastAccumulationValue,
            lifecycleFinal: lifecycleValues.length ? lifecycleValues[lifecycleValues.length - 1] : lastAccumulationValue || 0,
            durationYears: accumulationSeries.values.length ? accumulationSeries.values.length - 1 : 0
        };
        sc.derived.metrics = this.calculateScenarioMetrics(sc);

        sc.params.results = sc.params.results || {};
        if (Number.isFinite(sc.derived.totals.finalWealth)) {
            sc.params.results.finalWealth = this.formatCurrency(sc.derived.totals.finalWealth);
        } else {
            sc.params.results.finalWealth = '—';
        }
        if (Number.isFinite(sc.derived.totals.costBasis)) {
            sc.params.results.costBasis = sc.derived.totals.costBasis;
        }
        if (Number.isFinite(sc.derived.totals.totalInvested)) {
            sc.params.results.totalInvested = sc.derived.totals.totalInvested;
        }

        const card = document.querySelector(`.summary-cards .summary-card[data-scenario-id="${sc.id}"]`);
        if (card) {
            this.updateScenarioCardElements(sc, card);
        }
    }

    calculateAccumulationSeries(accumulation = {}, budget = {}) {
        const duration = Math.max(0, parseInt(accumulation.years ?? 0, 10) || 0);
        const monthlySavings = Number(accumulation.monthlySavings || 0);
        const initialCapital = Number(accumulation.initialCapital || 0);
        const returnRate = Number(accumulation.returnRate || 0) / 100;
        const inflationRate = Number(accumulation.inflationRate ?? budget.inflation ?? 0) / 100;
        const salaryGrowth = Number(accumulation.salaryGrowth || 0) / 100;
        const salaryToSavings = Number(accumulation.salaryToSavings || 0) / 100;
        const includeTax = !!accumulation.includeTax;
        const baseSalary = Number(accumulation.baseSalary || 60000);
        const teilfreistellung = !!accumulation.teilfreistellung;
        const etfType = accumulation.etfType || 'thesaurierend';

        try {
            const result = calculateWealthDevelopment(
                monthlySavings,
                initialCapital,
                returnRate,
                inflationRate,
                salaryGrowth,
                duration,
                salaryToSavings,
                includeTax,
                baseSalary,
                teilfreistellung,
                etfType
            );
            const labels = result.yearlyData.map((_, index) => index === 0 ? 'Start' : `Jahr ${index}`);
            const values = result.yearlyData.map((entry) => entry.capital);
            const lastEntry = result.yearlyData.length ? result.yearlyData[result.yearlyData.length - 1] : null;
            return {
                labels,
                values,
                totalInvested: (lastEntry && typeof lastEntry.totalInvested === 'number') ? lastEntry.totalInvested : initialCapital + monthlySavings * 12 * duration,
                costBasis: result.costBasis,
                totalTaxesPaid: result.totalTaxesPaid,
                annualizedReturn: result.annualizedReturn,
                finalNominal: result.finalNominal
            };
        } catch (error) {
            console.warn('Fallback accumulation series calculation', error);
            const labels = this.buildSequentialLabels(duration + 1);
            const values = [];
            let capital = initialCapital;
            values.push(capital);
            for (let year = 1; year <= duration; year += 1) {
                capital = (capital + monthlySavings * 12) * (1 + returnRate);
                values.push(capital);
            }
            return {
                labels,
                values,
                totalInvested: initialCapital + monthlySavings * 12 * duration,
                costBasis: capital,
                totalTaxesPaid: 0,
                annualizedReturn: returnRate,
                finalNominal: capital
            };
        }
    }

    calculateWithdrawalSeries({ startCapital, years, annualReturn, inflation, annualWithdrawal, rate }) {
        const duration = Math.max(0, parseInt(years ?? 0, 10) || 0);
        const initialCapital = Number(startCapital || 0);
        if (!initialCapital || duration <= 0) {
            return null;
        }

        const returnRate = Number(annualReturn || 0) / 100;
        const inflationRate = Number(inflation || 0) / 100;
        let baseWithdrawal = Number(annualWithdrawal || 0);
        const rawRate = Number(rate || 0);
        const normalizedRate = rawRate > 1 ? rawRate / 100 : rawRate;

        if (!baseWithdrawal) {
            if (normalizedRate > 0) {
                baseWithdrawal = initialCapital * normalizedRate;
            } else {
                try {
                    const realRate = calculateRealInterestRate(returnRate, inflationRate);
                    baseWithdrawal = calculateDirectAnnuityPayment(initialCapital, duration, realRate);
                } catch (error) {
                    console.warn('Fallback withdrawal amount calculation', error);
                    baseWithdrawal = initialCapital / duration;
                }
            }
        }

        const labels = this.buildSequentialLabels(duration + 1);
        const values = [initialCapital];
        let capital = initialCapital;

        for (let year = 1; year <= duration; year += 1) {
            const grownCapital = capital * (1 + returnRate);
            const payout = baseWithdrawal * Math.pow(1 + inflationRate, year - 1);
            capital = grownCapital - payout;
            values.push(capital > 0 ? capital : 0);
        }

        return {
            labels,
            values,
            baseWithdrawal
        };
    }

    rebuildChartLabels() {
        const maxLifecycle = Math.max(0, ...this.scenarioConfigs.map(sc => sc.derived?.lifecycle?.values?.length || 0));
        const maxAccumulation = Math.max(0, ...this.scenarioConfigs.map(sc => sc.derived?.accumulation?.values?.length || 0));
        const maxWithdrawal = Math.max(0, ...this.scenarioConfigs.map(sc => sc.derived?.withdrawal?.values?.length || 0));

        this.chartLabels.lifecycle = this.buildSequentialLabels(maxLifecycle);
        this.chartLabels.accumulation = this.buildSequentialLabels(maxAccumulation);
        this.chartLabels.withdrawal = this.buildSequentialLabels(maxWithdrawal);
    }

    buildSequentialLabels(length) {
        if (!length || length <= 0) return [];
        const labels = [];
        for (let i = 0; i < length; i += 1) {
            labels.push(i === 0 ? 'Start' : `Jahr ${i}`);
        }
        return labels;
    }

    fillSeries(values, length) {
        if (!length || length <= 0) return [];
        const filled = new Array(length).fill(null);
        if (Array.isArray(values)) {
            for (let i = 0; i < Math.min(values.length, length); i += 1) {
                filled[i] = values[i];
            }
        }
        return filled;
    }

    calculateScenarioMetrics(sc) {
        const { accumulation = {}, withdrawal = {}, budget = {} } = sc.params || {};
        const totals = sc.derived?.totals || {};
        const clamp = (value) => Math.max(1, Math.min(10, Number.isFinite(value) ? value : 1));

        const effectiveReturnPct = Number.isFinite(totals.annualizedReturn)
            ? (totals.annualizedReturn || 0) * 100
            : (Number(accumulation.returnRate) || 0);
        const returnScore = clamp(effectiveReturnPct / 1.2);
        const riskPenalty = effectiveReturnPct / 4;
        const riskScore = clamp(8 - riskPenalty - (accumulation.includeTax ? 0.5 : 0));

        const withdrawalRate = (() => {
            if (withdrawal.annualWithdrawal && withdrawal.retirementCapital) {
                return (withdrawal.annualWithdrawal / withdrawal.retirementCapital) * 100;
            }
            const storedRate = Number(withdrawal.rate) || 0;
            return storedRate > 1 ? storedRate : storedRate * 100;
        })();
        const liquidityScore = clamp(10 - (withdrawalRate * 1.2));

        const monthlySavings = Number(accumulation.monthlySavings || 0);
        const available = Number.isFinite(budget.available) ? Number(budget.available) : (Number(budget.income || 0) - Number(budget.expenses || 0));
        const flexibilityScore = clamp(7 + ((available - monthlySavings) / 500));

        const taxScore = clamp(6 + (withdrawal.withdrawalTaxActive ? 1.5 : 2) + (accumulation.includeTax ? 0.5 : 0) + (Number(withdrawal.teilfreistellungRate || 0) / 10));

        // Adjust scores slightly based on wealth accumulation success
        if (totals.totalInvested && totals.finalWealth) {
            const wealthMultiplier = totals.finalWealth / totals.totalInvested;
            const bonus = clamp(wealthMultiplier * 2) - 2;
            return [
                clamp(returnScore + bonus * 0.4),
                clamp(riskScore - bonus * 0.3),
                clamp(liquidityScore + bonus * 0.2),
                clamp(flexibilityScore + bonus * 0.2),
                clamp(taxScore + bonus * 0.1)
            ];
        }

        return [returnScore, riskScore, liquidityScore, flexibilityScore, taxScore];
    }

    computeFinalWealth(sc) {
        if (!sc || !sc.params) return '—';

        if (Number.isFinite(sc?.derived?.totals?.finalWealth)) {
            return this.formatCurrency(sc.derived.totals.finalWealth);
        }

        const series = this.calculateAccumulationSeries(sc.params.accumulation || {}, sc.params.budget || {});
        const finalValue = series.values.length ? series.values[series.values.length - 1] : undefined;
        if (Number.isFinite(finalValue)) {
            return this.formatCurrency(finalValue);
        }
        return '—';
    }

    updateAllSummaries() {
        const fmt = new Intl.NumberFormat('de-DE');
        const apply = (scId) => {
            const sc = this.scenarioConfigs.find(s => s.id === scId);
            if (!sc) return;
            const prefix = scId === 'optimistic' ? 'optimistic' : (scId === 'conservative' ? 'conservative' : scId);
            const byId = (id) => document.getElementById(id);
            const final = this.computeFinalWealth(sc);
            sc.params.results.finalWealth = final;
            byId(`sum-final-${prefix}`)?.replaceChildren(document.createTextNode(final));
            const annualized = sc.derived?.totals?.annualizedReturn;
            const annualizedDisplay = Number.isFinite(annualized)
                ? `${(annualized * 100).toFixed(2)}%`
                : `${sc.params.accumulation.returnRate ?? 0}%`;
            byId(`sum-return-${prefix}`)?.replaceChildren(document.createTextNode(annualizedDisplay));
            byId(`sum-monthly-${prefix}`)?.replaceChildren(document.createTextNode(`${fmt.format(sc.params.accumulation.monthlySavings || 0)} €`));
            const withdrawalRateValue = Number(sc.params.withdrawal.rate || 0);
            const withdrawalRateDisplay = withdrawalRateValue > 1
                ? `${withdrawalRateValue}%`
                : `${(withdrawalRateValue * 100).toFixed(2)}%`;
            byId(`sum-wdrate-${prefix}`)?.replaceChildren(document.createTextNode(withdrawalRateDisplay));
            byId(`sum-accyears-${prefix}`)?.replaceChildren(document.createTextNode(`${sc.params.accumulation.years ?? 0}`));
            byId(`sum-wdyears-${prefix}`)?.replaceChildren(document.createTextNode(`${sc.params.withdrawal.years ?? 0}`));
            if (sc.params.sources) {
                byId(`sum-source-budget-${prefix}`)?.replaceChildren(document.createTextNode(sc.params.sources.budgetName || '—'));
                byId(`sum-source-accum-${prefix}`)?.replaceChildren(document.createTextNode(sc.params.sources.accumName || '—'));
                byId(`sum-source-withdraw-${prefix}`)?.replaceChildren(document.createTextNode(sc.params.sources.withdrawName || '—'));
            }
        };
        this.scenarioConfigs.forEach((scenario) => {
            apply(scenario.id);
        });
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

            // Do not mutate comparison scenarios during budget profile preview.
            // Users can compose a new scenario with the selected profile via the add button.

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
            // Always use explicit color mapping by ID to avoid coupling to array order
            const color = colorById.get(id) || '#3498db';
            if (color) {
                btn.style.setProperty('--scenario-accent', color);
                btn.style.setProperty('--scenario-accent-light', this.hexToRgba(color, 0.15));
            }
        });
    }

    initializeCharts() {
        // Destroy existing charts first
        this.destroyAllCharts();

        // Recreate only the currently active view to avoid initializing charts
        // while their container is hidden (Chart.js can't size hidden canvases).
        const activeView = this.currentChartView || 'lifecycle';
        this.ensureChartExists(activeView);

        // Always keep the lifecycle chart ready as default entry view.
        if (activeView !== 'lifecycle') {
            this.ensureChartExists('lifecycle');
        }
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

    buildChartData(chartType) {
        if (chartType === 'metrics') {
            const labels = this.chartLabels.metrics || ['Rendite', 'Risiko', 'Liquidität', 'Flexibilität', 'Steuereffizienz'];
            const datasets = this.scenarioConfigs.map((sc) => {
                const metrics = sc.derived?.metrics || new Array(labels.length).fill(0);
                return {
                    label: sc.label,
                    data: metrics,
                    borderColor: sc.color,
                    backgroundColor: this.hexToRgba(sc.color, 0.18),
                    pointBackgroundColor: sc.color,
                    _scenarioId: sc.id,
                    hidden: !this.activeScenarios.has(sc.id),
                    // Draw connected polygon with fill
                    showLine: true,
                    fill: true,
                    tension: 0.2,
                    borderWidth: 2,
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2
                };
            });
            return { labels, datasets };
        }

        let labels = this.chartLabels[chartType] || [];
        const datasets = this.scenarioConfigs.map((sc) => {
            const derived = sc.derived || {};
            let source = [];
            if (chartType === 'lifecycle') {
                source = derived.lifecycle?.values || [];
            } else if (chartType === 'accumulation') {
                source = derived.accumulation?.values || [];
            } else if (chartType === 'withdrawal') {
                source = derived.withdrawal?.values || [];
                // If withdrawal series is missing or empty, try to compute a safe fallback
                if (!Array.isArray(source) || source.length === 0) {
                    const w = (sc.params && sc.params.withdrawal) || {};
                    const accEnd = (derived.accumulation && Array.isArray(derived.accumulation.values) && derived.accumulation.values.length)
                        ? derived.accumulation.values[derived.accumulation.values.length - 1]
                        : 0;
                    const calc = this.calculateWithdrawalSeries({
                        startCapital: (typeof w.retirementCapital === 'number' && w.retirementCapital > 0) ? w.retirementCapital : accEnd,
                        years: w.years,
                        annualReturn: w.postRetirementReturn,
                        inflation: w.withdrawalInflation,
                        annualWithdrawal: w.annualWithdrawal,
                        rate: w.rate
                    });
                    if (calc && Array.isArray(calc.values) && calc.values.length > 0) {
                        source = calc.values;
                        // If global labels are empty, derive them on the fly from this series
                        if ((!labels || labels.length === 0) && Array.isArray(calc.labels)) {
                            labels = calc.labels.slice();
                        }
                    }
                }
            }
            const data = this.fillSeries(source, labels.length);
        const dataset = {
            label: sc.label,
            data,
            borderColor: sc.color,
            backgroundColor: this.hexToRgba(sc.color, chartType === 'withdrawal' ? 0.12 : 0.08),
            tension: 0.3,
            pointBackgroundColor: sc.color,
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            // Show points only at start and every 5 years for readability
            pointRadius: (ctx) => {
                const i = ctx.dataIndex ?? 0;
                return (i === 0 || i % 5 === 0) ? 3 : 0;
            },
            pointHoverRadius: (ctx) => {
                const i = ctx.dataIndex ?? 0;
                return (i === 0 || i % 5 === 0) ? 5 : 0;
            },
            spanGaps: false,
            _scenarioId: sc.id,
            hidden: !this.activeScenarios.has(sc.id),
            borderWidth: 3
        };

        if (chartType === 'lifecycle') {
            // Solid line across phases; keep phase index only for tooltips.
            dataset.fill = false;
            dataset.phaseBreakIndex = derived.lifecycle?.phaseBreakIndex ?? 0;
        } else if (chartType === 'accumulation') {
            dataset.fill = false;
        } else if (chartType === 'withdrawal') {
            // Disable area fill to avoid Chart.js filler plugin errors when
            // series are constructed lazily or contain leading nulls.
            dataset.fill = false;
            }

            return dataset;
        });

        return { labels, datasets };
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

            const { labels, datasets } = this.buildChartData('lifecycle');
            this.charts.lifecycle = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
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
                        intersect: false,
                        callbacks: {
                            label: (context) => {
                                const dataset = context.dataset || {};
                                const value = context.parsed?.y ?? context.parsed;
                                const phaseBreak = dataset.phaseBreakIndex ?? -1;
                                const phase = context.dataIndex > phaseBreak ? 'Entnahmephase' : 'Ansparphase';
                                const formatted = new Intl.NumberFormat('de-DE', {
                                    style: 'currency',
                                    currency: 'EUR',
                                    maximumFractionDigits: 0
                                }).format(value || 0);
                                return `${dataset.label || 'Szenario'} • ${phase}: ${formatted}`;
                            }
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
                            callback: (value) => new Intl.NumberFormat('de-DE', {
                                style: 'currency',
                                currency: 'EUR',
                                notation: 'compact',
                                maximumFractionDigits: 1
                            }).format(value)
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

        if (this.charts.accumulation) {
            this.charts.accumulation.destroy();
        }

        const { labels, datasets } = this.buildChartData('accumulation');

        this.charts.accumulation = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
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
                        intersect: false,
                        callbacks: {
                            label: (context) => {
                                const formatted = new Intl.NumberFormat('de-DE', {
                                    style: 'currency',
                                    currency: 'EUR',
                                    maximumFractionDigits: 0
                                }).format(context.parsed?.y ?? context.parsed ?? 0);
                                return `${context.dataset?.label || 'Szenario'}: ${formatted}`;
                            }
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
                        suggestedMin: 0,
                        ticks: {
                            callback: (value) => new Intl.NumberFormat('de-DE', {
                                style: 'currency',
                                currency: 'EUR',
                                maximumFractionDigits: 0
                            }).format(value)
                        }
                    },
                    x: {
                        grid: { color: 'rgba(0,0,0,0.03)' }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    intersect: false
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

        // Ensure we have withdrawal series; if missing, derive from accumulation end value
        const needsDerive = this.scenarioConfigs.some(sc => !sc?.derived?.withdrawal?.values || sc.derived.withdrawal.values.length === 0);
        if (needsDerive) {
            this.scenarioConfigs.forEach(sc => {
                const w = (sc.params && sc.params.withdrawal) || {};
                const accEnd = (sc.derived && sc.derived.accumulation && sc.derived.accumulation.values && sc.derived.accumulation.values.length)
                    ? sc.derived.accumulation.values[sc.derived.accumulation.values.length - 1]
                    : 0;
                if (!sc.derived) sc.derived = {};
                const derivedSeries = this.calculateWithdrawalSeries({
                    startCapital: w.retirementCapital ?? accEnd ?? 0,
                    years: w.years,
                    annualReturn: w.postRetirementReturn,
                    inflation: w.withdrawalInflation,
                    annualWithdrawal: w.annualWithdrawal,
                    rate: w.rate
                });
                if (derivedSeries) {
                    sc.derived.withdrawal = derivedSeries;
                }
            });
            this.rebuildChartLabels();
        }

        // Ensure labels are up-to-date even if no derivation was needed
        this.rebuildChartLabels();

        let { labels, datasets } = this.buildChartData('withdrawal');
        // Fallback: if labels are empty (edge case), synthesize from first scenario config
        if (!labels || labels.length === 0) {
            const first = this.scenarioConfigs[0];
            const years = Math.max(0, parseInt(first?.params?.withdrawal?.years ?? 0, 10) || 0);
            this.chartLabels.withdrawal = this.buildSequentialLabels(years > 0 ? years + 1 : 0);
            ({ labels, datasets } = this.buildChartData('withdrawal'));
        }

        this.charts.withdrawal = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    // Disable filler plugin to prevent rare errors when datasets are sparse
                    filler: false,
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: (context) => {
                                const formatted = new Intl.NumberFormat('de-DE', {
                                    style: 'currency',
                                    currency: 'EUR',
                                    maximumFractionDigits: 0
                                }).format(context.parsed?.y ?? context.parsed ?? 0);
                                return `${context.dataset?.label || 'Szenario'}: ${formatted}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: 'Verbleibendes Kapital (€)'
                        },
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        suggestedMin: 0,
                        ticks: {
                            callback: (value) => new Intl.NumberFormat('de-DE', {
                                style: 'currency',
                                currency: 'EUR',
                                maximumFractionDigits: 0
                            }).format(value)
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Entnahmejahr'
                        },
                        grid: { color: 'rgba(0,0,0,0.03)' }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    intersect: false
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

        const { labels, datasets } = this.buildChartData('metrics');

        // Custom plugin to fill radar polygons without relying on Chart.js filler
        const radarFillPlugin = {
            id: 'comparisonRadarFill',
            beforeDatasetsDraw: (chart) => {
                if (!chart || chart.config?.type !== 'radar') return;
                const { ctx } = chart;
                chart.data.datasets.forEach((ds, i) => {
                    const meta = chart.getDatasetMeta(i);
                    if (!meta || meta.hidden) return;
                    const pts = meta.data || [];
                    if (!pts.length) return;
                    ctx.save();
                    ctx.fillStyle = ds.backgroundColor || 'rgba(52,152,219,0.18)';
                    ctx.beginPath();
                    for (let k = 0; k < pts.length; k += 1) {
                        const p = pts[k];
                        const pos = p.getProps ? p.getProps(['x','y'], true) : p;
                        if (k === 0) ctx.moveTo(pos.x, pos.y); else ctx.lineTo(pos.x, pos.y);
                    }
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                });
            }
        };

        this.charts.metrics = new Chart(ctx, {
            type: 'radar',
            data: {
                labels,
                datasets
            },
            plugins: [radarFillPlugin],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    filler: false,
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    }
                },
                elements: {
                    line: { borderWidth: 2 },
                    point: { radius: 3 }
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

        const { labels, datasets } = this.buildChartData(chartType);

        datasets.forEach((dataset) => {
            const id = dataset._scenarioId || dataset.label;
            dataset.hidden = !this.activeScenarios.has(id);
        });

        // Safety: never render an empty Radar chart due to visibility sync glitches.
        if (chartType === 'metrics') {
            const anyVisible = datasets.some(ds => !ds.hidden);
            if (!anyVisible) {
                datasets.forEach(ds => { ds.hidden = false; });
            }
        }

        chart.data.labels = labels;
        chart.data.datasets = datasets;

        const canvas = chart.canvas;
        const parent = canvas?.parentElement || null;
        const hasWindow = typeof window !== 'undefined';
        const isVisible = hasWindow && parent
            ? parent.classList.contains('active') && window.getComputedStyle(parent).display !== 'none'
            : false;

        if (isVisible) {
            const schedule = typeof requestAnimationFrame === 'function'
                ? requestAnimationFrame
                : (fn) => setTimeout(fn, 0);
            schedule(() => {
                // Resize after the view is visible so Chart.js can measure correctly
                chart.resize();
                chart.update('none');
            });
        } else {
            chart.update('none');
        }
    }

    ensureChartExists(chartType) {
        if (this.charts[chartType]) return;

        const factoryMap = {
            lifecycle: () => this.createLifecycleChart(),
            accumulation: () => this.createAccumulationChart(),
            withdrawal: () => this.createWithdrawalChart(),
            metrics: () => this.createMetricsChart()
        };

        const factory = factoryMap[chartType];
        if (typeof factory === 'function') {
            factory();
        }
    }

    updateAllCharts() {
        Object.keys(this.charts).forEach(chartType => {
            this.updateChart(chartType);
        });
    }

    // Helpers
    formatCurrency(value) {
        if (!this.currencyFormatter) {
            this.currencyFormatter = new Intl.NumberFormat('de-DE', {
                style: 'currency',
                currency: 'EUR',
                maximumFractionDigits: 0
            });
        }
        const numeric = Number.isFinite(value) ? value : 0;
        return this.currencyFormatter.format(Math.round(numeric));
    }

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

        const newScenario = {
            id: newId,
            label: `✨ Szenario ${newIndex}`,
            color,
            params: {
                budget: { ...base.params.budget },
                accumulation: { ...base.params.accumulation },
                withdrawal: { ...base.params.withdrawal },
                results: { ...base.params.results }
            }
        };
        // Ensure sources field exists for chips
        newScenario.params.sources = newScenario.params.sources || { budgetName: '—', accumName: '—', withdrawName: '—' };

        this.scenarioConfigs.push(newScenario);
        this.activeScenarios.add(newScenario.id);
        this.refreshScenarioData(newScenario);

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
