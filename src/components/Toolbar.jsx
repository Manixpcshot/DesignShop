// Left tool rail with grouped, tooltipped tools.
import React from 'react';
import Icon from './Icon.jsx';
import { useEditor, setTool, useT } from '../lib/store.js';

export const TOOL_GROUPS = [
  [
    { id: 'move', icon: 'move', key: 'V' },
    { id: 'hand', icon: 'hand', key: 'H' },
    { id: 'zoom', icon: 'zoom', key: 'Z' },
  ],
  [
    { id: 'marquee', icon: 'marquee', key: 'M' },
    { id: 'lasso', icon: 'lasso', key: 'L' },
    { id: 'wand', icon: 'wand', key: 'W' },
    { id: 'crop', icon: 'crop', key: 'C' },
    { id: 'eyedropper', icon: 'eyedropper', key: 'I' },
  ],
  [
    { id: 'brush', icon: 'brush', key: 'B' },
    { id: 'eraser', icon: 'eraser', key: 'E' },
    { id: 'fill', icon: 'fill', key: 'G' },
    { id: 'gradient', icon: 'gradient', key: 'G' },
  ],
  [
    { id: 'text', icon: 'text', key: 'T' },
    { id: 'rect', icon: 'rect', key: 'U' },
    { id: 'ellipse', icon: 'ellipse', key: 'U' },
    { id: 'line', icon: 'line', key: 'U' },
    { id: 'arrow', icon: 'arrow', key: 'U' },
    { id: 'star', icon: 'star', key: 'U' },
    { id: 'heart', icon: 'heart', key: 'U' },
    { id: 'polygon', icon: 'polygon', key: 'U' },
    { id: 'frame', icon: 'frame', key: 'U' },
    { id: 'sticker', icon: 'smile', key: 'Y' },
  ],
];

export default function Toolbar() {
  const tool = useEditor((s) => s.activeTool);
  const t = useT();
  return (
    <aside className="toolbar" aria-label={t('ws.tools')}>
      {TOOL_GROUPS.map((group, gi) => (
        <React.Fragment key={gi}>
          {gi > 0 ? <div className="tool-sep" /> : null}
          {group.map((item) => (
            <button
              key={item.id}
              className={`tool-btn ${tool === item.id ? 'active' : ''}`}
              onClick={() => setTool(item.id)}
              aria-label={t(`tool.${item.id}`)}
              aria-pressed={tool === item.id}
            >
              <Icon name={item.icon} size={19} />
              <span className="corner">{item.key}</span>
              <span className="tool-tt">
                {t(`tool.${item.id}`)}
                <span className="kbd">{item.key}</span>
              </span>
            </button>
          ))}
        </React.Fragment>
      ))}
    </aside>
  );
}
