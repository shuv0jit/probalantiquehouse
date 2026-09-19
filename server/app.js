import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';

import { all, one, run, scalar, batch, exec, DbError, dbConfigured } from './d1.js';
import { COOKIE_NAME, cookieOptions, requireAdmin, signToken, verifyPassword, verifyToken } from './auth.js';
import { allocateCodes, upliftForCode } from './codes.js';
import { buildDiscountMap, isLive, priceBlock, todayISO } from './pricing.js';
import { deleteObjects, presignUpload, storageConfigured } from './storage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

/* ------------------------------------------------------------------ utils */

const ok = (res, data) => res.json(data);
const fail = (res, status, message, detail) =>
  res.status(status).json(detail ? { error: message, detail } : { error: message });

/** Wrap async handlers so a rejected promise never hangs the request. */
const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60) || 'item';

const nowISO = () => new Date().toISOString();

/** Bump the global revision — this is what drives live sync on every client. */
async function bumpRevision() {
  await run("UPDATE meta SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT) WHERE key = 'revision'");
  return Number(await scalar("SELECT value FROM meta WHERE key = 'revision'"));
}

const str = (v, max = 200) => (v == null ? null : String(v).trim().slice(0, max) || null);
const num = (v) => (v === '' || v == null ? null : Number.isFinite(Number(v)) ? Number(v) : null);
const int = (v, d = 0) => (Number.isFinite(parseInt(v, 10)) ? parseInt(v, 10) : d);

/* --------------------------------------------------------- shared loaders */

async function loadTree({ includeDeleted = false } = {}) {
  const where = includeDeleted ? '' : 'WHERE deleted_at IS NULL';
  return all(
    `SELECT id, name, slug, parent_id, bucket, position, deleted_at
     FROM collections ${where}
     ORDER BY position ASC, name ASC`
  );
}

async function loadDiscountContext() {
  const [collections, sales, targets] = await Promise.all([
    loadTree(),
    all('SELECT * FROM sales WHERE deleted_at IS NULL'),
    all('SELECT * FROM sale_targets'),
  ]);
  return { collections, sales, targets, map: buildDiscountMap(collections, sales, targets) };
}

/** All descendant ids of a collection, inclusive. */
function subtreeIds(collections, rootId) {
  const kids = new Map();
  collections.forEach((c) => {
    const k = c.parent_id ?? 0;
    if (!kids.has(k)) kids.set(k, []);
    kids.get(k).push(c.id);
  });
  const out = [];
  const walk = (id) => {
    out.push(id);
    (kids.get(id) || []).forEach(walk);
  };
  walk(Number(rootId));
  return out;
}

async function attachImages(products) {
  if (!products.length) return products;
  const ids = products.map((p) => p.id);
  const placeholders = ids.map((_, i) => `?${i + 1}`).join(',');
  const images = await all(
    `SELECT product_id, url, key, width, height, position
     FROM product_images WHERE product_id IN (${placeholders})
     ORDER BY position ASC, id ASC`,
    ids
  );
  const byProduct = new Map();
  images.forEach((img) => {
    if (!byProduct.has(img.product_id)) byProduct.set(img.product_id, []);
    byProduct.get(img.product_id).push(img);
  });
  products.forEach((p) => {
    p.images = byProduct.get(p.id) || [];
  });
  return products;
}

function shapeProduct(p, discountMap, collectionsById) {
  const col = collectionsById.get(p.collection_id);
  const path = [];
  let cur = col;
  while (cur) {
    path.unshift({ id: cur.id, name: cur.name, slug: cur.slug });
    cur = cur.parent_id ? collectionsById.get(cur.parent_id) : null;
  }
  return {
    id: p.id,
    code: p.code,
    title: p.title,
    description: p.description,
    featured: !!p.featured,
    collectionId: p.collection_id,
    path,
    images: (p.images || []).map((i) => ({ url: i.url, width: i.width, height: i.height })),
    price: priceBlock(p, discountMap.get(p.collection_id)),
    createdAt: p.created_at,
  };
}

/* ------------------------------------------------------------ live sync */

app.get(
  '/api/revision',
  h(async (req, res) => {
    const revision = Number(await scalar("SELECT value FROM meta WHERE key = 'revision'")) || 0;
    res.set('Cache-Control', 'no-store');
    ok(res, { revision });
  })
);

