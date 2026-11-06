// Document + layer factories. Everything the UI creates flows through here.
import { uid } from './geometry.js';
import { styleById, kitById, fontById, ADDONS, getSize } from './presets.js';
import { measureTextLayer } from './render.js';

export const APP_VERSION = '1.0.0';
export const FILE_EXT = 'dshop';

let seq = 0;
export const layerId = () => `L${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

const baseLayer = (over = {}) => ({
  id: layerId(),
  type: 'shape',
  name: 'Layer',
  x: 0,
  y: 0,
  w: 200,
  h: 200,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  opacity: 100,
  blend: 'normal',
  visible: true,
  locked: false,
  ...over,
});

export function createDoc({ w = 1280, h = 720, name = '', background = '#ffffff' } = {}) {
  return {
    id: uid('doc'),
    name: name || '',
    w: Math.round(w),
    h: Math.round(h),
    background,
    layers: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: APP_VERSION,
    kind: 'dshop',
  };
}

// ------------------------------------------------------------------ text layer
export function createTextLayer(doc, opts = {}) {
  const style = opts.styleId ? styleById(opts.styleId) : null;
  const fontId = opts.fontId || style?.font || 'anton';
  const smallSide = Math.min(doc.w, doc.h);
  const fontSize =
    opts.fontSize ||
    Math.round((style ? style.sizePct * (doc.h || smallSide) : 0.11 * smallSide) * (doc.h > doc.w ? 1.15 : 1));
  const layer = baseLayer({
    type: 'text',
    name: opts.name || 'Text',
    text: opts.text ?? style?.headline ?? '',
    fontId,
    fontSize: Math.max(12, fontSize),
    weight: opts.weight ?? style?.weight ?? 400,
    color: opts.color ?? style?.fill?.color ?? '#ffffff',
    gradient: opts.gradient !== undefined ? opts.gradient : style?.fill?.gradient ? { ...style.fill.gradient } : null,
    align: opts.align || 'center',
    uppercase: opts.uppercase ?? style?.uppercase ?? false,
    lineHeight: opts.lineHeight ?? 1.1,
    letterSpacing: opts.letterSpacing ?? 0,
    curve: 0,
    textStroke: null,
    effects: opts.effects ?? (style ? JSON.parse(JSON.stringify(style.effects)) : defaultTextEffects()),
    ...opts.extra,
  });
  const m = measureTextLayer(layer);
  layer.w = m.w;
  layer.h = m.h;
  if (opts.x != null) layer.x = opts.x;
  else layer.x = Math.round((doc.w - layer.w) / 2);
  if (opts.y != null) layer.y = opts.y;
  else layer.y = Math.round(doc.h * (opts.yPct ?? 0.42) - layer.h / 2);
  return layer;
}

export function defaultTextEffects() {
  return {
    shadow: { on: true, x: 0, y: 8, blur: 18, color: '#000000', opacity: 55 },
    glow: { on: false, color: '#12d8ff', blur: 20, opacity: 70, spread: 2 },
    stroke: { on: false, width: 4, color: '#ffffff', opacity: 100 },
    radius: { on: false, radius: 0 },
  };
}

/** Re-measure a text layer after content/style changes, keeping its anchor. */
export function refreshTextLayer(layer, anchor = 'center') {
  const m = measureTextLayer(layer);
  const oldCx = layer.x + layer.w / 2;
  const oldCy = layer.y + layer.h / 2;
  const next = { ...layer, w: m.w, h: m.h };
  if (anchor !== 'topLeft') {
    next.x = Math.round(oldCx - m.w / 2);
    next.y = Math.round(oldCy - m.h / 2);
  }
  return next;
}

// ----------------------------------------------------------------- shape layer
export function createShapeLayer(doc, opts = {}) {
  const shape = opts.shape || 'rect';
  const w = opts.w ?? Math.round(doc.w * 0.3);
  const h = opts.h ?? Math.round(doc.h * 0.3);
  const layer = baseLayer({
    type: 'shape',
    name: opts.name || shapeName(shape),
    shape,
    x: opts.x ?? Math.round((doc.w - w) / 2),
    y: opts.y ?? Math.round((doc.h - h) / 2),
    w,
    h,
    fill: opts.fillColor || opts.fill || '#4c8dff',
    fillColor: opts.fillColor || opts.fill || '#4c8dff',
    stroke: opts.stroke || null,
    strokeWidth: opts.strokeWidth ?? 0,
    radius: opts.radius ?? (shape === 'rect' ? 18 : 0),
    points: opts.points ?? (shape === 'star' ? 5 : 6),
    label: opts.label ?? null,
    labelColor: opts.labelColor || '#ffffff',
    progress: opts.progress ?? 0.65,
    rotation: opts.rotation ?? 0,
    effects: opts.effects ?? emptyEffects(),
  });
  return layer;
}

function shapeName(shape) {
  const map = {
    rect: 'Rectangle',
    ellipse: 'Ellipse',
    triangle: 'Triangle',
    star: 'Star',
    heart: 'Heart',
    polygon: 'Polygon',
    line: 'Line',
    arrow: 'Arrow',
    bubble: 'Speech bubble',
    frame: 'Frame',
    burst: 'Starburst',
    sparkle: 'Sparkle',
    progress: 'Progress bar',
    brushUnderline: 'Brush underline',
  };
  return map[shape] || 'Shape';
}

export function emptyEffects() {
  return {
    shadow: { on: false, x: 0, y: 8, blur: 20, color: '#000000', opacity: 50 },
    glow: { on: false, color: '#12d8ff', blur: 20, opacity: 70, spread: 2 },
    stroke: { on: false, width: 4, color: '#ffffff', opacity: 100 },
    radius: { on: false, radius: 18 },
  };
}

// ---------------------------------------------------------------- image layer
export function createImageLayer(doc, { src, imgW, imgH, name = 'Image', fit = 'cover', mask = null, x, y }) {
  const ratio = imgW / imgH || 1;
  const boxW = Math.round(doc.w * 0.62);
  const boxH = Math.round(boxW / ratio);
  const finalH = Math.min(boxH, Math.round(doc.h * 0.72));
  const finalW = Math.round(finalH * ratio);
  return baseLayer({
    type: 'image',
    name,
    src,
    srcVersion: 0,
    x: x ?? Math.round((doc.w - finalW) / 2),
    y: y ?? Math.round((doc.h - finalH) / 2),
    w: finalW,
    h: finalH,
    adj: null,
    effects: emptyEffects(),
    mask,
    fillMode: fit,
  });
}

// ---------------------------------------------------------------- emoji layer
export function createEmojiLayer(doc, emoji, opts = {}) {
  const size = opts.size || Math.round(Math.min(doc.w, doc.h) * 0.22);
  return baseLayer({
    type: 'emoji',
    name: `Sticker ${emoji}`,
    emoji,
    w: size,
    h: size,
    x: opts.x ?? Math.round(doc.w - size - doc.w * 0.06),
    y: opts.y ?? Math.round(doc.h - size - doc.h * 0.08),
    effects: emptyEffects(),
    rotation: opts.rotation ?? 0,
  });
}

// ---------------------------------------------------------------- brush layer
export function createBrushLayer(doc, strokes = [], name = 'Paint') {
  return baseLayer({
    type: 'brush',
    name,
    strokes,
    baseW: doc.w,
    baseH: doc.h,
    x: 0,
    y: 0,
    w: doc.w,
    h: doc.h,
    effects: emptyEffects(),
  });
}

// ------------------------------------------------------------------- add-ons
export function addonToLayer(doc, addonId, opts = {}) {
  const a = ADDONS.find((x) => x.id === addonId);
  if (!a) return null;
  const w = Math.round((a.w ?? 0.3) * doc.w);
  const h = Math.round((a.h ?? 0.3) * doc.h);
  const layer = createShapeLayer(doc, {
    shape: a.shape,
    name: a.nameKey ? a.nameKey.split('.').pop() : a.shape,
    x: Math.round((a.x ?? 0.5) * doc.w),
    y: Math.round((a.y ?? 0.5) * doc.h),
    w,
    h,
    fillColor: a.color,
    strokeWidth: a.strokeWidth ?? (a.shape === 'frame' ? 10 : 0),
    stroke: a.shape === 'frame' ? a.color : a.shape === 'ellipse' && a.fill === false ? a.color : null,
    radius: a.radius ?? 0,
    label: a.text || null,
    labelColor: a.labelColor,
    rotation: a.rotation ?? 0,
    effects: {
      ...emptyEffects(),
      shadow: { on: a.shape !== 'frame', x: 0, y: 10, blur: 22, color: '#000000', opacity: 45 },
    },
  });
  if (a.shape === 'ellipse' && a.fill === false) {
    layer.fill = false;
  }
  if (a.shape === 'emoji') {
    return createEmojiLayer(doc, a.text, { x: layer.x, y: layer.y, size: w });
  }
  if (opts.center) {
    layer.x = Math.round((doc.w - w) / 2);
    layer.y = Math.round((doc.h - h) / 2);
  }
  return layer;
}

// ------------------------------------------------------------------- styles
export function applyTextStyle(doc, layer, styleId) {
  const style = styleById(styleId);
  if (!style) return layer;
  const next = {
    ...layer,
    fontId: style.font,
    fontSize: Math.max(12, Math.round(style.sizePct * Math.min(doc.w, doc.h) * (doc.h > doc.w ? 1.2 : 1))),
    weight: style.weight,
    uppercase: style.uppercase,
    color: style.fill.color,
    gradient: style.fill.gradient ? { ...style.fill.gradient } : null,
    effects: JSON.parse(JSON.stringify(style.effects)),
  };
  return refreshTextLayer(next);
}

export function applyQuickEffects(layer, effects) {
  return { ...layer, effects: { ...layer.effects, ...JSON.parse(JSON.stringify(effects)) } };
}

// --------------------------------------------------------------------- kits
/**
 * Scale a headline so it reads like a thumbnail title: about `targetFrac` of
 * the canvas width, but never taller than `maxHFrac` of the canvas height.
 * Long headlines shrink, short ones grow — every kit looks intentional.
 */
export function fitHeadline(layer, doc, targetFrac = 0.78, maxHFrac = 0.42) {
  let next = { ...layer };
  for (let i = 0; i < 6; i++) {
    const m = measureTextLayer(next);
    const tooWide = m.w > doc.w * targetFrac;
    const tooTall = m.h > doc.h * maxHFrac;
    if (!tooWide && !tooTall) break;
    const ratio = Math.min(doc.w * targetFrac / m.w, doc.h * maxHFrac / m.h);
    next.fontSize = Math.max(12, Math.round(next.fontSize * Math.max(0.6, ratio)));
    next = refreshTextLayer(next);
  }
  for (let i = 0; i < 6; i++) {
    const m = measureTextLayer(next);
    if (m.w < doc.w * targetFrac * 0.9 && m.h < doc.h * maxHFrac * 0.95) {
      const ratio = Math.min(doc.w * targetFrac / m.w, doc.h * maxHFrac / m.h, 1.35);
      next.fontSize = Math.max(12, Math.round(next.fontSize * ratio));
      next = refreshTextLayer(next);
    } else break;
  }
  return next;
}

export function kitToDoc(doc, kitId, headline) {
  const kit = kitById(kitId);
  const next = { ...doc, background: JSON.parse(JSON.stringify(kit.background)), updatedAt: Date.now() };
  const text = createTextLayer(next, {
    text: headline ?? kit.headline,
    styleId: kit.headlineStyle,
    name: 'Headline',
    yPct: 0.5,
    color: kit.textColor,
  });
  // keep the style's own fill; only repaint when the kit asks for a colour
  // *and* the style has no gradient of its own
  if (!text.gradient && kit.textColor) text.color = kit.textColor;
  // portrait canvases are much taller than the headline, so let it run wider
  const widthFrac = kit.headlineWidth ?? (next.h > next.w ? 0.92 : 0.78);
  const fitted = fitHeadline(text, next, widthFrac);
  Object.assign(text, fitted);
  text.x = Math.round((next.w - text.w) / 2);
  text.y = Math.round(next.h * 0.5 - text.h / 2);
  // accents sit *behind* the headline so the text always stays readable
  const layers = [];
  for (const addonId of kit.addons || []) {
    const a = addonToLayer(next, addonId);
    if (a) layers.push(a);
  }
  layers.push(text);
  next.layers = layers;
  return next;
}

export function templateToDoc(template, allTemplates = []) {
  const t = typeof template === 'string' ? allTemplates.find((x) => x.id === template) : template;
  const size = getSize(t.size);
  let doc = createDoc({ w: size.w, h: size.h, name: t.nameKey });
  doc = kitToDoc(doc, t.kit, t.headline);
  doc.templateId = t.id;
  return doc;
}

export function applyBackground(doc, background) {
  return { ...doc, background: typeof background === 'string' ? background : JSON.parse(JSON.stringify(background)) };
}

// -------------------------------------------------------------- layer utils
export function cloneLayer(layer, offset = 16) {
  const copy = JSON.parse(JSON.stringify(layer));
  copy.id = layerId();
  copy.x += offset;
  copy.y += offset;
  if (copy.name) copy.name = `${copy.name} copy`;
  return copy;
}

export function mergeLayers(doc, bottom, top) {
  // flattened image of two layers baked into one raster layer
  const c = document.createElement('canvas');
  c.width = doc.w;
  c.height = doc.h;
  const ctx = c.getContext('2d');
  const { drawLayer } = requireRender();
  drawLayer(ctx, bottom, doc);
  drawLayer(ctx, top, doc);
  const src = c.toDataURL('image/png');
  const layer = createImageLayer(doc, { src, imgW: doc.w, imgH: doc.h, name: bottom.name || 'Merged' });
  layer.x = 0;
  layer.y = 0;
  layer.w = doc.w;
  layer.h = doc.h;
  return layer;
}

let renderRef = null;
export function registerRender(mod) {
  renderRef = mod;
}
function requireRender() {
  return renderRef;
}

export function docToJson(doc) {
  return JSON.stringify({ ...doc, savedAt: Date.now(), version: APP_VERSION, kind: 'dshop' }, null, 2);
}

export function docFromJson(str) {
  const raw = typeof str === 'string' ? JSON.parse(str) : str;
  if (!raw || !raw.w || !raw.h || !Array.isArray(raw.layers)) throw new Error('Invalid design file');
  return {
    ...createDoc({ w: raw.w, h: raw.h }),
    ...raw,
    id: raw.id || uid('doc'),
    layers: raw.layers.map((l) => ({ ...baseLayer(), ...l, id: l.id || layerId() })),
  };
}

export const fontFamilyLabel = (fontId) => fontById(fontId)?.label || 'Anton';
