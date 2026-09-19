import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CornerDownLeft, FolderOpen, Hash, Search, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { useDebounced, useEscape, useFocusTrap, useScrollLock } from '../lib/hooks.js';
import { money } from '../lib/format.js';

/**
 * Search: debounced, case-insensitive, partial-match, keyboard driven.
 * Results are grouped — collections first (they answer "where do I browse?"),
 * then products (they answer "I know the number"). Arrow keys move a cursor
 * across the flattened list; Enter opens whatever the cursor is on.
 */
export default function SearchOverlay({ open, onClose, onPickCollection }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState({ collections: [], products: [] });
  const [busy, setBusy] = useState(false);
  const [cursor, setCursor] = useState(0);
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const debounced = useDebounced(q, 200);

  useScrollLock(open);
  useEscape(onClose, open);
  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (open) {
      setQ('');
      setResults({ collections: [], products: [] });
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const term = debounced.trim();
    if (!term) {
      setResults({ collections: [], products: [] });
      setBusy(false);
      return;
    }
    const controller = new AbortController();
    setBusy(true);
    api
      .get(`/search?q=${encodeURIComponent(term)}`, { signal: controller.signal })
      .then((data) => {
        setResults({ collections: data.collections, products: data.products });
        setCursor(0);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setResults({ collections: [], products: [] });
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
      <div className="search" ref={panelRef}>
        <div className="search__bar">
          <Search size={18} style={{ color: 'var(--ink-3)', flex: 'none' }} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search a collection or a 6-digit piece number…"
            aria-label="Search collections and products"
            autoComplete="off"
            inputMode="search"
          />
          {busy && <div className="spinner" style={{ width: 15, height: 15 }} aria-hidden="true" />}
          <button className="search__esc" onClick={onClose} aria-label="Close search">ESC</button>
        </div>

        <div className="search__body">
          {!term && (
            <div className="search__empty">
              Try <strong>necklace</strong>, <strong>jhumka</strong>, or a piece number like <strong>101245</strong>.
            </div>
          )}

          {term && !busy && flat.length === 0 && (
            <div className="search__empty">
              Nothing matched “{term}”. Try a shorter word or a different spelling.
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
