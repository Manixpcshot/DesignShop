// Layers panel with drag-to-reorder, rename, blend, opacity and transform.
import React, { useRef, useState } from 'react';
import {
  useEditor,
  useT,
  selectLayer,
  updateLayer,
  deleteLayer,
  duplicateLayer,
  moveLayerToIndex,
  toggleLayerVisible,
  toggleLayerLock,
  addNewLayer,
  addImageFromDataUrl,
  loadImageSize,
  toast,
  activeLayer,
  alignLayer,
  mergeDown,
  enterFreeTransform,
} from '../../lib/store.js';
import { BLEND_MODES, EMOJI_SETS } from '../../lib/presets.js';
import { getLayerCanvas } from '../../lib/render.js';
import { Section, Slider, Select, IconButton, Button } from '../ui.jsx';
import { openFileDialog } from '../../lib/platform.js';
import Icon from '../Icon.jsx';

const TYPE_ICON = { text: 'type', shape: 'rect', image: 'image', emoji: 'smile', brush: 'brush', adjust: 'sliders', group: 'layers' };

function LayerThumb({ layer }) {
  const [src, setSrc] = useState(null);
  React.useEffect(() => {
    let alive = true;
    try {
      if (layer.type === 'image') {
        setSrc(layer.src);
        return;
      }
      const c = getLayerCanvas(layer);
      if (c && alive) setSrc(c.toDataURL('image/png'));
    } catch {
      setSrc(null);
    }
    return () => {
      alive = false;
    };
  }, [layer]);
  if (layer.type === 'emoji') return <div className="layer-thumb">{layer.emoji}</div>;
  if (src) return <div className="layer-thumb">{<img src={src} alt="" />}</div>;
  return (
    <div className="layer-thumb">
      <Icon name={TYPE_ICON[layer.type] || 'rect'} size={14} />
    </div>
  );
}

