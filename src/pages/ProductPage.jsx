import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Copy, Heart, MessageCircle, PackageOpen, Share2, ShoppingBag, ShieldCheck, Store } from 'lucide-react';

import Gallery from '../components/Gallery.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { GridSkeleton } from '../components/Skeleton.jsx';
import { api } from '../lib/api.js';
import { setMetaTag, setCanonical, setJsonLd, removeJsonLd } from '../lib/seo.js';
import { money, pct } from '../lib/format.js';
import { useLocal, useReveal } from '../lib/hooks.js';
import { useStore, useSyncEffect } from '../lib/store.jsx';
import { useCart } from '../lib/cart.js';

const WHATSAPP = import.meta.env.VITE_WHATSAPP_NUMBER || '';


const productPageStyles = `
.pah-product-page { --pah-line: var(--line, #e8e0d6); --pah-ink: var(--ink, #29251f); --pah-muted: var(--ink-3, #81776d); padding-bottom: 64px; }
.pah-product-page * { box-sizing: border-box; }
.pah-product-topbar { display:flex; align-items:center; justify-content:space-between; gap:18px; padding:20px 0 24px; }
.pah-back-button { display:inline-flex; align-items:center; gap:8px; border:1px solid var(--pah-line); border-radius:999px; background:transparent; color:var(--pah-ink); padding:10px 15px; font:inherit; font-size:13px; cursor:pointer; transition:background .22s ease, transform .22s ease; }
.pah-back-button:hover { background:var(--surface-2, #f5f1eb); transform:translateX(-2px); }
.pah-breadcrumbs { display:flex; align-items:center; justify-content:flex-end; flex-wrap:wrap; gap:9px; color:var(--pah-muted); font-size:12px; }
.pah-breadcrumbs a { color:inherit; text-decoration:none; transition:color .2s ease; }
.pah-breadcrumbs a:hover { color:var(--ink, #29251f); }
.pah-breadcrumb-part { display:inline-flex; align-items:center; gap:9px; }
.pah-product-layout { display:grid; grid-template-columns:minmax(0,1.08fr) minmax(340px,.92fr); gap:clamp(28px,5vw,76px); align-items:start; }
.pah-gallery-panel { min-width:0; position:relative; }
.pah-gallery-label { display:flex; justify-content:space-between; gap:12px; padding:0 2px 13px; color:var(--pah-muted); font-size:10px; letter-spacing:.13em; font-weight:650; }
.pah-gallery-frame { overflow:hidden; border:1px solid var(--pah-line); border-radius:4px; background:var(--surface-2, #f6f2ec); }
.pah-gallery-frame > * { max-width:100%; }
.pah-gallery-caption { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:13px 2px 0; color:var(--pah-muted); font-size:12px; }
.pah-gallery-caption span:first-child { display:flex; align-items:center; gap:7px; }
.pah-gallery-caption svg { color:var(--accent, #9a7a4d); }
.pah-product-panel { min-width:0; padding-top:5px; }
.pah-piece-code { display:flex; align-items:center; gap:9px; min-height:28px; color:var(--pah-muted); font-size:11px; letter-spacing:.09em; }
.pah-piece-code strong { color:var(--pah-ink); font-size:12px; letter-spacing:.04em; }
.pah-piece-code button { display:inline-flex; align-items:center; justify-content:center; width:28px; height:28px; border:1px solid var(--pah-line); border-radius:50%; background:transparent; color:var(--pah-muted); cursor:pointer; transition:all .2s ease; }
.pah-piece-code button:hover { color:var(--pah-ink); border-color:var(--pah-muted); }
.pah-copied-label { color:var(--pah-muted); font-size:11px; letter-spacing:0; }
.pah-product-title { margin:13px 0 8px; font-size:clamp(30px,3.1vw,45px); line-height:1.13; letter-spacing:-.035em; overflow-wrap:anywhere; }
.pah-product-subtitle { margin:0; color:var(--pah-muted); font-size:14px; line-height:1.7; }
.pah-price-card { margin-top:26px; padding:19px 20px 17px; border:1px solid var(--pah-line); background:var(--surface-2, #f8f5f0); }
.pah-price-topline { margin-bottom:10px; color:var(--pah-muted); font-size:10px; font-weight:700; letter-spacing:.15em; }
.pah-price-row { display:flex; align-items:center; flex-wrap:wrap; gap:10px 13px; }
.pah-current-price { color:var(--pah-ink); font-size:clamp(25px,2.5vw,34px); line-height:1.2; font-weight:650; letter-spacing:-.035em; }
.pah-original-price { color:var(--pah-muted); font-size:14px; text-decoration:line-through; }
.pah-discount-pill { padding:5px 8px; border:1px solid var(--pah-line); border-radius:2px; color:var(--pah-ink); font-size:11px; font-weight:650; }
.pah-price-request { font-size:25px; line-height:1.3; font-weight:600; color:var(--pah-ink); }
.pah-price-note { margin:9px 0 0; color:var(--pah-muted); font-size:12px; line-height:1.65; }
.pah-product-actions { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:17px; }
.pah-action-primary,.pah-action-whatsapp { min-height:49px; display:flex; align-items:center; justify-content:center; gap:9px; padding:12px 15px; border:1px solid var(--ink, #29251f); border-radius:2px; font:inherit; font-size:13px; font-weight:650; text-align:center; text-decoration:none; cursor:pointer; transition:transform .2s ease, opacity .2s ease, background .2s ease; }
.pah-action-primary { grid-column:1 / -1; background:var(--ink, #29251f); color:var(--surface, #fff); }
.pah-action-primary:hover { opacity:.9; transform:translateY(-1px); }
.pah-action-whatsapp { background:transparent; color:var(--pah-ink); border-color:var(--pah-line); }
.pah-action-whatsapp:hover,.pah-action-secondary:hover { background:var(--surface-2, #f6f2ec); }
.pah-secondary-actions { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.pah-action-secondary { display:inline-flex; align-items:center; justify-content:center; gap:7px; min-height:42px; padding:9px 10px; border:1px solid transparent; border-radius:2px; background:transparent; color:var(--pah-muted); font:inherit; font-size:12px; cursor:pointer; transition:all .2s ease; }
.pah-action-secondary.is-saved { color:var(--rose, #a64b5c); }
.pah-reassurance-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:22px; padding:17px 0; border-top:1px solid var(--pah-line); border-bottom:1px solid var(--pah-line); }
.pah-reassurance-row > div { display:flex; align-items:flex-start; gap:10px; min-width:0; }
.pah-reassurance-row svg { flex:none; margin-top:2px; color:var(--accent, #9a7a4d); }
.pah-reassurance-row span { display:grid; gap:4px; min-width:0; }
.pah-reassurance-row strong { color:var(--pah-ink); font-size:11px; font-weight:650; }
.pah-reassurance-row small { color:var(--pah-muted); font-size:11px; line-height:1.45; }
.pah-details-section { margin-top:25px; }
.pah-details-section h2 { margin:0 0 9px; color:var(--pah-ink); font-size:16px; font-weight:650; }
.pah-details-list { margin:0; }
.pah-details-list > div { display:grid; grid-template-columns:minmax(100px,.7fr) minmax(0,1.3fr); gap:15px; padding:12px 0; border-bottom:1px solid var(--pah-line); }
.pah-details-list dt { color:var(--pah-muted); font-size:12px; }
.pah-details-list dd { margin:0; color:var(--pah-ink); font-size:12px; line-height:1.65; overflow-wrap:anywhere; }
.pah-related-section { margin-top:clamp(54px,8vw,100px); }
.pah-related-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; margin-bottom:24px; }
.pah-eyebrow { display:block; margin-bottom:8px; color:var(--pah-muted); font-size:10px; font-weight:700; letter-spacing:.16em; }
.pah-related-heading h2 { margin:0; font-size:clamp(24px,3vw,36px); line-height:1.2; }
.pah-related-heading > a { flex:none; color:var(--pah-ink); font-size:12px; text-decoration:none; border-bottom:1px solid var(--pah-line); padding-bottom:5px; }
.pah-product-skeleton { display:grid; grid-template-columns:1fr 1fr; gap:clamp(24px,5vw,70px); animation:pah-pulse 1.5s ease-in-out infinite; }
.pah-skeleton-image { aspect-ratio: .95; background:var(--surface-2, #f2eee8); border-radius:3px; }
.pah-skeleton-info { display:flex; flex-direction:column; gap:14px; padding-top:30px; }
.pah-skeleton-info span { display:block; height:13px; max-width:100%; background:var(--surface-2, #f2eee8); border-radius:3px; }
.pah-skeleton-info span:nth-child(1) { width:28%; height:9px; }.pah-skeleton-info span:nth-child(2) { width:86%; height:30px; }.pah-skeleton-info span:nth-child(3) { width:48%; }.pah-skeleton-info span:nth-child(4) { width:72%; height:52px; margin-top:12px; }.pah-skeleton-info span:nth-child(5) { width:100%; height:48px; }
@keyframes pah-pulse { 0%,100% { opacity:.65; } 50% { opacity:1; } }
@media (min-width:1200px) { .pah-product-layout { gap:clamp(55px,6vw,100px); } .pah-product-panel { position:relative; } }
@media (max-width:800px) { .pah-product-layout { grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:25px; } .pah-product-title { font-size:clamp(27px,4vw,36px); } .pah-price-card { padding:16px; margin-top:20px; } .pah-product-actions { grid-template-columns:1fr; } .pah-action-primary { grid-column:auto; } .pah-action-whatsapp { min-height:44px; } .pah-secondary-actions { justify-content:flex-start; } .pah-action-secondary { padding-left:3px; padding-right:9px; } .pah-reassurance-row { grid-template-columns:1fr; gap:14px; } }
@media (max-width:600px) { .pah-product-page { padding-bottom:38px; } .pah-product-topbar { align-items:flex-start; flex-direction:column; gap:13px; padding:15px 0 18px; } .pah-breadcrumbs { justify-content:flex-start; font-size:11px; gap:7px; } .pah-breadcrumb-part { gap:7px; } .pah-product-layout { grid-template-columns:minmax(0,1fr); gap:25px; } .pah-gallery-label { font-size:9px; padding-bottom:10px; } .pah-gallery-frame { margin-inline:-1px; } .pah-gallery-caption { padding-top:10px; font-size:11px; } .pah-product-panel { padding-top:0; } .pah-product-title { margin-top:10px; font-size:clamp(30px,8vw,39px); } .pah-product-subtitle { font-size:13px; } .pah-price-card { margin-top:20px; padding:17px; } .pah-current-price { font-size:29px; } .pah-product-actions { gap:8px; margin-top:13px; } .pah-action-primary { min-height:52px; font-size:14px; } .pah-secondary-actions { justify-content:space-between; } .pah-action-secondary { font-size:12px; } .pah-reassurance-row { grid-template-columns:1fr 1fr; gap:10px; margin-top:17px; padding:15px 0; } .pah-reassurance-row > div { gap:7px; } .pah-reassurance-row strong { font-size:10px; } .pah-reassurance-row small { font-size:10px; } .pah-details-section { margin-top:22px; } .pah-details-list > div { grid-template-columns:105px minmax(0,1fr); gap:10px; padding:11px 0; } .pah-related-section { margin-top:55px; } .pah-related-heading { align-items:flex-start; flex-direction:column; gap:12px; margin-bottom:18px; } .pah-related-heading h2 { font-size:27px; } .pah-product-skeleton { grid-template-columns:1fr; gap:24px; } .pah-skeleton-image { aspect-ratio:1 / 1; } .pah-skeleton-info { padding-top:0; } }
@media (prefers-reduced-motion:reduce) { .pah-product-page *, .pah-product-page *::before, .pah-product-page *::after { scroll-behavior:auto !important; animation-duration:.01ms !important; animation-iteration-count:1 !important; transition-duration:.01ms !important; } }
`;

