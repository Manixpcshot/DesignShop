// Font library panel — browse every bundled family, preview it live in the
// user's own words, import their own font files, and apply one tap later.
//
// Beginner-friendly rules baked in:
//   • every tile shows the family name in its own face, so "what does it look
//     like" needs no explanation
//   • a فارسی badge marks families that actually draw Persian letters
//   • importing is drag-and-drop, or a plain "Import font" button
//   • the sample text is editable once and remembered
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useEditor,
  useT,
  activeLayer,
  updateLayer,
  toast,
  updatePrefs,
} from '../../lib/store.js';
import {
  FONT_GROUPS,
  allFonts,
  filterFonts,
  fontById,
  importFontFiles,
  listImportedFonts,
  onFontsChanged,
  removeImportedFont,
  hydrateImportedFonts,
  importedStorageBytes,
  FONT_LIMITS,
} from '../../lib/fonts.js';
import { Section, IconButton, Button } from '../ui.jsx';
import Icon from '../Icon.jsx';

// Kept out of the i18n dictionaries on purpose: these are preview specimens,
// not interface copy, and the English dictionary must stay Latin-only.
const PERSIAN_SAMPLE = 'طراحی حرفه‌ای';

const formatBytes = (n) => {
  if (!n) return '0 KB';
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
};

