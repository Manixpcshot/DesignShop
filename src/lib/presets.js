// DesignShop presets: canvas sizes, fonts, thumbnail text styles, kits,
// backgrounds, add-ons, emoji sets and templates.
// Pure data + tiny helpers — the editor turns these into layers.

export const SIZE_PRESETS = [
  { id: 'youtube', group: 'video', w: 1280, h: 720, icon: '▶︎' },
  { id: 'youtubeShort', group: 'video', w: 1080, h: 1920, icon: '▯' },
  { id: 'fullhd', group: 'video', w: 1920, h: 1080, icon: '▭' },
  { id: 'hd', group: 'video', w: 1280, h: 720, icon: '▭' },
  { id: 'instagramPost', group: 'social', w: 1080, h: 1080, icon: '◻' },
  { id: 'instagramPortrait', group: 'social', w: 1080, h: 1350, icon: '▯' },
  { id: 'instagramStory', group: 'social', w: 1080, h: 1920, icon: '▯' },
  { id: 'facebookPost', group: 'social', w: 1200, h: 630, icon: '▭' },
  { id: 'facebookCover', group: 'social', w: 1640, h: 664, icon: '▭' },
  { id: 'xPost', group: 'social', w: 1600, h: 900, icon: '▭' },
  { id: 'xHeader', group: 'social', w: 1500, h: 500, icon: '▭' },
  { id: 'linkedin', group: 'social', w: 1200, h: 627, icon: '▭' },
  { id: 'pinterest', group: 'social', w: 1000, h: 1500, icon: '▯' },
  { id: 'telegram', group: 'social', w: 1280, h: 720, icon: '▭' },
  { id: 'twitchBanner', group: 'social', w: 1200, h: 480, icon: '▭' },
  { id: 'twitchProfile', group: 'profile', w: 800, h: 800, icon: '◯' },
  { id: 'avatar', group: 'profile', w: 1024, h: 1024, icon: '◯' },
  { id: 'desktop', group: 'video', w: 2560, h: 1440, icon: '▭' },
  { id: 'a4', group: 'print', w: 2480, h: 3508, icon: '▯' },
  { id: 'custom', group: 'custom', w: 1280, h: 720, icon: '✎' },
];

export const SIZE_GROUPS = [
  { id: 'video', nameKey: 'size.group.video' },
  { id: 'social', nameKey: 'size.group.social' },
  { id: 'profile', nameKey: 'size.group.profile' },
  { id: 'print', nameKey: 'size.group.print' },
];

export const getSize = (id) => SIZE_PRESETS.find((s) => s.id === id) || SIZE_PRESETS[0];

export const FONT_LIST = [
  { id: 'anton', family: 'Anton', label: 'Anton', weights: [400], display: true, fa: false },
  { id: 'archivo', family: 'Archivo Black', label: 'Archivo Black', weights: [400], display: true, fa: false },
  { id: 'bebas', family: 'Bebas Neue', label: 'Bebas Neue', weights: [400], display: true, fa: false },
  { id: 'oswald', family: 'Oswald', label: 'Oswald', weights: [500, 700], display: true, fa: false },
  { id: 'poppins', family: 'Poppins', label: 'Poppins', weights: [600, 800], display: false, fa: false },
  { id: 'montserrat', family: 'Montserrat', label: 'Montserrat', weights: [700, 900], display: false, fa: false },
  { id: 'inter', family: 'Inter', label: 'Inter', weights: [400, 700, 900], display: false, fa: false },
  { id: 'space', family: 'Space Grotesk', label: 'Space Grotesk', weights: [700], display: false, fa: false },
  { id: 'playfair', family: 'Playfair Display', label: 'Playfair Display', weights: [700, 900], display: false, fa: false },
  { id: 'lobster', family: 'Lobster', label: 'Lobster', weights: [400], display: true, fa: false },
  { id: 'marker', family: 'Permanent Marker', label: 'Permanent Marker', weights: [400], display: true, fa: false },
  { id: 'orbitron', family: 'Orbitron', label: 'Orbitron', weights: [700], display: true, fa: false },
  { id: 'vazir', family: 'Vazirmatn', label: 'Vazirmatn — فارسی', weights: [400, 700], display: false, fa: true },
];

