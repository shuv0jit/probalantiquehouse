import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Gem } from 'lucide-react';

const SPEED_PX_PER_SEC = 36;

/**
 * Continuously auto-scrolls right-to-left (items drift leftward, new ones
 * enter from the right), loops seamlessly with no jump by rendering the list
 * twice and resetting scrollLeft by exactly one set's width once it's been
 * fully scrolled past — that reset happens on an identical pixel, so it's
 * invisible. Pauses on hover/touch so clicking a collection is reliable.
 */
export default function CollectionsStrip({ collections, onPick }) {
  const trackRef = useRef(null);
  const pausedRef = useRef(false);
  const resumeTimer = useRef(null);
  const rafRef = useRef(null);
  const lastT = useRef(0);

  useEffect(() => {
    if (!collections.length) return;
    const track = trackRef.current;
    if (!track) return;

    const tick = (t) => {
      if (!lastT.current) lastT.current = t;
      const dt = (t - lastT.current) / 1000;
      lastT.current = t;

      if (!pausedRef.current) {
        const loopWidth = track.scrollWidth / 2;
        track.scrollLeft += SPEED_PX_PER_SEC * dt;
        if (loopWidth > 0 && track.scrollLeft >= loopWidth) {
          track.scrollLeft -= loopWidth;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [collections.length]);

  const pauseThenResume = () => {
    pausedRef.current = true;
    clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => { pausedRef.current = false; }, 1400);
  };

  const nudge = (dx) => {
    pauseThenResume();
    trackRef.current?.scrollBy({ left: dx, behavior: 'smooth' });
  };

  if (!collections.length) return null;
  const doubled = [...collections, ...collections];

  return (
    <section className="cstrip reveal">
      <div className="cstrip__head">
        <h2 className="display">Shop by collection</h2>
        <div className="cstrip__arrows">
          <button className="cstrip__arrow" onClick={() => nudge(-260)} aria-label="Scroll left"><ChevronLeft size={16} /></button>
          <button className="cstrip__arrow" onClick={() => nudge(260)} aria-label="Scroll right"><ChevronRight size={16} /></button>
        </div>
      </div>
      <div
        className="cstrip__track"
        ref={trackRef}
        onMouseEnter={() => { pausedRef.current = true; }}
        onMouseLeave={() => { pausedRef.current = false; }}
        onTouchStart={() => { pausedRef.current = true; }}
        onTouchEnd={pauseThenResume}
      >
        {doubled.map((c, i) => (
          <button key={`${c.id}-${i}`} className="cstrip__item" onClick={() => { pauseThenResume(); onPick(c.id); }}>
            <span className="cstrip__circle">
              {c.image ? <img src={c.image} alt="" loading="lazy" /> : <Gem size={20} />}
            </span>
            <span className="cstrip__name">{c.name}</span>
            <span className="cstrip__count">{c.count}</span>
          </button>
        ))}
      </div>
    </section>
  );
}