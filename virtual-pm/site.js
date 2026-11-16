const advance = document.getElementById('advance-sample');
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
  sample.version.textContent = checked ? 'VERSION 02' : 'VERSION 01';
  sample.state.textContent = checked ? 'Ready to review' : 'In progress';
  sample.state.classList.toggle('state-pill-ready', checked);
  sample.proof.textContent = checked ? 'Screen checked on desktop and mobile' : 'Walk through the screen in a browser';
  sample.blocker.textContent = checked ? 'None for this review' : 'Needs visual review';
  sample.evidence.textContent = checked ? 'Browser review and focused check attached' : 'Not yet attached';
  sample.change.textContent = checked
    ? 'The contribution and the plan changed together.'
    : 'The next change carries the next update.';
});