app.get(
  '/api/health',
  h(async (req, res) => {
    ok(res, {
      database: dbConfigured(),
      storage: storageConfigured(),
      auth: Boolean(process.env.JWT_SECRET && process.env.ADMIN_PASSWORD_HASH),
    });
  })
);

/* -------------------------------------------------------------- public */

app.get(
  '/api/bootstrap',
  h(async (req, res) => {
    const [collections, sales, targets, revision, counts] = await Promise.all([
      loadTree(),
      all('SELECT * FROM sales WHERE deleted_at IS NULL AND active = 1'),
      all('SELECT * FROM sale_targets'),
      scalar("SELECT value FROM meta WHERE key = 'revision'"),
      all(
        `SELECT collection_id, COUNT(*) AS n FROM products
         WHERE deleted_at IS NULL GROUP BY collection_id`
      ),
    ]);

    const today = todayISO();
    const liveSales = sales.filter((s) => isLive(s, today));
    const directCount = new Map(counts.map((c) => [c.collection_id, c.n]));

    // roll counts up the tree so a parent shows everything beneath it
    const rolled = new Map();
    const kids = new Map();
    collections.forEach((c) => {
      const k = c.parent_id ?? 0;
      if (!kids.has(k)) kids.set(k, []);
      kids.get(k).push(c);
    });
    const rollup = (c) => {
      let total = directCount.get(c.id) || 0;
      (kids.get(c.id) || []).forEach((child) => {
        total += rollup(child);
      });
      rolled.set(c.id, total);
      return total;
    };
    (kids.get(0) || []).forEach(rollup);

    ok(res, {
      revision: Number(revision) || 0,
      collections: collections.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        parentId: c.parent_id,
        count: rolled.get(c.id) || 0,
      })),
      sales: liveSales.map((s) => ({
        id: s.id,
        name: s.name,
        discountPercent: s.discount_percent,
        endsAt: s.ends_at,
        collectionIds: targets.filter((t) => t.sale_id === s.id).map((t) => t.collection_id),
      })),
      totalProducts: [...directCount.values()].reduce((a, b) => a + b, 0),
    });
  })
);

