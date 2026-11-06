// The DesignShop Assistant: turns plain-language requests (English or فارسی)
// into editor actions. Deliberately rule based — instant, offline, no API key.
import {
  getState,
  newDocument,
  applyKit,
  applyStyleToSelection,
  applyBackgroundPreset,
  addAddon,
  addEmoji,
  addNewLayer,
  activeLayer,
  updateLayer,
  applyQuickEffect,
  setTool,
  setPanel,
  openDialog,
  resizeCanvas,
  undo,
} from './store.js';
import { BACKGROUNDS, SIZE_PRESETS } from './presets.js';
import { FILTER_PRESETS } from './filters.js';
import { quickExport } from './actions.js';

const has = (text, words) => words.some((w) => text.includes(w));

const PERSIAN = /[\u0600-\u06FF]/;

const SIZE_WORDS = [
  { words: ['youtube thumbnail', 'تامنیل یوتیوب', 'یوتیوب'], size: 'youtube' },
  { words: ['short', 'shorts', 'شورت', 'ریلز', 'reels', 'tiktok', 'تیک'], size: 'youtubeShort' },
  { words: ['story', 'stories', 'استوری'], size: 'instagramStory' },
  { words: ['instagram post', 'insta', 'پست اینستاگرام', 'اینستاگرام'], size: 'instagramPost' },
  { words: ['facebook', 'فیسبوک'], size: 'facebookPost' },
  { words: ['twitter', 'x post', 'توییتر'], size: 'xPost' },
  { words: ['linkedin', 'لینکدین'], size: 'linkedin' },
  { words: ['pinterest', 'پینترست'], size: 'pinterest' },
  { words: ['profile', 'avatar', 'logo', 'پروفایل', 'لوگو'], size: 'avatar' },
  { words: ['a4', 'print', 'چاپ'], size: 'a4' },
  { words: ['wallpaper', 'دسکتاپ', 'والپیپر'], size: 'desktop' },
];

const KIT_WORDS = [
  { words: ['neon', 'نئون'], kit: 'neon' },
  { words: ['bold', 'yellow', 'زرد'], kit: 'bold' },
  { words: ['gaming', 'game', 'گیم', 'گیمینگ'], kit: 'gaming' },
  { words: ['tutorial', 'آموزش'], kit: 'tutorial' },
  { words: ['vlog', 'ولاگ'], kit: 'vlog' },
  { words: ['podcast', 'پادکست'], kit: 'podcast' },
  { words: ['sale', 'discount', 'حراج', 'تخفیف'], kit: 'sale' },
  { words: ['minimal', 'مینیمال'], kit: 'minimal' },
  { words: ['reaction', 'واکنش'], kit: 'reaction' },
  { words: ['news', 'خبر'], kit: 'news' },
];

const STYLE_WORDS = [
  { words: ['neon', 'نئون'], style: 'neon' },
  { words: ['3d', 'سه بعدی', 'سه‌بعدی'], style: 'shadow3d' },
  { words: ['chrome', 'کروم'], style: 'chrome' },
  { words: ['gold', 'golden', 'طلایی'], style: 'gold' },
  { words: ['gradient', 'گرادیان'], style: 'gradient' },
  { words: ['outline', 'stroke', 'حاشیه'], style: 'outline' },
  { words: ['comic', 'کمیک'], style: 'comic' },
  { words: ['fire', 'آتش'], style: 'fire' },
  { words: ['meme', 'میم'], style: 'meme' },
  { words: ['sticker', 'استیکر'], style: 'sticker' },
  { words: ['retro', '80', 'رترو'], style: 'retro80' },
  { words: ['glass', 'شیشه'], style: 'glassText' },
  { words: ['holo', 'هولو'], style: 'holo' },
  { words: ['glow', 'درخشش'], style: 'glowWhite' },
  { words: ['red alert', 'قرمز'], style: 'redAlert' },
  { words: ['clean', 'simple', 'ساده'], style: 'clean' },
];

