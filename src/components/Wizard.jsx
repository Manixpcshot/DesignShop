// DesignShop Assistant — a chat bubble that performs design actions offline.
import React, { useEffect, useRef, useState } from 'react';
import { useEditor, useT, openDialog, closeDialog, getState } from '../lib/store.js';
import { runWizard } from '../lib/wizard.js';
import Icon from './Icon.jsx';
import { Button } from './ui.jsx';

export default function Wizard() {
  const t = useT();
  const open = useEditor((s) => s.dialogs.wizard);
  const [log, setLog] = useState([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    if (open && log.length === 0) {
      setLog([{ role: 'bot', text: t('wiz.hello'), chips: [t('wiz.sug1'), t('wiz.sug2'), t('wiz.sug3'), t('wiz.sug7')] }]);
    }
  }, [open, log.length, t]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [log, thinking]);

  const send = (text) => {
    const value = (text ?? input).trim();
    if (!value) return;
    setInput('');
    setLog((l) => [...l, { role: 'user', text: value }]);
    setThinking(true);
    setTimeout(() => {
      try {
        const result = runWizard(value, t);
        setLog((l) => [...l, ...result.messages]);
      } catch (err) {
        console.error(err);
        setLog((l) => [...l, { role: 'bot', text: t('wiz.unknown') }]);
      } finally {
        setThinking(false);
      }
    }, 260);
  };

  if (!open) {
    return (
      <button
        className="wizard-fab"
        title={`${t('wiz.title')} (Ctrl+/)`}
        aria-label={t('wiz.title')}
        onClick={() => openDialog('wizard')}
        style={{ display: getState().screen === 'editor' ? 'grid' : 'none' }}
      >
        <Icon name="sparkles" size={23} />
      </button>
    );
  }

  return (
    <div className="wizard" role="dialog" aria-label={t('wiz.title')}>
      <div className="wizard-head">
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            display: 'grid',
            placeItems: 'center',
            background: 'linear-gradient(150deg, var(--accent), #b06cff)',
            color: '#fff',
          }}
        >
          <Icon name="sparkles" size={16} />
        </div>
        <div className="grow">
          <h3>{t('wiz.title')}</h3>
          <div className="mute-2" style={{ fontSize: 10.5 }}>
            {t('wiz.sub')}
          </div>
        </div>
        <button className="icon-btn" onClick={() => closeDialog('wizard')} title={t('close')}>
          <Icon name="close" size={15} />
        </button>
      </div>

      <div className="wizard-log">
        {log.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <div dir="auto">{m.text}</div>
            {m.chips?.length ? (
              <div className="msg-actions">
                {m.chips.map((c) => (
                  <button key={c} className="chip" style={{ height: 24, fontSize: 10.5 }} onClick={() => send(c)}>
                    {c}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ))}
        {thinking ? <div className="msg bot">{t('wiz.thinking')}</div> : null}
        <div ref={endRef} />
      </div>

      <div className="suggestions">
        {[t('wiz.sug1'), t('wiz.sug4'), t('wiz.sug5'), t('wiz.sug6')].map((s) => (
          <button key={s} className="chip" style={{ height: 25, fontSize: 10.5 }} onClick={() => send(s)}>
            {s}
          </button>
        ))}
      </div>

      <div className="wizard-input">
        <input
          type="text"
          dir="auto"
          value={input}
          placeholder={t('wiz.placeholder')}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              send();
            }
          }}
        />
        <Button variant="primary" size="sm" icon="send" onClick={() => send()} title={t('wiz.send')} />
      </div>
    </div>
  );
}
