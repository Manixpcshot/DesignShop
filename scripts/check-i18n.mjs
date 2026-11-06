// Fails when en/fa dictionaries drift apart, or when the UI uses unknown keys.
import fs from 'node:fs';
import path from 'node:path';

const i18nSource = fs.readFileSync('src/lib/i18n.js', 'utf8');
const keys = { en: new Set(), fa: new Set() };

// very small parser: find `const en = {` ... `};` blocks and collect quoted keys
for (const lang of ['en', 'fa']) {
  const start = i18nSource.indexOf(`const ${lang} = {`);
  if (start < 0) throw new Error(`dictionary ${lang} not found`);
  const end = i18nSource.indexOf('\n};', start);
  const block = i18nSource.slice(start, end);
  for (const m of block.matchAll(/^\s*'([^']+)':/gm)) keys[lang].add(m[1]);
}

const missingInFa = [...keys.en].filter((k) => !keys.fa.has(k));
const extraInFa = [...keys.fa].filter((k) => !keys.en.has(k));

let problems = 0;
if (missingInFa.length) {
  problems += missingInFa.length;
  console.error(`✗ ${missingInFa.length} keys missing from fa:`, missingInFa.slice(0, 12).join(', '));
}
if (extraInFa.length) {
  problems += extraInFa.length;
  console.error(`✗ ${extraInFa.length} fa-only keys:`, extraInFa.slice(0, 12).join(', '));
}

// collect t('...') usages from the source tree
const used = new Set();
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (/\.(jsx?|mjs)$/.test(entry.name)) {
      const src = fs.readFileSync(p, 'utf8');
      for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) used.add(m[1]);
    }
  }
};
walk('src');

// dynamic families used with template strings
const dynamicPrefixes = [
  'tool.', 'tool.help.', 'size.', 'layers.type.', 'blend.', 'adj.', 'preset.',
  'text.style.', 'studio.kit.', 'studio.addon.', 'fx.emojiGroup.', 'text.align.',
  'size.group.', 'tpl.category.', 'pref.theme.', 'menu.',
];

const unknown = [...used].filter((k) => !keys.en.has(k) && !dynamicPrefixes.some((p) => k.startsWith(p)));
if (unknown.length) {
  problems += unknown.length;
  console.error(`✗ ${unknown.length} unknown keys used in UI:`, unknown.join(', '));
}

console.log(`i18n: ${keys.en.size} English keys, ${keys.fa.size} Persian keys, ${used.size} used in code`);
process.exit(problems ? 1 : 0);
