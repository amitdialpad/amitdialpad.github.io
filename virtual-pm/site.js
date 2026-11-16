const copyFeedback = document.getElementById('copy-feedback');
let feedbackTimer;

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
    if (copyFeedback) {
      copyFeedback.textContent = copied
        ? `${button.dataset.copyLabel || 'Text'} copied. Paste it into your assistant.`
        : 'Copy did not work here. Select the text to copy it.';
      clearTimeout(feedbackTimer);
      feedbackTimer = setTimeout(() => { copyFeedback.textContent = ''; }, 5000);
    }
  });
});
