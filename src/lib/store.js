// Central editor store: state, history (undo/redo), persistence and actions.
import { useSyncExternalStore } from 'react';
import {
  createDoc,
  createTextLayer,
  createShapeLayer,
  createImageLayer,
  createEmojiLayer,
  createBrushLayer,
  addonToLayer,
  applyTextStyle,
  applyBackground,
  kitToDoc,
  templateToDoc,
  cloneLayer,
  docToJson,
  docFromJson,
  refreshTextLayer,
  emptyEffects,
  APP_VERSION,
} from './document.js';
import { createTranslator, languageDir } from './i18n.js';
import { uid } from './geometry.js';

const LS = {
  prefs: 'designshop.prefs.v1',
  recents: 'designshop.recents.v1',
  last: 'designshop.lastDesign.v1',
};

export const DEFAULT_TOOL_OPTIONS = {
  brushSize: 24,
  brushHardness: 80,
  brushColor: '#ff3b30',
  shapeFill: '#4c8dff',
  shapeStroke: 'transparent',
  strokeWidth: 0,
  radius: 18,
  fontSize: 96,
  fontId: 'anton',
  textColor: '#ffffff',
  gradientOn: false,
  gradientA: '#ff2d95',
  gradientB: '#ffd166',
  gradientAngle: 20,
  tolerance: 28,
  feather: 0,
  stickerSet: 'symbols',
  keepRatio: true,
  eyedropperTarget: 'brushColor',
  shapePoints: 5,
};

export const DEFAULT_PREFS = {
  theme: 'dark',
  accent: '#4c8dff',
  lang: 'en',
  rtl: null, // null = derive from language
  grid: false,
  rulers: true,
  snap: true,
  autosave: true,
  smooth: true,
  restore: true,
  favoriteStyles: [],
  recentFonts: [],
  fontSample: '',
  fontId: 'anton',
};

