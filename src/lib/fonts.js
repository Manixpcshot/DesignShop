// DesignShop font library.
//
// Three sources of fonts live side by side:
//   1. BUNDLED  — open-source families shipped inside the app (Google Fonts via
//                 @fontsource, OFL/Apache licensed). Always available, even
//                 offline, with no download step.
//   2. IMPORTED — the user's own .ttf/.otf/.woff/.woff2 files. They are read
//                 locally, registered with the FontFace API and kept in
//                 localStorage as data URLs, so a design keeps its look after
//                 a restart and travels with the project file.
//   3. MISSING  — a design references a family this machine does not have.
//                 Instead of silently wrecking the layout we report it and
//                 offer a replacement.
//
// Everything here is framework-free so the canvas renderer, the panels and the
// tests can share exactly one implementation.

const STORAGE_KEY = 'designshop.fonts.v1';
const MAX_IMPORT_BYTES = 12 * 1024 * 1024; // 12 MB per file
const MAX_IMPORTED = 60;

// ---------------------------------------------------------------- bundled set
// `fa: true`  -> the family covers the Arabic/Persian script.
// `display`   -> strong headline personality, good for thumbnails.
// `weights`   -> the weights that are actually installed (see main.jsx).
export const BUNDLED_FONTS = [
  // --- Latin display (thumbnail heroes) ---
  {
    id: 'anton',
    family: 'Anton',
    label: 'Anton',
    weights: [400],
    display: true,
    fa: false,
    group: 'display',
    note: 'text.fontNote.anton',
    sample: 'HUGE SALE',
  },
  {
    id: 'archivo',
    family: 'Archivo Black',
    label: 'Archivo Black',
    weights: [400],
    display: true,
    fa: false,
    group: 'display',
    note: 'text.fontNote.archivo',
    sample: 'BRUTAL',
  },
  {
    id: 'bebas',
    family: 'Bebas Neue',
    label: 'Bebas Neue',
    weights: [400],
    display: true,
    fa: false,
    group: 'display',
    note: 'text.fontNote.bebas',
    sample: 'NEW VIDEO',
  },
  {
    id: 'oswald',
    family: 'Oswald',
    label: 'Oswald',
    weights: [500, 700],
    display: true,
    fa: false,
    group: 'display',
    note: 'text.fontNote.oswald',
    sample: 'TOP 10',
  },
  {
    id: 'notable',
    family: 'Notable',
    label: 'Notable',
    weights: [400],
    display: true,
    fa: false,
    group: 'display',
    note: 'text.fontNote.notable',
    sample: 'NOTABLE',
  },
  {
    id: 'staatliches',
    family: 'Staatliches',
    label: 'Staatliches',
    weights: [400],
    display: true,
    fa: false,
    group: 'display',
    note: 'text.fontNote.staatliches',
    sample: 'POSTER',
  },
  {
    id: 'bangers',
    family: 'Bangers',
    label: 'Bangers',
    weights: [400],
    display: true,
    fa: false,
    group: 'display',
    note: 'text.fontNote.bangers',
    sample: 'BOOM!',
  },
  {
    id: 'righteous',
    family: 'Righteous',
    label: 'Righteous',
    weights: [400],
    display: true,
    fa: false,
    group: 'display',
    note: 'text.fontNote.righteous',
    sample: 'VIBES',
  },
  {
    id: 'league-spartan',
    family: 'League Spartan',
    label: 'League Spartan',
    weights: [700, 900],
    display: true,
    fa: false,
    group: 'display',
    note: 'text.fontNote.league',
    sample: 'GAMING',
  },
  {
    id: 'abril',
    family: 'Abril Fatface',
    label: 'Abril Fatface',
    weights: [400],
    display: true,
    fa: false,
    group: 'display',
    note: 'text.fontNote.abril',
    sample: 'Elegant',
  },
  {
    id: 'noto-kufi',
    family: 'Noto Kufi Arabic',
    label: 'Noto Kufi Arabic',
    weights: [400, 700, 900],
    display: true,
    fa: true,
    group: 'display',
    note: 'text.fontNote.kufi',
    sample: 'کوفی نگار',
  },
  {
    id: 'lalezar',
    family: 'Lalezar',
    label: 'Lalezar',
    weights: [400],
    display: true,
    fa: true,
    group: 'display',
    note: 'text.fontNote.lalezar',
    sample: 'لاله‌زار',
  },
  {
    id: 'jomhuria',
    family: 'Jomhuria',
    label: 'Jomhuria',
    weights: [400],
    display: true,
    fa: true,
    group: 'display',
    note: 'text.fontNote.jomhuria',
    sample: 'جمهوریت',
  },
  {
    id: 'changa',
    family: 'Changa',
    label: 'Changa',
    weights: [400, 700, 800],
    display: true,
    fa: true,
    group: 'display',
    note: 'text.fontNote.changa',
    sample: 'چانگا',
  },

  // --- Latin text / UI ---
  {
    id: 'inter',
    family: 'Inter',
    label: 'Inter',
    weights: [400, 700, 900],
    display: false,
    fa: false,
    group: 'text',
    note: 'text.fontNote.inter',
    sample: 'Clean body',
  },
  {
    id: 'poppins',
    family: 'Poppins',
    label: 'Poppins',
    weights: [600, 800],
    display: false,
    fa: false,
    group: 'text',
    note: 'text.fontNote.poppins',
    sample: 'Friendly',
  },
  {
    id: 'montserrat',
    family: 'Montserrat',
    label: 'Montserrat',
    weights: [700, 900],
    display: false,
    fa: false,
    group: 'text',
    note: 'text.fontNote.montserrat',
    sample: 'Modern',
  },
  {
    id: 'space',
    family: 'Space Grotesk',
    label: 'Space Grotesk',
    weights: [700],
    display: false,
    fa: false,
    group: 'text',
    note: 'text.fontNote.space',
    sample: 'Techy',
  },
  {
    id: 'rubik',
    family: 'Rubik',
    label: 'Rubik',
    weights: [400, 600, 800],
    display: false,
    fa: false,
    group: 'text',
    note: 'text.fontNote.rubik',
    sample: 'Round',
  },
  {
    id: 'playfair',
    family: 'Playfair Display',
    label: 'Playfair Display',
    weights: [700, 900],
    display: false,
    fa: false,
    group: 'serif',
    note: 'text.fontNote.playfair',
    sample: 'Timeless',
  },
  {
    id: 'amiri',
    family: 'Amiri',
    label: 'Amiri',
    weights: [400, 700],
    display: false,
    fa: true,
    group: 'serif',
    note: 'text.fontNote.amiri',
    sample: 'امیری',
  },
  {
    id: 'scheherazade',
    family: 'Scheherazade New',
    label: 'Scheherazade New',
    weights: [400, 700],
    display: false,
    fa: true,
    group: 'serif',
    note: 'text.fontNote.scheherazade',
    sample: 'شهرزاد',
  },
  {
    id: 'markazi',
    family: 'Markazi Text',
    label: 'Markazi Text',
    weights: [400, 700],
    display: false,
    fa: true,
    group: 'serif',
    note: 'text.fontNote.markazi',
    sample: 'مرکزی',
  },

  // --- handwriting / marker ---
  {
    id: 'lobster',
    family: 'Lobster',
    label: 'Lobster',
    weights: [400],
    display: true,
    fa: false,
    group: 'script',
    note: 'text.fontNote.lobster',
    sample: 'Lobster',
  },
  {
    id: 'marker',
    family: 'Permanent Marker',
    label: 'Permanent Marker',
    weights: [400],
    display: true,
    fa: false,
    group: 'script',
    note: 'text.fontNote.marker',
    sample: 'Marker!',
  },
  {
    id: 'caveat',
    family: 'Caveat',
    label: 'Caveat',
    weights: [400, 700],
    display: true,
    fa: false,
    group: 'script',
    note: 'text.fontNote.caveat',
    sample: 'handwritten',
  },
  {
    id: 'pacifico',
    family: 'Pacifico',
    label: 'Pacifico',
    weights: [400],
    display: true,
    fa: false,
    group: 'script',
    note: 'text.fontNote.pacifico',
    sample: 'Pacifico',
  },

  // --- Persian workhorses ---
  {
    id: 'vazir',
    family: 'Vazirmatn',
    label: 'Vazirmatn',
    weights: [400, 700],
    display: false,
    fa: true,
    group: 'persian',
    note: 'text.fontNote.vazir',
    sample: 'وزیرمتن فارسی',
  },
  {
    id: 'estedad',
    family: 'Estedad',
    label: 'Estedad',
    weights: [400, 500, 700, 900],
    display: false,
    fa: true,
    group: 'persian',
    note: 'text.fontNote.estedad',
    sample: 'استعداد',
  },
  {
    id: 'noto-naskh',
    family: 'Noto Naskh Arabic',
    label: 'Noto Naskh Arabic',
    weights: [400, 700],
    display: false,
    fa: true,
    group: 'persian',
    note: 'text.fontNote.naskh',
    sample: 'نسخ عربی',
  },
  {
    id: 'noto-sans-arabic',
    family: 'Noto Sans Arabic',
    label: 'Noto Sans Arabic',
    weights: [400, 700],
    display: false,
    fa: true,
    group: 'persian',
    note: 'text.fontNote.notoSans',
    sample: 'نوتو سانس',
  },
  {
    id: 'cairo',
    family: 'Cairo',
    label: 'Cairo',
    weights: [400, 600, 700, 900],
    display: false,
    fa: true,
    group: 'persian',
    note: 'text.fontNote.cairo',
    sample: 'قاهره',
  },
  {
    id: 'tajawal',
    family: 'Tajawal',
    label: 'Tajawal',
    weights: [400, 500, 700, 800],
    display: false,
    fa: true,
    group: 'persian',
    note: 'text.fontNote.tajawal',
    sample: 'تجوال',
  },
  {
    id: 'almarai',
    family: 'Almarai',
    label: 'Almarai',
    weights: [400, 700, 800],
    display: false,
    fa: true,
    group: 'persian',
    note: 'text.fontNote.almarai',
    sample: 'المراعي',
  },
  {
    id: 'kufam',
    family: 'Kufam',
    label: 'Kufam',
    weights: [400, 700, 900],
    display: true,
    fa: true,
    group: 'persian',
    note: 'text.fontNote.kufam',
    sample: 'كوفام',
  },
  {
    id: 'lateef',
    family: 'Lateef',
    label: 'Lateef',
    weights: [400, 700],
    display: false,
    fa: true,
    group: 'persian',
    note: 'text.fontNote.lateef',
    sample: 'لطیف',
  },
  {
    id: 'harmattan',
    family: 'Harmattan',
    label: 'Harmattan',
    weights: [400, 700],
    display: false,
    fa: true,
    group: 'persian',
    note: 'text.fontNote.harmattan',
    sample: 'هرمتان',
  },
  {
    id: 'orbitron',
    family: 'Orbitron',
    label: 'Orbitron',
    weights: [700],
    display: true,
    fa: false,
    group: 'display',
    note: 'text.fontNote.orbitron',
    sample: 'FUTURE 01',
  },
];

