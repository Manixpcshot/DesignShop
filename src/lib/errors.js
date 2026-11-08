// Last line of defence.
//
// A thrown event handler in the canvas or a rejected promise used to be
// swallowed by the browser: the dev console showed it, the app just looked
// broken. Worse, an error inside a render or a pointer handler could repeat on
// every frame, so a single bug felt like "the screen fills with errors".
//
// This module funnels uncaught errors into one calm, deduplicated banner and
// keeps the full details available for the "copy report" button.
import { toast } from './store.js';

const seen = new Map(); // fingerprint -> { count, first, last }
const MAX_REPORTS = 20;
const reports = [];
let installed = false;

function fingerprint(err) {
  const msg = err?.message || String(err || 'Unknown error');
  const stack = String(err?.stack || '');
  // the first stack frame identifies the site; line numbers move with builds
  const site = (stack.split('\n')[1] || '').trim();
  return `${msg} @ ${site}`.slice(0, 240);
}

export function recordError(err, meta = {}) {
  const msg = err?.message || String(err || 'Unknown error');
  const id = fingerprint(err);
  const now = Date.now();
  const hit = seen.get(id);

  if (hit) {
    hit.count += 1;
    hit.last = now;
    // An error repeating in a loop is one bug, not a hundred: only re-announce
    // once per 10 seconds so the user can still read the banner.
    if (now - hit.announcedAt < 10000) return hit;
    hit.announcedAt = now;
  } else {
    seen.set(id, { count: 1, first: now, last: now, announcedAt: now, message: msg });
  }

  if (reports.length < MAX_REPORTS) {
    reports.push({
      message: msg,
      stack: String(err?.stack || '').slice(0, 2000),
      at: new Date(now).toISOString(),
      ...meta,
    });
  }

  toast('toast.crashed', 'error');
  return seen.get(id);
}

export function errorSummary() {
  return [...seen.entries()].map(([id, v]) => ({ id, ...v }));
}

export function errorReportText() {
  if (!reports.length) return 'DesignShop error report\n\nNo errors were recorded.';
  const head = `DesignShop error report\n${reports.length} recorded error(s)\n`;
  return (
    head +
    reports
      .map(
        (r, i) =>
          `\n--- ${i + 1} ---\n${r.at}${r.source ? ` [${r.source}]` : ''}\n${r.message}\n${r.stack || '(no stack)'}`
      )
      .join('\n')
  );
}

export function clearErrors() {
  seen.clear();
  reports.splice(0, reports.length);
}

/** Install the window-level handlers once. */
export function installErrorGuard() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener('error', (e) => {
    // Resource load failures (a missing image, a font 404) are not crashes —
    // they must never interrupt what the user is doing.
    if (e.target && e.target !== window && e.target.tagName) return;
    recordError(e.error || new Error(e.message), { source: 'window' });
  });

  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason instanceof Error ? e.reason : new Error(String(e.reason));
    recordError(reason, { source: 'promise' });
  });
}
