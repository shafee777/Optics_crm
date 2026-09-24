document.querySelector('#setup').addEventListener('submit', async event => {
  event.preventDefault();
  const status = document.querySelector('#status'), button = document.querySelector('button');
  const password = document.querySelector('#password').value;
  if (password !== document.querySelector('#confirm').value) { status.textContent = 'Passwords do not match.'; return; }
  button.disabled = true; status.textContent = 'Creating your shop…';
  try {
    await window.opticsDesktop.setup({ shop: document.querySelector('#shop').value, name: document.querySelector('#name').value, email: document.querySelector('#email').value, password });
  } catch (error) { status.textContent = error.message.replace(/^Error invoking remote method[^:]*: /, ''); button.disabled = false; }
});
