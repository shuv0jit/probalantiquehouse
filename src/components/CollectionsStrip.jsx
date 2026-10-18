import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Gem } from 'lucide-react';

const SPEED_PX_PER_SEC = 36;

export default function CollectionsStrip({ collections, onPick }) {
  const trackRef = useRef(null);
  const pausedRef = useRef(false);
  const resumeTimer = useRef(null);
  const rafRef = useRef(null);
  const lastT = useRef(0);
  const posRef = useRef(0);

  useEffect(() => {
    if (!collections.length) return undefined;
    const track = trackRef.current;
    if (!track) return undefined;

    const n = collections.length;
    lastT.current = 0;
    posRef.current = track.scrollLeft;

    const tick = (t) => {
      if (!lastT.current) lastT.current = t;
      const dt = Math.min((t - lastT.current) / 1000, 0.05);
      lastT.current = t;

      if (!pausedRef.current) {
        const first = track.children[0];
        const second = track.children[n];
        const loopWidth = first && second ? second.offsetLeft - first.offsetLeft : 0;

        // pick up manual / smooth-scroll movement (arrows, touch, wheel)
        if (Math.abs(track.scrollLeft - posRef.current) > 1.5) {
          posRef.current = track.scrollLeft;
        }

        posRef.current += SPEED_PX_PER_SEC * dt;
        if (loopWidth > 0 && posRef.current >= loopWidth) {
          posRef.current -= loopWidth;
        }
        track.scrollLeft = posRef.current;
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
              {c.image ? <img src={c.image} alt="" loading="lazy" decoding="async" width="56" height="56" /> : <Gem size={20} />}
            </span>
            <span className="cstrip__name">{c.name}</span>
            <span className="cstrip__count">{c.count}</span>
          </button>
        ))}
      </div>
    </section>
  );
}