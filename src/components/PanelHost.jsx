// Right dock: Studio / Text / Adjust / Layers / History.
import React from 'react';
import { useEditor, useT, setPanel } from '../lib/store.js';
import StudioPanel from './panels/StudioPanel.jsx';
import TextPanel from './panels/TextPanel.jsx';
import AdjustPanel from './panels/AdjustPanel.jsx';
import LayersPanel from './panels/LayersPanel.jsx';
import HistoryPanel from './panels/HistoryPanel.jsx';
import FontLibraryPanel from './panels/FontLibraryPanel.jsx';
import Icon from './Icon.jsx';

const TABS = [
  { id: 'studio', labelKey: 'studio.title', shortKey: 'studio.title', icon: 'sparkles' },
  { id: 'text', labelKey: 'text.title', icon: 'type' },
  { id: 'fonts', labelKey: 'font.title', icon: 'paint' },
  { id: 'adjust', labelKey: 'adj.title', icon: 'sliders' },
  { id: 'layers', labelKey: 'layers.title', icon: 'layers' },
  { id: 'history', labelKey: 'history.title', icon: 'history' },
];

export default function PanelHost() {
  const t = useT();
  const panel = useEditor((s) => s.panel);
  return (
    <aside className="panel" aria-label={t('ws.props')}>
      <div className="panel-tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={panel === tab.id}
            className={`panel-tab ${panel === tab.id ? 'active' : ''}`}
            onClick={() => setPanel(tab.id)}
            title={t(tab.labelKey)}
          >
            {t(tab.labelKey).split(' ')[0].replace('&', '')}
          </button>
        ))}
      </div>
      <div className="panel-body">
        {panel === 'studio' ? <StudioPanel /> : null}
        {panel === 'text' ? <TextPanel /> : null}
        {panel === 'fonts' ? <FontLibraryPanel /> : null}
        {panel === 'adjust' ? <AdjustPanel /> : null}
        {panel === 'layers' ? <LayersPanel /> : null}
        {panel === 'history' ? <HistoryPanel /> : null}
      </div>
      <div
        style={{
          borderTop: '1px solid var(--border)',
          padding: '7px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 10.5,
          color: 'var(--text-mute)',
          flex: 'none',
        }}
      >
        <Icon name="lightbulb" size={12} />
        <span className="ellipsis">{t('ws.statusHint', { key: 'Ctrl+/' })}</span>
      </div>
    </aside>
  );
}
