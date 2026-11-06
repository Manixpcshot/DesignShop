// Platform bridge. DesignShop ships in three shells:
//   • Tauri (Rust core)      -> window.__TAURI_INTERNALS__ + Rust commands
//   • Electron (portable/exe) -> window.designshop preload API
//   • Browser (preview/dev)   -> regular file download / <input type=file>

export function detectPlatform() {
  if (typeof window === 'undefined') return 'web';
  if (window.__TAURI_INTERNALS__ || window.__TAURI__) return 'tauri';
  if (window.designshop?.isDesktop) return 'electron';
  return 'web';
}

export const PLATFORM = detectPlatform();
export const isDesktop = PLATFORM !== 'web';

export function platformLabel() {
  if (PLATFORM === 'tauri') return 'Tauri · Rust';
  if (PLATFORM === 'electron') return 'Electron';
  return 'Browser preview';
}

async function tauriInvoke(cmd, args) {
  const internals = window.__TAURI_INTERNALS__;
  if (internals?.invoke) return internals.invoke(cmd, args);
  const api = window.__TAURI__;
  if (api?.core?.invoke) return api.core.invoke(cmd, args);
  if (api?.invoke) return api.invoke(cmd, args);
  throw new Error('Tauri API unavailable');
}

export function dataUrlToBase64(dataUrl) {
  const idx = String(dataUrl).indexOf(',');
  return idx >= 0 ? String(dataUrl).slice(idx + 1) : String(dataUrl);
}

export function base64ToDataUrl(base64, mime = 'image/png') {
  return `data:${mime};base64,${base64}`;
}

export function base64ToBlob(base64, mime = 'image/png') {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(dataUrlToBase64(r.result));
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

/** Browser download fallback. */
export function downloadDataUrl(name, dataUrl) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  return { canceled: false, path: name, downloaded: true };
}

export function downloadBlob(name, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  a.remove();
  return { canceled: false, path: name, downloaded: true };
}

function filtersFor(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (ext === 'png') return [{ name: 'PNG image', extensions: ['png'] }];
  if (ext === 'jpg' || ext === 'jpeg') return [{ name: 'JPEG image', extensions: ['jpg', 'jpeg'] }];
  if (ext === 'webp') return [{ name: 'WebP image', extensions: ['webp'] }];
  if (ext === 'dshop') return [{ name: 'DesignShop design', extensions: ['dshop'] }];
  if (ext === 'zip') return [{ name: 'ZIP archive', extensions: ['zip'] }];
  return [{ name: 'All files', extensions: ['*'] }];
}

/**
 * Save binary data to disk. Returns { canceled, path }.
 * When running in a browser the file is downloaded instead.
 */
export async function saveBinary({ name, dataUrl, base64, mime = 'image/png', quick = false }) {
  const b64 = base64 ?? dataUrlToBase64(dataUrl);
  try {
    if (PLATFORM === 'tauri') {
      // quick export writes straight to ~/Pictures, no dialog
      if (quick) {
        const savedPath = await tauriInvoke('save_to_pictures', { fileName: name, base64: b64 });
        return { canceled: false, path: savedPath };
      }
      const path = await tauriInvoke('save_binary', {
        request: { fileName: name, base64: b64, filters: filtersFor(name) },
      });
      return path ? { canceled: false, path } : { canceled: true, path: null };
    }
    if (PLATFORM === 'electron') {
      const res = await window.designshop.saveBinary({ fileName: name, base64: b64, filters: filtersFor(name) });
      return res || { canceled: true, path: null };
    }
  } catch (err) {
    console.error('Native save failed, falling back to download:', err);
  }
  if (dataUrl) return downloadDataUrl(name, dataUrl);
  return downloadBlob(name, base64ToBlob(b64, mime));
}

/** Save a ZIP (used by "export all sizes"). */
export async function saveZip({ name, blob }) {
  try {
    if (PLATFORM !== 'web') {
      const base64 = await blobToBase64(blob);
      return await saveBinary({ name, base64, mime: 'application/zip' });
    }
  } catch (err) {
    console.error(err);
  }
  return downloadBlob(name, blob);
}

/** Open a file via native dialog. Returns { name, dataUrl } or null. */
export async function openFileDialog() {
  try {
    if (PLATFORM === 'tauri') {
      const res = await tauriInvoke('open_file', {});
      if (!res) return null;
      return { name: res.fileName, dataUrl: base64ToDataUrl(res.base64, res.mime || 'image/png') };
    }
    if (PLATFORM === 'electron') {
      const res = await window.designshop.openFile();
      if (!res) return null;
      return { name: res.fileName, dataUrl: base64ToDataUrl(res.base64, res.mime || 'image/png') };
    }
  } catch (err) {
    console.error('Native open failed, using browser picker:', err);
  }
  return promptFilePicker();
}

/** Browser fallback for opening files. */
export function promptFilePicker(accept = 'image/*,.dshop') {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    input.style.pointerEvents = 'none';
    document.body.appendChild(input);
    let settled = false;
    const done = (value) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(value);
    };
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return done(null);
      const r = new FileReader();
      r.onload = () => done({ name: file.name, dataUrl: r.result, file });
      r.onerror = () => done(null);
      r.readAsDataURL(file);
    };
    window.addEventListener('focus', () => setTimeout(() => done(null), 900), { once: true });
    input.click();
  });
}

export async function saveText({ name, text }) {
  const dataUrl = `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;
  if (PLATFORM === 'web') return downloadDataUrl(name, dataUrl);
  return saveBinary({ name, dataUrl: `data:application/octet-stream;base64,${btoa(unescape(encodeURIComponent(text)))}` });
}

export async function copyCanvasToClipboard(canvas) {
  try {
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
    if (navigator.clipboard?.write && window.ClipboardItem) {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      return true;
    }
  } catch (err) {
    console.error('clipboard write failed', err);
  }
  if (PLATFORM === 'tauri') {
    try {
      await tauriInvoke('copy_png', { base64: dataUrlToBase64(canvas.toDataURL('image/png')) });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export async function revealInFolder(path) {
  try {
    if (PLATFORM === 'tauri') return await tauriInvoke('reveal_path', { path });
    if (PLATFORM === 'electron') return await window.designshop.revealPath(path);
  } catch (err) {
    console.error(err);
  }
  return false;
}

export async function getAppVersion() {
  try {
    if (PLATFORM === 'tauri') return await tauriInvoke('app_version');
    if (PLATFORM === 'electron') return await window.designshop.version();
  } catch {
    /* ignore */
  }
  return null;
}

export async function autoSaveProject({ name, text }) {
  try {
    if (PLATFORM === 'tauri') return await tauriInvoke('autosave_project', { fileName: name, text });
    if (PLATFORM === 'electron') return await window.designshop.autosave({ fileName: name, text });
  } catch (err) {
    console.error(err);
  }
  return null;
}
