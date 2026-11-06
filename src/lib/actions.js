// Higher-level workflows: open / save / export with platform-aware dialogs.
import {
  getState,
  openDocument,
  toast,
  newDocument,
  commitDoc,
  activeLayer,
  updateLayer,
  loadImageSize,
  addImageFromDataUrl,
  readFileAsText,
  saveDesignJson,
  rememberDesign,
} from './store.js';
import { docFromJson as parseDoc, docToJson } from './document.js';
import {
  openFileDialog,
  saveBinary,
  saveZip,
  downloadBlob,
  copyCanvasToClipboard,
  PLATFORM,
  isDesktop,
} from './platform.js';
import { exportCanvas, canvasToDataUrl, canvasToBlob, refitDoc } from './render.js';
import { SOCIAL_EXPORT } from './presets.js';

export async function pickAndOpenFile() {
  const res = await openFileDialog();
  if (!res) return null;
  return openFromPayload(res);
}

export async function openFromPayload({ name, dataUrl }) {
  const lower = (name || '').toLowerCase();
  try {
    if (lower.endsWith('.dshop') || lower.endsWith('.json')) {
      const text = await fetch(dataUrl).then((r) => r.text());
      const doc = parseDoc(text);
      openDocument(doc);
      return doc;
    }
    const size = await loadImageSize(dataUrl);
    const st = getState();
    if (!st.doc) {
      const base = newDocument({ w: size.w, h: size.h, name: name || 'Image', background: 'transparent' });
      const layer = addImageFromDataUrl(dataUrl, { name, imgW: size.w, imgH: size.h });
      if (layer) {
        updateLayer(layer.id, { x: 0, y: 0, w: base.w, h: base.h }, { history: false });
      }
      return base;
    }
    addImageFromDataUrl(dataUrl, { name, imgW: size.w, imgH: size.h });
    return null;
  } catch (err) {
    console.error(err);
    toast('open.error', 'error');
    return null;
  }
}

export async function saveDesign({ saveAs = true } = {}) {
  const st = getState();
  if (!st.doc) return;
  const json = saveDesignJson();
  const safeName = (st.doc.name || 'design').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 60);
  const res = await saveBinary({
    name: `${safeName}.dshop`,
    dataUrl: `data:application/json;base64,${btoa(unescape(encodeURIComponent(json)))}`,
    mime: 'application/json',
  });
  if (res?.canceled) return;
  toast('toast.saved');
  rememberDesign(st.doc);
  void saveAs;
}

export function exportFormatName(format) {
  return format === 'jpg' ? 'jpg' : format === 'webp' ? 'webp' : 'png';
}

export async function doExport({ format = 'png', scale = 1, quality = 0.92, transparent = false, fileName, quick = false }) {
  const st = getState();
  if (!st.doc) return null;
  const canvas = exportCanvas(st.doc, { scale, format, quality, transparent });
  const dataUrl = canvasToDataUrl(canvas, format, quality);
  const safe = (fileName || st.doc.name || 'design').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 60);
  const name = `${safe}.${exportFormatName(format)}`;
  const res = await saveBinary({ name, dataUrl, mime: format === 'jpg' ? 'image/jpeg' : 'image/png', quick });
  return { ...res, dataUrl, name };
}

export async function quickExport() {
  const res = await doExport({ format: 'png', scale: 1, quick: true });
  if (!res?.canceled) toast('toast.exported');
  return res;
}

export async function exportAllSocial({ sizes = SOCIAL_EXPORT, format = 'png', zip = false, onProgress } = {}) {
  const st = getState();
  if (!st.doc) return [];
  const results = [];
  const total = sizes.length;
  for (let i = 0; i < sizes.length; i++) {
    const s = sizes[i];
    onProgress?.({ done: i, total, size: s });
    const doc = refitDoc(st.doc, s.w, s.h);
    const canvas = exportCanvas(doc, { scale: 1, format });
    const dataUrl = canvasToDataUrl(canvas, format);
    const safe = (st.doc.name || 'design').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 40);
    const name = `${safe}-${s.id}-${s.w}x${s.h}.${format}`;
    const res = await saveBinary({ name, dataUrl });
    results.push({ ...res, name, dataUrl, size: s });
    onProgress?.({ done: i + 1, total, size: s });
  }
  void zip;
  return results;
}

export async function copyPreviewToClipboard() {
  const st = getState();
  if (!st.doc) return false;
  const canvas = exportCanvas(st.doc, { scale: 1 });
  const ok = await copyCanvasToClipboard(canvas);
  if (ok) toast('export.copied');
  return ok;
}

/** Trim fully transparent borders of the flattened design. */
export function trimTransparent() {
  const st = getState();
  if (!st.doc) return;
  const { doc } = st;
  const canvas = exportCanvas({ ...doc, background: 'transparent' }, { scale: 1, transparent: true });
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const data = ctx.getImageData(0, 0, w, h).data;
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 6) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (minX > maxX || minY > maxY) {
    toast('toast.nothingToDo', 'info');
    return;
  }
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  if (cw === doc.w && ch === doc.h) {
    toast('toast.nothingToDo', 'info');
    return;
  }
  commitDoc(
    {
      ...doc,
      w: cw,
      h: ch,
      layers: doc.layers.map((l) => ({ ...l, x: l.x - minX, y: l.y - minY })),
    },
    { label: 'toast.cropped' }
  );
  toast('toast.cropped');
}

export async function loadRecentPayload(entry) {
  if (!entry?.doc) return;
  openDocument(entry.doc);
}

export { PLATFORM, isDesktop, canvasToBlob, downloadBlob, docToJson, readFileAsText, activeLayer };
