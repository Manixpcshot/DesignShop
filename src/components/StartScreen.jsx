// Welcome screen: pick a size, resume a design, or start from a template.
import React, { useEffect, useState } from 'react';
import {
  useEditor,
  useT,
  newDocument,
  openDialog,
  openDocument,
  setLang,
  setTheme,
  deleteRecent,
  getState,
  toast,
} from '../lib/store.js';
import { SIZE_PRESETS, TEMPLATES, kitById, getSize, TEMPLATE_CATEGORIES } from '../lib/presets.js';
import { templateToDoc } from '../lib/document.js';
import { makeThumbnail } from '../lib/render.js';
import { pickAndOpenFile, PLATFORM } from '../lib/actions.js';
import { Button, IconButton } from './ui.jsx';
import Icon from './Icon.jsx';
import { bgCss } from './panels/StudioPanel.jsx';

const QUICK = ['youtube', 'instagramPost', 'instagramStory', 'youtubeShort', 'xPost', 'facebookCover'];

export default function StartScreen() {
  const t = useT();
  const recents = useEditor((s) => s.recents);
  const lang = useEditor((s) => s.lang);
  const theme = useEditor((s) => s.theme);
  const [thumbs, setThumbs] = useState({});
  const [cat, setCat] = useState('all');

  useEffect(() => {
    let alive = true;
    const run = () => {
      const next = {};
      for (const tpl of TEMPLATES) {
        try {
          next[tpl.id] = makeThumbnail(templateToDoc(tpl, TEMPLATES), 360);
        } catch (err) {
          console.error(err);
        }
      }
      if (alive) setThumbs(next);
    };
    const id = setTimeout(run, 120);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, []);

  const start = (id) => {
    const p = SIZE_PRESETS.find((s) => s.id === id);
    newDocument({ w: p.w, h: p.h, name: t(`size.${p.id}`), background: '#0b1020' });
  };

  const useTemplate = (tpl) => openDocument(templateToDoc(tpl, TEMPLATES));

  const tplList = TEMPLATES.filter((x) => cat === 'all' || x.category === cat).slice(0, 8);

  return (
    <div className="start">
      <div className="start-inner">
        <div className="start-head">
          <div className="hero">
            <h1>{t('start.welcome')}</h1>
            <p>{t('start.sub')}</p>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <Button icon="folder" onClick={pickAndOpenFile}>
              {t('start.openFile')}
            </Button>
            <Button variant="primary" icon="plus" onClick={() => openDialog('new')}>
              {t('new.title')}
            </Button>
            <IconButton icon="globe" title={t('pref.language')} onClick={() => setLang(lang === 'en' ? 'fa' : 'en')} />
            <IconButton icon={theme === 'light' ? 'sun' : 'moon'} title={t('menu.view.theme')} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} />
            <IconButton icon="settings" title={t('pref.title')} onClick={() => openDialog('prefs')} />
          </div>
        </div>

        <div className="start-grid">
          <div className="col" style={{ gap: 18 }}>
            <section className="start-card">
              <h3>{t('start.newTitle')}</h3>
              <div className="sub">{t('start.quickSizes')}</div>
              <div className="size-cards">
                {QUICK.map((id) => {
                  const p = SIZE_PRESETS.find((s) => s.id === id);
                  const ratio = p.w / p.h;
                  return (
                    <button key={id} className="size-card" onClick={() => start(id)}>
                      <div
                        className="sc-ratio"
                        style={{ width: ratio >= 1 ? 46 : 46 * ratio, aspectRatio: `${p.w}/${p.h}`, height: 'auto', minHeight: 16 }}
                      />
                      <b>{t(`size.${id}`)}</b>
                      <span>
                        {p.w} × {p.h}
                      </span>
                    </button>
                  );
                })}
                <button className="size-card" onClick={() => openDialog('new')}>
                  <div className="sc-ratio" style={{ width: 46, height: 30, display: 'grid', placeItems: 'center' }}>
                    <Icon name="plus" size={14} />
                  </div>
                  <b>{t('studio.freeform')}</b>
                  <span>{t('new.sub')}</span>
                </button>
              </div>
              <div className="row" style={{ marginTop: 14, gap: 8, flexWrap: 'wrap' }}>
                <Button size="sm" icon="lightbulb" onClick={() => openDialog('tour')}>
                  {t('start.tourBtn')}
                </Button>
                <Button size="sm" icon="sparkles" onClick={() => { start('youtube'); }}>
                  {t('tpl.youtubeBold')}
                </Button>
                <span className="mute-2" style={{ fontSize: 11 }}>
                  {t('start.dragDrop')}
                </span>
              </div>
            </section>

            <section className="start-card">
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <h3>{t('start.templatesTitle')}</h3>
                  <div className="sub" style={{ margin: 0 }}>
                    {t('tpl.sub')}
                  </div>
                </div>
                <Button size="sm" onClick={() => openDialog('templates')}>
                  {t('more')}
                </Button>
              </div>
              <div className="row" style={{ gap: 5, marginBottom: 12, flexWrap: 'wrap' }}>
                {TEMPLATE_CATEGORIES.map((c) => (
                  <button key={c.id} className={`chip ${cat === c.id ? 'active' : ''}`} onClick={() => setCat(c.id)}>
                    {t(c.nameKey)}
                  </button>
                ))}
              </div>
              <div className="tpl-strip">
                {tplList.map((tpl) => (
                  <button key={tpl.id} className="tpl-card" onClick={() => useTemplate(tpl)}>
                    <div style={{ background: bgCss(kitById(tpl.kit)?.background), aspectRatio: '16/9' }}>
                      {thumbs[tpl.id] ? <img src={thumbs[tpl.id]} alt={t(tpl.nameKey)} /> : null}
                    </div>
                    <div className="tpl-cap">
                      <span className="ellipsis">{t(tpl.nameKey)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <div className="col" style={{ gap: 18 }}>
            <section className="start-card">
              <h3>{t('start.recentTitle')}</h3>
              <div className="sub">{recents.length ? `${recents.length}` : t('start.noRecent')}</div>
              <div className="recent-list">
                {recents.slice(0, 6).map((r) => (
                  <div key={r.id} className="recent-item" style={{ cursor: 'pointer' }} onClick={() => openDocument(r.doc)}>
                    <RecentThumb entry={r} />
                    <div className="recent-meta">
                      <b>{r.name || t('ws.untitled')}</b>
                      <span>
                        {r.w}×{r.h} · {new Date(r.at).toLocaleDateString()}
                      </span>
                    </div>
                    <IconButton
                      icon="trash"
                      size={13}
                      title={t('delete')}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRecent(r.id);
                        toast('history.clear');
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="sep" />
              <Button size="sm" icon="file" style={{ width: '100%' }} onClick={pickAndOpenFile}>
                {t('start.openProject')}
              </Button>
            </section>

            <section className="start-card">
              <h3>{t('wiz.helpTitle')}</h3>
              <div className="sub">{t('wiz.sub')}</div>
              <div className="col" style={{ gap: 7 }}>
                {[t('wiz.help1'), t('wiz.help2'), t('wiz.help3'), t('wiz.help5')].map((line) => (
                  <div key={line} className="row" style={{ gap: 7, fontSize: 11.5, color: 'var(--text-dim)' }}>
                    <Icon name="check" size={13} />
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="start-card">
              <h3>{t('menu.help.shortcuts')}</h3>
              <div className="col" style={{ gap: 2 }}>
                {[
                  ['Ctrl/⌘ N', t('new.title')],
                  ['Ctrl/⌘ O', t('start.openFile')],
                  ['Ctrl/⌘ S', t('save')],
                  ['Ctrl/⌘ K', t('wiz.title')],
                ].map(([k, label]) => (
                  <div key={k} className="stat-row">
                    <span>{label}</span>
                    <span className="kbd">{k}</span>
                  </div>
                ))}
              </div>
              <Button size="sm" icon="keyboard" style={{ width: '100%', marginTop: 8 }} onClick={() => openDialog('shortcuts')}>
                {t('sc.title')}
              </Button>
            </section>
          </div>
        </div>

        <div className="row" style={{ marginTop: 26, justifyContent: 'center', gap: 12, color: 'var(--text-mute)', fontSize: 11 }}>
          <span>DesignShop</span>
          <span>·</span>
          <span>{t('start.langHint')}</span>
          <span>·</span>
          <span>{PLATFORM === 'web' ? 'Web preview' : PLATFORM === 'tauri' ? 'Rust / Tauri' : 'Electron'}</span>
          <span>·</span>
          <span>{t('misc.offline')}</span>
        </div>
      </div>
    </div>
  );
}

function RecentThumb({ entry }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let alive = true;
    try {
      const url = makeThumbnail(entry.doc, 160);
      if (alive) setSrc(url);
    } catch {
      /* ignore */
    }
    return () => {
      alive = false;
    };
  }, [entry]);
  if (src) return <img className="recent-thumb" src={src} alt="" />;
  return (
    <div className="recent-thumb" style={{ display: 'grid', placeItems: 'center' }}>
      <Icon name="image" size={16} />
    </div>
  );
}

export { getState, getSize };