export default function LayersPanel() {
  const t = useT();
  const doc = useEditor((s) => s.doc);
  const selection = useEditor((s) => s.selection);
  const layer = useEditor((s) => activeLayer(s));
  const [renaming, setRenaming] = useState(null);
  const [query, setQuery] = useState('');
  const [dragId, setDragId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const fileRef = useRef(null);

  if (!doc) {
    return <Section title={t('layers.title')}> <div className="empty-state">{t('layers.empty')}</div></Section>;
  }

  const visible = [...doc.layers].reverse().filter((l) => !query || (l.name || '').toLowerCase().includes(query.toLowerCase()));

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.name.toLowerCase().endsWith('.dshop')) {
      toast(t('misc.openPanel'), 'info');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const size = await loadImageSize(reader.result);
        addImageFromDataUrl(reader.result, { name: file.name, imgW: size.w, imgH: size.h });
      } catch {
        toast('open.imageFailed', 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  const addImage = async () => {
    const res = await openFileDialog();
    if (!res) return;
    if (res.name.toLowerCase().endsWith('.dshop')) {
      if (fileRef.current) fileRef.current.click();
      return;
    }
    try {
      const size = await loadImageSize(res.dataUrl);
      addImageFromDataUrl(res.dataUrl, { name: res.name, imgW: size.w, imgH: size.h });
    } catch {
      toast('open.imageFailed', 'error');
    }
  };

  return (
    <>
      <Section
        title={t('layers.title')}
        right={
          <div className="row" style={{ gap: 2 }}>
            <IconButton icon="plus" title={t('layers.add')} onClick={() => addNewLayer('shape')} size={14} />
            <IconButton icon="type" title={t('layers.addText')} onClick={() => addNewLayer('text')} size={14} />
            <IconButton icon="image" title={t('layers.addImage')} onClick={addImage} size={14} />
            <IconButton icon="smile" title={t('layers.addSticker')} onClick={() => addNewLayer('emoji')} size={14} />
          </div>
        }
      >
        <input
          type="text"
          placeholder={t('layers.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ marginBottom: 8, height: 28, fontSize: 11.5 }}
        />
        <div className="layers-list" onDragOver={(e) => e.preventDefault()}>
          {visible.length === 0 ? (
            <div className="empty-state">
              <Icon name="layers" size={26} />
              <div>{query ? t('layers.noMatch') : t('layers.emptyHint')}</div>
            </div>
          ) : null}
          {visible.map((l) => {
            const idx = doc.layers.findIndex((x) => x.id === l.id);
            const isDrop = dropTarget?.id === l.id;
            return (
              <div
                key={l.id}
                className={`layer-row ${selection.includes(l.id) ? 'selected' : ''} ${dragId === l.id ? 'dragging' : ''} ${
                  isDrop ? (dropTarget.before ? 'drop-before' : 'drop-after') : ''
                }`}
                onClick={(e) => selectLayer(l.id, { toggle: e.shiftKey, additive: e.metaKey || e.ctrlKey })}
                onDoubleClick={() => setRenaming(l.id)}
                draggable={renaming !== l.id}
                onDragStart={() => setDragId(l.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  const r = e.currentTarget.getBoundingClientRect();
                  const before = e.clientY < r.top + r.height / 2;
                  setDropTarget({ id: l.id, before });
                }}
                onDragLeave={() => setDropTarget((d) => (d?.id === l.id ? null : d))}
                onDragEnd={() => {
                  setDragId(null);
                  setDropTarget(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!dragId || !dropTarget) return;
                  const fromIdx = doc.layers.findIndex((x) => x.id === dragId);
                  let toIdx = doc.layers.findIndex((x) => x.id === dropTarget.id);
                  // reversed list: dropping "before" visually = higher in the array
                  if (!dropTarget.before) toIdx = Math.max(0, toIdx - 1);
                  if (fromIdx < toIdx) toIdx -= 1;
                  moveLayerToIndex(dragId, toIdx);
                  setDragId(null);
                  setDropTarget(null);
                }}
              >
                <button
                  className={`layer-eye ${l.visible ? '' : 'off'}`}
                  title={t('layers.visible')}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLayerVisible(l.id);
                  }}
                >
                  <Icon name={l.visible ? 'eye' : 'eyeOff'} size={14} />
                </button>
                <LayerThumb layer={l} />
                <div className="layer-meta">
                  {renaming === l.id ? (
                    <input
                      className="layer-name-input"
                      autoFocus
                      defaultValue={l.name}
                      onBlur={(e) => {
                        updateLayer(l.id, { name: e.target.value || l.name }, { label: 'Rename', history: false });
                        setRenaming(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                        if (e.key === 'Escape') setRenaming(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="layer-name">{l.name || t(`layers.type.${l.type}`)}</span>
                  )}
                  <span className="layer-type">
                    {t(`layers.type.${l.type === 'shape' ? 'shape' : l.type}`)} · {idx + 1}
                    {l.locked ? ' · 🔒' : ''}
                  </span>
                </div>
                <button
                  className="layer-eye"
                  title={l.locked ? t('layers.unlock') : t('layers.lock')}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLayerLock(l.id);
                  }}
                >
                  <Icon name={l.locked ? 'lock' : 'unlock'} size={13} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="row" style={{ marginTop: 9, gap: 4 }}>
          <IconButton icon="copy" title={t('duplicate')} onClick={() => duplicateLayer()} />
          <IconButton icon="front" title={t('menu.layer.bringFront')} onClick={() => layer && moveLayerToIndex(layer.id, doc.layers.length - 1)} />
          <IconButton icon="back" title={t('menu.layer.sendBack')} onClick={() => layer && moveLayerToIndex(layer.id, 0)} />
          <IconButton icon="layers" title={t('layers.mergeDown')} onClick={() => mergeDown()} />
          <div className="grow" />
          <IconButton icon="trash" title={t('delete')} onClick={() => deleteLayer()} />
        </div>
      </Section>

      {layer ? (
        <>
          <Section title={t('layers.settings')}>
            <div className="field">
              <label>{t('layers.name')}</label>
              <input
                type="text"
                value={layer.name || ''}
                onChange={(e) => updateLayer(layer.id, { name: e.target.value }, { history: false, label: 'Rename' })}
              />
            </div>
            <Select
              label={t('layers.blend')}
              value={layer.blend || 'normal'}
              options={BLEND_MODES.map((m) => ({ value: m, label: t(`blend.${m}`) }))}
              onChange={(v) => updateLayer(layer.id, { blend: v }, { label: 'Blend mode' })}
            />
            <Slider
              label={t('layers.opacity')}
              min={0}
              max={100}
              value={layer.opacity ?? 100}
              onChange={(v) => updateLayer(layer.id, { opacity: v }, { history: false })}
              suffix="%"
            />
            <div className="row" style={{ gap: 4 }}>
              <button className="chip" onClick={() => enterFreeTransform()}>
                <Icon name="cursor" size={12} /> {t('menu.edit.transform')}
              </button>
            </div>
          </Section>

          <Section title={t('layers.transform')}>
            <div className="row" style={{ gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
              <IconButton icon="flipH" title={t('layers.flipH')} onClick={() => updateLayer(layer.id, { scaleX: (layer.scaleX ?? 1) * -1 })} />
              <IconButton icon="flipV" title={t('layers.flipV')} onClick={() => updateLayer(layer.id, { scaleY: (layer.scaleY ?? 1) * -1 })} />
              <IconButton
                icon="rotate"
                title={t('layers.rotate90')}
                onClick={() => updateLayer(layer.id, { rotation: ((layer.rotation || 0) + 90) % 360 })}
              />
              <div className="vsep" />
              <IconButton icon="centerH" title={t('layers.centerH')} onClick={() => alignLayer(layer.id, 'centerH')} />
              <IconButton icon="centerV" title={t('layers.centerV')} onClick={() => alignLayer(layer.id, 'centerV')} />
              <IconButton icon="rect" title={t('layers.alignLeft')} onClick={() => alignLayer(layer.id, 'left')} />
              <IconButton icon="back" title={t('layers.alignRight')} onClick={() => alignLayer(layer.id, 'right')} />
            </div>
            <div className="num-pair">
              <Slider label="X" min={-300} max={doc.w + 300} value={Math.round(layer.x)} onChange={(v) => updateLayer(layer.id, { x: v }, { history: false })} />
              <Slider label="Y" min={-300} max={doc.h + 300} value={Math.round(layer.y)} onChange={(v) => updateLayer(layer.id, { y: v }, { history: false })} />
            </div>
            <div className="num-pair">
              <Slider label="W" min={8} max={doc.w * 2} value={Math.round(layer.w)} onChange={(v) => updateLayer(layer.id, { w: v }, { history: false })} />
              <Slider label="H" min={8} max={doc.h * 2} value={Math.round(layer.h)} onChange={(v) => updateLayer(layer.id, { h: v }, { history: false })} />
            </div>
            <Slider label={t('rotation')} min={-180} max={180} value={Math.round(layer.rotation || 0)} onChange={(v) => updateLayer(layer.id, { rotation: v }, { history: false })} suffix="°" />
            {layer.type === 'image' ? (
              <div className="row" style={{ gap: 5, flexWrap: 'wrap' }}>
                <button className={`chip ${layer.mask === 'circle' ? 'active' : ''}`} onClick={() => updateLayer(layer.id, { mask: layer.mask === 'circle' ? null : 'circle' }, { label: 'Mask' })}>
                  <Icon name="ellipse" size={12} /> {t('studio.faceCrop')}
                </button>
                <button className="chip" onClick={() => { updateLayer(layer.id, { x: 0, y: 0, w: doc.w, h: doc.h }, { label: 'Fit' }); }}>
                  <Icon name="fit" size={12} /> {t('ws.fit')}
                </button>
              </div>
            ) : null}
            {layer.type === 'shape' ? (
              <>
                <div className="sep" />
                <Slider
                  label={t('opt.cornerRadius')}
                  min={0}
                  max={Math.round(Math.min(layer.w, layer.h) / 2) || 20}
                  value={layer.radius || 0}
                  onChange={(v) => updateLayer(layer.id, { radius: v }, { history: false })}
                />
                <Slider
                  label={t('opt.strokeWidth')}
                  min={0}
                  max={60}
                  value={layer.strokeWidth || 0}
                  onChange={(v) => updateLayer(layer.id, { strokeWidth: v, stroke: layer.stroke || layer.fillColor }, { history: false })}
                />
                {['star', 'polygon'].includes(layer.shape) ? (
                  <Slider
                    label="Points"
                    min={3}
                    max={16}
                    value={layer.points || 5}
                    onChange={(v) => updateLayer(layer.id, { points: v }, { history: false })}
                  />
                ) : null}
              </>
            ) : null}
          </Section>
        </>
      ) : (
        <Section>
          <div className="empty-state">{t('opt.selectLayer')}</div>
        </Section>
      )}
    </>
  );
}

export { EMOJI_SETS, Button };