export const fontById = (id) => FONT_LIST.find((f) => f.id === id) || FONT_LIST[0];
export const fontCss = (id) => `"${fontById(id).family}", "Vazirmatn", system-ui, sans-serif`;

const grad = (colors, angle = 20) => ({ type: 'linear', colors, angle });

// ---------------------------------------------------------------- text styles
// sizePct is relative to the canvas's smaller side, so styles scale with size.
export const TEXT_STYLES = [
  {
    id: 'neon',
    nameKey: 'text.style.neon',
    font: 'anton',
    sizePct: 0.15,
    uppercase: true,
    weight: 400,
    fill: { color: '#eafcff' },
    effects: {
      glow: { on: true, color: '#12d8ff', blur: 26, opacity: 92, spread: 2 },
      shadow: { on: true, x: 0, y: 4, blur: 14, color: '#062a52', opacity: 70 },
      stroke: { on: false, width: 0, color: '#ffffff', opacity: 100 },
      radius: { on: false, radius: 0 },
    },
  },
  {
    id: 'bold',
    nameKey: 'text.style.bold',
    font: 'archivo',
    sizePct: 0.16,
    uppercase: true,
    weight: 400,
    fill: { color: '#ffe14d' },
    effects: {
      stroke: { on: true, width: 7, color: '#101010', opacity: 100 },
      shadow: { on: true, x: 9, y: 9, blur: 0, color: '#101010', opacity: 100 },
      glow: { on: false, color: '#ffffff', blur: 0, opacity: 0 },
      radius: { on: false, radius: 0 },
    },
  },
  {
    id: 'gradient',
    nameKey: 'text.style.gradient',
    font: 'montserrat',
    sizePct: 0.14,
    uppercase: true,
    weight: 900,
    fill: { color: '#ff2d95', gradient: grad(['#ff2d95', '#ffd166'], 15) },
    effects: {
      stroke: { on: true, width: 4, color: '#ffffff', opacity: 90 },
      shadow: { on: true, x: 0, y: 10, blur: 22, color: '#000000', opacity: 45 },
      glow: { on: false, color: '#ffffff', blur: 0, opacity: 0 },
      radius: { on: false, radius: 0 },
    },
  },
  {
    id: 'outline',
    nameKey: 'text.style.outline',
    font: 'bebas',
    sizePct: 0.17,
    uppercase: true,
    weight: 400,
    fill: { color: '#ffffff' },
    effects: {
      stroke: { on: true, width: 9, color: '#12141c', opacity: 100 },
      shadow: { on: true, x: 0, y: 6, blur: 18, color: '#000000', opacity: 35 },
      glow: { on: false, color: '#ffffff', blur: 0, opacity: 0 },
      radius: { on: false, radius: 0 },
    },
  },
  {
    id: 'shadow3d',
    nameKey: 'text.style.shadow3d',
    font: 'archivo',
    sizePct: 0.15,
    uppercase: true,
    weight: 400,
    fill: { color: '#ffffff' },
    effects: {
      stroke: { on: false, width: 0, color: '#ffffff', opacity: 100 },
      shadow: { on: true, x: 12, y: 14, blur: 0, color: '#4c8dff', opacity: 100 },
      glow: { on: false, color: '#ffffff', blur: 0, opacity: 0 },
      radius: { on: false, radius: 0 },
    },
  },
  {
    id: 'comic',
    nameKey: 'text.style.comic',
    font: 'bebas',
    sizePct: 0.18,
    uppercase: true,
    weight: 400,
    fill: { color: '#ffd23f' },
    effects: {
      stroke: { on: true, width: 6, color: '#141414', opacity: 100 },
      shadow: { on: true, x: 7, y: 7, blur: 0, color: '#141414', opacity: 100 },
      glow: { on: false, color: '#ffffff', blur: 0, opacity: 0 },
      radius: { on: false, radius: 0 },
    },
  },
  {
    id: 'chrome',
    nameKey: 'text.style.chrome',
    font: 'oswald',
    sizePct: 0.15,
    uppercase: true,
    weight: 700,
    fill: { color: '#dfe7f5', gradient: grad(['#ffffff', '#93a3bd', '#ffffff', '#5d6b85'], 90) },
    effects: {
      stroke: { on: true, width: 3, color: '#232b3b', opacity: 100 },
      shadow: { on: true, x: 0, y: 8, blur: 16, color: '#000000', opacity: 55 },
      glow: { on: false, color: '#ffffff', blur: 0, opacity: 0 },
      radius: { on: false, radius: 0 },
    },
  },
  {
    id: 'sticker',
    nameKey: 'text.style.sticker',
    font: 'poppins',
    sizePct: 0.13,
    uppercase: false,
    weight: 800,
    fill: { color: '#ffffff' },
    effects: {
      stroke: { on: true, width: 10, color: '#1f2430', opacity: 100 },
      glow: { on: true, color: '#ffffff', blur: 18, opacity: 80, spread: 2 },
      shadow: { on: false, x: 0, y: 6, blur: 16, color: '#000000', opacity: 40 },
      radius: { on: false, radius: 0 },
    },
  },
  {
    id: 'marker',
    nameKey: 'text.style.marker',
    font: 'marker',
    sizePct: 0.14,
    uppercase: false,
    weight: 400,
    fill: { color: '#fff6a5' },
    effects: {
      stroke: { on: true, width: 3, color: '#2a2418', opacity: 90 },
      shadow: { on: true, x: 0, y: 6, blur: 12, color: '#000000', opacity: 40 },
      glow: { on: false, color: '#ffffff', blur: 0, opacity: 0 },
      radius: { on: false, radius: 0 },
    },
  },
  {
    id: 'glowWhite',
    nameKey: 'text.style.glowWhite',
    font: 'poppins',
    sizePct: 0.13,
    uppercase: true,
    weight: 800,
    fill: { color: '#ffffff' },
    effects: {
      glow: { on: true, color: '#ffffff', blur: 34, opacity: 95, spread: 3 },
      shadow: { on: true, x: 0, y: 8, blur: 20, color: '#000000', opacity: 40 },
      stroke: { on: false, width: 0, color: '#ffffff', opacity: 100 },
      radius: { on: false, radius: 0 },
    },
  },
  {
    id: 'redAlert',
    nameKey: 'text.style.redAlert',
    font: 'archivo',
    sizePct: 0.16,
    uppercase: true,
    weight: 400,
    fill: { color: '#ff2b2b' },
    effects: {
      stroke: { on: true, width: 5, color: '#ffffff', opacity: 100 },
      glow: { on: true, color: '#ff2020', blur: 24, opacity: 70, spread: 2 },
      shadow: { on: true, x: 0, y: 8, blur: 14, color: '#000000', opacity: 50 },
      radius: { on: false, radius: 0 },
    },
  },
  {
    id: 'gold',
    nameKey: 'text.style.gold',
    font: 'playfair',
    sizePct: 0.13,
    uppercase: false,
    weight: 900,
    fill: { color: '#f7d774', gradient: grad(['#fff6c9', '#f3c94b', '#a9741a', '#ffe9a3'], 80) },
    effects: {
      stroke: { on: true, width: 3, color: '#5c4008', opacity: 100 },
      shadow: { on: true, x: 0, y: 10, blur: 18, color: '#000000', opacity: 50 },
      glow: { on: false, color: '#ffffff', blur: 0, opacity: 0 },
      radius: { on: false, radius: 0 },
    },
  },
  {
    id: 'holo',
    nameKey: 'text.style.holo',
    font: 'space',
    sizePct: 0.14,
    uppercase: true,
    weight: 700,
    fill: { color: '#7afcff', gradient: grad(['#7afcff', '#feff9c', '#ff7af0', '#7afcff'], 35) },
    effects: {
      glow: { on: true, color: '#b28dff', blur: 28, opacity: 80, spread: 2 },
      shadow: { on: true, x: 0, y: 8, blur: 18, color: '#1a0d33', opacity: 60 },
      stroke: { on: false, width: 0, color: '#ffffff', opacity: 100 },
      radius: { on: false, radius: 0 },
    },
  },
  {
    id: 'retro80',
    nameKey: 'text.style.retro80',
    font: 'orbitron',
    sizePct: 0.13,
    uppercase: true,
    weight: 700,
    fill: { color: '#ff6ec7', gradient: grad(['#ff6ec7', '#7873f5'], 45) },
    effects: {
      stroke: { on: true, width: 4, color: '#0b0620', opacity: 100 },
      shadow: { on: true, x: 8, y: 8, blur: 0, color: '#0b0620', opacity: 100 },
      glow: { on: true, color: '#00e5ff', blur: 20, opacity: 45, spread: 1 },
      radius: { on: false, radius: 0 },
    },
  },
  {
    id: 'clean',
    nameKey: 'text.style.clean',
    font: 'inter',
    sizePct: 0.075,
    uppercase: false,
    weight: 700,
    fill: { color: '#141821' },
    effects: {
      shadow: { on: false, x: 0, y: 4, blur: 10, color: '#000000', opacity: 20 },
      glow: { on: false, color: '#ffffff', blur: 0, opacity: 0 },
      stroke: { on: false, width: 0, color: '#ffffff', opacity: 100 },
      radius: { on: false, radius: 0 },
    },
  },
  {
    id: 'meme',
    nameKey: 'text.style.meme',
    font: 'archivo',
    sizePct: 0.13,
    uppercase: true,
    weight: 400,
    fill: { color: '#ffffff' },
    effects: {
      stroke: { on: true, width: 7, color: '#000000', opacity: 100 },
      shadow: { on: true, x: 0, y: 5, blur: 10, color: '#000000', opacity: 60 },
      glow: { on: false, color: '#ffffff', blur: 0, opacity: 0 },
      radius: { on: false, radius: 0 },
    },
  },
  {
    id: 'glassText',
    nameKey: 'text.style.glassText',
    font: 'montserrat',
    sizePct: 0.12,
    uppercase: false,
    weight: 700,
    fill: { color: '#ffffff' },
    effects: {
      stroke: { on: true, width: 2, color: 'rgba(255,255,255,0.95)', opacity: 100 },
      glow: { on: true, color: '#9fd8ff', blur: 24, opacity: 55, spread: 3 },
      shadow: { on: true, x: 0, y: 6, blur: 16, color: '#0a1b2e', opacity: 45 },
      radius: { on: false, radius: 0 },
    },
  },
  {
    id: 'fire',
    nameKey: 'text.style.fire',
    font: 'anton',
    sizePct: 0.16,
    uppercase: true,
    weight: 400,
    fill: { color: '#ffb42e', gradient: grad(['#fff0a8', '#ffd23f', '#ff7a18', '#ff3d00'], 90) },
    effects: {
      glow: { on: true, color: '#ff5a00', blur: 30, opacity: 85, spread: 3 },
      stroke: { on: true, width: 4, color: '#4a1000', opacity: 90 },
      shadow: { on: true, x: 0, y: 10, blur: 20, color: '#200600', opacity: 60 },
      radius: { on: false, radius: 0 },
    },
  },
];

