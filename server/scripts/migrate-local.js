#!/usr/bin/env node
/**
 * Apply server/schema.sql to your D1 database from your machine.
 *   node server/scripts/migrate-local.js
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run, dbConfigured } from '../d1.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!dbConfigured()) {
  console.error('Missing CF_ACCOUNT_ID / CF_D1_DATABASE_ID / CF_API_TOKEN in the environment.');
  process.exit(1);
}

const sql = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');
const statements = sql.replace(/^\s*--.*$/gm, '').split(';').map((s) => s.trim()).filter(Boolean);
let done = 0;
for (const stmt of statements) {
  await run(stmt);
  done += 1;
  process.stdout.write(`\r  applied ${done}/${statements.length}`);
}
console.log('\nSchema is up to date.');