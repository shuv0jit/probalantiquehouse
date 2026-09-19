/**
 * Pricing / sale resolution.
 *
 * Three distinct concepts, never mixed:
 *   base     — the real admin price stored in the database.
 *   compare  — presentation-only struck-through price (base x stable uplift).
 *   final    — what the customer actually pays: base minus the real configured
 *              sale discount. Always derived from `base` and the real percent.
 *
 * Invariant enforced here: compare > final, always. If a sale discount is ever
 * large enough to make the numbers contradictory, `compare` is raised to sit
 * above `final` instead of showing nonsense.
 */

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** Sales that are active right now. */
export function isLive(sale, today = todayISO()) {
  return Boolean(sale.active) && !sale.deleted_at && sale.starts_at <= today && sale.ends_at >= today;
}

/**
 * Build a lookup of collectionId -> best (highest) live discount percent,
 * propagating each sale down the collection tree: targeting "Jewellery"
 * also discounts "Jewellery > Necklace > Gold Necklace".
 */
export function buildDiscountMap(collections, sales, targets, today = todayISO()) {
  const childrenOf = new Map();
  collections.forEach((c) => {
    const k = c.parent_id ?? 0;
    if (!childrenOf.has(k)) childrenOf.set(k, []);
    childrenOf.get(k).push(c);
  });

  const map = new Map(); // collectionId -> { percent, sale }
  const live = sales.filter((s) => isLive(s, today));

  const apply = (collectionId, sale) => {
    const current = map.get(collectionId);
    if (!current || sale.discount_percent > current.percent) {
      map.set(collectionId, { percent: sale.discount_percent, sale });
    }
    (childrenOf.get(collectionId) || []).forEach((child) => apply(child.id, sale));
  };

  live.forEach((sale) => {
    targets
      .filter((t) => t.sale_id === sale.id)
      .forEach((t) => apply(t.collection_id, sale));
  });

  return map;
}

/** Compute the price block sent to the client for one product. */
export function priceBlock(product, discountEntry) {
  const base = product.price == null ? null : Number(product.price);
  if (base == null) {
    return { base: null, compare: null, final: null, discountPercent: 0, saleName: null };
  }

  const percent = discountEntry ? Number(discountEntry.percent) : 0;
  const final = Math.round(base * (1 - percent / 100));
  const uplift = Number(product.display_uplift) || 1.18;
  let compare = Math.round(base * uplift);
  if (compare <= final) compare = final + Math.max(1, Math.round(final * 0.1));

  return {
    base,
    compare,
    final,
    discountPercent: percent,
    saleName: discountEntry?.sale?.name ?? null,
  };
}
