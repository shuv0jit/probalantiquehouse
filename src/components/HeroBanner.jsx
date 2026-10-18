import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Info, Sparkles, Tag } from 'lucide-react';
import { api } from '../lib/api.js';
import { money, pct } from '../lib/format.js';
import { useStore } from '../lib/store.jsx';

const AUTOPLAY_MS = 4500;
const MAX_SLIDES = 6;
const TRANSITION_MS = 650;

/**
 * Hero carousel.
 *
 * - Images are never cropped/zoomed: each slide shows the full picture via
 *   object-fit: contain, centered on a plain dark letterbox (no blur, no
 *   extra image layers — keeps paint cost low so it doesn't jank on load).
 * - True infinite loop in one direction: a clone of the last slide is
 *   placed before the first, and a clone of the first after the last, so
 *   advancing past the end (or before the start) never needs to "snap back"
 *   visually — it keeps sliding the same way and silently re-centers on the
 *   real slide once the transition finishes (the classic carousel trick).
 * - Autoplay only ever moves forward (right to left) and never pauses on
 *   hover — only a manual arrow/dot click interrupts the timer.
 * - The very first slide gets a bigger, dedicated "promo" treatment (sale
 *   name, discount, Buy now CTA) rather than the smaller caption used on
 *   the rest.
 */
export default function HeroBanner({ onPickCollection, onAboutClick }) {
  const { tree, sales } = useStore();
  const [recent, setRecent] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    api.get('/products?limit=6&sort=newest').then((data) => alive && setRecent(data.products)).catch(() => {});
    return () => { alive = false; };
  }, []);

  const composed = useMemo(() => {
    const out = [];
    for (const sale of sales) {
      if (out.length >= MAX_SLIDES) break;
      const firstCol = sale.collectionIds?.[0];
      const colNode = firstCol ? tree.byId.get(firstCol) : null;
      if (!colNode?.image) continue;
      out.push({
        type: 'sale',
        key: `sale-${sale.id}`,
        image: colNode.image,
        eyebrow: 'Limited-time sale',
        title: sale.name,
        discount: sale.discountPercent,
        subtitle: colNode.name,
        cta: 'Shop the sale',
        onClick: () => onPickCollection(firstCol),
      });
    }
    for (const p of recent) {
      if (out.length >= MAX_SLIDES) break;
      const img = p.images?.[0]?.url;
      if (!img) continue;
      out.push({
        type: 'product',
        key: `p-${p.id}`,
        image: img,
        eyebrow: 'New arrival',
        title: p.title || p.path?.[p.path.length - 1]?.name || `Piece No. ${p.code}`,
        discount: null,
        subtitle: p.price?.final != null ? money(p.price.final) : `No. ${p.code}`,
        cta: 'Buy now',
        onClick: () => navigate(`/product/${p.code}`),
      });
    }
    return out;
  }, [sales, recent, tree, onPickCollection, navigate]);

  const len = composed.length;
  const loopable = len > 1;

  // position: 0 = leading clone (= last real slide), 1..len = real slides,
  // len+1 = trailing clone (= first real slide). Non-loopable decks just use 0..len-1.
  const [position, setPosition] = useState(loopable ? 1 : 0);
  const [noTransition, setNoTransition] = useState(false);
  const settlingRef = useRef(false);

  useEffect(() => { setPosition(loopable ? 1 : 0); }, [len, loopable]);

  useEffect(() => {
    if (!loopable) return undefined;
    const id = setTimeout(() => {
      if (!settlingRef.current) setPosition((p) => p + 1);
    }, AUTOPLAY_MS);
    return () => clearTimeout(id);
  }, [position, loopable]);

  const settleIfNeeded = useCallback((p) => {
    if (!loopable) return;
    if (p === 0) {
      settlingRef.current = true;
      setNoTransition(true);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        setPosition(len);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          setNoTransition(false);
          settlingRef.current = false;
        }));
      }));
    } else if (p === len + 1) {
      settlingRef.current = true;
      setNoTransition(true);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        setPosition(1);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          setNoTransition(false);
          settlingRef.current = false;
        }));
      }));
    }
  }, [len, loopable]);

  const handleTransitionEnd = () => settleIfNeeded(position);

  if (!len) return null;

  const trackSlides = loopable ? [composed[len - 1], ...composed, composed[0]] : composed;
  const activeIndex = loopable ? (((position - 1) % len) + len) % len : position;

  const next = () => { if (!settlingRef.current) setPosition((p) => p + 1); };
  const prev = () => { if (!settlingRef.current) setPosition((p) => (loopable ? p - 1 : (p - 1 + len) % len)); };
  const goTo = (i) => { if (!settlingRef.current) setPosition(loopable ? i + 1 : i); };

  return (
    <section className="hero-banner">
      <div
        className="hero-banner__track"
        onTransitionEnd={handleTransitionEnd}
        style={{
          transform: `translate3d(${-position * 100}%, 0, 0)`,
          transition: noTransition ? 'none' : `transform ${TRANSITION_MS}ms cubic-bezier(.65,0,.35,1)`,
        }}
      >
        {trackSlides.map((slide, i) => {
          const isLead = loopable ? i === 1 : i === 0;
          const nearActive = loopable
            ? Math.abs(i - position) <= 1
            : i === position;
          return (
            <div className="hero-banner__slide" key={`${slide.key}-${i}`}>
              <button className="hero-banner__fgbtn" onClick={slide.onClick} tabIndex={-1}>
                <img
                  className="hero-banner__fg"
                  src={slide.image}
                  alt={slide.title}
                  loading={nearActive ? 'eager' : 'lazy'}
                  decoding="async"
                  fetchPriority={isLead ? 'high' : 'auto'}
                />
              </button>

              <div className={`hero-banner__promo${isLead ? ' hero-banner__promo--lead' : ''}`}>
                <span className={`hero-banner__tag${slide.type === 'product' ? ' hero-banner__tag--muted' : ''}`}>
                  {slide.type === 'sale' ? <Sparkles size={12} /> : <Tag size={12} />} {slide.eyebrow}
                </span>
                <h3>{slide.title}</h3>
                {slide.discount != null && (
                  <span className="hero-banner__discount">Up to {pct(slide.discount)} off</span>
                )}
                <p>{slide.subtitle}</p>
                <span
                  className="hero-banner__cta"
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); slide.onClick(); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') slide.onClick(); }}
                >
                  {slide.cta}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <button className="hero-banner__about" onClick={onAboutClick}>
        <Info size={13} /> About us
      </button>

      {loopable && (
        <>
          <button className="hero-banner__nav hero-banner__nav--prev" onClick={prev} aria-label="Previous">
            <ChevronLeft size={18} />
          </button>
          <button className="hero-banner__nav hero-banner__nav--next" onClick={next} aria-label="Next">
            <ChevronRight size={18} />
          </button>

          <div className="hero-banner__dots">
            {composed.map((s, i) => (
              <button
                key={s.key}
                className={`hero-banner__dot${i === activeIndex ? ' is-active' : ''}`}
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}