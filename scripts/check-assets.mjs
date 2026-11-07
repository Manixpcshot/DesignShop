// Confirms the icon set and packaging assets required by electron-builder,
// Tauri and the CI workflows are all present.
import fs from 'node:fs';

const required = [
  'build/icon.png',
  'build/icon.ico',
  'build/icons/16x16.png',
  'build/icons/32x32.png',
  'build/icons/48x48.png',
  'build/icons/64x64.png',
  'build/icons/128x128.png',
  'build/icons/256x256.png',
  'build/icons/512x512.png',
  'src-tauri/icons/icon.png',
  'src-tauri/icons/icon.ico',
  'src-tauri/icons/32x32.png',
  'src-tauri/icons/128x128.png',
  'public/logo.svg',
  'index.html',
  'LICENSE',
  'README.md',
  'electron/main.js',
  'electron/preload.cjs',
  'src-tauri/Cargo.toml',
  'src-tauri/tauri.conf.json',
  'packaging/arch/make-arch-package.sh',
];

let failed = 0;
for (const f of required) {
  if (!fs.existsSync(f)) {
    failed++;
    console.error(`✗ missing ${f}`);
    continue;
  }
  const size = fs.statSync(f).size;
  if (size === 0) {
    failed++;
    console.error(`✗ empty ${f}`);
  }
}

const rgIcons = required.filter((x) => x.endsWith('.png') && (x.includes('src-tauri/icons') || x.includes('build/icons') || x.endsWith('build/icon.png')));

// png magic number check
for (const f of required.filter((x) => x.endsWith('.png'))) {
  if (!fs.existsSync(f)) continue;
  const head = fs.readFileSync(f).subarray(0, 8);
  const magic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!magic.every((b, i) => head[i] === b)) {
    failed++;
    console.error(`✗ ${f} is not a PNG`);
  }
}

// Tauri refuses icons that are not 8-bit RGBA (colour type 6). A palette or
// RGB PNG passes the magic-number check but panics `generate_context!` at
// build time, so verify the IHDR colour type too.
let nonRgba = 0;
for (const f of rgIcons) {
  if (!fs.existsSync(f)) continue;
  const buf = fs.readFileSync(f);
  if (buf.length < 26) {
    failed++;
    console.error(`✗ ${f} is truncated`);
    continue;
  }
  const bitDepth = buf[24];
  const colorType = buf[25];
  if (colorType !== 6 || bitDepth !== 8) {
    nonRgba++;
    failed++;
    console.error(
      `✗ ${f} must be 8-bit RGBA for Tauri (found bitDepth ${bitDepth}, colour type ${colorType})`
    );
  }
}
if (!nonRgba) console.log(`verified ${rgIcons.length} RGBA icons`);

console.log(`checked ${required.length} assets`);
process.exit(failed ? 1 : 0);
