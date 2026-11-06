// Bundles the SSR test with esbuild (so JSX works) and runs it.
import { build } from 'esbuild';
import path from 'node:path';

const outfile = path.join('tests', '.tmp', 'ssr.bundle.mjs');
await build({
  entryPoints: ['tests/ssr.mjs'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  outfile,
  jsx: 'automatic',
  loader: { '.js': 'jsx', '.jsx': 'jsx' },
  external: ['react', 'react-dom', 'react-dom/server'],
  logLevel: 'warning',
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
});
await import(path.resolve(outfile));
