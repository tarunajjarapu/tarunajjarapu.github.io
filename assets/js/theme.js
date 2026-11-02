// Runs before styles load so the saved theme is applied before the first paint.
(() => {
  const key = 'tarun-theme';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let preference = null;
  try {
    const saved = localStorage.getItem(key);
    if (saved === 'light' || saved === 'dark') preference = saved;
  } catch { /* The theme still works when browser storage is unavailable. */ }

  function applyTheme() {
    const theme = preference || (system.matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'dark' ? '#1d1c19' : '#f6f3ec';
    const toggle = document.querySelector('.theme-toggle');
    if (toggle) {
      const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
      toggle.setAttribute('aria-label', label);
      toggle.title = label;
      toggle.hidden = false;
    }
  }

  applyTheme();
  system.addEventListener('change', () => { if (!preference) applyTheme(); });
  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    preference = event.newValue === 'dark' || event.newValue === 'light' ? event.newValue : null;
    applyTheme();
  });
  document.addEventListener('DOMContentLoaded', () => {
    applyTheme();
    document.querySelector('.theme-toggle')?.addEventListener('click', () => {
      preference = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(key, preference); } catch { /* Use the choice for this page. */ }
      applyTheme();
    });
  });
})();