export const styleById = (id) => TEXT_STYLES.find((s) => s.id === id) || TEXT_STYLES[0];

// ------------------------------------------------------------- quick fx presets
export const QUICK_FX = [
  { id: 'none', nameKey: 'fx.none', effects: {} },
  {
    id: 'shadowSoft',
    nameKey: 'fx.shadowSoft',
    effects: { shadow: { on: true, x: 0, y: 10, blur: 26, color: '#000000', opacity: 50 } },
  },
  {
    id: 'shadowHard',
    nameKey: 'fx.shadowHard',
    effects: { shadow: { on: true, x: 10, y: 10, blur: 0, color: '#000000', opacity: 100 } },
  },
  {
    id: 'neon',
    nameKey: 'fx.neon',
    effects: { glow: { on: true, color: '#00e5ff', blur: 28, opacity: 90, spread: 3 } },
  },
  {
    id: 'outline',
    nameKey: 'fx.outline',
    effects: { stroke: { on: true, width: 8, color: '#ffffff', opacity: 100 } },
  },
  {
    id: 'glass',
    nameKey: 'fx.glass',
    effects: {
      stroke: { on: true, width: 2, color: 'rgba(255,255,255,0.8)', opacity: 100 },
      shadow: { on: true, x: 0, y: 12, blur: 30, color: '#001b33', opacity: 35 },
      radius: { on: true, radius: 26 },
    },
  },
  {
    id: 'pill',
    nameKey: 'fx.pill',
    effects: {
      shadow: { on: true, x: 0, y: 8, blur: 22, color: '#000000', opacity: 45 },
      radius: { on: true, radius: 999 },
      stroke: { on: true, width: 2, color: 'rgba(255,255,255,0.5)', opacity: 100 },
    },
  },
];

