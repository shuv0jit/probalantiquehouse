import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ImageOff } from 'lucide-react';
import { money } from '../lib/format.js';

/**
 * Compact product card. Loads only the first image eagerly-on-visible
 * (loading="lazy"); the second image is fetched at low priority and cross-fades
 * on hover, which is the cheapest way to make a gallery feel alive.
 */
export default function ProductCard({ product, favourite, onToggleFavourite, index = 0 }) {
  const [loaded, setLoaded] = useState(false);
  const [altLoaded, setAltLoaded] = useState(false);
  const [broken, setBroken] = useState(false);

  const [primary, secondary] = product.images;
  const { final, compare, discountPercent } = product.price;
  const isNew = Date.now() - new Date(product.createdAt).getTime() < 12 * 86400000;

  return (
    <article className="card reveal" style={{ transitionDelay: `${Math.min(index, 11) * 28}ms` }}>
      <Link to={`/product/${product.code}`} className="card__media" aria-label={`View product ${product.code}`}>
        {primary && !broken ? (
          <>
            <img
              className={`card__img${loaded ? ' is-loaded' : ''}`}
              src={primary.url}
              alt={product.title || `${product.path.map((p) => p.name).join(' ')} — piece ${product.code}`}
              loading="lazy"
              decoding="async"
              width={primary.width || undefined}
              height={primary.height || undefined}
              onLoad={() => setLoaded(true)}
              onError={() => setBroken(true)}
            />
            {secondary && (
              <img
                className={`card__img card__img--alt${altLoaded ? ' is-loaded' : ''}`}
                src={secondary.url}
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                fetchpriority="low"
                onLoad={() => setAltLoaded(true)}
              />
            )}
          </>
        ) : (
          <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--ink-4)' }}>
            <ImageOff size={22} />
          </div>
        )}

        <div className="card__badges">
          {discountPercent > 0 && <span className="badge badge--sale">-{discountPercent}%</span>}
          {isNew && discountPercent === 0 && <span className="badge badge--new">New in</span>}
        </div>
      </Link>

      <button
        className={`card__fav${favourite ? ' is-on' : ''}`}
        onClick={() => onToggleFavourite(product.code)}
        aria-label={favourite ? 'Remove from your saved pieces' : 'Save this piece'}
        aria-pressed={favourite}
      >
        <Heart size={14} fill={favourite ? 'currentColor' : 'none'} />
      </button>

      <div className="card__body">
        <span className="card__code">NO. {product.code}</span>
        <span className="card__title">{product.title || product.path[product.path.length - 1]?.name || 'Antique piece'}</span>
        <div className="card__prices">
          {final != null ? (
            <>
              <span className="price-now">{money(final)}</span>
              {compare > final && <span className="price-was">{money(compare)}</span>}
            </>
          ) : (
            <span className="price-ask">Price on request</span>
          )}
        </div>
      </div>
    </article>
  );
}
