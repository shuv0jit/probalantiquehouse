import fs from 'node:fs';
import { parseEnv } from 'node:util';
import { all, scalar, run } from '../d1.js';

Object.assign(process.env, parseEnv(fs.readFileSync('.env', 'utf8')));

const EXPECT = {
  sale_targets: ['sale_id', 'collection_id'],
  sales: ['id', 'name', 'discount_percent', 'starts_at', 'ends_at', 'active', 'deleted_at', 'created_at'],
  product_images: ['id', 'product_id', 'url', 'key', 'width', 'height', 'position'],
  products: ['id', 'code', 'collection_id', 'title', 'description', 'price', 'display_uplift',
             'featured', 'deleted_at', 'created_at', 'updated_at'],
  collections: ['id', 'name', 'slug', 'parent_id', 'bucket', 'position', 'deleted_at', 'created_at'],
};

// Children first, so foreign keys never block a drop.
for (const table of ['sale_targets', 'sales', 'product_images', 'products', 'collections']) {
  const cols = await all(`PRAGMA table_info(${table})`);
  if (!cols.length) continue;

  const blockers = cols.filter(
    (c) => !EXPECT[table].includes(c.name) && c.notnull && c.dflt_value == null && !c.pk
  );
  if (!blockers.length) { console.log(`${table}: OK`); continue; }

  const rows = Number(await scalar(`SELECT COUNT(*) FROM ${table}`));
  const names = blockers.map((c) => c.name).join(', ');
  if (rows > 0) {
    console.log(`${table}: has ${rows} rows and required column(s) [${names}] I don't know. NOT touching it. Paste this line to Claude.`);
    continue;
  }
  await run(`DROP TABLE ${table}`);
  console.log(`${table}: was empty with unknown required column(s) [${names}] -> dropped`);
}