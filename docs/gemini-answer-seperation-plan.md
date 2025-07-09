I have this giant app.js: 

I have this seperation plan: Of course. This is an excellent question. Your `app.js` file has grown to a point where splitting it into modules is the best way to manage its complexity, improve readability, and make it easier to maintain and debug.

The best practice for this is **Separation of Concerns**, where you group code by its functionality. We'll use JavaScript's native ES Modules (`import`/`export`) to achieve this.

Here is a recommended file structure and a breakdown of what should go into each file.

### Proposed File Structure

I recommend creating a `js` or `scripts` folder in your project's root directory to hold all the new files.

```
/
|-- index.html
|-- style.css
|-- js/
|   |-- app.js               // (The new, clean entry point)
|   |-- state.js             // Manages the application's global state
|   |-- utils.js             // Helper functions (formatting, parsing)
|   |
|   |-- core/
|   |   |-- accumulation.js  // Core calculation logic for the accumulation phase
|   |   |-- withdrawal.js    // Core calculation logic for the withdrawal phase
|   |   |-- budget.js        // Core calculation logic for the budget planner
|   |   |-- tax.js           // German tax calculation logic
|   |
|   |-- ui/
|   |   |-- mainChart.js     // Logic for the main accumulation/comparison charts
|   |   |-- withdrawalChart.js // Logic for withdrawal & integrated charts
|   |   |-- budgetChart.js   // Logic for the budget pie chart
|   |   |-- setup.js         // All setup functions for event listeners
|   |   |-- dom.js           // DOM manipulation functions (updates, toggles, etc.)
|   |
|   |-- features/
|   |   |-- scenarioManager.js  // Manages scenarios (add, remove, switch, save/load)
|   |   |-- profileManager.js   // Manages budget profiles via localStorage
```

---

### Breakdown of Each File

Here's what you should move into each new file.

#### 1. `js/state.js`
**Purpose:** A single source of truth for your application's state. All other modules will import state from here.

**What to move:** All the global variables at the top of your `app.js`.

```javascript
// js/state.js

// Chart instances
export let chart = null;
export let withdrawalChart = null;
export let budgetPieChart = null;
// ... and all other chart instances

// Main state variables
export let withdrawalData = [];
export let currentPhase = 'accumulation';
export let budgetData = {
    income: {},
    expenses: {},
    savings: { amount: 500, mode: 'fixed', percentage: 50 },
    periods: { income: 'monthly', fixed: 'monthly', variable: 'monthly' }
};

// Scenario Management
export let scenarios = [
    {
        id: 'A',
        name: 'Szenario A',
        color: '#3498db',
        inputs: {},
        yearlyData: [],
        results: {}
    }
];
export let activeScenario = 'A';
export const scenarioColors = { /* ... */ };

// Flags and settings
export let isSyncing = false;
export let lastSyncValue = 0;
// ... all other flags

// You will also need setters to modify these from other files
export function setChart(newChart) { chart = newChart; }
export function setActiveScenario(id) { activeScenario = id; }
// ... etc. for any state that needs to be changed.
```

#### 2. `js/utils.js`
**Purpose:** Reusable helper functions that don't depend on the application's state.

**What to move:** `formatCurrency`, `parseGermanNumber`, `formatGermanNumber`, `escapeHtml`, and the `debouncedRecalculateAll` logic.

```javascript
// js/utils.js

export function formatCurrency(amount) { /* ... */ }
export function parseGermanNumber(value) { /* ... */ }
export function formatGermanNumber(value, decimals = 2) { /* ... */ }
export function escapeHtml(text) { /* ... */ }

export function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}
```

#### 3. `core/` (Calculation Logic)
These files should contain pure functions that take inputs and return results, with no direct DOM manipulation.

*   **`js/core/accumulation.js`**
    *   `calculateWealthDevelopment()`
    *   `calculateMultiPhaseWealthDevelopment()`

*   **`js/core/withdrawal.js`**
    *   `calculateWithdrawalPlan()`
    *   `simulateWithdrawal()`
    *   `calculateDirectAnnuityPayment()`
    *   ...and all its helper functions.

*   **`js/core/budget.js`**
    *   `calculateBudget()` (The logic part, not the DOM updates)

*   **`js/core/tax.js`**
    *   `calculateGermanETFTax()`
    *   `calculateGermanNetSalary()`

**Example `js/core/tax.js`:**
```javascript
// js/core/tax.js

// Note: This function might need state like `usedSparerpauschbetrag`.
// It's better to pass state in as a parameter or manage it within this module.
export function calculateGermanETFTax(startCapital, endCapital, /*...all params...*/) {
    // ... calculation logic ...
    return tax;
}

export function calculateGermanNetSalary(grossSalary, /*...all params...*/) {
    // ... calculation logic ...
    return netSalary;
}
```

