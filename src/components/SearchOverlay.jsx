import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CornerDownLeft, FolderOpen, Hash, Search, Sparkles, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { useDebounced, useEscape, useFocusTrap, useScrollLock } from '../lib/hooks.js';
import { money } from '../lib/format.js';
import { useSwipe } from '../lib/useSwipe.js';

/**
 * Search overlay. Desktop: a centered floating panel (unchanged in spirit).
 * Mobile: a bottom sheet — slides up from the edge, has a drag handle, and
 * can be swiped down to close, which reads as native rather than a popup.
 * Also surfaces the server's synonym expansion ("also searching: ...") so
 * Bangla/Banglish matches don't feel invisible.
 */
export default function SearchOverlay({ open, onClose, onPickCollection }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState({ collections: [], products: [], expanded: [] });
  const [busy, setBusy] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const debounced = useDebounced(q, 200);

  useScrollLock(open);
  useEscape(onClose, open);
  useFocusTrap(panelRef, open);

  useSwipe(panelRef, {
    enabled: open,
    onDrag: (dy, dx) => {
      // Only respond to a downward drag that starts near the handle area —
      // useSwipe reports horizontal dx; we read vertical via onDrag's second
      // value when the hook supports it, otherwise this is a no-op on desktop.
    },
  });

  // Manual vertical drag (useSwipe is horizontal-first); simple + reliable for a sheet.
  const dragState = useRef({ startY: 0, active: false });
  const onHandlePointerDown = (e) => {
    dragState.current = { startY: e.clientY, active: true };
    setDragging(true);
  };
  useEffect(() => {
    const move = (e) => {
      if (!dragState.current.active) return;
      const dy = e.clientY - dragState.current.startY;
      if (dy > 0) setDragY(dy);
    };
    const up = () => {
      if (!dragState.current.active) return;
      dragState.current.active = false;
      setDragging(false);
      if (dragY > 90) onClose();
      setDragY(0);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [dragY, onClose]);

  useEffect(() => {
    if (open) {
      setQ('');
      setResults({ collections: [], products: [], expanded: [] });
      setCursor(0);
      setDragY(0);
      setTimeout(() => inputRef.current?.focus(), open && window.innerWidth > 640 ? 40 : 260);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const term = debounced.trim();
    if (!term) {
      setResults({ collections: [], products: [], expanded: [] });
      setBusy(false);
      return;
    }
    const controller = new AbortController();
    setBusy(true);
    api
      .get(`/search?q=${encodeURIComponent(term)}`, { signal: controller.signal })
      .then((data) => {
        setResults({ collections: data.collections, products: data.products, expanded: data.expanded || [] });
        setCursor(0);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setResults({ collections: [], products: [], expanded: [] });
      })
      .finally(() => setBusy(false));
    return () => controller.abort();
  }, [debounced, open]);

  const flat = useMemo(
    () => [
      ...results.collections.map((c) => ({ kind: 'collection', item: c })),
      ...results.products.map((p) => ({ kind: 'product', item: p })),
    ],
    [results]
  );

  const choose = (entry) => {
    if (!entry) return;
    if (entry.kind === 'collection') onPickCollection(entry.item.id);
    else navigate(`/product/${entry.item.code}`);
    onClose();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, flat.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(flat[cursor]); }
  };

  if (!open) return null;
  const term = q.trim();

  return (
    <div className="search-wrap" role="dialog" aria-modal="true" aria-label="Search">
      <div className="search-scrim" onClick={onClose} />
      <div
        className="search"
        ref={panelRef}
        style={dragY ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined}
      >
        <div
          className="search__handle"
          onPointerDown={onHandlePointerDown}
          aria-hidden="true"
        >
          <span />
        </div>

        <div className="search__bar">
          <Search size={18} style={{ color: 'var(--ink-3)', flex: 'none' }} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search jhumka, kaner dul, or a piece number…"
            aria-label="Search collections and products"
            autoComplete="off"
            inputMode="search"
          />
          {busy && <div className="spinner" style={{ width: 15, height: 15 }} aria-hidden="true" />}
          <button className="search__esc" onClick={onClose} aria-label="Close search">
            <X size={15} />
          </button>
        </div>

        {results.expanded.length > 0 && (
          <div className="search__expanded">
            <Sparkles size={12} />
            <span>also matching: {results.expanded.slice(0, 5).join(', ')}</span>
          </div>
        )}

        <div className="search__body">
          {!term && (
            <div className="search__empty">
              Try <strong>jhumka</strong>, <strong>ঝুমকা</strong>, <strong>kaner dul</strong>, or a piece number like <strong>101245</strong>.
            </div>
          )}

          {term && !busy && flat.length === 0 && (
            <div className="search__empty">
              Nothing matched "{term}". Try a shorter word, English, or Bangla spelling.
            </div>
          )}

          {results.collections.length > 0 && (
            <>
              <div className="search__group eyebrow">Collections</div>
              {results.collections.map((c, i) => (
                <button
                  key={`c${c.id}`}
                  className={`search__res${cursor === i ? ' is-cursor' : ''}`}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => choose({ kind: 'collection', item: c })}
                >
                  <span className="search__ico"><FolderOpen size={17} /></span>
                  <span className="search__main">
                    <span className="search__name">{c.name}</span>
                    <span className="search__sub">{c.trail.join('  ›  ')}</span>
                  </span>
                  <CornerDownLeft size={13} style={{ color: 'var(--ink-4)', flex: 'none' }} />
                </button>
              ))}
            </>
          )}

          {results.products.length > 0 && (
            <>
              <div className="search__group eyebrow">Pieces</div>
              {results.products.map((p, i) => {
                const idx = results.collections.length + i;
                return (
                  <button
                    key={`p${p.id}`}
                    className={`search__res${cursor === idx ? ' is-cursor' : ''}`}
                    onMouseEnter={() => setCursor(idx)}
                    onClick={() => choose({ kind: 'product', item: p })}
                  >
                    {p.images[0] ? (
                      <img className="search__thumb" src={p.images[0].url} alt="" loading="lazy" />
                    ) : (
                      <span className="search__ico"><Hash size={17} /></span>
                    )}
                    <span className="search__main">
                      <span className="search__name">No. {p.code}</span>
                      <span className="search__sub">
                        {p.path.map((x) => x.name).join('  ›  ')}
                        {p.price.final != null ? `  ·  ${money(p.price.final)}` : ''}
                      </span>
                    </span>
                    <CornerDownLeft size={13} style={{ color: 'var(--ink-4)', flex: 'none' }} />
                  </button>
                );
              })}
            </>
          )}
        </div>

        <div className="search__foot">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}