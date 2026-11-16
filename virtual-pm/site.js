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
