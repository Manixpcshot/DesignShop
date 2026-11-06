// Tile previews for text styles. Rendered with the *real* canvas renderer so a
// tile looks exactly like the headline you get after clicking it (gradients,
// outlines, thick shadows, glows — CSS text-shadow can't reproduce those).
import React, { useEffect, useRef, useState } from 'react';
import { fontCss } from '../lib/presets.js';

// CSS-only fallback, used before the canvas frame paints (and by SSR tests).
export function styleToCss(style, { sample = 'Aa', size = 22 } = {}) {
  const fx = style.effects || {};
  const shadows = [];
  if (fx.shadow?.on) {
    const o = fx.shadow.opacity ?? 55;
    shadows.push(
      `${fx.shadow.x || 0}px ${fx.shadow.y || 0}px ${fx.shadow.blur || 0}px rgba(0,0,0,${(o / 100).toFixed(2)})`
    );
  }
  if (fx.glow?.on) {
    const c = fx.glow.color || '#12d8ff';
    const b = Math.max(4, (fx.glow.blur || 10) * 0.5);
    shadows.push(`0 0 ${b}px ${c}`, `0 0 ${b * 1.6}px ${c}`);
  }
  const stroke = fx.stroke?.on
    ? `${Math.max(1, Math.min(3, (fx.stroke.width || 3) / 2.4))}px ${fx.stroke.color || '#111'}`
    : null;
  const css = {
    fontFamily: fontCss(style.font),
    fontSize: `${size}px`,
    fontWeight: style.weight || 400,
    lineHeight: 1.05,
    color: style.fill?.color || '#fff',
    textShadow: shadows.join(', ') || 'none',
    WebkitTextStroke: stroke || '0 transparent',
    letterSpacing: '0.2px',
    textTransform: style.uppercase ? 'uppercase' : 'none',
  };
  if (style.fill?.gradient) {
    const g = style.fill.gradient;
    css.backgroundImage = `linear-gradient(${g.angle ?? 90}deg, ${g.colors.join(', ')})`;
    css.WebkitBackgroundClip = 'text';
    css.backgroundClip = 'text';
    css.color = 'transparent';
  }
  return css;
}

/** Paint one style into a canvas at exactly the tile's pixel size. */
function paintTile(canvas, style, sample, viewW, viewH) {
  const app = typeof window !== 'undefined' ? window.DesignShop : null;
  const render = app?.render;
  const docLib = app?.documentLib;
  const filters = app?.filters;
  if (!render || !docLib) return false;
  const probe = docLib.createTextLayer(
    { w: 1000, h: 1000 },
    { text: sample, styleId: style.id, x: 0, y: 0 }
  );
  const layer = { ...probe };
  const m = render.measureTextLayer(layer);
  const out = render.renderTextCanvas(layer, 2);
  // m.w/m.h include the effects padding — fit the glyphs, keep the padding visible
  const glyphW = Math.max(1, m.w - m.pad * 2);
  const glyphH = Math.max(1, out.h / 2 - m.pad * 2);
  const scale = Math.min((viewW * 0.8) / glyphW, (viewH * 0.78) / glyphH);
  const padW = m.pad * scale;
  const w = out.w * scale;
  const h = out.h * scale;
  const x = (viewW - w) / 2;
  const y = (viewH - h) / 2;
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.setTransform(canvas.width / viewW, 0, 0, canvas.height / viewH, 0, 0);
  const fx = layer.effects || {};
  const drawFx = filters?.drawWithEffects || render.drawWithEffects;
  if (drawFx && (fx.stroke?.on || fx.shadow?.on || fx.glow?.on)) {
    drawFx(ctx, out.canvas, fx, x + padW, y + padW, w - padW * 2, h - padW * 2, scale);
  } else {
    ctx.drawImage(out.canvas, x, y, w, h);
  }
  ctx.restore();
  return true;
}

/** Styles with a dark fill need a lighter tile or they vanish. */
function needsLightBackdrop(style) {
  const hex = style.fill?.color || '#ffffff';
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b < 96 && !style.fill?.gradient;
}

export function StyleTile({ style, name, active, onClick, sample = 'Aa', dark }) {
  const canvasRef = useRef(null);
  const boxRef = useRef(null);
  const [painted, setPainted] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const box = boxRef.current;
    if (!canvas || !box) return;
    let cancelled = false;
    const paint = () => {
      if (cancelled) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(80, Math.round(box.getBoundingClientRect().width) || 140);
      const h = Math.max(40, Math.round(box.getBoundingClientRect().height) || 46);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      try {
        if (paintTile(canvas, style, sample, w, h)) setPainted(true);
      } catch {
        /* keep the CSS fallback text in place */
      }
    };
    paint();
    document.fonts?.ready.then(() => setTimeout(paint, 30)).catch(() => {});
    window.addEventListener('ds:image-loaded', paint);
    return () => {
      cancelled = true;
      window.removeEventListener('ds:image-loaded', paint);
    };
  }, [style, sample]);

  return (
    <button
      className={`style-tile ${dark ? 'dark-tile' : ''} ${needsLightBackdrop(style) ? 'light-tile' : ''}`}
      onClick={onClick}
      title={name}
      style={{ borderColor: active ? 'var(--accent)' : undefined }}
    >
      <span className="tile-box" ref={boxRef}>
        <canvas ref={canvasRef} className="tile-canvas" aria-hidden="true" />
        <span
          className="tile-text"
          style={{ ...styleToCss(style, { sample, size: 19 }), opacity: painted ? 0 : 1 }}
        >
          {sample}
        </span>
      </span>
      <span className="tile-cap">{name}</span>
    </button>
  );
}

export { React };
