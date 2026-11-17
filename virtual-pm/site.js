const feedbackTimers = new Map();

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      // Keep the copy action usable when browser clipboard permissions differ.
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
    const copyFeedback = document.getElementById(button.dataset.copyFeedback || 'copy-feedback');
    if (copyFeedback) {
      copyFeedback.textContent = copied
        ? `${button.dataset.copyLabel || 'Text'} copied. Paste it into your assistant.`
        : 'Copy did not work here. Select the text to copy it.';
      clearTimeout(feedbackTimers.get(copyFeedback));
      feedbackTimers.set(copyFeedback, setTimeout(() => { copyFeedback.textContent = ''; }, 5000));
    }
  });
});

const publicProjectCounts = document.querySelectorAll('[data-project-count]');
if (publicProjectCounts.length) {
  fetch('./public-projects.json', { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) throw new Error('Public project snapshot is unavailable');
      return response.json();
    })
    .then((snapshot) => {
      if (![1, 2].includes(snapshot.schemaVersion) || !Array.isArray(snapshot.projects)) {
        throw new Error('Public project snapshot is invalid');
      }
      for (const label of publicProjectCounts) {
        const project = snapshot.projects.find((item) => item.id === label.dataset.projectCount);
        if (!project || !Number.isInteger(project.counts?.total)) continue;
        const total = project.counts.total;
        label.textContent = `${total} real task${total === 1 ? '' : 's'} · ${project.counts.working || 0} working`;
      }
      const freshness = document.getElementById('real-projects-freshness');
      if (freshness) {
        const date = new Date(snapshot.generatedAt);
        const dateLabel = Number.isNaN(date.getTime())
          ? 'date unavailable'
          : new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
        freshness.textContent = `Selected public fields from the real project handoff · Snapshot ${dateLabel} · Read-only`;
      }
    })
    .catch(() => {
      for (const label of publicProjectCounts) label.textContent = 'Snapshot temporarily unavailable';
      const freshness = document.getElementById('real-projects-freshness');
      if (freshness) freshness.textContent = 'The public project snapshot is temporarily unavailable. The setup guide is still available below.';
    });
}
