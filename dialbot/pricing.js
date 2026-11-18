(() => {
  const minutesInput = document.getElementById('monthly-minutes');
  const packsInput = document.getElementById('include-packs');
  const capPanel = document.getElementById('pack-cap');
  const maxPacksInput = document.getElementById('max-extra-packs');
  const costOutput = document.getElementById('projected-cost');
  const packOutput = document.getElementById('pack-count');
  const spendOutput = document.getElementById('spend-limit');
  const availableOutput = document.getElementById('available-minutes');
  const message = document.getElementById('calculator-message');
  const included = 500;
  const packSize = 100;
  const baseCost = 49;
  const packCost = 10;

  function render() {
    const value = Number(minutesInput.value);
    capPanel.hidden = !packsInput.checked;
    maxPacksInput.disabled = !packsInput.checked;
    if (minutesInput.value === '' || !Number.isFinite(value) || value < 0 || !Number.isInteger(value) || value > 100000) {
      costOutput.textContent = '—';
      packOutput.textContent = '—';
      spendOutput.textContent = '—';
      availableOutput.textContent = '—';
      message.textContent = 'Enter a whole number of minutes from 0 to 100,000.';
      minutesInput.setAttribute('aria-invalid', 'true');
      return;
    }
    minutesInput.removeAttribute('aria-invalid');
    const maxPacks = packsInput.checked ? Number(maxPacksInput.value) : 0;
    if (packsInput.checked && (maxPacksInput.value === '' || !Number.isInteger(maxPacks) || maxPacks < 1 || maxPacks > 995)) {
      costOutput.textContent = '—';
      packOutput.textContent = '—';
      spendOutput.textContent = '—';
      availableOutput.textContent = '—';
      message.textContent = 'Choose a whole number of extra packs from 1 to 995.';
      maxPacksInput.setAttribute('aria-invalid', 'true');
      return;
    }
    maxPacksInput.removeAttribute('aria-invalid');
    const requiredPacks = Math.ceil(Math.max(0, value - included) / packSize);
    const packs = Math.min(requiredPacks, maxPacks);
    const available = included + maxPacks * packSize;
    const spendLimit = baseCost + maxPacks * packCost;
    costOutput.textContent = '$' + (baseCost + packs * packCost).toLocaleString();
    packOutput.textContent = packs === 0 ? 'None' : packs + ' × $10';
    spendOutput.textContent = '$' + spendLimit.toLocaleString();
    availableOutput.textContent = available.toLocaleString() + ' meeting minutes';
    if (value <= included) {
      message.textContent = 'Within the 500 included meeting minutes with Dial Bot. No extra pack is needed.';
    } else if (!packsInput.checked) {
      message.textContent = 'Without opting into packs, Dial Bot stops after 500 meeting minutes and the meeting continues. No extra charge.';
    } else if (value > available) {
      message.textContent = 'Your estimate exceeds your ' + available.toLocaleString() + ' meeting minutes with Dial Bot. It stops there; the meeting continues. Your monthly cost cannot exceed $' + spendLimit.toLocaleString() + '.';
    } else {
      message.textContent = 'Your meeting time with Dial Bot uses ' + packs + ' opted-in ' + (packs === 1 ? 'pack' : 'packs') + '. The projected cost stays within your $' + spendLimit.toLocaleString() + ' monthly cap.';
    }
  }

  minutesInput.addEventListener('input', render);
  packsInput.addEventListener('change', render);
  maxPacksInput.addEventListener('input', render);
  render();
})();
