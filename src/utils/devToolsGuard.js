/**
 * devToolsGuard.js
 *
 * Global protection that runs site-wide:
 * - Blocks F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (DevTools shortcuts)
 * - Blocks Ctrl+U (View Source)
 * - Blocks right-click context menu
 * - Detects DevTools open via debugger timing trick and redirects/warns
 *
 * Call initDevToolsGuard() once on app startup.
 */

let guardInitialized = false;

export function initDevToolsGuard() {
  if (guardInitialized) return;
  guardInitialized = true;

  // ── Block keyboard shortcuts for DevTools / View Source ──
  document.addEventListener('keydown', (e) => {
    // F12
    if (e.key === 'F12') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+Shift+I (Inspect), Ctrl+Shift+J (Console), Ctrl+Shift+C (Element picker)
    if (
      (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key))
    ) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Cmd+Option+I / Cmd+Option+J (Mac DevTools)
    if (e.metaKey && e.altKey && ['i', 'j', 'I', 'J'].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+U / Cmd+U (View Source)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+S / Cmd+S (Save page)
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, true);

  // ── Block right-click context menu ────────────────────────
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  }, true);

  // ── DevTools open detection via debugger timing ───────────
  // When DevTools is open, the debugger statement causes a measurable pause.
  let devToolsWarned = false;

  const detectDevTools = () => {
    const threshold = 160; // ms — debugger pause is much longer than normal execution
    const before = performance.now();

    // This debugger statement pauses execution only when DevTools is open
    // eslint-disable-next-line no-debugger
    debugger;

    const after = performance.now();

    if (after - before > threshold) {
      if (!devToolsWarned) {
        devToolsWarned = true;
        // Clear the page content as a deterrent
        document.body.innerHTML = `
          <div style="
            display: flex; align-items: center; justify-content: center;
            height: 100vh; background: #0a0a0a; color: #ff4444;
            font-family: monospace; font-size: 1.4rem; text-align: center;
            padding: 2rem; flex-direction: column; gap: 1rem;
          ">
            <span style="font-size: 3rem;">⚠️</span>
            <div>Developer Tools are not allowed on this site.</div>
            <div style="color: #888; font-size: 0.9rem;">Please close DevTools and reload the page.</div>
          </div>
        `;
      }
    } else {
      devToolsWarned = false;
    }
  };

  // Run detection every 2 seconds (lightweight when DevTools is closed)
  setInterval(detectDevTools, 2000);

  // ── Disable console methods (make them no-ops) ────────────
  // This deters casual users from running scripts in the console
  if (typeof window !== 'undefined') {
    const noop = () => {};
    const methods = ['log', 'debug', 'info', 'warn', 'error', 'table', 'clear', 'dir', 'trace'];
    methods.forEach((method) => {
      try {
        window.console[method] = noop;
      } catch {
        // Some environments lock console
      }
    });
  }
}
