// Keep the version in sync in every place DesignShop declares it.
// Usage: node scripts/bump-version.mjs 1.0.7
import fs from 'node:fs';

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+/.test(version)) {
  console.error('usage: node scripts/bump-version.mjs <semver>');
  process.exit(1);
}

const read = (p) => fs.readFileSync(p, 'utf8');
const write = (p, s) => fs.writeFileSync(p, s);

// package.json (+ lock file if present)
const pkgPath = 'package.json';
const pkg = JSON.parse(read(pkgPath));
pkg.version = version;
write(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

if (fs.existsSync('package-lock.json')) {
  const lock = JSON.parse(read('package-lock.json'));
  lock.version = version;
  if (lock.packages?.['']) lock.packages[''].version = version;
  write('package-lock.json', JSON.stringify(lock, null, 2) + '\n');
}

// tauri.conf.json
const tauriPath = 'src-tauri/tauri.conf.json';
if (fs.existsSync(tauriPath)) {
  const conf = JSON.parse(read(tauriPath));
  conf.version = version;
  write(tauriPath, JSON.stringify(conf, null, 2) + '\n');
}

// Cargo.toml (only the [package] version)
const cargoPath = 'src-tauri/Cargo.toml';
if (fs.existsSync(cargoPath)) {
  let cargo = read(cargoPath);
  let inPackage = false;
  cargo = cargo
    .split('\n')
    .map((line) => {
      if (/^\[package\]/.test(line)) inPackage = true;
      else if (/^\[/.test(line)) inPackage = false;
      if (inPackage && /^version\s*=/.test(line)) return `version = "${version}"`;
      return line;
    })
    .join('\n');
  write(cargoPath, cargo);
}

// Cargo.lock entry for our own crate
const lockPath = 'src-tauri/Cargo.lock';
if (fs.existsSync(lockPath)) {
  let lock = read(lockPath);
  lock = lock.replace(/(name = "designshop"\nversion = ")[^"]+(")/, `$1${version}$2`);
  write(lockPath, lock);
}

// src/lib/document.js APP_VERSION
const docPath = 'src/lib/document.js';
if (fs.existsSync(docPath)) {
  let s = read(docPath);
  s = s.replace(/export const APP_VERSION = '[^']+';/, `export const APP_VERSION = '${version}';`);
  write(docPath, s);
}

// electron/main.js has no version literal (reads package.json) — nothing to do.
console.log(`DesignShop version → ${version}`);