const FILTER_WORDS = [
  { words: ['black and white', 'black & white', 'grayscale', 'mono', 'سیاه و سفید', 'سیاه سفید'], adj: { grayscale: 100, contrast: 12 } },
  { words: ['invert', 'negative', 'معکوس'], adj: { invert: 100 } },
  { words: ['sepia', 'سپیا', 'vintage'], adj: { sepia: 70 } },
  { words: ['blur', 'محو'], adj: { blur: 5 } },
  { words: ['sharpen', 'واضح'], adj: { sharpen: 45 } },
  { words: ['pixel', 'پیکسل'], adj: { pixelate: 8 } },
  { words: ['noise', 'grain', 'نویز'], adj: { noise: 28 } },
  { words: ['vignette', 'وینیت'], adj: { vignette: 50 } },
  { words: ['duotone', 'دورنگ'], adj: { duotone: 100, duotoneA: '#1f1b4d', duotoneB: '#ff7a59' } },
  { words: ['cinematic', 'سینمایی'], preset: 'cinematic' },
  { words: ['vivid', 'زنده'], preset: 'vivid' },
  { words: ['warm', 'گرم'], preset: 'warm' },
  { words: ['cold', 'cool', 'سرد'], preset: 'cold' },
  { words: ['retro look'], preset: 'retro' },
  { words: ['pop art', 'پاپ'], preset: 'pop' },
];

const BG_WORDS = [
  { words: ['dark', 'تیره', 'black'], bg: 'black' },
  { words: ['white', 'سفید'], bg: 'white' },
  { words: ['mint', 'نعنایی'], bg: 'mint' },
  { words: ['sunset', 'غروب'], bg: 'sunset' },
  { words: ['purple', 'بنفش'], bg: 'purple' },
  { words: ['gold', 'طلایی'], bg: 'gold' },
  { words: ['grid', 'شبکه'], bg: 'neonGrid' },
  { words: ['dots', 'نقطه'], bg: 'dots' },
  { words: ['stripes', 'راه راه'], bg: 'stripes' },
  { words: ['blob', 'blobs', 'رنگی'], bg: 'blobs' },
];

function say(text) {
  return { role: 'bot', text };
}

function action(label, meta = {}) {
  return { role: 'bot', text: label, ...meta };
}

