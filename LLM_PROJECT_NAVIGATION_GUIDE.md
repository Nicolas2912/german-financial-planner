# German Financial Planner - LLM Project Navigation Guide

*Last Updated: 2025-08-27*

## 🎯 PROJECT OVERVIEW

**German Financial Planner** is a sophisticated web-based ETF investment calculator designed for German tax regulations. The application provides comprehensive financial planning from budgeting through ETF investment accumulation to retirement withdrawal phases.

### Core Features
- **Multi-Phase Financial Planning**: Budget → ETF Accumulation → Withdrawal → Scenario Comparison
- **German Tax Compliance**: Abgeltungssteuer (25%), Vorabpauschale, Teilfreistellung
- **Advanced Scenario Management**: Compare multiple investment strategies
- **Multi-Phase Savings**: Different savings rates across life phases
- **Profile Management**: Save/load complete financial configurations
- **Real-time Calculations**: Live updates with optimized performance

### Technology Stack
- **Frontend**: Pure JavaScript ES6 modules (no framework dependencies)
- **Styling**: Modular CSS architecture
- **Charts**: Chart.js for data visualization  
- **Architecture**: Client-side only, no backend required
- **Development**: Served via local HTTP server (Python/Node.js/PHP)

---

## 📁 PROJECT STRUCTURE OVERVIEW

```
german-financial-planner/
├── index.html                  # Application launcher page
├── public/                     # Main application directory
│   ├── etf_savings.html        # Primary application interface
│   ├── scenario-comparison.html # Standalone scenario comparison
│   ├── hover_mouse_exampl.html # Chart.js tooltip example
│   ├── js/                     # JavaScript modules
│   ├── css/                    # Modular CSS files
│   ├── app_old.js             # ❌ IGNORE - Legacy file
│   └── style_old.css          # ❌ IGNORE - Legacy file
├── docs/                       # Documentation and specs
├── images-codex/              # UI mockups and design assets
├── dev-server.py              # Python development server
├── clear_storage.js           # Utility for clearing localStorage
├── server.log                 # Development logs
└── README.md, LICENSE, etc.   # Project metadata
```

---

## 🚀 QUICK START FOR LLMS

### Finding Entry Points
1. **Main Application**: `public/etf_savings.html` - The primary interface
2. **App Logic**: `public/js/app.js` - Main application orchestrator
3. **State Management**: `public/js/state.js` - Global application state
4. **Core Calculations**: `public/js/core/` - Financial calculation engines

### Understanding User Flow
1. **Budget Planning** → Set income, expenses, determine savings rate
2. **ETF Accumulation** → Configure investment parameters, scenarios
3. **Withdrawal Planning** → Plan retirement withdrawal strategy  
4. **Scenario Comparison** → Compare different financial strategies

### Key Architecture Patterns
- **Module System**: ES6 imports/exports, no bundling
- **State Management**: Centralized in `state.js`, reactive updates
- **Event Handling**: Debounced recalculation for performance
- **Responsive Design**: Mobile-first CSS architecture

---

## 🧭 NAVIGATION BY TASK TYPE

### 🔧 **MODIFYING FINANCIAL CALCULATIONS**
**Target Files**:
- `public/js/core/accumulation.js` - ETF growth calculations  
- `public/js/core/withdrawal.js` - Retirement withdrawal logic
- `public/js/core/tax.js` - German tax calculations
- `public/js/core/budget.js` - Budget analysis

**Key Functions**:
- `runScenario()` - Main accumulation calculation
- `calculateWithdrawal()` - Withdrawal phase calculations
- `calculateTax()` - German tax computations

### 🎨 **UI/UX MODIFICATIONS**
**Target Files**:
- `public/css/main.css` - CSS module entry point
- `public/css/modules/components.css` - Interactive elements
- `public/css/modules/layout.css` - Page structure
- `public/css/modules/scenarios.css` - Scenario comparison UI