export const FONT_LIST = BUNDLED_FONTS;

export const FONT_GROUPS = [
  { id: 'display', nameKey: 'font.group.display' },
  { id: 'text', nameKey: 'font.group.text' },
  { id: 'serif', nameKey: 'font.group.serif' },
  { id: 'script', nameKey: 'font.group.script' },
  { id: 'persian', nameKey: 'font.group.persian' },
  { id: 'imported', nameKey: 'font.group.imported' },
];

const FALLBACK_STACK = 'system-ui, -apple-system, "Segoe UI", sans-serif';
// Only used for canvas measurement / CSS when the chosen family is missing.
const PERSIAN_FALLBACK = '"Vazirmatn", "Noto Naskh Arabic", "Tahoma", sans-serif';

// ------------------------------------------------------------- imported fonts
let imported = []; // { id, family, label, weights, fa, group:'imported', dataUrl, format, size, addedAt }
let listener = null;
const readyFamilies = new Set();

function storage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function loadImported() {
  const ls = storage();
  if (!ls) return [];
  try {
    const raw = ls.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((f) => f && f.id && f.family && f.dataUrl) : [];
  } catch {
    return [];
  }
}

function saveImported(list) {
  const ls = storage();
  if (!ls) return false;
  try {
    ls.setItem(STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch (err) {
    // Quota exceeded is the common case: too many big fonts saved.
    return false;
  }
}

/**
 * Register every persisted custom font with the document so canvas text and
 * the CSS in panels render with it. Safe to call more than once.
 */
export async function hydrateImportedFonts() {
  imported = loadImported();
  await Promise.all(imported.map((f) => registerFace(f).catch(() => false)));
  notify();
  return imported.length;
}

function registerFace(font) {
  const faces = globalThis.document?.fonts;
  if (!faces?.add || typeof FontFace === 'undefined') return Promise.resolve(false);
  if (readyFamilies.has(font.family)) return Promise.resolve(true);
  try {
    const face = new FontFace(font.family, `url(${font.dataUrl})`, {
      weight: String(font.weight || 400),
      style: 'normal',
    });
    return face.load().then((loaded) => {
      faces.add(loaded);
      readyFamilies.add(font.family);
      return true;
    });
  } catch {
    return Promise.resolve(false);
  }
}

// ------------------------------------------------------------- font detection
// Canvas silently falls back to a default font when a family is missing, so we
// compare the metrics of the requested family against two fallbacks. If they
// are identical for both, the family is not installed.
const testString = 'mmMwWLliI0O&1 فارسی';
const BASE_FONTS = ['monospace', 'serif'];

function metrics(family) {
  const c = globalThis.document?.createElement?.('canvas');
  if (!c) return null;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const out = [];
  for (const base of BASE_FONTS) {
    ctx.font = `72px ${base}`;
    out.push(ctx.measureText(testString).width);
    ctx.font = `72px "${family}", ${base}`;
    out.push(ctx.measureText(testString).width);
  }
  return out;
}

const availability = new Map();

/** Is `family` actually usable in this document? */
export function isFontLoaded(family) {
  if (!family) return false;
  if (readyFamilies.has(family)) return true;
  if (availability.has(family)) return availability.get(family);
  const m = metrics(family);
  if (!m) return true; // no canvas (SSR/tests) — assume yes, nothing to verify
  const differs = m[0] !== m[1] || m[2] !== m[3];
  // A family that is genuinely installed differs from both bases; an unknown
  // family collapses to the same width as its base font.
  if (differs) availability.set(family, true);
  return differs;
}

export function clearAvailabilityCache() {
  availability.clear();
}

/** Wait until the browser has paints-ready faces for these families. */
export async function ensureFontsReady(families = []) {
  const faces = globalThis.document?.fonts;
  if (!faces?.load) return;
  await Promise.all(
    families.filter(Boolean).map((family) =>
      faces
        .load(`400 32px "${family}"`)
        .then(() => availability.set(family, true))
        .catch(() => false)
    )
  );
}

// ------------------------------------------------------------------- importer
const FORMATS = {
  ttf: 'truetype',
  otf: 'opentype',
  woff: 'woff',
  woff2: 'woff2',
  ttc: 'truetype',
};

export function fontExtension(name = '') {
  return (String(name).split('.').pop() || '').toLowerCase();
}

export const SUPPORTED_FONT_EXTENSIONS = Object.keys(FORMATS);

export function guessFamilyFromFile(fileName = '') {
  const base = String(fileName)
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    // strip common weight/style suffixes so "Vazirmatn-Bold" -> "Vazirmatn"
    .replace(/\b(thin|extralight|light|regular|medium|semibold|bold|extrabold|black|italic|variable|wght|vf)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return base || 'My Font';
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error || new Error('Could not read file'));
    r.readAsDataURL(file);
  });
}

