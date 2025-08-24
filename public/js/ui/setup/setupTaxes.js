// UI setup: Taxes module

import { parseGermanNumber, formatGermanNumber, formatCurrency } from '../../utils.js';
import { calculateTaxes as calculateTaxesCore } from '../../core/tax.js';

export function calculateTaxes() {
  const grossSalary = parseGermanNumber(document.getElementById('grossSalary')?.value || '60000');
  const taxClass = parseInt(document.getElementById('taxClass')?.value || '1');
  const federalState = document.getElementById('federalState')?.value || 'nw';
  const age = parseInt(document.getElementById('age')?.value || '30');
  const children = parseInt(document.getElementById('children')?.value || '0');
  const churchTax = document.getElementById('churchTaxToggle')?.classList.contains('active') || false;
  const publicHealthInsurance = document.getElementById('publicHealthInsuranceToggle')?.classList.contains('active') || true;
  const healthInsuranceRate = parseFloat(document.getElementById('healthInsuranceRate')?.value || '2.5');

  try {
    const results = calculateTaxesCore(
      grossSalary,
      taxClass,
      federalState,
      age,
      children,
      churchTax,
      publicHealthInsurance,
      healthInsuranceRate
    );

    if (document.getElementById('grossMonthlySalary')) {
      document.getElementById('grossMonthlySalary').textContent = formatCurrency(results.grossMonthlySalary);
    }
    if (document.getElementById('netMonthlySalary')) {
      document.getElementById('netMonthlySalary').textContent = formatCurrency(results.netMonthlySalary);
    }
    if (document.getElementById('netYearlySalary')) {
      document.getElementById('netYearlySalary').textContent = formatCurrency(results.netYearlySalary);
    }
    if (document.getElementById('totalDeductions')) {
      document.getElementById('totalDeductions').textContent = formatCurrency(results.totalDeductions);
    }
    if (document.getElementById('incomeTax')) {
      document.getElementById('incomeTax').textContent = formatCurrency(results.breakdown?.incomeTax || 0);
    }
    if (document.getElementById('churchTax')) {
      document.getElementById('churchTax').textContent = formatCurrency(results.breakdown?.churchTax || 0);
    }
    if (document.getElementById('healthInsurance')) {
      document.getElementById('healthInsurance').textContent = formatCurrency(results.breakdown?.healthInsurance || 0);
    }
    if (document.getElementById('careInsurance')) {
      document.getElementById('careInsurance').textContent = formatCurrency(results.breakdown?.careInsurance || 0);
    }
    if (document.getElementById('pensionInsurance')) {
      document.getElementById('pensionInsurance').textContent = formatCurrency(results.breakdown?.pensionInsurance || 0);
    }
    if (document.getElementById('unemploymentInsurance')) {
      document.getElementById('unemploymentInsurance').textContent = formatCurrency(results.breakdown?.unemploymentInsurance || 0);
    }
  } catch (error) {
    console.error('Error calculating taxes:', error);
  }
}

export function setupTaxCalculatorListeners() {
  ['grossSalary', 'age', 'children'].forEach(id => {
    const element = document.getElementById(id);
    if (element) element.addEventListener('input', calculateTaxes);
  });

  ['taxClass', 'federalState'].forEach(id => {
    const element = document.getElementById(id);
    if (element) element.addEventListener('change', calculateTaxes);
  });

  const churchTaxToggle = document.getElementById('churchTaxToggle');
  if (churchTaxToggle) {
    churchTaxToggle.addEventListener('click', function() {
      this.classList.toggle('active');
      calculateTaxes();
    });
  }

  const publicHealthInsuranceToggle = document.getElementById('publicHealthInsuranceToggle');
  if (publicHealthInsuranceToggle) {
    publicHealthInsuranceToggle.addEventListener('click', function() {
      this.classList.toggle('active');
      const healthGroup = document.getElementById('healthInsuranceRateGroup');
      if (healthGroup) {
        healthGroup.style.display = this.classList.contains('active') ? 'block' : 'none';
      }
      calculateTaxes();
    });
  }

  const healthSlider = document.getElementById('healthInsuranceRate');
  if (healthSlider) {
    healthSlider.addEventListener('input', function() {
      const valueElement = document.getElementById('healthInsuranceRateValue');
      if (valueElement) valueElement.textContent = parseFloat(this.value).toFixed(1) + '%';
      calculateTaxes();
    });
  }

  const salarySlider = document.getElementById('annualSalaryIncrease');
  if (salarySlider) {
    salarySlider.addEventListener('input', function() {
      const valueElement = document.getElementById('annualSalaryIncreaseValue');
      if (valueElement) valueElement.textContent = parseFloat(this.value).toFixed(1) + '%';
      calculateTaxes();
    });
  }

  const integrationButton = document.getElementById('useTaxCalculatorResults');
  if (integrationButton) {
    integrationButton.addEventListener('click', function() {
      const netMonthlySalaryElement = document.getElementById('netMonthlySalary');
      const grossSalaryElement = document.getElementById('grossSalary');
      if (netMonthlySalaryElement && grossSalaryElement) {
        const netMonthlySalary = parseGermanNumber(netMonthlySalaryElement.textContent.replace('€', ''));
        const grossSalary = parseGermanNumber(grossSalaryElement.value);
        const salaryElement = document.getElementById('salary');
        if (salaryElement) salaryElement.value = formatGermanNumber(netMonthlySalary, 0);
        const baseSalaryElement = document.getElementById(`baseSalary_${(window.state && window.state.activeScenario) || 'A'}`);
        if (baseSalaryElement) baseSalaryElement.value = formatGermanNumber(grossSalary, 0);
        const budgetBtn = document.getElementById('budgetPhase');
        if (budgetBtn) budgetBtn.click();
        calculateTaxes();
      }
    });
  }
}

