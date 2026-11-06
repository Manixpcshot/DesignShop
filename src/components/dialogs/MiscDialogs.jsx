// Preferences, shortcuts, about, updates and the user guide.
import React from 'react';
import { useEditor, useT, closeDialog, updatePrefs, setLang, setTheme, setAccent, getState } from '../../lib/store.js';
import { Dialog, Button, Switch, ColorPicker, Section } from '../ui.jsx';
import Icon from '../Icon.jsx';
import { LANGUAGES } from '../../lib/i18n.js';
import { platformLabel, PLATFORM } from '../../lib/platform.js';
import { VERSION } from '../../lib/store.js';

export function ShortcutsDialog() {
  const t = useT();
  const groups = [
    {
      title: t('sc.tools'),
      rows: [
        ['V', t('tool.move')],
        ['M', t('tool.marquee')],
        ['L', t('tool.lasso')],
        ['W', t('tool.wand')],
        ['C', t('tool.crop')],
        ['B', t('tool.brush')],
        ['E', t('tool.eraser')],
        ['T', t('tool.text')],
        ['U', t('tool.rect')],
        ['Y', t('tool.sticker')],
        ['H', t('tool.hand')],
        ['Z', t('tool.zoom')],
      ],
    },
    {
      title: t('sc.edit'),
      rows: [
        ['Ctrl/⌘ Z', t('sc.undo')],
        ['Ctrl/⌘ ⇧ Z', t('sc.redo')],
        ['Ctrl/⌘ C', t('sc.copy')],
        ['Ctrl/⌘ V', t('sc.paste')],
        ['Ctrl/⌘ J', t('sc.duplicate')],
        ['Ctrl/⌘ E', t('sc.mergeDown')],
        ['Delete', t('sc.delete')],
        ['Ctrl/⌘ A', t('sc.selectAll')],
        ['Esc', t('sc.deselect')],
        ['Enter', t('sc.enter')],
        ['[ / ]', t('sc.brushSize')],
        ['← ↑ → ↓', t('sc.nudge')],
        ['Shift + arrows', t('sc.nudgeBig')],
      ],
    },
    {
      title: t('sc.view'),
      rows: [
        ['Ctrl/⌘ +', t('sc.zoomIn')],
        ['Ctrl/⌘ −', t('sc.zoomOut')],
        ['Ctrl/⌘ 0', t('sc.fit')],
        ['Ctrl/⌘ 1', t('sc.hundred')],
        ['Space + drag', t('sc.pan')],
        ['F11', t('menu.view.fullscreen')],
      ],
    },
    {
      title: t('sc.file'),
      rows: [
        ['Ctrl/⌘ N', t('sc.newDoc')],
        ['Ctrl/⌘ O', t('sc.open')],
        ['Ctrl/⌘ S', t('sc.save')],
        ['Ctrl/⌘ ⇧ E', t('sc.export')],
        ['Ctrl/⌘ ⇧ S', t('menu.file.export')],
        ['Ctrl/⌘ /', t('sc.title')],
        ['Ctrl/⌘ K', t('wiz.title')],
      ],
    },
  ];
  return (
    <Dialog title={t('sc.title')} sub={t('sc.sub')} icon="keyboard" size="md" onClose={() => closeDialog('shortcuts')}
      footer={<Button variant="primary" onClick={() => closeDialog('shortcuts')}>{t('done')}</Button>}>
      <div className="two-col">
        {groups.map((g) => (
          <div key={g.title}>
            <h4 style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--text-mute)', margin: '0 0 7px' }}>
              {g.title}
            </h4>
            {g.rows.map(([k, label]) => (
              <div key={k + label} className="stat-row" style={{ borderBottom: '1px solid var(--border-soft)' }}>
                <span style={{ textAlign: 'start' }}>{label}</span>
                <span className="kbd">{k}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Dialog>
  );
}

export function PreferencesDialog() {
  const t = useT();
  const prefs = useEditor((s) => s.prefs);
  return (
    <Dialog title={t('pref.title')} icon="settings" size="md" onClose={() => closeDialog('prefs')}
      footer={<Button variant="primary" onClick={() => closeDialog('prefs')}>{t('done')}</Button>}>
      <Section title={t('pref.language')} sub={t('pref.languageSub')}>
        <div className="row" style={{ gap: 6 }}>
          {LANGUAGES.map((l) => (
            <button key={l.code} className={`chip ${prefs.lang === l.code ? 'active' : ''}`} onClick={() => setLang(l.code)}>
              {l.flag} {l.native}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 8 }} className="mute-2">
          {t('pref.rtlSub')}
        </div>
      </Section>
      <Section title={t('pref.theme')}>
        <div className="row" style={{ gap: 6, marginBottom: 10 }}>
          {[
            ['dark', 'moon', t('pref.theme.dark')],
            ['light', 'sun', t('pref.theme.light')],
            ['midnight', 'moon', t('pref.theme.midnight')],
          ].map(([id, icon, label]) => (
            <button key={id} className={`chip ${prefs.theme === id ? 'active' : ''}`} onClick={() => setTheme(id)}>
              <Icon name={icon} size={12} /> {label}
            </button>
          ))}
        </div>
        <ColorPicker
          label={t('pref.accent')}
          value={prefs.accent}
          onChange={(c) => setAccent(c)}
          swatches={false}
        />
        <div className="row" style={{ gap: 6, marginTop: -4 }}>
          {['#4c8dff', '#12d8ff', '#b06cff', '#ff2d95', '#22c55e', '#f59e0b'].map((c) => (
            <button key={c} className="swatch" style={{ background: c }} onClick={() => setAccent(c)} />
          ))}
        </div>
      </Section>
      <Section title={t('pref.general')}>
        <CheckRow label={t('pref.grid')} checked={prefs.grid} onChange={(v) => updatePrefs({ grid: v })} />
        <CheckRow label={t('pref.rulers')} checked={prefs.rulers} onChange={(v) => updatePrefs({ rulers: v })} />
        <CheckRow label={t('pref.snap')} checked={prefs.snap} onChange={(v) => updatePrefs({ snap: v })} />
        <CheckRow label={t('pref.autosave')} checked={prefs.autosave} onChange={(v) => updatePrefs({ autosave: v })} />
        <CheckRow label={t('pref.smoothEdges')} checked={prefs.smooth} onChange={(v) => updatePrefs({ smooth: v })} />
        <CheckRow label={t('pref.restore')} checked={prefs.restore} onChange={(v) => updatePrefs({ restore: v })} />
        <CheckRow label={t('pref.rtl')} hint={t('pref.rtlSub')} checked={!!prefs.rtl} onChange={(v) => updatePrefs({ rtl: v ? true : null })} />
      </Section>
      <Section title={t('pref.about')}>
        <div className="stat-row">
          <span>{t('app.version')}</span>
          <b>{VERSION}</b>
        </div>
        <div className="stat-row">
          <span>{t('misc.desktopFeatures')}</span>
          <b>{platformLabel()}</b>
        </div>
        <div className="stat-row">
          <span>{t('start.langHint').split('·')[0]}</span>
          <b>{prefs.lang === 'fa' ? 'فارسی' : 'English'}</b>
        </div>
        <Button
          size="sm"
          style={{ marginTop: 8 }}
          onClick={() => {
            updatePrefs({ ...getState().prefs, theme: 'dark', accent: '#4c8dff', grid: false, rulers: true, snap: true, autosave: true });
          }}
        >
          {t('pref.resetPrefs')}
        </Button>
      </Section>
    </Dialog>
  );
}

function CheckRow({ label, hint, checked, onChange }) {
  return (
    <div className="check-row">
      <div className="grow">
        <b>{label}</b>
        {hint ? <span>{hint}</span> : null}
      </div>
      <Switch checked={checked} onChange={onChange} />
    </div>
  );
}

export function AboutDialog() {
  const t = useT();
  return (
    <Dialog title={`DesignShop ${VERSION}`} icon="info" size="sm" onClose={() => closeDialog('about')}
      footer={<Button variant="primary" onClick={() => closeDialog('about')}>{t('close')}</Button>}>
      <div className="row" style={{ gap: 12, marginBottom: 12 }}>
        <div className="brand-logo" style={{ width: 54, height: 54, borderRadius: 16, fontSize: 20 }}>DS</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>DesignShop</div>
          <div className="mute-2">{t('app.tagline')}</div>
        </div>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.65, margin: '0 0 12px' }}>{t('misc.aboutBody')}</p>
      <div className="stat-row">
        <span>{t('misc.desktopFeatures')}</span>
        <b>{platformLabel()}</b>
      </div>
      <div className="stat-row">
        <span>{t('start.langHint')}</span>
        <b>EN · FA</b>
      </div>
      <div className="stat-row">
        <span>Builds</span>
        <b>exe · portable · deb · rpm · AppImage</b>
      </div>
      <div className="stat-row">
        <span>Core</span>
        <b>Rust (Tauri) + Electron</b>
      </div>
      <div className="card mute-2" style={{ marginTop: 12, fontSize: 11, lineHeight: 1.6 }}>
        {t('misc.privacy')} {t('misc.credits')}
      </div>
    </Dialog>
  );
}

export function UpdatesDialog() {
  const t = useT();
  return (
    <Dialog title={t('menu.help.checkUpdates')} icon="download" size="sm" onClose={() => closeDialog('updates')}
      footer={<Button variant="primary" onClick={() => closeDialog('updates')}>{t('close')}</Button>}>
      <div className="row" style={{ gap: 8, marginBottom: 10 }}>
        <Icon name="check" size={16} />
        <b style={{ fontSize: 13 }}>{t('misc.upToDate')}</b>
      </div>
      <div className="mute-2" style={{ fontSize: 12, lineHeight: 1.6 }}>
        {t('misc.newVersionAsk')}
      </div>
      <div className="card" style={{ marginTop: 12, fontSize: 11.5, lineHeight: 1.7 }}>
        <div>• Windows — .exe installer + portable .exe</div>
        <div>• Debian / Ubuntu — .deb</div>
        <div>• Fedora / openSUSE — .rpm</div>
        <div>• Linux / Arch — .AppImage &amp; tar.gz</div>
        <div>• Every release includes the source code</div>
      </div>
      <div className="stat-row" style={{ marginTop: 10 }}>
        <span>{t('app.version')}</span>
        <b>{VERSION}</b>
      </div>
      <div className="stat-row">
        <span>Channel</span>
        <b>{PLATFORM === 'web' ? 'preview' : 'stable'}</b>
      </div>
    </Dialog>
  );
}

export function GuideDialog() {
  const t = useT();
  const items = [
    { icon: 'sparkles', title: t('studio.kits'), body: t('studio.kitsSub') },
    { icon: 'type', title: t('text.stylesTitle'), body: t('text.stylesSub') },
    { icon: 'layers', title: t('layers.title'), body: t('layers.dragHint') },
    { icon: 'sliders', title: t('adj.title'), body: t('adj.sub') },
    { icon: 'download', title: t('export.title'), body: t('export.sub') },
    { icon: 'globe', title: t('pref.language'), body: t('pref.languageSub') },
  ];
  return (
    <Dialog title={t('menu.help.docs')} sub={t('app.tagline')} icon="help" size="md" onClose={() => closeDialog('guide')}
      footer={
        <>
          <Button onClick={() => { closeDialog('guide'); window.dispatchEvent(new CustomEvent('ds:open', { detail: 'tour' })); }}>
            {t('start.tourBtn')}
          </Button>
          <Button variant="primary" onClick={() => closeDialog('guide')}>{t('close')}</Button>
        </>
      }>
      <div style={{ display: 'grid', gap: 10 }}>
        {items.map((it) => (
          <div key={it.title} className="card" style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 9,
                background: 'color-mix(in srgb, var(--accent) 16%, transparent)',
                color: 'var(--accent)',
                display: 'grid',
                placeItems: 'center',
                flex: 'none',
              }}
            >
              <Icon name={it.icon} size={16} />
            </div>
            <div>
              <b style={{ fontSize: 12.5 }}>{it.title}</b>
              <div className="mute-2" style={{ fontSize: 11.5, lineHeight: 1.55 }}>
                {it.body}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="card" style={{ marginTop: 12, fontSize: 11.5, color: 'var(--text-mute)', lineHeight: 1.65 }}>
        <b style={{ color: 'var(--text-dim)' }}>{t('tips')}</b>
        <div>
          {t('ws.statusHint', { key: 'Ctrl+/' })} · {t('misc.privacy')}
        </div>
      </div>
    </Dialog>
  );
}