export default function FontLibraryPanel({ embedded = false, onPick } = {}) {
  const t = useT();
  const layer = useEditor((s) => activeLayer(s));
  const prefs = useEditor((s) => s.prefs);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('all');
  const [persianOnly, setPersianOnly] = useState(false);
  const [sample, setSample] = useState(prefs.fontSample || '');
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);
  const isText = layer?.type === 'text';

  // imported fonts hydrate once per document; re-render when they land
  useEffect(() => {
    let alive = true;
    hydrateImportedFonts().then(() => alive && setTick((x) => x + 1));
    const off = onFontsChanged(() => setTick((x) => x + 1));
    return () => {
      alive = false;
      off();
    };
  }, []);

  const importedCount = listImportedFonts().length;
  const fonts = useMemo(
    () => filterFonts(allFonts(), { query, group, persianOnly }),
    // `tick` keeps this fresh after an import or removal
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query, group, persianOnly, tick]
  );

  // A Persian-capable family must be previewed in Persian — a Latin preview
  // would hide exactly the shaping problems the user cares about.
  const effectiveSample = (font) => {
    if (sample.trim()) return sample.trim();
    if (font.fa) return font.sample || PERSIAN_SAMPLE;
    return font.sample || t('font.sampleText');
  };

  const applyFont = useCallback(
    (font) => {
      if (onPick) {
        onPick(font);
        return;
      }
      if (!isText) {
        toast('font.needTextLayer', 'info');
        return;
      }
      updateLayer(
        layer.id,
        {
          fontId: font.id,
          weight: font.weights?.[font.weights.length - 1] || 700,
        },
        { label: 'Font', relayoutText: true }
      );
      // remember the last handful for the "recent" row
      const recent = [font.id, ...(prefs.recentFonts || []).filter((id) => id !== font.id)].slice(0, 6);
      updatePrefs({ recentFonts: recent, fontId: font.id });
      toast('font.applied');
    },
    [onPick, isText, layer, prefs.recentFonts]
  );

  const runImport = useCallback(
    async (files) => {
      if (!files?.length) return;
      setBusy(true);
      const { ok, failed } = await importFontFiles(files);
      setBusy(false);
      setTick((x) => x + 1);
      if (ok === 1) {
        toast('font.importedOne', 'success', { name: listImportedFonts()[0]?.label || '' });
      } else if (ok > 1) {
        toast('font.importedMany', 'success', { n: String(ok) });
      }
      if (failed.length) {
        const first = failed[0].error || 'font.err.register';
        toast(first, 'error', {
          n: String(failed.length),
          size: formatBytes(FONT_LIMITS.maxBytes),
        });
      }
    },
    []
  );

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer?.files || []).filter((f) => /\.(ttf|otf|woff2?|ttc)$/i.test(f.name));
    if (!files.length) {
      toast('font.err.format', 'error');
      return;
    }
    runImport(files);
  };

  const removeFont = (font) => {
    const ok = globalThis.confirm?.(t('font.removeConfirm', { name: font.label })) ?? true;
    if (!ok) return;
    removeImportedFont(font.id);
    setTick((x) => x + 1);
    toast('font.removed');
  };

  const commitSample = (value) => {
    setSample(value);
    updatePrefs({ fontSample: value });
  };

  const recent = (prefs.recentFonts || [])
    .map((id) => allFonts().find((f) => f.id === id))
    .filter(Boolean);

  const body = (
    <div className={`font-library ${embedded ? 'embedded' : ''}`}>
      <div className="font-toolbar">
        <div className="font-search">
          <Icon name="search" size={13} />
          <input
            type="search"
            value={query}
            placeholder={t('font.search')}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t('font.search')}
          />
          {query ? (
            <button className="font-search-clear" onClick={() => setQuery('')} title={t('reset')}>
              <Icon name="close" size={12} />
            </button>
          ) : null}
        </div>
        <Button
          variant="primary"
          icon="upload"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          title={t('font.import')}
        >
          {busy ? t('font.importing') : t('font.import')}
        </Button>
        <input
          ref={fileRef}
          id="font-file-input"
          type="file"
          accept=".ttf,.otf,.woff,.woff2,.ttc"
          multiple
          hidden
          onChange={(e) => {
            runImport(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      <div className="font-chips" role="tablist" aria-label={t('font.libraryTitle')}>
        <button
          className={`font-chip ${group === 'all' ? 'active' : ''}`}
          onClick={() => setGroup('all')}
          role="tab"
          aria-selected={group === 'all'}
        >
          {t('font.group.all')}
        </button>
        {FONT_GROUPS.map((g) => (
          <button
            key={g.id}
            className={`font-chip ${group === g.id ? 'active' : ''}`}
            onClick={() => setGroup(g.id)}
            role="tab"
            aria-selected={group === g.id}
          >
            {t(g.nameKey)}
            {g.id === 'imported' && importedCount ? <em>{importedCount}</em> : null}
          </button>
        ))}
        <button
          className={`font-chip fa-chip ${persianOnly ? 'active' : ''}`}
          onClick={() => setPersianOnly((v) => !v)}
          title={t('font.faSupported')}
        >
          {t('font.filterPersian')}
        </button>
      </div>

      <label className="font-sample-input">
        <span>{t('font.preview')}</span>
        <input
          type="text"
          id="font-sample-input"
          value={sample}
          placeholder={`${t('font.sampleText')} · ${PERSIAN_SAMPLE}`}
          onChange={(e) => commitSample(e.target.value)}
          dir="auto"
        />
      </label>

      {recent.length ? (
        <div className="font-recent">
          <span className="font-recent-label">{t('font.recent')}</span>
          {recent.map((f) => (
            <button key={f.id} className="font-mini" style={{ fontFamily: `"${f.family}"` }} onClick={() => applyFont(f)}>
              {f.label}
            </button>
          ))}
        </div>
      ) : null}

      <div
        className={`font-drop ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <Icon name="upload" size={14} />
        <span>{t('font.importHint')}</span>
        <em>{t('font.maxSize', { size: formatBytes(FONT_LIMITS.maxBytes) })}</em>
      </div>

      {!fonts.length ? (
        <div className="empty-state">
          <Icon name="type" size={26} />
          <div>{t('font.browseHint')}</div>
          <Button icon="upload" onClick={() => fileRef.current?.click()}>
            {t('font.import')}
          </Button>
        </div>
      ) : (
        <div className="font-list" id="font-list">
          {fonts.map((f) => {
            const active = isText && layer.fontId === f.id;
            const imported = f.group === 'imported';
            return (
              <div key={f.id} className={`font-row ${active ? 'active' : ''} ${f.fa ? 'is-fa' : ''}`}>
                <button className="font-main" onClick={() => applyFont(f)} title={f.label}>
                  <span className="font-name" style={{ fontFamily: `"${f.family}"` }}>
                    {f.label}
                  </span>
                  <span className="font-preview" style={{ fontFamily: `"${f.family}"` }} dir={f.fa ? 'rtl' : 'ltr'}>
                    {effectiveSample(f)}
                  </span>
                  <span className="font-meta">
                    {f.fa ? <b className="fa-badge">{t('font.persianBadge')}</b> : null}
                    <span>{t(f.note) || (f.fa ? t('font.faSupported') : '')}</span>
                  </span>
                </button>
                <div className="font-actions">
                  {imported ? (
                    <IconButton icon="trash" title={t('font.remove')} onClick={() => removeFont(f)} />
                  ) : (
                    <span className="font-kind">{t('font.bundled')}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="font-footer">
        <span>
          {fonts.length === 1 ? t('font.singleFont', { n: '1' }) : t('font.manyFonts', { n: String(fonts.length) })}
        </span>
        {importedCount ? (
          <span className="mute-2">{t('font.storage', { size: formatBytes(importedStorageBytes()) })}</span>
        ) : null}
      </div>
    </div>
  );

  if (embedded) return body;

  return (
    <Section title={t('font.libraryTitle')} sub={t('font.librarySub')}>
      {body}
    </Section>
  );
}