// ------------------------------------------------------------------ backgrounds
const bg = (id, nameKey, type, colors, extra = {}) => ({
  id,
  nameKey,
  kind: type,
  colors,
  angle: 135,
  ...extra,
});

export const BACKGROUNDS = [
  bg('deep', 'Deep blue', 'linear', ['#050b1e', '#123a6b', '#1e6fb8']),
  bg('sunset', 'Sunset', 'linear', ['#ff512f', '#f09819', '#ffd86f']),
  bg('candy', 'Candy', 'linear', ['#ff2d95', '#7b2ff7', '#00d4ff']),
  bg('neonGrid', 'Neon grid', 'pattern', ['#08080f', '#141428'], { pattern: 'grid', glow: '#00e5ff' }),
  bg('gaming', 'Gaming', 'radial', ['#2a0a5e', '#0b0620']),
  bg('studio', 'Studio', 'radial', ['#1b1f2b', '#07080c']),
  bg('mint', 'Mint', 'linear', ['#d9f7e4', '#8ee3c0', '#3bb98d']),
  bg('paper', 'Paper', 'solid', ['#f6f1e7']),
  bg('carbon', 'Carbon', 'pattern', ['#15171c', '#0b0c10'], { pattern: 'carbon' }),
  bg('dots', 'Dots', 'pattern', ['#101422', '#0a0c14'], { pattern: 'dots', glow: '#3355ff' }),
  bg('fire', 'Fire', 'linear', ['#200600', '#7a1500', '#ff6a00']),
  bg('ice', 'Ice', 'linear', ['#eaf6ff', '#a8d8ff', '#4f9bff']),
  bg('gold', 'Gold', 'linear', ['#2b1d05', '#8a5c10', '#f6d170']),
  bg('purple', 'Purple haze', 'linear', ['#1a0b2e', '#5b1d9c', '#b06cff']),
  bg('white', 'White', 'solid', ['#ffffff']),
  bg('black', 'Black', 'solid', ['#000000']),
  bg('blobs', 'Color blobs', 'pattern', ['#0b1020', '#0b1020'], { pattern: 'blobs' }),
  bg('stripes', 'Stripes', 'pattern', ['#0f172a', '#0b1120'], { pattern: 'stripes', glow: '#38bdf8' }),
];

