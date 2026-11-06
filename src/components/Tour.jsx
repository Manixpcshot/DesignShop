// Five-step guided tour. Highlights real UI regions with a spotlight.
import React, { useEffect, useState } from 'react';
import { useEditor, useT, closeDialog, updatePrefs, getState } from '../lib/store.js';
import Icon from './Icon.jsx';

const STEPS = [
  { id: 1, sel: '.canvas-area', titleKey: 'tour.step1.title', bodyKey: 'tour.step1.body' },
  { id: 2, sel: '.toolbar', titleKey: 'tour.step2.title', bodyKey: 'tour.step2.body' },
  { id: 3, sel: '.panel', titleKey: 'tour.step3.title', bodyKey: 'tour.step3.body' },
  { id: 4, sel: '.panel-tabs', titleKey: 'tour.step4.title', bodyKey: 'tour.step4.body' },
  { id: 5, sel: '.wizard-fab', titleKey: 'tour.step5.title', bodyKey: 'tour.step5.body' },
];

export default function Tour() {
  const t = useT();
  const open = useEditor((s) => s.dialogs.tour);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const measure = () => {
      const el = document.querySelector(STEPS[step].sel);
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ x: r.left - 6, y: r.top - 6, w: r.width + 12, h: r.height + 12 });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [open, step]);

  if (!open) return null;
  const current = STEPS[step];
  const last = step === STEPS.length - 1;
  const cardStyle = rect
    ? (() => {
        const onRight = rect.x + rect.w + 360 < window.innerWidth;
        return {
          top: Math.min(Math.max(16, rect.y + 20), window.innerHeight - 260),
          left: onRight ? rect.x + rect.w + 16 : Math.max(16, rect.x - 350),
        };
      })()
    : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

  return (
    <>
      {rect ? <div className="tour-spot" style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }} /> : <div className="overlay" />}
      <div className="tour-card" style={cardStyle}>
        <div className="tour-progress">
          {STEPS.map((s, i) => (
            <i key={s.id} className={i <= step ? 'on' : ''} />
          ))}
        </div>
        <h4>{t(current.titleKey)}</h4>
        <p>{t(current.bodyKey, { key: 'Ctrl+/' })}</p>
        <div className="row">
          <span className="mute-2 grow" style={{ fontSize: 10.5 }}>
            {t('tour.stepOf', { now: step + 1, total: STEPS.length })}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => finish()}>
            {t('tour.skip')}
          </button>
          {step > 0 ? (
            <button className="btn btn-sm" onClick={() => setStep((s) => s - 1)}>
              {t('tour.back')}
            </button>
          ) : null}
          <button
            className="btn btn-primary btn-sm"
            onClick={() => (last ? finish() : setStep((s) => s + 1))}
          >
            {last ? t('tour.finish') : t('tour.next')}
          </button>
        </div>
      </div>
    </>
  );
}

function finish() {
  if (getState().screen !== 'editor') window.dispatchEvent(new CustomEvent('ds:start-demo'));
  updatePrefs({ seenTour: true });
  closeDialog('tour');
}

export { Icon };
