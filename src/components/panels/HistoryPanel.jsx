import React from 'react';
import { useEditor, useT, undo, redo, jumpToHistory, getState, toast } from '../../lib/store.js';
import { Section, Button } from '../ui.jsx';
import Icon from '../Icon.jsx';

export default function HistoryPanel() {
  const t = useT();
  const past = useEditor((s) => s.past);
  const future = useEditor((s) => s.future);
  const doc = useEditor((s) => s.doc);

  if (!doc) return <Section title={t('history.title')}>{t('history.empty')}</Section>;

  return (
    <>
      <Section title={t('history.title')} sub={t('history.sub')} right={<span className="tag">{past.length}</span>}>
        <div className="row" style={{ gap: 5, marginBottom: 10 }}>
          <Button size="sm" icon="undo" onClick={undo} disabled={!past.length} style={{ flex: 1 }}>
            {t('sc.undo')}
          </Button>
          <Button size="sm" icon="redo" onClick={redo} disabled={!future.length} style={{ flex: 1 }}>
            {t('sc.redo')}
          </Button>
        </div>
        <div className="history-list">
          <div className="history-row current">
            <span className="history-dot" />
            <span className="grow">{t('history.current')}</span>
            <span className="mute-2">{t('history.initial')}</span>
          </div>
          {[...past].reverse().map((entry, i) => (
            <button key={`${entry.label}-${i}`} className="history-row" onClick={() => jumpToHistory(past.length - 1 - i)}>
              <span className="history-dot" />
              <span className="grow ellipsis" style={{ textAlign: 'start' }}>
                {entry.label?.startsWith('toast.') || entry.label?.startsWith('menu.') ? t(entry.label) : entry.label}
              </span>
              <span className="mute-2">{past.length - i}</span>
            </button>
          ))}
        </div>
        <Button
          size="sm"
          icon="trash"
          style={{ width: '100%', marginTop: 10 }}
          onClick={() => {
            toast('history.clear');
            getState().past.length = 0;
            const st = getState();
            st.past = [];
            st.future = [];
          }}
        >
          {t('history.clear')}
        </Button>
      </Section>
      <Section title={t('misc.quickActions')}>
        <div className="col" style={{ gap: 6 }}>
          <Button size="sm" icon="keyboard" onClick={() => window.dispatchEvent(new CustomEvent('ds:open', { detail: 'shortcuts' }))}>
            {t('sc.title')}
          </Button>
          <Button size="sm" icon="lightbulb" onClick={() => window.dispatchEvent(new CustomEvent('ds:open', { detail: 'tour' }))}>
            {t('menu.help.tour')}
          </Button>
          <Button size="sm" icon="help" onClick={() => window.dispatchEvent(new CustomEvent('ds:open', { detail: 'guide' }))}>
            {t('menu.help.docs')}
          </Button>
        </div>
      </Section>
      <Section>
        <div className="stat-row">
          <span>{t('ws.canvas')}</span>
          <b>
            {doc.w}×{doc.h}
          </b>
        </div>
        <div className="stat-row">
          <span>{t('layers.title')}</span>
          <b>{doc.layers.length}</b>
        </div>
        <div className="stat-row">
          <span>{t('history.title')}</span>
          <b>{past.length}</b>
        </div>
        <div className="row" style={{ marginTop: 8, color: 'var(--text-mute)', fontSize: 11, gap: 5 }}>
          <Icon name="info" size={13} />
          <span>{t('misc.privacy')}</span>
        </div>
      </Section>
    </>
  );
}
