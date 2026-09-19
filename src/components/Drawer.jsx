import { useCallback, useRef, useState } from 'react';
import { ChevronsLeft, X } from 'lucide-react';
import { useEscape, useFocusTrap, useScrollLock } from '../lib/hooks.js';
import { useSwipe } from '../lib/useSwipe.js';

/**
 * Left drawer that follows your finger. Dragging past a third of its width
 * (or a quick flick) closes it; anything less springs back.
 */
export default function Drawer({ open, onClose, title, children }) {
  const panelRef = useRef(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  useScrollLock(open);
  useEscape(onClose, open);
  useFocusTrap(panelRef, open);

  const onDrag = useCallback((dx) => {
    if (dx > 0) return; // only drags toward the closed direction
    setDragging(true);
    setOffset(dx);
  }, []);

  const onEnd = useCallback((dx) => {
    setDragging(false);
    const width = panelRef.current?.offsetWidth || 320;
    if (dx < -width / 3) onClose();
    setOffset(0);
  }, [onClose]);

  useSwipe(panelRef, { onSwipeLeft: onClose, onDrag, onEnd, enabled: open, threshold: 60 });

  if (!open) return null;

  return (
    <>
      <div className="scrim" onClick={onClose} aria-hidden="true" />
      <aside
        ref={panelRef}
        className={`drawer${dragging ? '' : ' drawer--anim'}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          transform: offset ? `translate3d(${offset}px,0,0)` : undefined,
          transition: dragging ? 'none' : undefined,
        }}
      >
        <div className="drawer__grip" aria-hidden="true" />
        <div className="drawer__head">
          <span className="drawer__title display">{title}</span>
          <button className="drawer__close" onClick={onClose} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <div className="drawer__body">{children}</div>
        <div className="drawer__hint">
          <ChevronsLeft size={13} /> Swipe left to close
        </div>
      </aside>
    </>
  );
}
