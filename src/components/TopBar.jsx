// Top bar: brand, full menu bar (File/Edit/Image/Layer/Filter/View/Help),
// document title, undo/redo, language switch and export actions.
import React, { useState } from 'react';
import {
  useEditor,
  useT,
  undo,
  redo,
  openDialog,
  closeDialog,
  getState,
  setDocName,
  setLang,
  setTheme,
  updatePrefs,
  setZoom,
  toggleGrid,
  toggleRulers,
  toggleSnap,
  flipDocument,
  rotateDocument,
  cropCanvasToRect,
  duplicateLayer,
  deleteLayer,
  selectAllLayers,
  deselect,
  flattenDoc,
  mergeDown,
  addNewLayer,
  newDocument,
  closeDocument,
  centerLayer,
  activeLayer,
  copySelection,
  pasteClipboard,
  toggleFullscreen,
  applyBackgroundPreset,
  toast,
  useEditor as useEd,
} from '../lib/store.js';
import { pickAndOpenFile, saveDesign, quickExport, trimTransparent } from '../lib/actions.js';
import { Menu, IconButton, Button } from './ui.jsx';
import Icon from './Icon.jsx';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? '⌘' : 'Ctrl';

export default function TopBar({ onHelp }) {
  const t = useT();
  const doc = useEditor((s) => s.doc);
  const saved = useEditor((s) => s.saved);
  const screen = useEditor((s) => s.screen);
  const past = useEditor((s) => s.past);
  const future = useEditor((s) => s.future);
  const lang = useEditor((s) => s.lang);
  const theme = useEditor((s) => s.theme);
  const grid = useEditor((s) => s.showGrid);
  const rulers = useEditor((s) => s.showRulers);
  const snap = useEditor((s) => s.snap);
  const recents = useEditor((s) => s.recents);
  const [openKey, setOpenKey] = useState(null);
  const [editingName, setEditingName] = useState(false);

  const withDoc = (fn) => () => {
    if (!getState().doc) {
      toast('misc.noSelection', 'info');
      return;
    }
    fn();
  };

  const fileMenu = [
    { label: t('menu.file.new'), kbd: `${mod}N`, icon: 'plus', onClick: () => openDialog('new') },
    { label: t('menu.file.open'), kbd: `${mod}O`, icon: 'folder', onClick: pickAndOpenFile },
    { label: t('menu.file.openProject'), icon: 'file', onClick: pickAndOpenFile },
    { sep: true },
    { label: t('menu.file.save'), kbd: `${mod}S`, icon: 'save', onClick: saveDesign, disabled: !doc },
    { label: t('menu.file.quickExport'), kbd: `${mod}⇧E`, icon: 'download', onClick: quickExport, disabled: !doc },
    { label: t('menu.file.export'), kbd: `${mod}⇧S`, icon: 'image', onClick: () => openDialog('export'), disabled: !doc },
    { label: t('menu.file.exportSocial'), icon: 'grid', onClick: () => openDialog('social'), disabled: !doc },
    { sep: true },
    { header: t('menu.file.recent') },
    ...(recents.length
      ? recents.slice(0, 5).map((r) => ({
          label: `${r.name} · ${r.w}×${r.h}`,
          icon: 'file',
          onClick: () => window.dispatchEvent(new CustomEvent('ds:open-recent', { detail: r.id })),
        }))
      : [{ label: t('menu.file.noRecent'), disabled: true }]),
    { sep: true },
    { label: t('menu.file.quit'), danger: true, icon: 'close', onClick: () => closeDocument() },
  ];

  const editMenu = [
    { label: t('menu.edit.undo'), kbd: `${mod}Z`, icon: 'undo', onClick: undo, disabled: !past.length },
    { label: t('menu.edit.redo'), kbd: `${mod}⇧Z`, icon: 'redo', onClick: redo, disabled: !future.length },
    { sep: true },
    { label: t('menu.edit.copy'), kbd: `${mod}C`, icon: 'copy', onClick: () => copySelection() },
    { label: t('menu.edit.paste'), kbd: `${mod}V`, icon: 'plus', onClick: pasteClipboard },
    { label: t('menu.edit.duplicate'), kbd: `${mod}J`, icon: 'copy', onClick: withDoc(() => duplicateLayer()) },
    { label: t('menu.edit.transform'), kbd: `${mod}T`, icon: 'cursor', onClick: () => window.dispatchEvent(new CustomEvent('ds:tool', { detail: 'move' })) },
    { sep: true },
    { label: t('menu.edit.preferences'), kbd: `${mod},`, icon: 'settings', onClick: () => openDialog('prefs') },
    { label: t('menu.edit.keyboard'), kbd: `${mod}/`, icon: 'keyboard', onClick: () => openDialog('shortcuts') },
  ];

  const imageMenu = [
    { label: t('menu.image.size'), icon: 'fit', onClick: () => openDialog('new'), disabled: !doc },
    { label: t('menu.image.cropToSelection'), icon: 'crop', onClick: () => window.dispatchEvent(new CustomEvent('ds:crop-selection')) },
    { label: t('menu.image.trim'), icon: 'cropRotate', onClick: trimTransparent },
    { sep: true },
    { label: t('menu.image.rotateCW'), icon: 'rotate', onClick: () => rotateDocument(90), disabled: !doc },
    { label: t('menu.image.rotateCCW'), icon: 'rotate', onClick: () => rotateDocument(-90), disabled: !doc },
    { label: t('menu.image.flipH'), icon: 'flipH', onClick: () => flipDocument('h'), disabled: !doc },
    { label: t('menu.image.flipV'), icon: 'flipV', onClick: () => flipDocument('v'), disabled: !doc },
    { sep: true },
    { label: t('menu.image.adjustments'), icon: 'sliders', onClick: () => window.dispatchEvent(new CustomEvent('ds:panel', { detail: 'adjust' })) },
    { label: t('menu.image.autoEnhance'), icon: 'wandSparkle', onClick: () => window.dispatchEvent(new CustomEvent('ds:auto-enhance')) },
    { sep: true },
    { label: t('new.bg.white'), onClick: () => applyBackgroundPreset('#ffffff') },
    { label: t('new.bg.black'), onClick: () => applyBackgroundPreset('#000000') },
    { label: t('new.bg.transparent'), onClick: () => applyBackgroundPreset('transparent') },
  ];

  const layerMenu = [
    { label: t('menu.layer.new'), kbd: `${mod}⇧N`, icon: 'plus', onClick: () => addNewLayer('shape') },
    { label: t('menu.layer.newText'), kbd: 'T', icon: 'type', onClick: () => addNewLayer('text') },
    { label: t('menu.layer.newShape'), icon: 'rect', onClick: () => addNewLayer('shape') },
    { label: t('layers.addSticker'), icon: 'smile', onClick: () => addNewLayer('emoji') },
    { sep: true },
    { label: t('menu.layer.duplicate'), icon: 'copy', onClick: withDoc(() => duplicateLayer()) },
    { label: t('menu.layer.delete'), icon: 'trash', onClick: withDoc(() => deleteLayer()) },
    { label: t('menu.layer.mergeDown'), kbd: `${mod}E`, icon: 'layers', onClick: withDoc(() => mergeDown()) },
    { label: t('menu.layer.flatten'), kbd: `${mod}⇧F`, icon: 'paint', onClick: withDoc(flattenDoc) },
    { sep: true },
    { label: t('layers.centerH'), icon: 'centerH', onClick: withDoc(() => centerLayer(activeLayer()?.id)) },
    { label: t('layers.centerV'), icon: 'centerV', onClick: withDoc(() => centerLayer(activeLayer()?.id)) },
  ];

  const filterMenu = [
    { label: t('menu.filter.adjust'), icon: 'sliders', onClick: () => window.dispatchEvent(new CustomEvent('ds:panel', { detail: 'adjust' })) },
    { label: t('menu.filter.effects'), icon: 'sparkles', onClick: () => window.dispatchEvent(new CustomEvent('ds:panel', { detail: 'adjust' })) },
    { sep: true },
    { label: t('menu.filter.grayscale'), onClick: () => window.dispatchEvent(new CustomEvent('ds:filter', { detail: { grayscale: 100 } })) },
    { label: t('menu.filter.invert'), onClick: () => window.dispatchEvent(new CustomEvent('ds:filter', { detail: { invert: 100 } })) },
    { label: t('menu.filter.sepia'), onClick: () => window.dispatchEvent(new CustomEvent('ds:filter', { detail: { sepia: 80 } })) },
    { label: t('menu.filter.blur'), onClick: () => window.dispatchEvent(new CustomEvent('ds:filter', { detail: { blur: 6 } })) },
    { label: t('menu.filter.sharpen'), onClick: () => window.dispatchEvent(new CustomEvent('ds:filter', { detail: { sharpen: 40 } })) },
    { label: t('menu.filter.pixelate'), onClick: () => window.dispatchEvent(new CustomEvent('ds:filter', { detail: { pixelate: 8 } })) },
    { label: t('menu.filter.noise'), onClick: () => window.dispatchEvent(new CustomEvent('ds:filter', { detail: { noise: 30 } })) },
    { label: t('menu.filter.vignette'), onClick: () => window.dispatchEvent(new CustomEvent('ds:filter', { detail: { vignette: 45 } })) },
    { label: t('menu.filter.duotone'), onClick: () => window.dispatchEvent(new CustomEvent('ds:filter', { detail: { duotone: 100, duotoneA: '#1f1b4d', duotoneB: '#ff7a59' } })) },
  ];

  const viewMenu = [
    { label: t('menu.view.zoomIn'), kbd: `${mod}+`, icon: 'zoomIn', onClick: () => setZoom(getState().zoom * 1.25, { fit: false }) },
    { label: t('menu.view.zoomOut'), kbd: `${mod}-`, icon: 'zoomOut', onClick: () => setZoom(getState().zoom / 1.25, { fit: false }) },
    { label: t('menu.view.fit'), kbd: `${mod}0`, icon: 'fit', onClick: () => setZoom(1, { fit: true }) },
    { label: t('menu.view.actual'), kbd: `${mod}1`, onClick: () => setZoom(1, { fit: false }) },
    { sep: true },
    { label: t('menu.view.rulers'), icon: 'ruler', checked: rulers, onClick: toggleRulers },
    { label: t('menu.view.grid'), icon: 'grid', checked: grid, onClick: toggleGrid },
    { label: t('menu.view.snapping'), icon: 'magnet', checked: snap, onClick: toggleSnap },
    { label: t('menu.view.fullscreen'), kbd: 'F11', icon: 'fit', onClick: toggleFullscreen },
    { sep: true },
    { header: t('menu.view.theme') },
    { label: t('menu.view.themeDark'), icon: 'moon', checked: theme === 'dark', onClick: () => setTheme('dark') },
    { label: t('menu.view.themeLight'), icon: 'sun', checked: theme === 'light', onClick: () => setTheme('light') },
    { label: t('menu.view.themeMidnight'), icon: 'moon', checked: theme === 'midnight', onClick: () => setTheme('midnight') },
    { sep: true },
    { header: t('menu.view.language') },
    { label: 'English', checked: lang === 'en', onClick: () => setLang('en') },
    { label: 'فارسی', checked: lang === 'fa', onClick: () => setLang('fa') },
    { label: t('menu.view.rightToLeft'), checked: !!getState().prefs.rtl, onClick: () => updatePrefs({ rtl: !getState().prefs.rtl }) },
  ];

  const helpMenu = [
    { label: t('menu.help.shortcuts'), kbd: `${mod}/`, icon: 'keyboard', onClick: () => openDialog('shortcuts') },
    { label: t('menu.help.docs'), icon: 'help', onClick: () => openDialog('guide') },
    { label: t('menu.help.tour'), icon: 'lightbulb', onClick: () => openDialog('tour') },
    { sep: true },
    { label: t('menu.window.resetLayout'), icon: 'layers', onClick: () => setPanelStore('studio') },
    { label: t('menu.help.checkUpdates'), icon: 'download', onClick: () => openDialog('updates') },
    { sep: true },
    { label: t('menu.help.about'), icon: 'info', onClick: () => openDialog('about') },
  ];

  const menus = [
    { key: 'file', label: t('menu.file'), items: fileMenu },
    { key: 'edit', label: t('menu.edit'), items: editMenu },
    { key: 'image', label: t('menu.image'), items: imageMenu },
    { key: 'layer', label: t('menu.layer'), items: layerMenu },
    { key: 'filter', label: t('menu.filter'), items: filterMenu },
    { key: 'view', label: t('menu.view'), items: viewMenu },
    { key: 'help', label: t('menu.help'), items: helpMenu },
  ];

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-logo">DS</div>
        <div className="col" style={{ lineHeight: 1.1 }}>
          <span className="brand-name">DesignShop</span>
          <span className="brand-sub">{screen === 'editor' ? t('ws.canvas') : t('app.tagline').slice(0, 34)}</span>
        </div>
      </div>

      <div className="menubar">
        {menus.map((m) => (
          <Menu key={m.key} label={m.label} items={m.items} openKey={openKey} setOpenKey={setOpenKey} />
        ))}
      </div>

      <div className="vsep" />

      {doc ? (
        <div className="doc-title" title={t('new.name')}>
          {!saved ? <span className="dot-unsaved" /> : null}
          {editingName ? (
            <input
              autoFocus
              value={doc.name || ''}
              onChange={(e) => setDocName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
            />
          ) : (
            <span className="ellipsis" style={{ fontWeight: 600, flex: 1 }} onDoubleClick={() => setEditingName(true)}>
              {doc.name || t('ws.untitled')}
            </span>
          )}
          <span className="mute-2" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {doc.w}×{doc.h}
          </span>
        </div>
      ) : (
        <span className="mute-2">{t('start.welcome')}</span>
      )}

      <div className="grow" />

      <div className="row" style={{ gap: 2 }}>
        <IconButton icon="undo" title={t('menu.edit.undo')} onClick={undo} disabled={!past.length} />
        <IconButton icon="redo" title={t('menu.edit.redo')} onClick={redo} disabled={!future.length} />
        <div className="vsep" />
        <IconButton
          icon="globe"
          title={t('menu.view.language')}
          onClick={() => setLang(lang === 'en' ? 'fa' : 'en')}
        />
        <IconButton icon={theme === 'light' ? 'sun' : 'moon'} title={t('menu.view.theme')} onClick={() => setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'midnight' : 'light')} />
        <IconButton icon="help" title={t('menu.help.docs')} onClick={() => openDialog('guide')} />
      </div>

      {doc ? (
        <div className="row" style={{ gap: 6 }}>
          <Button size="sm" icon="save" onClick={saveDesign}>
            {t('save')}
          </Button>
          <Button variant="primary" size="sm" icon="download" onClick={quickExport}>
            {t('ws.export')}
          </Button>
        </div>
      ) : (
        <Button variant="primary" size="sm" icon="plus" onClick={() => openDialog('new')}>
          {t('new.title')}
        </Button>
      )}
      <button className="icon-btn" title={t('close')} onClick={() => closeDialog('wizard')} style={{ display: 'none' }} aria-hidden="true">
        <Icon name="close" size={14} />
      </button>
      {onHelp ? null : null}
    </header>
  );
}

function setPanelStore(panel) {
  window.dispatchEvent(new CustomEvent('ds:panel', { detail: panel }));
}

export function useDocMenuClose() {
  return useState(null);
}
