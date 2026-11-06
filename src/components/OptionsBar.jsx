// Contextual tool options above the canvas — simple, labelled, beginner friendly.
import React from 'react';
import {
  useEditor,
  useT,
  setToolOption,
  activeLayer,
  updateLayer,
  setZoom,
  toggleGrid,
  toggleRulers,
  toggleSnap,
  getState,
  setTool,
  openDialog,
} from '../lib/store.js';
import { FONT_LIST, EMOJI_SETS, BLEND_MODES } from '../lib/presets.js';
import { Slider, ColorPicker } from './ui.jsx';
import Icon from './Icon.jsx';

const SHAPES = ['rect', 'ellipse', 'star', 'heart', 'polygon', 'frame', 'arrow', 'line'];

export default function OptionsBar() {
  const t = useT();
  const tool = useEditor((s) => s.activeTool);
  const opts = useEditor((s) => s.toolOptions);
  const layer = useEditor((s) => activeLayer(s));
  const zoom = useEditor((s) => (s.fitMode ? 1 : s.zoom));
  const grid = useEditor((s) => s.showGrid);
  const rulers = useEditor((s) => s.showRulers);
  const snap = useEditor((s) => s.snap);

  const label = t(`tool.${tool}`);

  return (
    <div className="options-bar">
      <span className="tag" style={{ fontWeight: 700, color: 'var(--text)' }}>
        {label}
      </span>
      <div className="vsep" />

      {(tool === 'brush' || tool === 'eraser' || tool === 'fill' || tool === 'highlight') && (
        <>
          <div className="opt-group">
            <span className="opt-label">{t('opt.brushSize')}</span>
            <input
              className="opt-num"
              type="number"
              min={1}
              max={400}
              value={opts.brushSize}
              onChange={(e) => setToolOption({ brushSize: Math.max(1, Number(e.target.value) || 1) })}
            />
          </div>
          <div className="opt-group" style={{ minWidth: 130 }}>
            <span className="opt-label">{t('opt.brushHardness')}</span>
            <Slider label="" min={0} max={100} value={opts.brushHardness} onChange={(v) => setToolOption({ brushHardness: v })} />
          </div>
          <div className="opt-group">
            <span className="opt-label">{t('opt.brushColor')}</span>
            <MiniColor value={opts.brushColor} onChange={(v) => setToolOption({ brushColor: v })} />
          </div>
        </>
      )}

      {tool === 'text' && layer?.type === 'text' && (
        <>
          <div className="opt-group">
            <span className="opt-label">{t('opt.fontFamily')}</span>
            <select className="opt-select" value={layer.fontId} onChange={(e) => updateLayer(layer.id, { fontId: e.target.value }, { relayoutText: true })}>
              {FONT_LIST.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div className="opt-group">
            <span className="opt-label">{t('opt.fontSize')}</span>
            <input
              className="opt-num"
              type="number"
              value={Math.round(layer.fontSize)}
              onChange={(e) => updateLayer(layer.id, { fontSize: Math.max(6, Number(e.target.value) || 6) }, { history: false, relayoutText: true })}
            />
          </div>
          <div className="opt-group">
            <span className="opt-label">{t('opt.brushColor')}</span>
            <MiniColor value={layer.color} onChange={(v) => updateLayer(layer.id, { color: v }, { history: false })} />
          </div>
          <button className="chip" onClick={() => openDialog('tour')}>
            <Icon name="sparkles" size={12} /> {t('text.stylesTitle')}
          </button>
        </>
      )}

      {tool === 'text' && layer?.type !== 'text' && (
        <div className="opt-group">
          <span className="opt-label">{t('tool.help.text')}</span>
          <select className="opt-select" value={opts.fontId} onChange={(e) => setToolOption({ fontId: e.target.value })}>
            {FONT_LIST.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
          <input
            className="opt-num"
            type="number"
            value={opts.fontSize}
            onChange={(e) => setToolOption({ fontSize: Math.max(6, Number(e.target.value) || 6) })}
          />
        </div>
      )}

      {(tool === 'rect' || tool === 'ellipse' || tool === 'line' || tool === 'arrow' || tool === 'star' || tool === 'heart' || tool === 'polygon' || tool === 'frame') && (
        <>
          <div className="opt-group">
            <span className="opt-label">{t('opt.shapeColor')}</span>
            <MiniColor value={opts.shapeFill} onChange={(v) => setToolOption({ shapeFill: v })} />
          </div>
          <div className="opt-group">
            <span className="opt-label">{t('opt.strokeWidth')}</span>
            <input
              className="opt-num"
              type="number"
              min={0}
              max={80}
              value={opts.strokeWidth}
              onChange={(e) => setToolOption({ strokeWidth: Math.max(0, Number(e.target.value) || 0) })}
            />
          </div>
          <div className="opt-group">
            <span className="opt-label">{t('opt.cornerRadius')}</span>
            <input
              className="opt-num"
              type="number"
              min={0}
              max={400}
              value={opts.radius}
              onChange={(e) => setToolOption({ radius: Math.max(0, Number(e.target.value) || 0) })}
            />
          </div>
          <div className="opt-group">
            <span className="opt-label">Points</span>
            <input
              className="opt-num"
              type="number"
              min={3}
              max={16}
              value={opts.shapePoints}
              onChange={(e) => setToolOption({ shapePoints: Math.max(3, Number(e.target.value) || 5) })}
            />
          </div>
        </>
      )}

      {tool === 'sticker' && (
        <div className="opt-group">
          <span className="opt-label">{t('opt.stickerSet')}</span>
          <select className="opt-select" value={opts.stickerSet} onChange={(e) => setToolOption({ stickerSet: e.target.value })}>
            {EMOJI_SETS.map((s) => (
              <option key={s.id} value={s.id}>
                {t(s.nameKey)}
              </option>
            ))}
          </select>
        </div>
      )}

      {tool === 'marquee' || tool === 'lasso' || tool === 'wand' ? (
        <>
          <div className="opt-group" style={{ minWidth: 140 }}>
            <span className="opt-label">{t('opt.tolerance')}</span>
            <Slider label="" min={0} max={100} value={opts.tolerance} onChange={(v) => setToolOption({ tolerance: v })} />
          </div>
          <button className="btn btn-sm" onClick={() => window.dispatchEvent(new CustomEvent('ds:fill-selection'))}>
            {t('opt.fillSelection')}
          </button>
          <button className="btn btn-sm" onClick={() => window.dispatchEvent(new CustomEvent('ds:erase-selection'))}>
            {t('opt.eraseAll')}
          </button>
          <button className="btn btn-sm" onClick={() => window.dispatchEvent(new CustomEvent('ds:deselect'))}>
            {t('menu.select.none')}
          </button>
        </>
      ) : null}

      {tool === 'crop' ? (
        <>
          <button className="btn btn-sm btn-primary" onClick={() => window.dispatchEvent(new CustomEvent('ds:apply-crop'))}>
            <Icon name="check" size={13} /> {t('apply')} (Enter)
          </button>
          <button className="btn btn-sm" onClick={() => window.dispatchEvent(new CustomEvent('ds:cancel-crop'))}>
            {t('cancel')}
          </button>
        </>
      ) : null}

      {tool === 'gradient' ? (
        <>
          <div className="opt-group">
            <span className="opt-label">{t('text.gradientA')}</span>
            <MiniColor value={opts.gradientA} onChange={(v) => setToolOption({ gradientA: v })} />
          </div>
          <div className="opt-group">
            <span className="opt-label">{t('text.gradientB')}</span>
            <MiniColor value={opts.gradientB} onChange={(v) => setToolOption({ gradientB: v })} />
          </div>
          <div className="opt-group" style={{ minWidth: 130 }}>
            <span className="opt-label">{t('opt.gradientAngle')}</span>
            <Slider label="" min={0} max={360} value={opts.gradientAngle} onChange={(v) => setToolOption({ gradientAngle: v })} />
          </div>
        </>
      ) : null}

      {['move', 'zoom', 'hand', 'eyedropper'].includes(tool) ? (
        <span className="opt-label" style={{ opacity: 0.9 }}>
          {t(`tool.help.${tool}`)}
        </span>
      ) : null}

      <div className="grow" />
      <div className="opt-group">
        <button className={`icon-btn ${rulers ? 'active' : ''}`} title={t('menu.view.rulers')} onClick={toggleRulers}>
          <Icon name="ruler" size={15} />
        </button>
        <button className={`icon-btn ${grid ? 'active' : ''}`} title={t('menu.view.grid')} onClick={toggleGrid}>
          <Icon name="grid" size={15} />
        </button>
        <button className={`icon-btn ${snap ? 'active' : ''}`} title={t('menu.view.snapping')} onClick={toggleSnap}>
          <Icon name="magnet" size={15} />
        </button>
      </div>
      <div className="opt-group">
        <button className="icon-btn" title={t('menu.view.fit')} onClick={() => setZoom(1, { fit: true })}>
          <Icon name="fit" size={15} />
        </button>
        <span className="opt-label" style={{ fontVariantNumeric: 'tabular-nums', minWidth: 38, textAlign: 'center' }}>
          {Math.round((getState().fitMode ? 1 : zoom) * 100)}%
        </span>
      </div>
      <div className="opt-group">
        <select
          className="opt-select"
          value={layer?.blend || 'normal'}
          disabled={!layer}
          onChange={(e) => layer && updateLayer(layer.id, { blend: e.target.value }, { label: 'Blend' })}
          title={t('layers.blend')}
        >
          {BLEND_MODES.map((m) => (
            <option key={m} value={m}>
              {t(`blend.${m}`)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function MiniColor({ value, onChange }) {
  const safe = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : '#ffffff';
  return (
    <div className="color-input" style={{ width: 84, flex: 'none' }}>
      <input type="color" value={safe} onChange={(e) => onChange?.(e.target.value)} />
      <span className="hex" style={{ fontSize: 10 }}>
        {safe.replace('#', '').slice(0, 6)}
      </span>
    </div>
  );
}

export { ColorPicker, setTool };