function readLS(key, fallback) {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeLS(key, value) {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function initialState() {
  const prefs = { ...DEFAULT_PREFS, ...readLS(LS.prefs, {}) };
  return {
    ready: true,
    prefs,
    lang: prefs.lang,
    theme: prefs.theme,
    accent: prefs.accent,
    screen: 'start',
    doc: null,
    selection: [],
    activeTool: 'move',
    toolOptions: { ...DEFAULT_TOOL_OPTIONS },
    zoom: 1,
    fitMode: true,
    pan: { x: 0, y: 0 },
    showGrid: prefs.grid,
    showRulers: prefs.rulers,
    snap: prefs.snap,
    panel: 'studio',
    docNameDirty: false,
    saved: true,
    past: [],
    future: [],
    clipboard: null,
    styleClipboard: null,
    toasts: [],
    dialogs: {
      new: false,
      export: false,
      social: false,
      shortcuts: false,
      prefs: false,
      about: false,
      tour: false,
      wizard: false,
      templates: false,
      guide: false,
      updates: false,
    },
    recents: readLS(LS.recents, []),
    wizardLog: [],
    wizardOpen: false,
    lastAction: '',
    updateInfo: null,
    exportBusy: null,
    cropRect: null,
    selectionRect: null,
    toolHint: '',
  };
}

let renderMod = null;
let state = initialState();
const listeners = new Set();

export const getState = () => state;
export const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

function emit() {
  for (const l of listeners) l();
}

function set(partial, { persistPrefs = false } = {}) {
  state = { ...state, ...partial };
  if (persistPrefs) writeLS(LS.prefs, state.prefs);
  emit();
}

/** Emit a shallow patch (used by the canvas for transient UI state). */
export function patch(partial) {
  set(partial);
}

export function useEditor(selector) {
  const snap = useSyncExternalStore(subscribe, getState, getState);
  return selector ? selector(snap) : snap;
}

// ------------------------------------------------------------------ derived
export const t = (key, vars) => createTranslator(state.lang)(key, vars);
export const useT = () => {
  const lang = useEditor((s) => s.lang);
  return (key, vars) => createTranslator(lang)(key, vars);
};
export const dir = () => languageDir(state.lang);
export const isRtl = () => (state.prefs.rtl == null ? state.lang === 'fa' : !!state.prefs.rtl);

export const activeLayer = (s = state) => {
  if (!s.doc || !s.selection.length) return null;
  return s.doc.layers.find((l) => l.id === s.selection[s.selection.length - 1]) || null;
};
export const selectedLayers = (s = state) =>
  s.doc ? s.doc.layers.filter((l) => s.selection.includes(l.id)) : [];

// ------------------------------------------------------------------ history
const HISTORY_LIMIT = 70;
const cloneDoc = (doc) => JSON.parse(JSON.stringify(doc));

function pushHistory(label) {
  if (!state.doc) return;
  const past = [...state.past, { doc: cloneDoc(state.doc), label }];
  if (past.length > HISTORY_LIMIT) past.shift();
  state = { ...state, past, future: [] };
}

/** Replace the document (records undo history unless opts.history === false). */
export function commitDoc(nextDoc, { label = 'Edit', history = true, select = null } = {}) {
  if (!state.doc) {
    set({ doc: nextDoc, selection: select ?? nextDoc.layers.slice(-1).map((l) => l.id), saved: false });
    return nextDoc;
  }
  if (history) pushHistory(label);
  const next = { ...nextDoc, updatedAt: Date.now() };
  const keepSelection = select ?? state.selection;
  const valid = keepSelection.filter((id) => next.layers.some((l) => l.id === id));
  set({
    doc: next,
    selection: valid.length ? valid : next.layers.length ? [next.layers[next.layers.length - 1].id] : [],
    saved: false,
    lastAction: label,
  });
  scheduleAutosave();
  return next;
}

export function updateDoc(mutator, opts) {
  if (!state.doc) return state.doc;
  const draft = cloneDoc(state.doc);
  const result = mutator(draft) || draft;
  return commitDoc(result, opts);
}

export function undo() {
  if (!state.past.length) return false;
  const prev = state.past[state.past.length - 1];
  const future = [...state.future, { doc: cloneDoc(state.doc), label: prev.label }];
  set({
    doc: prev.doc,
    past: state.past.slice(0, -1),
    future,
    selection: prev.doc.layers.length ? [prev.doc.layers[prev.doc.layers.length - 1].id] : [],
    saved: false,
  });
  toast('toast.undone');
  return true;
}

export function redo() {
  if (!state.future.length) return false;
  const next = state.future[state.future.length - 1];
  set({
    doc: next.doc,
    future: state.future.slice(0, -1),
    past: [...state.past, { doc: cloneDoc(state.doc), label: next.label }],
    selection: next.doc.layers.length ? [next.doc.layers[next.doc.layers.length - 1].id] : [],
    saved: false,
  });
  toast('toast.redone');
  return true;
}

export function jumpToHistory(index) {
  // `past` holds the snapshot BEFORE each action, so restoring past[index]
  // rewinds to just before that action.
  if (index < 0 || index >= state.past.length) return;
  const target = state.past[index];
  // nearest-first list of states that now sit "ahead" of us
  const ahead = [
    ...state.past.slice(index + 1),
    { doc: cloneDoc(state.doc), label: target.label },
    ...[...state.future].reverse(),
  ];
  set({
    doc: target.doc,
    past: state.past.slice(0, index),
    future: ahead.reverse(),
    saved: false,
  });
}

// ------------------------------------------------------------------ toasts
let toastSeq = 0;
export function toast(message, type = 'success', vars = null) {
  const id = ++toastSeq;
  set({ toasts: [...state.toasts, { id, message, type, vars, at: Date.now() }] });
  setTimeout(() => dismissToast(id), type === 'error' ? 5200 : 2800);
}
export function dismissToast(id) {
  set({ toasts: state.toasts.filter((x) => x.id !== id) });
}

// ------------------------------------------------------------------ dialogs
export function openDialog(name, extra = {}) {
  set({ dialogs: { ...state.dialogs, [name]: true }, ...extra });
}
export function closeDialog(name) {
  set({ dialogs: { ...state.dialogs, [name]: false } });
}
export function setScreen(screen) {
  set({ screen });
}
export function setPanel(panel) {
  set({ panel });
}

// ------------------------------------------------------------------ documents
export function newDocument({ w, h, name, background = '#ffffff', templateId = null, kitId = null }) {
  let doc = createDoc({ w, h, name, background });
  if (kitId) doc = kitToDoc(doc, kitId);
  if (templateId) doc = templateToDoc(templateId);
  set({
    doc,
    selection: doc.layers.length ? [doc.layers[doc.layers.length - 1].id] : [],
    screen: 'editor',
    past: [],
    future: [],
    zoom: 1,
    fitMode: true,
    pan: { x: 0, y: 0 },
    saved: true,
    panel: 'studio',
    dialogs: { ...state.dialogs, new: false, templates: false },
  });
  rememberDesign(doc);
  toast('toast.newDesign');
  return doc;
}

export function openDocument(doc, { silent = false } = {}) {
  set({
    doc,
    selection: doc.layers.length ? [doc.layers[doc.layers.length - 1].id] : [],
    screen: 'editor',
    past: [],
    future: [],
    zoom: 1,
    fitMode: true,
    pan: { x: 0, y: 0 },
    saved: true,
    dialogs: { ...state.dialogs, new: false, templates: false },
  });
  rememberDesign(doc);
  if (!silent) toast('toast.projectOpened');
}

export function closeDocument() {
  set({ screen: 'start', doc: null, selection: [], past: [], future: [] });
}

export function setDocName(name) {
  if (!state.doc) return;
  set({ doc: { ...state.doc, name }, saved: false });
  scheduleAutosave();
}

export function updatePrefs(patch, { persist = true } = {}) {
  const prefs = { ...state.prefs, ...patch };
  const extra = {};
  if (patch.lang) extra.lang = patch.lang;
  if (patch.theme) extra.theme = patch.theme;
  if (patch.accent) extra.accent = patch.accent;
  if (patch.grid != null) extra.showGrid = patch.grid;
  if (patch.rulers != null) extra.showRulers = patch.rulers;
  if (patch.snap != null) extra.snap = patch.snap;
  set({ prefs, ...extra }, { persistPrefs: persist });
}

export function setLang(lang) {
  updatePrefs({ lang });
  document.documentElement.lang = lang;
  document.documentElement.dir = languageDir(lang);
}

export function setTheme(theme) {
  updatePrefs({ theme });
  document.documentElement.dataset.theme = theme;
}

export function setAccent(color) {
  updatePrefs({ accent: color });
  document.documentElement.style.setProperty('--accent', color);
}

// ------------------------------------------------------------------ tools
export function enterFreeTransform() {
  set({ activeTool: 'move' });
  toast('menu.edit.transform', 'info');
}

export function setTool(tool) {
  set({ activeTool: tool, toolHint: '' });
}
export function setToolOption(patch) {
  set({ toolOptions: { ...state.toolOptions, ...patch } });
}
export function setZoom(zoom, { fit = false } = {}) {
  set({ zoom: Math.min(32, Math.max(0.02, zoom)), fitMode: fit });
}
export function setPan(pan) {
  set({ pan });
}
export function toggleGrid() {
  updatePrefs({ grid: !state.showGrid });
}
export function toggleRulers() {
  updatePrefs({ rulers: !state.showRulers });
}
export function toggleSnap() {
  updatePrefs({ snap: !state.snap });
}

// ------------------------------------------------------------------ selection
export function selectLayer(id, { additive = false, toggle = false } = {}) {
  if (!id) {
    set({ selection: [] });
    return;
  }
  if (toggle) {
    const has = state.selection.includes(id);
    set({ selection: has ? state.selection.filter((x) => x !== id) : [...state.selection, id] });
    return;
  }
  if (additive) {
    set({ selection: state.selection.includes(id) ? state.selection : [...state.selection, id] });
    return;
  }
  set({ selection: [id] });
}
export function selectAllLayers() {
  if (!state.doc) return;
  set({ selection: state.doc.layers.map((l) => l.id) });
}
export function deselect() {
  set({ selection: [] });
}

// ------------------------------------------------------------------ layers
export function addLayer(layer, { label = 'Add layer', select = true } = {}) {
  if (!state.doc || !layer) return null;
  updateDoc(
    (d) => {
      d.layers.push(layer);
      return d;
    },
    { label, select: select ? [layer.id] : undefined }
  );
  return layer;
}

export function addNewLayer(kind = 'empty') {
  if (!state.doc) return null;
  let layer;
  if (kind === 'text') {
    layer = createTextLayer(state.doc, {
      text: t('text.fillPlaceholder'),
      fontId: state.toolOptions.fontId,
      name: t('layers.type.text'),
    });
  } else if (kind === 'emoji') {
    layer = createEmojiLayer(state.doc, '🔥');
  } else if (kind === 'brush') {
    layer = createBrushLayer(state.doc, []);
  } else {
    layer = createShapeLayer(state.doc, { shape: 'rect', w: Math.round(state.doc.w * 0.34), h: Math.round(state.doc.h * 0.28), fillColor: '#4c8dff' });
  }
  addLayer(layer, { label: kind === 'text' ? 'toast.textAdded' : 'toast.layerAdded' });
  return layer;
}

export function updateLayer(id, patch, { label = 'Edit layer', history = true, relayoutText = false } = {}) {
  if (!state.doc) return;
  updateDoc(
    (d) => {
      const i = d.layers.findIndex((l) => l.id === id);
      if (i < 0) return d;
      let next = { ...d.layers[i], ...patch };
      if (relayoutText && next.type === 'text') next = refreshTextLayer(next);
      d.layers[i] = next;
      return d;
    },
    { label, history }
  );
}

export function updateSelectedLayer(patch, opts) {
  const id = state.selection[state.selection.length - 1];
  if (id) updateLayer(id, patch, opts);
}

export function deleteLayer(id = null, { silent = false } = {}) {
  if (!state.doc) return;
  const ids = id ? [id] : state.selection;
  if (!ids.length) return;
  updateDoc(
    (d) => {
      d.layers = d.layers.filter((l) => !ids.includes(l.id));
      return d;
    },
    { label: 'toast.layerDeleted', select: state.selection.filter((x) => !ids.includes(x)) }
  );
  if (!silent) toast('toast.layerDeleted');
}

export function duplicateLayer(id = null) {
  if (!state.doc) return null;
  const target = id || state.selection[state.selection.length - 1];
  const layer = state.doc.layers.find((l) => l.id === target);
  if (!layer) return null;
  const copy = cloneLayer(layer);
  addLayer(copy, { label: 'toast.layerDuplicated' });
  toast('toast.layerDuplicated');
  return copy;
}

export function reorderLayer(id, direction) {
  // direction: 'up' (visually higher = later in array), 'down', 'top', 'bottom'
  if (!state.doc) return;
  updateDoc(
    (d) => {
      const i = d.layers.findIndex((l) => l.id === id);
      if (i < 0) return d;
      const [layer] = d.layers.splice(i, 1);
      let target = i;
      if (direction === 'up') target = Math.min(d.layers.length, i + 1);
      else if (direction === 'down') target = Math.max(0, i - 1);
      else if (direction === 'top') target = d.layers.length;
      else if (direction === 'bottom') target = 0;
      d.layers.splice(target, 0, layer);
      return d;
    },
    { label: 'Reorder layer', select: [id] }
  );
}

export function moveLayerToIndex(id, index) {
  if (!state.doc) return;
  updateDoc(
    (d) => {
      const i = d.layers.findIndex((l) => l.id === id);
      if (i < 0) return d;
      const [layer] = d.layers.splice(i, 1);
      d.layers.splice(Math.max(0, Math.min(d.layers.length, index)), 0, layer);
      return d;
    },
    { label: 'Reorder layer', select: [id] }
  );
}

export function mergeDown(id = null) {
  if (!state.doc) return;
  const target = id || state.selection[state.selection.length - 1];
  const i = state.doc.layers.findIndex((l) => l.id === target);
  if (i <= 0) {
    toast('toast.nothingToDo', 'info');
    return;
  }
  const bottom = state.doc.layers[i - 1];
  const top = state.doc.layers[i];
  updateDoc(
    (d) => {
      const canvas = document.createElement('canvas');
      canvas.width = d.w;
      canvas.height = d.h;
      const ctx = canvas.getContext('2d');
      // lazily import to avoid a circular import at module load
      const { drawLayer } = renderMod || {};
      if (!drawLayer) return d;
      drawLayer(ctx, bottom, d);
      drawLayer(ctx, top, d);
      const src = canvas.toDataURL('image/png');
      const merged = {
        ...bottom,
        id: `L${Date.now().toString(36)}`,
        type: 'image',
        src,
        srcVersion: 0,
        name: bottom.name,
        x: 0,
        y: 0,
        w: d.w,
        h: d.h,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        effects: emptyEffects(),
        adj: null,
      };
      d.layers.splice(i - 1, 2, merged);
      return d;
    },
    { label: 'toast.merged' }
  );
  toast('toast.merged');
}

export function flattenDoc() {
  if (!state.doc) return;
  updateDoc(
    (d) => {
      const canvas = document.createElement('canvas');
      canvas.width = d.w;
      canvas.height = d.h;
      const ctx = canvas.getContext('2d');
      const { renderDocument } = renderMod || {};
      if (!renderDocument) return d;
      const flat = document.createElement('canvas');
      flat.width = d.w;
      flat.height = d.h;
      renderDocument(flat, d);
      const src = flat.toDataURL('image/png');
      d.layers = [
        {
          ...createImageLayer(d, { src, imgW: d.w, imgH: d.h, name: 'Flattened' }),
          x: 0,
          y: 0,
          w: d.w,
          h: d.h,
        },
      ];
      return d;
    },
    { label: 'toast.flattened' }
  );
  toast('toast.flattened');
}

export function alignLayer(id, how) {
  if (!state.doc) return;
  const doc = state.doc;
  updateDoc(
    (d) => {
      const l = d.layers.find((x) => x.id === id);
      if (!l) return d;
      if (how === 'left') l.x = 0;
      if (how === 'right') l.x = d.w - l.w;
      if (how === 'top') l.y = 0;
      if (how === 'bottom') l.y = d.h - l.h;
      if (how === 'centerH') l.x = Math.round((d.w - l.w) / 2);
      if (how === 'centerV') l.y = Math.round((d.h - l.h) / 2);
      return d;
    },
    { label: 'toast.aligned' }
  );
  toast(how === 'centerH' || how === 'centerV' ? 'toast.centered' : 'toast.aligned');
}

export function centerLayer(id) {
  alignLayer(id, 'centerH');
  if (!state.doc) return;
  updateDoc(
    (d) => {
      const l = d.layers.find((x) => x.id === id);
      if (l) l.y = Math.round((d.h - l.h) / 2);
      return d;
    },
    { label: 'toast.centered', history: false }
  );
}

export function toggleLayerVisible(id) {
  const l = state.doc?.layers.find((x) => x.id === id);
  if (l) updateLayer(id, { visible: !l.visible }, { history: false });
}
export function toggleLayerLock(id) {
  const l = state.doc?.layers.find((x) => x.id === id);
  if (l) updateLayer(id, { locked: !l.locked }, { history: false });
}

// ------------------------------------------------------------------ text styles
export function applyStyleToSelection(styleId) {
  if (!state.doc) return false;
  const layer = activeLayer();
  if (!layer || layer.type !== 'text') {
    toast('studio.needLayer', 'info');
    return false;
  }
  const styled = applyTextStyle(state.doc, layer, styleId);
  updateLayer(layer.id, styled, { label: 'Text style' });
  toast('studio.styleApplied');
  return true;
}

export function applyKit(kitId, headline = null) {
  if (!state.doc) return;
  updateDoc(
    (d) => {
      const next = kitToDoc(d, kitId, headline);
      d.background = next.background;
      d.layers = [...d.layers, ...next.layers];
      return d;
    },
    { label: 'Apply kit' }
  );
  toast('studio.kitApplied');
}

export function applyBackgroundPreset(background) {
  if (!state.doc) return;
  updateDoc((d) => applyBackground(d, background), { label: 'Background' });
  toast('studio.bgApplied');
}

export function addAddon(addonId) {
  if (!state.doc) return null;
  const layer = addonToLayer(state.doc, addonId);
  if (!layer) return null;
  addLayer(layer, { label: 'Add-on' });
  return layer;
}

export function applyQuickEffect(effects) {
  const layer = activeLayer();
  if (!layer) {
    toast('opt.selectLayer', 'info');
    return;
  }
  updateLayer(layer.id, { effects: { ...layer.effects, ...JSON.parse(JSON.stringify(effects)) } }, { label: 'Effect' });
}

export function addEmoji(emoji, { size } = {}) {
  if (!state.doc) return null;
  const layer = createEmojiLayer(state.doc, emoji, { size });
  addLayer(layer, { label: 'toast.emojiAdded' });
  toast('toast.emojiAdded');
  return layer;
}

// ------------------------------------------------------------------ images
export function addImageFromDataUrl(dataUrl, { name = 'Image', imgW, imgH, mask = null } = {}) {
  if (!state.doc) return null;
  const layer = createImageLayer(state.doc, { src: dataUrl, imgW, imgH, name, mask });
  addLayer(layer, { label: 'toast.imageAdded' });
  toast('toast.imageAdded');
  return layer;
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsText(file);
  });
}
export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function loadImageSize(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = reject;
    img.src = src;
  });
}

