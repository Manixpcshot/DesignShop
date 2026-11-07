// End-to-end UI test: drives the real app in a headless browser the way a user
// would (clicking, typing, pressing shortcuts) and checks the result.
//
// Needs a production build and a running preview server:
//   npx vite build && npx vite preview --port 4173 --host 0.0.0.0
//   npm run test:e2e
//
// The browser is resolved from PUPPETEER_EXECUTABLE_PATH (or /tmp/chromium when
// present) via puppeteer-core, so CI can point at any Chromium build.
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const URL = process.env.DS_URL || 'http://127.0.0.1:4173/';

function findChromium() {
  return (
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    process.env.CHROME_PATH ||
    ['/tmp/chromium', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'].find((p) => {
      try {
        return fs.existsSync(p);
      } catch {
        return false;
      }
    })
  );
}

const executablePath = findChromium();
if (!executablePath) {
  console.error('No Chromium found. Set PUPPETEER_EXECUTABLE_PATH to run the UI test.');
  process.exit(0); // not a failure in environments without a browser
}

let puppeteer;
try {
  ({ default: puppeteer } = await import('puppeteer-core'));
} catch {
  console.error('puppeteer-core is not installed — skipping the UI test.');
  process.exit(0);
}

const env = { ...process.env };
if (process.env.DS_LD_LIBRARY_PATH) env.LD_LIBRARY_PATH = process.env.DS_LD_LIBRARY_PATH;

const browser = await puppeteer.launch({
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--font-render-hinting=none'],
  defaultViewport: { width: 1500, height: 940 },
  executablePath,
  headless: 'shell',
  env,
});

const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push('pageerror: ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error') pageErrors.push('console: ' + m.text().slice(0, 180));
});

let pass = 0;
const failures = [];
const step = async (name, fn) => {
  try {
    await fn();
    pass++;
    console.log('✓ ' + name);
  } catch (err) {
    failures.push(name + ' — ' + String(err.message).slice(0, 200));
    console.error('✗ ' + name + '\n   ' + String(err.message).slice(0, 200));
  }
};

await page.goto(URL, { waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
await new Promise((r) => setTimeout(r, 800));

const layers = () => page.evaluate(() => window.DesignShop.store.getState().doc.layers);
const frameBox = () =>
  page.evaluate(() => {
    const b = document.querySelector('.canvas-frame').getBoundingClientRect();
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  });

await step('app boots to the start screen without errors', async () => {
  const ok = await page.evaluate(() => !!window.DesignShop && window.DesignShop.store.getState().screen === 'start');
  if (!ok) throw new Error('start screen missing');
});

await step('a new document opens the editor', async () => {
  await page.evaluate(() => window.DesignShop.store.newDocument({ w: 1280, h: 720, name: 'E2E', background: '#101828' }));
  await new Promise((r) => setTimeout(r, 600));
  const screen = await page.evaluate(() => window.DesignShop.store.getState().screen);
  if (screen !== 'editor') throw new Error('screen=' + screen);
});

await step('Text tool: click the canvas, type, commit with Escape', async () => {
  await page.keyboard.press('t');
  const b = await frameBox();
  await page.mouse.click(b.x + b.w * 0.35, b.y + b.h * 0.4);
  await new Promise((r) => setTimeout(r, 450));
  const editing = await page.evaluate(() => !!document.getElementById('inline-text-input'));
  if (!editing) throw new Error('inline editor did not open');
  await page.keyboard.type('Hello World');
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 400));
  const txt = (await layers()).find((l) => l.type === 'text');
  if (!txt || txt.text !== 'Hello World') throw new Error('text=' + JSON.stringify(txt?.text));
});

await step('double-clicking a text layer re-opens the inline editor', async () => {
  const b = await frameBox();
  const doc = await page.evaluate(() => window.DesignShop.store.getState().doc);
  const layer = (await layers()).find((l) => l.type === 'text');
  const zoom = b.w / doc.w;
  // click the middle of the headline itself, whatever its size now is
  const cx = b.x + (layer.x + layer.w / 2) * zoom;
  const cy = b.y + (layer.y + layer.h * 0.55) * zoom;
  // puppeteer's clickCount does not synthesise a dblclick; drive the real
  // sequence (down/up, then a second click) like a user would
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.up();
  await new Promise((r) => setTimeout(r, 60));
  await page.mouse.down({ clickCount: 2 });
  await page.mouse.up({ clickCount: 2 });
  await new Promise((r) => setTimeout(r, 400));
  const editing = await page.evaluate(() => !!document.getElementById('inline-text-input'));
  if (!editing) throw new Error('editor did not reopen');
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 300));
});

await step('brush paints a stroke layer', async () => {
  await page.keyboard.press('b');
  const b = await frameBox();
  await page.mouse.move(b.x + b.w * 0.2, b.y + b.h * 0.72);
  await page.mouse.down();
  await page.mouse.move(b.x + b.w * 0.5, b.y + b.h * 0.8, { steps: 14 });
  await page.mouse.up();
  await new Promise((r) => setTimeout(r, 500));
  if (!(await layers()).some((l) => l.type === 'brush')) throw new Error('no brush layer');
});

