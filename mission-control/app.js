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
  try {
    copied = document.execCommand('copy');
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
    const isInvoke = button.dataset.copy === 'invoke-command';
    const buttonLabel = isInvoke ? 'Copy invoke' : 'Copy install';

    if (copied) {
      button.textContent = 'Copied';
      feedback.textContent = isInvoke ? 'Invoke copied: $mission-control' : 'Install command copied';
      globalStatus.textContent = feedback.textContent;
      window.setTimeout(() => { button.textContent = buttonLabel; }, 2000);
    } else {
      feedback.textContent = `Could not copy the ${isInvoke ? 'invoke' : 'install'} command automatically. Select it and copy it manually.`;
      globalStatus.textContent = feedback.textContent;
    }
  });
});
