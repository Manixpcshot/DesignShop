// The canvas stage: rendering, zoom/pan, selection, transform handles,
// crop, brush/eraser painting, magic wand, eyedropper and shape drawing.
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  useEditor,
  getState,
  setZoom,
  setPan,
  selectLayer,
  updateLayer,
  addLayer,
  commitDoc,
  toast,
  setTool,
  patch,
} from '../lib/store.js';
import { layerCorners, pointInLayer, docToLocal, clamp } from '../lib/geometry.js';
import { renderDocument, getLayerCanvas } from '../lib/render.js';
import { createShapeLayer, createEmojiLayer, createTextLayer, refreshTextLayer, layerId } from '../lib/document.js';
import { fontCss } from '../lib/presets.js';
import { setToolOption } from '../lib/store.js';

const SHAPE_TOOLS = ['rect', 'ellipse', 'line', 'arrow', 'star', 'heart', 'polygon', 'frame', 'highlight'];

function usePanZoom(ref) {
  const zoom = useEditor((s) => s.zoom);
  const pan = useEditor((s) => s.pan);
  const fitMode = useEditor((s) => s.fitMode);
  const doc = useEditor((s) => s.doc);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  const fitZoom = React.useMemo(() => {
    if (!doc || !size.w || !size.h) return 1;
    return Math.min((size.w - 90) / doc.w, (size.h - 90) / doc.h, 1.6);
  }, [doc, size]);

  const effZoom = fitMode ? fitZoom : zoom;
  return { size, effZoom, fitZoom, pan: fitMode ? { x: 0, y: 0 } : pan };
}

