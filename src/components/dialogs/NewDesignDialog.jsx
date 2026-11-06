import React, { useMemo, useState } from 'react';
import { useEditor, useT, closeDialog, newDocument, getState } from '../../lib/store.js';
import { SIZE_PRESETS, SIZE_GROUPS, KITS } from '../../lib/presets.js';
import { Dialog, Button, Slider, ColorPicker } from '../ui.jsx';
import { bgCss } from '../panels/StudioPanel.jsx';

export default function NewDesignDialog() {
  const t = useT();
  const doc = useEditor((s) => s.doc);
  const [w, setW] = useState(doc?.w || 1280);
  const [h, setH] = useState(doc?.h || 720);
  const [name, setName] = useState('');
  const [bg, setBg] = useState('#ffffff');
  const [kit, setKit] = useState('');
  const [group, setGroup] = useState('video');
  const [error, setError] = useState('');

  const presets = useMemo(() => SIZE_PRESETS.filter((s) => s.group === group), [group]);

  const create = () => {
    const width = Math.round(Number(w));
    const height = Math.round(Number(h));
    if (!width || !height || width < 16 || height < 16 || width > 10000 || height > 10000) {
      setError(t('new.invalid'));
      return;
    }
    newDocument({ w: width, h: height, name: name || t('ws.untitled'), background: bg, kitId: kit || null });
  };

  return (
    <Dialog
      title={t('new.title')}
      sub={t('new.sub')}
      icon="plus"
      onClose={() => closeDialog('new')}
      footer={
        <>
          <span className="mute-2 grow" style={{ textAlign: 'start' }}>
            {w} × {h} px
          </span>
          <Button onClick={() => closeDialog('new')}>{t('cancel')}</Button>
          <Button variant="primary" icon="check" onClick={create}>
            {t('new.create')}
          </Button>
        </>
      }
    >
      <div className="two-col">
        <div>
          <div className="field">
            <label>{t('new.name')}</label>
            <input type="text" value={name} placeholder={t('new.namePlaceholder')} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="num-pair" style={{ marginBottom: 12 }}>
            <div className="num-field">
              <label>{t('width')}</label>
              <input type="number" value={w} min={16} max={10000} onChange={(e) => setW(e.target.value)} />
            </div>
            <div className="num-field">
              <label>{t('height')}</label>
              <input type="number" value={h} min={16} max={10000} onChange={(e) => setH(e.target.value)} />
            </div>
          </div>
          <div className="row" style={{ gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
            {[1, 2, 3, 4].map((n) => (
              <button key={n} className="chip" onClick={() => setH(Math.round(w / n))}>
                {n === 1 ? '1:1' : `4:${4 / n === 2 ? 3 : 4 / n === 1 ? 1 : ''}`.replace('4:4', '1:1')}
              </button>
            ))}
            <button className="chip" onClick={() => setH(Math.round((w * 9) / 16))}>
              16:9
            </button>
            <button className="chip" onClick={() => setH(Math.round((w * 4) / 5))}>
              4:5
            </button>
            <button className="chip" onClick={() => setH(Math.round((w * 9) / 16))}>
              {t('size.youtube')}
            </button>
          </div>

          <div className="field">
            <label>{t('new.background')}</label>
            <div className="row" style={{ gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
              <button className={`chip ${bg === '#ffffff' ? 'active' : ''}`} onClick={() => setBg('#ffffff')}>
                {t('new.bg.white')}
              </button>
              <button className={`chip ${bg === '#000000' ? 'active' : ''}`} onClick={() => setBg('#000000')}>
                {t('new.bg.black')}
              </button>
              <button className={`chip ${bg === 'transparent' ? 'active' : ''}`} onClick={() => setBg('transparent')}>
                {t('new.bg.transparent')}
              </button>
              <button className={`chip ${bg?.kind ? 'active' : ''}`} onClick={() => setBg({ kind: 'linear', colors: ['#0b1020', '#1e3a8a'], angle: 135 })}>
                {t('opt.gradient')}
              </button>
            </div>
            {typeof bg === 'string' && bg !== 'transparent' ? (
              <ColorPicker value={bg} onChange={setBg} swatches />
            ) : null}
          </div>

          <div className="field">
            <label>{t('studio.kits')}</label>
            <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
              <button className={`chip ${!kit ? 'active' : ''}`} onClick={() => setKit('')}>
                {t('none')}
              </button>
              {KITS.map((k) => (
                <button key={k.id} className={`chip ${kit === k.id ? 'active' : ''}`} onClick={() => setKit(k.id)}>
                  {t(k.nameKey)}
                </button>
              ))}
            </div>
            {kit ? (
              <div
                style={{
                  height: 54,
                  borderRadius: 10,
                  marginTop: 8,
                  background: bgCss(KITS.find((k) => k.id === kit)?.background),
                  border: '1px solid var(--border)',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fff',
                  fontWeight: 900,
                  fontFamily: 'Anton, sans-serif',
                  letterSpacing: 0.5,
                  textShadow: '0 2px 10px rgba(0,0,0,.6)',
                  fontSize: 18,
                }}
              >
                {KITS.find((k) => k.id === kit)?.headline}
              </div>
            ) : null}
          </div>
          {error ? (
            <div style={{ color: '#ff8080', fontSize: 11.5 }}>{error}</div>
          ) : null}
        </div>

        <div>
          <div className="row" style={{ gap: 4, flexWrap: 'wrap', marginBottom: 9 }}>
            {SIZE_GROUPS.map((g) => (
              <button key={g.id} className={`chip ${group === g.id ? 'active' : ''}`} onClick={() => setGroup(g.id)}>
                {t(g.nameKey)}
              </button>
            ))}
          </div>
          <div className="size-grid">
            {presets.map((p) => (
              <button
                key={p.id}
                className={`size-tile ${p.w === Number(w) && p.h === Number(h) ? 'active' : ''}`}
                onClick={() => {
                  setW(p.w);
                  setH(p.h);
                  if (!name) setName(t(`size.${p.id}`));
                }}
              >
                <b>{t(`size.${p.id}`)}</b>
                <span>
                  {p.w} × {p.h}
                </span>
              </button>
            ))}
          </div>
          <div className="card" style={{ marginTop: 12, fontSize: 11.5, color: 'var(--text-mute)', lineHeight: 1.6 }}>
            <b style={{ color: 'var(--text-dim)' }}>{t('tips')}</b>
            <div>{t('start.dragDrop')}</div>
            <div style={{ marginTop: 4 }}>
              {t('app.tagline')} · {t('start.langHint')}
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <Slider label={`${t('width')} / ${t('height')}`} min={16} max={4096} value={Number(w)} onChange={(v) => setW(v)} />
          </div>
        </div>
      </div>
      {void getState()}
    </Dialog>
  );
}
