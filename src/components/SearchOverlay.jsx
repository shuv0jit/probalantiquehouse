import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, FolderOpen, Hash, Search, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { useDebounced, useEscape, useFocusTrap, useScrollLock } from '../lib/hooks.js';
import { money } from '../lib/format.js';

const KEY = 'probal_recent_searches';
const EMPTY = { collections: [], products: [], expanded: [], suggestion: null };

const loadRecent = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
};
const storeRecent = (list) => {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore */ }
};

export default function SearchOverlay({ open, onClose, onPickCollection }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [recent, setRecent] = useState(loadRecent);
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const debounced = useDebounced(q, 140);
  const term = q.trim();
  const isSearching = busy || term !== debounced.trim();

  useScrollLock(open);
  useEscape(onClose, open);
  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (open) {
      setQ('');
      setResults(EMPTY);
      setCursor(0);
      setRecent(loadRecent());
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = debounced.trim();
    if (!t) { setResults(EMPTY); setBusy(false); return; }
    const controller = new AbortController();
    setBusy(true);
    api
      .get(`/search?q=${encodeURIComponent(t)}`, { signal: controller.signal })
      .then((data) => {
        setResults({
          collections: data.collections,
          products: data.products,
          expanded: data.expanded || [],
          suggestion: data.suggestion || null,
        });
        setCursor(0);
      })
      .catch((err) => { if (err.name !== 'AbortError') setResults(EMPTY); })
      .finally(() => setBusy(false));
    return () => controller.abort();
  }, [debounced, open]);

  const addRecent = (t) => {
    const v = t.trim();
    if (!v) return;
    const next = [v, ...recent.filter((x) => x.toLowerCase() !== v.toLowerCase())].slice(0, 8);
    setRecent(next);
    storeRecent(next);
  };

  const removeRecent = (t) => {
    const next = recent.filter((x) => x !== t);
    setRecent(next);
    storeRecent(next);
  };

  const flat = useMemo(() => {
    if (!term) return recent.map((t) => ({ kind: 'recent', item: t }));
    return [
      ...results.collections.map((c) => ({ kind: 'collection', item: c })),
      ...results.products.map((p) => ({ kind: 'product', item: p })),
    ];
  }, [term, recent, results]);

  useEffect(() => {
    panelRef.current?.querySelector(`[data-idx="${cursor}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const choose = (entry) => {
    if (!entry) return;
    if (entry.kind === 'recent') { setQ(entry.item); inputRef.current?.focus(); return; }
    addRecent(term);
    if (entry.kind === 'collection') onPickCollection(entry.item.id);
    else navigate(`/product/${entry.item.code}`);
    onClose();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, flat.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (flat[cursor]) choose(flat[cursor]);
      else addRecent(term);
    }
  };

  if (!open) return null;

  const cN = term ? results.collections.length : 0;
  const pN = term ? results.products.length : 0;
  const noResults = term && !isSearching && cN + pN === 0;

  return (
    <div className="search-wrap" role="dialog" aria-modal="true" aria-label="Search">
      <div className="search-scrim" onClick={onClose} />
      <div className="search" ref={panelRef}>
        <div className="search__bar">
          <div className="search__field">
            <Search size={19} className="search__bar-ico" />
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
            {busy && <div className="spinner" style={{ width: 16, height: 16 }} aria-hidden="true" />}
            {q && (
              <button className="search__clear" onClick={() => { setQ(''); inputRef.current?.focus(); }} aria-label="Clear">
                <X size={15} />
              </button>
            )}
          </div>
          <button className="search__close" onClick={onClose}>Cancel</button>
        </div>

        <div className="search__body">
          {/* Recent searches */}
          {!term && recent.length > 0 && (
            <div className="sx-list">
              <div className="sx-title">Recent searches</div>
              {recent.map((t, i) => (
                <div
                  key={`r${t}`}
                  data-idx={i}
                  className={`sx-box${cursor === i ? ' is-cursor' : ''}`}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => choose({ kind: 'recent', item: t })}
                >
                  <span className="sx-box__lead"><Clock size={18} /></span>
                  <span className="sx-box__text">{t}</span>
                  <button
                    className="sx-box__x"
                    onClick={(e) => { e.stopPropagation(); removeRecent(t); }}
                    aria-label={`Remove ${t}`}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {!term && recent.length === 0 && (
            <div className="search__empty">Your recent searches will show up here.</div>
          )}

          {/* Collections first */}
          {term && cN > 0 && (
            <div className="sx-list">
              <div className="sx-title">Collections</div>
              {results.collections.map((c, i) => (
                <div
                  key={`c${c.id}`}
                  data-idx={i}
                  className={`sx-box sx-box--coll${cursor === i ? ' is-cursor' : ''}`}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => choose({ kind: 'collection', item: c })}
                >
                  <span className="sx-thumb">
                    {c.image ? <img src={c.image} alt="" loading="lazy" /> : <FolderOpen size={20} />}
                  </span>
                  <span className="sx-box__text sx-box__text--col">
                    <span className="sx-coll__name">{c.name}</span>
                    <span className="sx-coll__trail">{c.trail.join('  ›  ')}</span>
                  </span>
                  <span className="sx-coll__chip">Shop</span>
                </div>
              ))}
            </div>
          )}

          {/* Pieces */}
          {term && pN > 0 && (
            <div className="sx-list">
              <div className="sx-title">Pieces</div>
              <div className="sx-grid">
                {results.products.map((p, i) => {
                  const idx = cN + i;
                  const last = p.path[p.path.length - 1]?.name;
                  return (
                    <button
                      key={`p${p.id}`}
                      data-idx={idx}
                      className={`sx-card${cursor === idx ? ' is-cursor' : ''}`}
                      onMouseEnter={() => setCursor(idx)}
                      onClick={() => choose({ kind: 'product', item: p })}
                    >
                      <span className="sx-card__img">
                        {p.images[0] ? <img src={p.images[0].url} alt="" loading="lazy" /> : <Hash size={22} />}
                      </span>
                      <span className="sx-card__body">
                        <span className="sx-card__name">No. {p.code}</span>
                        {last && <span className="sx-card__cat">{last}</span>}
                        {p.price.final != null && <span className="sx-card__price">{money(p.price.final)}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {term && isSearching && cN + pN === 0 && (
            <div className="search__empty">
              <div className="spinner" aria-hidden="true" />
              <span>Searching…</span>
            </div>
          )}

          {noResults && (
            <div className="search__empty">
              <span>
                Nothing matched "{term}".
                {results.suggestion && (
                  <>
                    {' '}Did you mean{' '}
                    <button className="search__suggest" onClick={() => setQ(results.suggestion)}>
                      {results.suggestion}
                    </button>
                    ?
                  </>
                )}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}