// ----------------------------------------------------------------------- addons
export const ADDONS = [
  { id: 'arrow', nameKey: 'studio.addon.arrow', shape: 'arrow', color: '#ff3b30', x: 0.66, y: 0.67, w: 0.3, h: 0.22, rotation: -14 },
  { id: 'circle', nameKey: 'studio.addon.circle', shape: 'ellipse', color: 'rgba(255,59,48,0.9)', fill: false, strokeWidth: 14, x: 0.18, y: 0.34, w: 0.26, h: 0.26 },
  { id: 'underline', nameKey: 'studio.addon.underline', shape: 'brushUnderline', color: '#ffe14d', x: 0.16, y: 0.66, w: 0.5, h: 0.05 },
  { id: 'badge', nameKey: 'studio.addon.badge', shape: 'rect', text: 'NEW', color: '#ff2d55', x: 0.62, y: 0.1, w: 0.26, h: 0.13, radius: 16, labelColor: '#ffffff' },
  { id: 'frame', nameKey: 'studio.addon.frame', shape: 'frame', color: '#ffffff', x: 0.03, y: 0.03, w: 0.94, h: 0.94, radius: 24, strokeWidth: 10 },
  { id: 'starburst', nameKey: 'studio.addon.starburst', shape: 'burst', color: '#ffd23f', x: 0.72, y: 0.06, w: 0.25, h: 0.32 },
  { id: 'speech', nameKey: 'studio.addon.speech', shape: 'bubble', color: '#ffffff', text: 'WOW!', labelColor: '#141821', x: 0.62, y: 0.12, w: 0.31, h: 0.22 },
  { id: 'countdown', nameKey: 'studio.addon.countdown', shape: 'ellipse', text: '3', color: '#ff3b30', labelColor: '#ffffff', x: 0.76, y: 0.12, w: 0.17, h: 0.24, strokeWidth: 8 },
  { id: 'redbox', nameKey: 'studio.addon.redbox', shape: 'rect', color: 'rgba(255,59,48,0.95)', x: 0.08, y: 0.42, w: 0.4, h: 0.18, radius: 8 },
  { id: 'sparkle', nameKey: 'studio.addon.sparkle', shape: 'sparkle', color: '#ffffff', x: 0.42, y: 0.22, w: 0.16, h: 0.16 },
  { id: 'progress', nameKey: 'studio.addon.progress', shape: 'progress', color: '#22c55e', x: 0.1, y: 0.86, w: 0.8, h: 0.05 },
  { id: 'emoji', nameKey: 'studio.addon.emoji', shape: 'emoji', text: '🔥', x: 0.8, y: 0.72, w: 0.17, h: 0.24 },
];

