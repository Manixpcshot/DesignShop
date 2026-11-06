// Root application: layout, global keyboard shortcuts, drag & drop, toasts.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  useEditor,
  useT,
  getState,
  undo,
  redo,
  setTool,
  setZoom,
  deleteLayer,
  duplicateLayer,
  addNewLayer,
  toast,
  dismissToast,
  openDialog,
  closeDialog,
  patch,
  setPanel,
  handleDroppedFile,
  selectAllLayers,
  deselect,
  copySelection,
  pasteClipboard,
  updateLayer,
  newDocument,
  openDocument,
  cropCanvasToRect,
  setLang,
  setTheme,
  toggleGrid,
  flipDocument,
  rotateDocument,
  flattenDoc,
  mergeDown,
  activeLayer,
  setToolOption,
} from './lib/store.js';
import { clearRenderCache } from './lib/render.js';
import { quickExport, saveDesign, pickAndOpenFile } from './lib/actions.js';
import TopBar from './components/TopBar.jsx';
import Toolbar from './components/Toolbar.jsx';
import OptionsBar from './components/OptionsBar.jsx';
import CanvasStage from './components/CanvasStage.jsx';
import PanelHost from './components/PanelHost.jsx';
import StartScreen from './components/StartScreen.jsx';
import Wizard from './components/Wizard.jsx';
import Tour from './components/Tour.jsx';
import NewDesignDialog from './components/dialogs/NewDesignDialog.jsx';
import ExportDialog from './components/dialogs/ExportDialog.jsx';
import SocialExportDialog from './components/dialogs/SocialExportDialog.jsx';
import TemplatesDialog from './components/dialogs/TemplatesDialog.jsx';
import {
  ShortcutsDialog,
  PreferencesDialog,
  AboutDialog,
  UpdatesDialog,
  GuideDialog,
} from './components/dialogs/MiscDialogs.jsx';
import Icon from './components/Icon.jsx';
import { PLATFORM, isDesktop, revealInFolder } from './lib/platform.js';

const TOOL_KEYS = {
  v: 'move',
  m: 'marquee',
  l: 'lasso',
  w: 'wand',
  c: 'crop',
  i: 'eyedropper',
  b: 'brush',
  e: 'eraser',
  g: 'fill',
  t: 'text',
  u: 'rect',
  y: 'sticker',
  h: 'hand',
  z: 'zoom',
  j: 'highlight',
};

