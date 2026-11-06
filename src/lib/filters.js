// Pixel & layer-effect engine. Pure canvas 2D, no dependencies.
import { createCanvas } from './geometry.js';

export const ADJ_DEFAULTS = {
  brightness: 0, // -100..100
  contrast: 0, // -100..100
  saturation: 0, // -100..100
  hue: 0, // -180..180
  temperature: 0, // -100..100 (blue..orange)
  tint: 0, // -100..100 (green..magenta)
  exposure: 0, // -100..100
  highlights: 0,
  shadows: 0,
  vibrance: 0,
  grayscale: 0, // 0..100
  sepia: 0, // 0..100
  invert: 0, // 0..100
  blur: 0, // px 0..100
  sharpen: 0, // 0..100
  noise: 0, // 0..100
  pixelate: 1, // pixel size 1..80
  posterize: 0, // 0 = off, 2..32 levels
  vignette: 0, // 0..100
  duotone: 0, // 0..100
  duotoneA: '#1b2a6b',
  duotoneB: '#ffd166',
  threshold: 0, // 0..100 (0 off)
};

export const FILTER_PRESETS = [
  { id: 'none', adj: {} },
  { id: 'punch', adj: { contrast: 18, saturation: 16, vibrance: 12, sharpen: 18 } },
  { id: 'cinematic', adj: { contrast: 14, temperature: -12, saturation: -8, shadows: 18, vignette: 22 } },
  { id: 'vivid', adj: { saturation: 34, vibrance: 22, brightness: 4, contrast: 8 } },
  { id: 'warm', adj: { temperature: 26, tint: 8, brightness: 5, saturation: 8 } },
  { id: 'cold', adj: { temperature: -30, tint: -6, contrast: 10, saturation: -4 } },
  { id: 'mono', adj: { grayscale: 100, contrast: 16, brightness: 3 } },
  { id: 'noir', adj: { grayscale: 100, contrast: 34, brightness: -8, vignette: 30, noise: 12 } },
  { id: 'retro', adj: { sepia: 32, contrast: 10, saturation: -12, noise: 10, vignette: 18 } },
  { id: 'dream', adj: { blur: 1.6, brightness: 8, saturation: 10, shadows: 12 } },
  { id: 'pixel', adj: { pixelate: 6, contrast: 12, saturation: 18 } },
  { id: 'duotone', adj: { duotone: 100, duotoneA: '#1f1b4d', duotoneB: '#ff7a59', contrast: 10 } },
  { id: 'pop', adj: { posterize: 6, saturation: 28, contrast: 12 } },
  { id: 'cyber', adj: { duotone: 62, duotoneA: '#0b1030', duotoneB: '#00e5ff', contrast: 16, saturation: 22 } },
];

export const EFFECT_DEFAULTS = {
  shadow: { on: false, x: 0, y: 8, blur: 24, color: '#000000', opacity: 55 },
  glow: { on: false, blur: 20, color: '#4c8dff', opacity: 70, spread: 4 },
  stroke: { on: false, width: 4, color: '#ffffff', opacity: 100, inside: false },
  radius: { on: false, radius: 24 },
};

export function hasAdjustments(adj) {
  if (!adj) return false;
  return Object.keys(ADJ_DEFAULTS).some((k) => {
    const v = adj[k];
    if (v == null) return false;
    if (typeof v === 'string') {
      if (k === 'duotoneA') return (adj.duotone || 0) > 0 && v !== ADJ_DEFAULTS.duotoneA;
      if (k === 'duotoneB') return (adj.duotone || 0) > 0 && v !== ADJ_DEFAULTS.duotoneB;
      return false;
    }
    return Math.abs(v - ADJ_DEFAULTS[k]) > 0.0001;
  });
}

