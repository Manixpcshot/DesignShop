// Draws the DesignShop app icon into an RGBA raster and writes a PNG.
// Hand-rolled PNG encoder (zlib) so no native deps are required.
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';

export function drawIcon(size = 1024) {
  const px = new Float64Array(size * size * 4);
  const S = size;

  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

  // rounded-square mask with generous radius
  const radius = S * 0.235;
  const inRoundRect = (x, y) => {
    const dx = Math.max(radius - x, 0, x - (S - radius));
    const dy = Math.max(radius - y, 0, y - (S - radius));
    return Math.hypot(dx, dy) <= radius;
  };

  const cA = hex('#4C8DFF');
  const cB = hex('#12D8FF');
  const cP = hex('#B06CFF');

  const setPx = (x, y, r, g, b, a) => {
    const i = (y * S + x) * 4;
    const alpha = a / 255;
    px[i] = mix(px[i], r, alpha);
    px[i + 1] = mix(px[i + 1], g, alpha);
    px[i + 2] = mix(px[i + 2], b, alpha);
    px[i + 3] = Math.max(px[i + 3], a);
  };

  // background gradient (top-left blue -> cyan -> violet bottom-right)
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (!inRoundRect(x, y)) continue;
      const t = clamp01((x / S) * 0.62 + (y / S) * 0.38);
      let r, g, b;
      if (t < 0.55) {
        const k = t / 0.55;
        r = mix(cA[0], cB[0], k);
        g = mix(cA[1], cB[1], k);
        b = mix(cA[2], cB[2], k);
      } else {
        const k = (t - 0.55) / 0.45;
        r = mix(cB[0], cP[0], k);
        g = mix(cB[1], cP[1], k);
        b = mix(cB[2], cP[2], k);
      }
      // subtle top-left highlight
      const hl = clamp01(1 - Math.hypot(x / S - 0.18, y / S - 0.12) * 1.6) * 0.25;
      setPx(x, y, mix(r, 255, hl), mix(g, 255, hl), mix(b, 255, hl), 255);
    }
  }

  const ink = [8, 20, 38];

  // --- "D" glyph: vertical bar + rounded bowl
  const dX0 = S * 0.245;
  const dX1 = S * 0.35;
  const dY0 = S * 0.27;
  const dY1 = S * 0.73;
  for (let y = Math.floor(dY0); y < dY1; y++) {
    for (let x = Math.floor(dX0); x < dX1; x++) setPx(x, y, ink[0], ink[1], ink[2], 255);
  }
  const bowlCx = dX1 - S * 0.005;
  const bowlCy = S * 0.5;
  const bowlR = (dY1 - dY0) / 2;
  const bowlOuter = bowlR;
  const bowlInner = bowlR - (dX1 - dX0) * 1.02;
  for (let y = Math.floor(dY0); y <= dY1; y++) {
    for (let x = Math.floor(dX0); x <= bowlCx + bowlOuter; x++) {
      const d = Math.hypot(x - bowlCx, y - bowlCy);
      const inBowl = x >= bowlCx - bowlOuter - 1 && d <= bowlOuter && d >= bowlInner;
      const inRightFill = x >= bowlCx - 1 && x <= bowlCx + bowlOuter - bowlInner * 0.15 && Math.abs(y - bowlCy) <= bowlOuter * 0.98 && d <= bowlOuter;
      if (inBowl || inRightFill) setPx(x, y, ink[0], ink[1], ink[2], 255);
    }
  }
  // punch the counter (hole) of the D
  for (let y = Math.floor(bowlCy - bowlOuter + 2); y <= bowlCy + bowlOuter - 2; y++) {
    for (let x = Math.floor(bowlCx - bowlOuter - (dX1 - dX0) * 0.2); x <= bowlCx + bowlInner - 1; x++) {
      const d = Math.hypot(x - bowlCx, y - bowlCy);
      if (d < bowlInner - 1) {
        // re-draw background gradient here (transparent-ish hole shows the gradient)
        const t = clamp01((x / S) * 0.62 + (y / S) * 0.38);
        let r, g, b;
        if (t < 0.55) {
          const k = t / 0.55;
          r = mix(cA[0], cB[0], k);
          g = mix(cA[1], cB[1], k);
          b = mix(cA[2], cB[2], k);
        } else {
          const k = (t - 0.55) / 0.45;
          r = mix(cB[0], cP[0], k);
          g = mix(cB[1], cP[1], k);
          b = mix(cB[2], cP[2], k);
        }
        const i = (y * S + x) * 4;
        px[i] = r;
        px[i + 1] = g;
        px[i + 2] = b;
        px[i + 3] = 255;
      }
    }
  }

  // --- "S" glyph: two arcs drawn as thick bezier-ish bands
  const sCx = S * 0.68;
  const sCy = S * 0.5;
  const sR = S * 0.15;
  const thick = S * 0.052;
  const inArc = (x, y, cy, yMin, yMax) => {
    if (y < cy - sR - thick || y > cy + sR + thick) return false;
    const d = Math.hypot(x - sCx, y - cy);
    if (d > sR + thick / 2 || d < sR - thick / 2) return false;
    return y >= yMin && y <= yMax;
  };
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const topArc = inArc(x, y, sCy - sR * 0.52, sCy - sR * 1.6, sCy - sR * 0.1) && x <= sCx + sR;
      const bottomArc = inArc(x, y, sCy + sR * 0.52, sCy + sR * 0.1, sCy + sR * 1.6) && x >= sCx - sR;
      if (topArc || bottomArc) setPx(x, y, ink[0], ink[1], ink[2], 255);
    }
  }

  // --- sparkle accent (top-right) to signal "design"
  const sp = { x: S * 0.79, y: S * 0.24, r: S * 0.075 };
  for (let y = Math.floor(sp.y - sp.r * 3); y <= sp.y + sp.r * 3; y++) {
    for (let x = Math.floor(sp.x - sp.r * 3); x <= sp.x + sp.r * 3; x++) {
      if (x < 0 || y < 0 || x >= S || y >= S) continue;
      const dx = Math.abs(x - sp.x) / sp.r;
      const dy = Math.abs(y - sp.y) / sp.r;
      const diamond = dx + dy;
      const star = Math.abs(x - sp.x) < sp.r * 0.28 || Math.abs(y - sp.y) < sp.r * 0.28;
      if (diamond < 1 || (star && diamond < 2.1)) {
        const edge = clamp01(2.3 - diamond);
        setPx(x, y, 255, 255, 255, Math.round(255 * Math.min(1, edge * 1.6)));
      }
    }
  }

  return Buffer.from(Uint8Array.from(px.map((v) => Math.max(0, Math.min(255, Math.round(v))))));
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

