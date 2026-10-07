const setupForm = document.querySelector('#setup');
const recoveryView = document.querySelector('#recovery-view');
const keyText = document.querySelector('#recovery-key-text');
const copyBtn = document.querySelector('#copy-key-btn');
const confirmCheck = document.querySelector('#confirm-saved');
const continueBtn = document.querySelector('#continue-login-btn');
const statusEl = document.querySelector('#status');
const submitBtn = setupForm.querySelector('button[type="submit"]');

setupForm.addEventListener('submit', async event => {
  event.preventDefault();
  const password = document.querySelector('#password').value;
  if (password !== document.querySelector('#confirm').value) {
    statusEl.textContent = 'Passwords do not match.';
    return;
  }
  submitBtn.disabled = true;
  statusEl.textContent = 'Creating your shop…';
  try {
    const res = await window.opticsDesktop.setup({
      shop: document.querySelector('#shop').value,
      name: document.querySelector('#name').value,
      email: document.querySelector('#email').value,
      password,
    });
    if (res && res.recoveryKey) {
      keyText.textContent = res.recoveryKey;
      setupForm.classList.add('hidden');
      const intro = document.querySelector('#intro-text');
      if (intro) intro.classList.add('hidden');
      recoveryView.classList.remove('hidden');
    } else {
      await window.opticsDesktop.setupComplete();
    }
  } catch (error) {
    statusEl.textContent = error.message.replace(/^Error invoking remote method[^:]*: /, '');
    submitBtn.disabled = false;
  }
});

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(keyText.textContent.trim());
    copyBtn.textContent = 'Copied to clipboard!';
    setTimeout(() => { copyBtn.textContent = 'Copy Recovery Key'; }, 2500);
  } catch {
    copyBtn.textContent = 'Please select and copy text manually';
  }
});

confirmCheck.addEventListener('change', () => {
  continueBtn.disabled = !confirmCheck.checked;
});

continueBtn.addEventListener('click', async () => {
  continueBtn.disabled = true;
  continueBtn.textContent = 'Loading login…';
  await window.opticsDesktop.setupComplete();
});
