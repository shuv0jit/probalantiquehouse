import fs from 'node:fs';
import { parseEnv } from 'node:util';
import { all, run } from '../d1.js';

Object.assign(process.env, parseEnv(fs.readFileSync('.env', 'utf8')));

const WANT = {
  collections: {
    name: 'TEXT', slug: 'TEXT', parent_id: 'INTEGER', bucket: 'INTEGER',
    position: 'INTEGER NOT NULL DEFAULT 0', deleted_at: 'TEXT',
  },
  products: {
    code: 'TEXT', collection_id: 'INTEGER', title: 'TEXT', description: 'TEXT', price: 'REAL',
    display_uplift: 'REAL NOT NULL DEFAULT 1.18', featured: 'INTEGER NOT NULL DEFAULT 0',
    deleted_at: 'TEXT', updated_at: 'TEXT',
  },
  product_images: {
    product_id: 'INTEGER', url: 'TEXT', key: 'TEXT', width: 'INTEGER', height: 'INTEGER',
    position: 'INTEGER NOT NULL DEFAULT 0',
  },
  sales: {
    name: 'TEXT', discount_percent: 'REAL', starts_at: 'TEXT', ends_at: 'TEXT',
    active: 'INTEGER NOT NULL DEFAULT 1', deleted_at: 'TEXT',
  },
};

let added = 0;
for (const [table, cols] of Object.entries(WANT)) {
  const have = new Set((await all(`PRAGMA table_info(${table})`)).map((c) => c.name));
  if (!have.size) { console.log(`${table}: table missing, run migrate-local.js first`); continue; }
  for (const [name, type] of Object.entries(cols)) {
    if (have.has(name)) continue;
    await run(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
    console.log(`${table}: added column ${name}`);
    added++;
  }
}
console.log(added ? `Done. Added ${added} column(s).` : 'Nothing was missing.');