// Minimal canvas/DOM harness so the real editor + renderer code can run in Node.
// It is NOT a pixel-accurate canvas — it records calls and returns plausible
// values so we can catch wiring bugs (missing methods, undefined args, etc).
const calls = [];

function makeCtx(canvas) {
  const state = {
    font: '400 48px sans-serif',
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    letterSpacing: '0px',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    shadowBlur: 0,
  };
  const gradient = () => ({ addColorStop: (o, c) => void calls.push(['addColorStop', o, c]) });
  const ctx = {
    canvas,
    get font() {
      return state.font;
    },
    set font(v) {
      state.font = v;
    },
    ...state,
    save() { calls.push(['save']); },
    restore() { calls.push(['restore']); },
    setTransform() {},
    resetTransform() {},
    clearRect() {},
    fillRect() {},
    strokeRect() {},
    rect() {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    arc() {},
    arcTo() {},
    ellipse() {},
    bezierCurveTo() {},
    quadraticCurveTo() {},
    fill() {},
    stroke() {},
    clip() {},
    translate() {},
    rotate() {},
    scale() {},
    setLineDash() {},
    createLinearGradient: gradient,
    createRadialGradient: gradient,
    createPattern: () => ({}),
    drawImage(img) {
      if (img === undefined || img === null) throw new Error('drawImage called with ' + img);
    },
    measureText(text) {
      const m = /(\d+(?:\.\d+)?)px/.exec(state.font);
      const size = m ? Number(m[1]) : 16;
      const weight = /(\d{3})/.exec(state.font);
      const factor = weight && Number(weight[1]) >= 700 ? 0.62 : 0.55;
      return { width: String(text).length * size * factor };
    },
    fillText() {},
    strokeText() {},
    getImageData(x, y, w, h) {
      return { data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h };
    },
    putImageData() {},
    createImageData(w, h) {
      return { data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h };
    },
  };
  // keep style properties assignable
  for (const k of ['fillStyle', 'strokeStyle', 'lineWidth', 'globalAlpha', 'globalCompositeOperation', 'letterSpacing', 'textAlign', 'textBaseline', 'shadowBlur', 'shadowColor', 'lineCap', 'lineJoin', 'filter']) {
    Object.defineProperty(ctx, k, {
      get: () => state[k],
      set: (v) => {
        state[k] = v;
      },
      enumerable: true,
      configurable: true,
    });
  }
  return ctx;
}

class FakeCanvas {
  constructor(w = 300, h = 150) {
    this.width = w;
    this.height = h;
    this._ctx = null;
  }
  getContext() {
    if (!this._ctx) this._ctx = makeCtx(this);
    return this._ctx;
  }
  toDataURL(mime = 'image/png') {
    return `data:${mime};base64,iVBORw0KGgoAAAANSUhEUg==`;
  }
  toBlob(cb) {
    cb(new Blob(['x'], { type: 'image/png' }));
  }
  getBoundingClientRect() {
    return { left: 0, top: 0, width: this.width, height: this.height, right: this.width, bottom: this.height };
  }
  addEventListener() {}
  removeEventListener() {}
  setPointerCapture() {}
}

class FakeImage {
  constructor() {
    this.naturalWidth = 800;
    this.naturalHeight = 600;
    this.width = 800;
    this.height = 600;
    this.complete = false;
    setTimeout(() => {
      this.complete = true;
      this.onload?.();
    }, 0);
  }
  set src(v) {
    this._src = v;
  }
  get src() {
    return this._src;
  }
}

const listeners = new Map();

const documentStub = {
  documentElement: { style: { setProperty() {} }, lang: 'en', dir: 'ltr', dataset: {}, requestFullscreen() {} },
  body: { appendChild() {}, removeChild() {} },
  activeElement: null,
  title: '',
  createElement(tag) {
    if (tag === 'canvas') return new FakeCanvas();
    if (tag === 'img') return new FakeImage();
    return {
      style: {},
      appendChild() {},
      remove() {},
      click() {},
      setAttribute() {},
      addEventListener() {},
      removeEventListener() {},
      classList: { add() {}, remove() {}, toggle() {} },
    };
  },
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener(type, fn) {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(fn);
  },
  removeEventListener(type, fn) {
    listeners.get(type)?.delete(fn);
  },
  exitFullscreen() {},
};

const storage = new Map();
const localStorageStub = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear(),
};

const windowStub = {
  devicePixelRatio: 1,
  innerWidth: 1440,
  innerHeight: 900,
  designshop: undefined,
  addEventListener(type, fn) {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(fn);
  },
  removeEventListener(type, fn) {
    listeners.get(type)?.delete(fn);
  },
  dispatchEvent(evt) {
    const set = listeners.get(evt.type);
    if (set) for (const fn of [...set]) fn(evt);
    return true;
  },
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  localStorage: localStorageStub,
  requestAnimationFrame: (fn) => setTimeout(fn, 0),
  cancelAnimationFrame: (id) => clearTimeout(id),
};

export function installDom() {
  globalThis.window = windowStub;
  globalThis.document = documentStub;
  globalThis.localStorage = localStorageStub;
  globalThis.Image = FakeImage;
  globalThis.HTMLCanvasElement = FakeCanvas;
  globalThis.OffscreenCanvas = FakeCanvas;
  globalThis.requestAnimationFrame = windowStub.requestAnimationFrame;
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
  try {
    Object.defineProperty(globalThis, 'navigator', {
      value: { clipboard: { writeText: async () => {}, write: async () => {} }, platform: 'Linux' },
      configurable: true,
    });
  } catch {
    globalThis.window.navigator = { clipboard: { writeText: async () => {}, write: async () => {} }, platform: 'Linux' };
  }
  globalThis.ClipboardItem = class {
    constructor(x) {
      Object.assign(this, x);
    }
  };
  if (!globalThis.CustomEvent) {
    globalThis.CustomEvent = class CustomEvent extends Event {
      constructor(type, opts = {}) {
        super(type);
        this.detail = opts.detail;
      }
    };
  }
  return { window: windowStub, document: documentStub, listeners };
}

export { FakeCanvas, FakeImage, calls };