/** True when the file's bytes contain Arabic-script codepoints (UTF-16 pairs in the cmap). */
async function coversPersian(file) {
  try {
    const buf = new Uint8Array(await file.slice(0, 262144).arrayBuffer());
    // scan for UTF-16BE 0x06xx (Arabic block) or 0xFExx/0xFBxx presentation forms
    for (let i = 0; i + 1 < buf.length; i += 2) {
      const hi = buf[i];
      if (hi === 0x06 || hi === 0xfe || hi === 0xfb) {
        const lo = buf[i + 1];
        // conservative: a real cmap entry for the Arabic block
        if (hi === 0x06 && lo >= 0x00 && lo <= 0xff) return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Import one font file. Returns `{ ok, font }` or `{ ok:false, error }`.
 * Never throws — the UI shows the message instead.
 */
export async function importFontFile(file, opts = {}) {
  if (!file) return { ok: false, error: 'font.err.noFile' };
  const ext = fontExtension(file.name);
  const format = FORMATS[ext];
  if (!format) return { ok: false, error: 'font.err.format', detail: ext };
  if (file.size > MAX_IMPORT_BYTES) return { ok: false, error: 'font.err.tooBig', detail: `${Math.round(file.size / 1048576)} MB` };
  if (imported.length >= MAX_IMPORTED) return { ok: false, error: 'font.err.tooMany', detail: String(MAX_IMPORTED) };

  let dataUrl;
  try {
    dataUrl = await readFileAsDataUrl(file);
  } catch {
    return { ok: false, error: 'font.err.read' };
  }

  const family = (opts.family || guessFamilyFromFile(file.name)).slice(0, 48);
  const fa = await coversPersian(file);
  const entry = {
    id: `imp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    family,
    label: family,
    weights: [400],
    weight: 400,
    fa,
    display: false,
    group: 'imported',
    note: 'font.group.imported',
    sample: fa ? 'فونت من' : 'My font',
    dataUrl,
    format,
    size: file.size,
    source: 'imported',
    addedAt: Date.now(),
  };

  const registered = await registerFace(entry);
  if (!registered) return { ok: false, error: 'font.err.register' };

  imported = [entry, ...imported];
  const saved = saveImported(imported);
  notify();
  return { ok: true, font: entry, savedToDisk: saved };
}

export async function importFontFiles(files, opts = {}) {
  const results = [];
  for (const file of Array.from(files || [])) {
    results.push(await importFontFile(file, opts));
  }
  return {
    results,
    ok: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok),
  };
}

export function removeImportedFont(id) {
  const found = imported.find((f) => f.id === id);
  imported = imported.filter((f) => f.id !== id);
  if (found) readyFamilies.delete(found.family);
  saveImported(imported);
  notify();
  return !!found;
}

export function renameImportedFont(id, label) {
  imported = imported.map((f) => (f.id === id ? { ...f, label: String(label || f.label) } : f));
  saveImported(imported);
  notify();
}

export const listImportedFonts = () => imported.slice();

// ------------------------------------------------------------------ public API
/** Every font the app can offer right now, bundled first, then the user's own. */
export function allFonts() {
  return [...FONT_LIST, ...imported];
}

export function fontById(id) {
  return allFonts().find((f) => f.id === id) || FONT_LIST[0];
}

/** A full CSS font-family value (family + sensible script fallbacks). */
export function fontCss(id) {
  const f = fontById(id);
  return `"${f.family}", ${PERSIAN_FALLBACK}, ${FALLBACK_STACK}`;
}

/** Families the document actually needs to have painted. */
export function fontsUsedBy(doc) {
  const set = new Set();
  for (const layer of doc?.layers || []) {
    if (layer.type === 'text' && layer.fontId) set.add(fontById(layer.fontId).family);
  }
  return [...set];
}

/** Families a saved design references that this machine cannot draw. */
export function missingFontsInDoc(doc) {
  const out = [];
  for (const layer of doc?.layers || []) {
    if (layer.type !== 'text' || !layer.fontId) continue;
    const f = fontById(layer.fontId);
    if (!isFontLoaded(f.family)) out.push({ id: layer.id, fontId: layer.fontId, family: f.family });
  }
  return out;
}

export function onFontsChanged(fn) {
  listener = fn;
  return () => {
    if (listener === fn) listener = null;
  };
}

function notify() {
  try {
    listener?.();
  } catch {
    /* a listener must never break font registration */
  }
}

/** Storage used by imported fonts, for the library UI footer. */
export function importedStorageBytes() {
  return imported.reduce((sum, f) => sum + (f.size || 0), 0);
}

export const FONT_LIMITS = { maxBytes: MAX_IMPORT_BYTES, maxCount: MAX_IMPORTED };

// ---------------------------------------------------------------- filtering
export function filterFonts(fonts, { query = '', group = 'all', persianOnly = false, displayOnly = false } = {}) {
  const q = query.trim().toLowerCase();
  return fonts.filter((f) => {
    if (group !== 'all' && f.group !== group) return false;
    if (persianOnly && !f.fa) return false;
    if (displayOnly && !f.display) return false;
    if (!q) return true;
    return (
      f.label.toLowerCase().includes(q) ||
      f.family.toLowerCase().includes(q) ||
      (f.fa && /فارسی|فونت|پرشین|persian|farsi|arabic|عربی/.test(q))
    );
  });
}
