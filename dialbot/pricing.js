(() => {
  const minutesInput = document.getElementById('monthly-minutes');
  const packsInput = document.getElementById('include-packs');
  const costOutput = document.getElementById('projected-cost');
  const packOutput = document.getElementById('pack-count');
  const availableOutput = document.getElementById('available-minutes');
  const message = document.getElementById('calculator-message');
  const included = 500;
  const packSize = 100;
  const baseCost = 49;
  const packCost = 10;

  function render() {
    const value = Number(minutesInput.value);
    if (minutesInput.value === '' || !Number.isFinite(value) || value < 0 || !Number.isInteger(value) || value > 100000) {
      costOutput.textContent = '—';
      packOutput.textContent = '—';
      availableOutput.textContent = '—';
      message.textContent = 'Enter a whole number of minutes from 0 to 100,000.';
      minutesInput.setAttribute('aria-invalid', 'true');
      return;
    }
    minutesInput.removeAttribute('aria-invalid');
    const requiredPacks = Math.ceil(Math.max(0, value - included) / packSize);
    const packs = packsInput.checked ? requiredPacks : 0;
    const available = included + packs * packSize;
    costOutput.textContent = '$' + (baseCost + packs * packCost);
    packOutput.textContent = packs === 0 ? 'None' : packs + ' × $10';
    availableOutput.textContent = available.toLocaleString();
    if (value <= included) {
      message.textContent = value.toLocaleString() + ' paid-plan minutes cost $49/month. The first 500 are included; no pack is needed.';
    } else if (!packsInput.checked) {
      message.textContent = value.toLocaleString() + ' minutes exceed the 500-minute allowance by ' + (value - included).toLocaleString() + '. Without opting into packs, Dial Bot stops at 500 and the meeting continues. No extra charge.';
    } else {
      message.textContent = value.toLocaleString() + ' minutes need ' + packs + ' opted-in ' + (packs === 1 ? 'pack' : 'packs') + '. The projected cost is $' + (baseCost + packs * packCost) + '/month; no pack is added automatically.';
    }
  }

  minutesInput.addEventListener('input', render);
  packsInput.addEventListener('change', render);
  render();
})();
