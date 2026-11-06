// Adjust & filter panel — Photoshop-class sliders, one-click looks, auto enhance.
import React, { useState } from 'react';
import {
  useEditor,
  useT,
  updateLayer,
  activeLayer,
  toast,
  copyStyle,
  pasteStyle,
  getState,
} from '../../lib/store.js';
import { ADJ_DEFAULTS, FILTER_PRESETS, EFFECT_DEFAULTS } from '../../lib/filters.js';
import { Section, Slider, ColorPicker, Button, Switch } from '../ui.jsx';
import { QUICK_FX } from '../../lib/presets.js';

const SLIDERS = [
  { key: 'brightness', min: -100, max: 100 },
  { key: 'contrast', min: -100, max: 100 },
  { key: 'saturation', min: -100, max: 100 },
  { key: 'vibrance', min: -100, max: 100 },
  { key: 'temperature', min: -100, max: 100 },
  { key: 'hue', min: -180, max: 180 },
  { key: 'exposure', min: -100, max: 100 },
  { key: 'highlights', min: -100, max: 100 },
  { key: 'shadows', min: -100, max: 100 },
  { key: 'grayscale', min: 0, max: 100 },
  { key: 'sepia', min: 0, max: 100 },
  { key: 'blur', min: 0, max: 40 },
  { key: 'sharpen', min: 0, max: 100 },
  { key: 'noise', min: 0, max: 100 },
  { key: 'pixelate', min: 1, max: 60 },
  { key: 'posterize', min: 0, max: 24 },
  { key: 'vignette', min: 0, max: 100 },
];

const ADVANCED = ['threshold', 'duotone'];

