import { Sparkles, X } from 'lucide-react';
import { countdown, pct } from '../lib/format.js';
import { useLocal } from '../lib/hooks.js';
import { useStore } from '../lib/store.jsx';

/**
 * Slim promotional bar. Shows the strongest live sale, disappears on its own
 * when the sale expires (the API stops returning it), and stays dismissed for
 * that particular sale only.
 */
export default function SaleBanner() {
  const { sales } = useStore();
  const [dismissed, setDismissed] = useLocal('pah:sale-dismissed', []);

  const best = sales.reduce((a, b) => (!a || b.discountPercent > a.discountPercent ? b : a), null);
  if (!best || dismissed.includes(best.id)) return null;

  const ends = countdown(best.endsAt);
  if (!ends) return null;

  return (
    <div className="salebar">
      <div className="salebar__in">
        <Sparkles size={14} className="salebar__spark" />
        <span className="salebar__name">{best.name}</span>
        <span className="salebar__pct">Up to {pct(best.discountPercent)} off</span>
        <span className="salebar__count">{ends}</span>
        <button
          className="salebar__close"
          aria-label="Dismiss sale announcement"
          onClick={() => setDismissed((d) => [...d, best.id])}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
