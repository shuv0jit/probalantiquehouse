import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Expand, ImageOff, X } from 'lucide-react';
import { useEscape, useScrollLock } from '../lib/hooks.js';
import { useSwipe } from '../lib/useSwipe.js';

/**
 * Product gallery.
 *  - arrows + dots + thumbnails on desktop,
 *  - finger-tracking swipe on touch,
 *  - hover lens zoom on a pointer device,
 *  - fullscreen lightbox with native pinch-zoom on touch (touch-action: pinch-zoom).
 * Images are `object-fit: contain`, so aspect ratios are never distorted.
 */
export default function Gallery({ images, alt }) {
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [loaded, setLoaded] = useState({});
  const [zoom, setZoom] = useState(null);       // {x,y} in % — desktop lens
  const [lightbox, setLightbox] = useState(false);

  const stageRef = useRef(null);
  const count = images.length;

  const go = useCallback(
    (next) => setIndex((i) => Math.max(0, Math.min(count - 1, typeof next === 'function' ? next(i) : next))),
    [count]
  );

  useSwipe(stageRef, {
    enabled: count > 1,
    onSwipeLeft: () => go((i) => i + 1),
    onSwipeRight: () => go((i) => i - 1),
    onDrag: (dx) => { setDragging(true); setDrag(dx); },
    onEnd: () => { setDragging(false); setDrag(0); },
  });

  useEffect(() => {
    const fn = (e) => {
      if (e.key === 'ArrowRight') go((i) => i + 1);
      if (e.key === 'ArrowLeft') go((i) => i - 1);
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [go]);

  useEscape(() => setLightbox(false), lightbox);
  useScrollLock(lightbox);

  // Preload the neighbours so arrow/swipe feels instant.
  useEffect(() => {
    [index + 1, index - 1].forEach((i) => {
      if (images[i]) { const im = new Image(); im.src = images[i].url; }
    });
  }, [index, images]);

  if (!count) {
    return (
      <div className="gallery">
        <div className="gallery__stage" style={{ display: 'grid', placeItems: 'center', cursor: 'default' }}>
          <div style={{ color: 'var(--ink-4)', textAlign: 'center' }}>
            <ImageOff size={26} />
            <p style={{ marginTop: 8, fontSize: 13 }}>No photograph available</p>
          </div>
        </div>
      </div>
    );
  }

  const stageWidth = stageRef.current?.offsetWidth || 1;
  const shift = -index * 100 + (dragging ? (drag / stageWidth) * 100 : 0);

  return (
    <div className="gallery">
      <div
        ref={stageRef}
        className="gallery__stage"
        onClick={() => !dragging && setLightbox(true)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onMouseLeave={() => setZoom(null)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLightbox(true); } }}
        aria-label="Open full-screen view"
      >
        <div
          className="gallery__track"
          style={{
            transform: `translate3d(${shift}%, 0, 0)`,
            transition: dragging ? 'none' : undefined,
          }}
        >
          {images.map((img, i) => (
            <div className="gallery__slide" key={img.url + i}>
              <img
                className={`gallery__img${loaded[i] ? ' is-loaded' : ''}`}
                src={img.url}
                alt={`${alt} — view ${i + 1} of ${count}`}
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
                fetchpriority={i === 0 ? 'high' : 'auto'}
                width={img.width || undefined}
                height={img.height || undefined}
                onLoad={() => setLoaded((l) => ({ ...l, [i]: true }))}
                style={
                  zoom && i === index && !dragging
                    ? { transform: 'scale(1.85)', transformOrigin: `${zoom.x}% ${zoom.y}%`, transition: 'transform 220ms var(--ease)' }
                    : { transition: 'transform 320ms var(--ease), opacity 420ms var(--ease)' }
                }
              />
            </div>
          ))}
        </div>

        <button
          className="gallery__expand"
          onClick={(e) => { e.stopPropagation(); setLightbox(true); }}
          aria-label="View full screen"
        >
          <Expand size={16} />
        </button>

        {count > 1 && (
          <>
            <button
              className="gallery__arrow gallery__arrow--prev"
              onClick={(e) => { e.stopPropagation(); go((i) => i - 1); }}
              disabled={index === 0}
              style={{ opacity: index === 0 ? 0.35 : 1 }}
              aria-label="Previous photograph"
            >
              <ChevronLeft size={19} />
            </button>
            <button
              className="gallery__arrow gallery__arrow--next"
              onClick={(e) => { e.stopPropagation(); go((i) => i + 1); }}
              disabled={index === count - 1}
              style={{ opacity: index === count - 1 ? 0.35 : 1 }}
              aria-label="Next photograph"
            >
              <ChevronRight size={19} />
            </button>
            <div className="gallery__dots" aria-hidden="true">
              {images.map((_, i) => (
                <span key={i} className={`gallery__dot${i === index ? ' is-on' : ''}`} />
              ))}
            </div>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="thumbs" role="tablist" aria-label="Photographs">
          {images.map((img, i) => (
            <button
              key={img.url + i}
              className={`thumb${i === index ? ' is-on' : ''}`}
              onClick={() => go(i)}
              role="tab"
              aria-selected={i === index}
              aria-label={`Photograph ${i + 1}`}
            >
              <img src={img.url} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(false)} role="dialog" aria-modal="true" aria-label="Full-screen photograph">
          <img src={images[index].url} alt={`${alt} — full screen`} onClick={(e) => e.stopPropagation()} />
          <button className="lightbox__close" onClick={() => setLightbox(false)} aria-label="Close full screen">
            <X size={20} />
          </button>
          {count > 1 && (
            <>
              <button
                className="lightbox__nav lightbox__nav--prev"
                onClick={(e) => { e.stopPropagation(); go((i) => i - 1); }}
                aria-label="Previous"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                className="lightbox__nav lightbox__nav--next"
                onClick={(e) => { e.stopPropagation(); go((i) => i + 1); }}
                aria-label="Next"
              >
                <ChevronRight size={22} />
              </button>
              <span className="lightbox__count">{index + 1} / {count}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