export async function handleDroppedFile(file) {
  const name = (file.name || '').toLowerCase();
  try {
    if (name.endsWith('.dshop') || name.endsWith('.json') || file.type === 'application/json') {
      const text = await readFileAsText(file);
      const doc = docFromJson(text);
      openDocument(doc);
      return { kind: 'project' };
    }
    if (file.type.startsWith('image/')) {
      const dataUrl = await readFileAsDataUrl(file);
      const size = await loadImageSize(dataUrl);
      if (!state.doc) {
        const doc = createDoc({ w: size.w, h: size.h, name: file.name, background: 'transparent' });
        const layer = createImageLayer(doc, { src: dataUrl, imgW: size.w, imgH: size.h, name: file.name });
        layer.x = 0;
        layer.y = 0;
        layer.w = doc.w;
        layer.h = doc.h;
        doc.layers = [layer];
        openDocument(doc);
        return { kind: 'image-as-doc' };
      }
      addImageFromDataUrl(dataUrl, { name: file.name, imgW: size.w, imgH: size.h });
      return { kind: 'image' };
    }
    toast('open.unsupported', 'error');
    return { kind: 'unsupported' };
  } catch (err) {
    console.error(err);
    toast('open.error', 'error');
    return { kind: 'error' };
  }
}

// ------------------------------------------------------------------ recents
export function rememberDesign(doc) {
  const entry = {
    id: doc.id,
    name: doc.name || t('ws.untitled'),
    w: doc.w,
    h: doc.h,
    at: Date.now(),
    doc: JSON.parse(JSON.stringify(doc)),
  };
  const recents = [entry, ...state.recents.filter((r) => r.id !== doc.id)].slice(0, 12);
  set({ recents });
  writeLS(LS.recents, recents);
  scheduleAutosave();
}

