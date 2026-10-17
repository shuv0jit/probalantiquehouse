import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Info, Sparkles } from 'lucide-react';
import { api } from '../lib/api.js';
import { money, pct } from '../lib/format.js';
import { useStore } from '../lib/store.jsx';

const AUTOPLAY_MS = 4500;
const MAX_SLIDES = 6;

/**
 * Hero carousel: a real slide transition (translateX), not a fade — each
 * slide moves in from the right as the previous one exits left. Sales always
 * come first, regardless of how recent a product is; newest products fill
 * the remaining slots up to 6 total. Autoplay never pauses on hover (that
 * was read as "stuck") — only a direct click on an arrow/dot resets the timer.
 */
export default function HeroBanner({ onPickCollection, onAboutClick }) {
  const { tree, sales } = useStore();
  const [recent, setRecent] = useState([]);
  const [index, setIndex] = useState(0);
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
        title: sale.name,
        subtitle: `Up to ${pct(sale.discountPercent)} off — ${colNode.name}`,
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
        title: p.title || p.path?.[p.path.length - 1]?.name || `Piece No. ${p.code}`,
        subtitle: p.price?.final != null ? money(p.price.final) : `No. ${p.code}`,
        onClick: () => navigate(`/product/${p.code}`),
      });
    }
    return out;
  }, [sales, recent, tree, onPickCollection, navigate]);

  useEffect(() => {
    if (index >= composed.length) setIndex(0);
  }, [composed.length, index]);

  useEffect(() => {
    if (composed.length <= 1) return;
    const id = setTimeout(() => setIndex((i) => (i + 1) % composed.length), AUTOPLAY_MS);
    return () => clearTimeout(id);
  }, [index, composed.length]);

  if (!composed.length) return null;

  const go = (next) => setIndex((i) => (next + composed.length) % composed.length);

  return (
    <section className="hero-banner">
      <div
        className="hero-banner__track"
        style={{ transform: `translate3d(${-index * 100}%, 0, 0)` }}
      >
        {composed.map((slide) => (
          <button key={slide.key} className="hero-banner__slide" onClick={slide.onClick}>
            <img src={slide.image} alt={slide.title} loading="eager" />
            <div className="hero-banner__caption">
              {slide.type === 'sale' && <span className="hero-banner__badge"><Sparkles size={12} /> Sale</span>}
              <h3>{slide.title}</h3>
              <p>{slide.subtitle}</p>
            </div>
          </button>
        ))}
      </div>

      <button className="hero-banner__about" onClick={onAboutClick}>
        <Info size={13} /> About us
      </button>

      {composed.length > 1 && (
        <>
          <button className="hero-banner__nav hero-banner__nav--prev" onClick={() => go(index - 1)} aria-label="Previous">
            <ChevronLeft size={18} />
          </button>
          <button className="hero-banner__nav hero-banner__nav--next" onClick={() => go(index + 1)} aria-label="Next">
            <ChevronRight size={18} />
          </button>

          <div className="hero-banner__dots">
            {composed.map((s, i) => (
              <button
                key={s.key}
                className={`hero-banner__dot${i === index ? ' is-active' : ''}`}
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}