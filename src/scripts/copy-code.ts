// Copy buttons on code blocks. rehype-code.ts renders each button `hidden`;
// this script reveals it only where the clipboard API works, so a page
// without JavaScript shows no button that does nothing.
const RESET_AFTER_MS = 2000;

if (navigator.clipboard) {
  for (const button of document.querySelectorAll<HTMLButtonElement>('button[data-copy]')) {
    const code = button.closest('.code')?.querySelector('pre code');
    const label = button.querySelector('[data-copy-label]');
    if (!code || !label) continue;

    button.hidden = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    button.addEventListener('click', async () => {
      try {
        // textContent keeps the newlines between lines; line numbers are CSS
        // generated content, so they are not part of it.
        await navigator.clipboard.writeText(code.textContent ?? '');
        label.textContent = 'Copied';
      } catch {
        label.textContent = 'Copy failed';
      }
      clearTimeout(timer);
      timer = setTimeout(() => (label.textContent = 'Copy'), RESET_AFTER_MS);
    });
  }
}
