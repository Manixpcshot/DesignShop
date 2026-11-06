// Inline SVG icon set — stroke based, 24x24 viewBox, currentColor.
import React from 'react';

const S = ({ children, size = 18, fill = 'none', ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...rest}
  >
    {children}
  </svg>
);

export const icons = {
  move: (p) => (
    <S {...p}>
      <path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" />
    </S>
  ),
  marquee: (p) => (
    <S {...p} strokeDasharray="3 2.4">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </S>
  ),
  lasso: (p) => (
    <S {...p}>
      <path d="M5 9c0-3 3.2-5 7-5s7 2 7 5-3.2 5-7 5c-2 0-3.8-.5-5-1.3" />
      <path d="M7 12.7C5.8 13.6 5 14.8 5 16c0 1.3.8 2.4 2 2.4 1 0 1.7-.7 1.7-1.6 0-.8-.6-1.4-1.4-1.4" />
    </S>
  ),
  wand: (p) => (
    <S {...p}>
      <path d="M15 4V2M15 10V8M11 6H9M21 6h-2M18 3l-1.4 1.4M18 9l-1.4-1.4M12.4 4.6 11 6" />
      <path d="M3 21l9-9" />
      <path d="m14 6 4 4" />
    </S>
  ),
  crop: (p) => (
    <S {...p}>
      <path d="M6 2v14a2 2 0 0 0 2 2h14" />
      <path d="M18 22V8a2 2 0 0 0-2-2H2" />
    </S>
  ),
  eyedropper: (p) => (
    <S {...p}>
      <path d="m14 4 6 6M17 3l4 4-3 3-4-4 3-3Z" />
      <path d="m14 10-9 9v3h3l9-9" />
    </S>
  ),
  brush: (p) => (
    <S {...p}>
      <path d="M9.5 14.5 3 21s3 .5 5-1.5 2-4 2-4" />
      <path d="M20.5 3.5a2.1 2.1 0 0 0-3 0L10 11l3 3 7.5-7.5a2.1 2.1 0 0 0 0-3Z" />
    </S>
  ),
  eraser: (p) => (
    <S {...p}>
      <path d="m7 21-4-4a2 2 0 0 1 0-2.8l9.2-9.2a2 2 0 0 1 2.8 0l4 4a2 2 0 0 1 0 2.8L12 21H7Z" />
      <path d="M6 12l6 6" />
    </S>
  ),
  fill: (p) => (
    <S {...p}>
      <path d="m5 13 6-6 7 7-6 6a2 2 0 0 1-2.8 0L5 15.8A2 2 0 0 1 5 13Z" />
      <path d="M14 6 10 2" />
      <path d="M19 15s2 2.5 2 4a2 2 0 0 1-4 0c0-1.5 2-4 2-4Z" fill="currentColor" stroke="none" />
    </S>
  ),
  gradient: (p) => (
    <S {...p}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 20 21 4" opacity=".5" />
      <path d="M6 20 21 8" opacity=".3" />
    </S>
  ),
  text: (p) => (
    <S {...p}>
      <path d="M4 6V4h16v2M12 4v16M9 20h6" />
    </S>
  ),
  rect: (p) => (
    <S {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
    </S>
  ),
  ellipse: (p) => (
    <S {...p}>
      <ellipse cx="12" cy="12" rx="9" ry="7.5" />
    </S>
  ),
  line: (p) => (
    <S {...p}>
      <path d="M4 20 20 4" />
    </S>
  ),
  arrow: (p) => (
    <S {...p}>
      <path d="M3 12h16" />
      <path d="m14 7 5 5-5 5" />
    </S>
  ),
  star: (p) => (
    <S {...p}>
      <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z" />
    </S>
  ),
  heart: (p) => (
    <S {...p}>
      <path d="M12 20.3 4.4 12.9a4.7 4.7 0 0 1 6.6-6.7l1 1 1-1a4.7 4.7 0 1 1 6.6 6.7L12 20.3Z" />
    </S>
  ),
  polygon: (p) => (
    <S {...p}>
      <path d="m12 3 7.8 4.5v9L12 21l-7.8-4.5v-9L12 3Z" />
    </S>
  ),
  sticker: (p) => (
    <S {...p}>
      <path d="M12 3a9 9 0 1 0 9 9 4 4 0 0 0-4-4h-1a4 4 0 0 1-4-4V3Z" />
      <path d="M9 10h.01M15 10h.01M9.5 14a3.5 3.5 0 0 0 5 0" />
    </S>
  ),
  hand: (p) => (
    <S {...p}>
      <path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11m0-1.5V4a1.5 1.5 0 0 1 3 0v6m0-.5V6a1.5 1.5 0 0 1 3 0v7.5a6 6 0 0 1-6 6h-.5a5 5 0 0 1-3.6-1.5L5 15.5a1.6 1.6 0 0 1 2.4-2.1L8 14" />
    </S>
  ),
  zoom: (p) => (
    <S {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5M8.5 11h5M11 8.5v5" />
    </S>
  ),
  frame: (p) => (
    <S {...p}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <rect x="7" y="7" width="10" height="10" rx="1" opacity=".55" />
    </S>
  ),
  highlight: (p) => (
    <S {...p}>
      <path d="M4 20h6M6 20l3-6" />
      <path d="m11 13 6.5-9.5a1.6 1.6 0 0 1 2.6 2L14 15l-3.5 1z" />
    </S>
  ),
  undo: (p) => (
    <S {...p}>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h9a6 6 0 0 1 0 12H8" />
    </S>
  ),
  redo: (p) => (
    <S {...p}>
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9h-9a6 6 0 0 0 0 12h5" />
    </S>
  ),
  save: (p) => (
    <S {...p}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="M7 3v6h8M7 21v-6h10v6" />
    </S>
  ),
  folder: (p) => (
    <S {...p}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </S>
  ),
  download: (p) => (
    <S {...p}>
      <path d="M12 3v12M7 11l5 5 5-5M4 20h16" />
    </S>
  ),
  upload: (p) => (
    <S {...p}>
      <path d="M12 16V4M7 8l5-5 5 5M4 20h16" />
    </S>
  ),
  image: (p) => (
    <S {...p}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="m4 17 5-5 4 4 3-3 4 4" />
    </S>
  ),
  layers: (p) => (
    <S {...p}>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5M3 16.5l9 5 9-5" />
    </S>
  ),
  sliders: (p) => (
    <S {...p}>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2.2" />
      <circle cx="9" cy="17" r="2.2" />
    </S>
  ),
  sparkles: (p) => (
    <S {...p}>
      <path d="m12 3 1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3Z" />
      <path d="M18 15.5 19 18l2.5 1-2.5 1-1 2.5-1-2.5L14.5 19l2.5-1 1-2.5Z" />
    </S>
  ),
  type: (p) => (
    <S {...p}>
      <path d="M4 7V5h16v2M12 5v14M9 19h6" />
    </S>
  ),
  smile: (p) => (
    <S {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01" />
    </S>
  ),
  history: (p) => (
    <S {...p}>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3 9" />
      <path d="M3 4v5h5M12 8v4.5l3 1.8" />
    </S>
  ),
  settings: (p) => (
    <S {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4.6a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 11a2 2 0 1 1 0 4Z" />
    </S>
  ),
  help: (p) => (
    <S {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.6 2.6 0 1 1 3.6 2.4c-.8.3-1.1 1-1.1 1.8v.3M12 17.2h.01" />
    </S>
  ),
  close: (p) => (
    <S {...p}>
      <path d="M6 6l12 12M18 6 6 18" />
    </S>
  ),
  chevronDown: (p) => (
    <S {...p}>
      <path d="m6 9 6 6 6-6" />
    </S>
  ),
  chevronRight: (p) => (
    <S {...p}>
      <path d="m9 6 6 6-6 6" />
    </S>
  ),
  eye: (p) => (
    <S {...p}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </S>
  ),
  eyeOff: (p) => (
    <S {...p}>
      <path d="M3 3l18 18M10.6 6.1A9.6 9.6 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-2.4 3M6.6 7.6A16 16 0 0 0 2.5 12S6 18 12 18a9.4 9.4 0 0 0 3.6-.7" />
      <path d="M9.9 10a3 3 0 0 0 4.2 4.2" />
    </S>
  ),
  lock: (p) => (
    <S {...p}>
      <rect x="4.5" y="10" width="15" height="10" rx="2" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
    </S>
  ),
  unlock: (p) => (
    <S {...p}>
      <rect x="4.5" y="10" width="15" height="10" rx="2" />
      <path d="M8 10V7.5a4 4 0 0 1 7.5-2" />
    </S>
  ),
  trash: (p) => (
    <S {...p}>
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
      <path d="M10 11v6M14 11v6" />
    </S>
  ),
  copy: (p) => (
    <S {...p}>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </S>
  ),
  check: (p) => (
    <S {...p}>
      <path d="m5 13 4.5 4.5L19 6" />
    </S>
  ),
  plus: (p) => (
    <S {...p}>
      <path d="M12 5v14M5 12h14" />
    </S>
  ),
  minus: (p) => (
    <S {...p}>
      <path d="M5 12h14" />
    </S>
  ),
  globe: (p) => (
    <S {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.7-3.8-9S9.5 5.5 12 3Z" />
    </S>
  ),
  moon: (p) => (
    <S {...p}>
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
    </S>
  ),
  sun: (p) => (
    <S {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </S>
  ),
  grid: (p) => (
    <S {...p}>
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
    </S>
  ),
  ruler: (p) => (
    <S {...p}>
      <path d="M3 16 16 3l5 5L8 21l-5-5Z" />
      <path d="m7 12 2 2M10 9l2 2M13 6l2 2" />
    </S>
  ),
  magnet: (p) => (
    <S {...p}>
      <path d="M6 3v9a6 6 0 0 0 12 0V3h-4v9a2 2 0 0 1-4 0V3H6Z" />
    </S>
  ),
  fit: (p) => (
    <S {...p}>
      <path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4" />
    </S>
  ),
  zoomIn: (p) => (
    <S {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5M8.5 11h5M11 8.5v5" />
    </S>
  ),
  zoomOut: (p) => (
    <S {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5M8.5 11h5" />
    </S>
  ),
  send: (p) => (
    <S {...p}>
      <path d="M21 3 10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5 21 3Z" />
    </S>
  ),
  wandSparkle: (p) => (
    <S {...p}>
      <path d="m4 20 8-8" />
      <path d="m14 4 1.5 3.5L19 9l-3.5 1.5L14 14l-1.5-3.5L9 9l3.5-1.5L14 4Z" />
      <path d="M18.5 15.5 19.5 18l2.5 1-2.5 1-1 2.5" opacity=".8" />
    </S>
  ),
  flipH: (p) => (
    <S {...p}>
      <path d="M12 3v18" strokeDasharray="2 2.5" />
      <path d="M9 7 3 12l6 5V7ZM15 7l6 5-6 5V7Z" />
    </S>
  ),
  flipV: (p) => (
    <S {...p}>
      <path d="M3 12h18" strokeDasharray="2 2.5" />
      <path d="M7 9 12 3l5 6H7ZM7 15l5 6 5-6H7Z" />
    </S>
  ),
  rotate: (p) => (
    <S {...p}>
      <path d="M21 12a9 9 0 1 1-2.6-6.4L21 8" />
      <path d="M21 3v5h-5" />
    </S>
  ),
  centerH: (p) => (
    <S {...p}>
      <path d="M12 3v18" strokeDasharray="2 2.5" />
      <rect x="6" y="7" width="12" height="4" rx="1" />
    </S>
  ),
  centerV: (p) => (
    <S {...p}>
      <path d="M3 12h18" strokeDasharray="2 2.5" />
      <rect x="7" y="6" width="4" height="12" rx="1" />
    </S>
  ),
  arrowUp: (p) => (
    <S {...p}>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </S>
  ),
  arrowDown: (p) => (
    <S {...p}>
      <path d="M12 5v14M6 13l6 6 6-6" />
    </S>
  ),
  front: (p) => (
    <S {...p}>
      <rect x="3" y="3" width="12" height="12" rx="2" opacity=".45" />
      <rect x="9" y="9" width="12" height="12" rx="2" />
    </S>
  ),
  back: (p) => (
    <S {...p}>
      <rect x="9" y="9" width="12" height="12" rx="2" opacity=".45" />
      <rect x="3" y="3" width="12" height="12" rx="2" />
    </S>
  ),
  warning: (p) => (
    <S {...p}>
      <path d="M12 4 2.5 20h19L12 4Z" />
      <path d="M12 10v4.5M12 17.4h.01" />
    </S>
  ),
  external: (p) => (
    <S {...p}>
      <path d="M14 4h6v6M20 4l-8 8" />
      <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </S>
  ),
  paint: (p) => (
    <S {...p}>
      <path d="M12 3a9 9 0 0 0 0 18c1.4 0 2-1 2-2 0-1.4-1.3-1.6-1.3-3 0-1 .8-1.6 2-1.6H17a4 4 0 0 0 4-4c0-4.4-4-7.4-9-7.4Z" />
      <path d="M7.5 10.5h.01M10 7.5h.01M14 7h.01M17 9.5h.01" />
    </S>
  ),
  textCase: (p) => (
    <S {...p}>
      <path d="M3 18 7.5 6l4.5 12M4.5 14h6M14 18l3.5-9 3.5 9M15.2 15h4.6" />
    </S>
  ),
  curve: (p) => (
    <S {...p}>
      <path d="M3 18c6 0 6-12 12-12 2.5 0 4 1.5 4 3.5" />
      <circle cx="3" cy="18" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="19" cy="9.5" r="1.4" fill="currentColor" stroke="none" />
    </S>
  ),
  drag: (p) => (
    <S {...p}>
      <circle cx="9" cy="6" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="15" cy="6" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="9" cy="18" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="15" cy="18" r="1.3" fill="currentColor" stroke="none" />
    </S>
  ),
  keyboard: (p) => (
    <S {...p}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" />
    </S>
  ),
  file: (p) => (
    <S {...p}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5" />
    </S>
  ),
  info: (p) => (
    <S {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </S>
  ),
  lightbulb: (p) => (
    <S {...p}>
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5.9 1.2.9 2h5.2c0-.8.3-1.5.9-2A6 6 0 0 0 12 3Z" />
    </S>
  ),
  cursor: (p) => (
    <S {...p}>
      <path d="m5 3 14 7-5.5 1.5L11 17 5 3Z" />
    </S>
  ),
  cropRotate: (p) => (
    <S {...p}>
      <path d="M6 2v14a2 2 0 0 0 2 2h14" />
      <path d="M18 22V8a2 2 0 0 0-2-2H2" />
      <path d="M15 5.5 18 8l-3 2.5" opacity=".8" />
    </S>
  ),
};

export default function Icon({ name, size = 18, ...rest }) {
  const render = icons[name] || icons.info;
  return render({ size, ...rest });
}
