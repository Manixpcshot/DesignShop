// Auto-update from GitHub Releases.
//
// Three shells, one flow:
//   • Tauri   — ask the Rust core to download and relaunch (native install)
//   • Electron— the preload bridge runs electron-updater / a shell relaunch
//   • Web     — we can only *tell* the user; the browser serves the page, so
//               the honest action is "reload" or "download the new build"
//
// The GitHub API is the single source of truth: the newest published release
// is compared with the version baked into this build. Everything is read-only
// and unauthenticated (60 requests/hour per IP is plenty for a version check),
// and the check is silent unless the user asked for it or an update exists.
import { PLATFORM, detectPlatform } from './platform.js';

const REPO = 'Manixpcshot/DesignShop';
const API = `https://api.github.com/repos/${REPO}/releases`;
const STATE_KEY = 'designshop.update.v1';
const CHECK_EVERY_MS = 6 * 60 * 60 * 1000; // six hours

/** Numeric semver compare. Returns 1, 0 or -1. */
export function compareVersions(a, b) {
  const norm = (v) =>
    String(v || '0')
      .replace(/^v/i, '')
      .split('-')[0]
      .split('.')
      .map((n) => parseInt(n, 10) || 0);
  const pa = norm(a);
  const pb = norm(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

// Replaced at build time by vite.config.js (from package.json). The typeof
// guard keeps this file importable from Node tests, where the define does not
// exist.
export const APP_VERSION =
  typeof __DS_VERSION__ !== 'undefined' ? __DS_VERSION__ : '1.0.0';

const readCache = () => {
  try {
    const raw = globalThis.localStorage?.getItem(STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeCache = (value) => {
  try {
    globalThis.localStorage?.setItem(STATE_KEY, JSON.stringify(value));
  } catch {
    /* storage being full must not break an update check */
  }
};

/** Pick the asset that matches the running platform. */
export function pickAsset(release, platform = detectPlatform()) {
  const assets = release?.assets || [];
  const names = assets.map((a) => a.name);
  const find = (re) => assets.find((a) => re.test(a.name));

  if (platform === 'tauri') {
    return (
      find(/tauri-linux.*\.AppImage$/i) ||
      find(/tauri-linux.*\.deb$/i) ||
      find(/tauri-linux.*\.rpm$/i) ||
      null
    );
  }
  if (platform === 'electron') {
    const ua = (globalThis.navigator?.userAgent || '').toLowerCase();
    const isWin = ua.includes('windows');
    if (isWin) return find(/windows-x64\.exe$/i) || find(/windows-portable-x64\.exe$/i) || null;
    return find(/linux-x64\.AppImage$/i) || find(/linux-x64\.deb$/i) || find(/linux-x64\.rpm$/i) || null;
  }
  return null;
}

/**
 * Ask GitHub for the newest release.
 * Resolves to `{ ok, update: {version, notes, url, asset, publishedAt} | null }`.
 * Never throws: the caller is a timer, and an offline laptop is normal.
 */
export async function checkForUpdate({ timeoutMs = 8000 } = {}) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const res = await fetch(`${API}/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller?.signal,
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`GitHub responded ${res.status}`);
    const release = await res.json();
    const latest = String(release.tag_name || release.name || '').replace(/^v/i, '');
    if (!latest) throw new Error('release has no version');

    const current = APP_VERSION;
    const newer = compareVersions(latest, current) > 0;
    const asset = newer ? pickAsset(release) : null;

    const result = {
      ok: true,
      checkedAt: Date.now(),
      current,
      latest,
      update: newer
        ? {
            version: latest,
            notes: String(release.body || '').slice(0, 4000),
            url: release.html_url,
            publishedAt: release.published_at,
            assetName: asset?.name || null,
            assetUrl: asset?.browser_download_url || null,
            assetSize: asset?.size || 0,
          }
        : null,
    };
    writeCache({ ...result, ok: true });
    return result;
  } catch (err) {
    const cached = readCache();
    return {
      ok: false,
      error: err?.name === 'AbortError' ? 'timeout' : String(err?.message || err),
      checkedAt: Date.now(),
      current: APP_VERSION,
      update: null,
      cached: cached?.update || null,
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Should the startup check run now?
 * The window is measured from the last *successful* check. A failed attempt
 * (offline, rate-limited) must not silence the next launch — otherwise one
 * bad session hides updates for six hours.
 */
export function shouldCheckNow() {
  const cache = readCache();
  if (!cache?.ok || !cache.checkedAt) return true;
  return Date.now() - cache.checkedAt > CHECK_EVERY_MS;
}

export const lastCheck = () => {
  const c = readCache();
  return c ? { checkedAt: c.checkedAt, latest: c.latest, current: c.current } : null;
};

// --------------------------------------------------------------- installing
/**
 * Apply an update.
 * Desktop shells do the real work; the browser gets an honest fallback.
 */
export async function applyUpdate(update, { onProgress } = {}) {
  if (!update) return { ok: false, error: 'no-update' };
  const platform = detectPlatform();

  // --- Tauri: the Rust core owns download + relaunch -----------------------
  if (platform === 'tauri') {
    try {
      const invoke = globalThis.__TAURI_INTERNALS__?.invoke || globalThis.__TAURI__?.core?.invoke;
      if (invoke) {
        onProgress?.({ phase: 'download', percent: 0 });
        await invoke('install_update', {
          url: update.assetUrl,
          version: update.version,
        });
        onProgress?.({ phase: 'done', percent: 100 });
        return { ok: true, relaunching: true };
      }
    } catch (err) {
      return { ok: false, error: String(err?.message || err) };
    }
  }

  // --- Electron: preload exposes an updater -------------------------------
  if (platform === 'electron') {
    const api = globalThis.designshop;
    try {
      if (api?.installUpdate) {
        const out = await api.installUpdate({
          url: update.assetUrl,
          version: update.version,
        });
        return out?.ok === false ? out : { ok: true, relaunching: true };
      }
      if (api?.openExternal && update.assetUrl) {
        await api.openExternal(update.assetUrl);
        return { ok: true, downloaded: true, external: true };
      }
    } catch (err) {
      return { ok: false, error: String(err?.message || err) };
    }
  }

  // --- Browser: we cannot replace ourselves; be honest about it -----------
  if (update.url) {
    globalThis.open?.(update.url, '_blank', 'noopener');
    return { ok: true, external: true };
  }
  return { ok: false, error: 'unsupported' };
}

/**
 * Turn a GitHub release body into a short, readable list.
 * Release notes repeat the version ("## DesignShop 1.0.12") and carry download
 * tables; neither belongs in a 6-line summary. Headings become section
 * markers like "Added:" so the bullets below them keep their meaning.
 */
export function summarizeNotes(body, maxLines = 7) {
  const out = [];
  for (const raw of String(body || '').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('|') || /^[-=]{3,}$/.test(line)) continue;
    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    if (heading) {
      const text = heading[1].replace(/[*_`]/g, '').trim();
      // skip the "DesignShop 1.2.3" title row
      if (/^designshop[\s-]*v?\d/i.test(text)) continue;
      out.push({ kind: 'heading', text });
      continue;
    }
    const bullet = /^[-*+]\s+(.*)$/.exec(line) || /^\d+\.\s+(.*)$/.exec(line);
    if (bullet) {
      out.push({ kind: 'item', text: bullet[1].replace(/\*\*/g, '').replace(/`/g, '') });
    }
  }
  return out
    .slice(0, maxLines)
    .map((n) => {
      const text = n.text.length > 150 ? `${n.text.slice(0, 147)}…` : n.text;
      return n.kind === 'heading' ? `${text}` : text;
    });
}

export const UPDATE_REPO = REPO;
export const UPDATE_STATE_KEY = STATE_KEY;
export const UPDATE_INTERVAL_MS = CHECK_EVERY_MS;