**Key Components**:
- `.phase-button` - Main navigation buttons
- `.scenario-panel` - Individual scenario configuration
- `.result-card` - Financial result displays
- `.savings-mode-btn` - Simple vs multi-phase savings toggle

### ⚙️ **FUNCTIONALITY ENHANCEMENTS**
**Target Files**:
- `public/js/features/scenarioManager.js` - Scenario CRUD operations
- `public/js/features/profileManager.js` - Profile save/load
- `public/js/features/scenarioComparison.js` - Advanced comparison
- `public/js/ui/setup/` - Event listeners and UI initialization

**Key Patterns**:
- Scenario Management: `addNewScenario()`, `copyScenario()`, `renameScenario()`
- Profile Management: `saveProfile()`, `loadProfile()`, `deleteProfile()`
- UI Setup: `setupScenarioListeners()`, `setupBudgetListeners()`

### 📊 **CHART AND VISUALIZATION**
**Target Files**:
- `public/js/ui/mainChart.js` - Primary accumulation charts
- `public/js/ui/withdrawalChart.js` - Withdrawal phase charts  
- `public/js/ui/budgetChart.js` - Budget pie charts

**Chart Types**:
- **Accumulation Chart**: Scenario comparison over time
- **Contributions vs Gains**: Investment breakdown
- **Withdrawal Chart**: Retirement cashflow timeline
- **Integrated Timeline**: Full lifecycle visualization

### 🗂️ **STATE AND DATA MANAGEMENT**
**Target Files**:
- `public/js/state.js` - Global application state
- `public/js/utils.js` - Utility functions
- Local storage management throughout application

**Key State Variables**:
- `scenarios[]` - All investment scenarios
- `budgetData{}` - Budget configuration
- `withdrawalData[]` - Withdrawal calculations
- `currentPhase` - Active application phase

---

## 📋 DETAILED FILE REFERENCE

### 🌟 **CRITICAL FILES (Modify These First)**

#### `public/js/app.js` - Application Orchestrator
- **Purpose**: Main entry point, coordinates all modules
- **Key Functions**: `recalculateAll()`, `autoSyncWithdrawalCapital()`
- **Dependencies**: Imports from all major modules
- **Modify When**: Adding new features, changing application flow

#### `public/js/state.js` - State Management
- **Purpose**: Centralized application state and reactivity
- **Key Exports**: `scenarios`, `budgetData`, `currentPhase`, chart instances
- **Modify When**: Adding new state variables, changing data structures

#### `public/etf_savings.html` - Main UI Template
- **Purpose**: Primary application interface with all phases
- **Key Sections**: Budget, accumulation, withdrawal, scenario comparison
- **Modify When**: Adding UI components, restructuring layout

### 🔧 **CORE CALCULATION ENGINE**

#### `public/js/core/accumulation.js`
- **Purpose**: ETF investment growth calculations
- **Key Function**: `runScenario(scenario)` - Main calculation engine
- **Handles**: Compound interest, multi-phase savings, tax calculations
- **German Features**: Vorabpauschale, Teilfreistellung

#### `public/js/core/tax.js`  
- **Purpose**: German tax calculations
- **Key Features**: Abgeltungssteuer (25%), Vorabpauschale calculation
- **Tax Types**: Income tax, solidarity surcharge, church tax
- **Modify When**: Tax law changes, new calculation methods

#### `public/js/core/withdrawal.js`
- **Purpose**: Retirement withdrawal phase calculations  
- **Key Features**: Safe withdrawal rates, tax on gains, inflation adjustment
- **German Features**: Sparerpauschbetrag (€1,000 annual exemption)

#### `public/js/core/budget.js`
- **Purpose**: Personal budget analysis and savings rate calculation
- **Key Features**: Income/expense categorization, available savings calculation

### 🎯 **FEATURE MODULES**