app.get(
  '/api/products',
  h(async (req, res) => {
    const limit = Math.min(60, Math.max(1, int(req.query.limit, 24)));
    const page = Math.max(1, int(req.query.page, 1));
    const offset = (page - 1) * limit;
    const sort = ['newest', 'oldest', 'price_asc', 'price_desc'].includes(req.query.sort)
      ? req.query.sort
      : 'newest';

    const { collections, map } = await loadDiscountContext();
    const collectionsById = new Map(collections.map((c) => [c.id, c]));

    let where = 'p.deleted_at IS NULL';
    const params = [];
    if (req.query.collection) {
      const ids = subtreeIds(collections, req.query.collection).filter((id) =>
        collectionsById.has(id)
      );
      if (!ids.length) return ok(res, { products: [], total: 0, page, pages: 0 });
      where += ` AND p.collection_id IN (${ids.map((_, i) => `?${i + 1}`).join(',')})`;
      params.push(...ids);
    }

    const orderBy = {
      newest: 'p.created_at DESC, p.id DESC',
      oldest: 'p.created_at ASC, p.id ASC',
      price_asc: 'p.price IS NULL, p.price ASC',
      price_desc: 'p.price IS NULL, p.price DESC',
    }[sort];

    const total = Number(
      await scalar(`SELECT COUNT(*) AS n FROM products p WHERE ${where}`, params)
    );
    const rows = await all(
      `SELECT p.* FROM products p WHERE ${where}
       ORDER BY ${orderBy} LIMIT ?${params.length + 1} OFFSET ?${params.length + 2}`,
      [...params, limit, offset]
    );
    await attachImages(rows);

    ok(res, {
      products: rows.map((p) => shapeProduct(p, map, collectionsById)),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  })
);

app.get(
  '/api/products/:code',
  h(async (req, res) => {
    const code = String(req.params.code).replace(/\D/g, '');
    const product = await one('SELECT * FROM products WHERE code = ?1 AND deleted_at IS NULL', [code]);
    if (!product) return fail(res, 404, 'That product is no longer available.');

    const { collections, map } = await loadDiscountContext();
    const collectionsById = new Map(collections.map((c) => [c.id, c]));
    await attachImages([product]);

    const related = await all(
      `SELECT * FROM products
       WHERE collection_id = ?1 AND deleted_at IS NULL AND id != ?2
       ORDER BY created_at DESC LIMIT 8`,
      [product.collection_id, product.id]
    );
    await attachImages(related);

    ok(res, {
      product: shapeProduct(product, map, collectionsById),
      related: related.map((p) => shapeProduct(p, map, collectionsById)),
    });
  })
);

app.get(
  '/api/search',
  h(async (req, res) => {
    const q = String(req.query.q || '').trim().slice(0, 60);
    if (q.length < 1) return ok(res, { collections: [], products: [] });

    const { collections, map } = await loadDiscountContext();
    const collectionsById = new Map(collections.map((c) => [c.id, c]));
    const needle = q.toLowerCase();

    const matchedCollections = collections
      .filter((c) => c.name.toLowerCase().includes(needle))
      .slice(0, 6)
      .map((c) => {
        const trail = [];
        let cur = c;
        while (cur) {
          trail.unshift(cur.name);
          cur = cur.parent_id ? collectionsById.get(cur.parent_id) : null;
        }
        return { id: c.id, name: c.name, trail };
      });

    // Product matches: by code (exact/partial) and by title/description.
    const digits = q.replace(/\D/g, '');
    const rows = await all(
      `SELECT * FROM products
       WHERE deleted_at IS NULL
         AND ( (?1 != '' AND code LIKE ?2)
            OR LOWER(COALESCE(title,'')) LIKE ?3
            OR LOWER(COALESCE(description,'')) LIKE ?3 )
       ORDER BY (code = ?1) DESC, created_at DESC
       LIMIT 8`,
      [digits, `${digits}%`, `%${needle}%`]
    );

    // Also surface products inside a matched collection, so "necklace" returns items.
    let extra = [];
    if (matchedCollections.length && rows.length < 8) {
      const ids = matchedCollections.flatMap((c) => subtreeIds(collections, c.id));
      const unique = [...new Set(ids)];
      extra = await all(
        `SELECT * FROM products
         WHERE deleted_at IS NULL AND collection_id IN (${unique.map((_, i) => `?${i + 1}`).join(',')})
         ORDER BY created_at DESC LIMIT ?${unique.length + 1}`,
        [...unique, 8 - rows.length]
      );
    }

    const seen = new Set();
    const products = [...rows, ...extra].filter((p) => !seen.has(p.id) && seen.add(p.id)).slice(0, 8);
    await attachImages(products);

    ok(res, {
      collections: matchedCollections,
      products: products.map((p) => shapeProduct(p, map, collectionsById)),
    });
  })
);

/* --------------------------------------------------------------- auth */

app.post(
  '/api/admin/login',
  h(async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const expected = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();

    // Constant-ish work regardless of which field is wrong.
    const emailOk = expected && email === expected;
    const passOk = verifyPassword(password);

    if (!emailOk || !passOk) {
      return fail(res, 401, 'Email or password is incorrect.');
    }
    const token = signToken({ role: 'admin', email });
    res.cookie(COOKIE_NAME, token, cookieOptions());
    ok(res, { admin: { email } });
  })
);

app.post('/api/admin/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
  ok(res, { ok: true });
});

app.get('/api/admin/me', (req, res) => {
  const payload = verifyToken(req.cookies?.[COOKIE_NAME]);
  if (!payload || payload.role !== 'admin') return fail(res, 401, 'Not signed in.');
  ok(res, { admin: { email: payload.email }, expiresAt: payload.exp * 1000 });
});

/** One-time schema bootstrap, guarded by SETUP_TOKEN. */
app.post(
  '/api/admin/migrate',
  h(async (req, res) => {
    const token = process.env.SETUP_TOKEN;
    if (!token || req.get('x-setup-token') !== token) return fail(res, 403, 'Setup token required.');
    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await exec(sql);
    ok(res, { ok: true });
  })
);

app.use('/api/admin', requireAdmin);

/* -------------------------------------------------------- admin: reads */

