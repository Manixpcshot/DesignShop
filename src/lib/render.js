// Canvas renderer for DesignShop documents.
// Layers are rendered to offscreen canvases (cached) and then composited with
// transforms + layer effects. Everything is plain canvas 2D so the same code
// runs in Electron, Tauri (WebView) and the browser preview.
import { createCanvas, round } from './geometry.js';
import { applyAdjustments, drawWithEffects, hasAdjustments, hexToRgba } from './filters.js';
import { fontCss, fontById } from './presets.js';

const layerCache = new Map();
const imageCache = new Map();
const MAX_CACHE = 90;

function cacheSet(map, key, value) {
  if (map.size > MAX_CACHE) {
    const first = map.keys().next().value;
    map.delete(first);
  }
  map.set(key, value);
}

export function clearRenderCache(keepImages = true) {
  layerCache.clear();
  if (!keepImages) imageCache.clear();
}

const adjKey = (adj) => {
  if (!adj) return '';
  return Object.keys(adj)
    .sort()
    .map((k) => `${k}:${adj[k]}`)
    .join('|');
};

export function setFont(ctx, layer) {
  const f = fontById(layer.fontId);
  const weight = layer.weight || (f.weights?.length ? f.weights[f.weights.length - 1] : 700);
  const size = Math.max(4, layer.fontSize || 48);
  ctx.font = `${layer.italic ? 'italic ' : ''}${weight} ${size}px ${fontCss(layer.fontId)}`;
  return size;
}

export function textContent(layer) {
  const raw = layer.text ?? '';
  return layer.uppercase ? raw.toLocaleUpperCase() : raw;
}

export function textLines(layer) {
  return String(textContent(layer)).split('\n');
}

export function measureTextLayer(layer) {
  const c = createCanvas(8, 8);
  const ctx = c.getContext('2d');
  const size = setFont(ctx, layer);
  const lines = textLines(layer);
  if (ctx.letterSpacing !== undefined) {
    ctx.letterSpacing = `${layer.letterSpacing || 0}px`;
  }
  let w = 0;
  for (const line of lines) {
    w = Math.max(w, ctx.measureText(line || ' ').width);
  }
  const lineHeight = size * (layer.lineHeight || 1.12);
  const h = Math.max(lineHeight, lines.length * lineHeight);
  const pad = Math.ceil(size * 0.28) + (layer.effects?.stroke?.on ? layer.effects.stroke.width * 2 : 0);
  return {
    w: Math.ceil(w + pad * 2 + (layer.letterSpacing || 0) * 2),
    h: Math.ceil(h + pad * 2),
    pad,
    lines,
    lineHeight,
    size,
  };
}

function paintText(ctx, layer, m, originX, originY) {
  const { lines, lineHeight, size } = m;
  const totalH = lines.length * lineHeight;
  const pad = m.pad;
  let y = pad + (size * (layer.lineHeight || 1.12) - size) / 2;

  const fill = layer.gradient
    ? (() => {
        const a = ((layer.gradient.angle ?? 90) * Math.PI) / 180;
        const cx = m.w / 2;
        const cy = m.h / 2;
        const len = Math.max(m.w, m.h) / 1.4;
        const g = ctx.createLinearGradient(
          cx - Math.cos(a) * len,
          cy - Math.sin(a) * len,
          cx + Math.cos(a) * len,
          cy + Math.sin(a) * len
        );
        const colors = layer.gradient.colors || ['#ffffff', '#888888'];
        colors.forEach((col, i) => g.addColorStop(colors.length === 1 ? 0 : i / (colors.length - 1), col));
        return g;
      })()
    : layer.color || '#ffffff';

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = fill;
  ctx.strokeStyle = layer.color || '#ffffff';

  for (const line of lines) {
    let x = pad;
    const lw = ctx.measureText(line || ' ').width;
    if (layer.align === 'center') x = (m.w - lw) / 2;
    else if (layer.align === 'right') x = m.w - pad - lw;
    x += originX;
    const yy = originY + y + size * 0.86;
    if (layer.curve && Math.abs(layer.curve) > 1) {
      drawCurvedLine(ctx, line, x, yy, lw, layer.curve, layer.fontSize);
    } else {
      if (layer.textStroke?.width > 0) {
        ctx.lineWidth = layer.textStroke.width;
        ctx.strokeStyle = layer.textStroke.color;
        ctx.lineJoin = 'round';
        ctx.strokeText(line, x, yy);
      }
      ctx.fillText(line, x, yy);
    }
    y += lineHeight;
  }
  void totalH;
}