export default function AdjustPanel() {
  const t = useT();
  const layer = useEditor((s) => activeLayer(s));
  const [advanced, setAdvanced] = useState(false);
  const adj = { ...ADJ_DEFAULTS, ...(layer?.adj || {}) };
  const canAdjust = layer && (layer.type === 'image' || layer.type === 'brush' || layer.type === 'shape');

  const setAdj = (patch, history = false) => {
    if (!layer) return toast('opt.selectLayer', 'info');
    updateLayer(layer.id, { adj: { ...(layer.adj || {}), ...patch } }, { history, label: 'Adjust' });
  };

  const applyPreset = (preset) => {
    if (!layer) return toast('opt.selectLayer', 'info');
    updateLayer(layer.id, { adj: { ...preset.adj } }, { label: 'Preset' });
    toast('studio.styleApplied');
  };

  const autoEnhance = () => {
    if (!layer) return toast('opt.selectLayer', 'info');
    updateLayer(
      layer.id,
      { adj: { ...(layer.adj || {}), contrast: 14, saturation: 12, vibrance: 10, shadows: 12, highlights: -6, sharpen: 14 } },
      { label: 'Auto enhance' }
    );
    toast('adj.autoEnhance');
  };

  return (
    <>
      <Section title={t('adj.presets')} sub={t('adj.autoEnhanceHint')}>
        <div className="row" style={{ marginBottom: 9, gap: 6 }}>
          <Button variant="primary" size="sm" icon="wandSparkle" onClick={autoEnhance} style={{ flex: 1 }}>
            {t('adj.autoEnhance')}
          </Button>
          <Button size="sm" icon="copy" onClick={copyStyle} title={t('adj.copyStyle')} />
          <Button size="sm" icon="upload" onClick={pasteStyle} title={t('adj.pasteStyle')} />
        </div>
        <div className="row" style={{ flexWrap: 'wrap', gap: 4 }}>
          {FILTER_PRESETS.map((p) => (
            <button
              key={p.id}
              className={`chip ${JSON.stringify(adj) === JSON.stringify({ ...ADJ_DEFAULTS, ...p.adj }) ? 'active' : ''}`}
              onClick={() => applyPreset(p)}
              disabled={!canAdjust}
            >
              {t(`preset.${p.id}`)}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t('adj.title')} sub={!canAdjust ? t('opt.selectLayer') : t('adj.sub')}>
        {SLIDERS.map((s) => (
          <Slider
            key={s.key}
            label={t(`adj.${s.key}`)}
            min={s.min}
            max={s.max}
            value={adj[s.key] ?? ADJ_DEFAULTS[s.key]}
            onChange={(v) => setAdj({ [s.key]: v })}
            suffix={s.key === 'hue' ? '°' : ''}
          />
        ))}
        <div className="row" style={{ marginTop: 6 }}>
          <button className="chip" onClick={() => setAdvanced((a) => !a)}>
            {advanced ? t('less') : t('more')}
          </button>
          <div className="grow" />
          <button
            className="chip"
            onClick={() => layer && updateLayer(layer.id, { adj: null }, { label: 'Reset adjustments' })}
            disabled={!layer}
          >
            {t('reset')}
          </button>
        </div>
        {advanced ? (
          <div style={{ marginTop: 10 }}>
            <Slider label={t('adj.threshold')} min={0} max={100} value={adj.threshold ?? 0} onChange={(v) => setAdj({ threshold: v })} />
            <Slider label={t('adj.invert')} min={0} max={100} value={adj.invert ?? 0} onChange={(v) => setAdj({ invert: v })} suffix="%" />
            <Slider label={t('adj.duotone')} min={0} max={100} value={adj.duotone ?? 0} onChange={(v) => setAdj({ duotone: v })} suffix="%" />
            <ColorPicker label={t('adj.duotoneA')} value={adj.duotoneA} onChange={(c) => setAdj({ duotoneA: c })} swatches={false} />
            <ColorPicker label={t('adj.duotoneB')} value={adj.duotoneB} onChange={(c) => setAdj({ duotoneB: c })} swatches={false} />
          </div>
        ) : null}
      </Section>

      <FxSection layer={layer} t={t} />
    </>
  );
}

export function FxSection({ layer, t = (k) => k }) {
  const effects = { ...EFFECT_DEFAULTS, ...(layer?.effects || {}) };
  const setFx = (key, patch, history = false) => {
    if (!layer) return toast('opt.selectLayer', 'info');
    updateLayer(
      layer.id,
      { effects: { ...(layer.effects || {}), [key]: { ...effects[key], ...patch } } },
      { history, label: 'Effect' }
    );
  };
  const applyQuick = (fx) => {
    if (!layer) return toast('opt.selectLayer', 'info');
    const merged = { ...JSON.parse(JSON.stringify(effects)), ...JSON.parse(JSON.stringify(fx)) };
    updateLayer(layer.id, { effects: merged }, { label: 'Quick effect' });
  };

  return (
    <Section title={t('fx.title')} sub={t('fx.sub')}>
      <div className="row" style={{ flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
        {QUICK_FX.map((q) => (
          <button key={q.id} className="chip" onClick={() => applyQuick(q.effects)} disabled={!layer}>
            {t(q.nameKey)}
          </button>
        ))}
      </div>

      <FxRow title={t('fx.shadow')} on={effects.shadow.on} toggle={(v) => setFx('shadow', { on: v }, true)} icon="copy">
        {effects.shadow.on ? (
          <>
            <div className="num-pair">
              <Slider label="X" min={-80} max={80} value={effects.shadow.x} onChange={(v) => setFx('shadow', { x: v })} />
              <Slider label="Y" min={-80} max={80} value={effects.shadow.y} onChange={(v) => setFx('shadow', { y: v })} />
            </div>
            <Slider label={t('fx.blur')} min={0} max={90} value={effects.shadow.blur} onChange={(v) => setFx('shadow', { blur: v })} />
            <Slider label={t('opacity')} min={0} max={100} value={effects.shadow.opacity} onChange={(v) => setFx('shadow', { opacity: v })} suffix="%" />
            <ColorPicker label={t('fx.color')} value={effects.shadow.color} onChange={(c) => setFx('shadow', { color: c }, true)} swatches={false} />
          </>
        ) : null}
      </FxRow>

      <FxRow title={t('fx.glow')} on={effects.glow.on} toggle={(v) => setFx('glow', { on: v }, true)} icon="sparkles">
        {effects.glow.on ? (
          <>
            <Slider label={t('fx.blur')} min={2} max={80} value={effects.glow.blur} onChange={(v) => setFx('glow', { blur: v })} />
            <Slider label={t('fx.spread')} min={0} max={30} value={effects.glow.spread} onChange={(v) => setFx('glow', { spread: v })} />
            <Slider label={t('opacity')} min={0} max={100} value={effects.glow.opacity} onChange={(v) => setFx('glow', { opacity: v })} suffix="%" />
            <ColorPicker label={t('fx.color')} value={effects.glow.color} onChange={(c) => setFx('glow', { color: c }, true)} swatches={false} />
          </>
        ) : null}
      </FxRow>

      <FxRow title={t('fx.stroke')} on={effects.stroke.on} toggle={(v) => setFx('stroke', { on: v }, true)} icon="rect">
        {effects.stroke.on ? (
          <>
            <Slider label={t('fx.spread')} min={1} max={40} value={effects.stroke.width} onChange={(v) => setFx('stroke', { width: v })} suffix="px" />
            <Slider label={t('opacity')} min={0} max={100} value={effects.stroke.opacity} onChange={(v) => setFx('stroke', { opacity: v })} suffix="%" />
            <ColorPicker label={t('fx.color')} value={effects.stroke.color} onChange={(c) => setFx('stroke', { color: c }, true)} swatches={false} />
          </>
        ) : null}
      </FxRow>

      <FxRow title={t('fx.radius')} on={effects.radius.on} toggle={(v) => setFx('radius', { on: v }, true)} icon="frame">
        {effects.radius.on ? (
          <Slider label={t('opt.cornerRadius')} min={0} max={Math.max(40, Math.round((getState().doc?.w || 800) * 0.2))} value={effects.radius.radius} onChange={(v) => setFx('radius', { radius: v })} suffix="px" />
        ) : null}
      </FxRow>
    </Section>
  );
}

function FxRow({ title, on, toggle, children, icon }) {
  return (
    <div className="card" style={{ marginBottom: 7 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>{title}</span>
        <Switch checked={on} onChange={toggle} title={title} />
      </div>
      {on && children ? <div style={{ marginTop: 9 }}>{children}</div> : null}
      {!on && icon ? null : null}
    </div>
  );
}
