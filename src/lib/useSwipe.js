import { useEffect, useRef } from 'react';

/**
 * Pointer-based horizontal swipe. Used by the mobile drawer (swipe to close,
 * edge-swipe to open) and the product gallery (swipe between images).
 * Vertical intent is detected first so page scrolling is never hijacked.
 */
export function useSwipe(ref, { onSwipeLeft, onSwipeRight, onDrag, onEnd, threshold = 52, enabled = true } = {}) {
  const state = useRef({ x: 0, y: 0, dx: 0, active: false, axis: null });

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    const down = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      state.current = { x: e.clientX, y: e.clientY, dx: 0, active: true, axis: null };
    };

    const move = (e) => {
      const s = state.current;
      if (!s.active) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (!s.axis) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        s.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      }
      if (s.axis !== 'x') return;
      s.dx = dx;
      onDrag?.(dx);
    };

    const up = () => {
      const s = state.current;
      if (!s.active) return;
      s.active = false;
      if (s.axis === 'x') {
        if (s.dx <= -threshold) onSwipeLeft?.();
        else if (s.dx >= threshold) onSwipeRight?.();
      }
      onEnd?.(s.dx);
      s.dx = 0;
      s.axis = null;
    };

    el.addEventListener('pointerdown', down, { passive: true });
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerup', up, { passive: true });
    window.addEventListener('pointercancel', up, { passive: true });
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [ref, onSwipeLeft, onSwipeRight, onDrag, onEnd, threshold, enabled]);
}

/** Edge swipe from the left of the screen to open the drawer. */
export function useEdgeSwipe(onOpen, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    let startX = null;
    let startY = null;
    const down = (e) => {
      if (e.clientX <= 26) { startX = e.clientX; startY = e.clientY; }
    };
    const move = (e) => {
      if (startX == null) return;
      if (Math.abs(e.clientY - startY) > 42) { startX = null; return; }
      if (e.clientX - startX > 46) { startX = null; onOpen(); }
    };
    const up = () => { startX = null; };
    window.addEventListener('pointerdown', down, { passive: true });
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerup', up, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [onOpen, enabled]);
}
