import React, { useMemo, useState } from 'react';
import { useEditor, useT, closeDialog, toast } from '../../lib/store.js';
import { Dialog, Button, Slider, Switch, Section } from '../ui.jsx';
import Icon from '../Icon.jsx';
import { doExport, copyPreviewToClipboard } from '../../lib/actions.js';
import { exportCanvas, canvasToDataUrl } from '../../lib/render.js';

export default function ExportDialog() {
  const t = useT();
  const doc = useEditor((s) => s.doc);
  const [format, setFormat] = useState('png');
  const [quality, setQuality] = useState(0.92);
  const [scale, setScale] = useState(1);
  const [transparent, setTransparent] = useState(false);
  const [name, setName] = useState(doc?.name || 'design');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  const preview = useMemo(() => {
    if (!doc) return null;
    try {
      const maxSide = 520;
      const s = Math.min(scale, maxSide / Math.max(doc.w, doc.h));
      const c = exportCanvas(doc, { scale: s, format, quality, transparent });
      return canvasToDataUrl(c, format === 'png' ? 'png' : 'jpg', quality);
    } catch {
      return null;
    }
  }, [doc, scale, format, quality, transparent]);

  if (!doc) return null;
  const outW = Math.round(doc.w * scale);
  const outH = Math.round(doc.h * scale);

  const run = async () => {
    if (!name.trim()) {
      toast('export.invalidName', 'error');
      return;
    }
    if (outW * outH > 40_000_000) {
      toast('export.tooBig', 'error');
      return;
    }
    setBusy(true);
    try {
      const res = await doExport({ format, scale, quality, transparent, fileName: name.trim() });
      setDone(res);
      toast('toast.exported');
    } catch (err) {
      console.error(err);
      toast('export.error', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      title={t('export.title')}
      sub={t('export.sub')}
      icon="download"
      onClose={() => closeDialog('export')}
      footer={
        <>
          <span className="mute-2 grow" style={{ textAlign: 'start' }}>
            {outW} × {outH} px
          </span>
          <Button onClick={() => closeDialog('export')}>{t('close')}</Button>
          <Button variant="primary" icon="download" onClick={run} disabled={busy}>
            {busy ? t('loading') : t('export.save')}
          </Button>
        </>
      }
    >
      <div className="two-col">
        <div>
          <div className="field">
            <label>{t('export.filename')}</label>
            <div className="row">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
              <span className="tag">.{format === 'jpg' ? 'jpg' : format}</span>
            </div>
          </div>

          <div className="field">
            <label>{t('export.format')}</label>
            <div className="row" style={{ gap: 5 }}>
              {[
                { id: 'png', label: 'PNG' },
                { id: 'jpg', label: 'JPG' },
                { id: 'webp', label: 'WEBP' },
              ].map((f) => (
                <button key={f.id} className={`chip ${format === f.id ? 'active' : ''}`} onClick={() => setFormat(f.id)}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {format !== 'png' ? (
            <Slider
              label={t('export.quality')}
              min={0.3}
              max={1}
              step={0.01}
              value={quality}
              onChange={setQuality}
              format={(v) => `${Math.round(v * 100)}%`}
            />
          ) : null}

          <Slider
            label={t('export.scale')}
            min={0.25}
            max={4}
            step={0.25}
            value={scale}
            onChange={setScale}
            format={(v) => `${v}×`}
          />

          {format === 'png' ? (
            <div className="check-row">
              <div className="grow">
                <b>{t('export.transparent')}</b>
                <span>{t('new.bg.transparent')}</span>
              </div>
              <Switch checked={transparent} onChange={setTransparent} />
            </div>
          ) : null}

          <div className="row" style={{ gap: 6, marginTop: 12 }}>
            <Button size="sm" icon="copy" onClick={copyPreviewToClipboard} style={{ flex: 1 }}>
              {t('export.copyClipboard')}
            </Button>
            <Button size="sm" icon="grid" onClick={() => { closeDialog('export'); window.dispatchEvent(new CustomEvent('ds:open', { detail: 'social' })); }}>
              {t('export.socialTitle')}
            </Button>
          </div>

          {done && !done.canceled ? (
            <div className="card" style={{ marginTop: 12, borderColor: 'color-mix(in srgb, #22c55e 40%, var(--border))' }}>
              <div className="row" style={{ gap: 7, marginBottom: 4 }}>
                <Icon name="check" size={15} />
                <b style={{ fontSize: 12 }}>{t('export.success')}</b>
              </div>
              <div className="mute-2" style={{ wordBreak: 'break-all' }}>
                {done.path}
              </div>
              <Button
                size="sm"
                icon="external"
                style={{ marginTop: 8 }}
                onClick={() => window.dispatchEvent(new CustomEvent('ds:reveal', { detail: done.path }))}
              >
                {t('export.showFolder')}
              </Button>
            </div>
          ) : null}
        </div>

        <div>
          <Section title={t('export.preview')}>
            <div className="export-preview">
              {preview ? <img src={preview} alt="preview" /> : <span className="mute-2">{t('loading')}</span>}
            </div>
            <div className="stat-row">
              <span>{t('size')}</span>
              <b>
                {outW} × {outH}
              </b>
            </div>
            <div className="stat-row">
              <span>{t('export.format')}</span>
              <b>{format.toUpperCase()}</b>
            </div>
            <div className="stat-row">
              <span>{t('export.estimated')}</span>
              <b>{estimateSize(outW, outH, format, quality)}</b>
            </div>
          </Section>
          <div className="card mute-2" style={{ fontSize: 11, lineHeight: 1.6 }}>
            {t('misc.desktopHint')}
          </div>
        </div>
      </div>
    </Dialog>
  );
}

function estimateSize(w, h, format, quality) {
  const px = w * h;
  if (format === 'png') return `${Math.round((px * 0.45) / 1024)} KB`;
  if (format === 'webp') return `${Math.round((px * 0.12 * quality) / 1024)} KB`;
  return `${Math.round((px * 0.16 * quality) / 1024)} KB`;
}
