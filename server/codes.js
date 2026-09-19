import crypto from 'node:crypto';
import { all, one, run, scalar } from './d1.js';

/**
 * 6-DIGIT PUBLIC PRODUCT CODE
 * ---------------------------
 * Format: BBSSSS
 *   BB   = 2-digit bucket (10–99) permanently assigned to the collection the
 *          product lives in. Sibling/child collections each get their own
 *          bucket, so codes stay visually grouped by collection.
 *   SSSS = 4-digit sequence inside that bucket (0000–9999).
 *
 * Why not the literal `1xxxxx / 101xxx / 11xxxx` example from the brief:
 * that scheme cannot stay exactly 6 digits once you pass 9 collections or
 * 3 levels of nesting — the prefix eats the digits it needs for products.
 * The bucket scheme keeps exactly 6 digits, keeps the collection grouping,
 * and supports 90 collections x 10,000 products = 900,000 codes.
 *
 * Overflow is handled, never silently dropped: if buckets run out, or a
 * bucket fills, the product gets a random unused 6-digit code. The
 * `ux_products_code` UNIQUE index is the final guarantee — a duplicate is
 * physically rejected by the database, and we retry.
 */

const MAX_BUCKET = 99;

export async function ensureBucket(collectionId) {
  const col = await one('SELECT id, bucket FROM collections WHERE id = ?1', [collectionId]);
  if (!col) throw new Error('Collection not found');
  if (col.bucket) return col.bucket;

  const next = Number(await scalar("SELECT value FROM meta WHERE key = 'next_bucket'")) || 10;
  if (next > MAX_BUCKET) return null; // exhausted — caller falls back to random codes

  await run("UPDATE meta SET value = ?1 WHERE key = 'next_bucket'", [String(next + 1)]);
  await run('UPDATE collections SET bucket = ?1 WHERE id = ?2', [next, collectionId]);
  return next;
}

function randomCode() {
  return String(100000 + (crypto.randomInt(0, 900000))); // always 6 digits
}

/**
 * Reserve `count` unique codes for a collection. Returns an array of strings.
 * Reads the taken set once, then allocates in memory — one round trip instead
 * of one per product, which matters when creating 30 products at a time.
 */
export async function allocateCodes(collectionId, count) {
  const bucket = await ensureBucket(collectionId);
  const codes = [];

  if (bucket) {
    const prefix = String(bucket);
    const taken = new Set(
      (await all('SELECT code FROM products WHERE code LIKE ?1', [`${prefix}%`])).map((r) => r.code)
    );
    for (let seq = 0; seq <= 9999 && codes.length < count; seq++) {
      const code = prefix + String(seq).padStart(4, '0');
      if (!taken.has(code)) {
        codes.push(code);
        taken.add(code);
      }
    }
  }

  if (codes.length < count) {
    const takenAll = new Set((await all('SELECT code FROM products')).map((r) => r.code));
    codes.forEach((c) => takenAll.add(c));
    let guard = 0;
    while (codes.length < count && guard++ < 100000) {
      const c = randomCode();
      if (!takenAll.has(c)) {
        codes.push(c);
        takenAll.add(c);
      }
    }
  }

  if (codes.length < count) {
    throw new Error('Could not allocate enough unique product codes');
  }
  return codes;
}

/**
 * STABLE DISPLAY UPLIFT
 * ---------------------
 * The struck-through "reference" price is the base price multiplied by a
 * factor between 1.10 and 1.30. That factor is derived deterministically from
 * the product code and stored on the row, so it never changes on reload and
 * never contradicts the real price. The real price and the real sale discount
 * are always what the customer actually pays — the uplift is presentation only.
 */
export function upliftForCode(code) {
  const h = crypto.createHash('sha256').update(String(code)).digest();
  const pct = 10 + (h[0] % 21); // 10..30
  return 1 + pct / 100;
}