// ------------------------------------------------------------------ emoji sets
export const EMOJI_SETS = [
  {
    id: 'faces',
    nameKey: 'fx.emojiGroup.faces',
    items: ['😀', '😂', '😍', '😮', '😱', '🤯', '😎', '🥳', '🤔', '😭', '😡', '🤩', '🫡', '🙄', '🤫', '🥺'],
  },
  {
    id: 'symbols',
    nameKey: 'fx.emojiGroup.symbols',
    items: ['🔥', '💥', '⚡', '✨', '⭐', '🌟', '💯', '✅', '❌', '❗', '❓', '💡', '🎯', '🏆', '👑', '💎'],
  },
  {
    id: 'arrows',
    nameKey: 'fx.emojiGroup.arrows',
    items: ['➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '🔄', '➰', '🔴', '🟡', '🟢', '🔵', '🟣', '⚫'],
  },
  {
    id: 'objects',
    nameKey: 'fx.emojiGroup.objects',
    items: ['🎮', '🕹️', '📱', '💻', '🎧', '🎤', '📸', '🎬', '🎨', '🖌️', '📦', '🛒', '💰', '🚀', '🧠', '🛠️'],
  },
  {
    id: 'badges',
    nameKey: 'fx.emojiGroup.badges',
    items: ['🆕', '🔥', '💯', '🅿️', '🆓', '🆒', '🈶', '🈚', '🔝', '🈁', '🉐', '㊗️', '㊙️', '🈺', '🔞', '‼️'],
  },
  {
    id: 'numbers',
    nameKey: 'fx.emojiGroup.numbers',
    items: ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '💲', '➕', '➖', '✖️', '➗', '🟰'],
  },
];

