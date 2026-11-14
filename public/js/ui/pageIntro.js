// Page heading, journey stepper and chart theme for the editorial layout

const PAGES = {
  budgetPhase: {
    eyebrow: '01 / Grundlage schaffen',
    title: 'Budgetplanung',
    lede: 'Einnahmen und Ausgaben im Blick. Daraus entsteht deine Sparrate.'
  },
  accumulationPhase: {
    eyebrow: '02 / Vermögen aufbauen',
    title: 'Ansparphase',
    lede: 'Heute vorsorgen. Morgen freier leben.'
  },
  withdrawalPhase: {
    eyebrow: '03 / Finanzielle Freiheit',
    title: 'Entnahmephase',
    lede: 'Gut vorgesorgt. Entspannt weiterleben.'
  },
  scenarioComparisonPhase: {
    eyebrow: 'Pläne vergleichen',
    title: 'Szenario-Vergleich',
    lede: 'Gespeicherte Pläne nebeneinander, von der Budgetplanung bis zur Rente.'
  },
  taxCalculatorPhase: {
    eyebrow: 'Werkzeug',
    title: 'Steuer- & Gehaltsrechner',
    lede: 'Vom Brutto zum Netto, mit Steuern und Sozialabgaben nach dem Stand 2025.'
  }
};

const JOURNEY = ['budgetPhase', 'accumulationPhase', 'withdrawalPhase'];

export const THEME = {
  ink: '#343A2E',
  muted: '#6F6E62',
  rule: '#E2DACA',
  surface: '#FCFAF5',
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
};

function showPage(id) {
  const page = PAGES[id];
  if (!page) return;

  document.getElementById('pageEyebrow').textContent = page.eyebrow;
  document.getElementById('pageTitle').textContent = page.title;
  document.getElementById('pageLede').textContent = page.lede;
  document.title = `${page.title} · Finanzplan`;

  document.querySelectorAll('.app-nav .phase-button').forEach(button => {
    if (button.id === id) {
      button.setAttribute('aria-current', 'page');
    } else {
      button.removeAttribute('aria-current');
    }
  });

  const journey = document.getElementById('journeySteps');
  const activeIndex = JOURNEY.indexOf(id);
  journey.hidden = activeIndex === -1;
  journey.querySelectorAll('.journey-step').forEach((step, index) => {
    step.classList.toggle('is-active', index === activeIndex);
    step.classList.toggle('is-done', activeIndex > -1 && index < activeIndex);
  });
}

export function applyChartTheme() {
  const Chart = window.Chart;
  if (!Chart || !Chart.defaults) return;
  Chart.defaults.font = { ...(Chart.defaults.font || {}), family: THEME.sans, size: 12 };
  Chart.defaults.color = THEME.muted;
  Chart.defaults.borderColor = THEME.rule;
}

// The toggles are styled divs: make them reachable and announced as switches
export function enhanceToggles(root = document) {
  root.querySelectorAll('.toggle:not([role])').forEach(toggle => {
    const label = toggle.closest('.toggle-container')?.querySelector('label')?.textContent.trim();
    toggle.setAttribute('role', 'switch');
    toggle.setAttribute('tabindex', '0');
    if (label) toggle.setAttribute('aria-label', label);
    toggle.setAttribute('aria-checked', String(toggle.classList.contains('active')));
    toggle.addEventListener('keydown', event => {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        toggle.click();
      }
    });
  });
}

function watchToggles() {
  if (typeof MutationObserver === 'undefined') return;
  const root = document.body;
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      const target = mutation.target;
      if (mutation.type === 'attributes' && target.classList?.contains('toggle')) {
        target.setAttribute('aria-checked', String(target.classList.contains('active')));
      } else if (mutation.type === 'childList' && [...mutation.addedNodes].some(node => node.querySelector?.('.toggle'))) {
        enhanceToggles(root);
      }
    });
  });
  observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
}

export function setupPageIntro() {
  applyChartTheme();
  enhanceToggles();
  watchToggles();

  document.querySelectorAll('.app-nav .phase-button').forEach(button => {
    button.addEventListener('click', () => {
      showPage(button.id);
      button.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
      if (window.scrollY > 0) window.scrollTo({ top: 0 });
    });
  });

  document.querySelectorAll('.journey-step').forEach(step => {
    step.addEventListener('click', () => {
      document.getElementById(step.dataset.phaseTarget)?.click();
    });
  });

  const active = document.querySelector('.app-nav .phase-button.active');
  if (active) showPage(active.id);
}
