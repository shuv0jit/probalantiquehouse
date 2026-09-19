import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useEscape, useFocusTrap, useScrollLock } from '../lib/hooks.js';

export function Modal({ open, onClose, title, children, footer, wide }) {
  const ref = useRef(null);
  useScrollLock(open);
  useEscape(onClose, open);
  useFocusTrap(ref, open);
  if (!open) return null;
  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-scrim" onClick={onClose} />
      <div className={`modal${wide ? ' modal--wide' : ''}`} ref={ref}>
        <div className="modal__head">
          <h2 className="display">{title}</h2>
          <button className="modal__x" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>
  );
}

/**
 * Two-step confirmation. `danger` renders the permanent-delete styling and
 * requires the second click, which is what protects irreversible operations.
 */
export function Confirm({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger, busy }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`} onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <div className={`warn${danger ? ' warn--danger' : ''}`}>
        <AlertTriangle size={17} style={{ flex: 'none', marginTop: 1 }} />
        <div>{message}</div>
      </div>
    </Modal>
  );
}

export function Field({ label, hint, children, id }) {
  return (
    <div className="field">
      {label && <label htmlFor={id}>{label}</label>}
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function FormError({ message }) {
  if (!message) return null;
  return (
    <div className="form-error" role="alert">
      <AlertTriangle size={15} style={{ flex: 'none', marginTop: 1 }} />
      <span>{message}</span>
    </div>
  );
}

/** Flat <option> list with indentation that shows the hierarchy. */
export function CollectionSelect({ collections, value, onChange, allowRoot, id, excludeIds = [] }) {
  const byId = new Map(collections.map((c) => [c.id, c]));
  const depth = (c) => {
    let d = 0;
    let cur = c;
    while (cur?.parentId) { d += 1; cur = byId.get(cur.parentId); }
    return d;
  };
  const ordered = [];
  const walk = (parentId) => {
    collections
      .filter((c) => (c.parentId ?? null) === parentId && !c.deleted && !excludeIds.includes(c.id))
      .forEach((c) => { ordered.push(c); walk(c.id); });
  };
  walk(null);

  return (
    <select className="select" id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}>
      {allowRoot && <option value="">— Top level —</option>}
      {!allowRoot && <option value="">Choose a collection…</option>}
      {ordered.map((c) => (
        <option key={c.id} value={c.id}>
          {'\u00A0\u00A0'.repeat(depth(c))}{depth(c) ? '└ ' : ''}{c.name}
        </option>
      ))}
    </select>
  );
}

export function SalePill({ status }) {
  const label = { live: 'Live', upcoming: 'Upcoming', expired: 'Expired', inactive: 'Paused' }[status];
  return (
    <span className={`pill pill--${status}`}>
      <span className="pill__dot" /> {label}
    </span>
  );
}

/** Debounced text input used by the admin search boxes. */
export function useDelayed(value, ms = 260) {
  const [out, setOut] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setOut(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return out;
}
