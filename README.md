# 💰 German Financial Planner
### Comprehensive ETF Investment & Retirement Planning Tool

<div align="center">

![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)
![Chart.js](https://img.shields.io/badge/Chart.js-4.x-orange.svg)
![German Tax Compliant](https://img.shields.io/badge/German%20Tax-2025%20Compliant-green.svg)

*A sophisticated web application for complete German financial planning - from salary calculation and budgeting to ETF investment modeling and retirement planning.*

[🚀 Live Demo](https://Nicolas2912.github.io/german-financial-planner/)

</div>

---

## 📋 Table of Contents

<details>
<summary><strong>🔍 Click to expand/collapse</strong></summary>

- [🌟 Overview](#-overview)
  - [🔄 Integrated Financial Journey](#-integrated-financial-journey)
  - [🎯 What Makes This Special](#-what-makes-this-special)
- [✨ Connected Features & Data Flow](#-connected-features--data-flow)
  - [💼 Phase 1: German Tax & Salary Calculator](#-phase-1-german-tax--salary-calculator--feeds-budget-planning)
  - [💰 Phase 2: Budget Planning & Management](#-phase-2-budget-planning--management--determines-investment-capacity)
  - [📈 Phase 3: ETF Investment Planning](#-phase-3-etf-investment-planning--builds-retirement-capital)
  - [🏖️ Phase 4: Retirement Planning](#️-phase-4-retirement-planning--completes-the-journey)
  - [🔍 Phase 5: Advanced Scenario Comparison](#-phase-5-advanced-scenario-comparison--optimizes-your-strategy)
- [🇩🇪 German Tax Compliance](#-german-tax-compliance)
  - [2025 Tax Implementation](#2025-tax-implementation)
  - [ETF Taxation Features](#etf-taxation-features)
- [🚀 Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Quick Start](#quick-start)
  - [📁 Project Structure](#-project-structure)
- [📊 Connected Workflow Guide](#-connected-workflow-guide)
  - [🔄 The Complete Financial Journey](#-the-complete-financial-journey)
  - [📝 Phase 1: Discover Your True Earning Power](#-phase-1-discover-your-true-earning-power)
  - [💰 Phase 2: Understand Your Financial Capacity](#-phase-2-understand-your-financial-capacity-uses-phase-1-data)
  - [📈 Phase 3: Build Your Investment Strategy](#-phase-3-build-your-investment-strategy-uses-phase-1--2-data)
  - [🏖️ Phase 4: Plan Your Retirement](#️-phase-4-plan-your-retirement-uses-all-previous-data)
  - [🔍 Phase 5: Compare & Optimize](#-phase-5-compare--optimize-analyzes-complete-journey)
  - [💡 Key Integration Points](#-key-integration-points)
- [🛠️ Technical Details](#️-technical-details)
  - [Built With](#built-with)
  - [Key Technical Features](#key-technical-features)
  - [Performance Optimizations](#performance-optimizations)
- [📖 Documentation](#-documentation)
  - [Core Documentation](#core-documentation)
  - [Development Resources](#development-resources)
- [🔧 Customization](#-customization)
  - [Adding New Scenarios](#adding-new-scenarios)
  - [Extending Tax Calculations](#extending-tax-calculations)
- [🤝 Contributing](#-contributing)
  - [Development Guidelines](#development-guidelines)
- [📄 License](#-license)
- [🙏 Acknowledgments](#-acknowledgments)
- [📞 Support](#-support)

</details>

---

## 🌟 Overview

The **German Financial Planner** is a comprehensive, single-page web application designed specifically for the German market. It creates a **seamless financial planning journey** that connects every aspect of your financial life - from understanding your true earning capacity to planning your retirement lifestyle.

### 🔄 **Integrated Financial Journey**

Unlike standalone calculators, this application creates a **connected workflow** where each phase builds upon the previous one:

**Tax Calculator** → **Budget Planning** → **Investment Modeling** → **Retirement Planning**

Each phase automatically transfers relevant data to the next, creating a cohesive financial plan where your salary calculations inform your budget, your budget determines your investment capacity, and your investment results shape your retirement strategy.

### 🎯 What Makes This Special

- **🔗 Seamless Data Flow**: Each phase connects to the next with automatic data transfer
- **🇩🇪 German Tax Law Compliant**: Full implementation of 2025 German tax rates, social insurance, and ETF taxation rules
- **📈 Mathematical Precision**: Uses exact formulas including Newton-Raphson iteration for portfolio calculations
- **🔄 Complete Lifecycle**: From salary calculation to retirement planning in one integrated tool
- **📊 Advanced Visualizations**: Interactive charts with Chart.js for comprehensive financial analysis
- **💾 Data Persistence**: Profile management and scenario comparisons with local storage


---

## ✨ Connected Features & Data Flow

### 💼 **Phase 1: German Tax & Salary Calculator** → *Feeds Budget Planning*
- **2025 Tax Compliance**: Official German tax brackets, social insurance rates
- **All 16 Federal States**: State-specific church tax rates  
- **Progressive Tax Modeling**: Realistic salary increase impact on net income
- **Complete Deductions**: Health, pension, unemployment, and care insurance
- **🔗 Automatic Transfer**: Net salary flows directly into budget planning

### 💰 **Phase 2: Budget Planning & Management** → *Determines Investment Capacity*
- **Comprehensive Categories**: Income, fixed costs, variable expenses
- **Flexible Periods**: Monthly/yearly input options for all categories
- **Profile Management**: Save, load, and manage multiple budget scenarios
- **Visual Analysis**: Interactive pie charts for expense distribution
- **Smart Savings Allocation**: Fixed amount or percentage-based savings planning
- **🔗 Seamless Integration**: Available savings automatically become your ETF investment rate

### 📈 **Phase 3: ETF Investment Planning** → *Builds Retirement Capital*
- **Multi-Scenario Comparison**: Compare up to 4 investment strategies side-by-side
- **German ETF Taxation**: Vorabpauschale (advance lump sum tax) and Teilfreistellung (partial exemption)
- **Progressive Salary Growth**: Uses tax calculator data to model realistic salary increases
- **Interactive Visualizations**: 
  - Scenario comparison charts
  - Contributions vs. gains analysis
  - Real vs. nominal value tracking
- **🔗 Capital Transfer**: Final portfolio value feeds directly into retirement planning

### 🏖️ **Phase 4: Retirement Planning** → *Completes the Journey*
- **Precise Mathematical Modeling**: Direct annuity formulas with inflation adjustment
- **German Capital Gains Tax**: Accurate Abgeltungssteuer calculations
- **Integrated Timeline**: Seamless visualization from accumulation to withdrawal
- **Multiple Chart Views**: Portfolio development and cash flow analysis
- **🔗 Full Integration**: Uses accumulated capital and contribution history for precise calculations

### 🔍 **Phase 5: Advanced Scenario Comparison** → *Optimizes Your Strategy*
- **Complete Lifecycle Analysis**: Visualize entire financial journey from salary to retirement
- **Metrics Radar Chart**: Compare key performance indicators across all phases
- **Parameter Comparison Tables**: Detailed side-by-side analysis of different strategies
- **Export Capabilities**: CSV and JSON data export for external analysis

---

## 🇩🇪 German Tax Compliance

### 2025 Tax Implementation
- **Income Tax Brackets**: Complete progressive tax calculation
- **Social Insurance**: All current rates and contribution ceilings
- **Church Tax**: State-specific rates (8% or 9%)
- **Care Insurance**: Age and family status considerations

### ETF Taxation Features
- **Vorabpauschale**: Advance lump sum tax for accumulating ETFs
- **Teilfreistellung**: 30% partial tax exemption for equity funds
- **Sparerpauschbetrag**: €1,000 annual tax-free allowance
- **Abgeltungssteuer**: 25% capital gains tax with proper cost basis tracking

---

## 🚀 Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- No server installation required - runs entirely in the browser

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/german-financial-planner.git
   cd german-financial-planner
   ```

2. **Open the application**
   ```bash
   # Open in your default browser
   open public/etf_savings.html
   
   # Or navigate to the file in your browser
   # file:///path/to/german-financial-planner/public/etf_savings.html
   ```

3. **Follow the connected financial journey!**
   - **Start with Tax Calculator** → Get your true net income
   - **Flow to Budget Planning** → Determine investment capacity  
   - **Build Investment Strategy** → Model wealth accumulation
   - **Plan Retirement** → Design withdrawal strategy
   - **Compare Scenarios** → Optimize your complete financial plan

### 📁 Project Structure

```
german-financial-planner/
├── public/                     # Main application files
│   ├── etf_savings.html       # Primary application file
│   ├── app.js                 # Core JavaScript logic (9,400+ lines)
│   ├── style.css              # Comprehensive styling
│   └── hover_mouse_example.html # Chart.js example
├── docs/                      # Comprehensive documentation
│   ├── ETF_Calculator_Documentation.md
│   ├── FORMULAS.md           # Mathematical formulas reference
│   ├── features/             # Feature specifications
│   └── feature-plans/        # Development roadmap
├── LICENSE                   # Apache 2.0 License
└── README.md                # This file
```

---

## 📊 Connected Workflow Guide

### 🔄 **The Complete Financial Journey**

This application is designed as an **integrated workflow** where each phase builds on the previous one. Follow this connected journey for comprehensive financial planning:

### 📝 **Phase 1: Discover Your True Earning Power**
1. Enter your gross annual salary in the **Tax Calculator**
2. Select tax class, federal state, and personal details
3. See your real net income after German taxes and social insurance
4. **Click "Transfer to ETF Calculator"** → *Automatically flows to Phase 2*

### 💰 **Phase 2: Understand Your Financial Capacity** *(Uses Phase 1 Data)*
1. Your net salary is **pre-filled** from the tax calculator
2. Add additional income sources and categorize all expenses
3. Watch the budget visualization update in real-time
4. Determine your optimal savings rate (fixed amount or percentage)
5. **Click "Apply Savings Rate"** → *Automatically flows to Phase 3*

### 📈 **Phase 3: Build Your Investment Strategy** *(Uses Phase 1 & 2 Data)*
1. Your **monthly savings rate is pre-filled** from budget planning
2. Your **gross salary data** enables realistic salary growth modeling
3. Create multiple scenarios to compare different strategies
4. Watch your wealth grow over time with German tax considerations
5. **Automatic sync** → *Final capital flows to Phase 4*

### 🏖️ **Phase 4: Plan Your Retirement** *(Uses All Previous Data)*
1. Your **accumulated capital** is automatically imported
2. Your **total contributions** are calculated from investment history
3. Model withdrawal strategies with inflation and tax considerations
4. Visualize the complete timeline from accumulation to depletion

### 🔍 **Phase 5: Compare & Optimize** *(Analyzes Complete Journey)*
1. View side-by-side comparisons of different life strategies
2. Analyze the complete financial lifecycle from salary to retirement
3. Use radar charts to compare key metrics across scenarios
4. Export your complete financial plan for further analysis

### 💡 **Key Integration Points**
- **Salary → Budget**: Net income automatically updates budget calculations
- **Budget → Investment**: Available savings becomes your investment rate  
- **Investment → Retirement**: Final capital and contribution history flow seamlessly
- **Real-time Sync**: Changes in earlier phases automatically update later calculations

---

## 🛠️ Technical Details

### Built With
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Charts**: Chart.js 4.x for interactive visualizations
- **Storage**: Browser localStorage for data persistence
- **Architecture**: Single-page application with modular design

### Key Technical Features
- **German Number Formatting**: Proper comma decimal separators
- **Real-time Calculations**: Instant feedback with debounced updates
- **Mathematical Precision**: Newton-Raphson iteration for exact calculations
- **Error Handling**: Comprehensive input validation and error recovery

### Performance Optimizations
- Debounced calculation updates
- Efficient chart rendering and updates
- Smart caching of calculation results
- Minimal DOM manipulation

---

## 📖 Documentation

### Core Documentation
- **[ETF Calculator Documentation](docs/ETF_Calculator_Documentation.md)**: Complete application guide
- **[Mathematical Formulas](docs/FORMULAS.md)**: All calculation formulas with explanations
- **[Features Overview](docs/features/features.md)**: Detailed feature specifications

### Development Resources
- **[Tax Calculation Fixes](docs/TAX_CALCULATION_FIXES.md)**: German tax implementation details
- **[Chart Issues](docs/Chart_Hover_Issue_Documentation.md)**: Chart.js integration notes

---

## 🔧 Customization

### Adding New Scenarios
The application supports easy extension of investment scenarios:

```javascript
// Add new scenario template
const newScenario = {
    id: 'E',
    name: 'Custom Strategy',
    color: '#9b59b6',
    inputs: {},
    yearlyData: [],
    results: {}
};
```

### Extending Tax Calculations
German tax rates and rules are centralized for easy updates:

```javascript
// Update tax brackets in app.js
const taxBrackets2026 = {
    basicAllowance: 12096,  // Update annually
    brackets: [/* new brackets */]
};
```

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit your changes** (`git commit -m 'Add AmazingFeature'`)
4. **Push to the branch** (`git push origin feature/AmazingFeature`)
5. **Open a Pull Request**

### Development Guidelines
- Follow German financial regulations and tax law
- Maintain mathematical precision in calculations
- Include comprehensive documentation
- Test with various German tax scenarios

---

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

```
Copyright 2025 German Financial Planner Contributors

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
```

---

## 🙏 Acknowledgments

- **German Federal Ministry of Finance** for official tax rate publications
- **Chart.js Community** for excellent visualization capabilities
- **[Finanzfluss](https://finanzfluss.de)** for the initial inspiration and for providing high-quality, free financial calculators accessible to everyone
- **[Cursor](https://cursor.com)** for making the development process 10x more efficient 🚀

---

<div align="center">

**[⭐ Star this project](https://github.com/yourusername/german-financial-planner)** if you find it helpful!

*Built with ❤️ for the German financial planning community*

</div>