app.get(
  '/api/admin/overview',
  h(async (req, res) => {
    const [collections, products, deletedProducts, deletedCollections, sales, images] = await Promise.all([
      loadTree({ includeDeleted: true }),
      scalar('SELECT COUNT(*) FROM products WHERE deleted_at IS NULL'),
      scalar('SELECT COUNT(*) FROM products WHERE deleted_at IS NOT NULL'),
      scalar('SELECT COUNT(*) FROM collections WHERE deleted_at IS NOT NULL'),
      all('SELECT * FROM sales WHERE deleted_at IS NULL ORDER BY starts_at DESC'),
      scalar('SELECT COUNT(*) FROM product_images'),
    ]);
    const today = todayISO();
    ok(res, {
      stats: {
        collections: collections.filter((c) => !c.deleted_at).length,
        products: Number(products) || 0,
        images: Number(images) || 0,
        deleted: (Number(deletedProducts) || 0) + (Number(deletedCollections) || 0),
        activeSales: sales.filter((s) => isLive(s, today)).length,
      },
      collections: collections.map((c) => ({
        id: c.id,
        name: c.name,
        parentId: c.parent_id,
        bucket: c.bucket,
        deleted: !!c.deleted_at,
      })),
    });
  })
);

app.get(
  '/api/admin/products',
  h(async (req, res) => {
    const limit = Math.min(100, Math.max(1, int(req.query.limit, 30)));
    const page = Math.max(1, int(req.query.page, 1));
    const deleted = req.query.deleted === '1';
    const search = String(req.query.q || '').trim().toLowerCase();

    const collections = await loadTree({ includeDeleted: true });
    const collectionsById = new Map(collections.map((c) => [c.id, c]));

    let where = deleted ? 'p.deleted_at IS NOT NULL' : 'p.deleted_at IS NULL';
    const params = [];
    if (req.query.collection) {
      const ids = subtreeIds(collections, req.query.collection);
      where += ` AND p.collection_id IN (${ids.map((_, i) => `?${params.length + i + 1}`).join(',')})`;
      params.push(...ids);
    }
    if (search) {
      where += ` AND (p.code LIKE ?${params.length + 1} OR LOWER(COALESCE(p.title,'')) LIKE ?${params.length + 2})`;
      params.push(`%${search.replace(/\D/g, '')}%`, `%${search}%`);
    }

    const total = Number(await scalar(`SELECT COUNT(*) FROM products p WHERE ${where}`, params));
    const rows = await all(
      `SELECT p.* FROM products p WHERE ${where}
       ORDER BY p.created_at DESC, p.id DESC
       LIMIT ?${params.length + 1} OFFSET ?${params.length + 2}`,
      [...params, limit, (page - 1) * limit]
    );
    await attachImages(rows);

    const { map } = await loadDiscountContext();
    ok(res, {
      products: rows.map((p) => ({
        ...shapeProduct(p, map, collectionsById),
        deleted: !!p.deleted_at,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  })
);

app.get(
  '/api/admin/deleted',
  h(async (req, res) => {
    const collections = await all(
      'SELECT * FROM collections WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC'
    );
    const products = await all(
      'SELECT * FROM products WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC LIMIT 200'
    );
    await attachImages(products);
    const allCols = await loadTree({ includeDeleted: true });
    const byId = new Map(allCols.map((c) => [c.id, c]));
    ok(res, {
      collections: collections.map((c) => ({
        id: c.id,
        name: c.name,
        parentName: c.parent_id ? byId.get(c.parent_id)?.name ?? null : null,
        deletedAt: c.deleted_at,
      })),
      products: products.map((p) => ({
        id: p.id,
        code: p.code,
        price: p.price,
        image: p.images?.[0]?.url ?? null,
        collectionName: byId.get(p.collection_id)?.name ?? '—',
        deletedAt: p.deleted_at,
      })),
    });
  })
);

/* -------------------------------------------------- admin: collections */

app.post(
  '/api/admin/collections',
  h(async (req, res) => {
    const name = str(req.body?.name, 80);
    if (!name) return fail(res, 400, 'Please enter a collection name.');
    const parentId = req.body?.parentId ? int(req.body.parentId) : null;

    if (parentId) {
      const parent = await one('SELECT id FROM collections WHERE id = ?1 AND deleted_at IS NULL', [parentId]);
      if (!parent) return fail(res, 400, 'The parent collection no longer exists.');
    }

    const dupe = await one(
      `SELECT id FROM collections
       WHERE LOWER(name) = LOWER(?1) AND deleted_at IS NULL
         AND (parent_id IS ?2 OR parent_id = ?2)`,
      [name, parentId]
    );
    if (dupe) return fail(res, 409, 'A collection with that name already exists here.');

    const pos = Number(await scalar(
      'SELECT COALESCE(MAX(position), 0) + 1 FROM collections WHERE parent_id IS ?1 OR parent_id = ?1',
      [parentId]
    )) || 1;

    const meta = await run(
      'INSERT INTO collections (name, slug, parent_id, position) VALUES (?1, ?2, ?3, ?4)',
      [name, slugify(name), parentId, pos]
    );
    const revision = await bumpRevision();
    ok(res, { id: meta.last_row_id, revision });
  })
);

app.patch(
  '/api/admin/collections/:id',
  h(async (req, res) => {
    const id = int(req.params.id);
    const current = await one('SELECT * FROM collections WHERE id = ?1', [id]);
    if (!current) return fail(res, 404, 'Collection not found.');

    const name = str(req.body?.name, 80) ?? current.name;
    let parentId = req.body?.parentId === undefined ? current.parent_id : (req.body.parentId ? int(req.body.parentId) : null);

    if (parentId) {
      const collections = await loadTree({ includeDeleted: true });
      // A collection cannot be moved inside its own subtree.
      if (subtreeIds(collections, id).includes(parentId)) {
        return fail(res, 400, 'A collection cannot be moved inside itself.');
      }
    }

    await run('UPDATE collections SET name = ?1, slug = ?2, parent_id = ?3 WHERE id = ?4', [
      name,
      slugify(name),
      parentId,
      id,
    ]);
    const revision = await bumpRevision();
    ok(res, { ok: true, revision });
  })
);

/** Impact preview shown in the delete confirmation. */
app.get(
  '/api/admin/collections/:id/impact',
  h(async (req, res) => {
    const collections = await loadTree({ includeDeleted: true });
    const ids = subtreeIds(collections, int(req.params.id));
    const products = Number(
      await scalar(
        `SELECT COUNT(*) FROM products WHERE deleted_at IS NULL
         AND collection_id IN (${ids.map((_, i) => `?${i + 1}`).join(',')})`,
        ids
      )
    );
    ok(res, { collections: ids.length - 1, products });
  })
);

app.delete(
  '/api/admin/collections/:id',
  h(async (req, res) => {
    const collections = await loadTree({ includeDeleted: true });
    const ids = subtreeIds(collections, int(req.params.id));
    const stamp = nowISO();
    const ph = ids.map((_, i) => `?${i + 2}`).join(',');
    await batch([
      { sql: `UPDATE collections SET deleted_at = ?1 WHERE id IN (${ph})`, params: [stamp, ...ids] },
      { sql: `UPDATE products SET deleted_at = ?1 WHERE collection_id IN (${ph}) AND deleted_at IS NULL`, params: [stamp, ...ids] },
    ]);
    const revision = await bumpRevision();
    ok(res, { ok: true, revision, affected: ids.length });
  })
);

app.post(
  '/api/admin/collections/:id/restore',
  h(async (req, res) => {
    const id = int(req.params.id);
    const collections = await loadTree({ includeDeleted: true });
    const byId = new Map(collections.map((c) => [c.id, c]));

    // Restoring a child whose parent is still deleted would orphan it in the UI.
    const target = byId.get(id);
    if (!target) return fail(res, 404, 'Collection not found.');
    if (target.parent_id && byId.get(target.parent_id)?.deleted_at) {
      return fail(res, 400, 'Restore the parent collection first, otherwise this one has nowhere to live.');
    }

    const ids = subtreeIds(collections, id);
    const ph = ids.map((_, i) => `?${i + 1}`).join(',');
    await batch([
      { sql: `UPDATE collections SET deleted_at = NULL WHERE id IN (${ph})`, params: ids },
      { sql: `UPDATE products SET deleted_at = NULL WHERE collection_id IN (${ph})`, params: ids },
    ]);
    const revision = await bumpRevision();
    ok(res, { ok: true, revision });
  })
);

app.delete(
  '/api/admin/collections/:id/permanent',
  h(async (req, res) => {
    const collections = await loadTree({ includeDeleted: true });
    const ids = subtreeIds(collections, int(req.params.id));
    const ph = ids.map((_, i) => `?${i + 1}`).join(',');

    const keys = (
      await all(
        `SELECT pi.key FROM product_images pi
         JOIN products p ON p.id = pi.product_id
         WHERE p.collection_id IN (${ph})`,
        ids
      )
    ).map((r) => r.key);

    await batch([
      {
        sql: `DELETE FROM product_images WHERE product_id IN (
                SELECT id FROM products WHERE collection_id IN (${ph}))`,
        params: ids,
      },
      { sql: `DELETE FROM products WHERE collection_id IN (${ph})`, params: ids },
      { sql: `DELETE FROM sale_targets WHERE collection_id IN (${ph})`, params: ids },
      { sql: `DELETE FROM collections WHERE id IN (${ph})`, params: ids },
    ]);

    const storage = await deleteObjects(keys);
    const revision = await bumpRevision();
    ok(res, { ok: true, revision, ...storage });
  })
);

/* ----------------------------------------------------- admin: uploads */

app.post(
  '/api/admin/uploads/presign',
  h(async (req, res) => {
    if (!storageConfigured()) return fail(res, 500, 'Image storage is not configured.', 'Set B2_* environment variables.');
    const files = Array.isArray(req.body?.files) ? req.body.files.slice(0, 60) : [];
    if (!files.length) return fail(res, 400, 'No files to upload.');
    const signed = [];
    for (const f of files) {
      signed.push(await presignUpload({ contentType: f.contentType, size: f.size }));
    }
    ok(res, { uploads: signed });
  })
);

/* ---------------------------------------------------- admin: products */

/**
 * Batch product creation.
 * Body: { collectionId, imagesPerProduct, price, groups: [[{url,key,width,height}, ...], ...] }
 * The client groups already-uploaded images; the server validates and writes
 * everything in one D1 batch so a failure cannot leave half-built products.
 */
app.post(
  '/api/admin/products',
  h(async (req, res) => {
    const collectionId = int(req.body?.collectionId);
    const groups = Array.isArray(req.body?.groups) ? req.body.groups : [];
    const price = num(req.body?.price);
    const title = str(req.body?.title, 120);

    if (!collectionId) return fail(res, 400, 'Choose a collection first.');
    const collection = await one('SELECT id FROM collections WHERE id = ?1 AND deleted_at IS NULL', [collectionId]);
    if (!collection) return fail(res, 400, 'That collection no longer exists.');
    if (!groups.length) return fail(res, 400, 'Add at least one image.');
    if (groups.some((g) => !Array.isArray(g) || g.length === 0)) {
      return fail(res, 400, 'One of the products has no images.');
    }
    if (price != null && price < 0) return fail(res, 400, 'Price cannot be negative.');

    const codes = await allocateCodes(collectionId, groups.length);
    const statements = [];

    groups.forEach((imgs, i) => {
      const code = codes[i];
      statements.push({
        sql: `INSERT INTO products (code, collection_id, title, price, display_uplift)
              VALUES (?1, ?2, ?3, ?4, ?5)`,
        params: [code, collectionId, title, price, upliftForCode(code)],
      });
      imgs.slice(0, 12).forEach((img, idx) => {
        statements.push({
          sql: `INSERT INTO product_images (product_id, url, key, width, height, position)
                VALUES ((SELECT id FROM products WHERE code = ?1), ?2, ?3, ?4, ?5, ?6)`,
          params: [code, String(img.url), str(img.key, 300), int(img.width, 0) || null, int(img.height, 0) || null, idx],
        });
      });
    });

    // If anything fails midway, remove every product (and its images) this
    // request created, so a partial batch can never survive.
    const undo = [
      {
        sql: `DELETE FROM product_images WHERE product_id IN (
                SELECT id FROM products WHERE code IN (${codes.map((_, i) => `?${i + 1}`).join(',')}))`,
        params: codes,
      },
      {
        sql: `DELETE FROM products WHERE code IN (${codes.map((_, i) => `?${i + 1}`).join(',')})`,
        params: codes,
      },
    ];

    await batch(statements, undo);
    const revision = await bumpRevision();
    ok(res, { created: groups.length, codes, revision });
  })
);

app.patch(
  '/api/admin/products/:id',
  h(async (req, res) => {
    const id = int(req.params.id);
    const product = await one('SELECT * FROM products WHERE id = ?1', [id]);
    if (!product) return fail(res, 404, 'Product not found.');

    const price = req.body?.price === undefined ? product.price : num(req.body.price);
    if (price != null && price < 0) return fail(res, 400, 'Price cannot be negative.');
    const collectionId = req.body?.collectionId ? int(req.body.collectionId) : product.collection_id;
    const title = req.body?.title === undefined ? product.title : str(req.body.title, 120);
    const description = req.body?.description === undefined ? product.description : str(req.body.description, 800);
    const featured = req.body?.featured === undefined ? product.featured : req.body.featured ? 1 : 0;

    if (collectionId !== product.collection_id) {
      const target = await one('SELECT id FROM collections WHERE id = ?1 AND deleted_at IS NULL', [collectionId]);
      if (!target) return fail(res, 400, 'That collection no longer exists.');
    }

    const statements = [
      {
        sql: `UPDATE products SET price = ?1, collection_id = ?2, title = ?3, description = ?4,
              featured = ?5, updated_at = ?6 WHERE id = ?7`,
        params: [price, collectionId, title, description, featured, nowISO(), id],
      },
    ];

    // Optional full image replacement
    if (Array.isArray(req.body?.images)) {
      statements.push({ sql: 'DELETE FROM product_images WHERE product_id = ?1', params: [id] });
      req.body.images.slice(0, 12).forEach((img, idx) => {
        statements.push({
          sql: `INSERT INTO product_images (product_id, url, key, width, height, position)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
          params: [id, String(img.url), str(img.key, 300), int(img.width, 0) || null, int(img.height, 0) || null, idx],
        });
      });
    }

    await batch(statements);
    const revision = await bumpRevision();
    ok(res, { ok: true, revision });
  })
);

app.delete(
  '/api/admin/products/:id',
  h(async (req, res) => {
    await run('UPDATE products SET deleted_at = ?1 WHERE id = ?2', [nowISO(), int(req.params.id)]);
    const revision = await bumpRevision();
    ok(res, { ok: true, revision });
  })
);

app.post(
  '/api/admin/products/:id/restore',
  h(async (req, res) => {
    const id = int(req.params.id);
    const product = await one('SELECT collection_id FROM products WHERE id = ?1', [id]);
    if (!product) return fail(res, 404, 'Product not found.');
    const col = await one('SELECT deleted_at FROM collections WHERE id = ?1', [product.collection_id]);
    if (col?.deleted_at) {
      return fail(res, 400, 'Restore its collection first — otherwise the product would be invisible to customers.');
    }
    await run('UPDATE products SET deleted_at = NULL WHERE id = ?1', [id]);
    const revision = await bumpRevision();
    ok(res, { ok: true, revision });
  })
);

app.delete(
  '/api/admin/products/:id/permanent',
  h(async (req, res) => {
    const id = int(req.params.id);
    const keys = (await all('SELECT key FROM product_images WHERE product_id = ?1', [id])).map((r) => r.key);
    await batch([
      { sql: 'DELETE FROM product_images WHERE product_id = ?1', params: [id] },
      { sql: 'DELETE FROM products WHERE id = ?1', params: [id] },
    ]);
    const storage = await deleteObjects(keys);
    const revision = await bumpRevision();
    ok(res, { ok: true, revision, ...storage });
  })
);

/* ------------------------------------------------------- admin: sales */

app.get(
  '/api/admin/sales',
  h(async (req, res) => {
    const sales = await all('SELECT * FROM sales WHERE deleted_at IS NULL ORDER BY starts_at DESC');
    const targets = await all('SELECT * FROM sale_targets');
    const today = todayISO();
    ok(res, {
      sales: sales.map((s) => ({
        id: s.id,
        name: s.name,
        discountPercent: s.discount_percent,
        startsAt: s.starts_at,
        endsAt: s.ends_at,
        active: !!s.active,
        status: !s.active
          ? 'inactive'
          : isLive(s, today)
          ? 'live'
          : s.starts_at > today
          ? 'upcoming'
          : 'expired',
        collectionIds: targets.filter((t) => t.sale_id === s.id).map((t) => t.collection_id),
      })),
    });
  })
);

function validateSale(body) {
  const name = str(body?.name, 80);
  const discount = num(body?.discountPercent);
  const startsAt = str(body?.startsAt, 10);
  const endsAt = str(body?.endsAt, 10);
  const ids = Array.isArray(body?.collectionIds) ? body.collectionIds.map(Number).filter(Boolean) : [];

  if (!name) return { error: 'Give the sale a name.' };
  if (discount == null || discount <= 0 || discount > 90) return { error: 'Discount must be between 1% and 90%.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startsAt || '') || !/^\d{4}-\d{2}-\d{2}$/.test(endsAt || '')) {
    return { error: 'Please provide valid start and end dates.' };
  }
  if (endsAt < startsAt) return { error: 'The end date cannot be before the start date.' };
  if (!ids.length) return { error: 'Select at least one collection for this sale.' };
  return { name, discount, startsAt, endsAt, ids };
}

app.post(
  '/api/admin/sales',
  h(async (req, res) => {
    const v = validateSale(req.body);
    if (v.error) return fail(res, 400, v.error);
    const meta = await run(
      `INSERT INTO sales (name, discount_percent, starts_at, ends_at, active)
       VALUES (?1, ?2, ?3, ?4, ?5)`,
      [v.name, v.discount, v.startsAt, v.endsAt, req.body?.active === false ? 0 : 1]
    );
    const saleId = meta.last_row_id;
    await batch(
      v.ids.map((cid) => ({
        sql: 'INSERT OR IGNORE INTO sale_targets (sale_id, collection_id) VALUES (?1, ?2)',
        params: [saleId, cid],
      }))
    );
    const revision = await bumpRevision();
    ok(res, { id: saleId, revision });
  })
);

app.patch(
  '/api/admin/sales/:id',
  h(async (req, res) => {
    const id = int(req.params.id);
    const existing = await one('SELECT * FROM sales WHERE id = ?1 AND deleted_at IS NULL', [id]);
    if (!existing) return fail(res, 404, 'Sale not found.');

    // Toggle-only update
    if (Object.keys(req.body || {}).length === 1 && 'active' in req.body) {
      await run('UPDATE sales SET active = ?1 WHERE id = ?2', [req.body.active ? 1 : 0, id]);
      const revision = await bumpRevision();
      return ok(res, { ok: true, revision });
    }

    const v = validateSale(req.body);
    if (v.error) return fail(res, 400, v.error);
    const statements = [
      {
        sql: `UPDATE sales SET name = ?1, discount_percent = ?2, starts_at = ?3, ends_at = ?4, active = ?5
              WHERE id = ?6`,
        params: [v.name, v.discount, v.startsAt, v.endsAt, req.body?.active === false ? 0 : 1, id],
      },
      { sql: 'DELETE FROM sale_targets WHERE sale_id = ?1', params: [id] },
      ...v.ids.map((cid) => ({
        sql: 'INSERT OR IGNORE INTO sale_targets (sale_id, collection_id) VALUES (?1, ?2)',
        params: [id, cid],
      })),
    ];
    await batch(statements);
    const revision = await bumpRevision();
    ok(res, { ok: true, revision });
  })
);

app.delete(
  '/api/admin/sales/:id',
  h(async (req, res) => {
    const id = int(req.params.id);
    await batch([
      { sql: 'DELETE FROM sale_targets WHERE sale_id = ?1', params: [id] },
      { sql: 'DELETE FROM sales WHERE id = ?1', params: [id] },
    ]);
    const revision = await bumpRevision();
    ok(res, { ok: true, revision });
  })
);

/* ------------------------------------------------------ error handler */

app.use('/api', (req, res) => fail(res, 404, 'Endpoint not found.'));

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const isAdmin = req.path.startsWith('/api/admin');
   if (err instanceof DbError) {
    console.error('[db]', err.message, '-', err.detail);
    return fail(res, 503, 'Something went wrong. Please try again.', isAdmin ? err.detail : undefined);
  }
  if (err?.status === 400) return fail(res, 400, err.message);
  console.error('[api]', err);
  fail(res, 500, 'Something went wrong. Please try again.', isAdmin ? err.message : undefined);
});

export default app;
