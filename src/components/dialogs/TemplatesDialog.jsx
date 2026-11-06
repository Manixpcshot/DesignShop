import React, { useEffect, useMemo, useState } from 'react';
import { useEditor, useT, closeDialog, newDocument, openDocument } from '../../lib/store.js';
import { TEMPLATES, TEMPLATE_CATEGORIES, kitById, getSize } from '../../lib/presets.js';
import { templateToDoc } from '../../lib/document.js';
import { makeThumbnail } from '../../lib/render.js';
import { Dialog, Button } from '../ui.jsx';
import { bgCss } from '../panels/StudioPanel.jsx';

const cache = new Map();

export default function TemplatesDialog() {
  const t = useT();
  const [category, setCategory] = useState('all');
  const [thumbs, setThumbs] = useState({});

  const list = useMemo(
    () => TEMPLATES.filter((x) => category === 'all' || x.category === category),
    [category]
  );

  useEffect(() => {
    let alive = true;
    const run = async () => {
      const next = {};
      for (const tpl of TEMPLATES) {
        if (cache.has(tpl.id)) {
          next[tpl.id] = cache.get(tpl.id);
          continue;
        }
        try {
          const doc = templateToDoc(tpl, TEMPLATES);
          const url = makeThumbnail(doc, 420);
          cache.set(tpl.id, url);
          next[tpl.id] = url;
        } catch (err) {
          console.error(err);
        }
        if (!alive) return;
      }
      if (alive) setThumbs(next);
    };
    run();
    return () => {
      alive = false;
    };
  }, []);

  const useTemplate = (tpl) => {
    const doc = templateToDoc(tpl, TEMPLATES);
    openDocument(doc);
    closeDialog('templates');
  };

  return (
    <Dialog title={t('tpl.title')} sub={t('tpl.sub')} icon="grid" size="lg" onClose={() => closeDialog('templates')}
      footer={
        <>
          <span className="mute-2 grow" style={{ textAlign: 'start' }}>
            {list.length} {t('tpl.title')}
          </span>
          <Button onClick={() => closeDialog('templates')}>{t('close')}</Button>
        </>
      }>
      <div className="row" style={{ gap: 5, marginBottom: 14, flexWrap: 'wrap' }}>
        {TEMPLATE_CATEGORIES.map((c) => (
          <button key={c.id} className={`chip ${category === c.id ? 'active' : ''}`} onClick={() => setCategory(c.id)}>
            {t(c.nameKey)}
          </button>
        ))}
      </div>
      <div className="template-gallery">
        {list.map((tpl) => {
          const size = getSize(tpl.size);
          const kit = kitById(tpl.kit);
          return (
            <button key={tpl.id} className="tpl-card" onClick={() => useTemplate(tpl)} title={t(tpl.nameKey)}>
              <div className="tpl-preview" style={{ background: bgCss(kit?.background) }}>
                {thumbs[tpl.id] ? <img src={thumbs[tpl.id]} alt={t(tpl.nameKey)} /> : null}
              </div>
              <div className="tpl-cap">
                <span className="ellipsis">{t(tpl.nameKey)}</span>
                <span className="mute-2" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {size.w}×{size.h}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </Dialog>
  );
}

export { newDocument };