// ----------------------------------------------------------------------- kits
// A kit = background + a headline style + optional accents. One click, whole look.
export const KITS = [
  {
    id: 'neon',
    nameKey: 'studio.kit.neon',
    background: { kind: 'pattern', colors: ['#070a18', '#0d1330'], pattern: 'grid', glow: '#12d8ff' },
    headlineStyle: 'neon',
    headline: 'YOUR TITLE',
    accent: '#12d8ff',
    addons: ['underline'],
    textColor: '#eafcff',
  },
  {
    id: 'bold',
    nameKey: 'studio.kit.bold',
    background: { kind: 'linear', colors: ['#161922', '#05070c'], angle: 135 },
    headlineStyle: 'bold',
    headline: 'BIG NEWS',
    accent: '#ffd23f',
    addons: ['arrow'],
    textColor: '#ffd23f',
  },
  {
    id: 'gaming',
    nameKey: 'studio.kit.gaming',
    background: { kind: 'radial', colors: ['#5b1d9c', '#0b0620'] },
    headlineStyle: 'retro80',
    headline: 'GAME OVER',
    accent: '#b06cff',
    addons: ['starburst'],
    textColor: '#ffffff',
  },
  {
    id: 'tutorial',
    nameKey: 'studio.kit.tutorial',
    background: { kind: 'linear', colors: ['#f7fbff', '#dbeafe'], angle: 160 },
    headlineStyle: 'clean',
    headline: 'How to design',
    accent: '#2563eb',
    addons: ['progress'],
    textColor: '#0f172a',
  },
  {
    id: 'vlog',
    nameKey: 'studio.kit.vlog',
    background: { kind: 'linear', colors: ['#ff8a5b', '#ff4f81', '#7b2ff7'], angle: 130 },
    headlineStyle: 'gradient',
    headline: 'DAY IN MY LIFE',
    accent: '#ffffff',
    addons: ['sparkle'],
    textColor: '#ffffff',
  },
  {
    id: 'podcast',
    nameKey: 'studio.kit.podcast',
    background: { kind: 'radial', colors: ['#1b1f2b', '#05060a'] },
    headlineStyle: 'gold',
    headline: 'THE SHOW',
    accent: '#f3c94b',
    addons: ['frame'],
    textColor: '#f7d774',
  },
  {
    id: 'sale',
    nameKey: 'studio.kit.sale',
    background: { kind: 'linear', colors: ['#ff2d55', '#ff6a00'], angle: 45 },
    headlineStyle: 'bold',
    headline: '50% OFF',
    accent: '#ffffff',
    addons: ['badge'],
    textColor: '#fff7cc',
  },
  {
    id: 'minimal',
    nameKey: 'studio.kit.minimal',
    background: { kind: 'solid', colors: ['#fbfbfd'] },
    headlineStyle: 'clean',
    headline: 'Less, but better',
    accent: '#111827',
    addons: [],
    textColor: '#111827',
  },
  {
    id: 'reaction',
    nameKey: 'studio.kit.reaction',
    background: { kind: 'linear', colors: ['#0b1020', '#1b2450'], angle: 200 },
    headlineStyle: 'meme',
    headline: 'WAIT WHAT?!',
    accent: '#ffe14d',
    addons: ['circle'],
    textColor: '#ffffff',
  },
  {
    id: 'news',
    nameKey: 'studio.kit.news',
    background: { kind: 'linear', colors: ['#0a0a0a', '#1c1c1c'], angle: 180 },
    headlineStyle: 'redAlert',
    headline: 'BREAKING',
    accent: '#ff2b2b',
    addons: ['redbox'],
    textColor: '#ffffff',
  },
];

export const kitById = (id) => KITS.find((k) => k.id === id) || KITS[0];

