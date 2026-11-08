import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// DesignShop renderer build. `base: './'` is required for Tauri/Electron
// (file:// protocol) loading.
export default defineConfig({
  base: './',
  // The updater compares this build against the newest GitHub release, so the
  // value must come from package.json and nowhere else.
  define: {
    __DS_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    hmr: { clientPort: 443 },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    target: 'chrome110',
    sourcemap: false,
    chunkSizeWarningLimit: 2400,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@fontsource')) return 'fonts';
          if (id.includes('node_modules/react')) return 'react';
          return undefined;
        },
      },
    },
  },
});
