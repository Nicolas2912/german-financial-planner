# German Financial Planner – Product Requirements Document (PRD)

## 1. Purpose
Provide German investors with an easy-to-use, accurate and transparent web application that models long-term wealth accumulation (Ansparphase) and withdrawal (Entnahmephase) scenarios, accounting for realistic German tax rules, variable savings rates and other lifestyle factors. The tool should help users make data-driven financial decisions by comparing scenarios side-by-side on an appealing, performant and fully responsive website.

## 2. Background & Motivation
• Existing calculators are either too simplistic (ignore taxes/inflation) or overly complex for casual users.<br/>
• The current codebase consists of a single `public/app.js`, making maintenance and feature growth difficult.<br/>
• Refactoring into well-scoped ES modules (see _File Separation Plan_) will unlock faster iteration and higher code quality.

## 3. Goals & Objectives
1. Refactor codebase following the agreed folder structure to maximise maintainability.
2. Deliver precise financial calculations that adhere to German regulation (§20 EStG, Abgeltungssteuer, Teilfreistellung).
3. Render interactive visualisations (Chart.js) that instantly reflect user input.
4. Offer scenario management (save, rename, delete) and multi-phase saving patterns.
5. Guarantee consistent experience across desktop, tablet and mobile.
6. Establish automated tests to prevent regressions and confirm calculation accuracy.

## 4. Target Users & Personas
| Persona | Description | Needs |
|---------|-------------|-------|
| “Young Saver” | 25-year-old starting ETF savings plan | Understand compound growth & tax impact, optimise monthly rate |
| “Family Planner” | 35-year-old with kids & mortgage | Evaluate budget allocation, multi-phase saving levels |
| “Soon-to-Retire” | 58-year-old approaching retirement | Optimise withdrawal speed, tax-efficient strategy |

## 5. Key Use-Cases / User Stories
1. _As a user_ I enter monthly contribution, expected return, duration and see projected end capital after taxes.
2. _As a user_ I simulate a withdrawal plan with custom yearly spending and view portfolio depletion timeline.
3. _As a user_ I define multiple scenarios (A, B, C) and compare them on one chart.
4. _As a user_ I configure a multi-phase savings plan (e.g., 500 € for 5 yrs, then 1 000 €) and see combined result.
5. _As a user_ I adjust inputs on mobile and the layout remains legible and touch-friendly.

## 6. Functional Requirements
### 6.1 Calculations / Core Logic
FR-C-01  Accumulation: compute yearly/monthly capital evolution with compound interest.<br/>
FR-C-02  Withdrawal: simulate withdrawals incl. partial years, residual value, inflation option.<br/>
FR-C-03  Tax: apply German ETF taxation (Vorabpauschale, Abgeltungssteuer, Teilfreistellung, Pauschbetrag).<br/>
FR-C-04  Multi-Phase: support up to N distinct saving phases with unique rate & duration.<br/>
FR-C-05  Budget Planner: allocate income vs. expenses, derive saving potential.

### 6.2 Scenario Management & State
FR-S-01  Persist multiple scenarios in localStorage.<br/>
FR-S-02  Colour-code scenarios; allow rename, duplicate, delete.<br/>
FR-S-03  Global state kept in `state.js`, mutated only through explicit setters.

### 6.3 User Interface
FR-U-01  Input forms with sensible defaults & inline validation.<br/>
FR-U-02  Chart views: main accumulation, contributions vs. gains, withdrawal timeline, budget pie.<br/>
FR-U-03  Notification system for errors, tax hints etc.<br/>
FR-U-04  Fully responsive (CSS Grid/Flexbox + media queries).<br/>
FR-U-05  Mobile-first touch optimised controls.

### 6.4 Architecture & Modularity
FR-A-01  Adopt structure from `docs/file_seperation_plan.md` (js/, core/, ui/, features/ …).<br/>
FR-A-02  Use native ES Modules, no global variables outside `state.js`.<br/>
FR-A-03  Each module exports pure functions unless UI-related.<br/>
FR-A-04  `app.js` acts only as orchestrator & bootstrapper.

### 6.5 Testing
FR-T-01  Unit tests for all core calculation functions (Jest).<br/>
FR-T-02  Integration tests for scenario workflows (Playwright).<br/>
FR-T-03  Coverage ≥ 80 % for core logic.

### 6.6 Non-functional
FR-N-01  Calculation accuracy difference ≤ 0.1 € vs. certified spreadsheet.<br/>
FR-N-02  Page interactive < 100 ms on modern desktop, < 200 ms mobile.<br/>
FR-N-03  Lighthouse performance score ≥ 90 mobile & desktop.<br/>
FR-N-04  Accessibility WCAG 2.1 AA.

## 7. Milestones & Roadmap
| Phase | Deliverables | Estimated Effort |
|-------|--------------|------------------|
| 0 ‑ Setup | Repo hygiene, ESLint, Prettier, basic CI | 0.5 wk |
| 1 ‑ Refactor | Implement folder structure, migrate logic to modules, update HTML tags | 1.5 wk |
| 2 ‑ Desktop Responsive | Adaptive layout up to 4K, flex-based grids | 0.5 wk |
| 3 ‑ Mobile Optimisation | Touch UI, off-canvas nav, performance tweaks | 1 wk |
| 4 ‑ Testing Harness | Jest + Playwright config, first test suites | 1 wk |
| 5 ‑ Advanced Features | Multi-phase, budget planner, integrated charts | 2 wk |
| 6 ‑ Polish & Launch | Bug-fix, docs, SEO, Lighthouse cleanup | 0.5 wk |

## 8. Success Metrics
• 100 % of calculation unit tests pass.<br/>
• User can complete a full scenario comparison in < 2 min on mobile.<br/>
• Bounce rate < 40 % two weeks after launch.<br/>
• GitHub Issues: < 5 high-severity calculation bugs post-release.

## 9. Acceptance Criteria (per Phase)
1. _Refactor_ – All legacy globals removed; build passes; site behaves identical.<br/>
2. _Responsive_ – No horizontal scrollbars at 1280×800, 1920×1080, 2560×1440.<br/>
3. _Mobile_ – Lighthouse mobile ≥ 90; touch targets ≥ 48 × 48 px.<br/>
4. _Testing_ – CI fails on coverage < 80 % or failing tests.<br/>
5. _Advanced_ – Calculator returns values matching reference sheet ±0.1 %.

## 10. Risks & Mitigations
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Tax logic complexity | Wrong advice → user distrust | Medium | Rely on official formulas, create exhaustive test cases |
| Refactor regression | Break existing features | High | Gradual migration, snapshot tests |
| Mobile performance | Slow charts on low-end devices | Medium | Use canvas, throttle redraws |
| Scope creep | Delay release | Medium | Lock feature set per phase, track issues |

## 11. Out-of-Scope
• Backend services or user authentication.<br/>
• Real-time stock price integration.<br/>
• Stochastic simulations (Monte Carlo) – can be future work.

## 12. Appendix
• _File Separation Plan_ – implementation blueprint.<br/>
• _FORMULAS.md_ – authoritative calculation references. 