#### 4. `ui/` (User Interface Logic)
These files handle everything the user sees and interacts with.

*   **`js/ui/mainChart.js`**
    *   `updateMainChart()`
    *   `updateComparisonChart()`
    *   `updateContributionsGainsChart()`
    *   `displayChartErrorMessage()`

*   **`js/ui/withdrawalChart.js`**
    *   `updateWithdrawalChart()`
    *   `createIntegratedTimeline()`

*   **`js/ui/budgetChart.js`**
    *   `updateBudgetPieChart()`

*   **`js/ui/dom.js`**
    *   `updateScenarioResults()`
    *   `updateWithdrawalResults()`
    *   `updateWithdrawalTable()`
    *   `updateTeilfreistellungToggleState()`
    *   `updateScenarioSliderValue()`
    *   `showNotification()`

*   **`js/ui/setup.js`**
    *   All the `setup...Listeners()` functions.
    *   `setupPhaseToggle()`
    *   `initializeScenarioSliderValues()`

**Example `js/ui/setup.js`:**
```javascript
// js/ui/setup.js
import { recalculateAll } from '../app.js'; // Import main orchestrator function
import { debounce } from '../utils.js';
// ... other imports

const debouncedRecalculate = debounce(recalculateAll, 150);

export function setupScenarioListeners() {
    // ... setup logic ...
    const slider = document.getElementById('someSlider');
    slider.addEventListener('input', debouncedRecalculate);
}

export function setupAll() {
    setupScenarioListeners();
    setupComparisonScenarioListeners();
    // ... call all other setup functions
}
```

#### 5. `features/` (High-Level Feature Management)

*   **`js/features/scenarioManager.js`**
    *   `addNewScenario()`
    *   `createScenarioPanel()`
    *   `createScenarioTab()`
    *   `switchToScenario()`
    *   `removeScenario()`
    *   `renameScenario()`
    *   All the logic for saving/loading/managing the main scenarios (not the budget profiles).

*   **`js/features/profileManager.js`**
    *   All the functions related to the Budget Profile modals (`openSaveProfileModal`, `confirmSaveProfile`, `loadProfilesForModal`, etc.).
    *   All `localStorage` interaction for budget profiles.

#### 6. `js/app.js` (The New Entry Point)
This file becomes the main orchestrator. It will be much smaller and cleaner.

```javascript
// js/app.js

import * as state from './state.js';
import * as utils from './utils.js';
import { setupAll } from './ui/setup.js';
import { runScenario } from './core/accumulation.js'; // Example
// ... import other necessary functions

// The main recalculation function that ties everything together
export function recalculateAll() {
    state.scenarios.forEach(scenario => {
        // Here you'd call the core calculation logic
        // e.g., runScenario(scenario);
    });
    // Then update the UI
    // e.g., updateScenarioResults();
    // e.g., updateMainChart();
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Set up all event listeners
    setupAll();

    // Run initial calculations
    recalculateAll();
    // calculateBudget();
    // calculateTaxes();
});
```

---

### How to Implement This Refactoring

1.  **Create the Folder Structure:** Make the new folders (`js`, `js/core`, `js/ui`, `js/features`).
2.  **Update `index.html`:** Change your script tag to point to the new `app.js` and, most importantly, add `type="module"`.
    ```html
    <!-- Before -->
    <script src="app.js"></script>

    <!-- After -->
    <script type="module" src="js/app.js"></script>
    ```
3.  **Move Code in Small Steps:**
    *   Start with the easiest files: `utils.js` and `state.js`. Create them, move the code, and add `export` to every function/variable you need to access from elsewhere.
    *   Move the core calculation logic into the `core/` files. These should have few dependencies.
    *   Move the chart functions into the `ui/` chart files. Update them to `import` what they need.
    *   Move the rest of the UI and setup logic. This will be the most work, as you'll need to add many `import` statements at the top of these files.
    *   Finally, clean up `app.js` to be the lean entry point.

### Why This Structure is Better

*   **Readability:** Anyone opening a file like `core/withdrawal.js` knows exactly what it's for.
*   **Maintainability:** If there's a bug in the tax calculation, you only need to look in `core/tax.js`.
*   **Reusability:** Your `utils.js` functions can be used in any project. Your core calculation logic could be reused in a different UI.
*   **Easier Debugging:** It's much easier to trace data flow between small, focused modules than within one giant file.
*   **Scalability:** Adding a new feature (e.g., a stock screener) is as simple as adding a new file in `features/` and `core/` without touching the existing, working code.

Can you provide me the full content of each file reflecting the seperation plan?
Make sure to not forget anything and the most important goal is that it will work like now with the one giant app.js