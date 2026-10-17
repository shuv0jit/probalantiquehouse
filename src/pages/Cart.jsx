import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '../lib/cart.js';
import { money } from '../lib/format.js';

const WHATSAPP = import.meta.env.VITE_WHATSAPP_NUMBER || '';

function CopyCode({ code }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="cart__copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch { /* clipboard unavailable */ }
      }}
      aria-label={`Copy piece number ${code}`}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

export default function Cart() {
  const { items, setQty, remove, clear } = useCart();

  const total = useMemo(
    () => items.reduce((sum, i) => sum + (i.price || 0) * i.qty, 0),
    [items]
  );
  const hasPriced = items.some((i) => i.price != null);

  const waMessage = useMemo(() => {
    const lines = items.map(
      (i) => `• ${i.title} — No. ${i.code} × ${i.qty}${i.price != null ? ` — ${money(i.price * i.qty)}` : ''}`
    );
    const parts = [
      "Hello! I'd like to ask about these pieces from Probal Antique House:",
      '',
      ...lines,
    ];
    if (hasPriced) parts.push('', `Estimated total: ${money(total)}`);
    return parts.join('\n');
  }, [items, total, hasPriced]);

  const waHref = WHATSAPP
    ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(waMessage)}`
    : null;

  if (!items.length) {
    return (
      <div className="shell" style={{ padding: '60px 20px' }}>
        <div className="empty">
          <div className="empty__icon"><ShoppingBag size={24} /></div>
          <h3 className="display">Your cart is empty</h3>
          <p>Add a piece from the catalogue and it will show up here.</p>
          <Link className="btn btn--primary" style={{ marginTop: 20 }} to="/">Browse the catalogue</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="shell" style={{ paddingTop: 24, paddingBottom: 60 }}>
      <h1 className="display" style={{ fontSize: 28, marginBottom: 18 }}>Your cart</h1>

      <div className="cart__list">
        {items.map((item) => (
          <div className="cart__row" key={item.code}>
            {item.image ? (
              <img className="cart__thumb" src={item.image} alt="" />
            ) : (
              <div className="cart__thumb cart__thumb--empty" />
            )}

            <div className="cart__info">
              <Link to={`/product/${item.code}`} className="cart__title">{item.title}</Link>
              <span className="cart__code">
                NO. {item.code}
                <CopyCode code={item.code} />
              </span>
              {item.price != null ? (
                <span className="cart__price">{money(item.price)}</span>
              ) : (
                <span className="price-ask">Price on request</span>
              )}
            </div>

            <div className="cart__qty">
              <button onClick={() => setQty(item.code, item.qty - 1)} aria-label="Decrease quantity">
                <Minus size={13} />
              </button>
              <span>{item.qty}</span>
              <button onClick={() => setQty(item.code, item.qty + 1)} aria-label="Increase quantity">
                <Plus size={13} />
              </button>
            </div>

            <button className="cart__remove" onClick={() => remove(item.code)} aria-label={`Remove ${item.title}`}>
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      <div className="cart__summary">
        {hasPriced && (
          <div className="cart__total">
            <span>Estimated total</span>
            <strong>{money(total)}</strong>
          </div>
        )}
        <p className="cart__note">
          Final pricing, availability and any making charges are confirmed over WhatsApp — this is not an online checkout.
        </p>
        <div className="cart__actions">
          <button className="btn btn--ghost" onClick={clear}>Clear cart</button>
          {waHref ? (
            <a className="btn btn--primary" href={waHref} target="_blank" rel="noopener noreferrer">
              Continue on WhatsApp
            </a>
          ) : (
            <span className="hint">WhatsApp number not configured.</span>
          )}
        </div>
      </div>
    </div>
  );
}