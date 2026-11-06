// Headless smoke tests for DesignShop's editor engine, presets, i18n and wizard.
// Run: npm test
import { installDom } from './fake-dom.mjs';

installDom();

const { DICT, KEY_COUNT, createTranslator } = await import('../src/lib/i18n.js');
const presets = await import('../src/lib/presets.js');
const geometry = await import('../src/lib/geometry.js');
const filters = await import('../src/lib/filters.js');
const docLib = await import('../src/lib/document.js');
const render = await import('../src/lib/render.js');
const store = await import('../src/lib/store.js');
const wizard = await import('../src/lib/wizard.js');

let pass = 0;
let fail = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    pass++;
  } catch (err) {
    fail++;
    failures.push(`${name}: ${err.message}`);
    console.error(`✗ ${name}\n   ${err.stack?.split('\n').slice(1, 4).join('\n   ')}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

function eq(a, b, msg) {
  if (a !== b) throw new Error(`${msg || 'not equal'}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`);
}

// ------------------------------------------------------------------ i18n
test('i18n: English is the primary, complete dictionary', () => {
  assert(KEY_COUNT.en > 500, `expected 500+ English keys, got ${KEY_COUNT.en}`);
  eq(DICT.en['app.name'], 'DesignShop');
});

test('i18n: every English key has a Persian translation', () => {
  const missing = Object.keys(DICT.en).filter((k) => DICT.fa[k] == null);
  assert(missing.length === 0, `missing fa keys: ${missing.slice(0, 8).join(', ')}`);
});

test('i18n: Persian translations are non-empty and Persian where expected', () => {
  const bad = [];
  for (const [k, v] of Object.entries(DICT.fa)) {
    if (!String(v).trim()) bad.push(k);
  }
  assert(bad.length === 0, `empty fa values: ${bad.slice(0, 5).join(', ')}`);
  assert(/[\u0600-\u06FF]/.test(DICT.fa['app.tagline']), 'fa tagline should be Persian');
});

test('i18n: no Persian string leaks into the English dictionary', () => {
  const leaked = Object.entries(DICT.en).filter(([, v]) => /[\u0600-\u06FF]/.test(String(v)));
  // 'menu.view.language' intentionally contains both languages
  const intentional = ['menu.view.language', 'start.langHint', 'pref.languageSub', 'pref.rtlSub', 'misc.aboutBody'];
  const real = leaked.filter(([k]) => !intentional.includes(k));
  assert(real.length === 0, `Persian text in English defaults: ${real.map(([k]) => k).join(', ')}`);
});

test('i18n: interpolation works', () => {
  const t = createTranslator('fa');
  assert(t('export.progress', { done: 2, total: 5 }).includes('2'));
  eq(createTranslator('en')('nope.missing.key'), 'nope.missing.key');
});

// ------------------------------------------------------------------ presets
test('presets: every size preset has valid dimensions and a translation', () => {
  for (const s of presets.SIZE_PRESETS) {
    assert(s.w >= 16 && s.h >= 16, `bad size ${s.id}`);
    assert(DICT.en[`size.${s.id}`], `missing size.${s.id}`);
  }
});

test('presets: text styles reference real fonts and translated names', () => {
  for (const st of presets.TEXT_STYLES) {
    assert(presets.FONT_LIST.some((f) => f.id === st.font), `unknown font ${st.font} in ${st.id}`);
    assert(DICT.en[st.nameKey], `missing ${st.nameKey}`);
    assert(st.sizePct > 0.01 && st.sizePct < 0.5, `odd sizePct ${st.id}`);
  }
});

test('presets: kits reference valid styles and translated names', () => {
  for (const k of presets.KITS) {
    assert(DICT.en[k.nameKey], `missing ${k.nameKey}`);
    assert(presets.TEXT_STYLES.some((s) => s.id === k.headlineStyle), `bad style ${k.headlineStyle}`);
    for (const a of k.addons) assert(presets.ADDONS.some((x) => x.id === a), `bad addon ${a}`);
    assert(k.background && k.background.colors?.length, `kit ${k.id} needs colors`);
  }
});

test('presets: templates reference real sizes and kits', () => {
  for (const tpl of presets.TEMPLATES) {
    assert(presets.SIZE_PRESETS.some((s) => s.id === tpl.size), `bad size ${tpl.size}`);
    assert(presets.KITS.some((k) => k.id === tpl.kit), `bad kit ${tpl.kit}`);
    assert(DICT.en[tpl.nameKey], `missing ${tpl.nameKey}`);
  }
});

test('presets: add-ons and backgrounds are translated or self-named', () => {
  for (const a of presets.ADDONS) assert(DICT.en[a.nameKey], `missing addon ${a.nameKey}`);
  for (const b of presets.BACKGROUNDS) assert(b.colors.length > 0, `bg ${b.id}`);
});

// ---------------------------------------------------------------- geometry
test('geometry: doc<->local round trip with rotation and scale', () => {
  const layer = { x: 100, y: 50, w: 200, h: 100, rotation: 33, scaleX: 1.2, scaleY: 0.8 };
  const doc = geometry.localToDoc(layer, 40, 70);
  const back = geometry.docToLocal(layer, doc.x, doc.y);
  assert(Math.abs(back.x - 40) < 0.001 && Math.abs(back.y - 70) < 0.001, `round trip failed ${JSON.stringify(back)}`);
});

test('geometry: pointInLayer respects rotation', () => {
  const layer = { x: 0, y: 0, w: 100, h: 100, rotation: 45, scaleX: 1, scaleY: 1 };
  assert(geometry.pointInLayer(layer, 50, 50), 'center must be inside');
  assert(!geometry.pointInLayer(layer, 2, 2), 'corner must fall outside a rotated square');
});

test('geometry: bbox and fit helpers', () => {
  const layer = { x: 0, y: 0, w: 100, h: 50, rotation: 90, scaleX: 1, scaleY: 1 };
  const bb = geometry.layerBBox(layer);
  assert(Math.abs(bb.w - 50) < 0.001 && Math.abs(bb.h - 100) < 0.001, `bbox ${JSON.stringify(bb)}`);
  const fit = geometry.fitRect(1920, 1080, 800, 600, 40);
  assert(fit.w <= 760 && fit.h <= 560, 'fit must respect padding');
});

test('geometry: hitPolygon detects inside/outside', () => {
  const poly = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
  assert(geometry.hitPolygon(poly, 5, 5), 'inside');
  assert(!geometry.hitPolygon(poly, 20, 5), 'outside');
});

// ----------------------------------------------------------------- filters
test('filters: hasAdjustments ignores neutral values', () => {
  eq(filters.hasAdjustments(null), false);
  eq(filters.hasAdjustments({ ...filters.ADJ_DEFAULTS }), false);
  eq(filters.hasAdjustments({ brightness: 20 }), true);
});

test('filters: every preset exposes valid adjustment keys', () => {
  for (const p of filters.FILTER_PRESETS) {
    assert(DICT.en[`preset.${p.id}`], `missing preset.${p.id}`);
    for (const k of Object.keys(p.adj || {})) {
      assert(k in filters.ADJ_DEFAULTS, `unknown adjustment key ${k} in preset ${p.id}`);
    }
  }
});

test('filters: adjustments run without throwing and clamp output', () => {
  const canvas = document.createElement('canvas');
  canvas.width = 40;
  canvas.height = 30;
  filters.applyAdjustments(canvas, {
    brightness: 40,
    contrast: 30,
    saturation: 60,
    hue: 90,
    temperature: -20,
    grayscale: 20,
    invert: 10,
    posterize: 6,
    vignette: 30,
    noise: 10,
    blur: 2,
    pixelate: 3,
    sharpen: 20,
    duotone: 40,
    threshold: 20,
  });
  assert(true);
});

test('filters: boxBlur and pixelate are no-ops on tiny buffers', () => {
  const data = new Uint8ClampedArray(4 * 4 * 4).fill(128);
  filters.boxBlur(data, 4, 4, 1);
  filters.pixelatePass(data, 4, 4, 2);
  assert(data[0] >= 0 && data[0] <= 255);
});

// ---------------------------------------------------------------- documents
test('documents: createDoc defaults', () => {
  const d = docLib.createDoc({ w: 1280, h: 720 });
  eq(d.w, 1280);
  eq(d.h, 720);
  eq(d.layers.length, 0);
  eq(d.version, docLib.APP_VERSION);
});

test('documents: text layer measures itself and centres', () => {
  const d = docLib.createDoc({ w: 1280, h: 720 });
  const layer = docLib.createTextLayer(d, { text: 'HELLO', styleId: 'bold' });
  assert(layer.w > 0 && layer.h > 0, 'text layer must have size');
  assert(Math.abs(layer.x + layer.w / 2 - 640) < 2, 'text must be horizontally centred');
  eq(layer.type, 'text');
  eq(layer.uppercase, true);
});

test('documents: applying a text style changes font, effects and re-measures', () => {
  const d = docLib.createDoc({ w: 1280, h: 720 });
  const layer = docLib.createTextLayer(d, { text: 'NEON', styleId: 'clean' });
  const styled = docLib.applyTextStyle(d, layer, 'neon');
  eq(styled.fontId, presets.styleById('neon').font);
  assert(styled.effects.glow.on, 'neon style must enable glow');
  assert(Math.abs(styled.x + styled.w / 2 - (layer.x + layer.w / 2)) < 4, 'style must keep the anchor');
});

test('documents: kit builds a doc with background, headline and add-ons', () => {
  const d = docLib.createDoc({ w: 1280, h: 720 });
  const kitDoc = docLib.kitToDoc(d, 'neon', 'MY TITLE');
  eq(kitDoc.layers.length, 2);
  // accents sit behind the headline so the text is never covered
  eq(kitDoc.layers[0].type, 'shape');
  eq(kitDoc.layers[1].type, 'text');
  assert(kitDoc.background.pattern === 'grid', 'neon kit uses a grid background');
  const head = kitDoc.layers[1];
  assert(head.w <= d.w * 0.8, 'headline must not fill the whole canvas width');
  assert(head.fontSize > 60, 'headline should be thumbnail-sized, not body copy');
});

test('documents: template -> doc for every template', () => {
  for (const tpl of presets.TEMPLATES) {
    const d = docLib.templateToDoc(tpl, presets.TEMPLATES);
    const size = presets.getSize(tpl.size);
    eq(d.w, size.w);
    eq(d.h, size.h);
    assert(d.layers.length >= 1, `template ${tpl.id} produced no layers`);
  }
});

test('documents: doc JSON round trip preserves everything', () => {
  const d = docLib.kitToDoc(docLib.createDoc({ w: 1080, h: 1080 }), 'gaming', 'GG');
  const json = docLib.docToJson(d);
  const parsed = docLib.docFromJson(json);
  eq(parsed.w, 1080);
  eq(parsed.layers.length, d.layers.length);
  eq(parsed.layers.find((l) => l.type === 'text').text, 'GG');
  eq(parsed.background.pattern, d.background.pattern);
});

test('documents: invalid project JSON is rejected', () => {
  let threw = false;
  try {
    docLib.docFromJson('{"foo":1}');
  } catch {
    threw = true;
  }
  assert(threw, 'expected an error for invalid design files');
});

test('documents: cloneLayer gives a fresh id and offset', () => {
  const d = docLib.createDoc({ w: 800, h: 600 });
  const l = docLib.createShapeLayer(d, { shape: 'rect' });
  const c = docLib.cloneLayer(l);
  assert(c.id !== l.id, 'clone must have a new id');
  eq(c.x, l.x + 16);
});

test('documents: every add-on produces a valid layer', () => {
  const d = docLib.createDoc({ w: 1280, h: 720 });
  for (const a of presets.ADDONS) {
    const l = docLib.addonToLayer(d, a.id);
    assert(l && l.w > 0 && l.h > 0, `addon ${a.id} failed`);
    assert(l.id, 'addon layer needs an id');
  }
});

// ------------------------------------------------------------------ render
test('render: text layer renders and caches', () => {
  const d = docLib.createDoc({ w: 1280, h: 720 });
  const l = docLib.createTextLayer(d, { text: 'Thumbnail', styleId: 'gradient' });
  const c = render.getLayerCanvas(l);
  assert(c && c.width > 0, 'text canvas missing');
  const cached = render.getLayerCanvas(l);
  eq(cached, c, 'second call must hit the cache');
});

test('render: gradients, curves, letter spacing and alignment all render', () => {
  const d = docLib.createDoc({ w: 640, h: 480 });
  const variants = [
    { gradient: { type: 'linear', colors: ['#ff2d95', '#ffd166'], angle: 30 } },
    { curve: 45 },
    { curve: -60 },
    { letterSpacing: 12 },
    { align: 'left' },
    { align: 'right' },
    { uppercase: true, text: 'lowercase words' },
    { text: 'multi\nline\ntext' },
  ];
  for (const v of variants) {
    const base = docLib.createTextLayer(d, { text: 'HELLO WORLD' });
    const l = docLib.refreshTextLayer({ ...base, ...v });
    assert(l.w > 0 && l.h > 0, `variant failed: ${JSON.stringify(v)}`);
    const c = render.getLayerCanvas(l);
    assert(c.width > 0, 'canvas missing for variant');
  }
});

test('render: all shape types render', () => {
  const d = docLib.createDoc({ w: 800, h: 600 });
  for (const shape of ['rect', 'ellipse', 'triangle', 'star', 'heart', 'polygon', 'line', 'arrow', 'bubble', 'sparkle', 'frame', 'progress', 'brushUnderline', 'burst']) {
    const l = docLib.createShapeLayer(d, { shape, w: 200, h: 120, strokeWidth: 6, stroke: '#fff', label: '3' });
    const c = render.getLayerCanvas(l);
    assert(c && c.width > 0, `shape ${shape} failed`);
  }
});

test('render: brush strokes render, including erase', () => {
  const d = docLib.createDoc({ w: 400, h: 300 });
  const l = docLib.createBrushLayer(d, [
    { id: 's1', color: '#ff0000', size: 12, opacity: 100, erase: false, points: [{ x: 10, y: 10 }, { x: 40, y: 60 }, { x: 90, y: 20 }] },
    { id: 's2', color: '#00ff00', size: 6, opacity: 60, erase: true, points: [{ x: 5, y: 5 }] },
  ]);
  const c = render.getLayerCanvas(l);
  assert(c.width === 400, 'brush canvas should match doc width');
});

test('render: emoji layer renders', () => {
  const d = docLib.createDoc({ w: 400, h: 300 });
  const l = docLib.createEmojiLayer(d, '🔥', { size: 100 });
  assert(render.getLayerCanvas(l).width === 100);
});

test('render: document composes with backgrounds, effects, blend modes and masks', () => {
  const d = docLib.createDoc({ w: 1280, h: 720, background: { kind: 'pattern', pattern: 'grid', colors: ['#050b1e', '#123a6b'], glow: '#00e5ff' } });
  d.layers = [
    docLib.createShapeLayer(d, { shape: 'rect', w: 400, h: 200, fillColor: '#ff2d95' }),
    docLib.createTextLayer(d, { text: 'STACKED', styleId: 'neon' }),
    docLib.createEmojiLayer(d, '🔥'),
    docLib.createBrushLayer(d, [{ id: 'b', color: '#fff', size: 20, opacity: 100, erase: false, points: [{ x: 0, y: 0 }, { x: 100, y: 100 }] }]),
  ];
  d.layers[0].blend = 'multiply';
  d.layers[0].opacity = 70;
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  render.renderDocument(canvas, d);
  assert(true);
});

test('render: every background preset paints', () => {
  for (const bg of presets.BACKGROUNDS) {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 120;
    const ctx = canvas.getContext('2d');
    render.paintBackground(ctx, { w: 200, h: 120, background: bg });
  }
});

test('render: export honours scale and format', () => {
  const d = docLib.kitToDoc(docLib.createDoc({ w: 640, h: 360 }), 'bold', 'EXPORT');
  const c = render.exportCanvas(d, { scale: 2 });
  eq(c.width, 1280);
  eq(c.height, 720);
  const url = render.canvasToDataUrl(c, 'jpg', 0.8);
  assert(url.startsWith('data:image/jpeg'), 'jpg data url expected');
});

test('render: refitDoc scales layers into a new aspect ratio', () => {
  const d = docLib.kitToDoc(docLib.createDoc({ w: 1280, h: 720 }), 'neon', 'SIZE');
  const vertical = render.refitDoc(d, 1080, 1920);
  eq(vertical.w, 1080);
  eq(vertical.h, 1920);
  const s = Math.min(1080 / 1280, 1920 / 720);
  eq(vertical.layers[0].w, d.layers[0].w * s);
  assert(vertical.layers[0].y >= 0, 'layer should stay inside the canvas');
});

// ------------------------------------------------------------------- store
test('store: new document, add layers, undo and redo', () => {
  store.newDocument({ w: 1280, h: 720, name: 'Test' });
  eq(store.getState().doc.w, 1280);
  eq(store.getState().screen, 'editor');
  store.addNewLayer('text');
  eq(store.getState().doc.layers.length, 1);
  store.addNewLayer('shape');
  eq(store.getState().doc.layers.length, 2);
  store.undo();
  eq(store.getState().doc.layers.length, 1);
  store.redo();
  eq(store.getState().doc.layers.length, 2);
});

test('store: apply a kit and a text style through actions', () => {
  store.newDocument({ w: 1280, h: 720, name: 'Kit test' });
  store.applyKit('gaming');
  const layers = store.getState().doc.layers;
  assert(layers.length >= 2, 'kit should add layers');
  const text = layers.find((l) => l.type === 'text');
  assert(text, 'kit needs a text layer');
  store.selectLayer(text.id);
  const ok = store.applyStyleToSelection('gold');
  eq(ok, true);
  const after = store.getState().doc.layers.find((l) => l.id === text.id);
  eq(after.fontId, presets.styleById('gold').font);
});

test('store: layer mutations (move, scale, opacity, blend, delete, duplicate)', () => {
  store.newDocument({ w: 800, h: 600 });
  const layer = store.addNewLayer('shape');
  store.updateLayer(layer.id, { x: 42, y: 24, opacity: 55, blend: 'screen' });
  const l = store.getState().doc.layers.find((x) => x.id === layer.id);
  eq(l.x, 42);
  eq(l.opacity, 55);
  eq(l.blend, 'screen');
  store.duplicateLayer(layer.id);
  eq(store.getState().doc.layers.length, 2);
  store.deleteLayer(layer.id);
  eq(store.getState().doc.layers.length, 1);
});

test('store: reorder, align, center, flip and rotate', () => {
  store.newDocument({ w: 1000, h: 500 });
  const a = store.addNewLayer('shape');
  const b = store.addNewLayer('shape');
  store.moveLayerToIndex(a.id, 1);
  eq(store.getState().doc.layers[1].id, a.id);
  store.alignLayer(b.id, 'centerH');
  const bb = store.getState().doc.layers.find((l) => l.id === b.id);
  eq(bb.x, Math.round((1000 - bb.w) / 2));
  store.flipDocument('h');
  eq(store.getState().doc.layers.length, 2);
  store.rotateDocument(90);
  eq(store.getState().doc.w, 500);
  eq(store.getState().doc.h, 1000);
});

test('store: crop, resize canvas and background presets', () => {
  store.newDocument({ w: 1000, h: 800 });
  store.addNewLayer('shape');
  store.cropCanvasToRect({ x: 100, y: 50, w: 500, h: 400 });
  eq(store.getState().doc.w, 500);
  eq(store.getState().doc.h, 400);
  store.resizeCanvas(900, 600, { scaleLayers: true });
  eq(store.getState().doc.w, 900);
  store.applyBackgroundPreset(presets.BACKGROUNDS[0]);
  eq(store.getState().doc.background.kind, 'linear');
});

test('store: copy / paste / style clipboard', () => {
  store.newDocument({ w: 600, h: 400 });
  const l = store.addNewLayer('shape');
  store.selectLayer(l.id);
  store.copySelection();
  const before = store.getState().doc.layers.length;
  store.pasteClipboard();
  eq(store.getState().doc.layers.length, before + 1);
  store.copyStyle();
  assert(store.getState().styleClipboard, 'style clipboard should be filled');
});

test('store: preferences, language and direction', () => {
  store.setLang('fa');
  eq(store.getState().lang, 'fa');
  eq(store.isRtl(), true);
  store.setLang('en');
  eq(store.isRtl(), false);
  store.setTheme('light');
  eq(store.getState().theme, 'light');
  store.setTheme('dark');
});

test('store: tool options and tools', () => {
  store.setTool('brush');
  eq(store.getState().activeTool, 'brush');
  store.setToolOption({ brushSize: 40 });
  eq(store.getState().toolOptions.brushSize, 40);
  store.setZoom(2, { fit: false });
  eq(store.getState().zoom, 2);
  store.setZoom(0.0001, { fit: false });
  assert(store.getState().zoom >= 0.02, 'zoom must clamp');
});

test('store: design JSON save/restore', () => {
  const d = docLib.kitToDoc(docLib.createDoc({ w: 720, h: 720 }), 'sale', 'DEAL');
  store.openDocument(d);
  const json = store.saveDesignJson();
  const parsed = JSON.parse(json);
  eq(parsed.w, 720);
  eq(parsed.kind, 'dshop');
  assert(parsed.layers.length > 0);
});

test('store: history jump rewinds and replays in order', () => {
  store.newDocument({ w: 400, h: 400 });
  store.addNewLayer('shape');
  store.addNewLayer('shape');
  store.addNewLayer('shape');
  const depth = store.getState().past.length;
  assert(depth >= 3, `expected history, got ${depth}`);
  store.jumpToHistory(0); // state before the first layer was added
  eq(store.getState().doc.layers.length, 0);
  store.redo();
  eq(store.getState().doc.layers.length, 1);
  store.redo();
  eq(store.getState().doc.layers.length, 2);
  store.jumpToHistory(store.getState().past.length - 1);
  store.undo();
  eq(store.getState().doc.layers.length, 0);
});

// ------------------------------------------------------------------ wizard
test('wizard: creates a YouTube thumbnail from plain English', () => {
  store.closeDocument();
  const t = createTranslator('en');
  const res = wizard.runWizard('make a youtube thumbnail', t);
  assert(res.actions >= 1, 'wizard should act');
  eq(store.getState().doc.w, 1280);
  eq(store.getState().doc.h, 720);
});

test('wizard: understands Persian requests', () => {
  store.closeDocument();
  const t = createTranslator('fa');
  const res = wizard.runWizard('یک تامنیل یوتیوب بساز', t);
  assert(res.actions >= 1, 'wizard should act on Persian input');
  eq(store.getState().doc.w, 1280);
});

test('wizard: applies a style, a filter, an effect and exports', () => {
  const t = createTranslator('en');
  store.newDocument({ w: 1280, h: 720 });
  store.addNewLayer('text');
  let res = wizard.runWizard('apply neon style', t);
  assert(res.actions === 1, 'neon style action');
  res = wizard.runWizard('make it black and white', t);
  assert(res.actions === 1, 'filter action');
  res = wizard.runWizard('add a drop shadow', t);
  assert(res.actions === 1, 'shadow action');
  res = wizard.runWizard('export as png', t);
  assert(res.actions === 1, 'export action');
});

test('wizard: unknown input answers gracefully', () => {
  const t = createTranslator('en');
  const res = wizard.runWizard('florb the wizzle', t);
  assert(res.messages.length >= 1);
  eq(res.actions, undefined);
  assert(res.messages[0].text.length > 10);
});

test('wizard: writes headline text', () => {
  const t = createTranslator('en');
  store.newDocument({ w: 1280, h: 720 });
  store.addNewLayer('text');
  wizard.runWizard('write: BEST GAMING MOMENTS', t);
  const text = store.getState().doc.layers.find((l) => l.type === 'text');
  eq(text.text, 'BEST GAMING MOMENTS');
});

// -------------------------------------------------------------- persistence
test('store: recents are remembered and recycled', () => {
  store.newDocument({ w: 500, h: 500, name: 'Recent A' });
  assert(store.getState().recents.length >= 1, 'recent entry expected');
  const first = store.getState().recents[0];
  store.deleteRecent(first.id);
  assert(!store.getState().recents.some((r) => r.id === first.id), 'recent should be removed');
});

// -------------------------------------------------------------------- report
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) {
  console.log('\nFailures:');
  for (const f of failures) console.log(' - ' + f);
  process.exit(1);
}