export function deleteRecent(id) {
  const recents = state.recents.filter((r) => r.id !== id);
  set({ recents });
  writeLS(LS.recents, recents);
}

let autosaveTimer = null;
let lastAutosave = 0;
function scheduleAutosave() {
  if (!state.prefs.autosave) return;
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    if (!state.doc) return;
    if (Date.now() - lastAutosave < 4000) return;
    lastAutosave = Date.now();
    writeLS(LS.last, { doc: state.doc, at: Date.now() });
    set({ saved: true });
  }, 1200);
}

export function restoreLastDesign() {
  const last = readLS(LS.last, null);
  if (last?.doc?.layers) {
    try {
      openDocument(last.doc, { silent: true });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function saveDesignJson() {
  if (!state.doc) return null;
  const json = docToJson(state.doc);
  writeLS(LS.last, { doc: state.doc, at: Date.now() });
  set({ saved: true });
  rememberDesign(state.doc);
  return json;
}

// ------------------------------------------------------------------ clipboard
export function copySelection({ cut = false } = {}) {
  const layer = activeLayer();
  if (!layer) {
    toast('misc.noSelection', 'info');
    return false;
  }
  set({ clipboard: JSON.parse(JSON.stringify(layer)) });
  toast('toast.copied');
  if (cut) deleteLayer(layer.id, { silent: true });
  return true;
}

export function pasteClipboard() {
  if (!state.clipboard) return false;
  const copy = cloneLayer(state.clipboard);
  addLayer(copy, { label: 'toast.pasted' });
  toast('toast.pasted');
  return true;
}

export function copyStyle() {
  const layer = activeLayer();
  if (!layer) return;
  set({
    styleClipboard: {
      effects: layer.effects,
      color: layer.color,
      gradient: layer.gradient,
      fontId: layer.fontId,
      weight: layer.weight,
      uppercase: layer.uppercase,
    },
  });
  toast('toast.styleCopied');
}

export function pasteStyle() {
  const layer = activeLayer();
  if (!layer || !state.styleClipboard) return;
  const sc = state.styleClipboard;
  const next = { ...layer, ...sc };
  updateLayer(layer.id, next, { label: 'Paste style', relayoutText: layer.type === 'text' });
  toast('toast.stylePasted');
}

// ------------------------------------------------------------------ doc-level
export function resizeCanvas(w, h, { scaleLayers = false } = {}) {
  if (!state.doc) return;
  updateDoc(
    (d) => {
      const sx = w / d.w;
      const sy = h / d.h;
      if (scaleLayers) {
        d.layers = d.layers.map((l) => ({
          ...l,
          x: l.x * sx,
          y: l.y * sy,
          w: l.w * sx,
          h: l.h * sy,
          fontSize: l.fontSize ? l.fontSize * Math.min(sx, sy) : l.fontSize,
        }));
      }
      d.w = w;
      d.h = h;
      return d;
    },
    { label: 'Resize canvas' }
  );
}

/** Crop the canvas to a document-space rectangle (used by the crop tool). */
export function cropCanvasToRect(rect) {
  if (!state.doc || !rect) return;
  const w = Math.max(16, Math.round(rect.w));
  const h = Math.max(16, Math.round(rect.h));
  updateDoc(
    (d) => {
      d.layers = d.layers.map((l) => ({ ...l, x: l.x - Math.round(rect.x), y: l.y - Math.round(rect.y) }));
      d.w = w;
      d.h = h;
      return d;
    },
    { label: 'toast.cropped' }
  );
  toast('toast.cropped');
}

export function flipDocument(axis = 'h') {
  if (!state.doc) return;
  updateDoc(
    (d) => {
      d.layers = d.layers.map((l) => ({
        ...l,
        scaleX: (l.scaleX ?? 1) * (axis === 'h' ? -1 : 1),
        scaleY: (l.scaleY ?? 1) * (axis === 'v' ? -1 : 1),
        x: axis === 'h' ? d.w - l.x - l.w : l.x,
        y: axis === 'v' ? d.h - l.y - l.h : l.y,
      }));
      return d;
    },
    { label: 'Flip' }
  );
}

export function rotateDocument(deg = 90) {
  if (!state.doc) return;
  updateDoc(
    (d) => {
      const swap = Math.abs(deg) % 180 === 90;
      const nw = swap ? d.h : d.w;
      const nh = swap ? d.w : d.h;
      d.layers = d.layers.map((l) => {
        const cx = l.x + l.w / 2;
        const cy = l.y + l.h / 2;
        const ncx = deg > 0 ? d.h - cy : cy;
        const ncy = deg > 0 ? cx : d.w - cx;
        return {
          ...l,
          rotation: (l.rotation || 0) + deg,
          x: ncx - l.w / 2,
          y: ncy - l.h / 2,
        };
      });
      d.w = nw;
      d.h = nh;
      return d;
    },
    { label: 'Rotate' }
  );
}

export function toggleFullscreen() {
  const el = document.documentElement;
  if (!document.fullscreenElement) el.requestFullscreen?.().catch(() => {});
  else document.exitFullscreen?.().catch(() => {});
}

// expose the renderer so merge/flatten can draw without a circular import
export function attachRender(mod) {
  renderMod = mod;
}

export const VERSION = APP_VERSION;
export { uid };
