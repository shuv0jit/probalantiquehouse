-- Probal Antique House — Cloudflare D1 schema
-- Safe to run repeatedly. Every statement is IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS collections (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  slug          TEXT    NOT NULL,
  parent_id     INTEGER REFERENCES collections(id) ON DELETE CASCADE,
  bucket        INTEGER,                -- 2-digit prefix used by the product code generator
  position      INTEGER NOT NULL DEFAULT 0,
  deleted_at    TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_collections_parent  ON collections(parent_id);
CREATE INDEX IF NOT EXISTS idx_collections_deleted ON collections(deleted_at);
CREATE UNIQUE INDEX IF NOT EXISTS ux_collections_bucket ON collections(bucket) WHERE bucket IS NOT NULL;

CREATE TABLE IF NOT EXISTS products (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  code           TEXT    NOT NULL,      -- public 6-digit code, globally unique
  collection_id  INTEGER REFERENCES collections(id) ON DELETE CASCADE,
  title          TEXT,
  description    TEXT,
  price          REAL,                  -- real admin/base price, may be NULL
  display_uplift REAL    NOT NULL DEFAULT 1.18,  -- stable 1.10–1.30 factor for the struck-through price
  featured       INTEGER NOT NULL DEFAULT 0,
  deleted_at     TEXT,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_products_code    ON products(code);
CREATE INDEX IF NOT EXISTS idx_products_collection    ON products(collection_id);
CREATE INDEX IF NOT EXISTS idx_products_deleted       ON products(deleted_at);
CREATE INDEX IF NOT EXISTS idx_products_created       ON products(created_at DESC);

CREATE TABLE IF NOT EXISTS product_images (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url        TEXT    NOT NULL,
  key        TEXT,                      -- object key in B2, for later cleanup
  width      INTEGER,
  height     INTEGER,
  position   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_images_product ON product_images(product_id, position);

CREATE TABLE IF NOT EXISTS sales (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT    NOT NULL,
  discount_percent REAL    NOT NULL,
  starts_at        TEXT    NOT NULL,    -- ISO date (YYYY-MM-DD)
  ends_at          TEXT    NOT NULL,
  active           INTEGER NOT NULL DEFAULT 1,
  deleted_at       TEXT,
  created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sales_window ON sales(starts_at, ends_at, active);

CREATE TABLE IF NOT EXISTS sale_targets (
  sale_id       INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  PRIMARY KEY (sale_id, collection_id)
);

-- Single-row counters / revision marker that powers live sync.
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT OR IGNORE INTO meta (key, value) VALUES ('revision', '1');
INSERT OR IGNORE INTO meta (key, value) VALUES ('next_bucket', '10');
