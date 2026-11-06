// Geometry helpers for DesignShop — pure functions, safe to unit test.

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const round = (v, p = 0) => {
  const f = 10 ** p;
  return Math.round(v * f) / f;
};

export function createCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

export function ctx2d(canvas, opts) {
  return canvas.getContext('2d', opts);
}

export const rad = (deg) => (deg * Math.PI) / 180;

export function layerCenter(layer) {
  return { x: layer.x + layer.w / 2, y: layer.y + layer.h / 2 };
}

/** Doc point -> layer local point (top-left of layer content box is 0,0). */
export function docToLocal(layer, px, py) {
  const cx = layer.x + layer.w / 2;
  const cy = layer.y + layer.h / 2;
  const dx = px - cx;
  const dy = py - cy;
  const a = rad(-(layer.rotation || 0));
  const rx = dx * Math.cos(a) - dy * Math.sin(a);
  const ry = dx * Math.sin(a) + dy * Math.cos(a);
  const sx = layer.scaleX ?? 1;
  const sy = layer.scaleY ?? 1;
  return { x: rx / sx + layer.w / 2, y: ry / sy + layer.h / 2 };
}

/** Layer local point -> doc point. */
export function localToDoc(layer, lx, ly) {
  const cx = layer.x + layer.w / 2;
  const cy = layer.y + layer.h / 2;
  const dx = (lx - layer.w / 2) * (layer.scaleX ?? 1);
  const dy = (ly - layer.h / 2) * (layer.scaleY ?? 1);
  const a = rad(layer.rotation || 0);
  return {
    x: cx + dx * Math.cos(a) - dy * Math.sin(a),
    y: cy + dx * Math.sin(a) + dy * Math.cos(a),
  };
}

export function layerCorners(layer) {
  return [
    localToDoc(layer, 0, 0),
    localToDoc(layer, layer.w, 0),
    localToDoc(layer, layer.w, layer.h),
    localToDoc(layer, 0, layer.h),
  ];
}

export function layerBBox(layer) {
  const pts = layerCorners(layer);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

export function pointInLayer(layer, px, py) {
  const p = docToLocal(layer, px, py);
  return p.x >= 0 && p.y >= 0 && p.x <= layer.w && p.y <= layer.h;
}

export function hitPolygon(points, px, py) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x;
    const yi = points[i].y;
    const xj = points[j].x;
    const yj = points[j].y;
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function rectsIntersect(a, b) {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

export function normalizeRect(a, b) {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
}

export function rotatePoint(px, py, cx, cy, deg) {
  const a = rad(deg);
  const dx = px - cx;
  const dy = py - cy;
  return {
    x: cx + dx * Math.cos(a) - dy * Math.sin(a),
    y: cy + dx * Math.sin(a) + dy * Math.cos(a),
  };
}

export function fitRect(sw, sh, dw, dh, padding = 0) {
  const scale = Math.min((dw - padding * 2) / sw, (dh - padding * 2) / sh);
  return { scale: Math.max(scale, 0.001), w: sw * scale, h: sh * scale };
}

export const uid = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