function drawCurvedLine(ctx, text, x, y, width, curve, fontSize) {
  const chars = [...text];
  if (!chars.length) return;
  const cx = x + width / 2;
  const r = Math.max(60, Math.abs(curve) * 4);
  const dir = Math.sign(curve) || 1;
  const total = chars.length;
  const per = ctx.measureText(text).width / total;
  const arc = (width / r) * dir;
  let a = -arc / 2;
  ctx.save();
  ctx.translate(cx, y + (curve > 0 ? -r * 0.12 : r * 0.12));
  for (const ch of chars) {
    const step = (per / r) * dir;
    const ang = a + step / 2;
    ctx.save();
    ctx.rotate(ang);
    ctx.fillText(ch, -per / 2, dir > 0 ? -r * 0.02 : r * 0.02);
    ctx.restore();
    a += step;
  }
  ctx.restore();
  void fontSize;
}

export function renderTextCanvas(layer, rasterScale = 1) {
  const m = measureTextLayer(layer);
  const canvas = createCanvas(m.w * rasterScale, m.h * rasterScale);
  const ctx = canvas.getContext('2d');
  if (rasterScale !== 1) ctx.scale(rasterScale, rasterScale);
  setFont(ctx, layer);
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${layer.letterSpacing || 0}px`;
  paintText(ctx, { ...layer, h: m.h }, m, 0, 0);
  return { canvas, w: m.w, h: m.h, rasterScale };
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(Math.max(0, r), Math.min(w, h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function starPath(ctx, cx, cy, outer, inner, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i * Math.PI) / points - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function heartPath(ctx, w, h) {
  ctx.beginPath();
  ctx.moveTo(w / 2, h * 0.94);
  ctx.bezierCurveTo(w * 0.1, h * 0.62, w * 0.02, h * 0.2, w * 0.26, h * 0.08);
  ctx.bezierCurveTo(w * 0.4, h * 0.01, w * 0.5, h * 0.14, w / 2, h * 0.22);
  ctx.bezierCurveTo(w * 0.5, h * 0.14, w * 0.6, h * 0.01, w * 0.74, h * 0.08);
  ctx.bezierCurveTo(w * 0.98, h * 0.2, w * 0.9, h * 0.62, w / 2, h * 0.94);
  ctx.closePath();
}

function burstPath(ctx, w, h, spikes = 14) {
  const cx = w / 2;
  const cy = h / 2;
  const outer = Math.min(w, h) / 2;
  const inner = outer * 0.68;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i * Math.PI) / spikes - Math.PI / 2;
    const x = cx + Math.cos(a) * r * (w / Math.min(w, h));
    const y = cy + Math.sin(a) * r * (h / Math.min(w, h));
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function bubblePath(ctx, w, h) {
  const r = Math.min(w, h) * 0.22;
  const bodyH = h * 0.78;
  roundRectPath(ctx, 0, 0, w, bodyH, r);
  ctx.moveTo(w * 0.22, bodyH - 1);
  ctx.lineTo(w * 0.18, h);
  ctx.lineTo(w * 0.42, bodyH - 1);
}

function arrowPath(ctx, w, h) {
  const headW = Math.min(w * 0.42, h * 1.1);
  const bodyH = h * 0.42;
  const y0 = (h - bodyH) / 2;
  ctx.beginPath();
  ctx.moveTo(0, y0 + bodyH * 0.18);
  ctx.lineTo(w - headW, y0 + bodyH * 0.18);
  ctx.lineTo(w - headW, y0 - bodyH * 0.32);
  ctx.lineTo(w, h / 2);
  ctx.lineTo(w - headW, y0 + bodyH * 1.32);
  ctx.lineTo(w - headW, y0 + bodyH * 0.82);
  ctx.lineTo(0, y0 + bodyH * 0.82);
  ctx.closePath();
}

/** Render a shape (or non-text vector) layer into a canvas of its own size. */
export function renderShapeCanvas(layer, scale = 1) {
  const w = Math.max(1, Math.round(layer.w));
  const h = Math.max(1, Math.round(layer.h));
  const canvas = createCanvas(w * scale, h * scale);
  const ctx = canvas.getContext('2d');
  if (scale !== 1) ctx.scale(scale, scale);
  const fill = layer.fillColor || layer.fill || '#ffffff';
  const stroke = layer.stroke || null;
  const sw = layer.strokeWidth || 0;

  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke || fill;
  ctx.lineWidth = sw || 0;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const paint = () => {
    if (sw > 0) ctx.stroke();
    if (layer.fill !== false) ctx.fill();
  };

  switch (layer.shape) {
    case 'rect':
      roundRectPath(ctx, sw / 2, sw / 2, w - sw, h - sw, layer.radius || 0);
      paint();
      break;
    case 'ellipse':
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2, Math.max(1, w / 2 - sw / 2), Math.max(1, h / 2 - sw / 2), 0, 0, Math.PI * 2);
      paint();
      break;
    case 'triangle':
      ctx.beginPath();
      ctx.moveTo(w / 2, sw);
      ctx.lineTo(w - sw, h - sw);
      ctx.lineTo(sw, h - sw);
      ctx.closePath();
      paint();
      break;
    case 'star':
      starPath(ctx, w / 2, h / 2, Math.min(w, h) / 2 - sw / 2, Math.min(w, h) / 4, layer.points || 5);
      paint();
      break;
    case 'burst':
      burstPath(ctx, w, h);
      paint();
      break;
    case 'heart':
      ctx.save();
      ctx.translate(sw / 2, sw / 2);
      heartPath(ctx, w - sw, h - sw);
      paint();
      ctx.restore();
      break;
    case 'polygon': {
      const n = layer.points || 6;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        const x = w / 2 + Math.cos(a) * (w / 2 - sw / 2);
        const y = h / 2 + Math.sin(a) * (h / 2 - sw / 2);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      paint();
      break;
    }
    case 'line':
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.lineWidth = Math.max(2, layer.strokeWidth || h);
      ctx.strokeStyle = fill;
      ctx.stroke();
      break;
    case 'arrow':
      arrowPath(ctx, w, h);
      paint();
      break;
    case 'bubble':
      bubblePath(ctx, w, h);
      paint();
      break;
    case 'sparkle': {
      ctx.beginPath();
      const cx = w / 2;
      const cy = h / 2;
      const pts = 4;
      for (let i = 0; i < pts * 2; i++) {
        const r = i % 2 === 0 ? Math.min(w, h) / 2 : Math.min(w, h) / 8;
        const a = (i * Math.PI) / pts;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'frame':
      roundRectPath(ctx, sw / 2, sw / 2, w - sw, h - sw, layer.radius || 0);
      ctx.lineWidth = sw || 8;
      ctx.strokeStyle = fill;
      ctx.stroke();
      break;
    case 'progress': {
      roundRectPath(ctx, 0, h * 0.15, w, h * 0.7, h * 0.35);
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.fill();
      roundRectPath(ctx, 0, h * 0.15, w * (layer.progress ?? 0.65), h * 0.7, h * 0.35);
      ctx.fillStyle = fill;
      ctx.fill();
      break;
    }
    case 'brushUnderline': {
      ctx.strokeStyle = fill;
      ctx.lineWidth = Math.max(3, h * 0.55);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(w * 0.02, h * 0.55);
      ctx.bezierCurveTo(w * 0.3, h * 0.05, w * 0.55, h * 0.95, w * 0.99, h * 0.4);
      ctx.stroke();
      break;
    }
    case 'circleCrop': {
      ctx.save();
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
      ctx.restore();
      break;
    }
    default:
      roundRectPath(ctx, 0, 0, w, h, layer.radius || 0);
      paint();
  }

  // optional label centered in the shape (badge / countdown / bubble)
  if (layer.label) {
    const fs = Math.max(10, Math.min(h * 0.5, w * 0.34));
    ctx.font = `800 ${fs}px ${fontCss('poppins')}`;
    ctx.fillStyle = layer.labelColor || '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const innerY = layer.shape === 'bubble' ? h * 0.39 : h / 2;
    ctx.fillText(layer.label, w / 2, innerY);
  }
  return canvas;
}

export function renderEmojiCanvas(layer, scale = 1) {
  const w = Math.max(1, Math.round(layer.w));
  const h = Math.max(1, Math.round(layer.h));
  const canvas = createCanvas(w * scale, h * scale);
  const ctx = canvas.getContext('2d');
  if (scale !== 1) ctx.scale(scale, scale);
  const size = Math.min(w, h) * 0.94;
  ctx.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(layer.emoji || '🔥', w / 2, h / 2 + size * 0.04);
  return canvas;
}

export function renderBrushCanvas(layer, scale = 1) {
  const w = Math.max(1, Math.round(layer.baseW || layer.w));
  const h = Math.max(1, Math.round(layer.baseH || layer.h));
  const canvas = createCanvas(w * scale, h * scale);
  const ctx = canvas.getContext('2d');
  if (scale !== 1) ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const stroke of layer.strokes || []) {
    if (stroke.points.length === 0) continue;
    ctx.globalCompositeOperation = stroke.erase ? 'destination-out' : 'source-over';
    ctx.globalAlpha = (stroke.opacity ?? 100) / 100;
    ctx.strokeStyle = stroke.color || '#ffffff';
    ctx.fillStyle = stroke.color || '#ffffff';
    ctx.lineWidth = stroke.size || 8;
    if (stroke.points.length === 1) {
      ctx.beginPath();
      ctx.arc(stroke.points[0].x, stroke.points[0].y, (stroke.size || 8) / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length - 1; i++) {
      const p = stroke.points[i];
      const n = stroke.points[i + 1];
      ctx.quadraticCurveTo(p.x, p.y, (p.x + n.x) / 2, (p.y + n.y) / 2);
    }
    const last = stroke.points[stroke.points.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  return canvas;
}

export function getImageCanvas(layer) {
  const key = `${layer.id}:${layer.srcVersion || 0}`;
  let entry = imageCache.get(key);
  if (entry && entry.src === layer.src) return entry;
  const img = new Image();
  img.src = layer.src;
  entry = { img, src: layer.src, ready: false };
  if (img.complete && img.naturalWidth) entry.ready = true;
  else
    img.onload = () => {
      entry.ready = true;
      layerCache.clear();
      if (typeof entry.onReady === 'function') entry.onReady();
      window.dispatchEvent(new CustomEvent('ds:image-loaded', { detail: layer.id }));
    };
  cacheSet(imageCache, key, entry);
  return entry;
}

function processedImageCanvas(layer) {
  const entry = getImageCanvas(layer);
  if (!entry.ready) return null;
  const needsAdj = hasAdjustments(layer.adj);
  if (!needsAdj) return entry.img;
  const key = `adj:${layer.id}:${entry.src.slice(0, 64)}:${adjKey(layer.adj)}`;
  const cached = layerCache.get(key);
  if (cached) return cached;
  const maxSide = 2600;
  const scale = Math.min(1, maxSide / Math.max(entry.img.naturalWidth, entry.img.naturalHeight));
  const c = createCanvas(entry.img.naturalWidth * scale, entry.img.naturalHeight * scale);
  const cx = c.getContext('2d');
  cx.drawImage(entry.img, 0, 0, c.width, c.height);
  applyAdjustments(c, layer.adj);
  cacheSet(layerCache, key, c);
  return c;
}

/** Canvas for any layer type, at its native layer size. */
export function getLayerCanvas(layer, rasterScale = 1) {
  const key = `layer:${layer.id}:rs${rasterScale}:${layer.srcVersion || 0}:${layer.text}:${layer.fontId}:${layer.fontSize}:${layer.weight}:${layer.letterSpacing}:${layer.lineHeight}:${layer.align}:${layer.color}:${layer.uppercase}:${layer.curve}:${JSON.stringify(layer.gradient || null)}:${layer.shape}:${layer.w}:${layer.h}:${layer.fill}:${layer.stroke}:${layer.strokeWidth}:${layer.radius}:${layer.label}:${(layer.strokes || []).length}`;
  const cached = layerCache.get(key);
  if (cached) return cached;

  let canvas = null;
  if (layer.type === 'image') {
    canvas = processedImageCanvas(layer);
    if (!canvas) return null;
  } else if (layer.type === 'text') {
    canvas = renderTextCanvas(layer, rasterScale).canvas;
  } else if (layer.type === 'emoji') {
    canvas = renderEmojiCanvas(layer, rasterScale);
  } else if (layer.type === 'brush') {
    canvas = renderBrushCanvas(layer, rasterScale);
  } else {
    canvas = renderShapeCanvas(layer, rasterScale);
  }
  cacheSet(layerCache, key, canvas);
  return canvas;
}

export function drawLayer(ctx, layer, doc, opts = {}) {
  if (!layer.visible) return;
  if (opts.skipId && opts.skipId === layer.id) return;
  // `scale` = document pixel -> canvas pixel (zoom × device pixel ratio)
  const s = opts.scale || opts.rasterScale || 1;
  const canvas = getLayerCanvas(layer, s);
  if (!canvas) return;

  const w = layer.w * s;
  const h = layer.h * s;

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, (layer.opacity ?? 100) / 100));
  ctx.globalCompositeOperation = layer.blend && layer.blend !== 'normal' ? layer.blend : 'source-over';

  const cx = (layer.x + layer.w / 2) * s;
  const cy = (layer.y + layer.h / 2) * s;
  ctx.translate(cx, cy);
  if (layer.rotation) ctx.rotate((layer.rotation * Math.PI) / 180);
  ctx.scale(layer.scaleX ?? 1, layer.scaleY ?? 1);
  ctx.translate(-w / 2, -h / 2);

  const hasFx =
    layer.effects &&
    (layer.effects.shadow?.on || layer.effects.glow?.on || layer.effects.stroke?.on);

  if (hasFx) {
    drawWithEffects(ctx, canvas, layer.effects, 0, 0, w, h, s);
  } else if (layer.effects?.radius?.on && layer.type !== 'text') {
    const r = Math.min(layer.effects.radius.radius * s, w / 2, h / 2);
    ctx.save();
    roundRectPath(ctx, 0, 0, w, h, r);
    ctx.clip();
    ctx.drawImage(canvas, 0, 0, w, h);
    ctx.restore();
  } else if (layer.mask === 'circle') {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(canvas, 0, 0, w, h);
    ctx.restore();
  } else {
    ctx.drawImage(canvas, 0, 0, w, h);
  }
  ctx.restore();
  void doc;
}

export function paintBackground(ctx, doc, w = doc.w, h = doc.h) {
  const bg = doc.background;
  if (!bg || bg === 'transparent') return;
  if (typeof bg === 'string') {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    return;
  }
  const colors = bg.colors && bg.colors.length ? bg.colors : ['#111111'];
  const kind = bg.kind || 'solid';
  if (kind === 'linear' || kind === 'radial') {
    const a = (((bg.angle ?? 135) - 90) * Math.PI) / 180;
    let g;
    if (kind === 'radial') {
      g = ctx.createRadialGradient(w * 0.5, h * 0.42, Math.min(w, h) * 0.06, w * 0.5, h * 0.5, Math.max(w, h) * 0.78);
    } else {
      const len = Math.max(w, h);
      g = ctx.createLinearGradient(
        w / 2 - Math.cos(a) * len * 0.6,
        h / 2 - Math.sin(a) * len * 0.6,
        w / 2 + Math.cos(a) * len * 0.6,
        h / 2 + Math.sin(a) * len * 0.6
      );
    }
    colors.forEach((c, i) => g.addColorStop(colors.length === 1 ? 0 : i / (colors.length - 1), c));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    return;
  }
  // patterns: base fill + decoration
  ctx.fillStyle = colors[0];
  ctx.fillRect(0, 0, w, h);
  const glow = bg.glow || colors[1] || '#3b82f6';
  const pat = bg.pattern || 'grid';
  if (pat === 'grid') {
    const cell = Math.max(28, Math.round(Math.min(w, h) / 16));
    ctx.strokeStyle = glow;
    ctx.globalAlpha = 0.22;
    ctx.lineWidth = Math.max(1, cell / 26);
    for (let x = 0; x <= w; x += cell) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += cell) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (pat === 'dots') {
    const cell = Math.max(16, Math.round(Math.min(w, h) / 30));
    ctx.fillStyle = glow;
    ctx.globalAlpha = 0.3;
    for (let y = cell; y < h; y += cell) {
      for (let x = cell; x < w; x += cell) {
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1, cell / 9), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  } else if (pat === 'stripes') {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate((-28 * Math.PI) / 180);
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = glow;
    const band = Math.max(24, Math.min(w, h) / 12);
    for (let x = -w; x < w; x += band * 2.4) ctx.fillRect(x, -h, band, h * 2);
    ctx.restore();
    ctx.globalAlpha = 1;
  } else if (pat === 'carbon') {
    const cell = Math.max(8, Math.round(Math.min(w, h) / 90));
    ctx.fillStyle = '#1b1d24';
    for (let y = 0; y < h; y += cell) {
      for (let x = 0; x < w; x += cell) {
        if ((x / cell + y / cell) % 2 === 0) ctx.fillRect(x, y, cell, cell);
      }
    }
  } else if (pat === 'blobs') {
    const blobs = [
      ['#ff2d95', 0.24, 0.28, 0.42],
      ['#5b8cff', 0.78, 0.24, 0.38],
      ['#12d8ff', 0.34, 0.8, 0.36],
      ['#b06cff', 0.82, 0.78, 0.4],
    ];
    ctx.globalCompositeOperation = 'lighter';
    for (const [col, cx, cy, r] of blobs) {
      const g = ctx.createRadialGradient(w * cx, h * cy, 0, w * cx, h * cy, Math.max(w, h) * r);
      g.addColorStop(0, col);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.globalAlpha = 0.55;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}

/**
 * Paint the whole document into `canvas`.
 * `opts.scale` maps document pixels -> canvas pixels (zoom × device pixel
 * ratio), so a 1280×720 design shown at 81% on a 2× screen renders into a
 * 2074×1166 bitmap and stays crisp.
 */
export function renderDocument(canvas, doc, opts = {}) {
  const scale = opts.scale || 1;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // background is cheap to draw at device resolution
  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  paintBackground(ctx, doc, doc.w, doc.h);
  ctx.restore();
  for (const layer of doc.layers) {
    drawLayer(ctx, layer, doc, { ...opts, scale });
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return canvas;
}

// ---------------------------------------------------------------- export
export function exportCanvas(doc, { scale = 1, format = 'png', quality = 0.92, transparent = false, withEffects = true } = {}) {
  // exact integer target so every social size is pixel perfect
  const c = createCanvas(Math.round(doc.w * scale), Math.round(doc.h * scale));
  const ctx = c.getContext('2d');
  const hasBg = !transparent && doc.background && doc.background !== 'transparent';
  if (hasBg) paintBackground(ctx, doc, c.width, c.height);
  // every layer is authored in doc pixels; draw natively at output resolution
  const s = c.width / doc.w;
  for (const layer of doc.layers) {
    drawLayer(ctx, layer, doc, { scale: s, withEffects });
  }
  return c;
}

/** Re-lay a design into a different aspect ratio (used by "export all sizes"). */
export function refitDoc(doc, w, h) {
  const sx = w / doc.w;
  const sy = h / doc.h;
  const s = Math.min(sx, sy);
  const dx = (w - doc.w * s) / 2;
  const dy = (h - doc.h * s) / 2;
  return {
    ...doc,
    w,
    h,
    layers: doc.layers.map((l) => ({
      ...l,
      x: dx + l.x * s,
      y: dy + l.y * s,
      w: l.w * s,
      h: l.h * s,
      fontSize: l.fontSize ? round(l.fontSize * s, 2) : l.fontSize,
      strokes: l.strokes
        ? l.strokes.map((st) => ({
            ...st,
            size: st.size * s,
            points: st.points.map((p) => ({ x: p.x * s + dx, y: p.y * s + dy })),
          }))
        : undefined,
    })),
  };
}

export function canvasToBlob(canvas, format = 'png', quality = 0.92) {
  return new Promise((resolve) => {
    const mime = format === 'jpg' || format === 'jpeg' ? 'image/jpeg' : 'image/png';
    if (format === 'webp') {
      canvas.toBlob((b) => resolve(b), 'image/webp', quality);
      return;
    }
    canvas.toBlob((b) => resolve(b), mime, quality);
  });
}

export function canvasToDataUrl(canvas, format = 'png', quality = 0.92) {
  if (format === 'jpg' || format === 'jpeg') return canvas.toDataURL('image/jpeg', quality);
  if (format === 'webp') return canvas.toDataURL('image/webp', quality);
  return canvas.toDataURL('image/png');
}

/** Small preview thumbnail (data URL) for templates & recents. */
export function makeThumbnail(doc, maxW = 480) {
  const scale = Math.min(1, maxW / doc.w);
  const c = exportCanvas(doc, { scale });
  return canvasToDataUrl(c, 'jpg', 0.8);
}

export { hexToRgba, roundRectPath };
