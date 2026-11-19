(() => {
  const minutesInput = document.getElementById('monthly-minutes');
  const packsInput = document.getElementById('include-packs');
  const capPanel = document.getElementById('pack-cap');
  const capInput = document.getElementById('monthly-cap');
  const presetButtons = [...document.querySelectorAll('[data-minutes]')];
  const costOutput = document.getElementById('projected-cost');
  const quoteBreakdown = document.getElementById('quote-breakdown');
  const currentSettings = document.getElementById('current-settings');
  const currentCostOutput = document.getElementById('current-cost');
  const currentCoverage = document.getElementById('current-coverage');
  const packOutput = document.getElementById('pack-count');
  const spendOutput = document.getElementById('spend-limit');
  const availableOutput = document.getElementById('available-minutes');
  const message = document.getElementById('calculator-message');
  const included = 500;
  const packSize = 100;
  const baseCost = 49;
  const packCost = 10;

  function invalid(reason, field) {
    costOutput.textContent = '—';
    quoteBreakdown.textContent = 'Enter valid values to calculate a quote.';
    currentCostOutput.textContent = '—';
    currentCoverage.textContent = '—';
    currentSettings.dataset.shortfall = 'false';
    packOutput.textContent = '—';
    spendOutput.textContent = '—';
    availableOutput.textContent = '—';
    message.textContent = reason;
    field.setAttribute('aria-invalid', 'true');
  }

  function render() {
    const value = Number(minutesInput.value);
    capPanel.hidden = !packsInput.checked;
    capInput.disabled = !packsInput.checked;
    presetButtons.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.minutes) === value && minutesInput.value !== '')));
    if (minutesInput.value === '' || !Number.isFinite(value) || value < 0 || !Number.isInteger(value) || value > 100000) {
      invalid('Enter a whole number of minutes from 0 to 100,000.', minutesInput);
      return;
    }
    minutesInput.removeAttribute('aria-invalid');
    const budget = packsInput.checked ? Number(capInput.value) : baseCost;
    if (packsInput.checked && (capInput.value === '' || !Number.isInteger(budget) || budget < baseCost || budget > 9999)) {
      invalid('Set a whole-dollar monthly limit from $49 to $9,999.', capInput);
      return;
    }
    capInput.removeAttribute('aria-invalid');
    const requiredPacks = Math.ceil(Math.max(0, value - included) / packSize);
    const permittedPacks = packsInput.checked ? Math.floor((budget - baseCost) / packCost) : 0;
    const packsUsed = Math.min(requiredPacks, permittedPacks);
    const stopPoint = included + permittedPacks * packSize;
    const quoteCost = baseCost + requiredPacks * packCost;
    const currentCost = baseCost + packsUsed * packCost;
    const covered = Math.min(value, stopPoint);
    const shortfall = value - covered;
    costOutput.textContent = '$' + quoteCost.toLocaleString();
    quoteBreakdown.textContent = requiredPacks === 0 ? '500 minutes included in the monthly plan' : 'Includes ' + requiredPacks + ' × $10 extra ' + (requiredPacks === 1 ? 'pack' : 'packs');
    currentCostOutput.textContent = '$' + currentCost.toLocaleString();
    currentCoverage.textContent = shortfall > 0 ? shortfall.toLocaleString() + (shortfall === 1 ? ' minute' : ' minutes') + ' uncovered' : 'All ' + value.toLocaleString() + ' minutes covered';
    currentSettings.dataset.shortfall = String(shortfall > 0);
    packOutput.textContent = packsUsed === 0 ? 'None' : packsUsed + ' × $10';
    spendOutput.textContent = '$' + budget.toLocaleString();
    availableOutput.textContent = stopPoint.toLocaleString() + ' minutes';
    if (value <= included) {
      message.textContent = 'Included in the 500-minute monthly allowance.';
    } else if (!packsInput.checked) {
      message.textContent = 'Extra packs are off. Dial Bot stops at 500 minutes; the meeting continues.';
    } else if (value > stopPoint) {
      message.textContent = 'Raise your limit to $' + quoteCost.toLocaleString() + ' to cover all ' + value.toLocaleString() + ' minutes. Dial Bot stops at ' + stopPoint.toLocaleString() + ' with your current limit; the meeting continues.';
    } else {
      message.textContent = 'Your current limit covers this estimate. No charge exceeds your cap.';
    }
  }

  minutesInput.addEventListener('input', render);
  packsInput.addEventListener('change', render);
  capInput.addEventListener('input', render);
  presetButtons.forEach(button => button.addEventListener('click', () => {
    minutesInput.value = button.dataset.minutes;
    render();
  }));
  render();
})();
