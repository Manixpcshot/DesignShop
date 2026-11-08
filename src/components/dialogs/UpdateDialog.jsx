// Updates: check GitHub, show what changed, install.
//
// The dialog is deliberately boring — one status line, one button that always
// says what will happen next, and the release notes so the user can decide.
import React, { useEffect, useState } from 'react';
import { useEditor, useT, closeDialog, updatePrefs, toast } from '../../lib/store.js';
import { Dialog, Button, Switch } from '../ui.jsx';
import Icon from '../Icon.jsx';
import {
  APP_VERSION,
  applyUpdate,
  checkForUpdate,
  lastCheck,
  pickAsset,
  summarizeNotes,
  UPDATE_INTERVAL_MS,
  UPDATE_REPO,
} from '../../lib/updater.js';
import { PLATFORM } from '../../lib/platform.js';

const kb = (n) => (n ? `${Math.round(n / 1024 / 1024)} MB` : '');

export default function UpdateDialog() {
  const t = useT();
  const prefs = useEditor((s) => s.prefs);
  const [state, setState] = useState({ status: 'idle', result: null, progress: null, error: null });

  const runCheck = async () => {
    setState((s) => ({ ...s, status: 'checking', error: null }));
    const result = await checkForUpdate();
    if (!result.ok) {
      setState({ status: 'error', result, progress: null, error: result.error });
      return;
    }
    updatePrefs({ lastUpdateCheck: result.checkedAt });
    setState({ status: result.update ? 'available' : 'current', result, progress: null, error: null });
  };

  useEffect(() => {
    const cache = lastCheck();
    if (cache?.latest) {
      const newer = cache.latest !== cache.current;
      setState((s) => ({ ...s, status: newer ? 'available' : 'idle' }));
    }
    runCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const install = async () => {
    const update = state.result?.update;
    if (!update) return;
    setState((s) => ({ ...s, status: 'installing', error: null }));
    const out = await applyUpdate(update, {
      onProgress: (p) => setState((s) => ({ ...s, progress: p })),
    });
    if (!out.ok) {
      setState((s) => ({ ...s, status: 'error', error: out.error }));
      toast('update.failed', 'error');
      return;
    }
    setState((s) => ({ ...s, status: 'installed' }));
    toast(out.external ? 'update.handedOver' : 'update.downloaded');
  };

  const result = state.result;
  const update = result?.update;
  const asset = update ? update.assetName || pickAsset({ assets: [] })?.name : null;
  const notes = update ? summarizeNotes(update.notes) : [];

  const statusLine = () => {
    if (state.status === 'checking') return t('update.checking');
    if (state.status === 'error') return t('update.offline', { error: state.error || '' });
    if (state.status === 'current') return t('update.upToDate', { version: APP_VERSION });
    if (update) return t('update.available', { version: update.version, current: APP_VERSION });
    return t('update.idle');
  };

  return (
    <Dialog
      title={t('update.title')}
      sub={t('update.sub')}
      icon="download"
      onClose={() => closeDialog('updates')}
      size="md"
      footer={
        <>
          <Button onClick={runCheck} icon="refresh" disabled={state.status === 'checking'}>
            {t('update.check')}
          </Button>
          <div className="grow" />
          {update ? (
            <Button variant="primary" icon="download" onClick={install} disabled={state.status === 'installing'}>
              {state.status === 'installing' ? t('update.installing') : t('update.installBtn', { version: update.version })}
            </Button>
          ) : (
            <Button variant="primary" onClick={() => closeDialog('updates')}>
              {t('close')}
            </Button>
          )}
        </>
      }
    >
      <div className="update-status">
        <span
          className={`update-dot ${
            state.status === 'available' ? 'is-available' : state.status === 'error' ? 'is-error' : 'is-ok'
          }`}
        />
        <div className="update-status-text">
          <strong>{statusLine()}</strong>
          <span className="mute-2">
            {t('update.current', { version: APP_VERSION })} · {PLATFORM === 'tauri' ? 'Tauri' : PLATFORM === 'electron' ? 'Electron' : 'Web'}
            {result?.checkedAt ? ` · ${new Date(result.checkedAt).toLocaleTimeString()}` : ''}
          </span>
        </div>
      </div>

      {state.status === 'installing' ? (
        <div className="update-progress">
          <div className="update-progress-bar" style={{ width: `${state.progress?.percent || 15}%` }} />
          <span>{t('update.downloading')}</span>
        </div>
      ) : null}

      {update ? (
        <div className="update-card">
          <div className="update-card-head">
            <div>
              <strong>DesignShop {update.version}</strong>
              <span className="mute-2">
                {update.publishedAt ? new Date(update.publishedAt).toLocaleDateString() : ''}
                {asset ? ` · ${asset}` : ''}
                {update.assetSize ? ` · ${kb(update.assetSize)}` : ''}
              </span>
            </div>
            <a className="link-btn" href={update.url} target="_blank" rel="noreferrer">
              {t('update.releasePage')} <Icon name="external" size={11} />
            </a>
          </div>
          {notes.length ? (
            <ul className="update-notes">
              {notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="update-options">
        <label className="update-option">
          <Switch
            checked={prefs.autoUpdate !== false}
            onChange={(v) => updatePrefs({ autoUpdate: !!v })}
            title={t('update.autoTitle')}
          />
          <span>
            <strong>{t('update.autoTitle')}</strong>
            <em>{t('update.autoSub', { hours: String(Math.round(UPDATE_INTERVAL_MS / 3600000)) })}</em>
          </span>
        </label>
      </div>

      <p className="panel-sub" style={{ marginTop: 4 }}>
        {t('update.sourceNote', { repo: UPDATE_REPO })}
      </p>
    </Dialog>
  );
}
