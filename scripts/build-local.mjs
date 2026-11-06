// One-shot local packaging helper: builds the web bundle, then drives
// electron-builder and (optionally) Tauri for the current platform.
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';

const run = (cmd, env = {}) => {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', env: { ...process.env, ...env } });
};

const platform = os.platform();
run('npm run build');

if (platform === 'win32') {
  run('npx electron-builder --win nsis portable dir --x64 --publish never');
} else if (platform === 'darwin') {
  run('npx electron-builder --mac dmg zip --publish never');
} else {
  run('npx electron-builder --linux AppImage deb rpm tar.gz dir --x64 --publish never');
  try {
    const version = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
    run(`bash packaging/arch/make-arch-package.sh ${version} release`);
  } catch (err) {
    console.warn('Arch bundle skipped:', err.message);
  }
}

// Tauri is optional locally (needs the Rust toolchain)
if (process.argv.includes('--tauri')) {
  try {
    run('npx tauri build');
  } catch {
    console.warn('Tauri build skipped (Rust toolchain / system webview missing).');
  }
}

console.log('\nArtifacts are in ./release');