export default function ProductPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { toast } = useStore();
  const { add, inCart } = useCart();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(null);
  const [copied, setCopied] = useState(false);
  const [favourites, setFavourites] = useLocal('pah:favourites', []);
  const [, setRecent] = useLocal('pah:recent', []);

  useSyncEffect(() => {
    let alive = true;
    setLoading(true);
    setFailed(null);
    api
      .get(`/products/${encodeURIComponent(code)}`)
      .then((res) => {
        if (!alive) return;
        setData(res);
        setRecent((list) => [res.product.code, ...list.filter((c) => c !== res.product.code)].slice(0, 12));
      })
      .catch((err) => alive && setFailed(err.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [code]);

  // SEO: unique title + description + og tags per product.
   useEffect(() => {
    const p = data?.product;
    if (!p) return;
    const name = p.title || p.path.map((x) => x.name).join(' · ') || 'Antique piece';
    const desc = p.description
      || `${name} at Probal Antique House, Joypurhat. Piece number ${p.code}${p.price.final != null ? `, ${money(p.price.final)}` : ''}.`;

    document.title = `${name} — No. ${p.code} | Probal Antique House`;
    setMetaTag('name', 'description', desc);
    setMetaTag('property', 'og:title', `${name} — No. ${p.code}`);
    setMetaTag('property', 'og:description', desc);
    setMetaTag('property', 'og:type', 'product');
    if (p.images[0]) setMetaTag('property', 'og:image', p.images[0].url);
    setCanonical(`/product/${p.code}`);

    setJsonLd('ld-product', {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name,
      image: p.images.map((i) => i.url),
      description: desc,
      sku: p.code,
      brand: { '@type': 'Brand', name: 'Probal Antique House' },
      ...(p.price.final != null && {
        offers: {
          '@type': 'Offer',
          priceCurrency: 'BDT',
          price: p.price.final,
          availability: 'https://schema.org/InStock',
          url: window.location.href,
        },
      }),
    });

    setJsonLd('ld-breadcrumb-product', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${window.location.origin}/` },
        ...p.path.map((node, i) => ({
          '@type': 'ListItem', position: i + 2, name: node.name, item: `${window.location.origin}/?c=${node.id}`,
        })),
        { '@type': 'ListItem', position: p.path.length + 2, name, item: window.location.href },
      ],
    });

    return () => {
      document.title = 'Probal Antique House';
      removeJsonLd('ld-product');
      removeJsonLd('ld-breadcrumb-product');
    };
  }, [data]);

  useReveal([data]);

  const copyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(data.product.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast('Could not copy — please note the number manually.', 'error');
    }
  }, [data, toast]);

  const share = useCallback(async () => {
    const url = window.location.href;
    const title = `Piece No. ${data.product.code} — Probal Antique House`;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast('Link copied to your clipboard.', 'success');
      }
    } catch { /* user cancelled the share sheet */ }
  }, [data, toast]);

  if (loading) {
    return (
      <div className="shell pah-product-page" style={{ paddingTop: 24 }}>
        <style>{productPageStyles}</style>
        <div className="pah-product-skeleton" aria-label="Loading product">
          <div className="pah-skeleton-image" />
          <div className="pah-skeleton-info">
            <span /><span /><span /><span /><span />
          </div>
        </div>
      </div>
    );
  }

  if (failed || !data) {
    return (
      <div className="shell pah-product-page" style={{ padding: '60px 20px' }}>
        <style>{productPageStyles}</style>
        <div className="empty">
          <div className="empty__icon"><PackageOpen size={24} /></div>
          <h3 className="display">This piece is not on display</h3>
          <p>{failed || 'It may have been sold or moved to another collection.'}</p>
          <Link className="btn btn--ghost" style={{ marginTop: 20 }} to="/">Back to the catalogue</Link>
        </div>
      </div>
    );
  }

  const { product, related } = data;
  const { final, compare, discountPercent, saleName } = product.price;
  const name = product.title || product.path[product.path.length - 1]?.name || 'Antique piece';
  const isFav = favourites.includes(product.code);

  const waHref = WHATSAPP
    ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hello! I'd like to ask about piece No. ${product.code} from Probal Antique House.`)}`
    : null;

  const alreadyInCart = inCart(product.code);

  return (
    <div className="shell pah-product-page">
      <style>{productPageStyles}</style>
      <div className="pah-product-topbar">
        <button className="pah-back-button" type="button" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> <span>Back to browsing</span>
        </button>
        <nav className="pah-breadcrumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          {product.path.map((node) => (
            <span className="pah-breadcrumb-part" key={node.id}>
              <span aria-hidden="true">/</span><Link to={`/?c=${node.id}`}>{node.name}</Link>
            </span>
          ))}
        </nav>
      </div>

      <main className="pah-product-layout">
        <section className="pah-gallery-panel" aria-label="Product photographs">
          <div className="pah-gallery-label"><span>PROBAL ANTIQUE HOUSE</span><span>PIECE No. {product.code}</span></div>
          <div className="pah-gallery-frame">
            <Gallery images={product.images} alt={`${name}, piece number ${product.code}`} />
          </div>
          <div className="pah-gallery-caption">
            <span><Check size={14} /> Carefully selected piece</span>
            <span>{product.images.length} {product.images.length === 1 ? 'photo' : 'photos'}</span>
          </div>
        </section>

        <section className="pah-product-panel">
          <div className="pah-product-heading">
            <div className="pah-piece-code">
              <span>PIECE NUMBER</span>
              <strong>{product.code}</strong>
              <button type="button" onClick={copyCode} aria-label="Copy piece number" title="Copy piece number">
                {copied ? <Check size={15} /> : <Copy size={15} />}
              </button>
              {copied && <span className="pah-copied-label">Copied</span>}
            </div>
            <h1 className="pah-product-title display">{name}</h1>
            <p className="pah-product-subtitle">A distinctive find from Probal Antique House.</p>
          </div>

          <div className="pah-price-card">
            <div className="pah-price-topline">{final != null ? 'OUR PRICE' : 'PRICING'}</div>
            {final != null ? (
              <div className="pah-price-row">
                <span className="pah-current-price">{money(final)}</span>
                {compare > final && <span className="pah-original-price">{money(compare)}</span>}
                {discountPercent > 0 && <span className="pah-discount-pill">{pct(discountPercent)} off</span>}
              </div>
            ) : (
              <div className="pah-price-request">Price on request</div>
            )}
            <p className="pah-price-note">
              {final != null
                ? (saleName ? `${saleName} pricing, in store and online.` : 'Showroom price. Contact us about making charges and exchange.')
                : `Mention piece number ${product.code} when you contact us.`}
            </p>
          </div>

          <div className="pah-product-actions">
            {alreadyInCart ? (
              <Link className="pah-action-primary" to="/cart"><ShoppingBag size={18} /> In cart — view cart</Link>
            ) : (
              <button className="pah-action-primary" type="button" onClick={() => add(product)}>
                <ShoppingBag size={18} /> Add to cart
              </button>
            )}
            {waHref && (
              <a className="pah-action-whatsapp" href={waHref} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={17} /> Ask on WhatsApp
              </a>
            )}
            <div className="pah-secondary-actions">
              <button className={`pah-action-secondary${isFav ? ' is-saved' : ''}`} type="button"
                onClick={() => setFavourites((l) => (isFav ? l.filter((c) => c !== product.code) : [...l, product.code]))}
                aria-pressed={isFav}>
                <Heart size={16} fill={isFav ? 'currentColor' : 'none'} /> {isFav ? 'Saved to favourites' : 'Save for later'}
              </button>
              <button className="pah-action-secondary" type="button" onClick={share}><Share2 size={16} /> Share</button>
            </div>
          </div>

          <div className="pah-reassurance-row">
            <div><Store size={18} /><span><strong>Visit our showroom</strong><small>See the piece in person</small></span></div>
            <div><ShieldCheck size={18} /><span><strong>Personal assistance</strong><small>Ask us before ordering</small></span></div>
          </div>

          <section className="pah-details-section">
            <h2>Piece details</h2>
            <dl className="pah-details-list">
              <div><dt>Piece number</dt><dd>{product.code}</dd></div>
              <div><dt>Collection</dt><dd>{product.path.map((p) => p.name).join('  ›  ')}</dd></div>
              <div><dt>Photographs</dt><dd>{product.images.length}</dd></div>
              {product.description && <div><dt>Description</dt><dd>{product.description}</dd></div>}
              <div><dt>Viewing</dt><dd>Available to view in our showroom during opening hours.</dd></div>
            </dl>
          </section>
        </section>
      </main>

      {related.length > 0 && (
        <section className="pah-related-section">
          <div className="pah-related-heading">
            <div><span className="pah-eyebrow">KEEP EXPLORING</span><h2 className="display">More from this collection</h2></div>
            <Link to={`/?c=${product.path[product.path.length - 1]?.id || ''}`}>View collection <span aria-hidden="true">→</span></Link>
          </div>
          <div className="grid">
            {related.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i}
                favourite={favourites.includes(p.code)}
                onToggleFavourite={(c) => setFavourites((l) => (l.includes(c) ? l.filter((x) => x !== c) : [...l, c]))}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