export function encodePng(rgba, width, height) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Nearest-neighbour downscale (crisp enough for icons). */
export function resize(rgba, size, target) {
  const out = Buffer.alloc(target * target * 4);
  for (let y = 0; y < target; y++) {
    for (let x = 0; x < target; x++) {
      const sx = Math.min(size - 1, Math.round((x / target) * size));
      const sy = Math.min(size - 1, Math.round((y / target) * size));
      const si = (sy * size + sx) * 4;
      const di = (y * target + x) * 4;
      out[di] = rgba[si];
      out[di + 1] = rgba[si + 1];
      out[di + 2] = rgba[si + 2];
      out[di + 3] = rgba[si + 3];
    }
  }
  return out;
}

export function writePng(file, size) {
  const rgba = drawIcon(size);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, encodePng(rgba, size, size));
  return file;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const master = 1024;
  const rgba = drawIcon(master);
  fs.mkdirSync('build', { recursive: true });
  fs.writeFileSync('build/icon.png', encodePng(rgba, master, master));
  for (const s of [16, 24, 32, 48, 64, 128, 256, 512]) {
    const buf = resize(rgba, master, s);
    fs.mkdirSync('build/icons', { recursive: true });
    fs.writeFileSync(path.join('build', 'icons', `${s}x${s}.png`), encodePng(buf, s, s));
  }
  fs.writeFileSync('logo.svg', svgIcon());
  fs.writeFileSync('public/logo.svg', svgIcon());
  console.log('icons written to build/');
}

function svgIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="ds" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4C8DFF"/>
      <stop offset="0.55" stop-color="#12D8FF"/>
      <stop offset="1" stop-color="#B06CFF"/>
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="60" height="60" rx="15" fill="url(#ds)"/>
  <text x="15" y="45" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="900" fill="#081426">D</text>
  <text x="36" y="45" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="800" fill="#081426">S</text>
  <path d="M50 8l1.6 4.4L56 14l-4.4 1.6L50 20l-1.6-4.4L44 14l4.4-1.6z" fill="#fff"/>
</svg>`;
}