function hexToRgb(hex) {
  const h = (hex || '#000000').replace('#', '');
  const s = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(s.slice(0, 6), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function hexToRgba(hex, alpha = 1) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
}

/** Fast 3-pass box blur on an ImageData-like {data,width,height}. */
export function boxBlur(data, w, h, radius) {
  const r = Math.max(1, Math.round(radius));
  const tmp = new Uint8ClampedArray(data.length);
  const passes = 3;
  const div = 2 * r + 1;
  for (let p = 0; p < passes; p++) {
    // horizontal
    for (let y = 0; y < h; y++) {
      const row = y * w * 4;
      let accR = 0, accG = 0, accB = 0, accA = 0;
      for (let x = -r; x <= r; x++) {
        const xi = Math.min(w - 1, Math.max(0, x));
        const i = row + xi * 4;
        accR += data[i]; accG += data[i + 1]; accB += data[i + 2]; accA += data[i + 3];
      }
      for (let x = 0; x < w; x++) {
        const o = row + x * 4;
        tmp[o] = accR / div; tmp[o + 1] = accG / div; tmp[o + 2] = accB / div; tmp[o + 3] = accA / div;
        const outX = Math.min(w - 1, Math.max(0, x - r));
        const inX = Math.min(w - 1, Math.max(0, x + r + 1));
        const oi = row + outX * 4;
        const ii = row + inX * 4;
        accR += data[ii] - data[oi];
        accG += data[ii + 1] - data[oi + 1];
        accB += data[ii + 2] - data[oi + 2];
        accA += data[ii + 3] - data[oi + 3];
      }
    }
    // vertical
    for (let x = 0; x < w; x++) {
      let accR = 0, accG = 0, accB = 0, accA = 0;
      for (let y = -r; y <= r; y++) {
        const yi = Math.min(h - 1, Math.max(0, y));
        const i = (yi * w + x) * 4;
        accR += tmp[i]; accG += tmp[i + 1]; accB += tmp[i + 2]; accA += tmp[i + 3];
      }
      for (let y = 0; y < h; y++) {
        const o = (y * w + x) * 4;
        data[o] = accR / div; data[o + 1] = accG / div; data[o + 2] = accB / div; data[o + 3] = accA / div;
        const outY = Math.min(h - 1, Math.max(0, y - r));
        const inY = Math.min(h - 1, Math.max(0, y + r + 1));
        const oi = (outY * w + x) * 4;
        const ii = (inY * w + x) * 4;
        accR += tmp[ii] - tmp[oi];
        accG += tmp[ii + 1] - tmp[oi + 1];
        accB += tmp[ii + 2] - tmp[oi + 2];
        accA += tmp[ii + 3] - tmp[oi + 3];
      }
    }
  }
}

export function sharpnessPass(data, w, h, amount) {
  const a = amount / 100;
  if (a <= 0) return;
  const src = new Uint8ClampedArray(data);
  const k = [0, -a, 0, -a, 1 + 4 * a, -a, 0, -a, 0];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        let ki = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            sum += src[i + (dy * w + dx) * 4 + c] * k[ki++];
          }
        }
        data[i + c] = sum;
      }
    }
  }
}

export function pixelatePass(data, w, h, size) {
  const s = Math.max(2, Math.round(size));
  for (let y = 0; y < h; y += s) {
    for (let x = 0; x < w; x += s) {
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let yy = y; yy < Math.min(h, y + s); yy++) {
        for (let xx = x; xx < Math.min(w, x + s); xx++) {
          const i = (yy * w + xx) * 4;
          r += data[i]; g += data[i + 1]; b += data[i + 2]; a += data[i + 3]; n++;
        }
      }
      r /= n; g /= n; b /= n; a /= n;
      for (let yy = y; yy < Math.min(h, y + s); yy++) {
        for (let xx = x; xx < Math.min(w, x + s); xx++) {
          const i = (yy * w + xx) * 4;
          data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = a;
        }
      }
    }
  }
}

