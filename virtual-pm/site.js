const advance = document.getElementById('advance-sample');
const copyFeedback = document.getElementById('copy-feedback');
let feedbackTimer;

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      // Continue to the selection-based fallback for older browser permissions.
    }
  }

  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.appendChild(field);
  field.select();
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch (_) {
    copied = false;
  }
  field.remove();
  return copied;
}

document.querySelectorAll('[data-copy-target]').forEach((button) => {
  button.addEventListener('click', async () => {
    const target = document.getElementById(button.dataset.copyTarget);
    if (!target) return;
    const copied = await copyText(target.textContent.trim());
    if (copyFeedback) {
      copyFeedback.textContent = copied
        ? `${button.dataset.copyLabel === 'Copy team rule' ? 'Team rule' : 'Starter prompt'} copied. Paste it where you work.`
        : 'Copy did not work here. Select the text above to copy it.';
      clearTimeout(feedbackTimer);
      feedbackTimer = setTimeout(() => { copyFeedback.textContent = ''; }, 5000);
    }
  });
});
const sample = {
  version: document.getElementById('sample-version'),
  state: document.getElementById('sample-state'),
  proof: document.getElementById('sample-proof'),
  blocker: document.getElementById('sample-blocker'),
  evidence: document.getElementById('sample-evidence'),
  change: document.getElementById('sample-change')
};

advance?.addEventListener('click', () => {
  const checked = advance.getAttribute('aria-pressed') !== 'true';
  advance.setAttribute('aria-pressed', String(checked));
  advance.innerHTML = checked
    ? 'Show the earlier state <span aria-hidden="true">←</span>'
    : 'Show the next update <span aria-hidden="true">→</span>';
  sample.version.textContent = checked ? 'MOMENT 02' : 'MOMENT 01';
  sample.state.textContent = checked ? 'Ready to review' : 'In progress';
  sample.state.classList.toggle('state-pill-ready', checked);
  sample.proof.textContent = checked ? 'Screen checked on desktop and mobile' : 'Walk through the screen in a browser';
  sample.blocker.textContent = checked ? 'None for this review' : 'Needs visual review';
  sample.evidence.textContent = checked ? 'Browser review and focused check attached' : 'Not yet attached';
  sample.change.textContent = checked
    ? 'The work and the plan changed together.'
    : 'The next change brings the next update.';
});
