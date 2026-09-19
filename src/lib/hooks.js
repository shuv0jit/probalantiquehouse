import { useCallback, useEffect, useRef, useState } from 'react';

/** Debounce any value (search input, filters). */
export function useDebounced(value, delay = 220) {
  const [out, setOut] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setOut(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return out;
}

/** Add `.is-in` to `.reveal` elements as they scroll into view. */
export function useReveal(deps = []) {
  useEffect(() => {
    const nodes = document.querySelectorAll('.reveal:not(.is-in)');
    if (!nodes.length) return;
    if (!('IntersectionObserver' in window)) {
      nodes.forEach((n) => n.classList.add('is-in'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.04 }
    );

    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Lock body scroll while a drawer/modal is open. */
export function useScrollLock(active) {
  useEffect(() => {
    if (!active) return;

    const y = window.scrollY;

    document.body.classList.add('is-locked');
    document.body.style.top = `-${y}px`;
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';

    return () => {
      document.body.classList.remove('is-locked');
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, y);
    };
  }, [active]);
}

/** Escape key handler. */
export function useEscape(handler, active = true) {
  useEffect(() => {
    if (!active) return;

    const fn = (e) => {
      if (e.key === 'Escape') handler();
    };

    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [handler, active]);
}

/** Trap focus inside a container (modals, drawers, search). */
export function useFocusTrap(ref, active = true) {
  useEffect(() => {
    if (!active || !ref.current) return;

    const root = ref.current;
    const previous = document.activeElement;

    const sel =
      'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])';

    const first = root.querySelector(sel);
    first?.focus();

    const onKey = (e) => {
      if (e.key !== 'Tab') return;

      const items = [...root.querySelectorAll(sel)].filter(
        (n) => n.offsetParent !== null
      );

      if (!items.length) return;

      const idx = items.indexOf(document.activeElement);

      if (e.shiftKey && idx <= 0) {
        e.preventDefault();
        items[items.length - 1].focus();
      } else if (!e.shiftKey && idx === items.length - 1) {
        e.preventDefault();
        items[0].focus();
      }
    };

    root.addEventListener('keydown', onKey);

    return () => {
      root.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [ref, active]);
}

/**
 * localStorage-backed state.
 * Every hook instance for the same key stays in sync.
 */
const LOCAL_EVENT = 'pah:local-change';

export function useLocal(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    const reread = () => {
      try {
        const raw = localStorage.getItem(key);
        setValue(raw ? JSON.parse(raw) : initial);
      } catch {
        /* ignore malformed entries */
      }
    };

    const onCustom = (e) => {
      if (e.detail === key) reread();
    };

    const onStorage = (e) => {
      if (e.key === key) reread();
    };

    window.addEventListener(LOCAL_EVENT, onCustom);
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener(LOCAL_EVENT, onCustom);
      window.removeEventListener('storage', onStorage);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = useCallback(
    (next) => {
      setValue((prev) => {
        const v = typeof next === 'function' ? next(prev) : next;

        try {
          localStorage.setItem(key, JSON.stringify(v));

          window.dispatchEvent(
            new CustomEvent(LOCAL_EVENT, {
              detail: key,
            })
          );
        } catch {
          /* quota exceeded or private mode */
        }

        return v;
      });
    },
    [key]
  );

  return [value, set];
}

/** Track whether we are on a narrow viewport. */
export function useMedia(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia(query).matches
      : false
  );

  useEffect(() => {
    const mq = window.matchMedia(query);

    const fn = (e) => setMatches(e.matches);

    mq.addEventListener('change', fn);
    setMatches(mq.matches);

    return () => mq.removeEventListener('change', fn);
  }, [query]);

  return matches;
}

/** Latest-only async runner. */
export function useLatest() {
  const token = useRef(0);

  return useCallback(() => {
    const mine = ++token.current;
    return () => mine === token.current;
  }, []);
}

/**
 * Edge swipe gesture.
 *
 * Starts when the user touches near the left edge of the screen,
 * then swipes right to open the collections drawer.
 *
 * Usage:
 *   useEdgeSwipe(() => setDrawerOpen(true));
 */
export function useEdgeSwipe(onOpen, options = {}) {
  const {
    edgeWidth = 28,
    minDistance = 60,
    maxVerticalDistance = 80,
    enabled = true,
  } = options;

  const startX = useRef(0);
  const startY = useRef(0);
  const tracking = useRef(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const onTouchStart = (e) => {
      if (!e.touches || e.touches.length !== 1) return;

      const touch = e.touches[0];

      // Only begin if the finger starts close to the left edge.
      if (touch.clientX <= edgeWidth) {
        startX.current = touch.clientX;
        startY.current = touch.clientY;
        tracking.current = true;
      }
    };

    const onTouchMove = (e) => {
      if (!tracking.current || !e.touches || e.touches.length !== 1) {
        return;
      }

      const touch = e.touches[0];

      const dx = touch.clientX - startX.current;
      const dy = Math.abs(touch.clientY - startY.current);

      // Stop tracking if movement is primarily vertical.
      if (dy > maxVerticalDistance && dy > Math.abs(dx)) {
        tracking.current = false;
      }
    };

    const onTouchEnd = (e) => {
      if (!tracking.current) return;

      tracking.current = false;

      const touch = e.changedTouches?.[0];
      if (!touch) return;

      const dx = touch.clientX - startX.current;
      const dy = Math.abs(touch.clientY - startY.current);

      if (dx >= minDistance && dy <= maxVerticalDistance) {
        onOpen?.();
      }
    };

    const onTouchCancel = () => {
      tracking.current = false;
    };

    window.addEventListener('touchstart', onTouchStart, {
      passive: true,
    });

    window.addEventListener('touchmove', onTouchMove, {
      passive: true,
    });

    window.addEventListener('touchend', onTouchEnd, {
      passive: true,
    });

    window.addEventListener('touchcancel', onTouchCancel, {
      passive: true,
    });

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [
    onOpen,
    edgeWidth,
    minDistance,
    maxVerticalDistance,
    enabled,
  ]);
}