/** Apply a full adjustment stack to a canvas in place. */
export function applyAdjustments(canvas, adjIn) {
  const adj = { ...ADJ_DEFAULTS, ...(adjIn || {}) };
  const w = canvas.width;
  const h = canvas.height;
  if (!w || !h) return canvas;
  const ctx = canvas.getContext('2d');
  const needsSpatial = adj.blur > 0 || adj.sharpen > 0 || adj.pixelate > 1;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;

  const bright = adj.brightness * 2.4;
  const contrast = (adj.contrast / 100) * 1.4;
  const cf = (1 + contrast) ** 2 / (1 + Math.abs(contrast) * 0.6);
  const sat = 1 + adj.saturation / 100;
  const hueRad = (adj.hue / 180) * Math.PI;
  const cosH = Math.cos(hueRad);
  const sinH = Math.sin(hueRad);
  const tempR = adj.temperature * 0.6;
  const tempB = -adj.temperature * 0.6;
  const tintG = -adj.tint * 0.5;
  const tintRB = adj.tint * 0.25;
  const expo = 1 + adj.exposure / 160;
  const gray = adj.grayscale / 100;
  const sep = adj.sepia / 100;
  const inv = adj.invert / 100;
  const hi = adj.highlights / 100;
  const sh = adj.shadows / 100;
  const vib = adj.vibrance / 100;
  const thr = adj.threshold;
  const post = Math.round(adj.posterize);
  const duoT = adj.duotone / 100;
  const dA = hexToRgb(adj.duotoneA);
  const dB = hexToRgb(adj.duotoneB);
  const noise = adj.noise / 100;
  const vig = adj.vignette / 100;
  const cx = w / 2;
  const cy = h / 2;
  const maxD = Math.hypot(cx, cy) || 1;

  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    let r = d[i];
    let g = d[i + 1];
    let b = d[i + 2];

    // exposure & brightness
    if (expo !== 1) {
      r *= expo; g *= expo; b *= expo;
    }
    r += bright; g += bright; b += bright;

    // temperature / tint
    if (adj.temperature) { r += tempR; g += tempR * 0.2; b += tempB; }
    if (adj.tint) { r += tintRB; g += tintG; b += tintRB; }

    // contrast
    r = (r - 128) * cf + 128;
    g = (g - 128) * cf + 128;
    b = (b - 128) * cf + 128;

    // highlights / shadows
    if (hi || sh) {
      const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      if (hi) {
        const k = Math.max(0, luma - 0.5) * 2 * hi * 80;
        r += k; g += k; b += k;
      }
      if (sh) {
        const k = Math.max(0, 0.5 - luma) * 2 * sh * 90;
        r += k; g += k; b += k;
      }
    }

    // saturation & vibrance
    if (sat !== 1 || vib) {
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const s2 = sat + (vib ? vib * (1 - Math.abs(luma - 128) / 128) * 0.55 : 0);
      r = luma + (r - luma) * s2;
      g = luma + (g - luma) * s2;
      b = luma + (b - luma) * s2;
    }

    // hue rotate (YIQ matrix)
    if (adj.hue) {
      const y = 0.299 * r + 0.587 * g + 0.114 * b;
      const i2 = 0.596 * r - 0.274 * g - 0.322 * b;
      const q = 0.211 * r - 0.523 * g + 0.312 * b;
      const i3 = i2 * cosH - q * sinH;
      const q3 = i2 * sinH + q * cosH;
      r = y + 0.956 * i3 + 0.621 * q3;
      g = y - 0.272 * i3 - 0.647 * q3;
      b = y - 1.106 * i3 + 1.703 * q3;
    }

    // grayscale / sepia
    if (gray) {
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r += (luma - r) * gray;
      g += (luma - g) * gray;
      b += (luma - b) * gray;
    }
    if (sep) {
      const sr = 0.393 * r + 0.769 * g + 0.189 * b;
      const sg = 0.349 * r + 0.686 * g + 0.168 * b;
      const sb = 0.272 * r + 0.534 * g + 0.131 * b;
      r += (sr - r) * sep;
      g += (sg - g) * sep;
      b += (sb - b) * sep;
    }

    // threshold
    if (thr > 0) {
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const v = luma > thr * 2.55 ? 255 : 0;
      r = v; g = v; b = v;
    }

    // posterize
    if (post >= 2) {
      const step = 255 / (post - 1);
      r = Math.round(r / step) * step;
      g = Math.round(g / step) * step;
      b = Math.round(b / step) * step;
    }

    // duotone mapping (luma -> gradient A..B)
    if (duoT > 0) {
      let l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      l = Math.max(0, Math.min(1, l));
      const dr = dA.r + (dB.r - dA.r) * l;
      const dg = dA.g + (dB.g - dA.g) * l;
      const db = dA.b + (dB.b - dA.b) * l;
      r += (dr - r) * duoT;
      g += (dg - g) * duoT;
      b += (db - b) * duoT;
    }

    // invert (lerp toward the negative)
    if (inv) {
      r += (255 - 2 * r) * inv;
      g += (255 - 2 * g) * inv;
      b += (255 - 2 * b) * inv;
    }

    if (noise) {
      const n = (Math.random() - 0.5) * 255 * noise;
      r += n; g += n; b += n;
    }

    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }

  // vignette
  if (vig) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (d[i + 3] === 0) continue;
        const dist = Math.hypot(x - cx, y - cy) / maxD;
        const k = Math.max(0, (dist - 0.45) / 0.55) ** 1.6 * vig * 0.9;
        d[i] *= 1 - k;
        d[i + 1] *= 1 - k;
        d[i + 2] *= 1 - k;
      }
    }
  }

  if (needsSpatial) {
    if (adj.pixelate > 1) pixelatePass(d, w, h, adj.pixelate);
    if (adj.blur > 0) boxBlur(d, w, h, adj.blur * (Math.min(w, h) / 1200 + 0.35));
    if (adj.sharpen > 0) sharpnessPass(d, w, h, adj.sharpen);
  }

  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Fill a canvas's opaque pixels with one colour (keeps the alpha channel). */