// ------------------------------------------------------------------ templates
// Templates = a size + a kit + a headline. Small, consistent, always editable.
export const TEMPLATES = [
  { id: 'youtubeBold', nameKey: 'tpl.youtubeBold', category: 'youtube', size: 'youtube', kit: 'bold', headline: 'WATCH THIS' },
  { id: 'youtubeNeon', nameKey: 'tpl.youtubeNeon', category: 'youtube', size: 'youtube', kit: 'neon', headline: 'NEW VIDEO' },
  { id: 'tutorial', nameKey: 'tpl.tutorial', category: 'youtube', size: 'youtube', kit: 'tutorial', headline: 'Learn in 10 minutes' },
  { id: 'gaming', nameKey: 'tpl.gaming', category: 'youtube', size: 'youtube', kit: 'gaming', headline: 'RANKED #1' },
  { id: 'reaction', nameKey: 'tpl.countdown', category: 'youtube', size: 'youtube', kit: 'reaction', headline: 'TOP 5' },
  { id: 'podcast', nameKey: 'tpl.podcast', category: 'youtube', size: 'instagramPost', kit: 'podcast', headline: 'EPISODE 12' },
  { id: 'instaPost', nameKey: 'tpl.instaPost', category: 'social', size: 'instagramPost', kit: 'minimal', headline: 'New drop' },
  { id: 'story', nameKey: 'tpl.story', category: 'social', size: 'instagramStory', kit: 'vlog', headline: 'SWIPE UP' },
  { id: 'shorts', nameKey: 'tpl.shorts', category: 'social', size: 'youtubeShort', kit: 'neon', headline: 'PART 1' },
  { id: 'sale', nameKey: 'tpl.sale', category: 'promo', size: 'facebookPost', kit: 'sale', headline: 'BLACK FRIDAY' },
  { id: 'news', nameKey: 'tpl.news', category: 'promo', size: 'xPost', kit: 'news', headline: 'BREAKING NEWS' },
  { id: 'quote', nameKey: 'tpl.quote', category: 'basic', size: 'instagramPost', kit: 'minimal', headline: '“Simplicity is the ultimate sophistication.”' },
  { id: 'logo', nameKey: 'tpl.logo', category: 'basic', size: 'avatar', kit: 'gaming', headline: 'DS' },
  { id: 'beforeAfter', nameKey: 'tpl.beforeAfter', category: 'basic', size: 'youtube', kit: 'tutorial', headline: 'BEFORE / AFTER' },
];

export const TEMPLATE_CATEGORIES = [
  { id: 'all', nameKey: 'tpl.category.all' },
  { id: 'youtube', nameKey: 'tpl.category.youtube' },
  { id: 'social', nameKey: 'tpl.category.social' },
  { id: 'promo', nameKey: 'tpl.category.promo' },
  { id: 'basic', nameKey: 'tpl.category.basic' },
];

// -------------------------------------------------------------- social export set
export const SOCIAL_EXPORT = [
  { id: 'youtube', w: 1280, h: 720 },
  { id: 'youtubeShort', w: 1080, h: 1920 },
  { id: 'instagramPost', w: 1080, h: 1080 },
  { id: 'instagramStory', w: 1080, h: 1920 },
  { id: 'facebookPost', w: 1200, h: 630 },
  { id: 'xPost', w: 1600, h: 900 },
  { id: 'linkedin', w: 1200, h: 627 },
  { id: 'pinterest', w: 1000, h: 1500 },
  { id: 'avatar', w: 1024, h: 1024 },
];

export const COLOR_SWATCHES = [
  '#000000', '#ffffff', '#ff3b30', '#ff9500', '#ffd23f', '#34c759', '#00c7be', '#0a84ff',
  '#5e5ce6', '#bf5af2', '#ff2d95', '#12d8ff', '#8b5cf6', '#22c55e', '#f97316', '#e11d48',
  '#111827', '#374151', '#6b7280', '#9ca3af', '#d1d5db', '#f3f4f6', '#fef3c7', '#fce7f3',
];

export const BLEND_MODES = [
  'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge',
  'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue',
  'saturation', 'color', 'luminosity',
];

export const TOOL_SHORTCUTS = {
  move: 'V', marquee: 'M', lasso: 'L', wand: 'W', crop: 'C', eyedropper: 'I',
  brush: 'B', eraser: 'E', fill: 'G', text: 'T', rect: 'U', ellipse: 'U',
  line: 'U', arrow: 'U', star: 'U', heart: 'U', polygon: 'U', sticker: 'Y',
  hand: 'H', zoom: 'Z', frame: 'U', highlight: 'J', gradient: 'G',
};