export default function CanvasStage() {
  const doc = useEditor((s) => s.doc);
  const selection = useEditor((s) => s.selection);
  const tool = useEditor((s) => s.activeTool);
  const toolOptions = useEditor((s) => s.toolOptions);
  const showGrid = useEditor((s) => s.showGrid);
  const showRulers = useEditor((s) => s.showRulers);
  const cropRect = useEditor((s) => s.cropRect);
  const selectionShape = useEditor((s) => s.selectionRect);

  const areaRef = useRef(null);
  const baseRef = useRef(null);
  const overlayRef = useRef(null);
  const wrapRef = useRef(null);
  const { size, effZoom, fitZoom, pan } = usePanZoom(areaRef);

  const [spaceDown, setSpaceDown] = useState(false);
  /** inline text editing: { id, value } while a headline is being typed */
  const [editing, setEditing] = useState(null);
  const [drag, setDrag] = useState(null);
  const [hover, setHover] = useState(null);
  const paintRef = useRef(null);

  // ---------------------------------------------------------------- helpers
  const activeLayer = doc?.layers.find((l) => l.id === selection[selection.length - 1]) || null;

  const toDoc = useCallback(
    (clientX, clientY) => {
      const frame = wrapRef.current;
      if (!frame) return { x: 0, y: 0 };
      const r = frame.getBoundingClientRect();
      return { x: (clientX - r.left) / effZoom, y: (clientY - r.top) / effZoom };
    },
    [effZoom]
  );

  // ---------------------------------------------------------------- render
  // compose at exactly the on-screen pixel size (zoom × DPR) so text is crisp
  const dpr = window.devicePixelRatio || 1;
  const renderScale = clamp(effZoom * Math.min(dpr, 2), 0.25, 4);

  useLayoutEffect(() => {
    if (!doc || !baseRef.current) return;
    const canvas = baseRef.current;
    const wanted = {
      w: Math.max(1, Math.round(doc.w * renderScale)),
      h: Math.max(1, Math.round(doc.h * renderScale)),
    };
    if (canvas.width !== wanted.w || canvas.height !== wanted.h) {
      canvas.width = wanted.w;
      canvas.height = wanted.h;
    }
    renderDocument(canvas, doc, { scale: renderScale, rasterScale: renderScale });
  }, [doc, renderScale]);

  useEffect(() => {
    const onLoad = () => {
      if (doc && baseRef.current) renderDocument(baseRef.current, doc, { scale: renderScale, rasterScale: renderScale });
    };
    window.addEventListener('ds:image-loaded', onLoad);
    return () => window.removeEventListener('ds:image-loaded', onLoad);
  }, [doc, renderScale]);

  // ------------------------------------------------------------- overlay draw
  useLayoutEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay || !doc) return;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(doc.w * effZoom);
    const h = Math.round(doc.h * effZoom);
    if (overlay.width !== Math.round(w * dpr) || overlay.height !== Math.round(h * dpr)) {
      overlay.width = Math.round(w * dpr);
      overlay.height = Math.round(h * dpr);
    }
    const ctx = overlay.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    ctx.setTransform(effZoom * dpr, 0, 0, effZoom * dpr, 0, 0);
    ctx.lineWidth = 1 / effZoom;

    // grid
    if (showGrid) {
      const step = Math.max(32, Math.round(Math.min(doc.w, doc.h) / 16));
      ctx.strokeStyle = 'rgba(120,160,255,0.20)';
      ctx.beginPath();
      for (let x = step; x < doc.w; x += step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, doc.h);
      }
      for (let y = step; y < doc.h; y += step) {
        ctx.moveTo(0, y);
        ctx.lineTo(doc.w, y);
      }
      ctx.stroke();
      // thirds
      ctx.strokeStyle = 'rgba(120,160,255,0.12)';
      ctx.beginPath();
      for (let i = 1; i < 3; i++) {
        ctx.moveTo((doc.w / 3) * i, 0);
        ctx.lineTo((doc.w / 3) * i, doc.h);
        ctx.moveTo(0, (doc.h / 3) * i);
        ctx.lineTo(doc.w, (doc.h / 3) * i);
      }
      ctx.stroke();
    }

    // selection shape
    if (selectionShape) {
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.6 / effZoom;
      ctx.setLineDash([6 / effZoom, 4 / effZoom]);
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 3;
      if (selectionShape.kind === 'rect') {
        ctx.strokeRect(selectionShape.x, selectionShape.y, selectionShape.w, selectionShape.h);
        ctx.fillStyle = 'rgba(76,141,255,0.10)';
        ctx.fillRect(selectionShape.x, selectionShape.y, selectionShape.w, selectionShape.h);
      } else if (selectionShape.points?.length) {
        ctx.beginPath();
        ctx.moveTo(selectionShape.points[0].x, selectionShape.points[0].y);
        for (const p of selectionShape.points.slice(1)) ctx.lineTo(p.x, p.y);
        ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = 'rgba(76,141,255,0.10)';
        ctx.fill();
      }
      ctx.restore();
    }

    // crop overlay
    if (cropRect && cropRect.w > 1 && cropRect.h > 1) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      ctx.rect(0, 0, doc.w, doc.h);
      ctx.rect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
      ctx.fill('evenodd');
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5 / effZoom;
      ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1 / effZoom;
      for (let i = 1; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(cropRect.x + (cropRect.w / 3) * i, cropRect.y);
        ctx.lineTo(cropRect.x + (cropRect.w / 3) * i, cropRect.y + cropRect.h);
        ctx.moveTo(cropRect.x, cropRect.y + (cropRect.h / 3) * i);
        ctx.lineTo(cropRect.x + cropRect.w, cropRect.y + (cropRect.h / 3) * i);
        ctx.stroke();
      }
      ctx.restore();
    }

    // selection marquee in progress
    if (drag?.mode === 'marquee' && drag.rect) {
      ctx.save();
      ctx.strokeStyle = '#4c8dff';
      ctx.setLineDash([5 / effZoom, 3 / effZoom]);
      ctx.lineWidth = 1.4 / effZoom;
      ctx.strokeRect(drag.rect.x, drag.rect.y, drag.rect.w, drag.rect.h);
      ctx.restore();
    }
    if (drag?.mode === 'lasso' && drag.points?.length > 1) {
      ctx.save();
      ctx.strokeStyle = '#4c8dff';
      ctx.setLineDash([5 / effZoom, 3 / effZoom]);
      ctx.lineWidth = 1.4 / effZoom;
      ctx.beginPath();
      ctx.moveTo(drag.points[0].x, drag.points[0].y);
      for (const p of drag.points.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.restore();
    }
    // shape preview
    if (drag?.mode === 'shape' && drag.rect) {
      ctx.save();
      ctx.strokeStyle = '#4c8dff';
      ctx.lineWidth = 1.5 / effZoom;
      ctx.setLineDash([4 / effZoom, 3 / effZoom]);
      ctx.strokeRect(drag.rect.x, drag.rect.y, drag.rect.w, drag.rect.h);
      ctx.restore();
    }

    // layer outlines + transform handles
    const showHandles = activeLayer && !activeLayer.locked && drag?.mode !== 'marquee';
    const selLayers = doc.layers.filter((l) => selection.includes(l.id));
    for (const l of selLayers) {
      const corners = layerCorners(l);
      ctx.save();
      ctx.strokeStyle = l.id === activeLayer?.id ? '#4c8dff' : 'rgba(120,190,255,0.7)';
      ctx.lineWidth = 1.4 / effZoom;
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      for (const c of corners.slice(1)) ctx.lineTo(c.x, c.y);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
    if (showHandles) {
      const corners = layerCorners(activeLayer);
      const hs = 7 / effZoom;
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#4c8dff';
      ctx.lineWidth = 1.4 / effZoom;
      for (const c of corners) {
        ctx.beginPath();
        ctx.rect(c.x - hs / 2, c.y - hs / 2, hs, hs);
        ctx.fill();
        ctx.stroke();
      }
      // rotation handle
      const topMid = { x: (corners[0].x + corners[1].x) / 2, y: (corners[0].y + corners[1].y) / 2 };
      const angle = ((activeLayer.rotation || 0) * Math.PI) / 180;
      const off = 34 / effZoom;
      const rh = { x: topMid.x + Math.sin(angle) * off, y: topMid.y - Math.cos(angle) * off };
      ctx.beginPath();
      ctx.moveTo(topMid.x, topMid.y);
      ctx.lineTo(rh.x, rh.y);
      ctx.strokeStyle = '#4c8dff';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(rh.x, rh.y, 5 / effZoom, 0, Math.PI * 2);
      ctx.fillStyle = '#4c8dff';
      ctx.fill();
      ctx.restore();
    }
  }, [doc, effZoom, selection, activeLayer, showGrid, cropRect, selectionShape, drag]);

  // ------------------------------------------------------------- interactions
  const hitTest = (pt) => {
    if (!doc) return null;
    for (let i = doc.layers.length - 1; i >= 0; i--) {
      const l = doc.layers[i];
      if (!l.visible || l.locked) continue;
      if (pointInLayer(l, pt.x, pt.y)) return l;
    }
    return null;
  };

  const handleAt = (pt) => {
    if (!activeLayer) return null;
    const corners = layerCorners(activeLayer);
    const tol = 10 / effZoom;
    const names = ['nw', 'ne', 'se', 'sw'];
    for (let i = 0; i < 4; i++) {
      if (Math.hypot(corners[i].x - pt.x, corners[i].y - pt.y) < tol) return names[i];
    }
    const topMid = { x: (corners[0].x + corners[1].x) / 2, y: (corners[0].y + corners[1].y) / 2 };
    const angle = ((activeLayer.rotation || 0) * Math.PI) / 180;
    const off = 34 / effZoom;
    const rh = { x: topMid.x + Math.sin(angle) * off, y: topMid.y - Math.cos(angle) * off };
    if (Math.hypot(rh.x - pt.x, rh.y - pt.y) < tol) return 'rotate';
    return null;
  };

  const onPointerDown = (e) => {
    if (!doc) return;
    const pt = toDoc(e.clientX, e.clientY);
    areaRef.current?.setPointerCapture?.(e.pointerId);

    // pan: middle mouse, space, hand tool
    if (e.button === 1 || spaceDown || tool === 'hand') {
      setDrag({ mode: 'pan', start: { x: e.clientX, y: e.clientY }, pan0: getState().pan });
      return;
    }
    if (e.button === 2) {
      // right click = quick eyedropper
      pickColor(pt);
      return;
    }

    if (tool === 'zoom') {
      const cur = getState().fitMode ? fitZoom : getState().zoom;
      setZoom(cur * (e.altKey ? 1 / 1.35 : 1.35), { fit: false });
      return;
    }
    if (tool === 'eyedropper') {
      pickColor(pt);
      return;
    }
    if (tool === 'crop') {
      setDrag({ mode: 'crop', start: pt, rect: { x: pt.x, y: pt.y, w: 0, h: 0 } });
      commitDoc(getState().doc, { label: 'crop-start', history: false });
      return;
    }
    if (tool === 'marquee') {
      setDrag({ mode: 'marquee', start: pt, rect: { x: pt.x, y: pt.y, w: 0, h: 0 } });
      return;
    }
    if (tool === 'lasso') {
      setDrag({ mode: 'lasso', start: pt, points: [pt] });
      return;
    }
    if (tool === 'wand') {
      magicWand(pt);
      return;
    }
    if (tool === 'text') {
      const layer = createTextLayer(doc, {
        text: '',
        x: Math.round(pt.x),
        y: Math.round(pt.y),
        fontId: toolOptions.fontId,
        fontSize: toolOptions.fontSize,
        color: toolOptions.textColor,
        name: 'Text',
      });
      // Start empty and edit it straight on the canvas, Photoshop-style.
      // The layer is uncommitted on purpose: if the user clicks away without
      // typing anything we delete it from the stack (no undo entry, no stray
      // empty layer). addLayer's own label is the single toast for this action.
      addLayer({ ...layer, text: '' }, { label: 'toast.textAdded', history: false });
      setTool('move');
      setEditing({ id: layer.id, value: '', fresh: true });
      return;
    }
    if (tool === 'sticker') {
      const emoji = e.altKey ? '🔥' : getStickerEmoji();
      const layer = createEmojiLayer(doc, emoji, { x: Math.round(pt.x - 60), y: Math.round(pt.y - 60) });
      addLayer(layer, { label: 'toast.emojiAdded' });
      toast('toast.emojiAdded');
      return;
    }
    if (tool === 'brush' || tool === 'eraser') {
      startPaint(pt, tool === 'eraser');
      return;
    }
    if (tool === 'fill') {
      fillArea(pt);
      return;
    }
    if (tool === 'gradient') {
      applyGradientToBackground();
      return;
    }
    if (SHAPE_TOOLS.includes(tool)) {
      setDrag({ mode: 'shape', start: pt, rect: { x: pt.x, y: pt.y, w: 0, h: 0 }, shape: tool });
      return;
    }

    // move tool
    const handle = handleAt(pt);
    if (handle && activeLayer && !activeLayer.locked) {
      setDrag({
        mode: handle === 'rotate' ? 'rotate' : 'scale',
        handle,
        start: pt,
        layer0: { ...activeLayer },
        center: { x: activeLayer.x + activeLayer.w / 2, y: activeLayer.y + activeLayer.h / 2 },
      });
      return;
    }
    const hit = hitTest(pt);
    if (hit) {
      selectLayer(hit.id, { toggle: e.shiftKey });
      setDrag({
        mode: 'move',
        start: pt,
        layer0: { ...hit },
        ids: getState().selection.includes(hit.id) ? getState().selection : [hit.id],
      });
    } else if (!e.shiftKey) {
      selectLayer(null);
    }
  };

  const onPointerMove = (e) => {
    if (!doc) return;
    const pt = toDoc(e.clientX, e.clientY);
    setHover(pt);
    if (!drag) return;

    if (drag.mode === 'pan') {
      setPan({ x: drag.pan0.x + (e.clientX - drag.start.x), y: drag.pan0.y + (e.clientY - drag.start.y) });
      return;
    }
    if (drag.mode === 'marquee' || drag.mode === 'crop' || drag.mode === 'shape') {
      const x = Math.min(drag.start.x, pt.x);
      const y = Math.min(drag.start.y, pt.y);
      const w = Math.abs(pt.x - drag.start.x);
      const h = Math.abs(pt.y - drag.start.y);
      const rect = e.shiftKey
        ? { x, y, w: Math.max(w, h), h: Math.max(w, h) }
        : { x, y, w, h };
      setDrag({ ...drag, rect, end: pt });
      return;
    }
    if (drag.mode === 'lasso') {
      setDrag({ ...drag, points: [...drag.points, pt] });
      return;
    }
    if (drag.mode === 'brush') {
      continuePaint(pt);
      return;
    }
    if (drag.mode === 'move') {
      let dx = pt.x - drag.start.x;
      let dy = pt.y - drag.start.y;
      dx = Math.round(dx);
      dy = Math.round(dy);
      if (e.shiftKey) {
        if (Math.abs(dx) > Math.abs(dy)) dy = 0;
        else dx = 0;
      }
      const st = getState();
      const moving = drag.ids.map((id) => {
        const l0 = st.doc.layers.find((l) => l.id === id);
        const base = id === drag.layer0.id ? drag.layer0 : l0;
        return { id, x: base.x + dx, y: base.y + dy };
      });
      commitDoc(
        {
          ...st.doc,
          layers: st.doc.layers.map((l) => {
            const m = moving.find((x) => x.id === l.id);
            return m ? { ...l, x: m.x, y: m.y } : l;
          }),
        },
        { history: false, label: 'Move layer' }
      );
      return;
    }
    if (drag.mode === 'scale') {
      const l0 = drag.layer0;
      const signX = drag.handle.includes('w') ? -1 : 1;
      const signY = drag.handle.includes('n') ? -1 : 1;
      const dx = (pt.x - drag.start.x) * signX;
      const dy = (pt.y - drag.start.y) * signY;
      let nw = Math.max(16, l0.w + dx);
      let nh = Math.max(16, l0.h + dy);
      if (e.shiftKey) {
        const ratio = l0.w / l0.h;
        nh = nw / ratio;
      }
      const next = {
        ...l0,
        w: Math.round(nw),
        h: Math.round(nh),
        x: signX < 0 ? l0.x + (l0.w - nw) : l0.x,
        y: signY < 0 ? l0.y + (l0.h - nh) : l0.y,
      };
      if (l0.type === 'text') {
        const scale = nw / l0.w;
        next.fontSize = Math.max(6, Math.round(l0.fontSize * scale));
        next.w = l0.w;
        next.h = l0.h;
      }
      updateLayer(drag.layer0.id, next, { history: false, label: 'Scale layer' });
      return;
    }
    if (drag.mode === 'rotate') {
      const ang = (Math.atan2(pt.y - drag.center.y, pt.x - drag.center.x) * 180) / Math.PI + 90;
      updateLayer(drag.layer0.id, { rotation: Math.round(e.shiftKey ? Math.round(ang / 15) * 15 : ang) }, {
        history: false,
        label: 'Rotate layer',
      });
    }
  };

  const onPointerUp = (e) => {
    if (!drag) return;
    const st = getState();
    if (drag.mode === 'marquee' && drag.rect) {
      const r = drag.rect;
      if (r.w > 2 && r.h > 2) commitDoc(st.doc, { label: 'Select area', history: false });
      patch({ selectionRect: { kind: 'rect', x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) } });
    }
    if (drag.mode === 'lasso' && drag.points?.length > 2) {
      patch({ selectionRect: { kind: 'lasso', points: drag.points.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) })) } });
    }
    if (drag.mode === 'crop' && drag.rect && drag.rect.w > 4 && drag.rect.h > 4) {
      patch({ cropRect: drag.rect });
      toast('opt.keepRatio', 'info');
    }
    if (drag.mode === 'shape' && drag.rect && drag.rect.w > 6 && drag.rect.h > 6) {
      createShapeFromDrag(drag.shape, drag.rect);
    }
    if (['move', 'scale', 'rotate'].includes(drag.mode)) {
      commitDoc(st.doc, { label: drag.mode === 'move' ? 'Move layer' : 'Transform layer' });
    }
    if (drag.mode === 'brush') {
      paintRef.current = null;
    }
    setDrag(null);
    void e;
  };

  const onWheel = (e) => {
    e.preventDefault();
    if (!doc) return;
    if (e.ctrlKey || e.metaKey) {
      const cur = getState().fitMode ? fitZoom : getState().zoom;
      setZoom(cur * (e.deltaY < 0 ? 1.12 : 1 / 1.12), { fit: false });
    } else if (e.shiftKey) {
      const p = getState().pan;
      setPan({ x: p.x - e.deltaY, y: p.y });
    } else {
      const p = getState().pan;
      setPan({ x: p.x - e.deltaX, y: p.y - e.deltaY });
    }
  };

  // ------------------------------------------------------------- operations
  const getStickerEmoji = () => {
    const set = (toolOptions.stickerSet || 'symbols').trim();
    const map = { symbols: '🔥', faces: '😮', arrows: '➡️', objects: '🎮', badges: '🆕', numbers: '1️⃣' };
    return map[set] || '🔥';
  };

  const pickColor = (pt) => {
    const canvas = baseRef.current;
    if (!canvas) return;
    const s = canvas.width / doc.w;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const d = ctx.getImageData(clamp(Math.round(pt.x * s), 0, canvas.width - 1), clamp(Math.round(pt.y * s), 0, canvas.height - 1), 1, 1).data;
    const hex = `#${[d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
    setToolOption({ brushColor: hex, shapeFill: hex, textColor: hex });
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(hex).catch(() => {});
    toast(hex, 'info');
  };

  const createShapeFromDrag = (shape, rect) => {
    const st = getState();
    const isLine = shape === 'line' || shape === 'arrow';
    const layer = createShapeLayer(st.doc, {
      shape: shape === 'highlight' ? 'rect' : shape,
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      w: Math.max(8, Math.round(rect.w)),
      h: isLine ? Math.max(10, Math.round(rect.h)) : Math.max(8, Math.round(rect.h)),
      fillColor: st.toolOptions.shapeFill,
      stroke: st.toolOptions.shapeStroke === 'transparent' ? null : st.toolOptions.shapeStroke,
      strokeWidth: st.toolOptions.strokeWidth,
      radius: st.toolOptions.radius,
      points: st.toolOptions.shapePoints,
    });
    if (shape === 'highlight') {
      layer.blend = 'multiply';
      layer.opacity = 55;
      layer.fillColor = '#ffe14d';
      layer.fill = '#ffe14d';
    }
    if (shape === 'frame') {
      layer.fill = false;
      layer.strokeWidth = Math.max(4, Math.round(Math.min(rect.w, rect.h) * 0.04));
      layer.shape = 'frame';
    }
    addLayer(layer, { label: 'toast.layerAdded' });
  };

  const startPaint = (pt, erase) => {
    const st = getState();
    let target = st.doc.layers.find((l) => l.id === st.selection[st.selection.length - 1]);
    const stroke = {
      id: layerId(),
      color: st.toolOptions.brushColor,
      size: st.toolOptions.brushSize,
      opacity: st.toolOptions.brushHardness < 100 ? 100 : 100,
      erase,
      points: [pt],
    };
    if (!target || target.type !== 'brush' || target.locked) {
      const layer = {
        id: layerId(),
        type: 'brush',
        name: erase ? 'Eraser' : 'Paint',
        strokes: [stroke],
        baseW: st.doc.w,
        baseH: st.doc.h,
        x: 0,
        y: 0,
        w: st.doc.w,
        h: st.doc.h,
        rotation: 0,
        opacity: 100,
        blend: 'normal',
        visible: true,
        locked: false,
        effects: { shadow: { on: false }, glow: { on: false }, stroke: { on: false }, radius: { on: false } },
      };
      addLayer(layer, { label: 'Paint' });
      paintRef.current = { layerId: layer.id, strokeId: stroke.id };
      setDrag({ mode: 'brush', layerId: layer.id, strokeId: stroke.id });
      return;
    }
    const next = {
      ...st.doc,
      layers: st.doc.layers.map((l) =>
        l.id === target.id ? { ...l, strokes: [...(l.strokes || []), stroke] } : l
      ),
    };
    commitDoc(next, { history: false, label: 'Paint' });
    paintRef.current = { layerId: target.id, strokeId: stroke.id };
    setDrag({ mode: 'brush', layerId: target.id, strokeId: stroke.id });
  };

  const continuePaint = (pt) => {
    const ref = paintRef.current;
    if (!ref) return;
    const st = getState();
    const doc2 = {
      ...st.doc,
      layers: st.doc.layers.map((l) =>
        l.id === ref.layerId
          ? {
              ...l,
              strokes: (l.strokes || []).map((s) =>
                s.id === ref.strokeId ? { ...s, points: [...s.points, pt] } : s
              ),
            }
          : l
      ),
    };
    commitDoc(doc2, { history: false, label: 'Paint' });
  };

  const magicWand = (pt) => {
    const canvas = baseRef.current;
    if (!canvas || !doc) return;
    const s = canvas.width / doc.w;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const w = canvas.width;
    const h = canvas.height;
    const sx = clamp(Math.round(pt.x * s), 0, w - 1);
    const sy = clamp(Math.round(pt.y * s), 0, h - 1);
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const i0 = (sy * w + sx) * 4;
    const target = [d[i0], d[i0 + 1], d[i0 + 2], d[i0 + 3]];
    const tol = getState().toolOptions.tolerance * 2.2;
    const mask = new Uint8ClampedArray(w * h);
    const stack = [sy * w + sx];
    const seen = new Uint8Array(w * h);
    while (stack.length) {
      const idx = stack.pop();
      if (seen[idx]) continue;
      seen[idx] = 1;
      const o = idx * 4;
      const dist =
        Math.abs(d[o] - target[0]) + Math.abs(d[o + 1] - target[1]) + Math.abs(d[o + 2] - target[2]) + Math.abs(d[o + 3] - target[3]);
      if (dist > tol) continue;
      mask[idx] = 255;
      const x = idx % w;
      const y = (idx / w) | 0;
      if (x > 0) stack.push(idx - 1);
      if (x < w - 1) stack.push(idx + 1);
      if (y > 0) stack.push(idx - w);
      if (y < h - 1) stack.push(idx + w);
    }
    // build a selection overlay mask image
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = w;
    maskCanvas.height = h;
    const mctx = maskCanvas.getContext('2d');
    const mimg = mctx.createImageData(w, h);
    for (let i = 0; i < mask.length; i++) {
      if (mask[i]) {
        mimg.data[i * 4] = 76;
        mimg.data[i * 4 + 1] = 141;
        mimg.data[i * 4 + 2] = 255;
        mimg.data[i * 4 + 3] = 255;
      }
    }
    mctx.putImageData(mimg, 0, 0);
    patch({ selectionRect: { kind: 'mask', mask, w, h, scale: s } });
    toast('tool.wand', 'info');
  };

  // -------------------------------------------------------------- selection ops
  useEffect(() => {
    const onFill = (e) => {
      const st = getState();
      if (!st.selectionRect || !activeLayer) return;
      fillSelectionWith(e.detail?.color || st.toolOptions.shapeFill);
    };
    const onErase = () => eraseSelection();
    window.addEventListener('ds:fill-selection', onFill);
    window.addEventListener('ds:erase-selection', onErase);
    return () => {
      window.removeEventListener('ds:fill-selection', onFill);
      window.removeEventListener('ds:erase-selection', onErase);
    };
  });

  const rasterizeActive = () => {
    const st = getState();
    const layer = activeLayer;
    if (!layer) return null;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(layer.w));
    canvas.height = Math.max(1, Math.round(layer.h));
    const ctx = canvas.getContext('2d');
    const src = getLayerCanvas(layer);
    if (!src) return null;
    ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
    return { layer, canvas, ctx };
  };

  const applySelectionMask = (ctx, layer) => {
    const sel = getState().selectionRect;
    if (!sel) return true;
    ctx.save();
    if (sel.kind === 'rect') {
      const a = docToLocal(layer, sel.x, sel.y);
      const b = docToLocal(layer, sel.x + sel.w, sel.y + sel.h);
      ctx.beginPath();
      ctx.rect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
      ctx.clip();
    } else if (sel.kind === 'lasso') {
      ctx.beginPath();
      sel.points.forEach((p, i) => {
        const l = docToLocal(layer, p.x, p.y);
        if (i === 0) ctx.moveTo(l.x, l.y);
        else ctx.lineTo(l.x, l.y);
      });
      ctx.closePath();
      ctx.clip();
    }
    return true;
  };

  const fillSelectionWith = (color) => {
    const raster = rasterizeActive();
    if (!raster) return;
    const { layer, canvas, ctx } = raster;
    applySelectionMask(ctx, layer);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore?.();
    const src = canvas.toDataURL('image/png');
    updateLayer(
      layer.id,
      {
        type: 'image',
        src,
        srcVersion: (layer.srcVersion || 0) + 1,
        w: canvas.width,
        h: canvas.height,
        effects: layer.effects,
      },
      { label: 'Fill selection' }
    );
    toast('opt.fillSelection');
  };

  const eraseSelection = () => {
    const raster = rasterizeActive();
    if (!raster) return;
    const { layer, canvas, ctx } = raster;
    ctx.save();
    const sel = getState().selectionRect;
    if (sel?.kind === 'rect') {
      const a = docToLocal(layer, sel.x, sel.y);
      const b = docToLocal(layer, sel.x + sel.w, sel.y + sel.h);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    } else if (sel?.kind === 'lasso') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      sel.points.forEach((p, i) => {
        const l = docToLocal(layer, p.x, p.y);
        if (i === 0) ctx.moveTo(l.x, l.y);
        else ctx.lineTo(l.x, l.y);
      });
      ctx.closePath();
      ctx.fill();
    } else {
      updateFillAllRemoval(layer, canvas, ctx);
    }
    ctx.restore();
    const src = canvas.toDataURL('image/png');
    updateLayer(
      layer.id,
      { type: 'image', src, srcVersion: (layer.srcVersion || 0) + 1, w: canvas.width, h: canvas.height },
      { label: 'Erase selection' }
    );
  };

  const updateFillAllRemoval = (layer, canvas, ctx) => {
    void layer;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const fillArea = (pt) => {
    const layer = hitTest(pt);
    if (!layer) return;
    if (layer.type === 'image' || layer.type === 'brush') {
      selectLayer(layer.id);
      patch({ selectionRect: { kind: 'rect', x: 0, y: 0, w: doc.w, h: doc.h } });
      setTimeout(() => fillSelectionWith(getState().toolOptions.shapeFill), 0);
      return;
    }
    if (layer.type === 'shape') {
      updateLayer(layer.id, { fill: getState().toolOptions.shapeFill, fillColor: getState().toolOptions.shapeFill }, { label: 'Fill' });
      return;
    }
    toast('tool.fill', 'info');
  };

  const applyGradientToBackground = () => {
    const st = getState();
    commitDoc(
      {
        ...st.doc,
        background: {
          kind: 'linear',
          colors: [st.toolOptions.gradientA, st.toolOptions.gradientB],
          angle: st.toolOptions.gradientAngle,
        },
      },
      { label: 'Gradient background' }
    );
    toast('studio.bgApplied');
  };

  // ------------------------------------------------------ inline text editing
  const editingLayer = editing ? doc?.layers.find((l) => l.id === editing.id) : null;

  const commitInlineText = useCallback(
    (raw) => {
      const state = editing;
      if (!state) return;
      const value = (raw ?? state.value ?? '').replace(/\s+$/, '');
      const layer = getState().doc?.layers.find((l) => l.id === state.id);
      setEditing(null);
      if (!layer) return;
      if (!value.trim()) {
        // An empty headline is just noise — remove it again. A layer that was
        // only created by this editing session leaves no trace at all
        // (no undo step), so "click the canvas, change your mind" is free.
        const doc = getState().doc;
        const nextDoc = { ...doc, layers: doc.layers.filter((l) => l.id !== state.id) };
        if (state.fresh) patch({ doc: nextDoc, selection: [] });
        else commitDoc(nextDoc, { label: 'Delete text', select: null });
        return;
      }
      const next = refreshTextLayer({ ...layer, text: value }, 'topLeft');
      updateLayer(state.id, { text: next.text, w: next.w, h: next.h }, { label: 'Edit text' });
    },
    [editing]
  );

  /** Double-clicking a text layer edits it in place too. */
  const startEditingLayer = useCallback((layer) => {
    if (!layer || layer.type !== 'text' || layer.locked) return false;
    selectLayer(layer.id);
    setEditing({ id: layer.id, value: layer.text || '' });
    return true;
  }, []);

  useEffect(() => {
    if (!editing) return;
    // The click that starts editing is still finishing when this runs; focusing
    // immediately would be undone by the mouseup landing on the textarea and
    // blurring it. Wait until the pointer sequence is over.
    const focus = () => {
      const el = document.getElementById('inline-text-input');
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    };
    const t = setTimeout(focus, 60);
    window.addEventListener('pointerup', focus, { once: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener('pointerup', focus);
    };
  }, [editing?.id]);

  const unitSize = 30;
  const editBox = (() => {
    if (!editingLayer) return null;
    const l = editingLayer;
    const value = editing?.value ?? '';
    const px = Math.max(10, l.fontSize * effZoom);
    // grow with the text so a long headline is never clipped while typing
    const longest = value.split('\n').reduce((m, line) => Math.max(m, line.length), 0);
    const estimated = Math.max(l.w * effZoom, longest * px * 0.62 + px);
    return {
      left: l.x * effZoom,
      top: l.y * effZoom,
      width: Math.max(120, Math.min(estimated, (doc?.w || 1280) * effZoom - l.x * effZoom)),
      height: Math.max(px * 1.6, l.h * effZoom),
      fontSize: px,
      lineHeight: l.lineHeight || 1.12,
      fontFamily: fontCss(l.fontId),
      uppercase: l.uppercase ? 'uppercase' : 'none',
      fontWeight: l.weight || 700,
      letterSpacing: `${(l.letterSpacing || 0) * effZoom}px`,
    };
  })();

  return (
    <div
      className={`canvas-area ${spaceDown ? 'pan-ready' : ''} ${drag?.mode === 'pan' ? 'panning' : ''}`}
      ref={areaRef}
      onPointerDown={onPointerDown}
      onDoubleClick={(e) => {
        if (!doc) return;
        const pt = toDoc(e.clientX, e.clientY);
        const hit = hitTest(pt);
        if (hit && hit.type === 'text') {
          e.preventDefault();
          startEditingLayer(hit);
        }
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      onContextMenu={(e) => e.preventDefault()}
      style={{ cursor: tool === 'brush' || tool === 'eraser' ? 'crosshair' : tool === 'text' ? 'text' : undefined }}
    >
      {showRulers ? (
        <>
          <div className="ruler h">
            <RulerTicks w={doc?.w || 0} zoom={effZoom} horizontal pan={pan} docSize={doc} />
          </div>
          <div className="ruler v">
            <RulerTicks w={doc?.h || 0} zoom={effZoom} vertical pan={pan} docSize={doc} />
          </div>
          <div className="ruler-corner">px</div>
        </>
      ) : null}

      <div className="canvas-wrap" style={{ paddingTop: showRulers ? 18 : 0, paddingInlineStart: showRulers ? 18 : 0 }}>
        <div
          ref={wrapRef}
          className="canvas-frame"
          style={{
            width: Math.round((doc?.w || 1) * effZoom),
            height: Math.round((doc?.h || 1) * effZoom),
            // integer offsets only: a canvas painted on a half-pixel boundary
            // gets resampled by the compositor and looks blurry
            left: Math.round((size.w - (doc?.w || 1) * effZoom) / 2 + pan.x),
            top: Math.round((size.h - (doc?.h || 1) * effZoom) / 2 + pan.y),
          }}
        >
          <canvas ref={baseRef} />
          <canvas ref={overlayRef} className="stage-overlay" />
          {editingLayer && editBox ? (
            <textarea
              id="inline-text-input"
              className="inline-text"
              dir="auto"
              spellCheck={false}
              value={editing?.value ?? ''}
              style={{
                left: editBox.left,
                top: editBox.top,
                width: editBox.width,
                height: editBox.height,
                fontSize: editBox.fontSize,
                lineHeight: editBox.lineHeight,
                textAlign: editingLayer.align || 'center',
                color: editingLayer.color || '#fff',
                fontFamily: editBox.fontFamily,
                fontWeight: editBox.fontWeight,
                textTransform: editBox.uppercase,
                letterSpacing: editBox.letterSpacing,
              }}
              onChange={(e) => setEditing((s) => (s ? { ...s, value: e.target.value } : s))}
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Escape') {
                  e.preventDefault();
                  commitInlineText();
                } else if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  commitInlineText();
                }
              }}
              onBlur={() => {
                // a blur caused by the very first click must not commit
                setTimeout(() => {
                  if (document.activeElement?.id === 'inline-text-input') return;
                  commitInlineText();
                }, 0);
              }}
            />
          ) : null}
        </div>
      </div>

      <div className="zoom-hud">
        <button className="icon-btn" title="Zoom out" onClick={() => setZoom((getState().fitMode ? fitZoom : getState().zoom) / 1.25, { fit: false })}>
          <span style={{ fontSize: 15, lineHeight: 1 }}>−</span>
        </button>
        <button
          className="zoom-val"
          title="Fit on screen"
          onClick={() => setZoom(fitZoom, { fit: true })}
        >
          {Math.round(effZoom * 100)}%
        </button>
        <button className="icon-btn" title="Zoom in" onClick={() => setZoom((getState().fitMode ? fitZoom : getState().zoom) * 1.25, { fit: false })}>
          <span style={{ fontSize: 15, lineHeight: 1 }}>+</span>
        </button>
      </div>

      {hover && activeLayer && tool === 'move' ? (
        <div className="stage-hint">
          {Math.round(hover.x)}, {Math.round(hover.y)} · {Math.round(activeLayer.w)}×{Math.round(activeLayer.h)}
        </div>
      ) : null}
      <SpaceListener onChange={setSpaceDown} />
      <UnitProbe unitSize={unitSize} />
    </div>
  );
}

function RulerTicks({ w, zoom, vertical, pan, docSize }) {
  const step = zoom < 0.4 ? 400 : zoom < 1 ? 200 : zoom < 2 ? 100 : 50;
  const ticks = [];
  const total = w * zoom;
  for (let i = 0; i <= w; i += step) {
    const pos = i * zoom;
    if (pos > total) break;
    ticks.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          ...(vertical ? { top: pos, insetInlineStart: 0, width: 18, height: 1 } : { insetInlineStart: pos, top: 0, height: 18, width: 1 }),
          background: 'var(--border)',
        }}
      >
        <span
          style={{
            position: 'absolute',
            fontSize: 8,
            color: 'var(--text-mute)',
            ...(vertical ? { top: 1, insetInlineStart: 3 } : { insetInlineStart: 3, top: 2 }),
          }}
        >
          {i}
        </span>
      </div>
    );
  }
  return <div style={{ position: 'absolute', inset: 0, transform: vertical ? `translateY(${pan.y}px)` : `translateX(${pan.x}px)` }}>{ticks}{docSize ? null : null}</div>;
}

function SpaceListener({ onChange }) {
  useEffect(() => {
    const down = (e) => {
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        onChange(true);
      }
    };
    const up = (e) => {
      if (e.code === 'Space') onChange(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [onChange]);
  return null;
}

function UnitProbe({ unitSize }) {
  void unitSize;
  return null;
}
