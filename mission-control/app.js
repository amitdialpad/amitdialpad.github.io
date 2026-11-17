const globalStatus = document.getElementById('copy-status');

async function copyCommand(command) {
  if (window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(command);
      return true;
    } catch {
      // Some browsers block Clipboard API access on localhost. Try selection copy.
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = command;
  textarea.setAttribute('readonly', '');
  textarea.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
  document.body.append(textarea);
  textarea.focus();
  textarea.select();

  let copied = false;
  let copyEventFired = false;
  textarea.addEventListener('copy', (event) => {
    if (!event.clipboardData) return;
    event.clipboardData.setData('text/plain', command);
    event.preventDefault();
    copyEventFired = true;
  }, { once: true });
  try {
    copied = document.execCommand('copy') && copyEventFired;
  } catch {
    copied = false;
  }
  textarea.remove();
  return copied;
}

document.querySelectorAll('[data-copy]').forEach((button) => {
  button.addEventListener('click', async () => {
    const code = document.getElementById(button.dataset.copy);
    const command = code?.dataset.command;
    if (!command) return;

    const feedback = button.closest('.command-card').querySelector('.copy-feedback');
    const copied = await copyCommand(command);
    feedback.classList.toggle('error', !copied);

    if (copied) {
      button.textContent = 'Copied';
      feedback.textContent = 'Copied to clipboard';
      globalStatus.textContent = `${button.getAttribute('aria-label')} copied`;
      window.setTimeout(() => { button.textContent = 'Copy'; }, 2000);
    } else {
      feedback.textContent = 'Could not copy automatically. Select the command and copy it manually.';
      globalStatus.textContent = feedback.textContent;
    }
  });
});
