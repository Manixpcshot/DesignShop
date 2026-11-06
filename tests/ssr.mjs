// Server-render every screen, panel and dialog to catch JSX / hook / prop bugs
// without a browser. Run: npm run test:ssr
import { installDom } from './fake-dom.mjs';

installDom();

const React = (await import('react')).default;
const { renderToString } = await import('react-dom/server');
const store = await import('../src/lib/store.js');
const docLib = await import('../src/lib/document.js');
const presets = await import('../src/lib/presets.js');

const components = {
  StartScreen: (await import('../src/components/StartScreen.jsx')).default,
  TopBar: (await import('../src/components/TopBar.jsx')).default,
  Toolbar: (await import('../src/components/Toolbar.jsx')).default,
  OptionsBar: (await import('../src/components/OptionsBar.jsx')).default,
  CanvasStage: (await import('../src/components/CanvasStage.jsx')).default,
  PanelHost: (await import('../src/components/PanelHost.jsx')).default,
  Wizard: (await import('../src/components/Wizard.jsx')).default,
  Tour: (await import('../src/components/Tour.jsx')).default,
  NewDesignDialog: (await import('../src/components/dialogs/NewDesignDialog.jsx')).default,
  ExportDialog: (await import('../src/components/dialogs/ExportDialog.jsx')).default,
  SocialExportDialog: (await import('../src/components/dialogs/SocialExportDialog.jsx')).default,
  TemplatesDialog: (await import('../src/components/dialogs/TemplatesDialog.jsx')).default,
  ShortcutsDialog: (await import('../src/components/dialogs/MiscDialogs.jsx')).ShortcutsDialog,
  PreferencesDialog: (await import('../src/components/dialogs/MiscDialogs.jsx')).PreferencesDialog,
  AboutDialog: (await import('../src/components/dialogs/MiscDialogs.jsx')).AboutDialog,
  UpdatesDialog: (await import('../src/components/dialogs/MiscDialogs.jsx')).UpdatesDialog,
  GuideDialog: (await import('../src/components/dialogs/MiscDialogs.jsx')).GuideDialog,
  StudioPanel: (await import('../src/components/panels/StudioPanel.jsx')).default,
  TextPanel: (await import('../src/components/panels/TextPanel.jsx')).default,
  AdjustPanel: (await import('../src/components/panels/AdjustPanel.jsx')).default,
  LayersPanel: (await import('../src/components/panels/LayersPanel.jsx')).default,
  HistoryPanel: (await import('../src/components/panels/HistoryPanel.jsx')).default,
  App: (await import('../src/App.jsx')).default,
};

let pass = 0;
let fail = 0;
const problems = [];

// silence the noisy "useLayoutEffect does nothing on the server" warnings
const origError = console.error;
let warnings = [];
console.error = (...args) => {
  const msg = args.join(' ');
  if (/useLayoutEffect does nothing on the server/.test(msg)) return;
  warnings.push(msg);
  origError(...args);
};

function check(name, element, { minLength = 20 } = {}) {
  warnings = [];
  try {
    const html = renderToString(element);
    if (!html || html.length < minLength) throw new Error(`output too short (${html?.length || 0})`);
    if (warnings.length) throw new Error(`console errors: ${warnings[0].slice(0, 240)}`);
    pass++;
    return html;
  } catch (err) {
    fail++;
    problems.push(`${name}: ${err.message.split('\n')[0]}`);
    console.log(`✗ ${name}: ${err.message.split('\n')[0]}`);
  }
  return '';
}

const withDoc = (fn) => {
  store.newDocument({ w: 1280, h: 720, name: 'SSR design' });
  store.applyKit('neon');
  fn();
};

// --- both languages, start screen (no doc)
for (const lang of ['en', 'fa']) {
  store.closeDocument();
  store.setLang(lang);
  check(`StartScreen [${lang}]`, React.createElement(components.StartScreen));
  store.openDocument(docLib.templateToDoc(presets.TEMPLATES[0], presets.TEMPLATES));
  check(`StartScreen+doc [${lang}]`, React.createElement(components.StartScreen));
}

store.setLang('en');

// --- workspace chrome with a real document
withDoc(() => {
  for (const [name, Comp] of Object.entries(components)) {
    if (['StartScreen', 'App', 'Tour', 'Wizard'].includes(name)) continue; // covered below
    check(name, React.createElement(Comp));
  }
});

// --- each panel tab active
withDoc(() => {
  for (const panel of ['studio', 'text', 'adjust', 'layers', 'history']) {
    store.setPanel(panel);
    check(`PanelHost[${panel}]`, React.createElement(components.PanelHost));
  }
});

// --- text panel with a text layer selected and with a non-text layer selected
withDoc(() => {
  const text = store.addNewLayer('text');
  store.selectLayer(text.id);
  check('TextPanel[text layer]', React.createElement(components.TextPanel));
  const shape = store.addNewLayer('shape');
  store.selectLayer(shape.id);
  check('TextPanel[shape layer]', React.createElement(components.TextPanel));
  store.updateLayer(shape.id, { adj: { brightness: 20, contrast: 15 } });
  check('AdjustPanel[with adj]', React.createElement(components.AdjustPanel));
});

// --- every tool in the options bar
withDoc(() => {
  for (const tool of ['move', 'marquee', 'lasso', 'wand', 'crop', 'eyedropper', 'brush', 'eraser', 'fill', 'gradient', 'text', 'rect', 'ellipse', 'line', 'arrow', 'star', 'heart', 'polygon', 'frame', 'sticker', 'hand', 'zoom', 'highlight']) {
    store.setTool(tool);
    check(`OptionsBar[${tool}]`, React.createElement(components.OptionsBar), { minLength: 100 });
  }
});

// --- wizard open, tour open, and all dialogs flagged open
withDoc(() => {
  store.openDialog('wizard');
  check('Wizard[open]', React.createElement(components.Wizard));
  store.closeDialog('wizard');
  check('Wizard[fab]', React.createElement(components.Wizard));
  store.openDialog('tour');
  check('Tour[open]', React.createElement(components.Tour));
  store.closeDialog('tour');
});

// --- the whole app in both languages, on the start screen and the editor
store.closeDocument();
store.setLang('en');
const startHtml = check('App[start, en]', React.createElement(components.App), { minLength: 2000 });
store.newDocument({ w: 1080, h: 1080, name: 'App test' });
store.applyKit('sale');
const editorHtml = check('App[editor, en]', React.createElement(components.App), { minLength: 2000 });
store.setLang('fa');
const faHtml = check('App[editor, fa]', React.createElement(components.App), { minLength: 2000 });

// --- content assertions
function expectHtml(html, needle, label) {
  if (!html.includes(needle)) {
    fail++;
    problems.push(`${label}: missing "${needle}"`);
    console.log(`✗ ${label}: expected HTML to contain "${needle}"`);
  } else pass++;
}

expectHtml(startHtml, 'DesignShop', 'start screen brand');
expectHtml(startHtml, 'YouTube', 'start screen size cards');
expectHtml(editorHtml, 'toolbar', 'editor toolbar');
expectHtml(editorHtml, 'panel-tabs', 'editor panel tabs');
expectHtml(editorHtml, 'canvas-area', 'editor canvas');
expectHtml(faHtml, 'دیزاین', 'persian branding');
expectHtml(faHtml, 'لایه‌ها', 'persian panel labels');
expectHtml(faHtml, 'ابزارها', 'persian toolbar aria labels');

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) {
  console.log('\nProblems:');
  for (const p of problems) console.log(' - ' + p);
  process.exit(1);
}