#### `public/js/features/scenarioManager.js`
- **Purpose**: Complete scenario lifecycle management
- **Key Functions**: `addNewScenario()`, `copyScenario()`, `removeScenario()`
- **UI Generation**: Dynamic creation of scenario panels and tabs
- **Modify When**: Adding scenario features, changing scenario structure

#### `public/js/features/profileManager.js`
- **Purpose**: Save and load complete application profiles
- **Key Functions**: `saveProfile()`, `loadProfile()`, profile modal management
- **Storage**: Uses localStorage for persistence
- **Modify When**: Changing profile structure, adding profile features

#### `public/js/features/scenarioComparison.js`
- **Purpose**: Advanced scenario comparison interface
- **Key Features**: Side-by-side parameter comparison, specialized charts
- **UI Components**: Parameter panels, results visualization

### 🖥️ **USER INTERFACE**

#### `public/js/ui/setup/index.js`
- **Purpose**: Aggregates all UI setup functions
- **Key Exports**: Event listener setup for all application phases
- **Modify When**: Adding new interactive elements

#### `public/js/ui/dom.js`  
- **Purpose**: DOM manipulation utilities
- **Key Functions**: `updateScenarioResults()`, `showNotification()`
- **Modify When**: Changing result displays, notification system

#### `public/js/ui/mainChart.js`
- **Purpose**: Primary Chart.js integration for accumulation phase
- **Chart Types**: Scenario comparison, contributions vs gains
- **Features**: Dynamic legend, hover interactions, responsive design

#### `public/js/ui/withdrawalChart.js`  
- **Purpose**: Withdrawal phase and integrated timeline charts
- **Key Features**: Cashflow visualization, lifecycle timeline
- **German Features**: Tax visualization, real vs nominal values

### 🎨 **STYLING ARCHITECTURE**

#### `public/css/main.css` - Entry Point
- **Purpose**: Imports all CSS modules in correct cascade order
- **Architecture**: Base → Layout → Components → Scenarios → Utilities
- **Modify**: Only to adjust import order

#### `public/css/modules/base.css`
- **Purpose**: CSS reset, variables, typography, body styles
- **Key Variables**: Color scheme, spacing scale, typography hierarchy
- **Modify When**: Changing design system fundamentals

#### `public/css/modules/components.css`  
- **Purpose**: Interactive elements (buttons, toggles, forms, cards)
- **Key Components**: `.phase-button`, `.toggle`, `.result-card`, `.savings-mode-btn`
- **Modify When**: Changing component appearance, adding new components

#### `public/css/modules/scenarios.css`
- **Purpose**: Scenario comparison system styling
- **Key Features**: Scenario tabs, panels, comparison tables
- **Modify When**: Changing scenario management UI

#### `public/css/modules/layout.css`
- **Purpose**: Page structure, grids, responsive layout  
- **Key Classes**: `.container`, `.budget-grid`, `.results-grid`
- **Modify When**: Changing page layout, responsive behavior

#### `public/css/modules/utilities.css`
- **Purpose**: Animations, modals, tables, helper classes
- **Key Features**: Modal system, table styling, animation definitions
- **Modify When**: Adding utility classes, modal behavior

---

## 🎯 COMMON MODIFICATION PATTERNS

### ➕ **Adding New Input Fields**
1. **HTML**: Add input to relevant section in `etf_savings.html`
2. **JavaScript**: Add to calculation functions in `core/` modules  
3. **CSS**: Style in appropriate `modules/` file
4. **State**: Add to state management if needed in `state.js`

### 📊 **Adding New Calculations**
1. **Core Logic**: Implement in relevant `core/` module
2. **Integration**: Call from `app.js` in `recalculateAll()`
3. **UI Display**: Update result display in `ui/dom.js`
4. **Testing**: Verify with multiple scenarios

