// Thumbnail Studio — sizes, one-click kits, backgrounds, add-ons & stickers.
import React, { useState } from 'react';
import {
  useEditor,
  useT,
  applyKit,
  applyBackgroundPreset,
  addAddon,
  resizeCanvas,
  openDialog,
  toast,
  addEmoji,
  getState,
  commitDoc,
} from '../../lib/store.js';
import {
  SIZE_PRESETS,
  SIZE_GROUPS,
  KITS,
  BACKGROUNDS,
  ADDONS,
  SOCIAL_EXPORT,
  EMOJI_SETS,
} from '../../lib/presets.js';
import { Section, Button, Switch, Slider, IconButton, Toggle } from '../ui.jsx';
import Icon from '../Icon.jsx';

export function bgCss(bg) {
  if (!bg) return 'transparent';
  if (typeof bg === 'string') return bg;
  const colors = bg.colors || ['#111'];
  if (bg.kind === 'linear') return `linear-gradient(${(bg.angle ?? 135) + 90}deg, ${colors.join(', ')})`;
  if (bg.kind === 'radial') return `radial-gradient(circle at 50% 42%, ${colors.join(', ')})`;
  const base = colors[0];
  const glow = bg.glow || colors[1] || '#3b82f6';
  if (bg.pattern === 'grid')
    return `linear-gradient(${glow}22 1px, transparent 1px) 0 0/9px 9px, linear-gradient(90deg, ${glow}22 1px, transparent 1px) 0 0/9px 9px, ${base}`;
  if (bg.pattern === 'dots')
    return `radial-gradient(${glow}66 1px, transparent 1px) 0 0/7px 7px, ${base}`;
  if (bg.pattern === 'stripes')
    return `repeating-linear-gradient(-28deg, ${glow}33 0 4px, transparent 4px 11px), ${base}`;
  if (bg.pattern === 'carbon') return `repeating-conic-gradient(#1b1d24 0 25%, #111318 0 50%) 0 0/8px 8px, ${base}`;
  if (bg.pattern === 'blobs')
    return `radial-gradient(circle at 24% 28%, #ff2d95aa, transparent 46%), radial-gradient(circle at 78% 24%, #5b8cffaa, transparent 44%), radial-gradient(circle at 34% 80%, #12d8ff99, transparent 44%), radial-gradient(circle at 84% 78%, #b06cffaa, transparent 46%), ${base}`;
  return base;
}

