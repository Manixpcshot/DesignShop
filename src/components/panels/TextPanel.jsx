// Text panel: beginner-friendly headline styles + full typography controls.
import React, { useMemo, useState } from 'react';
import {
  useEditor,
  useT,
  updateLayer,
  activeLayer,
  applyStyleToSelection,
  updateSelectedLayer,
  addNewLayer,
  addEmoji,
  toast,
  updatePrefs,
  getState,
} from '../../lib/store.js';
import { TEXT_STYLES, FONT_LIST, EMOJI_SETS, styleById } from '../../lib/presets.js';
import { StyleTile, styleToCss } from '../StylePreview.jsx';
import { Section, Slider, ColorPicker, Select, Toggle, Button, IconButton, Switch } from '../ui.jsx';
import Icon from '../Icon.jsx';

const SAMPLE_WORDS = ['WOW', 'SALE', 'NEW', 'EP.1'];

export default function TextPanel() {
  const t = useT();
  const layer = useEditor((s) => activeLayer(s));
  const prefs = useEditor((s) => s.prefs);
  const [sample, setSample] = useState(0);
  const [tab, setTab] = useState('styles');
  const isText = layer?.type === 'text';

  const favorites = useMemo(() => {
    return (prefs.favoriteStyles || [])
      .map((f) => ({ id: f, name: f.name, style: styleById(f.styleId) }))
      .filter((f) => f.style);
  }, [prefs.favoriteStyles]);

  const saveFavorite = () => {
    if (!isText) return toast('studio.needLayer', 'info');
    const entry = {
      id: `fav_${Date.now().toString(36)}`,
      name: (layer.text || 'Style').slice(0, 14),
      styleId: layer.fontId,
      effects: JSON.parse(JSON.stringify(layer.effects)),
      fontId: layer.fontId,
      weight: layer.weight,
      color: layer.color,
      gradient: layer.gradient,
      uppercase: layer.uppercase,
    };
    updatePrefs({ favoriteStyles: [entry, ...(prefs.favoriteStyles || [])].slice(0, 24) });
    toast('text.styleSaved');
  };

  const applyFavorite = (fav) => {
    if (!isText) return toast('studio.needLayer', 'info');
    updateLayer(
      layer.id,
      {
        effects: JSON.parse(JSON.stringify(fav.effects)),
        fontId: fav.fontId,
        weight: fav.weight,
        color: fav.color,
        gradient: fav.gradient ? JSON.parse(JSON.stringify(fav.gradient)) : null,
        uppercase: fav.uppercase,
      },
      { label: 'Text style', relayoutText: true }
    );
    toast('studio.styleApplied');
  };

  return (
    <>
      <div className="row" style={{ marginBottom: 10, gap: 4 }}>
        <Toggle
          value={tab}
          onChange={setTab}
          options={[
            { value: 'styles', label: t('text.stylesTitle').split(' ')[0] || 'Styles', icon: 'sparkles' },
            { value: 'type', label: t('text.title'), icon: 'type' },
          ]}
        />
        <div className="grow" />
        <IconButton icon="plus" title={t('text.add')} onClick={() => addNewLayer('text')} />
      </div>

      {tab === 'styles' ? (
        <>
          <Section
            title={t('text.stylesTitle')}
            sub={t('text.stylesSub')}
            right={
              <div className="row" style={{ gap: 3 }}>
                <IconButton icon="textCase" title={t('example')} onClick={() => setSample((s) => (s + 1) % SAMPLE_WORDS.length)} />
                <IconButton icon="check" title={t('text.favoriteAdd')} onClick={saveFavorite} />
              </div>
            }
          >
            {!isText ? (
              <div className="card" style={{ marginBottom: 8, fontSize: 11.5, color: 'var(--text-mute)' }}>
                {t('studio.needLayer')}
              </div>
            ) : null}
            <div className="style-grid">
              {TEXT_STYLES.map((st) => (
                <StyleTile
                  key={st.id}
                  style={st}
                  name={t(st.nameKey)}
                  sample={SAMPLE_WORDS[sample]}
                  size={st.sizePct > 0.15 ? 18 : 21}
                  dark
                  onClick={() => applyStyleToSelection(st.id)}
                />
              ))}
            </div>
          </Section>

          {favorites.length ? (
            <Section title={t('text.favorite')}>
              <div className="style-grid">
                {favorites.map((fav) => (
                  <StyleTile
                    key={fav.id}
                    style={{ ...fav.style, font: fav.fontId, weight: fav.weight, fill: { color: fav.color, gradient: fav.gradient }, effects: fav.effects, uppercase: fav.uppercase }}
                    name={fav.name}
                    sample={SAMPLE_WORDS[sample]}
                    size={19}
                    dark
                    onClick={() => applyFavorite(fav)}
                  />
                ))}
              </div>
            </Section>
          ) : null}

          {isText ? (
            <>
              <Section title={t('text.content')}>
                <textarea
                  id="text-content-input"
                  dir="auto"
                  rows={2}
                  value={layer.text}
                  placeholder={t('text.placeholder')}
                  onChange={(e) => updateLayer(layer.id, { text: e.target.value }, { label: 'Text', relayoutText: true })}
                  style={{ resize: 'vertical', minHeight: 54, fontFamily: 'var(--font-ui)' }}
                />
                <div className="row" style={{ marginTop: 7 }}>
                  <button
                    className={`chip ${layer.uppercase ? 'active' : ''}`}
                    onClick={() => updateLayer(layer.id, { uppercase: !layer.uppercase }, { relayoutText: true })}
                  >
                    {t('text.uppercase')}
                  </button>
                  <button className={`chip ${layer.gradient ? 'active' : ''}`} onClick={() => toggleGradient(layer)}>
                    {t('text.gradientOn')}
                  </button>
                </div>
              </Section>

              <Section title={t('text.font')}>
                <Select
                  value={layer.fontId}
                  options={FONT_LIST.map((f) => ({ value: f.id, label: f.label }))}
                  onChange={(v) => {
                    const f = FONT_LIST.find((x) => x.id === v);
                    updateLayer(
                      layer.id,
                      { fontId: v, weight: f?.weights?.length ? f.weights[f.weights.length - 1] : 700 },
                      { label: 'Font', relayoutText: true }
                    );
                  }}
                />
                <Slider
                  label={t('text.size')}
                  min={10}
                  max={Math.max(240, Math.round(getState().doc?.h * 0.4 || 240))}
                  value={Math.round(layer.fontSize)}
                  onChange={(v) => updateLayer(layer.id, { fontSize: v }, { history: false, relayoutText: true })}
                  suffix="px"
                />
                <div className="num-pair">
                  <Slider
                    label={t('text.lineHeight')}
                    min={0.8}
                    max={2}
                    step={0.02}
                    value={layer.lineHeight || 1.1}
                    onChange={(v) => updateLayer(layer.id, { lineHeight: v }, { history: false, relayoutText: true })}
                    format={(v) => v.toFixed(2)}
                  />
                  <Slider
                    label={t('text.letterSpacing')}
                    min={-10}
                    max={40}
                    value={layer.letterSpacing || 0}
                    onChange={(v) => updateLayer(layer.id, { letterSpacing: v }, { history: false, relayoutText: true })}
                  />
                </div>
                <div className="row" style={{ gap: 4, marginBottom: 8 }}>
                  {['left', 'center', 'right'].map((a) => (
                    <button key={a} className={`chip ${layer.align === a ? 'active' : ''}`} onClick={() => updateLayer(layer.id, { align: a }, { history: false })}>
                      {t(`text.align.${a}`)}
                    </button>
                  ))}
                </div>
                <Slider
                  label={t('text.curve')}
                  min={-100}
                  max={100}
                  value={layer.curve || 0}
                  onChange={(v) => updateLayer(layer.id, { curve: v }, { history: false })}
                />
                <ColorPicker label={t('text.color')} value={layer.color || '#ffffff'} onChange={(c) => updateLayer(layer.id, { color: c }, { history: false })} />
                {layer.gradient ? (
                  <>
                    <ColorPicker label={t('text.gradientA')} value={layer.gradient.colors?.[0] || '#ff2d95'} onChange={(c) => setGradientColor(layer, 0, c)} swatches={false} />
                    <ColorPicker label={t('text.gradientB')} value={layer.gradient.colors?.[layer.gradient.colors.length - 1] || '#ffd166'} onChange={(c) => setGradientColor(layer, -1, c)} swatches={false} />
                    <Slider
                      label={t('opt.gradientAngle')}
                      min={0}
                      max={360}
                      value={layer.gradient.angle ?? 20}
                      onChange={(v) => updateLayer(layer.id, { gradient: { ...layer.gradient, angle: v } }, { history: false })}
                      suffix="°"
                    />
                  </>
                ) : null}
              </Section>
            </>
          ) : (
            <Section title={t('text.add')} sub={t('tool.help.text')}>
              <Button variant="primary" icon="plus" onClick={() => addNewLayer('text')} style={{ width: '100%' }}>
                {t('text.add')}
              </Button>
            </Section>
          )}

          <Section title={t('fx.pickEmoji')} sub={t('fx.emojiHint')}>
            {EMOJI_SETS.map((set) => (
              <div key={set.id} style={{ marginBottom: 8 }}>
                <div className="mute-2" style={{ marginBottom: 3, fontWeight: 600 }}>
                  {t(set.nameKey)}
                </div>
                <div className="emoji-grid">
                  {set.items.map((e) => (
                    <button key={e} className="emoji-btn" onClick={() => addEmoji(e)} title={e}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </Section>
        </>
      ) : (
        <TypeTab layer={layer} isText={isText} t={t} />
      )}
    </>
  );
}

function TypeTab({ layer, isText, t }) {
  if (!isText) {
    return (
      <Section title={t('text.title')} sub={t('opt.selectLayer')}>
        <div className="empty-state">
          <Icon name="type" size={30} />
          <div>{t('layers.emptyHint')}</div>
        </div>
      </Section>
    );
  }
  return (
    <>
      <Section title={t('text.content')}>
        <textarea
          dir="auto"
          rows={3}
          value={layer.text}
          onChange={(e) => updateLayer(layer.id, { text: e.target.value }, { label: 'Text', relayoutText: true })}
          style={{ resize: 'vertical', minHeight: 64 }}
        />
      </Section>
      <Section title={t('layers.transform')}>
        <div className="row" style={{ gap: 5, flexWrap: 'wrap' }}>
          <IconButton icon="flipH" title={t('layers.flipH')} onClick={() => updateSelectedLayer({ scaleX: (layer.scaleX ?? 1) * -1 })} />
          <IconButton icon="flipV" title={t('layers.flipV')} onClick={() => updateSelectedLayer({ scaleY: (layer.scaleY ?? 1) * -1 })} />
          <IconButton icon="centerH" title={t('layers.centerH')} onClick={() => center('h')} />
          <IconButton icon="centerV" title={t('layers.centerV')} onClick={() => center('v')} />
        </div>
        <div className="sep" />
        <div className="num-pair">
          <Slider label="X" min={-200} max={getState().doc?.w + 200 || 2000} value={Math.round(layer.x)} onChange={(v) => updateSelectedLayer({ x: v }, { history: false })} />
          <Slider label="Y" min={-200} max={getState().doc?.h + 200 || 2000} value={Math.round(layer.y)} onChange={(v) => updateSelectedLayer({ y: v }, { history: false })} />
        </div>
        <Slider label={t('rotation')} min={-180} max={180} value={Math.round(layer.rotation || 0)} onChange={(v) => updateSelectedLayer({ rotation: v }, { history: false })} suffix="°" />
        <Slider label={t('opacity')} min={0} max={100} value={layer.opacity ?? 100} onChange={(v) => updateSelectedLayer({ opacity: v }, { history: false })} suffix="%" />
      </Section>
    </>
  );
}

function center(axis) {
  const st = getState();
  const layer = activeLayer(st);
  if (!layer || !st.doc) return;
  const patch = axis === 'h' ? { x: Math.round((st.doc.w - layer.w) / 2) } : { y: Math.round((st.doc.h - layer.h) / 2) };
  updateLayer(layer.id, patch, { label: 'Center' });
}

function toggleGradient(layer) {
  if (layer.gradient) {
    updateLayer(layer.id, { gradient: null }, { label: 'Gradient off' });
    return;
  }
  updateLayer(
    layer.id,
    { gradient: { type: 'linear', colors: ['#ff2d95', '#ffd166'], angle: 20 } },
    { label: 'Gradient on' }
  );
}

function setGradientColor(layer, index, color) {
  const colors = [...(layer.gradient.colors || ['#ff2d95', '#ffd166'])];
  const i = index < 0 ? colors.length - 1 : index;
  colors[i] = color;
  updateLayer(layer.id, { gradient: { ...layer.gradient, colors } }, { history: false });
}

export { Switch };
