import { useCallback, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Heart, PackageOpen } from 'lucide-react';

import AboutSection from '../components/AboutSection.jsx';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import CollectionsStrip from '../components/CollectionsStrip.jsx';
import Drawer from '../components/Drawer.jsx';
import CollectionTree from '../components/CollectionTree.jsx';
import HeroBanner from '../components/HeroBanner.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { GridSkeleton } from '../components/Skeleton.jsx';
import { api } from '../lib/api.js';
import { pathTo } from '../lib/format.js';
import { useLatest, useLocal, useMedia, useReveal } from '../lib/hooks.js';
import { useStore, useSyncEffect } from '../lib/store.jsx';
import { setMetaTag, setCanonical, setJsonLd } from '../lib/seo.js';

const PAGE_SIZE = 25;

const SORTS = [
  { id: 'newest', label: 'Newest' },
  { id: 'price_asc', label: 'Price ↑' },
  { id: 'price_desc', label: 'Price ↓' },
];

export default function Home({ menuOpen, setMenuOpen }) {
  const { tree, totalProducts, toast } = useStore();
  const [params, setParams] = useSearchParams();
  const isMobile = useMedia('(max-width: 1024px)');
  const aboutRef = useRef(null);

  const collectionId = params.get('c') ? Number(params.get('c')) : null;
  const sort = params.get('sort') || 'newest';
  const savedOnly = params.get('saved') === '1';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState({ total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(null);

  const [favourites, setFavourites] = useLocal('pah:favourites', []);
  const guard = useLatest();

  const trail = useMemo(
    () => (collectionId ? pathTo(tree.byId, collectionId) : []),
    [tree.byId, collectionId]
  );
  const activePath = useMemo(() => trail.map((n) => n.id), [trail]);

  const fetchPage = useCallback(
    async (targetPage) => {
      const isFresh = guard();
      setLoading(true);
      setFailed(null);
      try {
        const qs = new URLSearchParams({ page: String(targetPage), limit: String(PAGE_SIZE), sort });
        if (collectionId) qs.set('collection', String(collectionId));
        const data = await api.get(`/products?${qs}`);
        if (!isFresh()) return;
        setMeta({ total: data.total, pages: data.pages });
        setProducts(data.products);
      } catch (err) {
        if (!isFresh()) return;
        setFailed(err.message);
      } finally {
        if (isFresh()) setLoading(false);
      }
    },
    [collectionId, sort, guard]
  );

  useSyncEffect(() => { if (!savedOnly) fetchPage(page); }, [collectionId, sort, page, savedOnly]);

  const shown = useMemo(
    () => (savedOnly ? products.filter((p) => favourites.includes(p.code)) : products),
    [products, savedOnly, favourites]
  );

  useReveal([shown.length, savedOnly, loading, sort, collectionId, page]);

  useSyncEffect(() => {
    const siteName = 'Probal Antique House';
    if (savedOnly) {
      document.title = `Saved Pieces — ${siteName}`;
      setMetaTag('name', 'description', 'Your saved jewellery pieces from Probal Antique House, Joypurhat.');
      setCanonical('/?saved=1');
      return;
    }
    const leaf = trail[trail.length - 1];
    const title = leaf
      ? `${leaf.name} — Gold & Antique Jewellery | ${siteName}`
      : `${siteName} — Gold, Antique & Fashion Jewellery in Joypurhat, Bangladesh`;
    const description = leaf
      ? `Shop ${leaf.name} at Probal Antique House, Joypurhat — gold, antique and fashion jewellery (সোনা, গহনা).`
      : "Probal Antique House — Joypurhat's jewellery showroom online. Gold, antique and fashion jewellery: necklace, jhumka, churi, chain, ring, mala and more.";
    document.title = title;
    setMetaTag('name', 'description', description);
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setCanonical(leaf ? `/?c=${leaf.id}` : '/');
    setJsonLd('ld-breadcrumb', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${window.location.origin}/` },
        ...trail.map((node, i) => ({ '@type': 'ListItem', position: i + 2, name: node.name, item: `${window.location.origin}/?c=${node.id}` })),
      ],
    });
  }, [trail, savedOnly]);

  const pick = useCallback(
    (id) => {
      const next = new URLSearchParams();
      if (id) next.set('c', String(id));
      setParams(next, { replace: false });
      setMenuOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setParams, setMenuOpen]
  );

  const setSort = (id) => {
    const next = new URLSearchParams(params);
    next.set('page', '1');
    if (sort === id) next.delete('sort');
    else next.set('sort', id);
    setParams(next, { replace: true });
  };

  const goToPage = (p) => {
    const next = new URLSearchParams(params);
    next.set('page', String(p));
    setParams(next, { replace: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleFavourite = useCallback(
    (code) => setFavourites((list) => (list.includes(code) ? list.filter((c) => c !== code) : [...list, code])),
    [setFavourites]
  );

  const heading = savedOnly ? 'Saved pieces' : trail[trail.length - 1]?.name || 'Newly Added';

  const railBody = (
    <CollectionTree roots={tree.roots} activeId={collectionId} activePath={activePath} onPick={pick} totalProducts={totalProducts} />
  );

  const scrollToAbout = () => aboutRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <>
      {!collectionId && !savedOnly && page === 1 && (
        <>
          <HeroBanner onPickCollection={pick} onAboutClick={scrollToAbout} />
          <CollectionsStrip collections={tree.roots} onPick={pick} />
        </>
      )}

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
                {savedOnly ? `${shown.length} saved on this device` : loading ? 'Loading pieces…' : `${meta.total} piece${meta.total === 1 ? '' : 's'}`}
              </span>
            </div>
            <div className="toolbar__right">
              {!savedOnly && (
                <div className="chip-toggle" role="group" aria-label="Sort products">
                  {SORTS.map((s) => (
                    <button key={s.id} className={sort === s.id ? 'is-on' : ''} onClick={() => setSort(s.id)} aria-pressed={sort === s.id}>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {loading && <GridSkeleton count={12} />}

          {!loading && failed && (
            <div className="empty">
              <div className="empty__icon"><PackageOpen size={24} /></div>
              <h3 className="display">We could not load the catalogue</h3>
              <p>{failed}</p>
              <button className="btn btn--ghost" style={{ marginTop: 18 }} onClick={() => fetchPage(page)}>Try again</button>
            </div>
          )}

          {!loading && !failed && shown.length === 0 && (
            <div className="empty">
              <div className="empty__icon">{savedOnly ? <Heart size={22} /> : <PackageOpen size={22} />}</div>
              <h3 className="display">{savedOnly ? 'No saved pieces yet' : 'Nothing here just yet'}</h3>
              <p>{savedOnly ? 'Tap the heart on any piece and it will wait for you here.' : 'This collection has no pieces on display right now.'}</p>
            </div>
          )}

          {!loading && !failed && shown.length > 0 && (
            <div className="grid">
              {shown.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} favourite={favourites.includes(p.code)} onToggleFavourite={toggleFavourite} />
              ))}
            </div>
          )}

          {!savedOnly && meta.pages > 1 && (
            <div className="pager">
              <button className="btn btn--ghost btn--sm" onClick={() => goToPage(page - 1)} disabled={page <= 1}>Previous</button>
              {Array.from({ length: meta.pages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === meta.pages || Math.abs(p - page) <= 1)
                .map((p, i, arr) => (
                  <span key={p} style={{ display: 'contents' }}>
                    {i > 0 && arr[i - 1] !== p - 1 && <span style={{ color: 'var(--ink-4)' }}>…</span>}
                    <button className={`pager__num${p === page ? ' is-on' : ''}`} onClick={() => goToPage(p)}>{p}</button>
                  </span>
                ))}
              <button className="btn btn--ghost btn--sm" onClick={() => goToPage(page + 1)} disabled={page >= meta.pages}>Next</button>
            </div>
          )}
        </main>
      </div>

      {!collectionId && !savedOnly && <AboutSection ref={aboutRef} />}

      {isMobile && (
        <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} title="Collections">
          {railBody}
        </Drawer>
      )}
    </>
  );
}