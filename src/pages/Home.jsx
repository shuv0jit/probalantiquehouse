import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, Gem, Heart, PackageOpen, SlidersHorizontal } from 'lucide-react';

import Breadcrumbs from '../components/Breadcrumbs.jsx';
import CollectionTree from '../components/CollectionTree.jsx';
import Drawer from '../components/Drawer.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { GridSkeleton, Spinner } from '../components/Skeleton.jsx';
import { api } from '../lib/api.js';
import { pathTo } from '../lib/format.js';
import { useLatest, useLocal, useMedia, useReveal } from '../lib/hooks.js';
import { useStore, useSyncEffect } from '../lib/store.jsx';

const PAGE_SIZE = 24;

const SORTS = [
  { id: 'newest', label: 'Newest' },
  { id: 'price_asc', label: 'Price ↑' },
  { id: 'price_desc', label: 'Price ↓' },
];

export default function Home({ menuOpen, setMenuOpen }) {
  const { tree, totalProducts, toast } = useStore();
  const [params, setParams] = useSearchParams();
  const isMobile = useMedia('(max-width: 1024px)');

  const collectionId = params.get('c') ? Number(params.get('c')) : null;
  const sort = params.get('sort') || 'newest';
  const savedOnly = params.get('saved') === '1';

  const [pages, setPages] = useState([]);       // array of product arrays, one per loaded page
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(null);

  const [favourites, setFavourites] = useLocal('pah:favourites', []);
  const sentinel = useRef(null);
  const guard = useLatest();

  const trail = useMemo(
    () => (collectionId ? pathTo(tree.byId, collectionId) : []),
    [tree.byId, collectionId]
  );
  const activePath = useMemo(() => trail.map((n) => n.id), [trail]);

  /* ------------------------------------------------------- data load */
  const fetchPage = useCallback(
    async (targetPage, { append }) => {
      const isFresh = guard();
      append ? setLoadingMore(true) : setLoading(true);
      setFailed(null);
      try {
        const qs = new URLSearchParams({ page: String(targetPage), limit: String(PAGE_SIZE), sort });
        if (collectionId) qs.set('collection', String(collectionId));
        const data = await api.get(`/products?${qs}`);
        if (!isFresh()) return; // a newer request already won
        setMeta({ total: data.total, pages: data.pages });
        setPages((prev) => (append ? [...prev, data.products] : [data.products]));
        setPage(targetPage);
      } catch (err) {
        if (!isFresh()) return;
        setFailed(err.message);
        if (append) toast(err.message, 'error');
      } finally {
        if (isFresh()) { setLoading(false); setLoadingMore(false); }
      }
    },
    [collectionId, sort, toast, guard]
  );

  // Reload on filter change AND whenever live sync reports a new revision.
  useSyncEffect(() => { fetchPage(1, { append: false }); }, [collectionId, sort]);

  /* --------------------------------------------- infinite scroll */
  useEffect(() => {
    const node = sentinel.current;
    if (!node || savedOnly) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && !loadingMore && page < meta.pages) {
          fetchPage(page + 1, { append: true });
        }
      },
      { rootMargin: '600px 0px' }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [fetchPage, loading, loadingMore, page, meta.pages, savedOnly]);

  const products = useMemo(() => pages.flat(), [pages]);
  const shown = useMemo(
    () => (savedOnly ? products.filter((p) => favourites.includes(p.code)) : products),
    [products, savedOnly, favourites]
  );

  useReveal([shown.length, savedOnly]);

  /* --------------------------------------------------------- actions */
  const pick = useCallback(
    (id) => {
      const next = new URLSearchParams(params);
      next.delete('saved');
      if (id) next.set('c', String(id));
      else next.delete('c');
      setParams(next, { replace: false });
      setMenuOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [params, setParams, setMenuOpen]
  );

  const setSort = (id) => {
    const next = new URLSearchParams(params);
    next.set('sort', id);
    setParams(next, { replace: true });
  };

  const toggleFavourite = useCallback(
    (code) => {
      setFavourites((list) => (list.includes(code) ? list.filter((c) => c !== code) : [...list, code]));
    },
    [setFavourites]
  );

  const heading = savedOnly ? 'Saved pieces' : trail[trail.length - 1]?.name || 'The full collection';

  const railBody = (
    <CollectionTree
      roots={tree.roots}
      activeId={collectionId}
      activePath={activePath}
      onPick={pick}
      totalProducts={totalProducts}
    />
  );

  return (
    <>
      <div className="shell">
        {!collectionId && !savedOnly && (
          <section className="hero anim-up">
            <span className="hero__deco" aria-hidden="true" />
            <span className="hero__deco hero__deco--2" aria-hidden="true" />
            <span className="eyebrow">Probal Antique House</span>
            <h1 className="display">
              Heirlooms that carry a <em>story</em>, kept in the light.
            </h1>
            <p>
              Browse our showroom the way you would walk it — by collection, in high resolution,
              with every piece numbered. Found something? Note the number and come see it in person.
            </p>
            <div className="hero__cta">
              <a className="btn btn--primary" href="#catalogue">
                Browse the catalogue <ArrowRight size={16} />
              </a>
              <button className="btn btn--ghost" onClick={() => setMenuOpen(true)}>
                <Gem size={15} /> Explore collections
              </button>
            </div>
          </section>
        )}
      </div>

      <div className="page" id="catalogue">
        <aside className="rail" aria-label="Collections">
          <div className="rail__head">
            <span className="eyebrow">Collections</span>
            <span className="rail__total">{totalProducts} pieces</span>
          </div>
          {railBody}
        </aside>

        <main id="main">
          {!savedOnly && <Breadcrumbs trail={trail} onPick={pick} />}

          <div className="toolbar">
            <div>
              <h2 className="toolbar__title display">{heading}</h2>
              <span className="toolbar__meta">
                {savedOnly
                  ? `${shown.length} saved on this device`
                  : loading
                  ? 'Loading pieces…'
                  : `${meta.total} piece${meta.total === 1 ? '' : 's'}`}
              </span>
            </div>
            <div className="toolbar__right">
              <button className="rail-open" onClick={() => setMenuOpen(true)}>
                <SlidersHorizontal size={14} /> Collections
              </button>
              {!savedOnly && (
                <div className="chip-toggle" role="group" aria-label="Sort products">
                  {SORTS.map((s) => (
                    <button
                      key={s.id}
                      className={sort === s.id ? 'is-on' : ''}
                      onClick={() => setSort(s.id)}
                      aria-pressed={sort === s.id}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {loading && <GridSkeleton count={PAGE_SIZE / 2} />}

          {!loading && failed && (
            <div className="empty">
              <div className="empty__icon"><PackageOpen size={24} /></div>
              <h3 className="display">We could not load the catalogue</h3>
              <p>{failed}</p>
              <button className="btn btn--ghost" style={{ marginTop: 18 }} onClick={() => fetchPage(1, { append: false })}>
                Try again
              </button>
            </div>
          )}

          {!loading && !failed && shown.length === 0 && (
            <div className="empty">
              <div className="empty__icon">{savedOnly ? <Heart size={22} /> : <PackageOpen size={22} />}</div>
              <h3 className="display">{savedOnly ? 'No saved pieces yet' : 'Nothing here just yet'}</h3>
              <p>
                {savedOnly
                  ? 'Tap the heart on any piece and it will wait for you here.'
                  : 'This collection has no pieces on display right now. Try another one from the menu.'}
              </p>
            </div>
          )}

          {!loading && !failed && shown.length > 0 && (
            <div className="grid">
              {shown.map((p, i) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  index={i}
                  favourite={favourites.includes(p.code)}
                  onToggleFavourite={toggleFavourite}
                />
              ))}
            </div>
          )}

          {!savedOnly && <div ref={sentinel} style={{ height: 1 }} aria-hidden="true" />}
          {loadingMore && <Spinner label="Loading more pieces" />}
          {!loading && !loadingMore && page >= meta.pages && meta.total > PAGE_SIZE && (
            <p style={{ textAlign: 'center', marginTop: 34, fontSize: 12, color: 'var(--ink-4)' }}>
              You have reached the end of this collection.
            </p>
          )}
        </main>
      </div>

      {isMobile && (
        <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} title="Collections">
          {railBody}
        </Drawer>
      )}
    </>
  );
}
