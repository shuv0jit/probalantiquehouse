import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Copy, Heart, MessageCircle, PackageOpen, Share2 } from 'lucide-react';

import Gallery from '../components/Gallery.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { GridSkeleton } from '../components/Skeleton.jsx';
import { api } from '../lib/api.js';
import { money, pct } from '../lib/format.js';
import { useLocal, useReveal } from '../lib/hooks.js';
import { useStore, useSyncEffect } from '../lib/store.jsx';

const WHATSAPP = import.meta.env.VITE_WHATSAPP_NUMBER || '';

export default function ProductPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { toast } = useStore();

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
    document.title = `${name} — No. ${p.code} | Probal Antique House`;
    const desc = p.description
      || `${name} at Probal Antique House. Piece number ${p.code}${p.price.final != null ? `, ${money(p.price.final)}` : ''}.`;
    const setMeta = (key, attr, value) => {
      let el = document.head.querySelector(`meta[${key}="${attr}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(key, attr);
        document.head.appendChild(el);
      }
      el.setAttribute('content', value);
    };
    setMeta('name', 'description', desc);
    setMeta('property', 'og:title', `${name} — No. ${p.code}`);
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:type', 'product');
    if (p.images[0]) setMeta('property', 'og:image', p.images[0].url);
    return () => { document.title = 'Probal Antique House'; };
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
      <div className="shell" style={{ paddingTop: 24 }}>
        <div className="pdp">
          <div className="skel" style={{ aspectRatio: '1 / 1' }}><div className="skel__box" /></div>
          <div className="skel__lines" style={{ gap: 14 }}>
            <div className="skel__line skel__line--sm" />
            <div className="skel__line" style={{ height: 26 }} />
            <div className="skel__line skel__line--md" />
            <div className="skel__line skel__line--sm" />
          </div>
        </div>
      </div>
    );
  }

  if (failed || !data) {
    return (
      <div className="shell" style={{ padding: '60px 20px' }}>
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

  return (
    <div className="shell">
      <button className="btn btn--ghost btn--sm" style={{ marginTop: 20 }} onClick={() => navigate(-1)}>
        <ArrowLeft size={14} /> Back
      </button>

      <div className="pdp">
        <Gallery images={product.images} alt={`${name}, piece number ${product.code}`} />

        <div className="pdp__info">
          <span className="pdp__code">
            NO. {product.code}
            <button onClick={copyCode} aria-label="Copy piece number">
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          </span>

          <h1 className="display">{name}</h1>

          <nav className="pdp__trail" aria-label="Collection path">
            {product.path.map((node, i) => (
              <span key={node.id}>
                {i > 0 && <span style={{ color: 'var(--ink-4)' }}>  ›  </span>}
                <Link to={`/?c=${node.id}`} style={{ borderBottom: '1px solid var(--line)' }}>{node.name}</Link>
              </span>
            ))}
          </nav>

          {final != null ? (
            <>
              <div className="pdp__price">
                <span className="pdp__now">{money(final)}</span>
                {compare > final && <span className="pdp__was">{money(compare)}</span>}
                {discountPercent > 0 && <span className="pdp__save">{pct(discountPercent)} off</span>}
              </div>
              <p className="pdp__note">
                {saleName ? `${saleName} pricing, in store and online.` : 'Showroom price. Ask us about making charges and exchange.'}
              </p>
            </>
          ) : (
            <p className="pdp__note" style={{ marginTop: 22, fontSize: 14 }}>
              Price on request — quote piece number {product.code} when you visit or call.
            </p>
          )}

          <div className="pdp__actions">
            {waHref && (
              <a className="btn btn--primary" href={waHref} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={16} /> Enquire about this piece
              </a>
            )}
            <button
              className="btn btn--ghost"
              onClick={() => setFavourites((l) => (isFav ? l.filter((c) => c !== product.code) : [...l, product.code]))}
              aria-pressed={isFav}
            >
              <Heart size={15} fill={isFav ? 'currentColor' : 'none'} style={{ color: isFav ? 'var(--rose)' : undefined }} />
              {isFav ? 'Saved' : 'Save'}
            </button>
            <button className="btn btn--ghost" onClick={share}>
              <Share2 size={15} /> Share
            </button>
          </div>

          <dl className="pdp__facts">
            <div className="pdp__fact"><dt>Piece number</dt><dd>{product.code}</dd></div>
            <div className="pdp__fact"><dt>Collection</dt><dd>{product.path.map((p) => p.name).join('  ›  ')}</dd></div>
            <div className="pdp__fact"><dt>Photographs</dt><dd>{product.images.length}</dd></div>
            {product.description && (
              <div className="pdp__fact"><dt>Details</dt><dd>{product.description}</dd></div>
            )}
            <div className="pdp__fact"><dt>Viewing</dt><dd>Available to see in the showroom during opening hours.</dd></div>
          </dl>
        </div>
      </div>

      {related.length > 0 && (
        <section>
          <div className="section-head">
            <h2 className="display">More from this collection</h2>
            <hr className="gold-rule" />
          </div>
          <div className="grid">
            {related.map((p, i) => (
              <ProductCard
                key={p.id}
                product={p}
                index={i}
                favourite={favourites.includes(p.code)}
                onToggleFavourite={(c) =>
                  setFavourites((l) => (l.includes(c) ? l.filter((x) => x !== c) : [...l, c]))
                }
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