export default function App() {
  const t = useT();
  const lang = useEditor((s) => s.lang);
  const theme = useEditor((s) => s.theme);
  const accent = useEditor((s) => s.accent);
  const screen = useEditor((s) => s.screen);
  const doc = useEditor((s) => s.doc);
  const toasts = useEditor((s) => s.toasts);
  const dialogs = useEditor((s) => s.dialogs);
  const rtl = useEditor((s) => (s.prefs.rtl == null ? s.lang === 'fa' : !!s.prefs.rtl));
  const [dragging, setDragging] = useState(false);
  const keyRef = useRef({});

  // ---------------------------------------------------------------- theming
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.setProperty('--accent', accent);
    document.documentElement.lang = lang;
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
  }, [theme, accent, lang, rtl]);

  // ------------------------------------------------- restore last design
  useEffect(() => {
    const st = getState();
    if (st.prefs.restore && st.recents.length && !st.doc) {
      // start screen by default; last design is one click away
    }
    if (st.prefs.seenTour === false) openDialog('tour');
  }, []);

  // ------------------------------------------------------- custom events
  useEffect(() => {
    const onOpen = (e) => openDialog(e.detail);
    const onPanel = (e) => setPanel(e.detail);
    const onTool = (e) => setTool(e.detail);
    const onFilter = (e) => {
      const layer = activeLayer();
      if (!layer) return toast('opt.selectLayer', 'info');
      updateLayer(layer.id, { adj: { ...(layer.adj || {}), ...e.detail } }, { label: 'Filter' });
      setPanel('adjust');
    };
    const onAuto = () => {
      const layer = activeLayer();
      if (!layer) return;
      updateLayer(
        layer.id,
        { adj: { ...(layer.adj || {}), contrast: 14, saturation: 12, vibrance: 10, shadows: 12, highlights: -6, sharpen: 14 } },
        { label: 'Auto enhance' }
      );
      toast('adj.autoEnhance');
    };
    const onReveal = (e) => revealInFolder(e.detail);
    const onDeselect = () => patch({ selectionRect: null });
    const onApplyCrop = () => {
      const st = getState();
      if (!st.cropRect) return;
      cropCanvasToRect(st.cropRect);
      patch({ cropRect: null });
      setTool('move');
    };
    const onCancelCrop = () => {
      patch({ cropRect: null });
      setTool('move');
    };
    const onCropSelection = () => {
      const st = getState();
      if (st.selectionRect?.kind === 'rect') {
        cropCanvasToRect(st.selectionRect);
        patch({ selectionRect: null, cropRect: null });
      } else {
        setTool('crop');
      }
    };
    const onOpenRecent = (e) => {
      const entry = getState().recents.find((r) => r.id === e.detail);
      if (entry) openDocument(entry.doc);
    };
    const onStartDemo = () => {
      if (!getState().doc) newDocument({ w: 1280, h: 720, name: t('size.youtube'), background: '#0b1020' });
    };
    const onDragOver = (e) => {
      e.preventDefault();
      if (e.dataTransfer?.types?.includes('Files')) setDragging(true);
    };
    const onDragLeave = (e) => {
      if (e.relatedTarget === null) setDragging(false);
    };
    const onDrop = async (e) => {
      e.preventDefault();
      setDragging(false);
      const files = [...(e.dataTransfer?.files || [])];
      if (!files.length) return;
      for (const f of files) await handleDroppedFile(f);
    };

    window.addEventListener('ds:open', onOpen);
    window.addEventListener('ds:panel', onPanel);
    window.addEventListener('ds:tool', onTool);
    window.addEventListener('ds:filter', onFilter);
    window.addEventListener('ds:auto-enhance', onAuto);
    window.addEventListener('ds:reveal', onReveal);
    window.addEventListener('ds:deselect', onDeselect);
    window.addEventListener('ds:apply-crop', onApplyCrop);
    window.addEventListener('ds:cancel-crop', onCancelCrop);
    window.addEventListener('ds:crop-selection', onCropSelection);
    window.addEventListener('ds:open-recent', onOpenRecent);
    window.addEventListener('ds:start-demo', onStartDemo);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('ds:open', onOpen);
      window.removeEventListener('ds:panel', onPanel);
      window.removeEventListener('ds:tool', onTool);
      window.removeEventListener('ds:filter', onFilter);
      window.removeEventListener('ds:auto-enhance', onAuto);
      window.removeEventListener('ds:reveal', onReveal);
      window.removeEventListener('ds:deselect', onDeselect);
      window.removeEventListener('ds:apply-crop', onApplyCrop);
      window.removeEventListener('ds:cancel-crop', onCancelCrop);
      window.removeEventListener('ds:crop-selection', onCropSelection);
      window.removeEventListener('ds:open-recent', onOpenRecent);
      window.removeEventListener('ds:start-demo', onStartDemo);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [t]);

  // ------------------------------------------------- menu bridge (electron)
  useEffect(() => {
    if (!window.designshop?.onMenu) return;
    window.designshop.onMenu((action, payload) => {
      const map = {
        'new-design': () => openDialog('new'),
        'open-file': pickAndOpenFile,
        save: saveDesign,
        'quick-export': quickExport,
        export: () => openDialog('export'),
        'export-social': () => openDialog('social'),
        undo,
        redo,
        cut: () => copySelection({ cut: true }),
        copy: () => copySelection(),
        paste: pasteClipboard,
        duplicate: duplicateLayer,
        preferences: () => openDialog('prefs'),
        shortcuts: () => openDialog('shortcuts'),
        'new-layer': () => addNewLayer('shape'),
        'new-text': () => addNewLayer('text'),
        'delete-layer': () => deleteLayer(),
        'merge-down': mergeDown,
        flatten: flattenDoc,
        'zoom-in': () => setZoom(getState().zoom * 1.25, { fit: false }),
        'zoom-out': () => setZoom(getState().zoom / 1.25, { fit: false }),
        fit: () => setZoom(1, { fit: true }),
        language: () => setLang(getState().lang === 'en' ? 'fa' : 'en'),
        theme: (v) => setTheme(v),
        tour: () => openDialog('tour'),
        about: () => openDialog('about'),
      };
      map[action]?.(payload);
    });
  }, []);

  // keep the native menu labels in sync with the language
  useEffect(() => {
    if (!window.designshop?.setMenuLanguage) return;
    const keys = [
      'menu.file', 'menu.edit', 'menu.layer', 'menu.view', 'menu.help',
      'menu.file.new', 'menu.file.open', 'menu.file.save', 'menu.file.quickExport',
      'menu.file.export', 'menu.file.exportSocial', 'menu.file.quit',
      'menu.edit.undo', 'menu.edit.redo', 'menu.edit.cut', 'menu.edit.copy', 'menu.edit.paste',
      'menu.edit.duplicate', 'menu.edit.preferences', 'menu.edit.keyboard',
      'menu.layer.new', 'menu.layer.newText', 'menu.layer.duplicate', 'menu.layer.delete',
      'menu.layer.mergeDown', 'menu.layer.flatten',
      'menu.view.zoomIn', 'menu.view.zoomOut', 'menu.view.fit', 'menu.view.fullscreen',
      'menu.view.language', 'menu.view.theme', 'menu.view.themeDark', 'menu.view.themeLight', 'menu.view.themeMidnight',
      'menu.help.shortcuts', 'menu.help.tour', 'menu.help.docs', 'menu.help.about',
    ];
    const labels = {};
    for (const k of keys) labels[k] = t(k);
    window.designshop.setMenuLanguage(labels);
  }, [lang, t]);

  // ------------------------------------------------------- keyboard
  const onKeyDown = useCallback(
    (e) => {
      const tag = document.activeElement?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable;
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openDialog('wizard');
        return;
      }
      if (mod && e.key === '/') {
        e.preventDefault();
        openDialog('shortcuts');
        return;
      }
      if (mod && e.key === ',') {
        e.preventDefault();
        openDialog('prefs');
        return;
      }
      if (mod && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openDialog('new');
        return;
      }
      if (mod && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        pickAndOpenFile();
        return;
      }
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (e.shiftKey) openDialog('export');
        else saveDesign();
        return;
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        quickExport();
        return;
      }
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        copySelection();
        return;
      }
      if (mod && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        if (!pasteClipboard()) toast('toast.nothingToDo', 'info');
        return;
      }
      if (mod && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        duplicateLayer();
        return;
      }
      if (mod && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        mergeDown();
        return;
      }
      if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        selectAllLayers();
        return;
      }
      if (mod && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        setZoom((getState().fitMode ? 1 : getState().zoom) * 1.25, { fit: false });
        return;
      }
      if (mod && e.key === '-') {
        e.preventDefault();
        setZoom((getState().fitMode ? 1 : getState().zoom) / 1.25, { fit: false });
        return;
      }
      if (mod && e.key === '0') {
        e.preventDefault();
        setZoom(1, { fit: true });
        return;
      }
      if (mod && e.key === '1') {
        e.preventDefault();
        setZoom(1, { fit: false });
        return;
      }

      if (typing) {
        if (e.key === 'Escape') document.activeElement.blur();
        return;
      }

      if (e.key === 'Escape') {
        if (getState().cropRect) {
          patch({ cropRect: null });
          setTool('move');
        } else if (getState().selectionRect) {
          patch({ selectionRect: null });
        } else if (Object.values(getState().dialogs).some(Boolean)) {
          for (const [k, v] of Object.entries(getState().dialogs)) if (v) closeDialog(k);
        } else {
          deselect();
        }
        return;
      }
      if (e.key === 'Enter') {
        const st = getState();
        if (st.cropRect) {
          cropCanvasToRect(st.cropRect);
          patch({ cropRect: null });
          setTool('move');
        }
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (getState().selectionRect) window.dispatchEvent(new CustomEvent('ds:erase-selection'));
        else deleteLayer();
        return;
      }
      if (e.key === '[' || e.key === ']') {
        const cur = getState().toolOptions.brushSize;
        setToolOption({ brushSize: Math.max(1, Math.min(400, cur + (e.key === ']' ? Math.ceil(cur / 6) + 1 : -Math.ceil(cur / 6) - 1))) });
        return;
      }
      if (e.key.startsWith('Arrow')) {
        const layer = activeLayer();
        if (!layer) return;
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        updateLayer(layer.id, { x: layer.x + dx, y: layer.y + dy }, { history: false, label: 'Nudge' });
        return;
      }
      if (e.key === 'F11') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('ds:open', { detail: 'prefs' }));
        return;
      }
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        openDialog('shortcuts');
        return;
      }

      const k = e.key.toLowerCase();
      if (TOOL_KEYS[k]) {
        setTool(TOOL_KEYS[k]);
        return;
      }
      if (k === 'g' && e.shiftKey) setTool('gradient');
    },
    []
  );

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onKeyDown]);

  // re-render after images load
  useEffect(() => {
    const onLoad = () => clearRenderCache(true);
    window.addEventListener('ds:image-loaded', onLoad);
    return () => window.removeEventListener('ds:image-loaded', onLoad);
  }, []);

  return (
    <div className="app" style={{ height: '100%' }}>
      <TopBar />
      {screen === 'editor' && doc ? (
        <div className="workspace">
          <Toolbar />
          <div className="stage">
            <OptionsBar />
            <CanvasStage />
          </div>
          <PanelHost />
        </div>
      ) : (
        <StartScreen />
      )}

      <Wizard />
      <Tour />

      {dialogs.new ? <NewDesignDialog /> : null}
      {dialogs.export ? <ExportDialog /> : null}
      {dialogs.social ? <SocialExportDialog /> : null}
      {dialogs.templates ? <TemplatesDialog /> : null}
      {dialogs.shortcuts ? <ShortcutsDialog /> : null}
      {dialogs.prefs ? <PreferencesDialog /> : null}
      {dialogs.about ? <AboutDialog /> : null}
      {dialogs.updates ? <UpdatesDialog /> : null}
      {dialogs.guide ? <GuideDialog /> : null}

      {dragging ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            background: 'color-mix(in srgb, var(--accent) 14%, rgba(0,0,0,0.6))',
            border: '3px dashed var(--accent)',
            zIndex: 500,
            pointerEvents: 'none',
          }}
        >
          <div className="card" style={{ padding: '18px 22px', fontSize: 14, fontWeight: 600 }}>
            <Icon name="upload" size={20} /> {t('start.dragDrop')}
          </div>
        </div>
      ) : null}

      <div className="toasts">
        {toasts.map((x) => (
          <div key={x.id} className={`toast ${x.type}`} onClick={() => dismissToast(x.id)} role="status">
            <Icon name={x.type === 'error' ? 'warning' : x.type === 'info' ? 'info' : 'check'} size={14} />
            <span dir="auto">{x.message?.startsWith('toast.') || x.message?.startsWith('studio.') || x.message?.startsWith('adj.') ? t(x.message, x.vars) : x.message}</span>
          </div>
        ))}
      </div>

      {!isDesktop ? null : null}
      <DebugPlatform />
    </div>
  );
}

function DebugPlatform() {
  useEffect(() => {
    if (PLATFORM !== 'web') document.title = `DesignShop — ${PLATFORM}`;
  }, []);
  return null;
}

export { toast };