function AddonGlyph({ id }) {
  const stroke = 'var(--text-dim)';
  const map = {
    arrow: <path d="M4 12h14m-4-4 4 4-4 4" stroke={stroke} strokeWidth="1.8" fill="none" strokeLinecap="round" />,
    circle: <ellipse cx="12" cy="12" rx="8" ry="7" fill="none" stroke="#ff6b6b" strokeWidth="2" />,
    underline: <path d="M4 14c4-8 12 8 16-4" stroke="#ffd23f" strokeWidth="3" fill="none" strokeLinecap="round" />,
    badge: (
      <g>
        <rect x="4" y="7" width="16" height="10" rx="3" fill="#ff2d55" />
        <text x="12" y="14.6" fontSize="6" fill="#fff" textAnchor="middle" fontWeight="700">
          NEW
        </text>
      </g>
    ),
    frame: <rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke={stroke} strokeWidth="2" />,
    starburst: <path d="M12 3l2 5 5-1-3 4 3 4-5-1-2 5-2-5-5 1 3-4-3-4 5 1z" fill="#ffd23f" />,
    speech: (
      <g>
        <rect x="3" y="5" width="18" height="11" rx="3" fill="#fff" />
        <path d="M8 16l-2 4 5-3z" fill="#fff" />
      </g>
    ),
    countdown: (
      <g>
        <circle cx="12" cy="12" r="7" fill="#ff3b30" />
        <text x="12" y="15.5" fontSize="8" fill="#fff" textAnchor="middle" fontWeight="700">
          3
        </text>
      </g>
    ),
    redbox: <rect x="4" y="7" width="16" height="10" rx="2" fill="#ff3b30" opacity="0.9" />,
    sparkle: <path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6z" fill="#fff" />,
    progress: (
      <g>
        <rect x="3" y="10" width="18" height="4" rx="2" fill="#ffffff33" />
        <rect x="3" y="10" width="12" height="4" rx="2" fill="#22c55e" />
      </g>
    ),
    emoji: (
      <text x="12" y="17" fontSize="14" textAnchor="middle">
        🔥
      </text>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" width="26" height="26">
      {map[id] || null}
    </svg>
  );
}

export default function StudioPanel() {
  const t = useT();
  const doc = useEditor((s) => s.doc);
  const [scaleContent, setScaleContent] = useState(true);
  const [sizeTab, setSizeTab] = useState('social');
  const currentSize = SIZE_PRESETS.find((s) => doc && s.w === doc.w && s.h === doc.h);

  const applySize = (preset) => {
    if (!doc) return;
    if (preset.id === 'custom') {
      openDialog('new');
      return;
    }
    if (preset.w === doc.w && preset.h === doc.h) return;
    resizeCanvas(preset.w, preset.h, { scaleLayers: scaleContent });
    toast('size.custom');
  };

  return (
    <>
      <Section title={t('studio.size')} sub={t('studio.sizeSub')}>
        <div className="row" style={{ marginBottom: 8, justifyContent: 'space-between' }}>
          <div className="tag" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {doc ? `${doc.w} × ${doc.h} px` : '—'}
          </div>
          <label className="row" style={{ gap: 6, fontSize: 11, color: 'var(--text-dim)' }}>
            {t('scale')}
            <Switch checked={scaleContent} onChange={setScaleContent} title={t('scale')} />
          </label>
        </div>
        <div className="row" style={{ gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
          {SIZE_GROUPS.map((g) => (
            <button key={g.id} className={`chip ${sizeTab === g.id ? 'active' : ''}`} onClick={() => setSizeTab(g.id)}>
              {t(g.nameKey)}
            </button>
          ))}
        </div>
        <div className="size-grid">
          {SIZE_PRESETS.filter((s) => s.group === sizeTab).map((s) => (
            <button
              key={s.id}
              className={`size-tile ${currentSize?.id === s.id ? 'active' : ''}`}
              onClick={() => applySize(s)}
            >
              <b>{t(`size.${s.id}`)}</b>
              <span>
                {s.w} × {s.h}
              </span>
            </button>
          ))}
        </div>
        <div className="row" style={{ marginTop: 8, gap: 6 }}>
          <Button size="sm" icon="plus" onClick={() => openDialog('new')} style={{ flex: 1 }}>
            {t('new.title')}
          </Button>
          <Button size="sm" icon="download" onClick={() => openDialog('social')} style={{ flex: 1 }}>
            {t('export.socialTitle')}
          </Button>
        </div>
      </Section>

      <Section title={t('studio.kits')} sub={t('studio.kitsSub')}>
        <div className="kit-grid">
          {KITS.map((kit) => (
            <button
              key={kit.id}
              className="kit-tile"
              onClick={() => applyKit(kit.id)}
              title={t(kit.nameKey)}
              style={{ background: bgCss(kit.background), border: '1px solid var(--border)' }}
            >
              <div
                className="kit-head"
                style={{
                  color: kit.textColor,
                  textShadow: `0 2px 9px rgba(0,0,0,.6), 0 0 2px rgba(0,0,0,.5)`,
                  fontFamily: 'Anton, Inter, sans-serif',
                }}
              >
                {kit.headline.split(' ')[0]}
              </div>
              <div className="kit-title">{t(kit.nameKey)}</div>
            </button>
          ))}
        </div>
      </Section>

      <Section title={t('studio.backgrounds')} sub={t('studio.backgroundsSub')}>
        <div className="bg-grid">
          {BACKGROUNDS.map((bg) => (
            <button
              key={bg.id}
              className="bg-swatch"
              style={{ background: bgCss(bg) }}
              title={bg.nameKey}
              onClick={() => applyBackgroundPreset(bg)}
            />
          ))}
        </div>
        <div className="row" style={{ marginTop: 8, gap: 6 }}>
          <button className="chip" onClick={() => applyBackgroundPreset('#ffffff')}>
            #fff
          </button>
          <button className="chip" onClick={() => applyBackgroundPreset('transparent')}>
            {t('new.bg.transparent')}
          </button>
          <button
            className="chip"
            onClick={() => {
              if (!doc) return;
              commitDoc({ ...doc, background: { kind: 'linear', colors: [getState().toolOptions.gradientA, getState().toolOptions.gradientB], angle: getState().toolOptions.gradientAngle } }, { label: 'Gradient bg' });
            }}
          >
            {t('opt.gradient')}
          </button>
        </div>
      </Section>

      <Section title={t('studio.addons')} sub={t('studio.addonsSub')}>
        <div className="addon-grid">
          {ADDONS.map((a) => (
            <button key={a.id} className="addon-tile" onClick={() => addAddon(a.id)} title={t(a.nameKey)}>
              <AddonGlyph id={a.id} />
              <span>{t(a.nameKey).replace(/^(Big|Circle|Brush|NEW|Border|Star|Speech|Countdown|Red|Sparkle|Emoji|Progress)\s?/, '')}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title={t('fx.pickEmoji')} sub={t('fx.emojiHint')}>
        <div className="emoji-grid">
          {EMOJI_SETS.flatMap((s) => s.items)
            .slice(0, 32)
            .map((e, i) => (
              <button key={`${e}-${i}`} className="emoji-btn" onClick={() => addEmoji(e)} title={e}>
                {e}
              </button>
            ))}
        </div>
      </Section>

      <Section title={t('export.socialTitle')} sub={t('studio.socialSub')}>
        <div className="row" style={{ flexWrap: 'wrap', gap: 4 }}>
          {SOCIAL_EXPORT.slice(0, 6).map((s) => (
            <span key={s.id} className="tag">
              {s.w}×{s.h}
            </span>
          ))}
          <span className="tag">+{SOCIAL_EXPORT.length - 6}</span>
        </div>
        <Button variant="primary" size="sm" icon="download" onClick={() => openDialog('social')} style={{ width: '100%', marginTop: 9 }}>
          {t('export.socialTitle')}
        </Button>
      </Section>
    </>
  );
}

export { Slider, IconButton, Toggle };