/** Main entry: returns { messages: [...], actions: n } */
export function runWizard(input, t) {
  const raw = String(input || '').trim();
  const text = raw.toLowerCase();
  const messages = [];
  if (!text) return { messages };

  const st = getState();
  let acted = 0;

  const ensureDoc = (sizeId) => {
    const preset = SIZE_PRESETS.find((s) => s.id === sizeId) || SIZE_PRESETS[0];
    if (!st.doc) {
      newDocument({ w: preset.w, h: preset.h, name: t(`size.${preset.id}`), background: '#0b1020' });
      acted += 1;
      return true;
    }
    if (preset.w !== st.doc.w || preset.h !== st.doc.h) {
      // beginners prefer it just works, so resize (undoable) instead of asking
      resizeCanvas(preset.w, preset.h, { scaleLayers: true });
      acted += 1;
      return true;
    }
    return false;
  };

  // 1. export
  if (has(text, ['export', 'save as image', 'png', 'jpg', 'خروجی', 'ذخیره کن'])) {
    const st2 = getState();
    if (!st2.doc) return { messages: [say(t('misc.noSelection'))] };
    if (has(text, ['all size', 'social', 'همه اندازه'])) {
      openDialog('social');
      return { messages: [say(t('export.socialSub'))], actions: 1 };
    }
    if (has(text, ['png'])) {
      quickExport();
      return { messages: [say(t('toast.exported'))], actions: 1 };
    }
    openDialog('export');
    return { messages: [say(t('export.sub'))], actions: 1 };
  }

  // 2. new design / size
  const sizeHit = SIZE_WORDS.find((s) => has(text, s.words));
  const wantsNew = has(text, ['new', 'create', 'make', 'build', 'بساز', 'جدید', 'طراحی کن', 'می‌خوام', 'میخوام']);
  if (sizeHit && (wantsNew || !st.doc)) {
    const preset = SIZE_PRESETS.find((s) => s.id === sizeHit.size);
    newDocument({ w: preset.w, h: preset.h, name: t(`size.${preset.id}`), background: '#0b1020' });
    messages.push(say(`${t('toast.newDesign')} — ${preset.w}×${preset.h}`));
    acted += 1;
    const kitHit0 = KIT_WORDS.find((k) => has(text, k.words));
    if (kitHit0) {
      applyKit(kitHit0.kit);
      messages.push(say(t('studio.kitApplied')));
    }
    return { messages, actions: acted };
  }

  // 3. kits
  const kitHit = KIT_WORDS.find((k) => has(text, k.words));
  if (kitHit && has(text, ['kit', 'look', 'style', 'apply', 'use', 'کیت', 'اعمال', 'استایل'])) {
    if (!st.doc) {
      const preset = SIZE_PRESETS[0];
      newDocument({ w: preset.w, h: preset.h, name: t('size.youtube'), background: '#0b1020' });
    }
    applyKit(kitHit.kit);
    setPanel('studio');
    return { messages: [say(`${t('studio.kitApplied')} — ${t(`studio.kit.${kitHit.kit}`)}`)], actions: 1 };
  }

  // 4. text styles
  const styleHit = STYLE_WORDS.find((s) => has(text, s.words));
  if (styleHit && (has(text, ['style', 'text', 'title', 'headline', 'متن', 'استایل', 'عنوان', 'تیتر']) || styleHit.words.some((w) => text === w))) {
    if (!st.doc) return { messages: [say(t('misc.noSelection'))] };
    const layer = activeLayer();
    if (!layer || layer.type !== 'text') {
      addNewLayer('text');
    }
    applyStyleToSelection(styleHit.style);
    setPanel('text');
    return { messages: [say(`${t('studio.styleApplied')} — ${t(`text.style.${styleHit.style}`)}`)], actions: 1 };
  }

  // 5. filters
  const filterHit = FILTER_WORDS.find((f) => has(text, f.words));
  if (filterHit) {
    if (!st.doc) return { messages: [say(t('misc.noSelection'))] };
    const layer = activeLayer();
    if (!layer) return { messages: [say(t('opt.selectLayer'))] };
    const adj = filterHit.adj || FILTER_PRESETS.find((p) => p.id === filterHit.preset)?.adj || {};
    updateLayer(layer.id, { adj: { ...(layer.adj || {}), ...adj } }, { label: 'Filter' });
    setPanel('adjust');
    return { messages: [say(t('adj.appliedTo'))], actions: 1 };
  }

  // 6. background
  const bgHit = BG_WORDS.find((b) => has(text, b.words));
  if (bgHit && has(text, ['background', 'bg', 'پس زمینه', 'پس‌زمینه', 'زمینه'])) {
    if (!st.doc) return { messages: [say(t('misc.noSelection'))] };
    const bg = BACKGROUNDS.find((b) => b.id === bgHit.bg);
    if (bg) applyBackgroundPreset(bg);
    return { messages: [say(t('studio.bgApplied'))], actions: 1 };
  }

  // 7. effects
  if (has(text, ['shadow', 'سایه'])) {
    if (!st.doc) return { messages: [say(t('misc.noSelection'))] };
    applyQuickEffect({ shadow: { on: true, x: 0, y: 10, blur: 26, color: '#000000', opacity: 55 } });
    return { messages: [say(t('studio.styleApplied'))], actions: 1 };
  }
  if (has(text, ['glow', 'neon', 'درخشش', 'نئون'])) {
    if (!st.doc) return { messages: [say(t('misc.noSelection'))] };
    applyQuickEffect({ glow: { on: true, color: '#12d8ff', blur: 30, opacity: 90, spread: 3 } });
    return { messages: [say(t('studio.styleApplied'))], actions: 1 };
  }
  if (has(text, ['border', 'stroke', 'outline', 'حاشیه', 'قاب'])) {
    if (!st.doc) return { messages: [say(t('misc.noSelection'))] };
    applyQuickEffect({ stroke: { on: true, width: 8, color: '#ffffff', opacity: 100 } });
    return { messages: [say(t('studio.styleApplied'))], actions: 1 };
  }
  if (has(text, ['rounded', 'radius', 'گرد'])) {
    if (!st.doc) return { messages: [say(t('misc.noSelection'))] };
    applyQuickEffect({ radius: { on: true, radius: 28 } });
    return { messages: [say(t('studio.styleApplied'))], actions: 1 };
  }

  // 8. add-ons / stickers
  if (has(text, ['arrow', 'فلش'])) {
    if (!st.doc) return { messages: [say(t('misc.noSelection'))] };
    addAddon('arrow');
    setPanel('studio');
    return { messages: [say(t('studio.addons'))], actions: 1 };
  }
  if (has(text, ['sticker', 'emoji', 'استیکر', 'ایموجی'])) {
    if (!st.doc) return { messages: [say(t('misc.noSelection'))] };
    const emoji = EMOJI_SETS.find((s) => s.id === 'symbols').items[0];
    addEmoji('🔥');
    void emoji;
    return { messages: [say(t('toast.emojiAdded'))], actions: 1 };
  }
  if (has(text, ['badge', 'new badge', 'نشان'])) {
    if (!st.doc) return { messages: [say(t('misc.noSelection'))] };
    addAddon('badge');
    return { messages: [say(t('studio.addons'))], actions: 1 };
  }

  // 9. text content: "write X" / "text X" / بنویس
  const writeMatch = raw.match(/(?:write|text|headline|title|بنویس|متن)\s*[:"]?\s*(.+)$/i);
  if (writeMatch) {
    if (!st.doc) {
      const preset = SIZE_PRESETS[0];
      newDocument({ w: preset.w, h: preset.h, name: t('size.youtube'), background: '#0b1020' });
    }
    const content = writeMatch[1].replace(/^["']|["']$/g, '').trim();
    const layer = activeLayer();
    if (layer?.type === 'text') {
      updateLayer(layer.id, { text: content }, { label: 'Text', relayoutText: true });
    } else {
      const { createTextLayer } = window.DesignShop.documentLib;
      const { doc } = getState();
      const tl = createTextLayer(doc, { text: content, styleId: 'bold' });
      window.DesignShop.store.addLayer(tl, { label: 'Text' });
    }
    setPanel('text');
    return { messages: [say(`${t('toast.textAdded')}: “${content}”`)], actions: 1 };
  }

  // 10. tools
  const toolHints = [
    { words: ['crop', 'برش'], tool: 'crop' },
    { words: ['brush', 'paint', 'قلم'], tool: 'brush' },
    { words: ['eraser', 'پاک کن'], tool: 'eraser' },
    { words: ['text tool', 'ابزار متن'], tool: 'text' },
    { words: ['select', 'انتخاب'], tool: 'marquee' },
    { words: ['zoom', 'بزرگ'], tool: 'zoom' },
    { words: ['move', 'جابه'], tool: 'move' },
  ];
  const toolHit = toolHints.find((h) => has(text, h.words));
  if (toolHit) {
    setTool(toolHit.tool);
    return { messages: [say(t(`tool.help.${toolHit.tool}`) === `tool.help.${toolHit.tool}` ? t(`tool.${toolHit.tool}`) : t(`tool.help.${toolHit.tool}`))], actions: 1 };
  }

  // 11. help / explain
  if (has(text, ['help', 'help me', 'how', 'what can', 'راهنما', 'چیکار', 'چی کار', 'کمک'])) {
    return {
      messages: [
        say(
          `${t('wiz.helpTitle')}: ${t('wiz.help1')} · ${t('wiz.help2')} · ${t('wiz.help3')} · ${t('wiz.help4')} · ${t('wiz.help5')}`
        ),
      ],
    };
  }

  // 12. undo / reset
  if (has(text, ['undo', 'واگرد'])) {
    undo();
    return { messages: [say(t('toast.undone'))], actions: 1 };
  }

  // 13. "make a thumbnail" bare
  if (has(text, ['thumbnail', 'تامنیل', 'کاور']) && !st.doc) {
    newDocument({ w: 1280, h: 720, name: t('size.youtube'), background: '#0b1020' });
    applyKit(has(text, ['gaming', 'گیم']) ? 'gaming' : 'bold');
    return { messages: [say(t('studio.kitApplied'))], actions: 2 };
  }

  return {
    messages: [
      say(t('wiz.unknown')),
      action(t('wiz.suggestions'), { chips: [t('wiz.sug1'), t('wiz.sug2'), t('wiz.sug3'), t('wiz.sug5')] }),
    ],
  };
}

export { PERSIAN };
