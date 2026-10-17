import { useCallback, useEffect, useState } from 'react';

const KEY = 'pah:cart';
const EVENT = 'pah:cart-change';

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch { /* storage unavailable */ }
}

/**
 * Cart = array of { code, title, image, price, qty }.
 * One entry per product code — adding an already-present product increases
 * its qty instead of duplicating the row.
 */
export function useCart() {
  const [items, setItems] = useState(read);

  useEffect(() => {
    const sync = () => setItems(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const add = useCallback((product) => {
    const list = read();
    const existing = list.find((i) => i.code === product.code);
    const next = existing
      ? list.map((i) => (i.code === product.code ? { ...i, qty: i.qty + 1 } : i))
      : [...list, {
          code: product.code,
          title: product.title || product.path?.[product.path.length - 1]?.name || `Piece No. ${product.code}`,
          image: product.images?.[0]?.url || product.images?.[0]?.thumbUrl || null,
          price: product.price?.final ?? null,
          qty: 1,
        }];
    write(next);
    setItems(next);
  }, []);

  const setQty = useCallback((code, qty) => {
    const list = read();
    const next = qty <= 0
      ? list.filter((i) => i.code !== code)
      : list.map((i) => (i.code === code ? { ...i, qty } : i));
    write(next);
    setItems(next);
  }, []);

  const remove = useCallback((code) => {
    const next = read().filter((i) => i.code !== code);
    write(next);
    setItems(next);
  }, []);

  const clear = useCallback(() => {
    write([]);
    setItems([]);
  }, []);

  const inCart = useCallback((code) => items.some((i) => i.code === code), [items]);
  const count = items.reduce((sum, i) => sum + i.qty, 0);

  return { items, add, setQty, remove, clear, inCart, count };
}