await step('Ctrl+Z undoes the stroke', async () => {
  const before = (await layers()).length;
  await page.keyboard.down('Control');
  await page.keyboard.press('z');
  await page.keyboard.up('Control');
  await new Promise((r) => setTimeout(r, 450));
  const after = (await layers()).length;
  if (after >= before) throw new Error(`${before} -> ${after}`);
});

await step('shape tool draws a rectangle', async () => {
  await page.keyboard.press('u');
  const b = await frameBox();
  await page.mouse.move(b.x + b.w * 0.55, b.y + b.h * 0.12);
  await page.mouse.down();
  await page.mouse.move(b.x + b.w * 0.82, b.y + b.h * 0.42, { steps: 10 });
  await page.mouse.up();
  await new Promise((r) => setTimeout(r, 450));
  if (!(await layers()).some((l) => l.type === 'shape')) throw new Error('no shape layer');
});

await step('zoom shortcuts change and reset the zoom', async () => {
  const z0 = await page.evaluate(() => window.DesignShop.store.getState().zoom);
  await page.keyboard.down('Control');
  await page.keyboard.press('Equal');
  await page.keyboard.up('Control');
  await new Promise((r) => setTimeout(r, 350));
  const z1 = await page.evaluate(() => window.DesignShop.store.getState().zoom);
  if (Math.abs(z1 - z0) < 1e-6) throw new Error('zoom unchanged');
  await page.keyboard.down('Control');
  await page.keyboard.press('0');
  await page.keyboard.up('Control');
  await new Promise((r) => setTimeout(r, 350));
  const fit = await page.evaluate(() => window.DesignShop.store.getState().fitMode);
  if (!fit) throw new Error('fit mode not restored');
});

await step('every tool hotkey selects a tool', async () => {
  for (const k of ['v', 'm', 'l', 'w', 'c', 'b', 'e', 't', 'u', 'y', 'h', 'z']) {
    await page.keyboard.press(k);
    await new Promise((r) => setTimeout(r, 80));
    const tool = await page.evaluate(() => window.DesignShop.store.getState().activeTool);
    if (!tool) throw new Error('no tool for ' + k);
  }
});

await step('export dialog renders a real preview image', async () => {
  await page.evaluate(() => window.DesignShop.store.openDialog('export'));
  await new Promise((r) => setTimeout(r, 1200));
  const ok = await page.evaluate(() => {
    const img = document.querySelector('.export-preview img');
    return !!img && img.naturalWidth > 100 && img.naturalHeight > 100;
  });
  await page.evaluate(() => window.DesignShop.store.closeDialog('export'));
  if (!ok) throw new Error('preview missing or empty');
});

await step('Persian switches the layout to RTL', async () => {
  await page.evaluate(() => window.DesignShop.store.setLang('fa'));
  await new Promise((r) => setTimeout(r, 500));
  const dir = await page.evaluate(() => getComputedStyle(document.querySelector('.app')).direction);
  await page.evaluate(() => window.DesignShop.store.setLang('en'));
  await new Promise((r) => setTimeout(r, 300));
  if (dir !== 'rtl') throw new Error('direction=' + dir);
});

await step('assistant answers a Persian request', async () => {
  await page.evaluate(() => window.DesignShop.store.setLang('fa'));
  await page.evaluate(() => window.DesignShop.store.openDialog('wizard'));
  await new Promise((r) => setTimeout(r, 500));
  await page.click('.wizard-input input');
  await page.type('.wizard-input input', 'سیاه و سفید کن', { delay: 6 });
  await page.keyboard.press('Enter');
  await new Promise((r) => setTimeout(r, 1400));
  const bubbles = await page.evaluate(() => document.querySelectorAll('.wizard [class*="bubble"], .wizard [class*="msg"]').length);
  await page.evaluate(() => {
    window.DesignShop.store.closeDialog('wizard');
    window.DesignShop.store.setLang('en');
  });
  if (!bubbles) throw new Error('no chat bubbles');
});

await step('undo then redo returns to the same layer count', async () => {
  const before = (await layers()).length;
  await page.keyboard.down('Control');
  await page.keyboard.press('z');
  await page.keyboard.up('Control');
  await new Promise((r) => setTimeout(r, 350));
  await page.keyboard.down('Control');
  await page.keyboard.down('Shift');
  await page.keyboard.press('z');
  await page.keyboard.up('Shift');
  await page.keyboard.up('Control');
  await new Promise((r) => setTimeout(r, 450));
  const after = (await layers()).length;
  if (after !== before) throw new Error(`${before} -> ${after}`);
});

await step('no console or page errors during the whole session', async () => {
  if (pageErrors.length) throw new Error(pageErrors.slice(0, 3).join(' | '));
});

await browser.close();

console.log('');
if (failures.length) {
  console.log(`${pass} passed, ${failures.length} failed`);
  failures.forEach((f) => console.log(' - ' + f));
  process.exit(1);
}
console.log(`${pass} passed, 0 failed`);
