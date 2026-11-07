// Wire the store to the renderer and expose a tiny debug API.
import * as store from './store.js';
import * as render from './render.js';
import * as documentLib from './document.js';
import * as presets from './presets.js';
import * as filters from './filters.js';
import * as platform from './platform.js';
import { PLATFORM } from './platform.js';
import * as fonts from './fonts.js';

store.attachRender(render);

// Webfonts arrive asynchronously. Text layers rendered before they load would
// stay baked with a fallback face, so invalidate the cache as soon as the real
// fonts are ready (and preload the display faces the styles rely on).
if (typeof document !== 'undefined' && document.fonts) {
  const refresh = () => {
    render.clearRenderCache(true);
    window.dispatchEvent(new CustomEvent('ds:image-loaded', { detail: 'fonts' }));
  };
  // Every family the library can offer, so a design opened from disk never
  // flashes a fallback face.
  const families = fonts.FONT_LIST.map((f) => f.family);
  for (const f of families) {
    document.fonts.load(`700 48px "${f}"`).catch(() => {});
    document.fonts.load(`400 48px "${f}"`).catch(() => {});
  }
  // User-imported fonts are stored as data URLs; registering them re-arms the
  // canvas for designs that reference them.
  fonts
    .hydrateImportedFonts()
    .then((count) => {
      if (count) refresh();
    })
    .catch(() => {});
  document.fonts.ready.then(refresh).catch(() => {});
  document.fonts.addEventListener?.('loadingdone', refresh);
}

if (typeof window !== 'undefined') {
  window.DesignShop = {
    store,
    render,
    documentLib,
    presets,
    filters,
    platformLib: platform,
    fonts,
    platform: PLATFORM,
    version: documentLib.APP_VERSION,
    getState: store.getState,
  };
}

export default window.DesignShop;