### 🆕 **Adding New Phases**
1. **HTML Structure**: Add phase section to `etf_savings.html`
2. **Phase Management**: Update `setupPhaseToggle()` in `ui/setup/`
3. **Navigation**: Add phase button to header navigation
4. **State**: Add phase to `currentPhase` state management

### 🎨 **Modifying Visual Design**
1. **Variables**: Update in `css/modules/base.css` for global changes
2. **Components**: Modify specific components in `css/modules/components.css`
3. **Layout**: Adjust structure in `css/modules/layout.css`
4. **Animations**: Add/modify in `css/modules/utilities.css`

---

## ⚠️ IMPORTANT DEVELOPMENT NOTES

### 🚫 **Files to AVOID**
- `public/app_old.js` - Legacy file, do not modify
- `public/style_old.css` - Legacy file, do not modify  
- Any file with `_old` suffix

### 🎯 **Development Best Practices**
- **Always run local server**: Application requires HTTP server due to ES6 modules
- **Test across scenarios**: Verify changes work with multiple scenarios
- **Check mobile layout**: Ensure responsive design isn't broken
- **Validate calculations**: Cross-check financial calculations for accuracy
- **German compliance**: Maintain German tax law accuracy

### 🔄 **State Management Principles**  
- **Centralized State**: Use `state.js` for global state
- **Reactive Updates**: Changes trigger `recalculateAll()` 
- **Debounced Recalc**: UI changes are debounced for performance
- **Local Storage**: Profiles and scenarios persist locally

### 🚀 **Performance Considerations**
- **Debounced Updates**: Use `debouncedRecalculateAll()` for UI changes
- **Chart Optimization**: Charts are updated efficiently via state management
- **Memory Management**: Large calculations are optimized for browser limits

---

## 🧪 TESTING AND DEBUGGING

### 🔍 **Common Debugging Locations**
- **Console Logs**: Check browser console for errors
- **State Inspection**: Use `window.state` in browser console  
- **Calculation Verification**: Add logging to `core/` modules
- **UI State**: Inspect DOM classes and attributes

### ✅ **Testing Checklist**
- [ ] All phases load correctly
- [ ] Scenario switching works
- [ ] Charts render and update
- [ ] Calculations are mathematically correct
- [ ] German tax calculations are accurate  
- [ ] Responsive design functions
- [ ] Local storage persistence works
- [ ] Modal systems function properly

### 🐛 **Common Issues and Solutions**
- **Module Import Errors**: Check file paths and exports
- **Chart Not Rendering**: Verify Chart.js CDN and canvas elements
- **Calculation Errors**: Check number parsing (German decimal format)
- **State Sync Issues**: Verify state updates trigger recalculation
- **Mobile Layout Issues**: Check CSS media queries and flexbox

---

## 📚 FEATURE DOCUMENTATION REFERENCES

### Core Documentation Files (in `/docs/`)
- `ETF_Calculator_Documentation.md` - Core calculation explanations
- `FORMULAS.md` - Mathematical formulas used  
- `TAX_CALCULATION_FIXES.md` - German tax calculation specifics
- `features/features.md` - Feature specifications
- `PRD.md` - Product Requirements Document

### Development History
- `Chart_Hover_Issue_Documentation.md` - Chart.js integration notes
- `file_seperation_plan.md` - Architecture evolution
- `gemini-answer-seperation-plan.md` - AI-assisted development notes

---

## 🎉 CONCLUSION

This German Financial Planner is a sophisticated, modular application with clear separation of concerns. When modifying:

1. **Understand the Module**: Read the target file's purpose and key functions
2. **Check Dependencies**: Understand what imports/exports the file
3. **Test Thoroughly**: Verify changes across multiple scenarios and devices  
4. **Maintain Standards**: Follow existing code patterns and German compliance
5. **Update Documentation**: Keep this guide current with significant changes

The modular architecture makes the codebase maintainable and extensible. Each module has a clear purpose, making it easy to locate and modify specific functionality without affecting other parts of the system.

**Happy Coding! 🚀**