function silhouette(src, color) {
  const c = createCanvas(src.width, src.height);
  const x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

/**
 * Draw `src` with layer effects baked in.
 * Everything happens on one padded canvas so strokes/glows are never clipped.
 * Called with the layer's transform already applied (0,0 = layer top-left).
 */
export function drawWithEffects(ctx, src, effects, dx, dy, dw, dh, scale = 1) {
  const fx = effects || {};
  const s = scale;
  const w = Math.max(1, Math.round(dw));
  const h = Math.max(1, Math.round(dh));
  const strokeW = fx.stroke?.on ? Math.max(0, (fx.stroke.width || 0) * s) : 0;
  const shadowPad = fx.shadow?.on
    ? Math.ceil(((fx.shadow.blur || 0) * 1.6 + Math.hypot(fx.shadow.x || 0, fx.shadow.y || 0)) * s)
    : 0;
  const glowPad = fx.glow?.on ? Math.ceil(((fx.glow.blur || 0) * 2 + (fx.glow.spread || 0) * 2) * s) : 0;
  const pad = Math.ceil(Math.max(strokeW, shadowPad, glowPad)) + 2;

  const out = createCanvas(w + pad * 2, h + pad * 2);
  const octx = out.getContext('2d');

  // base silhouette of the content, in the padded space
  const base = createCanvas(out.width, out.height);
  const bctx = base.getContext('2d');
  bctx.drawImage(src, pad, pad, w, h);

  // ---- 1. stroke / outline (behind everything) -----------------------------
  if (strokeW > 0) {
    const strokeC = createCanvas(out.width, out.height);
    const sctx = strokeC.getContext('2d');
    // dilate the silhouette by stamping it around a circle
    const steps = Math.max(12, Math.min(72, Math.round(strokeW * 6)));
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      sctx.drawImage(base, Math.cos(a) * strokeW, Math.sin(a) * strokeW);
    }
    sctx.globalCompositeOperation = 'source-in';
    sctx.fillStyle = fx.stroke.color || '#ffffff';
    sctx.fillRect(0, 0, strokeC.width, strokeC.height);
    octx.globalAlpha = Math.max(0, Math.min(1, (fx.stroke.opacity ?? 100) / 100));
    octx.drawImage(strokeC, 0, 0);
    octx.globalAlpha = 1;
  }

  // ---- 2. drop shadow ------------------------------------------------------
  if (fx.shadow?.on) {
    const sh = createCanvas(out.width, out.height);
    const sctx = sh.getContext('2d');
    const blur = Math.max(0, (fx.shadow.blur || 0) * s);
    if (blur > 0 && 'filter' in sctx) sctx.filter = `blur(${blur / 2}px)`;
    sctx.drawImage(base, (fx.shadow.x || 0) * s, (fx.shadow.y || 0) * s);
    sctx.filter = 'none';
    sctx.globalCompositeOperation = 'source-in';
    sctx.fillStyle = fx.shadow.color || '#000000';
    sctx.fillRect(0, 0, sh.width, sh.height);
    octx.globalAlpha = Math.max(0, Math.min(1, (fx.shadow.opacity ?? 55) / 100));
    octx.drawImage(sh, 0, 0);
    octx.globalAlpha = 1;
  }

  // ---- 3. outer glow -------------------------------------------------------
  if (fx.glow?.on) {
    const glowColor = fx.glow.color || '#12d8ff';
    const blur = Math.max(0, (fx.glow.blur || 0) * s);
    const spread = Math.max(0, (fx.glow.spread || 0) * s);
    const glow = createCanvas(out.width, out.height);
    const gctx = glow.getContext('2d');
    if (spread > 0) {
      const steps = Math.max(10, Math.min(48, Math.round(spread * 5)));
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        gctx.drawImage(base, Math.cos(a) * spread, Math.sin(a) * spread);
      }
    } else {
      gctx.drawImage(base, 0, 0);
    }
    gctx.globalCompositeOperation = 'source-in';
    gctx.fillStyle = glowColor;
    gctx.fillRect(0, 0, glow.width, glow.height);
    // blur the glow silhouette twice for a soft neon halo
    if (blur > 0) {
      const blurred = createCanvas(glow.width, glow.height);
      const blctx = blurred.getContext('2d');
      if ('filter' in blctx) blctx.filter = `blur(${blur / 2}px)`;
      blctx.drawImage(glow, 0, 0);
      blctx.filter = 'none';
      const blurred2 = createCanvas(glow.width, glow.height);
      const b2 = blurred2.getContext('2d');
      if ('filter' in b2) b2.filter = `blur(${blur / 2}px)`;
      b2.drawImage(blurred, 0, 0);
      b2.filter = 'none';
      octx.globalAlpha = Math.max(0, Math.min(1, (fx.glow.opacity ?? 70) / 100));
      octx.drawImage(blurred2, 0, 0);
      octx.drawImage(blurred2, 0, 0);
    } else {
      octx.globalAlpha = Math.max(0, Math.min(1, (fx.glow.opacity ?? 70) / 100));
      octx.drawImage(glow, 0, 0);
    }
    octx.globalAlpha = 1;
  }

  // ---- 4. content ----------------------------------------------------------
  octx.drawImage(src, pad, pad, w, h);

  ctx.drawImage(out, dx - pad, dy - pad, out.width, out.height);
}

/** Icons for the UI are SVG; this helps export a canvas with a background. */
export function flattenToCanvas(layers, w, h, background = null) {
  const c = createCanvas(w, h);
  const ctx = c.getContext('2d');
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, w, h);
  }
  return c;
}
