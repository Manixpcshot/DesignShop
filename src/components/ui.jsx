// Small, dependency-free UI primitives shared by every panel and dialog.
import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { COLOR_SWATCHES } from '../lib/presets.js';

export function Button({ children, variant = '', size = '', className = '', icon, ...rest }) {
  return (
    <button className={`btn ${variant ? `btn-${variant}` : ''} ${size === 'sm' ? 'btn-sm' : ''} ${className}`} {...rest}>
      {icon ? <Icon name={icon} size={size === 'sm' ? 14 : 15} /> : null}
      {children}
    </button>
  );
}

export function IconButton({ icon, title, active, size = 16, className = '', ...rest }) {
  return (
    <button
      className={`icon-btn ${active ? 'active' : ''} ${className}`}
      title={title}
      aria-label={title}
      {...rest}
    >
      <Icon name={icon} size={size} />
    </button>
  );
}

export function Switch({ checked, onChange, title }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={title}
      title={title}
      className={`switch ${checked ? 'on' : ''}`}
      onClick={() => onChange?.(!checked)}
    />
  );
}

export function Slider({ label, value, min = 0, max = 100, step = 1, onChange, suffix = '', format }) {
  const pct = ((value - min) / (max - min)) * 100;
  const shown = format ? format(value) : value;
  return (
    <div className="slider-row">
      <div className="labels">
        <span>{label}</span>
        <b>
          {shown}
          {suffix}
        </b>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ '--fill': `${Math.max(0, Math.min(100, pct))}%` }}
        onChange={(e) => onChange?.(Number(e.target.value))}
      />
    </div>
  );
}

export function NumberField({ label, value, onChange, min, max, step = 1, suffix }) {
  return (
    <div className="num-field">
      {label ? <label>{label}</label> : null}
      <input
        type="number"
        value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onChange?.(v);
        }}
      />
      {suffix ? <span className="mute-2">{suffix}</span> : null}
    </div>
  );
}

export function ColorPicker({ value = '#ffffff', onChange, label, swatches = true }) {
  const safe = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : '#ffffff';
  return (
    <div className="field">
      {label ? <label>{label}</label> : null}
      <div className="row">
        <div className="color-input">
          <input type="color" value={safe} onChange={(e) => onChange?.(e.target.value)} aria-label={label || 'color'} />
          <span className="hex">{safe}</span>
        </div>
      </div>
      {swatches ? (
        <div className="swatches" style={{ marginTop: 4 }}>
          {COLOR_SWATCHES.slice(0, 16).map((c) => (
            <button
              key={c}
              className={`swatch ${c.toLowerCase() === safe.toLowerCase() ? 'active' : ''}`}
              style={{ background: c }}
              title={c}
              onClick={() => onChange?.(c)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Select({ label, value, options, onChange, className = '' }) {
  return (
    <div className="field">
      {label ? <label>{label}</label> : null}
      <select value={value} onChange={(e) => onChange?.(e.target.value)} className={className}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Check({ label, hint, checked, onChange }) {
  return (
    <div className="check-row">
      <div className="grow">
        <b>{label}</b>
        {hint ? <span>{hint}</span> : null}
      </div>
      <Switch checked={checked} onChange={onChange} title={label} />
    </div>
  );
}

export function Section({ title, sub, right, children }) {
  return (
    <section className="panel-section">
      {title ? (
        <h4>
          <span>{title}</span>
          {right}
        </h4>
      ) : null}
      {sub ? <p className="panel-sub">{sub}</p> : null}
      {children}
    </section>
  );
}

export function Menu({ label, items, openKey, setOpenKey, align = 'start' }) {
  const key = `menu:${label}`;
  const open = openKey === key;
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpenKey(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, setOpenKey]);

  let idx = 0;
  return (
    <div className="menu-root" ref={ref}>
      <button
        className={`menu-btn ${open ? 'open' : ''}`}
        onClick={() => setOpenKey(open ? null : key)}
        onMouseEnter={() => openKey && setOpenKey(key)}
      >
        {label}
      </button>
      {open ? (
        <div className="menu-pop" style={align === 'end' ? { insetInlineStart: 'auto', insetInlineEnd: 0 } : undefined}>
          {items.map((item) => {
            idx += 1;
            if (item.sep) return <div className="menu-sep" key={`s${idx}`} />;
            if (item.header)
              return (
                <div key={`h${idx}`} className="mute-2" style={{ padding: '5px 9px 2px', fontWeight: 700 }}>
                  {item.header}
                </div>
              );
            return (
              <button
                key={item.id || `${item.label}-${idx}`}
                className={`menu-item ${item.danger ? 'danger' : ''}`}
                disabled={item.disabled}
                onClick={() => {
                  setOpenKey(null);
                  item.onClick?.();
                }}
              >
                {item.icon ? <Icon name={item.icon} size={15} /> : null}
                <span className="grow ellipsis" style={{ textAlign: 'start' }}>
                  {item.label}
                </span>
                {item.checked ? <Icon name="check" size={14} /> : null}
                {item.kbd ? <span className="kbd">{item.kbd}</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function Dialog({ title, sub, children, footer, onClose, size = 'md', icon }) {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`dialog ${size}`} ref={ref} role="dialog" aria-modal="true" aria-label={title}>
        <div className="dialog-head">
          {icon ? (
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                display: 'grid',
                placeItems: 'center',
                background: 'color-mix(in srgb, var(--accent) 18%, transparent)',
                color: 'var(--accent)',
                flex: 'none',
              }}
            >
              <Icon name={icon} size={18} />
            </div>
          ) : null}
          <div className="grow">
            <h2>{title}</h2>
            {sub ? <p>{sub}</p> : null}
          </div>
          <IconButton icon="close" title="Close" onClick={onClose} />
        </div>
        <div className="dialog-body">{children}</div>
        {footer ? <div className="dialog-foot">{footer}</div> : null}
      </div>
    </div>
  );
}

export function Toggle({ options, value, onChange }) {
  return (
    <div className="row" style={{ gap: 4 }}>
      {options.map((o) => (
        <button
          key={o.value}
          className={`chip ${value === o.value ? 'active' : ''}`}
          onClick={() => onChange?.(o.value)}
          title={o.title}
        >
          {o.icon ? <Icon name={o.icon} size={13} /> : null}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function useDebouncedCallback(fn, delay = 220) {
  const timer = useRef(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  return (...args) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fnRef.current(...args), delay);
  };
}

export function TextInput({ value, onChange, ...rest }) {
  const [local, setLocal] = useState(value ?? '');
  useEffect(() => setLocal(value ?? ''), [value]);
  return (
    <input
      type="text"
      value={local}
      onChange={(e) => {
        setLocal(e.target.value);
        onChange?.(e.target.value);
      }}
      {...rest}
    />
  );
}
