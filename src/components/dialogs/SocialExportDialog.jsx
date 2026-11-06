import React, { useState } from 'react';
import { useEditor, useT, closeDialog, toast } from '../../lib/store.js';
import { SOCIAL_EXPORT } from '../../lib/presets.js';
import { Dialog, Button, Switch } from '../ui.jsx';
import Icon from '../Icon.jsx';
import { exportAllSocial } from '../../lib/actions.js';

export default function SocialExportDialog() {
  const t = useT();
  const doc = useEditor((s) => s.doc);
  const [picked, setPicked] = useState(() => SOCIAL_EXPORT.map((s) => s.id));
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [finished, setFinished] = useState([]);

  if (!doc) return null;

  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const sizes = SOCIAL_EXPORT.filter((s) => picked.includes(s.id));

  const run = async () => {
    if (!sizes.length) {
      toast('export.needOne', 'error');
      return;
    }
    setBusy(true);
    setFinished([]);
    try {
      const res = await exportAllSocial({
        sizes,
        onProgress: (p) => setProgress(p),
      });
      setFinished(res);
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
      title={t('export.socialTitle')}
      sub={t('export.socialSub')}
      icon="grid"
      onClose={() => closeDialog('social')}
      footer={
        <>
          <span className="mute-2 grow" style={{ textAlign: 'start' }}>
            {progress ? t('export.progress', { done: progress.done, total: progress.total }) : `${sizes.length} ${t('export.socialRun', { count: sizes.length })}`}
          </span>
          <Button onClick={() => closeDialog('social')}>{t('close')}</Button>
          <Button variant="primary" icon="download" onClick={run} disabled={busy}>
            {busy ? t('loading') : t('export.socialRun', { count: sizes.length })}
          </Button>
        </>
      }
    >
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <div className="row" style={{ gap: 5 }}>
          <button className="chip" onClick={() => setPicked(SOCIAL_EXPORT.map((s) => s.id))}>
            {t('export.selectAll')}
          </button>
          <button className="chip" onClick={() => setPicked([])}>
            {t('clear')}
          </button>
        </div>
        <span className="tag">
          {doc.w} × {doc.h}
        </span>
      </div>

      <div className="social-grid">
        {SOCIAL_EXPORT.map((s) => {
          const on = picked.includes(s.id);
          return (
            <button
              key={s.id}
              className={`size-tile ${on ? 'active' : ''}`}
              onClick={() => toggle(s.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <span
                className="checkbox"
                style={on ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: '#05101f' } : undefined}
              >
                {on ? <Icon name="check" size={11} /> : null}
              </span>
              <span className="grow">
                <b>{t(`size.${s.id}`)}</b>
                <span>
                  {s.w} × {s.h}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {finished.length ? (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="row" style={{ gap: 6, marginBottom: 6 }}>
            <Icon name="check" size={14} />
            <b style={{ fontSize: 12 }}>
              {t('export.success')} — {finished.length}/{sizes.length}
            </b>
          </div>
          <div className="mute-2" style={{ fontSize: 11, maxHeight: 90, overflow: 'auto' }}>
            {finished.map((f) => (
              <div key={f.name} className="ellipsis">
                {f.path || f.name}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="card mute-2" style={{ marginTop: 10, fontSize: 11, lineHeight: 1.6 }}>
        {t('misc.desktopHint')}
      </div>
      <div style={{ height: 1 }}>{busy ? <ProgressBar value={progress ? progress.done / progress.total : 0} /> : null}</div>
    </Dialog>
  );
}

function ProgressBar({ value }) {
  return (
    <div style={{ height: 4, background: 'var(--bg-4)', borderRadius: 4, marginTop: 10, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.round(value * 100)}%`, background: 'var(--accent)', transition: 'width .2s' }} />
    </div>
  );
}

export { Switch };
