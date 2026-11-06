// Parses every JS/JSX source file with esbuild to catch syntax errors fast.
import fs from 'node:fs';
import path from 'node:path';
import { transform } from 'esbuild';

const files = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (/\.(jsx?|mjs)$/.test(entry.name)) files.push(p);
  }
};
for (const dir of ['src', 'electron', 'scripts', 'tests']) walk(dir);

let failed = 0;
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  try {
    await transform(source, {
      loader: file.endsWith('.jsx') ? 'jsx' : 'js',
      jsx: 'automatic',
      format: 'esm',
      target: 'node20',
      sourcefile: file,
    });
  } catch (err) {
    failed++;
    console.error(`✗ ${file}: ${err.message.split('\n')[0]}`);
  }
}

// JSON sanity
for (const json of ['package.json', 'src-tauri/tauri.conf.json', 'src-tauri/capabilities/default.json']) {
  if (!fs.existsSync(json)) continue;
  try {
    JSON.parse(fs.readFileSync(json, 'utf8'));
  } catch (err) {
    failed++;
    console.error(`✗ ${json}: ${err.message}`);
  }
}

console.log(`checked ${files.length} source files`);
process.exit(failed ? 1 : 0);
